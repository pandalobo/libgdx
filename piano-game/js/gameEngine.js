// Game Engine - Handles HTML5 Canvas 4-Lane Render Loop, Note Spawning, Hit Logic, Long Notes, FX, and Multiplayer Sync

class GameEngine {
  constructor() {
    this.canvas = document.getElementById('game-canvas');
    this.ctx = this.canvas ? this.canvas.getContext('2d') : null;

    this.isPlaying = false;
    this.isPaused = false;
    this.isMultiplayer = false;
    this.currentDifficulty = 'easy';
    this.selectedSkin = 'default';

    this.notes = [];
    this.particles = [];
    this.lanes = 4;
    this.laneKeys = ['d', 'f', 'j', 'k'];
    this.keyState = [false, false, false, false];

    this.score = 0;
    this.combo = 0;
    this.maxCombo = 0;
    this.totalNotesHit = 0;
    this.totalNotesCount = 0;
    this.perfectHits = 0;
    this.greatHits = 0;
    this.misses = 0;

    this.hitFeedbackElem = document.getElementById('hit-feedback');

    this.initCanvas();
    this.initInputListeners();
  }

  initCanvas() {
    if (!this.canvas) return;
    this.resize();
    window.addEventListener('resize', () => this.resize());
  }

  resize() {
    if (!this.canvas || !this.canvas.parentElement) return;
    this.width = this.canvas.parentElement.clientWidth;
    this.height = this.canvas.parentElement.clientHeight;
    this.canvas.width = this.width;
    this.canvas.height = this.height;

    this.hitLineY = this.height - 110;
    this.laneWidth = this.width / this.lanes;

    if (this.notes && this.notes.length > 0) {
      for (let note of this.notes) {
        note.x = note.lane * this.laneWidth + this.laneWidth / 2;
      }
    }
  }

  initInputListeners() {
    window.addEventListener('keydown', (e) => {
      const key = e.key.toLowerCase();
      let laneIndex = -1;
      if (key === 'd' || key === 'a') laneIndex = 0;
      if (key === 'f' || key === 's') laneIndex = 1;
      if (key === 'j' || key === 'k') laneIndex = 2;
      if (key === 'k' || key === 'l') laneIndex = 3;

      if (laneIndex !== -1 && !this.keyState[laneIndex]) {
        this.keyState[laneIndex] = true;
        this.handleLanePress(laneIndex);
      }
    });

    window.addEventListener('keyup', (e) => {
      const key = e.key.toLowerCase();
      let laneIndex = -1;
      if (key === 'd' || key === 'a') laneIndex = 0;
      if (key === 'f' || key === 's') laneIndex = 1;
      if (key === 'j' || key === 'k') laneIndex = 2;
      if (key === 'k' || key === 'l') laneIndex = 3;

      if (laneIndex !== -1) {
        this.keyState[laneIndex] = false;
        this.handleLaneRelease(laneIndex);
      }
    });

    // Touch controls
    const touchBtns = document.querySelectorAll('.touch-lane-btn');
    touchBtns.forEach(btn => {
      const lane = parseInt(btn.dataset.lane);
      btn.addEventListener('touchstart', (e) => {
        e.preventDefault();
        btn.classList.add('pressed');
        this.keyState[lane] = true;
        this.handleLanePress(lane);
      });
      btn.addEventListener('touchend', (e) => {
        e.preventDefault();
        btn.classList.remove('pressed');
        this.keyState[lane] = false;
        this.handleLaneRelease(lane);
      });
      btn.addEventListener('mousedown', (e) => {
        e.preventDefault();
        btn.classList.add('pressed');
        this.keyState[lane] = true;
        this.handleLanePress(lane);
      });
      btn.addEventListener('mouseup', (e) => {
        e.preventDefault();
        btn.classList.remove('pressed');
        this.keyState[lane] = false;
        this.handleLaneRelease(lane);
      });
    });
  }

  setSkin(skinId) {
    this.selectedSkin = skinId;
  }

  setDifficulty(diff) {
    this.currentDifficulty = diff;
  }

  startGame() {
    this.resize();

    // Sound engine prep
    if (window.audioManager) {
      window.audioManager.stop();
    }

    // Chart Generation
    if (window.beatDetector && window.audioManager && window.audioManager.audioBuffer) {
      this.notes = window.beatDetector.generateChart(
        window.audioManager.audioBuffer,
        this.currentDifficulty,
        this.width,
        this.height,
        this.hitLineY
      );
    } else {
      this.notes = [];
    }

    this.totalNotesCount = this.notes.length;
    this.score = 0;
    this.combo = 0;
    this.maxCombo = 0;
    this.totalNotesHit = 0;
    this.perfectHits = 0;
    this.greatHits = 0;
    this.misses = 0;
    this.particles = [];

    this.isPlaying = true;
    this.isPaused = false;

    this.updateHUD();

    // Start 3-2-1 Countdown before playing music and loop
    this.startCountdown(() => {
      if (window.audioManager) {
        window.audioManager.play(0);
      }
      requestAnimationFrame(() => this.gameLoop());
    });
  }

