// Audio Module - Handles File Uploads, Drag & Drop, Duration Validation (10 min max), AudioContext, and Audio Synthesis

class AudioManager {
  constructor() {
    this.audioCtx = null;
    this.audioBuffer = null;
    this.currentSongName = "Canción Demostración (Sintetizada)";
    this.durationSeconds = 150; // 2 min 30s default demo
    this.isPredatorUnlocked = false;
    this.maxAllowedSeconds = 600; // 10 minutes limit
    this.predatorThresholdSeconds = 300; // 5 minutes threshold
    this.sourceNode = null;
    this.analyserNode = null;
    this.isPlaying = false;
    this.startTime = 0;
    this.pauseOffset = 0;

    this.initElements();
  }

  ensureAudioContext() {
    if (!this.audioCtx) {
      this.audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    }
    if (this.audioCtx.state === 'suspended') {
      this.audioCtx.resume();
    }
  }

  initElements() {
    this.fileInput = document.getElementById('audio-file-input');
    this.dropzone = document.getElementById('upload-dropzone');
    this.statusElem = document.getElementById('upload-status');
    this.songTitleElem = document.getElementById('current-song-title');
    this.songDurationElem = document.getElementById('current-song-duration');
    this.predatorBadge = document.getElementById('predator-status-badge');
    this.predatorBtn = document.getElementById('predator-btn');
    this.randomSongBtn = document.getElementById('random-song-btn');

    if (this.fileInput) {
      this.fileInput.addEventListener('change', (e) => this.handleFileUpload(e.target.files[0]));
    }

    if (this.dropzone) {
      ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
        this.dropzone.addEventListener(eventName, (e) => {
          e.preventDefault();
          e.stopPropagation();
        }, false);
      });

      ['dragenter', 'dragover'].forEach(eventName => {
        this.dropzone.addEventListener(eventName, () => this.dropzone.classList.add('drag-active'), false);
      });

      ['dragleave', 'drop'].forEach(eventName => {
        this.dropzone.addEventListener(eventName, () => this.dropzone.classList.remove('drag-active'), false);
      });

