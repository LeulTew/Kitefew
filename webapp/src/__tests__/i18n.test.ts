import { describe, it, expect } from 'vitest';
import { t, translations } from '../i18n';

describe('i18n', () => {
    it('should translate to English', () => {
        expect(t('title', 'en')).toContain('Bold');
    });

    it('should translate to Amharic', () => {
        expect(t('title', 'am')).toBe('ክተፈው።');
    });

    it('should fallback to English if key missing in Amharic', () => {
        expect(t('title')).toContain('Bold');
    });

    it('should return the key if translation is missing in both languages', () => {
        // @ts-expect-error - testing invalid key
        expect(t('non_existent_key')).toBe('non_existent_key');
    });

    it('should fallback to English if language is missing', () => {
        // @ts-expect-error - testing invalid language
        expect(t('title', 'fr')).toBe(translations.en.title);
    });
});
