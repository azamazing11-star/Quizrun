import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, RotateCcw, Shuffle, Users, CheckCircle, Volume2, VolumeX, Play, Pause, Music, Bell, Tv, Maximize, Minimize } from 'lucide-react';
import Confetti from 'react-confetti';
import { playSound } from '../utils/audio';
import { startChiptune, stopChiptune, isChiptuneActive } from '../utils/chiptune';
import { useGlobalSession } from '../context/GlobalSessionContext';

// Distinct colors for each player's path
const PATH_COLORS = [
    '#3b82f6', // Blue
    '#ef4444', // Red
    '#10b981', // Green
    '#f59e0b', // Yellow
    '#8b5cf6', // Purple
    '#ec4899', // Pink
    '#06b6d4', // Cyan
    '#f97316', // Orange
    '#14b8a6', // Teal
    '#6366f1', // Indigo
];

// Available BGM tracks including Web Audio synthesizer fallback
const BGM_TRACKS = [
    { id: 'rally_x', name: '🏎️ 랠리-X 테마', src: '/audio/new_rally_x.mp3' },
    { id: 'bgm', name: '🎵 경쾌한 레트로 (초경량)', src: '/audio/bgm.mp3' },
    { id: 'science', name: '🔬 신나는 과학송', src: '/audio/science_is_fun.mp3' },
    { id: 'arcade', name: '🕹️ 아케이드 테마', src: '/audio/arcade_theme.mp3' },
    { id: 'chiptune', name: '👾 8비트 신디사이저 (자체 생성 - 무조건 재생)', src: null },
];

// Score preset sequence: '+10', '-10', '×2', '÷2', '+20', '-20', '×3', '÷3'...
const SCORE_SEQUENCE = ['+10', '-10', '×2', '÷2', '+20', '-20', '×3', '÷3', '+30', '-30', '×4', '÷4'];

// Helper to generate results based on preset mode
const generatePresetResults = (count, mode) => {
    const list = [];
    for (let i = 0; i < count; i++) {
        if (mode === 'score') {
            list.push(i === 0 ? '꽝' : SCORE_SEQUENCE[(i - 1) % SCORE_SEQUENCE.length]);
        } else {
            // money mode (5,000원 단위)
            list.push(i === 0 ? '꽝' : `${(i * 5000).toLocaleString()}원`);
        }
    }
    return list;
};

