from __future__ import annotations

import gzip
import json
import sqlite3
from pathlib import Path

import pytest
from nacl import signing

from calc.pack.english import BuildResult, EnglishPackBuilder, build_english_pack
from calc.pack.signing import load_signing_key, sign_path


def _init_wordnet_db(path: Path) -> None:
    conn = sqlite3.connect(path)
    conn.executescript(
        """
        CREATE TABLE lexicons (
            id TEXT,
            label TEXT,
            language TEXT,
            email TEXT,
            license TEXT,
            version TEXT,
            url TEXT,
            citation TEXT,
            logo TEXT,
            metadata TEXT,
            modified BOOLEAN DEFAULT 0
        );
        CREATE TABLE ilis (
            id TEXT,
            status_rowid INTEGER,
            definition TEXT,
            metadata TEXT
        );
        CREATE TABLE synsets (
            id TEXT,
            lexicon_rowid INTEGER,
            ili_rowid INTEGER,
            pos TEXT
        );
        CREATE TABLE definitions (
            lexicon_rowid INTEGER,
            synset_rowid INTEGER,
            definition TEXT,
            language TEXT
        );
        CREATE TABLE entries (
            id TEXT,
            lexicon_rowid INTEGER,
            pos TEXT
        );
        CREATE TABLE forms (
            lexicon_rowid INTEGER,
            entry_rowid INTEGER,
            form TEXT,
            rank INTEGER
        );
        CREATE TABLE senses (
            id TEXT,
            lexicon_rowid INTEGER,
            entry_rowid INTEGER,
            synset_rowid INTEGER,
            entry_rank INTEGER
        );
        """
    )

    lexicon_rowid = conn.execute(
        "INSERT INTO lexicons (id, label, language, email, license, version) VALUES (?, ?, ?, ?, ?, ?)",
        ("omw-en31", "Test Lexicon", "en", "info@example.com", "CC0", "1.0"),
    ).lastrowid
    ili_rowid = conn.execute(
        "INSERT INTO ilis (id, status_rowid, definition, metadata) VALUES (?, ?, ?, ?)",
        ("i00000001", 0, "A shared concept", None),
    ).lastrowid
    synset_rowid = conn.execute(
        "INSERT INTO synsets (id, lexicon_rowid, ili_rowid, pos) VALUES (?, ?, ?, ?)",
        ("s00000001", lexicon_rowid, ili_rowid, "n"),
    ).lastrowid
    conn.execute(
        "INSERT INTO definitions (lexicon_rowid, synset_rowid, definition, language) VALUES (?, ?, ?, ?)",
        (lexicon_rowid, synset_rowid, "A synthetic synset", "en"),
    )
    entry_rowid = conn.execute(
        "INSERT INTO entries (id, lexicon_rowid, pos) VALUES (?, ?, ?)",
        ("entry-1", lexicon_rowid, "n"),
    ).lastrowid
    conn.execute(
        "INSERT INTO forms (lexicon_rowid, entry_rowid, form, rank) VALUES (?, ?, ?, ?)",
        (lexicon_rowid, entry_rowid, "example", 1),
    )
    conn.execute(
        "INSERT INTO senses (id, lexicon_rowid, entry_rowid, synset_rowid, entry_rank) VALUES (?, ?, ?, ?, ?)",
        ("sense-1", lexicon_rowid, entry_rowid, synset_rowid, 1),
    )
    conn.commit()
    conn.close()


