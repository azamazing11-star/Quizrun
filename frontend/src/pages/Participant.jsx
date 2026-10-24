import SpotDifferenceQuiz from '../components/SpotDifferenceQuiz';
import NunchiGame from '../components/NunchiGame';
import React, { useState, useEffect, useRef } from 'react';
import { User, KeyRound, AlertCircle, CheckCircle, XCircle, ArrowLeft, Music } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';
import { playSound } from '../utils/audio';
import { getChosung } from '../utils/chosung';
import Confetti from 'react-confetti';
import MediaViewer from '../components/MediaViewer';
import GameFinishBanner from '../components/GameFinishBanner';
import FireworksOverlay from '../components/FireworksOverlay';
import StockGame from '../components/StockGame';
import CardMatchGame from '../components/CardMatchGame';
import TetrisGame from '../components/TetrisGame';
import BrickBreakerGame from '../components/BrickBreakerGame';
import AirplaneGame from '../components/AirplaneGame';

export { CardMatchGame, TetrisGame, BrickBreakerGame, AirplaneGame };

function getOrCreateClientId() {
    let cid = null;
    try {
        cid = sessionStorage.getItem('quizrun_client_id');
        if (!cid) {
            cid = 'c_' + Date.now().toString(36) + '_' + Math.random().toString(36).substring(2, 9);
            sessionStorage.setItem('quizrun_client_id', cid);
        }
    } catch (e) {
        cid = 'c_' + Date.now().toString(36) + '_' + Math.random().toString(36).substring(2, 9);
    }
    return cid;
}

