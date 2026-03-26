import React, { useState, useEffect } from 'react';
import { Users, Play, ChevronRight, Trophy, Home, ArrowLeft, Zap, ClipboardCheck, Type } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';
import QRCode from 'react-qr-code';
import Confetti from 'react-confetti';
import { playSound } from '../utils/audio';

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
    const quizId = location.state?.quizId || 'general';

    const [pin, setPin] = useState(null);
    const [quizTitle, setQuizTitle] = useState(location.state?.customQuiz?.title || '');
    const [participants, setParticipants] = useState([]);
    const [gameState, setGameState] = useState('setup');
    const [answeredCount, setAnsweredCount] = useState(0);
    const [currentQuestion, setCurrentQuestion] = useState('');
    const [currentOptions, setCurrentOptions] = useState([]);
    const [correctIndex, setCorrectIndex] = useState(null);
    const [correctAnswer, setCorrectAnswer] = useState('');
    const [serverIp, setServerIp] = useState(window.location.hostname);
    const [quizType, setQuizType] = useState('mcq');

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

    useEffect(() => {
        socket.on('host:participantsUpdated', (updated) => {
            setParticipants(updated);
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
            if (data.quizType) setQuizType(data.quizType);
            if (data.state === 'question') {
                setCurrentQuestion(data.question);
                if (data.points !== undefined) setCurrentPoints(data.points);
                if (data.totalPoints !== undefined) setTotalScore(data.totalPoints);
                setCurrentOptions(data.options || []);
                setCorrectIndex(data.correctIndex);
                if (data.correctAnswer) setCorrectAnswer(data.correctAnswer);
                setBuzzedInfo(null);
                setShowAnswer(false);
                setJudgeResult(null);
                setFirstCorrectInfo(null);
            } else if (data.state === 'leaderboard') {
                setGameState('leaderboard');
                setAnsweredCount(0); // Reset for next use
                setBuzzedInfo(null);
                setShowAnswer(false);
                setJudgeResult(null);
                // DO NOT clear firstCorrectInfo here so the trophy stays visible on the leaderboard
            } else if (data.state === 'final_leaderboard') {
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
        return () => {
            socket.off('host:participantsUpdated');
            socket.off('host:participantAnswered');
            socket.off('room:stateUpdate');
            socket.off('room:buzzed');
            socket.off('room:buzzerJudge');
        };
    }, [socket]);

    const createRoom = (mode = 'normal') => {
        const customQuiz = location.state?.customQuiz;
        socket.emit('host:createRoom', { mode, quizId, quiz: customQuiz }, (res) => {
            if (res.success) {
                setPin(res.pin);
                setQuizTitle(res.title);
                setIsBuzzerMode(!!res.isBuzzerMode);
                if (res.quizType) setQuizType(res.quizType);
                if (res.ip) setServerIp(res.ip);
                setTotalScore(res.totalPoints || 0);
                setGameState('lobby');
                setGroupScores({});
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
        socket.emit('host:nextQuestion', pin);
        setAnsweredCount(0);
        setBuzzedInfo(null);
        setShowAnswer(false);
        setJudgeResult(null);
    };

    return (
        <div className="page-container" style={{ padding: '0', justifyContent: 'flex-start', maxWidth: '100%' }}>
            {gameState === 'final_leaderboard' && (
                <Confetti width={window.innerWidth} height={window.innerHeight} recycle={false} numberOfPieces={400} />
            )}
            <header className="header">
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer' }} onClick={() => navigate('/')}>
                    <img src="/logo.png" alt="Logo" className="header-logo" />
                </div>
                {pin && (
                    <div className="pin-display">
                        PIN: {pin} {isBuzzerMode && <span style={{ fontSize: '0.8rem', opacity: 0.7, marginLeft: '10px' }}>(버저 모드)</span>}
                    </div>
                )}
            </header>

            <div style={{ padding: '2rem', width: '100%', maxWidth: '900px', margin: '0 auto' }}>
                {/* SETUP */}
                {gameState === 'setup' && (
                    <div className="glass-panel card-container animate-slide-up" style={{ margin: '4rem auto', position: 'relative' }}>
                        <button onClick={() => navigate(-1)} className="glass-button" style={{ position: 'absolute', top: '20px', left: '20px', padding: '6px 12px', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '4px', background: 'rgba(255,255,255,0.8)', border: '1px solid #e2e8f0', borderRadius: '8px', fontWeight: 'bold', color: 'var(--primary)', cursor: 'pointer', zIndex: 10 }}>
                            <ArrowLeft size={16} /> 이전
                        </button>
                        <h2 style={{ marginBottom: '1rem', fontSize: '2rem' }}>방을 만들 준비가 되었나요?</h2>
                        <p style={{ color: 'var(--text-muted)', marginBottom: '2rem' }}>선택된 퀴즈: <strong>{quizTitle || (quizId === 'general' ? '일반 상식 퀴즈' : quizId === 'science' ? '재미있는 과학 탐구' : '커스텀 퀴즈')}</strong></p>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                            <button className="glass-button" onClick={() => createRoom('buzzer')} style={{ width: '100%', background: 'var(--secondary)', color: 'white' }}>
                                <Zap size={20} fill="white" /> 버저 모드
                            </button>
                            <button className="glass-button" onClick={() => createRoom('mcq_only')} style={{ width: '100%' }}>
                                <ClipboardCheck size={20} /> 객관식 모드
                            </button>
                            <button className="glass-button" onClick={() => createRoom('short_only')} style={{ width: '100%' }}>
                                <Type size={20} /> 주관식 모드
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
                                <QRCode value={`http://${serverIp}:5173/participant?pin=${pin}`} size={150} style={{ height: 'auto', maxWidth: '100%', width: '100%' }} viewBox="0 0 150 150" />
                                <p style={{ margin: '10px 0 0 0', fontSize: '0.9rem', color: 'var(--text-muted)', fontWeight: 'bold' }}>QR로 바로 참여!</p>
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
                        <button className="glass-button" onClick={startGame} style={{ padding: '1.2rem 4rem', fontSize: '1.5rem' }}>
                            <Play fill="white" size={24} /> 시작하기!
                        </button>
                    </div>
                )}

                {/* QUESTION */}
                {gameState === 'question' && (
                    <div className="glass-panel animate-slide-up" style={{ padding: '3rem 2rem', textAlign: 'center', minHeight: '400px', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                        <h2 style={{ fontSize: '2.8rem', marginBottom: '2.5rem', wordBreak: 'keep-all' }}>{currentQuestion}</h2>

                        {isBuzzerMode ? (
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
                                                <h3 style={{ margin: '0 0 20px 0', color: 'var(--ans-green)', fontSize: '2rem' }}>
                                                    정답: {quizType === 'short' ? correctAnswer : (currentOptions?.[correctIndex] ?? '—')}
                                                </h3>
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
                        )}
                    </div>
                )}

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
        </div>
    );
}
