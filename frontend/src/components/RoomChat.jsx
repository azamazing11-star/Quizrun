import React, { useState, useEffect, useRef } from 'react';
import { Send, Paperclip, Download, X, Pin, AlertCircle, Sparkles, Smile, Image as ImageIcon, FileText } from 'lucide-react';

/**
 * URL Linkifier helper: Safely renders text with clickable links
 */
function renderMessageText(text) {
    if (!text) return null;
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    const parts = text.split(urlRegex);

    return parts.map((part, index) => {
        if (part.match(urlRegex)) {
            return (
                <a
                    key={index}
                    href={part}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                        color: '#0284c7',
                        textDecoration: 'underline',
                        wordBreak: 'break-all',
                        fontWeight: '700'
                    }}
                    onClick={(e) => e.stopPropagation()}
                >
                    {part}
                </a>
            );
        }
        return part;
    });
}


const USER_BUBBLE_PALETTE = [
    { bg: '#eff6ff', border: '#bfdbfe', text: '#1e3a8a', tagBg: '#dbeafe', tagText: '#1e40af' }, // Blue
    { bg: '#f0fdf4', border: '#bbf7d0', text: '#14532d', tagBg: '#dcfce7', tagText: '#166534' }, // Green
    { bg: '#faf5ff', border: '#e9d5ff', text: '#581c87', tagBg: '#f3e8ff', tagText: '#6b21a8' }, // Purple
    { bg: '#fff7ed', border: '#fed7aa', text: '#7c2d12', tagBg: '#ffedd5', tagText: '#9a3412' }, // Orange/Peach
    { bg: '#fdf2f8', border: '#fbcfe8', text: '#831843', tagBg: '#fce7f3', tagText: '#9d174d' }, // Pink
    { bg: '#f0fdfa', border: '#99f6e4', text: '#134e4a', tagBg: '#ccfbf1', tagText: '#115e59' }, // Teal
    { bg: '#fefce8', border: '#fef08a', text: '#713f12', tagBg: '#fef9c3', tagText: '#854d0e' }, // Yellow/Gold
    { bg: '#f5f3ff', border: '#ddd6fe', text: '#3b0764', tagBg: '#ede9fe', tagText: '#5b21b6' }, // Indigo
    { bg: '#ecfeff', border: '#a5f3fc', text: '#164e63', tagBg: '#cffafe', tagText: '#155e75' }, // Cyan
    { bg: '#fff1f2', border: '#fecdd3', text: '#881337', tagBg: '#ffe4e6', tagText: '#9f1239' }, // Rose
];

function getBubbleTheme(sender) {
    if (!sender) return USER_BUBBLE_PALETTE[0];
    let hash = 0;
    for (let i = 0; i < sender.length; i++) {
        hash = (hash << 5) - hash + sender.charCodeAt(i);
        hash |= 0;
    }
    const idx = Math.abs(hash) % USER_BUBBLE_PALETTE.length;
    return USER_BUBBLE_PALETTE[idx];
}

const QUICK_STICKERS = [
    { label: '🔥 떡상', emoji: '🔥' },
    { label: '😭 떡락', emoji: '😭' },
    { label: '🎉 대박', emoji: '🎉' },
    { label: '👏 나이스', emoji: '👏' },
    { label: '🚀 가즈아', emoji: '🚀' }
];

