// Stroke Renderer - Handles all stroke animation rendering
import { type StrokeId, type StrokeConfig, getStrokeConfig } from './StrokeTypes';
import type { BladePoint } from './GameTypes';

// Star particle for Star Fall stroke
interface StarParticle {
    x: number;
    y: number;
    vx: number;
    vy: number;
    life: number;
    size: number;
    rotation: number;
    rotSpeed: number;
    color: string;
}

// Ember particle for Fire stroke
interface EmberParticle {
    x: number;
    y: number;
    vx: number;
    vy: number;
    life: number;
    size: number;
    color: string;
}

// Snowflake particle for Ice stroke
interface SnowflakeParticle {
    x: number;
    y: number;
    vx: number;
    vy: number;
    life: number;
    size: number;
    rotation: number;
    rotSpeed: number;
}

// Lightning segment for Electric stroke
interface LightningSegment {
    points: { x: number; y: number }[];
    life: number;
    alpha: number;
}

export class StrokeRenderer {
    private currentStroke: StrokeConfig;
    private stars: StarParticle[] = [];
    private embers: EmberParticle[] = [];
    private snowflakes: SnowflakeParticle[] = [];
    private lightning: LightningSegment[] = [];
    private rainbowHue: number = 0;

    constructor() {
        this.currentStroke = getStrokeConfig('classic');
    }

    setStroke(id: StrokeId) {
        this.currentStroke = getStrokeConfig(id);
        // Clear particles when switching strokes
        this.stars = [];
        this.embers = [];
        this.snowflakes = [];
        this.lightning = [];
    }

    getCurrentStroke(): StrokeConfig {
        return this.currentStroke;
    }

    render(
        ctx: CanvasRenderingContext2D,
        bladeTrail: BladePoint[],
        handVisible: boolean,
        smoothedHand: { x: number; y: number },
        dt: number
    ) {
        const strokeId = this.currentStroke.id;

        // Spawn particles based on stroke type
        if (handVisible && bladeTrail.length > 0) {
            this.spawnParticles(smoothedHand.x, smoothedHand.y, dt);
        }

        // Update and render particles first (behind trail)
        this.updateAndRenderParticles(ctx, dt);

        // Render environment ambient glow (spreads to surrounding area)
        if (bladeTrail.length > 1) {
            this.renderEnvironmentEffect(ctx, bladeTrail, strokeId);
        }

        // Render the main blade trail
        if (bladeTrail.length > 1) {
            switch (strokeId) {
                case 'classic':
                    this.renderClassic(ctx, bladeTrail);
                    break;
                case 'starfall':
                    this.renderStarfall(ctx, bladeTrail);
                    break;
                case 'fire':
                    this.renderFire(ctx, bladeTrail);
                    break;
                case 'ice':
                    this.renderIce(ctx, bladeTrail);
                    break;
                case 'neon':
                    this.renderNeon(ctx, bladeTrail);
                    break;
                case 'shadow':
                    this.renderShadow(ctx, bladeTrail);
                    break;
                case 'rainbow':
                    this.renderRainbow(ctx, bladeTrail, dt);
                    break;
                case 'electric':
                    this.renderElectric(ctx, bladeTrail);
                    break;
                case 'cosmic':
                    this.renderCosmic(ctx, bladeTrail);
                    break;
                case 'golden':
                    this.renderGolden(ctx, bladeTrail);
                    break;
                default:
                    this.renderClassic(ctx, bladeTrail);
            }
        }
    }

