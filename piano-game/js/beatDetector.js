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
      easy: { thresholdSensitivity: 1.6, minLaneGap: 0.40, longNoteProb: 0.15, maxLongLen: 0.8, maxChords: 1 },
      medium: { thresholdSensitivity: 1.35, minLaneGap: 0.30, longNoteProb: 0.22, maxLongLen: 1.2, maxChords: 1 },
      hard: { thresholdSensitivity: 1.15, minLaneGap: 0.22, longNoteProb: 0.30, maxLongLen: 1.5, maxChords: 2 },
      legend: { thresholdSensitivity: 1.05, minLaneGap: 0.16, longNoteProb: 0.38, maxLongLen: 2.0, maxChords: 2 },
      predator: { thresholdSensitivity: 0.92, minLaneGap: 0.12, longNoteProb: 0.45, maxLongLen: 2.5, maxChords: 2 }
    }[difficulty] || { thresholdSensitivity: 1.35, minLaneGap: 0.30, longNoteProb: 0.22, maxLongLen: 1.2, maxChords: 1 };

    const frameSize = Math.floor(sampleRate * 0.04); // 40ms frame
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

      if (progressCallback && idx % 2000 === 0) {
        progressCallback(Math.floor((idx / totalSteps) * 50)); // 0-50% scanning
      }
    }

    // 2. Local Adaptive Thresholding (Sliding Window of ~1.5s = ~75 frames)
    const windowHalfSpan = 38;
    const rawNotes = [];
    const laneLastFreeTime = [0, 0, 0, 0]; // Tracks when each lane is free from notes/long-tails
    const preRollOffset = 1.5; // 1.5s scroll delay before notes reach hit line

    let lastGlobalNoteTime = -1;
    let prevLane = -1;

    for (let i = 1; i < totalSteps - 1; i++) {
      if (progressCallback && i % 2000 === 0) {
        progressCallback(50 + Math.floor((i / totalSteps) * 50)); // 50-100% generating
      }

      const curr = energies[i];
      const prev = energies[i - 1];
      const next = energies[i + 1];

      // Calculate local average energy in sliding window
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

      // Peak detection relative to local environment
      if (curr > localThreshold && curr > prev && curr >= next && curr > 0.015) {
        const rawTime = times[i];
        const noteTime = rawTime + preRollOffset;

        // Ensure global minimum separation between note starts
        if (rawTime - lastGlobalNoteTime >= 0.08) {
          // Find available lanes that do not collide with active/long notes
          const availableLanes = [];
          for (let l = 0; l < this.lanes; l++) {
            if (noteTime >= laneLastFreeTime[l] + params.minLaneGap) {
              availableLanes.push(l);
            }
          }

          if (availableLanes.length > 0) {
            // Determine chord size (1 note or 2 simultaneous notes for heavy hits in hard difficulties)
            const isHeavyHit = curr > localThreshold * 1.5;
            const targetChords = (isHeavyHit && availableLanes.length >= 2 && params.maxChords > 1) ? 2 : 1;

            // Pick lane(s) prioritizing variation from previous lane
            availableLanes.sort(() => Math.random() - 0.5);
            if (targetChords === 1 && availableLanes.includes(prevLane) && availableLanes.length > 1) {
              availableLanes.splice(availableLanes.indexOf(prevLane), 1);
            }

            const chosenLanes = availableLanes.slice(0, targetChords);

            for (let lane of chosenLanes) {
              // Determine if long note or short note
              const isLong = Math.random() < params.longNoteProb && (curr > localThreshold * 1.25);
              let duration = 0;

              if (isLong) {
                let endIdx = i;
                while (endIdx < totalSteps && energies[endIdx] > localThreshold * 0.65) {
                  endIdx++;
                }
                const sustainedSecs = (endIdx - i) * (stepSize / sampleRate);
                duration = Math.min(params.maxLongLen, Math.max(0.4, sustainedSecs));
              }

              rawNotes.push({
                id: Math.random().toString(36).substr(2, 9),
                time: Number(noteTime.toFixed(3)),
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

              // Reserve lane until note duration + gap expires
              laneLastFreeTime[lane] = noteTime + duration;
              prevLane = lane;
            }

            lastGlobalNoteTime = rawTime;
          }
        }
      }
    }

    // 3. Robust Fallback Generator if audio is extremely quiet
    if (rawNotes.length < 15) {
      const fallbackInterval = Math.max(0.35, params.minLaneGap * 1.5);
      for (let t = 0.5; t < totalDuration - 1.0; t += fallbackInterval) {
        const noteTime = t + preRollOffset;
        let lane = Math.floor(Math.random() * this.lanes);
        if (lane === prevLane) lane = (lane + 1) % this.lanes;

        if (noteTime >= laneLastFreeTime[lane] + params.minLaneGap) {
          const isLong = Math.random() < params.longNoteProb;
          const dur = isLong ? 0.6 : 0;

          rawNotes.push({
            id: Math.random().toString(36).substr(2, 9),
            time: Number(noteTime.toFixed(3)),
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

          laneLastFreeTime[lane] = noteTime + dur;
          prevLane = lane;
        }
      }
    }

    // Sort notes chronologically
    return rawNotes.sort((a, b) => a.time - b.time);
  }
}

window.beatDetector = new BeatDetector();
