import { getAudioCtx } from './audio';

let isPlaying = false;
let step = 0;
let timerId = null;

const MELODY = [
  { f: 523.25, d: 0.12 },
  { f: 659.25, d: 0.12 },
  { f: 783.99, d: 0.12 },
  { f: 1046.50, d: 0.18 },
  { f: 783.99, d: 0.12 },
  { f: 1046.50, d: 0.22 },
  { f: 0, d: 0.08 },
  { f: 880.00, d: 0.12 },
  { f: 783.99, d: 0.12 },
  { f: 659.25, d: 0.12 },
  { f: 587.33, d: 0.18 },
  { f: 659.25, d: 0.22 },
  { f: 0, d: 0.08 },
  { f: 523.25, d: 0.12 },
  { f: 587.33, d: 0.12 },
  { f: 659.25, d: 0.12 },
  { f: 523.25, d: 0.12 },
  { f: 440.00, d: 0.18 },
  { f: 523.25, d: 0.24 },
  { f: 0, d: 0.14 }
];

export function startChiptune(volume = 0.2) {
  if (isPlaying) return;
  isPlaying = true;
  step = 0;

  function playNext() {
    if (!isPlaying) return;
    const note = MELODY[step % MELODY.length];
    step++;

    if (note.f > 0) {
      try {
        const ctx = getAudioCtx();
        if (ctx.state === 'suspended') {
          ctx.resume().catch(() => {});
        }
        const now = ctx.currentTime;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = 'square';
        osc.frequency.setValueAtTime(note.f, now);

        gain.gain.setValueAtTime(volume, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + note.d);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(now);
        osc.stop(now + note.d);
      } catch (e) {
        console.log('Chiptune note err:', e);
      }
    }

    timerId = setTimeout(playNext, (note.d + 0.04) * 1000);
  }

  playNext();
}

export function stopChiptune() {
  isPlaying = false;
  if (timerId) {
    clearTimeout(timerId);
    timerId = null;
  }
}

export function isChiptuneActive() {
  return isPlaying;
}
