import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
    TrendingUp, TrendingDown, DollarSign, Award, Eye, EyeOff, 
    Lock, Unlock, Sparkles, AlertCircle, HelpCircle, CheckCircle, 
    RefreshCw, ChevronRight, Users, ShieldAlert, BarChart3, Newspaper, Check,
    Maximize, Minimize, ExternalLink, ArrowRight, Trophy, Edit3, Volume2, Tv, Monitor,
    Building2, Briefcase, Info, ArrowLeft, ArrowUpRight, ArrowDownRight, Layers,
    Clock, Globe, Zap, Search, BookOpen, Star, Flame, Radio, X
} from 'lucide-react';
import QRCode from 'react-qr-code';
import Confetti from 'react-confetti';
import { playSound } from '../utils/audio';
import { getParticipantJoinUrl } from '../utils/url';
import { formatKoreanMoney } from '../utils/format';
import { useGlobalSession } from '../context/GlobalSessionContext';
import {
    MARKET_SECTORS_DIRECTORY,
    KOREA_TOP_100_STOCKS,
    YEARLY_10_NEWS_DATABASE,
    generateRandom10Stocks,
    generateStockNewsForYear,
    YEARS_LIST
} from '../data/stockMarket100';

// Backward compatibility export for ScreenView.jsx or legacy imports
export const STOCK_DATA_2026 = generateRandom10Stocks();
export { YEARS_LIST };

// =============================================================================
// 공통 헬퍼: 팀/참여자 포트폴리오 안전 조회 함수 (ID, 닉네임, 조번호, socketId 다중 매핑 완벽 지원)
// =============================================================================
export const getTeamPortfolio = (teamOrKey, portfolios) => {
    const defaultPortfolio = {
        seedMoney: 1000000,
        cash: 1000000,
        holdings: { A: 0, B: 0, C: 0, D: 0, E: 0, F: 0, G: 0, H: 0, I: 0, J: 0 },
        history: {}
    };
    if (!portfolios) return defaultPortfolio;

    if (typeof teamOrKey === 'string' || typeof teamOrKey === 'number') {
        const key = String(teamOrKey);
        if (portfolios[key]) return portfolios[key];
        for (const [k, p] of Object.entries(portfolios)) {
            if (k === key || p?.teamId === key || p?.nickname === key || String(p?.groupId) === key) {
                return p;
            }
        }
    } else if (teamOrKey && typeof teamOrKey === 'object') {
        const candidates = [
            teamOrKey.id,
            teamOrKey.nickname,
            teamOrKey.name,
            teamOrKey.groupId,
            teamOrKey.socketId,
            String(teamOrKey.id || ''),
            String(teamOrKey.groupId || ''),
            String(teamOrKey.name || '')
        ].filter(Boolean);

        for (const c of candidates) {
            if (portfolios[c]) return portfolios[c];
        }
        for (const p of Object.values(portfolios)) {
            if (p?.teamId && candidates.includes(String(p.teamId))) return p;
            if (p?.nickname && candidates.includes(String(p.nickname))) return p;
            if (p?.groupId && candidates.includes(String(p.groupId))) return p;
        }
    }
    return defaultPortfolio;
};

// =============================================================================
// 1. 공통: 연도별 10대 뉴스 상세 열람 모달 (News Reader Modal)
// =============================================================================

// =============================================================================
// 공통 컴포넌트: 연도별 주가 추이 차트 (StockPriceTrendChart) - 2015~2025
// =============================================================================
export function StockPriceTrendChart({ stockItem, currentYear }) {
    if (!stockItem || !stockItem.prices) return null;

    const allYears = [2015, 2016, 2017, 2018, 2019, 2020, 2021, 2022, 2023, 2024, 2025];
    let years = allYears.filter(y => y <= currentYear);
    if (years.length === 1) {
        years = [2014, 2015];
    }

    const prices = years.map(y => y === 2014 ? (stockItem.prices[2015] ?? 0) : (stockItem.prices[y] ?? stockItem.prices[2015]));
    const maxPrice = Math.max(...prices, 1);
    const minPrice = Math.min(...prices, 1);
    const priceRange = Math.max(maxPrice - minPrice, 1);

    const chartHeight = 110;
    const chartWidth = 320;
    const paddingX = 20;
    const paddingY = 15;
    const usableWidth = chartWidth - paddingX * 2;
    const usableHeight = chartHeight - paddingY * 2;

    const points = years.map((y, idx) => {
        const divisor = Math.max(years.length - 1, 1);
        const x = paddingX + (idx / divisor) * usableWidth;
        const p = prices[idx];
        const normalizedY = (p - minPrice) / priceRange;
        const yPos = chartHeight - paddingY - (normalizedY * usableHeight);
        return { year: y, price: p, x, y: yPos, isCurrent: y === currentYear };
    });

    const pathD = points.reduce((acc, pt, i) => {
        return i === 0 ? `M ${pt.x} ${pt.y}` : `${acc} L ${pt.x} ${pt.y}`;
    }, '');

    const currentPt = points.find(pt => pt.year === currentYear) || points[points.length - 1];
    const prevYearPrice = stockItem.prices[currentYear > 2015 ? currentYear - 1 : 2015] ?? currentPt.price;
    const priceDiff = currentPt.price - prevYearPrice;
    const pctChange = prevYearPrice > 0 ? ((priceDiff / prevYearPrice) * 100).toFixed(1) : '0.0';

    return (
        <div style={{
            background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
            border: '1px solid #334155',
            borderRadius: '16px',
            padding: '14px 16px',
            display: 'flex',
            flexDirection: 'column',
            gap: '10px',
            wordBreak: 'keep-all',
            overflowWrap: 'break-word'
        }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <BarChart3 size={18} color="#38bdf8" />
                    <span style={{ fontSize: '0.92rem', fontWeight: '900', color: '#f8fafc' }}>
                        10개년 주가 추이 차트 ({currentYear}년 현황)
                    </span>
                </div>
                <div style={{ textAlign: 'right' }}>
                    <span style={{ fontSize: '1.05rem', fontWeight: '900', color: '#ffffff' }}>
                        {currentPt.price.toLocaleString()}원
                    </span>
                    {currentYear > 2015 && (
                        <span style={{
                            fontSize: '0.8rem',
                            fontWeight: '800',
                            marginLeft: '6px',
                            color: priceDiff >= 0 ? '#f43f5e' : '#38bdf8'
                        }}>
                            ({priceDiff >= 0 ? `+${pctChange}%` : `${pctChange}%`})
                        </span>
                    )}
                </div>
            </div>

            {/* SVG Trend Line Chart */}
            <div style={{ width: '100%', overflowX: 'auto', display: 'flex', justifyContent: 'center' }}>
                <svg width="100%" viewBox={`0 0 ${chartWidth} ${chartHeight}`} style={{ overflow: 'visible', maxWidth: '420px' }}>
                    {/* Horizontal Grid lines */}
                    <line x1={paddingX} y1={paddingY} x2={chartWidth - paddingX} y2={paddingY} stroke="rgba(255,255,255,0.08)" strokeDasharray="3 3" />
                    <line x1={paddingX} y1={chartHeight / 2} x2={chartWidth - paddingX} y2={chartHeight / 2} stroke="rgba(255,255,255,0.08)" strokeDasharray="3 3" />
                    <line x1={paddingX} y1={chartHeight - paddingY} x2={chartWidth - paddingX} y2={chartHeight - paddingY} stroke="rgba(255,255,255,0.08)" strokeDasharray="3 3" />

                    {/* Gradient Area under curve */}
                    <defs>
                        <linearGradient id={`chartGrad_${stockItem.key}`} x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#38bdf8" stopOpacity="0.35" />
                            <stop offset="100%" stopColor="#38bdf8" stopOpacity="0.0" />
                        </linearGradient>
                    </defs>
                    <path
                        d={`${pathD} L ${points[points.length - 1].x} ${chartHeight - paddingY} L ${points[0].x} ${chartHeight - paddingY} Z`}
                        fill={`url(#chartGrad_${stockItem.key})`}
                    />

                    {/* Main Trend Line */}
                    <path d={pathD} fill="none" stroke="#38bdf8" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />

                    {/* Points & Labels */}
                    {points.map((pt) => (
                        <g key={pt.year}>
                            <circle
                                cx={pt.x}
                                cy={pt.y}
                                r={pt.isCurrent ? "5" : "3"}
                                fill={pt.isCurrent ? (priceDiff >= 0 ? '#f43f5e' : '#38bdf8') : '#94a3b8'}
                                stroke={pt.isCurrent ? '#ffffff' : 'none'}
                                strokeWidth="2"
                            />
                            {pt.isCurrent && (
                                <rect
                                    x={pt.x - 22}
                                    y={pt.y - 20}
                                    width="44"
                                    height="16"
                                    rx="4"
                                    fill={priceDiff >= 0 ? '#f43f5e' : '#2563eb'}
                                />
                            )}
                            {pt.isCurrent && (
                                <text
                                    x={pt.x}
                                    y={pt.y - 9}
                                    fill="#ffffff"
                                    fontSize="9"
                                    fontWeight="bold"
                                    textAnchor="middle"
                                >
                                    {pt.year}
                                </text>
                            )}
                        </g>
                    ))}
                </svg>
            </div>

            {/* Min / Max Summary Row */}
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: '#94a3b8', paddingTop: '4px', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                <span>10년간 최고가: <strong style={{ color: '#f43f5e' }}>{maxPrice.toLocaleString()}원</strong></span>
                <span>10년간 최저가: <strong style={{ color: '#38bdf8' }}>{minPrice.toLocaleString()}원</strong></span>
            </div>
        </div>
    );
}

// =============================================================================
// 공통 컴포넌트: 기본적 분석 & 기술적 분석 (FundamentalTechnicalAnalysis)
// =============================================================================
export function FundamentalTechnicalAnalysis({ stockItem, currentYear, newsItem }) {
    if (!stockItem) return null;

    const curPrice = stockItem.prices ? (stockItem.prices[currentYear] ?? stockItem.prices[2015] ?? 10000) : 10000;
    const prevPrice = stockItem.prices ? (stockItem.prices[currentYear > 2015 ? currentYear - 1 : 2015] ?? curPrice) : curPrice;
    const isUp = curPrice >= prevPrice;

    // 종목별 및 연도별 펀더멘털 지표 계산
    const perVal = ((curPrice / 1500) + (stockItem.id ? parseInt(stockItem.id.replace(/\D/g, ''), 10) % 5 : 2)).toFixed(1);
    const pbrVal = (0.7 + (curPrice / 50000)).toFixed(2);
    const roeVal = (8 + (isUp ? 12 : -4) + (currentYear % 5)).toFixed(1);

    // 기술적 지표 상태
    const maStatus = isUp ? '5일·20일·60일 이동평균선 정배열 (우상향 랠리)' : '이동평균선 역배열 및 하방 지지선 테스트';
    const volumeStatus = isUp ? '외국인 & 기관 동반 순매수 유입 (거래량 180% 폭증)' : '외국인 차익 실현 매도세 우위 (개인 순매수)';
    const chartPattern = isUp ? '이중 바닥 패턴 완성 후 52주 신고가 돌파 시도' : '단기 과매도 구간 진입 및 120일선 기술적 반등 시도';
    const signalBadge = isUp ? { label: '🔥 매수 우위 (상승 모멘텀)', color: '#f43f5e', bg: 'rgba(244, 63, 94, 0.15)' } : { label: '⚠️ 하락 조정 (관망 필요)', color: '#38bdf8', bg: 'rgba(56, 189, 248, 0.15)' };

    return (
        <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
            gap: '12px',
            wordBreak: 'keep-all',
            overflowWrap: 'break-word'
        }}>
            {/* 1) 기본적 분석 (Fundamental Analysis) */}
            <div style={{
                background: '#0f172a',
                border: '1px solid #1e293b',
                borderRadius: '16px',
                padding: '14px 16px',
                display: 'flex',
                flexDirection: 'column',
                gap: '10px'
            }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <Building2 size={18} color="#f59e0b" />
                        <h4 style={{ margin: 0, fontSize: '0.95rem', fontWeight: '900', color: '#f8fafc' }}>
                            🏢 기본적 분석 (Fundamental)
                        </h4>
                    </div>
                    <span style={{
                        background: 'rgba(245, 158, 11, 0.15)',
                        color: '#fcd34d',
                        padding: '2px 8px',
                        borderRadius: '6px',
                        fontSize: '0.75rem',
                        fontWeight: '800'
                    }}>
                        {pbrVal < 1.0 ? '저PBR 가치주' : '성장 모멘텀주'}
                    </span>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '6px', background: '#1e293b', padding: '10px', borderRadius: '10px', textAlign: 'center' }}>
                    <div>
                        <div style={{ fontSize: '0.7rem', color: '#94a3b8' }}>PER (수익성)</div>
                        <div style={{ fontSize: '0.95rem', fontWeight: '900', color: '#38bdf8' }}>{perVal}배</div>
                    </div>
                    <div>
                        <div style={{ fontSize: '0.7rem', color: '#94a3b8' }}>PBR (자산가치)</div>
                        <div style={{ fontSize: '0.95rem', fontWeight: '900', color: '#f59e0b' }}>{pbrVal}배</div>
                    </div>
                    <div>
                        <div style={{ fontSize: '0.7rem', color: '#94a3b8' }}>ROE (자본이익률)</div>
                        <div style={{ fontSize: '0.95rem', fontWeight: '900', color: Number(roeVal) > 10 ? '#f43f5e' : '#94a3b8' }}>{roeVal}%</div>
                    </div>
                </div>

                <div style={{ fontSize: '0.82rem', color: '#cbd5e1', lineHeight: '1.5' }}>
                    • <strong>실적 진단:</strong> {isUp ? '매출 및 영업이익률이 전년 대비 대폭 개선되며 이익 체력이 강화됨.' : '원재료 비용 상승 및 수요 둔화로 단기 수익성이 하향 조정됨.'}
                </div>
            </div>

            {/* 2) 기술적 분석 (Technical Analysis) */}
            <div style={{
                background: '#0f172a',
                border: '1px solid #1e293b',
                borderRadius: '16px',
                padding: '14px 16px',
                display: 'flex',
                flexDirection: 'column',
                gap: '10px'
            }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <TrendingUp size={18} color="#f43f5e" />
                        <h4 style={{ margin: 0, fontSize: '0.95rem', fontWeight: '900', color: '#f8fafc' }}>
                            📊 기술적 분석 (Technical)
                        </h4>
                    </div>
                    <span style={{
                        background: signalBadge.bg,
                        color: signalBadge.color,
                        padding: '2px 8px',
                        borderRadius: '6px',
                        fontSize: '0.75rem',
                        fontWeight: '800'
                    }}>
                        {signalBadge.label}
                    </span>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '0.82rem', color: '#cbd5e1' }}>
                    <div style={{ background: '#1e293b', padding: '8px 10px', borderRadius: '8px' }}>
                        <strong style={{ color: '#38bdf8' }}>• 이동평균선:</strong> {maStatus}
                    </div>
                    <div style={{ background: '#1e293b', padding: '8px 10px', borderRadius: '8px' }}>
                        <strong style={{ color: '#f59e0b' }}>• 거래량/수급:</strong> {volumeStatus}
                    </div>
                    <div style={{ background: '#1e293b', padding: '8px 10px', borderRadius: '8px' }}>
                        <strong style={{ color: '#f43f5e' }}>• 차트 패턴:</strong> {chartPattern}
                    </div>
                </div>
            </div>
        </div>
    );
}

