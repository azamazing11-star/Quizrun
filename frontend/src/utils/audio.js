// Simple Web Audio API Synthesizer for Retro Game Sounds
let _audioCtx = null;
export const getAudioCtx = () => {
    if (!_audioCtx) {
        const AudioCtxClass = window.AudioContext || window.webkitAudioContext;
        if (AudioCtxClass) {
            _audioCtx = new AudioCtxClass();
        }
    }
    if (_audioCtx && _audioCtx.state === 'suspended') {
        _audioCtx.resume().catch(() => {});
    }
    return _audioCtx;
};

// Automatically unlock AudioContext on any user gesture
if (typeof window !== 'undefined') {
    const unlock = () => {
        const ctx = getAudioCtx();
        if (ctx && ctx.state === 'suspended') {
            ctx.resume().catch(() => {});
        }
    };
    window.addEventListener('pointerdown', unlock, { once: true });
    window.addEventListener('keydown', unlock, { once: true });
}

export const playSound = (type) => {
    const audioCtx = getAudioCtx();
    if (audioCtx.state === 'suspended') {
        audioCtx.resume();
    }
    const oscillator = audioCtx.createOscillator();
    const gainNode = audioCtx.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(audioCtx.destination);

    const now = audioCtx.currentTime;

    switch (type) {
        case 'submit':
            // "Pop" sound
            oscillator.type = 'sine';
            oscillator.frequency.setValueAtTime(400, now);
            oscillator.frequency.exponentialRampToValueAtTime(100, now + 0.1);
            gainNode.gain.setValueAtTime(0.5, now);
            gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.1);
            oscillator.start(now);
            oscillator.stop(now + 0.1);
            break;

        case 'step':
            // Fast retro tick sound for ladder movement
            oscillator.type = 'triangle';
            oscillator.frequency.setValueAtTime(600, now);
            oscillator.frequency.exponentialRampToValueAtTime(200, now + 0.04);
            gainNode.gain.setValueAtTime(0.2, now);
            gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.04);
            oscillator.start(now);
            oscillator.stop(now + 0.04);
            break;

        case 'correct':
            // "Ding ding!" (ascending)
            oscillator.type = 'sine';
            oscillator.frequency.setValueAtTime(523.25, now); // C5
            oscillator.frequency.setValueAtTime(659.25, now + 0.1); // E5
            gainNode.gain.setValueAtTime(0, now);
            gainNode.gain.linearRampToValueAtTime(0.5, now + 0.05);
            gainNode.gain.linearRampToValueAtTime(0, now + 0.3);
            oscillator.start(now);
            oscillator.stop(now + 0.3);
            break;

        case 'wrong':
            // "Buzzer" (descending/dissonant)
            oscillator.type = 'sawtooth';
            oscillator.frequency.setValueAtTime(300, now);
            oscillator.frequency.exponentialRampToValueAtTime(100, now + 0.3);
            gainNode.gain.setValueAtTime(0.5, now);
            gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.3);
            oscillator.start(now);
            oscillator.stop(now + 0.3);
            break;

        case 'reveal':
            // "Ta-da" / magic chime (Host result reveal)
            oscillator.type = 'triangle';
            oscillator.frequency.setValueAtTime(440, now); // A4
            oscillator.frequency.setValueAtTime(554.37, now + 0.1); // C#5
            oscillator.frequency.setValueAtTime(659.25, now + 0.2); // E5
            gainNode.gain.setValueAtTime(0, now);
            gainNode.gain.linearRampToValueAtTime(0.3, now + 0.1);
            gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.5);
            oscillator.start(now);
            oscillator.stop(now + 0.5);
            break;

        case 'fanfare':
            // "Fanfare" (Final Results)
            const notes = [
                { f: 523.25, d: 0.15 }, // C5
                { f: 659.25, d: 0.15 }, // E5
                { f: 783.99, d: 0.15 }, // G5
                { f: 1046.50, d: 0.4 }  // C6
            ];
            let t = now;
            notes.forEach(note => {
                const osc = audioCtx.createOscillator();
                const gain = audioCtx.createGain();
                osc.connect(gain);
                gain.connect(audioCtx.destination);
                osc.type = 'square';
                osc.frequency.value = note.f;

                gain.gain.setValueAtTime(0.2, t);
                gain.gain.exponentialRampToValueAtTime(0.01, t + note.d);

                osc.start(t);
                osc.stop(t + note.d);
                t += note.d + 0.05;
            });
        case 'beep':
            oscillator.type = 'sine';
            oscillator.frequency.setValueAtTime(880, now);
            gainNode.gain.setValueAtTime(0.3, now);
            gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.15);
            oscillator.start(now);
            oscillator.stop(now + 0.15);
            break;

        case 'shutter':
            oscillator.type = 'sawtooth';
            oscillator.frequency.setValueAtTime(1400, now);
            oscillator.frequency.exponentialRampToValueAtTime(300, now + 0.09);
            gainNode.gain.setValueAtTime(0.5, now);
            gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.09);
            oscillator.start(now);
            oscillator.stop(now + 0.09);
            break;

        default:
            oscillator.disconnect();
            gainNode.disconnect();
            break;
    }
};
