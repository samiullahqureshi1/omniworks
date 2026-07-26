const { app, BrowserWindow, ipcMain, desktopCapturer, Tray, Menu } = require('electron');
const path = require('path');
const axios = require('axios');
const fs = require('fs');
const { exec } = require('child_process');

let mainWindow;
let tray = null;
let timerInterval = null;
let screenshotInterval = null;
let syncInterval = null;
let forceQuit = false;

let token = null;
let activeTimer = null;
let lastActivityTime = Date.now();
let isIdle = false;

// Mock local storage
const timeEntries = [];
const screenshots = [];
const activityLogs = [];
const idlePeriods = [];

const API_BASE = 'https://omniwork.vercel.app/api/desktop';

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 900,
    minHeight: 600,
    icon: path.join(__dirname, 'icon.png'),
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true
    }
  });

  const appUrl = process.env.DESKTOP_APP_URL || 'http://localhost:3000/desktop';
  mainWindow.loadURL(appUrl).catch(() => {
    mainWindow.loadFile('index.html');
  });

  mainWindow.on('close', (event) => {
    if (activeTimer && !forceQuit) {
      event.preventDefault();
      mainWindow.hide();
    }
  });
}

function updateTrayMenu() {
  if (!tray) return;

  if (activeTimer) {
    const contextMenu = Menu.buildFromTemplate([
      { label: 'Status: Tracking Active', enabled: false },
      { type: 'separator' },
      { label: 'Show App', click: () => mainWindow.show() },
      { 
        label: 'Stop Tracking', 
        click: async () => {
          stopTrackingLogic();
          mainWindow.show();
          mainWindow.webContents.send('force-ui-stop');
        } 
      },
      { type: 'separator' },
      { 
        label: 'Quit', 
        click: () => {
          forceQuit = true;
          app.quit();
        } 
      }
    ]);
    tray.setContextMenu(contextMenu);
    tray.setToolTip('OmniWork - Tracking Active');
  } else {
    const contextMenu = Menu.buildFromTemplate([
      { label: 'Status: Not Tracking', enabled: false },
      { type: 'separator' },
      { label: 'Show App', click: () => mainWindow.show() },
      { type: 'separator' },
      { 
        label: 'Quit', 
        click: () => {
          forceQuit = true;
          app.quit();
        } 
      }
    ]);
    tray.setContextMenu(contextMenu);
    tray.setToolTip('OmniWork');
  }
}

app.whenReady().then(() => {
  if (process.platform === 'darwin') {
    app.dock.setIcon(path.join(__dirname, 'icon.png'));
  }

  const trayIconPath = path.join(__dirname, 'tray_icon.png');
  const icon = require('electron').nativeImage.createFromPath(trayIconPath).resize({ width: 22, height: 22 });
  tray = new Tray(icon);
  updateTrayMenu();

  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin' && !activeTimer) {
    app.quit();
  }
});

app.on('before-quit', (e) => {
  if (activeTimer && !forceQuit) {
    e.preventDefault();
    forceQuit = true;
    stopTrackingLogic().then(() => {
      app.quit();
    });
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

ipcMain.handle('get-recent-memos', async () => {
  if (!token) return { memos: [] };
  try {
    const res = await axios.get(`${API_BASE}/memos`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    return res.data;
  } catch (err) {
    return { memos: [] };
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
    idleStartedAt: null,
    notes: data.notes || null
  };

  lastActivityTime = Date.now();
  
  if (mainWindow) {
    mainWindow.hide();
  }
  updateTrayMenu();

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
  }, 5 * 60 * 1000); // Every 5 minutes

  syncInterval = setInterval(async () => {
    await syncData();
  }, 3 * 60 * 1000); // Sync time every 3 minutes

  event.reply('status-update', { status: 'active' });
});

async function stopTrackingLogic() {
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

  activeTimer = null;
  isIdle = false;
  updateTrayMenu();
  await syncData(true);
}

ipcMain.on('stop-timer', async (event) => {
  await stopTrackingLogic();
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
      return;
    }
  } catch (err) {
    console.error('Electron desktopCapturer error:', err.message);
  }

  // Fallback to native macOS screencapture if Electron fails or permissions are tricky
  if (process.platform === 'darwin') {
    const tmpPath = path.join(app.getPath('temp'), `screenshot-${Date.now()}.jpg`);
    exec(`screencapture -x -t jpg "${tmpPath}"`, (error) => {
      if (!error && fs.existsSync(tmpPath)) {
        const base64Data = fs.readFileSync(tmpPath, { encoding: 'base64' });
        const img = `data:image/jpeg;base64,${base64Data}`;
        screenshots.push({
          projectId: activeTimer.projectId,
          taskId: activeTimer.taskId,
          screenshotUrl: img,
          capturedAt: new Date().toISOString(),
          activityLevel: 100
        });
        fs.unlinkSync(tmpPath);
      } else {
        console.error('Native screencapture also failed:', error);
      }
    });
  }
}

async function syncData(stopTimer = false) {
  if (!token) return;

  const payload = {
    activeTimers: activeTimer && !stopTimer ? [activeTimer] : [],
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
