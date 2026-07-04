import React, { useState, useEffect } from 'react';
import { Volume2, VolumeX, Music, Music2 } from 'lucide-react';

let audioCtx: AudioContext | null = null;
let isSoundEnabled = true;
let musicVolume = 0.6; // 0..1 scale for user control

// ── Background music state ───────────────────────────────────────
let musicSchedulerTimer: ReturnType<typeof setTimeout> | null = null;
let masterGain: GainNode | null = null;
let isMusicPlaying = false;
let musicBeat = 0; // global beat counter

// ── Chord progression (Cm-based cyberpunk minor) ─────────────────
// Each "chord" = [root, fifth, minor-third-upper-octave] in Hz
const CHORD_PROG = [
  [65.41, 98.00, 155.56],   // Cm  (C2, G2, Eb3)
  [58.27, 87.31, 138.59],   // Bbm (Bb1, F2, Db3)
  [69.30, 103.83, 164.81],  // C#m (C#2, G#2, E3)
  [73.42, 110.00, 174.61],  // Dm  (D2, A2, F3)
];

// Arpeggio pattern over chord notes (indices into chord + octave multiply)
const ARP_PATTERN = [0, 1, 2, 1, 0, 2, 1, 0];

// ── Synthwave lead melody (relative to root, in semitones) ───────
const LEAD_MELODY = [0, 3, 7, 10, 12, 10, 7, 5, 3, 0, 3, 5, 7, 5, 3, 0];

function getAudioContext(): AudioContext {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
  }
  if (audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
  return audioCtx;
}

// ── Low-level synth helpers ──────────────────────────────────────
function semiToHz(baseHz: number, semitones: number): number {
  return baseHz * Math.pow(2, semitones / 12);
}

function playNote(
  ctx: AudioContext,
  dest: AudioNode,
  freq: number,
  startTime: number,
  duration: number,
  gain: number,
  type: OscillatorType = 'sawtooth',
  filterFreq?: number,
  filterQ?: number,
  envelope?: { attack: number; decay: number; sustain: number; release: number }
) {
  try {
    const osc = ctx.createOscillator();
    const gainNode = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, startTime);

    const env = envelope ?? { attack: 0.01, decay: 0.1, sustain: 0.7, release: 0.2 };
    gainNode.gain.setValueAtTime(0, startTime);
    gainNode.gain.linearRampToValueAtTime(gain, startTime + env.attack);
    gainNode.gain.linearRampToValueAtTime(gain * env.sustain, startTime + env.attack + env.decay);
    gainNode.gain.setValueAtTime(gain * env.sustain, startTime + duration - env.release);
    gainNode.gain.linearRampToValueAtTime(0, startTime + duration);

    if (filterFreq) {
      const filt = ctx.createBiquadFilter();
      filt.type = 'lowpass';
      filt.frequency.setValueAtTime(filterFreq, startTime);
      if (filterQ) filt.Q.setValueAtTime(filterQ, startTime);
      osc.connect(filt);
      filt.connect(gainNode);
    } else {
      osc.connect(gainNode);
    }

    gainNode.connect(dest);
    osc.start(startTime);
    osc.stop(startTime + duration + 0.05);
  } catch (_) {}
}

// ── Drum machine ──────────────────────────────────────────────────
function playKick(ctx: AudioContext, dest: AudioNode, t: number) {
  try {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(150, t);
    osc.frequency.exponentialRampToValueAtTime(40, t + 0.15);
    gain.gain.setValueAtTime(0.45, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.35);
    osc.connect(gain);
    gain.connect(dest);
    osc.start(t);
    osc.stop(t + 0.4);
  } catch (_) {}
}

function playSnare(ctx: AudioContext, dest: AudioNode, t: number) {
  try {
    // White noise burst
    const bufLen = ctx.sampleRate * 0.1;
    const buf = ctx.createBuffer(1, bufLen, ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < bufLen; i++) data[i] = (Math.random() * 2 - 1);
    const src = ctx.createBufferSource();
    src.buffer = buf;
    const gain = ctx.createGain();
    const filt = ctx.createBiquadFilter();
    filt.type = 'bandpass';
    filt.frequency.setValueAtTime(2000, t);
    filt.Q.setValueAtTime(0.5, t);
    gain.gain.setValueAtTime(0.15, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.1);
    src.connect(filt);
    filt.connect(gain);
    gain.connect(dest);
    src.start(t);
    src.stop(t + 0.12);
  } catch (_) {}
}

