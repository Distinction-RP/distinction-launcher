const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('launcher', {
  connect: (url) => ipcRenderer.send('launch-fivem', url),
  close: () => ipcRenderer.send('close-app'),
  minimize: () => ipcRenderer.send('minimize-app'),
  maximize: () => ipcRenderer.send('maximize-app'),
  clearCache: () => ipcRenderer.invoke('clear-cache'),
  checkFiveMRunning: () => ipcRenderer.invoke('check-fivem-running'),
  updateLauncher: (url) => ipcRenderer.invoke('update-launcher', url),
});
