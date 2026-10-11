import React, { useState, useEffect, useRef, useCallback } from 'react';
import { RotateCcw, Volume2, VolumeX, Trophy, Heart, Zap, Sparkles, Shield, Play } from 'lucide-react';
import { playSound } from '../utils/audio';

// Brick Types & Point Values matching classic Arkanoid (1986)
const BRICK_COLORS = {
    red: { fill: '#ef4444', border: '#b91c1c', hp: 1, points: 90, name: 'RED' },
    orange: { fill: '#f97316', border: '#c2410c', hp: 1, points: 60, name: 'ORANGE' },
    yellow: { fill: '#eab308', border: '#a16207', hp: 1, points: 120, name: 'YELLOW' },
    green: { fill: '#10b981', border: '#047857', hp: 1, points: 80, name: 'GREEN' },
    cyan: { fill: '#06b6d4', border: '#0e7490', hp: 1, points: 70, name: 'CYAN' },
    blue: { fill: '#3b82f6', border: '#1d4ed8', hp: 1, points: 100, name: 'BLUE' },
    magenta: { fill: '#d946ef', border: '#a21caf', hp: 1, points: 110, name: 'MAGENTA' },
    silver: { fill: '#cbd5e1', border: '#64748b', hp: 2, points: 200, name: 'SILVER', isHard: true },
    gold: { fill: '#f59e0b', border: '#b45309', hp: Infinity, points: 0, name: 'GOLD', isSolid: true }
};

// Power-Up Capsule definitions
const POWER_UPS = [
    { type: 'E', label: 'EXPAND', color: '#3b82f6', text: 'E' },     // Blue: Expand Vaus paddle
    { type: 'L', label: 'LASER', color: '#ef4444', text: 'L' },      // Red: Laser Cannons
    { type: 'S', label: 'SLOW', color: '#f97316', text: 'S' },       // Orange: Slow ball
    { type: 'D', label: 'MULTI', color: '#06b6d4', text: 'D' },      // Cyan: Disruption (3 balls)
    { type: 'C', label: 'CATCH', color: '#10b981', text: 'C' },      // Green: Catch and hold ball
    { type: 'P', label: '1UP', color: '#94a3b8', text: 'P' }         // Silver: Extra life
];

// Stages (단계별 난이도 & 다양한 맵 패턴)
const STAGE_LAYOUTS = [
    // Round 1: Classic Space Station Wall (5 Rows)
    {
        name: 'ROUND 01 - SPACE WALL',
        speed: 4.6,
        grid: [
            ['silver', 'silver', 'silver', 'silver', 'silver', 'silver', 'silver', 'silver'],
            ['red', 'red', 'red', 'red', 'red', 'red', 'red', 'red'],
            ['yellow', 'yellow', 'yellow', 'yellow', 'yellow', 'yellow', 'yellow', 'yellow'],
            ['blue', 'blue', 'blue', 'blue', 'blue', 'blue', 'blue', 'blue'],
            ['green', 'green', 'green', 'green', 'green', 'green', 'green', 'green']
        ]
    },
    // Round 2: Stepped Pyramid with Silver Core
    {
        name: 'ROUND 02 - PYRAMID OF DOH',
        speed: 5.2,
        grid: [
            [null, null, null, 'silver', 'silver', null, null, null],
            [null, null, 'magenta', 'silver', 'silver', 'magenta', null, null],
            [null, 'cyan', 'magenta', 'orange', 'orange', 'magenta', 'cyan', null],
            ['yellow', 'cyan', 'magenta', 'orange', 'orange', 'magenta', 'cyan', 'yellow'],
            ['red', 'yellow', 'cyan', 'green', 'green', 'cyan', 'yellow', 'red']
        ]
    },
    // Round 3: The Fortress (Gold Pillars & Silver Reinforcements)
    {
        name: 'ROUND 03 - SPACE FORTRESS',
        speed: 5.8,
        grid: [
            ['gold', 'red', 'red', 'gold', 'gold', 'red', 'red', 'gold'],
            ['gold', 'silver', 'orange', 'magenta', 'magenta', 'orange', 'silver', 'gold'],
            ['null', 'silver', 'yellow', 'cyan', 'cyan', 'yellow', 'silver', null],
            ['gold', 'silver', 'green', 'blue', 'blue', 'green', 'silver', 'gold'],
            ['gold', null, 'green', null, null, 'green', null, 'gold']
        ]
    },
    // Round 4: Alien Invader Pattern
    {
        name: 'ROUND 04 - ALIEN INVASION',
        speed: 6.4,
        grid: [
            [null, 'silver', null, null, null, null, 'silver', null],
            [null, null, 'red', 'gold', 'gold', 'red', null, null],
            ['cyan', 'yellow', 'magenta', 'magenta', 'magenta', 'magenta', 'yellow', 'cyan'],
            ['cyan', 'silver', 'blue', 'orange', 'orange', 'blue', 'silver', 'cyan'],
            [null, 'green', null, 'gold', 'gold', null, 'green', null]
        ]
    },
    // Round 5: The Labyrinth (Boss Challenge)
    {
        name: 'ROUND 05 - FINAL LABYRINTH',
        speed: 7.0,
        grid: [
            ['gold', 'silver', 'silver', 'silver', 'silver', 'silver', 'silver', 'gold'],
            ['magenta', 'gold', 'red', 'yellow', 'yellow', 'red', 'gold', 'magenta'],
            ['cyan', 'silver', 'gold', 'green', 'green', 'gold', 'silver', 'cyan'],
            ['orange', 'silver', 'blue', 'gold', 'gold', 'blue', 'silver', 'orange'],
            ['gold', 'silver', 'magenta', 'cyan', 'cyan', 'magenta', 'silver', 'gold']
        ]
    }
];

