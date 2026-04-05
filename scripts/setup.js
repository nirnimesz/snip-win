#!/usr/bin/env node
/**
 * SnipWin Auto-Setup — Detect & Configure AI CLI Integrations
 *
 * Run: node scripts/setup.js
 *
 * Detects AI tools by checking for REAL installations:
 * - CLI binary in PATH
 * - npm global package
 * - Application directory
 * NOT config files (which we might have created ourselves).
 */

const fs = require('fs');
const path = require('path');
const os = require('os');
const { execSync } = require('child_process');

const HOME = os.homedir();
const SNIPWIN_MCP_PATH = path.join(__dirname, '..', 'src', 'mcp', 'server.js');

// ── Helpers ──
function snipWinMCP() {
  return { type: 'local', command: ['node', SNIPWIN_MCP_PATH], enabled: true };
}

function snipWinArgs() {
  return { command: 'node', args: [SNIPWIN_MCP_PATH] };
}

function snipWinCline() {
  return { command: 'node', args: [SNIPWIN_MCP_PATH], disabled: false, alwaysAllow: [] };
}

function readJSON(fp) {
  try { return JSON.parse(fs.readFileSync(fp, 'utf-8')); } catch { return {}; }
}

function writeJSON(fp, data) {
  const dir = path.dirname(fp);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(fp, JSON.stringify(data, null, 2));
}

function fileExists(p) { try { return fs.existsSync(p); } catch { return false; } }
function dirExists(p) { try { return fs.existsSync(p); } catch { return false; } }

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

function npmGlobalExists(pkg) {
  try {
    const root = execSync('npm root -g', { encoding: 'utf8' }).trim();
    return dirExists(path.join(root, pkg));
  } catch { return false; }
}

function getNpmBinPath(binName) {
  try {
    if (process.platform === 'win32') {
      const out = execSync(`where ${binName}`, { encoding: 'utf8' }).trim();
      return out.split('\n')[0] || null;
    } else {
      const out = execSync(`which ${binName}`, { encoding: 'utf8' }).trim();
      return out || null;
    }
  } catch { return null; }
}

