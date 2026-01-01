import React, { useState } from 'react';
import type { Language } from '../i18n';
import { t as translate } from '../i18n';

interface WelcomeModalProps {
    lang: Language;
    onComplete: (name: string) => void;
}

/**
 * Welcome modal shown on first app launch when no player name is saved.
 * Asks user for their name before they can play.
 */
export const WelcomeModal: React.FC<WelcomeModalProps> = ({ lang, onComplete }) => {
    const [name, setName] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleSubmit = async () => {
        const trimmedName = name.trim().toUpperCase();
        if (!trimmedName || isSubmitting) return;

        setIsSubmitting(true);
        // Parent component will handle persistence
        onComplete(trimmedName);
    };

    const handleKeyPress = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') {
            handleSubmit();
        }
    };

    const t = (key: Parameters<typeof translate>[0]) => translate(key, lang);

    return (
        <div className="modal-overlay" style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0, 0, 0, 0.9)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 200
        }}>
            <div className="modal" style={{
                maxWidth: '450px',
                padding: '3rem 2rem',
                textAlign: 'center'
            }}>
                {/* Welcome Title */}
                <h1 style={{
                    fontSize: '2.5rem',
                    marginBottom: '0.5rem',
                    background: 'linear-gradient(135deg, var(--accent-color), #FFD700)',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                    backgroundClip: 'text'
                }}>
                    {lang === 'en' ? 'WELCOME!' : 'እንኳን ደህና መጡ!'}
                </h1>

                {/* Game Title */}
                <h2 style={{
                    fontSize: '3.5rem',
                    marginBottom: '1.5rem',
                    fontFamily: 'var(--font-heading)',
                    letterSpacing: '2px'
                }}>
                    {t('title')}
                </h2>

                {/* Subtitle */}
                <p style={{
                    color: 'var(--text-muted)',
                    marginBottom: '2rem',
                    fontSize: '1.1rem'
                }}>
                    {lang === 'en'
                        ? 'Enter your name to get started'
                        : 'ለመጀመር ስምዎን ያስገቡ'}
                </p>

                {/* Name Input */}
                <div style={{ marginBottom: '2rem' }}>
                    <input
                        type="text"
                        placeholder={lang === 'en' ? 'YOUR NAME' : 'ስምዎ'}
                        value={name}
                        onChange={(e) => setName(e.target.value.toUpperCase())}
                        onKeyPress={handleKeyPress}
                        style={{
                            background: 'var(--bg-secondary)',
                            border: '2px solid var(--border-color)',
                            color: 'var(--text-color)',
                            padding: '1rem 1.5rem',
                            width: '100%',
                            textAlign: 'center',
                            fontSize: '1.5rem',
                            fontFamily: 'var(--font-heading)',
                            outline: 'none',
                            borderRadius: '8px',
                            transition: 'border-color 0.2s'
                        }}
                        autoFocus
                        maxLength={15}
                        disabled={isSubmitting}
                    />
                </div>

                {/* Start Button */}
                <button
                    onClick={handleSubmit}
                    disabled={!name.trim() || isSubmitting}
                    style={{
                        background: name.trim()
                            ? 'linear-gradient(135deg, var(--accent-color), #b8e600)'
                            : 'var(--bg-secondary)',
                        border: 'none',
                        color: name.trim() ? 'var(--bg-primary)' : 'var(--text-muted)',
                        padding: '1rem 3rem',
                        fontSize: '1.3rem',
                        fontFamily: 'var(--font-heading)',
                        fontWeight: 'bold',
                        borderRadius: '8px',
                        cursor: name.trim() && !isSubmitting ? 'pointer' : 'not-allowed',
                        transition: 'all 0.3s',
                        boxShadow: name.trim() ? '0 0 20px rgba(204, 255, 0, 0.3)' : 'none'
                    }}
                >
                    {isSubmitting
                        ? (lang === 'en' ? 'STARTING...' : 'በመጀመር ላይ...')
                        : (lang === 'en' ? "LET'S GO!" : 'እንጀምር!')}
                </button>
            </div>
        </div>
    );
};
