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
 * Then writes MCP config in the CORRECT format for each tool.
 */

const fs = require('fs');
const path = require('path');
const os = require('os');
const { execSync } = require('child_process');

const HOME = os.homedir();
const SNIPWIN_MCP_PATH = path.join(__dirname, '..', 'src', 'mcp', 'server.js');
const NODE_EXE = process.execPath; // Full path to node.exe

// ── Helpers ──
function readJSON(fp) {
  try { return JSON.parse(fs.readFileSync(fp, 'utf-8')); } catch { return {}; }
}

function writeJSON(fp, data) {
  const dir = path.dirname(fp);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(fp, JSON.stringify(data, null, 2));
}

function appendTOML(fp, section, config) {
  const dir = path.dirname(fp);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  let content = fs.existsSync(fp) ? fs.readFileSync(fp, 'utf-8') : '';

  const sectionHeader = `[${section}]`;
  if (content.includes(sectionHeader)) return false;

  let toml = `\n[${section}]\n`;
  toml += `type = "local"\n`;
  toml += `command = "${NODE_EXE.replace(/\\/g, '\\\\')}"\n`;
  toml += `args = ["${SNIPWIN_MCP_PATH.replace(/\\/g, '\\\\')}"]\n`;
  toml += `startup_timeout_sec = 60\n`;
  toml += `tool_timeout_sec = 120\n`;

  content += toml;
  fs.writeFileSync(fp, content);
  return true;
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
      return execSync(`which ${binName}`, { encoding: 'utf8' }).trim() || null;
    }
  } catch { return null; }
}

