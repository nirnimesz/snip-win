#!/usr/bin/env node
/**
 * SnipWin Auto-Setup — Detect & Configure AI CLI Integrations
 *
 * Run: node scripts/setup.js
 *
 * Automatically detects installed AI tools and configures SnipWin MCP server.
 * No prompts — detects, configures, reports.
 */

const fs = require('fs');
const path = require('path');
const os = require('os');
const { execSync } = require('child_process');

const HOME = os.homedir();
const SNIPWIN_MCP_PATH = path.join(__dirname, '..', 'src', 'mcp', 'server.js');

function snipWinMCP() {
  return {
    type: 'local',
    command: ['node', SNIPWIN_MCP_PATH],
    enabled: true
  };
}

function snipWinArgs() {
  return {
    command: 'node',
    args: [SNIPWIN_MCP_PATH]
  };
}

function snipWinCline() {
  return {
    command: 'node',
    args: [SNIPWIN_MCP_PATH],
    disabled: false,
    alwaysAllow: []
  };
}

function readJSON(filepath) {
  try { return JSON.parse(fs.readFileSync(filepath, 'utf-8')); } catch (e) { return {}; }
}

function writeJSON(filepath, data) {
  const dir = path.dirname(filepath);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(filepath, JSON.stringify(data, null, 2));
}

function fileExists(p) { try { return fs.existsSync(p); } catch { return false; } }

function commandExists(cmd) {
  try {
    if (process.platform === 'win32') {
      execSync(`where ${cmd}`, { stdio: 'ignore' });
    } else {
      execSync(`which ${cmd}`, { stdio: 'ignore' });
    }
    return true;
  } catch { return false; }
}

function dirExists(p) { try { return fs.existsSync(p); } catch { return false; } }