  startCountdown(onComplete) {
    const overlay = document.getElementById('countdown-overlay');
    const numElem = document.getElementById('countdown-number');

    if (!overlay || !numElem) {
      if (onComplete) onComplete();
      return;
    }

    overlay.classList.remove('hidden');
    let count = 3;
    numElem.textContent = count;
    numElem.className = 'countdown-number animate';

    const interval = setInterval(() => {
      count--;
      if (count > 0) {
        numElem.textContent = count;
        numElem.className = 'countdown-number animate';
      } else if (count === 0) {
        numElem.textContent = '¡YA!';
        numElem.className = 'countdown-number animate go';
      } else {
        clearInterval(interval);
        overlay.classList.add('hidden');
        if (onComplete) onComplete();
      }
    }, 800);
  }

  pauseGame() {
    this.isPaused = !this.isPaused;
    if (window.audioManager) {
      if (this.isPaused) window.audioManager.pause();
      else window.audioManager.play(window.audioManager.getCurrentTime());
    }
  }

  handleLanePress(lane) {
    if (!this.isPlaying || this.isPaused) return;

    const currentTime = window.audioManager ? window.audioManager.getCurrentTime() : 0;
    const hitWindow = 0.16; // 160ms window

    let candidate = null;
    let minTimeDiff = Infinity;

    for (let note of this.notes) {
      if (note.lane === lane && !note.hit && !note.missed) {
        const diff = Math.abs(note.time - currentTime);
        if (diff < hitWindow && diff < minTimeDiff) {
          minTimeDiff = diff;
          candidate = note;
        }
      }
    }

    if (candidate) {
      candidate.hit = true;
      this.totalNotesHit++;

      if (candidate.type === 'long') {
        candidate.holding = true;
      }

      if (minTimeDiff < 0.06) {
        this.registerHit('PERFECT', lane, candidate.x);
        this.perfectHits++;
      } else {
        this.registerHit('GREAT', lane, candidate.x);
        this.greatHits++;
      }
    } else {
      // Small penalty for misclick
      this.combo = 0;
      this.updateHUD();
    }
  }

  handleLaneRelease(lane) {
    for (let note of this.notes) {
      if (note.lane === lane && note.type === 'long' && note.holding) {
        note.holding = false;
      }
    }
  }

  registerHit(quality, lane, x) {
    let pts = quality === 'PERFECT' ? 300 : 150;
    this.combo++;
    if (this.combo > this.maxCombo) this.maxCombo = this.combo;

    const multiplier = 1 + Math.floor(this.combo / 10) * 0.2;
    this.score += Math.floor(pts * multiplier);

    this.showHitPopup(quality);
    this.spawnHitParticles(x, this.hitLineY, quality);
    this.updateHUD();
  }

  showHitPopup(text) {
    if (!this.hitFeedbackElem) return;
    this.hitFeedbackElem.textContent = text;
    this.hitFeedbackElem.className = `hit-popup ${text.toLowerCase()}`;
    this.hitFeedbackElem.style.opacity = '1';
    this.hitFeedbackElem.style.transform = 'translate(-50%, -50%) scale(1.2)';

    setTimeout(() => {
      this.hitFeedbackElem.style.opacity = '0';
      this.hitFeedbackElem.style.transform = 'translate(-50%, -50%) scale(0.9)';
    }, 250);
  }

