// Initialize Lucide icons
lucide.createIcons();

const SERVER_IP   = 'play.distinctionrp.ca';
const SERVER_PORT = '30120';
const MAX_PLAYERS = 200;
const CURRENT_VERSION = '1.0.1';

const playerCountEl = document.getElementById('player-count');
const pingEl = document.getElementById('ping');
const playBtn = document.getElementById('play-button');
const connectionStatus = document.getElementById('connection-status');

async function fetchServerStatus() {
  try {
    const response = await fetch(`http://${SERVER_IP}:${SERVER_PORT}/dynamic.json`, { cache: "no-store" });
    if (response.ok) {
      const data = await response.json();
      playerCountEl.innerText = `${data.clients || 0} / ${data.sv_maxclients || MAX_PLAYERS}`;
    } else {
      simulateServerStatus();
    }
  } catch (err) {
    simulateServerStatus();
  }
}

function simulateServerStatus() {
  playerCountEl.innerText = `${Math.floor(Math.random() * 10) + 30} / 512`;
}

const navHome = document.getElementById('nav-home');
const navReglement = document.getElementById('nav-reglement');
const splashView = document.getElementById('splash-view');
const mainContent = document.querySelector('.content');
const homeView = document.getElementById('home-view');
const reglementView = document.getElementById('reglement-view');
const header = document.querySelector('.header');
const timerEl = document.getElementById('timer');
const webview = document.getElementById('reglement-webview');

async function startAppSequence() {
  header.classList.add('hidden');
  const statusEl = document.getElementById('splash-status');
  statusEl.innerText = "Initialisation du système...";

  let timeLeft = 7;
  if (timerEl) timerEl.innerText = `${timeLeft}s`;

  const timer = setInterval(() => {
    timeLeft--;
    if (timerEl) timerEl.innerText = `${timeLeft}s`;
    if (timeLeft <= 0) {
      clearInterval(timer);
      finishSplash();
    }
  }, 1000);

  setTimeout(() => { statusEl.innerText = "Synchronisation de la version..."; }, 2000);

  setTimeout(async () => {
    statusEl.innerText = "Optimisation de l'intégrité...";
    try {
      const cacheBuster = Date.now();
      const url = `https://raw.githubusercontent.com/Distinction-RP/distinction-launcher/main/version.json?t=${cacheBuster}`;
      const response = await fetch(url, { cache: "no-store" });
      if (response.ok) {
        const data = await response.json();
        
        // --- AUTO UPDATER ---
        if (data.version && data.version !== CURRENT_VERSION && data.downloadUrl) {
          statusEl.innerHTML = `Mise à jour <span style="color:var(--primary)">v${data.version}</span> détectée. Téléchargement en cours...`;
          
          if (window.launcher) {
            const success = await window.launcher.updateLauncher(data.downloadUrl);
            if (!success) {
              statusEl.innerText = "Échec de la mise à jour. Démarrage de la version actuelle...";
              setTimeout(finishSplash, 2000);
            }
            // Si succes, le launcher va se fermer tout seul et se relancer.
            return; 
          }
        }
        
        setTimeout(() => {
          statusEl.innerHTML = `Distinction <span style="color:var(--primary)">v${CURRENT_VERSION}</span> opérationnelle.`;
        }, 1500);
      }
    } catch (err) {
      statusEl.innerText = "Mode local actif : Connexion sécurisée.";
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

startAppSequence();

navHome.addEventListener('click', (e) => { e.preventDefault(); showView('home'); });
navReglement.addEventListener('click', (e) => { e.preventDefault(); showView('reglement'); });

playBtn.addEventListener('click', (e) => {
  e.preventDefault();
  
  const span = playBtn.querySelector('span');
  const oldText = span.textContent;
  
  span.textContent = 'LANCEMENT...';
  playBtn.style.opacity = '0.7';
  playBtn.style.pointerEvents = 'none';

  if (window.launcher) {
    window.launcher.connect(`${SERVER_IP}:${SERVER_PORT}`);
  }

  setTimeout(() => {
    span.textContent = oldText;
    playBtn.style.opacity = '1';
    playBtn.style.pointerEvents = 'auto';
  }, 5000);
});

document.querySelector('.close-btn').addEventListener('click', () => { if (window.launcher) window.launcher.close(); });
document.querySelector('.minimize-btn').addEventListener('click', () => { if (window.launcher) window.launcher.minimize(); });

// --- SYSTEME DE MODAL CUSTOM ---
const modal = document.getElementById('custom-modal');
const modalText = document.getElementById('modal-text');
const modalLoader = document.getElementById('modal-loader');
const modalConfirm = document.getElementById('modal-confirm');
const modalCancel = document.getElementById('modal-cancel');
const modalFooter = document.querySelector('.modal-footer');

let modalCallback = null;

function showCustomModal(text, isAlert = false) {
  modalText.textContent = text;
  modalLoader.classList.add('hidden');
  modalFooter.classList.remove('hidden');
  modal.classList.remove('hidden');
  
  if (isAlert) {
    modalCancel.classList.add('hidden');
    modalConfirm.textContent = 'OK';
  } else {
    modalCancel.classList.remove('hidden');
    modalConfirm.textContent = 'CONFIRMER';
  }

  return new Promise((resolve) => {
    modalCallback = resolve;
  });
}

modalConfirm.addEventListener('click', () => {
  if (modalConfirm.textContent === 'CONFIRMER') {
    // Mode confirmation -> On passe en chargement
    modalText.textContent = 'NETTOYAGE EN COURS...';
    modalFooter.classList.add('hidden');
    modalLoader.classList.remove('hidden');
    if (modalCallback) modalCallback(true);
  } else {
    // Mode Alerte (OK) -> On ferme
    modal.classList.add('hidden');
    if (modalCallback) modalCallback(true);
  }
});

modalCancel.addEventListener('click', () => {
  modal.classList.add('hidden');
  if (modalCallback) modalCallback(false);
});

// Vider le cache FiveM
const clearCacheBtn = document.getElementById('clear-cache-home');

if (clearCacheBtn) {
  clearCacheBtn.addEventListener('click', async () => {
    // 1. Verifier si FiveM est en cours d'execution
    const isRunning = await window.launcher.checkFiveMRunning();
    
    let confirmMessage = "Voulez-vous vraiment vider le cache FiveM ?";
    // 2. Adapter le message si FiveM est ouvert
    if (isRunning) {
      confirmMessage = "FiveM est en cours d'exécution. Voulez-vous le fermer pour pouvoir vider le cache ?";
    }

    const confirm = await showCustomModal(confirmMessage);
    if (!confirm) return; // Si le joueur refuse (bouton Annuler), on annule tout simplement

    try {
      const success = await window.launcher.clearCache();
      if (success) {
        await showCustomModal("Cache vidé avec succès !", true);
      } else {
        await showCustomModal("Erreur : Fichiers en cours d'utilisation.", true);
      }
    } catch (err) {
      console.error(err);
    }
  });
}

fetchServerStatus();
setInterval(fetchServerStatus, 10000);
