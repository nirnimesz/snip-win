#!/usr/bin/env node
/**
 * SnipWin MCP Server — Model Context Protocol server for Windows.
 * Allows AI agents without shell access to use SnipWin's visual review capabilities.
 *
 * Usage in OpenCode config:
 * {
 *   "mcp": {
 *     "snip-win": {
 *       "type": "local",
 *       "command": ["node", "C:\\Users\\<user>\\Documents\\snip-win\\src\\mcp\\server.js"],
 *       "enabled": true
 *     }
 *   }
 * }
 */

const net = require('net');
const fs = require('fs');
const path = require('path');

const PIPE_NAME = '\\\\.\\pipe\\snip-win';

// ── MCP Protocol Helpers ──
let requestId = 0;

function sendJSON(obj) {
  process.stdout.write(JSON.stringify(obj) + '\n');
}

function sendResponse(id, result) {
  sendJSON({ jsonrpc: '2.0', id, result });
}

function sendError(id, code, message) {
  sendJSON({ jsonrpc: '2.0', id, error: { code, message } });
}

function sendNotification(method, params) {
  sendJSON({ jsonrpc: '2.0', method, params });
}

// ── Pipe Communication ──
function sendToPipe(message) {
  return new Promise((resolve, reject) => {
    const client = net.createConnection({ path: PIPE_NAME }, () => {
      client.write(JSON.stringify(message));
    });

    let buffer = '';
    client.on('data', (chunk) => {
      buffer += chunk.toString();
      try {
        const result = JSON.parse(buffer);
        client.end();
        resolve(result);
      } catch (e) {
        // Wait for more data
      }
    });

    client.on('error', (err) => {
      if (err.code === 'ENOENT' || err.code === 'ECONNREFUSED') {
        reject(new Error('SnipWin is not running. Start the SnipWin app first.'));
      } else {
        reject(err);
      }
    });

    client.setTimeout(30000, () => {
      client.destroy();
      reject(new Error('Connection to SnipWin timed out.'));
    });
  });
}

// ── Tool Definitions ──
const TOOLS = [
  {
    name: 'render_diagram',
    description: 'Render a Mermaid diagram and open it for visual review. Returns approval status and optional feedback.',
    inputSchema: {
      type: 'object',
      properties: {
        content: { type: 'string', description: 'Mermaid diagram source code' },
        message: { type: 'string', description: 'Context message shown to the reviewer' }
      },
      required: ['content']
    }
  },
  {
    name: 'render_html',
    description: 'Render HTML content and open it for visual review. Returns approval status and optional feedback.',
    inputSchema: {
      type: 'object',
      properties: {
        content: { type: 'string', description: 'HTML content to render' },
        message: { type: 'string', description: 'Context message shown to the reviewer' }
      },
      required: ['content']
    }
  },
  {
    name: 'open_in_snip',
    description: 'Open an image file in SnipWin for annotation and review.',
    inputSchema: {
      type: 'object',
      properties: {
        filepath: { type: 'string', description: 'Path to the image file' },
        message: { type: 'string', description: 'Context message shown to the reviewer' }
      },
      required: ['filepath']
    }
  },
  {
    name: 'list_screenshots',
    description: 'List all saved screenshots with metadata.',
    inputSchema: { type: 'object', properties: {} }
  },
  {
    name: 'get_screenshot',
    description: 'Get metadata for a specific screenshot.',
    inputSchema: {
      type: 'object',
      properties: {
        filepath: { type: 'string', description: 'Path to the screenshot file' }
      },
      required: ['filepath']
    }
  },
  {
    name: 'search_screenshots',
    description: 'Search screenshots by description or tags.',
    inputSchema: {
      type: 'object',
      properties: {
        query: { type: 'string', description: 'Search query' }
      },
      required: ['query']
    }
  },
  {
    name: 'capture_screen',
    description: 'Capture the full screen or active window. Returns the saved screenshot path.',
    inputSchema: {
      type: 'object',
      properties: {
        type: { type: 'string', enum: ['screen', 'window'], description: 'Capture type (default: screen)' },
        description: { type: 'string', description: 'Optional description for the screenshot' }
      }
    }
  },
  {
    name: 'transcribe_image',
    description: 'Extract text from an image using OCR (Tesseract).',
    inputSchema: {
      type: 'object',
      properties: {
        filepath: { type: 'string', description: 'Path to the image file' }
      },
      required: ['filepath']
    }
  }
];