// ── AI Tool Definitions ──
// Detection checks ONLY real installations, NOT config files we created
const AI_TOOLS = [
  {
    name: 'OpenCode',
    detect: () => {
      // Check CLI binary
      if (commandExists('opencode')) return { method: 'CLI', path: getNpmBinPath('opencode') };
      // Check npm global
      if (npmGlobalExists('opencode-ai')) return { method: 'npm', path: 'opencode-ai' };
      return null;
    },
    configure: () => {
      const configPath = path.join(HOME, '.opencode', 'config.json');
      const config = readJSON(configPath);
      if (!config.mcp) config.mcp = {};
      config.mcp['snip-win'] = snipWinMCP();
      writeJSON(configPath, config);
      return configPath;
    }
  },
  {
    name: 'ChatGPT Codex',
    detect: () => {
      if (commandExists('codex')) return { method: 'CLI', path: getNpmBinPath('codex') };
      if (npmGlobalExists('@openai/codex')) return { method: 'npm', path: '@openai/codex' };
      return null;
    },
    configure: () => {
      const configPath = path.join(HOME, '.codex', 'config.json');
      const config = readJSON(configPath);
      if (!config.mcpServers) config.mcpServers = {};
      config.mcpServers['snip-win'] = snipWinMCP();
      writeJSON(configPath, config);
      return configPath;
    }
  },
  {
    name: 'Claude Code',
    detect: () => {
      if (commandExists('claude')) return { method: 'CLI', path: getNpmBinPath('claude') };
      if (npmGlobalExists('@anthropic-ai/claude-code')) return { method: 'npm', path: '@anthropic-ai/claude-code' };
      if (npmGlobalExists('claudekit-cli')) return { method: 'npm', path: 'claudekit-cli' };
      return null;
    },
    configure: () => {
      const configPath = path.join(HOME, '.claude', 'settings.json');
      const config = readJSON(configPath);
      if (!config.mcpServers) config.mcpServers = {};
      config.mcpServers['snip-win'] = snipWinArgs();
      writeJSON(configPath, config);
      return configPath;
    }
  },
  {
    name: 'Cursor',
    detect: () => {
      // Windows app paths
      const winPaths = [
        path.join(HOME, 'AppData', 'Local', 'Programs', 'cursor'),
        path.join(HOME, 'AppData', 'Local', 'Programs', 'Cursor'),
        path.join('C:', 'Program Files', 'Cursor'),
        path.join('C:', 'Program Files (x86)', 'Cursor'),
      ];
      if (winPaths.some(dirExists)) return { method: 'app', path: winPaths.find(dirExists) };

      // macOS
      if (dirExists('/Applications/Cursor.app')) return { method: 'app', path: '/Applications/Cursor.app' };

      // Linux
      if (commandExists('cursor')) return { method: 'CLI', path: getNpmBinPath('cursor') };

      return null;
    },
    configure: () => {
      const configPath = path.join(HOME, '.cursor', 'mcp.json');
      const config = readJSON(configPath);
      if (!config.mcpServers) config.mcpServers = {};
      config.mcpServers['snip-win'] = snipWinArgs();
      writeJSON(configPath, config);
      return configPath;
    }
  },
  {
    name: 'Windsurf (Codeium)',
    detect: () => {
      const winPaths = [
        path.join(HOME, 'AppData', 'Local', 'Programs', 'Windsurf'),
        path.join('C:', 'Program Files', 'Windsurf'),
      ];
      if (winPaths.some(dirExists)) return { method: 'app', path: winPaths.find(dirExists) };
      if (dirExists('/Applications/Windsurf.app')) return { method: 'app', path: '/Applications/Windsurf.app' };
      if (commandExists('windsurf')) return { method: 'CLI', path: getNpmBinPath('windsurf') };
      return null;
    },
    configure: () => {
      const configPath = path.join(HOME, '.codeium', 'windsurf', 'mcp_config.json');
      const config = readJSON(configPath);
      if (!config.mcpServers) config.mcpServers = {};
      config.mcpServers['snip-win'] = snipWinArgs();
      writeJSON(configPath, config);
      return configPath;
    }
  },
  {
    name: 'Cline (VS Code Extension)',
    detect: () => {
      const vscodeExt = path.join(HOME, '.vscode', 'extensions');
      if (dirExists(vscodeExt)) {
        try {
          const exts = fs.readdirSync(vscodeExt);
          const cline = exts.find(e => e.includes('cline') || e.includes('claude-dev'));
          if (cline) return { method: 'vscode-ext', path: cline };
        } catch {}
      }
      return null;
    },
    configure: () => {
      const configPath = path.join(HOME, 'AppData', 'Roaming', 'Code', 'User', 'globalStorage', 'saoudrizwan.claude-dev', 'settings', 'cline_mcp_settings.json');
      const config = readJSON(configPath);
      if (!config.mcpServers) config.mcpServers = {};
      config.mcpServers['snip-win'] = snipWinCline();
      writeJSON(configPath, config);
      return configPath;
    }
  },
  {
    name: 'Continue (VS Code / JetBrains)',
    detect: () => {
      const vscodeExt = path.join(HOME, '.vscode', 'extensions');
      if (dirExists(vscodeExt)) {
        try {
          const exts = fs.readdirSync(vscodeExt);
          if (exts.some(e => e.includes('continue'))) return { method: 'vscode-ext', path: exts.find(e => e.includes('continue')) };
        } catch {}
      }
      if (npmGlobalExists('continue')) return { method: 'npm', path: 'continue' };
      return null;
    },
    configure: () => {
      const configPath = path.join(HOME, '.continue', 'config.json');
      const config = readJSON(configPath);
      if (!config.mcpServers) config.mcpServers = [];
      if (!config.mcpServers.some(s => s.name === 'snip-win')) {
        config.mcpServers.push({ name: 'snip-win', command: 'node', args: [SNIPWIN_MCP_PATH] });
      }
      writeJSON(configPath, config);
      return configPath;
    }
  },
  {
    name: 'Roo Code (VS Code Extension)',
    detect: () => {
      const vscodeExt = path.join(HOME, '.vscode', 'extensions');
      if (dirExists(vscodeExt)) {
        try {
          const exts = fs.readdirSync(vscodeExt);
          const roo = exts.find(e => e.includes('roo') || e.includes('roo-cline'));
          if (roo) return { method: 'vscode-ext', path: roo };
        } catch {}
      }
      return null;
    },
    configure: () => {
      const configPath = path.join(HOME, '.roo', 'mcp.json');
      const config = readJSON(configPath);
      if (!config.mcpServers) config.mcpServers = {};
      config.mcpServers['snip-win'] = snipWinArgs();
      writeJSON(configPath, config);
      return configPath;
    }
  },
  {
    name: 'Aider (CLI)',
    detect: () => {
      if (commandExists('aider')) return { method: 'CLI', path: getNpmBinPath('aider') };
      if (commandExists('aider-chat')) return { method: 'CLI', path: getNpmBinPath('aider-chat') };
      // Check pip global (Python)
      try {
        const pipOut = execSync('pip show aider-chat 2>nul || pip3 show aider-chat 2>nul', { encoding: 'utf8' });
        if (pipOut.includes('Name:')) return { method: 'pip', path: 'aider-chat' };
      } catch {}
      return null;
    },
    configure: () => {
      const notePath = path.join(HOME, '.aider', 'snip-win-mcp.txt');
      const note = `To use SnipWin with Aider, add this to your .aider.conf.yml:\n\nmcp:\n  - command: node\n    args: ["${SNIPWIN_MCP_PATH}"]\n`;
      const dir = path.dirname(notePath);
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
      fs.writeFileSync(notePath, note);
      return notePath;
    }
  },
  {
    name: 'Antigravity (Claude Proxy)',
    detect: () => {
      if (npmGlobalExists('antigravity-claude-proxy')) return { method: 'npm', path: 'antigravity-claude-proxy' };
      if (commandExists('antigravity')) return { method: 'CLI', path: getNpmBinPath('antigravity') };
      return null;
    },
    configure: () => {
      // Antigravity is a proxy, not an MCP client — create a note
      const notePath = path.join(HOME, '.antigravity', 'snip-win-mcp.txt');
      const note = `SnipWin MCP server is available at:\n${SNIPWIN_MCP_PATH}\n\nTo use with Antigravity, configure the MCP server in your Claude proxy settings.\n`;
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
console.log('  Scanning for installed AI tools...\n');

const results = [];

AI_TOOLS.forEach(tool => {
  const detected = tool.detect();
  if (detected) {
    try {
      const writtenPath = tool.configure();
      results.push({ name: tool.name, status: 'configured', method: detected.method, path: writtenPath });
    } catch (e) {
      results.push({ name: tool.name, status: 'error', error: e.message });
    }
  } else {
    results.push({ name: tool.name, status: 'not-found' });
  }
});

// ── Results ──
const configured = results.filter(r => r.status === 'configured');
const errors = results.filter(r => r.status === 'error');
const notFound = results.filter(r => r.status === 'not-found');

if (configured.length > 0) {
  console.log('  ═══════════════════════════════════════════');
  console.log('  ✓ Configured MCP for:');
  console.log('  ═══════════════════════════════════════════');
  configured.forEach(r => {
    console.log(`    ✓ ${r.name}  (detected via ${r.method})`);
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

console.log('  ═══════════════════════════════════════════');
console.log(`  Summary: ${configured.length} configured, ${errors.length} errors, ${notFound.length} not found`);
console.log('  ═══════════════════════════════════════════');
console.log('');
console.log('  Next steps:');
console.log('  1. Start SnipWin: npm start');
console.log('  2. Restart your AI tools to pick up MCP');
console.log('  3. Try: "Render a Mermaid diagram"');
console.log('');
