.PHONY: help install dev build test clean db-up db-down db-reset

help: ## Muestra esta ayuda
	@echo "Comandos disponibles:"
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | awk 'BEGIN {FS = ":.*?## "}; {printf "  \033[36m%-15s\033[0m %s\n", $$1, $$2}'

install: ## Instala dependencias de todos los workspaces
	yarn install

dev: ## Inicia desarrollo (backend + frontend)
	docker-compose up -d
	@echo "Esperando a que PostgreSQL esté listo..."
	@sleep 3
	cd api && yarn dev &
	cd app && yarn dev

dev-api: ## Inicia solo el backend
	docker-compose up -d
	cd api && yarn dev

dev-app: ## Inicia solo el frontend
	cd app && yarn dev

dev-api: ## Inicia solo el backend
	docker-compose up -d
	cd api && npm run dev

dev-app: ## Inicia solo el frontend
	cd app && npm run dev

build: ## Construye el proyecto para producción
	cd api && npm run build
	cd app && npm run build

test: ## Ejecuta tests
	npm run test

db-up: ## Levanta la base de datos PostgreSQL
	docker-compose up -d postgres

db-down: ## Detiene la base de datos PostgreSQL
	docker-compose down

db-reset: ## Resetea la base de datos (⚠️ CUIDADO: borra todos los datos)
	cd api && npx prisma migrate reset --force

db-migrate: ## Ejecuta migraciones de Prisma
	cd api && yarn prisma:migrate

db-studio: ## Abre Prisma Studio
	cd api && yarn prisma:studio

clean: ## Limpia archivos generados
	rm -rf api/dist api/node_modules app/dist app/node_modules node_modules
