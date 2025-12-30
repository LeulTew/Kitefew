import { CONFIG, type HandData, type Point, type BladePoint } from './GameTypes';
import { Fruit, Particle, Sparkle, spawnDoubleFruit } from './Entities';
import { StrokeRenderer } from './StrokeRenderer';
import type { StrokeId } from './StrokeTypes';

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
    bladeTrail: BladePoint[] = [];

    // Stroke Rendering
    private strokeRenderer: StrokeRenderer = new StrokeRenderer();

    // Hand Tracking
    rawHand: HandData = { x: -100, y: -100, visible: false };
    smoothedHand: Point = { x: -100, y: -100 };

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

    private lerp(start: number, end: number, amt: number) {
        return (1 - amt) * start + amt * end;
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

        // 1. Hand Smoothing - scale with dt
        if (this.rawHand.visible) {
            const factor = 1 - Math.pow(1 - CONFIG.smoothingFactor, dt);
            this.smoothedHand.x = this.lerp(this.smoothedHand.x, this.rawHand.x, factor);
            this.smoothedHand.y = this.lerp(this.smoothedHand.y, this.rawHand.y, factor);
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

            // Collision Detection
            if (!f.sliced && f.active && this.rawHand.visible) {
                const dx = this.smoothedHand.x - f.x;
                const dy = this.smoothedHand.y - f.y;
                const dist = Math.sqrt(dx * dx + dy * dy);

                if (dist < f.radius + CONFIG.hitboxPadding) {
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
