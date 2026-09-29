import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { 
    Search, Plus, Trash2, ArrowLeft, ArrowRight, RotateCcw, 
    Upload, Play, Edit, CheckCircle, Award, Sparkles, Tv, AlertCircle, X, Home as HomeIcon
} from 'lucide-react';
import Confetti from 'react-confetti';
import { playSound } from '../utils/audio';
import { useGlobalSession } from '../context/GlobalSessionContext';

// Image compression helper using Canvas to prevent LocalStorage Quota Exceeded error
function compressImage(dataUrl, maxDim = 800, quality = 0.85) {
    return new Promise((resolve) => {
        const img = new Image();
        img.onload = () => {
            let w = img.naturalWidth;
            let h = img.naturalHeight;
            if (w > maxDim || h > maxDim) {
                if (w > h) {
                    h = Math.round((h * maxDim) / w);
                    w = maxDim;
                } else {
                    w = Math.round((w * maxDim) / h);
                    h = maxDim;
                }
            }
            const canvas = document.createElement('canvas');
            canvas.width = w;
            canvas.height = h;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0, w, h);
            const compressedDataUrl = canvas.toDataURL('image/jpeg', quality);
            resolve({ 
                dataUrl: compressedDataUrl, 
                aspectRatio: `${img.naturalWidth} / ${img.naturalHeight}` 
            });
        };
        img.onerror = () => resolve({ dataUrl, aspectRatio: '3 / 2' });
        img.src = dataUrl;
    });
}

// Helper to generate retro default canvas sample images for spot-the-difference
function generateDefaultSampleImages() {
    const canvas1 = document.createElement('canvas');
    const canvas2 = document.createElement('canvas');
    canvas1.width = 600;
    canvas1.height = 400;
    canvas2.width = 600;
    canvas2.height = 400;

    const ctx1 = canvas1.getContext('2d');
    const ctx2 = canvas2.getContext('2d');

    // Draw background & base scene for both
    [ctx1, ctx2].forEach((ctx) => {
        // Sky
        const skyGrad = ctx.createLinearGradient(0, 0, 0, 250);
        skyGrad.addColorStop(0, '#87CEEB');
        skyGrad.addColorStop(1, '#E0F6FF');
        ctx.fillStyle = skyGrad;
        ctx.fillRect(0, 0, 600, 250);

        // Grass
        const grassGrad = ctx.createLinearGradient(0, 250, 0, 400);
        grassGrad.addColorStop(0, '#4CAF50');
        grassGrad.addColorStop(1, '#2E7D32');
        ctx.fillStyle = grassGrad;
        ctx.fillRect(0, 250, 600, 150);

        // House body
        ctx.fillStyle = '#FF9800';
        ctx.fillRect(200, 160, 180, 130);

        // Door
        ctx.fillStyle = '#795548';
        ctx.fillRect(270, 220, 40, 70);

        // Tree
        ctx.fillStyle = '#8D6E63';
        ctx.fillRect(470, 180, 30, 110);
        ctx.fillStyle = '#388E3C';
        ctx.beginPath();
        ctx.arc(485, 160, 50, 0, Math.PI * 2);
        ctx.fill();
    });

    // --- DRAW UNIQUE DETAILS (IMAGE 1) ---
    ctx1.fillStyle = '#FFD700';
    ctx1.beginPath();
    ctx1.arc(80, 70, 35, 0, Math.PI * 2);
    ctx1.fill();

    ctx1.fillStyle = '#FFFFFF';
    ctx1.beginPath();
    ctx1.arc(250, 60, 25, 0, Math.PI * 2);
    ctx1.arc(275, 55, 30, 0, Math.PI * 2);
    ctx1.arc(300, 60, 25, 0, Math.PI * 2);
    ctx1.fill();

    ctx1.fillStyle = '#E0F7FA';
    ctx1.fillRect(225, 185, 35, 35);
    ctx1.strokeStyle = '#006064';
    ctx1.lineWidth = 3;
    ctx1.strokeRect(225, 185, 35, 35);

    ctx1.fillStyle = '#B0BEC5';
    ctx1.beginPath();
    ctx1.arc(360, 100, 12, 0, Math.PI * 2);
    ctx1.arc(370, 80, 16, 0, Math.PI * 2);
    ctx1.fill();

    ctx1.fillStyle = '#E91E63';
    ctx1.beginPath();
    ctx1.arc(120, 320, 12, 0, Math.PI * 2);
    ctx1.fill();
    ctx1.fillStyle = '#FFEB3B';
    ctx1.beginPath();
    ctx1.arc(120, 320, 5, 0, Math.PI * 2);
    ctx1.fill();

    // --- DRAW DIFFERENT DETAILS (IMAGE 2) ---
    ctx2.fillStyle = '#FF5722';
    ctx2.beginPath();
    ctx2.arc(80, 70, 35, 0, Math.PI * 2);
    ctx2.fill();

    ctx2.fillStyle = '#90CAF9';
    ctx2.beginPath();
    ctx2.arc(250, 60, 25, 0, Math.PI * 2);
    ctx2.arc(275, 55, 30, 0, Math.PI * 2);
    ctx2.arc(300, 60, 25, 0, Math.PI * 2);
    ctx2.fill();

    ctx2.fillStyle = '#FFECB3';
    ctx2.beginPath();
    ctx2.arc(242, 202, 18, 0, Math.PI * 2);
    ctx2.fill();
    ctx2.strokeStyle = '#FF6F00';
    ctx2.lineWidth = 3;
    ctx2.stroke();

    ctx2.fillStyle = '#FF80AB';
    ctx2.beginPath();
    ctx2.arc(365, 90, 20, 0, Math.PI * 2);
    ctx2.fill();

    ctx2.fillStyle = '#2196F3';
    ctx2.beginPath();
    ctx2.arc(120, 320, 12, 0, Math.PI * 2);
    ctx2.fill();
    ctx2.fillStyle = '#FFEB3B';
    ctx2.beginPath();
    ctx2.arc(120, 320, 5, 0, Math.PI * 2);
    ctx2.fill();

    return {
        image1: canvas1.toDataURL('image/png'),
        image2: canvas2.toDataURL('image/png'),
        points: [
            { id: 1, x: 13.3, y: 17.5, name: '태양 색상' },
            { id: 2, x: 45.8, y: 15.0, name: '구름 색상' },
            { id: 3, x: 40.4, y: 50.6, name: '창문 모양' },
            { id: 4, x: 60.8, y: 22.5, name: '굴뚝 연기' },
            { id: 5, x: 20.0, y: 80.0, name: '꽃 색상' }
        ]
    };
}

// Hand-drawn Crayon Circle Overlay Component
function CrayonCircleOverlay({ x, y }) {
    return (
        <svg
            viewBox="0 0 100 100"
            style={{
                position: 'absolute',
                left: `${x}%`,
                top: `${y}%`,
                width: '95px',
                height: '95px',
                transform: 'translate(-50%, -50%) rotate(-6deg)',
                pointerEvents: 'none',
                zIndex: 35,
                filter: 'drop-shadow(0px 3px 6px rgba(220, 38, 38, 0.45))'
            }}
        >
            <path
                d="M 50,10 A 38,36 0 1,1 46,12 A 40,38 0 0,1 54,10"
                fill="none"
                stroke="#dc2626"
                strokeWidth="6.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                style={{
                    strokeDasharray: '320',
                    strokeDashoffset: '320',
                    animation: 'drawCrayonCircle 0.45s cubic-bezier(0.25, 1, 0.5, 1) forwards'
                }}
            />
            <path
                d="M 52,14 A 35,33 0 1,1 45,15"
                fill="none"
                stroke="#ef4444"
                strokeWidth="3.5"
                strokeLinecap="round"
                style={{
                    strokeDasharray: '280',
                    strokeDashoffset: '280',
                    animation: 'drawCrayonCircle 0.4s cubic-bezier(0.25, 1, 0.5, 1) 0.08s forwards',
                    opacity: 0.85
                }}
            />
        </svg>
    );
}

