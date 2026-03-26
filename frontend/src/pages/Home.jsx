import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { PlayCircle, MonitorPlay, Zap, BookOpen, FlaskConical, Globe, Trophy, Music, Film, Coffee, Map, Palette, Database, Cpu, Leaf, Moon, Microscope, Beaker, Atom, Compass, Book, Scale, Languages, Landmark, Edit3, Folder } from 'lucide-react';

const ICON_MAP = {
    '경제': <Landmark size={24} color="#059669" />,
    '시사': <Globe size={24} color="#2563eb" />,
    '유머': <Zap size={24} color="#d97706" />,
    '과학': <FlaskConical size={24} color="#4338ca" />,
    '스포츠': <Trophy size={24} color="#b45309" />,
    '문학': <Book size={24} color="#7c3aed" />,
    '수학': <Database size={24} color="#0891b2" />,
    '기술': <Cpu size={24} color="#475569" />,
    '영화': <Film size={24} color="#db2777" />,
    '음악': <Music size={24} color="#ea580c" />,
    '음식': <Coffee size={24} color="#b45309" />,
    '여행': <Map size={24} color="#0d9488" />,
    '예술': <Palette size={24} color="#9333ea" />,
    '건축': <Landmark size={24} color="#4b5563" />,
    '자연': <Leaf size={24} color="#16a34a" />,
    '우주': <Moon size={24} color="#1e1b4b" />,
    '철학': <Book size={24} color="#92400e" />,
    '심리': <BookOpen size={24} color="#be185d" />,
    '법': <Scale size={24} color="#1f2937" />,
    '언어': <Languages size={24} color="#4f46e5" />,
    '지리': <Compass size={24} color="#0891b2" />,
    '상식': <Zap size={24} color="#f59e0b" />,
};

const getIconByTitle = (title) => {
    const key = Object.keys(ICON_MAP).find(k => title.includes(k));
    return ICON_MAP[key] || <Folder size={24} color="#64748b" />;
};

