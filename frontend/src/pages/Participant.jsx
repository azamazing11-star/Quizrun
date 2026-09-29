import React, { useState, useEffect, useRef } from 'react';
import { User, KeyRound, AlertCircle, CheckCircle, XCircle, ArrowLeft } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';
import { playSound } from '../utils/audio';
import { getChosung } from '../utils/chosung';
import Confetti from 'react-confetti';
import MediaViewer from '../components/MediaViewer';
import StockGame from '../components/StockGame';

export default function Participant({ socket }) {
    const location = useLocation();
    const navigate = useNavigate();
    const [pin, setPin] = useState('');
    const [nickname, setNickname] = useState(localStorage.getItem('quizrun_nickname') || '');
    const [error, setError] = useState(null);
    const [currentPoints, setCurrentPoints] = useState(10);
    const [autoReconnecting, setAutoReconnecting] = useState(false);
    const hasAttemptedAutoJoin = useRef(false);

    const [gameState, setGameState] = useState('join');
    const [hasJoined, setHasJoined] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [socketConnected, setSocketConnected] = useState(socket.connected);
    const [leaderboard, setLeaderboard] = useState([]);
    const [myScore, setMyScore] = useState(0);
    const [myStatus, setMyStatus] = useState(null);
    const [isBuzzerMode, setIsBuzzerMode] = useState(false);
    const [quizType, setQuizType] = useState('mcq');
    const [groupId, setGroupId] = useState(null);

    // --- MULTIPLAYER GAME STATES ---
    const [isGame, setIsGame] = useState(false);
    const [gameId, setGameId] = useState('');
    const [gameTimeLeft, setGameTimeLeft] = useState(15);

    useEffect(() => {
        const params = new URLSearchParams(location.search);
        const p = params.get('pin');
        if (p) setPin(p);

        // Auto-reconnect when scanning QR code with saved nickname
        const savedNickname = localStorage.getItem('quizrun_nickname');
        if (p && savedNickname && socketConnected && !hasJoined && !hasAttemptedAutoJoin.current) {
            hasAttemptedAutoJoin.current = true;
            setAutoReconnecting(true);
            socket.emit('participant:joinRoom', { pin: p, nickname: savedNickname }, (res) => {
                setAutoReconnecting(false);
                if (res.success) {
                    setHasJoined(true);
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
        const onConnect = () => {
            setSocketConnected(true);
            setIsLoading(false);

            // AUTO-REJOIN: If connection dropped and restored, re-register this new socket.id with existing participant session
            const currentPin = pinRef.current || new URLSearchParams(window.location.search).get('pin') || sessionStorage.getItem('quizrun_pin');
            const currentNick = nicknameRef.current || localStorage.getItem('quizrun_nickname');
            if (currentPin && currentNick && (hasJoinedRef.current || sessionStorage.getItem('quizrun_joined') === 'true')) {
                console.log('[Auto-Rejoin] Socket reconnected, re-joining room:', currentPin, currentNick);
                socket.emit('participant:joinRoom', { pin: currentPin, nickname: currentNick }, (res) => {
                    if (res && res.success) {
                        setHasJoined(true);
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
                const me = data.participants.find(p => p.id === socket.id || (p.nickname && p.nickname === nickname));
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
            }
            if (data.isGame) {
                setIsGame(true);
            }
            let nextState = data.state;
            if (nextState === 'lobby') {
                nextState = (data.gameId || gameId) ? 'game_active' : 'waiting';
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
            setError('Host ended the game');
            setPin('');
            setGroupId(null);
        });

        socket.on('room:message', (data) => {
            if (data && data.event) {
                if (data.event === 'game:start') {
                    setIsGame(true);
                    setGameId(data.payload.gameId);
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
                } else if (data.event === 'game:word_bomb_end') {
                    setGameWinner(data.payload.winner);
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
                const me = updated.find(p => p.id === socket.id || (p.nickname && p.nickname === nickname));
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
        audio.volume = 0.15; // Set slightly lower volume for headphones/mobile speakers
        
        audio.play().catch(e => console.log('BGM play blocked on participant:', e));
        
        return () => {
            audio.pause();
        };
    }, [gameState, gameId]);

    const handleJoin = (e) => {
        e.preventDefault();
        if (!pin || !nickname) return;
        if (!socketConnected) {
            setError('서버와 연결되지 않았습니다. 잠시만 기다려주세요.');
            return;
        }

        setError(null);
        socket.emit('participant:joinRoom', { pin, nickname }, (res) => {
            if (res.success) {
                setHasJoined(true);
                localStorage.setItem('quizrun_nickname', nickname);
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
        if (!wordInput.trim()) return;
        playSound('submit');
        socket.emit('room:message', {
            pin,
            event: 'game:submit_word',
            payload: { word: wordInput }
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
    };

    const submitGuess = (e) => {
        e.preventDefault();
        if (!guessInput.trim()) return;
        playSound('submit');
        socket.emit('room:message', {
            pin,
            event: 'game:submit_guess',
            payload: { guess: guessInput }
        });
        setGuessInput('');
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
                <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '2px solid #e2e8f0', paddingBottom: '1rem', marginBottom: '1.5rem' }}>
                    <div style={{ fontWeight: 'bold' }}>👤 {nickname}</div>
                    <div style={{ fontWeight: 'bold', color: 'var(--secondary)' }}>🏆 {myScore}점</div>
                </div>

                {/* --- WORD BOMB PARTICIPANT UI --- */}
                {gameId === 'word_bomb' && (
                    <div>
                        {gameWinner ? (
                            <div className="animate-pop-in">
                                <div style={{ fontSize: '4rem' }}>👑</div>
                                <h2 style={{ fontSize: '2rem', fontFamily: 'Jua, sans-serif', color: 'var(--secondary)' }}>{gameWinner} 승리!</h2>
                                <p style={{ color: 'var(--text-muted)' }}>게임이 종료되었습니다.</p>
                            </div>
                        ) : (
                            <div>
                                <div style={{ fontSize: '3rem', margin: '0.5rem 0' }}>
                                    {isMyTurnWordBomb ? '💣 내 차례! ⏱️' + gameTimeLeft : '⏳ 대기 중'}
                                </div>
                                
                                <div style={{ background: '#fff1f2', border: '1px solid #ffe4e6', borderRadius: '20px', padding: '1.5rem', marginBottom: '1.5rem' }}>
                                    <h3 style={{ margin: 0, color: '#f43f5e', fontSize: '1rem' }}>제시어 글자</h3>
                                    <h1 style={{ fontSize: '4rem', margin: '0.5rem 0', color: '#e11d48', fontWeight: '900' }}>
                                        {gameSyllable}
                                    </h1>
                                    <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', margin: 0 }}>
                                        위 글자가 <strong>포함된</strong> 단어를 입력하세요!
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
                                            onChange={(e) => setWordInput(e.target.value)}
                                            style={{ 
                                                width: '100%', 
                                                padding: '12px', 
                                                borderRadius: '12px', 
                                                border: '2px solid #ef4444', 
                                                fontSize: '1.2rem',
                                                textAlign: 'center'
                                            }}
                                        />
                                        <button className="primary-btn" type="submit" style={{ background: '#ef4444', padding: '12px', borderRadius: '12px', fontSize: '1.1rem' }}>
                                            제출하기
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
                            {gameId === 'ladder' && '사다리 타기'}
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
                        </h2>

                        {gameId === 'yutnori' && <YutnoriGame />}
                        {gameId === 'card_match' && <CardMatchGame socket={socket} pin={pin} />}
                        {gameId === 'rock_paper_scissors' && <RpsGame />}
                        {gameId === 'whack_mole' && <WhackMoleGame />}
                        {gameId === 'omok' && <OmokGame />}
                        {gameId === 'minesweeper' && <MinesweeperGame />}
                        {gameId === 'stock_game' && <StockGame socket={socket} pin={pin} isHost={false} groupId={groupId} nickname={nickname} myScore={myScore} />}
                        {gameId === 'speed_numbers' && <SpeedNumbersGame />}
                        {gameId === 'janggi' && <JanggiGame />}
                        {gameId === 'chess' && <ChessGame />}
                        {(gameId === 'card_game' || gameId === 'card_poker') && <PokerGame />}
                        {gameId === 'gostop' && <GoStopGame />}
                        {gameId === 'othello' && <OthelloGame />}
                        {gameId === 'tetris' && <TetrisGame />}
                        {gameId === 'brick_breaker' && <BrickBreakerGame />}
                        {['memory_game', 'pass_bomb', 'ladder'].includes(gameId) && (
                            <div style={{ padding: '1.5rem', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '16px' }}>
                                <p style={{ color: 'var(--text-muted)', margin: 0, fontSize: '1.1rem' }}>
                                    호스트 화면을 참고하여 게임을 지켜봐 주세요!
                                </p>
                            </div>
                        )}
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

    if ((isGame || gameId) && (gameState === 'game_active' || gameState === 'playing')) {
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
            {/* Confetti for correct answer */}
            {showConfetti && <Confetti width={window.innerWidth} height={window.innerHeight} recycle={false} numberOfPieces={300} />}
            <div style={{ width: '100%', minHeight: '100vh', background: isBuzzerMode && groupId ? 'linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%)' : 'var(--bg)' }}>
                {/* Connection status badge for Participant */}
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

export function YutnoriGame() {
    const [result, setResult] = useState(null);
    const [yuts, setYuts] = useState([0, 0, 0, 0]); // 0 = flat, 1 = round
    const [history, setHistory] = useState([]);
    const [isRolling, setIsRolling] = useState(false);
    
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
                if (flats === 1) {
                    res = Math.random() < 0.25 ? '뒷도(빽도)' : '도';
                } else if (flats === 2) {
                    res = '개';
                } else if (flats === 3) {
                    res = '걸';
                } else if (flats === 4) {
                    res = '윷';
                } else if (flats === 0) {
                    res = '모';
                }
                
                setResult(res);
                setHistory(prev => [res, ...prev].slice(0, 10));
                setIsRolling(false);
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
                    <span style={{ fontSize: '0.9rem', color: '#b45309' }}>결과</span>
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

export function CardMatchGame({ socket, pin, isHost = false }) {
    const ALL_FLAGS = [
        '네덜란드.jpg', '대한민국.jpg', '덴마크.jpg', '독일.jpg', '러시아.jpg',
        '미국.jpg', '브라질.jpg', '스웨덴.jpg', '스위스.jpg', '스페인.jpg',
        '아르헨티나.jpg', '영국.jpg', '우루과이.jpg', '이탈리아.jpg', '인도.jpg',
        '중국.jpg', '캐나다.jpg', '파푸아뉴기니.jpg', '프랑스.jpg', '호주.jpg'
    ];

    const [cards, setCards] = useState([]);
    const [flipped, setFlipped] = useState([]);
    const [matched, setMatched] = useState([]);
    const [moves, setMoves] = useState(0);
    const [pickedFlags, setPickedFlags] = useState([]);
    useEffect(() => {
        initGame();
    }, []);

    const initGame = () => {
        // Pick 10 random flags from the 20 available flags
        const shuffledFlags = [...ALL_FLAGS].sort(() => Math.random() - 0.5);
        const picked = shuffledFlags.slice(0, 10);
        setPickedFlags(picked);
        
        const cardList = [...picked, ...picked]
            .map((flag, idx) => ({ id: idx, flag, isFlipped: false }))
            .sort(() => Math.random() - 0.5);
        setCards(cardList);
        setFlipped([]);
        setMatched([]);
        setMoves(0);
    };
    
    const notifyScore = (score, finished) => {
        if (socket && pin) {
            socket.emit('room:message', {
                pin,
                event: 'game:mini_progress',
                payload: {
                    score,
                    finished
                }
            });
        }
    };
    
    const handleCardClick = (idx) => {
        if (flipped.length === 2 || flipped.includes(idx) || matched.includes(idx)) return;
        
        // Play flip sound
        playSound('submit');
        
        const newFlipped = [...flipped, idx];
        setFlipped(newFlipped);
        
        if (newFlipped.length === 2) {
            setMoves(prev => prev + 1);
            const [first, second] = newFlipped;
            if (cards[first].flag === cards[second].flag) {
                const nextMatched = [...matched, first, second];
                setMatched(nextMatched);
                setFlipped([]);
                
                const finished = nextMatched.length === 20; // 10 pairs = 20 cards
                if (finished) {
                    playSound('fanfare');
                } else {
                    playSound('correct');
                }
                notifyScore(finished ? 100 : 10, finished);
            } else {
                playSound('wrong');
                setTimeout(() => setFlipped([]), 1000);
            }
        }
    };
    
    const resetGame = () => {
        initGame();
    };
    
    const isFinished = matched.length === 20;
    
    // Grid columns layout: 5 columns on desktop/Host, 4 columns on mobile
    const columnsCount = isHost ? 5 : 4;
    const cardFontSize = isHost ? '3rem' : '2rem';
    
    return (
        <div style={{ padding: '0.5rem', width: '100%', maxWidth: isHost ? '780px' : '100%', margin: isHost ? '0 auto' : '0' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1.2rem', fontSize: isHost ? '1.2rem' : '0.9rem', color: 'var(--text-muted)', fontWeight: 'bold' }}>
                <span>시도 횟수: <strong style={{ color: 'var(--primary)' }}>{moves}회</strong></span>
                <span>매칭 진행률: <strong style={{ color: 'var(--primary)' }}>{matched.length / 2} / 10</strong></span>
            </div>
            
            <div style={{ 
                display: 'grid', 
                gridTemplateColumns: `repeat(${columnsCount}, 1fr)`, 
                gap: isHost ? '15px' : '8px', 
                width: '100%',
                maxWidth: isHost ? '780px' : '100%',
                margin: isHost ? '0 auto 2rem auto' : '0 0 1.5rem 0'
            }}>
                {cards.map((c, idx) => {
                    const isOpen = flipped.includes(idx) || matched.includes(idx);
                    const countryName = c.flag.replace('.jpg', '');
                    return (
                        <div 
                            key={c.id}
                            onClick={() => handleCardClick(idx)}
                            style={{
                                aspectRatio: '3/2',
                                height: 'auto',
                                position: 'relative',
                                borderRadius: '12px',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                cursor: 'pointer',
                                transition: 'all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
                                transform: isOpen ? 'rotateY(180deg)' : 'none',
                                boxShadow: '0 4px 10px rgba(0,0,0,0.06)',
                                overflow: 'hidden',
                                background: isOpen ? 'white' : 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)',
                                border: isOpen ? '2px solid #e2e8f0' : '2px solid #2563eb'
                            }}
                        >
                            {isOpen ? (
                                <div style={{ 
                                    width: '100%', 
                                    height: '100%', 
                                    display: 'flex', 
                                    flexDirection: 'column', 
                                    transform: 'rotateY(180deg)' // Correct the card flip mirror effect
                                }}>
                                    <img 
                                        src={`/flag/${c.flag}`} 
                                        alt={countryName} 
                                        style={{ 
                                            width: '100%', 
                                            height: '100%', 
                                            objectFit: 'cover' 
                                        }} 
                                    />
                                    <div style={{
                                        position: 'absolute',
                                        bottom: 0,
                                        left: 0,
                                        right: 0,
                                        background: 'rgba(0,0,0,0.6)',
                                        color: 'white',
                                        textAlign: 'center',
                                        fontSize: isHost ? '0.85rem' : '0.65rem',
                                        padding: '2px 0',
                                        fontWeight: 'bold'
                                    }}>
                                        {countryName}
                                    </div>
                                </div>
                            ) : (
                                <span style={{ color: 'white', fontSize: cardFontSize, fontWeight: 'bold' }}>❓</span>
                            )}
                        </div>
                    );
                })}
            </div>
            
            {isFinished ? (
                <div style={{ background: '#ecfdf5', border: '2px solid #10b981', borderRadius: '16px', padding: '1.2rem', marginBottom: '1rem', textAlign: 'center' }}>
                    <h3 style={{ color: '#10b981', margin: 0, fontSize: isHost ? '1.5rem' : '1.1rem' }}>🎉 모두 매칭했습니다! 참 잘했어요!</h3>
                    <button onClick={resetGame} className="glass-button" style={{ marginTop: '12px', padding: '8px 20px', fontSize: isHost ? '1.1rem' : '0.9rem' }}>다시 하기</button>
                </div>
            ) : (
                <button onClick={resetGame} className="glass-button" style={{ width: '100%', padding: isHost ? '12px' : '8px', fontSize: isHost ? '1.1rem' : '0.9rem' }}>게임 초기화</button>
            )}
        </div>
    );
}

export function RpsGame() {
    const [choice, setChoice] = useState(null);
    
    const options = [
        { id: 'rock', label: '✊ 주먹' },
        { id: 'scissors', label: '✌️ 가위' },
        { id: 'paper', label: '🖐️ 보' }
    ];
    
    return (
        <div style={{ padding: '1rem' }}>
            <p style={{ color: 'var(--text-muted)', marginBottom: '1.5rem' }}>하나를 선택하고 호스트 화면을 기다리세요!</p>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {options.map(opt => {
                    const isSelected = choice === opt.id;
                    return (
                        <button
                            key={opt.id}
                            onClick={() => setChoice(opt.id)}
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
                    <span style={{ color: '#2563eb', fontWeight: 'bold' }}>선택 완료! 호스트 대기 중...</span>
                </div>
            )}
        </div>
    );
}

export function WhackMoleGame() {
    const [score, setScore] = useState(0);
    const [activeMole, setActiveMole] = useState(null);
    const [timeLeft, setTimeLeft] = useState(20);
    const [isPlaying, setIsPlaying] = useState(false);
    
    useEffect(() => {
        let gameTimer;
        let moleTimer;
        if (isPlaying && timeLeft > 0) {
            gameTimer = setInterval(() => {
                setTimeLeft(prev => prev - 1);
            }, 1000);
            
            moleTimer = setInterval(() => {
                setActiveMole(Math.floor(Math.random() * 9));
            }, 750);
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
        setScore(0);
        setTimeLeft(20);
        setIsPlaying(true);
        setActiveMole(Math.floor(Math.random() * 9));
    };
    
    const handleMoleClick = (idx) => {
        if (!isPlaying) return;
        if (activeMole === idx) {
            setScore(prev => prev + 1);
            setActiveMole(null);
        }
    };
    
    return (
        <div style={{ padding: '0.5rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem', fontSize: '1rem', fontWeight: 'bold' }}>
                <span>점수: <span style={{ color: '#10b981' }}>{score}점</span></span>
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
                            <h1 style={{ fontSize: '3rem', margin: '0.5rem 0' }}>{score}점</h1>
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

export function OmokGame() {
    const [board, setBoard] = useState(Array(49).fill(null)); // 7x7 board
    const [isBlackTurn, setIsBlackTurn] = useState(true);
    const [winner, setWinner] = useState(null);
    
    const handleCellClick = (idx) => {
        if (board[idx] || winner) return;
        const nextBoard = [...board];
        const stone = isBlackTurn ? '⚫' : '⚪';
        nextBoard[idx] = stone;
        setBoard(nextBoard);
        
        // Simple 3-stone check for Gomoku grid size (4 in a row to win)
        const checkLine = (start, step, count) => {
            const token = nextBoard[start];
            if (!token) return false;
            for (let i = 1; i < count; i++) {
                if (nextBoard[start + i * step] !== token) return false;
            }
            return true;
        };
        
        let won = false;
        // Horizontal check
        for (let r = 0; r < 7; r++) {
            for (let c = 0; c <= 3; c++) {
                if (checkLine(r * 7 + c, 1, 4)) won = true;
            }
        }
        // Vertical check
        for (let c = 0; c < 7; c++) {
            for (let r = 0; r <= 3; r++) {
                if (checkLine(r * 7 + c, 7, 4)) won = true;
            }
        }
        // Diagonal check (right-down)
        for (let r = 0; r <= 3; r++) {
            for (let c = 0; c <= 3; c++) {
                if (checkLine(r * 7 + c, 8, 4)) won = true;
            }
        }
        // Diagonal check (left-down)
        for (let r = 0; r <= 3; r++) {
            for (let c = 3; c < 7; c++) {
                if (checkLine(r * 7 + c, 6, 4)) won = true;
            }
        }
        
        if (won) {
            setWinner(isBlackTurn ? '흑돌(⚫)' : '백돌(⚪)');
        } else {
            setIsBlackTurn(!isBlackTurn);
        }
    };
    
    const reset = () => {
        setBoard(Array(49).fill(null));
        setIsBlackTurn(true);
        setWinner(null);
    };
    
    return (
        <div style={{ padding: '0.5rem' }}>
            <p style={{ margin: '0 0 10px 0', fontSize: '0.95rem', fontWeight: 'bold' }}>
                {winner ? `🎉 ${winner} 승리!` : `차례: ${isBlackTurn ? '⚫ 흑돌' : '⚪ 백돌'} (4목 완성 시 승리)`}
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '4px', background: '#d97706', padding: '8px', borderRadius: '12px', border: '3px solid #78350f' }}>
                {board.map((cell, idx) => (
                    <div 
                        key={idx}
                        onClick={() => handleCellClick(idx)}
                        style={{
                            height: '42px',
                            background: '#f59e0b',
                            border: '1px solid #78350f',
                            borderRadius: '4px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '1.5rem',
                            cursor: 'pointer'
                        }}
                    >
                        {cell}
                    </div>
                ))}
            </div>
            <button onClick={reset} className="glass-button" style={{ width: '100%', marginTop: '1rem' }}>바둑판 초기화</button>
        </div>
    );
}

export function MinesweeperGame() {
    const GRID_SIZE = 25; // 5x5
    const [grid, setGrid] = useState([]); 
    const [revealed, setRevealed] = useState(Array(GRID_SIZE).fill(false));
    const [gameOver, setGameOver] = useState(false);
    const [win, setWin] = useState(false);
    const [score, setScore] = useState(0);
    
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
        } else {
            const nextScore = score + 1;
            setScore(nextScore);
            const emptyCount = grid.filter(c => c === 'empty').length;
            const revealedEmptyCount = nextRevealed.filter((r, i) => r && grid[i] === 'empty').length;
            if (revealedEmptyCount === emptyCount) {
                setWin(true);
            }
        }
    };
    
    return (
        <div style={{ padding: '0.5rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px', fontSize: '0.95rem', fontWeight: 'bold' }}>
                <span>안전 구역 확보: {score}점</span>
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
        </div>
    );
}

export function SpeedNumbersGame() {
    const [numbers, setNumbers] = useState([]);
    const [nextNum, setNextNum] = useState(1);
    const [win, setWin] = useState(false);
    const [startTime, setStartTime] = useState(null);
    const [timeTaken, setTimeTaken] = useState(null);
    
    const shuffle = () => {
        const arr = Array.from({ length: 16 }, (_, i) => i + 1).sort(() => Math.random() - 0.5);
        setNumbers(arr);
        setNextNum(1);
        setWin(false);
        setStartTime(Date.now());
        setTimeTaken(null);
    };
    
    useEffect(() => {
        shuffle();
    }, []);
    
    const clickNum = (num) => {
        if (num === nextNum) {
            if (num === 16) {
                setWin(true);
                setTimeTaken(((Date.now() - startTime) / 1000).toFixed(2));
            } else {
                setNextNum(prev => prev + 1);
            }
        }
    };
    
    return (
        <div style={{ padding: '0.5rem' }}>
            <p style={{ margin: '0 0 10px 0', fontSize: '0.95rem', fontWeight: 'bold' }}>
                {win ? `🎉 성공! 기록: ${timeTaken}초` : `다음에 누를 숫자: ${nextNum}`}
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
        </div>
    );
}

export function JanggiGame() {
    const [board, setBoard] = useState(Array(25).fill(null)); // 5x5 Grid Janggi
    const [selectedPiece, setSelectedPiece] = useState(null);
    
    const initialPieces = {
        0: '漢 (楚)', 4: '漢 (車)', 20: '楚 (將)', 24: '楚 (車)'
    };
    
    useEffect(() => {
        const nextBoard = Array(25).fill(null);
        Object.entries(initialPieces).forEach(([k, v]) => {
            nextBoard[parseInt(k)] = v;
        });
        setBoard(nextBoard);
    }, []);
    
    const handleCellClick = (idx) => {
        if (selectedPiece !== null) {
            const nextBoard = [...board];
            nextBoard[idx] = board[selectedPiece];
            nextBoard[selectedPiece] = null;
            setBoard(nextBoard);
            setSelectedPiece(null);
        } else if (board[idx]) {
            setSelectedPiece(idx);
        }
    };
    
    return (
        <div style={{ padding: '0.5rem' }}>
            <p style={{ margin: '0 0 10px 0', fontSize: '0.9rem', color: 'var(--text-muted)' }}>
                {selectedPiece !== null ? '이동할 위치를 터치하세요!' : '장기 말(楚/漢)을 터치하여 선택하세요!'}
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

export function ChessGame() {
    const [board, setBoard] = useState(Array(25).fill(null)); // 5x5 board
    const [selectedPiece, setSelectedPiece] = useState(null);
    
    const initialPieces = {
        2: '♚', 0: '♜', 4: '♞', 22: '♔', 20: '♖', 24: '♘'
    };
    
    useEffect(() => {
        const nextBoard = Array(25).fill(null);
        Object.entries(initialPieces).forEach(([k, v]) => {
            nextBoard[parseInt(k)] = v;
        });
        setBoard(nextBoard);
    }, []);
    
    const handleCellClick = (idx) => {
        if (selectedPiece !== null) {
            const nextBoard = [...board];
            nextBoard[idx] = board[selectedPiece];
            nextBoard[selectedPiece] = null;
            setBoard(nextBoard);
            setSelectedPiece(null);
        } else if (board[idx]) {
            setSelectedPiece(idx);
        }
    };
    
    return (
        <div style={{ padding: '0.5rem' }}>
            <p style={{ margin: '0 0 10px 0', fontSize: '0.9rem', color: 'var(--text-muted)' }}>
                {selectedPiece !== null ? '기물을 놓을 칸을 선택하세요!' : '기물(♔/♚/♞)을 터치하여 이동하세요!'}
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

export function PokerGame() {
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

        // Evaluate Hand (Student-Friendly Sum & Lucky Pair)
        let res = {};
        const sum = v1 + v2;
        if (v1 === v2) {
            if (v1 === 10) {
                res = { text: '10 럭키 페어 (슈퍼 쌍둥이)', multiplier: 3, isPair: true, color: '#f59e0b' };
            } else {
                const mult = v1 >= 7 ? 2 : 1.5;
                res = { text: `${v1} 럭키 페어 (쌍둥이)`, multiplier: mult, isPair: true, color: '#ec4899' };
            }
        } else {
            if (sum >= 17) res = { text: `🌟 최고 합산 ${sum}점!`, multiplier: 1, isPair: false, color: '#10b981' };
            else if (sum >= 13) res = { text: `✨ 높은 합산 ${sum}점`, multiplier: 1, isPair: false, color: '#38bdf8' };
            else res = { text: `합산 ${sum}점`, multiplier: 1, isPair: false, color: '#94a3b8' };
        }
        setEvalResult(res);
    };

    useEffect(() => {
        dealNewHand();
    }, []);

    return (
        <div style={{ padding: '1rem', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '14px' }}>
            <div style={{ background: '#1e1b4b', borderRadius: '24px', padding: '20px 24px', width: '100%', maxWidth: '380px', color: 'white', textAlign: 'center', border: '3px solid #6366f1', boxShadow: '0 8px 25px rgba(0,0,0,0.3)' }}>
                <div style={{ fontSize: '0.85rem', color: '#c7d2fe', fontWeight: 'bold', marginBottom: '8px' }}>
                    ⭐ 럭키 카드 배틀 (숫자 합산 & 럭키 페어)
                </div>

                {/* Cards View */}
                <div style={{ display: 'flex', justifyContent: 'center', gap: '12px', marginBottom: '16px' }}>
                    {/* Card 1: Open */}
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

                    {/* Card 2: Secret / Revealed */}
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
                                onClick={() => setIsCard2Open(true)}
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

                {/* Hand Result Tag */}
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

                {/* Actions */}
                <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
                    <button
                        onClick={() => { setBet(prev => prev + 10); }}
                        disabled={isFolded}
                        style={{ padding: '8px 16px', borderRadius: '10px', background: '#10b981', border: 'none', color: 'white', fontWeight: 'bold', cursor: 'pointer' }}
                    >
                        ⭐ 도전 (+10)
                    </button>
                    <button
                        onClick={() => setIsCard2Open(true)}
                        style={{ padding: '8px 16px', borderRadius: '10px', background: '#3b82f6', border: 'none', color: 'white', fontWeight: 'bold', cursor: 'pointer' }}
                    >
                        👀 카드 오픈
                    </button>
                    <button
                        onClick={() => { setIsFolded(true); }}
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

export function GoStopGame() {
    const HWATU = [
        { name: '송학 (일광)', type: '광', points: 3 },
        { name: '매조 (홍단)', type: '홍단', points: 2 },
        { name: '사쿠라 (벚꽃)', type: '광', points: 3 },
        { name: '등나무 (초단)', type: '초단', points: 1 },
        { name: '창포 (열끗)', type: '멍텅구리', points: 1 },
        { name: '장미 (피)', type: '피', points: 1 },
        { name: '홍싸리 (홍단)', type: '홍단', points: 2 },
        { name: '공산 (팔광)', type: '광', points: 3 },
        { name: '국진 (쌍피)', type: '피', points: 2 },
        { name: '단풍 (청단)', type: '청단', points: 2 },
        { name: '오동 (똥광)', type: '광', points: 3 },
        { name: '비 (비광)', type: '광', points: 2 }
    ];
    const [card, setCard] = useState(null);
    const [totalScore, setTotalScore] = useState(0);
    
    const drawCard = () => {
        const picked = HWATU[Math.floor(Math.random() * HWATU.length)];
        setCard(picked);
        setTotalScore(prev => prev + picked.points);
    };
    
    return (
        <div style={{ padding: '1rem' }}>
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '2rem' }}>
                {card ? (
                    <div 
                        className="animate-pop-in"
                        style={{
                            width: '80px',
                            height: '130px',
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
                        <span style={{ fontSize: '1.2rem', textAlign: 'center', margin: 'auto 0' }}>{card.name}</span>
                        <span style={{ fontSize: '0.9rem', textAlign: 'right' }}>+{card.points}점</span>
                    </div>
                ) : (
                    <div style={{ width: '80px', height: '130px', background: '#cbd5e1', border: '3px dashed #94a3b8', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#64748b', fontWeight: 'bold' }}>
                        화투패
                    </div>
                )}
            </div>
            
            <button onClick={drawCard} className="primary-btn" style={{ width: '100%', background: '#dc2626', color: 'white', border: 'none', padding: '12px' }}>
                화투 패 뒤집기! 🎴
            </button>
            
            <div style={{ marginTop: '1.5rem', background: '#fff5f5', border: '2px solid #fca5a5', borderRadius: '12px', padding: '1rem' }}>
                <span>누적 점수: <strong style={{ color: '#dc2626', fontSize: '1.5rem' }}>{totalScore}점</strong></span>
                <button onClick={() => { setCard(null); setTotalScore(0); }} className="glass-button" style={{ marginTop: '10px', width: '100%' }}>점수 초기화</button>
            </div>
        </div>
    );
}

export function OthelloGame() {
    const [board, setBoard] = useState(Array(36).fill(null)); // 6x6 board
    const [isBlack, setIsBlack] = useState(true);
    
    useEffect(() => {
        // Setup initial 4 pieces
        const nextBoard = Array(36).fill(null);
        nextBoard[14] = '⚪';
        nextBoard[15] = '⚫';
        nextBoard[20] = '⚫';
        nextBoard[21] = '⚪';
        setBoard(nextBoard);
    }, []);
    
    const clickCell = (idx) => {
        if (board[idx]) return;
        const nextBoard = [...board];
        nextBoard[idx] = isBlack ? '⚫' : '⚪';
        setBoard(nextBoard);
        setIsBlack(!isBlack);
    };
    
    return (
        <div style={{ padding: '0.5rem' }}>
            <p style={{ margin: '0 0 10px 0', fontSize: '0.95rem', fontWeight: 'bold' }}>
                차례: {isBlack ? '⚫ 흑돌' : '⚪ 백돌'}
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

export function TetrisGame() {
    const [score, setScore] = useState(0);
    const [grid, setGrid] = useState(Array(48).fill(null)); // 6x8 grid
    
    const spawnBlock = () => {
        const nextGrid = Array(48).fill(null);
        // Put some random blocks at the bottom
        for (let i = 30; i < 48; i++) {
            if (Math.random() < 0.6) {
                nextGrid[i] = '🟪';
            }
        }
        // Active block
        nextGrid[2] = '🟦';
        nextGrid[3] = '🟦';
        setGrid(nextGrid);
    };
    
    useEffect(() => {
        spawnBlock();
    }, []);
    
    const handleMove = () => {
        setScore(prev => prev + 100);
        spawnBlock();
    };
    
    return (
        <div style={{ padding: '0.5rem' }}>
            <p style={{ margin: '0 0 10px 0', fontSize: '1rem', fontWeight: 'bold' }}>점수: <span style={{ color: '#9333ea' }}>{score}점</span></p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: '3px', background: '#1e293b', padding: '6px', borderRadius: '12px', border: '3px solid #0f172a', width: '200px', margin: '0 auto 1rem auto' }}>
                {grid.map((cell, idx) => (
                    <div
                        key={idx}
                        style={{
                            height: '30px',
                            background: cell ? 'transparent' : '#0f172a',
                            borderRadius: '4px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '1.2rem'
                        }}
                    >
                        {cell}
                    </div>
                ))}
            </div>
            
            <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
                <button onClick={handleMove} className="glass-button" style={{ padding: '8px 16px' }}>◀</button>
                <button onClick={handleMove} className="glass-button" style={{ padding: '8px 16px' }}>🔄 회전</button>
                <button onClick={handleMove} className="glass-button" style={{ padding: '8px 16px' }}>▶</button>
            </div>
        </div>
    );
}

export function BrickBreakerGame() {
    const [score, setScore] = useState(0);
    const [paddlePos, setPaddlePos] = useState(50); // percentage 0-100
    
    const movePaddle = (dir) => {
        setPaddlePos(prev => {
            const next = dir === 'left' ? prev - 10 : prev + 10;
            return Math.max(10, Math.min(90, next));
        });
        setScore(prev => prev + 10);
    };
    
    return (
        <div style={{ padding: '0.5rem' }}>
            <p style={{ margin: '0 0 10px 0', fontSize: '1rem', fontWeight: 'bold' }}>점수: <span style={{ color: '#2563eb' }}>{score}점</span></p>
            
            {/* Retro screen */}
            <div style={{ position: 'relative', height: '150px', background: '#0f172a', borderRadius: '16px', overflow: 'hidden', border: '3px solid #334155', marginBottom: '1rem' }}>
                {/* Bricks */}
                <div style={{ display: 'flex', gap: '6px', justifyContent: 'center', padding: '15px 10px 0 10px' }}>
                    <div style={{ width: '40px', height: '12px', background: '#ef4444', borderRadius: '2px' }} />
                    <div style={{ width: '40px', height: '12px', background: '#eab308', borderRadius: '2px' }} />
                    <div style={{ width: '40px', height: '12px', background: '#10b981', borderRadius: '2px' }} />
                    <div style={{ width: '40px', height: '12px', background: '#3b82f6', borderRadius: '2px' }} />
                </div>
                
                {/* Ball */}
                <div style={{ position: 'absolute', bottom: '40px', left: `${paddlePos}%`, transform: 'translateX(-50%)', width: '10px', height: '10px', background: 'white', borderRadius: '50%' }} />
                
                {/* Paddle */}
                <div style={{ position: 'absolute', bottom: '15px', left: `${paddlePos}%`, transform: 'translateX(-50%)', width: '50px', height: '8px', background: '#3b82f6', borderRadius: '4px' }} />
            </div>
            
            <div style={{ display: 'flex', gap: '10px', justifyContent: 'center' }}>
                <button onClick={() => movePaddle('left')} className="glass-button" style={{ padding: '8px 24px', fontSize: '1.2rem' }}>◀ 왼쪽</button>
                <button onClick={() => movePaddle('right')} className="glass-button" style={{ padding: '8px 24px', fontSize: '1.2rem' }}>오른쪽 ▶</button>
            </div>
        </div>
    );
}

export function MemoryGame() {
    const [sequence, setSequence] = useState([]);
    const [userSequence, setUserSequence] = useState([]);
    const [gameState, setGameState] = useState('idle'); // 'idle', 'showing', 'playing', 'gameover'
    const [activeColor, setActiveColor] = useState(null);
    const [score, setScore] = useState(0);

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
            playSound('submit'); // Beep sound
            await new Promise(r => setTimeout(r, 600));
            setActiveColor(null);
            await new Promise(r => setTimeout(r, 200));
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
        playSequence(newSeq);
    };

    const handlePanelClick = (color) => {
        if (gameState !== 'playing') return;
        playSound('submit');
        
        // Highlight temporarily
        setActiveColor(color);
        setTimeout(() => setActiveColor(null), 250);

        const newUserSeq = [...userSequence, color];
        setUserSequence(newUserSeq);

        // Check if correct
        const currentIndex = newUserSeq.length - 1;
        if (newUserSeq[currentIndex] !== sequence[currentIndex]) {
            setGameState('gameover');
            playSound('wrong');
            return;
        }

        // Check if finished sequence
        if (newUserSeq.length === sequence.length) {
            setScore(prev => prev + 1);
            playSound('correct');
            // Go to next level
            setTimeout(() => {
                const nextColor = colors[Math.floor(Math.random() * 4)];
                const nextSeq = [...sequence, nextColor];
                setSequence(nextSeq);
                setUserSequence([]);
                playSequence(nextSeq);
            }, 1000);
        }
    };

    return (
        <div style={{ textAlign: 'center', width: '100%', maxWidth: '400px', margin: '0 auto' }}>
            <h3 style={{ fontFamily: 'Jua, sans-serif', color: 'var(--primary)', fontSize: '1.8rem', margin: '0 0 1rem 0' }}>
                기억력 테스트 (Simon Says)
            </h3>
            <p style={{ margin: '0 0 1.5rem 0', color: 'var(--text-muted)' }}>
                {gameState === 'idle' && '시작 버튼을 누르면 색상 순서가 재생됩니다.'}
                {gameState === 'showing' && '순서를 잘 기억해 주세요!'}
                {gameState === 'playing' && '기억한 순서대로 패널을 클릭하세요!'}
                {gameState === 'gameover' && `게임 오버! 점수: ${score}점`}
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
                <span style={{ fontSize: '1.2rem', fontWeight: 'bold' }}>점수: {score}점</span>
                {(gameState === 'idle' || gameState === 'gameover') && (
                    <button onClick={startGame} className="primary-btn" style={{ padding: '10px 20px', borderRadius: '12px' }}>
                        {gameState === 'gameover' ? '다시 시작' : '게임 시작'}
                    </button>
                )}
            </div>
        </div>
    );
}

export function PassBombGame() {
    const [timeLeft, setTimeLeft] = useState(0);
    const [holder, setHolder] = useState('참가자 A');
    const [gameState, setGameState] = useState('idle'); // 'idle', 'running', 'exploded'

    const players = ['참가자 A', '참가자 B', '참가자 C', '호스트 (나)'];

    const startGame = () => {
        playSound('submit');
        setGameState('running');
        setHolder(players[Math.floor(Math.random() * players.length)]);
        
        const seconds = Math.floor(Math.random() * 8) + 8;
        setTimeLeft(seconds);
    };

    useEffect(() => {
        let interval = null;
        if (gameState === 'running' && timeLeft > 0) {
            interval = setInterval(() => {
                setTimeLeft(prev => {
                    if (prev <= 1) {
                        clearInterval(interval);
                        setGameState('exploded');
                        playSound('wrong'); // Explosion sound
                        return 0;
                    }
                    playSound('submit'); // Ticking sound
                    return prev - 1;
                });
            }, 1000);
        }
        return () => clearInterval(interval);
    }, [gameState, timeLeft]);

    const handlePass = () => {
        if (gameState !== 'running') return;
        playSound('submit');
        let nextHolder = holder;
        while (nextHolder === holder) {
            nextHolder = players[Math.floor(Math.random() * players.length)];
        }
        setHolder(nextHolder);
    };

    return (
        <div style={{ textAlign: 'center', width: '100%', maxWidth: '400px', margin: '0 auto' }}>
            <h3 style={{ fontFamily: 'Jua, sans-serif', color: 'var(--primary)', fontSize: '1.8rem', margin: '0 0 1rem 0' }}>
                폭탄 돌리기 (Pass Bomb)
            </h3>
            <p style={{ margin: '0 0 1.5rem 0', color: 'var(--text-muted)' }}>
                {gameState === 'idle' && '게임 시작을 누르면 타이머가 비밀리에 흘러갑니다.'}
                {gameState === 'running' && '폭탄이 터지기 전에 다른 사람에게 전달하세요!'}
                {gameState === 'exploded' && `펑! 폭탄이 ${holder}의 손에서 터졌습니다!`}
            </p>

            <div style={{ padding: '2rem', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '24px', marginBottom: '1.5rem' }}>
                {gameState === 'running' ? (
                    <div>
                        <div style={{ fontSize: '5rem', animation: 'shake 0.5s infinite' }}>💣</div>
                        <h2 style={{ fontSize: '1.8rem', fontFamily: 'Jua, sans-serif', color: '#ef4444', margin: '1rem 0' }}>
                            {holder} 보유 중!
                        </h2>
                        <button onClick={handlePass} className="primary-btn" style={{ padding: '12px 24px', fontSize: '1.1rem', borderRadius: '12px' }}>
                            폭탄 패스! ➔
                        </button>
                    </div>
                ) : (
                    <div>
                        <div style={{ fontSize: '5rem' }}>{gameState === 'exploded' ? '💥' : '💣'}</div>
                        <h2 style={{ fontSize: '1.5rem', fontFamily: 'Jua, sans-serif', margin: '1.5rem 0' }}>
                            {gameState === 'exploded' ? `${holder} 탈락!` : '대기 중'}
                        </h2>
                        <button onClick={startGame} className="primary-btn" style={{ padding: '12px 24px', fontSize: '1.1rem', borderRadius: '12px' }}>
                            {gameState === 'exploded' ? '다시 시작' : '게임 시작'}
                        </button>
                    </div>
                )}
            </div>

            <style>{`
                @keyframes shake {
                    0% { transform: translate(1px, 1px) rotate(0deg); }
                    10% { transform: translate(-1px, -2px) rotate(-1deg); }
                    20% { transform: translate(-3px, 0px) rotate(1deg); }
                    30% { transform: translate(0px, 2px) rotate(0deg); }
                    40% { transform: translate(1px, -1px) rotate(1deg); }
                    50% { transform: translate(-1px, 2px) rotate(-1deg); }
                    60% { transform: translate(-3px, 1px) rotate(0deg); }
                    70% { transform: translate(2px, 1px) rotate(-1deg); }
                    80% { transform: translate(-1px, -1px) rotate(1deg); }
                    90% { transform: translate(2px, 2px) rotate(0deg); }
                    100% { transform: translate(1px, -2px) rotate(-1deg); }
                }
            `}</style>
        </div>
    );
}
