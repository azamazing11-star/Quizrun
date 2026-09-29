import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { ArrowLeft, Play, RefreshCw, RotateCcw, Volume2, VolumeX, Trophy, Sparkles, Award, Star, Shield, Flame, ChevronRight, Zap, CheckCircle2 } from 'lucide-react';
import { useGlobalSession } from '../context/GlobalSessionContext';
import { playSound } from '../utils/audio';
import Confetti from 'react-confetti';

// ==========================================
// 1. Student Friendly Character SVG Avatars
// ==========================================

// 1) 명탐정 민우 - 두뇌파 에이스 (베레모, 돋보기, 스마트 안경, 댄디 자켓)
function DetectiveMinwooAvatar({ size = 52 }) {
    return (
        <svg width={size} height={size} viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
            <defs>
                <linearGradient id="dm_bg" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#1e3a8a" />
                    <stop offset="100%" stopColor="#1e40af" />
                </linearGradient>
                <linearGradient id="dm_skin" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#fff5eb" />
                    <stop offset="100%" stopColor="#fed7aa" />
                </linearGradient>
                <linearGradient id="dm_coat" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#3b82f6" />
                    <stop offset="100%" stopColor="#1d4ed8" />
                </linearGradient>
            </defs>
            <circle cx="50" cy="50" r="48" fill="url(#dm_bg)" stroke="#60a5fa" strokeWidth="2.5" />

            {/* Smart School Blazer & Ribbon */}
            <path d="M22 94 C26 72 36 68 50 68 C64 68 74 72 78 94 Z" fill="url(#dm_coat)" />
            <path d="M42 68 L50 82 L58 68 Z" fill="#ffffff" />
            <path d="M44 72 L56 72 L50 78 Z" fill="#ef4444" />

            {/* Neck & Face */}
            <rect x="44" y="54" width="12" height="15" rx="3" fill="#fed7aa" />
            <path d="M34 38 C34 26 66 26 66 38 C66 54 62 62 50 62 C38 62 34 54 34 38 Z" fill="url(#dm_skin)" />

            {/* Soft Brown Hair & Cute Beret */}
            <path d="M30 32 C30 18 42 12 50 12 C62 12 70 18 70 32 C64 24 56 22 50 24 C44 22 36 24 30 32 Z" fill="#78350f" />
            <ellipse cx="50" cy="22" rx="24" ry="12" fill="#b45309" stroke="#92400e" strokeWidth="1.5" />
            <circle cx="50" cy="10" r="2.5" fill="#f59e0b" />

            {/* Smart Glasses */}
            <circle cx="42" cy="42" r="7" stroke="#1e293b" strokeWidth="2" fill="rgba(255,255,255,0.4)" />
            <circle cx="58" cy="42" r="7" stroke="#1e293b" strokeWidth="2" fill="rgba(255,255,255,0.4)" />
            <line x1="49" y1="42" x2="51" y2="42" stroke="#1e293b" strokeWidth="2" />
            
            {/* Sparkle Eyes */}
            <circle cx="42" cy="42" r="2.5" fill="#1e293b" />
            <circle cx="44" cy="40.5" r="1" fill="#ffffff" />
            <circle cx="58" cy="42" r="2.5" fill="#1e293b" />
            <circle cx="60" cy="40.5" r="1" fill="#ffffff" />

            {/* Cheerful Smile */}
            <path d="M46 54 Q50 58 54 54" stroke="#b91c1c" strokeWidth="1.8" strokeLinecap="round" fill="none" />
            <circle cx="36" cy="48" r="2.5" fill="#f87171" opacity="0.5" />
            <circle cx="64" cy="48" r="2.5" fill="#f87171" opacity="0.5" />
        </svg>
    );
}

// 2) 아이돌 루나 - K-POP 요정 (별빛 머리핀, 마이크, 트윈테일, 하트 볼터치)
function IdolLunaAvatar({ size = 52 }) {
    return (
        <svg width={size} height={size} viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
            <defs>
                <linearGradient id="il_bg" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#831843" />
                    <stop offset="100%" stopColor="#db2777" />
                </linearGradient>
                <linearGradient id="il_skin" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#fff5eb" />
                    <stop offset="100%" stopColor="#fed7aa" />
                </linearGradient>
                <linearGradient id="il_dress" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#ec4899" />
                    <stop offset="100%" stopColor="#be185d" />
                </linearGradient>
            </defs>
            <circle cx="50" cy="50" r="48" fill="url(#il_bg)" stroke="#f472b6" strokeWidth="2.5" />

            {/* Twin Ponytails */}
            <ellipse cx="22" cy="38" rx="10" ry="18" fill="#a21caf" transform="rotate(-15 22 38)" />
            <ellipse cx="78" cy="38" rx="10" ry="18" fill="#a21caf" transform="rotate(15 78 38)" />

            {/* Stage Outfit */}
            <path d="M24 94 C28 72 38 68 50 68 C62 68 72 72 76 94 Z" fill="url(#il_dress)" />
            <path d="M42 68 L50 78 L58 68 Z" fill="#fdf2f8" />
            <circle cx="50" cy="74" r="2.5" fill="#f43f5e" />

            {/* Face & Neck */}
            <rect x="44" y="56" width="12" height="14" rx="3" fill="#fed7aa" />
            <path d="M34 40 C34 26 66 26 66 40 C66 54 62 62 50 62 C38 62 34 54 34 40 Z" fill="url(#il_skin)" />

            {/* Bangs Hair */}
            <path d="M32 38 C34 26 44 24 50 24 C56 24 66 26 68 38 C60 30 54 30 50 33 C46 30 40 30 32 38 Z" fill="#86198f" />

            {/* Star Hairpin */}
            <path d="M30 24 L32 20 L34 24 L38 25 L34 27 L32 31 L30 27 L26 25 Z" fill="#facc15" />

            {/* Big Anime Eyes & Highlights */}
            <ellipse cx="42" cy="44" rx="3.5" ry="4.5" fill="#1e1b4b" />
            <ellipse cx="58" cy="44" rx="3.5" ry="4.5" fill="#1e1b4b" />
            <circle cx="43" cy="42" r="1.5" fill="#ffffff" />
            <circle cx="59" cy="42" r="1.5" fill="#ffffff" />
            <circle cx="41" cy="46" r="0.8" fill="#f472b6" />
            <circle cx="57" cy="46" r="0.8" fill="#f472b6" />

            {/* Heart Blush */}
            <path d="M36 49 C36 48 37 47 38 48 C39 47 40 48 40 49 C40 51 38 52 38 52 C38 52 36 51 36 49 Z" fill="#fb7185" />
            <path d="M60 49 C60 48 61 47 62 48 C63 47 64 48 64 49 C64 51 62 52 62 52 C62 52 60 51 60 49 Z" fill="#fb7185" />

            {/* Sweet Smile */}
            <path d="M46 54 Q50 58 54 54" stroke="#e11d48" strokeWidth="2" strokeLinecap="round" fill="none" />

            {/* Mini Headset Mic */}
            <path d="M64 44 Q66 52 60 56" stroke="#94a3b8" strokeWidth="1.5" fill="none" />
            <circle cx="59" cy="56" r="2.5" fill="#38bdf8" />
        </svg>
    );
}

// 3) 에너지 찬 - 열정 캡틴 (헤어밴드, 스포츠 유니폼, 자신감 넘치는 미소)
function SportyChanAvatar({ size = 52 }) {
    return (
        <svg width={size} height={size} viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
            <defs>
                <linearGradient id="sc_bg" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#7c2d12" />
                    <stop offset="100%" stopColor="#ea580c" />
                </linearGradient>
                <linearGradient id="sc_skin" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#fed7aa" />
                    <stop offset="100%" stopColor="#fba76b" />
                </linearGradient>
                <linearGradient id="sc_jersey" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#f97316" />
                    <stop offset="100%" stopColor="#c2410c" />
                </linearGradient>
            </defs>
            <circle cx="50" cy="50" r="48" fill="url(#sc_bg)" stroke="#fb923c" strokeWidth="2.5" />

            {/* Sports Jersey */}
            <path d="M22 94 C26 72 36 68 50 68 C64 68 74 72 78 94 Z" fill="url(#sc_jersey)" />
            <path d="M42 68 L50 80 L58 68 Z" fill="#ffffff" />
            <path d="M48 76 L52 76 L50 82 Z" fill="#0284c7" />

            {/* Neck & Face */}
            <rect x="43" y="54" width="14" height="15" rx="3" fill="#fba76b" />
            <path d="M33 38 C33 24 67 24 67 38 C67 54 63 62 50 62 C37 62 33 54 33 38 Z" fill="url(#sc_skin)" />

            {/* Spiky Dynamic Hair */}
            <path d="M28 32 L34 16 L42 24 L50 14 L58 24 L66 16 L72 32 Z" fill="#18181b" />

            {/* Bright Sport Headband */}
            <rect x="30" y="30" width="40" height="9" rx="3" fill="#38bdf8" stroke="#0284c7" strokeWidth="1" />
            <circle cx="50" cy="34.5" r="2.5" fill="#fde047" />

            {/* Confident Eyes */}
            <ellipse cx="42" cy="45" rx="3" ry="3.5" fill="#0f172a" />
            <circle cx="43" cy="43.5" r="1.2" fill="#ffffff" />
            <path d="M55 45 Q59 42 63 45" stroke="#0f172a" strokeWidth="2.5" strokeLinecap="round" fill="none" /> {/* Winking Eye */}

            {/* Healthy Glow & Grin */}
            <circle cx="36" cy="51" r="3" fill="#f97316" opacity="0.4" />
            <circle cx="64" cy="51" r="3" fill="#f97316" opacity="0.4" />
            <path d="M44 54 Q50 60 56 54 Z" fill="#ffffff" stroke="#c2410c" strokeWidth="1.5" />
        </svg>
    );
}

