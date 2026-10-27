import React, { useState, useEffect, useRef } from 'react';
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
    ShieldCheck,
    Globe,
    Zap,
    ChevronDown,
    ChevronUp,
    FileText,
    Database,
    AlertCircle
} from 'lucide-react';
import { 
    getSupabaseConfig, 
    saveSupabaseConfig, 
    clearSupabaseConfig, 
    DEFAULT_SUPABASE_URL, 
    DEFAULT_SUPABASE_ANON_KEY 
} from '../lib/supabase';
import { 
    fetchCloudMeta, 
    uploadCurrentDataToCloud, 
    downloadDataFromCloud, 
    getLocalUpdatedAt, 
    formatTime,
    collectAllQuizrunData,
    restoreAllQuizrunData,
    syncLocalWithBackend
} from '../services/cloudSync';

export default function GitSyncModal({ isOpen, onClose }) {
    const [activeTab, setActiveTab] = useState('repo'); // 'repo' | 'cloud' | 'json'

    // Supabase 클라우드 설정 상태
    const [config, setConfig] = useState({ url: '', anonKey: '' });
    const [isConfigOpen, setIsConfigOpen] = useState(false);
    const [connStatus, setConnStatus] = useState({ loading: false, checked: false, success: false, message: '' });
    
    // 시간 및 메타데이터 상태
    const [localTime, setLocalTime] = useState(null);
    const [cloudMeta, setCloudMeta] = useState(null);

    // 동기화 실행 진행 상태
    const [syncProgress, setSyncProgress] = useState(null);
    const [syncLoading, setSyncLoading] = useState(false);
    const [syncMessage, setSyncMessage] = useState(null);

    // GitHub 상태
    const [gitStatus, setGitStatus] = useState(null);
    const [isLoadingStatus, setIsLoadingStatus] = useState(false);
    const [isPushing, setIsPushing] = useState(false);
    const [isPulling, setIsPulling] = useState(false);
    const [customMessage, setCustomMessage] = useState('');
    const [statusMessage, setStatusMessage] = useState(null);
    const [showManualOptions, setShowManualOptions] = useState(false);
    const [isSyncingAll, setIsSyncingAll] = useState(false);

    const jsonFileInputRef = useRef(null);

    const isLocal = typeof window !== 'undefined' && (
        window.location.protocol === 'file:' || 
        window.location.hostname === 'localhost' || 
        window.location.hostname === '127.0.0.1'
    );
    const apiBase = typeof window !== 'undefined' && window.location.protocol === 'file:' ? 'http://localhost:5173' : '';

    // 모달 오픈 시 초기화
    useEffect(() => {
        if (isOpen) {
            const savedConfig = getSupabaseConfig();
            setConfig(savedConfig);
            setSyncMessage(null);
            setStatusMessage(null);
            checkStatus();
            if (isLocal) {
                fetchGitStatus();
            }
        }
    }, [isOpen]);

    // 탭 변경 시 GitHub 상태 새로고침 및 stale 에러 자동 정리
    useEffect(() => {
        if (activeTab === 'repo') {
            setStatusMessage(prev => (prev?.text?.includes('다른 동기화 작업이 진행 중') ? null : prev));
            if (isLocal) {
                fetchGitStatus();
            }
        }
    }, [activeTab]);

    // 클라우드 상태 새로고침
    const checkStatus = async () => {
        setConnStatus({ loading: true, checked: false, success: false, message: '클라우드 확인 중...' });
        const lTime = getLocalUpdatedAt();
        setLocalTime(lTime);

        const meta = await fetchCloudMeta();
        if (meta.success) {
            setConnStatus({ loading: false, checked: true, success: true, message: '클라우드 연결됨' });
            setCloudMeta(meta);
        } else {
            setConnStatus({ 
                loading: false, 
                checked: true, 
                success: false, 
                message: meta.tableMissing ? '테이블 생성 필요' : (meta.error || '연결 오류') 
            });
            setCloudMeta(null);
        }
    };

    // 설정 저장 및 연결 테스트
    const handleSaveConfig = () => {
        saveSupabaseConfig(config.url, config.anonKey);
        setSyncMessage({ type: 'success', text: 'Supabase 연결 설정이 저장되었습니다.' });
        checkStatus();
    };

    // [올리기] 클라우드로 최신화
    const handleUpload = async () => {
        if (syncLoading) return;
        const meta = await fetchCloudMeta();
        if (!meta.success) {
            alert('클라우드에 연결할 수 없습니다. Supabase 설정을 확인해주세요.');
            return;
        }

        const lTime = getLocalUpdatedAt() ? new Date(getLocalUpdatedAt()).getTime() : 0;
        const cTime = meta.updatedAt ? new Date(meta.updatedAt).getTime() : 0;

        // 클라우드가 15초 이상 최신이면 경고
        if (cTime > 0 && lTime > 0 && (cTime - lTime > 15000)) {
            const ok = window.confirm(
                `⚠️ [주의] 클라우드에 더 최신 데이터가 있습니다!\n\n` +
                `* 클라우드 최종 저장: ${formatTime(meta.updatedAt)}\n` +
                `* 현재 컴퓨터 수정: ${formatTime(getLocalUpdatedAt())}\n\n` +
                `지금 올리시면 다른 기기에서 작업한 내용이 덮어씌워질 수 있습니다.\n` +
                `그래도 강제로 덮어씌우시겠습니까?`
            );
            if (!ok) return;
        } else {
            const ok = window.confirm('현재 컴퓨터의 퀴즈런 퀴즈·게임·설정 전체를 클라우드로 올리시겠습니까?');
            if (!ok) return;
        }

        setSyncLoading(true);
        setSyncProgress('데이터 준비 중...');
        setSyncMessage(null);

        try {
            const res = await uploadCurrentDataToCloud((msg) => setSyncProgress(msg));
            setSyncMessage({
                type: 'success',
                text: `클라우드 최신화 완료! (${formatTime(res.timestamp)} 저장됨 · 총 ${res.totalChunks}개 블록 약 ${res.sizeMB}MB 안전 저장)`
            });
            checkStatus();
        } catch (err) {
            setSyncMessage({ type: 'error', text: '업로드 실패: ' + err.message });
        } finally {
            setSyncLoading(false);
            setSyncProgress(null);
        }
    };

    // [내려받기] 최신 데이터 가져오기
    const handleDownload = async () => {
        if (syncLoading) return;
        const meta = await fetchCloudMeta();
        if (!meta.success || !meta.hasData) {
            alert('클라우드에 저장된 데이터가 없습니다. 먼저 로컬 데이터를 업로드해주세요.');
            return;
        }

        const lTime = getLocalUpdatedAt() ? new Date(getLocalUpdatedAt()).getTime() : 0;
        const cTime = meta.updatedAt ? new Date(meta.updatedAt).getTime() : 0;

        if (lTime > 0 && cTime > 0 && (lTime - cTime > 15000)) {
            const ok = window.confirm(
                `⚠️ [주의] 현재 컴퓨터에 더 최신 작업 내용이 있습니다!\n\n` +
                `* 현재 컴퓨터 수정: ${formatTime(getLocalUpdatedAt())}\n` +
                `* 클라우드 데이터 일시: ${formatTime(meta.updatedAt)}\n\n` +
                `클라우드에서 가져오시면 현재 컴퓨터에서 방금 작업한 내용이 이전 데이터로 덮어씌워집니다.\n` +
                `그래도 가져오시겠습니까?`
            );
            if (!ok) return;
        } else {
            const ok = window.confirm(`클라우드의 최신 데이터(${formatTime(meta.updatedAt)})를 가져와 적용하시겠습니까?\n(완료 후 화면이 새로고침됩니다)`);
            if (!ok) return;
        }

        setSyncLoading(true);
        setSyncProgress('클라우드 데이터 가져오는 중...');

        try {
            await downloadDataFromCloud((msg) => setSyncProgress(msg));
            alert('✅ 최신 데이터를 성공적으로 가져왔습니다! 최신 상태로 새로고침합니다.');
            window.location.reload();
        } catch (err) {
            alert('데이터 가져오기 오류: ' + err.message);
            setSyncLoading(false);
            setSyncProgress(null);
        }
    };

    // GitHub 상태 조회
    const fetchGitStatus = async () => {
        if (!isLocal) return;
        setIsLoadingStatus(true);
        try {
            const res = await fetch(`${apiBase}/api/git/status`);
            const data = await res.json();
            if (data.success) {
                setGitStatus(data);
                if (!data.isBusy) {
                    setStatusMessage(prev => (prev?.text?.includes('다른 동기화 작업이 진행 중') ? null : prev));
                }
            }
        } catch (err) {
            console.error('Failed to fetch Git status:', err);
        } finally {
            setIsLoadingStatus(false);
        }
    };

    // GitHub & Render 원클릭 최신화 (Pull -> Auto-Commit & Push -> Rebuild)
    const handleOneClickSync = async () => {
        if (isSyncingAll || isPushing || isPulling) return;
        setIsSyncingAll(true);
        setStatusMessage({ type: 'info', text: 'GitHub 및 Render 배포 동기화 진행 중입니다 (내려받기 ➔ 백업 ➔ 빌드 최신화)...' });

        try {
            await syncLocalWithBackend();
            const res = await fetch(`${apiBase}/api/git/sync`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ message: customMessage || undefined })
            });
            const data = await res.json();
            if (data.success) {
                setStatusMessage({ type: 'success', text: '✅ ' + (data.message || 'GitHub 및 Render 웹사이트 동기화가 성공적으로 완료되었습니다!') });
                setCustomMessage('');
                fetchGitStatus();
                setTimeout(() => {
                    window.location.reload();
                }, 2000);
            } else {
                setStatusMessage({ type: 'error', text: data.message || '동기화 중 오류가 발생했습니다.' });
            }
        } catch (err) {
            setStatusMessage({ type: 'error', text: `동기화 실패: ${err.message} (Quizrun_Start.bat 실행 창이 켜져 있는지 확인해주세요)` });
        } finally {
            setIsSyncingAll(false);
        }
    };

    // GitHub Push (수동)
    const handlePush = async () => {
        if (isSyncingAll || isPushing || isPulling) return;
        setIsPushing(true);
        setStatusMessage({ type: 'info', text: '로컬 코드를 깃허브로 안전하게 백업(Push)하는 중입니다...' });

        try {
            await syncLocalWithBackend();
            const res = await fetch(`${apiBase}/api/git/push`, {
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

    // GitHub Pull & Build (수동)
    const handlePull = async () => {
        if (isSyncingAll || isPushing || isPulling) return;
        if (!window.confirm('깃허브에서 최신 코드를 다운로드하고 적용하시겠습니까?\n업데이트 후 페이지가 자동으로 새로고침됩니다.')) {
            return;
        }

        setIsPulling(true);
        setStatusMessage({ type: 'info', text: '깃허브 최신 코드를 다운로드하고 프론트엔드를 빌드 중입니다 (약 5~8초 소요)...' });

        try {
            const res = await fetch(`${apiBase}/api/git/pull`, {
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

    // JSON 오프라인 내보내기
    const handleExportJson = async () => {
        try {
            const fullData = await collectAllQuizrunData();
            const blob = new Blob([JSON.stringify(fullData, null, 2)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `quizrun_backup_${formatTime(new Date()).replace(/[- :]/g, '_')}.json`;
            a.click();
            URL.revokeObjectURL(url);
        } catch (e) {
            alert('오프라인 백업 파일 생성 오류: ' + e.message);
        }
    };

    // JSON 오프라인 가져오기
    const handleImportJson = (e) => {
        const file = e.target.files?.[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = async (ev) => {
            try {
                const parsed = JSON.parse(ev.target.result);
                await restoreAllQuizrunData(parsed);
                alert('데이터 복원이 완료되었습니다! 최신 상태로 새로고침합니다.');
                window.location.reload();
            } catch (err) {
                alert('백업 파일 형식이 올바르지 않습니다: ' + err.message);
            }
        };
        reader.readAsText(file);
    };

    if (!isOpen) return null;

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
                maxWidth: '620px',
                borderRadius: '24px',
                boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.35)',
                overflow: 'hidden',
                display: 'flex',
                flexDirection: 'column',
                maxHeight: '90vh'
            }}>
                {/* Modal Header */}
                <div style={{
                    padding: '1.1rem 1.5rem',
                    background: '#0f172a',
                    color: 'white',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    borderBottom: '1px solid #1e293b'
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <div style={{
                            width: '36px',
                            height: '36px',
                            borderRadius: '12px',
                            background: 'linear-gradient(135deg, #0284c7 0%, #38bdf8 100%)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: 'white',
                            boxShadow: '0 4px 12px rgba(2, 132, 199, 0.35)'
                        }}>
                            <Cloud size={20} />
                        </div>
                        <div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: '900', letterSpacing: '-0.3px' }}>
                                    퀴즈런 스마트 클라우드 실시간 동기화
                                </h3>
                                <span style={{
                                    fontSize: '0.68rem',
                                    fontWeight: '800',
                                    padding: '2px 8px',
                                    borderRadius: '12px',
                                    background: connStatus.success ? 'rgba(34, 197, 94, 0.2)' : 'rgba(239, 68, 68, 0.2)',
                                    color: connStatus.success ? '#4ade80' : '#f87171'
                                }}>
                                    {connStatus.message}
                                </span>
                            </div>
                            <p style={{ margin: 0, fontSize: '0.74rem', color: '#94a3b8', marginTop: '2px' }}>
                                내 컴퓨터 ↔ Supabase 클라우드 ↔ 웹사이트 어디서든 버튼 한 번으로 최신화
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        disabled={syncLoading || isPushing || isPulling}
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
                            cursor: 'pointer'
                        }}
                    >
                        <X size={18} />
                    </button>
                </div>

                {/* 3 Tabs Bar */}
                <div style={{
                    display: 'flex',
                    borderBottom: '1px solid #e2e8f0',
                    background: '#f8fafc',
                    padding: '0 1.4rem',
                    gap: '1.5rem',
                    fontSize: '0.82rem',
                    fontWeight: '800'
                }}>
                    <button
                        onClick={() => setActiveTab('cloud')}
                        style={{
                            padding: '0.75rem 0.2rem',
                            border: 'none',
                            background: 'none',
                            cursor: 'pointer',
                            borderBottom: activeTab === 'cloud' ? '2.5px solid #0284c7' : '2.5px solid transparent',
                            color: activeTab === 'cloud' ? '#0284c7' : '#64748b',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px',
                            fontWeight: '800'
                        }}
                    >
                        <Cloud size={16} />
                        <span>원클릭 데이터 동기화 (Supabase)</span>
                    </button>

                    <button
                        onClick={() => setActiveTab('repo')}
                        style={{
                            padding: '0.75rem 0.2rem',
                            border: 'none',
                            background: 'none',
                            cursor: 'pointer',
                            borderBottom: activeTab === 'repo' ? '2.5px solid #4f46e5' : '2.5px solid transparent',
                            color: activeTab === 'repo' ? '#4f46e5' : '#64748b',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px',
                            fontWeight: '800'
                        }}
                    >
                        <Zap size={16} />
                        <span>GitHub 코드 동기화</span>
                    </button>

                    <button
                        onClick={() => setActiveTab('json')}
                        style={{
                            padding: '0.75rem 0.2rem',
                            border: 'none',
                            background: 'none',
                            cursor: 'pointer',
                            borderBottom: activeTab === 'json' ? '2.5px solid #059669' : '2.5px solid transparent',
                            color: activeTab === 'json' ? '#059669' : '#64748b',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px',
                            fontWeight: '800'
                        }}
                    >
                        <FileText size={16} />
                        <span>오프라인 파일 백업</span>
                    </button>
                </div>

                {/* Modal Body */}
                <div style={{
                    padding: '1.2rem 1.4rem',
                    overflowY: 'auto',
                    flex: 1,
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '1rem'
                }}>
                    {/* ── 탭 1: 원클릭 데이터 동기화 ───────────────────────────── */}
                    {activeTab === 'cloud' && (
                        <>
                            {/* 알림 메시지 박스 */}
                            {syncMessage && (
                                <div style={{
                                    padding: '0.8rem 1rem',
                                    borderRadius: '12px',
                                    fontSize: '0.78rem',
                                    fontWeight: '800',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '8px',
                                    background: syncMessage.type === 'success' ? '#ecfdf5' : '#fef2f2',
                                    color: syncMessage.type === 'success' ? '#047857' : '#b91c1c',
                                    border: `1px solid ${syncMessage.type === 'success' ? '#a7f3d0' : '#fecaca'}`
                                }}>
                                    {syncMessage.type === 'success' ? <CheckCircle2 size={16} /> : <AlertTriangle size={16} />}
                                    <span>{syncMessage.text}</span>
                                </div>
                            )}

                            <div style={{ background: '#fef3c7', border: '1px solid #fde68a', borderRadius: '12px', padding: '10px 14px', fontSize: '0.75rem', color: '#92400e', lineHeight: '1.4' }}>
                                💡 <strong>안내</strong>: 이 탭은 Onrender 웹사이트 배포가 아닌 <strong>외부 Supabase DB 백업용</strong>입니다. Onrender 라이브 사이트(quizrun24.onrender.com)를 최신화하시려면 첫 번째 <strong>[GitHub & Onrender 최신화]</strong> 탭의 최신화 버튼을 이용해 주세요.
                            </div>

                            {/* 메인 스마트 액션 카드 */}
                            <div style={{
                                background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
                                color: 'white',
                                borderRadius: '18px',
                                padding: '1.2rem',
                                display: 'flex',
                                flexDirection: 'column',
                                gap: '0.9rem',
                                border: '1px solid #334155'
                            }}>
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                        <Zap size={16} color="#38bdf8" />
                                        <span style={{ fontSize: '0.88rem', fontWeight: '900' }}>원클릭 스마트 데이터 동기화</span>
                                    </div>
                                    <button
                                        onClick={checkStatus}
                                        disabled={connStatus.loading}
                                        style={{
                                            padding: '4px 10px',
                                            background: '#334155',
                                            color: '#e2e8f0',
                                            border: 'none',
                                            borderRadius: '8px',
                                            fontSize: '0.72rem',
                                            cursor: 'pointer',
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '4px'
                                        }}
                                    >
                                        <RefreshCw size={12} className={connStatus.loading ? 'animate-spin' : ''} />
                                        <span>새로고침</span>
                                    </button>
                                </div>

                                {/* 시간 비교 상태바 */}
                                <div style={{
                                    background: 'rgba(0,0,0,0.3)',
                                    border: '1px solid rgba(255,255,255,0.1)',
                                    borderRadius: '12px',
                                    padding: '10px 12px',
                                    display: 'grid',
                                    gridTemplateColumns: '1fr 1fr',
                                    gap: '10px',
                                    fontSize: '0.75rem'
                                }}>
                                    <div>
                                        <span style={{ color: '#94a3b8', fontSize: '0.7rem', fontWeight: 'bold', display: 'block' }}>
                                            💻 현재 컴퓨터 상태:
                                        </span>
                                        <span style={{ color: '#4ade80', fontFamily: 'monospace', fontWeight: 'bold' }}>
                                            {formatTime(localTime)}
                                        </span>
                                    </div>
                                    <div style={{ borderLeft: '1px solid rgba(255,255,255,0.1)', paddingLeft: '10px' }}>
                                        <span style={{ color: '#94a3b8', fontSize: '0.7rem', fontWeight: 'bold', display: 'block' }}>
                                            ☁️ 클라우드 DB 상태:
                                        </span>
                                        <span style={{ color: '#38bdf8', fontFamily: 'monospace', fontWeight: 'bold' }}>
                                            {cloudMeta?.updatedAt ? formatTime(cloudMeta.updatedAt) : '저장된 데이터 없음'}
                                        </span>
                                    </div>
                                </div>

                                {/* 2개 핵심 버튼 */}
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginTop: '2px' }}>
                                    <button
                                        onClick={handleUpload}
                                        disabled={syncLoading}
                                        style={{
                                            padding: '1rem',
                                            borderRadius: '14px',
                                            border: '1px solid #38bdf8',
                                            background: '#0284c7',
                                            color: 'white',
                                            cursor: syncLoading ? 'not-allowed' : 'pointer',
                                            textAlign: 'left',
                                            display: 'flex',
                                            flexDirection: 'column',
                                            justifyContent: 'space-between',
                                            transition: 'all 0.15s ease'
                                        }}
                                    >
                                        <div style={{ fontSize: '0.85rem', fontWeight: '900', marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                            <span>🚀</span>
                                            <span>{syncLoading ? (syncProgress || '업로드 중...') : '클라우드로 최신화 (올리기)'}</span>
                                        </div>
                                        <span style={{ fontSize: '0.72rem', color: '#e0f2fe', lineHeight: '1.3' }}>
                                            현재 컴퓨터의 모든 퀴즈·설정·점수를 클라우드로 즉시 업로드합니다.
                                        </span>
                                    </button>

                                    <button
                                        onClick={handleDownload}
                                        disabled={syncLoading}
                                        style={{
                                            padding: '1rem',
                                            borderRadius: '14px',
                                            border: '1px solid #34d399',
                                            background: '#059669',
                                            color: 'white',
                                            cursor: syncLoading ? 'not-allowed' : 'pointer',
                                            textAlign: 'left',
                                            display: 'flex',
                                            flexDirection: 'column',
                                            justifyContent: 'space-between',
                                            transition: 'all 0.15s ease'
                                        }}
                                    >
                                        <div style={{ fontSize: '0.85rem', fontWeight: '900', marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                            <span>📥</span>
                                            <span>최신 데이터 가져오기 (내려받기)</span>
                                        </div>
                                        <span style={{ fontSize: '0.72rem', color: '#d1fae5', lineHeight: '1.3' }}>
                                            다른 기기나 웹사이트에서 수정한 최신 데이터를 이 컴퓨터로 불러옵니다.
                                        </span>
                                    </button>
                                </div>
                            </div>

                            {/* Supabase 설정 아코디언 */}
                            <div style={{ border: '1px solid #e2e8f0', borderRadius: '14px', overflow: 'hidden', background: '#f8fafc' }}>
                                <div
                                    onClick={() => setIsConfigOpen(!isConfigOpen)}
                                    style={{
                                        padding: '10px 14px',
                                        fontWeight: '800',
                                        fontSize: '0.78rem',
                                        cursor: 'pointer',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'space-between'
                                    }}
                                >
                                    <span>🔑 Supabase 클라우드 DB 연결 설정 ({config.anonKey ? '🟢 연동됨' : '🟡 미설정'})</span>
                                    {isConfigOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                                </div>

                                {isConfigOpen && (
                                    <div style={{ padding: '12px 14px', borderTop: '1px solid #e2e8f0', background: 'white' }}>
                                        <div style={{ marginBottom: '8px' }}>
                                            <label style={{ fontSize: '0.72rem', fontWeight: 'bold', color: '#475569', display: 'block', marginBottom: '3px' }}>
                                                Supabase Project URL:
                                            </label>
                                            <input
                                                type="text"
                                                value={config.url}
                                                onChange={(e) => setConfig({ ...config, url: e.target.value })}
                                                placeholder={DEFAULT_SUPABASE_URL}
                                                style={{ width: '100%', boxSizing: 'border-box', padding: '7px 10px', fontSize: '0.75rem', border: '1px solid #cbd5e1', borderRadius: '8px', fontFamily: 'monospace' }}
                                            />
                                        </div>

                                        <div style={{ marginBottom: '10px' }}>
                                            <label style={{ fontSize: '0.72rem', fontWeight: 'bold', color: '#475569', display: 'block', marginBottom: '3px' }}>
                                                Supabase Anon Public API Key:
                                            </label>
                                            <input
                                                type="password"
                                                value={config.anonKey}
                                                onChange={(e) => setConfig({ ...config, anonKey: e.target.value })}
                                                placeholder="sb_publishable_..."
                                                style={{ width: '100%', boxSizing: 'border-box', padding: '7px 10px', fontSize: '0.75rem', border: '1px solid #cbd5e1', borderRadius: '8px', fontFamily: 'monospace' }}
                                            />
                                        </div>

                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                            <button
                                                onClick={() => {
                                                    clearSupabaseConfig();
                                                    setConfig({ url: DEFAULT_SUPABASE_URL, anonKey: DEFAULT_SUPABASE_ANON_KEY });
                                                    checkStatus();
                                                }}
                                                style={{ background: 'none', border: 'none', color: '#94a3b8', fontSize: '0.72rem', cursor: 'pointer', textDecoration: 'underline' }}
                                            >
                                                기본 설정으로 복원
                                            </button>
                                            <button
                                                onClick={handleSaveConfig}
                                                style={{ padding: '6px 14px', background: '#0284c7', color: 'white', border: 'none', borderRadius: '8px', fontWeight: 'bold', fontSize: '0.75rem', cursor: 'pointer' }}
                                            >
                                                저장 및 연결 테스트
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </>
                    )}

                    {/* ── 탭 2: GitHub 코드 동기화 ───────────────────────────── */}
                    {activeTab === 'repo' && (
                        <>
                            {statusMessage && (
                                <div style={{
                                    padding: '0.8rem 1rem',
                                    borderRadius: '12px',
                                    fontSize: '0.78rem',
                                    fontWeight: '800',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'space-between',
                                    gap: '8px',
                                    background: statusMessage.type === 'success' ? '#ecfdf5' : '#fef2f2',
                                    color: statusMessage.type === 'success' ? '#047857' : '#b91c1c',
                                    border: `1px solid ${statusMessage.type === 'success' ? '#a7f3d0' : '#fecaca'}`
                                }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0 }}>
                                        {statusMessage.type === 'success' ? <CheckCircle2 size={16} /> : <AlertTriangle size={16} />}
                                        <span>{statusMessage.text}</span>
                                    </div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0 }}>
                                        {statusMessage.text?.includes('다른 동기화 작업이 진행 중') && (
                                            <button
                                                type="button"
                                                onClick={async () => {
                                                    try {
                                                        await fetch(`${apiBase}/api/git/reset-lock`, { method: 'POST' });
                                                        setStatusMessage(null);
                                                        fetchGitStatus();
                                                    } catch (e) {}
                                                }}
                                                style={{
                                                    padding: '3px 8px',
                                                    borderRadius: '6px',
                                                    border: '1px solid #ef4444',
                                                    background: 'white',
                                                    color: '#b91c1c',
                                                    fontSize: '0.72rem',
                                                    fontWeight: '800',
                                                    cursor: 'pointer'
                                                }}
                                            >
                                                동기화 락 초기화
                                            </button>
                                        )}
                                        <button
                                            type="button"
                                            onClick={() => setStatusMessage(null)}
                                            style={{
                                                background: 'none',
                                                border: 'none',
                                                cursor: 'pointer',
                                                color: statusMessage.type === 'success' ? '#047857' : '#b91c1c',
                                                fontSize: '1rem',
                                                fontWeight: 'bold',
                                                padding: '0 4px'
                                            }}
                                            title="닫기"
                                        >
                                            ✕
                                        </button>
                                    </div>
                                </div>
                            )}

                            {isLocal ? (
                                <>
                                    {/* 화면 원클릭 최신화 카드 */}
                                    <div style={{
                                        background: 'linear-gradient(135deg, #1e1b4b 0%, #0f172a 100%)',
                                        color: 'white',
                                        borderRadius: '18px',
                                        padding: '1.2rem',
                                        display: 'flex',
                                        flexDirection: 'column',
                                        gap: '0.9rem',
                                        border: '1px solid #4338ca'
                                    }}>
                                        <div>
                                            <h4 style={{ margin: 0, fontSize: '0.92rem', fontWeight: '900', color: '#fbbf24', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                                <Zap size={16} />
                                                <span>화면에서 바로 GitHub & Render 동기화</span>
                                            </h4>
                                            <p style={{ margin: '3px 0 0', fontSize: '0.75rem', color: '#c7d2fe' }}>
                                                내 컴퓨터(로컬)와 GitHub의 코드를 비교·병합하여 양쪽 최신 코드로 업데이트(Pull & Merge)하고 웹 배포(Push) 및 빌드까지 자동 완료합니다.
                                            </p>
                                        </div>

                                        <button
                                            onClick={handleOneClickSync}
                                            disabled={isSyncingAll || isPulling || isPushing}
                                            style={{
                                                padding: '14px',
                                                background: '#4f46e5',
                                                color: 'white',
                                                border: 'none',
                                                borderRadius: '12px',
                                                fontWeight: '900',
                                                fontSize: '0.85rem',
                                                cursor: (isSyncingAll || isPulling || isPushing) ? 'not-allowed' : 'pointer',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                gap: '8px',
                                                boxShadow: '0 4px 12px rgba(79, 70, 229, 0.4)'
                                            }}
                                        >
                                            {isSyncingAll ? (
                                                <>
                                                    <RefreshCw size={16} className="animate-spin" />
                                                    <span>GitHub 및 Render 동기화 진행 중...</span>
                                                </>
                                            ) : (
                                                <>
                                                    <Zap size={16} color="#fbbf24" />
                                                    <span>⚡ GitHub & Render 원클릭 최신화 실행하기</span>
                                                </>
                                            )}
                                        </button>
                                        <p style={{ margin: 0, fontSize: '0.72rem', color: '#94a3b8', textAlign: 'center' }}>
                                            * 프로그램 백엔드를 실행하는 Quizrun_Start.bat 창이 열려 있어야 합니다.
                                        </p>
                                    </div>

                                    {/* Git 상태 정보 카드 */}
                                    {gitStatus && (
                                        <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '16px', padding: '0.9rem 1.1rem', display: 'flex', flexDirection: 'column', gap: '0.4rem', fontSize: '0.75rem' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                                <span style={{ fontWeight: '800', color: '#0f172a', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                                    <GitBranch size={14} color="#6366f1" />
                                                    <span>GitHub 커밋 상태</span>
                                                </span>
                                                <button
                                                    onClick={fetchGitStatus}
                                                    disabled={isLoadingStatus}
                                                    style={{ background: 'none', border: 'none', color: '#6366f1', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.72rem', fontWeight: '700' }}
                                                >
                                                    <RefreshCw size={12} className={isLoadingStatus ? "animate-spin" : ""} />
                                                    <span>새로고침</span>
                                                </button>
                                            </div>
                                            {gitStatus.currentCommit && (
                                                <div style={{ color: '#475569', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '4px' }}>
                                                    <div>
                                                        <strong>최신 커밋:</strong> {gitStatus.currentCommit.hash} - {gitStatus.currentCommit.message || gitStatus.currentCommit.subject || ''} ({gitStatus.currentCommit.date})
                                                    </div>
                                                    {gitStatus.comparison === 'UP_TO_DATE' && (
                                                        <span style={{ fontSize: '0.72rem', fontWeight: '800', color: '#059669', background: '#ecfdf5', padding: '2px 8px', borderRadius: '6px', border: '1px solid #a7f3d0' }}>
                                                            ✓ GitHub와 최신 일치
                                                        </span>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    )}

                                    {/* 수동 / 개별 동기화 접기/펼치기 */}
                                    <div style={{ border: '1px solid #e2e8f0', borderRadius: '14px', overflow: 'hidden' }}>
                                        <button
                                            onClick={() => setShowManualOptions(!showManualOptions)}
                                            style={{
                                                width: '100%',
                                                padding: '10px 14px',
                                                background: '#f8fafc',
                                                border: 'none',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'space-between',
                                                cursor: 'pointer',
                                                fontSize: '0.78rem',
                                                fontWeight: '800',
                                                color: '#475569'
                                            }}
                                        >
                                            <span>고급: 개별 수동 동기화 (Pull / Push 개별 실행)</span>
                                            {showManualOptions ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                                        </button>
                                        {showManualOptions && (
                                            <div style={{ padding: '12px', display: 'flex', flexDirection: 'column', gap: '10px', background: 'white' }}>
                                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                                                    <button
                                                        onClick={handlePull}
                                                        disabled={isPulling || isPushing || isSyncingAll}
                                                        style={{
                                                            padding: '10px',
                                                            background: '#0284c7',
                                                            color: 'white',
                                                            border: 'none',
                                                            borderRadius: '10px',
                                                            fontWeight: '800',
                                                            fontSize: '0.78rem',
                                                            cursor: (isPulling || isPushing || isSyncingAll) ? 'not-allowed' : 'pointer',
                                                            display: 'flex',
                                                            alignItems: 'center',
                                                            justifyContent: 'center',
                                                            gap: '6px'
                                                        }}
                                                    >
                                                        <ArrowDownCircle size={14} />
                                                        <span>{isPulling ? '업데이트 중...' : '코드만 내려받기 (Pull)'}</span>
                                                    </button>
                                                    <button
                                                        onClick={handlePush}
                                                        disabled={isPulling || isPushing || isSyncingAll}
                                                        style={{
                                                            padding: '10px',
                                                            background: '#059669',
                                                            color: 'white',
                                                            border: 'none',
                                                            borderRadius: '10px',
                                                            fontWeight: '800',
                                                            fontSize: '0.78rem',
                                                            cursor: (isPulling || isPushing || isSyncingAll) ? 'not-allowed' : 'pointer',
                                                            display: 'flex',
                                                            alignItems: 'center',
                                                            justifyContent: 'center',
                                                            gap: '6px'
                                                        }}
                                                    >
                                                        <ArrowUpCircle size={14} />
                                                        <span>{isPushing ? '올리는 중...' : '코드만 백업하기 (Push)'}</span>
                                                    </button>
                                                </div>
                                            </div>
                                        )}
                                    </div>

                                    {/* 보조 실행 파일 카드 */}
                                    <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '16px', padding: '1rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                        <div style={{ fontSize: '0.82rem', fontWeight: '800', color: '#0f172a', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                            <FileCode2 size={16} color="#475569" />
                                            <span>보조 실행 파일: [원클릭_GitHub_동기화.bat]</span>
                                        </div>
                                        <p style={{ margin: 0, fontSize: '0.75rem', color: '#475569', lineHeight: '1.4' }}>
                                            브라우저가 열려있지 않은 상태에서도 <code>C:\Antigravity\Quizrun\원클릭_GitHub_동기화.bat</code>을 더블클릭하시면 언제든 동일하게 원클릭 최신화가 실행됩니다.
                                        </p>
                                    </div>
                                </>
                            ) : (
                                /* Render 배포 안내 카드 */
                                <div style={{
                                    background: 'linear-gradient(135deg, #1e1b4b 0%, #0f172a 100%)',
                                    color: 'white',
                                    borderRadius: '18px',
                                    padding: '1.2rem',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    gap: '0.9rem',
                                    border: '1px solid #4338ca'
                                }}>
                                    <div>
                                        <h4 style={{ margin: 0, fontSize: '0.92rem', fontWeight: '900', color: '#38bdf8', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                            <Globe size={16} />
                                            <span>Render 배포 웹사이트 안내</span>
                                        </h4>
                                        <p style={{ margin: '6px 0 0', fontSize: '0.78rem', color: '#e0e7ff', lineHeight: '1.5' }}>
                                            현재 접속하신 주소는 웹에 배포된 <strong>Render 라이브 사이트</strong>입니다.<br />
                                            프로그램 코드 최신화는 컴퓨터의 <strong>Quizrun_Start.bat</strong> 또는 <strong>원클릭_GitHub_동기화.bat</strong>을 실행하시면 약 1분 뒤 이곳 웹사이트에 자동으로 최신 코드가 반영됩니다.
                                        </p>
                                    </div>
                                    <div style={{ background: 'rgba(255,255,255,0.08)', borderRadius: '12px', padding: '10px 14px', fontSize: '0.75rem', color: '#cbd5e1', lineHeight: '1.5' }}>
                                        💡 <strong>퀴즈 데이터 최신화:</strong><br />
                                        첫 번째 탭 <strong>[원클릭 데이터 동기화]</strong>에서 <strong>[📥 최신 데이터 가져오기]</strong> 버튼을 누르시면 컴퓨터에서 올린 퀴즈가 이 웹사이트로 즉시 불러와집니다!
                                    </div>
                                </div>
                            )}
                        </>
                    )}

                    {/* ── 탭 3: 오프라인 파일 백업 ───────────────────────────── */}
                    {activeTab === 'json' && (
                        <>
                            <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '14px', padding: '12px', fontSize: '0.75rem', color: '#475569', lineHeight: '1.4' }}>
                                🛡️ <strong>비상용 오프라인 파일 백업:</strong> 인터넷이 연결되지 않은 환경이나 보관용으로 퀴즈런의 모든 퀴즈·설정·점수 데이터를 단일 JSON 파일로 컴퓨터나 USB에 안전하게 저장합니다.
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                                <button
                                    onClick={handleExportJson}
                                    style={{
                                        padding: '14px',
                                        background: '#f0f9ff',
                                        border: '1px solid #bae6fd',
                                        color: '#0369a1',
                                        borderRadius: '12px',
                                        fontWeight: '800',
                                        fontSize: '0.8rem',
                                        cursor: 'pointer',
                                        display: 'flex',
                                        flexDirection: 'column',
                                        alignItems: 'center',
                                        gap: '6px'
                                    }}
                                >
                                    <span style={{ fontSize: '1.3rem' }}>💾</span>
                                    <span>JSON 파일 백업 다운로드</span>
                                </button>

                                <button
                                    onClick={() => jsonFileInputRef.current?.click()}
                                    style={{
                                        padding: '14px',
                                        background: '#ecfdf5',
                                        border: '1px solid #a7f3d0',
                                        color: '#047857',
                                        borderRadius: '12px',
                                        fontWeight: '800',
                                        fontSize: '0.8rem',
                                        cursor: 'pointer',
                                        display: 'flex',
                                        flexDirection: 'column',
                                        alignItems: 'center',
                                        gap: '6px'
                                    }}
                                >
                                    <span style={{ fontSize: '1.3rem' }}>📂</span>
                                    <span>JSON 백업 파일 복원하기</span>
                                </button>
                                <input
                                    type="file"
                                    ref={jsonFileInputRef}
                                    onChange={handleImportJson}
                                    accept=".json"
                                    style={{ display: 'none' }}
                                />
                            </div>
                        </>
                    )}
                </div>

                {/* Modal Footer */}
                <div style={{
                    padding: '0.9rem 1.4rem',
                    background: '#f8fafc',
                    borderTop: '1px solid #e2e8f0',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    fontSize: '0.72rem',
                    color: '#64748b'
                }}>
                    <span>퀴즈런 (Quizrun) v2.0 스마트 동기화 시스템</span>
                    <button
                        onClick={onClose}
                        style={{
                            padding: '6px 14px',
                            background: '#0f172a',
                            color: 'white',
                            border: 'none',
                            borderRadius: '8px',
                            fontWeight: '800',
                            fontSize: '0.75rem',
                            cursor: 'pointer'
                        }}
                    >
                        닫기
                    </button>
                </div>
            </div>
        </div>
    );
}
