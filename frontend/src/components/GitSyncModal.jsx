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
    ArrowDownCircle,
    ArrowUpCircle,
    HelpCircle,
    FileCode2,
    ShieldCheck
} from 'lucide-react';

export default function GitSyncModal({ isOpen, onClose }) {
    const [gitStatus, setGitStatus] = useState(null);
    const [isLoadingStatus, setIsLoadingStatus] = useState(false);
    const [isPushing, setIsPushing] = useState(false);
    const [isPulling, setIsPulling] = useState(false);
    const [customMessage, setCustomMessage] = useState('');
    const [statusMessage, setStatusMessage] = useState(null); // { type: 'success' | 'error' | 'info', text: '' }
    const [showManualOptions, setShowManualOptions] = useState(false);

    const fetchGitStatus = async () => {
        setIsLoadingStatus(true);
        setStatusMessage(null);
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
            setShowManualOptions(false);
            fetchGitStatus();
        }
    }, [isOpen]);

    const handlePush = async () => {
        if (isPushing || isPulling) return;
        setIsPushing(true);
        setStatusMessage({ type: 'info', text: '로컬 데이터를 깃허브로 안전하게 백업(Push)하는 중입니다...' });

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
        setStatusMessage({ type: 'info', text: '깃허브 최신 코드를 다운로드하고 프론트엔드를 빌드 중입니다 (약 5~8초 소요)...' });

        try {
            const res = await fetch('/api/git/pull', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' }
            });
            const data = await res.json();

            if (data.success) {
                setStatusMessage({ type: 'success', text: '✅ 업데이트가 완료되었습니다! 잠시 후 화면을 새로고침합니다.' });
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

    const comparison = gitStatus?.comparison || 'UP_TO_DATE';
    const behindCount = gitStatus?.behindCount || 0;
    const aheadCount = gitStatus?.aheadCount || 0;
    const hasUncommittedChanges = gitStatus?.hasUncommittedChanges;
    const changedFilesCount = gitStatus?.changedFilesCount || 0;

    return (
        <div style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(15, 23, 42, 0.7)',
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
                maxWidth: '560px',
                borderRadius: '28px',
                boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.3), 0 0 0 1px rgba(226, 232, 240, 0.9)',
                overflow: 'hidden',
                display: 'flex',
                flexDirection: 'column',
                animation: 'popIn 0.3s cubic-bezier(0.16, 1, 0.3, 1)'
            }}>
                {/* Modal Header */}
                <div style={{
                    padding: '1.2rem 1.6rem',
                    background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
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
                            boxShadow: '0 4px 12px rgba(56, 189, 248, 0.35)'
                        }}>
                            <Cloud size={20} />
                        </div>
                        <div>
                            <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: '900', letterSpacing: '-0.3px' }}>
                                깃허브 코드 비교 & 동기화
                            </h3>
                            <p style={{ margin: 0, fontSize: '0.78rem', color: '#94a3b8', marginTop: '2px' }}>
                                로컬 컴퓨터와 깃허브 원격 저장소를 실시간으로 비교합니다
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
                <div style={{ padding: '1.4rem 1.6rem', display: 'flex', flexDirection: 'column', gap: '1.1rem', maxHeight: '80vh', overflowY: 'auto' }}>
                    
                    {/* Status Alert Box */}
                    {statusMessage && (
                        <div style={{
                            padding: '0.9rem 1.1rem',
                            borderRadius: '16px',
                            fontSize: '0.86rem',
                            fontWeight: '800',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '10px',
                            background: statusMessage.type === 'success' ? '#ecfdf5' : statusMessage.type === 'error' ? '#fef2f2' : '#f0f9ff',
                            color: statusMessage.type === 'success' ? '#047857' : statusMessage.type === 'error' ? '#b91c1c' : '#0369a1',
                            border: `1.5px solid ${statusMessage.type === 'success' ? '#a7f3d0' : statusMessage.type === 'error' ? '#fecaca' : '#bae6fd'}`,
                            boxShadow: '0 2px 8px rgba(0,0,0,0.04)'
                        }}>
                            {statusMessage.type === 'success' && <CheckCircle2 size={18} color="#059669" />}
                            {statusMessage.type === 'error' && <AlertTriangle size={18} color="#dc2626" />}
                            {statusMessage.type === 'info' && <RefreshCw size={18} className="animate-spin" color="#0284c7" />}
                            <span style={{ lineHeight: '1.4' }}>{statusMessage.text}</span>
                        </div>
                    )}

                    {/* Loading State Skeleton */}
                    {isLoadingStatus ? (
                        <div style={{
                            padding: '2.5rem 1.5rem',
                            borderRadius: '20px',
                            background: '#f8fafc',
                            border: '1.5px dashed #cbd5e1',
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '12px'
                        }}>
                            <RefreshCw size={32} className="animate-spin" color="#0284c7" />
                            <div style={{ fontSize: '0.92rem', fontWeight: '800', color: '#334155' }}>
                                로컬 컴퓨터와 깃허브 코드를 실시간 비교 중입니다...
                            </div>
                            <div style={{ fontSize: '0.78rem', color: '#64748b' }}>
                                원격 저장소(`origin/main`)의 최신 커밋 내역을 확인하고 있습니다.
                            </div>
                        </div>
                    ) : (
                        <>
                            {/* ============================================================ */}
                            {/* CASE 1: NEED_PULL (GitHub has newer code)                    */}
                            {/* ============================================================ */}
                            {comparison === 'NEED_PULL' && (
                                <div style={{
                                    background: 'linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%)',
                                    borderRadius: '22px',
                                    border: '2px solid #38bdf8',
                                    padding: '1.4rem',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    gap: '14px',
                                    boxShadow: '0 10px 25px rgba(2, 132, 199, 0.12)'
                                }}>
                                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
                                        <div style={{
                                            width: '42px',
                                            height: '42px',
                                            borderRadius: '14px',
                                            background: 'linear-gradient(135deg, #0284c7 0%, #0369a1 100%)',
                                            color: 'white',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            flexShrink: 0,
                                            boxShadow: '0 4px 12px rgba(2, 132, 199, 0.3)'
                                        }}>
                                            <ArrowDownCircle size={24} />
                                        </div>
                                        <div style={{ flex: 1 }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                                <span style={{ fontSize: '1.05rem', fontWeight: '900', color: '#0369a1' }}>
                                                    🌟 깃허브에 최신 업데이트가 있습니다!
                                                </span>
                                                <span style={{ background: '#0284c7', color: 'white', fontSize: '0.7rem', fontWeight: '900', padding: '2px 7px', borderRadius: '10px' }}>
                                                    +{behindCount}개 새 커밋
                                                </span>
                                            </div>
                                            <p style={{ margin: '4px 0 0', fontSize: '0.86rem', color: '#334155', fontWeight: '700', lineHeight: '1.4' }}>
                                                로컬 컴퓨터의 퀴즈런을 깃허브 최신 버전으로 업데이트하시겠습니까?
                                            </p>
                                        </div>
                                    </div>

                                    {gitStatus?.remoteLatestCommit && (
                                        <div style={{
                                            background: 'rgba(255, 255, 255, 0.8)',
                                            borderRadius: '14px',
                                            padding: '10px 14px',
                                            fontSize: '0.8rem',
                                            border: '1px solid #bae6fd',
                                            display: 'flex',
                                            flexDirection: 'column',
                                            gap: '3px'
                                        }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: '800', color: '#0369a1' }}>
                                                <span>최신 버전:</span>
                                                <span style={{ fontFamily: 'monospace', background: '#e0f2fe', padding: '1px 6px', borderRadius: '6px' }}>
                                                    #{gitStatus.remoteLatestCommit.hash}
                                                </span>
                                                <span style={{ color: '#64748b', fontSize: '0.74rem' }}>
                                                    ({gitStatus.remoteLatestCommit.date})
                                                </span>
                                            </div>
                                            <div style={{ color: '#475569', fontWeight: '600' }}>
                                                {gitStatus.remoteLatestCommit.message}
                                            </div>
                                        </div>
                                    )}

                                    <button
                                        onClick={handlePull}
                                        disabled={isPushing || isPulling}
                                        style={{
                                            width: '100%',
                                            padding: '12px 18px',
                                            borderRadius: '14px',
                                            border: 'none',
                                            background: isPulling ? '#94a3b8' : 'linear-gradient(135deg, #0284c7 0%, #2563eb 100%)',
                                            color: 'white',
                                            fontWeight: '900',
                                            fontSize: '0.96rem',
                                            cursor: isPulling ? 'wait' : 'pointer',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            gap: '8px',
                                            boxShadow: isPulling ? 'none' : '0 6px 18px rgba(37, 99, 235, 0.35)',
                                            transition: 'all 0.15s'
                                        }}
                                    >
                                        {isPulling ? (
                                            <>
                                                <RefreshCw size={18} className="animate-spin" />
                                                <span>최신 코드 다운로드 및 빌드 중...</span>
                                            </>
                                        ) : (
                                            <>
                                                <DownloadCloud size={18} />
                                                <span>🔄 지금 최신 버전으로 업데이트하기 (Pull)</span>
                                            </>
                                        )}
                                    </button>
                                </div>
                            )}

                            {/* ============================================================ */}
                            {/* CASE 2: NEED_PUSH (Local has unpushed changes/quizzes)       */}
                            {/* ============================================================ */}
                            {comparison === 'NEED_PUSH' && (
                                <div style={{
                                    background: 'linear-gradient(135deg, #f0fdf4 0%, #ecfdf5 100%)',
                                    borderRadius: '22px',
                                    border: '2px solid #34d399',
                                    padding: '1.4rem',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    gap: '14px',
                                    boxShadow: '0 10px 25px rgba(16, 185, 129, 0.12)'
                                }}>
                                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
                                        <div style={{
                                            width: '42px',
                                            height: '42px',
                                            borderRadius: '14px',
                                            background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                                            color: 'white',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            flexShrink: 0,
                                            boxShadow: '0 4px 12px rgba(16, 185, 129, 0.3)'
                                        }}>
                                            <ArrowUpCircle size={24} />
                                        </div>
                                        <div style={{ flex: 1 }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                                <span style={{ fontSize: '1.05rem', fontWeight: '900', color: '#065f46' }}>
                                                    🚀 로컬에 새로 수정한 내용이 있습니다!
                                                </span>
                                                <span style={{ background: '#059669', color: 'white', fontSize: '0.7rem', fontWeight: '900', padding: '2px 7px', borderRadius: '10px' }}>
                                                    {changedFilesCount > 0 ? `${changedFilesCount}개 파일 수정` : `${aheadCount}개 커밋 앞섬`}
                                                </span>
                                            </div>
                                            <p style={{ margin: '4px 0 0', fontSize: '0.86rem', color: '#334155', fontWeight: '700', lineHeight: '1.4' }}>
                                                로컬에서 변경된 퀴즈나 설정을 깃허브 클라우드로 안전하게 백업하시겠습니까?
                                            </p>
                                        </div>
                                    </div>

                                    <input
                                        type="text"
                                        placeholder="백업 메모 (선택 사항, 예: 상식 퀴즈 10문항 추가)"
                                        value={customMessage}
                                        onChange={(e) => setCustomMessage(e.target.value)}
                                        disabled={isPushing || isPulling}
                                        style={{
                                            width: '100%',
                                            padding: '9px 12px',
                                            borderRadius: '12px',
                                            border: '1.5px solid #a7f3d0',
                                            fontSize: '0.84rem',
                                            outline: 'none',
                                            boxSizing: 'border-box',
                                            background: 'white'
                                        }}
                                    />

                                    <button
                                        onClick={handlePush}
                                        disabled={isPushing || isPulling}
                                        style={{
                                            width: '100%',
                                            padding: '12px 18px',
                                            borderRadius: '14px',
                                            border: 'none',
                                            background: isPushing ? '#94a3b8' : 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                                            color: 'white',
                                            fontWeight: '900',
                                            fontSize: '0.96rem',
                                            cursor: isPushing ? 'wait' : 'pointer',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            gap: '8px',
                                            boxShadow: isPushing ? 'none' : '0 6px 18px rgba(16, 185, 129, 0.35)',
                                            transition: 'all 0.15s'
                                        }}
                                    >
                                        {isPushing ? (
                                            <>
                                                <RefreshCw size={18} className="animate-spin" />
                                                <span>깃허브로 백업 업로드 중...</span>
                                            </>
                                        ) : (
                                            <>
                                                <UploadCloud size={18} />
                                                <span>🚀 지금 깃허브에 백업 / 저장하기 (Push)</span>
                                            </>
                                        )}
                                    </button>
                                </div>
                            )}

                            {/* ============================================================ */}
                            {/* CASE 3: UP_TO_DATE (Both are in sync)                       */}
                            {/* ============================================================ */}
                            {comparison === 'UP_TO_DATE' && (
                                <div style={{
                                    background: 'linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)',
                                    borderRadius: '22px',
                                    border: '1.5px solid #cbd5e1',
                                    padding: '1.4rem',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    gap: '12px',
                                    textAlign: 'center',
                                    alignItems: 'center'
                                }}>
                                    <div style={{
                                        width: '46px',
                                        height: '46px',
                                        borderRadius: '50%',
                                        background: '#dcfce7',
                                        color: '#059669',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center'
                                    }}>
                                        <ShieldCheck size={26} />
                                    </div>
                                    <div>
                                        <h4 style={{ margin: 0, fontSize: '1.05rem', fontWeight: '900', color: '#1e293b' }}>
                                            🎉 로컬 컴퓨터와 깃허브가 완벽하게 일치합니다!
                                        </h4>
                                        <p style={{ margin: '5px 0 0', fontSize: '0.82rem', color: '#64748b', fontWeight: '600' }}>
                                            현재 최신 버전(#{gitStatus?.currentCommit?.hash})을 사용 중이며, 업데이트할 변경 사항이 없습니다.
                                        </p>
                                    </div>
                                </div>
                            )}

                            {/* ============================================================ */}
                            {/* CASE 4: DIVERGED (Both have different changes)              */}
                            {/* ============================================================ */}
                            {comparison === 'DIVERGED' && (
                                <div style={{
                                    background: 'linear-gradient(135deg, #fffbeb 0%, #fef3c7 100%)',
                                    borderRadius: '22px',
                                    border: '2px solid #f59e0b',
                                    padding: '1.4rem',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    gap: '12px'
                                }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                        <AlertTriangle size={24} color="#d97706" />
                                        <div>
                                            <span style={{ fontSize: '0.98rem', fontWeight: '900', color: '#92400e' }}>
                                                로컬 변경사항과 깃허브 업데이트가 모두 존재합니다
                                            </span>
                                            <p style={{ margin: 0, fontSize: '0.78rem', color: '#b45309', fontWeight: '600' }}>
                                                로컬 데이터를 깃허브에 백업(Push)하거나 최신 코드를 다운로드(Pull)하세요.
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Current Commit Details Box */}
                            <div style={{
                                background: '#f8fafc',
                                borderRadius: '16px',
                                border: '1px solid #e2e8f0',
                                padding: '10px 14px',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                fontSize: '0.76rem'
                            }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#475569' }}>
                                    <GitBranch size={14} color="#64748b" />
                                    <span>현재 커밋:</span>
                                    <span style={{ fontFamily: 'monospace', fontWeight: '800', background: '#e2e8f0', padding: '1px 5px', borderRadius: '5px' }}>
                                        #{gitStatus?.currentCommit?.hash || '...'}
                                    </span>
                                    <span style={{ color: '#64748b' }}>
                                        {gitStatus?.currentCommit?.message?.slice(0, 28)}...
                                    </span>
                                </div>
                                <button
                                    onClick={fetchGitStatus}
                                    disabled={isLoadingStatus || isPushing || isPulling}
                                    style={{
                                        background: 'white',
                                        border: '1px solid #cbd5e1',
                                        borderRadius: '8px',
                                        padding: '3px 8px',
                                        fontSize: '0.72rem',
                                        fontWeight: '700',
                                        color: '#334155',
                                        cursor: 'pointer',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '3px'
                                    }}
                                >
                                    <RefreshCw size={11} className={isLoadingStatus ? 'animate-spin' : ''} />
                                    <span>다시 비교</span>
                                </button>
                            </div>

                            {/* Manual Advanced Actions Toggle (For power users) */}
                            <div>
                                <button
                                    onClick={() => setShowManualOptions(!showManualOptions)}
                                    style={{
                                        background: 'none',
                                        border: 'none',
                                        color: '#64748b',
                                        fontSize: '0.76rem',
                                        fontWeight: '700',
                                        cursor: 'pointer',
                                        padding: '4px 0',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '4px'
                                    }}
                                >
                                    <span>⚙️ 수동 백업 / 업데이트 메뉴 {showManualOptions ? '접기 ▲' : '펼치기 ▼'}</span>
                                </button>

                                {showManualOptions && (
                                    <div style={{
                                        display: 'grid',
                                        gridTemplateColumns: '1fr 1fr',
                                        gap: '8px',
                                        marginTop: '8px',
                                        animation: 'fadeIn 0.2s ease-out'
                                    }}>
                                        <button
                                            onClick={handlePush}
                                            disabled={isPushing || isPulling}
                                            style={{
                                                padding: '9px 12px',
                                                borderRadius: '12px',
                                                border: '1px solid #86efac',
                                                background: '#f0fdf4',
                                                color: '#16a34a',
                                                fontWeight: '800',
                                                fontSize: '0.82rem',
                                                cursor: 'pointer',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                gap: '5px'
                                            }}
                                        >
                                            <UploadCloud size={14} />
                                            <span>강제 백업 (Push)</span>
                                        </button>
                                        <button
                                            onClick={handlePull}
                                            disabled={isPushing || isPulling}
                                            style={{
                                                padding: '9px 12px',
                                                borderRadius: '12px',
                                                border: '1px solid #93c5fd',
                                                background: '#eff6ff',
                                                color: '#2563eb',
                                                fontWeight: '800',
                                                fontSize: '0.82rem',
                                                cursor: 'pointer',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                gap: '5px'
                                            }}
                                        >
                                            <DownloadCloud size={14} />
                                            <span>강제 다운로드 (Pull)</span>
                                        </button>
                                    </div>
                                )}
                            </div>
                        </>
                    )}

                </div>

                {/* Footer */}
                <div style={{
                    padding: '0.9rem 1.6rem',
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
