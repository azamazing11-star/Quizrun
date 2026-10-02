import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useGlobalSession } from '../context/GlobalSessionContext';
import QRCode from 'react-qr-code';
import { getParticipantJoinUrl } from '../utils/url';
import { PlayCircle, MonitorPlay, Zap, BookOpen, FlaskConical, Globe, Trophy, Music, Film, Coffee, Map, Palette, Database, Cpu, Leaf, Moon, Microscope, Beaker, Atom, Compass, Book, Scale, Languages, Landmark, Edit3, Folder, Smile, ArrowLeft, Scissors, Hammer, Crown, Copy, CheckCircle2, RefreshCw, Monitor, Users, Sparkles, Cloud } from 'lucide-react';
import GitSyncModal from '../components/GitSyncModal';

const ICON_MAP = {
    '경제': <Landmark size={24} color="#059669" />,
    '시사': <Globe size={24} color="#2563eb" />,
    '유머': <Zap size={24} color="#d97706" />,
    '과학': <FlaskConical size={24} color="#4338ca" />,
    '스포츠': <Trophy size={24} color="#b45309" />,
    '문학': <Book size={24} color="#7c3aed" />,
    '수학': <Database size={24} color="#0891b2" />,
    '매너': <Smile size={24} color="#10b981" />,
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
    '사다리': <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#ea580c" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M6 3v18M18 3v18M6 7h12M6 12h12M6 17h12" /></svg>,
    '상식': <Zap size={24} color="#f59e0b" />,
    '단어 폭탄': <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#f43f5e" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="m8 12 3 3 5-5"/></svg>,
    'OX 런': <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="m8 12 3 3 5-5"/></svg>,
    '그림 퀴즈': <Palette size={24} color="#eab308" />,
    '카드 매칭': <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><rect width="7" height="9" x="3" y="3" rx="1"/><rect width="7" height="9" x="14" y="3" rx="1"/><rect width="7" height="9" x="3" y="12" rx="1"/><rect width="7" height="9" x="14" y="12" rx="1"/></svg>,
    '기억력 게임': <Cpu size={24} color="#8b5cf6" />,
    '윷놀이': <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#d97706" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="m9 9 6 6M15 9l-6 6"/></svg>,
    '폭탄 돌리기': <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="13" r="7"/><path d="M11 6V3M15 5l2-2M15 13a4 4 0 0 1-4-4"/></svg>,
    '가위바위보': <Scissors size={24} color="#4f46e5" />,
    '두더지 잡기': <Hammer size={24} color="#059669" />,
    '장기': <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#b45309" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M8 12h8M12 8v8"/></svg>,
    '체스': <Crown size={24} color="#1e293b" />,
    '오목': <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#0f172a" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 9h16M4 15h16M9 4v16M15 4v16"/><circle cx="9" cy="9" r="2" fill="#000"/><circle cx="15" cy="15" r="2" fill="#fff" stroke="#000" strokeWidth="1"/></svg>,
    '카드 게임': <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="14" height="20" x="5" y="2" rx="2" ry="2"/><path d="M12 14c1.66-2 3-4 3-5.5a3.5 3.5 0 0 0-6 0c0 1.5 1.34 3.5 3 5.5Z"/></svg>,
    '고스톱': <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#dc2626" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="14" height="20" x="5" y="2" rx="2" ry="2"/><path d="M12 7c-2 2-3 4-3 6a3 3 0 0 0 6 0c0-2-1-4-3-6Z"/></svg>,
    '오셀로': <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#15803d" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="10" cy="12" r="6" fill="#000"/><circle cx="14" cy="12" r="6" fill="#fff" stroke="#000" strokeWidth="1"/></svg>,
    '지뢰찾기': <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#475569" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="9"/><path d="M12 8v4M12 16h.01"/></svg>,
    '주식 게임': <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/></svg>,
    '미니 테트리스': <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#9333ea" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M3 3h6v6H3zM9 9h6v6H9zM15 3h6v6h-6zM3 15h6v6H3z"/></svg>,
    '벽돌깨기': <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#2563eb" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><rect x="4" y="18" width="16" height="3" rx="1"/><circle cx="12" cy="10" r="3"/><path d="m14 7-4-4"/></svg>,
    '타임어택': <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="13" r="8"/><path d="M12 9v4l2 2M12 2v3M9 2h6"/></svg>,
    '숨은 그림 찾기': <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#d97706" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/><path d="M11 8v6M8 11h6"/></svg>,
    '운세': <Sparkles size={24} color="#d946ef" />
};

const getIconByTitle = (title) => {
    const key = Object.keys(ICON_MAP).find(k => title.includes(k));
    return ICON_MAP[key] || <Folder size={24} color="#64748b" />;
};

