import React, { useState, useEffect, useRef } from 'react';
import { Play, RotateCcw, Plus, Edit3, Sparkles, Trophy, Award, CheckCircle2 } from 'lucide-react';
import { playSound } from '../utils/audio';
import { DEFAULT_CARD_THEMES, getSavedCardThemes, saveCardThemes } from '../data/cardThemes';
import { getCardCoordinate } from './MultiplayerLiveSpectator';
import CardThemeBar from './CardThemeBar';

export default function CardMatchGame({
    socket,
    pin,
    isHost = false,
    nickname = '호스트',
    groupId = null,
    baseScore = 0
}) {
    const [themes, setThemes] = useState(getSavedCardThemes);
    const [activeThemeId, setActiveThemeId] = useState('flag');
    const [cards, setCards] = useState([]);
    const [flipped, setFlipped] = useState([]);
    const [matched, setMatched] = useState([]);
    const [moves, setMoves] = useState(0);
    const [matchBanner, setMatchBanner] = useState(null);
    const [isPracticeMode, setIsPracticeMode] = useState(false);

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
        initGame(currentTheme);
    }, [activeThemeId]);

    // Socket Event Listeners for synchronized deck and shared pair match open
    useEffect(() => {
        if (!socket) return;

        const handleRoomMessage = (msg) => {
            const { event, payload } = msg || {};

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

            // 4. SHARED PAIR MATCH OPEN: "한 명이라도 먼저 짝을 맞추면 카드 패가 실시간 오픈"
            if (event === 'card_match:pair_matched' && payload) {
                const { pair, matchedBy, itemName } = payload;
                if (pair && Array.isArray(pair)) {
                    setMatched(prev => {
                        const next = Array.from(new Set([...prev, ...pair]));
                        return next;
                    });
                    setFlipped(prev => prev.filter(idx => !pair.includes(idx)));

                    // Show notification banner if matched by another player
                    if (matchedBy && matchedBy !== nickname) {
                        setMatchBanner({
                            matchedBy,
                            itemName: itemName || '짝'
                        });
                        playSound('correct');
                        setTimeout(() => setMatchBanner(null), 3000);
                    }
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
        const currentRoundScore = Math.max(0, curMatched.length * 50 - (curMoves * 2));
        const inPractice = forcePractice || isPracticeMode || hasOfficiallyFinishedRef.current;

        if (inPractice) {
            // Early finisher in practice mode: keep official cumulative score securely locked!
            const lockedScore = officialLockedTotalScoreRef.current !== null
                ? officialLockedTotalScoreRef.current
                : (officialBaseScoreRef.current + 500);

            socket.emit('room:message', {
                pin,
                event: 'game:player_stream',
                payload: {
                    nickname,
                    groupId,
                    gameId: 'card_match',
                    score: lockedScore,
                    roundScore: 500,
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
            const totalScore = officialBaseScoreRef.current + currentRoundScore;
            if (finished) {
                hasOfficiallyFinishedRef.current = true;
                officialLockedTotalScoreRef.current = totalScore;
            }

            socket.emit('room:message', {
                pin,
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
                if (finished) {
                    playSound('fanfare');
                    if (!isPracticeMode && !hasOfficiallyFinishedRef.current) {
                        hasOfficiallyFinishedRef.current = true;
                        officialLockedTotalScoreRef.current = officialBaseScoreRef.current + Math.max(0, nextMatched.length * 50 - (nextMoves * 2));
                    }
                } else {
                    playSound('correct');
                }

                // Broadcast shared pair match to ALL players in the room
                if (socket && pin) {
                    socket.emit('room:message', {
                        pin,
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
            maxWidth: isHost ? '840px' : '460px',
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
                boxSizing: 'border-box'
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span>테마: <strong style={{ color: '#0f172a' }}>{currentTheme.icon} {currentTheme.title}</strong></span>
                </div>
                <div style={{ display: 'flex', gap: '12px' }}>
                    <span>시도: <strong style={{ color: '#2563eb' }}>{moves}회</strong></span>
                    <span>매칭: <strong style={{ color: '#16a34a' }}>{matched.length / 2} / 10쌍</strong></span>
                </div>
            </div>

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
                                /* Card Back: A1, A2, B1, B2... Coordinate format */
                                <span style={{
                                    color: '#ffffff',
                                    fontSize: isHost ? '1.3rem' : '1.15rem',
                                    fontWeight: '950',
                                    letterSpacing: '0.5px',
                                    textShadow: '0 2px 4px rgba(0,0,0,0.4)',
                                    fontFamily: 'system-ui, -apple-system, sans-serif'
                                }}>
                                    {cardCoord}
                                </span>
                            )}
                        </div>
                    );
                })}
            </div>

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
