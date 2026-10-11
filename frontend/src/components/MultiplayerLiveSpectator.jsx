import React, { useEffect, useState, useRef } from 'react';
import { Trophy, Crown, Sparkles, Zap, Flame, Shield, Users, Award, CheckCircle2, XCircle, Skull } from 'lucide-react';
import Confetti from 'react-confetti';
import { playSound } from '../utils/audio';
import { DEFAULT_CARD_THEMES } from '../data/cardThemes';

// Helper to get card back coordinate label (A1, A2, B1, B2...)
export function getCardCoordinate(idx, cols = 5) {
    const rowLetter = String.fromCharCode(65 + Math.floor(idx / cols));
    const colNum = (idx % cols) + 1;
    return `${rowLetter}${colNum}`;
}

// 1. Mini Card Match Board Spectator (Guaranteed 5x4 Grid, Auto-fit, Zero Scrolling)
function SpectatorCardMatchView({ gameData, activeTheme }) {
    // Immediate fallback deck so cards are ALWAYS displayed right away without delay
    const defaultCards = DEFAULT_CARD_THEMES[0].items.slice(0, 10)
        .concat(DEFAULT_CARD_THEMES[0].items.slice(0, 10))
        .map((item, idx) => ({
            id: idx,
            name: item.name,
            image: item.image || null,
            emoji: item.emoji || '⭐'
        }));

    const cards = (gameData && Array.isArray(gameData.cards) && gameData.cards.length > 0)
        ? gameData.cards
        : defaultCards;

    const flipped = gameData?.flipped || [];
    const matched = gameData?.matched || [];
    const moves = gameData?.moves || 0;
    const cols = 5; // 5 columns x 4 rows = 20 cards

    return (
        <div style={{
            width: '100%',
            height: '100%',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '6px',
            overflow: 'hidden',
            boxSizing: 'border-box'
        }}>
            {/* Top Score & Progress Stats */}
            <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                width: '100%',
                maxWidth: '480px',
                fontSize: '0.82rem',
                color: '#64748b',
                fontWeight: '800',
                padding: '0 4px',
                boxSizing: 'border-box'
            }}>
                <span>🎯 시도: <strong style={{ color: '#2563eb' }}>{moves}회</strong></span>
                <span>🧩 매칭: <strong style={{ color: '#16a34a' }}>{Math.floor(matched.length / 2)} / 10쌍</strong></span>
                <span>🏆 점수: <strong style={{ color: '#ea580c' }}>{Math.floor(matched.length / 2) * 10}점</strong></span>
            </div>

            {/* 20 Cards Grid: Explicit 5 cols x 4 rows, Aspect Ratio 5/4, Perfectly Centered */}
            <div style={{
                display: 'grid',
                gridTemplateColumns: `repeat(${cols}, 1fr)`,
                gridTemplateRows: 'repeat(4, 1fr)',
                gap: '5px',
                width: '100%',
                maxWidth: '440px',
                maxHeight: '320px',
                aspectRatio: '5 / 4',
                margin: '0 auto',
                boxSizing: 'border-box',
                flex: 1
            }}>
                {cards.map((c, idx) => {
                    const isOpen = flipped.includes(idx) || matched.includes(idx);
                    const isMatched = matched.includes(idx);
                    const cardCoord = getCardCoordinate(idx, cols);
                    const itemName = c.name || (c.flag ? c.flag.replace('.jpg', '') : '');

                    return (
                        <div
                            key={idx}
                            style={{
                                width: '100%',
                                height: '100%',
                                borderRadius: '8px',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                position: 'relative',
                                overflow: 'hidden',
                                background: isMatched
                                    ? '#ecfdf5'
                                    : isOpen
                                        ? '#ffffff'
                                        : 'linear-gradient(135deg, #1e3a8a 0%, #2563eb 100%)',
                                color: isMatched ? '#16a34a' : (isOpen ? '#1e293b' : '#ffffff'),
                                border: isMatched ? '2px solid #10b981' : (isOpen ? '2px solid #93c5fd' : '1.5px solid #1d4ed8'),
                                boxShadow: isMatched
                                    ? '0 0 8px rgba(16, 185, 129, 0.35)'
                                    : (isOpen ? '0 2px 6px rgba(0,0,0,0.06)' : '0 2px 5px rgba(0,0,0,0.15)'),
                                transition: 'all 0.2s cubic-bezier(0.34, 1.56, 0.64, 1)',
                                boxSizing: 'border-box'
                            }}
                        >
                            {isOpen ? (
                                <div style={{
                                    display: 'flex',
                                    flexDirection: 'column',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    width: '100%',
                                    height: '100%',
                                    padding: '2px',
                                    textAlign: 'center',
                                    boxSizing: 'border-box'
                                }}>
                                    {c.image ? (
                                        <img
                                            src={c.image.startsWith('/') || c.image.startsWith('data:') ? c.image : `/flag/${c.image}`}
                                            alt={itemName}
                                            style={{ width: '85%', height: '54%', objectFit: 'cover', borderRadius: '3px' }}
                                        />
                                    ) : (
                                        <span style={{ fontSize: 'clamp(1rem, 2.2vw, 1.5rem)', lineHeight: 1 }}>
                                            {c.emoji || '⭐'}
                                        </span>
                                    )}
                                    <span style={{
                                        fontSize: 'clamp(0.58rem, 1vw, 0.72rem)',
                                        fontWeight: '900',
                                        color: isMatched ? '#059669' : '#0f172a',
                                        marginTop: '1px',
                                        overflow: 'hidden',
                                        textOverflow: 'ellipsis',
                                        whiteSpace: 'nowrap',
                                        maxWidth: '100%'
                                    }}>
                                        {itemName}
                                    </span>
                                </div>
                            ) : (
                                /* Card Back: A1, A2, B1, B2... Coordinate format */
                                <span style={{
                                    color: '#ffffff',
                                    fontWeight: '950',
                                    fontSize: 'clamp(0.85rem, 1.8vw, 1.25rem)',
                                    letterSpacing: '0.5px',
                                    textShadow: '0 2px 4px rgba(0,0,0,0.4)',
                                    fontFamily: 'system-ui, -apple-system, sans-serif'
                                }}>
                                    {cardCoord}
                                </span>
                            )}
                        </div>
                    );
                })}
            </div>
        </div>
    );
}