function playHihat(ctx: AudioContext, dest: AudioNode, t: number, open = false) {
  try {
    const bufLen = ctx.sampleRate * (open ? 0.3 : 0.05);
    const buf = ctx.createBuffer(1, bufLen, ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < bufLen; i++) data[i] = (Math.random() * 2 - 1);
    const src = ctx.createBufferSource();
    src.buffer = buf;
    const gain = ctx.createGain();
    const filt = ctx.createBiquadFilter();
    filt.type = 'highpass';
    filt.frequency.setValueAtTime(8000, t);
    gain.gain.setValueAtTime(0.07, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + (open ? 0.3 : 0.05));
    src.connect(filt);
    filt.connect(gain);
    gain.connect(dest);
    src.start(t);
    src.stop(t + (open ? 0.35 : 0.06));
  } catch (_) {}
}

// ── Reverb / pad ─────────────────────────────────────────────────
function createReverb(ctx: AudioContext): ConvolverNode {
  const convolver = ctx.createConvolver();
  const len = ctx.sampleRate * 2;
  const ir = ctx.createBuffer(2, len, ctx.sampleRate);
  for (let ch = 0; ch < 2; ch++) {
    const d = ir.getChannelData(ch);
    for (let i = 0; i < len; i++) {
      d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 3);
    }
  }
  convolver.buffer = ir;
  return convolver;
}

// ── Main music scheduler ─────────────────────────────────────────
const BPM = 128;
const BEAT_SEC = 60 / BPM;          // seconds per beat
const BAR_SEC = BEAT_SEC * 4;       // one bar = 4 beats
const BARS_PER_CHORD = 2;           // chord changes every 2 bars

let reverbNode: ConvolverNode | null = null;
let reverbGain: GainNode | null = null;