// 4) 마법사 하린 - 별빛 위저드 (마법 모자, 신비로운 보라 눈동자, 별빛 로브)
function WizardHarinAvatar({ size = 52 }) {
    return (
        <svg width={size} height={size} viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
            <defs>
                <linearGradient id="wh_bg" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#3b0764" />
                    <stop offset="100%" stopColor="#7e22ce" />
                </linearGradient>
                <linearGradient id="wh_skin" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#fff5eb" />
                    <stop offset="100%" stopColor="#fed7aa" />
                </linearGradient>
                <linearGradient id="wh_hat" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#6b21a8" />
                    <stop offset="100%" stopColor="#4c1d95" />
                </linearGradient>
            </defs>
            <circle cx="50" cy="50" r="48" fill="url(#wh_bg)" stroke="#a78bfa" strokeWidth="2.5" />

            {/* Mystic Robe */}
            <path d="M22 94 C26 72 36 68 50 68 C64 68 74 72 78 94 Z" fill="url(#wh_hat)" />
            <path d="M44 68 L50 78 L56 68 Z" fill="#fef08a" />
            <circle cx="50" cy="74" r="2" fill="#ec4899" />

            {/* Face & Neck */}
            <rect x="44" y="56" width="12" height="14" rx="3" fill="#fed7aa" />
            <path d="M34 40 C34 26 66 26 66 40 C66 54 62 62 50 62 C38 62 34 54 34 40 Z" fill="url(#wh_skin)" />

            {/* Soft Lavender Hair */}
            <path d="M32 38 C34 26 44 24 50 24 C56 24 66 26 68 38 C60 30 54 30 50 33 C46 30 40 30 32 38 Z" fill="#c084fc" />

            {/* Wizard Pointed Hat with Golden Star */}
            <ellipse cx="50" cy="30" rx="34" ry="7" fill="#4c1d95" stroke="#a78bfa" strokeWidth="1" />
            <path d="M30 28 L50 6 L70 28 Z" fill="#581c87" />
            <path d="M32 26 Q50 30 68 26 L68 29 Q50 33 32 29 Z" fill="#fde047" />
            <path d="M50 10 L52 7 L54 10 L57 11 L54 12 L52 15 L50 12 L47 11 Z" fill="#fef08a" />

            {/* Mystic Violet Eyes */}
            <ellipse cx="42" cy="44" rx="3" ry="4" fill="#6b21a8" />
            <ellipse cx="58" cy="44" rx="3" ry="4" fill="#6b21a8" />
            <circle cx="43" cy="42.5" r="1.3" fill="#ffffff" />
            <circle cx="59" cy="42.5" r="1.3" fill="#ffffff" />

            {/* Gentle Smile & Wand Sparkle */}
            <path d="M46 54 Q50 57 54 54" stroke="#7e22ce" strokeWidth="1.8" strokeLinecap="round" fill="none" />
            <path d="M72 48 L74 44 L76 48 L80 49 L76 50 L74 54 L72 50 L68 49 Z" fill="#facc15" />
        </svg>
    );
}

// 5) 우주비행사 준 - 스페이스 에이스 (우주 헬멧, 네온 바이저, 탐험가 눈빛)
function SpaceJunAvatar({ size = 52 }) {
    return (
        <svg width={size} height={size} viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
            <defs>
                <linearGradient id="sj_bg" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#083344" />
                    <stop offset="100%" stopColor="#0284c7" />
                </linearGradient>
                <linearGradient id="sj_visor" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#22d3ee" />
                    <stop offset="100%" stopColor="#0369a1" />
                </linearGradient>
                <linearGradient id="sj_suit" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#f8fafc" />
                    <stop offset="100%" stopColor="#cbd5e1" />
                </linearGradient>
            </defs>
            <circle cx="50" cy="50" r="48" fill="url(#sj_bg)" stroke="#38bdf8" strokeWidth="2.5" />

            {/* Astronaut Space Suit */}
            <path d="M22 94 C26 72 36 68 50 68 C64 68 74 72 78 94 Z" fill="url(#sj_suit)" stroke="#94a3b8" strokeWidth="1.5" />
            <rect x="42" y="74" width="16" height="12" rx="3" fill="#0284c7" />
            <circle cx="46" cy="80" r="2" fill="#22c55e" />
            <circle cx="54" cy="80" r="2" fill="#ef4444" />

            {/* Outer Helmet */}
            <circle cx="50" cy="40" r="26" fill="#f1f5f9" stroke="#94a3b8" strokeWidth="2" />
            
            {/* Antenna */}
            <line x1="50" y1="14" x2="50" y2="6" stroke="#94a3b8" strokeWidth="2.5" strokeLinecap="round" />
            <circle cx="50" cy="5" r="3" fill="#ef4444" />

            {/* Glossy Curved Visor with Twinkling Star Reflection */}
            <rect x="32" y="28" width="36" height="24" rx="10" fill="url(#sj_visor)" stroke="#0ea5e9" strokeWidth="1.5" />
            <ellipse cx="44" cy="34" rx="8" ry="3" fill="#ffffff" opacity="0.6" transform="rotate(-15 44 34)" />
            <path d="M58 40 L59 37 L60 40 L63 41 L60 42 L59 45 L58 42 L55 41 Z" fill="#ffffff" opacity="0.8" />
        </svg>
    );
}

// 6) 비트메이커 지오 - 스트리트 힙스터 (스냅백, 헤드폰, 쿨한 스트리트 후디)
function BeatmakerGioAvatar({ size = 52 }) {
    return (
        <svg width={size} height={size} viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
            <defs>
                <linearGradient id="bg_bg" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#064e3b" />
                    <stop offset="100%" stopColor="#059669" />
                </linearGradient>
                <linearGradient id="bg_skin" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#fed7aa" />
                    <stop offset="100%" stopColor="#fba76b" />
                </linearGradient>
                <linearGradient id="bg_hoodie" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#10b981" />
                    <stop offset="100%" stopColor="#047857" />
                </linearGradient>
            </defs>
            <circle cx="50" cy="50" r="48" fill="url(#bg_bg)" stroke="#34d399" strokeWidth="2.5" />

            {/* Street Hoodie */}
            <path d="M22 94 C26 72 36 68 50 68 C64 68 74 72 78 94 Z" fill="url(#bg_hoodie)" />
            <path d="M42 68 L50 82 L58 68 Z" fill="#18181b" />

            {/* DJ Headphones on Neck */}
            <path d="M30 64 C30 56 70 56 70 64" stroke="#e2e8f0" strokeWidth="4" strokeLinecap="round" fill="none" />
            <rect x="25" y="60" width="10" height="14" rx="4" fill="#f59e0b" />
            <rect x="65" y="60" width="10" height="14" rx="4" fill="#f59e0b" />

            {/* Face & Neck */}
            <rect x="44" y="54" width="12" height="14" rx="3" fill="#fba76b" />
            <path d="M34 38 C34 26 66 26 66 38 C66 54 62 62 50 62 C38 62 34 54 34 38 Z" fill="url(#bg_skin)" />

            {/* Backwards Snapback Cap */}
            <ellipse cx="50" cy="28" rx="20" ry="14" fill="#6366f1" />
            <rect x="36" y="24" width="28" height="6" rx="2" fill="#4338ca" />
            <rect x="44" y="24" width="12" height="3" rx="1" fill="#facc15" />

            {/* Cool Eyes & Confident Grin */}
            <ellipse cx="42" cy="44" rx="3" ry="3.5" fill="#0f172a" />
            <circle cx="43" cy="42.5" r="1.2" fill="#ffffff" />
            <ellipse cx="58" cy="44" rx="3" ry="3.5" fill="#0f172a" />
            <circle cx="59" cy="42.5" r="1.2" fill="#ffffff" />
            <path d="M45 53 Q50 58 56 53" stroke="#047857" strokeWidth="2" strokeLinecap="round" fill="none" />
        </svg>
    );
}

// 7) 상단 헤더 진행 MC: 퀴즈 마스터 조이 (Quiz Master Joy)
function McJoyAvatar({ size = 46 }) {
    return (
        <svg width={size} height={size} viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
            <defs>
                <linearGradient id="mj_bg" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#312e81" />
                    <stop offset="100%" stopColor="#4338ca" />
                </linearGradient>
                <linearGradient id="mj_skin" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#fff5eb" />
                    <stop offset="100%" stopColor="#fed7aa" />
                </linearGradient>
            </defs>
            <circle cx="50" cy="50" r="48" fill="url(#mj_bg)" stroke="#a5b4fc" strokeWidth="2.5" />

            {/* Star Master Suit & Bowtie */}
            <path d="M24 94 C28 72 38 68 50 68 C62 68 72 72 76 94 Z" fill="#1e1b4b" />
            <path d="M42 68 L50 82 L58 68 Z" fill="#ffffff" />
            <path d="M44 72 L56 72 L50 78 Z" fill="#fbbf24" />

            {/* Face & Neck */}
            <rect x="44" y="56" width="12" height="14" rx="3" fill="#fed7aa" />
            <path d="M34 40 C34 26 66 26 66 40 C66 54 62 62 50 62 C38 62 34 54 34 40 Z" fill="url(#mj_skin)" />

            {/* Neat Wavy Hair */}
            <path d="M32 36 C34 24 46 22 50 22 C62 22 68 26 68 36 C60 28 52 28 50 32 C44 28 36 28 32 36 Z" fill="#451a03" />

            {/* Golden Star Hairpin */}
            <path d="M66 26 L67 22 L69 26 L73 27 L69 28 L67 32 L66 28 L62 27 Z" fill="#fde047" />

            {/* Sparkling Anime Eyes */}
            <ellipse cx="42" cy="43" rx="3.5" ry="4" fill="#1e1b4b" />
            <ellipse cx="58" cy="43" rx="3.5" ry="4" fill="#1e1b4b" />
            <circle cx="43" cy="41.5" r="1.4" fill="#ffffff" />
            <circle cx="59" cy="41.5" r="1.4" fill="#ffffff" />

            {/* Soft Coral Blush */}
            <ellipse cx="38" cy="48" rx="3" ry="1.5" fill="#f43f5e" opacity="0.5" />
            <ellipse cx="62" cy="48" rx="3" ry="1.5" fill="#f43f5e" opacity="0.5" />

            {/* Bright Smile */}
            <path d="M46 53 Q50 57 54 53" stroke="#e11d48" strokeWidth="2" strokeLinecap="round" fill="none" />

            {/* Glowing Golden Star Card */}
            <rect x="68" y="56" width="16" height="24" rx="3" transform="rotate(-15 68 56)" fill="#fef08a" stroke="#d97706" strokeWidth="1.5" />
            <text x="73" y="73" fontSize="11" fill="#d97706" transform="rotate(-15 68 56)" fontWeight="bold">⭐</text>
        </svg>
    );
}

