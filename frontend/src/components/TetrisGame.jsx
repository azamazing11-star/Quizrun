import React, { useState, useEffect, useRef, useCallback } from 'react';
import { RotateCcw, ArrowLeft, ArrowRight, ArrowDown, ChevronDown, RefreshCw, Trophy, Skull } from 'lucide-react';
import { playSound } from '../utils/audio';

const COLS = 10;
const ROWS = 18;

const TETROMINOES = {
    I: { shape: [[1, 1, 1, 1]], color: '#06b6d4' },
    O: { shape: [[1, 1], [1, 1]], color: '#eab308' },
    T: { shape: [[0, 1, 0], [1, 1, 1]], color: '#a855f7' },
    S: { shape: [[0, 1, 1], [1, 1, 0]], color: '#22c55e' },
    Z: { shape: [[1, 1, 0], [0, 1, 1]], color: '#ef4444' },
    J: { shape: [[1, 0, 0], [1, 1, 1]], color: '#3b82f6' },
    L: { shape: [[0, 0, 1], [1, 1, 1]], color: '#f97316' }
};

const SHAPES = ['I', 'O', 'T', 'S', 'Z', 'J', 'L'];

function createEmptyGrid() {
    return Array.from({ length: ROWS }, () => Array(COLS).fill(null));
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
    const [score, setScore] = useState(0);
    const [lines, setLines] = useState(0);
    const [isGameOver, setIsGameOver] = useState(false);
    const [isPaused, setIsPaused] = useState(false);
    const [isPracticeMode, setIsPracticeMode] = useState(false);

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
    const isGameOverRef = useRef(isGameOver);
    isGameOverRef.current = isGameOver;

    // Stream participant game progress to Host & Spectator
    const notifyPlayerStream = useCallback((curGrid, curPiece, curScore, curLines, gameOver, forcePractice = false) => {
        if (!socket || !pin) return;
        const inPractice = forcePractice || isPracticeMode || hasOfficiallyFinishedRef.current;

        // Render combined grid for spectator
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

        if (inPractice) {
            // Practice mode: official score remains locked!
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
                    gameData: {
                        grid: flatCombined,
                        score: curScore,
                        lines: curLines,
                        isGameOver: gameOver,
                        isPractice: true
                    }
                }
            });
        } else {
            // Official round:
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
                    gameData: {
                        grid: flatCombined,
                        score: curScore,
                        lines: curLines,
                        isGameOver: gameOver,
                        isPractice: false
                    }
                }
            });
        }
    }, [socket, pin, nickname, groupId, isPracticeMode]);

    // Check collision
    const checkCollision = (piece, testGrid, offsetX = 0, offsetY = 0) => {
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

    // Spawn new tetromino
    const spawnPiece = useCallback(() => {
        const randomShapeKey = SHAPES[Math.floor(Math.random() * SHAPES.length)];
        const proto = TETROMINOES[randomShapeKey];
        const newPiece = {
            shape: proto.shape,
            color: proto.color,
            x: Math.floor((COLS - proto.shape[0].length) / 2),
            y: 0
        };

        if (checkCollision(newPiece, gridRef.current)) {
            setIsGameOver(true);
            playSound('wrong');
            if (!isPracticeMode && !hasOfficiallyFinishedRef.current) {
                hasOfficiallyFinishedRef.current = true;
                officialLockedTotalScoreRef.current = officialBaseScoreRef.current + score;
            }
            notifyPlayerStream(gridRef.current, null, score, lines, true);
            return null;
        }

        setCurrentPiece(newPiece);
        return newPiece;
    }, [score, lines, notifyPlayerStream, isPracticeMode]);

    // Initialize Game
    const restartGame = useCallback((isManualRestart = false) => {
        if (isManualRestart || hasOfficiallyFinishedRef.current) {
            setIsPracticeMode(true);
        }

        const empty = createEmptyGrid();
        setGrid(empty);
        setScore(0);
        setLines(0);
        setIsGameOver(false);
        setIsPaused(false);

        const initialPieceKey = SHAPES[Math.floor(Math.random() * SHAPES.length)];
        const proto = TETROMINOES[initialPieceKey];
        const firstPiece = {
            shape: proto.shape,
            color: proto.color,
            x: Math.floor((COLS - proto.shape[0].length) / 2),
            y: 0
        };
        setCurrentPiece(firstPiece);
        notifyPlayerStream(empty, firstPiece, 0, 0, false, (isManualRestart || hasOfficiallyFinishedRef.current));
    }, [notifyPlayerStream]);

    useEffect(() => {
        restartGame();
    }, []);

    // Merge piece into board and clear rows
    const lockPieceAndClearRows = useCallback((piece) => {
        const newGrid = gridRef.current.map(row => [...row]);
        const { shape, color, x, y } = piece;

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

        // Check for full rows
        let cleared = 0;
        const remainingRows = [];
        for (let r = 0; r < ROWS; r++) {
            const isFull = newGrid[r].every(cell => cell !== null);
            if (!isFull) {
                remainingRows.push(newGrid[r]);
            } else {
                cleared++;
            }
        }

        const emptyRowsToAdd = Array.from({ length: cleared }, () => Array(COLS).fill(null));
        const finalGrid = [...emptyRowsToAdd, ...remainingRows];

        let addedScore = 10;
        if (cleared === 1) addedScore += 100;
        else if (cleared === 2) addedScore += 300;
        else if (cleared === 3) addedScore += 500;
        else if (cleared >= 4) addedScore += 800;

        if (cleared > 0) {
            playSound('correct');
        }

        const nextScore = score + addedScore;
        const nextLines = lines + cleared;

        setGrid(finalGrid);
        setScore(nextScore);
        setLines(nextLines);

        // Spawn next
        const nextPiece = spawnPiece();
        notifyPlayerStream(finalGrid, nextPiece, nextScore, nextLines, isGameOverRef.current);
    }, [score, lines, spawnPiece, notifyPlayerStream]);

    // Move Piece Down (Tick)
    const moveDown = useCallback(() => {
        if (!currentPieceRef.current || isGameOverRef.current) return;

        if (!checkCollision(currentPieceRef.current, gridRef.current, 0, 1)) {
            const moved = {
                ...currentPieceRef.current,
                y: currentPieceRef.current.y + 1
            };
            setCurrentPiece(moved);
            notifyPlayerStream(gridRef.current, moved, score, lines, false);
        } else {
            lockPieceAndClearRows(currentPieceRef.current);
        }
    }, [lockPieceAndClearRows, score, lines, notifyPlayerStream]);

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
            playSound('submit');
            notifyPlayerStream(gridRef.current, moved, score, lines, false);
        }
    }, [score, lines, notifyPlayerStream]);

    // Rotate Piece
    const rotatePiece = useCallback(() => {
        if (!currentPieceRef.current || isGameOverRef.current) return;
        const { shape } = currentPieceRef.current;
        // Matrix transpose and reverse rows for 90deg clockwise rotation
        const rotated = shape[0].map((_, index) => shape.map(row => row[index]).reverse());
        const candidate = {
            ...currentPieceRef.current,
            shape: rotated
        };

        if (!checkCollision(candidate, gridRef.current, 0, 0)) {
            setCurrentPiece(candidate);
            playSound('submit');
            notifyPlayerStream(gridRef.current, candidate, score, lines, false);
        } else if (!checkCollision(candidate, gridRef.current, -1, 0)) {
            // Wall kick left
            const kicked = { ...candidate, x: candidate.x - 1 };
            setCurrentPiece(kicked);
            notifyPlayerStream(gridRef.current, kicked, score, lines, false);
        } else if (!checkCollision(candidate, gridRef.current, 1, 0)) {
            // Wall kick right
            const kicked = { ...candidate, x: candidate.x + 1 };
            setCurrentPiece(kicked);
            notifyPlayerStream(gridRef.current, kicked, score, lines, false);
        }
    }, [score, lines, notifyPlayerStream]);

    // Hard Drop
    const hardDrop = useCallback(() => {
        if (!currentPieceRef.current || isGameOverRef.current) return;
        let dropY = 0;
        while (!checkCollision(currentPieceRef.current, gridRef.current, 0, dropY + 1)) {
            dropY++;
        }
        const droppedPiece = {
            ...currentPieceRef.current,
            y: currentPieceRef.current.y + dropY
        };
        playSound('reveal');
        lockPieceAndClearRows(droppedPiece);
    }, [lockPieceAndClearRows]);

    // Game loop tick interval
    useEffect(() => {
        if (isGameOver || isPaused) return;
        const speed = Math.max(250, 700 - Math.floor(lines / 5) * 50);
        const interval = setInterval(() => {
            moveDown();
        }, speed);
        return () => clearInterval(interval);
    }, [isGameOver, isPaused, lines, moveDown]);

    // Keyboard controls
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
                moveDown();
            } else if (e.key === 'ArrowUp' || e.key === 'z' || e.key === 'x') {
                e.preventDefault();
                rotatePiece();
            } else if (e.key === ' ') {
                e.preventDefault();
                hardDrop();
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isGameOver, moveHorizontal, moveDown, rotatePiece, hardDrop]);

    // Combined rendering of static grid + active piece
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

    return (
        <div style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '12px',
            width: '100%',
            maxWidth: isHost ? '500px' : '100%',
            margin: '0 auto',
            padding: '4px'
        }}>
            {/* PRACTICE MODE NOTICE FOR EARLY FINISHERS */}
            {isPracticeMode && (
                <div style={{
                    background: 'linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%)',
                    border: '2px solid #3b82f6',
                    borderRadius: '12px',
                    padding: '8px 12px',
                    textAlign: 'center',
                    boxShadow: '0 4px 12px rgba(59, 130, 246, 0.15)',
                    width: '100%',
                    boxSizing: 'border-box'
                }}>
                    <div style={{ color: '#1e40af', fontWeight: '900', fontSize: '0.92rem' }}>
                        🎮 게임만 진행하고 점수 합산은 되지 않습니다
                    </div>
                    <div style={{ color: '#2563eb', fontSize: '0.74rem', marginTop: '2px', fontWeight: '700' }}>
                        다른 유저들이 플레이 중입니다 (내 공식 점수: {officialLockedTotalScoreRef.current !== null ? officialLockedTotalScoreRef.current.toLocaleString() : (officialBaseScoreRef.current + score).toLocaleString()}점 안전 보존)
                    </div>
                </div>
            )}

            {/* Top Score Bar */}
            <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                width: '100%',
                padding: '10px 16px',
                background: '#0f172a',
                borderRadius: '14px',
                border: '1.5px solid #1e293b',
                color: 'white',
                fontWeight: '900',
                fontSize: isHost ? '1rem' : '0.86rem'
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Trophy size={16} color="#fbbf24" />
                    <span>점수: <strong style={{ color: '#38bdf8' }}>{score.toLocaleString()}점</strong></span>
                </div>
                <div>
                    <span>줄: <strong style={{ color: '#4ade80' }}>{lines}줄</strong></span>
                </div>
            </div>

            {/* Tetris Board */}
            <div style={{
                position: 'relative',
                display: 'grid',
                gridTemplateColumns: `repeat(${COLS}, 1fr)`,
                gap: '2px',
                background: '#090d16',
                padding: '8px',
                borderRadius: '14px',
                border: '3px solid #1e293b',
                width: isHost ? '240px' : '220px',
                aspectRatio: `${COLS}/${ROWS}`,
                boxShadow: '0 8px 25px rgba(0,0,0,0.4)'
            }}>
                {displayGrid.flatMap((row, rIdx) =>
                    row.map((cellColor, cIdx) => (
                        <div
                            key={`${rIdx}-${cIdx}`}
                            style={{
                                borderRadius: '3px',
                                background: cellColor || 'rgba(255,255,255,0.03)',
                                border: cellColor ? '1.5px solid rgba(255,255,255,0.3)' : 'none',
                                boxShadow: cellColor ? `inset 0 0 6px rgba(255,255,255,0.5), 0 0 4px ${cellColor}` : 'none'
                            }}
                        />
                    ))
                )}

                {/* Game Over Overlay */}
                {isGameOver && (
                    <div style={{
                        position: 'absolute',
                        top: 0, left: 0, right: 0, bottom: 0,
                        background: 'rgba(15, 23, 42, 0.92)',
                        backdropFilter: 'blur(3px)',
                        borderRadius: '12px',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '10px',
                        color: 'white',
                        padding: '16px',
                        textAlign: 'center'
                    }}>
                        <Skull size={36} color="#ef4444" />
                        <h2 style={{ margin: 0, color: '#f87171', fontSize: '1.4rem', fontWeight: '950' }}>GAME OVER</h2>
                        <p style={{ margin: 0, fontSize: '0.9rem', color: '#cbd5e1' }}>최종 점수: {score.toLocaleString()}점</p>
                        <button
                            onClick={() => restartGame(true)}
                            style={{
                                marginTop: '8px',
                                background: '#3b82f6',
                                color: 'white',
                                border: 'none',
                                padding: '8px 18px',
                                borderRadius: '10px',
                                fontWeight: '900',
                                cursor: 'pointer'
                            }}
                        >
                            <RotateCcw size={14} style={{ display: 'inline', marginRight: '4px' }} /> 다시 도전
                        </button>
                    </div>
                )}
            </div>

            {/* Mobile Touch Controls */}
            <div style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '8px',
                width: '100%',
                maxWidth: '300px',
                marginTop: '4px'
            }}>
                {/* Upper control row: Left, Rotate, Right */}
                <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
                    <button
                        onClick={() => moveHorizontal('left')}
                        disabled={isGameOver}
                        style={{ flex: 1, padding: '12px 0', borderRadius: '12px', background: '#1e293b', border: '1.5px solid #334155', color: 'white', fontSize: '1.2rem', fontWeight: 'bold', cursor: 'pointer' }}
                    >
                        ◀
                    </button>
                    <button
                        onClick={rotatePiece}
                        disabled={isGameOver}
                        style={{ flex: 1.3, padding: '12px 0', borderRadius: '12px', background: '#8b5cf6', border: 'none', color: 'white', fontSize: '0.95rem', fontWeight: '900', cursor: 'pointer' }}
                    >
                        🔄 회전
                    </button>
                    <button
                        onClick={() => moveHorizontal('right')}
                        disabled={isGameOver}
                        style={{ flex: 1, padding: '12px 0', borderRadius: '12px', background: '#1e293b', border: '1.5px solid #334155', color: 'white', fontSize: '1.2rem', fontWeight: 'bold', cursor: 'pointer' }}
                    >
                        ▶
                    </button>
                </div>

                {/* Lower control row: Soft Drop, Hard Drop */}
                <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
                    <button
                        onClick={moveDown}
                        disabled={isGameOver}
                        style={{ flex: 1, padding: '12px 0', borderRadius: '12px', background: '#334155', border: 'none', color: 'white', fontSize: '0.9rem', fontWeight: '800', cursor: 'pointer' }}
                    >
                        ▼ 내리기
                    </button>
                    <button
                        onClick={hardDrop}
                        disabled={isGameOver}
                        style={{ flex: 1, padding: '12px 0', borderRadius: '12px', background: '#ef4444', border: 'none', color: 'white', fontSize: '0.9rem', fontWeight: '900', cursor: 'pointer' }}
                    >
                        ⏬ 즉시 하강
                    </button>
                </div>
            </div>
        </div>
    );
}
