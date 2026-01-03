import { CONFIG, type HandData, type Point, type BladePoint } from './GameTypes';
import { Fruit, Particle, Sparkle, spawnDoubleFruit } from './Entities';
import { StrokeRenderer } from './StrokeRenderer';
import type { StrokeId } from './StrokeTypes';

/**
 * One Euro Filter - Industry standard for responsive, low-latency smoothing
 * https://cristal.univ-lille.fr/~casiez/1euro/
 */
class OneEuroFilter {
    private minCutoff: number;
    private beta: number;
    private dCutoff: number;
    private xPrev: number = 0;
    private dxPrev: number = 0;
    private tPrev: number = 0;
    private initialized: boolean = false;

    constructor(minCutoff: number = 1.0, beta: number = 0.007, dCutoff: number = 1.0) {
        this.minCutoff = minCutoff;
        this.beta = beta;
        this.dCutoff = dCutoff;
    }

    private alpha(cutoff: number, dt: number): number {
        const tau = 1.0 / (2 * Math.PI * cutoff);
        return 1.0 / (1.0 + tau / dt);
    }

    filter(x: number, timestamp: number): number {
        if (!this.initialized) {
            this.xPrev = x;
            this.dxPrev = 0;
            this.tPrev = timestamp;
            this.initialized = true;
            return x;
        }

        const dt = Math.max((timestamp - this.tPrev) / 1000, 0.001); // seconds
        this.tPrev = timestamp;

        // Estimate derivative (velocity)
        const dx = (x - this.xPrev) / dt;
        const edx = this.alpha(this.dCutoff, dt) * dx + (1 - this.alpha(this.dCutoff, dt)) * this.dxPrev;
        this.dxPrev = edx;

        // Adaptive cutoff: higher speed = higher cutoff = less smoothing
        const cutoff = this.minCutoff + this.beta * Math.abs(edx);

        // Apply filter
        const result = this.alpha(cutoff, dt) * x + (1 - this.alpha(cutoff, dt)) * this.xPrev;
        this.xPrev = result;

        return result;
    }

    reset() {
        this.initialized = false;
    }
}

export class GameEngine {
    width: number = 0;
    height: number = 0;
    score: number = 0;
    lives: number = 3;
    maxLives: number = 5; // Can gain up to 5 hearts
    gameActive: boolean = false;

    fruits: Fruit[] = [];
    particles: Particle[] = [];
    sparkles: Sparkle[] = [];
    bladeTrail: BladePoint[] = []

    // Stroke Rendering
    private strokeRenderer: StrokeRenderer = new StrokeRenderer();

    // Hand Tracking with 1€ Filters
    rawHand: HandData = { x: -100, y: -100, visible: false };
    smoothedHand: Point = { x: -100, y: -100 };
    private filterX: OneEuroFilter = new OneEuroFilter(1.5, 0.01, 1.0);
    private filterY: OneEuroFilter = new OneEuroFilter(1.5, 0.01, 1.0);

    // Streak & Combo System
    streak: number = 0;
    multiplier: number = 1;
    lastSliceTime: number = 0;
    comboCount: number = 0;
    comboTimer: number | null = null;

    // Callbacks
    onScoreUpdate: (score: number) => void;
    onLivesUpdate: (lives: number) => void;
    onGameOver: (finalScore: number) => void;
    onSplash: (x: number, y: number, text: string) => void;
    onStreakUpdate: (streak: number, multiplier: number) => void;

    private spawnTimer: number = 0;

    constructor(
        onScoreUpdate: (score: number) => void,
        onLivesUpdate: (lives: number) => void,
        onGameOver: (finalScore: number) => void,
        onSplash: (x: number, y: number, text: string) => void,
        onStreakUpdate?: (streak: number, multiplier: number) => void
    ) {
        this.onScoreUpdate = onScoreUpdate;
        this.onLivesUpdate = onLivesUpdate;
        this.onGameOver = onGameOver;
        this.onSplash = onSplash;
        this.onStreakUpdate = onStreakUpdate || (() => { });
    }

    resize(w: number, h: number) {
        this.width = w;
        this.height = h;
    }

    startGame() {
        this.score = 0;
        this.lives = 3;
        this.streak = 0;
        this.multiplier = 1;
        this.comboCount = 0;
        this.fruits = [];
        this.particles = [];
        this.sparkles = [];
        this.bladeTrail = [];
        this.gameActive = true;
        this.spawnTimer = 0;
        this.smoothedHand = { x: this.width / 2, y: this.height / 2 };

        this.onScoreUpdate(this.score);
        this.onLivesUpdate(this.lives);
        this.onStreakUpdate(this.streak, this.multiplier);
    }

    updateHand(hand: HandData) {
        this.rawHand = hand;
    }

    setStroke(strokeId: StrokeId) {
        this.strokeRenderer.setStroke(strokeId);
    }



