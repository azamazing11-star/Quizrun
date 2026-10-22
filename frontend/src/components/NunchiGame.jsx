import React, { useState, useEffect, useRef } from 'react';
import { playSound } from '../utils/audio';
import Confetti from 'react-confetti';
import { Eye, Play, RotateCcw, Trophy, AlertTriangle, Zap, CheckCircle2, Users } from 'lucide-react';

export default function NunchiGame({ socket, pin, isHost = true, participants = [], nickname = '', myScore = 0, onScoreUpdate }) {
    const [currentNumber, setCurrentNumber] = useState(1);
    const [targetNumber, setTargetNumber] = useState(() => Math.max(participants.length || 5, 5));
    const [gameState, setGameState] = useState('waiting'); // 'waiting' | 'playing' | 'round_end'
    const [shouts, setShouts] = useState([]);
    const [collision, setCollision] = useState(null);
    const [hasShouted, setHasShouted] = useState(false);
    const [myShoutNumber, setMyShoutNumber] = useState(null);
    const [confettiActive, setConfettiActive] = useState(false);
    const [winner, setWinner] = useState(null);

    // Channel for Host <-> SubScreen sync
    useEffect(() => {
        let bc;
        try {
            bc = new BroadcastChannel('quizrun_nunchi_sync');
            bc.onmessage = (e) => {
                const { type, payload } = e.data || {};
                if (type === 'STATE_UPDATE' && payload) {
                    if (payload.currentNumber !== undefined) setCurrentNumber(payload.currentNumber);
                    if (payload.targetNumber !== undefined) setTargetNumber(payload.targetNumber);
                    if (payload.gameState !== undefined) setGameState(payload.gameState);
                    if (payload.shouts !== undefined) setShouts(payload.shouts);
                    if (payload.collision !== undefined) setCollision(payload.collision);
                    if (payload.winner !== undefined) setWinner(payload.winner);
                }
            };
        } catch (e) {}
        return () => {
            if (bc) try { bc.close(); } catch (e) {}
        };
    }, []);

    // Broadcast helper
    const broadcastState = (updates) => {
        try {
            const bc = new BroadcastChannel('quizrun_nunchi_sync');
            bc.postMessage({ type: 'STATE_UPDATE', payload: updates });
            setTimeout(() => bc.close(), 200);
        } catch (e) {}
        if (socket && pin) {
            socket.emit('room:message', {
                pin,
                event: 'nunchi:state_sync',
                payload: updates
            });
        }
    };

    // Socket message listener for online multiplayer
    useEffect(() => {
        if (!socket) return;

        const handleShout = (data) => {
            if (!isHost) return;
            const { nickname: shouterName, number, timestamp } = data;
            
            setShouts(prev => {
                // Check collision: if another shout happened for the same number within 750ms
                const recentSame = prev.filter(s => s.number === number && Math.abs(s.timestamp - timestamp) < 750);
                if (recentSame.length > 0) {
                    const collidedNames = [recentSame[0].nickname, shouterName];
                    const collObj = { names: collidedNames, number };
                    setCollision(collObj);
                    playSound('buzzer');
                    broadcastState({ collision: collObj });
                    return [...prev, { nickname: shouterName, number, timestamp, collided: true }];
                }

                // Valid shout!
                playSound('correct');
                const nextNum = number + 1;
                setCurrentNumber(nextNum);
                const newShouts = [...prev, { nickname: shouterName, number, timestamp, collided: false }];
                
                // Check if reached target
                if (number >= targetNumber) {
                    setGameState('round_end');
                    setWinner(shouterName);
                    playSound('fanfare');
                    setConfettiActive(true);
                    broadcastState({ shouts: newShouts, currentNumber: nextNum, gameState: 'round_end', winner: shouterName });
                } else {
                    broadcastState({ shouts: newShouts, currentNumber: nextNum });
                }

                // Award +10 points to shouter via socket
                if (pin) {
                    socket.emit('host:adjustScore', { pin, nickname: shouterName, amount: 10 });
                }

                return newShouts;
            });
        };

        const handleStateSync = (data) => {
            if (isHost) return;
            if (data.currentNumber !== undefined) setCurrentNumber(data.currentNumber);
            if (data.targetNumber !== undefined) setTargetNumber(data.targetNumber);
            if (data.gameState !== undefined) {
                setGameState(data.gameState);
                if (data.gameState === 'playing' && gameState !== 'playing') {
                    setHasShouted(false);
                    setMyShoutNumber(null);
                    setCollision(null);
                }
            }
            if (data.shouts !== undefined) setShouts(data.shouts);
            if (data.collision !== undefined) {
                setCollision(data.collision);
                playSound('buzzer');
            }
            if (data.winner !== undefined) {
                setWinner(data.winner);
                if (data.winner) {
                    playSound('fanfare');
                    setConfettiActive(true);
                }
            }
        };

        socket.on('nunchi:shout', handleShout);
        socket.on('nunchi:state_sync', handleStateSync);

        return () => {
            socket.off('nunchi:shout', handleShout);
            socket.off('nunchi:state_sync', handleStateSync);
        };
    }, [isHost, socket, pin, targetNumber, gameState]);

    // Host: Start / Restart game
    const handleStartGame = () => {
        const target = Math.max(participants.length || 5, 3);
        setTargetNumber(target);
        setCurrentNumber(1);
        setShouts([]);
        setCollision(null);
        setWinner(null);
        setGameState('playing');
        setConfettiActive(false);
        playSound('countdown');
        broadcastState({
            currentNumber: 1,
            targetNumber: target,
            gameState: 'playing',
            shouts: [],
            collision: null,
            winner: null
        });
    };

    // Participant or Host Solo: Shout action
    const handleShoutAction = () => {
        if (gameState !== 'playing' || hasShouted) return;

        setHasShouted(true);
        setMyShoutNumber(currentNumber);

        if (socket && pin && !isHost) {
            socket.emit('room:message', {
                pin,
                event: 'nunchi:shout',
                payload: {
                    nickname: nickname || '참여자',
                    number: currentNumber,
                    timestamp: Date.now()
                }
            });
        } else {
            // Solo Host mode
            playSound('correct');
            const next = currentNumber + 1;
            const newShouts = [...shouts, { nickname: nickname || '진행자', number: currentNumber, timestamp: Date.now() }];
            setShouts(newShouts);
            setCurrentNumber(next);
            if (currentNumber >= targetNumber) {
                setGameState('round_end');
                setWinner(nickname || '진행자');
                playSound('fanfare');
                setConfettiActive(true);
            }
        }
    };

    // --- PARTICIPANT (MOBILE) VIEW ---
    if (!isHost) {
        return (
            <div style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                padding: '1.5rem',
                textAlign: 'center',
                maxWidth: '480px',
                margin: '0 auto',
                gap: '1.2rem'
            }}>
                {confettiActive && <Confetti recycle={false} numberOfPieces={300} />}

                <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    color: '#d97706',
                    fontSize: '1.4rem',
                    fontWeight: '900',
                    fontFamily: 'Jua, sans-serif'
                }}>
                    <Eye size={28} /> 눈치 게임!
                </div>

                {gameState === 'waiting' && (
                    <div className="glass-panel" style={{ padding: '2rem 1.5rem', width: '100%', borderRadius: '20px', background: '#fef3c7', border: '2px solid #fde68a' }}>
                        <div style={{ fontSize: '3rem', marginBottom: '0.8rem' }}>👀</div>
                        <h3 style={{ margin: '0 0 0.5rem', fontSize: '1.3rem', color: '#92400e', fontWeight: '900' }}>
                            진행자의 시작을 기다리는 중...
                        </h3>
                        <p style={{ margin: 0, color: '#b45309', fontSize: '0.95rem' }}>
                            게임이 시작되면 다른 사람과 겹치지 않게 순서대로 번호를 외치세요!
                        </p>
                    </div>
                )}

                {gameState === 'playing' && (
                    <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '1.2rem' }}>
                        <div className="glass-panel" style={{ padding: '1.2rem', borderRadius: '20px', background: 'white', border: '2px solid #fed7aa', boxShadow: '0 4px 15px rgba(249,115,22,0.1)' }}>
                            <div style={{ color: '#ea580c', fontWeight: 'bold', fontSize: '0.95rem', marginBottom: '4px' }}>
                                지금 외쳐야 할 번호
                            </div>
                            <div style={{ fontSize: '4.5rem', fontWeight: '900', fontFamily: 'Jua, sans-serif', color: '#ea580c', lineHeight: 1 }}>
                                {currentNumber}
                            </div>
                            <div style={{ fontSize: '0.85rem', color: '#94a3b8', marginTop: '6px' }}>
                                목표: {targetNumber}까지 외치기
                            </div>
                        </div>

                        {collision && (
                            <div style={{
                                padding: '12px',
                                background: '#fee2e2',
                                border: '2px solid #f87171',
                                borderRadius: '16px',
                                color: '#b91c1c',
                                fontWeight: '900',
                                fontSize: '1rem',
                                animation: 'bounce 0.5s'
                            }}>
                                💥 {collision.names.join('님과 ')}님이 {collision.number}번에서 동시 충돌 탈락!
                            </div>
                        )}

                        {!hasShouted ? (
                            <button
                                onClick={handleShoutAction}
                                style={{
                                    width: '100%',
                                    padding: '24px',
                                    borderRadius: '24px',
                                    border: 'none',
                                    background: 'linear-gradient(135deg, #f59e0b 0%, #ea580c 100%)',
                                    color: 'white',
                                    fontWeight: '900',
                                    fontSize: '1.6rem',
                                    fontFamily: 'Jua, sans-serif',
                                    cursor: 'pointer',
                                    boxShadow: '0 10px 25px rgba(234, 88, 12, 0.4)',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    alignItems: 'center',
                                    gap: '6px',
                                    transition: 'transform 0.1s active'
                                }}
                                onTouchStart={(e) => e.currentTarget.style.transform = 'scale(0.96)'}
                                onTouchEnd={(e) => e.currentTarget.style.transform = 'scale(1)'}
                            >
                                <span>📢 {currentNumber} 외치기!</span>
                                <span style={{ fontSize: '0.88rem', fontWeight: 'normal', opacity: 0.9 }}>
                                    눈치껏 재빠르게 터치하세요 (+10점)
                                </span>
                            </button>
                        ) : (
                            <div style={{
                                padding: '1.5rem',
                                borderRadius: '20px',
                                background: '#ecfdf5',
                                border: '2px solid #10b981',
                                color: '#065f46',
                                fontWeight: '900',
                                fontSize: '1.2rem',
                                display: 'flex',
                                flexDirection: 'column',
                                alignItems: 'center',
                                gap: '6px'
                            }}>
                                <CheckCircle2 size={36} color="#059669" />
                                <span>{myShoutNumber}번 외치기 완료!</span>
                                <span style={{ fontSize: '0.9rem', color: '#047857', fontWeight: 'normal' }}>
                                    안전하게 통과했습니다! 다른 사람들을 지켜보세요.
                                </span>
                            </div>
                        )}
                    </div>
                )}

                {gameState === 'round_end' && (
                    <div className="glass-panel" style={{ padding: '2rem 1.5rem', width: '100%', borderRadius: '20px', background: '#fef3c7', border: '2px solid #f59e0b' }}>
                        <div style={{ fontSize: '3.5rem', marginBottom: '0.5rem' }}>🏆</div>
                        <h3 style={{ margin: '0 0 0.5rem', fontSize: '1.5rem', color: '#b45309', fontWeight: '900' }}>
                            라운드 종료!
                        </h3>
                        <p style={{ margin: 0, color: '#92400e', fontSize: '1rem', fontWeight: 'bold' }}>
                            {winner ? `${winner}님이 마지막 ${targetNumber}번을 안전하게 외쳐 승리했습니다!` : '모든 번호 외침이 완료되었습니다!'}
                        </p>
                    </div>
                )}
            </div>
        );
    }

    // --- HOST & SCREEN VIEW ---
    return (
        <div style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            width: '100%',
            height: '100%',
            maxWidth: '960px',
            margin: '0 auto',
            gap: '1.5rem'
        }}>
            {confettiActive && <Confetti recycle={false} numberOfPieces={500} />}

            {/* Top Control Bar */}
            <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                width: '100%',
                background: 'white',
                padding: '1rem 1.5rem',
                borderRadius: '20px',
                border: '1px solid #fed7aa',
                boxShadow: '0 4px 15px rgba(0,0,0,0.03)'
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <div style={{ background: '#fef3c7', padding: '10px', borderRadius: '12px' }}>
                        <Eye size={28} color="#d97706" />
                    </div>
                    <div>
                        <h3 style={{ margin: 0, fontSize: '1.3rem', color: '#92400e', fontWeight: '900', fontFamily: 'Jua, sans-serif' }}>
                            실시간 멀티플레이 눈치 게임
                        </h3>
                        <span style={{ fontSize: '0.85rem', color: '#b45309' }}>
                            참여자 {participants.length || 0}명 대기 중 · 겹치지 않고 순서대로 외치기!
                        </span>
                    </div>
                </div>

                <div style={{ display: 'flex', gap: '8px' }}>
                    {gameState !== 'playing' ? (
                        <button
                            onClick={handleStartGame}
                            style={{
                                padding: '10px 20px',
                                borderRadius: '14px',
                                border: 'none',
                                background: 'linear-gradient(135deg, #f59e0b 0%, #ea580c 100%)',
                                color: 'white',
                                fontWeight: '900',
                                fontSize: '1rem',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '6px',
                                boxShadow: '0 4px 12px rgba(245, 158, 11, 0.3)'
                            }}
                        >
                            <Play size={18} /> {gameState === 'round_end' ? '다음 라운드 시작' : '게임 시작'}
                        </button>
                    ) : (
                        <button
                            onClick={handleStartGame}
                            style={{
                                padding: '10px 16px',
                                borderRadius: '14px',
                                border: '1.5px solid #cbd5e1',
                                background: '#f8fafc',
                                color: '#475569',
                                fontWeight: '800',
                                fontSize: '0.9rem',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '6px'
                            }}
                        >
                            <RotateCcw size={16} /> 처음부터 다시
                        </button>
                    )}
                </div>
            </div>

            {/* Central Board: Current Target Number */}
            <div style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                width: '100%',
                background: 'linear-gradient(135deg, #fffbeb 0%, #fef3c7 100%)',
                padding: '2.5rem 2rem',
                borderRadius: '28px',
                border: '3px solid #fde68a',
                boxShadow: '0 10px 30px rgba(245, 158, 11, 0.1)',
                position: 'relative',
                overflow: 'hidden'
            }}>
                <div style={{ fontSize: '1.1rem', fontWeight: '800', color: '#b45309', marginBottom: '8px', letterSpacing: '1px' }}>
                    {gameState === 'playing' ? '지금 외쳐야 할 다음 번호' : (gameState === 'round_end' ? '라운드 결과' : '게임 대기 중')}
                </div>

                <div style={{
                    fontSize: '6rem',
                    fontWeight: '900',
                    color: '#ea580c',
                    fontFamily: 'Jua, sans-serif',
                    lineHeight: 1,
                    textShadow: '0 4px 12px rgba(234, 88, 12, 0.2)',
                    animation: gameState === 'playing' ? 'pulse 1.5s infinite' : 'none'
                }}>
                    {gameState === 'round_end' ? '🏆' : currentNumber}
                </div>

                <div style={{ fontSize: '1.05rem', color: '#92400e', fontWeight: 'bold', marginTop: '14px' }}>
                    목표 번호: {targetNumber}까지 연속 성공하기
                </div>

                {collision && (
                    <div style={{
                        marginTop: '1.2rem',
                        padding: '12px 24px',
                        background: '#fee2e2',
                        border: '2px solid #ef4444',
                        borderRadius: '20px',
                        color: '#b91c1c',
                        fontWeight: '900',
                        fontSize: '1.15rem',
                        boxShadow: '0 4px 12px rgba(239, 68, 68, 0.2)'
                    }}>
                        💥 충돌 발생! {collision.names.join('님과 ')}님이 {collision.number}번을 동시에 외쳤습니다!
                    </div>
                )}
            </div>

            {/* Live Shout Timeline */}
            <div style={{
                width: '100%',
                background: 'white',
                borderRadius: '24px',
                padding: '1.5rem',
                border: '1px solid #e2e8f0',
                boxShadow: '0 4px 20px rgba(0,0,0,0.04)',
                flex: 1,
                overflowY: 'auto',
                maxHeight: '320px'
            }}>
                <h4 style={{ margin: '0 0 1rem', fontSize: '1.05rem', color: '#64748b', fontWeight: '800' }}>
                    외침 기록 ({shouts.length}회)
                </h4>
                {shouts.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '2rem', color: '#94a3b8', fontSize: '0.95rem' }}>
                        아직 외친 참가자가 없습니다. 모바일에서 [외치기] 버튼을 누르면 실시간으로 기록됩니다!
                    </div>
                ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        {shouts.map((s, idx) => (
                            <div key={idx} style={{
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                padding: '10px 16px',
                                borderRadius: '12px',
                                background: s.collided ? '#fef2f2' : '#f0fdf4',
                                border: `1.5px solid ${s.collided ? '#fca5a5' : '#86efac'}`
                            }}>
                                <span style={{ fontWeight: '900', fontSize: '1.05rem', color: s.collided ? '#dc2626' : '#15803d' }}>
                                    {s.collided ? '💥 충돌' : `📢 ${s.number} 외침!`}
                                </span>
                                <span style={{ fontWeight: 'bold', color: '#1e293b' }}>
                                    {s.nickname} {s.collided ? '(탈락)' : '(+10점)'}
                                </span>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
