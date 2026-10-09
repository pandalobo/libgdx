// Multiplayer Module - Web Bluetooth & Simulated Peer Bluetooth Manager for Piano Beats

class MultiplayerManager {
  constructor() {
    this.isConnected = false;
    this.deviceName = null;
    this.rivalName = "Rival Bluetooth";
    this.rivalAvatar = "🤖";
    this.rivalScore = 0;
    this.rivalCombo = 0;
    this.rivalAccuracy = 100;
    this.rivalMultiplier = 1;
    this.rivalStars = 0;

    this.matchActive = false;
    this.selectedSongP1 = null;
    this.selectedSongP2 = null;
    this.chosenMatchSong = null;

    this.simulatedRivals = [
      { name: "BeatMaster_99", avatar: "⚡" },
      { name: "CyberPianist", avatar: "🚀" },
      { name: "NeonRider", avatar: "👑" },
      { name: "ShadowKeys", avatar: "🐯" }
    ];

    this.initElements();
  }

  initElements() {
    this.statusText = document.getElementById('bt-status-text');
    this.connectBtn = document.getElementById('bt-connect-btn');
    this.disconnectBtn = document.getElementById('bt-disconnect-btn');
    this.deviceList = document.getElementById('bt-device-list');
    this.mpRoomCard = document.getElementById('mp-room-card');
    this.rivalNameElem = document.getElementById('mp-rival-name');
    this.rivalAvatarElem = document.getElementById('mp-rival-avatar');
    this.pickSongBtn = document.getElementById('mp-pick-song-btn');
    this.randomSongBtn = document.getElementById('mp-random-song-btn');

    if (this.connectBtn) {
      this.connectBtn.addEventListener('click', () => this.scanBluetoothDevices());
    }

    if (this.disconnectBtn) {
      this.disconnectBtn.addEventListener('click', () => this.disconnect());
    }

    if (this.pickSongBtn) {
      this.pickSongBtn.addEventListener('click', () => this.submitPlayerSongChoice(false));
    }

    if (this.randomSongBtn) {
      this.randomSongBtn.addEventListener('click', () => this.submitPlayerSongChoice(true));
    }
  }

  async scanBluetoothDevices() {
    if (this.statusText) {
      this.statusText.textContent = "🔍 Escaneando dispositivos Bluetooth cercanos...";
    }
    if (this.deviceList) {
      this.deviceList.innerHTML = '<div class="loader-spinner"></div><p>Buscando señales Bluetooth LE...</p>';
    }

    // Try Web Bluetooth API if available in browser
    if (navigator.bluetooth) {
      try {
        const device = await navigator.bluetooth.requestDevice({
          acceptAllDevices: true
        });
        if (device) {
          this.connectToDevice(device.name || "Dispositivo Bluetooth");
          return;
        }
      } catch (err) {
        console.log("Web Bluetooth cancelled or unavailable, falling back to simulated Bluetooth peer search.");
      }
    }

    // Fallback simulated scan for seamless playing in sandbox/unsupported browsers
    setTimeout(() => {
      this.showAvailableDevices();
    }, 1200);
  }

  showAvailableDevices() {
    if (!this.deviceList) return;

    this.deviceList.innerHTML = '';
    const mockDevices = [
      { name: "Piano Beats Peer - " + this.simulatedRivals[0].name, rival: this.simulatedRivals[0] },
      { name: "Piano Beats Peer - " + this.simulatedRivals[1].name, rival: this.simulatedRivals[1] },
      { name: "Piano Beats Peer - " + this.simulatedRivals[2].name, rival: this.simulatedRivals[2] }
    ];

    mockDevices.forEach(d => {
      const devCard = document.createElement('div');
      devCard.className = 'bt-device-card';
      devCard.innerHTML = `
        <div class="dev-info">
          <span class="dev-icon">📱</span>
          <span class="dev-name">${d.name}</span>
        </div>
        <button class="btn btn-secondary btn-sm">Conectar</button>
      `;
      devCard.querySelector('button').addEventListener('click', () => {
        this.connectToDevice(d.rival.name, d.rival.avatar);
      });
      this.deviceList.appendChild(devCard);
    });

    if (this.statusText) {
      this.statusText.textContent = "Dispositivos encontrados. Selecciona uno para vincular por Bluetooth.";
    }
  }

  connectToDevice(name, avatar = "😎") {
    this.isConnected = true;
    this.rivalName = name;
    this.rivalAvatar = avatar;

    if (this.statusText) {
      this.statusText.textContent = `🟢 Conectado por Bluetooth a: ${this.rivalName}`;
    }
    if (this.connectBtn) this.connectBtn.classList.add('hidden');
    if (this.disconnectBtn) this.disconnectBtn.classList.remove('hidden');
    if (this.deviceList) this.deviceList.innerHTML = '';

    if (this.mpRoomCard) this.mpRoomCard.classList.remove('hidden');
    if (this.rivalNameElem) this.rivalNameElem.textContent = this.rivalName;
    if (this.rivalAvatarElem) this.rivalAvatarElem.textContent = this.rivalAvatar;
  }