// ── AI Tool Definitions ──
// Each tool has multiple detection methods for reliability
const AI_TOOLS = [
  {
    name: 'OpenCode',
    icon: '◆',
    detect: () => {
      const configs = [
        path.join(HOME, '.opencode', 'config.json'),
        path.join(process.cwd(), 'opencode.json'),
      ];
      if (configs.find(fileExists)) return configs.find(fileExists);
      if (commandExists('opencode')) return 'command:opencode';
      if (dirExists(path.join(HOME, '.opencode'))) return 'dir:.opencode';
      return null;
    },
    configure: (configPath) => {
      // If detected by command/dir but no config, create one
      if (!configPath.startsWith(HOME) && !configPath.includes('opencode.json')) {
        configPath = path.join(HOME, '.opencode', 'config.json');
      }
      const config = readJSON(configPath);
      if (!config.mcp) config.mcp = {};
      config.mcp['snip-win'] = snipWinMCP();
      writeJSON(configPath, config);
      return configPath;
    }
  },
  {
    name: 'ChatGPT Codex',
    icon: '◆',
    detect: () => {
      const p = path.join(HOME, '.codex', 'config.json');
      if (fileExists(p)) return p;
      if (commandExists('codex')) return 'command:codex';
      if (dirExists(path.join(HOME, '.codex'))) return 'dir:.codex';
      return null;
    },
    configure: (configPath) => {
      if (!configPath.includes('config.json')) configPath = path.join(HOME, '.codex', 'config.json');
      const config = readJSON(configPath);
      if (!config.mcpServers) config.mcpServers = {};
      config.mcpServers['snip-win'] = snipWinMCP();
      writeJSON(configPath, config);
      return configPath;
    }
  },
  {
    name: 'Claude Code',
    icon: '◆',
    detect: () => {
      const p = path.join(HOME, '.claude', 'settings.json');
      if (fileExists(p)) return p;
      if (commandExists('claude')) return 'command:claude';
      if (dirExists(path.join(HOME, '.claude'))) return 'dir:.claude';
      // Check npm global
      try {
        const globalPrefix = execSync('npm root -g', { encoding: 'utf8' }).trim();
        if (fileExists(path.join(globalPrefix, '@anthropic-ai', 'claude-code'))) return 'npm:@anthropic-ai/claude-code';
      } catch {}
      return null;
    },
    configure: (configPath) => {
      if (!configPath.includes('settings.json')) configPath = path.join(HOME, '.claude', 'settings.json');
      const config = readJSON(configPath);
      if (!config.mcpServers) config.mcpServers = {};
      config.mcpServers['snip-win'] = snipWinArgs();
      writeJSON(configPath, config);
      return configPath;
    }
  },
  {
    name: 'Cursor',
    icon: '◆',
    detect: () => {
      const p = path.join(HOME, '.cursor', 'mcp.json');
      if (fileExists(p)) return p;
      if (dirExists(path.join(HOME, '.cursor'))) return 'dir:.cursor';
      // Check if Cursor app is installed
      const cursorPaths = [
        path.join(HOME, 'AppData', 'Local', 'Programs', 'Cursor'),
        path.join(HOME, 'Applications', 'Cursor.app'),
        '/Applications/Cursor.app',
      ];
      if (cursorPaths.some(dirExists)) return 'app:Cursor';
      return null;
    },
    configure: (configPath) => {
      if (!configPath.includes('mcp.json')) configPath = path.join(HOME, '.cursor', 'mcp.json');
      const config = readJSON(configPath);
      if (!config.mcpServers) config.mcpServers = {};
      config.mcpServers['snip-win'] = snipWinArgs();
      writeJSON(configPath, config);
      return configPath;
    }
  },
  {
    name: 'Windsurf (Codeium)',
    icon: '◆',
    detect: () => {
      const p = path.join(HOME, '.codeium', 'windsurf', 'mcp_config.json');
      if (fileExists(p)) return p;
      if (dirExists(path.join(HOME, '.codeium'))) return 'dir:.codeium';
      return null;
    },
    configure: (configPath) => {
      if (!configPath.includes('mcp_config.json')) configPath = path.join(HOME, '.codeium', 'windsurf', 'mcp_config.json');
      const config = readJSON(configPath);
      if (!config.mcpServers) config.mcpServers = {};
      config.mcpServers['snip-win'] = snipWinArgs();
      writeJSON(configPath, config);
      return configPath;
    }
  },
  {
    name: 'Cline (VS Code)',
    icon: '◆',
    detect: () => {
      const p = path.join(HOME, 'AppData', 'Roaming', 'Code', 'User', 'globalStorage', 'saoudrizwan.claude-dev', 'settings', 'cline_mcp_settings.json');
      if (fileExists(p)) return p;
      // Check if VS Code + Cline extension installed
      const vscodeExt = path.join(HOME, '.vscode', 'extensions');
      if (dirExists(vscodeExt)) {
        try {
          const exts = fs.readdirSync(vscodeExt);
          if (exts.some(e => e.includes('cline') || e.includes('claude-dev'))) return 'vscode:cline';
        } catch {}
      }
      return null;
    },
    configure: (configPath) => {
      if (!configPath.includes('cline_mcp_settings.json')) {
        configPath = path.join(HOME, 'AppData', 'Roaming', 'Code', 'User', 'globalStorage', 'saoudrizwan.claude-dev', 'settings', 'cline_mcp_settings.json');
      }
      const config = readJSON(configPath);
      if (!config.mcpServers) config.mcpServers = {};
      config.mcpServers['snip-win'] = snipWinCline();
      writeJSON(configPath, config);
      return configPath;
    }
  },
  {
    name: 'Continue (VS Code / JetBrains)',
    icon: '◆',
    detect: () => {
      const p = path.join(HOME, '.continue', 'config.json');
      if (fileExists(p)) return p;
      if (dirExists(path.join(HOME, '.continue'))) return 'dir:.continue';
      return null;
    },
    configure: (configPath) => {
      if (!configPath.includes('config.json')) configPath = path.join(HOME, '.continue', 'config.json');
      const config = readJSON(configPath);
      if (!config.mcpServers) config.mcpServers = [];
      if (!config.mcpServers.some(s => s.name === 'snip-win')) {
        config.mcpServers.push({
          name: 'snip-win',
          command: 'node',
          args: [SNIPWIN_MCP_PATH]
        });
      }
      writeJSON(configPath, config);
      return configPath;
    }
  },
  {
    name: 'Roo Code (VS Code)',
    icon: '◆',
    detect: () => {
      const p = path.join(HOME, '.roo', 'mcp.json');
      if (fileExists(p)) return p;
      if (dirExists(path.join(HOME, '.roo'))) return 'dir:.roo';
      return null;
    },
    configure: (configPath) => {
      if (!configPath.includes('mcp.json')) configPath = path.join(HOME, '.roo', 'mcp.json');
      const config = readJSON(configPath);
      if (!config.mcpServers) config.mcpServers = {};
      config.mcpServers['snip-win'] = snipWinArgs();
      writeJSON(configPath, config);
      return configPath;
    }
  },
  {
    name: 'Aider (CLI)',
    icon: '◆',
    detect: () => {
      if (commandExists('aider')) return 'command:aider';
      const p = path.join(HOME, '.aider');
      if (dirExists(p)) return 'dir:.aider';
      return null;
    },
    configure: () => {
      // Aider uses .aider.conf.yml — we create a note file
      const notePath = path.join(HOME, '.aider', 'snip-win-mcp.txt');
      const note = `To use SnipWin with Aider, add this to your .aider.conf.yml:\n\nmcp:\n  - command: node\n    args: ["${SNIPWIN_MCP_PATH}"]\n`;
      const dir = path.dirname(notePath);
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
      fs.writeFileSync(notePath, note);
      return notePath;
    }
  }
];

