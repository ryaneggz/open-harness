DOCKER  ?= false
TAG     ?= latest
REGISTRY = ghcr.io/ryaneggz

BASE_BRANCH ?= development
BRANCH      ?= agent/$(NAME)
WORKSPACE   ?=

HEARTBEAT_ACTIVE_START ?=
HEARTBEAT_ACTIVE_END   ?=
HEARTBEAT_AGENT        ?= claude

SETUP_DIR := $(patsubst %/,%,$(dir $(abspath $(lastword $(MAKEFILE_LIST)))))
REPO_ROOT := $(patsubst %/,%,$(dir $(SETUP_DIR)))

# NAME-dependent variables (only evaluated when NAME is set)
ifdef NAME
  IMAGE = $(REGISTRY)/$(NAME):$(TAG)
  export NAME
  WORKTREE = $(REPO_ROOT)/.worktrees/$(NAME)

  ifneq ($(strip $(WORKSPACE)),)
    HARNESS_ROOT = $(REPO_ROOT)
    WORKSPACE_ROOT = $(abspath $(WORKSPACE))
    WORKSPACE_MODE = external
  else
    HARNESS_ROOT = $(if $(wildcard $(WORKTREE)/Makefile),$(WORKTREE),$(REPO_ROOT))
    WORKSPACE_ROOT = $(abspath $(HARNESS_ROOT))
    WORKSPACE_MODE = worktree
  endif

  COMPOSE_FILES = -f $(HARNESS_ROOT)/setup/docker/docker-compose.yml
  ifeq ($(DOCKER),true)
    COMPOSE_FILES += -f $(HARNESS_ROOT)/setup/docker/docker-compose.docker.yml
  endif
  COMPOSE = NAME=$(NAME) HARNESS_ROOT=$(HARNESS_ROOT) HOST_WORKSPACE=$(WORKSPACE_ROOT) docker compose $(COMPOSE_FILES) -p $(NAME)
endif

assert-name = $(if $(NAME),,$(error NAME is required. Usage: make NAME=my-sandbox $@))

.PHONY: help install-cli quickstart worktree build rebuild run shell stop push all clean list heartbeat heartbeat-stop heartbeat-status heartbeat-migrate

.DEFAULT_GOAL := help

help:
	@echo ""
	@echo "  Open Harness"
	@echo "  ============"
	@echo ""
	@echo "  Usage: make NAME=<sandbox-name> <target>"
	@echo ""
	@echo "  Targets:"
	@echo "    install-cli       Install the global 'oh' CLI to /usr/local/bin/oh"
	@echo "    quickstart        Create workspace, build image, start container, and run setup"
	@echo "    worktree          Create a git worktree for the sandbox (skipped if WORKSPACE is set)"
	@echo "    build             Build the Docker image"
	@echo "    rebuild           Tear down, rebuild (no cache), and start"
	@echo "    run               Start the sandbox container"
	@echo "    shell             Open a login shell in /workspace as sandbox"
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
	@echo "    WORKSPACE=<path>  Optional external host path to mount at /workspace"
	@echo "    BRANCH=<branch>   Git branch name (default: agent/<NAME>)"
	@echo "    BASE_BRANCH=<b>   Base branch for worktree (default: development)"
	@echo "    DOCKER=true       Use Docker-in-Docker compose override"
	@echo "    TAG=<tag>         Image tag (default: latest)"
	@echo ""

install-cli:
	@chmod +x "$(SETUP_DIR)/oh"
	@if [ -w /usr/local/bin ]; then \
		ln -sf "$(SETUP_DIR)/oh" /usr/local/bin/oh; \
	else \
		sudo ln -sf "$(SETUP_DIR)/oh" /usr/local/bin/oh; \
	fi
	@echo "Installed: /usr/local/bin/oh -> $(SETUP_DIR)/oh"

worktree:
	@$(assert-name)
	@if [ -n "$(strip $(WORKSPACE))" ]; then \
		mkdir -p "$(WORKSPACE_ROOT)"; \
		echo "  Using external workspace: $(WORKSPACE_ROOT)"; \
	else \
		if [ ! -d "$(WORKTREE)" ]; then \
			echo "  Creating worktree: $(WORKTREE) (branch: $(BRANCH))"; \
			mkdir -p "$(dir $(WORKTREE))"; \
			git -C "$(REPO_ROOT)" fetch origin $(BASE_BRANCH) 2>/dev/null || true; \
			git -C "$(REPO_ROOT)" fetch origin $(BRANCH) 2>/dev/null || true; \
			if git -C "$(REPO_ROOT)" show-ref --verify --quiet refs/heads/$(BRANCH) 2>/dev/null || \
			   git -C "$(REPO_ROOT)" show-ref --verify --quiet refs/remotes/origin/$(BRANCH) 2>/dev/null; then \
				echo "  Branch '$(BRANCH)' already exists, checking out..."; \
				git -C "$(REPO_ROOT)" worktree add "$(WORKTREE)" $(BRANCH); \
			else \
				echo "  Creating new branch '$(BRANCH)' from origin/$(BASE_BRANCH)..."; \
				git -C "$(REPO_ROOT)" worktree add "$(WORKTREE)" -b $(BRANCH) origin/$(BASE_BRANCH); \
			fi; \
		else \
			echo "  Worktree already exists: $(WORKTREE)"; \
		fi; \
	fi

