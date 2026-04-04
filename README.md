# SnipWin

> **Visual communication layer between humans and AI agents — Windows Native**

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)
[![Node.js](https://img.shields.io/badge/Node.js-18+-green.svg)](https://nodejs.org/)
[![Electron](https://img.shields.io/badge/Electron-33-47848F.svg)](https://www.electronjs.org/)
[![GitHub Stars](https://img.shields.io/github/stars/nirnimesz/snip-win?style=social)](https://github.com/nirnimesz/snip-win)

AI agents generate visuals — Mermaid diagrams, HTML layouts, UI components. SnipWin bridges the gap: the agent renders something, it pops up on your screen, you review and annotate, and structured feedback returns to the agent.

---

## 🚀 Quick Install

### Option 1: One-Liner (Recommended)

```powershell
irm https://raw.githubusercontent.com/nirnimesz/snip-win/main/scripts/install.ps1 | iex
```

### Option 2: npm Global

```powershell
npm install -g nirnimesz/snip-win
```

### Option 3: From Source

```powershell
git clone https://github.com/nirnimesz/snip-win.git
cd snip-win
npm install
npm start
```

---

## ✨ Features

| Feature | Description |
|---------|-------------|
| 🎨 **Mermaid Diagrams** | Render flowcharts, sequence diagrams, architecture diagrams |
| 🌐 **HTML Preview** | Preview HTML layouts, email templates, UI components in sandboxed iframe |
| 🖼️ **Image Review** | Open any image for annotation and review |
| ✏️ **Fabric.js Annotations** | Rectangle, arrow, text, blur, freehand drawing tools |
| 📸 **Screen Capture** | Capture full screen or active window directly |
| 🔤 **OCR Text Extraction** | Extract text from images via Tesseract.js |
| 🌗 **Dark/Light Themes** | Smooth theme transitions with customizable annotation colors |
| 📁 **Screenshot Library** | Auto-save and organize all reviewed visuals |
| 🔧 **Settings Panel** | Configure theme, colors, hotkeys, and screenshot quality |
| 🪟 **Windows System Tray** | Always accessible from the taskbar with quick actions |
| 🔌 **MCP Server** | Model Context Protocol support for 6+ AI tools |
| ⌨️ **Keyboard Shortcuts** | Global hotkey for screen capture, annotation shortcuts |

---

## 📸 Screenshots

### Review Panel
The agent renders a Mermaid diagram → it pops up on your screen → you annotate and approve.

### Annotation Tools
Rectangle highlights, arrows, text labels, blur regions, and freehand drawing — powered by Fabric.js.

### Screen Capture
One-click capture of full screen or active window, copied to clipboard and saved automatically.

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

```powershell
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
      "command": ["node", "C:\\Users\\<YOU>\\Documents\\snip-win\\src\\mcp\\server.js"],
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
      "args": ["C:\\Users\\<YOU>\\Documents\\snip-win\\src\\mcp\\server.js"]
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
      "args": ["C:\\Users\\<YOU>\\Documents\\snip-win\\src\\mcp\\server.js"]
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
      "args": ["C:\\Users\\<YOU>\\Documents\\snip-win\\src\\mcp\\server.js"]
    }
  }
}
```

---

## 📖 Usage

### Start the App

```powershell
npm start
```

SnipWin runs in the system tray. Click the tray icon to open the review panel.

### CLI Commands

```powershell
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
│                      SnipWin v2.0                       │
├──────────────┐  Named Pipe  ┌───────────────────────────┤
│   CLI        │◄────────────►│  Electron Main Process     │
│   (Node.js)  │  \\.\pipe\   │  • desktopCapturer         │
│              │   snip-win   │  • globalShortcut          │
│   MCP Server │◄────────────►│  • Tesseract OCR           │
│   (stdio)    │              │  • Settings store          │
└──────────────┘              │  • Named Pipe IPC          │
                              └───────────┬───────────────┘
                                          │ IPC
                              ┌───────────┴───────────────┐
                              │  Renderer Process          │
                              │  • Fabric.js annotations   │
                              │  • Mermaid.js diagrams     │
                              │  • HTML sandboxed preview  │
                              │  • Theme switching         │
                              │  • Tab navigation          │
                              │  • Settings modal          │
                              └───────────────────────────┘
```

---

## 🛠️ Tech Stack

| Technology | Purpose |
|------------|---------|
| **Electron 33** | Cross-platform desktop app framework |
| **Fabric.js 6** | Professional canvas annotation library |
| **Mermaid.js 11** | Diagram rendering from text |
| **Tesseract.js 5** | OCR text extraction |
| **Windows Named Pipes** | Fast, native IPC (replaces Unix sockets) |
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
│   │   ├── index.js          # Fabric.js + UI logic
│   │   └── styles.css        # Glass morphism styling
│   ├── cli/
│   │   └── snip-win.js       # Windows CLI
│   └── mcp/
│       └── server.js         # MCP server for AI agents
├── scripts/
│   ├── install.ps1           # One-line installer
│   └── setup.js              # AI CLI configuration wizard
├── config-templates/         # Config templates for each AI tool
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

```powershell
npm run build
```

This creates an NSIS installer and portable executable in `dist/`.

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