export function StockNewsModal({ newsItem, currentYear, onClose, hasVipHint = false, isHost = false, stocks = {}, autoCycleTimeLeft = null }) {
    if (!newsItem) return null;
    const [isEasyNews, setIsEasyNews] = useState(false);
    const targetStock = newsItem.stockItem || (stocks && newsItem.stockKey ? stocks[newsItem.stockKey] : null);

    return (
        <div 
            onClick={onClose}
            style={{
                position: 'fixed',
                inset: 0,
                backgroundColor: 'rgba(15, 23, 42, 0.75)',
                backdropFilter: 'blur(8px)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                zIndex: 3000,
                padding: '20px',
                boxSizing: 'border-box'
            }}
        >
            <div 
                onClick={(e) => e.stopPropagation()}
                className="animate-pop-in"
                style={{
                    background: '#ffffff',
                    borderRadius: '24px',
                    maxWidth: '680px',
                    width: '100%',
                    boxShadow: '0 25px 60px -15px rgba(0, 0, 0, 0.3)',
                    border: '1px solid #e2e8f0',
                    overflow: 'hidden',
                    display: 'flex',
                    flexDirection: 'column'
                }}
            >
                {/* Modal Header */}
                <div style={{
                    padding: '24px 28px 20px 28px',
                    borderBottom: '1px solid #f1f5f9',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'flex-start',
                    gap: '15px'
                }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                            <span style={{
                                background: '#f43f5e',
                                color: 'white',
                                padding: '4px 10px',
                                borderRadius: '8px',
                                fontSize: '0.8rem',
                                fontWeight: '800'
                            }}>
                                {newsItem.tag || '경제 속보'}
                            </span>
                            <span style={{
                                background: '#f1f5f9',
                                color: '#475569',
                                padding: '4px 10px',
                                borderRadius: '8px',
                                fontSize: '0.8rem',
                                fontWeight: '700'
                            }}>
                                📅 {newsItem.date || `${currentYear}.06.15`}
                            </span>
                            <span style={{ fontSize: '0.85rem', color: '#64748b', fontWeight: 'bold' }}>
                                {newsItem.media || '경제 종합'}
                            </span>
                            {autoCycleTimeLeft !== null && autoCycleTimeLeft !== undefined && (
                                <span style={{
                                    background: '#fee2e2',
                                    color: '#dc2626',
                                    border: '1.5px solid #f87171',
                                    padding: '3px 10px',
                                    borderRadius: '8px',
                                    fontSize: '0.8rem',
                                    fontWeight: '900',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '4px'
                                }}>
                                    ⏱️ 자동 순환: {autoCycleTimeLeft}초 후 시세판 전환
                                </span>
                            )}
                            <button
                                onClick={() => setIsEasyNews(!isEasyNews)}
                                style={{
                                    background: isEasyNews ? '#f59e0b' : '#e2e8f0',
                                    color: isEasyNews ? '#1e293b' : '#334155',
                                    border: 'none',
                                    borderRadius: '8px',
                                    padding: '3px 10px',
                                    fontSize: '0.8rem',
                                    fontWeight: '800',
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '4px'
                                }}
                            >
                                {isEasyNews ? '📰 원본 뉴스 보기' : '🐣 Easy 쉬운 뉴스 보기'}
                            </button>
                        </div>
                        <h2 style={{
                            fontSize: '1.45rem',
                            fontWeight: '900',
                            color: '#0f172a',
                            margin: 0,
                            lineHeight: 1.35,
                            wordBreak: 'keep-all',
                            overflowWrap: 'break-word'
                        }}>
                            {newsItem.headline}
                        </h2>
                    </div>
                    <button
                        onClick={onClose}
                        style={{
                            background: '#f1f5f9',
                            border: 'none',
                            borderRadius: '12px',
                            width: '36px',
                            height: '36px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            cursor: 'pointer',
                            fontSize: '1.2rem',
                            color: '#64748b',
                            flexShrink: 0
                        }}
                    >
                        ✕
                    </button>
                </div>

                {/* Modal Body */}
                <div style={{ padding: '24px 28px', overflowY: 'auto', maxHeight: '60vh', display: 'flex', flexDirection: 'column', gap: '20px' }}>
                    {/* Article Content (Easy Mode vs Original) */}
                    <div style={{
                        background: isEasyNews ? '#fffbeb' : '#f8fafc',
                        padding: '18px 22px',
                        borderRadius: '16px',
                        border: isEasyNews ? '1.5px solid #f59e0b' : '1px solid #e2e8f0',
                        fontSize: '1.02rem',
                        lineHeight: '1.75',
                        color: isEasyNews ? '#78350f' : '#334155',
                        whiteSpace: 'pre-line',
                        wordBreak: 'keep-all',
                        overflowWrap: 'break-word'
                    }}>
                        {isEasyNews ? (newsItem.easyContent || newsItem.content) : newsItem.content}
                    </div>

                    {/* Term Glossary Footnotes */}
                    {newsItem.glossary && newsItem.glossary.length > 0 && (
                        <div style={{
                            background: '#eff6ff',
                            border: '1px solid #bfdbfe',
                            borderRadius: '14px',
                            padding: '14px 18px',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '8px'
                        }}>
                            <div style={{ fontSize: '0.88rem', fontWeight: '900', color: '#1e40af' }}>
                                📌 주요 경제/산업 용어 해설
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                {newsItem.glossary.map((g, idx) => (
                                    <div key={idx} style={{ fontSize: '0.84rem', color: '#1e3a8a', lineHeight: '1.5' }}>
                                        <strong style={{ color: '#2563eb' }}>• {g.term}:</strong> {g.def}
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                                        {/* 10-Year Price Trend Chart */}
                    {targetStock && (
                        <StockPriceTrendChart stockItem={targetStock} currentYear={currentYear} />
                    )}

                    {/* Fundamental & Technical Analysis Panel */}
                    {targetStock && (
                        <FundamentalTechnicalAnalysis stockItem={targetStock} currentYear={currentYear} newsItem={newsItem} />
                    )}

                    {/* Affected Sector Badge */}
                    {newsItem.impactSector && (
                        <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '10px',
                            padding: '12px 18px',
                            background: '#eff6ff',
                            borderRadius: '12px',
                            border: '1px solid #bfdbfe'
                        }}>
                            <Zap size={18} color="#2563eb" />
                            <span style={{ fontSize: '0.95rem', color: '#1e40af', fontWeight: '800' }}>
                                주요 영향 섹터: <strong>{newsItem.impactSector}</strong>
                            </span>
                        </div>
                    )}

                    {/* VIP 100% Hint Card (호스트 권한 부여 시 또는 호스트 화면에서만 표시) */}
                    {(hasVipHint || isHost) ? (
                        <div style={{
                            background: 'linear-gradient(135deg, #fffbeb 0%, #fef3c7 100%)',
                            border: '2px solid #f59e0b',
                            borderRadius: '18px',
                            padding: '20px',
                            boxShadow: '0 10px 25px rgba(245, 158, 11, 0.15)',
                            position: 'relative',
                            overflow: 'hidden'
                        }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
                                <Star size={20} fill="#f59e0b" color="#f59e0b" />
                                <span style={{
                                    fontSize: '1.05rem',
                                    fontWeight: '900',
                                    color: '#b45309',
                                    letterSpacing: '0.5px'
                                }}>
                                    호스트 특급 제공: 100% 확정 정보 (VIP 힌트)
                                </span>
                            </div>
                            <p style={{
                                margin: 0,
                                fontSize: '1rem',
                                lineHeight: '1.6',
                                color: '#78350f',
                                fontWeight: '700'
                            }}>
                                {newsItem.vipHint}
                            </p>
                        </div>
                    ) : (
                        <div style={{
                            background: '#f8fafc',
                            border: '1.5px dashed #cbd5e1',
                            borderRadius: '16px',
                            padding: '16px',
                            textAlign: 'center',
                            color: '#94a3b8',
                            fontSize: '0.9rem',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '8px'
                        }}>
                            <Lock size={16} />
                            <span>100% 특급 힌트는 호스트가 특별 권한을 부여한 팀에만 공개됩니다.</span>
                        </div>
                    )}
                </div>

                {/* Modal Footer */}
                <div style={{
                    padding: '16px 28px',
                    borderTop: '1px solid #f1f5f9',
                    display: 'flex',
                    justifyContent: 'flex-end',
                    background: '#f8fafc'
                }}>
                    <button
                        onClick={onClose}
                        style={{
                            background: '#0f172a',
                            color: 'white',
                            border: 'none',
                            padding: '10px 24px',
                            borderRadius: '12px',
                            fontWeight: '800',
                            fontSize: '0.95rem',
                            cursor: 'pointer'
                        }}
                    >
                        확인 완료
                    </button>
                </div>
            </div>
        </div>
    );
}

// =============================================================================
// 2-0. 공통: 14대 시장 섹터 도감 전체 열람 모달 (Sector Directory Modal)
// =============================================================================
export function SectorDirectoryModal({ onClose, allStocks = [], isPubliclyRevealed = false }) {
    const [activeSector, setActiveSector] = useState(null);

    return (
        <div 
            onClick={onClose}
            style={{
                position: 'fixed',
                inset: 0,
                backgroundColor: 'rgba(15, 23, 42, 0.82)',
                backdropFilter: 'blur(10px)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                zIndex: 3100,
                padding: '20px',
                boxSizing: 'border-box'
            }}
        >
            <div 
                onClick={(e) => e.stopPropagation()}
                className="animate-pop-in"
                style={{
                    background: '#0f172a',
                    borderRadius: '24px',
                    maxWidth: '1080px',
                    width: '100%',
                    maxHeight: '90vh',
                    boxShadow: '0 25px 60px -15px rgba(0, 0, 0, 0.6)',
                    border: '1.5px solid #334155',
                    display: 'flex',
                    flexDirection: 'column',
                    overflow: 'hidden'
                }}
            >
                {/* Header */}
                <div style={{
                    padding: '20px 24px',
                    borderBottom: '1px solid #1e293b',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    background: 'rgba(30, 41, 59, 0.5)'
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <div style={{
                            width: '44px',
                            height: '44px',
                            borderRadius: '12px',
                            background: 'rgba(56, 189, 248, 0.15)',
                            color: '#38bdf8',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '1.5rem',
                            border: '1px solid rgba(56, 189, 248, 0.3)'
                        }}>
                            <Building2 size={22} color="#38bdf8" />
                        </div>
                        <div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <h2 style={{ fontSize: '1.3rem', fontWeight: '900', color: '#f8fafc', margin: 0 }}>
                                    시장 섹터 도감 (14대 산업군)
                                </h2>
                                <span style={{ fontSize: '0.74rem', background: '#38bdf8', color: '#0f172a', padding: '2px 8px', borderRadius: '10px', fontWeight: '800' }}>
                                    100대 기업 풀
                                </span>
                            </div>
                            <p style={{ margin: '4px 0 0 0', fontSize: '0.82rem', color: '#94a3b8' }}>
                                각 섹터 카드를 클릭하면 상세 특성, 매크로 민감도 및 포함 기업을 열람할 수 있습니다.
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        style={{
                            background: '#1e293b',
                            border: '1px solid #334155',
                            borderRadius: '12px',
                            width: '38px',
                            height: '38px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            cursor: 'pointer',
                            fontSize: '1.2rem',
                            color: '#cbd5e1',
                            transition: 'all 0.15s ease'
                        }}
                        onMouseEnter={(e) => { e.currentTarget.style.background = '#334155'; }}
                        onMouseLeave={(e) => { e.currentTarget.style.background = '#1e293b'; }}
                    >
                        ✕
                    </button>
                </div>

                {/* Content: 14 Sectors Grid */}
                <div style={{ padding: '20px', overflowY: 'auto', flex: 1 }}>
                    <div style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fill, minmax(310px, 1fr))',
                        gap: '12px'
                    }}>
                        {MARKET_SECTORS_DIRECTORY.map((s) => (
                            <div
                                key={s.id}
                                onClick={() => setActiveSector(s)}
                                style={{
                                    background: '#1e293b',
                                    border: '1.5px solid rgba(255, 255, 255, 0.08)',
                                    borderRadius: '14px',
                                    padding: '14px',
                                    cursor: 'pointer',
                                    transition: 'all 0.2s ease',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    gap: '8px'
                                }}
                                onMouseEnter={(e) => {
                                    e.currentTarget.style.borderColor = s.color;
                                    e.currentTarget.style.transform = 'translateY(-2px)';
                                    e.currentTarget.style.background = '#273549';
                                }}
                                onMouseLeave={(e) => {
                                    e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.08)';
                                    e.currentTarget.style.transform = 'translateY(0)';
                                    e.currentTarget.style.background = '#1e293b';
                                }}
                            >
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                        <span style={{ fontSize: '1.25rem' }}>{s.icon}</span>
                                        <span style={{ fontSize: '0.98rem', fontWeight: '800', color: '#f1f5f9' }}>
                                            {s.name}
                                        </span>
                                    </div>
                                    <span style={{
                                        fontSize: '0.72rem',
                                        color: s.color,
                                        fontWeight: '800',
                                        background: `${s.color}15`,
                                        padding: '3px 8px',
                                        borderRadius: '8px',
                                        border: `1px solid ${s.color}35`
                                    }}>
                                        도감 상세 →
                                    </span>
                                </div>

                                <p style={{ margin: 0, fontSize: '0.8rem', color: '#cbd5e1', lineHeight: '1.45' }}>
                                    {s.description}
                                </p>

                                <div style={{
                                    background: 'rgba(15, 23, 42, 0.65)',
                                    borderRadius: '8px',
                                    padding: '8px 10px',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    gap: '4px',
                                    fontSize: '0.74rem'
                                }}>
                                    <div style={{ color: '#38bdf8', fontWeight: '700' }}>
                                        ⚡ 민감도: <span style={{ color: '#e2e8f0', fontWeight: 'normal' }}>{s.keySensitivity}</span>
                                    </div>
                                    <div style={{ color: '#a78bfa', fontWeight: '700' }}>
                                        🌐 매크로: <span style={{ color: '#94a3b8', fontWeight: 'normal' }}>{s.macroCharacteristics}</span>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Footer */}
                <div style={{
                    padding: '14px 24px',
                    borderTop: '1px solid #1e293b',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    background: 'rgba(15, 23, 42, 0.6)'
                }}>
                    <span style={{ fontSize: '0.78rem', color: '#64748b' }}>
                        * 각 섹터 카드를 클릭하면 소속 기업 목록과 심층 투자 분석 가이드가 열립니다.
                    </span>
                    <button
                        onClick={onClose}
                        style={{
                            background: '#334155',
                            color: 'white',
                            border: 'none',
                            padding: '8px 20px',
                            borderRadius: '10px',
                            fontSize: '0.85rem',
                            fontWeight: 'bold',
                            cursor: 'pointer'
                        }}
                    >
                        닫기
                    </button>
                </div>
            </div>

            {/* Nested Detail Modal if a sector card was clicked */}
            {activeSector && (
                <SectorDetailModal
                    sector={activeSector}
                    onClose={() => setActiveSector(null)}
                    allStocks={allStocks}
                    isPubliclyRevealed={isPubliclyRevealed}
                />
            )}
        </div>
    );
}

// =============================================================================
// 2. 공통: 14대 시장 섹터 도감 상세 모달 (Sector Detail Modal)
// =============================================================================
export function SectorDetailModal({ sector, onClose, allStocks = [], isPubliclyRevealed = false }) {
    if (!sector) return null;

    const includedStocks = allStocks.filter(s => s.sectorId === sector.id);

    return (
        <div 
            onClick={onClose}
            style={{
                position: 'fixed',
                inset: 0,
                backgroundColor: 'rgba(15, 23, 42, 0.75)',
                backdropFilter: 'blur(8px)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                zIndex: 3000,
                padding: '20px',
                boxSizing: 'border-box'
            }}
        >
            <div 
                onClick={(e) => e.stopPropagation()}
                className="animate-pop-in"
                style={{
                    background: '#ffffff',
                    borderRadius: '24px',
                    maxWidth: '650px',
                    width: '100%',
                    boxShadow: '0 25px 60px -15px rgba(0, 0, 0, 0.3)',
                    border: '1px solid #e2e8f0',
                    overflow: 'hidden'
                }}
            >
                {/* Header */}
                <div style={{
                    padding: '24px 28px',
                    borderBottom: '1px solid #f1f5f9',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center'
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <div style={{
                            width: '48px',
                            height: '48px',
                            borderRadius: '14px',
                            background: `${sector.color}15`,
                            color: sector.color,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '1.6rem'
                        }}>
                            {sector.icon}
                        </div>
                        <div>
                            <h2 style={{ fontSize: '1.4rem', fontWeight: '900', color: '#0f172a', margin: 0 }}>
                                {sector.name}
                            </h2>
                            <p style={{ margin: '4px 0 0 0', fontSize: '0.85rem', color: '#64748b', fontWeight: '600' }}>
                                100대 기업 풀 중 {includedStocks.length}개사 포함
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        style={{
                            background: '#f1f5f9',
                            border: 'none',
                            borderRadius: '12px',
                            width: '36px',
                            height: '36px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            cursor: 'pointer',
                            fontSize: '1.2rem',
                            color: '#64748b'
                        }}
                    >
                        ✕
                    </button>
                </div>

                {/* Body */}
                <div style={{ padding: '24px 28px', display: 'flex', flexDirection: 'column', gap: '18px', maxHeight: '60vh', overflowY: 'auto' }}>
                    <div>
                        <h4 style={{ margin: '0 0 6px 0', fontSize: '0.95rem', color: '#475569', fontWeight: '800' }}>섹터 정의 및 개요</h4>
                        <p style={{ margin: 0, fontSize: '0.95rem', color: '#334155', lineHeight: '1.6' }}>
                            {sector.description}
                        </p>
                    </div>

                    <div style={{ background: '#f8fafc', padding: '16px', borderRadius: '14px', border: '1px solid #e2e8f0' }}>
                        <h4 style={{ margin: '0 0 6px 0', fontSize: '0.95rem', color: '#0369a1', fontWeight: '800' }}>거시경제(매크로) 연동 특성</h4>
                        <p style={{ margin: 0, fontSize: '0.9rem', color: '#0c4a6e', lineHeight: '1.6' }}>
                            {sector.macroCharacteristics}
                        </p>
                    </div>

                    <div style={{ background: '#fef2f2', padding: '16px', borderRadius: '14px', border: '1px solid #fecaca' }}>
                        <h4 style={{ margin: '0 0 6px 0', fontSize: '0.95rem', color: '#b91c1c', fontWeight: '800' }}>주요 호재 & 악재 민감도</h4>
                        <p style={{ margin: 0, fontSize: '0.9rem', color: '#7f1d1d', lineHeight: '1.6' }}>
                            {sector.keySensitivity}
                        </p>
                    </div>

                    {/* Included Stocks List (공개되었거나 호스트인 경우) */}
                    <div>
                        <h4 style={{ margin: '0 0 10px 0', fontSize: '0.95rem', color: '#475569', fontWeight: '800' }}>
                            포함된 100대 기업 리스트
                        </h4>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                            {includedStocks.map(s => (
                                <div
                                    key={s.id}
                                    style={{
                                        background: '#ffffff',
                                        border: '1px solid #cbd5e1',
                                        borderRadius: '10px',
                                        padding: '6px 12px',
                                        fontSize: '0.85rem',
                                        fontWeight: '700',
                                        color: '#1e293b'
                                    }}
                                >
                                    {isPubliclyRevealed ? `${s.realName} (${s.code})` : `${sector.name} 대표기업`}
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <div style={{ padding: '16px 28px', borderTop: '1px solid #f1f5f9', display: 'flex', justifyContent: 'flex-end', background: '#f8fafc' }}>
                    <button
                        onClick={onClose}
                        style={{
                            background: '#0f172a',
                            color: 'white',
                            border: 'none',
                            padding: '10px 24px',
                            borderRadius: '12px',
                            fontWeight: '800',
                            fontSize: '0.95rem',
                            cursor: 'pointer'
                        }}
                    >
                        닫기
                    </button>
                </div>
            </div>
        </div>
    );
}

// =============================================================================
// 3. 특별 힌트 혜택 모달 (SpecialHintRewardModal)
// (5개 이상 뉴스 분석 예측을 맞춘 참여자가 10개 종목 중 단 1개를 골라 100% 힌트를 받는 모달)
// =============================================================================
export function SpecialHintRewardModal({
    isOpen,
    onClose,
    hits = 0,
    total = 10,
    currentYear = 2016,
    stocks = {},
    selectedStockKey,
    onSelectStock
}) {
    if (!isOpen) return null;
    const isQualified = hits >= 5;
    const nextYear = currentYear >= 2025 ? 2025 : currentYear + 1;
    const stockList = Object.values(stocks);
    const chosenStock = selectedStockKey ? stocks[selectedStockKey] : null;

    let targetIsUp = false;
    let targetNews = null;

    if (chosenStock) {
        // 현재 투자 라운드 연도(currentYear)의 주가 변동 뉴스 목록에서 선택된 종목의 확정 뉴스를 조회
        const currentNewsList = generateStockNewsForYear(currentYear, stocks);
        targetNews = currentNewsList.find(n => n.stockKey === selectedStockKey) || null;
        if (targetNews) {
            targetIsUp = targetNews.direction === 'UP';
        } else {
            const curP = chosenStock.prices[currentYear] ?? chosenStock.prices[2015];
            const nextP = chosenStock.prices[nextYear] ?? curP;
            targetIsUp = (nextP - curP) >= 0;
        }
    }

    return (
        <div
            onClick={onClose}
            style={{
                position: 'fixed',
                inset: 0,
                backgroundColor: 'rgba(15, 23, 42, 0.82)',
                backdropFilter: 'blur(10px)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                zIndex: 3500,
                padding: '20px',
                boxSizing: 'border-box'
            }}
        >
            <div
                onClick={(e) => e.stopPropagation()}
                className="animate-pop-in"
                style={{
                    background: '#0f172a',
                    borderRadius: '24px',
                    maxWidth: '640px',
                    width: '100%',
                    boxShadow: isQualified 
                        ? '0 25px 60px -15px rgba(0, 0, 0, 0.6), 0 0 40px rgba(245, 158, 11, 0.25)'
                        : '0 25px 60px -15px rgba(0, 0, 0, 0.6), 0 0 30px rgba(56, 189, 248, 0.15)',
                    border: isQualified ? '2px solid #f59e0b' : '2px solid #38bdf8',
                    overflow: 'hidden',
                    display: 'flex',
                    flexDirection: 'column',
                    color: '#f8fafc'
                }}
            >
                {/* Header */}
                <div style={{
                    padding: '20px 24px',
                    background: isQualified 
                        ? 'linear-gradient(135deg, #78350f 0%, #1e293b 100%)'
                        : 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)',
                    borderBottom: isQualified ? '1px solid rgba(245, 158, 11, 0.3)' : '1px solid rgba(56, 189, 248, 0.25)',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center'
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        {isQualified ? (
                            <Trophy size={26} color="#f59e0b" />
                        ) : (
                            <AlertCircle size={26} color="#38bdf8" />
                        )}
                        <div>
                            <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: '900', color: isQualified ? '#fef3c7' : '#f8fafc' }}>
                                {isQualified ? '👑 100% 특급 VIP 주식 정보 혜택' : '📢 뉴스 분석 예측 결과 안내'}
                            </h3>
                            <div style={{ fontSize: '0.82rem', color: isQualified ? '#fcd34d' : '#94a3b8', fontWeight: '700', marginTop: '2px' }}>
                                {isQualified
                                    ? `뉴스 예측 ${hits}개 적중 성공! (5개 이상 기준 달성)`
                                    : `뉴스 예측 ${hits}개 적중 / 10개 (5개 미달)`}
                            </div>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        style={{
                            background: 'rgba(255, 255, 255, 0.1)',
                            border: 'none',
                            borderRadius: '10px',
                            color: '#94a3b8',
                            fontSize: '1.2rem',
                            cursor: 'pointer',
                            padding: '6px 12px'
                        }}
                    >
                        ✕
                    </button>
                </div>

                {/* Content */}
                <div style={{ padding: '22px 24px', display: 'flex', flexDirection: 'column', gap: '16px', maxHeight: '65vh', overflowY: 'auto' }}>
                    {isQualified ? (
                        <>
                            <div style={{
                                background: 'rgba(245, 158, 11, 0.12)',
                                border: '1px solid rgba(245, 158, 11, 0.3)',
                                borderRadius: '14px',
                                padding: '14px 16px',
                                display: 'flex',
                                flexDirection: 'column',
                                gap: '6px'
                            }}>
                                <div style={{ fontSize: '1rem', fontWeight: '900', color: '#fbbf24' }}>
                                    🎉 축하합니다! 예측 적중 기준(5개 이상)을 달성하셨습니다!
                                </div>
                                <p style={{ margin: 0, fontSize: '0.92rem', color: '#fef3c7', lineHeight: '1.6' }}>
                                    10개 종목 중 총 <strong style={{ color: '#ffffff', textDecoration: 'underline' }}>{hits}개</strong>의 상승/하락 예측을 정확히 맞추셨습니다.<br />
                                    다음 연도({nextYear}년)에 주가가 오를지 떨어질지 <strong>100% 알 수 있는 특급 주식 정보</strong>를 <strong>단 1개 종목에만</strong> 제공합니다.<br />
                                    {selectedStockKey ? (
                                        <span style={{ color: '#34d399', fontWeight: '900' }}>
                                            🔒 [{chosenStock?.key} {chosenStock?.sector}] 종목을 선택하셨습니다. (선택 완료 - 다른 종목 변경 불가)
                                        </span>
                                    ) : (
                                        <span style={{ color: '#fbbf24', fontWeight: '900' }}>
                                            ⚠️ 주의: 종목 1개를 선택하면 다른 종목으로 변경하거나 추가로 볼 수 없습니다. 신중하게 선택하세요!
                                        </span>
                                    )}
                                </p>
                            </div>

                            {/* 10 Stock Selection Grid (1개 선택 시 나머지 잠금) */}
                            <div style={{
                                display: 'grid',
                                gridTemplateColumns: 'repeat(2, 1fr)',
                                gap: '8px'
                            }}>
                                {stockList.map(s => {
                                    const isSelected = selectedStockKey === s.key;
                                    const isLocked = Boolean(selectedStockKey);
                                    const isOther = isLocked && !isSelected;

                                    return (
                                        <button
                                            key={s.key}
                                            disabled={isOther}
                                            onClick={() => {
                                                if (!selectedStockKey && onSelectStock) {
                                                    onSelectStock(s.key);
                                                }
                                            }}
                                            style={{
                                                background: isSelected 
                                                    ? 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)' 
                                                    : (isOther ? 'rgba(15, 23, 42, 0.4)' : 'rgba(30, 41, 59, 0.7)'),
                                                color: isSelected ? '#1e293b' : (isOther ? '#64748b' : '#f8fafc'),
                                                border: isSelected 
                                                    ? '2px solid #fbbf24' 
                                                    : (isOther ? '1px solid rgba(255, 255, 255, 0.05)' : '1px solid rgba(255, 255, 255, 0.1)'),
                                                borderRadius: '12px',
                                                padding: '10px 14px',
                                                cursor: isOther ? 'not-allowed' : (isSelected ? 'default' : 'pointer'),
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: '10px',
                                                opacity: isOther ? 0.45 : 1,
                                                transition: 'all 0.2s',
                                                boxShadow: isSelected ? '0 4px 15px rgba(245, 158, 11, 0.4)' : 'none'
                                            }}
                                        >
                                            <div style={{
                                                width: '28px',
                                                height: '28px',
                                                borderRadius: '8px',
                                                background: isSelected ? '#1e293b' : (isOther ? '#334155' : (s.badgeColor || '#3b82f6')),
                                                color: isSelected ? '#fbbf24' : (isOther ? '#94a3b8' : 'white'),
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                fontSize: '0.9rem',
                                                fontWeight: '900'
                                            }}>
                                                {s.key}
                                            </div>
                                            <div style={{ textAlign: 'left', flex: 1 }}>
                                                <div style={{ fontSize: '0.9rem', fontWeight: '800' }}>
                                                    {s.sector}
                                                </div>
                                            </div>
                                            {isSelected && <Check size={16} strokeWidth={3} />}
                                            {isOther && <Lock size={14} color="#64748b" />}
                                        </button>
                                    );
                                })}
                            </div>

                            {/* Unlocked Hint Revelation Box (퍼센트 수치 및 불필요한 '확실' 단어 제외) */}
                            {chosenStock && (
                                <div style={{
                                    background: 'linear-gradient(135deg, rgba(245, 158, 11, 0.18) 0%, rgba(217, 119, 6, 0.1) 100%)',
                                    border: '2px solid #f59e0b',
                                    borderRadius: '16px',
                                    padding: '18px 20px',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    gap: '10px',
                                    boxShadow: '0 8px 24px rgba(245, 158, 11, 0.25)'
                                }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                        <Sparkles size={20} color="#f59e0b" />
                                        <span style={{ fontSize: '1.05rem', fontWeight: '900', color: '#fbbf24' }}>
                                            [{chosenStock.key} {chosenStock.sector}] {nextYear}년 100% 특급 주식 정보
                                        </span>
                                    </div>

                                    <div style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '12px',
                                        padding: '10px 14px',
                                        borderRadius: '10px',
                                        background: targetIsUp ? 'rgba(239, 68, 68, 0.2)' : 'rgba(59, 130, 246, 0.2)',
                                        border: targetIsUp ? '1px solid #ef4444' : '1px solid #3b82f6'
                                    }}>
                                        <span style={{
                                            fontSize: '1.25rem',
                                            fontWeight: '900',
                                            color: targetIsUp ? '#f87171' : '#60a5fa'
                                        }}>
                                            {targetIsUp ? '▲ 주가 상승 (호재)' : '▼ 주가 하락 (악재)'}
                                        </span>
                                    </div>

                                    <div style={{ fontSize: '0.95rem', color: '#fde68a', lineHeight: '1.7', fontWeight: '600', whiteSpace: 'pre-line' }}>
                                        {targetNews?.vipHint 
                                            ? targetNews.vipHint
                                                .replace(/^🎯\s*/g, '')
                                                .replace(/\[\s*100%.*?\]\s*/g, '')
                                                .replace(/[+-]?\d+(~\d+)?%(\s*이상)?/g, '')
                                                .replace(/확실하게\s*/g, '')
                                                .replace(/확실한\s*/g, '')
                                                .replace(/\s{2,}/g, ' ')
                                                .trim()
                                            : targetNews?.content}
                                    </div>
                                    
                                    <div style={{ fontSize: '0.8rem', color: '#cbd5e1', paddingTop: '4px', borderTop: '1px dashed rgba(245, 158, 11, 0.3)' }}>
                                        💡 확인하신 특급 정보를 바탕으로 해당 종목의 매수/매도 전략을 수립해 보세요! (1종목 선택 완료됨)
                                    </div>
                                </div>
                            )}
                        </>
                    ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                            <div style={{
                                background: 'rgba(30, 41, 59, 0.7)',
                                border: '1px solid #334155',
                                borderRadius: '16px',
                                padding: '18px 20px',
                                display: 'flex',
                                flexDirection: 'column',
                                gap: '10px'
                            }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#38bdf8' }}>
                                    <AlertCircle size={22} />
                                    <h4 style={{ margin: 0, fontSize: '1.1rem', fontWeight: '900', color: '#f8fafc' }}>
                                        상승/하락 예측 결과: {hits}개 적중 (기준 미달)
                                    </h4>
                                </div>
                                <p style={{ margin: 0, fontSize: '0.95rem', color: '#cbd5e1', lineHeight: '1.6' }}>
                                    아쉽게도 뉴스 분석 예측에서 상승/하락 여부를 5개 이상 맞추지 못했습니다.<br />
                                    • <strong>내 적중 개수:</strong> <span style={{ color: '#38bdf8', fontWeight: '900' }}>{hits}개</span> / 10개 (기준: 5개 이상 적중 시 100% 특급 힌트 제공)<br /><br />
                                    아쉽지만 이번 연도에는 100% 특급 힌트가 제공되지 않습니다.<br />
                                    지금까지 확인하신 기업별 뉴스 이슈와 차트/재무 정보를 신중하게 종합하여 <strong>주식 투자를 마무리해 주세요!</strong>
                                </p>
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div style={{
                    padding: '16px 24px',
                    background: '#0b1120',
                    borderTop: '1px solid rgba(255, 255, 255, 0.08)',
                    display: 'flex',
                    justifyContent: 'flex-end',
                    gap: '10px'
                }}>
                    <button
                        onClick={onClose}
                        style={{
                            background: isQualified ? '#f59e0b' : '#334155',
                            color: isQualified ? '#1e293b' : '#ffffff',
                            border: 'none',
                            padding: '10px 22px',
                            borderRadius: '12px',
                            fontWeight: '900',
                            fontSize: '0.95rem',
                            cursor: 'pointer',
                            transition: 'all 0.15s ease'
                        }}
                    >
                        {isQualified ? '확인 완료 (투자 계속하기)' : '확인 (투자 마무리하기)'}
                    </button>
                </div>
            </div>
        </div>
    );
}

// =============================================================================
// 4. 서브 모니터 화면 컴포넌트 (StockGameScreenView) - 최적화된 3분할 파이낸셜 대시보드
// =============================================================================
export function StockGameScreenView({ 
    year = 2015, 
    stocks = STOCK_DATA_2026, 
    isPubliclyRevealed = false,
    toggleFullscreen,
    isFullscreen,
    allowAllNews = true,
    allowAllVipHint = false,
    predictions = {},
    predictionResults = null,
    portfolios = {},
    allOrdersModalOpen = false,
    pin = null,
    serverIp = '',
    publicUrl = ''
}) {
    const stockList = useMemo(() => Object.values(stocks), [stocks]);
    const sortedStocks = useMemo(() => [...stockList].sort((a, b) => a.key.localeCompare(b.key)), [stockList]);
    const [selectedNews, setSelectedNews] = useState(null);
    const [selectedSector, setSelectedSector] = useState(null);
    const [showScreenQrModal, setShowScreenQrModal] = useState(false);

    // A~J 10개 종목 뉴스 자동 순환 브로드캐스트 상태 (사용자 설정 가능: 기본 뉴스 10초 ➔ 시세판 10초 순환)
    const [newsDuration, setNewsDuration] = useState(10);
    const [boardDuration, setBoardDuration] = useState(10);
    const [isAutoCycling, setIsAutoCycling] = useState(false);
    const [cycleStockIdx, setCycleStockIdx] = useState(0);
    const [cyclePhase, setCyclePhase] = useState('NEWS'); // 'NEWS' | 'BOARD'
    const [cycleTimeLeft, setCycleTimeLeft] = useState(10);

    const targetJoinUrl = getParticipantJoinUrl(pin, publicUrl, serverIp);

    // A~J 10개 종목에 1:1 매칭되는 당해 연도 핵심 뉴스 10선
    const yearNewsList = useMemo(() => generateStockNewsForYear(year, stocks), [year, stocks]);

    // 뉴스 자동 순환 토글 (시작 / 정지)
    const handleToggleAutoCycle = () => {
        if (isAutoCycling) {
            setIsAutoCycling(false);
            setSelectedNews(null);
        } else {
            const firstStock = sortedStocks[0] || stockList[0];
            const firstNews = yearNewsList.find(n => n.stockKey === firstStock?.key) || yearNewsList[0];
            const initialNewsSec = Math.max(1, Number(newsDuration) || 10);
            setCycleStockIdx(0);
            setCyclePhase('NEWS');
            setCycleTimeLeft(initialNewsSec);
            setSelectedNews(firstNews || null);
            setIsAutoCycling(true);
        }
    };

    // 1초 단위 자동 순환 타이머 (뉴스 N초 -> 시세판 M초 무한 반복)
    useEffect(() => {
        if (!isAutoCycling) return;

        const timer = setInterval(() => {
            setCycleTimeLeft((prev) => {
                if (prev > 1) {
                    return prev - 1;
                }

                if (cyclePhase === 'NEWS') {
                    // 뉴스 종료 ➔ 시세판 확인 단계로 전환
                    setCyclePhase('BOARD');
                    setSelectedNews(null);
                    return Math.max(1, Number(boardDuration) || 10);
                } else {
                    // 시세판 종료 ➔ 다음 종목 뉴스 단계로 전환
                    const nextIdx = (cycleStockIdx + 1) % (sortedStocks.length || 10);
                    setCycleStockIdx(nextIdx);
                    setCyclePhase('NEWS');
                    const nextStock = sortedStocks[nextIdx] || stockList[nextIdx];
                    const nextNews = yearNewsList.find(n => n.stockKey === nextStock?.key) || null;
                    setSelectedNews(nextNews);
                    return Math.max(1, Number(newsDuration) || 10);
                }
            });
        }, 1000);

        return () => clearInterval(timer);
    }, [isAutoCycling, cyclePhase, cycleStockIdx, sortedStocks, stockList, yearNewsList, newsDuration, boardDuration]);

    // 서브모니터 화면 로컬 예측 및 힌트 모달 상태
    const [screenVotes, setScreenVotes] = useState({});
    const [rewardModalOpen, setRewardModalOpen] = useState(false);
    const [chosenHintStock, setChosenHintStock] = useState(null);
    const [showSectorDirectoryModal, setShowSectorDirectoryModal] = useState(false);
    const [isModalDismissed, setIsModalDismissed] = useState(false);

    useEffect(() => {
        if (allOrdersModalOpen) {
            setIsModalDismissed(false);
        }
    }, [allOrdersModalOpen]);

    const isAllOrdersOpen = Boolean(allOrdersModalOpen) && !isModalDismissed;

    // 통합 예측 상태 (서브모니터 자체 클릭 or 외부 predictions)
    const activePredictions = useMemo(() => {
        const merged = { ...screenVotes };
        if (predictions && typeof predictions === 'object') {
            Object.values(predictions).forEach(teamPred => {
                if (teamPred && typeof teamPred === 'object') {
                    Object.entries(teamPred).forEach(([k, v]) => {
                        if (!merged[k]) merged[k] = v;
                    });
                }
            });
        }
        return merged;
    }, [screenVotes, predictions]);

    // 등락 예측 버튼 클릭 핸들러
    const handleTogglePrediction = (stockKey, direction) => {
        const nextVotes = {
            ...screenVotes,
            [stockKey]: screenVotes[stockKey] === direction ? null : direction
        };
        setScreenVotes(nextVotes);

        try {
            const bc = new BroadcastChannel('quizrun_screen_sync');
            bc.postMessage({
                type: 'STOCK_GAME_PREDICT_VOTE',
                payload: { stockKey, direction: nextVotes[stockKey] }
            });
        } catch (e) {}
    };

    // 현재 예측 적중 개수 계산 (5개 이상 달성 확인)
    const screenHitsCount = useMemo(() => {
        let hits = 0;
        yearNewsList.forEach(news => {
            if (activePredictions[news.stockKey] === news.direction) {
                hits++;
            }
        });
        return hits;
    }, [yearNewsList, activePredictions]);

    const isQualifiedForHint = screenHitsCount >= 5 || (predictionResults && Object.values(predictionResults).some(r => r?.qualified));
    const totalVotedCount = Object.values(activePredictions).filter(Boolean).length;

    return (
        <div style={{
            width: '100%',
            height: '100vh',
            maxHeight: '100vh',
            background: 'linear-gradient(135deg, #090d16 0%, #0f172a 100%)',
            color: '#f8fafc',
            display: 'flex',
            flexDirection: 'column',
            padding: '12px 18px',
            boxSizing: 'border-box',
            fontFamily: "'Pretendard', 'Noto Sans KR', sans-serif", wordBreak: 'keep-all', overflowWrap: 'break-word',
            position: 'relative',
            overflow: 'hidden'
        }}>
            {/* Top Bar Header */}
            <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                paddingBottom: '10px',
                borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
                marginBottom: '10px'
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                    <div style={{
                        background: 'linear-gradient(135deg, #f43f5e 0%, #e11d48 100%)',
                        color: 'white',
                        padding: '6px 18px',
                        borderRadius: '12px',
                        fontSize: '1.25rem',
                        fontWeight: '900',
                        letterSpacing: '0.5px',
                        boxShadow: '0 4px 14px rgba(244, 63, 94, 0.35)'
                    }}>
                        {year === 2015 ? '2015년 대한민국 증시 현황판 📈' : `${year}년 대한민국 증시 현황판 📈`}
                    </div>
                    <div style={{
                        fontSize: '0.88rem',
                        color: '#94a3b8',
                        fontWeight: '700',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px'
                    }}>
                        <Radio size={14} color="#10b981" /> 실시간 시장 시세 연동 중
                    </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    {/* 뉴스 순환 시간 설정 및 시작 버튼 컨트롤 그룹 */}
                    <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        background: 'rgba(30, 41, 59, 0.75)',
                        border: '1.5px solid rgba(255, 255, 255, 0.15)',
                        padding: '3px 8px 3px 12px',
                        borderRadius: '12px',
                        boxShadow: '0 2px 8px rgba(0, 0, 0, 0.2)'
                    }}>
                        {/* 뉴스 팝업 지속 시간 조절 */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.82rem', fontWeight: '800', color: '#cbd5e1' }}>
                            <span>📰 뉴스</span>
                            <input
                                type="number"
                                min="1"
                                max="300"
                                value={newsDuration}
                                disabled={isAutoCycling}
                                onChange={(e) => {
                                    const val = parseInt(e.target.value, 10);
                                    setNewsDuration(isNaN(val) ? '' : Math.max(1, val));
                                }}
                                onBlur={() => {
                                    if (!newsDuration || newsDuration < 1) setNewsDuration(10);
                                }}
                                style={{
                                    width: '42px',
                                    padding: '3px 2px',
                                    textAlign: 'center',
                                    background: isAutoCycling ? 'rgba(15, 23, 42, 0.4)' : '#0f172a',
                                    border: '1px solid #475569',
                                    borderRadius: '6px',
                                    color: '#38bdf8',
                                    fontSize: '0.88rem',
                                    fontWeight: '900',
                                    outline: 'none'
                                }}
                                title="종목별 뉴스 팝업 표시 시간 (초 단위)"
                            />
                            <span style={{ fontSize: '0.78rem', color: '#94a3b8' }}>초</span>
                        </div>

                        <span style={{ color: 'rgba(255, 255, 255, 0.25)', fontWeight: 'bold' }}>|</span>

                        {/* 시세판 복귀 지속 시간 조절 */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.82rem', fontWeight: '800', color: '#cbd5e1' }}>
                            <span>📊 시세판</span>
                            <input
                                type="number"
                                min="1"
                                max="300"
                                value={boardDuration}
                                disabled={isAutoCycling}
                                onChange={(e) => {
                                    const val = parseInt(e.target.value, 10);
                                    setBoardDuration(isNaN(val) ? '' : Math.max(1, val));
                                }}
                                onBlur={() => {
                                    if (!boardDuration || boardDuration < 1) setBoardDuration(10);
                                }}
                                style={{
                                    width: '42px',
                                    padding: '3px 2px',
                                    textAlign: 'center',
                                    background: isAutoCycling ? 'rgba(15, 23, 42, 0.4)' : '#0f172a',
                                    border: '1px solid #475569',
                                    borderRadius: '6px',
                                    color: '#34d399',
                                    fontSize: '0.88rem',
                                    fontWeight: '900',
                                    outline: 'none'
                                }}
                                title="실시간 시세판 확인 시간 (초 단위)"
                            />
                            <span style={{ fontSize: '0.78rem', color: '#94a3b8' }}>초</span>
                        </div>

                        {/* 뉴스 자동 순환 브로드캐스트 버튼 */}
                        <button
                            onClick={handleToggleAutoCycle}
                            style={{
                                background: isAutoCycling 
                                    ? 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)' 
                                    : 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                                border: isAutoCycling ? '1.5px solid #f87171' : '1.5px solid #34d399',
                                borderRadius: '9px',
                                padding: '5px 12px',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '5px',
                                fontSize: '0.82rem',
                                fontWeight: '900',
                                color: '#ffffff',
                                boxShadow: isAutoCycling ? '0 0 14px rgba(239, 68, 68, 0.55)' : '0 2px 8px rgba(16, 185, 129, 0.3)',
                                transition: 'all 0.15s ease'
                            }}
                            title={isAutoCycling ? "뉴스 순환 방송 정지" : `A~J 종목별 뉴스 ${newsDuration}초 + 시세판 ${boardDuration}초 자동 순환 시작`}
                        >
                            {isAutoCycling ? (
                                <>
                                    <span style={{
                                        display: 'inline-block',
                                        width: '7px',
                                        height: '7px',
                                        borderRadius: '50%',
                                        background: '#ffffff',
                                        animation: 'ping 1s cubic-bezier(0, 0, 0.2, 1) infinite'
                                    }} />
                                    <span>⏹ 정지 ({cyclePhase === 'NEWS' ? `뉴스 ${cycleTimeLeft}s` : `시세판 ${cycleTimeLeft}s`})</span>
                                </>
                            ) : (
                                <>
                                    <span>▶</span>
                                    <span>뉴스시작</span>
                                </>
                            )}
                        </button>
                    </div>

                    {pin && (
                        <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            background: 'rgba(255, 255, 255, 0.08)',
                            border: '1px solid rgba(255, 255, 255, 0.18)',
                            padding: '4px 10px 4px 14px',
                            borderRadius: '12px',
                            fontSize: '0.92rem',
                            fontWeight: '800',
                            color: '#f8fafc'
                        }}>
                            <span>방 입장 코드: <span style={{ color: '#38bdf8', fontWeight: '900', letterSpacing: '1px' }}>{pin}</span></span>
                            <button
                                onClick={() => setShowScreenQrModal(true)}
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '6px',
                                    padding: '4px 8px',
                                    background: 'rgba(255, 255, 255, 0.16)',
                                    border: '1px solid rgba(255, 255, 255, 0.25)',
                                    borderRadius: '8px',
                                    cursor: 'pointer',
                                    fontSize: '0.78rem',
                                    fontWeight: 'bold',
                                    color: '#ffffff',
                                    transition: 'all 0.15s ease'
                                }}
                                title="QR 코드 크게 보기"
                            >
                                <div style={{ background: 'white', padding: '2px', borderRadius: '4px', display: 'flex' }}>
                                    <QRCode value={targetJoinUrl} size={22} />
                                </div>
                                <span>QR 접속</span>
                            </button>
                        </div>
                    )}

                    {/* 시장 섹터 도감 버튼 */}
                    <button
                        onClick={() => setShowSectorDirectoryModal(true)}
                        style={{
                            background: 'linear-gradient(135deg, #0284c7 0%, #0369a1 100%)',
                            border: '1px solid rgba(56, 189, 248, 0.4)',
                            borderRadius: '10px',
                            padding: '6px 12px',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px',
                            fontSize: '0.82rem',
                            fontWeight: 'bold',
                            color: '#ffffff',
                            boxShadow: '0 2px 8px rgba(2, 132, 199, 0.3)',
                            transition: 'all 0.15s ease'
                        }}
                    >
                        <Building2 size={14} />
                        <span>시장 섹터 도감</span>
                    </button>

                    {toggleFullscreen && (
                        <button
                            onClick={toggleFullscreen}
                            style={{
                                background: 'rgba(255, 255, 255, 0.1)',
                                border: '1px solid rgba(255, 255, 255, 0.2)',
                                borderRadius: '10px',
                                padding: '6px 12px',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '6px',
                                fontSize: '0.82rem',
                                fontWeight: 'bold',
                                color: '#f8fafc'
                            }}
                        >
                            {isFullscreen ? <Minimize size={14} /> : <Maximize size={14} />}
                            <span>{isFullscreen ? '창 모드' : '전체화면'}</span>
                        </button>
                    )}
                </div>
            </div>

            {/* 10대 종목 실시간 시세판 (1주당 가격) 단독 전체 표시 - 서브모니터 우측 진행방식&금액관리와 완벽 분리 */}
            <div style={{
                flex: 1,
                background: 'rgba(15, 23, 42, 0.7)',
                borderRadius: '16px',
                border: '1px solid rgba(255, 255, 255, 0.08)',
                padding: '14px 18px',
                display: 'flex',
                flexDirection: 'column',
                minHeight: 0,
                overflow: 'hidden'
            }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <BarChart3 size={20} color="#f43f5e" />
                        <h2 style={{ margin: 0, fontSize: '1.25rem', fontWeight: '900', color: '#f8fafc' }}>
                            10대 종목 실시간 시세판 (1주당 가격)
                        </h2>
                        <span style={{ fontSize: '0.8rem', color: '#94a3b8', fontWeight: '700', marginLeft: '6px' }}>
                            💡 종목 카드를 클릭하면 해당 종목의 핵심 뉴스를 확인할 수 있습니다.
                        </span>
                    </div>
                    {isPubliclyRevealed && (
                        <span style={{
                            background: '#10b981',
                            color: 'white',
                            padding: '3px 10px',
                            borderRadius: '10px',
                            fontSize: '0.8rem',
                            fontWeight: '800'
                        }}>
                            실명 공개됨
                        </span>
                    )}
                </div>

                {/* 자동 순환 시세판 대기 중 안내 배너 */}
                {isAutoCycling && cyclePhase === 'BOARD' && (
                    <div style={{
                        background: 'linear-gradient(90deg, rgba(30, 58, 138, 0.9) 0%, rgba(3, 105, 161, 0.9) 100%)',
                        border: '1.5px solid #38bdf8',
                        borderRadius: '12px',
                        padding: '8px 16px',
                        marginBottom: '8px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        color: '#ffffff',
                        boxShadow: '0 4px 16px rgba(56, 189, 248, 0.25)'
                    }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.92rem', fontWeight: '800' }}>
                            <span style={{ fontSize: '1.1rem' }}>📊</span>
                            <span>실시간 시세판 확인 중 (<strong style={{ color: '#fef08a', fontSize: '1.05rem' }}>{cycleTimeLeft}초</strong> 후 다음 뉴스 자동 전환)</span>
                        </div>
                        <div style={{ fontSize: '0.86rem', color: '#bae6fd', fontWeight: '700' }}>
                            다음 순서: <span style={{ color: '#fef08a', fontWeight: '900' }}>[{sortedStocks[(cycleStockIdx + 1) % (sortedStocks.length || 10)]?.key} {sortedStocks[(cycleStockIdx + 1) % (sortedStocks.length || 10)]?.sector}] 뉴스</span> ({newsDuration}초간 방송 예정)
                        </div>
                    </div>
                )}

                {/* Stock Cards Grid (2열 x 5행: 10개 종목 화면 전체 와이드 배치) */}
                <div style={{
                    flex: 1,
                    display: 'grid',
                    gridTemplateColumns: 'repeat(2, 1fr)',
                    gridTemplateRows: 'repeat(5, 1fr)',
                    gap: '10px',
                    minHeight: 0,
                    overflow: 'hidden'
                }}>
                    {stockList.map((item) => {
                        const curPrice = item.prices[year] ?? item.prices[2015];
                        const prevYear = year > 2015 ? year - 1 : 2015;
                        const prevPrice = item.prices[prevYear] ?? curPrice;
                        const diff = curPrice - prevPrice;
                        const pct = prevPrice > 0 ? ((diff / prevPrice) * 100).toFixed(1) : '0.0';
                        const isUp = diff > 0;
                        const isDown = diff < 0;

                        const displayName = isPubliclyRevealed
                            ? `${item.sectorDisplayName || `${item.key} ${item.sector}`} (${item.realName})`
                            : (item.sectorDisplayName || `${item.key} ${item.sector}`);

                        return (
                            <div
                                key={item.key}
                                onClick={() => {
                                    const news = yearNewsList.find(n => n.stockKey === item.key);
                                    if (news) {
                                        setSelectedNews(news);
                                    }
                                }}
                                style={{
                                    background: 'rgba(30, 41, 59, 0.75)',
                                    border: '1.5px solid rgba(255, 255, 255, 0.12)',
                                    borderRadius: '16px',
                                    padding: '10px 20px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'space-between',
                                    boxShadow: '0 4px 14px rgba(0,0,0,0.18)',
                                    cursor: 'pointer',
                                    transition: 'all 0.15s ease',
                                    userSelect: 'none'
                                }}
                                onMouseEnter={(e) => {
                                    e.currentTarget.style.borderColor = item.badgeColor || '#38bdf8';
                                    e.currentTarget.style.transform = 'translateY(-2px) scale(1.008)';
                                    e.currentTarget.style.background = 'rgba(51, 65, 85, 0.85)';
                                    e.currentTarget.style.boxShadow = `0 6px 18px ${item.badgeColor ? item.badgeColor + '40' : 'rgba(56, 189, 248, 0.25)'}`;
                                }}
                                onMouseLeave={(e) => {
                                    e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.12)';
                                    e.currentTarget.style.transform = 'translateY(0) scale(1)';
                                    e.currentTarget.style.background = 'rgba(30, 41, 59, 0.75)';
                                    e.currentTarget.style.boxShadow = '0 4px 14px rgba(0,0,0,0.18)';
                                }}
                                title={`${item.key} 종목 뉴스 보기 (클릭)`}
                            >
                                <div style={{ display: 'flex', alignItems: 'center', gap: '14px', minWidth: 0 }}>
                                    <div style={{
                                        width: '52px',
                                        height: '52px',
                                        minWidth: '52px',
                                        borderRadius: '14px',
                                        background: item.badgeColor || '#3b82f6',
                                        color: 'white',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        fontSize: '1.85rem',
                                        fontWeight: '900',
                                        boxShadow: `0 4px 12px ${item.badgeColor}50`
                                    }}>
                                        {item.key}
                                    </div>
                                    <div style={{ minWidth: 0 }}>
                                        <div style={{ fontSize: '1.75rem', fontWeight: '900', color: '#f8fafc', lineHeight: 1.2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                            {displayName}
                                        </div>
                                        <div style={{ fontSize: '1.05rem', color: '#94a3b8', fontWeight: '700', marginTop: '2px' }}>
                                            {item.sector}
                                        </div>
                                    </div>
                                </div>

                                <div style={{ textAlign: 'right', flexShrink: 0 }}>
                                    <div style={{ fontSize: '2.35rem', fontWeight: '900', color: '#ffffff', letterSpacing: '0.5px' }}>
                                        {curPrice.toLocaleString()}
                                        <span style={{ fontSize: '1.35rem', marginLeft: '3px', opacity: 0.85, fontWeight: '700' }}>원</span>
                                    </div>
                                    {year > 2015 && (
                                        <div style={{
                                            fontSize: '1.2rem',
                                            fontWeight: '900',
                                            color: isUp ? '#f43f5e' : (isDown ? '#38bdf8' : '#94a3b8'),
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'flex-end',
                                            gap: '4px',
                                            marginTop: '2px'
                                        }}>
                                            {isUp && <ArrowUpRight size={18} />}
                                            {isDown && <ArrowDownRight size={18} />}
                                            <span>{diff > 0 ? `+${diff.toLocaleString()}` : diff.toLocaleString()}원</span>
                                            <span>({diff > 0 ? `+${pct}` : pct}%)</span>
                                        </div>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* Modals */}
            {selectedNews && (
                <StockNewsModal
                    newsItem={selectedNews}
                    currentYear={year}
                    onClose={() => {
                        setSelectedNews(null);
                        if (isAutoCycling) setIsAutoCycling(false);
                    }}
                    hasVipHint={allowAllVipHint}
                    isHost={false}
                    stocks={stocks}
                    autoCycleTimeLeft={isAutoCycling && cyclePhase === 'NEWS' ? cycleTimeLeft : null}
                />
            )}

            {selectedSector && (
                <SectorDetailModal
                    sector={selectedSector}
                    onClose={() => setSelectedSector(null)}
                    allStocks={KOREA_TOP_100_STOCKS}
                    isPubliclyRevealed={isPubliclyRevealed}
                />
            )}

            {showSectorDirectoryModal && (
                <SectorDirectoryModal
                    onClose={() => setShowSectorDirectoryModal(false)}
                    allStocks={stockList}
                    isPubliclyRevealed={isPubliclyRevealed}
                />
            )}

            <AllOrdersResultModal
                isOpen={isAllOrdersOpen}
                onClose={() => setIsModalDismissed(true)}
                currentYear={year}
                portfolios={portfolios}
                stockList={stockList}
                teamList={Object.entries(portfolios || {}).map(([id, p]) => ({ id, name: p?.nickname || `${id}조` }))}
            />

            <SpecialHintRewardModal
                isOpen={rewardModalOpen}
                onClose={() => setRewardModalOpen(false)}
                hits={screenHitsCount}
                total={10}
                currentYear={year}
                stocks={stocks}
                selectedStockKey={chosenHintStock}
                onSelectStock={(key) => {
                    if (!chosenHintStock) setChosenHintStock(key);
                }}
            />

            {/* 서브 모니터 QR 코드 확대 모달 */}
            {showScreenQrModal && pin && (
                <div style={{
                    position: 'fixed',
                    inset: 0,
                    backgroundColor: 'rgba(0, 0, 0, 0.75)',
                    backdropFilter: 'blur(8px)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    zIndex: 9999,
                    animation: 'fadeIn 0.2s ease-out'
                }} onClick={() => setShowScreenQrModal(false)}>
                    <div style={{
                        background: '#1e293b',
                        color: 'white',
                        borderRadius: '24px',
                        padding: '32px',
                        maxWidth: '440px',
                        width: '90%',
                        textAlign: 'center',
                        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.6)',
                        border: '1px solid rgba(255, 255, 255, 0.15)',
                        position: 'relative'
                    }} onClick={e => e.stopPropagation()}>
                        <button
                            onClick={() => setShowScreenQrModal(false)}
                            style={{
                                position: 'absolute',
                                top: '16px',
                                right: '16px',
                                background: 'rgba(255, 255, 255, 0.1)',
                                border: 'none',
                                borderRadius: '50%',
                                width: '36px',
                                height: '36px',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                color: '#94a3b8'
                            }}
                        >
                            <X size={20} />
                        </button>
                        <h3 style={{ fontSize: '1.4rem', fontWeight: '900', color: '#f8fafc', marginBottom: '8px' }}>
                            📱 참여자 재접속 QR 코드
                        </h3>
                        <p style={{ fontSize: '0.9rem', color: '#94a3b8', marginBottom: '20px', lineHeight: 1.5 }}>
                            인터넷 창을 실수로 닫았거나 뒤로 가기를 누른 경우,<br/>
                            QR 코드를 스캔하면 기존 상태 그대로 즉시 재접속됩니다!
                        </p>
                        <div style={{
                            background: 'white',
                            padding: '20px',
                            borderRadius: '16px',
                            display: 'inline-block',
                            boxShadow: '0 8px 24px rgba(0,0,0,0.3)',
                            marginBottom: '18px'
                        }}>
                            <QRCode
                                value={targetJoinUrl}
                                size={220}
                                style={{ height: 'auto', maxWidth: '100%', width: '100%' }}
                                viewBox="0 0 220 220"
                            />
                        </div>
                        <div style={{
                            background: 'rgba(56, 189, 248, 0.1)',
                            border: '1px solid rgba(56, 189, 248, 0.3)',
                            borderRadius: '12px',
                            padding: '10px 14px',
                            fontSize: '0.95rem',
                            fontWeight: 'bold',
                            color: '#38bdf8',
                            marginBottom: '12px'
                        }}>
                            방 입장 코드: <span style={{ fontSize: '1.3rem', color: '#ffffff', fontWeight: '900', letterSpacing: '2px' }}>{pin}</span>
                        </div>
                        <div style={{ fontSize: '0.78rem', color: '#64748b', wordBreak: 'break-all' }}>
                            {targetJoinUrl}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}


// =============================================================================
// 모달 컴포넌트: 모든 주문 체결 확정 및 자산 정산 결과 보고서 (AllOrdersResultModal)
// =============================================================================
export function AllOrdersResultModal({ isOpen, onClose, currentYear, portfolios, stockList, teamList }) {
    if (!isOpen) return null;

    const baseTeams = (teamList && teamList.length > 0)
        ? teamList
        : Object.keys(portfolios || {}).map(id => ({ id, name: `${id}조` }));

    // 전체 참여자 자산 데이터 집계 및 정산 계산
    const processedTeams = baseTeams.map((team) => {
        const p = getTeamPortfolio(team, portfolios);
        let stockVal = 0;
        const holdingsDetails = [];
        (stockList || []).forEach(s => {
            const q = p.holdings?.[s.key] || 0;
            const price = s.prices ? (s.prices[currentYear] ?? s.prices[2015] ?? 0) : 0;
            const evalAmt = q * price;
            stockVal += evalAmt;
            if (q > 0) {
                holdingsDetails.push({ key: s.key, sector: s.sector, realName: s.realName, qty: q, price, evalAmt });
            }
        });
        const cashVal = p.cash !== undefined ? p.cash : 1000000;
        const totalAssetVal = cashVal + stockVal;
        const seedMoney = p.seedMoney || 1000000;
        const returnRate = seedMoney > 0 ? (((totalAssetVal - seedMoney) / seedMoney) * 100).toFixed(1) : '0.0';

        return {
            team,
            targetKey: String(team.id || team.name),
            p,
            stockVal,
            holdingsDetails,
            cashVal,
            totalAssetVal,
            seedMoney,
            returnRate
        };
    });

    // 총 자산 가치 기준 내림차순 순위 정렬 (1위, 2위, 3위...)
    const sortedTeams = [...processedTeams].sort((a, b) => b.totalAssetVal - a.totalAssetVal);

    const getRankBadge = (rankIdx) => {
        if (rankIdx === 0) return { label: '🥇 1위 (최고 수익)', bg: 'linear-gradient(135deg, #f59e0b, #d97706)', color: '#1e293b' };
        if (rankIdx === 1) return { label: '🥈 2위', bg: 'linear-gradient(135deg, #94a3b8, #64748b)', color: '#0f172a' };
        if (rankIdx === 2) return { label: '🥉 3위', bg: 'linear-gradient(135deg, #b45309, #78350f)', color: '#fef3c7' };
        return { label: `#${rankIdx + 1}위`, bg: '#334155', color: '#cbd5e1' };
    };

    return (
        <div style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0, 0, 0, 0.78)',
            backdropFilter: 'blur(8px)',
            zIndex: 999999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '20px'
        }}>
            <div style={{
                background: '#0f172a',
                border: '2px solid #38bdf8',
                borderRadius: '24px',
                padding: '28px',
                maxWidth: '860px',
                width: '100%',
                maxHeight: '88vh',
                overflowY: 'auto',
                boxShadow: '0 25px 60px rgba(0,0,0,0.6)',
                color: '#f8fafc',
                display: 'flex',
                flexDirection: 'column',
                gap: '18px',
                fontFamily: "'Pretendard', sans-serif"
            }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #1e293b', paddingBottom: '14px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <Trophy size={26} color="#f59e0b" />
                        <h2 style={{ margin: 0, fontSize: '1.4rem', fontWeight: '900', color: '#ffffff' }}>
                            🏆 {currentYear}년 모든 참여자 주문 체결 및 투자 정산 결과 (실시간 순위)
                        </h2>
                    </div>
                    <button
                        onClick={onClose}
                        style={{ background: '#334155', color: 'white', border: 'none', borderRadius: '10px', padding: '6px 14px', cursor: 'pointer', fontWeight: 'bold' }}
                    >
                        ✕ 닫기
                    </button>
                </div>

                <div style={{ fontSize: '0.88rem', color: '#94a3b8', background: '#1e293b', padding: '10px 14px', borderRadius: '10px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
                    <span>💡 <strong>금융 정산 보고서:</strong> 각 참여자의 체결 결과가 반영되어 <strong>[예수금]</strong>과 <strong>[보유 주식 가치]</strong>로 확정 집계되었습니다.</span>
                    <span style={{ color: '#38bdf8', fontWeight: '800' }}>총 {sortedTeams.length}개 팀/참여자 집계 완료</span>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                    {sortedTeams.map((item, idx) => {
                        const { team, targetKey, stockVal, holdingsDetails, cashVal, totalAssetVal, returnRate } = item;
                        const rankBadge = getRankBadge(idx);
                        const retNum = Number(returnRate);

                        return (
                            <div key={targetKey} style={{
                                background: idx === 0 ? 'linear-gradient(135deg, rgba(245, 158, 11, 0.12) 0%, #1e293b 100%)' : '#1e293b',
                                border: idx === 0 ? '2px solid #f59e0b' : '1px solid #334155',
                                borderRadius: '16px',
                                padding: '18px',
                                display: 'flex',
                                flexDirection: 'column',
                                gap: '12px',
                                boxShadow: idx === 0 ? '0 4px 20px rgba(245, 158, 11, 0.2)' : 'none'
                            }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                        <span style={{
                                            background: rankBadge.bg,
                                            color: rankBadge.color,
                                            padding: '4px 12px',
                                            borderRadius: '10px',
                                            fontSize: '0.9rem',
                                            fontWeight: '900'
                                        }}>
                                            {rankBadge.label}
                                        </span>
                                        <span style={{ fontSize: '1.2rem', fontWeight: '900', color: '#f8fafc' }}>
                                            {team.name}
                                        </span>
                                    </div>
                                    <div style={{
                                        fontSize: '0.95rem',
                                        fontWeight: '900',
                                        color: retNum >= 0 ? '#f43f5e' : '#38bdf8',
                                        background: 'rgba(0,0,0,0.3)',
                                        padding: '4px 14px',
                                        borderRadius: '8px',
                                        border: retNum >= 0 ? '1px solid rgba(244, 63, 94, 0.3)' : '1px solid rgba(56, 189, 248, 0.3)'
                                    }}>
                                        누적 수익률: {retNum >= 0 ? `+${returnRate}%` : `${returnRate}%`}
                                    </div>
                                </div>

                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px', background: '#0f172a', padding: '14px', borderRadius: '12px' }}>
                                    <div>
                                        <div style={{ fontSize: '0.78rem', color: '#94a3b8', marginBottom: '2px' }}>💰 총 자산 가치</div>
                                        <div style={{ fontSize: '1.2rem', fontWeight: '900', color: '#ffffff' }}>
                                            {formatKoreanMoney(totalAssetVal)}
                                        </div>
                                    </div>
                                    <div>
                                        <div style={{ fontSize: '0.78rem', color: '#94a3b8', marginBottom: '2px' }}>💵 보유 예수금 (현금)</div>
                                        <div style={{ fontSize: '1.2rem', fontWeight: '900', color: '#10b981' }}>
                                            {formatKoreanMoney(cashVal)}
                                        </div>
                                    </div>
                                    <div>
                                        <div style={{ fontSize: '0.78rem', color: '#94a3b8', marginBottom: '2px' }}>📈 주식 평가금액</div>
                                        <div style={{ fontSize: '1.2rem', fontWeight: '900', color: '#f59e0b' }}>
                                            {formatKoreanMoney(stockVal)}
                                        </div>
                                    </div>
                                </div>

                                <div style={{ fontSize: '0.82rem', color: '#cbd5e1', background: 'rgba(255,255,255,0.03)', padding: '8px 12px', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '6px' }}>
                                    <div>
                                        <strong style={{ color: '#f8fafc', marginRight: '6px' }}>보유 주식 포트폴리오:</strong>
                                        {holdingsDetails.length > 0 ? (
                                            <span style={{ color: '#93c5fd' }}>
                                                {holdingsDetails.map(h => `[${h.key}] ${h.sector} ${h.qty}주 (${h.evalAmt.toLocaleString()}원)`).join(' · ')}
                                            </span>
                                        ) : (
                                            <span style={{ color: '#64748b' }}>보유 주식 없음 (100% 예수금 보유 중)</span>
                                        )}
                                    </div>
                                    {holdingsDetails.length > 0 && (
                                        <span style={{ color: '#38bdf8', fontWeight: 'bold' }}>
                                            총 {holdingsDetails.reduce((acc, h) => acc + h.qty, 0)}주 보유
                                        </span>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '10px' }}>
                    <button
                        onClick={onClose}
                        style={{
                            background: 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)',
                            color: 'white',
                            border: 'none',
                            borderRadius: '12px',
                            padding: '12px 32px',
                            fontSize: '1rem',
                            fontWeight: '900',
                            cursor: 'pointer',
                            boxShadow: '0 4px 14px rgba(59, 130, 246, 0.4)'
                        }}
                    >
                        ✓ 정산 확인 완료
                    </button>
                </div>
            </div>
        </div>
    );
}


// =============================================================================
// 4. 호스트 관리 컴포넌트 (StockGameHost) - 세련된 트레이딩 터미널 대시보드
// =============================================================================
export function StockGameHost({ socket, pin, participants = [] }) {
    const { scores: contextScores, setExactScore } = useGlobalSession();

    // 100개 기업 중 10개 랜덤 선택 상태 (게임 시작 시 항상 신규 랜덤 추출)
    const [activeStocks, setActiveStocks] = useState(() => {
        const newStocks = generateRandom10Stocks();
        try {
            sessionStorage.setItem('stock_game_active_stocks', JSON.stringify(newStocks));
        } catch (e) {}
        return newStocks;
    });

    const stockList = useMemo(() => Object.values(activeStocks), [activeStocks]);

    // 실시간 참여자 목록 (소켓 실시간 업데이트 반영)
    const [liveParticipants, setLiveParticipants] = useState(participants || []);

    useEffect(() => {
        if (participants && participants.length > 0) {
            setLiveParticipants(participants);
        }
    }, [participants]);

    // 현재 진행 연도 (2015 ~ 2025)
    const [currentYear, setCurrentYear] = useState(2015);
    const [selectedTeamId, setSelectedTeamId] = useState('1');
    const [hostPeekNames, setHostPeekNames] = useState(false);
    const [isPubliclyRevealed, setIsPubliclyRevealed] = useState(false);
    
    // 모달 관리
    const [selectedNews, setSelectedNews] = useState(null);
    const [selectedSector, setSelectedSector] = useState(null);
    const [showSectorDirectoryModal, setShowSectorDirectoryModal] = useState(false);
    const [allOrdersModalOpen, setAllOrdersModalOpen] = useState(false);
    const [showHostQrModal, setShowHostQrModal] = useState(false);
    const [activeTab, setActiveTab] = useState('decision'); // 'decision' (주문표) | 'matrix' (전체 현황표)

    // 메인/서브 모니터 주식게임 동기화 상태 유지
    useEffect(() => {
        try {
            localStorage.setItem('quizrun_active_game_id', 'stock_game');
            const bc = new BroadcastChannel('quizrun_screen_sync');
            bc.postMessage({ type: 'MODE_CHANGE', payload: { mode: 'stock_game' } });
            setTimeout(() => bc.close(), 300);
        } catch (e) {}
        return () => {
            try {
                localStorage.removeItem('quizrun_active_game_id');
                const bc = new BroadcastChannel('quizrun_screen_sync');
                bc.postMessage({ type: 'MODE_CHANGE', payload: { mode: 'home' } });
                setTimeout(() => bc.close(), 300);
            } catch (e) {}
        };
    }, []);
    
    // 권한 관리 (전체 토글 및 조별 개별 토글)
    const [allowAllNews, setAllowAllNews] = useState(true);
    const [allowAllVipHint, setAllowAllVipHint] = useState(false);
    const [permissions, setPermissions] = useState({});

    // 참여자/팀별 뉴스 분석 등락 예측 상태 및 결과
    const [predictions, setPredictions] = useState({}); // { [teamId]: { [stockKey]: 'UP' | 'DOWN' } }
    const [predictionResults, setPredictionResults] = useState({}); // { [teamId]: { hits, total, qualified, year } }

    // 참여자 100% 특별 힌트 선택 열람 현황 (메인 모니터 단독 표시용)
    const [hostVipHints, setHostVipHints] = useState({}); // { [teamId]: { nickname, stockKey, year, timestamp } }

    // 참여자 실시간 활동 진행 상황 (뉴스 확인, 예측 투표 등)
    const [participantActivities, setParticipantActivities] = useState({});

    // 주문 입력 폼: { [stockKey]: number }
    const [orderInputs, setOrderInputs] = useState({
        A: 0, B: 0, C: 0, D: 0, E: 0, F: 0, G: 0, H: 0, I: 0, J: 0
    });

    // 참여자 리스트 생성 (온라인: liveParticipants, 오프라인: contextScores 기반 동적 인원수)
    const teamList = useMemo(() => {
        if (liveParticipants && liveParticipants.length > 0) {
            return liveParticipants.map((p, idx) => ({
                id: String(p.id || p.nickname || p.groupId || idx + 1),
                name: p.nickname || `${p.groupId || idx + 1}조`,
                initialSeed: p.score && p.score > 0 ? p.score : 1000000
            }));
        }
        const offlineCount = (contextScores && contextScores.length > 0) ? contextScores.length : 8;
        return Array.from({ length: offlineCount }, (_, i) => {
            const teamNum = i + 1;
            const ctxScore = contextScores?.find(s => String(s.num) === String(teamNum))?.score;
            return {
                id: String(teamNum),
                name: `${teamNum}번`,
                initialSeed: ctxScore && ctxScore > 0 ? ctxScore : 1000000
            };
        });
    }, [liveParticipants, contextScores]);

    // 전체 조별 포트폴리오
    const [portfolios, setPortfolios] = useState(() => {
        const initial = {};
        Array.from({ length: 12 }, (_, i) => String(i + 1)).forEach(id => {
            const ctxScore = contextScores?.find(s => String(s.num) === id)?.score;
            const seed = ctxScore && ctxScore > 0 ? ctxScore : 1000000;
            initial[id] = {
                seedMoney: seed,
                cash: seed,
                holdings: { A: 0, B: 0, C: 0, D: 0, E: 0, F: 0, G: 0, H: 0, I: 0, J: 0 },
                history: {
                    2015: { asset: seed, rank: 1, returnRate: 0 }
                }
            };
        });
        return initial;
    });

    // 우측 점수/금액 관리 바와 초기 투자금 실시간 연동 (단일 수정 및 일괄 지정 동기화)
    useEffect(() => {
        let seedBc;
        try {
            seedBc = new BroadcastChannel('quizrun_stock_seed_sync');
            seedBc.onmessage = (event) => {
                if (event.data?.type === 'BULK_SET_SEED') {
                    const newAmount = Number(event.data.amount) || 1000000;
                    setPortfolios(prev => {
                        const updated = { ...prev };
                        Object.keys(updated).forEach(k => {
                            updated[k] = {
                                ...updated[k],
                                seedMoney: newAmount,
                                cash: newAmount,
                                history: {
                                    ...(updated[k]?.history || {}),
                                    2015: { asset: newAmount, rank: 1, returnRate: 0 }
                                }
                            };
                        });
                        return updated;
                    });
                } else if (event.data?.type === 'SINGLE_SET_SEED') {
                    const { id, amount } = event.data;
                    const newAmount = Number(amount) || 0;
                    setPortfolios(prev => {
                        const targetKey = String(id);
                        const existing = prev[targetKey] || {
                            seedMoney: newAmount,
                            cash: newAmount,
                            holdings: { A: 0, B: 0, C: 0, D: 0, E: 0, F: 0, G: 0, H: 0, I: 0, J: 0 },
                            history: { 2015: { asset: newAmount, rank: 1, returnRate: 0 } }
                        };
                        return {
                            ...prev,
                            [targetKey]: {
                                ...existing,
                                seedMoney: newAmount,
                                cash: newAmount,
                                history: {
                                    ...(existing.history || {}),
                                    2015: { asset: newAmount, rank: 1, returnRate: 0 }
                                }
                            }
                        };
                    });
                }
            };
        } catch (e) {}
        return () => {
            if (seedBc) try { seedBc.close(); } catch (e) {}
        };
    }, []);

    // 서브 모니터 및 브로드캐스트 채널
    const channelRef = useRef(null);

    // 실시간 상태 ref (이벤트 리스너 및 브로드캐스트 내 클로저 최신성 100% 보장)
    const stateRef = useRef({
        currentYear,
        activeStocks,
        isPubliclyRevealed,
        portfolios,
        permissions,
        allowAllNews,
        allowAllVipHint,
        predictions,
        predictionResults,
        allOrdersModalOpen,
        pin
    });

    stateRef.current = {
        currentYear,
        activeStocks,
        isPubliclyRevealed,
        portfolios,
        permissions,
        allowAllNews,
        allowAllVipHint,
        predictions,
        predictionResults,
        allOrdersModalOpen,
        pin
    };

    const broadcastStockState = (overrides = {}) => {
        const cur = stateRef.current;
        if (overrides.year !== undefined) cur.currentYear = overrides.year;
        if (overrides.stocks !== undefined) cur.activeStocks = overrides.stocks;
        if (overrides.isPubliclyRevealed !== undefined) cur.isPubliclyRevealed = overrides.isPubliclyRevealed;
        if (overrides.portfolios !== undefined) cur.portfolios = overrides.portfolios;
        if (overrides.permissions !== undefined) cur.permissions = overrides.permissions;
        if (overrides.allowAllNews !== undefined) cur.allowAllNews = overrides.allowAllNews;
        if (overrides.allowAllVipHint !== undefined) cur.allowAllVipHint = overrides.allowAllVipHint;
        if (overrides.predictions !== undefined) cur.predictions = overrides.predictions;
        if (overrides.predictionResults !== undefined) cur.predictionResults = overrides.predictionResults;
        if (overrides.allOrdersModalOpen !== undefined) cur.allOrdersModalOpen = overrides.allOrdersModalOpen;

        const payload = {
            pin: cur.pin || pin,
            year: cur.currentYear,
            stocks: cur.activeStocks,
            isPubliclyRevealed: cur.isPubliclyRevealed,
            portfolios: cur.portfolios,
            permissions: cur.permissions,
            allowAllNews: cur.allowAllNews,
            allowAllVipHint: cur.allowAllVipHint,
            predictions: cur.predictions,
            predictionResults: cur.predictionResults,
            allOrdersModalOpen: cur.allOrdersModalOpen
        };

        try {
            if (!channelRef.current) {
                channelRef.current = new BroadcastChannel('quizrun_screen_sync');
            }
            channelRef.current.postMessage({
                type: 'STOCK_GAME_SCREEN_UPDATE',
                payload
            });
            channelRef.current.postMessage({
                type: 'MODE_CHANGE',
                payload: { mode: 'stock_game' }
            });
        } catch (e) {
            console.warn('BroadcastChannel error:', e);
        }

        if (socket && pin) {
            socket.emit('room:message', {
                pin,
                event: 'stock_game:state_sync',
                payload
            });
            socket.emit('stock_game:state_sync', {
                pin,
                ...payload
            });
        }
    };

    useEffect(() => {
        let channel;
        try {
            channel = new BroadcastChannel('quizrun_screen_sync');
            channelRef.current = channel;
            channel.onmessage = (event) => {
                if (event.data?.type === 'SCREEN_PING') {
                    broadcastStockState();
                } else if (event.data?.type === 'STOCK_GAME_PREDICT_VOTE' && event.data.payload) {
                    const { teamId, stockKey, direction } = event.data.payload;
                    const targetTeam = teamId || selectedTeamId || '1';
                    setPredictions(prev => {
                        const next = {
                            ...prev,
                            [targetTeam]: {
                                ...(prev[targetTeam] || {}),
                                [stockKey]: direction
                            }
                        };
                        broadcastStockState({ predictions: next });
                        return next;
                    });
                } else if (event.data?.type === 'STOCK_GAME_EXECUTE_ORDER' && event.data.payload) {
                    const { teamId, nickname, cash, holdings } = event.data.payload;
                    const strTeamId = teamId ? String(teamId) : '';
                    const strNick = nickname ? String(nickname) : '';
                    setPortfolios(prev => {
                        const existing = (strTeamId && prev[strTeamId]) || (strNick && prev[strNick]) || {
                            seedMoney: 1000000,
                            cash: 1000000,
                            holdings: { A: 0, B: 0, C: 0, D: 0, E: 0, F: 0, G: 0, H: 0, I: 0, J: 0 },
                            history: {}
                        };
                        const updated = {
                            ...existing,
                            teamId: strTeamId || existing.teamId,
                            nickname: strNick || existing.nickname,
                            cash: cash !== undefined ? cash : existing.cash,
                            holdings: holdings || existing.holdings
                        };
                        const nextP = { ...prev };
                        if (strTeamId) nextP[strTeamId] = updated;
                        if (strNick) nextP[strNick] = updated;
                        if (liveParticipants && Array.isArray(liveParticipants)) {
                            liveParticipants.forEach(p => {
                                const pId = String(p.id || '');
                                const pNick = String(p.nickname || '');
                                const pGroup = String(p.groupId || '');
                                if ((strTeamId && (pId === strTeamId || pGroup === strTeamId)) ||
                                    (strNick && (pNick === strNick || pId === strNick))) {
                                    if (pId) nextP[pId] = updated;
                                    if (pNick) nextP[pNick] = updated;
                                    if (pGroup) nextP[pGroup] = updated;
                                }
                            });
                        }
                        broadcastStockState({ portfolios: nextP });
                        return nextP;
                    });
                } else if (event.data?.type === 'STOCK_GAME_VIP_HINT_SELECTED' && event.data.payload) {
                    const { teamId, nickname, stockKey, year } = event.data.payload;
                    const key = teamId || nickname || '1';
                    setHostVipHints(prev => ({
                        ...prev,
                        [key]: {
                            teamId: key,
                            nickname: nickname || key,
                            stockKey,
                            year: year || currentYear,
                            timestamp: new Date().toLocaleTimeString()
                        }
                    }));
                } else if (event.data?.type === 'STOCK_GAME_PARTICIPANT_ACTIVITY' && event.data.payload) {
                    const { teamId, nickname, action, stockKey, direction } = event.data.payload;
                    const key = teamId || nickname || '1';
                    setParticipantActivities(prev => {
                        const existing = prev[key] || { newsRead: [], predictionsCount: 0, tradesCount: 0, lastAction: '' };
                        let nextNews = [...(existing.newsRead || [])];
                        let nextPreds = existing.predictionsCount || 0;
                        let nextTrades = existing.tradesCount || 0;
                        let lastAction = '';

                        if (action === 'READ_NEWS' && stockKey) {
                            if (!nextNews.includes(stockKey)) nextNews.push(stockKey);
                            lastAction = `[${stockKey}] 뉴스 확인`;
                        } else if (action === 'PREDICT') {
                            nextPreds++;
                            lastAction = `[${stockKey}] ${direction === 'UP' ? '상승' : '하락'} 예측`;
                        } else if (action === 'TRADE') {
                            nextTrades++;
                            lastAction = `[${stockKey}] 매매 체결`;
                        }

                        return {
                            ...prev,
                            [key]: {
                                ...existing,
                                nickname: nickname || key,
                                newsRead: nextNews,
                                predictionsCount: nextPreds,
                                tradesCount: nextTrades,
                                lastAction,
                                lastTime: new Date().toLocaleTimeString()
                            }
                        };
                    });
                }
            };
        } catch (e) {}

        if (socket) {
            const handlePredictMsg = (msg) => {
                const data = msg.payload || msg;
                if (data && data.stockKey) {
                    const targetTeam = data.teamId || '1';
                    setPredictions(prev => {
                        const next = {
                            ...prev,
                            [targetTeam]: {
                                ...(prev[targetTeam] || {}),
                                [data.stockKey]: data.direction
                            }
                        };
                        broadcastStockState({ predictions: next });
                        return next;
                    });
                }
            };
            const handleExecuteOrderMsg = (data) => {
                const payload = data.payload || data;
                if (payload && (payload.teamId || payload.nickname)) {
                    const strTeamId = payload.teamId ? String(payload.teamId) : '';
                    const strNick = payload.nickname ? String(payload.nickname) : '';
                    setPortfolios(prev => {
                        const existing = (strTeamId && prev[strTeamId]) || (strNick && prev[strNick]) || {
                            seedMoney: 1000000,
                            cash: 1000000,
                            holdings: { A: 0, B: 0, C: 0, D: 0, E: 0, F: 0, G: 0, H: 0, I: 0, J: 0 },
                            history: {}
                        };
                        const updated = {
                            ...existing,
                            teamId: strTeamId || existing.teamId,
                            nickname: strNick || existing.nickname,
                            cash: payload.cash !== undefined ? payload.cash : existing.cash,
                            holdings: payload.holdings || existing.holdings
                        };
                        const nextP = { ...prev };
                        if (strTeamId) nextP[strTeamId] = updated;
                        if (strNick) nextP[strNick] = updated;
                        if (liveParticipants && Array.isArray(liveParticipants)) {
                            liveParticipants.forEach(p => {
                                const pId = String(p.id || '');
                                const pNick = String(p.nickname || '');
                                const pGroup = String(p.groupId || '');
                                if ((strTeamId && (pId === strTeamId || pGroup === strTeamId)) ||
                                    (strNick && (pNick === strNick || pId === strNick))) {
                                    if (pId) nextP[pId] = updated;
                                    if (pNick) nextP[pNick] = updated;
                                    if (pGroup) nextP[pGroup] = updated;
                                }
                            });
                        }
                        broadcastStockState({ portfolios: nextP });
                        return nextP;
                    });
                }
            };
            const handleVipHintMsg = (msg) => {
                const data = msg.payload || msg;
                if (data && (data.teamId || data.nickname)) {
                    const teamKey = data.teamId || data.nickname || '1';
                    setHostVipHints(prev => ({
                        ...prev,
                        [teamKey]: {
                            teamId: teamKey,
                            nickname: data.nickname || teamKey,
                            stockKey: data.stockKey,
                            year: data.year || currentYear,
                            timestamp: new Date().toLocaleTimeString()
                        }
                    }));
                }
            };
            const handleActivityMsg = (msg) => {
                const data = msg.payload || msg;
                if (data && (data.teamId || data.nickname)) {
                    const teamKey = data.teamId || data.nickname || '1';
                    setParticipantActivities(prev => {
                        const existing = prev[teamKey] || { newsRead: [], predictionsCount: 0, tradesCount: 0, lastAction: '' };
                        let nextNews = [...(existing.newsRead || [])];
                        let nextPreds = existing.predictionsCount || 0;
                        let nextTrades = existing.tradesCount || 0;
                        let lastAction = '';

                        if (data.action === 'READ_NEWS' && data.stockKey) {
                            if (!nextNews.includes(data.stockKey)) nextNews.push(data.stockKey);
                            lastAction = `[${data.stockKey}] 뉴스 확인`;
                        } else if (data.action === 'PREDICT') {
                            nextPreds++;
                            lastAction = `[${data.stockKey}] ${data.direction === 'UP' ? '상승' : '하락'} 예측`;
                        } else if (data.action === 'TRADE') {
                            nextTrades++;
                            lastAction = `[${data.stockKey}] 매매 체결`;
                        }

                        return {
                            ...prev,
                            [teamKey]: {
                                ...existing,
                                nickname: data.nickname || teamKey,
                                newsRead: nextNews,
                                predictionsCount: nextPreds,
                                tradesCount: nextTrades,
                                lastAction,
                                lastTime: new Date().toLocaleTimeString()
                            }
                        };
                    });
                }
            };
            const handleParticipantsUpdated = (list) => {
                if (list && Array.isArray(list)) {
                    setLiveParticipants(list);
                    setPortfolios(prev => {
                        const next = { ...prev };
                        let modified = false;
                        list.forEach((p, idx) => {
                            const key = String(p.id || p.nickname || p.groupId || idx + 1);
                            if (!next[key]) {
                                const seed = p.score && p.score > 0 ? p.score : 1000000;
                                next[key] = {
                                    seedMoney: seed,
                                    cash: seed,
                                    holdings: { A: 0, B: 0, C: 0, D: 0, E: 0, F: 0, G: 0, H: 0, I: 0, J: 0 },
                                    history: { 2015: { asset: seed, rank: 1, returnRate: 0 } }
                                };
                                modified = true;
                            }
                        });
                        return modified ? next : prev;
                    });
                }
            };

            const handleRoomMessage = (msg) => {
                if (msg && msg.event === 'stock_game:predict' && msg.payload) {
                    handlePredictMsg(msg.payload);
                } else if (msg && msg.event === 'stock_game:execute_order' && msg.payload) {
                    handleExecuteOrderMsg(msg.payload);
                } else if (msg && msg.event === 'stock_game:vip_hint_selected' && msg.payload) {
                    handleVipHintMsg(msg.payload);
                } else if (msg && msg.event === 'stock_game:participant_activity' && msg.payload) {
                    handleActivityMsg(msg.payload);
                } else if (msg && (msg.event === 'stock_game:request_sync' || msg.type === 'stock_game:request_sync')) {
                    broadcastStockState();
                }
            };
            const handleDirectRequestSync = () => broadcastStockState();

            socket.on('stock_game:predict', handlePredictMsg);
            socket.on('stock_game:execute_order', handleExecuteOrderMsg);
            socket.on('stock_game:vip_hint_selected', handleVipHintMsg);
            socket.on('stock_game:participant_activity', handleActivityMsg);
            socket.on('stock_game:participant_joined', (data) => {
                if (data && data.participants) handleParticipantsUpdated(data.participants);
            });
            socket.on('host:participantsUpdated', handleParticipantsUpdated);
            socket.on('stock_game:request_sync', handleDirectRequestSync);
            socket.on('room:message', handleRoomMessage);
        }

        broadcastStockState();
        return () => {
            if (channel) {
                try { channel.close(); } catch (e) {}
            }
            if (socket) {
                socket.off('stock_game:predict');
                socket.off('stock_game:execute_order');
                socket.off('stock_game:vip_hint_selected');
                socket.off('stock_game:participant_activity');
                socket.off('stock_game:participant_joined');
                socket.off('host:participantsUpdated');
                socket.off('stock_game:request_sync');
                socket.off('room:message');
            }
        };
    }, [currentYear, isPubliclyRevealed, allowAllNews, allowAllVipHint, activeStocks, portfolios, predictions, predictionResults, allOrdersModalOpen]);

    // 🎲 새로운 10개 종목 무작위 추출 (새 게임)
    const handleReRandomizeStocks = () => {
        if (window.confirm('2016년 이전 상장 100대 기업 중 새로운 10개 종목을 무작위로 다시 뽑으시겠습니까?\n모든 참여자의 투자 및 예측 기록이 2015년 기준으로 초기화됩니다.')) {
            const newStocks = generateRandom10Stocks();
            setActiveStocks(newStocks);
            setCurrentYear(2015);
            setIsPubliclyRevealed(false);
            setHostPeekNames(false);
            setPredictions({});
            setPredictionResults({});
            setHostVipHints({});
            setParticipantActivities({});
            
            const resetPortfolios = {};
            teamList.forEach(t => {
                resetPortfolios[t.id] = {
                    seedMoney: t.initialSeed,
                    cash: t.initialSeed,
                    holdings: { A: 0, B: 0, C: 0, D: 0, E: 0, F: 0, G: 0, H: 0, I: 0, J: 0 },
                    history: { 2015: { asset: t.initialSeed, rank: 1, returnRate: 0 } }
                };
            });
            setPortfolios(resetPortfolios);
            try {
                sessionStorage.setItem('stock_game_active_stocks', JSON.stringify(newStocks));
            } catch (e) {}
            playSound('reset');
            broadcastStockState({
                year: 2015,
                stocks: newStocks,
                isPubliclyRevealed: false,
                portfolios: resetPortfolios,
                predictions: {},
                predictionResults: {}
            });
        }
    };

    // 다음 연도로 진행 (결산 및 뉴스 분석 예측 채점)
    const handleNextYear = () => {
        if (currentYear >= 2025) {
            playSound('fanfare');
            setIsPubliclyRevealed(true);
            broadcastStockState({ isPubliclyRevealed: true });
            alert('🎉 2025년 최종 게임이 종료되었습니다! 모든 기업의 실제 명칭이 공개되었습니다.');
            return;
        }

        const nextYear = currentYear + 1;
        playSound('next');
        setCurrentYear(nextYear);

        // 연도 뉴스 예측 채점 (5개 이상 적중 팀 특별 힌트 권한 부여)
        const currentNews = generateStockNewsForYear(currentYear, activeStocks);
        const nextPredResults = {};
        const qualifiedTeamNames = [];

        teamList.forEach(t => {
            const tId = t.id;
            const tPred = predictions[tId] || {};
            let hits = 0;
            currentNews.forEach(n => {
                if (tPred[n.stockKey] && tPred[n.stockKey] === n.direction) {
                    hits++;
                }
            });
            const isQualified = hits >= 5;
            nextPredResults[tId] = {
                hits,
                total: 10,
                qualified: isQualified,
                year: currentYear
            };
            if (isQualified) {
                qualifiedTeamNames.push(`${t.name}(${hits}개 적중)`);
            }
        });
        setPredictionResults(nextPredResults);
        setPredictions({});
        setHostVipHints({});
        setParticipantActivities({});

        // 연도 결산 및 포트폴리오 자산 가치 평가 (모든 보유 주식 유지 및 가치 재평가)
        let updatedPortfolios = {};
        setPortfolios(prev => {
            const updated = { ...prev };
            Object.keys(updated).forEach(key => {
                const p = updated[key];
                if (!p || !p.holdings) return;

                let stockVal = 0;
                stockList.forEach(s => {
                    const qty = p.holdings[s.key] || 0;
                    const price = s.prices[nextYear] ?? s.prices[2015];
                    stockVal += qty * price;
                });

                const totalAsset = (p.cash || 0) + stockVal;
                const retRate = (p.seedMoney && p.seedMoney > 0) ? (((totalAsset - p.seedMoney) / p.seedMoney) * 100).toFixed(1) : 0;

                const targetTeam = teamList.find(t => t.id === key);
                if (targetTeam && socket && pin) {
                    socket.emit('host:adjustScore', { pin, nickname: targetTeam.name, exactScore: Math.round(totalAsset) });
                } else if (setExactScore) {
                    const numKey = Number(key) || key;
                    setExactScore(numKey, Math.round(totalAsset));
                }

                updated[key] = {
                    ...p,
                    history: {
                        ...(p.history || {}),
                        [nextYear]: {
                            asset: totalAsset,
                            stockValue: stockVal,
                            cash: p.cash || 0,
                            returnRate: Number(retRate)
                        }
                    }
                };
            });
            updatedPortfolios = updated;
            return updated;
        });

        broadcastStockState({ 
            year: nextYear,
            portfolios: updatedPortfolios,
            predictions: {},
            predictionResults: nextPredResults
        });

        if (qualifiedTeamNames.length > 0) {
            setTimeout(() => {
                alert(`🎯 [뉴스 예측 적중 알림]\n5개 이상 맞춘 ${qualifiedTeamNames.join(', ')}에 다음 연도(${nextYear}년) 100% 특별 힌트 혜택이 부여되었습니다!`);
            }, 300);
        }
    };

    // 이전 연도로 되돌리기
    const handlePrevYear = () => {
        if (currentYear <= 2015) return;
        const prev = currentYear - 1;
        setCurrentYear(prev);
        broadcastStockState({ year: prev });
    };

    // 주문 수량 입력 변경
    const handleQtyChange = (stockKey, val) => {
        const num = parseInt(val, 10);
        setOrderInputs(prev => ({
            ...prev,
            [stockKey]: isNaN(num) ? 0 : num
        }));
    };

    // 매수 / 매도 주문 체결 실행
    const handleExecuteOrder = () => {
        const currentTeamObj = teamList.find(t => t.id === selectedTeamId) || teamList[0] || { id: selectedTeamId, name: `${selectedTeamId}조` };
        const teamId = currentTeamObj.id;
        const currentP = getTeamPortfolio(currentTeamObj, portfolios);
        if (!currentP) return;

        const hasInputs = Object.values(orderInputs).some(qty => qty !== 0);

        if (hasInputs) {
            let totalCost = 0;
            let newHoldings = { ...(currentP.holdings || { A: 0, B: 0, C: 0, D: 0, E: 0, F: 0, G: 0, H: 0, I: 0, J: 0 }) };

            for (const [key, qty] of Object.entries(orderInputs)) {
                if (qty === 0) continue;
                const price = activeStocks[key]?.prices[currentYear] ?? activeStocks[key]?.prices[2015];

                if (qty > 0) {
                    totalCost += qty * price;
                    newHoldings[key] = (newHoldings[key] || 0) + qty;
                } else if (qty < 0) {
                    const sellQty = Math.abs(qty);
                    const currentQty = newHoldings[key] || 0;
                    if (sellQty > currentQty) {
                        alert(`[${activeStocks[key]?.sector}] 보유 수량(${currentQty}주)보다 많이 매도할 수 없습니다.`);
                        return;
                    }
                    totalCost -= sellQty * price;
                    newHoldings[key] = currentQty - sellQty;
                }
            }

            if (currentP.cash < totalCost) {
                alert(`예수금이 부족합니다! (필요 현금: ${totalCost.toLocaleString()}원 / 보유 현금: ${currentP.cash.toLocaleString()}원)`);
                return;
            }

            const newCash = currentP.cash - totalCost;
            playSound('submit');

            setPortfolios(prev => {
                const updated = {
                    ...currentP,
                    cash: newCash,
                    holdings: newHoldings
                };
                const nextP = { ...prev };
                if (teamId) nextP[teamId] = updated;
                if (currentTeamObj.name) nextP[currentTeamObj.name] = updated;
                if (currentTeamObj.groupId) nextP[String(currentTeamObj.groupId)] = updated;
                if (selectedTeamId) nextP[selectedTeamId] = updated;
                broadcastStockState({ portfolios: nextP });
                return nextP;
            });

            setOrderInputs({ A: 0, B: 0, C: 0, D: 0, E: 0, F: 0, G: 0, H: 0, I: 0, J: 0 });
        }

        setAllOrdersModalOpen(true);
        broadcastStockState({ allOrdersModalOpen: true });
    };

    const handleCloseAllOrdersModal = () => {
        setAllOrdersModalOpen(false);
        broadcastStockState({ allOrdersModalOpen: false });
    };

    const currentTeam = teamList.find(t => t.id === selectedTeamId) || teamList[0] || { id: '1', name: '1조' };
    const currentTeamPortfolio = getTeamPortfolio(currentTeam, portfolios);

    // 현재 선택된 팀의 총 주식 평가금액 계산
    const currentTeamStockValue = useMemo(() => {
        let total = 0;
        stockList.forEach(s => {
            const qty = currentTeamPortfolio.holdings[s.key] || 0;
            const price = s.prices[currentYear] ?? s.prices[2015];
            total += qty * price;
        });
        return total;
    }, [currentTeamPortfolio.holdings, currentYear, stockList]);

    const currentTeamTotalAsset = currentTeamPortfolio.cash + currentTeamStockValue;
    const yearNewsList = useMemo(() => generateStockNewsForYear(currentYear, activeStocks), [currentYear, activeStocks]);

    return (
        <div style={{
            width: '100%',
            minHeight: '100vh',
            background: '#0b1120',
            color: '#f8fafc',
            display: 'flex',
            flexDirection: 'column',
            fontFamily: "'Pretendard', 'Noto Sans KR', sans-serif", wordBreak: 'keep-all', overflowWrap: 'break-word',
            boxSizing: 'border-box'
        }}>
            {/* Top Global Control Toolbar */}
            <div style={{
                background: '#0f172a',
                borderBottom: '1px solid #1e293b',
                padding: '14px 24px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: '14px'
            }}>
                {/* Year Indicator & Stepper */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                    <div style={{
                        background: 'linear-gradient(135deg, #f43f5e 0%, #e11d48 100%)',
                        color: 'white',
                        padding: '6px 18px',
                        borderRadius: '12px',
                        fontSize: '1.4rem',
                        fontWeight: '900',
                        letterSpacing: '1px',
                        boxShadow: '0 4px 14px rgba(244, 63, 94, 0.35)'
                    }}>
                        {currentYear === 2015 ? '2015년 (기준가)' : `${currentYear}년 증시`}
                    </div>

                    <div style={{ display: 'flex', gap: '6px' }}>
                        <button
                            onClick={handlePrevYear}
                            disabled={currentYear <= 2015}
                            style={{
                                background: currentYear <= 2015 ? '#1e293b' : '#334155',
                                color: currentYear <= 2015 ? '#64748b' : '#ffffff',
                                border: 'none',
                                borderRadius: '10px',
                                padding: '8px 14px',
                                fontWeight: 'bold',
                                cursor: currentYear <= 2015 ? 'not-allowed' : 'pointer'
                            }}
                        >
                            ◀ 이전 연도
                        </button>
                        <button
                            onClick={handleNextYear}
                            style={{
                                background: currentYear >= 2025 ? '#10b981' : '#3b82f6',
                                color: 'white',
                                border: 'none',
                                borderRadius: '10px',
                                padding: '8px 18px',
                                fontWeight: '900',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '6px'
                            }}
                        >
                            {currentYear >= 2025 ? '🏆 최종 결산 발표' : `다음 연도 진행 (${currentYear + 1}년) ▶`}
                        </button>
                        <button
                            onClick={() => {
                                const nextState = !allOrdersModalOpen;
                                setAllOrdersModalOpen(nextState);
                                broadcastStockState({ allOrdersModalOpen: nextState });
                            }}
                            style={{
                                background: allOrdersModalOpen ? '#059669' : 'linear-gradient(135deg, #0284c7 0%, #0369a1 100%)',
                                color: 'white',
                                border: '1px solid rgba(56, 189, 248, 0.4)',
                                borderRadius: '10px',
                                padding: '8px 16px',
                                fontWeight: '900',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '6px',
                                boxShadow: '0 4px 12px rgba(2, 132, 199, 0.35)'
                            }}
                            title="모든 참여자의 투자 결과와 순위를 메인 모니터와 서브 모니터에 표시합니다."
                        >
                            <Trophy size={16} color="#fbbf24" />
                            <span>📊 정산 결과</span>
                        </button>
                    </div>
                </div>

                {/* Host Control Actions */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                    {/* 🎲 Randomize 10 stocks button */}
                    <button
                        onClick={handleReRandomizeStocks}
                        style={{
                            background: '#7c3aed',
                            color: 'white',
                            border: 'none',
                            padding: '8px 14px',
                            borderRadius: '10px',
                            fontWeight: '800',
                            fontSize: '0.85rem',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px'
                        }}
                        title="100개 기업 중 10개를 다시 무작위로 추출하여 새 게임을 시작합니다."
                    >
                        <RefreshCw size={14} /> 10개 종목 새로 뽑기
                    </button>

                    {/* News Permission Toggle */}
                    <button
                        onClick={() => {
                            const next = !allowAllNews;
                            setAllowAllNews(next);
                            broadcastStockState({ allowAllNews: next });
                        }}
                        style={{
                            background: allowAllNews ? '#059669' : '#dc2626',
                            color: 'white',
                            border: 'none',
                            padding: '8px 14px',
                            borderRadius: '10px',
                            fontWeight: '800',
                            fontSize: '0.85rem',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px'
                        }}
                    >
                        {allowAllNews ? <Unlock size={14} /> : <Lock size={14} />}
                        <span>뉴스 열람: {allowAllNews ? '허용 중' : '차단 중'}</span>
                    </button>

                    {/* 100% Hint VIP Toggle */}
                    <button
                        onClick={() => {
                            const next = !allowAllVipHint;
                            setAllowAllVipHint(next);
                            broadcastStockState({ allowAllVipHint: next });
                        }}
                        style={{
                            background: allowAllVipHint ? 'linear-gradient(135deg, #d97706, #b45309)' : '#334155',
                            color: allowAllVipHint ? '#fef3c7' : '#94a3b8',
                            border: allowAllVipHint ? '1px solid #f59e0b' : 'none',
                            padding: '8px 14px',
                            borderRadius: '10px',
                            fontWeight: '900',
                            fontSize: '0.85rem',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px'
                        }}
                    >
                        <Star size={14} fill={allowAllVipHint ? '#fbbf24' : 'none'} />
                        <span>100% 특급 힌트: {allowAllVipHint ? '공개 중' : '비공개'}</span>
                    </button>

                    {/* Peek / Reveal Real Names */}
                    <button
                        onClick={() => setHostPeekNames(!hostPeekNames)}
                        style={{
                            background: hostPeekNames ? '#f59e0b' : '#334155',
                            color: 'white',
                            border: 'none',
                            padding: '8px 14px',
                            borderRadius: '10px',
                            fontWeight: '800',
                            fontSize: '0.85rem',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px'
                        }}
                        title="호스트 화면에서만 기업 실명을 미리 확인합니다."
                    >
                        {hostPeekNames ? <Eye size={14} /> : <EyeOff size={14} />}
                        <span>호스트 실명 보기</span>
                    </button>

                    <button
                        onClick={() => {
                            const next = !isPubliclyRevealed;
                            setIsPubliclyRevealed(next);
                            broadcastStockState({ isPubliclyRevealed: next });
                        }}
                        style={{
                            background: isPubliclyRevealed ? '#10b981' : '#1e293b',
                            color: isPubliclyRevealed ? 'white' : '#94a3b8',
                            border: '1px solid #475569',
                            padding: '8px 14px',
                            borderRadius: '10px',
                            fontWeight: '800',
                            fontSize: '0.85rem',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px'
                        }}
                        title="서브 모니터와 모든 참여자 화면에 실제 기업명을 공개합니다."
                    >
                        <Sparkles size={14} />
                        <span>전체 기업명 공개: {isPubliclyRevealed ? '공개됨' : '비공개'}</span>
                    </button>

                    {/* 시장 섹터 도감 버튼 */}
                    <button
                        onClick={() => setShowSectorDirectoryModal(true)}
                        style={{
                            background: 'linear-gradient(135deg, #0284c7 0%, #0369a1 100%)',
                            color: 'white',
                            border: '1px solid rgba(56, 189, 248, 0.4)',
                            padding: '8px 14px',
                            borderRadius: '10px',
                            fontWeight: '800',
                            fontSize: '0.85rem',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px',
                            boxShadow: '0 2px 8px rgba(2, 132, 199, 0.3)',
                            transition: 'all 0.15s ease'
                        }}
                        title="14대 시장 섹터 도감을 팝업으로 열람합니다."
                    >
                        <Building2 size={16} />
                        <span>시장 섹터 도감</span>
                    </button>
                </div>
            </div>

            {/* 2-Column Financial Terminal Layout: 섹터 도감 모달 분리로 시세판/차트 영역 대폭 확장 */}
            <div style={{
                flex: 1,
                display: 'grid',
                gridTemplateColumns: '1fr 340px',
                gap: '16px',
                padding: '16px',
                minHeight: 0,
                boxSizing: 'border-box'
            }}>
                {/* 1) CENTER: 10개 종목 시세판 & 주문 / 포트폴리오 관리 */}
                <div style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '16px',
                    overflowY: 'auto'
                }}>
                    {/* Active 10 Stocks Cards Board */}
                    <div style={{
                        background: '#0f172a',
                        borderRadius: '18px',
                        border: '1px solid #1e293b',
                        padding: '16px'
                    }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <BarChart3 size={20} color="#f43f5e" />
                                <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: '900', color: '#f8fafc' }}>
                                    {currentYear}년 10대 투자 종목 시세판 (1주당 가격)
                                </h3>
                            </div>
                            <span style={{ fontSize: '0.8rem', color: '#94a3b8' }}>
                                100대 기업 풀 중 10개 랜덤 선정 완료
                            </span>
                        </div>

                        {/* Grid of 10 Stocks */}
                        <div style={{
                            display: 'grid',
                            gridTemplateColumns: 'repeat(5, 1fr)',
                            gap: '10px'
                        }}>
                            {stockList.map(item => {
                                const curPrice = item.prices[currentYear] ?? item.prices[2015];
                                const prevYear = currentYear > 2015 ? currentYear - 1 : 2015;
                                const prevPrice = item.prices[prevYear] ?? curPrice;
                                const diff = curPrice - prevPrice;
                                const pct = prevPrice > 0 ? ((diff / prevPrice) * 100).toFixed(1) : '0.0';
                                const isUp = diff > 0;
                                const isDown = diff < 0;

                                const showRealName = isPubliclyRevealed || hostPeekNames;

                                return (
                                    <div
                                        key={item.key}
                                        style={{
                                            background: '#1e293b',
                                            border: '1px solid #334155',
                                            borderRadius: '14px',
                                            padding: '10px',
                                            display: 'flex',
                                            flexDirection: 'column',
                                            gap: '6px'
                                        }}
                                    >
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                            <span style={{
                                                background: item.badgeColor || '#3b82f6',
                                                color: 'white',
                                                padding: '2px 8px',
                                                borderRadius: '6px',
                                                fontSize: '0.85rem',
                                                fontWeight: '900'
                                            }}>
                                                {item.key}
                                            </span>
                                            <span style={{ fontSize: '0.78rem', color: '#94a3b8', fontWeight: '700' }}>
                                                {item.sector}
                                            </span>
                                        </div>

                                        <div style={{
                                            fontSize: '0.95rem',
                                            fontWeight: '800',
                                            color: showRealName ? '#38bdf8' : '#e2e8f0',
                                            whiteSpace: 'nowrap',
                                            overflow: 'hidden',
                                            textOverflow: 'ellipsis'
                                        }}>
                                            {showRealName ? `${item.realName}` : `${item.key} ${item.sector}`}
                                        </div>

                                        <div style={{ fontSize: '1.15rem', fontWeight: '900', color: '#ffffff' }}>
                                            {curPrice.toLocaleString()}원
                                        </div>

                                        {currentYear > 2015 && (
                                            <div style={{
                                                fontSize: '0.78rem',
                                                fontWeight: '800',
                                                color: isUp ? '#f43f5e' : (isDown ? '#38bdf8' : '#94a3b8'),
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: '2px'
                                            }}>
                                                {isUp && '▲'}
                                                {isDown && '▼'}
                                                <span>{diff > 0 ? `+${diff.toLocaleString()}` : diff.toLocaleString()}원</span>
                                                <span>({diff > 0 ? `+${pct}` : pct}%)</span>
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    {/* Investment Decision & Portfolio Panel */}
                    <div style={{
                        background: '#0f172a',
                        borderRadius: '18px',
                        border: '1px solid #1e293b',
                        padding: '16px'
                    }}>
                        {/* Tab Switcher */}
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                            <div style={{ display: 'flex', gap: '8px' }}>
                                <button
                                    onClick={() => setActiveTab('decision')}
                                    style={{
                                        background: activeTab === 'decision' ? '#3b82f6' : '#1e293b',
                                        color: activeTab === 'decision' ? 'white' : '#94a3b8',
                                        border: 'none',
                                        padding: '8px 16px',
                                        borderRadius: '10px',
                                        fontWeight: '800',
                                        fontSize: '0.9rem',
                                        cursor: 'pointer'
                                    }}
                                >
                                    📝 조별 투자 주문 입력 (표 1)
                                </button>
                                <button
                                    onClick={() => setActiveTab('matrix')}
                                    style={{
                                        background: activeTab === 'matrix' ? '#3b82f6' : '#1e293b',
                                        color: activeTab === 'matrix' ? 'white' : '#94a3b8',
                                        border: 'none',
                                        padding: '8px 16px',
                                        borderRadius: '10px',
                                        fontWeight: '800',
                                        fontSize: '0.9rem',
                                        cursor: 'pointer'
                                    }}
                                >
                                    📊 전체 참여자 자산 매트릭스 (표 2)
                                </button>
                            </div>

                            {activeTab === 'decision' && (
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <span style={{ fontSize: '0.85rem', color: '#94a3b8', fontWeight: '700' }}>대상 조 선택:</span>
                                    <select
                                        value={selectedTeamId}
                                        onChange={(e) => setSelectedTeamId(e.target.value)}
                                        style={{
                                            background: '#1e293b',
                                            color: '#f8fafc',
                                            border: '1px solid #475569',
                                            borderRadius: '8px',
                                            padding: '6px 12px',
                                            fontWeight: 'bold',
                                            fontSize: '0.9rem',
                                            cursor: 'pointer'
                                        }}
                                    >
                                        {teamList.map(t => (
                                            <option key={t.id} value={t.id}>{t.name}</option>
                                        ))}
                                    </select>
                                </div>
                            )}
                        </div>

                        {/* Tab 1: Order Decision Console */}
                        {activeTab === 'decision' && (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                                {/* Current Team Status Banner */}
                                <div style={{
                                    background: '#1e293b',
                                    borderRadius: '14px',
                                    padding: '14px 18px',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    gap: '12px'
                                }}>
                                    <div style={{
                                        display: 'flex',
                                        justifyContent: 'space-between',
                                        alignItems: 'center',
                                        flexWrap: 'wrap',
                                        gap: '12px'
                                    }}>
                                        <div>
                                            <div style={{ fontSize: '1.15rem', fontWeight: '900', color: '#38bdf8' }}>
                                                {currentTeam.name} 재무 현황
                                            </div>
                                            <div style={{ fontSize: '0.85rem', color: '#94a3b8' }}>
                                                초기 투자금: {formatKoreanMoney(currentTeamPortfolio.seedMoney)}
                                            </div>
                                        </div>

                                        <div style={{ display: 'flex', gap: '20px' }}>
                                            <div>
                                                <div style={{ fontSize: '0.78rem', color: '#94a3b8' }}>보유 현금(예수금)</div>
                                                <div style={{ fontSize: '1.2rem', fontWeight: '900', color: '#10b981' }}>
                                                    {formatKoreanMoney(currentTeamPortfolio.cash)}
                                                </div>
                                            </div>
                                            <div>
                                                <div style={{ fontSize: '0.78rem', color: '#94a3b8' }}>주식 평가액</div>
                                                <div style={{ fontSize: '1.2rem', fontWeight: '900', color: '#f59e0b' }}>
                                                    {formatKoreanMoney(currentTeamStockValue)}
                                                </div>
                                            </div>
                                            <div>
                                                <div style={{ fontSize: '0.78rem', color: '#94a3b8' }}>총 자산 가치</div>
                                                <div style={{ fontSize: '1.2rem', fontWeight: '900', color: '#ffffff' }}>
                                                    {formatKoreanMoney(currentTeamTotalAsset)}
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* 🔥 실시간 보유 주식 목록 태그 바 (핸드폰 매수 즉시 실시간 연동 표시) */}
                                    {(() => {
                                        const ownedItems = stockList.filter(s => (currentTeamPortfolio.holdings?.[s.key] || 0) > 0);
                                        const totalShares = ownedItems.reduce((acc, s) => acc + (currentTeamPortfolio.holdings?.[s.key] || 0), 0);
                                        return (
                                            <div style={{
                                                width: '100%',
                                                paddingTop: '10px',
                                                borderTop: '1px solid rgba(255, 255, 255, 0.08)',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'space-between',
                                                flexWrap: 'wrap',
                                                gap: '8px',
                                                fontSize: '0.84rem'
                                            }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                                                    <span style={{ color: '#38bdf8', fontWeight: '900', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                                        📦 [{currentTeam.name}] 실시간 보유 주식:
                                                    </span>
                                                    {ownedItems.length > 0 ? (
                                                        ownedItems.map(s => {
                                                            const qty = currentTeamPortfolio.holdings[s.key];
                                                            const price = s.prices[currentYear] ?? s.prices[2015] ?? 0;
                                                            const val = qty * price;
                                                            return (
                                                                <span
                                                                    key={s.key}
                                                                    style={{
                                                                        background: 'rgba(56, 189, 248, 0.15)',
                                                                        border: '1px solid rgba(56, 189, 248, 0.4)',
                                                                        color: '#f8fafc',
                                                                        padding: '3px 10px',
                                                                        borderRadius: '8px',
                                                                        fontWeight: '800',
                                                                        fontSize: '0.82rem',
                                                                        display: 'inline-flex',
                                                                        alignItems: 'center',
                                                                        gap: '4px'
                                                                    }}
                                                                >
                                                                    <span style={{ color: s.badgeColor || '#38bdf8' }}>[{s.key}] {s.sector}</span>
                                                                    <strong style={{ color: '#38bdf8' }}>{qty.toLocaleString()}주</strong>
                                                                    <span style={{ color: '#94a3b8', fontSize: '0.76rem' }}>({formatKoreanMoney(val)})</span>
                                                                </span>
                                                            );
                                                        })
                                                    ) : (
                                                        <span style={{ color: '#64748b', fontWeight: '700' }}>보유 주식 없음 (예수금 100%)</span>
                                                    )}
                                                </div>
                                                <div style={{ color: totalShares > 0 ? '#38bdf8' : '#64748b', fontWeight: '900', fontSize: '0.84rem' }}>
                                                    총 {totalShares.toLocaleString()}주 보유 중
                                                </div>
                                            </div>
                                        );
                                    })()}
                                </div>

                                {/* Order Inputs Table */}
                                <div style={{ overflowX: 'auto' }}>
                                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.88rem' }}>
                                        <thead>
                                            <tr style={{ background: '#1e293b', color: '#94a3b8', borderBottom: '1px solid #334155' }}>
                                                <th style={{ padding: '8px 12px', textAlign: 'left' }}>종목</th>
                                                <th style={{ padding: '8px 12px', textAlign: 'right' }}>1주당 가격</th>
                                                <th style={{ padding: '8px 12px', textAlign: 'right' }}>현재 보유</th>
                                                <th style={{ padding: '8px 12px', textAlign: 'center' }}>주문 수량 (+매수/-매도)</th>
                                                <th style={{ padding: '8px 12px', textAlign: 'right' }}>예상 금액</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {stockList.map(s => {
                                                const price = s.prices[currentYear] ?? s.prices[2015];
                                                const currentQty = currentTeamPortfolio.holdings[s.key] || 0;
                                                const orderQty = orderInputs[s.key] || 0;
                                                const estimatedCost = orderQty * price;

                                                return (
                                                    <tr key={s.key} style={{ borderBottom: '1px solid #1e293b' }}>
                                                        <td style={{ padding: '10px 12px', fontWeight: '800' }}>
                                                            <span style={{ color: s.badgeColor, marginRight: '6px' }}>[{s.key}]</span>
                                                            {s.sector} {isPubliclyRevealed || hostPeekNames ? `(${s.realName})` : ''}
                                                        </td>
                                                        <td style={{ padding: '10px 12px', textAlign: 'right', fontWeight: '700' }}>
                                                            {price.toLocaleString()}원
                                                        </td>
                                                        <td style={{ padding: '10px 12px', textAlign: 'right' }}>
                                                            {currentQty > 0 ? (
                                                                <span style={{
                                                                    background: 'rgba(16, 185, 129, 0.18)',
                                                                    border: '1px solid #10b981',
                                                                    color: '#34d399',
                                                                    padding: '3px 10px',
                                                                    borderRadius: '8px',
                                                                    fontWeight: '900',
                                                                    fontSize: '0.92rem',
                                                                    display: 'inline-block',
                                                                    boxShadow: '0 0 10px rgba(16, 185, 129, 0.2)'
                                                                }}>
                                                                    🔥 {currentQty.toLocaleString()}주 보유
                                                                </span>
                                                            ) : (
                                                                <span style={{ color: '#64748b', fontWeight: '700' }}>0주</span>
                                                            )}
                                                        </td>
                                                        <td style={{ padding: '10px 12px', textAlign: 'center' }}>
                                                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
                                                                <button
                                                                    onClick={() => handleQtyChange(s.key, orderQty - 100)}
                                                                    style={{ background: '#334155', color: 'white', border: 'none', borderRadius: '6px', padding: '4px 8px', cursor: 'pointer' }}
                                                                >
                                                                    -100
                                                                </button>
                                                                <input
                                                                    type="number"
                                                                    value={orderInputs[s.key] || ''}
                                                                    placeholder="0"
                                                                    onChange={(e) => handleQtyChange(s.key, e.target.value)}
                                                                    style={{
                                                                        width: '90px',
                                                                        background: '#0b1120',
                                                                        color: '#ffffff',
                                                                        border: '1px solid #475569',
                                                                        borderRadius: '8px',
                                                                        padding: '6px',
                                                                        textAlign: 'center',
                                                                        fontWeight: 'bold'
                                                                    }}
                                                                />
                                                                <button
                                                                    onClick={() => handleQtyChange(s.key, orderQty + 100)}
                                                                    style={{ background: '#334155', color: 'white', border: 'none', borderRadius: '6px', padding: '4px 8px', cursor: 'pointer' }}
                                                                >
                                                                    +100
                                                                </button>
                                                            </div>
                                                        </td>
                                                        <td style={{
                                                            padding: '10px 12px',
                                                            textAlign: 'right',
                                                            fontWeight: '800',
                                                            color: estimatedCost > 0 ? '#f43f5e' : (estimatedCost < 0 ? '#38bdf8' : '#94a3b8')
                                                        }}>
                                                            {estimatedCost > 0 ? `-${estimatedCost.toLocaleString()}원 (매수)` : (estimatedCost < 0 ? `+${Math.abs(estimatedCost).toLocaleString()}원 (매도)` : '0원')}
                                                        </td>
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                    </table>
                                </div>

                                <div style={{
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    alignItems: 'center',
                                    marginTop: '8px',
                                    flexWrap: 'wrap',
                                    gap: '10px'
                                }}>
                                    <div style={{ fontSize: '0.82rem', color: '#94a3b8' }}>
                                        💡 <strong>실시간 연동 안내:</strong> 유저가 핸드폰에서 매수/매도 주문을 체결하면 <strong>[현재 보유]</strong> 및 상단 <strong>[재무 현황]</strong>에 즉시 자동 반영됩니다.
                                    </div>
                                    <button
                                        onClick={handleExecuteOrder}
                                        style={{
                                            background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                                            color: 'white',
                                            border: 'none',
                                            borderRadius: '12px',
                                            padding: '12px 32px',
                                            fontSize: '1.05rem',
                                            fontWeight: '900',
                                            cursor: 'pointer',
                                            boxShadow: '0 4px 15px rgba(16, 185, 129, 0.4)'
                                        }}
                                    >
                                        ✓ 모든 주문 체결 확정
                                    </button>
                                </div>
                            </div>
                        )}

                        {/* Tab 2: Matrix Overview */}
                        {activeTab === 'matrix' && (
                            <div style={{ overflowX: 'auto' }}>
                                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                                    <thead>
                                        <tr style={{ background: '#1e293b', color: '#94a3b8' }}>
                                            <th style={{ padding: '10px 12px', textAlign: 'left' }}>순위 / 조명</th>
                                            <th style={{ padding: '10px 12px', textAlign: 'right' }}>보유 현금</th>
                                            <th style={{ padding: '10px 12px', textAlign: 'right' }}>주식 평가액</th>
                                            <th style={{ padding: '10px 12px', textAlign: 'right' }}>총 자산</th>
                                            <th style={{ padding: '10px 12px', textAlign: 'right' }}>누적 수익률</th>
                                            <th style={{ padding: '10px 12px', textAlign: 'left' }}>실시간 보유 주식 목록</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {(() => {
                                            const matrixList = teamList.map(team => {
                                                const p = getTeamPortfolio(team, portfolios);
                                                let sVal = 0;
                                                stockList.forEach(s => {
                                                    const q = p.holdings?.[s.key] || 0;
                                                    const pr = s.prices[currentYear] ?? s.prices[2015];
                                                    sVal += q * pr;
                                                });
                                                const tot = (p.cash !== undefined ? p.cash : 1000000) + sVal;
                                                const ret = (p.seedMoney && p.seedMoney > 0) ? (((tot - p.seedMoney) / p.seedMoney) * 100).toFixed(1) : 0;
                                                return { team, p, sVal, tot, ret: Number(ret) };
                                            }).sort((a, b) => b.tot - a.tot);

                                            return matrixList.map((item, idx) => (
                                                <tr key={item.team.id} style={{ borderBottom: '1px solid #1e293b' }}>
                                                    <td style={{ padding: '10px 12px', fontWeight: '800' }}>
                                                        <span style={{ color: idx === 0 ? '#f59e0b' : (idx === 1 ? '#94a3b8' : (idx === 2 ? '#b45309' : '#64748b')), marginRight: '6px' }}>
                                                            {idx === 0 ? '🥇 1위' : (idx === 1 ? '🥈 2위' : (idx === 2 ? '🥉 3위' : `#${idx + 1}위`))}
                                                        </span>
                                                        {item.team.name}
                                                    </td>
                                                    <td style={{ padding: '10px 12px', textAlign: 'right', color: '#10b981' }}>
                                                        {formatKoreanMoney(item.p.cash !== undefined ? item.p.cash : 1000000)}
                                                    </td>
                                                    <td style={{ padding: '10px 12px', textAlign: 'right', color: '#38bdf8' }}>
                                                        {formatKoreanMoney(item.sVal)}
                                                    </td>
                                                    <td style={{ padding: '10px 12px', textAlign: 'right', fontWeight: '900', color: '#ffffff' }}>
                                                        {formatKoreanMoney(item.tot)}
                                                    </td>
                                                    <td style={{
                                                        padding: '10px 12px',
                                                        textAlign: 'right',
                                                        fontWeight: '900',
                                                        color: item.ret > 0 ? '#f43f5e' : (item.ret < 0 ? '#38bdf8' : '#94a3b8')
                                                    }}>
                                                        {item.ret > 0 ? `+${item.ret}%` : `${item.ret}%`}
                                                    </td>
                                                    <td style={{ padding: '10px 12px', textAlign: 'left' }}>
                                                        {(() => {
                                                            const owned = stockList.filter(s => (item.p.holdings?.[s.key] || 0) > 0);
                                                            if (owned.length === 0) {
                                                                return <span style={{ color: '#64748b', fontSize: '0.8rem' }}>보유 없음 (현금 100%)</span>;
                                                            }
                                                            return (
                                                                <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                                                                    {owned.map(s => (
                                                                        <span
                                                                            key={s.key}
                                                                            style={{
                                                                                background: 'rgba(56, 189, 248, 0.15)',
                                                                                border: '1px solid rgba(56, 189, 248, 0.3)',
                                                                                padding: '2px 6px',
                                                                                borderRadius: '6px',
                                                                                fontSize: '0.75rem',
                                                                                fontWeight: '800',
                                                                                color: '#e2e8f0'
                                                                            }}
                                                                        >
                                                                            [{s.key}] {item.p.holdings[s.key]}주
                                                                        </span>
                                                                    ))}
                                                                </div>
                                                            );
                                                        })()}
                                                    </td>
                                                </tr>
                                            ));
                                        })()}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                </div>

                {/* 3) RIGHT: 당해 연도 10대 뉴스 (Click to Read with 100% Hint) + 누적 점수판 */}
                <div style={{
                    background: '#0f172a',
                    borderRadius: '18px',
                    border: '1px solid #1e293b',
                    padding: '16px',
                    display: 'flex',
                    flexDirection: 'column',
                    overflow: 'hidden'
                }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <Newspaper size={20} color="#f59e0b" />
                            <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: '900', color: '#f8fafc' }}>
                                {currentYear}년 10대 핵심 뉴스
                            </h3>
                        </div>
                        <span style={{ fontSize: '0.72rem', color: '#94a3b8' }}>클릭 시 상세 열람</span>
                    </div>
                    <p style={{ margin: '0 0 10px 0', fontSize: '0.78rem', color: '#94a3b8' }}>
                        주가 등락의 원인이 되는 경제 사건들입니다.
                    </p>

                    {/* 🔥 상단 배치: 참여자별 현재 연도 주식 매매 & 보유 현황 (뉴스 바로 밑, 스크롤 필요 없음) */}
                    <div style={{
                        marginBottom: '10px',
                        background: '#1e293b',
                        borderRadius: '12px',
                        border: '1px solid #334155',
                        padding: '10px 12px',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '6px'
                    }}>
                        <div style={{ fontSize: '0.85rem', fontWeight: '900', color: '#38bdf8', display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <BarChart3 size={15} /> 참여자별 {currentYear}년 주식 매매 현황
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', maxHeight: '180px', overflowY: 'auto' }}>
                            {Object.entries(portfolios || {}).map(([key, p]) => {
                                if (!p) return null;
                                let stockVal = 0;
                                const holdingsSummary = [];
                                stockList.forEach(s => {
                                    const q = p.holdings?.[s.key] || 0;
                                    const pr = s.prices ? (s.prices[currentYear] ?? s.prices[2015] ?? 0) : 0;
                                    stockVal += q * pr;
                                    if (q > 0) {
                                        holdingsSummary.push(`${s.key}: ${q}주`);
                                    }
                                });
                                const cashVal = p.cash || 0;
                                const totalAsset = cashVal + stockVal;
                                return (
                                    <div key={key} style={{
                                        background: '#0f172a',
                                        borderRadius: '8px',
                                        padding: '6px 8px',
                                        fontSize: '0.75rem',
                                        display: 'flex',
                                        flexDirection: 'column',
                                        gap: '3px',
                                        border: '1px solid rgba(255,255,255,0.05)'
                                    }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                            <strong style={{ color: '#f8fafc' }}>👤 {key}</strong>
                                            <span style={{ color: '#ffffff', fontWeight: '900' }}>
                                                총 자산: {totalAsset.toLocaleString()}원
                                            </span>
                                        </div>
                                        <div style={{ display: 'flex', gap: '10px', fontSize: '0.72rem' }}>
                                            <span style={{ color: '#10b981' }}>예수금: {cashVal.toLocaleString()}원</span>
                                            <span style={{ color: '#f59e0b' }}>주식 평가금: {stockVal.toLocaleString()}원</span>
                                        </div>
                                        <div style={{ fontSize: '0.7rem', color: '#94a3b8' }}>
                                            매매/보유: {holdingsSummary.length > 0 ? holdingsSummary.join(', ') : '보유 주식 없음'}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    {/* News List */}
                    <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '6px', paddingRight: '4px' }}>
                        {yearNewsList.map((news) => {
                            const curTeamVote = predictions[selectedTeamId]?.[news.stockKey];
                            return (
                                <div
                                    key={news.id}
                                    style={{
                                        background: '#1e293b',
                                        border: '1px solid rgba(255, 255, 255, 0.06)',
                                        borderRadius: '10px',
                                        padding: '7px 10px',
                                        display: 'flex',
                                        flexDirection: 'column',
                                        gap: '4px'
                                    }}
                                >
                                    <div
                                        onClick={() => setSelectedNews(news)}
                                        style={{
                                            cursor: 'pointer',
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '6px'
                                        }}
                                        title="클릭 시 기사 전문 및 VIP 100% 힌트 열람"
                                    >
                                        <span style={{
                                            background: news.badgeColor || '#3b82f6',
                                            color: 'white',
                                            padding: '1px 6px',
                                            borderRadius: '4px',
                                            fontSize: '0.72rem',
                                            fontWeight: '900'
                                        }}>
                                            {news.stockKey}
                                        </span>
                                        <span style={{ fontSize: '0.7rem', color: '#38bdf8', fontWeight: '700' }}>
                                            [{news.sector}]
                                        </span>
                                        <div style={{
                                            fontSize: '0.8rem',
                                            fontWeight: '700',
                                            color: '#e2e8f0',
                                            whiteSpace: 'nowrap',
                                            overflow: 'hidden',
                                            textOverflow: 'ellipsis',
                                            flex: 1
                                        }}>
                                            {news.rawHeadline || news.headline}
                                        </div>
                                    </div>

                                    {/* Direction & Team Vote Indicator */}
                                    <div style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'space-between',
                                        fontSize: '0.7rem',
                                        color: '#94a3b8',
                                        paddingTop: '3px',
                                        borderTop: '1px solid rgba(255,255,255,0.05)'
                                    }}>
                                        <span>
                                            실제: <strong style={{ color: news.direction === 'UP' ? '#f43f5e' : '#38bdf8' }}>
                                                {news.direction === 'UP' ? '▲ 상승' : '▼ 하락'} ({news.direction === 'UP' ? '+' : '-'}{news.pct}%)
                                            </strong>
                                        </span>
                                        <span>
                                            {currentTeam.name} 예측: <strong style={{ color: curTeamVote === 'UP' ? '#f43f5e' : (curTeamVote === 'DOWN' ? '#38bdf8' : '#64748b') }}>
                                                {curTeamVote === 'UP' ? '▲ 상승' : (curTeamVote === 'DOWN' ? '▼ 하락' : '미선택')}
                                            </strong>
                                        </span>
                                    </div>
                                </div>
                            );
                        })}
                    </div>

                    {/* Prediction summary */}
                    <div style={{
                        marginTop: '8px',
                        padding: '8px 10px',
                        background: '#090d16',
                        borderRadius: '10px',
                        border: '1px solid #1e293b',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        fontSize: '0.72rem'
                    }}>
                        <span style={{ color: '#94a3b8' }}>
                            {currentTeam.name} 적중: <strong style={{ color: '#38bdf8' }}>{predictionResults[selectedTeamId]?.hits || 0} / 10개</strong>
                        </span>
                        {predictionResults[selectedTeamId]?.qualified ? (
                            <span style={{ color: '#f59e0b', fontWeight: '900' }}>
                                👑 5개 이상 적중 (특별 힌트 지급됨)
                            </span>
                        ) : (
                            <span style={{ color: '#64748b' }}>
                                5개 이상 시 특별 힌트 부여
                            </span>
                        )}
                    </div>
                </div>
            </div>

            {/* Modals */}
            {selectedNews && (
                <StockNewsModal
                    newsItem={selectedNews}
                    currentYear={currentYear}
                    stocks={activeStocks}
                    onClose={() => setSelectedNews(null)}
                    hasVipHint={true} // Host always sees 100% hint
                    isHost={true}
                />
            )}

            {selectedSector && (
                <SectorDetailModal
                    sector={selectedSector}
                    onClose={() => setSelectedSector(null)}
                    allStocks={KOREA_TOP_100_STOCKS}
                    isPubliclyRevealed={isPubliclyRevealed}
                />
            )}

            {showSectorDirectoryModal && (
                <SectorDirectoryModal
                    onClose={() => setShowSectorDirectoryModal(false)}
                    allStocks={stockList}
                    isPubliclyRevealed={isPubliclyRevealed}
                />
            )}

            <AllOrdersResultModal
                isOpen={allOrdersModalOpen}
                onClose={() => setAllOrdersModalOpen(false)}
                currentYear={currentYear}
                portfolios={portfolios}
                stockList={stockList}
                teamList={teamList}
            />
        </div>
    );
}

// =============================================================================
// 5. 참여자 화면 컴포넌트 (StockGameParticipant) - 모바일 / PC 반응형 뷰
// =============================================================================
export function StockGameParticipant({ socket, pin, groupId, nickname, myScore }) {
    const [gameState, setGameState] = useState({
        year: 2015,
        stocks: STOCK_DATA_2026,
        isPubliclyRevealed: false,
        portfolios: {},
        permissions: {},
        allowAllNews: true,
        allowAllVipHint: false
    });

    const [activeTab, setActiveTab] = useState('stocks'); // 'stocks' | 'sectors' | 'portfolio'
    const [selectedStockKey, setSelectedStockKey] = useState(null); // 특정 종목 클릭 시 뉴스 & 매매 상세화면 전환
    const [selectedNews, setSelectedNews] = useState(null);
    const [selectedSector, setSelectedSector] = useState(null);
    const [participantEasyNews, setParticipantEasyNews] = useState(true); // 초등학생 친화형 쉬운 뉴스 기본 활성화
    const [showAnalysis, setShowAnalysis] = useState(false); // 기업 분석 및 차트 접기/펼치기

    // 매수 / 매도 주문 상태
    const [tradeType, setTradeType] = useState('BUY'); // 'BUY' | 'SELL'
    const [tradeQty, setTradeQty] = useState(0);

    // 참여자 예측 투표 및 힌트 보상 모달 상태
    const [localVotes, setLocalVotes] = useState({});
    const [rewardModalOpen, setRewardModalOpen] = useState(false);
    const [chosenHintStock, setChosenHintStock] = useState(null);
    const [evaluatedYear, setEvaluatedYear] = useState(null);

    const myTeamId = String(groupId || 1);
    const stockList = useMemo(() => Object.values(gameState.stocks || {}), [gameState.stocks]);
    const rawPortfolio = (nickname && gameState.portfolios?.[nickname]) || gameState.portfolios?.[myTeamId];

    // 실시간 활동 정보 전송 헬퍼 (호스트 모니터링용)
    const emitActivity = (action, stockKey = null, direction = null) => {
        try {
            const bc = new BroadcastChannel('quizrun_screen_sync');
            bc.postMessage({
                type: 'STOCK_GAME_PARTICIPANT_ACTIVITY',
                payload: { teamId: myTeamId, nickname, action, stockKey, direction }
            });
            setTimeout(() => bc.close(), 200);
        } catch (e) {}

        if (socket) {
            socket.emit('stock_game:participant_activity', {
                pin,
                teamId: myTeamId,
                nickname,
                action,
                stockKey,
                direction
            });
            socket.emit('room:message', {
                pin,
                event: 'stock_game:participant_activity',
                payload: {
                    teamId: myTeamId,
                    nickname,
                    action,
                    stockKey,
                    direction
                }
            });
        }
    };

    // 모바일 하드웨어 뒤로가기 버튼(Galaxy 등) 트랩 및 단계별 뒤로가기
    useEffect(() => {
        window.history.pushState({ page: 'stock_game_root' }, '');

        const handlePopState = () => {
            if (rewardModalOpen) {
                setRewardModalOpen(false);
                window.history.pushState({ page: 'stock_game_root' }, '');
            } else if (selectedNews) {
                setSelectedNews(null);
                window.history.pushState({ page: 'stock_game_root' }, '');
            } else if (selectedSector) {
                setSelectedSector(null);
                window.history.pushState({ page: 'stock_game_root' }, '');
            } else if (selectedStockKey) {
                setSelectedStockKey(null);
                setTradeQty(0);
                setShowAnalysis(false);
                window.history.pushState({ page: 'stock_game_root' }, '');
            } else if (activeTab !== 'stocks') {
                setActiveTab('stocks');
                window.history.pushState({ page: 'stock_game_root' }, '');
            } else {
                window.history.pushState({ page: 'stock_game_root' }, '');
            }
        };

        window.addEventListener('popstate', handlePopState);
        return () => {
            window.removeEventListener('popstate', handlePopState);
        };
    }, [rewardModalOpen, selectedNews, selectedSector, selectedStockKey, activeTab]);

    useEffect(() => {
        if (!socket) return;

        const handleSync = (data) => {
            const payload = data.payload || data;
            if (payload) {
                setGameState(prev => ({
                    ...prev,
                    ...payload
                }));
            }
        };

        socket.on('stock_game:state_sync', handleSync);
        socket.on('room:message', (msg) => {
            if (msg && msg.event === 'stock_game:state_sync' && msg.payload) {
                handleSync(msg.payload);
            }
        });

        // Request host for latest state upon mount
        if (socket && pin) {
            socket.emit('stock_game:request_sync', { pin });
            socket.emit('room:message', { pin, event: 'stock_game:request_sync', payload: {} });
        }

        try {
            const bc = new BroadcastChannel('quizrun_screen_sync');
            bc.postMessage({ type: 'SCREEN_PING' });
            bc.onmessage = (e) => {
                if (e.data?.type === 'STOCK_GAME_SCREEN_UPDATE' && e.data?.payload) {
                    handleSync(e.data.payload);
                }
            };
        } catch (e) {}

        return () => {
            socket.off('stock_game:state_sync', handleSync);
        };
    }, [socket, pin]);

    // 내 포트폴리오 계산
    const myPortfolio = useMemo(() => {
        const defaultSeed = (myScore && myScore > 0) ? myScore : 1000000;
        if (!rawPortfolio) {
            return {
                seedMoney: defaultSeed,
                cash: defaultSeed,
                holdings: {}
            };
        }
        const hasHoldings = Object.values(rawPortfolio.holdings || {}).some(qty => qty > 0);
        if (!hasHoldings && myScore && myScore > 0 && myScore !== rawPortfolio.seedMoney) {
            return {
                ...rawPortfolio,
                seedMoney: myScore,
                cash: myScore
            };
        }
        return rawPortfolio;
    }, [rawPortfolio, myScore]);

    // 내 주식 평가금 계산
    const myStockValue = useMemo(() => {
        let total = 0;
        stockList.forEach(s => {
            const qty = myPortfolio.holdings?.[s.key] || 0;
            const price = s.prices ? (s.prices[gameState.year] ?? s.prices[2015] ?? 0) : 0;
            total += qty * price;
        });
        return total;
    }, [myPortfolio.holdings, gameState.year, stockList]);

    const myTotalAsset = (myPortfolio.cash || 0) + myStockValue;
    const myReturnRate = (myPortfolio.seedMoney && myPortfolio.seedMoney > 0)
        ? (((myTotalAsset - myPortfolio.seedMoney) / myPortfolio.seedMoney) * 100).toFixed(1)
        : '0.0';

    const yearNewsList = useMemo(() => generateStockNewsForYear(gameState.year, gameState.stocks || {}), [gameState.year, gameState.stocks]);
    const hasMyVipHint = gameState.allowAllVipHint || Boolean(gameState.permissions[myTeamId]?.hint);

    const stockKeys = useMemo(() => ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J'], []);

    const myPredictions = useMemo(() => {
        const fromHost = gameState.predictions?.[myTeamId] || {};
        return {
            ...fromHost,
            ...localVotes
        };
    }, [gameState.predictions, myTeamId, localVotes]);

    const votedCount = useMemo(() => stockKeys.filter(k => Boolean(myPredictions[k])).length, [stockKeys, myPredictions]);
    const isAllVoted = useMemo(() => stockKeys.length > 0 && stockKeys.every(k => Boolean(myPredictions[k])), [stockKeys, myPredictions]);

    const calculatedHits = useMemo(() => {
        let hits = 0;
        yearNewsList.forEach(news => {
            if (myPredictions[news.stockKey] && myPredictions[news.stockKey] === news.direction) {
                hits++;
            }
        });
        return hits;
    }, [yearNewsList, myPredictions]);

    const myResult = gameState.predictionResults?.[myTeamId];
    const effectiveHits = calculatedHits;
    const isQualified = effectiveHits >= 5 || Boolean(myResult?.qualified) || gameState.allowAllVipHint;

    // 연도 변경 시 상태 리셋 (전 연도 예측, 선택 힌트, 상세 화면, 매매 입력 등 완전 초기화)
    useEffect(() => {
        setLocalVotes({});
        setEvaluatedYear(null);
        setChosenHintStock(null);
        setRewardModalOpen(false);
        setSelectedStockKey(null);
        setTradeQty(0);
        setShowAnalysis(false);
        setSelectedNews(null);
    }, [gameState.year]);

    // 체크 도중이라도 5개 이상 맞추면 즉시 특급 힌트 혜택 모달 팝업 & 정답 효과음!
    // 10개를 전부 다 체크했는데 5개 미만인 경우 아쉬운 결과 안내 모달 팝업 & 오답 효과음!
    useEffect(() => {
        if (evaluatedYear === gameState.year) return;

        if (calculatedHits >= 5) {
            setEvaluatedYear(gameState.year);
            setRewardModalOpen(true);
            playSound('correct');
        } else if (isAllVoted) {
            setEvaluatedYear(gameState.year);
            setRewardModalOpen(true);
            playSound('wrong');
        }
    }, [isAllVoted, evaluatedYear, gameState.year, calculatedHits]);

    const handleToggleVote = (stockKey, direction) => {
        const nextVal = myPredictions[stockKey] === direction ? null : direction;
        setLocalVotes(prev => ({
            ...prev,
            [stockKey]: nextVal
        }));

        emitActivity('PREDICT', stockKey, nextVal);

        try {
            const bc = new BroadcastChannel('quizrun_screen_sync');
            bc.postMessage({
                type: 'STOCK_GAME_PREDICT_VOTE',
                payload: { teamId: myTeamId, stockKey, direction: nextVal }
            });
        } catch (e) {}

        if (socket) {
            socket.emit('stock_game:predict', {
                pin,
                teamId: myTeamId,
                stockKey,
                direction: nextVal
            });
            socket.emit('room:message', {
                pin,
                event: 'stock_game:predict',
                payload: {
                    teamId: myTeamId,
                    stockKey,
                    direction: nextVal
                }
            });
        }
    };

    // 100% 특별 힌트 종목 선택 핸들러 (단 1회 선택 후 변경 불가)
    const handleSelectVipHint = (stockKey) => {
        if (chosenHintStock) return;
        setChosenHintStock(stockKey);
        try {
            const bc = new BroadcastChannel('quizrun_screen_sync');
            bc.postMessage({
                type: 'STOCK_GAME_VIP_HINT_SELECTED',
                payload: { teamId: myTeamId, nickname, stockKey, year: gameState.year }
            });
            setTimeout(() => bc.close(), 200);
        } catch (e) {}

        if (socket) {
            socket.emit('stock_game:vip_hint_selected', {
                pin,
                teamId: myTeamId,
                nickname,
                stockKey,
                year: gameState.year
            });
            socket.emit('room:message', {
                pin,
                event: 'stock_game:vip_hint_selected',
                payload: {
                    teamId: myTeamId,
                    nickname,
                    stockKey,
                    year: gameState.year
                }
            });
        }
    };

    // 현재 선택된 종목 객체
    const activeStockItem = useMemo(() => {
        if (!selectedStockKey) return null;
        return stockList.find(s => s.key === selectedStockKey) || null;
    }, [selectedStockKey, stockList]);

    // 종목 상세 화면 열기 (보유 중인 주식이면 기본 '매도' 탭, 미보유 주식이면 기본 '매수' 탭으로 스마트 진입)
    const handleOpenStockDetail = (key, defaultTrade = null) => {
        setSelectedStockKey(key);
        const holdings = myPortfolio.holdings?.[key] || 0;
        setTradeType(defaultTrade || (holdings > 0 ? 'SELL' : 'BUY'));
        setTradeQty(0);
        setShowAnalysis(false);
        emitActivity('READ_NEWS', key);
    };

    // 퍼센트 버튼 클릭 핸들러 (50% 누르면 가진 금액/보유수량에서 살 수 있는/팔 수 있는 수량 자동 계산)
    const handleSetPercentage = (pct, stockItem) => {
        if (!stockItem) return;
        const price = stockItem.prices ? (stockItem.prices[gameState.year] ?? stockItem.prices[2015] ?? 0) : 0;
        if (price <= 0) return;

        if (tradeType === 'BUY') {
            const availableCash = myPortfolio.cash || 0;
            const targetCash = availableCash * (pct / 100);
            const calcQty = Math.floor(targetCash / price);
            setTradeQty(calcQty);
        } else {
            const currentHoldings = myPortfolio.holdings?.[stockItem.key] || 0;
            const calcQty = Math.floor(currentHoldings * (pct / 100));
            setTradeQty(calcQty);
        }
    };

    // 매수 / 매도 주문 체결 실행
    const handleExecuteTrade = (stockItem) => {
        if (!stockItem) return;
        const qty = parseInt(tradeQty, 10);
        if (isNaN(qty) || qty <= 0) {
            alert('올바른 거래 수량을 입력해 주세요.');
            return;
        }

        const price = stockItem.prices ? (stockItem.prices[gameState.year] ?? stockItem.prices[2015] ?? 0) : 0;
        const currentHoldings = myPortfolio.holdings?.[stockItem.key] || 0;

        let newCash = myPortfolio.cash || 0;
        let newHoldings = { ...(myPortfolio.holdings || {}) };

        if (tradeType === 'BUY') {
            const totalCost = qty * price;
            if (newCash < totalCost) {
                alert(`예수금이 부족합니다! (필요 현금: ${totalCost.toLocaleString()}원 / 보유 현금: ${newCash.toLocaleString()}원)`);
                return;
            }
            newCash -= totalCost;
            newHoldings[stockItem.key] = currentHoldings + qty;
        } else {
            if (qty > currentHoldings) {
                alert(`보유 수량(${currentHoldings}주)보다 많이 매도할 수 없습니다.`);
                return;
            }
            const totalRevenue = qty * price;
            newCash += totalRevenue;
            newHoldings[stockItem.key] = currentHoldings - qty;
        }

        playSound('submit');
        emitActivity('TRADE', stockItem.key);

        const updatedPortfolio = {
            ...myPortfolio,
            cash: newCash,
            holdings: newHoldings
        };

        // 로컬 상태 동기화 및 호스트 전달
        setGameState(prev => ({
            ...prev,
            portfolios: {
                ...prev.portfolios,
                [myTeamId]: updatedPortfolio,
                ...(nickname ? { [nickname]: updatedPortfolio } : {})
            }
        }));

        try {
            const bc = new BroadcastChannel('quizrun_screen_sync');
            bc.postMessage({
                type: 'STOCK_GAME_EXECUTE_ORDER',
                payload: {
                    teamId: myTeamId,
                    nickname: nickname,
                    cash: newCash,
                    holdings: newHoldings
                }
            });
        } catch (e) {}

        if (socket) {
            socket.emit('stock_game:execute_order', {
                pin,
                teamId: myTeamId,
                nickname: nickname,
                cash: newCash,
                holdings: newHoldings
            });
            socket.emit('room:message', {
                pin,
                event: 'stock_game:execute_order',
                payload: {
                    teamId: myTeamId,
                    nickname: nickname,
                    cash: newCash,
                    holdings: newHoldings
                }
            });
        }

        setTradeQty(0);
        alert(`[${stockItem.key}] ${stockItem.sector} ${qty.toLocaleString()}주 ${tradeType === 'BUY' ? '매수' : '매도'} 체결이 완료되었습니다!`);
    };

    return (
        <div style={{
            width: '100%',
            minHeight: '100vh',
            background: '#090d16',
            color: '#f8fafc',
            display: 'flex',
            flexDirection: 'column',
            fontFamily: "'Pretendard', 'Noto Sans KR', sans-serif", wordBreak: 'keep-all', overflowWrap: 'break-word'
        }}>
            {/* Special Hint Reward Trigger Banner for Participant */}
            {(isQualified || isAllVoted) && (
                <div style={{ padding: '8px 12px 0 12px', background: '#0f172a' }}>
                    <button
                        onClick={() => setRewardModalOpen(true)}
                        className="animate-pulse"
                        style={{
                            background: isQualified ? 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)' : 'linear-gradient(135deg, #0284c7 0%, #0369a1 100%)',
                            color: isQualified ? '#1e293b' : '#ffffff',
                            border: 'none',
                            borderRadius: '12px',
                            padding: '10px 16px',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '8px',
                            fontWeight: '900',
                            fontSize: '0.92rem',
                            boxShadow: isQualified ? '0 4px 15px rgba(245, 158, 11, 0.4)' : '0 4px 15px rgba(2, 132, 199, 0.3)',
                            width: '100%'
                        }}
                    >
                        {isQualified ? <Trophy size={18} color="#1e293b" /> : <AlertCircle size={18} color="#ffffff" />}
                        <span>
                            {isQualified
                                ? `👑 100% 특별 힌트 획득! (${effectiveHits}개 적중 달성!) - 클릭하여 힌트 종목 선택`
                                : `📢 뉴스 분석 예측 결과 (${effectiveHits}/10개 적중) - 클릭하여 결과 확인`}
                        </span>
                    </button>
                </div>
            )}

            {/* Top Participant Header */}
            <div style={{
                background: '#0f172a',
                borderBottom: '1px solid #1e293b',
                padding: '14px 20px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <span style={{
                        background: '#f43f5e',
                        color: 'white',
                        padding: '4px 12px',
                        borderRadius: '10px',
                        fontWeight: '900',
                        fontSize: '1rem'
                    }}>
                        {gameState.year}년 증시
                    </span>
                    <span style={{ fontSize: '1.05rem', fontWeight: '800', wordBreak: 'keep-all', overflowWrap: 'break-word' }}>
                        {myTeamId}조 ({nickname || '참여자'})
                    </span>
                </div>

                <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>총 자산 가치</div>
                    <div style={{ fontSize: '1.15rem', fontWeight: '900', color: '#10b981' }}>
                        {formatKoreanMoney(myTotalAsset)}
                        <span style={{ fontSize: '0.8rem', marginLeft: '4px', color: Number(myReturnRate) >= 0 ? '#f43f5e' : '#38bdf8' }}>
                            ({Number(myReturnRate) >= 0 ? `+${myReturnRate}%` : `${myReturnRate}%`})
                        </span>
                    </div>
                </div>
            </div>

            {/* Prediction / Hits Quick Notification Bar */}
            <div style={{
                background: '#1e293b',
                padding: '8px 16px',
                borderBottom: '1px solid #334155',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                fontSize: '0.82rem',
                flexWrap: 'wrap',
                gap: '6px'
            }}>
                <span style={{ color: '#94a3b8', fontWeight: '700' }}>
                    🎯 예측 현황: <strong style={{ color: isQualified ? '#f59e0b' : (isAllVoted ? '#10b981' : '#38bdf8') }}>
                        {votedCount}/10개 체크 {isQualified ? `(🎉 ${effectiveHits}개 적중 달성!)` : (isAllVoted ? `(${effectiveHits}개 적중)` : '')}
                    </strong>
                </span>
                {(isQualified || isAllVoted) ? (
                    <button
                        onClick={() => setRewardModalOpen(true)}
                        style={{
                            background: isQualified ? 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)' : '#334155',
                            color: isQualified ? '#1e293b' : '#38bdf8',
                            border: isQualified ? '1px solid #fbbf24' : '1px solid #475569',
                            borderRadius: '8px',
                            padding: '4px 10px',
                            fontSize: '0.78rem',
                            fontWeight: '900',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px'
                        }}
                    >
                        {isQualified ? <Trophy size={13} color="#1e293b" /> : <AlertCircle size={13} />}
                        <span>
                            {isQualified ? `👑 ${effectiveHits}개 적중 (100% 힌트 보기)` : `📢 ${effectiveHits}개 적중 (결과 안내)`}
                        </span>
                    </button>
                ) : (
                    <span style={{ color: '#cbd5e1' }}>
                        체크 도중 5개 이상 적중 시 100% 힌트 즉시 지급
                    </span>
                )}
            </div>

            {/* Mobile / Responsive Navigation Tabs */}
            <div style={{
                display: 'flex',
                background: '#1e293b',
                borderBottom: '1px solid #334155'
            }}>
                {[
                    { id: 'stocks', label: '📈 10개 종목 시세', count: stockList.length },
                    { id: 'sectors', label: '🏛️ 섹터 도감', count: 14 },
                    { id: 'portfolio', label: '💼 내 자산/보유' }
                ].map(tab => (
                    <button
                        key={tab.id}
                        onClick={() => {
                            setActiveTab(tab.id);
                            setSelectedStockKey(null);
                        }}
                        style={{
                            flex: 1,
                            padding: '12px 6px',
                            background: activeTab === tab.id ? '#0f172a' : 'transparent',
                            color: activeTab === tab.id ? '#38bdf8' : '#94a3b8',
                            border: 'none',
                            borderBottom: activeTab === tab.id ? '2px solid #38bdf8' : 'none',
                            fontWeight: '800',
                            fontSize: '0.9rem',
                            cursor: 'pointer',
                            transition: 'all 0.2s'
                        }}
                    >
                        {tab.label}
                    </button>
                ))}
            </div>

            {/* Main Content Area */}
            <div style={{ flex: 1, padding: '14px', overflowY: 'auto' }}>

                {/* A) 종목 상세 & 뉴스 & 매수/매도 화면 (특정 주식을 클릭했을 때 표시) */}
                {selectedStockKey && activeStockItem ? (
                    (() => {
                        const s = activeStockItem;
                        const price = s.prices ? (s.prices[gameState.year] ?? s.prices[2015] ?? 0) : 0;
                        const prevYear = gameState.year > 2015 ? gameState.year - 1 : 2015;
                        const prevP = s.prices ? (s.prices[prevYear] ?? price) : price;
                        const diff = price - prevP;
                        const pct = prevP > 0 ? ((diff / prevP) * 100).toFixed(1) : '0.0';
                        const myHoldingsQty = myPortfolio.holdings?.[s.key] || 0;
                        const stockNews = yearNewsList.find(n => n.stockKey === s.key);
                        const myVote = myPredictions[s.key];

                        // 거래 금액 계산
                        const numQty = parseInt(tradeQty, 10) || 0;
                        const orderTotalCost = numQty * price;
                        const availableCash = myPortfolio.cash || 0;

                        // 거래 후 예상 잔액 및 차이
                        const afterCash = tradeType === 'BUY'
                            ? availableCash - orderTotalCost
                            : availableCash + orderTotalCost;
                        const cashDiff = tradeType === 'BUY' ? -orderTotalCost : orderTotalCost;
                        const isOverBudget = tradeType === 'BUY' && availableCash < orderTotalCost;
                        const isOverShares = tradeType === 'SELL' && myHoldingsQty < numQty;

                        return (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                                {/* Top Back Header Bar */}
                                <div style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'space-between',
                                    background: '#0f172a',
                                    padding: '8px 12px',
                                    borderRadius: '12px',
                                    border: '1px solid #1e293b'
                                }}>
                                    <button
                                        onClick={() => {
                                            setSelectedStockKey(null);
                                            setTradeQty(0);
                                            setShowAnalysis(false);
                                        }}
                                        style={{
                                            background: '#334155',
                                            color: '#ffffff',
                                            border: 'none',
                                            borderRadius: '8px',
                                            padding: '8px 12px',
                                            fontWeight: '800',
                                            fontSize: '0.86rem',
                                            cursor: 'pointer',
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '6px'
                                        }}
                                    >
                                        <ArrowLeft size={16} /> 목록으로
                                    </button>
                                    <span style={{ fontSize: '0.82rem', color: '#94a3b8', fontWeight: '700' }}>
                                        종목 상세 및 뉴스 / 주문
                                    </span>
                                </div>

                                {/* 🔥 전 연도 매수 주식 보유 상태 및 의사결정 안내 배너 */}
                                {myHoldingsQty > 0 && (
                                    <div style={{
                                        background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.22) 0%, rgba(5, 150, 105, 0.1) 100%)',
                                        border: '2px solid #10b981',
                                        borderRadius: '16px',
                                        padding: '14px 16px',
                                        display: 'flex',
                                        flexDirection: 'column',
                                        gap: '8px',
                                        boxShadow: '0 4px 20px rgba(16, 185, 129, 0.25)'
                                    }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '6px' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                                <span style={{ fontSize: '1.25rem' }}>🔥</span>
                                                <span style={{ fontSize: '1.05rem', fontWeight: '900', color: '#34d399' }}>
                                                    현재 보유 중인 주식입니다!
                                                </span>
                                            </div>
                                            <span style={{
                                                background: '#10b981',
                                                color: '#ffffff',
                                                padding: '3px 10px',
                                                borderRadius: '8px',
                                                fontSize: '0.85rem',
                                                fontWeight: '900',
                                                boxShadow: '0 2px 8px rgba(16, 185, 129, 0.4)'
                                            }}>
                                                총 {myHoldingsQty.toLocaleString()}주 보유 중
                                            </span>
                                        </div>
                                        <div style={{
                                            display: 'flex',
                                            justifyContent: 'space-between',
                                            alignItems: 'center',
                                            background: 'rgba(0,0,0,0.35)',
                                            padding: '10px 14px',
                                            borderRadius: '10px',
                                            fontSize: '0.88rem'
                                        }}>
                                            <span style={{ color: '#cbd5e1' }}>현재 평가 금액 ({price.toLocaleString()}원 × {myHoldingsQty}주)</span>
                                            <span style={{ fontWeight: '900', color: '#ffffff', fontSize: '1.15rem' }}>
                                                {(myHoldingsQty * price).toLocaleString()}원
                                            </span>
                                        </div>
                                        <div style={{ fontSize: '0.82rem', color: '#6ee7b7', lineHeight: '1.45', background: 'rgba(16, 185, 129, 0.1)', padding: '8px 10px', borderRadius: '8px' }}>
                                            💡 <strong>투자 의사결정 안내:</strong> {gameState.year}년 뉴스 이슈와 주가 전망을 분석하여<br/>
                                            👉 이익 실현 또는 손절을 원하시면 <strong>[🔵 매도]</strong>로 주식을 팔아 현금화하고,<br/>
                                            👉 추가 상승이 기대되면 <strong>[🔴 매수]</strong>로 더 사거나 <strong>[그대로 보유]</strong>하세요!
                                        </div>
                                    </div>
                                )}

                                {/* Stock Info Main Card */}
                                <div style={{
                                    background: '#0f172a',
                                    border: myHoldingsQty > 0 ? '1.5px solid #10b981' : '1px solid #1e293b',
                                    borderRadius: '16px',
                                    padding: '14px 16px',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    gap: '10px'
                                }}>
                                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                            <div style={{
                                                width: '40px',
                                                height: '40px',
                                                borderRadius: '10px',
                                                background: s.badgeColor || '#3b82f6',
                                                color: 'white',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                fontWeight: '900',
                                                fontSize: '1.25rem'
                                            }}>
                                                {s.key}
                                            </div>
                                            <div>
                                                <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: '900', color: '#f8fafc' }}>
                                                    {gameState.isPubliclyRevealed ? `${s.sector} (${s.realName})` : `${s.key} ${s.sector}`}
                                                </h3>
                                                <div style={{ fontSize: '0.8rem', color: '#94a3b8', marginTop: '2px' }}>
                                                    내 보유: {myHoldingsQty > 0 ? (
                                                        <strong style={{ color: '#10b981', fontWeight: '900' }}>
                                                            🔥 {myHoldingsQty.toLocaleString()}주 (평가액: {(myHoldingsQty * price).toLocaleString()}원)
                                                        </strong>
                                                    ) : (
                                                        <strong style={{ color: '#64748b' }}>0주</strong>
                                                    )}
                                                </div>
                                            </div>
                                        </div>

                                        <div style={{ textAlign: 'right' }}>
                                            <div style={{ fontSize: '1.3rem', fontWeight: '900', color: '#ffffff' }}>
                                                {price.toLocaleString()}원
                                            </div>
                                            {gameState.year > 2015 && (
                                                <div style={{
                                                    fontSize: '0.8rem',
                                                    fontWeight: '800',
                                                    color: diff > 0 ? '#f43f5e' : (diff < 0 ? '#38bdf8' : '#94a3b8')
                                                }}>
                                                    {diff > 0 ? `▲ +${diff.toLocaleString()}` : (diff < 0 ? `▼ ${diff.toLocaleString()}` : '-')}
                                                    <span> ({diff > 0 ? `+${pct}` : pct}%)</span>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                {/* Stock Specific News Section (간결하고 직관적인 뉴스 카드) */}
                                <div style={{
                                    background: '#0f172a',
                                    border: '1px solid #1e293b',
                                    borderRadius: '16px',
                                    padding: '14px 16px',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    gap: '10px'
                                }}>
                                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                            <Newspaper size={17} color="#f59e0b" />
                                            <h4 style={{ margin: 0, fontSize: '0.98rem', fontWeight: '900', color: '#f8fafc' }}>
                                                [{s.key}] {gameState.year}년 뉴스 이슈
                                            </h4>
                                        </div>
                                        <button
                                            onClick={() => setParticipantEasyNews(!participantEasyNews)}
                                            style={{
                                                background: participantEasyNews ? '#f59e0b' : '#334155',
                                                color: participantEasyNews ? '#1e293b' : '#f8fafc',
                                                border: 'none',
                                                borderRadius: '8px',
                                                padding: '3px 8px',
                                                fontSize: '0.74rem',
                                                fontWeight: '800',
                                                cursor: 'pointer'
                                            }}
                                        >
                                            {participantEasyNews ? '📰 원본 뉴스 보기' : '🐣 쉬운 뉴스 보기'}
                                        </button>
                                    </div>

                                    {stockNews ? (
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                                                <span style={{
                                                    background: '#f43f5e',
                                                    color: 'white',
                                                    padding: '2px 8px',
                                                    borderRadius: '6px',
                                                    fontSize: '0.72rem',
                                                    fontWeight: '800'
                                                }}>
                                                    {stockNews.tag || '속보'}
                                                </span>
                                                <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>
                                                    {stockNews.media || '경제종합'} · {stockNews.date || `${gameState.year}.06`}
                                                </span>
                                            </div>

                                            <div style={{ fontSize: '0.98rem', fontWeight: '800', color: '#f1f5f9', lineHeight: '1.4' }}>
                                                {stockNews.headline}
                                            </div>

                                            <div style={{
                                                background: participantEasyNews ? 'rgba(245, 158, 11, 0.1)' : '#1e293b',
                                                borderRadius: '10px',
                                                padding: '10px 12px',
                                                fontSize: '0.88rem',
                                                color: participantEasyNews ? '#fef3c7' : '#cbd5e1',
                                                lineHeight: '1.6',
                                                border: participantEasyNews ? '1px solid #f59e0b' : '1px solid rgba(255, 255, 255, 0.05)',
                                                whiteSpace: 'pre-line',
                                                wordBreak: 'keep-all',
                                                overflowWrap: 'break-word'
                                            }}>
                                                {participantEasyNews ? (stockNews.easyContent || stockNews.content) : stockNews.content}
                                            </div>

                                            {/* Term Glossary Footnotes */}
                                            {stockNews.glossary && stockNews.glossary.length > 0 && (
                                                <div style={{
                                                    background: 'rgba(59, 130, 246, 0.08)',
                                                    border: '1px solid rgba(59, 130, 246, 0.25)',
                                                    borderRadius: '10px',
                                                    padding: '8px 12px',
                                                    display: 'flex',
                                                    flexDirection: 'column',
                                                    gap: '4px'
                                                }}>
                                                    <div style={{ fontSize: '0.78rem', fontWeight: '900', color: '#60a5fa' }}>
                                                        📌 주요 경제/산업 용어 해설
                                                    </div>
                                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                                                        {stockNews.glossary.map((g, idx) => (
                                                            <div key={idx} style={{ fontSize: '0.75rem', color: '#93c5fd', lineHeight: '1.35' }}>
                                                                <strong style={{ color: '#bfdbfe' }}>• {g.term}:</strong> {g.def}
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            )}

                                            {/* Prediction Vote Bar (심플한 상승/하락 버튼) */}
                                            <div style={{
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'space-between',
                                                background: 'rgba(30, 41, 59, 0.6)',
                                                padding: '8px 12px',
                                                borderRadius: '10px',
                                                border: '1px solid rgba(255, 255, 255, 0.08)',
                                                marginTop: '2px'
                                            }}>
                                                <span style={{ fontSize: '0.82rem', color: '#cbd5e1', fontWeight: '800' }}>
                                                    당해 연도 등락 예측:
                                                </span>
                                                <div style={{ display: 'flex', gap: '8px' }}>
                                                    <button
                                                        onClick={() => handleToggleVote(s.key, 'UP')}
                                                        style={{
                                                            background: myVote === 'UP' ? 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)' : 'rgba(239, 68, 68, 0.12)',
                                                            color: myVote === 'UP' ? 'white' : '#fca5a5',
                                                            border: myVote === 'UP' ? '1.5px solid #f87171' : '1px solid rgba(239, 68, 68, 0.3)',
                                                            borderRadius: '8px',
                                                            padding: '6px 14px',
                                                            fontSize: '0.84rem',
                                                            fontWeight: '900',
                                                            cursor: 'pointer',
                                                            boxShadow: myVote === 'UP' ? '0 2px 10px rgba(239, 68, 68, 0.4)' : 'none'
                                                        }}
                                                    >
                                                        ▲ 상승 {myVote === 'UP' && '✓'}
                                                    </button>
                                                    <button
                                                        onClick={() => handleToggleVote(s.key, 'DOWN')}
                                                        style={{
                                                            background: myVote === 'DOWN' ? 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)' : 'rgba(59, 130, 246, 0.12)',
                                                            color: myVote === 'DOWN' ? 'white' : '#93c5fd',
                                                            border: myVote === 'DOWN' ? '1.5px solid #60a5fa' : '1px solid rgba(59, 130, 246, 0.3)',
                                                            borderRadius: '8px',
                                                            padding: '6px 14px',
                                                            fontSize: '0.84rem',
                                                            fontWeight: '900',
                                                            cursor: 'pointer',
                                                            boxShadow: myVote === 'DOWN' ? '0 2px 10px rgba(59, 130, 246, 0.4)' : 'none'
                                                        }}
                                                    >
                                                        ▼ 하락 {myVote === 'DOWN' && '✓'}
                                                    </button>
                                                </div>
                                            </div>

                                            {/* Collapsible Fundamental & Technical Analysis Toggle Button */}
                                            <button
                                                onClick={() => setShowAnalysis(!showAnalysis)}
                                                style={{
                                                    background: showAnalysis ? '#334155' : 'rgba(56, 189, 248, 0.12)',
                                                    color: showAnalysis ? '#cbd5e1' : '#38bdf8',
                                                    border: showAnalysis ? '1px solid #475569' : '1px solid rgba(56, 189, 248, 0.35)',
                                                    borderRadius: '10px',
                                                    padding: '8px 12px',
                                                    fontSize: '0.82rem',
                                                    fontWeight: '800',
                                                    cursor: 'pointer',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center',
                                                    gap: '6px',
                                                    width: '100%',
                                                    transition: 'all 0.2s'
                                                }}
                                            >
                                                <BarChart3 size={15} />
                                                <span>{showAnalysis ? '📊 기업 분석 및 10년 차트 닫기 ▲' : '📊 기업 분석 및 10년 차트 보기 ▼'}</span>
                                            </button>

                                            {/* Collapsible Content */}
                                            {showAnalysis && (
                                                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '4px' }}>
                                                    {/* 10-Year Price Trend Chart */}
                                                    <StockPriceTrendChart stockItem={s} currentYear={gameState.year} />

                                                    {/* Fundamental & Technical Analysis Panel */}
                                                    <FundamentalTechnicalAnalysis stockItem={s} currentYear={gameState.year} newsItem={stockNews} />
                                                </div>
                                            )}

                                            {/* VIP Hint Box (if unlocked via host or selected as 100% hint stock) */}
                                            {(hasMyVipHint || chosenHintStock === s.key) && stockNews?.vipHint && (
                                                <div style={{
                                                    background: 'linear-gradient(135deg, rgba(245, 158, 11, 0.25) 0%, rgba(217, 119, 6, 0.12) 100%)',
                                                    border: '2px solid #f59e0b',
                                                    borderRadius: '14px',
                                                    padding: '12px 14px',
                                                    fontSize: '0.88rem',
                                                    color: '#fef3c7',
                                                    fontWeight: '700',
                                                    display: 'flex',
                                                    flexDirection: 'column',
                                                    gap: '6px',
                                                    boxShadow: '0 4px 15px rgba(245, 158, 11, 0.2)'
                                                }}>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#fbbf24', fontWeight: '900', fontSize: '0.92rem' }}>
                                                        <Sparkles size={18} color="#fbbf24" /> 100% VIP 특급 확정 정보
                                                    </div>
                                                    <div style={{ lineHeight: '1.5' }}>
                                                        {stockNews.vipHint}
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    ) : (
                                        <div style={{ color: '#64748b', fontSize: '0.82rem' }}>
                                            2015년은 기준가 연도입니다. 2016년부터 뉴스가 제공됩니다.
                                        </div>
                                    )}
                                </div>

                                {/* Trading Console (매수 / 매도 주문 입력 - 주 단위 표시 및 완벽한 반응형) */}
                                <div style={{
                                    background: '#0f172a',
                                    border: '1.5px solid #3b82f6',
                                    borderRadius: '16px',
                                    padding: '14px 16px',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    gap: '12px',
                                    boxShadow: '0 8px 24px rgba(0,0,0,0.3)'
                                }}>
                                    {/* 1) Mode Switcher: 매수 / 매도 */}
                                    <div style={{ display: 'flex', gap: '8px' }}>
                                        <button
                                            onClick={() => {
                                                setTradeType('BUY');
                                                setTradeQty(0);
                                            }}
                                            style={{
                                                flex: 1,
                                                padding: '10px',
                                                borderRadius: '10px',
                                                background: tradeType === 'BUY' ? 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)' : '#1e293b',
                                                color: 'white',
                                                border: tradeType === 'BUY' ? '2px solid #f87171' : '1px solid #334155',
                                                fontWeight: '900',
                                                fontSize: '1rem',
                                                cursor: 'pointer',
                                                boxShadow: tradeType === 'BUY' ? '0 4px 14px rgba(239, 68, 68, 0.4)' : 'none'
                                            }}
                                        >
                                            🔴 매수
                                        </button>
                                        <button
                                            onClick={() => {
                                                setTradeType('SELL');
                                                setTradeQty(0);
                                            }}
                                            style={{
                                                flex: 1,
                                                padding: '10px',
                                                borderRadius: '10px',
                                                background: tradeType === 'SELL' ? 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)' : '#1e293b',
                                                color: 'white',
                                                border: tradeType === 'SELL' ? '2px solid #60a5fa' : '1px solid #334155',
                                                fontWeight: '900',
                                                fontSize: '1rem',
                                                cursor: 'pointer',
                                                boxShadow: tradeType === 'SELL' ? '0 4px 14px rgba(59, 130, 246, 0.4)' : 'none'
                                            }}
                                        >
                                            🔵 매도
                                        </button>
                                    </div>

                                    {/* Mode status summary */}
                                    <div style={{
                                        fontSize: '0.82rem',
                                        color: tradeType === 'SELL' ? '#93c5fd' : '#fca5a5',
                                        background: tradeType === 'SELL' ? 'rgba(59, 130, 246, 0.12)' : 'rgba(239, 68, 68, 0.12)',
                                        border: tradeType === 'SELL' ? '1px solid rgba(59, 130, 246, 0.3)' : '1px solid rgba(239, 68, 68, 0.3)',
                                        padding: '8px 12px',
                                        borderRadius: '10px',
                                        fontWeight: '700'
                                    }}>
                                        {tradeType === 'BUY'
                                            ? (myHoldingsQty > 0
                                                ? `현재 ${myHoldingsQty.toLocaleString()}주 보유 중이며, 보유 현금(${availableCash.toLocaleString()}원)으로 추가 매수합니다.`
                                                : `보유 현금(${availableCash.toLocaleString()}원)으로 [${s.key} ${s.sector}] 주식을 신규 매수합니다.`)
                                            : `보유 중인 ${myHoldingsQty.toLocaleString()}주 중 원하는 수량을 매도하여 현금화합니다.`}
                                    </div>

                                    {/* 2) Quantity & Percentage Controls */}
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                            <span style={{ fontSize: '0.82rem', fontWeight: '800', color: '#e2e8f0' }}>
                                                주문 수량 설정 (주):
                                            </span>
                                            {/* Percentage buttons: 10%, 25%, 50%, 75%, 100% */}
                                            <div style={{ display: 'flex', gap: '3px' }}>
                                                {[10, 25, 50, 75, 100].map(pctVal => (
                                                    <button
                                                        key={pctVal}
                                                        onClick={() => handleSetPercentage(pctVal, s)}
                                                        style={{
                                                            background: tradeType === 'BUY' ? '#7f1d1d' : '#1e3a8a',
                                                            color: '#f8fafc',
                                                            border: '1px solid rgba(255,255,255,0.2)',
                                                            borderRadius: '6px',
                                                            padding: '3px 6px',
                                                            fontSize: '0.72rem',
                                                            fontWeight: '800',
                                                            cursor: 'pointer'
                                                        }}
                                                    >
                                                        {pctVal}%
                                                    </button>
                                                ))}
                                            </div>
                                        </div>

                                        {/* Stepper Input row (한 화면에 +10과 +100까지 모두 컴팩트하게 표시) */}
                                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px', width: '100%' }}>
                                            <button
                                                onClick={() => setTradeQty(Math.max(0, numQty - 100))}
                                                style={{ background: '#334155', color: 'white', border: 'none', borderRadius: '8px', padding: '8px 6px', minWidth: '46px', fontSize: '0.82rem', fontWeight: 'bold', cursor: 'pointer' }}
                                            >
                                                -100
                                            </button>
                                            <button
                                                onClick={() => setTradeQty(Math.max(0, numQty - 10))}
                                                style={{ background: '#334155', color: 'white', border: 'none', borderRadius: '8px', padding: '8px 6px', minWidth: '40px', fontSize: '0.82rem', fontWeight: 'bold', cursor: 'pointer' }}
                                            >
                                                -10
                                            </button>
                                            <div style={{
                                                flex: 1,
                                                minWidth: '80px',
                                                maxWidth: '140px',
                                                display: 'flex',
                                                alignItems: 'center',
                                                background: '#090d16',
                                                border: '1px solid #475569',
                                                borderRadius: '8px',
                                                padding: '4px 8px'
                                            }}>
                                                <input
                                                    type="number"
                                                    value={tradeQty || ''}
                                                    placeholder="0"
                                                    onChange={(e) => {
                                                        const val = parseInt(e.target.value, 10);
                                                        setTradeQty(isNaN(val) ? 0 : Math.max(0, val));
                                                    }}
                                                    style={{
                                                        width: '100%',
                                                        minWidth: 0,
                                                        background: 'transparent',
                                                        border: 'none',
                                                        outline: 'none',
                                                        color: '#ffffff',
                                                        textAlign: 'right',
                                                        fontWeight: '900',
                                                        fontSize: '1.15rem'
                                                    }}
                                                />
                                                <span style={{ color: '#94a3b8', fontWeight: '800', fontSize: '0.95rem', marginLeft: '4px' }}>주</span>
                                            </div>
                                            <button
                                                onClick={() => setTradeQty(numQty + 10)}
                                                style={{ background: '#334155', color: 'white', border: 'none', borderRadius: '8px', padding: '8px 6px', minWidth: '40px', fontSize: '0.82rem', fontWeight: 'bold', cursor: 'pointer' }}
                                            >
                                                +10
                                            </button>
                                            <button
                                                onClick={() => setTradeQty(numQty + 100)}
                                                style={{ background: '#334155', color: 'white', border: 'none', borderRadius: '8px', padding: '8px 6px', minWidth: '46px', fontSize: '0.82rem', fontWeight: 'bold', cursor: 'pointer' }}
                                            >
                                                +100
                                            </button>
                                        </div>
                                    </div>

                                    {/* 3) Calculation & Difference Panel */}
                                    <div style={{
                                        background: '#1e293b',
                                        borderRadius: '12px',
                                        padding: '10px 14px',
                                        display: 'flex',
                                        flexDirection: 'column',
                                        gap: '5px',
                                        border: '1px solid #334155'
                                    }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem' }}>
                                            <span style={{ color: '#94a3b8' }}>1주당 시세</span>
                                            <span style={{ fontWeight: '700' }}>{price.toLocaleString()}원</span>
                                        </div>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem' }}>
                                            <span style={{ color: '#94a3b8' }}>총 {tradeType === 'BUY' ? '매수' : '매도'} 금액</span>
                                            <span style={{ fontWeight: '900', color: tradeType === 'BUY' ? '#f43f5e' : '#38bdf8' }}>
                                                {orderTotalCost.toLocaleString()}원
                                            </span>
                                        </div>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem', paddingTop: '4px', borderTop: '1px dashed #334155' }}>
                                            <span style={{ color: '#94a3b8' }}>현재 예수금(보유 현금)</span>
                                            <span style={{ fontWeight: '700', color: '#10b981' }}>{availableCash.toLocaleString()}원</span>
                                        </div>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.88rem', fontWeight: '900' }}>
                                            <span style={{ color: '#f8fafc' }}>체결 후 예상 예수금</span>
                                            <span style={{ color: afterCash >= 0 ? '#38bdf8' : '#ef4444' }}>
                                                {afterCash.toLocaleString()}원
                                            </span>
                                        </div>

                                        {tradeType === 'SELL' && (
                                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem', color: '#cbd5e1' }}>
                                                <span>매도 후 남은 주식 수량</span>
                                                <span style={{ fontWeight: '800', color: '#38bdf8' }}>{Math.max(0, myHoldingsQty - numQty)}주</span>
                                            </div>
                                        )}

                                        {isOverBudget && (
                                            <div style={{ color: '#ef4444', fontSize: '0.78rem', fontWeight: 'bold', marginTop: '4px', textAlign: 'center' }}>
                                                ⚠️ 가진 금액(예수금)이 {(orderTotalCost - availableCash).toLocaleString()}원 부족합니다!
                                            </div>
                                        )}
                                        {isOverShares && (
                                            <div style={{ color: '#ef4444', fontSize: '0.78rem', fontWeight: 'bold', marginTop: '4px', textAlign: 'center' }}>
                                                ⚠️ 보유한 주식 수량({myHoldingsQty}주)보다 많이 매도할 수 없습니다!
                                            </div>
                                        )}
                                    </div>

                                    {/* 4) Execute Order Button */}
                                    <button
                                        onClick={() => handleExecuteTrade(s)}
                                        disabled={numQty <= 0 || isOverBudget || isOverShares}
                                        style={{
                                            background: (numQty <= 0 || isOverBudget || isOverShares)
                                                ? '#334155'
                                                : (tradeType === 'BUY'
                                                    ? 'linear-gradient(135deg, #ef4444 0%, #b91c1c 100%)'
                                                    : 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)'),
                                            color: 'white',
                                            border: 'none',
                                            borderRadius: '12px',
                                            padding: '12px',
                                            fontSize: '1rem',
                                            fontWeight: '900',
                                            cursor: (numQty <= 0 || isOverBudget || isOverShares) ? 'not-allowed' : 'pointer',
                                            boxShadow: '0 4px 15px rgba(0,0,0,0.3)',
                                            marginTop: '2px'
                                        }}
                                    >
                                        ✓ {orderTotalCost.toLocaleString()}원 {tradeType === 'BUY' ? '매수 체결 완료' : '매도 체결 완료'}
                                    </button>
                                </div>
                            </div>
                        );
                    })()
                ) : (
                    <>
                        {/* 1) Stocks Tab: 종목 클릭 시 뉴스와 매매 화면으로 진입 */}
                        {activeTab === 'stocks' && (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                {/* 실시간 내 자산 가치 & 보유 현황 요약 미리보기 바 (매수/매도 즉시 반영) */}
                                <div style={{
                                    background: 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)',
                                    border: '1.5px solid #38bdf8',
                                    borderRadius: '16px',
                                    padding: '14px 16px',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    gap: '10px',
                                    boxShadow: '0 4px 16px rgba(56, 189, 248, 0.15)'
                                }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                            <DollarSign size={18} color="#38bdf8" />
                                            <span style={{ fontSize: '0.92rem', fontWeight: '900', color: '#f8fafc' }}>
                                                실시간 내 자산 현황 요약
                                            </span>
                                        </div>
                                        <div style={{
                                            fontSize: '0.82rem',
                                            fontWeight: '900',
                                            color: Number(myReturnRate) >= 0 ? '#f43f5e' : '#38bdf8',
                                            background: 'rgba(0,0,0,0.35)',
                                            padding: '3px 10px',
                                            borderRadius: '6px',
                                            border: Number(myReturnRate) >= 0 ? '1px solid rgba(244, 63, 94, 0.3)' : '1px solid rgba(56, 189, 248, 0.3)'
                                        }}>
                                            수익률: {Number(myReturnRate) >= 0 ? `+${myReturnRate}%` : `${myReturnRate}%`}
                                        </div>
                                    </div>

                                    <div style={{
                                        display: 'grid',
                                        gridTemplateColumns: 'repeat(3, 1fr)',
                                        gap: '8px',
                                        background: 'rgba(0,0,0,0.3)',
                                        padding: '10px',
                                        borderRadius: '12px',
                                        textAlign: 'center'
                                    }}>
                                        <div>
                                            <div style={{ fontSize: '0.72rem', color: '#94a3b8', marginBottom: '2px' }}>💰 총 자산 가치</div>
                                            <div style={{ fontSize: '1rem', fontWeight: '900', color: '#ffffff' }}>
                                                {formatKoreanMoney(myTotalAsset)}
                                            </div>
                                        </div>
                                        <div>
                                            <div style={{ fontSize: '0.72rem', color: '#94a3b8', marginBottom: '2px' }}>💵 보유 예수금</div>
                                            <div style={{ fontSize: '1rem', fontWeight: '900', color: '#10b981' }}>
                                                {formatKoreanMoney(myPortfolio.cash || 0)}
                                            </div>
                                        </div>
                                        <div>
                                            <div style={{ fontSize: '0.72rem', color: '#94a3b8', marginBottom: '2px' }}>📈 주식 평가액</div>
                                            <div style={{ fontSize: '1rem', fontWeight: '900', color: '#f59e0b' }}>
                                                {formatKoreanMoney(myStockValue)}
                                            </div>
                                        </div>
                                    </div>

                                    {/* 보유 주식 요약 태그들 */}
                                    {(() => {
                                        const ownedList = stockList.filter(s => (myPortfolio.holdings?.[s.key] || 0) > 0);
                                        const totalShares = ownedList.reduce((acc, s) => acc + (myPortfolio.holdings?.[s.key] || 0), 0);
                                        return (
                                            <div style={{ fontSize: '0.78rem', color: '#cbd5e1', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '4px', paddingTop: '2px', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                                                <span>
                                                    <strong style={{ color: '#38bdf8', marginRight: '4px' }}>보유 종목:</strong>
                                                    {ownedList.length > 0
                                                        ? ownedList.map(s => `[${s.key}] ${s.sector} ${myPortfolio.holdings[s.key]}주`).join(' · ')
                                                        : '없음 (예수금 100%)'}
                                                </span>
                                                <span style={{ color: totalShares > 0 ? '#38bdf8' : '#94a3b8', fontWeight: 'bold' }}>
                                                    총 {totalShares}주
                                                </span>
                                            </div>
                                        );
                                    })()}
                                </div>

                                <div style={{ fontSize: '0.84rem', color: '#94a3b8', marginBottom: '2px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <span>💡 <strong>종목을 클릭하면</strong> 해당 기업의 뉴스 확인 및 매수/매도를 진행할 수 있습니다.</span>
                                </div>
                                {stockList.map(s => {
                                    const price = s.prices[gameState.year] ?? s.prices[2015];
                                    const prevYear = gameState.year > 2015 ? gameState.year - 1 : 2015;
                                    const prevP = s.prices[prevYear] ?? price;
                                    const diff = price - prevP;
                                    const pct = prevP > 0 ? ((diff / prevP) * 100).toFixed(1) : '0.0';
                                    const myHoldings = myPortfolio.holdings?.[s.key] || 0;
                                    const curVote = myPredictions[s.key];
                                    const isHeld = myHoldings > 0;

                                    return (
                                        <div
                                            key={s.key}
                                            onClick={() => handleOpenStockDetail(s.key)}
                                            style={{
                                                background: isHeld 
                                                    ? 'linear-gradient(135deg, rgba(16, 185, 129, 0.16) 0%, #0f172a 100%)'
                                                    : '#0f172a',
                                                border: isHeld
                                                    ? '2px solid #10b981'
                                                    : (curVote ? '1.5px solid #38bdf8' : '1px solid #1e293b'),
                                                borderRadius: '14px',
                                                padding: '12px 14px',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'space-between',
                                                cursor: 'pointer',
                                                transition: 'all 0.2s ease',
                                                boxShadow: isHeld 
                                                    ? '0 4px 16px rgba(16, 185, 129, 0.25)'
                                                    : '0 2px 8px rgba(0,0,0,0.15)'
                                            }}
                                            onMouseEnter={(e) => e.currentTarget.style.borderColor = isHeld ? '#34d399' : (s.badgeColor || '#38bdf8')}
                                            onMouseLeave={(e) => e.currentTarget.style.borderColor = isHeld ? '#10b981' : (curVote ? '#38bdf8' : '#1e293b')}
                                        >
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                                <div style={{
                                                    width: '38px',
                                                    height: '38px',
                                                    borderRadius: '10px',
                                                    background: s.badgeColor || '#3b82f6',
                                                    color: 'white',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center',
                                                    fontWeight: '900',
                                                    fontSize: '1.15rem',
                                                    boxShadow: isHeld ? '0 0 10px rgba(16, 185, 129, 0.4)' : 'none'
                                                }}>
                                                    {s.key}
                                                </div>
                                                <div>
                                                    <div style={{ fontSize: '1rem', fontWeight: '800', color: '#f8fafc', display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                                                        <span>{gameState.isPubliclyRevealed ? `${s.sector} (${s.realName})` : `${s.key} ${s.sector}`}</span>
                                                        {isHeld && (
                                                            <span style={{
                                                                fontSize: '0.74rem',
                                                                padding: '2px 7px',
                                                                borderRadius: '6px',
                                                                background: 'rgba(16, 185, 129, 0.25)',
                                                                border: '1px solid #10b981',
                                                                color: '#34d399',
                                                                fontWeight: '900',
                                                                display: 'inline-flex',
                                                                alignItems: 'center',
                                                                gap: '3px'
                                                            }}>
                                                                🔥 {myHoldings}주 보유 중
                                                            </span>
                                                        )}
                                                        {curVote && (
                                                            <span style={{
                                                                fontSize: '0.72rem',
                                                                padding: '1px 6px',
                                                                borderRadius: '4px',
                                                                background: curVote === 'UP' ? 'rgba(239, 68, 68, 0.2)' : 'rgba(59, 130, 246, 0.2)',
                                                                color: curVote === 'UP' ? '#f87171' : '#60a5fa',
                                                                fontWeight: '800'
                                                            }}>
                                                                {curVote === 'UP' ? '▲상승' : '▼하락'}
                                                            </span>
                                                        )}
                                                    </div>
                                                    <div style={{ fontSize: '0.76rem', color: '#94a3b8', marginTop: '2px' }}>
                                                        {isHeld ? (
                                                            <span>
                                                                내 보유: <strong style={{ color: '#10b981', fontSize: '0.84rem' }}>{myHoldings}주</strong>
                                                                <span style={{ color: '#94a3b8' }}> (평가액: {(myHoldings * price).toLocaleString()}원)</span> · 
                                                                <strong style={{ color: '#34d399', marginLeft: '4px' }}>매도/추가매수 결정 →</strong>
                                                            </span>
                                                        ) : (
                                                            <span>
                                                                내 보유: <span style={{ color: '#64748b' }}>0주</span> · <span style={{ color: '#38bdf8' }}>뉴스/매매 →</span>
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>

                                            <div style={{ textAlign: 'right' }}>
                                                <div style={{ fontSize: '1.15rem', fontWeight: '900', color: '#ffffff' }}>
                                                    {price.toLocaleString()}원
                                                </div>
                                                {gameState.year > 2015 && (
                                                    <div style={{
                                                        fontSize: '0.78rem',
                                                        fontWeight: '800',
                                                        color: diff > 0 ? '#f43f5e' : (diff < 0 ? '#38bdf8' : '#94a3b8')
                                                    }}>
                                                        {diff > 0 ? `▲ +${diff.toLocaleString()}` : (diff < 0 ? `▼ ${diff.toLocaleString()}` : '-')}
                                                        <span> ({diff > 0 ? `+${pct}` : pct}%)</span>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}

                        {/* 2) Sectors Reference Tab */}
                        {activeTab === 'sectors' && (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                <div style={{ fontSize: '0.86rem', color: '#94a3b8', marginBottom: '4px' }}>
                                    100대 기업 14대 시장 섹터 도감 (클릭 시 상세 열람)
                                </div>
                                {MARKET_SECTORS_DIRECTORY.map(s => (
                                    <div
                                        key={s.id}
                                        onClick={() => setSelectedSector(s)}
                                        style={{
                                            background: '#0f172a',
                                            border: '1px solid #1e293b',
                                            borderRadius: '12px',
                                            padding: '12px 14px',
                                            display: 'flex',
                                            flexDirection: 'column',
                                            gap: '4px',
                                            cursor: 'pointer'
                                        }}
                                    >
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                <span style={{ fontSize: '1.2rem' }}>{s.icon}</span>
                                                <span style={{ fontWeight: '800', fontSize: '0.95rem' }}>{s.name}</span>
                                            </div>
                                            <span style={{ fontSize: '0.75rem', color: s.color, fontWeight: 'bold' }}>도감 열기 →</span>
                                        </div>
                                        <div style={{ fontSize: '0.78rem', color: '#94a3b8' }}>
                                            {s.keySensitivity}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}

                        {/* 3) Portfolio Tab */}
                        {activeTab === 'portfolio' && (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                                <div style={{ background: '#0f172a', padding: '16px', borderRadius: '16px', border: '1px solid #1e293b' }}>
                                    <div style={{ fontSize: '1rem', fontWeight: '800', color: '#38bdf8', marginBottom: '8px' }}>
                                        내 자산 총괄
                                    </div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid #1e293b' }}>
                                        <span style={{ color: '#94a3b8' }}>보유 현금</span>
                                        <span style={{ fontWeight: '800', color: '#10b981' }}>{formatKoreanMoney(myPortfolio.cash || 0)}</span>
                                    </div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid #1e293b' }}>
                                        <span style={{ color: '#94a3b8' }}>주식 평가액</span>
                                        <span style={{ fontWeight: '800', color: '#f59e0b' }}>{formatKoreanMoney(myStockValue)}</span>
                                    </div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0' }}>
                                        <span style={{ color: '#94a3b8' }}>총 평가 자산</span>
                                        <span style={{ fontWeight: '900', fontSize: '1.1rem', color: '#ffffff' }}>{formatKoreanMoney(myTotalAsset)}</span>
                                    </div>
                                </div>

                                <div style={{ background: '#0f172a', padding: '16px', borderRadius: '16px', border: '1px solid #1e293b' }}>
                                    <div style={{ fontSize: '1rem', fontWeight: '800', marginBottom: '10px' }}>보유 주식 목록 (클릭 시 즉시 매도)</div>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                        {stockList.filter(s => (myPortfolio.holdings?.[s.key] || 0) > 0).length === 0 ? (
                                            <div style={{ color: '#64748b', fontSize: '0.85rem', textAlign: 'center', padding: '16px 0' }}>
                                                현재 보유 중인 주식이 없습니다. (100% 현금 보유)
                                            </div>
                                        ) : (
                                            stockList.map(s => {
                                                const qty = myPortfolio.holdings?.[s.key] || 0;
                                                if (qty === 0) return null;
                                                const price = s.prices[gameState.year] ?? s.prices[2015];
                                                return (
                                                    <div
                                                        key={s.key}
                                                        onClick={() => handleOpenStockDetail(s.key, 'SELL')}
                                                        style={{
                                                            display: 'flex',
                                                            justifyContent: 'space-between',
                                                            alignItems: 'center',
                                                            fontSize: '0.88rem',
                                                            padding: '10px 12px',
                                                            background: '#1e293b',
                                                            borderRadius: '10px',
                                                            cursor: 'pointer',
                                                            border: '1px solid rgba(255,255,255,0.06)'
                                                        }}
                                                    >
                                                        <div>
                                                            <strong style={{ color: '#f8fafc' }}>[{s.key}] {s.sector}</strong>
                                                            <div style={{ fontSize: '0.76rem', color: '#38bdf8', marginTop: '2px' }}>
                                                                보유: {qty}주 (평가: {(qty * price).toLocaleString()}원)
                                                            </div>
                                                        </div>
                                                        <span style={{ fontWeight: 'bold', color: '#60a5fa', fontSize: '0.82rem' }}>매도 진행 →</span>
                                                    </div>
                                                );
                                            })
                                        )}
                                    </div>
                                </div>
                            </div>
                        )}
                    </>
                )}
            </div>

            {/* Special Hint Modal for Mobile Participant */}
            <SpecialHintRewardModal
                isOpen={rewardModalOpen}
                onClose={() => setRewardModalOpen(false)}
                currentYear={gameState.year}
                stocks={gameState.stocks || {}}
                hits={effectiveHits}
                selectedStockKey={chosenHintStock}
                onSelectStock={handleSelectVipHint}
            />

            {/* Modals */}
            {selectedNews && (
                <StockNewsModal
                    newsItem={selectedNews}
                    currentYear={gameState.year}
                    stocks={gameState.stocks}
                    onClose={() => setSelectedNews(null)}
                    hasVipHint={hasMyVipHint}
                    isHost={false}
                />
            )}

            {selectedSector && (
                <SectorDetailModal
                    sector={selectedSector}
                    onClose={() => setSelectedSector(null)}
                    allStocks={KOREA_TOP_100_STOCKS}
                    isPubliclyRevealed={gameState.isPubliclyRevealed}
                />
            )}
        </div>
    );
}

// =============================================================================
// 6. 기본 내보내기 메인 컴포넌트 (StockGame)
// =============================================================================
export default function StockGame({ socket, pin, isHost = false, participants = [], groupId, nickname, myScore }) {
    if (isHost) {
        return <StockGameHost socket={socket} pin={pin} participants={participants} />;
    }
    return <StockGameParticipant socket={socket} pin={pin} groupId={groupId} nickname={nickname} myScore={myScore} />;
}
