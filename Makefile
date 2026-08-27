ACX_DATA_BACKEND ?= csv
DIST_DIR ?= dist
DIST_ARTIFACTS_DIR := $(DIST_DIR)/artifacts
DIST_SITE_DIR := $(DIST_DIR)/site
SBOM_DIR := $(DIST_DIR)/sbom
SBOM_PATH := $(SBOM_DIR)/cyclonedx.json
PACKAGED_ARTIFACTS_DIR := $(DIST_DIR)/packaged-artifacts
PACKAGED_MANIFEST := $(PACKAGED_ARTIFACTS_DIR)/manifest.json
CATALOG_PATH := artifacts/catalog.json
AUDIT_AS_OF ?= $(if $(ACX_AUDIT_DATE),$(ACX_AUDIT_DATE),$(shell date -u +%F))
DEFAULT_GENERATED_AT = 1970-01-01T00:00:00+00:00
.PHONY: install lint test audit ci_build_pages app format validate release build-backend build package sbom build-static \
        db_init db_import db_export build_csv build_db citations-scan refs-check refs-fetch refs-normalize refs-audit \
        data-audit publication-audit verify_manifests catalog validate-manifests validate-diff-fixtures build-web bootstrap doctor owid-context-update

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

build: data-audit
	@set -eu; \
	staging="$$(mktemp -d "$(DIST_DIR)/.artifacts-staging.XXXXXX")"; \
	backup="$$(mktemp -d "$(DIST_DIR)/.artifacts-backup.XXXXXX")"; \
	rmdir "$$backup"; \
	cleanup() { rm -rf "$$staging" "$$backup"; }; \
	trap cleanup EXIT; \
	$(MAKE) catalog; \
	ACX_ARTIFACT_ROOT="$$staging" ACX_POINTER_ARTIFACT_DIR=. ACX_ALLOW_OUTPUT_RM=1 \
	ACX_GENERATED_AT="$${ACX_GENERATED_AT:-$(DEFAULT_GENERATED_AT)}" ACX_DATA_BACKEND=$(ACX_DATA_BACKEND) \
	ACX_OUTPUT_ROOT="$$staging" PYTHONPATH=. poetry run python -m calc.derive \
	--output-root "$$staging"; \
	ACX_ARTIFACT_ROOT="$$staging" ACX_ALLOW_OUTPUT_RM=1 ACX_DATA_BACKEND=$(ACX_DATA_BACKEND) \
	PYTHONPATH=. poetry run python -m calc.derive intensity --fu all --output-dir "$$staging"; \
	PYTHONPATH=. poetry run python -m tools.validator.validate validate-manifest \
	"$$staging/manifests"; \
	if [ -e "$(DIST_ARTIFACTS_DIR)" ]; then mv "$(DIST_ARTIFACTS_DIR)" "$$backup"; fi; \
	if ! mv "$$staging" "$(DIST_ARTIFACTS_DIR)"; then \
		if [ -e "$$backup" ]; then mv "$$backup" "$(DIST_ARTIFACTS_DIR)"; fi; \
		exit 1; \
	fi; \
	rm -rf "$$backup"; \
	trap - EXIT


WEB_CALCULATOR_DATA := apps/carbon-acx-web/src/generated/calculator-data.json
WEB_CATALOG_DATA := apps/carbon-acx-web/src/generated/catalog-data.json
WEB_SOURCES_DATA := apps/carbon-acx-web/src/generated/sources.json
WEB_STREAM_CATALOG_DATA := apps/carbon-acx-web/src/generated/stream-catalog.json
WEB_OWID_CONTEXT_DATA := apps/carbon-acx-web/src/generated/owid-context.json
WEB_RELEASE_DATA := apps/carbon-acx-web/src/generated/release-data.json
WEB_DATA_OUTPUTS := $(WEB_CALCULATOR_DATA) $(WEB_CATALOG_DATA) $(WEB_SOURCES_DATA) $(WEB_STREAM_CATALOG_DATA) $(WEB_OWID_CONTEXT_DATA) $(WEB_RELEASE_DATA)
OWID_SNAPSHOT_INPUTS := $(wildcard data/owid/manifest.json data/owid/annual-co2-emissions-per-country.csv data/owid/annual-co2-emissions-per-country.metadata.json)
DATAFLOW_INPUTS := $(wildcard data/*.csv) $(wildcard refs/sources_manifest.csv)

$(WEB_DATA_OUTPUTS): $(DATAFLOW_INPUTS) $(OWID_SNAPSHOT_INPUTS) scripts/generate_web_calculator_data.py scripts/fetch_owid_context.py tools/citations/scan_claims.py
	python3 scripts/generate_web_calculator_data.py --repo-root "$$PWD" --output-root "$$PWD"

owid-context-update:
	python3 scripts/fetch_owid_context.py --output-dir data/owid

build-web: data-audit $(WEB_DATA_OUTPUTS) publication-audit
	pnpm run build:web

$(PACKAGED_MANIFEST): build
	PYTHONPATH=. poetry run python -m scripts.package_artifacts --src $(DIST_ARTIFACTS_DIR) --dest $(PACKAGED_ARTIFACTS_DIR)

WEB_APP_DIR := apps/carbon-acx-web
WEB_APP_DIST := $(WEB_APP_DIR)/dist

package: data-audit $(PACKAGED_MANIFEST) build-web sbom
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

data-audit:
	PYTHONPATH=. poetry run python tools/citations/scan_claims.py --as-of $(AUDIT_AS_OF)
	PYTHONPATH=. poetry run python -m calc.refs_audit --metadata-only --as-of $(AUDIT_AS_OF)

publication-audit: $(WEB_DATA_OUTPUTS)
	PYTHONPATH=. poetry run python scripts/audit_publication.py --as-of $(AUDIT_AS_OF)

validate: lint test data-audit

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
	poetry run python -m calc.refs_audit --as-of $(AUDIT_AS_OF)

validate-manifests:
	PYTHONPATH=. poetry run python -m tools.validator.validate validate-manifest dist/artifacts/manifests

validate-diff-fixtures:
	PYTHONPATH=. poetry run python -m tools.validator.validate validate-diff tools/validator/fixtures/sample_diff.json --manifests tools/validator/fixtures/manifests
