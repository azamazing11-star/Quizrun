import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Play, RotateCcw, Plus, Edit3, Sparkles, Trophy, Award, CheckCircle2 } from 'lucide-react';
import { playSound } from '../utils/audio';
import { DEFAULT_CARD_THEMES, getSavedCardThemes, saveCardThemes } from '../data/cardThemes';
import { getCardCoordinate } from './MultiplayerLiveSpectator';
import CardThemeBar from './CardThemeBar';
import { preloadGameAssets } from '../utils/assetPreloader';


// 카드 뒷면 전용 컴포넌트 (일반 카드 무늬 vs 1~20 순서 번호)
function CardBackFace({ number, showNumbers = false, isHost = false }) {
    if (showNumbers) {
        return (
            <div style={{
                width: '100%',
                height: '100%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                position: 'relative',
                background: 'linear-gradient(135deg, #1e3a8a 0%, #2563eb 50%, #1d4ed8 100%)',
                boxSizing: 'border-box'
            }}>
                {/* 안쪽 얇은 테두리 라인 */}
                <div style={{
                    position: 'absolute',
                    inset: '3px',
                    border: '1px solid rgba(255, 255, 255, 0.35)',
                    borderRadius: isHost ? '7px' : '5px',
                    pointerEvents: 'none'
                }} />

                {/* 중앙 1~20 순서 번호 배지 */}
                <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    width: isHost ? '44px' : '36px',
                    height: isHost ? '44px' : '36px',
                    borderRadius: '50%',
                    background: 'rgba(255, 255, 255, 0.18)',
                    boxShadow: 'inset 0 1px 3px rgba(255, 255, 255, 0.3), 0 2px 6px rgba(0, 0, 0, 0.3)',
                    border: '1.5px solid rgba(255, 255, 255, 0.45)'
                }}>
                    <span style={{
                        color: '#ffffff',
                        fontSize: isHost ? '1.45rem' : '1.2rem',
                        fontWeight: '950',
                        letterSpacing: '-0.5px',
                        textShadow: '0 2px 4px rgba(0, 0, 0, 0.6)',
                        fontFamily: 'system-ui, -apple-system, sans-serif',
                        lineHeight: 1
                    }}>
                        {number}
                    </span>
                </div>
            </div>
        );
    }

    // 일반 클래식 트럼프 카드 뒷면 무늬 (Bicycle 카드 스타일)
    return (
        <div style={{
            width: '100%',
            height: '100%',
            position: 'relative',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'linear-gradient(135deg, #1e3a8a 0%, #1e40af 50%, #0f172a 100%)',
            overflow: 'hidden',
            boxSizing: 'border-box'
        }}>
            {/* 정교한 다이아몬드 크로스해치 능형 패턴 SVG */}
            <svg
                width="100%"
                height="100%"
                style={{
                    position: 'absolute',
                    inset: 0,
                    opacity: 0.28,
                    pointerEvents: 'none'
                }}
            >
                <defs>
                    <pattern id="classicCardPattern" width="12" height="12" patternUnits="userSpaceOnUse">
                        <path d="M6 0 L12 6 L6 12 L0 6 Z" fill="none" stroke="#ffffff" strokeWidth="0.8" />
                        <circle cx="6" cy="6" r="1.1" fill="#ffffff" />
                    </pattern>
                </defs>
                <rect width="100%" height="100%" fill="url(#classicCardPattern)" />
            </svg>

            {/* 내부 프레임 이중 테두리 라인 */}
            <div style={{
                position: 'absolute',
                inset: '3px',
                border: '1.5px solid rgba(255, 255, 255, 0.55)',
                borderRadius: isHost ? '7px' : '5px',
                pointerEvents: 'none',
                boxShadow: 'inset 0 0 5px rgba(0, 0, 0, 0.25)'
            }}>
                <div style={{
                    position: 'absolute',
                    inset: '1.5px',
                    border: '0.8px dashed rgba(255, 255, 255, 0.35)',
                    borderRadius: isHost ? '5px' : '3px'
                }} />
            </div>

            {/* 4 코너 미니 카드 슈트(♦) 장식 */}
            <span style={{ position: 'absolute', top: '5px', left: '6px', fontSize: isHost ? '0.7rem' : '0.6rem', color: 'rgba(255,255,255,0.7)', lineHeight: 1 }}>♦</span>
            <span style={{ position: 'absolute', top: '5px', right: '6px', fontSize: isHost ? '0.7rem' : '0.6rem', color: 'rgba(255,255,255,0.7)', lineHeight: 1 }}>♦</span>
            <span style={{ position: 'absolute', bottom: '5px', left: '6px', fontSize: isHost ? '0.7rem' : '0.6rem', color: 'rgba(255,255,255,0.7)', lineHeight: 1 }}>♦</span>
            <span style={{ position: 'absolute', bottom: '5px', right: '6px', fontSize: isHost ? '0.7rem' : '0.6rem', color: 'rgba(255,255,255,0.7)', lineHeight: 1 }}>♦</span>

            {/* 중앙 고급 카드 엠블럼 원형 배지 + 스페이드(♠) 심볼 */}
            <div style={{
                position: 'relative',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: isHost ? '40px' : '32px',
                height: isHost ? '40px' : '32px',
                borderRadius: '50%',
                background: 'radial-gradient(circle, rgba(30, 58, 138, 0.95) 0%, rgba(15, 23, 42, 0.95) 100%)',
                border: '1.5px solid rgba(255, 255, 255, 0.8)',
                boxShadow: '0 2px 8px rgba(0, 0, 0, 0.45), inset 0 1px 3px rgba(255, 255, 255, 0.35)'
            }}>
                <span style={{
                    fontSize: isHost ? '1.35rem' : '1.1rem',
                    color: '#ffffff',
                    lineHeight: 1,
                    filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.5))'
                }}>
                    ♠
                </span>
            </div>
        </div>
    );
}