  disconnect() {
    this.isConnected = false;
    this.rivalScore = 0;
    this.rivalCombo = 0;
    this.rivalAccuracy = 100;
    this.matchActive = false;

    if (this.statusText) {
      this.statusText.textContent = "🔴 Desconectado de Bluetooth.";
    }
    if (this.connectBtn) this.connectBtn.classList.remove('hidden');
    if (this.disconnectBtn) this.disconnectBtn.classList.add('hidden');
    if (this.mpRoomCard) this.mpRoomCard.classList.add('hidden');
    if (this.deviceList) this.deviceList.innerHTML = '';
  }

  submitPlayerSongChoice(isRandom = false) {
    if (!this.isConnected) return;

    const songsList = [
      { name: "Sintetizador Cósmico", duration: 180, bpm: 124 },
      { name: "Ritmo Ciberpunk", duration: 210, bpm: 135 },
      { name: "Batalla Electrónica", duration: 240, bpm: 145 },
      { name: "Depredador Épico 🔥", duration: 330, bpm: 160 }
    ];

    if (isRandom) {
      this.selectedSongP1 = songsList[Math.floor(Math.random() * songsList.length)];
    } else {
      const curTitle = window.audioManager ? window.audioManager.currentSongName : "Canción Seleccionada";
      const curDur = window.audioManager ? window.audioManager.durationSeconds : 150;
      this.selectedSongP1 = { name: curTitle, duration: curDur };
    }

    // Rival also chooses a song
    this.selectedSongP2 = songsList[Math.floor(Math.random() * songsList.length)];

    // 50/50 Random Selection between both proposed songs as requested
    const coinFlip = Math.random() < 0.5;
    this.chosenMatchSong = coinFlip ? this.selectedSongP1 : this.selectedSongP2;

    const choiceStatus = document.getElementById('mp-song-status');
    if (choiceStatus) {
      choiceStatus.innerHTML = `
        <div class="song-pick-modal">
          <p>🎮 <strong>Tú elegiste:</strong> ${this.selectedSongP1.name}</p>
          <p>🤖 <strong>${this.rivalName} eligió:</strong> ${this.selectedSongP2.name}</p>
          <div class="dice-animation">🎲 ¡Sorteando canción al azar...</div>
          <h3 class="highlight-text">🎶 Canción Seleccionada: "${this.chosenMatchSong.name}"</h3>
          <p>¡Iniciando partida multijugador en 3 segundos!</p>
        </div>
      `;
    }

    setTimeout(() => {
      this.startMultiplayerMatch(this.chosenMatchSong);
    }, 2800);
  }

  startMultiplayerMatch(song) {
    if (window.audioManager) {
      window.audioManager.generateDemoAudio(song.duration, song.name, song.bpm || 130);
    }

    this.matchActive = true;
    this.rivalScore = 0;
    this.rivalCombo = 0;
    this.rivalAccuracy = 100;

    // Switch screen to game
    if (window.switchScreen) {
      window.switchScreen('game-screen');
    }

    // Toggle Multiplayer HUD elements
    const rivalHud = document.getElementById('rival-hud-container');
    if (rivalHud) rivalHud.classList.remove('hidden');

    if (window.gameEngine) {
      window.gameEngine.isMultiplayer = true;
      window.gameEngine.startGame();
    }
  }

  updateRivalSimulation(p1Score, p1Combo, progressRatio) {
    if (!this.matchActive) return;

    // Realistic rival performance curves with small random variations
    const errorChance = Math.random();
    if (errorChance > 0.94) {
      this.rivalCombo = 0;
      this.rivalAccuracy = Math.max(70, this.rivalAccuracy - 1.5);
    } else {
      this.rivalCombo += 1;
      this.rivalScore += Math.floor(100 * (1 + Math.min(this.rivalCombo, 50) * 0.05));
    }

    // Update Rival HUD
    const rScoreElem = document.getElementById('hud-rival-score');
    const rComboElem = document.getElementById('hud-rival-combo');
    const rAccElem = document.getElementById('hud-rival-accuracy');

    if (rScoreElem) rScoreElem.textContent = this.rivalScore;
    if (rComboElem) rComboElem.textContent = `${this.rivalCombo}x`;
    if (rAccElem) rAccElem.textContent = `${Math.round(this.rivalAccuracy)}%`;
  }
}

window.multiplayerManager = new MultiplayerManager();
