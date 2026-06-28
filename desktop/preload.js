const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  login: (credentials) => ipcRenderer.send('login', credentials),
  startTimer: (data) => ipcRenderer.send('start-timer', data),
  stopTimer: () => ipcRenderer.send('stop-timer'),
  reportActivity: () => ipcRenderer.send('activity'),
  
  onLoginSuccess: (callback) => ipcRenderer.on('login-success', (event, ...args) => callback(...args)),
  onLoginError: (callback) => ipcRenderer.on('login-error', (event, ...args) => callback(...args)),
  onTimerTick: (callback) => ipcRenderer.on('timer-tick', (event, ...args) => callback(...args)),
  onStatusUpdate: (callback) => ipcRenderer.on('status-update', (event, ...args) => callback(...args))
});
