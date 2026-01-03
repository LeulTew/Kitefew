import React, { useEffect, useRef, useState, useCallback } from 'react';
import { GameEngine } from '../logic/GameEngine';
import { MediaPipeService } from '../logic/MediaPipeService';
import type { Results } from '@mediapipe/hands';
import { get, set } from 'idb-keyval';
import { t, type Language } from '../i18n';
import { STROKE_PRESETS, type StrokeId } from '../logic/StrokeTypes';
import { WelcomeModal } from './WelcomeModal';

// Images - Using static imports for Vite bundling
import guideGoodFrame from '../assets/guide_good_frame.webp';
import guideBadFrame from '../assets/guide_bad_frame.webp';
import guideGameplay from '../assets/guide_gameplay_action.webp';

// Stroke Preview Images
import strokeClassicImg from '../assets/stroke_classic_1767089871250.png';
import strokeStarfallImg from '../assets/stroke_starfall_1767089890647.png';
import strokeFireImg from '../assets/stroke_fire_1767089907540.png';
import strokeIceImg from '../assets/stroke_ice_1767089938190.png';
import strokeNeonImg from '../assets/stroke_neon_1767089957447.png';

// Theme Backgrounds
import bgFire from '../assets/bg_fire.png';
import bgIce from '../assets/bg_ice.png';
import bgNeon from '../assets/bg_neon.png';
import bgShadow from '../assets/bg_shadow.png';
import bgStarfall from '../assets/bg_starfall.png';
import bgCosmic from '../assets/bg_cosmic.png';
import bgClassicDark from '../assets/bg_classic_dark.png';
import bgClassicLight from '../assets/bg_classic_light.png';


// Map stroke ids to images (some will use fallback colors)
const STROKE_IMAGES: Record<StrokeId, string | null> = {
    classic: strokeClassicImg,
    starfall: strokeStarfallImg,
    fire: strokeFireImg,
    ice: strokeIceImg,
    neon: strokeNeonImg,
    shadow: null, // Will use color preview
    rainbow: null,
    electric: null,
    cosmic: null,
    golden: null
};

// Map stroke ids to thematic background images
const STROKE_BACKGROUNDS: Record<StrokeId, string | null> = {
    classic: null,
    starfall: bgStarfall,
    fire: bgFire,
    ice: bgIce,
    neon: bgNeon,
    shadow: bgShadow,
    rainbow: bgStarfall, // Use starfall as base for rainbow
    electric: bgNeon,    // Use neon as base for electric
    cosmic: bgCosmic,
    golden: bgFire       // Use fire as base for golden
};

// --- TYPES ---
type LeaderboardItem = { name: string; score: number; snapshot?: string };
type TFunction = (key: keyof typeof import('../i18n').translations.en, lang: Language) => string;

// --- PERSISTENCE HELPER ---
const Persistence = {
    async save(key: string, value: unknown) {
        // Save to BOTH IndexedDB and LocalStorage for maximum redundancy
        try {
            await set(key, value);
        } catch (e) {
            console.warn('IDB save failed', e);
        }

        try {
            localStorage.setItem(key, JSON.stringify(value));
        } catch (e) {
            console.warn('LocalStorage save failed', e);
        }
    },
    async load(key: string): Promise<unknown> {
        let idbVal: unknown = undefined;
        let lsVal: unknown = undefined;

        // Try IndexedDB
        try {
            idbVal = await get(key);
        } catch { /* Silent */ }

        // Try LocalStorage
        try {
            const item = localStorage.getItem(key);
            lsVal = item ? JSON.parse(item) : undefined;
        } catch { /* Silent */ }

        // Use IDB as primary, LS as backup
        const finalVal = idbVal !== undefined ? idbVal : lsVal;

        // Heal: If one is missing but the other has it, sync them
        if (idbVal === undefined && lsVal !== undefined) {
            set(key, lsVal).catch(() => { });
        } else if (idbVal !== undefined && lsVal === undefined) {
            try { localStorage.setItem(key, JSON.stringify(idbVal)); } catch { /* silent */ }
        }

        return finalVal;
    }
};

// --- ICONS ---
const HeartIcon = ({ lost, extra }: { lost: boolean; extra?: boolean }) => (
    <svg viewBox="0 0 24 24" className={`heart-svg ${lost ? 'lost' : ''}`} style={{ fill: extra ? '#FFD700' : undefined }}>
        <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
    </svg>
);

const PlayIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
);

const RestartIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
    </svg>
);

const HelpIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" width="20" height="20">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
);

const SunIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" width="18" height="18">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
    </svg>
);

const MoonIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" width="18" height="18">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
    </svg>
);

const StopIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" width="16" height="16">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
    </svg>
);

const CameraOffIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
    </svg>
);

const ArrowUpIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" width="30" height="30">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 15l7-7 7 7" />
    </svg>
);

// --- NEW ICONS ---
const TelegramIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="currentColor" viewBox="0 0 24 24" width="20" height="20">
        <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z" />
    </svg>
);

const GithubIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="currentColor" viewBox="0 0 24 24" width="20" height="20">
        <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
    </svg>
);

const EmailIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" width="20" height="20">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
    </svg>
);

const TrophyIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="currentColor" viewBox="0 0 24 24" width="32" height="32" style={{ minWidth: '32px', minHeight: '32px' }}>
        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 15.93c-3.95-.49-7-3.85-7-7.93h2c0 3.31 2.69 6 6 6v2zm1-4.93c-1.66 0-3-1.34-3-3s1.34-3 3-3 3 1.34 3 3-1.34 3-3 3zm6.07 4.93v-2c.99 0 1.93-.15 2.83-.42-.63 1.1-1.16 1.85-1.83 2.42H18.07z" />
        <path d="M19 4h-2V3a1 1 0 00-1-1H8a1 1 0 00-1 1v1H5a2 2 0 00-2 2v3a4 4 0 004 4h.28c.35.6.76 1.15 1.22 1.63L8 18.36V20h8v-1.64l-.5-3.73c.46-.48.87-1.03 1.22-1.63H17a4 4 0 004-4V6a2 2 0 00-2-2zM7 9V6H5v3a2 2 0 002 2v-.17A4.98 4.98 0 016.07 9H7zm14 0a2 2 0 01-2 2v.17A4.98 4.98 0 0117.93 9H19V6h-.17c.11.32.17.65.17 1v2z" />
    </svg>
);