const MULTIPLAYER_GAMES = [
    { id: 'fortune', title: '운세', bg: '#fdf4ff', count: 0 },
    { id: 'spot_difference', title: '숨은 그림 찾기', bg: '#fef3c7', count: 0 },
    { id: 'ladder', title: '사다리 타기', bg: '#ffedd5', count: 0 },
    { id: 'timeattack', title: '타임어택', bg: '#fee2e2', count: 0 },
    { id: 'word_bomb', title: '단어 폭탄', bg: '#ffe4e6', count: 0 },
    { id: 'ox_run', title: 'OX 런', bg: '#d1fae5', count: 0 },
    { id: 'catch_mind', title: '그림 퀴즈', bg: '#fef9c3', count: 0 },
    { id: 'card_match', title: '카드 매칭', bg: '#dbeafe', count: 0 },
    { id: 'memory_game', title: '기억력 게임', bg: '#ede9fe', count: 0 },
    { id: 'yutnori', title: '윷놀이', bg: '#fef3c7', count: 0 },
    { id: 'pass_bomb', title: '폭탄 돌리기', bg: '#fee2e2', count: 0 },
    { id: 'rock_paper_scissors', title: '가위바위보', bg: '#e0e7ff', count: 0 },
    { id: 'whack_mole', title: '두더지 잡기', bg: '#ecfdf5', count: 0 },
    { id: 'janggi', title: '장기', bg: '#fef3c7', count: 0 },
    { id: 'chess', title: '체스', bg: '#f1f5f9', count: 0 },
    { id: 'omok', title: '오목', bg: '#ecfdf5', count: 0 },
    { id: 'card_game', title: '카드 게임', bg: '#ffe4e6', count: 0 },
    { id: 'gostop', title: '고스톱', bg: '#fef2f2', count: 0 },
    { id: 'othello', title: '오셀로', bg: '#ecfdf5', count: 0 },
    { id: 'minesweeper', title: '지뢰찾기', bg: '#f8fafc', count: 0 },
    { id: 'stock_game', title: '주식 게임', bg: '#ecfdf5', count: 0 },
    { id: 'tetris', title: '미니 테트리스', bg: '#ede9fe', count: 0 },
    { id: 'brick_breaker', title: '벽돌깨기', bg: '#dbeafe', count: 0 }
];

const DEFAULT_QUIZZES = [
    { id: "humor", title: "유머", count: 15, bg: "#fef3c7" },
    { id: "sports", title: "스포츠", count: 9, bg: "#ffedd5" },
    { id: "law", title: "법", count: 8, bg: "#f9fafb" },
    { id: "music", title: "음악", count: 10, bg: "#fff7ed" },
    { id: "trivia", title: "상식 퀴즈", count: 20, bg: "#fffbeb" },
    { id: "travel", title: "오락", count: 8, bg: "#f0fdfa" },
    { id: "psych", title: "심리", count: 12, bg: "#fff1f2" },
    { id: "econ", title: "경제", count: 12, bg: "#d1fae5" },
    { id: "current", title: "시사", count: 8, bg: "#dbeafe" },
    { id: "science", title: "과학", count: 10, bg: "#e0e7ff" }
];

