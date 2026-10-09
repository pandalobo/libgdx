// Beat Detector & Dynamic Rhythm Note Generator
// Analyzes audio buffer to detect onset peaks and dynamic rhythm for short/long notes

class BeatDetector {
  constructor() {
    this.lanes = 4;
  }

  /**
   * Generates chart notes based on Web Audio AudioBuffer analysis
   * @param {AudioBuffer} audioBuffer
   * @param {String} difficulty - 'easy', 'medium', 'hard', 'legend', 'predator'
   * @param {Number} canvasWidth
   * @param {Number} canvasHeight
   * @param {Number} hitLineY
   * @returns {Array} Array of note objects { time, duration, lane, type: 'short'|'long', x, speed }
   */
  generateChart(audioBuffer, difficulty = 'medium', canvasWidth = 400, canvasHeight = 600, hitLineY = 490) {
    if (!audioBuffer) return [];

    const pcm = audioBuffer.getChannelData(0);
    const sampleRate = audioBuffer.sampleRate;
    const totalDuration = audioBuffer.duration;

    const speedMap = {
      easy: 350,
      medium: 450,
      hard: 550,
      legend: 650,
      predator: 750
    };
    const speed = speedMap[difficulty] || 450;
    const laneWidth = canvasWidth / this.lanes;

    // Parameters based on difficulty
    const params = {
      easy: { thresholdMultiplier: 1.8, minDistance: 0.45, maxDensity: 0.8, longNoteProb: 0.15, maxLongLen: 0.8 },
      medium: { thresholdMultiplier: 1.5, minDistance: 0.35, maxDensity: 1.2, longNoteProb: 0.25, maxLongLen: 1.2 },
      hard: { thresholdMultiplier: 1.25, minDistance: 0.25, maxDensity: 1.8, longNoteProb: 0.35, maxLongLen: 1.5 },
      legend: { thresholdMultiplier: 1.1, minDistance: 0.18, maxDensity: 2.5, longNoteProb: 0.40, maxLongLen: 2.0 },
      predator: { thresholdMultiplier: 0.95, minDistance: 0.12, maxDensity: 3.5, longNoteProb: 0.50, maxLongLen: 2.5 }
    }[difficulty] || { thresholdMultiplier: 1.5, minDistance: 0.35, maxDensity: 1.2, longNoteProb: 0.25, maxLongLen: 1.2 };

    const windowSize = Math.floor(sampleRate * 0.05); // 50ms frames
    const stepSize = Math.floor(windowSize / 2);
    const energies = [];

    // Calculate RMS energy per window
    for (let i = 0; i < pcm.length - windowSize; i += stepSize) {
      let sum = 0;
      for (let j = 0; j < windowSize; j++) {
        sum += pcm[i + j] * pcm[i + j];
      }
      const rms = Math.sqrt(sum / windowSize);
      const time = i / sampleRate;
      energies.push({ time, energy: rms });
    }

    // Calculate average energy
    const totalAvgEnergy = energies.reduce((acc, curr) => acc + curr.energy, 0) / (energies.length || 1);
    const threshold = totalAvgEnergy * params.thresholdMultiplier;

    const rawNotes = [];
    let lastNoteTime = -1;
    let prevLane = -1;

    for (let i = 1; i < energies.length - 1; i++) {
      const prev = energies[i - 1].energy;
      const curr = energies[i].energy;
      const next = energies[i + 1].energy;

      // Peak detection
      if (curr > threshold && curr > prev && curr >= next) {
        const time = energies[i].time;

        if (time - lastNoteTime >= params.minDistance) {
          // Select lane (avoid picking exact same lane twice continuously when possible)
          let lane = Math.floor(Math.random() * this.lanes);
          if (lane === prevLane) {
            lane = (lane + 1) % this.lanes;
          }

          // Determine if long note or short note
          const isLong = Math.random() < params.longNoteProb && (curr > threshold * 1.3);
          let duration = 0;

          if (isLong) {
            // Find sustained energy duration
            let endIdx = i;
            while (endIdx < energies.length && energies[endIdx].energy > threshold * 0.7) {
              endIdx++;
            }
            const sustainedSecs = (endIdx - i) * (stepSize / sampleRate);
            duration = Math.min(params.maxLongLen, Math.max(0.4, sustainedSecs));
          }

          rawNotes.push({
            id: Math.random().toString(36).substr(2, 9),
            time: Number(time.toFixed(3)),
            duration: Number(duration.toFixed(3)),
            lane: lane,
            type: duration > 0 ? 'long' : 'short',
            x: lane * laneWidth + laneWidth / 2,
            speed: speed,
            hit: false,
            holding: false,
            holdCompleted: false,
            missed: false
          });

          lastNoteTime = time + (duration > 0 ? duration + 0.1 : 0);
          prevLane = lane;
        }
      }
    }

    // Fallback if song energy is very low or soft: generate rhythmic fallback pattern
    if (rawNotes.length < 10) {
      const fallbackInterval = params.minDistance * 1.5;
      for (let t = 1.0; t < totalDuration - 2.0; t += fallbackInterval) {
        let lane = Math.floor(Math.random() * this.lanes);
        const isLong = Math.random() < params.longNoteProb;
        const dur = isLong ? 0.6 : 0;

        rawNotes.push({
          id: Math.random().toString(36).substr(2, 9),
          time: Number(t.toFixed(3)),
          duration: Number(dur.toFixed(3)),
          lane: lane,
          type: dur > 0 ? 'long' : 'short',
          x: lane * laneWidth + laneWidth / 2,
          speed: speed,
          hit: false,
          holding: false,
          holdCompleted: false,
          missed: false
        });
      }
    }

    return rawNotes.sort((a, b) => a.time - b.time);
  }
}

window.beatDetector = new BeatDetector();
