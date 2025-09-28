ACX_DATA_BACKEND ?= csv
OUTPUT_BASE ?= $(DIST_ARTIFACTS_DIR)/$(ACX_DATA_BACKEND)
LATEST_BUILD := $(DIST_ARTIFACTS_DIR)/latest-build.json
SITE_BUILD_DIR ?= build/site
DIST_DIR ?= dist
DIST_ARTIFACTS_DIR := $(DIST_DIR)/artifacts
DIST_SITE_DIR := $(DIST_DIR)/site
SBOM_DIR := $(DIST_DIR)/sbom
SBOM_PATH := $(SBOM_DIR)/cyclonedx.json
PACKAGED_ARTIFACTS_DIR := $(DIST_DIR)/packaged-artifacts
PACKAGED_MANIFEST := $(PACKAGED_ARTIFACTS_DIR)/manifest.json
DEFAULT_GENERATED_AT ?= 1970-01-01T00:00:00+00:00

.PHONY: install lint test ci_build_pages app format validate release build-backend build site package sbom

install:
	poetry install --with dev --no-root

lint:
	PYTHONPATH=. poetry run ruff check .
	PYTHONPATH=. poetry run black --check .

test:
	PYTHONPATH=. poetry run pytest

$(LATEST_BUILD):
	@mkdir -p $(DIST_ARTIFACTS_DIR)
	ACX_GENERATED_AT=$(DEFAULT_GENERATED_AT) ACX_DATA_BACKEND=$(ACX_DATA_BACKEND) ACX_OUTPUT_ROOT=$(DIST_ARTIFACTS_DIR) PYTHONPATH=. poetry run python -m calc.derive --output-root $(OUTPUT_BASE)

build: $(LATEST_BUILD)

$(SITE_BUILD_DIR)/index.html: $(LATEST_BUILD)
	PYTHONPATH=. poetry run python -m scripts.build_site --artifacts $(DIST_ARTIFACTS_DIR) --output $(SITE_BUILD_DIR)

site: $(SITE_BUILD_DIR)/index.html

$(PACKAGED_MANIFEST): $(LATEST_BUILD)
	PYTHONPATH=. poetry run python -m scripts.package_artifacts --src $(DIST_ARTIFACTS_DIR) --dest $(PACKAGED_ARTIFACTS_DIR)

$(DIST_SITE_DIR)/index.html: $(LATEST_BUILD)
	rm -rf $(DIST_SITE_DIR)
	PYTHONPATH=. poetry run python -m scripts.build_site --artifacts $(DIST_ARTIFACTS_DIR) --output $(DIST_SITE_DIR)

package: $(PACKAGED_MANIFEST) $(DIST_SITE_DIR)/index.html sbom

ci_build_pages: install lint test package

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
