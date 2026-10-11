import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Volume2, VolumeX, RotateCcw, ArrowLeft, Play, Pause, Shield, Zap, Sparkles, Trophy, Heart, Crosshair } from 'lucide-react';

// ============================================================================
// 1989 XENON II: MEGABLAST RETRO CHIPTUNE SYNTHESIZER (Web Audio API)
// Recreates the legendary "Megablast (Hip-Hop on Cyberpunk)" 80s arcade sound
// ============================================================================
class XenonAudioEngine {
    constructor() {
        this.ctx = null;
        this.isMuted = false;
        this.isPlayingBgm = false;
        this.bgmTimer = null;
        this.step = 0;
        this.gainMaster = null;
        this.bgmGain = null;
        this.sfxGain = null;
    }

    init() {
        if (this.ctx) return;
        try {
            const AudioContext = window.AudioContext || window.webkitAudioContext;
            this.ctx = new AudioContext();
            this.gainMaster = this.ctx.createGain();
            this.gainMaster.gain.value = 0.8;
            this.gainMaster.connect(this.ctx.destination);

            this.bgmGain = this.ctx.createGain();
            this.bgmGain.gain.value = 0.22;
            this.bgmGain.connect(this.gainMaster);

            this.sfxGain = this.ctx.createGain();
            this.sfxGain.gain.value = 0.35;
            this.sfxGain.connect(this.gainMaster);
        } catch (e) {
            console.warn('[XenonAudio] AudioContext init failed:', e);
        }
    }

    ensureContext() {
        this.init();
        if (this.ctx && this.ctx.state === 'suspended') {
            this.ctx.resume();
        }
    }

    setMute(muted) {
        this.isMuted = muted;
        if (this.gainMaster) {
            this.gainMaster.gain.value = muted ? 0 : 0.8;
        }
    }

    // --- SOUND EFFECTS ---
    playLaser(type = 'normal') {
        if (this.isMuted) return;
        this.ensureContext();
        if (!this.ctx) return;

        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        const now = this.ctx.currentTime;

        osc.type = type === 'spread' ? 'sawtooth' : 'square';
        const startFreq = type === 'spread' ? 880 : 700;
        const endFreq = type === 'spread' ? 220 : 180;

        osc.frequency.setValueAtTime(startFreq, now);
        osc.frequency.exponentialRampToValueAtTime(endFreq, now + 0.08);

        gain.gain.setValueAtTime(0.25, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);

        osc.connect(gain);
        gain.connect(this.sfxGain);

        osc.start(now);
        osc.stop(now + 0.09);
    }

    playMissile() {
        if (this.isMuted) return;
        this.ensureContext();
        if (!this.ctx) return;

        const now = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(260, now);
        osc.frequency.linearRampToValueAtTime(520, now + 0.15);

        gain.gain.setValueAtTime(0.2, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.18);

        osc.connect(gain);
        gain.connect(this.sfxGain);

        osc.start(now);
        osc.stop(now + 0.19);
    }

    playExplosion(isLarge = false) {
        if (this.isMuted) return;
        this.ensureContext();
        if (!this.ctx) return;

        const now = this.ctx.currentTime;
        const dur = isLarge ? 0.45 : 0.22;

        // White noise buffer
        const bufferSize = this.ctx.sampleRate * dur;
        const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
        const output = buffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) {
            output[i] = Math.random() * 2 - 1;
        }

        const whiteNoise = this.ctx.createBufferSource();
        whiteNoise.buffer = buffer;

        const filter = this.ctx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(isLarge ? 400 : 800, now);
        filter.frequency.exponentialRampToValueAtTime(80, now + dur);

        const gain = this.ctx.createGain();
        gain.gain.setValueAtTime(isLarge ? 0.6 : 0.35, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + dur);

        whiteNoise.connect(filter);
        filter.connect(gain);
        gain.connect(this.sfxGain);

        whiteNoise.start(now);
        whiteNoise.stop(now + dur);

        // Sub bass thump for large explosions
        if (isLarge) {
            const sub = this.ctx.createOscillator();
            const subGain = this.ctx.createGain();
            sub.type = 'sine';
            sub.frequency.setValueAtTime(120, now);
            sub.frequency.exponentialRampToValueAtTime(30, now + dur);

            subGain.gain.setValueAtTime(0.5, now);
            subGain.gain.exponentialRampToValueAtTime(0.001, now + dur);

            sub.connect(subGain);
            subGain.connect(this.sfxGain);

            sub.start(now);
            sub.stop(now + dur);
        }
    }

    playMegablastBomb() {
        if (this.isMuted) return;
        this.ensureContext();
        if (!this.ctx) return;

        const now = this.ctx.currentTime;
        const dur = 0.9;

        // Huge shockwave noise sweep
        const bufferSize = this.ctx.sampleRate * dur;
        const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) {
            data[i] = Math.random() * 2 - 1;
        }

        const noise = this.ctx.createBufferSource();
        noise.buffer = buffer;

        const filter = this.ctx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.Q.value = 6;
        filter.frequency.setValueAtTime(1500, now);
        filter.frequency.exponentialRampToValueAtTime(60, now + dur);

        const gain = this.ctx.createGain();
        gain.gain.setValueAtTime(0.8, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + dur);

        noise.connect(filter);
        filter.connect(gain);
        gain.connect(this.sfxGain);

        noise.start(now);
        noise.stop(now + dur);

        // Sub blast rumble
        const sub = this.ctx.createOscillator();
        const subGain = this.ctx.createGain();
        sub.type = 'sawtooth';
        sub.frequency.setValueAtTime(140, now);
        sub.frequency.exponentialRampToValueAtTime(20, now + dur);

        subGain.gain.setValueAtTime(0.6, now);
        subGain.gain.exponentialRampToValueAtTime(0.001, now + dur);

        sub.connect(subGain);
        subGain.connect(this.sfxGain);

        sub.start(now);
        sub.stop(now + dur);
    }

    playPowerUp() {
        if (this.isMuted) return;
        this.ensureContext();
        if (!this.ctx) return;

        const now = this.ctx.currentTime;
        const notes = [440, 554, 659, 880]; // A4, C#5, E5, A5
        notes.forEach((freq, idx) => {
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            const noteStart = now + idx * 0.05;

            osc.type = 'square';
            osc.frequency.setValueAtTime(freq, noteStart);

            gain.gain.setValueAtTime(0.2, noteStart);
            gain.gain.exponentialRampToValueAtTime(0.001, noteStart + 0.08);

            osc.connect(gain);
            gain.connect(this.sfxGain);

            osc.start(noteStart);
            osc.stop(noteStart + 0.09);
        });
    }

    playHit() {
        if (this.isMuted) return;
        this.ensureContext();
        if (!this.ctx) return;

        const now = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = 'triangle';
        osc.frequency.setValueAtTime(160, now);
        osc.frequency.exponentialRampToValueAtTime(40, now + 0.06);

        gain.gain.setValueAtTime(0.3, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.06);

        osc.connect(gain);
        gain.connect(this.sfxGain);

        osc.start(now);
        osc.stop(now + 0.07);
    }

    // --- RETRO 16-BIT MEGABLAST SYNTH BGM LOOP ---
    startBgm() {
        if (this.isPlayingBgm) return;
        this.ensureContext();
        this.isPlayingBgm = true;
        this.step = 0;

        // Xenon 2 "Megablast" Synth Bassline Pattern (16-step funk cyberpunk loop)
        // Root: C minor / F minor funk groove (128 BPM, 16th notes = ~117ms per step)
        const bassNotes = [
            130.81, 0, 130.81, 155.56,  // C3, -, C3, Eb3
            174.61, 0, 130.81, 116.54,  // F3, -, C3, Bb2
            130.81, 130.81, 0, 155.56,  // C3, C3, -, Eb3
            174.61, 196.00, 155.56, 130.81 // F3, G3, Eb3, C3
        ];

        const leadNotes = [
            523.25, 0, 523.25, 0,       // C5, -, C5, -
            622.25, 0, 587.33, 0,       // Eb5, -, D5, -
            523.25, 0, 466.16, 0,       // C5, -, Bb4, -
            523.25, 622.25, 698.46, 523.25 // C5, Eb5, F5, C5
        ];

        const stepDuration = 117; // ms (approx 128 BPM)

        this.bgmTimer = setInterval(() => {
            if (!this.isPlayingBgm || this.isMuted || !this.ctx) return;
            const now = this.ctx.currentTime;
            const currentStep = this.step % 16;

            // 1. Synth Bass Note
            const bFreq = bassNotes[currentStep];
            if (bFreq > 0) {
                const bOsc = this.ctx.createOscillator();
                const bGain = this.ctx.createGain();
                const bFilter = this.ctx.createBiquadFilter();

                bOsc.type = 'sawtooth';
                bOsc.frequency.setValueAtTime(bFreq, now);

                bFilter.type = 'lowpass';
                bFilter.frequency.setValueAtTime(700, now);
                bFilter.frequency.exponentialRampToValueAtTime(180, now + 0.1);

                bGain.gain.setValueAtTime(0.35, now);
                bGain.gain.exponentialRampToValueAtTime(0.01, now + 0.1);

                bOsc.connect(bFilter);
                bFilter.connect(bGain);
                bGain.connect(this.bgmGain);

                bOsc.start(now);
                bOsc.stop(now + 0.11);
            }

            // 2. Electro Hi-Hat / Snare Drum
            if (currentStep % 4 === 2) {
                // Snare (beats 2 & 4)
                const snOsc = this.ctx.createOscillator();
                const snGain = this.ctx.createGain();
                snOsc.type = 'triangle';
                snOsc.frequency.setValueAtTime(180, now);
                snOsc.frequency.exponentialRampToValueAtTime(40, now + 0.08);

                snGain.gain.setValueAtTime(0.3, now);
                snGain.gain.exponentialRampToValueAtTime(0.01, now + 0.08);

                snOsc.connect(snGain);
                snGain.connect(this.bgmGain);
                snOsc.start(now);
                snOsc.stop(now + 0.09);
            } else if (currentStep % 2 === 0) {
                // Hi-Hat noise
                const hatNoise = this.ctx.createOscillator();
                const hatGain = this.ctx.createGain();
                hatNoise.type = 'square';
                hatNoise.frequency.setValueAtTime(12000, now);

                hatGain.gain.setValueAtTime(0.08, now);
                hatGain.gain.exponentialRampToValueAtTime(0.001, now + 0.03);

                hatNoise.connect(hatGain);
                hatGain.connect(this.bgmGain);
                hatNoise.start(now);
                hatNoise.stop(now + 0.035);
            }

            // 3. Cyber Lead synth on alternating bars
            if (this.step >= 32 && (this.step % 64 < 32)) {
                const lFreq = leadNotes[currentStep];
                if (lFreq > 0) {
                    const lOsc = this.ctx.createOscillator();
                    const lGain = this.ctx.createGain();
                    lOsc.type = 'square';
                    lOsc.frequency.setValueAtTime(lFreq, now);

                    lGain.gain.setValueAtTime(0.18, now);
                    lGain.gain.exponentialRampToValueAtTime(0.01, now + 0.09);

                    lOsc.connect(lGain);
                    lGain.connect(this.bgmGain);
                    lOsc.start(now);
                    lOsc.stop(now + 0.1);
                }
            }

            this.step++;
        }, stepDuration);
    }

    stopBgm() {
        this.isPlayingBgm = false;
        if (this.bgmTimer) {
            clearInterval(this.bgmTimer);
            this.bgmTimer = null;
        }
    }
}

