const { app, BrowserWindow, ipcMain, desktopCapturer } = require('electron');
const path = require('path');
const axios = require('axios');

let mainWindow;
let timerInterval = null;
let screenshotInterval = null;
let syncInterval = null;

let token = null;
let activeTimer = null;
let lastActivityTime = Date.now();
let isIdle = false;

// Mock local storage
const timeEntries = [];
const screenshots = [];
const activityLogs = [];
const idlePeriods = [];

const API_BASE = 'http://localhost:3000/api/desktop';

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 400,
    height: 420,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true
    }
  });

  mainWindow.loadFile('index.html');
}

app.whenReady().then(() => {
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// IPC Handlers

ipcMain.on('login', async (event, credentials) => {
  try {
    const res = await axios.post(`${API_BASE}/auth`, credentials);
    if (res.data.success) {
      token = res.data.token;
      event.reply('login-success', res.data);
    } else {
      event.reply('login-error', 'Login failed');
    }
  } catch (err) {
    event.reply('login-error', err.response?.data?.error || err.message);
  }
});

ipcMain.on('start-timer', (event, data) => {
  activeTimer = {
    projectId: data.projectId,
    taskId: data.taskId,
    startTime: new Date().toISOString(),
    lastActivityAt: new Date().toISOString(),
    isIdle: false,
    activeWorkedDuration: 0,
    idleDuration: 0,
    idleStartedAt: null
  };

  lastActivityTime = Date.now();

  timerInterval = setInterval(() => {
    if (!isIdle) {
      activeTimer.activeWorkedDuration++;
    } else {
      activeTimer.idleDuration++;
    }
    
    // Check idle state (3 minutes = 180 seconds)
    if (!isIdle && (Date.now() - lastActivityTime > 3 * 60 * 1000)) {
      isIdle = true;
      activeTimer.isIdle = true;
      activeTimer.idleStartedAt = new Date().toISOString();
      event.reply('status-update', { status: 'idle' });
    }

    event.reply('timer-tick', activeTimer);
  }, 1000);

  screenshotInterval = setInterval(async () => {
    if (!isIdle) {
      await captureScreenshot();
    }
  }, 3 * 60 * 1000); // Every 3 minutes

  syncInterval = setInterval(async () => {
    await syncData();
  }, 60 * 1000); // Sync every minute

  event.reply('status-update', { status: 'active' });
});

ipcMain.on('stop-timer', async (event) => {
  clearInterval(timerInterval);
  clearInterval(screenshotInterval);
  clearInterval(syncInterval);

  if (activeTimer) {
    timeEntries.push({
      ...activeTimer,
      endTime: new Date().toISOString(),
      duration: (activeTimer.activeWorkedDuration + activeTimer.idleDuration) / 3600,
      activeWorkedDuration: activeTimer.activeWorkedDuration / 3600,
      idleDuration: activeTimer.idleDuration / 3600
    });
  }

  await syncData(true);
  
  activeTimer = null;
  isIdle = false;

  event.reply('status-update', { status: 'stopped' });
});

ipcMain.on('activity', (event) => {
  lastActivityTime = Date.now();
  if (isIdle) {
    isIdle = false;
    if (activeTimer) {
      activeTimer.isIdle = false;
      idlePeriods.push({
        startTime: activeTimer.idleStartedAt,
        endTime: new Date().toISOString(),
        duration: (Date.now() - new Date(activeTimer.idleStartedAt).getTime()) / 1000
      });
      activeTimer.idleStartedAt = null;
    }
    mainWindow.webContents.send('status-update', { status: 'active' });
  }
});

async function captureScreenshot() {
  try {
    const sources = await desktopCapturer.getSources({ types: ['screen'], thumbnailSize: { width: 1280, height: 720 } });
    if (sources.length > 0) {
      const img = sources[0].thumbnail.toDataURL(); // Base64
      screenshots.push({
        projectId: activeTimer.projectId,
        taskId: activeTimer.taskId,
        screenshotUrl: img,
        capturedAt: new Date().toISOString(),
        activityLevel: 100
      });
    }
  } catch (err) {
    console.error('Screenshot error', err);
  }
}

async function syncData(stopTimer = false) {
  if (!token) return;

  const payload = {
    activeTimers: stopTimer ? [] : [activeTimer],
    timeEntries: [...timeEntries],
    screenshots: [...screenshots],
    activityLogs: [...activityLogs],
    idlePeriods: [...idlePeriods],
    stopTimer
  };

  try {
    const res = await axios.post(`${API_BASE}/sync`, payload, {
      headers: { Authorization: `Bearer ${token}` }
    });
    if (res.data.success) {
      timeEntries.length = 0;
      screenshots.length = 0;
      activityLogs.length = 0;
      idlePeriods.length = 0;
    }
  } catch (err) {
    console.error('Sync error:', err.message);
  }
}
