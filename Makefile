ACX_DATA_BACKEND ?= csv
OUTPUT_BASE ?= $(DIST_ARTIFACTS_DIR)/$(ACX_DATA_BACKEND)
LATEST_BUILD := $(DIST_ARTIFACTS_DIR)/latest-build.json
DIST_DIR ?= dist
DIST_ARTIFACTS_DIR := $(DIST_DIR)/artifacts
DIST_SITE_DIR := $(DIST_DIR)/site
SBOM_DIR := $(DIST_DIR)/sbom
SBOM_PATH := $(SBOM_DIR)/cyclonedx.json
PACKAGED_ARTIFACTS_DIR := $(DIST_DIR)/packaged-artifacts
PACKAGED_MANIFEST := $(PACKAGED_ARTIFACTS_DIR)/manifest.json
DEFAULT_GENERATED_AT ?= 1970-01-01T00:00:00+00:00
CATALOG_PATH := artifacts/catalog.json

.PHONY: install lint test audit ci_build_pages app format validate release build-backend build package sbom build-static \
        db_init db_import db_export build_csv build_db citations-scan refs-check refs-fetch refs-normalize refs-audit \
        verify_manifests catalog validate-manifests validate-diff-fixtures build-web bootstrap doctor

install:
	poetry install --with dev --no-root

doctor:
	./scripts/bootstrap.sh --check-only

bootstrap:
	./scripts/bootstrap.sh

lint:
	PYTHONPATH=. poetry run ruff check .
	PYTHONPATH=. poetry run black --check .
	PYTHONPATH=. poetry run python -m scripts.lint_docs README.md docs

test:
	PYTHONPATH=. poetry run pytest
	PYTHONPATH=. poetry run python tools/validate_assets.py

verify_manifests:
	PYTHONPATH=. poetry run pytest tests/test_manifests.py

$(LATEST_BUILD):
	@mkdir -p $(DIST_ARTIFACTS_DIR)
	$(MAKE) catalog
	ACX_GENERATED_AT=$(DEFAULT_GENERATED_AT) ACX_DATA_BACKEND=$(ACX_DATA_BACKEND) ACX_OUTPUT_ROOT=$(DIST_ARTIFACTS_DIR) PYTHONPATH=. poetry run python -m calc.derive --output-root $(OUTPUT_BASE)
	ACX_GENERATED_AT=$(DEFAULT_GENERATED_AT) ACX_DATA_BACKEND=$(ACX_DATA_BACKEND) PYTHONPATH=. poetry run python -m calc.derive intensity --fu all --output-dir $(DIST_ARTIFACTS_DIR)

build: $(LATEST_BUILD)


WEB_CALCULATOR_DATA := apps/carbon-acx-web/src/generated/calculator-data.json
WEB_CATALOG_DATA := apps/carbon-acx-web/src/generated/catalog-data.json

$(WEB_CALCULATOR_DATA) $(WEB_CATALOG_DATA): data/activities.csv data/emission_factors.csv data/grid_intensity.csv data/sources.csv scripts/generate_web_calculator_data.py
	python3 scripts/generate_web_calculator_data.py

build-web: $(WEB_CALCULATOR_DATA) $(WEB_CATALOG_DATA)
	pnpm run build:web

$(PACKAGED_MANIFEST): $(LATEST_BUILD)
	PYTHONPATH=. poetry run python -m scripts.package_artifacts --src $(DIST_ARTIFACTS_DIR) --dest $(PACKAGED_ARTIFACTS_DIR)

WEB_APP_DIR := apps/carbon-acx-web
WEB_APP_DIST := $(WEB_APP_DIR)/dist

package: $(PACKAGED_MANIFEST) build-web sbom
	rm -rf $(DIST_SITE_DIR)
	mkdir -p $(DIST_SITE_DIR)
	cp -R $(WEB_APP_DIST)/. $(DIST_SITE_DIR)/
	PYTHONPATH=. poetry run python -m scripts.prepare_pages_bundle --site $(DIST_SITE_DIR) --artifacts $(PACKAGED_ARTIFACTS_DIR)

catalog: $(CATALOG_PATH)

$(CATALOG_PATH): calc/make_catalog.py data/activities.csv data/emission_factors.csv data/profiles.csv data/activity_schedule.csv data/grid_intensity.csv
	PYTHONPATH=. poetry run python -m calc.make_catalog --output $@

ci_build_pages: install lint test package

build-static: package
	@echo "Static site available at $(DIST_SITE_DIR)"

app:
	ACX_DATA_BACKEND=$(ACX_DATA_BACKEND) PYTHONPATH=. poetry run python -m app.app

format:
	PYTHONPATH=. poetry run black .

validate: lint test

audit:
	PYTHONPATH=. poetry run python scripts/audit_layers.py
	test -s artifacts/audit_report.json
	PYTHONPATH=. poetry run python -c "from pathlib import Path; import json, sys; payload = json.loads(Path('artifacts/audit_report.json').read_text()); layers = payload.get('layers_present') or []; sys.exit(0 if layers else 'Layer audit report must list at least one layer')"

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

refs-check:
	poetry run python -m calc.refs_fetch --mode check

refs-fetch:
	poetry run python -m calc.refs_fetch --mode fetch

refs-normalize:
	poetry run python -m calc.refs_normalize

refs-audit:
	poetry run python -m calc.refs_audit

validate-manifests:
	PYTHONPATH=. poetry run python -m tools.validator.validate validate-manifest dist/artifacts/manifests/figures

validate-diff-fixtures:
	PYTHONPATH=. poetry run python -m tools.validator.validate validate-diff tools/validator/fixtures/sample_diff.json --manifests dist/artifacts/manifests
