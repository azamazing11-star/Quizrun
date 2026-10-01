import React, { useState, useEffect, useRef } from 'react';
import { Users, Play, ChevronRight, Trophy, Home, ArrowLeft, Zap, ClipboardCheck, Type, Edit3, Tv, Eye, X } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useGlobalSession } from '../context/GlobalSessionContext';
import QRCode from 'react-qr-code';
import Confetti from 'react-confetti';
import { playSound } from '../utils/audio';
import { getParticipantJoinUrl } from '../utils/url';
import { getChosung } from '../utils/chosung';
import MediaViewer from '../components/MediaViewer';
import { 
    YutnoriGame, 
    CardMatchGame, 
    RpsGame, 
    WhackMoleGame, 
    OmokGame, 
    MinesweeperGame, 
    SpeedNumbersGame, 
    JanggiGame, 
    ChessGame, 
    PokerGame, 
    GoStopGame, 
    OthelloGame, 
    TetrisGame, 
    BrickBreakerGame,
    MemoryGame,
    PassBombGame
} from './Participant';
import StockGame from '../components/StockGame';
import RightSidebar from '../components/RightSidebar';

// Group colors for the racing track
const GROUP_COLORS = [
    '#ef4444', '#f97316', '#eab308', '#22c55e',
    '#14b8a6', '#3b82f6', '#8b5cf6', '#ec4899',
    '#06b6d4', '#84cc16', '#f59e0b', '#6366f1'
];
const GROUP_RUNNERS = ['🏃', '🏃‍♀️', '🚀', '⚡', '🦊', '🐯', '🦁', '🐺', '🦅', '🐉', '🌟', '💫'];

