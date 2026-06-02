# Cobble (@jameymcelveen/cobble) — local dev and npm publish helpers

PKG       := @jameymcelveen/cobble
NPM       := npm
NODE      := node

.PHONY: help build test install uninstall deploy clean ci

help:
	@echo "Cobble Makefile targets:"
	@echo "  make build      Compile TypeScript to dist/"
	@echo "  make test       Build and run tests"
	@echo "  make install    Build and npm link (global cobble CLI for local testing)"
	@echo "  make uninstall  Remove global npm link"
	@echo "  make deploy     Test, then publish $(PKG) to npm (--access public)"
	@echo "  make clean      Remove dist/ and node_modules/"
	@echo "  make ci         Install deps and run CI-equivalent checks"

build:
	$(NPM) run build

test: build
	$(NPM) test

install: build
	$(NPM) link

uninstall:
	-$(NPM) unlink -g $(PKG) 2>/dev/null || true
	@echo "Unlinked $(PKG) (if it was linked)"

deploy: test
	$(NPM) publish --access public

clean:
	rm -rf dist node_modules

ci:
	$(NPM) ci
	$(NPM) run build
	$(NPM) test