// ── AI Tool Definitions ──
const AI_TOOLS = [
  {
    name: 'OpenCode',
    detect: () => {
      if (commandExists('opencode')) return { method: 'CLI', path: getNpmBinPath('opencode') };
      if (npmGlobalExists('opencode-ai')) return { method: 'npm', path: 'opencode-ai' };
      return null;
    },
    configure: () => {
      const configPath = path.join(HOME, '.opencode', 'config.json');
      const config = readJSON(configPath);
      if (!config.mcp) config.mcp = {};
      if (config.mcp['snip-win']) return { path: configPath, skipped: true };
      config.mcp['snip-win'] = {
        type: 'local',
        command: [NODE_EXE, SNIPWIN_MCP_PATH],
        enabled: true
      };
      writeJSON(configPath, config);
      return { path: configPath };
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
      // Codex uses config.toml, NOT config.json
      const configPath = path.join(HOME, '.codex', 'config.toml');
      const added = appendTOML(configPath, 'mcp_servers.snip-win', {});
      if (!added) return { path: configPath, skipped: true };
      return { path: configPath };
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
      if (config.mcpServers['snip-win']) return { path: configPath, skipped: true };
      config.mcpServers['snip-win'] = {
        command: NODE_EXE,
        args: [SNIPWIN_MCP_PATH]
      };
      writeJSON(configPath, config);
      return { path: configPath };
    }
  },
  {
    name: 'Cursor',
    detect: () => {
      const winPaths = [
        path.join(HOME, 'AppData', 'Local', 'Programs', 'cursor'),
        path.join(HOME, 'AppData', 'Local', 'Programs', 'Cursor'),
        path.join('C:', 'Program Files', 'Cursor'),
        path.join('C:', 'Program Files (x86)', 'Cursor'),
        path.join(HOME, 'scoop', 'apps', 'cursor'),
      ];
      const found = winPaths.find(dirExists);
      if (found) return { method: 'app', path: found };
      if (dirExists('/Applications/Cursor.app')) return { method: 'app', path: '/Applications/Cursor.app' };
      if (commandExists('cursor')) return { method: 'CLI', path: getNpmBinPath('cursor') };
      return null;
    },
    configure: () => {
      const configPath = path.join(HOME, '.cursor', 'mcp.json');
      const config = readJSON(configPath);
      if (!config.mcpServers) config.mcpServers = {};
      if (config.mcpServers['snip-win']) return { path: configPath, skipped: true };
      config.mcpServers['snip-win'] = {
        command: NODE_EXE,
        args: [SNIPWIN_MCP_PATH]
      };
      writeJSON(configPath, config);
      return { path: configPath };
    }
  },
  {
    name: 'Windsurf (Codeium)',
    detect: () => {
      const winPaths = [
        path.join(HOME, 'AppData', 'Local', 'Programs', 'Windsurf'),
        path.join('C:', 'Program Files', 'Windsurf'),
      ];
      const found = winPaths.find(dirExists);
      if (found) return { method: 'app', path: found };
      if (dirExists('/Applications/Windsurf.app')) return { method: 'app', path: '/Applications/Windsurf.app' };
      if (commandExists('windsurf')) return { method: 'CLI', path: getNpmBinPath('windsurf') };
      return null;
    },
    configure: () => {
      const configPath = path.join(HOME, '.codeium', 'windsurf', 'mcp_config.json');
      const config = readJSON(configPath);
      if (!config.mcpServers) config.mcpServers = {};
      if (config.mcpServers['snip-win']) return { path: configPath, skipped: true };
      config.mcpServers['snip-win'] = {
        command: NODE_EXE,
        args: [SNIPWIN_MCP_PATH]
      };
      writeJSON(configPath, config);
      return { path: configPath };
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
      if (config.mcpServers['snip-win']) return { path: configPath, skipped: true };
      config.mcpServers['snip-win'] = {
        command: NODE_EXE,
        args: [SNIPWIN_MCP_PATH],
        disabled: false,
        alwaysAllow: []
      };
      writeJSON(configPath, config);
      return { path: configPath };
    }
  },
  {
    name: 'Continue (VS Code / JetBrains)',
    detect: () => {
      const vscodeExt = path.join(HOME, '.vscode', 'extensions');
      if (dirExists(vscodeExt)) {
        try {
          const exts = fs.readdirSync(vscodeExt);
          const cont = exts.find(e => e.includes('continue'));
          if (cont) return { method: 'vscode-ext', path: cont };
        } catch {}
      }
      if (npmGlobalExists('continue')) return { method: 'npm', path: 'continue' };
      return null;
    },
    configure: () => {
      const configPath = path.join(HOME, '.continue', 'config.json');
      const config = readJSON(configPath);
      if (!config.mcpServers) config.mcpServers = [];
      if (config.mcpServers.some(s => s.name === 'snip-win')) return { path: configPath, skipped: true };
      config.mcpServers.push({
        name: 'snip-win',
        command: NODE_EXE,
        args: [SNIPWIN_MCP_PATH]
      });
      writeJSON(configPath, config);
      return { path: configPath };
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
      if (config.mcpServers['snip-win']) return { path: configPath, skipped: true };
      config.mcpServers['snip-win'] = {
        command: NODE_EXE,
        args: [SNIPWIN_MCP_PATH]
      };
      writeJSON(configPath, config);
      return { path: configPath };
    }
  },
  {
    name: 'Aider (CLI)',
    detect: () => {
      if (commandExists('aider')) return { method: 'CLI', path: getNpmBinPath('aider') };
      if (commandExists('aider-chat')) return { method: 'CLI', path: getNpmBinPath('aider-chat') };
      try {
        const pipOut = execSync('pip show aider-chat 2>nul || pip3 show aider-chat 2>nul', { encoding: 'utf8' });
        if (pipOut.includes('Name:')) return { method: 'pip', path: 'aider-chat' };
      } catch {}
      return null;
    },
    configure: () => {
      const configPath = path.join(HOME, '.aider', 'aider.conf.yml');
      let content = fs.existsSync(configPath) ? fs.readFileSync(configPath, 'utf-8') : '';
      if (content.includes('snip-win')) return { path: configPath, skipped: true };
      const mcpBlock = `\n# SnipWin MCP Server\nmcp:\n  - command: "${NODE_EXE}"\n    args: ["${SNIPWIN_MCP_PATH}"]\n`;
      content += mcpBlock;
      const dir = path.dirname(configPath);
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
      fs.writeFileSync(configPath, content);
      return { path: configPath };
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
      const configResult = tool.configure();
      if (configResult.skipped) {
        results.push({ name: tool.name, status: 'already-configured', method: detected.method, path: configResult.path });
      } else {
        results.push({ name: tool.name, status: 'configured', method: detected.method, path: configResult.path });
      }
    } catch (e) {
      results.push({ name: tool.name, status: 'error', error: e.message });
    }
  } else {
    results.push({ name: tool.name, status: 'not-found' });
  }
});

// ── Results ──
const configured = results.filter(r => r.status === 'configured');
const alreadyConfigured = results.filter(r => r.status === 'already-configured');
const errors = results.filter(r => r.status === 'error');
const notFound = results.filter(r => r.status === 'not-found');

if (configured.length > 0) {
  console.log('  ═══════════════════════════════════════════');
  console.log('  ✓ MCP configured for:');
  console.log('  ═══════════════════════════════════════════');
  configured.forEach(r => {
    console.log(`    ✓ ${r.name}  (detected via ${r.method})`);
    console.log(`      → ${r.path}`);
  });
  console.log('');
}

if (alreadyConfigured.length > 0) {
  console.log('  ═══════════════════════════════════════════');
  console.log('  ○ Already configured (skipped):');
  console.log('  ═══════════════════════════════════════════');
  alreadyConfigured.forEach(r => {
    console.log(`    ○ ${r.name}  (detected via ${r.method})`);
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

const total = configured.length + alreadyConfigured.length;
console.log('  ═══════════════════════════════════════════');
console.log(`  Summary: ${total} configured, ${errors.length} errors, ${notFound.length} not found`);
console.log('  ═══════════════════════════════════════════');
console.log('');
console.log('  Next steps:');
console.log('  1. Start SnipWin: npm start');
console.log('  2. Restart your AI tools to pick up MCP');
console.log('  3. Try: "Render a Mermaid diagram"');
console.log('');
