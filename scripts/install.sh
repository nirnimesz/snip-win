#!/usr/bin/env bash
# SnipWin Installer — Linux/macOS
# Usage: curl -fsSL https://raw.githubusercontent.com/nirnimesz/snip-win/main/scripts/install.sh | bash

set -e

echo ""
echo "  ╔══════════════════════════════════════╗"
echo "  ║     SnipWin — Visual Review v4.0    ║"
echo "  ║     AI Agent Communication Layer     ║"
echo "  ╚══════════════════════════════════════╝"
echo ""

# Check Node.js
if ! command -v node &> /dev/null; then
    echo "[!] Node.js is required but not installed."
    echo "    Install: https://nodejs.org/"
    echo "    Or: nvm install --lts"
    exit 1
fi

NODE_VERSION=$(node --version)
echo "[✓] Node.js $NODE_VERSION detected"

# Install directory
INSTALL_DIR="$HOME/snip-win"

if [ -f "$INSTALL_DIR/package.json" ]; then
    echo "[i] SnipWin already installed at: $INSTALL_DIR"
    read -p "Update to latest version? (y/n): " UPDATE
    if [ "$UPDATE" != "y" ]; then
        echo "[✓] Skipping update. Run 'npm start' in $INSTALL_DIR to launch."
        exit 0
    fi
    cd "$INSTALL_DIR"
    git pull origin main
else
    echo "[→] Installing SnipWin..."
    if command -v git &> /dev/null; then
        git clone https://github.com/nirnimesz/snip-win.git "$INSTALL_DIR"
        cd "$INSTALL_DIR"
    else
        echo "[!] git not found. Installing via npm..."
        mkdir -p "$INSTALL_DIR"
        cd "$INSTALL_DIR"
        # Download zip without git
        curl -fsSL https://github.com/nirnimesz/snip-win/archive/refs/heads/main.tar.gz | tar xz --strip-components=1
    fi
fi

# Install dependencies
echo "[→] Installing dependencies..."
npm install --no-audit --no-fund

echo ""
echo "[✓] SnipWin installed successfully!"
echo ""
echo "  Quick Start:"
echo "  ───────────"
echo "  1. Launch:  cd $INSTALL_DIR"
echo "              npm start"
echo ""
echo "  2. CLI:     node src/cli/snip-win.js --help"
echo ""
echo "  3. Setup AI integration:"
echo "              node scripts/setup.js"
echo ""

# Optional: run setup
read -p "Configure AI CLI integrations now? (y/n): " SETUP
if [ "$SETUP" = "y" ]; then
    node scripts/setup.js
fi
