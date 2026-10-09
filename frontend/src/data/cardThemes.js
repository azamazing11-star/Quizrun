// Card Match Game Theme Data & Presets
// Default Categories: '국기' (Flags), '인물' (Figures), '안전' (Safety)
// Supports custom user themes, image uploads (data URL / server URL), and local persistence.

export const DEFAULT_CARD_THEMES = [
    {
        id: 'flag',
        title: '국기',
        icon: '🚩',
        description: '세계 여러 나라의 국기를 맞춰보세요!',
        items: [
            { id: 'kr', name: '대한민국', image: '/flag/대한민국.jpg', emoji: '🇰🇷' },
            { id: 'us', name: '미국', image: '/flag/미국.jpg', emoji: '🇺🇸' },
            { id: 'gb', name: '영국', image: '/flag/영국.jpg', emoji: '🇬🇧' },
            { id: 'fr', name: '프랑스', image: '/flag/프랑스.jpg', emoji: '🇫🇷' },
            { id: 'de', name: '독일', image: '/flag/독일.jpg', emoji: '🇩🇪' },
            { id: 'ca', name: '캐나다', image: '/flag/캐나다.jpg', emoji: '🇨🇦' },
            { id: 'br', name: '브라질', image: '/flag/브라질.jpg', emoji: '🇧🇷' },
            { id: 'it', name: '이탈리아', image: '/flag/이탈리아.jpg', emoji: '🇮🇹' },
            { id: 'es', name: '스페인', image: '/flag/스페인.jpg', emoji: '🇪🇸' },
            { id: 'ch', name: '스위스', image: '/flag/스위스.jpg', emoji: '🇨🇭' }
        ]
    },
    {
        id: 'figures',
        title: '인물',
        icon: '👑',
        description: '역사를 빛낸 위인들과 인물을 맞춰보세요!',
        items: [
            { id: 'sejong', name: '세종대왕', emoji: '📜', desc: '훈민정음 창제', bg: '#fef3c7', color: '#b45309' },
            { id: 'yisunsin', name: '이순신', emoji: '⚔️', desc: '거북선과 한산대첩', bg: '#dbeafe', color: '#1d4ed8' },
            { id: 'einstein', name: '아인슈타인', emoji: '⚛️', desc: '상대성 이론', bg: '#ede9fe', color: '#6d28d9' },
            { id: 'edison', name: '에디슨', emoji: '💡', desc: '전구와 축음기 발명', bg: '#fef9c3', color: '#a16207' },
            { id: 'saimdang', name: '신사임당', emoji: '🎨', desc: '예술가이자 어머니', bg: '#fce7f3', color: '#be185d' },
            { id: 'lincoln', name: '링컨', emoji: '🎩', desc: '노예 해방 선언', bg: '#f1f5f9', color: '#334155' },
            { id: 'newton', name: '뉴턴', emoji: '🍎', desc: '만유인력의 법칙', bg: '#dcfce7', color: '#15803d' },
            { id: 'davinci', name: '다빈치', emoji: '🖌️', desc: '모나리자·르네상스', bg: '#ffedd5', color: '#c2410c' },
            { id: 'ahn', name: '안중근', emoji: '🖐️', desc: '하얼빈 의거·단지동맹', bg: '#fee2e2', color: '#b91c1c' },
            { id: 'ryu', name: '유관순', emoji: '🇰🇷', desc: '3·1 만세 운동', bg: '#e0f2fe', color: '#0369a1' }
        ]
    },
    {
        id: 'safety',
        title: '안전',
        icon: '🦺',
        description: '생활 속 필수 안전 표지와 수칙을 맞춰보세요!',
        items: [
            { id: 'fire_ext', name: '소화기', emoji: '🧯', desc: '초기 화재 진압', bg: '#fee2e2', color: '#dc2626' },
            { id: 'exit', name: '비상구', emoji: '🚪', desc: '화재 대피 출구', bg: '#dcfce7', color: '#16a34a' },
            { id: 'crosswalk', name: '횡단보도', emoji: '🚶‍♂️', desc: '보행자 도로 횡단', bg: '#dbeafe', color: '#2563eb' },
            { id: 'helmet', name: '안전모', emoji: '⛑️', desc: '머리 보호구 착용', bg: '#fef3c7', color: '#d97706' },
            { id: 'first_aid', name: '구급상자', emoji: '🩹', desc: '응급 처치 도구', bg: '#fce7f3', color: '#db2777' },
            { id: 'electric', name: '감전주의', emoji: '⚡', desc: '고전압 감전 위험', bg: '#fef9c3', color: '#ca8a04' },
            { id: 'no_smoking', name: '금연구역', emoji: '🚭', desc: '담배 흡연 금지', bg: '#ffe4e6', color: '#e11d48' },
            { id: 'gas_mask', name: '방독면', emoji: '😷', desc: '유독가스·연기 차단', bg: '#f1f5f9', color: '#475569' },
            { id: 'aed', name: '심장충격기(AED)', emoji: '💓', desc: '심정지 응급 구조', bg: '#fae8ff', color: '#a21caf' },
            { id: 'slip', name: '미끄럼주의', emoji: '⚠️', desc: '바닥 미끄러짐 주의', bg: '#ffedd5', color: '#ea580c' }
        ]
    }
];

const THEME_STORAGE_KEY = 'quizrun_card_match_custom_themes';

// Load all themes (defaults + user customized/added themes)
export function getSavedCardThemes() {
    try {
        const custom = localStorage.getItem(THEME_STORAGE_KEY);
        if (custom) {
            const parsed = JSON.parse(custom);
            if (Array.isArray(parsed) && parsed.length > 0) {
                return parsed;
            }
        }
    } catch (e) {
        console.warn('Failed to load card themes from storage:', e);
    }
    return DEFAULT_CARD_THEMES;
}

// Save themes to localStorage
export function saveCardThemes(themes) {
    try {
        localStorage.setItem(THEME_STORAGE_KEY, JSON.stringify(themes));
    } catch (e) {
        console.error('Failed to save card themes to storage:', e);
    }
}