    /**
     * Calculate shortest distance from point (px, py) to line segment (v to w)
     */
    private distToSegment(px: number, py: number, vx: number, vy: number, wx: number, wy: number): number {
        const l2 = (wx - vx) * (wx - vx) + (wy - vy) * (wy - vy);
        if (l2 === 0) return Math.hypot(px - vx, py - vy); // v == w

        // Project point onto segment, clamped to [0, 1]
        let t = ((px - vx) * (wx - vx) + (py - vy) * (wy - vy)) / l2;
        t = Math.max(0, Math.min(1, t));

        // Find closest point on segment
        const projX = vx + t * (wx - vx);
        const projY = vy + t * (wy - vy);

        return Math.hypot(px - projX, py - projY);
    }

    private calculateMultiplier(): number {
        for (let i = CONFIG.streakThresholds.length - 1; i >= 0; i--) {
            if (this.streak >= CONFIG.streakThresholds[i].streak) {
                return CONFIG.streakThresholds[i].multiplier;
            }
        }
        return 1;
    }

    loop(ctx: CanvasRenderingContext2D, dt: number = 1.0) {
        if (!this.gameActive) return;

        ctx.clearRect(0, 0, this.width, this.height);

        // 1. One Euro Filter smoothing - industry standard for responsive tracking
        if (this.rawHand.visible) {
            const now = performance.now();
            this.smoothedHand.x = this.filterX.filter(this.rawHand.x, now);
            this.smoothedHand.y = this.filterY.filter(this.rawHand.y, now);
        }

        // 2. Enhanced Blade Trail
        this.drawBlade(ctx, dt);

        // 3. Spawning
        this.handleSpawning(dt);

        // 4. Update & Draw Fruits
        this.updateFruits(ctx, dt);

        // 5. Particles & Sparkles
        this.updateParticles(ctx, dt);
    }

    private drawBlade(ctx: CanvasRenderingContext2D, dt: number) {
        const now = Date.now();

        if (this.rawHand.visible) {
            this.bladeTrail.push({ x: this.smoothedHand.x, y: this.smoothedHand.y, time: now });

            // Spawn sparkles for classic stroke (other strokes handle their own particles)
            const currentStroke = this.strokeRenderer.getCurrentStroke();
            if (currentStroke.particleType === 'sparkle' && Math.random() < 0.3 * dt) {
                this.sparkles.push(new Sparkle(this.smoothedHand.x, this.smoothedHand.y));
            }
        }

        // Remove old points (older than 300ms)
        this.bladeTrail = this.bladeTrail.filter(p => now - p.time < 300);

        // Use StrokeRenderer for all stroke rendering
        this.strokeRenderer.render(
            ctx,
            this.bladeTrail,
            this.rawHand.visible,
            this.smoothedHand,
            dt
        );
    }

    private handleSpawning(dt: number) {
        // Convert spawnRate (frames at 60fps) to time-based spawning
        // 1 unit of dt approx 16.67ms
        this.spawnTimer += dt;
        const currentRate = Math.max(40, CONFIG.spawnRate - Math.floor(this.score / 5));

        if (this.spawnTimer >= currentRate) {
            this.spawnTimer = 0;
            // Check for double fruit spawn
            if (Math.random() < CONFIG.doubleFruitChance) {
                const doubleFruits = spawnDoubleFruit(this.width, this.height);
                this.fruits.push(...doubleFruits);
            } else {
                this.fruits.push(new Fruit(this.width, this.height));
            }
        }
    }

    private updateFruits(ctx: CanvasRenderingContext2D, dt: number) {
        for (let i = this.fruits.length - 1; i >= 0; i--) {
            const f = this.fruits[i];
            f.update(this.height, dt);
            f.draw(ctx);

            // Missed fruit
            if (!f.active) {
                if (!f.sliced && f.type !== 'bomb' && f.type !== 'heart' && this.gameActive) {
                    this.breakStreak();
                    this.loseLife();
                }
                this.fruits.splice(i, 1);
                continue;
            }

            // Collision Detection with segment-based trailing hitbox
            if (!f.sliced && f.active && this.rawHand.visible) {
                let sliced = false;
                const hitRadius = f.radius + CONFIG.hitboxPadding;

                // Check collision with current tip
                const tipDist = Math.hypot(this.smoothedHand.x - f.x, this.smoothedHand.y - f.y);
                if (tipDist < hitRadius) {
                    sliced = true;
                }

                // Check collision with trailing segment (line from tip to previous points)
                // This only extends BEHIND the tip, not forward
                if (!sliced && this.bladeTrail.length >= 2) {
                    const tip = this.smoothedHand;
                    // Check segment from tip to 1st previous point
                    const prev1 = this.bladeTrail[this.bladeTrail.length - 2];
                    const segDist1 = this.distToSegment(f.x, f.y, tip.x, tip.y, prev1.x, prev1.y);
                    if (segDist1 < hitRadius * 0.85) {
                        sliced = true;
                    }

                    // Check segment from 1st to 2nd previous point (extends further back)
                    if (!sliced && this.bladeTrail.length >= 3) {
                        const prev2 = this.bladeTrail[this.bladeTrail.length - 3];
                        const segDist2 = this.distToSegment(f.x, f.y, prev1.x, prev1.y, prev2.x, prev2.y);
                        if (segDist2 < hitRadius * 0.7) {
                            sliced = true;
                        }
                    }
                }

                if (sliced) {
                    const prev = this.bladeTrail[this.bladeTrail.length - 2];
                    const moveSpeed = prev ? Math.hypot(this.smoothedHand.x - prev.x, this.smoothedHand.y - prev.y) : 0;

                    if (moveSpeed > 2) {
                        this.handleSlice(f);
                    }
                }
            }
        }
    }

