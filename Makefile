BACKEND ?= csv
ACX_DATA_BACKEND ?= $(BACKEND)
OUTPUT_DIR ?= build/$(BACKEND)
OUTPUT_PATH := $(OUTPUT_DIR)/calc/outputs
OUTPUT_MANIFEST := $(OUTPUT_PATH)/manifest.json
DEFAULT_GENERATED_AT ?= 1970-01-01T00:00:00+00:00

.PHONY: install lint test ci_build_pages app format validate release migrate_v1_1 build-backend

install:
	poetry install --with dev --no-root

lint:
	PYTHONPATH=. poetry run ruff check .
	PYTHONPATH=. poetry run black --check .

test:
	PYTHONPATH=. poetry run pytest

$(OUTPUT_MANIFEST):
        @mkdir -p $(OUTPUT_DIR)
        ACX_GENERATED_AT=$(DEFAULT_GENERATED_AT) ACX_DATA_BACKEND=$(ACX_DATA_BACKEND) PYTHONPATH=. poetry run python -m calc.derive --output-root $(OUTPUT_DIR)

build: $(OUTPUT_MANIFEST)

dist/artifacts/manifest.json: $(OUTPUT_MANIFEST)
	PYTHONPATH=. poetry run python -m scripts.package_artifacts --src $(OUTPUT_PATH) --dest dist/artifacts

package: dist/artifacts/manifest.json

dist/site/index.html: dist/artifacts/manifest.json
	PYTHONPATH=. poetry run python -m scripts.build_site --artifacts dist/artifacts --output dist/site

site: dist/site/index.html

ci_build_pages: install lint test dist/site/index.html

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
	$(MAKE) build BACKEND=$(B)