// Character Avatar Switcher
function CharacterAvatar({ charId, size = 52 }) {
    switch (charId) {
        case 'detective_minwoo':
            return <DetectiveMinwooAvatar size={size} />;
        case 'idol_luna':
            return <IdolLunaAvatar size={size} />;
        case 'sporty_chan':
            return <SportyChanAvatar size={size} />;
        case 'wizard_harin':
            return <WizardHarinAvatar size={size} />;
        case 'space_jun':
            return <SpaceJunAvatar size={size} />;
        case 'beatmaker_gio':
            return <BeatmakerGioAvatar size={size} />;
        default:
            return <DetectiveMinwooAvatar size={size} />;
    }
}

// Student Character Master List
const STUDENT_CHARACTERS = [
    { id: 'detective_minwoo', name: '명탐정 민우', title: '두뇌파 에이스', color: '#3b82f6', ring: '#60a5fa' },
    { id: 'idol_luna', name: '아이돌 루나', title: 'K-POP 요정', color: '#ec4899', ring: '#f472b6' },
    { id: 'sporty_chan', name: '에너지 찬', title: '열정 캡틴', color: '#f97316', ring: '#fb923c' },
    { id: 'wizard_harin', name: '마법사 하린', title: '별빛 위저드', color: '#8b5cf6', ring: '#a78bfa' },
    { id: 'space_jun', name: '우주비행사 준', title: '스페이스 에이스', color: '#06b6d4', ring: '#22d3ee' },
    { id: 'beatmaker_gio', name: '비트메이커 지오', title: '스트리트 힙스터', color: '#10b981', ring: '#34d399' }
];

// Card suits and colors (Clean & Modern)
const SUITS = [
    { symbol: '♠', name: '스페이드', color: '#1e293b' },
    { symbol: '♥', name: '하트', color: '#dc2626' },
    { symbol: '♦', name: '다이아', color: '#ea580c' },
    { symbol: '♣', name: '클로버', color: '#059669' }
];

// ==========================================
// 2. Ultra-Simple Student Friendly Rules
// 규칙: 두 카드의 숫자 합산이 높으면 승리! (최대 19점)
// 보너스: 같은 숫자가 나오면 '럭키 페어(쌍둥이 카드)' 발동! (점수 배수 획득!)
// ==========================================
function evaluateHand(c1, c2) {
    if (!c1 || !c2) return { score: 0, text: '', isPair: false, multiplier: 1, sum: 0 };

    const v1 = c1.val;
    const v2 = c2.val;
    const sum = v1 + v2;
    const maxCard = Math.max(v1, v2);

    // 1. 럭키 페어 (쌍둥이 카드: 같은 숫자 2장!)
    if (v1 === v2) {
        if (v1 === 10) {
            return {
                score: 1000,
                text: '10 럭키 페어 (슈퍼 쌍둥이)',
                subText: '최고의 행운! 보너스 3배!',
                isPair: true,
                multiplier: 3,
                sum,
                color: '#f59e0b',
                badgeText: '🌟 10 페어 (3배)'
            };
        }
        const mult = v1 >= 7 ? 2 : 1.5;
        return {
            score: 500 + v1 * 10,
            text: `${v1} 럭키 페어 (쌍둥이)`,
            subText: `쌍둥이 카드 성공! 보너스 ${mult}배!`,
            isPair: true,
            multiplier: mult,
            sum,
            color: '#ec4899',
            badgeText: `✨ ${v1} 페어 (${mult}배)`
        };
    }

    // 2. 숫자 합산 배틀 (두 카드 숫자의 합: 2 ~ 19)
    // 점수 계산: sum * 10 + 단일 최고 카드 * 0.1 (동점 시 더 큰 숫자를 가진 쪽 승리)
    const score = sum * 10 + maxCard * 0.1;

    let gradeText = `합 ${sum}점`;
    let sub = `숫자 합산: ${v1} + ${v2} = ${sum}점`;
    let color = '#38bdf8';

    if (sum >= 17) {
        gradeText = `🌟 최고 합산 ${sum}점!`;
        sub = `초고득점 파워! (${v1} + ${v2})`;
        color = '#10b981';
    } else if (sum >= 13) {
        gradeText = `✨ 높은 합산 ${sum}점`;
        sub = `안정적인 상위권! (${v1} + ${v2})`;
        color = '#38bdf8';
    } else if (sum <= 6) {
        gradeText = `아쉬운 합산 ${sum}점`;
        sub = `다음 판에 대역전 찬스! (${v1} + ${v2})`;
        color = '#94a3b8';
    }

    return {
        score,
        text: gradeText,
        subText: sub,
        isPair: false,
        multiplier: 1,
        sum,
        color,
        badgeText: `합 ${sum}점`
    };
}

// Student Friendly TTS Announcer
function speakGameLine(text) {
    if (typeof window === 'undefined' || !window.speechSynthesis) return;
    try {
        window.speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = 'ko-KR';
        utterance.rate = 1.12;
        utterance.pitch = 1.15;
        window.speechSynthesis.speak(utterance);
    } catch (e) {}
}

// Quiz Master Cheering Quotes (Positive & Educational)
const MC_QUOTES = [
    '친구들 모두 반가워요! 행운을 빌어요! ⭐',
    '어떤 높은 카드가 숨어있을까요?',
    '더블 챌린지로 멋진 역전을 노려보세요!',
    '높은 숫자가 나오길 모두 함께 응원해요!',
    '함께 즐기는 신나는 럭키 카드 배틀!'
];

