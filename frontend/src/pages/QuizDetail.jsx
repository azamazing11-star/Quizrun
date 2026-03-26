import React from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { PlayCircle, MonitorPlay, Zap, ArrowLeft } from 'lucide-react';
import { SUB_TOPIC_NAMES } from '../utils/constants';

export default function QuizDetail({ socket }) {
    const navigate = useNavigate();
    const { topicId, subId } = useParams();
    const [counts, setCounts] = React.useState({ mcq: 0, short: 0 });
    const [quizData, setQuizData] = React.useState(null);

    React.useEffect(() => {
        // Priority 1: Backend
        socket.emit('quiz:getQuestions', { topicId, subId }, (res) => {
            if (res.success && res.data) {
                const data = res.data;
                const mcqCount = (data.mcq || []).length;
                const shortCount = (data.short || []).length;
                setCounts({ mcq: mcqCount, short: shortCount });
                setQuizData(data);
            } else {
                // Priority 2: LocalStorage
                const key = `quizrun_data_${topicId}_${subId}`;
                const saved = localStorage.getItem(key);
                if (saved) {
                    const data = JSON.parse(saved);
                    const mcqCount = (data.mcq || []).length;
                    const shortCount = (data.short || []).length;
                    setCounts({ mcq: mcqCount, short: shortCount });
                    setQuizData(data);
                }
            }
        });
    }, [topicId, subId, socket]);

    const handleStartGame = () => {
        let data = quizData;
        
        if (!data) {
            const key = `quizrun_data_${topicId}_${subId}`;
            const saved = localStorage.getItem(key);
            if (saved) {
                data = JSON.parse(saved);
            }
        }

        if (!data || ((data.mcq || []).length === 0 && (data.short || []).length === 0)) {
            alert('저장된 문제가 없습니다. 문제를 먼저 만들어주세요!');
            return;
        }

        const allQuestions = [...(data.mcq || []), ...(data.short || [])];
        
        if (allQuestions.length === 0) {
            alert('저장된 문제가 없습니다!');
            return;
        }

        // Default to the first found quiz type for basic logic, 
        // or we could show a selection modal.
        // For now, let's just start with everything.
        let subTopicTitle = '커스텀 퀴즈';
        const savedTopicData = localStorage.getItem(`quizrun_topic_${topicId}`);
        if (savedTopicData) {
            const subTopics = JSON.parse(savedTopicData);
            const sub = subTopics.find(s => s.id === subId);
            if (sub) subTopicTitle = sub.title;
        } else {
            const subTopicList = SUB_TOPIC_NAMES[topicId] || [];
            const subIndex = parseInt(subId.replace('sub-', '')) - 1;
            subTopicTitle = subTopicList[subIndex] || '커스텀 퀴즈';
        }

        const customQuiz = {
            title: subTopicTitle,
            quizType: (data.mcq && data.mcq.length > 0) ? 'mcq' : 'short', 
            questions: allQuestions
        };

        navigate('/host', { state: { customQuiz } });
    };

    return (
        <div className="full-screen-container" style={{ flexDirection: 'column', alignItems: 'center', paddingTop: '1rem', overflowX: 'hidden' }}>

            {/* Header Section: Compact Top Left with Back Button */}
            <div style={{ position: 'fixed', top: '15px', left: '20px', display: 'flex', alignItems: 'center', gap: '15px', zIndex: 300 }}>
                <img src="/logo.png" alt="Quizrun Logo" className="home-logo" style={{ height: '70px', cursor: 'pointer' }} onClick={() => navigate(`/topic/${topicId}`)} />
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
                        객관식: {counts.mcq}, 주관식: {counts.short}
                    </div>
                </button>

                <button
                    className="glass-button action-menu-btn"
                    style={{ background: 'var(--secondary)', color: 'white', boxShadow: '0 10px 20px rgba(245, 158, 11, 0.3)' }}
                    onClick={() => navigate('/create', { state: { topicId, subId } })}
                >
                    <MonitorPlay size={32} /> 문제 만들기
                </button>
            </div>
        </div>
    );
}
