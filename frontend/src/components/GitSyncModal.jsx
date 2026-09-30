import React, { useState, useEffect } from 'react';
import { 
    Cloud, 
    UploadCloud, 
    DownloadCloud, 
    RefreshCw, 
    CheckCircle2, 
    AlertTriangle, 
    X, 
    GitBranch, 
    Clock, 
    Sparkles, 
    Check, 
    ExternalLink,
    Terminal
} from 'lucide-react';

export default function GitSyncModal({ isOpen, onClose }) {
    const [gitStatus, setGitStatus] = useState(null);
    const [isLoadingStatus, setIsLoadingStatus] = useState(false);
    const [isPushing, setIsPushing] = useState(false);
    const [isPulling, setIsPulling] = useState(false);
    const [customMessage, setCustomMessage] = useState('');
    const [statusMessage, setStatusMessage] = useState(null); // { type: 'success' | 'error' | 'info', text: '' }

    const fetchGitStatus = async () => {
        setIsLoadingStatus(true);
        try {
            const res = await fetch('/api/git/status');
            const data = await res.json();
            if (data.success) {
                setGitStatus(data);
            }
        } catch (err) {
            console.error('Failed to fetch Git status:', err);
        } finally {
            setIsLoadingStatus(false);
        }
    };

    useEffect(() => {
        if (isOpen) {
            setStatusMessage(null);
            fetchGitStatus();
        }
    }, [isOpen]);

    const handlePush = async () => {
        if (isPushing || isPulling) return;
        setIsPushing(true);
        setStatusMessage({ type: 'info', text: '깃허브로 변경 사항을 업로드(Push) 중입니다...' });

        try {
            const res = await fetch('/api/git/push', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ message: customMessage || undefined })
            });
            const data = await res.json();

            if (data.success) {
                setStatusMessage({ type: 'success', text: data.message || '깃허브 백업이 완료되었습니다!' });
                setCustomMessage('');
                fetchGitStatus();
            } else {
                setStatusMessage({ type: 'error', text: data.message || '깃허브 업로드 중 오류가 발생했습니다.' });
            }
        } catch (err) {
            setStatusMessage({ type: 'error', text: `네트워크 오류: ${err.message}` });
        } finally {
            setIsPushing(false);
        }
    };

    const handlePull = async () => {
        if (isPushing || isPulling) return;
        if (!window.confirm('깃허브에서 최신 코드를 다운로드하고 적용하시겠습니까?\n업데이트 후 페이지가 자동으로 새로고침됩니다.')) {
            return;
        }

        setIsPulling(true);
        setStatusMessage({ type: 'info', text: '최신 코드를 다운로드하고 프론트엔드를 빌드하는 중입니다 (약 5~10초 소요)...' });

        try {
            const res = await fetch('/api/git/pull', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' }
            });
            const data = await res.json();

            if (data.success) {
                setStatusMessage({ type: 'success', text: '✅ 업데이트 완료! 잠시 후 화면이 새로고침됩니다.' });
                setTimeout(() => {
                    window.location.reload();
                }, 1500);
            } else {
                setStatusMessage({ type: 'error', text: data.message || '깃허브 업데이트 중 오류가 발생했습니다.' });
                setIsPulling(false);
            }
        } catch (err) {
            setStatusMessage({ type: 'error', text: `네트워크 오류: ${err.message}` });
            setIsPulling(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(15, 23, 42, 0.65)',
            backdropFilter: 'blur(8px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 100000,
            padding: '20px',
            animation: 'fadeIn 0.2s ease-out'
        }}>
            <div style={{
                background: 'white',
                width: '100%',
                maxWidth: '540px',
                borderRadius: '28px',
                boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25), 0 0 0 1px rgba(226, 232, 240, 0.8)',
                overflow: 'hidden',
                display: 'flex',
                flexDirection: 'column',
                animation: 'popIn 0.3s cubic-bezier(0.16, 1, 0.3, 1)'
            }}>
                {/* Modal Header */}
                <div style={{
                    padding: '1.2rem 1.6rem',
                    background: 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)',
                    color: 'white',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between'
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <div style={{
                            width: '38px',
                            height: '38px',
                            borderRadius: '12px',
                            background: 'linear-gradient(135deg, #38bdf8 0%, #0284c7 100%)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: 'white',
                            boxShadow: '0 4px 12px rgba(56, 189, 248, 0.3)'
                        }}>
                            <Cloud size={20} />
                        </div>
                        <div>
                            <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: '900', letterSpacing: '-0.3px' }}>
                                깃허브 클라우드 동기화 (Git Sync)
                            </h3>
                            <p style={{ margin: 0, fontSize: '0.78rem', color: '#94a3b8', marginTop: '2px' }}>
                                데이터 백업(Push) 및 최신 버전 업데이트(Pull)
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        disabled={isPushing || isPulling}
                        style={{
                            background: 'rgba(255, 255, 255, 0.1)',
                            border: 'none',
                            borderRadius: '10px',
                            color: '#94a3b8',
                            width: '32px',
                            height: '32px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            cursor: (isPushing || isPulling) ? 'not-allowed' : 'pointer',
                            transition: 'all 0.15s'
                        }}
                    >
                        <X size={18} />
                    </button>
                </div>

                {/* Modal Body */}
                <div style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.2rem', maxHeight: '80vh', overflowY: 'auto' }}>
                    
                    {/* Status Info Card */}
                    <div style={{
                        background: '#f8fafc',
                        borderRadius: '18px',
                        border: '1.5px solid #e2e8f0',
                        padding: '1rem 1.2rem',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '8px'
                    }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.86rem', fontWeight: '800', color: '#334155' }}>
                                <GitBranch size={15} color="#0284c7" />
                                <span>현재 저장소 상태 (main)</span>
                            </div>
                            <button
                                onClick={fetchGitStatus}
                                disabled={isLoadingStatus || isPushing || isPulling}
                                title="상태 새로고침"
                                style={{
                                    background: 'none',
                                    border: 'none',
                                    color: '#64748b',
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '4px',
                                    fontSize: '0.75rem',
                                    fontWeight: '700'
                                }}
                            >
                                <RefreshCw size={12} className={isLoadingStatus ? 'animate-spin' : ''} />
                                <span>새로고침</span>
                            </button>
                        </div>

                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', alignItems: 'center', marginTop: '2px' }}>
                            <span style={{
                                background: '#e0f2fe',
                                color: '#0369a1',
                                padding: '3px 8px',
                                borderRadius: '8px',
                                fontSize: '0.74rem',
                                fontWeight: '800',
                                fontFamily: 'monospace'
                            }}>
                                #{gitStatus?.currentCommit?.hash || '...'}
                            </span>
                            <span style={{ fontSize: '0.78rem', color: '#475569', fontWeight: '700' }}>
                                {gitStatus?.currentCommit?.message || '최신 커밋 정보 불러오는 중...'}
                            </span>
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: '4px', borderTop: '1px dashed #e2e8f0', fontSize: '0.74rem' }}>
                            <span style={{ color: '#64748b', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                <Clock size={12} /> {gitStatus?.currentCommit?.date || '-'} ({gitStatus?.currentCommit?.author || '-'})
                            </span>
                            {gitStatus?.hasUncommittedChanges ? (
                                <span style={{ color: '#d97706', fontWeight: '800', background: '#fef3c7', padding: '2px 6px', borderRadius: '6px' }}>
                                    ● 저장할 변경사항 있음
                                </span>
                            ) : (
                                <span style={{ color: '#059669', fontWeight: '800', background: '#dcfce7', padding: '2px 6px', borderRadius: '6px' }}>
                                    ● 로컬 변경사항 없음
                                </span>
                            )}
                        </div>
                    </div>

                    {/* Notification message box */}
                    {statusMessage && (
                        <div style={{
                            padding: '0.85rem 1rem',
                            borderRadius: '14px',
                            fontSize: '0.84rem',
                            fontWeight: '800',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            background: statusMessage.type === 'success' ? '#ecfdf5' : statusMessage.type === 'error' ? '#fef2f2' : '#f0f9ff',
                            color: statusMessage.type === 'success' ? '#047857' : statusMessage.type === 'error' ? '#b91c1c' : '#0369a1',
                            border: `1.5px solid ${statusMessage.type === 'success' ? '#a7f3d0' : statusMessage.type === 'error' ? '#fecaca' : '#bae6fd'}`
                        }}>
                            {statusMessage.type === 'success' && <CheckCircle2 size={16} color="#059669" />}
                            {statusMessage.type === 'error' && <AlertTriangle size={16} color="#dc2626" />}
                            {statusMessage.type === 'info' && <RefreshCw size={16} className="animate-spin" color="#0284c7" />}
                            <span>{statusMessage.text}</span>
                        </div>
                    )}

                    {/* Action Card 1: Push to GitHub */}
                    <div style={{
                        background: 'linear-gradient(135deg, #ffffff 0%, #f0fdf4 100%)',
                        borderRadius: '20px',
                        border: '1.5px solid #bbf7d0',
                        padding: '1.2rem',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '10px'
                    }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <div style={{
                                    width: '32px',
                                    height: '32px',
                                    borderRadius: '10px',
                                    background: '#10b981',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    color: 'white'
                                }}>
                                    <UploadCloud size={18} />
                                </div>
                                <div>
                                    <h4 style={{ margin: 0, fontSize: '0.95rem', fontWeight: '900', color: '#065f46' }}>
                                        1. 깃허브로 백업 (Push)
                                    </h4>
                                    <p style={{ margin: 0, fontSize: '0.74rem', color: '#047857' }}>
                                        현재 수정한 퀴즈/데이터를 깃허브에 안전하게 보관합니다.
                                    </p>
                                </div>
                            </div>
                        </div>

                        <input
                            type="text"
                            placeholder="변경 내용 메모 (선택 사항, 예: 역사 퀴즈 10문항 추가)"
                            value={customMessage}
                            onChange={(e) => setCustomMessage(e.target.value)}
                            disabled={isPushing || isPulling}
                            style={{
                                width: '100%',
                                padding: '8px 12px',
                                borderRadius: '10px',
                                border: '1.5px solid #cbd5e1',
                                fontSize: '0.82rem',
                                outline: 'none',
                                boxSizing: 'border-box'
                            }}
                        />

                        <button
                            onClick={handlePush}
                            disabled={isPushing || isPulling}
                            style={{
                                padding: '10px 16px',
                                borderRadius: '12px',
                                border: 'none',
                                background: isPushing ? '#94a3b8' : 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                                color: 'white',
                                fontWeight: '900',
                                fontSize: '0.88rem',
                                cursor: isPushing ? 'wait' : 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '8px',
                                boxShadow: isPushing ? 'none' : '0 4px 12px rgba(16, 185, 129, 0.3)',
                                transition: 'all 0.15s'
                            }}
                        >
                            {isPushing ? (
                                <>
                                    <RefreshCw size={16} className="animate-spin" />
                                    <span>깃허브로 업로드 중...</span>
                                </>
                            ) : (
                                <>
                                    <UploadCloud size={16} />
                                    <span>🚀 깃허브에 저장 / 백업하기</span>
                                </>
                            )}
                        </button>
                    </div>

                    {/* Action Card 2: Pull from GitHub */}
                    <div style={{
                        background: 'linear-gradient(135deg, #ffffff 0%, #eff6ff 100%)',
                        borderRadius: '20px',
                        border: '1.5px solid #bfdbfe',
                        padding: '1.2rem',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '10px'
                    }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <div style={{
                                    width: '32px',
                                    height: '32px',
                                    borderRadius: '10px',
                                    background: '#3b82f6',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    color: 'white'
                                }}>
                                    <DownloadCloud size={18} />
                                </div>
                                <div>
                                    <h4 style={{ margin: 0, fontSize: '0.95rem', fontWeight: '900', color: '#1e40af' }}>
                                        2. 깃허브 최신 버전 받기 (Pull & Update)
                                    </h4>
                                    <p style={{ margin: 0, fontSize: '0.74rem', color: '#2563eb' }}>
                                        깃허브의 최신 기능 및 코드를 다운로드하고 즉시 반영합니다.
                                    </p>
                                </div>
                            </div>
                        </div>

                        <button
                            onClick={handlePull}
                            disabled={isPushing || isPulling}
                            style={{
                                padding: '10px 16px',
                                borderRadius: '12px',
                                border: 'none',
                                background: isPulling ? '#94a3b8' : 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
                                color: 'white',
                                fontWeight: '900',
                                fontSize: '0.88rem',
                                cursor: isPulling ? 'wait' : 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '8px',
                                boxShadow: isPulling ? 'none' : '0 4px 12px rgba(37, 99, 235, 0.3)',
                                transition: 'all 0.15s'
                            }}
                        >
                            {isPulling ? (
                                <>
                                    <RefreshCw size={16} className="animate-spin" />
                                    <span>최신 코드 다운로드 및 빌드 중...</span>
                                </>
                            ) : (
                                <>
                                    <DownloadCloud size={16} />
                                    <span>🔄 깃허브 최신 버전으로 업데이트</span>
                                </>
                            )}
                        </button>
                    </div>

                </div>

                {/* Footer */}
                <div style={{
                    padding: '0.9rem 1.5rem',
                    background: '#f8fafc',
                    borderTop: '1px solid #e2e8f0',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between'
                }}>
                    <a
                        href="https://github.com/azamazing11-star/Quizrun"
                        target="_blank"
                        rel="noreferrer"
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px',
                            fontSize: '0.76rem',
                            color: '#64748b',
                            textDecoration: 'none',
                            fontWeight: '700'
                        }}
                    >
                        <span>GitHub 저장소 바로가기</span>
                        <ExternalLink size={12} />
                    </a>
                    <button
                        onClick={onClose}
                        disabled={isPushing || isPulling}
                        style={{
                            padding: '6px 16px',
                            borderRadius: '10px',
                            border: '1px solid #cbd5e1',
                            background: 'white',
                            color: '#475569',
                            fontSize: '0.82rem',
                            fontWeight: '800',
                            cursor: (isPushing || isPulling) ? 'not-allowed' : 'pointer'
                        }}
                    >
                        닫기
                    </button>
                </div>
            </div>
        </div>
    );
}
