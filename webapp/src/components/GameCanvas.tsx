import React, { useEffect, useRef, useState, useCallback } from 'react';
import { GameEngine } from '../logic/GameEngine';
import { MediaPipeService } from '../logic/MediaPipeService';
import type { Results } from '@mediapipe/hands';
import { get, set } from 'idb-keyval';
import { t, type Language } from '../i18n';

// Images
import guideGoodFrame from '../assets/guide_good_frame.png';
import guideBadFrame from '../assets/guide_bad_frame.png';
import guideGameplay from '../assets/guide_gameplay_action.png';

// --- PERSISTENCE HELPER ---
const Persistence = {
    async save(key: string, value: any) {
        try { await set(key, value); }
        catch { try { localStorage.setItem(key, JSON.stringify(value)); } catch { } }
    },
    async load(key: string): Promise<any> {
        try { const val = await get(key); if (val !== undefined) return val; } catch { }
        try { const item = localStorage.getItem(key); return item ? JSON.parse(item) : undefined; } catch { return undefined; }
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

// --- MAGNETIC BUTTON ---
const MagneticButton: React.FC<{ onClick: () => void; children: React.ReactNode; secondary?: boolean; }> = ({ onClick, children, secondary }) => {
    const wrapperRef = useRef<HTMLDivElement>(null);
    const buttonRef = useRef<HTMLButtonElement>(null);

    const handleMouseMove = (e: React.MouseEvent) => {
        if (!wrapperRef.current || !buttonRef.current) return;
        const rect = wrapperRef.current.getBoundingClientRect();
        const x = e.clientX - rect.left - rect.width / 2;
        const y = e.clientY - rect.top - rect.height / 2;
        buttonRef.current.style.transform = `translate(${x * 0.3}px, ${y * 0.3}px)`;
    };

    const handleMouseLeave = () => { if (buttonRef.current) buttonRef.current.style.transform = 'translate(0,0)'; };

    return (
        <div ref={wrapperRef} className="cta-wrapper" onMouseMove={handleMouseMove} onMouseLeave={handleMouseLeave}>
            <button ref={buttonRef} className={`magnetic-btn ${secondary ? 'secondary' : ''}`} onClick={onClick}>
                {children}
            </button>
        </div>
    );
};

// --- GUIDE MODAL ---
const GuideModal: React.FC<{ onClose: () => void; lang: Language }> = ({ onClose, lang }) => {
    return (
        <div className="modal" style={{ zIndex: 100, maxWidth: '800px', height: '80vh', overflowY: 'auto' }}>
            <h1 style={{ fontSize: '2.5rem' }}>{t('guideTitle', lang)}</h1>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', margin: '2rem 0', textAlign: 'left' }}>
                <div style={{ background: 'var(--bg-secondary)', padding: '15px', borderRadius: '8px' }}>
                    <img src={guideGoodFrame} alt="Good" style={{ width: '100%', borderRadius: '4px', marginBottom: '10px' }} />
                    <h3 style={{ color: '#4caf50', marginBottom: '5px' }}>{t('guideDo', lang)}</h3>
                    <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>{t('guideDoDesc', lang)}</p>
                </div>

                <div style={{ background: 'var(--bg-secondary)', padding: '15px', borderRadius: '8px' }}>
                    <img src={guideBadFrame} alt="Bad" style={{ width: '100%', borderRadius: '4px', marginBottom: '10px' }} />
                    <h3 style={{ color: '#ff2a55', marginBottom: '5px' }}>{t('guideDont', lang)}</h3>
                    <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>{t('guideDontDesc', lang)}</p>
                </div>
            </div>

            <div style={{ background: 'var(--bg-secondary)', padding: '20px', borderRadius: '8px', marginBottom: '2rem', textAlign: 'left', display: 'flex', gap: '20px', alignItems: 'center' }}>
                <img src={guideGameplay} alt="Action" style={{ width: '120px', borderRadius: '4px' }} />
                <div>
                    <h3 style={{ color: 'var(--accent-color)', marginBottom: '10px' }}>{t('guideRulesTitle', lang)}</h3>
                    <ul style={{ listStyle: 'none', padding: 0, color: 'var(--text-muted)', fontSize: '0.9rem', lineHeight: '1.5' }}>
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

// --- ABOUT MODAL ---
const AboutModal: React.FC<{ onClose: () => void; lang: Language }> = ({ onClose, lang }) => {
    return (
        <div className="modal" style={{ zIndex: 100, maxWidth: '500px' }}>
            <h1 style={{ fontSize: '2rem' }}>{t('about', lang)}</h1>

            <div style={{ textAlign: 'left', margin: '2rem 0', background: 'var(--bg-secondary)', padding: '20px', borderRadius: '8px' }}>
                <h3 style={{ color: 'var(--accent-color)', marginBottom: '15px' }}>{t('developer', lang)}</h3>
                <p style={{ fontSize: '1.2rem', fontWeight: 'bold', marginBottom: '10px' }}>{t('developerName', lang)}</p>

                <h3 style={{ color: 'var(--accent-color)', marginTop: '20px', marginBottom: '10px' }}>{t('contact', lang)}</h3>
                <ul style={{ listStyle: 'none', padding: 0, color: 'var(--text-muted)', lineHeight: '2' }}>
                    <li>📧 <a href="mailto:Leulman2@gmail.com" style={{ color: 'var(--accent-color)' }}>Leulman2@gmail.com</a></li>
                    <li>✈️ <a href="https://t.me/fabbin" style={{ color: 'var(--accent-color)' }}>@fabbin</a></li>
                    <li>🐙 <a href="https://github.com/LeulTew" style={{ color: 'var(--accent-color)' }}>LeulTew</a></li>
                </ul>
            </div>

            <MagneticButton onClick={onClose}>{t('gotIt', lang)}</MagneticButton>
        </div>
    );
};

// --- MAIN COMPONENT ---
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
    const [debugLogs, setDebugLogs] = useState<string[]>([]);
    const addLog = useCallback((msg: string) => {
        setDebugLogs(prev => [...prev.slice(-4), msg]); // Keep last 5
    }, []);

    // Settings
    const [theme, setTheme] = useState<'dark' | 'light'>('dark');
    const [lang, setLang] = useState<Language>('en');

    // Load settings - only on mount
    useEffect(() => {
        Persistence.load('theme').then(v => {
            if (v) {
                setTheme(v);
                document.documentElement.setAttribute('data-theme', v);
            }
        });
        Persistence.load('lang').then(v => { if (v) setLang(v); });
    }, []);

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

    const checkHighScore = useCallback((final: number) => {
        Persistence.load('highScore').then((val) => {
            const currentHigh = val ? (val as number) : 0;
            if (final > currentHigh) { Persistence.save('highScore', final); setHighScore(final); }
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

    useEffect(() => {
        Persistence.load('highScore').then((val) => { if (val) setHighScore(val as number); });

        const engine = new GameEngine(
            (s) => setScore(s),
            (l) => setLives(l),
            (final) => { setGameState('GAMEOVER'); checkHighScore(final); },
            spawnFeedback,
            updateStreak
        );
        engineRef.current = engine;

        let animationFrameId: number;
        const render = () => {
            if (canvasRef.current && engineRef.current) {
                const ctx = canvasRef.current.getContext('2d');
                if (ctx) engineRef.current.loop(ctx);
            }
            animationFrameId = requestAnimationFrame(render);
        };
        render();
        setTimeout(() => setGameState('START'), 500);
        return () => cancelAnimationFrame(animationFrameId);
    }, [checkHighScore, spawnFeedback, updateStreak]);

    useEffect(() => {
        const handleResize = () => {
            if (canvasRef.current && engineRef.current) {
                canvasRef.current.width = window.innerWidth;
                canvasRef.current.height = window.innerHeight;
                engineRef.current.resize(window.innerWidth, window.innerHeight);
            }
        };
        window.addEventListener('resize', handleResize);
        handleResize();
        return () => window.removeEventListener('resize', handleResize);
    }, []);

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

    const activateCam = async () => {
        setGameState('ACTIVATING');
        if (!mpRef.current && videoRef.current) {
            mpRef.current = new MediaPipeService(videoRef.current, onResults, addLog);
            try { await mpRef.current.start(); }
            catch (e) {
                const err = (e as Error).message;
                addLog('Start Error: ' + err);
                alert("Camera error: " + err);
                setGameState('START');
                return;
            }
        }
        setTimeout(() => { if (engineRef.current) { engineRef.current.startGame(); setGameState('PLAYING'); } }, 1000);
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

    const turnOffCamera = async () => {
        if (mpRef.current) {
            await mpRef.current.stop();
            mpRef.current = null;
        }
        setGameState('START');
        setTracking(false);
        setScore(0);
        setLives(3);
    };

    return (
        <div id="game-container">
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
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '15px', alignItems: 'center' }}>
                            <MagneticButton onClick={activateCam}>{t('activateCam', lang)} <PlayIcon /></MagneticButton>
                            <MagneticButton onClick={() => setGameState('GUIDE')} secondary>{t('howToPlay', lang)} <HelpIcon /></MagneticButton>
                            <MagneticButton onClick={() => setGameState('ABOUT')} secondary>{t('about', lang)}</MagneticButton>
                        </div>
                    )}
                </div>

                {/* Guide */}
                {gameState === 'GUIDE' && <GuideModal onClose={() => setGameState('START')} lang={lang} />}

                {/* About */}
                {gameState === 'ABOUT' && <AboutModal onClose={() => setGameState('START')} lang={lang} />}

                {/* Game Over */}
                <div id="game-over-screen" className={`modal ${gameState === 'GAMEOVER' ? '' : 'hidden'}`}>
                    <h1 style={{ whiteSpace: 'pre-line' }}>{t('gameOver', lang)}</h1>
                    <p>
                        {t('finalScore', lang)}: <span style={{ color: 'var(--text-color)', fontSize: '1.5rem' }}>{score}</span>
                        {score > highScore && <span style={{ color: 'var(--accent-color)', display: 'block', marginTop: '0.5rem' }}>{t('newHighScore', lang)}</span>}
                    </p>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '15px', alignItems: 'center' }}>
                        <MagneticButton onClick={restartGame}>{t('tryAgain', lang)} <RestartIcon /></MagneticButton>
                        <MagneticButton onClick={turnOffCamera} secondary>{t('turnOffCamera', lang)} <CameraOffIcon /></MagneticButton>
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
            </div>

            {/* Loader */}
            <div id="loader" style={{ display: gameState === 'LOADING' ? 'block' : 'none' }}>
                <div className="spinner"></div>
                <div style={{ fontWeight: 700, letterSpacing: 1, marginTop: 10 }}>{t('loadingEngine', lang)}</div>
            </div>

            {/* DEBUG CONSOLE - Bottom Right */}
            <div style={{
                position: 'absolute', bottom: 50, right: 10,
                background: 'rgba(0,0,0,0.7)', color: '#0f0',
                fontSize: '10px', fontFamily: 'monospace',
                padding: '5px', pointerEvents: 'none', zIndex: 9999,
                maxWidth: '200px', display: 'flex', flexDirection: 'column'
            }}>
                {debugLogs.map((l, i) => <span key={i}>{l}</span>)}
            </div>
        </div>
    );
};