// --- MAGNETIC BUTTON ---
const MagneticButton: React.FC<{ onClick: () => void; children: React.ReactNode; secondary?: boolean; disabled?: boolean; }> = ({ onClick, children, secondary, disabled }) => {
    const wrapperRef = useRef<HTMLDivElement>(null);
    const buttonRef = useRef<HTMLButtonElement>(null);

    const handleMouseMove = (e: React.MouseEvent) => {
        if (disabled) return;
        if (!wrapperRef.current || !buttonRef.current) return;
        const rect = wrapperRef.current.getBoundingClientRect();
        const x = e.clientX - rect.left - rect.width / 2;
        const y = e.clientY - rect.top - rect.height / 2;
        buttonRef.current.style.transform = `translate(${x * 0.3}px, ${y * 0.3}px)`;
    };

    const handleMouseLeave = () => {
        if (disabled) return;
        if (buttonRef.current) buttonRef.current.style.transform = 'translate(0,0)';
    };

    return (
        <div ref={wrapperRef} className="cta-wrapper" onMouseMove={handleMouseMove} onMouseLeave={handleMouseLeave}>
            <button ref={buttonRef} className={`magnetic-btn ${secondary ? 'secondary' : ''} ${disabled ? 'disabled' : ''}`} onClick={disabled ? undefined : onClick} disabled={disabled}>
                {children}
            </button>
        </div>
    );
};

// --- GUIDE MODAL ---
const GuideModal: React.FC<{ onClose: () => void; lang: Language; t: TFunction }> = ({ onClose, lang, t }) => {
    return (
        <div className="modal" style={{ zIndex: 100, maxWidth: '700px', maxHeight: '85vh', overflowY: 'auto' }}>
            <h1>{t('guideTitle', lang)}</h1>

            <div className="guide-grid">
                <div style={{ background: 'var(--bg-secondary)', padding: '12px', borderRadius: '8px' }}>
                    <img src={guideGoodFrame} alt="Good" loading="lazy" style={{ width: '100%', borderRadius: '4px', marginBottom: '8px' }} />
                    <h2 style={{ color: '#4caf50', marginBottom: '5px', fontSize: '1.1rem' }}>{t('guideDo', lang)}</h2>
                    <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: 0 }}>{t('guideDoDesc', lang)}</p>
                </div>

                <div style={{ background: 'var(--bg-secondary)', padding: '12px', borderRadius: '8px' }}>
                    <img src={guideBadFrame} alt="Bad" loading="lazy" style={{ width: '100%', borderRadius: '4px', marginBottom: '8px' }} />
                    <h2 style={{ color: '#ff2a55', marginBottom: '5px', fontSize: '1.1rem' }}>{t('guideDont', lang)}</h2>
                    <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: 0 }}>{t('guideDontDesc', lang)}</p>
                </div>
            </div>

            <div className="guide-rules-section">
                <img src={guideGameplay} alt="Action" loading="lazy" />
                <div>
                    <h2 style={{ color: 'var(--accent-color)', marginBottom: '8px', fontSize: '1.1rem' }}>{t('guideRulesTitle', lang)}</h2>
                    <ul style={{ listStyle: 'none', padding: 0, color: 'var(--text-muted)', fontSize: '0.9rem', lineHeight: '1.4', fontFamily: 'var(--font-body)' }}>
                        <li>• {t('guideRule1', lang)}</li>
                        <li>• {t('guideRule2', lang)}</li>
                        <li>• {t('guideRule3', lang)}</li>
                        <li>• {t('guideRule4', lang)}</li>
                    </ul>
                </div>
            </div>

            <MagneticButton onClick={onClose}>{t('gotIt', lang)}</MagneticButton>
        </div>
    );
};

// --- NAME ENTRY MODAL ---
const NameEntryModal: React.FC<{ score: number, snapshot?: string, onSave: (name: string) => void, onClose: () => void, lang: Language, initialName: string, t: TFunction }> = ({ score, snapshot, onSave, onClose, lang, initialName, t }) => {
    const [name, setName] = useState(initialName);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleSubmit = () => {
        if (name.trim() && !isSubmitting) {
            setIsSubmitting(true);
            onSave(name.trim());
        }
    };

    const handleKeyPress = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') {
            handleSubmit();
        }
    };

    return (
        <div className="modal" style={{ zIndex: 110 }}>
            <h1 style={{ fontSize: '2.5rem', color: 'var(--accent-color)', marginBottom: '1rem' }}>
                {lang === 'en' ? 'CHANGE NAME' : 'ስም ቀይር'}
            </h1>
            <p style={{ marginBottom: '0.5rem', color: 'var(--text-muted)' }}>
                {lang === 'en' ? 'Current:' : 'አሁን:'} <strong style={{ color: 'var(--text-color)' }}>{initialName}</strong>
            </p>
            <p style={{ marginBottom: '1.5rem' }}>{t('finalScore', lang)}: {score}</p>

            {snapshot && (
                <div style={{ margin: '0 auto 2rem auto', width: '200px', border: '3px solid var(--accent-color)', borderRadius: '8px', overflow: 'hidden', boxShadow: '0 0 20px rgba(204, 255, 0, 0.3)' }}>
                    <img src={snapshot} alt="High Score Moment" style={{ width: '100%', display: 'block' }} />
                </div>
            )}

            <div style={{ marginBottom: '2rem' }}>
                <input
                    type="text"
                    placeholder={lang === 'en' ? "ENTER NEW NAME" : "አዲስ ስም ያስገቡ"}
                    value={name}
                    onChange={(e) => setName(e.target.value.toUpperCase())}
                    onKeyPress={handleKeyPress}
                    style={{
                        background: 'var(--bg-secondary)', border: '2px solid var(--border-color)', color: 'var(--text-color)',
                        padding: '1rem', width: '100%', textAlign: 'center', fontSize: '1.5rem', fontFamily: 'var(--font-heading)',
                        outline: 'none'
                    }}
                    autoFocus
                    maxLength={15}
                    disabled={isSubmitting}
                />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', alignItems: 'center' }}>
                <MagneticButton onClick={handleSubmit} disabled={isSubmitting}>
                    {isSubmitting ? (lang === 'en' ? 'SAVING...' : 'በመስጠት ላይ...') : (lang === 'en' ? 'SAVE' : 'አስቀምጥ')}
                </MagneticButton>
                <MagneticButton onClick={onClose} secondary disabled={isSubmitting}>
                    {lang === 'en' ? 'CANCEL' : 'ይቅር'}
                </MagneticButton>
            </div>
        </div>
    );
};



