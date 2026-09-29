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

export function StockNewsModal({ newsItem, currentYear, onClose, hasVipHint = false, isHost = false, stocks = {} }) {
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
// (5개 이상 뉴스 분석 예측을 맞춘 참여자가 10개 종목 중 하나를 골라 100% 힌트를 받는 모달)
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
    const nextYear = currentYear >= 2025 ? 2025 : currentYear + 1;
    const stockList = Object.values(stocks);
    const chosenStock = selectedStockKey ? stocks[selectedStockKey] : null;

    let targetIsUp = false;
    let targetPct = '0.0';
    let targetDiff = 0;
    let targetNews = null;

    if (chosenStock) {
        const curP = chosenStock.prices[currentYear] ?? chosenStock.prices[2015];
        const nextP = chosenStock.prices[nextYear] ?? curP;
        targetDiff = nextP - curP;
        targetIsUp = targetDiff >= 0;
        targetPct = curP > 0 ? ((Math.abs(targetDiff) / curP) * 100).toFixed(1) : '0.0';
        
        const nextNewsList = generateStockNewsForYear(nextYear, stocks);
        targetNews = nextNewsList.find(n => n.stockKey === selectedStockKey);
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
                    boxShadow: '0 25px 60px -15px rgba(0, 0, 0, 0.6), 0 0 40px rgba(245, 158, 11, 0.25)',
                    border: '2px solid #f59e0b',
                    overflow: 'hidden',
                    display: 'flex',
                    flexDirection: 'column',
                    color: '#f8fafc'
                }}
            >
                {/* Header */}
                <div style={{
                    padding: '20px 24px',
                    background: 'linear-gradient(135deg, #78350f 0%, #1e293b 100%)',
                    borderBottom: '1px solid rgba(245, 158, 11, 0.3)',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center'
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <Trophy size={24} color="#f59e0b" />
                        <div>
                            <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: '900', color: '#fef3c7' }}>
                                👑 특급 VIP 힌트 선택 혜택
                            </h3>
                            <div style={{ fontSize: '0.8rem', color: '#fcd34d', fontWeight: '700', marginTop: '2px' }}>
                                뉴스 예측 {hits}개 적중 성공! (5개 이상 기준 달성)
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
                    <p style={{ margin: 0, fontSize: '0.95rem', color: '#e2e8f0', lineHeight: '1.5' }}>
                        축하합니다! 뉴스 분석 예측에서 우수한 적중률을 달성하셨습니다.
                        <br />
                        <strong>다음 연도({nextYear}년)에 주가가 오를지 떨어질지 알고 싶은 1개 종목을 선택하세요:</strong>
                    </p>

                    {/* 10 Stock Selection Grid */}
                    <div style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(2, 1fr)',
                        gap: '8px'
                    }}>
                        {stockList.map(s => {
                            const isSelected = selectedStockKey === s.key;
                            return (
                                <button
                                    key={s.key}
                                    onClick={() => onSelectStock && onSelectStock(s.key)}
                                    style={{
                                        background: isSelected ? 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)' : 'rgba(30, 41, 59, 0.7)',
                                        color: isSelected ? '#1e293b' : '#f8fafc',
                                        border: isSelected ? '2px solid #fbbf24' : '1px solid rgba(255, 255, 255, 0.1)',
                                        borderRadius: '12px',
                                        padding: '10px 14px',
                                        cursor: 'pointer',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '10px',
                                        transition: 'all 0.2s',
                                        boxShadow: isSelected ? '0 4px 15px rgba(245, 158, 11, 0.4)' : 'none'
                                    }}
                                >
                                    <div style={{
                                        width: '28px',
                                        height: '28px',
                                        borderRadius: '8px',
                                        background: isSelected ? '#1e293b' : (s.badgeColor || '#3b82f6'),
                                        color: isSelected ? '#fbbf24' : 'white',
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
                                </button>
                            );
                        })}
                    </div>

                    {/* Unlocked Hint Revelation Box */}
                    {chosenStock && (
                        <div style={{
                            background: 'linear-gradient(135deg, rgba(245, 158, 11, 0.15) 0%, rgba(217, 119, 6, 0.08) 100%)',
                            border: '2px solid #f59e0b',
                            borderRadius: '16px',
                            padding: '18px 20px',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '10px',
                            boxShadow: '0 8px 24px rgba(245, 158, 11, 0.2)'
                        }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <Sparkles size={20} color="#f59e0b" />
                                <span style={{ fontSize: '1.05rem', fontWeight: '900', color: '#fbbf24' }}>
                                    [{chosenStock.key} {chosenStock.sector}] {nextYear}년 100% 특급 확정 힌트
                                </span>
                            </div>

                            <div style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '12px',
                                padding: '10px 14px',
                                borderRadius: '10px',
                                background: targetIsUp ? 'rgba(239, 68, 68, 0.15)' : 'rgba(59, 130, 246, 0.15)',
                                border: targetIsUp ? '1px solid #ef4444' : '1px solid #3b82f6'
                            }}>
                                <span style={{
                                    fontSize: '1.25rem',
                                    fontWeight: '900',
                                    color: targetIsUp ? '#f87171' : '#60a5fa'
                                }}>
                                    {targetIsUp ? '▲ 확실한 상승 (호재 만발)' : '▼ 확실한 하락 (악재 지속)'}
                                </span>
                                <span style={{
                                    fontSize: '0.95rem',
                                    fontWeight: '800',
                                    color: '#cbd5e1'
                                }}>
                                    (예상 변동폭: {targetIsUp ? '+' : '-'}{targetPct}%)
                                </span>
                            </div>

                            <div style={{ fontSize: '0.9rem', color: '#fde68a', lineHeight: '1.6', fontWeight: '600' }}>
                                {targetNews?.vipHint ? targetNews.vipHint.replace(/🎯.*?\n/, '') : targetNews?.content}
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div style={{ padding: '14px 24px', background: '#0b1120', borderTop: '1px solid rgba(255, 255, 255, 0.08)', display: 'flex', justifyContent: 'flex-end' }}>
                    <button
                        onClick={onClose}
                        style={{
                            background: '#f59e0b',
                            color: '#1e293b',
                            border: 'none',
                            padding: '10px 22px',
                            borderRadius: '12px',
                            fontWeight: '900',
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
    const [selectedNews, setSelectedNews] = useState(null);
    const [selectedSector, setSelectedSector] = useState(null);
    const [showScreenQrModal, setShowScreenQrModal] = useState(false);

    const targetJoinUrl = publicUrl ? `${publicUrl}/participant?pin=${pin}` : `http://${serverIp || (typeof window !== 'undefined' ? window.location.hostname : '')}:5173/participant?pin=${pin}`;

    // A~J 10개 종목에 1:1 매칭되는 당해 연도 핵심 뉴스 10선
    const yearNewsList = useMemo(() => generateStockNewsForYear(year, stocks), [year, stocks]);

    // 서브모니터 화면 로컬 예측 및 힌트 모달 상태
    const [screenVotes, setScreenVotes] = useState({});
    const [rewardModalOpen, setRewardModalOpen] = useState(false);
    const [chosenHintStock, setChosenHintStock] = useState(null);

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
            width: '100vw',
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

            {/* 3-Column Layout: 한눈에 전체가 들어오는 비율 */}
            <div style={{
                flex: 1,
                display: 'grid',
                gridTemplateColumns: '260px 1fr 380px',
                gap: '12px',
                minHeight: 0,
                overflow: 'hidden'
            }}>
                {/* 1) LEFT COLUMN: 14대 시장 섹터 도감 (헤드라인 중심 컴팩트 뷰) */}
                <div style={{
                    background: 'rgba(15, 23, 42, 0.6)',
                    borderRadius: '16px',
                    border: '1px solid rgba(255, 255, 255, 0.08)',
                    padding: '12px 14px',
                    display: 'flex',
                    flexDirection: 'column',
                    overflow: 'hidden'
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <Building2 size={16} color="#38bdf8" />
                            <h3 style={{ margin: 0, fontSize: '0.98rem', fontWeight: '800', color: '#f8fafc' }}>
                                시장 섹터 도감 (14대)
                            </h3>
                        </div>
                        <span style={{ fontSize: '0.7rem', color: '#94a3b8' }}>클릭 시 상세 열람</span>
                    </div>

                    <div style={{
                        flex: 1,
                        overflowY: 'auto',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '4px',
                        paddingRight: '2px'
                    }}>
                        {MARKET_SECTORS_DIRECTORY.map((s) => (
                            <div
                                key={s.id}
                                onClick={() => setSelectedSector(s)}
                                style={{
                                    background: 'rgba(30, 41, 59, 0.5)',
                                    border: '1px solid rgba(255, 255, 255, 0.06)',
                                    borderRadius: '8px',
                                    padding: '6px 10px',
                                    cursor: 'pointer',
                                    transition: 'all 0.18s ease',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'space-between'
                                }}
                                onMouseEnter={(e) => {
                                    e.currentTarget.style.background = 'rgba(51, 65, 85, 0.8)';
                                    e.currentTarget.style.borderColor = s.color;
                                }}
                                onMouseLeave={(e) => {
                                    e.currentTarget.style.background = 'rgba(30, 41, 59, 0.5)';
                                    e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.06)';
                                }}
                            >
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <span style={{ fontSize: '1rem' }}>{s.icon}</span>
                                    <span style={{ fontSize: '0.84rem', fontWeight: '700', color: '#f1f5f9' }}>
                                        {s.name}
                                    </span>
                                </div>
                                <span style={{ fontSize: '0.7rem', color: s.color, fontWeight: '700' }}>
                                    상세 →
                                </span>
                            </div>
                        ))}
                    </div>
                </div>

                {/* 2) CENTER COLUMN: 당해 연도 10대 종목 실시간 시세판 (한 화면에 10개 모두 표시) */}
                <div style={{
                    background: 'rgba(15, 23, 42, 0.7)',
                    borderRadius: '16px',
                    border: '1px solid rgba(255, 255, 255, 0.08)',
                    padding: '12px 14px',
                    display: 'flex',
                    flexDirection: 'column',
                    overflow: 'hidden'
                }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <BarChart3 size={18} color="#f43f5e" />
                            <h2 style={{ margin: 0, fontSize: '1.15rem', fontWeight: '900', color: '#f8fafc' }}>
                                10대 종목 실시간 시세판 (1주당 가격)
                            </h2>
                        </div>
                        {isPubliclyRevealed && (
                            <span style={{
                                background: '#10b981',
                                color: 'white',
                                padding: '2px 8px',
                                borderRadius: '12px',
                                fontSize: '0.75rem',
                                fontWeight: '800'
                            }}>
                                ✓ 실제 기업명 공개 완료
                            </span>
                        )}
                    </div>

                    {/* Stock Cards Grid (2열 x 5행: 100vh에 10개 완벽하게 맞춤) */}
                    <div style={{
                        flex: 1,
                        display: 'grid',
                        gridTemplateColumns: 'repeat(2, 1fr)',
                        gridTemplateRows: 'repeat(5, 1fr)',
                        gap: '8px',
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
                                    style={{
                                        background: 'rgba(30, 41, 59, 0.7)',
                                        border: '1px solid rgba(255, 255, 255, 0.1)',
                                        borderRadius: '12px',
                                        padding: '6px 12px',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'space-between',
                                        boxShadow: '0 2px 8px rgba(0,0,0,0.12)'
                                    }}
                                >
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                        <div style={{
                                            width: '32px',
                                            height: '32px',
                                            borderRadius: '8px',
                                            background: item.badgeColor || '#3b82f6',
                                            color: 'white',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            fontSize: '1.05rem',
                                            fontWeight: '900',
                                            boxShadow: `0 2px 8px ${item.badgeColor}40`
                                        }}>
                                            {item.key}
                                        </div>
                                        <div>
                                            <div style={{ fontSize: '0.92rem', fontWeight: '800', color: '#f8fafc' }}>
                                                {displayName}
                                            </div>
                                            <div style={{ fontSize: '0.72rem', color: '#94a3b8', fontWeight: '600' }}>
                                                {item.sector}
                                            </div>
                                        </div>
                                    </div>

                                    <div style={{ textAlign: 'right' }}>
                                        <div style={{ fontSize: '1.15rem', fontWeight: '900', color: '#ffffff', letterSpacing: '0.3px' }}>
                                            {curPrice.toLocaleString()}
                                            <span style={{ fontSize: '0.75rem', marginLeft: '2px', opacity: 0.8 }}>원</span>
                                        </div>
                                        {year > 2015 && (
                                            <div style={{
                                                fontSize: '0.78rem',
                                                fontWeight: '800',
                                                color: isUp ? '#f43f5e' : (isDown ? '#38bdf8' : '#94a3b8'),
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'flex-end',
                                                gap: '2px'
                                            }}>
                                                {isUp && <ArrowUpRight size={13} />}
                                                {isDown && <ArrowDownRight size={13} />}
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

                {/* 3) RIGHT COLUMN: A~J 핵심 뉴스 10선 (헤드라인 중심 + 참여자 등락 예측 투표) */}
                <div style={{
                    background: 'rgba(15, 23, 42, 0.65)',
                    borderRadius: '16px',
                    border: '1px solid rgba(255, 255, 255, 0.08)',
                    padding: '12px 14px',
                    display: 'flex',
                    flexDirection: 'column',
                    overflow: 'hidden'
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <Newspaper size={17} color="#f59e0b" />
                            <h3 style={{ margin: 0, fontSize: '0.98rem', fontWeight: '800', color: '#f8fafc' }}>
                                {year}년 핵심 뉴스 10선 (A~J)
                            </h3>
                        </div>
                        <span style={{ fontSize: '0.7rem', color: '#f59e0b', fontWeight: '700' }}>
                            헤드라인 클릭 시 기사 열람
                        </span>
                    </div>

                    {/* News List (10개 종목별 헤드라인 + 오를지/내릴지 선택 버튼) */}
                    <div style={{
                        flex: 1,
                        overflowY: 'auto',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '6px',
                        paddingRight: '2px'
                    }}>
                        {yearNewsList.map((news) => {
                            const myVote = activePredictions[news.stockKey];
                            return (
                                <div
                                    key={news.id}
                                    style={{
                                        background: 'rgba(30, 41, 59, 0.55)',
                                        border: '1px solid rgba(255, 255, 255, 0.08)',
                                        borderRadius: '10px',
                                        padding: '7px 10px',
                                        display: 'flex',
                                        flexDirection: 'column',
                                        gap: '5px'
                                    }}
                                >
                                    {/* Headline row (Clickable to read full news modal) */}
                                    <div
                                        onClick={() => {
                                            if (allowAllNews) {
                                                setSelectedNews(news);
                                            } else {
                                                alert('호스트가 뉴스 열람 권한을 승인하지 않았습니다.');
                                            }
                                        }}
                                        style={{
                                            cursor: allowAllNews ? 'pointer' : 'not-allowed',
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '6px'
                                        }}
                                        title="클릭하여 뉴스 전문 및 분석 열람"
                                    >
                                        <span style={{
                                            background: news.badgeColor || '#3b82f6',
                                            color: 'white',
                                            padding: '1px 6px',
                                            borderRadius: '6px',
                                            fontSize: '0.75rem',
                                            fontWeight: '900',
                                            flexShrink: 0
                                        }}>
                                            {news.stockKey}
                                        </span>
                                        <span style={{
                                            fontSize: '0.72rem',
                                            color: '#38bdf8',
                                            fontWeight: '700',
                                            flexShrink: 0
                                        }}>
                                            [{news.sector}]
                                        </span>
                                        <div style={{
                                            fontSize: '0.8rem',
                                            fontWeight: '700',
                                            color: '#f1f5f9',
                                            whiteSpace: 'nowrap',
                                            overflow: 'hidden',
                                            textOverflow: 'ellipsis',
                                            flex: 1
                                        }}>
                                            {news.rawHeadline || news.headline}
                                        </div>
                                    </div>


                                </div>
                            );
                        })}
                    </div>

                    {/* Prediction Status Bottom Bar */}
                    <div style={{
                        marginTop: '8px',
                        padding: '8px 10px',
                        borderRadius: '8px',
                        background: 'rgba(15, 23, 42, 0.8)',
                        border: '1px solid rgba(255, 255, 255, 0.06)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between'
                    }}>
                        <div style={{ fontSize: '0.72rem', color: '#cbd5e1', fontWeight: '700' }}>
                            예측 완료: <strong style={{ color: '#38bdf8' }}>{totalVotedCount}/10개</strong>
                        </div>
                        <div style={{ fontSize: '0.7rem', color: '#f59e0b', fontWeight: '800' }}>
                            5개 이상 적중 시 100% 특별 힌트 획득!
                        </div>
                    </div>

                    {/* Sub-Monitor Only: 얼마를 투자했고, 현재 남은 현금이 얼마인지 요약 */}
                    <div style={{
                        marginTop: '10px',
                        padding: '10px 12px',
                        background: 'rgba(15, 23, 42, 0.85)',
                        borderRadius: '12px',
                        border: '1px solid rgba(56, 189, 248, 0.3)',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '6px'
                    }}>
                        <div style={{ fontSize: '0.82rem', fontWeight: '900', color: '#38bdf8', display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <DollarSign size={15} /> 참여자별 현황 (총 투자 금액 & 현재 남은 현금)
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', maxHeight: '160px', overflowY: 'auto' }}>
                            {Object.entries(portfolios || {}).map(([key, p]) => {
                                if (!p) return null;
                                let stockVal = 0;
                                stockList.forEach(s => {
                                    const q = p.holdings?.[s.key] || 0;
                                    const pr = s.prices ? (s.prices[year] ?? s.prices[2015] ?? 0) : 0;
                                    stockVal += q * pr;
                                });
                                const remainingCash = p.cash || 0;
                                return (
                                    <div key={key} style={{
                                        background: 'rgba(30, 41, 59, 0.7)',
                                        borderRadius: '8px',
                                        padding: '6px 10px',
                                        fontSize: '0.75rem',
                                        display: 'flex',
                                        justify: 'space-between',
                                        alignItems: 'center'
                                    }}>
                                        <span style={{ fontWeight: '800', color: '#f8fafc' }}>👤 {key}</span>
                                        <div style={{ display: 'flex', gap: '12px' }}>
                                            <span style={{ color: '#f59e0b', fontWeight: '800' }}>
                                                총 투자 금액: {stockVal.toLocaleString()}원
                                            </span>
                                            <span style={{ color: '#10b981', fontWeight: '800' }}>
                                                남은 현금(예수금): {remainingCash.toLocaleString()}원
                                            </span>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>
            </div>

            {/* Modals */}
            {selectedNews && (
                <StockNewsModal
                    newsItem={selectedNews}
                    currentYear={year}
                    onClose={() => setSelectedNews(null)}
                    hasVipHint={allowAllVipHint}
                    isHost={false}
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

            <AllOrdersResultModal
                isOpen={allOrdersModalOpen}
                onClose={() => {}}
                currentYear={year}
                portfolios={portfolios}
                stockList={stockList}
            />

            {/* Special 100% Hint Voucher Modal */}
            <SpecialHintRewardModal
                isOpen={rewardModalOpen}
                onClose={() => setRewardModalOpen(false)}
                hits={screenHitsCount}
                total={10}
                currentYear={year}
                stocks={stocks}
                selectedStockKey={chosenHintStock}
                onSelectStock={(key) => setChosenHintStock(key)}
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

    const displayTeams = (teamList && teamList.length > 0) ? teamList : Object.keys(portfolios || {}).map(id => ({ id, name: `${id}조` }));

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
                maxWidth: '820px',
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
                            🏆 {currentYear}년 모든 참여자 주문 체결 및 정산 결과
                        </h2>
                    </div>
                    <button
                        onClick={onClose}
                        style={{ background: '#334155', color: 'white', border: 'none', borderRadius: '10px', padding: '6px 14px', cursor: 'pointer', fontWeight: 'bold' }}
                    >
                        ✕ 닫기
                    </button>
                </div>

                <div style={{ fontSize: '0.88rem', color: '#94a3b8', background: '#1e293b', padding: '10px 14px', borderRadius: '10px' }}>
                    💡 <strong>금융 정산 보고서:</strong> 매매 주문이 체결된 각 참여자의 보유 자산은 <strong>[예수금]</strong>과 <strong>[주식 평가금액]</strong>으로 분리되어 자산 가치가 확정되었습니다.
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                    {displayTeams.map((team, idx) => {
                        const targetKey = String(team.id);
                        const p = portfolios[targetKey] || portfolios[team.name] || { seedMoney: 100000000, cash: 100000000, holdings: {} };
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
                        const cashVal = p.cash || 0;
                        const totalAssetVal = cashVal + stockVal;
                        const seedMoney = p.seedMoney || 100000000;
                        const returnRate = seedMoney > 0 ? (((totalAssetVal - seedMoney) / seedMoney) * 100).toFixed(1) : '0.0';

                        return (
                            <div key={targetKey} style={{
                                background: '#1e293b',
                                border: '1px solid #334155',
                                borderRadius: '16px',
                                padding: '18px',
                                display: 'flex',
                                flexDirection: 'column',
                                gap: '12px'
                            }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <div style={{ fontSize: '1.1rem', fontWeight: '900', color: '#38bdf8' }}>
                                        #{idx + 1} {team.name} 자산 정산 보고서
                                    </div>
                                    <div style={{
                                        fontSize: '0.92rem',
                                        fontWeight: '900',
                                        color: returnRate >= 0 ? '#f43f5e' : '#38bdf8',
                                        background: 'rgba(0,0,0,0.3)',
                                        padding: '4px 12px',
                                        borderRadius: '8px',
                                        border: returnRate >= 0 ? '1px solid rgba(244, 63, 94, 0.3)' : '1px solid rgba(56, 189, 248, 0.3)'
                                    }}>
                                        누적 수익률: {returnRate >= 0 ? `+${returnRate}%` : `${returnRate}%`}
                                    </div>
                                </div>

                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px', background: '#0f172a', padding: '14px', borderRadius: '12px' }}>
                                    <div>
                                        <div style={{ fontSize: '0.78rem', color: '#94a3b8', marginBottom: '2px' }}>💰 총 자산 가치</div>
                                        <div style={{ fontSize: '1.15rem', fontWeight: '900', color: '#ffffff' }}>
                                            {totalAssetVal.toLocaleString()}원
                                        </div>
                                    </div>
                                    <div>
                                        <div style={{ fontSize: '0.78rem', color: '#94a3b8', marginBottom: '2px' }}>💵 예수금 (현금 보유 금액)</div>
                                        <div style={{ fontSize: '1.15rem', fontWeight: '900', color: '#10b981' }}>
                                            {cashVal.toLocaleString()}원
                                        </div>
                                    </div>
                                    <div>
                                        <div style={{ fontSize: '0.78rem', color: '#94a3b8', marginBottom: '2px' }}>📈 주식 평가금액 (주식 구매 금액)</div>
                                        <div style={{ fontSize: '1.15rem', fontWeight: '900', color: '#f59e0b' }}>
                                            {stockVal.toLocaleString()}원
                                        </div>
                                    </div>
                                </div>

                                <div style={{ fontSize: '0.82rem', color: '#cbd5e1', background: 'rgba(255,255,255,0.03)', padding: '8px 12px', borderRadius: '8px' }}>
                                    <strong style={{ color: '#f8fafc', marginRight: '6px' }}>보유 주식 포트폴리오:</strong>
                                    {holdingsDetails.length > 0 ? (
                                        <span style={{ color: '#93c5fd' }}>
                                            {holdingsDetails.map(h => `[${h.key}] ${h.sector} ${h.qty}주 (${h.evalAmt.toLocaleString()}원)`).join(' · ')}
                                        </span>
                                    ) : (
                                        <span style={{ color: '#64748b' }}>보유 주식 없음 (100% 예수금 보유 중)</span>
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

    // 현재 진행 연도 (2015 ~ 2025)
    const [currentYear, setCurrentYear] = useState(2015);
    const [selectedTeamId, setSelectedTeamId] = useState('1');
    const [hostPeekNames, setHostPeekNames] = useState(false);
    const [isPubliclyRevealed, setIsPubliclyRevealed] = useState(false);
    
    // 모달 관리
    const [selectedNews, setSelectedNews] = useState(null);
    const [selectedSector, setSelectedSector] = useState(null);
    const [allOrdersModalOpen, setAllOrdersModalOpen] = useState(false);
    const [activeTab, setActiveTab] = useState('decision'); // 'decision' (주문표) | 'matrix' (전체 현황표)
    
    // 권한 관리 (전체 토글 및 조별 개별 토글)
    const [allowAllNews, setAllowAllNews] = useState(true);
    const [allowAllVipHint, setAllowAllVipHint] = useState(false);
    const [permissions, setPermissions] = useState({});

    // 참여자/팀별 뉴스 분석 등락 예측 상태 및 결과
    const [predictions, setPredictions] = useState({}); // { [teamId]: { [stockKey]: 'UP' | 'DOWN' } }
    const [predictionResults, setPredictionResults] = useState({}); // { [teamId]: { hits, total, qualified, year } }

    // 주문 입력 폼: { [stockKey]: number }
    const [orderInputs, setOrderInputs] = useState({
        A: 0, B: 0, C: 0, D: 0, E: 0, F: 0, G: 0, H: 0, I: 0, J: 0
    });

    // 참여자 리스트 생성 (온라인: participants, 오프라인: contextScores 기반 동적 인원수)
    const teamList = useMemo(() => {
        if (participants && participants.length > 0) {
            return participants.map((p, idx) => ({
                id: String(p.id || p.nickname || idx + 1),
                name: p.nickname || `${p.groupId || idx + 1}조`,
                initialSeed: p.score && p.score > 0 ? p.score : 100000000
            }));
        }
        const offlineCount = (contextScores && contextScores.length > 0) ? contextScores.length : 8;
        return Array.from({ length: offlineCount }, (_, i) => {
            const teamNum = i + 1;
            const ctxScore = contextScores?.find(s => String(s.num) === String(teamNum))?.score;
            return {
                id: String(teamNum),
                name: `${teamNum}번`,
                initialSeed: ctxScore && ctxScore > 0 ? ctxScore : 100000000
            };
        });
    }, [participants, contextScores]);

    // 전체 조별 포트폴리오
    const [portfolios, setPortfolios] = useState(() => {
        const initial = {};
        Array.from({ length: 12 }, (_, i) => String(i + 1)).forEach(id => {
            const ctxScore = contextScores?.find(s => String(s.num) === id)?.score;
            const seed = ctxScore && ctxScore > 0 ? ctxScore : 100000000;
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
                    const newAmount = Number(event.data.amount) || 100000000;
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

    const broadcastStockState = (overrides = {}) => {
        const payload = {
            pin,
            year: overrides.year || currentYear,
            stocks: overrides.stocks || activeStocks,
            isPubliclyRevealed: overrides.isPubliclyRevealed !== undefined ? overrides.isPubliclyRevealed : isPubliclyRevealed,
            portfolios: overrides.portfolios || portfolios,
            permissions: overrides.permissions || permissions,
            allowAllNews: overrides.allowAllNews !== undefined ? overrides.allowAllNews : allowAllNews,
            allowAllVipHint: overrides.allowAllVipHint !== undefined ? overrides.allowAllVipHint : allowAllVipHint,
            predictions: overrides.predictions || predictions,
            predictionResults: overrides.predictionResults || predictionResults,
            allOrdersModalOpen: overrides.allOrdersModalOpen !== undefined ? overrides.allOrdersModalOpen : allOrdersModalOpen
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
                    const targetKey = teamId || '1';
                    setPortfolios(prev => {
                        const existing = prev[targetKey] || { seedMoney: 100000000, history: {} };
                        const nextP = {
                            ...prev,
                            [targetKey]: {
                                ...existing,
                                cash,
                                holdings
                            }
                        };
                        if (nickname && nickname !== targetKey) {
                            nextP[nickname] = { ...existing, cash, holdings };
                        }
                        broadcastStockState({ portfolios: nextP });
                        return nextP;
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
                    const targetKey = payload.teamId || payload.nickname || '1';
                    setPortfolios(prev => {
                        const existing = prev[targetKey] || { seedMoney: 100000000, history: {} };
                        const nextP = {
                            ...prev,
                            [targetKey]: {
                                ...existing,
                                cash: payload.cash,
                                holdings: payload.holdings
                            }
                        };
                        if (payload.nickname && payload.nickname !== targetKey) {
                            nextP[payload.nickname] = { ...existing, cash: payload.cash, holdings: payload.holdings };
                        }
                        broadcastStockState({ portfolios: nextP });
                        return nextP;
                    });
                }
            };
            const handleRoomMessage = (msg) => {
                if (msg && msg.event === 'stock_game:predict' && msg.payload) {
                    handlePredictMsg(msg.payload);
                } else if (msg && msg.event === 'stock_game:execute_order' && msg.payload) {
                    handleExecuteOrderMsg(msg.payload);
                } else if (msg && (msg.event === 'stock_game:request_sync' || msg.type === 'stock_game:request_sync')) {
                    broadcastStockState();
                }
            };
            const handleDirectRequestSync = () => broadcastStockState();
            socket.on('stock_game:predict', handlePredictMsg);
            socket.on('stock_game:execute_order', handleExecuteOrderMsg);
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
                socket.off('stock_game:request_sync');
                socket.off('room:message');
            }
        };
    }, [currentYear, isPubliclyRevealed, allowAllNews, allowAllVipHint, activeStocks, portfolios, predictions, predictionResults]);

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

        if (qualifiedTeamNames.length > 0) {
            setTimeout(() => {
                alert(`🎯 [뉴스 예측 적중 알림]\n5개 이상 맞춘 ${qualifiedTeamNames.join(', ')}에 다음 연도(${nextYear}년) 100% 특별 힌트 혜택이 부여되었습니다!`);
            }, 300);
        }

        // 연도 결산 및 포트폴리오 자산 가치 평가
        setPortfolios(prev => {
            const updated = { ...prev };
            teamList.forEach(team => {
                const p = updated[team.id];
                if (!p) return;

                let stockVal = 0;
                stockList.forEach(s => {
                    const qty = p.holdings[s.key] || 0;
                    const price = s.prices[nextYear] ?? s.prices[2015];
                    stockVal += qty * price;
                });

                const totalAsset = p.cash + stockVal;
                const retRate = p.seedMoney > 0 ? (((totalAsset - p.seedMoney) / p.seedMoney) * 100).toFixed(1) : 0;

                // 우측 사이드바 실시간 누적 금액 동기화
                if (participants && participants.length > 0 && socket && pin) {
                    socket.emit('host:adjustScore', { pin, nickname: team.name, exactScore: Math.round(totalAsset) });
                } else if (setExactScore) {
                    const numKey = Number(team.id) || team.id;
                    setExactScore(numKey, Math.round(totalAsset));
                }

                updated[team.id] = {
                    ...p,
                    history: {
                        ...p.history,
                        [nextYear]: {
                            asset: totalAsset,
                            stockValue: stockVal,
                            cash: p.cash,
                            returnRate: Number(retRate)
                        }
                    }
                };
            });
            return updated;
        });

        broadcastStockState({ 
            year: nextYear,
            predictionResults: nextPredResults
        });
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
        const teamId = selectedTeamId;
        const currentP = portfolios[teamId];
        if (!currentP) return;

        const hasInputs = Object.values(orderInputs).some(qty => qty !== 0);

        if (hasInputs) {
            let totalCost = 0;
            let newHoldings = { ...currentP.holdings };

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
                const nextP = {
                    ...prev,
                    [teamId]: {
                        ...currentP,
                        cash: newCash,
                        holdings: newHoldings
                    }
                };
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

    const currentTeam = teamList.find(t => t.id === selectedTeamId) || teamList[0];
    const currentTeamPortfolio = portfolios[selectedTeamId] || {
        seedMoney: 100000000,
        cash: 100000000,
        holdings: { A: 0, B: 0, C: 0, D: 0, E: 0, F: 0, G: 0, H: 0, I: 0, J: 0 }
    };

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
                </div>
            </div>

            {/* 3-Column Financial Terminal Layout */}
            <div style={{
                flex: 1,
                display: 'grid',
                gridTemplateColumns: '270px 1fr 340px',
                gap: '16px',
                padding: '16px',
                minHeight: 0,
                boxSizing: 'border-box'
            }}>
                {/* 1) LEFT: 14대 시장 섹터 도감 (Market Sectors Reference) */}
                <div style={{
                    background: '#0f172a',
                    borderRadius: '18px',
                    border: '1px solid #1e293b',
                    padding: '16px',
                    display: 'flex',
                    flexDirection: 'column',
                    overflow: 'hidden'
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                        <Building2 size={20} color="#38bdf8" />
                        <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: '900', color: '#f8fafc' }}>
                            시장 섹터 도감 (14대)
                        </h3>
                    </div>
                    <p style={{ margin: '0 0 10px 0', fontSize: '0.78rem', color: '#94a3b8', lineHeight: '1.4' }}>
                        100대 기업 섹터별 특성 및 민감도 분석 가이드
                    </p>

                    <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '6px', paddingRight: '4px' }}>
                        {MARKET_SECTORS_DIRECTORY.map((s) => (
                            <div
                                key={s.id}
                                onClick={() => setSelectedSector(s)}
                                style={{
                                    background: '#1e293b',
                                    border: '1px solid rgba(255, 255, 255, 0.05)',
                                    borderRadius: '10px',
                                    padding: '8px 10px',
                                    cursor: 'pointer',
                                    transition: 'all 0.2s ease',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    gap: '3px'
                                }}
                                onMouseEnter={(e) => {
                                    e.currentTarget.style.borderColor = s.color;
                                    e.currentTarget.style.background = '#334155';
                                }}
                                onMouseLeave={(e) => {
                                    e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.05)';
                                    e.currentTarget.style.background = '#1e293b';
                                }}
                            >
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                        <span style={{ fontSize: '1rem' }}>{s.icon}</span>
                                        <span style={{ fontSize: '0.85rem', fontWeight: '800', color: '#f1f5f9' }}>
                                            {s.name}
                                        </span>
                                    </div>
                                    <span style={{ fontSize: '0.7rem', color: s.color, fontWeight: '700' }}>
                                        도감 열기
                                    </span>
                                </div>
                                <div style={{ fontSize: '0.72rem', color: '#94a3b8', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                    {s.keySensitivity}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* 2) CENTER: 10개 종목 시세판 & 주문 / 포트폴리오 관리 */}
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
                                            초기 투자금: {currentTeamPortfolio.seedMoney.toLocaleString()}원
                                        </div>
                                    </div>

                                    <div style={{ display: 'flex', gap: '20px' }}>
                                        <div>
                                            <div style={{ fontSize: '0.78rem', color: '#94a3b8' }}>보유 현금(예수금)</div>
                                            <div style={{ fontSize: '1.2rem', fontWeight: '900', color: '#10b981' }}>
                                                {currentTeamPortfolio.cash.toLocaleString()}원
                                            </div>
                                        </div>
                                        <div>
                                            <div style={{ fontSize: '0.78rem', color: '#94a3b8' }}>주식 평가액</div>
                                            <div style={{ fontSize: '1.2rem', fontWeight: '900', color: '#f59e0b' }}>
                                                {currentTeamStockValue.toLocaleString()}원
                                            </div>
                                        </div>
                                        <div>
                                            <div style={{ fontSize: '0.78rem', color: '#94a3b8' }}>총 자산 가치</div>
                                            <div style={{ fontSize: '1.2rem', fontWeight: '900', color: '#ffffff' }}>
                                                {currentTeamTotalAsset.toLocaleString()}원
                                            </div>
                                        </div>
                                    </div>
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
                                                        <td style={{ padding: '10px 12px', textAlign: 'right', color: '#38bdf8', fontWeight: '800' }}>
                                                            {currentQty}주
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

                                <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '10px' }}>
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
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {teamList.map((team, idx) => {
                                            const p = portfolios[team.id] || { seedMoney: 100000000, cash: 100000000, holdings: {} };
                                            let sVal = 0;
                                            stockList.forEach(s => {
                                                const q = p.holdings[s.key] || 0;
                                                const pr = s.prices[currentYear] ?? s.prices[2015];
                                                sVal += q * pr;
                                            });
                                            const tot = p.cash + sVal;
                                            const ret = p.seedMoney > 0 ? (((tot - p.seedMoney) / p.seedMoney) * 100).toFixed(1) : 0;

                                            return (
                                                <tr key={team.id} style={{ borderBottom: '1px solid #1e293b' }}>
                                                    <td style={{ padding: '10px 12px', fontWeight: '800' }}>
                                                        <span style={{ color: '#f59e0b', marginRight: '6px' }}>#{idx + 1}</span>
                                                        {team.name}
                                                    </td>
                                                    <td style={{ padding: '10px 12px', textAlign: 'right', color: '#10b981' }}>
                                                        {p.cash.toLocaleString()}원
                                                    </td>
                                                    <td style={{ padding: '10px 12px', textAlign: 'right', color: '#38bdf8' }}>
                                                        {sVal.toLocaleString()}원
                                                    </td>
                                                    <td style={{ padding: '10px 12px', textAlign: 'right', fontWeight: '900', color: '#ffffff' }}>
                                                        {tot.toLocaleString()}원
                                                    </td>
                                                    <td style={{
                                                        padding: '10px 12px',
                                                        textAlign: 'right',
                                                        fontWeight: '900',
                                                        color: ret > 0 ? '#f43f5e' : (ret < 0 ? '#38bdf8' : '#94a3b8')
                                                    }}>
                                                        {ret > 0 ? `+${ret}%` : `${ret}%`}
                                                    </td>
                                                </tr>
                                            );
                                        })}
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
    const [participantEasyNews, setParticipantEasyNews] = useState(false);

    // 매수 / 매도 주문 상태
    const [tradeType, setTradeType] = useState('BUY'); // 'BUY' | 'SELL'
    const [tradeQty, setTradeQty] = useState(0);

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

    const stockList = useMemo(() => Object.values(gameState.stocks || {}), [gameState.stocks]);
    const myTeamId = String(groupId || 1);
    const rawPortfolio = (nickname && gameState.portfolios?.[nickname]) || gameState.portfolios?.[myTeamId];

    // 내 포트폴리오 계산
    const myPortfolio = useMemo(() => {
        const defaultSeed = (myScore && myScore > 0) ? myScore : 100000000;
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
    const hasMyNewsAccess = gameState.allowAllNews || Boolean(gameState.permissions[myTeamId]?.news);

    // 참여자 예측 투표 및 힌트 보상 모달 상태
    const [localVotes, setLocalVotes] = useState({});
    const [rewardModalOpen, setRewardModalOpen] = useState(false);
    const [chosenHintStock, setChosenHintStock] = useState(null);

    const myPredictions = useMemo(() => {
        const fromHost = gameState.predictions?.[myTeamId] || {};
        return {
            ...fromHost,
            ...localVotes
        };
    }, [gameState.predictions, myTeamId, localVotes]);

    const handleToggleVote = (stockKey, direction) => {
        const nextVal = myPredictions[stockKey] === direction ? null : direction;
        setLocalVotes(prev => ({
            ...prev,
            [stockKey]: nextVal
        }));

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

    const myResult = gameState.predictionResults?.[myTeamId];
    const isQualified = Boolean(myResult?.qualified);
    const myHitsCount = myResult?.hits ?? 0;

    // 현재 선택된 종목 객체
    const activeStockItem = useMemo(() => {
        if (!selectedStockKey) return null;
        return stockList.find(s => s.key === selectedStockKey) || null;
    }, [selectedStockKey, stockList]);

    // 퍼센트 버튼 클릭 핸들러 (50% 누르면 가진 금액에서 살 수 있는 수량 자동 계산)
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
            alert('올바른 거래 수량을 설정해 주세요.');
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
            {isQualified && (
                <div style={{ padding: '8px 12px 0 12px', background: '#0f172a' }}>
                    <button
                        onClick={() => setRewardModalOpen(true)}
                        className="animate-pulse"
                        style={{
                            background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
                            color: '#1e293b',
                            border: 'none',
                            borderRadius: '12px',
                            padding: '10px 16px',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '8px',
                            fontWeight: '900',
                            fontSize: '0.9rem',
                            boxShadow: '0 4px 15px rgba(245, 158, 11, 0.4)',
                            width: '100%'
                        }}
                    >
                        <Trophy size={18} color="#1e293b" />
                        <span>👑 100% 특별 힌트 획득! (클릭하여 힌트 종목 선택)</span>
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
                        {myTotalAsset.toLocaleString()}원
                        <span style={{ fontSize: '0.8rem', marginLeft: '4px', color: Number(myReturnRate) >= 0 ? '#f43f5e' : '#38bdf8' }}>
                            ({Number(myReturnRate) >= 0 ? `+${myReturnRate}%` : `${myReturnRate}%`})
                        </span>
                    </div>
                </div>
            </div>

            {/* Mobile / Responsive Navigation Tabs (10대 뉴스 탭 제거 후 주식 클릭 시 뉴스 표시) */}
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
            <div style={{ flex: 1, padding: '16px', overflowY: 'auto' }}>

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
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                                {/* Top Back Header Bar */}
                                <div style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'space-between',
                                    background: '#0f172a',
                                    padding: '10px 14px',
                                    borderRadius: '12px',
                                    border: '1px solid #1e293b'
                                }}>
                                    <button
                                        onClick={() => {
                                            setSelectedStockKey(null);
                                            setTradeQty(0);
                                        }}
                                        style={{
                                            background: '#334155',
                                            color: '#ffffff',
                                            border: 'none',
                                            borderRadius: '8px',
                                            padding: '8px 14px',
                                            fontWeight: '800',
                                            fontSize: '0.88rem',
                                            cursor: 'pointer',
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '6px'
                                        }}
                                    >
                                        <ArrowLeft size={16} /> 이전 (주식 리스트)
                                    </button>
                                    <span style={{ fontSize: '0.85rem', color: '#94a3b8', fontWeight: '700' }}>
                                        종목 상세 및 뉴스 / 주문
                                    </span>
                                </div>

                                {/* Stock Info Main Card */}
                                <div style={{
                                    background: '#0f172a',
                                    border: '1px solid #1e293b',
                                    borderRadius: '16px',
                                    padding: '16px',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    gap: '12px'
                                }}>
                                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                            <div style={{
                                                width: '42px',
                                                height: '42px',
                                                borderRadius: '12px',
                                                background: s.badgeColor || '#3b82f6',
                                                color: 'white',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                fontWeight: '900',
                                                fontSize: '1.3rem'
                                            }}>
                                                {s.key}
                                            </div>
                                            <div>
                                                <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: '900', color: '#f8fafc' }}>
                                                    {gameState.isPubliclyRevealed ? `${s.sector} (${s.realName})` : `${s.key} ${s.sector}`}
                                                </h3>
                                                <div style={{ fontSize: '0.8rem', color: '#94a3b8', marginTop: '2px' }}>
                                                    내 보유: <strong style={{ color: '#38bdf8' }}>{myHoldingsQty.toLocaleString()}주</strong> (평가액: {(myHoldingsQty * price).toLocaleString()}원)
                                                </div>
                                            </div>
                                        </div>

                                        <div style={{ textAlign: 'right' }}>
                                            <div style={{ fontSize: '1.35rem', fontWeight: '900', color: '#ffffff' }}>
                                                {price.toLocaleString()}원
                                            </div>
                                            {gameState.year > 2015 && (
                                                <div style={{
                                                    fontSize: '0.82rem',
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

                                {/* Stock Specific News Section (주식 클릭 시 보이는 관련 뉴스) */}
                                <div style={{
                                    background: '#0f172a',
                                    border: '1px solid #1e293b',
                                    borderRadius: '16px',
                                    padding: '16px',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    gap: '12px'
                                }}>
                                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                            <Newspaper size={18} color="#f59e0b" />
                                            <h4 style={{ margin: 0, fontSize: '1.02rem', fontWeight: '900', color: '#f8fafc' }}>
                                                [{s.key}] {gameState.year}년 종목 이슈 및 분석 뉴스
                                            </h4>
                                        </div>
                                        <button
                                            onClick={() => setParticipantEasyNews(!participantEasyNews)}
                                            style={{
                                                background: participantEasyNews ? '#f59e0b' : '#334155',
                                                color: participantEasyNews ? '#1e293b' : '#f8fafc',
                                                border: 'none',
                                                borderRadius: '8px',
                                                padding: '4px 10px',
                                                fontSize: '0.78rem',
                                                fontWeight: '800',
                                                cursor: 'pointer'
                                            }}
                                        >
                                            {participantEasyNews ? '📰 원본 뉴스 보기' : '🐣 Easy 쉬운 뉴스 보기'}
                                        </button>
                                    </div>

                                    {stockNews ? (
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                                                <span style={{
                                                    background: '#f43f5e',
                                                    color: 'white',
                                                    padding: '2px 8px',
                                                    borderRadius: '6px',
                                                    fontSize: '0.75rem',
                                                    fontWeight: '800'
                                                }}>
                                                    {stockNews.tag || '속보'}
                                                </span>
                                                <span style={{ fontSize: '0.78rem', color: '#94a3b8' }}>
                                                    {stockNews.media || '경제종합'} · {stockNews.date || `${gameState.year}.06`}
                                                </span>
                                            </div>

                                            <div style={{ fontSize: '1rem', fontWeight: '800', color: '#f1f5f9', lineHeight: '1.4' }}>
                                                {stockNews.headline}
                                            </div>

                                            <div style={{
                                                background: participantEasyNews ? 'rgba(245, 158, 11, 0.12)' : '#1e293b',
                                                borderRadius: '12px',
                                                padding: '12px 14px',
                                                fontSize: '0.9rem',
                                                color: participantEasyNews ? '#fef3c7' : '#cbd5e1',
                                                lineHeight: '1.7',
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
                                                    background: 'rgba(59, 130, 246, 0.12)',
                                                    border: '1px solid rgba(59, 130, 246, 0.3)',
                                                    borderRadius: '12px',
                                                    padding: '10px 14px',
                                                    display: 'flex',
                                                    flexDirection: 'column',
                                                    gap: '6px'
                                                }}>
                                                    <div style={{ fontSize: '0.82rem', fontWeight: '900', color: '#60a5fa' }}>
                                                        📌 주요 경제/산업 용어 해설
                                                    </div>
                                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                                        {stockNews.glossary.map((g, idx) => (
                                                            <div key={idx} style={{ fontSize: '0.78rem', color: '#93c5fd', lineHeight: '1.4' }}>
                                                                <strong style={{ color: '#bfdbfe' }}>• {g.term}:</strong> {g.def}
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            )}

                                            {/* 10-Year Price Trend Chart */}
                                            <StockPriceTrendChart stockItem={s} currentYear={gameState.year} />

                                            {/* Fundamental & Technical Analysis Panel */}
                                            <FundamentalTechnicalAnalysis stockItem={s} currentYear={gameState.year} newsItem={stockNews} />

                                            {/* Prediction Vote Bar */}
                                            <div style={{
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'space-between',
                                                background: 'rgba(30, 41, 59, 0.5)',
                                                padding: '8px 12px',
                                                borderRadius: '10px',
                                                border: '1px solid rgba(255, 255, 255, 0.06)'
                                            }}>
                                                <span style={{ fontSize: '0.8rem', color: '#94a3b8', fontWeight: '700' }}>
                                                    당해 연도 주가 등락 예측:
                                                </span>
                                                <div style={{ display: 'flex', gap: '8px' }}>
                                                    <button
                                                        onClick={() => handleToggleVote(s.key, 'UP')}
                                                        style={{
                                                            background: myVote === 'UP' ? '#ef4444' : 'rgba(239, 68, 68, 0.1)',
                                                            color: myVote === 'UP' ? 'white' : '#fca5a5',
                                                            border: myVote === 'UP' ? '1px solid #ef4444' : '1px solid rgba(239, 68, 68, 0.3)',
                                                            borderRadius: '8px',
                                                            padding: '6px 14px',
                                                            fontSize: '0.8rem',
                                                            fontWeight: '800',
                                                            cursor: 'pointer'
                                                        }}
                                                    >
                                                        ▲ 상승 {myVote === 'UP' && '✓'}
                                                    </button>
                                                    <button
                                                        onClick={() => handleToggleVote(s.key, 'DOWN')}
                                                        style={{
                                                            background: myVote === 'DOWN' ? '#3b82f6' : 'rgba(59, 130, 246, 0.1)',
                                                            color: myVote === 'DOWN' ? 'white' : '#93c5fd',
                                                            border: myVote === 'DOWN' ? '1px solid #3b82f6' : '1px solid rgba(59, 130, 246, 0.3)',
                                                            borderRadius: '8px',
                                                            padding: '6px 14px',
                                                            fontSize: '0.8rem',
                                                            fontWeight: '800',
                                                            cursor: 'pointer'
                                                        }}
                                                    >
                                                        ▼ 하락 {myVote === 'DOWN' && '✓'}
                                                    </button>
                                                </div>
                                            </div>

                                            {/* VIP Hint Box (if unlocked) */}
                                            {hasMyVipHint && stockNews.vipHint && (
                                                <div style={{
                                                    background: 'linear-gradient(135deg, rgba(245, 158, 11, 0.2) 0%, rgba(217, 119, 6, 0.1) 100%)',
                                                    border: '1.5px solid #f59e0b',
                                                    borderRadius: '12px',
                                                    padding: '12px 14px',
                                                    fontSize: '0.85rem',
                                                    color: '#fef3c7',
                                                    fontWeight: '700'
                                                }}>
                                                    ⭐ 100% VIP 특급 힌트: {stockNews.vipHint}
                                                </div>
                                            )}
                                        </div>
                                    ) : (
                                        <div style={{ color: '#64748b', fontSize: '0.85rem' }}>
                                            2015년은 기준가 연도입니다. 2016년부터 뉴스가 제공됩니다.
                                        </div>
                                    )}
                                </div>

                                {/* Trading Console (매수 / 매도 주문 입력) */}
                                <div style={{
                                    background: '#0f172a',
                                    border: '1.5px solid #3b82f6',
                                    borderRadius: '16px',
                                    padding: '16px',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    gap: '14px',
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
                                                padding: '12px',
                                                borderRadius: '10px',
                                                background: tradeType === 'BUY' ? 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)' : '#1e293b',
                                                color: 'white',
                                                border: tradeType === 'BUY' ? '2px solid #f87171' : '1px solid #334155',
                                                fontWeight: '900',
                                                fontSize: '1.05rem',
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
                                                padding: '12px',
                                                borderRadius: '10px',
                                                background: tradeType === 'SELL' ? 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)' : '#1e293b',
                                                color: 'white',
                                                border: tradeType === 'SELL' ? '2px solid #60a5fa' : '1px solid #334155',
                                                fontWeight: '900',
                                                fontSize: '1.05rem',
                                                cursor: 'pointer',
                                                boxShadow: tradeType === 'SELL' ? '0 4px 14px rgba(59, 130, 246, 0.4)' : 'none'
                                            }}
                                        >
                                            🔵 매도
                                        </button>
                                    </div>

                                    {/* Mode status summary */}
                                    <div style={{ fontSize: '0.82rem', color: '#94a3b8', background: '#1e293b', padding: '8px 12px', borderRadius: '8px' }}>
                                        {tradeType === 'BUY'
                                            ? `보유 현금(${availableCash.toLocaleString()}원)으로 [${s.key} ${s.sector}] 주식을 매수합니다.`
                                            : `보유 주식(${myHoldingsQty.toLocaleString()}주)을 매도하여 현금화합니다.`}
                                    </div>

                                    {/* 2) Quantity & Percentage Controls */}
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                            <span style={{ fontSize: '0.85rem', fontWeight: '800', color: '#e2e8f0' }}>
                                                거래 수량 설정 (개수):
                                            </span>
                                            {/* Percentage buttons: 10%, 25%, 50%, 75%, 100% */}
                                            <div style={{ display: 'flex', gap: '4px' }}>
                                                {[10, 25, 50, 75, 100].map(pctVal => (
                                                    <button
                                                        key={pctVal}
                                                        onClick={() => handleSetPercentage(pctVal, s)}
                                                        style={{
                                                            background: tradeType === 'BUY' ? '#7f1d1d' : '#1e3a8a',
                                                            color: '#f8fafc',
                                                            border: '1px solid rgba(255,255,255,0.2)',
                                                            borderRadius: '6px',
                                                            padding: '4px 8px',
                                                            fontSize: '0.75rem',
                                                            fontWeight: '800',
                                                            cursor: 'pointer'
                                                        }}
                                                    >
                                                        {pctVal}%
                                                    </button>
                                                ))}
                                            </div>
                                        </div>

                                        {/* Stepper Input row */}
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                            <button
                                                onClick={() => setTradeQty(Math.max(0, numQty - 100))}
                                                style={{ background: '#334155', color: 'white', border: 'none', borderRadius: '8px', padding: '8px 12px', fontWeight: 'bold', cursor: 'pointer' }}
                                            >
                                                -100
                                            </button>
                                            <button
                                                onClick={() => setTradeQty(Math.max(0, numQty - 10))}
                                                style={{ background: '#334155', color: 'white', border: 'none', borderRadius: '8px', padding: '8px 12px', fontWeight: 'bold', cursor: 'pointer' }}
                                            >
                                                -10
                                            </button>
                                            <input
                                                type="number"
                                                value={tradeQty || ''}
                                                placeholder="0"
                                                onChange={(e) => {
                                                    const val = parseInt(e.target.value, 10);
                                                    setTradeQty(isNaN(val) ? 0 : Math.max(0, val));
                                                }}
                                                style={{
                                                    flex: 1,
                                                    background: '#090d16',
                                                    color: '#ffffff',
                                                    border: '1px solid #475569',
                                                    borderRadius: '10px',
                                                    padding: '10px',
                                                    textAlign: 'center',
                                                    fontWeight: '900',
                                                    fontSize: '1.2rem'
                                                }}
                                            />
                                            <button
                                                onClick={() => setTradeQty(numQty + 10)}
                                                style={{ background: '#334155', color: 'white', border: 'none', borderRadius: '8px', padding: '8px 12px', fontWeight: 'bold', cursor: 'pointer' }}
                                            >
                                                +10
                                            </button>
                                            <button
                                                onClick={() => setTradeQty(numQty + 100)}
                                                style={{ background: '#334155', color: 'white', border: 'none', borderRadius: '8px', padding: '8px 12px', fontWeight: 'bold', cursor: 'pointer' }}
                                            >
                                                +100
                                            </button>
                                        </div>
                                    </div>

                                    {/* 3) Calculation & Difference Panel */}
                                    <div style={{
                                        background: '#1e293b',
                                        borderRadius: '12px',
                                        padding: '12px 16px',
                                        display: 'flex',
                                        flexDirection: 'column',
                                        gap: '6px',
                                        border: '1px solid #334155'
                                    }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
                                            <span style={{ color: '#94a3b8' }}>1주당 가격</span>
                                            <span style={{ fontWeight: '700' }}>{price.toLocaleString()}원</span>
                                        </div>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
                                            <span style={{ color: '#94a3b8' }}>총 거래 주문 금액</span>
                                            <span style={{ fontWeight: '900', color: tradeType === 'BUY' ? '#f43f5e' : '#38bdf8' }}>
                                                {orderTotalCost.toLocaleString()}원
                                            </span>
                                        </div>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', paddingTop: '4px', borderTop: '1px dashed #334155' }}>
                                            <span style={{ color: '#94a3b8' }}>현재 가진 금액(예수금)</span>
                                            <span style={{ fontWeight: '700', color: '#10b981' }}>{availableCash.toLocaleString()}원</span>
                                        </div>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem', fontWeight: '900' }}>
                                            <span style={{ color: '#f8fafc' }}>거래 후 예상 잔액</span>
                                            <span style={{ color: afterCash >= 0 ? '#38bdf8' : '#ef4444' }}>
                                                {afterCash.toLocaleString()}원
                                            </span>
                                        </div>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', fontWeight: '800' }}>
                                            <span style={{ color: '#cbd5e1' }}>가진 금액과의 차이</span>
                                            <span style={{ color: cashDiff >= 0 ? '#10b981' : '#f43f5e' }}>
                                                {cashDiff > 0 ? `+${cashDiff.toLocaleString()}` : `${cashDiff.toLocaleString()}`}원
                                            </span>
                                        </div>

                                        {isOverBudget && (
                                            <div style={{ color: '#ef4444', fontSize: '0.8rem', fontWeight: 'bold', marginTop: '4px', textAlign: 'center' }}>
                                                ⚠️ 가진 금액(예수금)이 {(orderTotalCost - availableCash).toLocaleString()}원 부족합니다!
                                            </div>
                                        )}
                                        {isOverShares && (
                                            <div style={{ color: '#ef4444', fontSize: '0.8rem', fontWeight: 'bold', marginTop: '4px', textAlign: 'center' }}>
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
                                            padding: '14px',
                                            fontSize: '1.05rem',
                                            fontWeight: '900',
                                            cursor: (numQty <= 0 || isOverBudget || isOverShares) ? 'not-allowed' : 'pointer',
                                            boxShadow: '0 4px 15px rgba(0,0,0,0.3)',
                                            marginTop: '4px'
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
                                <div style={{ fontSize: '0.88rem', color: '#94a3b8', marginBottom: '2px' }}>
                                    💡 <strong>종목을 클릭하면</strong> 해당 기업의 뉴스 확인 및 매수/매도를 진행할 수 있습니다.
                                </div>
                                {stockList.map(s => {
                                    const price = s.prices[gameState.year] ?? s.prices[2015];
                                    const prevYear = gameState.year > 2015 ? gameState.year - 1 : 2015;
                                    const prevP = s.prices[prevYear] ?? price;
                                    const diff = price - prevP;
                                    const pct = prevP > 0 ? ((diff / prevP) * 100).toFixed(1) : '0.0';

                                    return (
                                        <div
                                            key={s.key}
                                            onClick={() => {
                                                setSelectedStockKey(s.key);
                                                setTradeQty(0);
                                            }}
                                            style={{
                                                background: '#0f172a',
                                                border: '1px solid #1e293b',
                                                borderRadius: '14px',
                                                padding: '14px 16px',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'space-between',
                                                cursor: 'pointer',
                                                transition: 'all 0.2s ease',
                                                boxShadow: '0 2px 8px rgba(0,0,0,0.15)'
                                            }}
                                            onMouseEnter={(e) => e.currentTarget.style.borderColor = s.badgeColor || '#38bdf8'}
                                            onMouseLeave={(e) => e.currentTarget.style.borderColor = '#1e293b'}
                                        >
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
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
                                                    fontSize: '1.2rem'
                                                }}>
                                                    {s.key}
                                                </div>
                                                <div>
                                                    <div style={{ fontSize: '1.05rem', fontWeight: '800', color: '#f8fafc' }}>
                                                        {gameState.isPubliclyRevealed ? `${s.sector} (${s.realName})` : `${s.key} ${s.sector}`}
                                                    </div>
                                                    <div style={{ fontSize: '0.78rem', color: '#94a3b8' }}>
                                                        내 보유: <strong>{myPortfolio.holdings?.[s.key] || 0}주</strong> · <span style={{ color: '#38bdf8' }}>뉴스/매매 →</span>
                                                    </div>
                                                </div>
                                            </div>

                                            <div style={{ textAlign: 'right' }}>
                                                <div style={{ fontSize: '1.2rem', fontWeight: '900', color: '#ffffff' }}>
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
                                    );
                                })}
                            </div>
                        )}

                        {/* 2) Sectors Reference Tab */}
                        {activeTab === 'sectors' && (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                <div style={{ fontSize: '0.9rem', color: '#94a3b8', marginBottom: '4px' }}>
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
                                        <span style={{ fontWeight: '800', color: '#10b981' }}>{(myPortfolio.cash || 0).toLocaleString()}원</span>
                                    </div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid #1e293b' }}>
                                        <span style={{ color: '#94a3b8' }}>주식 평가액</span>
                                        <span style={{ fontWeight: '800', color: '#f59e0b' }}>{myStockValue.toLocaleString()}원</span>
                                    </div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0' }}>
                                        <span style={{ color: '#94a3b8' }}>총 평가 자산</span>
                                        <span style={{ fontWeight: '900', fontSize: '1.1rem', color: '#ffffff' }}>{myTotalAsset.toLocaleString()}원</span>
                                    </div>
                                </div>

                                <div style={{ background: '#0f172a', padding: '16px', borderRadius: '16px', border: '1px solid #1e293b' }}>
                                    <div style={{ fontSize: '1rem', fontWeight: '800', marginBottom: '10px' }}>보유 주식 목록 (클릭 시 뉴스/매매)</div>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                        {stockList.map(s => {
                                            const qty = myPortfolio.holdings?.[s.key] || 0;
                                            if (qty === 0) return null;
                                            const price = s.prices[gameState.year] ?? s.prices[2015];
                                            return (
                                                <div
                                                    key={s.key}
                                                    onClick={() => {
                                                        setSelectedStockKey(s.key);
                                                        setTradeQty(0);
                                                    }}
                                                    style={{
                                                        display: 'flex',
                                                        justifyContent: 'space-between',
                                                        fontSize: '0.88rem',
                                                        padding: '8px 10px',
                                                        background: '#1e293b',
                                                        borderRadius: '8px',
                                                        cursor: 'pointer'
                                                    }}
                                                >
                                                    <span>[{s.key}] {s.sector} ({qty}주)</span>
                                                    <span style={{ fontWeight: 'bold', color: '#38bdf8' }}>{(qty * price).toLocaleString()}원 →</span>
                                                </div>
                                            );
                                        })}
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
                stocks={gameState.stocks}
                hits={myHitsCount}
                selectedStockKey={chosenHintStock}
                onSelectStock={(key) => setChosenHintStock(key)}
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

            {/* Special Hint Qualified Reward Modal */}
            <SpecialHintRewardModal
                isOpen={rewardModalOpen}
                onClose={() => setRewardModalOpen(false)}
                hits={myHitsCount}
                total={10}
                currentYear={gameState.year}
                stocks={gameState.stocks || {}}
                selectedStockKey={chosenHintStock}
                onSelectStock={(key) => setChosenHintStock(key)}
            />
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
