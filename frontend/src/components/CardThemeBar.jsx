import React, { useState } from 'react';
import { Plus, Edit3, Trash2, Check, X, Sparkles, Image as ImageIcon } from 'lucide-react';
import { DEFAULT_CARD_THEMES, getSavedCardThemes, saveCardThemes } from '../data/cardThemes';
import { playSound } from '../utils/audio';

export default function CardThemeBar({
    socket,
    pin,
    activeThemeId = 'flag',
    onSelectTheme,
    themes = null,
    onThemesUpdate = null
}) {
    const [localThemes, setLocalThemes] = useState(getSavedCardThemes);
    const themeList = themes || localThemes;

    // Modal state for Theme Manager / Editor
    const [showThemeModal, setShowThemeModal] = useState(false);
    const [editingTheme, setEditingTheme] = useState(null);
    const [isCreatingNewTheme, setIsCreatingNewTheme] = useState(false);

    const currentTheme = themeList.find(t => t.id === activeThemeId) || themeList[0] || DEFAULT_CARD_THEMES[0];

    // Select theme handler
    const handleSelectTheme = (tId) => {
        const targetTheme = themeList.find(t => t.id === tId);
        if (onSelectTheme) {
            onSelectTheme(tId, targetTheme);
        }
        if (socket && pin && targetTheme) {
            socket.emit('room:message', {
                pin,
                event: 'card_match:theme_change',
                payload: {
                    themeId: tId,
                    themeData: targetTheme
                }
            });
        }
    };

    // Save edited / newly created theme
    const handleSaveTheme = (themeToSave) => {
        let updatedThemes;
        if (isCreatingNewTheme) {
            updatedThemes = [...themeList, themeToSave];
        } else {
            updatedThemes = themeList.map(t => t.id === themeToSave.id ? themeToSave : t);
        }
        setLocalThemes(updatedThemes);
        saveCardThemes(updatedThemes);
        if (onThemesUpdate) {
            onThemesUpdate(updatedThemes);
        }

        handleSelectTheme(themeToSave.id);

        setShowThemeModal(false);
        setEditingTheme(null);
        setIsCreatingNewTheme(false);
        playSound('correct');
    };

    // Delete custom theme
    const handleDeleteTheme = (tId) => {
        if (['flag', 'figures', 'safety'].includes(tId)) {
            alert('기본 테마(국기, 인물, 안전)는 삭제할 수 없습니다.');
            return;
        }
        if (window.confirm('이 테마를 삭제하시겠습니까?')) {
            const updated = themeList.filter(t => t.id !== tId);
            setLocalThemes(updated);
            saveCardThemes(updated);
            if (onThemesUpdate) {
                onThemesUpdate(updated);
            }
            handleSelectTheme('flag');
        }
    };

    // Image Upload handler for theme item
    const handleItemImageUpload = (itemIdx, e) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (uploadEvent) => {
            const dataUrl = uploadEvent.target.result;
            if (editingTheme) {
                const updatedItems = [...editingTheme.items];
                updatedItems[itemIdx] = {
                    ...updatedItems[itemIdx],
                    image: dataUrl
                };
                setEditingTheme({
                    ...editingTheme,
                    items: updatedItems
                });
            }
        };
        reader.readAsDataURL(file);
    };

    return (
        <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            flexWrap: 'wrap',
            padding: '8px 14px',
            background: '#ffffff',
            borderRadius: '16px',
            border: '2px solid #e2e8f0',
            boxShadow: '0 4px 12px rgba(0,0,0,0.03)',
            width: '100%',
            boxSizing: 'border-box'
        }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginRight: '4px' }}>
                <span style={{ fontSize: '0.92rem', fontWeight: '900', color: '#0f172a', whiteSpace: 'nowrap' }}>
                    🎴 게임 테마:
                </span>
            </div>

            {/* Horizontal Theme Buttons (Same size & neat alignment) */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', flex: 1 }}>
                {themeList.map(t => {
                    const isSelected = t.id === activeThemeId;
                    return (
                        <button
                            key={t.id}
                            type="button"
                            onClick={() => handleSelectTheme(t.id)}
                            style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '6px',
                                padding: '6px 16px',
                                minHeight: '38px',
                                borderRadius: '10px',
                                background: isSelected
                                    ? 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)'
                                    : '#f8fafc',
                                color: isSelected ? '#ffffff' : '#334155',
                                border: isSelected ? '2px solid #1e40af' : '1.5px solid #cbd5e1',
                                fontWeight: '900',
                                fontSize: '0.9rem',
                                cursor: 'pointer',
                                boxShadow: isSelected ? '0 4px 10px rgba(37, 99, 235, 0.3)' : '0 1px 3px rgba(0,0,0,0.04)',
                                transition: 'all 0.15s ease'
                            }}
                        >
                            <span style={{ fontSize: '1.1rem' }}>{t.icon || '🎴'}</span>
                            <span>{t.title}</span>
                            {isSelected && <span style={{ fontSize: '0.8rem', marginLeft: '2px' }}>✓</span>}
                        </button>
                    );
                })}

                {/* Add New Theme Button (Same height and aligned) */}
                <button
                    type="button"
                    onClick={() => {
                        setIsCreatingNewTheme(true);
                        setEditingTheme({
                            id: `theme_${Date.now()}`,
                            title: '새 테마',
                            icon: '✨',
                            description: '내가 만든 커스텀 카드 매칭 테마',
                            items: Array.from({ length: 10 }).map((_, i) => ({
                                id: `item_${i + 1}`,
                                name: `항목 ${i + 1}`,
                                emoji: ['🐶', '🐱', '🦁', '🐯', '🐰', '🐼', '🐨', '🦊', '🐻', '🐵'][i],
                                image: null
                            }))
                        });
                        setShowThemeModal(true);
                    }}
                    style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '6px',
                        padding: '6px 14px',
                        minHeight: '38px',
                        borderRadius: '10px',
                        background: '#10b981',
                        color: 'white',
                        border: '1.5px solid #059669',
                        fontWeight: '900',
                        fontSize: '0.88rem',
                        cursor: 'pointer',
                        boxShadow: '0 2px 6px rgba(16, 185, 129, 0.25)',
                        transition: 'all 0.15s ease'
                    }}
                    title="새로운 카드 매칭 테마를 직접 추가합니다"
                >
                    <Plus size={16} /> 새 테마 추가
                </button>

                {/* Edit Current Theme Button */}
                <button
                    type="button"
                    onClick={() => {
                        setIsCreatingNewTheme(false);
                        setEditingTheme(JSON.parse(JSON.stringify(currentTheme)));
                        setShowThemeModal(true);
                    }}
                    style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '6px',
                        padding: '6px 14px',
                        minHeight: '38px',
                        borderRadius: '10px',
                        background: '#475569',
                        color: 'white',
                        border: '1.5px solid #334155',
                        fontWeight: '800',
                        fontSize: '0.86rem',
                        cursor: 'pointer',
                        boxShadow: '0 2px 6px rgba(71, 85, 105, 0.2)',
                        transition: 'all 0.15s ease'
                    }}
                    title="현재 테마의 카드 이름과 이미지를 수정합니다"
                >
                    <Edit3 size={15} /> 테마 수정
                </button>
            </div>

            {/* THEME EDITOR MODAL */}
            {showThemeModal && editingTheme && (
                <div style={{
                    position: 'fixed',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    background: 'rgba(0,0,0,0.7)',
                    backdropFilter: 'blur(4px)',
                    zIndex: 99999,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: '20px'
                }}>
                    <div style={{
                        background: 'white',
                        borderRadius: '24px',
                        width: '100%',
                        maxWidth: '720px',
                        maxHeight: '90vh',
                        display: 'flex',
                        flexDirection: 'column',
                        overflow: 'hidden',
                        boxShadow: '0 20px 50px rgba(0,0,0,0.3)'
                    }}>
                        {/* Modal Header */}
                        <div style={{
                            padding: '16px 22px',
                            background: '#0f172a',
                            color: 'white',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between'
                        }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '1.15rem', fontWeight: '900' }}>
                                <Sparkles size={20} color="#fbbf24" />
                                <span>{isCreatingNewTheme ? '새 카드 매칭 테마 생성' : `[${editingTheme.title}] 테마 수정`}</span>
                            </div>
                            <button
                                type="button"
                                onClick={() => { setShowThemeModal(false); setEditingTheme(null); }}
                                style={{ background: 'transparent', border: 'none', color: '#94a3b8', cursor: 'pointer' }}
                            >
                                <X size={22} />
                            </button>
                        </div>

                        {/* Modal Body */}
                        <div style={{ padding: '20px', overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: '16px' }}>
                            {/* Theme Basic Info */}
                            <div style={{ display: 'grid', gridTemplateColumns: '80px 1fr', gap: '12px', alignItems: 'center' }}>
                                <div>
                                    <label style={{ fontSize: '0.8rem', fontWeight: '800', color: '#64748b' }}>아이콘</label>
                                    <input
                                        type="text"
                                        value={editingTheme.icon || '🎴'}
                                        onChange={(e) => setEditingTheme({ ...editingTheme, icon: e.target.value })}
                                        style={{ width: '100%', padding: '8px', textAlign: 'center', fontSize: '1.4rem', borderRadius: '8px', border: '1px solid #cbd5e1' }}
                                    />
                                </div>
                                <div>
                                    <label style={{ fontSize: '0.8rem', fontWeight: '800', color: '#64748b' }}>테마 이름</label>
                                    <input
                                        type="text"
                                        value={editingTheme.title}
                                        onChange={(e) => setEditingTheme({ ...editingTheme, title: e.target.value })}
                                        placeholder="예: 국기, 인물, 안전, 동물 등"
                                        style={{ width: '100%', padding: '10px', fontSize: '1rem', fontWeight: 'bold', borderRadius: '8px', border: '1px solid #cbd5e1' }}
                                    />
                                </div>
                            </div>

                            {/* 10 Items List & Image Uploads */}
                            <div>
                                <label style={{ fontSize: '0.85rem', fontWeight: '900', color: '#0f172a', display: 'block', marginBottom: '8px' }}>
                                    매칭 카드 10개 항목 설정 (이름 & 이미지 직접 업로드)
                                </label>

                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '10px' }}>
                                    {editingTheme.items.map((item, idx) => (
                                        <div
                                            key={idx}
                                            style={{
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: '10px',
                                                padding: '8px 12px',
                                                background: '#f8fafc',
                                                border: '1px solid #e2e8f0',
                                                borderRadius: '12px'
                                            }}
                                        >
                                            <span style={{ fontSize: '0.8rem', fontWeight: '900', color: '#64748b', minWidth: '20px' }}>
                                                {idx + 1}.
                                            </span>

                                            {/* Image preview / upload button */}
                                            <label style={{
                                                width: '44px',
                                                height: '44px',
                                                borderRadius: '8px',
                                                background: '#ffffff',
                                                border: '1.5px dashed #3b82f6',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                cursor: 'pointer',
                                                overflow: 'hidden',
                                                position: 'relative'
                                            }} title="이미지 파일 직접 업로드">
                                                {item.image ? (
                                                    <img src={item.image.startsWith('/') || item.image.startsWith('data:') ? item.image : `/flag/${item.image}`} alt="preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                                ) : (
                                                    <span style={{ fontSize: '1.4rem' }}>{item.emoji || '🖼️'}</span>
                                                )}
                                                <input
                                                    type="file"
                                                    accept="image/*"
                                                    onChange={(e) => handleItemImageUpload(idx, e)}
                                                    style={{ display: 'none' }}
                                                />
                                            </label>

                                            {/* Item Name */}
                                            <input
                                                type="text"
                                                value={item.name}
                                                onChange={(e) => {
                                                    const updatedItems = [...editingTheme.items];
                                                    updatedItems[idx] = { ...updatedItems[idx], name: e.target.value };
                                                    setEditingTheme({ ...editingTheme, items: updatedItems });
                                                }}
                                                placeholder={`항목 ${idx + 1} 이름`}
                                                style={{ flex: 1, padding: '6px 10px', fontSize: '0.88rem', fontWeight: '700', borderRadius: '6px', border: '1px solid #cbd5e1' }}
                                            />
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>

                        {/* Modal Footer Actions */}
                        <div style={{
                            padding: '14px 20px',
                            background: '#f1f5f9',
                            borderTop: '1px solid #e2e8f0',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between'
                        }}>
                            {!isCreatingNewTheme && !['flag', 'figures', 'safety'].includes(editingTheme.id) ? (
                                <button
                                    type="button"
                                    onClick={() => { handleDeleteTheme(editingTheme.id); setShowThemeModal(false); }}
                                    style={{ background: '#fee2e2', color: '#ef4444', border: '1px solid #fca5a5', padding: '8px 14px', borderRadius: '8px', fontWeight: '800', cursor: 'pointer' }}
                                >
                                    <Trash2 size={14} /> 테마 삭제
                                </button>
                            ) : <div />}

                            <div style={{ display: 'flex', gap: '8px' }}>
                                <button
                                    type="button"
                                    onClick={() => { setShowThemeModal(false); setEditingTheme(null); }}
                                    style={{ background: '#e2e8f0', color: '#475569', border: 'none', padding: '9px 18px', borderRadius: '8px', fontWeight: '800', cursor: 'pointer' }}
                                >
                                    취소
                                </button>
                                <button
                                    type="button"
                                    onClick={() => handleSaveTheme(editingTheme)}
                                    style={{ background: '#3b82f6', color: 'white', border: 'none', padding: '9px 22px', borderRadius: '8px', fontWeight: '900', cursor: 'pointer' }}
                                >
                                    <Check size={16} /> 테마 저장 & 적용
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
