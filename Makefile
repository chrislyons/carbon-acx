ACX_DATA_BACKEND ?= csv
OUTPUT_DIR ?= $(DIST_ARTIFACTS_DIR)/$(ACX_DATA_BACKEND)
OUTPUT_PATH := $(OUTPUT_DIR)/calc/outputs
OUTPUT_MANIFEST := $(OUTPUT_PATH)/manifest.json
SITE_BUILD_DIR ?= build/site
DIST_DIR ?= dist
DIST_ARTIFACTS_DIR := $(DIST_DIR)/artifacts
DIST_SITE_DIR := $(DIST_DIR)/site
SBOM_PATH := $(DIST_DIR)/sbom.cdx.json
DEFAULT_GENERATED_AT ?= 1970-01-01T00:00:00+00:00

.PHONY: install lint test ci_build_pages app format validate release migrate_v1_1 build-backend build site package sbom

install:
	poetry install --with dev --no-root

lint:
	PYTHONPATH=. poetry run ruff check .
	PYTHONPATH=. poetry run black --check .

test:
	PYTHONPATH=. poetry run pytest

$(OUTPUT_MANIFEST):
	@mkdir -p $(OUTPUT_DIR)
	ACX_GENERATED_AT=$(DEFAULT_GENERATED_AT) ACX_DATA_BACKEND=$(ACX_DATA_BACKEND) ACX_OUTPUT_ROOT=$(DIST_ARTIFACTS_DIR) PYTHONPATH=. poetry run python -m calc.derive --output-root $(OUTPUT_DIR)

build: $(OUTPUT_MANIFEST)

$(SITE_BUILD_DIR)/index.html: $(OUTPUT_MANIFEST)
	PYTHONPATH=. poetry run python -m scripts.build_site --artifacts $(OUTPUT_PATH) --output $(SITE_BUILD_DIR)

site: $(SITE_BUILD_DIR)/index.html

$(DIST_ARTIFACTS_DIR)/manifest.json: $(OUTPUT_MANIFEST)
	PYTHONPATH=. poetry run python -m scripts.package_artifacts --src $(OUTPUT_PATH) --dest $(DIST_ARTIFACTS_DIR)

$(DIST_SITE_DIR)/index.html: $(DIST_ARTIFACTS_DIR)/manifest.json
	rm -rf $(DIST_SITE_DIR)
	PYTHONPATH=. poetry run python -m scripts.build_site --artifacts $(DIST_ARTIFACTS_DIR) --output $(DIST_SITE_DIR)

package: $(DIST_ARTIFACTS_DIR)/manifest.json $(DIST_SITE_DIR)/index.html sbom

ci_build_pages: install lint test package

app:
	ACX_DATA_BACKEND=$(ACX_DATA_BACKEND) PYTHONPATH=. poetry run python -m app.app

format:
	PYTHONPATH=. poetry run black .

validate: lint test

release:
	@echo "release placeholder"

migrate_v1_1:
	python3 scripts/migrate_to_v1_1.py

build-backend:
	$(MAKE) build ACX_DATA_BACKEND=$(B)

$(DIST_DIR):
	mkdir -p $(DIST_DIR)

sbom: $(DIST_DIR)
	PYTHONPATH=. poetry run python -m tools.sbom --output $(SBOM_PATH)
