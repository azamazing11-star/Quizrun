import React, { useState, useEffect } from 'react';

export default function MediaViewer({ 
    mediaUrl, 
    url: propUrl, 
    mediaType, 
    type: propType, 
    mediaName, 
    name: propName, 
    mediaDisplayMode, 
    displayMode, 
    autoplay,
    isMuted = false,
    isScreenView = false,
    remoteCommand = null,
    onMediaAction = null
}) {
    const rawUrl = mediaUrl || propUrl || '';
    const url = typeof rawUrl === 'string' ? rawUrl.trim() : '';
    const lowerUrl = url.toLowerCase();
    const effectiveType = mediaType || propType || '';
    const effectiveName = mediaName || propName || '';

    // Auto type detection
    const isYt = effectiveType === 'youtube' || url.includes('youtube.com') || url.includes('youtu.be');
    const isAudioType = effectiveType === 'audio' || 
                        lowerUrl.endsWith('.mp3') || lowerUrl.endsWith('.wav') || 
                        lowerUrl.endsWith('.m4a') || lowerUrl.endsWith('.ogg') || 
                        lowerUrl.endsWith('.flac') || lowerUrl.endsWith('.aac') || 
                        lowerUrl.startsWith('data:audio');

    const isVideoType = effectiveType === 'video' || 
                        lowerUrl.endsWith('.mp4') || lowerUrl.endsWith('.webm') || 
                        lowerUrl.endsWith('.mov') || lowerUrl.endsWith('.ogv') || 
                        lowerUrl.startsWith('data:video');

    const isImageType = effectiveType === 'image' || 
                        lowerUrl.endsWith('.png') || lowerUrl.endsWith('.jpg') || 
                        lowerUrl.endsWith('.jpeg') || lowerUrl.endsWith('.gif') || 
                        lowerUrl.endsWith('.webp') || lowerUrl.endsWith('.svg') || 
                        lowerUrl.startsWith('data:image');

    const modeToUse = displayMode || mediaDisplayMode || 'audio';
    const isAutoplay = autoplay === true;
    const [isPlaying, setIsPlaying] = useState(isAutoplay);
    const [hasStarted, setHasStarted] = useState(isAutoplay);
    const iframeRef = React.useRef(null);
    const mediaElementRef = React.useRef(null);

    // Sync isMuted to HTML5 element
    useEffect(() => {
        if (mediaElementRef.current) {
            mediaElementRef.current.muted = !!isMuted;
        }
    }, [isMuted]);

    // Sync isMuted to YouTube iframe
    useEffect(() => {
        if (isYt && iframeRef.current?.contentWindow) {
            try {
                iframeRef.current.contentWindow.postMessage(
                    JSON.stringify({ event: 'command', func: isMuted ? 'mute' : 'unMute', args: '' }),
                    '*'
                );
            } catch (e) {}
        }
    }, [isMuted, isYt]);

    // Core play/pause/restart methods
    const doPlay = () => {
        if (isYt) {
            if (!hasStarted) {
                setHasStarted(true);
            } else {
                iframeRef.current?.contentWindow?.postMessage(
                    JSON.stringify({ event: 'command', func: 'playVideo', args: '' }),
                    '*'
                );
            }
            setIsPlaying(true);
        } else if (mediaElementRef.current) {
            mediaElementRef.current.play().catch(e => console.log('Playback error:', e));
            setIsPlaying(true);
        }
    };

    const doPause = () => {
        if (isYt) {
            iframeRef.current?.contentWindow?.postMessage(
                JSON.stringify({ event: 'command', func: 'pauseVideo', args: '' }),
                '*'
            );
            setIsPlaying(false);
        } else if (mediaElementRef.current) {
            mediaElementRef.current.pause();
            setIsPlaying(false);
        }
    };

    const doRestart = () => {
        if (isYt) {
            iframeRef.current?.contentWindow?.postMessage(
                JSON.stringify({ event: 'command', func: 'seekTo', args: [0, true] }),
                '*'
            );
            iframeRef.current?.contentWindow?.postMessage(
                JSON.stringify({ event: 'command', func: 'playVideo', args: '' }),
                '*'
            );
            setHasStarted(true);
            setIsPlaying(true);
        } else if (mediaElementRef.current) {
            try {
                mediaElementRef.current.currentTime = 0;
                mediaElementRef.current.play().catch(e => console.log('Restart play error:', e));
                setIsPlaying(true);
            } catch (e) {}
        }
    };

    // Remote command handler (from ScreenView / BroadcastChannel)
    useEffect(() => {
        if (!remoteCommand || !remoteCommand.action) return;
        if (remoteCommand.action === 'play') {
            doPlay();
        } else if (remoteCommand.action === 'pause') {
            doPause();
        } else if (remoteCommand.action === 'restart') {
            doRestart();
        }
    }, [remoteCommand]);

    useEffect(() => {
        setIsPlaying(isAutoplay);
        setHasStarted(isAutoplay);

        return () => {
            if (mediaElementRef.current) {
                try {
                    mediaElementRef.current.pause();
                    mediaElementRef.current.currentTime = 0;
                } catch (e) {}
            }
            try {
                iframeRef.current?.contentWindow?.postMessage(JSON.stringify({ event: 'command', func: 'pauseVideo', args: '' }), '*');
            } catch (e) {}
        };
    }, [mediaUrl, isAutoplay]);

    const togglePlay = () => {
        if (!url) return;
        if (isPlaying) {
            doPause();
            if (onMediaAction) onMediaAction('pause');
        } else {
            doPlay();
            if (onMediaAction) onMediaAction('play');
        }
    };

    const handleRestart = () => {
        if (!url) return;
        doRestart();
        if (onMediaAction) onMediaAction('restart');
    };

    // Spacebar keyboard shortcut (presenter only)
    useEffect(() => {
        if (!url || isScreenView) return;
        const handleKeyDown = (e) => {
            if (e.code === 'Space') {
                const tag = document.activeElement?.tagName?.toLowerCase();
                if (tag === 'input' || tag === 'textarea' || document.activeElement?.isContentEditable) {
                    return;
                }
                e.preventDefault();
                togglePlay();
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [url, isPlaying, hasStarted, isYt, isScreenView]);

    if (!url) return null;

    // Helper to extract YouTube video ID
    const getYouTubeEmbedUrl = (targetUrl, auto, muted) => {
        try {
            const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
            const match = targetUrl.match(regExp);
            if (match && match[2] && match[2].length === 11) {
                const videoId = match[2];
                let params = `autoplay=${auto ? 1 : 0}&enablejsapi=1&mute=${muted ? 1 : 0}`;
                return `https://www.youtube.com/embed/${videoId}?${params}`;
            }
        } catch (e) {
            console.error('YouTube URL parse error:', e);
        }
        return null;
    };

    // Effective display mode
    let effectiveMode = modeToUse;
    if (isImageType) {
        effectiveMode = 'image';
    } else if (!effectiveMode || effectiveMode === 'auto') {
        if (isYt) effectiveMode = 'audio';
        else if (isAudioType) effectiveMode = 'audio';
        else if (isVideoType) effectiveMode = 'video';
        else effectiveMode = 'link';
    }

    // 1. AUDIO-ONLY MODE (음성/소리만 듣기) - For YouTube, MP3, MP4, etc.
    if (effectiveMode === 'audio' || effectiveMode === 'sound') {
        const ytEmbed = getYouTubeEmbedUrl(url, hasStarted, isMuted);

        return (
            <div style={{ 
                margin: '14px auto', 
                padding: '16px 20px', 
                background: 'linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%)', 
                borderRadius: '20px', 
                border: '2px solid #38bdf8', 
                display: 'flex', 
                flexDirection: 'column', 
                gap: '12px', 
                alignItems: 'center', 
                width: '100%', 
                maxWidth: '540px',
                boxShadow: '0 8px 20px rgba(14, 165, 233, 0.15)',
                position: 'relative'
            }}>
                {effectiveName && (
                    <div style={{ fontSize: '1rem', fontWeight: '800', color: '#0369a1', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        🎵 <span>{effectiveName}</span>
                    </div>
                )}

                {isScreenView ? (
                    // ScreenView (Audience display on Sub-Monitor)
                    <div style={{ width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px' }}>
                        <div style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '10px',
                            padding: '12px 28px',
                            background: isMuted ? '#f1f5f9' : (isPlaying ? '#ecfdf5' : '#fef3c7'),
                            borderRadius: '20px',
                            border: isMuted ? '2px solid #cbd5e1' : (isPlaying ? '2.5px solid #10b981' : '2.5px solid #f59e0b'),
                            boxShadow: '0 4px 14px rgba(0,0,0,0.06)'
                        }}>
                            <span style={{ fontSize: '1.4rem' }}>
                                {isMuted ? '🔇' : (isPlaying ? '🎵' : '⏸️')}
                            </span>
                            <span style={{
                                fontSize: '1.15rem',
                                fontWeight: '900',
                                color: isMuted ? '#64748b' : (isPlaying ? '#047857' : '#92400e')
                            }}>
                                {isMuted ? '소리 출력: 메인(진행자 PC)' : (isPlaying ? '음악 재생 중... 🎶' : '음악 일시정지됨')}
                            </span>
                        </div>

                        {/* Hidden YouTube iframe for background audio on screen */}
                        {isYt && ytEmbed && hasStarted && (
                            <iframe
                                ref={iframeRef}
                                src={ytEmbed}
                                title="YouTube Audio Player"
                                style={{ width: '1px', height: '1px', opacity: 0.01, border: 'none', position: 'absolute', pointerEvents: 'none' }}
                                allow="autoplay; encrypted-media"
                            />
                        )}

                        {/* Hidden HTML5 audio for screen */}
                        {!isYt && (
                            <audio 
                                ref={mediaElementRef}
                                autoPlay={isAutoplay} 
                                muted={isMuted}
                                src={url} 
                                style={{ display: 'none' }} 
                                onPlay={() => setIsPlaying(true)}
                                onPause={() => setIsPlaying(false)}
                            />
                        )}
                    </div>
                ) : (
                    // Presenter View (Host page on Main Monitor)
                    <div style={{ width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px' }}>
                        <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap', justifyContent: 'center' }}>
                            <button
                                type="button"
                                onClick={togglePlay}
                                style={{
                                    padding: '10px 22px',
                                    fontSize: '1rem',
                                    fontWeight: '800',
                                    borderRadius: '12px',
                                    border: 'none',
                                    background: isPlaying ? '#0284c7' : '#22c55e',
                                    color: 'white',
                                    cursor: 'pointer',
                                    boxShadow: '0 4px 12px rgba(2, 132, 199, 0.3)',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '8px'
                                }}
                            >
                                {isPlaying ? '⏸️ 일시정지' : '▶️ 소리 재생하기'}
                            </button>

                            <button
                                type="button"
                                onClick={handleRestart}
                                style={{
                                    padding: '10px 16px',
                                    fontSize: '0.95rem',
                                    fontWeight: '800',
                                    borderRadius: '12px',
                                    border: '1.5px solid #cbd5e1',
                                    background: '#ffffff',
                                    color: '#334155',
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '6px',
                                    boxShadow: '0 2px 6px rgba(0,0,0,0.05)'
                                }}
                                title="처음부터 다시 재생합니다."
                            >
                                🔄 처음부터 다시
                            </button>
                        </div>

                        {isMuted && (
                            <div style={{ fontSize: '0.8rem', fontWeight: '700', color: '#0369a1', background: '#e0f2fe', padding: '3px 10px', borderRadius: '8px' }}>
                                📺 서브 모니터 스피커로 출력 중 (진행자 PC 음소거)
                            </div>
                        )}

                        <span style={{ fontSize: '0.8rem', color: '#0369a1', opacity: 0.8 }}>스페이스바로 재생/일시정지 가능</span>

                        {isYt && ytEmbed ? (
                            hasStarted && (
                                <iframe
                                    ref={iframeRef}
                                    src={ytEmbed}
                                    title="YouTube Audio Player"
                                    style={{ width: '1px', height: '1px', opacity: 0.01, border: 'none', position: 'absolute', pointerEvents: 'none' }}
                                    allow="autoplay; encrypted-media"
                                />
                            )
                        ) : (
                            <audio 
                                ref={mediaElementRef}
                                controls 
                                autoPlay={isAutoplay} 
                                muted={isMuted}
                                src={url} 
                                style={{ width: '100%', outline: 'none' }} 
                                onPlay={() => setIsPlaying(true)}
                                onPause={() => setIsPlaying(false)}
                            />
                        )}
                    </div>
                )}
            </div>
        );
    }

    // 2. VIDEO MODE (영상으로 보기)
    if (effectiveMode === 'video') {
        const ytEmbed = getYouTubeEmbedUrl(url, hasStarted, isMuted);

        if (isYt && ytEmbed) {
            return (
                <div style={{ margin: '14px auto', width: '100%', maxWidth: '640px', aspectRatio: '16/9', borderRadius: '16px', overflow: 'hidden', border: '2px solid #cbd5e1', boxShadow: '0 8px 25px rgba(0,0,0,0.12)', position: 'relative' }}>
                    <iframe
                        ref={iframeRef}
                        src={ytEmbed}
                        title={effectiveName || "YouTube Video"}
                        style={{ width: '100%', height: '100%', border: 'none' }}
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                        allowFullScreen
                    />
                </div>
            );
        }

        return (
            <div style={{ margin: '14px auto', width: '100%', maxWidth: '640px', borderRadius: '16px', overflow: 'hidden', border: '2px solid #cbd5e1', background: '#0f172a', boxShadow: '0 8px 25px rgba(0,0,0,0.15)' }}>
                {effectiveName && (
                    <div style={{ color: 'white', fontSize: '0.85rem', padding: '8px 14px', background: '#1e293b', fontWeight: 'bold', textAlign: 'left' }}>
                        🎥 {effectiveName}
                    </div>
                )}
                <video 
                    ref={mediaElementRef}
                    controls 
                    autoPlay={isAutoplay} 
                    muted={isMuted}
                    src={url} 
                    style={{ width: '100%', maxHeight: '380px', objectFit: 'contain' }} 
                    onPlay={() => setIsPlaying(true)}
                    onPause={() => setIsPlaying(false)}
                />
            </div>
        );
    }

    // 3. IMAGE MODE (이미지로 보기)
    if (effectiveMode === 'image' || isImageType) {
        return (
            <div style={{ margin: '14px auto', textAlign: 'center' }}>
                <img
                    src={url}
                    alt={effectiveName || "참조 이미지"}
                    style={{ maxWidth: '100%', maxHeight: '340px', borderRadius: '16px', objectFit: 'contain', border: '2px solid #cbd5e1', boxShadow: '0 8px 20px rgba(0,0,0,0.08)' }}
                />
            </div>
        );
    }

    // 4. LINK MODE (웹 링크 바로가기)
    return (
        <div style={{ margin: '14px auto', textAlign: 'center' }}>
            <a
                href={url}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '8px',
                    padding: '12px 24px',
                    background: '#eff6ff',
                    color: '#1d4ed8',
                    borderRadius: '14px',
                    border: '2px solid #93c5fd',
                    fontWeight: 'bold',
                    fontSize: '1rem',
                    textDecoration: 'none',
                    boxShadow: '0 4px 12px rgba(37, 99, 235, 0.12)',
                    transition: 'all 0.2s ease'
                }}
            >
                🔗 {effectiveName || '참조 링크 바로가기'} ({url})
            </a>
        </div>
    );
}
