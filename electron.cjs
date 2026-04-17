const { app, BrowserWindow, ipcMain, screen } = require('electron');

// --- BRANDING INITIALIZATION ---
app.setName('DISTINCTION RP');
if (process.platform === 'win32') {
  app.setAppUserModelId('distinction.rp.v3');
}

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
    title: "DISTINCTION RP",
    icon: path.join(__dirname, 'logo.png'),
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
    win.loadFile(path.join(__dirname, 'index.html'));
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
      
      // Ferme automatiquement le launcher 3 secondes apres avoir envoye la requete a FiveM
      setTimeout(() => {
        app.quit();
      }, 3000);
    }, 200);
  });

  ipcMain.handle('check-fivem-running', () => {
    try {
      const { execSync } = require('child_process');
      const stdout = execSync('tasklist /FI "IMAGENAME eq FiveM*" /FO CSV /NH', { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] });
      return stdout.toLowerCase().includes('fivem');
    } catch (e) {
      return false;
    }
  });

  ipcMain.handle('clear-cache', async () => {
    try {
      const { execSync } = require('child_process');
      
      // Force la fermeture de FiveM avant de nettoyer
      try {
        execSync('taskkill /F /IM FiveM* /T', { stdio: 'ignore' });
        // Petit délai pour s'assurer que Windows libère les fichiers
        await new Promise(resolve => setTimeout(resolve, 500));
      } catch (e) { 
        // L'erreur signifie simplement que FiveM n'est pas ouvert
      }

      const localAppData = process.env.LOCALAPPDATA || path.join(process.env.USERPROFILE, 'AppData', 'Local');
      
      const targets = [
        path.join(localAppData, 'FiveM', 'FiveM.app'),
        path.join(localAppData, 'FiveM', 'FiveM Application Data'),
        path.join(localAppData, 'FiveM') // Au cas ou c'est a la racine de FiveM
      ];

      for (const base of targets) {
        const folders = [
          path.join(base, 'data', 'cache'),
          path.join(base, 'data', 'server-cache'),
          path.join(base, 'data', 'server-cache-priv'),
          path.join(base, 'crashes'),
          path.join(base, 'logs')
        ];

        for (const f of folders) {
          if (fs.existsSync(f)) {
            try {
              // Commande Windows musclée pour tout virer
              execSync(`rmdir /s /q "${f}"`);
            } catch (e) {
              // Si rmdir echoue (fichier lock), on tente la methode Node
              try { fs.rmSync(f, { recursive: true, force: true }); } catch (e2) {}
            }
          }
        }
      }
      return true;
    } catch (err) {
      console.error('Erreur finale force brute:', err);
      return true;
    }
  });
  ipcMain.handle('update-launcher', async (event, downloadUrl) => {
    try {
      // Trouver le chemin de l'executable d'origine (sur le bureau) via les arguments du Loader C#
      const originExe = process.argv.length > 1 ? process.argv[process.argv.length - 1] : '';
      if (!originExe.toLowerCase().endsWith('.exe')) return false;

      // Telecharger la nouvelle version
      const response = await fetch(downloadUrl);
      if (!response.ok) return false;
      
      const buffer = await response.arrayBuffer();
      
      // Ecraser l'ancien fichier sur le bureau (possible car le loader C# est deja ferme)
      fs.writeFileSync(originExe, Buffer.from(buffer));
      
      // Relancer silencieusement
      spawn(originExe, [], { detached: true, stdio: 'ignore' }).unref();
      app.quit();
      return true;
    } catch (err) {
      console.error("Erreur de mise à jour: ", err);
      return false;
    }
  });

}

app.whenReady().then(createWindow);
app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit(); });