function scheduleMusicBar() {
  if (!isMusicPlaying || !isSoundEnabled) return;

  try {
    const ctx = getAudioContext();
    const now = ctx.currentTime + 0.05; // small lookahead

    // ── Ensure master chain exists ──────────────────────────────
    if (!masterGain) {
      masterGain = ctx.createGain();
      masterGain.gain.setValueAtTime(musicVolume * 0.25, now);
      masterGain.connect(ctx.destination);

      reverbNode = createReverb(ctx);
      reverbGain = ctx.createGain();
      reverbGain.gain.setValueAtTime(0.2, now);
      reverbNode.connect(reverbGain);
      reverbGain.connect(ctx.destination);
    }

    const chordIdx = Math.floor(musicBeat / (BARS_PER_CHORD * 4)) % CHORD_PROG.length;
    const chord = CHORD_PROG[chordIdx];

    // ── 1. SUB BASS ────────────────────────────────────────────
    const bassRoot = chord[0];
    for (let b = 0; b < 4; b++) {
      const t = now + b * BEAT_SEC;
      // 16th-note bass pattern: root on 1, 2+
      playNote(ctx, masterGain!, bassRoot, t, BEAT_SEC * 0.9, 0.35, 'sawtooth', 200, 2,
        { attack: 0.01, decay: 0.15, sustain: 0.6, release: 0.1 });
      if (b === 1 || b === 3) {
        playNote(ctx, masterGain!, bassRoot * 1.5, t + BEAT_SEC * 0.5, BEAT_SEC * 0.4, 0.2, 'sawtooth', 180, 1.5,
          { attack: 0.005, decay: 0.1, sustain: 0.5, release: 0.05 });
      }
    }

    // ── 2. PAD CHORD (sustained) ───────────────────────────────
    chord.forEach((freq, i) => {
      const padFreq = freq * 2; // up one octave
      playNote(ctx, masterGain!, padFreq, now, BAR_SEC * 0.95, 0.06 - i * 0.01,
        'triangle', 1800, 0.5,
        { attack: 0.3, decay: 0.5, sustain: 0.8, release: 0.5 });
      // also send to reverb
      if (reverbNode) {
        playNote(ctx, reverbNode!, padFreq, now, BAR_SEC, 0.04, 'triangle', 3000, 0.3,
          { attack: 0.3, decay: 0.5, sustain: 0.8, release: 0.8 });
      }
    });

    // ── 3. ARPEGGIO (16th notes) ────────────────────────────────
    for (let s = 0; s < 16; s++) {
      const t = now + s * (BEAT_SEC / 4);
      const arpIdx = ARP_PATTERN[s % ARP_PATTERN.length];
      const arpFreq = (chord[arpIdx] ?? chord[0]) * 4; // 2 octaves up
      playNote(ctx, masterGain!, arpFreq, t, BEAT_SEC * 0.2, 0.04, 'square', 4000, 1,
        { attack: 0.002, decay: 0.05, sustain: 0.4, release: 0.05 });
    }

    // ── 4. LEAD SYNTH MELODY (every 2 bars) ────────────────────
    const globalBar = Math.floor(musicBeat / 4);
    if (globalBar % 2 === 0) {
      const leadRoot = chord[0] * 4; // 2 octaves up
      const melodyStep = (globalBar % 4) * 4;
      for (let s = 0; s < 4; s++) {
        const t = now + s * BEAT_SEC;
        const semi = LEAD_MELODY[(melodyStep + s) % LEAD_MELODY.length];
        const leadFreq = semiToHz(leadRoot, semi);
        playNote(ctx, masterGain!, leadFreq, t, BEAT_SEC * 0.85, 0.09, 'sawtooth', 3500, 3,
          { attack: 0.01, decay: 0.1, sustain: 0.65, release: 0.15 });
        if (reverbNode) {
          playNote(ctx, reverbNode!, leadFreq, t, BEAT_SEC * 0.85, 0.05, 'sawtooth', 6000, 2,
            { attack: 0.01, decay: 0.1, sustain: 0.65, release: 0.3 });
        }
      }
    }

    // ── 5. DRUM MACHINE ────────────────────────────────────────
    // 4/4 pattern: Kick on 1&3, Snare on 2&4, Hihat every 8th
    for (let b = 0; b < 4; b++) {
      const t = now + b * BEAT_SEC;
      // Kick on beats 0 and 2
      if (b === 0 || b === 2) playKick(ctx, masterGain!, t);
      // Snare on beats 1 and 3
      if (b === 1 || b === 3) playSnare(ctx, masterGain!, t);
      // Closed hihat every 8th note
      playHihat(ctx, masterGain!, t, false);
      playHihat(ctx, masterGain!, t + BEAT_SEC * 0.5, false);
    }
    // Open hihat accent on beat 3.5
    playHihat(ctx, masterGain!, now + BEAT_SEC * 3.5, true);

    // ── Advance beat counter and schedule next bar ──────────────
    musicBeat += 4;
    musicSchedulerTimer = setTimeout(scheduleMusicBar, BAR_SEC * 1000 - 80);
  } catch (e) {
    console.log('[Music] Scheduler error:', e);
    musicSchedulerTimer = setTimeout(scheduleMusicBar, BAR_SEC * 1000);
  }
}