// --- LEADERBOARD MODAL ---
const LeaderboardModal: React.FC<{ data: LeaderboardItem[], globalData: LeaderboardItem[], onClose: () => void, lang: Language, t: TFunction }> = ({ data, globalData, onClose, lang, t }) => {
    // Responsive: stack columns on small screens
    const isSmallScreen = typeof window !== 'undefined' && window.innerWidth < 500;

    return (
        <div className="modal" style={{ zIndex: 100, maxWidth: isSmallScreen ? '95vw' : '900px', maxHeight: '85vh', display: 'flex', flexDirection: 'column', padding: isSmallScreen ? '1rem' : '2rem' }}>
            <h1 style={{ fontSize: isSmallScreen ? '2rem' : '3rem', marginBottom: '0.5rem', flexShrink: 0 }}>LEADERBOARD</h1>

            <div style={{
                flexGrow: 1,
                overflowY: 'auto',
                margin: '0.5rem 0',
                paddingRight: '5px',
                display: 'flex',
                flexDirection: isSmallScreen ? 'column' : 'row',
                gap: isSmallScreen ? '20px' : '30px',
                minHeight: 0
            }}>
                {/* Home Leaderboard */}
                <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minWidth: 0 }}>
                    <h2 style={{ fontSize: isSmallScreen ? '1.1rem' : '1.5rem', marginBottom: '1rem', position: 'sticky', top: 0, background: 'var(--bg-primary)', padding: '5px 0', zIndex: 5 }}>
                        {lang === 'en' ? 'HOME BEST' : 'የቤት ምርጥ'}
                    </h2>
                    {data.length === 0 ? (
                        <p style={{ fontSize: isSmallScreen ? '0.85rem' : '1rem' }}>{lang === 'en' ? "No scores yet. Be the first!" : "ገና ነጥብ አልተመዘገበም። የመጀመሪያው ይሁኑ!"}</p>
                    ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: isSmallScreen ? '6px' : '10px' }}>
                            {data.map((item, i) => (
                                <div key={i} style={{
                                    display: 'flex', alignItems: 'center', background: 'var(--bg-secondary)',
                                    padding: isSmallScreen ? '8px 10px' : '10px 20px', borderRadius: '8px', border: i === 0 ? '2px solid var(--accent-color)' : '1px solid var(--border-color)',
                                    gap: isSmallScreen ? '8px' : '15px'
                                }}>
                                    <span style={{ fontFamily: 'var(--font-heading)', fontSize: isSmallScreen ? '1.1rem' : '1.5rem', width: '25px', color: i < 3 ? 'var(--accent-color)' : 'var(--text-muted)' }}>{i + 1}</span>
                                    {item.snapshot && !isSmallScreen && (
                                        <div style={{ width: '60px', height: '40px', borderRadius: '4px', overflow: 'hidden', flexShrink: 0 }}>
                                            <img src={item.snapshot} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                        </div>
                                    )}
                                    <span style={{ flexGrow: 1, textAlign: 'left', fontWeight: 'bold', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: isSmallScreen ? '0.9rem' : '1rem' }}>{item.name}</span>
                                    <span style={{ fontFamily: 'var(--font-heading)', fontSize: isSmallScreen ? '1rem' : '1.2rem', color: 'var(--accent-color)' }}>{item.score}</span>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Global Leaderboard */}
                <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minWidth: 0 }}>
                    <h2 style={{ fontSize: isSmallScreen ? '1.1rem' : '1.5rem', marginBottom: '1rem', position: 'sticky', top: 0, background: 'var(--bg-primary)', padding: '5px 0', zIndex: 5 }}>
                        {lang === 'en' ? 'GLOBAL BEST' : 'አለም አቀፍ ምርጥ'}
                    </h2>
                    {globalData.length === 0 ? (
                        <p style={{ fontSize: isSmallScreen ? '0.85rem' : '1rem' }}>{lang === 'en' ? "Loading..." : "በመስቀል ላይ..."}</p>
                    ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: isSmallScreen ? '6px' : '10px' }}>
                            {globalData.map((item, i) => (
                                <div key={i} style={{
                                    display: 'flex', alignItems: 'center', background: 'var(--bg-secondary)',
                                    padding: isSmallScreen ? '8px 10px' : '10px 20px', borderRadius: '8px', border: i === 0 ? '2px solid var(--accent-color)' : '1px solid var(--border-color)',
                                    gap: isSmallScreen ? '8px' : '15px'
                                }}>
                                    <span style={{ fontFamily: 'var(--font-heading)', fontSize: isSmallScreen ? '1.1rem' : '1.5rem', width: '25px', color: i < 3 ? 'var(--accent-color)' : 'var(--text-muted)' }}>{i + 1}</span>
                                    {item.snapshot && !isSmallScreen && (
                                        <div style={{ width: '60px', height: '40px', borderRadius: '4px', overflow: 'hidden', flexShrink: 0 }}>
                                            <img src={item.snapshot} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                        </div>
                                    )}
                                    <span style={{ flexGrow: 1, textAlign: 'left', fontWeight: 'bold', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: isSmallScreen ? '0.9rem' : '1rem' }}>{item.name}</span>
                                    <span style={{ fontFamily: 'var(--font-heading)', fontSize: isSmallScreen ? '1rem' : '1.2rem', color: 'var(--accent-color)' }}>{item.score}</span>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            <div style={{ flexShrink: 0, marginTop: '0.5rem' }}>
                <MagneticButton onClick={onClose}>{t('gotIt', lang)}</MagneticButton>
            </div>
        </div>
    );
};

// --- ABOUT MODAL ---
const AboutModal: React.FC<{ onClose: () => void; lang: Language; t: TFunction }> = ({ onClose, lang, t }) => {
    return (
        <div className="modal" style={{ zIndex: 100, maxWidth: '500px' }}>
            <h1 style={{ fontSize: '2rem' }}>{t('about', lang)}</h1>

            <div style={{ textAlign: 'left', margin: '2rem 0', background: 'var(--bg-secondary)', padding: '20px', borderRadius: '8px' }}>
                <h3 style={{ color: 'var(--accent-color)', marginBottom: '15px' }}>{t('developer', lang)}</h3>
                <p style={{ fontSize: '1.2rem', fontWeight: 'bold', marginBottom: '10px' }}>{t('developerName', lang)}</p>

                <h3 style={{ color: 'var(--accent-color)', marginTop: '20px', marginBottom: '10px' }}>{t('contact', lang)}</h3>
                <ul style={{ listStyle: 'none', padding: 0, color: 'var(--text-muted)', lineHeight: '2' }}>
                    <li><EmailIcon /> <a href="mailto:Leulman2@gmail.com" style={{ color: 'var(--accent-color)' }}>Leulman2@gmail.com</a></li>
                    <li><TelegramIcon /> <a href="https://t.me/fabbin" style={{ color: 'var(--accent-color)' }}>@fabbin</a></li>
                    <li><GithubIcon /> <a href="https://github.com/LeulTew" style={{ color: 'var(--accent-color)' }}>LeulTew</a></li>
                </ul>
            </div>

            <p style={{
                fontStyle: 'italic',
                color: 'var(--text-muted)',
                fontSize: '0.95rem',
                marginBottom: '1.5rem',
                textAlign: 'center'
            }}>
                {lang === 'en'
                    ? 'May your slices be swift and your combos endless.'
                    : 'ቅንጥቆችዎ ፈጣን እና ኮምቦዎ ላልቂት ይሁን።'}
            </p>

            <MagneticButton onClick={onClose}>{t('gotIt', lang)}</MagneticButton>
        </div>
    );
};

// --- BLADE ICON ---
const BladeIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" width="20" height="20">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
    </svg>
);