    private handleSlice(f: Fruit) {
        f.sliced = true;
        f.active = false;

        if (f.type === 'bomb') {
            this.createSplash(f.x, f.y, 'bomb');
            this.gameOver();
            return;
        }

        if (f.type === 'heart') {
            // Heal!
            this.createSplash(f.x, f.y, 'heart');
            if (this.lives < this.maxLives) {
                this.lives++;
                this.onLivesUpdate(this.lives);
                this.onSplash(f.x, f.y, "❤️+1");
            } else {
                // Bonus points if at max health
                this.score += 5 * this.multiplier;
                this.onSplash(f.x, f.y, "+5");
            }
            return;
        }

        // Regular fruit
        this.createSplash(f.x, f.y, f.type);

        // Track combo
        const now = Date.now();
        if (now - this.lastSliceTime < CONFIG.comboWindowMs) {
            this.comboCount++;
        } else {
            this.comboCount = 1;
        }
        this.lastSliceTime = now;

        // Calculate points
        let points = 1 * this.multiplier;
        let bonusText = `+${points}`;

        // Double fruit bonus
        if (f.isDoubleFruit) {
            points += 2;
            bonusText = `+${points} 2x`;
        }

        // Combo bonuses
        if (this.comboCount === 2) {
            const bonus = CONFIG.comboBonuses.double;
            points += bonus;
            bonusText = `+${points} DOUBLE!`;
        } else if (this.comboCount === 3) {
            const bonus = CONFIG.comboBonuses.triple;
            points += bonus;
            bonusText = `+${points} TRIPLE!`;
        } else if (this.comboCount >= 4) {
            const bonus = CONFIG.comboBonuses.quad;
            points += bonus;
            bonusText = `+${points} MEGA!`;
        }

        // Update streak
        this.streak++;
        this.multiplier = this.calculateMultiplier();
        this.onStreakUpdate(this.streak, this.multiplier);

        this.score += points;
        this.onScoreUpdate(this.score);
        this.onSplash(f.x, f.y, bonusText);
    }

    private breakStreak() {
        if (this.streak > 0) {
            this.streak = 0;
            this.multiplier = 1;
            this.comboCount = 0;
            this.onStreakUpdate(this.streak, this.multiplier);
        }
    }

    private updateParticles(ctx: CanvasRenderingContext2D, dt: number) {
        // Particles
        for (let i = this.particles.length - 1; i >= 0; i--) {
            const p = this.particles[i];
            p.update(dt);
            p.draw(ctx);
            if (p.life <= 0) this.particles.splice(i, 1);
        }

        // Sparkles
        for (let i = this.sparkles.length - 1; i >= 0; i--) {
            const s = this.sparkles[i];
            s.update(dt);
            s.draw(ctx);
            if (s.life <= 0) this.sparkles.splice(i, 1);
        }
    }

    private loseLife() {
        this.lives--;
        this.onLivesUpdate(this.lives);
        if (this.lives <= 0) {
            this.gameOver();
        }
    }

    private gameOver() {
        this.gameActive = false;
        this.onGameOver(this.score);
    }

    private createSplash(x: number, y: number, type: string) {
        let color = CONFIG.colors.blade;
        let isGlowing = false;

        switch (type) {
            case 'bomb':
                color = '#ff2a55';
                isGlowing = true;
                break;
            case 'heart':
                color = CONFIG.colors.heart;
                isGlowing = true;
                break;
            case 'apple':
                color = '#ff6b6b';
                break;
            case 'orange':
                color = '#ffbe76';
                break;
            case 'watermelon':
                color = '#ff6b6b';
                break;
            case 'kiwi':
                color = '#a5d649';
                break;
            case 'lemon':
                color = '#fff700';
                break;
        }

        // More particles for hearts and bombs
        const count = (type === 'bomb' || type === 'heart') ? 20 : 12;

        for (let i = 0; i < count; i++) {
            this.particles.push(new Particle(x, y, color, isGlowing));
        }
    }
}
