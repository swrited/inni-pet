const { app, BrowserWindow, ipcMain, screen, systemPreferences } = require('electron');
const path = require('path');

app.commandLine.appendSwitch('log-level', '3');

let mainWindow = null;
let cursorTrackingTimer = null;
let isDragging = false;
let dragOffset = { x: 0, y: 0 };

async function requestMicrophonePermission() {
  if (process.platform === 'darwin') {
    try {
      const status = systemPreferences.getMediaAccessStatus('microphone');
      console.log('[Main] 麦克风权限状态:', status);
      if (status !== 'granted') {
        const granted = await systemPreferences.askForMediaAccess('microphone');
        console.log('[Main] 麦克风权限请求结果:', granted);
        return granted;
      }
    } catch (e) {
      console.log('[Main] 麦克风权限检查跳过:', e.message);
    }
  }
  return true;
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 380,
    height: 380,
    frame: false,
    transparent: true,
    alwaysOnTop: true,
    resizable: false,
    skipTaskbar: true,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js'),
      webSecurity: false,
      allowRunningInsecureContent: true,
      devTools: true,
      enableRemoteModule: false
    }
  });

  mainWindow.loadFile('index.html');

  // Position at bottom right
  const primaryDisplay = screen.getPrimaryDisplay();
  const { width, height } = primaryDisplay.workAreaSize;
  mainWindow.setPosition(width - 400, height - 400);

  // 打开开发者工具用于调试
  mainWindow.webContents.openDevTools();

  // 在窗口加载后请求麦克风权限
  mainWindow.webContents.on('did-finish-load', async () => {
    await requestMicrophonePermission();
    startCursorTracking();
  });

  mainWindow.webContents.on('console-message', (event, ...args) => {
    const details = typeof args[0] === 'object'
      ? args[0]
      : { message: args[1], sourceId: args[2], lineNumber: args[3] };
    const message = details.message;
    if (!message || message === 'undefined') return;
    if (message.startsWith('Uncaught')) {
      console.log(`${message} (${details.sourceId}:${details.lineNumber})`);
      return;
    }
    console.log(message);
  });

  mainWindow.webContents.on('before-input-event', (event, input) => {
    if (input.type === 'mouseDown' && input.button === 'left') {
      mainWindow?.webContents.send('pet-click');
    }
  });

  mainWindow.on('closed', () => {
    stopCursorTracking();
    mainWindow = null;
  });
}

function startCursorTracking() {
  stopCursorTracking();
  cursorTrackingTimer = setInterval(() => {
    if (!mainWindow || mainWindow.isDestroyed()) return;

    const cursor = screen.getCursorScreenPoint();

    if (isDragging) {
      // 拖拽模式：移动窗口
      const newX = cursor.x - dragOffset.x;
      const newY = cursor.y - dragOffset.y;
      mainWindow.setPosition(Math.round(newX), Math.round(newY));
    }

    mainWindow.webContents.send('cursor-position', {
      cursor: cursor,
      windowBounds: mainWindow.getBounds()
    });
  }, 33);
}

function stopCursorTracking() {
  if (cursorTrackingTimer) {
    clearInterval(cursorTrackingTimer);
    cursorTrackingTimer = null;
  }
}

app.whenReady().then(() => {
  createWindow();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// IPC
ipcMain.on('hide-window', () => {
  mainWindow?.hide();
});

ipcMain.on('start-drag', () => {
  if (!mainWindow || mainWindow.isDestroyed()) return;
  const cursor = screen.getCursorScreenPoint();
  const bounds = mainWindow.getBounds();
  dragOffset = {
    x: cursor.x - bounds.x,
    y: cursor.y - bounds.y
  };
  isDragging = true;
});

ipcMain.on('stop-drag', () => {
  isDragging = false;
});
