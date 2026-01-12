#!/usr/bin/env bash
set -euo pipefail

# Dev Session Manager - Install Script
# Usage: ./install.sh [data-directory]
# Example: ./install.sh ~/dev-data

SCRIPT_PATH="$(readlink -f "$0")"
REPO_ROOT="$(cd "$(dirname "$SCRIPT_PATH")" && pwd)"
PACKAGES_DIR="$REPO_ROOT/packages"
SCRIPTS_DIR="$PACKAGES_DIR/scripts"
DASHBOARD_DIR="$PACKAGES_DIR/dashboard"
DEFAULT_DEV_DIR="$HOME/.dev-sessions"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

log_info() { echo -e "${BLUE}→${NC} $1"; }
log_success() { echo -e "${GREEN}✓${NC} $1"; }
log_warn() { echo -e "${YELLOW}!${NC} $1"; }
log_error() { echo -e "${RED}✗${NC} $1" >&2; }

# Get DEV_DIR from argument, env, or ask
if [[ -n "${1:-}" ]]; then
    DEV_DIR="$1"
elif [[ -n "${DEV_DIR:-}" ]]; then
    DEV_DIR="$DEV_DIR"
else
    echo ""
    echo -e "${BLUE}Where should runtime data be stored?${NC}"
    read -r -p "Directory [$DEFAULT_DEV_DIR]: " input_dir
    DEV_DIR="${input_dir:-$DEFAULT_DEV_DIR}"
fi

# Expand ~ if present
DEV_DIR="${DEV_DIR/#\~/$HOME}"

echo ""
echo "╔══════════════════════════════════════╗"
echo "║   Dev Session Manager - Installer    ║"
echo "╚══════════════════════════════════════╝"
echo ""

# Check dependencies
log_info "Checking dependencies..."

check_cmd() {
    if ! command -v "$1" &> /dev/null; then
        log_error "$1 not found. Please install it first."
        exit 1
    fi
    log_success "$1 found"
}

check_cmd tmux
check_cmd git
check_cmd jq
check_cmd node
check_cmd pnpm || check_cmd npm

# Optional but recommended
if ! command -v gh &> /dev/null; then
    log_warn "gh CLI not found - install for GitHub integration: sudo apt install gh"
fi

if ! command -v ttyd &> /dev/null; then
    log_warn "ttyd not found - install for web terminal: https://github.com/tsl0922/ttyd/releases"
fi

# Create runtime directory structure
log_info "Creating runtime directories..."
mkdir -p "$DEV_DIR"/{repos,worktrees,sessions}
mkdir -p "$HOME/.local/bin"
log_success "Runtime directories ready at: $DEV_DIR"

# Create default config
if [[ ! -f "$DEV_DIR/config.json" ]]; then
    log_info "Creating default config..."
    
    # Generate a random topic for ntfy
    RANDOM_TOPIC="dev-sessions-$(head /dev/urandom | tr -dc a-z0-9 | head -c 8)"
    
    cat > "$DEV_DIR/config.json" << EOF
{
  "default_agent": "opencode",
  "notifications": {
    "ntfy_server": "https://ntfy.sh",
    "ntfy_topic": "$RANDOM_TOPIC"
  }
}
EOF
    log_success "Config created with ntfy topic: $RANDOM_TOPIC"
    log_info "Subscribe on Android: ntfy.sh/$RANDOM_TOPIC"
else
    log_info "Config already exists, skipping"
fi

# Create empty repos.json if not exists
if [[ ! -f "$DEV_DIR/repos.json" ]]; then
    echo '{}' > "$DEV_DIR/repos.json"
fi

# Link scripts from repo (not copy)
log_info "Linking CLI scripts from repository..."
if [[ ! -d "$SCRIPTS_DIR" ]]; then
    log_error "Scripts directory not found at $SCRIPTS_DIR"
    exit 1
fi

chmod +x "$SCRIPTS_DIR"/dev-* 2>/dev/null || true
for script in "$SCRIPTS_DIR"/dev-*; do
    [[ ! -f "$script" ]] && continue
    name=$(basename "$script")
    ln -sf "$script" "$HOME/.local/bin/$name"
done
log_success "Scripts linked from $SCRIPTS_DIR to ~/.local/bin/"

# Check PATH
if [[ ":$PATH:" != *":$HOME/.local/bin:"* ]]; then
    log_warn "~/.local/bin is not in PATH"
    log_info "Add to your shell config:"
    echo '  export PATH="$HOME/.local/bin:$PATH"'
fi

# Install dashboard dependencies (in place, no copy)
if [[ -d "$DASHBOARD_DIR" ]]; then
    log_info "Installing dashboard dependencies..."
    cd "$DASHBOARD_DIR"
    
    if command -v pnpm &> /dev/null; then
        pnpm install
    else
        npm install
    fi
    
    log_success "Dashboard dependencies installed"
    cd "$REPO_ROOT"
else
    log_warn "Dashboard directory not found at $DASHBOARD_DIR"
fi

# Create systemd user service for watcher
log_info "Creating systemd service..."
mkdir -p "$HOME/.config/systemd/user"

cat > "$HOME/.config/systemd/user/dev-watch.service" << EOF
[Unit]
Description=Dev Session Watcher
After=network.target

[Service]
Type=simple
ExecStart=$SCRIPTS_DIR/dev-watch
Restart=always
RestartSec=5
Environment=DEV_DIR=$DEV_DIR
WorkingDirectory=$REPO_ROOT

[Install]
WantedBy=default.target
EOF

log_success "Systemd service created"
log_info "Enable with: systemctl --user enable --now dev-watch"

# Add DEV_DIR export to shell profile if customized
if [[ "$DEV_DIR" != "$DEFAULT_DEV_DIR" ]]; then
    log_info "Adding DEV_DIR to shell profile..."
    
    SHELL_RC=""
    if [[ -f "$HOME/.zshrc" ]]; then
        SHELL_RC="$HOME/.zshrc"
    elif [[ -f "$HOME/.bashrc" ]]; then
        SHELL_RC="$HOME/.bashrc"
    fi
    
    if [[ -n "$SHELL_RC" ]]; then
        if ! grep -q "export DEV_DIR=" "$SHELL_RC" 2>/dev/null; then
            echo "" >> "$SHELL_RC"
            echo "# Dev Session Manager" >> "$SHELL_RC"
            echo "export DEV_DIR=\"$DEV_DIR\"" >> "$SHELL_RC"
            log_success "Added to $SHELL_RC"
            log_warn "Run: source $SHELL_RC (or restart terminal)"
        else
            log_info "DEV_DIR already in $SHELL_RC"
        fi
    fi
fi

echo ""
echo "╔══════════════════════════════════════╗"
echo "║       Installation Complete!         ║"
echo "╚══════════════════════════════════════╝"
echo ""
echo "Repository root: $REPO_ROOT"
echo "Runtime data:    $DEV_DIR"
echo ""
echo "Next steps:"
echo ""
echo "1. Add a repository:"
echo "   dev-repo pick"
echo ""
echo "2. Configure dev servers (optional):"
echo "   dev-repo set-servers <repo-name>"
echo ""
echo "3. Create a session:"
echo "   dev-new <repo-name> <branch>"
echo ""
echo "4. Start the dashboard:"
echo "   cd $DASHBOARD_DIR && pnpm dev"
echo ""
echo "5. Start the watcher (for notifications):"
echo "   systemctl --user enable --now dev-watch"
echo ""
echo "Subscribe to notifications:"
echo "   https://ntfy.sh/$(jq -r '.notifications.ntfy_topic' "$DEV_DIR/config.json")"
echo ""