export default function BrickBreakerGame({
    socket,
    pin,
    isHost = false,
    nickname = '호스트',
    groupId = null,
    baseScore = 0
}) {
    const canvasRef = useRef(null);

    // Game State
    const [score, setScore] = useState(0);
    const [highScore, setHighScore] = useState(() => {
        try {
            return parseInt(localStorage.getItem('arkanoid_hiscore') || '15000', 10);
        } catch (e) {
            return 15000;
        }
    });
    const [round, setRound] = useState(1);
    const [lives, setLives] = useState(3);
    const [isGameOver, setIsGameOver] = useState(false);
    const [isStageClear, setIsStageClear] = useState(false);
    const [activePowerUp, setActivePowerUp] = useState(null); // 'E' | 'L' | 'S' | 'C'
    const [isMuted, setIsMuted] = useState(false);
    const [isPracticeMode, setIsPracticeMode] = useState(false);
    const [stageBanner, setStageBanner] = useState('ROUND 01 - GET READY!');

    // Audio Refs
    const startAudioRef = useRef(null);
    const bgmAudioRef = useRef(null);
    const clearAudioRef = useRef(null);
    const gameOverAudioRef = useRef(null);

    // Official score locking
    const officialBaseScoreRef = useRef(typeof baseScore === 'number' ? baseScore : 0);
    const hasOfficiallyFinishedRef = useRef(false);
    const officialLockedTotalScoreRef = useRef(null);

    useEffect(() => {
        if (!hasOfficiallyFinishedRef.current) {
            officialBaseScoreRef.current = typeof baseScore === 'number' ? baseScore : 0;
        }
    }, [baseScore]);

    // Game Physics & Loop Refs
    const stateRef = useRef({
        width: 440,
        height: 520,
        paddle: {
            x: 180,
            y: 485,
            width: 80,
            baseWidth: 80,
            height: 14,
            speed: 8
        },
        balls: [],
        bricks: [],
        capsules: [],
        lasers: [],
        particles: [],
        keys: { left: false, right: false, space: false },
        isBallStuck: true, // Ball sticks to paddle before launch
        round: 1,
        lives: 3,
        score: 0,
        isGameOver: false,
        isClear: false,
        powerUpTimeout: null,
        activePowerUp: null
    });

    // Notify stream helper for spectator
    const notifyPlayerStream = useCallback((curScore, curRound, curLives, curPaddlePercent, gameOver, bricksLeft) => {
        if (!socket || !pin) return;
        const inPractice = isPracticeMode || hasOfficiallyFinishedRef.current;

        const gameDataPayload = {
            score: curScore,
            round: curRound,
            lives: curLives,
            paddlePos: curPaddlePercent,
            bricksRemaining: bricksLeft,
            isGameOver: gameOver,
            isPractice: inPractice
        };

        if (inPractice) {
            const lockedScore = officialLockedTotalScoreRef.current !== null
                ? officialLockedTotalScoreRef.current
                : (officialBaseScoreRef.current + curScore);

            socket.emit('room:message', {
                pin,
                event: 'game:player_stream',
                payload: {
                    nickname,
                    groupId,
                    gameId: 'brick_breaker',
                    score: lockedScore,
                    roundScore: curScore,
                    baseScore: officialBaseScoreRef.current,
                    isPractice: true,
                    isAlive: !gameOver,
                    isFinished: gameOver,
                    gameData: gameDataPayload
                }
            });
        } else {
            const totalScore = officialBaseScoreRef.current + curScore;
            if (gameOver) {
                hasOfficiallyFinishedRef.current = true;
                officialLockedTotalScoreRef.current = totalScore;
            }

            socket.emit('room:message', {
                pin,
                event: 'game:player_stream',
                payload: {
                    nickname,
                    groupId,
                    gameId: 'brick_breaker',
                    score: totalScore,
                    roundScore: curScore,
                    baseScore: officialBaseScoreRef.current,
                    isPractice: false,
                    isAlive: !gameOver,
                    isFinished: gameOver,
                    gameData: gameDataPayload
                }
            });
        }
    }, [socket, pin, nickname, groupId, isPracticeMode]);

    // Audio Setup
    useEffect(() => {
        const startAudio = new Audio('/audio/arkanoid_start.mp3');
        startAudio.volume = isMuted ? 0 : 0.45;
        startAudioRef.current = startAudio;

        const bgm = new Audio('/audio/arkanoid_bgm.mp3');
        bgm.loop = true;
        bgm.volume = isMuted ? 0 : 0.28;
        bgmAudioRef.current = bgm;

        const clearAudio = new Audio('/audio/arkanoid_round_clear.mp3');
        clearAudio.volume = isMuted ? 0 : 0.45;
        clearAudioRef.current = clearAudio;

        const goAudio = new Audio('/audio/arkanoid_gameover.mp3');
        goAudio.volume = isMuted ? 0 : 0.45;
        gameOverAudioRef.current = goAudio;

        // Play start fanfare then transition to BGM
        const playStart = startAudio.play();
        if (playStart !== undefined) {
            playStart.then(() => {
                startAudio.onended = () => {
                    if (bgmAudioRef.current && !stateRef.current.isGameOver) {
                        bgmAudioRef.current.play().catch(() => {});
                    }
                };
            }).catch(() => {
                const unlock = () => {
                    if (startAudioRef.current && !stateRef.current.isGameOver) {
                        startAudioRef.current.play().then(() => {
                            startAudioRef.current.onended = () => {
                                if (bgmAudioRef.current && !stateRef.current.isGameOver) {
                                    bgmAudioRef.current.play().catch(() => {});
                                }
                            };
                        }).catch(() => {});
                    }
                    window.removeEventListener('pointerdown', unlock);
                    window.removeEventListener('keydown', unlock);
                };
                window.addEventListener('pointerdown', unlock, { once: true });
                window.addEventListener('keydown', unlock, { once: true });
            });
        }

        return () => {
            if (startAudioRef.current) startAudioRef.current.pause();
            if (bgmAudioRef.current) bgmAudioRef.current.pause();
            if (clearAudioRef.current) clearAudioRef.current.pause();
            if (gameOverAudioRef.current) gameOverAudioRef.current.pause();
        };
    }, []);

    // Handle Mute Toggle
    useEffect(() => {
        const vol = isMuted ? 0 : 0.28;
        if (startAudioRef.current) startAudioRef.current.volume = isMuted ? 0 : 0.45;
        if (bgmAudioRef.current) bgmAudioRef.current.volume = vol;
        if (clearAudioRef.current) clearAudioRef.current.volume = isMuted ? 0 : 0.45;
        if (gameOverAudioRef.current) gameOverAudioRef.current.volume = isMuted ? 0 : 0.45;
    }, [isMuted]);

    // Build Stage Bricks from layout
    const loadStage = useCallback((stageIndex) => {
        const state = stateRef.current;
        const layoutIndex = (stageIndex - 1) % STAGE_LAYOUTS.length;
        const stageConfig = STAGE_LAYOUTS[layoutIndex];

        setStageBanner(stageConfig.name);
        setTimeout(() => setStageBanner(null), 2000);

        const bricks = [];
        const rows = stageConfig.grid.length;
        const cols = 8;
        const brickW = 46;
        const brickH = 18;
        const offsetX = (state.width - (cols * brickW + (cols - 1) * 6)) / 2;
        const offsetY = 54;

        for (let r = 0; r < rows; r++) {
            for (let c = 0; c < cols; c++) {
                const colorKey = stageConfig.grid[r][c];
                if (colorKey && BRICK_COLORS[colorKey]) {
                    const proto = BRICK_COLORS[colorKey];
                    bricks.push({
                        id: `${r}-${c}`,
                        x: offsetX + c * (brickW + 6),
                        y: offsetY + r * (brickH + 5),
                        w: brickW,
                        h: brickH,
                        colorKey,
                        hp: proto.hp,
                        maxHp: proto.hp,
                        points: proto.points,
                        isSolid: !!proto.isSolid,
                        isHard: !!proto.isHard
                    });
                }
            }
        }

        state.bricks = bricks;
        state.capsules = [];
        state.lasers = [];
        state.isBallStuck = true;

        // Reset ball on paddle
        const baseSpeed = stageConfig.speed;
        state.balls = [{
            x: state.paddle.x + state.paddle.width / 2,
            y: state.paddle.y - 8,
            vx: baseSpeed * 0.707 * (Math.random() > 0.5 ? 1 : -1),
            vy: -baseSpeed * 0.707,
            radius: 6,
            baseSpeed
        }];

        state.isClear = false;
        setIsStageClear(false);
    }, []);

    // Restart Whole Game
    const restartGame = useCallback((isManual = false) => {
        if (isManual || hasOfficiallyFinishedRef.current) {
            setIsPracticeMode(true);
        }

        const state = stateRef.current;
        state.score = 0;
        state.round = 1;
        state.lives = 3;
        state.isGameOver = false;
        state.activePowerUp = null;
        state.paddle.width = state.paddle.baseWidth;
        if (state.powerUpTimeout) clearTimeout(state.powerUpTimeout);

        setScore(0);
        setRound(1);
        setLives(3);
        setIsGameOver(false);
        setActivePowerUp(null);

        loadStage(1);

        if (gameOverAudioRef.current) gameOverAudioRef.current.pause();
        if (bgmAudioRef.current && !isMuted) {
            bgmAudioRef.current.currentTime = 0;
            bgmAudioRef.current.play().catch(() => {});
        }

        notifyPlayerStream(0, 1, 3, 50, false, state.bricks.filter(b => !b.isSolid).length);
    }, [loadStage, notifyPlayerStream, isMuted]);

    // Initial Start
    useEffect(() => {
        restartGame();
    }, []);

    // Launch Ball
    const launchBall = useCallback(() => {
        const state = stateRef.current;
        if (state.isBallStuck && state.balls.length > 0) {
            state.isBallStuck = false;
            playSound('submit');
        } else if (state.activePowerUp === 'L') {
            // Fire twin lasers!
            fireLaser();
        }
    }, []);

    // Fire Laser
    const fireLaser = useCallback(() => {
        const state = stateRef.current;
        if (state.lasers.length >= 6) return; // Laser rate limit
        const pad = state.paddle;
        state.lasers.push({ x: pad.x + 8, y: pad.y - 6, vy: -12, w: 4, h: 12 });
        state.lasers.push({ x: pad.x + pad.width - 12, y: pad.y - 6, vy: -12, w: 4, h: 12 });
        playSound('shutter');
    }, []);

    // Power-up activation
    const applyPowerUp = useCallback((pType) => {
        const state = stateRef.current;
        if (state.powerUpTimeout) clearTimeout(state.powerUpTimeout);

        state.activePowerUp = pType;
        setActivePowerUp(pType);
        playSound('reveal');

        // Score bonus for pickup
        const newScore = state.score + 200;
        state.score = newScore;
        setScore(newScore);

        if (pType === 'E') {
            // Expand paddle
            state.paddle.width = state.paddle.baseWidth * 1.45;
            state.powerUpTimeout = setTimeout(() => {
                state.paddle.width = state.paddle.baseWidth;
                state.activePowerUp = null;
                setActivePowerUp(null);
            }, 16000);
        } else if (pType === 'L') {
            // Laser mode
            state.powerUpTimeout = setTimeout(() => {
                state.activePowerUp = null;
                setActivePowerUp(null);
            }, 15000);
        } else if (pType === 'S') {
            // Slow down balls
            state.balls.forEach(b => {
                const spd = b.baseSpeed * 0.72;
                const angle = Math.atan2(b.vy, b.vx);
                b.vx = Math.cos(angle) * spd;
                b.vy = Math.sin(angle) * spd;
            });
            state.powerUpTimeout = setTimeout(() => {
                state.activePowerUp = null;
                setActivePowerUp(null);
            }, 12000);
        } else if (pType === 'D') {
            // Disruption: split into 3 balls
            if (state.balls.length === 1) {
                const b = state.balls[0];
                const spd = b.baseSpeed;
                state.balls.push({
                    x: b.x,
                    y: b.y,
                    vx: spd * Math.cos(-Math.PI / 4),
                    vy: spd * Math.sin(-Math.PI / 4),
                    radius: b.radius,
                    baseSpeed: spd
                });
                state.balls.push({
                    x: b.x,
                    y: b.y,
                    vx: spd * Math.cos(-3 * Math.PI / 4),
                    vy: spd * Math.sin(-3 * Math.PI / 4),
                    radius: b.radius,
                    baseSpeed: spd
                });
            }
        } else if (pType === 'C') {
            // Catch ball on paddle
            state.powerUpTimeout = setTimeout(() => {
                state.activePowerUp = null;
                setActivePowerUp(null);
            }, 18000);
        } else if (pType === 'P') {
            // Player +1 Life
            state.lives = Math.min(5, state.lives + 1);
            setLives(state.lives);
            playSound('fanfare');
        }
    }, []);

    // Create Particle Sparks on Brick Hit
    const createSparks = (x, y, color) => {
        const state = stateRef.current;
        for (let i = 0; i < 8; i++) {
            const angle = Math.random() * Math.PI * 2;
            const spd = Math.random() * 3 + 1;
            state.particles.push({
                x,
                y,
                vx: Math.cos(angle) * spd,
                vy: Math.sin(angle) * spd,
                color,
                life: 1.0,
                decay: Math.random() * 0.05 + 0.03
            });
        }
    };

    // Keyboard handlers
    useEffect(() => {
        const handleKeyDown = (e) => {
            if (stateRef.current.isGameOver) return;
            if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') {
                stateRef.current.keys.left = true;
            } else if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') {
                stateRef.current.keys.right = true;
            } else if (e.key === ' ' || e.key === 'Enter') {
                e.preventDefault();
                launchBall();
            }
        };

        const handleKeyUp = (e) => {
            if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') {
                stateRef.current.keys.left = false;
            } else if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') {
                stateRef.current.keys.right = false;
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        window.addEventListener('keyup', handleKeyUp);
        return () => {
            window.removeEventListener('keydown', handleKeyDown);
            window.removeEventListener('keyup', handleKeyUp);
        };
    }, [launchBall]);

    // Touch & Mouse glide controls on canvas
    const handlePointerMove = (e) => {
        if (!canvasRef.current || stateRef.current.isGameOver) return;
        const rect = canvasRef.current.getBoundingClientRect();
        const clientX = e.touches ? e.touches[0].clientX : e.clientX;
        const scaleX = stateRef.current.width / rect.width;
        const mouseX = (clientX - rect.left) * scaleX;

        const pad = stateRef.current.paddle;
        pad.x = Math.max(8, Math.min(stateRef.current.width - pad.width - 8, mouseX - pad.width / 2));
    };

    // MAIN 60 FPS GAME LOOP
    useEffect(() => {
        let animId;
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');

        const update = () => {
            const state = stateRef.current;
            if (state.isGameOver) {
                render(ctx, state);
                animId = requestAnimationFrame(update);
                return;
            }

            const pad = state.paddle;

            // Keyboard paddle movement
            if (state.keys.left) {
                pad.x = Math.max(8, pad.x - pad.speed);
            }
            if (state.keys.right) {
                pad.x = Math.min(state.width - pad.width - 8, pad.x + pad.speed);
            }

            // Ball stuck to paddle
            if (state.isBallStuck && state.balls.length > 0) {
                state.balls[0].x = pad.x + pad.width / 2;
                state.balls[0].y = pad.y - state.balls[0].radius - 1;
            }

            // Move Lasers
            for (let i = state.lasers.length - 1; i >= 0; i--) {
                const laser = state.lasers[i];
                laser.y += laser.vy;

                // Check laser collision with bricks
                let laserHit = false;
                for (let j = state.bricks.length - 1; j >= 0; j--) {
                    const b = state.bricks[j];
                    if (
                        laser.x >= b.x && laser.x <= b.x + b.w &&
                        laser.y >= b.y && laser.y <= b.y + b.h
                    ) {
                        laserHit = true;
                        if (!b.isSolid) {
                            b.hp--;
                            createSparks(laser.x, laser.y, BRICK_COLORS[b.colorKey].fill);
                            if (b.hp <= 0) {
                                state.score += b.points;
                                setScore(state.score);
                                state.bricks.splice(j, 1);
                                playSound('correct');
                            } else {
                                playSound('step');
                            }
                        } else {
                            playSound('beep');
                        }
                        break;
                    }
                }

                if (laserHit || laser.y < 0) {
                    state.lasers.splice(i, 1);
                }
            }

            // Move Falling Capsules
            for (let i = state.capsules.length - 1; i >= 0; i--) {
                const cap = state.capsules[i];
                cap.y += cap.vy;

                // Check catch by paddle
                if (
                    cap.x + cap.w >= pad.x && cap.x <= pad.x + pad.width &&
                    cap.y + cap.h >= pad.y && cap.y <= pad.y + pad.height
                ) {
                    applyPowerUp(cap.type);
                    state.capsules.splice(i, 1);
                    continue;
                }

                if (cap.y > state.height) {
                    state.capsules.splice(i, 1);
                }
            }

            // Move Particles
            for (let i = state.particles.length - 1; i >= 0; i--) {
                const p = state.particles[i];
                p.x += p.vx;
                p.y += p.vy;
                p.life -= p.decay;
                if (p.life <= 0) {
                    state.particles.splice(i, 1);
                }
            }

            // Move Balls & Collisions
            if (!state.isBallStuck) {
                for (let bi = state.balls.length - 1; bi >= 0; bi--) {
                    const ball = state.balls[bi];
                    ball.x += ball.vx;
                    ball.y += ball.vy;

                    // Wall Collisions
                    if (ball.x - ball.radius <= 6) {
                        ball.x = 6 + ball.radius;
                        ball.vx = Math.abs(ball.vx);
                        playSound('step');
                    } else if (ball.x + ball.radius >= state.width - 6) {
                        ball.x = state.width - 6 - ball.radius;
                        ball.vx = -Math.abs(ball.vx);
                        playSound('step');
                    }
                    if (ball.y - ball.radius <= 6) {
                        ball.y = 6 + ball.radius;
                        ball.vy = Math.abs(ball.vy);
                        playSound('step');
                    }

                    // Paddle Collision
                    if (
                        ball.y + ball.radius >= pad.y &&
                        ball.y - ball.radius <= pad.y + pad.height &&
                        ball.x >= pad.x &&
                        ball.x <= pad.x + pad.width
                    ) {
                        // Angle based on hit location
                        const hitOffset = (ball.x - (pad.x + pad.width / 2)) / (pad.width / 2);
                        const maxAngle = (75 * Math.PI) / 180;
                        const angle = hitOffset * maxAngle;
                        const currentSpd = Math.sqrt(ball.vx * ball.vx + ball.vy * ball.vy);

                        ball.vx = currentSpd * Math.sin(angle);
                        ball.vy = -Math.abs(currentSpd * Math.cos(angle));
                        ball.y = pad.y - ball.radius;

                        playSound('submit');

                        // If CATCH power-up is active, stick to paddle
                        if (state.activePowerUp === 'C') {
                            state.isBallStuck = true;
                        }
                    }

                    // Brick Collisions
                    for (let j = state.bricks.length - 1; j >= 0; j--) {
                        const b = state.bricks[j];
                        if (
                            ball.x + ball.radius >= b.x &&
                            ball.x - ball.radius <= b.x + b.w &&
                            ball.y + ball.radius >= b.y &&
                            ball.y - ball.radius <= b.y + b.h
                        ) {
                            // Deflection axis
                            const prevX = ball.x - ball.vx;
                            const prevY = ball.y - ball.vy;

                            if (prevX + ball.radius <= b.x || prevX - ball.radius >= b.x + b.w) {
                                ball.vx = -ball.vx;
                            } else {
                                ball.vy = -ball.vy;
                            }

                            createSparks(ball.x, ball.y, BRICK_COLORS[b.colorKey].fill);

                            if (!b.isSolid) {
                                b.hp--;
                                if (b.hp <= 0) {
                                    state.score += b.points;
                                    setScore(state.score);
                                    if (state.score > highScore) {
                                        setHighScore(state.score);
                                        try { localStorage.setItem('arkanoid_hiscore', String(state.score)); } catch (e) {}
                                    }

                                    // Drop capsule chance (~25%)
                                    if (Math.random() < 0.26 && state.capsules.length < 3) {
                                        const p = POWER_UPS[Math.floor(Math.random() * POWER_UPS.length)];
                                        state.capsules.push({
                                            x: b.x + b.w / 2 - 12,
                                            y: b.y + b.h / 2 - 6,
                                            w: 24,
                                            h: 12,
                                            type: p.type,
                                            color: p.color,
                                            label: p.text,
                                            vy: 2.2
                                        });
                                    }

                                    state.bricks.splice(j, 1);
                                    playSound('correct');
                                } else {
                                    // Hard brick hit sound
                                    playSound('step');
                                }
                            } else {
                                // Indestructible gold brick clink
                                playSound('beep');
                            }
                            break;
                        }
                    }

                    // Ball Lost (Bottom edge)
                    if (ball.y - ball.radius > state.height) {
                        state.balls.splice(bi, 1);
                    }
                }

                // If all balls lost
                if (state.balls.length === 0) {
                    state.lives--;
                    setLives(state.lives);
                    playSound('wrong');

                    if (state.lives <= 0) {
                        // Game Over!
                        state.isGameOver = true;
                        setIsGameOver(true);

                        if (bgmAudioRef.current) bgmAudioRef.current.pause();
                        if (gameOverAudioRef.current && !isMuted) {
                            gameOverAudioRef.current.currentTime = 0;
                            gameOverAudioRef.current.play().catch(() => {});
                        }

                        if (!isPracticeMode && !hasOfficiallyFinishedRef.current) {
                            hasOfficiallyFinishedRef.current = true;
                            officialLockedTotalScoreRef.current = officialBaseScoreRef.current + state.score;
                        }

                        notifyPlayerStream(state.score, state.round, 0, (pad.x / state.width) * 100, true, 0);
                    } else {
                        // Respawn ball on paddle
                        state.isBallStuck = true;
                        state.activePowerUp = null;
                        setActivePowerUp(null);
                        pad.width = pad.baseWidth;
                        const layoutIndex = (state.round - 1) % STAGE_LAYOUTS.length;
                        const baseSpeed = STAGE_LAYOUTS[layoutIndex].speed;
                        state.balls = [{
                            x: pad.x + pad.width / 2,
                            y: pad.y - 8,
                            vx: baseSpeed * 0.707 * (Math.random() > 0.5 ? 1 : -1),
                            vy: -baseSpeed * 0.707,
                            radius: 6,
                            baseSpeed
                        }];
                    }
                }
            }

            // Check Stage Clear (No non-solid bricks remaining)
            const remainingBreakable = state.bricks.filter(b => !b.isSolid);
            if (remainingBreakable.length === 0 && !state.isClear && !state.isGameOver) {
                state.isClear = true;
                setIsStageClear(true);

                if (bgmAudioRef.current) bgmAudioRef.current.pause();
                if (clearAudioRef.current && !isMuted) {
                    clearAudioRef.current.currentTime = 0;
                    clearAudioRef.current.play().catch(() => {});
                }

                // Stage clear bonus
                const clearBonus = 1000 * state.round;
                state.score += clearBonus;
                setScore(state.score);

                setTimeout(() => {
                    const nextRound = state.round + 1;
                    state.round = nextRound;
                    setRound(nextRound);
                    loadStage(nextRound);

                    if (bgmAudioRef.current && !isMuted) {
                        bgmAudioRef.current.play().catch(() => {});
                    }
                }, 2800);
            }

            // Periodic spectator broadcast (~every 15 frames)
            if (Math.random() < 0.08) {
                const paddlePct = Math.round((pad.x / state.width) * 100);
                notifyPlayerStream(state.score, state.round, state.lives, paddlePct, state.isGameOver, remainingBreakable.length);
            }

            render(ctx, state);
            animId = requestAnimationFrame(update);
        };

        animId = requestAnimationFrame(update);
        return () => cancelAnimationFrame(animId);
    }, [highScore, isMuted, isPracticeMode, loadStage, notifyPlayerStream, applyPowerUp]);

    // RENDER FUNCTION (Arkanoid Visuals)
    const render = (ctx, state) => {
        // Clear background
        ctx.fillStyle = '#060913';
        ctx.fillRect(0, 0, state.width, state.height);

        // Subtle background grid
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.03)';
        ctx.lineWidth = 1;
        for (let x = 20; x < state.width; x += 30) {
            ctx.beginPath();
            ctx.moveTo(x, 0);
            ctx.lineTo(x, state.height);
            ctx.stroke();
        }
        for (let y = 20; y < state.height; y += 30) {
            ctx.beginPath();
            ctx.moveTo(0, y);
            ctx.lineTo(state.width, y);
            ctx.stroke();
        }

        // Sci-Fi Metallic Border
        ctx.fillStyle = '#1e293b';
        ctx.fillRect(0, 0, 6, state.height);
        ctx.fillRect(state.width - 6, 0, 6, state.height);
        ctx.fillRect(0, 0, state.width, 6);

        ctx.strokeStyle = '#38bdf8';
        ctx.lineWidth = 1.5;
        ctx.strokeRect(6, 6, state.width - 12, state.height - 12);

        // Draw Bricks
        state.bricks.forEach(b => {
            const proto = BRICK_COLORS[b.colorKey];
            // Main fill
            ctx.fillStyle = proto.fill;
            ctx.fillRect(b.x, b.y, b.w, b.h);

            // 3D Bevel
            ctx.fillStyle = 'rgba(255, 255, 255, 0.65)';
            ctx.fillRect(b.x, b.y, b.w, 2.5); // Top highlight
            ctx.fillRect(b.x, b.y, 2.5, b.h); // Left highlight

            ctx.fillStyle = 'rgba(0, 0, 0, 0.55)';
            ctx.fillRect(b.x, b.y + b.h - 2.5, b.w, 2.5); // Bottom shadow
            ctx.fillRect(b.x + b.w - 2.5, b.y, 2.5, b.h); // Right shadow

            // Inner gloss line
            ctx.fillStyle = 'rgba(255, 255, 255, 0.2)';
            ctx.fillRect(b.x + 4, b.y + 4, b.w - 8, 2);

            // Crack effect for damaged silver bricks
            if (b.isHard && b.hp < b.maxHp) {
                ctx.strokeStyle = '#ffffff';
                ctx.lineWidth = 1.5;
                ctx.beginPath();
                ctx.moveTo(b.x + 8, b.y + 4);
                ctx.lineTo(b.x + 22, b.y + 12);
                ctx.lineTo(b.x + 36, b.y + 8);
                ctx.stroke();
            }
        });

        // Draw Lasers
        state.lasers.forEach(l => {
            ctx.fillStyle = '#ef4444';
            ctx.shadowColor = '#ef4444';
            ctx.shadowBlur = 8;
            ctx.fillRect(l.x, l.y, l.w, l.h);
            ctx.shadowBlur = 0;
        });

        // Draw Capsules (Power-Ups)
        state.capsules.forEach(cap => {
            ctx.save();
            ctx.fillStyle = cap.color;
            ctx.beginPath();
            ctx.roundRect(cap.x, cap.y, cap.w, cap.h, 6);
            ctx.fill();

            ctx.strokeStyle = '#ffffff';
            ctx.lineWidth = 1.5;
            ctx.stroke();

            ctx.fillStyle = '#ffffff';
            ctx.font = 'bold 9px monospace';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(cap.label, cap.x + cap.w / 2, cap.y + cap.h / 2);
            ctx.restore();
        });

        // Draw Particles
        state.particles.forEach(p => {
            ctx.fillStyle = p.color;
            ctx.globalAlpha = p.life;
            ctx.fillRect(p.x, p.y, 3, 3);
            ctx.globalAlpha = 1.0;
        });

        // Draw Vaus Paddle
        const pad = state.paddle;
        ctx.save();
        // Paddle Body (Rounded Capsule)
        const isLaser = state.activePowerUp === 'L';
        ctx.fillStyle = isLaser ? '#dc2626' : '#cbd5e1';
        ctx.beginPath();
        ctx.roundRect(pad.x, pad.y, pad.width, pad.height, 7);
        ctx.fill();

        // Metallic bevel
        ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
        ctx.fillRect(pad.x + 4, pad.y + 1, pad.width - 8, 3);
        ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
        ctx.fillRect(pad.x + 4, pad.y + pad.height - 3, pad.width - 8, 2);

        // Vaus Red Wing Caps
        ctx.fillStyle = '#ef4444';
        ctx.fillRect(pad.x + 2, pad.y + 2, 8, pad.height - 4);
        ctx.fillRect(pad.x + pad.width - 10, pad.y + 2, 8, pad.height - 4);

        // Center Energy Core
        ctx.fillStyle = '#38bdf8';
        ctx.shadowColor = '#38bdf8';
        ctx.shadowBlur = 6;
        ctx.fillRect(pad.x + pad.width / 2 - 10, pad.y + 4, 20, 5);
        ctx.shadowBlur = 0;

        // Laser Cannons if active
        if (isLaser) {
            ctx.fillStyle = '#f87171';
            ctx.fillRect(pad.x + 6, pad.y - 4, 4, 4);
            ctx.fillRect(pad.x + pad.width - 10, pad.y - 4, 4, 4);
        }
        ctx.restore();

        // Draw Balls
        state.balls.forEach(b => {
            ctx.save();
            ctx.fillStyle = '#ffffff';
            ctx.shadowColor = '#38bdf8';
            ctx.shadowBlur = 8;
            ctx.beginPath();
            ctx.arc(b.x, b.y, b.radius, 0, Math.PI * 2);
            ctx.fill();
            ctx.shadowBlur = 0;
            ctx.restore();
        });
    };

    return (
        <div style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '8px',
            width: '100%',
            maxWidth: isHost ? '540px' : '440px',
            margin: '0 auto',
            padding: '4px',
            fontFamily: "'Courier New', Courier, monospace",
            userSelect: 'none'
        }}>
            {/* PRACTICE MODE NOTICE */}
            {isPracticeMode && (
                <div style={{
                    background: 'linear-gradient(135deg, #1e1b4b 0%, #312e81 100%)',
                    border: '2px solid #818cf8',
                    borderRadius: '10px',
                    padding: '6px 12px',
                    textAlign: 'center',
                    boxShadow: '0 4px 12px rgba(129, 140, 248, 0.25)',
                    width: '100%',
                    boxSizing: 'border-box'
                }}>
                    <div style={{ color: '#a5b4fc', fontWeight: '900', fontSize: '0.85rem' }}>
                        🎮 연습 모드 (내 공식 점수 {officialLockedTotalScoreRef.current !== null ? officialLockedTotalScoreRef.current.toLocaleString() : (officialBaseScoreRef.current + score).toLocaleString()}점 안전 보존됨)
                    </div>
                </div>
            )}

            {/* ARKANOID ARCADE CABINET CONTAINER */}
            <div style={{
                background: '#0a0d16',
                border: '4px solid #334155',
                borderRadius: '16px',
                padding: '12px 14px',
                boxShadow: '0 12px 36px rgba(0,0,0,0.7), inset 0 0 20px rgba(0,0,0,0.8)',
                width: '100%',
                boxSizing: 'border-box',
                position: 'relative'
            }}>
                {/* ARCADE MARQUEE */}
                <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    borderBottom: '2px solid #1e293b',
                    paddingBottom: '8px',
                    marginBottom: '10px'
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span style={{
                            fontSize: '1.25rem',
                            fontWeight: '900',
                            letterSpacing: '2px',
                            background: 'linear-gradient(180deg, #67e8f9 0%, #06b6d4 50%, #0284c7 100%)',
                            WebkitBackgroundClip: 'text',
                            WebkitTextFillColor: 'transparent',
                            textShadow: '0 0 10px rgba(6, 182, 212, 0.5)'
                        }}>
                            ARKANOID
                        </span>
                        <span style={{
                            fontSize: '0.65rem',
                            color: '#94a3b8',
                            border: '1px solid #475569',
                            padding: '1px 5px',
                            borderRadius: '4px',
                            fontWeight: 'bold',
                            letterSpacing: '1px'
                        }}>
                            TAITO 1986
                        </span>
                    </div>

                    {/* Audio Mute/Unmute */}
                    <button
                        onClick={() => setIsMuted(prev => !prev)}
                        style={{
                            background: isMuted ? '#334155' : '#0284c7',
                            border: '1px solid rgba(255,255,255,0.2)',
                            borderRadius: '8px',
                            padding: '4px 8px',
                            color: 'white',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px',
                            fontSize: '0.72rem',
                            fontWeight: 'bold'
                        }}
                    >
                        {isMuted ? <VolumeX size={14} /> : <Volume2 size={14} />}
                        <span>{isMuted ? '음소거' : 'BGM ON'}</span>
                    </button>
                </div>

                {/* ARCADE HUD (SCORE / HI-SCORE / ROUND / LIVES) */}
                <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(4, 1fr)',
                    gap: '6px',
                    background: '#05070d',
                    padding: '8px 10px',
                    borderRadius: '10px',
                    border: '1.5px solid #1e293b',
                    marginBottom: '10px',
                    alignItems: 'center'
                }}>
                    {/* 1UP SCORE */}
                    <div style={{ textAlign: 'center' }}>
                        <div style={{ color: '#38bdf8', fontSize: '0.62rem', fontWeight: '900', letterSpacing: '1px' }}>1UP SCORE</div>
                        <div style={{ color: '#ffffff', fontSize: '0.95rem', fontWeight: '900' }}>{String(score).padStart(6, '0')}</div>
                    </div>

                    {/* HI-SCORE */}
                    <div style={{ textAlign: 'center' }}>
                        <div style={{ color: '#f87171', fontSize: '0.62rem', fontWeight: '900', letterSpacing: '1px' }}>HI-SCORE</div>
                        <div style={{ color: '#fca5a5', fontSize: '0.95rem', fontWeight: '900' }}>{String(highScore).padStart(6, '0')}</div>
                    </div>

                    {/* ROUND */}
                    <div style={{ textAlign: 'center' }}>
                        <div style={{ color: '#fbbf24', fontSize: '0.62rem', fontWeight: '900', letterSpacing: '1px' }}>ROUND</div>
                        <div style={{ color: '#fef08a', fontSize: '1rem', fontWeight: '900' }}>{round < 10 ? '0' + round : round}</div>
                    </div>

                    {/* LIVES */}
                    <div style={{ textAlign: 'center' }}>
                        <div style={{ color: '#4ade80', fontSize: '0.62rem', fontWeight: '900', letterSpacing: '1px' }}>VAUS SHIPS</div>
                        <div style={{ fontSize: '0.95rem', fontWeight: '900', color: '#f87171', display: 'flex', justifyContent: 'center', gap: '3px' }}>
                            {Array.from({ length: lives }).map((_, i) => (
                                <span key={i}>🚀</span>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Active Power-Up Banner */}
                {activePowerUp && (
                    <div style={{
                        background: 'linear-gradient(90deg, #1e1b4b, #312e81)',
                        border: '1.5px solid #818cf8',
                        borderRadius: '6px',
                        padding: '4px 8px',
                        marginBottom: '8px',
                        textAlign: 'center',
                        color: '#c7d2fe',
                        fontSize: '0.75rem',
                        fontWeight: '900',
                        letterSpacing: '1px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '6px'
                    }}>
                        <Zap size={14} color="#facc15" />
                        POWER-UP ACTIVE: {POWER_UPS.find(p => p.type === activePowerUp)?.label}
                    </div>
                )}

                {/* CANVAS PLAYFIELD */}
                <div style={{
                    position: 'relative',
                    display: 'flex',
                    justifyContent: 'center',
                    alignItems: 'center'
                }}>
                    <canvas
                        ref={canvasRef}
                        width={440}
                        height={520}
                        onPointerMove={handlePointerMove}
                        onTouchMove={handlePointerMove}
                        onClick={launchBall}
                        style={{
                            width: '100%',
                            maxWidth: isHost ? '440px' : '380px',
                            height: 'auto',
                            aspectRatio: '440/520',
                            borderRadius: '8px',
                            cursor: 'ew-resize',
                            background: '#060913',
                            boxShadow: '0 6px 20px rgba(0,0,0,0.6)'
                        }}
                    />

                    {/* STAGE START BANNER */}
                    {stageBanner && (
                        <div style={{
                            position: 'absolute',
                            top: '42%',
                            left: '5%',
                            right: '5%',
                            background: 'linear-gradient(90deg, rgba(2, 132, 199, 0.95), rgba(14, 165, 233, 0.95))',
                            color: '#ffffff',
                            textAlign: 'center',
                            padding: '10px 4px',
                            fontWeight: '950',
                            fontSize: '0.95rem',
                            letterSpacing: '2px',
                            borderTop: '2px solid #bae6fd',
                            borderBottom: '2px solid #bae6fd',
                            boxShadow: '0 0 25px rgba(14, 165, 233, 0.8)',
                            zIndex: 10
                        }}>
                            🚀 {stageBanner} 🚀
                        </div>
                    )}

                    {/* STAGE CLEAR BANNER */}
                    {isStageClear && (
                        <div style={{
                            position: 'absolute',
                            top: '42%',
                            left: '5%',
                            right: '5%',
                            background: 'linear-gradient(90deg, rgba(22, 163, 74, 0.95), rgba(34, 197, 94, 0.95))',
                            color: '#ffffff',
                            textAlign: 'center',
                            padding: '12px 4px',
                            fontWeight: '950',
                            fontSize: '1.05rem',
                            letterSpacing: '2px',
                            borderTop: '2px solid #bbf7d0',
                            borderBottom: '2px solid #bbf7d0',
                            boxShadow: '0 0 25px rgba(34, 197, 94, 0.8)',
                            zIndex: 12
                        }}>
                            🌟 ROUND {round} CLEAR! BONUS +{1000 * round} 🌟
                        </div>
                    )}

                    {/* GAME OVER OVERLAY */}
                    {isGameOver && (
                        <div style={{
                            position: 'absolute',
                            top: 0, left: 0, right: 0, bottom: 0,
                            background: 'rgba(6, 9, 19, 0.94)',
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '10px',
                            color: 'white',
                            padding: '14px',
                            textAlign: 'center',
                            zIndex: 20
                        }}>
                            <div style={{
                                color: '#ef4444',
                                fontSize: '1.6rem',
                                fontWeight: '950',
                                letterSpacing: '3px',
                                textShadow: '0 0 10px rgba(239, 68, 68, 0.8)'
                            }}>
                                GAME OVER
                            </div>
                            <div style={{ fontSize: '0.82rem', color: '#94a3b8', lineHeight: '1.5' }}>
                                <div>최종 점수: <strong style={{ color: '#38bdf8' }}>{score.toLocaleString()}점</strong></div>
                                <div>도달 라운드: <strong style={{ color: '#fbbf24' }}>ROUND {round}</strong></div>
                            </div>
                            <button
                                onClick={() => restartGame(true)}
                                style={{
                                    marginTop: '8px',
                                    background: 'linear-gradient(180deg, #3b82f6 0%, #1d4ed8 100%)',
                                    color: 'white',
                                    border: '2px solid #93c5fd',
                                    padding: '9px 20px',
                                    borderRadius: '8px',
                                    fontWeight: '900',
                                    fontSize: '0.9rem',
                                    cursor: 'pointer',
                                    letterSpacing: '1px',
                                    boxShadow: '0 4px 12px rgba(59, 130, 246, 0.5)'
                                }}
                            >
                                <RotateCcw size={14} style={{ display: 'inline', marginRight: '6px' }} />
                                다시 도전 (INSERT COIN)
                            </button>
                        </div>
                    )}
                </div>

                {/* BOTTOM PLAQUE */}
                <div style={{
                    marginTop: '8px',
                    textAlign: 'center',
                    fontSize: '0.62rem',
                    color: '#64748b',
                    letterSpacing: '1.5px',
                    fontWeight: 'bold',
                    borderTop: '1px solid #1e293b',
                    paddingTop: '6px'
                }}>
                    © 1986 TAITO CORP. / ARKANOID VAUS
                </div>
            </div>

            {/* RETRO ARCADE TOUCH CONTROLS */}
            <div style={{
                display: 'flex',
                gap: '8px',
                width: '100%',
                maxWidth: '340px',
                marginTop: '4px',
                justifyContent: 'center'
            }}>
                <button
                    onPointerDown={() => { stateRef.current.keys.left = true; }}
                    onPointerUp={() => { stateRef.current.keys.left = false; }}
                    onPointerLeave={() => { stateRef.current.keys.left = false; }}
                    disabled={isGameOver}
                    style={{
                        flex: 1,
                        padding: '14px 0',
                        borderRadius: '12px',
                        background: 'linear-gradient(180deg, #334155 0%, #1e293b 100%)',
                        border: '2px solid #475569',
                        color: '#e2e8f0',
                        fontSize: '1.25rem',
                        fontWeight: 'bold',
                        cursor: 'pointer',
                        boxShadow: '0 4px 8px rgba(0,0,0,0.3)'
                    }}
                >
                    ◀ 왼쪽
                </button>
                <button
                    onClick={launchBall}
                    disabled={isGameOver}
                    style={{
                        flex: 1.4,
                        padding: '14px 0',
                        borderRadius: '12px',
                        background: activePowerUp === 'L'
                            ? 'linear-gradient(180deg, #ef4444 0%, #b91c1c 100%)'
                            : 'linear-gradient(180deg, #0284c7 0%, #0369a1 100%)',
                        border: activePowerUp === 'L' ? '2px solid #fca5a5' : '2px solid #7dd3fc',
                        color: '#ffffff',
                        fontSize: '0.95rem',
                        fontWeight: '900',
                        cursor: 'pointer',
                        letterSpacing: '1px',
                        boxShadow: '0 4px 10px rgba(2, 132, 199, 0.4)'
                    }}
                >
                    {activePowerUp === 'L' ? '⚡ 레이저 발사!' : '🚀 볼 발사 (LAUNCH)'}
                </button>
                <button
                    onPointerDown={() => { stateRef.current.keys.right = true; }}
                    onPointerUp={() => { stateRef.current.keys.right = false; }}
                    onPointerLeave={() => { stateRef.current.keys.right = false; }}
                    disabled={isGameOver}
                    style={{
                        flex: 1,
                        padding: '14px 0',
                        borderRadius: '12px',
                        background: 'linear-gradient(180deg, #334155 0%, #1e293b 100%)',
                        border: '2px solid #475569',
                        color: '#e2e8f0',
                        fontSize: '1.25rem',
                        fontWeight: 'bold',
                        cursor: 'pointer',
                        boxShadow: '0 4px 8px rgba(0,0,0,0.3)'
                    }}
                >
                    오른쪽 ▶
                </button>
            </div>
        </div>
    );
}