export default function Home({ socket }) {
    const navigate = useNavigate();

    const [quizzes, setQuizzes] = useState([]); // Start empty to detect loading
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);

    const [editingId, setEditingId] = useState(null);
    const [draggedId, setDraggedId] = useState(null);

    const [allCounts, setAllCounts] = useState({});
    const [socketConnected, setSocketConnected] = useState(socket.connected);

    React.useEffect(() => {
        setSocketConnected(socket.connected);
        const onConnect = () => setSocketConnected(true);
        const onDisconnect = () => setSocketConnected(false);
        socket.on('connect', onConnect);
        socket.on('disconnect', onDisconnect);

        const handleUpdate = (newConfig) => {
            if (newConfig && newConfig.quizzes) {
                setQuizzes(newConfig.quizzes);
            }
        };
        socket.on('config:updated', handleUpdate);

        // Initial load
        const loadEverything = () => {
            setIsLoading(true);
            setError(null);

            const timeout = setTimeout(() => {
                if (isLoading) {
                    setError("서버 연결 시간이 초과되었습니다. 서버가 실행 중인지 확인하고 페이지를 새로고침해 주세요.");
                    setIsLoading(false);
                }
            }, 10000);

            socket.emit('config:load', (res) => {
                if (res && res.success && res.config && res.config.quizzes) {
                    clearTimeout(timeout);
                    setQuizzes(res.config.quizzes);
                    setIsLoading(false);
                } else {
                    console.error('Config load failed or returned invalid data:', res);
                    // If we get a response but it's invalid, we should still stop loading
                    clearTimeout(timeout);
                    setError("데이터 형식이 올바르지 않거나 서버에 문제가 있습니다.");
                    setIsLoading(false);
                }
            });

            socket.emit('quiz:getAllCounts', (res) => {
                if (res && res.success && res.counts) {
                    setAllCounts(res.counts);
                }
            });
        };

        if (socket.connected) {
            loadEverything();
        } else {
            socket.once('connect', loadEverything);
        }

        return () => {
            socket.off('connect', onConnect);
            socket.off('disconnect', onDisconnect);
            socket.off('config:updated', handleUpdate);
        };
    }, [socket]);

    const saveConfig = (newQuizzes) => {
        // SAFETY: Only save if we actually have data (prevent overwriting with empty)
        if (!newQuizzes || newQuizzes.length === 0) return;
        
        setQuizzes(newQuizzes);
        socket.emit('config:save', { quizzes: newQuizzes }, (res) => {
            if (!res.success) {
                console.error('Failed to save configuration');
            }
        });
    };

    const handleAddSubject = () => {
        const newSubject = {
            id: `subject-${Date.now()}`,
            title: '새 주제',
            count: 0,
            bg: '#f1f5f9'
        };
        saveConfig([...quizzes, newSubject]);
    };

    const handleDeleteSubject = (id, e) => {
        e.stopPropagation();
        if (window.confirm('이 주제를 삭제하시겠습니까?')) {
            saveConfig(quizzes.filter(q => q.id !== id));
        }
    };

    const handleTitleEdit = (id, newTitle) => {
        const updated = quizzes.map(q => q.id === id ? { ...q, title: newTitle } : q);
        saveConfig(updated);
        setEditingId(null);
    };

    const handleDragStart = (id) => setDraggedId(id);
    const handleDragOver = (e) => e.preventDefault();
    const handleDrop = (targetId) => {
        if (!draggedId || draggedId === targetId) return;
        const targetIndex = quizzes.findIndex(q => q.id === targetId);
        const draggedIndex = quizzes.findIndex(q => q.id === draggedId);
        const newQuizzes = [...quizzes];
        const [removed] = newQuizzes.splice(draggedIndex, 1);
        newQuizzes.splice(targetIndex, 0, removed);
        saveConfig(newQuizzes);
        setDraggedId(null);
    };

    if (isLoading) {
        return (
            <div className="full-screen-container" style={{ justifyContent: 'center', alignItems: 'center' }}>
                <div className="spinner" style={{ width: '60px', height: '60px', borderRadius: '50%', border: '6px solid #e2e8f0', borderTopColor: 'var(--primary)', animation: 'spin 1s linear infinite' }} />
                <p style={{ marginTop: '20px', fontSize: '1.2rem', color: 'var(--text-muted)' }}>데이터를 불러오는 중입니다...</p>
                <p style={{ marginTop: '5px', fontSize: '0.9rem', color: socketConnected ? '#059669' : '#dc2626' }}>
                    상태: {socketConnected ? '서버와 연결되었습니다' : '서버 연결 대기 중...'}
                </p>
            </div>
        );
    }

    if (error) {
        return (
            <div className="full-screen-container" style={{ justifyContent: 'center', alignItems: 'center', padding: '2rem' }}>
                <div className="glass-panel" style={{ textAlign: 'center', padding: '3rem', maxWidth: '500px' }}>
                    <h2 style={{ color: 'var(--ans-red)', marginBottom: '1rem' }}>오류 발생</h2>
                    <p style={{ marginBottom: '2rem' }}>{error}</p>
                    <button className="glass-button" onClick={() => window.location.reload()}>새로고침</button>
                </div>
            </div>
        );
    }

    return (
        <div className="full-screen-container" style={{ flexDirection: 'column', alignItems: 'center', paddingTop: '1rem', overflowX: 'hidden' }}>

            {/* Header Section: Compact Top Left */}
            <div style={{ position: 'fixed', top: '15px', left: '20px', display: 'flex', alignItems: 'center', gap: '15px', zIndex: 300 }}>
                <img src="/logo.png" alt="Quizrun Logo" className="home-logo" style={{ height: '70px', cursor: 'pointer' }} onClick={() => navigate('/')} />
                <h1 style={{ fontSize: '2.2rem', margin: 0, color: 'var(--primary)', whiteSpace: 'nowrap', cursor: 'pointer' }} onClick={() => navigate('/')}>
                    지식의 숲, <span style={{ color: 'var(--secondary)' }}>퀴즈런</span>
                </h1>
            </div>

            {/* Folder Grid */}
            <div className="folder-grid" style={{ zIndex: 10, marginTop: '80px' }}>

                {/* 1. Code Join (Static) */}
                <div style={{ position: 'relative' }}>
                    <div
                        className="folder-item"
                        style={{ border: '2px dashed var(--primary)', background: '#f0f9ff' }}
                        onClick={() => navigate('/participant')}
                    >
                        <div className="icon-wrapper" style={{ background: 'white', padding: '10px', borderRadius: '12px', cursor: 'pointer' }}>
                            <PlayCircle size={28} color="var(--primary)" />
                        </div>
                        <h4 style={{ color: 'var(--primary)', fontWeight: '800' }}>코드 참여</h4>
                    </div>

                    <img
                        src="/emoticon.png"
                        alt="Quizrun Character"
                        className="pondering-emoticon"
                        style={{ left: '-120px', top: '50%', transform: 'translateY(-50%)' }}
                        title="입장 코드 입력하기!"
                    />
                </div>

                {/* 2. Draggable Subject Folders */}
                {quizzes.map((quiz) => (
                    <div
                        key={quiz.id}
                        className={`folder-item ${draggedId === quiz.id ? 'dragging' : ''}`}
                        draggable={editingId !== quiz.id}
                        onDragStart={() => handleDragStart(quiz.id)}
                        onDragOver={handleDragOver}
                        onDrop={() => handleDrop(quiz.id)}
                        onClick={() => editingId !== quiz.id && navigate(`/topic/${quiz.id}`)}
                    >
                        <div className="icon-wrapper" style={{ background: quiz.bg, padding: '10px', borderRadius: '12px' }}>
                            {getIconByTitle(quiz.title)}
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', width: '90%', justifyContent: 'center' }}>
                            {editingId === quiz.id ? (
                                <input
                                    autoFocus
                                    className="folder-edit-input"
                                    value={quiz.title}
                                    onChange={(e) => handleRename(quiz.id, e.target.value)}
                                    onBlur={() => setEditingId(null)}
                                    onKeyDown={(e) => e.key === 'Enter' && setEditingId(null)}
                                    onClick={(e) => e.stopPropagation()}
                                />
                            ) : (
                                <>
                                    <h4 style={{ margin: 0 }}>{quiz.title}</h4>
                                    <button
                                        className="edit-icon"
                                        style={{ background: 'none', border: 'none', padding: 0, display: 'flex', alignItems: 'center', opacity: 0.6, cursor: 'pointer' }}
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            setEditingId(quiz.id);
                                        }}
                                    >
                                        <Edit3 size={14} />
                                    </button>
                                </>
                            )}
                        </div>
                        <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                            {(() => {
                                let total = 0;
                                for (let i = 1; i <= 24; i++) {
                                    const key = `quizrun_data_${quiz.id}_sub-${i}`;
                                    // Use server counts primarily
                                    total += allCounts[key] || 0;
                                }
                                return `${total} 문제`;
                            })()}
                        </p>
                    </div>
                ))}

                {/* 3. Make Question (Last) */}
                <div
                    className="folder-item"
                    style={{ background: 'var(--primary)', borderColor: 'var(--primary-hover)' }}
                    onClick={() => navigate('/create')}
                >
                    <div className="icon-wrapper" style={{ background: 'white', padding: '10px', borderRadius: '12px', cursor: 'pointer' }}>
                        <MonitorPlay size={28} color="var(--primary)" />
                    </div>
                    <h4 style={{ color: 'white', fontWeight: '800' }}>문제 만들기</h4>
                </div>
            </div>

            {/* Diagnostic Footer */}
            <div style={{ position: 'fixed', bottom: '10px', right: '20px', fontSize: '0.7rem', color: 'var(--text-muted)', display: 'flex', gap: '15px' }}>
                <span>Server IP: {window.location.hostname}</span>
                <span>Socket: <span style={{ color: socketConnected ? '#10b981' : '#ef4444', fontWeight: 'bold' }}>{socketConnected ? 'Connected' : 'Disconnected'}</span></span>
            </div>
        </div>
    );
}
