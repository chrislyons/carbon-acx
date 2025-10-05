"""English WordNet pack builder."""

from __future__ import annotations

import gzip
import json
import lzma
import sqlite3
from dataclasses import dataclass
from datetime import datetime, timezone
from pathlib import Path
from typing import Mapping, Sequence

import wn
from nacl.signing import SigningKey

from ..utils.hashio import sha256_bytes, sha256_file
from .signing import SigningResult, sign_path

DEFAULT_DOWNLOADS: tuple[str, ...] = ("omw-en31:1.4", "omw-en:1.4")
DEFAULT_LEXICONS: tuple[str, ...] = ("omw-en31",)


@dataclass(frozen=True)
class BuildResult:
    """Aggregate metadata describing a generated pack."""

    pack_path: Path
    manifest_path: Path
    metadata: Mapping[str, object]
    signature: SigningResult | None


class EnglishPackBuilder:
    """Drive the end-to-end build for the English lexical pack."""

    def __init__(
        self,
        *,
        data_dir: Path,
        output_path: Path,
        manifest_path: Path | None = None,
        downloads: Sequence[str] | None = None,
        lexicon_ids: Sequence[str] | None = None,
    ) -> None:
        self.data_dir = Path(data_dir)
        self.output_path = Path(output_path)
        self.manifest_path = Path(manifest_path) if manifest_path else self.output_path.with_suffix(".json")
        self.downloads = tuple(downloads) if downloads else DEFAULT_DOWNLOADS
        self.lexicon_ids = tuple(lexicon_ids) if lexicon_ids else DEFAULT_LEXICONS

    def download_sources(self) -> list[str]:
        """Fetch upstream resources required to build the English pack."""

        self.data_dir.mkdir(parents=True, exist_ok=True)
        wn.config.data_directory = self.data_dir

        fetched: list[str] = []
        for project in self.downloads:
            wn.download(project)
            fetched.append(project)
        return fetched

    def build(self, *, signing_key: SigningKey | None = None) -> BuildResult:
        """Materialise the SQLite pack and accompanying manifest."""

        wn.config.data_directory = self.data_dir
        db_path = self._resolve_database()
        signature: SigningResult | None = None

        metadata = build_english_pack(
            db_path,
            self.output_path,
            lexicon_ids=self.lexicon_ids,
        )

        if signing_key is not None:
            signature = sign_path(self.output_path, signing_key)
            metadata["signature"] = signature.as_dict()

        metadata["hash_sha256"] = sha256_file(self.output_path)
        metadata["source_resources"] = self._source_resource_metadata()
        metadata["generated_at"] = datetime.now(timezone.utc).isoformat()

        self._write_manifest(metadata)
        return BuildResult(
            pack_path=self.output_path,
            manifest_path=self.manifest_path,
            metadata=metadata,
            signature=signature,
        )

    def _resolve_database(self) -> Path:
        db_path = self.data_dir / "wn.db"
        if not db_path.exists():
            raise FileNotFoundError(
                f"WordNet database not found at {db_path}. Run download_sources() first or provide a populated data directory."
            )
        return db_path

    def _source_resource_metadata(self) -> list[dict[str, object]]:
        downloads_dir = self.data_dir / "downloads"
        if not downloads_dir.exists():
            return []
        resources: list[dict[str, object]] = []
        for path in sorted(downloads_dir.glob("**/*")):
            if not path.is_file():
                continue
            payload = _read_resource_bytes(path)
            resources.append(
                {
                    "path": str(path.relative_to(self.data_dir)),
                    "size_bytes": len(payload),
                    "sha256": sha256_bytes(payload),
                }
            )
        return resources

    def _write_manifest(self, payload: Mapping[str, object]) -> None:
        self.manifest_path.parent.mkdir(parents=True, exist_ok=True)
        self.manifest_path.write_text(json.dumps(payload, indent=2), encoding="utf-8")


def _placeholder_list(length: int) -> str:
    return ",".join("?" for _ in range(length))


