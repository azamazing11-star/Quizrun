import React, { useEffect } from 'react';
import FireworksOverlay from './FireworksOverlay';
import Confetti from 'react-confetti';
import { playSound } from '../utils/audio';

export default function GameFinishBanner({
    show = false,
    type = 'win', // 'win', 'lose', 'gameover', 'clear'
    title = '게임 종료',
    subtitle = '',
    scoreText = '',
    onRestart,
    onClose,
    restartText = '다시 도전하기',
    closeText = '결과 살펴보기',
    celebrate = true
}) {
    useEffect(() => {
        if (!show) return;
        if (type === 'win' || type === 'clear') {
            try {
                playSound('fanfare');
            } catch (e) {}
        } else if (type === 'lose') {
            try {
                playSound('wrong');
            } catch (e) {}
        } else {
            try {
                playSound('reveal');
            } catch (e) {}
        }
    }, [show, type]);

    if (!show) return null;

    const isCelebration = celebrate && (type === 'win' || type === 'clear');

    const badgeIcon = 
        type === 'win' ? '👑' :
        type === 'clear' ? '🎉' :
        type === 'lose' ? '💥' : '🏁';

    const headerColor =
        type === 'win' ? '#f59e0b' :
        type === 'clear' ? '#10b981' :
        type === 'lose' ? '#ef4444' : '#3b82f6';

    return (
        <div 
            style={{
                position: 'fixed',
                inset: 0,
                zIndex: 9998,
                backgroundColor: 'rgba(15, 23, 42, 0.72)',
                backdropFilter: 'blur(6px)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '1rem',
                animation: 'bannerFadeIn 0.3s ease-out'
            }}
        >
            {isCelebration && (
                <>
                    <FireworksOverlay active={true} duration={6000} />
                    <Confetti
                        width={window.innerWidth}
                        height={window.innerHeight}
                        recycle={false}
                        numberOfPieces={300}
                        gravity={0.25}
                    />
                </>
            )}

            <div
                style={{
                    position: 'relative',
                    zIndex: 10000,
                    maxWidth: '420px',
                    width: '100%',
                    backgroundColor: '#ffffff',
                    borderRadius: '24px',
                    padding: '2rem 1.5rem',
                    textAlign: 'center',
                    boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.35), 0 0 0 1px rgba(255, 255, 255, 0.1)',
                    animation: 'bannerPop 0.35s cubic-bezier(0.175, 0.885, 0.32, 1.275)'
                }}
            >
                {/* Glow ring */}
                <div
                    style={{
                        width: '84px',
                        height: '84px',
                        margin: '-42px auto 1rem auto',
                        borderRadius: '50%',
                        backgroundColor: '#ffffff',
                        border: `4px solid ${headerColor}`,
                        boxShadow: `0 10px 25px -5px ${headerColor}88`,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '2.8rem'
                    }}
                >
                    {badgeIcon}
                </div>

                <div
                    style={{
                        display: 'inline-block',
                        padding: '4px 14px',
                        borderRadius: '999px',
                        backgroundColor: `${headerColor}18`,
                        color: headerColor,
                        fontWeight: '800',
                        fontSize: '0.85rem',
                        letterSpacing: '0.05em',
                        textTransform: 'uppercase',
                        marginBottom: '0.5rem'
                    }}
                >
                    {type === 'win' ? 'VICTORY' : type === 'clear' ? 'CLEAR' : type === 'lose' ? 'GAME OVER' : 'ROUND FINISH'}
                </div>

                <h2
                    style={{
                        margin: '0.25rem 0 0.5rem 0',
                        fontSize: '1.8rem',
                        fontWeight: '900',
                        color: '#0f172a',
                        letterSpacing: '-0.02em'
                    }}
                >
                    {title}
                </h2>

                {subtitle && (
                    <p
                        style={{
                            margin: '0 0 1rem 0',
                            fontSize: '1.05rem',
                            color: '#475569',
                            fontWeight: '600'
                        }}
                    >
                        {subtitle}
                    </p>
                )}

                {scoreText && (
                    <div
                        style={{
                            backgroundColor: '#f8fafc',
                            border: '1.5px dashed #cbd5e1',
                            borderRadius: '16px',
                            padding: '1rem',
                            margin: '1rem 0 1.5rem 0'
                        }}
                    >
                        <div style={{ fontSize: '0.85rem', color: '#64748b', fontWeight: '700' }}>획득 점수</div>
                        <div style={{ fontSize: '1.8rem', fontWeight: '900', color: headerColor }}>{scoreText}</div>
                    </div>
                )}

                <div style={{ display: 'flex', gap: '10px', marginTop: '1.5rem' }}>
                    {onClose && (
                        <button
                            onClick={onClose}
                            style={{
                                flex: 1,
                                padding: '12px 16px',
                                borderRadius: '14px',
                                border: '1.5px solid #cbd5e1',
                                backgroundColor: '#f1f5f9',
                                color: '#475569',
                                fontWeight: '700',
                                fontSize: '0.95rem',
                                cursor: 'pointer',
                                transition: 'all 0.15s ease'
                            }}
                        >
                            {closeText}
                        </button>
                    )}
                    {onRestart && (
                        <button
                            onClick={onRestart}
                            style={{
                                flex: 1.5,
                                padding: '12px 18px',
                                borderRadius: '14px',
                                border: 'none',
                                background: `linear-gradient(135deg, ${headerColor}, #d97706)`,
                                color: '#ffffff',
                                fontWeight: '800',
                                fontSize: '1.05rem',
                                cursor: 'pointer',
                                boxShadow: `0 8px 20px -4px ${headerColor}88`,
                                transition: 'all 0.15s ease'
                            }}
                        >
                            {restartText}
                        </button>
                    )}
                </div>
            </div>

            <style>{`
                @keyframes bannerFadeIn {
                    from { opacity: 0; }
                    to { opacity: 1; }
                }
                @keyframes bannerPop {
                    from { transform: scale(0.85); opacity: 0; }
                    to { transform: scale(1); opacity: 1; }
                }
            `}</style>
        </div>
    );
}
