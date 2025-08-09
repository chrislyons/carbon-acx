.PHONY: install validate build app

install:
	poetry install

validate:
	poetry run ruff .
	poetry run black --check .

build:
	poetry run python -m calc.derive
	poetry run pytest --cov

app:
	poetry run python app/app.py
