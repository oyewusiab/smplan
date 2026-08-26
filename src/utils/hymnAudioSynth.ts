/**
 * In-Browser Sacred Music Audio Synthesizer & Preview Player
 * Uses Web Audio API to synthesize smooth piano chord & melody tones for hymn previews.
 * Works 100% offline with zero external network failure or CORS blocking.
 */

// Note frequencies (Hz) for key of C/G/F
const NOTE_FREQS: Record<string, number> = {
  'C3': 130.81, 'D3': 146.83, 'E3': 164.81, 'F3': 174.61, 'G3': 196.00, 'A3': 220.00, 'B3': 246.94,
  'C4': 261.63, 'D4': 293.66, 'E4': 329.63, 'F4': 349.23, 'G4': 392.00, 'A4': 440.00, 'B4': 493.88,
  'C5': 523.25, 'D5': 587.33, 'E5': 659.25, 'F5': 698.46, 'G5': 783.99, 'A5': 880.00,
};

// Signature melody motifs for popular LDS Hymns
const HYMN_MELODIES: Record<number, { note: string; dur: number }[]> = {
  // #2 The Spirit of God (C - E - G - G - A - G - E - C)
  2: [
    { note: 'C4', dur: 0.5 }, { note: 'E4', dur: 0.5 }, { note: 'G4', dur: 0.75 },
    { note: 'G4', dur: 0.25 }, { note: 'A4', dur: 0.5 }, { note: 'G4', dur: 0.5 },
    { note: 'E4', dur: 0.5 }, { note: 'C4', dur: 1.0 }
  ],
  // #19 We Thank Thee O God for a Prophet
  19: [
    { note: 'C4', dur: 0.5 }, { note: 'C4', dur: 0.5 }, { note: 'E4', dur: 0.5 },
    { note: 'G4', dur: 0.75 }, { note: 'A4', dur: 0.25 }, { note: 'G4', dur: 0.5 },
    { note: 'E4', dur: 0.5 }, { note: 'D4', dur: 1.0 }
  ],
  // #26 Joseph Smith's First Prayer
  26: [
    { note: 'G4', dur: 0.5 }, { note: 'E4', dur: 0.5 }, { note: 'C4', dur: 0.5 },
    { note: 'D4', dur: 0.5 }, { note: 'E4', dur: 0.5 }, { note: 'F4', dur: 0.5 },
    { note: 'G4', dur: 1.0 }
  ],
  // #85 How Firm a Foundation
  85: [
    { note: 'G4', dur: 0.5 }, { note: 'C5', dur: 0.5 }, { note: 'C5', dur: 0.5 },
    { note: 'B4', dur: 0.5 }, { note: 'A4', dur: 0.5 }, { note: 'G4', dur: 1.0 }
  ],
  // #169 As Now We Take the Sacrament
  169: [
    { note: 'E4', dur: 0.5 }, { note: 'G4', dur: 0.5 }, { note: 'C5', dur: 0.75 },
    { note: 'B4', dur: 0.25 }, { note: 'A4', dur: 0.5 }, { note: 'G4', dur: 0.5 },
    { note: 'F4', dur: 0.5 }, { note: 'E4', dur: 1.0 }
  ],
  // #172 In Humility, Our Savior
  172: [
    { note: 'C4', dur: 0.5 }, { note: 'E4', dur: 0.5 }, { note: 'G4', dur: 0.5 },
    { note: 'A4', dur: 0.5 }, { note: 'G4', dur: 0.5 }, { note: 'F4', dur: 0.5 },
    { note: 'E4', dur: 1.0 }
  ],
  // #193 I Stand All Amazed
  193: [
    { note: 'E4', dur: 0.5 }, { note: 'E4', dur: 0.5 }, { note: 'F4', dur: 0.5 },
    { note: 'G4', dur: 0.75 }, { note: 'A4', dur: 0.25 }, { note: 'G4', dur: 0.5 },
    { note: 'C5', dur: 1.0 }
  ],
  // #1001 Come, Thou Fount
  1001: [
    { note: 'C4', dur: 0.5 }, { note: 'C4', dur: 0.5 }, { note: 'D4', dur: 0.5 },
    { note: 'E4', dur: 0.5 }, { note: 'G4', dur: 0.75 }, { note: 'E4', dur: 0.25 },
    { note: 'D4', dur: 0.5 }, { note: 'C4', dur: 1.0 }
  ],
  // #1003 It Is Well with My Soul
  1003: [
    { note: 'C4', dur: 0.5 }, { note: 'E4', dur: 0.5 }, { note: 'G4', dur: 0.75 },
    { note: 'G4', dur: 0.25 }, { note: 'A4', dur: 0.5 }, { note: 'G4', dur: 0.5 },
    { note: 'C5', dur: 1.0 }
  ]
};

// Default generic gentle progression if specific melody is not defined
const DEFAULT_MELODY = [
  { note: 'C4', dur: 0.6 }, { note: 'E4', dur: 0.6 }, { note: 'G4', dur: 0.6 },
  { note: 'A4', dur: 0.6 }, { note: 'G4', dur: 0.8 }, { note: 'E4', dur: 0.6 },
  { note: 'C4', dur: 1.2 }
];

let audioCtx: AudioContext | null = null;
let currentStopCallback: (() => void) | null = null;

function getAudioContext(): AudioContext {
  if (!audioCtx) {
    const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    audioCtx = new AudioContextClass();
  }
  if (audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
  return audioCtx;
}

/**
 * Play a single piano-like synthesized tone with exponential decay
 */
function playPianoTone(ctx: AudioContext, freq: number, startTime: number, duration: number) {
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();

  // Gentle triangle wave with harmonic richness
  osc.type = 'triangle';
  osc.frequency.setValueAtTime(freq, startTime);

  // Envelope: quick attack, natural exponential decay
  gain.gain.setValueAtTime(0.001, startTime);
  gain.gain.linearRampToValueAtTime(0.28, startTime + 0.04);
  gain.gain.exponentialRampToValueAtTime(0.001, startTime + duration + 0.3);

  osc.connect(gain);
  gain.connect(ctx.destination);

  osc.start(startTime);
  osc.stop(startTime + duration + 0.35);
}

/**
 * Play preview melody for a hymn
 */
export function playHymnAudioPreview(
  hymnNumber: number,
  onEnd?: () => void
): () => void {
  stopHymnAudio();

  const ctx = getAudioContext();
  const melody = HYMN_MELODIES[hymnNumber] || DEFAULT_MELODY;
  const startTime = ctx.currentTime + 0.05;

  let currentOffset = 0;
  melody.forEach((step) => {
    const freq = NOTE_FREQS[step.note] || 261.63;
    playPianoTone(ctx, freq, startTime + currentOffset, step.dur);
    currentOffset += step.dur;
  });

  const totalTimeMs = (currentOffset + 0.5) * 1000;
  const timer = window.setTimeout(() => {
    if (onEnd) onEnd();
    currentStopCallback = null;
  }, totalTimeMs);

  const stopFn = () => {
    window.clearTimeout(timer);
    if (onEnd) onEnd();
  };

  currentStopCallback = stopFn;
  return stopFn;
}

/**
 * Stop any ongoing audio preview
 */
export function stopHymnAudio(): void {
  if (currentStopCallback) {
    currentStopCallback();
    currentStopCallback = null;
  }
}
