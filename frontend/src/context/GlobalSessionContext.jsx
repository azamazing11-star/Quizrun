import React, { createContext, useContext, useState, useEffect, useRef } from 'react';

const GlobalSessionContext = createContext();

export function GlobalSessionProvider({ children }) {
    const [gameMode, setGameMode] = useState(() => {
        const saved = localStorage.getItem('quizrun_global_session');
        if (saved) {
            try {
                const parsed = JSON.parse(saved);
                return parsed.gameMode || 'online';
            } catch (e) {}
        }
        return 'online';
    });

    const [participantCount, setParticipantCountState] = useState(() => {
        const saved = localStorage.getItem('quizrun_global_session');
        if (saved) {
            try {
                const parsed = JSON.parse(saved);
                return parsed.participantCount ?? 0;
            } catch (e) {}
        }
        return 0;
    });

    const [scores, setScores] = useState(() => {
        const saved = localStorage.getItem('quizrun_global_session');
        if (saved) {
            try {
                const parsed = JSON.parse(saved);
                if (parsed.scores && Array.isArray(parsed.scores)) {
                    return parsed.scores;
                }
            } catch (e) {}
        }
        return Array.from({ length: participantCount }, (_, i) => ({ num: i + 1, score: 0 }));
    });

    const [onlinePin, setOnlinePinState] = useState(() => {
        return localStorage.getItem('quizrun_online_pin') || '';
    });
    const [serverIp, setServerIpState] = useState(() => {
        return localStorage.getItem('quizrun_server_ip') || (typeof window !== 'undefined' ? window.location.hostname : 'localhost');
    });
    const [publicUrl, setPublicUrlState] = useState(() => {
        return localStorage.getItem('quizrun_public_url') || '';
    });
    const [ltUrl, setLtUrlState] = useState(() => {
        return localStorage.getItem('quizrun_lt_url') || '';
    });
    const [cfUrl, setCfUrlState] = useState(() => {
        return localStorage.getItem('quizrun_cf_url') || '';
    });
    const [onlineParticipants, setOnlineParticipantsState] = useState(() => {
        try {
            const saved = localStorage.getItem('quizrun_online_participants');
            return saved ? JSON.parse(saved) : [];
        } catch (e) {
            return [];
        }
    });

    // Detect if this window is the Sub-Monitor screen
    const isSubScreen = typeof window !== 'undefined' && Boolean(
        window.location.search.includes('subscreen=true') ||
        window.name === 'QuizrunSubScreenWindow' ||
        sessionStorage.getItem('is_subscreen') === 'true'
    );

    // Keep reference to current state for broadcast event handlers
    const sessionRef = useRef({
        gameMode,
        participantCount,
        scores,
        onlinePin,
        serverIp,
        publicUrl,
        onlineParticipants
    });

    useEffect(() => {
        sessionRef.current = {
            gameMode,
            participantCount,
            scores,
            onlinePin,
            serverIp,
            publicUrl,
            onlineParticipants
        };
    }, [gameMode, participantCount, scores, onlinePin, serverIp, publicUrl, onlineParticipants]);

    const broadcastSession = (customPayload = {}) => {
        try {
            const bc = new BroadcastChannel('quizrun_session_sync');
            bc.postMessage({
                type: 'SESSION_UPDATE',
                payload: {
                    gameMode: sessionRef.current.gameMode,
                    onlinePin: sessionRef.current.onlinePin,
                    serverIp: sessionRef.current.serverIp,
                    publicUrl: sessionRef.current.publicUrl,
                    onlineParticipants: sessionRef.current.onlineParticipants,
                    ...customPayload
                }
            });
            setTimeout(() => bc.close(), 300);
        } catch (e) {}
    };

    const setOnlinePin = (pin) => {
        const val = pin || '';
        setOnlinePinState(val);
        if (val) {
            localStorage.setItem('quizrun_online_pin', val);
        } else {
            localStorage.removeItem('quizrun_online_pin');
        }
        broadcastSession({ onlinePin: val });
    };

    const setServerIp = (ip) => {
        const val = ip || (typeof window !== 'undefined' ? window.location.hostname : 'localhost');
        setServerIpState(val);
        localStorage.setItem('quizrun_server_ip', val);
        broadcastSession({ serverIp: val });
    };

    const setPublicUrl = (url) => {
        const val = url || '';
        setPublicUrlState(val);
        if (val) {
            localStorage.setItem('quizrun_public_url', val);
        } else {
            localStorage.removeItem('quizrun_public_url');
        }
        broadcastSession({ publicUrl: val });
    };

    const setLtUrl = (url) => {
        const val = url || '';
        setLtUrlState(val);
        if (val) localStorage.setItem('quizrun_lt_url', val);
        else localStorage.removeItem('quizrun_lt_url');
        broadcastSession({ ltUrl: val });
    };

    const setCfUrl = (url) => {
        const val = url || '';
        setCfUrlState(val);
        if (val) localStorage.setItem('quizrun_cf_url', val);
        else localStorage.removeItem('quizrun_cf_url');
        broadcastSession({ cfUrl: val });
    };

    const setOnlineParticipants = (participants) => {
        const val = Array.isArray(participants) ? participants : [];
        setOnlineParticipantsState(val);
        try {
            localStorage.setItem('quizrun_online_participants', JSON.stringify(val));
        } catch (e) {}
        broadcastSession({ onlineParticipants: val });
    };

    // BroadcastChannel synchronization between Main Screen and Sub-Monitor
    useEffect(() => {
        let sessionBc;
        try {
            sessionBc = new BroadcastChannel('quizrun_session_sync');

            const handleMsg = (e) => {
                const { type, payload } = e.data || {};

                if (type === 'REQUEST_SESSION' && !isSubScreen) {
                    // Leader responds with current full session
                    sessionBc.postMessage({
                        type: 'SESSION_UPDATE',
                        payload: {
                            gameMode: sessionRef.current.gameMode,
                            onlinePin: sessionRef.current.onlinePin,
                            serverIp: sessionRef.current.serverIp,
                            publicUrl: sessionRef.current.publicUrl,
                            onlineParticipants: sessionRef.current.onlineParticipants
                        }
                    });
                } else if (type === 'SESSION_UPDATE' && payload) {
                    // Update state from peer
                    if (payload.onlinePin !== undefined) setOnlinePinState(payload.onlinePin);
                    if (payload.serverIp !== undefined) setServerIpState(payload.serverIp);
                    if (payload.publicUrl !== undefined) setPublicUrlState(payload.publicUrl);
                    if (payload.onlineParticipants !== undefined) setOnlineParticipantsState(payload.onlineParticipants);
                    if (payload.gameMode !== undefined) setGameMode(payload.gameMode);
                }
            };

            sessionBc.addEventListener('message', handleMsg);

            // If SubScreen mounts, proactively ask the Main Screen for the active session
            if (isSubScreen) {
                sessionBc.postMessage({ type: 'REQUEST_SESSION' });
            }

            return () => {
                sessionBc.removeEventListener('message', handleMsg);
                sessionBc.close();
            };
        } catch (err) {
            console.warn('Session sync BroadcastChannel error:', err);
        }
    }, [isSubScreen]);

    const lastSavedDataRef = useRef('');

    // Sync with localStorage (Guarded against ping-pong loops)
    useEffect(() => {
        const dataStr = JSON.stringify({ gameMode, participantCount, scores });
        if (dataStr === lastSavedDataRef.current) return;
        lastSavedDataRef.current = dataStr;
        localStorage.setItem('quizrun_global_session', dataStr);

        // Broadcast scores to sub-monitor screen immediately
        try {
            const bc = new BroadcastChannel('quizrun_screen_sync');
            bc.postMessage({
                type: 'SCORES_UPDATE',
                payload: { scores, participantCount, gameMode }
            });
            setTimeout(() => bc.close(), 300);
        } catch (e) {}
    }, [gameMode, participantCount, scores]);

    // Listen for storage changes from other windows/tabs
    useEffect(() => {
        const handleStorage = (e) => {
            if (e.key === 'quizrun_global_session' && e.newValue) {
                if (e.newValue === lastSavedDataRef.current) return;
                lastSavedDataRef.current = e.newValue;
                try {
                    const parsed = JSON.parse(e.newValue);
                    if (parsed.scores && JSON.stringify(parsed.scores) !== JSON.stringify(sessionRef.current.scores)) {
                        setScores(parsed.scores);
                    }
                    if (parsed.participantCount !== undefined && parsed.participantCount !== sessionRef.current.participantCount) {
                        setParticipantCountState(parsed.participantCount);
                    }
                    if (parsed.gameMode && parsed.gameMode !== sessionRef.current.gameMode) {
                        setGameMode(parsed.gameMode);
                    }
                } catch (err) {}
            }
            if (e.key === 'quizrun_online_pin' && e.newValue !== sessionRef.current.onlinePin) {
                setOnlinePinState(e.newValue || '');
            }
            if (e.key === 'quizrun_public_url' && e.newValue !== sessionRef.current.publicUrl) {
                setPublicUrlState(e.newValue || '');
            }
            if (e.key === 'quizrun_server_ip' && e.newValue !== sessionRef.current.serverIp) {
                setServerIpState(e.newValue || (typeof window !== 'undefined' ? window.location.hostname : 'localhost'));
            }
            if (e.key === 'quizrun_online_participants' && e.newValue) {
                try {
                    const parsed = JSON.parse(e.newValue);
                    if (JSON.stringify(parsed) !== JSON.stringify(sessionRef.current.onlineParticipants)) {
                        setOnlineParticipantsState(parsed);
                    }
                } catch (err) {}
            }
        };
        window.addEventListener('storage', handleStorage);
        return () => window.removeEventListener('storage', handleStorage);
    }, []);

    const setParticipantCount = (count) => {
        const newCount = Math.max(0, Math.min(50, count));
        setParticipantCountState(newCount);
        setScores(prev => {
            if (prev.length < newCount) {
                const added = Array.from({ length: newCount - prev.length }, (_, i) => ({
                    num: prev.length + i + 1,
                    score: 0
                }));
                return [...prev, ...added];
            } else {
                return prev.slice(0, newCount);
            }
        });
    };

    const adjustScore = (num, delta) => {
        setScores(prev => prev.map(item => {
            if (item.num === num) {
                return { ...item, score: item.score + delta };
            }
            return item;
        }));
    };

    const setExactScore = (num, newScore) => {
        const val = isNaN(newScore) ? 0 : Number(newScore);
        setScores(prev => prev.map(item => {
            if (item.num === num) {
                return { ...item, score: val };
            }
            return item;
        }));
    };

    const resetScores = () => {
        setScores(prev => prev.map(item => ({ ...item, score: 0 })));
    };

    const endSession = () => {
        setScores(prev => prev.map(item => ({ ...item, score: 0 })));
        localStorage.removeItem('quizrun_global_session');
    };

    return (
        <GlobalSessionContext.Provider value={{
            gameMode,
            setGameMode,
            participantCount,
            setParticipantCount,
            scores,
            adjustScore,
            setExactScore,
            resetScores,
            endSession,
            onlinePin,
            setOnlinePin,
            serverIp,
            setServerIp,
            publicUrl,
            setPublicUrl,
            ltUrl,
            setLtUrl,
            cfUrl,
            setCfUrl,
            onlineParticipants,
            setOnlineParticipants
        }}>
            {children}
        </GlobalSessionContext.Provider>
    );
}

export function useGlobalSession() {
    return useContext(GlobalSessionContext);
}