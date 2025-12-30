// Stroke Types and Presets for animated blade trails

export type StrokeId =
    | 'classic'
    | 'starfall'
    | 'fire'
    | 'ice'
    | 'neon'
    | 'shadow'
    | 'rainbow'
    | 'electric'
    | 'cosmic'
    | 'golden';

export type ParticleType = 'sparkle' | 'star' | 'ember' | 'snowflake' | 'lightning' | 'none';
export type TrailFade = 'linear' | 'gravity' | 'burst' | 'wave';

export interface StrokeConfig {
    id: StrokeId;
    name: string;
    nameAm: string; // Amharic name
    colors: {
        blade: string;
        bladeGlow: string;
        bladeCore: string;
        trail: string[];
    };
    hasParticles: boolean;
    particleType: ParticleType;
    trailFade: TrailFade;
    glowIntensity: number; // 0-1 scale
    trailWidth: number; // base trail width multiplier
}

// Dracula theme colors for Star Fall
const DRACULA = {
    purple: '#bd93f9',
    pink: '#ff79c6',
    gold: '#f1fa8c',
    dark: '#282a36',
    cyan: '#8be9fd'
};

export const STROKE_PRESETS: StrokeConfig[] = [
    {
        id: 'classic',
        name: 'Classic',
        nameAm: 'ክላሲክ',
        colors: {
            blade: '#ccff00',
            bladeGlow: 'rgba(204, 255, 0, 0.4)',
            bladeCore: '#ffffff',
            trail: ['#ccff00', '#a8e000', '#88c000']
        },
        hasParticles: true,
        particleType: 'sparkle',
        trailFade: 'linear',
        glowIntensity: 0.7,
        trailWidth: 1.0
    },
    {
        id: 'starfall',
        name: 'Star Fall',
        nameAm: 'ኮከብ ውድቀት',
        colors: {
            blade: DRACULA.purple,
            bladeGlow: 'rgba(189, 147, 249, 0.5)',
            bladeCore: DRACULA.gold,
            trail: [DRACULA.purple, DRACULA.pink, DRACULA.gold]
        },
        hasParticles: true,
        particleType: 'star',
        trailFade: 'gravity',
        glowIntensity: 0.8,
        trailWidth: 1.2
    },
    {
        id: 'fire',
        name: 'Inferno',
        nameAm: 'እሳት',
        colors: {
            blade: '#ff6b35',
            bladeGlow: 'rgba(255, 107, 53, 0.5)',
            bladeCore: '#fff4e0',
            trail: ['#ff6b35', '#ff4500', '#ff0000', '#8b0000']
        },
        hasParticles: true,
        particleType: 'ember',
        trailFade: 'burst',
        glowIntensity: 0.9,
        trailWidth: 1.1
    },
    {
        id: 'ice',
        name: 'Frostbite',
        nameAm: 'በረዶ',
        colors: {
            blade: '#00e5ff',
            bladeGlow: 'rgba(0, 229, 255, 0.4)',
            bladeCore: '#ffffff',
            trail: ['#00e5ff', '#00b8d4', '#0091ea', '#ffffff']
        },
        hasParticles: true,
        particleType: 'snowflake',
        trailFade: 'wave',
        glowIntensity: 0.6,
        trailWidth: 0.9
    },
    {
        id: 'neon',
        name: 'Neon Rush',
        nameAm: 'ኒዮን',
        colors: {
            blade: '#ff00ff',
            bladeGlow: 'rgba(255, 0, 255, 0.5)',
            bladeCore: '#00ffff',
            trail: ['#ff00ff', '#ff00aa', '#00ffff', '#00aaff']
        },
        hasParticles: true,
        particleType: 'sparkle',
        trailFade: 'wave',
        glowIntensity: 1.0,
        trailWidth: 1.3
    },
    {
        id: 'shadow',
        name: 'Shadow',
        nameAm: 'ጥላ',
        colors: {
            blade: '#6a0dad',
            bladeGlow: 'rgba(106, 13, 173, 0.6)',
            bladeCore: '#d4a5ff',
            trail: ['#6a0dad', '#4a0a7a', '#2a0a4a', '#1a0a2a']
        },
        hasParticles: true,
        particleType: 'sparkle',
        trailFade: 'linear',
        glowIntensity: 0.5,
        trailWidth: 1.1
    },
    {
        id: 'rainbow',
        name: 'Prismatic',
        nameAm: 'ቀስተ ደመና',
        colors: {
            blade: '#ff0000', // Will cycle through spectrum
            bladeGlow: 'rgba(255, 255, 255, 0.4)',
            bladeCore: '#ffffff',
            trail: ['#ff0000', '#ff7f00', '#ffff00', '#00ff00', '#0000ff', '#8b00ff']
        },
        hasParticles: true,
        particleType: 'sparkle',
        trailFade: 'linear',
        glowIntensity: 0.8,
        trailWidth: 1.0
    },
    {
        id: 'electric',
        name: 'Thunder',
        nameAm: 'ነጎድጓድ',
        colors: {
            blade: '#ffff00',
            bladeGlow: 'rgba(255, 255, 0, 0.6)',
            bladeCore: '#ffffff',
            trail: ['#ffff00', '#ffee00', '#ffffff', '#00aaff']
        },
        hasParticles: true,
        particleType: 'lightning',
        trailFade: 'burst',
        glowIntensity: 1.0,
        trailWidth: 0.8
    },
    {
        id: 'cosmic',
        name: 'Cosmic',
        nameAm: 'ጠፈር',
        colors: {
            blade: '#1a237e',
            bladeGlow: 'rgba(26, 35, 126, 0.5)',
            bladeCore: '#e8eaf6',
            trail: ['#1a237e', '#3949ab', '#7986cb', '#ffffff']
        },
        hasParticles: true,
        particleType: 'star',
        trailFade: 'linear',
        glowIntensity: 0.7,
        trailWidth: 1.0
    },
    {
        id: 'golden',
        name: 'Luxe',
        nameAm: 'ወርቅ',
        colors: {
            blade: '#ffd700',
            bladeGlow: 'rgba(255, 215, 0, 0.5)',
            bladeCore: '#ffffff',
            trail: ['#ffd700', '#ffb700', '#ff9700', '#cd7f32']
        },
        hasParticles: true,
        particleType: 'sparkle',
        trailFade: 'linear',
        glowIntensity: 0.85,
        trailWidth: 1.0
    }
];

// Helper to get stroke config by id
export function getStrokeConfig(id: StrokeId): StrokeConfig {
    return STROKE_PRESETS.find(s => s.id === id) || STROKE_PRESETS[0];
}