// 양쪽 출제 카드 미리보기 사이드바 컴포넌트 (번호 없이 순수 사진/그림과 이름만 표시)
function CardThemeSidebar({ items, isItemMatched, isHost = true }) {
    if (!items || items.length === 0) return null;

    return (
        <div style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '6px',
            width: isHost ? '150px' : '120px',
            minWidth: isHost ? '140px' : '110px',
            boxSizing: 'border-box',
            userSelect: 'none'
        }}>
            {/* 상단 섹션 타이틀 - 번호 일체 제거 */}
            <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '5px',
                padding: '5px 8px',
                background: '#f8fafc',
                borderRadius: '8px',
                fontSize: '0.76rem',
                fontWeight: '900',
                color: '#334155',
                border: '1px solid #e2e8f0',
                boxShadow: '0 1px 2px rgba(0,0,0,0.03)'
            }}>
                <span>🃏 출제 카드</span>
            </div>

            {/* 카드 5개 세로 나열 */}
            <div style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '6px'
            }}>
                {items.map((item, idx) => {
                    const itemName = item.name || (item.flag ? item.flag.replace('.jpg', '') : '');
                    const isMatched = isItemMatched(item);

                    return (
                        <div
                            key={item.id || item.itemId || idx}
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '8px',
                                padding: '6px 8px',
                                borderRadius: '10px',
                                background: isMatched
                                    ? 'linear-gradient(135deg, #ecfdf5 0%, #d1fae5 100%)'
                                    : '#ffffff',
                                border: isMatched
                                    ? '1.5px solid #10b981'
                                    : '1.5px solid #e2e8f0',
                                boxShadow: isMatched
                                    ? '0 2px 8px rgba(16, 185, 129, 0.22)'
                                    : '0 1px 3px rgba(0,0,0,0.05)',
                                transition: 'all 0.25s ease',
                                boxSizing: 'border-box',
                                position: 'relative',
                                overflow: 'hidden',
                                height: '64px'
                            }}
                        >
                            {/* 미니 썸네일 (국기/인물 실제 사진 또는 이모지) */}
                            <div style={{
                                width: '38px',
                                height: '38px',
                                flexShrink: 0,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                borderRadius: '6px',
                                overflow: 'hidden',
                                background: isMatched ? '#ffffff' : (item.bg || '#f1f5f9'),
                                border: '1px solid rgba(0,0,0,0.08)',
                                boxShadow: '0 1px 2px rgba(0,0,0,0.06)'
                            }}>
                                {item.image ? (
                                    <img
                                        src={item.image.startsWith('/') || item.image.startsWith('data:') ? item.image : `/flag/${item.image}`}
                                        alt={itemName}
                                        style={{
                                            width: '100%',
                                            height: '100%',
                                            objectFit: 'cover'
                                        }}
                                    />
                                ) : (
                                    <span style={{ fontSize: '1.4rem', lineHeight: 1 }}>
                                        {item.emoji || '⭐'}
                                    </span>
                                )}
                            </div>

                            {/* 이름 및 설명 (번호 표기 없음) */}
                            <div style={{
                                display: 'flex',
                                flexDirection: 'column',
                                flex: 1,
                                minWidth: 0,
                                justifyContent: 'center'
                            }}>
                                <span style={{
                                    fontSize: '0.84rem',
                                    fontWeight: '900',
                                    color: isMatched ? '#065f46' : '#0f172a',
                                    overflow: 'hidden',
                                    textOverflow: 'ellipsis',
                                    whiteSpace: 'nowrap'
                                }}>
                                    {itemName}
                                </span>
                                {item.desc ? (
                                    <span style={{
                                        fontSize: '0.66rem',
                                        color: isMatched ? '#059669' : '#64748b',
                                        overflow: 'hidden',
                                        textOverflow: 'ellipsis',
                                        whiteSpace: 'nowrap',
                                        marginTop: '1px'
                                    }}>
                                        {item.desc}
                                    </span>
                                ) : (
                                    <span style={{
                                        fontSize: '0.66rem',
                                        color: isMatched ? '#10b981' : '#94a3b8',
                                        fontWeight: '700',
                                        marginTop: '1px'
                                    }}>
                                        {isMatched ? '✔ 매칭 완료' : ''}
                                    </span>
                                )}
                            </div>

                            {/* 매칭 완료 체크 뱃지 */}
                            {isMatched && (
                                <div style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    width: '18px',
                                    height: '18px',
                                    borderRadius: '50%',
                                    background: '#10b981',
                                    color: '#ffffff',
                                    fontSize: '0.72rem',
                                    fontWeight: '950',
                                    flexShrink: 0,
                                    boxShadow: '0 1px 3px rgba(16, 185, 129, 0.4)'
                                }}>
                                    ✓
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>
        </div>
    );
}

