import React from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { PlayCircle, MonitorPlay, Zap, ArrowLeft, FileText, Printer, Trash2, RefreshCw, X, Monitor, Tv, Layers } from 'lucide-react';
import { SUB_TOPIC_NAMES } from '../utils/constants';
import MediaViewer from '../components/MediaViewer';
import { useGlobalSession } from '../context/GlobalSessionContext';

export default function QuizDetail({ socket }) {
    const navigate = useNavigate();
    const { topicId, subId } = useParams();
    const { onlinePin } = useGlobalSession();
    const [counts, setCounts] = React.useState({ mcq: 0, short: 0, ox: 0 });
    const [quizData, setQuizData] = React.useState(null);

    // --- 종합 폴더 관련 상태 ---
    const [showOrderModal, setShowOrderModal] = React.useState(false);

    // --- 시험지 다운로드 및 출력 상태값 추가 ---
    const [subTopicTitle, setSubTopicTitle] = React.useState('커스텀 퀴즈');
    const [view, setView] = React.useState('grid'); // 'grid' | 'exam'
    const [allQuestionsPool, setAllQuestionsPool] = React.useState([]); // 전체 하위 폴더 문제 풀 (대체용)
    const [selectedQuestions, setSelectedQuestions] = React.useState([]); // 시험지 문항 목록
    const [showCountModal, setShowCountModal] = React.useState(false);
    const [showReplaceModal, setShowReplaceModal] = React.useState(false);
    const [replacingIndex, setReplacingIndex] = React.useState(null);
    const [activeReplaceSubId, setActiveReplaceSubId] = React.useState(null);
    const [examType, setExamType] = React.useState('mixed'); // 'mcq' | 'short' | 'mixed'
    const [desiredCount, setDesiredCount] = React.useState(10);
    const [isFetchingQuestions, setIsFetchingQuestions] = React.useState(false);
    const [orderType, setOrderType] = React.useState('random'); // 'random' | 'sequential'
    const [printType, setPrintType] = React.useState('student'); // 'student' | 'teacher'

    // --- 오프라인 모드 상태 추가 ---
    const [showModeModal, setShowModeModal] = React.useState(false);
    const [showOfflineCountModal, setShowOfflineCountModal] = React.useState(false);
    const [offlineCount, setOfflineCount] = React.useState(0);
    const [pendingQuizData, setPendingQuizData] = React.useState(null);

    // 다른 하위 폴더 정보 및 개수
    const [subTopics, setSubTopics] = React.useState([]);
    const [allCounts, setAllCounts] = React.useState({});

    React.useEffect(() => {
        const loadData = () => {
            // 종합 폴더일 경우: 모든 서브 폴더의 문제 자동 집계
            if (subId === 'sub-comprehensive') {
                socket.emit('config:load', (res) => {
                    let mainTitle = topicId;
                    let topicList = [];
                    if (res && res.success && res.config) {
                        if (res.config.quizzes) {
                            const q = res.config.quizzes.find(item => item.id === topicId);
                            if (q) mainTitle = q.title;
                        }
                        if (res.config[`topic_${topicId}`]) {
                            topicList = res.config[`topic_${topicId}`];
                        }
                    }
                    if (topicList.length === 0) {
                        const baseNames = SUB_TOPIC_NAMES[topicId] || Array.from({ length: 24 }, (_, i) => `준비중 ${i + 1}`);
                        topicList = baseNames.map((name, i) => ({ id: `sub-${i + 1}`, title: name }));
                    }
                    setSubTopics(topicList);
                    setSubTopicTitle(`${mainTitle}종합`);

                    const fetchPromises = topicList.map(sub => new Promise((resolve) => {
                        socket.emit('quiz:getQuestions', { topicId, subId: sub.id }, (qRes) => {
                            let data = null;
                            if (qRes && qRes.success && qRes.data) {
                                data = qRes.data;
                            } else {
                                const key = `quizrun_data_${topicId}_${sub.id}`;
                                const saved = localStorage.getItem(key);
                                if (saved) {
                                    try { data = JSON.parse(saved); } catch (e) {}
                                }
                            }
                            resolve({ subId: sub.id, subTitle: sub.title, data });
                        });
                    }));

                    Promise.all(fetchPromises).then(results => {
                        let allMcq = [];
                        let allOx = [];
                        let allShort = [];
                        let allSequential = [];

                        results.forEach(item => {
                            if (item.data) {
                                const mcq = (item.data.mcq || []).map((q, idx) => ({ ...q, type: 'mcq', subTopicId: item.subId, subTopicTitle: item.subTitle, originalIndex: idx }));
                                const ox = (item.data.ox || []).map((q, idx) => ({ ...q, type: 'ox', subTopicId: item.subId, subTopicTitle: item.subTitle, originalIndex: idx }));
                                const short = (item.data.short || []).map((q, idx) => ({ ...q, type: 'short', subTopicId: item.subId, subTopicTitle: item.subTitle, originalIndex: idx }));

                                allMcq.push(...mcq);
                                allOx.push(...ox);
                                allShort.push(...short);
                                allSequential.push(...mcq, ...ox, ...short);
                            }
                        });

                        setCounts({ mcq: allMcq.length, short: allShort.length, ox: allOx.length });
                        setQuizData({ mcq: allMcq, ox: allOx, short: allShort, sequentialQuestions: allSequential });
                    });
                });

                socket.emit('quiz:getAllCounts', (res) => {
                    if (res && res.success && res.counts) {
                        setAllCounts(res.counts);
                    }
                });
                return;
            }

            // 일반 서브 폴더 처리
            socket.emit('config:load', (res) => {
                if (res && res.success && res.config && res.config[`topic_${topicId}`]) {
                    const topicList = res.config[`topic_${topicId}`];
                    setSubTopics(topicList);
                    const sub = topicList.find(s => s.id === subId);
                    if (sub) setSubTopicTitle(sub.title);
                } else {
                    const baseNames = SUB_TOPIC_NAMES[topicId] || Array.from({ length: 24 }, (_, i) => `준비중 ${i + 1}`);
                    const defaultTopics = baseNames.map((name, i) => ({
                        id: `sub-${i + 1}`,
                        title: name,
                    }));
                    setSubTopics(defaultTopics);
                    const subIndex = parseInt(subId.replace('sub-', '')) - 1;
                    setSubTopicTitle(baseNames[subIndex] || '커스텀 퀴즈');
                }
            });

            socket.emit('quiz:getAllCounts', (res) => {
                if (res && res.success && res.counts) {
                    setAllCounts(res.counts);
                }
            });

            // Load current subtopic quiz data
            socket.emit('quiz:getQuestions', { topicId, subId }, (res) => {
                let data = null;
                if (res && res.success && res.data) {
                    data = res.data;
                } else {
                    const key = `quizrun_data_${topicId}_${subId}`;
                    const saved = localStorage.getItem(key);
                    if (saved) {
                        data = JSON.parse(saved);
                    }
                }

                if (data) {
                    const mcqCount = (data.mcq || []).length;
                    const shortCount = (data.short || []).length;
                    const oxCount = (data.ox || []).length;
                    setCounts({ mcq: mcqCount, short: shortCount, ox: oxCount });
                    setQuizData(data);
                }
            });
        };

        if (socket.connected) {
            loadData();
        } else {
            socket.once('connect', loadData);
        }

        return () => {
            socket.off('connect', loadData);
        };
    }, [topicId, subId, socket]);

    React.useEffect(() => {
        if (view === 'exam') {
            const displayTitle = (subTopicTitle || "평가").replace(/\s*시험지$/, '') || "평가";
            document.title = displayTitle;
        } else {
            document.title = "퀴즈런";
        }
        return () => {
            document.title = "퀴즈런";
        };
    }, [view, subTopicTitle]);

    const startComprehensiveGame = (orderType) => {
        let questionsPool = [];
        if (quizData && quizData.sequentialQuestions && quizData.sequentialQuestions.length > 0) {
            questionsPool = [...quizData.sequentialQuestions];
        } else {
            questionsPool = [
                ...(quizData?.mcq || []),
                ...(quizData?.ox || []),
                ...(quizData?.short || [])
            ];
        }

        if (questionsPool.length === 0) {
            alert('이 종합 폴더에는 저장된 문제가 없습니다. 각 서브 폴더에서 문제를 먼저 만들어주세요!');
            return;
        }

        let finalQuestions = [...questionsPool];
        if (orderType === 'random') {
            finalQuestions = shuffleArray(finalQuestions);
        }

        const customQuiz = {
            title: subTopicTitle,
            quizType: 'mixed',
            questions: finalQuestions
        };

        const globalSession = JSON.parse(localStorage.getItem('quizrun_global_session') || '{}');
        const isOffline = globalSession.gameMode === 'offline';
        const participantCount = globalSession.participantCount || 0;
        const initialScores = globalSession.scores || null;

        setShowOrderModal(false);

        navigate('/host', {
            state: {
                customQuiz,
                isOffline,
                participantCount,
                initialScores,
                pin: onlinePin
            }
        });
    };

    const handleStartGame = () => {
        let allQuestions = [];
        if (subId === 'sub-comprehensive') {
            if (quizData && quizData.sequentialQuestions && quizData.sequentialQuestions.length > 0) {
                allQuestions = [...quizData.sequentialQuestions];
            } else {
                allQuestions = [
                    ...(quizData?.mcq || []).map(q => ({ ...q, type: 'mcq' })),
                    ...(quizData?.ox || []).map(q => ({ ...q, type: 'ox' })),
                    ...(quizData?.short || []).map(q => ({ ...q, type: 'short' }))
                ];
            }
            if (allQuestions.length === 0) {
                alert('이 종합 폴더에는 저장된 문제가 없습니다. 각 서브 폴더에서 문제를 먼저 만들어주세요!');
                return;
            }
        } else {
            let data = quizData;
            
            if (!data) {
                const key = `quizrun_data_${topicId}_${subId}`;
                const saved = localStorage.getItem(key);
                if (saved) {
                    data = JSON.parse(saved);
                }
            }

            if (!data || ((data.mcq || []).length === 0 && (data.short || []).length === 0 && (data.ox || []).length === 0)) {
                alert('저장된 문제가 없습니다. 문제를 먼저 만들어주세요!');
                return;
            }

            allQuestions = [
                ...(data.mcq || []).map(q => ({ ...q, type: 'mcq' })),
                ...(data.ox || []).map(q => ({ ...q, type: 'ox' })),
                ...(data.short || []).map(q => ({ ...q, type: 'short' }))
            ];
            
            if (allQuestions.length === 0) {
                alert('저장된 문제가 없습니다!');
                return;
            }
        }

        const mcqCount = allQuestions.filter(q => q.type === 'mcq' || (q.options && q.options.length > 2)).length;
        const oxCount = allQuestions.filter(q => q.type === 'ox' || (q.options && q.options.length === 2)).length;
        const shortCount = allQuestions.filter(q => q.type === 'short' || (!q.options || q.options.length === 0)).length;
        const typeCount = (mcqCount > 0 ? 1 : 0) + (oxCount > 0 ? 1 : 0) + (shortCount > 0 ? 1 : 0);
        const resolvedQuizType = typeCount > 1 ? 'mixed' : (shortCount > 0 ? 'short' : (oxCount > 0 ? 'ox' : 'mcq'));

        const customQuiz = {
            title: subTopicTitle,
            quizType: resolvedQuizType, 
            questions: allQuestions
        };

        const globalSession = JSON.parse(localStorage.getItem('quizrun_global_session') || '{}');
        const isOffline = globalSession.gameMode === 'offline';
        const participantCount = globalSession.participantCount || 0;
        const initialScores = globalSession.scores || null;

        navigate('/host', {
            state: {
                customQuiz,
                isOffline,
                participantCount,
                initialScores,
                pin: onlinePin
            }
        });
    };

    // --- 시험지 생성 및 출력 구현부 ---
    const shuffleArray = (array) => {
        const arr = [...array];
        for (let i = arr.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [arr[i], arr[j]] = [arr[j], arr[i]];
        }
        return arr;
    };

    const handleExamDownloadClick = () => {
        const totalCount = counts.mcq + counts.short;
        if (totalCount === 0) {
            alert("이 폴더에 저장된 문제가 없습니다. 문제를 먼저 만들어 주세요.");
            return;
        }

        setDesiredCount(Math.min(10, totalCount));
        setShowCountModal(true);
    };

    const generateRandomExam = (count, type) => {
        if (count <= 0) return;

        const data = quizData || { mcq: [], short: [], ox: [] };
        const mcqAndOx = [
            ...(data.mcq || []).map((q, idx) => ({
                ...q,
                type: 'mcq',
                subTopicId: subId,
                subTopicTitle: subTopicTitle,
                originalIndex: idx,
                globalId: `mcq_${subId}_${idx}`
            })),
            ...(data.ox || []).map((q, idx) => ({
                ...q,
                type: 'ox',
                subTopicId: subId,
                subTopicTitle: subTopicTitle,
                originalIndex: idx,
                globalId: `ox_${subId}_${idx}`
            }))
        ].filter(q => (q.text && q.text.trim()) || q.mediaUrl || q.answer);

        const short = (data.short || []).map((q, idx) => ({
            ...q,
            type: 'short',
            subTopicId: subId,
            subTopicTitle: subTopicTitle,
            originalIndex: idx,
            globalId: `short_${subId}_${idx}`
        })).filter(q => (q.text && q.text.trim()) || q.mediaUrl || q.answer);

        let mcqTarget = 0;
        let shortTarget = 0;

        if (type === 'mcq') {
            mcqTarget = Math.min(count, mcqAndOx.length);
        } else if (type === 'short') {
            shortTarget = Math.min(count, short.length);
        } else {
            // Mixed (반반 비율)
            mcqTarget = Math.min(Math.ceil(count / 2), mcqAndOx.length);
            shortTarget = Math.min(count - mcqTarget, short.length);
            if (mcqTarget + shortTarget < count) {
                mcqTarget = Math.min(count - shortTarget, mcqAndOx.length);
            }
        }

        const selectedMcq = shuffleArray(mcqAndOx).slice(0, mcqTarget);
        const selectedShort = shuffleArray(short).slice(0, shortTarget);

        const combined = shuffleArray([...selectedMcq, ...selectedShort]);
        setSelectedQuestions(combined);
        setShowCountModal(false);
        setView('exam');
        preloadAllQuestionsForReplacement();
    };

    const preloadAllQuestionsForReplacement = () => {
        setIsFetchingQuestions(true);
        const fetchPromises = subTopics.map(sub => {
            return new Promise((resolve) => {
                socket.emit('quiz:getQuestions', { topicId, subId: sub.id }, (res) => {
                    if (res && res.success && res.data) {
                        const mcq = (res.data.mcq || []).map((q, idx) => ({
                            ...q,
                            type: 'mcq',
                            subTopicId: sub.id,
                            subTopicTitle: sub.title,
                            originalIndex: idx,
                            globalId: `mcq_${sub.id}_${idx}`
                        }));
                        const ox = (res.data.ox || []).map((q, idx) => ({
                            ...q,
                            type: 'ox',
                            subTopicId: sub.id,
                            subTopicTitle: sub.title,
                            originalIndex: idx,
                            globalId: `ox_${sub.id}_${idx}`
                        }));
                        const short = (res.data.short || []).map((q, idx) => ({
                            ...q,
                            type: 'short',
                            subTopicId: sub.id,
                            subTopicTitle: sub.title,
                            originalIndex: idx,
                            globalId: `short_${sub.id}_${idx}`
                        }));
                        resolve([...mcq, ...ox, ...short]);
                    } else {
                        resolve([]);
                    }
                });
            });
        });

        Promise.all(fetchPromises).then((results) => {
            setIsFetchingQuestions(false);
            const flatPool = results.flat().filter(q => q.text && q.text.trim());
            setAllQuestionsPool(flatPool);
        }).catch(err => {
            setIsFetchingQuestions(false);
            console.error("Failed to pre-fetch all questions:", err);
        });
    };

    const handleReplaceClick = (index) => {
        setReplacingIndex(index);
        if (subTopics.length > 0) {
            setActiveReplaceSubId(subTopics[0].id);
        }
        setShowReplaceModal(true);
    };

    const handleReplaceQuestion = (newQuestion) => {
        const updated = [...selectedQuestions];
        updated[replacingIndex] = newQuestion;
        setSelectedQuestions(updated);
        setShowReplaceModal(false);
        setReplacingIndex(null);
    };

    const handleDeleteQuestion = (index) => {
        if (selectedQuestions.length <= 1) {
            alert("시험지에는 최소 1문제 이상 있어야 합니다.");
            return;
        }
        const updated = selectedQuestions.filter((_, idx) => idx !== index);
        setSelectedQuestions(updated);
    };

    // --- 모달 렌더링 함수 ---
    const renderCountModal = () => {
        if (!showCountModal) return null;

        const mcqAvailable = counts.mcq + (counts.ox || 0);
        const shortAvailable = counts.short;
        const totalAvailable = counts.mcq + counts.short + (counts.ox || 0);

        let maxCount = totalAvailable;
        if (examType === 'mcq') {
            maxCount = mcqAvailable;
        } else if (examType === 'short') {
            maxCount = shortAvailable;
        }

        return (
            <div className="modal-overlay" style={{
                position: 'fixed',
                top: 0,
                left: 0,
                width: '100%',
                height: '100%',
                backgroundColor: 'rgba(0,0,0,0.5)',
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                zIndex: 1000,
                backdropFilter: 'blur(4px)'
            }}>
                <div className="glass-panel text-center" style={{ padding: '2.5rem', textAlign: 'center', maxWidth: '480px', width: '90%', background: 'white' }}>
                    <h3 style={{ color: 'var(--primary)', marginBottom: '1.5rem', marginTop: 0 }}>시험지 생성하기</h3>
                    
                    {/* 유형 옵션 선택 라디오 */}
                    <div style={{ marginBottom: '1.5rem', textAlign: 'left', background: '#f8fafc', padding: '15px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                        <label style={{ fontSize: '0.95rem', fontWeight: 'bold', display: 'block', marginBottom: '10px', color: 'var(--text)' }}>
                            출제 문항 유형 선택:
                        </label>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '0.9rem' }}>
                                <input
                                    type="radio"
                                    name="examType"
                                    value="mixed"
                                    checked={examType === 'mixed'}
                                    onChange={() => {
                                        setExamType('mixed');
                                        setDesiredCount(prev => Math.min(prev, totalAvailable));
                                    }}
                                />
                                <span>랜덤 (객관식+주관식 반반) <span style={{ color: 'var(--text-muted)' }}>(총 {totalAvailable}문제 가능)</span></span>
                            </label>
                            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '0.9rem' }}>
                                <input
                                    type="radio"
                                    name="examType"
                                    value="mcq"
                                    checked={examType === 'mcq'}
                                    disabled={mcqAvailable === 0}
                                    onChange={() => {
                                        setExamType('mcq');
                                        setDesiredCount(prev => Math.min(prev, mcqAvailable));
                                    }}
                                />
                                <span style={{ color: mcqAvailable === 0 ? '#94a3b8' : 'inherit' }}>
                                    객관식만 <span style={{ color: 'var(--text-muted)' }}>(총 {mcqAvailable}문제 가능)</span>
                                </span>
                            </label>
                            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '0.9rem' }}>
                                <input
                                    type="radio"
                                    name="examType"
                                    value="short"
                                    checked={examType === 'short'}
                                    disabled={shortAvailable === 0}
                                    onChange={() => {
                                        setExamType('short');
                                        setDesiredCount(prev => Math.min(prev, shortAvailable));
                                    }}
                                />
                                <span style={{ color: shortAvailable === 0 ? '#94a3b8' : 'inherit' }}>
                                    주관식만 <span style={{ color: 'var(--text-muted)' }}>(총 {shortAvailable}문제 가능)</span>
                                </span>
                            </label>
                        </div>
                    </div>

                    {/* 출제 순서 선택 라디오 */}
                    <div style={{ marginBottom: '1.5rem', textAlign: 'left', background: '#f8fafc', padding: '15px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                        <label style={{ fontSize: '0.95rem', fontWeight: 'bold', display: 'block', marginBottom: '10px', color: 'var(--text)' }}>
                            출제 순서 선택:
                        </label>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '0.9rem' }}>
                                <input
                                    type="radio"
                                    name="orderType"
                                    value="random"
                                    checked={orderType === 'random'}
                                    onChange={() => setOrderType('random')}
                                />
                                <span>랜덤으로 출제</span>
                            </label>
                            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '0.9rem' }}>
                                <input
                                    type="radio"
                                    name="orderType"
                                    value="sequential"
                                    checked={orderType === 'sequential'}
                                    onChange={() => setOrderType('sequential')}
                                />
                                <span>번호 순서대로 출제</span>
                            </label>
                        </div>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '15px', marginBottom: '2rem' }}>
                        <label style={{ fontSize: '1rem', fontWeight: 'bold' }}>문제 수:</label>
                        <input
                            type="number"
                            min="1"
                            max={maxCount}
                            className="glass-input"
                            value={desiredCount}
                            onChange={(e) => {
                                let val = parseInt(e.target.value, 10);
                                if (isNaN(val)) val = 1;
                                val = Math.max(1, Math.min(maxCount, val));
                                setDesiredCount(val);
                            }}
                            style={{ width: '100px', textAlign: 'center', padding: '10px', fontSize: '1.1rem' }}
                        />
                        <span style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>(최대 {maxCount})</span>
                    </div>

                    <div style={{ display: 'flex', gap: '10px' }}>
                        <button
                            onClick={() => generateRandomExam(desiredCount, examType)}
                            disabled={maxCount === 0}
                            className="glass-button"
                            style={{
                                flex: 1,
                                padding: '12px',
                                fontSize: '1rem',
                                background: maxCount === 0 ? '#cbd5e1' : 'var(--primary)',
                                color: 'white',
                                borderColor: maxCount === 0 ? '#cbd5e1' : 'var(--primary)',
                                cursor: maxCount === 0 ? 'not-allowed' : 'pointer'
                            }}
                        >
                            생성하기
                        </button>
                        <button
                            onClick={() => setShowCountModal(false)}
                            className="glass-button secondary"
                            style={{ flex: 1, padding: '12px', fontSize: '1rem' }}
                        >
                            취소
                        </button>
                    </div>
                </div>
            </div>
        );
    };

    const renderStartOrderModal = () => {
        if (!showOrderModal) return null;

        const totalCount = counts.mcq + counts.short + (counts.ox || 0);

        return (
            <div className="modal-overlay" style={{
                position: 'fixed', top: 0, left: 0, width: '100%', height: '100%',
                backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center',
                zIndex: 1000, backdropFilter: 'blur(4px)'
            }}>
                <div className="glass-panel text-center" style={{ padding: '2.5rem', textAlign: 'center', maxWidth: '520px', width: '90%', background: 'white', borderRadius: '20px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', marginBottom: '0.5rem' }}>
                        <Layers size={28} color="var(--primary)" />
                        <h2 style={{ color: 'var(--primary)', margin: 0, fontSize: '1.6rem' }}>[{subTopicTitle}] 문제 풀이 방식 선택</h2>
                    </div>
                    <p style={{ color: 'var(--text-muted)', marginBottom: '1.8rem', fontSize: '0.95rem' }}>
                        총 <strong>{totalCount}개</strong>의 문제가 통합되었습니다. 원하시는 진행 방식을 선택하세요.
                    </p>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginBottom: '2rem' }}>
                        <button
                            onClick={() => startComprehensiveGame('sequential')}
                            style={{
                                padding: '1.2rem',
                                background: 'linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%)',
                                border: '2px solid #3b82f6',
                                borderRadius: '14px',
                                cursor: 'pointer',
                                textAlign: 'left',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '15px',
                                transition: 'all 0.2s'
                            }}
                        >
                            <div style={{ background: '#3b82f6', color: 'white', width: '42px', height: '42px', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.2rem', fontWeight: 'bold' }}>
                                🔢
                            </div>
                            <div>
                                <div style={{ fontSize: '1.1rem', fontWeight: 'bold', color: '#1e40af', marginBottom: '4px' }}>
                                    서브 폴더 순서대로 풀기
                                </div>
                                <div style={{ fontSize: '0.85rem', color: '#3b82f6' }}>
                                    1번 폴더부터 마지막 서브 폴더까지 순서대로 진행합니다.
                                </div>
                            </div>
                        </button>

                        <button
                            onClick={() => startComprehensiveGame('random')}
                            style={{
                                padding: '1.2rem',
                                background: 'linear-gradient(135deg, #fef3c7 0%, #fde68a 100%)',
                                border: '2px solid #f59e0b',
                                borderRadius: '14px',
                                cursor: 'pointer',
                                textAlign: 'left',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '15px',
                                transition: 'all 0.2s'
                            }}
                        >
                            <div style={{ background: '#f59e0b', color: 'white', width: '42px', height: '42px', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.2rem', fontWeight: 'bold' }}>
                                🔀
                            </div>
                            <div>
                                <div style={{ fontSize: '1.1rem', fontWeight: 'bold', color: '#92400e', marginBottom: '4px' }}>
                                    전체 문제 랜덤으로 풀기
                                </div>
                                <div style={{ fontSize: '0.85rem', color: '#b45309' }}>
                                    모든 서브 폴더의 문제를 무작위로 섞어서 진행합니다.
                                </div>
                            </div>
                        </button>
                    </div>

                    <button
                        onClick={() => setShowOrderModal(false)}
                        className="glass-button secondary"
                        style={{ width: '100%', padding: '12px', fontSize: '1rem' }}
                    >
                        취소
                    </button>
                </div>
            </div>
        );
    };

    const renderReplaceModal = () => {
        if (!showReplaceModal) return null;

        const subQuestions = allQuestionsPool.filter(q => q.subTopicId === activeReplaceSubId);
        const selectedIds = new Set(selectedQuestions.map(q => q.globalId));
        const activeSubTopic = subTopics.find(s => s.id === activeReplaceSubId);
        const activeSubTitle = activeSubTopic ? activeSubTopic.title : "";

        return (
            <div className="modal-overlay" style={{
                position: 'fixed',
                top: 0,
                left: 0,
                width: '100%',
                height: '100%',
                backgroundColor: 'rgba(0,0,0,0.5)',
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                zIndex: 1000,
                backdropFilter: 'blur(4px)'
            }}>
                <div className="glass-panel animate-slide-up" style={{
                    width: '90%',
                    maxWidth: '1000px',
                    height: '80vh',
                    display: 'flex',
                    flexDirection: 'column',
                    padding: 0,
                    overflow: 'hidden',
                    background: 'white'
                }}>
                    <div style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        padding: '1.5rem',
                        borderBottom: '1px solid #e2e8f0',
                        background: '#f8fafc'
                    }}>
                        <h3 style={{ margin: 0, color: 'var(--primary)' }}>대체할 문제 선택</h3>
                        <button
                            onClick={() => {
                                setShowReplaceModal(false);
                                setReplacingIndex(null);
                            }}
                            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}
                        >
                            <X size={24} />
                        </button>
                    </div>

                    <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
                        <div style={{
                            width: '250px',
                            borderRight: '1px solid #e2e8f0',
                            overflowY: 'auto',
                            background: '#f8fafc',
                            padding: '10px'
                        }}>
                            <h4 style={{ margin: '10px 0 10px 10px', fontSize: '0.85rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>하위 폴더 목록</h4>
                            {subTopics.map(sub => {
                                const key = `quizrun_data_${topicId}_${sub.id}`;
                                const count = allCounts[key] || 0;
                                const isActive = sub.id === activeReplaceSubId;

                                return (
                                    <button
                                        key={sub.id}
                                        onClick={() => setActiveReplaceSubId(sub.id)}
                                        style={{
                                            width: '100%',
                                            textAlign: 'left',
                                            padding: '12px 15px',
                                            border: 'none',
                                            background: isActive ? '#e0f2fe' : 'transparent',
                                            borderRadius: '8px',
                                            color: isActive ? 'var(--primary)' : 'var(--text)',
                                            fontWeight: isActive ? 'bold' : 'normal',
                                            cursor: 'pointer',
                                            display: 'flex',
                                            justifyContent: 'space-between',
                                            alignItems: 'center',
                                            marginBottom: '4px'
                                        }}
                                    >
                                        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '160px' }}>{sub.title}</span>
                                        <span style={{ fontSize: '0.75rem', color: isActive ? 'var(--primary)' : 'var(--text-muted)', background: isActive ? '#bae6fd' : '#e2e8f0', padding: '2px 6px', borderRadius: '10px' }}>{count}</span>
                                    </button>
                                );
                            })}
                        </div>

                        <div style={{ flex: 1, overflowY: 'auto', padding: '1.5rem' }}>
                            <h4 style={{ marginTop: 0, marginBottom: '1.5rem', color: 'var(--text-muted)' }}>
                                [{activeSubTitle}] 폴더의 문제 목록 (총 {subQuestions.length}개)
                            </h4>

                            {subQuestions.length === 0 ? (
                                <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
                                    이 폴더에 등록된 문제가 없습니다.
                                </div>
                            ) : (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                                    {subQuestions.map((q, qidx) => {
                                        const isAlreadySelected = selectedIds.has(q.globalId);
                                        return (
                                            <div key={qidx} style={{
                                                padding: '1.2rem',
                                                border: '1px solid #e2e8f0',
                                                borderRadius: '12px',
                                                background: '#ffffff',
                                                opacity: isAlreadySelected ? 0.6 : 1,
                                                display: 'flex',
                                                flexDirection: 'column',
                                                gap: '10px',
                                                textAlign: 'left'
                                            }}>
                                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                    <span style={{ fontSize: '0.8rem', fontWeight: 'bold', color: q.type === 'mcq' ? 'var(--primary)' : q.type === 'ox' ? 'var(--secondary)' : 'var(--ans-green)' }}>
                                                        {q.type === 'ox' ? 'OX' : q.type === 'mcq' ? '객관식' : '주관식'}
                                                    </span>
                                                    {isAlreadySelected && (
                                                        <span style={{ fontSize: '0.75rem', color: 'var(--primary)', fontWeight: 'bold', background: '#e0f2fe', padding: '2px 8px', borderRadius: '10px' }}>
                                                            이미 시험지에 존재함
                                                        </span>
                                                    )}
                                                </div>
                                                <p style={{ margin: 0, fontWeight: 'bold', color: 'var(--text)', fontSize: '0.95rem' }}>{q.text}</p>
                                                
                                                {(q.type === 'mcq' || q.type === 'ox') ? (
                                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                                                        {q.options.map((opt, oIdx) => (
                                                            <div key={oIdx} style={{ color: q.correctIndex === oIdx ? 'var(--primary)' : 'inherit', fontWeight: q.correctIndex === oIdx ? 'bold' : 'normal' }}>
                                                                {q.type === 'ox' ? opt : `${oIdx + 1}. ${opt}`}
                                                            </div>
                                                        ))}
                                                    </div>
                                                ) : (
                                                    <div style={{ fontSize: '0.85rem', color: 'var(--ans-green)', fontWeight: 'bold' }}>
                                                        정답: {q.answer}
                                                    </div>
                                                )}

                                                <button
                                                    onClick={() => !isAlreadySelected && handleReplaceQuestion(q)}
                                                    disabled={isAlreadySelected}
                                                    className="glass-button"
                                                    style={{
                                                        alignSelf: 'flex-end',
                                                        padding: '6px 15px',
                                                        fontSize: '0.85rem',
                                                        background: isAlreadySelected ? '#cbd5e1' : 'var(--primary)',
                                                        borderColor: isAlreadySelected ? '#cbd5e1' : 'var(--primary)',
                                                        color: 'white',
                                                        cursor: isAlreadySelected ? 'not-allowed' : 'pointer'
                                                    }}
                                                >
                                                    선택하기
                                                </button>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        );
    };

    const renderPrintMarkup = () => {
        const chunkArray = (array, size) => {
            const result = [];
            for (let i = 0; i < array.length; i += size) {
                result.push(array.slice(i, i + size));
            }
            return result;
        };

        const pages = chunkArray(selectedQuestions, 10);
        const displayTitle = (subTopicTitle || "평가").replace(/\s*시험지$/, '') || "평가";

        return (
            <div id="print-exam-area">
                {pages.map((pageQuestions, pIdx) => {
                    const leftCol = pageQuestions.slice(0, 5);
                    const rightCol = pageQuestions.slice(5, 10);

                    return (
                        <div className="print-page" key={pIdx}>
                            <div className="print-header">
                                <h2>{displayTitle}</h2>
                                <div className="print-header-info">
                                    <span>이름: ________________</span>
                                    <span>날짜: ________________</span>
                                    <span>점수: ________ / 100</span>
                                </div>
                            </div>

                            <div className="print-columns-container">
                                <div className="print-column">
                                    {leftCol.map((q, idx) => {
                                        const qNum = pIdx * 10 + idx + 1;
                                        return (
                                            <div className="print-q-card" key={idx}>
                                                <div className="print-q-text">
                                                    {qNum}. {q.text}
                                                </div>
                                                {(q.type === 'mcq' || q.type === 'ox') ? (
                                                    <div className="print-q-options">
                                                        {q.options.map((opt, oIdx) => {
                                                            const isCorrect = printType === 'teacher' && oIdx === q.correctIndex;
                                                            return (
                                                                <div className="print-q-opt-item" key={oIdx} style={isCorrect ? { fontWeight: 'bold', color: 'var(--primary)' } : {}}>
                                                                    {q.type === 'ox' ? opt : `${['①', '②', '③', '④'][oIdx]} ${opt}`} {isCorrect && ' ✓'}
                                                                </div>
                                                            );
                                                        })}
                                                    </div>
                                                ) : (
                                                    printType === 'teacher' ? (
                                                        <div className="print-q-short-line" style={{ display: 'flex', alignItems: 'center' }}>
                                                            답: <span style={{ marginLeft: '10px', fontWeight: 'bold', color: 'var(--primary)', borderBottom: 'none' }}>{q.answer}</span>
                                                        </div>
                                                    ) : (
                                                        <div className="print-q-short-line">
                                                            답: 
                                                        </div>
                                                    )
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>

                                <div className="print-column">
                                    {rightCol.map((q, idx) => {
                                        const qNum = pIdx * 10 + 5 + idx + 1;
                                        return (
                                            <div className="print-q-card" key={idx}>
                                                <div className="print-q-text">
                                                    {qNum}. {q.text}
                                                </div>
                                                {(q.type === 'mcq' || q.type === 'ox') ? (
                                                    <div className="print-q-options">
                                                        {q.options.map((opt, oIdx) => {
                                                            const isCorrect = printType === 'teacher' && oIdx === q.correctIndex;
                                                            return (
                                                                <div className="print-q-opt-item" key={oIdx} style={isCorrect ? { fontWeight: 'bold', color: 'var(--primary)' } : {}}>
                                                                    {q.type === 'ox' ? opt : `${['①', '②', '③', '④'][oIdx]} ${opt}`} {isCorrect && ' ✓'}
                                                                </div>
                                                            );
                                                        })}
                                                    </div>
                                                ) : (
                                                    printType === 'teacher' ? (
                                                        <div className="print-q-short-line" style={{ display: 'flex', alignItems: 'center' }}>
                                                            답: <span style={{ marginLeft: '10px', fontWeight: 'bold', color: 'var(--primary)', borderBottom: 'none' }}>{q.answer}</span>
                                                        </div>
                                                    ) : (
                                                        <div className="print-q-short-line">
                                                            답: 
                                                        </div>
                                                    )
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>

                            {/* 쪽수 하단 가운데 배치 */}
                            <div className="print-page-number">
                                - {pIdx + 1} -
                            </div>
                        </div>
                    );
                })}

                {printType === 'student' && (
                    <div className="print-page print-answer-key-page">
                        <div className="print-ak-header">
                            [{displayTitle}] 정답지 (Answer Key)
                        </div>
                        <div className="print-ak-grid">
                            {selectedQuestions.map((q, idx) => (
                                <div className="print-ak-item" key={idx}>
                                    <div className="print-ak-num">{idx + 1}번</div>
                                    <div className="print-ak-val">
                                        {(q.type === 'mcq' || q.type === 'ox') ? (
                                            <strong>
                                                {q.type === 'ox' ? q.options[q.correctIndex] : `${['①', '②', '③', '④'][q.correctIndex]} ${q.options[q.correctIndex]}`}
                                            </strong>
                                        ) : (
                                            <strong>{q.answer}</strong>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                        {/* 정답지 페이지 번호 */}
                        <div className="print-page-number">
                            - {pages.length + 1} -
                        </div>
                    </div>
                )}
            </div>
        );
    };

    if (view === 'exam') {
        return (
            <div className="full-screen-container" style={{ flexDirection: 'column', alignItems: 'center', paddingTop: '1rem', overflowY: 'auto', paddingBottom: '4rem' }}>
                <style>{`
                    #print-exam-area {
                        display: none;
                    }
                    
                    @media print {
                        .full-screen-container {
                            display: block !important;
                            height: auto !important;
                            width: auto !important;
                            overflow: visible !important;
                            padding: 0 !important;
                            margin: 0 !important;
                            background: white !important;
                        }
                        .no-print {
                            display: none !important;
                        }
                        .modal-overlay {
                            display: none !important;
                        }
                        #print-exam-area {
                            display: block !important;
                            position: absolute;
                            left: 0;
                            top: 0;
                            width: 100%;
                            background: white;
                            color: black;
                        }
                        
                        @page {
                            size: A4;
                            margin: 0; /* 브라우저 기본 머리글/바닥글 제거 */
                        }
                        
                        .print-page {
                            page-break-after: always;
                            display: flex;
                            flex-direction: column;
                            width: 210mm;
                            height: 297mm; /* A4 규격화 */
                            box-sizing: border-box;
                            background: white;
                            color: black;
                            padding: 12mm 15mm; /* 여백 축소 */
                        }
                        
                        .print-header {
                            display: flex;
                            justify-content: space-between;
                            align-items: center;
                            border-bottom: 2px solid black;
                            padding-bottom: 8px;
                            margin-bottom: 12px;
                        }
                        
                        .print-header h2 {
                            margin: 0;
                            font-size: 1.3rem;
                        }
                        
                        .print-header-info {
                            font-size: 0.8rem;
                            display: flex;
                            gap: 15px;
                        }
                        
                        .print-columns-container {
                            display: flex;
                            justify-content: space-between;
                            flex: 1; /* 가용 높이 가득 채우기 */
                            width: 100%;
                            min-height: 0;
                        }
                        
                        .print-column {
                            width: 48%;
                            display: flex;
                            flex-direction: column;
                            justify-content: space-between; /* 문항들 세로 간격 벌리기 */
                            height: 100%;
                        }
                        
                        .print-q-card {
                            display: flex;
                            flex-direction: column;
                            gap: 4px;
                            page-break-inside: avoid;
                        }
                        
                        .print-q-text {
                            font-size: 0.82rem;
                            font-weight: bold;
                            line-height: 1.3;
                            text-align: left;
                        }
                        
                        .print-q-options {
                            display: flex;
                            flex-direction: column;
                            gap: 2px;
                            padding-left: 10px;
                            text-align: left;
                        }
                        
                        .print-q-opt-item {
                            font-size: 0.73rem;
                        }
                        
                        .print-q-short-line {
                            font-size: 0.8rem;
                            margin-top: 3px;
                            border-bottom: 1px dotted black;
                            width: 80%;
                            height: 18px;
                            text-align: left;
                        }
                        
                        .print-answer-key-page {
                            display: flex;
                            flex-direction: column;
                            width: 210mm;
                            height: 297mm;
                            box-sizing: border-box;
                            background: white;
                            color: black;
                            padding: 15mm 20mm;
                        }
                        
                        .print-ak-header {
                            border-bottom: 2px solid black;
                            padding-bottom: 10px;
                            margin-bottom: 20px;
                            font-size: 1.5rem;
                            font-weight: bold;
                            text-align: center;
                        }
                        
                        .print-ak-grid {
                            display: grid;
                            grid-template-columns: 1fr 1fr;
                            gap: 12px;
                            padding: 10px;
                        }
                        
                        .print-ak-item {
                            display: flex;
                            gap: 10px;
                            font-size: 0.95rem;
                            border-bottom: 1px solid #eee;
                            padding-bottom: 5px;
                            text-align: left;
                        }
                        
                        .print-ak-num {
                            font-weight: bold;
                            width: 50px;
                        }
                        
                        .print-ak-val {
                            flex: 1;
                        }

                        .print-page-number {
                            text-align: center;
                            font-size: 0.75rem; /* 기존 0.85rem에서 조금 더 작게 조정 */
                            color: #777; /* 더 조그맣고 연하게 설정 */
                            margin-top: auto; /* 하단 밀어내기 */
                            padding-top: 5mm;
                            font-weight: 300;
                            letter-spacing: 2px;
                        }
                        
                        .print-page:last-child {
                            page-break-after: avoid; /* 마지막 페이지 이후 불필요한 빈 페이지 방지 */
                        }
                    }
                `}</style>

                {/* 시험지 편집기 헤더 */}
                <div className="no-print" style={{ position: 'fixed', top: '15px', left: '20px', display: 'flex', alignItems: 'center', gap: '15px', zIndex: 300, width: 'calc(100% - 40px)', justifyContent: 'space-between' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                        <img src="/logo.png?v=3" alt="Quiz N Run Logo" className="home-logo" style={{ height: '70px', cursor: 'pointer' }} onClick={() => navigate(`/topic/${topicId}`)} />
                        <h1 style={{ fontSize: '2.2rem', margin: 0, color: 'var(--primary)', whiteSpace: 'nowrap', cursor: 'pointer' }} onClick={() => navigate(`/topic/${topicId}`)}>
                            지식의 숲, <span style={{ color: 'var(--secondary)' }}>퀴즈런</span>
                        </h1>
                    </div>

                    <div style={{ display: 'flex', gap: '15px', alignItems: 'center' }}>
                        {/* 출력 유형 선택 라디오 */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', background: 'rgba(255, 255, 255, 0.8)', padding: '6px 12px', borderRadius: '10px', border: '1px solid #e2e8f0', fontSize: '0.9rem', fontWeight: 'bold', color: 'var(--primary)' }}>
                            <span style={{ marginRight: '5px' }}>출력 유형:</span>
                            <label style={{ display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer' }}>
                                <input
                                    type="radio"
                                    name="printType"
                                    value="student"
                                    checked={printType === 'student'}
                                    onChange={() => setPrintType('student')}
                                />
                                학생용 (정답지 분리)
                            </label>
                            <label style={{ display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer' }}>
                                <input
                                    type="radio"
                                    name="printType"
                                    value="teacher"
                                    checked={printType === 'teacher'}
                                    onChange={() => setPrintType('teacher')}
                                />
                                교사용 (시험지에 정답 표시)
                            </label>
                        </div>

                        <button
                            onClick={() => setView('grid')}
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
                            <ArrowLeft size={18} /> 이전 (준비 화면으로)
                        </button>
                        <button
                            onClick={() => window.print()}
                            className="glass-button"
                            style={{
                                padding: '8px 16px',
                                fontSize: '0.9rem',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '6px',
                                background: 'var(--primary)',
                                border: '1px solid var(--primary)',
                                borderRadius: '10px',
                                fontWeight: 'bold',
                                color: 'white',
                                cursor: 'pointer'
                            }}
                        >
                            <Printer size={18} /> 인쇄 / PDF 저장
                        </button>
                    </div>
                </div>

                {/* 선별된 시험지 문제 검토 리스트 */}
                <div className="no-print" style={{ width: '100%', maxWidth: '900px', margin: '110px auto 20px', display: 'flex', flexDirection: 'column', gap: '1.5rem', padding: '0 20px' }}>
                    <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
                        <h2 style={{ color: 'var(--primary)', margin: '0 0 10px 0' }}>[{subTopicTitle || "평가"}] 시험지 문항 검토</h2>
                        <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem', margin: 0 }}>
                            추출된 문제 중 원하지 않는 문제는 삭제하거나 다른 문제로 대체한 후 상단의 [인쇄 / PDF 저장]을 눌러 출력하세요.
                        </p>
                    </div>

                    {selectedQuestions.map((q, idx) => (
                        <div key={idx} className="glass-panel animate-slide-up" style={{ padding: '1.5rem', position: 'relative', width: '100%', background: 'white', textAlign: 'left' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                                <span style={{ fontSize: '0.85rem', fontWeight: 'bold', color: 'var(--primary)', background: '#e0f2fe', padding: '4px 10px', borderRadius: '20px' }}>
                                    문항 {idx + 1} | {q.subTopicTitle}
                                </span>
                                <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: 'bold' }}>
                                    {q.type === 'ox' ? 'OX' : q.type === 'mcq' ? '객관식' : '주관식'}
                                </span>
                            </div>
                            
                            <p style={{ fontSize: '1.1rem', fontWeight: 'bold', margin: '0 0 1.2rem 0', color: 'var(--text)' }}>
                                {q.text}
                            </p>

                            <MediaViewer mediaUrl={q.mediaUrl} mediaType={q.mediaType} mediaName={q.mediaName} autoplay={false} />

                            {(q.type === 'mcq' || q.type === 'ox') ? (
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '1rem' }}>
                                    {q.options.map((opt, oIdx) => (
                                        <div key={oIdx} style={{ padding: '10px 15px', borderRadius: '10px', border: `1px solid ${q.correctIndex === oIdx ? 'var(--primary)' : '#e2e8f0'}`, background: q.correctIndex === oIdx ? '#f0f9ff' : '#f8fafc', color: 'var(--text)', fontSize: '0.9rem' }}>
                                            {q.type === 'ox' ? opt : `${oIdx + 1}. ${opt}`}
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div style={{ padding: '12px 15px', borderRadius: '10px', border: '1px solid var(--ans-green)', background: '#f0fdf4', color: 'var(--text)', fontWeight: 'bold', fontSize: '0.9rem', marginBottom: '1rem' }}>
                                    정답: {q.answer}
                                </div>
                            )}

                            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', borderTop: '1px solid #f1f5f9', paddingTop: '1rem' }}>
                                <button
                                    onClick={() => handleReplaceClick(idx)}
                                    className="glass-button secondary"
                                    style={{ padding: '6px 12px', fontSize: '0.85rem', gap: '6px', background: '#f8fafc' }}
                                >
                                    <RefreshCw size={14} /> 다른 문제로 대체
                                </button>
                                <button
                                    onClick={() => handleDeleteQuestion(idx)}
                                    style={{ padding: '6px 12px', fontSize: '0.85rem', gap: '6px', background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', display: 'flex', alignItems: 'center' }}
                                >
                                    <Trash2 size={14} /> 삭제
                                </button>
                            </div>
                        </div>
                    ))}
                </div>

                {renderReplaceModal()}
                {renderPrintMarkup()}
            </div>
        );
    }

    return (
        <div className="full-screen-container" style={{ flexDirection: 'column', alignItems: 'center', paddingTop: '1rem', overflowX: 'hidden' }}>

            {/* Header Section: Compact Top Left with Back Button */}
            <div style={{ position: 'fixed', top: '15px', left: '20px', display: 'flex', alignItems: 'center', gap: '15px', zIndex: 300 }}>
                <img src="/logo.png?v=3" alt="Quiz N Run Logo" className="home-logo" style={{ height: '70px', cursor: 'pointer' }} onClick={() => navigate(`/topic/${topicId}`)} />
                <h1 style={{ fontSize: '2.2rem', margin: 0, color: 'var(--primary)', whiteSpace: 'nowrap', cursor: 'pointer', marginRight: '20px' }} onClick={() => navigate(`/topic/${topicId}`)}>
                    지식의 숲, <span style={{ color: 'var(--secondary)' }}>퀴즈런</span>
                </h1>

                <button
                    onClick={() => navigate(`/topic/${topicId}`)}
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

            {/* Header Right: Open Sub Monitor Screen Window */}
            {!(Boolean(window.location.search.includes('subscreen=true') || window.name === 'QuizrunSubScreenWindow' || sessionStorage.getItem('is_subscreen') === 'true')) && (
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
                    <span>🖥️ 서브 모니터 스크린 열기</span>
                </button>
            )}

            <div style={{ textAlign: 'center', marginBottom: '2rem', marginTop: '100px' }}>
                <h1 style={{ fontSize: '3rem', color: 'var(--primary)', marginBottom: '0.5rem' }}>게임 준비</h1>
                <p style={{ fontSize: '1.2rem', color: 'var(--text-muted)' }}>원하는 방식을 선택해 주세요.</p>
            </div>

            <div className="action-menu">
                <button
                    className="glass-button action-menu-btn"
                    style={{ background: '#f0f9ff', color: 'var(--primary)', border: '4px solid var(--primary)' }}
                    onClick={() => navigate('/participant')}
                >
                    <PlayCircle size={32} /> 코드 참여
                </button>

                <button
                    className="glass-button action-menu-btn"
                    onClick={handleStartGame}
                    style={{ position: 'relative' }}
                >
                    <Zap size={32} fill="white" /> 문제 시작
                    <div style={{ position: 'absolute', bottom: '-25px', left: '0', width: '100%', fontSize: '0.9rem', color: 'var(--text-muted)', fontWeight: 'bold' }}>
                        객관식: {counts.mcq}, 주관식: {counts.short}, OX: {counts.ox || 0}
                    </div>
                </button>

                <button
                    className="glass-button action-menu-btn"
                    style={{ background: 'var(--secondary)', color: 'white', boxShadow: '0 10px 20px rgba(245, 158, 11, 0.3)' }}
                    onClick={() => {
                        if (subId === 'sub-comprehensive') {
                            alert('종합 폴더는 각 서브 폴더의 문제가 자동으로 모이는 폴더입니다.\n새 문제는 개별 서브 폴더에서 만들어 주세요.');
                        } else {
                            navigate('/create', { state: { topicId, subId } });
                        }
                    }}
                >
                    <MonitorPlay size={32} /> 문제 만들기
                </button>

                {/* 문제 만들기 바로 밑에 동일한 규격으로 '시험지 다운' 버튼 추가 */}
                <button
                    className="glass-button action-menu-btn"
                    style={{ background: 'var(--primary)', color: 'white', boxShadow: '0 10px 20px rgba(59, 130, 246, 0.3)' }}
                    onClick={handleExamDownloadClick}
                >
                    <FileText size={32} /> 시험지 다운
                </button>
            </div>

            {renderCountModal()}
            {renderStartOrderModal()}

        </div>
    );
}
