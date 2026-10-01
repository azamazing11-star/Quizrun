import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { PlusCircle, Trash2, ArrowLeft, CheckCircle, Circle, MonitorPlay, ClipboardList, Plus, Download, Upload, GripVertical, Link, FileUp, XCircle, Music, Film, Copy, FolderInput, CheckSquare, Square, Check } from 'lucide-react';
import * as XLSX from 'xlsx';
import MediaViewer from '../components/MediaViewer';
import { useGlobalSession } from '../context/GlobalSessionContext';
import { SUB_TOPIC_NAMES } from '../utils/constants';

const DEFAULT_TOPICS = [
    { id: 'humor', title: '유머' },
    { id: 'econ', title: '경제' },
    { id: 'current', title: '시사' },
    { id: 'science', title: '과학' },
    { id: 'sports', title: '스포츠' },
    { id: 'lit', title: '문학' },
    { id: 'math', title: '수학' },
    { id: 'tech', title: '매너' },
    { id: 'movie', title: '영화' },
    { id: 'music', title: '음악' },
    { id: 'food', title: '음식' },
    { id: 'travel', title: '여행' },
    { id: 'art', title: '예술' },
    { id: 'arch', title: '건축' },
    { id: 'nature', title: '자연' },
    { id: 'space', title: '우주' },
    { id: 'phil', title: '철학' },
    { id: 'psych', title: '심리' },
    { id: 'law', title: '법' },
    { id: 'lang', title: '언어' },
    { id: 'trivia', title: '상식 퀴즈' },
];