    // Render ambient environment lighting/glow that spreads to the surrounding area
    private renderEnvironmentEffect(ctx: CanvasRenderingContext2D, trail: BladePoint[], strokeId: StrokeId) {
        const now = Date.now();

        // Sample points along trail for environment effects - Step increased for performance
        for (let i = 0; i < trail.length; i += 6) {
            const age = (now - trail[i].time) / 400;
            if (age > 1) continue;

            const alpha = (1 - age) * 0.15;
            const x = trail[i].x;
            const y = trail[i].y;

            switch (strokeId) {
                case 'neon': {
                    // Neon casts bright magenta/cyan light on surroundings - EXTRA DRAMATIC
                    const pulse = Math.sin(now * 0.006 + i) * 0.3 + 0.7;
                    const glowRad = 120 * pulse;

                    // Large outer glow
                    const gradient2 = ctx.createRadialGradient(x, y, 0, x, y, glowRad);
                    gradient2.addColorStop(0, `rgba(255, 0, 255, ${alpha * 0.6})`);
                    gradient2.addColorStop(0.5, `rgba(0, 255, 255, ${alpha * 0.3})`);
                    gradient2.addColorStop(1, 'rgba(0, 0, 0, 0)');
                    ctx.fillStyle = gradient2;
                    ctx.fillRect(x - glowRad, y - glowRad, glowRad * 2, glowRad * 2);

                    // Intense inner light
                    const gradient = ctx.createRadialGradient(x, y, 0, x, y, glowRad * 0.4);
                    gradient.addColorStop(0, `rgba(255, 255, 255, ${alpha * 0.8})`);
                    gradient.addColorStop(0.5, `rgba(255, 0, 255, ${alpha * 0.5})`);
                    gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');
                    ctx.fillStyle = gradient;
                    ctx.fillRect(x - glowRad * 0.4, y - glowRad * 0.4, glowRad * 0.8, glowRad * 0.8);
                    break;
                }
                case 'fire': {
                    // Fire casts warm orange/red light, flickering - LARGE WARM GLOW
                    const flicker = Math.sin(now * 0.01 + i * 0.5) * 0.2 + 0.8;
                    const glowRad = 100 * flicker;
                    const gradient = ctx.createRadialGradient(x, y, 0, x, y - 30, glowRad);
                    gradient.addColorStop(0, `rgba(255, 120, 0, ${alpha * 0.9})`);
                    gradient.addColorStop(0.3, `rgba(255, 50, 0, ${alpha * 0.5})`);
                    gradient.addColorStop(0.7, `rgba(180, 30, 0, ${alpha * 0.2})`);
                    gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');
                    ctx.fillStyle = gradient;
                    ctx.fillRect(x - glowRad, y - glowRad - 30, glowRad * 2, glowRad * 2);
                    break;
                }
                case 'ice': {
                    // Ice casts cold blue/white light - WIDE FROST AURA
                    const shimmer = Math.sin(now * 0.004 + i * 0.3) * 0.15 + 0.85;
                    const glowRad = 90 * shimmer;
                    const gradient = ctx.createRadialGradient(x, y, 0, x, y, glowRad);
                    gradient.addColorStop(0, `rgba(220, 250, 255, ${alpha * 0.8})`);
                    gradient.addColorStop(0.4, `rgba(100, 220, 255, ${alpha * 0.4})`);
                    gradient.addColorStop(0.8, `rgba(50, 150, 255, ${alpha * 0.1})`);
                    gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');
                    ctx.fillStyle = gradient;
                    ctx.fillRect(x - glowRad, y - glowRad, glowRad * 2, glowRad * 2);
                    break;
                }
                case 'shadow': {
                    // Shadow casts dark purple/black anti-light (darkening effect)
                    const pulse = Math.sin(now * 0.003 + i * 0.4) * 0.1 + 0.9;
                    const gradient = ctx.createRadialGradient(x, y, 0, x, y, 75 * pulse);
                    gradient.addColorStop(0, `rgba(30, 0, 50, ${alpha * 0.6})`);
                    gradient.addColorStop(0.4, `rgba(60, 20, 100, ${alpha * 0.4})`);
                    gradient.addColorStop(0.7, `rgba(20, 5, 30, ${alpha * 0.2})`);
                    gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');
                    ctx.fillStyle = gradient;
                    ctx.fillRect(x - 75, y - 75, 150, 150);
                    break;
                }
                case 'electric': {
                    // Electric casts yellow/blue light with flicker
                    const spark = Math.random() > 0.7 ? 1.5 : 1;
                    const gradient = ctx.createRadialGradient(x, y, 0, x, y, 60 * spark);
                    gradient.addColorStop(0, `rgba(255, 255, 100, ${alpha * 0.7 * spark})`);
                    gradient.addColorStop(0.3, `rgba(100, 200, 255, ${alpha * 0.4})`);
                    gradient.addColorStop(0.6, `rgba(50, 100, 200, ${alpha * 0.2})`);
                    gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');
                    ctx.fillStyle = gradient;
                    ctx.fillRect(x - 60, y - 60, 120, 120);
                    break;
                }
                case 'starfall': {
                    // Starfall casts purple/gold magical light
                    const twinkle = Math.sin(now * 0.005 + i * 0.7) * 0.2 + 0.8;
                    const gradient = ctx.createRadialGradient(x, y, 0, x, y, 55 * twinkle);
                    gradient.addColorStop(0, `rgba(189, 147, 249, ${alpha * 0.5})`);
                    gradient.addColorStop(0.4, `rgba(255, 121, 198, ${alpha * 0.3})`);
                    gradient.addColorStop(0.7, `rgba(241, 250, 140, ${alpha * 0.15})`);
                    gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');
                    ctx.fillStyle = gradient;
                    ctx.fillRect(x - 55, y - 55, 110, 110);
                    break;
                }
                case 'rainbow': {
                    // Rainbow casts cycling colored light
                    const hue = (now * 0.1 + i * 20) % 360;
                    const gradient = ctx.createRadialGradient(x, y, 0, x, y, 60);
                    gradient.addColorStop(0, `hsla(${hue}, 100%, 60%, ${alpha * 0.5})`);
                    gradient.addColorStop(0.5, `hsla(${(hue + 60) % 360}, 100%, 50%, ${alpha * 0.25})`);
                    gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');
                    ctx.fillStyle = gradient;
                    ctx.fillRect(x - 60, y - 60, 120, 120);
                    break;
                }
                case 'cosmic': {
                    // Cosmic casts deep blue starlight
                    const twinkle = Math.sin(now * 0.004 + i) * 0.3 + 0.7;
                    const gradient = ctx.createRadialGradient(x, y, 0, x, y, 50 * twinkle);
                    gradient.addColorStop(0, `rgba(100, 120, 200, ${alpha * 0.4})`);
                    gradient.addColorStop(0.5, `rgba(50, 60, 150, ${alpha * 0.2})`);
                    gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');
                    ctx.fillStyle = gradient;
                    ctx.fillRect(x - 50, y - 50, 100, 100);
                    break;
                }
                case 'golden': {
                    // Golden casts warm luxurious light
                    const shimmer = Math.sin(now * 0.006 + i * 0.5) * 0.2 + 0.8;
                    const gradient = ctx.createRadialGradient(x, y, 0, x, y, 55 * shimmer);
                    gradient.addColorStop(0, `rgba(255, 215, 0, ${alpha * 0.5})`);
                    gradient.addColorStop(0.4, `rgba(255, 180, 50, ${alpha * 0.3})`);
                    gradient.addColorStop(0.7, `rgba(200, 150, 50, ${alpha * 0.15})`);
                    gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');
                    ctx.fillStyle = gradient;
                    ctx.fillRect(x - 55, y - 55, 110, 110);
                    break;
                }
                default:
                    break;
            }
        }
    }

    private spawnParticles(x: number, y: number, dt: number) {
        const spawnChance = 0.3 * dt;

        switch (this.currentStroke.particleType) {
            case 'star':
                if (Math.random() < spawnChance * 1.5) {
                    this.spawnStar(x, y);
                }
                break;
            case 'ember':
                if (Math.random() < spawnChance * 2) {
                    this.spawnEmber(x, y);
                }
                break;
            case 'snowflake':
                if (Math.random() < spawnChance) {
                    this.spawnSnowflake(x, y);
                }
                break;
            case 'lightning':
                if (Math.random() < spawnChance * 0.3) {
                    this.spawnLightning(x, y);
                }
                break;
            case 'sparkle':
            default:
                // Sparkles are handled in GameEngine
                break;
        }
    }