export default function SpotDifference({ socket }) {
    const navigate = useNavigate();
    const location = useLocation();
    const { isSubScreen } = useGlobalSession();

    // Detect mirror / subscreen view mode
    const isMirrorView = Boolean(
        isSubScreen ||
        location.search.includes('mirror=true') ||
        location.search.includes('subscreen=true') ||
        window.name === 'QuizrunSubScreenWindow'
    );

    const [activeTab, setActiveTab] = useState('play'); // 'play' | 'create'
    const [questions, setQuestions] = useState([]);
    const [currentIdx, setCurrentIdx] = useState(0);
    const [foundPointIds, setFoundPointIds] = useState([]);
    const [clickFeedback, setClickFeedback] = useState(null); // { x, y, isCorrect, side }
    const [isCompleted, setIsCompleted] = useState(false);
    const [showConfetti, setShowConfetti] = useState(false);

    // Editor state
    const [editQuestionIdx, setEditQuestionIdx] = useState(null);
    const [isAutoDetecting, setIsAutoDetecting] = useState(false);
    const [draggingPointId, setDraggingPointId] = useState(null);

    const [editingQuestion, setEditingQuestion] = useState({
        title: '',
        image1: '',
        image2: '',
        points: [],
        aspectRatio: '3 / 2'
    });

    const channelRef = useRef(null);
    const editorImgRef = useRef(null);
    const isHostRef = useRef(!isMirrorView);

    // 1. Initialize Questions safely from LocalStorage
    useEffect(() => {
        const isInitialized = localStorage.getItem('quizrun_spot_diff_initialized') === 'true';
        try {
            const saved = localStorage.getItem('quizrun_spot_diff_questions');
            if (saved) {
                const parsed = JSON.parse(saved);
                if (Array.isArray(parsed)) {
                    if (parsed.length > 0 || isInitialized) {
                        setQuestions(parsed);
                        return;
                    }
                }
            }
        } catch (e) {
            console.error('Error loading spot difference questions:', e);
        }

        if (!isInitialized) {
            const sample = generateDefaultSampleImages();
            const defaultList = [
                {
                    id: 'sample_1',
                    title: '동화 마을 풍경 (기본 예시 1)',
                    image1: sample.image1,
                    image2: sample.image2,
                    points: sample.points,
                    aspectRatio: '3 / 2'
                }
            ];
            setQuestions(defaultList);
            try {
                localStorage.setItem('quizrun_spot_diff_questions', JSON.stringify(defaultList));
                localStorage.setItem('quizrun_spot_diff_initialized', 'true');
            } catch (e) {}
        }
    }, []);

    // 2. BroadcastChannel Sync Setup between Main Window & Subscreen
    useEffect(() => {
        let channel;
        try {
            channel = new BroadcastChannel('quizrun_spot_diff_sync');
            channelRef.current = channel;

            channel.onmessage = (event) => {
                const { type, payload } = event.data || {};
                if (type === 'STATE_SNAPSHOT' && payload) {
                    if (payload.currentIdx !== undefined) setCurrentIdx(payload.currentIdx);
                    if (payload.foundPointIds) setFoundPointIds(payload.foundPointIds);
                    if (payload.questions) setQuestions(payload.questions);
                    if (payload.isCompleted !== undefined) setIsCompleted(payload.isCompleted);
                    if (payload.activeTab) setActiveTab(payload.activeTab);
                } else if (type === 'POINT_FOUND') {
                    const { pointId, allFoundIds, completed } = payload;
                    setFoundPointIds(allFoundIds);
                    playSound('correct');
                    if (completed) {
                        setIsCompleted(true);
                        setShowConfetti(true);
                        playSound('fanfare');
                    }
                } else if (type === 'NAV_QUESTION') {
                    setCurrentIdx(payload.index);
                    setFoundPointIds([]);
                    setIsCompleted(false);
                    setShowConfetti(false);
                } else if (type === 'TAB_CHANGE') {
                    setActiveTab(payload.tab);
                } else if (type === 'REQUEST_SNAPSHOT') {
                    if (isHostRef.current) {
                        channel.postMessage({
                            type: 'STATE_SNAPSHOT',
                            payload: {
                                currentIdx,
                                foundPointIds,
                                questions,
                                isCompleted,
                                activeTab
                            }
                        });
                    }
                }
            };

            if (isMirrorView) {
                channel.postMessage({ type: 'REQUEST_SNAPSHOT' });
            }
        } catch (e) {
            console.warn('BroadcastChannel sync error in SpotDifference:', e);
        }

        return () => {
            if (channel) channel.close();
        };
    }, [isMirrorView, currentIdx, foundPointIds, questions, isCompleted, activeTab]);

    // Sync snapshot on state change from host
    const broadcastSnapshot = (overrides = {}) => {
        if (!isHostRef.current || !channelRef.current) return;
        try {
            channelRef.current.postMessage({
                type: 'STATE_SNAPSHOT',
                payload: {
                    currentIdx,
                    foundPointIds,
                    questions,
                    isCompleted,
                    activeTab,
                    ...overrides
                }
            });
        } catch (e) {}
    };

    // Save questions helper with Guaranteed LocalStorage write
    const saveQuestionsToStorage = (newList) => {
        setQuestions(newList);
        try {
            localStorage.setItem('quizrun_spot_diff_questions', JSON.stringify(newList));
            localStorage.setItem('quizrun_spot_diff_initialized', 'true');
        } catch (e) {
            console.error('LocalStorage save error:', e);
            alert('저장 공간 용량이 부족합니다. 이미지를 새로 업로드하면 자동으로 최적화되오니 다시 시도해 주세요.');
        }
        broadcastSnapshot({ questions: newList });
    };

    // 3. Handle Image Click in Game Play Mode (100% Precise Image Rect Calculation)
    const currentQuestion = questions[currentIdx] || null;

    const handleImageClick = (e, side) => {
        if (!currentQuestion || isCompleted) return;

        // Get exact rendered <img> element bounds inside container to eliminate letterbox/pillarbox offsets
        const imgElem = e.currentTarget.querySelector('img');
        if (!imgElem) return;

        const imgRect = imgElem.getBoundingClientRect();
        
        // Check if click is inside actual image bounds
        if (
            e.clientX < imgRect.left || 
            e.clientX > imgRect.right || 
            e.clientY < imgRect.top || 
            e.clientY > imgRect.bottom
        ) {
            return; // Ignore clicks outside image content
        }

        const clickX = ((e.clientX - imgRect.left) / imgRect.width) * 100;
        const clickY = ((e.clientY - imgRect.top) / imgRect.height) * 100;

        // Check against unfound points
        const points = currentQuestion.points || [];
        const match = points.find(p => {
            if (foundPointIds.includes(p.id)) return false;
            // Radius check (approx 9.5% tolerance relative to image dimension)
            const dx = clickX - p.x;
            const dy = clickY - p.y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            return dist <= 9.5;
        });

        if (match) {
            // Found a difference!
            const nextFound = [...foundPointIds, match.id];
            setFoundPointIds(nextFound);
            const totalPointsCount = points.length;
            const completed = totalPointsCount > 0 && nextFound.length >= totalPointsCount;

            setClickFeedback({ x: clickX, y: clickY, isCorrect: true, side });
            setTimeout(() => setClickFeedback(null), 1000);

            playSound('correct');

            if (completed) {
                setIsCompleted(true);
                setShowConfetti(true);
                playSound('fanfare');
            }

            if (channelRef.current) {
                channelRef.current.postMessage({
                    type: 'POINT_FOUND',
                    payload: { pointId: match.id, allFoundIds: nextFound, completed }
                });
            }
        } else {
            // Missed click
            setClickFeedback({ x: clickX, y: clickY, isCorrect: false, side });
            setTimeout(() => setClickFeedback(null), 800);
            playSound('wrong');
        }
    };

    // Next Question Action
    const handleNextQuestion = () => {
        if (currentIdx < questions.length - 1) {
            const nextIdx = currentIdx + 1;
            setCurrentIdx(nextIdx);
            setFoundPointIds([]);
            setIsCompleted(false);
            setShowConfetti(false);

            if (channelRef.current) {
                channelRef.current.postMessage({
                    type: 'NAV_QUESTION',
                    payload: { index: nextIdx }
                });
            }
        }
    };

    // Prev Question Action
    const handlePrevQuestion = () => {
        if (currentIdx > 0) {
            const nextIdx = currentIdx - 1;
            setCurrentIdx(nextIdx);
            setFoundPointIds([]);
            setIsCompleted(false);
            setShowConfetti(false);

            if (channelRef.current) {
                channelRef.current.postMessage({
                    type: 'NAV_QUESTION',
                    payload: { index: nextIdx }
                });
            }
        }
    };

    // Reset Current Question
    const handleResetCurrent = () => {
        setFoundPointIds([]);
        setIsCompleted(false);
        setShowConfetti(false);
        broadcastSnapshot({ foundPointIds: [], isCompleted: false });
    };

    // Sub-Screen Open
    const openSubScreen = () => {
        window.open(
            '/spot-difference?mirror=true&subscreen=true',
            'QuizrunSubScreenWindow',
            'width=1280,height=720,menubar=no,toolbar=no,location=no,status=no'
        );
    };

    // Tab Change
    const handleTabChange = (tab) => {
        setActiveTab(tab);
        if (channelRef.current) {
            channelRef.current.postMessage({ type: 'TAB_CHANGE', payload: { tab } });
        }
    };

    // --- EDITOR LOGIC ---
    const handleAddNewQuestion = () => {
        setEditingQuestion({
            title: `문제 ${questions.length + 1}`,
            image1: '',
            image2: '',
            points: [],
            aspectRatio: '3 / 2'
        });
        setEditQuestionIdx(questions.length);
    };

    const handleEditExisting = (idx) => {
        const target = questions[idx];
        setEditingQuestion({ ...target });
        setEditQuestionIdx(idx);
    };

    const handleDeleteQuestion = (idx) => {
        if (window.confirm(`'${questions[idx].title}' 문제를 삭제하시겠습니까?`)) {
            const updated = questions.filter((_, i) => i !== idx);
            saveQuestionsToStorage(updated);
            if (currentIdx >= updated.length) {
                setCurrentIdx(Math.max(0, updated.length - 1));
            }
        }
    };

    // Optimized File Upload Handler with Auto Compression
    const handleFileUpload = (e, imgKey) => {
        const file = e.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = async (uploadEvent) => {
            const rawDataUrl = uploadEvent.target.result;
            const { dataUrl, aspectRatio } = await compressImage(rawDataUrl, 800, 0.85);

            setEditingQuestion(prev => ({
                ...prev,
                [imgKey]: dataUrl,
                aspectRatio
            }));
        };
        reader.readAsDataURL(file);
    };

    // Editor Click to add point with exact image rect
    const handleEditorImageClick = (e) => {
        if (draggingPointId) return;
        if (!editingQuestion.image1 || !editingQuestion.image2) {
            alert('두 이미지를 먼저 모두 등록해 주세요!');
            return;
        }

        if ((editingQuestion.points || []).length >= 5) {
            alert('틀린 점은 최대 5개까지 설정할 수 있습니다. (마크를 ✕로 지우거나 드래그하여 이동할 수 있습니다.)');
            return;
        }

        const imgElem = e.currentTarget.querySelector('img');
        if (!imgElem) return;

        const imgRect = imgElem.getBoundingClientRect();
        if (
            e.clientX < imgRect.left || 
            e.clientX > imgRect.right || 
            e.clientY < imgRect.top || 
            e.clientY > imgRect.bottom
        ) {
            return;
        }

        const clickX = Number((((e.clientX - imgRect.left) / imgRect.width) * 100).toFixed(1));
        const clickY = Number((((e.clientY - imgRect.top) / imgRect.height) * 100).toFixed(1));

        const newPoint = {
            id: Date.now() + Math.random(),
            x: clickX,
            y: clickY,
            name: `지점 ${(editingQuestion.points || []).length + 1}`
        };

        setEditingQuestion(prev => ({
            ...prev,
            points: [...(prev.points || []), newPoint]
        }));
        playSound('submit');
    };

    // Editor Mouse Move for Point Dragging
    const handleEditorMouseMove = (e) => {
        if (!draggingPointId || !editorImgRef.current) return;

        const imgElem = editorImgRef.current.querySelector('img');
        if (!imgElem) return;

        const imgRect = imgElem.getBoundingClientRect();
        let newX = ((e.clientX - imgRect.left) / imgRect.width) * 100;
        let newY = ((e.clientY - imgRect.top) / imgRect.height) * 100;

        newX = Math.max(1, Math.min(99, Number(newX.toFixed(1))));
        newY = Math.max(1, Math.min(99, Number(newY.toFixed(1))));

        setEditingQuestion(prev => ({
            ...prev,
            points: (prev.points || []).map(p => p.id === draggingPointId ? { ...p, x: newX, y: newY } : p)
        }));
    };

    const handleEditorMouseUp = () => {
        if (draggingPointId) {
            setDraggingPointId(null);
        }
    };

    const handleRemovePointInEditor = (pointId, e) => {
        if (e) e.stopPropagation();
        setEditingQuestion(prev => ({
            ...prev,
            points: (prev.points || []).filter(p => p.id !== pointId)
        }));
    };

    // Automatic Pixel Difference Detection AI Algorithm (Letterbox-Safe)
    const handleAutoDetect = () => {
        if (!editingQuestion.image1 || !editingQuestion.image2) {
            alert('두 이미지를 먼저 모두 업로드해 주세요!');
            return;
        }

        setEditingQuestion(prev => ({ ...prev, points: [] }));
        setIsAutoDetecting(true);

        const img1 = new Image();
        const img2 = new Image();
        img1.crossOrigin = 'Anonymous';
        img2.crossOrigin = 'Anonymous';

        let loaded = 0;
        const checkBothLoaded = () => {
            loaded++;
            if (loaded < 2) return;

            try {
                const aspect = (img1.naturalWidth && img1.naturalHeight) ? (img1.naturalWidth / img1.naturalHeight) : (3 / 2);
                const w = 400;
                const h = Math.round(400 / aspect);

                const c1 = document.createElement('canvas');
                const c2 = document.createElement('canvas');
                c1.width = w; c1.height = h;
                c2.width = w; c2.height = h;

                const ctx1 = c1.getContext('2d');
                const ctx2 = c2.getContext('2d');

                ctx1.drawImage(img1, 0, 0, w, h);
                ctx2.drawImage(img2, 0, 0, w, h);

                const d1 = ctx1.getImageData(0, 0, w, h).data;
                const d2 = ctx2.getImageData(0, 0, w, h).data;

                const gridSize = 8;
                const cols = Math.floor(w / gridSize);
                const rows = Math.floor(h / gridSize);
                const gridScores = [];

                const marginCols = Math.floor(cols * 0.04);
                const marginRows = Math.floor(rows * 0.04);

                for (let r = marginRows; r < rows - marginRows; r++) {
                    for (let c = marginCols; c < cols - marginCols; c++) {
                        let diffSum = 0;
                        let diffCount = 0;
                        for (let gy = 0; gy < gridSize; gy++) {
                            for (let gx = 0; gx < gridSize; gx++) {
                                const px = c * gridSize + gx;
                                const py = r * gridSize + gy;
                                const idx = (py * w + px) * 4;
                                const rDiff = Math.abs(d1[idx] - d2[idx]);
                                const gDiff = Math.abs(d1[idx + 1] - d2[idx + 1]);
                                const bDiff = Math.abs(d1[idx + 2] - d2[idx + 2]);
                                const totalDiff = rDiff + gDiff + bDiff;

                                if (totalDiff > 55) {
                                    diffSum += totalDiff;
                                    diffCount++;
                                }
                            }
                        }
                        if (diffCount >= 2) {
                            gridScores.push({
                                cx: Number(((c * gridSize + gridSize / 2) / w * 100).toFixed(1)),
                                cy: Number(((r * gridSize + gridSize / 2) / h * 100).toFixed(1)),
                                score: diffSum
                            });
                        }
                    }
                }

                gridScores.sort((a, b) => b.score - a.score);
                const detectedPoints = [];

                for (const candidate of gridScores) {
                    if (detectedPoints.length >= 5) break;

                    const isTooClose = detectedPoints.some(p => {
                        const dx = p.x - candidate.cx;
                        const dy = p.y - candidate.cy;
                        return Math.sqrt(dx * dx + dy * dy) < 13;
                    });

                    if (!isTooClose) {
                        detectedPoints.push({
                            id: Date.now() + Math.random() + detectedPoints.length,
                            x: candidate.cx,
                            y: candidate.cy,
                            name: `자동 감지 ${detectedPoints.length + 1}`
                        });
                    }
                }

                setIsAutoDetecting(false);

                if (detectedPoints.length === 0) {
                    alert('두 이미지에서 뚜렷한 차이점을 정밀하게 찾지 못했습니다. 수동으로 클릭하여 설정해 주세요.');
                } else {
                    setEditingQuestion(prev => ({
                        ...prev,
                        points: detectedPoints
                    }));
                    playSound('fanfare');
                    alert(`⚡ ${detectedPoints.length}개의 틀린 그림 지점을 성공적으로 분석했습니다!\n필요한 경우 번호 마크를 마우스로 끌어(드래그) 위치를 조절하거나 ✕로 지운 후 수동 수정할 수 있습니다.`);
                }
            } catch (err) {
                console.error('Auto detect error:', err);
                setIsAutoDetecting(false);
                alert('이미지 분석 중 오류가 발생했습니다. 수동으로 클릭하여 지점을 설정해 주세요.');
            }
        };

        img1.onload = checkBothLoaded;
        img2.onload = checkBothLoaded;
        img1.onerror = () => { setIsAutoDetecting(false); alert('이미지 1을 읽을 수 없습니다.'); };
        img2.onerror = () => { setIsAutoDetecting(false); alert('이미지 2를 읽을 수 없습니다.'); };

        img1.src = editingQuestion.image1;
        img2.src = editingQuestion.image2;
    };

    const handleSaveEditorQuestion = () => {
        if (!editingQuestion.title.trim()) {
            alert('문제 제목을 입력해 주세요.');
            return;
        }
        if (!editingQuestion.image1 || !editingQuestion.image2) {
            alert('이미지 2개를 모두 등록해 주세요.');
            return;
        }
        if ((editingQuestion.points || []).length === 0) {
            alert('최소 1개 이상의 틀린 점을 설정해 주세요.');
            return;
        }

        let newList = [...questions];
        if (editQuestionIdx !== null && editQuestionIdx < questions.length) {
            newList[editQuestionIdx] = { ...editingQuestion, id: editingQuestion.id || `spot_${Date.now()}` };
        } else {
            newList.push({ ...editingQuestion, id: `spot_${Date.now()}` });
        }

        saveQuestionsToStorage(newList);
        setEditQuestionIdx(null);
        setActiveTab('play');
        alert('🎉 문제가 성공적으로 저장되었습니다! 바로 [문제 시작] 버튼을 눌러 게임을 진행해보세요.');
    };

    return (
        <div style={{
            minHeight: '100vh',
            width: '100%',
            background: 'linear-gradient(135deg, #f8fafc 0%, #eef2ff 50%, #fdf4ff 100%)',
            color: '#1e293b',
            display: 'flex',
            flexDirection: 'column',
            fontFamily: 'system-ui, -apple-system, sans-serif',
            boxSizing: 'border-box'
        }}>
            {showConfetti && <Confetti recycle={false} numberOfPieces={500} />}
            <style>{`
                @keyframes drawCrayonCircle {
                    from { stroke-dashoffset: 320; }
                    to { stroke-dashoffset: 0; }
                }
            `}</style>

            {/* --- Top Header Navigation --- */}
            <header style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '14px 28px',
                background: 'rgba(255, 255, 255, 0.95)',
                backdropFilter: 'blur(12px)',
                borderBottom: '2px solid #e2e8f0',
                boxShadow: '0 4px 14px rgba(0,0,0,0.03)',
                zIndex: 100
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    {editQuestionIdx !== null ? (
                        <button
                            onClick={() => setEditQuestionIdx(null)}
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '6px',
                                background: '#fef3c7',
                                border: '2px solid #f59e0b',
                                borderRadius: '12px',
                                padding: '8px 16px',
                                fontSize: '0.95rem',
                                fontWeight: '900',
                                color: '#b45309',
                                cursor: 'pointer'
                            }}
                            title="문제 편집 취소하고 문제 목록으로 돌아가기"
                        >
                            <ArrowLeft size={18} /> 이전 단계 (목록으로)
                        </button>
                    ) : activeTab === 'create' ? (
                        <button
                            onClick={() => handleTabChange('play')}
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '6px',
                                background: '#dbeafe',
                                border: '2px solid #2563eb',
                                borderRadius: '12px',
                                padding: '8px 16px',
                                fontSize: '0.95rem',
                                fontWeight: '900',
                                color: '#1d4ed8',
                                cursor: 'pointer'
                            }}
                            title="숨은 그림 찾기 게임 시작 화면으로 이동"
                        >
                            <ArrowLeft size={18} /> 뒤로가기
                        </button>
                    ) : (
                        <button
                            onClick={() => navigate(-1)}
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '6px',
                                background: '#f1f5f9',
                                border: '1.5px solid #cbd5e1',
                                borderRadius: '12px',
                                padding: '8px 16px',
                                fontSize: '0.95rem',
                                fontWeight: '800',
                                color: '#475569',
                                cursor: 'pointer'
                            }}
                            title="이전 페이지로 돌아가기"
                        >
                            <ArrowLeft size={18} /> 뒤로가기
                        </button>
                    )}

                    <button
                        onClick={() => navigate('/')}
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px',
                            background: '#f1f5f9',
                            border: '1.5px solid #cbd5e1',
                            borderRadius: '12px',
                            padding: '8px 14px',
                            fontSize: '0.95rem',
                            fontWeight: '800',
                            color: '#475569',
                            cursor: 'pointer'
                        }}
                        title="메인 홈 화면으로 이동"
                    >
                        <HomeIcon size={18} /> 홈으로
                    </button>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <div style={{
                            background: '#fef3c7',
                            padding: '8px 14px',
                            borderRadius: '14px',
                            border: '2px solid #fde68a',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px'
                        }}>
                            <Search size={22} color="#d97706" />
                            <span style={{ fontSize: '1.35rem', fontWeight: '900', color: '#92400e' }}>
                                숨은 그림 찾기 (틀린 그림 찾기)
                            </span>
                        </div>
                    </div>
                </div>

                {/* Center Tabs & Actions */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    {!isMirrorView && (
                        <>
                            <button
                                onClick={() => handleTabChange('play')}
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '8px',
                                    padding: '10px 22px',
                                    borderRadius: '16px',
                                    fontSize: '1.05rem',
                                    fontWeight: '900',
                                    cursor: 'pointer',
                                    border: activeTab === 'play' ? '3px solid #2563eb' : '2px solid #cbd5e1',
                                    background: activeTab === 'play' ? '#2563eb' : 'white',
                                    color: activeTab === 'play' ? 'white' : '#475569',
                                    boxShadow: activeTab === 'play' ? '0 6px 20px rgba(37, 99, 235, 0.3)' : 'none',
                                    transition: 'all 0.2s ease'
                                }}
                            >
                                <Play size={20} /> 문제 시작 (게임 모드)
                            </button>

                            <button
                                onClick={() => handleTabChange('create')}
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '8px',
                                    padding: '10px 22px',
                                    borderRadius: '16px',
                                    fontSize: '1.05rem',
                                    fontWeight: '900',
                                    cursor: 'pointer',
                                    border: activeTab === 'create' ? '3px solid #d97706' : '2px solid #cbd5e1',
                                    background: activeTab === 'create' ? '#f59e0b' : 'white',
                                    color: activeTab === 'create' ? 'white' : '#475569',
                                    boxShadow: activeTab === 'create' ? '0 6px 20px rgba(245, 158, 11, 0.3)' : 'none',
                                    transition: 'all 0.2s ease'
                                }}
                            >
                                <Edit size={20} /> 문제 만들기
                            </button>

                            <button
                                onClick={openSubScreen}
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '6px',
                                    background: '#ecfdf5',
                                    border: '2px solid #10b981',
                                    borderRadius: '14px',
                                    padding: '10px 18px',
                                    fontSize: '0.95rem',
                                    fontWeight: '900',
                                    color: '#047857',
                                    cursor: 'pointer',
                                    marginLeft: '8px'
                                }}
                                title="서브 모니터 스크린 창 열기"
                            >
                                <Tv size={18} /> 🖥️ 서브 스크린 연결
                            </button>
                        </>
                    )}

                    {isMirrorView && (
                        <div style={{
                            background: '#dcfce7',
                            border: '2px solid #22c55e',
                            color: '#15803d',
                            padding: '6px 16px',
                            borderRadius: '14px',
                            fontWeight: '900',
                            fontSize: '0.95rem'
                        }}>
                            📺 서브 스크린 미러 모드 활성화됨
                        </div>
                    )}
                </div>
            </header>

            {/* --- Main Content Stage --- */}
            <main style={{ 
                flex: 1, 
                padding: isMirrorView ? '12px 20px' : '20px 32px', 
                display: 'flex', 
                flexDirection: 'column', 
                gap: '16px',
                alignItems: 'center',
                justifyContent: 'flex-start'
            }}>
                {/* ================= MODE 1: GAME PLAY MODE ================= */}
                {activeTab === 'play' && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', alignItems: 'center', width: '100%', height: '100%' }}>
                        {questions.length === 0 ? (
                            <div style={{
                                textAlign: 'center',
                                background: 'white',
                                padding: '60px',
                                borderRadius: '32px',
                                boxShadow: '0 20px 40px rgba(0,0,0,0.06)',
                                border: '3px solid #e2e8f0',
                                marginTop: '40px'
                            }}>
                                <AlertCircle size={64} color="#f59e0b" style={{ marginBottom: '16px' }} />
                                <h2 style={{ fontSize: '2rem', fontWeight: 900, marginBottom: '12px' }}>등록된 문제가 없습니다</h2>
                                <p style={{ fontSize: '1.2rem', color: '#64748b', marginBottom: '24px' }}>
                                    상단의 '문제 만들기' 버튼을 눌러 새 이미지 문제를 등록해 보세요!
                                </p>
                                <button
                                    onClick={() => handleTabChange('create')}
                                    style={{
                                        background: '#f59e0b',
                                        color: 'white',
                                        border: 'none',
                                        borderRadius: '16px',
                                        padding: '14px 28px',
                                        fontSize: '1.2rem',
                                        fontWeight: '900',
                                        cursor: 'pointer'
                                    }}
                                >
                                    ✨ 지금 문제 만들기
                                </button>
                            </div>
                        ) : (
                            <>
                                {/* Game Status Banner */}
                                <div style={{
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    alignItems: 'center',
                                    width: '100%',
                                    maxWidth: '1750px',
                                    background: 'white',
                                    borderRadius: '24px',
                                    padding: '12px 28px',
                                    border: '3px solid #e2e8f0',
                                    boxShadow: '0 10px 25px rgba(0,0,0,0.04)'
                                }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                                        <span style={{
                                            background: '#3b82f6',
                                            color: 'white',
                                            padding: '6px 18px',
                                            borderRadius: '20px',
                                            fontSize: '1.15rem',
                                            fontWeight: '900'
                                        }}>
                                            문제 {currentIdx + 1} / {questions.length}
                                        </span>
                                        <h3 style={{ fontSize: '1.5rem', fontWeight: '900', margin: 0, color: '#0f172a' }}>
                                            {currentQuestion?.title || '제목 없음'}
                                        </h3>
                                    </div>

                                    {/* Found Counter (Supports 1~5 points count) */}
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
                                        <div style={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '10px',
                                            background: isCompleted ? '#dcfce7' : '#fef3c7',
                                            border: `3px solid ${isCompleted ? '#10b981' : '#f59e0b'}`,
                                            padding: '8px 24px',
                                            borderRadius: '20px'
                                        }}>
                                            <Sparkles size={24} color={isCompleted ? '#059669' : '#d97706'} />
                                            <span style={{ fontSize: '1.25rem', fontWeight: '900', color: isCompleted ? '#065f46' : '#92400e' }}>
                                                찾은 틀린 그림: {foundPointIds.length} / {(currentQuestion?.points || []).length} 개
                                            </span>
                                        </div>

                                        <button
                                            onClick={handleResetCurrent}
                                            style={{
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: '6px',
                                                background: '#f1f5f9',
                                                border: '2px solid #cbd5e1',
                                                borderRadius: '14px',
                                                padding: '8px 16px',
                                                fontWeight: '800',
                                                color: '#475569',
                                                cursor: 'pointer'
                                            }}
                                            title="현재 문제 다시 풀기"
                                        >
                                            <RotateCcw size={16} /> 다시 풀기
                                        </button>
                                    </div>
                                </div>

                                {/* Images Comparison Dual Display - Large Screen Scale with 100% Image-Fitting Wrapper */}
                                <div style={{
                                    display: 'flex',
                                    gap: '24px',
                                    justifyContent: 'center',
                                    alignItems: 'center',
                                    width: '100%',
                                    maxWidth: '1750px',
                                    flex: 1
                                }}>
                                    {/* Image 1 (Left) */}
                                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', height: '100%' }}>
                                        <div style={{
                                            fontSize: '1.1rem',
                                            fontWeight: '900',
                                            color: '#2563eb',
                                            marginBottom: '8px',
                                            background: '#dbeafe',
                                            padding: '4px 16px',
                                            borderRadius: '12px'
                                        }}>
                                            🖼️ 이미지 A (원본)
                                        </div>

                                        {/* Outer Container */}
                                        <div style={{
                                            width: '100%',
                                            height: '100%',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            background: '#f8fafc',
                                            borderRadius: '24px',
                                            border: '4px solid #cbd5e1',
                                            boxShadow: '0 16px 40px rgba(0,0,0,0.12)',
                                            overflow: 'hidden',
                                            padding: '6px'
                                        }}>
                                            {/* Image-Fitting Wrapper: EXACTLY matches the displayed image size */}
                                            <div
                                                onClick={(e) => handleImageClick(e, 'left')}
                                                style={{
                                                    position: 'relative',
                                                    display: 'inline-block',
                                                    maxWidth: '100%',
                                                    maxHeight: isMirrorView ? 'calc(100vh - 230px)' : 'calc(100vh - 280px)',
                                                    cursor: isCompleted ? 'default' : 'crosshair',
                                                    userSelect: 'none'
                                                }}
                                            >
                                                <img
                                                    src={currentQuestion?.image1}
                                                    alt="Original"
                                                    style={{
                                                        display: 'block',
                                                        maxWidth: '100%',
                                                        maxHeight: isMirrorView ? 'calc(100vh - 230px)' : 'calc(100vh - 280px)',
                                                        width: 'auto',
                                                        height: 'auto',
                                                        borderRadius: '16px'
                                                    }}
                                                />

                                                {/* Found Difference Crayon Circles on Image 1 */}
                                                {(currentQuestion?.points || []).map(p => {
                                                    if (!foundPointIds.includes(p.id)) return null;
                                                    return (
                                                        <CrayonCircleOverlay key={`left_found_${p.id}`} x={p.x} y={p.y} />
                                                    );
                                                })}

                                                {/* Click Visual Feedback */}
                                                {clickFeedback && clickFeedback.side === 'left' && (
                                                    <div style={{
                                                        position: 'absolute',
                                                        left: `${clickFeedback.x}%`,
                                                        top: `${clickFeedback.y}%`,
                                                        transform: 'translate(-50%, -50%)',
                                                        color: clickFeedback.isCorrect ? '#10b981' : '#ef4444',
                                                        fontSize: '2.8rem',
                                                        fontWeight: '900',
                                                        pointerEvents: 'none',
                                                        animation: 'popIn 0.2s ease',
                                                        zIndex: 40
                                                    }}>
                                                        {clickFeedback.isCorrect ? '⭕' : '❌'}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>

                                    {/* Image 2 (Right) */}
                                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', height: '100%' }}>
                                        <div style={{
                                            fontSize: '1.1rem',
                                            fontWeight: '900',
                                            color: '#d97706',
                                            marginBottom: '8px',
                                            background: '#fef3c7',
                                            padding: '4px 16px',
                                            borderRadius: '12px'
                                        }}>
                                            🔍 이미지 B (틀린 그림)
                                        </div>

                                        {/* Outer Container */}
                                        <div style={{
                                            width: '100%',
                                            height: '100%',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            background: '#f8fafc',
                                            borderRadius: '24px',
                                            border: '4px solid #cbd5e1',
                                            boxShadow: '0 16px 40px rgba(0,0,0,0.12)',
                                            overflow: 'hidden',
                                            padding: '6px'
                                        }}>
                                            {/* Image-Fitting Wrapper: EXACTLY matches the displayed image size */}
                                            <div
                                                onClick={(e) => handleImageClick(e, 'right')}
                                                style={{
                                                    position: 'relative',
                                                    display: 'inline-block',
                                                    maxWidth: '100%',
                                                    maxHeight: isMirrorView ? 'calc(100vh - 230px)' : 'calc(100vh - 280px)',
                                                    cursor: isCompleted ? 'default' : 'crosshair',
                                                    userSelect: 'none'
                                                }}
                                            >
                                                <img
                                                    src={currentQuestion?.image2}
                                                    alt="Difference"
                                                    style={{
                                                        display: 'block',
                                                        maxWidth: '100%',
                                                        maxHeight: isMirrorView ? 'calc(100vh - 230px)' : 'calc(100vh - 280px)',
                                                        width: 'auto',
                                                        height: 'auto',
                                                        borderRadius: '16px'
                                                    }}
                                                />

                                                {/* Found Difference Crayon Circles on Image 2 */}
                                                {(currentQuestion?.points || []).map(p => {
                                                    if (!foundPointIds.includes(p.id)) return null;
                                                    return (
                                                        <CrayonCircleOverlay key={`right_found_${p.id}`} x={p.x} y={p.y} />
                                                    );
                                                })}

                                                {/* Click Visual Feedback */}
                                                {clickFeedback && clickFeedback.side === 'right' && (
                                                    <div style={{
                                                        position: 'absolute',
                                                        left: `${clickFeedback.x}%`,
                                                        top: `${clickFeedback.y}%`,
                                                        transform: 'translate(-50%, -50%)',
                                                        color: clickFeedback.isCorrect ? '#10b981' : '#ef4444',
                                                        fontSize: '2.8rem',
                                                        fontWeight: '900',
                                                        pointerEvents: 'none',
                                                        animation: 'popIn 0.2s ease',
                                                        zIndex: 40
                                                    }}>
                                                        {clickFeedback.isCorrect ? '⭕' : '❌'}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Bottom Navigation Control Panel */}
                                <div style={{
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    alignItems: 'center',
                                    width: '100%',
                                    maxWidth: '1750px',
                                    marginTop: '4px'
                                }}>
                                    <button
                                        onClick={handlePrevQuestion}
                                        disabled={currentIdx === 0}
                                        style={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '8px',
                                            padding: '12px 28px',
                                            borderRadius: '18px',
                                            fontSize: '1.15rem',
                                            fontWeight: '900',
                                            background: currentIdx === 0 ? '#e2e8f0' : '#ffffff',
                                            color: currentIdx === 0 ? '#94a3b8' : '#1e293b',
                                            cursor: currentIdx === 0 ? 'not-allowed' : 'pointer',
                                            boxShadow: '0 4px 14px rgba(0,0,0,0.06)',
                                            border: '2px solid #cbd5e1'
                                        }}
                                    >
                                        <ArrowLeft size={20} /> 이전 문제
                                    </button>

                                    {/* Success Congratulation Banner */}
                                    {isCompleted && (
                                        <div style={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '12px',
                                            background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                                            color: 'white',
                                            padding: '12px 32px',
                                            borderRadius: '24px',
                                            boxShadow: '0 10px 30px rgba(16, 185, 129, 0.4)',
                                            animation: 'popIn 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)'
                                        }}>
                                            <Award size={32} />
                                            <span style={{ fontSize: '1.45rem', fontWeight: '900' }}>
                                                🎉 성공! 모든 틀린 그림({(currentQuestion?.points || []).length}개)을 찾았습니다! 🎺
                                            </span>
                                        </div>
                                    )}

                                    <button
                                        onClick={handleNextQuestion}
                                        disabled={currentIdx >= questions.length - 1}
                                        style={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '8px',
                                            padding: '14px 32px',
                                            borderRadius: '18px',
                                            fontSize: '1.25rem',
                                            fontWeight: '900',
                                            border: 'none',
                                            background: isCompleted
                                                ? 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)'
                                                : currentIdx >= questions.length - 1 ? '#e2e8f0' : '#2563eb',
                                            color: currentIdx >= questions.length - 1 && !isCompleted ? '#94a3b8' : 'white',
                                            cursor: currentIdx >= questions.length - 1 ? 'not-allowed' : 'pointer',
                                            boxShadow: isCompleted ? '0 8px 24px rgba(37, 99, 235, 0.4)' : '0 4px 14px rgba(0,0,0,0.06)',
                                            transition: 'all 0.2s ease'
                                        }}
                                    >
                                        다음 문제 <ArrowRight size={22} />
                                    </button>
                                </div>
                            </>
                        )}
                    </div>
                )}

                {/* ================= MODE 2: QUESTION CREATOR / EDITOR MODE ================= */}
                {activeTab === 'create' && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', width: '100%', maxWidth: '1200px', margin: '0 auto' }}>
                        {/* Editor Header Card */}
                        <div style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            background: 'white',
                            padding: '20px 32px',
                            borderRadius: '24px',
                            border: '3px solid #e2e8f0',
                            boxShadow: '0 10px 25px rgba(0,0,0,0.04)'
                        }}>
                            <div>
                                <h2 style={{ fontSize: '1.8rem', fontWeight: '900', margin: 0, color: '#0f172a' }}>
                                    ✏️ 숨은 그림 찾기 문제 관리 및 제작
                                </h2>
                                <p style={{ color: '#64748b', margin: '4px 0 0 0', fontWeight: '700' }}>
                                    동일한 규격의 서로 다른 이미지 2개를 올리고, 틀린 위치(1~5개 자유)를 클릭 또는 자동 감지해 보세요.
                                </p>
                            </div>

                            <button
                                onClick={handleAddNewQuestion}
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '8px',
                                    background: '#2563eb',
                                    color: 'white',
                                    border: 'none',
                                    borderRadius: '16px',
                                    padding: '12px 24px',
                                    fontSize: '1.1rem',
                                    fontWeight: '900',
                                    cursor: 'pointer',
                                    boxShadow: '0 6px 20px rgba(37, 99, 235, 0.25)'
                                }}
                            >
                                <Plus size={20} /> 새 문제 만들기
                            </button>
                        </div>

                        {/* If in Editing Sub-View */}
                        {editQuestionIdx !== null ? (
                            <div style={{
                                background: 'white',
                                borderRadius: '28px',
                                padding: '32px',
                                border: '3px solid #cbd5e1',
                                boxShadow: '0 20px 50px rgba(0,0,0,0.06)',
                                display: 'flex',
                                flexDirection: 'column',
                                gap: '24px'
                            }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <h3 style={{ fontSize: '1.5rem', fontWeight: '900', margin: 0, color: '#1e293b' }}>
                                        📝 {editQuestionIdx < questions.length ? '문제 편집' : '신규 문제 등록'}
                                    </h3>
                                    <button
                                        onClick={() => setEditQuestionIdx(null)}
                                        style={{ background: '#f1f5f9', border: 'none', padding: '8px 16px', borderRadius: '12px', fontWeight: '800', cursor: 'pointer' }}
                                    >
                                        취소하고 목록으로
                                    </button>
                                </div>

                                {/* Question Title Input */}
                                <div>
                                    <label style={{ display: 'block', fontWeight: '900', marginBottom: '8px', fontSize: '1.1rem' }}>
                                        문제 제목 / 주제
                                    </label>
                                    <input
                                        type="text"
                                        value={editingQuestion.title}
                                        onChange={(e) => setEditingQuestion(prev => ({ ...prev, title: e.target.value }))}
                                        placeholder="예: 해적선 틀린 그림 찾기"
                                        style={{
                                            width: '100%',
                                            padding: '14px 20px',
                                            fontSize: '1.1rem',
                                            borderRadius: '14px',
                                            border: '2px solid #cbd5e1',
                                            outline: 'none',
                                            boxSizing: 'border-box'
                                        }}
                                    />
                                </div>

                                {/* Images Upload Area */}
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
                                    {/* Upload Image 1 */}
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                        <label style={{ fontWeight: '900', fontSize: '1.05rem', color: '#2563eb' }}>
                                            1. 원본 이미지 (이미지 A)
                                        </label>
                                        <label style={{
                                            display: 'flex',
                                            flexDirection: 'column',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            height: '220px',
                                            border: '3px dashed #cbd5e1',
                                            borderRadius: '20px',
                                            background: '#f8fafc',
                                            cursor: 'pointer',
                                            overflow: 'hidden',
                                            position: 'relative'
                                        }}>
                                            {editingQuestion.image1 ? (
                                                <img src={editingQuestion.image1} alt="Img1" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                                            ) : (
                                                <div style={{ textAlign: 'center', color: '#64748b' }}>
                                                    <Upload size={36} color="#3b82f6" style={{ marginBottom: '8px' }} />
                                                    <div style={{ fontWeight: '800' }}>클릭하여 원본 이미지 업로드</div>
                                                </div>
                                            )}
                                            <input type="file" accept="image/*" onChange={(e) => handleFileUpload(e, 'image1')} style={{ display: 'none' }} />
                                        </label>
                                    </div>

                                    {/* Upload Image 2 */}
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                        <label style={{ fontWeight: '900', fontSize: '1.05rem', color: '#d97706' }}>
                                            2. 틀린 이미지 (이미지 B)
                                        </label>
                                        <label style={{
                                            display: 'flex',
                                            flexDirection: 'column',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            height: '220px',
                                            border: '3px dashed #cbd5e1',
                                            borderRadius: '20px',
                                            background: '#f8fafc',
                                            cursor: 'pointer',
                                            overflow: 'hidden',
                                            position: 'relative'
                                        }}>
                                            {editingQuestion.image2 ? (
                                                <img src={editingQuestion.image2} alt="Img2" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                                            ) : (
                                                <div style={{ textAlign: 'center', color: '#64748b' }}>
                                                    <Upload size={36} color="#f59e0b" style={{ marginBottom: '8px' }} />
                                                    <div style={{ fontWeight: '800' }}>클릭하여 틀린 그림 이미지 업로드</div>
                                                </div>
                                            )}
                                            <input type="file" accept="image/*" onChange={(e) => handleFileUpload(e, 'image2')} style={{ display: 'none' }} />
                                        </label>
                                    </div>
                                </div>

                                {/* Set Difference Points Instructions & Interactive Canvas */}
                                {editingQuestion.image1 && editingQuestion.image2 && (
                                    <div style={{
                                        background: '#f0fdf4',
                                        border: '2px solid #6ee7b7',
                                        borderRadius: '20px',
                                        padding: '20px',
                                        display: 'flex',
                                        flexDirection: 'column',
                                        gap: '14px'
                                    }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
                                            <div>
                                                <h4 style={{ margin: 0, fontSize: '1.25rem', color: '#065f46', fontWeight: '900' }}>
                                                    🎯 틀린 지점 클릭 및 드래그 설정 (최대 5개, 자유롭게 선택 가능)
                                                </h4>
                                                <p style={{ margin: '4px 0 0 0', color: '#047857', fontSize: '0.95rem' }}>
                                                    원하는 개수(1개~5개)만큼 클릭해 지정하세요. <b>마크를 드래그하여 이동</b>하거나 <b>✕로 개별 지우기</b>가 가능합니다. (현재: {(editingQuestion.points || []).length}개 설정됨)
                                                </p>
                                            </div>

                                            <div style={{ display: 'flex', gap: '10px' }}>
                                                <button
                                                    onClick={handleAutoDetect}
                                                    disabled={isAutoDetecting}
                                                    style={{
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        gap: '8px',
                                                        background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
                                                        color: 'white',
                                                        border: 'none',
                                                        borderRadius: '14px',
                                                        padding: '10px 20px',
                                                        fontSize: '1rem',
                                                        fontWeight: '900',
                                                        cursor: isAutoDetecting ? 'wait' : 'pointer',
                                                        boxShadow: '0 4px 14px rgba(245, 158, 11, 0.3)'
                                                    }}
                                                >
                                                    <Sparkles size={18} /> {isAutoDetecting ? '정밀 이미지 분석 중...' : '🤖 AI/자동 차이점 감지'}
                                                </button>

                                                {(editingQuestion.points || []).length > 0 && (
                                                    <button
                                                        onClick={() => setEditingQuestion(prev => ({ ...prev, points: [] }))}
                                                        style={{
                                                            background: '#fee2e2',
                                                            color: '#dc2626',
                                                            border: '1px solid #fca5a5',
                                                            borderRadius: '14px',
                                                            padding: '10px 14px',
                                                            fontSize: '0.9rem',
                                                            fontWeight: '800',
                                                            cursor: 'pointer'
                                                        }}
                                                    >
                                                        전체 초기화
                                                    </button>
                                                )}
                                            </div>
                                        </div>

                                        {/* Clickable & Draggable Target Image Box with 100% Image-Fitting Wrapper */}
                                        <div style={{
                                            width: '100%',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            background: '#f8fafc',
                                            borderRadius: '20px',
                                            border: '3px solid #10b981',
                                            padding: '6px',
                                            overflow: 'hidden'
                                        }}>
                                            <div
                                                ref={editorImgRef}
                                                onClick={handleEditorImageClick}
                                                onMouseMove={handleEditorMouseMove}
                                                onMouseUp={handleEditorMouseUp}
                                                onMouseLeave={handleEditorMouseUp}
                                                style={{
                                                    position: 'relative',
                                                    display: 'inline-block',
                                                    maxWidth: '100%',
                                                    maxHeight: '580px',
                                                    cursor: draggingPointId ? 'grabbing' : 'crosshair',
                                                    userSelect: 'none'
                                                }}
                                            >
                                                <img
                                                    src={editingQuestion.image2}
                                                    alt="Editor Target"
                                                    style={{
                                                        display: 'block',
                                                        maxWidth: '100%',
                                                        maxHeight: '580px',
                                                        width: 'auto',
                                                        height: 'auto',
                                                        borderRadius: '14px'
                                                    }}
                                                />

                                                {/* Registered Points Interactive Overlay */}
                                                {(editingQuestion.points || []).map((p, pIdx) => (
                                                    <div
                                                        key={p.id}
                                                        onMouseDown={(e) => {
                                                            e.stopPropagation();
                                                            setDraggingPointId(p.id);
                                                        }}
                                                        style={{
                                                            position: 'absolute',
                                                            left: `${p.x}%`,
                                                            top: `${p.y}%`,
                                                            width: '44px',
                                                            height: '44px',
                                                            transform: 'translate(-50%, -50%)',
                                                            borderRadius: '50%',
                                                            border: '3px solid #f59e0b',
                                                            background: 'rgba(245, 158, 11, 0.4)',
                                                            display: 'flex',
                                                            alignItems: 'center',
                                                            justifyContent: 'center',
                                                            color: 'white',
                                                            fontWeight: '900',
                                                            fontSize: '1.1rem',
                                                            boxShadow: '0 0 14px rgba(245, 158, 11, 0.8)',
                                                            cursor: 'grab',
                                                            zIndex: 20
                                                        }}
                                                        title="드래그하여 위치 이동 / ✕ 클릭하여 삭제"
                                                    >
                                                        {pIdx + 1}

                                                        {/* Individual Delete Button on Badge */}
                                                        <div
                                                            onClick={(e) => handleRemovePointInEditor(p.id, e)}
                                                            style={{
                                                                position: 'absolute',
                                                                top: '-6px',
                                                                right: '-6px',
                                                                width: '20px',
                                                                height: '20px',
                                                                borderRadius: '50%',
                                                                background: '#ef4444',
                                                                color: 'white',
                                                                display: 'flex',
                                                                alignItems: 'center',
                                                                justifyContent: 'center',
                                                                fontSize: '0.75rem',
                                                                cursor: 'pointer',
                                                                boxShadow: '0 2px 6px rgba(0,0,0,0.2)'
                                                            }}
                                                            title="이 지점 삭제"
                                                        >
                                                            ✕
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>

                                        {/* Point Chips List */}
                                        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                                            {(editingQuestion.points || []).map((p, idx) => (
                                                <div
                                                    key={p.id}
                                                    style={{
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        gap: '8px',
                                                        background: 'white',
                                                        border: '2px solid #f59e0b',
                                                        padding: '6px 14px',
                                                        borderRadius: '16px',
                                                        fontWeight: '800'
                                                    }}
                                                >
                                                    <span>📍 {idx + 1}번 지점 (x:{p.x}%, y:{p.y}%)</span>
                                                    <button
                                                        onClick={(e) => handleRemovePointInEditor(p.id, e)}
                                                        style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
                                                    >
                                                        <Trash2 size={16} color="#ef4444" />
                                                    </button>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {/* Save Button */}
                                <button
                                    onClick={handleSaveEditorQuestion}
                                    style={{
                                        background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                                        color: 'white',
                                        border: 'none',
                                        borderRadius: '18px',
                                        padding: '16px',
                                        fontSize: '1.25rem',
                                        fontWeight: '900',
                                        cursor: 'pointer',
                                        boxShadow: '0 8px 24px rgba(16, 185, 129, 0.3)'
                                    }}
                                >
                                    💾 문제 저장하기 및 게임 시작
                                </button>
                            </div>
                        ) : (
                            /* Existing Question Cards Grid */
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '20px' }}>
                                {questions.map((q, idx) => (
                                    <div
                                        key={q.id || idx}
                                        style={{
                                            background: 'white',
                                            borderRadius: '24px',
                                            padding: '20px',
                                            border: '2px solid #e2e8f0',
                                            boxShadow: '0 10px 25px rgba(0,0,0,0.04)',
                                            display: 'flex',
                                            flexDirection: 'column',
                                            justifyContent: 'space-between',
                                            gap: '14px'
                                        }}
                                    >
                                        <div>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                                                <span style={{ background: '#e0e7ff', color: '#3730a3', padding: '4px 12px', borderRadius: '12px', fontSize: '0.88rem', fontWeight: '900' }}>
                                                    문제 {idx + 1}
                                                </span>
                                                <span style={{ fontSize: '0.85rem', color: '#64748b', fontWeight: '700' }}>
                                                    정답 지점: {(q.points || []).length}개
                                                </span>
                                            </div>

                                            <h4 style={{ fontSize: '1.25rem', fontWeight: '900', margin: '0 0 12px 0', color: '#0f172a' }}>
                                                {q.title}
                                            </h4>

                                            {/* Preview Thumbnails */}
                                            <div style={{ display: 'flex', gap: '10px', height: '120px' }}>
                                                <img src={q.image1} alt="Thumb1" style={{ flex: 1, height: '100%', objectFit: 'cover', borderRadius: '14px', border: '1px solid #cbd5e1' }} />
                                                <img src={q.image2} alt="Thumb2" style={{ flex: 1, height: '100%', objectFit: 'cover', borderRadius: '14px', border: '1px solid #cbd5e1' }} />
                                            </div>
                                        </div>

                                        {/* Card Actions */}
                                        <div style={{ display: 'flex', gap: '10px', borderTop: '1.5px solid #f1f5f9', paddingTop: '12px' }}>
                                            <button
                                                onClick={() => handleEditExisting(idx)}
                                                style={{
                                                    flex: 1,
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center',
                                                    gap: '6px',
                                                    background: '#f1f5f9',
                                                    border: '1.5px solid #cbd5e1',
                                                    borderRadius: '12px',
                                                    padding: '8px',
                                                    fontWeight: '800',
                                                    color: '#334155',
                                                    cursor: 'pointer'
                                                }}
                                            >
                                                <Edit size={16} /> 편집
                                            </button>
                                            <button
                                                onClick={() => handleDeleteQuestion(idx)}
                                                style={{
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center',
                                                    background: '#fee2e2',
                                                    border: '1.5px solid #fca5a5',
                                                    borderRadius: '12px',
                                                    padding: '8px 14px',
                                                    cursor: 'pointer'
                                                }}
                                            >
                                                <Trash2 size={16} color="#dc2626" />
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}
            </main>
        </div>
    );
}