// 2. Mini Tetris Board Spectator
function SpectatorTetrisView({ gameData }) {
    const grid = gameData?.grid || Array(200).fill(null); // 10 cols x 20 rows (200 cells)
    const lines = gameData?.lines || 0;
    const score = gameData?.score || 0;
    const round = gameData?.round || 1;

    return (
        <div style={{ width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', fontSize: '0.76rem', color: '#64748b', fontWeight: '800' }}>
                <span>🏆 <strong style={{ color: '#0284c7' }}>{score.toLocaleString()}점</strong></span>
                <span>⚡ <strong style={{ color: '#d97706' }}>ROUND {round}</strong></span>
                <span>🧱 <strong style={{ color: '#16a34a' }}>{lines}줄</strong></span>
            </div>

            <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(10, 1fr)',
                gap: '1px',
                background: '#040711',
                padding: '4px',
                borderRadius: '8px',
                border: '2px solid #334155',
                width: '100%',
                maxWidth: '200px',
                aspectRatio: '10/20',
                boxShadow: '0 4px 12px rgba(0,0,0,0.5)'
            }}>
                {grid.map((cell, idx) => {
                    const isFilled = !!cell;
                    return (
                        <div
                            key={idx}
                            style={{
                                borderRadius: '1.5px',
                                background: isFilled ? (typeof cell === 'string' && cell.startsWith('#') ? cell : '#38bdf8') : 'rgba(255,255,255,0.02)',
                                borderTop: isFilled ? '1.5px solid rgba(255,255,255,0.7)' : 'none',
                                borderLeft: isFilled ? '1.5px solid rgba(255,255,255,0.4)' : 'none',
                                borderRight: isFilled ? '1.5px solid rgba(0,0,0,0.6)' : 'none',
                                borderBottom: isFilled ? '1.5px solid rgba(0,0,0,0.8)' : 'none',
                                boxShadow: isFilled ? 'inset 1px 1px 1px rgba(255,255,255,0.3)' : 'none'
                            }}
                        />
                    );
                })}
            </div>
        </div>
    );
}

