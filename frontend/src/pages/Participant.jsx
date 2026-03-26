import React, { useState, useEffect } from 'react';
import { User, KeyRound, AlertCircle, CheckCircle, XCircle, ArrowLeft } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';
import { playSound } from '../utils/audio';
import Confetti from 'react-confetti';

export default function Participant({ socket }) {
    const location = useLocation();
    const navigate = useNavigate();
    const [pin, setPin] = useState('');
    const [nickname, setNickname] = useState(localStorage.getItem('quizrun_nickname') || '');
    const [error, setError] = useState(null);
    const [currentPoints, setCurrentPoints] = useState(10);

    useEffect(() => {
        const params = new URLSearchParams(location.search);
        const p = params.get('pin');
        if (p) setPin(p);
    }, [location]);

    const [gameState, setGameState] = useState('join');
    const [isLoading, setIsLoading] = useState(true);
    const [socketConnected, setSocketConnected] = useState(socket.connected);
    const [leaderboard, setLeaderboard] = useState([]);
    const [myScore, setMyScore] = useState(0);
    const [myStatus, setMyStatus] = useState(null);
    const [isBuzzerMode, setIsBuzzerMode] = useState(false);
    const [quizType, setQuizType] = useState('mcq');
    const [groupId, setGroupId] = useState(null);

    const [currentOptions, setCurrentOptions] = useState([]);
    const [lastCorrectIndex, setLastCorrectIndex] = useState(null);
    const [lastCorrectAnswer, setLastCorrectAnswer] = useState('');
    const [myLastAnswer, setMyLastAnswer] = useState(null);
    const [buzzedInfo, setBuzzedInfo] = useState(null);
    const [buzzerJudgeResult, setBuzzerJudgeResult] = useState(null); // null | 'correct' | 'incorrect'
    const [showConfetti, setShowConfetti] = useState(false);

    useEffect(() => {
        setSocketConnected(socket.connected);
        const onConnect = () => {
            setSocketConnected(true);
            setIsLoading(false);
        };
        const onDisconnect = () => setSocketConnected(false);
        socket.on('connect', onConnect);
        socket.on('disconnect', onDisconnect);

        // If already connected, stop loading
        if (socket.connected) setIsLoading(false);

        // Fallback for loading
        const timeout = setTimeout(() => setIsLoading(false), 5000);
        socket.on('room:stateUpdate', (data) => {
            setGameState(data.state);
            setIsBuzzerMode(!!data.isBuzzerMode);
            if (data.quizType) setQuizType(data.quizType);

            if (data.points !== undefined) setCurrentPoints(data.points);

            if (data.state === 'question') {
                setCurrentOptions(data.options || []);
                setMyStatus(null);
                setLastCorrectIndex(null);
                setLastCorrectAnswer('');
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

        return () => {
            clearTimeout(timeout);
            socket.off('connect', onConnect);
            socket.off('disconnect', onDisconnect);
            socket.off('room:stateUpdate');
            socket.off('room:buzzed');
            socket.off('room:buzzerJudge');
            socket.off('room:closed');
        };
    }, [socket, groupId]);

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
                localStorage.setItem('quizrun_nickname', nickname);
                setIsBuzzerMode(!!res.isBuzzerMode);
                const qType = res.quizType || 'mcq';
                setQuizType(qType);
                
                // Show group selection for both Buzzer and Short Answer modes
                if (res.isBuzzerMode || qType === 'short') {
                    setGameState('select_join_type');
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

        if (quizType === 'short') {
            socket.emit('participant:submitAnswer', { pin, textAnswer: val }, onResponse);
        } else {
            setMyLastAnswer(val);
            socket.emit('participant:submitAnswer', { pin, answerIndex: val }, onResponse);
        }
        setGameState('answered');
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

    return (
        <div className="page-container" style={{ position: 'relative', padding: '2rem', minHeight: '100vh', alignItems: 'center' }}>
            {/* Confetti for correct answer */}
            {showConfetti && <Confetti width={window.innerWidth} height={window.innerHeight} recycle={false} numberOfPieces={300} />}

            <div style={{ width: '100%', minHeight: '100%', background: isBuzzerMode && groupId ? 'linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%)' : 'var(--bg)' }}>
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
                            <img src="/logo.png" alt="Logo" style={{ height: '60px', objectFit: 'contain' }} />
                        </div>

                        {error && (
                            <div style={{ background: '#fef2f2', color: 'var(--ans-red)', padding: '12px', borderRadius: '12px', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '8px', border: '1px solid #fecaca', fontWeight: '500' }}>
                                <AlertCircle size={20} /> {error}
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
                                입장하기
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

                {gameState === 'waiting' && (
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

                {gameState === 'question' && (
                    <div className="animate-slide-up" style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        {isBuzzerMode ? (
                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '30px', width: '100%' }}>
                                {buzzerJudgeResult && (
                                    <div className="animate-pop-in" style={{
                                        padding: '3rem 2rem', borderRadius: '30px', textAlign: 'center', width: '100%',
                                        background: buzzerJudgeResult === 'correct' ? 'var(--ans-green)' : 'var(--ans-red)',
                                        color: 'white', boxShadow: `0 20px 50px ${buzzerJudgeResult === 'correct' ? 'rgba(16,185,129,0.4)' : 'rgba(239,68,68,0.4)'}`
                                    }}>
                                        <div style={{ fontSize: '5rem', marginBottom: '1rem' }}>
                                            {buzzerJudgeResult === 'correct' ? '🎊' : '😢'}
                                        </div>
                                        <h2 style={{ fontSize: '3rem', fontWeight: '900', color: 'white', margin: 0 }}>
                                            {buzzerJudgeResult === 'correct' ? '정답!' : '오답!'}
                                        </h2>
                                        <div style={{ marginTop: '15px', background: 'rgba(255,255,255,0.2)', padding: '8px 20px', borderRadius: '20px', fontSize: '1.5rem', fontWeight: '800' }}>
                                            {buzzerJudgeResult === 'correct' ? '점수 획득! 🏆' : '-10 점 😢'}
                                        </div>
                                    </div>
                                )}
                                {!buzzerJudgeResult && buzzedInfo && (
                                    <div className="animate-pop-in" style={{ textAlign: 'center' }}>
                                        <div style={{ marginBottom: '20px', fontSize: '1.2rem', fontWeight: '800', color: 'var(--primary)' }}>
                                            💰 이번 문제 배점: {currentPoints}점
                                        </div>
                                        <div style={{
                                            padding: '2rem',
                                            background: buzzedInfo.groupId === groupId || buzzedInfo.participantId === socket.id ? 'var(--secondary)' : '#94a3b8',
                                            color: 'white',
                                            borderRadius: '25px',
                                            fontSize: '3rem',
                                            fontWeight: '900',
                                            boxShadow: buzzedInfo.groupId === groupId || buzzedInfo.participantId === socket.id ? '0 10px 30px rgba(245, 158, 11, 0.4)' : 'none'
                                        }}>
                                            정답 도전!
                                        </div>
                                        <p style={{ marginTop: '15px', color: 'var(--text-muted)', fontSize: '1.2rem' }}>
                                            ({buzzedInfo.groupId ? `${buzzedInfo.groupId}조: ` : ''}{buzzedInfo.nickname}님)
                                        </p>
                                    </div>
                                )}
                                {!buzzerJudgeResult && !buzzedInfo && (
                                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                                        <div style={{ marginBottom: '20px', fontSize: '1.2rem', fontWeight: '800', color: 'var(--primary)', textAlign: 'center' }}>
                                            💰 이번 문제 배점: {currentPoints}점
                                        </div>
                                        <button
                                            className="buzzer-button animate-pulse-slow"
                                            onClick={handleBuzzerPress}
                                            style={{
                                                width: '280px',
                                                height: '280px',
                                                borderRadius: '50%',
                                                background: 'radial-gradient(circle, #ef4444 0%, #b91c1c 100%)',
                                                border: '12px solid #991b1b',
                                                boxShadow: '0 20px 0 #7f1d1d, 0 30px 50px rgba(239, 68, 68, 0.4)',
                                                color: 'white',
                                                fontSize: '3rem',
                                                fontWeight: '900',
                                                cursor: 'pointer',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                transition: 'all 0.1s',
                                                textShadow: '0 4px 10px rgba(0,0,0,0.3)'
                                            }}
                                        >
                                            BUZZER
                                        </button>
                                    </div>
                                )}
                                <div style={{ fontSize: '1.5rem', fontWeight: '800', color: 'var(--primary)', padding: '10px 20px', background: 'white', borderRadius: '15px', border: '2px solid var(--primary)' }}>
                                    {groupId ? `${groupId}조` : '개별 참가'}
                                </div>
                            </div>
                        ) : quizType === 'short' ? (
                            <div className="glass-panel card-container animate-slide-up" style={{ padding: '2.5rem', width: '100%', maxWidth: '500px' }}>
                                <h3 style={{ marginBottom: '1.5rem', fontSize: '1.5rem' }}>정답을 입력해주세요</h3>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                                    <input 
                                        type="text" 
                                        className="glass-input" 
                                        placeholder="이곳에 정답 입력" 
                                        style={{ fontSize: '1.5rem', padding: '1.2rem' }}
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter' && e.target.value.trim()) {
                                                submitAnswer(e.target.value.trim());
                                            }
                                        }}
                                        id="short-answer-input"
                                        autoFocus
                                    />
                                    <button 
                                        className="glass-button" 
                                        style={{ padding: '1.2rem', fontSize: '1.2rem' }}
                                        onClick={() => {
                                            const val = document.getElementById('short-answer-input').value.trim();
                                            if (val) submitAnswer(val);
                                        }}
                                    >
                                        정답 제출하기
                                    </button>
                                </div>
                            </div>
                        ) : (
                            <div className="answers-grid" style={{ marginTop: '1rem' }}>
                                {currentOptions.map((opt, i) => (
                                    <div
                                        key={i}
                                        className="answer-card"
                                        onClick={() => submitAnswer(i)}
                                        style={{
                                            aspectRatio: '1',
                                            fontSize: '1.5rem',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            padding: '1rem',
                                            wordBreak: 'break-word'
                                        }}
                                    >
                                        {opt}
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}

                {gameState === 'answered' && (
                    <div className="glass-panel card-container animate-slide-up" style={{ background: 'var(--text-muted)', color: 'white' }}>
                        <h2 style={{ fontSize: '2rem', marginBottom: '1.5rem', color: 'white' }}>제출 완료!</h2>
                        <p style={{ marginTop: '1rem', fontSize: '1.2rem', opacity: 0.9 }}>다른 친구들을 인내심 있게 기다려주세요...</p>
                        <div className="spinner" style={{ margin: '2rem auto', width: '60px', height: '60px', borderRadius: '50%', border: '6px solid rgba(255,255,255,0.2)', borderTopColor: 'white', animation: 'spin 1s linear infinite' }} />
                    </div>
                )}

                {(gameState === 'leaderboard' || gameState === 'final_leaderboard') && (
                    <div className={`glass-panel card-container animate-slide-up ${myStatus === 'correct' ? 'correct-bg' : 'incorrect-bg'}`} style={{ transition: 'background-color 0.5s' }}>

                        {myStatus === 'correct' ? (
                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', color: 'white' }}>
                                <CheckCircle size={80} style={{ marginBottom: '1rem' }} />
                                <h2 style={{ fontSize: '2.5rem', color: 'white' }}>정답입니다! 🎉</h2>
                                <div style={{ background: 'rgba(0,0,0,0.1)', padding: '10px 20px', borderRadius: '20px', marginTop: '1rem', fontSize: '1.2rem', fontWeight: 'bold' }}>
                                    +{currentPoints} 점
                                </div>
                            </div>
                        ) : (
                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', color: 'white' }}>
                                <XCircle size={80} style={{ marginBottom: '1rem' }} />
                                <h2 style={{ fontSize: '2.5rem', color: 'white' }}>오답! 😢</h2>
                                <p style={{ marginTop: '1rem', fontSize: '1.2rem', opacity: 0.9 }}>
                                    정답은: <strong>{quizType === 'short' ? lastCorrectAnswer : currentOptions[lastCorrectIndex]}</strong>
                                </p>
                            </div>
                        )}

                        <div style={{ background: 'white', color: 'var(--text)', padding: '1.5rem', borderRadius: '16px', marginTop: '3rem' }}>
                            <p style={{ margin: 0, color: 'var(--text-muted)' }}>현재 점수</p>
                            <div style={{ fontSize: '3rem', fontWeight: '900', color: 'var(--primary)' }}>
                                {myScore}
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
                .animate-pop-in {
                    animation: popIn 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275);
                }
                @keyframes popIn {
                    0% { transform: scale(0.5); opacity: 0; }
                    100% { transform: scale(1); opacity: 1; }
                }
            `}</style>
            </div>
        </div>
    );
}