  spawnHitParticles(x, y, quality) {
    const color = quality === 'PERFECT' ? '#00ff88' : '#00f2fe';
    const count = this.selectedSkin === 'ruby' ? 24 : 14;

    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = Math.random() * 6 + 2;
      this.particles.push({
        x: x,
        y: y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 2,
        radius: Math.random() * 4 + 2,
        color: color,
        alpha: 1,
        life: 1
      });
    }
  }

  updateHUD() {
    const scoreElem = document.getElementById('hud-score');
    const comboElem = document.getElementById('hud-combo');
    const accElem = document.getElementById('hud-accuracy');

    if (scoreElem) scoreElem.textContent = this.score;
    if (comboElem) comboElem.textContent = `${this.combo}x`;

    const totalProcessed = this.totalNotesHit + this.misses;
    const accuracy = totalProcessed > 0
      ? Math.round(((this.perfectHits * 100 + this.greatHits * 70) / (totalProcessed * 100)) * 100)
      : 100;

    if (accElem) accElem.textContent = `${accuracy}%`;
  }

  gameLoop() {
    if (!this.isPlaying) return;

    if (!this.isPaused) {
      this.update();
      this.render();
    }

    requestAnimationFrame(() => this.gameLoop());
  }

  update() {
    const currentTime = window.audioManager ? window.audioManager.getCurrentTime() : 0;
    const songDuration = window.audioManager ? window.audioManager.durationSeconds : 150;

    // Check song finish condition
    if (currentTime >= songDuration || (this.notes.length > 0 && this.notes.every(n => n.hit || n.missed))) {
      setTimeout(() => this.endGame(), 500);
      return;
    }

    // Update notes positions and miss detection
    for (let note of this.notes) {
      if (note.hit) {
        if (note.type === 'long' && note.holding) {
          const holdProgress = (currentTime - note.time) / note.duration;
          if (holdProgress >= 1) {
            note.holding = false;
          } else {
            this.score += 5;
            this.spawnHitParticles(note.x, this.hitLineY, 'PERFECT');
          }
        }
        continue;
      }

      const timeUntilHit = note.time - currentTime;
      note.y = this.hitLineY - (timeUntilHit * note.speed);

      // Miss check
      if (currentTime > note.time + 0.18 && !note.hit && !note.missed) {
        note.missed = true;
        this.misses++;
        this.combo = 0;
        this.showHitPopup('MISS');
        this.updateHUD();
      }
    }

    // Update Particles
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.x += p.vx;
      p.y += p.vy;
      p.alpha -= 0.03;
      if (p.alpha <= 0) {
        this.particles.splice(i, 1);
      }
    }

    // Multiplayer real-time sync
    if (this.isMultiplayer && window.multiplayerManager) {
      window.multiplayerManager.updateRivalSimulation(
        this.score,
        this.combo,
        currentTime / songDuration
      );
    }
  }

  render() {
    if (!this.ctx) return;
    this.ctx.clearRect(0, 0, this.width, this.height);

    // Theme Background
    if (this.currentDifficulty === 'predator') {
      this.ctx.fillStyle = '#0f0203';
    } else {
      this.ctx.fillStyle = '#080a14';
    }
    this.ctx.fillRect(0, 0, this.width, this.height);

    // Draw Lanes
    for (let i = 0; i < this.lanes; i++) {
      const laneX = i * this.laneWidth;

      // Lane separator
      this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
      this.ctx.lineWidth = 1;
      this.ctx.beginPath();
      this.ctx.moveTo(laneX, 0);
      this.ctx.lineTo(laneX, this.height);
      this.ctx.stroke();

      // Pressed Lane Flash
      if (this.keyState[i]) {
        const gradient = this.ctx.createLinearGradient(0, 0, 0, this.height);
        if (this.currentDifficulty === 'predator') {
          gradient.addColorStop(0, 'rgba(255, 30, 39, 0)');
          gradient.addColorStop(1, 'rgba(255, 30, 39, 0.35)');
        } else {
          gradient.addColorStop(0, 'rgba(0, 242, 254, 0)');
          gradient.addColorStop(1, 'rgba(0, 242, 254, 0.3)');
        }
        this.ctx.fillStyle = gradient;
        this.ctx.fillRect(laneX, 0, this.laneWidth, this.height);
      }
    }

    // Draw Hit Line
    const lineGlow = this.ctx.createLinearGradient(0, this.hitLineY - 5, 0, this.hitLineY + 5);
    const lineColor = this.currentDifficulty === 'predator' ? '#ff1e27' : '#00f2fe';
    lineGlow.addColorStop(0, 'transparent');
    lineGlow.addColorStop(0.5, lineColor);
    lineGlow.addColorStop(1, 'transparent');

    this.ctx.fillStyle = lineGlow;
    this.ctx.fillRect(0, this.hitLineY - 10, this.width, 20);

    // Draw Notes
    for (let note of this.notes) {
      if (note.missed || (note.hit && note.type === 'short')) continue;

      const laneX = note.lane * this.laneWidth;
      const noteMargin = 8;
      const noteW = this.laneWidth - (noteMargin * 2);

      let skinColor = '#00f2fe';
      if (this.selectedSkin === 'gold') skinColor = '#ffd700';
      if (this.selectedSkin === 'ruby') skinColor = '#e6005c';
      if (this.currentDifficulty === 'predator') skinColor = '#ff1e27';

      if (note.type === 'long') {
        const tailLength = note.duration * note.speed;
        const tailY = note.y - tailLength;

        // Draw long note trail
        this.ctx.fillStyle = skinColor;
        this.ctx.globalAlpha = 0.4;
        this.ctx.fillRect(laneX + noteMargin + 10, Math.max(0, tailY), noteW - 20, Math.min(note.y, this.hitLineY) - tailY);
        this.ctx.globalAlpha = 1.0;
      }

      // Draw Note Head
      if (!note.hit && note.y > -50 && note.y < this.height + 50) {
        this.ctx.fillStyle = skinColor;
        this.ctx.shadowColor = skinColor;
        this.ctx.shadowBlur = 12;

        const noteH = 24;
        if (this.ctx.roundRect) {
          this.ctx.beginPath();
          this.ctx.roundRect(laneX + noteMargin, note.y - noteH / 2, noteW, noteH, 6);
          this.ctx.fill();
        } else {
          this.ctx.fillRect(laneX + noteMargin, note.y - noteH / 2, noteW, noteH);
        }

        this.ctx.shadowBlur = 0;
      }
    }

    // Draw Particles
    for (let p of this.particles) {
      this.ctx.globalAlpha = p.alpha;
      this.ctx.fillStyle = p.color;
      this.ctx.beginPath();
      this.ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
      this.ctx.fill();
    }
    this.ctx.globalAlpha = 1.0;
  }

  endGame() {
    this.isPlaying = false;
    if (window.audioManager) window.audioManager.stop();

    const totalProcessed = this.totalNotesHit + this.misses;
    const accuracy = totalProcessed > 0
      ? Math.round(((this.perfectHits * 100 + this.greatHits * 70) / (totalProcessed * 100)) * 100)
      : 100;

    // Calculate Stars as requested
    let starsCount = 0;
    if (accuracy >= 100) starsCount = 7;
    else if (accuracy >= 92) starsCount = 6;
    else if (accuracy >= 84) starsCount = 5;
    else if (accuracy >= 75) starsCount = 4;
    else if (accuracy >= 65) starsCount = 3;
    else if (accuracy >= 50) starsCount = 2;
    else if (accuracy > 0) starsCount = 1;

    let isRubyStarGranted = false;
    if (this.currentDifficulty === 'predator') {
      isRubyStarGranted = true; // Completing Predator mode grants the special 8th Red Ruby Star
    }

    // Calculate coin rewards
    const coinReward = Math.floor(this.score / 20) + (starsCount * 20) + (isRubyStarGranted ? 150 : 0);

    // Save profile progress
    if (window.profileShop) {
      window.profileShop.addGameResults(
        coinReward,
        starsCount,
        isRubyStarGranted,
        this.perfectHits
      );
    }

    // Multiplayer Victory / Defeat check
    let mpBannerText = "";
    let isVictory = false;

    if (this.isMultiplayer && window.multiplayerManager) {
      const rivalScore = window.multiplayerManager.rivalScore;
      if (this.score >= rivalScore) {
        isVictory = true;
        mpBannerText = `🏆 ¡VICTORIA! Venciste a ${window.multiplayerManager.rivalName} (${this.score} vs ${rivalScore})`;
      } else {
        isVictory = false;
        mpBannerText = `💔 DERROTA. ${window.multiplayerManager.rivalName} te superó (${rivalScore} vs ${this.score})`;
      }
    }

    // Show Results Modal
    this.showResultsModal(accuracy, starsCount, isRubyStarGranted, coinReward, mpBannerText, isVictory);
  }

  showResultsModal(accuracy, starsCount, isRubyStar, coins, mpBannerText, isVictory) {
    const modal = document.getElementById('results-modal');
    const scoreElem = document.getElementById('result-score');
    const accElem = document.getElementById('result-accuracy');
    const comboElem = document.getElementById('result-combo');
    const coinsElem = document.getElementById('result-coins');
    const starsElem = document.getElementById('result-stars');
    const mpVsBanner = document.getElementById('multiplayer-vs-banner');

    if (scoreElem) scoreElem.textContent = this.score;
    if (accElem) accElem.textContent = `${accuracy}%`;
    if (comboElem) comboElem.textContent = `${this.maxCombo}x`;
    if (coinsElem) coinsElem.textContent = `+${coins} 🪙`;

    if (starsElem) {
      let starsHTML = '';
      for (let i = 0; i < starsCount; i++) {
        starsHTML += '⭐';
      }
      if (isRubyStar) {
        starsHTML += ' <span class="ruby-star-icon">💎🔴 (8ª Estrella Roja)</span>';
      }
      starsElem.innerHTML = starsHTML || '🌑';
    }

    if (mpVsBanner) {
      if (this.isMultiplayer && mpBannerText) {
        mpVsBanner.classList.remove('hidden');
        mpVsBanner.className = `mp-vs-banner ${isVictory ? 'victory' : 'defeat'}`;
        mpVsBanner.textContent = mpBannerText;
      } else {
        mpVsBanner.classList.add('hidden');
      }
    }

    if (modal) modal.classList.remove('hidden');
  }
}

window.gameEngine = new GameEngine();
