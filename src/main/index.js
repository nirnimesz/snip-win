const { app, BrowserWindow, ipcMain, Tray, Menu, nativeImage, screen, clipboard, dialog } = require('electron');
const path = require('path');
const net = require('net');
const fs = require('fs');
const os = require('os');

// ── Configuration ──
const APP_NAME = 'snip-win';
const PIPE_NAME = '\\\\.\\pipe\\snip-win';
const SCREENSHOTS_DIR = path.join(os.homedir(), 'Pictures', APP_NAME, 'screenshots');
const STORAGE_DIR = path.join(os.homedir(), 'AppData', 'Local', APP_NAME);
const DB_PATH = path.join(STORAGE_DIR, 'screenshots.json');

// Ensure directories exist
[SCREENSHOTS_DIR, STORAGE_DIR].forEach(dir => {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
});

// ── Screenshot Database ──
let screenshots = [];
if (fs.existsSync(DB_PATH)) {
  try { screenshots = JSON.parse(fs.readFileSync(DB_PATH, 'utf-8')); } catch (e) { screenshots = []; }
}

function saveDB() {
  fs.writeFileSync(DB_PATH, JSON.stringify(screenshots, null, 2));
}

function addScreenshot(entry) {
  screenshots.unshift(entry);
  if (screenshots.length > 500) screenshots = screenshots.slice(0, 500);
  saveDB();
}

// ── Named Pipe Server (replaces Unix socket) ──
let pipeServer = null;
let pendingRequests = new Map();
let requestId = 0;

function startPipeServer() {
  return new Promise((resolve, reject) => {
    // Clean up stale pipe
    try { fs.unlinkSync(PIPE_NAME.replace('\\\\.\\pipe\\', '\\\\.\\pipe\\')); } catch (e) {}

    pipeServer = net.createServer((socket) => {
      let buffer = '';
      socket.on('data', (chunk) => {
        buffer += chunk.toString();
        try {
          const msg = JSON.parse(buffer);
          handlePipeMessage(msg, socket);
          buffer = '';
        } catch (e) {
          // Partial message, wait for more data
        }
      });
      socket.on('error', () => {});
    });

    pipeServer.on('error', (err) => {
      if (err.code === 'EADDRINUSE') {
        // Another instance is running
        console.error('SnipWin is already running.');
        process.exit(1);
      }
      reject(err);
    });

    pipeServer.listen(PIPE_NAME, () => {
      console.log(`[PipeServer] Listening on ${PIPE_NAME}`);
      resolve();
    });
  });
}

function handlePipeMessage(msg, socket) {
  switch (msg.type) {
    case 'render':
      handleRender(msg, socket);
      break;
    case 'open':
      handleOpen(msg, socket);
      break;
    case 'list':
      socket.end(JSON.stringify({ type: 'list', data: screenshots }));
      break;
    case 'get':
      const found = screenshots.find(s => s.path === msg.filepath || path.basename(s.path) === path.basename(msg.filepath));
      socket.end(JSON.stringify({ type: 'get', data: found || null }));
      break;
    case 'search':
      const q = (msg.query || '').toLowerCase();
      const results = screenshots.filter(s =>
        (s.name || '').toLowerCase().includes(q) ||
        (s.description || '').toLowerCase().includes(q) ||
        (s.tags || []).some(t => t.toLowerCase().includes(q))
      );
      socket.end(JSON.stringify({ type: 'search', data: results }));
      break;
    case 'categories':
      const cats = {};
      screenshots.forEach(s => (s.categories || []).forEach(c => { cats[c] = (cats[c] || 0) + 1; }));
      socket.end(JSON.stringify({ type: 'categories', data: Object.entries(cats).map(([name, count]) => ({ name, count })) }));
      break;
    case 'ping':
      socket.end(JSON.stringify({ type: 'pong', running: true }));
      break;
    default:
      socket.end(JSON.stringify({ type: 'error', message: `Unknown command: ${msg.type}` }));
  }
}

// ── Render Flow ──
let mainWindow = null;
let pendingReview = null;

function handleRender(msg, socket) {
  const reqId = ++requestId;
  pendingReview = { reqId, socket, type: msg.format, message: msg.message, content: msg.content };

  if (!mainWindow || mainWindow.isDestroyed()) {
    createMainWindow();
  }

  mainWindow.webContents.send('render-request', {
    reqId,
    format: msg.format,
    content: msg.content,
    message: msg.message
  });

  if (!mainWindow.isVisible()) {
    mainWindow.show();
    mainWindow.focus();
  }
}

function handleOpen(msg, socket) {
  const reqId = ++requestId;
  const filepath = msg.filepath;

  if (!fs.existsSync(filepath)) {
    socket.end(JSON.stringify({ type: 'error', message: `File not found: ${filepath}` }));
    return;
  }

  pendingReview = { reqId, socket, type: 'image', message: msg.message, filepath };

  if (!mainWindow || mainWindow.isDestroyed()) {
    createMainWindow();
  }

  mainWindow.webContents.send('open-request', {
    reqId,
    filepath,
    message: msg.message
  });

  if (!mainWindow.isVisible()) {
    mainWindow.show();
    mainWindow.focus();
  }
}

