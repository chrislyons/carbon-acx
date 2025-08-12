.PHONY: install validate build app format lint test release migrate_v1_1

install:
	poetry install --with dev

validate: lint test

build:
	PYTHONPATH=. poetry run python -m calc.derive

app:
	PYTHONPATH=. poetry run python -m app.app

format:
	PYTHONPATH=. poetry run black .

lint:
	PYTHONPATH=. poetry run ruff check .
	PYTHONPATH=. poetry run black --check .

test:
	PYTHONPATH=. poetry run pytest

release:
	@echo "release placeholder"


migrate_v1_1:
	python3 scripts/migrate_to_v1_1.py
