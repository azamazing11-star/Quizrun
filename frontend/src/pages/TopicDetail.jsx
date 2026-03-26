import React from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Folder, ArrowLeft, Edit3 } from 'lucide-react';

import { SUB_TOPIC_NAMES } from '../utils/constants';

export default function TopicDetail({ socket }) {
    const navigate = useNavigate();
    const { id } = useParams();

    const [subTopics, setSubTopics] = React.useState([]);
    const [allCounts, setAllCounts] = React.useState({});
    const [isLoading, setIsLoading] = React.useState(true);
    const [socketConnected, setSocketConnected] = React.useState(socket.connected);
    const [error, setError] = React.useState(null);

    // Fetch sub-topic configuration and counts from backend
    React.useEffect(() => {
        setSocketConnected(socket.connected);
        const onConnect = () => setSocketConnected(true);
        const onDisconnect = () => setSocketConnected(false);
        socket.on('connect', onConnect);
        socket.on('disconnect', onDisconnect);

        const handleConfigUpdate = (newConfig) => {
            if (newConfig[`topic_${id}`]) {
                setSubTopics(newConfig[`topic_${id}`]);
            }
        };
        socket.on('config:updated', handleConfigUpdate);

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
                if (res && res.success && res.config) {
                    clearTimeout(timeout);
                    if (res.config[`topic_${id}`]) {
                        setSubTopics(res.config[`topic_${id}`]);
                    } else {
                        // Fallback to default names only if server explicitly says it's missing
                        const baseNames = SUB_TOPIC_NAMES[id] || Array.from({ length: 24 }, (_, i) => `준비중 ${i + 1}`);
                        const defaultTopics = baseNames.map((name, i) => ({
                            id: `sub-${i + 1}`,
                            title: name,
                        }));
                        setSubTopics(defaultTopics);
                    }
                    setIsLoading(false);
                } else {
                    console.error('Config load failed or returned invalid data:', res);
                    clearTimeout(timeout);
                    setError("데이터 형식이 올바르지 않거나 서버에 문제가 있습니다.");
                    setIsLoading(false);
                }
            });

            socket.emit('quiz:getAllCounts', (res) => {
                if (res && res.success) {
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
            socket.off('config:updated', handleConfigUpdate);
        };
    }, [id, socket]);

    const saveToBackend = (updatedTopics) => {
        if (!updatedTopics || updatedTopics.length === 0) return;
        socket.emit('config:save', { [`topic_${id}`]: updatedTopics });
    };

    const [editingId, setEditingId] = React.useState(null);
    const [draggedId, setDraggedId] = React.useState(null);

    const handleRename = (id, newTitle) => {
        const updated = subTopics.map(s => s.id === id ? { ...s, title: newTitle } : s);
        setSubTopics(updated);
        saveToBackend(updated);
    };

    const onDragStart = (id) => setDraggedId(id);
    const onDragOver = (e) => e.preventDefault();
    const onDrop = (targetId) => {
        if (!draggedId || draggedId === targetId) return;
        const newTopics = [...subTopics];
        const draggedIndex = newTopics.findIndex(t => t.id === draggedId);
        const targetIndex = newTopics.findIndex(t => t.id === targetId);
        const [removed] = newTopics.splice(draggedIndex, 1);
        newTopics.splice(targetIndex, 0, removed);
        setSubTopics(newTopics);
        saveToBackend(newTopics);
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
                <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
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

            {/* Header Section: Compact Top Left with Back Button */}
            <div style={{ position: 'fixed', top: '15px', left: '20px', display: 'flex', alignItems: 'center', gap: '15px', zIndex: 300 }}>
                <img src="/logo.png" alt="Quizrun Logo" className="home-logo" style={{ height: '70px', cursor: 'pointer' }} onClick={() => navigate('/')} />
                <h1 style={{ fontSize: '2.2rem', margin: 0, color: 'var(--primary)', whiteSpace: 'nowrap', cursor: 'pointer', marginRight: '20px' }} onClick={() => navigate('/')}>
                    지식의 숲, <span style={{ color: 'var(--secondary)' }}>퀴즈런</span>
                </h1>

                <button
                    onClick={() => navigate('/')}
                    className="glass-button"
                    style={{
                        padding: '8px 16px',
                        fontSize: '0.9rem',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        background: 'rgba(255, 255, 255, 0.8)',
                        border: '1px solid #e2e8f0',
                        borderRadius: '10px',
                        fontWeight: 'bold',
                        color: 'var(--primary)',
                        cursor: 'pointer'
                    }}
                >
                    <ArrowLeft size={18} /> 이전
                </button>
            </div>

            <div className="folder-grid" style={{ zIndex: 10, marginTop: '80px' }}>
                {subTopics.map((sub) => (
                    <div
                        key={sub.id}
                        className={`folder-item ${draggedId === sub.id ? 'dragging' : ''}`}
                        draggable
                        onDragStart={() => onDragStart(sub.id)}
                        onDragOver={onDragOver}
                        onDrop={() => onDrop(sub.id)}
                        onClick={() => navigate(`/quiz/${id}/${sub.id}`)}
                    >
                        <div className="icon-wrapper" style={{ background: '#f1f5f9', padding: '10px', borderRadius: '12px' }}>
                            <Folder size={24} color="#94a338" />
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', width: '90%', justifyContent: 'center' }}>
                            {editingId === sub.id ? (
                                <input
                                    autoFocus
                                    className="folder-edit-input"
                                    value={sub.title}
                                    onChange={(e) => handleRename(sub.id, e.target.value)}
                                    onBlur={() => setEditingId(null)}
                                    onKeyDown={(e) => e.key === 'Enter' && setEditingId(null)}
                                    onClick={(e) => e.stopPropagation()}
                                />
                            ) : (
                                <>
                                    <h4 style={{ margin: 0 }}>{sub.title}</h4>
                                    <button
                                        className="edit-icon"
                                        style={{ background: 'none', border: 'none', padding: 0, display: 'flex', alignItems: 'center', opacity: 0.6, cursor: 'pointer' }}
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            setEditingId(sub.id);
                                        }}
                                    >
                                        <Edit3 size={14} />
                                    </button>
                                </>
                            )}
                        </div>
                        <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                            {(() => {
                                const key = `quizrun_data_${id}_${sub.id}`;
                                const count = allCounts[key] || 0;
                                return `${count} 문제`;
                            })()}
                        </p>
                    </div>
                ))}
            </div>
        </div>
    );
}
