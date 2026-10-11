// Asset Preloader to eliminate loading lag for game images and audio
const PRELOAD_IMAGES = [
    '/flag/대한민국.jpg',
    '/flag/미국.jpg',
    '/flag/영국.jpg',
    '/flag/프랑스.jpg',
    '/flag/독일.jpg',
    '/flag/캐나다.jpg',
    '/flag/브라질.jpg',
    '/flag/이탈리아.jpg',
    '/flag/스페인.jpg',
    '/flag/스위스.jpg',
    '/quizrun_study_robot.png?v=3'
];

let preloaded = false;

export function preloadGameAssets() {
    if (preloaded || typeof window === 'undefined') return;
    preloaded = true;

    // Use requestIdleCallback or setTimeout to preload without affecting current UI interactions
    const runPreload = () => {
        // Preload images
        PRELOAD_IMAGES.forEach(src => {
            const img = new Image();
            img.src = src;
        });

        // Preload Carefree, Sega Tetris, and Arkanoid audio metadata
        try {
            ['/audio/carefree.mp3', '/audio/sega_tetris.mp3', '/audio/arkanoid_start.mp3', '/audio/arkanoid_bgm.mp3'].forEach(src => {
                const a = new Audio();
                a.preload = 'auto';
                a.src = src;
            });
        } catch (e) {}
    };

    if ('requestIdleCallback' in window) {
        window.requestIdleCallback(runPreload, { timeout: 2000 });
    } else {
        setTimeout(runPreload, 300);
    }
}