export const SoundFX = {
  toggle: (enabled: boolean) => {
    isSoundEnabled = enabled;
    if (!enabled) {
      SoundFX.stopMusic();
    } else {
      SoundFX.startMusic();
    }
  },

  isEnabled: () => isSoundEnabled,

  setVolume: (vol: number) => {
    musicVolume = Math.max(0, Math.min(1, vol));
    if (masterGain) {
      const ctx = getAudioContext();
      masterGain.gain.setTargetAtTime(musicVolume * 0.25, ctx.currentTime, 0.3);
    }
  },

  playClick: () => {
    if (!isSoundEnabled) return;
    try {
      const ctx = getAudioContext();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(880, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(120, ctx.currentTime + 0.06);
      gain.gain.setValueAtTime(0.12, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.06);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.07);
    } catch (_) {}
  },

  playCard: () => {
    if (!isSoundEnabled) return;
    try {
      const ctx = getAudioContext();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(400, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(800, ctx.currentTime + 0.18);
      gain.gain.setValueAtTime(0.1, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.18);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.2);
    } catch (_) {}
  },

  playAlarm: () => {
    if (!isSoundEnabled) return;
    try {
      const ctx = getAudioContext();
      const now = ctx.currentTime;
      for (let i = 0; i < 4; i++) {
        const t = now + i * 0.28;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(700, t);
        osc.frequency.linearRampToValueAtTime(350, t + 0.14);
        osc.frequency.linearRampToValueAtTime(700, t + 0.28);
        gain.gain.setValueAtTime(0.07, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.28);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(t);
        osc.stop(t + 0.3);
      }
    } catch (_) {}
  },

  playSuccess: () => {
    if (!isSoundEnabled) return;
    try {
      const ctx = getAudioContext();
      const now = ctx.currentTime;
      // Major pentatonic arpeggio up + sparkle
      const notes = [261.63, 329.63, 392.00, 523.25, 659.25];
      notes.forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, now + idx * 0.09);
        gain.gain.setValueAtTime(0.1, now + idx * 0.09);
        gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.09 + 0.3);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now + idx * 0.09);
        osc.stop(now + idx * 0.09 + 0.35);
      });
    } catch (_) {}
  },

  startMusic: () => {
    if (!isSoundEnabled || isMusicPlaying) return;
    isMusicPlaying = true;
    musicBeat = 0;
    masterGain = null; // reset to rebuild chain
    reverbNode = null;
    reverbGain = null;
    scheduleMusicBar();
  },

  stopMusic: () => {
    isMusicPlaying = false;
    if (musicSchedulerTimer !== null) {
      clearTimeout(musicSchedulerTimer);
      musicSchedulerTimer = null;
    }
    if (masterGain) {
      try {
        const ctx = getAudioContext();
        masterGain.gain.setTargetAtTime(0, ctx.currentTime, 0.5);
        setTimeout(() => {
          try { masterGain?.disconnect(); } catch (_) {}
          masterGain = null;
        }, 1000);
      } catch (_) {}
    }
    if (reverbGain) {
      try { reverbGain.disconnect(); } catch (_) {}
      reverbGain = null;
    }
    reverbNode = null;
  },
};

// ── React UI Component ───────────────────────────────────────────
export const SoundFXController: React.FC = () => {
  const [enabled, setEnabled] = useState(isSoundEnabled);
  const [vol, setVol] = useState(Math.round(musicVolume * 100));

  useEffect(() => {
    const unlockAudio = () => {
      if (isSoundEnabled && !isMusicPlaying) {
        SoundFX.startMusic();
      }
      window.removeEventListener('click', unlockAudio);
      window.removeEventListener('keydown', unlockAudio);
    };
    window.addEventListener('click', unlockAudio);
    window.addEventListener('keydown', unlockAudio);
    return () => {
      window.removeEventListener('click', unlockAudio);
      window.removeEventListener('keydown', unlockAudio);
    };
  }, []);

  const toggleSound = () => {
    const newState = !enabled;
    setEnabled(newState);
    SoundFX.toggle(newState);
    if (newState) SoundFX.playClick();
  };

  const handleVolChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = Number(e.target.value);
    setVol(v);
    SoundFX.setVolume(v / 100);
  };

  return (
    <div className="flex items-center gap-2">
      {/* Volume slider — only visible when enabled */}
      {enabled && (
        <div className="flex items-center gap-1.5 bg-surface border border-border rounded-md px-2 py-1">
          <Music2 size={12} className="text-neon-cyan flex-shrink-0" />
          <input
            type="range"
            min={0}
            max={100}
            value={vol}
            onChange={handleVolChange}
            className="w-16 h-1 accent-cyan-400 cursor-pointer"
            title={`Âm lượng nhạc nền: ${vol}%`}
          />
          <span className="text-[10px] font-mono text-muted w-6 text-right">{vol}%</span>
        </div>
      )}

      {/* Toggle button */}
      <button
        onClick={toggleSound}
        className={`p-2 border rounded-md flex items-center gap-1.5 transition-all text-xs font-mono uppercase tracking-widest ${
          enabled
            ? 'border-neon-cyan text-neon-cyan bg-[rgba(0,240,255,0.05)] hover:bg-[rgba(0,240,255,0.1)]'
            : 'border-border bg-surface text-muted hover:text-[#e2f1ff]'
        }`}
        title={enabled ? 'Tắt âm thanh' : 'Bật âm thanh'}
      >
        {enabled ? (
          <>
            <Volume2 size={14} className="animate-pulse" />
            <span className="hidden md:inline">Nhạc: Bật</span>
          </>
        ) : (
          <>
            <VolumeX size={14} />
            <span className="hidden md:inline">Nhạc: Tắt</span>
          </>
        )}
      </button>
    </div>
  );
};
