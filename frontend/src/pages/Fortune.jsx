import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { ArrowLeft, Camera, RefreshCw, Sparkles, Trophy, Shuffle, CheckCircle, Eye, Hand, Smile, Zap, Star, Heart, DollarSign, Play, Award, Check } from 'lucide-react';
import { playSound } from '../utils/audio';

// --- TAROT DECK DATA (22 Major Arcana) ---
const TAROT_DECK = [
    {
        id: 0,
        name: '바보 (The Fool)',
        numeral: '0',
        keywords: '새로운 시작, 순수함, 자유로운 모험',
        icon: '🎒',
        color: '#f59e0b',
        general: '새로운 가능성과 설레는 여정이 눈앞에 열립니다. 주저하지 말고 당신의 순수한 직관을 믿고 첫 발을 내딛으세요.',
        love: '예기치 않은 장소에서 운명적인 만남이 찾아옵니다. 솔직하고 꾸밈없는 모습이 가장 큰 매력입니다.',
        money: '새로운 프로젝트나 투자의 기회가 싹틉니다. 기존의 틀을 깬 신선한 발상이 뜻밖의 수익을 부릅니다.',
        advice: '두려움을 버리고 호기심을 따르세요. 오늘 당신의 발걸음마다 행운이 깃듭니다.'
    },
    {
        id: 1,
        name: '마법사 (The Magician)',
        numeral: 'I',
        keywords: '창조력, 자신감, 잠재력 발휘',
        icon: '🪄',
        color: '#3b82f6',
        general: '원하는 모든 것을 현실로 바꿀 수 있는 지혜와 재능이 충만합니다. 당신 안에 잠든 무한한 잠재력을 펼쳐보세요.',
        love: '대화의 주도권을 쥐며 매력적인 호감을 이끌어냅니다. 적극적으로 표현하면 상대의 마음을 얻습니다.',
        money: '아이디어가 곧 황금이 되는 날입니다. 기획이나 프레젠테이션, 사업 추진에서 큰 성과를 거둡니다.',
        advice: '당신에게는 이미 성공에 필요한 모든 도구가 손에 쥐어져 있습니다.'
    },
    {
        id: 2,
        name: '여사제 (The High Priestess)',
        numeral: 'II',
        keywords: '깊은 통찰, 직관, 신비로운 지혜',
        icon: '📜',
        color: '#6366f1',
        general: '외부의 소음에서 벗어나 내면의 고요한 목소리에 귀 기울일 때입니다. 당신의 육감과 통찰력이 정답을 가리킵니다.',
        love: '비밀스럽고 깊은 정신적 유대감이 형성됩니다. 말하지 않아도 마음이 통하는 깊은 인연입니다.',
        money: '무리한 지출보다는 신중한 자산 관리와 정보 분석이 이롭습니다. 숨겨진 알짜 정보를 발견합니다.',
        advice: '서두르지 말고 때를 기다리세요. 침묵 속에 가장 지혜로운 해답이 있습니다.'
    },
    {
        id: 3,
        name: '여황제 (The Empress)',
        numeral: 'III',
        keywords: '풍요, 번영, 따뜻한 포용력',
        icon: '👑',
        color: '#10b981',
        general: '물질적으로나 정신적으로 더없이 풍요롭고 평화로운 결실의 기운이 가득합니다. 당신의 노력이 만개합니다.',
        love: '따스하고 다정한 애정이 흘러넘칩니다. 연인과의 관계가 한층 깊어지며 행복감이 충만합니다.',
        money: '풍족한 금전운이 따르며 그동안 공들인 곳에서 달콤한 결실을 거두게 됩니다.',
        advice: '자연의 풍요로움을 만끽하고, 당신을 사랑하는 이들과 따뜻한 기쁨을 나누세요.'
    },
    {
        id: 4,
        name: '황제 (The Emperor)',
        numeral: 'IV',
        keywords: '리더십, 안정, 확고한 의지',
        icon: '🏛️',
        color: '#ef4444',
        general: '흔들리지 않는 굳건한 바위처럼 확고한 리더십과 추진력으로 상황을 장악합니다. 당신의 권위와 신망이 높아집니다.',
        love: '책임감 있고 든든한 태도로 관계의 중심을 잡습니다. 신뢰가 깊어지는 하루입니다.',
        money: '계획적이고 체계적인 재정 운용으로 큰 자산을 단단히 지키고 불려 나갑니다.',
        advice: '원칙과 기준을 세우고 흔들림 없이 밀고 나가세요. 당신이 곧 기준입니다.'
    },
    {
        id: 6,
        name: '연인 (The Lovers)',
        numeral: 'VI',
        keywords: '사랑, 조화, 올바른 선택',
        icon: '💖',
        color: '#ec4899',
        general: '마음이 통하는 이들과의 황홀한 화합과 조화가 이루어집니다. 인생의 중요한 기로에서 가슴 뛰는 올바른 선택을 내립니다.',
        love: '더없이 달콤하고 낭만적인 사랑의 기운입니다. 고백이나 깊은 대화에 최적의 날입니다.',
        money: '믿음직한 파트너와의 동업이나 협업을 통해 시너지 효과를 창출하고 큰 이익을 냅니다.',
        advice: '머리의 계산보다 가슴의 끌림을 믿으세요. 사랑과 진심이 길을 열어줍니다.'
    },
    {
        id: 7,
        name: '전차 (The Chariot)',
        numeral: 'VII',
        keywords: '승리, 돌파, 강력한 전진',
        icon: '🛡️',
        color: '#0284c7',
        general: '앞을 가로막는 장애물을 시원하게 돌파하며 목표를 향해 무섭게 질주합니다. 눈부신 승리가 코앞에 있습니다.',
        love: '망설임을 끝내고 직진할 때입니다. 상대방의 마음에 확신을 주는 추진력이 필요합니다.',
        money: '경쟁에서 이겨내고 원하는 계약이나 성과급을 쟁취합니다. 공격적인 전진이 승리를 부릅니다.',
        advice: '목표에 시선을 고정하고 속도를 내세요. 누구도 당신의 질주를 멈출 수 없습니다.'
    },
    {
        id: 10,
        name: '운명의 수레바퀴 (Wheel of Fortune)',
        numeral: 'X',
        keywords: '행운의 전환, 기회, 운명적 타이밍',
        icon: '🎡',
        color: '#8b5cf6',
        general: '운명의 거대한 수레바퀴가 당신을 향해 미소 짓습니다. 막혔던 흐름이 시원하게 풀리며 일생일대의 기회가 찾아옵니다.',
        love: '우연한 만남이 필연이 되는 운명적 로맨스가 시작됩니다. 거스를 수 없는 매력에 이끌립니다.',
        money: '생각지 못한 횡재수나 투자 대박의 기운이 깃듭니다. 반전의 타이밍을 잡으세요.',
        advice: '변화의 물결을 유쾌하게 타세요. 지금은 운명이 당신의 편을 들어주는 순간입니다.'
    },
    {
        id: 17,
        name: '별 (The Star)',
        numeral: 'XVII',
        keywords: '희망, 영감, 반짝이는 미래',
        icon: '⭐',
        color: '#06b6d4',
        general: '어둠을 뚫고 솟아오른 샛별처럼 찬란한 희망과 긍정의 에너지가 충만합니다. 당신이 꿈꾸는 미래가 선명해집니다.',
        love: '서로에게 힐링이 되어주는 평화롭고 순수한 사랑이 샘솟습니다.',
        money: '장기적으로 큰 빛을 발할 유망한 분야에서 희망적인 기운이 감지됩니다.',
        advice: '당신의 꿈을 믿으세요. 밤하늘의 가장 밝은 별이 당신의 길을 비추고 있습니다.'
    },
    {
        id: 19,
        name: '태양 (The Sun)',
        numeral: 'XIX',
        keywords: '대성공, 찬란한 활력, 기쁨',
        icon: '☀️',
        color: '#f97316',
        general: '황금빛 태양이 온 누리를 비추듯, 모든 일에 최고의 성공과 기쁨이 쏟아집니다. 최고의 길조입니다!',
        love: '숨길 수 없는 환한 미소와 행복이 가득합니다. 만인의 축복을 받는 사랑입니다.',
        money: '원하는 이상의 수익과 성취를 이루며 재정적으로 가장 화려한 전성기를 맞이합니다.',
        advice: '마음껏 기뻐하고 당당하게 즐기세요. 당신의 앞날은 눈부시게 빛납니다.'
    },
    {
        id: 21,
        name: '세계 (The World)',
        numeral: 'XXI',
        keywords: '완성, 궁극의 성취, 새로운 차원',
        icon: '🌍',
        color: '#14b8a6',
        general: '하나의 거대한 주기가 완성되며 완벽한 만족과 행복에 도달합니다. 당신의 무대가 세계로 확장됩니다.',
        love: '결혼이나 오랜 연인의 약속처럼 관계의 궁극적인 완성을 이루는 아름다운 시기입니다.',
        money: '오랫동안 공들인 프로젝트나 목표가 최종 완성되며 영광스러운 보상을 얻습니다.',
        advice: '당신이 이룬 놀라운 결실을 자축하세요. 이제 더 넓은 세상이 당신을 기다립니다.'
    }
];

// --- PALMISTRY READING TEMPLATES ---
const PALM_RESULTS = [
    {
        score: 98,
        title: '천하대부 삼지창 황금 손금 (天下大富)',
        summary: '손바닥 중심에서 솟구치는 운명선과 굵고 선명한 4대 기본선이 완벽한 균형을 이루어, 중년 이후 막대한 부와 명예를 거머쥘 최고의 제왕적 길상입니다.',
        lifeLine: '뿌리가 깊고 두터운 생명선이 손목 부근까지 힘차게 뻗어 타고난 활력과 질병에 대한 자연 치유력이 뛰어납니다. 100세 무병장수를 누릴 건강운입니다.',
        headLine: '검지 쪽에서 완만하게 뻗어 나가는 긴 두뇌선은 뛰어난 사업적 직관과 냉철한 분석력을 뜻합니다. 위기 속에서 남들이 보지 못하는 블루오션을 낚아챕니다.',
        heartLine: '끝이 검지와 중지 사이로 시원하게 뻗은 감정선은 깊고 진실된 인연과 두터운 인복을 보장합니다. 좋은 파트너와 귀인이 평생 곁을 지킵니다.',
        wealthLine: '손바닥 한가운데를 관통하여 솟아오른 뚜렷한 재물선은 마르지 않는 자산 축적과 투자 대박의 기운을 강력히 암시합니다.',
        luckyTip: '동쪽 방향의 귀인과 인연이 닿으면 재물운이 2배로 증폭됩니다.'
    },
    {
        score: 94,
        title: '만사형통 입신양명 솔로몬 손금 (萬事亨通)',
        summary: '생명선과 두뇌선이 이상적인 황금각을 형성하여, 어떤 조직에서든 최정상의 리더로 우뚝 설 명예운과 두터운 신망을 지녔습니다.',
        lifeLine: '곡선이 부드럽고 잔주름 없이 매끄러운 생명선으로, 스트레스에 굴하지 않는 강철 멘탈과 지치지 않는 에너지를 자랑합니다.',
        headLine: '손바닥을 완만하게 가로지르는 창의적 두뇌선은 예술적 감각과 통찰력이 남다름을 보여줍니다. 기획이나 아이디어로 큰 성공을 거둡니다.',
        heartLine: '완만한 곡선을 그리는 감정선은 타인을 배려하는 따스한 성품과 온화한 덕망을 나타내어 주변 사람들의 두터운 신망을 한몸에 받습니다.',
        wealthLine: '중앙에서 뚜렷하게 갈라지는 사업선이 든든하게 받쳐주어 자수성가형 부자로 자산을 안정적으로 불려 나갈 운명입니다.',
        luckyTip: '새로운 도전이나 자격증 취득을 망설이지 마세요. 곧 결실이 맺힙니다.'
    },
    {
        score: 92,
        title: '재물화수분 일확천금 M자형 손금 (一攫千金)',
        summary: '생명선, 두뇌선, 감정선, 운명선이 유기적으로 연결되어 선명한 M자를 그리는 전설의 억만장자 손금! 자신이 결심한 목표는 기필코 쟁취해 냅니다.',
        lifeLine: '하단부로 갈수록 두터워지는 생명선으로 나이가 들수록 건강과 정력이 더욱 왕성해지는 대기만성형 체질입니다.',
        headLine: '곧게 뻗은 이성적 두뇌선은 숫자에 밝고 결단력이 신속하여 금융, 투자, 비즈니스 방면에서 탁월한 수완을 발휘합니다.',
        heartLine: '깊고 곧은 감정선은 한결같은 신뢰와 우직함을 상징하며, 동업자와의 관계가 돈독하여 협업을 통한 시너지가 극대화됩니다.',
        wealthLine: 'M자의 중심 기둥을 이루는 굵은 재물선이 끊김 없이 솟아있어 30대 후반부터 현금 유동성이 폭발적으로 증가합니다.',
        luckyTip: '금색이나 황금빛 계열의 소품을 지니면 행운의 파동이 더욱 커집니다.'
    },
    {
        score: 96,
        title: '신비의 혜안 영감 직관 손금 (神靈直觀)',
        summary: '두뇌선과 감정선 사이에 선명한 조화와 활처럼 휜 생명선이 어우러져, 하늘이 내린 영감과 직관으로 행운을 끌어당기는 특별한 손금입니다.',
        lifeLine: '넓은 반경을 그리며 엄지 구역을 넉넉하게 감싸는 생명선은 타고난 낙천성과 강한 생명력으로 병마를 물리치는 기운입니다.',
        headLine: '끝자락이 부드럽게 뻗어나가는 영민한 두뇌선으로 여러 분야를 자유자재로 융합하고 통섭하는 다재다능형 인재입니다.',
        heartLine: '풍부하고 온화한 감정선은 공감 능력이 탁월하여 사람들의 마음을 치유하고 이끄는 영적 카리스마를 뜻합니다.',
        wealthLine: '뜻하지 않은 귀인의 도움으로 큰 자산을 형성하는 원조선이 뚜렷하여 일생에 세 번 큰 횡재수가 찾아옵니다.',
        luckyTip: '명상과 산책으로 마음의 여유를 가질 때 번뜩이는 영감이 찾아옵니다.'
    }
];