export default function Create({ socket }) {
    const navigate = useNavigate();
    const location = useLocation();
    const { onlinePin } = useGlobalSession();
    const { topicId, subId } = location.state || {};
    
    const [mode, setMode] = useState(location.state?.mode || null); // 'mcq' | 'short' | 'ox'
    const [questions, setQuestions] = useState([
        { text: '', options: ['', '', '', ''], correctIndex: 0, answer: '', explanation: '', mediaDisplayMode: 'audio', autoplay: false, showChosung: true }
    ]);
    const [pasteAreaOpen, setPasteAreaOpen] = useState(false);
    const [pastedText, setPastedText] = useState('');
    const [batchQuestionText, setBatchQuestionText] = useState('');
    const [batchOxOption0, setBatchOxOption0] = useState('O');
    const [batchOxOption1, setBatchOxOption1] = useState('X');
    const [customOxPresets, setCustomOxPresets] = useState(() => {
        try {
            const saved = localStorage.getItem('quizrun_custom_ox_presets');
            return saved ? JSON.parse(saved) : [];
        } catch (e) {
            return [];
        }
    });

    // Selection and Move/Copy states
    const [selectedIndices, setSelectedIndices] = useState(new Set());
    const [showMoveCopyModal, setShowMoveCopyModal] = useState(false);
    const [transferSuccessInfo, setTransferSuccessInfo] = useState(null); // 이동/복사 완료 후 이동 여부 확인 모달
    const [modalActionType, setModalActionType] = useState('copy'); // 'copy' | 'move'
    const [targetTopicId, setTargetTopicId] = useState(topicId || 'econ');
    const [targetSubId, setTargetSubId] = useState(subId || 'sub-1');
    const [targetQuizMode, setTargetQuizMode] = useState('mcq');
    const [appConfig, setAppConfig] = useState(null);
    const [topicsList, setTopicsList] = useState(DEFAULT_TOPICS);
    const [isTransferring, setIsTransferring] = useState(false);
    const [targetIndicesForModal, setTargetIndicesForModal] = useState([]);

    // 문제 유형 변환 helper
    const adaptQuestion = (q, fromMode, toMode) => {
        const clone = JSON.parse(JSON.stringify(q));
        if (fromMode === toMode) return clone;

        if (toMode === 'ox') {
            // → OX: 기존 정답/정답인덱스 기반으로 0번/1번 결정
            let isX = false;
            if (fromMode === 'mcq') {
                isX = (clone.options && clone.options[clone.correctIndex] === 'X') || clone.correctIndex === 1;
            } else if (fromMode === 'short') {
                isX = (clone.answer || '').toUpperCase() === 'X';
            }
            const opt0 = (clone.options && clone.options.length === 2 && clone.options[0]) || batchOxOption0.trim() || 'O';
            const opt1 = (clone.options && clone.options.length === 2 && clone.options[1]) || batchOxOption1.trim() || 'X';
            const opts = [opt0, opt1];
            const ans = opts[isX ? 1 : 0];
            return { ...clone, options: opts, correctIndex: isX ? 1 : 0, answer: ans, _convertNote: '정답은 첫 번째 선택지 또는 기존 선택지에 맞춰 설정됩니다. 필요 시 편집하세요.' };

        } else if (toMode === 'mcq') {
            // → 객관식: 정답 텍스트를 1번 선택지에, 나머지 빈칸
            let opts = Array.isArray(clone.options) && clone.options.length === 4 ? [...clone.options] : ['', '', '', ''];
            if (fromMode === 'short') {
                opts[0] = clone.answer || '';
                opts[1] = ''; opts[2] = ''; opts[3] = '';
                return { ...clone, options: opts, correctIndex: 0, answer: opts[0], _convertNote: '정답이 1번 선택지에 입력됩니다. 나머지 선택지를 채워주세요.' };
            } else if (fromMode === 'ox') {
                const opt0 = (clone.options && clone.options[0]) || 'O';
                const opt1 = (clone.options && clone.options[1]) || 'X';
                opts = [clone.answer || opt0, (clone.answer === opt0 ? opt1 : opt0), '', ''];
                return { ...clone, options: opts, correctIndex: 0, answer: opts[0], _convertNote: '선택지 3, 4번을 채워주세요.' };
            }
            return { ...clone, options: opts, correctIndex: clone.correctIndex || 0, answer: opts[clone.correctIndex || 0] || clone.answer || '' };

        } else { // toMode === 'short'
            // → 주관식: 정답 선택지 텍스트 → answer 칸
            let ans = clone.answer || '';
            if (fromMode === 'mcq' && Array.isArray(clone.options)) {
                ans = clone.options[clone.correctIndex] || clone.answer || '';
            } else if (fromMode === 'ox') {
                ans = clone.answer || (clone.options && clone.options[clone.correctIndex]) || (clone.correctIndex === 1 ? 'X' : 'O');
            }
            return { ...clone, options: ['', '', '', ''], correctIndex: 0, answer: ans };
        }
    };

    useEffect(() => {
        if (socket) {
            socket.emit('config:load', (res) => {
                if (res && res.success && res.config) {
                    setAppConfig(res.config);
                    if (res.config.quizzes && res.config.quizzes.length > 0) {
                        const filtered = res.config.quizzes.filter(q => q.id !== 'ladder' && q.title !== '사다리');
                        setTopicsList(filtered);
                        if (!topicId && filtered[0]) {
                            setTargetTopicId(filtered[0].id);
                        }
                    }
                }
            });
        }
    }, [socket, topicId]);

    useEffect(() => {
        if (mode) {
            setTargetQuizMode(mode);
            setSelectedIndices(new Set());
        }
    }, [mode]);

    const getSubTopicsForTopic = (tId) => {
        if (appConfig && appConfig[`topic_${tId}`] && Array.isArray(appConfig[`topic_${tId}`])) {
            return appConfig[`topic_${tId}`].map((s, idx) => ({
                id: s.id || `sub-${idx + 1}`,
                title: s.title || `세부 주제 ${idx + 1}`
            }));
        }
        const baseNames = SUB_TOPIC_NAMES[tId] || [];
        return Array.from({ length: 24 }, (_, i) => ({
            id: `sub-${i + 1}`,
            title: baseNames[i] || `세부 주제 ${i + 1}`
        }));
    };

    const toggleSelectQuestion = (index) => {
        setSelectedIndices(prev => {
            const next = new Set(prev);
            if (next.has(index)) {
                next.delete(index);
            } else {
                next.add(index);
            }
            return next;
        });
    };

    const handleToggleSelectAll = () => {
        if (selectedIndices.size === questions.length) {
            setSelectedIndices(new Set());
        } else {
            setSelectedIndices(new Set(questions.map((_, i) => i)));
        }
    };

    const handleClearSelection = () => {
        setSelectedIndices(new Set());
    };

    const handleBatchDeleteSelected = () => {
        if (selectedIndices.size === 0) return;
        const count = selectedIndices.size;
        if (window.confirm(`선택한 ${count}개의 문제를 삭제하시겠습니까?`)) {
            const remaining = questions.filter((_, idx) => !selectedIndices.has(idx));
            setQuestions(remaining); // 빈 배열도 허용 (저장 시 0문제로 저장됨)
            setSelectedIndices(new Set());
        }
    };

    const handleOpenBatchModal = (actionType) => {
        if (selectedIndices.size === 0) {
            alert('이동하거나 복사할 문제를 1개 이상 선택해주세요.');
            return;
        }
        setModalActionType(actionType);
        setTargetIndicesForModal(Array.from(selectedIndices).sort((a, b) => a - b));
        setTargetQuizMode(mode || 'mcq');
        setShowMoveCopyModal(true);
    };

    const handleOpenSingleModal = (index, actionType) => {
        setModalActionType(actionType);
        setTargetIndicesForModal([index]);
        setTargetQuizMode(mode || 'mcq');
        setShowMoveCopyModal(true);
    };

    const handleConfirmMoveCopy = () => {
        if (targetIndicesForModal.length === 0) return;

        const isSameFolder = (targetTopicId === topicId) && (targetSubId === subId);
        if (isSameFolder && modalActionType === 'move') {
            alert('현재 폴더와 대상 폴더가 동일합니다. 다른 폴더를 선택해주세요.');
            return;
        }

        const questionsToTransfer = targetIndicesForModal
            .map(idx => questions[idx])
            .filter(Boolean);

        if (questionsToTransfer.length === 0) return;

        setIsTransferring(true);

        socket.emit('quiz:getQuestions', { topicId: targetTopicId, subId: targetSubId }, (res) => {
            let targetData = (res && res.success && res.data) ? res.data : null;
            if (!targetData) {
                const localTarget = localStorage.getItem(`quizrun_data_${targetTopicId}_${targetSubId}`);
                targetData = localTarget ? JSON.parse(localTarget) : { mcq: [], short: [], ox: [] };
            }
            if (!targetData.mcq) targetData.mcq = [];
            if (!targetData.short) targetData.short = [];
            if (!targetData.ox) targetData.ox = [];

            const adapted = questionsToTransfer.map(q => adaptQuestion(q, mode, targetQuizMode));

            targetData[targetQuizMode] = [...targetData[targetQuizMode], ...adapted];

            localStorage.setItem(`quizrun_data_${targetTopicId}_${targetSubId}`, JSON.stringify(targetData));
            socket.emit('quiz:saveQuestions', { topicId: targetTopicId, subId: targetSubId, data: targetData }, (saveRes) => {
                setIsTransferring(false);

                if (modalActionType === 'move') {
                    const targetSet = new Set(targetIndicesForModal);
                    const remaining = questions.filter((_, idx) => !targetSet.has(idx));
                    // 빈 배열도 허용 (저장 시 0문제로 저장됨)
                    setQuestions(remaining);
                    setSelectedIndices(new Set());

                    if (topicId && subId) {
                        const curKey = `quizrun_data_${topicId}_${subId}`;
                        const curExisting = localStorage.getItem(curKey);
                        let curData = curExisting ? JSON.parse(curExisting) : { mcq: [], short: [], ox: [] };
                        curData[mode] = remaining;
                        localStorage.setItem(curKey, JSON.stringify(curData));
                        socket.emit('quiz:saveQuestions', { topicId, subId, data: curData });
                    }
                } else {
                    setSelectedIndices(new Set());
                }
                setShowMoveCopyModal(false);

                // 이동/복사 완료 알림 및 해당 폴더 바로가기 모달 데이터 설정
                const targetTopicObj = topicsList.find(t => t.id === targetTopicId);
                const targetTopicTitle = targetTopicObj ? targetTopicObj.title : targetTopicId;
                const targetSubTopics = getSubTopicsForTopic(targetTopicId);
                const targetSubObj = targetSubTopics.find(s => s.id === targetSubId);
                const targetSubTitle = targetSubObj ? targetSubObj.title : targetSubId;
                const modeName = { mcq: '객관식', short: '주관식', ox: 'OX 퀴즈' }[targetQuizMode];

                setTransferSuccessInfo({
                    actionType: modalActionType,
                    count: adapted.length,
                    targetTopicId,
                    targetSubId,
                    targetQuizMode,
                    topicTitle: targetTopicTitle,
                    subTitle: targetSubTitle,
                    modeName
                });
            });
        });
    };

    const handleNavigateToTarget = (info) => {
        setTransferSuccessInfo(null);
        setSelectedIndices(new Set());

        setMode(info.targetQuizMode);

        socket.emit('quiz:getQuestions', { topicId: info.targetTopicId, subId: info.targetSubId }, (res) => {
            if (res && res.success && res.data) {
                const data = res.data;
                const existing = info.targetQuizMode === 'mcq' ? data.mcq : info.targetQuizMode === 'ox' ? data.ox : data.short;
                if (existing && existing.length > 0) {
                    setQuestions(existing);
                } else {
                    setQuestions([{ text: '', options: info.targetQuizMode === 'ox' ? ['O', 'X'] : ['', '', '', ''], correctIndex: 0, answer: info.targetQuizMode === 'ox' ? 'O' : '', explanation: '', mediaDisplayMode: 'audio', autoplay: false, showChosung: true }]);
                }
            } else {
                setQuestions([{ text: '', options: info.targetQuizMode === 'ox' ? ['O', 'X'] : ['', '', '', ''], correctIndex: 0, answer: info.targetQuizMode === 'ox' ? 'O' : '', explanation: '', mediaDisplayMode: 'audio', autoplay: false, showChosung: true }]);
            }
        });

        navigate('/create', {
            state: {
                topicId: info.targetTopicId,
                subId: info.targetSubId,
                mode: info.targetQuizMode
            },
            replace: true
        });
    };

    const handleNavigateToQuizRoom = (info) => {
        setTransferSuccessInfo(null);
        navigate(`/quiz/${info.targetTopicId}/${info.targetSubId}`);
    };

    const [draggedIndex, setDraggedIndex] = useState(null);
    const [dragOverIndex, setDragOverIndex] = useState(null);
    const [dragAllowed, setDragAllowed] = useState(null);

    const handleDragStart = (e, index) => {
        setDraggedIndex(index);
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('text/plain', index);
    };

    const handleDragOver = (e, index) => {
        e.preventDefault();
        if (dragOverIndex !== index) {
            setDragOverIndex(index);
        }
    };

    const handleDragLeave = (e, index) => {
        if (dragOverIndex === index) {
            setDragOverIndex(null);
        }
    };

    const handleDrop = (e, targetIndex) => {
        e.preventDefault();
        setDragOverIndex(null);
        if (draggedIndex === null || draggedIndex === targetIndex) {
            setDraggedIndex(null);
            setDragAllowed(null);
            return;
        }

        const newQuestions = [...questions];
        const temp = newQuestions[draggedIndex];
        newQuestions[draggedIndex] = newQuestions[targetIndex];
        newQuestions[targetIndex] = temp;

        setQuestions(newQuestions);
        setSelectedIndices(new Set());
        setDraggedIndex(null);
        setDragAllowed(null);
    };

    const handleDragEnd = () => {
        setDraggedIndex(null);
        setDragOverIndex(null);
        setDragAllowed(null);
    };

    useEffect(() => {
        if (mode && topicId && subId) {
            // Priority: Check backend
            socket.emit('quiz:getQuestions', { topicId, subId }, (res) => {
                if (res.success && res.data) {
                    const data = res.data;
                    const existing = mode === 'mcq' ? data.mcq : mode === 'ox' ? data.ox : data.short;
                    if (existing && existing.length > 0) {
                        setQuestions(existing);
                        if (mode === 'ox') {
                            const firstWithCustom = existing.find(q => q.options && q.options.length === 2 && q.options[0] && q.options[1]);
                            if (firstWithCustom) {
                                setBatchOxOption0(firstWithCustom.options[0]);
                                setBatchOxOption1(firstWithCustom.options[1]);
                            }
                        }
                        return;
                    }
                }
                setQuestions([{ text: '', options: mode === 'ox' ? [batchOxOption0.trim() || 'O', batchOxOption1.trim() || 'X'] : ['', '', '', ''], correctIndex: 0, answer: mode === 'ox' ? (batchOxOption0.trim() || 'O') : '', explanation: '', mediaDisplayMode: 'audio', autoplay: false, showChosung: true }]);
            });
        }
    }, [mode, topicId, subId, socket]);

    const handlePasteImport = () => {
        if (!pastedText.trim()) return;

        const rows = pastedText.trim().split('\n');
        const newQuestions = rows.map(row => {
            const cols = row.split('\t');
            if (mode === 'mcq') {
                const questionText = (cols[0] || '').trim();
                const optionsString = (cols[1] || '').trim();
                const options = optionsString.split('/').map(opt => opt.trim());
                const paddedOptions = [...options];
                while (paddedOptions.length < 4) paddedOptions.push('');
                const finalOptions = paddedOptions.slice(0, 4);

                let correctIdx = 0;
                if (cols[2]) {
                    const parsedIdx = parseInt(cols[2], 10);
                    if (!isNaN(parsedIdx) && parsedIdx >= 1 && parsedIdx <= 4) {
                        correctIdx = parsedIdx - 1;
                    }
                }

                const explanation = (cols[3] || '').trim();

                return {
                    text: questionText,
                    options: finalOptions,
                    correctIndex: correctIdx,
                    answer: finalOptions[correctIdx] || '',
                    explanation: explanation
                };
            } else if (mode === 'ox') {
                const questionText = (cols[0] || '').trim();
                let opt1 = 'O';
                let opt2 = 'X';
                let correctIdx = 0;
                let ansText = '';
                let explanation = '';

                if (cols.length >= 4) {
                    // [Question, Opt1, Opt2, Correct, Explanation]
                    opt1 = (cols[1] || '').trim() || 'O';
                    opt2 = (cols[2] || '').trim() || 'X';
                    const correctRaw = (cols[3] || '').trim();
                    explanation = (cols[4] || '').trim();
                    const correctClean = correctRaw.toUpperCase();
                    const opt2Clean = opt2.toUpperCase();
                    if (
                        correctClean === '2' || 
                        correctClean === '2번' || 
                        correctClean === '선택지2' || 
                        correctClean === '선택지 2' || 
                        correctClean === 'X' || 
                        correctClean === 'FAKE' || 
                        correctClean === '거짓' || 
                        (opt2Clean && correctClean === opt2Clean) || 
                        (opt2Clean && opt2Clean.length > 0 && correctClean.includes(opt2Clean))
                    ) {
                        correctIdx = 1;
                        ansText = opt2;
                    } else {
                        correctIdx = 0;
                        ansText = opt1;
                    }
                } else if (cols.length === 3) {
                    // [Question, Answer, Explanation]
                    ansText = (cols[1] || '').trim();
                    explanation = (cols[2] || '').trim();
                    const ansClean = ansText.toUpperCase();
                    if (ansClean === 'X' || ansClean === '2' || ansClean === '2번' || ansClean === '거짓' || ansClean === 'FAKE') {
                        correctIdx = 1;
                        opt1 = batchOxOption0.trim() || 'O';
                        opt2 = batchOxOption1.trim() || 'X';
                        ansText = opt2;
                    } else {
                        correctIdx = 0;
                        opt1 = batchOxOption0.trim() || 'O';
                        opt2 = batchOxOption1.trim() || 'X';
                        ansText = opt1;
                    }
                } else {
                    const ansCol = (cols[1] || '').trim().toUpperCase();
                    if (ansCol === 'X' || ansCol === '2' || ansCol === '2번' || ansCol === '거짓' || ansCol === 'FAKE') {
                        correctIdx = 1;
                        ansText = 'X';
                    } else {
                        correctIdx = 0;
                        ansText = 'O';
                    }
                    explanation = (cols[2] || '').trim();
                }

                return {
                    text: questionText,
                    options: [opt1, opt2],
                    correctIndex: correctIdx,
                    answer: ansText,
                    explanation: explanation
                };
            } else {
                const explanation = (cols[2] || '').trim();
                return {
                    text: (cols[0] || '').trim(),
                    answer: (cols[1] || '').trim(),
                    options: ['', '', '', ''],
                    correctIndex: 0,
                    explanation: explanation
                };
            }
        }).filter(q => q.text);

        if (newQuestions.length > 0) {
            setQuestions(newQuestions);
            if (mode === 'ox') {
                const firstWithOpts = newQuestions.find(q => q.options && q.options[0] && q.options[1]);
                if (firstWithOpts) {
                    setBatchOxOption0(firstWithOpts.options[0]);
                    setBatchOxOption1(firstWithOpts.options[1]);
                }
            }
            setPasteAreaOpen(false);
            setPastedText('');
            alert(`${newQuestions.length}개의 문제를 성공적으로 불러왔습니다!`);
        } else {
            alert('유효한 데이터를 찾을 수 없습니다. 형식을 확인해주세요.');
        }
    };

    const handleDownloadExcel = () => {
        let worksheetData = [];
        let sheetName = "";
        
        const hasValidQuestions = questions.length > 0 && questions.some(q => q.text.trim() !== '');

        if (mode === 'mcq') {
            sheetName = "객관식_문제";
            worksheetData.push(["번호", "문제", "선택지1", "선택지2", "선택지3", "선택지4", "정답(1-4)", "정답인 이유"]);
            
            if (hasValidQuestions) {
                questions.forEach((q, idx) => {
                    if (q.text.trim()) {
                        worksheetData.push([
                            idx + 1,
                            q.text,
                            q.options[0] || "",
                            q.options[1] || "",
                            q.options[2] || "",
                            q.options[3] || "",
                            q.correctIndex + 1,
                            q.explanation || ""
                        ]);
                    }
                });
            } else {
                // 샘플 데이터 행 추가
                worksheetData.push([
                    1,
                    "예시 문제: 한식 식사 예절 중 밥그릇을 들고 먹는 행동에 대한 설명으로 옳은 것은?",
                    "한국에서는 밥그릇을 들고 먹는 것이 올바른 예절이다.",
                    "밥그릇은 바닥에 두고 수저로 먹는 것이 예절이다.",
                    "국그릇만 들고 먹어야 한다.",
                    "어른 앞에서는 무조건 밥그릇을 들고 먹어야 한다.",
                    2,
                    "한국의 전통 식사 예절에서는 그릇을 식탁에 두고 숟가락으로 식사하는 것이 규칙입니다."
                ]);
            }
        } else if (mode === 'ox') {
            sheetName = "OX_2지선다_문제";
            worksheetData.push(["번호", "문제", "선택지1", "선택지2", "정답(1 또는 2 / 선택지 명칭)", "정답인 이유"]);
            
            if (hasValidQuestions) {
                questions.forEach((q, idx) => {
                    if (q.text.trim()) {
                        const opt1 = (q.options && q.options[0]) || batchOxOption0.trim() || "O";
                        const opt2 = (q.options && q.options[1]) || batchOxOption1.trim() || "X";
                        const ans = q.correctIndex === 1 ? opt2 : opt1;
                        worksheetData.push([
                            idx + 1,
                            q.text,
                            opt1,
                            opt2,
                            ans,
                            q.explanation || ""
                        ]);
                    }
                });
            } else {
                worksheetData.push([
                    1,
                    "예시 문제: '어처구니없다' vs '어의없다' 중 올바른 맞춤법은?",
                    "어처구니없다",
                    "어의없다",
                    "어처구니없다",
                    "'어처구니없다'가 상식이나 이치에 맞지 않아 황당하다는 뜻의 올바른 표준어입니다."
                ]);
            }
        } else {
            sheetName = "주관식_문제";
            worksheetData.push(["번호", "문제", "정답", "정답인 이유"]);
            
            if (hasValidQuestions) {
                questions.forEach((q, idx) => {
                    if (q.text.trim()) {
                        worksheetData.push([
                            idx + 1,
                            q.text,
                            q.answer || "",
                            q.explanation || ""
                        ]);
                    }
                });
            } else {
                // 샘플 데이터 행 추가
                worksheetData.push([
                    1,
                    "예시 문제: 대한민국의 수도는 어디일까요?",
                    "서울",
                    "서울은 대한민국의 수도이자 중심지입니다."
                ]);
            }
        }

        const worksheet = XLSX.utils.aoa_to_sheet(worksheetData);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);
        XLSX.writeFile(workbook, `${mode === 'mcq' ? '객관식' : mode === 'ox' ? 'OX_2지선다' : '주관식'}_문제_${new Date().getTime()}.xlsx`);
    };

    const handleUploadExcel = (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (evt) => {
            try {
                const data = evt.target.result;
                const workbook = XLSX.read(data, { type: 'binary' });
                const sheetName = workbook.SheetNames[0];
                const worksheet = workbook.Sheets[sheetName];
                const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

                if (jsonData.length <= 1) {
                    alert("가져올 데이터가 없거나 올바르지 않은 엑셀 파일입니다.");
                    return;
                }

                const headers = jsonData[0] || [];
                const rows = jsonData.slice(1);

                const hStr = headers.map(h => (h !== undefined && h !== null ? h.toString().trim().toLowerCase() : ''));

                let questionIdx = hStr.findIndex(h => h.includes("문제") || h.includes("질문") || h.includes("question"));
                let opt1Idx = hStr.findIndex(h => 
                    h.includes("선택지1") || h.includes("선택지 1") || h.includes("선택지a") || h.includes("선택지 a") ||
                    h.includes("선택1") || h.includes("1번선택지") || h.includes("1번 선택지") || h.includes("옵션1") || h.includes("option1")
                );
                let opt2Idx = hStr.findIndex(h => 
                    h.includes("선택지2") || h.includes("선택지 2") || h.includes("선택지b") || h.includes("선택지 b") ||
                    h.includes("선택2") || h.includes("2번선택지") || h.includes("2번 선택지") || h.includes("옵션2") || h.includes("option2")
                );
                let opt3Idx = hStr.findIndex(h => h.includes("선택지3") || h.includes("선택지 3") || h.includes("선택3") || h.includes("3번선택지"));
                let opt4Idx = hStr.findIndex(h => h.includes("선택지4") || h.includes("선택지 4") || h.includes("선택4") || h.includes("4번선택지"));
                let ansIdx = hStr.findIndex(h => h.includes("정답") || h.includes("답") || h.includes("answer") || h.includes("correct"));
                let explanationIdx = hStr.findIndex(h => h.includes("이유") || h.includes("해설") || h.includes("설명") || h.includes("explanation"));

                // 폴백 및 자동 보정
                if (questionIdx === -1) {
                    const firstCell = hStr[0] || '';
                    questionIdx = (firstCell.includes("번호") || firstCell.includes("no") || !isNaN(parseInt(firstCell, 10))) ? 1 : 0;
                }

                if (mode === 'mcq') {
                    if (opt1Idx === -1) opt1Idx = questionIdx + 1;
                    if (opt2Idx === -1) opt2Idx = questionIdx + 2;
                    if (opt3Idx === -1) opt3Idx = questionIdx + 3;
                    if (opt4Idx === -1) opt4Idx = questionIdx + 4;
                    if (ansIdx === -1) ansIdx = opt4Idx + 1;
                    if (explanationIdx === -1) explanationIdx = ansIdx + 1;
                } else if (mode === 'ox') {
                    if (opt1Idx === -1 || opt2Idx === -1) {
                        opt1Idx = questionIdx + 1;
                        opt2Idx = questionIdx + 2;
                    }
                    if (ansIdx === -1) {
                        ansIdx = Math.max(opt1Idx, opt2Idx) + 1;
                    }
                    if (explanationIdx === -1) {
                        explanationIdx = ansIdx + 1;
                    }
                } else {
                    if (ansIdx === -1) ansIdx = questionIdx + 1;
                    if (explanationIdx === -1) explanationIdx = ansIdx + 1;
                }

                const parsedQuestions = [];

                if (mode === 'mcq') {
                    rows.forEach((row) => {
                        const questionText = (row[questionIdx] || '').toString().trim();
                        if (!questionText) return;

                        const opt1 = (row[opt1Idx] !== undefined && row[opt1Idx] !== null) ? row[opt1Idx].toString().trim() : '';
                        const opt2 = (row[opt2Idx] !== undefined && row[opt2Idx] !== null) ? row[opt2Idx].toString().trim() : '';
                        const opt3 = (row[opt3Idx] !== undefined && row[opt3Idx] !== null) ? row[opt3Idx].toString().trim() : '';
                        const opt4 = (row[opt4Idx] !== undefined && row[opt4Idx] !== null) ? row[opt4Idx].toString().trim() : '';

                        let correctVal = row[ansIdx];
                        let correctIdx = 0;
                        if (correctVal !== undefined && correctVal !== null) {
                            const parsedIdx = parseInt(correctVal.toString().trim(), 10);
                            if (!isNaN(parsedIdx) && parsedIdx >= 1 && parsedIdx <= 4) {
                                correctIdx = parsedIdx - 1;
                            }
                        }

                        const finalOptions = [opt1, opt2, opt3, opt4];
                        parsedQuestions.push({
                            text: questionText,
                            options: finalOptions,
                            correctIndex: correctIdx,
                            answer: finalOptions[correctIdx] || '',
                            explanation: (row[explanationIdx] !== undefined && row[explanationIdx] !== null) ? row[explanationIdx].toString().trim() : ''
                        });
                    });
                } else if (mode === 'ox') {
                    rows.forEach((row) => {
                        const questionText = (row[questionIdx] || '').toString().trim();
                        if (!questionText) return;

                        let opt1 = (opt1Idx !== -1 && row[opt1Idx] !== undefined && row[opt1Idx] !== null) ? row[opt1Idx].toString().trim() : '';
                        let opt2 = (opt2Idx !== -1 && row[opt2Idx] !== undefined && row[opt2Idx] !== null) ? row[opt2Idx].toString().trim() : '';

                        let rawAns = (ansIdx !== -1 && row[ansIdx] !== undefined && row[ansIdx] !== null) ? row[ansIdx].toString().trim() : '';

                        // 만약 개별 행에서 선택지1, 선택지2가 비어있다면 툴바 일괄설정값 활용
                        if (!opt1) opt1 = batchOxOption0.trim() || 'O';
                        if (!opt2) opt2 = batchOxOption1.trim() || 'X';

                        let correctIdx = 0;
                        let answerText = opt1;

                        const cleanAns = rawAns.trim().toUpperCase();
                        const cleanOpt1 = opt1.trim().toUpperCase();
                        const cleanOpt2 = opt2.trim().toUpperCase();

                        if (
                            cleanAns === '2' ||
                            cleanAns === '2번' ||
                            cleanAns === '선택지2' ||
                            cleanAns === '선택지 2' ||
                            cleanAns === 'X' ||
                            cleanAns === 'FAKE' ||
                            cleanAns === '거짓' ||
                            (cleanOpt2 && cleanAns === cleanOpt2) ||
                            (cleanOpt2 && cleanOpt2.length > 0 && cleanAns.includes(cleanOpt2))
                        ) {
                            correctIdx = 1;
                            answerText = opt2;
                        } else {
                            correctIdx = 0;
                            answerText = opt1;
                        }

                        parsedQuestions.push({
                            text: questionText,
                            options: [opt1, opt2],
                            correctIndex: correctIdx,
                            answer: answerText,
                            explanation: (row[explanationIdx] !== undefined && row[explanationIdx] !== null) ? row[explanationIdx].toString().trim() : ''
                        });
                    });
                } else {
                    rows.forEach((row) => {
                        const questionText = (row[questionIdx] || '').toString().trim();
                        if (!questionText) return; // 빈 줄 건너뛰기

                        const answerText = (row[ansIdx] !== undefined && row[ansIdx] !== null) ? row[ansIdx].toString().trim() : '';
                        parsedQuestions.push({
                            text: questionText,
                            answer: answerText,
                            options: ['', '', '', ''],
                            correctIndex: 0,
                            explanation: (row[explanationIdx] !== undefined && row[explanationIdx] !== null) ? row[explanationIdx].toString().trim() : ''
                        });
                    });
                }

                if (parsedQuestions.length === 0) {
                    alert("유효한 문제를 찾을 수 없습니다. 양식에 맞게 입력했는지 확인해주세요.");
                    return;
                }

                const append = window.confirm(`총 ${parsedQuestions.length}개의 문제를 읽어왔습니다.\n\n기존 문제 목록에 추가하시겠습니까?\n[확인] 추가함\n[취소] 기존 문제를 지우고 덮어씌움`);

                // OX 모드인 경우 업로드한 엑셀 파일의 선택지1, 선택지2로 상단 일괄 설정 툴바 & 빠른 템플릿도 자동으로 업데이트
                if (mode === 'ox') {
                    const firstWithCustom = parsedQuestions.find(q => q.options && q.options[0] && q.options[1]);
                    if (firstWithCustom) {
                        const o0 = firstWithCustom.options[0];
                        const o1 = firstWithCustom.options[1];
                        setBatchOxOption0(o0);
                        setBatchOxOption1(o1);

                        // 빠른 템플릿 목록에 없으면 자동으로 등록
                        const defaultPresets = [
                            { opt0: 'O', opt1: 'X' },
                            { opt0: 'Fact', opt1: 'Fake' },
                            { opt0: '참', opt1: '거짓' },
                            { opt0: 'True', opt1: 'False' },
                            { opt0: '맞는 맞춤법', opt1: '틀린 맞춤법' }
                        ];
                        const isDup = defaultPresets.some(p => p.opt0 === o0 && p.opt1 === o1) ||
                                      customOxPresets.some(p => p.opt0 === o0 && p.opt1 === o1);
                        if (!isDup && (o0 !== 'O' || o1 !== 'X')) {
                            const updatedPresets = [...customOxPresets, { opt0: o0, opt1: o1 }];
                            setCustomOxPresets(updatedPresets);
                            try {
                                localStorage.setItem('quizrun_custom_ox_presets', JSON.stringify(updatedPresets));
                            } catch (e) {}
                        }
                    }
                }

                if (append) {
                    // 현재 목록에 입력된 데이터가 전혀 없는 기본 1개 상태라면 그냥 덮어씌우는 것과 동일하게 처리
                    const isDefaultEmpty = questions.length === 1 && 
                                          !questions[0].text.trim() && 
                                          !questions[0].answer.trim() && 
                                          questions[0].options.every(o => !o.trim());

                    if (isDefaultEmpty) {
                        setQuestions(parsedQuestions);
                    } else {
                        setQuestions([...questions, ...parsedQuestions]);
                    }
                    alert(`${parsedQuestions.length}개의 문제가 기존 문제 목록에 추가되었습니다.`);
                } else {
                    setQuestions(parsedQuestions);
                    alert(`${parsedQuestions.length}개의 문제로 기존 문제 목록을 덮어씌웠습니다.`);
                }

            } catch (error) {
                console.error("Excel import error:", error);
                alert("엑셀 파일을 파싱하는 중에 오류가 발생했습니다. 올바른 엑셀 양식인지 확인해주세요.");
            }
            // 동일한 파일을 연속으로 올릴 수 있도록 인풋 값 초기화
            e.target.value = '';
        };

        reader.readAsBinaryString(file);
    };

    const handleBatchOxLabels = () => {
        const opt0 = batchOxOption0.trim() || 'O';
        const opt1 = batchOxOption1.trim() || 'X';
        const updated = questions.map(q => {
            const cIdx = q.correctIndex === 1 ? 1 : 0;
            return {
                ...q,
                options: [opt0, opt1],
                answer: cIdx === 1 ? opt1 : opt0
            };
        });
        setQuestions(updated);
        alert(`모든 문제의 선택지가 [${opt0} / ${opt1}] (으)로 일괄 변경되었습니다!`);
    };

    const handleOxOptionChange = (qIndex, oIndex, value) => {
        const updated = [...questions];
        const opts = updated[qIndex].options && updated[qIndex].options.length === 2 
            ? [...updated[qIndex].options] 
            : ['O', 'X'];
        opts[oIndex] = value;
        updated[qIndex].options = opts;
        if (updated[qIndex].correctIndex === oIndex) {
            updated[qIndex].answer = value;
        }
        setQuestions(updated);
    };

    const handleOxSetCorrect = (qIndex, oIndex) => {
        const updated = [...questions];
        const opts = updated[qIndex].options && updated[qIndex].options.length === 2 
            ? updated[qIndex].options 
            : ['O', 'X'];
        updated[qIndex].correctIndex = oIndex;
        updated[qIndex].answer = opts[oIndex] || (oIndex === 0 ? 'O' : 'X');
        setQuestions(updated);
    };

    const handleOxPresetSelect = (opt0, opt1) => {
        setBatchOxOption0(opt0);
        setBatchOxOption1(opt1);
    };

    const handleAddCustomOxPreset = () => {
        let opt0 = batchOxOption0.trim();
        let opt1 = batchOxOption1.trim();

        if (!opt0 || !opt1) {
            const input0 = prompt("템플릿으로 저장할 [선택지 1]을 입력하세요:", opt0 || "Fact");
            if (!input0 || !input0.trim()) return;
            const input1 = prompt("템플릿으로 저장할 [선택지 2]를 입력하세요:", opt1 || "Fake");
            if (!input1 || !input1.trim()) return;
            opt0 = input0.trim();
            opt1 = input1.trim();
        }

        const defaultPresets = [
            { opt0: 'O', opt1: 'X' },
            { opt0: 'Fact', opt1: 'Fake' },
            { opt0: '참', opt1: '거짓' },
            { opt0: 'True', opt1: 'False' },
            { opt0: '맞는 맞춤법', opt1: '틀린 맞춤법' }
        ];

        const isDuplicate = defaultPresets.some(p => p.opt0 === opt0 && p.opt1 === opt1) ||
                            customOxPresets.some(p => p.opt0 === opt0 && p.opt1 === opt1);

        if (isDuplicate) {
            alert(`[${opt0} / ${opt1}] 템플릿은 이미 빠른 템플릿 목록에 포함되어 있습니다.`);
            setBatchOxOption0(opt0);
            setBatchOxOption1(opt1);
            return;
        }

        const updated = [...customOxPresets, { opt0, opt1 }];
        setCustomOxPresets(updated);
        try {
            localStorage.setItem('quizrun_custom_ox_presets', JSON.stringify(updated));
        } catch (e) {}

        setBatchOxOption0(opt0);
        setBatchOxOption1(opt1);
        alert(`[${opt0} / ${opt1}] (이)가 나만의 빠른 템플릿 목록에 성공적으로 추가되었습니다!`);
    };

    const handleDeleteCustomOxPreset = (e, index) => {
        e.stopPropagation();
        const target = customOxPresets[index];
        if (window.confirm(`[${target.opt0} / ${target.opt1}] 템플릿을 삭제하시겠습니까?`)) {
            const updated = customOxPresets.filter((_, i) => i !== index);
            setCustomOxPresets(updated);
            try {
                localStorage.setItem('quizrun_custom_ox_presets', JSON.stringify(updated));
            } catch (e) {}
        }
    };

    const handleAddQuestion = () => {
        // 1. 기존 2문제 이상 질문 텍스트가 동일하게 입력/일괄 적용된 상태인 경우, 해당 텍스트를 자동 적용
        let defaultText = '';
        const textCounts = {};
        for (const q of questions) {
            const t = (q.text || '').trim();
            if (t) {
                textCounts[t] = (textCounts[t] || 0) + 1;
            }
        }

        let maxCount = 0;
        let commonText = '';
        for (const [t, count] of Object.entries(textCounts)) {
            if (count >= 2 && count > maxCount) {
                maxCount = count;
                commonText = t;
            }
        }

        if (commonText) {
            defaultText = commonText;
        } else if (batchQuestionText.trim()) {
            defaultText = batchQuestionText.trim();
        }

        // 2. 기존 2문제 이상 초성 힌트가 꺼진(showChosung === false) 상태인 경우, 추가 문제도 꺼진 상태로 설정
        const chosungOffCount = questions.filter(q => q.showChosung === false).length;
        const defaultShowChosung = chosungOffCount >= 2 ? false : true;

        const defaultOxOptions = mode === 'ox' ? [batchOxOption0.trim() || 'O', batchOxOption1.trim() || 'X'] : ['', '', '', ''];
        const defaultOxAnswer = mode === 'ox' ? defaultOxOptions[0] : '';

        setQuestions([...questions, { 
            text: defaultText, 
            options: defaultOxOptions, 
            correctIndex: 0, 
            answer: defaultOxAnswer,
            mediaUrl: '',
            mediaType: '',
            mediaName: '',
            mediaDisplayMode: 'audio',
            autoplay: false,
            showChosung: defaultShowChosung
        }]);
    };

    const handleRemoveQuestion = (index) => {
        const newQuestions = questions.filter((_, i) => i !== index);
        setQuestions(newQuestions);
        setSelectedIndices(prev => {
            const next = new Set();
            prev.forEach(i => {
                if (i < index) next.add(i);
                else if (i > index) next.add(i - 1);
            });
            return next;
        });
    };

    const handleQuestionTextChange = (index, text) => {
        const newQuestions = [...questions];
        newQuestions[index].text = text;
        setQuestions(newQuestions);
    };

    const handleOptionChange = (qIndex, oIndex, text) => {
        const newQuestions = [...questions];
        newQuestions[qIndex].options[oIndex] = text;
        setQuestions(newQuestions);
    };

    const handleAnswerChange = (index, text) => {
        const newQuestions = [...questions];
        newQuestions[index].answer = text;
        setQuestions(newQuestions);
    };

    const handleMediaFileUpload = (qIndex, file) => {
        if (!file) return;

        const reader = new FileReader();
        reader.onload = async (e) => {
            const dataUrl = e.target.result;
            const fileType = file.type || '';

            let mediaType = 'file';
            let mediaDisplayMode = 'audio';
            if (fileType.startsWith('audio/')) {
                mediaType = 'audio';
                mediaDisplayMode = 'audio';
            } else if (fileType.startsWith('video/')) {
                mediaType = 'video';
                mediaDisplayMode = 'video';
            } else if (fileType.startsWith('image/')) {
                mediaType = 'image';
                mediaDisplayMode = 'image';
            }

            // Upload base64 file to server
            try {
                const response = await fetch('/api/upload', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ name: file.name, data: dataUrl })
                });
                const resData = await response.json();
                if (resData.success && resData.url) {
                    const newQuestions = [...questions];
                    newQuestions[qIndex].mediaUrl = resData.url;
                    newQuestions[qIndex].mediaType = mediaType;
                    newQuestions[qIndex].mediaName = file.name;
                    newQuestions[qIndex].mediaDisplayMode = mediaDisplayMode;
                    setQuestions(newQuestions);
                    return;
                }
            } catch (err) {
                console.warn('Server upload failed, using Data URL fallback:', err);
            }

            // Fallback to local Data URL
            const newQuestions = [...questions];
            newQuestions[qIndex].mediaUrl = dataUrl;
            newQuestions[qIndex].mediaType = mediaType;
            newQuestions[qIndex].mediaName = file.name;
            newQuestions[qIndex].mediaDisplayMode = mediaDisplayMode;
            setQuestions(newQuestions);
        };
        reader.readAsDataURL(file);
    };

    const handleMediaUrlChange = (qIndex, url) => {
        const newQuestions = [...questions];
        newQuestions[qIndex].mediaUrl = url;

        if (!url.trim()) {
            newQuestions[qIndex].mediaType = '';
            newQuestions[qIndex].mediaName = '';
        } else {
            const lower = url.toLowerCase();
            if (url.includes('youtube.com') || url.includes('youtu.be')) {
                newQuestions[qIndex].mediaType = 'youtube';
                newQuestions[qIndex].mediaDisplayMode = 'audio';
            } else if (lower.endsWith('.mp3') || lower.endsWith('.wav') || lower.endsWith('.m4a') || lower.endsWith('.ogg') || lower.endsWith('.flac') || lower.endsWith('.aac')) {
                newQuestions[qIndex].mediaType = 'audio';
                newQuestions[qIndex].mediaDisplayMode = 'audio';
            } else if (lower.endsWith('.mp4') || lower.endsWith('.webm') || lower.endsWith('.mov') || lower.endsWith('.ogv')) {
                newQuestions[qIndex].mediaType = 'video';
                newQuestions[qIndex].mediaDisplayMode = 'video';
            } else if (lower.endsWith('.png') || lower.endsWith('.jpg') || lower.endsWith('.jpeg') || lower.endsWith('.gif') || lower.endsWith('.webp') || lower.endsWith('.svg')) {
                newQuestions[qIndex].mediaType = 'image';
                newQuestions[qIndex].mediaDisplayMode = 'image';
            } else {
                newQuestions[qIndex].mediaType = 'link';
            }
        }
        setQuestions(newQuestions);
    };

    const handleClearMedia = (qIndex) => {
        const newQuestions = [...questions];
        newQuestions[qIndex].mediaUrl = '';
        newQuestions[qIndex].mediaType = '';
        newQuestions[qIndex].mediaName = '';
        newQuestions[qIndex].mediaDisplayMode = 'audio';
        newQuestions[qIndex].autoplay = false;
        setQuestions(newQuestions);
    };

    const handleMediaDisplayModeChange = (qIndex, modeVal) => {
        const newQuestions = [...questions];
        newQuestions[qIndex].mediaDisplayMode = modeVal;
        setQuestions(newQuestions);
    };

    const handleAutoplayChange = (qIndex, autoVal) => {
        const newQuestions = [...questions];
        newQuestions[qIndex].autoplay = autoVal;
        setQuestions(newQuestions);
    };

    const handleChosungToggle = (qIndex, showVal) => {
        const newQuestions = [...questions];
        newQuestions[qIndex].showChosung = showVal;
        setQuestions(newQuestions);
    };

    // --- BATCH SETTINGS FOR ALL QUESTIONS ---
    const handleBatchMediaDisplayMode = (modeVal) => {
        const newQuestions = questions.map(q => ({ ...q, mediaDisplayMode: modeVal }));
        setQuestions(newQuestions);
    };

    const handleBatchAutoplay = (autoVal) => {
        const newQuestions = questions.map(q => ({ ...q, autoplay: autoVal }));
        setQuestions(newQuestions);
    };

    const handleBatchChosung = (showVal) => {
        const newQuestions = questions.map(q => ({ ...q, showChosung: showVal }));
        setQuestions(newQuestions);
        if (showVal) {
            alert(`총 ${newQuestions.length}개 문제의 초성 힌트가 전체 '켜기'로 적용되었습니다.`);
        } else {
            alert(`총 ${newQuestions.length}개 문제의 초성 힌트가 전체 '끄기'로 적용되었습니다.`);
        }
    };

    const handleBatchQuestionText = () => {
        if (!batchQuestionText.trim()) {
            alert('일괄 적용할 문제 질문 텍스트를 입력해주세요.');
            return;
        }
        const confirmed = window.confirm(`현재 ${questions.length}개의 모든 문제에\n"${batchQuestionText.trim()}"\n질문 텍스트를 일괄 적용하시겠습니까?`);
        if (!confirmed) return;

        const newQuestions = questions.map(q => ({ ...q, text: batchQuestionText.trim() }));
        setQuestions(newQuestions);
        alert(`총 ${newQuestions.length}개의 문제에 질문 텍스트가 일괄 적용되었습니다!`);
    };

    const handleCreateRoom = () => {
        // 질문 텍스트(text)가 없더라도 이미지/미디어(mediaUrl)나 정답/선택지가 입력되어 있으면 유효 문제로 인지
        const validQuestions = questions.filter(q => {
            const hasText = Boolean(q.text && q.text.trim());
            const hasMedia = Boolean(q.mediaUrl && q.mediaUrl.trim());
            const hasAnswer = Boolean((q.answer && q.answer.trim()) || (q.options && q.options.some(o => o && o.trim())));
            return hasText || hasMedia || hasAnswer;
        }).map(q => {
            // 질문 텍스트가 비어있으면 미디어 타입에 맞는 기본 안내 텍스트를 자동 할당
            if (!q.text || !q.text.trim()) {
                let defaultText = '다음 문제의 정답을 맞혀보세요!';
                if (q.mediaType === 'image' || q.mediaDisplayMode === 'image') {
                    defaultText = '다음 이미지를 보고 정답을 맞혀보세요!';
                } else if (q.mediaType === 'audio' || q.mediaDisplayMode === 'audio') {
                    defaultText = '다음 소리를 듣고 정답을 맞혀보세요!';
                } else if (q.mediaType === 'video' || q.mediaDisplayMode === 'video') {
                    defaultText = '다음 영상을 보고 정답을 맞혀보세요!';
                }
                return { ...q, text: defaultText };
            }
            return q;
        });

        if (validQuestions.length === 0) {
            if (topicId && subId) {
                const confirmed = window.confirm('작성된 문제가 없거나 모두 삭제된 상태입니다.\n해당 세부 주제의 문제를 모두 비운(0개) 상태로 저장하시겠습니까?');
                if (!confirmed) return;

                const key = `quizrun_data_${topicId}_${subId}`;
                const existing = localStorage.getItem(key);
                let data = existing ? JSON.parse(existing) : { mcq: [], short: [], ox: [] };
                if (!data.ox) data.ox = [];
                data[mode] = [];

                localStorage.setItem(key, JSON.stringify(data));
                socket.emit('quiz:saveQuestions', { topicId, subId, data }, (res) => {
                    alert('모든 문제가 삭제되어 빈 폴더로 저장되었습니다.');
                    navigate(`/quiz/${topicId}/${subId}`);
                });
                return;
            } else {
                alert('게임을 시작하려면 최소 1개 이상의 문제를 작성해주세요!');
                return;
            }
        }

        // 각 유효 문제에 대해 검증
        for (let i = 0; i < validQuestions.length; i++) {
            const q = validQuestions[i];
            if (mode === 'mcq') {
                for (let j = 0; j < 4; j++) {
                    if (!q.options[j].trim()) {
                        alert(`"${q.text.slice(0, 20)}" 문제의 ${j + 1}번째 선택지를 입력해주세요.`);
                        return;
                    }
                }
            } else if (mode === 'ox') {
                if (!q.options || q.options.length < 2) {
                    q.options = [batchOxOption0.trim() || 'O', batchOxOption1.trim() || 'X'];
                }
                const opt0 = (q.options[0] && q.options[0].trim()) ? q.options[0].trim() : (batchOxOption0.trim() || 'O');
                const opt1 = (q.options[1] && q.options[1].trim()) ? q.options[1].trim() : (batchOxOption1.trim() || 'X');
                q.options = [opt0, opt1];
                q.answer = q.correctIndex === 1 ? opt1 : opt0;
            } else {
                if (!q.answer.trim()) {
                    alert(`"${q.text.slice(0, 20)}" 문제의 정답을 입력해주세요.`);
                    return;
                }
            }
        }

        if (topicId && subId) {
            const key = `quizrun_data_${topicId}_${subId}`;
            const existing = localStorage.getItem(key);
            let data = existing ? JSON.parse(existing) : { mcq: [], short: [], ox: [] };

            // Ensure ox array exists in data
            if (!data.ox) data.ox = [];

            if (mode === 'mcq') {
                data.mcq = validQuestions.map(q => ({ ...q, type: 'mcq' }));
            } else if (mode === 'ox') {
                data.ox = validQuestions.map(q => ({ ...q, type: 'ox' }));
            } else {
                data.short = validQuestions.map(q => ({ ...q, type: 'short', options: [] }));
            }

            // Save locally first for immediate consistency
            localStorage.setItem(key, JSON.stringify(data));

            // Save to server
            socket.emit('quiz:saveQuestions', { topicId, subId, data }, (res) => {
                if (res.success) {
                    alert('문제가 서버에 안전하게 저장되었습니다!');
                    navigate(`/quiz/${topicId}/${subId}`);
                }
            });
        } else {
            // 특정 폴더 지정 없이 직접 만든 경우에도 커스텀 저장소에 안전하게 저장
            const customKey = 'quizrun_data_custom_quiz';
            const existing = localStorage.getItem(customKey);
            let data = existing ? JSON.parse(existing) : { mcq: [], short: [], ox: [] };
            if (!data.ox) data.ox = [];
            const processedQuestions = validQuestions.map(q => ({
                ...q,
                type: mode,
                options: mode === 'short' ? [] : q.options
            }));
            data[mode] = processedQuestions;
            localStorage.setItem(customKey, JSON.stringify(data));

            const customQuiz = {
                title: mode === 'mcq' ? '객관식 퀴즈' : mode === 'ox' ? 'OX 퀴즈' : '주관식 퀴즈',
                quizType: mode,
                questions: processedQuestions
            };

            alert('✅ 작성하신 문제가 안전하게 저장되었습니다!\n퀴즈 진행 방식 및 점수 관리 화면으로 이동합니다.');
            navigate('/host', { state: { customQuiz, pin: onlinePin } });
        }
    };

    if (!mode) {
        return (
            <div className="full-screen-container" style={{ justifyContent: 'center', alignItems: 'center', background: '#f8fafc' }}>
                <div className="glass-panel" style={{ padding: '3rem', textAlign: 'center', maxWidth: '800px', width: '90%' }}>
                    <h1 style={{ color: 'var(--primary)', marginBottom: '0.5rem' }}>어떤 퀴즈를 만들까요?</h1>
                    <p style={{ color: '#0284c7', background: '#e0f2fe', display: 'inline-block', padding: '6px 16px', borderRadius: '20px', fontWeight: 'bold', marginBottom: '2rem', fontSize: '0.95rem' }}>
                        🎬 음악 · 동영상 · 이미지 파일 및 인터넷 링크(유튜브) 참조 지원!
                    </p>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1.5rem' }}>
                        <div
                            className="folder-item"
                            style={{ width: '100%', height: '160px', background: 'white' }}
                            onClick={() => setMode('mcq')}
                        >
                            <h2 style={{ color: 'var(--primary)' }}>객관식</h2>
                            <p style={{ marginTop: '10px' }}>선택지 중 하나 고르기</p>
                        </div>
                        <div
                            className="folder-item"
                            style={{ width: '100%', height: '160px', background: 'var(--primary)' }}
                            onClick={() => setMode('short')}
                        >
                            <h2 style={{ color: 'white' }}>주관식</h2>
                            <p style={{ marginTop: '10px', color: 'rgba(255,255,255,0.8)' }}>정답 직접 타이핑하기</p>
                        </div>
                        <div
                            className="folder-item"
                            style={{ width: '100%', height: '160px', background: 'white', border: '2px solid var(--primary)' }}
                            onClick={() => setMode('ox')}
                        >
                            <h2 style={{ color: 'var(--primary)' }}>OX</h2>
                            <p style={{ marginTop: '10px' }}>O 또는 X 선택하기</p>
                        </div>
                    </div>
                    <button
                        onClick={() => {
                            if (topicId && subId) {
                                navigate(`/quiz/${topicId}/${subId}`);
                            } else {
                                navigate(-1);
                            }
                        }}
                        className="glass-button secondary"
                        style={{ marginTop: '3rem', width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
                    >
                        <ArrowLeft size={18} /> 이전
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="full-screen-container" style={{ padding: '3rem 5%', display: 'flex', flexDirection: 'column', gap: '2rem', justifyContent: 'flex-start', overflowY: 'auto' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', maxWidth: '1400px', margin: '0 auto' }}>
                <button
                    onClick={() => setMode(null)}
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
                <div style={{ textAlign: 'center' }}>
                    <h2 style={{ margin: 0, color: 'var(--primary)' }}>
                        {mode === 'mcq' ? '새로운 객관식 퀴즈' : mode === 'ox' ? '새로운 OX 퀴즈' : '새로운 주관식 퀴즈'}
                    </h2>
                    {topicId && (
                        <p style={{ margin: '4px 0 0', fontSize: '0.88rem', color: '#64748b' }}>
                            현재 위치: <span style={{ fontWeight: 'bold', color: 'var(--primary)' }}>
                                {topicsList.find(t => t.id === topicId)?.title || topicId}
                            </span> &gt; <span style={{ fontWeight: 'bold', color: '#1e293b' }}>
                                {getSubTopicsForTopic(topicId).find(s => s.id === subId)?.title || subId}
                            </span>
                        </p>
                    )}
                </div>
                <div style={{ width: '80px' }}></div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', width: '100%', maxWidth: '1400px', margin: '0 auto' }}>
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                    <button
                        className="glass-button secondary"
                        style={{ padding: '0.8rem 1.2rem', gap: '8px', background: '#f8fafc' }}
                        onClick={handleDownloadExcel}
                    >
                        <Download size={18} /> 엑셀 데이터 다운받기
                    </button>
                    <button
                        className="glass-button secondary"
                        style={{ padding: '0.8rem 1.2rem', gap: '8px' }}
                        onClick={() => document.getElementById('excel-file-input').click()}
                    >
                        <Upload size={18} /> 엑셀 파일로 올리기
                    </button>
                    <button
                        className="glass-button secondary"
                        style={{ padding: '0.8rem 1.2rem', gap: '8px' }}
                        onClick={() => setPasteAreaOpen(!pasteAreaOpen)}
                    >
                        <ClipboardList size={18} /> 엑셀 데이터 붙여넣기
                    </button>
                    <input
                        type="file"
                        id="excel-file-input"
                        accept=".xlsx, .xls"
                        style={{ display: 'none' }}
                        onChange={handleUploadExcel}
                    />
                </div>

                {pasteAreaOpen && (
                    <div className="glass-panel animate-slide-up" style={{ padding: '2rem', background: '#f0f9ff', border: '2px dashed var(--primary)' }}>
                        <h4 style={{ marginBottom: '10px' }}>엑셀 데이터 붙여넣기</h4>
                        <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '15px' }}>
                            {mode === 'mcq' 
                                ? '엑셀에서 [질문 | 선택지1/2/3/4 | 정답번호] 영역을 복사해서 붙여넣으세요.' 
                                : mode === 'ox'
                                    ? '엑셀에서 [질문 | 정답(O 또는 X)] 영역을 복사해서 붙여넣으세요.'
                                    : '엑셀에서 [질문 | 정답] 영역을 복사해서 붙여넣으세요.'}
                        </p>
                        <textarea
                            className="glass-input"
                            style={{ width: '100%', minHeight: '150px', marginBottom: '15px', padding: '15px', textAlign: 'left', background: 'white' }}
                            placeholder="여기에 복사한 데이터를 붙여넣으세요..."
                            value={pastedText}
                            onChange={(e) => setPastedText(e.target.value)}
                        />
                        <div style={{ display: 'flex', gap: '10px' }}>
                            <button className="glass-button" style={{ flex: 1 }} onClick={handlePasteImport}>가져오기</button>
                            <button className="glass-button secondary" onClick={() => setPasteAreaOpen(false)}>취소</button>
                        </div>
                    </div>
                )}

                {/* Batch Settings Bar for All Questions */}
                {questions.length > 0 && (
                    <div style={{ background: 'linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%)', border: '2px solid var(--primary)', borderRadius: '16px', padding: '16px 20px', marginBottom: '20px', display: 'flex', flexDirection: 'column', gap: '12px', boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px' }}>
                            <h4 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 'bold', color: 'var(--primary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                ⚙️ 모든 문제 일괄 설정 (전체 적용)
                            </h4>
                            <span style={{ fontSize: '0.85rem', color: '#64748b', fontWeight: 'bold' }}>총 {questions.length}개 문제</span>
                        </div>

                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '16px', alignItems: 'center' }}>
                            {/* Batch Media Display Mode */}
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <span style={{ fontSize: '0.88rem', fontWeight: 'bold', color: '#334155' }}>미디어 출력:</span>
                                <button
                                    type="button"
                                    onClick={() => handleBatchMediaDisplayMode('audio')}
                                    className="glass-button"
                                    style={{ padding: '6px 12px', fontSize: '0.82rem', background: 'var(--secondary)', color: 'white', fontWeight: 'bold', border: 'none', cursor: 'pointer' }}
                                >
                                    🎵 전체 '음성/소리만'
                                </button>
                                <button
                                    type="button"
                                    onClick={() => handleBatchMediaDisplayMode('video')}
                                    className="glass-button"
                                    style={{ padding: '6px 12px', fontSize: '0.82rem', background: 'white', border: '1px solid #cbd5e1', color: '#334155', cursor: 'pointer' }}
                                >
                                    🎥 전체 '영상'
                                </button>
                                <button
                                    type="button"
                                    onClick={() => handleBatchMediaDisplayMode('link')}
                                    className="glass-button"
                                    style={{ padding: '6px 12px', fontSize: '0.82rem', background: 'white', border: '1px solid #cbd5e1', color: '#334155', cursor: 'pointer' }}
                                >
                                    🔗 전체 '링크'
                                </button>
                            </div>

                            {/* Batch Playback Mode */}
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <span style={{ fontSize: '0.88rem', fontWeight: 'bold', color: '#334155' }}>재생 방식:</span>
                                <button
                                    type="button"
                                    onClick={() => handleBatchAutoplay(false)}
                                    className="glass-button"
                                    style={{ padding: '6px 12px', fontSize: '0.82rem', background: 'var(--primary)', color: 'white', fontWeight: 'bold', border: 'none', cursor: 'pointer' }}
                                >
                                    🖱️ 전체 '클릭 재생 (일시정지)'
                                </button>
                                <button
                                    type="button"
                                    onClick={() => handleBatchAutoplay(true)}
                                    className="glass-button"
                                    style={{ padding: '6px 12px', fontSize: '0.82rem', background: 'white', border: '1px solid #cbd5e1', color: '#334155', cursor: 'pointer' }}
                                >
                                    ⚡ 전체 '자동 재생'
                                </button>
                            </div>

                            {/* Batch Chosung Mode */}
                            {mode === 'short' && (
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <span style={{ fontSize: '0.88rem', fontWeight: 'bold', color: '#334155' }}>초성 힌트:</span>
                                    <button
                                        type="button"
                                        onClick={() => handleBatchChosung(true)}
                                        className="glass-button"
                                        style={{ padding: '6px 12px', fontSize: '0.82rem', background: '#3b82f6', color: 'white', fontWeight: 'bold', border: 'none', cursor: 'pointer' }}
                                    >
                                        💡 전체 초성 켜기
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => handleBatchChosung(false)}
                                        className="glass-button"
                                        style={{ padding: '6px 12px', fontSize: '0.82rem', background: '#ef4444', color: 'white', fontWeight: 'bold', border: 'none', cursor: 'pointer' }}
                                    >
                                        🚫 전체 초성 끄기
                                    </button>
                                </div>
                            )}
                        </div>

                        {/* Batch OX Custom 2-Choice Mode */}
                        {mode === 'ox' && (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', width: '100%', marginTop: '4px', paddingTop: '10px', borderTop: '1px dashed #cbd5e1' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                                    <span style={{ fontSize: '0.88rem', fontWeight: 'bold', color: '#334155' }}>⚡ 빠른 템플릿:</span>
                                    <button type="button" onClick={() => handleOxPresetSelect('O', 'X')} className="glass-button" style={{ padding: '4px 10px', fontSize: '0.8rem', background: 'white', color: '#1e293b', fontWeight: 'bold', border: '1px solid #cbd5e1', borderRadius: '6px', cursor: 'pointer' }}>O / X</button>
                                    <button type="button" onClick={() => handleOxPresetSelect('Fact', 'Fake')} className="glass-button" style={{ padding: '4px 10px', fontSize: '0.8rem', background: 'white', color: '#1e293b', fontWeight: 'bold', border: '1px solid #cbd5e1', borderRadius: '6px', cursor: 'pointer' }}>Fact / Fake</button>
                                    <button type="button" onClick={() => handleOxPresetSelect('참', '거짓')} className="glass-button" style={{ padding: '4px 10px', fontSize: '0.8rem', background: 'white', color: '#1e293b', fontWeight: 'bold', border: '1px solid #cbd5e1', borderRadius: '6px', cursor: 'pointer' }}>참 / 거짓</button>
                                    <button type="button" onClick={() => handleOxPresetSelect('True', 'False')} className="glass-button" style={{ padding: '4px 10px', fontSize: '0.8rem', background: 'white', color: '#1e293b', fontWeight: 'bold', border: '1px solid #cbd5e1', borderRadius: '6px', cursor: 'pointer' }}>True / False</button>
                                    <button type="button" onClick={() => handleOxPresetSelect('맞는 맞춤법', '틀린 맞춤법')} className="glass-button" style={{ padding: '4px 10px', fontSize: '0.8rem', background: 'white', color: '#1e293b', fontWeight: 'bold', border: '1px solid #cbd5e1', borderRadius: '6px', cursor: 'pointer' }}>맞춤법 선택</button>

                                    {/* 사용자 커스텀 템플릿 목록 */}
                                    {customOxPresets.map((preset, pIdx) => (
                                        <div
                                            key={pIdx}
                                            onClick={() => handleOxPresetSelect(preset.opt0, preset.opt1)}
                                            className="glass-button"
                                            style={{
                                                padding: '4px 8px 4px 10px',
                                                fontSize: '0.8rem',
                                                background: '#e0f2fe',
                                                color: '#0369a1',
                                                fontWeight: 'bold',
                                                border: '1.5px solid #7dd3fc',
                                                borderRadius: '6px',
                                                cursor: 'pointer',
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: '6px'
                                            }}
                                        >
                                            <span>{preset.opt0} / {preset.opt1}</span>
                                            <span
                                                onClick={(e) => handleDeleteCustomOxPreset(e, pIdx)}
                                                style={{ fontSize: '0.75rem', color: '#0284c7', background: '#bae6fd', borderRadius: '50%', width: '16px', height: '16px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}
                                                title="이 템플릿 삭제"
                                            >
                                                ✕
                                            </span>
                                        </div>
                                    ))}

                                    {/* 템플릿 직접 추가 버튼 */}
                                    <button
                                        type="button"
                                        onClick={handleAddCustomOxPreset}
                                        className="glass-button"
                                        style={{ padding: '4px 12px', fontSize: '0.8rem', background: '#22c55e', color: 'white', fontWeight: 'bold', border: 'none', borderRadius: '6px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px', boxShadow: '0 2px 6px rgba(34, 197, 94, 0.3)' }}
                                        title="현재 입력되어 있는 선택지 문구를 빠른 템플릿 목록에 추가합니다"
                                    >
                                        <Plus size={14} /> 템플릿 직접 추가
                                    </button>
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                                    <span style={{ fontSize: '0.88rem', fontWeight: 'bold', color: '#1e293b', whiteSpace: 'nowrap' }}>🔘 2선택지 명칭 일괄 설정:</span>
                                    <input
                                        type="text"
                                        placeholder="선택지 1 (기본: O)"
                                        value={batchOxOption0}
                                        onChange={(e) => setBatchOxOption0(e.target.value)}
                                        className="glass-input"
                                        style={{ width: '130px', padding: '6px 12px', fontSize: '0.88rem', background: 'white', border: '1px solid #94a3b8', borderRadius: '8px' }}
                                    />
                                    <span style={{ fontWeight: 'bold', color: '#64748b' }}>vs</span>
                                    <input
                                        type="text"
                                        placeholder="선택지 2 (기본: X)"
                                        value={batchOxOption1}
                                        onChange={(e) => setBatchOxOption1(e.target.value)}
                                        className="glass-input"
                                        style={{ width: '130px', padding: '6px 12px', fontSize: '0.88rem', background: 'white', border: '1px solid #94a3b8', borderRadius: '8px' }}
                                    />
                                    <button
                                        type="button"
                                        onClick={handleBatchOxLabels}
                                        className="glass-button"
                                        style={{ padding: '6px 14px', fontSize: '0.85rem', background: '#2563eb', color: 'white', fontWeight: 'bold', border: 'none', cursor: 'pointer', borderRadius: '8px', whiteSpace: 'nowrap' }}
                                    >
                                        전체 문제에 선택지 일괄 적용하기
                                    </button>
                                </div>
                            </div>
                        )}

                        {/* Batch Question Text Input */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap', width: '100%', marginTop: '4px', paddingTop: '10px', borderTop: '1px dashed #cbd5e1' }}>
                            <span style={{ fontSize: '0.88rem', fontWeight: 'bold', color: '#1e293b', whiteSpace: 'nowrap' }}>📝 문제 질문(텍스트) 일괄 적용:</span>
                            <input 
                                type="text" 
                                placeholder="예: 노래를 듣고 제목과 가수를 맞히시오 / 다음 음악을 듣고 작곡가를 쓰시오"
                                value={batchQuestionText}
                                onChange={(e) => setBatchQuestionText(e.target.value)}
                                className="glass-input"
                                style={{ flex: 1, minWidth: '260px', padding: '8px 14px', fontSize: '0.9rem', background: 'white', border: '1px solid #94a3b8', borderRadius: '10px' }}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter') {
                                        e.preventDefault();
                                        handleBatchQuestionText();
                                    }
                                }}
                            />
                            <button
                                type="button"
                                onClick={handleBatchQuestionText}
                                className="glass-button"
                                style={{ padding: '8px 18px', fontSize: '0.88rem', background: 'var(--primary)', color: 'white', fontWeight: 'bold', border: 'none', cursor: 'pointer', borderRadius: '10px', whiteSpace: 'nowrap' }}
                            >
                                전체 문제에 적용하기
                            </button>
                        </div>
                    </div>
                )}

                {/* --- BATCH SELECTION & ACTION TOOLBAR --- */}
                <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    flexWrap: 'wrap',
                    gap: '12px',
                    padding: '14px 20px',
                    background: selectedIndices.size > 0 ? '#eff6ff' : '#f8fafc',
                    border: `2px solid ${selectedIndices.size > 0 ? '#3b82f6' : '#cbd5e1'}`,
                    borderRadius: '16px',
                    marginBottom: '24px',
                    transition: 'all 0.2s'
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
                        <button
                            type="button"
                            onClick={handleToggleSelectAll}
                            className="glass-button"
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '6px',
                                padding: '8px 14px',
                                fontSize: '0.88rem',
                                fontWeight: 'bold',
                                background: 'white',
                                color: '#1e293b',
                                border: '1.5px solid #cbd5e1',
                                borderRadius: '10px',
                                cursor: 'pointer'
                            }}
                        >
                            {selectedIndices.size === questions.length ? <CheckSquare size={18} color="#2563eb" /> : <Square size={18} color="#64748b" />}
                            {selectedIndices.size === questions.length ? '전체 해제' : '전체 선택'}
                        </button>

                        <span style={{ fontSize: '0.9rem', fontWeight: 'bold', color: selectedIndices.size > 0 ? '#1d4ed8' : '#64748b' }}>
                            {selectedIndices.size}개 선택됨 / 총 {questions.length}개
                        </span>

                        {selectedIndices.size > 0 && (
                            <button
                                type="button"
                                onClick={handleClearSelection}
                                style={{ fontSize: '0.8rem', color: '#64748b', background: 'none', border: 'none', textDecoration: 'underline', cursor: 'pointer' }}
                            >
                                선택 초기화
                            </button>
                        )}
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                        <button
                            type="button"
                            onClick={() => handleOpenBatchModal('copy')}
                            disabled={selectedIndices.size === 0}
                            className="glass-button"
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '6px',
                                padding: '8px 16px',
                                fontSize: '0.88rem',
                                fontWeight: 'bold',
                                background: selectedIndices.size > 0 ? '#3b82f6' : '#e2e8f0',
                                color: selectedIndices.size > 0 ? 'white' : '#94a3b8',
                                border: 'none',
                                borderRadius: '10px',
                                cursor: selectedIndices.size > 0 ? 'pointer' : 'not-allowed',
                                boxShadow: selectedIndices.size > 0 ? '0 4px 10px rgba(59, 130, 246, 0.3)' : 'none'
                            }}
                        >
                            <Copy size={16} />
                            선택 문제 복사
                        </button>

                        <button
                            type="button"
                            onClick={() => handleOpenBatchModal('move')}
                            disabled={selectedIndices.size === 0}
                            className="glass-button"
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '6px',
                                padding: '8px 16px',
                                fontSize: '0.88rem',
                                fontWeight: 'bold',
                                background: selectedIndices.size > 0 ? '#8b5cf6' : '#e2e8f0',
                                color: selectedIndices.size > 0 ? 'white' : '#94a3b8',
                                border: 'none',
                                borderRadius: '10px',
                                cursor: selectedIndices.size > 0 ? 'pointer' : 'not-allowed',
                                boxShadow: selectedIndices.size > 0 ? '0 4px 10px rgba(139, 92, 246, 0.3)' : 'none'
                            }}
                        >
                            <FolderInput size={16} />
                            선택 문제 이동
                        </button>

                        <button
                            type="button"
                            onClick={handleBatchDeleteSelected}
                            disabled={selectedIndices.size === 0}
                            className="glass-button"
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '6px',
                                padding: '8px 14px',
                                fontSize: '0.88rem',
                                fontWeight: 'bold',
                                background: selectedIndices.size > 0 ? '#ef4444' : '#e2e8f0',
                                color: selectedIndices.size > 0 ? 'white' : '#94a3b8',
                                border: 'none',
                                borderRadius: '10px',
                                cursor: selectedIndices.size > 0 ? 'pointer' : 'not-allowed'
                            }}
                        >
                            <Trash2 size={16} />
                            선택 삭제
                        </button>
                    </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                    {questions.length === 0 ? (
                        <div className="glass-panel" style={{ padding: '3.5rem 2rem', textAlign: 'center', background: 'rgba(255, 255, 255, 0.95)', border: '2px dashed #cbd5e1', borderRadius: '16px' }}>
                            <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🗑️</div>
                            <h3 style={{ fontSize: '1.25rem', color: '#334155', margin: '0 0 0.5rem', fontWeight: 'bold' }}>
                                등록된 문제가 없습니다
                            </h3>
                            <p style={{ fontSize: '0.95rem', color: '#64748b', margin: '0 0 1.5rem', lineHeight: 1.6 }}>
                                모든 문제를 삭제한 상태로 유지하려면 하단의 <strong>[저장하기]</strong> 버튼을 누르세요.<br />
                                새 문제를 만들려면 아래 <strong>[+ 문제 추가하기]</strong> 버튼이나 상단의 <strong>[엑셀 파일로 올리기]</strong>를 사용하세요.
                            </p>
                            <button
                                type="button"
                                className="glass-button secondary"
                                onClick={handleAddQuestion}
                                style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '0.8rem 1.5rem', background: '#f0f9ff', color: 'var(--primary)', borderColor: 'var(--primary)', fontWeight: 'bold' }}
                            >
                                <PlusCircle size={18} /> 새 문제 추가하기
                            </button>
                        </div>
                    ) : (
                        questions.map((q, qIndex) => {
                        const isSelected = selectedIndices.has(qIndex);
                        const isDragOver = dragOverIndex === qIndex;

                        return (
                        <div key={qIndex} 
                            draggable={dragAllowed === qIndex}
                            onDragStart={(e) => handleDragStart(e, qIndex)}
                            onDragOver={(e) => handleDragOver(e, qIndex)}
                            onDragLeave={(e) => handleDragLeave(e, qIndex)}
                            onDrop={(e) => handleDrop(e, qIndex)}
                            onDragEnd={handleDragEnd}
                            className="glass-panel" 
                            style={{ 
                                padding: '24px', 
                                position: 'relative', 
                                border: isDragOver ? '3px dashed var(--primary)' : isSelected ? '3px solid #3b82f6' : '1px solid rgba(255, 255, 255, 0.8)',
                                background: isSelected ? 'linear-gradient(135deg, #f0f7ff 0%, #e0f2fe 100%)' : 'rgba(255, 255, 255, 0.95)',
                                transition: 'all 0.2s ease',
                                opacity: draggedIndex === qIndex ? 0.4 : 1,
                                transform: isDragOver ? 'scale(1.01)' : 'none'
                            }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                    <div 
                                        onMouseDown={() => setDragAllowed(qIndex)}
                                        onMouseUp={() => setDragAllowed(null)}
                                        style={{ cursor: 'grab', display: 'flex', alignItems: 'center', padding: '4px', color: '#94a3b8', borderRadius: '4px', background: '#f1f5f9' }}
                                        title="드래그하여 순서 변경"
                                    >
                                        <GripVertical size={20} />
                                    </div>
                                    <input
                                        type="checkbox"
                                        checked={isSelected}
                                        onChange={() => toggleSelectQuestion(qIndex)}
                                        style={{ width: '20px', height: '20px', cursor: 'pointer', accentColor: '#2563eb' }}
                                    />
                                    <span style={{ fontSize: '1.2rem', fontWeight: 'bold', color: 'var(--primary)' }}>문제 {qIndex + 1}</span>
                                </div>
                                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                                    <button
                                        type="button"
                                        onClick={() => handleOpenSingleModal(qIndex, 'copy')}
                                        title="이 문제를 다른 주제/유형으로 복사"
                                        style={{ display: 'flex', alignItems: 'center', gap: '4px', padding: '6px 12px', fontSize: '0.82rem', background: '#f1f5f9', color: '#334155', border: '1px solid #cbd5e1', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold' }}
                                    >
                                        <Copy size={14} /> 복사
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => handleOpenSingleModal(qIndex, 'move')}
                                        title="이 문제를 다른 주제/유형으로 이동"
                                        style={{ display: 'flex', alignItems: 'center', gap: '4px', padding: '6px 12px', fontSize: '0.82rem', background: '#f1f5f9', color: '#334155', border: '1px solid #cbd5e1', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold' }}
                                    >
                                        <FolderInput size={14} /> 이동
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => handleRemoveQuestion(qIndex)}
                                        style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', padding: '4px' }}
                                        title="삭제"
                                    >
                                        <Trash2 size={20} />
                                    </button>
                                </div>
                            </div>

                            <div style={{ marginBottom: '16px' }}>
                                <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold', color: 'var(--text)' }}>
                                    문제 질문 (필수)
                                </label>
                                <input
                                    type="text"
                                    value={q.text}
                                    onChange={(e) => handleQuestionTextChange(qIndex, e.target.value)}
                                    placeholder="문제를 입력하세요"
                                    className="glass-input"
                                    style={{ width: '100%', padding: '12px', fontSize: '1.1rem', fontWeight: '500' }}
                                />
                                {q._convertNote && (
                                    <div style={{ fontSize: '0.82rem', color: '#2563eb', marginTop: '4px', fontWeight: 'bold' }}>
                                        ℹ️ {q._convertNote}
                                    </div>
                                )}
                            </div>

                            {/* Media File Upload / Attach Section */}
                            <div style={{ marginBottom: '20px', background: '#f8fafc', padding: '14px', borderRadius: '12px', border: '1px border #e2e8f0' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                                    <label style={{ fontWeight: 'bold', color: '#334155', fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                        <FileUp size={16} /> 미디어 첨부 (음악 / 동영상 / 이미지 선택)
                                    </label>
                                    {q.mediaUrl && (
                                        <button
                                            type="button"
                                            onClick={() => handleClearMedia(qIndex)}
                                            style={{ fontSize: '0.8rem', color: '#ef4444', background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px', textDecoration: 'underline' }}
                                        >
                                            <XCircle size={14} /> 미디어 삭제
                                        </button>
                                    )}
                                </div>

                                {/* File Upload Input or Direct URL */}
                                <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
                                    <input
                                        type="file"
                                        accept="audio/*,video/*,image/*"
                                        onChange={(e) => handleMediaFileUpload(qIndex, e.target.files[0])}
                                        style={{ display: 'none' }}
                                        id={`file-upload-${qIndex}`}
                                    />
                                    <label
                                        htmlFor={`file-upload-${qIndex}`}
                                        className="glass-button"
                                        style={{
                                            padding: '8px 14px',
                                            fontSize: '0.85rem',
                                            background: 'white',
                                            border: '1.5px solid #cbd5e1',
                                            borderRadius: '8px',
                                            cursor: 'pointer',
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '6px',
                                            fontWeight: 'bold',
                                            color: '#334155'
                                        }}
                                    >
                                        📂 컴퓨터 파일 선택
                                    </label>

                                    <span style={{ fontSize: '0.8rem', color: '#94a3b8' }}>또는</span>

                                    <input
                                        type="text"
                                        placeholder="외부 미디어 URL 직입력 (https://...)"
                                        value={q.mediaUrl || ''}
                                        onChange={(e) => {
                                            const url = e.target.value;
                                            const nq = [...questions];
                                            nq[qIndex].mediaUrl = url;
                                            if (url.match(/\.(mp4|webm|mov)$/i)) nq[qIndex].mediaType = 'video';
                                            else if (url.match(/\.(mp3|wav|ogg|m4a)$/i)) nq[qIndex].mediaType = 'audio';
                                            else if (url.match(/\.(jpg|jpeg|png|gif|webp)$/i)) nq[qIndex].mediaType = 'image';
                                            setQuestions(nq);
                                        }}
                                        className="glass-input"
                                        style={{ flex: 1, minWidth: '200px', padding: '8px 12px', fontSize: '0.85rem' }}
                                    />
                                </div>

                                {/* Media Settings (Display Mode & Autoplay) */}
                                {q.mediaUrl && (
                                    <div style={{ marginTop: '12px', paddingTop: '10px', borderTop: '1px dashed #cbd5e1', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px' }}>
                                            {/* Display Mode Choice */}
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                <span style={{ fontSize: '0.85rem', fontWeight: 'bold', color: '#475569' }}>화면 출력:</span>
                                                <button
                                                    type="button"
                                                    onClick={() => handleMediaDisplayModeChange(qIndex, 'audio')}
                                                    style={{
                                                        padding: '4px 10px',
                                                        fontSize: '0.8rem',
                                                        borderRadius: '6px',
                                                        border: '1px solid #cbd5e1',
                                                        background: q.mediaDisplayMode === 'audio' || !q.mediaDisplayMode ? 'var(--secondary)' : 'white',
                                                        color: q.mediaDisplayMode === 'audio' || !q.mediaDisplayMode ? 'white' : '#475569',
                                                        fontWeight: 'bold',
                                                        cursor: 'pointer'
                                                    }}
                                                >
                                                    🎵 소리/음악만 (플레이어)
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => handleMediaDisplayModeChange(qIndex, 'video')}
                                                    style={{
                                                        padding: '4px 10px',
                                                        fontSize: '0.8rem',
                                                        borderRadius: '6px',
                                                        border: '1px solid #cbd5e1',
                                                        background: q.mediaDisplayMode === 'video' ? 'var(--primary)' : 'white',
                                                        color: q.mediaDisplayMode === 'video' ? 'white' : '#475569',
                                                        fontWeight: 'bold',
                                                        cursor: 'pointer'
                                                    }}
                                                >
                                                    🎥 영상/비디오
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => handleMediaDisplayModeChange(qIndex, 'link')}
                                                    style={{
                                                        padding: '4px 10px',
                                                        fontSize: '0.8rem',
                                                        borderRadius: '6px',
                                                        border: '1px solid #cbd5e1',
                                                        background: q.mediaDisplayMode === 'link' ? '#64748b' : 'white',
                                                        color: q.mediaDisplayMode === 'link' ? 'white' : '#475569',
                                                        fontWeight: 'bold',
                                                        cursor: 'pointer'
                                                    }}
                                                >
                                                    🔗 파일 링크만
                                                </button>
                                            </div>

                                            {/* Autoplay Checkbox */}
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                                <input
                                                    type="checkbox"
                                                    id={`autoplay-${qIndex}`}
                                                    checked={q.autoplay || false}
                                                    onChange={(e) => handleAutoplayChange(qIndex, e.target.checked)}
                                                    style={{ cursor: 'pointer' }}
                                                />
                                                <label htmlFor={`autoplay-${qIndex}`} style={{ fontSize: '0.85rem', fontWeight: 'bold', color: '#334155', cursor: 'pointer' }}>
                                                    ⚡ 문제 등장 시 자동 재생
                                                </label>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {/* Live Media Preview Component (문제 만들기 화면에서는 일시정지 상태로 기본 대기) */}
                                {q.mediaUrl && (
                                    <div style={{ marginTop: '8px' }}>
                                        <MediaViewer mediaUrl={q.mediaUrl} mediaType={q.mediaType} mediaName={q.mediaName} displayMode={q.mediaDisplayMode || 'audio'} autoplay={false} />
                                    </div>
                                )}

                                {/* Option for Initial Consonant (초성) Hint toggle (especially for short-answer) */}
                                {mode === 'short' && (
                                    <div style={{ marginTop: '10px', display: 'flex', alignItems: 'center', gap: '8px', background: '#fef3c7', padding: '10px 14px', borderRadius: '10px', border: '1px solid #fde68a' }}>
                                        <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '0.9rem', fontWeight: 'bold', color: '#92400e', userSelect: 'none' }}>
                                            <input
                                                type="checkbox"
                                                checked={q.showChosung !== false}
                                                onChange={(e) => handleChosungToggle(qIndex, e.target.checked)}
                                                style={{ width: '18px', height: '18px', cursor: 'pointer', accentColor: '#f59e0b' }}
                                            />
                                            <span>💡 초성 힌트 (예: 💡 초성 힌트: ㅅㅇ) 제공하기</span>
                                        </label>
                                    </div>
                                )}
                            </div>

                            {mode === 'ox' ? (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                    <div style={{ fontSize: '0.88rem', fontWeight: 'bold', color: '#475569', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <span>✏️ 2선택지 문구 수정 및 정답 선택 (클릭하여 정답 지정)</span>
                                        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                                            <button type="button" onClick={() => { handleOxOptionChange(qIndex, 0, 'O'); handleOxOptionChange(qIndex, 1, 'X'); }} style={{ padding: '2px 8px', fontSize: '0.75rem', background: '#e2e8f0', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>O/X</button>
                                            <button type="button" onClick={() => { handleOxOptionChange(qIndex, 0, 'Fact'); handleOxOptionChange(qIndex, 1, 'Fake'); }} style={{ padding: '2px 8px', fontSize: '0.75rem', background: '#e2e8f0', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>Fact/Fake</button>
                                            <button type="button" onClick={() => { handleOxOptionChange(qIndex, 0, '참'); handleOxOptionChange(qIndex, 1, '거짓'); }} style={{ padding: '2px 8px', fontSize: '0.75rem', background: '#e2e8f0', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>참/거짓</button>
                                            {customOxPresets.map((preset, idx) => (
                                                <button key={idx} type="button" onClick={() => { handleOxOptionChange(qIndex, 0, preset.opt0); handleOxOptionChange(qIndex, 1, preset.opt1); }} style={{ padding: '2px 8px', fontSize: '0.75rem', background: '#e0f2fe', color: '#0369a1', border: '1px solid #7dd3fc', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}>{preset.opt0}/{preset.opt1}</button>
                                            ))}
                                        </div>
                                    </div>
                                    <div style={{ display: 'flex', gap: '16px', justifyContent: 'center' }}>
                                        {[0, 1].map((oIndex) => {
                                            const optText = (q.options && q.options[oIndex] !== undefined) ? q.options[oIndex] : (oIndex === 0 ? 'O' : 'X');
                                            const isCorrect = (q.correctIndex === oIndex);
                                            return (
                                                <div
                                                    key={oIndex}
                                                    style={{
                                                        flex: 1,
                                                        padding: '14px 16px',
                                                        borderRadius: '16px',
                                                        border: `3px solid ${isCorrect ? 'var(--primary)' : '#cbd5e1'}`,
                                                        background: isCorrect ? '#e0f2fe' : '#f8fafc',
                                                        display: 'flex',
                                                        flexDirection: 'column',
                                                        gap: '10px',
                                                        transition: 'all 0.2s'
                                                    }}
                                                >
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                        <button
                                                            type="button"
                                                            onClick={() => handleOxSetCorrect(qIndex, oIndex)}
                                                            style={{
                                                                display: 'flex',
                                                                alignItems: 'center',
                                                                gap: '6px',
                                                                padding: '6px 12px',
                                                                fontSize: '0.85rem',
                                                                fontWeight: 'bold',
                                                                borderRadius: '8px',
                                                                border: 'none',
                                                                background: isCorrect ? 'var(--primary)' : '#94a3b8',
                                                                color: 'white',
                                                                cursor: 'pointer'
                                                            }}
                                                        >
                                                            {isCorrect ? <CheckCircle size={18} /> : <Circle size={18} />}
                                                            {isCorrect ? '정답 선택됨' : '정답으로 지정'}
                                                        </button>
                                                        <span style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: 'bold' }}>
                                                            선택지 {oIndex + 1}
                                                        </span>
                                                    </div>
                                                    <input
                                                        type="text"
                                                        value={optText}
                                                        placeholder={oIndex === 0 ? '선택지 1 (예: O, Fact, 맞는 맞춤법)' : '선택지 2 (예: X, Fake, 틀린 맞춤법)'}
                                                        onChange={(e) => handleOxOptionChange(qIndex, oIndex, e.target.value)}
                                                        style={{
                                                            padding: '10px 14px',
                                                            fontSize: '1.1rem',
                                                            fontWeight: 'bold',
                                                            borderRadius: '10px',
                                                            border: '1px solid #cbd5e1',
                                                            background: 'white',
                                                            color: isCorrect ? '#0369a1' : '#1e293b'
                                                        }}
                                                    />
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            ) : mode === 'mcq' ? (
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                                {[0, 1, 2, 3].map((oIndex) => (
                                    <div key={oIndex} style={{ display: 'flex', alignItems: 'center', gap: '8px', background: q.correctIndex === oIndex ? '#e0f2fe' : '#f8fafc', padding: '12px', borderRadius: '12px', border: `2px solid ${q.correctIndex === oIndex ? 'var(--primary)' : '#e2e8f0'}` }}>
                                        <button
                                            onClick={() => {
                                                const nq = [...questions];
                                                nq[qIndex].correctIndex = oIndex;
                                                setQuestions(nq);
                                            }}
                                            style={{ background: 'none', border: 'none', cursor: 'pointer', color: q.correctIndex === oIndex ? 'var(--primary)' : 'var(--text-muted)' }}
                                        >
                                            {q.correctIndex === oIndex ? <CheckCircle size={24} /> : <Circle size={24} />}
                                        </button>
                                        <input
                                            type="text"
                                            style={{ border: 'none', background: 'transparent', width: '100%', outline: 'none', fontSize: '1rem', color: 'var(--text)' }}
                                            placeholder={`선택지 ${oIndex + 1}`}
                                            value={q.options[oIndex]}
                                            onChange={(e) => handleOptionChange(qIndex, oIndex, e.target.value)}
                                        />
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                <div style={{ background: '#f0fdf4', padding: '16px', borderRadius: '16px', border: '2px solid var(--ans-green)', flex: 1, display: 'flex', gap: '12px', alignItems: 'center' }}>
                                    <CheckCircle size={24} color="var(--ans-green)" />
                                    <input
                                        type="text"
                                        style={{ border: 'none', background: 'transparent', width: '100%', outline: 'none', fontSize: '1.2rem', fontWeight: 'bold' }}
                                        placeholder="정답을 입력하세요"
                                        value={q.answer}
                                        onChange={(e) => handleAnswerChange(qIndex, e.target.value)}
                                    />
                                </div>
                            </div>
                        )}
                        <div style={{ marginTop: '15px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                            <label style={{ fontSize: '0.85rem', fontWeight: 'bold', color: 'var(--text-muted)', textAlign: 'left' }}>정답인 이유 (선택사항)</label>
                            <textarea
                                className="glass-input"
                                style={{ width: '100%', minHeight: '60px', padding: '10px', fontSize: '0.9rem', textAlign: 'left', background: '#f8fafc' }}
                                placeholder="정답인 이유나 해설을 입력하세요"
                                value={q.explanation || ''}
                                onChange={(e) => {
                                    const nq = [...questions];
                                    nq[qIndex].explanation = e.target.value;
                                    setQuestions(nq);
                                }}
                            />
                        </div>
                        <p style={{ marginTop: '12px', fontSize: '0.9rem', color: 'var(--text-muted)', textAlign: 'left', marginBottom: 0 }}>
                            {mode === 'mcq' ? '☝️ 정답 좌측의 체크 원을 눌러 진짜 정답을 지정하세요.' : mode === 'ox' ? '☝️ O 또는 X 버튼을 눌러 올바른 정답을 선택하세요.' : '☝️ 이 칸에 정확한 정답 텍스트를 입력하세요.'}
                        </p>
                    </div>
                );
            }))}
        </div>

            <button
                className="glass-button secondary"
                onClick={handleAddQuestion}
                style={{ alignSelf: 'center', padding: '1rem 2rem' }}
            >
                <PlusCircle size={20} /> 문제 추가하기
            </button>

            <button
                className="glass-button"
                onClick={handleCreateRoom}
                style={{ padding: '1.5rem', fontSize: '1.4rem', marginTop: '2rem', width: '100%', maxWidth: '1400px', margin: '2rem auto 0' }}
            >
                <MonitorPlay size={24} /> {topicId ? '저장하기' : '이 퀴즈로 방 만들기!'}
            </button>

            {/* --- MOVE / COPY MODAL DIALOG --- */}
            {showMoveCopyModal && (
                <div style={{
                    position: 'fixed',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    background: 'rgba(0, 0, 0, 0.55)',
                    backdropFilter: 'blur(5px)',
                    zIndex: 9999,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: '20px'
                }}>
                    <div style={{
                        background: 'white',
                        borderRadius: '24px',
                        width: '100%',
                        maxWidth: '640px',
                        maxHeight: '90vh',
                        display: 'flex',
                        flexDirection: 'column',
                        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.3)',
                        overflow: 'hidden',
                        border: '1px solid rgba(255, 255, 255, 0.2)'
                    }}>
                        {/* Modal Header */}
                        <div style={{
                            padding: '20px 24px',
                            borderBottom: '1px solid #e2e8f0',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            background: modalActionType === 'copy' ? 'linear-gradient(135deg, #ecfdf5, #f0fdf4)' : 'linear-gradient(135deg, #eff6ff, #f0f9ff)'
                        }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                <div style={{
                                    width: '42px',
                                    height: '42px',
                                    borderRadius: '12px',
                                    background: modalActionType === 'copy' ? '#10b981' : 'var(--primary)',
                                    color: 'white',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center'
                                }}>
                                    {modalActionType === 'copy' ? <Copy size={22} /> : <FolderInput size={22} />}
                                </div>
                                <div>
                                    <h3 style={{ margin: 0, fontSize: '1.25rem', color: '#1e293b' }}>
                                        {modalActionType === 'copy' ? '문제 복사' : '문제 이동'}
                                        <span style={{ fontSize: '0.92rem', fontWeight: 'bold', color: modalActionType === 'copy' ? '#059669' : '#2563eb', marginLeft: '8px', background: 'white', padding: '2px 8px', borderRadius: '8px', border: '1px solid #cbd5e1' }}>
                                            {targetIndicesForModal.length}개 선택됨
                                        </span>
                                    </h3>
                                    <p style={{ margin: '4px 0 0', fontSize: '0.84rem', color: '#64748b' }}>
                                        {modalActionType === 'copy' 
                                            ? '선택한 문제를 대상 폴더에 복사하며 현재 문제는 그대로 유지됩니다.' 
                                            : '선택한 문제를 대상 폴더로 옮기며 현재 폴더에서는 삭제됩니다.'}
                                    </p>
                                </div>
                            </div>
                            <button
                                onClick={() => setShowMoveCopyModal(false)}
                                style={{
                                    background: 'none',
                                    border: 'none',
                                    fontSize: '1.5rem',
                                    cursor: 'pointer',
                                    color: '#94a3b8',
                                    padding: '4px',
                                    lineHeight: 1
                                }}
                            >
                                ✕
                            </button>
                        </div>

                        {/* Modal Body */}
                        <div style={{ padding: '24px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '20px' }}>
                            {/* Destination Topic */}
                            <div>
                                <label style={{ display: 'block', fontSize: '0.92rem', fontWeight: 'bold', color: '#1e293b', marginBottom: '8px' }}>
                                    1. 대상 대주제 (카테고리) 선택
                                </label>
                                <select
                                    value={targetTopicId}
                                    onChange={(e) => {
                                        setTargetTopicId(e.target.value);
                                        setTargetSubId('sub-1');
                                    }}
                                    style={{
                                        width: '100%',
                                        padding: '12px 16px',
                                        borderRadius: '12px',
                                        border: '1.5px solid #cbd5e1',
                                        fontSize: '0.98rem',
                                        fontWeight: '600',
                                        color: '#1e293b',
                                        background: '#f8fafc',
                                        outline: 'none',
                                        cursor: 'pointer'
                                    }}
                                >
                                    {topicsList.map(t => (
                                        <option key={t.id} value={t.id}>
                                            {t.title} {t.id === topicId ? '(현재 대주제)' : ''}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            {/* Destination Sub-topic */}
                            <div>
                                <label style={{ display: 'block', fontSize: '0.92rem', fontWeight: 'bold', color: '#1e293b', marginBottom: '8px' }}>
                                    2. 대상 세부 폴더 (1~24번) 선택
                                </label>
                                <select
                                    value={targetSubId}
                                    onChange={(e) => setTargetSubId(e.target.value)}
                                    style={{
                                        width: '100%',
                                        padding: '12px 16px',
                                        borderRadius: '12px',
                                        border: targetTopicId === topicId && targetSubId === subId ? '2px solid #f43f5e' : '1.5px solid #cbd5e1',
                                        fontSize: '0.98rem',
                                        fontWeight: '600',
                                        color: '#1e293b',
                                        background: '#f8fafc',
                                        outline: 'none',
                                        cursor: 'pointer'
                                    }}
                                >
                                    {getSubTopicsForTopic(targetTopicId).map((s, idx) => (
                                        <option key={s.id} value={s.id}>
                                            [{idx + 1}번] {s.title} {targetTopicId === topicId && s.id === subId ? '⚠️ (현재 폴더)' : ''}
                                        </option>
                                    ))}
                                </select>
                                {targetTopicId === topicId && targetSubId === subId && (
                                    <p style={{ margin: '6px 0 0', fontSize: '0.84rem', color: '#e11d48', fontWeight: 'bold' }}>
                                        {modalActionType === 'move' 
                                            ? '⚠️ 현재 열려있는 폴더와 동일합니다. 다른 폴더를 선택해주세요.' 
                                            : 'ℹ️ 현재 폴더와 동일합니다. 복사 시 같은 폴더에 문제가 추가됩니다.'}
                                    </p>
                                )}
                            </div>

                            {/* Destination Quiz Mode */}
                            <div>
                                <label style={{ display: 'block', fontSize: '0.92rem', fontWeight: 'bold', color: '#1e293b', marginBottom: '8px' }}>
                                    3. 저장할 문제 유형 (퀴즈 모드)
                                </label>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px' }}>
                                    {[
                                        { key: 'mcq', label: '객관식 (4지선다)' },
                                        { key: 'short', label: '주관식 (단답형)' },
                                        { key: 'ox', label: 'OX 퀴즈' }
                                    ].map(m => (
                                        <button
                                            key={m.key}
                                            type="button"
                                            onClick={() => setTargetQuizMode(m.key)}
                                            style={{
                                                padding: '10px',
                                                borderRadius: '10px',
                                                border: targetQuizMode === m.key ? '2px solid var(--primary)' : '1.5px solid #cbd5e1',
                                                background: targetQuizMode === m.key ? '#eff6ff' : 'white',
                                                color: targetQuizMode === m.key ? 'var(--primary)' : '#475569',
                                                fontWeight: 'bold',
                                                fontSize: '0.88rem',
                                                cursor: 'pointer',
                                                transition: 'all 0.15s ease'
                                            }}
                                        >
                                            {m.label}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Conversion info banner */}
                            {targetQuizMode !== mode && (
                                <div style={{
                                    background: 'linear-gradient(135deg, #fef9c3, #fefce8)',
                                    border: '1.5px solid #fbbf24',
                                    borderRadius: '12px',
                                    padding: '12px 16px',
                                    fontSize: '0.87rem',
                                    color: '#92400e',
                                    fontWeight: '600',
                                    display: 'flex',
                                    alignItems: 'flex-start',
                                    gap: '8px'
                                }}>
                                    <span style={{ fontSize: '1.1rem' }}>🔄</span>
                                    <div>
                                        <div style={{ marginBottom: '4px' }}>
                                            <strong>유형 변환됩니다:</strong>{' '}
                                            {{ mcq: '객관식', short: '주관식', ox: 'OX 퀴즈' }[mode]} → {{ mcq: '객관식', short: '주관식', ox: 'OX 퀴즈' }[targetQuizMode]}
                                        </div>
                                        <div style={{ fontWeight: 'normal', color: '#78350f', lineHeight: 1.5 }}>
                                            {mode === 'mcq' && targetQuizMode === 'short' && '✔ 정답 선택지 텍스트가 주관식 정답으로 자동 입력됩니다.'}
                                            {mode === 'mcq' && targetQuizMode === 'ox' && '✔ 정답 인덱스 기반으로 O/X가 자동 설정됩니다. 저장 후 확인해주세요.'}
                                            {mode === 'short' && targetQuizMode === 'mcq' && '✔ 정답이 1번 선택지에 입력됩니다. 나머지 선택지(2~4번)를 채워주세요.'}
                                            {mode === 'short' && targetQuizMode === 'ox' && '✔ 정답이 O/X면 그대로, 그 외에는 O로 설정됩니다. 확인 후 편집하세요.'}
                                            {mode === 'ox' && targetQuizMode === 'mcq' && '✔ O/X가 1·2번 선택지에 입력됩니다. 3·4번 선택지를 채워주세요.'}
                                            {mode === 'ox' && targetQuizMode === 'short' && '✔ O 또는 X가 주관식 정답으로 자동 입력됩니다.'}
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Preview of items to transfer */}
                            <div>
                                <label style={{ display: 'block', fontSize: '0.88rem', fontWeight: 'bold', color: '#64748b', marginBottom: '6px' }}>
                                    {targetQuizMode !== mode ? '변환 후 미리보기' : '선택된 문제 미리보기'} ({targetIndicesForModal.length}개)
                                </label>
                                <div style={{
                                    maxHeight: '180px',
                                    overflowY: 'auto',
                                    background: '#f8fafc',
                                    border: '1px solid #e2e8f0',
                                    borderRadius: '12px',
                                    padding: '10px 14px',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    gap: '8px'
                                }}>
                                    {targetIndicesForModal.map(idx => {
                                        const q = questions[idx];
                                        if (!q) return null;
                                        const adapted = targetQuizMode !== mode ? adaptQuestion(q, mode, targetQuizMode) : q;
                                        const modeLabel = { mcq: '객관식', short: '주관식', ox: 'OX' }[targetQuizMode];
                                        return (
                                            <div key={idx} style={{ fontSize: '0.85rem', color: '#334155', borderBottom: '1px solid #e2e8f0', paddingBottom: '6px' }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '3px' }}>
                                                    <span style={{ fontWeight: 'bold', color: 'var(--primary)', minWidth: '45px' }}>#{idx + 1}번:</span>
                                                    <span style={{ flex: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', fontWeight: '600' }}>
                                                        {q.text || '(질문 내용 없음)'}
                                                    </span>
                                                    {q.mediaUrl && (
                                                        <span style={{ fontSize: '0.75rem', background: '#e0f2fe', color: '#0284c7', padding: '2px 6px', borderRadius: '4px', fontWeight: 'bold', whiteSpace: 'nowrap' }}>미디어</span>
                                                    )}
                                                </div>
                                                {/* 변환 결과 표시 */}
                                                {targetQuizMode === 'mcq' && (
                                                    <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', paddingLeft: '53px' }}>
                                                        {(adapted.options || ['','','','']).map((opt, i) => (
                                                            <span key={i} style={{
                                                                fontSize: '0.78rem',
                                                                padding: '2px 8px',
                                                                borderRadius: '6px',
                                                                border: i === (adapted.correctIndex ?? 0) ? '1.5px solid #10b981' : '1px solid #cbd5e1',
                                                                background: i === (adapted.correctIndex ?? 0) ? '#ecfdf5' : '#f1f5f9',
                                                                color: i === (adapted.correctIndex ?? 0) ? '#059669' : '#64748b',
                                                                fontWeight: i === (adapted.correctIndex ?? 0) ? 'bold' : 'normal'
                                                            }}>
                                                                {i + 1}. {opt || <em style={{ opacity: 0.5 }}>빈칸</em>}
                                                            </span>
                                                        ))}
                                                    </div>
                                                )}
                                                {targetQuizMode === 'ox' && (
                                                    <div style={{ paddingLeft: '53px', display: 'flex', gap: '6px' }}>
                                                        {(adapted.options && adapted.options.length === 2 ? adapted.options : ['O', 'X']).map((v, i) => (
                                                            <span key={i} style={{
                                                                fontSize: '0.82rem',
                                                                padding: '2px 12px',
                                                                borderRadius: '6px',
                                                                border: (adapted.correctIndex ?? 0) === i ? '2px solid #10b981' : '1px solid #cbd5e1',
                                                                background: (adapted.correctIndex ?? 0) === i ? '#ecfdf5' : '#f1f5f9',
                                                                color: (adapted.correctIndex ?? 0) === i ? '#059669' : '#94a3b8',
                                                                fontWeight: 'bold'
                                                            }}>{v}</span>
                                                        ))}
                                                        <span style={{ fontSize: '0.78rem', color: '#64748b' }}>← 정답: {adapted.answer || 'O'}</span>
                                                    </div>
                                                )}
                                                {targetQuizMode === 'short' && (
                                                    <div style={{ paddingLeft: '53px', fontSize: '0.82rem', color: '#059669', fontWeight: 'bold' }}>
                                                        정답: {adapted.answer || <em style={{ color: '#94a3b8', fontWeight: 'normal' }}>빈칸</em>}
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        </div>

                        {/* Modal Footer */}
                        <div style={{
                            padding: '16px 24px',
                            borderTop: '1px solid #e2e8f0',
                            display: 'flex',
                            justifyContent: 'flex-end',
                            gap: '12px',
                            background: '#f8fafc'
                        }}>
                            <button
                                type="button"
                                onClick={() => setShowMoveCopyModal(false)}
                                className="glass-button"
                                style={{
                                    padding: '10px 20px',
                                    fontSize: '0.95rem',
                                    fontWeight: 'bold',
                                    background: 'white',
                                    border: '1px solid #cbd5e1',
                                    color: '#64748b',
                                    borderRadius: '10px',
                                    cursor: 'pointer'
                                }}
                            >
                                취소
                            </button>
                            <button
                                type="button"
                                onClick={handleConfirmMoveCopy}
                                disabled={isTransferring || (modalActionType === 'move' && targetTopicId === topicId && targetSubId === subId)}
                                className="glass-button"
                                style={{
                                    padding: '10px 24px',
                                    fontSize: '0.95rem',
                                    fontWeight: 'bold',
                                    background: modalActionType === 'copy' ? '#10b981' : 'var(--primary)',
                                    color: 'white',
                                    border: 'none',
                                    borderRadius: '10px',
                                    cursor: isTransferring || (modalActionType === 'move' && targetTopicId === topicId && targetSubId === subId) ? 'not-allowed' : 'pointer',
                                    opacity: isTransferring || (modalActionType === 'move' && targetTopicId === topicId && targetSubId === subId) ? 0.6 : 1,
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '6px',
                                    boxShadow: '0 2px 10px rgba(0,0,0,0.1)'
                                }}
                            >
                                {isTransferring ? (
                                    '처리 중...'
                                ) : modalActionType === 'copy' ? (
                                    <>
                                        <Copy size={18} /> {targetIndicesForModal.length}개 문제 복사 완료
                                    </>
                                ) : (
                                    <>
                                        <FolderInput size={18} /> {targetIndicesForModal.length}개 문제 이동 완료
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* --- TRANSFER SUCCESS / NAVIGATE CONFIRMATION MODAL --- */}
            {transferSuccessInfo && (
                <div style={{
                    position: 'fixed',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    background: 'rgba(0, 0, 0, 0.6)',
                    backdropFilter: 'blur(6px)',
                    zIndex: 10000,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: '20px'
                }}>
                    <div style={{
                        background: 'white',
                        borderRadius: '24px',
                        width: '100%',
                        maxWidth: '520px',
                        padding: '30px',
                        textAlign: 'center',
                        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.35)',
                        border: '1px solid #e2e8f0',
                        animation: 'fadeIn 0.2s ease-out'
                    }}>
                        <div style={{
                            width: '68px',
                            height: '68px',
                            borderRadius: '50%',
                            background: transferSuccessInfo.actionType === 'move' ? '#eff6ff' : '#ecfdf5',
                            color: transferSuccessInfo.actionType === 'move' ? 'var(--primary)' : '#10b981',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            margin: '0 auto 16px',
                            fontSize: '2.2rem'
                        }}>
                            {transferSuccessInfo.actionType === 'move' ? '📦' : '📋'}
                        </div>

                        <h3 style={{ fontSize: '1.35rem', fontWeight: 'bold', color: '#1e293b', margin: '0 0 10px' }}>
                            {transferSuccessInfo.count}개의 문제가 {transferSuccessInfo.actionType === 'move' ? '이동' : '복사'}되었습니다!
                        </h3>

                        <div style={{
                            background: '#f8fafc',
                            borderRadius: '14px',
                            border: '1px solid #e2e8f0',
                            padding: '14px 18px',
                            margin: '16px 0 20px',
                            textAlign: 'left'
                        }}>
                            <div style={{ fontSize: '0.84rem', color: '#64748b', marginBottom: '4px' }}>저장 위치</div>
                            <div style={{ fontSize: '1.02rem', fontWeight: 'bold', color: '#1e293b' }}>
                                {transferSuccessInfo.topicTitle} &gt; {transferSuccessInfo.subTitle}
                            </div>
                            <div style={{ fontSize: '0.88rem', color: 'var(--primary)', fontWeight: 'bold', marginTop: '4px' }}>
                                문제 유형: {transferSuccessInfo.modeName}
                            </div>
                        </div>

                        <p style={{ fontSize: '1.05rem', fontWeight: 'bold', color: '#0f172a', margin: '0 0 6px' }}>
                            {transferSuccessInfo.actionType === 'move' ? '이동한' : '복사한'} 폴더로 바로 이동하시겠습니까?
                        </p>
                        <p style={{ fontSize: '0.86rem', color: '#64748b', margin: '0 0 24px', lineHeight: 1.5 }}>
                            '예'를 누르면 해당 폴더의 문제 만들기 화면으로 즉시 이동하여 방금 {transferSuccessInfo.actionType === 'move' ? '이동된' : '복사된'} 문제들을 바로 확인할 수 있습니다.
                        </p>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                            <button
                                type="button"
                                onClick={() => handleNavigateToTarget(transferSuccessInfo)}
                                className="glass-button"
                                style={{
                                    width: '100%',
                                    padding: '14px',
                                    fontSize: '1rem',
                                    fontWeight: 'bold',
                                    background: 'var(--primary)',
                                    color: 'white',
                                    borderRadius: '12px',
                                    cursor: 'pointer',
                                    border: 'none',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    gap: '8px',
                                    boxShadow: '0 4px 12px rgba(59, 130, 246, 0.3)'
                                }}
                            >
                                👉 예, 해당 폴더로 이동하여 확인하기
                            </button>

                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                                <button
                                    type="button"
                                    onClick={() => handleNavigateToQuizRoom(transferSuccessInfo)}
                                    className="glass-button"
                                    style={{
                                        padding: '11px',
                                        fontSize: '0.88rem',
                                        fontWeight: 'bold',
                                        background: '#f1f5f9',
                                        border: '1px solid #cbd5e1',
                                        color: '#334155',
                                        borderRadius: '10px',
                                        cursor: 'pointer'
                                    }}
                                >
                                    🎮 폴더 대기실로 이동
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setTransferSuccessInfo(null)}
                                    className="glass-button"
                                    style={{
                                        padding: '11px',
                                        fontSize: '0.88rem',
                                        fontWeight: 'bold',
                                        background: 'white',
                                        border: '1px solid #cbd5e1',
                                        color: '#64748b',
                                        borderRadius: '10px',
                                        cursor: 'pointer'
                                    }}
                                >
                                    아니오 (현재 위치 유지)
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
        </div>
    );
}