export default function Participant({ socket }) {
    const location = useLocation();
    const navigate = useNavigate();
    const [pin, setPin] = useState('');
    const [nickname, setNickname] = useState(localStorage.getItem('quizrun_nickname') || '');
    const [error, setError] = useState(null);
    const [currentPoints, setCurrentPoints] = useState(10);
    const [autoReconnecting, setAutoReconnecting] = useState(false);
    const hasAttemptedAutoJoin = useRef(false);
    const clientIdRef = useRef(getOrCreateClientId());

    const [gameState, setGameState] = useState('join');
    const [hasJoined, setHasJoined] = useState(false);
    const [isLoading, setIsLoading] = useState(!socket.connected);
    const [socketConnected, setSocketConnected] = useState(socket.connected);
    const [leaderboard, setLeaderboard] = useState([]);
    const [myScore, setMyScore] = useState(0);
    const [myStatus, setMyStatus] = useState(null);
    const [isBuzzerMode, setIsBuzzerMode] = useState(false);
    const [quizType, setQuizType] = useState('mcq');
    const [groupId, setGroupId] = useState(null);

    // BGM State for Carefree playback (for GameRun except stock_game & ladder, and QuizRun)
    const [isBgmEnabled, setIsBgmEnabled] = useState(() => {
        try {
            return localStorage.getItem('quizrun_bgm_enabled') !== 'false';
        } catch (e) {
            return true;
        }
    });
    const bgmAudioRef = useRef(null);

    const toggleBgm = () => {
        setIsBgmEnabled(prev => {
            const next = !prev;
            try {
                localStorage.setItem('quizrun_bgm_enabled', String(next));
            } catch (e) {}
            return next;
        });
    };

    // --- MULTIPLAYER GAME STATES ---
    const [isGame, setIsGame] = useState(Boolean(sessionStorage.getItem('quizrun_game_id')));
    const [gameId, setGameId] = useState(sessionStorage.getItem('quizrun_game_id') || '');
    const [gameTimeLeft, setGameTimeLeft] = useState(15);

    useEffect(() => {
        const params = new URLSearchParams(location.search);
        const p = params.get('pin');
        if (p) setPin(p);

        // Pre-fill nickname from localStorage if present
        const savedNickname = localStorage.getItem('quizrun_nickname');
        if (savedNickname && !nickname) {
            setNickname(savedNickname);
        }

        // Auto-reconnect when scanning QR code ONLY if this session had ALREADY joined this room
        const hasJoinedSession = sessionStorage.getItem('quizrun_joined') === 'true' && sessionStorage.getItem('quizrun_pin') === String(p).trim();
        if (p && savedNickname && socketConnected && hasJoinedSession && !hasJoined && !hasAttemptedAutoJoin.current) {
            hasAttemptedAutoJoin.current = true;
            setAutoReconnecting(true);
            const myClientId = clientIdRef.current || getOrCreateClientId();
            socket.emit('participant:joinRoom', { pin: String(p).trim(), nickname: savedNickname, clientId: myClientId }, (res) => {
                setAutoReconnecting(false);
                if (res.success) {
                    setHasJoined(true);
                    if (res.nickname) {
                        setNickname(res.nickname);
                        localStorage.setItem('quizrun_nickname', res.nickname);
                    }
                    setIsBuzzerMode(!!res.isBuzzerMode);
                    const qType = res.quizType || 'mcq';
                    setQuizType(qType);
                    if (res.question) setCurrentQuestion(typeof res.question === 'object' ? (res.question.text || '') : (res.question || ''));
                    if (res.options) setCurrentOptions(res.options);
                    if (res.currentQuestionIndex !== undefined) setCurrentQuestionIndex(res.currentQuestionIndex);
                    if (res.totalQuestions !== undefined) setTotalQuestions(res.totalQuestions);
                    if (res.points !== undefined) setCurrentPoints(res.points);
                    if (res.mediaUrl) setCurrentMediaUrl(res.mediaUrl);
                    if (res.mediaType) setCurrentMediaType(res.mediaType);
                    if (res.mediaName) setCurrentMediaName(res.mediaName);
                    if (res.mediaDisplayMode) setCurrentMediaDisplayMode(res.mediaDisplayMode);
                    if (res.autoplay !== undefined) setCurrentAutoplay(res.autoplay);
                    if (res.showChosung !== undefined) setShowChosung(res.showChosung);
                    
                    if (res.myScore !== undefined) {
                        setMyScore(res.myScore);
                    }
                    if (res.groupId !== undefined && res.groupId !== null) {
                        setGroupId(res.groupId);
                    }
                    if (res.isGame || res.gameId) {
                        setIsGame(true);
                        if (res.gameId) setGameId(res.gameId);
                        setGameState('game_active');
                    } else if (res.isBuzzerMode) {
                        setGameState(res.groupId ? 'waiting' : 'select_join_type');
                    } else {
                        setGameState(res.roomState === 'lobby' ? 'waiting' : res.roomState);
                    }
                } else {
                    setError(res.message);
                }
            });
        }
    }, [location.search, socketConnected, hasJoined]);

    // Word Bomb states
    const [activePlayerId, setActivePlayerId] = useState('');
    const [activePlayerNickname, setActivePlayerNickname] = useState('');
    const [gameSyllable, setGameSyllable] = useState('');
    const [gameEliminated, setGameEliminated] = useState([]);
    const [gameWinner, setGameWinner] = useState(null);
    const [wordInput, setWordInput] = useState('');
    const [gameUsedWords, setGameUsedWords] = useState([]);
    const [wordFeedback, setWordFeedback] = useState('');
    const [gameRankings, setGameRankings] = useState([]);
    
    // OX Game states
    const [oxQuestion, setOxQuestion] = useState('');
    const [oxChoice, setOxChoice] = useState(null);
    const [oxReveal, setOxReveal] = useState(false);
    const [oxAnswer, setOxAnswer] = useState('');
    const [oxChoices, setOxChoices] = useState({});
    
    // Catch Mind states
    const [painterId, setPainterId] = useState('');
    const [painterNickname, setPainterNickname] = useState('');
    const [catchMindSecretWord, setCatchMindSecretWord] = useState('');
    const [catchMindWinner, setCatchMindWinner] = useState(null);
    const [guessInput, setGuessInput] = useState('');
    const [canvasLines, setCanvasLines] = useState([]);
    const [isDrawing, setIsDrawing] = useState(false);
    const canvasRef = React.useRef(null);

    const [currentQuestion, setCurrentQuestion] = useState('');
    const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
    const [totalQuestions, setTotalQuestions] = useState(0);
    const [currentOptions, setCurrentOptions] = useState([]);
    const [currentMediaUrl, setCurrentMediaUrl] = useState('');
    const [currentMediaUrl2, setCurrentMediaUrl2] = useState('');
    const [currentDiffSpots, setCurrentDiffSpots] = useState([]);
    const [currentTimeLimit, setCurrentTimeLimit] = useState(60);
    const [isSpotDiff, setIsSpotDiff] = useState(false);
    const [currentMediaType, setCurrentMediaType] = useState('');
    const [currentMediaName, setCurrentMediaName] = useState('');
    const [currentMediaDisplayMode, setCurrentMediaDisplayMode] = useState('auto');
    const [currentAutoplay, setCurrentAutoplay] = useState(false);
    const [showChosung, setShowChosung] = useState(true);
    const [lastCorrectIndex, setLastCorrectIndex] = useState(null);
    const [lastCorrectAnswer, setLastCorrectAnswer] = useState('');
    const [lastExplanation, setLastExplanation] = useState('');
    const [myLastAnswer, setMyLastAnswer] = useState(null);
    const [buzzedInfo, setBuzzedInfo] = useState(null);
    const [buzzerJudgeResult, setBuzzerJudgeResult] = useState(null); // null | 'correct' | 'incorrect'
    const [showConfetti, setShowConfetti] = useState(false);
    const pinRef = useRef(pin);
    const nicknameRef = useRef(nickname);
    const hasJoinedRef = useRef(hasJoined);

    useEffect(() => { pinRef.current = pin; }, [pin]);
    useEffect(() => { nicknameRef.current = nickname; }, [nickname]);
    useEffect(() => { 
        hasJoinedRef.current = hasJoined;
        if (hasJoined) sessionStorage.setItem('quizrun_joined', 'true');
    }, [hasJoined]);

    useEffect(() => {
        setSocketConnected(socket.connected);
        if (!socket.connected) {
            socket.connect();
        }
        const onConnect = () => {
            setSocketConnected(true);
            setIsLoading(false);
            setError(prev => (prev && (prev.includes('서버와 연결되지 않았습니다') || prev.includes('연결 중')) ? null : prev));

            // AUTO-REJOIN: If connection dropped and restored, re-register this new socket.id with existing participant session
            const currentPin = pinRef.current || new URLSearchParams(window.location.search).get('pin') || sessionStorage.getItem('quizrun_pin');
            const currentNick = nicknameRef.current || localStorage.getItem('quizrun_nickname');
            if (currentPin && currentNick && (hasJoinedRef.current || sessionStorage.getItem('quizrun_joined') === 'true')) {
                console.log('[Auto-Rejoin] Socket reconnected, re-joining room:', currentPin, currentNick);
                const myClientId = clientIdRef.current || getOrCreateClientId();
                socket.emit('participant:joinRoom', { pin: String(currentPin).trim(), nickname: currentNick, clientId: myClientId }, (res) => {
                    if (res && res.success) {
                        setHasJoined(true);
                        if (res.nickname) {
                            setNickname(res.nickname);
                            localStorage.setItem('quizrun_nickname', res.nickname);
                        }
                        if (res.myScore !== undefined) setMyScore(res.myScore);
                        if (res.groupId !== undefined && res.groupId !== null) setGroupId(res.groupId);
                        if (res.roomState) {
                            setGameState(res.roomState === 'lobby' ? 'waiting' : res.roomState);
                        }
                    }
                });
            }
        };
        const onDisconnect = () => setSocketConnected(false);
        socket.on('connect', onConnect);
        socket.on('disconnect', onDisconnect);

        // If already connected, stop loading
        if (socket.connected) setIsLoading(false);


        // Fallback for loading
        const timeout = setTimeout(() => setIsLoading(false), 5000);
        socket.on('room:stateUpdate', (data) => {
            if (data.participants && Array.isArray(data.participants)) {
                const myClientId = clientIdRef.current || sessionStorage.getItem('quizrun_client_id');
                const me = data.participants.find(p => (myClientId && p.clientId === myClientId) || p.id === socket.id || (p.nickname && p.nickname === nickname));
                if (me) {
                    setHasJoined(true);
                    if (me.score !== undefined) {
                        setMyScore(me.score);
                    }
                }
            }
            if (data.gameId) {
                setIsGame(true);
                setGameId(data.gameId);
                try {
                    sessionStorage.setItem('quizrun_game_id', data.gameId);
                } catch (e) {}
            }
            if (data.isGame) {
                setIsGame(true);
            }
            let nextState = data.state;
            const activeGame = data.gameId || gameId || sessionStorage.getItem('quizrun_game_id');
            if (nextState === 'lobby') {
                nextState = activeGame ? 'game_active' : 'waiting';
            }
            setGameState(prev => {
                if (!hasJoined && ['join', 'select_join_type', 'select_group'].includes(prev)) {
                    return prev;
                }
                return nextState;
            });
            setIsBuzzerMode(!!data.isBuzzerMode);
            if (data.quizType) setQuizType(data.quizType);
            if (data.currentQuestionIndex !== undefined) setCurrentQuestionIndex(data.currentQuestionIndex);
            if (data.totalQuestions !== undefined) setTotalQuestions(data.totalQuestions);

            if (data.points !== undefined) setCurrentPoints(data.points);

            if (data.state === 'question') {
                if (data.question !== undefined) {
                    setCurrentQuestion(typeof data.question === 'object' ? (data.question.text || '') : (data.question || ''));
                }
                setCurrentOptions(data.options || []);
                setCurrentMediaUrl(data.mediaUrl || data.question?.mediaUrl || '');
                setCurrentMediaUrl2(data.mediaUrl2 || data.question?.mediaUrl2 || '');
                setCurrentDiffSpots(data.diffSpots || data.question?.diffSpots || []);
                setCurrentTimeLimit(data.timeLimit || data.question?.timeLimit || 60);
                setIsSpotDiff(Boolean(data.isSpotDiff || data.question?.isSpotDiff || data.mediaUrl2 || data.question?.mediaUrl2 || (typeof data.question === 'string' && (data.question.includes('다른 곳') || data.question.includes('틀린 곳')))));
                setCurrentMediaType(data.mediaType || data.question?.mediaType || '');
                setCurrentMediaName(data.mediaName || data.question?.mediaName || '');
                setCurrentMediaDisplayMode(data.mediaDisplayMode || data.question?.mediaDisplayMode || 'audio');
                setCurrentAutoplay(data.autoplay !== undefined ? data.autoplay : (data.question?.autoplay !== undefined ? data.question.autoplay : true));
                setShowChosung(data.showChosung !== undefined ? data.showChosung : (data.question?.showChosung !== undefined ? data.question.showChosung : true));
                setMyStatus(null);
                setLastCorrectIndex(null);
                setLastCorrectAnswer(data.correctAnswer || '');
                setLastExplanation(data.explanation || '');
                setMyLastAnswer(null);
                setBuzzedInfo(null);
                setBuzzerJudgeResult(null);
                setShowConfetti(false);
            }

            if ((data.state === 'leaderboard' || data.state === 'final_leaderboard') && data.leaderboard) {
                setGameState(data.state);
                setLeaderboard(data.leaderboard);
                // Safety: find participant by current socket ID
                const me = data.leaderboard.find(p => p.id === socket.id);
                if (me) {
                    setMyScore(me.score || 0);
                    setMyStatus(me.isCorrect ? 'correct' : 'incorrect');
                    if (me.isCorrect && data.autoRevealed) {
                        playSound('fanfare');
                        setShowConfetti(true);
                        setTimeout(() => setShowConfetti(false), 5000);
                    } else if (me.isCorrect) {
                        playSound('correct');
                    } else {
                        playSound('wrong');
                    }
                } else {
                    setMyStatus('incorrect');
                }
                if (data.correctIndex !== undefined) setLastCorrectIndex(data.correctIndex);
                if (data.correctAnswer !== undefined) setLastCorrectAnswer(data.correctAnswer);
                if (data.explanation !== undefined) setLastExplanation(data.explanation);
            }
        });

        socket.on('room:buzzed', (data) => {
            setBuzzedInfo(data);
        });

        socket.on('room:buzzerJudge', (data) => {
            const isMeOrMyGroup = (String(data.participantId) === String(socket.id)) || (groupId && String(data.groupId) === String(groupId));
            
            if (data.isCorrect) {
                if (isMeOrMyGroup) {
                    setMyStatus('correct');
                    playSound('fanfare');
                    setShowConfetti(true);
                    setTimeout(() => setShowConfetti(false), 5000);
                } else {
                    setMyStatus('incorrect'); // Failed to get points
                    playSound('wrong');
                }
                setGameState('leaderboard');
            } else {
                // If incorrect, the person who buzzed is locked, others get their buzzer back
                if (isMeOrMyGroup) {
                    setMyStatus('incorrect');
                    playSound('wrong');
                    setGameState('answered'); // Keep them locked
                } else {
                    // Buzzer becomes active again for others
                    setGameState('question');
                    setBuzzedInfo(null);
                    setBuzzerJudgeResult(null);
                }
            }
        });

        socket.on('room:closed', () => {
            setGameState('join');
            setHasJoined(false);
            sessionStorage.removeItem('quizrun_joined');
            sessionStorage.removeItem('quizrun_pin');
            setError('진행자가 세션을 종료하여 접속이 해제되었습니다.');
            setPin('');
            setGroupId(null);
            setMyScore(0);
            setIsGame(false);
            setGameId('');
            try {
                sessionStorage.removeItem('quizrun_game_id');
            } catch (e) {}
            playSound('wrong');
        });

        socket.on('room:message', (data) => {
            if (data && data.event) {
                if (data.event === 'game:start') {
                    setIsGame(true);
                    setGameId(data.payload.gameId);
                    try {
                        sessionStorage.setItem('quizrun_game_id', data.payload.gameId);
                    } catch (e) {}
                    setGameState('game_active');
                    
                    // Init specific game variables
                    if (data.payload.gameId === 'word_bomb') {
                        setActivePlayerId(data.payload.activePlayerId);
                        setActivePlayerNickname(data.payload.activePlayerNickname);
                        setGameSyllable(data.payload.syllable);
                        setGameTimeLeft(data.payload.timeLeft);
                        setGameEliminated([]);
                        setGameWinner(null);
                        setWordInput('');
                        setGameUsedWords([]);
                        setWordFeedback('');
                        setGameRankings([]);
                        if (data.payload.participants && Array.isArray(data.payload.participants)) {
                            const me = data.payload.participants.find(p => p.id === socket.id || (p.nickname && p.nickname === nickname));
                            if (me && me.score !== undefined) {
                                setMyScore(me.score);
                            }
                        }
                    } else if (data.payload.gameId === 'ox_run') {
                        setOxQuestion(data.payload.question);
                        setGameTimeLeft(data.payload.timeLeft);
                        setOxChoice(null);
                        setOxReveal(false);
                        setOxAnswer('');
                    } else if (data.payload.gameId === 'catch_mind') {
                        setPainterId(data.payload.painterId);
                        setPainterNickname(data.payload.painterNickname);
                        setCatchMindSecretWord(data.payload.secretWord);
                        setGameTimeLeft(data.payload.timeLeft);
                        setCatchMindWinner(null);
                        setGuessInput('');
                        setCanvasLines([]);
                    }
                } else if (data.event === 'game:word_bomb_state') {
                    setActivePlayerId(data.payload.activePlayerId);
                    setActivePlayerNickname(data.payload.activePlayerNickname);
                    setGameSyllable(data.payload.syllable);
                    setGameTimeLeft(data.payload.timeLeft);
                    setGameEliminated(data.payload.eliminated || []);
                    setGameUsedWords(data.payload.usedWords || []);
                    setWordFeedback('');
                    if (data.payload.participants && Array.isArray(data.payload.participants)) {
                        const me = data.payload.participants.find(p => p.id === socket.id || (p.nickname && p.nickname === nickname));
                        if (me && me.score !== undefined) {
                            setMyScore(me.score);
                        }
                    }
                } else if (data.event === 'game:word_feedback') {
                    if (!data.payload.playerId || data.payload.playerId === socket.id) {
                        setWordFeedback(data.payload.text || '');
                        playSound('wrong');
                    }
                } else if (data.event === 'game:word_bomb_end') {
                    setGameWinner(data.payload.winner);
                    if (data.payload.rankings) {
                        setGameRankings(data.payload.rankings);
                    }
                    if (data.payload.usedWords) {
                        setGameUsedWords(data.payload.usedWords);
                    }
                    if (data.payload.participants && Array.isArray(data.payload.participants)) {
                        const me = data.payload.participants.find(p => p.id === socket.id || (p.nickname && p.nickname === nickname));
                        if (me && me.score !== undefined) {
                            setMyScore(me.score);
                        }
                    }
                } else if (data.event === 'game:ox_state') {
                    setOxQuestion(data.payload.question);
                    setGameTimeLeft(data.payload.timeLeft);
                    setOxReveal(data.payload.reveal);
                } else if (data.event === 'game:ox_reveal') {
                    setOxReveal(true);
                    setOxAnswer(data.payload.answer);
                    setOxChoices(data.payload.choices || {});
                    
                    // Update client's score locally
                    const myNewScore = data.payload.scores[socket.id];
                    if (myNewScore !== undefined) {
                        setMyScore(myNewScore);
                    }
                } else if (data.event === 'game:ox_next') {
                    setOxQuestion(data.payload.question);
                    setGameTimeLeft(data.payload.timeLeft);
                    setOxChoice(null);
                    setOxReveal(false);
                    setOxAnswer('');
                } else if (data.event === 'game:ox_end') {
                    setGameState('leaderboard');
                } else if (data.event === 'game:catch_mind_state') {
                    setGameTimeLeft(data.payload.timeLeft);
                } else if (data.event === 'game:catch_mind_next') {
                    setPainterId(data.payload.painterId);
                    setPainterNickname(data.payload.painterNickname);
                    setCatchMindSecretWord(data.payload.secretWord);
                    setGameTimeLeft(data.payload.timeLeft);
                    setCatchMindWinner(null);
                    setGuessInput('');
                    setCanvasLines([]);
                } else if (data.event === 'game:catch_mind_end') {
                    setCatchMindWinner(data.payload.winner || 'None (시간 초과)');
                    // Update client's score locally
                    const myNewScore = data.payload.scores[socket.id];
                    if (myNewScore !== undefined) {
                        setMyScore(myNewScore);
                    }
                } else if (data.event === 'game:paint_stroke_relay') {
                    // Receive drawing lines from painter
                    setCanvasLines(prev => [...prev, data.payload]);
                } else if (data.event === 'game:catch_mind_terminate' || data.event === 'game:terminate') {
                    setGameState('leaderboard');
                }
            }
        });

        const onParticipantsUpdated = (updated) => {
            if (Array.isArray(updated)) {
                const myClientId = clientIdRef.current || sessionStorage.getItem('quizrun_client_id');
                const me = updated.find(p => (myClientId && p.clientId === myClientId) || p.id === socket.id || (p.nickname && p.nickname === nickname));
                if (me && me.score !== undefined) {
                    setMyScore(me.score);
                }
            }
        };
        socket.on('host:participantsUpdated', onParticipantsUpdated);

        return () => {
            socket.off('room:message');
            socket.off('host:participantsUpdated', onParticipantsUpdated);
            clearTimeout(timeout);
            socket.off('connect', onConnect);
            socket.off('disconnect', onDisconnect);
            socket.off('room:stateUpdate');
            socket.off('room:buzzed');
        };
    }, [socket, groupId, nickname]);

    useEffect(() => {
        // 주식 게임, 사다리 타기, 테트리스, 벽돌깨기, 비행기게임은 자체 전용 BGM 사용 (carefree 제외)
        const isGameModeActive = gameState === 'game_active' && gameId && gameId !== 'stock_game' && gameId !== 'ladder' && gameId !== 'tetris' && gameId !== 'brick_breaker' && gameId !== 'timeattack' && gameId !== 'airplane_game';
        const isQuizActive = gameState === 'question';
        const shouldPlay = isBgmEnabled && (isGameModeActive || isQuizActive);

        if (!shouldPlay) {
            if (bgmAudioRef.current) {
                bgmAudioRef.current.pause();
            }
            return;
        }

        const bgmFile = '/audio/carefree.mp3';

        if (!bgmAudioRef.current) {
            bgmAudioRef.current = new Audio(bgmFile);
            bgmAudioRef.current.loop = true;
        } else if (!bgmAudioRef.current.src.endsWith('carefree.mp3')) {
            bgmAudioRef.current.pause();
            bgmAudioRef.current = new Audio(bgmFile);
            bgmAudioRef.current.loop = true;
        }

        bgmAudioRef.current.volume = 0.15; // Set slightly lower volume for headphones/mobile speakers
        bgmAudioRef.current.play().catch(e => console.log('BGM play blocked on participant:', e));

        return () => {
            if (bgmAudioRef.current) {
                bgmAudioRef.current.pause();
            }
        };
    }, [gameState, gameId, isBgmEnabled]);

    const handleJoin = (e) => {
        if (e) e.preventDefault();
        if (!pin || !nickname) return;
        setError(null);

        const cleanPin = String(pin).trim();

        const doEmitJoin = () => {
            setIsLoading(true);
            const myClientId = clientIdRef.current || getOrCreateClientId();
            socket.emit('participant:joinRoom', { pin: cleanPin, nickname, clientId: myClientId }, (res) => {
                setIsLoading(false);
                if (res && res.success) {
                    setHasJoined(true);
                    const finalNick = res.nickname || nickname;
                    setNickname(finalNick);
                    localStorage.setItem('quizrun_nickname', finalNick);
                    try {
                        sessionStorage.setItem('quizrun_joined', 'true');
                        sessionStorage.setItem('quizrun_pin', cleanPin);
                    } catch (e) {}
                    setIsBuzzerMode(!!res.isBuzzerMode);
                    const qType = res.quizType || 'mcq';
                    setQuizType(qType);
                    if (res.question) setCurrentQuestion(typeof res.question === 'object' ? (res.question.text || '') : (res.question || ''));
                    if (res.options) setCurrentOptions(res.options);
                    if (res.currentQuestionIndex !== undefined) setCurrentQuestionIndex(res.currentQuestionIndex);
                    if (res.totalQuestions !== undefined) setTotalQuestions(res.totalQuestions);
                    if (res.points !== undefined) setCurrentPoints(res.points);
                    if (res.mediaUrl) setCurrentMediaUrl(res.mediaUrl);
                    if (res.mediaType) setCurrentMediaType(res.mediaType);
                    if (res.mediaName) setCurrentMediaName(res.mediaName);
                    if (res.mediaDisplayMode) setCurrentMediaDisplayMode(res.mediaDisplayMode);
                    if (res.autoplay !== undefined) setCurrentAutoplay(res.autoplay);
                    if (res.showChosung !== undefined) setShowChosung(res.showChosung);
                    
                    if (res.myScore !== undefined) {
                        setMyScore(res.myScore);
                    }
                    if (res.groupId !== undefined && res.groupId !== null) {
                        setGroupId(res.groupId);
                    }
                    if (res.isGame || res.gameId) {
                        setIsGame(true);
                        if (res.gameId) setGameId(res.gameId);
                        setGameState('game_active');
                    } else if (res.isBuzzerMode) {
                        setGameState(res.groupId ? 'waiting' : 'select_join_type');
                    } else {
                        setGameState(res.roomState === 'lobby' ? 'waiting' : res.roomState);
                    }
                } else {
                    setError(res?.message || '방에 입장할 수 없습니다. PIN 번호를 확인해주세요.');
                }
            });
        };

        if (socket.connected) {
            doEmitJoin();
        } else {
            // Not connected yet - initiate connect and wait
            setError('서버에 연결 중입니다... 잠시만 기다려주세요.');
            socket.connect();
            const timer = setTimeout(() => {
                socket.off('connect', onConnectReady);
                if (!socket.connected) {
                    setError('서버 연결 시간이 초과되었습니다. 화면을 새로고침해주세요.');
                }
            }, 6000);
            const onConnectReady = () => {
                clearTimeout(timer);
                setError(null);
                setSocketConnected(true);
                doEmitJoin();
            };
            socket.once('connect', onConnectReady);
        }
    };

    const selectJoinType = (type) => {
        if (type === 'individual') {
            setGroupId(null);
            socket.emit('participant:selectGroup', { pin, groupId: null });
            setGameState('waiting');
        } else {
            setGameState('select_group');
        }
    };

    const selectGroup = (id) => {
        setGroupId(id);
        socket.emit('participant:selectGroup', { pin, groupId: id });
        setGameState('waiting');
    };

    const handleBuzzerPress = () => {
        if (!buzzedInfo) {
            playSound('reveal');
            socket.emit('participant:pressBuzzer', { pin });
        }
    };

    const submitAnswer = (val) => {
        playSound('submit');
        const onResponse = (res) => {
            if (res.success) {
                setMyStatus(res.isCorrect ? 'correct' : 'incorrect');
                if (res.correctIndex !== undefined) setLastCorrectIndex(res.correctIndex);
                if (res.correctAnswer !== undefined) setLastCorrectAnswer(res.correctAnswer);
                if (res.explanation !== undefined) setLastExplanation(res.explanation);
                
                if (res.isCorrect) {
                    playSound('correct');
                    setShowConfetti(true);
                    setTimeout(() => setShowConfetti(false), 5000);
                } else {
                    playSound('wrong');
                }
                setGameState('leaderboard');
            }
        };

        setMyLastAnswer(val);
        if (quizType === 'short') {
            socket.emit('participant:submitAnswer', { pin, textAnswer: val }, onResponse);
        } else {
            socket.emit('participant:submitAnswer', { pin, answerIndex: val }, onResponse);
        }
        setGameState('answered');
    };

    // --- MULTIPLAYER GAME PARTICIPANT LOGIC ---
    
    const submitWord = (e) => {
        e.preventDefault();
        const clean = wordInput.trim();
        if (!clean) return;

        // 중복 단어 체크
        if (gameUsedWords && gameUsedWords.includes(clean)) {
            setWordFeedback(`⚠️ '${clean}'은(는) 이미 제출한 답입니다!`);
            playSound('wrong');
            return;
        }

        // 제시어 포함 여부 체크
        if (gameSyllable && !clean.includes(gameSyllable)) {
            setWordFeedback(`⚠️ 제시어 '${gameSyllable}'(이)가 포함되어야 합니다!`);
            playSound('wrong');
            return;
        }

        setWordFeedback('');
        playSound('submit');
        socket.emit('room:message', {
            pin,
            event: 'game:submit_word',
            payload: { word: clean }
        });
        emitLiveGameStream({
            socket,
            pin,
            gameId: 'word_bomb',
            nickname,
            groupId,
            baseScore: myScore + 10,
            roundScore: 10,
            isAlive: !gameEliminated.includes(socket.id),
            isFinished: false,
            updateRoomScore: false,
            gameData: {
                statusText: `💣 '${clean}' 제출 완료! (+10점)`,
                lastWord: clean,
                syllable: gameSyllable,
                progressPct: Math.min(100, ((gameUsedWords?.length || 0) + 1) * 10)
            }
        });
        setWordInput('');
    };

    const submitOxChoice = (choice) => {
        if (oxReveal) return;
        playSound('submit');
        setOxChoice(choice);
        socket.emit('room:message', {
            pin,
            event: 'game:submit_ox',
            payload: { choice }
        });
        emitLiveGameStream({
            socket,
            pin,
            gameId: 'ox_run',
            nickname,
            groupId,
            baseScore: myScore,
            roundScore: 0,
            isAlive: true,
            isFinished: false,
            updateRoomScore: false,
            gameData: {
                statusText: `⭕❌ '${choice}' 선택 완료!`,
                oxChoice: choice,
                progressPct: 100
            }
        });
    };

    const submitGuess = (e) => {
        e.preventDefault();
        if (!guessInput.trim()) return;
        const cleanGuess = guessInput.trim();
        playSound('submit');
        socket.emit('room:message', {
            pin,
            event: 'game:submit_guess',
            payload: { guess: cleanGuess }
        });
        emitLiveGameStream({
            socket,
            pin,
            gameId: 'catch_mind',
            nickname,
            groupId,
            baseScore: myScore,
            roundScore: 0,
            isAlive: true,
            isFinished: false,
            updateRoomScore: false,
            gameData: {
                statusText: `🎨 정답 추리: '${cleanGuess}'`,
                lastGuess: cleanGuess,
                progressPct: 75
            }
        });
        setGuessInput('');
    };

    // --- UNIVERSAL BACK / POPSTATE NAVIGATION HANDLING ---
    const handleStepBack = () => {
        // 1. If currently in an active game or playing
        if (gameState === 'game_active' || gameState === 'playing' || isGame || gameId) {
            const leaveGame = window.confirm('게임을 나가고 대기실(이전 단계)로 돌아가시겠습니까?');
            if (leaveGame) {
                setIsGame(false);
                setGameId('');
                try {
                    sessionStorage.removeItem('quizrun_game_id');
                } catch (e) {}
                setGameState('waiting');
                if (socket) {
                    socket.emit('room:message', {
                        pin,
                        event: 'game:participant_exit',
                        payload: { nickname }
                    });
                }
            }
            return;
        }

        // 2. If in quiz answering or question stage
        if (gameState === 'question' || gameState === 'answered' || gameState === 'leaderboard') {
            const leaveQuiz = window.confirm('퀴즈 화면을 나가고 대기실(이전 단계)로 돌아가시겠습니까?');
            if (leaveQuiz) {
                setGameState('waiting');
            }
            return;
        }

        // 3. If in group selection screen
        if (gameState === 'select_group') {
            setGameState('select_join_type');
            return;
        }

        // 4. If in join type selection screen
        if (gameState === 'select_join_type') {
            setGameState('join');
            return;
        }

        // 5. If in waiting / lobby screen
        if (gameState === 'waiting' || gameState === 'lobby') {
            const leaveRoom = window.confirm('방에서 나가고 PIN 입력 화면으로 돌아가시겠습니까?');
            if (leaveRoom) {
                setHasJoined(false);
                try {
                    sessionStorage.removeItem('quizrun_joined');
                } catch (e) {}
                setGameState('join');
            }
            return;
        }

        // 6. If in join screen (initial participant screen)
        if (gameState === 'join') {
            const leaveApp = window.confirm('메인 화면으로 나가시겠습니까?');
            if (leaveApp) {
                navigate('/');
            }
            return;
        }

        // Default fallback
        navigate(-1);
    };

    // Trap Android/Galaxy hardware or swipe back gesture using popstate
    useEffect(() => {
        // Push initial trap state
        window.history.pushState({ app: 'quizrun_participant' }, '', window.location.href);

        const handlePopState = (e) => {
            // Keep the history entry alive so subsequent back clicks are still trapped
            window.history.pushState({ app: 'quizrun_participant' }, '', window.location.href);
            handleStepBack();
        };

        window.addEventListener('popstate', handlePopState);
        return () => {
            window.removeEventListener('popstate', handlePopState);
        };
    }, [gameState, isGame, gameId, pin, nickname]);

    // Floating universal back button for all mobile participants
    const renderUniversalBackButton = () => {
        if (gameState === 'join') return null; // 'join' already has its dedicated back button
        if (gameId === 'stock_game') return null; // 주식 게임에서는 이전 단계 버튼 숨김
        return (
            <button
                type="button"
                onClick={handleStepBack}
                style={{
                    position: 'fixed',
                    top: '12px',
                    left: '12px',
                    padding: '8px 14px',
                    fontSize: '0.85rem',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    background: 'rgba(255, 255, 255, 0.92)',
                    backdropFilter: 'blur(8px)',
                    border: '1.5px solid #cbd5e1',
                    borderRadius: '14px',
                    fontWeight: '800',
                    color: '#1e293b',
                    cursor: 'pointer',
                    boxShadow: '0 4px 14px rgba(0, 0, 0, 0.12)',
                    zIndex: 99999,
                    transition: 'all 0.15s ease'
                }}
                title="이전 단계로 가기"
            >
                <ArrowLeft size={16} strokeWidth={2.5} color="var(--primary)" />
                <span>이전 단계</span>
            </button>
        );
    };

    // Canvas painting coordinates relays
    const emitStroke = (x, y, type) => {
        socket.emit('room:message', {
            pin,
            event: 'game:paint_stroke',
            payload: { x, y, type }
        });
    };

    // Draw locally for the painter, or replicate painter's strokes for the guesser
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

    // Touch and mouse listeners for Painter drawing
    const handleCanvasPaint = (e, type) => {
        if (painterId !== socket.id || !canvasRef.current) return;
        const canvas = canvasRef.current;
        const rect = canvas.getBoundingClientRect();
        
        let clientX, clientY;
        if (e.touches && e.touches.length > 0) {
            clientX = e.touches[0].clientX;
            clientY = e.touches[0].clientY;
        } else {
            clientX = e.clientX;
            clientY = e.clientY;
        }
        
        const x = (clientX - rect.left) / rect.width;
        const y = (clientY - rect.top) / rect.height;

        if (type === 'start') {
            setIsDrawing(true);
            emitStroke(x, y, 'start');
            setCanvasLines(prev => [...prev, { x, y, type: 'start' }]);
        } else if (type === 'draw' && isDrawing) {
            emitStroke(x, y, 'draw');
            setCanvasLines(prev => [...prev, { x, y, type: 'draw' }]);
        } else if (type === 'end') {
            setIsDrawing(false);
            emitStroke(0, 0, 'end');
            setCanvasLines(prev => [...prev, { x: 0, y: 0, type: 'end' }]);
        }
    };

    // RENDER THE ACTIVE GAME SCREEN FOR THE PARTICIPANT
    const renderActiveGame = () => {
        const isMyTurnWordBomb = activePlayerId === socket.id;
        const isMePainter = painterId === socket.id;

        return (
            <div className="glass-panel card-container animate-slide-up" style={{ padding: '2rem 1.5rem', width: '100%', maxWidth: '500px', margin: '0 auto', textAlign: 'center', color: 'var(--text)' }}>
                {/* Header */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '2px solid #e2e8f0', paddingBottom: '0.8rem', marginBottom: '1.2rem' }}>
                    <div style={{ fontWeight: 'bold' }}>👤 {nickname}</div>
                    {gameId !== 'stock_game' && gameId !== 'ladder' && (
                        <button
                            type="button"
                            onClick={toggleBgm}
                            style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '4px',
                                padding: '4px 10px',
                                borderRadius: '16px',
                                border: `1.5px solid ${isBgmEnabled ? '#10b981' : '#cbd5e1'}`,
                                background: isBgmEnabled ? '#ecfdf5' : '#f8fafc',
                                color: isBgmEnabled ? '#065f46' : '#64748b',
                                fontSize: '0.78rem',
                                fontWeight: '800',
                                cursor: 'pointer',
                                transition: 'all 0.15s ease'
                            }}
                            title={isBgmEnabled ? "BGM 멈추기 (일시정지)" : "BGM 다시 재생하기"}
                        >
                            <Music size={13} color={isBgmEnabled ? "#059669" : "#64748b"} />
                            <span>{isBgmEnabled ? '🎵 Carefree' : '🔇 BGM 멈춤'}</span>
                        </button>
                    )}
                    <div style={{ fontWeight: 'bold', color: 'var(--secondary)' }}>🏆 {myScore}점</div>
                </div>

                {/* --- WORD BOMB PARTICIPANT UI --- */}
                {gameId === 'word_bomb' && (
                    <div>
                        {gameWinner ? (
                            <div className="animate-pop-in">
                                <div style={{ fontSize: '4rem' }}>👑</div>
                                <h2 style={{ fontSize: '1.8rem', fontFamily: 'Jua, sans-serif', color: 'var(--secondary)', margin: '0.5rem 0' }}>
                                    {gameWinner} 최종 우승!
                                </h2>
                                <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', margin: '0 0 1rem 0' }}>단어 폭탄 게임이 종료되었습니다.</p>

                                {/* 내 순위 배너 */}
                                {(() => {
                                    const myRankIndex = gameRankings.findIndex(r => r.id === socket.id || (r.nickname && r.nickname === nickname));
                                    const myRank = myRankIndex !== -1 ? myRankIndex + 1 : null;
                                    const myRankData = myRankIndex !== -1 ? gameRankings[myRankIndex] : null;
                                    return myRank ? (
                                        <div style={{ background: myRank === 1 ? '#fef3c7' : '#f1f5f9', border: `2px solid ${myRank === 1 ? '#f59e0b' : '#cbd5e1'}`, borderRadius: '16px', padding: '12px', marginBottom: '12px' }}>
                                            <div style={{ fontSize: '0.85rem', color: '#64748b' }}>내 최종 성적</div>
                                            <div style={{ fontSize: '1.4rem', fontWeight: 'bold', color: myRank === 1 ? '#b45309' : '#1e293b' }}>
                                                {myRank === 1 ? '🥇 1위' : myRank === 2 ? '🥈 2위' : myRank === 3 ? '🥉 3위' : `🎖️ ${myRank}위`} ({myRankData?.score ?? myScore}점)
                                            </div>
                                        </div>
                                    ) : null;
                                })()}

                                {/* 전체 순위표 */}
                                {gameRankings.length > 0 && (
                                    <div style={{ textAlign: 'left', background: '#f8fafc', borderRadius: '14px', padding: '12px', border: '1px solid #e2e8f0', marginBottom: '12px' }}>
                                        <div style={{ fontWeight: 'bold', fontSize: '0.95rem', marginBottom: '8px', color: '#334155' }}>🏆 최종 순위표</div>
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                            {gameRankings.map((r, idx) => {
                                                const isMe = r.id === socket.id || (r.nickname && r.nickname === nickname);
                                                return (
                                                    <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '7px 12px', borderRadius: '8px', background: isMe ? '#e0e7ff' : '#ffffff', border: isMe ? '1.5px solid #6366f1' : '1px solid #e2e8f0', fontWeight: isMe ? 'bold' : 'normal' }}>
                                                        <span style={{ fontSize: '0.9rem' }}>{idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : `${idx + 1}위`} {r.nickname} {isMe && '(나)'}</span>
                                                        <span style={{ color: '#2563eb', fontWeight: 'bold', fontSize: '0.9rem' }}>{r.score ?? 0}점</span>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                )}

                                {/* 사용된 단어 모음 */}
                                {gameUsedWords.length > 0 && (
                                    <div style={{ textAlign: 'left', background: '#f8fafc', padding: '10px 12px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                                        <div style={{ fontSize: '0.82rem', fontWeight: 'bold', color: '#64748b', marginBottom: '6px' }}>
                                            📜 사용된 단어 목록 (총 {gameUsedWords.length}개):
                                        </div>
                                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px', maxHeight: '110px', overflowY: 'auto' }}>
                                            {gameUsedWords.map((w, idx) => (
                                                <span key={idx} style={{ background: '#e2e8f0', color: '#334155', padding: '3px 8px', borderRadius: '8px', fontSize: '0.8rem', fontWeight: '500' }}>
                                                    {w}
                                                </span>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        ) : (
                            <div>
                                <div style={{ fontSize: '2.5rem', margin: '0.5rem 0', fontWeight: 'bold', color: isMyTurnWordBomb ? '#ef4444' : '#64748b' }}>
                                    {isMyTurnWordBomb ? `💣 내 차례! ⏱️ ${gameTimeLeft}초` : `⏳ 대기 중 (${activePlayerNickname})`}
                                </div>
                                
                                <div style={{ background: '#fff1f2', border: '1px solid #ffe4e6', borderRadius: '20px', padding: '1.2rem', marginBottom: '1.2rem' }}>
                                    <h3 style={{ margin: 0, color: '#f43f5e', fontSize: '0.95rem' }}>제시어 글자</h3>
                                    <h1 style={{ fontSize: '3.8rem', margin: '0.4rem 0', color: '#e11d48', fontWeight: '900' }}>
                                        {gameSyllable}
                                    </h1>
                                    <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', margin: 0 }}>
                                        위 글자가 <strong>포함된</strong> 단어를 입력하세요! <span style={{ color: '#2563eb', fontWeight: 'bold' }}>(정답 시 +10점)</span>
                                    </p>
                                </div>

                                {gameEliminated.includes(socket.id) ? (
                                    <div style={{ background: '#f1f5f9', padding: '1.5rem', borderRadius: '16px', color: '#ef4444', fontWeight: 'bold', fontSize: '1.2rem' }}>
                                        💥 폭탄이 터져 탈락하셨습니다!
                                    </div>
                                ) : isMyTurnWordBomb ? (
                                    <form onSubmit={submitWord} style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                        <input 
                                            autoFocus
                                            type="text" 
                                            placeholder="단어를 입력하세요" 
                                            value={wordInput} 
                                            onChange={(e) => {
                                                setWordInput(e.target.value);
                                                if (wordFeedback) setWordFeedback('');
                                            }}
                                            style={{ 
                                                width: '100%', 
                                                padding: '12px', 
                                                borderRadius: '12px', 
                                                border: wordFeedback ? '2px solid #ef4444' : '2px solid #3b82f6', 
                                                fontSize: '1.2rem',
                                                textAlign: 'center'
                                            }}
                                        />
                                        {wordFeedback && (
                                            <div style={{ color: '#b91c1c', background: '#fee2e2', padding: '8px 12px', borderRadius: '8px', fontSize: '0.9rem', fontWeight: 'bold', border: '1px solid #fca5a5' }}>
                                                {wordFeedback}
                                            </div>
                                        )}
                                        <button className="primary-btn" type="submit" style={{ background: '#ef4444', padding: '12px', borderRadius: '12px', fontSize: '1.1rem', fontWeight: 'bold' }}>
                                            제출하기 (+10점)
                                        </button>
                                    </form>
                                ) : (
                                    <div style={{ background: '#f8fafc', padding: '1.2rem', borderRadius: '16px', border: '2px solid #cbd5e1' }}>
                                        <p style={{ margin: 0, fontSize: '1.1rem', fontWeight: 'bold' }}>
                                            📢 <strong>{activePlayerNickname}</strong>님의 차례입니다
                                        </p>
                                        <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>차례가 올 때까지 기다려 주세요!</span>
                                    </div>
                                )}

                                {/* 중복 방지를 위한 이미 맞춘 단어 목록 */}
                                {gameUsedWords.length > 0 && (
                                    <div style={{ marginTop: '1.2rem', textAlign: 'left', background: '#f8fafc', padding: '10px 12px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                                        <div style={{ fontSize: '0.82rem', fontWeight: 'bold', color: '#64748b', marginBottom: '6px', display: 'flex', justifyContent: 'space-between' }}>
                                            <span>📜 이미 제출된 단어 (중복 제출 불가):</span>
                                            <span style={{ color: '#ef4444' }}>총 {gameUsedWords.length}개</span>
                                        </div>
                                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px', maxHeight: '110px', overflowY: 'auto' }}>
                                            {gameUsedWords.map((w, idx) => (
                                                <span key={idx} style={{ background: '#e2e8f0', color: '#1e293b', padding: '3px 8px', borderRadius: '8px', fontSize: '0.8rem', fontWeight: '500' }}>
                                                    {w}
                                                </span>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                )}

                {/* --- OX RUN PARTICIPANT UI --- */}
                {gameId === 'ox_run' && (
                    <div>
                        <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '20px', padding: '1.5rem', marginBottom: '1.5rem' }}>
                            <h2 style={{ fontSize: '1.5rem', fontFamily: 'Jua, sans-serif', color: 'var(--text)', margin: '0 0 10px 0' }}>
                                {oxQuestion}
                            </h2>
                            {!oxReveal && (
                                <div style={{ color: '#ef4444', fontWeight: 'bold', fontSize: '1.1rem' }}>
                                    남은 시간: {gameTimeLeft}초
                                </div>
                            )}
                        </div>

                        {!oxReveal ? (
                            oxChoice ? (
                                <div style={{ background: '#f1f5f9', padding: '2rem', borderRadius: '20px', fontSize: '1.3rem', fontWeight: 'bold' }}>
                                    선택 완료: <span style={{ color: oxChoice === 'O' ? '#10b981' : '#f43f5e', fontSize: '2rem', marginLeft: '5px' }}>{oxChoice}</span>
                                    <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', margin: '10px 0 0 0', fontWeight: 'normal' }}>정답이 공개될 때까지 기다려 주세요!</p>
                                </div>
                            ) : (
                                <div style={{ display: 'flex', gap: '15px' }}>
                                    <button 
                                        onClick={() => submitOxChoice('O')} 
                                        style={{ 
                                            flex: 1, 
                                            height: '120px', 
                                            borderRadius: '20px', 
                                            background: '#10b981', 
                                            color: 'white', 
                                            fontSize: '5rem', 
                                            border: 'none', 
                                            fontWeight: 'bold',
                                            boxShadow: '0 8px 16px rgba(16,185,129,0.3)',
                                            cursor: 'pointer'
                                        }}
                                    >
                                        O
                                    </button>
                                    <button 
                                        onClick={() => submitOxChoice('X')} 
                                        style={{ 
                                            flex: 1, 
                                            height: '120px', 
                                            borderRadius: '20px', 
                                            background: '#f43f5e', 
                                            color: 'white', 
                                            fontSize: '5rem', 
                                            border: 'none', 
                                            fontWeight: 'bold',
                                            boxShadow: '0 8px 16px rgba(244,63,94,0.3)',
                                            cursor: 'pointer'
                                        }}
                                    >
                                        X
                                    </button>
                                </div>
                            )
                        ) : (
                            <div className="animate-pop-in" style={{ 
                                background: oxChoice === oxAnswer ? '#ecfdf5' : '#fff5f5', 
                                border: `2px solid ${oxChoice === oxAnswer ? '#10b981' : '#f43f5e'}`,
                                borderRadius: '20px', 
                                padding: '2rem' 
                            }}>
                                <h1 style={{ fontSize: '2.5rem', margin: 0 }}>
                                    {oxChoice === oxAnswer ? '🎉 정답입니다!' : '😅 아쉽네요...'}
                                </h1>
                                <p style={{ fontSize: '1.2rem', marginTop: '10px' }}>
                                    내가 낸 답: <strong style={{ color: oxChoice === 'O' ? '#10b981' : '#f43f5e' }}>{oxChoice || '선택 안함'}</strong> <br/>
                                    실제 정답: <strong style={{ color: oxAnswer === 'O' ? '#10b981' : '#f43f5e' }}>{oxAnswer}</strong>
                                </p>
                            </div>
                        )}
                    </div>
                )}

                {/* --- CATCH MIND PARTICIPANT UI --- */}
                {gameId === 'catch_mind' && (
                    <div>
                        {/* Status bar */}
                        <div style={{ background: '#f8fafc', padding: '10px 15px', borderRadius: '15px', border: '1px solid #e2e8f0', marginBottom: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.9rem' }}>
                            <div>🎨 그리는이: <strong>{painterNickname}</strong></div>
                            <div style={{ color: '#ef4444', fontWeight: 'bold' }}>⏱️ {gameTimeLeft}초</div>
                        </div>

                        {/* Secret Word for Painter, Guess Box for Guesser */}
                        {isMePainter ? (
                            <div style={{ background: '#ffe4e6', border: '2px solid #f43f5e', borderRadius: '20px', padding: '1rem', marginBottom: '1.5rem' }}>
                                <span style={{ fontSize: '0.85rem', color: '#f43f5e' }}>나의 제시어</span>
                                <h1 style={{ margin: '5px 0 0 0', fontSize: '2rem', color: '#e11d48', fontWeight: '900', letterSpacing: '2px' }}>{catchMindSecretWord}</h1>
                            </div>
                        ) : catchMindWinner ? (
                            <div className="animate-pop-in" style={{ background: '#ecfdf5', border: '2px solid #10b981', borderRadius: '16px', padding: '1rem', marginBottom: '1.5rem' }}>
                                <h3 style={{ margin: 0, color: '#10b981' }}>🎉 라운드 종료!</h3>
                                <p style={{ margin: '5px 0 0 0', fontWeight: 'bold' }}>정답자: {catchMindWinner}</p>
                            </div>
                        ) : null}

                        {/* Interactive Canvas */}
                        <div style={{ background: 'white', border: '2px solid #cbd5e1', borderRadius: '20px', overflow: 'hidden', display: 'flex', justifyContent: 'center', marginBottom: '1.5rem' }}>
                            <canvas 
                                ref={canvasRef} 
                                width={320} 
                                height={240} 
                                style={{ background: 'white', touchAction: 'none' }}
                                onMouseDown={(e) => handleCanvasPaint(e, 'start')}
                                onMouseMove={(e) => handleCanvasPaint(e, 'draw')}
                                onMouseUp={(e) => handleCanvasPaint(e, 'end')}
                                onMouseLeave={(e) => handleCanvasPaint(e, 'end')}
                                onTouchStart={(e) => handleCanvasPaint(e, 'start')}
                                onTouchMove={(e) => handleCanvasPaint(e, 'draw')}
                                onTouchEnd={(e) => handleCanvasPaint(e, 'end')}
                            />
                        </div>

                        {/* Guess Submission Form for Guesser */}
                        {!isMePainter && !catchMindWinner && (
                            <form onSubmit={submitGuess} style={{ display: 'flex', gap: '10px' }}>
                                <input 
                                    type="text" 
                                    placeholder="정답 단어 입력" 
                                    value={guessInput} 
                                    onChange={(e) => setGuessInput(e.target.value)}
                                    style={{ 
                                        flex: 1, 
                                        padding: '12px', 
                                        borderRadius: '12px', 
                                        border: '2px solid #cbd5e1', 
                                        fontSize: '1rem' 
                                    }}
                                />
                                <button className="primary-btn" type="submit" style={{ padding: '12px 20px', borderRadius: '12px' }}>
                                    전송
                                </button>
                            </form>
                        )}
                    </div>
                )}

                {/* --- LOBBY GAME FALLBACK / MINI GAMES (card_match, memory_game, yutnori, etc.) --- */}
                {!['word_bomb', 'ox_run', 'catch_mind'].includes(gameId) && (
                    <div style={{ marginTop: '1rem' }}>
                        <h2 style={{ fontFamily: 'Jua, sans-serif', color: 'var(--primary)', marginBottom: '1.5rem', fontSize: '1.6rem' }}>
                            {gameId === 'yutnori' && '윷놀이'}
                            {gameId === 'card_match' && '카드 매칭'}
                            {gameId === 'memory_game' && '기억력 게임'}
                            {gameId === 'pass_bomb' && '폭탄 돌리기'}
                            {gameId === 'rock_paper_scissors' && '가위바위보'}
                            {gameId === 'whack_mole' && '두더지 잡기'}
                            {(gameId === 'omok' || gameId === 'samok') && '사목'}
                            {gameId === 'ladder' && '사다리 타기'}
                            {gameId === 'fortune' && '포춘 쿠키'}
                            {(gameId === 'nunchi_game' || gameId === 'spot_difference') && '눈치 게임'}
                            {gameId === 'janggi' && '장기'}
                            {gameId === 'chess' && '체스'}
                            {(gameId === 'card_game' || gameId === 'card_poker') && '카드 게임'}
                            {gameId === 'gostop' && '고스톱'}
                            {gameId === 'othello' && '오셀로'}
                            {gameId === 'minesweeper' && '지뢰찾기'}
                            {gameId === 'stock_game' && '주식 게임'}
                            {gameId === 'speed_numbers' && '숫자 순서'}
                            {gameId === 'tetris' && '미니 테트리스'}
                            {gameId === 'brick_breaker' && '벽돌깨기'}
                            {(gameId === 'timeattack' || gameId === 'airplane_game') && '비행기게임 (Xenon 2)'}
                        </h2>

                        {gameId === 'yutnori' && <YutnoriGame socket={socket} pin={pin} nickname={nickname} groupId={groupId} baseScore={myScore} onScoreUpdate={(s) => setMyScore(s)} />}
                        {gameId === 'card_match' && <CardMatchGame socket={socket} pin={pin} nickname={nickname} groupId={groupId} isHost={false} baseScore={myScore} onScoreUpdate={(newScore) => setMyScore(newScore)} />}
                        {gameId === 'rock_paper_scissors' && <RpsGame socket={socket} pin={pin} nickname={nickname} groupId={groupId} baseScore={myScore} onScoreUpdate={(s) => setMyScore(s)} />}
                        {gameId === 'whack_mole' && <WhackMoleGame socket={socket} pin={pin} nickname={nickname} groupId={groupId} baseScore={myScore} onScoreUpdate={(s) => setMyScore(s)} />}
                        {(gameId === 'omok' || gameId === 'samok') && <SamokGame socket={socket} pin={pin} nickname={nickname} groupId={groupId} baseScore={myScore} onScoreUpdate={(s) => setMyScore(s)} />}
                        {gameId === 'minesweeper' && <MinesweeperGame socket={socket} pin={pin} nickname={nickname} groupId={groupId} baseScore={myScore} onScoreUpdate={(s) => setMyScore(s)} />}
                        {gameId === 'stock_game' && <StockGame socket={socket} pin={pin} isHost={false} groupId={groupId} nickname={nickname} myScore={myScore} />}
                        {gameId === 'speed_numbers' && <SpeedNumbersGame socket={socket} pin={pin} nickname={nickname} groupId={groupId} baseScore={myScore} onScoreUpdate={(s) => setMyScore(s)} />}
                        {gameId === 'janggi' && <JanggiGame socket={socket} pin={pin} nickname={nickname} groupId={groupId} baseScore={myScore} onScoreUpdate={(s) => setMyScore(s)} />}
                        {gameId === 'chess' && <ChessGame socket={socket} pin={pin} nickname={nickname} groupId={groupId} baseScore={myScore} onScoreUpdate={(s) => setMyScore(s)} />}
                        {(gameId === 'card_game' || gameId === 'card_poker') && <PokerGame socket={socket} pin={pin} nickname={nickname} groupId={groupId} baseScore={myScore} onScoreUpdate={(s) => setMyScore(s)} />}
                        {gameId === 'gostop' && <GoStopGame socket={socket} pin={pin} nickname={nickname} groupId={groupId} baseScore={myScore} onScoreUpdate={(s) => setMyScore(s)} />}
                        {gameId === 'othello' && <OthelloGame socket={socket} pin={pin} nickname={nickname} groupId={groupId} baseScore={myScore} onScoreUpdate={(s) => setMyScore(s)} />}
                        {gameId === 'memory_game' && <MemoryGame socket={socket} pin={pin} nickname={nickname} groupId={groupId} baseScore={myScore} onScoreUpdate={(s) => setMyScore(s)} />}
                        {gameId === 'pass_bomb' && <PassBombGame socket={socket} pin={pin} nickname={nickname} groupId={groupId} baseScore={myScore} onScoreUpdate={(s) => setMyScore(s)} />}
                        {gameId === 'spot_difference' && <SpotDifferenceMiniGame socket={socket} pin={pin} nickname={nickname} groupId={groupId} baseScore={myScore} onScoreUpdate={(s) => setMyScore(s)} />}
                        {(gameId === 'nunchi_game' || gameId === 'spot_difference') && <NunchiGame socket={socket} pin={pin} nickname={nickname} myScore={myScore} isHost={false} onScoreUpdate={(s) => setMyScore(s)} />}
                        {gameId === 'fortune' && <FortuneMiniGame socket={socket} pin={pin} nickname={nickname} groupId={groupId} baseScore={myScore} onScoreUpdate={(s) => setMyScore(s)} />}
                        {gameId === 'ladder' && <LadderMiniGame socket={socket} pin={pin} nickname={nickname} groupId={groupId} baseScore={myScore} onScoreUpdate={(s) => setMyScore(s)} />}
                        {gameId === 'tetris' && <TetrisGame socket={socket} pin={pin} nickname={nickname} groupId={groupId} isHost={false} baseScore={myScore} />}
                        {gameId === 'brick_breaker' && <BrickBreakerGame socket={socket} pin={pin} nickname={nickname} groupId={groupId} isHost={false} baseScore={myScore} />}
                        {(gameId === 'timeattack' || gameId === 'airplane_game') && <AirplaneGame socket={socket} pin={pin} nickname={nickname} groupId={groupId} isHost={false} baseScore={myScore} />}
                    </div>
                )}
            </div>
        );
    };

    if (isLoading) {
        return (
            <div className="full-screen-container" style={{ justifyContent: 'center', alignItems: 'center', flexDirection: 'column' }}>
                <div className="spinner" style={{ width: '60px', height: '60px', borderRadius: '50%', border: '6px solid #e2e8f0', borderTopColor: 'var(--primary)', animation: 'spin 1s linear infinite' }} />
                <p style={{ marginTop: '20px', fontSize: '1.2rem', color: 'var(--text-muted)' }}>퀴즈런에 접속 중입니다...</p>
                <p style={{ marginTop: '5px', fontSize: '0.9rem', color: socketConnected ? '#059669' : '#dc2626' }}>
                    상태: {socketConnected ? '서버와 연결되었습니다' : '서버 연결 대기 중...'}
                </p>
                <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
            </div>
        );
    }

    if (gameId === 'stock_game' || (isGame && gameId === 'stock_game') || ((isGame || gameId) && (gameState === 'game_active' || gameState === 'playing'))) {
        if (gameId === 'stock_game') {
            return (
                <div style={{ width: '100%', minHeight: '100vh', background: '#090d16', position: 'relative' }}>
                    {!isLoading && (
                        <div style={{
                            position: 'fixed',
                            top: '10px',
                            right: '10px',
                            padding: '4px 10px',
                            borderRadius: '12px',
                            fontSize: '0.7rem',
                            background: 'rgba(15, 23, 42, 0.8)',
                            border: '1px solid #334155',
                            color: socketConnected ? '#10b981' : '#f43f5e',
                            zIndex: 1000,
                            display: 'flex',
                            alignItems: 'center',
                            gap: '5px'
                        }}>
                            <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: socketConnected ? '#10b981' : '#f43f5e' }} />
                            {socketConnected ? '수신 중' : '연결 끊김'}
                        </div>
                    )}
                    <StockGame socket={socket} pin={pin} isHost={false} groupId={groupId} nickname={nickname} myScore={myScore} />
                </div>
            );
        }
        return (
            <div className="page-container" style={{ position: 'relative', padding: '2rem 1.5rem', minHeight: '100vh', alignItems: 'center' }}>
                {renderUniversalBackButton()}
                {!isLoading && (
                    <div style={{
                        position: 'fixed',
                        top: '10px',
                        right: '10px',
                        padding: '4px 10px',
                        borderRadius: '12px',
                        fontSize: '0.7rem',
                        background: 'rgba(255,255,255,0.8)',
                        border: '1px solid #ddd',
                        color: socketConnected ? '#059669' : '#dc2626',
                        zIndex: 1000,
                        display: 'flex',
                        alignItems: 'center',
                        gap: '5px'
                    }}>
                        <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: socketConnected ? '#059669' : '#dc2626' }} />
                        {socketConnected ? '수신 중' : '연결 끊김'}
                    </div>
                )}
                {renderActiveGame()}
            </div>
        );
    }

    const isQuizPhase = (gameState === 'question' || gameState === 'answered' || gameState === 'leaderboard' || gameState === 'final_leaderboard');
    return (
        <div className="page-container" style={{ position: 'relative', padding: isQuizPhase ? '0' : '2rem 1.5rem', minHeight: '100vh', alignItems: 'center' }}>
            {/* Universal On-Screen Step Back Button */}
            {renderUniversalBackButton()}
            {/* Confetti for correct answer */}
            {showConfetti && <Confetti width={window.innerWidth} height={window.innerHeight} recycle={false} numberOfPieces={300} />}
            <div style={{ width: '100%', minHeight: '100vh', background: isBuzzerMode && groupId ? 'linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%)' : 'var(--bg)' }}>
                {/* Connection status badge & BGM toggle for Participant */}
                {!isLoading && (
                    <div style={{
                        position: 'fixed',
                        top: '10px',
                        right: '10px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        zIndex: 1000
                    }}>
                        {(isQuizPhase || gameState === 'game_active') && gameId !== 'stock_game' && gameId !== 'ladder' && (
                            <button
                                type="button"
                                onClick={toggleBgm}
                                style={{
                                    padding: '4px 9px',
                                    borderRadius: '12px',
                                    fontSize: '0.72rem',
                                    fontWeight: '800',
                                    background: isBgmEnabled ? '#ecfdf5' : 'rgba(255,255,255,0.9)',
                                    border: `1.5px solid ${isBgmEnabled ? '#10b981' : '#cbd5e1'}`,
                                    color: isBgmEnabled ? '#065f46' : '#64748b',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '4px',
                                    cursor: 'pointer',
                                    boxShadow: '0 2px 6px rgba(0,0,0,0.06)'
                                }}
                                title={isBgmEnabled ? "BGM 멈추기 (일시정지)" : "BGM 다시 재생하기"}
                            >
                                <Music size={12} color={isBgmEnabled ? "#059669" : "#64748b"} />
                                <span>{isBgmEnabled ? 'Carefree' : 'BGM 꺼짐'}</span>
                            </button>
                        )}
                        <div style={{
                            padding: '4px 10px',
                            borderRadius: '12px',
                            fontSize: '0.7rem',
                            background: 'rgba(255,255,255,0.8)',
                            border: '1px solid #ddd',
                            color: socketConnected ? '#059669' : '#dc2626',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '5px'
                        }}>
                            <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: socketConnected ? '#059669' : '#dc2626' }} />
                            {socketConnected ? '수신 중' : '연결 끊김'}
                        </div>
                    </div>
                )}
                {gameState === 'join' && (
                    <div className="glass-panel card-container animate-slide-up" style={{ padding: '2.5rem 2rem', width: '100%', position: 'relative' }}>
                        <button
                            onClick={() => navigate(-1)}
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
                                background: 'rgba(255, 255, 255, 0.8)',
                                border: '1px solid #e2e8f0',
                                borderRadius: '8px',
                                fontWeight: 'bold',
                                color: 'var(--primary)',
                                cursor: 'pointer',
                                zIndex: 10
                            }}
                        >
                            <ArrowLeft size={16} /> 이전
                        </button>
                        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '2rem' }}>
                            <img src="/logo.png?v=3" alt="Logo" style={{ height: '60px', objectFit: 'contain' }} />
                        </div>

                        {error && (
                            <div style={{ background: '#fef2f2', color: 'var(--ans-red)', padding: '12px', borderRadius: '12px', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '8px', border: '1px solid #fecaca', fontWeight: '500' }}>
                                <AlertCircle size={20} /> {error}
                            </div>
                        )}

                        {autoReconnecting && (
                            <div style={{
                                background: '#eff6ff',
                                color: '#1e40af',
                                padding: '16px',
                                borderRadius: '16px',
                                marginBottom: '1.5rem',
                                display: 'flex',
                                flexDirection: 'column',
                                alignItems: 'center',
                                gap: '10px',
                                border: '1.5px solid #bfdbfe'
                            }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 'bold', fontSize: '0.95rem' }}>
                                    <span style={{ display: 'inline-block', width: '16px', height: '16px', border: '2px solid #3b82f6', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 1s linear infinite' }}></span>
                                    이전 참가자({nickname})로 자동 재접속 중...
                                </div>
                                <button
                                    type="button"
                                    onClick={() => setAutoReconnecting(false)}
                                    style={{
                                        fontSize: '0.82rem',
                                        color: '#64748b',
                                        background: 'transparent',
                                        border: 'none',
                                        textDecoration: 'underline',
                                        cursor: 'pointer'
                                    }}
                                >
                                    직접 입력하기
                                </button>
                            </div>
                        )}

                        <form onSubmit={handleJoin} style={{ display: 'flex', flexDirection: 'column', gap: '1.2rem' }}>
                            <div style={{ position: 'relative' }}>
                                <KeyRound size={22} style={{ position: 'absolute', top: '16px', left: '16px', color: '#94a3b8' }} />
                                <input
                                    type="text"
                                    placeholder="PIN 번호 입력"
                                    className="glass-input"
                                    style={{ paddingLeft: '48px', textTransform: 'uppercase', letterSpacing: '2px', fontSize: '1.3rem' }}
                                    value={pin}
                                    onChange={e => setPin(e.target.value)}
                                    maxLength={6}
                                    required
                                />
                            </div>

                            <div style={{ position: 'relative' }}>
                                <User size={22} style={{ position: 'absolute', top: '16px', left: '16px', color: '#94a3b8' }} />
                                <input
                                    type="text"
                                    placeholder="사용할 닉네임"
                                    className="glass-input"
                                    style={{ paddingLeft: '48px', fontSize: '1.3rem' }}
                                    value={nickname}
                                    onChange={e => setNickname(e.target.value)}
                                    maxLength={15}
                                    required
                                />
                            </div>

                            <button type="submit" className="glass-button" style={{ marginTop: '1rem', width: '100%', padding: '1.2rem', fontSize: '1.3rem' }} disabled={!pin || !nickname}>
                                {localStorage.getItem('quizrun_nickname') && nickname === localStorage.getItem('quizrun_nickname') ? '입장하기 (게임 이어하기)' : '입장하기'}
                            </button>
                        </form>
                    </div>
                )}

                {gameState === 'select_join_type' && (
                    <div className="glass-panel card-container" style={{ padding: '2rem', width: '100%', maxWidth: '500px' }}>
                        <h2 style={{ marginBottom: '1.5rem', color: 'var(--primary)' }}>참가 방식을 선택해주세요</h2>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                            <button
                                className="glass-button"
                                onClick={() => selectJoinType('group')}
                                style={{ padding: '20px', fontSize: '1.3rem', background: 'var(--secondary)', color: 'white' }}
                            >
                                조별 참가 (1~12조)
                            </button>
                            <button
                                className="glass-button"
                                onClick={() => selectJoinType('individual')}
                                style={{ padding: '20px', fontSize: '1.3rem' }}
                            >
                                개별 참가
                            </button>
                        </div>
                    </div>
                )}

                {gameState === 'select_group' && (
                    <div className="glass-panel card-container animate-slide-up" style={{ padding: '2rem', width: '100%', maxWidth: '500px' }}>
                        <h2 style={{ marginBottom: '1.5rem', color: 'var(--primary)' }}>조를 선택해주세요!</h2>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px' }}>
                            {Array.from({ length: 12 }, (_, i) => i + 1).map(id => (
                                <button
                                    key={id}
                                    className="glass-button"
                                    onClick={() => selectGroup(id)}
                                    style={{ padding: '15px', fontSize: '1.2rem', fontWeight: 'bold' }}
                                >
                                    {id}조
                                </button>
                            ))}
                        </div>
                    </div>
                )}

                {(gameState === 'waiting' || gameState === 'lobby') && (
                    <div className="glass-panel card-container animate-slide-up" style={{ background: 'var(--primary)', color: 'white' }}>
                        <h2 style={{ fontSize: '2.5rem', marginBottom: '1rem', color: 'white' }}>준비 완료!</h2>
                        <p style={{ fontSize: '1.2rem', opacity: 0.9 }}>{groupId ? `${groupId}조원들과 함께 방장 화면을 봐주세요!` : '방장 화면에 닉네임이 떴는지 확인해주세요.'}</p>
                        <div style={{
                            marginTop: '2.5rem',
                            display: 'inline-block',
                            padding: '12px 24px',
                            background: 'rgba(255,255,255,0.2)',
                            borderRadius: '16px',
                            fontSize: '1.5rem',
                            fontWeight: '800'
                        }}>
                            {groupId ? `${groupId}조: ` : ''}{nickname}
                        </div>
                    </div>
                )}

                {gameState === 'question' && (() => {
                    if (isSpotDiff || currentMediaUrl2 || currentQuestion?.includes('다른 곳') || currentQuestion?.includes('틀린 곳')) {
                        return (
                            <SpotDifferenceQuiz
                                isHost={false}
                                mediaUrl={currentMediaUrl}
                                mediaUrl2={currentMediaUrl2}
                                diffSpots={currentDiffSpots}
                                timeLimit={currentTimeLimit || 60}
                                questionText={currentQuestion}
                                socket={socket}
                                pin={pin}
                                nickname={nickname}
                                onScoreAdjust={(amt) => setMyScore(prev => prev + amt)}
                            />
                        );
                    }
                    const isOX = quizType === 'ox' || (currentOptions && currentOptions.length === 2);
                    const isShort = quizType === 'short' || (!isBuzzerMode && (!currentOptions || currentOptions.length === 0 || currentOptions.every(o => !o || o.trim() === '')));
                    const isMCQ = !isBuzzerMode && !isOX && !isShort;

                    return (
                        <div 
                            className="animate-slide-up" 
                            style={{ 
                                width: '100%', 
                                maxWidth: '480px', 
                                margin: '0 auto', 
                                padding: '14px 14px 22px 14px',
                                minHeight: '100vh',
                                boxSizing: 'border-box',
                                display: 'flex',
                                flexDirection: 'column',
                                justifyContent: 'space-between',
                                gap: '14px'
                            }}
                        >
                            {/* TOP SECTION: Header + Question Box + Media + Hint */}
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', width: '100%' }}>
                                {/* 1. Header Bar: Question Counter & Points Badge */}
                                <div style={{
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    alignItems: 'center',
                                    padding: '2px 4px'
                                }}>
                                    <div style={{
                                        fontSize: '0.88rem',
                                        fontWeight: '800',
                                        color: 'var(--primary)',
                                        background: '#eff6ff',
                                        border: '1.5px solid #bfdbfe',
                                        padding: '5px 12px',
                                        borderRadius: '16px'
                                    }}>
                                        {totalQuestions > 0 ? `문제 ${currentQuestionIndex + 1} / ${totalQuestions}` : '퀴즈 진행 중'}
                                    </div>

                                    <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                                        {groupId && (
                                            <span style={{
                                                fontSize: '0.85rem',
                                                fontWeight: '800',
                                                color: 'var(--secondary)',
                                                background: '#fdf4ff',
                                                border: '1.5px solid #f5d0fe',
                                                padding: '5px 10px',
                                                borderRadius: '16px'
                                            }}>
                                                {groupId}조
                                            </span>
                                        )}
                                        <span style={{
                                            fontSize: '0.88rem',
                                            fontWeight: '800',
                                            color: '#b45309',
                                            background: '#fef3c7',
                                            border: '1.5px solid #fde68a',
                                            padding: '5px 12px',
                                            borderRadius: '16px'
                                        }}>
                                            💰 {currentPoints}점
                                        </span>
                                    </div>
                                </div>

                                {/* 2. Question Text Card */}
                                <div style={{
                                    background: 'white',
                                    borderRadius: '20px',
                                    padding: '16px 18px',
                                    boxShadow: '0 4px 18px rgba(0, 0, 0, 0.06)',
                                    border: '1px solid rgba(0, 0, 0, 0.05)',
                                    textAlign: 'center',
                                    width: '100%',
                                    boxSizing: 'border-box'
                                }}>
                                    <h2 style={{
                                        fontSize: (currentQuestion && currentQuestion.length > 40) ? '1.18rem' : '1.38rem',
                                        fontWeight: '800',
                                        color: '#1e293b',
                                        lineHeight: '1.42',
                                        margin: 0,
                                        wordBreak: 'keep-all',
                                        letterSpacing: '-0.3px'
                                    }}>
                                        {currentQuestion || '문제를 확인해주세요'}
                                    </h2>

                                    {/* Media Viewer if present */}
                                    {currentMediaUrl && (
                                        <div style={{ marginTop: '10px', maxHeight: '160px', overflow: 'hidden', display: 'flex', justifyContent: 'center' }}>
                                            <MediaViewer 
                                                key={`${currentQuestionIndex}_${currentMediaUrl}`} 
                                                mediaUrl={currentMediaUrl} 
                                                mediaType={currentMediaType} 
                                                mediaName={currentMediaName} 
                                                displayMode={currentMediaDisplayMode} 
                                                autoplay={currentAutoplay} 
                                            />
                                        </div>
                                    )}

                                    {/* Chosung Hint for Short Answer */}
                                    {isShort && showChosung !== false && lastCorrectAnswer && (
                                        <div style={{
                                            marginTop: '10px',
                                            display: 'inline-flex',
                                            alignItems: 'center',
                                            gap: '8px',
                                            padding: '6px 16px',
                                            background: 'linear-gradient(135deg, #fef3c7 0%, #fde68a 100%)',
                                            border: '2px solid #f59e0b',
                                            borderRadius: '14px',
                                            boxShadow: '0 3px 8px rgba(245, 158, 11, 0.15)'
                                        }}>
                                            <span style={{ fontSize: '0.85rem', fontWeight: '800', color: '#92400e' }}>💡 초성 힌트:</span>
                                            <span style={{ fontSize: '1.4rem', fontWeight: '900', color: '#b45309', letterSpacing: '4px' }}>
                                                {getChosung(lastCorrectAnswer)}
                                            </span>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* BOTTOM SECTION: Answer Interaction Controls */}
                            <div style={{ width: '100%', marginTop: 'auto' }}>
                                {isBuzzerMode ? (
                                    /* BUZZER MODE */
                                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '14px', width: '100%' }}>
                                        {buzzerJudgeResult ? (
                                            <div className="animate-pop-in" style={{
                                                padding: '1.2rem', borderRadius: '20px', textAlign: 'center', width: '100%',
                                                background: buzzerJudgeResult === 'correct' ? 'var(--ans-green)' : 'var(--ans-red)',
                                                color: 'white', boxShadow: `0 10px 30px ${buzzerJudgeResult === 'correct' ? 'rgba(16,185,129,0.4)' : 'rgba(239,68,68,0.4)'}`
                                            }}>
                                                <div style={{ fontSize: '2.5rem', marginBottom: '4px' }}>
                                                    {buzzerJudgeResult === 'correct' ? '🎊' : '😢'}
                                                </div>
                                                <h2 style={{ fontSize: '1.8rem', fontWeight: '900', color: 'white', margin: 0 }}>
                                                    {buzzerJudgeResult === 'correct' ? '정답!' : '오답!'}
                                                </h2>
                                                <div style={{ marginTop: '8px', background: 'rgba(255,255,255,0.2)', padding: '4px 14px', borderRadius: '16px', fontSize: '1.1rem', fontWeight: '800' }}>
                                                    {buzzerJudgeResult === 'correct' ? '점수 획득! 🏆' : '-10 점 😢'}
                                                </div>
                                            </div>
                                        ) : buzzedInfo ? (
                                            <div className="animate-pop-in" style={{ textAlign: 'center', width: '100%' }}>
                                                <div style={{
                                                    padding: '1.2rem',
                                                    background: buzzedInfo.groupId === groupId || buzzedInfo.participantId === socket.id ? 'var(--secondary)' : '#94a3b8',
                                                    color: 'white',
                                                    borderRadius: '20px',
                                                    fontSize: '1.8rem',
                                                    fontWeight: '900',
                                                    boxShadow: buzzedInfo.groupId === groupId || buzzedInfo.participantId === socket.id ? '0 8px 25px rgba(245, 158, 11, 0.4)' : 'none'
                                                }}>
                                                    정답 도전 중!
                                                </div>
                                                <p style={{ marginTop: '8px', color: 'var(--text-muted)', fontSize: '1rem', fontWeight: '700' }}>
                                                    ({buzzedInfo.groupId ? `${buzzedInfo.groupId}조: ` : ''}{buzzedInfo.nickname}님)
                                                </p>
                                            </div>
                                        ) : (
                                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                                                <button
                                                    className="buzzer-button animate-pulse-slow"
                                                    onClick={handleBuzzerPress}
                                                    style={{
                                                        width: '180px',
                                                        height: '180px',
                                                        borderRadius: '50%',
                                                        background: 'radial-gradient(circle, #ef4444 0%, #b91c1c 100%)',
                                                        border: '8px solid #991b1b',
                                                        boxShadow: '0 12px 0 #7f1d1d, 0 16px 35px rgba(239, 68, 68, 0.4)',
                                                        color: 'white',
                                                        fontSize: '2.2rem',
                                                        fontWeight: '900',
                                                        cursor: 'pointer',
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        justifyContent: 'center',
                                                        transition: 'all 0.1s',
                                                        textShadow: '0 4px 10px rgba(0,0,0,0.3)',
                                                        userSelect: 'none'
                                                    }}
                                                >
                                                    BUZZER
                                                </button>
                                            </div>
                                        )}
                                        <div style={{ fontSize: '1.05rem', fontWeight: '800', color: 'var(--primary)', padding: '6px 16px', background: 'white', borderRadius: '12px', border: '1px solid #bfdbfe' }}>
                                            {groupId ? `${groupId}조` : '개별 참가'}
                                        </div>
                                    </div>
                                ) : isOX ? (
                                    /* OX MODE: 2 Big O / X Buttons side-by-side */
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', width: '100%' }}>
                                        {/* O Button */}
                                        <button
                                            type="button"
                                            onClick={() => submitAnswer(0)}
                                            className="answer-ox-btn"
                                            style={{
                                                background: '#22c55e',
                                                color: 'white',
                                                border: '3.5px solid #16a34a',
                                                borderRadius: '20px',
                                                padding: '18px 10px',
                                                minHeight: '110px',
                                                display: 'flex',
                                                flexDirection: 'column',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                gap: '6px',
                                                boxShadow: '0 8px 0 #15803d, 0 12px 20px rgba(34, 197, 94, 0.3)',
                                                cursor: 'pointer',
                                                transition: 'transform 0.1s, box-shadow 0.1s',
                                                userSelect: 'none'
                                            }}
                                        >
                                            {(() => {
                                                const text = currentOptions?.[0] || 'O';
                                                const len = text.length;
                                                const fs = len <= 2 ? '3.6rem' : len <= 6 ? '2.2rem' : '1.5rem';
                                                return (
                                                    <span style={{ fontSize: fs, fontWeight: '900', lineHeight: 1.1, wordBreak: 'break-word', textAlign: 'center' }}>
                                                        {text}
                                                    </span>
                                                );
                                            })()}
                                        </button>

                                        {/* Choice 2 Button */}
                                        <button
                                            type="button"
                                            onClick={() => submitAnswer(1)}
                                            className="answer-ox-btn"
                                            style={{
                                                background: '#ef4444',
                                                color: 'white',
                                                border: '3.5px solid #dc2626',
                                                borderRadius: '20px',
                                                padding: '18px 10px',
                                                minHeight: '110px',
                                                display: 'flex',
                                                flexDirection: 'column',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                gap: '6px',
                                                boxShadow: '0 8px 0 #b91c1c, 0 12px 20px rgba(239, 68, 68, 0.3)',
                                                cursor: 'pointer',
                                                transition: 'transform 0.1s, box-shadow 0.1s',
                                                userSelect: 'none'
                                            }}
                                        >
                                            {(() => {
                                                const text = currentOptions?.[1] || 'X';
                                                const len = text.length;
                                                const fs = len <= 2 ? '3.6rem' : len <= 6 ? '2.2rem' : '1.5rem';
                                                return (
                                                    <span style={{ fontSize: fs, fontWeight: '900', lineHeight: 1.1, wordBreak: 'break-word', textAlign: 'center' }}>
                                                        {text}
                                                    </span>
                                                );
                                            })()}
                                        </button>
                                    </div>
                                ) : isShort ? (
                                    /* SHORT ANSWER MODE */
                                    <div style={{
                                        width: '100%',
                                        display: 'flex',
                                        flexDirection: 'column',
                                        gap: '10px',
                                        background: 'white',
                                        borderRadius: '20px',
                                        padding: '16px 14px',
                                        boxShadow: '0 4px 18px rgba(0,0,0,0.06)',
                                        border: '1px solid rgba(0,0,0,0.05)',
                                        boxSizing: 'border-box'
                                    }}>
                                        <input 
                                            type="text" 
                                            className="glass-input" 
                                            placeholder="이곳에 정답 입력" 
                                            style={{ 
                                                fontSize: '1.25rem', 
                                                padding: '12px 14px',
                                                textAlign: 'center',
                                                fontWeight: '700',
                                                borderRadius: '14px',
                                                border: '2px solid #e2e8f0',
                                                width: '100%',
                                                boxSizing: 'border-box'
                                            }}
                                            onKeyDown={(e) => {
                                                if (e.key === 'Enter' && e.target.value.trim()) {
                                                    submitAnswer(e.target.value.trim());
                                                }
                                            }}
                                            id="short-answer-input"
                                            autoFocus
                                        />
                                        <button 
                                            type="button"
                                            className="glass-button" 
                                            style={{ 
                                                padding: '12px', 
                                                fontSize: '1.15rem',
                                                fontWeight: '800',
                                                borderRadius: '14px',
                                                width: '100%',
                                                background: 'linear-gradient(135deg, var(--primary) 0%, var(--primary-hover) 100%)',
                                                boxShadow: '0 4px 14px rgba(14, 165, 233, 0.4)'
                                            }}
                                            onClick={() => {
                                                const el = document.getElementById('short-answer-input');
                                                const val = el ? el.value.trim() : '';
                                                if (val) submitAnswer(val);
                                            }}
                                        >
                                            정답 제출하기 🚀
                                        </button>
                                    </div>
                                ) : (
                                    /* MCQ MODE: ①, ②, ③, ④ with full option text */
                                    <div style={{
                                        display: 'grid',
                                        gridTemplateColumns: '1fr 1fr',
                                        gap: '10px',
                                        width: '100%'
                                    }}>
                                        {currentOptions.map((opt, i) => {
                                            const colors = ['#ef4444', '#3b82f6', '#22c55e', '#f59e0b'];
                                            const borderColors = ['#dc2626', '#2563eb', '#16a34a', '#d97706'];
                                            const shadowColors = ['#b91c1c', '#1d4ed8', '#15803d', '#b45309'];
                                            const bg = colors[i % colors.length];
                                            const border = borderColors[i % borderColors.length];
                                            const shadow = shadowColors[i % shadowColors.length];
                                            const num = ['①', '②', '③', '④', '⑤'][i] || `${i + 1}.`;

                                            return (
                                                <button
                                                    key={i}
                                                    type="button"
                                                    onClick={() => submitAnswer(i)}
                                                    className="answer-mcq-btn"
                                                    style={{
                                                        background: bg,
                                                        color: 'white',
                                                        border: `2.5px solid ${border}`,
                                                        borderRadius: '16px',
                                                        padding: '12px 8px',
                                                        minHeight: '62px',
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        justifyContent: 'center',
                                                        gap: '6px',
                                                        boxShadow: `0 4px 0 ${shadow}, 0 6px 14px rgba(0,0,0,0.12)`,
                                                        cursor: 'pointer',
                                                        fontSize: opt && opt.length > 25 ? '0.92rem' : '1.05rem',
                                                        fontWeight: '700',
                                                        wordBreak: 'keep-all',
                                                        lineHeight: '1.3',
                                                        textAlign: 'center',
                                                        transition: 'transform 0.1s, box-shadow 0.1s',
                                                        userSelect: 'none'
                                                    }}
                                                >
                                                    <span style={{ fontSize: '1.15rem', opacity: 0.9, flexShrink: 0 }}>{num}</span>
                                                    <span style={{ flex: 1 }}>{opt}</span>
                                                </button>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>
                        </div>
                    );
                })()}

                {gameState === 'answered' && (
                    <div 
                        className="animate-slide-up" 
                        style={{ 
                            width: '100%', 
                            maxWidth: '480px', 
                            margin: '0 auto', 
                            padding: '16px 14px 24px 14px',
                            minHeight: '100vh',
                            boxSizing: 'border-box',
                            display: 'flex',
                            flexDirection: 'column',
                            justifyContent: 'center',
                            alignItems: 'center'
                        }}
                    >
                        <div className="glass-panel card-container" style={{ padding: '2rem 1.5rem', width: '100%', background: 'white', color: 'var(--text)' }}>
                            {totalQuestions > 0 && (
                                <div style={{ fontSize: '0.88rem', color: 'var(--text-muted)', marginBottom: '8px', fontWeight: 'bold' }}>
                                    문제 {currentQuestionIndex + 1} / {totalQuestions}
                                </div>
                            )}
                            {currentQuestion && (
                                <h3 style={{ fontSize: '1.25rem', fontWeight: '800', marginBottom: '1.5rem', wordBreak: 'keep-all', color: '#1e293b' }}>
                                    {currentQuestion}
                                </h3>
                            )}
                            <div style={{ background: '#f0fdf4', border: '2px solid #86efac', borderRadius: '16px', padding: '1.2rem', marginBottom: '1.5rem' }}>
                                <div style={{ fontSize: '1.5rem', fontWeight: '900', color: '#16a34a', marginBottom: '6px' }}>
                                    제출 완료! ✓
                                </div>
                                {myLastAnswer !== null && (
                                    <div style={{ fontSize: '1.1rem', color: '#15803d', fontWeight: '700' }}>
                                        내 답안: {quizType === 'short' ? myLastAnswer : (currentOptions[myLastAnswer] || `${myLastAnswer + 1}번`)}
                                    </div>
                                )}
                            </div>
                            <p style={{ fontSize: '1rem', color: '#64748b', margin: 0 }}>방장 화면의 결과를 기다려주세요...</p>
                            <div className="spinner" style={{ margin: '1.5rem auto 0 auto', width: '40px', height: '40px', borderRadius: '50%', border: '4px solid #e2e8f0', borderTopColor: 'var(--primary)', animation: 'spin 1s linear infinite' }} />
                        </div>
                    </div>
                )}

                {(gameState === 'leaderboard' || gameState === 'final_leaderboard') && (
                    <div 
                        className="animate-slide-up" 
                        style={{ 
                            width: '100%', 
                            maxWidth: '480px', 
                            margin: '0 auto', 
                            padding: '16px 14px 24px 14px',
                            minHeight: '100vh',
                            boxSizing: 'border-box',
                            display: 'flex',
                            flexDirection: 'column',
                            justifyContent: 'center',
                            alignItems: 'center'
                        }}
                    >
                        <div 
                            className={`glass-panel card-container ${myStatus === 'correct' ? 'correct-bg' : 'incorrect-bg'}`} 
                            style={{ 
                                padding: '2rem 1.5rem', 
                                width: '100%', 
                                transition: 'background-color 0.5s',
                                borderRadius: '24px'
                            }}
                        >
                            {/* Question info */}
                            {totalQuestions > 0 && (
                                <div style={{ fontSize: '0.88rem', color: 'rgba(255,255,255,0.85)', marginBottom: '6px', fontWeight: 'bold' }}>
                                    문제 {currentQuestionIndex + 1} / {totalQuestions}
                                </div>
                            )}
                            {currentQuestion && (
                                <div style={{
                                    fontSize: '1.1rem',
                                    fontWeight: '800',
                                    color: 'white',
                                    marginBottom: '1.2rem',
                                    wordBreak: 'keep-all',
                                    lineHeight: '1.4'
                                }}>
                                    {currentQuestion}
                                </div>
                            )}

                            {myStatus === 'correct' ? (
                                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', color: 'white' }}>
                                    <CheckCircle size={64} style={{ marginBottom: '0.6rem' }} />
                                    <h2 style={{ fontSize: '2.2rem', color: 'white', margin: 0, fontWeight: '900' }}>정답입니다! 🎉</h2>
                                    <div style={{ background: 'rgba(0,0,0,0.15)', padding: '8px 18px', borderRadius: '20px', marginTop: '0.8rem', fontSize: '1.1rem', fontWeight: 'bold' }}>
                                        +{currentPoints} 점 획득
                                    </div>
                                </div>
                            ) : (
                                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', color: 'white' }}>
                                    <XCircle size={64} style={{ marginBottom: '0.6rem' }} />
                                    <h2 style={{ fontSize: '2.2rem', color: 'white', margin: 0, fontWeight: '900' }}>아쉬워요! 😢</h2>
                                    <p style={{ marginTop: '0.8rem', fontSize: '1.1rem', opacity: 0.95, margin: '8px 0 0 0' }}>
                                        정답: <strong>{quizType === 'short' ? lastCorrectAnswer : (currentOptions?.[lastCorrectIndex] ?? lastCorrectAnswer)}</strong>
                                    </p>
                                </div>
                            )}

                            {/* 정답인 이유 (해설) 박스 */}
                            {((quizType === 'short' ? lastCorrectAnswer : (currentOptions?.[lastCorrectIndex] ?? lastCorrectAnswer)) || lastExplanation) && (
                                <div style={{
                                    width: '100%',
                                    background: 'rgba(0, 0, 0, 0.15)',
                                    padding: '1rem',
                                    borderRadius: '16px',
                                    marginTop: '1.2rem',
                                    textAlign: 'left',
                                    color: 'white',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    gap: '6px',
                                    boxSizing: 'border-box'
                                }}>
                                    <div style={{ fontWeight: 'bold', fontSize: '1.05rem' }}>
                                        🎯 정답: {quizType === 'short' ? lastCorrectAnswer : (currentOptions?.[lastCorrectIndex] ?? lastCorrectAnswer)}
                                    </div>
                                    {lastExplanation && (
                                        <div style={{
                                            fontSize: '0.92rem',
                                            opacity: 0.95,
                                            borderTop: '1px dashed rgba(255, 255, 255, 0.3)',
                                            paddingTop: '6px',
                                            wordBreak: 'break-all',
                                            whiteSpace: 'pre-wrap'
                                        }}>
                                            💡 {lastExplanation}
                                        </div>
                                    )}
                                </div>
                            )}

                            <div style={{ background: 'white', color: 'var(--text)', padding: '1.2rem', borderRadius: '18px', marginTop: '1.5rem', boxShadow: '0 4px 15px rgba(0,0,0,0.1)' }}>
                                <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: '0.9rem', fontWeight: 'bold' }}>내 현재 점수</p>
                                <div style={{ fontSize: '2.5rem', fontWeight: '900', color: 'var(--primary)', lineHeight: 1.1, marginTop: '4px' }}>
                                    {myScore}
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                <style>{`
                @keyframes spin { 
                    from { transform: rotate(0deg); } 
                    to { transform: rotate(360deg); } 
                }
                .correct-bg { background-color: var(--ans-green) !important; border-color: var(--ans-green) !important; }
                .incorrect-bg { background-color: var(--ans-red) !important; border-color: var(--ans-red) !important; }
                
                .buzzer-buttonpulsat:active {
                    transform: translateY(10px);
                    box-shadow: 0 10px 0 #7f1d1d, 0 15px 30px rgba(239, 68, 68, 0.4);
                }
                .buzzer-button:active {
                    transform: translateY(8px);
                    box-shadow: 0 6px 0 #7f1d1d, 0 10px 20px rgba(239, 68, 68, 0.4);
                }
                .animate-pop-in {
                    animation: popIn 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275);
                }
                @keyframes popIn {
                    0% { transform: scale(0.5); opacity: 0; }
                    100% { transform: scale(1); opacity: 1; }
                }
                .answer-mcq-btn:active {
                    transform: translateY(4px) scale(0.98);
                    box-shadow: 0 1px 0 rgba(0,0,0,0.2) !important;
                }
            `}</style>
            {!['join', 'select_join_type', 'select_group', 'waiting', 'lobby', 'question', 'answered', 'leaderboard', 'final_leaderboard'].includes(gameState) && (
                <div className="glass-panel card-container animate-slide-up" style={{ padding: '2.5rem 2rem', width: '100%', maxWidth: '500px', margin: '2rem auto', textAlign: 'center' }}>
                    <div className="spinner" style={{ width: '50px', height: '50px', borderRadius: '50%', border: '5px solid #e2e8f0', borderTopColor: 'var(--primary)', animation: 'spin 1s linear infinite', margin: '0 auto 1.5rem auto' }} />
                    <h2 style={{ fontSize: '1.8rem', color: 'var(--primary)', marginBottom: '0.8rem', fontWeight: '800' }}>퀴즈/게임 대기 중</h2>
                    <p style={{ fontSize: '1.05rem', color: 'var(--text-muted)', margin: 0 }}>
                        {nickname ? `안녕하세요, ${nickname}님! ` : ''}방장의 진행을 기다리는 중입니다...
                    </p>
                </div>
            )}
            </div>
        </div>
    );
}

// ==========================================
// SUB-COMPONENTS FOR MINI GAMES (PARTICIPANT)
// ==========================================

export function emitLiveGameStream({
    socket,
    pin,
    gameId,
    nickname,
    groupId = null,
    baseScore = 0,
    roundScore = 0,
    isAlive = true,
    isFinished = false,
    gameData = {},
    updateRoomScore = true,
    onScoreUpdate
}) {
    const totalScore = (baseScore || 0) + (roundScore || 0);
    if (onScoreUpdate) {
        onScoreUpdate(totalScore);
    }
    if (!socket || !pin || !nickname) return;
    socket.emit('room:message', {
        pin,
        event: 'game:player_stream',
        payload: {
            gameId,
            nickname,
            groupId,
            score: totalScore,
            roundScore: roundScore || 0,
            isAlive: isAlive !== false,
            isFinished: !!isFinished,
            gameData
        }
    });
    if (updateRoomScore) {
        socket.emit('participant:updateScore', { pin, score: totalScore });
    }
}

export function YutnoriGame({ socket, pin, nickname, groupId, baseScore = 0, onScoreUpdate }) {
    const [result, setResult] = useState(null);
    const [yuts, setYuts] = useState([0, 0, 0, 0]); // 0 = flat, 1 = round
    const [history, setHistory] = useState([]);
    const [isRolling, setIsRolling] = useState(false);
    const [roundScore, setRoundScore] = useState(0);
    const initialBaseRef = useRef(baseScore);

    useEffect(() => {
        emitLiveGameStream({
            socket, pin, gameId: 'yutnori', nickname, groupId,
            baseScore: initialBaseRef.current, roundScore: 0,
            isAlive: true, isFinished: false, updateRoomScore: false,
            gameData: { statusText: '🎲 윷 던지기 대기 중', progressPct: 5, yuts: [0, 0, 0, 0], history: [] }
        });
    }, []);
    
    const throwYut = () => {
        setIsRolling(true);
        let rollCount = 0;
        const interval = setInterval(() => {
            setYuts([Math.round(Math.random()), Math.round(Math.random()), Math.round(Math.random()), Math.round(Math.random())]);
            rollCount++;
            if (rollCount > 6) {
                clearInterval(interval);
                const finalYuts = [Math.round(Math.random()), Math.round(Math.random()), Math.round(Math.random()), Math.round(Math.random())];
                setYuts(finalYuts);
                
                const flats = finalYuts.filter(y => y === 1).length;
                let res = '';
                let pts = 10;
                if (flats === 1) {
                    const isBack = Math.random() < 0.25;
                    res = isBack ? '뒷도(빽도)' : '도';
                    pts = isBack ? 5 : 10;
                } else if (flats === 2) {
                    res = '개';
                    pts = 20;
                } else if (flats === 3) {
                    res = '걸';
                    pts = 30;
                } else if (flats === 4) {
                    res = '윷';
                    pts = 40;
                } else if (flats === 0) {
                    res = '모';
                    pts = 50;
                }
                
                const nextRoundScore = roundScore + pts;
                const nextHistory = [res, ...history].slice(0, 10);
                setResult(res);
                setRoundScore(nextRoundScore);
                setHistory(nextHistory);
                setIsRolling(false);

                emitLiveGameStream({
                    socket, pin, gameId: 'yutnori', nickname, groupId,
                    baseScore: initialBaseRef.current, roundScore: nextRoundScore,
                    isAlive: true, isFinished: false, onScoreUpdate,
                    gameData: {
                        statusText: `🎲 윷 결과: ${res} (+${pts}점, 총 ${nextHistory.length}회)`,
                        progressPct: Math.min(100, nextHistory.length * 10),
                        lastYut: res,
                        yuts: finalYuts,
                        history: nextHistory
                    }
                });
            }
        }, 80);
    };
    
    return (
        <div style={{ padding: '0.5rem' }}>
            <div style={{ display: 'flex', justifyContent: 'center', gap: '15px', marginBottom: '1.5rem' }}>
                {yuts.map((y, idx) => (
                    <div key={idx} style={{ 
                        width: '24px', 
                        height: '110px', 
                        background: y === 1 ? '#d97706' : '#78350f',
                        borderRadius: '12px',
                        border: '3px solid #451a03',
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'space-around',
                        alignItems: 'center',
                        color: 'white',
                        fontWeight: 'bold',
                        fontSize: '0.8rem',
                        boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
                        transform: isRolling ? `rotate(${Math.random() * 30 - 15}deg) scale(1.05)` : 'none',
                        transition: 'all 0.1s'
                    }}>
                        {y === 1 ? (
                            <>
                                <span>✕</span>
                                <span>✕</span>
                                <span>✕</span>
                            </>
                        ) : (
                            <div style={{ width: '8px', height: '90px', background: '#3b2314', borderRadius: '4px' }} />
                        )}
                    </div>
                ))}
            </div>
            
            <button 
                onClick={throwYut} 
                disabled={isRolling}
                className="primary-btn"
                style={{ width: '100%', padding: '12px', borderRadius: '12px', fontSize: '1.2rem', background: '#d97706', color: 'white', border: 'none', fontWeight: 'bold', cursor: 'pointer', boxShadow: '0 4px 6px rgba(217,119,6,0.2)' }}
            >
                {isRolling ? '던지는 중...' : '윷 던지기! 🎲'}
            </button>
            
            {result && (
                <div style={{ marginTop: '1.5rem', background: '#fef3c7', border: '2px solid #f59e0b', borderRadius: '16px', padding: '1rem' }}>
                    <span style={{ fontSize: '0.9rem', color: '#b45309' }}>결과 (획득 점수: +{roundScore}점)</span>
                    <h1 style={{ margin: '5px 0 0 0', color: '#92400e', fontSize: '2.5rem', fontWeight: '950' }}>{result}</h1>
                </div>
            )}
            
            {history.length > 0 && (
                <div style={{ marginTop: '1.5rem', textAlign: 'left' }}>
                    <h4 style={{ margin: '0 0 5px 0', color: 'var(--text-muted)' }}>최근 기록</h4>
                    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                        {history.map((h, i) => (
                            <span key={i} style={{ background: '#f1f5f9', padding: '4px 10px', borderRadius: '8px', fontSize: '0.85rem', border: '1px solid #cbd5e1', fontWeight: 'bold' }}>{h}</span>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}

// CardMatchGame is imported from ../components/CardMatchGame

export function RpsGame({ socket, pin, nickname, groupId, baseScore = 0, onScoreUpdate }) {
    const [choice, setChoice] = useState(null);
    const [aiChoice, setAiChoice] = useState(null);
    const [battleText, setBattleText] = useState('');
    const [wins, setWins] = useState(0);
    const [rounds, setRounds] = useState(0);
    const [roundScore, setRoundScore] = useState(0);
    const initialBaseRef = useRef(baseScore);
    
    const options = [
        { id: 'rock', label: '✊ 주먹', emoji: '✊' },
        { id: 'scissors', label: '✌️ 가위', emoji: '✌️' },
        { id: 'paper', label: '🖐️ 보', emoji: '🖐️' }
    ];

    useEffect(() => {
        emitLiveGameStream({
            socket, pin, gameId: 'rock_paper_scissors', nickname, groupId,
            baseScore: initialBaseRef.current, roundScore: 0,
            isAlive: true, isFinished: false, updateRoomScore: false,
            gameData: { statusText: '✊✌️🖐️ 선택 대기 중', progressPct: 5, wins: 0, rounds: 0 }
        });
    }, []);

    const handlePick = (opt) => {
        setChoice(opt.id);
        const ai = options[Math.floor(Math.random() * options.length)];
        setAiChoice(ai);
        const nextRounds = rounds + 1;
        setRounds(nextRounds);

        let outcome = '무승부';
        let delta = 5;
        let nextWins = wins;
        if (
            (opt.id === 'rock' && ai.id === 'scissors') ||
            (opt.id === 'scissors' && ai.id === 'paper') ||
            (opt.id === 'paper' && ai.id === 'rock')
        ) {
            outcome = '승리! 🎉';
            delta = 20;
            nextWins = wins + 1;
            setWins(nextWins);
            playSound('correct');
        } else if (opt.id !== ai.id) {
            outcome = '패배 😢';
            delta = 0;
            playSound('wrong');
        } else {
            playSound('submit');
        }

        const nextRoundScore = roundScore + delta;
        setRoundScore(nextRoundScore);
        setBattleText(`${opt.label} vs ${ai.label} → ${outcome}`);

        emitLiveGameStream({
            socket, pin, gameId: 'rock_paper_scissors', nickname, groupId,
            baseScore: initialBaseRef.current, roundScore: nextRoundScore,
            isAlive: true, isFinished: false, onScoreUpdate,
            gameData: {
                statusText: `${opt.emoji} vs ${ai.emoji} ${outcome} (${nextWins}승 / ${nextRounds}판)`,
                progressPct: Math.min(100, nextRounds * 10),
                choice: opt.label,
                wins: nextWins,
                rounds: nextRounds
            }
        });
    };
    
    return (
        <div style={{ padding: '1rem' }}>
            <p style={{ color: 'var(--text-muted)', marginBottom: '1rem', fontWeight: '700' }}>
                가위·바위·보를 선택해 연승 점수를 쌓으세요! (현재 {wins}승 / +{roundScore}점)
            </p>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {options.map(opt => {
                    const isSelected = choice === opt.id;
                    return (
                        <button
                            key={opt.id}
                            onClick={() => handlePick(opt)}
                            style={{
                                padding: '16px',
                                fontSize: '1.3rem',
                                fontWeight: 'bold',
                                background: isSelected ? 'var(--primary)' : 'white',
                                color: isSelected ? 'white' : 'var(--text)',
                                border: isSelected ? '2px solid var(--primary)' : '2px solid #e2e8f0',
                                borderRadius: '16px',
                                cursor: 'pointer',
                                boxShadow: isSelected ? '0 4px 10px rgba(0,0,0,0.1)' : 'none',
                                transition: 'all 0.2s'
                            }}
                        >
                            {opt.label}
                        </button>
                    );
                })}
            </div>
            
            {choice && (
                <div style={{ marginTop: '1.5rem', background: '#eff6ff', border: '2px solid #3b82f6', borderRadius: '12px', padding: '1rem' }}>
                    <span style={{ color: '#2563eb', fontWeight: 'bold', fontSize: '1.05rem' }}>{battleText}</span>
                </div>
            )}
        </div>
    );
}

export function WhackMoleGame({ socket, pin, nickname, groupId, baseScore = 0, onScoreUpdate }) {
    const [score, setScore] = useState(0);
    const [activeMole, setActiveMole] = useState(null);
    const [timeLeft, setTimeLeft] = useState(20);
    const [isPlaying, setIsPlaying] = useState(true);
    const initialBaseRef = useRef(baseScore);
    const scoreRef = useRef(0);

    useEffect(() => {
        setActiveMole(Math.floor(Math.random() * 9));
        emitLiveGameStream({
            socket, pin, gameId: 'whack_mole', nickname, groupId,
            baseScore: initialBaseRef.current, roundScore: 0,
            isAlive: true, isFinished: false, updateRoomScore: false,
            gameData: { statusText: '🐹 두더지 사냥 시작! (20초)', progressPct: 5, hits: 0, timeLeft: 20 }
        });
    }, []);
    
    useEffect(() => {
        let gameTimer;
        let moleTimer;
        if (isPlaying && timeLeft > 0) {
            gameTimer = setInterval(() => {
                setTimeLeft(prev => {
                    const nextT = prev - 1;
                    emitLiveGameStream({
                        socket, pin, gameId: 'whack_mole', nickname, groupId,
                        baseScore: initialBaseRef.current, roundScore: scoreRef.current * 10,
                        isAlive: nextT > 0, isFinished: nextT <= 0, updateRoomScore: nextT <= 0, onScoreUpdate,
                        gameData: {
                            statusText: nextT > 0 ? `🐹 ${scoreRef.current}마리 포획! (${nextT}초 남음)` : `🏆 최종 ${scoreRef.current}마리 포획!`,
                            progressPct: Math.min(100, Math.round(((20 - nextT) / 20) * 100)),
                            hits: scoreRef.current,
                            timeLeft: nextT
                        }
                    });
                    return nextT;
                });
            }, 1000);
            
            moleTimer = setInterval(() => {
                setActiveMole(Math.floor(Math.random() * 9));
            }, 700);
        } else if (timeLeft === 0) {
            setIsPlaying(false);
            setActiveMole(null);
        }
        
        return () => {
            clearInterval(gameTimer);
            clearInterval(moleTimer);
        };
    }, [isPlaying, timeLeft]);
    
    const startGame = () => {
        scoreRef.current = 0;
        setScore(0);
        setTimeLeft(20);
        setIsPlaying(true);
        setActiveMole(Math.floor(Math.random() * 9));
        emitLiveGameStream({
            socket, pin, gameId: 'whack_mole', nickname, groupId,
            baseScore: initialBaseRef.current, roundScore: 0,
            isAlive: true, isFinished: false, onScoreUpdate,
            gameData: { statusText: '🐹 재도전 시작! (20초)', progressPct: 5, hits: 0, timeLeft: 20 }
        });
    };
    
    const handleMoleClick = (idx) => {
        if (!isPlaying) return;
        if (activeMole === idx) {
            const nextHits = scoreRef.current + 1;
            scoreRef.current = nextHits;
            setScore(nextHits);
            setActiveMole(null);
            playSound('correct');
            emitLiveGameStream({
                socket, pin, gameId: 'whack_mole', nickname, groupId,
                baseScore: initialBaseRef.current, roundScore: nextHits * 10,
                isAlive: true, isFinished: false, onScoreUpdate,
                gameData: {
                    statusText: `🐹 ${nextHits}마리 포획! (${timeLeft}초 남음)`,
                    progressPct: Math.min(100, Math.round(((20 - timeLeft) / 20) * 100)),
                    hits: nextHits,
                    timeLeft
                }
            });
        }
    };
    
    return (
        <div style={{ padding: '0.5rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem', fontSize: '1rem', fontWeight: 'bold' }}>
                <span>포획: <span style={{ color: '#10b981' }}>{score}마리 (+{score * 10}점)</span></span>
                <span>시간: <span style={{ color: '#ef4444' }}>{timeLeft}초</span></span>
            </div>
            
            {isPlaying ? (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px', marginBottom: '1.5rem' }}>
                    {Array.from({ length: 9 }).map((_, idx) => {
                        const hasMole = activeMole === idx;
                        return (
                            <div
                                key={idx}
                                onClick={() => handleMoleClick(idx)}
                                style={{
                                    height: '75px',
                                    background: hasMole ? '#fef3c7' : '#f1f5f9',
                                    border: hasMole ? '3px solid #f59e0b' : '2px solid #cbd5e1',
                                    borderRadius: '16px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    fontSize: '2.2rem',
                                    cursor: 'pointer',
                                    userSelect: 'none',
                                    transition: 'transform 0.1s'
                                }}
                            >
                                {hasMole ? '🐹' : ''}
                            </div>
                        );
                    })}
                </div>
            ) : (
                <div style={{ padding: '2rem 1rem', background: '#f8fafc', border: '2px dashed #cbd5e1', borderRadius: '16px', marginBottom: '1.5rem' }}>
                    {timeLeft === 0 ? (
                        <div>
                            <h3 style={{ margin: 0, color: 'var(--primary)' }}>게임 종료!</h3>
                            <h1 style={{ fontSize: '2.6rem', margin: '0.5rem 0' }}>{score}마리 (+{score * 10}점)</h1>
                        </div>
                    ) : (
                        <p style={{ color: 'var(--text-muted)', margin: 0 }}>제한 시간 20초 동안 팝업되는 두더지를 때려 점수를 획득하세요!</p>
                    )}
                    <button onClick={startGame} className="primary-btn" style={{ marginTop: '1.5rem', width: '80%' }}>
                        {timeLeft === 0 ? '다시 도전하기' : '게임 시작하기!'}
                    </button>
                </div>
            )}
        </div>
    );
}

export function SamokGame({ socket, pin, nickname, groupId, baseScore = 0, onScoreUpdate }) {
    // Initial 9x9 board: rows 0..8, cols 0..8
    const [bounds, setBounds] = useState({ minR: 0, maxR: 8, minC: 0, maxC: 8 });
    // stones: { "r,c": "black" | "white" }
    const [stones, setStones] = useState({});
    const [isBlackTurn, setIsBlackTurn] = useState(true);
    const [winner, setWinner] = useState(null);
    const [winningLine, setWinningLine] = useState([]);
    const [lastMove, setLastMove] = useState(null);
    const [roundScore, setRoundScore] = useState(0);
    const [showWinBanner, setShowWinBanner] = useState(false);
    const [expandNotice, setExpandNotice] = useState(null);
    const initialBaseRef = useRef(baseScore);

    // Zoom & Pan viewport state
    const [scale, setScale] = useState(1.0);
    const [pan, setPan] = useState({ x: 0, y: 0 });

    const containerRef = useRef(null);
    const isDraggingRef = useRef(false);
    const dragStartRef = useRef({ x: 0, y: 0, panX: 0, panY: 0 });
    const moveDistRef = useRef(0);

    const touchStateRef = useRef({
        touches: 0,
        dist: 0,
        startScale: 1.0,
        startX: 0,
        startY: 0,
        panX: 0,
        panY: 0,
        moveDist: 0,
        startTime: 0
    });

    useEffect(() => {
        emitLiveGameStream({
            socket, pin, gameId: 'omok', nickname, groupId,
            baseScore: initialBaseRef.current, roundScore: 0,
            isAlive: true, isFinished: false, updateRoomScore: false,
            gameData: { statusText: '⚫⚪ 사목 대국 시작 (9x9 동적 확장)', progressPct: 5, moves: 0 }
        });
    }, []);

    // Desktop Mouse Wheel Zoom
    useEffect(() => {
        const el = containerRef.current;
        if (!el) return;
        const handleWheel = (e) => {
            e.preventDefault();
            const delta = e.deltaY;
            const factor = delta < 0 ? 1.12 : 0.89;
            setScale(prev => Math.min(2.5, Math.max(0.35, +(prev * factor).toFixed(2))));
        };
        el.addEventListener('wheel', handleWheel, { passive: false });
        return () => el.removeEventListener('wheel', handleWheel);
    }, []);

    // Desktop Mouse Drag to Pan
    const handleMouseDown = (e) => {
        if (e.button !== 0) return;
        isDraggingRef.current = true;
        dragStartRef.current = {
            x: e.clientX,
            y: e.clientY,
            panX: pan.x,
            panY: pan.y
        };
        moveDistRef.current = 0;
    };

    const handleMouseMove = (e) => {
        if (!isDraggingRef.current) return;
        const dx = e.clientX - dragStartRef.current.x;
        const dy = e.clientY - dragStartRef.current.y;
        moveDistRef.current = Math.hypot(dx, dy);
        setPan({
            x: dragStartRef.current.panX + dx,
            y: dragStartRef.current.panY + dy
        });
    };

    const handleMouseUp = () => {
        isDraggingRef.current = false;
    };

    // Mobile Touch: 2-finger Pinch Zoom + 1-finger Drag Pan
    const handleTouchStart = (e) => {
        if (e.touches.length === 1) {
            touchStateRef.current = {
                touches: 1,
                dist: 0,
                startScale: scale,
                startX: e.touches[0].clientX,
                startY: e.touches[0].clientY,
                panX: pan.x,
                panY: pan.y,
                moveDist: 0,
                startTime: Date.now()
            };
        } else if (e.touches.length === 2) {
            const d = Math.hypot(
                e.touches[0].clientX - e.touches[1].clientX,
                e.touches[0].clientY - e.touches[1].clientY
            );
            touchStateRef.current = {
                touches: 2,
                dist: d,
                startScale: scale,
                startX: (e.touches[0].clientX + e.touches[1].clientX) / 2,
                startY: (e.touches[0].clientY + e.touches[1].clientY) / 2,
                panX: pan.x,
                panY: pan.y,
                moveDist: 0,
                startTime: Date.now()
            };
        }
    };

    const handleTouchMove = (e) => {
        if (e.touches.length === 2) {
            // Pinch to zoom
            const d = Math.hypot(
                e.touches[0].clientX - e.touches[1].clientX,
                e.touches[0].clientY - e.touches[1].clientY
            );
            if (touchStateRef.current.dist > 0) {
                const ratio = d / touchStateRef.current.dist;
                const nextScale = Math.min(2.5, Math.max(0.35, +(touchStateRef.current.startScale * ratio).toFixed(2)));
                setScale(nextScale);
            }
        } else if (e.touches.length === 1 && touchStateRef.current.touches === 1) {
            // Single finger pan
            const dx = e.touches[0].clientX - touchStateRef.current.startX;
            const dy = e.touches[0].clientY - touchStateRef.current.startY;
            touchStateRef.current.moveDist = Math.hypot(dx, dy);
            setPan({
                x: touchStateRef.current.panX + dx,
                y: touchStateRef.current.panY + dy
            });
        }
    };

    const handleTouchEnd = (e) => {
        if (e.touches.length === 0) {
            touchStateRef.current.touches = 0;
        }
    };

    // Cell Click (Stone Placement & Dynamic Expansion)
    const handleCellClick = (r, c) => {
        // Prevent click if dragging or pinching
        if (moveDistRef.current > 6 || touchStateRef.current.moveDist > 8) return;
        const key = `${r},${c}`;
        if (stones[key] || winner) return;

        const currentStone = isBlackTurn ? 'black' : 'white';
        const nextStones = { ...stones, [key]: currentStone };
        setStones(nextStones);
        setLastMove({ r, c });

        // Auto-expand board when stone is within 2 cells of border
        // "돌들을 놓을 때 더 이상 돌을 놓을 공간이 없기 두 칸 전까지 가면 그쪽으로 판이 자동으로 넓어지게"
        let { minR, maxR, minC, maxC } = bounds;
        let expanded = false;
        let expandedDirs = [];

        if (r - minR <= 1) {
            minR -= 2;
            expanded = true;
            expandedDirs.push('위쪽');
        }
        if (maxR - r <= 1) {
            maxR += 2;
            expanded = true;
            expandedDirs.push('아래쪽');
        }
        if (c - minC <= 1) {
            minC -= 2;
            expanded = true;
            expandedDirs.push('왼쪽');
        }
        if (maxC - c <= 1) {
            maxC += 2;
            expanded = true;
            expandedDirs.push('오른쪽');
        }

        if (expanded) {
            setBounds({ minR, maxR, minC, maxC });
            const totalC = maxC - minC + 1;
            const totalR = maxR - minR + 1;
            setExpandNotice(`✨ 바둑판 ${expandedDirs.join(', ')} 확장! (${totalC}×${totalR})`);
            setTimeout(() => setExpandNotice(null), 2500);
        }

        // Win check: 4-in-a-row (사목)
        const checkWin = (row, col, color) => {
            const directions = [
                [0, 1],   // 가로
                [1, 0],   // 세로
                [1, 1],   // 대각선 ↘
                [1, -1]   // 대각선 ↙
            ];
            for (const [dr, dc] of directions) {
                const line = [`${row},${col}`];
                let i = 1;
                while (nextStones[`${row + dr * i},${col + dc * i}`] === color) {
                    line.push(`${row + dr * i},${col + dc * i}`);
                    i++;
                }
                i = 1;
                while (nextStones[`${row - dr * i},${col - dc * i}`] === color) {
                    line.push(`${row - dr * i},${col - dc * i}`);
                    i++;
                }
                if (line.length >= 4) {
                    return line;
                }
            }
            return null;
        };

        const winLine = checkWin(r, c, currentStone);
        const movesCount = Object.keys(nextStones).length;
        const nextRoundScore = roundScore + (winLine ? 50 : 5);
        setRoundScore(nextRoundScore);

        if (winLine) {
            const winText = isBlackTurn ? '흑돌(⚫)' : '백돌(⚪)';
            setWinner(winText);
            setWinningLine(winLine);
            setShowWinBanner(true);
            try {
                playSound('fanfare');
            } catch (e) {}

            emitLiveGameStream({
                socket, pin, gameId: 'omok', nickname, groupId,
                baseScore: initialBaseRef.current, roundScore: nextRoundScore,
                isAlive: true, isFinished: true, onScoreUpdate,
                gameData: {
                    statusText: `🎉 ${winText} 4목 승리! (${movesCount}수)`,
                    progressPct: 100,
                    moves: movesCount,
                    winner: winText
                }
            });
        } else {
            setIsBlackTurn(!isBlackTurn);
            try {
                playSound('step');
            } catch (e) {}
            emitLiveGameStream({
                socket, pin, gameId: 'omok', nickname, groupId,
                baseScore: initialBaseRef.current, roundScore: nextRoundScore,
                isAlive: true, isFinished: false, onScoreUpdate,
                gameData: {
                    statusText: `⚫⚪ ${movesCount}수 진행 중 (${isBlackTurn ? '백돌' : '흑돌'} 차례)`,
                    progressPct: Math.min(95, Math.round((movesCount / 20) * 100)),
                    moves: movesCount
                }
            });
        }
    };

    const reset = () => {
        setBounds({ minR: 0, maxR: 8, minC: 0, maxC: 8 });
        setStones({});
        setIsBlackTurn(true);
        setWinner(null);
        setWinningLine([]);
        setLastMove(null);
        setShowWinBanner(false);
        setScale(1.0);
        setPan({ x: 0, y: 0 });
    };

    const totalRows = bounds.maxR - bounds.minR + 1;
    const totalCols = bounds.maxC - bounds.minC + 1;
    const cellSize = 42;

    const rows = [];
    for (let r = bounds.minR; r <= bounds.maxR; r++) rows.push(r);
    const cols = [];
    for (let c = bounds.minC; c <= bounds.maxC; c++) cols.push(c);

    return (
        <div style={{ padding: '0.25rem', userSelect: 'none' }}>
            {/* Top Status & Zoom Controls */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px', flexWrap: 'wrap', gap: '6px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span 
                        style={{ 
                            padding: '4px 10px', 
                            borderRadius: '8px', 
                            fontWeight: '800', 
                            fontSize: '0.88rem',
                            background: winner ? '#fef3c7' : isBlackTurn ? '#1e293b' : '#f1f5f9',
                            color: winner ? '#d97706' : isBlackTurn ? '#ffffff' : '#0f172a',
                            border: '1.5px solid #cbd5e1'
                        }}
                    >
                        {winner ? `🎉 ${winner} 4목 승리!` : `차례: ${isBlackTurn ? '⚫ 흑돌' : '⚪ 백돌'} (4목 승리)`}
                    </span>
                    <span style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: '700' }}>
                        {totalCols}×{totalRows} 크기
                    </span>
                </div>

                {/* Zoom Control Buttons */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <button
                        type="button"
                        onClick={() => setScale(s => Math.min(2.5, +(s + 0.15).toFixed(2)))}
                        style={{ padding: '4px 8px', borderRadius: '6px', border: '1px solid #cbd5e1', background: '#ffffff', cursor: 'pointer', fontWeight: '800', fontSize: '0.85rem' }}
                        title="확대"
                    >
                        ➕
                    </button>
                    <button
                        type="button"
                        onClick={() => setScale(s => Math.max(0.35, +(s - 0.15).toFixed(2)))}
                        style={{ padding: '4px 8px', borderRadius: '6px', border: '1px solid #cbd5e1', background: '#ffffff', cursor: 'pointer', fontWeight: '800', fontSize: '0.85rem' }}
                        title="축소"
                    >
                        ➖
                    </button>
                    <button
                        type="button"
                        onClick={() => { setScale(1.0); setPan({ x: 0, y: 0 }); }}
                        style={{ padding: '4px 8px', borderRadius: '6px', border: '1px solid #cbd5e1', background: '#f8fafc', cursor: 'pointer', fontWeight: '700', fontSize: '0.78rem' }}
                        title="화면 맞춤"
                    >
                        🎯 맞춤 ({Math.round(scale * 100)}%)
                    </button>
                </div>
            </div>

            {/* Quick helper notice */}
            <div style={{ fontSize: '0.75rem', color: '#94a3b8', marginBottom: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span>💡 PC: 휠/드래그 이동 · 모바일: 두 손가락 핀치 줌</span>
                {expandNotice && (
                    <span style={{ color: '#059669', fontWeight: '800', animation: 'bannerFadeIn 0.3s ease' }}>
                        {expandNotice}
                    </span>
                )}
            </div>

            {/* Viewport Container */}
            <div
                ref={containerRef}
                onMouseDown={handleMouseDown}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
                onMouseLeave={handleMouseUp}
                onTouchStart={handleTouchStart}
                onTouchMove={handleTouchMove}
                onTouchEnd={handleTouchEnd}
                style={{
                    position: 'relative',
                    width: '100%',
                    height: '460px',
                    backgroundColor: '#78350f',
                    borderRadius: '16px',
                    overflow: 'hidden',
                    cursor: isDraggingRef.current ? 'grabbing' : 'grab',
                    touchAction: 'none',
                    boxShadow: 'inset 0 0 20px rgba(0,0,0,0.5), 0 10px 25px rgba(0,0,0,0.2)'
                }}
            >
                {/* Centering Wrapper with Pan and Zoom */}
                <div
                    style={{
                        position: 'absolute',
                        top: '50%',
                        left: '50%',
                        transform: `translate(calc(-50% + ${pan.x}px), calc(-50% + ${pan.y}px)) scale(${scale})`,
                        transformOrigin: 'center center',
                        transition: isDraggingRef.current ? 'none' : 'transform 0.08s ease-out'
                    }}
                >
                    {/* Authentic Baduk Wooden Board */}
                    <div
                        style={{
                            display: 'grid',
                            gridTemplateColumns: `repeat(${totalCols}, ${cellSize}px)`,
                            gridTemplateRows: `repeat(${totalRows}, ${cellSize}px)`,
                            background: 'linear-gradient(135deg, #d97706, #b45309)',
                            padding: '12px',
                            borderRadius: '10px',
                            boxShadow: '0 12px 30px rgba(0,0,0,0.45)',
                            border: '4px solid #451a03'
                        }}
                    >
                        {rows.map((r, rIdx) => 
                            cols.map((c, cIdx) => {
                                const key = `${r},${c}`;
                                const stone = stones[key];
                                const isWinning = winningLine.includes(key);
                                const isLast = lastMove?.r === r && lastMove?.c === c;
                                const isStarPoint = (r % 4 === 0 && c % 4 === 0);

                                return (
                                    <div
                                        key={key}
                                        onClick={() => handleCellClick(r, c)}
                                        style={{
                                            position: 'relative',
                                            width: `${cellSize}px`,
                                            height: `${cellSize}px`,
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            cursor: stone || winner ? 'default' : 'pointer'
                                        }}
                                    >
                                        {/* Cross Lines */}
                                        <div 
                                            style={{
                                                position: 'absolute',
                                                top: '50%',
                                                left: 0,
                                                right: 0,
                                                height: '1.5px',
                                                background: '#5c2807',
                                                pointerEvents: 'none'
                                            }} 
                                        />
                                        <div 
                                            style={{
                                                position: 'absolute',
                                                left: '50%',
                                                top: 0,
                                                bottom: 0,
                                                width: '1.5px',
                                                background: '#5c2807',
                                                pointerEvents: 'none'
                                            }} 
                                        />

                                        {/* Star point dot */}
                                        {isStarPoint && !stone && (
                                            <div
                                                style={{
                                                    position: 'absolute',
                                                    width: '5px',
                                                    height: '5px',
                                                    borderRadius: '50%',
                                                    background: '#5c2807',
                                                    pointerEvents: 'none'
                                                }}
                                            />
                                        )}

                                        {/* Placed Stone */}
                                        {stone && (
                                            <div
                                                style={{
                                                    position: 'relative',
                                                    zIndex: 2,
                                                    width: '34px',
                                                    height: '34px',
                                                    borderRadius: '50%',
                                                    background: stone === 'black'
                                                        ? 'radial-gradient(circle at 35% 35%, #4b5563, #09090b 80%)'
                                                        : 'radial-gradient(circle at 35% 35%, #ffffff, #e2e8f0 85%)',
                                                    boxShadow: isWinning
                                                        ? '0 0 16px 4px #fbbf24, 0 4px 8px rgba(0,0,0,0.6)'
                                                        : '0 3px 6px rgba(0,0,0,0.4)',
                                                    border: isWinning
                                                        ? '2.5px solid #f59e0b'
                                                        : stone === 'white' ? '1px solid #cbd5e1' : 'none',
                                                    animation: isWinning ? 'winningStoneGlow 1.2s infinite ease-in-out' : 'none',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center'
                                                }}
                                            >
                                                {/* Last move indicator */}
                                                {isLast && !isWinning && (
                                                    <div 
                                                        style={{ 
                                                            width: '6px', 
                                                            height: '6px', 
                                                            borderRadius: '50%', 
                                                            background: stone === 'black' ? '#ef4444' : '#dc2626' 
                                                        }} 
                                                    />
                                                )}
                                            </div>
                                        )}
                                    </div>
                                );
                            })
                        )}
                    </div>
                </div>
            </div>

            {/* Bottom Actions */}
            <div style={{ display: 'flex', gap: '8px', marginTop: '10px' }}>
                <button 
                    type="button"
                    onClick={reset} 
                    className="glass-button" 
                    style={{ flex: 1, padding: '10px', fontSize: '0.95rem', fontWeight: '800' }}
                >
                    바둑판 초기화 (새 게임)
                </button>
            </div>

            {/* Victory Celebration Banner with Fanfare and Fireworks */}
            <GameFinishBanner
                show={showWinBanner && Boolean(winner)}
                type="win"
                title={`🎉 ${winner} 4목 승리!`}
                subtitle={`총 ${Object.keys(stones).length}수 만에 4목을 완성하여 승리했습니다!`}
                scoreText={`+${roundScore}점`}
                onRestart={reset}
                onClose={() => setShowWinBanner(false)}
                restartText="새 대국 시작"
                closeText="바둑판 살펴보기"
            />

            <style>{`
                @keyframes winningStoneGlow {
                    0% { transform: scale(1); box-shadow: 0 0 12px 3px #fbbf24; }
                    50% { transform: scale(1.1); box-shadow: 0 0 20px 6px #f59e0b; }
                    100% { transform: scale(1); box-shadow: 0 0 12px 3px #fbbf24; }
                }
            `}</style>
        </div>
    );
}

// Backward compatibility alias
export const OmokGame = SamokGame;

export function MinesweeperGame({ socket, pin, nickname, groupId, baseScore = 0, onScoreUpdate }) {
    const GRID_SIZE = 25; // 5x5
    const [grid, setGrid] = useState([]); 
    const [revealed, setRevealed] = useState(Array(GRID_SIZE).fill(false));
    const [gameOver, setGameOver] = useState(false);
    const [win, setWin] = useState(false);
    const [score, setScore] = useState(0);
    const [roundScore, setRoundScore] = useState(0);
    const initialBaseRef = useRef(baseScore);
    
    const initialize = () => {
        const nextGrid = Array(GRID_SIZE).fill('empty');
        let minesPlaced = 0;
        while (minesPlaced < 4) {
            const idx = Math.floor(Math.random() * GRID_SIZE);
            if (nextGrid[idx] === 'empty') {
                nextGrid[idx] = 'mine';
                minesPlaced++;
            }
        }
        setGrid(nextGrid);
        setRevealed(Array(GRID_SIZE).fill(false));
        setGameOver(false);
        setWin(false);
        setScore(0);
        emitLiveGameStream({
            socket, pin, gameId: 'minesweeper', nickname, groupId,
            baseScore: initialBaseRef.current, roundScore,
            isAlive: true, isFinished: false, updateRoomScore: false,
            gameData: { statusText: '💣 지뢰찾기 탐색 중 (0 / 21칸)', progressPct: 5, safeCount: 0 }
        });
    };
    
    useEffect(() => {
        initialize();
    }, []);
    
    const clickCell = (idx) => {
        if (revealed[idx] || gameOver || win) return;
        const nextRevealed = [...revealed];
        nextRevealed[idx] = true;
        setRevealed(nextRevealed);
        
        if (grid[idx] === 'mine') {
            setGameOver(true);
            playSound('wrong');
            emitLiveGameStream({
                socket, pin, gameId: 'minesweeper', nickname, groupId,
                baseScore: initialBaseRef.current, roundScore,
                isAlive: false, isFinished: true, onScoreUpdate,
                gameData: {
                    statusText: `💥 지뢰 폭발! (안전 구역 ${score}칸 확보)`,
                    progressPct: Math.round((score / 21) * 100),
                    safeCount: score
                }
            });
        } else {
            const nextScore = score + 1;
            setScore(nextScore);
            const emptyCount = grid.filter(c => c === 'empty').length;
            const revealedEmptyCount = nextRevealed.filter((r, i) => r && grid[i] === 'empty').length;
            const won = revealedEmptyCount === emptyCount;
            const nextRoundScore = roundScore + (won ? 50 : 10);
            setRoundScore(nextRoundScore);
            if (won) {
                setWin(true);
                playSound('correct');
            } else {
                playSound('submit');
            }
            emitLiveGameStream({
                socket, pin, gameId: 'minesweeper', nickname, groupId,
                baseScore: initialBaseRef.current, roundScore: nextRoundScore,
                isAlive: true, isFinished: won, onScoreUpdate,
                gameData: {
                    statusText: won ? `🎉 지뢰찾기 완벽 클리어! (21/21칸)` : `🍀 안전 구역 ${nextScore} / 21칸 확보`,
                    progressPct: Math.min(100, Math.round((nextScore / 21) * 100)),
                    safeCount: nextScore
                }
            });
        }
    };
    
    return (
        <div style={{ padding: '0.5rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px', fontSize: '0.95rem', fontWeight: 'bold' }}>
                <span>안전 구역 확보: {score}칸 (+{roundScore}점)</span>
                {gameOver && <span style={{ color: '#ef4444' }}>💥 지뢰 발견 (패배)</span>}
                {win && <span style={{ color: '#10b981' }}>🎉 탈출 성공 (승리)</span>}
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '6px' }}>
                {grid.map((cell, idx) => {
                    const isRev = revealed[idx];
                    return (
                        <div
                            key={idx}
                            onClick={() => clickCell(idx)}
                            style={{
                                height: '50px',
                                background: isRev ? (cell === 'mine' ? '#fee2e2' : '#e2e8f0') : '#cbd5e1',
                                border: '2px solid #94a3b8',
                                borderRadius: '8px',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontSize: '1.4rem',
                                cursor: 'pointer'
                            }}
                        >
                            {isRev ? (cell === 'mine' ? '💣' : '🍀') : '?'}
                        </div>
                    );
                })}
            </div>
            <button onClick={initialize} className="glass-button" style={{ width: '100%', marginTop: '1rem' }}>지뢰찾기 재설정</button>
            <GameFinishBanner
                show={gameOver || win}
                type={win ? "win" : "lose"}
                title={win ? "🎉 지뢰찾기 올클리어!" : "💥 지뢰 폭발!"}
                subtitle={win ? "모든 안전 구역을 완벽하게 찾아냈습니다!" : `안전 구역 ${score}칸 확보 후 지뢰를 밟았습니다.`}
                scoreText={`+${roundScore}점`}
                onRestart={initialize}
                restartText={win ? "새 게임 시작" : "다시 도전하기"}
            />
        </div>
    );
}

export function SpeedNumbersGame({ socket, pin, nickname, groupId, baseScore = 0, onScoreUpdate }) {
    const [numbers, setNumbers] = useState([]);
    const [nextNum, setNextNum] = useState(1);
    const [win, setWin] = useState(false);
    const [startTime, setStartTime] = useState(null);
    const [timeTaken, setTimeTaken] = useState(null);
    const [roundScore, setRoundScore] = useState(0);
    const initialBaseRef = useRef(baseScore);
    
    const shuffle = () => {
        const arr = Array.from({ length: 16 }, (_, i) => i + 1).sort(() => Math.random() - 0.5);
        setNumbers(arr);
        setNextNum(1);
        setWin(false);
        setStartTime(Date.now());
        setTimeTaken(null);
        emitLiveGameStream({
            socket, pin, gameId: 'speed_numbers', nickname, groupId,
            baseScore: initialBaseRef.current, roundScore,
            isAlive: true, isFinished: false, updateRoomScore: false,
            gameData: { statusText: '🔢 숫자 1~16 순서 터치 시작!', progressPct: 5, currentNum: 1 }
        });
    };
    
    useEffect(() => {
        shuffle();
    }, []);
    
    const clickNum = (num) => {
        if (num === nextNum) {
            if (num === 16) {
                const elapsed = ((Date.now() - startTime) / 1000).toFixed(2);
                const speedBonus = Math.max(20, Math.round(100 - parseFloat(elapsed) * 4));
                const nextRoundScore = roundScore + speedBonus;
                setWin(true);
                setTimeTaken(elapsed);
                setRoundScore(nextRoundScore);
                playSound('correct');
                emitLiveGameStream({
                    socket, pin, gameId: 'speed_numbers', nickname, groupId,
                    baseScore: initialBaseRef.current, roundScore: nextRoundScore,
                    isAlive: true, isFinished: true, onScoreUpdate,
                    gameData: {
                        statusText: `🎉 1~16 완주 성공! (${elapsed}초)`,
                        progressPct: 100,
                        currentNum: 16,
                        timeTaken: elapsed
                    }
                });
            } else {
                const nextN = nextNum + 1;
                const nextRoundScore = roundScore + 5;
                setNextNum(nextN);
                setRoundScore(nextRoundScore);
                playSound('submit');
                emitLiveGameStream({
                    socket, pin, gameId: 'speed_numbers', nickname, groupId,
                    baseScore: initialBaseRef.current, roundScore: nextRoundScore,
                    isAlive: true, isFinished: false, onScoreUpdate,
                    gameData: {
                        statusText: `🔢 숫자 ${num} / 16 터치 완료!`,
                        progressPct: Math.round((num / 16) * 100),
                        currentNum: num
                    }
                });
            }
        }
    };
    
    return (
        <div style={{ padding: '0.5rem' }}>
            <p style={{ margin: '0 0 10px 0', fontSize: '0.95rem', fontWeight: 'bold' }}>
                {win ? `🎉 성공! 기록: ${timeTaken}초 (+${roundScore}점)` : `다음에 누를 숫자: ${nextNum} (+${roundScore}점)`}
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '6px' }}>
                {numbers.map((num) => {
                    const isCleared = num < nextNum;
                    return (
                        <div
                            key={num}
                            onClick={() => clickNum(num)}
                            style={{
                                height: '50px',
                                background: isCleared ? '#d1fae5' : '#3b82f6',
                                color: isCleared ? '#10b981' : 'white',
                                border: '2px solid #2563eb',
                                borderRadius: '8px',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontSize: '1.2rem',
                                fontWeight: 'bold',
                                cursor: 'pointer',
                                visibility: isCleared && win ? 'visible' : (isCleared ? 'hidden' : 'visible')
                            }}
                        >
                            {num}
                        </div>
                    );
                })}
            </div>
            <button onClick={shuffle} className="glass-button" style={{ width: '100%', marginTop: '1rem' }}>기록 재도전</button>
            <GameFinishBanner
                show={win}
                type="win"
                title="🎉 숫자 터치 완주 성공!"
                subtitle={`1부터 16까지 ${timeTaken}초 만에 순서대로 모두 터치했습니다!`}
                scoreText={`+${roundScore}점`}
                onRestart={shuffle}
                restartText="기록 갱신 도전"
            />
        </div>
    );
}

export function JanggiGame({ socket, pin, nickname, groupId, baseScore = 0, onScoreUpdate }) {
    const [board, setBoard] = useState(Array(25).fill(null)); // 5x5 Grid Janggi
    const [selectedPiece, setSelectedPiece] = useState(null);
    const [moves, setMoves] = useState(0);
    const [roundScore, setRoundScore] = useState(0);
    const initialBaseRef = useRef(baseScore);
    
    const initialPieces = {
        0: '漢 (楚)', 4: '漢 (車)', 20: '楚 (將)', 24: '楚 (車)'
    };
    
    useEffect(() => {
        const nextBoard = Array(25).fill(null);
        Object.entries(initialPieces).forEach(([k, v]) => {
            nextBoard[parseInt(k)] = v;
        });
        setBoard(nextBoard);
        emitLiveGameStream({
            socket, pin, gameId: 'janggi', nickname, groupId,
            baseScore: initialBaseRef.current, roundScore: 0,
            isAlive: true, isFinished: false, updateRoomScore: false,
            gameData: { statusText: '♟️ 장기 대국 시작', progressPct: 10, moves: 0 }
        });
    }, []);
    
    const handleCellClick = (idx) => {
        if (selectedPiece !== null && selectedPiece !== idx) {
            const movedPiece = board[selectedPiece];
            const captured = board[idx];
            const nextBoard = [...board];
            nextBoard[idx] = movedPiece;
            nextBoard[selectedPiece] = null;
            const nextMoves = moves + 1;
            const pts = captured ? 25 : 10;
            const nextRoundScore = roundScore + pts;
            setBoard(nextBoard);
            setSelectedPiece(null);
            setMoves(nextMoves);
            setRoundScore(nextRoundScore);
            playSound(captured ? 'correct' : 'submit');
            emitLiveGameStream({
                socket, pin, gameId: 'janggi', nickname, groupId,
                baseScore: initialBaseRef.current, roundScore: nextRoundScore,
                isAlive: true, isFinished: false, onScoreUpdate,
                gameData: {
                    statusText: captured ? `⚔️ ${movedPiece} → ${captured} 포획! (${nextMoves}수)` : `♟️ ${movedPiece} 이동 (${nextMoves}수)`,
                    progressPct: Math.min(100, nextMoves * 10),
                    moves: nextMoves
                }
            });
        } else if (board[idx]) {
            setSelectedPiece(idx);
        }
    };
    
    return (
        <div style={{ padding: '0.5rem' }}>
            <p style={{ margin: '0 0 10px 0', fontSize: '0.9rem', color: 'var(--text-muted)' }}>
                {selectedPiece !== null ? '이동할 위치를 터치하세요!' : `장기 말(楚/漢)을 터치하여 이동하세요! (${moves}수 / +${roundScore}점)`}
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '4px', background: '#ffe4b5', padding: '6px', borderRadius: '12px', border: '3px solid #8b4513' }}>
                {board.map((cell, idx) => {
                    const isSel = selectedPiece === idx;
                    return (
                        <div
                            key={idx}
                            onClick={() => handleCellClick(idx)}
                            style={{
                                height: '52px',
                                background: isSel ? '#fecaca' : '#ffe4b5',
                                border: '1px solid #8b4513',
                                borderRadius: '4px',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontSize: '0.9rem',
                                fontWeight: 'bold',
                                color: cell?.startsWith('漢') ? '#dc2626' : '#2563eb',
                                cursor: 'pointer',
                                boxShadow: isSel ? '0 0 10px rgba(239, 68, 68, 0.5) inset' : 'none'
                            }}
                        >
                            {cell ? cell : ''}
                        </div>
                    );
                })}
            </div>
            <button onClick={() => {
                const nextBoard = Array(25).fill(null);
                Object.entries(initialPieces).forEach(([k, v]) => { nextBoard[parseInt(k)] = v; });
                setBoard(nextBoard);
                setSelectedPiece(null);
            }} className="glass-button" style={{ width: '100%', marginTop: '1rem' }}>대국 초기화</button>
        </div>
    );
}

export function ChessGame({ socket, pin, nickname, groupId, baseScore = 0, onScoreUpdate }) {
    const [board, setBoard] = useState(Array(25).fill(null)); // 5x5 board
    const [selectedPiece, setSelectedPiece] = useState(null);
    const [moves, setMoves] = useState(0);
    const [roundScore, setRoundScore] = useState(0);
    const initialBaseRef = useRef(baseScore);
    
    const initialPieces = {
        2: '♚', 0: '♜', 4: '♞', 22: '♔', 20: '♖', 24: '♘'
    };
    
    useEffect(() => {
        const nextBoard = Array(25).fill(null);
        Object.entries(initialPieces).forEach(([k, v]) => {
            nextBoard[parseInt(k)] = v;
        });
        setBoard(nextBoard);
        emitLiveGameStream({
            socket, pin, gameId: 'chess', nickname, groupId,
            baseScore: initialBaseRef.current, roundScore: 0,
            isAlive: true, isFinished: false, updateRoomScore: false,
            gameData: { statusText: '♔♚ 체스 대국 시작', progressPct: 10, moves: 0 }
        });
    }, []);
    
    const handleCellClick = (idx) => {
        if (selectedPiece !== null && selectedPiece !== idx) {
            const movedPiece = board[selectedPiece];
            const captured = board[idx];
            const nextBoard = [...board];
            nextBoard[idx] = movedPiece;
            nextBoard[selectedPiece] = null;
            const nextMoves = moves + 1;
            const pts = captured ? 25 : 10;
            const nextRoundScore = roundScore + pts;
            setBoard(nextBoard);
            setSelectedPiece(null);
            setMoves(nextMoves);
            setRoundScore(nextRoundScore);
            playSound(captured ? 'correct' : 'submit');
            emitLiveGameStream({
                socket, pin, gameId: 'chess', nickname, groupId,
                baseScore: initialBaseRef.current, roundScore: nextRoundScore,
                isAlive: true, isFinished: false, onScoreUpdate,
                gameData: {
                    statusText: captured ? `⚔️ ${movedPiece} → ${captured} 포획! (${nextMoves}수)` : `♟️ ${movedPiece} 이동 (${nextMoves}수)`,
                    progressPct: Math.min(100, nextMoves * 10),
                    moves: nextMoves
                }
            });
        } else if (board[idx]) {
            setSelectedPiece(idx);
        }
    };
    
    return (
        <div style={{ padding: '0.5rem' }}>
            <p style={{ margin: '0 0 10px 0', fontSize: '0.9rem', color: 'var(--text-muted)' }}>
                {selectedPiece !== null ? '기물을 놓을 칸을 선택하세요!' : `기물(♔/♚/♞)을 터치하여 이동하세요! (${moves}수 / +${roundScore}점)`}
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '2px', background: '#e2e8f0', padding: '4px', borderRadius: '12px', border: '3px solid #475569' }}>
                {board.map((cell, idx) => {
                    const row = Math.floor(idx / 5);
                    const col = idx % 5;
                    const isDark = (row + col) % 2 === 1;
                    const isSel = selectedPiece === idx;
                    return (
                        <div
                            key={idx}
                            onClick={() => handleCellClick(idx)}
                            style={{
                                height: '52px',
                                background: isSel ? '#fecaca' : (isDark ? '#b58863' : '#f0d9b5'),
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontSize: '2.5rem',
                                color: 'black',
                                cursor: 'pointer'
                            }}
                        >
                            {cell ? cell : ''}
                        </div>
                    );
                })}
            </div>
            <button onClick={() => {
                const nextBoard = Array(25).fill(null);
                Object.entries(initialPieces).forEach(([k, v]) => { nextBoard[parseInt(k)] = v; });
                setBoard(nextBoard);
                setSelectedPiece(null);
            }} className="glass-button" style={{ width: '100%', marginTop: '1rem' }}>체스판 리셋</button>
        </div>
    );
}

export function PokerGame({ socket, pin, nickname, groupId, baseScore = 0, onScoreUpdate }) {
    const SUITS = [
        { symbol: '♠', color: '#1e293b' },
        { symbol: '♥', color: '#dc2626' },
        { symbol: '♦', color: '#e11d48' },
        { symbol: '♣', color: '#0f766e' }
    ];

    const [card1, setCard1] = useState(null);
    const [card2, setCard2] = useState(null);
    const [isCard2Open, setIsCard2Open] = useState(false);
    const [isFolded, setIsFolded] = useState(false);
    const [bet, setBet] = useState(10);
    const [evalResult, setEvalResult] = useState(null);
    const [roundScore, setRoundScore] = useState(0);
    const [handsPlayed, setHandsPlayed] = useState(0);
    const initialBaseRef = useRef(baseScore);

    const dealNewHand = () => {
        const v1 = Math.floor(Math.random() * 10) + 1;
        const v2 = Math.floor(Math.random() * 10) + 1;
        const s1 = SUITS[Math.floor(Math.random() * SUITS.length)];
        const s2 = SUITS[Math.floor(Math.random() * SUITS.length)];

        setCard1({ val: v1, suit: s1 });
        setCard2({ val: v2, suit: s2 });
        setIsCard2Open(false);
        setIsFolded(false);
        setBet(10);

        let res = {};
        const sum = v1 + v2;
        if (v1 === v2) {
            if (v1 === 10) {
                res = { text: '10 럭키 페어 (슈퍼 쌍둥이)', multiplier: 3, isPair: true, color: '#f59e0b', pts: 60 };
            } else {
                const mult = v1 >= 7 ? 2 : 1.5;
                res = { text: `${v1} 럭키 페어 (쌍둥이)`, multiplier: mult, isPair: true, color: '#ec4899', pts: 40 };
            }
        } else {
            if (sum >= 17) res = { text: `🌟 최고 합산 ${sum}점!`, multiplier: 1, isPair: false, color: '#10b981', pts: 30 };
            else if (sum >= 13) res = { text: `✨ 높은 합산 ${sum}점`, multiplier: 1, isPair: false, color: '#38bdf8', pts: 20 };
            else res = { text: `합산 ${sum}점`, multiplier: 1, isPair: false, color: '#94a3b8', pts: 10 };
        }
        setEvalResult(res);

        emitLiveGameStream({
            socket, pin, gameId: 'card_poker', nickname, groupId,
            baseScore: initialBaseRef.current, roundScore,
            isAlive: true, isFinished: false, updateRoomScore: false,
            gameData: {
                statusText: `🃏 1번 카드 [${s1.symbol}${v1}] 확인 · 오픈 대기 중`,
                progressPct: Math.min(95, Math.max(10, handsPlayed * 15)),
                card1: `${s1.symbol}${v1}`,
                handsPlayed
            }
        });
    };

    useEffect(() => {
        dealNewHand();
    }, []);

    const handleOpenCard2 = () => {
        if (isCard2Open || !evalResult || !card1 || !card2) return;
        setIsCard2Open(true);
        const nextHands = handsPlayed + 1;
        setHandsPlayed(nextHands);
        const earned = Math.round((evalResult.pts || 15) * (bet / 10));
        const nextRoundScore = roundScore + earned;
        setRoundScore(nextRoundScore);
        playSound(evalResult.isPair ? 'correct' : 'submit');

        emitLiveGameStream({
            socket, pin, gameId: 'card_poker', nickname, groupId,
            baseScore: initialBaseRef.current, roundScore: nextRoundScore,
            isAlive: true, isFinished: false, onScoreUpdate,
            gameData: {
                statusText: `🃏 [${card1.suit.symbol}${card1.val} + ${card2.suit.symbol}${card2.val}] ${evalResult.text} (+${earned}점)`,
                progressPct: Math.min(100, nextHands * 15),
                handText: evalResult.text,
                handsPlayed: nextHands
            }
        });
    };

    return (
        <div style={{ padding: '1rem', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '14px' }}>
            <div style={{ background: '#1e1b4b', borderRadius: '24px', padding: '20px 24px', width: '100%', maxWidth: '380px', color: 'white', textAlign: 'center', border: '3px solid #6366f1', boxShadow: '0 8px 25px rgba(0,0,0,0.3)' }}>
                <div style={{ fontSize: '0.85rem', color: '#c7d2fe', fontWeight: 'bold', marginBottom: '8px' }}>
                    ⭐ 럭키 카드 배틀 (획득 점수: +{roundScore}점)
                </div>

                {/* Cards View */}
                <div style={{ display: 'flex', justifyContent: 'center', gap: '12px', marginBottom: '16px' }}>
                    {card1 && (
                        <div style={{
                            width: '75px',
                            height: '110px',
                            background: 'white',
                            borderRadius: '12px',
                            border: '2px solid #cbd5e1',
                            padding: '6px',
                            display: 'flex',
                            flexDirection: 'column',
                            justifyContent: 'space-between',
                            color: card1.suit.color,
                            fontWeight: 'bold',
                            boxShadow: '0 6px 12px rgba(0,0,0,0.2)'
                        }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                <span style={{ fontSize: '1.25rem' }}>{card1.val}</span>
                                <span>{card1.suit.symbol}</span>
                            </div>
                            <span style={{ fontSize: '2.2rem', textAlign: 'center' }}>{card1.suit.symbol}</span>
                            <div style={{ fontSize: '0.75rem', textAlign: 'right', opacity: 0.6 }}>공개</div>
                        </div>
                    )}

                    {card2 && (
                        isCard2Open ? (
                            <div className="card-flip-open" style={{
                                width: '75px',
                                height: '110px',
                                background: '#fef3c7',
                                borderRadius: '12px',
                                border: '2px solid #f59e0b',
                                padding: '6px',
                                display: 'flex',
                                flexDirection: 'column',
                                justifyContent: 'space-between',
                                color: card2.suit.color,
                                fontWeight: 'bold',
                                boxShadow: '0 0 15px #f59e0b'
                            }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                    <span style={{ fontSize: '1.25rem' }}>{card2.val}</span>
                                    <span>{card2.suit.symbol}</span>
                                </div>
                                <span style={{ fontSize: '2.2rem', textAlign: 'center' }}>{card2.suit.symbol}</span>
                                <div style={{ fontSize: '0.75rem', textAlign: 'right', color: '#2563eb' }}>오픈</div>
                            </div>
                        ) : (
                            <div
                                onClick={handleOpenCard2}
                                style={{
                                    width: '75px',
                                    height: '110px',
                                    background: 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)',
                                    borderRadius: '12px',
                                    border: '2px dashed #93c5fd',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    cursor: 'pointer',
                                    boxShadow: '0 6px 12px rgba(0,0,0,0.3)'
                                }}
                            >
                                <span style={{ fontSize: '1.8rem' }}>⭐</span>
                                <span style={{ fontSize: '0.7rem', color: '#dbeafe', marginTop: '4px' }}>터치시 오픈</span>
                            </div>
                        )
                    )}
                </div>

                {isCard2Open && evalResult && (
                    <div style={{
                        background: 'rgba(0,0,0,0.7)',
                        border: `2px solid ${evalResult.color}`,
                        borderRadius: '14px',
                        padding: '10px',
                        marginBottom: '14px'
                    }}>
                        <div style={{ fontSize: '1.25rem', fontWeight: '900', color: evalResult.color }}>
                            {evalResult.text}
                            {evalResult.isPair && <span style={{ color: '#fef08a', marginLeft: '6px' }}>({evalResult.multiplier}배 보너스!)</span>}
                        </div>
                    </div>
                )}

                <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
                    <button
                        onClick={() => { setBet(prev => Math.min(30, prev + 10)); }}
                        disabled={isFolded || isCard2Open}
                        style={{ padding: '8px 16px', borderRadius: '10px', background: '#10b981', border: 'none', color: 'white', fontWeight: 'bold', cursor: 'pointer' }}
                    >
                        ⭐ 도전 (+10)
                    </button>
                    <button
                        onClick={handleOpenCard2}
                        style={{ padding: '8px 16px', borderRadius: '10px', background: '#3b82f6', border: 'none', color: 'white', fontWeight: 'bold', cursor: 'pointer' }}
                    >
                        👀 카드 오픈
                    </button>
                    <button
                        onClick={() => { setIsFolded(true); dealNewHand(); }}
                        disabled={isFolded}
                        style={{ padding: '8px 16px', borderRadius: '10px', background: '#64748b', border: 'none', color: 'white', fontWeight: 'bold', cursor: 'pointer' }}
                    >
                        🛡️ 패스
                    </button>
                </div>

                <button
                    onClick={dealNewHand}
                    style={{ marginTop: '14px', width: '100%', padding: '10px', borderRadius: '12px', background: 'rgba(255,255,255,0.15)', border: '1px solid rgba(255,255,255,0.25)', color: 'white', fontWeight: 'bold', cursor: 'pointer' }}
                >
                    🔄 새 카드 받기
                </button>
            </div>
        </div>
    );
}

export function GoStopGame({ socket, pin, nickname, groupId, baseScore = 0, onScoreUpdate }) {
    const HWATU = [
        { name: '송학 (일광)', type: '광', points: 30 },
        { name: '매조 (홍단)', type: '홍단', points: 20 },
        { name: '사쿠라 (벚꽃)', type: '광', points: 30 },
        { name: '등나무 (초단)', type: '초단', points: 10 },
        { name: '창포 (열끗)', type: '멍텅구리', points: 15 },
        { name: '장미 (피)', type: '피', points: 10 },
        { name: '홍싸리 (홍단)', type: '홍단', points: 20 },
        { name: '공산 (팔광)', type: '광', points: 30 },
        { name: '국진 (쌍피)', type: '피', points: 20 },
        { name: '단풍 (청단)', type: '청단', points: 20 },
        { name: '오동 (똥광)', type: '광', points: 30 },
        { name: '비 (비광)', type: '광', points: 25 }
    ];
    const [card, setCard] = useState(null);
    const [totalScore, setTotalScore] = useState(0);
    const [draws, setDraws] = useState(0);
    const initialBaseRef = useRef(baseScore);

    useEffect(() => {
        emitLiveGameStream({
            socket, pin, gameId: 'gostop', nickname, groupId,
            baseScore: initialBaseRef.current, roundScore: 0,
            isAlive: true, isFinished: false, updateRoomScore: false,
            gameData: { statusText: '🎴 화투 패 뒤집기 대기 중', progressPct: 5, draws: 0 }
        });
    }, []);
    
    const drawCard = () => {
        const picked = HWATU[Math.floor(Math.random() * HWATU.length)];
        const nextTotal = totalScore + picked.points;
        const nextDraws = draws + 1;
        setCard(picked);
        setTotalScore(nextTotal);
        setDraws(nextDraws);
        playSound(picked.type === '광' ? 'correct' : 'submit');
        emitLiveGameStream({
            socket, pin, gameId: 'gostop', nickname, groupId,
            baseScore: initialBaseRef.current, roundScore: nextTotal,
            isAlive: true, isFinished: false, onScoreUpdate,
            gameData: {
                statusText: `🎴 [${picked.type}] ${picked.name} 획득! (+${picked.points}점)`,
                progressPct: Math.min(100, nextDraws * 10),
                lastCard: picked.name,
                draws: nextDraws
            }
        });
    };
    
    return (
        <div style={{ padding: '1rem' }}>
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '2rem' }}>
                {card ? (
                    <div 
                        className="animate-pop-in"
                        style={{
                            width: '90px',
                            height: '140px',
                            background: '#dc2626',
                            border: '3px solid #7f1d1d',
                            borderRadius: '8px',
                            display: 'flex',
                            flexDirection: 'column',
                            justifyContent: 'space-between',
                            padding: '8px',
                            color: 'white',
                            fontWeight: 'bold',
                            boxShadow: '0 10px 15px rgba(220,38,38,0.2)'
                        }}
                    >
                        <span style={{ fontSize: '0.8rem', textAlign: 'left' }}>{card.type}</span>
                        <span style={{ fontSize: '1.1rem', textAlign: 'center', margin: 'auto 0' }}>{card.name}</span>
                        <span style={{ fontSize: '0.9rem', textAlign: 'right' }}>+{card.points}점</span>
                    </div>
                ) : (
                    <div style={{ width: '90px', height: '140px', background: '#cbd5e1', border: '3px dashed #94a3b8', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#64748b', fontWeight: 'bold' }}>
                        화투패
                    </div>
                )}
            </div>
            
            <button onClick={drawCard} className="primary-btn" style={{ width: '100%', background: '#dc2626', color: 'white', border: 'none', padding: '12px' }}>
                화투 패 뒤집기! 🎴
            </button>
            
            <div style={{ marginTop: '1.5rem', background: '#fff5f5', border: '2px solid #fca5a5', borderRadius: '12px', padding: '1rem' }}>
                <span>이번 게임 획득 점수: <strong style={{ color: '#dc2626', fontSize: '1.5rem' }}>+{totalScore}점</strong></span>
            </div>
        </div>
    );
}

export function OthelloGame({ socket, pin, nickname, groupId, baseScore = 0, onScoreUpdate }) {
    const [board, setBoard] = useState(Array(36).fill(null)); // 6x6 board
    const [isBlack, setIsBlack] = useState(true);
    const [roundScore, setRoundScore] = useState(0);
    const initialBaseRef = useRef(baseScore);
    
    useEffect(() => {
        const nextBoard = Array(36).fill(null);
        nextBoard[14] = '⚪';
        nextBoard[15] = '⚫';
        nextBoard[20] = '⚫';
        nextBoard[21] = '⚪';
        setBoard(nextBoard);
        emitLiveGameStream({
            socket, pin, gameId: 'othello', nickname, groupId,
            baseScore: initialBaseRef.current, roundScore: 0,
            isAlive: true, isFinished: false, updateRoomScore: false,
            gameData: { statusText: '⚫⚪ 오셀로 대국 시작 (6x6)', progressPct: 10, pieces: 4 }
        });
    }, []);
    
    const clickCell = (idx) => {
        if (board[idx]) return;
        const nextBoard = [...board];
        nextBoard[idx] = isBlack ? '⚫' : '⚪';
        setBoard(nextBoard);
        setIsBlack(!isBlack);
        const pieces = nextBoard.filter(Boolean).length;
        const blackCnt = nextBoard.filter(c => c === '⚫').length;
        const whiteCnt = nextBoard.filter(c => c === '⚪').length;
        const nextRoundScore = roundScore + 10;
        setRoundScore(nextRoundScore);
        playSound('submit');
        emitLiveGameStream({
            socket, pin, gameId: 'othello', nickname, groupId,
            baseScore: initialBaseRef.current, roundScore: nextRoundScore,
            isAlive: true, isFinished: pieces >= 36, onScoreUpdate,
            gameData: {
                statusText: `⚫${blackCnt} : ⚪${whiteCnt} (${pieces}/36칸 착수)`,
                progressPct: Math.min(100, Math.round((pieces / 36) * 100)),
                blackCnt,
                whiteCnt
            }
        });
    };
    
    return (
        <div style={{ padding: '0.5rem' }}>
            <p style={{ margin: '0 0 10px 0', fontSize: '0.95rem', fontWeight: 'bold' }}>
                차례: {isBlack ? '⚫ 흑돌' : '⚪ 백돌'} (+{roundScore}점)
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: '4px', background: '#16a34a', padding: '8px', borderRadius: '12px', border: '3px solid #14532d' }}>
                {board.map((cell, idx) => (
                    <div
                        key={idx}
                        onClick={() => clickCell(idx)}
                        style={{
                            height: '48px',
                            background: '#15803d',
                            border: '1px solid #14532d',
                            borderRadius: '4px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '2rem',
                            cursor: 'pointer'
                        }}
                    >
                        {cell}
                    </div>
                ))}
            </div>
            <button onClick={() => {
                const nextBoard = Array(36).fill(null);
                nextBoard[14] = '⚪'; nextBoard[15] = '⚫'; nextBoard[20] = '⚫'; nextBoard[21] = '⚪';
                setBoard(nextBoard);
                setIsBlack(true);
            }} className="glass-button" style={{ width: '100%', marginTop: '1rem' }}>리셋하기</button>
        </div>
    );
}

// BrickBreakerGame is imported from ../components/BrickBreakerGame

export function MemoryGame({ socket, pin, nickname, groupId, baseScore = 0, onScoreUpdate }) {
    const [sequence, setSequence] = useState([]);
    const [userSequence, setUserSequence] = useState([]);
    const [gameState, setGameState] = useState('idle'); // 'idle', 'showing', 'playing', 'gameover'
    const [activeColor, setActiveColor] = useState(null);
    const [score, setScore] = useState(0);
    const initialBaseRef = useRef(baseScore);

    const colors = ['red', 'green', 'blue', 'yellow'];
    const colorStyles = {
        red: { bg: '#ef4444', active: '#fca5a5' },
        green: { bg: '#22c55e', active: '#86efac' },
        blue: { bg: '#3b82f6', active: '#93c5fd' },
        yellow: { bg: '#eab308', active: '#fde047' }
    };

    const playSequence = async (seq) => {
        setGameState('showing');
        for (let i = 0; i < seq.length; i++) {
            const color = seq[i];
            setActiveColor(color);
            playSound('submit');
            await new Promise(r => setTimeout(r, 550));
            setActiveColor(null);
            await new Promise(r => setTimeout(r, 180));
        }
        setGameState('playing');
    };

    const startGame = () => {
        playSound('submit');
        const firstColor = colors[Math.floor(Math.random() * 4)];
        const newSeq = [firstColor];
        setSequence(newSeq);
        setUserSequence([]);
        setScore(0);
        emitLiveGameStream({
            socket, pin, gameId: 'memory_game', nickname, groupId,
            baseScore: initialBaseRef.current, roundScore: 0,
            isAlive: true, isFinished: false, updateRoomScore: false,
            gameData: { statusText: '🧠 1단계 색상 패턴 기억 중...', progressPct: 10, level: 1 }
        });
        playSequence(newSeq);
    };

    useEffect(() => {
        startGame();
    }, []);

    const handlePanelClick = (color) => {
        if (gameState !== 'playing') return;
        playSound('submit');
        
        setActiveColor(color);
        setTimeout(() => setActiveColor(null), 250);

        const newUserSeq = [...userSequence, color];
        setUserSequence(newUserSeq);

        const currentIndex = newUserSeq.length - 1;
        if (newUserSeq[currentIndex] !== sequence[currentIndex]) {
            setGameState('gameover');
            playSound('wrong');
            emitLiveGameStream({
                socket, pin, gameId: 'memory_game', nickname, groupId,
                baseScore: initialBaseRef.current, roundScore: score * 20,
                isAlive: false, isFinished: true, onScoreUpdate,
                gameData: {
                    statusText: `💥 패턴 실패 (최종 ${score}단계 클리어)`,
                    progressPct: Math.min(100, score * 12),
                    level: score
                }
            });
            return;
        }

        if (newUserSeq.length === sequence.length) {
            const nextScore = score + 1;
            setScore(nextScore);
            playSound('correct');
            emitLiveGameStream({
                socket, pin, gameId: 'memory_game', nickname, groupId,
                baseScore: initialBaseRef.current, roundScore: nextScore * 20,
                isAlive: true, isFinished: false, onScoreUpdate,
                gameData: {
                    statusText: `🧠 ${nextScore}단계 패턴 성공! (+${nextScore * 20}점)`,
                    progressPct: Math.min(100, nextScore * 12),
                    level: nextScore
                }
            });
            setTimeout(() => {
                const nextColor = colors[Math.floor(Math.random() * 4)];
                const nextSeq = [...sequence, nextColor];
                setSequence(nextSeq);
                setUserSequence([]);
                playSequence(nextSeq);
            }, 900);
        }
    };

    return (
        <div style={{ textAlign: 'center', width: '100%', maxWidth: '400px', margin: '0 auto' }}>
            <p style={{ margin: '0 0 1.2rem 0', color: 'var(--text-muted)', fontWeight: '700' }}>
                {gameState === 'idle' && '시작 버튼을 누르면 색상 순서가 재생됩니다.'}
                {gameState === 'showing' && `👀 ${sequence.length}단계 순서를 잘 기억해 주세요!`}
                {gameState === 'playing' && `👆 기억한 순서대로 패널을 터치하세요! (${userSequence.length}/${sequence.length})`}
                {gameState === 'gameover' && `게임 오버! 클리어 단계: ${score}단계 (+${score * 20}점)`}
            </p>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', margin: '0 auto 1.5rem auto', width: '240px', height: '240px' }}>
                {colors.map(color => (
                    <div
                        key={color}
                        onClick={() => handlePanelClick(color)}
                        style={{
                            background: activeColor === color ? colorStyles[color].active : colorStyles[color].bg,
                            borderRadius: '24px',
                            cursor: gameState === 'playing' ? 'pointer' : 'default',
                            boxShadow: '0 6px 12px rgba(0,0,0,0.1)',
                            border: activeColor === color ? '4px solid white' : '4px solid transparent',
                            transition: 'all 0.15s ease',
                            transform: activeColor === color ? 'scale(0.95)' : 'none'
                        }}
                    />
                ))}
            </div>

            <div style={{ display: 'flex', justifyContent: 'center', gap: '15px', alignItems: 'center' }}>
                <span style={{ fontSize: '1.2rem', fontWeight: 'bold' }}>획득 점수: +{score * 20}점</span>
                {(gameState === 'idle' || gameState === 'gameover') && (
                    <button onClick={startGame} className="primary-btn" style={{ padding: '10px 20px', borderRadius: '12px' }}>
                        {gameState === 'gameover' ? '다시 도전' : '게임 시작'}
                    </button>
                )}
            </div>
        </div>
    );
}

export function PassBombGame({ socket, pin, nickname, groupId, baseScore = 0, onScoreUpdate }) {
    const [timeLeft, setTimeLeft] = useState(0);
    const [holder, setHolder] = useState(nickname || '참가자 A');
    const [gameState, setGameState] = useState('idle'); // 'idle', 'running', 'exploded'
    const [passCount, setPassCount] = useState(0);
    const [roundScore, setRoundScore] = useState(0);
    const initialBaseRef = useRef(baseScore);

    const players = ['참가자 A', '참가자 B', '참가자 C', nickname || '나'];

    const startGame = () => {
        playSound('submit');
        setGameState('running');
        setHolder(nickname || '나');
        const seconds = Math.floor(Math.random() * 8) + 8;
        setTimeLeft(seconds);
        emitLiveGameStream({
            socket, pin, gameId: 'pass_bomb', nickname, groupId,
            baseScore: initialBaseRef.current, roundScore,
            isAlive: true, isFinished: false, updateRoomScore: false,
            gameData: { statusText: '💣 폭탄 돌리기 시작! 빠르게 패스하세요!', progressPct: 15, passCount }
        });
    };

    useEffect(() => {
        startGame();
    }, []);

    useEffect(() => {
        let interval = null;
        if (gameState === 'running' && timeLeft > 0) {
            interval = setInterval(() => {
                setTimeLeft(prev => {
                    if (prev <= 1) {
                        clearInterval(interval);
                        setGameState('exploded');
                        playSound('wrong');
                        const survived = holder !== (nickname || '나');
                        const bonus = survived ? 30 : 0;
                        const finalRound = roundScore + bonus;
                        setRoundScore(finalRound);
                        emitLiveGameStream({
                            socket, pin, gameId: 'pass_bomb', nickname, groupId,
                            baseScore: initialBaseRef.current, roundScore: finalRound,
                            isAlive: survived, isFinished: true, onScoreUpdate,
                            gameData: {
                                statusText: survived ? `🎉 폭탄 생존 성공! (총 ${passCount}회 패스)` : `💥 폭탄 폭발! (${passCount}회 패스)`,
                                progressPct: 100,
                                passCount
                            }
                        });
                        return 0;
                    }
                    return prev - 1;
                });
            }, 1000);
        }
        return () => clearInterval(interval);
    }, [gameState, timeLeft, holder]);

    const handlePass = () => {
        if (gameState !== 'running') return;
        playSound('submit');
        let nextHolder = holder;
        while (nextHolder === holder) {
            nextHolder = players[Math.floor(Math.random() * players.length)];
        }
        const nextPasses = passCount + 1;
        const nextRoundScore = roundScore + 10;
        setHolder(nextHolder);
        setPassCount(nextPasses);
        setRoundScore(nextRoundScore);
        emitLiveGameStream({
            socket, pin, gameId: 'pass_bomb', nickname, groupId,
            baseScore: initialBaseRef.current, roundScore: nextRoundScore,
            isAlive: true, isFinished: false, onScoreUpdate,
            gameData: {
                statusText: `💣 폭탄 패스 완료! (${nextPasses}회 성공 · 보유: ${nextHolder})`,
                progressPct: Math.min(95, nextPasses * 15),
                passCount: nextPasses
            }
        });
    };

    return (
        <div style={{ textAlign: 'center', width: '100%', maxWidth: '400px', margin: '0 auto' }}>
            <p style={{ margin: '0 0 1.2rem 0', color: 'var(--text-muted)', fontWeight: '700' }}>
                {gameState === 'running' && `폭탄이 터지기 전에 빠르게 패스하세요! (+${roundScore}점)`}
                {gameState === 'exploded' && `펑! 폭탄이 ${holder}의 손에서 터졌습니다! (+${roundScore}점)`}
            </p>

            <div style={{ padding: '2rem', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '24px', marginBottom: '1.5rem' }}>
                {gameState === 'running' ? (
                    <div>
                        <div style={{ fontSize: '5rem', animation: 'shake 0.5s infinite' }}>💣</div>
                        <h2 style={{ fontSize: '1.8rem', fontFamily: 'Jua, sans-serif', color: '#ef4444', margin: '1rem 0' }}>
                            {holder} 보유 중!
                        </h2>
                        <button onClick={handlePass} className="primary-btn" style={{ padding: '12px 24px', fontSize: '1.1rem', borderRadius: '12px' }}>
                            폭탄 패스! (+10점) ➔
                        </button>
                    </div>
                ) : (
                    <div>
                        <div style={{ fontSize: '5rem' }}>{gameState === 'exploded' ? '💥' : '💣'}</div>
                        <h2 style={{ fontSize: '1.5rem', fontFamily: 'Jua, sans-serif', margin: '1.5rem 0' }}>
                            {gameState === 'exploded' ? `${holder} 폭발!` : '대기 중'}
                        </h2>
                        <button onClick={startGame} className="primary-btn" style={{ padding: '12px 24px', fontSize: '1.1rem', borderRadius: '12px' }}>
                            다시 도전하기
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}

export function SpotDifferenceMiniGame({ socket, pin, nickname, groupId, baseScore = 0, onScoreUpdate }) {
    const STAGE_PAIRS = [
        { title: '우주 탐사선 점검', base: '🚀', diff: '🛸', size: 16 },
        { title: '보석 광산 탐색', base: '💎', diff: '🔮', size: 16 },
        { title: '클로버 행운 찾기', base: '☘️', diff: '🍀', size: 20 },
        { title: '심해 잠수함 레이더', base: '🐟', diff: '🐠', size: 20 },
        { title: '왕실 보물창고 검수', base: '👑', diff: '🏆', size: 25 }
    ];
    const [stageIdx, setStageIdx] = useState(0);
    const [diffTargets, setDiffTargets] = useState([]);
    const [found, setFound] = useState([]);
    const [roundScore, setRoundScore] = useState(0);
    const [allCleared, setAllCleared] = useState(false);
    const initialBaseRef = useRef(baseScore);

    const setupStage = (idx, currentScore = roundScore) => {
        const st = STAGE_PAIRS[idx] || STAGE_PAIRS[0];
        const targets = [];
        while (targets.length < 3) {
            const r = Math.floor(Math.random() * st.size);
            if (!targets.includes(r)) targets.push(r);
        }
        setDiffTargets(targets);
        setFound([]);
        emitLiveGameStream({
            socket, pin, gameId: 'spot_difference', nickname, groupId,
            baseScore: initialBaseRef.current, roundScore: currentScore,
            isAlive: true, isFinished: false, updateRoomScore: false,
            gameData: {
                statusText: `🔍 Stage ${idx + 1} (${st.title}) 탐색 중 (0/3 발견)`,
                progressPct: Math.round((idx / STAGE_PAIRS.length) * 100),
                stage: idx + 1,
                foundCount: 0
            }
        });
    };

    useEffect(() => {
        setupStage(0, 0);
    }, []);

    const handleCellTap = (i) => {
        if (allCleared || found.includes(i)) return;
        if (diffTargets.includes(i)) {
            const nextFound = [...found, i];
            const nextRoundScore = roundScore + 20;
            setFound(nextFound);
            setRoundScore(nextRoundScore);
            playSound('correct');

            if (nextFound.length >= 3) {
                if (stageIdx + 1 < STAGE_PAIRS.length) {
                    const nextStage = stageIdx + 1;
                    setStageIdx(nextStage);
                    emitLiveGameStream({
                        socket, pin, gameId: 'spot_difference', nickname, groupId,
                        baseScore: initialBaseRef.current, roundScore: nextRoundScore,
                        isAlive: true, isFinished: false, onScoreUpdate,
                        gameData: {
                            statusText: `✨ Stage ${stageIdx + 1} 클리어! → Stage ${nextStage + 1} 진입`,
                            progressPct: Math.round(((stageIdx + 1) / STAGE_PAIRS.length) * 100),
                            stage: nextStage + 1,
                            foundCount: 3
                        }
                    });
                    setTimeout(() => setupStage(nextStage, nextRoundScore), 450);
                } else {
                    setAllCleared(true);
                    const finalScore = nextRoundScore + 40;
                    setRoundScore(finalScore);
                    emitLiveGameStream({
                        socket, pin, gameId: 'spot_difference', nickname, groupId,
                        baseScore: initialBaseRef.current, roundScore: finalScore,
                        isAlive: true, isFinished: true, onScoreUpdate,
                        gameData: {
                            statusText: `🏆 전 스테이지(5단계) 숨은 그림 모두 발견!`,
                            progressPct: 100,
                            stage: STAGE_PAIRS.length,
                            foundCount: 3
                        }
                    });
                }
            } else {
                emitLiveGameStream({
                    socket, pin, gameId: 'spot_difference', nickname, groupId,
                    baseScore: initialBaseRef.current, roundScore: nextRoundScore,
                    isAlive: true, isFinished: false, onScoreUpdate,
                    gameData: {
                        statusText: `🔍 Stage ${stageIdx + 1} 숨은 그림 ${nextFound.length}/3 발견!`,
                        progressPct: Math.round(((stageIdx + nextFound.length / 3) / STAGE_PAIRS.length) * 100),
                        stage: stageIdx + 1,
                        foundCount: nextFound.length
                    }
                });
            }
        } else {
            playSound('wrong');
        }
    };

    const st = STAGE_PAIRS[stageIdx] || STAGE_PAIRS[0];
    const cols = st.size === 25 ? 5 : 4;

    return (
        <div style={{ padding: '0.5rem', textAlign: 'center' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px', fontWeight: '800', fontSize: '0.95rem' }}>
                <span>STAGE {stageIdx + 1} / {STAGE_PAIRS.length} ({st.title})</span>
                <span style={{ color: '#2563eb' }}>발견: {found.length}/3 (+{roundScore}점)</span>
            </div>
            <p style={{ margin: '0 0 12px 0', fontSize: '0.88rem', color: 'var(--text-muted)' }}>
                다른 모양(<strong>{st.diff}</strong>) 3개를 빠르게 찾아 터치하세요!
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: `repeat(${cols}, 1fr)`, gap: '8px', marginBottom: '14px' }}>
                {Array.from({ length: st.size }).map((_, i) => {
                    const isDiff = diffTargets.includes(i);
                    const isFound = found.includes(i);
                    return (
                        <button
                            key={i}
                            type="button"
                            onClick={() => handleCellTap(i)}
                            style={{
                                height: '56px',
                                borderRadius: '12px',
                                border: isFound ? '3px solid #10b981' : '2px solid #cbd5e1',
                                background: isFound ? '#d1fae5' : '#f8fafc',
                                fontSize: '1.75rem',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center'
                            }}
                        >
                            {isDiff ? st.diff : st.base}
                        </button>
                    );
                })}
            </div>
            {allCleared && (
                <button
                    type="button"
                    onClick={() => { setAllCleared(false); setStageIdx(0); setupStage(0, roundScore); }}
                    className="primary-btn"
                    style={{ width: '100%', padding: '12px', borderRadius: '12px' }}
                >
                    🔄 보너스 라운드 계속 도전하기
                </button>
            )}
        </div>
    );
}

export function FortuneMiniGame({ socket, pin, nickname, groupId, baseScore = 0, onScoreUpdate }) {
    const FORTUNES = [
        { msg: '🌟 대길(大吉)! 오늘 모든 퀴즈와 게임에서 행운이 폭발합니다!', pts: 50 },
        { msg: '💎 황금 행운! 뜻밖의 찬스로 순위가 급상승할 운세입니다!', pts: 40 },
        { msg: '🍀 행운 가득! 침착하게 선택하면 최고 기록을 달성합니다!', pts: 30 },
        { msg: '🔥 열정 운세! 끝까지 포기하지 않으면 역전승이 찾아옵니다!', pts: 35 },
        { msg: '🌈 무지개 행운! 주변 동료들과 함께 기쁨을 나눌 하루입니다!', pts: 45 }
    ];
    const [opened, setOpened] = useState(null);
    const [roundScore, setRoundScore] = useState(0);
    const [count, setCount] = useState(0);
    const initialBaseRef = useRef(baseScore);

    useEffect(() => {
        emitLiveGameStream({
            socket, pin, gameId: 'fortune', nickname, groupId,
            baseScore: initialBaseRef.current, roundScore: 0,
            isAlive: true, isFinished: false, updateRoomScore: false,
            gameData: { statusText: '🥠 행운의 포춘 쿠키 선택 대기 중', progressPct: 10 }
        });
    }, []);

    const crackCookie = () => {
        const pick = FORTUNES[Math.floor(Math.random() * FORTUNES.length)];
        const nextCount = count + 1;
        const nextRoundScore = roundScore + pick.pts;
        setOpened(pick);
        setCount(nextCount);
        setRoundScore(nextRoundScore);
        playSound('correct');
        emitLiveGameStream({
            socket, pin, gameId: 'fortune', nickname, groupId,
            baseScore: initialBaseRef.current, roundScore: nextRoundScore,
            isAlive: true, isFinished: false, onScoreUpdate,
            gameData: {
                statusText: `🥠 ${pick.msg} (+${pick.pts}점)`,
                progressPct: Math.min(100, nextCount * 25),
                fortune: pick.msg
            }
        });
    };

    return (
        <div style={{ padding: '1rem', textAlign: 'center' }}>
            <div style={{ fontSize: '4.5rem', marginBottom: '0.8rem', cursor: 'pointer' }} onClick={crackCookie}>
                🥠
            </div>
            <button onClick={crackCookie} className="primary-btn" style={{ width: '100%', padding: '14px', borderRadius: '14px', fontSize: '1.15rem', fontWeight: '800' }}>
                포춘 쿠키 깨뜨리기! 🥠
            </button>
            {opened && (
                <div style={{ marginTop: '1.2rem', padding: '1.2rem', background: '#fef3c7', border: '2px solid #f59e0b', borderRadius: '16px' }}>
                    <div style={{ fontWeight: '900', fontSize: '1.15rem', color: '#92400e', marginBottom: '6px' }}>{opened.msg}</div>
                    <div style={{ fontWeight: '800', color: '#b45309' }}>행운 보너스 +{opened.pts}점 (누적 +{roundScore}점)</div>
                </div>
            )}
        </div>
    );
}

export function LadderMiniGame({ socket, pin, nickname, groupId, baseScore = 0, onScoreUpdate }) {
    const REWARDS = [
        { label: '🏆 황금 보물상자 (+50점)', pts: 50 },
        { label: '💎 다이아몬드 (+40점)', pts: 40 },
        { label: '🍀 네잎클로버 (+30점)', pts: 30 },
        { label: '⭐ 스타 보너스 (+20점)', pts: 20 }
    ];
    const [selectedLane, setSelectedLane] = useState(null);
    const [reward, setReward] = useState(null);
    const [roundScore, setRoundScore] = useState(0);
    const [climbs, setClimbs] = useState(0);
    const initialBaseRef = useRef(baseScore);

    useEffect(() => {
        emitLiveGameStream({
            socket, pin, gameId: 'ladder', nickname, groupId,
            baseScore: initialBaseRef.current, roundScore: 0,
            isAlive: true, isFinished: false, updateRoomScore: false,
            gameData: { statusText: '🪜 사다리 출발선 선택 대기 중', progressPct: 10 }
        });
    }, []);

    const pickLane = (laneIdx) => {
        setSelectedLane(laneIdx);
        const picked = REWARDS[Math.floor(Math.random() * REWARDS.length)];
        const nextClimbs = climbs + 1;
        const nextRoundScore = roundScore + picked.pts;
        setReward(picked);
        setClimbs(nextClimbs);
        setRoundScore(nextRoundScore);
        playSound('correct');
        emitLiveGameStream({
            socket, pin, gameId: 'ladder', nickname, groupId,
            baseScore: initialBaseRef.current, roundScore: nextRoundScore,
            isAlive: true, isFinished: false, onScoreUpdate,
            gameData: {
                statusText: `🪜 ${laneIdx + 1}번 사다리 → ${picked.label}`,
                progressPct: Math.min(100, nextClimbs * 25),
                lane: laneIdx + 1,
                reward: picked.label
            }
        });
    };

    return (
        <div style={{ padding: '1rem', textAlign: 'center' }}>
            <p style={{ margin: '0 0 12px 0', color: 'var(--text-muted)', fontWeight: '700' }}>
                출발할 사다리 번호(1~4번)를 선택하세요! (획득: +{roundScore}점)
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '10px', marginBottom: '1.2rem' }}>
                {[0, 1, 2, 3].map(lane => (
                    <button
                        key={lane}
                        type="button"
                        onClick={() => pickLane(lane)}
                        style={{
                            padding: '16px 8px',
                            borderRadius: '14px',
                            border: selectedLane === lane ? '3px solid #2563eb' : '2px solid #cbd5e1',
                            background: selectedLane === lane ? '#dbeafe' : '#f8fafc',
                            fontWeight: '900',
                            fontSize: '1.15rem',
                            color: '#1e293b',
                            cursor: 'pointer'
                        }}
                    >
                        🪜 {lane + 1}번
                    </button>
                ))}
            </div>
            {reward && (
                <div style={{ padding: '1.2rem', background: '#ecfdf5', border: '2px solid #10b981', borderRadius: '16px' }}>
                    <div style={{ fontSize: '1.2rem', fontWeight: '900', color: '#065f46' }}>{reward.label}</div>
                </div>
            )}
        </div>
    );
}