// --- FACE READING TEMPLATES ---
const FACE_RESULTS = [
    {
        score: 97,
        title: '부귀영화 제왕지상 황금 관상 (富貴榮華)',
        summary: '이마의 상정, 눈과 코의 중정, 턱의 하정이 1:1:1의 완벽한 삼정 황금 비율을 이루며, 눈빛에 서기가 어리고 콧방울이 두툼하여 대부대귀를 누릴 길상입니다.',
        forehead: '이마가 훤칠하고 좌우 관골이 잘 발달하여 청년기부터 남다른 두각을 나타내며 명예와 벼슬운이 환하게 트여 있습니다.',
        eyes: '흑백이 분명하고 눈동자에 총명한 빛이 서려 있어 사물의 본질을 단숨에 꿰뚫어 보는 뛰어난 통찰력을 갖추고 있습니다.',
        nose: '콧날이 곧게 뻗고 콧방울(준두)에 살집이 넉넉하여 평생 금고가 마르지 않고 거액의 자산을 지켜내는 으뜸 복코입니다.',
        mouth: '입꼬리가 단정하게 위로 솟아있고 턱선이 둥글고 웅장하여 말년에 수많은 추종자를 거느리며 가문의 번영을 이룹니다.',
        luckyTip: '항상 밝은 미소로 인당(미간)을 펴두면 천운이 끊임없이 쏟아집니다.'
    },
    {
        score: 95,
        title: '일취월장 문무겸비 귀인 관상 (日就月將)',
        summary: '눈썹이 수려하게 눈을 덮고 귀바퀴가 두터우며 인중이 깊고 뚜렷하여, 학문과 예술, 비즈니스 모든 방면에서 두루 존경받는 덕망 높은 관상입니다.',
        forehead: '복주머니를 엎어놓은 듯 둥글고 반듯한 이마로 윗사람과 멘토의 두터운 총애를 받아 순탄한 승진과 성취를 이룹니다.',
        eyes: '부드럽고 그윽한 눈매는 사람들에게 강한 안정감과 신뢰감을 주어 언제나 든든한 조력자들을 끌어당깁니다.',
        nose: '단정하고 반듯한 콧대로 불의와 타협하지 않는 청렴한 기개와 합리적인 재테크 수완으로 알짜배기 부를 축적합니다.',
        mouth: '입술 윤곽이 선명하고 붉은빛이 감돌아 언변이 유려하고 설득력이 뛰어나 대중을 사로잡는 발표와 협상에 능합니다.',
        luckyTip: '단정한 헤어스타일로 이마를 드러낼수록 관운과 재물운이 활짝 열립니다.'
    },
    {
        score: 93,
        title: '수복강녕 자손만대 장수 관상 (壽福康寧)',
        summary: '인중이 길고 깊으며 귓불이 두툼하게 아래로 드리워진 부처님 귀의 형상으로, 큰 풍파 없이 온 가족과 함께 평화롭고 건강한 복락을 누릴 상입니다.',
        forehead: '넓고 평온한 이마로 일찍이 좋은 가정 환경과 교육적 혜택을 바탕으로 마음의 여유를 품고 살아갑니다.',
        eyes: '눈꼬리가 온화하게 정돈되어 타인과의 시비 구설을 지혜롭게 피하며 주변에 적을 만들지 않는 화합의 기운입니다.',
        nose: '코끝이 둥글고 온화하여 주변에 베풀기를 좋아하며, 나눌수록 더 큰 재물이 샘솟듯 되돌아오는 복을 지녔습니다.',
        mouth: '턱이 두툼하고 든든하여 집안의 안녕과 자손들의 번창을 지키는 든든한 버팀목 역할을 완벽히 수행합니다.',
        luckyTip: '매일 아침 따뜻한 물 한 잔으로 기혈을 순환시키면 건강운이 배가됩니다.'
    }
];

