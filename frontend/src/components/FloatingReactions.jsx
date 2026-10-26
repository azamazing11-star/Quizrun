import React, { useState, useEffect } from 'react';

/**
 * FloatingReactions:
 * Renders live floating emojis / stickers floating up gracefully on screen,
 * similar to YouTube Live or Instagram Live hearts.
 */
export default function FloatingReactions({ socket, isMobile = false }) {
    const [reactions, setReactions] = useState([]);

    useEffect(() => {
        if (!socket) return;

        const handleLiveReaction = (data) => {
            if (!data || !data.emoji) return;

            // Generate random horizontal trajectory (-30px ~ +30px drift) and random start X (15% ~ 85%)
            const id = data.id || ('react_' + Date.now() + '_' + Math.random());
            const randomX = Math.floor(Math.random() * 70) + 15; // 15% ~ 85%
            const driftX = (Math.random() - 0.5) * 60; // -30px ~ +30px

            const item = {
                id,
                emoji: data.emoji,
                nickname: data.nickname || '',
                left: `${randomX}%`,
                driftX: `${driftX}px`,
                createdAt: Date.now()
            };

            setReactions(prev => [...prev.slice(-25), item]);

            // Auto-clean after 2.8s
            setTimeout(() => {
                setReactions(prev => prev.filter(r => r.id !== id));
            }, 2800);
        };

        socket.on('chat:live_reaction', handleLiveReaction);

        return () => {
            socket.off('chat:live_reaction', handleLiveReaction);
        };
    }, [socket]);

    if (reactions.length === 0) return null;

    return (
        <div style={{
            position: 'fixed',
            bottom: isMobile ? '80px' : '40px',
            left: 0,
            right: 0,
            height: '350px',
            pointerEvents: 'none',
            zIndex: 9999,
            overflow: 'hidden'
        }}>
            <style>{`
                @keyframes floatUpFade {
                    0% {
                        opacity: 0;
                        transform: translateY(40px) scale(0.6) rotate(0deg);
                    }
                    15% {
                        opacity: 1;
                        transform: translateY(0) scale(1.2) rotate(-8deg);
                    }
                    40% {
                        transform: translateY(-80px) scale(1) rotate(8deg);
                    }
                    80% {
                        opacity: 0.9;
                        transform: translateY(-200px) scale(0.95);
                    }
                    100% {
                        opacity: 0;
                        transform: translateY(-300px) scale(0.7);
                    }
                }
            `}</style>
            {reactions.map(r => (
                <div
                    key={r.id}
                    style={{
                        position: 'absolute',
                        bottom: '10px',
                        left: r.left,
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        animation: 'floatUpFade 2.6s cubic-bezier(0.25, 0.46, 0.45, 0.94) forwards',
                        filter: 'drop-shadow(0 4px 10px rgba(0,0,0,0.25))',
                        pointerEvents: 'none'
                    }}
                >
                    <span style={{ fontSize: isMobile ? '2.4rem' : '3.2rem', lineHeight: 1 }}>
                        {r.emoji}
                    </span>
                    {r.nickname && (
                        <span style={{
                            fontSize: '0.72rem',
                            fontWeight: '800',
                            color: '#ffffff',
                            background: 'rgba(15, 23, 42, 0.75)',
                            backdropFilter: 'blur(4px)',
                            padding: '2px 8px',
                            borderRadius: '10px',
                            marginTop: '2px',
                            whiteSpace: 'nowrap'
                        }}>
                            {r.nickname}
                        </span>
                    )}
                </div>
            ))}
        </div>
    );
}
