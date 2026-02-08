.PHONY: build build-all build-release test clean install install-service uninstall run dev help

# Variables
BINARY_NAME := appscope
VERSION := 1.0.0
BUILD_TIME := $(shell date -u '+%Y-%m-%d_%H:%M:%S')
GIT_COMMIT := $(shell git rev-parse --short HEAD 2>/dev/null || echo "unknown")
LDFLAGS := -ldflags "-X main.Version=$(VERSION) -X main.BuildTime=$(BUILD_TIME) -X main.GitCommit=$(GIT_COMMIT) -s -w"

# Directories
BIN_DIR := bin
INSTALL_DIR := /usr/local/bin
CONFIG_DIR := /etc/appscope
LOG_DIR := /var/log/appscope
LIB_DIR := /var/lib/appscope

# Detect OS
UNAME_S := $(shell uname -s)
ifeq ($(UNAME_S),Linux)
    SERVICE_FILE := /etc/systemd/system/appscope.service
    SERVICE_CMD := systemctl
endif
ifeq ($(UNAME_S),Darwin)
    SERVICE_FILE := /Library/LaunchDaemons/com.appscope.agent.plist
    SERVICE_CMD := launchctl
endif

# Default target
.DEFAULT_GOAL := help

## help: Display this help message
help:
	@echo "AppScope Agent Build System"
	@echo ""
	@echo "Usage: make [target]"
	@echo ""
	@echo "Available targets:"
	@awk 'BEGIN {FS = ":.*##"; printf "\n"} /^[a-zA-Z_-]+:.*?##/ { printf "  \033[36m%-20s\033[0m %s\n", $$1, $$2 } /^##@/ { printf "\n\033[1m%s\033[0m\n", substr($$0, 5) } ' $(MAKEFILE_LIST)

##@ Development

## dev: Run agent in development mode
dev:
	go run ./cmd/appscope --config config.example.yaml

## run: Run the built binary
run: build
	./$(BIN_DIR)/$(BINARY_NAME) --config config.example.yaml

## watch: Run with auto-reload (requires air: go install github.com/cosmtrek/air@latest)
watch:
	air -c .air.toml

##@ Building

## build: Build binary for current platform
build:
	@echo "Building $(BINARY_NAME) v$(VERSION) for current platform..."
	@mkdir -p $(BIN_DIR)
	go build $(LDFLAGS) -o $(BIN_DIR)/$(BINARY_NAME) ./cmd/appscope
	@echo "Build complete: $(BIN_DIR)/$(BINARY_NAME)"

## build-all: Build binaries for all supported platforms
build-all:
	@echo "Building $(BINARY_NAME) v$(VERSION) for all platforms..."
	@mkdir -p $(BIN_DIR)
	GOOS=linux GOARCH=amd64 go build $(LDFLAGS) -o $(BIN_DIR)/$(BINARY_NAME)-linux-amd64 ./cmd/appscope
	GOOS=linux GOARCH=arm64 go build $(LDFLAGS) -o $(BIN_DIR)/$(BINARY_NAME)-linux-arm64 ./cmd/appscope
	GOOS=darwin GOARCH=amd64 go build $(LDFLAGS) -o $(BIN_DIR)/$(BINARY_NAME)-darwin-amd64 ./cmd/appscope
	GOOS=darwin GOARCH=arm64 go build $(LDFLAGS) -o $(BIN_DIR)/$(BINARY_NAME)-darwin-arm64 ./cmd/appscope
	GOOS=windows GOARCH=amd64 go build $(LDFLAGS) -o $(BIN_DIR)/$(BINARY_NAME)-windows-amd64.exe ./cmd/appscope
	@echo "All builds complete in $(BIN_DIR)/"
	@ls -lh $(BIN_DIR)/

