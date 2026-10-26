import React, { useState, useEffect } from 'react';
import Confetti from 'react-confetti';
import { Trophy, X, XCircle } from 'lucide-react';
import { playSound } from '../utils/audio';
import { formatKoreanMoney } from '../utils/format';

/**
 * FinalLeaderboardModal
 * 
 * Synchronized across Main Monitor and Sub-Monitor.
 * Displays final results/standings with fanfare and confetti.
 * Provides two unified exit buttons:
 *  1. 🛑 게임 종료 (홈으로 복귀, 점수 및 참여자 접속 유지)
 *  2. ✕ 최종 결과창 닫기 (전체 세션 완전 종료, 모든 참가자 퇴장)
 */
export default function FinalLeaderboardModal({
    isOpen = false,
    onClose,
    onTerminateSession,
    onEndCurrentGame,
    participants = [],
    isStockGame = false,
    isSubScreen = false,
    gameMode = 'online',
    title = null
}) {
    const [confettiActive, setConfettiActive] = useState(true);

    useEffect(() => {
        if (isOpen) {
            setConfettiActive(true);
            try {
                playSound('fanfare');
            } catch (e) {}
            const timer = setTimeout(() => setConfettiActive(false), 7000);
            return () => clearTimeout(timer);
        }
    }, [isOpen]);

    if (!isOpen) return null;

        // Filter host out of rankings for demonstration
    const hostEntry = participants.find(p => p.isHost || String(p.nickname || p.num).toLowerCase() === 'host');
    const realParticipants = participants.filter(p => !p.isHost && String(p.nickname || p.num).toLowerCase() !== 'host');

    // Ensure participants in stock games default to initial seed (1,000,000) if score is 0
    const normalizedParticipants = realParticipants.map(p => {
        let score = Number(p.score) || 0;
        if (isStockGame && score === 0) {
            score = 1000000;
        }
        return {
            ...p,
            nickname: p.nickname || p.num || '참가자',
            score
        };
    });

    // Sort real participants by score descending
    const sortedParticipants = [...normalizedParticipants].sort((a, b) => (b.score || 0) - (a.score || 0));

    const normalizedHost = hostEntry ? {
        ...hostEntry,
        nickname: hostEntry.nickname || hostEntry.num || 'Host',
        score: isStockGame && (!hostEntry.score || hostEntry.score === 0) ? 1000000 : (Number(hostEntry.score) || 0),
        isHost: true
    } : null;

    // Combined list: Host first (marked as excluded from rankings), then sorted participants
    const allDisplayList = [
        ...(normalizedHost ? [normalizedHost] : []),
        ...sortedParticipants
    ];

    const maxScore = sortedParticipants.length > 0 ? (sortedParticipants[0].score || 0) : 0;

    return (
        <div style={{
            position: 'fixed',
            inset: 0,
            width: '100vw',
            height: '100vh',
            background: 'rgba(15, 23, 42, 0.75)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 99999,
            backdropFilter: 'blur(10px)',
            animation: 'fadeIn 0.2s ease-out'
        }}>
            {confettiActive && <Confetti recycle={false} numberOfPieces={550} />}

            <div style={{
                position: 'relative',
                padding: '2.4rem 2rem',
                maxWidth: '540px',
                width: '92%',
                textAlign: 'center',
                background: '#ffffff',
                borderRadius: '28px',
                boxShadow: '0 25px 60px rgba(0,0,0,0.35)',
                maxHeight: '92vh',
                display: 'flex',
                flexDirection: 'column',
                overflow: 'hidden',
                border: '2px solid rgba(255,255,255,0.8)'
            }}>
                {/* Close Button (Temporary Dismiss) */}
                <button
                    type="button"
                    onClick={onClose}
                    style={{
                        position: 'absolute',
                        top: '16px',
                        right: '16px',
                        background: '#f1f5f9',
                        border: 'none',
                        borderRadius: '50%',
                        width: '36px',
                        height: '36px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        cursor: 'pointer',
                        fontSize: '1.1rem',
                        fontWeight: 'bold',
                        color: '#64748b',
                        boxShadow: '0 2px 6px rgba(0,0,0,0.08)',
                        zIndex: 10
                    }}
                    title="결과창 임시 닫기"
                >
                    ✕
                </button>

                <div style={{ fontSize: '3.6rem', lineHeight: '1', marginBottom: '0.4rem' }}>🏆</div>
                <h2 style={{ fontSize: '1.9rem', margin: '0 0 0.3rem', color: '#d97706', fontWeight: '900', fontFamily: 'Jua, sans-serif' }}>
                    {title || (isStockGame ? '최종 투자 수익 결과 발표!' : '최종 게임 결과 발표!')}
                </h2>
                <p style={{ color: '#64748b', margin: '0 0 1.2rem', fontSize: '0.92rem', fontWeight: '600' }}>
                    {isStockGame 
                        ? '모든 연도의 투자 게임이 종료되었습니다. 최종 투자 자산 순위표를 확인하세요!' 
                        : '모든 라운드가 종료되었습니다. 최종 순위표를 확인하세요!'}
                </p>

                {/* Host Demonstration Banner (If Host is participating) */}
                {hostEntry && (
                    <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '10px 16px',
                        background: 'linear-gradient(135deg, #f5f3ff 0%, #ede9fe 100%)',
                        borderRadius: '14px',
                        border: '1.5px solid #c4b5fd',
                        marginBottom: '1.2rem',
                        boxShadow: '0 2px 8px rgba(99, 102, 241, 0.08)'
                    }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span style={{ fontSize: '1.25rem' }}>📊</span>
                            <div style={{ textAlign: 'left' }}>
                                <div style={{ fontWeight: '900', color: '#4338ca', fontSize: '0.92rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                    Host
                                    <span style={{ fontSize: '0.72rem', background: '#c7d2fe', color: '#3730a3', padding: '1px 6px', borderRadius: '4px', fontWeight: '900' }}>
                                        진행자 시연 [순위 제외]
                                    </span>
                                </div>
                                <div style={{ fontSize: '0.73rem', color: '#6366f1', fontWeight: '700' }}>
                                    * 설명/시연용으로 순위 메달 산정에서 제외됩니다.
                                </div>
                            </div>
                        </div>
                        <span style={{ fontWeight: '900', color: '#4338ca', fontSize: '1.15rem' }}>
                            {isStockGame ? formatKoreanMoney(hostEntry.score) : `${(hostEntry.score || 0).toLocaleString()}점`}
                        </span>
                    </div>
                )}

                {/* Top 3 Podium (Real Participants Only) */}
                {sortedParticipants.length >= 2 && (
                    <div style={{
                        display: 'flex',
                        alignItems: 'flex-end',
                        justifyContent: 'center',
                        gap: '10px',
                        marginBottom: '1.4rem',
                        padding: '10px 0'
                    }}>
                        {/* 2nd Place */}
                        {sortedParticipants[1] && (
                            <div style={{
                                flex: 1,
                                display: 'flex',
                                flexDirection: 'column',
                                alignItems: 'center',
                                background: 'linear-gradient(180deg, #f1f5f9 0%, #e2e8f0 100%)',
                                borderRadius: '16px 16px 10px 10px',
                                padding: '12px 8px',
                                border: '2px solid #cbd5e1'
                            }}>
                                <span style={{ fontSize: '1.8rem' }}>🥈</span>
                                <span style={{ fontWeight: '900', fontSize: '0.92rem', color: '#475569', marginTop: '2px', wordBreak: 'break-all' }}>
                                    {sortedParticipants[1].nickname || sortedParticipants[1].num}
                                </span>
                                <span style={{ fontSize: isStockGame ? '0.95rem' : '1.1rem', fontWeight: '900', color: isStockGame ? '#059669' : '#2563eb', marginTop: '4px' }}>
                                    {isStockGame ? formatKoreanMoney(sortedParticipants[1].score) : `${(sortedParticipants[1].score || 0).toLocaleString()}점`}
                                </span>
                                <span style={{ fontSize: '0.72rem', fontWeight: '800', color: '#64748b' }}>2위</span>
                            </div>
                        )}

                        {/* 1st Place */}
                        {sortedParticipants[0] && (
                            <div style={{
                                flex: 1.2,
                                display: 'flex',
                                flexDirection: 'column',
                                alignItems: 'center',
                                background: 'linear-gradient(180deg, #fef3c7 0%, #fde68a 100%)',
                                borderRadius: '20px 20px 12px 12px',
                                padding: '16px 10px',
                                border: '2.5px solid #f59e0b',
                                boxShadow: '0 8px 24px rgba(245, 158, 11, 0.35)',
                                transform: 'translateY(-10px)'
                            }}>
                                <span style={{ fontSize: '2.4rem' }}>👑</span>
                                <span style={{ fontWeight: '900', fontSize: '1.05rem', color: '#92400e', marginTop: '2px', wordBreak: 'break-all' }}>
                                    {sortedParticipants[0].nickname || sortedParticipants[0].num}
                                </span>
                                <span style={{ fontSize: isStockGame ? '1.15rem' : '1.4rem', fontWeight: '900', color: '#b45309', marginTop: '4px' }}>
                                    {isStockGame ? formatKoreanMoney(sortedParticipants[0].score) : `${(sortedParticipants[0].score || 0).toLocaleString()}점`}
                                </span>
                                <span style={{ fontSize: '0.78rem', fontWeight: '900', color: '#d97706', background: 'white', padding: '2px 8px', borderRadius: '10px', marginTop: '4px' }}>
                                    {isStockGame ? '👑 1위 (최고 투자왕)' : '👑 1위 (챔피언)'}
                                </span>
                            </div>
                        )}

                        {/* 3rd Place */}
                        {sortedParticipants[2] && (
                            <div style={{
                                flex: 1,
                                display: 'flex',
                                flexDirection: 'column',
                                alignItems: 'center',
                                background: 'linear-gradient(180deg, #ffedd5 0%, #fed7aa 100%)',
                                borderRadius: '16px 16px 10px 10px',
                                padding: '10px 8px',
                                border: '2px solid #fdba74'
                            }}>
                                <span style={{ fontSize: '1.6rem' }}>🥉</span>
                                <span style={{ fontWeight: '900', fontSize: '0.88rem', color: '#9a3412', marginTop: '2px', wordBreak: 'break-all' }}>
                                    {sortedParticipants[2].nickname || sortedParticipants[2].num}
                                </span>
                                <span style={{ fontSize: isStockGame ? '0.92rem' : '1.05rem', fontWeight: '900', color: '#c2410c', marginTop: '4px' }}>
                                    {isStockGame ? formatKoreanMoney(sortedParticipants[2].score) : `${(sortedParticipants[2].score || 0).toLocaleString()}점`}
                                </span>
                                <span style={{ fontSize: '0.72rem', fontWeight: '800', color: '#ea580c' }}>3위</span>
                            </div>
                        )}
                    </div>
                )}

                {/* Full Standings List */}
                <div style={{
                    flex: 1,
                    overflowY: 'auto',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '6px',
                    marginBottom: '1.4rem',
                    paddingRight: '2px',
                    maxHeight: '220px'
                }}>
                    {allDisplayList.map((p, idx) => {
                        const isHost = !!p.isHost;
                        const realIdx = hostEntry ? idx - 1 : idx;
                        const isWinner = !isHost && (p.score === maxScore && maxScore > 0);
                        const rankTitle = isHost 
                            ? 'Host' 
                            : (realIdx === 0 ? '👑 1위 ' : realIdx === 1 ? '🥈 2위 ' : realIdx === 2 ? '🥉 3위 ' : `#${realIdx + 1} `);
                        const displayName = isHost ? '' : (p.nickname || (gameMode === 'online' ? p.num : `${p.num}번`));

                        return (
                            <div
                                key={p.id || p.nickname || p.num || idx}
                                style={{
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    alignItems: 'center',
                                    padding: '0.75rem 1.2rem',
                                    borderRadius: '14px',
                                    background: isHost
                                        ? 'linear-gradient(135deg, #f5f3ff 0%, #ede9fe 100%)'
                                        : (isWinner ? 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)' : '#f8fafc'),
                                    color: isHost ? '#4338ca' : (isWinner ? 'white' : '#1e293b'),
                                    border: isHost ? '1.5px solid #c4b5fd' : (isWinner ? 'none' : '1.5px solid #e2e8f0'),
                                    boxShadow: isWinner ? '0 4px 14px rgba(245,158,11,0.35)' : 'none'
                                }}
                            >
                                <span style={{ fontWeight: '800', fontSize: '0.98rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                    {rankTitle} {displayName}
                                    {isHost && (
                                        <span style={{ fontSize: '0.7rem', background: '#c7d2fe', color: '#3730a3', padding: '1px 6px', borderRadius: '4px', fontWeight: '900' }}>
                                            진행자 시연 [순위 제외]
                                        </span>
                                    )}
                                </span>
                                <span style={{ fontSize: isStockGame ? '1.05rem' : '1.2rem', fontWeight: '900', color: isHost ? '#4338ca' : (isStockGame && !isWinner ? '#059669' : 'inherit') }}>
                                    {isStockGame ? formatKoreanMoney(p.score) : `${(p.score || 0).toLocaleString()}점`}
                                </span>
                            </div>
                        );
                    })}
                </div>

                {/* Unified Exit Action Buttons: Identical behavior on Main Monitor and Sub-Monitor */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <button
                        type="button"
                        style={{
                            width: '100%',
                            padding: '13px',
                            borderRadius: '14px',
                            border: 'none',
                            background: '#ef4444',
                            color: 'white',
                            fontWeight: '900',
                            fontSize: '1.02rem',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '6px',
                            boxShadow: '0 4px 14px rgba(239, 68, 68, 0.35)',
                            transition: 'all 0.15s ease'
                        }}
                        onClick={onTerminateSession}
                        title="결과창을 닫고 모든 참가자 퇴장 및 사이트 첫 화면으로 완전 초기화"
                    >
                        <X size={18} /> 최종 결과창 닫기 (전체 세션 종료)
                    </button>

                    <div style={{ display: 'flex', gap: '8px' }}>
                        <button
                            type="button"
                            style={{
                                flex: 1,
                                padding: '10px',
                                borderRadius: '12px',
                                border: '1.5px solid #cbd5e1',
                                background: '#f8fafc',
                                color: '#475569',
                                fontWeight: '800',
                                fontSize: '0.86rem',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '4px'
                            }}
                            onClick={onEndCurrentGame}
                            title="현재 게임만 종료하고 홈 대기실로 이동 (참여자 점수 및 접속 유지)"
                        >
                            <XCircle size={15} color="#ef4444" /> 🛑 게임 종료 (점수 유지)
                        </button>
                        <button
                            type="button"
                            style={{
                                flex: 1,
                                padding: '10px',
                                borderRadius: '12px',
                                border: '1.5px solid #cbd5e1',
                                background: '#f8fafc',
                                color: '#64748b',
                                fontWeight: '800',
                                fontSize: '0.86rem',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '4px'
                            }}
                            onClick={onClose}
                            title="결과창만 닫고 현재 화면 유지"
                        >
                            ✕ 결과창 닫기
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
