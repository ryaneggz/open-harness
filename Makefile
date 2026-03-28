DOCKER  ?= false
TAG     ?= latest
REGISTRY = ghcr.io/ruska-ai

HEARTBEAT_INTERVAL     ?= 300
HEARTBEAT_ACTIVE_START ?=
HEARTBEAT_ACTIVE_END   ?=
HEARTBEAT_AGENT        ?= claude

# NAME is required — fail fast with a helpful message
ifndef NAME
  $(error NAME is required. Usage: make NAME=my-sandbox <target>)
endif

IMAGE = $(REGISTRY)/$(NAME):$(TAG)
export NAME

# Compose file selection: always use base, add docker override if DOCKER=true
COMPOSE_FILES = -f docker-compose.yml
ifeq ($(DOCKER),true)
  COMPOSE_FILES += -f docker-compose.docker.yml
endif
COMPOSE = NAME=$(NAME) docker compose $(COMPOSE_FILES) -p $(NAME)

.PHONY: build rebuild run shell stop push all clean list heartbeat heartbeat-stop heartbeat-status quickstart

quickstart:
	docker build -t $(IMAGE) .
	$(COMPOSE) up -d
	docker exec --user root $(NAME) bash -c '/home/sandbox/install/setup.sh --non-interactive'
	@echo ""
	@echo "  ✅ Sandbox '$(NAME)' is ready!"
	@echo ""
	@echo "  Run:  make NAME=$(NAME) shell"
	@echo "  Then: claude"
	@echo ""

build:
	docker build -t $(IMAGE) .

rebuild:
	@$(COMPOSE) down --rmi local 2>/dev/null || true
	docker build --no-cache -t $(IMAGE) .
	$(COMPOSE) up -d

run:
	$(COMPOSE) up -d

shell:
	@docker exec -it $(NAME) bash 2>/dev/null \
		|| (echo "Error: container '$(NAME)' is not running. Start it with: make NAME=$(NAME) run" >&2; exit 1)

stop:
	@$(COMPOSE) down 2>/dev/null \
		|| (echo "Error: no sandbox '$(NAME)' found to stop." >&2; exit 1)

push:
	docker push $(IMAGE)

all: build push

clean:
	@$(COMPOSE) down --rmi local 2>/dev/null \
		|| (echo "Error: no sandbox '$(NAME)' found to clean." >&2; exit 1)

list:
	@docker ps --filter "label=com.docker.compose.service=sandbox" --format "table {{.Names}}\t{{.Status}}\t{{.Image}}"

heartbeat:
	@docker exec -d --user sandbox $(NAME) bash -c '/home/sandbox/install/heartbeat.sh start' 2>/dev/null \
		|| (echo "Error: container '$(NAME)' is not running. Start it with: make NAME=$(NAME) run" >&2; exit 1)
	@echo "Heartbeat started in $(NAME)"

heartbeat-stop:
	@docker exec --user sandbox $(NAME) bash -c '/home/sandbox/install/heartbeat.sh stop' 2>/dev/null \
		|| (echo "Error: container '$(NAME)' is not running or heartbeat not active." >&2; exit 1)

heartbeat-status:
	@docker exec --user sandbox $(NAME) bash -c '/home/sandbox/install/heartbeat.sh status' 2>/dev/null \
		|| (echo "Error: container '$(NAME)' is not running." >&2; exit 1)
