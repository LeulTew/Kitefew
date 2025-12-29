import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GameEngine } from '../GameEngine';
import { Fruit, Particle, Sparkle } from '../Entities';
import type { HandData, FruitType } from '../GameTypes';

describe('GameEngine', () => {
    let engine: GameEngine;
    const mockOnScoreUpdate = vi.fn();
    const mockOnLivesUpdate = vi.fn();
    const mockOnGameOver = vi.fn();
    const mockOnSplash = vi.fn();
    const mockOnStreakUpdate = vi.fn();

    const createMockCtx = () => ({
        clearRect: vi.fn(),
        save: vi.fn(),
        restore: vi.fn(),
        translate: vi.fn(),
        rotate: vi.fn(),
        beginPath: vi.fn(),
        arc: vi.fn(),
        fill: vi.fn(),
        stroke: vi.fn(),
        moveTo: vi.fn(),
        lineTo: vi.fn(),
        quadraticCurveTo: vi.fn(),
        ellipse: vi.fn(),
        createRadialGradient: vi.fn(() => ({
            addColorStop: vi.fn(),
        })),
        drawImage: vi.fn(),
        fillText: vi.fn(),
        measureText: vi.fn(() => ({ width: 50 })),
        roundRect: vi.fn(),
        bezierCurveTo: vi.fn(),
        shadowBlur: 0,
        shadowColor: '',
        globalAlpha: 1,
        lineWidth: 1,
        strokeStyle: '',
        fillStyle: '',
        lineCap: 'round',
        lineJoin: 'round',
        font: '',
        textAlign: 'center',
        textBaseline: 'middle',
    } as unknown as CanvasRenderingContext2D);

    beforeEach(() => {
        vi.clearAllMocks();
        engine = new GameEngine(
            mockOnScoreUpdate,
            mockOnLivesUpdate,
            mockOnGameOver,
            mockOnSplash,
            mockOnStreakUpdate
        );
        engine.resize(800, 600);
    });

    it('should initialize with default values', () => {
        expect(engine.score).toBe(0);
        expect(engine.lives).toBe(3);
        expect(engine.gameActive).toBe(false);
    });

    it('should start the game correctly', () => {
        engine.startGame();
        expect(engine.gameActive).toBe(true);
        expect(engine.score).toBe(0);
        expect(engine.lives).toBe(3);
        expect(mockOnScoreUpdate).toHaveBeenCalledWith(0);
        expect(mockOnLivesUpdate).toHaveBeenCalledWith(3);
        expect(mockOnStreakUpdate).toHaveBeenCalledWith(0, 1);
    });

    it('should update hand data', () => {
        const handData: HandData = { x: 100, y: 200, visible: true };
        engine.updateHand(handData);
        expect(engine.rawHand).toEqual(handData);
    });

    it('should handle game over when lives reach zero', () => {
        engine.startGame();
        // Accessing private methods for testing
        (engine as unknown as { loseLife: () => void }).loseLife();
        (engine as unknown as { loseLife: () => void }).loseLife();
        (engine as unknown as { loseLife: () => void }).loseLife();
        
        expect(engine.gameActive).toBe(false);
        expect(mockOnGameOver).toHaveBeenCalled();
    });

    it('should handle bomb slice as game over', () => {
        engine.startGame();
        const bomb = new Fruit(800, 600, 'bomb');
        bomb.x = 100;
        bomb.y = 100;
        (engine as unknown as { handleSlice: (f: Fruit) => void }).handleSlice(bomb);
        
        expect(engine.gameActive).toBe(false);
        expect(mockOnGameOver).toHaveBeenCalled();
    });

    it('should increase score and streak on fruit slice', () => {
        engine.startGame();
        const fruit = new Fruit(800, 600, 'apple');
        fruit.x = 100;
        fruit.y = 100;
        (engine as unknown as { handleSlice: (f: Fruit) => void }).handleSlice(fruit);
        
        expect(engine.score).toBeGreaterThan(0);
        expect(engine.streak).toBe(1);
        expect(mockOnScoreUpdate).toHaveBeenCalled();
        expect(mockOnStreakUpdate).toHaveBeenCalledWith(1, 1);
    });

    it('should handle heart slice as healing', () => {
        engine.startGame();
        (engine as unknown as { loseLife: () => void }).loseLife(); // lives = 2
        expect(engine.lives).toBe(2);
        
        const heart = new Fruit(800, 600, 'heart');
        heart.x = 100;
        heart.y = 100;
        (engine as unknown as { handleSlice: (f: Fruit) => void }).handleSlice(heart);
        
        expect(engine.lives).toBe(3);
        expect(mockOnLivesUpdate).toHaveBeenCalledWith(3);

        // Test bonus points at max health
        engine.lives = 5;
        (engine as unknown as { handleSlice: (f: Fruit) => void }).handleSlice(heart);
        expect(engine.score).toBeGreaterThan(0);
    });

    it('should draw blade and smooth hand', () => {
        engine.startGame();
        engine.updateHand({ x: 100, y: 100, visible: true });
        const mockCtx = createMockCtx();
        
        // First loop to add point
        engine.loop(mockCtx, 1);
        
        // Second loop to draw segment
        engine.updateHand({ x: 200, y: 200, visible: true });
        engine.loop(mockCtx, 1);
        
        expect(mockCtx.stroke).toHaveBeenCalled();
        expect(engine.bladeTrail.length).toBeGreaterThan(1);
    });

    it('should break streak when breakStreak is called', () => {
        engine.startGame();
        engine.streak = 10;
        (engine as unknown as { breakStreak: () => void }).breakStreak();
        expect(engine.streak).toBe(0);
        expect(mockOnStreakUpdate).toHaveBeenCalledWith(0, 1);
    });

    it('should handle combo bonuses', () => {
        engine.startGame();
        const fruit1 = new Fruit(800, 600, 'apple');
        const fruit2 = new Fruit(800, 600, 'orange');
        const fruit3 = new Fruit(800, 600, 'kiwi');
        const fruit4 = new Fruit(800, 600, 'lemon');
        
        // Double
        (engine as unknown as { handleSlice: (f: Fruit) => void }).handleSlice(fruit1);
        (engine as unknown as { handleSlice: (f: Fruit) => void }).handleSlice(fruit2);
        expect(engine.comboCount).toBe(2);
        expect(mockOnSplash).toHaveBeenCalledWith(expect.any(Number), expect.any(Number), expect.stringContaining('DOUBLE'));

        // Triple
        (engine as unknown as { handleSlice: (f: Fruit) => void }).handleSlice(fruit3);
        expect(engine.comboCount).toBe(3);
        expect(mockOnSplash).toHaveBeenCalledWith(expect.any(Number), expect.any(Number), expect.stringContaining('TRIPLE'));

        // Mega
        (engine as unknown as { handleSlice: (f: Fruit) => void }).handleSlice(fruit4);
        expect(engine.comboCount).toBe(4);
        expect(mockOnSplash).toHaveBeenCalledWith(expect.any(Number), expect.any(Number), expect.stringContaining('MEGA'));
    });

    it('should handle streak thresholds', () => {
        engine.startGame();
        engine.streak = 4;
        const fruit = new Fruit(800, 600, 'apple');
        (engine as unknown as { handleSlice: (f: Fruit) => void }).handleSlice(fruit);
        expect(engine.multiplier).toBe(2);

        engine.streak = 9;
        (engine as unknown as { handleSlice: (f: Fruit) => void }).handleSlice(fruit);
        expect(engine.multiplier).toBe(3);

        engine.streak = 19;
        (engine as unknown as { handleSlice: (f: Fruit) => void }).handleSlice(fruit);
        expect(engine.multiplier).toBe(5);
    });

    it('should update particles and sparkles in loop', () => {
        engine.startGame();
        const fruit = new Fruit(800, 600, 'apple');
        (engine as unknown as { handleSlice: (f: Fruit) => void }).handleSlice(fruit);
        
        const mockCtx = createMockCtx();
        engine.loop(mockCtx, 1);
        expect(engine.particles.length).toBeGreaterThan(0);
        
        // Force particles to die
        engine.particles.forEach(p => p.life = 0);
        engine.loop(mockCtx, 1);
        expect(engine.particles.length).toBe(0);
    });

    it('should handle different splash types', () => {
        engine.startGame();
        const types: FruitType[] = ['bomb', 'heart', 'apple', 'orange', 'watermelon', 'kiwi', 'lemon'];
        types.forEach(type => {
            (engine as unknown as { createSplash: (x: number, y: number, type: string) => void }).createSplash(100, 100, type);
        });
        expect(engine.particles.length).toBeGreaterThan(0);
    });

    it('should break streak on missed fruit', () => {
        engine.startGame();
        engine.streak = 10;
        
        const fruit = new Fruit(800, 600, 'apple');
        fruit.x = 100;
        fruit.y = 750; // Below screen
        fruit.vy = 10; // Falling
        fruit.active = true;
        engine.fruits.push(fruit);
        
        const mockCtx = createMockCtx();
        engine.loop(mockCtx, 1);
        
        expect(engine.streak).toBe(0);
    });

    it('should spawn fruits over time', () => {
        engine.startGame();
        const mockCtx = createMockCtx();
        
        engine.loop(mockCtx, 1000); // Large dt to trigger spawn
        expect(engine.fruits.length).toBeGreaterThan(0);
    });

    it('should handle double fruit spawn', () => {
        engine.startGame();
        // Force double fruit chance
        vi.spyOn(Math, 'random').mockReturnValue(0.01); 
        
        const mockCtx = createMockCtx();
        
        engine.loop(mockCtx, 1000);
        expect(engine.fruits.length).toBeGreaterThanOrEqual(2);
        vi.restoreAllMocks();
    });

    it('should handle collision and slicing in loop', () => {
        engine.startGame();
        const fruit = new Fruit(800, 600, 'apple');
        fruit.active = true;
        engine.fruits.push(fruit);

        // 1. Move hand to (0,0) and stabilize
        engine.updateHand({ x: 0, y: 0, visible: true });
        const mockCtx = createMockCtx();
        for (let i = 0; i < 10; i++) engine.loop(mockCtx, 1);

        // 2. Move hand to (100,100)
        engine.updateHand({ x: 100, y: 100, visible: true });

        // 3. Run loops until sliced, keeping fruit at (100,100)
        for (let i = 0; i < 10; i++) {
            fruit.x = 100;
            fruit.y = 100;
            engine.loop(mockCtx, 1);
            if (fruit.sliced) break;
        }

        expect(fruit.sliced).toBe(true);
    });

    it('should handle heart slice at max lives', () => {
        engine.startGame();
        engine.lives = 5; // Max lives
        const fruit = new Fruit(800, 600, 'heart');
        (engine as unknown as { handleSlice: (f: Fruit) => void }).handleSlice(fruit);
        expect(engine.lives).toBe(5);
        expect(engine.score).toBe(5); // Bonus points
    });

    it('should handle combo bonuses for triple and quad', () => {
        engine.startGame();
        const fruit1 = new Fruit(800, 600, 'apple');
        const fruit2 = new Fruit(800, 600, 'apple');
        const fruit3 = new Fruit(800, 600, 'apple');
        const fruit4 = new Fruit(800, 600, 'apple');

        const handleSlice = (engine as unknown as { handleSlice: (f: Fruit) => void }).handleSlice.bind(engine);
        
        handleSlice(fruit1);
        handleSlice(fruit2);
        expect(engine.score).toBe(1 + 1 + 5); // 2 fruits + double bonus (5)

        handleSlice(fruit3);
        expect(engine.score).toBe(2 + 5 + 1 + 15); // previous + 1 fruit + triple bonus (15)

        handleSlice(fruit4);
        expect(engine.score).toBe(3 + 5 + 15 + 1 + 30); // previous + 1 fruit + quad bonus (30)
    });

    it('should handle streak multipliers', () => {
        engine.startGame();
        engine.streak = 4;
        const fruit = new Fruit(800, 600, 'apple');
        (engine as unknown as { handleSlice: (f: Fruit) => void }).handleSlice(fruit);
        expect(engine.multiplier).toBe(2); // Reached 5 streak

        engine.streak = 9;
        (engine as unknown as { handleSlice: (f: Fruit) => void }).handleSlice(fruit);
        expect(engine.multiplier).toBe(3); // Reached 10 streak

        engine.streak = 19;
        (engine as unknown as { handleSlice: (f: Fruit) => void }).handleSlice(fruit);
        expect(engine.multiplier).toBe(5); // Reached 20 streak
    });

    it('should remove dead particles and sparkles', () => {
        engine.startGame();
        const p = new Particle(100, 100, '#fff');
        p.life = 0;
        engine.particles.push(p);
        
        const s = new Sparkle(100, 100);
        s.life = 0;
        engine.sparkles.push(s);

        engine.loop(createMockCtx(), 1);
        expect(engine.particles.length).toBe(0);
        expect(engine.sparkles.length).toBe(0);
    });

    it('should handle bomb splash color', () => {
        engine.startGame();
        (engine as unknown as { createSplash: (x: number, y: number, type: string) => void }).createSplash(100, 100, 'bomb');
        expect(engine.particles.length).toBeGreaterThan(0);
        expect(engine.particles[0].color).toBe('#ff2a55');
    });

    it('should use default onStreakUpdate if not provided', () => {
        const engine2 = new GameEngine(mockOnScoreUpdate, mockOnLivesUpdate, mockOnGameOver, mockOnSplash);
        engine2.startGame();
        const fruit = new Fruit(800, 600, 'apple');
        (engine2 as unknown as { handleSlice: (f: Fruit) => void }).handleSlice(fruit);
        expect(engine2.streak).toBe(1);
    });
});
