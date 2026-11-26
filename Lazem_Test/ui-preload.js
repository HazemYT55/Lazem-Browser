const { contextBridge, ipcRenderer } = require('electron');
contextBridge.exposeInMainWorld('lz', {
  send: (c, ...a) => ipcRenderer.send(c, ...a),
  onState: f => ipcRenderer.on('state', (e, s) => f(s))
});
