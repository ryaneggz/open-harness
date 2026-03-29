DOCKER  ?= false
TAG     ?= latest
REGISTRY = ghcr.io/ryaneggz

BASE_BRANCH ?= development
BRANCH      ?= agent/$(NAME)

HEARTBEAT_ACTIVE_START ?=
HEARTBEAT_ACTIVE_END   ?=
HEARTBEAT_AGENT        ?= claude

# NAME-dependent variables (only evaluated when NAME is set)
ifdef NAME
  IMAGE = $(REGISTRY)/$(NAME):$(TAG)
  export NAME
  WORKTREE = .worktrees/$(NAME)
  # Use worktree if it exists, otherwise fall back to repo root
  PROJECT_ROOT = $(if $(wildcard $(WORKTREE)/Makefile),$(WORKTREE),.)
  COMPOSE_FILES = -f $(PROJECT_ROOT)/docker/docker-compose.yml
  ifeq ($(DOCKER),true)
    COMPOSE_FILES += -f $(PROJECT_ROOT)/docker/docker-compose.docker.yml
  endif
  COMPOSE = NAME=$(NAME) docker compose $(COMPOSE_FILES) -p $(NAME)
endif

# Macro to assert NAME is provided before running a target
assert-name = $(if $(NAME),,$(error NAME is required. Usage: make NAME=my-sandbox $@))

.PHONY: help quickstart worktree build rebuild run shell stop push all clean list heartbeat heartbeat-stop heartbeat-status heartbeat-migrate

.DEFAULT_GOAL := help

help:
	@echo ""
	@echo "  Ruska AI Sandboxes"
	@echo "  =================="
	@echo ""
	@echo "  Usage: make NAME=<sandbox-name> <target>"
	@echo ""
	@echo "  Targets:"
	@echo "    quickstart        Create worktree, build image, start container, and run setup"
	@echo "    worktree          Create a git worktree for the sandbox (called by quickstart)"
	@echo "    build             Build the Docker image"
	@echo "    rebuild           Tear down, rebuild (no cache), and start"
	@echo "    run               Start the sandbox container"
	@echo "    shell             Open a bash shell in the running sandbox"
	@echo "    stop              Stop and remove the sandbox"
	@echo "    clean             Stop, remove the sandbox, its image, and worktree"
	@echo "    push              Push the image to the registry"
	@echo "    all               Build and push"
	@echo "    list              List running sandboxes and worktrees (no NAME needed)"
	@echo "    heartbeat         Sync heartbeat cron schedules from heartbeats.conf"
	@echo "    heartbeat-stop    Remove all heartbeat cron schedules"
	@echo "    heartbeat-status  Show heartbeat schedules and recent logs"
	@echo "    heartbeat-migrate Convert legacy HEARTBEAT_INTERVAL to heartbeats.conf"
	@echo ""
	@echo "  Options:"
	@echo "    NAME=<name>       (required) Sandbox name"
	@echo "    BRANCH=<branch>   Git branch name (default: agent/<NAME>)"
	@echo "    BASE_BRANCH=<b>   Base branch for worktree (default: development)"
	@echo "    DOCKER=true       Use Docker-in-Docker compose override"
	@echo "    TAG=<tag>         Image tag (default: latest)"
	@echo ""

worktree:
	@$(assert-name)
	@if [ ! -d "$(WORKTREE)" ]; then \
		echo "  Creating worktree: $(WORKTREE) (branch: $(BRANCH))"; \
		git fetch origin $(BASE_BRANCH) 2>/dev/null || true; \
		git worktree add $(WORKTREE) -b $(BRANCH) origin/$(BASE_BRANCH); \
	else \
		echo "  Worktree already exists: $(WORKTREE)"; \
	fi

quickstart: worktree
	@$(MAKE) --no-print-directory NAME=$(NAME) DOCKER=$(DOCKER) TAG=$(TAG) _quickstart

_quickstart:
	docker build -f $(PROJECT_ROOT)/docker/Dockerfile -t $(IMAGE) $(PROJECT_ROOT)
	$(COMPOSE) up -d
	docker exec --user root $(NAME) bash -c '/home/sandbox/install/setup.sh --non-interactive'
	@echo ""
	@echo "  Sandbox '$(NAME)' is ready!"
	@echo "  Worktree: $(WORKTREE)"
	@echo "  Branch:   $$(git -C $(WORKTREE) branch --show-current)"
	@echo ""
	@echo "  Run:  make NAME=$(NAME) shell"
	@echo "  Then: claude"
	@echo ""

build:
	@$(assert-name)
	docker build -f $(PROJECT_ROOT)/docker/Dockerfile -t $(IMAGE) $(PROJECT_ROOT)

rebuild:
	@$(assert-name)
	@$(COMPOSE) down --rmi local 2>/dev/null || true
	docker build --no-cache -f $(PROJECT_ROOT)/docker/Dockerfile -t $(IMAGE) $(PROJECT_ROOT)
	$(COMPOSE) up -d

run:
	@$(assert-name)
	$(COMPOSE) up -d

shell:
	@$(assert-name)
	@docker exec -it $(NAME) bash 2>/dev/null \
		|| (echo "Error: container '$(NAME)' is not running. Start it with: make NAME=$(NAME) run" >&2; exit 1)

stop:
	@$(assert-name)
	@$(COMPOSE) down 2>/dev/null \
		|| (echo "Error: no sandbox '$(NAME)' found to stop." >&2; exit 1)

push:
	@$(assert-name)
	docker push $(IMAGE)

all: build push

clean:
	@$(assert-name)
	@$(COMPOSE) down --rmi local 2>/dev/null \
		|| (echo "Error: no sandbox '$(NAME)' found to clean." >&2; exit 1)
	@if [ -d "$(WORKTREE)" ]; then \
		git worktree remove $(WORKTREE) --force; \
		echo "  Worktree removed: $(WORKTREE)"; \
	fi

list:
	@echo ""
	@echo "  Running containers:"
	@docker ps --filter "label=com.docker.compose.service=sandbox" --format "table {{.Names}}\t{{.Status}}\t{{.Image}}"
	@echo ""
	@echo "  Worktrees:"
	@git worktree list
	@echo ""

heartbeat:
	@$(assert-name)
	@docker exec --user sandbox $(NAME) bash -c '/home/sandbox/install/heartbeat.sh sync' 2>/dev/null \
		|| (echo "Error: container '$(NAME)' is not running. Start it with: make NAME=$(NAME) run" >&2; exit 1)

heartbeat-stop:
	@$(assert-name)
	@docker exec --user sandbox $(NAME) bash -c '/home/sandbox/install/heartbeat.sh stop' 2>/dev/null \
		|| (echo "Error: container '$(NAME)' is not running." >&2; exit 1)

heartbeat-status:
	@$(assert-name)
	@docker exec --user sandbox $(NAME) bash -c '/home/sandbox/install/heartbeat.sh status' 2>/dev/null \
		|| (echo "Error: container '$(NAME)' is not running." >&2; exit 1)

heartbeat-migrate:
	@$(assert-name)
	@docker exec --user sandbox $(NAME) bash -c '/home/sandbox/install/heartbeat.sh migrate' 2>/dev/null \
		|| (echo "Error: container '$(NAME)' is not running." >&2; exit 1)
