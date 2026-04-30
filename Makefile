.PHONY: up down build seed logs restart dev-api dev-web migrate

up:
	docker compose up -d

down:
	docker compose down

build:
	docker compose build --no-cache

seed:
	docker compose exec api node -e "import('./dist/seed.js').then(m => m.default ? m.default() : m.main())"

logs:
	docker compose logs -f

restart:
	docker compose restart

# Run locally without Docker (dev mode)
dev-api:
	cd apps/api && npm run dev

dev-web:
	cd apps/web && npm run dev

migrate:
	cd apps/api && npx prisma migrate dev
