// Beat Detector & Dynamic Rhythm Note Generator
// Analyzes audio buffer with local adaptive thresholding, spectral energy, dynamic quantization, and anti-collision lane packing.

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
   * @param {Function} progressCallback - Optional progress reporting callback (0-100)
   * @returns {Array} Array of note objects { id, time, duration, lane, type, x, speed }
   */
  generateChart(audioBuffer, difficulty = 'medium', canvasWidth = 400, canvasHeight = 600, hitLineY = 490, progressCallback = null) {
    if (!audioBuffer) return [];

    const pcm = audioBuffer.getChannelData(0);
    const sampleRate = audioBuffer.sampleRate;
    const totalDuration = audioBuffer.duration;

    const speedMap = {
      easy: 380,
      medium: 480,
      hard: 580,
      legend: 680,
      predator: 780
    };
    const speed = speedMap[difficulty] || 480;
    const laneWidth = canvasWidth / this.lanes;

    // Adjusted parameters based on difficulty for frequent, accurate notes synced to beats
    const params = {
      easy: { thresholdSensitivity: 1.2, minLaneGap: 0.35, longNoteProb: 0.15, maxLongLen: 0.8, maxChords: 1 },
      medium: { thresholdSensitivity: 1.0, minLaneGap: 0.25, longNoteProb: 0.22, maxLongLen: 1.2, maxChords: 1 },
      hard: { thresholdSensitivity: 0.85, minLaneGap: 0.18, longNoteProb: 0.30, maxLongLen: 1.5, maxChords: 2 },
      legend: { thresholdSensitivity: 0.75, minLaneGap: 0.14, longNoteProb: 0.38, maxLongLen: 2.0, maxChords: 2 },
      predator: { thresholdSensitivity: 0.65, minLaneGap: 0.10, longNoteProb: 0.45, maxLongLen: 2.5, maxChords: 2 }
    }[difficulty] || { thresholdSensitivity: 1.0, minLaneGap: 0.25, longNoteProb: 0.22, maxLongLen: 1.2, maxChords: 1 };

    const frameSize = Math.floor(sampleRate * 0.03); // 30ms frame for high accuracy
    const stepSize = Math.floor(frameSize / 2);
    const totalSteps = Math.floor((pcm.length - frameSize) / stepSize);
    const energies = new Float32Array(totalSteps);
    const times = new Float32Array(totalSteps);

    // 1. Calculate RMS energy per frame
    for (let idx = 0; idx < totalSteps; idx++) {
      const offset = idx * stepSize;
      let sum = 0;
      for (let j = 0; j < frameSize; j++) {
        const val = pcm[offset + j];
        sum += val * val;
      }
      energies[idx] = Math.sqrt(sum / frameSize);
      times[idx] = offset / sampleRate;

      if (progressCallback && idx % 3000 === 0) {
        progressCallback(Math.floor((idx / totalSteps) * 50));
      }
    }

    // 2. Local Adaptive Thresholding (Sliding Window of ~1.2s = ~80 frames)
    const windowHalfSpan = 40;
    const rawNotes = [];
    const laneLastFreeTime = [0, 0, 0, 0];

    let lastGlobalNoteTime = -1;
    let prevLane = -1;

    for (let i = 1; i < totalSteps - 1; i++) {
      if (progressCallback && i % 3000 === 0) {
        progressCallback(50 + Math.floor((i / totalSteps) * 50));
      }

      const curr = energies[i];
      const prev = energies[i - 1];
      const next = energies[i + 1];

      // Local average energy
      let localSum = 0;
      let count = 0;
      const startW = Math.max(0, i - windowHalfSpan);
      const endW = Math.min(totalSteps - 1, i + windowHalfSpan);
      for (let w = startW; w <= endW; w++) {
        localSum += energies[w];
        count++;
      }
      const localAvg = localSum / (count || 1);
      const localThreshold = localAvg * params.thresholdSensitivity;

      // Transient energy peak check
      if (curr > localThreshold && curr > prev && curr >= next && curr > 0.008) {
        const rawTime = times[i];

        if (rawTime - lastGlobalNoteTime >= 0.06) {
          const availableLanes = [];
          for (let l = 0; l < this.lanes; l++) {
            if (rawTime >= laneLastFreeTime[l] + params.minLaneGap) {
              availableLanes.push(l);
            }
          }

          if (availableLanes.length > 0) {
            const isHeavyHit = curr > localThreshold * 1.4;
            const targetChords = (isHeavyHit && availableLanes.length >= 2 && params.maxChords > 1) ? 2 : 1;

            availableLanes.sort(() => Math.random() - 0.5);
            if (targetChords === 1 && availableLanes.includes(prevLane) && availableLanes.length > 1) {
              availableLanes.splice(availableLanes.indexOf(prevLane), 1);
            }

            const chosenLanes = availableLanes.slice(0, targetChords);

            for (let lane of chosenLanes) {
              const isLong = Math.random() < params.longNoteProb && (curr > localThreshold * 1.2);
              let duration = 0;

              if (isLong) {
                let endIdx = i;
                while (endIdx < totalSteps && energies[endIdx] > localThreshold * 0.6) {
                  endIdx++;
                }
                const sustainedSecs = (endIdx - i) * (stepSize / sampleRate);
                duration = Math.min(params.maxLongLen, Math.max(0.4, sustainedSecs));
              }

              rawNotes.push({
                id: Math.random().toString(36).substr(2, 9),
                time: Number(rawTime.toFixed(3)),
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

              laneLastFreeTime[lane] = rawTime + duration;
              prevLane = lane;
            }

            lastGlobalNoteTime = rawTime;
          }
        }
      }
    }

    // 3. Dense rhythmic generator fallback if song has soft/quiet acoustic sections
    const minNoteSpacing = Math.max(0.2, params.minLaneGap);
    if (rawNotes.length < 20) {
      for (let t = 0.3; t < totalDuration - 0.5; t += minNoteSpacing * 1.2) {
        let lane = Math.floor(Math.random() * this.lanes);
        if (lane === prevLane) lane = (lane + 1) % this.lanes;

        if (t >= laneLastFreeTime[lane] + params.minLaneGap) {
          const isLong = Math.random() < params.longNoteProb;
          const dur = isLong ? 0.5 : 0;

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

          laneLastFreeTime[lane] = t + dur;
          prevLane = lane;
        }
      }
    }

    return rawNotes.sort((a, b) => a.time - b.time);
  }
}

window.beatDetector = new BeatDetector();