// ── Tool Handlers ──
async function handleToolCall(name, args) {
  switch (name) {
    case 'render_diagram': {
      const result = await sendToPipe({
        type: 'render',
        format: 'mermaid',
        content: args.content,
        message: args.message || 'Review this diagram'
      });
      return {
        content: [{
          type: 'text',
          text: `Review result:\nStatus: ${result.status}\nEdited: ${result.edited}\nPath: ${result.path || 'N/A'}\nFeedback: ${result.text || 'None'}`
        }]
      };
    }

    case 'render_html': {
      const result = await sendToPipe({
        type: 'render',
        format: 'html',
        content: args.content,
        message: args.message || 'Review this HTML'
      });
      return {
        content: [{
          type: 'text',
          text: `Review result:\nStatus: ${result.status}\nEdited: ${result.edited}\nPath: ${result.path || 'N/A'}\nFeedback: ${result.text || 'None'}`
        }]
      };
    }

    case 'open_in_snip': {
      if (!fs.existsSync(args.filepath)) {
        return {
          content: [{ type: 'text', text: `Error: File not found: ${args.filepath}` }],
          isError: true
        };
      }
      const result = await sendToPipe({
        type: 'open',
        filepath: args.filepath,
        message: args.message || 'Review this image'
      });
      return {
        content: [{
          type: 'text',
          text: `Review result:\nStatus: ${result.status}\nEdited: ${result.edited}\nPath: ${result.path || 'N/A'}\nFeedback: ${result.text || 'None'}`
        }]
      };
    }

    case 'list_screenshots': {
      const result = await sendToPipe({ type: 'list' });
      return {
        content: [{
          type: 'text',
          text: JSON.stringify(result.data, null, 2)
        }]
      };
    }

    case 'get_screenshot': {
      const result = await sendToPipe({ type: 'get', filepath: args.filepath });
      return {
        content: [{
          type: 'text',
          text: result.data ? JSON.stringify(result.data, null, 2) : 'Screenshot not found.'
        }]
      };
    }

    case 'search_screenshots': {
      const result = await sendToPipe({ type: 'search', query: args.query });
      return {
        content: [{
          type: 'text',
          text: `Found ${result.data.length} screenshots:\n` + JSON.stringify(result.data, null, 2)
        }]
      };
    }

    case 'capture_screen': {
      const result = await sendToPipe({
        type: 'capture',
        type: args.type || 'screen',
        description: args.description || ''
      });
      if (result.error) {
        return { content: [{ type: 'text', text: `Error: ${result.error}` }], isError: true };
      }
      return {
        content: [{
          type: 'text',
          text: `Screenshot captured:\nPath: ${result.data.path}\nName: ${result.data.name}`
        }]
      };
    }

    case 'transcribe_image': {
      if (!fs.existsSync(args.filepath)) {
        return {
          content: [{ type: 'text', text: `Error: File not found: ${args.filepath}` }],
          isError: true
        };
      }
      const result = await sendToPipe({ type: 'transcribe', filepath: args.filepath });
      if (result.error) {
        return { content: [{ type: 'text', text: `Error: ${result.error}` }], isError: true };
      }
      return {
        content: [{ type: 'text', text: result.text || 'No text found in image.' }]
      };
    }

    default:
      return {
        content: [{ type: 'text', text: `Unknown tool: ${name}` }],
        isError: true
      };
  }
}

// ── MCP Message Handler ──
async function handleMessage(msg) {
  const { id, method, params } = msg;

  switch (method) {
    case 'initialize':
      sendResponse(id, {
        protocolVersion: '2024-11-05',
        capabilities: {
          tools: { listChanged: false }
        },
        serverInfo: {
          name: 'snip-win',
          version: '2.0.0'
        }
      });
      break;

    case 'initialized':
      // No-op
      break;

    case 'tools/list':
      sendResponse(id, { tools: TOOLS });
      break;

    case 'tools/call':
      try {
        const result = await handleToolCall(params.name, params.arguments || {});
        sendResponse(id, result);
      } catch (err) {
        sendError(id, -32603, err.message);
      }
      break;

    case 'ping':
      sendResponse(id, {});
      break;

    default:
      sendError(id, -32601, `Method not found: ${method}`);
  }
}

// ── Stdio Reader ──
let inputBuffer = '';

process.stdin.on('data', (chunk) => {
  inputBuffer += chunk.toString();
  const lines = inputBuffer.split('\n');
  inputBuffer = lines.pop(); // Keep incomplete line in buffer

  for (const line of lines) {
    if (!line.trim()) continue;
    try {
      const msg = JSON.parse(line);
      handleMessage(msg).catch(err => {
        sendError(msg.id, -32603, err.message);
      });
    } catch (e) {
      // Invalid JSON, skip
    }
  }
});

process.stdin.on('end', () => {
  process.exit(0);
});

// Startup
sendJSON({
  jsonrpc: '2.0',
  method: 'notifications/stderr',
  params: { content: '[SnipWin MCP] Server started. Waiting for requests...' }
});
