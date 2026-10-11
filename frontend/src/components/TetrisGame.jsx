import React, { useState, useEffect, useRef, useCallback } from 'react';
import { RotateCcw, Volume2, VolumeX, Trophy, Skull, Sparkles, ChevronDown } from 'lucide-react';
import { playSound } from '../utils/audio';

const COLS = 10;
const ROWS = 20;

// 1988 Sega Tetris (System 16) Palette & Pieces
const TETROMINOES = {
    I: {
        shape: [
            [0, 0, 0, 0],
            [1, 1, 1, 1],
            [0, 0, 0, 0],
            [0, 0, 0, 0]
        ],
        color: '#ef4444', // Sega Vibrant Red
        name: 'I'
    },
    O: {
        shape: [
            [1, 1],
            [1, 1]
        ],
        color: '#2563eb', // Sega Deep Blue
        name: 'O'
    },
    T: {
        shape: [
            [0, 1, 0],
            [1, 1, 1],
            [0, 0, 0]
        ],
        color: '#10b981', // Sega Emerald Green
        name: 'T'
    },
    S: {
        shape: [
            [0, 1, 1],
            [1, 1, 0],
            [0, 0, 0]
        ],
        color: '#d946ef', // Sega Magenta Pink
        name: 'S'
    },
    Z: {
        shape: [
            [1, 1, 0],
            [0, 1, 1],
            [0, 0, 0]
        ],
        color: '#84cc16', // Sega Lime Green
        name: 'Z'
    },
    J: {
        shape: [
            [1, 0, 0],
            [1, 1, 1],
            [0, 0, 0]
        ],
        color: '#06b6d4', // Sega Sky Blue / Cyan
        name: 'J'
    },
    L: {
        shape: [
            [0, 0, 1],
            [1, 1, 1],
            [0, 0, 0]
        ],
        color: '#f97316', // Sega Vivid Orange
        name: 'L'
    }
};

const SHAPES = ['I', 'O', 'T', 'S', 'Z', 'J', 'L'];

// Authentic escalating gravity speed per Round (ms per drop)
const FALL_SPEEDS = [
    750, // Round 1
    600, // Round 2
    480, // Round 3
    380, // Round 4
    300, // Round 5
    230, // Round 6
    170, // Round 7
    120, // Round 8
    90,  // Round 9
    70,  // Round 10
    55,  // Round 11
    45   // Round 12+ (Arcade Extreme Speed)
];

function createEmptyGrid() {
    return Array.from({ length: ROWS }, () => Array(COLS).fill(null));
}

function getRandomPiece() {
    const key = SHAPES[Math.floor(Math.random() * SHAPES.length)];
    const proto = TETROMINOES[key];
    return {
        key,
        shape: proto.shape.map(r => [...r]),
        color: proto.color,
        x: Math.floor((COLS - proto.shape[0].length) / 2),
        y: 0
    };
}

