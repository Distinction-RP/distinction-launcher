const { app, BrowserWindow, ipcMain, screen } = require('electron');
const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');
const os = require('os');

// Configuration du bypass
const REQUIRED_POOLS = { TxdStore: 26000 };
const REQUIRED_BUILD = "3258";

function patchCitizenFXIni() {
  try {
    const localAppData = app.getPath('localAppData');
    const iniPath = path.join(localAppData, 'FiveM', 'FiveM.app', 'CitizenFX.ini');
    let content = '';
    if (fs.existsSync(iniPath)) content = fs.readFileSync(iniPath, 'utf8');
    const poolJsonValue = JSON.stringify(REQUIRED_POOLS);
    let lines = content.split(/\r?\n/);
    let result = [];
    let inGameSection = false, gameFound = false, poolWritten = false, buildWritten = false;
    for (let line of lines) {
      const trimmed = line.trim();
      if (trimmed.startsWith('[') && trimmed.endsWith(']')) {
        if (inGameSection) {
          if (!poolWritten) result.push(`PoolSizesIncrease=${poolJsonValue}`);
          if (!buildWritten) result.push(`SavedBuildNumber=${REQUIRED_BUILD}`);
          poolWritten = true; buildWritten = true;
        }
        inGameSection = trimmed.toLowerCase() === '[game]';
        if (inGameSection) gameFound = true;
        result.push(line);
        continue;
      }
      if (inGameSection) {
        if (trimmed.toLowerCase().startsWith('poolsizesincrease=')) { result.push(`PoolSizesIncrease=${poolJsonValue}`); poolWritten = true; continue; }
        if (trimmed.toLowerCase().startsWith('savedbuildnumber=')) { result.push(`SavedBuildNumber=${REQUIRED_BUILD}`); buildWritten = true; continue; }
      }
      result.push(line);
    }
    if (inGameSection) {
      if (!poolWritten) result.push(`PoolSizesIncrease=${poolJsonValue}`);
      if (!buildWritten) result.push(`SavedBuildNumber=${REQUIRED_BUILD}`);
    } else if (!gameFound) {
      result.push('', '[Game]', `PoolSizesIncrease=${poolJsonValue}`, `SavedBuildNumber=${REQUIRED_BUILD}`);
    }
    fs.writeFileSync(iniPath, result.join('\r\n').trim() + '\r\n', 'utf8');
    return true;
  } catch (err) { return false; }
}

function createWindow() {
  const { width, height } = screen.getPrimaryDisplay().workAreaSize;
  const winWidth = 1200;
  const winHeight = 720;

  const win = new BrowserWindow({
    width: winWidth,
    height: winHeight,
    resizable: true,
    frame: false,
    transparent: true,
    center: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
      webviewTag: true, // IMPORTANT: Permet d'afficher les sites externes sans blocage
    },
  });

  if (process.env.NODE_ENV === 'development') {
    win.loadURL('http://localhost:5173');
  } else {
    win.loadFile(path.join(__dirname, 'dist/index.html'));
  }

  ipcMain.on('close-app', () => app.quit());
  ipcMain.on('minimize-app', () => win.minimize());
  ipcMain.on('maximize-app', () => {
    if (win.isMaximized()) win.unmaximize();
    else win.maximize();
  });

  ipcMain.on('launch-fivem', (event, serverAddress) => {
    patchCitizenFXIni();
    setTimeout(() => {
      const url = `fivem://connect/${serverAddress}`;
      spawn('explorer.exe', [url], { detached: true, stdio: 'ignore', shell: false }).unref();
    }, 200);
  });
}

app.whenReady().then(createWindow);
app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit(); });
