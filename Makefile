ACX_DATA_BACKEND ?= csv
OUTPUT_BASE ?= $(DIST_ARTIFACTS_DIR)/$(ACX_DATA_BACKEND)
LATEST_BUILD := $(DIST_ARTIFACTS_DIR)/latest-build.json
SITE_DIR := site
SITE_BUILD_DIR ?= $(SITE_DIR)/dist
DIST_DIR ?= dist
DIST_ARTIFACTS_DIR := $(DIST_DIR)/artifacts
DIST_SITE_DIR := $(DIST_DIR)/site
SBOM_DIR := $(DIST_DIR)/sbom
SBOM_PATH := $(SBOM_DIR)/cyclonedx.json
PACKAGED_ARTIFACTS_DIR := $(DIST_DIR)/packaged-artifacts
PACKAGED_MANIFEST := $(PACKAGED_ARTIFACTS_DIR)/manifest.json
DEFAULT_GENERATED_AT ?= 1970-01-01T00:00:00+00:00

.PHONY: install lint test ci_build_pages app format validate release build-backend build site package sbom build-static \
        db_init db_import db_export build_csv build_db citations-scan

install:
	poetry install --with dev --no-root

lint:
	PYTHONPATH=. poetry run ruff check .
	PYTHONPATH=. poetry run black --check .
	PYTHONPATH=. poetry run python -m scripts.lint_docs README.md docs

test:
	PYTHONPATH=. poetry run pytest
	PYTHONPATH=. python tools/validate_assets.py

$(LATEST_BUILD):
	@mkdir -p $(DIST_ARTIFACTS_DIR)
	ACX_GENERATED_AT=$(DEFAULT_GENERATED_AT) ACX_DATA_BACKEND=$(ACX_DATA_BACKEND) ACX_OUTPUT_ROOT=$(DIST_ARTIFACTS_DIR) PYTHONPATH=. poetry run python -m calc.derive --output-root $(OUTPUT_BASE)
	ACX_GENERATED_AT=$(DEFAULT_GENERATED_AT) ACX_DATA_BACKEND=$(ACX_DATA_BACKEND) PYTHONPATH=. poetry run python -m calc.derive intensity --fu all --output-dir $(DIST_ARTIFACTS_DIR)

build: $(LATEST_BUILD)

NPM ?= npm

SITE_LAYERS_JSON := $(SITE_DIR)/public/artifacts/layers.json
DATA_LAYERS_CSV := data/layers.csv

.PHONY: site_install site_build site_dev

site_install:
	cd $(SITE_DIR) && $(NPM) install

$(SITE_BUILD_DIR)/index.html: site_install $(SITE_LAYERS_JSON)
	cd $(SITE_DIR) && $(NPM) run build

site_build: $(SITE_BUILD_DIR)/index.html

site: site_build
	rm -rf $(DIST_SITE_DIR)
	mkdir -p $(DIST_DIR)
	cp -R $(SITE_BUILD_DIR) $(DIST_SITE_DIR)

site_dev: site_install
	cd $(SITE_DIR) && $(NPM) run dev -- --host 0.0.0.0

$(SITE_LAYERS_JSON): $(DATA_LAYERS_CSV) scripts/sync_layers_json.py
	PYTHONPATH=. poetry run python -m scripts.sync_layers_json --csv $(DATA_LAYERS_CSV) --output $(SITE_LAYERS_JSON)

$(PACKAGED_MANIFEST): $(LATEST_BUILD)
	PYTHONPATH=. poetry run python -m scripts.package_artifacts --src $(DIST_ARTIFACTS_DIR) --dest $(PACKAGED_ARTIFACTS_DIR)

package: $(PACKAGED_MANIFEST) site sbom
	PYTHONPATH=. poetry run python -m scripts.prepare_pages_bundle --site $(DIST_SITE_DIR) --artifacts $(PACKAGED_ARTIFACTS_DIR)
	@test -f $(SITE_LAYERS_JSON) || (echo "Missing site layer catalog: $(SITE_LAYERS_JSON)" >&2; exit 1)
	@test -f $(DIST_SITE_DIR)/artifacts/layers.json || (echo "Missing packaged layer catalog: $(DIST_SITE_DIR)/artifacts/layers.json" >&2; exit 1)

ci_build_pages: install lint test package

build-static: package
	@echo "Static site available at $(DIST_SITE_DIR)"

app:
	ACX_DATA_BACKEND=$(ACX_DATA_BACKEND) PYTHONPATH=. poetry run python -m app.app

format:
	PYTHONPATH=. poetry run black .

validate: lint test

release:
	@echo "release placeholder"

build-backend:
	$(MAKE) build ACX_DATA_BACKEND=$(B)

$(DIST_DIR):
	mkdir -p $(DIST_DIR)

sbom: $(DIST_DIR)
	PYTHONPATH=. poetry run python -m tools.sbom --output $(SBOM_PATH)

db_init:
	rm -f acx.db
	sqlite3 acx.db < db/schema.sql

db_import:
	PYTHONPATH=. poetry run python scripts/import_csv_to_db.py --db acx.db --data ./data

db_export:
        PYTHONPATH=. poetry run python scripts/export_db_to_csv.py --db acx.db --out ./data

build_csv:
        ACX_OUTPUT_ROOT=dist/artifacts/csv ACX_DATA_BACKEND=csv PYTHONPATH=. poetry run python -m calc.derive

build_db:
        ACX_OUTPUT_ROOT=dist/artifacts/sqlite ACX_DATA_BACKEND=sqlite PYTHONPATH=. poetry run python -m calc.derive --db acx.db

citations-scan:
	PYTHONPATH=. poetry run python tools/citations/scan_claims.py
