#!/usr/bin/env node
/**
 * SnipWin CLI — Windows-native command-line interface for SnipWin.
 * Connects to the running SnipWin app via Windows Named Pipe.
 *
 * Usage:
 *   snip-win search "error message"
 *   snip-win list
 *   snip-win get <filepath>
 *   snip-win transcribe <filepath>
 *   snip-win open <filepath> --message "Does this look right?"
 *   echo "graph TD; A-->B" | snip-win render --format mermaid
 *   echo "<h1>Hello</h1>" | snip-win render --format html --message "Preview"
 */

const net = require('net');
const path = require('path');
const fs = require('fs');

const PIPE_NAME = '\\\\.\\pipe\\snip-win';

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
        // Partial message, wait for more
      }
    });

    client.on('error', (err) => {
      if (err.code === 'ENOENT' || err.code === 'ECONNREFUSED') {
        reject(new Error('SnipWin is not running. Start it first.'));
      } else {
        reject(err);
      }
    });

    client.setTimeout(30000, () => {
      client.destroy();
      reject(new Error('Connection timed out.'));
    });
  });
}

function readStdin() {
  return new Promise((resolve) => {
    let data = '';
    process.stdin.setEncoding('utf8');
    process.stdin.on('data', (chunk) => data += chunk);
    process.stdin.on('end', () => resolve(data));
  });
}

function output(data) {
  console.log(JSON.stringify(data, null, process.argv.includes('--pretty') ? 2 : 0));
}

async function main() {
  const args = process.argv.slice(2);
  const command = args[0];

  if (!command || command === '--help' || command === '-h') {
    console.log(`SnipWin CLI — Visual Review for AI Agents (Windows)

Commands:
  search <query>        Search screenshots by description
  list                  List all saved screenshots
  get <filepath>        Get metadata for a specific screenshot
  open <filepath>       Open image for annotation/review (blocks until done)
  render --format <fmt> Render content from stdin (mermaid or html)

Options:
  --format <fmt>        Render format: mermaid or html
  --message <text>      Context message shown during review
  --pretty              Pretty-print JSON output
  --help, -h            Show this help

Examples:
  snip-win search "error message"
  snip-win list | jq '.[].name'
  snip-win open screenshot.png --message "Does this look right?"
  echo "graph TD; A-->B" | snip-win render --format mermaid
  echo "<h1>Hello</h1>" | snip-win render --format html --message "Preview"
`);
    process.exit(0);
  }

  try {
    switch (command) {
      case 'list': {
        const result = await sendToPipe({ type: 'list' });
        output(result.data);
        break;
      }

      case 'get': {
        const filepath = args[1];
        if (!filepath) {
          console.error('Usage: snip-win get <filepath>');
          process.exit(1);
        }
        const result = await sendToPipe({ type: 'get', filepath });
        output(result.data);
        break;
      }

      case 'search': {
        const query = args.slice(1).join(' ');
        if (!query) {
          console.error('Usage: snip-win search <query>');
          process.exit(1);
        }
        const result = await sendToPipe({ type: 'search', query });
        output(result.data);
        break;
      }

      case 'categories': {
        const result = await sendToPipe({ type: 'categories' });
        output(result.data);
        break;
      }

      case 'open': {
        const filepath = args[1];
        if (!filepath) {
          console.error('Usage: snip-win open <filepath> [--message "text"]');
          process.exit(1);
        }
        if (!fs.existsSync(filepath)) {
          console.error(`File not found: ${filepath}`);
          process.exit(1);
        }
        const msgIdx = args.indexOf('--message');
        const message = msgIdx >= 0 ? args[msgIdx + 1] : '';
        const result = await sendToPipe({ type: 'open', filepath, message });
        output(result);
        break;
      }

      case 'render': {
        const formatIdx = args.indexOf('--format');
        const format = formatIdx >= 0 ? args[formatIdx + 1] : null;
        if (!format || (format !== 'mermaid' && format !== 'html')) {
          console.error('Usage: snip-win render --format <mermaid|html> [--message "text"]');
          process.exit(1);
        }
        const msgIdx = args.indexOf('--message');
        const message = msgIdx >= 0 ? args[msgIdx + 1] : '';
        const content = await readStdin();
        if (!content.trim()) {
          console.error('No content provided via stdin.');
          process.exit(1);
        }
        const result = await sendToPipe({ type: 'render', format, content, message });
        output(result);
        break;
      }

      default:
        console.error(`Unknown command: ${command}`);
        console.error('Run "snip-win --help" for usage.');
        process.exit(1);
    }
  } catch (err) {
    console.error(`Error: ${err.message}`);
    process.exit(1);
  }
}

main();
