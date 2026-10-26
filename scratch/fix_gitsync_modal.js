const fs = require('fs');

let code = fs.readFileSync('frontend/src/components/GitSyncModal.jsx', 'utf8');
const isCRLF = code.includes('\r\n');
if (isCRLF) code = code.replace(/\r\n/g, '\n');

// 1. Add activeTab useEffect
const targetActiveTabEffect = `    // 모달 오픈 시 초기화
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
    }, [isOpen]);`;

const replaceActiveTabEffect = `    // 모달 오픈 시 초기화
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
    }, [activeTab]);`;

if (code.includes(targetActiveTabEffect)) {
    code = code.replace(targetActiveTabEffect, replaceActiveTabEffect);
    console.log('1. activeTab effect added');
} else {
    console.log('1. targetActiveTabEffect NOT found');
}

// 2. Update fetchGitStatus to auto-clear stale busy messages
const targetFetchGitStatus = `    // GitHub 상태 조회
    const fetchGitStatus = async () => {
        if (!isLocal) return;
        setIsLoadingStatus(true);
        try {
            const res = await fetch(\`\${apiBase}/api/git/status\`);
            const data = await res.json();
            if (data.success) {
                setGitStatus(data);
            }
        } catch (err) {
            console.error('Failed to fetch Git status:', err);
        } finally {
            setIsLoadingStatus(false);
        }
    };`;

const replaceFetchGitStatus = `    // GitHub 상태 조회
    const fetchGitStatus = async () => {
        if (!isLocal) return;
        setIsLoadingStatus(true);
        try {
            const res = await fetch(\`\${apiBase}/api/git/status\`);
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
    };`;

if (code.includes(targetFetchGitStatus)) {
    code = code.replace(targetFetchGitStatus, replaceFetchGitStatus);
    console.log('2. fetchGitStatus updated');
} else {
    console.log('2. targetFetchGitStatus NOT found');
}

// 3. Update statusMessage rendering with reset button and close button
const targetStatusMsg = `                            {statusMessage && (
                                <div style={{
                                    padding: '0.8rem 1rem',
                                    borderRadius: '12px',
                                    fontSize: '0.78rem',
                                    fontWeight: '800',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '8px',
                                    background: statusMessage.type === 'success' ? '#ecfdf5' : '#fef2f2',
                                    color: statusMessage.type === 'success' ? '#047857' : '#b91c1c',
                                    border: \`1px solid \${statusMessage.type === 'success' ? '#a7f3d0' : '#fecaca'}\`
                                }}>
                                    {statusMessage.type === 'success' ? <CheckCircle2 size={16} /> : <AlertTriangle size={16} />}
                                    <span>{statusMessage.text}</span>
                                </div>
                            )}`;

const replaceStatusMsg = `                            {statusMessage && (
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
                                    border: \`1px solid \${statusMessage.type === 'success' ? '#a7f3d0' : '#fecaca'}\`
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
                                                        await fetch(\`\${apiBase}/api/git/reset-lock\`, { method: 'POST' });
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
                            )}`;

if (code.includes(targetStatusMsg)) {
    code = code.replace(targetStatusMsg, replaceStatusMsg);
    console.log('3. statusMessage UI updated');
} else {
    console.log('3. targetStatusMsg NOT found');
}

// 4. Update commit display
const targetCommit = `                                            {gitStatus.currentCommit && (
                                                <div style={{ color: '#475569' }}>
                                                    <strong>최신 커밋:</strong> {gitStatus.currentCommit.hash} - {gitStatus.currentCommit.subject} ({gitStatus.currentCommit.date})
                                                </div>
                                            )}`;

const replaceCommit = `                                            {gitStatus.currentCommit && (
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
                                            )}`;

if (code.includes(targetCommit)) {
    code = code.replace(targetCommit, replaceCommit);
    console.log('4. Commit display updated');
} else {
    console.log('4. targetCommit NOT found');
}

if (isCRLF) {
    code = code.replace(/\n/g, '\r\n');
}

fs.writeFileSync('frontend/src/components/GitSyncModal.jsx', code, 'utf8');
console.log('GitSyncModal.jsx updated successfully.');
