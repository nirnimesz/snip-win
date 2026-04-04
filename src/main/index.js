const { app, BrowserWindow, ipcMain, Tray, Menu, nativeImage, screen, clipboard, dialog, desktopCapturer, globalShortcut } = require('electron');
const path = require('path');
const net = require('net');
const fs = require('fs');
const os = require('os');

// ── Configuration ──
const APP_NAME = 'snip-win';
const PIPE_NAME = '\\\\.\\pipe\\snip-win';
const SCREENSHOTS_DIR = path.join(os.homedir(), 'Pictures', APP_NAME, 'screenshots');
const STORAGE_DIR = path.join(os.homedir(), 'AppData', 'Local', APP_NAME);
const SETTINGS_PATH = path.join(STORAGE_DIR, 'settings.json');
const DB_PATH = path.join(STORAGE_DIR, 'screenshots.json');

// Ensure directories exist
[SCREENSHOTS_DIR, STORAGE_DIR].forEach(dir => {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
});

// ── Settings ──
const DEFAULT_SETTINGS = {
  autoLaunch: false,
  defaultFormat: 'mermaid',
  screenshotQuality: 0.92,
  theme: 'dark',
  annotationColors: {
    rect: '#6366f1',
    arrow: '#ef4444',
    text: '#f1f5f9',
    blur: 'rgba(0,0,0,0.5)'
  },
  hotkey: 'Ctrl+Shift+S'
};

let settings = { ...DEFAULT_SETTINGS };

function loadSettings() {
  try {
    if (fs.existsSync(SETTINGS_PATH)) {
      const loaded = JSON.parse(fs.readFileSync(SETTINGS_PATH, 'utf-8'));
      Object.assign(settings, loaded);
    }
  } catch (e) { /* use defaults */ }
}

function saveSettings() {
  fs.writeFileSync(SETTINGS_PATH, JSON.stringify(settings, null, 2));
}

loadSettings();

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

// ── Named Pipe Server ──
let pipeServer = null;
let pendingReview = null;

