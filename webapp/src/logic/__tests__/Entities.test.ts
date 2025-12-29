import { describe, it, expect, vi } from 'vitest';
import { Particle, Sparkle, Fruit, spawnDoubleFruit } from '../Entities';
import type { FruitType } from '../GameTypes';

describe('Entities', () => {
    const createMockCtx = () => ({
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
        bezierCurveTo: vi.fn(),
        createRadialGradient: vi.fn(() => ({
            addColorStop: vi.fn(),
        })),
        roundRect: vi.fn(),
        fillText: vi.fn(),
        measureText: vi.fn(() => ({ width: 50 })),
        shadowBlur: 0,
        shadowColor: '',
        globalAlpha: 1,
        lineWidth: 1,
        strokeStyle: '',
        fillStyle: '',
        font: '',
        textAlign: 'center',
        textBaseline: 'middle',
    } as unknown as CanvasRenderingContext2D);

    describe('Particle', () => {
        it('should update and decay', () => {
            const p = new Particle(100, 100, '#ff0000');
            const initialLife = p.life;
            p.update(); // Test default dt
            expect(p.life).toBeLessThan(initialLife);
        });

        it('should draw when alive', () => {
            const p = new Particle(100, 100, '#ff0000', true);
            const ctx = createMockCtx();
            p.draw(ctx);
            expect(ctx.fill).toHaveBeenCalled();
        });

        it('should not draw when dead', () => {
            const p = new Particle(100, 100, '#ff0000');
            p.life = 0;
            const ctx = createMockCtx();
            p.draw(ctx);
            expect(ctx.fill).not.toHaveBeenCalled();
        });
    });

    describe('Sparkle', () => {
        it('should update and decay', () => {
            const s = new Sparkle(100, 100);
            const initialLife = s.life;
            s.update(); // Test default dt
            expect(s.life).toBeLessThan(initialLife);
        });

        it('should draw when alive', () => {
            const s = new Sparkle(100, 100);
            const ctx = createMockCtx();
            s.draw(ctx);
            expect(ctx.fill).toHaveBeenCalled();
        });

        it('should not draw when dead', () => {
            const s = new Sparkle(100, 100);
            s.life = 0;
            const ctx = createMockCtx();
            s.draw(ctx);
            expect(ctx.fill).not.toHaveBeenCalled();
        });
    });

    describe('Fruit', () => {
        it('should update and deactivate when out of bounds', () => {
            const f = new Fruit(800, 600, 'apple');
            f.y = 750; // fieldHeight + 150
            f.vy = 10; // Moving down
            f.update(600, 1);
            expect(f.active).toBe(false);
        });

        it('should draw different types', () => {
            const types: FruitType[] = ['apple', 'bomb', 'heart', 'orange', 'watermelon', 'kiwi', 'lemon'];
            types.forEach(type => {
                const f = new Fruit(800, 600, type);
                const ctx = createMockCtx();
                f.draw(ctx);
                expect(ctx.restore).toHaveBeenCalled();
            });
        });

        it('should draw double fruit indicator', () => {
            const f = new Fruit(800, 600, 'apple');
            f.isDoubleFruit = true;
            const ctx = createMockCtx();
            f.draw(ctx);
            expect(ctx.fillText).toHaveBeenCalledWith('2', expect.any(Number), expect.any(Number));
        });

        it('should determine random type', () => {
            const f = new Fruit(800, 600);
            expect(f.type).toBeDefined();
        });
    });

    describe('spawnDoubleFruit', () => {
        it('should spawn two fruits', () => {
            const fruits = spawnDoubleFruit(800, 600);
            expect(fruits.length).toBe(2);
            expect(fruits[0].isDoubleFruit).toBe(true);
            expect(fruits[1].isDoubleFruit).toBe(true);
        });
    });
});
