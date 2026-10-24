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
                    setAllFoundSpots(prev => {
                        const exists = prev.some(s => s.spotId === payload.spotId && s.nickname === payload.nickname);
                        if (exists) return prev;
                        return [...prev, payload];
                    });
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

    // Handle Tap on Difference Image (Participant Mobile, Host, or ScreenView)
    const handleImageClick = (e) => {
        if (timeLeft <= 0) return;
        if (!imgRef.current) return;

        const rect = imgRef.current.getBoundingClientRect();
        const clientX = e.clientX ?? (e.touches && e.touches[0]?.clientX);
        const clientY = e.clientY ?? (e.touches && e.touches[0]?.clientY);
        if (clientX === undefined || clientY === undefined) return;

        const clickX = ((clientX - rect.left) / rect.width) * 100;
        const clickY = ((clientY - rect.top) / rect.height) * 100;

        // Check if click is close to any spot (generous hit tolerance: 14% of dimension)
        let hitSpot = null;
        for (const spot of effectiveSpots) {
            const dist = Math.hypot(clickX - spot.x, clickY - spot.y);
            const r = Math.max(spot.radius || 10, 14);
            if (dist <= r && !myFoundSpotIds.has(spot.id)) {
                hitSpot = spot;
                break;
            }
        }

        const effectiveNickname = nickname || (isHost ? '진행자' : isScreenView ? '서브스크린' : '참가자');

        if (hitSpot) {
            // SUCCESS HIT!
            const nextSet = new Set(myFoundSpotIds);
            nextSet.add(hitSpot.id);
            setMyFoundSpotIds(nextSet);

            try { playSound('correct'); } catch(e){}

            // Award +10 points
            if (onScoreAdjust) onScoreAdjust(10);
            if (socket && pin) {
                socket.emit('host:adjustScore', { pin, nickname: effectiveNickname, amount: 10 });
                socket.emit('room:message', {
                    pin,
                    event: 'quiz:spot_diff_hit',
                    payload: { spotId: hitSpot.id, nickname: effectiveNickname, x: hitSpot.x, y: hitSpot.y }
                });
            }

            // Sync BroadcastChannel
            try {
                const bc = new BroadcastChannel('quizrun_spot_quiz_sync');
                bc.postMessage({
                    type: 'SPOT_HIT',
                    payload: { spotId: hitSpot.id, nickname: effectiveNickname, x: hitSpot.x, y: hitSpot.y }
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
                    socket.emit('host:adjustScore', { pin, nickname: effectiveNickname, amount: bonus });
                    socket.emit('room:message', {
                        pin,
                        event: 'quiz:spot_diff_first_finish',
                        payload: { nickname: effectiveNickname, bonus }
                    });
                }
                setFirstFinisher(effectiveNickname);
                setConfettiActive(true);
                try { playSound('fanfare'); } catch(e){}

                try {
                    const bc = new BroadcastChannel('quizrun_spot_quiz_sync');
                    bc.postMessage({
                        type: 'FINISH_ALL',
                        payload: { nickname: effectiveNickname, bonus }
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

    // --- HOST & SCREEN VIEW (DESKTOP DUAL DISPLAY) ---
    if (isHost || isScreenView) {
        return (
            <div style={{
                width: '100%',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '14px'
            }}>
                {confettiActive && <Confetti recycle={false} numberOfPieces={500} />}

                {/* Top Status Banner: Timer & Spots Counter */}
                <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    width: '100%',
                    maxWidth: '1200px',
                    background: 'white',
                    padding: '10px 24px',
                    borderRadius: '20px',
                    border: '2px solid #fed7aa',
                    boxShadow: '0 4px 15px rgba(0,0,0,0.04)'
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <span style={{ fontSize: '1.25rem', fontWeight: '900', color: '#ea580c' }}>
                            🔍 다른 그림 찾기
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
                            총 {effectiveSpots.length}군데 다른 곳 찾기 (클릭하여 체크 가능)
                        </span>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                        <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px',
                            fontSize: '1.35rem',
                            fontWeight: '900',
                            fontFamily: 'Jua, sans-serif',
                            color: timeLeft <= 10 ? '#ef4444' : '#1e293b'
                        }}>
                            <Clock size={22} color={timeLeft <= 10 ? '#ef4444' : '#ea580c'} />
                            <span>{timeLeft}초</span>
                        </div>
                    </div>
                </div>

                {/* First Finisher Announcement Banner */}
                {firstFinisher && (
                    <div style={{
                        width: '100%',
                        maxWidth: '1200px',
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
                        <span>🏆 {firstFinisher}님이 모든 다른 부분을 가장 먼저 찾았습니다! (보너스 2배 점수 획득!)</span>
                    </div>
                )}

                {/* Side-by-Side Images Display */}
                <div style={{
                    display: 'grid',
                    gridTemplateColumns: '1fr 1fr',
                    gap: '20px',
                    width: '100%',
                    maxWidth: '1200px'
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
                                style={{ maxWidth: '100%', maxHeight: '420px', objectFit: 'contain', borderRadius: '16px', userSelect: 'none' }}
                            />
                        </div>
                    </div>

                    {/* Image 2: Diff Image with Click and Live Markers */}
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
                            [ 🔍 2. 틀린 그림 (클릭/터치하여 체크) ]
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
                            <div
                                ref={imgRef}
                                onClick={handleImageClick}
                                style={{
                                    position: 'relative',
                                    display: 'inline-block',
                                    lineHeight: 0,
                                    cursor: 'crosshair',
                                    maxWidth: '100%'
                                }}
                            >
                                <img
                                    src={mediaUrl2 || mediaUrl || '/logo.png'}
                                    alt="Difference"
                                    style={{ display: 'block', maxWidth: '100%', maxHeight: '420px', objectFit: 'contain', borderRadius: '16px', userSelect: 'none' }}
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

                                {missRipple && (
                                    <div
                                        style={{
                                            position: 'absolute',
                                            left: `${missRipple.x}%`,
                                            top: `${missRipple.y}%`,
                                            width: '36px',
                                            height: '36px',
                                            transform: 'translate(-50%, -50%)',
                                            borderRadius: '50%',
                                            border: '3px solid #ef4444',
                                            background: 'rgba(239, 68, 68, 0.3)',
                                            pointerEvents: 'none',
                                            animation: 'ping 0.8s cubic-bezier(0, 0, 0.2, 1) infinite'
                                        }}
                                    />
                                )}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Live Found Notice Log */}
                <div style={{
                    width: '100%',
                    maxWidth: '1200px',
                    background: '#f8fafc',
                    borderRadius: '16px',
                    padding: '8px 16px',
                    border: '1px solid #e2e8f0',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    overflowX: 'auto',
                    minHeight: '40px'
                }}>
                    <span style={{ fontWeight: '900', fontSize: '0.88rem', color: '#475569', whiteSpace: 'nowrap' }}>
                        발견 현황:
                    </span>
                    {allFoundSpots.length === 0 ? (
                        <span style={{ color: '#94a3b8', fontSize: '0.84rem' }}>
                            참여자가 틀린 부분을 찾으면 실시간으로 여기에 표시됩니다.
                        </span>
                    ) : (
                        allFoundSpots.map((s, i) => (
                            <span key={i} style={{
                                padding: '3px 8px',
                                background: '#ecfdf5',
                                border: '1px solid #86efac',
                                borderRadius: '8px',
                                color: '#166534',
                                fontWeight: 'bold',
                                fontSize: '0.82rem',
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

    // --- PARTICIPANT (MOBILE) VIEW: TOP = DIFFERENCE IMAGE, BOTTOM = ORIGINAL IMAGE ---
    return (
        <div style={{
            width: '100%',
            maxWidth: '520px',
            margin: '0 auto',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '8px',
            padding: '4px'
        }}>
            {confettiActive && <Confetti recycle={false} numberOfPieces={400} />}

            {/* Mobile Header: Timer and Found Count */}
            <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                width: '100%',
                background: 'white',
                padding: '8px 14px',
                borderRadius: '14px',
                border: '1.5px solid #fed7aa',
                boxShadow: '0 2px 6px rgba(0,0,0,0.03)'
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{
                        padding: '3px 10px',
                        background: '#ecfdf5',
                        border: '1.5px solid #86efac',
                        borderRadius: '10px',
                        color: '#15803d',
                        fontWeight: '900',
                        fontSize: '0.88rem'
                    }}>
                        찾은 개수: {myFoundSpotIds.size} / {effectiveSpots.length}
                    </span>
                </div>

                <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    fontWeight: '900',
                    fontSize: '1.15rem',
                    color: timeLeft <= 10 ? '#ef4444' : '#ea580c'
                }}>
                    <Clock size={16} />
                    <span>{timeLeft}초</span>
                </div>
            </div>

            {/* Top: 🔍 틀린 그림 (터치 영역) */}
            <div style={{
                width: '100%',
                background: 'white',
                borderRadius: '16px',
                border: '2px solid #fdba74',
                padding: '6px 8px',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                boxShadow: '0 4px 14px rgba(234, 88, 12, 0.08)'
            }}>
                <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    width: '100%',
                    alignItems: 'center',
                    marginBottom: '4px',
                    padding: '0 4px'
                }}>
                    <span style={{ fontSize: '0.82rem', fontWeight: '900', color: '#ea580c' }}>
                        🔍 [틀린 그림 - 터치하여 정답 체크]
                    </span>
                    <span style={{ fontSize: '0.74rem', fontWeight: 'bold', color: '#9a3412' }}>
                        맞출 때마다 +10점 획득
                    </span>
                </div>

                <div
                    style={{
                        display: 'flex',
                        justifyContent: 'center',
                        width: '100%',
                        overflow: 'hidden'
                    }}
                >
                    <div
                        ref={imgRef}
                        onClick={handleImageClick}
                        style={{
                            position: 'relative',
                            display: 'inline-block',
                            lineHeight: 0,
                            cursor: 'crosshair',
                            maxWidth: '100%',
                            touchAction: 'manipulation'
                        }}
                    >
                        <img
                            src={mediaUrl2 || mediaUrl || '/logo.png'}
                            alt="Difference Area"
                            style={{
                                display: 'block',
                                maxWidth: '100%',
                                maxHeight: '27vh',
                                objectFit: 'contain',
                                borderRadius: '10px',
                                userSelect: 'none'
                            }}
                        />

                        {/* Markers for user found spots */}
                        {Array.from(myFoundSpotIds).map(id => {
                            const spot = effectiveSpots.find(s => s.id === id);
                            if (!spot) return null;
                            return (
                                <div
                                    key={id}
                                    style={{
                                        position: 'absolute',
                                        left: `${spot.x}%`,
                                        top: `${spot.y}%`,
                                        width: '36px',
                                        height: '36px',
                                        transform: 'translate(-50%, -50%)',
                                        border: '3px solid #22c55e',
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
                                    borderRadius: '50%',
                                    border: '3px solid #ef4444',
                                    background: 'rgba(239, 68, 68, 0.3)',
                                    pointerEvents: 'none',
                                    animation: 'ping 0.8s cubic-bezier(0, 0, 0.2, 1) infinite'
                                }}
                            />
                        )}
                    </div>
                </div>
            </div>

            {/* Bottom: 🖼️ 원본 그림 (비교 참고용) */}
            <div style={{
                width: '100%',
                background: 'white',
                borderRadius: '16px',
                border: '2px solid #bfdbfe',
                padding: '6px 8px',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                boxShadow: '0 4px 14px rgba(37, 99, 235, 0.05)'
            }}>
                <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    width: '100%',
                    alignItems: 'center',
                    marginBottom: '4px',
                    padding: '0 4px'
                }}>
                    <span style={{ fontSize: '0.82rem', fontWeight: '900', color: '#2563eb' }}>
                        🖼️ [원본 그림 - 비교 참고용]
                    </span>
                    <span style={{ fontSize: '0.74rem', color: '#64748b' }}>
                        위 틀린 그림과 비교해보세요
                    </span>
                </div>

                <div
                    style={{
                        display: 'flex',
                        justifyContent: 'center',
                        width: '100%',
                        overflow: 'hidden'
                    }}
                >
                    <div
                        style={{
                            position: 'relative',
                            display: 'inline-block',
                            lineHeight: 0,
                            maxWidth: '100%'
                        }}
                    >
                        <img
                            src={mediaUrl || '/logo.png'}
                            alt="Original Reference"
                            style={{
                                display: 'block',
                                maxWidth: '100%',
                                maxHeight: '27vh',
                                objectFit: 'contain',
                                borderRadius: '10px',
                                userSelect: 'none'
                            }}
                        />
                    </div>
                </div>
            </div>

            {/* First Finisher Announcement Banner */}
            {firstFinisher && (
                <div style={{
                    width: '100%',
                    padding: '8px 12px',
                    background: 'linear-gradient(135deg, #fef3c7 0%, #fde68a 100%)',
                    border: '2px solid #f59e0b',
                    borderRadius: '12px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px',
                    fontSize: '0.86rem',
                    fontWeight: '900',
                    color: '#92400e'
                }}>
                    <Trophy size={18} color="#d97706" />
                    <span>🏆 {firstFinisher}님이 1등으로 모두 찾았습니다! (보너스 2배)</span>
                </div>
            )}
        </div>
    );
}
