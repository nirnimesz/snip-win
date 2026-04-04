const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('snipAPI', {
  // Receive render requests from main process
  onRenderRequest: (callback) => {
    ipcRenderer.on('render-request', (event, data) => callback(data));
  },
  onOpenRequest: (callback) => {
    ipcRenderer.on('open-request', (event, data) => callback(data));
  },
  onCaptureScreen: (callback) => {
    ipcRenderer.on('capture-screen', (event) => callback());
  },

  // Send review results back to main process
  submitReview: (result) => {
    ipcRenderer.send('review-complete', result);
  },
  cancelReview: () => {
    ipcRenderer.send('review-cancel');
  },

  // Save screenshots
  saveScreenshot: (imageData, metadata) => {
    return ipcRenderer.invoke('save-screenshot', imageData, metadata);
  }
});