      this.dropzone.addEventListener('drop', (e) => {
        const dt = e.dataTransfer;
        const file = dt.files[0];
        if (file) {
          this.handleFileUpload(file);
        }
      });
    }

    if (this.randomSongBtn) {
      this.randomSongBtn.addEventListener('click', () => this.generateRandomSong());
    }

    // Generate initial audio
    setTimeout(() => {
      this.generateDemoAudio(150, "Canción Demostración (Sintetizada)");
    }, 100);
  }

  formatTime(seconds) {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }

  async handleFileUpload(file) {
    if (!file) return;

    this.ensureAudioContext();
    this.statusElem.className = 'status-message';
    this.statusElem.textContent = '📂 Cargando y procesando archivo de audio...';

    try {
      const arrayBuffer = await file.arrayBuffer();
      const decodedBuffer = await this.audioCtx.decodeAudioData(arrayBuffer);

      const duration = decodedBuffer.duration;

      if (duration > this.maxAllowedSeconds) {
        this.statusElem.className = 'status-message error';
        this.statusElem.textContent = `❌ Error: La canción dura ${this.formatTime(duration)}, superando el límite máximo de 10 minutos (600s). Por favor elige una canción más corta.`;
        if (this.fileInput) this.fileInput.value = '';
        return;
      }

      this.audioBuffer = decodedBuffer;
      this.currentSongName = file.name.replace(/\.[^/.]+$/, "");
      this.durationSeconds = duration;

      this.updateSongUI();
      this.statusElem.className = 'status-message success';
      this.statusElem.textContent = `¡Canción "${this.currentSongName}" cargada con éxito! (${this.formatTime(duration)})`;

      if (window.onSongLoaded) {
        window.onSongLoaded(this.audioBuffer, this.isPredatorUnlocked);
      }
    } catch (err) {
      console.error(err);
      this.statusElem.className = 'status-message error';
      this.statusElem.textContent = '❌ Error al procesar el archivo. Asegúrate de subir un formato válido (MP3, WAV, OGG, M4A).';
    }
  }

  updateSongUI() {
    if (this.songTitleElem) this.songTitleElem.textContent = this.currentSongName;
    if (this.songDurationElem) this.songDurationElem.textContent = `Duración: ${this.formatTime(this.durationSeconds)}`;

    if (this.durationSeconds > this.predatorThresholdSeconds) {
      this.isPredatorUnlocked = true;
      if (this.predatorBadge) {
        this.predatorBadge.className = 'badge unlocked';
        this.predatorBadge.textContent = '🔥 Modo Depredador Desbloqueado! (>5 min)';
      }
      if (this.predatorBtn) {
        this.predatorBtn.classList.remove('disabled');
        this.predatorBtn.title = '¡Modo Depredador Activado!';
      }
    } else {
      this.isPredatorUnlocked = false;
      if (this.predatorBadge) {
        this.predatorBadge.className = 'badge locked';
        this.predatorBadge.textContent = '🔒 Modo Depredador Bloqueado (Canción < 5 min)';
      }
      if (this.predatorBtn) {
        this.predatorBtn.classList.add('disabled');
        this.predatorBtn.title = 'Requiere canción superior a 5 minutos';
        if (this.predatorBtn.classList.contains('active')) {
          const medBtn = document.querySelector('.diff-btn[data-diff="medium"]');
          if (medBtn) medBtn.click();
        }
      }
    }
  }

  generateRandomSong() {
    this.ensureAudioContext();
    const presets = [
      { name: "Sintetizador Cósmico", duration: 180, bpm: 124, scale: [261.63, 293.66, 329.63, 392.00, 440.00] },
      { name: "Ritmo Ciberpunk", duration: 210, bpm: 135, scale: [220.00, 246.94, 261.63, 293.66, 329.63, 349.23] },
      { name: "Batalla Electrónica", duration: 240, bpm: 145, scale: [174.61, 196.00, 220.00, 261.63, 293.66] },
      { name: "Depredador Épico 🔥", duration: 330, bpm: 160, scale: [130.81, 146.83, 155.56, 174.61, 196.00, 207.65] } // > 5 mins to unlock predator!
    ];

    const chosen = presets[Math.floor(Math.random() * presets.length)];
    this.generateDemoAudio(chosen.duration, chosen.name, chosen.bpm, chosen.scale);

    if (this.statusElem) {
      this.statusElem.className = 'status-message success';
      this.statusElem.textContent = `🎲 Generada canción al azar: "${chosen.name}" (${this.formatTime(chosen.duration)})`;
    }
  }

  generateDemoAudio(duration = 150, title = "Canción Demostración (Sintetizada)", bpm = 128, customScale = null) {
    this.ensureAudioContext();
    const sampleRate = this.audioCtx.sampleRate;
    const numFrames = sampleRate * duration;
    const buffer = this.audioCtx.createBuffer(2, numFrames, sampleRate);

    const left = buffer.getChannelData(0);
    const right = buffer.getChannelData(1);

    const beatSec = 60 / bpm;
    const scale = customScale || [261.63, 293.66, 329.63, 349.23, 392.00, 440.00, 493.88, 523.25];

    for (let i = 0; i < numFrames; i++) {
      const time = i / sampleRate;
      const beat = Math.floor(time / beatSec);

      const kickEnv = Math.max(0, 1 - ((time % beatSec) * 8));
      const kickTone = Math.sin(2 * Math.PI * 60 * (1 - kickEnv) * time) * kickEnv;

      const noteIndex = (beat * 3 + Math.floor((time % beatSec) * 4)) % scale.length;
      const freq = scale[noteIndex];
      const melodyEnv = Math.max(0, 1 - ((time % (beatSec / 2)) * 5));
      const synthMelody = (Math.sin(2 * Math.PI * freq * time) + 0.5 * Math.sin(2 * Math.PI * freq * 2 * time)) * melodyEnv * 0.25;

      const bassFreq = scale[noteIndex % scale.length] / 2;
      const bassSynth = Math.sin(2 * Math.PI * bassFreq * time) * 0.25;

      const sample = (kickTone * 0.4) + synthMelody + bassSynth;

      left[i] = sample;
      right[i] = sample;
    }

    this.audioBuffer = buffer;
    this.currentSongName = title;
    this.durationSeconds = duration;
    this.updateSongUI();

    if (window.onSongLoaded) {
      window.onSongLoaded(this.audioBuffer, this.isPredatorUnlocked);
    }
  }

  play(offset = 0) {
    if (!this.audioBuffer) return;
    this.ensureAudioContext();

    this.stop();

    this.sourceNode = this.audioCtx.createBufferSource();
    this.sourceNode.buffer = this.audioBuffer;

    this.analyserNode = this.audioCtx.createAnalyser();
    this.analyserNode.fftSize = 512;

    this.sourceNode.connect(this.analyserNode);
    this.analyserNode.connect(this.audioCtx.destination);

    this.sourceNode.start(0, offset);
    this.startTime = this.audioCtx.currentTime - offset;
    this.isPlaying = true;
  }

  pause() {
    if (this.isPlaying && this.sourceNode) {
      this.pauseOffset = this.audioCtx.currentTime - this.startTime;
      try { this.sourceNode.stop(); } catch(e){}
      this.isPlaying = false;
    }
  }

  stop() {
    if (this.sourceNode) {
      try { this.sourceNode.stop(); } catch(e){}
      try { this.sourceNode.disconnect(); } catch(e){}
      this.sourceNode = null;
    }
    this.isPlaying = false;
    this.pauseOffset = 0;
  }

  getCurrentTime() {
    if (!this.isPlaying) return this.pauseOffset;
    return this.audioCtx.currentTime - this.startTime;
  }
}

window.audioManager = new AudioManager();