// ── IPC from Renderer ──
ipcMain.on('review-complete', (event, result) => {
  if (!pendingReview) return;

  const { socket, reqId } = pendingReview;

  // Save annotated image if edited
  let savedPath = result.path;
  if (result.edited && result.imageData) {
    const filename = `review-${Date.now()}.png`;
    savedPath = path.join(SCREENSHOTS_DIR, filename);
    const base64 = result.imageData.replace(/^data:image\/\w+;base64,/, '');
    fs.writeFileSync(savedPath, Buffer.from(base64, 'base64'));
  }

  // Save to database
  if (savedPath) {
    addScreenshot({
      path: savedPath,
      name: path.basename(savedPath),
      description: result.text || pendingReview.message || '',
      timestamp: new Date().toISOString(),
      tags: [],
      categories: []
    });
  }

  const response = {
    type: 'review-result',
    reqId,
    status: result.status,
    edited: result.edited,
    path: savedPath,
    text: result.text || ''
  };

  try {
    socket.end(JSON.stringify(response));
  } catch (e) {}

  pendingReview = null;
});

ipcMain.on('review-cancel', (event) => {
  if (!pendingReview) return;
  const { socket } = pendingReview;
  try {
    socket.end(JSON.stringify({ type: 'review-result', reqId: pendingReview.reqId, status: 'cancelled', edited: false, path: null, text: '' }));
  } catch (e) {}
  pendingReview = null;
});

// ── Screenshot Capture ──
ipcMain.handle('save-screenshot', async (event, imageData, metadata) => {
  const filename = `snip-${Date.now()}.png`;
  const filepath = path.join(SCREENSHOTS_DIR, filename);
  const base64 = imageData.replace(/^data:image\/\w+;base64,/, '');
  fs.writeFileSync(filepath, Buffer.from(base64, 'base64'));

  const entry = {
    path: filepath,
    name: filename,
    description: metadata?.description || '',
    timestamp: new Date().toISOString(),
    tags: metadata?.tags || [],
    categories: metadata?.categories || []
  };
  addScreenshot(entry);
  return entry;
});

// ── Main Window ──
function createMainWindow() {
  const primaryDisplay = screen.getPrimaryDisplay();
  const { width, height } = primaryDisplay.workAreaSize;

  mainWindow = new BrowserWindow({
    width: Math.min(1200, width - 100),
    height: Math.min(800, height - 100),
    x: 100,
    y: 50,
    show: false,
    frame: true,
    resizable: true,
    webPreferences: {
      preload: path.join(__dirname, '..', 'preload', 'index.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false
    }
  });

  mainWindow.loadFile(path.join(__dirname, '..', 'renderer', 'index.html'));

  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  // Don't quit the app when window is closed — stay in tray
  mainWindow.on('close', (e) => {
    if (app.isQuitting) return;
    e.preventDefault();
    mainWindow.hide();
  });
}

// ── System Tray ──
let tray = null;

function createTray() {
  // Create a simple icon (fallback to default)
  const iconPath = path.join(__dirname, '..', '..', 'assets', 'icon.png');
  let trayIcon;
  if (fs.existsSync(iconPath)) {
    trayIcon = nativeImage.createFromPath(iconPath);
  } else {
    // Create a minimal 16x16 icon
    trayIcon = nativeImage.createEmpty();
  }

  tray = new Tray(trayIcon);
  tray.setToolTip('SnipWin — Visual Review for AI Agents');

  const contextMenu = Menu.buildFromTemplate([
    { label: 'SnipWin', enabled: false },
    { type: 'separator' },
    {
      label: 'Open Review Panel',
      click: () => {
        if (!mainWindow || mainWindow.isDestroyed()) createMainWindow();
        mainWindow.show();
        mainWindow.focus();
      }
    },
    {
      label: 'Capture Screen',
      click: () => {
        if (!mainWindow || mainWindow.isDestroyed()) createMainWindow();
        mainWindow.webContents.send('capture-screen');
        mainWindow.show();
        mainWindow.focus();
      }
    },
    { type: 'separator' },
    {
      label: 'Browse Screenshots',
      click: () => {
        const { shell } = require('electron');
        shell.openPath(SCREENSHOTS_DIR);
      }
    },
    { type: 'separator' },
    {
      label: 'Quit SnipWin',
      click: () => {
        app.isQuitting = true;
        app.quit();
      }
    }
  ]);

  tray.setContextMenu(contextMenu);

  tray.on('click', () => {
    if (!mainWindow || mainWindow.isDestroyed()) createMainWindow();
    if (mainWindow.isVisible()) {
      mainWindow.hide();
    } else {
      mainWindow.show();
      mainWindow.focus();
    }
  });
}

// ── App Lifecycle ──
const gotLock = app.requestSingleInstanceLock();
if (!gotLock) {
  console.error('SnipWin is already running.');
  process.exit(1);
}

app.on('second-instance', () => {
  if (mainWindow && !mainWindow.isDestroyed()) {
    if (mainWindow.isMinimized()) mainWindow.restore();
    mainWindow.show();
    mainWindow.focus();
  }
});

app.whenReady().then(async () => {
  await startPipeServer();
  createTray();
  createMainWindow();
  console.log(`[SnipWin] Ready. Screenshots: ${SCREENSHOTS_DIR}`);
});

app.on('window-all-closed', () => {
  // Keep app running in tray
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createMainWindow();
  }
});

app.on('before-quit', () => {
  app.isQuitting = true;
  if (pipeServer) pipeServer.close();
});
