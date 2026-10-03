import React, { useState, useEffect } from 'react';
import { useGlobalSession } from '../context/GlobalSessionContext';
import QRCode from 'react-qr-code';
import Confetti from 'react-confetti';
import { playSound } from '../utils/audio';
import { getParticipantJoinUrl } from '../utils/url';
import { 
    Trophy, 
    Settings, 
    Monitor, 
    Globe, 
    Edit3, 
    Check, 
    Users, 
    Sparkles, 
    RefreshCw, 
    Copy, 
    CheckCircle2, 
    QrCode as QrIcon,
    TrendingUp,
    DollarSign,
    ArrowLeft,
    RotateCcw,
    Cloud
} from 'lucide-react';
import GitSyncModal from './GitSyncModal';

export default function RightSidebar({ socket, isStockGame: propIsStockGame = false, onExitToLobby, onEndGame }) {
    // Internal state to track stock game mode across windows (e.g. Sub-Monitor)
    const [isStockGameSync, setIsStockGameSync] = useState(() => {
        try {
            return localStorage.getItem('quizrun_active_game_id') === 'stock_game';
        } catch (e) {
            return false;
        }
    });

    const isStockGame = propIsStockGame || isStockGameSync;

    const {
        gameMode,
        setGameMode,
        participantCount,
        setParticipantCount,
        scores,
        adjustScore,
        setExactScore,
        resetScores,
        endSession,
        onlinePin,
        setOnlinePin,
        serverIp,
        setServerIp,
        publicUrl,
        setPublicUrl,
        onlineParticipants,
        setOnlineParticipants,
        createOnlineRoom
    } = useGlobalSession();

    const [editingNum, setEditingNum] = useState(null);
    const [tempScoreVal, setTempScoreVal] = useState('');
    const [showWinnerModal, setShowWinnerModal] = useState(false);
    const [confettiActive, setConfettiActive] = useState(false);
    const [isCopied, setIsCopied] = useState(false);
    const [showMiniQr, setShowMiniQr] = useState(false);
    const [showGitModal, setShowGitModal] = useState(false);
    const [bulkAmount, setBulkAmount] = useState(100000000);

    // Real-time synchronization of Stock Game mode for Sub-Monitor
    useEffect(() => {
        let screenChannel;
        let seedChannel;
        try {
            screenChannel = new BroadcastChannel('quizrun_screen_sync');
            screenChannel.onmessage = (e) => {
                const { type, payload } = e.data || {};
                if (type === 'STOCK_GAME_SCREEN_UPDATE') {
                    setIsStockGameSync(true);
                } else if (type === 'MODE_CHANGE') {
                    if (payload && payload.mode === 'stock_game') {
                        setIsStockGameSync(true);
                    } else if (payload && payload.mode && payload.mode !== 'stock_game') {
                        setIsStockGameSync(false);
                    }
                } else if (type === 'STATE_UPDATE') {
                    if (payload && payload.mode === 'stock_game') {
                        setIsStockGameSync(true);
                    } else if (payload && payload.mode && payload.mode !== 'stock_game') {
                        setIsStockGameSync(false);
                    }
                }
            };

            seedChannel = new BroadcastChannel('quizrun_stock_seed_sync');
            seedChannel.onmessage = () => {
                setIsStockGameSync(true);
            };
        } catch (e) {}

        const handleStockSync = () => {
            setIsStockGameSync(true);
        };

        if (socket) {
            socket.on('stock_game:state_sync', handleStockSync);
        }

        const intervalId = setInterval(() => {
            try {
                const activeGame = localStorage.getItem('quizrun_active_game_id');
                if (activeGame === 'stock_game') {
                    setIsStockGameSync(true);
                } else if (activeGame && activeGame !== 'stock_game') {
                    setIsStockGameSync(false);
                }
            } catch (e) {}
        }, 1000);

        return () => {
            if (screenChannel) screenChannel.close();
            if (seedChannel) seedChannel.close();
            if (socket) {
                socket.off('stock_game:state_sync', handleStockSync);
            }
            clearInterval(intervalId);
        };
    }, [socket]);

    const handleResetAllScores = () => {
        if (window.confirm("모든 참가자의 점수를 0점으로 초기화하시겠습니까?")) {
            resetScores();
            if (socket && onlinePin) {
                socket.emit('host:resetScores', { pin: onlinePin });
            }
        }
    };

    // Detect if this window is the Sub-Monitor screen
    const isSubScreen = Boolean(
        typeof window !== 'undefined' && (
            window.location.search.includes('subscreen=true') ||
            window.name === 'QuizrunSubScreenWindow' ||
            sessionStorage.getItem('is_subscreen') === 'true'
        )
    );

    useEffect(() => {
        if (!socket) return;

        const handleParticipantsUpdate = (participants) => {
            if (Array.isArray(participants)) {
                setOnlineParticipants(participants);
            }
        };

        const handleStateUpdate = (data) => {
            if (data && data.participants && Array.isArray(data.participants)) {
                setOnlineParticipants(data.participants);
            }
        };

        const handleTunnelUpdate = (data) => {
            if (data && data.publicUrl) {
                setPublicUrl(data.publicUrl);
            }
        };

        socket.on('host:participantsUpdated', handleParticipantsUpdate);
        socket.on('room:stateUpdate', handleStateUpdate);
        socket.on('tunnel:updated', handleTunnelUpdate);

        return () => {
            socket.off('host:participantsUpdated', handleParticipantsUpdate);
            socket.off('room:stateUpdate', handleStateUpdate);
            socket.off('tunnel:updated', handleTunnelUpdate);
        };
    }, [socket]);

    const joinUrl = getParticipantJoinUrl(onlinePin, publicUrl, serverIp);

    const handleCopyUrl = () => {
        navigator.clipboard.writeText(joinUrl);
        setIsCopied(true);
        setTimeout(() => setIsCopied(false), 2000);
    };

    const handleStartInlineEdit = (num, currentScore) => {
        setEditingNum(num);
        setTempScoreVal(String(currentScore));
    };

    // 주식 게임 모드 진입 시 오프라인 참여자 기본 투자금(1억원) 자동 초기화 (전원 0원인 경우)
    useEffect(() => {
        if (isStockGame) {
            if (gameMode === 'offline' && scores.length > 0 && scores.every(s => !s.score || s.score === 0)) {
                scores.forEach(s => setExactScore(s.num, 100000000));
            }
        }
    }, [isStockGame, gameMode]);

    const handleSaveInlineEdit = (num) => {
        if (tempScoreVal !== '') {
            const val = parseInt(tempScoreVal, 10);
            if (!isNaN(val)) {
                const finalVal = Math.max(0, val);
                if (gameMode === 'online') {
                    if (socket && onlinePin) {
                        socket.emit('host:adjustScore', { pin: onlinePin, nickname: num, exactScore: finalVal });
                    }
                    setOnlineParticipants(prev => prev.map(p => {
                        if (p.nickname === num) {
                            if (isStockGame) {
                                try {
                                    const bc = new BroadcastChannel('quizrun_stock_seed_sync');
                                    bc.postMessage({ type: 'SINGLE_SET_SEED', id: p.id || num, amount: finalVal });
                                    setTimeout(() => bc.close(), 300);
                                } catch (e) {}
                            }
                            return { ...p, score: finalVal };
                        }
                        return p;
                    }));
                } else {
                    setExactScore(num, finalVal);
                    if (isStockGame) {
                        try {
                            const bc = new BroadcastChannel('quizrun_stock_seed_sync');
                            bc.postMessage({ type: 'SINGLE_SET_SEED', id: num, amount: finalVal });
                            setTimeout(() => bc.close(), 300);
                        } catch (e) {}
                    }
                }
            }
        }
        setEditingNum(null);
    };

    const handleDeltaScore = (num, delta) => {
        if (gameMode === 'online') {
            if (socket && onlinePin) {
                socket.emit('host:adjustScore', { pin: onlinePin, nickname: num, delta });
            }
            setOnlineParticipants(prev => prev.map(p => {
                if (p.nickname === num) {
                    const nextScore = Math.max(0, (p.score || 0) + delta);
                    if (isStockGame) {
                        try {
                            const bc = new BroadcastChannel('quizrun_stock_seed_sync');
                            bc.postMessage({ type: 'SINGLE_SET_SEED', id: p.id || num, amount: nextScore });
                            setTimeout(() => bc.close(), 300);
                        } catch (e) {}
                    }
                    return { ...p, score: nextScore };
                }
                return p;
            }));
        } else {
            adjustScore(num, delta);
            if (isStockGame) {
                const target = scores.find(s => s.num === num);
                const nextScore = Math.max(0, (target ? target.score : 0) + delta);
                try {
                    const bc = new BroadcastChannel('quizrun_stock_seed_sync');
                    bc.postMessage({ type: 'SINGLE_SET_SEED', id: num, amount: nextScore });
                    setTimeout(() => bc.close(), 300);
                } catch (e) {}
            }
        }
    };

    // 일괄 금액 지정 핸들러 (온라인/오프라인 공통 지원)
    const handleApplyBulkAmount = () => {
        const amount = Number(bulkAmount) > 0 ? Number(bulkAmount) : 100000000;
        if (gameMode === 'online') {
            if (socket && onlinePin) {
                onlineParticipants.forEach(p => {
                    socket.emit('host:adjustScore', { pin: onlinePin, nickname: p.nickname, exactScore: amount });
                });
            }
            setOnlineParticipants(prev => prev.map(p => ({ ...p, score: amount })));
        } else {
            scores.forEach(s => {
                setExactScore(s.num, amount);
            });
        }

        // Broadcast to Stock Game and Sub-Monitor
        try {
            const bc = new BroadcastChannel('quizrun_stock_seed_sync');
            bc.postMessage({
                type: 'BULK_SET_SEED',
                amount
            });
            setTimeout(() => bc.close(), 300);
        } catch (e) {}

        playSound('submit');
        alert(`모든 참여자의 초기 투자금이 ${amount.toLocaleString()}원으로 일괄 설정되었습니다!`);
    };

    const handleOpenWinnerModal = () => {
        playSound('fanfare');
        setConfettiActive(true);
        setShowWinnerModal(true);
    };

    const handleResetScoresOnly = () => {
        const resetVal = isStockGame ? 100000000 : 0;
        if (gameMode === 'online') {
            if (socket && onlinePin) {
                if (isStockGame) {
                    onlineParticipants.forEach(p => {
                        socket.emit('host:adjustScore', { pin: onlinePin, nickname: p.nickname, exactScore: resetVal });
                    });
                } else {
                    socket.emit('host:resetScores', { pin: onlinePin });
                }
            }
            setOnlineParticipants(prev => prev.map(p => ({ ...p, score: resetVal })));
        } else {
            if (isStockGame) {
                scores.forEach(s => setExactScore(s.num, resetVal));
            } else {
                resetScores();
            }
        }
        if (isStockGame) {
            try {
                const bc = new BroadcastChannel('quizrun_stock_seed_sync');
                bc.postMessage({ type: 'BULK_SET_SEED', amount: resetVal });
                setTimeout(() => bc.close(), 300);
            } catch (e) {}
        }
        setShowWinnerModal(false);
    };

    const activeScores = gameMode === 'online' 
        ? onlineParticipants.map(p => ({ num: p.nickname, score: p.score || 0, isOnline: true })) 
        : scores.map(s => ({ num: `${s.num}번`, score: s.score || 0, isOnline: false }));

    const hasAnyScore = isStockGame
        ? activeScores.some(s => Number(s.score) > 0 && Number(s.score) !== (activeScores[0]?.score || 0))
        : activeScores.some(s => Number(s.score) > 0);

    const displayScores = hasAnyScore
        ? [...activeScores].sort((a, b) => Number(b.score) - Number(a.score))
        : [...activeScores];

    const sortedScores = displayScores;
    const maxScore = sortedScores.length > 0 ? Math.max(...activeScores.map(s => s.score)) : 0;

    // 초기 투자금 일괄 지정 UI 컴포넌트 (주식 게임 모드 전용)
    const renderBulkAmountTool = () => {
        if (!isStockGame) return null;
        return (
            <div style={{
                padding: '0.85rem 0.95rem',
                background: 'linear-gradient(135deg, #ecfdf5 0%, #f0fdf4 100%)',
                borderRadius: '16px',
                border: '1.5px solid #a7f3d0',
                display: 'flex',
                flexDirection: 'column',
                gap: '8px',
                boxShadow: '0 2px 6px rgba(16, 185, 129, 0.08)'
            }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span style={{ fontSize: '0.82rem', fontWeight: '800', color: '#065f46', display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <DollarSign size={14} color="#059669" /> 초기 투자금 일괄 지정
                    </span>
                    <span style={{ fontSize: '0.72rem', color: '#047857', fontWeight: '700' }}>
                        전체 참여자 적용
                    </span>
                </div>
                
                {/* Presets */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '4px' }}>
                    {[
                        { label: '3천만', val: 30000000 },
                        { label: '5천만', val: 50000000 },
                        { label: '1억', val: 100000000 },
                        { label: '2억', val: 200000000 }
                    ].map(p => (
                        <button
                            key={p.val}
                            type="button"
                            onClick={() => setBulkAmount(p.val)}
                            style={{
                                padding: '5px 0',
                                fontSize: '0.74rem',
                                fontWeight: bulkAmount === p.val ? '900' : '700',
                                borderRadius: '8px',
                                border: bulkAmount === p.val ? '1.5px solid #059669' : '1px solid #cbd5e1',
                                background: bulkAmount === p.val ? '#059669' : 'white',
                                color: bulkAmount === p.val ? 'white' : '#334155',
                                cursor: 'pointer',
                                transition: 'all 0.15s'
                            }}
                        >
                            {p.label}
                        </button>
                    ))}
                </div>

                {/* Direct amount input & Apply button */}
                <div style={{ display: 'flex', gap: '5px', alignItems: 'center' }}>
                    <div style={{ position: 'relative', flex: 1, display: 'flex', alignItems: 'center' }}>
                        <input
                            type="number"
                            step="10000000"
                            value={bulkAmount}
                            onChange={(e) => setBulkAmount(Number(e.target.value))}
                            style={{
                                width: '100%',
                                padding: '6px 26px 6px 8px',
                                fontSize: '0.82rem',
                                fontWeight: '800',
                                borderRadius: '8px',
                                border: '1.5px solid #10b981',
                                outline: 'none',
                                textAlign: 'right',
                                boxSizing: 'border-box'
                            }}
                        />
                        <span style={{ position: 'absolute', right: '7px', fontSize: '0.75rem', color: '#64748b', fontWeight: '800', pointerEvents: 'none' }}>
                            원
                        </span>
                    </div>
                    <button
                        type="button"
                        onClick={handleApplyBulkAmount}
                        style={{
                            padding: '6px 10px',
                            borderRadius: '8px',
                            border: 'none',
                            background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                            color: 'white',
                            fontWeight: '900',
                            fontSize: '0.78rem',
                            cursor: 'pointer',
                            whiteSpace: 'nowrap',
                            boxShadow: '0 2px 6px rgba(16, 185, 129, 0.3)'
                        }}
                    >
                        일괄 적용
                    </button>
                </div>
            </div>
        );
    };

    return (
        <>
            {/* Docked Glass Sidebar Panel */}
            <aside style={{
                width: '320px',
                minWidth: '320px',
                height: isStockGame ? '100%' : 'calc(100vh - 30px)',
                position: isStockGame ? 'relative' : 'sticky',
                top: isStockGame ? 0 : '15px',
                marginRight: isStockGame ? 0 : '15px',
                backgroundColor: 'rgba(255, 255, 255, 0.96)',
                backdropFilter: 'blur(20px)',
                borderRadius: '24px',
                border: '1.5px solid rgba(226, 232, 240, 0.9)',
                boxShadow: '0 10px 30px rgba(0, 0, 0, 0.06), 0 4px 12px rgba(14, 165, 233, 0.05)',
                zIndex: 100,
                display: 'flex',
                flexDirection: 'column',
                overflow: 'hidden'
            }}>
                {/* Header */}
                <div style={{
                    padding: '1.1rem 1.3rem',
                    borderBottom: '1px solid #f1f5f9',
                    background: 'linear-gradient(135deg, rgba(248,250,252,0.8) 0%, rgba(241,245,249,0.9) 100%)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between'
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: '800', fontSize: '1rem', color: 'var(--text)' }}>
                        <div style={{
                            width: '30px',
                            height: '30px',
                            borderRadius: '10px',
                            background: isStockGame ? 'linear-gradient(135deg, #10b981 0%, #059669 100%)' : 'linear-gradient(135deg, var(--primary) 0%, #0284c7 100%)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: 'white',
                            boxShadow: isStockGame ? '0 4px 10px rgba(16, 185, 129, 0.3)' : '0 4px 10px rgba(14, 165, 233, 0.3)'
                        }}>
                            {isStockGame ? <TrendingUp size={16} /> : <Settings size={16} />}
                        </div>
                        <span>{isStockGame ? '진행 방식 & 금액 관리' : '진행 방식 & 점수 관리'}</span>
                    </div>

                    {/* GitHub Sync Button */}
                    <button
                        onClick={() => setShowGitModal(true)}
                        title="깃허브 클라우드 백업 및 최신 버전 업데이트"
                        style={{
                            background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
                            color: 'white',
                            border: '1px solid rgba(255, 255, 255, 0.15)',
                            borderRadius: '10px',
                            padding: '5px 10px',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '5px',
                            fontSize: '0.74rem',
                            fontWeight: '800',
                            boxShadow: '0 2px 6px rgba(15, 23, 42, 0.15)',
                            transition: 'all 0.15s'
                        }}
                    >
                        <Cloud size={13} color="#38bdf8" />
                        <span>GitHub</span>
                    </button>
                </div>

                {/* Body Content */}
                <div style={{ flex: 1, overflowY: 'auto', padding: '1.1rem', display: 'flex', flexDirection: 'column', gap: '1.1rem' }}>
                    {/* Mode Selector */}
                    <div>
                        <div style={{ fontSize: '0.78rem', fontWeight: '800', color: 'var(--text-muted)', marginBottom: '8px', letterSpacing: '0.5px' }}>
                            🎮 진행 방식 선택
                        </div>
                        <div style={{
                            display: 'grid',
                            gridTemplateColumns: '1fr 1fr',
                            gap: '6px',
                            padding: '4px',
                            background: '#f1f5f9',
                            borderRadius: '16px'
                        }}>
                            <button
                                onClick={() => setGameMode('online')}
                                style={{
                                    padding: '10px 6px',
                                    borderRadius: '12px',
                                    border: 'none',
                                    background: gameMode === 'online' ? 'var(--primary)' : 'transparent',
                                    color: gameMode === 'online' ? 'white' : 'var(--text-muted)',
                                    fontWeight: '800',
                                    fontSize: '0.88rem',
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    gap: '6px',
                                    boxShadow: gameMode === 'online' ? '0 4px 12px rgba(14, 165, 233, 0.3)' : 'none',
                                    transition: 'all 0.2s'
                                }}
                            >
                                <Globe size={15} /> Online
                            </button>
                            <button
                                onClick={() => setGameMode('offline')}
                                style={{
                                    padding: '10px 6px',
                                    borderRadius: '12px',
                                    border: 'none',
                                    background: gameMode === 'offline' ? 'var(--secondary-hover)' : 'transparent',
                                    color: gameMode === 'offline' ? 'white' : 'var(--text-muted)',
                                    fontWeight: '800',
                                    fontSize: '0.88rem',
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    gap: '6px',
                                    boxShadow: gameMode === 'offline' ? '0 4px 12px rgba(245, 158, 11, 0.3)' : 'none',
                                    transition: 'all 0.2s'
                                }}
                            >
                                <Monitor size={15} /> Offline
                            </button>
                        </div>
                    </div>

                    {/* Online Mode Content */}
                    {gameMode === 'online' ? (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.9rem' }}>
                            {/* Compact PIN & Status Banner */}
                            <div style={{
                                padding: '0.85rem 1rem',
                                background: 'linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%)',
                                borderRadius: '18px',
                                border: '1.5px solid #bae6fd',
                                display: 'flex',
                                flexDirection: 'column',
                                gap: '8px'
                            }}>
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                        <span style={{ fontSize: '0.78rem', fontWeight: '800', color: '#0369a1' }}>접속 PIN</span>
                                        <span style={{ fontSize: '1.25rem', fontWeight: '900', color: 'var(--primary)', letterSpacing: '1px' }}>
                                            {onlinePin || '생성 중...'}
                                        </span>
                                    </div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                        <button
                                            onClick={() => setShowMiniQr(!showMiniQr)}
                                            title="QR 코드 보기/숨기기"
                                            style={{
                                                background: showMiniQr ? 'var(--primary)' : 'white',
                                                color: showMiniQr ? 'white' : '#0284c7',
                                                border: '1px solid #bae6fd',
                                                borderRadius: '8px',
                                                padding: '4px 7px',
                                                cursor: 'pointer',
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: '3px',
                                                fontSize: '0.72rem',
                                                fontWeight: '800'
                                            }}
                                        >
                                            <QrIcon size={13} /> {showMiniQr ? '닫기' : 'QR'}
                                        </button>
                                        <button
                                            onClick={handleCopyUrl}
                                            title="접속 링크 복사"
                                            style={{
                                                background: isCopied ? '#10b981' : 'white',
                                                color: isCopied ? 'white' : '#0284c7',
                                                border: '1px solid #bae6fd',
                                                borderRadius: '8px',
                                                padding: '4px 7px',
                                                cursor: 'pointer',
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: '3px',
                                                fontSize: '0.72rem',
                                                fontWeight: '800'
                                            }}
                                        >
                                            {isCopied ? <CheckCircle2 size={13} /> : <Copy size={13} />}
                                            {isCopied ? '복사됨' : '주소'}
                                        </button>
                                        <button 
                                            onClick={() => {
                                                if (window.confirm("새 방을 생성하시겠습니까? 새로운 PIN 번호가 발급되며 기존 참여자는 재접속해야 합니다.")) {
                                                    createOnlineRoom(socket, true);
                                                }
                                            }}
                                            title="새 방 PIN 발급"
                                            style={{
                                                background: 'white',
                                                border: '1px solid #bae6fd',
                                                borderRadius: '8px',
                                                padding: '4px 6px',
                                                cursor: 'pointer',
                                                display: 'flex',
                                                alignItems: 'center',
                                                color: '#0284c7'
                                            }}
                                        >
                                            <RefreshCw size={13} />
                                        </button>
                                    </div>
                                </div>

                                {publicUrl || (typeof window !== 'undefined' && window.location.hostname !== 'localhost' && !window.location.hostname.startsWith('192.168.') && !window.location.hostname.startsWith('10.')) ? (
                                    <div style={{ fontSize: '0.72rem', color: '#047857', background: '#ecfdf5', border: '1px solid #a7f3d0', padding: '4px 8px', borderRadius: '8px', fontWeight: '800', textAlign: 'center' }}>
                                        🚀 LTE / 5G / 외부 Wi-Fi 접속 가능
                                    </div>
                                ) : (
                                    <div style={{ fontSize: '0.72rem', color: '#b45309', background: '#fffbeb', border: '1px solid #fde68a', padding: '4px 8px', borderRadius: '8px', fontWeight: '700', textAlign: 'center' }}>
                                        ⏳ 인터넷 터널 연결 중 (동일 Wi-Fi 가능)
                                    </div>
                                )}

                                {/* Collapsible Mini QR Code for reference across pages */}
                                {showMiniQr && (
                                    <div style={{
                                        display: 'flex',
                                        flexDirection: 'column',
                                        alignItems: 'center',
                                        padding: '10px',
                                        background: 'white',
                                        borderRadius: '14px',
                                        boxShadow: '0 4px 12px rgba(0,0,0,0.06)',
                                        animation: 'popIn 0.2s ease'
                                    }}>
                                        <QRCode value={joinUrl} size={110} />
                                        <span style={{ fontSize: '0.68rem', color: '#64748b', marginTop: '6px', wordBreak: 'break-all', textAlign: 'center' }}>
                                            {joinUrl}
                                        </span>
                                    </div>
                                )}
                            </div>

                            {/* 초기 투자금 일괄 지정 (주식 게임) */}
                            {renderBulkAmountTool()}

                            {/* Live Entrance Count & Ranked Leaderboard */}
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', flex: 1 }}>
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 2px' }}>
                                    <span style={{ fontSize: '0.86rem', fontWeight: '800', color: 'var(--text)', display: 'flex', alignItems: 'center', gap: '5px' }}>
                                        {isStockGame ? <TrendingUp size={15} color="#059669" /> : <Users size={15} color="var(--primary)" />}
                                        {isStockGame ? '실시간 누적 금액' : '입장 인원'}
                                    </span>
                                    <span style={{
                                        fontSize: '0.78rem',
                                        fontWeight: '900',
                                        color: onlineParticipants.length > 0 ? '#059669' : '#64748b',
                                        background: onlineParticipants.length > 0 ? '#dcfce7' : '#f1f5f9',
                                        padding: '2px 8px',
                                        borderRadius: '12px',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '4px'
                                    }}>
                                        <span style={{
                                            width: '7px',
                                            height: '7px',
                                            borderRadius: '50%',
                                            background: onlineParticipants.length > 0 ? '#10b981' : '#94a3b8'
                                        }} />
                                        {onlineParticipants.length}명 접속 중
                                    </span>
                                </div>

                                {onlineParticipants.length === 0 ? (
                                    <div style={{
                                        padding: '1.5rem 1rem',
                                        background: '#f8fafc',
                                        borderRadius: '16px',
                                        border: '1.5px dashed #cbd5e1',
                                        textAlign: 'center',
                                        display: 'flex',
                                        flexDirection: 'column',
                                        alignItems: 'center',
                                        gap: '6px'
                                    }}>
                                        <span style={{ fontSize: '1.8rem' }}>📱</span>
                                        <span style={{ fontSize: '0.84rem', fontWeight: '800', color: 'var(--text)' }}>참여자를 기다리고 있습니다</span>
                                        <span style={{ fontSize: '0.74rem', color: 'var(--text-muted)', lineHeight: '1.4' }}>
                                            스마트폰으로 메인 화면의 QR 코드를 스캔해 입장해주세요!
                                        </span>
                                    </div>
                                ) : (
                                    <div style={{
                                        display: 'flex',
                                        flexDirection: 'column',
                                        gap: '6px',
                                        maxHeight: 'calc(100vh - 350px)',
                                        overflowY: 'auto',
                                        paddingRight: '2px'
                                    }}>
                                        {sortedScores.map((p, idx) => {
                                            const isEditing = editingNum === p.num;
                                            const isGold = hasAnyScore && idx === 0 && p.score > 0;
                                            const rankBadge = hasAnyScore 
                                                ? (idx === 0 && p.score > 0 ? '🥇' : idx === 1 && p.score > 0 ? '🥈' : idx === 2 && p.score > 0 ? '🥉' : `#${idx + 1}`) 
                                                : `${idx + 1}`;

                                            return (
                                                <div
                                                    key={p.num}
                                                    style={{
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        justifyContent: 'space-between',
                                                        padding: '8px 10px',
                                                        background: isGold ? 'linear-gradient(135deg, #fffbeb 0%, #fef3c7 100%)' : 'white',
                                                        borderRadius: '14px',
                                                        border: isGold ? '1.5px solid #fcd34d' : '1.5px solid #e2e8f0',
                                                        boxShadow: '0 2px 5px rgba(0,0,0,0.02)'
                                                    }}
                                                >
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0, flex: 1 }}>
                                                        <span style={{
                                                            fontWeight: '900',
                                                            fontSize: idx < 3 ? '1.05rem' : '0.82rem',
                                                            color: idx < 3 ? 'inherit' : '#64748b',
                                                            minWidth: '24px',
                                                            textAlign: 'center'
                                                        }}>
                                                            {rankBadge}
                                                        </span>
                                                        <span style={{
                                                            fontWeight: '800',
                                                            fontSize: '0.88rem',
                                                            color: 'var(--text)',
                                                            overflow: 'hidden',
                                                            textOverflow: 'ellipsis',
                                                            whiteSpace: 'nowrap'
                                                        }}>
                                                            {p.num}
                                                        </span>
                                                    </div>

                                                    {/* Score / Amount & Direct Host Controls */}
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                                        {isEditing ? (
                                                            <div style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
                                                                <input
                                                                    type="number"
                                                                    value={tempScoreVal}
                                                                    onChange={(e) => setTempScoreVal(e.target.value)}
                                                                    onKeyDown={(e) => {
                                                                        if (e.key === 'Enter') handleSaveInlineEdit(p.num);
                                                                    }}
                                                                    autoFocus
                                                                    style={{
                                                                        width: isStockGame ? '86px' : '50px',
                                                                        padding: '2px 4px',
                                                                        borderRadius: '8px',
                                                                        border: '2px solid var(--primary)',
                                                                        fontSize: '0.82rem',
                                                                        fontWeight: '800',
                                                                        textAlign: isStockGame ? 'right' : 'center'
                                                                    }}
                                                                />
                                                                <button
                                                                    onClick={() => handleSaveInlineEdit(p.num)}
                                                                    style={{ background: 'var(--primary)', color: 'white', border: 'none', borderRadius: '6px', padding: '3px 5px', cursor: 'pointer' }}
                                                                >
                                                                    <Check size={13} />
                                                                </button>
                                                            </div>
                                                        ) : (
                                                            <span
                                                                onClick={() => handleStartInlineEdit(p.num, p.score)}
                                                                title="클릭하여 금액 직접 수정"
                                                                style={{
                                                                    fontSize: isStockGame ? '0.82rem' : '0.92rem',
                                                                    fontWeight: '900',
                                                                    color: isGold ? '#b45309' : (isStockGame ? '#059669' : 'var(--primary)'),
                                                                    cursor: 'pointer',
                                                                    padding: '2px 6px',
                                                                    borderRadius: '8px',
                                                                    background: isGold ? 'rgba(255,255,255,0.8)' : (isStockGame ? '#ecfdf5' : '#f1f5f9'),
                                                                    display: 'flex',
                                                                    alignItems: 'center',
                                                                    gap: '2px',
                                                                    maxWidth: isStockGame ? '105px' : 'auto',
                                                                    overflow: 'hidden',
                                                                    textOverflow: 'ellipsis',
                                                                    whiteSpace: 'nowrap'
                                                                }}
                                                            >
                                                                {isStockGame ? `${Number(p.score || 0).toLocaleString()}원` : `${p.score}점`} <Edit3 size={10} style={{ opacity: 0.4, flexShrink: 0 }} />
                                                            </span>
                                                        )}

                                                        <div style={{ display: 'flex', gap: '2px' }}>
                                                            <button
                                                                onClick={() => handleDeltaScore(p.num, isStockGame ? -10000000 : -10)}
                                                                title={isStockGame ? "1,000만원 차감" : "10점 감점"}
                                                                style={{
                                                                    width: isStockGame ? '28px' : '24px',
                                                                    height: '24px',
                                                                    borderRadius: '7px',
                                                                    border: 'none',
                                                                    background: '#fef2f2',
                                                                    color: '#ef4444',
                                                                    fontWeight: '800',
                                                                    fontSize: isStockGame ? '0.72rem' : '0.85rem',
                                                                    cursor: 'pointer'
                                                                }}
                                                            >{isStockGame ? '-1천' : '−'}</button>
                                                            <button
                                                                onClick={() => handleDeltaScore(p.num, isStockGame ? 10000000 : 10)}
                                                                title={isStockGame ? "1,000만원 가산" : "10점 가산"}
                                                                style={{
                                                                    width: isStockGame ? '28px' : '24px',
                                                                    height: '24px',
                                                                    borderRadius: '7px',
                                                                    border: 'none',
                                                                    background: '#f0fdf4',
                                                                    color: '#16a34a',
                                                                    fontWeight: '800',
                                                                    fontSize: isStockGame ? '0.72rem' : '0.85rem',
                                                                    cursor: 'pointer'
                                                                }}
                                                            >{isStockGame ? '+1천' : '+'}</button>
                                                        </div>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>
                        </div>
                    ) : (
                        /* Offline Mode Content */
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', flex: 1 }}>
                            {/* Participant Count Selector */}
                            <div style={{
                                padding: '1rem',
                                background: '#f8fafc',
                                borderRadius: '18px',
                                border: '1.5px solid #e2e8f0'
                            }}>
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.88rem', fontWeight: '800', color: 'var(--text)' }}>
                                        <Users size={16} color="var(--primary)" />
                                        <span>참가 인원수</span>
                                    </div>
                                    <span style={{ fontSize: '1.25rem', fontWeight: '900', color: 'var(--primary)' }}>
                                        {participantCount}명
                                    </span>
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <button
                                        onClick={() => setParticipantCount(participantCount - 1)}
                                        style={{
                                            flex: 1,
                                            padding: '8px',
                                            borderRadius: '12px',
                                            border: '1.5px solid #e2e8f0',
                                            background: 'white',
                                            fontWeight: '800',
                                            fontSize: '1.2rem',
                                            cursor: 'pointer',
                                            color: 'var(--text-muted)'
                                        }}
                                    >−</button>
                                    <button
                                        onClick={() => setParticipantCount(participantCount + 1)}
                                        style={{
                                            flex: 1,
                                            padding: '8px',
                                            borderRadius: '12px',
                                            border: 'none',
                                            background: 'var(--primary)',
                                            color: 'white',
                                            fontWeight: '800',
                                            fontSize: '1.2rem',
                                            cursor: 'pointer',
                                            boxShadow: '0 4px 12px rgba(14, 165, 233, 0.3)'
                                        }}
                                    >+</button>
                                </div>
                            </div>

                            {/* 초기 투자금 일괄 지정 (주식 게임) */}
                            {renderBulkAmountTool()}

                            {/* Offline Live Scoreboard */}
                            {participantCount > 0 && (
                                <div style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
                                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                                        <span style={{ fontSize: '0.85rem', fontWeight: '800', color: 'var(--text)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                            <Sparkles size={14} color="var(--secondary-hover)" /> 
                                            {isStockGame ? '실시간 누적 금액' : '실시간 누적 점수판'}
                                        </span>
                                        <button
                                            onClick={handleResetAllScores}
                                            style={{
                                                padding: '3px 8px',
                                                fontSize: '0.72rem',
                                                fontWeight: '800',
                                                color: '#ef4444',
                                                background: '#fef2f2',
                                                border: '1px solid #fecaca',
                                                borderRadius: '8px',
                                                cursor: 'pointer',
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: '3px',
                                                boxShadow: '0 1px 2px rgba(0,0,0,0.03)',
                                                transition: 'all 0.15s ease'
                                            }}
                                            title="모든 참가자의 점수를 0점으로 초기화합니다"
                                        >
                                            <RotateCcw size={11} />
                                            0점 초기화
                                        </button>
                                    </div>

                                    <div style={{
                                        display: 'flex',
                                        flexDirection: 'column',
                                        gap: '6px',
                                        maxHeight: 'calc(100vh - 350px)',
                                        overflowY: 'auto',
                                        paddingRight: '2px'
                                    }}>
                                        {scores.map((p) => {
                                            const isEditing = editingNum === p.num;
                                            return (
                                                <div
                                                    key={p.num}
                                                    style={{
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        justifyContent: 'space-between',
                                                        padding: '8px 12px',
                                                        background: 'white',
                                                        borderRadius: '14px',
                                                        border: '1.5px solid #e2e8f0',
                                                        boxShadow: '0 2px 6px rgba(0,0,0,0.02)'
                                                    }}
                                                >
                                                    <span style={{ fontWeight: '800', fontSize: '0.88rem', color: 'var(--text)' }}>
                                                        {p.num}번
                                                    </span>

                                                    {/* Score / Amount & Controls */}
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                                        {isEditing ? (
                                                            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                                                <input
                                                                    type="number"
                                                                    value={tempScoreVal}
                                                                    onChange={(e) => setTempScoreVal(e.target.value)}
                                                                    onKeyDown={(e) => {
                                                                        if (e.key === 'Enter') handleSaveInlineEdit(p.num);
                                                                    }}
                                                                    autoFocus
                                                                    style={{
                                                                        width: isStockGame ? '86px' : '52px',
                                                                        padding: '2px 4px',
                                                                        borderRadius: '8px',
                                                                        border: '2px solid var(--primary)',
                                                                        fontSize: '0.82rem',
                                                                        fontWeight: '800',
                                                                        textAlign: isStockGame ? 'right' : 'center'
                                                                    }}
                                                                />
                                                                <button
                                                                    onClick={() => handleSaveInlineEdit(p.num)}
                                                                    style={{ background: 'var(--primary)', color: 'white', border: 'none', borderRadius: '8px', padding: '3px 6px', cursor: 'pointer' }}
                                                                >
                                                                    <Check size={13} />
                                                                </button>
                                                            </div>
                                                        ) : (
                                                            <span
                                                                onClick={() => handleStartInlineEdit(p.num, p.score)}
                                                                title="클릭하여 금액 직접 수정"
                                                                style={{
                                                                    fontSize: isStockGame ? '0.82rem' : '0.95rem',
                                                                    fontWeight: '900',
                                                                    color: isStockGame ? '#059669' : 'var(--primary)',
                                                                    cursor: 'pointer',
                                                                    padding: '2px 8px',
                                                                    borderRadius: '8px',
                                                                    background: isStockGame ? '#ecfdf5' : '#f1f5f9',
                                                                    display: 'flex',
                                                                    alignItems: 'center',
                                                                    gap: '3px',
                                                                    maxWidth: isStockGame ? '105px' : 'auto',
                                                                    overflow: 'hidden',
                                                                    textOverflow: 'ellipsis',
                                                                    whiteSpace: 'nowrap'
                                                                }}
                                                            >
                                                                {isStockGame ? `${Number(p.score || 0).toLocaleString()}원` : `${p.score}점`} <Edit3 size={11} style={{ opacity: 0.5, flexShrink: 0 }} />
                                                            </span>
                                                        )}

                                                        {/* +/- Buttons */}
                                                        <div style={{ display: 'flex', gap: '3px' }}>
                                                            <button
                                                                onClick={() => handleDeltaScore(p.num, isStockGame ? -10000000 : -10)}
                                                                title={isStockGame ? "1,000만원 차감" : "10점 감점"}
                                                                style={{
                                                                    width: isStockGame ? '28px' : '26px',
                                                                    height: '26px',
                                                                    borderRadius: '8px',
                                                                    border: 'none',
                                                                    background: '#fef2f2',
                                                                    color: '#ef4444',
                                                                    fontWeight: '800',
                                                                    fontSize: isStockGame ? '0.72rem' : '0.9rem',
                                                                    cursor: 'pointer'
                                                                }}
                                                            >{isStockGame ? '-1천' : '−'}</button>
                                                            <button
                                                                onClick={() => handleDeltaScore(p.num, isStockGame ? 10000000 : 10)}
                                                                title={isStockGame ? "1,000만원 가산" : "10점 가산"}
                                                                style={{
                                                                    width: isStockGame ? '28px' : '26px',
                                                                    height: '26px',
                                                                    borderRadius: '8px',
                                                                    border: 'none',
                                                                    background: '#f0fdf4',
                                                                    color: '#16a34a',
                                                                    fontWeight: '800',
                                                                    fontSize: isStockGame ? '0.72rem' : '0.9rem',
                                                                    cursor: 'pointer'
                                                                }}
                                                            >{isStockGame ? '+1천' : '+'}</button>
                                                        </div>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* Bottom Actions */}
                <div style={{
                    padding: '0.85rem 1.1rem',
                    borderTop: '1px solid #f1f5f9',
                    background: 'linear-gradient(180deg, rgba(255,255,255,0.95) 0%, #f8fafc 100%)',
                    backdropFilter: 'blur(10px)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '8px'
                }}>
                    {onExitToLobby && (
                        <button
                            onClick={onExitToLobby}
                            style={{
                                width: '100%',
                                padding: '10px 14px',
                                borderRadius: '14px',
                                border: '1.5px solid #cbd5e1',
                                background: '#f8fafc',
                                color: '#475569',
                                fontWeight: '800',
                                fontSize: '0.92rem',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '6px',
                                transition: 'all 0.15s'
                            }}
                        >
                            <ArrowLeft size={16} /> 게임 로비로 나가기
                        </button>
                    )}
                    <button
                        onClick={() => {
                            if (onEndGame) onEndGame();
                            handleOpenWinnerModal();
                        }}
                        style={{
                            width: '100%',
                            padding: '12px 16px',
                            borderRadius: '16px',
                            border: 'none',
                            background: isStockGame ? 'linear-gradient(135deg, #10b981 0%, #059669 100%)' : 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
                            color: 'white',
                            fontWeight: '900',
                            fontSize: '1.02rem',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '8px',
                            boxShadow: isStockGame ? '0 6px 18px rgba(16, 185, 129, 0.35)' : '0 6px 18px rgba(245, 158, 11, 0.4)',
                            transition: 'all 0.2s cubic-bezier(0.175, 0.885, 0.32, 1.275)'
                        }}
                        onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-2px)'}
                        onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}
                    >
                        <Trophy size={19} /> 게임 종료 (결과 발표)
                    </button>
                </div>
            </aside>

            {/* Winner Screen / Final Standings Celebration Modal */}
            {showWinnerModal && (
                <div style={{
                    position: 'fixed',
                    top: 0,
                    left: 0,
                    width: '100%',
                    height: '100%',
                    background: 'rgba(0,0,0,0.65)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    zIndex: 20000,
                    backdropFilter: 'blur(10px)'
                }}>
                    {confettiActive && <Confetti recycle={false} numberOfPieces={550} />}
                    <div style={{
                        padding: '2.5rem',
                        maxWidth: '520px',
                        width: '92%',
                        textAlign: 'center',
                        background: 'white',
                        borderRadius: '28px',
                        boxShadow: '0 25px 60px rgba(0,0,0,0.3)',
                        maxHeight: '90vh',
                        display: 'flex',
                        flexDirection: 'column',
                        overflow: 'hidden'
                    }}>
                        <div style={{ fontSize: '3.6rem', lineHeight: '1', marginBottom: '0.5rem' }}>🏆</div>
                        <h2 style={{ fontSize: '2rem', margin: '0 0 0.3rem', color: '#d97706', fontWeight: '900', fontFamily: 'Jua, sans-serif' }}>
                            {isStockGame ? '최종 투자 수익 결과 발표!' : '최종 게임 결과 발표!'}
                        </h2>
                        <p style={{ color: 'var(--text-muted)', margin: '0 0 1.2rem', fontSize: '0.92rem' }}>
                            {isStockGame ? '모든 연도의 투자 게임이 종료되었습니다. 최종 투자 자산 순위표를 확인하세요!' : '모든 라운드가 종료되었습니다. 최종 순위표를 확인하세요!'}
                        </p>

                        {/* Top 3 Podium (if >= 2 participants) */}
                        {sortedScores.length >= 2 && (
                            <div style={{
                                display: 'flex',
                                alignItems: 'flex-end',
                                justifyContent: 'center',
                                gap: '10px',
                                marginBottom: '1.4rem',
                                padding: '10px 0'
                            }}>
                                {/* 2nd Place */}
                                {sortedScores[1] && (
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
                                            {gameMode === 'online' ? sortedScores[1].num : `${sortedScores[1].num}번`}
                                        </span>
                                        <span style={{ fontSize: isStockGame ? '0.95rem' : '1.1rem', fontWeight: '900', color: isStockGame ? '#059669' : 'var(--primary)', marginTop: '4px' }}>
                                            {isStockGame ? `${Number(sortedScores[1].score).toLocaleString()}원` : `${sortedScores[1].score}점`}
                                        </span>
                                        <span style={{ fontSize: '0.72rem', fontWeight: '800', color: '#64748b' }}>2위</span>
                                    </div>
                                )}

                                {/* 1st Place */}
                                {sortedScores[0] && (
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
                                            {gameMode === 'online' ? sortedScores[0].num : `${sortedScores[0].num}번`}
                                        </span>
                                        <span style={{ fontSize: isStockGame ? '1.15rem' : '1.4rem', fontWeight: '900', color: '#b45309', marginTop: '4px' }}>
                                            {isStockGame ? `${Number(sortedScores[0].score).toLocaleString()}원` : `${sortedScores[0].score}점`}
                                        </span>
                                        <span style={{ fontSize: '0.78rem', fontWeight: '900', color: '#d97706', background: 'white', padding: '2px 8px', borderRadius: '10px', marginTop: '4px' }}>
                                            {isStockGame ? '🥇 1위 (최고 투자왕)' : '🥇 1위 (챔피언)'}
                                        </span>
                                    </div>
                                )}

                                {/* 3rd Place */}
                                {sortedScores[2] && (
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
                                            {gameMode === 'online' ? sortedScores[2].num : `${sortedScores[2].num}번`}
                                        </span>
                                        <span style={{ fontSize: isStockGame ? '0.92rem' : '1.05rem', fontWeight: '900', color: '#c2410c', marginTop: '4px' }}>
                                            {isStockGame ? `${Number(sortedScores[2].score).toLocaleString()}원` : `${sortedScores[2].score}점`}
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
                            marginBottom: '1.5rem',
                            paddingRight: '2px',
                            maxHeight: '220px'
                        }}>
                            {sortedScores.map((p, idx) => {
                                const isWinner = p.score === maxScore && maxScore > 0;
                                return (
                                    <div
                                        key={p.num}
                                        style={{
                                            display: 'flex',
                                            justifyContent: 'space-between',
                                            alignItems: 'center',
                                            padding: '0.75rem 1.2rem',
                                            borderRadius: '14px',
                                            background: isWinner ? 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)' : '#f8fafc',
                                            color: isWinner ? 'white' : 'var(--text)',
                                            border: isWinner ? 'none' : '1.5px solid #e2e8f0',
                                            boxShadow: isWinner ? '0 4px 14px rgba(245,158,11,0.35)' : 'none'
                                        }}
                                    >
                                        <span style={{ fontWeight: '800', fontSize: '1rem' }}>
                                            {idx === 0 ? '🥇 1위 ' : idx === 1 ? '🥈 2위 ' : idx === 2 ? '🥉 3위 ' : `#${idx + 1} `}
                                            {gameMode === 'online' ? p.num : `${p.num}번`}
                                        </span>
                                        <span style={{ fontSize: isStockGame ? '1.1rem' : '1.25rem', fontWeight: '900', color: isStockGame && !isWinner ? '#059669' : 'inherit' }}>
                                            {isStockGame ? `${Number(p.score).toLocaleString()}원` : `${p.score}점`}
                                        </span>
                                    </div>
                                );
                            })}
                        </div>

                        {/* Action Buttons */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                            <button
                                style={{
                                    padding: '11px',
                                    borderRadius: '14px',
                                    border: 'none',
                                    background: isStockGame ? 'linear-gradient(135deg, #10b981 0%, #059669 100%)' : 'var(--primary)',
                                    color: 'white',
                                    fontWeight: '800',
                                    fontSize: '0.95rem',
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    gap: '6px',
                                    boxShadow: isStockGame ? '0 4px 12px rgba(16, 185, 129, 0.3)' : '0 4px 12px rgba(14, 165, 233, 0.3)'
                                }}
                                onClick={handleResetScoresOnly}
                            >
                                <RefreshCw size={16} /> {isStockGame ? '금액 초기화 후 계속하기' : '점수 초기화 후 계속하기'}
                            </button>
                            <div style={{ display: 'flex', gap: '8px' }}>
                                <button
                                    style={{
                                        flex: 1,
                                        padding: '10px',
                                        borderRadius: '12px',
                                        border: '1.5px solid #e2e8f0',
                                        background: 'white',
                                        color: '#64748b',
                                        fontWeight: '800',
                                        fontSize: '0.88rem',
                                        cursor: 'pointer'
                                    }}
                                    onClick={() => setShowWinnerModal(false)}
                                >
                                    창 닫기
                                </button>
                                <button
                                    style={{
                                        flex: 1,
                                        padding: '10px',
                                        borderRadius: '12px',
                                        border: 'none',
                                        background: '#fef2f2',
                                        color: '#ef4444',
                                        fontWeight: '800',
                                        fontSize: '0.88rem',
                                        cursor: 'pointer'
                                    }}
                                    onClick={() => {
                                        if (window.confirm("세션을 완전히 종료하시겠습니까? 모든 참가자의 접속이 해제되고 점수가 초기화됩니다.")) {
                                            endSession(socket);
                                            setShowWinnerModal(false);
                                        }
                                    }}
                                >
                                    세션 완전 종료
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* GitHub Sync Modal */}
            <GitSyncModal isOpen={showGitModal} onClose={() => setShowGitModal(false)} />
        </>
    );
}