def _read_resource_bytes(path: Path) -> bytes:
    data = Path(path).read_bytes()
    if data.startswith(b"\x1f\x8b"):
        return gzip.decompress(data)
    if data.startswith(b"\xfd7zXZ"):
        return lzma.decompress(data)
    return data


def _collect_lexicon_rows(conn: sqlite3.Connection, lexicon_ids: Sequence[str]) -> list[sqlite3.Row]:
    placeholders = _placeholder_list(len(lexicon_ids))
    rows = conn.execute(
        f"SELECT rowid, id, version, label FROM lexicons WHERE id IN ({placeholders})",
        lexicon_ids,
    ).fetchall()
    if len(rows) != len(lexicon_ids):
        available = {row["id"] for row in rows}
        missing = [lex for lex in lexicon_ids if lex not in available]
        raise ValueError(f"Missing lexicons in source database: {', '.join(missing)}")
    return rows


def _collect_synsets(
    conn: sqlite3.Connection, lexicon_rowids: Sequence[int]
) -> tuple[list[dict[str, object]], Mapping[int, str]]:
    placeholders = _placeholder_list(len(lexicon_rowids))
    ili_map = {row["rowid"]: row["id"] for row in conn.execute("SELECT rowid, id FROM ilis")}
    definitions: dict[int, str] = {}
    for row in conn.execute(
        f"""
        SELECT synset_rowid, definition
        FROM definitions
        WHERE lexicon_rowid IN ({placeholders})
          AND (language IS NULL OR language = 'en')
        ORDER BY synset_rowid, rowid
        """,
        lexicon_rowids,
    ):
        if row["synset_rowid"] not in definitions and row["definition"]:
            definitions[row["synset_rowid"]] = row["definition"]

    synsets: list[dict[str, object]] = []
    synset_index: dict[int, str] = {}
    missing_ili: list[str] = []
    for row in conn.execute(
        f"""
        SELECT rowid, id, pos, ili_rowid
        FROM synsets
        WHERE lexicon_rowid IN ({placeholders})
        ORDER BY id
        """,
        lexicon_rowids,
    ):
        synset_rowid = row["rowid"]
        synset_id = row["id"]
        ili_id = ili_map.get(row["ili_rowid"])
        if not ili_id:
            missing_ili.append(synset_id)
            continue
        synset_index[synset_rowid] = synset_id
        synsets.append(
            {
                "synset_id": synset_id,
                "ili_id": ili_id,
                "part_of_speech": row["pos"],
                "definition": definitions.get(synset_rowid),
            }
        )

    if missing_ili:
        preview = ", ".join(missing_ili[:5])
        raise ValueError(
            f"Synsets missing ILI coverage detected (showing up to 5): {preview}"
        )

    return synsets, synset_index


def _collect_form_map(conn: sqlite3.Connection, lexicon_rowids: Sequence[int]) -> Mapping[int, str]:
    placeholders = _placeholder_list(len(lexicon_rowids))
    form_map: dict[int, str] = {}
    for row in conn.execute(
        f"""
        SELECT forms.entry_rowid AS entry_rowid, forms.form AS form
        FROM forms
        JOIN (
            SELECT entry_rowid, MIN(rank) AS min_rank
            FROM forms
            WHERE lexicon_rowid IN ({placeholders})
            GROUP BY entry_rowid
        ) AS ranked
        ON ranked.entry_rowid = forms.entry_rowid AND ranked.min_rank = forms.rank
        WHERE forms.lexicon_rowid IN ({placeholders})
        """,
        lexicon_rowids * 2,
    ):
        form_map[row["entry_rowid"]] = row["form"]
    return form_map


