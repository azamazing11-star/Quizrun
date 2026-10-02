import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Maximize, Minimize, Tv, Users, Zap, Trophy, CheckCircle, Send } from 'lucide-react';
import QRCode from 'react-qr-code';
import Confetti from 'react-confetti';
import MediaViewer from '../components/MediaViewer';
import { getChosung } from '../utils/chosung';
import { useGlobalSession } from '../context/GlobalSessionContext';
import { playSound } from '../utils/audio';
import { getParticipantJoinUrl } from '../utils/url';
import Ladder from './Ladder';
import { StockGameScreenView, STOCK_DATA_2026 } from '../components/StockGame';

const GROUP_COLORS = [
    '#ef4444', '#f97316', '#eab308', '#22c55e',
    '#14b8a6', '#3b82f6', '#8b5cf6', '#ec4899',
    '#06b6d4', '#84cc16', '#f59e0b', '#6366f1'
];
const GROUP_RUNNERS = ['🏃', '🏃‍♀️', '🚀', '⚡', '🦊', '🐯', '🦁', '🐺', '🦅', '🐉', '🌟', '💫'];

function ScreenRaceTrack({ groupScores = {}, participants = [], totalScore = 1000 }) {
    const unifiedScores = [];

    Object.entries(groupScores).forEach(([groupId, score]) => {
        if (score !== 0) {
            unifiedScores.push({
                id: `group-${groupId}`,
                name: `${groupId}조`,
                score,
                type: 'group',
                sourceId: groupId
            });
        }
    });

    participants.forEach(p => {
        if (!p.groupId && p.score !== 0) {
            unifiedScores.push({
                id: `indiv-${p.id}`,
                name: p.nickname,
                score: p.score,
                type: 'individual'
            });
        }
    });

    const sorted = unifiedScores.sort((a, b) => b.score - a.score).slice(0, 10);
    if (sorted.length === 0) return null;

    const maxPossScore = totalScore || 1000;

    return (
        <div style={{ margin: '18px 0', background: 'rgba(255, 255, 255, 0.95)', borderRadius: '24px', padding: '18px', border: '3px solid #e2e8f0', boxShadow: '0 10px 30px rgba(0,0,0,0.06)' }}>
            <h3 style={{ textAlign: 'center', marginBottom: '14px', color: '#1e293b', fontSize: '1.5rem', fontWeight: '900', letterSpacing: '1px' }}>
                실시간 랭킹 달리기 🏁
            </h3>
            {sorted.map((item, index) => {
                const colorIdx = item.type === 'group' ? (Number(item.sourceId) - 1) % GROUP_COLORS.length : index % GROUP_COLORS.length;
                const color = GROUP_COLORS[colorIdx];
                const pct = Math.min(95, Math.max(8, (item.score / maxPossScore) * 95));
                const runner = GROUP_RUNNERS[colorIdx];

                return (
                    <div key={item.id} style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '10px' }}>
                        <div style={{ minWidth: '75px', textAlign: 'center', fontWeight: '900', fontSize: index < 3 ? '1.15rem' : '0.95rem', color: index < 3 ? '#d97706' : color }}>
                            <span>{index + 1}위</span>
                            <div style={{ fontSize: '0.8rem', opacity: 0.85, fontWeight: '700' }}>{item.name}</div>
                        </div>
                        <div style={{ flex: 1, background: '#e2e8f0', borderRadius: '14px', height: '38px', position: 'relative', overflow: 'hidden' }}>
                            <div style={{
                                width: `${pct}%`,
                                height: '100%',
                                background: index < 3 
                                    ? 'linear-gradient(90deg, #fbbf24, #f59e0b)'
                                    : `linear-gradient(90deg, ${color}99, ${color})`,
                                borderRadius: '14px',
                                transition: 'width 1s cubic-bezier(0.34, 1.56, 0.64, 1)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'flex-end',
                                position: 'relative'
                            }}>
                                <div style={{
                                    position: 'absolute',
                                    right: '-8px',
                                    fontSize: '1.8rem',
                                    transform: 'scaleX(-1)',
                                    lineHeight: 1
                                }}>
                                    {runner}
                                </div>
                            </div>
                        </div>
                        <div style={{ minWidth: '85px', textAlign: 'right', fontWeight: '900', fontSize: '1.2rem', color: index < 3 ? '#d97706' : color }}>
                            {item.score.toLocaleString()}점
                        </div>
                    </div>
                );
            })}
        </div>
    );
}