quickstart: worktree
	@$(MAKE) --no-print-directory NAME=$(NAME) WORKSPACE='$(WORKSPACE)' DOCKER=$(DOCKER) TAG=$(TAG) BRANCH='$(BRANCH)' BASE_BRANCH='$(BASE_BRANCH)' _quickstart

_quickstart:
	docker build -f $(HARNESS_ROOT)/setup/docker/Dockerfile -t $(IMAGE) $(HARNESS_ROOT)
	$(COMPOSE) up -d
	docker exec --user root $(NAME) bash -c '/opt/open-harness/install/setup.sh --non-interactive'
	@echo ""
	@echo "  Sandbox '$(NAME)' is ready!"
	@if [ "$(WORKSPACE_MODE)" = "worktree" ]; then \
		echo "  Worktree: $(WORKSPACE_ROOT)"; \
		echo "  Branch:   $$(git -C "$(WORKSPACE_ROOT)" branch --show-current)"; \
	else \
		echo "  Workspace: $(WORKSPACE_ROOT)"; \
	fi
	@echo ""
	@echo "  Run:  make NAME=$(NAME) shell"
	@echo "  Or:   oh shell $(NAME)"
	@echo "  Then: claude"
	@echo ""

build:
	@$(assert-name)
	docker build -f $(HARNESS_ROOT)/setup/docker/Dockerfile -t $(IMAGE) $(HARNESS_ROOT)

rebuild:
	@$(assert-name)
	@$(COMPOSE) down --rmi local 2>/dev/null || true
	docker build --no-cache -f $(HARNESS_ROOT)/setup/docker/Dockerfile -t $(IMAGE) $(HARNESS_ROOT)
	$(COMPOSE) up -d

run:
	@$(assert-name)
	$(COMPOSE) up -d

shell:
	@$(assert-name)
	@docker exec --user sandbox -e HOME=/home/sandbox -w /workspace -it $(NAME) bash --login 2>/dev/null \
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
	@if [ -z "$(strip $(WORKSPACE))" ] && [ -d "$(WORKTREE)" ]; then \
		git -C "$(REPO_ROOT)" worktree remove "$(WORKTREE)" --force; \
		echo "  Worktree removed: $(WORKTREE)"; \
	fi

list:
	@echo ""
	@echo "  Running containers:"
	@docker ps --filter "label=com.docker.compose.service=sandbox" --format "table {{.Names}}\t{{.Status}}\t{{.Image}}"
	@echo ""
	@echo "  Worktrees:"
	@git -C "$(REPO_ROOT)" worktree list
	@echo ""

heartbeat:
	@$(assert-name)
	@docker exec --user sandbox -e HOME=/home/sandbox $(NAME) bash -c '/opt/open-harness/install/heartbeat.sh sync' 2>/dev/null \
		|| (echo "Error: container '$(NAME)' is not running. Start it with: make NAME=$(NAME) run" >&2; exit 1)

heartbeat-stop:
	@$(assert-name)
	@docker exec --user sandbox -e HOME=/home/sandbox $(NAME) bash -c '/opt/open-harness/install/heartbeat.sh stop' 2>/dev/null \
		|| (echo "Error: container '$(NAME)' is not running." >&2; exit 1)

heartbeat-status:
	@$(assert-name)
	@docker exec --user sandbox -e HOME=/home/sandbox $(NAME) bash -c '/opt/open-harness/install/heartbeat.sh status' 2>/dev/null \
		|| (echo "Error: container '$(NAME)' is not running." >&2; exit 1)

heartbeat-migrate:
	@$(assert-name)
	@docker exec --user sandbox -e HOME=/home/sandbox $(NAME) bash -c '/opt/open-harness/install/heartbeat.sh migrate' 2>/dev/null \
		|| (echo "Error: container '$(NAME)' is not running." >&2; exit 1)