## build-release: Build optimized release binaries with compression
build-release: clean
	@echo "Building release binaries v$(VERSION)..."
	@mkdir -p $(BIN_DIR)/release
	GOOS=linux GOARCH=amd64 go build $(LDFLAGS) -o $(BIN_DIR)/release/$(BINARY_NAME)-linux-amd64 ./cmd/appscope
	GOOS=linux GOARCH=arm64 go build $(LDFLAGS) -o $(BIN_DIR)/release/$(BINARY_NAME)-linux-arm64 ./cmd/appscope
	GOOS=darwin GOARCH=amd64 go build $(LDFLAGS) -o $(BIN_DIR)/release/$(BINARY_NAME)-darwin-amd64 ./cmd/appscope
	GOOS=darwin GOARCH=arm64 go build $(LDFLAGS) -o $(BIN_DIR)/release/$(BINARY_NAME)-darwin-arm64 ./cmd/appscope
	GOOS=windows GOARCH=amd64 go build $(LDFLAGS) -o $(BIN_DIR)/release/$(BINARY_NAME)-windows-amd64.exe ./cmd/appscope
	@echo "Compressing binaries..."
	cd $(BIN_DIR)/release && tar -czf $(BINARY_NAME)-linux-amd64.tar.gz $(BINARY_NAME)-linux-amd64
	cd $(BIN_DIR)/release && tar -czf $(BINARY_NAME)-linux-arm64.tar.gz $(BINARY_NAME)-linux-arm64
	cd $(BIN_DIR)/release && tar -czf $(BINARY_NAME)-darwin-amd64.tar.gz $(BINARY_NAME)-darwin-amd64
	cd $(BIN_DIR)/release && tar -czf $(BINARY_NAME)-darwin-arm64.tar.gz $(BINARY_NAME)-darwin-arm64
	cd $(BIN_DIR)/release && zip -q $(BINARY_NAME)-windows-amd64.zip $(BINARY_NAME)-windows-amd64.exe
	@echo "Release builds complete:"
	@ls -lh $(BIN_DIR)/release/*.tar.gz $(BIN_DIR)/release/*.zip

## build-docker: Build Docker image
build-docker:
	docker build -t appscope-agent:$(VERSION) -t appscope-agent:latest .

##@ Testing

## test: Run all tests
test:
	go test -v -race -coverprofile=coverage.out ./...

## test-coverage: Run tests with coverage report
test-coverage: test
	go tool cover -html=coverage.out -o coverage.html
	@echo "Coverage report generated: coverage.html"

## test-integration: Run integration tests
test-integration:
	go test -v -tags=integration ./...

## benchmark: Run benchmarks
benchmark:
	go test -bench=. -benchmem ./...

## lint: Run linters
lint:
	@which golangci-lint > /dev/null || (echo "Installing golangci-lint..." && go install github.com/golangci/golangci-lint/cmd/golangci-lint@latest)
	golangci-lint run ./...

##@ Installation

## install: Install binary and config to system (requires sudo)
install: build
	@echo "Installing $(BINARY_NAME) to $(INSTALL_DIR)..."
	@sudo mkdir -p $(INSTALL_DIR)
	@sudo mkdir -p $(CONFIG_DIR)
	@sudo mkdir -p $(LOG_DIR)
	@sudo mkdir -p $(LIB_DIR)
	@sudo cp $(BIN_DIR)/$(BINARY_NAME) $(INSTALL_DIR)/
	@sudo chmod +x $(INSTALL_DIR)/$(BINARY_NAME)
	@if [ ! -f $(CONFIG_DIR)/config.yaml ]; then \
		echo "Installing example config..."; \
		sudo cp configs/config.example.yaml $(CONFIG_DIR)/config.yaml; \
		echo "Please edit $(CONFIG_DIR)/config.yaml with your API key"; \
	else \
		echo "Config already exists at $(CONFIG_DIR)/config.yaml"; \
	fi
	@echo "Installation complete!"
	@echo ""
	@echo "Next steps:"
	@echo "  1. Edit config: sudo nano $(CONFIG_DIR)/config.yaml"
	@echo "  2. Install service: make install-service"
	@echo "  3. Start service: make start"

## install-service: Install and enable systemd/launchd service (requires sudo)
install-service:
ifeq ($(UNAME_S),Linux)
	@echo "Installing systemd service..."
	@sudo cp configs/appscope-agent.service $(SERVICE_FILE)
	@sudo systemctl daemon-reload
	@sudo systemctl enable appscope.service
	@echo "Service installed. Start with: sudo systemctl start appscope"
else ifeq ($(UNAME_S),Darwin)
	@echo "Installing launchd service..."
	@sudo cp configs/com.appscope.agent.plist $(SERVICE_FILE)
	@sudo launchctl load $(SERVICE_FILE)
	@echo "Service installed and started"
else
	@echo "Service installation not supported on this platform"
endif

## uninstall: Remove binary, config, and service (requires sudo)
uninstall:
	@echo "Uninstalling $(BINARY_NAME)..."
	@sudo rm -f $(INSTALL_DIR)/$(BINARY_NAME)
ifeq ($(UNAME_S),Linux)
	@sudo systemctl stop appscope.service 2>/dev/null || true
	@sudo systemctl disable appscope.service 2>/dev/null || true
	@sudo rm -f $(SERVICE_FILE)
	@sudo systemctl daemon-reload
else ifeq ($(UNAME_S),Darwin)
	@sudo launchctl unload $(SERVICE_FILE) 2>/dev/null || true
	@sudo rm -f $(SERVICE_FILE)
endif
	@echo "Uninstallation complete"
	@echo "Note: Config and logs preserved in $(CONFIG_DIR) and $(LOG_DIR)"
	@echo "To remove completely: sudo rm -rf $(CONFIG_DIR) $(LOG_DIR) $(LIB_DIR)"

##@ Service Management (requires sudo)

## start: Start the agent service
start:
ifeq ($(UNAME_S),Linux)
	sudo systemctl start appscope.service
else ifeq ($(UNAME_S),Darwin)
	sudo launchctl start com.appscope.agent
endif

## stop: Stop the agent service
stop:
ifeq ($(UNAME_S),Linux)
	sudo systemctl stop appscope.service
else ifeq ($(UNAME_S),Darwin)
	sudo launchctl stop com.appscope.agent
endif

## restart: Restart the agent service
restart:
ifeq ($(UNAME_S),Linux)
	sudo systemctl restart appscope.service
else ifeq ($(UNAME_S),Darwin)
	sudo launchctl restart com.appscope.agent
endif

## status: Check agent service status
status:
ifeq ($(UNAME_S),Linux)
	sudo systemctl status appscope.service
else ifeq ($(UNAME_S),Darwin)
	sudo launchctl list | grep appscope
endif

## logs: View agent logs
logs:
ifeq ($(UNAME_S),Linux)
	sudo journalctl -u appscope.service -f
else ifeq ($(UNAME_S),Darwin)
	tail -f $(LOG_DIR)/agent.log
endif

##@ Maintenance

## clean: Remove built binaries and artifacts
clean:
	@echo "Cleaning build artifacts..."
	rm -rf $(BIN_DIR)
	rm -f coverage.out coverage.html
	@echo "Clean complete"

## deps: Download and verify dependencies
deps:
	go mod download
	go mod verify

## update-deps: Update dependencies to latest versions
update-deps:
	go get -u ./...
	go mod tidy

## format: Format code
format:
	gofmt -s -w .
	go mod tidy

## version: Display version information
version:
	@echo "AppScope Agent"
	@echo "Version: $(VERSION)"
	@echo "Build Time: $(BUILD_TIME)"
	@echo "Git Commit: $(GIT_COMMIT)"

##@ Utilities

## check: Run all checks (lint, test, build)
check: lint test build
	@echo "All checks passed!"

## pre-commit: Run before committing (format, lint, test)
pre-commit: format lint test
	@echo "Ready to commit!"

## release-checklist: Verify release readiness
release-checklist:
	@echo "Release Checklist for v$(VERSION):"
	@echo "  [ ] All tests pass"
	@echo "  [ ] Code formatted and linted"
	@echo "  [ ] Version updated in Makefile"
	@echo "  [ ] CHANGELOG.md updated"
	@echo "  [ ] Documentation updated"
	@echo "  [ ] Release builds created: make build-release"
	@echo "  [ ] Binaries tested on target platforms"
	@echo "  [ ] Git tag created: git tag v$(VERSION)"
