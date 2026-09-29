import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Play, Pause, RotateCcw, Square, Plus, Minus, ArrowLeft } from 'lucide-react';
import { playSound } from '../utils/audio';

export default function TimeAttack() {
    const navigate = useNavigate();
    const [initialTime, setInitialTime] = useState(60); // Default 60 seconds
    const [timeLeft, setTimeLeft] = useState(60);
    const [isRunning, setIsRunning] = useState(false);
    const [inputTime, setInputTime] = useState('60');

    const timerRef = useRef(null);
    const bgmRef = useRef(null);

    // Dynamic BGM setup
    useEffect(() => {
        if (isRunning) {
            if (!bgmRef.current) {
                bgmRef.current = new Audio('/audio/science_is_fun.mp3');
                bgmRef.current.loop = true;
                bgmRef.current.volume = 0.25;
            }
            bgmRef.current.play().catch(e => console.log('BGM play blocked:', e));
        } else {
            if (bgmRef.current) {
                bgmRef.current.pause();
            }
        }
        return () => {
            if (bgmRef.current) {
                bgmRef.current.pause();
            }
        };
    }, [isRunning]);

    // Countdown logic
    useEffect(() => {
        if (isRunning && timeLeft > 0) {
            timerRef.current = setInterval(() => {
                setTimeLeft(prev => {
                    const nextTime = prev - 1;
                    // Play ticking sound for the final 10 seconds
                    if (nextTime <= 10 && nextTime > 0) {
                        playSound('submit');
                    }
                    if (nextTime <= 0) {
                        clearInterval(timerRef.current);
                        setIsRunning(false);
                        playSound('fanfare'); // Alarm sound
                    }
                    return nextTime;
                });
            }, 1000);
        } else {
            clearInterval(timerRef.current);
        }

        return () => clearInterval(timerRef.current);
    }, [isRunning, timeLeft]);

    const handleStartPause = () => {
        playSound('submit');
        setIsRunning(!isRunning);
    };

    const handleStop = () => {
        playSound('submit');
        setIsRunning(false);
        setTimeLeft(initialTime);
    };

    const handleReset = () => {
        playSound('submit');
        setIsRunning(false);
        setInitialTime(60);
        setTimeLeft(60);
        setInputTime('60');
    };

    const handleAdjust = (seconds) => {
        if (isRunning) return;
        playSound('submit');
        const nextTime = Math.max(5, initialTime + seconds);
        setInitialTime(nextTime);
        setTimeLeft(nextTime);
        setInputTime(nextTime.toString());
    };

    const handleInputChange = (e) => {
        const val = e.target.value.replace(/[^0-9]/g, '');
        setInputTime(val);
    };

    const handleInputBlur = () => {
        let num = parseInt(inputTime, 10);
        if (isNaN(num) || num < 5) num = 5;
        if (num > 3600) num = 3600; // Cap at 1 hour
        setInitialTime(num);
        setTimeLeft(num);
        setInputTime(num.toString());
    };

    // Format seconds into MM:SS
    const formatTime = (secs) => {
        const m = Math.floor(secs / 60).toString().padStart(2, '0');
        const s = (secs % 60).toString().padStart(2, '0');
        return `${m}:${s}`;
    };

    // Calculate circular progress percentage
    const progressPercent = (timeLeft / initialTime) * 100;
    const strokeDashoffset = 565.48 - (565.48 * progressPercent) / 100;

    return (
        <div style={{
            width: '100%',
            height: '100vh',
            padding: '1.5rem',
            boxSizing: 'border-box',
            display: 'flex',
            flexDirection: 'column',
            color: 'var(--text)',
            overflow: 'hidden',
            background: 'radial-gradient(circle at center, #f8fafc 0%, #e2e8f0 100%)'
        }}>
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '2px solid #cbd5e1', paddingBottom: '1rem', marginBottom: '2.5rem', width: '100%' }}>
                <h2 
                    onClick={() => {
                        if (window.confirm("대기실로 돌아가시겠습니까?")) {
                            navigate('/');
                        }
                    }}
                    style={{ 
                        fontSize: '2.2rem', 
                        fontFamily: 'Jua, sans-serif', 
                        color: 'var(--primary)', 
                        margin: 0, 
                        display: 'flex', 
                        alignItems: 'center', 
                        gap: '10px',
                        cursor: 'pointer',
                        transition: 'opacity 0.2s',
                        userSelect: 'none'
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.opacity = '0.7'}
                    onMouseLeave={(e) => e.currentTarget.style.opacity = '1'}
                >
                    🎮 타임어택
                </h2>
                <button 
                    onClick={() => navigate('/')} 
                    className="glass-button"
                    style={{ padding: '8px 16px', fontSize: '1rem', display: 'flex', alignItems: 'center', gap: '6px' }}
                >
                    <ArrowLeft size={18} /> 홈으로 가기
                </button>
            </div>

            {/* Timer Core Panel */}
            <div className="glass-panel" style={{
                flex: 1,
                maxWidth: '650px',
                width: '100%',
                margin: '0 auto 1.5rem auto',
                padding: '2.5rem 2rem',
                borderRadius: '32px',
                background: 'white',
                border: '1px solid #e2e8f0',
                boxShadow: '0 15px 45px rgba(0,0,0,0.06)',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '2.5rem',
                overflowY: 'auto'
            }}>
                {/* Circular Countdown Progress */}
                <div style={{ position: 'relative', width: '220px', height: '220px' }}>
                    <svg width="220" height="220" style={{ transform: 'rotate(-90deg)' }}>
                        {/* Background track circle */}
                        <circle
                            cx="110"
                            cy="110"
                            r="90"
                            stroke="#f1f5f9"
                            strokeWidth="14"
                            fill="transparent"
                        />
                        {/* Dynamic countdown track */}
                        <circle
                            cx="110"
                            cy="110"
                            r="90"
                            stroke={timeLeft <= 10 ? '#ef4444' : 'var(--primary)'}
                            strokeWidth="14"
                            fill="transparent"
                            strokeDasharray="565.48"
                            strokeDashoffset={strokeDashoffset}
                            strokeLinecap="round"
                            style={{ transition: 'stroke-dashoffset 0.3s linear, stroke 0.3s ease' }}
                        />
                    </svg>

                    {/* Clock Text Display */}
                    <div style={{
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        width: '100%',
                        height: '100%',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontFamily: 'Outfit, monospace',
                        fontSize: '3.6rem',
                        fontWeight: '900',
                        color: timeLeft <= 10 ? '#ef4444' : 'var(--text)',
                        textShadow: '0 2px 4px rgba(0,0,0,0.04)'
                    }}>
                        {formatTime(timeLeft)}
                        {timeLeft <= 10 && timeLeft > 0 && (
                            <span style={{ fontSize: '1rem', color: '#ef4444', fontWeight: 'bold', marginTop: '4px', animation: 'ping 1s infinite' }}>
                                위험! ⏱️
                            </span>
                        )}
                        {timeLeft === 0 && (
                            <span style={{ fontSize: '1.2rem', color: '#ef4444', fontWeight: 'bold', marginTop: '4px' }}>
                                타임업! 🔔
                            </span>
                        )}
                    </div>
                </div>

                {/* Adjuster Inputs */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '15px', background: '#f8fafc', padding: '12px 24px', borderRadius: '20px', border: '1px solid #cbd5e1' }}>
                    <button 
                        onClick={() => handleAdjust(-10)} 
                        disabled={isRunning}
                        style={{ border: 'none', background: 'transparent', cursor: isRunning ? 'default' : 'pointer', opacity: isRunning ? 0.3 : 1 }}
                    >
                        <Minus size={20} color="#3b82f6" />
                    </button>
                    
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <input
                            type="text"
                            value={inputTime}
                            onChange={handleInputChange}
                            onBlur={handleInputBlur}
                            disabled={isRunning}
                            style={{
                                width: '60px',
                                textAlign: 'center',
                                fontSize: '1.4rem',
                                fontWeight: 'bold',
                                border: 'none',
                                background: 'transparent',
                                borderBottom: '2px solid #cbd5e1',
                                outline: 'none',
                                color: isRunning ? '#94a3b8' : 'var(--text)'
                            }}
                        />
                        <span style={{ fontSize: '1.1rem', fontWeight: 'bold', color: 'var(--text-muted)' }}>초</span>
                    </div>

                    <button 
                        onClick={() => handleAdjust(10)} 
                        disabled={isRunning}
                        style={{ border: 'none', background: 'transparent', cursor: isRunning ? 'default' : 'pointer', opacity: isRunning ? 0.3 : 1 }}
                    >
                        <Plus size={20} color="#3b82f6" />
                    </button>
                </div>

                {/* Main Action Controllers */}
                <div style={{ display: 'flex', gap: '15px', width: '100%', maxWidth: '380px' }}>
                    <button
                        onClick={handleStartPause}
                        className="glass-button primary-btn"
                        style={{
                            flex: 2,
                            padding: '16px',
                            borderRadius: '16px',
                            fontSize: '1.2rem',
                            fontWeight: 'bold',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '8px',
                            boxShadow: isRunning ? 'none' : '0 8px 20px rgba(59,130,246,0.2)'
                        }}
                    >
                        {isRunning ? (
                            <>
                                <Pause size={20} /> 일시중지
                            </>
                        ) : (
                            <>
                                <Play size={20} /> 시작
                            </>
                        )}
                    </button>

                    <button
                        onClick={handleStop}
                        style={{
                            flex: 1,
                            padding: '16px',
                            borderRadius: '16px',
                            fontSize: '1.2rem',
                            fontWeight: 'bold',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '8px',
                            background: '#f8fafc',
                            border: '1px solid #cbd5e1',
                            color: '#475569',
                            cursor: 'pointer',
                            boxShadow: '0 4px 6px rgba(0,0,0,0.02)',
                            transition: 'all 0.2s ease'
                        }}
                    >
                        <Square size={18} color="#475569" /> 중지
                    </button>

                    <button
                        onClick={handleReset}
                        style={{
                            flex: 1,
                            padding: '16px',
                            borderRadius: '16px',
                            fontSize: '1.2rem',
                            fontWeight: 'bold',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '8px',
                            background: '#f8fafc',
                            border: '1px solid #cbd5e1',
                            color: '#475569',
                            cursor: 'pointer',
                            boxShadow: '0 4px 6px rgba(0,0,0,0.02)',
                            transition: 'all 0.2s ease'
                        }}
                    >
                        <RotateCcw size={18} color="#475569" /> 리셋
                    </button>
                </div>
            </div>

            <style>{`
                @keyframes ping {
                    0% { transform: scale(1); opacity: 1; }
                    70%, 100% { transform: scale(1.1); opacity: 0; }
                }
            `}</style>
        </div>
    );
}