export default function Fortune({ socket }) {
    const navigate = useNavigate();
    const location = useLocation();

    // Check if subscreen
    const isSubScreen = Boolean(
        location.pathname.startsWith('/screen') ||
        location.search.includes('subscreen=true') ||
        location.search.includes('mirror=true') ||
        window.name === 'QuizrunSubScreenWindow' ||
        window.name === 'QuizrunScreenWindow' ||
        sessionStorage.getItem('is_subscreen') === 'true'
    );

    const [currentCategory, setCurrentCategory] = useState('menu'); // 'menu' | 'palm' | 'face' | 'tarot'
    
    // Camera & Capture states
    const [cameraActive, setCameraActive] = useState(false);
    const [countdown, setCountdown] = useState(null); // null | 3 | 2 | 1
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [analyzeProgress, setAnalyzeProgress] = useState(0);
    const [capturedImage, setCapturedImage] = useState(null);
    const [fortuneResult, setFortuneResult] = useState(null);
    const [facingMode, setFacingMode] = useState('user'); // 'user' | 'environment'
    const [hasCameraError, setHasCameraError] = useState(false);

    // Hand options & calibration
    const [handType, setHandType] = useState('right'); // 'right' | 'left'
    const [handOffset, setHandOffset] = useState({ x: 0, y: 0 });
    const [handScale, setHandScale] = useState(1.0);

    // Palm & Face Interactive Lines / Tabs
    const [activeLineTab, setActiveLineTab] = useState('all'); // 'all' | 'life' | 'head' | 'heart' | 'wealth'
    const [activeFaceTab, setActiveFaceTab] = useState('all'); // 'all' | 'forehead' | 'eyes' | 'nose' | 'mouth'
    const [animationKey, setAnimationKey] = useState(1);

    // Tarot states
    const [tarotMode, setTarotMode] = useState('single'); // 'single' | 'three'
    const [shuffledDeck, setShuffledDeck] = useState([]);
    const [selectedCards, setSelectedCards] = useState([]);
    const [tarotRevealed, setTarotRevealed] = useState(false);

    const videoRef = useRef(null);
    const canvasRef = useRef(null);
    const streamRef = useRef(null);
    const fortuneBcRef = useRef(null);

    // 1. Leader-Follower Broadcast Setup
    useEffect(() => {
        // If Leader (Main Window), command Subscreen to follow to /fortune
        if (!isSubScreen) {
            try {
                const navBc = new BroadcastChannel('quizrun_nav_sync');
                navBc.postMessage({ type: 'NAV_CHANGE', path: '/fortune?subscreen=true' });
                setTimeout(() => navBc.close(), 400);
            } catch (e) {}

            try {
                const scrBc = new BroadcastChannel('quizrun_screen_sync');
                scrBc.postMessage({ type: 'MODE_CHANGE', payload: { mode: 'fortune' } });
                setTimeout(() => scrBc.close(), 400);
            } catch (e) {}
        }
    }, [isSubScreen]);

    // 2. Real-time Fortune State Sync across Monitors
    useEffect(() => {
        let channel;
        try {
            channel = new BroadcastChannel('quizrun_fortune_sync');
            fortuneBcRef.current = channel;

            channel.onmessage = (e) => {
                const { type, payload } = e.data || {};
                if (type === 'STATE_SYNC' && payload) {
                    if (payload.category !== undefined) setCurrentCategory(payload.category);
                    if (payload.countdown !== undefined) setCountdown(payload.countdown);
                    if (payload.isAnalyzing !== undefined) setIsAnalyzing(payload.isAnalyzing);
                    if (payload.analyzeProgress !== undefined) setAnalyzeProgress(payload.analyzeProgress);
                    if (payload.capturedImage !== undefined) setCapturedImage(payload.capturedImage);
                    if (payload.fortuneResult !== undefined) setFortuneResult(payload.fortuneResult);
                    if (payload.tarotMode !== undefined) setTarotMode(payload.tarotMode);
                    if (payload.selectedCards !== undefined) setSelectedCards(payload.selectedCards);
                    if (payload.tarotRevealed !== undefined) setTarotRevealed(payload.tarotRevealed);
                    if (payload.activeLineTab !== undefined) setActiveLineTab(payload.activeLineTab);
                    if (payload.activeFaceTab !== undefined) setActiveFaceTab(payload.activeFaceTab);
                    if (payload.animationKey !== undefined) setAnimationKey(payload.animationKey);
                    if (payload.handType !== undefined) setHandType(payload.handType);
                    if (payload.handOffset !== undefined) setHandOffset(payload.handOffset);
                    if (payload.handScale !== undefined) setHandScale(payload.handScale);
                } else if (type === 'REQUEST_FORTUNE_SYNC') {
                    if (!isSubScreen) {
                        broadcastState();
                    }
                }
            };

            // If Subscreen, request initial state
            if (isSubScreen) {
                channel.postMessage({ type: 'REQUEST_FORTUNE_SYNC' });
            }
        } catch (e) {
            console.warn('BroadcastChannel error in Fortune:', e);
        }

        return () => {
            if (channel) channel.close();
            stopCamera();
        };
    }, [isSubScreen]);

    const broadcastState = (overrides = {}) => {
        if (fortuneBcRef.current) {
            try {
                fortuneBcRef.current.postMessage({
                    type: 'STATE_SYNC',
                    payload: {
                        category: overrides.category !== undefined ? overrides.category : currentCategory,
                        countdown: overrides.countdown !== undefined ? overrides.countdown : countdown,
                        isAnalyzing: overrides.isAnalyzing !== undefined ? overrides.isAnalyzing : isAnalyzing,
                        analyzeProgress: overrides.analyzeProgress !== undefined ? overrides.analyzeProgress : analyzeProgress,
                        capturedImage: overrides.capturedImage !== undefined ? overrides.capturedImage : capturedImage,
                        fortuneResult: overrides.fortuneResult !== undefined ? overrides.fortuneResult : fortuneResult,
                        tarotMode: overrides.tarotMode !== undefined ? overrides.tarotMode : tarotMode,
                        selectedCards: overrides.selectedCards !== undefined ? overrides.selectedCards : selectedCards,
                        tarotRevealed: overrides.tarotRevealed !== undefined ? overrides.tarotRevealed : tarotRevealed,
                        activeLineTab: overrides.activeLineTab !== undefined ? overrides.activeLineTab : activeLineTab,
                        activeFaceTab: overrides.activeFaceTab !== undefined ? overrides.activeFaceTab : activeFaceTab,
                        animationKey: overrides.animationKey !== undefined ? overrides.animationKey : animationKey,
                        handType: overrides.handType !== undefined ? overrides.handType : handType,
                        handOffset: overrides.handOffset !== undefined ? overrides.handOffset : handOffset,
                        handScale: overrides.handScale !== undefined ? overrides.handScale : handScale
                    }
                });
            } catch (e) {}
        }
    };

    // Camera Management
    const startCamera = async () => {
        setHasCameraError(false);
        try {
            stopCamera();
            const stream = await navigator.mediaDevices.getUserMedia({
                video: {
                    facingMode: facingMode,
                    width: { ideal: 1280 },
                    height: { ideal: 720 }
                },
                audio: false
            });
            streamRef.current = stream;
            if (videoRef.current) {
                videoRef.current.srcObject = stream;
                videoRef.current.play().catch(() => {});
            }
            setCameraActive(true);
        } catch (err) {
            console.warn('Camera access error:', err);
            setHasCameraError(true);
            setCameraActive(false);
        }
    };

    const stopCamera = () => {
        if (streamRef.current) {
            streamRef.current.getTracks().forEach(track => track.stop());
            streamRef.current = null;
        }
        setCameraActive(false);
    };

    // Switch Category
    const handleSelectCategory = (cat) => {
        setCurrentCategory(cat);
        setCapturedImage(null);
        setFortuneResult(null);
        setIsAnalyzing(false);
        setCountdown(null);
        setSelectedCards([]);
        setTarotRevealed(false);
        setActiveLineTab('all');
        setActiveFaceTab('all');
        setHandOffset({ x: 0, y: 0 });
        setHandScale(1.0);

        if (cat === 'palm' || cat === 'face') {
            startCamera();
        } else {
            stopCamera();
            if (cat === 'tarot') {
                shuffleTarotDeck();
            }
        }

        broadcastState({
            category: cat,
            capturedImage: null,
            fortuneResult: null,
            isAnalyzing: false,
            countdown: null,
            selectedCards: [],
            tarotRevealed: false,
            activeLineTab: 'all',
            activeFaceTab: 'all',
            handOffset: { x: 0, y: 0 },
            handScale: 1.0
        });
    };

    // Tarot Shuffle
    const shuffleTarotDeck = () => {
        const shuffled = [...TAROT_DECK].sort(() => Math.random() - 0.5);
        setShuffledDeck(shuffled);
        setSelectedCards([]);
        setTarotRevealed(false);
        playSound('step');
        broadcastState({ selectedCards: [], tarotRevealed: false });
    };

    // Take photo with 3-second countdown
    const handleTriggerCapture = () => {
        if (countdown !== null || isAnalyzing) return;

        setCountdown(3);
        playSound('beep');
        broadcastState({ countdown: 3 });

        let count = 3;
        const timer = setInterval(() => {
            count -= 1;
            if (count > 0) {
                setCountdown(count);
                playSound('beep');
                broadcastState({ countdown: count });
            } else {
                clearInterval(timer);
                setCountdown(null);
                captureFrame();
            }
        }, 1000);
    };

    const captureFrame = () => {
        playSound('shutter');
        let imageUri = null;

        if (videoRef.current && canvasRef.current && cameraActive) {
            const video = videoRef.current;
            const canvas = canvasRef.current;
            canvas.width = video.videoWidth || 1280;
            canvas.height = video.videoHeight || 720;
            const ctx = canvas.getContext('2d');
            
            // Mirror canvas if facingMode === 'user' so it matches what was on screen
            if (facingMode === 'user') {
                ctx.translate(canvas.width, 0);
                ctx.scale(-1, 1);
            }

            // Brighten and contrast adjust during draw
            ctx.filter = 'brightness(1.26) contrast(1.08) saturate(1.12)';
            ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
            imageUri = canvas.toDataURL('image/jpeg', 0.9);
        } else {
            // Fallback placeholder graphic if camera is not available
            imageUri = currentCategory === 'palm' ? '/emoticon.png' : '/quizrun_study_robot.png?v=3';
        }

        setCapturedImage(imageUri);
        stopCamera();

        // Start scanning analysis animation
        setIsAnalyzing(true);
        setAnalyzeProgress(10);
        broadcastState({ countdown: null, capturedImage: imageUri, isAnalyzing: true, analyzeProgress: 10 });

        let progress = 10;
        const scanInterval = setInterval(() => {
            progress += 18;
            if (progress >= 100) {
                clearInterval(scanInterval);
                setIsAnalyzing(false);
                setAnalyzeProgress(100);

                // Pick result
                let result = null;
                if (currentCategory === 'palm') {
                    result = PALM_RESULTS[Math.floor(Math.random() * PALM_RESULTS.length)];
                } else {
                    result = FACE_RESULTS[Math.floor(Math.random() * FACE_RESULTS.length)];
                }

                setFortuneResult(result);
                setActiveLineTab('all');
                setActiveFaceTab('all');
                setAnimationKey(prev => prev + 1);
                playSound('reveal');
                broadcastState({
                    isAnalyzing: false,
                    analyzeProgress: 100,
                    fortuneResult: result,
                    activeLineTab: 'all',
                    activeFaceTab: 'all',
                    animationKey: Date.now()
                });
            } else {
                setAnalyzeProgress(progress);
                playSound('step');
                broadcastState({ analyzeProgress: progress });
            }
        }, 350);
    };

    // Tarot Card Selection
    const handleSelectTarotCard = (card) => {
        if (tarotRevealed) return;

        const maxCards = tarotMode === 'single' ? 1 : 3;
        if (selectedCards.some(c => c.id === card.id)) return;

        const nextSelected = [...selectedCards, card];
        setSelectedCards(nextSelected);
        playSound('submit');

        if (nextSelected.length >= maxCards) {
            setTimeout(() => {
                setTarotRevealed(true);
                playSound('reveal');
                broadcastState({ selectedCards: nextSelected, tarotRevealed: true });
            }, 600);
        } else {
            broadcastState({ selectedCards: nextSelected });
        }
    };

    const handleReplayPalmAnimation = () => {
        const nextKey = Date.now();
        setAnimationKey(nextKey);
        broadcastState({ animationKey: nextKey });
    };

    const handleSetHandType = (type) => {
        setHandType(type);
        setAnimationKey(Date.now());
        broadcastState({ handType: type, animationKey: Date.now() });
    };

    const adjustOffset = (dx, dy) => {
        const next = { x: handOffset.x + dx, y: handOffset.y + dy };
        setHandOffset(next);
        broadcastState({ handOffset: next });
    };

    const adjustScale = (ds) => {
        const next = Math.max(0.6, Math.min(1.8, Number((handScale + ds).toFixed(2))));
        setHandScale(next);
        broadcastState({ handScale: next });
    };

    const resetHandTransform = () => {
        setHandOffset({ x: 0, y: 0 });
        setHandScale(1.0);
        broadcastState({ handOffset: { x: 0, y: 0 }, handScale: 1.0 });
    };

    const nudgeBtnStyle = {
        padding: '5px 10px',
        borderRadius: '8px',
        border: '1px solid rgba(255,255,255,0.2)',
        background: 'rgba(255,255,255,0.1)',
        color: 'white',
        fontSize: '0.82rem',
        fontWeight: 'bold',
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        transition: 'all 0.15s'
    };

    return (
        <div style={{
            minHeight: '100vh',
            width: '100%',
            background: 'linear-gradient(135deg, #09090b 0%, #170d24 50%, #0d0614 100%)',
            color: '#f8fafc',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            padding: '20px 24px 60px 24px',
            boxSizing: 'border-box',
            fontFamily: 'system-ui, -apple-system, sans-serif',
            position: 'relative',
            overflowX: 'hidden'
        }}>
            {/* Hidden canvas for taking bright snapshot */}
            <canvas ref={canvasRef} style={{ display: 'none' }} />

            {/* Top Navigation */}
            <header style={{
                width: '100%',
                maxWidth: '1240px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: '20px'
            }}>
                <button
                    onClick={() => {
                        if (currentCategory === 'menu') {
                            navigate('/');
                        } else {
                            handleSelectCategory('menu');
                        }
                    }}
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        background: 'rgba(255, 255, 255, 0.1)',
                        border: '1px solid rgba(255, 255, 255, 0.2)',
                        color: 'white',
                        padding: '10px 20px',
                        borderRadius: '16px',
                        fontSize: '1rem',
                        fontWeight: '800',
                        cursor: 'pointer',
                        backdropFilter: 'blur(10px)',
                        transition: 'all 0.2s'
                    }}
                >
                    <ArrowLeft size={18} />
                    {currentCategory === 'menu' ? '홈으로 돌아가기' : '운세 목록으로'}
                </button>

                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <Sparkles size={28} color="#d946ef" className="animate-spin-slow" />
                    <h1 style={{
                        fontSize: '2.1rem',
                        fontWeight: '900',
                        margin: 0,
                        background: 'linear-gradient(135deg, #f472b6, #c084fc, #60a5fa)',
                        WebkitBackgroundClip: 'text',
                        WebkitTextFillColor: 'transparent',
                        letterSpacing: '-0.5px'
                    }}>
                        신비의 운세 (Fortune Reading)
                    </h1>
                </div>

                <div style={{ width: '130px', textAlign: 'right' }}>
                    {isSubScreen && (
                        <span style={{ fontSize: '0.85rem', color: '#10b981', background: 'rgba(16,185,129,0.15)', border: '1px solid rgba(16,185,129,0.3)', padding: '6px 14px', borderRadius: '14px', fontWeight: '800' }}>
                            🖥️ 서브 모니터
                        </span>
                    )}
                </div>
            </header>

            {/* --- VIEW 1: CATEGORY SELECTION MENU --- */}
            {currentCategory === 'menu' && (
                <div style={{
                    width: '100%',
                    maxWidth: '1150px',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: '32px',
                    marginTop: '20px'
                }}>
                    <div style={{ textAlign: 'center' }}>
                        <p style={{ fontSize: '1.3rem', color: '#cbd5e1', margin: 0, fontWeight: '700' }}>
                            확인하고 싶은 신비의 운세를 선택해 주세요
                        </p>
                        <p style={{ fontSize: '0.95rem', color: '#94a3b8', marginTop: '6px' }}>
                            메인 모니터와 서브 모니터에 실시간으로 동일한 촬영 및 결과 화면이 생생하게 펼쳐집니다.
                        </p>
                    </div>

                    <div style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fit, minmax(330px, 1fr))',
                        gap: '26px',
                        width: '100%'
                    }}>
                        {/* 1. 손금 (Palmistry) */}
                        <div
                            onClick={() => handleSelectCategory('palm')}
                            style={{
                                background: 'linear-gradient(145deg, rgba(16, 185, 129, 0.15) 0%, rgba(6, 78, 59, 0.3) 100%)',
                                border: '2px solid rgba(16, 185, 129, 0.45)',
                                borderRadius: '30px',
                                padding: '38px 28px',
                                cursor: 'pointer',
                                display: 'flex',
                                flexDirection: 'column',
                                alignItems: 'center',
                                textAlign: 'center',
                                transition: 'all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)',
                                boxShadow: '0 12px 32px rgba(16, 185, 129, 0.15)'
                            }}
                            onMouseEnter={(e) => {
                                e.currentTarget.style.transform = 'translateY(-6px) scale(1.02)';
                                e.currentTarget.style.borderColor = '#10b981';
                            }}
                            onMouseLeave={(e) => {
                                e.currentTarget.style.transform = 'none';
                                e.currentTarget.style.borderColor = 'rgba(16, 185, 129, 0.45)';
                            }}
                        >
                            <div style={{
                                width: '88px',
                                height: '88px',
                                borderRadius: '26px',
                                background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                marginBottom: '20px',
                                boxShadow: '0 8px 24px rgba(16, 185, 129, 0.4)'
                            }}>
                                <Hand size={46} color="white" />
                            </div>
                            <h2 style={{ fontSize: '2rem', fontWeight: '900', color: '#a7f3d0', margin: '0 0 10px 0' }}>
                                ✋ 손금 (Palmistry)
                            </h2>
                            <p style={{ fontSize: '1rem', color: '#94a3b8', lineHeight: 1.6, margin: 0 }}>
                                손가락을 쫙 펴고 카메라에 대면 3초 후 촬영!<br />
                                <strong>생명선·두뇌선·감정선·재물선</strong>이 밝은 손 위에 빛나는 애니메이션으로 그려집니다.
                            </p>
                            <div style={{
                                marginTop: '24px',
                                padding: '10px 24px',
                                borderRadius: '20px',
                                background: 'rgba(16, 185, 129, 0.25)',
                                color: '#6ee7b7',
                                fontWeight: '800',
                                fontSize: '0.96rem'
                            }}>
                                손금 촬영 시작 →
                            </div>
                        </div>

                        {/* 2. 관상 (Face Reading) */}
                        <div
                            onClick={() => handleSelectCategory('face')}
                            style={{
                                background: 'linear-gradient(145deg, rgba(245, 158, 11, 0.15) 0%, rgba(120, 53, 15, 0.3) 100%)',
                                border: '2px solid rgba(245, 158, 11, 0.45)',
                                borderRadius: '30px',
                                padding: '38px 28px',
                                cursor: 'pointer',
                                display: 'flex',
                                flexDirection: 'column',
                                alignItems: 'center',
                                textAlign: 'center',
                                transition: 'all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)',
                                boxShadow: '0 12px 32px rgba(245, 158, 11, 0.15)'
                            }}
                            onMouseEnter={(e) => {
                                e.currentTarget.style.transform = 'translateY(-6px) scale(1.02)';
                                e.currentTarget.style.borderColor = '#f59e0b';
                            }}
                            onMouseLeave={(e) => {
                                e.currentTarget.style.transform = 'none';
                                e.currentTarget.style.borderColor = 'rgba(245, 158, 11, 0.45)';
                            }}
                        >
                            <div style={{
                                width: '88px',
                                height: '88px',
                                borderRadius: '26px',
                                background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                marginBottom: '20px',
                                boxShadow: '0 8px 24px rgba(245, 158, 11, 0.4)'
                            }}>
                                <Smile size={46} color="white" />
                            </div>
                            <h2 style={{ fontSize: '2rem', fontWeight: '900', color: '#fde68a', margin: '0 0 10px 0' }}>
                                🧑‍🦱 관상 (Face Reading)
                            </h2>
                            <p style={{ fontSize: '1rem', color: '#94a3b8', lineHeight: 1.6, margin: 0 }}>
                                카메라 가이드에 얼굴을 맞추고 3초 촬영!<br />
                                <strong>밝고 선명한 얼굴 사진</strong> 위에 삼정(상정·중정·하정) 황금비율 정밀 풀이를 제공합니다.
                            </p>
                            <div style={{
                                marginTop: '24px',
                                padding: '10px 24px',
                                borderRadius: '20px',
                                background: 'rgba(245, 158, 11, 0.25)',
                                color: '#fcd34d',
                                fontWeight: '800',
                                fontSize: '0.96rem'
                            }}>
                                관상 촬영 시작 →
                            </div>
                        </div>

                        {/* 3. 타로 (Tarot Reading) */}
                        <div
                            onClick={() => handleSelectCategory('tarot')}
                            style={{
                                background: 'linear-gradient(145deg, rgba(168, 85, 247, 0.15) 0%, rgba(88, 28, 135, 0.3) 100%)',
                                border: '2px solid rgba(168, 85, 247, 0.45)',
                                borderRadius: '30px',
                                padding: '38px 28px',
                                cursor: 'pointer',
                                display: 'flex',
                                flexDirection: 'column',
                                alignItems: 'center',
                                textAlign: 'center',
                                transition: 'all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)',
                                boxShadow: '0 12px 32px rgba(168, 85, 247, 0.15)'
                            }}
                            onMouseEnter={(e) => {
                                e.currentTarget.style.transform = 'translateY(-6px) scale(1.02)';
                                e.currentTarget.style.borderColor = '#a855f7';
                            }}
                            onMouseLeave={(e) => {
                                e.currentTarget.style.transform = 'none';
                                e.currentTarget.style.borderColor = 'rgba(168, 85, 247, 0.45)';
                            }}
                        >
                            <div style={{
                                width: '88px',
                                height: '88px',
                                borderRadius: '26px',
                                background: 'linear-gradient(135deg, #a855f7 0%, #7e22ce 100%)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                marginBottom: '20px',
                                boxShadow: '0 8px 24px rgba(168, 85, 247, 0.4)'
                            }}>
                                <Sparkles size={46} color="white" />
                            </div>
                            <h2 style={{ fontSize: '2rem', fontWeight: '900', color: '#e9d5ff', margin: '0 0 10px 0' }}>
                                🃏 타로 (Tarot Reading)
                            </h2>
                            <p style={{ fontSize: '1rem', color: '#94a3b8', lineHeight: 1.6, margin: 0 }}>
                                신비로운 22장의 메이저 타로 카드 중<br />
                                <strong>원하는 카드를 선택</strong>하여 오늘의 애정운·금전운·종합운을 점칩니다.
                            </p>
                            <div style={{
                                marginTop: '24px',
                                padding: '10px 24px',
                                borderRadius: '20px',
                                background: 'rgba(168, 85, 247, 0.25)',
                                color: '#d8b4fe',
                                fontWeight: '800',
                                fontSize: '0.96rem'
                            }}>
                                타로 카드 뽑기 →
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* --- VIEW 2: CAMERA VIEW (PALM & FACE) --- */}
            {(currentCategory === 'palm' || currentCategory === 'face') && !fortuneResult && (
                <div style={{
                    width: '100%',
                    maxWidth: '880px',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: '16px'
                }}>
                    <div style={{ textAlign: 'center' }}>
                        <h2 style={{ fontSize: '1.9rem', fontWeight: '900', color: currentCategory === 'palm' ? '#6ee7b7' : '#fde68a', margin: '0 0 6px 0' }}>
                            {currentCategory === 'palm'
                                ? `✋ ${handType === 'right' ? '오른손' : '왼손'} 손가락을 쫙 펴고 가이드선에 맞춰주세요`
                                : '🧑‍🦱 얼굴을 가이드선에 맞춰주세요'}
                        </h2>
                        <p style={{ fontSize: '1.05rem', color: '#94a3b8', margin: 0 }}>
                            [촬영하기] 버튼을 누르면 <strong>3초 후</strong> 자동으로 밝고 선명한 사진이 찍히고 정밀 분석이 시작됩니다.
                        </p>
                    </div>

                    {/* Hand Selector Toggle in Camera Mode */}
                    {currentCategory === 'palm' && (
                        <div style={{
                            display: 'flex',
                            gap: '8px',
                            background: 'rgba(255,255,255,0.08)',
                            padding: '5px',
                            borderRadius: '16px',
                            border: '1px solid rgba(255,255,255,0.15)'
                        }}>
                            <button
                                onClick={() => handleSetHandType('right')}
                                style={{
                                    padding: '7px 18px',
                                    borderRadius: '12px',
                                    border: 'none',
                                    background: handType === 'right' ? '#10b981' : 'transparent',
                                    color: 'white',
                                    fontWeight: '800',
                                    fontSize: '0.92rem',
                                    cursor: 'pointer',
                                    transition: 'all 0.2s'
                                }}
                            >
                                ✋ 오른손으로 측정
                            </button>
                            <button
                                onClick={() => handleSetHandType('left')}
                                style={{
                                    padding: '7px 18px',
                                    borderRadius: '12px',
                                    border: 'none',
                                    background: handType === 'left' ? '#10b981' : 'transparent',
                                    color: 'white',
                                    fontWeight: '800',
                                    fontSize: '0.92rem',
                                    cursor: 'pointer',
                                    transition: 'all 0.2s'
                                }}
                            >
                                ✋ 왼손으로 측정
                            </button>
                        </div>
                    )}

                    {/* Camera Viewport Container */}
                    <div style={{
                        position: 'relative',
                        width: '100%',
                        maxWidth: '720px',
                        height: '520px',
                        background: '#18181b',
                        borderRadius: '32px',
                        overflow: 'hidden',
                        border: `4px solid ${currentCategory === 'palm' ? '#10b981' : '#f59e0b'}`,
                        boxShadow: `0 20px 50px ${currentCategory === 'palm' ? 'rgba(16, 185, 129, 0.25)' : 'rgba(245, 158, 11, 0.25)'}`,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                    }}>
                        {/* Live Video with Enhanced Brightness */}
                        <video
                            ref={videoRef}
                            autoPlay
                            playsInline
                            muted
                            style={{
                                width: '100%',
                                height: '100%',
                                objectFit: 'cover',
                                filter: 'brightness(1.22) contrast(1.06) saturate(1.1)',
                                transform: facingMode === 'user' ? 'scaleX(-1)' : 'none',
                                display: cameraActive && !capturedImage ? 'block' : 'none'
                            }}
                        />

                        {/* Fallback if no camera */}
                        {(!cameraActive || hasCameraError) && !capturedImage && (
                            <div style={{ textAlign: 'center', padding: '24px', color: '#94a3b8' }}>
                                <Camera size={64} style={{ marginBottom: '12px', opacity: 0.5 }} />
                                <p style={{ fontSize: '1.1rem', fontWeight: 'bold' }}>카메라 장치를 감지 중이거나 권한이 필요합니다.</p>
                                <button
                                    onClick={startCamera}
                                    style={{
                                        padding: '10px 22px',
                                        borderRadius: '14px',
                                        background: '#3b82f6',
                                        color: 'white',
                                        border: 'none',
                                        fontWeight: 'bold',
                                        cursor: 'pointer'
                                    }}
                                >
                                    카메라 다시 연결
                                </button>
                            </div>
                        )}

                        {/* Captured Still Preview (Brightened) */}
                        {capturedImage && (
                            <img
                                src={capturedImage}
                                alt="Captured Still"
                                style={{
                                    width: '100%',
                                    height: '100%',
                                    objectFit: 'cover',
                                    filter: 'brightness(1.24) contrast(1.08) saturate(1.12)'
                                }}
                            />
                        )}

                        {/* Guide Overlay Lines */}
                        {!capturedImage && (
                            <div style={{
                                position: 'absolute',
                                inset: 0,
                                pointerEvents: 'none',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center'
                            }}>
                                {currentCategory === 'palm' ? (
                                    /* Dynamic Spread-finger Hand Outline SVG Guide (Mirrors for Right/Left hand) */
                                    <div style={{ position: 'relative', width: '380px', height: '480px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                        <svg width="380" height="480" viewBox="0 0 460 520" fill="none" style={{ filter: 'drop-shadow(0 0 10px #10b981)' }}>
                                            {/* Mirror around center 230 if handType is 'right' so thumb is on right */}
                                            <g transform={handType === 'right' ? 'translate(460, 0) scale(-1, 1)' : 'none'}>
                                                {/* Outer Spread-Finger Hand Silhouette Outline */}
                                                <path
                                                    d="M 180 500
                                                       C 150 460, 130 420, 135 370
                                                       C 110 350, 60 320, 35 285
                                                       C 20 265, 35 240, 60 255
                                                       C 85 270, 125 310, 150 315
                                                       L 155 240
                                                       C 150 190, 135 140, 130 95
                                                       C 125 65, 155 60, 165 90
                                                       C 175 125, 185 185, 190 230
                                                       L 198 215
                                                       C 195 160, 205 90, 215 50
                                                       C 220 25, 245 25, 250 50
                                                       C 255 90, 260 160, 258 220
                                                       L 268 225
                                                       C 275 175, 290 115, 305 85
                                                       C 315 65, 340 70, 335 100
                                                       C 330 140, 325 185, 320 245
                                                       L 332 255
                                                       C 350 215, 380 180, 400 165
                                                       C 415 155, 430 175, 415 200
                                                       C 395 235, 365 290, 350 335
                                                       C 340 375, 335 435, 310 500
                                                       Z"
                                                    stroke="#10b981"
                                                    strokeWidth="3.5"
                                                    strokeDasharray="10 8"
                                                    className="pulse-outline"
                                                />
                                                {/* Palm Center Target Reticle */}
                                                <circle cx="240" cy="350" r="38" stroke="#34d399" strokeWidth="2" strokeDasharray="4 4" opacity="0.8" />
                                                <circle cx="240" cy="350" r="8" fill="#10b981" opacity="0.9" />
                                                <line x1="240" y1="295" x2="240" y2="405" stroke="#34d399" strokeWidth="1.5" strokeDasharray="3 3" opacity="0.6" />
                                                <line x1="185" y1="350" x2="295" y2="350" stroke="#34d399" strokeWidth="1.5" strokeDasharray="3 3" opacity="0.6" />

                                                {/* Fingertip Target Dots */}
                                                <circle cx="45" cy="270" r="10" stroke="#34d399" strokeWidth="2" fill="rgba(16,185,129,0.2)" />
                                                <circle cx="148" cy="78" r="10" stroke="#34d399" strokeWidth="2" fill="rgba(16,185,129,0.2)" />
                                                <circle cx="233" cy="38" r="10" stroke="#34d399" strokeWidth="2" fill="rgba(16,185,129,0.2)" />
                                                <circle cx="320" cy="82" r="10" stroke="#34d399" strokeWidth="2" fill="rgba(16,185,129,0.2)" />
                                                <circle cx="410" cy="182" r="10" stroke="#34d399" strokeWidth="2" fill="rgba(16,185,129,0.2)" />
                                            </g>
                                        </svg>
                                        <div style={{
                                            position: 'absolute',
                                            bottom: '12px',
                                            background: 'rgba(0, 0, 0, 0.75)',
                                            border: '1.5px solid #10b981',
                                            padding: '6px 16px',
                                            borderRadius: '20px',
                                            color: '#6ee7b7',
                                            fontWeight: '800',
                                            fontSize: '0.88rem',
                                            boxShadow: '0 4px 12px rgba(0,0,0,0.5)'
                                        }}>
                                            ✋ {handType === 'right' ? '오른손을' : '왼손을'} 활짝 펴서 대어주세요
                                        </div>
                                    </div>
                                ) : (
                                    /* Face Oval Guide SVG */
                                    <div style={{ position: 'relative', width: '320px', height: '420px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                        <svg width="320" height="420" viewBox="0 0 240 320" fill="none" style={{ filter: 'drop-shadow(0 0 10px #f59e0b)' }}>
                                            {/* Outer Face Oval */}
                                            <ellipse cx="120" cy="160" rx="90" ry="125" stroke="#f59e0b" strokeWidth="3" strokeDasharray="8 6" className="pulse-outline-gold" />
                                            {/* Forehead Section Boundary (상정) */}
                                            <line x1="45" y1="105" x2="195" y2="105" stroke="#f59e0b" strokeWidth="1.5" strokeDasharray="4 4" opacity="0.7" />
                                            {/* Nose Base Boundary (중정) */}
                                            <line x1="55" y1="195" x2="185" y2="195" stroke="#f59e0b" strokeWidth="1.5" strokeDasharray="4 4" opacity="0.7" />
                                            {/* Eyes Guideline */}
                                            <ellipse cx="85" cy="130" rx="18" ry="10" stroke="#fbbf24" strokeWidth="1.8" fill="none" opacity="0.8" />
                                            <ellipse cx="155" cy="130" rx="18" ry="10" stroke="#fbbf24" strokeWidth="1.8" fill="none" opacity="0.8" />
                                            {/* Nose Bridge */}
                                            <path d="M 120 135 L 114 175 L 126 175 Z" stroke="#fbbf24" strokeWidth="1.8" fill="none" opacity="0.8" />
                                            {/* Lips Smile Guideline */}
                                            <path d="M 98 230 Q 120 242 142 230" stroke="#fbbf24" strokeWidth="2.5" strokeLinecap="round" opacity="0.85" />
                                        </svg>
                                        <div style={{
                                            position: 'absolute',
                                            bottom: '12px',
                                            background: 'rgba(0, 0, 0, 0.75)',
                                            border: '1.5px solid #f59e0b',
                                            padding: '6px 16px',
                                            borderRadius: '20px',
                                            color: '#fde68a',
                                            fontWeight: '800',
                                            fontSize: '0.88rem',
                                            boxShadow: '0 4px 12px rgba(0,0,0,0.5)'
                                        }}>
                                            🧑‍🦱 정면을 바라보고 얼굴을 맞춰주세요
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* 3-Second Countdown Overlay */}
                        {countdown !== null && (
                            <div style={{
                                position: 'absolute',
                                inset: 0,
                                background: 'rgba(0, 0, 0, 0.5)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                zIndex: 50
                            }}>
                                <div style={{
                                    fontSize: '9.5rem',
                                    fontWeight: '900',
                                    color: 'white',
                                    textShadow: currentCategory === 'palm' ? '0 0 35px #10b981' : '0 0 35px #f59e0b',
                                    animation: 'popIn 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)'
                                }}>
                                    {countdown}
                                </div>
                            </div>
                        )}

                        {/* Analyzing Scanner Laser Animation */}
                        {isAnalyzing && (
                            <div style={{
                                position: 'absolute',
                                inset: 0,
                                background: 'rgba(0, 0, 0, 0.65)',
                                display: 'flex',
                                flexDirection: 'column',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '16px',
                                zIndex: 60
                            }}>
                                <div style={{
                                    position: 'absolute',
                                    left: 0,
                                    right: 0,
                                    height: '5px',
                                    background: currentCategory === 'palm' ? '#10b981' : '#f59e0b',
                                    boxShadow: `0 0 25px 8px ${currentCategory === 'palm' ? '#10b981' : '#f59e0b'}`,
                                    animation: 'scanLine 1.4s ease-in-out infinite'
                                }} />
                                <Sparkles size={56} color={currentCategory === 'palm' ? '#34d399' : '#fbbf24'} className="animate-spin-slow" />
                                <div style={{ fontSize: '1.65rem', fontWeight: '900', color: 'white', textShadow: '0 2px 10px rgba(0,0,0,0.6)' }}>
                                    {currentCategory === 'palm' ? '✋ AI 손금 4대 운명선 정밀 스캔 중...' : '🧑‍🦱 AI 관상 3D 황금비율 정밀 분석 중...'}
                                </div>
                                <div style={{
                                    width: '320px',
                                    height: '12px',
                                    background: 'rgba(255,255,255,0.2)',
                                    borderRadius: '10px',
                                    overflow: 'hidden'
                                }}>
                                    <div style={{
                                        width: `${analyzeProgress}%`,
                                        height: '100%',
                                        background: currentCategory === 'palm' ? 'linear-gradient(90deg, #10b981, #6ee7b7)' : 'linear-gradient(90deg, #f59e0b, #fde68a)',
                                        transition: 'width 0.3s ease'
                                    }} />
                                </div>
                                <span style={{ fontSize: '1.25rem', fontWeight: '900', color: '#e2e8f0' }}>{analyzeProgress}%</span>
                            </div>
                        )}
                    </div>

                    {/* Camera Control Action Buttons */}
                    {!isAnalyzing && (
                        <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
                            <button
                                onClick={handleTriggerCapture}
                                disabled={countdown !== null}
                                style={{
                                    padding: '16px 46px',
                                    fontSize: '1.35rem',
                                    fontWeight: '900',
                                    borderRadius: '24px',
                                    border: 'none',
                                    background: currentCategory === 'palm'
                                        ? 'linear-gradient(135deg, #10b981 0%, #059669 100%)'
                                        : 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
                                    color: 'white',
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '12px',
                                    boxShadow: '0 8px 30px rgba(0,0,0,0.4)',
                                    transform: countdown !== null ? 'scale(0.95)' : 'none',
                                    transition: 'all 0.2s'
                                }}
                            >
                                <Camera size={26} />
                                <span>촬영하기 (3초 타이머)</span>
                            </button>

                            <button
                                onClick={() => {
                                    setFacingMode(prev => prev === 'user' ? 'environment' : 'user');
                                    setTimeout(startCamera, 200);
                                }}
                                style={{
                                    padding: '14px 22px',
                                    borderRadius: '20px',
                                    background: 'rgba(255, 255, 255, 0.1)',
                                    border: '1px solid rgba(255, 255, 255, 0.2)',
                                    color: 'white',
                                    fontSize: '0.95rem',
                                    fontWeight: '800',
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '6px'
                                }}
                                title="전면/후면 카메라 전환"
                            >
                                <RefreshCw size={18} /> 카메라 전환
                            </button>
                        </div>
                    )}
                </div>
            )}

            {/* --- VIEW 3: CAMERA RESULT CARD (PALM / FACE) --- */}
            {fortuneResult && (
                <div style={{
                    width: '100%',
                    maxWidth: '1180px',
                    background: 'rgba(24, 24, 27, 0.96)',
                    border: `3px solid ${currentCategory === 'palm' ? '#10b981' : '#f59e0b'}`,
                    borderRadius: '32px',
                    padding: '36px',
                    boxShadow: '0 25px 60px rgba(0, 0, 0, 0.6)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '24px',
                    animation: 'popIn 0.4s ease'
                }}>
                    {/* Result Header */}
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '2px solid rgba(255,255,255,0.1)', paddingBottom: '20px', flexWrap: 'wrap', gap: '14px' }}>
                        <div>
                            <span style={{ fontSize: '1.05rem', fontWeight: '800', color: currentCategory === 'palm' ? '#6ee7b7' : '#fde68a' }}>
                                {currentCategory === 'palm' ? '✋ AI 손금 4대 운명선 정밀 분석 결과' : '🧑‍🦱 AI 관상 삼정(三停) 황금비율 분석 결과'}
                            </span>
                            <h2 style={{ fontSize: '2.3rem', fontWeight: '900', color: 'white', margin: '6px 0 0 0', letterSpacing: '-0.5px' }}>
                                {fortuneResult.title}
                            </h2>
                        </div>
                        <div style={{
                            background: currentCategory === 'palm' ? 'rgba(16, 185, 129, 0.2)' : 'rgba(245, 158, 11, 0.2)',
                            border: `2px solid ${currentCategory === 'palm' ? '#10b981' : '#f59e0b'}`,
                            padding: '12px 28px',
                            borderRadius: '22px',
                            textAlign: 'center'
                        }}>
                            <div style={{ fontSize: '0.82rem', color: '#cbd5e1', fontWeight: '800' }}>운명 종합 지수</div>
                            <div style={{ fontSize: '2.6rem', fontWeight: '900', color: currentCategory === 'palm' ? '#34d399' : '#fbbf24', lineHeight: 1 }}>
                                {fortuneResult.score}점
                            </div>
                        </div>
                    </div>

                    {/* Main Analysis Body: Photo with Animated Overlay + Interactive Detail Panels */}
                    <div style={{ display: 'flex', gap: '32px', flexWrap: 'wrap', alignItems: 'flex-start' }}>
                        
                        {/* LEFT COLUMN: Brightened Photo with Interactive Animated Drawing Overlay */}
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}>
                            
                            {/* Fine-Tuning Control Bar for Palm Lines */}
                            {currentCategory === 'palm' && (
                                <div style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    gap: '6px',
                                    background: 'rgba(255,255,255,0.06)',
                                    padding: '6px 12px',
                                    borderRadius: '16px',
                                    border: '1px solid rgba(255,255,255,0.12)',
                                    flexWrap: 'wrap',
                                    maxWidth: '380px'
                                }}>
                                    <span style={{ fontSize: '0.82rem', color: '#94a3b8', fontWeight: 'bold' }}>손:</span>
                                    <button
                                        onClick={() => handleSetHandType('right')}
                                        style={{
                                            ...nudgeBtnStyle,
                                            background: handType === 'right' ? '#10b981' : 'transparent',
                                            borderColor: handType === 'right' ? '#10b981' : 'rgba(255,255,255,0.2)'
                                        }}
                                    >
                                        ✋ 오른손
                                    </button>
                                    <button
                                        onClick={() => handleSetHandType('left')}
                                        style={{
                                            ...nudgeBtnStyle,
                                            background: handType === 'left' ? '#10b981' : 'transparent',
                                            borderColor: handType === 'left' ? '#10b981' : 'rgba(255,255,255,0.2)'
                                        }}
                                    >
                                        ✋ 왼손
                                    </button>

                                    <span style={{ color: 'rgba(255,255,255,0.2)' }}>|</span>
                                    <span style={{ fontSize: '0.82rem', color: '#94a3b8', fontWeight: 'bold' }}>위치:</span>
                                    <button onClick={() => adjustOffset(0, -8)} style={nudgeBtnStyle} title="위로">⬆️</button>
                                    <button onClick={() => adjustOffset(0, 8)} style={nudgeBtnStyle} title="아래로">⬇️</button>
                                    <button onClick={() => adjustOffset(-8, 0)} style={nudgeBtnStyle} title="왼쪽으로">⬅️</button>
                                    <button onClick={() => adjustOffset(8, 0)} style={nudgeBtnStyle} title="오른쪽으로">➡️</button>

                                    <span style={{ color: 'rgba(255,255,255,0.2)' }}>|</span>
                                    <button onClick={() => adjustScale(0.08)} style={nudgeBtnStyle} title="확대">➕</button>
                                    <button onClick={() => adjustScale(-0.08)} style={nudgeBtnStyle} title="축소">➖</button>
                                    <button onClick={resetHandTransform} style={{ ...nudgeBtnStyle, fontSize: '0.75rem', padding: '4px 6px' }} title="위치 초기화">초기화</button>
                                </div>
                            )}

                            {/* Photo Container with SVG Overlay */}
                            <div style={{
                                position: 'relative',
                                width: '360px',
                                height: '440px',
                                borderRadius: '26px',
                                overflow: 'hidden',
                                border: `3px solid ${currentCategory === 'palm' ? '#10b981' : '#f59e0b'}`,
                                boxShadow: `0 12px 35px ${currentCategory === 'palm' ? 'rgba(16, 185, 129, 0.25)' : 'rgba(245, 158, 11, 0.25)'}`,
                                background: '#111'
                            }}>
                                {/* Captured Photo (Enhanced Brightness & Clarity) */}
                                {capturedImage ? (
                                    <img
                                        src={capturedImage}
                                        alt="Analyzed Still"
                                        style={{
                                            width: '100%',
                                            height: '100%',
                                            objectFit: 'cover',
                                            filter: 'brightness(1.26) contrast(1.08) saturate(1.15)'
                                        }}
                                    />
                                ) : (
                                    <div style={{ width: '100%', height: '100%', background: '#222' }} />
                                )}

                                {/* --- PALM: Accurate, Anatomically Aligned Animated Palm Lines --- */}
                                {currentCategory === 'palm' && (
                                    <svg
                                        key={animationKey}
                                        viewBox="0 0 360 440"
                                        style={{
                                            position: 'absolute',
                                            inset: 0,
                                            width: '100%',
                                            height: '100%',
                                            pointerEvents: 'none'
                                        }}
                                    >
                                        <g transform={`translate(${handOffset.x}, ${handOffset.y}) translate(180, 290) scale(${handScale}) translate(-180, -290)`}>
                                            {handType === 'right' ? (
                                                /* ================= RIGHT HAND (Thumb on Right) ================= */
                                                <>
                                                    {/* 1. 생명선 (Life Line) - Wraps Thumb Mount on Right */}
                                                    {(activeLineTab === 'all' || activeLineTab === 'life') && (
                                                        <g>
                                                            <path
                                                                d="M 215 235 C 235 270, 230 335, 185 385"
                                                                fill="none"
                                                                stroke="#10b981"
                                                                strokeWidth={activeLineTab === 'life' ? "6.5" : "4.5"}
                                                                strokeLinecap="round"
                                                                className="draw-hand-line"
                                                                style={{ filter: 'drop-shadow(0 0 10px #10b981)' }}
                                                            />
                                                            <circle cx="215" cy="235" r="5" fill="#34d399" />
                                                            <circle cx="185" cy="385" r="5" fill="#34d399" />
                                                            <text x="210" y="325" fill="#a7f3d0" fontSize="13" fontWeight="900" style={{ filter: 'drop-shadow(0 1px 4px #000)' }}>생명선</text>
                                                        </g>
                                                    )}

                                                    {/* 2. 두뇌선 (Head Line) - Starts with Life Line, Slopes Left */}
                                                    {(activeLineTab === 'all' || activeLineTab === 'head') && (
                                                        <g>
                                                            <path
                                                                d="M 215 235 C 180 265, 145 295, 105 315"
                                                                fill="none"
                                                                stroke="#06b6d4"
                                                                strokeWidth={activeLineTab === 'head' ? "6.5" : "4.5"}
                                                                strokeLinecap="round"
                                                                className="draw-hand-line"
                                                                style={{ filter: 'drop-shadow(0 0 10px #06b6d4)' }}
                                                            />
                                                            <circle cx="215" cy="235" r="5" fill="#22d3ee" />
                                                            <circle cx="105" cy="315" r="5" fill="#22d3ee" />
                                                            <text x="140" y="275" fill="#a5f3fc" fontSize="13" fontWeight="900" style={{ filter: 'drop-shadow(0 1px 4px #000)' }}>두뇌선</text>
                                                        </g>
                                                    )}

                                                    {/* 3. 감정선 (Heart Line) - Starts under Pinky on Left, curves Right */}
                                                    {(activeLineTab === 'all' || activeLineTab === 'heart') && (
                                                        <g>
                                                            <path
                                                                d="M 95 245 C 135 235, 165 225, 195 210"
                                                                fill="none"
                                                                stroke="#ec4899"
                                                                strokeWidth={activeLineTab === 'heart' ? "6.5" : "4.5"}
                                                                strokeLinecap="round"
                                                                className="draw-hand-line"
                                                                style={{ filter: 'drop-shadow(0 0 10px #ec4899)' }}
                                                            />
                                                            <circle cx="95" cy="245" r="5" fill="#f472b6" />
                                                            <circle cx="195" cy="210" r="5" fill="#f472b6" />
                                                            <text x="135" y="222" fill="#fbcfe8" fontSize="13" fontWeight="900" style={{ filter: 'drop-shadow(0 1px 4px #000)' }}>감정선</text>
                                                        </g>
                                                    )}

                                                    {/* 4. 재물선 / 운명선 (Wealth & Fate Line) - Ascends through Palm Center */}
                                                    {(activeLineTab === 'all' || activeLineTab === 'wealth') && (
                                                        <g>
                                                            <path
                                                                d="M 175 385 C 173 330, 170 270, 168 220"
                                                                fill="none"
                                                                stroke="#f59e0b"
                                                                strokeWidth={activeLineTab === 'wealth' ? "6.5" : "4.5"}
                                                                strokeLinecap="round"
                                                                className="draw-hand-line"
                                                                style={{ filter: 'drop-shadow(0 0 10px #f59e0b)' }}
                                                            />
                                                            <circle cx="175" cy="385" r="5" fill="#fbbf24" />
                                                            <circle cx="168" cy="220" r="5" fill="#fbbf24" />
                                                            <text x="150" y="340" fill="#fde68a" fontSize="13" fontWeight="900" style={{ filter: 'drop-shadow(0 1px 4px #000)' }}>재물선</text>
                                                        </g>
                                                    )}
                                                </>
                                            ) : (
                                                /* ================= LEFT HAND (Thumb on Left) ================= */
                                                <>
                                                    {/* 1. 생명선 (Life Line) - Wraps Thumb Mount on Left */}
                                                    {(activeLineTab === 'all' || activeLineTab === 'life') && (
                                                        <g>
                                                            <path
                                                                d="M 145 235 C 125 270, 130 335, 175 385"
                                                                fill="none"
                                                                stroke="#10b981"
                                                                strokeWidth={activeLineTab === 'life' ? "6.5" : "4.5"}
                                                                strokeLinecap="round"
                                                                className="draw-hand-line"
                                                                style={{ filter: 'drop-shadow(0 0 10px #10b981)' }}
                                                            />
                                                            <circle cx="145" cy="235" r="5" fill="#34d399" />
                                                            <circle cx="175" cy="385" r="5" fill="#34d399" />
                                                            <text x="115" y="325" fill="#a7f3d0" fontSize="13" fontWeight="900" style={{ filter: 'drop-shadow(0 1px 4px #000)' }}>생명선</text>
                                                        </g>
                                                    )}

                                                    {/* 2. 두뇌선 (Head Line) - Starts with Life Line, Slopes Right */}
                                                    {(activeLineTab === 'all' || activeLineTab === 'head') && (
                                                        <g>
                                                            <path
                                                                d="M 145 235 C 180 265, 215 295, 255 315"
                                                                fill="none"
                                                                stroke="#06b6d4"
                                                                strokeWidth={activeLineTab === 'head' ? "6.5" : "4.5"}
                                                                strokeLinecap="round"
                                                                className="draw-hand-line"
                                                                style={{ filter: 'drop-shadow(0 0 10px #06b6d4)' }}
                                                            />
                                                            <circle cx="145" cy="235" r="5" fill="#22d3ee" />
                                                            <circle cx="255" cy="315" r="5" fill="#22d3ee" />
                                                            <text x="180" y="275" fill="#a5f3fc" fontSize="13" fontWeight="900" style={{ filter: 'drop-shadow(0 1px 4px #000)' }}>두뇌선</text>
                                                        </g>
                                                    )}

                                                    {/* 3. 감정선 (Heart Line) - Starts under Pinky on Right, curves Left */}
                                                    {(activeLineTab === 'all' || activeLineTab === 'heart') && (
                                                        <g>
                                                            <path
                                                                d="M 265 245 C 225 235, 195 225, 165 210"
                                                                fill="none"
                                                                stroke="#ec4899"
                                                                strokeWidth={activeLineTab === 'heart' ? "6.5" : "4.5"}
                                                                strokeLinecap="round"
                                                                className="draw-hand-line"
                                                                style={{ filter: 'drop-shadow(0 0 10px #ec4899)' }}
                                                            />
                                                            <circle cx="265" cy="245" r="5" fill="#f472b6" />
                                                            <circle cx="165" cy="210" r="5" fill="#f472b6" />
                                                            <text x="185" y="222" fill="#fbcfe8" fontSize="13" fontWeight="900" style={{ filter: 'drop-shadow(0 1px 4px #000)' }}>감정선</text>
                                                        </g>
                                                    )}

                                                    {/* 4. 재물선 / 운명선 (Wealth & Fate Line) - Ascends through Palm Center */}
                                                    {(activeLineTab === 'all' || activeLineTab === 'wealth') && (
                                                        <g>
                                                            <path
                                                                d="M 185 385 C 187 330, 190 270, 192 220"
                                                                fill="none"
                                                                stroke="#f59e0b"
                                                                strokeWidth={activeLineTab === 'wealth' ? "6.5" : "4.5"}
                                                                strokeLinecap="round"
                                                                className="draw-hand-line"
                                                                style={{ filter: 'drop-shadow(0 0 10px #f59e0b)' }}
                                                            />
                                                            <circle cx="185" cy="385" r="5" fill="#fbbf24" />
                                                            <circle cx="192" cy="220" r="5" fill="#fbbf24" />
                                                            <text x="195" y="340" fill="#fde68a" fontSize="13" fontWeight="900" style={{ filter: 'drop-shadow(0 1px 4px #000)' }}>재물선</text>
                                                        </g>
                                                    )}
                                                </>
                                            )}
                                        </g>
                                    </svg>
                                )}

                                {/* --- FACE: 3-Zone (상정, 중정, 하정) Golden Ratio Facial Analysis Overlay --- */}
                                {currentCategory === 'face' && (
                                    <svg
                                        key={animationKey}
                                        viewBox="0 0 360 440"
                                        style={{
                                            position: 'absolute',
                                            inset: 0,
                                            width: '100%',
                                            height: '100%',
                                            pointerEvents: 'none'
                                        }}
                                    >
                                        {/* 상정 (이마: 초년운) */}
                                        {(activeFaceTab === 'all' || activeFaceTab === 'forehead') && (
                                            <g>
                                                <rect x="70" y="65" width="220" height="90" rx="14" fill="rgba(59, 130, 246, 0.15)" stroke="#3b82f6" strokeWidth={activeFaceTab === 'forehead' ? "3.5" : "2"} strokeDasharray="6 4" />
                                                <circle cx="180" cy="110" r="5" fill="#60a5fa" />
                                                <text x="80" y="90" fill="#93c5fd" fontSize="12" fontWeight="900">상정 (이마·초년운)</text>
                                            </g>
                                        )}

                                        {/* 중정 (눈·코: 중년운 & 재물운) */}
                                        {(activeFaceTab === 'all' || activeFaceTab === 'eyes' || activeFaceTab === 'nose') && (
                                            <g>
                                                <rect x="65" y="160" width="230" height="115" rx="14" fill="rgba(245, 158, 11, 0.15)" stroke="#f59e0b" strokeWidth={activeFaceTab === 'nose' || activeFaceTab === 'eyes' ? "3.5" : "2"} strokeDasharray="6 4" />
                                                <ellipse cx="130" cy="185" rx="20" ry="10" stroke="#f59e0b" strokeWidth="1.5" fill="none" />
                                                <ellipse cx="230" cy="185" rx="20" ry="10" stroke="#f59e0b" strokeWidth="1.5" fill="none" />
                                                <circle cx="180" cy="245" r="7" fill="#fbbf24" />
                                                <text x="75" y="180" fill="#fde68a" fontSize="12" fontWeight="900">중정 (눈·코·중년운)</text>
                                            </g>
                                        )}

                                        {/* 하정 (입술·턱: 말년운) */}
                                        {(activeFaceTab === 'all' || activeFaceTab === 'mouth') && (
                                            <g>
                                                <rect x="75" y="280" width="210" height="105" rx="14" fill="rgba(236, 72, 153, 0.15)" stroke="#ec4899" strokeWidth={activeFaceTab === 'mouth' ? "3.5" : "2"} strokeDasharray="6 4" />
                                                <path d="M 155 315 Q 180 325 205 315" stroke="#ec4899" strokeWidth="2.5" fill="none" />
                                                <circle cx="180" cy="355" r="6" fill="#f472b6" />
                                                <text x="85" y="300" fill="#fbcfe8" fontSize="12" fontWeight="900">하정 (입술·턱·말년운)</text>
                                            </g>
                                        )}
                                    </svg>
                                )}
                            </div>

                            {/* Replay Drawing Animation Button */}
                            {currentCategory === 'palm' && (
                                <button
                                    onClick={handleReplayPalmAnimation}
                                    style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '6px',
                                        padding: '8px 18px',
                                        borderRadius: '16px',
                                        background: 'rgba(16, 185, 129, 0.2)',
                                        border: '1px solid rgba(16, 185, 129, 0.4)',
                                        color: '#a7f3d0',
                                        fontSize: '0.9rem',
                                        fontWeight: '800',
                                        cursor: 'pointer',
                                        transition: 'all 0.2s'
                                    }}
                                >
                                    <Play size={15} fill="#a7f3d0" />
                                    손금 드로잉 애니메이션 다시 재생
                                </button>
                            )}
                        </div>

                        {/* RIGHT COLUMN: Interactive Interpretation Breakdown */}
                        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '18px', minWidth: '320px' }}>
                            
                            {/* Summary Card */}
                            <div style={{
                                background: 'rgba(255, 255, 255, 0.05)',
                                padding: '18px 22px',
                                borderRadius: '20px',
                                borderLeft: `6px solid ${currentCategory === 'palm' ? '#10b981' : '#f59e0b'}`,
                                fontSize: '1.18rem',
                                color: '#f8fafc',
                                lineHeight: 1.65,
                                fontWeight: '500'
                            }}>
                                {fortuneResult.summary}
                            </div>

                            {/* Interactive Line / Feature Filter Tabs */}
                            {currentCategory === 'palm' ? (
                                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                                    {[
                                        { id: 'all', label: '🌟 전체 선 보기', color: '#10b981' },
                                        { id: 'life', label: '🧬 생명선', color: '#10b981' },
                                        { id: 'head', label: '🧠 두뇌선', color: '#06b6d4' },
                                        { id: 'heart', label: '❤️ 감정선', color: '#ec4899' },
                                        { id: 'wealth', label: '💰 재물선', color: '#f59e0b' }
                                    ].map(tab => {
                                        const isSelected = activeLineTab === tab.id;
                                        return (
                                            <button
                                                key={tab.id}
                                                onClick={() => {
                                                    setActiveLineTab(tab.id);
                                                    broadcastState({ activeLineTab: tab.id });
                                                }}
                                                style={{
                                                    padding: '8px 16px',
                                                    borderRadius: '14px',
                                                    border: isSelected ? `2px solid ${tab.color}` : '1px solid rgba(255,255,255,0.15)',
                                                    background: isSelected ? `${tab.color}33` : 'rgba(255,255,255,0.05)',
                                                    color: isSelected ? 'white' : '#cbd5e1',
                                                    fontWeight: '800',
                                                    fontSize: '0.92rem',
                                                    cursor: 'pointer',
                                                    transition: 'all 0.2s'
                                                }}
                                            >
                                                {tab.label}
                                            </button>
                                        );
                                    })}
                                </div>
                            ) : (
                                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                                    {[
                                        { id: 'all', label: '🌟 전체 삼정 보기', color: '#f59e0b' },
                                        { id: 'forehead', label: '🏔️ 상정 (이마)', color: '#3b82f6' },
                                        { id: 'eyes', label: '👁️ 눈·눈썹', color: '#10b981' },
                                        { id: 'nose', label: '👃 중정 (코)', color: '#f59e0b' },
                                        { id: 'mouth', label: '👄 하정 (입술·턱)', color: '#ec4899' }
                                    ].map(tab => {
                                        const isSelected = activeFaceTab === tab.id;
                                        return (
                                            <button
                                                key={tab.id}
                                                onClick={() => {
                                                    setActiveFaceTab(tab.id);
                                                    broadcastState({ activeFaceTab: tab.id });
                                                }}
                                                style={{
                                                    padding: '8px 16px',
                                                    borderRadius: '14px',
                                                    border: isSelected ? `2px solid ${tab.color}` : '1px solid rgba(255,255,255,0.15)',
                                                    background: isSelected ? `${tab.color}33` : 'rgba(255,255,255,0.05)',
                                                    color: isSelected ? 'white' : '#cbd5e1',
                                                    fontWeight: '800',
                                                    fontSize: '0.92rem',
                                                    cursor: 'pointer',
                                                    transition: 'all 0.2s'
                                                }}
                                            >
                                                {tab.label}
                                            </button>
                                        );
                                    })}
                                </div>
                            )}

                            {/* Detailed Grid Interpretation */}
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                                {currentCategory === 'palm' ? (
                                    <>
                                        <div style={{
                                            background: activeLineTab === 'life' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(255,255,255,0.03)',
                                            border: activeLineTab === 'life' ? '2px solid #10b981' : '1px solid rgba(255,255,255,0.08)',
                                            padding: '14px 18px',
                                            borderRadius: '16px',
                                            transition: 'all 0.25s'
                                        }}>
                                            <div style={{ color: '#10b981', fontWeight: '900', fontSize: '1rem', marginBottom: '6px' }}>🧬 생명선 (건강·장수)</div>
                                            <div style={{ fontSize: '0.92rem', color: '#cbd5e1', lineHeight: 1.5 }}>{fortuneResult.lifeLine}</div>
                                        </div>
                                        <div style={{
                                            background: activeLineTab === 'head' ? 'rgba(6, 182, 212, 0.15)' : 'rgba(255,255,255,0.03)',
                                            border: activeLineTab === 'head' ? '2px solid #06b6d4' : '1px solid rgba(255,255,255,0.08)',
                                            padding: '14px 18px',
                                            borderRadius: '16px',
                                            transition: 'all 0.25s'
                                        }}>
                                            <div style={{ color: '#06b6d4', fontWeight: '900', fontSize: '1rem', marginBottom: '6px' }}>🧠 두뇌선 (지혜·재능)</div>
                                            <div style={{ fontSize: '0.92rem', color: '#cbd5e1', lineHeight: 1.5 }}>{fortuneResult.headLine}</div>
                                        </div>
                                        <div style={{
                                            background: activeLineTab === 'heart' ? 'rgba(236, 72, 153, 0.15)' : 'rgba(255,255,255,0.03)',
                                            border: activeLineTab === 'heart' ? '2px solid #ec4899' : '1px solid rgba(255,255,255,0.08)',
                                            padding: '14px 18px',
                                            borderRadius: '16px',
                                            transition: 'all 0.25s'
                                        }}>
                                            <div style={{ color: '#ec4899', fontWeight: '900', fontSize: '1rem', marginBottom: '6px' }}>❤️ 감정선 (애정·인복)</div>
                                            <div style={{ fontSize: '0.92rem', color: '#cbd5e1', lineHeight: 1.5 }}>{fortuneResult.heartLine}</div>
                                        </div>
                                        <div style={{
                                            background: activeLineTab === 'wealth' ? 'rgba(245, 158, 11, 0.15)' : 'rgba(255,255,255,0.03)',
                                            border: activeLineTab === 'wealth' ? '2px solid #f59e0b' : '1px solid rgba(255,255,255,0.08)',
                                            padding: '14px 18px',
                                            borderRadius: '16px',
                                            transition: 'all 0.25s'
                                        }}>
                                            <div style={{ color: '#f59e0b', fontWeight: '900', fontSize: '1rem', marginBottom: '6px' }}>💰 재물선 (사업·자산)</div>
                                            <div style={{ fontSize: '0.92rem', color: '#cbd5e1', lineHeight: 1.5 }}>{fortuneResult.wealthLine}</div>
                                        </div>
                                    </>
                                ) : (
                                    <>
                                        <div style={{
                                            background: activeFaceTab === 'forehead' ? 'rgba(59, 130, 246, 0.15)' : 'rgba(255,255,255,0.03)',
                                            border: activeFaceTab === 'forehead' ? '2px solid #3b82f6' : '1px solid rgba(255,255,255,0.08)',
                                            padding: '14px 18px',
                                            borderRadius: '16px',
                                            transition: 'all 0.25s'
                                        }}>
                                            <div style={{ color: '#3b82f6', fontWeight: '900', fontSize: '1rem', marginBottom: '6px' }}>🏔️ 상정 - 이마 (초년운·명예)</div>
                                            <div style={{ fontSize: '0.92rem', color: '#cbd5e1', lineHeight: 1.5 }}>{fortuneResult.forehead}</div>
                                        </div>
                                        <div style={{
                                            background: activeFaceTab === 'eyes' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(255,255,255,0.03)',
                                            border: activeFaceTab === 'eyes' ? '2px solid #10b981' : '1px solid rgba(255,255,255,0.08)',
                                            padding: '14px 18px',
                                            borderRadius: '16px',
                                            transition: 'all 0.25s'
                                        }}>
                                            <div style={{ color: '#10b981', fontWeight: '900', fontSize: '1rem', marginBottom: '6px' }}>👁️ 눈·눈썹 (지혜·혜안)</div>
                                            <div style={{ fontSize: '0.92rem', color: '#cbd5e1', lineHeight: 1.5 }}>{fortuneResult.eyes}</div>
                                        </div>
                                        <div style={{
                                            background: activeFaceTab === 'nose' ? 'rgba(245, 158, 11, 0.15)' : 'rgba(255,255,255,0.03)',
                                            border: activeFaceTab === 'nose' ? '2px solid #f59e0b' : '1px solid rgba(255,255,255,0.08)',
                                            padding: '14px 18px',
                                            borderRadius: '16px',
                                            transition: 'all 0.25s'
                                        }}>
                                            <div style={{ color: '#f59e0b', fontWeight: '900', fontSize: '1rem', marginBottom: '6px' }}>👃 중정 - 코 (재물운·중년운)</div>
                                            <div style={{ fontSize: '0.92rem', color: '#cbd5e1', lineHeight: 1.5 }}>{fortuneResult.nose}</div>
                                        </div>
                                        <div style={{
                                            background: activeFaceTab === 'mouth' ? 'rgba(236, 72, 153, 0.15)' : 'rgba(255,255,255,0.03)',
                                            border: activeFaceTab === 'mouth' ? '2px solid #ec4899' : '1px solid rgba(255,255,255,0.08)',
                                            padding: '14px 18px',
                                            borderRadius: '16px',
                                            transition: 'all 0.25s'
                                        }}>
                                            <div style={{ color: '#ec4899', fontWeight: '900', fontSize: '1rem', marginBottom: '6px' }}>👄 하정 - 입술·턱 (말년운·인덕)</div>
                                            <div style={{ fontSize: '0.92rem', color: '#cbd5e1', lineHeight: 1.5 }}>{fortuneResult.mouth}</div>
                                        </div>
                                    </>
                                )}
                            </div>

                            {/* Lucky Tip */}
                            <div style={{
                                background: 'rgba(245, 158, 11, 0.12)',
                                border: '1.5px dashed #f59e0b',
                                padding: '14px 20px',
                                borderRadius: '16px',
                                color: '#fde68a',
                                fontSize: '1rem',
                                fontWeight: '800'
                            }}>
                                💡 <strong>행운의 개운 비결:</strong> {fortuneResult.luckyTip}
                            </div>
                        </div>
                    </div>

                    {/* Bottom Action Buttons */}
                    <div style={{ display: 'flex', gap: '16px', justifyContent: 'center', marginTop: '12px' }}>
                        <button
                            onClick={() => {
                                setCapturedImage(null);
                                setFortuneResult(null);
                                startCamera();
                                broadcastState({ capturedImage: null, fortuneResult: null });
                            }}
                            style={{
                                padding: '14px 34px',
                                fontSize: '1.15rem',
                                fontWeight: '900',
                                borderRadius: '20px',
                                background: currentCategory === 'palm' ? '#10b981' : '#f59e0b',
                                border: 'none',
                                color: 'white',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '8px',
                                boxShadow: '0 6px 20px rgba(0,0,0,0.3)'
                            }}
                        >
                            <RefreshCw size={20} /> 다시 측정하기
                        </button>
                        <button
                            onClick={() => handleSelectCategory('menu')}
                            style={{
                                padding: '14px 28px',
                                fontSize: '1.15rem',
                                fontWeight: '800',
                                borderRadius: '20px',
                                background: 'rgba(255, 255, 255, 0.15)',
                                border: '1px solid rgba(255, 255, 255, 0.25)',
                                color: 'white',
                                cursor: 'pointer'
                            }}
                        >
                            다른 운세 보기
                        </button>
                    </div>
                </div>
            )}

            {/* --- VIEW 4: TAROT CARD READING --- */}
            {currentCategory === 'tarot' && (
                <div style={{
                    width: '100%',
                    maxWidth: '1150px',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: '24px'
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', flexWrap: 'wrap', gap: '12px' }}>
                        <div>
                            <h2 style={{ fontSize: '1.9rem', fontWeight: '900', color: '#e9d5ff', margin: 0 }}>
                                🃏 신비의 메이저 타로 카드
                            </h2>
                            <p style={{ fontSize: '1rem', color: '#94a3b8', margin: '4px 0 0 0' }}>
                                {tarotRevealed
                                    ? '선택하신 카드의 심오한 운세 해설입니다.'
                                    : (tarotMode === 'single' ? '마음에 이끌리는 카드 1장을 클릭하세요.' : `마음에 이끌리는 카드 3장을 차례로 선택하세요 (${selectedCards.length}/3)`)}
                            </p>
                        </div>

                        {!tarotRevealed && (
                            <div style={{ display: 'flex', gap: '8px', background: 'rgba(255,255,255,0.08)', padding: '6px', borderRadius: '16px' }}>
                                <button
                                    onClick={() => { setTarotMode('single'); setSelectedCards([]); broadcastState({ tarotMode: 'single', selectedCards: [] }); }}
                                    style={{
                                        padding: '8px 18px',
                                        borderRadius: '12px',
                                        border: 'none',
                                        background: tarotMode === 'single' ? '#8b5cf6' : 'transparent',
                                        color: 'white',
                                        fontWeight: '800',
                                        cursor: 'pointer'
                                    }}
                                >
                                    원포인트 (1장)
                                </button>
                                <button
                                    onClick={() => { setTarotMode('three'); setSelectedCards([]); broadcastState({ tarotMode: 'three', selectedCards: [] }); }}
                                    style={{
                                        padding: '8px 18px',
                                        borderRadius: '12px',
                                        border: 'none',
                                        background: tarotMode === 'three' ? '#8b5cf6' : 'transparent',
                                        color: 'white',
                                        fontWeight: '800',
                                        cursor: 'pointer'
                                    }}
                                >
                                    과거·현재·미래 (3장)
                                </button>
                                <button
                                    onClick={shuffleTarotDeck}
                                    style={{
                                        padding: '8px 16px',
                                        borderRadius: '12px',
                                        border: '1px solid rgba(255,255,255,0.2)',
                                        background: 'rgba(255,255,255,0.1)',
                                        color: 'white',
                                        cursor: 'pointer',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '6px'
                                    }}
                                    title="카드 다시 섞기"
                                >
                                    <Shuffle size={16} /> 셔플
                                </button>
                            </div>
                        )}
                    </div>

                    {/* Tarot Deck Face-Down Arc Layout (Before Reveal) */}
                    {!tarotRevealed && (
                        <div style={{
                            display: 'flex',
                            flexWrap: 'wrap',
                            justifyContent: 'center',
                            gap: '14px',
                            padding: '20px 0',
                            maxWidth: '980px'
                        }}>
                            {shuffledDeck.slice(0, 11).map((card) => {
                                const isPicked = selectedCards.some(c => c.id === card.id);
                                return (
                                    <div
                                        key={card.id}
                                        onClick={() => handleSelectTarotCard(card)}
                                        style={{
                                            width: '125px',
                                            height: '195px',
                                            borderRadius: '20px',
                                            background: isPicked
                                                ? 'linear-gradient(145deg, #7c3aed 0%, #4c1d95 100%)'
                                                : 'linear-gradient(145deg, #1e1b4b 0%, #0f172a 100%)',
                                            border: `3px solid ${isPicked ? '#c084fc' : '#4338ca'}`,
                                            boxShadow: isPicked
                                                ? '0 0 25px #a855f7, 0 10px 20px rgba(0,0,0,0.5)'
                                                : '0 8px 20px rgba(0,0,0,0.4)',
                                            cursor: 'pointer',
                                            display: 'flex',
                                            flexDirection: 'column',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            transform: isPicked ? 'translateY(-16px) scale(1.05)' : 'none',
                                            transition: 'all 0.25s cubic-bezier(0.34, 1.56, 0.64, 1)',
                                            userSelect: 'none',
                                            position: 'relative'
                                        }}
                                        onMouseEnter={(e) => {
                                            if (!isPicked) {
                                                e.currentTarget.style.transform = 'translateY(-10px) scale(1.04)';
                                                e.currentTarget.style.borderColor = '#818cf8';
                                            }
                                        }}
                                        onMouseLeave={(e) => {
                                            if (!isPicked) {
                                                e.currentTarget.style.transform = 'none';
                                                e.currentTarget.style.borderColor = '#4338ca';
                                            }
                                        }}
                                    >
                                        <div style={{
                                            width: '75px',
                                            height: '115px',
                                            borderRadius: '14px',
                                            border: '2px dashed rgba(168, 85, 247, 0.5)',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            background: 'rgba(255,255,255,0.03)'
                                        }}>
                                            <Sparkles size={34} color="#c084fc" />
                                        </div>
                                        <div style={{ fontSize: '0.78rem', fontWeight: 'bold', color: '#a5b4fc', marginTop: '10px' }}>
                                            {isPicked ? '✓ 선택됨' : 'TAROT'}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}

                    {/* Tarot Revealed Result */}
                    {tarotRevealed && (
                        <div style={{
                            width: '100%',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '24px',
                            animation: 'popIn 0.4s ease'
                        }}>
                            <div style={{
                                display: 'grid',
                                gridTemplateColumns: selectedCards.length === 1 ? '1fr' : 'repeat(auto-fit, minmax(320px, 1fr))',
                                gap: '24px'
                            }}>
                                {selectedCards.map((card, idx) => {
                                    const spreadLabel = tarotMode === 'three' ? (idx === 0 ? '과거의 흐름' : idx === 1 ? '현재의 중심' : '미래의 결실') : '오늘의 운세 카드';
                                    return (
                                        <div
                                            key={card.id}
                                            style={{
                                                background: 'rgba(24, 24, 27, 0.96)',
                                                border: `3px solid ${card.color}`,
                                                borderRadius: '28px',
                                                padding: '30px',
                                                boxShadow: `0 16px 40px ${card.color}33`,
                                                display: 'flex',
                                                flexDirection: 'column',
                                                gap: '16px'
                                            }}
                                        >
                                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '14px' }}>
                                                <span style={{ fontSize: '0.92rem', fontWeight: '800', color: card.color, background: `${card.color}22`, padding: '6px 14px', borderRadius: '12px' }}>
                                                    {spreadLabel}
                                                </span>
                                                <span style={{ fontSize: '1.25rem', fontWeight: '900', color: '#cbd5e1' }}>
                                                    CARD {card.numeral}
                                                </span>
                                            </div>

                                            <div style={{ display: 'flex', alignItems: 'center', gap: '18px' }}>
                                                <div style={{
                                                    fontSize: '3.6rem',
                                                    width: '84px',
                                                    height: '84px',
                                                    borderRadius: '22px',
                                                    background: `${card.color}22`,
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center',
                                                    flexShrink: 0
                                                }}>
                                                    {card.icon}
                                                </div>
                                                <div>
                                                    <h3 style={{ fontSize: '1.9rem', fontWeight: '900', color: 'white', margin: '0 0 4px 0' }}>
                                                        {card.name}
                                                    </h3>
                                                    <div style={{ fontSize: '0.95rem', color: card.color, fontWeight: '700' }}>
                                                        {card.keywords}
                                                    </div>
                                                </div>
                                            </div>

                                            <div style={{
                                                background: 'rgba(255,255,255,0.04)',
                                                padding: '16px 18px',
                                                borderRadius: '16px',
                                                fontSize: '1.05rem',
                                                color: '#f8fafc',
                                                lineHeight: 1.6
                                            }}>
                                                {card.general}
                                            </div>

                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '0.92rem' }}>
                                                <div style={{ display: 'flex', gap: '8px' }}>
                                                    <span style={{ color: '#ec4899', fontWeight: 'bold' }}>💖 애정운:</span>
                                                    <span style={{ color: '#cbd5e1' }}>{card.love}</span>
                                                </div>
                                                <div style={{ display: 'flex', gap: '8px' }}>
                                                    <span style={{ color: '#f59e0b', fontWeight: 'bold' }}>💰 금전운:</span>
                                                    <span style={{ color: '#cbd5e1' }}>{card.money}</span>
                                                </div>
                                            </div>

                                            <div style={{
                                                background: `${card.color}15`,
                                                border: `1.5px dashed ${card.color}`,
                                                padding: '12px 16px',
                                                borderRadius: '14px',
                                                color: '#f1f5f9',
                                                fontSize: '0.94rem',
                                                fontWeight: '600'
                                            }}>
                                                ✨ <strong>조언:</strong> {card.advice}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>

                            <div style={{ display: 'flex', gap: '16px', justifyContent: 'center', marginTop: '12px' }}>
                                <button
                                    onClick={shuffleTarotDeck}
                                    style={{
                                        padding: '14px 34px',
                                        fontSize: '1.15rem',
                                        fontWeight: '900',
                                        borderRadius: '20px',
                                        background: 'linear-gradient(135deg, #8b5cf6 0%, #6d28d9 100%)',
                                        border: 'none',
                                        color: 'white',
                                        cursor: 'pointer',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '8px'
                                    }}
                                >
                                    <Shuffle size={20} /> 다시 뽑기
                                </button>
                                <button
                                    onClick={() => handleSelectCategory('menu')}
                                    style={{
                                        padding: '14px 28px',
                                        fontSize: '1.15rem',
                                        fontWeight: '800',
                                        borderRadius: '20px',
                                        background: 'rgba(255, 255, 255, 0.15)',
                                        border: '1px solid rgba(255, 255, 255, 0.25)',
                                        color: 'white',
                                        cursor: 'pointer'
                                    }}
                                >
                                    다른 운세 보기
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* Injected Animation Styles */}
            <style>{`
                @keyframes scanLine {
                    0% { top: 6%; opacity: 0.8; }
                    50% { top: 92%; opacity: 1; }
                    100% { top: 6%; opacity: 0.8; }
                }
                @keyframes spinSlow {
                    from { transform: rotate(0deg); }
                    to { transform: rotate(360deg); }
                }
                .animate-spin-slow {
                    animation: spinSlow 12s linear infinite;
                }
                .draw-hand-line {
                    stroke-dasharray: 450;
                    stroke-dashoffset: 450;
                    animation: animateHandLine 1.8s cubic-bezier(0.25, 1, 0.5, 1) forwards;
                }
                @keyframes animateHandLine {
                    to {
                        stroke-dashoffset: 0;
                    }
                }
                .pulse-outline {
                    animation: pulseHand 2.2s infinite ease-in-out;
                }
                @keyframes pulseHand {
                    0%, 100% { stroke: #10b981; filter: drop-shadow(0 0 6px #10b981); opacity: 0.85; }
                    50% { stroke: #34d399; filter: drop-shadow(0 0 16px #34d399); opacity: 1; }
                }
                .pulse-outline-gold {
                    animation: pulseGold 2.2s infinite ease-in-out;
                }
                @keyframes pulseGold {
                    0%, 100% { stroke: #f59e0b; filter: drop-shadow(0 0 6px #f59e0b); opacity: 0.85; }
                    50% { stroke: #fbbf24; filter: drop-shadow(0 0 16px #fbbf24); opacity: 1; }
                }
                @keyframes popIn {
                    0% { transform: scale(0.92); opacity: 0; }
                    100% { transform: scale(1); opacity: 1; }
                }
            `}</style>
        </div>
    );
}
