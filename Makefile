TAG ?= latest
REGISTRY = ghcr.io/ruska-ai
IMAGE = $(REGISTRY)/sandbox:claude-$(TAG)

.PHONY: build rebuild run shell stop push all clean

build:
	docker build -t $(IMAGE) .

rebuild:
	docker compose down --rmi local
	docker build --no-cache -t $(IMAGE) .
	docker compose up -d

run:
	docker compose up -d

shell:
	docker compose exec sandbox bash

stop:
	docker compose down

push:
	docker push $(IMAGE)

all: build push

clean:
	docker compose down --rmi local