export default function TetrisGame({
    socket,
    pin,
    isHost = false,
    nickname = '호스트',
    groupId = null,
    baseScore = 0
}) {
    const [grid, setGrid] = useState(createEmptyGrid);
    const [currentPiece, setCurrentPiece] = useState(null);
    const [nextPiece, setNextPiece] = useState(() => getRandomPiece());
    const [score, setScore] = useState(0);
    const [highScore, setHighScore] = useState(() => {
        try {
            return parseInt(localStorage.getItem('sega_tetris_hiscore') || '10000', 10);
        } catch (e) {
            return 10000;
        }
    });
    const [round, setRound] = useState(1);
    const [lines, setLines] = useState(0);
    const [linesInRound, setLinesInRound] = useState(0);
    const [isGameOver, setIsGameOver] = useState(false);
    const [isPaused, setIsPaused] = useState(false);
    const [isPracticeMode, setIsPracticeMode] = useState(false);
    const [clearingRows, setClearingRows] = useState([]);
    const [roundUpNotice, setRoundUpNotice] = useState(null);
    const [tetrisFlash, setTetrisFlash] = useState(false);
    const [isMuted, setIsMuted] = useState(false);

    // Audio elements
    const bgmRef = useRef(null);
    const gameOverAudioRef = useRef(null);

    // Official round score locking
    const officialBaseScoreRef = useRef(typeof baseScore === 'number' ? baseScore : 0);
    const hasOfficiallyFinishedRef = useRef(false);
    const officialLockedTotalScoreRef = useRef(null);

    useEffect(() => {
        if (!hasOfficiallyFinishedRef.current) {
            officialBaseScoreRef.current = typeof baseScore === 'number' ? baseScore : 0;
        }
    }, [baseScore]);

    const gridRef = useRef(grid);
    gridRef.current = grid;
    const currentPieceRef = useRef(currentPiece);
    currentPieceRef.current = currentPiece;
    const nextPieceRef = useRef(nextPiece);
    nextPieceRef.current = nextPiece;
    const isGameOverRef = useRef(isGameOver);
    isGameOverRef.current = isGameOver;
    const roundRef = useRef(round);
    roundRef.current = round;
    const linesRef = useRef(lines);
    linesRef.current = lines;
    const scoreRef = useRef(score);
    scoreRef.current = score;

    // Lock delay tracking
    const lockTimerRef = useRef(null);
    const lockResetsRef = useRef(0);

    // Initialize Sega BGM and Game Over audio
    useEffect(() => {
        const bgm = new Audio('/audio/sega_tetris.mp3');
        bgm.loop = true;
        bgm.volume = isMuted ? 0 : 0.28;
        bgmRef.current = bgm;

        const goAudio = new Audio('/audio/sega_gameover.mp3');
        goAudio.volume = isMuted ? 0 : 0.5;
        gameOverAudioRef.current = goAudio;

        // Auto play on mount or user gesture
        const playPromise = bgm.play();
        if (playPromise !== undefined) {
            playPromise.catch(() => {
                // Browser policy blocked autoplay, will resume on interaction
                const resumeBgm = () => {
                    if (bgmRef.current && !isGameOverRef.current) {
                        bgmRef.current.play().catch(() => {});
                    }
                    window.removeEventListener('pointerdown', resumeBgm);
                    window.removeEventListener('keydown', resumeBgm);
                };
                window.addEventListener('pointerdown', resumeBgm, { once: true });
                window.addEventListener('keydown', resumeBgm, { once: true });
            });
        }

        return () => {
            if (bgmRef.current) {
                bgmRef.current.pause();
                bgmRef.current = null;
            }
            if (gameOverAudioRef.current) {
                gameOverAudioRef.current.pause();
                gameOverAudioRef.current = null;
            }
        };
    }, []);

    // Handle mute toggle
    useEffect(() => {
        if (bgmRef.current) {
            bgmRef.current.volume = isMuted ? 0 : 0.28;
        }
        if (gameOverAudioRef.current) {
            gameOverAudioRef.current.volume = isMuted ? 0 : 0.5;
        }
    }, [isMuted]);

    // Stream participant game progress to Host & Spectator
    const notifyPlayerStream = useCallback((curGrid, curPiece, curScore, curLines, curRound, gameOver, forcePractice = false) => {
        if (!socket || !pin) return;
        const inPractice = forcePractice || isPracticeMode || hasOfficiallyFinishedRef.current;

        // Render combined 10x20 grid (200 items)
        const flatCombined = Array(ROWS * COLS).fill(null);
        for (let r = 0; r < ROWS; r++) {
            for (let c = 0; c < COLS; c++) {
                if (curGrid[r][c]) {
                    flatCombined[r * COLS + c] = curGrid[r][c];
                }
            }
        }
        if (curPiece) {
            const { shape, color, x, y } = curPiece;
            for (let r = 0; r < shape.length; r++) {
                for (let c = 0; c < shape[r].length; c++) {
                    if (shape[r][c]) {
                        const boardR = y + r;
                        const boardC = x + c;
                        if (boardR >= 0 && boardR < ROWS && boardC >= 0 && boardC < COLS) {
                            flatCombined[boardR * COLS + boardC] = color;
                        }
                    }
                }
            }
        }

        const gamePayload = {
            grid: flatCombined,
            score: curScore,
            lines: curLines,
            round: curRound,
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
                    gameId: 'tetris',
                    score: lockedScore,
                    roundScore: curScore,
                    baseScore: officialBaseScoreRef.current,
                    isPractice: true,
                    isAlive: !gameOver,
                    isFinished: gameOver,
                    gameData: gamePayload
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
                    gameId: 'tetris',
                    score: totalScore,
                    roundScore: curScore,
                    baseScore: officialBaseScoreRef.current,
                    isPractice: false,
                    isAlive: !gameOver,
                    isFinished: gameOver,
                    gameData: gamePayload
                }
            });
        }
    }, [socket, pin, nickname, groupId, isPracticeMode]);

    // Check collision
    const checkCollision = (piece, testGrid, offsetX = 0, offsetY = 0) => {
        if (!piece) return true;
        const { shape, x, y } = piece;
        for (let r = 0; r < shape.length; r++) {
            for (let c = 0; c < shape[r].length; c++) {
                if (shape[r][c]) {
                    const newX = x + c + offsetX;
                    const newY = y + r + offsetY;
                    if (newX < 0 || newX >= COLS || newY >= ROWS) {
                        return true;
                    }
                    if (newY >= 0 && testGrid[newY][newX]) {
                        return true;
                    }
                }
            }
        }
        return false;
    };

    // Spawn new tetromino from nextPiece queue
    const spawnPiece = useCallback(() => {
        const next = nextPieceRef.current || getRandomPiece();
        const incoming = getRandomPiece();
        setNextPiece(incoming);
        nextPieceRef.current = incoming;

        const newPiece = {
            key: next.key,
            shape: next.shape,
            color: next.color,
            x: Math.floor((COLS - next.shape[0].length) / 2),
            y: 0
        };

        if (checkCollision(newPiece, gridRef.current)) {
            // Top out (GAME OVER)
            setIsGameOver(true);
            isGameOverRef.current = true;

            if (bgmRef.current) {
                bgmRef.current.pause();
            }
            if (gameOverAudioRef.current && !isMuted) {
                gameOverAudioRef.current.currentTime = 0;
                gameOverAudioRef.current.play().catch(() => {});
            }

            if (!isPracticeMode && !hasOfficiallyFinishedRef.current) {
                hasOfficiallyFinishedRef.current = true;
                officialLockedTotalScoreRef.current = officialBaseScoreRef.current + scoreRef.current;
            }
            notifyPlayerStream(gridRef.current, null, scoreRef.current, linesRef.current, roundRef.current, true);
            return null;
        }

        setCurrentPiece(newPiece);
        currentPieceRef.current = newPiece;
        lockResetsRef.current = 0;
        return newPiece;
    }, [notifyPlayerStream, isPracticeMode, isMuted]);

    // Restart Game
    const restartGame = useCallback((isManualRestart = false) => {
        if (isManualRestart || hasOfficiallyFinishedRef.current) {
            setIsPracticeMode(true);
        }

        if (lockTimerRef.current) {
            clearTimeout(lockTimerRef.current);
            lockTimerRef.current = null;
        }

        const empty = createEmptyGrid();
        setGrid(empty);
        gridRef.current = empty;
        setScore(0);
        scoreRef.current = 0;
        setLines(0);
        linesRef.current = 0;
        setLinesInRound(0);
        setRound(1);
        roundRef.current = 1;
        setIsGameOver(false);
        isGameOverRef.current = false;
        setIsPaused(false);
        setClearingRows([]);
        setRoundUpNotice(null);
        setTetrisFlash(false);

        const firstPiece = getRandomPiece();
        const upcoming = getRandomPiece();
        setCurrentPiece(firstPiece);
        currentPieceRef.current = firstPiece;
        setNextPiece(upcoming);
        nextPieceRef.current = upcoming;

        if (gameOverAudioRef.current) {
            gameOverAudioRef.current.pause();
        }
        if (bgmRef.current && !isMuted) {
            bgmRef.current.currentTime = 0;
            bgmRef.current.play().catch(() => {});
        }

        notifyPlayerStream(empty, firstPiece, 0, 0, 1, false, (isManualRestart || hasOfficiallyFinishedRef.current));
    }, [notifyPlayerStream, isMuted]);

    useEffect(() => {
        restartGame();
    }, []);

    // Merge piece and clear rows with Sega scoring formula
    const lockPieceAndClearRows = useCallback((pieceToLock) => {
        if (!pieceToLock) return;
        const currentGrid = gridRef.current;
        const newGrid = currentGrid.map(row => [...row]);
        const { shape, color, x, y } = pieceToLock;

        for (let r = 0; r < shape.length; r++) {
            for (let c = 0; c < shape[r].length; c++) {
                if (shape[r][c]) {
                    const boardR = y + r;
                    const boardC = x + c;
                    if (boardR >= 0 && boardR < ROWS && boardC >= 0 && boardC < COLS) {
                        newGrid[boardR][boardC] = color;
                    }
                }
            }
        }

        // Detect full rows
        const fullRowIndices = [];
        for (let r = 0; r < ROWS; r++) {
            if (newGrid[r].every(cell => cell !== null)) {
                fullRowIndices.push(r);
            }
        }

        if (fullRowIndices.length > 0) {
            // Flash rows before clearing
            setClearingRows(fullRowIndices);
            if (fullRowIndices.length >= 4) {
                setTetrisFlash(true);
                setTimeout(() => setTetrisFlash(false), 900);
            }

            playSound(fullRowIndices.length >= 4 ? 'fanfare' : 'correct');

            setTimeout(() => {
                const remainingRows = newGrid.filter((_, idx) => !fullRowIndices.includes(idx));
                const emptyRows = Array.from({ length: fullRowIndices.length }, () => Array(COLS).fill(null));
                const updatedGrid = [...emptyRows, ...remainingRows];

                const curRound = roundRef.current;
                let addedScore = 0;
                const clearedCount = fullRowIndices.length;

                // Authentic Sega Arcade Scoring: 100 / 400 / 900 / 2000 * Round
                if (clearedCount === 1) addedScore = 100 * curRound;
                else if (clearedCount === 2) addedScore = 400 * curRound;
                else if (clearedCount === 3) addedScore = 900 * curRound;
                else if (clearedCount >= 4) addedScore = 2000 * curRound;

                const nextScore = scoreRef.current + addedScore;
                const nextLines = linesRef.current + clearedCount;
                scoreRef.current = nextScore;
                linesRef.current = nextLines;

                // High score update
                if (nextScore > highScore) {
                    setHighScore(nextScore);
                    try {
                        localStorage.setItem('sega_tetris_hiscore', String(nextScore));
                    } catch (e) {}
                }

                // Escalating difficulty: Round advances every 4 lines
                setLinesInRound(prevLinesInRound => {
                    const totalInRound = prevLinesInRound + clearedCount;
                    if (totalInRound >= 4) {
                        const newRound = curRound + 1;
                        setRound(newRound);
                        roundRef.current = newRound;
                        setRoundUpNotice(`ROUND ${newRound < 10 ? '0' + newRound : newRound} - SPEED UP!`);
                        playSound('reveal');
                        setTimeout(() => setRoundUpNotice(null), 1800);
                        return totalInRound % 4;
                    }
                    return totalInRound;
                });

                setGrid(updatedGrid);
                gridRef.current = updatedGrid;
                setScore(nextScore);
                setLines(nextLines);
                setClearingRows([]);

                const spawned = spawnPiece();
                notifyPlayerStream(updatedGrid, spawned, nextScore, nextLines, roundRef.current, isGameOverRef.current);
            }, 200);
        } else {
            // No lines cleared, place and spawn immediately
            setGrid(newGrid);
            gridRef.current = newGrid;
            playSound('step');
            const spawned = spawnPiece();
            notifyPlayerStream(newGrid, spawned, scoreRef.current, linesRef.current, roundRef.current, isGameOverRef.current);
        }
    }, [spawnPiece, notifyPlayerStream, highScore]);

    // Move Piece Down (Tick with Lock Delay)
    const moveDown = useCallback((isManual = false) => {
        if (!currentPieceRef.current || isGameOverRef.current) return;

        const piece = currentPieceRef.current;
        if (!checkCollision(piece, gridRef.current, 0, 1)) {
            // Able to drop 1 row
            if (lockTimerRef.current) {
                clearTimeout(lockTimerRef.current);
                lockTimerRef.current = null;
            }
            const moved = {
                ...piece,
                y: piece.y + 1
            };
            setCurrentPiece(moved);
            currentPieceRef.current = moved;

            if (isManual) {
                // Soft drop +1 score bonus
                const updatedScore = scoreRef.current + 1;
                setScore(updatedScore);
                scoreRef.current = updatedScore;
            }

            notifyPlayerStream(gridRef.current, moved, scoreRef.current, linesRef.current, roundRef.current, false);
        } else {
            // On ground: Lock Delay (450ms)
            if (!lockTimerRef.current) {
                lockTimerRef.current = setTimeout(() => {
                    lockTimerRef.current = null;
                    if (currentPieceRef.current && checkCollision(currentPieceRef.current, gridRef.current, 0, 1)) {
                        lockPieceAndClearRows(currentPieceRef.current);
                    }
                }, 450);
            }
        }
    }, [lockPieceAndClearRows, notifyPlayerStream]);

    // Move Left / Right
    const moveHorizontal = useCallback((dir) => {
        if (!currentPieceRef.current || isGameOverRef.current) return;
        const offset = dir === 'left' ? -1 : 1;
        if (!checkCollision(currentPieceRef.current, gridRef.current, offset, 0)) {
            const moved = {
                ...currentPieceRef.current,
                x: currentPieceRef.current.x + offset
            };
            setCurrentPiece(moved);
            currentPieceRef.current = moved;
            playSound('submit');

            // Reset lock delay on movement if on ground (up to 8 times)
            if (lockTimerRef.current && lockResetsRef.current < 8) {
                lockResetsRef.current++;
                clearTimeout(lockTimerRef.current);
                lockTimerRef.current = setTimeout(() => {
                    lockTimerRef.current = null;
                    if (currentPieceRef.current && checkCollision(currentPieceRef.current, gridRef.current, 0, 1)) {
                        lockPieceAndClearRows(currentPieceRef.current);
                    }
                }, 450);
            }

            notifyPlayerStream(gridRef.current, moved, scoreRef.current, linesRef.current, roundRef.current, false);
        }
    }, [lockPieceAndClearRows, notifyPlayerStream]);

    // Rotate Piece (Sega Rotation System with Wall Kicks)
    const rotatePiece = useCallback(() => {
        if (!currentPieceRef.current || isGameOverRef.current) return;
        const piece = currentPieceRef.current;
        const { shape } = piece;

        // 90 deg clockwise matrix rotation
        const rotated = shape[0].map((_, index) => shape.map(row => row[index]).reverse());
        const candidate = {
            ...piece,
            shape: rotated
        };

        // Check normal placement or wall kicks
        let finalPiece = null;
        if (!checkCollision(candidate, gridRef.current, 0, 0)) {
            finalPiece = candidate;
        } else if (!checkCollision(candidate, gridRef.current, -1, 0)) {
            finalPiece = { ...candidate, x: candidate.x - 1 };
        } else if (!checkCollision(candidate, gridRef.current, 1, 0)) {
            finalPiece = { ...candidate, x: candidate.x + 1 };
        } else if (!checkCollision(candidate, gridRef.current, -2, 0) && piece.key === 'I') {
            finalPiece = { ...candidate, x: candidate.x - 2 };
        } else if (!checkCollision(candidate, gridRef.current, 2, 0) && piece.key === 'I') {
            finalPiece = { ...candidate, x: candidate.x + 2 };
        }

        if (finalPiece) {
            setCurrentPiece(finalPiece);
            currentPieceRef.current = finalPiece;
            playSound('submit');

            // Reset lock delay on rotation (up to 8 times)
            if (lockTimerRef.current && lockResetsRef.current < 8) {
                lockResetsRef.current++;
                clearTimeout(lockTimerRef.current);
                lockTimerRef.current = setTimeout(() => {
                    lockTimerRef.current = null;
                    if (currentPieceRef.current && checkCollision(currentPieceRef.current, gridRef.current, 0, 1)) {
                        lockPieceAndClearRows(currentPieceRef.current);
                    }
                }, 450);
            }

            notifyPlayerStream(gridRef.current, finalPiece, scoreRef.current, linesRef.current, roundRef.current, false);
        }
    }, [lockPieceAndClearRows, notifyPlayerStream]);

    // Hard Drop
    const hardDrop = useCallback(() => {
        if (!currentPieceRef.current || isGameOverRef.current) return;
        if (lockTimerRef.current) {
            clearTimeout(lockTimerRef.current);
            lockTimerRef.current = null;
        }

        let dropY = 0;
        while (!checkCollision(currentPieceRef.current, gridRef.current, 0, dropY + 1)) {
            dropY++;
        }

        const droppedPiece = {
            ...currentPieceRef.current,
            y: currentPieceRef.current.y + dropY
        };

        // Hard drop bonus score: +2 per row
        const bonusScore = dropY * 2;
        const updatedScore = scoreRef.current + bonusScore;
        setScore(updatedScore);
        scoreRef.current = updatedScore;

        playSound('reveal');
        lockPieceAndClearRows(droppedPiece);
    }, [lockPieceAndClearRows]);

    // Fall Gravity Interval based on escalating Round speed
    useEffect(() => {
        if (isGameOver || isPaused) return;
        const currentSpeed = FALL_SPEEDS[Math.min(round - 1, FALL_SPEEDS.length - 1)];
        const interval = setInterval(() => {
            moveDown(false);
        }, currentSpeed);
        return () => clearInterval(interval);
    }, [isGameOver, isPaused, round, moveDown]);

    // Keyboard Controls
    useEffect(() => {
        const handleKeyDown = (e) => {
            if (isGameOver) return;
            if (e.key === 'ArrowLeft') {
                e.preventDefault();
                moveHorizontal('left');
            } else if (e.key === 'ArrowRight') {
                e.preventDefault();
                moveHorizontal('right');
            } else if (e.key === 'ArrowDown') {
                e.preventDefault();
                moveDown(true);
            } else if (e.key === 'ArrowUp' || e.key === 'x' || e.key === 'X') {
                e.preventDefault();
                rotatePiece();
            } else if (e.key === ' ' || e.key === 'z' || e.key === 'Z') {
                e.preventDefault();
                hardDrop();
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isGameOver, moveHorizontal, moveDown, rotatePiece, hardDrop]);

    // Construct Display Grid
    const displayGrid = grid.map(row => [...row]);
    if (currentPiece) {
        const { shape, color, x, y } = currentPiece;
        for (let r = 0; r < shape.length; r++) {
            for (let c = 0; c < shape[r].length; c++) {
                if (shape[r][c]) {
                    const boardR = y + r;
                    const boardC = x + c;
                    if (boardR >= 0 && boardR < ROWS && boardC >= 0 && boardC < COLS) {
                        displayGrid[boardR][boardC] = color;
                    }
                }
            }
        }
    }

    // Helper: format arcade numbers with leading zeroes
    const formatScore = (n) => String(n).padStart(6, '0');
    const formatNumber = (n, len = 3) => String(n).padStart(len, '0');

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
            {/* PRACTICE MODE NOTICE FOR EARLY FINISHERS */}
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
                    <div style={{ color: '#a5b4fc', fontWeight: '900', fontSize: '0.85rem', letterSpacing: '0.5px' }}>
                        🎮 연습 모드 (내 공식 점수 {officialLockedTotalScoreRef.current !== null ? officialLockedTotalScoreRef.current.toLocaleString() : (officialBaseScoreRef.current + score).toLocaleString()}점 안전 보존됨)
                    </div>
                </div>
            )}

            {/* SEGA 1988 ARCADE CABINET CONTAINER */}
            <div style={{
                background: '#0a0d14',
                border: '4px solid #334155',
                borderRadius: '16px',
                padding: '12px 14px',
                boxShadow: '0 12px 36px rgba(0,0,0,0.7), inset 0 0 20px rgba(0,0,0,0.8)',
                width: '100%',
                boxSizing: 'border-box',
                position: 'relative'
            }}>
                {/* ARCADE MARQUEE / HEADER */}
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
                            background: 'linear-gradient(180deg, #fef08a 0%, #f59e0b 50%, #d97706 100%)',
                            WebkitBackgroundClip: 'text',
                            WebkitTextFillColor: 'transparent',
                            textShadow: '0 0 10px rgba(245, 158, 11, 0.5)'
                        }}>
                            TETRIS
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
                            SEGA 1988
                        </span>
                    </div>

                    {/* Audio Mute/Unmute Button */}
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
                        title="BGM 소리 켜기/끄기"
                    >
                        {isMuted ? <VolumeX size={14} /> : <Volume2 size={14} />}
                        <span>{isMuted ? '음소거' : 'BGM ON'}</span>
                    </button>
                </div>

                {/* ARCADE HUD (1UP SCORE / HI-SCORE / ROUND / LINES / NEXT) */}
                <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(4, 1fr) auto',
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
                        <div style={{ color: '#ffffff', fontSize: '0.95rem', fontWeight: '900', letterSpacing: '1px' }}>{formatScore(score)}</div>
                    </div>

                    {/* HI-SCORE */}
                    <div style={{ textAlign: 'center' }}>
                        <div style={{ color: '#f87171', fontSize: '0.62rem', fontWeight: '900', letterSpacing: '1px' }}>HI-SCORE</div>
                        <div style={{ color: '#fca5a5', fontSize: '0.95rem', fontWeight: '900', letterSpacing: '1px' }}>{formatScore(highScore)}</div>
                    </div>

                    {/* ROUND (LEVEL) */}
                    <div style={{ textAlign: 'center' }}>
                        <div style={{ color: '#fbbf24', fontSize: '0.62rem', fontWeight: '900', letterSpacing: '1px' }}>ROUND</div>
                        <div style={{ color: '#fef08a', fontSize: '1rem', fontWeight: '900', letterSpacing: '1px' }}>{round < 10 ? '0' + round : round}</div>
                    </div>

                    {/* LINES */}
                    <div style={{ textAlign: 'center' }}>
                        <div style={{ color: '#4ade80', fontSize: '0.62rem', fontWeight: '900', letterSpacing: '1px' }}>LINES</div>
                        <div style={{ color: '#bbf7d0', fontSize: '0.95rem', fontWeight: '900', letterSpacing: '1px' }}>{formatNumber(lines)}</div>
                    </div>

                    {/* NEXT PIECE BOX */}
                    <div style={{
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        background: '#0d1322',
                        border: '2px solid #334155',
                        borderRadius: '6px',
                        padding: '4px 6px',
                        minWidth: '48px',
                        minHeight: '44px'
                    }}>
                        <div style={{ color: '#facc15', fontSize: '0.58rem', fontWeight: '900', marginBottom: '2px' }}>NEXT</div>
                        <div style={{
                            display: 'grid',
                            gridTemplateColumns: `repeat(${nextPiece ? nextPiece.shape[0].length : 4}, 7px)`,
                            gap: '1px'
                        }}>
                            {nextPiece && nextPiece.shape.map((row, rI) =>
                                row.map((cell, cI) => (
                                    <div
                                        key={`next-${rI}-${cI}`}
                                        style={{
                                            width: '7px',
                                            height: '7px',
                                            background: cell ? nextPiece.color : 'transparent',
                                            border: cell ? '1px solid rgba(255,255,255,0.4)' : 'none',
                                            borderRadius: '1px'
                                        }}
                                    />
                                ))
                            )}
                        </div>
                    </div>
                </div>

                {/* PLAYFIELD WITH AUTHENTIC SEGA STONE CABINET BORDER */}
                <div style={{
                    display: 'flex',
                    justifyContent: 'center',
                    alignItems: 'center',
                    position: 'relative'
                }}>
                    {/* LEFT STONE BORDER */}
                    <div style={{
                        width: '16px',
                        height: isHost ? '360px' : '320px',
                        background: 'repeating-linear-gradient(180deg, #475569 0px, #475569 16px, #1e293b 16px, #1e293b 19px, #64748b 19px, #64748b 20px)',
                        borderTopLeftRadius: '6px',
                        borderBottomLeftRadius: '6px',
                        border: '2px solid #334155',
                        borderRight: 'none',
                        boxShadow: 'inset 2px 2px 4px rgba(255,255,255,0.2), inset -2px -2px 4px rgba(0,0,0,0.5)'
                    }} />

                    {/* MAIN 10x20 MATRIX */}
                    <div style={{
                        position: 'relative',
                        display: 'grid',
                        gridTemplateColumns: `repeat(${COLS}, 1fr)`,
                        gap: '1px',
                        background: '#040711',
                        padding: '4px',
                        border: '2px solid #475569',
                        width: isHost ? '200px' : '180px',
                        height: isHost ? '360px' : '320px',
                        boxShadow: 'inset 0 0 15px rgba(0,0,0,0.95), 0 0 10px rgba(0,0,0,0.5)'
                    }}>
                        {displayGrid.flatMap((row, rIdx) => {
                            const isRowClearing = clearingRows.includes(rIdx);
                            return row.map((cellColor, cIdx) => {
                                const isFilled = !!cellColor;
                                return (
                                    <div
                                        key={`${rIdx}-${cIdx}`}
                                        style={{
                                            borderRadius: '2px',
                                            background: isRowClearing
                                                ? '#ffffff'
                                                : (isFilled ? cellColor : 'rgba(255, 255, 255, 0.02)'),
                                            borderTop: isFilled ? '2.5px solid rgba(255, 255, 255, 0.75)' : 'none',
                                            borderLeft: isFilled ? '2.5px solid rgba(255, 255, 255, 0.45)' : 'none',
                                            borderRight: isFilled ? '2.5px solid rgba(0, 0, 0, 0.65)' : 'none',
                                            borderBottom: isFilled ? '2.5px solid rgba(0, 0, 0, 0.85)' : 'none',
                                            boxShadow: isFilled
                                                ? 'inset 1px 1px 1px rgba(255,255,255,0.4), inset -1px -1px 2px rgba(0,0,0,0.6)'
                                                : 'none',
                                            transition: isRowClearing ? 'background 0.08s ease' : 'none'
                                        }}
                                    />
                                );
                            });
                        })}

                        {/* ROUND UP / STAGE SPEED UP FLASH BANNER */}
                        {roundUpNotice && (
                            <div style={{
                                position: 'absolute',
                                top: '35%',
                                left: 0,
                                right: 0,
                                background: 'linear-gradient(90deg, rgba(234, 88, 12, 0.95), rgba(245, 158, 11, 0.95))',
                                color: '#ffffff',
                                textAlign: 'center',
                                padding: '10px 4px',
                                fontWeight: '950',
                                fontSize: '0.88rem',
                                letterSpacing: '1px',
                                borderTop: '2px solid #fef08a',
                                borderBottom: '2px solid #fef08a',
                                boxShadow: '0 0 20px rgba(245, 158, 11, 0.8)',
                                zIndex: 10,
                                animation: 'pulse 0.3s infinite alternate'
                            }}>
                                ⚡ {roundUpNotice} ⚡
                            </div>
                        )}

                        {/* TETRIS 4-LINE FLASH BANNER */}
                        {tetrisFlash && (
                            <div style={{
                                position: 'absolute',
                                top: '48%',
                                left: 0,
                                right: 0,
                                background: 'linear-gradient(90deg, #dc2626, #f59e0b)',
                                color: '#ffffff',
                                textAlign: 'center',
                                padding: '8px 2px',
                                fontWeight: '950',
                                fontSize: '1.1rem',
                                letterSpacing: '2px',
                                borderTop: '2px solid #ffffff',
                                borderBottom: '2px solid #ffffff',
                                boxShadow: '0 0 25px rgba(239, 68, 68, 0.9)',
                                zIndex: 12
                            }}>
                                🌟 TETRIS! +{2000 * round} 🌟
                            </div>
                        )}

                        {/* GAME OVER RETRO OVERLAY */}
                        {isGameOver && (
                            <div style={{
                                position: 'absolute',
                                top: 0, left: 0, right: 0, bottom: 0,
                                background: 'rgba(5, 7, 15, 0.94)',
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
                                <Skull size={32} color="#ef4444" />
                                <div style={{
                                    margin: 0,
                                    color: '#ef4444',
                                    fontSize: '1.45rem',
                                    fontWeight: '950',
                                    letterSpacing: '2px',
                                    textShadow: '0 0 10px rgba(239, 68, 68, 0.8)'
                                }}>
                                    GAME OVER
                                </div>
                                <div style={{ fontSize: '0.78rem', color: '#94a3b8', lineHeight: '1.4' }}>
                                    <div>최종 점수: <strong style={{ color: '#38bdf8' }}>{score.toLocaleString()}점</strong></div>
                                    <div>도달 라운드: <strong style={{ color: '#fbbf24' }}>ROUND {round}</strong></div>
                                    <div>제거 라인: <strong style={{ color: '#4ade80' }}>{lines}줄</strong></div>
                                </div>
                                <button
                                    onClick={() => restartGame(true)}
                                    style={{
                                        marginTop: '6px',
                                        background: 'linear-gradient(180deg, #3b82f6 0%, #1d4ed8 100%)',
                                        color: 'white',
                                        border: '2px solid #93c5fd',
                                        padding: '8px 18px',
                                        borderRadius: '8px',
                                        fontWeight: '900',
                                        fontSize: '0.85rem',
                                        cursor: 'pointer',
                                        letterSpacing: '1px',
                                        boxShadow: '0 4px 12px rgba(59, 130, 246, 0.5)'
                                    }}
                                >
                                    <RotateCcw size={13} style={{ display: 'inline', marginRight: '5px' }} />
                                    다시 도전 (INSERT COIN)
                                </button>
                            </div>
                        )}
                    </div>

                    {/* RIGHT STONE BORDER */}
                    <div style={{
                        width: '16px',
                        height: isHost ? '360px' : '320px',
                        background: 'repeating-linear-gradient(180deg, #475569 0px, #475569 16px, #1e293b 16px, #1e293b 19px, #64748b 19px, #64748b 20px)',
                        borderTopRightRadius: '6px',
                        borderBottomRightRadius: '6px',
                        border: '2px solid #334155',
                        borderLeft: 'none',
                        boxShadow: 'inset 2px 2px 4px rgba(255,255,255,0.2), inset -2px -2px 4px rgba(0,0,0,0.5)'
                    }} />
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
                    © 1988 SEGA ENTERPRISES, LTD.
                </div>
            </div>

            {/* RETRO ARCADE MOBILE TOUCH CONTROLS */}
            <div style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '8px',
                width: '100%',
                maxWidth: '340px',
                marginTop: '4px'
            }}>
                {/* Upper Row: Left, Rotate, Right */}
                <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
                    <button
                        onClick={() => moveHorizontal('left')}
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
                            boxShadow: '0 4px 8px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.2)'
                        }}
                    >
                        ◀
                    </button>
                    <button
                        onClick={rotatePiece}
                        disabled={isGameOver}
                        style={{
                            flex: 1.4,
                            padding: '14px 0',
                            borderRadius: '12px',
                            background: 'linear-gradient(180deg, #8b5cf6 0%, #6d28d9 100%)',
                            border: '2px solid #a78bfa',
                            color: '#ffffff',
                            fontSize: '1rem',
                            fontWeight: '900',
                            cursor: 'pointer',
                            letterSpacing: '1px',
                            boxShadow: '0 4px 10px rgba(139, 92, 246, 0.4), inset 0 1px 0 rgba(255,255,255,0.3)'
                        }}
                    >
                        🔄 회전 (ROTATE)
                    </button>
                    <button
                        onClick={() => moveHorizontal('right')}
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
                            boxShadow: '0 4px 8px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.2)'
                        }}
                    >
                        ▶
                    </button>
                </div>

                {/* Lower Row: Soft Drop, Hard Drop */}
                <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
                    <button
                        onClick={() => moveDown(true)}
                        disabled={isGameOver}
                        style={{
                            flex: 1,
                            padding: '12px 0',
                            borderRadius: '12px',
                            background: 'linear-gradient(180deg, #475569 0%, #334155 100%)',
                            border: '2px solid #64748b',
                            color: '#f8fafc',
                            fontSize: '0.92rem',
                            fontWeight: '900',
                            cursor: 'pointer',
                            letterSpacing: '0.5px',
                            boxShadow: '0 4px 8px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.2)'
                        }}
                    >
                        ▼ 내리기 (DOWN)
                    </button>
                    <button
                        onClick={hardDrop}
                        disabled={isGameOver}
                        style={{
                            flex: 1.2,
                            padding: '12px 0',
                            borderRadius: '12px',
                            background: 'linear-gradient(180deg, #ef4444 0%, #b91c1c 100%)',
                            border: '2px solid #f87171',
                            color: '#ffffff',
                            fontSize: '0.92rem',
                            fontWeight: '900',
                            cursor: 'pointer',
                            letterSpacing: '1px',
                            boxShadow: '0 4px 10px rgba(239, 68, 68, 0.4), inset 0 1px 0 rgba(255,255,255,0.3)'
                        }}
                    >
                        ⚡ 즉시 하강 (DROP)
                    </button>
                </div>
            </div>
        </div>
    );
}