// Global audio engine singleton
const xenonAudio = new XenonAudioEngine();

// ============================================================================
// STAGE CONFIGURATIONS & ALIEN ARCHETYPES
// ============================================================================
const STAGES = [
    {
        stageNumber: 1,
        name: 'SECTOR 1: BIO-CAVERN',
        subtitle: 'Alien Outpost Infiltration',
        themeColor: '#06b6d4',
        cavernColor: '#164e63',
        bossName: 'NAUTILUS CRUSHER',
        bossHp: 80,
        enemySpeedMul: 1.0,
        spawnInterval: 1200
    },
    {
        stageNumber: 2,
        name: 'SECTOR 2: CYBER HIVE',
        subtitle: 'Bio-Mechanical Breeding Core',
        themeColor: '#a855f7',
        cavernColor: '#581c87',
        bossName: 'ARACHNID BEHEMOTH',
        bossHp: 140,
        enemySpeedMul: 1.25,
        spawnInterval: 950
    },
    {
        stageNumber: 3,
        name: 'SECTOR 3: DEEP CORE MEGABLAST',
        subtitle: 'Final Bio-Matrix Mother Brain',
        themeColor: '#ef4444',
        cavernColor: '#7f1d1d',
        bossName: 'XENON OVERMIND CORE',
        bossHp: 220,
        enemySpeedMul: 1.5,
        spawnInterval: 750
    }
];