def _init_wordnet_db_missing_ili(path: Path) -> None:
    conn = sqlite3.connect(path)
    conn.executescript(
        """
        CREATE TABLE lexicons (id TEXT, label TEXT, language TEXT, email TEXT, license TEXT, version TEXT);
        CREATE TABLE synsets (id TEXT, lexicon_rowid INTEGER, ili_rowid INTEGER, pos TEXT);
        CREATE TABLE definitions (lexicon_rowid INTEGER, synset_rowid INTEGER, definition TEXT, language TEXT);
        CREATE TABLE entries (id TEXT, lexicon_rowid INTEGER, pos TEXT);
        CREATE TABLE forms (lexicon_rowid INTEGER, entry_rowid INTEGER, form TEXT, rank INTEGER);
        CREATE TABLE senses (id TEXT, lexicon_rowid INTEGER, entry_rowid INTEGER, synset_rowid INTEGER, entry_rank INTEGER);
        CREATE TABLE ilis (id TEXT, status_rowid INTEGER, definition TEXT, metadata TEXT);
        """
    )
    lexicon_rowid = conn.execute(
        "INSERT INTO lexicons (id, label, language, email, license, version) VALUES (?, ?, ?, ?, ?, ?)",
        ("omw-en31", "Test", "en", "info@example.com", "CC0", "1.0"),
    ).lastrowid
    synset_rowid = conn.execute(
        "INSERT INTO synsets (id, lexicon_rowid, ili_rowid, pos) VALUES (?, ?, ?, ?)",
        ("s00000002", lexicon_rowid, None, "v"),
    ).lastrowid
    conn.execute(
        "INSERT INTO definitions (lexicon_rowid, synset_rowid, definition, language) VALUES (?, ?, ?, ?)",
        (lexicon_rowid, synset_rowid, "No ILI assigned", "en"),
    )
    entry_rowid = conn.execute(
        "INSERT INTO entries (id, lexicon_rowid, pos) VALUES (?, ?, ?)",
        ("entry-2", lexicon_rowid, "v"),
    ).lastrowid
    conn.execute(
        "INSERT INTO forms (lexicon_rowid, entry_rowid, form, rank) VALUES (?, ?, ?, ?)",
        (lexicon_rowid, entry_rowid, "missing", 1),
    )
    conn.execute(
        "INSERT INTO senses (id, lexicon_rowid, entry_rowid, synset_rowid, entry_rank) VALUES (?, ?, ?, ?, ?)",
        ("sense-2", lexicon_rowid, entry_rowid, synset_rowid, 1),
    )
    conn.commit()
    conn.close()


def test_build_english_pack_creates_sqlite(tmp_path: Path) -> None:
    source_db = tmp_path / "wn.db"
    _init_wordnet_db(source_db)
    output = tmp_path / "english.sqlite"

    manifest = build_english_pack(source_db, output)

    assert output.exists()
    assert manifest["language"] == "en"
    assert manifest["synsets"] == 1
    with sqlite3.connect(output) as conn:
        row = conn.execute("SELECT synset_id, ili_id, definition FROM synsets").fetchone()
        assert row == ("s00000001", "i00000001", "A synthetic synset")
        lemma_row = conn.execute("SELECT lemma FROM lemmas WHERE synset_id = ?", ("s00000001",)).fetchone()
        assert lemma_row[0] == "example"


def test_builder_writes_manifest_and_hash(tmp_path: Path) -> None:
    data_dir = tmp_path / "data"
    data_dir.mkdir()
    source_db = data_dir / "wn.db"
    _init_wordnet_db(source_db)
    (data_dir / "downloads").mkdir()
    compressed = data_dir / "downloads" / "lexicon.xml.gz"
    with gzip.open(compressed, "wb") as handle:
        handle.write(b"<lexicon/>")

    output = tmp_path / "packs" / "english.sqlite"
    manifest_path = tmp_path / "packs" / "english.json"

    builder = EnglishPackBuilder(
        data_dir=data_dir,
        output_path=output,
        manifest_path=manifest_path,
        downloads=("omw-en31:1.4",),
        lexicon_ids=("omw-en31",),
    )

    result = builder.build()
    assert isinstance(result, BuildResult)
    assert result.pack_path.exists()
    assert result.manifest_path.exists()
    payload = json.loads(result.manifest_path.read_text(encoding="utf-8"))
    assert payload["hash_sha256"]
    assert payload["source_resources"][0]["size_bytes"] == len(b"<lexicon/>")
    assert "signature" not in payload


def test_signing_helpers_round_trip(tmp_path: Path) -> None:
    key = signing.SigningKey.generate()
    key_hex = key.encode().hex()
    key_path = tmp_path / "signing.key"
    key_path.write_text(key_hex, encoding="utf-8")

    payload_path = tmp_path / "pack.sqlite"
    payload_path.write_bytes(b"payload")

    loaded = load_signing_key(key_path)
    signature = sign_path(payload_path, loaded)
    assert signature.as_dict()["algorithm"] == "ed25519"
    assert signature.public_key
    assert signature.signature


def test_build_english_pack_requires_ili(tmp_path: Path) -> None:
    source_db = tmp_path / "wn.db"
    _init_wordnet_db_missing_ili(source_db)
    output = tmp_path / "english.sqlite"

    with pytest.raises(ValueError):
        build_english_pack(source_db, output)
