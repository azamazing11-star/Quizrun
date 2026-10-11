import React, { useState, useEffect, useRef } from 'react';
import { Sparkles, Trophy, ArrowLeft, Send, AlertCircle, CheckCircle, RotateCcw, Home, Crown, Medal } from 'lucide-react';
import { playSound } from '../utils/audio';

export default function WordBombArena({
    syllable = '가',
    timeLeft = 15,
    participants = [],
    activePlayerIndex = 0,
    eliminated = [],
    usedWords = [],
    winner = null,
    rankings = null,
    onSubmitWord,
    onExitGame,
    onRestartGame,
    isHost = false,
    isSubScreen = false
}) {
    const [wordInput, setWordInput] = useState('');
    const [feedback, setFeedback] = useState(null);
    const inputRef = useRef(null);

    // Auto-focus input when syllable changes or game progresses
    useEffect(() => {
        if (inputRef.current) {
            inputRef.current.focus();
        }
    }, [syllable, activePlayerIndex]);

    const handleSubmit = (e) => {
        e.preventDefault();
        const clean = wordInput.trim();
        if (!clean) return;

        if (clean.length < 2) {
            setFeedback({ type: 'error', text: '⚠️ 2글자 이상 단어를 입력해주세요!' });
            playSound('wrong');
            return;
        }

        if (syllable && !clean.includes(syllable)) {
            setFeedback({ type: 'error', text: `⚠️ '${syllable}' 글자가 반드시 포함되어야 합니다!` });
            playSound('wrong');
            return;
        }

        if (usedWords.includes(clean)) {
            setFeedback({ type: 'error', text: `⚠️ '${clean}'은(는) 이미 제출한 답입니다!` });
            playSound('wrong');
            return;
        }

        // Valid word
        if (onSubmitWord) {
            const success = onSubmitWord(clean);
            if (success !== false) {
                setWordInput('');
                setFeedback({ type: 'success', text: `🎉 '${clean}' 정답 통과 (+10점)! 다음 차례로 넘어갑니다!` });
                setTimeout(() => setFeedback(null), 1500);
            }
        }
    };

    const activePlayer = participants[activePlayerIndex];
    const activePlayerName = activePlayer ? activePlayer.nickname : '호스트';

    // Build ranking list for end-game display
    const displayRankings = (() => {
        if (rankings && Array.isArray(rankings) && rankings.length > 0) {
            return rankings;
        }
        if (participants && participants.length > 0) {
            return [...participants]
                .sort((a, b) => {
                    const aWinner = a.nickname === winner;
                    const bWinner = b.nickname === winner;
                    if (aWinner && !bWinner) return -1;
                    if (!aWinner && bWinner) return 1;
                    return (b.score || 0) - (a.score || 0);
                })
                .map((p, idx) => ({
                    rank: idx + 1,
                    id: p.id,
                    nickname: p.nickname,
                    score: p.score || 0,
                    isWinner: p.nickname === winner,
                    isEliminated: eliminated.includes(p.id)
                }));
        }
        return [{
            rank: 1,
            id: 'host',
            nickname: winner || '호스트',
            score: usedWords.length * 10,
            isWinner: true,
            isEliminated: false
        }];
    })();

    return (
        <div style={{
            width: '100%',
            maxWidth: '960px',
            margin: '0 auto',
            padding: '1rem',
            textAlign: 'center',
            display: 'flex',
            flexDirection: 'column',
            gap: '16px'
        }}>
            {/* Header info bar */}
            <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                background: '#ffffff',
                padding: '12px 20px',
                borderRadius: '20px',
                border: '2px solid #e2e8f0',
                boxShadow: '0 4px 12px rgba(0,0,0,0.03)'
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontSize: '1.5rem' }}>💣</span>
                    <span style={{ fontSize: '1.25rem', fontWeight: '900', color: '#e11d48', letterSpacing: '1px' }}>
                        단어 폭탄 (Word Bomb)
                    </span>
                    <span style={{
                        background: '#ffe4e6',
                        color: '#f43f5e',
                        padding: '2px 8px',
                        borderRadius: '12px',
                        fontSize: '0.75rem',
                        fontWeight: 'bold'
                    }}>
                        실시간 배틀 (+10점)
                    </span>
                </div>

                {onExitGame && (
                    <button
                        onClick={onExitGame}
                        className="glass-button"
                        style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.9rem', fontWeight: 'bold' }}
                    >
                        <ArrowLeft size={16} /> 나가기
                    </button>
                )}
            </div>

            {winner ? (
                /* Winner & Final Leaderboard Screen */
                <div className="animate-pop-in" style={{
                    background: 'linear-gradient(135deg, #fff1f2 0%, #fff7ed 100%)',
                    border: '3px solid #f43f5e',
                    borderRadius: '32px',
                    padding: '2.5rem 2rem',
                    boxShadow: '0 20px 50px rgba(244, 63, 94, 0.15)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '20px'
                }}>
                    <div>
                        <div style={{ fontSize: '5rem', marginBottom: '8px' }}>👑</div>
                        <h1 style={{ fontSize: '3rem', fontWeight: '950', color: '#e11d48', margin: '0 0 8px 0', fontFamily: 'Jua, sans-serif' }}>
                            {winner} 최종 승리!
                        </h1>
                        <p style={{ fontSize: '1.2rem', color: '#64748b', margin: 0, fontWeight: '700' }}>
                            모든 폭탄을 피하고 새로운 단어로 최후까지 살아남았습니다! 🎉
                        </p>
                    </div>

                    {/* Final Rankings Leaderboard */}
                    <div style={{
                        background: 'rgba(255, 255, 255, 0.95)',
                        border: '2px solid #fecdd3',
                        borderRadius: '24px',
                        padding: '1.5rem',
                        boxShadow: '0 8px 20px rgba(0,0,0,0.04)'
                    }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', marginBottom: '16px' }}>
                            <Trophy size={26} color="#e11d48" />
                            <h2 style={{ margin: 0, fontSize: '1.5rem', fontWeight: '900', color: '#1e293b' }}>
                                최종 순위표
                            </h2>
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', maxWidth: '600px', margin: '0 auto' }}>
                            {displayRankings.map((p, idx) => {
                                const medal = idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : `${idx + 1}위`;
                                const bg = idx === 0 
                                    ? 'linear-gradient(135deg, #fef3c7, #fde68a)' 
                                    : idx === 1 
                                    ? 'linear-gradient(135deg, #f1f5f9, #e2e8f0)' 
                                    : idx === 2 
                                    ? 'linear-gradient(135deg, #ffedd5, #fed7aa)' 
                                    : '#ffffff';
                                const border = idx === 0 
                                    ? '2px solid #f59e0b' 
                                    : idx === 1 
                                    ? '2px solid #94a3b8' 
                                    : idx === 2 
                                    ? '2px solid #ea580c' 
                                    : '1.5px solid #e2e8f0';

                                return (
                                    <div
                                        key={p.id || idx}
                                        style={{
                                            background: bg,
                                            border,
                                            borderRadius: '16px',
                                            padding: '14px 24px',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'space-between',
                                            boxShadow: idx === 0 ? '0 6px 16px rgba(245, 158, 11, 0.25)' : '0 2px 6px rgba(0,0,0,0.03)',
                                            transform: idx === 0 ? 'scale(1.02)' : 'none',
                                            transition: 'all 0.2s'
                                        }}
                                    >
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                                            <span style={{ fontSize: idx < 3 ? '1.8rem' : '1.2rem', fontWeight: '900' }}>
                                                {medal}
                                            </span>
                                            <div style={{ textAlign: 'left' }}>
                                                <span style={{ fontSize: '1.25rem', fontWeight: '900', color: '#1e293b' }}>
                                                    {p.nickname}
                                                </span>
                                                {p.isWinner && (
                                                    <span style={{ marginLeft: '8px', background: '#e11d48', color: 'white', fontSize: '0.75rem', padding: '2px 8px', borderRadius: '10px', fontWeight: 'bold' }}>
                                                        생존 우승 👑
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                        <div style={{ fontSize: '1.4rem', fontWeight: '950', color: '#e11d48' }}>
                                            {p.score || 0}점
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    {/* Summary of words matched during the game */}
                    <div style={{
                        background: 'rgba(255, 255, 255, 0.85)',
                        border: '1.5px solid #fecdd3',
                        borderRadius: '20px',
                        padding: '14px 18px',
                        textAlign: 'center'
                    }}>
                        <div style={{ color: '#64748b', fontSize: '0.95rem', fontWeight: 'bold', marginBottom: '8px' }}>
                            📜 이번 경기에서 맞춘 단어 총 <strong>{usedWords.length}</strong>개
                        </div>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', justifyContent: 'center', maxHeight: '120px', overflowY: 'auto' }}>
                            {usedWords.map((w, idx) => (
                                <span key={idx} style={{
                                    background: '#ffffff',
                                    border: '1px solid #cbd5e1',
                                    color: '#1e293b',
                                    padding: '4px 12px',
                                    borderRadius: '10px',
                                    fontSize: '0.9rem',
                                    fontWeight: '800'
                                }}>
                                    #{idx + 1} {w}
                                </span>
                            ))}
                        </div>
                    </div>

                    {/* Host action buttons */}
                    {isHost && (
                        <div style={{ display: 'flex', gap: '16px', justifyContent: 'center', marginTop: '8px' }}>
                            {onRestartGame && (
                                <button
                                    onClick={onRestartGame}
                                    className="primary-btn"
                                    style={{
                                        background: '#e11d48',
                                        color: 'white',
                                        padding: '14px 28px',
                                        borderRadius: '16px',
                                        fontSize: '1.2rem',
                                        fontWeight: '900',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '8px',
                                        boxShadow: '0 8px 20px rgba(225, 29, 72, 0.3)',
                                        cursor: 'pointer'
                                    }}
                                >
                                    <RotateCcw size={20} /> 새 단어 폭탄 게임 시작
                                </button>
                            )}
                            {onExitGame && (
                                <button
                                    onClick={onExitGame}
                                    className="glass-button"
                                    style={{
                                        padding: '14px 24px',
                                        borderRadius: '16px',
                                        fontSize: '1.1rem',
                                        fontWeight: '800',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '8px',
                                        cursor: 'pointer'
                                    }}
                                >
                                    <Home size={20} /> 게임런 홈으로
                                </button>
                            )}
                        </div>
                    )}
                </div>
            ) : (
                /* Main Playing Area */
                <>
                    {/* Ticking Bomb & Timer */}
                    <div style={{ position: 'relative', width: '200px', height: '200px', margin: '0 auto' }}>
                        <div style={{
                            fontSize: '9rem',
                            lineHeight: '200px',
                            animation: timeLeft <= 4 ? 'spin 0.25s linear infinite' : 'levitate 1.2s ease-in-out infinite'
                        }}>
                            💣
                        </div>
                        <div style={{
                            position: 'absolute',
                            top: '10px',
                            right: '10px',
                            width: '56px',
                            height: '56px',
                            borderRadius: '50%',
                            background: timeLeft <= 4 ? '#ef4444' : '#f97316',
                            color: 'white',
                            fontSize: '1.8rem',
                            fontWeight: '950',
                            lineHeight: '56px',
                            textAlign: 'center',
                            border: '3px solid white',
                            boxShadow: timeLeft <= 4 ? '0 0 20px rgba(239, 68, 68, 0.8)' : '0 0 10px rgba(249, 115, 22, 0.5)',
                            transition: 'all 0.2s'
                        }}>
                            {timeLeft}
                        </div>
                    </div>

                    {/* Syllable Requirement Card */}
                    <div style={{
                        background: 'linear-gradient(135deg, #fff1f2 0%, #ffe4e6 100%)',
                        border: '3px solid #f43f5e',
                        borderRadius: '24px',
                        padding: '1.5rem',
                        boxShadow: '0 8px 25px rgba(244, 63, 94, 0.12)'
                    }}>
                        <div style={{ color: '#f43f5e', fontSize: '1.1rem', fontWeight: '900', letterSpacing: '1px' }}>
                            제시어 조건 (맞추면 +10점!)
                        </div>
                        <div style={{
                            fontSize: '4.8rem',
                            fontWeight: '950',
                            color: '#e11d48',
                            lineHeight: '1.1',
                            margin: '8px 0',
                            fontFamily: 'Jua, sans-serif'
                        }}>
                            {syllable}
                        </div>
                        <div style={{ color: '#64748b', fontSize: '1rem', fontWeight: '700' }}>
                            위 글자가 <strong>포함된</strong> 2글자 이상 단어를 입력하세요!
                        </div>
                    </div>

                    {/* PROMINENT: Used Words History Tag Cloud (중복 사용 방지 목록) */}
                    <div style={{
                        background: '#ffffff',
                        border: '2px solid #e2e8f0',
                        borderRadius: '20px',
                        padding: '16px 20px',
                        textAlign: 'center',
                        boxShadow: '0 4px 12px rgba(0,0,0,0.03)'
                    }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                            <span style={{ color: '#e11d48', fontSize: '1rem', fontWeight: '900', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                📜 맞춘 단어 목록 (중복 제출 불가)
                            </span>
                            <span style={{
                                background: '#ffe4e6',
                                color: '#e11d48',
                                padding: '3px 10px',
                                borderRadius: '12px',
                                fontSize: '0.85rem',
                                fontWeight: '800'
                            }}>
                                총 {usedWords.length}개
                            </span>
                        </div>
                        <div style={{
                            display: 'flex',
                            flexWrap: 'wrap',
                            gap: '8px',
                            justifyContent: 'center',
                            maxHeight: '120px',
                            overflowY: 'auto',
                            padding: '4px'
                        }}>
                            {usedWords.map((w, idx) => (
                                <span
                                    key={idx}
                                    style={{
                                        background: '#f8fafc',
                                        padding: '6px 12px',
                                        borderRadius: '10px',
                                        fontSize: '0.95rem',
                                        border: '1.5px solid #cbd5e1',
                                        color: '#334155',
                                        fontWeight: '800',
                                        boxShadow: '0 2px 4px rgba(0,0,0,0.02)'
                                    }}
                                >
                                    #{idx + 1} {w}
                                </span>
                            ))}
                            {usedWords.length === 0 && (
                                <span style={{ color: '#94a3b8', fontSize: '0.95rem', padding: '8px', fontStyle: 'italic' }}>
                                    아직 사용된 단어가 없습니다. 자유롭게 단어를 입력하세요!
                                </span>
                            )}
                        </div>
                    </div>

                    {/* Direct On-Screen Word Input Box (Main / Sub Monitor) */}
                    <div style={{
                        background: '#ffffff',
                        border: '2px solid #e2e8f0',
                        borderRadius: '20px',
                        padding: '16px 20px',
                        boxShadow: '0 4px 12px rgba(0,0,0,0.03)'
                    }}>
                        <form onSubmit={handleSubmit} style={{ display: 'flex', gap: '10px', maxWidth: '540px', margin: '0 auto' }}>
                            <input
                                ref={inputRef}
                                type="text"
                                placeholder={`'${syllable}' 글자가 포함된 단어 입력`}
                                value={wordInput}
                                onChange={(e) => setWordInput(e.target.value)}
                                style={{
                                    flex: 1,
                                    padding: '12px 18px',
                                    borderRadius: '14px',
                                    border: '2px solid #cbd5e1',
                                    fontSize: '1.25rem',
                                    fontWeight: 'bold',
                                    textAlign: 'center',
                                    outline: 'none',
                                    boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.04)'
                                }}
                            />
                            <button
                                type="submit"
                                style={{
                                    background: '#e11d48',
                                    color: 'white',
                                    padding: '12px 24px',
                                    borderRadius: '14px',
                                    border: 'none',
                                    fontSize: '1.1rem',
                                    fontWeight: '900',
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '6px',
                                    boxShadow: '0 4px 12px rgba(225, 29, 72, 0.3)'
                                }}
                            >
                                <Send size={18} /> 제출
                            </button>
                        </form>

                        {/* Feedback Toast */}
                        {feedback && (
                            <div style={{
                                marginTop: '10px',
                                fontSize: '1.05rem',
                                fontWeight: '900',
                                padding: '8px 14px',
                                borderRadius: '10px',
                                background: feedback.type === 'error' ? '#fee2e2' : '#ecfdf5',
                                color: feedback.type === 'error' ? '#dc2626' : '#059669',
                                border: feedback.type === 'error' ? '1.5px solid #f87171' : '1.5px solid #34d399',
                                animation: 'popIn 0.3s ease'
                            }}>
                                {feedback.text}
                            </div>
                        )}
                    </div>

                    {/* Current Turn & Participants Bar with Live Scores */}
                    <div style={{
                        background: '#f8fafc',
                        border: '2px solid #e2e8f0',
                        borderRadius: '20px',
                        padding: '1.2rem',
                        textAlign: 'center'
                    }}>
                        <div style={{ color: '#64748b', fontSize: '1rem', fontWeight: '800', marginBottom: '12px' }}>
                            📢 현재 차례: <strong style={{ color: '#ef4444', fontSize: '1.2rem' }}>{activePlayerName}</strong>
                            {participants.length === 0 && ' (단독 플레이/모니터 직접 참여)'}
                        </div>

                        {participants.length > 0 ? (
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', justifyContent: 'center' }}>
                                {participants.map((p, idx) => {
                                    const isActive = idx === activePlayerIndex;
                                    const isEliminated = eliminated.includes(p.id);
                                    return (
                                        <div
                                            key={p.id}
                                            style={{
                                                padding: '10px 20px',
                                                borderRadius: '14px',
                                                fontSize: '1.05rem',
                                                fontWeight: 'bold',
                                                background: isEliminated ? '#e2e8f0' : (isActive ? '#ef4444' : '#ffffff'),
                                                color: isEliminated ? '#94a3b8' : (isActive ? '#ffffff' : '#1e293b'),
                                                border: isActive ? '3px solid #ef4444' : '2px solid #cbd5e1',
                                                transform: isActive ? 'scale(1.08)' : 'scale(1)',
                                                boxShadow: isActive ? '0 8px 16px rgba(239, 68, 68, 0.3)' : 'none',
                                                textDecoration: isEliminated ? 'line-through' : 'none',
                                                transition: 'all 0.3s',
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: '8px'
                                            }}
                                        >
                                            <span>{isEliminated ? '💥 ' : (isActive ? '⏱️ ' : '🏃 ')}</span>
                                            <span>{p.nickname}</span>
                                            <span style={{
                                                background: isActive ? 'rgba(255,255,255,0.3)' : '#f1f5f9',
                                                color: isActive ? '#ffffff' : '#e11d48',
                                                padding: '2px 8px',
                                                borderRadius: '8px',
                                                fontSize: '0.85rem',
                                                fontWeight: '900'
                                            }}>
                                                🏆 {p.score || 0}점
                                            </span>
                                        </div>
                                    );
                                })}
                            </div>
                        ) : (
                            <div style={{ color: '#94a3b8', fontSize: '0.88rem' }}>
                                모바일 참여자가 없어도 상단 입력창으로 단어를 맞추며 게임을 진행할 수 있습니다.
                            </div>
                        )}
                    </div>
                </>
            )}
        </div>
    );
}