// 3. Mini Brick Breaker Spectator (Arkanoid Vaus)
function SpectatorBrickBreakerView({ gameData }) {
    const paddlePos = gameData?.paddlePos ?? 50;
    const score = gameData?.score || 0;
    const round = gameData?.round || 1;
    const lives = gameData?.lives ?? 3;

    return (
        <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.74rem', color: '#64748b', fontWeight: '800' }}>
                <span>🏆 <strong style={{ color: '#0284c7' }}>{score.toLocaleString()}점</strong></span>
                <span>⚡ <strong style={{ color: '#d97706' }}>ROUND {round}</strong></span>
                <span>🚀 <strong style={{ color: '#ef4444' }}>{lives}L</strong></span>
            </div>
            <div style={{ position: 'relative', width: '100%', height: '180px', background: '#060913', borderRadius: '10px', border: '2px solid #334155', overflow: 'hidden', boxShadow: '0 4px 12px rgba(0,0,0,0.5)' }}>
                {/* 3D Arkanoid Brick Wall */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(8, 1fr)', gap: '3px', padding: '10px 8px 0 8px' }}>
                    {['#cbd5e1', '#ef4444', '#eab308', '#3b82f6', '#10b981'].flatMap((color, rowIdx) =>
                        Array.from({ length: 8 }).map((_, colIdx) => (
                            <div
                                key={`${rowIdx}-${colIdx}`}
                                style={{
                                    height: '9px',
                                    background: color,
                                    borderRadius: '1.5px',
                                    borderTop: '1px solid rgba(255,255,255,0.7)',
                                    borderLeft: '1px solid rgba(255,255,255,0.4)',
                                    borderRight: '1px solid rgba(0,0,0,0.5)',
                                    borderBottom: '1px solid rgba(0,0,0,0.7)',
                                    boxShadow: 'inset 0 0 2px rgba(255,255,255,0.3)'
                                }}
                            />
                        ))
                    )}
                </div>

                {/* Vaus Metallic Paddle */}
                <div style={{
                    position: 'absolute',
                    bottom: '12px',
                    left: `${paddlePos}%`,
                    transform: 'translateX(-50%)',
                    width: '50px',
                    height: '10px',
                    background: '#cbd5e1',
                    borderRadius: '5px',
                    border: '1.5px solid #94a3b8',
                    boxShadow: '0 0 10px rgba(56, 189, 248, 0.6)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                }}>
                    <div style={{ width: '12px', height: '4px', background: '#38bdf8', borderRadius: '1px' }} />
                </div>
            </div>
        </div>
    );
}

// 4. Mini Airplane Game (Xenon 2: Megablast) Spectator View
function SpectatorAirplaneView({ gameData }) {
    const shield = gameData?.shield !== undefined ? gameData.shield : 100;
    const bombs = gameData?.bombs !== undefined ? gameData.bombs : 3;
    const lives = gameData?.lives !== undefined ? gameData.lives : 3;
    const stage = gameData?.stage || 'SECTOR 1';
    const score = gameData?.score || 0;

    return (
        <div style={{
            width: '100%',
            height: '100%',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: 'radial-gradient(circle at center, #0f172a 0%, #020617 100%)',
            borderRadius: '12px',
            padding: '12px',
            color: '#f8fafc',
            border: '1.5px solid #334155',
            boxSizing: 'border-box'
        }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', fontSize: '0.8rem', fontWeight: 'bold' }}>
                <span style={{ color: '#38bdf8' }}>🚀 {stage}</span>
                <span style={{ color: '#fbbf24' }}>🏆 {score.toLocaleString()}점</span>
            </div>

            {/* Fighter Plane Graphic */}
            <div style={{ position: 'relative', width: '80px', height: '90px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <div style={{ fontSize: '3.2rem', filter: 'drop-shadow(0 0 10px rgba(56, 189, 248, 0.6))', animation: 'levitate 1.5s ease-in-out infinite' }}>
                    🚀
                </div>
            </div>

            {/* Shield and Bombs */}
            <div style={{ width: '100%', maxWidth: '240px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.72rem', color: '#94a3b8', marginBottom: '3px' }}>
                    <span>🛡️ SHIELD {shield}%</span>
                    <span>💣 폭탄: {bombs}개</span>
                </div>
                <div style={{ width: '100%', height: '6px', background: '#334155', borderRadius: '3px', overflow: 'hidden' }}>
                    <div style={{ width: `${shield}%`, height: '100%', background: shield > 30 ? 'linear-gradient(90deg, #06b6d4, #3b82f6)' : '#ef4444' }} />
                </div>
            </div>
        </div>
    );
}

// 5. Mini Generic / Fallback Game Spectator
function SpectatorGenericView({ gameData, gameId }) {
    return (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '20px', background: '#f8fafc', borderRadius: '14px', border: '1px solid #e2e8f0', minHeight: '160px' }}>
            <span style={{ fontSize: '2.2rem', marginBottom: '6px', animation: 'bounce 1.5s infinite' }}>🎮</span>
            <div style={{ fontSize: '0.92rem', fontWeight: '900', color: '#1e293b' }}>
                실시간 게임 플레이 진행 중
            </div>
            {gameData?.score !== undefined && (
                <div style={{ marginTop: '6px', fontSize: '1.15rem', fontWeight: '900', color: '#2563eb' }}>
                    {gameData.score.toLocaleString()}점
                </div>
            )}
        </div>
    );
}

// Main Component: 1위, 2위, 3위 동적 분할 실시간 중계 화면
export default function MultiplayerLiveSpectator({
    gameId,
    participants = [],
    playerStreams = {},
    activeTheme = null,
    onEndGame,
    isHost = false
}) {
    const [lastWinnerAnnounced, setLastWinnerAnnounced] = useState(null);
    const [confettiActive, setConfettiActive] = useState(false);
    const hasTriggeredEndRef = useRef(false);

    // Merge participant roster with live stream updates
    const playerList = participants.map((p, idx) => {
        const stream = playerStreams[p.nickname] || {};
        const streamScore = typeof stream.score === 'number' 
            ? stream.score 
            : (stream.gameData?.matched?.length ? Math.floor(stream.gameData.matched.length / 2) * 10 : 0);
        const effectiveScore = Math.max(p.score || 0, streamScore);

        return {
            id: p.id || `p-${idx}`,
            nickname: p.nickname || `참여자 ${idx + 1}`,
            groupId: p.groupId,
            score: effectiveScore,
            isAlive: stream.isPractice ? false : (stream.isAlive !== undefined ? stream.isAlive : true),
            isFinished: stream.isPractice ? true : (stream.isFinished !== undefined ? stream.isFinished : false),
            gameData: stream.gameData || null,
            lastUpdated: stream.lastUpdated || Date.now()
        };
    });

    // If no participants registered yet, create placeholders from streams
    Object.entries(playerStreams).forEach(([nick, stream]) => {
        if (!playerList.some(p => p.nickname === nick)) {
            const streamScore = typeof stream.score === 'number' 
                ? stream.score 
                : (stream.gameData?.matched?.length ? Math.floor(stream.gameData.matched.length / 2) * 10 : 0);

            playerList.push({
                id: `stream-${nick}`,
                nickname: nick,
                groupId: stream.groupId,
                score: streamScore,
                isAlive: stream.isPractice ? false : (stream.isAlive !== undefined ? stream.isAlive : true),
                isFinished: stream.isPractice ? true : (stream.isFinished || false),
                gameData: stream.gameData || null,
                lastUpdated: stream.lastUpdated || Date.now()
            });
        }
    });

    // 1. Rank players by Score (Descending)
    const rankedPlayers = [...playerList].sort((a, b) => b.score - a.score);

    // 2. Filter Alive Players vs Dead/Eliminated Players
    const alivePlayers = rankedPlayers.filter(p => p.isAlive && !p.isFinished);
    const totalParticipantCount = rankedPlayers.length;

    // 3. Dynamic Screen Layout:
    // - 3+ alive: 3 screens (1st, 2nd, 3rd)
    // - 2 alive (3rd died or 2 participants): 2 screens (1st, 2nd)
    // - 1 alive (2nd died or 1 participant): 1 full screen (1st)
    let displayPlayers = [];
    if (alivePlayers.length >= 3) {
        displayPlayers = alivePlayers.slice(0, 3);
    } else if (alivePlayers.length === 2) {
        displayPlayers = alivePlayers.slice(0, 2);
    } else if (alivePlayers.length === 1) {
        displayPlayers = alivePlayers.slice(0, 1);
    } else if (rankedPlayers.length > 0) {
        // If all died/finished, display top 3 finished results
        displayPlayers = rankedPlayers.slice(0, 3);
    }

    // 4. Check automatic victory / game completion condition:
    // "2위가 죽으면 그 순간의 1위 점수로 게임이 끝나게 해줘."
    useEffect(() => {
        if (totalParticipantCount >= 2 && alivePlayers.length === 1 && !hasTriggeredEndRef.current) {
            const winner = alivePlayers[0];
            hasTriggeredEndRef.current = true;
            setLastWinnerAnnounced(winner);
            setConfettiActive(true);
            playSound('fanfare');
            console.log(`[Game Auto-Finish] 2nd player eliminated! 1st place (${winner.nickname}: ${winner.score}pts) wins!`);

            if (onEndGame) {
                setTimeout(() => {
                    onEndGame(winner);
                }, 2500);
            }
        }
    }, [alivePlayers.length, totalParticipantCount]);

    const rankBadges = [
        { rank: 1, title: '1위 👑', bg: 'linear-gradient(135deg, #fbbf24 0%, #d97706 100%)', border: '#f59e0b', ring: 'rgba(245, 158, 11, 0.4)' },
        { rank: 2, title: '2위 🥈', bg: 'linear-gradient(135deg, #94a3b8 0%, #475569 100%)', border: '#64748b', ring: 'rgba(100, 116, 139, 0.4)' },
        { rank: 3, title: '3위 🥉', bg: 'linear-gradient(135deg, #fdba74 0%, #c2410c 100%)', border: '#ea580c', ring: 'rgba(234, 88, 12, 0.4)' }
    ];

    const screenCount = Math.max(1, displayPlayers.length);

    return (
        <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', gap: '10px', position: 'relative', overflow: 'hidden' }}>
            {confettiActive && <Confetti recycle={false} numberOfPieces={350} gravity={0.2} />}

            {/* Top Game Stage Header & Live Broadcast Status */}
            <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
                padding: '8px 16px',
                borderRadius: '14px',
                border: '1.5px solid #334155',
                color: 'white',
                boxShadow: '0 4px 14px rgba(0,0,0,0.12)'
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <div style={{
                        width: '10px',
                        height: '10px',
                        borderRadius: '50%',
                        background: '#ef4444',
                        boxShadow: '0 0 8px #ef4444',
                        animation: 'pulse 1.2s infinite'
                    }} />
                    <span style={{ fontSize: '0.98rem', fontWeight: '900', letterSpacing: '0.5px' }}>
                        📡 실시간 온라인 중계 화면
                    </span>
                    <span style={{ fontSize: '0.78rem', background: '#3b82f6', padding: '2px 8px', borderRadius: '10px', fontWeight: '800' }}>
                        {screenCount === 3 ? '3분할 (1~3위)' : screenCount === 2 ? '2분할 (1·2위 결승전)' : '1분할 (최종 1위 단독)'}
                    </span>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.82rem', color: '#cbd5e1', fontWeight: '700' }}>
                    <Users size={15} color="#38bdf8" />
                    <span>생존: <strong style={{ color: '#4ade80' }}>{alivePlayers.length}명</strong> / 총 {totalParticipantCount}명</span>
                </div>
            </div>

            {/* 1위 최종 승리 안내 배너 (2위 탈락 시 발동) */}
            {lastWinnerAnnounced && (
                <div style={{
                    background: 'linear-gradient(135deg, #fef3c7 0%, #fde68a 100%)',
                    border: '2.5px solid #f59e0b',
                    borderRadius: '14px',
                    padding: '8px 16px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '10px',
                    color: '#92400e',
                    fontSize: '1.05rem',
                    fontWeight: '900',
                    boxShadow: '0 6px 20px rgba(245, 158, 11, 0.3)',
                    animation: 'popIn 0.3s ease-out'
                }}>
                    <Trophy size={22} color="#d97706" />
                    <span>🎉 2위 탈락! 1위 <strong>[{lastWinnerAnnounced.nickname}]</strong> ({lastWinnerAnnounced.score.toLocaleString()}점) 최종 우승!</span>
                </div>
            )}

            {/* Dynamic Grid: 3-Split, 2-Split, or 1-Split Layout */}
            <div style={{
                display: 'grid',
                gridTemplateColumns: screenCount === 1 ? '1fr' : `repeat(${screenCount}, 1fr)`,
                gap: '12px',
                flex: 1,
                width: '100%',
                alignItems: 'stretch',
                transition: 'all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)',
                overflow: 'hidden'
            }}>
                {displayPlayers.map((player, idx) => {
                    const badge = rankBadges[idx] || rankBadges[2];
                    const isAlive = player.isAlive && !player.isFinished;

                    return (
                        <div
                            key={player.id || player.nickname}
                            style={{
                                background: '#ffffff',
                                borderRadius: '16px',
                                border: `2px solid ${badge.border}`,
                                boxShadow: `0 6px 20px ${badge.ring}`,
                                display: 'flex',
                                flexDirection: 'column',
                                overflow: 'hidden',
                                transition: 'all 0.25s ease',
                                position: 'relative'
                            }}
                        >
                            {/* Card Top Rank Header */}
                            <div style={{
                                background: badge.bg,
                                padding: '8px 12px',
                                color: 'white',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between'
                            }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                    <span style={{ fontSize: '1.05rem', fontWeight: '950', textShadow: '0 1px 3px rgba(0,0,0,0.3)' }}>
                                        {badge.title}
                                    </span>
                                    <span style={{ fontSize: '0.98rem', fontWeight: '900' }}>
                                        {player.nickname}
                                    </span>
                                    {player.groupId && (
                                        <span style={{ fontSize: '0.72rem', background: 'rgba(0,0,0,0.25)', padding: '1px 6px', borderRadius: '6px', fontWeight: '800' }}>
                                            {player.groupId}조
                                        </span>
                                    )}
                                </div>

                                <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                    {isAlive ? (
                                        <span style={{ fontSize: '0.7rem', background: '#15803d', padding: '2px 7px', borderRadius: '8px', fontWeight: '900', display: 'flex', alignItems: 'center', gap: '3px' }}>
                                            <span style={{ width: '5px', height: '5px', borderRadius: '50%', background: '#4ade80' }} /> 생존
                                        </span>
                                    ) : (
                                        <span style={{ fontSize: '0.7rem', background: '#991b1b', padding: '2px 7px', borderRadius: '8px', fontWeight: '900', display: 'flex', alignItems: 'center', gap: '3px' }}>
                                            <Skull size={11} /> 탈락
                                        </span>
                                    )}
                                </div>
                            </div>

                            {/* Score Display Strip */}
                            <div style={{
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                padding: '6px 12px',
                                background: '#f8fafc',
                                borderBottom: '1px solid #e2e8f0'
                            }}>
                                <span style={{ fontSize: '0.78rem', color: '#64748b', fontWeight: '800' }}>실시간 누적 점수</span>
                                <span style={{ fontSize: '1.15rem', fontWeight: '950', color: '#0f172a' }}>
                                    {player.score.toLocaleString()}
                                    <span style={{ fontSize: '0.8rem', color: '#64748b', marginLeft: '2px' }}>점</span>
                                </span>
                            </div>

                            {/* Live Game Interactive Board Container */}
                            <div style={{
                                flex: 1,
                                padding: '8px 12px',
                                display: 'flex',
                                flexDirection: 'column',
                                alignItems: 'center',
                                justifyContent: 'center',
                                background: '#ffffff',
                                overflow: 'hidden'
                            }}>
                                {gameId === 'card_match' ? (
                                    <SpectatorCardMatchView gameData={player.gameData} activeTheme={activeTheme} />
                                ) : gameId === 'tetris' ? (
                                    <SpectatorTetrisView gameData={player.gameData} />
                                ) : gameId === 'brick_breaker' ? (
                                    <SpectatorBrickBreakerView gameData={player.gameData} />
                                ) : (gameId === 'timeattack' || gameId === 'airplane_game') ? (
                                    <SpectatorAirplaneView gameData={player.gameData} />
                                ) : (
                                    <SpectatorGenericView gameData={player.gameData} gameId={gameId} />
                                )}
                            </div>
                        </div>
                    );
                })}

                {/* If 0 players active */}
                {displayPlayers.length === 0 && (
                    <div style={{
                        gridColumn: '1 / -1',
                        padding: '2.5rem',
                        background: '#ffffff',
                        borderRadius: '16px',
                        border: '2px dashed #cbd5e1',
                        textAlign: 'center',
                        color: '#64748b'
                    }}>
                        <span style={{ fontSize: '2.5rem', display: 'block', marginBottom: '8px' }}>📱</span>
                        <h3 style={{ margin: '0 0 4px 0', color: '#1e293b', fontSize: '1.1rem' }}>참여자의 플레이를 기다리는 중입니다</h3>
                        <p style={{ margin: 0, fontSize: '0.88rem' }}>모바일 화면에서 게임을 시작하면 상위 1~3위 플레이어의 실시간 화면이 여기에 중계됩니다.</p>
                    </div>
                )}
            </div>
        </div>
    );
}
