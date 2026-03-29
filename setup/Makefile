DOCKER  ?= false
TAG     ?= latest
REGISTRY = ghcr.io/ryaneggz

BASE_BRANCH ?= development
BRANCH      ?= agent/$(NAME)

HEARTBEAT_ACTIVE_START ?=
HEARTBEAT_ACTIVE_END   ?=
HEARTBEAT_AGENT        ?= claude

SETUP_DIR := $(patsubst %/,%,$(dir $(abspath $(lastword $(MAKEFILE_LIST)))))
REPO_ROOT := $(patsubst %/,%,$(dir $(SETUP_DIR)))

ifneq ($(strip $(WORKSPACE)),)
  $(error WORKSPACE is no longer supported. Managed sandboxes must use git worktrees under .worktrees/<NAME>)
endif

# NAME-dependent variables (only evaluated when NAME is set)
ifdef NAME
  IMAGE = $(REGISTRY)/$(NAME):$(TAG)
  export NAME
  WORKTREE = $(REPO_ROOT)/.worktrees/$(NAME)
  HARNESS_ROOT = $(if $(wildcard $(WORKTREE)/Makefile),$(WORKTREE),$(REPO_ROOT))
  WORKSPACE_ROOT = $(abspath $(WORKTREE))

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
	@echo "  Open Harness (internal/debugging make targets)"
	@echo "  ============================================="
	@echo ""
	@echo "  Usage: make NAME=<sandbox-name> <target>"
	@echo ""
	@echo "  Note: prefer 'oh ...' for normal use; these make targets are lower-level plumbing."
	@echo ""
	@echo "  Targets:"
	@echo "    install-cli       Install the 'oh' CLI (global if possible, otherwise user-local)"
	@echo "    quickstart        Create worktree, build image, start container, and run setup"
	@echo "    worktree          Create a managed git worktree for the sandbox"
	@echo "    build             Build the Docker image"
	@echo "    rebuild           Tear down, rebuild (no cache), and start"
	@echo "    run               Start the sandbox container"
	@echo "    shell             Open a login shell in ~ as sandbox"
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
	@echo "    Managed worktrees always live under .worktrees/<NAME>"
	@echo "    BRANCH=<branch>   Git branch name (default: agent/<NAME>)"
	@echo "    BASE_BRANCH=<b>   Base branch for worktree (default: development)"
	@echo "    DOCKER=true       Use Docker-in-Docker compose override"
	@echo "    TAG=<tag>         Image tag (default: latest)"
	@echo ""

install-cli:
	@"$(SETUP_DIR)/oh" install

worktree:
	@$(assert-name)
	@if [ ! -d "$(WORKTREE)" ]; then \
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
	fi

quickstart: worktree
	@$(MAKE) --no-print-directory NAME=$(NAME) DOCKER=$(DOCKER) TAG=$(TAG) BRANCH='$(BRANCH)' BASE_BRANCH='$(BASE_BRANCH)' _quickstart

_quickstart:
	docker build -f $(HARNESS_ROOT)/setup/docker/Dockerfile -t $(IMAGE) $(HARNESS_ROOT)
	$(COMPOSE) up -d
	docker exec --user root $(NAME) bash -c '/opt/open-harness/install/setup.sh --non-interactive'
	@echo ""
	@echo "  Sandbox '$(NAME)' is ready!"
	@echo "  Worktree: $(WORKSPACE_ROOT)"; \
	 echo "  Branch:   $$(git -C "$(WORKSPACE_ROOT)" branch --show-current)"
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
	@docker exec --user sandbox -e HOME=/home/sandbox -w /home/sandbox -it $(NAME) bash --login 2>/dev/null \
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