export default function ScreenView({ socket }) {
    const navigate = useNavigate();
    const { 
        scores: contextScores, 
        participantCount: contextCount, 
        gameMode: contextGameMode,
        onlinePin: contextPin,
        serverIp: contextServerIp,
        publicUrl: contextPublicUrl,
        onlineParticipants: contextOnlineParticipants
    } = useGlobalSession();

    const [isConnectedToHost, setIsConnectedToHost] = useState(false);
    const [isFullscreen, setIsFullscreen] = useState(false);
    const [viewMode, setViewMode] = useState(() => {
        try {
            const params = new URLSearchParams(window.location.search);
            return params.get('mode') || 'home';
        } catch (e) {
            return 'home';
        }
    }); // 'home' | 'quizrun' | 'ladder' | 'stock_game'

    // Real-time live scoreboard data
    const [liveScores, setLiveScores] = useState(() => {
        if (contextScores && contextScores.length > 0) return contextScores;
        try {
            const saved = localStorage.getItem('quizrun_global_session');
            if (saved) {
                const parsed = JSON.parse(saved);
                if (parsed.scores && parsed.scores.length > 0) return parsed.scores;
            }
        } catch (e) {}
        return [];
    });

    const [shortInputAnswer, setShortInputAnswer] = useState('');
    const [userJudgeFeedback, setUserJudgeFeedback] = useState(null);
    const [mediaRemoteCommand, setMediaRemoteCommand] = useState(null);
    const [stockGameData, setStockGameData] = useState({
        year: 2015,
        stocks: STOCK_DATA_2026,
        isPubliclyRevealed: false,
        allowAllNews: false,
        allowAllVipHint: false
    });

    const [screenData, setScreenData] = useState({
        gameState: 'waiting',
        isOffline: contextGameMode === 'offline',
        isBuzzerMode: false,
        quizTitle: '퀴즈앤런 (Quiz N Run)',
        currentQuestion: '',
        currentOptions: [],
        correctIndex: null,
        correctAnswer: '',
        currentExplanation: '',
        showAnswer: false,
        currentQuestionIndex: 0,
        totalQuestions: 0,
        points: 10,
        totalPoints: 100,
        currentMediaUrl: '',
        currentMediaType: '',
        currentMediaName: '',
        currentMediaDisplayMode: 'auto',
        showChosung: true,
        quizType: 'mcq',
        buzzedInfo: null,
        judgeResult: null,
        groupScores: {},
        participants: contextOnlineParticipants || [],
        pin: contextPin || null,
        serverIp: contextServerIp || '',
        publicUrl: contextPublicUrl || '',
        confetti: false,
        offlineWinnerList: [],
        isMediaMutedOnScreen: false
    });

    const channelRef = useRef(null);

    // Sync context scores when changed
    useEffect(() => {
        if (contextScores && contextScores.length > 0) {
            setLiveScores(contextScores);
        }
    }, [contextScores]);

    // Setup Unified BroadcastChannel
    useEffect(() => {
        let channel;
        try {
            channel = new BroadcastChannel('quizrun_screen_sync');
            channelRef.current = channel;

            channel.onmessage = (event) => {
                const { type, payload } = event.data || {};
                setIsConnectedToHost(true);

                if (type === 'MODE_CHANGE') {
                    if (payload && payload.mode === 'fortune') {
                        navigate('/fortune?subscreen=true');
                    } else if (payload && payload.mode === 'card_game') {
                        navigate('/card-game?subscreen=true');
                    } else if (payload && payload.mode) {
                        setViewMode(payload.mode);
                    }
                } else if (type === 'STOCK_GAME_SCREEN_UPDATE') {
                    setViewMode('stock_game');
                    if (payload) {
                        setStockGameData(prev => ({
                            ...prev,
                            ...payload
                        }));
                        if (payload.pin) {
                            setScreenData(prev => ({ ...prev, pin: payload.pin }));
                        }
                    }
                } else if (type === 'PARTICIPANTS_UPDATE' || type === 'HOST_PARTICIPANTS_UPDATED') {
                    if (payload && Array.isArray(payload.participants)) {
                        setScreenData(prev => ({ ...prev, participants: payload.participants }));
                    } else if (Array.isArray(payload)) {
                        setScreenData(prev => ({ ...prev, participants: payload }));
                    }
                } else if (type === 'SCORES_UPDATE') {
                    if (payload && payload.scores) {
                        setLiveScores(payload.scores);
                    }
                } else if (type === 'STATE_UPDATE' || type === 'HOST_PONG') {
                    if (payload) {
                        if (payload.mode) setViewMode(payload.mode);
                        else if (payload.gameState === 'question') setViewMode('quizrun');
                        else if (payload.gameState === 'waiting') setViewMode('home');

                        if (payload.scores && payload.scores.length > 0) {
                            setLiveScores(payload.scores);
                        }
                        if (payload.participants && Array.isArray(payload.participants)) {
                            setScreenData(prev => ({ ...prev, participants: payload.participants }));
                        }

                        setScreenData(prev => ({
                            ...prev,
                            ...payload
                        }));

                        // Reset input feedback on new question
                        if (payload.currentQuestionIndex !== undefined && payload.currentQuestionIndex !== screenData.currentQuestionIndex) {
                            setShortInputAnswer('');
                            setUserJudgeFeedback(null);
                        }
                    }
                } else if (type === 'MEDIA_COMMAND') {
                    if (payload) {
                        setMediaRemoteCommand(payload);
                    }
                } else if (type === 'HOST_DISCONNECT') {
                    setIsConnectedToHost(false);
                    try {
                        const navBc = new BroadcastChannel('quizrun_nav_sync');
                        navBc.postMessage({ type: 'REQUEST_SYNC' });
                        setTimeout(() => navBc.close(), 500);
                    } catch (e) {}
                }
            };

            channel.postMessage({ type: 'SCREEN_PING' });
        } catch (e) {
            console.warn('BroadcastChannel error in ScreenView:', e);
        }

        const pingInterval = setInterval(() => {
            if (channel) {
                channel.postMessage({ type: 'SCREEN_PING' });
            }
        }, 3000);

        return () => {
            clearInterval(pingInterval);
            if (channel) {
                channel.close();
            }
        };
    }, [screenData.currentQuestionIndex]);

    const toggleFullscreen = () => {
        if (!document.fullscreenElement) {
            document.documentElement.requestFullscreen().catch(err => {
                console.error('Fullscreen error:', err);
            });
            setIsFullscreen(true);
        } else {
            document.exitFullscreen().catch(err => {
                console.error('Exit fullscreen error:', err);
            });
            setIsFullscreen(false);
        }
    };

    useEffect(() => {
        const handleFsChange = () => {
            setIsFullscreen(!!document.fullscreenElement);
        };
        document.addEventListener('fullscreenchange', handleFsChange);
        return () => document.removeEventListener('fullscreenchange', handleFsChange);
    }, []);

    useEffect(() => {
        if (!socket) return;
        const handleStockSync = (data) => {
            const payload = data?.payload || data;
            setViewMode('stock_game');
            if (payload) {
                setStockGameData(prev => ({
                    ...prev,
                    ...payload
                }));
            }
        };

        const handleParticipantsUpdated = (list) => {
            if (list && Array.isArray(list)) {
                setScreenData(prev => ({ ...prev, participants: list }));
            }
        };

        const handleParticipantJoined = (data) => {
            if (data?.participants && Array.isArray(data.participants)) {
                setScreenData(prev => ({ ...prev, participants: data.participants }));
            }
        };

        socket.on('stock_game:state_sync', handleStockSync);
        socket.on('host:participantsUpdated', handleParticipantsUpdated);
        socket.on('stock_game:participant_joined', handleParticipantJoined);

        const onRoomMsg = (msg) => {
            if (msg && msg.event === 'stock_game:state_sync' && msg.payload) {
                handleStockSync(msg.payload);
            }
        };
        const handleNetworkUpdate = (data) => {
            if (data) {
                setScreenData(prev => ({
                    ...prev,
                    serverIp: data.ip || prev.serverIp,
                    publicUrl: data.publicUrl || prev.publicUrl
                }));
            }
        };
        socket.on('room:message', onRoomMsg);
        socket.on('tunnel:updated', handleNetworkUpdate);
        socket.on('network:updated', handleNetworkUpdate);

        return () => {
            socket.off('stock_game:state_sync', handleStockSync);
            socket.off('host:participantsUpdated', handleParticipantsUpdated);
            socket.off('stock_game:participant_joined', handleParticipantJoined);
            socket.off('room:message', onRoomMsg);
            socket.off('tunnel:updated', handleNetworkUpdate);
            socket.off('network:updated', handleNetworkUpdate);
        };
    }, [socket]);

    const {
        gameState,
        isOffline,
        quizTitle,
        currentQuestion,
        currentOptions,
        correctIndex,
        correctAnswer,
        currentExplanation,
        showAnswer,
        currentQuestionIndex,
        totalQuestions,
        points,
        currentMediaUrl,
        currentMediaType,
        currentMediaName,
        currentMediaDisplayMode,
        showChosung,
        quizType,
        buzzedInfo,
        judgeResult,
        groupScores,
        participants,
        totalPoints,
        pin,
        serverIp,
        publicUrl,
        confetti,
        offlineWinnerList,
        isMediaMutedOnScreen
    } = screenData;

    const isOfflineMode = (contextGameMode === 'offline') && (isOffline !== false);
    const activePin = pin || contextPin;
    const activePublicUrl = publicUrl || contextPublicUrl;
    const activeServerIp = serverIp || contextServerIp;
    const activeParticipants = (participants && participants.length > 0)
        ? participants
        : (contextOnlineParticipants || []);
    const activeLiveScores = !isOfflineMode
        ? activeParticipants.map(p => ({ num: p.nickname, score: p.score || 0, isOnline: true }))
        : liveScores.map(s => ({ num: s.num, score: s.score || 0, isOnline: false }));

    // Direct touch/click on options from sub-monitor
    const handleOptionSelect = (idx) => {
        if (showAnswer) return;
        const isCorrect = idx === correctIndex;
        playSound(isCorrect ? 'correct' : 'wrong');
        setUserJudgeFeedback(isCorrect ? 'correct' : 'wrong');
        setScreenData(prev => ({ ...prev, showAnswer: true }));

        if (channelRef.current) {
            channelRef.current.postMessage({
                type: 'SCREEN_ANSWER_SELECTED',
                payload: { selectedIndex: idx, isCorrect }
            });
        }
    };

    // Direct short answer submit from sub-monitor
    const handleShortSubmit = (e) => {
        if (e) e.preventDefault();
        if (!shortInputAnswer.trim() || showAnswer) return;

        const cleanInput = shortInputAnswer.trim().toLowerCase().replace(/\s+/g, '');
        const cleanAnswer = String(correctAnswer || '').trim().toLowerCase().replace(/\s+/g, '');
        const isCorrect = cleanInput === cleanAnswer;

        playSound(isCorrect ? 'correct' : 'wrong');
        setUserJudgeFeedback(isCorrect ? 'correct' : 'wrong');
        setScreenData(prev => ({ ...prev, showAnswer: true }));

        if (channelRef.current) {
            channelRef.current.postMessage({
                type: 'SCREEN_ANSWER_SELECTED',
                payload: { answerText: shortInputAnswer, isCorrect }
            });
        }
    };

    // --- CASE 1: LADDER GAME RUN MIRROR MODE ---
    if (viewMode === 'ladder') {
        return (
            <div style={{ width: '100%', minHeight: '100vh', background: '#f8fafc', position: 'relative' }}>
                <Ladder socket={socket} isMirrorProp={true} />
            </div>
        );
    }

    // --- CASE 2: STOCK GAME SUB-MONITOR (Image 1 replica) ---
    if (viewMode === 'stock_game') {
        return (
            <StockGameScreenView
                year={stockGameData.year}
                stocks={stockGameData.stocks}
                isPubliclyRevealed={stockGameData.isPubliclyRevealed}
                toggleFullscreen={toggleFullscreen}
                isFullscreen={isFullscreen}
                allowAllNews={stockGameData.allowAllNews}
                allowAllVipHint={stockGameData.allowAllVipHint}
                predictions={stockGameData.predictions}
                predictionResults={stockGameData.predictionResults}
                portfolios={stockGameData.portfolios}
                allOrdersModalOpen={stockGameData.allOrdersModalOpen}
                pin={stockGameData.pin || activePin}
                serverIp={activeServerIp}
                publicUrl={activePublicUrl}
            />
        );
    }

    // --- CASE 2: NORMAL SCREEN VIEW (Home / Quizrun with Live Scoreboard) ---
    return (
        <div style={{
            minHeight: '100vh',
            width: '100%',
            background: 'linear-gradient(135deg, #f8fafc 0%, #eef2ff 50%, #fdf4ff 100%)',
            color: '#1e293b',
            display: 'flex',
            flexDirection: 'column',
            position: 'relative',
            overflowX: 'hidden',
            fontFamily: 'system-ui, -apple-system, sans-serif'
        }}>
            {confetti && <Confetti recycle={false} numberOfPieces={600} />}

            {/* Top Navigation Bar */}
            <header style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '12px 30px',
                background: 'rgba(255, 255, 255, 0.92)',
                backdropFilter: 'blur(12px)',
                borderBottom: '2px solid rgba(226, 232, 240, 0.8)',
                boxShadow: '0 4px 14px rgba(0,0,0,0.03)',
                zIndex: 100
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                    <img src="/logo.png?v=3" alt="Quizrun Logo" style={{ height: '48px', objectFit: 'contain' }} />
                    <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        background: '#f1f5f9',
                        padding: '6px 14px',
                        borderRadius: '16px',
                        border: '1px solid #cbd5e1'
                    }}>
                        <img src="/quizrun_study_robot.png?v=3" alt="Robot Icon" style={{ width: '24px', height: '24px', objectFit: 'contain' }} />
                        <span style={{ fontSize: '1.05rem', fontWeight: '900', color: '#1e293b' }}>
                            {quizTitle || '퀴즈앤런 대형 스크린'}
                        </span>
                    </div>

                    {totalQuestions > 0 && gameState === 'question' && viewMode === 'quizrun' && (
                        <span style={{
                            background: '#3b82f6',
                            color: 'white',
                            padding: '4px 14px',
                            borderRadius: '20px',
                            fontSize: '0.92rem',
                            fontWeight: '800'
                        }}>
                            문제 {currentQuestionIndex + 1} / {totalQuestions}
                        </span>
                    )}
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                    <span style={{
                        fontSize: '0.9rem',
                        color: isConnectedToHost ? '#15803d' : '#b91c1c',
                        fontWeight: '800',
                        background: isConnectedToHost ? '#dcfce7' : '#fee2e2',
                        padding: '6px 14px',
                        borderRadius: '14px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px'
                    }}>
                        <span style={{ width: '10px', height: '10px', borderRadius: '50%', backgroundColor: isConnectedToHost ? '#22c55e' : '#ef4444' }} />
                        {isConnectedToHost ? '🖥️ 진행자 연결됨' : '⏳ 진행자 연결 대기 중'}
                    </span>

                    <button
                        onClick={toggleFullscreen}
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px',
                            background: 'white',
                            border: '2px solid #cbd5e1',
                            borderRadius: '12px',
                            padding: '8px 16px',
                            fontSize: '0.92rem',
                            fontWeight: '800',
                            cursor: 'pointer',
                            color: '#475569',
                            boxShadow: '0 2px 6px rgba(0,0,0,0.05)'
                        }}
                        title="전체화면 전환 (F11)"
                    >
                        {isFullscreen ? <Minimize size={18} /> : <Maximize size={18} />}
                        <span>{isFullscreen ? '창 모드' : '전체 화면 (F11)'}</span>
                    </button>
                </div>
            </header>

            {/* Main Content Stage */}
            <main style={{
                flex: 1,
                display: 'flex',
                gap: '28px',
                padding: '24px 32px',
                width: '100%',
                boxSizing: 'border-box',
                alignItems: 'center',
                justifyContent: 'center'
            }}>
                {/* --- SUB-VIEW A: HOME WAITING (Robots Visual) --- */}
                {(viewMode === 'home' || gameState === 'waiting' || gameState === 'setup' || gameState === 'lobby') && (
                    <div style={{
                        flex: 1,
                        textAlign: 'center',
                        background: 'rgba(255, 255, 255, 0.95)',
                        padding: '40px',
                        borderRadius: '36px',
                        boxShadow: '0 25px 60px rgba(0,0,0,0.06)',
                        border: '3px solid #e2e8f0',
                        animation: 'popIn 0.4s ease',
                        maxWidth: '1100px',
                        width: '100%'
                    }}>
                        <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '30px',
                            marginBottom: '16px'
                        }}>
                            <div style={{ textAlign: 'center' }}>
                                <img
                                    src="/quizrun_study_robot.png?v=3"
                                    alt="Quizrun Robot"
                                    style={{
                                        maxHeight: '240px',
                                        objectFit: 'contain',
                                        filter: 'drop-shadow(0 12px 24px rgba(59, 130, 246, 0.25))'
                                    }}
                                />
                                <div style={{ fontSize: '1.35rem', fontWeight: '900', color: '#2563eb', marginTop: '8px' }}>
                                    퀴즈런 (Quizrun)
                                </div>
                            </div>

                            <div style={{
                                width: '64px',
                                height: '64px',
                                borderRadius: '50%',
                                background: 'linear-gradient(135deg, #f59e0b, #ea580c)',
                                color: 'white',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontSize: '1.8rem',
                                fontWeight: '900',
                                fontStyle: 'italic',
                                boxShadow: '0 8px 20px rgba(234, 88, 12, 0.35)',
                                border: '3px solid white'
                            }}>
                                VS
                            </div>

                            <div style={{ textAlign: 'center' }}>
                                <img
                                    src="/gamerun_robot.png?v=3"
                                    alt="Gamerun Robot"
                                    style={{
                                        maxHeight: '240px',
                                        objectFit: 'contain',
                                        filter: 'drop-shadow(0 12px 24px rgba(244, 63, 94, 0.25))'
                                    }}
                                />
                                <div style={{ fontSize: '1.35rem', fontWeight: '900', color: '#e11d48', marginTop: '8px' }}>
                                    게임런 (Gamerun)
                                </div>
                            </div>
                        </div>

                        <h1 style={{
                            fontSize: '3.4rem',
                            fontWeight: '900',
                            fontFamily: 'Jua, sans-serif',
                            background: 'linear-gradient(to right, #2563eb, #e11d48)',
                            WebkitBackgroundClip: 'text',
                            WebkitTextFillColor: 'transparent',
                            margin: '8px 0 14px 0'
                        }}>
                            퀴즈앤런 (Quiz N Run)
                        </h1>

                        <p style={{ fontSize: '1.6rem', color: '#475569', fontWeight: '800', marginBottom: '24px' }}>
                            {isOfflineMode ? '진행자가 곧 퀴즈 또는 게임을 시작합니다! 🎯' : '아래 코드를 입력하여 퀴즈에 접속해 주세요! 🚀'}
                        </p>

                        {!isOfflineMode && activePin && (
                            <div style={{
                                display: 'inline-flex',
                                justifyContent: 'center',
                                alignItems: 'center',
                                gap: '36px',
                                background: '#f8fafc',
                                padding: '24px 40px',
                                borderRadius: '24px',
                                border: '3px solid #cbd5e1'
                            }}>
                                <div style={{ background: 'white', padding: '12px', borderRadius: '16px', boxShadow: '0 6px 16px rgba(0,0,0,0.06)' }}>
                                    <QRCode value={getParticipantJoinUrl(activePin, activePublicUrl, activeServerIp)} size={140} />
                                </div>
                                <div style={{ textAlign: 'left' }}>
                                    <div style={{ fontSize: '1rem', color: '#64748b', fontWeight: '700' }}>접속 PIN 번호</div>
                                    <div style={{ fontSize: '4rem', fontWeight: '900', color: '#4f46e5', letterSpacing: '3px', lineHeight: 1.1 }}>
                                        {activePin}
                                    </div>
                                </div>
                            </div>
                        )}

                        {!isOfflineMode && (
                            <div style={{ marginTop: '24px', width: '100%', maxWidth: '850px', margin: '24px auto 0' }}>
                                <div style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    gap: '10px',
                                    marginBottom: '14px',
                                    fontSize: '1.4rem',
                                    fontWeight: '900',
                                    color: activeParticipants.length > 0 ? '#059669' : '#64748b'
                                }}>
                                    <Users size={28} color={activeParticipants.length > 0 ? '#10b981' : '#64748b'} />
                                    <span>
                                        {activeParticipants.length > 0 
                                            ? `실시간 접속 완료 (${activeParticipants.length}명)` 
                                            : '스마트폰으로 QR 코드를 찍고 참여해주세요!'}
                                    </span>
                                </div>

                                {activeParticipants.length > 0 && (
                                    <div style={{
                                        display: 'flex',
                                        flexWrap: 'wrap',
                                        gap: '10px',
                                        justifyContent: 'center',
                                        padding: '16px 20px',
                                        background: '#f8fafc',
                                        borderRadius: '20px',
                                        border: '2px solid #e2e8f0',
                                        maxHeight: '160px',
                                        overflowY: 'auto'
                                    }}>
                                        {activeParticipants.map((p, idx) => {
                                            const runner = GROUP_RUNNERS[idx % GROUP_RUNNERS.length];
                                            const color = GROUP_COLORS[idx % GROUP_COLORS.length];
                                            return (
                                                <div
                                                    key={p.id || idx}
                                                    style={{
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        gap: '8px',
                                                        background: 'white',
                                                        border: `2px solid ${color}66`,
                                                        padding: '8px 16px',
                                                        borderRadius: '16px',
                                                        boxShadow: '0 4px 10px rgba(0,0,0,0.04)',
                                                        fontSize: '1.2rem',
                                                        fontWeight: '900',
                                                        color: '#1e293b',
                                                        animation: 'popIn 0.3s ease'
                                                    }}
                                                >
                                                    <span style={{ fontSize: '1.4rem' }}>{runner}</span>
                                                    <span>{p.nickname}</span>
                                                    {p.groupId && (
                                                        <span style={{ fontSize: '0.85rem', background: color, color: 'white', padding: '2px 6px', borderRadius: '8px' }}>
                                                            {p.groupId}조
                                                        </span>
                                                    )}
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                )}

                {/* --- SUB-VIEW B: QUIZRUN QUESTION ACTIVE --- */}
                {viewMode === 'quizrun' && gameState === 'question' && (
                    <div style={{
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '22px',
                        width: '100%',
                        maxWidth: '1100px'
                    }}>
                        {/* Question Card */}
                        <div style={{
                            background: 'white',
                            borderRadius: '32px',
                            padding: '44px 52px',
                            boxShadow: '0 20px 50px rgba(0,0,0,0.06)',
                            border: '3px solid #e2e8f0',
                            textAlign: 'center',
                            position: 'relative'
                        }}>
                            <div style={{
                                position: 'absolute',
                                top: '24px',
                                right: '32px',
                                background: '#fef3c7',
                                color: '#b45309',
                                padding: '8px 18px',
                                borderRadius: '20px',
                                fontSize: '1.25rem',
                                fontWeight: '900',
                                border: '2px solid #fde68a'
                            }}>
                                🪙 {points}점
                            </div>

                            <div style={{ fontSize: '1.4rem', fontWeight: '800', color: '#3b82f6', marginBottom: '14px' }}>
                                QUESTION {currentQuestionIndex + 1}
                            </div>

                            <h2 style={{
                                fontSize: '4rem',
                                fontWeight: '900',
                                color: '#0f172a',
                                lineHeight: '1.35',
                                wordBreak: 'keep-all',
                                margin: 0
                            }}>
                                {currentQuestion}
                            </h2>

                            {currentMediaUrl && (
                                <div style={{ marginTop: '20px', maxHeight: '360px', display: 'flex', justifyContent: 'center' }}>
                                    <MediaViewer
                                        mediaUrl={currentMediaUrl}
                                        mediaType={currentMediaType}
                                        mediaName={currentMediaName}
                                        displayMode={currentMediaDisplayMode}
                                        autoplay={true}
                                        isMuted={isMediaMutedOnScreen}
                                        remoteCommand={mediaRemoteCommand}
                                        isScreenView={true}
                                    />
                                </div>
                            )}

                            {quizType === 'short' && showChosung && correctAnswer && (
                                <div style={{
                                    marginTop: '22px',
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '14px',
                                    background: 'linear-gradient(135deg, #fef3c7 0%, #fde68a 100%)',
                                    padding: '14px 32px',
                                    borderRadius: '24px',
                                    border: '3px solid #f59e0b',
                                    boxShadow: '0 8px 20px rgba(245, 158, 11, 0.2)'
                                }}>
                                    <span style={{ fontSize: '1.8rem', fontWeight: '800', color: '#92400e' }}>💡 초성 힌트:</span>
                                    <span style={{ fontSize: '2.5rem', fontWeight: '900', color: '#4f46e5', letterSpacing: '8px' }}>{getChosung(correctAnswer)}</span>
                                </div>
                            )}
                        </div>

                        {/* Options Area (MCQ / OX) - Direct Touch/Click Enabled */}
                        {quizType !== 'short' && currentOptions && currentOptions.length > 0 && currentOptions.some(opt => opt && opt.trim() !== '') && (
                            <div style={{
                                display: 'grid',
                                gridTemplateColumns: currentOptions.length <= 2 ? '1fr 1fr' : '1fr 1fr',
                                gap: '16px'
                            }}>
                                {currentOptions.map((opt, idx) => {
                                    const isCorrect = idx === correctIndex;
                                    const optionRevealed = showAnswer;

                                    let bgColor = 'white';
                                    let borderColor = '#cbd5e1';
                                    let textColor = '#1e293b';
                                    let scale = '1';
                                    let shadow = '0 8px 24px rgba(0,0,0,0.04)';

                                    if (optionRevealed) {
                                        if (isCorrect) {
                                            bgColor = '#ecfdf5';
                                            borderColor = '#10b981';
                                            textColor = '#065f46';
                                            scale = '1.02';
                                            shadow = '0 12px 32px rgba(16, 185, 129, 0.25)';
                                        } else {
                                            bgColor = '#f8fafc';
                                            borderColor = '#e2e8f0';
                                            textColor = '#94a3b8';
                                            scale = '0.98';
                                        }
                                    }

                                    return (
                                        <div
                                            key={idx}
                                            onClick={() => handleOptionSelect(idx)}
                                            style={{
                                                background: bgColor,
                                                border: `4px solid ${borderColor}`,
                                                borderRadius: '24px',
                                                padding: '22px 28px',
                                                fontSize: '1.95rem',
                                                fontWeight: '800',
                                                color: textColor,
                                                display: 'flex',
                                                alignItems: 'center',
                                                boxShadow: shadow,
                                                transform: `scale(${scale})`,
                                                cursor: optionRevealed ? 'default' : 'pointer',
                                                transition: 'all 0.2s cubic-bezier(0.34, 1.56, 0.64, 1)',
                                                userSelect: 'none'
                                            }}
                                            onMouseEnter={(e) => {
                                                if (!optionRevealed) {
                                                    e.currentTarget.style.borderColor = '#3b82f6';
                                                    e.currentTarget.style.transform = 'scale(1.02)';
                                                }
                                            }}
                                            onMouseLeave={(e) => {
                                                if (!optionRevealed) {
                                                    e.currentTarget.style.borderColor = borderColor;
                                                    e.currentTarget.style.transform = 'scale(1)';
                                                }
                                            }}
                                        >
                                            <div style={{
                                                width: '50px',
                                                height: '50px',
                                                borderRadius: '16px',
                                                background: optionRevealed && isCorrect ? '#10b981' : '#f1f5f9',
                                                color: optionRevealed && isCorrect ? 'white' : '#64748b',
                                                display: 'flex',
                                                justifyContent: 'center',
                                                alignItems: 'center',
                                                fontSize: '1.5rem',
                                                fontWeight: '900',
                                                marginRight: '16px',
                                                flexShrink: 0
                                            }}>
                                                {currentOptions.length > 2 
                                                    ? ['①', '②', '③', '④'][idx] 
                                                    : (['O', 'X'].includes(currentOptions[0]?.toString().trim().toUpperCase()) ? ['O', 'X'][idx] : ['①', '②'][idx])}
                                            </div>
                                            <div style={{ flex: 1, wordBreak: 'keep-all' }}>
                                                {opt}
                                            </div>
                                            {optionRevealed && isCorrect && (
                                                <span style={{ fontSize: '2.4rem', marginLeft: '12px' }}>✅</span>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        )}

                            {/* Short Answer Direct Input on Secondary Screen (Online only) */}
                            {quizType === 'short' && !isOffline && !showAnswer && (
                                <form
                                    onSubmit={handleShortSubmit}
                                    style={{
                                        background: 'white',
                                        borderRadius: '26px',
                                        padding: '20px 28px',
                                        boxShadow: '0 12px 30px rgba(0,0,0,0.05)',
                                        border: '3px solid #e2e8f0',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '16px'
                                    }}
                                >
                                    <input
                                        type="text"
                                        value={shortInputAnswer}
                                        onChange={(e) => setShortInputAnswer(e.target.value)}
                                        placeholder="서브 스크린에서 정답을 직접 입력하세요..."
                                        style={{
                                            flex: 1,
                                            padding: '16px 22px',
                                            fontSize: '1.7rem',
                                            fontWeight: '800',
                                            borderRadius: '18px',
                                            border: '3px solid #cbd5e1',
                                            outline: 'none',
                                            color: '#0f172a'
                                        }}
                                    />
                                    <button
                                        type="submit"
                                        style={{
                                            padding: '16px 32px',
                                            fontSize: '1.45rem',
                                            fontWeight: '900',
                                            borderRadius: '18px',
                                            border: 'none',
                                            background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                                            color: 'white',
                                            cursor: 'pointer',
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '8px',
                                            boxShadow: '0 6px 20px rgba(16, 185, 129, 0.35)'
                                        }}
                                    >
                                        <Send size={22} /> 정답 확인
                                    </button>
                                </form>
                            )}

                            {/* Reveal Panel */}
                            {showAnswer && (
                                <div style={{
                                    background: '#f0fdf4',
                                    border: '4px solid #22c55e',
                                    borderRadius: '26px',
                                    padding: '24px 32px',
                                    textAlign: 'center',
                                    animation: 'slideUp 0.4s ease',
                                    boxShadow: '0 16px 40px rgba(34, 197, 94, 0.15)'
                                }}>
                                    <div style={{ fontSize: '2.1rem', fontWeight: '900', color: '#15803d', marginBottom: currentExplanation ? '10px' : '0' }}>
                                        🎯 정답: {(() => {
                                            if (quizType === 'short') return correctAnswer || '—';
                                            const optAns = (currentOptions && correctIndex !== null && correctIndex !== undefined && currentOptions[correctIndex] && String(currentOptions[correctIndex]).trim() !== '') ? currentOptions[correctIndex] : '';
                                            return optAns || correctAnswer || '—';
                                        })()}
                                    </div>
                                    {currentExplanation && (
                                        <div style={{
                                            fontSize: '1.35rem',
                                            fontWeight: '600',
                                            color: '#334155',
                                            lineHeight: 1.5,
                                            borderTop: '2px dashed #bbf7d0',
                                            paddingTop: '12px'
                                        }}>
                                            💡 {currentExplanation}
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* Online Buzzer Popup */}
                            {buzzedInfo && !judgeResult && (
                                <div style={{
                                    background: '#fef3c7',
                                    border: '4px solid #f59e0b',
                                    borderRadius: '26px',
                                    padding: '26px',
                                    textAlign: 'center',
                                    boxShadow: '0 20px 40px rgba(245, 158, 11, 0.25)'
                                }}>
                                    <div style={{ fontSize: '3rem', fontWeight: '900', color: '#b45309' }}>
                                        🚨 정답 도전!
                                    </div>
                                    <div style={{ fontSize: '1.7rem', fontWeight: '800', color: '#92400e', marginTop: '6px' }}>
                                        [{buzzedInfo.nickname}]님이 버저를 눌렀습니다!
                                    </div>
                                </div>
                            )}

                            {judgeResult && (
                                <div style={{
                                    background: judgeResult === 'correct' ? '#ecfdf5' : '#fef2f2',
                                    border: `4px solid ${judgeResult === 'correct' ? '#10b981' : '#ef4444'}`,
                                    borderRadius: '26px',
                                    padding: '26px',
                                    textAlign: 'center'
                                }}>
                                    <div style={{
                                        fontSize: '3rem',
                                        fontWeight: '900',
                                        color: judgeResult === 'correct' ? '#065f46' : '#991b1b'
                                    }}>
                                        {judgeResult === 'correct' ? '🎉 정답입니다!' : '💥 아쉽게도 오답입니다!'}
                                    </div>
                                </div>
                            )}

                            {/* Group Race Track (Online Mode) */}
                            {Object.keys(groupScores || {}).length > 0 && (
                                <ScreenRaceTrack
                                    groupScores={groupScores}
                                    participants={participants}
                                    totalScore={totalPoints}
                                />
                            )}
                    </div>
                )}

                {/* --- SUB-VIEW C: LEADERBOARD / WINNER SCREEN --- */}
                {viewMode === 'quizrun' && (gameState === 'leaderboard' || gameState === 'final_leaderboard' || gameState === 'winner') && (
                    <div style={{
                        width: '100%',
                        maxWidth: '1100px',
                        background: 'white',
                        borderRadius: '36px',
                        padding: '40px',
                        boxShadow: '0 25px 60px rgba(0,0,0,0.08)',
                        textAlign: 'center',
                        border: '3px solid #e2e8f0'
                    }}>
                        <div style={{ fontSize: '4.5rem', marginBottom: '8px' }}>🏆</div>
                        <h2 style={{ fontSize: '3rem', fontWeight: '900', color: '#1e293b', marginBottom: '24px' }}>
                            {gameState === 'final_leaderboard' || gameState === 'winner' ? '최종 순위 발표' : '현재 순위 현황'}
                        </h2>

                        <ScreenRaceTrack
                            groupScores={groupScores}
                            participants={participants}
                            totalScore={totalPoints}
                        />
                    </div>
                )}
            </main>
        </div>
    );
}