    private spawnStar(x: number, y: number) {
        const colors = this.currentStroke.colors.trail;
        this.stars.push({
            x: x + (Math.random() - 0.5) * 30,
            y: y + (Math.random() - 0.5) * 30,
            vx: (Math.random() - 0.5) * 2,
            vy: -Math.random() * 2, // Start moving up slightly
            life: 1.0,
            size: Math.random() * 8 + 4,
            rotation: Math.random() * Math.PI * 2,
            rotSpeed: (Math.random() - 0.5) * 0.2,
            color: colors[Math.floor(Math.random() * colors.length)]
        });
    }

    private spawnEmber(x: number, y: number) {
        const colors = this.currentStroke.colors.trail;
        this.embers.push({
            x: x + (Math.random() - 0.5) * 20,
            y: y + (Math.random() - 0.5) * 20,
            vx: (Math.random() - 0.5) * 3,
            vy: -Math.random() * 4 - 2, // Rise up
            life: 1.0,
            size: Math.random() * 4 + 2,
            color: colors[Math.floor(Math.random() * colors.length)]
        });
    }

    private spawnSnowflake(x: number, y: number) {
        this.snowflakes.push({
            x: x + (Math.random() - 0.5) * 30,
            y: y + (Math.random() - 0.5) * 30,
            vx: (Math.random() - 0.5) * 1,
            vy: Math.random() * 1 + 0.5, // Drift down slowly
            life: 1.0,
            size: Math.random() * 6 + 3,
            rotation: Math.random() * Math.PI * 2,
            rotSpeed: (Math.random() - 0.5) * 0.1
        });
    }

    private spawnLightning(x: number, y: number) {
        const points: { x: number; y: number }[] = [{ x, y }];
        let currentX = x;
        let currentY = y;
        const segments = Math.floor(Math.random() * 3) + 2;

        for (let i = 0; i < segments; i++) {
            currentX += (Math.random() - 0.5) * 40;
            currentY += (Math.random() - 0.5) * 40;
            points.push({ x: currentX, y: currentY });
        }

        this.lightning.push({
            points,
            life: 1.0,
            alpha: 1.0
        });
    }

    private updateAndRenderParticles(ctx: CanvasRenderingContext2D, dt: number) {
        // Update and render stars with gravity fall
        this.stars = this.stars.filter(star => {
            star.life -= 0.02 * dt;
            // Apply gravity for fall effect
            star.vy += 0.15 * dt; // Gravity
            star.x += star.vx * dt;
            star.y += star.vy * dt;
            star.rotation += star.rotSpeed * dt;

            if (star.life > 0) {
                this.drawStar(ctx, star);
                return true;
            }
            return false;
        });

        // Update and render embers rising
        this.embers = this.embers.filter(ember => {
            ember.life -= 0.025 * dt;
            ember.x += ember.vx * dt;
            ember.y += ember.vy * dt;
            ember.vy *= 0.98; // Slow down

            if (ember.life > 0) {
                this.drawEmber(ctx, ember);
                return true;
            }
            return false;
        });

        // Update and render snowflakes drifting
        this.snowflakes = this.snowflakes.filter(flake => {
            flake.life -= 0.015 * dt;
            flake.x += flake.vx * dt + Math.sin(Date.now() * 0.003 + flake.rotation) * 0.5;
            flake.y += flake.vy * dt;
            flake.rotation += flake.rotSpeed * dt;

            if (flake.life > 0) {
                this.drawSnowflake(ctx, flake);
                return true;
            }
            return false;
        });

        // Update and render lightning
        this.lightning = this.lightning.filter(bolt => {
            bolt.life -= 0.1 * dt;
            bolt.alpha = bolt.life;

            if (bolt.life > 0) {
                this.drawLightning(ctx, bolt);
                return true;
            }
            return false;
        });
    }

