# SnipWin

**Visual communication layer between humans and AI agents — Windows Native**

AI agents generate visuals — Mermaid diagrams, HTML layouts, UI components. SnipWin bridges the gap: the agent renders something, it pops up on your screen, you review and annotate, and structured feedback returns to the agent.

## Features

- **Mermaid Diagram Rendering** — Render flowcharts, sequence diagrams, architecture diagrams
- **HTML Preview** — Preview HTML layouts, email templates, UI components
- **Image Review** — Open any image for annotation and review
- **Annotation Tools** — Rectangle, arrow, text, blur brush
- **Windows System Tray** — Always accessible from the taskbar
- **Named Pipe IPC** — Fast, native Windows inter-process communication
- **MCP Server** — Model Context Protocol support for AI agents
- **Screenshot Library** — Auto-save and organize all reviewed visuals

## Install

### From Source

```powershell
git clone https://github.com/your-org/snip-win.git
cd snip-win
npm install
npm start
```

### Build Installer

```powershell
npm run build
```

This creates an NSIS installer and portable executable in `dist/`.

## Usage

### Start the App

```powershell
npm start
```

SnipWin runs in the system tray. Click the tray icon to open the review panel.

### CLI

```powershell
# Render a Mermaid diagram
echo "graph TD; A[Client] --> B[API] --> C[Database]" | node src/cli/snip-win.js render --format mermaid --message "Architecture review"

# Preview HTML
echo "<h1>Hello World</h1>" | node src/cli/snip-win.js render --format html --message "Layout check"

# Open an image for review
node src/cli/snip-win.js open screenshot.png --message "Is this correct?"

# List saved screenshots
node src/cli/snip-win.js list

# Search screenshots
node src/cli/snip-win.js search "error dialog"
```

### MCP Server (for AI Agents)

Add to your OpenCode config (`opencode.json`):

```json
{
  "mcp": {
    "snip-win": {
      "type": "local",
      "command": ["node", "C:\\Users\\<user>\\Documents\\snip-win\\src\\mcp\\server.js"],
      "enabled": true
    }
  }
}
```

Available MCP tools:
- `render_diagram` — Render Mermaid diagram for review
- `render_html` — Render HTML content for review
- `open_in_snip` — Open image for annotation
- `list_screenshots` — List all saved screenshots
- `get_screenshot` — Get screenshot metadata
- `search_screenshots` — Search by description/tags

### Keyboard Shortcuts

| Key | Action |
|-----|--------|
| `V` | Select tool |
| `R` | Rectangle tool |
| `A` | Arrow tool |
| `T` | Text tool |
| `B` | Blur tool |
| `Ctrl+Z` | Undo |
| `Ctrl+Enter` | Approve |
| `Escape` | Cancel review |

## Architecture

```
┌─────────────┐     Named Pipe      ┌──────────────────┐
│   CLI / MCP │ ◄─────────────────► │  Electron Main   │
│  (Node.js)  │     \\.\\pipe\\      │  (index.js)      │
└─────────────┘     snip-win        └────────┬─────────┘
                                             │
                                     IPC     │
                                    ┌────────┴─────────┐
                                    │  Renderer Process │
                                    │  (Review Panel)   │
                                    │  + Annotations    │
                                    └──────────────────┘
```

## Tech Stack

- **Electron 33** — Cross-platform desktop app
- **Mermaid.js 11** — Diagram rendering
- **Canvas 2D** — Annotation tools
- **Windows Named Pipes** — IPC (replaces Unix sockets)
- **MCP Protocol** — AI agent integration

## License

MIT
