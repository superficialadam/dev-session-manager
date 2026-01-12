#!/usr/bin/env bash
set -euo pipefail

# Dev Session Manager - Install Script
# Usage: ./install.sh [dev-directory]
# Example: ./install.sh ~/CODE

# Colors (defined early for prompt)
BLUE='\033[0;34m'
NC='\033[0m'

# Get DEV_DIR from argument, env, or ask
if [[ -n "${1:-}" ]]; then
    DEV_DIR="$1"
elif [[ -n "${DEV_DIR:-}" ]]; then
    DEV_DIR="$DEV_DIR"
else
    echo ""
    echo -e "${BLUE}Where should dev sessions be stored?${NC}"
    read -r -p "Directory [$HOME/dev]: " input_dir
    DEV_DIR="${input_dir:-$HOME/dev}"
fi

# Expand ~ if present
DEV_DIR="${DEV_DIR/#\~/$HOME}"

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

# Create directory structure
log_info "Creating directory structure..."
mkdir -p "$DEV_DIR"/{repos,worktrees,sessions,scripts}
mkdir -p "$HOME/.local/bin"
log_success "Directories created: $DEV_DIR"

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

# Copy scripts
log_info "Installing scripts..."
SCRIPT_DIR="$(dirname "$(readlink -f "$0")")"

if [[ -d "$SCRIPT_DIR/scripts" ]]; then
    cp "$SCRIPT_DIR/scripts"/dev-* "$DEV_DIR/scripts/"
else
    log_warn "Scripts directory not found, skipping script copy"
    log_info "You'll need to copy scripts manually"
fi

# Make scripts executable
chmod +x "$DEV_DIR/scripts"/dev-* 2>/dev/null || true

# Create symlinks
log_info "Creating symlinks..."
for script in "$DEV_DIR/scripts"/dev-*; do
    [[ ! -f "$script" ]] && continue
    name=$(basename "$script")
    ln -sf "$script" "$HOME/.local/bin/$name"
done
log_success "Scripts linked to ~/.local/bin/"

# Check PATH
if [[ ":$PATH:" != *":$HOME/.local/bin:"* ]]; then
    log_warn "~/.local/bin is not in PATH"
    log_info "Add to your shell config:"
    echo '  export PATH="$HOME/.local/bin:$PATH"'
fi

# Copy dashboard
if [[ -d "$SCRIPT_DIR/dashboard" ]]; then
    log_info "Copying dashboard..."
    cp -r "$SCRIPT_DIR/dashboard" "$DEV_DIR/"
    
    log_info "Installing dashboard dependencies..."
    cd "$DEV_DIR/dashboard"
    
    if command -v pnpm &> /dev/null; then
        pnpm install
    else
        npm install
    fi
    
    log_success "Dashboard installed to $DEV_DIR/dashboard"
else
    log_warn "Dashboard directory not found"
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
ExecStart=$DEV_DIR/scripts/dev-watch
Restart=always
RestartSec=5
Environment=DEV_DIR=$DEV_DIR

[Install]
WantedBy=default.target
EOF

log_success "Systemd service created"
log_info "Enable with: systemctl --user enable --now dev-watch"

# Add DEV_DIR export to shell profile if not default
if [[ "$DEV_DIR" != "$HOME/dev" ]]; then
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
echo "Dev directory: $DEV_DIR"
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
echo "   cd $DEV_DIR/dashboard && pnpm dev"
echo ""
echo "5. Start the watcher (for notifications):"
echo "   systemctl --user enable --now dev-watch"
echo ""
echo "Subscribe to notifications:"
echo "   https://ntfy.sh/$(jq -r '.notifications.ntfy_topic' "$DEV_DIR/config.json")"
echo ""
