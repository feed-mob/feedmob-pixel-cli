PNPM ?= pnpm
PREFIX ?= $(HOME)/.local
BIN_DIR ?= $(PREFIX)/bin
BIN ?= fpc

.PHONY: install build test install-local

install:
	$(PNPM) install

build:
	$(PNPM) build

test:
	$(PNPM) test

install-local: build
	mkdir -p "$(BIN_DIR)"
	printf '%s\n' '#!/usr/bin/env sh' 'exec node "$(CURDIR)/dist/cli.js" "$$@"' > "$(BIN_DIR)/$(BIN)"
	chmod +x "$(BIN_DIR)/$(BIN)"
	@echo "Installed $(BIN_DIR)/$(BIN)"
