#!/usr/bin/env node
/**
 * SnipWin Setup — Configure AI CLI integrations
 *
 * Run: node scripts/setup.js
 *
 * Detects installed AI tools and offers to configure MCP servers.
 */

const fs = require('fs');
const path = require('path');
const os = require('os');
const { execSync } = require('child_process');

const SNIPWIN_MCP = {
  type: 'local',
  command: ['node', path.join(__dirname, '..', 'src', 'mcp', 'server.js')],
  enabled: true
};

const AI_TOOLS = [
  {
    name: 'OpenCode',
    id: 'opencode',
    detect: () => {
      const configs = [
        path.join(os.homedir(), '.opencode', 'config.json'),
        path.join(process.cwd(), 'opencode.json')
      ];
      return configs.find(c => fs.existsSync(c));
    },
    configure: (configPath) => {
      const config = readJSON(configPath);
      if (!config.mcp) config.mcp = {};
      config.mcp['snip-win'] = SNIPWIN_MCP;
      writeJSON(configPath, config);
      return configPath;
    }
  },
  {
    name: 'Claude Code (Anthropic)',
    id: 'claude',
    detect: () => {
      const p = path.join(os.homedir(), '.claude', 'settings.json');
      return fs.existsSync(p) ? p : null;
    },
    configure: (configPath) => {
      const config = readJSON(configPath);
      if (!config.env) config.env = {};
      // Claude Code uses CLAUDE_CODE_MCP_SERVERS env or mcpServers in settings
      if (!config.mcpServers) config.mcpServers = {};
      config.mcpServers['snip-win'] = {
        command: 'node',
        args: [path.join(__dirname, '..', 'src', 'mcp', 'server.js')]
      };
      writeJSON(configPath, config);
      return configPath;
    }
  },
  {
    name: 'ChatGPT Codex (OpenAI)',
    id: 'codex',
    detect: () => {
      const p = path.join(os.homedir(), '.codex', 'config.json');
      return fs.existsSync(p) ? p : null;
    },
    configure: (configPath) => {
      const config = readJSON(configPath);
      if (!config.mcpServers) config.mcpServers = {};
      config.mcpServers['snip-win'] = SNIPWIN_MCP;
      writeJSON(configPath, config);
      return configPath;
    }
  },
  {
    name: 'Cursor',
    id: 'cursor',
    detect: () => {
      const p = path.join(os.homedir(), '.cursor', 'mcp.json');
      return fs.existsSync(p) ? p : null;
    },
    configure: (configPath) => {
      const config = readJSON(configPath);
      if (!config.mcpServers) config.mcpServers = {};
      config.mcpServers['snip-win'] = {
        command: 'node',
        args: [path.join(__dirname, '..', 'src', 'mcp', 'server.js')]
      };
      writeJSON(configPath, config);
      return configPath;
    }
  },
  {
    name: 'Windsurf (Codeium)',
    id: 'windsurf',
    detect: () => {
      const p = path.join(os.homedir(), '.codeium', 'windsurf', 'mcp_config.json');
      return fs.existsSync(p) ? p : null;
    },
    configure: (configPath) => {
      const config = readJSON(configPath);
      if (!config.mcpServers) config.mcpServers = {};
      config.mcpServers['snip-win'] = {
        command: 'node',
        args: [path.join(__dirname, '..', 'src', 'mcp', 'server.js')]
      };
      writeJSON(configPath, config);
      return configPath;
    }
  },
  {
    name: 'Cline (VS Code)',
    id: 'cline',
    detect: () => {
      const p = path.join(os.homedir(), 'AppData', 'Roaming', 'Code', 'User', 'globalStorage', 'saoudrizwan.claude-dev', 'settings', 'cline_mcp_settings.json');
      return fs.existsSync(p) ? p : null;
    },
    configure: (configPath) => {
      const config = readJSON(configPath);
      if (!config.mcpServers) config.mcpServers = {};
      config.mcpServers['snip-win'] = {
        command: 'node',
        args: [path.join(__dirname, '..', 'src', 'mcp', 'server.js')],
        disabled: false,
        alwaysAllow: []
      };
      writeJSON(configPath, config);
      return configPath;
    }
  }
];

function readJSON(filepath) {
  try {
    return JSON.parse(fs.readFileSync(filepath, 'utf-8'));
  } catch (e) {
    return {};
  }
}

function writeJSON(filepath, data) {
  const dir = path.dirname(filepath);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(filepath, JSON.stringify(data, null, 2));
}

// ── Main ──
console.log('');
console.log('  ╔══════════════════════════════════════╗');
console.log('  ║     SnipWin — AI CLI Setup v2.0     ║');
console.log('  ╚══════════════════════════════════════╝');
console.log('');

// Detect installed tools
const installed = AI_TOOLS.filter(tool => tool.detect());
const notInstalled = AI_TOOLS.filter(tool => !tool.detect());

if (installed.length > 0) {
  console.log('  Detected AI Tools:');
  console.log('  ──────────────────');
  installed.forEach(tool => {
    console.log(`  ✓ ${tool.name}  (${tool.detect()})`);
  });
}

if (notInstalled.length > 0) {
  console.log('');
  console.log('  Not Detected:');
  console.log('  ─────────────');
  notInstalled.forEach(tool => {
    console.log(`  ○ ${tool.name}`);
  });
}

console.log('');

// Ask which tools to configure
const toolsToConfigure = [];

AI_TOOLS.forEach((tool, i) => {
  const isInstalled = tool.detect();
  const prompt = isInstalled
    ? `Configure ${tool.name}? [Y/n] `
    : `${tool.name} not found. Create config anyway? [y/N] `;

  // For non-interactive, just configure detected ones
  if (isInstalled) {
    toolsToConfigure.push(tool);
  }
});

if (toolsToConfigure.length === 0) {
  console.log('  No AI tools detected. You can manually add SnipWin to your config.');
  console.log('');
  console.log('  Add this to your AI tool\'s MCP config:');
  console.log('');
  console.log(JSON.stringify({ 'snip-win': SNIPWIN_MCP }, null, 2));
  console.log('');
  process.exit(0);
}

console.log(`  Configuring ${toolsToConfigure.length} tool(s)...\n`);

toolsToConfigure.forEach(tool => {
  try {
    const configPath = tool.detect();
    const newPath = tool.configure(configPath);
    console.log(`  ✓ ${tool.name} → ${newPath}`);
  } catch (e) {
    console.log(`  ✗ ${tool.name}: ${e.message}`);
  }
});

console.log('');
console.log('  ✓ Setup complete!');
console.log('');
console.log('  Next steps:');
console.log('  1. Start SnipWin: npm start');
console.log('  2. Restart your AI tool to pick up the new MCP server');
console.log('  3. Try: "Render a Mermaid diagram of our architecture"');
console.log('');
