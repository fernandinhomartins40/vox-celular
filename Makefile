.PHONY: up down build seed logs restart dev-api dev-web migrate

# Local use only. Production deployment must go through GitHub Actions.
up:
	docker compose up -d --no-build

down:
	docker compose down

build:
	docker build -f apps/api/Dockerfile --target runner -t vox-api:local .
	docker build -f apps/api/Dockerfile --target migrate -t vox-migration:local .
	docker build -f apps/web/Dockerfile -t vox-web:local .

seed:
	npm run db:seed --workspace=@vox/api

logs:
	docker compose logs -f

restart:
	docker compose restart

dev-api:
	npm run dev --workspace=@vox/api

dev-web:
	npm run dev --workspace=@vox/web

migrate:
	docker compose --profile tools run --rm migrate