// --- STROKE SELECTOR MODAL ---
const StrokeSelectorModal: React.FC<{
    currentStroke: StrokeId;
    onSelect: (id: StrokeId) => void;
    onClose: () => void;
    lang: Language;
    t: TFunction;
}> = ({ currentStroke, onSelect, onClose, lang, t }) => {
    return (
        <div className="modal" style={{ zIndex: 100, maxWidth: '800px', maxHeight: '85vh', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
            <h1 style={{ fontSize: '2rem', marginBottom: '1rem', flexShrink: 0 }}>{t('strokesTitle', lang)}</h1>

            <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))',
                gap: '15px',
                margin: '1rem 0',
                overflowY: 'auto',
                flexGrow: 1,
                paddingRight: '10px'
            }}>
                {STROKE_PRESETS.map(stroke => {
                    const previewImg = STROKE_IMAGES[stroke.id];
                    const isSelected = currentStroke === stroke.id;

                    return (
                        <div
                            key={stroke.id}
                            onClick={() => onSelect(stroke.id)}
                            style={{
                                position: 'relative',
                                aspectRatio: '16/9',
                                borderRadius: '8px',
                                overflow: 'hidden',
                                border: isSelected ? '3px solid var(--accent-color)' : '2px solid var(--border-color)',
                                cursor: 'pointer',
                                transition: 'all 0.2s',
                                boxShadow: isSelected ? '0 0 20px rgba(204, 255, 0, 0.3)' : 'none',
                                background: previewImg ? 'transparent' : `linear-gradient(135deg, ${stroke.colors.blade}, ${stroke.colors.bladeGlow})`
                            }}
                        >
                            {previewImg ? (
                                <img
                                    src={previewImg}
                                    alt={stroke.name}
                                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                />
                            ) : (
                                <div style={{
                                    width: '100%',
                                    height: '100%',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    background: 'var(--bg-secondary)'
                                }}>
                                    <div style={{
                                        width: '60%',
                                        height: '4px',
                                        background: `linear-gradient(90deg, ${stroke.colors.blade}, ${stroke.colors.bladeCore})`,
                                        borderRadius: '2px',
                                        boxShadow: `0 0 15px ${stroke.colors.blade}`,
                                        transform: 'rotate(-15deg)'
                                    }} />
                                </div>
                            )}

                            {/* Stroke name label */}
                            <div style={{
                                position: 'absolute',
                                bottom: 0,
                                left: 0,
                                right: 0,
                                padding: '4px 8px',
                                background: 'rgba(0,0,0,0.7)',
                                fontSize: '0.75rem',
                                fontWeight: 'bold',
                                textAlign: 'center',
                                color: stroke.colors.blade
                            }}>
                                {lang === 'am' ? stroke.nameAm : stroke.name}
                            </div>

                            {/* Selection checkmark */}
                            {isSelected && (
                                <div style={{
                                    position: 'absolute',
                                    top: '5px',
                                    right: '5px',
                                    background: 'var(--accent-color)',
                                    color: 'var(--bg-color)',
                                    width: '22px',
                                    height: '22px',
                                    borderRadius: '50%',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    fontWeight: 'bold',
                                    fontSize: '14px'
                                }}>
                                    ✓
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>

            <div style={{ flexShrink: 0, marginTop: '1rem' }}>
                <MagneticButton onClick={onClose}>{t('gotIt', lang)}</MagneticButton>
            </div>
        </div>
    );
};

export const GameCanvas: React.FC = () => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const videoRef = useRef<HTMLVideoElement>(null);
    const engineRef = useRef<GameEngine | null>(null);
    const mpRef = useRef<MediaPipeService | null>(null);

    // State
    const [score, setScore] = useState(0);
    const [lives, setLives] = useState(3);
    const [gameState, setGameState] = useState<'LOADING' | 'START' | 'ACTIVATING' | 'PLAYING' | 'GAMEOVER' | 'GUIDE' | 'ABOUT'>('LOADING');
    const [tracking, setTracking] = useState(false);
    const [highScore, setHighScore] = useState(0);
    const [streak, setStreak] = useState(0);
    const [multiplier, setMultiplier] = useState(1);
    const [feedbacks, setFeedbacks] = useState<{ id: number, x: number, y: number, text: string }[]>([]);
    const [playerName, setPlayerName] = useState<string>('');
    const [leaderboard, setLeaderboard] = useState<LeaderboardItem[]>([]);
    const [showNameEntry, setShowNameEntry] = useState(false);
    const [pendingScore, setPendingScore] = useState(0);
    const [pendingSnapshot, setPendingSnapshot] = useState<string | undefined>(undefined);
    const [pendingOriginalName, setPendingOriginalName] = useState<string>(''); // Track original name at high score time
    const [globalLeaderboard, setGlobalLeaderboard] = useState<LeaderboardItem[]>([]);
    const [showLeaderboard, setShowLeaderboard] = useState(false);
    const [isNewHighScore, setIsNewHighScore] = useState(false);
    const [cameraActive, setCameraActive] = useState(false);
    const [showWelcome, setShowWelcome] = useState(false); // Initial name entry for new users

    // Stroke Selection
    const [currentStroke, setCurrentStroke] = useState<StrokeId>('classic');
    const [showStrokeSelector, setShowStrokeSelector] = useState(false);

    // Settings
    const [theme, setTheme] = useState<'dark' | 'light'>('dark');
    const [lang, setLang] = useState<Language>('en');

    const toggleTheme = () => {
        const newTheme = theme === 'dark' ? 'light' : 'dark';
        setTheme(newTheme);
        document.documentElement.setAttribute('data-theme', newTheme);
        Persistence.save('theme', newTheme);
    };

    const toggleLang = () => {
        const newLang = lang === 'en' ? 'am' : 'en';
        setLang(newLang);
        Persistence.save('lang', newLang);
    };

    const syncLeaderboards = useCallback(async (currentScore: number, isNewLocalHigh: boolean) => {
        // Load player name safely
        const savedPlayerName = await Persistence.load('playerName').then(v => typeof v === 'string' ? v : '');
        const currentEffectiveName = savedPlayerName || 'PLAYER';

        // IMMEDIATELY show celebration for new high scores (before any network calls)
        if (isNewLocalHigh && currentScore > 0) {
            // Take snapshot immediately
            let snapshot: string | undefined = undefined;
            if (videoRef.current) {
                try {
                    const canvas = document.createElement('canvas');
                    const ctx = canvas.getContext('2d');
                    if (ctx) {
                        canvas.width = videoRef.current.videoWidth;
                        canvas.height = videoRef.current.videoHeight;
                        ctx.drawImage(videoRef.current, 0, 0);
                        snapshot = canvas.toDataURL('image/webp', 0.5);
                    }
                } catch { /* ignore */ }
            }

            setPendingScore(currentScore);
            setPendingSnapshot(snapshot);
            setIsNewHighScore(true);
            setPendingOriginalName(currentEffectiveName);

            // If no name set, ensure we have a default
            if (!savedPlayerName) {
                await Persistence.save('playerName', 'PLAYER');
                setPlayerName('PLAYER');
            }

            // Don't auto-save - wait for modal close to finalize name and local record
            return;
        }

        // For non-high-scores, do the normal sync
        try {
            // 1. Fetch global state
            const res = await fetch('/api/leaderboard');
            if (!res.ok) return;
            const data = await res.json();
            const globalScores: LeaderboardItem[] = data.leaderboard || [];
            const globalLowest = globalScores.length < 50 ? 0 : (globalScores[globalScores.length - 1]?.score || 0);

            // O(N) lookup map for efficiency (avoids O(n^2) nested loops)
            const globalScoresMap = new Map(globalScores.map(s => [s.name.toLowerCase(), s.score]));

            // 2. Load local state
            const loadedPlayerName = await Persistence.load('playerName').then(v => typeof v === 'string' ? v : '');

            // 3. Determine if we should show name entry
            const qualifiesForGlobal = currentScore > globalLowest || globalScores.length < 50;

            // Don't show any modal if score is 0
            if (currentScore <= 0) {
                return;
            }

            // For qualifying global scores (but not new local high)
            if (qualifiesForGlobal) {
                let snapshot = undefined;
                if (videoRef.current) {
                    const canvas = document.createElement('canvas');
                    const ctx = canvas.getContext('2d');
                    if (ctx) {
                        canvas.width = videoRef.current.videoWidth;
                        canvas.height = videoRef.current.videoHeight;
                        ctx.drawImage(videoRef.current, 0, 0);
                        snapshot = canvas.toDataURL('image/webp', 0.5);
                    }
                }
                setPendingScore(currentScore);
                setPendingSnapshot(snapshot);

                // Auto-save high score with current name (or default "PLAYER")
                const effectiveName = loadedPlayerName || 'PLAYER';

                // If no name was set, save the default
                if (!loadedPlayerName) {
                    await Persistence.save('playerName', effectiveName);
                    setPlayerName(effectiveName);
                }

                // Auto-save for non-high-scores that qualify for global
                // 3.1 Update local leaderboard with uniqueness
                const existingList = await Persistence.load('leaderboard') as LeaderboardItem[] || [];
                const pNameLower = effectiveName.toLowerCase();

                // Filter out existing entries for this name and current pending entry
                let newList = existingList.filter(e => e.name.toLowerCase() !== pNameLower);

                // Add current score if it's highest known for this user
                const currentBest = Math.max(currentScore, ...existingList.filter(e => e.name.toLowerCase() === pNameLower).map(e => e.score), 0);

                newList.push({
                    name: effectiveName,
                    score: Math.max(currentScore, currentBest),
                    snapshot: currentScore >= currentBest ? snapshot : (existingList.find(e => e.name.toLowerCase() === pNameLower)?.snapshot)
                });

                // Sort and trim
                newList = newList.sort((a, b) => b.score - a.score).slice(0, 50);
                // Snapshot optimization (only top 5)
                newList = newList.map((item, i) => ({ ...item, snapshot: i < 5 ? item.snapshot : undefined }));

                await Persistence.save('leaderboard', newList);
                setLeaderboard(newList);

                // 3.2 Submit to global if it qualifies
                try {
                    await fetch('/api/submit-score', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ name: effectiveName, score: currentScore, snapshot })
                    });
                } catch { /* silent */ }
            }

            // 4. Batch Auto-sync ALL qualifying local scores that might have been missed
            const syncPromises = [];
            const processedNamesForSync = new Set<string>();
            const localListForSync = await Persistence.load('leaderboard') as LeaderboardItem[] || [];
            const candidates = [...localListForSync];
            const effectiveNameForSync = playerName || 'PLAYER';
            if (currentScore > 0) {
                candidates.push({ name: effectiveNameForSync, score: currentScore });
            }

            for (const item of candidates) {
                const nameLower = item.name.toLowerCase();
                if (processedNamesForSync.has(nameLower)) continue;
                processedNamesForSync.add(nameLower);

                const gScore = globalScoresMap.get(nameLower);
                const qualifies = item.score > (gScore ?? -1) && (item.score > globalLowest || globalScores.length < 50);

                if (qualifies) {
                    syncPromises.push(
                        fetch('/api/submit-score', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                                name: item.name,
                                score: item.score,
                                snapshot: item.snapshot
                            })
                        }).catch(() => { })
                    );
                }
            }

            if (syncPromises.length > 0) await Promise.all(syncPromises);
        } catch (e) {
            console.warn('Sync failed', e);
        }
    }, []);

    const checkHighScore = useCallback(async (scoreParam: number) => {
        try {
            const final = Number(scoreParam);
            const rawHigh = await Persistence.load('highScore');
            let currentHigh = 0;

            if (typeof rawHigh === 'number') currentHigh = rawHigh;
            else if (typeof rawHigh === 'string') currentHigh = parseInt(rawHigh, 10);

            if (isNaN(currentHigh)) currentHigh = 0;

            const isNewLocalHigh = final > currentHigh;

            if (isNewLocalHigh) {
                await Persistence.save('highScore', final);
                setHighScore(final);
            }

            // Trigger sync and celebration - ensure we pass numbers
            await syncLeaderboards(final, isNewLocalHigh);

            // Refresh local leaderboard display from storage
            const list = await Persistence.load('leaderboard');
            if (Array.isArray(list)) setLeaderboard(list as LeaderboardItem[]);
        } catch (e) {
            console.error('High score check failed', e);
        }
    }, [syncLeaderboards]);

    // Load initial data
    useEffect(() => {
        Persistence.load('playerName').then(v => {
            if (typeof v === 'string' && v) {
                setPlayerName(v);
            } else {
                setShowWelcome(true);
            }
        });
        Persistence.load('leaderboard').then(v => { if (Array.isArray(v)) setLeaderboard(v as LeaderboardItem[]); });
        Persistence.load('highScore').then(v => { if (typeof v === 'number') setHighScore(v); });
        Persistence.load('selectedStroke').then(v => {
            if (typeof v === 'string' && STROKE_PRESETS.some(s => s.id === v)) {
                setCurrentStroke(v as StrokeId);
            }
        });
    }, []);

    const spawnFeedback = useCallback((x: number, y: number, text: string) => {
        const id = Date.now() + Math.random();
        setFeedbacks(prev => [...prev, { id, x, y, text }]);
        setTimeout(() => setFeedbacks(prev => prev.filter(f => f.id !== id)), 800);
    }, []);

    const updateStreak = useCallback((newStreak: number, newMultiplier: number) => {
        setStreak(newStreak);
        setMultiplier(newMultiplier);
    }, []);

    // Use refs for callbacks to be used in GameEngine to avoid closure/re-creation issues
    const checkHighScoreRef = useRef(checkHighScore);
    const spawnFeedbackRef = useRef(spawnFeedback);
    const updateStreakRef = useRef(updateStreak);

    useEffect(() => {
        checkHighScoreRef.current = checkHighScore;
        spawnFeedbackRef.current = spawnFeedback;
        updateStreakRef.current = updateStreak;
    }, [checkHighScore, spawnFeedback, updateStreak]);

    // Cleanup and engine initialization
    useEffect(() => {
        let isActive = true;
        // Pre-load high score
        Persistence.load('highScore').then((val) => {
            if (isActive && typeof val === 'number') setHighScore(val);
        }).catch(() => { });

        const engine = new GameEngine(
            (s) => { if (isActive) setScore(s); },
            (l) => { if (isActive) setLives(l); },
            (final) => {
                if (isActive) {
                    setGameState('GAMEOVER');
                    checkHighScoreRef.current(final);
                }
            },
            (x, y, text) => { if (isActive) spawnFeedbackRef.current(x, y, text); },
            (streak, mult) => { if (isActive) updateStreakRef.current(streak, mult); }
        );
        engineRef.current = engine;

        let animationFrameId: number;
        let lastTimestamp: number = 0;

        const render = (timestamp: number) => {
            if (!isActive) return;
            if (!lastTimestamp) lastTimestamp = timestamp;
            const dt = (timestamp - lastTimestamp) / 16.67;
            lastTimestamp = timestamp;

            if (canvasRef.current && engineRef.current) {
                const ctx = canvasRef.current.getContext('2d');
                if (ctx) {
                    const cappedDt = Math.min(dt, 5);
                    engineRef.current.loop(ctx, cappedDt);
                }
            }
            animationFrameId = requestAnimationFrame(render);
        };
        animationFrameId = requestAnimationFrame(render);

        const handleResize = () => {
            if (isActive && canvasRef.current && engineRef.current) {
                canvasRef.current.width = window.innerWidth;
                canvasRef.current.height = window.innerHeight;
                engineRef.current.resize(window.innerWidth, window.innerHeight);
            }
        };
        window.addEventListener('resize', handleResize);
        handleResize();

        // Finish loading
        setTimeout(() => { if (isActive) setGameState('START'); }, 500);

        return () => {
            isActive = false;
            cancelAnimationFrame(animationFrameId);
            window.removeEventListener('resize', handleResize);
            if (engineRef.current) engineRef.current.gameActive = false;
        };
    }, []);

    // Sync stroke with engine when it changes
    useEffect(() => {
        if (engineRef.current) {
            engineRef.current.setStroke(currentStroke);
        }
    }, [currentStroke]);


    const onResults = useCallback((results: Results) => {
        if (!engineRef.current) return;
        if (results.multiHandLandmarks && results.multiHandLandmarks.length > 0) {
            setTracking(true);
            const indexTip = results.multiHandLandmarks[0][8];
            engineRef.current.updateHand({ x: (1 - indexTip.x) * window.innerWidth, y: indexTip.y * window.innerHeight, visible: true });
        } else {
            setTracking(false);
            engineRef.current.updateHand({ x: -100, y: -100, visible: false });
        }
    }, []);

    // Load settings & Warm up MediaPipe
    useEffect(() => {
        Persistence.load('theme').then(v => {
            if (typeof v === 'string' && (v === 'dark' || v === 'light')) {
                setTheme(v);
                document.documentElement.setAttribute('data-theme', v);
            }
        });
        Persistence.load('lang').then(v => { if (typeof v === 'string' && (v === 'en' || v === 'am')) setLang(v); });

        // Start asset downloads early
        if (!mpRef.current && videoRef.current) {
            mpRef.current = new MediaPipeService(videoRef.current, onResults);
        }
    }, [onResults]);

    const activateCam = async () => {
        setGameState('ACTIVATING');
        if (!mpRef.current && videoRef.current) {
            mpRef.current = new MediaPipeService(videoRef.current, onResults);
            try {
                await mpRef.current.start();
                setCameraActive(true);
            }
            catch (e) {
                const err = (e as Error).message;
                alert("Camera error: " + err);
                setGameState('START');
                return;
            }
        } else if (mpRef.current) {
            await mpRef.current.start();
            setCameraActive(true);
        }

        if (engineRef.current) {
            engineRef.current.startGame();
            setGameState('PLAYING');
        }
    };

    const restartGame = () => {
        setStreak(0);
        setMultiplier(1);
        if (engineRef.current) { engineRef.current.startGame(); setGameState('PLAYING'); }
    };

    const stopGame = () => {
        setGameState('START');
        if (engineRef.current) engineRef.current.gameActive = false;
        setTracking(false);
        setScore(0);
        setLives(3);
    };

    // Save pending high score when user closes the high score modal
    const savePendingHighScore = async () => {
        if (!playerName || pendingScore <= 0) return;

        const lowerName = playerName.toLowerCase();
        const lowerOriginalName = pendingOriginalName.toLowerCase();
        const nameChanged = lowerName !== lowerOriginalName;
        const existing = await Persistence.load('leaderboard') as LeaderboardItem[] || [];

        let newList: LeaderboardItem[];

        if (nameChanged) {
            // Name was changed - DON'T remove the original name's records
            // Just add the new entry, removing any existing for the NEW name only
            newList = existing.filter(e => e.name.toLowerCase() !== lowerName);

            // Add entry with the new name
            newList.push({
                name: playerName,
                score: pendingScore,
                snapshot: pendingSnapshot
            });
        } else {
            // Name is the same - update the existing record
            newList = existing.filter(e => e.name.toLowerCase() !== lowerName);

            // Get current best for this player
            const currentBest = Math.max(pendingScore, ...existing.filter(e => e.name.toLowerCase() === lowerName).map(e => e.score), 0);

            newList.push({
                name: playerName,
                score: Math.max(pendingScore, currentBest),
                snapshot: pendingScore >= currentBest ? pendingSnapshot : (existing.find(e => e.name.toLowerCase() === lowerName)?.snapshot)
            });
        }

        // Sort and trim
        newList = newList.sort((a, b) => b.score - a.score).slice(0, 50);
        // Snapshot optimization (only top 5)
        newList = newList.map((item, i) => ({ ...item, snapshot: i < 5 ? item.snapshot : undefined }));

        await Persistence.save('leaderboard', newList);
        setLeaderboard(newList);

        // Submit to global leaderboard
        try {
            await fetch('/api/submit-score', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name: playerName, score: pendingScore, snapshot: pendingSnapshot })
            });
        } catch { /* silent */ }
    };

    const saveScore = async (name: string) => {
        if (!name.trim()) return;
        const lowerName = name.trim().toLowerCase();
        const existing = await Persistence.load('leaderboard') as LeaderboardItem[] || [];
        const currentPlayerName = playerName || 'PLAYER';
        const isExistingUser = currentPlayerName.toLowerCase() === lowerName;

        // Allow changing from PLAYER to new name, but reject if name is taken by someone else
        if (!Array.isArray(existing) ||
            (!isExistingUser && currentPlayerName.toUpperCase() !== 'PLAYER' && existing.some((e: LeaderboardItem) => typeof e.name === 'string' && e.name.toLowerCase() === lowerName))) {
            alert(lang === 'en' ? "Name already taken!" : "ስሙ ቀድሞ ተይዟል!");
            return;
        }

        // Just update the name state and persistence.
        // We DON'T update the leaderboard or submit to global here.
        // The savePendingHighScore function (called on close) will handle it.
        await Persistence.save('playerName', name.trim());
        setPlayerName(name.trim());
        setShowNameEntry(false);
    };


    const turnOffCamera = async () => {
        if (mpRef.current) {
            await mpRef.current.stop();
            mpRef.current = null;
        }
        setCameraActive(false);
        setGameState('START');
        setTracking(false);
        setScore(0);
        setLives(3);
    };

    const fetchGlobal = useCallback(async () => {
        try {
            const res = await fetch('/api/leaderboard');
            if (!res.ok) {
                console.warn('Global leaderboard not available (API returned error)');
                setGlobalLeaderboard([]);
                return;
            }
            const data = await res.json();
            const newGlobal = data.leaderboard || [];
            setGlobalLeaderboard(newGlobal);

            // Trigger a sync of local bests to global
            syncLeaderboards(0, false);
        } catch {
            console.warn('Global leaderboard not available (network error)');
            setGlobalLeaderboard([]);
        }
    }, [syncLeaderboards]);

    // Live Polling for Global Leaderboard
    useEffect(() => {
        // Initial fetch
        const initFetch = async () => {
            await fetchGlobal();
        };
        initFetch();

        // Poll every 10 seconds for "live" feel
        const interval = setInterval(() => {
            // Only poll if we are on start screen or leaderboard is open
            if (gameState === 'START' || showLeaderboard) {
                fetchGlobal();
            }
        }, 10000);

        return () => clearInterval(interval);
    }, [fetchGlobal, gameState, showLeaderboard]);

    const currentBg = currentStroke === 'classic'
        ? (theme === 'dark' ? bgClassicDark : bgClassicLight)
        : STROKE_BACKGROUNDS[currentStroke];

    return (
        <div id="game-container" style={{
            background: currentBg ? `url(${currentBg}) center/cover no-repeat` : undefined,
            backgroundColor: !currentBg ? (currentStroke === 'shadow' ? '#0a0512' : 'var(--bg-primary)') : undefined
        }}>
            <canvas ref={canvasRef} id="game-canvas" />

            {/* Bottom Controls (Stop Game) */}
            {gameState === 'PLAYING' && (
                <div className="bottom-controls">
                    <div className="control-options">
                        <button className="small-btn" onClick={stopGame}>
                            <StopIcon /> {t('stopGame', lang)}
                        </button>
                    </div>
                    <div className="control-arrow">
                        <ArrowUpIcon />
                    </div>
                </div>
            )}

            {/* Settings Bar - Bottom Left */}
            <div className="settings-bar">
                <button className="toggle-btn" onClick={toggleTheme} title={theme === 'dark' ? 'Light Mode' : 'Dark Mode'}>
                    {theme === 'dark' ? <SunIcon /> : <MoonIcon />}
                </button>
                <button className="toggle-btn" onClick={toggleLang} title="Language">
                    {lang === 'en' ? 'አማ' : 'EN'}
                </button>
            </div>

            {/* Camera Off Button - Bottom Hover */}
            {(gameState === 'START' || gameState === 'ACTIVATING') && cameraActive && (
                <div className="camera-off-hover">
                    <button className="small-btn" onClick={turnOffCamera}>
                        <CameraOffIcon /> {t('turnOffCamera', lang)}
                    </button>
                </div>
            )}

            {/* Webcam */}
            <div id="video-wrapper">
                <div id="tracking-label" style={{ background: tracking ? 'var(--accent-color)' : '#555' }}>
                    {tracking ? t('tracking', lang) : t('trackingOff', lang)}
                </div>
                <video ref={videoRef} id="input-video" playsInline muted autoPlay></video>
            </div>

            {/* UI Overlay */}
            <div id="ui-layer">
                <div className="hud-top">
                    <div className="score-block">
                        <span className="score-label">{t('score', lang)}</span>
                        <span id="score" className="score-value">{score}</span>
                        {gameState !== 'PLAYING' && highScore > 0 && (
                            <span style={{ fontSize: '1rem', color: 'var(--text-muted)', marginTop: '0.5rem' }}>{t('best', lang)}: {highScore}</span>
                        )}
                    </div>

                    {gameState === 'PLAYING' && streak > 0 && (
                        <div style={{
                            display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '0.5rem 1rem',
                            background: multiplier > 1 ? 'rgba(204, 255, 0, 0.2)' : 'transparent',
                            borderRadius: '8px', border: multiplier > 1 ? '2px solid var(--accent-color)' : 'none', transition: 'all 0.3s'
                        }}>
                            <span style={{ fontFamily: 'var(--font-heading)', fontSize: '1.5rem', color: multiplier > 1 ? 'var(--accent-color)' : 'var(--text-color)' }}>{multiplier}x</span>
                            <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>{t('streak', lang)}: {streak}</span>
                        </div>
                    )}

                    <div className="lives-block" id="lives">
                        {[0, 1, 2, 3, 4].map(i => <HeartIcon key={i} lost={i >= lives} extra={i >= 3} />)}
                    </div>
                </div>

                {/* Start Screen */}
                <div id="start-screen" className={`modal ${gameState === 'START' || gameState === 'ACTIVATING' ? '' : 'hidden'}`}>
                    {playerName && <div style={{ fontSize: '0.8rem', color: 'var(--accent-color)', marginBottom: '5px' }}>{lang === 'en' ? 'WELCOME BACK, ' : 'እንኳን ደህና መጡ፣ '}{playerName}</div>}
                    <h1 style={{ whiteSpace: 'pre-line' }}>{t('title', lang)}</h1>
                    <p style={{ display: gameState === 'ACTIVATING' ? 'none' : 'block' }}>
                        {t('subtitle', lang)}<br />
                        {t('heartsInfo', lang)}<br />
                        <span style={{ color: 'var(--accent-color)' }}>{t('streakInfo', lang)}</span>
                    </p>

                    <div id="loading-ui" style={{ display: gameState === 'ACTIVATING' ? 'block' : 'none', marginBottom: '2rem' }}>
                        <div className="spinner" style={{ width: 30, height: 30, borderWidth: 3 }}></div>
                    </div>

                    {gameState === 'START' && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '15px', alignItems: 'center', width: '100%' }}>
                            <MagneticButton onClick={activateCam}>{t('activateCam', lang)} <PlayIcon /></MagneticButton>
                            <div style={{ display: 'flex', gap: '15px', width: '100%' }}>
                                <div style={{ flex: 1 }}><MagneticButton onClick={() => setGameState('GUIDE')} secondary>{t('howToPlay', lang)} <HelpIcon /></MagneticButton></div>
                                <div style={{ width: '80px' }}><MagneticButton onClick={() => { fetchGlobal(); setShowLeaderboard(true); }} secondary><TrophyIcon /></MagneticButton></div>
                            </div>
                            {cameraActive && (
                                <MagneticButton onClick={turnOffCamera} secondary>{t('turnOffCamera', lang)} <CameraOffIcon /></MagneticButton>
                            )}
                            <div style={{ display: 'flex', gap: '15px', width: '100%' }}>
                                <div style={{ flex: 1 }}><MagneticButton onClick={() => setShowStrokeSelector(true)} secondary>{t('strokesTitle', lang)} <BladeIcon /></MagneticButton></div>
                                <div style={{ flex: 1 }}><MagneticButton onClick={() => setGameState('ABOUT')} secondary>{t('about', lang)}</MagneticButton></div>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Leaderboard */}
            {showLeaderboard && <LeaderboardModal data={leaderboard} globalData={globalLeaderboard} onClose={() => setShowLeaderboard(false)} lang={lang} t={t} />}

            {/* Name Entry */}
            {showNameEntry && <NameEntryModal score={pendingScore} snapshot={pendingSnapshot} onSave={saveScore} onClose={() => setShowNameEntry(false)} lang={lang} initialName={playerName || 'PLAYER'} t={t} />}


            {/* Welcome Flow */}
            {showWelcome && (
                <WelcomeModal
                    lang={lang}
                    onComplete={async (name) => {
                        await Persistence.save('playerName', name);
                        setPlayerName(name);
                        setShowWelcome(false);
                    }}
                />
            )}

            {/* Guide */}
            {gameState === 'GUIDE' && <GuideModal onClose={() => setGameState('START')} lang={lang} t={t} />}

            {/* About */}
            {gameState === 'ABOUT' && <AboutModal onClose={() => setGameState('START')} lang={lang} t={t} />}

            {/* Stroke Selector */}
            {showStrokeSelector && (
                <StrokeSelectorModal
                    currentStroke={currentStroke}
                    onSelect={(id) => {
                        setCurrentStroke(id);
                        Persistence.save('selectedStroke', id);
                    }}
                    onClose={() => setShowStrokeSelector(false)}
                    lang={lang}
                    t={t}
                />
            )}

            {/* Game Over */}
            <div id="game-over-screen" className={`modal ${gameState === 'GAMEOVER' && !showNameEntry ? '' : 'hidden'}`}>
                <h1 style={{ whiteSpace: 'pre-line' }}>{t('gameOver', lang)}</h1>
                <p>
                    {t('finalScore', lang)}: <span style={{ color: 'var(--text-color)', fontSize: '1.5rem' }}>{score}</span>
                </p>

                {/* New High Score Section */}
                {isNewHighScore && (
                    <div style={{
                        margin: '1.5rem 0',
                        padding: '1.5rem',
                        background: 'linear-gradient(135deg, rgba(204, 255, 0, 0.1), rgba(255, 215, 0, 0.1))',
                        border: '2px solid var(--accent-color)',
                        borderRadius: '12px',
                        boxShadow: '0 0 30px rgba(204, 255, 0, 0.2)',
                        textAlign: 'center'
                    }}>
                        <h2 style={{
                            fontSize: '2rem',
                            color: 'var(--accent-color)',
                            marginBottom: '0.7rem',
                            textShadow: '0 0 20px rgba(204, 255, 0, 0.5)'
                        }}>
                            {t('newHighScore', lang)} 🎉
                        </h2>
                        {playerName && (
                            <p style={{ color: 'var(--text-muted)', marginBottom: '0.5rem' }}>
                                {lang === 'en' ? `Saved as: ${playerName}` : `እንደ: ${playerName} ተመዝግቧል`}
                            </p>
                        )}
                        {pendingSnapshot && (
                            <div style={{
                                margin: '1rem auto',
                                width: '180px',
                                border: '2px solid var(--accent-color)',
                                borderRadius: '8px',
                                overflow: 'hidden',
                                boxShadow: '0 0 15px rgba(204, 255, 0, 0.2)'
                            }}>
                                <img src={pendingSnapshot} alt="High Score" style={{ width: '100%', display: 'block' }} />
                            </div>
                        )}
                        <button
                            onClick={() => { setIsNewHighScore(false); setShowNameEntry(true); }}
                            style={{
                                background: 'transparent',
                                border: 'none',
                                color: 'var(--text-muted)',
                                textDecoration: 'underline',
                                cursor: 'pointer',
                                fontSize: '0.9rem',
                                marginTop: '0.5rem',
                                fontFamily: 'var(--font-body)'
                            }}
                        >
                            {lang === 'en' ? 'Change Name' : 'ስም ቀይር'}
                        </button>
                    </div>
                )}

                <div style={{ display: 'flex', flexDirection: 'column', gap: '15px', alignItems: 'center' }}>
                    <MagneticButton onClick={() => { savePendingHighScore(); setIsNewHighScore(false); restartGame(); }}>{t('tryAgain', lang)} <RestartIcon /></MagneticButton>
                    <MagneticButton onClick={() => { savePendingHighScore(); setIsNewHighScore(false); turnOffCamera(); }} secondary>{t('turnOffCamera', lang)} <CameraOffIcon /></MagneticButton>
                </div>
            </div>

            {/* Feedbacks */}
            {feedbacks.map(f => (
                <div key={f.id} className="feedback-text" style={{
                    left: f.x, top: f.y,
                    color: f.text.includes('DOUBLE') || f.text.includes('TRIPLE') || f.text.includes('MEGA') ? '#FFD700' : f.text.includes('❤️') ? '#ff6b9d' : 'var(--accent-color)',
                    fontSize: f.text.includes('MEGA') ? '2.5rem' : '2rem'
                }}>{f.text}</div>
            ))}
            {/* Loader */}
            <div id="loader" style={{ display: gameState === 'LOADING' ? 'block' : 'none' }}>
                <div className="spinner"></div>
                <div style={{ fontWeight: 700, letterSpacing: 1, marginTop: 10 }}>{t('loadingEngine', lang)}</div>
            </div>
        </div>
    );
};