export default function Home({ socket }) {
    const navigate = useNavigate();
    const { 
        gameMode, 
        setGameMode, 
        onlinePin, 
        setOnlinePin,
        serverIp, 
        setServerIp,
        publicUrl, 
        setPublicUrl,
        onlineParticipants = [],
        setOnlineParticipants,
        createOnlineRoom
    } = useGlobalSession();
    const [isCopied, setIsCopied] = useState(false);
    const [showGitModal, setShowGitModal] = useState(false);
    const [currentMode, setCurrentMode] = useState('intro'); // 'intro', 'quizrun', 'gamerun'

    // Detect if this window is the Sub-Monitor screen
    const isSubScreen = Boolean(
        window.location.search.includes('subscreen=true') ||
        window.name === 'QuizrunSubScreenWindow' ||
        sessionStorage.getItem('is_subscreen') === 'true'
    );

    // Helper to change mode and broadcast bidirectionally
    const handleModeSelect = (newMode) => {
        setCurrentMode(newMode);
        try {
            const navBc = new BroadcastChannel('quizrun_nav_sync');
            navBc.postMessage({
                type: 'HOME_MODE_CHANGE',
                mode: newMode
            });
            setTimeout(() => navBc.close(), 300);
        } catch (e) {}
    };

    // Helper to navigate with sync (if subscreen, request main window to navigate as well)
    const handleNavWithSync = (targetPath, stateObj = null) => {
        if (isSubScreen) {
            try {
                const navBc = new BroadcastChannel('quizrun_nav_sync');
                navBc.postMessage({
                    type: 'REQUEST_MAIN_NAV',
                    path: targetPath,
                    state: stateObj
                });
                setTimeout(() => navBc.close(), 300);
            } catch (e) {}
        } else {
            navigate(targetPath, stateObj ? { state: stateObj } : undefined);
        }
    };

    const currentModeRef = useRef(currentMode);
    useEffect(() => {
        currentModeRef.current = currentMode;
    }, [currentMode]);

    // Synchronize Home tab mode bidirectionally between Main and Sub-monitor
    useEffect(() => {
        let navBc;
        try {
            navBc = new BroadcastChannel('quizrun_nav_sync');

            const handleMsg = (e) => {
                const { type, mode } = e.data || {};
                if (type === 'HOME_MODE_CHANGE' && mode) {
                    if (currentModeRef.current !== mode) {
                        setCurrentMode(mode);
                    }
                } else if (type === 'REQUEST_HOME_MODE') {
                    navBc.postMessage({
                        type: 'HOME_MODE_CHANGE',
                        mode: currentModeRef.current
                    });
                }
            };

            navBc.addEventListener('message', handleMsg);

            // Request active mode from peer strictly upon mount
            if (isSubScreen) {
                navBc.postMessage({ type: 'REQUEST_HOME_MODE' });
            }

            return () => {
                navBc.removeEventListener('message', handleMsg);
                navBc.close();
            };
        } catch (e) {
            console.warn('Home sync error:', e);
        }
    }, [isSubScreen]);

    const [quizzes, setQuizzes] = useState(() => {
        try {
            const cached = localStorage.getItem('quizrun_cached_quizzes');
            if (cached) {
                const parsed = JSON.parse(cached);
                if (Array.isArray(parsed) && parsed.length > 0) return parsed;
            }
        } catch (e) {}
        return DEFAULT_QUIZZES;
    });
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState(null);

    const [editingId, setEditingId] = useState(null);
    const [draggedId, setDraggedId] = useState(null);
    const [games, setGames] = useState(() => {
        const saved = localStorage.getItem('gamerun_games_order');
        if (saved) {
            try {
                const parsed = JSON.parse(saved);
                const remapped = Array.isArray(parsed) ? parsed.map(g => (g.id === 'card_poker' || g.title === '포커 카드') ? { ...g, id: 'card_game', title: '카드 게임' } : g) : [];
                const validIds = new Set(MULTIPLAYER_GAMES.map(g => g.id));
                const filteredParsed = remapped.filter(g => validIds.has(g.id));
                const currentIds = filteredParsed.map(g => g.id);
                
                // If fortune is missing in saved order, insert it at front
                if (!currentIds.includes('fortune')) {
                    const fortuneItem = MULTIPLAYER_GAMES.find(g => g.id === 'fortune');
                    if (fortuneItem) {
                        filteredParsed.unshift(fortuneItem);
                    }
                }
                
                // If timeattack is missing in saved order, insert it left of ladder
                if (!currentIds.includes('timeattack')) {
                    const ladderIndex = filteredParsed.findIndex(g => g.id === 'ladder');
                    const newItem = MULTIPLAYER_GAMES.find(g => g.id === 'timeattack');
                    if (newItem) {
                        if (ladderIndex !== -1) {
                            filteredParsed.splice(ladderIndex, 0, newItem);
                        } else {
                            filteredParsed.push(newItem);
                        }
                    }
                }
                
                const updatedIds = filteredParsed.map(g => g.id);
                const missing = MULTIPLAYER_GAMES.filter(g => !updatedIds.includes(g.id));
                return [...filteredParsed, ...missing];
            } catch (e) {
                return [...MULTIPLAYER_GAMES];
            }
        }
        return [...MULTIPLAYER_GAMES];
    });

    const [allCounts, setAllCounts] = useState({});
    const [socketConnected, setSocketConnected] = useState(socket.connected);

    useEffect(() => {
        setSocketConnected(socket.connected);
        const onConnect = () => setSocketConnected(true);
        const onDisconnect = () => setSocketConnected(false);
        socket.on('connect', onConnect);
        socket.on('disconnect', onDisconnect);

        const handleUpdate = (newConfig) => {
            if (newConfig && newConfig.quizzes) {
                setQuizzes(newConfig.quizzes);
                try {
                    localStorage.setItem('quizrun_cached_quizzes', JSON.stringify(newConfig.quizzes));
                } catch (e) {}
            }
        };
        socket.on('config:updated', handleUpdate);

        // Reset sub-monitor screen to waiting state when returning to Home
        try {
            const screenChannel = new BroadcastChannel('quizrun_screen_sync');
            screenChannel.postMessage({
                type: 'STATE_UPDATE',
                payload: {
                    gameState: 'waiting',
                    currentQuestion: '',
                    currentOptions: [],
                    quizTitle: '퀴즈앤런 (Quiz N Run)'
                }
            });
            setTimeout(() => screenChannel.close(), 1000);
        } catch (e) {}

        // Initial load
        const loadEverything = () => {
            socket.emit('config:load', (res) => {
                if (res && res.success && res.config && res.config.quizzes) {
                    setQuizzes(res.config.quizzes);
                    try {
                        localStorage.setItem('quizrun_cached_quizzes', JSON.stringify(res.config.quizzes));
                    } catch (e) {}
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

        const handleTunnelUpdate = (data) => {
            if (data) {
                if (data.publicUrl) setPublicUrl(data.publicUrl);
                if (data.isVerifying !== undefined) setIsTunnelVerifying(data.isVerifying);
            }
        };
        socket.on('tunnel:updated', handleTunnelUpdate);

        return () => {
            socket.off('connect', onConnect);
            socket.off('disconnect', onDisconnect);
            socket.off('config:updated', handleUpdate);
            socket.off('tunnel:updated', handleTunnelUpdate);
        };
    }, [socket]);

    const saveConfig = (newQuizzes) => {
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

    const handleRename = (id, newTitle) => {
        setQuizzes(quizzes.map(q => q.id === id ? { ...q, title: newTitle } : q));
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
        if (isGameLobby) {
            const targetIndex = games.findIndex(g => g.id === targetId);
            const draggedIndex = games.findIndex(g => g.id === draggedId);
            if (targetIndex !== -1 && draggedIndex !== -1) {
                const newGames = [...games];
                const [removed] = newGames.splice(draggedIndex, 1);
                newGames.splice(targetIndex, 0, removed);
                setGames(newGames);
                localStorage.setItem('gamerun_games_order', JSON.stringify(newGames));
            }
        } else {
            const targetIndex = quizzes.findIndex(q => q.id === targetId);
            const draggedIndex = quizzes.findIndex(q => q.id === draggedId);
            const newQuizzes = [...quizzes];
            const [removed] = newQuizzes.splice(draggedIndex, 1);
            newQuizzes.splice(targetIndex, 0, removed);
            saveConfig(newQuizzes);
        }
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

    const [isRestartingTunnel, setIsRestartingTunnel] = useState(false);
    const [isTunnelVerifying, setIsTunnelVerifying] = useState(false);

    const joinUrl = getParticipantJoinUrl(onlinePin, publicUrl, serverIp);



    const handleCopyUrl = () => {
        if (!onlinePin) return;
        navigator.clipboard.writeText(joinUrl);
        setIsCopied(true);
        setTimeout(() => setIsCopied(false), 2000);
    };

    const handleRefreshPin = () => {
        if (socket) {
            setIsRestartingTunnel(true);
            createOnlineRoom(socket, true);
            setTimeout(() => setIsRestartingTunnel(false), 800);
        }
    };


    // --- INTRO FIGHTING VS SCREEN VIEW ---
    if (currentMode === 'intro') {
        return (
            <div className="full-screen-container" style={{ 
                flexDirection: 'column', 
                alignItems: 'center', 
                justifyContent: 'center',
                background: 'radial-gradient(circle at center, #f8fafc 0%, #e2e8f0 100%)',
                color: '#1e293b',
                minHeight: '100vh',
                position: 'relative',
                overflow: 'hidden',
                padding: '2rem'
            }}>
                {/* Top-Left: Sub-Monitor Screen Launcher (Only visible on Main Screen) */}
                {!isSubScreen && (
                    <button
                        onClick={() => {
                            window.open('/?subscreen=true', 'QuizrunSubScreenWindow', 'width=1280,height=720,menubar=no,toolbar=no,location=no,status=no');
                        }}
                        style={{
                            position: 'absolute',
                            top: '24px',
                            left: '24px',
                            zIndex: 200,
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
                            color: 'white',
                            padding: '10px 18px',
                            borderRadius: '16px',
                            fontWeight: '800',
                            fontSize: '0.92rem',
                            border: 'none',
                            cursor: 'pointer',
                            boxShadow: '0 6px 18px rgba(37, 99, 235, 0.35)',
                            transition: 'all 0.2s'
                        }}
                        title="서브 모니터(빔프로젝터)에 띄울 스크린 창을 엽니다."
                    >
                        <Monitor size={18} />
                        <span>🖥️ 서브 스크린 창 열기</span>
                    </button>
                )}

                {/* Top-Right: GitHub Sync & Cloud Backup Launcher */}
                {!isSubScreen && (
                    <button
                        onClick={() => setShowGitModal(true)}
                        style={{
                            position: 'absolute',
                            top: '24px',
                            right: '24px',
                            zIndex: 200,
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
                            color: 'white',
                            padding: '10px 18px',
                            borderRadius: '16px',
                            fontWeight: '800',
                            fontSize: '0.92rem',
                            border: '1.5px solid rgba(255, 255, 255, 0.15)',
                            cursor: 'pointer',
                            boxShadow: '0 6px 18px rgba(15, 23, 42, 0.25)',
                            transition: 'all 0.2s'
                        }}
                        title="깃허브 백업 및 최신 버전 업데이트 창을 엽니다."
                    >
                        <Cloud size={18} color="#38bdf8" />
                        <span>GitHub</span>
                    </button>
                )}

                {/* Custom Levitating & Neon CSS Styles */}
                <style>{`
                    @keyframes levitate {
                        0% { transform: translateY(0px); }
                        50% { transform: translateY(-15px); }
                        100% { transform: translateY(0px); }
                    }
                    @keyframes pulse-vs {
                        0% { transform: scale(1); filter: drop-shadow(0 0 10px #f59e0b); }
                        50% { transform: scale(1.15); filter: drop-shadow(0 0 25px #fbbf24); }
                        100% { transform: scale(1); filter: drop-shadow(0 0 10px #f59e0b); }
                    }
                    @keyframes popIn {
                        0% { transform: scale(0.8); opacity: 0; }
                        100% { transform: scale(1); opacity: 1; }
                    }
                    .vs-robot-left {
                        max-height: 280px;
                        object-fit: contain;
                    }
                    .vs-robot-right {
                        max-height: 280px;
                        object-fit: contain;
                    }
                    .vs-card-left {
                        transition: all 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275);
                        cursor: pointer;
                        border: 3px solid rgba(59, 130, 246, 0.15);
                        background: rgba(255, 255, 255, 0.88);
                        backdrop-filter: blur(10px);
                        box-shadow: 0 10px 30px rgba(0, 0, 0, 0.05);
                        color: #1e293b;
                    }
                    .vs-card-left:hover {
                        transform: scale(1.04) translateY(-8px);
                        border-color: #3b82f6;
                        box-shadow: 0 20px 45px rgba(59, 130, 246, 0.25);
                    }
                    .vs-card-right {
                        transition: all 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275);
                        cursor: pointer;
                        border: 3px solid rgba(244, 63, 94, 0.15);
                        background: rgba(255, 255, 255, 0.88);
                        backdrop-filter: blur(10px);
                        box-shadow: 0 10px 30px rgba(0, 0, 0, 0.05);
                        color: #1e293b;
                    }
                    .vs-card-right:hover {
                        transform: scale(1.04) translateY(-8px);
                        border-color: #f43f5e;
                        box-shadow: 0 20px 45px rgba(244, 63, 94, 0.25);
                    }
                    @media (max-width: 768px) {
                        .vs-card-container {
                            flex-direction: column !important;
                            gap: 1rem !important;
                            padding: 0 10px !important;
                        }
                        .vs-card-left, .vs-card-right {
                            min-width: 0 !important;
                            padding: 1.2rem 0.5rem !important;
                            border-radius: 20px !important;
                            width: 100% !important;
                            transform: none !important;
                        }
                        .vs-card-left h2, .vs-card-right h2 {
                            font-size: 1.2rem !important;
                        }
                        .vs-robot-left, .vs-robot-right {
                            max-height: 140px !important;
                        }
                        .vs-badge {
                            width: 50px !important;
                            height: 50px !important;
                            font-size: 1.3rem !important;
                            border-width: 2px !important;
                            margin: 0 !important;
                        }
                    }
                `}</style>

                {/* Tech grid lines overlay */}
                <div style={{ position: 'absolute', inset: 0, backgroundImage: 'linear-gradient(rgba(15,23,42,0.035) 1px, transparent 1px), linear-gradient(90deg, rgba(15,23,42,0.035) 1px, transparent 1px)', backgroundSize: '40px 40px', pointerEvents: 'none', zIndex: 0 }} />

                <div style={{ zIndex: 10, textAlign: 'center', marginBottom: '1.5rem' }}>
                    <h1 style={{ fontSize: '3.2rem', fontFamily: 'Jua, sans-serif', background: 'linear-gradient(to right, #3b82f6, #f43f5e)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', letterSpacing: '2px', filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.1))', margin: 0 }}>퀴즈앤런 (Quiz N Run)</h1>
                    <p style={{ fontSize: '1.15rem', color: '#475569', marginTop: '6px', fontFamily: 'Gowun Dodum, sans-serif', fontWeight: 'bold' }}>플레이할 모드를 선택해 주세요</p>
                </div>

                <div className="vs-card-container" style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'center', 
                    gap: gameMode === 'online' ? '1.8rem' : '1.5rem', 
                    width: '100%', 
                    maxWidth: gameMode === 'online' ? '980px' : '840px', 
                    zIndex: 10, 
                    flexWrap: 'nowrap',
                    transition: 'all 0.5s ease'
                }}>
                    
                    {/* Left Challenger: Quizrun */}
                    <div 
                        className="vs-card-left" 
                        onClick={() => handleModeSelect('quizrun')} 
                        style={{ 
                            flex: 1, 
                            minWidth: '200px', 
                            borderRadius: '28px', 
                            padding: '1.8rem 1.2rem', 
                            display: 'flex', 
                            flexDirection: 'column', 
                            alignItems: 'center', 
                            textAlign: 'center',
                            transform: gameMode === 'online' ? 'translateX(-10px)' : 'none'
                        }}
                    >
                        <div style={{ height: '220px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <img src="/quizrun_study_robot.png?v=3" alt="Quizrun Robot" className="vs-robot-left" style={{ maxHeight: '200px' }} />
                        </div>
                        <h2 style={{ fontSize: '1.8rem', fontFamily: 'Jua, sans-serif', color: '#3b82f6', margin: '0.8rem 0 0' }}>퀴즈런 (Quizrun)</h2>
                    </div>

                    {/* Center: Online QR Code or VS Badge */}
                    {gameMode === 'online' ? (
                        <div 
                            className="animate-pop-in" 
                            style={{ 
                                width: '260px', 
                                minWidth: '260px', 
                                background: 'white', 
                                borderRadius: '26px', 
                                padding: '1.2rem 1rem', 
                                display: 'flex', 
                                flexDirection: 'column', 
                                alignItems: 'center', 
                                textAlign: 'center', 
                                boxShadow: '0 15px 35px rgba(14, 165, 233, 0.18), 0 0 0 3px #38bdf8', 
                                zIndex: 20,
                                animation: 'popIn 0.35s cubic-bezier(0.175, 0.885, 0.32, 1.275)'
                            }}
                        >
                            <div style={{ fontSize: '1.4rem', fontWeight: '900', color: 'var(--primary)', marginBottom: '8px', letterSpacing: '1px' }}>
                                PIN: {onlinePin || '생성 중...'}
                            </div>

                            {onlinePin ? (
                                (!publicUrl && isTunnelVerifying) ? (
                                    <div style={{ height: '135px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '8px', padding: '10px' }}>
                                        <RefreshCw size={26} className="animate-spin" color="var(--primary)" />
                                        <span style={{ fontSize: '0.78rem', color: '#64748b', fontWeight: 'bold' }}>
                                            전용 인터넷 터널 준비 중...
                                        </span>
                                    </div>
                                ) : (
                                    <div style={{ 
                                        padding: '8px', 
                                        background: 'white', 
                                        borderRadius: '16px', 
                                        boxShadow: '0 4px 12px rgba(0,0,0,0.06)', 
                                        border: '1.5px solid #e2e8f0', 
                                        marginBottom: '8px' 
                                    }}>
                                        <QRCode value={joinUrl} size={135} style={{ height: 'auto', maxWidth: '100%', width: '100%' }} viewBox="0 0 135 135" />
                                    </div>
                                )
                            ) : (
                                <div 
                                    onClick={handleRefreshPin}
                                    style={{ height: '135px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
                                    title="클릭하여 PIN 발급"
                                >
                                    <RefreshCw size={24} className="animate-spin" color="var(--primary)" />
                                    <span style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '8px', fontWeight: 'bold' }}>클릭하여 PIN 발급</span>
                                </div>
                            )}

                            <div style={{ display: 'flex', gap: '4px', marginBottom: '8px', width: '100%', justifyContent: 'center' }}>
                                <button
                                    onClick={handleCopyUrl}
                                    style={{
                                        flex: 1,
                                        padding: '6px 8px',
                                        borderRadius: '8px',
                                        border: 'none',
                                        background: isCopied ? '#10b981' : 'var(--primary)',
                                        color: 'white',
                                        fontSize: '0.74rem',
                                        fontWeight: '800',
                                        cursor: 'pointer',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        gap: '3px'
                                    }}
                                >
                                    {isCopied ? <CheckCircle2 size={12} /> : <Copy size={12} />}
                                    {isCopied ? '복사 완료!' : '주소 복사'}
                                </button>
                                <button
                                    onClick={handleRefreshPin}
                                    disabled={isRestartingTunnel}
                                    title="새 방 PIN 및 QR 새로고침"
                                    style={{
                                        padding: '6px 8px',
                                        borderRadius: '8px',
                                        border: '1px solid #bae6fd',
                                        background: isRestartingTunnel ? '#e2e8f0' : 'white',
                                        color: '#0284c7',
                                        fontSize: '0.74rem',
                                        fontWeight: '800',
                                        cursor: isRestartingTunnel ? 'wait' : 'pointer',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '3px'
                                    }}
                                >
                                    <RefreshCw size={12} className={isRestartingTunnel ? 'animate-spin' : ''} />
                                    {isRestartingTunnel ? '재생성 중...' : '새로고침'}
                                </button>
                            </div>

                            {publicUrl || (typeof window !== 'undefined' && window.location.hostname !== 'localhost' && !window.location.hostname.startsWith('192.168.') && !window.location.hostname.startsWith('10.')) ? (
                                <div style={{ fontSize: '0.72rem', fontWeight: '800', color: '#047857', background: '#ecfdf5', border: '1px solid #a7f3d0', padding: '5px 8px', borderRadius: '8px', marginBottom: '8px', width: '100%' }}>
                                    🚀 5G / LTE / Wi-Fi 어디서나 접속 가능
                                </div>
                            ) : isTunnelVerifying ? (
                                <div style={{ fontSize: '0.72rem', fontWeight: '700', color: '#b45309', background: '#fffbeb', border: '1px solid #fde68a', padding: '5px 8px', borderRadius: '8px', marginBottom: '8px', width: '100%' }}>
                                    ⏳ 전용 터널 활성화 중...
                                </div>
                            ) : (
                                <div style={{ fontSize: '0.72rem', fontWeight: '800', color: '#0369a1', background: '#e0f2fe', border: '1px solid #bae6fd', padding: '5px 8px', borderRadius: '8px', marginBottom: '8px', width: '100%' }}>
                                    📶 로컬 Wi-Fi 접속 모드
                                </div>
                            )}

                            <div style={{ fontSize: '0.8rem', fontWeight: '800', color: onlineParticipants.length > 0 ? '#059669' : '#64748b' }}>
                                {onlineParticipants.length > 0 ? `🟢 ${onlineParticipants.length}명 입장 완료` : '참여자 대기 중...'}
                            </div>

                            {onlineParticipants.length > 0 && (
                                <div style={{
                                    marginTop: '6px',
                                    display: 'flex',
                                    flexWrap: 'wrap',
                                    gap: '4px',
                                    maxHeight: '68px',
                                    overflowY: 'auto',
                                    justifyContent: 'center',
                                    width: '100%'
                                }}>
                                    {onlineParticipants.map((p, idx) => (
                                        <span
                                            key={p.id || idx}
                                            style={{
                                                fontSize: '0.72rem',
                                                fontWeight: '800',
                                                background: '#f1f5f9',
                                                color: '#334155',
                                                padding: '2px 8px',
                                                borderRadius: '10px',
                                                border: '1px solid #cbd5e1'
                                            }}
                                        >
                                            👤 {p.nickname}
                                        </span>
                                    ))}
                                </div>
                            )}
                        </div>
                    ) : (
                        /* VS Badge */
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                            <div className="vs-badge" style={{ 
                                width: '70px', 
                                height: '70px', 
                                borderRadius: '50%', 
                                background: 'linear-gradient(135deg, #f59e0b, #d97706)',
                                display: 'flex', 
                                alignItems: 'center', 
                                justifyContent: 'center', 
                                fontSize: '2rem', 
                                fontWeight: '900', 
                                fontStyle: 'italic', 
                                color: 'white', 
                                boxShadow: '0 0 20px #d97706', 
                                border: '3px solid white', 
                                zIndex: 20 
                            }}>
                                VS
                            </div>
                        </div>
                    )}

                    {/* Right Challenger: Gamerun */}
                    <div 
                        className="vs-card-right" 
                        onClick={() => handleModeSelect('gamerun')} 
                        style={{ 
                            flex: 1, 
                            minWidth: '200px', 
                            borderRadius: '28px', 
                            padding: '1.8rem 1.2rem', 
                            display: 'flex', 
                            flexDirection: 'column', 
                            alignItems: 'center', 
                            textAlign: 'center',
                            transform: gameMode === 'online' ? 'translateX(10px)' : 'none'
                        }}
                    >
                        <div style={{ height: '220px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <img src="/gamerun_robot.png?v=3" alt="Gamerun Robot" className="vs-robot-right" style={{ maxHeight: '200px' }} />
                        </div>
                        <h2 style={{ fontSize: '1.8rem', fontFamily: 'Jua, sans-serif', color: '#f43f5e', margin: '0.8rem 0 0' }}>게임런 (Gamerun)</h2>
                    </div>

                </div>

                {/* Mode Selector: Online vs Offline positioned directly under the images */}
                <div style={{ marginTop: '2.2rem', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', zIndex: 10 }}>
                    <div style={{ fontSize: '0.92rem', fontWeight: '800', color: '#475569', letterSpacing: '0.5px' }}>
                        ⚙️ 진행 방식 선택
                    </div>
                    <div style={{ 
                        display: 'flex', 
                        background: 'rgba(255, 255, 255, 0.92)', 
                        backdropFilter: 'blur(10px)',
                        padding: '6px', 
                        borderRadius: '20px', 
                        border: '2px solid #cbd5e1', 
                        boxShadow: '0 6px 20px rgba(0, 0, 0, 0.06)',
                        gap: '8px'
                    }}>
                        <button
                            onClick={() => setGameMode('online')}
                            style={{
                                padding: '9px 24px',
                                borderRadius: '15px',
                                border: 'none',
                                background: gameMode === 'online' ? 'linear-gradient(135deg, #0284c7 0%, #0369a1 100%)' : 'transparent',
                                color: gameMode === 'online' ? 'white' : '#64748b',
                                fontWeight: '900',
                                fontSize: '1rem',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '8px',
                                boxShadow: gameMode === 'online' ? '0 4px 15px rgba(2, 132, 199, 0.35)' : 'none',
                                transition: 'all 0.25s'
                            }}
                        >
                            <Globe size={18} /> Online (온라인)
                        </button>
                        <button
                            onClick={() => setGameMode('offline')}
                            style={{
                                padding: '9px 24px',
                                borderRadius: '15px',
                                border: 'none',
                                background: gameMode === 'offline' ? 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)' : 'transparent',
                                color: gameMode === 'offline' ? 'white' : '#64748b',
                                fontWeight: '900',
                                fontSize: '1rem',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '8px',
                                boxShadow: gameMode === 'offline' ? '0 4px 15px rgba(245, 158, 11, 0.35)' : 'none',
                                transition: 'all 0.25s'
                            }}
                        >
                            <Monitor size={18} /> Offline (오프라인)
                        </button>
                    </div>
                    <div style={{ fontSize: '0.82rem', color: '#64748b', fontWeight: 'bold' }}>
                        {gameMode === 'online' 
                            ? '📱 스마트폰으로 QR 코드를 스캔하여 실시간으로 함께 대결합니다' 
                            : '📺 한 화면을 함께 보며 오프라인으로 점수판을 관리합니다'}
                    </div>
                </div>

                {/* Footer status bar */}
                <div style={{ position: 'absolute', bottom: '15px', right: '20px', fontSize: '0.75rem', color: '#64748b' }}>
                    Server IP: {window.location.hostname} | Socket: <span style={{ color: socketConnected ? '#10b981' : '#ef4444', fontWeight: 'bold' }}>{socketConnected ? 'Connected' : 'Disconnected'}</span>
                </div>

                <GitSyncModal isOpen={showGitModal} onClose={() => setShowGitModal(false)} />
            </div>
        );
    }

    // --- QUIZRUN & GAMERUN MODE LOBBY VIEW ---
    const isGameLobby = currentMode === 'gamerun';
    const activeMascot = isGameLobby ? "/gamerun_choose_robot.png?v=3" : "/emoticon.png";
    const primaryColor = isGameLobby ? "#f43f5e" : "var(--primary)";
    const secondaryColor = isGameLobby ? "#3b82f6" : "var(--secondary)";
    
    const displaySubjects = isGameLobby ? games : quizzes.filter(q => q.id !== 'ladder' && q.title !== '사다리');

    return (
        <div className="full-screen-container" style={{ 
            flexDirection: 'column', 
            alignItems: 'center', 
            paddingTop: '1rem', 
            overflowX: 'hidden'
        }}>

            {/* Header Section: Compact Top Left */}
            <div style={{ position: 'fixed', top: '15px', left: '20px', display: 'flex', alignItems: 'center', gap: '15px', zIndex: 300 }}>
                {/* Back to VS selection icon */}
                <button 
                    onClick={() => handleModeSelect('intro')} 
                    style={{
                        padding: '8px 16px',
                        fontSize: '0.9rem',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        background: 'white',
                        border: '1.5px solid #e2e8f0',
                        borderRadius: '12px',
                        fontWeight: 'bold',
                        color: 'var(--primary)',
                        cursor: 'pointer',
                        boxShadow: '0 4px 6px rgba(0,0,0,0.05)',
                        transition: 'all 0.2s'
                    }}
                    title="대결 선택 화면으로 가기"
                >
                    <ArrowLeft size={16} /> 대결 선택
                </button>
                {!isGameLobby && <img src="/logo.png?v=3" alt="Quiz N Run Logo" className="home-logo" style={{ height: '70px', cursor: 'pointer' }} onClick={() => handleModeSelect('intro')} />}
                <h1 style={{ fontSize: '2.2rem', margin: 0, color: primaryColor, whiteSpace: 'nowrap', cursor: 'pointer' }} onClick={() => handleModeSelect('intro')}>
                    {isGameLobby ? (
                        <span>무한 재미</span>
                    ) : (
                        <>지식의 숲, <span style={{ color: secondaryColor }}>퀴즈런</span></>
                    )}
                </h1>
            </div>

            {/* Header Right: Open Sub Monitor Screen Window */}
            {!isSubScreen && (
                <button
                    onClick={() => {
                        window.open('/screen?subscreen=true', 'QuizrunScreenWindow', 'width=1280,height=720,menubar=no,toolbar=no,location=no,status=no');
                    }}
                    style={{
                        position: 'fixed',
                        top: '18px',
                        right: '25px',
                        zIndex: 300,
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        background: isGameLobby 
                            ? 'linear-gradient(135deg, #f43f5e 0%, #e11d48 100%)' 
                            : 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
                        color: 'white',
                        padding: '10px 18px',
                        borderRadius: '16px',
                        fontWeight: '800',
                        fontSize: '0.92rem',
                        border: 'none',
                        cursor: 'pointer',
                        boxShadow: isGameLobby 
                            ? '0 6px 18px rgba(244, 63, 94, 0.35)' 
                            : '0 6px 18px rgba(37, 99, 235, 0.35)',
                        transition: 'all 0.2s'
                    }}
                    title="서브 모니터(빔프로젝터)에 띄울 스크린 창을 엽니다."
                >
                    <Monitor size={18} />
                    <span>🖥️ 서브 모니터 스크린 열기</span>
                </button>
            )}

            {/* Folder Grid */}
            <div className="folder-grid" style={{ zIndex: 10, marginTop: '80px' }}>

                {/* 1. Code Join (Static) */}
                <div style={{ position: 'relative' }}>
                    <div
                        className="folder-item"
                        style={{ border: `2px dashed ${primaryColor}`, background: '#f0f9ff' }}
                        onClick={() => handleNavWithSync('/participant')}
                    >
                        <div className="icon-wrapper" style={{ background: 'white', padding: '10px', borderRadius: '12px', cursor: 'pointer' }}>
                            <PlayCircle size={28} color={primaryColor} />
                        </div>
                        <h4 style={{ color: primaryColor, fontWeight: '800' }}>코드 참여</h4>
                    </div>

                    <img
                        src={activeMascot}
                        alt="Mode Character"
                        className="pondering-emoticon animate-levitate"
                        style={{ left: '-165px', top: '50%', transform: 'translateY(-50%)', maxHeight: '110px', objectFit: 'contain' }}
                        title={isGameLobby ? "게임 코드로 접속하기!" : "입장 코드 입력하기!"}
                    />
                </div>

                {/* 2. Draggable/Interactive Subject Folders */}
                {displaySubjects.map((quiz) => (
                    <div
                        key={quiz.id}
                        className={`folder-item ${draggedId === quiz.id ? 'dragging' : ''}`}
                        style={{}}
                        draggable={editingId !== quiz.id}
                        onDragStart={() => handleDragStart(quiz.id)}
                        onDragOver={handleDragOver}
                        onDrop={() => handleDrop(quiz.id)}
                        onClick={() => {
                            if (isGameLobby) {
                                // Navigate to host multiplayer game screen
                                if (quiz.id === 'fortune') {
                                    handleNavWithSync('/fortune');
                                } else if (quiz.id === 'ladder') {
                                    handleNavWithSync('/ladder');
                                } else if (quiz.id === 'spot_difference') {
                                    handleNavWithSync('/spot-difference');
                                } else if (quiz.id === 'timeattack') {
                                    handleNavWithSync('/timeattack');
                                } else if (quiz.id === 'card_game' || quiz.id === 'card_poker' || quiz.title === '카드 게임') {
                                    handleNavWithSync('/card-game');
                                } else {
                                    try {
                                        sessionStorage.setItem('quizrun_last_host_state', JSON.stringify({ 
                                            isGame: true, 
                                            gameId: quiz.id, 
                                            gameTitle: quiz.title, 
                                            pin: onlinePin 
                                        }));
                                    } catch (e) {}
                                    handleNavWithSync('/host', { isGame: true, gameId: quiz.id, gameTitle: quiz.title, pin: onlinePin });
                                }
                            } else {
                                try {
                                    sessionStorage.removeItem('quizrun_last_host_state');
                                } catch (e) {}
                                if (editingId !== quiz.id) {
                                    if (quiz.id === 'ladder' || quiz.title === '사다리') {
                                        handleNavWithSync('/ladder');
                                    } else if (quiz.id === 'spot_difference' || quiz.title === '숨은 그림 찾기') {
                                        handleNavWithSync('/spot-difference');
                                    } else if (quiz.id === 'timeattack' || quiz.title === '타임어택') {
                                        handleNavWithSync('/timeattack');
                                    } else {
                                        handleNavWithSync(`/topic/${quiz.id}`);
                                    }
                                }
                            }
                        }}
                    >
                        <div className="icon-wrapper" style={{ background: quiz.bg, padding: '10px', borderRadius: '12px' }}>
                            {getIconByTitle(quiz.title)}
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', width: '90%', justifyContent: 'center' }}>
                            {!isGameLobby && editingId === quiz.id ? (
                                <input
                                    autoFocus
                                    className="folder-edit-input"
                                    value={quiz.title}
                                    onChange={(e) => handleRename(quiz.id, e.target.value)}
                                    onBlur={() => handleTitleEdit(quiz.id, quiz.title)}
                                    onKeyDown={(e) => e.key === 'Enter' && handleTitleEdit(quiz.id, quiz.title)}
                                    onClick={(e) => e.stopPropagation()}
                                />
                            ) : (
                                <>
                                    <h4 style={{ margin: 0 }}>{quiz.title}</h4>
                                    {!isGameLobby && (
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
                                    )}
                                </>
                            )}
                        </div>
                        <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                            {isGameLobby ? '미니 게임' : (() => {
                                let total = 0;
                                for (let i = 1; i <= 24; i++) {
                                    const key = `quizrun_data_${quiz.id}_sub-${i}`;
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
                    style={{ background: primaryColor, borderColor: primaryColor }}
                    onClick={() => navigate('/create')}
                >
                    <div className="icon-wrapper" style={{ background: 'white', padding: '10px', borderRadius: '12px', cursor: 'pointer' }}>
                        <MonitorPlay size={28} color={primaryColor} />
                    </div>
                    <h4 style={{ color: 'white', fontWeight: '800' }}>문제 만들기</h4>
                </div>
            </div>

            {/* Diagnostic Footer */}
            <div style={{ position: 'fixed', bottom: '10px', right: '20px', fontSize: '0.7rem', color: 'var(--text-muted)', display: 'flex', gap: '15px' }}>
                <span>Server IP: {window.location.hostname}</span>
                <span>Socket: <span style={{ color: socketConnected ? '#10b981' : '#ef4444', fontWeight: 'bold' }}>{socketConnected ? 'Connected' : 'Disconnected'}</span></span>
            </div>

            <GitSyncModal isOpen={showGitModal} onClose={() => setShowGitModal(false)} />
        </div>
    );
}
