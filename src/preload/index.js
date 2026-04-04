const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('snipAPI', {
  // ── Receive events from main process ──
  onRenderRequest: (callback) => {
    ipcRenderer.on('render-request', (event, data) => callback(data));
  },
  onOpenRequest: (callback) => {
    ipcRenderer.on('open-request', (event, data) => callback(data));
  },
  onCaptureScreen: (callback) => {
    ipcRenderer.on('capture-screen', (event) => callback());
  },
  onSettingsOpen: (callback) => {
    ipcRenderer.on('open-settings', (event) => callback());
  },

  // ── Send review results ──
  submitReview: (result) => {
    ipcRenderer.send('review-complete', result);
  },
  cancelReview: () => {
    ipcRenderer.send('review-cancel');
  },

  // ── Screen capture ──
  captureScreen: (type) => {
    return ipcRenderer.invoke('capture-screen', { type });
  },
  saveScreenshot: (imageData, metadata) => {
    return ipcRenderer.invoke('save-screenshot', imageData, metadata);
  },

  // ── Settings ──
  getSettings: () => {
    return ipcRenderer.invoke('get-settings');
  },
  saveSettings: (newSettings) => {
    return ipcRenderer.invoke('save-settings', newSettings);
  }
});
