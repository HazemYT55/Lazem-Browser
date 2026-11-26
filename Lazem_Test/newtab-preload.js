const { contextBridge, ipcRenderer } = require('electron');
if (location.protocol === 'file:') contextBridge.exposeInMainWorld('lz', {
  data: () => ipcRenderer.invoke('newtab-data'),
  go: u => ipcRenderer.send('go', u),
  set: (k, v) => ipcRenderer.send('set', k, v)
});
