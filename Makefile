NAME ?= sandbox
TAG  ?= latest
REGISTRY = ghcr.io/ruska-ai
IMAGE = $(REGISTRY)/$(NAME):$(TAG)

export NAME

.PHONY: build rebuild run shell stop push all clean list

build:
	docker build -t $(IMAGE) .

rebuild:
	NAME=$(NAME) docker compose -p $(NAME) down --rmi local
	docker build --no-cache -t $(IMAGE) .
	NAME=$(NAME) docker compose -p $(NAME) up -d

run:
	NAME=$(NAME) docker compose -p $(NAME) up -d

shell:
	docker exec -it $(NAME) bash

stop:
	NAME=$(NAME) docker compose -p $(NAME) down

push:
	docker push $(IMAGE)

all: build push

clean:
	NAME=$(NAME) docker compose -p $(NAME) down --rmi local

list:
	@docker ps --filter "label=com.docker.compose.service=sandbox" --format "table {{.Names}}\t{{.Status}}\t{{.Image}}"