export default function AirplaneGame({
    socket,
    pin,
    isHost = false,
    nickname = '호스트',
    groupId = null,
    baseScore = 0,
    onExit
}) {
    const canvasRef = useRef(null);
    const containerRef = useRef(null);

    // Game state hooks
    const [gameState, setGameState] = useState('ready'); // 'ready', 'playing', 'paused', 'gameover', 'victory'
    const [score, setScore] = useState(0);
    const [highScore, setHighScore] = useState(() => {
        try {
            return parseInt(localStorage.getItem('xenon_high_score') || '0', 10);
        } catch (e) {
            return 0;
        }
    });
    const [lives, setLives] = useState(3);
    const [shield, setShield] = useState(100);
    const [bombs, setBombs] = useState(3);
    const [weaponLevel, setWeaponLevel] = useState(1);
    const [currentStageIdx, setCurrentStageIdx] = useState(0);
    const [isMuted, setIsMuted] = useState(false);
    const [autoFire, setAutoFire] = useState(true);
    const [bossActive, setBossActive] = useState(false);
    const [bossHp, setBossHp] = useState(0);
    const [maxBossHp, setMaxBossHp] = useState(100);

    // Real-time animation & game loop refs
    const stateRef = useRef({
        player: {
            x: 250,
            y: 550,
            width: 48,
            height: 52,
            speed: 6.2,
            vx: 0,
            vy: 0,
            invulnerable: 0,
            tilt: 0
        },
        keys: {},
        bullets: [],
        missiles: [],
        enemyBullets: [],
        enemies: [],
        powerups: [],
        particles: [],
        stars: [],
        shockwaves: [],
        lastShotTime: 0,
        lastMissileTime: 0,
        lastSpawnTime: 0,
        spawnCount: 0,
        boss: null,
        cavernOffset: 0,
        reverseScroll: 0,
        screenShake: 0,
        score: 0,
        lives: 3,
        shield: 100,
        bombs: 3,
        weaponLevel: 1,
        stageIdx: 0,
        isRunning: false
    });

    const broadcastChannelRef = useRef(null);

    // Setup broadcast channel for subscreen sync
    useEffect(() => {
        try {
            broadcastChannelRef.current = new BroadcastChannel('quizrun_screen_sync');
        } catch (e) {}
        return () => {
            if (broadcastChannelRef.current) {
                broadcastChannelRef.current.close();
            }
        };
    }, []);

    // Broadcast live game state to Sub-monitor / Spectators
    const broadcastGameState = useCallback((extra = {}) => {
        const payload = {
            gameId: 'timeattack',
            gameTitle: '비행기게임 (Xenon 2: Megablast)',
            score: stateRef.current.score,
            lives: stateRef.current.lives,
            shield: stateRef.current.shield,
            bombs: stateRef.current.bombs,
            weaponLevel: stateRef.current.weaponLevel,
            stage: STAGES[stateRef.current.stageIdx].name,
            isAlive: stateRef.current.lives > 0,
            isFinished: stateRef.current.lives <= 0,
            ...extra
        };

        if (broadcastChannelRef.current) {
            broadcastChannelRef.current.postMessage({
                type: 'AIRPLANE_GAME_UPDATE',
                payload
            });
        }

        if (socket && pin) {
            socket.emit('game:practice_stream', {
                pin,
                nickname,
                groupId,
                score: stateRef.current.score,
                isAlive: stateRef.current.lives > 0,
                isFinished: stateRef.current.lives <= 0,
                gameData: payload
            });
        }
    }, [socket, pin, nickname, groupId]);

    // Toggle Mute
    const toggleMute = () => {
        const nextMute = !isMuted;
        setIsMuted(nextMute);
        xenonAudio.setMute(nextMute);
    };

    // Initialize stars & background
    const initStars = (width, height) => {
        const stars = [];
        for (let i = 0; i < 60; i++) {
            stars.push({
                x: Math.random() * width,
                y: Math.random() * height,
                size: Math.random() * 2.2 + 0.6,
                speed: Math.random() * 1.8 + 0.8,
                color: Math.random() > 0.4 ? '#38bdf8' : (Math.random() > 0.5 ? '#cbd5e1' : '#f43f5e'),
                alpha: Math.random() * 0.8 + 0.2
            });
        }
        return stars;
    };

    // Fire Player Weapons
    const fireWeapon = () => {
        const now = Date.now();
        const p = stateRef.current.player;
        const wLv = stateRef.current.weaponLevel;

        if (now - stateRef.current.lastShotTime < 130) return; // Fire rate cap
        stateRef.current.lastShotTime = now;

        xenonAudio.playLaser(wLv >= 3 ? 'spread' : 'normal');

        // Level 1: Twin Cyan Lasers
        if (wLv === 1) {
            stateRef.current.bullets.push(
                { x: p.x - 12, y: p.y - 18, vx: 0, vy: -14, damage: 1, color: '#38bdf8', width: 4, height: 16 },
                { x: p.x + 12, y: p.y - 18, vx: 0, vy: -14, damage: 1, color: '#38bdf8', width: 4, height: 16 }
            );
        }
        // Level 2: Heavy Twin Blasters
        else if (wLv === 2) {
            stateRef.current.bullets.push(
                { x: p.x - 14, y: p.y - 20, vx: 0, vy: -15, damage: 1.5, color: '#67e8f9', width: 6, height: 20 },
                { x: p.x + 14, y: p.y - 20, vx: 0, vy: -15, damage: 1.5, color: '#67e8f9', width: 6, height: 20 }
            );
        }
        // Level 3: Triple Spread Laser
        else if (wLv === 3) {
            stateRef.current.bullets.push(
                { x: p.x, y: p.y - 22, vx: 0, vy: -15, damage: 1.5, color: '#38bdf8', width: 6, height: 20 },
                { x: p.x - 16, y: p.y - 16, vx: -3.5, vy: -14, damage: 1.2, color: '#a855f7', width: 5, height: 18 },
                { x: p.x + 16, y: p.y - 16, vx: 3.5, vy: -14, damage: 1.2, color: '#a855f7', width: 5, height: 18 }
            );
        }
        // Level 4: Quad Plasma Barrage
        else if (wLv === 4) {
            stateRef.current.bullets.push(
                { x: p.x - 10, y: p.y - 22, vx: 0, vy: -16, damage: 1.8, color: '#38bdf8', width: 6, height: 22 },
                { x: p.x + 10, y: p.y - 22, vx: 0, vy: -16, damage: 1.8, color: '#38bdf8', width: 6, height: 22 },
                { x: p.x - 22, y: p.y - 12, vx: -4.5, vy: -13, damage: 1.4, color: '#f43f5e', width: 5, height: 18 },
                { x: p.x + 22, y: p.y - 12, vx: 4.5, vy: -13, damage: 1.4, color: '#f43f5e', width: 5, height: 18 }
            );
        }
        // Level 5: 5-Way Max Megablaster Spread + Rear Vulcans
        else {
            stateRef.current.bullets.push(
                { x: p.x, y: p.y - 24, vx: 0, vy: -17, damage: 2.2, color: '#fbbf24', width: 8, height: 24 },
                { x: p.x - 12, y: p.y - 20, vx: -2.5, vy: -16, damage: 1.8, color: '#38bdf8', width: 6, height: 20 },
                { x: p.x + 12, y: p.y - 20, vx: 2.5, vy: -16, damage: 1.8, color: '#38bdf8', width: 6, height: 20 },
                { x: p.x - 24, y: p.y - 14, vx: -5.5, vy: -14, damage: 1.5, color: '#ec4899', width: 5, height: 18 },
                { x: p.x + 24, y: p.y - 14, vx: 5.5, vy: -14, damage: 1.5, color: '#ec4899', width: 5, height: 18 },
                // Rear vulcans
                { x: p.x - 8, y: p.y + 20, vx: -1.5, vy: 12, damage: 1.2, color: '#94a3b8', width: 4, height: 14 },
                { x: p.x + 8, y: p.y + 20, vx: 1.5, vy: 12, damage: 1.2, color: '#94a3b8', width: 4, height: 14 }
            );
        }

        // Homing Missile barrage if upgraded
        if (wLv >= 2 && now - stateRef.current.lastMissileTime > 900) {
            stateRef.current.lastMissileTime = now;
            xenonAudio.playMissile();
            stateRef.current.missiles.push(
                { x: p.x - 24, y: p.y, vx: -3, vy: -5, target: null, damage: 4 },
                { x: p.x + 24, y: p.y, vx: 3, vy: -5, target: null, damage: 4 }
            );
        }
    };

    // Trigger Megablast Super Bomb
    const triggerMegablast = () => {
        if (stateRef.current.bombs <= 0 || gameState !== 'playing') return;

        stateRef.current.bombs--;
        setBombs(stateRef.current.bombs);

        xenonAudio.playMegablastBomb();
        stateRef.current.screenShake = 22;

        const p = stateRef.current.player;

        // Shockwave animation
        stateRef.current.shockwaves.push({
            x: p.x,
            y: p.y,
            radius: 10,
            maxRadius: 650,
            alpha: 1.0
        });

        // Clear all enemy bullets
        stateRef.current.enemyBullets = [];

        // Heavy damage / destruction to all enemies
        stateRef.current.enemies.forEach(en => {
            en.hp -= 20;
            xenonAudio.playExplosion(false);
            createExplosion(en.x, en.y, '#f43f5e', 18);
        });

        // Damage boss if active
        if (stateRef.current.boss) {
            stateRef.current.boss.hp -= 25;
            setBossHp(Math.max(0, stateRef.current.boss.hp));
            createExplosion(stateRef.current.boss.x, stateRef.current.boss.y, '#f59e0b', 30);
        }

        broadcastGameState();
    };

    // Create explosion particle shower
    const createExplosion = (x, y, color = '#f59e0b', count = 12) => {
        for (let i = 0; i < count; i++) {
            const angle = Math.random() * Math.PI * 2;
            const speed = Math.random() * 5 + 1.5;
            stateRef.current.particles.push({
                x,
                y,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed,
                color,
                size: Math.random() * 4 + 2,
                alpha: 1.0,
                life: Math.random() * 20 + 15
            });
        }
    };

    // Spawn Enemy Wave
    const spawnEnemy = (canvasWidth) => {
        const stage = STAGES[stateRef.current.stageIdx];
        const types = ['wasp', 'pod', 'spider', 'nautilus'];
        // Pick enemy based on count and stage
        const rand = Math.random();
        let type = 'wasp';
        if (rand < 0.45) type = 'wasp';
        else if (rand < 0.75) type = 'pod';
        else if (rand < 0.90) type = 'spider';
        else type = 'nautilus';

        const padding = 60;
        const x = Math.random() * (canvasWidth - padding * 2) + padding;

        const enemy = {
            id: Date.now() + Math.random(),
            type,
            x,
            y: -50,
            vx: (Math.random() - 0.5) * 2,
            vy: (type === 'wasp' ? 3.5 : (type === 'spider' ? 4.5 : 2.2)) * stage.enemySpeedMul,
            baseX: x,
            angle: 0,
            width: type === 'nautilus' ? 48 : (type === 'pod' ? 38 : 32),
            height: type === 'nautilus' ? 48 : (type === 'pod' ? 38 : 32),
            hp: (type === 'nautilus' ? 12 : (type === 'pod' ? 5 : (type === 'spider' ? 3 : 2))) * (stateRef.current.stageIdx + 1),
            maxHp: (type === 'nautilus' ? 12 : (type === 'pod' ? 5 : (type === 'spider' ? 3 : 2))) * (stateRef.current.stageIdx + 1),
            scoreVal: type === 'nautilus' ? 250 : (type === 'pod' ? 120 : (type === 'spider' ? 80 : 50)),
            shootTimer: Math.random() * 60 + 30
        };

        stateRef.current.enemies.push(enemy);
        stateRef.current.spawnCount++;

        // Trigger Boss after 28 waves
        if (stateRef.current.spawnCount >= 28 && !stateRef.current.boss && !bossActive) {
            spawnBoss(canvasWidth);
        }
    };

    // Spawn Stage Boss: "Xenon Behemoth"
    const spawnBoss = (canvasWidth) => {
        const stage = STAGES[stateRef.current.stageIdx];
        stateRef.current.boss = {
            name: stage.bossName,
            x: canvasWidth / 2,
            y: -100,
            targetY: 120,
            width: 140,
            height: 90,
            hp: stage.bossHp,
            maxHp: stage.bossHp,
            vx: 2.2,
            shootTimer: 0,
            laserTimer: 0,
            isOpen: false,
            turretLeftHp: 30,
            turretRightHp: 30
        };

        setBossActive(true);
        setBossHp(stage.bossHp);
        setMaxBossHp(stage.bossHp);
        xenonAudio.playExplosion(true);
    };

    // Start New Game or Restart
    const startGame = (stageIndex = 0) => {
        xenonAudio.ensureContext();
        xenonAudio.startBgm();

        const canvas = canvasRef.current;
        const w = canvas ? canvas.width : 500;
        const h = canvas ? canvas.height : 700;

        stateRef.current = {
            ...stateRef.current,
            player: {
                x: w / 2,
                y: h - 90,
                width: 48,
                height: 52,
                speed: 6.2,
                vx: 0,
                vy: 0,
                invulnerable: 60,
                tilt: 0
            },
            keys: {},
            bullets: [],
            missiles: [],
            enemyBullets: [],
            enemies: [],
            powerups: [],
            particles: [],
            stars: initStars(w, h),
            shockwaves: [],
            lastShotTime: 0,
            lastMissileTime: 0,
            lastSpawnTime: Date.now(),
            spawnCount: 0,
            boss: null,
            cavernOffset: 0,
            reverseScroll: 0,
            screenShake: 0,
            score: stageIndex === 0 ? 0 : stateRef.current.score,
            lives: 3,
            shield: 100,
            bombs: 3,
            weaponLevel: 1,
            stageIdx: stageIndex,
            isRunning: true
        };

        setScore(stateRef.current.score);
        setLives(3);
        setShield(100);
        setBombs(3);
        setWeaponLevel(1);
        setCurrentStageIdx(stageIndex);
        setBossActive(false);
        setGameState('playing');

        broadcastGameState({ state: 'playing' });
    };

    // Pause / Resume
    const togglePause = () => {
        if (gameState === 'playing') {
            setGameState('paused');
            xenonAudio.stopBgm();
        } else if (gameState === 'paused') {
            setGameState('playing');
            xenonAudio.startBgm();
        }
    };

    // Keyboard Event Handlers
    useEffect(() => {
        const handleKeyDown = (e) => {
            stateRef.current.keys[e.code] = true;

            if (e.code === 'Space' || e.code === 'KeyZ') {
                e.preventDefault();
                if (gameState === 'playing') {
                    fireWeapon();
                } else if (gameState === 'ready' || gameState === 'gameover' || gameState === 'victory') {
                    startGame(0);
                }
            } else if (e.code === 'KeyX' || e.code === 'ShiftLeft' || e.code === 'ShiftRight' || e.code === 'KeyB') {
                e.preventDefault();
                if (gameState === 'playing') {
                    triggerMegablast();
                }
            } else if (e.code === 'KeyP') {
                togglePause();
            } else if (e.code === 'KeyM') {
                toggleMute();
            }
        };

        const handleKeyUp = (e) => {
            stateRef.current.keys[e.code] = false;
        };

        window.addEventListener('keydown', handleKeyDown);
        window.addEventListener('keyup', handleKeyUp);

        return () => {
            window.removeEventListener('keydown', handleKeyDown);
            window.removeEventListener('keyup', handleKeyUp);
        };
    }, [gameState]);

    // Touch / Mouse Drag Steering
    const handlePointerMove = (e) => {
        if (gameState !== 'playing' || !canvasRef.current) return;
        const rect = canvasRef.current.getBoundingClientRect();
        const clientX = e.clientX || (e.touches && e.touches[0].clientX);
        const clientY = e.clientY || (e.touches && e.touches[0].clientY);

        if (clientX === undefined || clientY === undefined) return;

        const scaleX = canvasRef.current.width / rect.width;
        const scaleY = canvasRef.current.height / rect.height;

        const targetX = (clientX - rect.left) * scaleX;
        // Finger offset: 40px above finger so player's ship isn't covered by thumb!
        const targetY = (clientY - rect.top) * scaleY - 45;

        const p = stateRef.current.player;
        p.x = Math.max(40, Math.min(canvasRef.current.width - 40, targetX));
        p.y = Math.max(60, Math.min(canvasRef.current.height - 50, targetY));
    };

    // MAIN 60FPS GAME LOOP
    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');

        let animationFrameId;

        const render = () => {
            const w = canvas.width;
            const h = canvas.height;
            const st = stateRef.current;
            const p = st.player;
            const stage = STAGES[st.stageIdx];

            // ----------------------------------------------------
            // 1. UPDATE GAME LOGIC (IF PLAYING)
            // ----------------------------------------------------
            if (gameState === 'playing') {
                // Screen shake reduction
                if (st.screenShake > 0) st.screenShake *= 0.88;
                if (st.screenShake < 0.2) st.screenShake = 0;

                // Player Movement via Keys
                let moveX = 0;
                let moveY = 0;
                if (st.keys['ArrowLeft'] || st.keys['KeyA']) moveX -= 1;
                if (st.keys['ArrowRight'] || st.keys['KeyD']) moveX += 1;
                if (st.keys['ArrowUp'] || st.keys['KeyW']) moveY -= 1;
                if (st.keys['ArrowDown'] || st.keys['KeyS']) moveY += 1;

                // Xenon 2 signature reverse-scroll effect when pulling back down
                if (moveY > 0) {
                    st.reverseScroll = Math.min(3, st.reverseScroll + 0.2);
                } else {
                    st.reverseScroll = Math.max(0, st.reverseScroll - 0.1);
                }

                // Tilt animation
                if (moveX < 0) p.tilt = Math.max(-0.25, p.tilt - 0.05);
                else if (moveX > 0) p.tilt = Math.min(0.25, p.tilt + 0.05);
                else p.tilt *= 0.82;

                p.x += moveX * p.speed;
                p.y += moveY * p.speed;

                // Clamp player bounds
                const wallMargin = 42;
                p.x = Math.max(wallMargin, Math.min(w - wallMargin, p.x));
                p.y = Math.max(50, Math.min(h - 50, p.y));

                // Auto-fire or held spacebar
                if (autoFire || st.keys['Space'] || st.keys['KeyZ']) {
                    fireWeapon();
                }

                // Invulnerability decrement
                if (p.invulnerable > 0) p.invulnerable--;

                // Scrolling Background offset
                st.cavernOffset += (2.4 - st.reverseScroll);

                // Update Stars
                st.stars.forEach(s => {
                    s.y += (s.speed * 2.2 - st.reverseScroll * 0.8);
                    if (s.y > h) {
                        s.y = 0;
                        s.x = Math.random() * w;
                    } else if (s.y < 0) {
                        s.y = h;
                    }
                });

                // Spawn Enemies
                const now = Date.now();
                if (!st.boss && now - st.lastSpawnTime > stage.spawnInterval) {
                    st.lastSpawnTime = now;
                    spawnEnemy(w);
                }

                // Update Bullets
                for (let i = st.bullets.length - 1; i >= 0; i--) {
                    const b = st.bullets[i];
                    b.x += b.vx;
                    b.y += b.vy;
                    if (b.y < -30 || b.y > h + 30 || b.x < 0 || b.x > w) {
                        st.bullets.splice(i, 1);
                    }
                }

                // Update Homing Missiles
                for (let i = st.missiles.length - 1; i >= 0; i--) {
                    const m = st.missiles[i];

                    // Find closest enemy or boss
                    let target = st.boss || null;
                    if (!target && st.enemies.length > 0) {
                        let minDist = 99999;
                        st.enemies.forEach(en => {
                            const d = Math.hypot(en.x - m.x, en.y - m.y);
                            if (d < minDist) {
                                minDist = d;
                                target = en;
                            }
                        });
                    }

                    if (target) {
                        const angle = Math.atan2(target.y - m.y, target.x - m.x);
                        m.vx = m.vx * 0.92 + Math.cos(angle) * 2.2;
                        m.vy = m.vy * 0.92 + Math.sin(angle) * 2.2;
                    }

                    m.x += m.vx;
                    m.y += m.vy;

                    // Smoke trail particles
                    if (Math.random() > 0.3) {
                        st.particles.push({
                            x: m.x,
                            y: m.y + 6,
                            vx: (Math.random() - 0.5) * 1.5,
                            vy: Math.random() * 2 + 1,
                            color: '#94a3b8',
                            size: 3,
                            alpha: 0.8,
                            life: 14
                        });
                    }

                    if (m.y < -40 || m.y > h + 40 || m.x < 0 || m.x > w) {
                        st.missiles.splice(i, 1);
                    }
                }

                // Update Enemies & Collisions
                for (let i = st.enemies.length - 1; i >= 0; i--) {
                    const en = st.enemies[i];
                    en.angle += 0.05;

                    // Sine wave movement for wasps
                    if (en.type === 'wasp') {
                        en.x = en.baseX + Math.sin(en.angle * 1.8) * 55;
                    } else if (en.type === 'spider') {
                        en.x += en.vx * 1.4;
                        if (en.x < wallMargin + 10 || en.x > w - wallMargin - 10) en.vx *= -1;
                    }

                    en.y += en.vy;

                    // Enemy shooting plasma
                    en.shootTimer--;
                    if (en.shootTimer <= 0 && en.y > 40 && en.y < h - 120) {
                        en.shootTimer = Math.random() * 70 + 50;
                        const angleToP = Math.atan2(p.y - en.y, p.x - en.x);
                        const bSpeed = 3.6;
                        st.enemyBullets.push({
                            x: en.x,
                            y: en.y + 10,
                            vx: Math.cos(angleToP) * bSpeed,
                            vy: Math.sin(angleToP) * bSpeed,
                            radius: 5,
                            color: '#f43f5e'
                        });
                    }

                    // Check bullet hit on enemy
                    for (let j = st.bullets.length - 1; j >= 0; j--) {
                        const b = st.bullets[j];
                        if (Math.abs(b.x - en.x) < en.width / 2 + b.width / 2 && Math.abs(b.y - en.y) < en.height / 2 + b.height / 2) {
                            en.hp -= b.damage;
                            st.bullets.splice(j, 1);
                            createExplosion(b.x, b.y, '#38bdf8', 4);
                            xenonAudio.playHit();
                            break;
                        }
                    }

                    // Check missile hit on enemy
                    for (let j = st.missiles.length - 1; j >= 0; j--) {
                        const m = st.missiles[j];
                        if (Math.hypot(m.x - en.x, m.y - en.y) < en.width / 2 + 10) {
                            en.hp -= m.damage;
                            st.missiles.splice(j, 1);
                            xenonAudio.playExplosion(false);
                            createExplosion(m.x, m.y, '#f59e0b', 10);
                            break;
                        }
                    }

                    // Enemy death
                    if (en.hp <= 0) {
                        xenonAudio.playExplosion(en.type === 'nautilus');
                        createExplosion(en.x, en.y, en.type === 'nautilus' ? '#a855f7' : '#f97316', en.type === 'nautilus' ? 24 : 14);

                        st.score += en.scoreVal;
                        setScore(st.score);
                        if (st.score > highScore) {
                            setHighScore(st.score);
                            try { localStorage.setItem('xenon_high_score', st.score.toString()); } catch (e) {}
                        }

                        // Chance to drop power-up orb
                        if (Math.random() < 0.22) {
                            const pTypes = ['weapon', 'shield', 'bomb', 'crystal', 'crystal'];
                            const pType = pTypes[Math.floor(Math.random() * pTypes.length)];
                            st.powerups.push({
                                x: en.x,
                                y: en.y,
                                type: pType,
                                vy: 1.8,
                                radius: 14,
                                pulse: 0
                            });
                        }

                        st.enemies.splice(i, 1);
                        continue;
                    }

                    // Enemy collision with player
                    if (p.invulnerable <= 0 && Math.hypot(en.x - p.x, en.y - p.y) < en.width / 2 + 16) {
                        st.shield -= 25;
                        p.invulnerable = 45;
                        xenonAudio.playHit();
                        createExplosion(p.x, p.y, '#ef4444', 12);
                        if (st.shield <= 0) {
                            handlePlayerDeath();
                        } else {
                            setShield(st.shield);
                        }
                    }

                    // Remove off-screen enemies
                    if (en.y > h + 60) {
                        st.enemies.splice(i, 1);
                    }
                }

                // Update Enemy Bullets
                for (let i = st.enemyBullets.length - 1; i >= 0; i--) {
                    const eb = st.enemyBullets[i];
                    eb.x += eb.vx;
                    eb.y += eb.vy;

                    // Bullet hit on player
                    if (p.invulnerable <= 0 && Math.hypot(eb.x - p.x, eb.y - p.y) < eb.radius + 14) {
                        st.shield -= 15;
                        p.invulnerable = 35;
                        st.enemyBullets.splice(i, 1);
                        xenonAudio.playHit();
                        createExplosion(eb.x, eb.y, '#f43f5e', 8);

                        if (st.shield <= 0) {
                            handlePlayerDeath();
                        } else {
                            setShield(st.shield);
                        }
                        continue;
                    }

                    if (eb.y > h + 20 || eb.y < -20 || eb.x < 0 || eb.x > w) {
                        st.enemyBullets.splice(i, 1);
                    }
                }

                // Update Power-ups
                for (let i = st.powerups.length - 1; i >= 0; i--) {
                    const pu = st.powerups[i];
                    pu.y += pu.vy;
                    pu.pulse += 0.08;

                    // Collect Power-up
                    if (Math.hypot(pu.x - p.x, pu.y - p.y) < pu.radius + 20) {
                        xenonAudio.playPowerUp();
                        if (pu.type === 'weapon') {
                            st.weaponLevel = Math.min(5, st.weaponLevel + 1);
                            setWeaponLevel(st.weaponLevel);
                        } else if (pu.type === 'shield') {
                            st.shield = Math.min(100, st.shield + 40);
                            setShield(st.shield);
                        } else if (pu.type === 'bomb') {
                            st.bombs = Math.min(6, st.bombs + 1);
                            setBombs(st.bombs);
                        } else if (pu.type === 'crystal') {
                            st.score += 250;
                            setScore(st.score);
                        }

                        createExplosion(pu.x, pu.y, '#38bdf8', 10);
                        st.powerups.splice(i, 1);
                        continue;
                    }

                    if (pu.y > h + 30) {
                        st.powerups.splice(i, 1);
                    }
                }

                // Update Boss Logic
                if (st.boss) {
                    const b = st.boss;
                    // Descend into position
                    if (b.y < b.targetY) {
                        b.y += 1.5;
                    } else {
                        // Sway left & right
                        b.x += b.vx;
                        if (b.x < 120 || b.x > w - 120) b.vx *= -1;

                        // Shoot pattern
                        b.shootTimer++;
                        if (b.shootTimer > 60) {
                            b.shootTimer = 0;
                            // 5-way spread plasma burst
                            for (let k = -2; k <= 2; k++) {
                                st.enemyBullets.push({
                                    x: b.x + k * 18,
                                    y: b.y + 45,
                                    vx: k * 1.5,
                                    vy: 4.2,
                                    radius: 6,
                                    color: '#f59e0b'
                                });
                            }
                        }

                        // Periodic central laser burst
                        b.laserTimer++;
                        if (b.laserTimer > 180) {
                            b.isOpen = true;
                            if (b.laserTimer > 240) {
                                b.laserTimer = 0;
                                b.isOpen = false;
                                // Rapid aimed stream
                                for (let k = -1; k <= 1; k++) {
                                    st.enemyBullets.push({
                                        x: b.x + k * 15,
                                        y: b.y + 50,
                                        vx: (p.x - b.x) * 0.025 + k * 0.8,
                                        vy: 5.5,
                                        radius: 8,
                                        color: '#ef4444'
                                    });
                                }
                            }
                        }
                    }

                    // Check bullet hit on boss
                    for (let j = st.bullets.length - 1; j >= 0; j--) {
                        const bl = st.bullets[j];
                        if (Math.abs(bl.x - b.x) < b.width / 2 && Math.abs(bl.y - b.y) < b.height / 2) {
                            b.hp -= bl.damage;
                            setBossHp(Math.max(0, Math.floor(b.hp)));
                            st.bullets.splice(j, 1);
                            createExplosion(bl.x, bl.y, '#38bdf8', 3);
                            xenonAudio.playHit();
                            break;
                        }
                    }

                    // Boss Defeat!
                    if (b.hp <= 0) {
                        xenonAudio.playExplosion(true);
                        createExplosion(b.x, b.y, '#f59e0b', 40);
                        createExplosion(b.x - 40, b.y - 20, '#ef4444', 30);
                        createExplosion(b.x + 40, b.y + 20, '#38bdf8', 30);

                        st.score += 2000 * (st.stageIdx + 1);
                        setScore(st.score);
                        st.boss = null;
                        setBossActive(false);

                        // Stage progression or Victory
                        if (st.stageIdx < STAGES.length - 1) {
                            setTimeout(() => {
                                startGame(st.stageIdx + 1);
                            }, 2000);
                        } else {
                            // Final Victory
                            setGameState('victory');
                            xenonAudio.playPowerUp();
                            broadcastGameState({ state: 'victory' });
                        }
                    }
                }

                // Update Shockwaves
                for (let i = st.shockwaves.length - 1; i >= 0; i--) {
                    const sw = st.shockwaves[i];
                    sw.radius += 24;
                    sw.alpha -= 0.035;
                    if (sw.alpha <= 0) {
                        st.shockwaves.splice(i, 1);
                    }
                }

                // Update Particles
                for (let i = st.particles.length - 1; i >= 0; i--) {
                    const pt = st.particles[i];
                    pt.x += pt.vx;
                    pt.y += pt.vy;
                    pt.alpha -= 0.035;
                    pt.life--;
                    if (pt.alpha <= 0 || pt.life <= 0) {
                        st.particles.splice(i, 1);
                    }
                }
            }

            // ----------------------------------------------------
            // 2. RENDER GRAPHICS CANVAS
            // ----------------------------------------------------
            ctx.save();

            // Apply screen shake
            if (st.screenShake > 0) {
                const shakeX = (Math.random() - 0.5) * st.screenShake;
                const shakeY = (Math.random() - 0.5) * st.screenShake;
                ctx.translate(shakeX, shakeY);
            }

            // A. Dark Space Sector Background
            ctx.fillStyle = '#090d16';
            ctx.fillRect(0, 0, w, h);

            // B. Starfield Parallax
            st.stars.forEach(s => {
                ctx.fillStyle = s.color;
                ctx.globalAlpha = s.alpha;
                ctx.fillRect(s.x, s.y, s.size, s.size);
            });
            ctx.globalAlpha = 1.0;

            // C. Biomechanical Alien Cavern Walls (Left and Right)
            const wallW = 38;
            const caColor = stage.cavernColor;

            // Left Wall
            ctx.fillStyle = caColor;
            ctx.beginPath();
            ctx.moveTo(0, 0);
            for (let y = 0; y <= h; y += 30) {
                const wave = Math.sin((y + st.cavernOffset) * 0.04) * 14;
                ctx.lineTo(wallW + wave, y);
            }
            ctx.lineTo(0, h);
            ctx.closePath();
            ctx.fill();

            // Right Wall
            ctx.beginPath();
            ctx.moveTo(w, 0);
            for (let y = 0; y <= h; y += 30) {
                const wave = Math.cos((y + st.cavernOffset) * 0.04) * 14;
                ctx.lineTo(w - wallW - wave, y);
            }
            ctx.lineTo(w, h);
            ctx.closePath();
            ctx.fill();

            // Organic vein highlights on cavern walls
            ctx.strokeStyle = stage.themeColor;
            ctx.lineWidth = 2;
            ctx.globalAlpha = 0.6;
            ctx.beginPath();
            for (let y = 0; y <= h; y += 40) {
                const waveL = Math.sin((y + st.cavernOffset) * 0.04) * 14;
                ctx.moveTo(wallW + waveL, y);
                ctx.lineTo(wallW + waveL - 10, y + 20);

                const waveR = Math.cos((y + st.cavernOffset) * 0.04) * 14;
                ctx.moveTo(w - wallW - waveR, y);
                ctx.lineTo(w - wallW - waveR + 10, y + 20);
            }
            ctx.stroke();
            ctx.globalAlpha = 1.0;

            // D. Render Bullets
            st.bullets.forEach(b => {
                ctx.fillStyle = b.color;
                ctx.shadowColor = b.color;
                ctx.shadowBlur = 8;
                ctx.fillRect(b.x - b.width / 2, b.y - b.height / 2, b.width, b.height);
            });
            ctx.shadowBlur = 0;

            // E. Render Missiles
            st.missiles.forEach(m => {
                ctx.fillStyle = '#f59e0b';
                ctx.shadowColor = '#f59e0b';
                ctx.shadowBlur = 6;
                ctx.beginPath();
                ctx.arc(m.x, m.y, 4, 0, Math.PI * 2);
                ctx.fill();
            });
            ctx.shadowBlur = 0;

            // F. Render Enemy Projectiles
            st.enemyBullets.forEach(eb => {
                ctx.fillStyle = eb.color;
                ctx.shadowColor = eb.color;
                ctx.shadowBlur = 10;
                ctx.beginPath();
                ctx.arc(eb.x, eb.y, eb.radius, 0, Math.PI * 2);
                ctx.fill();
                // Inner white hot core
                ctx.fillStyle = '#ffffff';
                ctx.beginPath();
                ctx.arc(eb.x, eb.y, eb.radius * 0.45, 0, Math.PI * 2);
                ctx.fill();
            });
            ctx.shadowBlur = 0;

            // G. Render Power-Up Orbs
            st.powerups.forEach(pu => {
                const glow = Math.sin(pu.pulse) * 4 + 10;
                ctx.shadowBlur = glow;
                ctx.lineWidth = 2.5;

                let puColor = '#38bdf8';
                let puLabel = 'P';
                if (pu.type === 'weapon') { puColor = '#38bdf8'; puLabel = '⚡'; }
                else if (pu.type === 'shield') { puColor = '#10b981'; puLabel = '🛡️'; }
                else if (pu.type === 'bomb') { puColor = '#f43f5e'; puLabel = '💣'; }
                else if (pu.type === 'crystal') { puColor = '#fbbf24'; puLabel = '💎'; }

                ctx.strokeStyle = puColor;
                ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
                ctx.shadowColor = puColor;

                ctx.beginPath();
                ctx.arc(pu.x, pu.y, pu.radius, 0, Math.PI * 2);
                ctx.fill();
                ctx.stroke();

                ctx.font = 'bold 12px sans-serif';
                ctx.fillStyle = '#ffffff';
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillText(puLabel, pu.x, pu.y);
            });
            ctx.shadowBlur = 0;

            // H. Render Enemies
            st.enemies.forEach(en => {
                ctx.save();
                ctx.translate(en.x, en.y);

                if (en.type === 'wasp') {
                    // Bio Wasp: sleek triangular biomech with flapping wings
                    ctx.fillStyle = '#f97316';
                    ctx.beginPath();
                    ctx.moveTo(0, 16);
                    ctx.lineTo(-14, -12);
                    ctx.lineTo(0, -6);
                    ctx.lineTo(14, -12);
                    ctx.closePath();
                    ctx.fill();

                    // Glowing alien eye
                    ctx.fillStyle = '#22c55e';
                    ctx.beginPath();
                    ctx.arc(0, 4, 3.5, 0, Math.PI * 2);
                    ctx.fill();
                } else if (en.type === 'pod') {
                    // Armored Drone Pod: octagonal rotating metallic disc
                    ctx.rotate(en.angle);
                    ctx.fillStyle = '#64748b';
                    ctx.strokeStyle = '#38bdf8';
                    ctx.lineWidth = 2;
                    ctx.beginPath();
                    ctx.arc(0, 0, 16, 0, Math.PI * 2);
                    ctx.fill();
                    ctx.stroke();

                    // Central plasma turret
                    ctx.fillStyle = '#ef4444';
                    ctx.beginPath();
                    ctx.arc(0, 0, 5, 0, Math.PI * 2);
                    ctx.fill();
                } else if (en.type === 'spider') {
                    // Wall Creeper: multi-legged alien organism
                    ctx.fillStyle = '#a855f7';
                    ctx.beginPath();
                    ctx.ellipse(0, 0, 14, 10, 0, 0, Math.PI * 2);
                    ctx.fill();

                    // Legs
                    ctx.strokeStyle = '#c084fc';
                    ctx.lineWidth = 2;
                    [-8, 0, 8].forEach(lx => {
                        ctx.beginPath();
                        ctx.moveTo(lx, -6);
                        ctx.lineTo(lx * 1.6, -14);
                        ctx.moveTo(lx, 6);
                        ctx.lineTo(lx * 1.6, 14);
                        ctx.stroke();
                    });
                } else if (en.type === 'nautilus') {
                    // Heavy Nautilus: Spiral armored shell
                    ctx.fillStyle = '#7c3aed';
                    ctx.strokeStyle = '#fbbf24';
                    ctx.lineWidth = 3;
                    ctx.beginPath();
                    ctx.arc(0, 0, 22, 0, Math.PI * 2);
                    ctx.fill();
                    ctx.stroke();

                    // Rotating inner spiral
                    ctx.rotate(-en.angle * 1.5);
                    ctx.fillStyle = '#f43f5e';
                    ctx.beginPath();
                    ctx.arc(6, 0, 7, 0, Math.PI * 2);
                    ctx.fill();
                }

                // Health bar for tough enemies
                if (en.maxHp > 3 && en.hp < en.maxHp) {
                    const barW = 28;
                    ctx.fillStyle = 'rgba(0,0,0,0.6)';
                    ctx.fillRect(-barW / 2, -en.height / 2 - 8, barW, 4);
                    ctx.fillStyle = '#22c55e';
                    ctx.fillRect(-barW / 2, -en.height / 2 - 8, barW * (en.hp / en.maxHp), 4);
                }

                ctx.restore();
            });

            // I. Render Boss: "Xenon Behemoth"
            if (st.boss) {
                const b = st.boss;
                ctx.save();
                ctx.translate(b.x, b.y);

                // Main Armor Hull
                ctx.fillStyle = '#334155';
                ctx.strokeStyle = '#06b6d4';
                ctx.lineWidth = 3;
                ctx.beginPath();
                ctx.moveTo(-b.width / 2, -b.height / 3);
                ctx.lineTo(b.width / 2, -b.height / 3);
                ctx.lineTo(b.width / 2 - 20, b.height / 2);
                ctx.lineTo(-b.width / 2 + 20, b.height / 2);
                ctx.closePath();
                ctx.fill();
                ctx.stroke();

                // Left & Right Plasma Wings
                ctx.fillStyle = '#1e293b';
                ctx.fillRect(-b.width / 2 - 15, -15, 25, 40);
                ctx.fillRect(b.width / 2 - 10, -15, 25, 40);

                // Central Pulsing Bio-Eye Core
                const eyeColor = b.isOpen ? '#ef4444' : '#06b6d4';
                ctx.fillStyle = eyeColor;
                ctx.shadowColor = eyeColor;
                ctx.shadowBlur = b.isOpen ? 22 : 8;
                ctx.beginPath();
                ctx.arc(0, 10, b.isOpen ? 22 : 14, 0, Math.PI * 2);
                ctx.fill();
                ctx.shadowBlur = 0;

                // Boss Name & HP Bar
                ctx.restore();
            }

            // J. Render Player: "THE MEGABLASTER"
            if (p.invulnerable % 4 < 2) {
                ctx.save();
                ctx.translate(p.x, p.y);
                ctx.rotate(p.tilt);

                // Pulsing Engine Jet Exhaust Flame
                const flameH = Math.random() * 14 + 18;
                const flameGrad = ctx.createLinearGradient(0, 20, 0, 20 + flameH);
                flameGrad.addColorStop(0, '#67e8f9');
                flameGrad.addColorStop(0.5, '#38bdf8');
                flameGrad.addColorStop(1, 'transparent');

                ctx.fillStyle = flameGrad;
                // Dual jet flames
                ctx.beginPath();
                ctx.moveTo(-10, 20);
                ctx.lineTo(-6, 20 + flameH);
                ctx.lineTo(-2, 20);
                ctx.closePath();
                ctx.fill();

                ctx.beginPath();
                ctx.moveTo(2, 20);
                ctx.lineTo(6, 20 + flameH);
                ctx.lineTo(10, 20);
                ctx.closePath();
                ctx.fill();

                // Sleek Metallic Fuselage (Xenon 2 Fighter)
                ctx.fillStyle = '#e2e8f0';
                ctx.strokeStyle = '#0284c7';
                ctx.lineWidth = 2;

                ctx.beginPath();
                // Nose
                ctx.moveTo(0, -26);
                // Right Wing
                ctx.lineTo(8, -8);
                ctx.lineTo(24, 8);
                ctx.lineTo(22, 18);
                ctx.lineTo(12, 14);
                // Engine block
                ctx.lineTo(10, 22);
                ctx.lineTo(-10, 22);
                // Left Wing
                ctx.lineTo(-12, 14);
                ctx.lineTo(-22, 18);
                ctx.lineTo(-24, 8);
                ctx.lineTo(-8, -8);
                ctx.closePath();
                ctx.fill();
                ctx.stroke();

                // Cockpit Glass Canopy (Ruby Red)
                ctx.fillStyle = '#ef4444';
                ctx.beginPath();
                ctx.ellipse(0, -4, 4, 10, 0, 0, Math.PI * 2);
                ctx.fill();

                // Wing Mounted Cannons
                ctx.fillStyle = '#475569';
                ctx.fillRect(-22, -6, 3, 14);
                ctx.fillRect(19, -6, 3, 14);

                // Forcefield Shield Bubble (when active)
                if (st.shield > 0) {
                    ctx.strokeStyle = st.shield > 30 ? 'rgba(56, 189, 248, 0.65)' : 'rgba(239, 68, 68, 0.75)';
                    ctx.lineWidth = 2.5;
                    ctx.beginPath();
                    ctx.arc(0, 0, 32, 0, Math.PI * 2);
                    ctx.stroke();
                }

                ctx.restore();
            }

            // K. Render Shockwaves (Megablast Bomb)
            st.shockwaves.forEach(sw => {
                ctx.strokeStyle = `rgba(255, 255, 255, ${sw.alpha})`;
                ctx.lineWidth = 14 * sw.alpha;
                ctx.beginPath();
                ctx.arc(sw.x, sw.y, sw.radius, 0, Math.PI * 2);
                ctx.stroke();
            });

            // L. Render Particles
            st.particles.forEach(pt => {
                ctx.fillStyle = pt.color;
                ctx.globalAlpha = Math.max(0, pt.alpha);
                ctx.fillRect(pt.x - pt.size / 2, pt.y - pt.size / 2, pt.size, pt.size);
            });
            ctx.globalAlpha = 1.0;

            // M. Retro CRT Scanline Overlay
            ctx.fillStyle = 'rgba(0, 0, 0, 0.12)';
            for (let y = 0; y < h; y += 4) {
                ctx.fillRect(0, y, w, 1.5);
            }

            ctx.restore();

            // Next frame
            animationFrameId = requestAnimationFrame(render);
        };

        animationFrameId = requestAnimationFrame(render);
        return () => cancelAnimationFrame(animationFrameId);
    }, [gameState, autoFire, highScore]);

    // Handle Player Damage / Death
    const handlePlayerDeath = () => {
        const st = stateRef.current;
        st.lives--;
        setLives(st.lives);
        xenonAudio.playExplosion(true);
        createExplosion(st.player.x, st.player.y, '#ef4444', 30);

        if (st.lives <= 0) {
            setGameState('gameover');
            xenonAudio.stopBgm();
            broadcastGameState({ state: 'gameover' });
        } else {
            // Respawn with full shield
            st.shield = 100;
            st.player.invulnerable = 90;
            st.player.x = canvasRef.current.width / 2;
            st.player.y = canvasRef.current.height - 90;
            setShield(100);
        }
    };

    return (
        <div
            ref={containerRef}
            style={{
                width: '100%',
                height: '100%',
                minHeight: '620px',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                background: 'radial-gradient(circle at center, #0f172a 0%, #020617 100%)',
                color: '#f8fafc',
                userSelect: 'none',
                position: 'relative',
                overflow: 'hidden',
                fontFamily: 'Inter, system-ui, sans-serif'
            }}
        >
            {/* Top Arcade Cyber Dashboard */}
            <div style={{
                width: '100%',
                maxWidth: '560px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                background: 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)',
                padding: '10px 18px',
                borderRadius: '16px 16px 0 0',
                border: '2px solid #334155',
                borderBottom: 'none',
                boxSizing: 'border-box'
            }}>
                {/* Stage Info */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontSize: '1.25rem' }}>🚀</span>
                    <div>
                        <div style={{ fontSize: '0.85rem', fontWeight: '900', color: STAGES[currentStageIdx].themeColor, letterSpacing: '0.5px' }}>
                            {STAGES[currentStageIdx].name}
                        </div>
                        <div style={{ fontSize: '0.7rem', color: '#94a3b8' }}>
                            XENON II: MEGABLAST (1989)
                        </div>
                    </div>
                </div>

                {/* Score & High Score */}
                <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: '0.72rem', color: '#94a3b8', fontWeight: '700' }}>SCORE / HI</div>
                    <div style={{ fontSize: '1.3rem', fontWeight: '950', color: '#38bdf8', letterSpacing: '1px' }}>
                        {score.toLocaleString()} <span style={{ color: '#64748b', fontSize: '0.9rem' }}>/ {highScore.toLocaleString()}</span>
                    </div>
                </div>

                {/* Top Action Buttons */}
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                    <button
                        onClick={toggleMute}
                        style={{
                            background: isMuted ? '#ef4444' : '#334155',
                            border: 'none',
                            color: 'white',
                            padding: '6px',
                            borderRadius: '10px',
                            cursor: 'pointer'
                        }}
                        title={isMuted ? '음악 켜기' : '음악 끄기'}
                    >
                        {isMuted ? <VolumeX size={18} /> : <Volume2 size={18} />}
                    </button>

                    {onExit && (
                        <button
                            onClick={onExit}
                            style={{
                                background: '#334155',
                                border: 'none',
                                color: 'white',
                                padding: '6px 10px',
                                borderRadius: '10px',
                                cursor: 'pointer',
                                fontSize: '0.82rem',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '4px'
                            }}
                        >
                            <ArrowLeft size={16} /> 나가기
                        </button>
                    )}
                </div>
            </div>

            {/* Boss HP Bar (When Active) */}
            {bossActive && (
                <div style={{
                    width: '100%',
                    maxWidth: '560px',
                    background: '#1e293b',
                    padding: '6px 14px',
                    borderLeft: '2px solid #ef4444',
                    borderRight: '2px solid #ef4444',
                    boxSizing: 'border-box'
                }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', fontWeight: 'bold', color: '#ef4444', marginBottom: '3px' }}>
                        <span>⚠️ BOSS: {STAGES[currentStageIdx].bossName}</span>
                        <span>{bossHp} / {maxBossHp}</span>
                    </div>
                    <div style={{ width: '100%', height: '8px', background: '#334155', borderRadius: '4px', overflow: 'hidden' }}>
                        <div style={{ width: `${Math.max(0, (bossHp / maxBossHp) * 100)}%`, height: '100%', background: 'linear-gradient(90deg, #f59e0b, #ef4444)', transition: 'width 0.15s ease' }} />
                    </div>
                </div>
            )}

            {/* Main Arcade Screen Viewport */}
            <div style={{
                position: 'relative',
                width: '100%',
                maxWidth: '560px',
                height: '560px',
                border: '2px solid #334155',
                boxShadow: '0 12px 35px rgba(0,0,0,0.6), inset 0 0 20px rgba(0,0,0,0.5)',
                overflow: 'hidden',
                touchAction: 'none'
            }}>
                <canvas
                    ref={canvasRef}
                    width={500}
                    height={600}
                    onPointerDown={handlePointerMove}
                    onPointerMove={handlePointerMove}
                    style={{
                        width: '100%',
                        height: '100%',
                        display: 'block',
                        cursor: gameState === 'playing' ? 'crosshair' : 'default'
                    }}
                />

                {/* OVERLAY: START SCREEN */}
                {gameState === 'ready' && (
                    <div style={{
                        position: 'absolute',
                        inset: 0,
                        background: 'rgba(15, 23, 42, 0.88)',
                        backdropFilter: 'blur(4px)',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        padding: '24px',
                        textAlign: 'center'
                    }}>
                        <div style={{ fontSize: '3rem', marginBottom: '8px' }}>🚀</div>
                        <h1 style={{
                            fontSize: '2.2rem',
                            fontWeight: '950',
                            margin: '0 0 6px 0',
                            background: 'linear-gradient(135deg, #38bdf8 0%, #a855f7 100%)',
                            WebkitBackgroundClip: 'text',
                            WebkitTextFillColor: 'transparent',
                            letterSpacing: '1px'
                        }}>
                            비행기게임 (XENON II)
                        </h1>
                        <p style={{ color: '#94a3b8', fontSize: '0.95rem', margin: '0 0 20px 0', fontWeight: 'bold' }}>
                            The 1989 Megablast Cybernetic Vertical Shooter
                        </p>

                        <div style={{
                            background: 'rgba(30, 41, 59, 0.8)',
                            padding: '12px 18px',
                            borderRadius: '14px',
                            border: '1px solid #475569',
                            fontSize: '0.82rem',
                            color: '#cbd5e1',
                            marginBottom: '24px',
                            lineHeight: '1.6',
                            textAlign: 'left',
                            maxWidth: '360px'
                        }}>
                            <div>⌨️ <strong>이동</strong>: 방향키 / WASD / 터치 드래그</div>
                            <div>🔥 <strong>발사</strong>: 스페이스바 / Z (자동 연사 지원)</div>
                            <div>💣 <strong>메가블라스트</strong>: X / Shift / 폭탄 버튼</div>
                            <div>⚡ <strong>강화</strong>: 외계체 처치 시 무기(P)·실드·폭탄 획득</div>
                        </div>

                        <button
                            onClick={() => startGame(0)}
                            style={{
                                background: 'linear-gradient(135deg, #0284c7 0%, #2563eb 100%)',
                                color: 'white',
                                border: 'none',
                                padding: '14px 36px',
                                borderRadius: '16px',
                                fontSize: '1.25rem',
                                fontWeight: '900',
                                cursor: 'pointer',
                                boxShadow: '0 8px 25px rgba(2, 132, 199, 0.45)',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '8px',
                                transition: 'transform 0.15s ease'
                            }}
                            onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.04)'}
                            onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
                        >
                            <Play size={22} /> 게임 시작 (START)
                        </button>
                    </div>
                )}

                {/* OVERLAY: GAME OVER SCREEN */}
                {gameState === 'gameover' && (
                    <div style={{
                        position: 'absolute',
                        inset: 0,
                        background: 'rgba(15, 23, 42, 0.92)',
                        backdropFilter: 'blur(5px)',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        padding: '24px',
                        textAlign: 'center'
                    }}>
                        <div style={{ fontSize: '3.5rem', marginBottom: '8px' }}>💥</div>
                        <h2 style={{ fontSize: '2.4rem', fontWeight: '950', color: '#ef4444', margin: '0 0 10px 0' }}>
                            GAME OVER
                        </h2>
                        <p style={{ color: '#94a3b8', fontSize: '1rem', margin: '0 0 20px 0' }}>
                            최종 점수: <strong style={{ color: '#38bdf8', fontSize: '1.4rem' }}>{score.toLocaleString()}점</strong>
                        </p>

                        <button
                            onClick={() => startGame(0)}
                            style={{
                                background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
                                color: 'white',
                                border: 'none',
                                padding: '12px 32px',
                                borderRadius: '14px',
                                fontSize: '1.15rem',
                                fontWeight: '900',
                                cursor: 'pointer',
                                boxShadow: '0 6px 20px rgba(239, 68, 68, 0.4)',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '8px'
                            }}
                        >
                            <RotateCcw size={20} /> 다시 도전 (RETRY)
                        </button>
                    </div>
                )}

                {/* OVERLAY: VICTORY SCREEN */}
                {gameState === 'victory' && (
                    <div style={{
                        position: 'absolute',
                        inset: 0,
                        background: 'rgba(15, 23, 42, 0.92)',
                        backdropFilter: 'blur(5px)',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        padding: '24px',
                        textAlign: 'center'
                    }}>
                        <div style={{ fontSize: '4rem', marginBottom: '8px' }}>👑</div>
                        <h2 style={{ fontSize: '2.4rem', fontWeight: '950', color: '#f59e0b', margin: '0 0 8px 0' }}>
                            MISSION ACCOMPLISHED!
                        </h2>
                        <p style={{ color: '#38bdf8', fontSize: '1.1rem', margin: '0 0 14px 0', fontWeight: 'bold' }}>
                            외계 모선 코어를 모두 파괴하고 지구를 구했습니다!
                        </p>
                        <p style={{ color: '#94a3b8', fontSize: '1.05rem', margin: '0 0 24px 0' }}>
                            최종 승리 점수: <strong style={{ color: '#10b981', fontSize: '1.5rem' }}>{score.toLocaleString()}점</strong>
                        </p>

                        <button
                            onClick={() => startGame(0)}
                            style={{
                                background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                                color: 'white',
                                border: 'none',
                                padding: '12px 32px',
                                borderRadius: '14px',
                                fontSize: '1.15rem',
                                fontWeight: '900',
                                cursor: 'pointer',
                                boxShadow: '0 6px 20px rgba(16, 185, 129, 0.4)',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '8px'
                            }}
                        >
                            <RotateCcw size={20} /> 처음부터 다시 플레이
                        </button>
                    </div>
                )}
            </div>

            {/* Bottom HUD: Status Indicators & Touch Controls */}
            <div style={{
                width: '100%',
                maxWidth: '560px',
                background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
                padding: '12px 18px',
                borderRadius: '0 0 16px 16px',
                border: '2px solid #334155',
                borderTop: 'none',
                boxSizing: 'border-box',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                gap: '12px'
            }}>
                {/* Shield HP & Lives */}
                <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.74rem', fontWeight: 'bold', color: '#94a3b8', marginBottom: '4px' }}>
                        <span>🛡️ SHIELD {shield}%</span>
                        <span>🚀 LIVES: {'❤️'.repeat(lives)}</span>
                    </div>
                    <div style={{ width: '100%', height: '8px', background: '#334155', borderRadius: '4px', overflow: 'hidden' }}>
                        <div style={{
                            width: `${shield}%`,
                            height: '100%',
                            background: shield > 40 ? 'linear-gradient(90deg, #06b6d4, #3b82f6)' : 'linear-gradient(90deg, #f59e0b, #ef4444)',
                            transition: 'width 0.2s ease'
                        }} />
                    </div>
                    <div style={{ display: 'flex', gap: '8px', marginTop: '6px', fontSize: '0.72rem', color: '#cbd5e1' }}>
                        <span>⚡ WEAPON: Lv.{weaponLevel}</span>
                        <span>💣 BOMBS: {bombs}개</span>
                    </div>
                </div>

                {/* Mobile / Screen Action Controls */}
                <div style={{ display: 'flex', gap: '8px' }}>
                    <button
                        onClick={triggerMegablast}
                        disabled={bombs <= 0 || gameState !== 'playing'}
                        style={{
                            background: bombs > 0 ? 'linear-gradient(135deg, #ef4444 0%, #b91c1c 100%)' : '#475569',
                            color: 'white',
                            border: 'none',
                            padding: '10px 14px',
                            borderRadius: '12px',
                            fontWeight: '900',
                            fontSize: '0.85rem',
                            cursor: bombs > 0 ? 'pointer' : 'not-allowed',
                            boxShadow: bombs > 0 ? '0 4px 12px rgba(239, 68, 68, 0.4)' : 'none',
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center'
                        }}
                    >
                        <span>💥 MEGABLAST</span>
                        <span style={{ fontSize: '0.7rem', opacity: 0.85 }}>({bombs} 남음)</span>
                    </button>

                    <button
                        onClick={() => setAutoFire(!autoFire)}
                        style={{
                            background: autoFire ? '#059669' : '#475569',
                            color: 'white',
                            border: 'none',
                            padding: '10px 12px',
                            borderRadius: '12px',
                            fontWeight: '800',
                            fontSize: '0.75rem',
                            cursor: 'pointer',
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center'
                        }}
                    >
                        <span>🔥 자동연사</span>
                        <span style={{ fontSize: '0.7rem' }}>{autoFire ? 'ON' : 'OFF'}</span>
                    </button>
                </div>
            </div>
        </div>
    );
}
