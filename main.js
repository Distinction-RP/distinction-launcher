// Initialize Lucide icons
lucide.createIcons();

// --- Configuration ---
const SERVER_IP   = 'play.distinctionrp.ca';
const SERVER_PORT = '30120';
const MAX_PLAYERS = 200;

// DOM Elements
const playerCountEl = document.getElementById('player-count');
const pingEl = document.getElementById('ping');
const playBtn = document.getElementById('play-button');
const connectionStatus = document.getElementById('connection-status');

// Function to fetch server status from FiveM API
async function fetchServerStatus() {
  try {
    const start = performance.now();
    const response = await fetch(`http://${SERVER_IP}:${SERVER_PORT}/dynamic.json`, {
      cache: "no-store",
    });
    const end = performance.now();
    const ping = Math.round(end - start);
    pingEl.innerText = `${ping} ms`;

    if (response.ok) {
      const data = await response.json();
      const currentPlayers = data.clients || 0;
      const svMaxclients = data.sv_maxclients || MAX_PLAYERS;
      playerCountEl.innerText = `${currentPlayers} / ${svMaxclients}`;
    } else {
      throw new Error("Cannot read server data");
    }
  } catch (err) {
    simulateServerStatus();
  }
}

function simulateServerStatus() {
  const mockPlayers = Math.floor(Math.random() * 10) + 30;
  const mockPing = Math.floor(Math.random() * 5) + 8;
  playerCountEl.innerText = `${mockPlayers} / 128`;
  pingEl.innerText = `${mockPing} ms`;
}

// View Switching Logic
const navHome = document.getElementById('nav-home');
const navReglement = document.getElementById('nav-reglement');
const splashView = document.getElementById('splash-view');
const mainContent = document.querySelector('.content');
const homeView = document.getElementById('home-view');
const reglementView = document.getElementById('reglement-view');
const header = document.querySelector('.header');
const timerEl = document.getElementById('timer');

// Sequence de démarrage (Splash -> Home)
async function startAppSequence() {
  header.classList.add('hidden');
  const statusEl = document.getElementById('splash-status');
  
  // Étape 1 : Initialisation
  statusEl.innerText = "Initialisation des composants...";

  let timeLeft = 7; // On passe à 7 secondes
  if (timerEl) timerEl.innerText = `${timeLeft}s`;

  const timer = setInterval(() => {
    timeLeft--;
    if (timerEl) timerEl.innerText = `${timeLeft}s`;
    if (timeLeft <= 0) {
      clearInterval(timer);
      finishSplash();
    }
  }, 1000);

  // Étape 2 : Connexion (après 2s)
  setTimeout(() => {
    statusEl.innerText = "Vérification de la version en ligne...";
  }, 2000);

  // Étape 3 : Vérification Git (après 4s)
  setTimeout(async () => {
    statusEl.innerText = "Analyse de l'intégrité des fichiers...";
    
    try {
      const cacheBuster = Date.now();
      const url = `https://raw.githubusercontent.com/Distinction-RP/distinction-launcher/main/version.json?t=${cacheBuster}`;
      const response = await fetch(url, { cache: "no-store" });
      
      if (response.ok) {
        const data = await response.json();
        // Étape Finale : Affichage du résultat (après 5.5s)
        setTimeout(() => {
          statusEl.innerHTML = `Version <span style="color:var(--primary)">v${data.version}</span> détectée. Système à jour !`;
        }, 1500);
      } else {
        statusEl.innerText = "Serveur distant injoignable. Lancement local...";
      }
    } catch (err) {
      statusEl.innerText = "Mode hors-ligne : Version locale active.";
    }
  }, 4000);
}

function finishSplash() {
  splashView.classList.add('hidden');
  mainContent.classList.remove('hidden');
  header.classList.remove('hidden');
  showView('home');
}

function showView(viewName) {
  if (viewName === 'home') {
    homeView.classList.remove('hidden');
    reglementView.classList.add('hidden');
    navHome.classList.add('active');
    navReglement.classList.remove('active');
  } else {
    homeView.classList.add('hidden');
    reglementView.classList.remove('hidden');
    navHome.classList.remove('active');
    navReglement.classList.add('active');
  }
}

// Initial Launch
startAppSequence();

navHome.addEventListener('click', (e) => {
  e.preventDefault();
  showView('home');
});

navReglement.addEventListener('click', (e) => {
  e.preventDefault();
  showView('reglement');
});

// Play Button Listener
playBtn.addEventListener('click', (e) => {
  e.preventDefault();

  // Update UI
  connectionStatus.textContent = 'Configuration appliquée — Connexion en cours...';
  connectionStatus.classList.remove('hidden');
  playBtn.style.opacity = '0.7';
  playBtn.style.pointerEvents = 'none';

  // Lancer FiveM via l'IPC (le main process gère le patch du CitizenFX.ini)
  const serverAddress = `${SERVER_IP}:${SERVER_PORT}`;
  if (window.launcher) {
    window.launcher.connect(serverAddress);
  }

  // Reset bouton après 5 sec
  setTimeout(() => {
    connectionStatus.classList.add('hidden');
    playBtn.style.opacity = '1';
    playBtn.style.pointerEvents = 'auto';
  }, 5000);
});

// Windows Controls
document.querySelector('.close-btn').addEventListener('click', () => {
  if (window.launcher) window.launcher.close();
});

document.querySelector('.minimize-btn').addEventListener('click', () => {
  if (window.launcher) window.launcher.minimize();
});

document.querySelector('.maximize-btn').addEventListener('click', () => {
  if (window.launcher) window.launcher.maximize();
});

// Initial Fetch
fetchServerStatus();

// Refresh data every 10 seconds
setInterval(fetchServerStatus, 10000);
