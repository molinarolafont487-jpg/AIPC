.PHONY: setup dev dev-web dev-api infra-up infra-down check

setup:
	cp -n .env.example .env || true
	pnpm install
	python3 -m venv .venv
	.venv/bin/python -m pip install -U pip
	.venv/bin/python -m pip install -e apps/api

dev:
	pnpm dev

dev-web:
	pnpm dev:web

dev-api:
	.venv/bin/uvicorn app.main:app --reload --host 0.0.0.0 --port 8000 --app-dir apps/api

infra-up:
	docker compose up -d postgres redis minio

infra-down:
	docker compose down

check:
	pnpm typecheck
	python -m compileall apps/api apps/worker