export default function RoomChat({
    socket,
    pin,
    currentUser = { nickname: '참가자', isHost: false },
    isHost = false,
    onClose = null,
    isMobile = false
}) {
    const [messages, setMessages] = useState([]);
    const [pinnedNotice, setPinnedNotice] = useState(null);
    const [inputText, setInputText] = useState('');
    const [isNoticeCheck, setIsNoticeCheck] = useState(false);
    const [isHelpCheck, setIsHelpCheck] = useState(false);
    const [previewImage, setPreviewImage] = useState(null);
    const [isUploading, setIsUploading] = useState(false);
    const [uploadError, setUploadError] = useState(null);

    const fileInputRef = useRef(null);
    const messagesEndRef = useRef(null);
    const chatContainerRef = useRef(null);

    const cleanPin = String(pin || '').trim();
    const myNickname = currentUser?.nickname || (isHost ? '진행자' : '참가자');

    // Auto-scroll to bottom on new message
    const scrollToBottom = (smooth = true) => {
        if (messagesEndRef.current) {
            messagesEndRef.current.scrollIntoView({ behavior: smooth ? 'smooth' : 'auto' });
        }
    };

    // Load initial chat history & notice
    useEffect(() => {
        if (!socket || !cleanPin) return;

        socket.emit('chat:get_history', { pin: cleanPin }, (res) => {
            if (res && res.success) {
                if (Array.isArray(res.messages)) {
                    setMessages(res.messages);
                }
                if (res.notice) {
                    setPinnedNotice(res.notice);
                }
                setTimeout(() => scrollToBottom(false), 80);
            }
        });

        const handleNewMessage = (msg) => {
            if (!msg) return;
            setMessages(prev => {
                if (prev.some(m => m.id === msg.id)) return prev;
                return [...prev, msg];
            });
            setTimeout(() => scrollToBottom(true), 60);
        };

        const handleNoticeUpdated = (notice) => {
            setPinnedNotice(notice || null);
        };

        const handleChatCleared = () => {
            setMessages([]);
            setPinnedNotice(null);
        };

        socket.on('chat:message', handleNewMessage);
        socket.on('chat:notice_updated', handleNoticeUpdated);
        socket.on('chat:cleared', handleChatCleared);

        return () => {
            socket.off('chat:message', handleNewMessage);
            socket.off('chat:notice_updated', handleNoticeUpdated);
            socket.off('chat:cleared', handleChatCleared);
        };
    }, [socket, cleanPin]);

    // Send Message
    const handleSendMessage = (e) => {
        if (e) e.preventDefault();
        const text = inputText.trim();
        if (!text || !socket || !cleanPin) return;

        socket.emit('chat:send', {
            pin: cleanPin,
            nickname: myNickname,
            text,
            isNotice: isHost ? isNoticeCheck : false,
            isHelp: !isHost ? isHelpCheck : false
        }, (res) => {
            if (res && res.success) {
                setInputText('');
                setIsNoticeCheck(false);
                setIsHelpCheck(false);
            } else if (res && res.message) {
                alert(res.message);
            }
        });
    };

    // Send Quick Reaction
    const handleSendReaction = (emoji) => {
        if (!socket || !cleanPin) return;
        socket.emit('chat:reaction', {
            pin: cleanPin,
            nickname: myNickname,
            emoji
        });
    };

    // Upload & Send Image or File
    const handleFileSelect = async (e) => {
        const file = e.target.files?.[0];
        if (!file || !cleanPin) return;

        if (file.size > 20 * 1024 * 1024) {
            alert('파일 용량은 최대 20MB까지만 업로드 가능합니다.');
            return;
        }

        setIsUploading(true);
        setUploadError(null);

        try {
            const reader = new FileReader();
            reader.onload = async () => {
                try {
                    const base64Data = reader.result;
                    const res = await fetch('/api/upload', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            name: file.name,
                            data: base64Data,
                            pin: cleanPin,
                            isChat: true
                        })
                    });

                    const data = await res.json();
                    if (data && data.success && data.url) {
                        const isImg = file.type.startsWith('image/');
                        socket.emit('chat:send', {
                            pin: cleanPin,
                            nickname: myNickname,
                            text: '',
                            fileUrl: data.url,
                            fileName: file.name,
                            fileSize: file.size,
                            fileType: isImg ? 'image' : 'file',
                            isNotice: isHost ? isNoticeCheck : false,
                            isHelp: !isHost ? isHelpCheck : false
                        });
                        setIsNoticeCheck(false);
                        setIsHelpCheck(false);
                    } else {
                        throw new Error(data.message || '업로드 실패');
                    }
                } catch (err) {
                    console.error('[Upload Error]', err);
                    setUploadError('파일 업로드에 실패했습니다.');
                } finally {
                    setIsUploading(false);
                    if (fileInputRef.current) fileInputRef.current.value = '';
                }
            };
            reader.readAsDataURL(file);
        } catch (err) {
            console.error(err);
            setIsUploading(false);
        }
    };

    // Dismiss Pinned Notice (Host only)
    const handleClearNotice = () => {
        if (!isHost || !socket || !cleanPin) return;
        socket.emit('chat:clear_notice', { pin: cleanPin });
    };

    // Format file size
    const formatSize = (bytes) => {
        if (!bytes) return '';
        if (bytes < 1024) return bytes + ' B';
        if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
        return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
    };

    return (
        <div style={{
            display: 'flex',
            flexDirection: 'column',
            height: '100%',
            backgroundColor: '#ffffff',
            position: 'relative',
            overflow: 'hidden',
            fontFamily: 'inherit'
        }}>
            {/* Pinned Notice Banner (If present) */}
            {pinnedNotice && (
                <div style={{
                    padding: '8px 12px',
                    backgroundColor: '#fef3c7',
                    borderBottom: '1px solid #fde68a',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    fontSize: '0.82rem',
                    color: '#92400e',
                    boxShadow: '0 2px 4px rgba(0,0,0,0.02)',
                    zIndex: 10
                }}>
                    <Pin size={15} style={{ color: '#d97706', transform: 'rotate(45deg)', flexShrink: 0 }} />
                    <div style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        <strong style={{ marginRight: '6px' }}>[공지]</strong>
                        {pinnedNotice.text || pinnedNotice.fileName || '공지사항이 등록되었습니다.'}
                    </div>
                    {isHost && (
                        <button
                            onClick={handleClearNotice}
                            style={{
                                background: 'transparent',
                                border: 'none',
                                cursor: 'pointer',
                                color: '#b45309',
                                display: 'flex',
                                alignItems: 'center',
                                padding: '2px'
                            }}
                            title="공지 내리기"
                        >
                            <X size={14} />
                        </button>
                    )}
                </div>
            )}

            {/* Quick Live Reaction Stickers */}
            <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '6px 10px',
                background: '#f8fafc',
                borderBottom: '1px solid #e2e8f0',
                overflowX: 'auto',
                whiteSpace: 'nowrap',
                flexShrink: 0
            }}>
                <span style={{ fontSize: '0.72rem', fontWeight: '800', color: '#64748b', marginRight: '2px' }}>
                    퀵 리액션:
                </span>
                {QUICK_STICKERS.map((s) => (
                    <button
                        key={s.label}
                        onClick={() => handleSendReaction(s.emoji)}
                        style={{
                            background: '#ffffff',
                            border: '1px solid #cbd5e1',
                            borderRadius: '16px',
                            padding: '3px 8px',
                            fontSize: '0.76rem',
                            fontWeight: '700',
                            color: '#334155',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px',
                            boxShadow: '0 1px 2px rgba(0,0,0,0.03)',
                            transition: 'all 0.15s ease'
                        }}
                        onMouseEnter={(e) => {
                            e.currentTarget.style.transform = 'scale(1.05)';
                            e.currentTarget.style.borderColor = '#94a3b8';
                        }}
                        onMouseLeave={(e) => {
                            e.currentTarget.style.transform = 'scale(1)';
                            e.currentTarget.style.borderColor = '#cbd5e1';
                        }}
                    >
                        <span>{s.emoji}</span>
                        <span>{s.label.split(' ')[1]}</span>
                    </button>
                ))}
            </div>

            {/* Messages Scroll Area */}
            <div
                ref={chatContainerRef}
                style={{
                    flex: 1,
                    overflowY: 'auto',
                    padding: '12px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '10px',
                    background: '#f1f5f9'
                }}
            >
                {messages.length === 0 ? (
                    <div style={{
                        margin: 'auto',
                        textAlign: 'center',
                        color: '#94a3b8',
                        padding: '2rem 1rem'
                    }}>
                        <div style={{ fontSize: '2rem', marginBottom: '8px' }}>💬</div>
                        <div style={{ fontSize: '0.88rem', fontWeight: '800', color: '#475569' }}>
                            아직 대화가 없습니다
                        </div>
                        <div style={{ fontSize: '0.76rem', marginTop: '4px' }}>
                            메시지나 사진을 올려 참가자들과 소통해보세요!
                        </div>
                    </div>
                ) : (
                    messages.map((msg) => {
                        const isMe = msg.sender === myNickname;
                        const isMsgHost = Boolean(msg.isHost);
                        const isHelp = Boolean(msg.isHelp);
                        const userTheme = getBubbleTheme(msg.sender);

                        return (
                            <div
                                key={msg.id}
                                style={{
                                    display: 'flex',
                                    flexDirection: 'column',
                                    alignItems: isMe ? 'flex-end' : 'flex-start',
                                    gap: '2px',
                                    width: '100%'
                                }}
                            >
                                {/* Sender Info */}
                                <div style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '5px',
                                    fontSize: '0.74rem',
                                    color: '#64748b',
                                    padding: '0 4px'
                                }}>
                                    {isMsgHost && (
                                        <span style={{
                                            backgroundColor: '#f59e0b',
                                            color: '#ffffff',
                                            fontSize: '0.65rem',
                                            fontWeight: '900',
                                            padding: '1px 5px',
                                            borderRadius: '6px'
                                        }}>
                                            👑 진행자
                                        </span>
                                    )}
                                    {isHelp && (
                                        <span style={{
                                            backgroundColor: '#ea580c',
                                            color: '#ffffff',
                                            fontSize: '0.65rem',
                                            fontWeight: '900',
                                            padding: '1px 5px',
                                            borderRadius: '6px',
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '2px'
                                        }}>
                                            <AlertCircle size={10} /> 진행자 문의
                                        </span>
                                    )}
                                    <span style={{
                                        fontWeight: '800',
                                        color: isMe ? '#0284c7' : userTheme.tagText,
                                        background: isMe ? 'transparent' : userTheme.tagBg,
                                        padding: isMe ? '0' : '1px 6px',
                                        borderRadius: '6px'
                                    }}>
                                        {msg.sender}
                                    </span>
                                    <span style={{ fontSize: '0.68rem', color: '#94a3b8' }}>
                                        {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                    </span>
                                </div>

                                {/* Message Bubble */}
                                <div style={{
                                    maxWidth: '85%',
                                    backgroundColor: isMe
                                        ? (isHelp ? '#ffedd5' : '#0284c7')
                                        : (isMsgHost ? '#fef3c7' : (isHelp ? '#ffedd5' : userTheme.bg)),
                                    color: isMe
                                        ? (isHelp ? '#9a3412' : '#ffffff')
                                        : (isMsgHost ? '#78350f' : (isHelp ? '#9a3412' : userTheme.text)),
                                    borderRadius: isMe ? '16px 4px 16px 16px' : '4px 16px 16px 16px',
                                    padding: '8px 12px',
                                    boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
                                    fontSize: '0.86rem',
                                    lineHeight: 1.45,
                                    wordBreak: 'break-word',
                                    border: isMe
                                        ? (isHelp ? '1.5px solid #fdba74' : 'none')
                                        : (isMsgHost ? '1.5px solid #fbbf24' : (isHelp ? '1.5px solid #fdba74' : ('1.5px solid ' + userTheme.border)))
                                }}>
                                    {/* Text content */}
                                    {msg.text && (
                                        <div>{renderMessageText(msg.text)}</div>
                                    )}

                                    {/* Clean bot purified note */}
                                    {msg.wasFiltered && (
                                        <div style={{
                                            marginTop: '4px',
                                            fontSize: '0.68rem',
                                            fontWeight: '700',
                                            color: isMe ? '#e0f2fe' : '#059669',
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '3px'
                                        }}>
                                            <Sparkles size={11} />
                                            클린봇이 따뜻한 말로 정화했어요✨
                                        </div>
                                    )}

                                    {/* Image Attachment */}
                                    {msg.fileUrl && msg.fileType === 'image' && (
                                        <div style={{ marginTop: msg.text ? '6px' : 0 }}>
                                            <img
                                                src={msg.fileUrl}
                                                alt={msg.fileName || '업로드 이미지'}
                                                style={{
                                                    maxWidth: '100%',
                                                    maxHeight: '180px',
                                                    borderRadius: '8px',
                                                    cursor: 'pointer',
                                                    display: 'block',
                                                    objectFit: 'cover'
                                                }}
                                                onClick={() => setPreviewImage(msg.fileUrl)}
                                            />
                                            <div style={{
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'space-between',
                                                marginTop: '4px',
                                                fontSize: '0.72rem'
                                            }}>
                                                <span style={{ opacity: 0.85, fontSize: '0.68rem' }}>
                                                    {formatSize(msg.fileSize)}
                                                </span>
                                                <a
                                                    href={msg.fileUrl}
                                                    download={msg.fileName || 'image.png'}
                                                    style={{
                                                        display: 'inline-flex',
                                                        alignItems: 'center',
                                                        gap: '3px',
                                                        color: isMe ? '#ffffff' : '#0284c7',
                                                        textDecoration: 'none',
                                                        fontWeight: '800',
                                                        fontSize: '0.72rem',
                                                        background: 'rgba(0,0,0,0.06)',
                                                        padding: '2px 6px',
                                                        borderRadius: '6px'
                                                    }}
                                                >
                                                    <Download size={11} /> 다운로드
                                                </a>
                                            </div>
                                        </div>
                                    )}

                                    {/* File Attachment */}
                                    {msg.fileUrl && msg.fileType !== 'image' && (
                                        <div style={{
                                            marginTop: msg.text ? '6px' : 0,
                                            padding: '8px 10px',
                                            background: isMe ? 'rgba(255,255,255,0.15)' : '#f8fafc',
                                            borderRadius: '8px',
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '8px',
                                            border: '1px solid rgba(0,0,0,0.08)'
                                        }}>
                                            <FileText size={20} style={{ color: isMe ? '#ffffff' : '#0284c7', flexShrink: 0 }} />
                                            <div style={{ flex: 1, minWidth: 0 }}>
                                                <div style={{
                                                    fontSize: '0.78rem',
                                                    fontWeight: '700',
                                                    overflow: 'hidden',
                                                    textOverflow: 'ellipsis',
                                                    whiteSpace: 'nowrap'
                                                }}>
                                                    {msg.fileName || '첨부 파일'}
                                                </div>
                                                <div style={{ fontSize: '0.68rem', opacity: 0.8 }}>
                                                    {formatSize(msg.fileSize)}
                                                </div>
                                            </div>
                                            <a
                                                href={msg.fileUrl}
                                                download={msg.fileName || 'file'}
                                                style={{
                                                    padding: '4px 8px',
                                                    background: isMe ? '#ffffff' : '#0284c7',
                                                    color: isMe ? '#0284c7' : '#ffffff',
                                                    borderRadius: '6px',
                                                    fontSize: '0.72rem',
                                                    fontWeight: '800',
                                                    textDecoration: 'none',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    gap: '3px',
                                                    flexShrink: 0
                                                }}
                                            >
                                                <Download size={11} /> 다운
                                            </a>
                                        </div>
                                    )}
                                </div>
                            </div>
                        );
                    })
                )}
                <div ref={messagesEndRef} />
            </div>

            {/* Upload progress & error banner */}
            {isUploading && (
                <div style={{
                    padding: '4px 12px',
                    background: '#e0f2fe',
                    color: '#0369a1',
                    fontSize: '0.76rem',
                    fontWeight: '700',
                    textAlign: 'center'
                }}>
                    파일 업로드 중입니다... 잠시만 기다려주세요 ⏳
                </div>
            )}
            {uploadError && (
                <div style={{
                    padding: '4px 12px',
                    background: '#fee2e2',
                    color: '#dc2626',
                    fontSize: '0.76rem',
                    fontWeight: '700',
                    textAlign: 'center'
                }}>
                    {uploadError}
                </div>
            )}

            {/* Input Controls Area */}
            <form
                onSubmit={handleSendMessage}
                style={{
                    padding: '8px 10px',
                    borderTop: '1px solid #e2e8f0',
                    backgroundColor: '#ffffff',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '6px'
                }}
            >
                {/* Host Notice or Help Checkbox */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', fontSize: '0.75rem' }}>
                    {isHost ? (
                        <label style={{ display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer', color: '#b45309', fontWeight: '700' }}>
                            <input
                                type="checkbox"
                                checked={isNoticeCheck}
                                onChange={(e) => setIsNoticeCheck(e.target.checked)}
                            />
                            📌 상단 공지로 등록
                        </label>
                    ) : (
                        <label style={{ display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer', color: '#c2410c', fontWeight: '700' }}>
                            <input
                                type="checkbox"
                                checked={isHelpCheck}
                                onChange={(e) => setIsHelpCheck(e.target.checked)}
                            />
                            🙋 진행자 문의 (강조 표시)
                        </label>
                    )}
                </div>

                {/* Text & Action Row */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    {/* Hidden File Input */}
                    <input
                        type="file"
                        ref={fileInputRef}
                        style={{ display: 'none' }}
                        onChange={handleFileSelect}
                        accept="image/*,.pdf,.doc,.docx,.txt"
                    />

                    {/* Attachment Button */}
                    <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        disabled={isUploading}
                        style={{
                            width: '36px',
                            height: '36px',
                            borderRadius: '10px',
                            border: '1px solid #cbd5e1',
                            background: '#f8fafc',
                            color: '#475569',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            cursor: 'pointer',
                            flexShrink: 0
                        }}
                        title="사진 또는 파일 첨부"
                    >
                        <Paperclip size={18} />
                    </button>

                    {/* Text Input */}
                    <input
                        type="text"
                        value={inputText}
                        onChange={(e) => setInputText(e.target.value)}
                        placeholder={isNoticeCheck ? "상단에 고정할 공지사항을 입력하세요..." : (isHelpCheck ? "진행자에게 질문할 내용을 입력하세요..." : "메시지를 입력하세요 (링크 첨부 가능)...")}
                        style={{
                            flex: 1,
                            padding: '8px 12px',
                            borderRadius: '10px',
                            border: '1.5px solid #cbd5e1',
                            outline: 'none',
                            fontSize: '0.86rem',
                            transition: 'border-color 0.2s',
                            boxSizing: 'border-box'
                        }}
                        onFocus={(e) => { e.target.style.borderColor = '#0284c7'; }}
                        onBlur={(e) => { e.target.style.borderColor = '#cbd5e1'; }}
                    />

                    {/* Send Button */}
                    <button
                        type="submit"
                        disabled={!inputText.trim()}
                        style={{
                            width: '36px',
                            height: '36px',
                            borderRadius: '10px',
                            border: 'none',
                            background: inputText.trim() ? '#0284c7' : '#94a3b8',
                            color: '#ffffff',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            cursor: inputText.trim() ? 'pointer' : 'default',
                            flexShrink: 0,
                            transition: 'background-color 0.2s'
                        }}
                    >
                        <Send size={16} />
                    </button>
                </div>
            </form>

            {/* Image Preview Modal */}
            {previewImage && (
                <div
                    onClick={() => setPreviewImage(null)}
                    style={{
                        position: 'fixed',
                        top: 0,
                        left: 0,
                        right: 0,
                        bottom: 0,
                        backgroundColor: 'rgba(0,0,0,0.85)',
                        zIndex: 99999,
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        padding: '1rem'
                    }}
                >
                    <div style={{ position: 'relative', maxWidth: '90vw', maxHeight: '85vh' }} onClick={(e) => e.stopPropagation()}>
                        <img
                            src={previewImage}
                            alt="Preview"
                            style={{
                                maxWidth: '100%',
                                maxHeight: '80vh',
                                objectFit: 'contain',
                                borderRadius: '12px',
                                display: 'block'
                            }}
                        />
                        <div style={{
                            marginTop: '12px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '12px'
                        }}>
                            <a
                                href={previewImage}
                                download="image.png"
                                style={{
                                    padding: '8px 16px',
                                    backgroundColor: '#0284c7',
                                    color: '#ffffff',
                                    borderRadius: '8px',
                                    fontWeight: '800',
                                    fontSize: '0.88rem',
                                    textDecoration: 'none',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '6px'
                                }}
                            >
                                <Download size={16} /> 원본 다운로드
                            </a>
                            <button
                                onClick={() => setPreviewImage(null)}
                                style={{
                                    padding: '8px 16px',
                                    backgroundColor: 'rgba(255,255,255,0.2)',
                                    color: '#ffffff',
                                    border: 'none',
                                    borderRadius: '8px',
                                    fontWeight: '800',
                                    fontSize: '0.88rem',
                                    cursor: 'pointer'
                                }}
                            >
                                닫기
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
