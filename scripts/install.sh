#!/usr/bin/env bash
# SnipWin Installer — Linux/macOS
# Usage: curl -fsSL https://raw.githubusercontent.com/nirnimesz/snip-win/main/scripts/install.sh | bash

set -e

# ── Helper Functions ──
step()  { echo -e "\e[36m[→]\e[0m $1"; }
ok()    { echo -e "\e[32m[✓]\e[0m $1"; }
warn()  { echo -e "\e[33m[!]\e[0m $1"; }
err()   { echo -e "\e[31m[✗]\e[0m $1"; }

# ── Banner ──
echo ""
echo -e "\e[36m  ╔══════════════════════════════════════════╗\e[0m"
echo -e "\e[36m  ║        SnipWin v4.0 — Installer         ║\e[0m"
echo -e "\e[36m  ║  Visual Review + 16 Developer Tools     ║\e[0m"
echo -e "\e[36m  ╚══════════════════════════════════════════╝\e[0m"
echo ""

# ── Check Node.js ──
step "Checking Node.js..."
if ! command -v node &> /dev/null; then
    err "Node.js is required but not installed."
    echo ""
    echo -e "  Download from: \e[33mhttps://nodejs.org/\e[0m"
    echo -e "  Or run: \e[33mnvm install --lts\e[0m"
    echo ""
    exit 1
fi
NODE_VERSION=$(node --version)
ok "Node.js $NODE_VERSION detected"

# ── Check Git ──
HAS_GIT=false
if command -v git &> /dev/null; then
    HAS_GIT=true
fi

# ── Install Directory ──
INSTALL_DIR="$HOME/snip-win"

if [ -f "$INSTALL_DIR/package.json" ]; then
    # Read current version
    CURRENT_VERSION=$(node -e "try{console.log(require('$INSTALL_DIR/package.json').version)}catch(e){console.log('unknown')}" 2>/dev/null || echo "unknown")

    warn "SnipWin v$CURRENT_VERSION already installed at:"
    echo -e "    \e[90m$INSTALL_DIR\e[0m"
    echo ""
    read -p "Update to latest version? (y/n): " UPDATE

    if [ "$UPDATE" != "y" ]; then
        ok "Keeping v$CURRENT_VERSION"
        echo ""
        echo -e "  To launch: \e[97mcd $INSTALL_DIR && npm start\e[0m"
        echo ""
        exit 0
    fi

    # Update
    echo ""
    step "Updating SnipWin..."
    cd "$INSTALL_DIR"

    if $HAS_GIT; then
        git fetch origin main >/dev/null 2>&1
        git reset --hard origin/main >/dev/null 2>&1
        ok "Updated to latest version"
    else
        warn "Git not found. Re-downloading..."
        cd /tmp
        curl -fsSL https://github.com/nirnimesz/snip-win/archive/refs/heads/main.tar.gz | tar xz
        rm -rf "$INSTALL_DIR"
        mv snip-win-main "$INSTALL_DIR"
        cd "$INSTALL_DIR"
        ok "Re-downloaded latest version"
    fi
else
    # Fresh install
    step "Downloading SnipWin..."

    if $HAS_GIT; then
        git clone --depth 1 https://github.com/nirnimesz/snip-win.git "$INSTALL_DIR" >/dev/null 2>&1
        if [ $? -eq 0 ]; then
            ok "Downloaded successfully"
        else
            err "Git clone failed. Trying zip download..."
            HAS_GIT=false
        fi
    fi

    if ! $HAS_GIT; then
        step "Downloading via zip..."
        cd /tmp
        curl -fsSL https://github.com/nirnimesz/snip-win/archive/refs/heads/main.tar.gz | tar xz
        mv snip-win-main "$INSTALL_DIR"
        cd "$INSTALL_DIR"
        ok "Downloaded successfully"
    fi
fi

# ── Install Dependencies ──
echo ""
step "Installing dependencies (this may take a minute)..."

# Show spinner while npm installs
SPINNER='⠋⠙⠹⠸⠼⠴⠦⠧⠇⠏'
i=0
(
    cd "$INSTALL_DIR"
    FORCE_COLOR=0 npm install --no-audit --no-fund >/dev/null 2>&1
    echo "DONE" > /tmp/snipwin-npm-status
) &
NPM_PID=$!

while kill -0 $NPM_PID 2>/dev/null; do
    SPIN_CHAR="${SPINNER:$i:1}"
    echo -ne "\r  \e[36m$SPIN_CHAR\e[0m Installing packages..."
    sleep 0.15
    i=$(( (i + 1) % 10 ))
done
wait $NPM_PID
echo -ne "\r  \e[32m✓\e[0m Dependencies installed                    \n"

# ── Read Installed Version ──
INSTALLED_VERSION=$(node -e "try{console.log(require('$INSTALL_DIR/package.json').version)}catch(e){console.log('unknown')}" 2>/dev/null || echo "unknown")

# ── Success Banner ──
echo ""
echo -e "\e[32m  ╔══════════════════════════════════════════╗\e[0m"
echo -e "\e[32m  ║         Installation Complete!            ║\e[0m"
echo -e "\e[32m  ║         SnipWin v$INSTALLED_VERSION               ║\e[0m"
echo -e "\e[32m  ╚══════════════════════════════════════════╝\e[0m"
echo ""
echo -e "  Installed to: \e[90m$INSTALL_DIR\e[0m"
echo ""
echo -e "  \e[36mQuick Start:\e[0m"
echo -e "  \e[36m  ───────────\e[0m"
echo -e "  \e[97m1. Launch:\e[0m"
echo -e "     \e[90mcd $INSTALL_DIR && npm start\e[0m"
echo ""
echo -e "  \e[97m2. CLI:\e[0m"
echo -e "     \e[90mnode src/cli/snip-win.js --help\e[0m"
echo ""
echo -e "  \e[97m3. Setup AI integration:\e[0m"
echo -e "     \e[90mnode scripts/setup.js\e[0m"
echo ""

# ── Optional: Run Setup ──
read -p "Configure AI CLI integrations now? (y/n): " SETUP
if [ "$SETUP" = "y" ]; then
    echo ""
    node scripts/setup.js
fi
