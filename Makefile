.PHONY: help build deploy start stop restart logs clean test backup restore pxe-start

help:
	@echo "LumaDesk Management Commands"
	@echo ""
	@echo "Setup & Deployment:"
	@echo "  make build        - Build all Docker containers"
	@echo "  make deploy       - Deploy LumaDesk (build + start)"
	@echo "  make start        - Start all services"
	@echo "  make stop         - Stop all services"
	@echo "  make restart      - Restart all services"
	@echo ""
	@echo "PXE Boot:"
	@echo "  make pxe-start    - Start PXE server"
	@echo "  make pxe-image    - Generate PXE boot image"
	@echo "  make pxe-test     - Test PXE boot with QEMU"
	@echo ""
	@echo "Maintenance:"
	@echo "  make logs         - View logs (all services)"
	@echo "  make backup       - Backup data and configuration"
	@echo "  make restore      - Restore from backup"
	@echo "  make clean        - Remove containers and volumes"
	@echo ""
	@echo "Development:"
	@echo "  make test         - Run tests"
	@echo "  make lint         - Lint code"

build:
	@./scripts/build-all

deploy:
	@./scripts/deploy

start:
	@docker-compose up -d
	@echo "Services started. Access web UI at http://localhost:8080"

stop:
	@docker-compose down

restart:
	@docker-compose restart

logs:
	@docker-compose logs -f

clean:
	@echo "WARNING: This will remove all containers, volumes, and data!"
	@read -p "Continue? (yes/no): " CONFIRM && [ "$$CONFIRM" = "yes" ] || exit 1
	@docker-compose down -v
	@docker rmi lumadesk/api lumadesk/web lumadesk/sunshine lumadesk/pxe lumadesk/client 2>/dev/null || true
	@echo "Cleanup completed"

pxe-start:
	@./scripts/pxe-start

pxe-image:
	@./scripts/generate-pxe-image

pxe-test:
	@./scripts/test-pxe-boot

backup:
	@./scripts/backup

restore:
	@./scripts/restore

test:
	@echo "Running API tests..."
	@cd api && npm test
	@echo "Tests completed"

lint:
	@echo "Linting API..."
	@cd api && npm run lint
	@echo "Linting Web UI..."
	@cd web && npm run lint
	@echo "Linting completed"