function startPipeServer() {
  return new Promise((resolve, reject) => {
    pipeServer = net.createServer((socket) => {
      let buffer = '';
      socket.on('data', (chunk) => {
        buffer += chunk.toString();
        try {
          const msg = JSON.parse(buffer);
          handlePipeMessage(msg, socket);
          buffer = '';
        } catch (e) {
          // Partial message, wait for more
        }
      });
      socket.on('error', () => {});
    });

    pipeServer.on('error', (err) => {
      if (err.code === 'EADDRINUSE') {
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
    case 'transcribe':
      handleTranscribe(msg, socket);
      break;
    case 'capture':
      handleCapture(msg, socket);
      break;
    case 'settings':
      if (msg.action === 'get') {
        socket.end(JSON.stringify({ type: 'settings', data: settings }));
      } else if (msg.action === 'set') {
        Object.assign(settings, msg.data);
        saveSettings();
        socket.end(JSON.stringify({ type: 'settings', data: settings }));
      }
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

function handleRender(msg, socket) {
  const reqId = Date.now();
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
  const reqId = Date.now();
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

// ── Screen Capture via Pipe ──
async function handleCapture(msg, socket) {
  try {
    const type = msg.type || 'screen';
    const sources = await desktopCapturer.getSources({
      types: type === 'window' ? ['window'] : ['screen'],
      thumbnailSize: { width: 1920, height: 1080 }
    });

    if (sources.length === 0) {
      socket.end(JSON.stringify({ type: 'error', message: 'No capture sources available' }));
      return;
    }

    const source = sources[0];
    const img = source.thumbnail.toPNG();
    const filename = `snip-${Date.now()}.png`;
    const filepath = path.join(SCREENSHOTS_DIR, filename);
    fs.writeFileSync(filepath, img);

    const entry = {
      path: filepath,
      name: filename,
      description: msg.description || `Captured ${type}`,
      timestamp: new Date().toISOString(),
      tags: msg.tags || [],
      categories: ['capture']
    };
    addScreenshot(entry);

    socket.end(JSON.stringify({ type: 'capture', data: entry }));
  } catch (e) {
    socket.end(JSON.stringify({ type: 'error', message: `Capture failed: ${e.message}` }));
  }
}

// ── OCR Transcription ──
async function handleTranscribe(msg, socket) {
  const filepath = msg.filepath;
  if (!fs.existsSync(filepath)) {
    socket.end(JSON.stringify({ type: 'error', message: `File not found: ${filepath}` }));
    return;
  }

  try {
    const { createWorker } = require('tesseract.js');
    const worker = await createWorker('eng');
    const { data: { text } } = await worker.recognize(filepath);
    await worker.terminate();

    socket.end(JSON.stringify({ type: 'transcribe', text: text.trim() }));
  } catch (e) {
    socket.end(JSON.stringify({ type: 'error', message: `OCR failed: ${e.message}` }));
  }
}

// ── IPC from Renderer ──
ipcMain.on('review-complete', (event, result) => {
  if (!pendingReview) return;

  const { socket, reqId } = pendingReview;

  let savedPath = result.path;
  if (result.edited && result.imageData) {
    const filename = `review-${Date.now()}.png`;
    savedPath = path.join(SCREENSHOTS_DIR, filename);
    const base64 = result.imageData.replace(/^data:image\/\w+;base64,/, '');
    fs.writeFileSync(savedPath, Buffer.from(base64, 'base64'));
  }

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

ipcMain.on('review-cancel', () => {
  if (!pendingReview) return;
  const { socket } = pendingReview;
  try {
    socket.end(JSON.stringify({ type: 'review-result', reqId: pendingReview.reqId, status: 'cancelled', edited: false, path: null, text: '' }));
  } catch (e) {}
  pendingReview = null;
});

// ── Screenshot Capture ──
ipcMain.handle('capture-screen', async (event, opts = {}) => {
  try {
    const sources = await desktopCapturer.getSources({
      types: opts.type === 'window' ? ['window'] : ['screen'],
      thumbnailSize: opts.thumbnailSize || { width: 1920, height: 1080 }
    });

    if (sources.length === 0) {
      return { error: 'No capture sources available' };
    }

    const source = sources[0];
    const img = source.thumbnail.toPNG();
    const filename = `snip-${Date.now()}.png`;
    const filepath = path.join(SCREENSHOTS_DIR, filename);
    fs.writeFileSync(filepath, img);

    const entry = {
      path: filepath,
      name: filename,
      description: opts.description || `Captured ${opts.type || 'screen'}`,
      timestamp: new Date().toISOString(),
      tags: opts.tags || [],
      categories: ['capture']
    };
    addScreenshot(entry);

    clipboard.writeImage(source.thumbnail);

    return entry;
  } catch (e) {
    return { error: e.message };
  }
});

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

ipcMain.handle('get-settings', () => settings);
ipcMain.handle('save-settings', (event, newSettings) => {
  Object.assign(settings, newSettings);
  saveSettings();
  return settings;
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
    backgroundColor: '#0f172a',
    webPreferences: {
      preload: path.join(__dirname, '..', 'preload', 'index.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
      webSecurity: true
    }
  });

  mainWindow.loadFile(path.join(__dirname, '..', 'renderer', 'index.html'));

  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  mainWindow.on('close', (e) => {
    if (app.isQuitting) return;
    e.preventDefault();
    mainWindow.hide();
  });

  if (process.argv.includes('--dev')) {
    mainWindow.webContents.openDevTools();
  }
}

// ── System Tray ──
let tray = null;

function createTray() {
  const icon = createDefaultIcon();
  tray = new Tray(icon);
  tray.setToolTip('SnipWin v2.0 — Visual Review for AI Agents');

  const contextMenu = Menu.buildFromTemplate([
    { label: 'SnipWin v2.0', enabled: false },
    { type: 'separator' },
    {
      label: 'Open Review Panel',
      accelerator: 'CmdOrCtrl+Shift+R',
      click: () => {
        if (!mainWindow || mainWindow.isDestroyed()) createMainWindow();
        mainWindow.show();
        mainWindow.focus();
      }
    },
    {
      label: 'Capture Full Screen',
      accelerator: 'CmdOrCtrl+Shift+1',
      click: () => captureAndShow('screen')
    },
    {
      label: 'Capture Active Window',
      accelerator: 'CmdOrCtrl+Shift+2',
      click: () => captureAndShow('window')
    },
    { type: 'separator' },
    {
      label: 'Browse Screenshots',
      click: () => {
        const { shell } = require('electron');
        shell.openPath(SCREENSHOTS_DIR);
      }
    },
    {
      label: 'Settings',
      click: () => {
        if (!mainWindow || mainWindow.isDestroyed()) createMainWindow();
        mainWindow.webContents.send('open-settings');
        mainWindow.show();
        mainWindow.focus();
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

function createDefaultIcon() {
  const size = 16;
  const pixels = Buffer.alloc(size * size * 4);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const i = (y * size + x) * 4;
      const cx = size / 2, cy = size / 2, r = size / 2 - 1;
      const dist = Math.sqrt((x - cx) ** 2 + (y - cy) ** 2);
      if (dist <= r) {
        const t = dist / r;
        pixels[i] = Math.round(99 * (1 - t) + 6 * t);
        pixels[i + 1] = Math.round(102 * (1 - t) + 182 * t);
        pixels[i + 2] = Math.round(241 * (1 - t) + 212 * t);
        pixels[i + 3] = 255;
      }
    }
  }
  return nativeImage.createFromBuffer(pixels, { width: size, height: size });
}

async function captureAndShow(type) {
  if (!mainWindow || mainWindow.isDestroyed()) createMainWindow();

  const result = await mainWindow.webContents.executeJavaScript(`
    (async () => {
      const result = await window.snipAPI.captureScreen('${type}');
      return result;
    })()
  `);

  if (result && !result.error) {
    mainWindow.webContents.send('open-request', {
      reqId: Date.now(),
      filepath: result.path,
      message: `Captured ${type}`
    });
    mainWindow.show();
    mainWindow.focus();
  }
}

// ── Global Shortcuts ──
function registerShortcuts() {
  if (settings.hotkey) {
    try {
      globalShortcut.register(settings.hotkey, () => {
        captureAndShow('screen');
      });
    } catch (e) {
      console.warn(`Failed to register shortcut: ${settings.hotkey}`);
    }
  }
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
  registerShortcuts();
  console.log(`[SnipWin v2.0] Ready. Screenshots: ${SCREENSHOTS_DIR}`);
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
  globalShortcut.unregisterAll();
  if (pipeServer) pipeServer.close();
});
