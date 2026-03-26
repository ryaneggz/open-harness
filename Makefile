SANDBOX_NAME ?= sandbox
TAG ?= latest
REGISTRY = ghcr.io/ruska-ai
IMAGE = $(REGISTRY)/sandbox/$(SANDBOX_NAME):$(TAG)

.PHONY: build push all

build:
	docker build -t $(IMAGE) $(SANDBOX_NAME)/

push:
	docker push $(IMAGE)

all: build push