    private drawStar(ctx: CanvasRenderingContext2D, star: StarParticle) {
        ctx.save();
        ctx.translate(star.x, star.y);
        ctx.rotate(star.rotation);
        ctx.globalAlpha = star.life;

        // Draw 5-pointed star
        const size = star.size * star.life;
        ctx.beginPath();
        for (let i = 0; i < 5; i++) {
            const angle = (i * 4 * Math.PI) / 5 - Math.PI / 2;
            const x = Math.cos(angle) * size;
            const y = Math.sin(angle) * size;
            if (i === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
        }
        ctx.closePath();
        ctx.fillStyle = star.color;
        ctx.shadowBlur = 10;
        ctx.shadowColor = star.color;
        ctx.fill();

        ctx.restore();
    }

    private drawEmber(ctx: CanvasRenderingContext2D, ember: EmberParticle) {
        ctx.save();
        ctx.globalAlpha = ember.life;
        ctx.beginPath();
        ctx.arc(ember.x, ember.y, ember.size * ember.life, 0, Math.PI * 2);
        ctx.fillStyle = ember.color;
        ctx.shadowBlur = 15;
        ctx.shadowColor = ember.color;
        ctx.fill();
        ctx.restore();
    }

    private drawSnowflake(ctx: CanvasRenderingContext2D, flake: SnowflakeParticle) {
        ctx.save();
        ctx.translate(flake.x, flake.y);
        ctx.rotate(flake.rotation);
        ctx.globalAlpha = flake.life * 0.8;

        const size = flake.size * flake.life;
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 1.5;
        ctx.shadowBlur = 8;
        ctx.shadowColor = '#00e5ff';

        // Draw 6-armed snowflake
        for (let i = 0; i < 6; i++) {
            ctx.beginPath();
            ctx.moveTo(0, 0);
            const angle = (i * Math.PI) / 3;
            ctx.lineTo(Math.cos(angle) * size, Math.sin(angle) * size);
            ctx.stroke();
        }

        ctx.restore();
    }

    private drawLightning(ctx: CanvasRenderingContext2D, bolt: LightningSegment) {
        if (bolt.points.length < 2) return;

        ctx.save();
        ctx.globalAlpha = bolt.alpha;
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 2;
        ctx.shadowBlur = 20;
        ctx.shadowColor = '#ffff00';

        ctx.beginPath();
        ctx.moveTo(bolt.points[0].x, bolt.points[0].y);
        for (let i = 1; i < bolt.points.length; i++) {
            ctx.lineTo(bolt.points[i].x, bolt.points[i].y);
        }
        ctx.stroke();

        // Draw thinner inner line
        ctx.lineWidth = 1;
        ctx.shadowBlur = 10;
        ctx.stroke();

        ctx.restore();
    }

    // === STROKE RENDER METHODS ===

    private renderClassic(ctx: CanvasRenderingContext2D, trail: BladePoint[]) {
        const config = this.currentStroke;
        const now = Date.now();

        // Calculate dynamic width
        const lastTwo = trail.slice(-2);
        const speed = Math.hypot(lastTwo[1].x - lastTwo[0].x, lastTwo[1].y - lastTwo[0].y);
        const dynamicWidth = Math.min(15, Math.max(3, speed * 0.5)) * config.trailWidth;

        ctx.beginPath();
        ctx.moveTo(trail[0].x, trail[0].y);
        for (let i = 1; i < trail.length; i++) {
            ctx.lineTo(trail[i].x, trail[i].y);
        }
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';

        // Glow layer
        ctx.shadowBlur = 25 * config.glowIntensity;
        ctx.shadowColor = config.colors.blade;
        ctx.lineWidth = dynamicWidth + 8;
        ctx.strokeStyle = config.colors.bladeGlow;
        ctx.stroke();

        // Mid layer
        ctx.shadowBlur = 10 * config.glowIntensity;
        ctx.lineWidth = dynamicWidth + 4;
        ctx.strokeStyle = config.colors.blade;
        ctx.stroke();

        // Core
        ctx.shadowBlur = 0;
        ctx.lineWidth = dynamicWidth;
        ctx.strokeStyle = config.colors.bladeCore;
        ctx.stroke();

        // Fading points
        for (let i = 0; i < trail.length; i++) {
            const age = (now - trail[i].time) / 300;
            const alpha = 1 - age;
            if (alpha > 0 && i > 0) {
                ctx.beginPath();
                ctx.arc(trail[i].x, trail[i].y, 3 * alpha, 0, Math.PI * 2);
                ctx.fillStyle = `rgba(255, 255, 255, ${alpha * 0.5})`;
                ctx.fill();
            }
        }
    }

    private renderStarfall(ctx: CanvasRenderingContext2D, trail: BladePoint[]) {
        const config = this.currentStroke;
        const now = Date.now();

        const lastTwo = trail.slice(-2);
        const speed = Math.hypot(lastTwo[1].x - lastTwo[0].x, lastTwo[1].y - lastTwo[0].y);
        // Thinner, smoother blade
        const dynamicWidth = Math.min(8, Math.max(2, speed * 0.35)) * config.trailWidth;

        // Smooth bezier curve path
        ctx.beginPath();
        ctx.moveTo(trail[0].x, trail[0].y);
        for (let i = 1; i < trail.length; i++) {
            const prev = trail[i - 1];
            const curr = trail[i];
            const cpX = (prev.x + curr.x) / 2;
            const cpY = (prev.y + curr.y) / 2;
            ctx.quadraticCurveTo(prev.x, prev.y, cpX, cpY);
        }
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';

        // Purple glow
        ctx.shadowBlur = 30 * config.glowIntensity;
        ctx.shadowColor = config.colors.blade;
        ctx.lineWidth = dynamicWidth + 8;
        ctx.strokeStyle = config.colors.bladeGlow;
        ctx.stroke();

        // Main blade
        ctx.shadowBlur = 15;
        ctx.lineWidth = dynamicWidth + 3;
        ctx.strokeStyle = config.colors.blade;
        ctx.stroke();

        // Gold core
        ctx.shadowBlur = 5;
        ctx.shadowColor = config.colors.trail[2]; // Gold
        ctx.lineWidth = dynamicWidth;
        ctx.strokeStyle = config.colors.bladeCore;
        ctx.stroke();

        // Mini stars along trail
        for (let i = 0; i < trail.length; i += 3) {
            const age = (now - trail[i].time) / 300;
            const alpha = (1 - age) * 0.7;
            if (alpha > 0) {
                this.drawMiniStar(ctx, trail[i].x, trail[i].y, 4 * (1 - age * 0.5), alpha, config.colors.trail[i % 3]);
            }
        }
    }

    private drawMiniStar(ctx: CanvasRenderingContext2D, x: number, y: number, size: number, alpha: number, color: string) {
        ctx.save();
        ctx.translate(x, y);
        ctx.globalAlpha = alpha;
        ctx.beginPath();
        for (let i = 0; i < 5; i++) {
            const angle = (i * 4 * Math.PI) / 5 - Math.PI / 2;
            const px = Math.cos(angle) * size;
            const py = Math.sin(angle) * size;
            if (i === 0) ctx.moveTo(px, py);
            else ctx.lineTo(px, py);
        }
        ctx.closePath();
        ctx.fillStyle = color;
        ctx.shadowBlur = 8;
        ctx.shadowColor = color;
        ctx.fill();
        ctx.restore();
    }

    private renderFire(ctx: CanvasRenderingContext2D, trail: BladePoint[]) {
        const config = this.currentStroke;
        const now = Date.now();

        const lastTwo = trail.slice(-2);
        const speed = Math.hypot(lastTwo[1].x - lastTwo[0].x, lastTwo[1].y - lastTwo[0].y);
        const dynamicWidth = Math.min(10, Math.max(3, speed * 0.4)) * config.trailWidth;

        // Smooth bezier curve path
        ctx.beginPath();
        ctx.moveTo(trail[0].x, trail[0].y);
        for (let i = 1; i < trail.length; i++) {
            const prev = trail[i - 1];
            const curr = trail[i];
            const cpX = (prev.x + curr.x) / 2;
            const cpY = (prev.y + curr.y) / 2;
            ctx.quadraticCurveTo(prev.x, prev.y, cpX, cpY);
        }
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';

        // Multi-layer fire effect
        // Outer red-orange glow
        ctx.shadowBlur = 50 * config.glowIntensity;
        ctx.shadowColor = '#ff2200';
        ctx.lineWidth = dynamicWidth + 16;
        ctx.strokeStyle = 'rgba(255, 34, 0, 0.15)';
        ctx.stroke();

        // Orange fire layer
        ctx.shadowBlur = 35;
        ctx.shadowColor = '#ff4500';
        ctx.lineWidth = dynamicWidth + 10;
        ctx.strokeStyle = 'rgba(255, 69, 0, 0.3)';
        ctx.stroke();

        // Yellow-orange main fire
        ctx.shadowBlur = 20;
        ctx.shadowColor = '#ff6b35';
        ctx.lineWidth = dynamicWidth + 5;
        ctx.strokeStyle = config.colors.blade;
        ctx.stroke();

        // White-hot core
        ctx.shadowBlur = 8;
        ctx.shadowColor = '#fff4e0';
        ctx.lineWidth = dynamicWidth;
        ctx.strokeStyle = config.colors.bladeCore;
        ctx.stroke();

        // Rising flames and embers
        for (let i = 0; i < trail.length; i++) {
            const age = (now - trail[i].time) / 280;
            if (age > 1) continue;

            // Flame tongues - rising with flicker
            if (i % 2 === 0) {
                const flameHeight = (1 - age) * 35;
                const flickerX = Math.sin(now * 0.015 + i * 0.7) * 8;
                const flickerY = Math.cos(now * 0.012 + i) * 4;

                // Outer flame (red)
                ctx.beginPath();
                ctx.ellipse(
                    trail[i].x + flickerX,
                    trail[i].y - flameHeight + flickerY,
                    6 * (1 - age * 0.5),
                    10 * (1 - age * 0.3),
                    0, 0, Math.PI * 2
                );
                ctx.fillStyle = `rgba(255, 50, 0, ${(1 - age) * 0.4})`;
                ctx.fill();

                // Inner flame (orange-yellow)
                ctx.beginPath();
                ctx.ellipse(
                    trail[i].x + flickerX * 0.5,
                    trail[i].y - flameHeight * 0.7 + flickerY,
                    4 * (1 - age * 0.5),
                    7 * (1 - age * 0.3),
                    0, 0, Math.PI * 2
                );
                ctx.fillStyle = `rgba(255, 180, 50, ${(1 - age) * 0.6})`;
                ctx.fill();
            }

            // Small rising embers
            if (i % 3 === 0) {
                const emberRise = age * 45;
                const emberDrift = Math.sin(now * 0.008 + i * 1.5) * 12;
                const emberSize = 3 * (1 - age * 0.7);

                ctx.beginPath();
                ctx.arc(
                    trail[i].x + emberDrift,
                    trail[i].y - emberRise,
                    emberSize,
                    0, Math.PI * 2
                );
                ctx.fillStyle = `rgba(255, ${150 + Math.random() * 100}, 50, ${(1 - age) * 0.8})`;
                ctx.shadowBlur = 6;
                ctx.shadowColor = '#ff6b35';
                ctx.fill();
            }
        }

        ctx.shadowBlur = 0;
    }

    private renderIce(ctx: CanvasRenderingContext2D, trail: BladePoint[]) {
        const config = this.currentStroke;
        const now = Date.now();

        const lastTwo = trail.slice(-2);
        const speed = Math.hypot(lastTwo[1].x - lastTwo[0].x, lastTwo[1].y - lastTwo[0].y);
        const dynamicWidth = Math.min(6, Math.max(2, speed * 0.25)) * config.trailWidth;

        // Smooth bezier curve path
        ctx.beginPath();
        ctx.moveTo(trail[0].x, trail[0].y);
        for (let i = 1; i < trail.length; i++) {
            const prev = trail[i - 1];
            const curr = trail[i];
            const cpX = (prev.x + curr.x) / 2;
            const cpY = (prev.y + curr.y) / 2;
            ctx.quadraticCurveTo(prev.x, prev.y, cpX, cpY);
        }
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';

        // Multi-layer frost effect
        // Outer frost mist (wide, subtle)
        ctx.shadowBlur = 45 * config.glowIntensity;
        ctx.shadowColor = '#ffffff';
        ctx.lineWidth = dynamicWidth + 14;
        ctx.strokeStyle = 'rgba(200, 240, 255, 0.12)';
        ctx.stroke();

        // Cold aura (light blue)
        ctx.shadowBlur = 30;
        ctx.shadowColor = '#a8e6ff';
        ctx.lineWidth = dynamicWidth + 8;
        ctx.strokeStyle = 'rgba(168, 230, 255, 0.25)';
        ctx.stroke();

        // Ice blue layer
        ctx.shadowBlur = 18;
        ctx.shadowColor = '#00e5ff';
        ctx.lineWidth = dynamicWidth + 4;
        ctx.strokeStyle = config.colors.blade;
        ctx.stroke();

        // Crystalline white core
        ctx.shadowBlur = 10;
        ctx.shadowColor = '#ffffff';
        ctx.lineWidth = dynamicWidth;
        ctx.strokeStyle = '#ffffff';
        ctx.stroke();

        // Frost mist particles (floating upward)
        for (let i = 0; i < trail.length; i++) {
            const age = (now - trail[i].time) / 400;
            if (age > 1) continue;

            // Frost mist - diffusing cold particles
            if (i % 2 === 0) {
                const mistDrift = Math.sin(now * 0.003 + i * 0.5) * 12;
                const mistRise = age * 20;
                const mistSize = 8 * (1 - age * 0.3) * (1 + Math.sin(now * 0.005 + i) * 0.2);

                ctx.beginPath();
                ctx.arc(
                    trail[i].x + mistDrift,
                    trail[i].y - mistRise,
                    mistSize,
                    0, Math.PI * 2
                );
                ctx.fillStyle = `rgba(200, 240, 255, ${(1 - age) * 0.2})`;
                ctx.fill();
            }

            // Floating ice shards (NOT snowflakes - actual ice fragments)
            if (i % 3 === 0) {
                ctx.save();
                ctx.globalAlpha = (1 - age) * 0.85;
                const shardDrift = Math.sin(now * 0.004 + i * 0.8) * 10;
                const shardFall = age * 30;
                ctx.translate(trail[i].x + shardDrift, trail[i].y + shardFall);
                ctx.rotate(age * Math.PI * 0.2 + i * 0.7);

                const size = 8 * (1 - age * 0.3);
                ctx.fillStyle = 'rgba(200, 240, 255, 0.7)';
                ctx.strokeStyle = '#ffffff';
                ctx.lineWidth = 1;
                ctx.shadowBlur = 10;
                ctx.shadowColor = '#00e5ff';

                // Draw ice shard (jagged triangular shape)
                ctx.beginPath();
                ctx.moveTo(0, -size);  // Top point
                ctx.lineTo(size * 0.4, 0);  // Right middle
                ctx.lineTo(size * 0.2, size * 0.8);  // Right bottom
                ctx.lineTo(-size * 0.2, size * 0.6);  // Left bottom
                ctx.lineTo(-size * 0.35, 0);  // Left middle
                ctx.closePath();
                ctx.fill();
                ctx.stroke();

                ctx.restore();
            }

            // Smaller ice fragments
            if (i % 4 === 1) {
                const fragDrift = Math.cos(now * 0.003 + i) * 6;
                const fragFall = age * 20;
                const fragSize = 4 * (1 - age * 0.4);

                ctx.save();
                ctx.globalAlpha = (1 - age) * 0.6;
                ctx.translate(trail[i].x + fragDrift, trail[i].y + fragFall);
                ctx.rotate(now * 0.002 + i);

                // Small ice chip
                ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
                ctx.shadowBlur = 5;
                ctx.shadowColor = '#00e5ff';
                ctx.beginPath();
                ctx.moveTo(0, -fragSize);
                ctx.lineTo(fragSize * 0.5, fragSize * 0.3);
                ctx.lineTo(-fragSize * 0.5, fragSize * 0.5);
                ctx.closePath();
                ctx.fill();

                ctx.restore();
            }
        }

        ctx.shadowBlur = 0;
    }

    private renderNeon(ctx: CanvasRenderingContext2D, trail: BladePoint[]) {
        const config = this.currentStroke;
        const now = Date.now();

        const lastTwo = trail.slice(-2);
        const speed = Math.hypot(lastTwo[1].x - lastTwo[0].x, lastTwo[1].y - lastTwo[0].y);
        // Thinner blade with smooth curves
        const dynamicWidth = Math.min(8, Math.max(2, speed * 0.3)) * config.trailWidth;

        // Pulsing effect
        const pulse = Math.sin(now * 0.005) * 0.2 + 0.8;

        // Smooth bezier curve path
        ctx.beginPath();
        ctx.moveTo(trail[0].x, trail[0].y);
        for (let i = 1; i < trail.length; i++) {
            const prev = trail[i - 1];
            const curr = trail[i];
            const cpX = (prev.x + curr.x) / 2;
            const cpY = (prev.y + curr.y) / 2;
            ctx.quadraticCurveTo(prev.x, prev.y, cpX, cpY);
        }
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';

        // Orange/red outer fire glow
        ctx.shadowBlur = 45 * config.glowIntensity * pulse;
        ctx.shadowColor = '#ff4500';
        ctx.lineWidth = dynamicWidth + 10;
        ctx.strokeStyle = 'rgba(255, 69, 0, 0.2)';
        ctx.stroke();

        // Magenta fire layer
        ctx.shadowBlur = 30 * pulse;
        ctx.shadowColor = '#ff00ff';
        ctx.lineWidth = dynamicWidth + 6;
        ctx.strokeStyle = 'rgba(255, 0, 255, 0.3)';
        ctx.stroke();

        // Main magenta blade
        ctx.shadowBlur = 15;
        ctx.shadowColor = '#ff00ff';
        ctx.lineWidth = dynamicWidth + 3;
        ctx.strokeStyle = config.colors.blade;
        ctx.stroke();

        // Cyan hot core
        ctx.shadowBlur = 8;
        ctx.shadowColor = '#00ffff';
        ctx.lineWidth = dynamicWidth;
        ctx.strokeStyle = config.colors.bladeCore;
        ctx.stroke();

        // Fire-like rising particles along trail
        for (let i = 0; i < trail.length; i += 2) {
            const age = (now - trail[i].time) / 250;
            const alpha = (1 - age) * 0.7;
            const rise = age * 25; // Particles rise up
            const flicker = Math.sin(now * 0.015 + i) * 5;
            if (alpha > 0) {
                // Rising ember
                ctx.beginPath();
                ctx.arc(trail[i].x + flicker, trail[i].y - rise, 3 * (1 - age * 0.5), 0, Math.PI * 2);
                const hue = (i % 2 === 0) ? '#ff00ff' : '#ff4500';
                ctx.fillStyle = hue;
                ctx.globalAlpha = alpha;
                ctx.shadowBlur = 10;
                ctx.shadowColor = hue;
                ctx.fill();
                ctx.globalAlpha = 1.0;
            }
        }
    }

    private renderShadow(ctx: CanvasRenderingContext2D, trail: BladePoint[]) {
        const config = this.currentStroke;
        const now = Date.now();

        const lastTwo = trail.slice(-2);
        const speed = Math.hypot(lastTwo[1].x - lastTwo[0].x, lastTwo[1].y - lastTwo[0].y);
        const dynamicWidth = Math.min(8, Math.max(2, speed * 0.3)) * config.trailWidth;

        // Smooth bezier curve path
        ctx.beginPath();
        ctx.moveTo(trail[0].x, trail[0].y);
        for (let i = 1; i < trail.length; i++) {
            const prev = trail[i - 1];
            const curr = trail[i];
            const cpX = (prev.x + curr.x) / 2;
            const cpY = (prev.y + curr.y) / 2;
            ctx.quadraticCurveTo(prev.x, prev.y, cpX, cpY);
        }
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';

        // Multi-layer shadow effect
        // Outer ethereal darkness (wide, subtle)
        ctx.shadowBlur = 40 * config.glowIntensity;
        ctx.shadowColor = '#0a0512';
        ctx.lineWidth = dynamicWidth + 12;
        ctx.strokeStyle = 'rgba(10, 5, 18, 0.25)';
        ctx.stroke();

        // Dark purple aura
        ctx.shadowBlur = 25;
        ctx.shadowColor = '#1a0a2a';
        ctx.lineWidth = dynamicWidth + 7;
        ctx.strokeStyle = 'rgba(26, 10, 42, 0.4)';
        ctx.stroke();

        // Purple blade
        ctx.shadowBlur = 15;
        ctx.shadowColor = config.colors.blade;
        ctx.lineWidth = dynamicWidth + 3;
        ctx.strokeStyle = config.colors.blade;
        ctx.stroke();

        // Light purple core
        ctx.shadowBlur = 8;
        ctx.lineWidth = dynamicWidth;
        ctx.strokeStyle = config.colors.bladeCore;
        ctx.stroke();

        // Layered smoke effect
        for (let i = 0; i < trail.length; i++) {
            const age = (now - trail[i].time) / 400;
            if (age > 1) continue;

            // Large outer smoke wisps
            if (i % 2 === 0) {
                const drift = Math.sin(now * 0.002 + i * 0.6) * 15;
                const rise = age * 18;
                const expand = 1 + age * 1.2;
                const sway = Math.cos(now * 0.003 + i) * 5;

                // Outer dark wisp
                ctx.beginPath();
                ctx.arc(
                    trail[i].x + drift + sway,
                    trail[i].y - rise,
                    12 * expand * (1 - age * 0.3),
                    0, Math.PI * 2
                );
                ctx.fillStyle = `rgba(15, 8, 25, ${(1 - age) * 0.25})`;
                ctx.fill();

                // Purple tinted smoke
                ctx.beginPath();
                ctx.arc(
                    trail[i].x + drift * 0.6 + sway * 0.5,
                    trail[i].y - rise * 0.7,
                    8 * expand * (1 - age * 0.4),
                    0, Math.PI * 2
                );
                ctx.fillStyle = `rgba(60, 20, 80, ${(1 - age) * 0.35})`;
                ctx.fill();
            }

            // Ghostly inner particles
            if (i % 3 === 0) {
                const ghostDrift = Math.sin(now * 0.004 + i * 1.2) * 10;
                const ghostRise = age * 25;
                const ghostSize = 4 * (1 - age * 0.5);

                ctx.beginPath();
                ctx.arc(
                    trail[i].x + ghostDrift,
                    trail[i].y - ghostRise,
                    ghostSize,
                    0, Math.PI * 2
                );
                ctx.fillStyle = `rgba(140, 80, 200, ${(1 - age) * 0.5})`;
                ctx.shadowBlur = 8;
                ctx.shadowColor = '#6a0dad';
                ctx.fill();
            }
        }

        ctx.shadowBlur = 0;
    }

    private renderRainbow(ctx: CanvasRenderingContext2D, trail: BladePoint[], dt: number) {
        const config = this.currentStroke;
        const now = Date.now();

        // Advance rainbow hue
        this.rainbowHue = (this.rainbowHue + 2 * dt) % 360;

        const lastTwo = trail.slice(-2);
        const speed = Math.hypot(lastTwo[1].x - lastTwo[0].x, lastTwo[1].y - lastTwo[0].y);
        const dynamicWidth = Math.min(15, Math.max(3, speed * 0.5)) * config.trailWidth;

        ctx.beginPath();
        ctx.moveTo(trail[0].x, trail[0].y);
        for (let i = 1; i < trail.length; i++) {
            ctx.lineTo(trail[i].x, trail[i].y);
        }
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';

        // Rainbow gradient glow
        ctx.shadowBlur = 25 * config.glowIntensity;
        ctx.shadowColor = `hsl(${this.rainbowHue}, 100%, 50%)`;
        ctx.lineWidth = dynamicWidth + 10;
        ctx.strokeStyle = `hsla(${this.rainbowHue}, 100%, 50%, 0.3)`;
        ctx.stroke();

        // Main rainbow blade
        ctx.shadowBlur = 15;
        ctx.lineWidth = dynamicWidth + 4;
        ctx.strokeStyle = `hsl(${this.rainbowHue}, 100%, 60%)`;
        ctx.stroke();

        // White core
        ctx.shadowBlur = 5;
        ctx.lineWidth = dynamicWidth;
        ctx.strokeStyle = config.colors.bladeCore;
        ctx.stroke();

        // Rainbow sparkles along trail
        for (let i = 0; i < trail.length; i += 2) {
            const age = (now - trail[i].time) / 300;
            const alpha = (1 - age) * 0.7;
            const hue = (this.rainbowHue + i * 20) % 360;
            if (alpha > 0) {
                ctx.beginPath();
                ctx.arc(trail[i].x, trail[i].y, 3 * (1 - age * 0.5), 0, Math.PI * 2);
                ctx.fillStyle = `hsla(${hue}, 100%, 60%, ${alpha})`;
                ctx.fill();
            }
        }
    }

    private renderElectric(ctx: CanvasRenderingContext2D, trail: BladePoint[]) {
        const config = this.currentStroke;

        const lastTwo = trail.slice(-2);
        const speed = Math.hypot(lastTwo[1].x - lastTwo[0].x, lastTwo[1].y - lastTwo[0].y);
        const dynamicWidth = Math.min(12, Math.max(2, speed * 0.4)) * config.trailWidth;

        // Jittery electric trail
        ctx.beginPath();
        ctx.moveTo(trail[0].x, trail[0].y);
        for (let i = 1; i < trail.length; i++) {
            // Add slight jitter for electric effect
            const jitterX = (Math.random() - 0.5) * 4;
            const jitterY = (Math.random() - 0.5) * 4;
            ctx.lineTo(trail[i].x + jitterX, trail[i].y + jitterY);
        }
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';

        // Electric glow
        ctx.shadowBlur = 30 * config.glowIntensity;
        ctx.shadowColor = '#ffff00';
        ctx.lineWidth = dynamicWidth + 8;
        ctx.strokeStyle = 'rgba(255, 255, 0, 0.3)';
        ctx.stroke();

        // Main bolt
        ctx.shadowBlur = 15;
        ctx.lineWidth = dynamicWidth + 3;
        ctx.strokeStyle = config.colors.blade;
        ctx.stroke();

        // White hot core
        ctx.shadowBlur = 5;
        ctx.lineWidth = dynamicWidth;
        ctx.strokeStyle = config.colors.bladeCore;
        ctx.stroke();

        // Electric sparks
        if (Math.random() < 0.3) {
            const randPoint = trail[Math.floor(Math.random() * trail.length)];
            ctx.beginPath();
            ctx.moveTo(randPoint.x, randPoint.y);
            ctx.lineTo(randPoint.x + (Math.random() - 0.5) * 30, randPoint.y + (Math.random() - 0.5) * 30);
            ctx.strokeStyle = '#ffffff';
            ctx.lineWidth = 1;
            ctx.shadowBlur = 10;
            ctx.shadowColor = '#00aaff';
            ctx.stroke();
        }
    }

    private renderCosmic(ctx: CanvasRenderingContext2D, trail: BladePoint[]) {
        const config = this.currentStroke;
        const now = Date.now();

        const lastTwo = trail.slice(-2);
        const speed = Math.hypot(lastTwo[1].x - lastTwo[0].x, lastTwo[1].y - lastTwo[0].y);
        const dynamicWidth = Math.min(15, Math.max(3, speed * 0.5)) * config.trailWidth;

        ctx.beginPath();
        ctx.moveTo(trail[0].x, trail[0].y);
        for (let i = 1; i < trail.length; i++) {
            ctx.lineTo(trail[i].x, trail[i].y);
        }
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';

        // Deep space glow
        ctx.shadowBlur = 30 * config.glowIntensity;
        ctx.shadowColor = '#3949ab';
        ctx.lineWidth = dynamicWidth + 10;
        ctx.strokeStyle = 'rgba(57, 73, 171, 0.3)';
        ctx.stroke();

        // Cosmic blue
        ctx.shadowBlur = 18;
        ctx.lineWidth = dynamicWidth + 5;
        ctx.strokeStyle = config.colors.blade;
        ctx.stroke();

        // Starlight core
        ctx.shadowBlur = 8;
        ctx.shadowColor = '#ffffff';
        ctx.lineWidth = dynamicWidth;
        ctx.strokeStyle = config.colors.bladeCore;
        ctx.stroke();

        // Twinkling stars along trail
        for (let i = 0; i < trail.length; i += 4) {
            const age = (now - trail[i].time) / 300;
            const twinkle = Math.sin(now * 0.01 + i * 0.5) * 0.5 + 0.5;
            const alpha = (1 - age) * 0.8 * twinkle;
            if (alpha > 0) {
                ctx.beginPath();
                ctx.arc(trail[i].x, trail[i].y, 2 * (1 - age * 0.3), 0, Math.PI * 2);
                ctx.fillStyle = `rgba(255, 255, 255, ${alpha})`;
                ctx.shadowBlur = 5;
                ctx.shadowColor = '#ffffff';
                ctx.fill();
            }
        }
    }

    private renderGolden(ctx: CanvasRenderingContext2D, trail: BladePoint[]) {
        const config = this.currentStroke;
        const now = Date.now();

        const lastTwo = trail.slice(-2);
        const speed = Math.hypot(lastTwo[1].x - lastTwo[0].x, lastTwo[1].y - lastTwo[0].y);
        const dynamicWidth = Math.min(15, Math.max(3, speed * 0.5)) * config.trailWidth;

        ctx.beginPath();
        ctx.moveTo(trail[0].x, trail[0].y);
        for (let i = 1; i < trail.length; i++) {
            ctx.lineTo(trail[i].x, trail[i].y);
        }
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';

        // Golden glow
        ctx.shadowBlur = 28 * config.glowIntensity;
        ctx.shadowColor = '#ffd700';
        ctx.lineWidth = dynamicWidth + 10;
        ctx.strokeStyle = 'rgba(255, 215, 0, 0.35)';
        ctx.stroke();

        // Main gold
        ctx.shadowBlur = 15;
        ctx.lineWidth = dynamicWidth + 5;
        ctx.strokeStyle = config.colors.blade;
        ctx.stroke();

        // White hot core
        ctx.shadowBlur = 5;
        ctx.lineWidth = dynamicWidth;
        ctx.strokeStyle = config.colors.bladeCore;
        ctx.stroke();

        // Golden sparkles with shimmer
        for (let i = 0; i < trail.length; i += 2) {
            const age = (now - trail[i].time) / 300;
            const shimmer = Math.sin(now * 0.008 + i) * 0.3 + 0.7;
            const alpha = (1 - age) * 0.6 * shimmer;
            if (alpha > 0) {
                ctx.beginPath();
                ctx.arc(trail[i].x, trail[i].y, 3 * (1 - age * 0.5), 0, Math.PI * 2);
                ctx.fillStyle = `rgba(255, 215, 0, ${alpha})`;
                ctx.shadowBlur = 8;
                ctx.shadowColor = '#ffd700';
                ctx.fill();
            }
        }
    }
}