export default function CardGame({ socket }) {
    const navigate = useNavigate();
    const location = useLocation();
    const { scores: globalScores, adjustScore, participantCount } = useGlobalSession();

    // Helper to get real-time cumulative score of player
    const getPlayerGlobalScore = (playerNum) => {
        const found = globalScores?.find(s => s.num === playerNum);
        return found ? found.score : 0;
    };

    // Subscreen detection
    const isSubScreen = Boolean(
        location.pathname.startsWith('/screen') ||
        location.search.includes('subscreen=true') ||
        window.name === 'QuizrunSubScreenWindow' ||
        window.name === 'QuizrunScreenWindow' ||
        sessionStorage.getItem('is_subscreen') === 'true'
    );

    // Number of players (dynamically determined from participantCount or globalScores.length, default 4, min 2, max 6)
    const activePlayerCount = Math.max(
        2,
        Math.min(6, (participantCount && participantCount > 0) ? participantCount : (globalScores?.length || 4))
    );

    // Initial state loader from LocalStorage
    const getSavedState = (targetCount) => {
        try {
            const raw = localStorage.getItem('quizrun_cardgame_state');
            if (raw) {
                const parsed = JSON.parse(raw);
                const age = Date.now() - (parsed.updatedAt || 0);
                if (age < 60 * 1000 && parsed && Array.isArray(parsed.players) && parsed.players.length === targetCount && parsed.phase !== 'result') {
                    return parsed;
                }
            }
        } catch (e) {}
        return null;
    };

    const initialData = getSavedState(activePlayerCount);

    // Game States
    const [baseBet, setBaseBet] = useState(initialData?.baseBet ?? 10);
    const [currentBet, setCurrentBet] = useState(initialData?.currentBet ?? 10);
    const [pot, setPot] = useState(initialData?.pot ?? 0);
    const [phase, setPhase] = useState(() => (initialData?.phase === 'result' ? 'result' : 'betting')); // 'betting' | 'result'
    const [players, setPlayers] = useState(initialData?.players ?? []);
    const [winner, setWinner] = useState(initialData?.winner ?? null);
    const [voiceEnabled, setVoiceEnabled] = useState(true);
    const [roundCount, setRoundCount] = useState(initialData?.roundCount ?? 1);
    const [showConfetti, setShowConfetti] = useState(initialData?.showConfetti ?? false);
    const [scoreApplied, setScoreApplied] = useState(false);

    // Dealing animation trigger flag (1 second visual effect)
    const [isDealingAnimation, setIsDealingAnimation] = useState(false);

    // MC quotes state
    const [mcQuoteIdx, setMcQuoteIdx] = useState(0);

    const channelRef = useRef(null);
    const gameStateRef = useRef({
        phase,
        players,
        pot,
        baseBet,
        currentBet,
        winner,
        roundCount,
        showConfetti,
        scoreApplied
    });

    // Update gameStateRef on every state change & save to localStorage (Leader only)
    useEffect(() => {
        gameStateRef.current = {
            phase,
            players,
            pot,
            baseBet,
            currentBet,
            winner,
            roundCount,
            showConfetti,
            scoreApplied
        };

        if (!isSubScreen && players.length > 0) {
            try {
                localStorage.setItem('quizrun_cardgame_state', JSON.stringify({
                    phase,
                    players,
                    pot,
                    baseBet,
                    currentBet,
                    winner,
                    roundCount,
                    showConfetti,
                    scoreApplied,
                    updatedAt: Date.now()
                }));
            } catch (e) {}
        }
    }, [phase, players, pot, baseBet, currentBet, winner, roundCount, showConfetti, scoreApplied, isSubScreen]);

    // 1. Leader-Follower Navigation Sync Setup
    useEffect(() => {
        if (!isSubScreen) {
            try {
                const navBc = new BroadcastChannel('quizrun_nav_sync');
                navBc.postMessage({ type: 'NAV_CHANGE', path: '/card-game?subscreen=true' });
                setTimeout(() => navBc.close(), 400);
            } catch (e) {}

            try {
                const scrBc = new BroadcastChannel('quizrun_screen_sync');
                scrBc.postMessage({ type: 'MODE_CHANGE', payload: { mode: 'card_game' } });
                setTimeout(() => scrBc.close(), 400);
            } catch (e) {}
        }
    }, [isSubScreen]);

    // 2. Real-time Game State BroadcastChannel & Multi-monitor Synchronization (Bi-directional)
    useEffect(() => {
        let channel;
        try {
            channel = new BroadcastChannel('quizrun_cardgame_sync');
            channelRef.current = channel;

            channel.onmessage = (e) => {
                const { type, payload } = e.data || {};
                if (type === 'CARD_GAME_SYNC' && payload) {
                    if (payload.phase !== undefined) setPhase(payload.phase);
                    if (payload.players !== undefined) setPlayers(payload.players);
                    if (payload.pot !== undefined) setPot(payload.pot);
                    if (payload.baseBet !== undefined) setBaseBet(payload.baseBet);
                    if (payload.currentBet !== undefined) setCurrentBet(payload.currentBet);
                    if (payload.winner !== undefined) setWinner(payload.winner);
                    if (payload.roundCount !== undefined) setRoundCount(payload.roundCount);
                    if (payload.showConfetti !== undefined) setShowConfetti(payload.showConfetti);
                    if (payload.scoreApplied !== undefined) setScoreApplied(payload.scoreApplied);
                    if (payload.isDealingAnimation !== undefined) setIsDealingAnimation(payload.isDealingAnimation);
                    if (payload.voiceLine && voiceEnabled) {
                        speakGameLine(payload.voiceLine);
                    }
                } else if (type === 'REQUEST_CARDGAME_SYNC') {
                    broadcastGameState();
                } else if (type === 'REQUEST_NEW_ROUND') {
                    startNewRound();
                }
            };

            if (isSubScreen) {
                channel.postMessage({ type: 'REQUEST_CARDGAME_SYNC' });
            }

            return () => {
                if (channel) channel.close();
                if (window.speechSynthesis) window.speechSynthesis.cancel();
            };
        } catch (e) {}
    }, [isSubScreen, voiceEnabled]);

    // Safety timer: Ensure dealing animation is never stuck
    useEffect(() => {
        if (isDealingAnimation) {
            const timer = setTimeout(() => {
                setIsDealingAnimation(false);
            }, 1200);
            return () => clearTimeout(timer);
        }
    }, [isDealingAnimation]);

    // Subscreen backup polling
    useEffect(() => {
        if (!isSubScreen) return;
        if (players.length > 0) return;

        const interval = setInterval(() => {
            const saved = getSavedState(activePlayerCount);
            if (saved && saved.players && saved.players.length === activePlayerCount) {
                setPhase(saved.phase === 'result' ? 'result' : 'betting');
                setPlayers(saved.players);
                setPot(saved.pot);
                setBaseBet(saved.baseBet);
                setWinner(saved.winner);
                setRoundCount(saved.roundCount);
                setShowConfetti(saved.showConfetti || false);
                setScoreApplied(saved.scoreApplied || false);
                setIsDealingAnimation(false);
                clearInterval(interval);
            } else if (channelRef.current) {
                channelRef.current.postMessage({ type: 'REQUEST_CARDGAME_SYNC' });
            }
        }, 500);

        return () => clearInterval(interval);
    }, [isSubScreen, players.length, activePlayerCount]);

    const broadcastGameState = (overrides = {}, voiceLine = null) => {
        const fullPayload = {
            ...gameStateRef.current,
            ...overrides,
            voiceLine
        };

        if (!isSubScreen) {
            try {
                localStorage.setItem('quizrun_cardgame_state', JSON.stringify({
                    phase: fullPayload.phase,
                    players: fullPayload.players,
                    pot: fullPayload.pot,
                    baseBet: fullPayload.baseBet,
                    winner: fullPayload.winner,
                    roundCount: fullPayload.roundCount,
                    showConfetti: fullPayload.showConfetti,
                    scoreApplied: fullPayload.scoreApplied,
                    updatedAt: Date.now()
                }));
            } catch (e) {}
        }

        if (channelRef.current) {
            try {
                channelRef.current.postMessage({
                    type: 'CARD_GAME_SYNC',
                    payload: fullPayload
                });
            } catch (e) {}
        }
    };

    // Deal Deck: Standard 40 cards (1~10 across all 4 suits) with True Random Knuth Shuffle
    const createDeck = () => {
        const deck = [];
        for (const suit of SUITS) {
            for (let num = 1; num <= 10; num++) {
                deck.push({ val: num, suit });
            }
        }
        for (let i = deck.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            const temp = deck[i];
            deck[i] = deck[j];
            deck[j] = temp;
        }
        const cut = Math.floor(Math.random() * 20) + 10;
        const cutDeck = [...deck.slice(cut), ...deck.slice(0, cut)];
        for (let i = cutDeck.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            const temp = cutDeck[i];
            cutDeck[i] = cutDeck[j];
            cutDeck[j] = temp;
        }
        return cutDeck;
    };

    const isStartingRoundRef = useRef(false);

    // Initialize or Start New Round with Dealing Animation & Real-time Cumulative Score Deductions
    const startNewRound = (customCount) => {
        if (isStartingRoundRef.current) return;
        isStartingRoundRef.current = true;

        const targetCount = (typeof customCount === 'number' && customCount > 0)
            ? customCount
            : activePlayerCount;

        playSound('step');
        const deck = createDeck();
        const initialPlayers = [];
        let totalInitialPot = 0;

        for (let i = 0; i < targetCount; i++) {
            const card1 = deck.pop(); // Random Face-up card
            const card2 = deck.pop(); // Random Face-down card
            const num = i + 1;
            const charData = STUDENT_CHARACTERS[i % STUDENT_CHARACTERS.length];

            // Deduct base ante from each player's real-time cumulative score
            if (adjustScore) {
                adjustScore(num, -baseBet);
            }

            initialPlayers.push({
                num,
                name: `${num}번 ${charData.name}`,
                charId: charData.id,
                title: charData.title,
                color: charData.color,
                ring: charData.ring,
                card1,
                card2,
                isRevealed: false,
                isFolded: false,
                bet: baseBet,
                actionText: '기본 도전 (-10)',
                evalResult: evaluateHand(card1, card2)
            });
            totalInitialPot += baseBet;
        }

        setPhase('betting');
        setIsDealingAnimation(true);
        setPlayers(initialPlayers);
        setPot(totalInitialPot);
        setCurrentBet(baseBet);
        setWinner(null);
        setShowConfetti(false);
        setScoreApplied(false);

        const dealVoice = `${roundCount}번째 라운드 시작! ${targetCount}명의 친구들에게 행운의 카드를 나눠줍니다!`;
        if (voiceEnabled) speakGameLine(dealVoice);

        broadcastGameState({
            phase: 'betting',
            isDealingAnimation: true,
            players: initialPlayers,
            pot: totalInitialPot,
            baseBet,
            currentBet: baseBet,
            winner: null,
            showConfetti: false,
            scoreApplied: false
        }, dealVoice);

        setTimeout(() => {
            playSound('reveal');
            setIsDealingAnimation(false);
            isStartingRoundRef.current = false;
            broadcastGameState({
                phase: 'betting',
                isDealingAnimation: false
            });
        }, 1000);
    };

    const triggerNewRound = () => {
        if (!isSubScreen) {
            startNewRound();
        } else {
            if (channelRef.current) {
                channelRef.current.postMessage({ type: 'REQUEST_NEW_ROUND' });
            }
            startNewRound();
        }
    };

    const lastPlayerCountRef = useRef(activePlayerCount);
    const hasStartedInitialRef = useRef(false);

    useEffect(() => {
        if (!isSubScreen) {
            if (!hasStartedInitialRef.current) {
                hasStartedInitialRef.current = true;
                if (!initialData || players.length === 0 || players.length !== activePlayerCount) {
                    startNewRound(activePlayerCount);
                }
            } else if (activePlayerCount !== lastPlayerCountRef.current) {
                lastPlayerCountRef.current = activePlayerCount;
                startNewRound(activePlayerCount);
            }
        }
    }, [activePlayerCount, isSubScreen]);

    // Handle Player Action: Standard Game B-rule (Call/Match or Fold/Pass or Raise)
    const handlePlayerAction = (playerNum, actionType) => {
        if (phase !== 'betting') return;

        let addedPot = 0;
        let actionVoice = '';
        let nextCurrentBet = currentBet;

        // If action is raise
        if (actionType === 'raise_double') {
            nextCurrentBet = currentBet + 20;
            setCurrentBet(nextCurrentBet);
        } else if (actionType === 'raise_super') {
            nextCurrentBet = currentBet + 50;
            setCurrentBet(nextCurrentBet);
        }

        const nextPlayers = players.map(p => {
            if (p.num !== playerNum) return p;

            if (actionType === 'fold' || actionType === 'pass') {
                actionVoice = `${p.num}번 친구, 안전하게 패스하여 점수를 지켰습니다!`;
                return { ...p, isFolded: true, actionText: '🛡️ 패스 (보호)' };
            } else if (actionType === 'raise_double') {
                const diff = nextCurrentBet - p.bet;
                addedPot += diff;
                if (adjustScore) adjustScore(p.num, -diff);
                actionVoice = `${p.num}번 친구가 기준을 더블(${nextCurrentBet}점)로 상향했습니다!`;
                return { ...p, bet: nextCurrentBet, actionText: `🔥 더블 (${nextCurrentBet}점)` };
            } else if (actionType === 'raise_super') {
                const diff = nextCurrentBet - p.bet;
                addedPot += diff;
                if (adjustScore) adjustScore(p.num, -diff);
                actionVoice = `${p.num}번 친구가 슈퍼 ${nextCurrentBet}점으로 승부수를 던졌습니다!`;
                return { ...p, bet: nextCurrentBet, actionText: `⚡ 슈퍼 (${nextCurrentBet}점)` };
            } else {
                // match / call
                const diff = Math.max(0, currentBet - p.bet);
                addedPot += diff;
                if (adjustScore && diff > 0) adjustScore(p.num, -diff);
                actionVoice = `${p.num}번 친구, ${currentBet}점 도전 수락!`;
                return { ...p, bet: currentBet, actionText: `✅ 수락 (${currentBet}점)` };
            }
        });

        const nextPot = pot + addedPot;
        setPlayers(nextPlayers);
        setPot(nextPot);
        playSound('submit');

        if (voiceEnabled && actionVoice) speakGameLine(actionVoice);
        broadcastGameState({ players: nextPlayers, pot: nextPot, currentBet: nextCurrentBet }, actionVoice);
    };

    // Fast Batch Action: All Active Players Match the Current Highest Bet
    const handleAllMatch = () => {
        if (phase !== 'betting') return;
        let addTotal = 0;
        const nextPlayers = players.map(p => {
            if (p.isFolded) return p;
            const diff = Math.max(0, currentBet - p.bet);
            if (diff > 0) {
                addTotal += diff;
                if (adjustScore) adjustScore(p.num, -diff);
            }
            return { ...p, bet: currentBet, actionText: `✅ 수락 (${currentBet}점)` };
        });
        const nextPot = pot + addTotal;
        setPlayers(nextPlayers);
        setPot(nextPot);
        playSound('submit');
        const voice = `친구들 전원 ${currentBet}점으로 수락 완료! 쇼다운 준비!`;
        if (voiceEnabled) speakGameLine(voice);
        broadcastGameState({ players: nextPlayers, pot: nextPot, currentBet }, voice);
    };

    // Showdown: Reveal Secret Card!
    const handleShowdown = () => {
        if (phase !== 'betting') return;

        playSound('reveal');

        const revealedPlayers = players.map(p => ({
            ...p,
            isRevealed: true
        }));

        const activePlayers = revealedPlayers.filter(p => !p.isFolded);

        if (activePlayers.length === 0) {
            setPhase('result');
            return;
        }

        // Sort by rank score descending (Pair > High Sum)
        activePlayers.sort((a, b) => b.evalResult.score - a.evalResult.score);
        const winPlayer = activePlayers[0];

        // Multiplier bonus: Winner gets pot * multiplier
        const multiplier = winPlayer.evalResult.multiplier || 1;
        const finalWonPoints = Math.round(pot * multiplier);

        const winData = {
            ...winPlayer,
            wonPoints: finalWonPoints,
            multiplier: multiplier
        };

        setPlayers(revealedPlayers);
        setWinner(winData);
        setPhase('result');
        setShowConfetti(true);
        setRoundCount(prev => prev + 1);
        setScoreApplied(false);

        // Voice Announcer
        let winVoice = '';
        if (winPlayer.evalResult.isPair) {
            if (winPlayer.evalResult.multiplier === 3) {
                winVoice = `대박! 10 슈퍼 페어 탄생! ${winPlayer.num}번 친구가 3배 보너스로 최고 챔피언이 되었습니다!`;
            } else {
                winVoice = `축하합니다! ${winPlayer.evalResult.text}! ${winPlayer.num}번 친구가 ${winPlayer.evalResult.multiplier}배 보너스 획득!`;
            }
        } else if (winPlayer.evalResult.sum >= 17) {
            winVoice = `와! 숫자 합 ${winPlayer.evalResult.sum}점 초고득점! ${winPlayer.num}번 친구가 이번 라운드 우승을 차지했습니다!`;
        } else {
            winVoice = `축하합니다! ${winPlayer.num}번 친구가 총합 ${winPlayer.evalResult.sum}점으로 승리했습니다!`;
        }

        if (voiceEnabled) speakGameLine(winVoice);

        broadcastGameState({
            phase: 'result',
            players: revealedPlayers,
            winner: winData,
            showConfetti: true,
            roundCount: roundCount + 1,
            scoreApplied: false
        }, winVoice);
    };

    // Apply won points directly to global session cumulative scoreboard
    const handleApplyScore = () => {
        if (winner && adjustScore && !scoreApplied) {
            adjustScore(winner.num, winner.wonPoints);
            playSound('fanfare');
            setScoreApplied(true);
            const voice = `${winner.num}번 승리 친구에게 ${winner.wonPoints.toLocaleString()}점이 누적 점수판에 지급되었습니다!`;
            if (voiceEnabled) speakGameLine(voice);

            broadcastGameState({
                scoreApplied: true
            }, voice);
        }
    };

    // MC interaction
    const handleDealerClick = () => {
        playSound('step');
        const nextIdx = (mcQuoteIdx + 1) % MC_QUOTES.length;
        setMcQuoteIdx(nextIdx);
        const quote = MC_QUOTES[nextIdx];
        if (voiceEnabled) speakGameLine(quote);
    };

    const currentMcQuote = MC_QUOTES[mcQuoteIdx];

    return (
        <div style={{
            minHeight: '100vh',
            width: '100%',
            background: 'radial-gradient(ellipse at center, #1e1b4b 0%, #0f172a 60%, #020617 100%)',
            color: '#f8fafc',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            padding: '12px 18px',
            boxSizing: 'border-box',
            fontFamily: 'system-ui, -apple-system, sans-serif',
            position: 'relative',
            overflowX: 'hidden'
        }}>
            {showConfetti && <Confetti numberOfPieces={160} recycle={false} />}

            {/* Top Navigation & Controls */}
            <header style={{
                width: '100%',
                maxWidth: '1280px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: '12px',
                zIndex: 40
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <button
                        onClick={() => navigate('/')}
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px',
                            background: 'rgba(255, 255, 255, 0.1)',
                            border: '1.5px solid rgba(255, 255, 255, 0.2)',
                            color: 'white',
                            padding: '8px 16px',
                            borderRadius: '14px',
                            fontSize: '0.92rem',
                            fontWeight: '800',
                            cursor: 'pointer',
                            backdropFilter: 'blur(8px)',
                            transition: 'all 0.2s'
                        }}
                    >
                        <ArrowLeft size={16} /> 홈으로
                    </button>
                    <button
                        onClick={triggerNewRound}
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px',
                            background: 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)',
                            border: '1.5px solid #93c5fd',
                            color: 'white',
                            padding: '8px 16px',
                            borderRadius: '14px',
                            fontSize: '0.92rem',
                            fontWeight: '900',
                            cursor: 'pointer',
                            boxShadow: '0 3px 12px rgba(59, 130, 246, 0.4)',
                            transition: 'all 0.2s'
                        }}
                        title="새로운 카드를 무작위로 섞어 새 라운드를 시작합니다."
                    >
                        <RotateCcw size={16} /> 새 라운드 시작
                    </button>
                </div>

                {/* Game Title with Student Friendly Badge */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <div style={{
                        background: 'linear-gradient(135deg, #3b82f6, #1d4ed8)',
                        color: 'white',
                        padding: '4px 10px',
                        borderRadius: '10px',
                        fontWeight: '900',
                        fontSize: '0.85rem',
                        boxShadow: '0 2px 8px rgba(59, 130, 246, 0.4)',
                        border: '1px solid #93c5fd'
                    }}>
                        학생 친화 모드
                    </div>
                    <h1 style={{
                        fontSize: '1.85rem',
                        fontWeight: '900',
                        margin: 0,
                        background: 'linear-gradient(135deg, #ffffff, #93c5fd, #60a5fa)',
                        WebkitBackgroundClip: 'text',
                        WebkitTextFillColor: 'transparent',
                        textShadow: '0 2px 10px rgba(0,0,0,0.5)',
                        letterSpacing: '-0.5px'
                    }}>
                        ⭐ 럭키 카드 배틀 (숫자 합산 & 럭키 페어)
                    </h1>
                </div>

                {/* Right Settings: MC Character + Voice Toggle */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    
                    {/* Quiz Master MC Character */}
                    <div 
                        onClick={handleDealerClick}
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            background: 'linear-gradient(135deg, rgba(30, 27, 75, 0.85) 0%, rgba(67, 56, 202, 0.8) 100%)',
                            border: '2px solid #a5b4fc',
                            padding: '4px 12px 4px 6px',
                            borderRadius: '30px',
                            boxShadow: '0 4px 15px rgba(99, 102, 241, 0.35)',
                            cursor: 'pointer',
                            transition: 'all 0.2s ease',
                            userSelect: 'none'
                        }}
                        title="친절한 퀴즈 마스터 조이! 클릭하면 따뜻한 응원의 한마디를 해줍니다."
                    >
                        <McJoyAvatar size={42} />
                        <div style={{ textAlign: 'left' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                <span style={{ fontSize: '0.7rem', background: '#4f46e5', color: '#fff', padding: '1px 5px', borderRadius: '6px', fontWeight: '900' }}>
                                    진행 MC
                                </span>
                                <span style={{ fontSize: '0.85rem', fontWeight: '900', color: '#e0e7ff' }}>
                                    마스터 조이
                                </span>
                            </div>
                            <div style={{ fontSize: '0.74rem', color: '#c7d2fe', fontWeight: '700', marginTop: '1px', maxWidth: '170px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                "{currentMcQuote}"
                            </div>
                        </div>
                    </div>

                    <button
                        onClick={() => {
                            setVoiceEnabled(!voiceEnabled);
                            if (voiceEnabled && window.speechSynthesis) window.speechSynthesis.cancel();
                        }}
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px',
                            background: voiceEnabled ? 'rgba(16, 185, 129, 0.25)' : 'rgba(239, 68, 68, 0.25)',
                            border: `1.5px solid ${voiceEnabled ? '#10b981' : '#ef4444'}`,
                            color: voiceEnabled ? '#6ee7b7' : '#fca5a5',
                            padding: '6px 14px',
                            borderRadius: '12px',
                            fontWeight: '800',
                            fontSize: '0.85rem',
                            cursor: 'pointer'
                        }}
                    >
                        {voiceEnabled ? <Volume2 size={16} /> : <VolumeX size={16} />}
                        {voiceEnabled ? '음성 ON' : '음성 OFF'}
                    </button>

                    {isSubScreen && (
                        <span style={{ fontSize: '0.85rem', color: '#38bdf8', background: 'rgba(56,189,248,0.2)', border: '1px solid rgba(56,189,248,0.4)', padding: '6px 12px', borderRadius: '12px', fontWeight: '800' }}>
                            🖥️ 서브 모니터 (동기화 완료)
                        </span>
                    )}
                </div>
            </header>

            {/* Central Modern Arena Table Canvas */}
            <div style={{
                position: 'relative',
                width: '100%',
                maxWidth: '1240px',
                height: 'min(700px, calc(100vh - 165px))',
                minHeight: '520px',
                background: 'radial-gradient(circle at center, #1e293b 0%, #0f172a 70%, #020617 100%)',
                borderRadius: '45px',
                border: '6px solid #4338ca',
                boxShadow: 'inset 0 0 60px rgba(0,0,0,0.8), 0 20px 50px rgba(0,0,0,0.7), 0 0 35px rgba(99, 102, 241, 0.35)',
                overflow: 'hidden'
            }}>
                {/* Table Inner Glowing Dashed Ring */}
                <div style={{
                    position: 'absolute',
                    inset: '14px',
                    borderRadius: '35px',
                    border: '2px dashed rgba(129, 140, 248, 0.35)',
                    pointerEvents: 'none'
                }} />

                {/* --- CENTER TABLE AREA: BONUS STAR POINTS & OPEN CONTROLS (Compact HUD, zIndex: 10) --- */}
                <div style={{
                    position: 'absolute',
                    left: '50%',
                    top: '48%',
                    transform: 'translate(-50%, -50%)',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: '8px',
                    zIndex: 10,
                    pointerEvents: 'auto'
                }}>
                    {/* Round Bonus Star Points Banner */}
                    <div style={{
                        background: 'linear-gradient(135deg, rgba(30, 27, 75, 0.95) 0%, rgba(15, 23, 42, 0.95) 100%)',
                        border: '2px solid #6366f1',
                        padding: '8px 20px',
                        borderRadius: '20px',
                        boxShadow: '0 8px 30px rgba(0,0,0,0.7), 0 0 20px rgba(99, 102, 241, 0.3)',
                        textAlign: 'center',
                        backdropFilter: 'blur(10px)',
                        minWidth: '220px',
                        maxWidth: '280px'
                    }}>
                        <div style={{ fontSize: '0.78rem', color: '#c7d2fe', fontWeight: '800', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '5px' }}>
                            <Star size={15} color="#fbbf24" fill="#fbbf24" /> 라운드 챌린지 포인트
                        </div>
                        <div style={{ fontSize: '1.95rem', fontWeight: '900', color: '#fef08a', lineHeight: 1.1, marginTop: '2px', textShadow: '0 0 15px rgba(251,191,36,0.5)' }}>
                            {pot.toLocaleString()}점
                        </div>
                        <div style={{ fontSize: '0.74rem', color: '#67e8f9', fontWeight: '900', marginTop: '3px', background: 'rgba(6, 182, 212, 0.2)', padding: '2px 8px', borderRadius: '8px', border: '1px solid rgba(6, 182, 212, 0.4)' }}>
                            🎯 현재 판돈 기준: <strong>{currentBet}점</strong> (동일 매칭 승부)
                        </div>
                        {winner && winner.evalResult.isPair && (
                            <div style={{ fontSize: '0.76rem', color: '#f43f5e', fontWeight: '900', marginTop: '2px' }}>
                                ✨ {winner.evalResult.text} {winner.evalResult.multiplier}배: <span style={{ fontSize: '0.92rem', color: '#fef08a' }}>{winner.wonPoints.toLocaleString()}점!</span>
                            </div>
                        )}
                    </div>

                    {/* Dealing Phase Center Card Deck Animation */}
                    {isDealingAnimation ? (
                        <div style={{
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            gap: '6px',
                            animation: 'pulseGlow 1.5s infinite'
                        }}>
                            <div style={{
                                width: '52px',
                                height: '74px',
                                background: 'linear-gradient(145deg, #3b82f6 0%, #1d4ed8 100%)',
                                borderRadius: '8px',
                                border: '2px solid #93c5fd',
                                boxShadow: '0 8px 25px rgba(0,0,0,0.8), 0 0 15px rgba(147, 197, 253, 0.5)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                position: 'relative'
                            }}>
                                <span style={{ fontSize: '1.5rem', animation: 'spinDeck 2s linear infinite' }}>⭐</span>
                            </div>
                            <div style={{
                                background: 'rgba(0,0,0,0.7)',
                                padding: '3px 12px',
                                borderRadius: '12px',
                                color: '#93c5fd',
                                fontSize: '0.82rem',
                                fontWeight: '900'
                            }}>
                                ⭐ 행운의 카드 셔플 중...
                            </div>
                        </div>
                    ) : phase === 'betting' ? (
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px' }}>
                            <div style={{
                                background: 'rgba(0,0,0,0.7)',
                                border: '1px solid #38bdf8',
                                padding: '4px 14px',
                                borderRadius: '12px',
                                color: '#bae6fd',
                                fontSize: '0.82rem',
                                fontWeight: '800'
                            }}>
                                1장 공개 중! 기준({currentBet}점)을 맞추거나 패스하세요
                            </div>

                            <div style={{ display: 'flex', gap: '6px' }}>
                                <button
                                    onClick={handleShowdown}
                                    style={{
                                        padding: '8px 18px',
                                        fontSize: '1.05rem',
                                        fontWeight: '900',
                                        borderRadius: '16px',
                                        border: 'none',
                                        background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
                                        color: 'white',
                                        cursor: 'pointer',
                                        boxShadow: '0 5px 18px rgba(59, 130, 246, 0.4)',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '6px',
                                        animation: 'pulseGlow 2s infinite'
                                    }}
                                >
                                    <Sparkles size={16} /> 카드 오픈! (결과 발표)
                                </button>
                                <button
                                    onClick={handleAllMatch}
                                    style={{
                                        padding: '8px 14px',
                                        fontSize: '0.86rem',
                                        fontWeight: '800',
                                        borderRadius: '14px',
                                        border: '1.5px solid #10b981',
                                        background: 'rgba(16, 185, 129, 0.25)',
                                        color: '#6ee7b7',
                                        cursor: 'pointer'
                                    }}
                                >
                                    전원 수락 ({currentBet}점 맞춤)
                                </button>
                            </div>
                        </div>
                    ) : null}

                    {phase === 'result' && (
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px' }}>
                            <button
                                onClick={triggerNewRound}
                                style={{
                                    padding: '10px 22px',
                                    fontSize: '1.05rem',
                                    fontWeight: '900',
                                    borderRadius: '18px',
                                    border: 'none',
                                    background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                                    color: 'white',
                                    cursor: 'pointer',
                                    boxShadow: '0 6px 20px rgba(16, 185, 129, 0.4)',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '6px'
                                }}
                            >
                                <RefreshCw size={17} /> 다음 라운드 시작!
                            </button>

                            {winner && (
                                <button
                                    onClick={handleApplyScore}
                                    disabled={scoreApplied}
                                    style={{
                                        padding: '7px 16px',
                                        fontSize: '0.84rem',
                                        fontWeight: '800',
                                        borderRadius: '12px',
                                        border: `1.5px solid ${scoreApplied ? '#10b981' : '#f59e0b'}`,
                                        background: scoreApplied ? 'rgba(16, 185, 129, 0.3)' : 'rgba(245, 158, 11, 0.3)',
                                        color: scoreApplied ? '#6ee7b7' : '#fde68a',
                                        cursor: scoreApplied ? 'default' : 'pointer',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '5px'
                                    }}
                                >
                                    {scoreApplied ? (
                                        <>
                                            <CheckCircle2 size={15} /> 점수판 반영 완료 (+{winner.wonPoints.toLocaleString()}점)
                                        </>
                                    ) : (
                                        <>
                                            🏆 {winner.num}번에 +{winner.wonPoints.toLocaleString()}점 점수판 반영
                                        </>
                                    )}
                                </button>
                            )}
                        </div>
                    )}
                </div>

                {/* --- PLAYERS STATIONS AROUND THE COMPASS TABLE (Clockwise layout, 1번 starts at 9 o'clock) --- */}
                {players.map((p, idx) => {
                    const totalP = players.length;
                    let posStyle = {};
                    if (totalP === 2) {
                        posStyle = idx === 0
                            ? { left: '16px', top: '50%', transform: 'translateY(-50%)' }
                            : { right: '16px', top: '50%', transform: 'translateY(-50%)' };
                    } else if (totalP === 3) {
                        posStyle = idx === 0
                            ? { left: '16px', top: '50%', transform: 'translateY(-50%)' }
                            : idx === 1
                                ? { top: '16px', left: '72%', transform: 'translateX(-50%)' }
                                : { bottom: '16px', left: '72%', transform: 'translateX(-50%)' };
                    } else if (totalP === 4) {
                        posStyle = idx === 0
                            ? { left: '16px', top: '50%', transform: 'translateY(-50%)' }
                            : idx === 1
                                ? { top: '16px', left: '50%', transform: 'translateX(-50%)' }
                                : idx === 2
                                    ? { right: '16px', top: '50%', transform: 'translateY(-50%)' }
                                    : { bottom: '16px', left: '50%', transform: 'translateX(-50%)' };
                    } else if (totalP === 5) {
                        const positions5 = [
                            { left: '16px', top: '50%', transform: 'translateY(-50%)' },          // 1번: 9시
                            { top: '16px', left: '22%', transform: 'translateX(-50%)' },          // 2번: 11시
                            { top: '16px', left: '78%', transform: 'translateX(-50%)' },          // 3번: 1시
                            { right: '16px', top: '50%', transform: 'translateY(-50%)' },         // 4번: 3시
                            { bottom: '16px', left: '50%', transform: 'translateX(-50%)' }       // 5번: 6시
                        ];
                        posStyle = positions5[idx % 5];
                    } else {
                        const positions6 = [
                            { left: '16px', top: '50%', transform: 'translateY(-50%)' },          // 1번: 9시
                            { top: '16px', left: '26%', transform: 'translateX(-50%)' },          // 2번: 11시
                            { top: '16px', left: '74%', transform: 'translateX(-50%)' },          // 3번: 1시
                            { right: '16px', top: '50%', transform: 'translateY(-50%)' },         // 4번: 3시
                            { bottom: '16px', left: '74%', transform: 'translateX(-50%)' },       // 5번: 5시
                            { bottom: '16px', left: '26%', transform: 'translateX(-50%)' }        // 6번: 7시
                        ];
                        posStyle = positions6[idx % 6];
                    }

                    const isWinner = winner && winner.num === p.num;
                    const liveScore = getPlayerGlobalScore(p.num);

                    return (
                        <div
                            key={p.num}
                            style={{
                                position: 'absolute',
                                ...posStyle,
                                display: 'flex',
                                flexDirection: 'column',
                                alignItems: 'center',
                                gap: '3px',
                                zIndex: 25,
                                opacity: p.isFolded ? 0.5 : 1,
                                filter: p.isFolded ? 'grayscale(0.7)' : 'none',
                                transition: 'all 0.3s ease'
                            }}
                        >
                            {/* Floating Action Speech Bubble */}
                            {p.actionText && (
                                <div style={{
                                    fontSize: '0.72rem',
                                    fontWeight: '900',
                                    color: p.isFolded ? '#cbd5e1' : '#fef08a',
                                    background: p.isFolded ? '#334155' : 'rgba(15, 23, 42, 0.9)',
                                    border: `1.5px solid ${p.isFolded ? '#64748b' : '#f59e0b'}`,
                                    padding: '1px 8px',
                                    borderRadius: '10px',
                                    boxShadow: '0 3px 8px rgba(0,0,0,0.5)',
                                    whiteSpace: 'nowrap'
                                }}>
                                    💬 {p.actionText}
                                </div>
                            )}

                            {/* Self-contained station box */}
                            <div style={{
                                background: isWinner ? 'linear-gradient(145deg, rgba(245, 158, 11, 0.45), rgba(180, 83, 9, 0.55))' : 'rgba(15, 23, 42, 0.94)',
                                border: isWinner ? '2.5px solid #f59e0b' : `2px solid ${p.ring || 'rgba(255, 255, 255, 0.25)'}`,
                                borderRadius: '18px',
                                padding: '7px 9px',
                                boxShadow: isWinner ? '0 0 32px #f59e0b, 0 8px 24px rgba(0,0,0,0.7)' : '0 6px 18px rgba(0,0,0,0.6)',
                                backdropFilter: 'blur(10px)',
                                display: 'flex',
                                flexDirection: 'column',
                                gap: '6px',
                                width: '208px',
                                boxSizing: 'border-box'
                            }}>
                                {/* Top Row: Avatar + Name + Live Score + Current Bet */}
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '6px' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                        <div style={{
                                            position: 'relative',
                                            borderRadius: '50%',
                                            boxShadow: isWinner ? '0 0 12px #fde047' : '0 2px 6px rgba(0,0,0,0.5)'
                                        }}>
                                            <CharacterAvatar charId={p.charId} size={32} />
                                        </div>
                                        <div>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
                                                <span style={{
                                                    fontSize: '0.62rem',
                                                    fontWeight: '900',
                                                    background: p.color || '#3b82f6',
                                                    color: '#fff',
                                                    padding: '1px 4px',
                                                    borderRadius: '4px'
                                                }}>
                                                    {p.num}번
                                                </span>
                                                <span style={{ fontSize: '0.78rem', fontWeight: '900', color: isWinner ? '#fef08a' : '#f8fafc', whiteSpace: 'nowrap' }}>
                                                    {p.name.replace(/^\d+번\s*/, '')}
                                                </span>
                                                {isWinner && (
                                                    <span style={{ fontSize: '0.6rem', background: '#f59e0b', color: '#1e293b', padding: '1px 3px', borderRadius: '4px', fontWeight: '900' }}>
                                                        👑
                                                    </span>
                                                )}
                                            </div>
                                            <div style={{ fontSize: '0.68rem', color: '#6ee7b7', fontWeight: '800' }}>
                                                누적 {liveScore.toLocaleString()}점
                                            </div>
                                        </div>
                                    </div>
                                    <div style={{ textAlign: 'right' }}>
                                        <div style={{ fontSize: '0.6rem', color: '#94a3b8' }}>도전 점수</div>
                                        <div style={{ fontSize: '0.74rem', color: '#fbbf24', fontWeight: '900' }}>{p.bet}점</div>
                                    </div>
                                </div>

                                {/* Bottom Row: 2 Cards + Action Buttons */}
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '6px' }}>
                                    
                                    {/* 2 Cards */}
                                    <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
                                        
                                        {/* Card 1: Face-Up (공개 카드) */}
                                        <div className={isDealingAnimation ? 'card-deal-anim' : ''} style={{
                                            position: 'relative',
                                            width: '42px',
                                            height: '62px',
                                            background: 'linear-gradient(135deg, #ffffff 0%, #f1f5f9 100%)',
                                            borderRadius: '8px',
                                            border: '1.5px solid #cbd5e1',
                                            boxShadow: '0 4px 12px rgba(0,0,0,0.4)',
                                            display: 'flex',
                                            flexDirection: 'column',
                                            justifyContent: 'space-between',
                                            padding: '3px 4px',
                                            boxSizing: 'border-box',
                                            color: p.card1.suit.color,
                                            userSelect: 'none'
                                        }}>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', lineHeight: 1 }}>
                                                <span style={{ fontSize: '0.92rem', fontWeight: '900' }}>{p.card1.val}</span>
                                                <span style={{ fontSize: '0.62rem' }}>{p.card1.suit.symbol}</span>
                                            </div>
                                            <div style={{ fontSize: '1.25rem', textAlign: 'center', lineHeight: 1 }}>
                                                {p.card1.suit.symbol}
                                            </div>
                                            <div style={{ textAlign: 'right', fontSize: '0.58rem', fontWeight: 'bold', color: '#64748b', lineHeight: 1 }}>
                                                공개
                                            </div>
                                        </div>

                                        {/* Card 2: Face-Down until Showdown (비밀 히든 카드) */}
                                        {p.isRevealed ? (
                                            <div className="card-flip-open" style={{
                                                position: 'relative',
                                                width: '42px',
                                                height: '62px',
                                                background: 'linear-gradient(135deg, #ffffff 0%, #fef3c7 100%)',
                                                borderRadius: '8px',
                                                border: isWinner ? '2px solid #f59e0b' : '1.5px solid #cbd5e1',
                                                boxShadow: isWinner ? '0 0 16px #f59e0b' : '0 4px 12px rgba(0,0,0,0.4)',
                                                display: 'flex',
                                                flexDirection: 'column',
                                                justifyContent: 'space-between',
                                                padding: '3px 4px',
                                                boxSizing: 'border-box',
                                                color: p.card2.suit.color,
                                                userSelect: 'none'
                                            }}>
                                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', lineHeight: 1 }}>
                                                    <span style={{ fontSize: '0.92rem', fontWeight: '900' }}>{p.card2.val}</span>
                                                    <span style={{ fontSize: '0.62rem' }}>{p.card2.suit.symbol}</span>
                                                </div>
                                                <div style={{ fontSize: '1.25rem', textAlign: 'center', lineHeight: 1 }}>
                                                    {p.card2.suit.symbol}
                                                </div>
                                                <div style={{ textAlign: 'right', fontSize: '0.58rem', fontWeight: '900', color: '#2563eb', lineHeight: 1 }}>
                                                    오픈
                                                </div>
                                            </div>
                                        ) : (
                                            /* Face-Down Student Star Card Back */
                                            <div className={isDealingAnimation ? 'card-deal-anim' : ''} style={{
                                                width: '42px',
                                                height: '62px',
                                                background: 'linear-gradient(145deg, #3b82f6 0%, #1d4ed8 100%)',
                                                borderRadius: '8px',
                                                border: '1.5px solid #93c5fd',
                                                boxShadow: '0 4px 12px rgba(0,0,0,0.4)',
                                                display: 'flex',
                                                flexDirection: 'column',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                position: 'relative'
                                            }}>
                                                <span style={{ fontSize: '1.15rem' }}>⭐</span>
                                                <span style={{ fontSize: '0.48rem', color: '#dbeafe', fontWeight: '900', marginTop: '1px' }}>SECRET</span>
                                            </div>
                                        )}
                                    </div>

                                    {/* Right Action: 2x2 Clean Action Buttons OR Evaluated Rank */}
                                    {/* Right Action: Clean Action Buttons OR Evaluated Rank */}
                                    <div style={{ flex: 1, minWidth: '92px' }}>
                                        {phase === 'betting' && !p.isFolded ? (
                                            (() => {
                                                const diff = currentBet - p.bet;
                                                const isMatched = diff <= 0;

                                                return (
                                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                                                        {isMatched ? (
                                                            <>
                                                                <div style={{
                                                                    display: 'flex',
                                                                    alignItems: 'center',
                                                                    justifyContent: 'center',
                                                                    gap: '3px',
                                                                    background: 'rgba(16, 185, 129, 0.2)',
                                                                    border: '1px solid #10b981',
                                                                    borderRadius: '6px',
                                                                    padding: '2px',
                                                                    color: '#6ee7b7',
                                                                    fontSize: '0.62rem',
                                                                    fontWeight: '900'
                                                                }}>
                                                                    <CheckCircle2 size={11} /> {currentBet}점 일치
                                                                </div>
                                                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '2px' }}>
                                                                    <button
                                                                        onClick={() => handlePlayerAction(p.num, 'raise_double')}
                                                                        style={{
                                                                            padding: '4px 1px',
                                                                            borderRadius: '6px',
                                                                            border: '1px solid #f59e0b',
                                                                            background: 'linear-gradient(135deg, #d97706, #b45309)',
                                                                            color: '#fff',
                                                                            cursor: 'pointer',
                                                                            fontSize: '0.65rem',
                                                                            fontWeight: '900',
                                                                            lineHeight: 1.1
                                                                        }}
                                                                        title="더블 20점 상향"
                                                                    >
                                                                        더블<br/><span style={{ fontSize: '0.55rem', opacity: 0.9 }}>+20</span>
                                                                    </button>
                                                                    <button
                                                                        onClick={() => handlePlayerAction(p.num, 'raise_super')}
                                                                        style={{
                                                                            padding: '4px 1px',
                                                                            borderRadius: '6px',
                                                                            border: '1px solid #a855f7',
                                                                            background: 'linear-gradient(135deg, #7c3aed, #581c87)',
                                                                            color: '#fef08a',
                                                                            cursor: 'pointer',
                                                                            fontSize: '0.65rem',
                                                                            fontWeight: '900',
                                                                            lineHeight: 1.1
                                                                        }}
                                                                        title="슈퍼 50점 상향"
                                                                    >
                                                                        슈퍼<br/><span style={{ fontSize: '0.55rem', opacity: 0.9 }}>+50</span>
                                                                    </button>
                                                                    <button
                                                                        onClick={() => handlePlayerAction(p.num, 'pass')}
                                                                        style={{
                                                                            padding: '4px 1px',
                                                                            borderRadius: '6px',
                                                                            border: '1px solid #64748b',
                                                                            background: 'linear-gradient(135deg, #475569, #334155)',
                                                                            color: '#cbd5e1',
                                                                            cursor: 'pointer',
                                                                            fontSize: '0.65rem',
                                                                            fontWeight: '900',
                                                                            lineHeight: 1.1
                                                                        }}
                                                                        title="패스 (점수 보호)"
                                                                    >
                                                                        패스<br/><span style={{ fontSize: '0.55rem', opacity: 0.9 }}>보호</span>
                                                                    </button>
                                                                </div>
                                                            </>
                                                        ) : (
                                                            <>
                                                                <button
                                                                    onClick={() => handlePlayerAction(p.num, 'match')}
                                                                    style={{
                                                                        padding: '4px 2px',
                                                                        borderRadius: '7px',
                                                                        border: '1.5px solid #10b981',
                                                                        background: 'linear-gradient(135deg, #059669, #047857)',
                                                                        color: '#ffffff',
                                                                        cursor: 'pointer',
                                                                        display: 'flex',
                                                                        alignItems: 'center',
                                                                        justifyContent: 'center',
                                                                        gap: '3px',
                                                                        boxShadow: '0 2px 6px rgba(16, 185, 129, 0.4)'
                                                                    }}
                                                                    title={`${currentBet}점으로 맞추기 (+${diff}점)`}
                                                                >
                                                                    <span style={{ fontSize: '0.72rem', fontWeight: '900' }}>수락 (+{diff})</span>
                                                                </button>
                                                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2px' }}>
                                                                    <button
                                                                        onClick={() => handlePlayerAction(p.num, 'raise_double')}
                                                                        style={{
                                                                            padding: '3px 1px',
                                                                            borderRadius: '6px',
                                                                            border: '1px solid #f59e0b',
                                                                            background: 'linear-gradient(135deg, #d97706, #b45309)',
                                                                            color: '#ffffff',
                                                                            cursor: 'pointer',
                                                                            fontSize: '0.65rem',
                                                                            fontWeight: '900',
                                                                            lineHeight: 1.1
                                                                        }}
                                                                        title="더블로 더 올리기"
                                                                    >
                                                                        더블<br/><span style={{ fontSize: '0.55rem', opacity: 0.9 }}>+{diff + 20}</span>
                                                                    </button>
                                                                    <button
                                                                        onClick={() => handlePlayerAction(p.num, 'pass')}
                                                                        style={{
                                                                            padding: '3px 1px',
                                                                            borderRadius: '6px',
                                                                            border: '1px solid #64748b',
                                                                            background: 'linear-gradient(135deg, #475569, #334155)',
                                                                            color: '#cbd5e1',
                                                                            cursor: 'pointer',
                                                                            fontSize: '0.65rem',
                                                                            fontWeight: '900',
                                                                            lineHeight: 1.1
                                                                        }}
                                                                        title="패스 (이번 판 빠지기)"
                                                                    >
                                                                        패스<br/><span style={{ fontSize: '0.55rem', opacity: 0.9 }}>보호</span>
                                                                    </button>
                                                                </div>
                                                            </>
                                                        )}
                                                    </div>
                                                );
                                            })()
                                        ) : p.isRevealed && !p.isFolded ? (
                                            <div style={{
                                                background: p.evalResult.isPair ? 'linear-gradient(135deg, #be185d, #831843)' : 'rgba(15, 23, 42, 0.85)',
                                                border: `1.5px solid ${p.evalResult.color}`,
                                                padding: '4px 6px',
                                                borderRadius: '8px',
                                                color: 'white',
                                                fontWeight: '900',
                                                textAlign: 'center',
                                                boxShadow: p.evalResult.isPair ? '0 0 14px #f43f5e' : 'none'
                                            }}>
                                                <div style={{ fontSize: '0.78rem', color: p.evalResult.isPair ? '#fef08a' : '#f8fafc' }}>
                                                    {p.evalResult.text}
                                                </div>
                                                <div style={{ fontSize: '0.62rem', color: p.evalResult.isPair ? '#fbcfe8' : '#a7f3d0', marginTop: '1px' }}>
                                                    {p.evalResult.subText}
                                                </div>
                                            </div>
                                        ) : p.isFolded ? (
                                            <div style={{
                                                background: '#334155',
                                                border: '1px solid #64748b',
                                                color: '#cbd5e1',
                                                padding: '5px 4px',
                                                borderRadius: '8px',
                                                textAlign: 'center'
                                            }}>
                                                <div style={{ fontSize: '0.76rem', fontWeight: '900' }}>🛡️ 패스</div>
                                                <div style={{ fontSize: '0.62rem', opacity: 0.8 }}>(점수 보호)</div>
                                            </div>
                                        ) : (
                                            <div style={{ fontSize: '0.72rem', color: '#94a3b8', textAlign: 'center' }}>
                                                대기 중
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Bottom Rules Guide Bar */}
            <footer style={{
                marginTop: '12px',
                background: 'rgba(15, 23, 42, 0.75)',
                border: '1px solid rgba(255, 255, 255, 0.15)',
                padding: '8px 22px',
                borderRadius: '18px',
                maxWidth: '1240px',
                width: '100%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: '10px'
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '14px', fontSize: '0.86rem', color: '#cbd5e1' }}>
                    <span style={{ color: '#fbbf24', fontWeight: '900' }}>⭐ 간단한 승리 규칙:</span>
                    <span><strong>1. 숫자 합산:</strong> 두 카드의 숫자를 더해 <strong>가장 큰 합</strong>을 만든 친구가 승리! (최대 19점)</span>
                    <span style={{ color: 'rgba(255,255,255,0.2)' }}>|</span>
                    <span><strong>2. 럭키 페어 (쌍둥이 카드):</strong> 같은 숫자 2장이 나오면 <strong>보너스 배수 팡팡!</strong> (10페어 3배 / 7~9페어 2배)</span>
                </div>

                <div style={{ fontSize: '0.82rem', color: '#94a3b8' }}>
                    * 1장은 공개, 1장은 비밀! 안전하게 패스하거나 더블 도전으로 멋진 역전을 노려보세요!
                </div>
            </footer>

            {/* Animation Styles */}
            <style>{`
                @keyframes pulseGlow {
                    0%, 100% { box-shadow: 0 0 15px rgba(59, 130, 246, 0.4); transform: scale(1); }
                    50% { box-shadow: 0 0 28px rgba(59, 130, 246, 0.8); transform: scale(1.02); }
                }
                .card-flip-open {
                    animation: flipCard 0.4s cubic-bezier(0.34, 1.56, 0.64, 1);
                }
                @keyframes flipCard {
                    0% { transform: rotateY(90deg) scale(0.9); opacity: 0; }
                    100% { transform: rotateY(0deg) scale(1); opacity: 1; }
                }
                .card-deal-anim {
                    animation: dealFromDeck 0.6s cubic-bezier(0.25, 1, 0.5, 1) forwards;
                }
                @keyframes dealFromDeck {
                    0% { transform: scale(0.3) rotate(20deg); opacity: 0; }
                    50% { transform: scale(1.1) rotate(-5deg); opacity: 0.9; }
                    100% { transform: scale(1) rotate(0deg); opacity: 1; }
                }
                @keyframes spinDeck {
                    0% { transform: rotate(0deg); }
                    100% { transform: rotate(360deg); }
                }
            `}</style>
        </div>
    );
}
