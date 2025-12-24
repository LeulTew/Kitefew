export const CONFIG = {
    gravity: 0.18,
    spawnRate: 100,
    marginPercent: 0.12,
    fruitRadius: 38,
    bladeLife: 10,
    bombChance: 0.10,      // 10% bomb
    heartChance: 0.05,     // 5% heart (rarer than bomb)
    doubleFruitChance: 0.12, // 12% double fruit spawn
    smoothingFactor: 0.3,
    hitboxPadding: 15,
    comboWindowMs: 500,    // 0.5s window for combo detection
    colors: {
        blade: '#ccff00',
        bladeGlow: 'rgba(204, 255, 0, 0.4)',
        bladeCore: '#ffffff',
        heart: '#ff6b9d',
        heartGlow: 'rgba(255, 107, 157, 0.5)'
    },
    // Streak multipliers
    streakThresholds: [
        { streak: 5, multiplier: 2 },
        { streak: 10, multiplier: 3 },
        { streak: 20, multiplier: 5 }
    ],
    // Combo bonuses
    comboBonuses: {
        double: 5,
        triple: 15,
        quad: 30
    }
};

export type FruitType = 'apple' | 'orange' | 'watermelon' | 'kiwi' | 'lemon' | 'bomb' | 'heart';

export interface Point {
    x: number;
    y: number;
}

export interface HandData {
    x: number;
    y: number;
    visible: boolean;
}

export interface BladePoint extends Point {
    time: number; // For fade effect
}