// ── Main ──
console.log('');
console.log('  ╔══════════════════════════════════════════╗');
console.log('  ║     SnipWin — AI Integration Setup      ║');
console.log('  ║     Auto-detect & auto-configure        ║');
console.log('  ╚══════════════════════════════════════════╝');
console.log('');

console.log('  Scanning for AI tools...\n');

const results = [];

AI_TOOLS.forEach(tool => {
  const configPath = tool.detect();
  if (configPath) {
    try {
      const writtenPath = tool.configure(configPath);
      results.push({ name: tool.name, status: 'configured', path: writtenPath });
    } catch (e) {
      results.push({ name: tool.name, status: 'error', error: e.message });
    }
  } else {
    results.push({ name: tool.name, status: 'not-found' });
  }
});

// ── Results Summary ──
const configured = results.filter(r => r.status === 'configured');
const errors = results.filter(r => r.status === 'error');
const notFound = results.filter(r => r.status === 'not-found');

if (configured.length > 0) {
  console.log('  ═══════════════════════════════════════════');
  console.log('  ✓ Configured MCP for:');
  console.log('  ═══════════════════════════════════════════');
  configured.forEach(r => {
    console.log(`    ✓ ${r.name}`);
    console.log(`      → ${r.path}`);
  });
  console.log('');
}

if (errors.length > 0) {
  console.log('  ═══════════════════════════════════════════');
  console.log('  ✗ Errors:');
  console.log('  ═══════════════════════════════════════════');
  errors.forEach(r => {
    console.log(`    ✗ ${r.name}: ${r.error}`);
  });
  console.log('');
}

if (notFound.length > 0) {
  console.log('  ═══════════════════════════════════════════');
  console.log('  ○ Not detected (install to enable):');
  console.log('  ═══════════════════════════════════════════');
  notFound.forEach(r => {
    console.log(`    ○ ${r.name}`);
  });
  console.log('');
}

// ── Final Summary ──
console.log('  ═══════════════════════════════════════════');
console.log(`  Summary: ${configured.length} configured, ${errors.length} errors, ${notFound.length} not found`);
console.log('  ═══════════════════════════════════════════');
console.log('');
console.log('  Next steps:');
console.log('  1. Start SnipWin: npm start');
console.log('  2. Restart your AI tools to pick up MCP');
console.log('  3. Try: "Render a Mermaid diagram"');
console.log('');
