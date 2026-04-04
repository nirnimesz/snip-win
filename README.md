# SnipWin

> **Visual communication layer between humans and AI agents**

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)
[![Node.js](https://img.shields.io/badge/Node.js-18+-green.svg)](https://nodejs.org/)
[![Electron](https://img.shields.io/badge/Electron-33-47848F.svg)](https://www.electronjs.org/)
[![Platform](https://img.shields.io/badge/Platform-Windows%20%7C%20Linux%20%7C%20macOS-lightgrey.svg)](https://github.com/nirnimesz/snip-win)
[![Version](https://img.shields.io/github/package-json/v/nirnimesz/snip-win)](https://github.com/nirnimesz/snip-win)
[![GitHub Stars](https://img.shields.io/github/stars/nirnimesz/snip-win?style=social)](https://github.com/nirnimesz/snip-win)

AI agents generate visuals — Mermaid diagrams, code screenshots, JSON trees, regex patterns. SnipWin bridges the gap: the agent renders something, it pops up on your screen, you review and annotate, and structured feedback returns to the agent.

**16 developer tools in one app. No more opening 10 different websites.**

---

## 🚀 Quick Install

### Windows

**PowerShell One-Liner:**
```powershell
irm https://raw.githubusercontent.com/nirnimesz/snip-win/main/scripts/install.ps1 | iex
```

### Linux / macOS

**Bash One-Liner:**
```bash
curl -fsSL https://raw.githubusercontent.com/nirnimesz/snip-win/main/scripts/install.sh | bash
```

### From Source (All Platforms)

```bash
git clone https://github.com/nirnimesz/snip-win.git
cd snip-win
npm install
npm start
```

### Global Install (Optional)

```bash
npm install -g git+https://github.com/nirnimesz/snip-win.git
```

> **Note:** Use `git+https://` prefix to avoid SSH key issues.

---

## ✨ Features

### Visual Review (AI Agent Integration)
| Feature | Description |
|---------|-------------|
| 🎨 **Mermaid Diagrams** | Render flowcharts, sequence diagrams, architecture diagrams |
| 🌐 **HTML Preview** | Preview HTML layouts in sandboxed iframe |
| 🖼️ **Image Review** | Open any image for annotation and review |
| ✏️ **Fabric.js Annotations** | Rectangle, arrow, text, blur, freehand drawing |
| 📸 **Screen Capture** | Capture full screen or active window |
| 📁 **Screenshot Library** | Auto-save and organize all reviewed visuals |
| 🔌 **MCP Server** | Model Context Protocol for 6+ AI tools |

### Developer Tools
| Tool | What It Replaces |
|------|-----------------|
| 💻 **Code Screenshots** | carbon.now.sh — 8 themes, 15+ languages, window frames |
| 🌳 **JSON Tree Viewer** | JSON formatter sites — collapsible, color-coded |
| 🔍 **Regex Tester** | regex101 — real-time highlighting, capture groups |
| 🎨 **CSS Visual Builder** | CSS generators — gradients, shadows, filters, border-radius |
| 🔐 **JWT Decoder** | jwt.io — decode tokens locally, check expiry |
| 🔢 **Hash Generator** | Online hash tools — SHA-1/256/384/512, all at once |
| 🆔 **UUID Generator** | uuidgenerator.net — bulk generation, uppercase/no-dash |
| ⏰ **Timestamp Converter** | epochconverter.com — live clock, Unix ↔ ISO ↔ relative |
| ⏱️ **Cron Parser** | crontab.guru — visual breakdown, next 5 runs |
| 🔤 **Base64 Converter** | base64encode.org — encode/decode with swap |
| 📋 **YAML ↔ JSON** | Online converters — bidirectional |
| 📝 **Markdown Preview** | Markdown editors — live MD → HTML rendering |
| 🎨 **Color Extractor** | Image color pickers — extract palette from any image |
| 📊 **Tree Diagram** | File tree generators — text-to-tree renderer |
| 🔀 **Visual Diff** | Diff checkers — before/after comparison slider |
| 📤 **Export Options** | PNG, SVG, clipboard, base64 — one-click export |

---

## 📸 Screenshots

### Code Screenshot (Carbon-style)
Paste code → choose theme → copy as image. Supports 8 themes and 15+ languages.

### JSON Tree Viewer
Paste JSON → interactive collapsible tree with color-coded types.

### Regex Tester
Type pattern → real-time match highlighting with capture group display.

### JWT Decoder
Paste token → instant decode with expiry check and claim inspection.

---

## 🤖 AI CLI Integrations

SnipWin works with all major AI coding assistants via MCP (Model Context Protocol).

### Supported Tools

| AI Tool | Config File | Status |
|---------|-------------|--------|
| **OpenCode** | `opencode.json` or `~/.opencode/config.json` | ✅ |
| **ChatGPT Codex** | `~/.codex/config.json` | ✅ |
| **Claude Code** | `~/.claude/settings.json` | ✅ |
| **Cursor** | `~/.cursor/mcp.json` | ✅ |
| **Windsurf** | `~/.codeium/windsurf/mcp_config.json` | ✅ |
| **Cline (VS Code)** | Cline MCP settings | ✅ |

### Quick Setup

```bash
node scripts/setup.js
```

This detects your installed AI tools and automatically configures the MCP server.

### Manual Configuration

**OpenCode** (`opencode.json`):
```json
{
  "$schema": "https://opencode.ai/config.json",
  "mcp": {
    "snip-win": {
      "type": "local",
      "command": ["node", "/path/to/snip-win/src/mcp/server.js"],
      "enabled": true
    }
  }
}
```

**ChatGPT Codex** (`~/.codex/config.json`):
```json
{
  "mcpServers": {
    "snip-win": {
      "command": "node",
      "args": ["/path/to/snip-win/src/mcp/server.js"]
    }
  }
}
```

**Claude Code** (`~/.claude/settings.json`):
```json
{
  "mcpServers": {
    "snip-win": {
      "command": "node",
      "args": ["/path/to/snip-win/src/mcp/server.js"]
    }
  }
}
```

**Cursor** (`~/.cursor/mcp.json`):
```json
{
  "mcpServers": {
    "snip-win": {
      "command": "node",
      "args": ["/path/to/snip-win/src/mcp/server.js"]
    }
  }
}
```

---

## 📖 Usage

### Start the App

```bash
npm start
```

SnipWin runs in the system tray. Click the tray icon to open the review panel.

### CLI Commands

```bash
# Render a Mermaid diagram
echo "graph TD; A[Client] --> B[API] --> C[Database]" | node src/cli/snip-win.js render --format mermaid --message "Architecture review"

# Preview HTML
echo "<h1>Hello World</h1>" | node src/cli/snip-win.js render --format html --message "Layout check"

# Open an image for review
node src/cli/snip-win.js open screenshot.png --message "Is this correct?"

# Capture screen
node src/cli/snip-win.js capture --type screen
node src/cli/snip-win.js capture --type window

# Extract text from image (OCR)
node src/cli/snip-win.js transcribe screenshot.png

# List saved screenshots
node src/cli/snip-win.js list

# Search screenshots
node src/cli/snip-win.js search "error dialog"

# View categories
node src/cli/snip-win.js categories

# Manage settings
node src/cli/snip-win.js settings --get
node src/cli/snip-win.js settings --set theme=light
```

### MCP Tools (for AI Agents)

When configured, AI agents can use these tools:

| Tool | Description |
|------|-------------|
| `render_diagram` | Render Mermaid diagram for review |
| `render_html` | Render HTML content for review |
| `open_in_snip` | Open image for annotation |
| `capture_screen` | Capture full screen or active window |
| `transcribe_image` | Extract text from image via OCR |
| `list_screenshots` | List all saved screenshots |
| `get_screenshot` | Get screenshot metadata |
| `search_screenshots` | Search by description/tags |

### Example AI Agent Prompts

```
Render a Mermaid architecture diagram of our system and show it to me for review.

Preview this HTML email template and let me know if the layout looks correct.

Capture the current screen and open it for annotation.

Extract the text from this error screenshot.

Generate a code screenshot of this function with the Dracula theme.
```

---

## ⌨️ Keyboard Shortcuts

### Global
| Shortcut | Action |
|----------|--------|
| `Ctrl+Shift+S` | Capture screen |
| `Ctrl+Shift+1` | Capture full screen (tray) |
| `Ctrl+Shift+2` | Capture active window (tray) |
| `Ctrl+Shift+R` | Open review panel (tray) |

### Review Panel
| Key | Action |
|-----|--------|
| `V` | Select tool |
| `R` | Rectangle annotation |
| `A` | Arrow annotation |
| `T` | Text annotation |
| `B` | Blur region |
| `F` | Freehand drawing |
| `Ctrl+Z` | Undo last annotation |
| `Ctrl+Enter` | Approve |
| `Escape` | Cancel review / Close settings |

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────┐
│                      SnipWin v4.0                       │
├──────────────┐  Named Pipe  ┌───────────────────────────┤
│   CLI        │◄────────────►│  Electron Main Process     │
│   (Node.js)  │  \\.\pipe\   │  (Windows)                 │
│              │   snip-win   │  Unix Domain Socket        │
│   MCP Server │◄────────────►│  (Linux/macOS)             │
│   (stdio)    │              │  • desktopCapturer         │
└──────────────┘              │  • globalShortcut          │
                              │  • Tesseract OCR           │
                              │  • Settings store          │
                              └───────────┬───────────────┘
                                          │ IPC
                              ┌───────────┴───────────────┐
                              │  Renderer Process          │
                              │  • Fabric.js annotations   │
                              │  • Mermaid.js diagrams     │
                              │  • Highlight.js code       │
                              │  • HTML sandboxed preview  │
                              │  • 16 developer tools      │
                              │  • Theme switching         │
                              │  • Tab navigation          │
                              └───────────────────────────┘
```

---

## 🛠️ Tech Stack

| Technology | Purpose |
|------------|---------|
| **Electron 33** | Cross-platform desktop app framework |
| **Fabric.js 6** | Professional canvas annotation library |
| **Mermaid.js 11** | Diagram rendering from text |
| **Highlight.js 11** | Code syntax highlighting (15+ languages) |
| **Tesseract.js 5** | OCR text extraction |
| **Web Crypto API** | Hash generation (no external deps) |
| **Named Pipes / Unix Sockets** | Fast, native IPC |
| **MCP Protocol** | AI agent integration standard |

---

## 📁 Project Structure

```
snip-win/
├── src/
│   ├── main/
│   │   └── index.js          # Electron main process
│   ├── preload/
│   │   └── index.js          # Secure context bridge
│   ├── renderer/
│   │   ├── index.html        # Review panel UI
│   │   ├── index.js          # Core renderer logic
│   │   ├── v4-tools.js       # Developer tools logic
│   │   └── styles.css        # Glass morphism styling
│   ├── cli/
│   │   └── snip-win.js       # CLI (Windows/Linux/macOS)
│   └── mcp/
│       └── server.js         # MCP server for AI agents
├── scripts/
│   ├── install.ps1           # Windows one-liner installer
│   ├── install.sh            # Linux/macOS one-liner installer
│   └── setup.js              # AI CLI configuration wizard
├── config-templates/         # MCP configs for each AI tool
│   ├── opencode.json
│   ├── codex.json
│   ├── claude.json
│   ├── cursor.json
│   └── windsurf.json
├── build/
│   └── installer.nsh         # NSIS custom installer
├── package.json
├── electron-builder.yml
└── README.md
```

---

## 📦 Build Installer

### Windows (NSIS)
```bash
npm run build
```
Creates installer in `dist/`.

### Linux (AppImage)
Coming soon — track [#1](https://github.com/nirnimesz/snip-win/issues/1).

### macOS (DMG)
Coming soon — track [#2](https://github.com/nirnimesz/snip-win/issues/2).

---

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

---

## 📄 License

MIT — See [LICENSE](LICENSE) for details.

---

## ⭐ Star this repo if you find it useful!

[https://github.com/nirnimesz/snip-win](https://github.com/nirnimesz/snip-win)