export default function CardMatchGame({
    socket,
    pin,
    isHost = false,
    nickname = '호스트',
    groupId = null,
    baseScore = 0,
    onScoreUpdate = null
}) {
    const [themes, setThemes] = useState(getSavedCardThemes);
    const [activeThemeId, setActiveThemeId] = useState('flag');
    const [cards, setCards] = useState([]);
    const [flipped, setFlipped] = useState([]);
    const [matched, setMatched] = useState([]);
    const [moves, setMoves] = useState(0);
    const [matchBanner, setMatchBanner] = useState(null);
    const [isPracticeMode, setIsPracticeMode] = useState(false);
    const [showCardNumbers, setShowCardNumbers] = useState(() => {
        try {
            return sessionStorage.getItem('quizrun_card_match_show_numbers') === 'true';
        } catch (e) {
            return false;
        }
    });

    // 뒷면 번호 토글 핸들러 (카드 무늬 <-> 1~20 번호)
    const toggleShowCardNumbers = () => {
        setShowCardNumbers(prev => {
            const nextVal = !prev;
            try {
                sessionStorage.setItem('quizrun_card_match_show_numbers', String(nextVal));
            } catch (e) {}
            if (socket && pin) {
                socket.emit('room:message', {
                    pin,
                    event: 'card_match:toggle_numbers',
                    payload: { showCardNumbers: nextVal }
                });
            }
            return nextVal;
        });
    };

    // Official round score locking
    const officialBaseScoreRef = useRef(typeof baseScore === 'number' ? baseScore : 0);
    const hasOfficiallyFinishedRef = useRef(false);
    const officialLockedTotalScoreRef = useRef(null);

    useEffect(() => {
        if (!hasOfficiallyFinishedRef.current) {
            officialBaseScoreRef.current = typeof baseScore === 'number' ? baseScore : 0;
        }
    }, [baseScore]);

    // Current active theme object
    const currentTheme = themes.find(t => t.id === activeThemeId) || themes[0] || DEFAULT_CARD_THEMES[0];

    // Helper: Generate a new 20-card deck
    const generateDeck = (themeObj = currentTheme) => {
        if (!themeObj || !themeObj.items || themeObj.items.length === 0) {
            themeObj = DEFAULT_CARD_THEMES[0];
        }
        const shuffledItems = [...themeObj.items].sort(() => Math.random() - 0.5);
        const picked = shuffledItems.slice(0, 10);

        // 10 pairs = 20 cards
        return [...picked, ...picked]
            .map((item, idx) => ({
                id: idx,
                itemId: item.id || `item-${idx}`,
                name: item.name,
                image: item.image || null,
                emoji: item.emoji || '⭐',
                desc: item.desc || '',
                bg: item.bg || '#ffffff',
                color: item.color || '#1e293b'
            }))
            .sort(() => Math.random() - 0.5);
    };

    // Initialize Game (Immediately creates deck on all clients and streams initial state)
    const initGame = (themeObj = currentTheme, isRestartAction = false) => {
        if (isRestartAction || hasOfficiallyFinishedRef.current) {
            setIsPracticeMode(true);
        }

        const newDeck = generateDeck(themeObj);
        if (newDeck.length === 0) return;

        setCards(newDeck);
        setFlipped([]);
        setMatched([]);
        setMoves(0);
        setMatchBanner(null);

        // Broadcast initial deck if Host
        if (socket && pin && isHost) {
            socket.emit('room:message', {
                pin,
                event: 'card_match:init_deck',
                payload: {
                    themeId: themeObj.id,
                    themeTitle: themeObj.title,
                    cards: newDeck,
                    matched: []
                }
            });
        }

        // Notify initial stream right away
        notifyPlayerStream(newDeck, [], [], 0, false, (isRestartAction || hasOfficiallyFinishedRef.current));
    };

    // Initialize IMMEDIATELY on mount for ALL clients (host AND participants)
    useEffect(() => {
        preloadGameAssets();
        initGame(currentTheme);
    }, [activeThemeId]);

    // Socket Event Listeners for synchronized deck and shared pair match open
    useEffect(() => {
        if (!socket) return;

        const handleRoomMessage = (msg) => {
            const { event, payload } = msg || {};

            // 0. Toggle show card numbers sync
            if (event === 'card_match:toggle_numbers' && payload) {
                if (typeof payload.showCardNumbers === 'boolean') {
                    setShowCardNumbers(payload.showCardNumbers);
                    try {
                        sessionStorage.setItem('quizrun_card_match_show_numbers', String(payload.showCardNumbers));
                    } catch (e) {}
                }
            }

            // 1. Synchronized Deck initialization from Host
            if (event === 'card_match:init_deck' && payload) {
                if (payload.cards && payload.cards.length > 0) {
                    setCards(payload.cards);
                    setFlipped([]);
                    setMatched(payload.matched || []);
                    setMoves(0);
                    notifyPlayerStream(payload.cards, [], payload.matched || [], 0, false);
                }
                if (payload.themeId) {
                    setActiveThemeId(payload.themeId);
                }
            }

            // 2. Participant requested active deck -> Host sends current cards & matched state
            if (event === 'card_match:request_deck' && isHost && cards.length > 0) {
                socket.emit('room:message', {
                    pin,
                    event: 'card_match:init_deck',
                    payload: {
                        themeId: activeThemeId,
                        themeTitle: currentTheme.title,
                        cards,
                        matched
                    }
                });
            }

            // 3. Theme change broadcast
            if (event === 'card_match:theme_change' && payload) {
                const { themeId, themeData } = payload;
                if (themeData) {
                    setThemes(prev => {
                        const exists = prev.find(t => t.id === themeData.id);
                        if (!exists) return [...prev, themeData];
                        return prev.map(t => t.id === themeData.id ? themeData : t);
                    });
                }
                if (themeId) {
                    setActiveThemeId(themeId);
                }
            }

            // 4. Toast notification when another player matches a pair
            if (event === 'card_match:pair_matched' && payload) {
                const { matchedBy, itemName } = payload;
                if (matchedBy && matchedBy !== nickname) {
                    setMatchBanner({
                        matchedBy,
                        itemName: itemName || '짝'
                    });
                    playSound('correct');
                    setTimeout(() => setMatchBanner(null), 3000);
                }
            }
        };

        socket.on('room:message', handleRoomMessage);
        return () => {
            socket.off('room:message', handleRoomMessage);
        };
    }, [socket, pin, isHost, cards, matched, activeThemeId, currentTheme, nickname]);

    // Stream participant game progress to Host & Spectator
    const notifyPlayerStream = (curCards = cards, curFlipped = flipped, curMatched = matched, curMoves = moves, finished = false, forcePractice = false) => {
        if (!socket || !pin) return;
        // 10 points per card pair matched (한 쌍당 10점)
        const matchedPairs = Math.floor(curMatched.length / 2);
        const currentRoundScore = matchedPairs * 10;
        const inPractice = forcePractice || isPracticeMode || hasOfficiallyFinishedRef.current;
        const totalScore = (officialBaseScoreRef.current || 0) + currentRoundScore;

        if (typeof onScoreUpdate === 'function') {
            onScoreUpdate(totalScore);
        }

        const safePin = String(pin).trim();

        if (inPractice) {
            // Early finisher in practice mode: keep official cumulative score securely locked!
            const lockedScore = officialLockedTotalScoreRef.current !== null
                ? officialLockedTotalScoreRef.current
                : ((officialBaseScoreRef.current || 0) + 100);

            socket.emit('room:message', {
                pin: safePin,
                event: 'game:player_stream',
                payload: {
                    nickname,
                    groupId,
                    gameId: 'card_match',
                    score: lockedScore,
                    roundScore: 100,
                    baseScore: officialBaseScoreRef.current,
                    isPractice: true,
                    isAlive: true,
                    isFinished: false,
                    gameData: {
                        cards: curCards,
                        flipped: curFlipped,
                        matched: curMatched,
                        moves: curMoves,
                        themeTitle: currentTheme.title,
                        isPractice: true
                    }
                }
            });
        } else {
            // Official round:
            if (finished) {
                hasOfficiallyFinishedRef.current = true;
                officialLockedTotalScoreRef.current = totalScore;
            }

            socket.emit('room:message', {
                pin: safePin,
                event: 'game:player_stream',
                payload: {
                    nickname,
                    groupId,
                    gameId: 'card_match',
                    score: totalScore,
                    roundScore: currentRoundScore,
                    baseScore: officialBaseScoreRef.current,
                    isPractice: false,
                    isAlive: !finished,
                    isFinished: finished,
                    gameData: {
                        cards: curCards,
                        flipped: curFlipped,
                        matched: curMatched,
                        moves: curMoves,
                        themeTitle: currentTheme.title,
                        isPractice: false
                    }
                }
            });
        }
    };

    // Card click handler
    const handleCardClick = (idx) => {
        // Prevent click if 2 cards already flipped, or clicked card is already flipped or matched
        if (flipped.length === 2 || flipped.includes(idx) || matched.includes(idx)) return;

        playSound('submit');
        const newFlipped = [...flipped, idx];
        setFlipped(newFlipped);

        if (newFlipped.length === 2) {
            const nextMoves = moves + 1;
            setMoves(nextMoves);
            const [first, second] = newFlipped;

            // Match condition: same item name or item ID
            if (cards[first] && cards[second] && (cards[first].name === cards[second].name || cards[first].itemId === cards[second].itemId)) {
                const nextMatched = Array.from(new Set([...matched, first, second]));
                setMatched(nextMatched);
                setFlipped([]);

                const finished = nextMatched.length === cards.length;
                const matchedPairs = Math.floor(nextMatched.length / 2);
                const currentRoundScore = matchedPairs * 10;

                if (finished) {
                    playSound('fanfare');
                    if (!isPracticeMode && !hasOfficiallyFinishedRef.current) {
                        hasOfficiallyFinishedRef.current = true;
                        officialLockedTotalScoreRef.current = (officialBaseScoreRef.current || 0) + currentRoundScore;
                    }
                } else {
                    playSound('correct');
                }

                // Broadcast toast notification to other players in the room
                if (socket && pin) {
                    socket.emit('room:message', {
                        pin: String(pin).trim(),
                        event: 'card_match:pair_matched',
                        payload: {
                            matchedBy: nickname,
                            groupId,
                            pair: [first, second],
                            itemName: cards[first].name || '',
                            matchedCount: nextMatched.length,
                            totalCards: cards.length
                        }
                    });
                }

                notifyPlayerStream(cards, [], nextMatched, nextMoves, finished);
            } else {
                playSound('wrong');
                notifyPlayerStream(cards, newFlipped, matched, nextMoves, false);
                setTimeout(() => {
                    setFlipped([]);
                    notifyPlayerStream(cards, [], matched, nextMoves, false);
                }, 850);
            }
        } else {
            notifyPlayerStream(cards, newFlipped, matched, moves, false);
        }
    };

    // 현재 게임(덱)에 출제된 10종류의 유니크 카드 아이템 추출
    const uniqueDeckItems = useMemo(() => {
        const map = new Map();
        (cards || []).forEach(c => {
            const key = c.name || c.itemId || c.id;
            if (key && !map.has(key)) {
                map.set(key, c);
            }
        });
        const items = Array.from(map.values());
        if (items.length >= 10) return items.slice(0, 10);
        if (currentTheme && Array.isArray(currentTheme.items)) {
            return currentTheme.items.slice(0, 10);
        }
        return items;
    }, [cards, currentTheme]);

    // 좌측 5개 (1~5번), 우측 5개 (6~10번)
    const leftPreviewItems = uniqueDeckItems.slice(0, 5);
    const rightPreviewItems = uniqueDeckItems.slice(5, 10);

    // 해당 카드가 매칭 완료되었는지 여부
    const isItemMatched = (item) => {
        if (!item) return false;
        const name = item.name;
        const matchedNames = matched.map(mIdx => cards[mIdx]?.name).filter(Boolean);
        return matchedNames.includes(name);
    };

    const isFinished = cards.length > 0 && matched.length === cards.length;
    const cols = isHost ? 5 : 4;
    const rows = isHost ? 4 : 5;

    return (
        <div style={{
            display: 'flex',
            flexDirection: 'column',
            width: '100%',
            height: '100%',
            alignItems: 'center',
            justifyContent: 'flex-start',
            gap: '8px',
            boxSizing: 'border-box',
            maxWidth: isHost ? '880px' : '460px',
            margin: '0 auto',
            position: 'relative'
        }}>
            {/* TOP THEME SELECTOR BAR (Host Only) */}
            {isHost && (
                <div style={{ width: '100%' }}>
                    <CardThemeBar
                        socket={socket}
                        pin={pin}
                        activeThemeId={activeThemeId}
                        themes={themes}
                        onThemesUpdate={(newThemes) => setThemes(newThemes)}
                        onSelectTheme={(tId, tData) => {
                            setActiveThemeId(tId);
                            initGame(tData);
                        }}
                    />
                </div>
            )}

            {/* SHARED MATCH TOAST BANNER */}
            {matchBanner && (
                <div style={{
                    background: 'linear-gradient(135deg, #ecfdf5 0%, #d1fae5 100%)',
                    border: '2px solid #10b981',
                    borderRadius: '12px',
                    padding: '6px 14px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px',
                    color: '#065f46',
                    fontSize: '0.88rem',
                    fontWeight: '900',
                    boxShadow: '0 4px 12px rgba(16, 185, 129, 0.25)',
                    animation: 'slideUp 0.3s ease-out',
                    width: '100%',
                    boxSizing: 'border-box'
                }}>
                    <Sparkles size={16} color="#059669" />
                    <span>
                        🎉 <strong>[{matchBanner.matchedBy}]</strong>님이 <strong>[{matchBanner.itemName}]</strong> 짝을 맞췄습니다! 패가 실시간 오픈됩니다!
                    </span>
                </div>
            )}

            {/* PRACTICE MODE NOTICE FOR EARLY FINISHERS */}
            {isPracticeMode && (
                <div style={{
                    background: 'linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%)',
                    border: '2px solid #3b82f6',
                    borderRadius: '12px',
                    padding: '8px 14px',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '2px',
                    boxShadow: '0 4px 12px rgba(59, 130, 246, 0.15)',
                    animation: 'slideUp 0.3s ease-out',
                    width: '100%',
                    boxSizing: 'border-box'
                }}>
                    <div style={{ color: '#1e40af', fontWeight: '900', fontSize: isHost ? '0.96rem' : '0.88rem', display: 'flex', alignItems: 'center', gap: '5px' }}>
                        <span>🎮</span> 게임만 진행하고 점수 합산은 되지 않습니다
                    </div>
                    <div style={{ color: '#3b82f6', fontSize: '0.76rem', fontWeight: '700' }}>
                        다른 유저들이 플레이 중입니다 (내 공식 점수: {officialLockedTotalScoreRef.current !== null ? officialLockedTotalScoreRef.current.toLocaleString() : (officialBaseScoreRef.current + 500).toLocaleString()}점 안전 보존)
                    </div>
                </div>
            )}

            {/* STATS & PROGRESS BAR */}
            <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '6px 14px',
                background: '#f8fafc',
                borderRadius: '12px',
                border: '1.5px solid #e2e8f0',
                fontSize: isHost ? '0.92rem' : '0.84rem',
                fontWeight: '800',
                color: '#64748b',
                width: '100%',
                boxSizing: 'border-box',
                gap: '8px',
                flexWrap: 'wrap'
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                    <span>테마: <strong style={{ color: '#0f172a' }}>{currentTheme.icon} {currentTheme.title}</strong></span>
                    {/* 뒷면 카드 무늬 <-> 1~20 번호 토글 버튼 */}
                    <button
                        type="button"
                        onClick={toggleShowCardNumbers}
                        title={showCardNumbers ? "클릭 시 카드 뒷면을 일반 카드 무늬로 변경합니다" : "클릭 시 카드 뒷면에 1~20 순서 번호를 표시합니다"}
                        style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '5px',
                            padding: '4px 10px',
                            fontSize: isHost ? '0.82rem' : '0.76rem',
                            fontWeight: '850',
                            borderRadius: '8px',
                            cursor: 'pointer',
                            transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                            border: showCardNumbers ? '1.5px solid #2563eb' : '1.5px solid #cbd5e1',
                            background: showCardNumbers ? '#eff6ff' : '#ffffff',
                            color: showCardNumbers ? '#1d4ed8' : '#334155',
                            boxShadow: showCardNumbers ? '0 2px 6px rgba(37, 99, 235, 0.2)' : '0 1px 3px rgba(0,0,0,0.06)'
                        }}
                    >
                        <span style={{ fontSize: '0.95rem', lineHeight: 1 }}>{showCardNumbers ? '🔢' : '🃏'}</span>
                        <span>{showCardNumbers ? '뒷면: 번호 (1~20)' : '뒷면: 카드 무늬'}</span>
                    </button>
                </div>
                <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                    <span>시도: <strong style={{ color: '#2563eb' }}>{moves}회</strong></span>
                    <span>매칭: <strong style={{ color: '#16a34a' }}>{Math.floor(matched.length / 2)} / 10쌍</strong></span>
                    <span>점수: <strong style={{ color: '#ea580c' }}>{Math.floor(matched.length / 2) * 10}점</strong></span>
                </div>
            </div>

            {/* CARD GAME CENTER BOARD + LEFT/RIGHT THEME PREVIEW SIDEBARS */}
            <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: isHost ? '14px' : '8px',
                width: '100%',
                maxWidth: isHost ? '860px' : '460px',
                boxSizing: 'border-box',
                position: 'relative'
            }}>
                {/* 좌측 사이드바: 1~5번 출제 카드 목록 (호스트) */}
                {isHost && (
                    <CardThemeSidebar
                        items={leftPreviewItems}
                        isItemMatched={isItemMatched}
                        isHost={isHost}
                    />
                )}

                {/* 20 CARDS GRID (Explicit cols & rows, Aspect Ratio 5/4 on Host, 4/5 on Mobile) */}
            <div style={{
                display: 'grid',
                gridTemplateColumns: `repeat(${cols}, 1fr)`,
                gridTemplateRows: `repeat(${rows}, 1fr)`,
                gap: isHost ? '6px' : '5px',
                width: '100%',
                maxWidth: isHost ? '500px' : '380px',
                maxHeight: isHost ? '380px' : 'calc(100vh - 180px)',
                aspectRatio: isHost ? '5 / 4' : '4 / 5',
                margin: '0 auto',
                boxSizing: 'border-box'
            }}>
                {cards.map((c, idx) => {
                    const isOpen = flipped.includes(idx) || matched.includes(idx);
                    const isMatched = matched.includes(idx);
                    const cardCoord = getCardCoordinate(idx, cols);
                    const itemName = c.name || (c.flag ? c.flag.replace('.jpg', '') : '');

                    return (
                        <div
                            key={c.id}
                            onClick={() => handleCardClick(idx)}
                            style={{
                                width: '100%',
                                height: '100%',
                                borderRadius: isHost ? '10px' : '8px',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                cursor: isMatched ? 'default' : 'pointer',
                                transition: 'transform 0.28s cubic-bezier(0.34, 1.56, 0.64, 1)',
                                transform: isOpen ? 'rotateY(180deg)' : 'none',
                                boxShadow: isMatched
                                    ? '0 0 10px rgba(16, 185, 129, 0.35)'
                                    : (isOpen ? '0 3px 8px rgba(0,0,0,0.06)' : '0 3px 6px rgba(0,0,0,0.15)'),
                                overflow: 'hidden',
                                position: 'relative',
                                background: isMatched
                                    ? '#ecfdf5'
                                    : isOpen
                                        ? '#ffffff'
                                        : 'linear-gradient(135deg, #1e3a8a 0%, #2563eb 100%)',
                                border: isMatched
                                    ? '2.5px solid #10b981'
                                    : (isOpen ? '2px solid #93c5fd' : '1.5px solid #1d4ed8'),
                                userSelect: 'none',
                                boxSizing: 'border-box'
                            }}
                        >
                            {isOpen ? (
                                <div style={{
                                    width: '100%',
                                    height: '100%',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    transform: 'rotateY(180deg)',
                                    padding: '2px',
                                    boxSizing: 'border-box',
                                    textAlign: 'center'
                                }}>
                                    {c.image ? (
                                        <img
                                            src={c.image.startsWith('/') || c.image.startsWith('data:') ? c.image : `/flag/${c.image}`}
                                            alt={itemName}
                                            style={{ width: '85%', height: '56%', objectFit: 'cover', borderRadius: '3px' }}
                                        />
                                    ) : (
                                        <span style={{ fontSize: isHost ? '1.8rem' : '1.5rem', lineHeight: 1 }}>
                                            {c.emoji || '⭐'}
                                        </span>
                                    )}
                                    <span style={{
                                        fontSize: isHost ? '0.78rem' : '0.68rem',
                                        fontWeight: '900',
                                        color: isMatched ? '#059669' : '#0f172a',
                                        marginTop: '2px',
                                        textAlign: 'center',
                                        overflow: 'hidden',
                                        textOverflow: 'ellipsis',
                                        whiteSpace: 'nowrap',
                                        maxWidth: '100%'
                                    }}>
                                        {itemName}
                                    </span>
                                </div>
                            ) : (
                                /* Card Back: 일반 카드 무늬 또는 1~20 순서 번호 */
                                <CardBackFace
                                    number={idx + 1}
                                    showNumbers={showCardNumbers}
                                    isHost={isHost}
                                />
                            )}
                        </div>
                    );
                })}
            </div>

                {/* 우측 사이드바: 6~10번 출제 카드 목록 (호스트) */}
                {isHost && (
                    <CardThemeSidebar
                        items={rightPreviewItems}
                        isItemMatched={isItemMatched}
                        isHost={isHost}
                    />
                )}
            </div>

            {/* 모바일 화면: 카드 보드 하단에 10개 출제 카드 2행 그리드 배치 */}
            {!isHost && uniqueDeckItems.length > 0 && (
                <div style={{
                    width: '100%',
                    maxWidth: '380px',
                    background: '#f8fafc',
                    border: '1.5px solid #e2e8f0',
                    borderRadius: '12px',
                    padding: '8px 10px',
                    boxSizing: 'border-box'
                }}>
                    <div style={{
                        fontSize: '0.74rem',
                        fontWeight: '900',
                        color: '#64748b',
                        marginBottom: '6px',
                        textAlign: 'center'
                    }}>
                        📋 이번 라운드 출제 카드 목록 (10종류)
                    </div>
                    <div style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(5, 1fr)',
                        gap: '5px'
                    }}>
                        {uniqueDeckItems.map((item, idx) => {
                            const isMatched = isItemMatched(item);
                            const itemName = item.name || '';
                            return (
                                <div
                                    key={idx}
                                    style={{
                                        display: 'flex',
                                        flexDirection: 'column',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        padding: '4px 2px',
                                        borderRadius: '6px',
                                        background: isMatched ? '#ecfdf5' : '#ffffff',
                                        border: isMatched ? '1.5px solid #10b981' : '1px solid #cbd5e1',
                                        fontSize: '0.65rem',
                                        fontWeight: '800',
                                        color: isMatched ? '#059669' : '#1e293b',
                                        textAlign: 'center',
                                        boxSizing: 'border-box'
                                    }}
                                >
                                    {item.image ? (
                                        <img
                                            src={item.image.startsWith('/') || item.image.startsWith('data:') ? item.image : `/flag/${item.image}`}
                                            alt={itemName}
                                            style={{ width: '22px', height: '15px', objectFit: 'cover', borderRadius: '2px', marginBottom: '2px' }}
                                        />
                                    ) : (
                                        <span style={{ fontSize: '0.9rem', lineHeight: 1, marginBottom: '2px' }}>{item.emoji || '⭐'}</span>
                                    )}
                                    <span style={{
                                        overflow: 'hidden',
                                        textOverflow: 'ellipsis',
                                        whiteSpace: 'nowrap',
                                        maxWidth: '100%',
                                        fontSize: '0.62rem'
                                    }}>
                                        {itemName}
                                    </span>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* RESET & RESULT ACTION BUTTONS */}
            {isFinished ? (
                <div style={{
                    background: '#ecfdf5',
                    border: '2px solid #10b981',
                    borderRadius: '14px',
                    padding: '8px 16px',
                    textAlign: 'center',
                    boxShadow: '0 6px 18px rgba(16, 185, 129, 0.2)',
                    width: '100%',
                    boxSizing: 'border-box'
                }}>
                    <h3 style={{ color: '#065f46', margin: '0 0 4px 0', fontSize: isHost ? '1.1rem' : '0.95rem', fontWeight: '900' }}>
                        🎉 10쌍 모두 매칭 완료! 참 잘했어요!
                    </h3>
                    <button
                        type="button"
                        onClick={() => initGame(currentTheme, true)}
                        className="glass-button"
                        style={{
                            padding: '6px 20px',
                            fontSize: '0.88rem',
                            fontWeight: '800',
                            background: '#10b981',
                            color: 'white',
                            border: 'none',
                            borderRadius: '10px'
                        }}
                    >
                        <RotateCcw size={15} /> 다시 하기
                    </button>
                </div>
            ) : (
                <div style={{ display: 'flex', justifyContent: 'center', width: '100%' }}>
                    <button
                        type="button"
                        onClick={() => initGame(currentTheme, hasOfficiallyFinishedRef.current)}
                        className="glass-button"
                        style={{
                            width: '100%',
                            maxWidth: isHost ? '500px' : '380px',
                            padding: '8px',
                            fontSize: '0.86rem',
                            fontWeight: '800',
                            borderRadius: '10px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '6px'
                        }}
                    >
                        <RotateCcw size={15} /> 게임 초기화
                    </button>
                </div>
            )}
        </div>
    );
}