def _collect_lemmas(
    conn: sqlite3.Connection,
    lexicon_rowids: Sequence[int],
    synset_index: Mapping[int, str],
    form_map: Mapping[int, str],
) -> list[dict[str, object]]:
    placeholders = _placeholder_list(len(lexicon_rowids))
    lemmas: list[dict[str, object]] = []
    seen: set[tuple[str, str]] = set()
    for row in conn.execute(
        f"""
        SELECT senses.synset_rowid AS synset_rowid,
               senses.id AS sense_id,
               senses.entry_rowid AS entry_rowid,
               entries.pos AS pos
        FROM senses
        JOIN entries ON entries.rowid = senses.entry_rowid
        WHERE senses.lexicon_rowid IN ({placeholders})
        ORDER BY senses.synset_rowid, senses.entry_rank, senses.rowid
        """,
        lexicon_rowids,
    ):
        synset_id = synset_index.get(row["synset_rowid"])
        form = form_map.get(row["entry_rowid"])
        if not synset_id or not form:
            continue
        marker = (synset_id, form)
        if marker in seen:
            continue
        seen.add(marker)
        lemmas.append(
            {
                "synset_id": synset_id,
                "lemma": form,
                "part_of_speech": row["pos"],
                "sense_id": row["sense_id"],
            }
        )
    return lemmas


def build_english_pack(
    source_db: Path,
    output_path: Path,
    *,
    lexicon_ids: Sequence[str] = DEFAULT_LEXICONS,
) -> dict[str, object]:
    """Build an English WordNet pack from the supplied ``source_db``."""

    conn = sqlite3.connect(source_db)
    conn.row_factory = sqlite3.Row
    try:
        lexicon_rows = _collect_lexicon_rows(conn, lexicon_ids)
        lexicon_rowids = [row["rowid"] for row in lexicon_rows]
        synsets, synset_index = _collect_synsets(conn, lexicon_rowids)
        form_map = _collect_form_map(conn, lexicon_rowids)
        lemmas = _collect_lemmas(conn, lexicon_rowids, synset_index, form_map)
    finally:
        conn.close()

    output_path = Path(output_path)
    output_path.parent.mkdir(parents=True, exist_ok=True)

    with sqlite3.connect(output_path) as dest:
        dest.execute("PRAGMA foreign_keys = ON")
        dest.executescript(
            """
            CREATE TABLE metadata (
                key TEXT PRIMARY KEY,
                value TEXT NOT NULL
            );
            CREATE TABLE synsets (
                synset_id TEXT PRIMARY KEY,
                ili_id TEXT NOT NULL,
                part_of_speech TEXT NOT NULL,
                definition TEXT
            );
            CREATE TABLE lemmas (
                sense_id TEXT PRIMARY KEY,
                synset_id TEXT NOT NULL REFERENCES synsets(synset_id),
                lemma TEXT NOT NULL,
                part_of_speech TEXT
            );
            CREATE INDEX idx_lemmas_synset ON lemmas(synset_id);
            """
        )
        dest.executemany(
            "INSERT INTO synsets (synset_id, ili_id, part_of_speech, definition) VALUES (?, ?, ?, ?)",
            (
                (
                    record["synset_id"],
                    record["ili_id"],
                    record["part_of_speech"],
                    record.get("definition"),
                )
                for record in synsets
            ),
        )
        dest.executemany(
            "INSERT INTO lemmas (sense_id, synset_id, lemma, part_of_speech) VALUES (?, ?, ?, ?)",
            (
                (
                    record["sense_id"],
                    record["synset_id"],
                    record["lemma"],
                    record["part_of_speech"],
                )
                for record in lemmas
            ),
        )
        dest.executemany(
            "INSERT INTO metadata (key, value) VALUES (?, ?)",
            (
                ("language", "en"),
                ("synset_count", str(len(synsets))),
                ("lemma_count", str(len(lemmas))),
                (
                    "lexicons",
                    json.dumps(
                        [
                            {"id": row["id"], "version": row["version"], "label": row["label"]}
                            for row in lexicon_rows
                        ]
                    ),
                ),
            ),
        )

    return {
        "language": "en",
        "synsets": len(synsets),
        "lemmas": len(lemmas),
        "lexicons": [
            {"id": row["id"], "version": row["version"], "label": row["label"]}
            for row in lexicon_rows
        ],
    }