export default function Ladder({ socket, isMirrorProp }) {
    const navigate = useNavigate();
    const { participantCount, setParticipantCount } = useGlobalSession();

    // Game Config State
    const [numPlayers, setNumPlayers] = useState(() => (participantCount >= 2 && participantCount <= 10) ? participantCount : 4);
    const [players, setPlayers] = useState(['참가자 1', '참가자 2', '참가자 3', '참가자 4']);
    const [presetMode, setPresetMode] = useState('money'); // 'money' | 'score' | 'custom'
    const [results, setResults] = useState(() => generatePresetResults((participantCount >= 2 && participantCount <= 10) ? participantCount : 4, 'money'));
    
    // Ladder structure
    const [bridges, setBridges] = useState([]);
    
    // Animation States
    const [isRevealed, setIsRevealed] = useState(false);
    const [animationStatus, setAnimationStatus] = useState({});
    const [animationProgress, setAnimationProgress] = useState({});
    const [paths, setPaths] = useState({});
    const [finalPairs, setFinalPairs] = useState({});
    const [startTimes, setStartTimes] = useState({});
    
    const [showConfetti, setShowConfetti] = useState(false);
    const [showResultsTable, setShowResultsTable] = useState(false);
    const [spotlightResult, setSpotlightResult] = useState(null);
    const [windowSize, setWindowSize] = useState({ width: window.innerWidth, height: window.innerHeight });

    // --- DUAL SCREEN MIRRORING STATES ---
    const isMirrorView = Boolean(isMirrorProp) || 
        new URLSearchParams(window.location.search).get('mirror') === 'true' ||
        new URLSearchParams(window.location.search).get('subscreen') === 'true' ||
        window.name === 'QuizrunSubScreenWindow' ||
        window.name === 'QuizrunScreenWindow' ||
        sessionStorage.getItem('is_subscreen') === 'true';
    const [isFullscreen, setIsFullscreen] = useState(false);
    const [isMirrorConnected, setIsMirrorConnected] = useState(false);
    const ladderChannelRef = useRef(null);

    // Latest state refs for BroadcastChannel payload snapshot & remote event handlers
    const numPlayersRef = useRef(numPlayers);
    const playersRef = useRef(players);
    const resultsRef = useRef(results);
    const presetModeRef = useRef(presetMode);
    const bridgesRef = useRef(bridges);
    const pathsRef = useRef(paths);
    const isRevealedRef = useRef(isRevealed);
    const animationStatusRef = useRef(animationStatus);
    const animationProgressRef = useRef(animationProgress);
    const finalPairsRef = useRef(finalPairs);
    const showConfettiRef = useRef(showConfetti);
    const showResultsTableRef = useRef(showResultsTable);
    const spotlightResultRef = useRef(spotlightResult);
    const startTimesRef = useRef(startTimes);
    const hasForcedFirstRef = useRef(false);

    const handlePlayerClickRef = useRef(null);
    const handleResetRef = useRef(null);
    const handleCloseSpotlightRef = useRef(null);
    const changePlayerCountRef = useRef(null);
    const applyPresetRef = useRef(null);

    useEffect(() => {
        numPlayersRef.current = numPlayers;
        playersRef.current = players;
        resultsRef.current = results;
        presetModeRef.current = presetMode;
        bridgesRef.current = bridges;
        pathsRef.current = paths;
        isRevealedRef.current = isRevealed;
        animationStatusRef.current = animationStatus;
        animationProgressRef.current = animationProgress;
        finalPairsRef.current = finalPairs;
        showConfettiRef.current = showConfetti;
        showResultsTableRef.current = showResultsTable;
        spotlightResultRef.current = spotlightResult;
        startTimesRef.current = startTimes;
        hasForcedFirstRef.current = hasForcedFirst;
        handlePlayerClickRef.current = handlePlayerClick;
        handleResetRef.current = handleReset;
        handleCloseSpotlightRef.current = handleCloseSpotlight;
        changePlayerCountRef.current = changePlayerCount;
        applyPresetRef.current = applyPreset;
    });

    const [isMuted, setIsMuted] = useState(() => isMirrorView ? true : false);
    const [hasForcedFirst, setHasForcedFirst] = useState(false);
    const [selectedTrackId, setSelectedTrackId] = useState('rally_x');
    const [isBgmPlaying, setIsBgmPlaying] = useState(false);
    const [soundStatusMsg, setSoundStatusMsg] = useState('');
    const audioTagRef = useRef(null);

    // Apply preset results (money or score)
    const applyPreset = (type) => {
        if (isMirrorView) {
            if (ladderChannelRef.current) {
                try {
                    ladderChannelRef.current.postMessage({
                        type: 'LADDER_REMOTE_PRESET',
                        payload: { preset: type }
                    });
                } catch (e) {}
            }
            return;
        }
        setPresetMode(type);
        const newResults = generatePresetResults(numPlayers, type);
        setResults(newResults);
        playSound('submit');
        handleReset();
    };

    // Change player count safely across Leader/Follower and GlobalSession
    const changePlayerCount = (n) => {
        if (isMirrorView) {
            if (ladderChannelRef.current) {
                try {
                    ladderChannelRef.current.postMessage({
                        type: 'LADDER_REMOTE_PLAYER_COUNT',
                        payload: { numPlayers: n }
                    });
                } catch (e) {}
            }
            return;
        }
        setNumPlayers(n);
        if (setParticipantCount) {
            setParticipantCount(n);
        }
    };

    const openMirrorWindow = () => {
        const mirrorWin = window.open(
            '/ladder?mirror=true&subscreen=true',
            'QuizrunSubScreenWindow',
            'width=1280,height=720,menubar=no,toolbar=no,location=no,status=no'
        );
        if (mirrorWin) {
            mirrorWin.focus();
        }
    };

    const toggleFullscreen = () => {
        if (!document.fullscreenElement) {
            document.documentElement.requestFullscreen().catch(err => {
                console.error('Fullscreen error:', err);
            });
            setIsFullscreen(true);
        } else {
            document.exitFullscreen().catch(err => {
                console.error('Exit fullscreen error:', err);
            });
            setIsFullscreen(false);
        }
    };

    const getLadderPayload = () => ({
        numPlayers: numPlayersRef.current,
        players: playersRef.current,
        results: resultsRef.current,
        presetMode: presetModeRef.current,
        bridges: bridgesRef.current,
        paths: pathsRef.current,
        isRevealed: isRevealedRef.current,
        animationStatus: animationStatusRef.current,
        animationProgress: animationProgressRef.current,
        finalPairs: finalPairsRef.current,
        showConfetti: showConfettiRef.current,
        showResultsTable: showResultsTableRef.current,
        spotlightResult: spotlightResultRef.current,
        startTimes: startTimesRef.current
    });

    // Stable BroadcastChannel lifecycle: Mount once, never destroy on re-renders
    useEffect(() => {
        let channel;
        try {
            channel = new BroadcastChannel('quizrun_ladder_sync');
            ladderChannelRef.current = channel;

            channel.onmessage = (event) => {
                const { type, payload } = event.data || {};
                if (isMirrorView) {
                    if (type === 'LADDER_UPDATE' || type === 'LADDER_PONG') {
                        setIsMirrorConnected(true);
                        if (payload) {
                            if (payload.numPlayers !== undefined) setNumPlayers(payload.numPlayers);
                            if (payload.players) setPlayers(payload.players);
                            if (payload.results) setResults(payload.results);
                            if (payload.presetMode) setPresetMode(payload.presetMode);
                            if (payload.bridges) setBridges(payload.bridges);
                            if (payload.paths) setPaths(payload.paths);
                            if (payload.isRevealed !== undefined) setIsRevealed(payload.isRevealed);
                            if (payload.animationStatus) setAnimationStatus(payload.animationStatus);
                            if (payload.animationProgress) setAnimationProgress(payload.animationProgress);
                            if (payload.finalPairs) setFinalPairs(payload.finalPairs);
                            if (payload.showConfetti !== undefined) setShowConfetti(payload.showConfetti);
                            if (payload.showResultsTable !== undefined) setShowResultsTable(payload.showResultsTable);
                            if (payload.spotlightResult !== undefined) setSpotlightResult(payload.spotlightResult);
                            if (payload.startTimes) setStartTimes(payload.startTimes);
                        }
                    }
                } else {
                    if (type === 'LADDER_PING') {
                        setIsMirrorConnected(true);
                        channel.postMessage({
                            type: 'LADDER_PONG',
                            payload: getLadderPayload()
                        });
                    } else if (type === 'LADDER_REMOTE_CLICK') {
                        const { playerIndex, clickRatio } = payload || {};
                        if (playerIndex !== undefined) {
                            const validRatio = (typeof clickRatio === 'number') ? clickRatio : 0.5;
                            const fakeEvent = {
                                currentTarget: {
                                    getBoundingClientRect: () => ({ top: 0, height: 100 })
                                },
                                clientY: validRatio * 100
                            };
                            if (handlePlayerClickRef.current) {
                                handlePlayerClickRef.current(playerIndex, fakeEvent);
                            }
                        }
                    } else if (type === 'LADDER_REMOTE_RESET') {
                        if (handleResetRef.current) {
                            handleResetRef.current();
                        }
                    } else if (type === 'LADDER_REMOTE_CLOSE_SPOTLIGHT') {
                        if (handleCloseSpotlightRef.current) {
                            handleCloseSpotlightRef.current();
                        }
                    } else if (type === 'LADDER_REMOTE_PLAYER_COUNT') {
                        if (payload?.numPlayers && changePlayerCountRef.current) {
                            changePlayerCountRef.current(payload.numPlayers);
                        }
                    } else if (type === 'LADDER_REMOTE_PRESET') {
                        if (payload?.preset && applyPresetRef.current) {
                            applyPresetRef.current(payload.preset);
                        }
                    }
                }
            };

            if (isMirrorView) {
                channel.postMessage({ type: 'LADDER_PING' });
            }
        } catch (e) {
            console.warn('BroadcastChannel error in Ladder:', e);
        }

        return () => {
            if (channel) {
                channel.close();
            }
        };
    }, [isMirrorView]);

    // Broadcast state updates from host window
    useEffect(() => {
        if (!isMirrorView && ladderChannelRef.current) {
            try {
                ladderChannelRef.current.postMessage({
                    type: 'LADDER_UPDATE',
                    payload: getLadderPayload()
                });
            } catch (e) {}
        }
    }, [isMirrorView, numPlayers, players, results, bridges, paths, isRevealed, animationStatus, finalPairs, showConfetti, showResultsTable, spotlightResult]);

    // BGM playback controller
    const startMusic = (trackId = selectedTrackId) => {
        if (isMuted || isMirrorView) return;
        const track = BGM_TRACKS.find(t => t.id === trackId) || BGM_TRACKS[0];

        if (track.id === 'chiptune' || !track.src) {
            if (audioTagRef.current) {
                audioTagRef.current.pause();
            }
            startChiptune(0.18);
            setIsBgmPlaying(true);
        } else {
            stopChiptune();
            if (audioTagRef.current) {
                if (audioTagRef.current.src !== window.location.origin + track.src && !audioTagRef.current.src.endsWith(track.src)) {
                    audioTagRef.current.src = track.src;
                }
                audioTagRef.current.currentTime = 0;
                audioTagRef.current.volume = 0.5;
                audioTagRef.current.play().then(() => {
                    setIsBgmPlaying(true);
                }).catch(err => {
                    console.warn("MP3 play failed, using chiptune synthesizer fallback:", err);
                    startChiptune(0.18);
                    setIsBgmPlaying(true);
                });
            }
        }
    };

    const stopMusic = () => {
        stopChiptune();
        if (audioTagRef.current) {
            audioTagRef.current.pause();
        }
        setIsBgmPlaying(false);
    };

    const toggleMusic = () => {
        if (isBgmPlaying) {
            stopMusic();
        } else {
            startMusic(selectedTrackId);
        }
    };

    const handleTrackChange = (newTrackId) => {
        setSelectedTrackId(newTrackId);
        if (isBgmPlaying) {
            stopMusic();
            setTimeout(() => {
                startMusic(newTrackId);
            }, 50);
        }
    };

    const handleSoundTest = () => {
        playSound('fanfare');
        setSoundStatusMsg('🔊 효과음 정상!');
        setTimeout(() => setSoundStatusMsg(''), 3000);
    };

    // Stop music when Ladder unmounts
    useEffect(() => {
        return () => {
            stopMusic();
        };
    }, []);

    // Respond to mute toggle
    useEffect(() => {
        if (isMuted) {
            stopMusic();
        }
    }, [isMuted]);

    const playResultSound = (resultVal) => {
        if (isMuted || isMirrorView) return; // Silent if muted or on sub-screen mirror
        
        const isFail = resultVal.includes('꽝') || resultVal.includes('벌칙') || resultVal.includes('탈락') || resultVal.includes('실패');
        const audioSrc = isFail ? '/audio/fail.mp3' : '/audio/success.mp3';
        const sfx = new Audio(audioSrc);
        sfx.volume = 0.6;
        sfx.play().catch(err => {
            console.log("SFX play blocked, using synth fallback:", err);
            playSound(isFail ? 'wrong' : 'fanfare');
        });
    };

    // Increased complexity: 24 levels for longer winding paths
    const numLevels = 24; 
    const svgWidth = 600;
    const svgHeight = 500;
    const paddingX = 50;
    const paddingTop = 50;
    const paddingBottom = 450;

    // Track window size for Confetti
    useEffect(() => {
        const handleResize = () => {
            setWindowSize({ width: window.innerWidth, height: window.innerHeight });
        };
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    // Sync arrays when player count changes (Host only)
    useEffect(() => {
        if (isMirrorView) return;
        setPlayers(prev => {
            const next = [...prev];
            if (next.length < numPlayers) {
                for (let i = next.length; i < numPlayers; i++) {
                    next.push(`참가자 ${i + 1}`);
                }
            } else if (next.length > numPlayers) {
                next.splice(numPlayers);
            }
            return next;
        });

        setResults(prev => {
            const next = [...prev];
            if (next.length < numPlayers) {
                for (let i = next.length; i < numPlayers; i++) {
                    if (presetMode === 'score') {
                        next.push(i === 0 ? '꽝' : SCORE_SEQUENCE[(i - 1) % SCORE_SEQUENCE.length]);
                    } else {
                        next.push(i === 0 ? '꽝' : `${(i * 5000).toLocaleString()}원`);
                    }
                }
            } else if (next.length > numPlayers) {
                next.splice(numPlayers);
            }
            return next;
        });

        handleReset();
    }, [numPlayers, isMirrorView, presetMode]);

    // Generate Ladder structure and calculate paths
    const generateLadder = () => {
        handleReset();
        
        const newBridges = [];
        // Generate random bridges level by level with high density (0.6) for complexity
        // Limit bridges to the middle levels (5 to 19) so that the top and bottom are straight lines
        for (let l = 5; l <= 19; l++) {
            for (let i = 0; i < numPlayers - 1; i++) {
                if (Math.random() < 0.6) {
                    const hasLeftAdjacent = newBridges.some(b => b.level === l && b.fromLine === i - 1);
                    if (!hasLeftAdjacent) {
                        newBridges.push({ fromLine: i, level: l });
                        i++; // Skip next line to prevent overlap
                    }
                }
            }
        }
        setBridges(newBridges);
    };

    // Auto generate ladder on mount or player count changes (Host only)
    useEffect(() => {
        if (isMirrorView) return;
        generateLadder();
    }, [numPlayers, isMirrorView]);

    // Calculate all paths whenever bridges or player count changes (Host only)
    useEffect(() => {
        if (isMirrorView) return;
        const calculatedPaths = {};
        for (let p = 0; p < numPlayers; p++) {
            calculatedPaths[p] = calculatePathForPlayer(p);
        }
        setPaths(calculatedPaths);
    }, [bridges, numPlayers, isMirrorView]);

    const getX = (lineIndex) => {
        if (numPlayers <= 1) return paddingX;
        return paddingX + lineIndex * (svgWidth - 2 * paddingX) / (numPlayers - 1);
    };

    const getY = (levelIndex) => {
        return paddingTop + levelIndex * (paddingBottom - paddingTop) / (numLevels - 1);
    };

    // Calculate full coordinates sequence for a player with any custom bridges list
    const getPathForPlayerWithBridges = (startLine, currentBridges) => {
        const points = [];
        let currentLine = startLine;
        
        points.push({ x: getX(currentLine), y: 0 });
        points.push({ x: getX(currentLine), y: paddingTop });

        for (let l = 0; l < numLevels; l++) {
            const currentY = getY(l);
            
            const leftBridge = currentBridges.find(b => b.level === l && b.fromLine === currentLine - 1);
            const rightBridge = currentBridges.find(b => b.level === l && b.fromLine === currentLine);

            if (leftBridge) {
                points.push({ x: getX(currentLine), y: currentY });
                currentLine = currentLine - 1;
                points.push({ x: getX(currentLine), y: currentY });
            } else if (rightBridge) {
                points.push({ x: getX(currentLine), y: currentY });
                currentLine = currentLine + 1;
                points.push({ x: getX(currentLine), y: currentY });
            } else {
                points.push({ x: getX(currentLine), y: currentY });
            }
        }

        points.push({ x: getX(currentLine), y: paddingBottom });
        points.push({ x: getX(currentLine), y: paddingBottom + 12 });

        return {
            points,
            finalLine: currentLine
        };
    };

    const calculatePathForPlayer = (startLine) => {
        return getPathForPlayerWithBridges(startLine, bridges);
    };

    // Force dynamically generated bridges so that a specific startLine leads to targetLine
    const forceLadderForPair = (startLine, targetLine) => {
        let found = false;
        let attempts = 0;
        let forcedBridges = [];
        
        while (!found && attempts < 1500) {
            attempts++;
            const tempBridges = [];
            // Generate random bridges in middle levels (5 to 19)
            for (let l = 5; l <= 19; l++) {
                for (let i = 0; i < numPlayers - 1; i++) {
                    if (Math.random() < 0.6) {
                        const hasLeftAdjacent = tempBridges.some(b => b.level === l && b.fromLine === i - 1);
                        if (!hasLeftAdjacent) {
                            tempBridges.push({ fromLine: i, level: l });
                            i++; // Skip next line
                        }
                    }
                }
            }
            
            const testPath = getPathForPlayerWithBridges(startLine, tempBridges);
            if (testPath.finalLine === targetLine) {
                forcedBridges = tempBridges;
                found = true;
            }
        }
        
        if (found) {
            // Recompute paths for all players with the new forced bridges
            const nextPaths = {};
            for (let p = 0; p < numPlayers; p++) {
                nextPaths[p] = getPathForPlayerWithBridges(p, forcedBridges);
            }
            
            const now = Date.now();
            setStartTimes(prev => ({ ...prev, [startLine]: now }));
            startTimesRef.current = { ...startTimesRef.current, [startLine]: now };

            // Set states synchronously
            setBridges(forcedBridges);
            setPaths(nextPaths);
            
            // Trigger animation immediately
            setAnimationStatus(prev => ({ ...prev, [startLine]: 'animating' }));
            setAnimationProgress(prev => ({ ...prev, [startLine]: 0 }));
        } else {
            // Fallback: run normally if not found (extremely rare)
            startPlayerAnimation(startLine);
        }
    };

    // Animate a specific player path
    const startPlayerAnimation = (playerIndex) => {
        if (animationStatus[playerIndex] && animationStatus[playerIndex] !== 'idle') return;

        const now = Date.now();
        setStartTimes(prev => ({ ...prev, [playerIndex]: now }));
        startTimesRef.current = { ...startTimesRef.current, [playerIndex]: now };

        setAnimationStatus(prev => ({ ...prev, [playerIndex]: 'animating' }));
        setAnimationProgress(prev => ({ ...prev, [playerIndex]: 0 }));
    };

    // Reset game/animation state
    const handleReset = () => {
        stopMusic();
        setIsRevealed(false);
        setHasForcedFirst(false);
        hasForcedFirstRef.current = false;
        setStartTimes({});
        startTimesRef.current = {};
        setAnimationStatus({});
        setAnimationProgress({});
        setFinalPairs({});
        setShowConfetti(false);
        setShowResultsTable(false);
        setSpotlightResult(null);
        spotlightResultRef.current = null;

        if (isMirrorView && ladderChannelRef.current) {
            try {
                ladderChannelRef.current.postMessage({ type: 'LADDER_REMOTE_RESET' });
            } catch (e) {}
        }
    };

    // Dismiss/close the enlarged spotlight result and return to normal ladder view
    const handleCloseSpotlight = () => {
        setSpotlightResult(null);
        spotlightResultRef.current = null;
        if (isMirrorView && ladderChannelRef.current) {
            try {
                ladderChannelRef.current.postMessage({ type: 'LADDER_REMOTE_CLOSE_SPOTLIGHT' });
            } catch (e) {}
        }
        // If all players are now finished and spotlight was dismissed, show results summary
        const allFinished = Object.keys(animationStatus).length === numPlayers && 
                            Object.values(animationStatus).every(status => status === 'finished');
        if (allFinished) {
            setShowResultsTable(true);
        }
    };

    // Handler when user clicks on a player name box
    const handlePlayerClick = (idx, e) => {
        // Calculate vertical click ratio (0.0 ~ 1.0) on button relative to its bounding height
        const targetEl = e?.currentTarget || (e?.target ? e.target.closest('button') : null) || e?.target;
        let ratio = 0.5;
        if (targetEl && typeof targetEl.getBoundingClientRect === 'function') {
            const rect = targetEl.getBoundingClientRect();
            if (rect.height > 0) {
                let clickY = null;
                if (typeof e?.nativeEvent?.offsetY === 'number' && (e?.target === targetEl || e?.target?.parentNode === targetEl)) {
                    clickY = e.nativeEvent.offsetY;
                } else if (typeof e?.clientY === 'number') {
                    clickY = e.clientY - rect.top;
                }
                if (clickY !== null) {
                    ratio = Math.max(0, Math.min(1, clickY / rect.height));
                }
            }
        }

        if (isMirrorView) {
            // 서브 모니터에서 클릭한 경우: 메인 모니터로 원격 클릭 신호 전송
            if (ladderChannelRef.current) {
                try {
                    ladderChannelRef.current.postMessage({
                        type: 'LADDER_REMOTE_CLICK',
                        payload: {
                            playerIndex: idx,
                            clickRatio: ratio
                        }
                    });
                } catch (err) {}
            }
            return;
        }

        setIsRevealed(true);
        
        // Immediate user gesture audio activation
        if (!isMuted && !isMirrorView) {
            playSound('submit');
            startMusic(selectedTrackId);
        }
        
        // Only apply the secret rule for the very FIRST player chosen in a game round!
        const isFirstPick = !hasForcedFirst && !hasForcedFirstRef.current && Object.values(animationStatus).every(status => !status || status === 'idle');

        if (isFirstPick) {
            setHasForcedFirst(true);
            hasForcedFirstRef.current = true;
            
            // Categorize results: 1-based position (rIdx + 1)
            const failIndices = [];
            const nonFailOddIndices = [];  // 1-based odd positions: 1, 3, 5, 7, 9...
            const nonFailEvenIndices = []; // 1-based even positions: 2, 4, 6, 8, 10...

            results.forEach((r, rIdx) => {
                const isFail = r.includes('꽝') || r.includes('벌칙') || r.includes('탈락') || r.includes('실패');
                if (isFail) {
                    failIndices.push(rIdx);
                } else {
                    const oneBasedPos = rIdx + 1;
                    if (oneBasedPos % 2 === 1) {
                        nonFailOddIndices.push(rIdx);
                    } else {
                        nonFailEvenIndices.push(rIdx);
                    }
                }
            });

            let targetLine = null;

            if (ratio >= 0.35 && ratio <= 0.65) {
                // 1. 글자 부분 (중앙 35% ~ 65%): 무조건 꽝
                if (failIndices.length > 0) {
                    targetLine = failIndices[Math.floor(Math.random() * failIndices.length)];
                }
            } else if (ratio < 0.35) {
                // 2. 글자 기준 윗 부분 (상단 0% ~ 35%): 가장 왼쪽(1번) 기준 꽝 제외 홀수 선택지 (1, 3, 5, 7...)
                const candidates = nonFailOddIndices.length > 0 
                    ? nonFailOddIndices 
                    : (nonFailEvenIndices.length > 0 ? nonFailEvenIndices : failIndices);
                if (candidates.length > 0) {
                    targetLine = candidates[Math.floor(Math.random() * candidates.length)];
                }
            } else {
                // 3. 글자 기준 아래 부분 (하단 65% ~ 100%): 가장 왼쪽(1번) 기준 꽝 제외 짝수 선택지 (2, 4, 6, 8...)
                const candidates = nonFailEvenIndices.length > 0 
                    ? nonFailEvenIndices 
                    : (nonFailOddIndices.length > 0 ? nonFailOddIndices : failIndices);
                if (candidates.length > 0) {
                    targetLine = candidates[Math.floor(Math.random() * candidates.length)];
                }
            }

            if (targetLine !== null) {
                forceLadderForPair(idx, targetLine);
                return;
            }
        }
        
        // Default normal play
        startPlayerAnimation(idx);
    };

    // Animation Tick Engine (Timestamp-driven for dual screen precision)
    useEffect(() => {
        let animFrameId;
        const ANIMATION_DURATION = 8000; // 8.0s suspenseful slow ladder traversal duration

        const tick = () => {
            const now = Date.now();
            let hasUpdates = false;
            
            setAnimationProgress(prevProgress => {
                const nextProgress = { ...prevProgress };

                Object.keys(animationStatus).forEach(key => {
                    const idx = parseInt(key);
                    if (animationStatus[idx] === 'animating') {
                        const pathData = paths[idx];
                        const startTime = startTimes[idx];
                        if (pathData && startTime) {
                            const maxProgress = pathData.points.length - 1;
                            const elapsed = now - startTime;
                            const progressRatio = Math.min(1, elapsed / ANIMATION_DURATION);
                            const calculatedProgress = progressRatio * maxProgress;
                            
                            if (Math.abs((nextProgress[idx] || 0) - calculatedProgress) > 0.001) {
                                nextProgress[idx] = calculatedProgress;
                                hasUpdates = true;
                            }
                            if (!isMuted && Math.random() < 0.2) {
                                playSound('step');
                            }
                        }
                    }
                });

                return hasUpdates ? nextProgress : prevProgress;
            });

            // Update status and final pairs when time completes
            setAnimationStatus(prevStatus => {
                const nextStatus = { ...prevStatus };
                let statusChanged = false;

                Object.keys(prevStatus).forEach(key => {
                    const idx = parseInt(key);
                    const pathData = paths[idx];
                    const startTime = startTimes[idx];
                    if (pathData && startTime && prevStatus[idx] === 'animating') {
                        const elapsed = now - startTime;
                        if (elapsed >= ANIMATION_DURATION) {
                            nextStatus[idx] = 'finished';
                            statusChanged = true;
                            
                            setFinalPairs(prevPairs => ({
                                ...prevPairs,
                                [idx]: pathData.finalLine
                            }));

                            stopMusic();

                            const resultVal = results[pathData.finalLine];
                            playResultSound(resultVal);

                            const playerColor = PATH_COLORS[idx % PATH_COLORS.length];
                            setSpotlightResult({
                                playerIdx: idx,
                                playerName: players[idx],
                                resultIdx: pathData.finalLine,
                                resultVal: resultVal,
                                color: playerColor
                            });

                            if (resultVal === '당첨' || resultVal.includes('선물') || resultVal.includes('통과')) {
                                setShowConfetti(true);
                            }
                        }
                    }
                });

                return statusChanged ? nextStatus : prevStatus;
            });

            const activeAnimations = Object.values(animationStatus).some(status => status === 'animating');
            if (activeAnimations) {
                animFrameId = requestAnimationFrame(tick);
            }
        };

        const activeAnimations = Object.values(animationStatus).some(status => status === 'animating');
        if (activeAnimations) {
            animFrameId = requestAnimationFrame(tick);
        }

        // Show result summary table automatically when all are finished (if spotlight is closed)
        const allFinished = Object.keys(animationStatus).length === numPlayers && 
                            Object.values(animationStatus).every(status => status === 'finished');
        if (allFinished && !spotlightResult) {
            setShowResultsTable(true);
        }

        return () => cancelAnimationFrame(animFrameId);
    }, [animationStatus, paths, startTimes, isMuted, results, numPlayers]);

    // Interpolate coordinate along polyline path based on float progress index
    const getInterpolatedPoint = (playerIdx) => {
        const defaultX = getX(playerIdx);
        const pathData = paths[playerIdx];
        if (!pathData || !pathData.points || pathData.points.length === 0) {
            return { x: defaultX, y: paddingTop };
        }
        
        const points = pathData.points;
        const progress = animationProgress[playerIdx] || 0;
        const segIdx = Math.max(0, Math.floor(progress));
        const ratio = Math.max(0, Math.min(1, progress - segIdx));
        
        if (segIdx >= points.length - 1) {
            return points[points.length - 1] || { x: defaultX, y: paddingBottom };
        }
        
        const p1 = points[segIdx] || { x: defaultX, y: paddingTop };
        const p2 = points[segIdx + 1] || p1;
        
        return {
            x: (p1.x ?? defaultX) + ((p2.x ?? defaultX) - (p1.x ?? defaultX)) * ratio,
            y: (p1.y ?? paddingTop) + ((p2.y ?? paddingTop) - (p1.y ?? paddingTop)) * ratio
        };
    };

    // Get path up to current progress for rendering
    const getTracedPathD = (playerIdx) => {
        const pathData = paths[playerIdx];
        if (!pathData || !pathData.points || pathData.points.length === 0) return '';
        
        const first = pathData.points[0];
        if (!first) return '';
        
        const progress = animationProgress[playerIdx] || 0;
        const segIdx = Math.max(0, Math.floor(progress));
        
        let d = `M ${first.x} ${first.y}`;
        const limit = Math.min(segIdx, pathData.points.length - 1);
        for (let i = 1; i <= limit; i++) {
            const pt = pathData.points[i];
            if (pt) {
                d += ` L ${pt.x} ${pt.y}`;
            }
        }
        
        if (segIdx < pathData.points.length - 1) {
            const currentPoint = getInterpolatedPoint(playerIdx);
            if (currentPoint && typeof currentPoint.x === 'number') {
                d += ` L ${currentPoint.x} ${currentPoint.y}`;
            }
        }
        
        return d;
    };

    return (
        <div className="full-screen-container" style={{ flexDirection: 'column', alignItems: 'center', paddingTop: '1.5rem', overflowY: 'auto' }}>
            {showConfetti && (
                <Confetti
                    width={windowSize.width}
                    height={windowSize.height}
                    recycle={true}
                    numberOfPieces={150}
                />
            )}

            {/* Audio tag in DOM */}
            <audio 
                ref={audioTagRef} 
                loop 
                preload="auto" 
                src={BGM_TRACKS.find(t => t.id === selectedTrackId)?.src || '/audio/new_rally_x.mp3'}
                style={{ display: 'none' }} 
            />

            {/* Header section */}
            <div style={{ width: '90%', maxWidth: isMirrorView ? '1600px' : '1200px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', zIndex: 10, flexWrap: 'wrap', gap: '12px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                    {!isMirrorView ? (
                        <button 
                            onClick={() => navigate('/')} 
                            className="glass-button" 
                            style={{ padding: '10px 15px', background: 'white', border: '1px solid #e2e8f0', color: 'var(--text)', boxShadow: 'none' }}
                        >
                            <ArrowLeft size={20} style={{ marginRight: '6px' }} />
                            메인으로
                        </button>
                    ) : (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: '#ecfdf5', color: '#047857', padding: '6px 14px', borderRadius: '12px', fontWeight: '800', fontSize: '0.88rem', border: '1.5px solid #10b981' }}>
                            <Tv size={16} />
                            <span>서브 모니터 (실시간 복제 중)</span>
                        </div>
                    )}
                    <h1 style={{ fontSize: '1.8rem', color: 'var(--primary)', fontWeight: '800', margin: 0 }}>
                        🎯 사다리타기 <span style={{ color: 'var(--secondary)' }}>게임</span>
                    </h1>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
                    {isMirrorView && (
                        <button
                            onClick={handleReset}
                            className="glass-button"
                            style={{
                                padding: '8px 16px',
                                background: '#fef3c7',
                                border: '1.5px solid #f59e0b',
                                color: '#b45309',
                                fontWeight: '800',
                                fontSize: '0.88rem',
                                borderRadius: '12px',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '6px',
                                cursor: 'pointer'
                            }}
                            title="사다리 가림막 및 상태 초기화"
                        >
                            <RotateCcw size={16} />
                            <span>초기화</span>
                        </button>
                    )}
                    {!isMirrorView && (
                        <button
                            onClick={openMirrorWindow}
                            className="glass-button"
                            style={{
                                background: isMirrorConnected ? '#ecfdf5' : '#4f46e5',
                                color: isMirrorConnected ? '#15803d' : 'white',
                                border: isMirrorConnected ? '2px solid #22c55e' : 'none',
                                padding: '8px 16px',
                                borderRadius: '12px',
                                fontWeight: '800',
                                fontSize: '0.9rem',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '6px',
                                cursor: 'pointer',
                                boxShadow: '0 4px 12px rgba(0,0,0,0.08)'
                            }}
                            title="서브 모니터 스크린 창을 열거나 연결 상태를 확인합니다."
                        >
                            <Tv size={18} />
                            <span>{isMirrorConnected ? '🖥️ 서브 모니터 자동 복제 중' : '🖥️ 서브 스크린 연결'}</span>
                        </button>
                    )}

                    {!isMirrorView && (
                        /* Music Player Bar */
                        <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '10px',
                            background: 'white',
                            padding: '8px 16px',
                            borderRadius: '12px',
                            border: '1px solid #e2e8f0',
                            boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
                            flexWrap: 'wrap'
                        }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: isBgmPlaying ? '#10b981' : '#64748b', fontWeight: '700', fontSize: '0.85rem' }}>
                        <Music size={18} style={{ animation: isBgmPlaying ? 'bounce 1s infinite' : 'none' }} />
                        <span>배경음악:</span>
                    </div>

                    <select
                        value={selectedTrackId}
                        onChange={(e) => handleTrackChange(e.target.value)}
                        style={{
                            padding: '6px 10px',
                            borderRadius: '8px',
                            border: '1px solid #cbd5e1',
                            fontSize: '0.85rem',
                            fontWeight: '600',
                            background: '#f8fafc',
                            cursor: 'pointer',
                            outline: 'none'
                        }}
                    >
                        {BGM_TRACKS.map(track => (
                            <option key={track.id} value={track.id}>
                                {track.name}
                            </option>
                        ))}
                    </select>

                    <button
                        onClick={toggleMusic}
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '5px',
                            padding: '6px 14px',
                            borderRadius: '8px',
                            border: 'none',
                            background: isBgmPlaying ? '#ef4444' : '#10b981',
                            color: 'white',
                            fontSize: '0.85rem',
                            fontWeight: '700',
                            cursor: 'pointer',
                            boxShadow: isBgmPlaying ? '0 2px 6px rgba(239, 68, 68, 0.3)' : '0 2px 6px rgba(16, 185, 129, 0.3)',
                            transition: 'all 0.15s ease'
                        }}
                        title={isBgmPlaying ? '음악 끄기' : '음악 켜기'}
                    >
                        {isBgmPlaying ? <Pause size={16} /> : <Play size={16} />}
                        <span>{isBgmPlaying ? '음악 끄기' : '음악 켜기'}</span>
                    </button>

                    <button
                        onClick={handleSoundTest}
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px',
                            padding: '6px 12px',
                            borderRadius: '8px',
                            border: '1px solid #e2e8f0',
                            background: '#f8fafc',
                            color: '#334155',
                            fontSize: '0.82rem',
                            fontWeight: '600',
                            cursor: 'pointer'
                        }}
                        title="소리가 정상 출력되는지 팡파레 효과음으로 테스트합니다"
                    >
                        <Volume2 size={16} color="var(--primary)" />
                        <span>소리 테스트</span>
                    </button>

                    {soundStatusMsg && (
                        <span style={{ fontSize: '0.82rem', color: '#16a34a', fontWeight: '800' }}>
                            {soundStatusMsg}
                        </span>
                    )}
                </div>
                )}
                </div>
            </div>

            {/* Main Content Layout */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '2rem', width: '90%', maxWidth: isMirrorView ? '1600px' : '1200px', paddingBottom: '3rem', zIndex: 10 }}>
                
                {/* Left Column: Settings Panel (hidden on mirror view) */}
                {!isMirrorView && (
                <div className="glass-panel" style={{ flex: '1 1 350px', padding: '1.5rem', alignSelf: 'flex-start' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '1.5rem', borderBottom: '1px solid #f1f5f9', paddingBottom: '0.8rem' }}>
                        <Users size={22} color="var(--primary)" />
                        <h3 style={{ margin: 0, fontWeight: 700 }}>게임 설정</h3>
                        <button
                            onClick={() => setIsMuted(prev => !prev)}
                            style={{
                                background: 'none',
                                border: 'none',
                                padding: 0,
                                display: 'flex',
                                alignItems: 'center',
                                cursor: 'pointer',
                                color: isMuted ? '#ef4444' : 'var(--primary)',
                                transition: 'all 0.15s ease',
                                marginLeft: '6px'
                            }}
                            title={isMuted ? '음소거 해제' : '음소거'}
                        >
                            {isMuted ? <VolumeX size={20} /> : <Volume2 size={20} />}
                        </button>
                    </div>

                    {/* Participant Count Selector */}
                    <div style={{ marginBottom: '1.5rem' }}>
                        <label style={{ fontSize: '0.9rem', color: 'var(--text-muted)', fontWeight: 600, display: 'block', marginBottom: '0.5rem' }}>
                            참가 인원 ({numPlayers}명)
                        </label>
                        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                            {[2, 3, 4, 5, 6, 7, 8, 9, 10].map(n => (
                                <button
                                    key={n}
                                    onClick={() => changePlayerCount(n)}
                                    style={{
                                        padding: '8px 12px',
                                        fontSize: '0.85rem',
                                        border: '1px solid',
                                        borderColor: numPlayers === n ? 'var(--primary)' : '#e2e8f0',
                                        background: numPlayers === n ? '#e0f2fe' : 'white',
                                        color: numPlayers === n ? 'var(--primary-hover)' : 'var(--text)',
                                        borderRadius: '8px',
                                        cursor: 'pointer',
                                        fontWeight: numPlayers === n ? '800' : '500',
                                        transition: 'all 0.15s ease'
                                    }}
                                >
                                    {n}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Preset Selection Buttons right above Player Names */}
                    <div style={{ marginBottom: '1.25rem', background: '#f8fafc', padding: '10px 12px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                            <span style={{ fontSize: '0.85rem', color: '#475569', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '5px' }}>
                                ✨ 결과 프리셋 (자동 세팅)
                            </span>
                            <span style={{ fontSize: '0.74rem', color: presetMode === 'money' ? '#b45309' : presetMode === 'score' ? '#1d4ed8' : '#64748b', fontWeight: 700 }}>
                                {presetMode === 'money' ? '💰 5,000원 단위' : presetMode === 'score' ? '🎯 점수 연산' : '직접 입력'}
                            </span>
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                            <button
                                type="button"
                                onClick={() => applyPreset('money')}
                                style={{
                                    padding: '9px 12px',
                                    fontSize: '0.9rem',
                                    fontWeight: '800',
                                    borderRadius: '8px',
                                    border: '1.5px solid',
                                    borderColor: presetMode === 'money' ? '#f59e0b' : '#cbd5e1',
                                    background: presetMode === 'money' ? 'linear-gradient(135deg, #fef3c7, #fde68a)' : '#ffffff',
                                    color: presetMode === 'money' ? '#92400e' : '#334155',
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    gap: '6px',
                                    boxShadow: presetMode === 'money' ? '0 2px 8px rgba(245, 158, 11, 0.3)' : '0 1px 3px rgba(0,0,0,0.05)',
                                    transition: 'all 0.15s ease'
                                }}
                            >
                                💰 금액
                            </button>
                            <button
                                type="button"
                                onClick={() => applyPreset('score')}
                                style={{
                                    padding: '9px 12px',
                                    fontSize: '0.9rem',
                                    fontWeight: '800',
                                    borderRadius: '8px',
                                    border: '1.5px solid',
                                    borderColor: presetMode === 'score' ? '#3b82f6' : '#cbd5e1',
                                    background: presetMode === 'score' ? 'linear-gradient(135deg, #dbeafe, #bfdbfe)' : '#ffffff',
                                    color: presetMode === 'score' ? '#1e40af' : '#334155',
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    gap: '6px',
                                    boxShadow: presetMode === 'score' ? '0 2px 8px rgba(59, 130, 246, 0.3)' : '0 1px 3px rgba(0,0,0,0.05)',
                                    transition: 'all 0.15s ease'
                                }}
                            >
                                🎯 점수
                            </button>
                        </div>
                    </div>

                    {/* Custom Player and Result Labels */}
                    <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem' }}>
                        
                        {/* Players Config */}
                        <div style={{ flex: 1 }}>
                            <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: 700, display: 'block', marginBottom: '0.5rem' }}>
                                참가자 이름
                            </span>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '220px', overflowY: 'auto', paddingRight: '4px' }}>
                                {players.map((p, idx) => (
                                    <input
                                        key={`p-${idx}`}
                                        value={p}
                                        onChange={(e) => {
                                            const updated = [...players];
                                            updated[idx] = e.target.value;
                                            setPlayers(updated);
                                        }}
                                        style={{
                                            padding: '8px 12px',
                                            fontSize: '0.85rem',
                                            border: '1px solid #e2e8f0',
                                            borderRadius: '8px',
                                            outline: 'none',
                                            background: '#f8fafc',
                                            fontWeight: 600,
                                            width: '100%'
                                        }}
                                    />
                                ))}
                            </div>
                        </div>

                        {/* Results Config */}
                        <div style={{ flex: 1 }}>
                            <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: 700, display: 'block', marginBottom: '0.5rem' }}>
                                결과 입력
                            </span>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '220px', overflowY: 'auto', paddingRight: '4px' }}>
                                {results.map((r, idx) => (
                                    <input
                                        key={`r-${idx}`}
                                        value={r}
                                        onChange={(e) => {
                                            const updated = [...results];
                                            updated[idx] = e.target.value;
                                            setResults(updated);
                                            setPresetMode('custom');
                                        }}
                                        placeholder="결과"
                                        style={{
                                            padding: '8px 12px',
                                            fontSize: '0.85rem',
                                            border: '1px solid #e2e8f0',
                                            borderRadius: '8px',
                                            outline: 'none',
                                            background: '#fdfaf2',
                                            borderColor: r === '당첨' ? '#fcd34d' : '#e2e8f0',
                                            fontWeight: 600,
                                            width: '100%'
                                        }}
                                    />
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* Generate and Restart Actions */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                        <button 
                            onClick={generateLadder} 
                            className="glass-button" 
                            style={{ background: 'white', border: '2px solid var(--primary)', color: 'var(--primary)', boxShadow: 'none', padding: '12px' }}
                        >
                            <Shuffle size={18} style={{ marginRight: '8px' }} />
                            사다리 새로 섞기
                        </button>
                        <button 
                            onClick={handleReset} 
                            className="glass-button" 
                            style={{ background: '#f1f5f9', color: '#475569', boxShadow: 'none', padding: '12px' }}
                        >
                            <RotateCcw size={18} style={{ marginRight: '8px' }} />
                            애니메이션 초기화 (가리기)
                        </button>
                    </div>
                </div>
                )}

                {/* Right Column: Game Interactive Display */}
                <div className="glass-panel" style={{ flex: isMirrorView ? '1 1 100%' : '2 2 600px', padding: '1.5rem', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', position: 'relative', minHeight: '620px' }}>
                    
                    {/* Top Toolbar above Interactive Player Buttons */}
                    <div style={{ 
                        width: '100%', 
                        display: 'flex', 
                        alignItems: 'center', 
                        justifyContent: 'space-between', 
                        marginBottom: '16px',
                        padding: '8px 14px',
                        background: 'rgba(255, 255, 255, 0.85)',
                        borderRadius: '12px',
                        border: '1px solid rgba(226, 232, 240, 0.9)',
                        boxShadow: '0 2px 6px rgba(0,0,0,0.04)',
                        zIndex: 110
                    }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span style={{ fontSize: '0.85rem', fontWeight: '800', color: '#475569' }}>
                                결과 세팅:
                            </span>
                            <button
                                type="button"
                                onClick={() => applyPreset('money')}
                                style={{
                                    padding: '5px 14px',
                                    fontSize: '0.84rem',
                                    fontWeight: '800',
                                    borderRadius: '8px',
                                    border: '1.5px solid',
                                    borderColor: presetMode === 'money' ? '#f59e0b' : '#cbd5e1',
                                    background: presetMode === 'money' ? '#fef3c7' : '#ffffff',
                                    color: presetMode === 'money' ? '#92400e' : '#475569',
                                    cursor: 'pointer',
                                    transition: 'all 0.15s'
                                }}
                            >
                                💰 금액
                            </button>
                            <button
                                type="button"
                                onClick={() => applyPreset('score')}
                                style={{
                                    padding: '5px 14px',
                                    fontSize: '0.84rem',
                                    fontWeight: '800',
                                    borderRadius: '8px',
                                    border: '1.5px solid',
                                    borderColor: presetMode === 'score' ? '#3b82f6' : '#cbd5e1',
                                    background: presetMode === 'score' ? '#dbeafe' : '#ffffff',
                                    color: presetMode === 'score' ? '#1e40af' : '#475569',
                                    cursor: 'pointer',
                                    transition: 'all 0.15s'
                                }}
                            >
                                🎯 점수
                            </button>
                        </div>
                        <div style={{ fontSize: '0.78rem', color: '#64748b', fontWeight: '700' }}>
                            {presetMode === 'money' && '참가자1: 꽝, 5,000원 단위 순차 세팅'}
                            {presetMode === 'score' && '참가자1: 꽝, +10, -10, ×2, ÷2, +20, -20, ×3, ÷3...'}
                        </div>
                    </div>

                    {/* SVG Canvas Board */}
                    <div style={{ width: '100%', position: 'relative' }}>
                        
                        {/* Interactive Player Name Buttons (Top of the SVG) */}
                        <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: `${paddingTop}px`, display: 'flex' }}>
                            {players.map((p, idx) => {
                                const active = animationStatus[idx] === 'animating' || animationStatus[idx] === 'finished';
                                const color = PATH_COLORS[idx % PATH_COLORS.length];
                                return (
                                    <button
                                        key={`name-btn-${idx}`}
                                        onClick={(e) => handlePlayerClick(idx, e)}
                                        disabled={(animationStatus[idx] && animationStatus[idx] !== 'idle') || Object.values(animationStatus).some(s => s === 'animating')}
                                        style={{
                                            position: 'absolute',
                                            left: `${(getX(idx) / svgWidth) * 100}%`,
                                            transform: 'translateX(-50%)',
                                            bottom: '4px',
                                            textAlign: 'center',
                                            fontSize: '1.15rem',
                                            fontWeight: '800',
                                            color: active ? 'white' : 'var(--text)',
                                            background: active ? color : 'white',
                                            padding: '10px 18px',
                                            borderRadius: '12px',
                                            border: '2px solid',
                                            borderColor: active ? color : '#cbd5e1',
                                            whiteSpace: 'nowrap',
                                            cursor: ((animationStatus[idx] && animationStatus[idx] !== 'idle') || Object.values(animationStatus).some(s => s === 'animating')) ? 'default' : 'pointer',
                                            boxShadow: active ? `0 4px 12px ${color}50` : '0 3px 6px rgba(0,0,0,0.08)',
                                            transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                                            zIndex: 100,
                                        }}
                                        className="player-select-btn"
                                    >
                                        {p}
                                    </button>
                                );
                            })}
                        </div>

                        {/* SVG Drawing Canvas */}
                        <svg
                            viewBox={`0 0 ${svgWidth} ${svgHeight}`}
                            style={{
                                width: '100%',
                                height: 'auto',
                                overflow: 'visible',
                            }}
                        >
                            {/* 1. Draw static vertical lines */}
                            {Array.from({ length: numPlayers }).map((_, idx) => (
                                <line
                                    key={`v-line-${idx}`}
                                    x1={getX(idx)}
                                    y1={paddingTop}
                                    x2={getX(idx)}
                                    y2={paddingBottom}
                                    stroke="#e2e8f0"
                                    strokeWidth="6"
                                    strokeLinecap="round"
                                />
                            ))}

                            {/* 2. Draw static horizontal bridges */}
                            {bridges.map((bridge, idx) => (
                                <line
                                    key={`bridge-${idx}`}
                                    x1={getX(bridge.fromLine)}
                                    y1={getY(bridge.level)}
                                    x2={getX(bridge.fromLine + 1)}
                                    y2={getY(bridge.level)}
                                    stroke="#e2e8f0"
                                    strokeWidth="6"
                                    strokeLinecap="round"
                                />
                            ))}

                            {/* 3. Draw active colored trace lines */}
                            {players.map((_, idx) => {
                                const status = animationStatus[idx];
                                if (!status || status === 'idle') return null;

                                return (
                                    <path
                                        key={`trace-path-${idx}`}
                                        d={getTracedPathD(idx)}
                                        fill="none"
                                        stroke={PATH_COLORS[idx % PATH_COLORS.length]}
                                        strokeWidth="6"
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                    />
                                );
                            })}

                            {/* 4. Draw active animated glowing marker dots */}
                            {players.map((_, idx) => {
                                if (animationStatus[idx] !== 'animating') return null;

                                const pos = getInterpolatedPoint(idx);
                                const color = PATH_COLORS[idx % PATH_COLORS.length];

                                return (
                                    <g key={`marker-${idx}`}>
                                        <circle
                                            cx={pos.x}
                                            cy={pos.y}
                                            r="14"
                                            fill={color}
                                            opacity="0.3"
                                            style={{ filter: 'blur(3px)' }}
                                        />
                                        <circle
                                            cx={pos.x}
                                            cy={pos.y}
                                            r="8"
                                            fill={color}
                                            stroke="white"
                                            strokeWidth="2.5"
                                        />
                                    </g>
                                );
                            })}

                            {/* 5. SVG Curtain (Fog of War) over the middle ladder */}
                            <g style={{ 
                                opacity: isRevealed ? 0 : 0.98, 
                                transition: 'opacity 0.6s cubic-bezier(0.4, 0, 0.2, 1)',
                                pointerEvents: isRevealed ? 'none' : 'all'
                            }}>
                                {/* Dark background card (covers only the middle segment: y=125 to y=395) */}
                                <rect
                                    x={paddingX - 15}
                                    y={125}
                                    width={svgWidth - 2 * paddingX + 30}
                                    height={270}
                                    rx="20"
                                    fill="#0f172a"
                                    stroke="#334155"
                                    strokeWidth="2.5"
                                    style={{ boxShadow: '0 10px 30px rgba(0,0,0,0.5)' }}
                                />
                                
                                <g transform="translate(0, 10)">
                                    {/* Lock circle backing */}
                                    <circle cx={300} cy={205} r="35" fill="#1e293b" stroke="#475569" strokeWidth="1.5" />
                                    
                                    {/* Centered lock icon paths */}
                                    <path 
                                        d="M294 212 v-8 a6 6 0 0 1 12 0 v8 M288 212 h24 v20 h-24 z" 
                                        stroke="var(--secondary)" 
                                        strokeWidth="2.5" 
                                        fill="none" 
                                        strokeLinecap="round" 
                                        strokeLinejoin="round"
                                    />

                                    {/* Locked Text Description */}
                                    <text
                                        x={300}
                                        y={285}
                                        textAnchor="middle"
                                        fill="white"
                                        fontSize="18"
                                        fontWeight="800"
                                        fontFamily="'Outfit', sans-serif"
                                    >
                                        사다리 가림막 활성화됨
                                    </text>
                                    
                                    <text
                                        x={300}
                                        y={315}
                                        textAnchor="middle"
                                        fill="#94a3b8"
                                        fontSize="12"
                                        fontWeight="500"
                                        fontFamily="'Outfit', sans-serif"
                                    >
                                        상단의 참가자 이름을 클릭하면 가림막이 걷히며 시작됩니다!
                                    </text>
                                </g>
                            </g>
                        </svg>

                        {/* Result Labels (Bottom of the SVG) */}
                        <div style={{ position: 'absolute', bottom: 0, left: 0, width: '100%', height: `${svgHeight - paddingBottom}px`, display: 'flex', pointerEvents: 'none' }}>
                            {results.map((r, idx) => {
                                const landedPlayerIdx = Object.keys(finalPairs).find(key => finalPairs[key] === idx);
                                const isLanded = landedPlayerIdx !== undefined;
                                const color = isLanded ? PATH_COLORS[parseInt(landedPlayerIdx) % PATH_COLORS.length] : 'var(--text)';

                                return (
                                    <div
                                        key={`result-${idx}`}
                                        onClick={(e) => {
                                            if (isLanded) {
                                                e.stopPropagation();
                                                const pIdx = parseInt(landedPlayerIdx);
                                                setSpotlightResult({
                                                    playerIdx: pIdx,
                                                    playerName: players[pIdx],
                                                    resultIdx: idx,
                                                    resultVal: r,
                                                    color: color
                                                });
                                            }
                                        }}
                                        style={{
                                            position: 'absolute',
                                            left: `${(getX(idx) / svgWidth) * 100}%`,
                                            transform: isLanded ? 'translateX(-50%) scale(1.15)' : 'translateX(-50%) scale(1)',
                                            top: '10px',
                                            textAlign: 'center',
                                            fontSize: '1.15rem',
                                            fontWeight: '800',
                                            color: isLanded ? '#ffffff' : color,
                                            background: isLanded ? color : '#fdfaf2',
                                            padding: '8px 16px',
                                            borderRadius: '10px',
                                            border: '2px solid',
                                            borderColor: isLanded ? color : r === '당첨' ? '#fcd34d' : '#cbd5e1',
                                            boxShadow: isLanded ? `0 4px 14px ${color}50` : '0 2px 6px rgba(0,0,0,0.05)',
                                            whiteSpace: 'nowrap',
                                            transition: 'all 0.2s ease',
                                            cursor: isLanded ? 'pointer' : 'default',
                                            pointerEvents: isLanded ? 'auto' : 'none'
                                        }}
                                        title={isLanded ? '클릭하면 결과를 크게 봅니다' : ''}
                                    >
                                        {r}
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>
            </div>

            {/* Results Popup Modal (Displays on complete run) */}
            {showResultsTable && (
                <div style={{
                    position: 'fixed',
                    top: 0,
                    left: 0,
                    width: '100%',
                    height: '100%',
                    background: 'rgba(15, 23, 42, 0.4)',
                    backdropFilter: 'blur(8px)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    zIndex: 2000,
                    padding: '20px'
                }}>
                    <div className="glass-panel" style={{
                        width: '100%',
                        maxWidth: '500px',
                        padding: '2rem',
                        boxShadow: '0 20px 25px -5px rgba(0,0,0,0.15)',
                        animation: 'scaleIn 0.25s cubic-bezier(0.34, 1.56, 0.64, 1)'
                    }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '1.5rem', borderBottom: '1px solid #f1f5f9', paddingBottom: '0.8rem' }}>
                            <CheckCircle size={24} color="#10b981" />
                            <h2 style={{ margin: 0, fontWeight: 800 }}>사다리타기 결과</h2>
                        </div>

                        {/* Results Pairs List */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '2rem' }}>
                            {players.map((p, idx) => {
                                const resultIdx = finalPairs[idx];
                                const resultVal = resultIdx !== undefined ? results[resultIdx] : '-';
                                return (
                                    <div 
                                        key={`res-row-${idx}`}
                                        style={{
                                            display: 'flex',
                                            justifyContent: 'space-between',
                                            alignItems: 'center',
                                            padding: '12px 16px',
                                            background: '#f8fafc',
                                            borderRadius: '12px',
                                            border: '1px solid #e2e8f0'
                                        }}
                                    >
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                            <span style={{
                                                width: '10px',
                                                height: '10px',
                                                borderRadius: '50%',
                                                background: PATH_COLORS[idx % PATH_COLORS.length]
                                            }} />
                                            <span style={{ fontWeight: 700, fontSize: '0.95rem' }}>{p}</span>
                                        </div>
                                        <div style={{ fontSize: '1.2rem' }}>→</div>
                                        <div>
                                            <span style={{
                                                fontWeight: '800',
                                                color: resultVal === '당첨' ? '#d97706' : 'var(--text)',
                                                background: resultVal === '당첨' ? '#fef3c7' : '#f1f5f9',
                                                padding: '4px 12px',
                                                borderRadius: '8px',
                                                fontSize: '0.9rem',
                                                border: resultVal === '당첨' ? '1px solid #fcd34d' : 'none'
                                            }}>
                                                {resultVal}
                                            </span>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>

                        {/* Modal Action Buttons */}
                        <div style={{ display: 'flex', gap: '10px' }}>
                            <button 
                                onClick={handleReset} 
                                className="glass-button" 
                                style={{ flex: 1, background: '#f1f5f9', color: '#475569', boxShadow: 'none' }}
                            >
                                다시 하기
                            </button>
                            <button 
                                onClick={() => setShowResultsTable(false)} 
                                className="glass-button" 
                                style={{ flex: 1 }}
                            >
                                확인
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Big Result Spotlight Modal (Grows with animation, closes on click anywhere) */}
            {spotlightResult && (
                <div 
                    onClick={handleCloseSpotlight}
                    style={{
                        position: 'fixed',
                        inset: 0,
                        zIndex: 99999,
                        backgroundColor: 'rgba(0, 0, 0, 0.72)',
                        backdropFilter: 'blur(10px)',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        cursor: 'pointer',
                        padding: '20px',
                        animation: 'fadeInSpotlight 0.25s ease-out'
                    }}
                >
                    <div
                        onClick={handleCloseSpotlight}
                        style={{
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            justifyContent: 'center',
                            background: 'linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)',
                            borderRadius: '36px',
                            padding: '48px 50px',
                            maxWidth: '700px',
                            width: '92%',
                            textAlign: 'center',
                            boxShadow: `0 25px 60px rgba(0,0,0,0.5), 0 0 60px ${spotlightResult.color}70`,
                            border: `5px solid ${spotlightResult.color}`,
                            animation: 'resultBigPop 0.45s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards',
                            position: 'relative',
                            userSelect: 'none'
                        }}
                    >
                        {/* Player Name Badge */}
                        <div style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '12px',
                            background: spotlightResult.color,
                            color: '#ffffff',
                            padding: '12px 32px',
                            borderRadius: '26px',
                            fontSize: 'clamp(1.4rem, 3vw, 2.2rem)',
                            fontWeight: '900',
                            letterSpacing: '1px',
                            boxShadow: `0 8px 24px ${spotlightResult.color}50`,
                            marginBottom: '26px'
                        }}>
                            <span>👤 {spotlightResult.playerName} 님의 결과</span>
                        </div>

                        {/* Huge Result Box with Grow Animation */}
                        <div style={{
                            width: '100%',
                            padding: '36px 20px',
                            background: (() => {
                                const val = String(spotlightResult.resultVal || '');
                                if (val.includes('꽝') || val.includes('탈락') || val.includes('벌칙') || val.includes('-') || val.includes('÷')) return '#fef2f2';
                                if (val === '당첨' || val.includes('선물') || val.includes('통과')) return '#fefce8';
                                return '#f0fdf4';
                            })(),
                            borderRadius: '28px',
                            border: `3px dashed ${spotlightResult.color}`,
                            marginBottom: '24px',
                            boxShadow: 'inset 0 3px 12px rgba(0,0,0,0.04)'
                        }}>
                            <div style={{
                                fontSize: 'clamp(4.2rem, 11vw, 7.5rem)',
                                fontWeight: '950',
                                lineHeight: '1.1',
                                letterSpacing: '-1px',
                                color: (() => {
                                    const val = String(spotlightResult.resultVal || '');
                                    if (val.includes('꽝') || val.includes('탈락') || val.includes('벌칙') || val.includes('-') || val.includes('÷')) return '#dc2626';
                                    if (val === '당첨' || val.includes('선물') || val.includes('통과')) return '#d97706';
                                    return spotlightResult.color;
                                })(),
                                wordBreak: 'keep-all',
                                textShadow: '0 4px 20px rgba(0,0,0,0.1)'
                            }}>
                                {spotlightResult.resultVal}
                            </div>
                        </div>

                        {/* Status Message */}
                        <div style={{
                            fontSize: 'clamp(1.2rem, 2.4vw, 1.7rem)',
                            fontWeight: '800',
                            color: '#334155',
                            marginBottom: '20px'
                        }}>
                            {(() => {
                                const val = String(spotlightResult.resultVal || '');
                                if (val.includes('꽝') || val.includes('탈락') || val.includes('벌칙') || val.includes('-') || val.includes('÷')) return '💥 아쉽습니다! 다음 기회에!';
                                if (val === '당첨' || val.includes('선물') || val.includes('통과')) return '🎉 축하합니다! 당첨되었습니다!';
                                if (val.startsWith('+') || val.startsWith('×') || val.includes('원')) return '✨ 결과 획득 성공!';
                                return '🎯 결과 확인 완료!';
                            })()}
                        </div>

                        {/* Dismiss Hint */}
                        <div style={{
                            fontSize: '1rem',
                            color: '#64748b',
                            fontWeight: '700',
                            padding: '10px 22px',
                            background: '#f1f5f9',
                            borderRadius: '18px',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px'
                        }}>
                            <span>👆 화면 아무 곳이나 클릭하면 닫힙니다</span>
                        </div>
                    </div>
                </div>
            )}

            <style>{`
                @keyframes fadeInSpotlight {
                    from { opacity: 0; }
                    to { opacity: 1; }
                }
                @keyframes resultBigPop {
                    0% { transform: scale(0.2) translateY(60px); opacity: 0; }
                    55% { transform: scale(1.12) translateY(-8px); opacity: 1; }
                    75% { transform: scale(0.96) translateY(2px); }
                    100% { transform: scale(1) translateY(0); opacity: 1; }
                }
            `}</style>
        </div>
    );
}
