import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { PlusCircle, Trash2, ArrowLeft, CheckCircle, Circle, MonitorPlay, ClipboardList, Plus, Download } from 'lucide-react';

export default function Create({ socket }) {
    const navigate = useNavigate();
    const location = useLocation();
    const { topicId, subId } = location.state || {};
    
    const [mode, setMode] = useState(null); // 'mcq' | 'short'
    const [questions, setQuestions] = useState([
        { text: '', options: ['', '', '', ''], correctIndex: 0, answer: '' }
    ]);
    const [pasteAreaOpen, setPasteAreaOpen] = useState(false);
    const [pastedText, setPastedText] = useState('');

    useEffect(() => {
        if (mode && topicId && subId) {
            // Priority: Check backend
            socket.emit('quiz:getQuestions', { topicId, subId }, (res) => {
                if (res.success && res.data) {
                    const data = res.data;
                    const existing = mode === 'mcq' ? data.mcq : data.short;
                    if (existing && existing.length > 0) {
                        setQuestions(existing);
                        return;
                    }
                }
                setQuestions([{ text: '', options: ['', '', '', ''], correctIndex: 0, answer: '' }]);
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

                return {
                    text: questionText,
                    options: finalOptions,
                    correctIndex: correctIdx,
                    answer: finalOptions[correctIdx] || ''
                };
            } else {
                return {
                    text: (cols[0] || '').trim(),
                    answer: (cols[1] || '').trim(),
                    options: ['', '', '', ''],
                    correctIndex: 0
                };
            }
        }).filter(q => q.text);

        if (newQuestions.length > 0) {
            setQuestions(newQuestions);
            setPasteAreaOpen(false);
            setPastedText('');
            alert(`${newQuestions.length}개의 문제를 성공적으로 불러왔습니다!`);
        } else {
            alert('유효한 데이터를 찾을 수 없습니다. 형식을 확인해주세요.');
        }
    };

    const handleDownloadExcel = () => {
        let content = "";
        if (mode === 'mcq') {
            content = questions.map(q => {
                const optionsStr = q.options.join(' / ');
                const correctNum = q.correctIndex + 1;
                return `${q.text}\t${optionsStr}\t${correctNum}`;
            }).join('\n');
        } else {
            content = questions.map(q => `${q.text}\t${q.answer}`).join('\n');
        }

        const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `${mode === 'mcq' ? '객관식' : '주관식'}_문제_${new Date().getTime()}.txt`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const handleAddQuestion = () => {
        setQuestions([...questions, { text: '', options: ['', '', '', ''], correctIndex: 0, answer: '' }]);
    };

    const handleRemoveQuestion = (index) => {
        if (questions.length > 1) {
            const newQuestions = questions.filter((_, i) => i !== index);
            setQuestions(newQuestions);
        }
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

    const handleCreateRoom = () => {
        for (let i = 0; i < questions.length; i++) {
            const q = questions[i];
            if (!q.text.trim()) {
                alert(`${i + 1}번 문제의 질문을 입력해주세요.`);
                return;
            }
            if (mode === 'mcq') {
                for (let j = 0; j < 4; j++) {
                    if (!q.options[j].trim()) {
                        alert(`${i + 1}번 문제의 ${j + 1}번째 선택지를 입력해주세요.`);
                        return;
                    }
                }
            } else {
                if (!q.answer.trim()) {
                    alert(`${i + 1}번 문제의 정답을 입력해주세요.`);
                    return;
                }
            }
        }

        if (topicId && subId) {
            const key = `quizrun_data_${topicId}_${subId}`;
            const existing = localStorage.getItem(key);
            let data = existing ? JSON.parse(existing) : { mcq: [], short: [] };

            if (mode === 'mcq') {
                data.mcq = questions;
            } else {
                data.short = questions;
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
            const customQuiz = {
                title: mode === 'mcq' ? '객관식 퀴즈' : '주관식 퀴즈',
                quizType: mode,
                questions: questions
            };
            navigate('/host', { state: { customQuiz } });
        }
    };

    if (!mode) {
        return (
            <div className="full-screen-container" style={{ justifyContent: 'center', alignItems: 'center', background: '#f8fafc' }}>
                <div className="glass-panel" style={{ padding: '3rem', textAlign: 'center', maxWidth: '600px', width: '90%' }}>
                    <h1 style={{ color: 'var(--primary)', marginBottom: '2rem' }}>어떤 퀴즈를 만들까요?</h1>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem' }}>
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
                    </div>
                    <button
                        onClick={() => navigate('/')}
                        className="glass-button secondary"
                        style={{ marginTop: '3rem', width: '100%' }}
                    >
                        <ArrowLeft size={18} /> 홈으로 돌아가기
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
                <h2 style={{ margin: 0, color: 'var(--primary)' }}>
                    {mode === 'mcq' ? '새로운 객관식 퀴즈' : '새로운 주관식 퀴즈'}
                </h2>
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
                        onClick={() => setPasteAreaOpen(!pasteAreaOpen)}
                    >
                        <ClipboardList size={18} /> 엑셀 데이터 붙여넣기
                    </button>
                </div>

                {pasteAreaOpen && (
                    <div className="glass-panel animate-slide-up" style={{ padding: '2rem', background: '#f0f9ff', border: '2px dashed var(--primary)' }}>
                        <h4 style={{ marginBottom: '10px' }}>엑셀 데이터 붙여넣기</h4>
                        <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '15px' }}>
                            {mode === 'mcq' 
                                ? '엑셀에서 [질문 | 선택지1/2/3/4 | 정답번호] 영역을 복사해서 붙여넣으세요.' 
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

                {questions.map((q, qIndex) => (
                    <div key={qIndex} className="glass-panel" style={{ padding: '2rem', position: 'relative', width: '100%' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                            <h3 style={{ margin: 0, color: 'var(--text)' }}>문제 {qIndex + 1}</h3>
                            {questions.length > 1 && (
                                <button
                                    onClick={() => handleRemoveQuestion(qIndex)}
                                    style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}
                                >
                                    <Trash2 size={18} /> 삭제
                                </button>
                            )}
                        </div>

                        <input
                            type="text"
                            className="glass-input"
                            placeholder="질문을 입력하세요"
                            value={q.text}
                            onChange={(e) => handleQuestionTextChange(qIndex, e.target.value)}
                            style={{ marginBottom: '1.5rem', textAlign: 'left' }}
                        />

                        {mode === 'mcq' ? (
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
                        <p style={{ marginTop: '12px', fontSize: '0.9rem', color: 'var(--text-muted)', textAlign: 'left' }}>
                            {mode === 'mcq' ? '☝️ 정답 좌측의 체크 원을 눌러 진짜 정답을 지정하세요.' : '☝️ 이 칸에 정확한 정답 텍스트를 입력하세요.'}
                        </p>
                    </div>
                ))}
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
        </div>
    );
}