function RaceTrack({ groupScores, participants, totalScore }) {
    // Collect all unique scorers
    const unifiedScores = [];

    // 1. Groups
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

    // 2. Individuals (groupId is null)
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

    // Sort by score descending
    const sorted = unifiedScores.sort((a, b) => b.score - a.score).slice(0, 12); // Show top 12
    if (sorted.length === 0) return null;

    // The denominator is now the total possible points of the quiz
    const maxPossScore = totalScore || 1000;

    return (
        <div style={{ margin: '30px 0', background: '#f1f5f9', borderRadius: '20px', padding: '24px 20px', border: '2px solid #e2e8f0', boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.05)', position: 'relative' }}>
            {/* Grid lines */}
            <div style={{ position: 'absolute', inset: '24px 20px', pointerEvents: 'none', display: 'flex', justifyContent: 'space-between', zIndex: 0, opacity: 0.1 }}>
                {[...Array(11)].map((_, i) => <div key={i} style={{ width: '1px', background: '#000', height: '100%' }} />)}
            </div>

            <h3 style={{ textAlign: 'center', marginBottom: '20px', color: 'var(--text)', fontSize: '1.4rem', fontWeight: '900', letterSpacing: '1px', position: 'relative', zIndex: 1 }}>
                실시간 순위 🏁
            </h3>
            {sorted.map((item, index) => {
                const colorIdx = item.type === 'group' ? (Number(item.sourceId) - 1) % GROUP_COLORS.length : index % GROUP_COLORS.length;
                const color = GROUP_COLORS[colorIdx];
                // pct is relative to total quiz points. Max 95 to leave some room at end.
                const pct = Math.min(95, Math.max(8, (item.score / maxPossScore) * 95)); 
                const runner = GROUP_RUNNERS[colorIdx];
                
                return (
                    <div key={item.id} style={{ display: 'flex', alignItems: 'center', gap: '15px', marginBottom: '16px', animation: 'slideIn 0.5s ease', position: 'relative', zIndex: 1 }}>
                        <div style={{
                            minWidth: '70px', textAlign: 'center', fontWeight: '800',
                            fontSize: '0.9rem', color: index < 3 ? 'var(--secondary)' : color,
                            display: 'flex', flexDirection: 'column', lineHeight: '1.2'
                        }}>
                            <span style={{ fontSize: index < 3 ? '1.1rem' : '0.9rem' }}>{index + 1}위</span>
                            <span style={{ fontSize: '0.75rem', opacity: 0.8 }}>{item.name}</span>
                        </div>
                        <div style={{ flex: 1, background: '#e2e8f0', borderRadius: '12px', height: '40px', position: 'relative' }}>
                            <div style={{
                                width: `${pct}%`,
                                height: '100%',
                                background: index < 3 
                                    ? `linear-gradient(90deg, #fbbf24, #f59e0b)`
                                    : `linear-gradient(90deg, ${color}99, ${color})`,
                                borderRadius: '12px',
                                transition: 'width 1.2s cubic-bezier(0.34, 1.56, 0.64, 1)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'flex-end',
                                position: 'relative'
                            }}>
                                <div style={{
                                    position: 'absolute',
                                    right: '-12px',
                                    fontSize: '2rem',
                                    transform: 'scaleX(-1)', // Flip to face right
                                    filter: 'drop-shadow(2px 2px 4px rgba(0,0,0,0.2))',
                                    zIndex: 2,
                                    lineHeight: 1
                                }}>
                                    {runner}
                                </div>
                            </div>
                        </div>
                        <div style={{ minWidth: '85px', textAlign: 'right', fontWeight: '900', fontSize: '1.1rem', color: index < 3 ? 'var(--secondary)' : color }}>
                            {item.score.toLocaleString()}
                            <span style={{ fontSize: '0.7rem', marginLeft: '2px', opacity: 0.7 }}>점</span>
                        </div>
                    </div>
                );
            })}
        </div>
    );
}

export default function Host({ socket }) {
    const location = useLocation();
    const navigate = useNavigate();

    // Cache and retrieve last host state from sessionStorage
    const savedHostState = (() => {
        try {
            const raw = sessionStorage.getItem('quizrun_last_host_state');
            return raw ? JSON.parse(raw) : null;
        } catch (e) {
            return null;
        }
    })();

    const isGame = Boolean(location.state?.isGame ?? savedHostState?.isGame);
    const initialGameId = location.state?.gameId || savedHostState?.gameId || '';
    const initialGameTitle = location.state?.gameTitle || savedHostState?.gameTitle || '';
    const isLobbyMultiplayer = ['word_bomb', 'ox_run', 'catch_mind'].includes(initialGameId);

    const quizId = location.state?.quizId || 'general';

    // --- GLOBAL SESSION & OFFLINE MODE STATES ---
    const { 
        gameMode, 
        participantCount: globalParticipantCount, 
        scores: globalScores, 
        adjustScore: globalAdjustScore, 
        setExactScore: globalSetExactScore,
        onlinePin,
        onlineParticipants
    } = useGlobalSession();

    const isOffline = location.state?.isOffline ?? (gameMode === 'offline');
    const participantCount = location.state?.participantCount || globalParticipantCount || 0;

    const [pin, setPin] = useState(location.state?.pin || savedHostState?.pin || onlinePin || null);
    const [quizTitle, setQuizTitle] = useState(location.state?.customQuiz?.title || initialGameTitle || '');
    const [participants, setParticipants] = useState(onlineParticipants || []);
    const [gameId, setGameId] = useState(initialGameId);
    const [gameState, setGameState] = useState(() => {
        if (isGame) {
            return (!isOffline && isLobbyMultiplayer) ? 'lobby' : 'game_active';
        }
        return 'setup';
    });
    const [answeredCount, setAnsweredCount] = useState(0);
    const [currentQuestion, setCurrentQuestion] = useState('');
    const [currentMediaUrl, setCurrentMediaUrl] = useState('');
    const [currentMediaType, setCurrentMediaType] = useState('');
    const [currentMediaName, setCurrentMediaName] = useState('');
    const [currentMediaDisplayMode, setCurrentMediaDisplayMode] = useState('auto');
    const [currentAutoplay, setCurrentAutoplay] = useState(false);
    const [showChosung, setShowChosung] = useState(true);
    const [currentOptions, setCurrentOptions] = useState([]);
    const [correctIndex, setCorrectIndex] = useState(null);
    const [correctAnswer, setCorrectAnswer] = useState('');
    const [currentExplanation, setCurrentExplanation] = useState('');
    const [serverIp, setServerIp] = useState(window.location.hostname);
    const [publicUrl, setPublicUrl] = useState(location.state?.publicUrl || '');
    const [quizType, setQuizType] = useState('mcq');
    const [showGameQrModal, setShowGameQrModal] = useState(false);

    // Buzzer Mode state
    const [isBuzzerMode, setIsBuzzerMode] = useState(false);
    const [currentPoints, setCurrentPoints] = useState(10);
    const [totalScore, setTotalScore] = useState(0);
    const [buzzedInfo, setBuzzedInfo] = useState(null);
    const [showAnswer, setShowAnswer] = useState(false);
    const [groupScores, setGroupScores] = useState({});
    const [judgeResult, setJudgeResult] = useState(null); // null | 'correct' | 'incorrect'
    const [maxScore, setMaxScore] = useState(1000);
    const [firstCorrectInfo, setFirstCorrectInfo] = useState(null);

    const [localOfflineScores, setLocalOfflineScores] = useState(() => {
        const initial = location.state?.initialScores;
        if (initial) return initial;
        return Array.from({ length: participantCount }, (_, i) => ({ num: i + 1, score: 0 }));
    });

    const offlineScores = (globalScores && globalScores.length > 0) ? globalScores : localOfflineScores;
    const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
    const [totalQuestions, setTotalQuestions] = useState(0);
    const [offlineShowAnswer, setOfflineShowAnswer] = useState(false);
    const [showOfflineWinner, setShowOfflineWinner] = useState(false);
    const [showContinueModal, setShowContinueModal] = useState(false);
    const [offlineConfetti, setOfflineConfetti] = useState(false);
    const [orderType, setOrderType] = useState('sequential'); // 'sequential' | 'random'
    const [showBackConfirmModal, setShowBackConfirmModal] = useState(false);

    // --- DUAL SCREEN & PRESENTER VIEW STATES ---
    const screenChannelRef = useRef(null);
    const [isScreenConnected, setIsScreenConnected] = useState(false);
    const [audioOutputTarget, setAudioOutputTarget] = useState('screen'); // 'screen' | 'host' | 'none'
    const [allQuizQuestions, setAllQuizQuestions] = useState(location.state?.customQuiz?.questions || []);

    const quizCounts = React.useMemo(() => {
        const list = Array.isArray(allQuizQuestions) ? allQuizQuestions : [];
        const total = list.length;
        const ox = list.filter(q => q.type === 'ox' || (q.options && q.options.length === 2)).length;
        const mcq = list.filter(q => q.type === 'mcq' || (q.options && q.options.length > 2 && q.options.some(opt => opt && String(opt).trim() !== ''))).length;
        const short = list.filter(q => q.type === 'short' || ((!q.options || q.options.length === 0 || q.options.every(opt => !opt || String(opt).trim() === '')) && Boolean(q.answer && String(q.answer).trim() !== ''))).length;
        return { total, mcq, ox, short };
    }, [allQuizQuestions]);

    useEffect(() => {
        if ((!allQuizQuestions || allQuizQuestions.length === 0) && socket) {
            const customQuiz = location.state?.customQuiz;
            if (customQuiz && Array.isArray(customQuiz.questions) && customQuiz.questions.length > 0) {
                setAllQuizQuestions(customQuiz.questions);
                return;
            }
            const topicId = location.state?.topicId || quizId;
            const subId = location.state?.subId;
            if (topicId && subId && topicId !== 'general') {
                socket.emit('quiz:getQuestions', { topicId, subId }, (res) => {
                    if (res && res.success && res.data) {
                        const combined = [
                            ...(res.data.mcq || []).map(q => ({ ...q, type: 'mcq' })),
                            ...(res.data.ox || []).map(q => ({ ...q, type: 'ox' })),
                            ...(res.data.short || []).map(q => ({ ...q, type: 'short' }))
                        ];
                        setAllQuizQuestions(combined);
                    }
                });
            }
        }
    }, [socket, location.state, quizId, allQuizQuestions]);

    const openScreenWindow = () => {
        const screenWin = window.open(
            '/screen?subscreen=true',
            'QuizrunScreenWindow',
            'width=1280,height=720,menubar=no,toolbar=no,location=no,status=no'
        );
        if (screenWin) {
            screenWin.focus();
            broadcastToScreen();
        }
    };

    const getScreenPayload = (overrides = {}) => {
        const isAnsRevealed = isOffline 
            ? (overrides.offlineShowAnswer !== undefined ? overrides.offlineShowAnswer : offlineShowAnswer)
            : (overrides.showAnswer !== undefined ? overrides.showAnswer : showAnswer);
        return {
            mode: overrides.mode || (gameId === 'stock_game' ? 'stock_game' : 'quizrun'),
            scores: offlineScores,
            gameState: overrides.gameState || gameState,
            isOffline,
            isBuzzerMode,
            quizTitle,
            currentQuestion: overrides.currentQuestion !== undefined ? overrides.currentQuestion : currentQuestion,
            currentOptions: overrides.currentOptions !== undefined ? overrides.currentOptions : currentOptions,
            correctIndex: overrides.correctIndex !== undefined ? overrides.correctIndex : correctIndex,
            correctAnswer: overrides.correctAnswer !== undefined ? overrides.correctAnswer : correctAnswer,
            currentExplanation: overrides.currentExplanation !== undefined ? overrides.currentExplanation : currentExplanation,
            showAnswer: isAnsRevealed,
            currentQuestionIndex: overrides.currentQuestionIndex !== undefined ? overrides.currentQuestionIndex : currentQuestionIndex,
            totalQuestions: overrides.totalQuestions !== undefined ? overrides.totalQuestions : totalQuestions,
            points: currentPoints,
            totalPoints: totalScore,
            currentMediaUrl: overrides.currentMediaUrl !== undefined ? overrides.currentMediaUrl : currentMediaUrl,
            currentMediaType: overrides.currentMediaType !== undefined ? overrides.currentMediaType : currentMediaType,
            currentMediaName: overrides.currentMediaName !== undefined ? overrides.currentMediaName : currentMediaName,
            currentMediaDisplayMode: overrides.currentMediaDisplayMode !== undefined ? overrides.currentMediaDisplayMode : currentMediaDisplayMode,
            showChosung,
            quizType,
            buzzedInfo,
            judgeResult,
            groupScores,
            participants,
            pin,
            serverIp,
            publicUrl: location.state?.publicUrl || '',
            confetti: offlineConfetti,
            offlineWinnerList: offlineScores?.slice()?.sort((a, b) => b.score - a.score) || [],
            isMediaMutedOnScreen: isScreenConnected ? (audioOutputTarget === 'host' || audioOutputTarget === 'none') : false
        };
    };

    const broadcastToScreen = (overrides = {}) => {
        if (screenChannelRef.current) {
            try {
                screenChannelRef.current.postMessage({
                    type: 'STATE_UPDATE',
                    payload: getScreenPayload(overrides)
                });
            } catch (e) {
                console.error('BroadcastChannel error:', e);
            }
        }
    };

    const broadcastMediaAction = (action) => {
        if (screenChannelRef.current) {
            try {
                screenChannelRef.current.postMessage({
                    type: 'MEDIA_COMMAND',
                    payload: { action, timestamp: Date.now() }
                });
            } catch (e) {
                console.error('BroadcastChannel media command error:', e);
            }
        }
    };

    const getScreenPayloadRef = useRef(getScreenPayload);
    getScreenPayloadRef.current = getScreenPayload;

    const isOfflineRef = useRef(isOffline);
    isOfflineRef.current = isOffline;
    const lastScreenPingRef = useRef(0);

    useEffect(() => {
        let channel;
        try {
            channel = new BroadcastChannel('quizrun_screen_sync');
            screenChannelRef.current = channel;

            channel.onmessage = (event) => {
                const { type, payload } = event.data || {};
                if (type === 'SCREEN_PING') {
                    lastScreenPingRef.current = Date.now();
                    setIsScreenConnected(true);
                    channel.postMessage({
                        type: 'HOST_PONG',
                        payload: getScreenPayloadRef.current()
                    });
                } else if (type === 'SCREEN_ANSWER_SELECTED') {
                    const { isCorrect } = payload || {};
                    if (isOfflineRef.current) {
                        setOfflineShowAnswer(true);
                        playSound(isCorrect ? 'correct' : 'wrong');
                    } else {
                        setShowAnswer(true);
                        playSound(isCorrect ? 'correct' : 'wrong');
                    }
                } else if (type === 'SCREEN_REVEAL_REQUEST') {
                    if (isOfflineRef.current) {
                        setOfflineShowAnswer(true);
                        playSound('reveal');
                    } else {
                        setShowAnswer(true);
                        playSound('reveal');
                    }
                }
            };
        } catch (e) {
            console.warn('BroadcastChannel not supported in Host:', e);
        }

        // Periodic heartbeat check: revert isScreenConnected to false if no ping for 6 seconds
        const heartbeatInterval = setInterval(() => {
            if (Date.now() - lastScreenPingRef.current > 6000) {
                setIsScreenConnected(false);
            }
        }, 3000);

        // Cleanup ONLY when Host component completely unmounts (leaving quiz)
        return () => {
            clearInterval(heartbeatInterval);
            if (channel) {
                channel.postMessage({
                    type: 'STATE_UPDATE',
                    payload: {
                        mode: 'home',
                        gameState: 'waiting',
                        currentQuestion: '',
                        currentOptions: [],
                        quizTitle: '퀴즈앤런 (Quiz N Run)'
                    }
                });
                channel.close();
            }
        };
    }, []); // Empty dependency array -> never resets or flickers on score changes!

    useEffect(() => {
        broadcastToScreen();
    }, [
        gameState, currentQuestion, currentOptions, correctIndex, correctAnswer, 
        currentExplanation, offlineShowAnswer, showAnswer, currentQuestionIndex, 
        totalQuestions, currentPoints, currentMediaUrl, buzzedInfo, judgeResult, 
        groupScores, participants, offlineScores, offlineConfetti, audioOutputTarget, isScreenConnected
    ]);

    const handleBackToSetupClick = () => {
        if (isOffline) {
            setShowBackConfirmModal(true);
        } else {
            if (window.confirm("퀴즈 모드 선택 화면으로 돌아가시겠습니까? 진행 중인 퀴즈가 종료됩니다.")) {
                setGameState('setup');
            }
        }
    };

    // --- MULTIPLAYER GAME STATES ---
    useEffect(() => {
        if (location.state?.gameId && location.state.gameId !== gameId) {
            setGameId(location.state.gameId);
        }
    }, [location.state?.gameId]);

    const [activePlayerIndex, setActivePlayerIndex] = useState(0);
    const [gameSyllable, setGameSyllable] = useState('');
    const [gameTimeLeft, setGameTimeLeft] = useState(15);
    const [gameEliminated, setGameEliminated] = useState([]);
    const [gameUsedWords, setGameUsedWords] = useState([]);
    const [gameWinner, setGameWinner] = useState(null);
    
    // OX Game states
    const [oxQuestionIndex, setOxQuestionIndex] = useState(0);
    const [oxChoices, setOxChoices] = useState({}); // { playerId: choice }
    const [oxReveal, setOxReveal] = useState(false);
    
    // Catch Mind states
    const [painterId, setPainterId] = useState('');
    const [painterNickname, setPainterNickname] = useState('');
    const [catchMindSecretWord, setCatchMindSecretWord] = useState('');
    const [catchMindWinner, setCatchMindWinner] = useState(null);
    const [canvasLines, setCanvasLines] = useState([]);

    useEffect(() => {
        const handleTunnelUpdate = (data) => {
            if (data && data.publicUrl) {
                setPublicUrl(data.publicUrl);
            }
        };
        const handleNetworkUpdate = (data) => {
            if (data) {
                if (data.ip) setServerIp(data.ip);
                if (data.publicUrl) setPublicUrl(data.publicUrl);
            }
        };
        socket.on('tunnel:updated', handleTunnelUpdate);
        socket.on('network:updated', handleNetworkUpdate);
        socket.on('host:participantsUpdated', (updated) => {
            setParticipants(updated);
            try {
                const bc = new BroadcastChannel('quizrun_screen_sync');
                bc.postMessage({ type: 'PARTICIPANTS_UPDATE', payload: { participants: updated } });
                setTimeout(() => bc.close(), 200);
            } catch (e) {}
        });
        socket.on('host:participantAnswered', ({ answeredCount, groupScores }) => {
            setAnsweredCount(answeredCount);
            if (groupScores) {
                setGroupScores(groupScores);
                const top = Math.max(...Object.values(groupScores), 10);
                setMaxScore(top);
            }
        });
        socket.on('room:stateUpdate', (data) => {
            setGameState(data.state);
            setIsBuzzerMode(!!data.isBuzzerMode);
            const currentOpts = data.options || [];
            const effectiveQuizType = data.quizType || (currentOpts.filter(o => o && String(o).trim() !== '').length > 0 ? (currentOpts.length === 2 ? 'ox' : 'mcq') : 'short');
            setQuizType(effectiveQuizType);
            if (data.currentQuestionIndex !== undefined) setCurrentQuestionIndex(data.currentQuestionIndex);
            if (data.totalQuestions !== undefined) setTotalQuestions(data.totalQuestions);
            if (data.state === 'question') {
                setCurrentQuestion(typeof data.question === 'object' ? data.question.text : data.question);
                setCurrentMediaUrl(data.mediaUrl || data.question?.mediaUrl || '');
                setCurrentMediaType(data.mediaType || data.question?.mediaType || '');
                setCurrentMediaName(data.mediaName || data.question?.mediaName || '');
                setCurrentMediaDisplayMode(data.mediaDisplayMode || data.question?.mediaDisplayMode || 'audio');
                setCurrentAutoplay(data.autoplay !== undefined ? data.autoplay : (data.question?.autoplay !== undefined ? data.question.autoplay : true));
                setShowChosung(data.showChosung !== undefined ? data.showChosung : (data.question?.showChosung !== undefined ? data.question.showChosung : true));
                if (data.points !== undefined) setCurrentPoints(data.points);
                if (data.totalPoints !== undefined) setTotalScore(data.totalPoints);
                setCurrentOptions(currentOpts);
                setCorrectIndex(data.correctIndex);
                const optAns = (currentOpts && data.correctIndex !== null && data.correctIndex !== undefined && currentOpts[data.correctIndex] && String(currentOpts[data.correctIndex]).trim() !== '') ? currentOpts[data.correctIndex] : '';
                const ans = (data.correctAnswer !== undefined && data.correctAnswer !== null && String(data.correctAnswer).trim() !== '')
                    ? data.correctAnswer
                    : (typeof data.question === 'object' ? (data.question.answer || data.question.correctAnswer) : optAns);
                setCorrectAnswer(ans || '');
                setCurrentExplanation(data.explanation || '');
                setBuzzedInfo(null);
                setShowAnswer(false);
                setOfflineShowAnswer(false);
                setJudgeResult(null);
                setFirstCorrectInfo(null);
            } else if (data.state === 'leaderboard') {
                setGameState('leaderboard');
                document.querySelectorAll('audio, video').forEach(el => {
                    try { el.pause(); el.currentTime = 0; } catch(e) {}
                });
                document.querySelectorAll('iframe').forEach(el => {
                    try { el.contentWindow?.postMessage(JSON.stringify({ event: 'command', func: 'pauseVideo', args: '' }), '*'); } catch(e) {}
                });
                setCurrentMediaUrl('');
                setAnsweredCount(0); // Reset for next use
                setBuzzedInfo(null);
                setShowAnswer(false);
                setJudgeResult(null);
                // DO NOT clear firstCorrectInfo here so the trophy stays visible on the leaderboard
            } else if (data.state === 'final_leaderboard') {
                document.querySelectorAll('audio, video').forEach(el => {
                    try { el.pause(); el.currentTime = 0; } catch(e) {}
                });
                document.querySelectorAll('iframe').forEach(el => {
                    try { el.contentWindow?.postMessage(JSON.stringify({ event: 'command', func: 'pauseVideo', args: '' }), '*'); } catch(e) {}
                });
                setCurrentMediaUrl('');
                playSound('fanfare');
            }
        });
        socket.on('room:buzzed', (data) => {
            setBuzzedInfo(data);
            playSound('reveal');
        });
        socket.on('room:firstCorrect', (data) => {
            setFirstCorrectInfo(data);
            playSound('correct');
        });
        socket.on('room:buzzerJudge', (data) => {
            setGroupScores(data.groupScores || {});
            const top = Math.max(...Object.values(data.groupScores || {}), 1000);
            setMaxScore(top);
            setJudgeResult(data.isCorrect ? 'correct' : 'incorrect');
        });
        socket.on('room:message', (data) => {
            if (data && data.event) {
                if (data.event === 'game:submit_word') {
                    handleWordSubmit(data.sender, data.payload.word);
                } else if (data.event === 'game:submit_ox') {
                    setOxChoices(prev => ({ ...prev, [data.sender]: data.payload.choice }));
                } else if (data.event === 'game:submit_guess') {
                    handleGuessSubmit(data.sender, data.payload.guess);
                } else if (data.event === 'game:paint_stroke') {
                    // Relay drawing coordinates to all participants so they draw on their screens
                    const currentPin = location.state?.pin || pin;
                    socket.emit('room:message', { pin: currentPin, event: 'game:paint_stroke_relay', payload: data.payload });
                    // Store line locally for rendering
                    setCanvasLines(prev => [...prev, data.payload]);
                } else if (data.event === 'game:mini_progress') {
                    const { score, finished } = data.payload;
                    setParticipants(prev => {
                        return prev.map(p => {
                            if (p.id === data.sender) {
                                return { ...p, score: (p.score || 0) + score, finished: finished || p.finished };
                            }
                            return p;
                        });
                    });
                }
            }
        });

        return () => {
            socket.off('tunnel:updated', handleTunnelUpdate);
            socket.off('network:updated', handleNetworkUpdate);
            socket.off('room:message');
            socket.off('host:participantsUpdated');
            socket.off('host:participantAnswered');
            socket.off('room:stateUpdate');
            socket.off('room:buzzed');
        };
    }, [socket]);

    useEffect(() => {
        if (gameState !== 'game_active' || !gameId) return;
        // 주식게임은 BGM 없음
        if (gameId === 'stock_game') return;
        
        let bgmFile = '/audio/science_is_fun.mp3'; // Default (e.g. word_bomb, minesweeper)
        if (gameId === 'ox_run' || gameId === 'whack_mole' || gameId === 'tetris') {
            bgmFile = '/audio/new_rally_x.mp3';
        } else if (gameId === 'janggi' || gameId === 'omok' || gameId === 'gostop' || gameId === 'yutnori') {
            bgmFile = '/audio/bgm.mp3';
        } else if (gameId === 'brick_breaker' || gameId === 'rock_paper_scissors' || gameId === 'speed_numbers') {
            bgmFile = '/audio/arcade_theme.mp3';
        } else if (gameId === 'chess' || gameId === 'card_poker' || gameId === 'othello' || gameId === 'card_match') {
            bgmFile = '/audio/chill_theme.mp3';
        } else if (gameId === 'catch_mind' || gameId === 'memory_game') {
            bgmFile = '/audio/puzzle_theme.mp3';
        } else if (gameId === 'pass_bomb') {
            bgmFile = '/audio/battle_theme.mp3';
        }
        
        const audio = new Audio(bgmFile);
        audio.loop = true;
        audio.volume = 0.25;
        
        audio.play().catch(e => console.log('BGM play blocked on host:', e));
        
        return () => {
            audio.pause();
        };
    }, [gameState, gameId]);

    const createRoom = (mode = 'normal') => {
        const customQuiz = location.state?.customQuiz;
        const targetPin = location.state?.pin || onlinePin || pin;
        socket.emit('host:createRoom', { pin: targetPin, mode, quizId, quiz: customQuiz, orderType }, (res) => {
            if (res.success) {
                setPin(res.pin);
                setQuizTitle(res.title);
                setIsBuzzerMode(!!res.isBuzzerMode);
                if (res.quizType) setQuizType(res.quizType);
                if (res.ip) setServerIp(res.ip);
                if (res.publicUrl) setPublicUrl(res.publicUrl);
                setTotalScore(res.totalPoints || 0);
                setGroupScores({});
                if (res.participants && Array.isArray(res.participants) && res.participants.length > 0) {
                    setParticipants(res.participants);
                }
                if (res.questions && Array.isArray(res.questions)) {
                    setAllQuizQuestions(res.questions);
                }
                if (isOffline) {
                    // Skip lobby for offline mode — start game immediately
                    socket.emit('host:startGame', res.pin);
                    setAnsweredCount(0);
                } else {
                    setGameState('lobby');
                }
            } else {
                // Show error to user — e.g. "이 퀴즈에 OX 문제가 없습니다"
                alert(res.message || '퀴즈 방을 만들 수 없습니다. 문제를 먼저 추가해주세요.');
            }
        });
    };

    const updatePoints = (newPoints) => {
        const p = Math.max(1, Math.min(100, newPoints));
        setCurrentPoints(p);
        socket.emit('host:updateQuestionPoints', { pin, points: p });
    };

    const startGame = () => {
        socket.emit('host:startGame', pin);
        setAnsweredCount(0);
    };

    const judgeAnswer = (isCorrect) => {
        playSound(isCorrect ? 'correct' : 'wrong');
        socket.emit('host:buzzerJudge', { pin, isCorrect });
    };

    const showResults = () => {
        playSound('reveal');
        socket.emit('host:showResults', pin);
    };

    const nextQuestion = () => {
        setCurrentMediaUrl('');
        socket.emit('host:nextQuestion', pin);
        setAnsweredCount(0);
        setBuzzedInfo(null);
        setShowAnswer(false);
        setOfflineShowAnswer(false);
        setJudgeResult(null);
    };

    const prevQuestion = () => {
        if (currentQuestionIndex <= 0) return;
        setCurrentMediaUrl('');
        socket.emit('host:prevQuestion', pin);
        setAnsweredCount(0);
        setBuzzedInfo(null);
        setShowAnswer(false);
        setOfflineShowAnswer(false);
        setJudgeResult(null);
    };

    const offlineNextQuestion = () => {
        const isLast = currentQuestionIndex >= totalQuestions - 1;
        if (isLast) {
            // Stop all playing media immediately
            document.querySelectorAll('audio, video').forEach(el => {
                try { el.pause(); el.currentTime = 0; } catch(e) {}
            });
            document.querySelectorAll('iframe').forEach(el => {
                try { el.contentWindow?.postMessage(JSON.stringify({ event: 'command', func: 'pauseVideo', args: '' }), '*'); } catch(e) {}
            });
            setCurrentMediaUrl('');
            setCurrentAutoplay(false);

            // Trigger winner screen
            playSound('fanfare');
            setOfflineConfetti(true);
            setShowOfflineWinner(true);
            setTimeout(() => setOfflineConfetti(false), 8000);
        } else {
            nextQuestion();
        }
    };

    const offlinePrevQuestion = () => {
        if (showOfflineWinner) {
            setShowOfflineWinner(false);
            setOfflineShowAnswer(true);
            return;
        }
        if (offlineShowAnswer) {
            setOfflineShowAnswer(false);
            return;
        }
        if (currentQuestionIndex > 0) {
            prevQuestion();
        }
    };

    // Keyboard navigation (ArrowRight, ArrowLeft, Enter)
    useEffect(() => {
        if (gameState !== 'question' && gameState !== 'leaderboard') return;

        const handleKeyDown = (e) => {
            const tag = document.activeElement?.tagName?.toLowerCase();
            if (tag === 'input' || tag === 'textarea' || document.activeElement?.isContentEditable) {
                return;
            }

            if (e.key === 'ArrowRight' || e.key === 'Enter') {
                e.preventDefault();
                if (isOffline) {
                    if (!offlineShowAnswer) {
                        setOfflineShowAnswer(true);
                        playSound('reveal');
                    } else {
                        offlineNextQuestion();
                    }
                } else {
                    if (isBuzzerMode) {
                        if (!showAnswer && !judgeResult) {
                            setShowAnswer(true);
                            playSound('reveal');
                        } else if (judgeResult) {
                            nextQuestion();
                        }
                    } else {
                        if (gameState === 'question') {
                            showResults();
                        } else if (gameState === 'leaderboard') {
                            nextQuestion();
                        }
                    }
                }
            } else if (e.key === 'ArrowLeft') {
                e.preventDefault();
                if (isOffline) {
                    offlinePrevQuestion();
                } else {
                    if (isBuzzerMode) {
                        if (showAnswer) {
                            setShowAnswer(false);
                        } else if (judgeResult) {
                            setJudgeResult(null);
                        } else if (currentQuestionIndex > 0) {
                            prevQuestion();
                        }
                    } else {
                        if (gameState === 'question' && currentQuestionIndex > 0) {
                            prevQuestion();
                        }
                    }
                }
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [gameState, isOffline, offlineShowAnswer, showOfflineWinner, currentQuestionIndex, totalQuestions, isBuzzerMode, showAnswer, judgeResult, pin]);

    const adjustOfflineScore = (idx, delta) => {
        if (globalScores && globalScores[idx]) {
            globalAdjustScore(globalScores[idx].num, delta);
        } else {
            setLocalOfflineScores(prev => prev.map((p, i) => i === idx ? { ...p, score: p.score + delta } : p));
        }
    };

    const handleExactOfflineScore = (idx) => {
        const currentNum = offlineScores[idx]?.num || (idx + 1);
        const currentScore = offlineScores[idx]?.score || 0;
        const val = prompt(`${currentNum}번 참가자의 새로운 점수를 입력하세요:`, String(currentScore));
        if (val !== null && val.trim() !== '') {
            const parsed = parseInt(val, 10);
            if (!isNaN(parsed)) {
                if (globalScores && globalScores[idx]) {
                    globalSetExactScore(currentNum, parsed);
                } else {
                    setLocalOfflineScores(prev => prev.map((p, i) => i === idx ? { ...p, score: parsed } : p));
                }
            }
        }
    };

    
    // --- MULTIPLAYER GAME HOST LOOP ---
    
    // Auto-create room for games
    useEffect(() => {
        if (isGame) {
            try {
                sessionStorage.setItem('quizrun_last_host_state', JSON.stringify({
                    isGame: true,
                    gameId,
                    gameTitle: initialGameTitle,
                    pin: location.state?.pin || savedHostState?.pin || onlinePin || pin
                }));
            } catch (e) {}

            const targetPin = location.state?.pin || savedHostState?.pin || onlinePin || pin;
            socket.emit('host:createRoom', { 
                pin: targetPin,
                mode: 'game', 
                quizId: gameId, 
                quiz: { 
                    title: initialGameTitle || gameId, 
                    questions: [{ question: 'Game Start', answer: '', options: [] }] 
                } 
            }, (res) => {
                if (res.success) {
                    setPin(res.pin);
                    setQuizTitle(res.title);
                    if (res.participants && Array.isArray(res.participants) && res.participants.length > 0) {
                        setParticipants(res.participants);
                    }
                    if (isLobbyMultiplayer && !isOffline) {
                        setGameState('lobby');
                    } else {
                        setGameState('game_active');
                        const currentPin = res.pin || targetPin;
                        socket.emit('room:message', {
                            pin: currentPin,
                            event: 'game:start',
                            payload: { gameId }
                        });
                        socket.emit('room:stateUpdate', {
                            pin: currentPin,
                            state: 'game_active',
                            isGame: true,
                            gameId
                        });
                    }
                }
            });
        }
    }, [isGame, gameId]);

    // Word Bomb timer countdown
    useEffect(() => {
        let interval;
        if (isGame && gameState === 'game_active' && gameId === 'word_bomb' && !gameWinner) {
            interval = setInterval(() => {
                setGameTimeLeft(prev => {
                    const currentPin = location.state?.pin || pin;
                    if (prev <= 1) {
                        handleBombExplosion();
                        return 15;
                    }
                    const newTime = prev - 1;
                    // Broadcast timer tick
                    socket.emit('room:message', {
                        pin: currentPin,
                        event: 'game:word_bomb_state',
                        payload: {
                            activePlayerId: participants[activePlayerIndex]?.id,
                            activePlayerNickname: participants[activePlayerIndex]?.nickname,
                            syllable: gameSyllable,
                            timeLeft: newTime,
                            eliminated: gameEliminated,
                            usedWords: gameUsedWords
                        }
                    });
                    return newTime;
                });
            }, 1000);
        }
        return () => clearInterval(interval);
    }, [gameState, activePlayerIndex, gameEliminated, gameSyllable, gameWinner]);

    // OX Game timer countdown
    useEffect(() => {
        let interval;
        if (isGame && gameState === 'game_active' && gameId === 'ox_run' && !oxReveal) {
            interval = setInterval(() => {
                setGameTimeLeft(prev => {
                    const currentPin = location.state?.pin || pin;
                    if (prev <= 1) {
                        clearInterval(interval);
                        handleOxRoundEnd();
                        return 0;
                    }
                    const newTime = prev - 1;
                    socket.emit('room:message', {
                        pin: currentPin,
                        event: 'game:ox_state',
                        payload: {
                            question: OX_QUESTIONS[oxQuestionIndex].q,
                            timeLeft: newTime,
                            reveal: false,
                            choices: oxChoices
                        }
                    });
                    return newTime;
                });
            }, 1000);
        }
        return () => clearInterval(interval);
    }, [gameState, oxQuestionIndex, oxReveal, oxChoices]);

    // Catch Mind timer countdown
    useEffect(() => {
        let interval;
        if (isGame && gameState === 'game_active' && gameId === 'catch_mind' && !catchMindWinner) {
            interval = setInterval(() => {
                setGameTimeLeft(prev => {
                    const currentPin = location.state?.pin || pin;
                    if (prev <= 1) {
                        // Word revealed, round ends
                        handleCatchMindTimeout();
                        return 45;
                    }
                    const newTime = prev - 1;
                    socket.emit('room:message', {
                        pin: currentPin,
                        event: 'game:catch_mind_state',
                        payload: {
                            painterId,
                            painterNickname,
                            timeLeft: newTime,
                            winner: null
                        }
                    });
                    return newTime;
                });
            }, 1000);
        }
        return () => clearInterval(interval);
    }, [gameState, painterId, catchMindWinner]);

    // Word List for Word Bomb
    const SYLLABLES = ['사', '기', '학', '바', '전', '수', '공', '자', '정', '이', '하', '대', '한', '국', '물', '불', '가', '나', '다', '라', '마', '바', '사', '아', '자', '차', '카', '타', '파', '하'];
    
    // OX Questions
    const OX_QUESTIONS = [
        { q: "딸기는 생물학적으로 채소(과채류)에 속한다.", a: "O" },
        { q: "호랑이는 고양이과 동물로서 물과 수영을 극도로 싫어한다.", a: "X" },
        { q: "지구의 나이는 약 45억 년으로 추정된다.", a: "O" },
        { q: "펭귄은 남극에만 살고, 북극에는 살지 않는다.", a: "O" },
        { q: "바나나는 여러 해 살이 풀로서 나무가 아닌 거대 풀이다.", a: "O" },
        { q: "달팽이는 이빨이 없다.", a: "X" },
        { q: "금붕어의 기억력은 약 3초밖에 안 된다.", a: "X" },
        { q: "인간의 뇌는 통증을 느끼는 통각 세포가 없다.", a: "O" },
        { q: "하마의 땀은 자외선을 차단해주는 붉은색이다.", a: "O" },
        { q: "에펠탑은 여름철 기온이 올라가면 열팽창으로 인해 더 키가 커진다.", a: "O" },
        { q: "사막에 사는 낙타의 혹 속에는 비상시 마실 수 있는 물이 들어있다.", a: "X" },
        { q: "지구상에서 가장 건조하고 비가 내리지 않는 곳은 사하라 사막이다.", a: "X" },
        { q: "만리장성은 우주선이나 인공위성에서 육안으로 쉽게 관측이 가능하다.", a: "X" },
        { q: "북극곰의 피부색은 털 색깔과 마찬가지로 하얀색이다.", a: "X" },
        { q: "아보카도는 과일이 아니라 채소류에 속한다.", a: "X" },
        { q: "토마토는 세계에서 가장 많이 소비되는 채소이다.", a: "O" },
        { q: "바람이 불 때 온도가 더 춥게 느껴지는 현상을 체감온도라고 한다.", a: "O" },
        { q: "피자는 원래 이탈리아 귀족들이 먹던 고급 요리에서 유래했다.", a: "X" },
        { q: "콜라의 원래 제형 색깔은 초록색이었다.", a: "X" },
        { q: "달에 가면 지구보다 중력이 낮아 몸무게가 6분의 1로 줄어든다.", a: "O" }
    ];

    // Catch Mind Words
    const CATCH_MIND_WORDS = ['사과', '바나나', '피자', '축구', '눈사람', '강아지', '고양이', '의자', '우산', '비행기', '자동차', '텔레비전', '노트북', '자전거', '꽃병', '안경'];

    const startMultiplayerGame = () => {
        const currentPin = location.state?.pin || pin;
        setGameState('game_active');
        
        if (gameId === 'word_bomb') {
            const startSyllable = SYLLABLES[Math.floor(Math.random() * SYLLABLES.length)];
            setGameSyllable(startSyllable);
            setGameTimeLeft(15);
            setGameEliminated([]);
            setGameUsedWords([]);
            setGameWinner(null);
            setActivePlayerIndex(0);
            
            socket.emit('room:message', {
                pin: currentPin,
                event: 'game:start',
                payload: {
                    gameId,
                    activePlayerId: participants[0]?.id,
                    activePlayerNickname: participants[0]?.nickname,
                    syllable: startSyllable,
                    timeLeft: 15
                }
            });
        } else if (gameId === 'ox_run') {
            setOxQuestionIndex(0);
            setOxChoices({});
            setOxReveal(false);
            setGameTimeLeft(12);
            
            socket.emit('room:message', {
                pin: currentPin,
                event: 'game:start',
                payload: {
                    gameId,
                    question: OX_QUESTIONS[0].q,
                    timeLeft: 12
                }
            });
        } else if (gameId === 'catch_mind') {
            setCatchMindWinner(null);
            setCanvasLines([]);
            setGameTimeLeft(45);
            
            const firstPainter = participants[0];
            const secret = CATCH_MIND_WORDS[Math.floor(Math.random() * CATCH_MIND_WORDS.length)];
            setPainterId(firstPainter.id);
            setPainterNickname(firstPainter.nickname);
            setCatchMindSecretWord(secret);
            setCatchMindWinner(null);
            
            socket.emit('room:message', {
                pin: currentPin,
                event: 'game:start',
                payload: {
                    gameId,
                    painterId: firstPainter.id,
                    painterNickname: firstPainter.nickname,
                    secretWord: secret,
                    timeLeft: 45
                }
            });
        } else {
            socket.emit('room:message', {
                pin: currentPin,
                event: 'game:start',
                payload: {
                    gameId
                }
            });
        }
    };

    // Word Bomb Submit Word Handler
    const handleWordSubmit = (senderId, word) => {
        const activePlayer = participants[activePlayerIndex];
        if (!activePlayer || senderId !== activePlayer.id) return;
        
        const cleanWord = word.trim();
        if (cleanWord.length < 2) return;
        if (!cleanWord.includes(gameSyllable)) return;
        if (gameUsedWords.includes(cleanWord)) return;
        
        // Valid Word!
        const nextUsed = [...gameUsedWords, cleanWord];
        setGameUsedWords(nextUsed);
        playSound('correct');
        
        // Choose new syllable
        const nextSyllable = SYLLABLES[Math.floor(Math.random() * SYLLABLES.length)];
        setGameSyllable(nextSyllable);
        setGameTimeLeft(15);
        
        // Find next player
        let nextIndex = activePlayerIndex;
        let found = false;
        for (let i = 1; i <= participants.length; i++) {
            const idx = (activePlayerIndex + i) % participants.length;
            if (!gameEliminated.includes(participants[idx].id)) {
                nextIndex = idx;
                found = true;
                break;
            }
        }
        
        if (found) {
            setActivePlayerIndex(nextIndex);
            const currentPin = location.state?.pin || pin;
            socket.emit('room:message', {
                pin: currentPin,
                event: 'game:word_bomb_state',
                payload: {
                    activePlayerId: participants[nextIndex].id,
                    activePlayerNickname: participants[nextIndex].nickname,
                    syllable: nextSyllable,
                    timeLeft: 15,
                    eliminated: gameEliminated,
                    usedWords: nextUsed
                }
            });
        }
    };

    const handleBombExplosion = () => {
        const activePlayer = participants[activePlayerIndex];
        if (!activePlayer) return;
        
        playSound('wrong');
        const nextEliminated = [...gameEliminated, activePlayer.id];
        setGameEliminated(nextEliminated);
        
        // Check survivors
        const survivors = participants.filter(p => !nextEliminated.includes(p.id));
        const currentPin = location.state?.pin || pin;
        
        if (survivors.length <= 1) {
            // Game Over! Winner is the survivor
            const winnerName = survivors[0] ? survivors[0].nickname : 'None';
            setGameWinner(winnerName);
            socket.emit('room:message', {
                pin: currentPin,
                event: 'game:word_bomb_end',
                payload: { winner: winnerName }
            });
        } else {
            // Find next player
            let nextIndex = activePlayerIndex;
            for (let i = 1; i <= participants.length; i++) {
                const idx = (activePlayerIndex + i) % participants.length;
                if (!nextEliminated.includes(participants[idx].id)) {
                    nextIndex = idx;
                    break;
                }
            }
            const nextSyllable = SYLLABLES[Math.floor(Math.random() * SYLLABLES.length)];
            setGameSyllable(nextSyllable);
            setGameTimeLeft(15);
            setActivePlayerIndex(nextIndex);
            
            socket.emit('room:message', {
                pin: currentPin,
                event: 'game:word_bomb_state',
                payload: {
                    activePlayerId: participants[nextIndex].id,
                    activePlayerNickname: participants[nextIndex].nickname,
                    syllable: nextSyllable,
                    timeLeft: 15,
                    eliminated: nextEliminated,
                    usedWords: gameUsedWords
                }
            });
        }
    };

    // OX Game Handlers
    const handleOxRoundEnd = () => {
        setOxReveal(true);
        playSound('reveal');
        
        const currentQuestion = OX_QUESTIONS[oxQuestionIndex];
        const currentPin = location.state?.pin || pin;
        
        // Calculate points
        participants.forEach(p => {
            const choice = oxChoices[p.id];
            if (choice === currentQuestion.a) {
                p.score = (p.score || 0) + 100;
            }
        });
        
        // Emit scores and results
        socket.emit('room:message', {
            pin: currentPin,
            event: 'game:ox_reveal',
            payload: {
                answer: currentQuestion.a,
                choices: oxChoices,
                scores: participants.reduce((acc, p) => ({ ...acc, [p.id]: p.score || 0 }), {})
            }
        });
    };

    const nextOxQuestion = () => {
        const nextIndex = oxQuestionIndex + 1;
        const currentPin = location.state?.pin || pin;
        
        if (nextIndex >= OX_QUESTIONS.length) {
            // End of OX game!
            setGameState('leaderboard'); // Go to final scoreboard
            socket.emit('room:message', {
                pin: currentPin,
                event: 'game:ox_end',
                payload: { scores: participants.reduce((acc, p) => ({ ...acc, [p.id]: p.score || 0 }), {}) }
            });
        } else {
            setOxQuestionIndex(nextIndex);
            setOxChoices({});
            setOxReveal(false);
            setGameTimeLeft(12);
            
            socket.emit('room:message', {
                pin: currentPin,
                event: 'game:ox_next',
                payload: {
                    question: OX_QUESTIONS[nextIndex].q,
                    timeLeft: 12
                }
            });
        }
    };

    // Catch Mind Handlers
    const handleGuessSubmit = (senderId, guess) => {
        const sender = participants.find(p => p.id === senderId);
        if (!sender || senderId === painterId) return; // Painter cannot guess
        
        if (guess.trim() === catchMindSecretWord) {
            // Correct Guess!
            playSound('fanfare');
            setCatchMindWinner(sender.nickname);
            sender.score = (sender.score || 0) + 200;
            
            const currentPin = location.state?.pin || pin;
            socket.emit('room:message', {
                pin: currentPin,
                event: 'game:catch_mind_end',
                payload: {
                    winner: sender.nickname,
                    word: catchMindSecretWord,
                    scores: participants.reduce((acc, p) => ({ ...acc, [p.id]: p.score || 0 }), {})
                }
            });
        }
    };

    const handleCatchMindTimeout = () => {
        playSound('wrong');
        setCatchMindWinner('None (시간 초과)');
        const currentPin = location.state?.pin || pin;
        socket.emit('room:message', {
            pin: currentPin,
            event: 'game:catch_mind_end',
            payload: {
                winner: null,
                word: catchMindSecretWord,
                scores: participants.reduce((acc, p) => ({ ...acc, [p.id]: p.score || 0 }), {})
            }
        });
    };

    const nextCatchMindRound = () => {
        const nextPainterIdx = (participants.findIndex(p => p.id === painterId) + 1) % participants.length;
        const nextPainter = participants[nextPainterIdx];
        const secret = CATCH_MIND_WORDS[Math.floor(Math.random() * CATCH_MIND_WORDS.length)];
        
        setPainterId(nextPainter.id);
        setPainterNickname(nextPainter.nickname);
        setCatchMindSecretWord(secret);
        setCatchMindWinner(null);
        setCanvasLines([]);
        setGameTimeLeft(45);
        
        const currentPin = location.state?.pin || pin;
        socket.emit('room:message', {
            pin: currentPin,
            event: 'game:catch_mind_next',
            payload: {
                painterId: nextPainter.id,
                painterNickname: nextPainter.nickname,
                secretWord: secret,
                timeLeft: 45
            }
        });
    };

    const endCatchMindGame = () => {
        setGameState('leaderboard');
        const currentPin = location.state?.pin || pin;
        socket.emit('room:message', {
            pin: currentPin,
            event: 'game:catch_mind_terminate',
            payload: {}
        });
    };

    const endGeneralMultiplayerGame = () => {
        setGameState('leaderboard');
        const currentPin = location.state?.pin || pin;
        socket.emit('room:message', {
            pin: currentPin,
            event: 'game:terminate',
            payload: {}
        });
    };

    // Canvas rendering on Host screen for Catch Mind
    const canvasRef = React.useRef(null);
    useEffect(() => {
        if (gameId === 'catch_mind' && canvasRef.current) {
            const canvas = canvasRef.current;
            const ctx = canvas.getContext('2d');
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            
            ctx.lineWidth = 4;
            ctx.lineCap = 'round';
            ctx.strokeStyle = '#f43f5e';
            
            let lastPoint = null;
            
            canvasLines.forEach(line => {
                if (line.type === 'start') {
                    lastPoint = { x: line.x * canvas.width, y: line.y * canvas.height };
                    ctx.beginPath();
                    ctx.arc(lastPoint.x, lastPoint.y, 2, 0, 2 * Math.PI);
                    ctx.fill();
                } else if (line.type === 'draw' && lastPoint) {
                    ctx.beginPath();
                    ctx.moveTo(lastPoint.x, lastPoint.y);
                    const nextPoint = { x: line.x * canvas.width, y: line.y * canvas.height };
                    ctx.lineTo(nextPoint.x, nextPoint.y);
                    ctx.stroke();
                    lastPoint = nextPoint;
                } else if (line.type === 'end') {
                    lastPoint = null;
                }
            });
        }
    }, [canvasLines, gameId, gameState]);

    const handleExitToLobby = () => {
        try {
            sessionStorage.removeItem('quizrun_last_host_state');
        } catch (e) {}
        navigate('/');
    };

    // RENDER THE ACTIVE MULTIPLAYER GAME SCREEN
    const renderActiveGame = () => {
        const isFallbackGame = !['word_bomb', 'ox_run', 'catch_mind'].includes(gameId);

        if (isFallbackGame) {
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
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '2px solid #cbd5e1', paddingBottom: '1rem', marginBottom: '1.5rem', width: '100%' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                            <button 
                                className="glass-button" 
                                onClick={handleExitToLobby} 
                                style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 'bold' }}
                            >
                                <ArrowLeft size={18} /> 게임 로비로 나가기
                            </button>
                            <h2 
                                style={{ 
                                    fontSize: '2.2rem', 
                                    fontFamily: 'Jua, sans-serif', 
                                    color: 'var(--primary)', 
                                    margin: 0, 
                                    display: 'flex', 
                                    alignItems: 'center', 
                                    gap: '10px'
                                }}
                            >
                                🎮 {location.state?.gameTitle || initialGameTitle || '미니 게임'}
                            </h2>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                            <button
                                onClick={openScreenWindow}
                                className="glass-button"
                                style={{
                                    background: isScreenConnected ? '#ecfdf5' : '#4f46e5',
                                    color: isScreenConnected ? '#15803d' : 'white',
                                    border: isScreenConnected ? '2px solid #22c55e' : 'none',
                                    padding: '8px 16px',
                                    borderRadius: '14px',
                                    fontWeight: '800',
                                    fontSize: '0.9rem',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '8px',
                                    cursor: 'pointer',
                                    boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
                                    transition: 'all 0.2s'
                                }}
                                title="서브 모니터(빔프로젝터)에 띄울 스크린 창을 엽니다. 서브 화면으로 드래그 후 F11(전체화면)을 누르세요."
                            >
                                <Tv size={18} />
                                <span>{isScreenConnected ? '🖥️ 서브 모니터 연결됨' : '🖥️ 서브 모니터 스크린 열기'}</span>
                            </button>
                            <div style={{ 
                                background: 'white', 
                                border: '1px solid #cbd5e1', 
                                padding: '6px 14px 6px 20px', 
                                borderRadius: '24px', 
                                fontWeight: 'bold', 
                                fontSize: '1.15rem', 
                                boxShadow: '0 2px 5px rgba(0,0,0,0.03)',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '10px'
                            }}>
                                <span>방 입장 코드: <span style={{ color: 'var(--primary)', fontWeight: '900' }}>{pin}</span></span>
                                {!isOffline && pin && (
                                    <button
                                        onClick={() => setShowGameQrModal(true)}
                                        style={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '6px',
                                            padding: '4px 10px',
                                            background: '#f1f5f9',
                                            border: '1.5px solid #cbd5e1',
                                            borderRadius: '12px',
                                            cursor: 'pointer',
                                            fontSize: '0.82rem',
                                            fontWeight: '800',
                                            color: '#1e293b',
                                            transition: 'all 0.15s ease'
                                        }}
                                        title="QR 코드로 참여자 재접속하기 (클릭 시 크게 보기)"
                                    >
                                        <div style={{ background: 'white', padding: '2px', borderRadius: '4px', display: 'flex' }}>
                                            <QRCode value={getParticipantJoinUrl(pin, publicUrl, serverIp)} size={24} />
                                        </div>
                                        <span>QR 재접속</span>
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Two-Column Grid Layout */}
                    <div style={{ 
                        display: 'flex', 
                        width: '100%', 
                        flex: 1,
                        gap: '24px', 
                        overflow: 'hidden',
                        boxSizing: 'border-box'
                    }}>
                        {/* Left Column: Interactive Game Component Container (takes 80% space) */}
                        <div className="glass-panel" style={{ 
                            flex: gameId === 'stock_game' ? 1 : 4.5, 
                            padding: gameId === 'stock_game' ? '0' : '1.5rem 2rem', 
                            display: 'flex', 
                            flexDirection: 'column', 
                            alignItems: 'center', 
                            background: gameId === 'stock_game' ? '#0b1120' : 'white', 
                            borderRadius: '24px', 
                            border: gameId === 'stock_game' ? '1px solid #1e293b' : '1px solid #e2e8f0', 
                            boxShadow: '0 10px 30px rgba(0,0,0,0.05)',
                            overflowY: 'auto',
                            height: '100%'
                        }}>
                            <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'flex-start', justifyContent: 'center' }}>
                                <div style={{ width: '100%', height: gameId === 'stock_game' ? '100%' : 'auto', maxWidth: (gameId === 'card_match' || gameId === 'stock_game') ? '100%' : '480px' }}>
                                    {gameId === 'yutnori' && <YutnoriGame />}
                                    {gameId === 'card_match' && <CardMatchGame socket={socket} pin={location.state?.pin || pin} isHost={true} />}
                                    {gameId === 'rock_paper_scissors' && <RpsGame />}
                                    {gameId === 'whack_mole' && <WhackMoleGame />}
                                    {gameId === 'omok' && <OmokGame />}
                                    {gameId === 'minesweeper' && <MinesweeperGame />}
                                    {gameId === 'stock_game' && <StockGame socket={socket} pin={location.state?.pin || pin} isHost={true} participants={participants} />}
                                    {gameId === 'speed_numbers' && <SpeedNumbersGame />}
                                    {gameId === 'janggi' && <JanggiGame />}
                                    {gameId === 'chess' && <ChessGame />}
                                    {gameId === 'card_poker' && <PokerGame />}
                                    {gameId === 'gostop' && <GoStopGame />}
                                    {gameId === 'othello' && <OthelloGame />}
                                    {gameId === 'tetris' && <TetrisGame />}
                                    {gameId === 'brick_breaker' && <BrickBreakerGame />}
                                    {gameId === 'memory_game' && <MemoryGame />}
                                    {gameId === 'pass_bomb' && <PassBombGame />}
                                </div>
                            </div>
                        </div>

                        {/* Right Column: Sidebar (RightSidebar for Stock Game, or Default Participant List) */}
                        {gameId === 'stock_game' ? (
                            <RightSidebar 
                                socket={socket} 
                                isStockGame={true} 
                                onExitToLobby={handleExitToLobby} 
                                onEndGame={endGeneralMultiplayerGame} 
                            />
                        ) : (
                            <div style={{ 
                                flex: 1, 
                                display: 'flex', 
                                flexDirection: 'column', 
                                gap: '20px', 
                                height: '100%',
                                minWidth: '240px'
                            }}>
                                {/* Participants List */}
                                <div className="glass-panel" style={{ 
                                    flex: 1, 
                                    background: '#f8fafc', 
                                    borderRadius: '24px', 
                                    padding: '1.5rem', 
                                    border: '1px solid #e2e8f0',
                                    display: 'flex', 
                                    flexDirection: 'column', 
                                    overflow: 'hidden'
                                }}>
                                    <h3 style={{ margin: '0 0 1rem 0', color: 'var(--text-muted)', fontSize: '1.15rem', fontWeight: 'bold' }}>
                                        대결 참여 중 ({participants.length}명)
                                    </h3>
                                    <div style={{ 
                                        display: 'flex', 
                                        flexDirection: 'column', 
                                        gap: '10px', 
                                        overflowY: 'auto', 
                                        flex: 1
                                    }}>
                                        {participants.length === 0 ? (
                                            <span style={{ color: '#94a3b8', fontSize: '0.95rem', lineHeight: '1.5' }}>
                                                대기 중인 참가자가 없습니다. 혼자서 플레이 하거나 모바일로 참여가 가능합니다.
                                            </span>
                                        ) : (
                                            participants.map(p => (
                                                <div key={p.id} style={{ 
                                                    background: 'white', 
                                                    padding: '12px 16px', 
                                                    borderRadius: '12px', 
                                                    border: '1px solid #e2e8f0', 
                                                    fontWeight: 'bold', 
                                                    display: 'flex', 
                                                    alignItems: 'center', 
                                                    justifyContent: 'space-between',
                                                    boxShadow: '0 2px 4px rgba(0,0,0,0.02)'
                                                }}>
                                                    <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                                        🎮 {p.nickname}
                                                    </span>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                        <span style={{ fontSize: '0.85rem', color: 'var(--primary)', background: '#ffe4e6', padding: '2px 8px', borderRadius: '8px' }}>
                                                            {p.score || 0}점
                                                        </span>
                                                        {p.finished && <span style={{ color: '#10b981', fontSize: '0.85rem', fontWeight: 'bold' }}>✓ 완료</span>}
                                                    </div>
                                                </div>
                                            ))
                                        )}
                                    </div>
                                </div>

                                {/* Actions / Controls */}
                                <div className="glass-panel" style={{ 
                                    padding: '1.5rem', 
                                    background: 'white', 
                                    borderRadius: '24px', 
                                    border: '1px solid #e2e8f0',
                                    display: 'flex', 
                                    flexDirection: 'column', 
                                    gap: '12px', 
                                    boxShadow: '0 4px 15px rgba(0,0,0,0.03)'
                                }}>
                                    <button className="glass-button" onClick={handleExitToLobby} style={{ width: '100%', background: '#64748b', color: 'white', border: 'none', padding: '12px', borderRadius: '14px', fontWeight: 'bold', fontSize: '1.05rem', cursor: 'pointer' }}>
                                        게임 로비로 나가기
                                    </button>
                                    <button className="glass-button" onClick={endGeneralMultiplayerGame} style={{ width: '100%', background: '#ef4444', color: 'white', border: 'none', padding: '12px', borderRadius: '14px', fontWeight: 'bold', fontSize: '1.05rem', cursor: 'pointer' }}>
                                        게임 종료 및 결과 발표
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            );
        }

        return (
            <div className="glass-panel animate-slide-up" style={{ padding: '3rem', width: '100%', maxWidth: '850px', margin: '2rem auto', textAlign: 'center', color: 'var(--text)' }}>
                {/* Header */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '2px solid #e2e8f0', paddingBottom: '1.5rem', marginBottom: '2rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                        <button className="glass-button" onClick={handleExitToLobby} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <ArrowLeft size={18} /> 나가기
                        </button>
                        <h2 style={{ fontSize: '2rem', fontFamily: 'Jua, sans-serif', color: 'var(--primary)', margin: 0 }}>
                            🎮 {location.state?.gameTitle || initialGameTitle}
                        </h2>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <button
                            onClick={openScreenWindow}
                            className="glass-button"
                            style={{
                                background: isScreenConnected ? '#ecfdf5' : '#4f46e5',
                                color: isScreenConnected ? '#15803d' : 'white',
                                border: isScreenConnected ? '2px solid #22c55e' : 'none',
                                padding: '8px 16px',
                                borderRadius: '14px',
                                fontWeight: '800',
                                fontSize: '0.9rem',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '8px',
                                cursor: 'pointer',
                                boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
                                transition: 'all 0.2s'
                            }}
                            title="서브 모니터(빔프로젝터)에 띄울 스크린 창을 엽니다."
                        >
                            <Tv size={18} />
                            <span>{isScreenConnected ? '🖥️ 서브 모니터 연결됨' : '🖥️ 서브 모니터 스크린 열기'}</span>
                        </button>
                        <div style={{ background: '#f1f5f9', padding: '8px 16px', borderRadius: '20px', fontWeight: 'bold', fontSize: '1.1rem' }}>
                            PIN: {pin}
                        </div>
                    </div>
                </div>

                {/* --- WORD BOMB ACTIVE UI --- */}
                {gameId === 'word_bomb' && (
                    <div>
                        {gameWinner ? (
                            <div className="animate-pop-in" style={{ padding: '2rem' }}>
                                <div style={{ fontSize: '5rem' }}>👑</div>
                                <h1 style={{ fontSize: '3rem', fontFamily: 'Jua, sans-serif', color: 'var(--secondary)', margin: '1rem 0' }}>{gameWinner} 승리!</h1>
                                <p style={{ fontSize: '1.2rem', color: 'var(--text-muted)' }}>모든 라이벌을 제치고 폭탄을 피했습니다!</p>
                                <button className="glass-button" onClick={() => setGameState('leaderboard')} style={{ marginTop: '2rem' }}>최종 결과판 가기</button>
                            </div>
                        ) : (
                            <div>
                                {/* Bomb Image & Animation */}
                                <div style={{ position: 'relative', width: '220px', height: '220px', margin: '0 auto 2rem auto' }}>
                                    <div style={{
                                        fontSize: '10rem',
                                        lineHeight: '220px',
                                        animation: gameTimeLeft <= 4 ? 'spin 0.2s linear infinite' : 'levitate 1s ease-in-out infinite'
                                    }}>
                                        💣
                                    </div>
                                    <div style={{
                                        position: 'absolute',
                                        top: '15px',
                                        right: '15px',
                                        width: '60px',
                                        height: '60px',
                                        borderRadius: '50%',
                                        background: '#ef4444',
                                        color: 'white',
                                        fontSize: '2rem',
                                        fontWeight: '900',
                                        lineHeight: '60px',
                                        boxShadow: '0 0 15px rgba(239,68,68,0.5)',
                                        border: '3px solid white'
                                    }}>
                                        {gameTimeLeft}
                                    </div>
                                </div>

                                <div style={{ background: '#fff1f2', border: '2px solid #ffe4e6', borderRadius: '24px', padding: '2rem', marginBottom: '2rem' }}>
                                    <h3 style={{ margin: 0, color: '#f43f5e', fontSize: '1.4rem' }}>제시어 조건</h3>
                                    <h1 style={{ fontSize: '5rem', margin: '1rem 0', color: '#e11d48', fontWeight: '900' }}>
                                        {gameSyllable}
                                    </h1>
                                    <p style={{ color: 'var(--text-muted)', fontSize: '1.1rem' }}>
                                        글자가 <strong>포함된</strong> 단어를 입력해 주세요! (2글자 이상)
                                    </p>
                                </div>

                                <div style={{ background: '#f8fafc', border: '2px solid #e2e8f0', borderRadius: '20px', padding: '1.5rem', marginBottom: '2rem' }}>
                                    <h3 style={{ margin: '0 0 1rem 0', color: 'var(--text-muted)', fontSize: '1.1rem' }}>현재 차례</h3>
                                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '15px', justifyContent: 'center' }}>
                                        {participants.map((p, idx) => {
                                            const isActive = idx === activePlayerIndex;
                                            const isEliminated = gameEliminated.includes(p.id);
                                            return (
                                                <div 
                                                    key={p.id}
                                                    style={{
                                                        padding: '12px 24px',
                                                        borderRadius: '16px',
                                                        fontSize: '1.2rem',
                                                        fontWeight: 'bold',
                                                        background: isEliminated ? '#e2e8f0' : (isActive ? '#ef4444' : 'white'),
                                                        color: isEliminated ? '#94a3b8' : (isActive ? 'white' : 'var(--text)'),
                                                        border: isActive ? '3px solid #ef4444' : '2px solid #cbd5e1',
                                                        transform: isActive ? 'scale(1.08)' : 'scale(1)',
                                                        boxShadow: isActive ? '0 10px 15px rgba(239,68,68,0.2)' : 'none',
                                                        textDecoration: isEliminated ? 'line-through' : 'none',
                                                        transition: 'all 0.3s'
                                                    }}
                                                >
                                                    {isEliminated ? '💥 ' : (isActive ? '⏱️ ' : '')}
                                                    {p.nickname}
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>

                                <div>
                                    <h4 style={{ color: 'var(--text-muted)', marginBottom: '0.5rem' }}>사용된 단어 리스트 ({gameUsedWords.length}개)</h4>
                                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', justifyContent: 'center', maxHeight: '100px', overflowY: 'auto', padding: '10px', background: '#f1f5f9', borderRadius: '12px' }}>
                                        {gameUsedWords.map((w, idx) => (
                                            <span key={idx} style={{ background: 'white', padding: '4px 10px', borderRadius: '6px', fontSize: '0.9rem', border: '1px solid #e2e8f0' }}>{w}</span>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {/* --- OX RUN ACTIVE UI --- */}
                {gameId === 'ox_run' && (
                    <div>
                        {/* Question Area */}
                        <div style={{ background: '#f8fafc', border: '2px solid #e2e8f0', borderRadius: '24px', padding: '2.5rem', marginBottom: '2rem' }}>
                            <h3 style={{ color: 'var(--primary)', margin: 0, fontSize: '1.3rem' }}>Q.{oxQuestionIndex + 1}</h3>
                            <h1 style={{ fontSize: '2.5rem', margin: '1rem 0', fontFamily: 'Jua, sans-serif', color: 'var(--text)', lineHeight: '1.4' }}>
                                {OX_QUESTIONS[oxQuestionIndex].q}
                            </h1>
                            {!oxReveal ? (
                                <div style={{ display: 'inline-block', background: '#ef4444', color: 'white', padding: '8px 20px', borderRadius: '20px', fontSize: '1.3rem', fontWeight: 'bold' }}>
                                    남은 시간: {gameTimeLeft}초
                                </div>
                            ) : (
                                <div style={{ display: 'inline-block', background: '#10b981', color: 'white', padding: '8px 20px', borderRadius: '20px', fontSize: '1.3rem', fontWeight: 'bold' }}>
                                    정답 공개 완료!
                                </div>
                            )}
                        </div>

                        {/* Real-time Zone board */}
                        <div style={{ display: 'flex', gap: '20px', height: '260px', marginBottom: '2.5rem' }}>
                            {/* O Zone */}
                            <div 
                                onClick={() => {
                                    if (!oxReveal) {
                                        playSound('submit');
                                        setOxChoices(prev => ({ 
                                            ...prev, 
                                            host: prev.host === 'O' ? null : 'O' // Toggle selection
                                        }));
                                    }
                                }}
                                style={{ 
                                    flex: 1, 
                                    background: oxChoices['host'] === 'O' ? '#d1fae5' : '#ecfdf5', 
                                    border: oxChoices['host'] === 'O' ? '5px solid #10b981' : '3px solid #a7f3d0', 
                                    borderRadius: '24px', 
                                    padding: '1rem', 
                                    display: 'flex', 
                                    flexDirection: 'column', 
                                    alignItems: 'center',
                                    position: 'relative',
                                    cursor: oxReveal ? 'default' : 'pointer',
                                    transition: 'all 0.2s ease',
                                    transform: !oxReveal && oxChoices['host'] === 'O' ? 'scale(1.03)' : 'none',
                                    boxShadow: oxReveal && OX_QUESTIONS[oxQuestionIndex].a === 'O' 
                                        ? '0 0 25px #10b981' 
                                        : (!oxReveal && oxChoices['host'] === 'O' ? '0 8px 20px rgba(16,185,129,0.15)' : 'none')
                                }}
                            >
                                <h2 style={{ fontSize: '6.5rem', color: '#10b981', margin: '0 0 10px 0', lineHeight: '1.1', fontWeight: '900' }}>O</h2>
                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', justifyContent: 'center', width: '100%', overflowY: 'auto' }}>
                                    {oxChoices['host'] === 'O' && (
                                        <div className="animate-scale-in" style={{ background: '#10b981', color: 'white', padding: '6px 12px', borderRadius: '12px', fontWeight: 'bold', boxShadow: '0 4px 10px rgba(16,185,129,0.2)' }}>
                                            🙋 나 (호스트)
                                        </div>
                                    )}
                                    {participants.filter(p => oxChoices[p.id] === 'O').map(p => (
                                        <div key={p.id} className="animate-scale-in" style={{ background: 'white', border: '2px solid #10b981', padding: '6px 12px', borderRadius: '12px', fontWeight: 'bold' }}>
                                            🏃 {p.nickname}
                                        </div>
                                    ))}
                                </div>
                                {oxReveal && OX_QUESTIONS[oxQuestionIndex].a === 'O' && (
                                    <div style={{ position: 'absolute', bottom: '10px', fontSize: '1.2rem', color: '#10b981', fontWeight: '950' }}>✓ 정답!</div>
                                )}
                            </div>

                            {/* X Zone */}
                            <div 
                                onClick={() => {
                                    if (!oxReveal) {
                                        playSound('submit');
                                        setOxChoices(prev => ({ 
                                            ...prev, 
                                            host: prev.host === 'X' ? null : 'X' // Toggle selection
                                        }));
                                    }
                                }}
                                style={{ 
                                    flex: 1, 
                                    background: oxChoices['host'] === 'X' ? '#fee2e2' : '#fff5f5', 
                                    border: oxChoices['host'] === 'X' ? '5px solid #f43f5e' : '3px solid #fecaca', 
                                    borderRadius: '24px', 
                                    padding: '1rem', 
                                    display: 'flex', 
                                    flexDirection: 'column', 
                                    alignItems: 'center',
                                    position: 'relative',
                                    cursor: oxReveal ? 'default' : 'pointer',
                                    transition: 'all 0.2s ease',
                                    transform: !oxReveal && oxChoices['host'] === 'X' ? 'scale(1.03)' : 'none',
                                    boxShadow: oxReveal && OX_QUESTIONS[oxQuestionIndex].a === 'X' 
                                        ? '0 0 25px #f43f5e' 
                                        : (!oxReveal && oxChoices['host'] === 'X' ? '0 8px 20px rgba(244,63,94,0.15)' : 'none')
                                }}
                            >
                                <h2 style={{ fontSize: '6.5rem', color: '#f43f5e', margin: '0 0 10px 0', lineHeight: '1.1', fontWeight: '900' }}>X</h2>
                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', justifyContent: 'center', width: '100%', overflowY: 'auto' }}>
                                    {oxChoices['host'] === 'X' && (
                                        <div className="animate-scale-in" style={{ background: '#f43f5e', color: 'white', padding: '6px 12px', borderRadius: '12px', fontWeight: 'bold', boxShadow: '0 4px 10px rgba(244,63,94,0.2)' }}>
                                            🙋 나 (호스트)
                                        </div>
                                    )}
                                    {participants.filter(p => oxChoices[p.id] === 'X').map(p => (
                                        <div key={p.id} className="animate-scale-in" style={{ background: 'white', border: '2px solid #f43f5e', padding: '6px 12px', borderRadius: '12px', fontWeight: 'bold' }}>
                                            🏃 {p.nickname}
                                        </div>
                                    ))}
                                </div>
                                {oxReveal && OX_QUESTIONS[oxQuestionIndex].a === 'X' && (
                                    <div style={{ position: 'absolute', bottom: '10px', fontSize: '1.2rem', color: '#f43f5e', fontWeight: '950' }}>✓ 정답!</div>
                                )}
                            </div>
                        </div>

                        {/* Control actions */}
                        <div style={{ display: 'flex', justifyContent: 'center', gap: '15px' }}>
                            {oxReveal ? (
                                <button className="glass-button primary-btn" onClick={nextOxQuestion} style={{ fontSize: '1.2rem', padding: '12px 35px' }}>
                                    {oxQuestionIndex + 1 >= OX_QUESTIONS.length ? '게임 종료 및 최종순위' : '다음 문제 보기'} <ChevronRight />
                                </button>
                            ) : (
                                <button className="glass-button" onClick={handleOxRoundEnd} style={{ fontSize: '1.2rem', padding: '12px 35px' }}>
                                    바로 정답 공개하기
                                </button>
                            )}
                        </div>
                    </div>
                )}

                {/* --- CATCH MIND ACTIVE UI --- */}
                {gameId === 'catch_mind' && (
                    <div>
                        {/* Painter Info & Word Display */}
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#f8fafc', padding: '1rem 2rem', borderRadius: '20px', marginBottom: '1.5rem', border: '2px solid #e2e8f0' }}>
                            <div style={{ textAlign: 'left' }}>
                                <h4 style={{ margin: 0, color: 'var(--text-muted)' }}>현재 그리는 사람</h4>
                                <h2 style={{ margin: 0, color: '#ea580c', fontWeight: 'bold' }}>🎨 {painterNickname}</h2>
                            </div>
                            <div>
                                <h4 style={{ margin: 0, color: 'var(--text-muted)' }}>제시어</h4>
                                <h2 style={{ margin: 0, color: 'var(--secondary)', letterSpacing: '2px', fontWeight: '900' }}>{catchMindSecretWord}</h2>
                            </div>
                            <div style={{ background: '#ef4444', color: 'white', padding: '6px 16px', borderRadius: '15px', fontWeight: 'bold' }}>
                                ⏱️ {gameTimeLeft}초
                            </div>
                        </div>

                        {/* Drawing Canvas */}
                        <div style={{ background: 'white', border: '3px solid #cbd5e1', borderRadius: '24px', overflow: 'hidden', display: 'flex', justifyContent: 'center', marginBottom: '2rem', boxShadow: 'inset 0 4px 6px rgba(0,0,0,0.05)' }}>
                            <canvas 
                                ref={canvasRef} 
                                width={600} 
                                height={400} 
                                style={{ background: 'white', maxWidth: '100%' }}
                            />
                        </div>

                        {/* Winner popup / buttons */}
                        {catchMindWinner ? (
                            <div className="animate-pop-in" style={{ background: '#ecfdf5', border: '2px solid #10b981', borderRadius: '20px', padding: '1.5rem', marginBottom: '2rem' }}>
                                <h2 style={{ color: '#10b981', margin: 0 }}>🎉 정답자 발생!</h2>
                                <h1 style={{ fontSize: '2.5rem', margin: '0.5rem 0', fontFamily: 'Jua, sans-serif' }}>{catchMindWinner}</h1>
                                <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: '1.1rem' }}>정답 단어는 <strong>{catchMindSecretWord}</strong>였습니다!</p>
                            </div>
                        ) : null}

                        <div style={{ display: 'flex', justifyContent: 'center', gap: '15px' }}>
                            <button className="glass-button" onClick={nextCatchMindRound}>
                                다음 라운드 (그림 교대)
                            </button>
                            <button className="glass-button" onClick={endCatchMindGame} style={{ background: '#f43f5e', color: 'white', border: 'none' }}>
                                게임 전체 종료하기
                            </button>
                        </div>
                    </div>
                )}
            </div>
        );
    };

    return (
        <div className="page-container" style={{ padding: '0', justifyContent: 'flex-start', maxWidth: '100%' }}>
            {isGame ? (
                (gameState === 'lobby' && !isOffline && isLobbyMultiplayer) ? (
                    <div style={{ width: '100%', minHeight: '100vh', padding: '2rem', boxSizing: 'border-box' }}>
                        <header className="header" style={{ marginBottom: '2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer' }} onClick={handleExitToLobby}>
                                <button className="glass-button" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                    <ArrowLeft size={18} /> 게임 로비로 나가기
                                </button>
                            </div>
                            <h2 style={{ margin: 0, color: 'var(--primary)', fontFamily: 'Jua, sans-serif' }}>🎮 {initialGameTitle || gameTitle} 대기실</h2>
                            <button
                                onClick={openScreenWindow}
                                className="glass-button"
                                style={{
                                    background: isScreenConnected ? '#ecfdf5' : '#4f46e5',
                                    color: isScreenConnected ? '#15803d' : 'white',
                                    border: isScreenConnected ? '2px solid #22c55e' : 'none',
                                    padding: '8px 16px',
                                    borderRadius: '14px',
                                    fontWeight: '800',
                                    fontSize: '0.9rem',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '8px',
                                    cursor: 'pointer',
                                    boxShadow: '0 4px 12px rgba(0,0,0,0.08)'
                                }}
                            >
                                <Tv size={18} />
                                <span>{isScreenConnected ? '🖥️ 서브 모니터 연결됨' : '🖥️ 서브 모니터 스크린 열기'}</span>
                            </button>
                        </header>
                        <div className="glass-panel animate-slide-up" style={{ padding: '4rem 2rem', textAlign: 'center', maxWidth: '800px', margin: '0 auto' }}>
                            <h3 style={{ color: 'var(--text-muted)', marginBottom: '1rem' }}>아래 PIN 번호를 친구들에게 알려주세요!</h3>
                            <h1 style={{ fontSize: '6rem', marginBottom: '2rem', color: 'var(--text)', letterSpacing: '0.05em' }}>{pin}</h1>
                            <div style={{ background: '#f8fafc', padding: '1.5rem', borderRadius: '20px', marginBottom: '3rem', border: '2px solid #e2e8f0', display: 'flex', gap: '2rem', alignItems: 'center', justifyContent: 'center' }}>
                                <div style={{ background: 'white', padding: '1rem', borderRadius: '16px', boxShadow: '0 4px 6px rgba(0,0,0,0.05)', textAlign: 'center' }}>
                                    <QRCode value={getParticipantJoinUrl(pin, publicUrl, serverIp)} size={150} style={{ height: 'auto', maxWidth: '100%', width: '100%' }} viewBox="0 0 150 150" />
                                    <p style={{ margin: '8px 0 4px 0', fontSize: '0.9rem', color: 'var(--text-muted)', fontWeight: 'bold' }}>QR로 바로 참여!</p>

                                    {serverIp && (
                                        <div style={{ marginTop: '8px', padding: '6px 10px', background: '#eff6ff', borderRadius: '8px', border: '1px solid #bfdbfe', fontSize: '0.75rem', color: '#1e40af', fontWeight: 'bold' }}>
                                            📶 같은 Wi-Fi 접속 (100% 끊김 없음):<br/>
                                            <span style={{ color: '#2563eb', wordBreak: 'break-all' }}>http://{serverIp}:5173</span>
                                        </div>
                                    )}

                                    {publicUrl ? (
                                        <div style={{ marginTop: '6px', padding: '6px 10px', background: '#ecfdf5', borderRadius: '8px', border: '1px solid #a7f3d0', fontSize: '0.75rem', color: '#047857', fontWeight: 'bold' }}>
                                            🌐 외부 LTE/5G 접속 (Cloudflare):<br/>
                                            <span style={{ wordBreak: 'break-all' }}>{publicUrl}</span>
                                        </div>
                                    ) : (
                                        <p style={{ margin: '4px 0 0 0', fontSize: '0.75rem', color: '#b45309', background: '#fef3c7', padding: '4px 8px', borderRadius: '6px' }}>📶 스마트폰도 같은 Wi-Fi에 연결 필수</p>
                                    )}

                                    <button
                                        onClick={() => socket.emit('network:refresh')}
                                        style={{
                                            marginTop: '10px',
                                            padding: '6px 12px',
                                            fontSize: '0.78rem',
                                            background: '#2563eb',
                                            color: 'white',
                                            border: 'none',
                                            borderRadius: '8px',
                                            cursor: 'pointer',
                                            fontWeight: 'bold',
                                            display: 'inline-flex',
                                            alignItems: 'center',
                                            gap: '4px',
                                            width: '100%',
                                            justifyContent: 'center'
                                        }}
                                        title="Wi-Fi나 핫스팟/테더링 연결이 바뀌었을 때 클릭하면 새로운 IP와 터널 링크를 탐색합니다."
                                    >
                                        🔄 Wi-Fi/테더링 IP 새로고침
                                    </button>
                                </div>
                                <div style={{ flex: 1, minWidth: '200px' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', marginBottom: '1.5rem' }}>
                                        <Users color="var(--primary)" size={28} />
                                        <span style={{ fontSize: '1.5rem', fontWeight: '800' }}>현재 {participants.length}명 입장!</span>
                                    </div>
                                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', justifyContent: 'center' }}>
                                        {participants.length === 0 ? (
                                            <span style={{ color: '#94a3b8', fontStyle: 'italic' }}>참여자를 기다리는 중...</span>
                                        ) : (
                                            participants.map(p => (
                                                <div key={p.id} className="player-chip" style={{ fontSize: '0.9rem', padding: '6px 14px' }}>
                                                    {p.nickname}
                                                </div>
                                            ))
                                        )}
                                    </div>
                                </div>
                            </div>
                            <button className="glass-button" onClick={startMultiplayerGame} style={{ padding: '1.2rem 4rem', fontSize: '1.5rem' }}>
                                <Play fill="white" size={24} /> 시작하기!
                            </button>
                        </div>
                    </div>
                ) : (
                    renderActiveGame()
                )
            ) : (
                <>
            {gameState === 'final_leaderboard' && (
                <Confetti width={window.innerWidth} height={window.innerHeight} recycle={false} numberOfPieces={400} />
            )}
            <header className="header">
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer' }} onClick={() => navigate('/')}>
                    <img src="/logo.png?v=3" alt="Logo" className="header-logo" />
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <button
                        onClick={openScreenWindow}
                        className="glass-button"
                        style={{
                            background: isScreenConnected ? '#ecfdf5' : '#4f46e5',
                            color: isScreenConnected ? '#15803d' : 'white',
                            border: isScreenConnected ? '2px solid #22c55e' : 'none',
                            padding: '8px 16px',
                            borderRadius: '14px',
                            fontWeight: '800',
                            fontSize: '0.9rem',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            cursor: 'pointer',
                            boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
                            transition: 'all 0.2s'
                        }}
                        title="서브 모니터(빔프로젝터)에 띄울 스크린 창을 엽니다. 서브 화면으로 드래그 후 F11(전체화면)을 누르세요."
                    >
                        <Tv size={18} />
                        <span>{isScreenConnected ? '🖥️ 서브 모니터 연결됨' : '🖥️ 서브 모니터 스크린 열기'}</span>
                    </button>
                    {pin && (
                        <div className="pin-display">
                            PIN: {pin} {isBuzzerMode && <span style={{ fontSize: '0.8rem', opacity: 0.7, marginLeft: '10px' }}>(버저 모드)</span>}
                        </div>
                    )}
                </div>
            </header>

            <div style={{ padding: '2rem', width: '100%', maxWidth: '900px', margin: '0 auto' }}>
                {/* SETUP */}
                {gameState === 'setup' && (
                    <div className="glass-panel card-container animate-slide-up" style={{ margin: '4rem auto', position: 'relative' }}>
                        <button onClick={() => navigate(-1)} className="glass-button" style={{ position: 'absolute', top: '20px', left: '20px', padding: '6px 12px', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '4px', background: 'rgba(255,255,255,0.8)', border: '1px solid #e2e8f0', borderRadius: '8px', fontWeight: 'bold', color: 'var(--primary)', cursor: 'pointer', zIndex: 10 }}>
                            <ArrowLeft size={16} /> 이전
                        </button>
                        {isOffline && (
                            <div style={{ position:'absolute',top:'20px',right:'20px',background:'var(--secondary)',color:'white',padding:'4px 12px',borderRadius:'20px',fontSize:'0.8rem',fontWeight:'bold' }}>
                                📺 오프라인 모드 {participantCount > 0 ? `(${participantCount}명)` : ''}
                            </div>
                        )}
                        <h2 style={{ marginBottom: '1rem', fontSize: '2rem' }}>퀴즈 모드를 선택하세요</h2>
                        <p style={{ color: 'var(--text-muted)', marginBottom: '2rem' }}>선택된 퀴즈: <strong>{quizTitle || (quizId === 'general' ? '일반 상식 퀴즈' : quizId === 'science' ? '재미있는 과학 탐구' : '커스텀 퀴즈')}</strong></p>
                        
                        {/* Question Order Selection */}
                        <div style={{ marginBottom: '20px', background: 'rgba(0, 0, 0, 0.03)', padding: '12px 18px', borderRadius: '16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '15px' }}>
                            <span style={{ fontWeight: 'bold', fontSize: '1rem', color: 'var(--text)' }}>📋 문제 출제 순서</span>
                            <div style={{ display: 'flex', gap: '8px' }}>
                                <button 
                                    className="glass-button"
                                    onClick={() => setOrderType('sequential')}
                                    style={{ 
                                        padding: '6px 16px', 
                                        fontSize: '0.9rem', 
                                        borderRadius: '8px', 
                                        background: orderType === 'sequential' ? 'var(--primary)' : 'transparent',
                                        color: orderType === 'sequential' ? 'white' : 'var(--text-muted)',
                                        border: orderType === 'sequential' ? '1px solid var(--primary)' : '1px solid #e2e8f0',
                                        fontWeight: 'bold',
                                        cursor: 'pointer',
                                        transition: 'all 0.2s'
                                    }}
                                >
                                    순서대로
                                </button>
                                <button 
                                    className="glass-button"
                                    onClick={() => setOrderType('random')}
                                    style={{ 
                                        padding: '6px 16px', 
                                        fontSize: '0.9rem', 
                                        borderRadius: '8px', 
                                        background: orderType === 'random' ? 'var(--primary)' : 'transparent',
                                        color: orderType === 'random' ? 'white' : 'var(--text-muted)',
                                        border: orderType === 'random' ? '1px solid var(--primary)' : '1px solid #e2e8f0',
                                        fontWeight: 'bold',
                                        cursor: 'pointer',
                                        transition: 'all 0.2s'
                                    }}
                                >
                                    랜덤으로
                                </button>
                            </div>
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                            <button
                                className="glass-button"
                                onClick={() => {
                                    if (quizCounts.total === 0) {
                                        alert('저장된 문제가 0개입니다. 먼저 문제를 추가해주세요.');
                                        return;
                                    }
                                    createRoom('normal');
                                }}
                                disabled={quizCounts.total === 0}
                                style={{
                                    width: '100%',
                                    background: quizCounts.total > 0 ? 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)' : '#e2e8f0',
                                    color: quizCounts.total > 0 ? 'white' : '#94a3b8',
                                    fontWeight: '900',
                                    fontSize: '1.05rem',
                                    boxShadow: quizCounts.total > 0 ? '0 4px 12px rgba(59, 130, 246, 0.3)' : 'none',
                                    cursor: quizCounts.total > 0 ? 'pointer' : 'not-allowed',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'space-between',
                                    padding: '14px 20px',
                                    border: 'none',
                                    borderRadius: '14px'
                                }}
                            >
                                <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    🚀 전체 문제 시작 (일반 모드)
                                </span>
                                <span style={{
                                    fontSize: '0.86rem',
                                    padding: '4px 12px',
                                    borderRadius: '20px',
                                    background: quizCounts.total > 0 ? 'rgba(255, 255, 255, 0.25)' : '#cbd5e1',
                                    color: quizCounts.total > 0 ? 'white' : '#64748b',
                                    fontWeight: 'bold'
                                }}>
                                    {quizCounts.total}문제
                                </span>
                            </button>

                            {!isOffline && (
                                <button
                                    className="glass-button"
                                    onClick={() => {
                                        if (quizCounts.total === 0) {
                                            alert('저장된 문제가 0개입니다. 먼저 문제를 추가해주세요.');
                                            return;
                                        }
                                        createRoom('buzzer');
                                    }}
                                    disabled={quizCounts.total === 0}
                                    style={{
                                        width: '100%',
                                        background: quizCounts.total > 0 ? 'var(--secondary)' : '#e2e8f0',
                                        color: quizCounts.total > 0 ? 'white' : '#94a3b8',
                                        cursor: quizCounts.total > 0 ? 'pointer' : 'not-allowed',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'space-between',
                                        padding: '14px 20px',
                                        border: 'none',
                                        borderRadius: '14px'
                                    }}
                                >
                                    <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                        <Zap size={20} fill={quizCounts.total > 0 ? 'white' : '#94a3b8'} /> 버저 모드
                                    </span>
                                    <span style={{
                                        fontSize: '0.86rem',
                                        padding: '4px 12px',
                                        borderRadius: '20px',
                                        background: quizCounts.total > 0 ? 'rgba(255, 255, 255, 0.25)' : '#cbd5e1',
                                        color: quizCounts.total > 0 ? 'white' : '#64748b',
                                        fontWeight: 'bold'
                                    }}>
                                        {quizCounts.total}문제
                                    </span>
                                </button>
                            )}

                            <button
                                className="glass-button"
                                onClick={() => {
                                    if (quizCounts.mcq === 0) {
                                        alert('이 퀴즈에는 객관식 문제가 없습니다. 문제가 있는 다른 모드를 선택해주세요.');
                                        return;
                                    }
                                    createRoom('mcq_only');
                                }}
                                disabled={quizCounts.mcq === 0}
                                style={{
                                    width: '100%',
                                    background: quizCounts.mcq > 0 ? 'white' : '#f8fafc',
                                    border: quizCounts.mcq > 0 ? '2px solid #3b82f6' : '1.5px solid #e2e8f0',
                                    color: quizCounts.mcq > 0 ? '#1e293b' : '#94a3b8',
                                    cursor: quizCounts.mcq > 0 ? 'pointer' : 'not-allowed',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'space-between',
                                    padding: '14px 20px',
                                    borderRadius: '14px',
                                    fontWeight: 'bold'
                                }}
                            >
                                <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <ClipboardCheck size={20} color={quizCounts.mcq > 0 ? '#3b82f6' : '#94a3b8'} /> 객관식 모드
                                </span>
                                <span style={{
                                    fontSize: '0.86rem',
                                    padding: '4px 12px',
                                    borderRadius: '20px',
                                    background: quizCounts.mcq > 0 ? '#eff6ff' : '#e2e8f0',
                                    color: quizCounts.mcq > 0 ? '#2563eb' : '#64748b',
                                    fontWeight: 'bold',
                                    border: quizCounts.mcq > 0 ? '1px solid #bfdbfe' : 'none'
                                }}>
                                    {quizCounts.mcq}문제
                                </span>
                            </button>

                            <button
                                className="glass-button"
                                onClick={() => {
                                    if (quizCounts.ox === 0) {
                                        alert('이 퀴즈에는 OX 문제가 없습니다. 문제가 있는 다른 모드를 선택해주세요.');
                                        return;
                                    }
                                    createRoom('ox_only');
                                }}
                                disabled={quizCounts.ox === 0}
                                style={{
                                    width: '100%',
                                    background: quizCounts.ox > 0 ? '#6366f1' : '#e2e8f0',
                                    color: quizCounts.ox > 0 ? 'white' : '#94a3b8',
                                    cursor: quizCounts.ox > 0 ? 'pointer' : 'not-allowed',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'space-between',
                                    padding: '14px 20px',
                                    border: 'none',
                                    borderRadius: '14px',
                                    fontWeight: 'bold'
                                }}
                            >
                                <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    ⭕ OX 모드
                                </span>
                                <span style={{
                                    fontSize: '0.86rem',
                                    padding: '4px 12px',
                                    borderRadius: '20px',
                                    background: quizCounts.ox > 0 ? 'rgba(255, 255, 255, 0.25)' : '#cbd5e1',
                                    color: quizCounts.ox > 0 ? 'white' : '#64748b',
                                    fontWeight: 'bold'
                                }}>
                                    {quizCounts.ox}문제
                                </span>
                            </button>

                            <button
                                className="glass-button"
                                onClick={() => {
                                    if (quizCounts.short === 0) {
                                        alert('이 퀴즈에는 주관식 문제가 없습니다. 문제가 있는 다른 모드를 선택해주세요.');
                                        return;
                                    }
                                    createRoom('short_only');
                                }}
                                disabled={quizCounts.short === 0}
                                style={{
                                    width: '100%',
                                    background: quizCounts.short > 0 ? 'white' : '#f8fafc',
                                    border: quizCounts.short > 0 ? '2px solid #06b6d4' : '1.5px solid #e2e8f0',
                                    color: quizCounts.short > 0 ? '#1e293b' : '#94a3b8',
                                    cursor: quizCounts.short > 0 ? 'pointer' : 'not-allowed',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'space-between',
                                    padding: '14px 20px',
                                    borderRadius: '14px',
                                    fontWeight: 'bold'
                                }}
                            >
                                <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <Type size={20} color={quizCounts.short > 0 ? '#0891b2' : '#94a3b8'} /> 주관식 모드
                                </span>
                                <span style={{
                                    fontSize: '0.86rem',
                                    padding: '4px 12px',
                                    borderRadius: '20px',
                                    background: quizCounts.short > 0 ? '#ecfeff' : '#e2e8f0',
                                    color: quizCounts.short > 0 ? '#0891b2' : '#64748b',
                                    fontWeight: 'bold',
                                    border: quizCounts.short > 0 ? '1px solid #a5f3fc' : 'none'
                                }}>
                                    {quizCounts.short}문제
                                </span>
                            </button>
                        </div>
                    </div>
                )}

                {/* LOBBY */}
                {gameState === 'lobby' && (
                    <div className="glass-panel animate-slide-up" style={{ padding: '4rem 2rem', textAlign: 'center' }}>
                        <h3 style={{ color: 'var(--text-muted)', marginBottom: '1rem' }}>아래 PIN 번호를 친구들에게 알려주세요!</h3>
                        <h1 style={{ fontSize: '6rem', marginBottom: '2rem', color: 'var(--text)', letterSpacing: '0.05em' }}>{pin}</h1>
                        <div style={{ background: '#f8fafc', padding: '1.5rem', borderRadius: '20px', marginBottom: '3rem', border: '2px solid #e2e8f0', display: 'flex', gap: '2rem', alignItems: 'center', justifyContent: 'center' }}>
                            <div style={{ background: 'white', padding: '1rem', borderRadius: '16px', boxShadow: '0 4px 6px rgba(0,0,0,0.05)' }}>
                                <QRCode value={getParticipantJoinUrl(pin, publicUrl, serverIp)} size={150} style={{ height: 'auto', maxWidth: '100%', width: '100%' }} viewBox="0 0 150 150" />
                                <p style={{ margin: '10px 0 0 0', fontSize: '0.9rem', color: 'var(--text-muted)', fontWeight: 'bold' }}>QR로 바로 참여!</p>
                                {publicUrl ? (
                                    <p style={{ margin: '4px 0 0 0', fontSize: '0.78rem', color: '#047857', background: '#ecfdf5', padding: '4px 8px', borderRadius: '6px', fontWeight: 'bold' }}>🚀 LTE / 5G / 외부 Wi-Fi 접속 가능</p>
                                ) : (
                                    <p style={{ margin: '4px 0 0 0', fontSize: '0.78rem', color: '#b45309', background: '#fef3c7', padding: '4px 8px', borderRadius: '6px' }}>📶 스마트폰도 같은 Wi-Fi에 연결 필수</p>
                                )}
                            </div>
                            <div style={{ flex: 1, minWidth: '200px' }}>
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', marginBottom: '1.5rem' }}>
                                    <Users color="var(--primary)" size={28} />
                                    <span style={{ fontSize: '1.5rem', fontWeight: '800' }}>{isBuzzerMode ? '참여 현황' : `현재 ${participants.length}명 입장!`}</span>
                                </div>
                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', justifyContent: 'center' }}>
                                    {participants.length === 0 ? (
                                        <span style={{ color: '#94a3b8', fontStyle: 'italic' }}>참여자를 기다리는 중...</span>
                                    ) : (
                                        participants.map(p => (
                                            <div key={p.id} className="player-chip" style={{ fontSize: '0.9rem', padding: '6px 14px' }}>
                                                {p.groupId ? `${p.groupId}조: ` : ''}{p.nickname}
                                            </div>
                                        ))
                                    )}
                                </div>
                            </div>
                        </div>
                        <button className="glass-button" onClick={location.state?.isGame ? startMultiplayerGame : startGame} style={{ padding: '1.2rem 4rem', fontSize: '1.5rem' }}>
                            <Play fill="white" size={24} /> 시작하기!
                        </button>
                    </div>
                )}

                {/* QUESTION */}
                {gameState === 'question' && (
                    <div style={{ display:'flex', gap:'20px', alignItems:'flex-start' }}>
                        {/* Main question area */}
                        <div className="glass-panel animate-slide-up" style={{ flex:1, padding: '3rem 2rem', textAlign: 'center', minHeight: '400px', display: 'flex', flexDirection: 'column', justifyContent: 'center', position: 'relative' }}>
                            {/* Back button */}
                            <button 
                                onClick={handleBackToSetupClick} 
                                className="glass-button" 
                                style={{ 
                                    position: 'absolute', 
                                    top: '20px', 
                                    left: '20px', 
                                    padding: '6px 12px', 
                                    fontSize: '0.8rem', 
                                    display: 'flex', 
                                    alignItems: 'center', 
                                    gap: '4px', 
                                    background: 'rgba(255,255,255,0.8)', 
                                    border: '1px solid #e2e8f0', 
                                    borderRadius: '8px', 
                                    fontWeight: 'bold', 
                                    color: 'var(--primary)', 
                                    cursor: 'pointer', 
                                    zIndex: 10 
                                }}
                            >
                                <ArrowLeft size={16} /> 나가기
                            </button>
                            {/* Question counter */}
                            {totalQuestions > 0 && (
                                <div style={{ fontSize:'0.9rem', color:'var(--text-muted)', marginBottom:'0.8rem', fontWeight:'bold' }}>
                                    문제 {currentQuestionIndex + 1} / {totalQuestions}
                                    {isOffline && <span style={{ marginLeft:'12px', background:'var(--secondary)', color:'white', padding:'2px 10px', borderRadius:'12px', fontSize:'0.8rem' }}>📺 오프라인</span>}
                                </div>
                            )}

                            {/* Presenter Exclusive Answer & Hint Preview Banner - 서브 모니터 연결 시에만 표시 */}
                            {isScreenConnected && (
                            <div style={{
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                background: '#f0fdf4',
                                border: '2px solid #22c55e',
                                borderRadius: '16px',
                                padding: '10px 18px',
                                marginBottom: '1.2rem',
                                boxShadow: '0 4px 12px rgba(34, 197, 94, 0.08)',
                                textAlign: 'left',
                                flexWrap: 'wrap',
                                gap: '8px'
                            }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                                    <span style={{ fontSize: '0.85rem', fontWeight: '900', color: '#15803d', background: '#dcfce7', padding: '3px 8px', borderRadius: '8px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                        <Eye size={14} /> 진행자 정답 미리보기
                                    </span>
                                    <span style={{ fontSize: '1.1rem', fontWeight: '900', color: '#166534' }}>
                                        🎯 {quizType === 'short' ? correctAnswer : (currentOptions?.[correctIndex] ?? correctAnswer ?? '—')}
                                    </span>
                                    {currentExplanation && (
                                        <span style={{ fontSize: '0.88rem', color: '#475569', fontWeight: '600' }}>
                                            (💡 {currentExplanation})
                                        </span>
                                    )}
                                </div>
                                <span style={{
                                    fontSize: '0.78rem',
                                    fontWeight: '800',
                                    color: (isOffline ? offlineShowAnswer : showAnswer) ? '#15803d' : '#e11d48',
                                    background: (isOffline ? offlineShowAnswer : showAnswer) ? '#dcfce7' : '#ffe4e6',
                                    padding: '3px 10px',
                                    borderRadius: '12px'
                                }}>
                                    {(isOffline ? offlineShowAnswer : showAnswer) ? '🔓 스크린에 공개됨' : '🔒 스크린에 숨김 중'}
                                </span>
                            </div>
                            )}

                            <h2 style={{ fontSize: '2.8rem', marginBottom: '1.5rem', wordBreak: 'keep-all' }}>{currentQuestion}</h2>

                            {/* Audio Output Routing Toolbar (when Sub-Monitor is connected & media exists) */}
                            {isScreenConnected && currentMediaUrl && gameState === 'question' && !showOfflineWinner && (
                                <div style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    gap: '12px',
                                    margin: '0 auto 16px auto',
                                    padding: '8px 18px',
                                    background: '#f8fafc',
                                    borderRadius: '16px',
                                    border: '2px solid #cbd5e1',
                                    maxWidth: '540px',
                                    boxShadow: '0 2px 8px rgba(0,0,0,0.04)'
                                }}>
                                    <span style={{ fontSize: '0.88rem', fontWeight: '800', color: '#334155', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                        🔊 소리 출력 위치:
                                    </span>
                                    <div style={{ display: 'flex', gap: '6px' }}>
                                        <button
                                            type="button"
                                            onClick={() => setAudioOutputTarget('screen')}
                                            style={{
                                                padding: '6px 14px',
                                                borderRadius: '10px',
                                                border: 'none',
                                                fontSize: '0.84rem',
                                                fontWeight: '800',
                                                cursor: 'pointer',
                                                background: audioOutputTarget === 'screen' ? '#2563eb' : '#ffffff',
                                                color: audioOutputTarget === 'screen' ? '#ffffff' : '#64748b',
                                                boxShadow: audioOutputTarget === 'screen' ? '0 2px 8px rgba(37,99,235,0.25)' : 'none',
                                                transition: 'all 0.15s'
                                            }}
                                            title="서브 모니터(빔프로젝터/대형TV 스피커)로만 소리가 출력됩니다. (기본 권장)"
                                        >
                                            📺 서브 모니터
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setAudioOutputTarget('host')}
                                            style={{
                                                padding: '6px 14px',
                                                borderRadius: '10px',
                                                border: 'none',
                                                fontSize: '0.84rem',
                                                fontWeight: '800',
                                                cursor: 'pointer',
                                                background: audioOutputTarget === 'host' ? '#2563eb' : '#ffffff',
                                                color: audioOutputTarget === 'host' ? '#ffffff' : '#64748b',
                                                boxShadow: audioOutputTarget === 'host' ? '0 2px 8px rgba(37,99,235,0.25)' : 'none',
                                                transition: 'all 0.15s'
                                            }}
                                            title="메인 모니터(진행자 PC/외장 스피커)로만 소리가 출력됩니다."
                                        >
                                            💻 진행자 PC
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setAudioOutputTarget('none')}
                                            style={{
                                                padding: '6px 14px',
                                                borderRadius: '10px',
                                                border: 'none',
                                                fontSize: '0.84rem',
                                                fontWeight: '800',
                                                cursor: 'pointer',
                                                background: audioOutputTarget === 'none' ? '#ef4444' : '#ffffff',
                                                color: audioOutputTarget === 'none' ? '#ffffff' : '#64748b',
                                                boxShadow: audioOutputTarget === 'none' ? '0 2px 8px rgba(239,68,68,0.25)' : 'none',
                                                transition: 'all 0.15s'
                                            }}
                                            title="양쪽 모두 음소거합니다."
                                        >
                                            🔇 음소거
                                        </button>
                                    </div>
                                </div>
                            )}

                            {/* Question Media/Link Reference */}
                            {!showOfflineWinner && gameState === 'question' && (
                                <MediaViewer
                                    key={`${currentQuestionIndex}_${currentMediaUrl}`}
                                    mediaUrl={currentMediaUrl}
                                    mediaType={currentMediaType}
                                    mediaName={currentMediaName}
                                    displayMode={currentMediaDisplayMode}
                                    autoplay={currentAutoplay}
                                    isMuted={isScreenConnected && (audioOutputTarget === 'screen' || audioOutputTarget === 'none')}
                                    onMediaAction={broadcastMediaAction}
                                />
                            )}

                            {/* Question Central Info: Presenter Answer Badge & Chosung Hint */}
                            <div style={{
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '16px',
                                flexWrap: 'wrap',
                                margin: '0 auto 2rem auto'
                            }}>
                                {/* 진행자 확인용 정답 카드: 서브 모니터 연결 시에만 표시 */}
                                {isScreenConnected && (
                                    <div style={{
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        gap: '10px',
                                        padding: '12px 28px',
                                        background: '#ecfdf5',
                                        border: '3px solid #10b981',
                                        borderRadius: '24px',
                                        boxShadow: '0 8px 25px rgba(16, 185, 129, 0.18)'
                                    }}>
                                        <span style={{ fontSize: '1.2rem', fontWeight: '800', color: '#065f46' }}>🎯 진행자 확인용 정답:</span>
                                        <span style={{ fontSize: '2rem', fontWeight: '900', color: '#047857' }}>
                                            {(() => {
                                                const optAns = (currentOptions && correctIndex !== null && correctIndex !== undefined && currentOptions[correctIndex] && String(currentOptions[correctIndex]).trim() !== '') ? currentOptions[correctIndex] : '';
                                                return correctAnswer || optAns || '미설정';
                                            })()}
                                        </span>
                                    </div>
                                )}

                                {/* 초성 힌트: 청중용이므로 항상 표시 */}
                                {showChosung !== false && quizType === 'short' && correctAnswer && (
                                    <div style={{
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        gap: '10px',
                                        padding: '12px 28px',
                                        background: 'linear-gradient(135deg, #fef3c7 0%, #fde68a 100%)',
                                        border: '3px solid #f59e0b',
                                        borderRadius: '24px',
                                        boxShadow: '0 8px 25px rgba(245, 158, 11, 0.25)'
                                    }}>
                                        <span style={{ fontSize: '1.2rem', fontWeight: '800', color: '#92400e' }}>💡 초성 힌트:</span>
                                        <span style={{ fontSize: '2rem', fontWeight: '900', color: '#b45309', letterSpacing: '6px' }}>
                                            {getChosung(correctAnswer)}
                                        </span>
                                    </div>
                                )}
                            </div>

                            {/* Options display (MCQ / OX) */}
                            {quizType !== 'short' && currentOptions && currentOptions.length > 0 && currentOptions.some(o => o && o.trim() !== '') && (
                                <div style={{ display:'grid', gridTemplateColumns: currentOptions.length === 2 ? '1fr 1fr' : '1fr 1fr', gap:'12px', marginBottom:'2rem' }}>
                                    {currentOptions.map((opt, idx) => {
                                        const isCorrectOpt = offlineShowAnswer && idx === correctIndex;
                                        const isAnswerForHost = idx === correctIndex;
                                        const colors = ['#ef4444','#3b82f6','#22c55e','#f59e0b'];
                                        const oxColors = ['#22c55e','#ef4444'];
                                        const bg = isCorrectOpt ? '#22c55e' : (currentOptions.length === 2 ? oxColors[idx] : colors[idx]);
                                        return (
                                            <div 
                                                key={idx} 
                                                onClick={() => {
                                                    if (isOffline && !offlineShowAnswer) {
                                                        setOfflineShowAnswer(true);
                                                        if (idx === correctIndex) {
                                                            playSound('correct');
                                                        } else {
                                                            playSound('wrong');
                                                        }
                                                    }
                                                }}
                                                onMouseEnter={(e) => {
                                                    if (isOffline && !offlineShowAnswer) {
                                                        e.currentTarget.style.transform = 'scale(1.03)';
                                                        e.currentTarget.style.filter = 'brightness(0.95)';
                                                    }
                                                }}
                                                onMouseLeave={(e) => {
                                                    if (isOffline && !offlineShowAnswer) {
                                                        e.currentTarget.style.transform = 'none';
                                                        e.currentTarget.style.filter = 'none';
                                                    }
                                                }}
                                                style={{
                                                    padding:'1.2rem 1rem',
                                                    borderRadius:'16px',
                                                    background: isCorrectOpt ? '#22c55e' : bg,
                                                    color:'white',
                                                    fontSize: currentOptions.length === 2 ? ((opt || '').length <= 2 ? '3rem' : (opt || '').length <= 6 ? '2rem' : '1.4rem') : '1.2rem',
                                                    fontWeight:'bold',
                                                    border: isCorrectOpt ? '4px solid #16a34a' : (isAnswerForHost && !offlineShowAnswer && isScreenConnected ? '3px dashed #fbbf24' : '4px solid transparent'),
                                                    transform: isCorrectOpt ? 'scale(1.05)' : 'none',
                                                    transition:'all 0.2s',
                                                    opacity: offlineShowAnswer && idx !== correctIndex ? 0.45 : 1,
                                                    cursor: isOffline && !offlineShowAnswer ? 'pointer' : 'default',
                                                    userSelect: 'none',
                                                    position: 'relative'
                                                }}
                                            >
                                                {currentOptions.length > 2 && <span style={{marginRight:'8px',opacity:0.7}}>{'①②③④'[idx]}</span>}
                                                {opt}
                                                {isCorrectOpt && ' ✓'}
                                                {isAnswerForHost && !offlineShowAnswer && isScreenConnected && (
                                                    <span style={{ fontSize: '0.75rem', background: 'rgba(0,0,0,0.3)', padding: '2px 8px', borderRadius: '8px', marginLeft: '8px', fontWeight: '800' }}>
                                                        🎯정답
                                                    </span>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            )}

                            {/* Offline: answer reveal section */}
                            {isOffline && (
                                <div style={{ display:'flex', flexDirection:'column', gap:'12px', alignItems:'center', marginTop:'1rem' }}>
                                    {!offlineShowAnswer ? (
                                        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                                            {currentQuestionIndex > 0 && (
                                                <button className="glass-button secondary" style={{ padding:'0.9rem 1.8rem', fontSize:'1.1rem' }}
                                                    onClick={offlinePrevQuestion}
                                                    title="이전 문제 (← 키)"
                                                >
                                                    ← 이전 문제
                                                </button>
                                            )}
                                            <button className="glass-button" style={{ background:'var(--primary)',color:'white',padding:'1rem 3rem',fontSize:'1.3rem' }}
                                                onClick={() => { setOfflineShowAnswer(true); playSound('reveal'); }}
                                                title="정답 공개 (Enter / → 키)"
                                            >
                                                🎯 정답 공개
                                            </button>
                                        </div>
                                    ) : (
                                        <div className="animate-slide-up" style={{ width:'100%', background:'#f0fdf4', border:'3px solid var(--ans-green)', borderRadius:'20px', padding:'1.5rem', textAlign:'left' }}>
                                            <div style={{ fontSize:'1.4rem', fontWeight:'900', color:'var(--ans-green)', marginBottom:currentExplanation ? '10px' : 0 }}>
                                                🎯 정답: {(() => {
                                                    if (quizType === 'short') return correctAnswer || '—';
                                                    const optAns = (currentOptions && correctIndex !== null && correctIndex !== undefined && currentOptions[correctIndex] && String(currentOptions[correctIndex]).trim() !== '') ? currentOptions[correctIndex] : '';
                                                    return optAns || correctAnswer || '—';
                                                })()}
                                            </div>
                                            {currentExplanation && (
                                                <div style={{ fontSize:'1rem', color:'var(--text-muted)', whiteSpace:'pre-wrap', borderTop:'1px dashed #bbf7d0', paddingTop:'8px' }}>
                                                    💡 {currentExplanation}
                                                </div>
                                            )}
                                        </div>
                                    )}
                                    {offlineShowAnswer && (
                                        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                                            <button className="glass-button secondary" style={{ padding:'0.8rem 1.8rem', fontSize:'1.1rem' }}
                                                onClick={offlinePrevQuestion}
                                                title="정답 가리기 (← 키)"
                                            >
                                                ← 정답 가리기
                                            </button>
                                            <button className="glass-button" style={{ background:'var(--secondary)',color:'white',padding:'0.8rem 2.5rem',fontSize:'1.1rem' }}
                                                onClick={offlineNextQuestion}
                                                title="다음 문제 (Enter / → 키)"
                                            >
                                                {currentQuestionIndex >= totalQuestions - 1 ? '🏆 결과 보기' : '다음 문제 →'}
                                            </button>
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* Online: existing buzzer / MCQ display */}
                            {!isOffline && (
                                isBuzzerMode ? (
                                    <div>
                                        {/* Judge result overlay */}
                                        {judgeResult && (
                                            <div className="animate-pop-in" style={{ marginBottom: '20px', padding: '1.5rem', borderRadius: '20px', background: judgeResult === 'correct' ? '#f0fdf4' : '#fef2f2', border: `3px solid ${judgeResult === 'correct' ? 'var(--ans-green)' : 'var(--ans-red)'}` }}>
                                                <div style={{ fontSize: '2.5rem', fontWeight: '900', color: judgeResult === 'correct' ? 'var(--ans-green)' : 'var(--ans-red)' }}>
                                                    {judgeResult === 'correct' ? '✅ 정답입니다!' : '❌ 오답입니다!'}
                                                </div>
                                                <RaceTrack groupScores={groupScores} participants={participants} totalScore={totalScore} />
                                                <button className="glass-button" onClick={nextQuestion} style={{ marginTop: '10px' }}>
                                                    다음 문제 <ChevronRight />
                                                </button>
                                            </div>
                                        )}

                                        {/* Buzzed info + answer reveal */}
                                        {!judgeResult && buzzedInfo && (
                                            <div className="animate-pop-in" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '20px' }}>
                                                <div style={{ background: 'var(--secondary)', color: 'white', padding: '2rem 4rem', borderRadius: '30px', fontSize: '4rem', fontWeight: '900', boxShadow: '0 20px 40px rgba(251,191,36,0.4)' }}>
                                                    정답 도전!
                                                </div>
                                                <p style={{ fontSize: '1.3rem', color: 'var(--text-muted)' }}>({buzzedInfo.nickname}님이 버저를 눌렀습니다)</p>

                                                {!showAnswer ? (
                                                    <button className="glass-button" onClick={() => setShowAnswer(true)} style={{ background: 'var(--primary)', color: 'white', padding: '1rem 3rem', fontSize: '1.5rem' }}>
                                                        정답 확인하기
                                                    </button>
                                                ) : (
                                                    <div className="animate-slide-up" style={{ width: '100%', padding: '2rem', background: '#f0fdf4', borderRadius: '20px', border: '4px solid var(--ans-green)' }}>
                                                        <h3 style={{ margin: '0 0 10px 0', color: 'var(--ans-green)', fontSize: '2rem' }}>
                                                            정답: {(() => {
                                                                if (quizType === 'short') return correctAnswer || '—';
                                                                const optAns = (currentOptions && correctIndex !== null && correctIndex !== undefined && currentOptions[correctIndex] && String(currentOptions[correctIndex]).trim() !== '') ? currentOptions[correctIndex] : '';
                                                                return optAns || correctAnswer || '—';
                                                            })()}
                                                        </h3>
                                                        {currentExplanation && (
                                                            <p style={{ fontSize: '1.2rem', color: 'var(--text-muted)', marginBottom: '20px', whiteSpace: 'pre-wrap' }}>
                                                                💡 {currentExplanation}
                                                             </p>
                                                         )}
                                                        <div style={{ display: 'flex', gap: '15px', justifyContent: 'center', flexWrap: 'wrap' }}>
                                                            <button className="glass-button" onClick={() => judgeAnswer(true)} style={{ background: 'var(--ans-green)', color: 'white', padding: '1rem 2.5rem', fontSize: '1.4rem' }}>
                                                                ✅ 정답!
                                                            </button>
                                                            <button className="glass-button" onClick={() => judgeAnswer(false)} style={{ background: 'var(--ans-red)', color: 'white', padding: '1rem 2.5rem', fontSize: '1.4rem' }}>
                                                                ❌ 오답!
                                                            </button>
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        )}

                                        {/* Waiting for buzzer */}
                                        {!judgeResult && !buzzedInfo && (
                                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '20px', opacity: 0.6 }}>
                                                <div className="spinner" style={{ width: '80px', height: '80px', borderRadius: '50%', border: '8px solid #e2e8f0', borderTopColor: 'var(--secondary)', animation: 'spin 1s linear infinite' }} />
                                                <p style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>버저를 기다리는 중...</p>
                                                <div style={{ background: 'white', padding: '10px 20px', borderRadius: '15px', border: '2px solid #e2e8f0', display: 'flex', alignItems: 'center', gap: '15px', marginTop: '10px' }}>
                                                    <span style={{ fontWeight: 'bold' }}>이번 문제 배점:</span>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                                        <button onClick={() => updatePoints(currentPoints - 5)} style={{ width: '30px', height: '30px', borderRadius: '50%', border: 'none', background: '#f1f5f9', cursor: 'pointer', fontWeight: 'bold' }}>-</button>
                                                        <span style={{ fontSize: '1.2rem', fontWeight: '900', color: 'var(--primary)', minWidth: '40px', textAlign: 'center' }}>{currentPoints}점</span>
                                                        <button onClick={() => updatePoints(currentPoints + 5)} style={{ width: '30px', height: '30px', borderRadius: '50%', border: 'none', background: '#f1f5f9', cursor: 'pointer', fontWeight: 'bold' }}>+</button>
                                                    </div>
                                                </div>
                                                {Object.keys(groupScores).length > 0 && <RaceTrack groupScores={groupScores} participants={participants} totalScore={totalScore} />}
                                            </div>
                                        )}
                                    </div>
                                ) : (
                                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', margin: '3rem 0', width: '100%' }}>
                                        <div style={{ fontSize: '7rem', fontWeight: '800', color: 'var(--primary)', lineHeight: '1' }}>{answeredCount}</div>
                                        <p style={{ color: 'var(--text-muted)', fontSize: '1.2rem', fontWeight: 'bold', letterSpacing: '2px' }}>명 제출 완료</p>
                                        
                                        {Object.keys(groupScores).length > 0 && (
                                            <div style={{ width: '100%', marginTop: '2rem' }}>
                                                <RaceTrack groupScores={groupScores} participants={participants} totalScore={totalScore} />
                                            </div>
                                        )}

                                        {firstCorrectInfo && (
                                            <div className="animate-pop-in" style={{
                                                marginTop: '1.5rem',
                                                padding: '1.2rem',
                                                background: 'var(--ans-green)',
                                                color: 'white',
                                                borderRadius: '20px',
                                                fontSize: '1.3rem',
                                                fontWeight: '900',
                                                boxShadow: '0 10px 25px rgba(16,185,129,0.3)',
                                                textAlign: 'center',
                                                width: '100%',
                                                maxWidth: '500px'
                                            }}>
                                                🏆 {firstCorrectInfo.groupId ? `[${firstCorrectInfo.groupId}조] ` : ''}{firstCorrectInfo.nickname}님이<br/>가장 먼저 맞혔습니다!
                                            </div>
                                        )}

                                        <button className="glass-button" onClick={showResults} style={{ width: '100%', maxWidth: '300px', marginTop: '2rem' }}>
                                            결과 보기 <ChevronRight />
                                        </button>
                                    </div>
                                )
                            )}

                            {/* Presenter Next Question Preview */}
                            {allQuizQuestions && allQuizQuestions[currentQuestionIndex + 1] && (
                                <div style={{
                                    marginTop: '28px',
                                    padding: '14px 20px',
                                    background: 'rgba(248, 250, 252, 0.95)',
                                    borderRadius: '16px',
                                    border: '2px dashed #cbd5e1',
                                    textAlign: 'left',
                                    boxShadow: '0 2px 8px rgba(0,0,0,0.03)'
                                }}>
                                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px', flexWrap: 'wrap', gap: '6px' }}>
                                        <span style={{ fontSize: '0.85rem', fontWeight: '800', color: '#475569' }}>
                                            🔜 다음 문제 미리보기 (문제 {currentQuestionIndex + 2} / {totalQuestions})
                                        </span>
                                        <span style={{ fontSize: '0.84rem', color: '#059669', fontWeight: 'bold', background: '#dcfce7', padding: '2px 8px', borderRadius: '6px' }}>
                                            🎯 정답: {allQuizQuestions[currentQuestionIndex + 1].options && allQuizQuestions[currentQuestionIndex + 1].correctIndex !== undefined
                                                ? allQuizQuestions[currentQuestionIndex + 1].options[allQuizQuestions[currentQuestionIndex + 1].correctIndex]
                                                : (allQuizQuestions[currentQuestionIndex + 1].answer || '—')}
                                        </span>
                                    </div>
                                    <div style={{ fontSize: '0.98rem', fontWeight: '700', color: '#1e293b' }}>
                                        {allQuizQuestions[currentQuestionIndex + 1].text || allQuizQuestions[currentQuestionIndex + 1].question}
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Offline score sidebar */}
                        {isOffline && offlineScores.length > 0 && (
                            <div style={{
                                width:'160px',
                                flexShrink:0,
                                display:'flex',
                                flexDirection:'column',
                                gap:'10px',
                                background:'rgba(255,255,255,0.7)',
                                backdropFilter:'blur(10px)',
                                borderRadius:'20px',
                                padding:'16px 10px',
                                border:'2px solid #e2e8f0',
                                boxShadow:'0 4px 20px rgba(0,0,0,0.07)'
                            }}>
                                <div style={{ fontSize:'0.8rem', fontWeight:'900', color:'var(--text-muted)', textAlign:'center', marginBottom:'4px', letterSpacing:'1px' }}>점수판</div>
                                {offlineScores.map((p, idx) => (
                                    <div key={idx} style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:'4px', background:'#f8fafc', borderRadius:'14px', padding:'8px 6px', border:'2px solid #e2e8f0' }}>
                                        <div style={{ fontSize:'0.85rem', fontWeight:'bold', color:'var(--text)' }}>{p.num}번</div>
                                        <div 
                                            onClick={() => handleExactOfflineScore(idx)}
                                            title="클릭하여 점수 직접 수정"
                                            style={{ fontSize:'1.4rem', fontWeight:'900', color:'var(--primary)', cursor:'pointer', display:'flex', alignItems:'center', gap:'2px' }}
                                        >
                                            {p.score} <Edit3 size={12} style={{ opacity: 0.5 }} />
                                        </div>
                                        <div style={{ display:'flex', gap:'6px' }}>
                                            <button onClick={() => adjustOfflineScore(idx, -10)} style={{ width:'28px',height:'28px',borderRadius:'50%',border:'none',background:'#fee2e2',color:'#ef4444',cursor:'pointer',fontWeight:'bold',fontSize:'1rem' }}>−</button>
                                            <button onClick={() => adjustOfflineScore(idx, 10)} style={{ width:'28px',height:'28px',borderRadius:'50%',border:'none',background:'#dcfce7',color:'#16a34a',cursor:'pointer',fontWeight:'bold',fontSize:'1rem' }}>+</button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}

                {/* OFFLINE WINNER SCREEN */}
                {isOffline && showOfflineWinner && (() => {
                    const maxSc = Math.max(...offlineScores.map(p => p.score));
                    const winners = offlineScores.filter(p => p.score === maxSc);
                    return (
                        <div style={{ position:'fixed',top:0,left:0,width:'100%',height:'100%',background:'rgba(0,0,0,0.7)',display:'flex',alignItems:'center',justifyContent:'center',zIndex:3000,backdropFilter:'blur(6px)' }}>
                            {offlineConfetti && <Confetti recycle={false} numberOfPieces={500} />}
                            <div className="glass-panel" style={{ padding:'3rem',maxWidth:'500px',width:'90%',textAlign:'center',background:'white' }}>
                                <div style={{ fontSize:'4rem', marginBottom:'0.5rem' }}>🏆</div>
                                <h2 style={{ fontSize:'2rem', marginBottom:'0.5rem', color:'var(--secondary)' }}>게임 종료!</h2>
                                <p style={{ color:'var(--text-muted)', marginBottom:'2rem' }}>최종 점수 결과입니다.</p>
                                <div style={{ display:'flex', flexDirection:'column', gap:'10px', marginBottom:'2rem' }}>
                                    {[...offlineScores].sort((a,b) => b.score - a.score).map((p, idx) => {
                                        const isWinner = p.score === maxSc;
                                        return (
                                            <div key={p.num} style={{
                                                display:'flex', justifyContent:'space-between', alignItems:'center',
                                                padding:'1rem 1.5rem', borderRadius:'16px',
                                                background: isWinner ? 'var(--secondary)' : '#f8fafc',
                                                color: isWinner ? 'white' : 'var(--text)',
                                                border: isWinner ? 'none' : '2px solid #e2e8f0',
                                                animation: isWinner ? 'pulseGlow 1.5s infinite' : 'none',
                                                boxShadow: isWinner ? '0 0 20px rgba(245,158,11,0.6)' : 'none',
                                                transform: isWinner ? 'scale(1.04)' : 'none'
                                            }}>
                                                <span style={{ fontWeight:'bold', fontSize:'1.2rem' }}>{isWinner ? '🥇 ' : `#${idx+1} `}{p.num}번</span>
                                                <span style={{ fontSize:'1.5rem', fontWeight:'900' }}>{p.score}점</span>
                                            </div>
                                        );
                                    })}
                                </div>
                                <div style={{ display:'flex', flexDirection:'column', gap:'10px' }}>
                                    <button className="glass-button" style={{ background:'var(--primary)',color:'white',padding:'1rem',fontSize:'1.1rem' }}
                                        onClick={() => {
                                            localStorage.setItem('quizrun_offline_session', JSON.stringify({
                                                participantCount: offlineScores.length,
                                                scores: offlineScores
                                            }));
                                            setShowOfflineWinner(false);
                                            setShowContinueModal(true);
                                        }}>
                                        📚 점수 유지하고 다음 퀴즈 이어하기
                                    </button>
                                    <button className="glass-button secondary" style={{ padding:'1rem',fontSize:'1rem' }}
                                        onClick={() => {
                                            localStorage.removeItem('quizrun_offline_session');
                                            navigate(-2);
                                        }}>
                                        종료하기
                                    </button>
                                </div>
                            </div>
                        </div>
                    );
                })()}

                {/* Continue modal — navigate back to topic */}
                {showContinueModal && (
                    <div style={{ position:'fixed',top:0,left:0,width:'100%',height:'100%',background:'rgba(0,0,0,0.55)',display:'flex',alignItems:'center',justifyContent:'center',zIndex:3000,backdropFilter:'blur(6px)' }}>
                        <div className="glass-panel" style={{ padding:'2.5rem',maxWidth:'380px',width:'90%',textAlign:'center',background:'white' }}>
                            <h2 style={{ marginBottom:'0.5rem' }}>다음 퀴즈 선택</h2>
                            <p style={{ color:'var(--text-muted)', marginBottom:'2rem', fontSize:'0.95rem' }}>이전 점수가 저장되었습니다.<br/>홈으로 돌아가 다음 퀴즈를 선택하세요.</p>
                            <button className="glass-button" style={{ width:'100%',background:'var(--primary)',color:'white',padding:'1rem',fontSize:'1.1rem' }}
                                onClick={() => { setShowContinueModal(false); navigate(-2); }}>
                                홈으로 돌아가기 →
                            </button>
                        </div>
                    </div>
                )}

                {/* Back confirm modal */}
                {showBackConfirmModal && (
                    <div style={{ position:'fixed',top:0,left:0,width:'100%',height:'100%',background:'rgba(0,0,0,0.55)',display:'flex',alignItems:'center',justifyContent:'center',zIndex:3000,backdropFilter:'blur(6px)' }}>
                        <div className="glass-panel" style={{ padding:'2.5rem',maxWidth:'450px',width:'90%',textAlign:'center',background:'white' }}>
                            <h2 style={{ marginBottom:'1rem' }}>돌아가기 확인</h2>
                            <p style={{ color:'var(--text-muted)', marginBottom:'2rem', fontSize:'0.95rem', lineHeight:'1.5' }}>
                                퀴즈 선택 화면으로 돌아갑니다.<br/>
                                <strong>현재 인원별로 획득한 점수를 그대로 유지할까요?</strong>
                            </p>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                <button className="glass-button" style={{ width:'100%',background:'var(--primary)',color:'white',padding:'1rem',fontSize:'1.1rem',fontWeight:'bold' }}
                                    onClick={() => {
                                        setShowBackConfirmModal(false);
                                        setGameState('setup');
                                    }}>
                                    📚 점수 유지하고 돌아가기
                                </button>
                                <button className="glass-button" style={{ width:'100%',background:'#ef4444',color:'white',padding:'1rem',fontSize:'1.1rem',fontWeight:'bold' }}
                                    onClick={() => {
                                        setShowBackConfirmModal(false);
                                        setOfflineScores(Array.from({ length: participantCount }, (_, i) => ({ num: i + 1, score: 0 })));
                                        setGameState('setup');
                                    }}>
                                    🔄 점수 초기화하고 돌아가기
                                </button>
                                <button className="glass-button secondary" style={{ width:'100%',padding:'0.8rem',fontSize:'1rem' }}
                                    onClick={() => setShowBackConfirmModal(false)}>
                                    취소 (계속 풀기)
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                <style>{`
                @keyframes pulseGlow {
                    0%, 100% { box-shadow: 0 0 20px rgba(245,158,11,0.6); }
                    50% { box-shadow: 0 0 40px rgba(245,158,11,1); }
                }
                `}</style>

                {/* LEADERBOARD */}
                {(gameState === 'leaderboard' || gameState === 'final_leaderboard') && (
                    <div className="glass-panel animate-slide-up" style={{ padding: '3rem' }}>
                        <h2 style={{ fontSize: '2.5rem', marginBottom: '1.5rem', textAlign: 'center', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '15px' }}>
                            <Trophy color="var(--secondary)" size={40} /> {gameState === 'final_leaderboard' ? '최종 순위!' : '현재 순위!'}
                        </h2>

                        {firstCorrectInfo && (
                            <div className="animate-pop-in" style={{
                                margin: '0 auto 2.5rem auto',
                                padding: '1.2rem',
                                background: 'var(--ans-green)',
                                color: 'white',
                                borderRadius: '20px',
                                fontSize: '1.3rem',
                                fontWeight: '900',
                                boxShadow: '0 10px 25px rgba(16,185,129,0.3)',
                                textAlign: 'center',
                                width: '100%',
                                maxWidth: '500px'
                            }}>
                                🏆 {firstCorrectInfo.groupId ? `[${firstCorrectInfo.groupId}조] ` : ''}{firstCorrectInfo.nickname}님이<br/>가장 먼저 맞혔습니다!
                            </div>
                        )}

                        {Object.keys(groupScores).length > 0 && (
                            <RaceTrack groupScores={groupScores} participants={participants} totalScore={totalScore} />
                        )}

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginBottom: '3rem' }}>
                            {(participants || []).sort((a, b) => (b.score || 0) - (a.score || 0)).map((p, index) => (
                                <div key={p.id || index} style={{ display: 'flex', justifyContent: 'space-between', padding: '1.5rem 2rem', background: index === 0 ? 'var(--secondary)' : '#f8fafc', color: index === 0 ? 'white' : 'var(--text)', border: index === 0 ? 'none' : '2px solid #e2e8f0', borderRadius: '16px', alignItems: 'center', transform: index === 0 ? 'scale(1.02)' : 'none', boxShadow: index === 0 ? '0 10px 25px rgba(245,158,11,0.3)' : 'none' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
                                        <span style={{ fontSize: '2rem', fontWeight: '800', opacity: index === 0 ? 1 : 0.5 }}>#{index + 1}</span>
                                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                                            <span style={{ fontSize: '1.4rem', fontWeight: 'bold' }}>{p.nickname || 'Unknown'}</span>
                                            {p.groupId && <span style={{ fontSize: '0.9rem', opacity: 0.8 }}>{p.groupId}조</span>}
                                        </div>
                                    </div>
                                    <div style={{ fontSize: '1.8rem', fontWeight: '900' }}>{(p.score || 0).toLocaleString()} <span style={{ fontSize: '1rem', fontWeight: 'normal' }}>점</span></div>
                                </div>
                            ))}
                        </div>

                        <div style={{ textAlign: 'center' }}>
                            {gameState === 'final_leaderboard' ? (
                                <button className="glass-button" onClick={() => navigate('/')}><Home /> 홈으로 돌아가기</button>
                            ) : (
                                <button className="glass-button" onClick={nextQuestion}>다음 문제 <ChevronRight /></button>
                            )}
                        </div>
                    </div>
                )}
            </div>

            <style>{`
                @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
                .animate-pop-in { animation: popIn 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275); }
                @keyframes popIn { 0% { transform: scale(0.5); opacity: 0; } 100% { transform: scale(1); opacity: 1; } }
            `}</style>
                </>
            )}

            {/* QR 코드 확대 모달 (주식 게임 및 게임런 진행 중 재접속용) */}
            {showGameQrModal && pin && (
                <div style={{
                    position: 'fixed',
                    inset: 0,
                    backgroundColor: 'rgba(0, 0, 0, 0.65)',
                    backdropFilter: 'blur(5px)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    zIndex: 9999,
                    animation: 'fadeIn 0.2s ease-out'
                }} onClick={() => setShowGameQrModal(false)}>
                    <div style={{
                        background: 'white',
                        borderRadius: '24px',
                        padding: '32px',
                        maxWidth: '420px',
                        width: '90%',
                        textAlign: 'center',
                        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
                        position: 'relative'
                    }} onClick={e => e.stopPropagation()}>
                        <button
                            onClick={() => setShowGameQrModal(false)}
                            style={{
                                position: 'absolute',
                                top: '16px',
                                right: '16px',
                                background: '#f1f5f9',
                                border: 'none',
                                borderRadius: '50%',
                                width: '36px',
                                height: '36px',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                color: '#64748b'
                            }}
                        >
                            <X size={20} />
                        </button>
                        <h3 style={{ fontSize: '1.35rem', fontWeight: '900', color: '#1e293b', marginBottom: '8px' }}>
                            📱 참여자 재접속 QR 코드
                        </h3>
                        <p style={{ fontSize: '0.88rem', color: '#64748b', marginBottom: '20px', lineHeight: 1.45 }}>
                            인터넷 창을 실수로 닫았거나 뒤로 가기를 누른 경우,<br/>
                            카메라로 QR코드를 스캔하면 기존 진행 상태 그대로 즉시 재접속됩니다!
                        </p>
                        <div style={{
                            background: '#f8fafc',
                            padding: '20px',
                            borderRadius: '16px',
                            display: 'inline-block',
                            border: '2px solid #e2e8f0',
                            marginBottom: '16px'
                        }}>
                            <QRCode
                                value={getParticipantJoinUrl(pin, publicUrl, serverIp)}
                                size={220}
                                style={{ height: 'auto', maxWidth: '100%', width: '100%' }}
                                viewBox="0 0 220 220"
                            />
                        </div>
                        <div style={{
                            background: '#eff6ff',
                            border: '1px solid #bfdbfe',
                            borderRadius: '12px',
                            padding: '10px 14px',
                            fontSize: '0.95rem',
                            fontWeight: 'bold',
                            color: '#1e40af',
                            marginBottom: '12px'
                        }}>
                            방 입장 코드: <span style={{ fontSize: '1.25rem', color: 'var(--primary)', fontWeight: '900' }}>{pin}</span>
                        </div>
                        <div style={{ fontSize: '0.75rem', color: '#94a3b8', wordBreak: 'break-all' }}>
                            {getParticipantJoinUrl(pin, publicUrl, serverIp)}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
