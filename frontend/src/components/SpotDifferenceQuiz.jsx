import React, { useState, useEffect, useRef } from 'react';
import { playSound } from '../utils/audio';
import Confetti from 'react-confetti';
import { Clock, CheckCircle2, Trophy, Eye, AlertCircle, Sparkles } from 'lucide-react';

export default function SpotDifferenceQuiz({
    isHost = false,
    isScreenView = false,
    mediaUrl,
    mediaUrl2,
    diffSpots = [],
    timeLimit = 60,
    questionText = '두 그림을 비교하여 틀린 부분을 모두 찾아보세요!',
    socket,
    pin,
    nickname = '',
    onScoreAdjust
}) {
    const [timeLeft, setTimeLeft] = useState(timeLimit || 60);
    const [myFoundSpotIds, setMyFoundSpotIds] = useState(new Set());
    const [allFoundSpots, setAllFoundSpots] = useState([]); // [{ spotId, nickname, x, y }]
    const [firstFinisher, setFirstFinisher] = useState(null);
    const [activeTab, setActiveTab] = useState('diff'); // 'diff' | 'orig' (for mobile tabs)
    const [missRipple, setMissRipple] = useState(null);
    const [confettiActive, setConfettiActive] = useState(false);
    const imgRef = useRef(null);

    // Fallback if no spots defined: generate 3 default center/corner spots
    const effectiveSpots = (diffSpots && diffSpots.length > 0) ? diffSpots : [
        { id: 1, x: 28, y: 35, radius: 10 },
        { id: 2, x: 72, y: 45, radius: 10 },
        { id: 3, x: 50, y: 70, radius: 10 }
    ];

    // Countdown Timer
    useEffect(() => {
        setTimeLeft(timeLimit || 60);
        setMyFoundSpotIds(new Set());
        setAllFoundSpots([]);
        setFirstFinisher(null);
        setConfettiActive(false);

        const timer = setInterval(() => {
            setTimeLeft(prev => {
                if (prev <= 1) {
                    clearInterval(timer);
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);

        return () => clearInterval(timer);
    }, [mediaUrl, mediaUrl2, timeLimit]);

    // BroadcastChannel sync between Host and ScreenView
    useEffect(() => {
        let bc;
        try {
            bc = new BroadcastChannel('quizrun_spot_quiz_sync');
            bc.onmessage = (e) => {
                const { type, payload } = e.data || {};
                if (type === 'SPOT_HIT') {
                    setAllFoundSpots(prev => [...prev, payload]);
                    try { playSound('correct'); } catch(e){}
                } else if (type === 'FINISH_ALL') {
                    setFirstFinisher(payload.nickname);
                    setConfettiActive(true);
                    try { playSound('fanfare'); } catch(e){}
                }
            };
        } catch (e) {}
        return () => {
            if (bc) try { bc.close(); } catch (e) {}
        };
    }, []);

    // Socket listener for room
    useEffect(() => {
        if (!socket) return;

        const onSpotHit = (data) => {
            setAllFoundSpots(prev => {
                const exists = prev.some(s => s.spotId === data.spotId && s.nickname === data.nickname);
                if (exists) return prev;
                return [...prev, data];
            });
            if (isHost || isScreenView) {
                try { playSound('correct'); } catch (e) {}
            }
        };

        const onFinishAll = (data) => {
            if (!firstFinisher) {
                setFirstFinisher(data.nickname);
                setConfettiActive(true);
                try { playSound('fanfare'); } catch (e) {}
            }
        };

        socket.on('quiz:spot_diff_hit', onSpotHit);
        socket.on('quiz:spot_diff_first_finish', onFinishAll);

        return () => {
            socket.off('quiz:spot_diff_hit', onSpotHit);
            socket.off('quiz:spot_diff_first_finish', onFinishAll);
        };
    }, [socket, firstFinisher, isHost, isScreenView]);

    // Handle Tap on Image (Participant Mobile or Solo Host)
    const handleImageClick = (e) => {
        if (timeLeft <= 0) return;
        if (!imgRef.current) return;

        const rect = imgRef.current.getBoundingClientRect();
        const clientX = e.clientX || (e.touches && e.touches[0]?.clientX);
        const clientY = e.clientY || (e.touches && e.touches[0]?.clientY);
        if (clientX === undefined || clientY === undefined) return;

        const clickX = ((clientX - rect.left) / rect.width) * 100;
        const clickY = ((clientY - rect.top) / rect.height) * 100;

        // Check if click is close to any spot
        let hitSpot = null;
        for (const spot of effectiveSpots) {
            const dist = Math.hypot(clickX - spot.x, clickY - spot.y);
            const r = spot.radius || 10;
            if (dist <= r && !myFoundSpotIds.has(spot.id)) {
                hitSpot = spot;
                break;
            }
        }

        if (hitSpot) {
            // SUCCESS HIT!
            const nextSet = new Set(myFoundSpotIds);
            nextSet.add(hitSpot.id);
            setMyFoundSpotIds(nextSet);

            try { playSound('correct'); } catch(e){}

            // Award +10 points
            if (onScoreAdjust) onScoreAdjust(10);
            if (socket && pin) {
                socket.emit('host:adjustScore', { pin, nickname, amount: 10 });
                socket.emit('room:message', {
                    pin,
                    event: 'quiz:spot_diff_hit',
                    payload: { spotId: hitSpot.id, nickname: nickname || '참가자', x: hitSpot.x, y: hitSpot.y }
                });
            }

            // Sync BroadcastChannel
            try {
                const bc = new BroadcastChannel('quizrun_spot_quiz_sync');
                bc.postMessage({
                    type: 'SPOT_HIT',
                    payload: { spotId: hitSpot.id, nickname: nickname || '참가자', x: hitSpot.x, y: hitSpot.y }
                });
                setTimeout(() => bc.close(), 200);
            } catch(e){}

            // Check if found all spots
            if (nextSet.size === effectiveSpots.length) {
                // First finisher gets double points!
                const baseEarned = effectiveSpots.length * 10;
                const bonus = baseEarned; // 맞춘 점수의 2배를 더해서 획득
                if (onScoreAdjust) onScoreAdjust(bonus);
                if (socket && pin) {
                    socket.emit('host:adjustScore', { pin, nickname, amount: bonus });
                    socket.emit('room:message', {
                        pin,
                        event: 'quiz:spot_diff_first_finish',
                        payload: { nickname: nickname || '참가자', bonus }
                    });
                }
                setFirstFinisher(nickname || '참가자');
                setConfettiActive(true);
                try { playSound('fanfare'); } catch(e){}

                try {
                    const bc = new BroadcastChannel('quizrun_spot_quiz_sync');
                    bc.postMessage({
                        type: 'FINISH_ALL',
                        payload: { nickname: nickname || '참가자', bonus }
                    });
                    setTimeout(() => bc.close(), 200);
                } catch(e){}
            }
        } else {
            // MISS
            setMissRipple({ x: clickX, y: clickY });
            try { playSound('wrong'); } catch(e){}
            setTimeout(() => setMissRipple(null), 800);
        }
    };

    const isFinishedAll = myFoundSpotIds.size === effectiveSpots.length;

    // --- HOST & SCREEN VIEW ---
    if (isHost || isScreenView) {
        return (
            <div style={{
                width: '100%',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '16px'
            }}>
                {confettiActive && <Confetti recycle={false} numberOfPieces={500} />}

                {/* Top Status Banner: Timer & Spots Counter */}
                <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    width: '100%',
                    maxWidth: '1100px',
                    background: 'white',
                    padding: '12px 24px',
                    borderRadius: '20px',
                    border: '2px solid #fed7aa',
                    boxShadow: '0 4px 15px rgba(0,0,0,0.04)'
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <span style={{ fontSize: '1.25rem', fontWeight: '900', color: '#ea580c' }}>
                            🔍 틀린 그림 찾기
                        </span>
                        <span style={{
                            padding: '4px 12px',
                            background: '#fef3c7',
                            border: '1.5px solid #fde68a',
                            borderRadius: '12px',
                            color: '#b45309',
                            fontWeight: '800',
                            fontSize: '0.95rem'
                        }}>
                            총 {effectiveSpots.length}군데 틀린 곳 찾기
                        </span>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                        <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px',
                            fontSize: '1.4rem',
                            fontWeight: '900',
                            fontFamily: 'Jua, sans-serif',
                            color: timeLeft <= 10 ? '#ef4444' : '#1e293b'
                        }}>
                            <Clock size={24} color={timeLeft <= 10 ? '#ef4444' : '#ea580c'} />
                            <span>{timeLeft}초</span>
                        </div>
                    </div>
                </div>

                {/* First Finisher Announcement Banner */}
                {firstFinisher && (
                    <div style={{
                        width: '100%',
                        maxWidth: '1100px',
                        padding: '12px 24px',
                        background: 'linear-gradient(135deg, #fef3c7 0%, #fde68a 100%)',
                        border: '3px solid #f59e0b',
                        borderRadius: '20px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '10px',
                        fontSize: '1.25rem',
                        fontWeight: '900',
                        color: '#92400e',
                        boxShadow: '0 6px 20px rgba(245, 158, 11, 0.3)',
                        animation: 'bounce 0.8s infinite'
                    }}>
                        <Trophy size={26} color="#d97706" />
                        <span>🏆 {firstFinisher}님이 모든 틀린 부분을 가장 먼저 찾았습니다! (보너스 2배 점수 획득!)</span>
                    </div>
                )}

                {/* Side-by-Side Images Display */}
                <div style={{
                    display: 'grid',
                    gridTemplateColumns: '1fr 1fr',
                    gap: '20px',
                    width: '100%',
                    maxWidth: '1100px'
                }}>
                    {/* Image 1: Original */}
                    <div style={{
                        background: 'white',
                        padding: '12px',
                        borderRadius: '24px',
                        border: '2px solid #e2e8f0',
                        boxShadow: '0 8px 24px rgba(0,0,0,0.04)',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center'
                    }}>
                        <div style={{ fontWeight: '900', color: '#2563eb', marginBottom: '8px', fontSize: '1.05rem' }}>
                            [ 🖼️ 1. 원본 그림 ]
                        </div>
                        <div style={{ width: '100%', maxHeight: '420px', display: 'flex', justifyContent: 'center', overflow: 'hidden', borderRadius: '16px' }}>
                            <img
                                src={mediaUrl || '/logo.png'}
                                alt="Original"
                                style={{ maxWidth: '100%', maxHeight: '420px', objectFit: 'contain', borderRadius: '16px' }}
                            />
                        </div>
                    </div>

                    {/* Image 2: Diff Image with Live Markers */}
                    <div style={{
                        background: 'white',
                        padding: '12px',
                        borderRadius: '24px',
                        border: '2px solid #fed7aa',
                        boxShadow: '0 8px 24px rgba(234, 88, 12, 0.08)',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        position: 'relative'
                    }}>
                        <div style={{ fontWeight: '900', color: '#ea580c', marginBottom: '8px', fontSize: '1.05rem' }}>
                            [ 🔍 2. 틀린 그림 (참여자 터치 영역) ]
                        </div>
                        <div
                            style={{
                                width: '100%',
                                maxHeight: '420px',
                                display: 'flex',
                                justifyContent: 'center',
                                position: 'relative',
                                overflow: 'hidden',
                                borderRadius: '16px'
                            }}
                        >
                            <img
                                src={mediaUrl2 || mediaUrl || '/logo.png'}
                                alt="Difference"
                                style={{ maxWidth: '100%', maxHeight: '420px', objectFit: 'contain', borderRadius: '16px' }}
                            />

                            {/* Render Found Spots as Green Glowing Circles */}
                            {allFoundSpots.map((s, idx) => (
                                <div
                                    key={idx}
                                    style={{
                                        position: 'absolute',
                                        left: `${s.x}%`,
                                        top: `${s.y}%`,
                                        width: '44px',
                                        height: '44px',
                                        transform: 'translate(-50%, -50%)',
                                        border: '3.5px solid #22c55e',
                                        borderRadius: '50%',
                                        background: 'rgba(34, 197, 94, 0.25)',
                                        boxShadow: '0 0 16px rgba(34, 197, 94, 0.8)',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        color: '#15803d',
                                        fontWeight: '900',
                                        fontSize: '0.85rem',
                                        pointerEvents: 'none',
                                        animation: 'pulse 1s infinite'
                                    }}
                                >
                                    ✓
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Live Found Notice Log */}
                <div style={{
                    width: '100%',
                    maxWidth: '1100px',
                    background: '#f8fafc',
                    borderRadius: '16px',
                    padding: '10px 16px',
                    border: '1px solid #e2e8f0',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    overflowX: 'auto',
                    minHeight: '44px'
                }}>
                    <span style={{ fontWeight: '900', fontSize: '0.9rem', color: '#475569', whiteSpace: 'nowrap' }}>
                        발견 현황:
                    </span>
                    {allFoundSpots.length === 0 ? (
                        <span style={{ color: '#94a3b8', fontSize: '0.85rem' }}>
                            참여자가 틀린 부분을 찾으면 실시간으로 여기에 표시됩니다.
                        </span>
                    ) : (
                        allFoundSpots.map((s, i) => (
                            <span key={i} style={{
                                padding: '4px 10px',
                                background: '#ecfdf5',
                                border: '1px solid #86efac',
                                borderRadius: '10px',
                                color: '#166534',
                                fontWeight: 'bold',
                                fontSize: '0.85rem',
                                whiteSpace: 'nowrap'
                            }}>
                                🎯 {s.nickname} (+10점)
                            </span>
                        ))
                    )}
                </div>
            </div>
        );
    }

    // --- PARTICIPANT (MOBILE) VIEW ---
    return (
        <div style={{
            width: '100%',
            maxWidth: '520px',
            margin: '0 auto',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '12px',
            padding: '10px'
        }}>
            {confettiActive && <Confetti recycle={false} numberOfPieces={400} />}

            {/* Mobile Header: Timer and Found Count */}
            <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                width: '100%',
                background: 'white',
                padding: '10px 16px',
                borderRadius: '16px',
                border: '1.5px solid #fed7aa',
                boxShadow: '0 2px 8px rgba(0,0,0,0.03)'
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{
                        padding: '4px 10px',
                        background: '#ecfdf5',
                        border: '1.5px solid #86efac',
                        borderRadius: '10px',
                        color: '#15803d',
                        fontWeight: '900',
                        fontSize: '0.9rem'
                    }}>
                        찾은 개수: {myFoundSpotIds.size} / {effectiveSpots.length}
                    </span>
                </div>

                <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    fontWeight: '900',
                    fontSize: '1.2rem',
                    color: timeLeft <= 10 ? '#ef4444' : '#ea580c'
                }}>
                    <Clock size={18} />
                    <span>{timeLeft}초</span>
                </div>
            </div>

            {/* View Switcher: Compare between Original and Diff */}
            <div style={{ display: 'flex', width: '100%', gap: '8px' }}>
                <button
                    onClick={() => setActiveTab('diff')}
                    style={{
                        flex: 1,
                        padding: '10px',
                        borderRadius: '12px',
                        border: activeTab === 'diff' ? '2px solid #ea580c' : '1px solid #cbd5e1',
                        background: activeTab === 'diff' ? '#fff7ed' : 'white',
                        color: activeTab === 'diff' ? '#ea580c' : '#64748b',
                        fontWeight: '900',
                        fontSize: '0.92rem',
                        cursor: 'pointer'
                    }}
                >
                    🔍 틀린 그림 터치하기
                </button>
                <button
                    onClick={() => setActiveTab('orig')}
                    style={{
                        flex: 1,
                        padding: '10px',
                        borderRadius: '12px',
                        border: activeTab === 'orig' ? '2px solid #2563eb' : '1px solid #cbd5e1',
                        background: activeTab === 'orig' ? '#eff6ff' : 'white',
                        color: activeTab === 'orig' ? '#2563eb' : '#64748b',
                        fontWeight: '900',
                        fontSize: '0.92rem',
                        cursor: 'pointer'
                    }}
                >
                    🖼️ 원본 그림 보기
                </button>
            </div>

            {/* Interactive Image Container */}
            <div
                style={{
                    width: '100%',
                    background: 'white',
                    borderRadius: '20px',
                    border: '2px solid #e2e8f0',
                    padding: '8px',
                    display: 'flex',
                    justifyContent: 'center',
                    position: 'relative',
                    overflow: 'hidden',
                    boxShadow: '0 4px 15px rgba(0,0,0,0.05)',
                    touchAction: 'manipulation'
                }}
            >
                <img
                    ref={imgRef}
                    src={activeTab === 'diff' ? (mediaUrl2 || mediaUrl) : mediaUrl}
                    alt="Game Area"
                    onClick={activeTab === 'diff' ? handleImageClick : undefined}
                    style={{
                        width: '100%',
                        height: 'auto',
                        maxHeight: '380px',
                        objectFit: 'contain',
                        borderRadius: '14px',
                        cursor: activeTab === 'diff' ? 'crosshair' : 'default',
                        userSelect: 'none'
                    }}
                />

                {/* Markers for user found spots */}
                {activeTab === 'diff' && Array.from(myFoundSpotIds).map(id => {
                    const spot = effectiveSpots.find(s => s.id === id);
                    if (!spot) return null;
                    return (
                        <div
                            key={id}
                            style={{
                                position: 'absolute',
                                left: `${spot.x}%`,
                                top: `${spot.y}%`,
                                width: '40px',
                                height: '40px',
                                transform: 'translate(-50%, -50%)',
                                border: '3.5px solid #22c55e',
                                borderRadius: '50%',
                                background: 'rgba(34, 197, 94, 0.3)',
                                boxShadow: '0 0 14px rgba(34, 197, 94, 0.8)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                color: '#15803d',
                                fontWeight: '900',
                                fontSize: '0.85rem',
                                pointerEvents: 'none'
                            }}
                        >
                            ✓
                        </div>
                    );
                })}

                {/* Miss Ripple */}
                {missRipple && (
                    <div
                        style={{
                            position: 'absolute',
                            left: `${missRipple.x}%`,
                            top: `${missRipple.y}%`,
                            width: '32px',
                            height: '32px',
                            transform: 'translate(-50%, -50%)',
                            border: '3px solid #ef4444',
                            borderRadius: '50%',
                            background: 'rgba(239, 68, 68, 0.3)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: '#b91c1c',
                            fontWeight: '900',
                            fontSize: '0.8rem',
                            pointerEvents: 'none',
                            animation: 'bounce 0.4s'
                        }}
                    >
                        ✕
                    </div>
                )}
            </div>

            {/* Bottom Status Guide */}
            {isFinishedAll ? (
                <div style={{
                    width: '100%',
                    padding: '14px',
                    borderRadius: '16px',
                    background: '#ecfdf5',
                    border: '2px solid #10b981',
                    color: '#065f46',
                    fontWeight: '900',
                    fontSize: '1.05rem',
                    textAlign: 'center'
                }}>
                    🎉 축하합니다! 모든 틀린 부분을 전부 찾았습니다!
                </div>
            ) : (
                <p style={{ margin: 0, fontSize: '0.85rem', color: '#64748b', textAlign: 'center' }}>
                    💡 틀린 그림에서 다른 곳을 손가락으로 터치하세요 (+10점)
                </p>
            )}
        </div>
    );
}
