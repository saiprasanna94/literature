/**
 * Tiny synth-based sound effects via the Web Audio API. No audio files
 * required. Browsers require a user gesture before audio can play, so the
 * AudioContext is created lazily on first invocation.
 */

const MUTE_KEY = 'literature.muted.v1';

let ctx: AudioContext | null = null;
let muted = readMuted();

function readMuted(): boolean {
  try {
    return localStorage.getItem(MUTE_KEY) === '1';
  } catch {
    return false;
  }
}

function persistMuted(m: boolean): void {
  try {
    localStorage.setItem(MUTE_KEY, m ? '1' : '0');
  } catch {
    /* ignore */
  }
}

export function isMuted(): boolean {
  return muted;
}

export function setMuted(m: boolean): void {
  muted = m;
  persistMuted(m);
}

function getCtx(): AudioContext | null {
  if (muted) return null;
  if (!ctx) {
    try {
      const C = window.AudioContext ?? (window as any).webkitAudioContext;
      if (!C) return null;
      ctx = new C();
    } catch {
      return null;
    }
  }
  if (ctx.state === 'suspended') void ctx.resume();
  return ctx;
}

type Note = {
  freq: number;
  /** start offset in seconds from "now" */
  delay: number;
  duration: number;
  type?: OscillatorType;
  gain?: number;
};

function play(notes: Note[]): void {
  const c = getCtx();
  if (!c) return;
  const now = c.currentTime;
  for (const n of notes) {
    const osc = c.createOscillator();
    const g = c.createGain();
    osc.type = n.type ?? 'sine';
    osc.frequency.setValueAtTime(n.freq, now + n.delay);
    const peak = n.gain ?? 0.12;
    g.gain.setValueAtTime(0.0001, now + n.delay);
    g.gain.exponentialRampToValueAtTime(peak, now + n.delay + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, now + n.delay + n.duration);
    osc.connect(g).connect(c.destination);
    osc.start(now + n.delay);
    osc.stop(now + n.delay + n.duration + 0.05);
  }
}

// Notes (Hz)
const C5 = 523.25, D5 = 587.33, E5 = 659.25, G5 = 783.99, A5 = 880, C6 = 1046.5;
const C4 = 261.63, G4 = 392, A4 = 440, E4 = 329.63;
const G3 = 196, C3 = 130.81;

export const sounds = {
  /** Subtle tick when an ask is sent. */
  ask: () => play([{ freq: A4, delay: 0, duration: 0.06, gain: 0.05 }]),
  /** Two-note rising chime — ask succeeded. */
  askSuccess: () =>
    play([
      { freq: C5, delay: 0, duration: 0.12 },
      { freq: E5, delay: 0.08, duration: 0.18 },
    ]),
  /** Descending two-note groan — ask failed. */
  askFail: () =>
    play([
      { freq: C4, delay: 0, duration: 0.18, type: 'triangle' },
      { freq: G3, delay: 0.12, duration: 0.25, type: 'triangle' },
    ]),
  /** Rising arpeggio — claim correct. */
  claimSuccess: () =>
    play([
      { freq: C5, delay: 0, duration: 0.12 },
      { freq: E5, delay: 0.08, duration: 0.12 },
      { freq: G5, delay: 0.16, duration: 0.16 },
      { freq: C6, delay: 0.26, duration: 0.3 },
    ]),
  /** Low buzz — claim wrong. */
  claimFail: () =>
    play([
      { freq: C3, delay: 0, duration: 0.45, type: 'sawtooth', gain: 0.08 },
      { freq: G3, delay: 0.0, duration: 0.45, type: 'sawtooth', gain: 0.05 },
    ]),
  /** Triumphant fanfare — your team won. */
  victory: () =>
    play([
      { freq: C5, delay: 0, duration: 0.18 },
      { freq: E5, delay: 0.14, duration: 0.18 },
      { freq: G5, delay: 0.28, duration: 0.18 },
      { freq: C6, delay: 0.42, duration: 0.5 },
      { freq: G5, delay: 0.42, duration: 0.5, gain: 0.08 },
    ]),
  /** Sad descent — your team lost. */
  defeat: () =>
    play([
      { freq: G4, delay: 0, duration: 0.25, type: 'triangle' },
      { freq: E4, delay: 0.22, duration: 0.25, type: 'triangle' },
      { freq: C4, delay: 0.44, duration: 0.5, type: 'triangle' },
    ]),
  /** Soft bell — it became your turn. */
  yourTurn: () =>
    play([
      { freq: D5, delay: 0, duration: 0.15, gain: 0.07 },
      { freq: A5, delay: 0.05, duration: 0.2, gain: 0.05 },
    ]),
};
