import { CONFIG, type FruitType } from './GameTypes';

// ============ PARTICLE ============
export class Particle {
    x: number;
    y: number;
    vx: number;
    vy: number;
    life: number = 1.0;
    decay: number;
    size: number;
    color: string;
    isGlowing: boolean;

    constructor(x: number, y: number, color: string, isGlowing = false) {
        this.x = x;
        this.y = y;
        this.color = color;
        this.isGlowing = isGlowing;
        const angle = Math.random() * Math.PI * 2;
        const speed = Math.random() * 6 + 3;
        this.vx = Math.cos(angle) * speed;
        this.vy = Math.sin(angle) * speed;
        this.decay = Math.random() * 0.02 + 0.015;
        this.size = Math.random() * 4 + 3;
    }

    update(dt: number = 1.0) {
        this.x += this.vx * dt;
        this.y += this.vy * dt;
        this.vy += CONFIG.gravity * dt;
        this.life -= this.decay * dt;
        this.vx *= Math.pow(0.99, dt); // Air resistance compensation for delta time
    }

    draw(ctx: CanvasRenderingContext2D) {
        if (this.life <= 0) return;
        ctx.globalAlpha = Math.max(0, this.life);

        if (this.isGlowing) {
            ctx.shadowBlur = 10;
            ctx.shadowColor = this.color;
        }

        ctx.fillStyle = this.color;
        // Rounded square for more polished look
        const r = this.size / 3;
        ctx.beginPath();
        ctx.roundRect(this.x - this.size / 2, this.y - this.size / 2, this.size, this.size, r);
        ctx.fill();

        ctx.shadowBlur = 0;
        ctx.globalAlpha = 1.0;
    }
}

// ============ SPARKLE (for blade trail) ============
export class Sparkle {
    x: number;
    y: number;
    life: number = 1.0;
    size: number;

    constructor(x: number, y: number) {
        this.x = x + (Math.random() - 0.5) * 20;
        this.y = y + (Math.random() - 0.5) * 20;
        this.size = Math.random() * 3 + 1;
    }

    update(dt: number = 1.0) {
        this.life -= 0.05 * dt;
    }

    draw(ctx: CanvasRenderingContext2D) {
        if (this.life <= 0) return;
        ctx.globalAlpha = this.life * 0.8;
        ctx.fillStyle = '#fff';
        ctx.shadowBlur = 5;
        ctx.shadowColor = CONFIG.colors.blade;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size * this.life, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;
        ctx.globalAlpha = 1.0;
    }
}

// ============ FRUIT ============
export class Fruit {
    x: number;
    y: number;
    vx: number;
    vy: number;
    rotation: number;
    rotSpeed: number;
    radius: number;
    type: FruitType;
    sliced: boolean = false;
    active: boolean = true;
    pulseTime: number = 0; // For bomb/heart pulsing
    isDoubleFruit: boolean = false; // Part of a double spawn
    spawnTime: number; // For combo detection

    constructor(fieldWidth: number, fieldHeight: number, forceType?: FruitType) {
        const margin = fieldWidth * CONFIG.marginPercent;
        const spawnWidth = fieldWidth - (margin * 2);
        this.x = margin + Math.random() * spawnWidth;
        this.y = fieldHeight + 50;
        this.vx = (Math.random() - 0.5) * 3;
        this.vy = -(Math.random() * 5 + 11);
        this.rotation = Math.random() * Math.PI * 2;
        this.rotSpeed = (Math.random() - 0.5) * 0.15;
        this.radius = CONFIG.fruitRadius;
        this.spawnTime = Date.now();

        if (forceType) {
            this.type = forceType;
        } else {
            this.type = this.determineType();
        }
    }

    private determineType(): FruitType {
        const rand = Math.random();
        if (rand < CONFIG.heartChance) return 'heart';
        if (rand < CONFIG.heartChance + CONFIG.bombChance) return 'bomb';
        return this.getRandomFruitType();
    }

    private getRandomFruitType(): FruitType {
        const types: FruitType[] = ['apple', 'orange', 'watermelon', 'kiwi', 'lemon'];
        return types[Math.floor(Math.random() * types.length)];
    }

    update(fieldHeight: number, dt: number = 1.0) {
        this.x += this.vx * dt;
        this.y += this.vy * dt;
        this.vy += CONFIG.gravity * dt;
        this.rotation += this.rotSpeed * dt;
        this.pulseTime += 0.1 * dt;

        if (this.y > fieldHeight + 100 && this.vy > 0) {
            this.active = false;
        }
    }

    draw(ctx: CanvasRenderingContext2D) {
        ctx.save();
        ctx.translate(this.x, this.y);
        ctx.rotate(this.rotation);

        if (this.type === 'bomb') {
            this.drawBomb(ctx);
        } else if (this.type === 'heart') {
            this.drawHeart(ctx);
        } else {
            this.drawFruitBody(ctx);
        }
        ctx.restore();
    }

    private drawBomb(ctx: CanvasRenderingContext2D) {
        // Pulsing glow effect
        const pulse = Math.sin(this.pulseTime * 3) * 0.3 + 0.7;

        // Outer warning glow
        ctx.shadowBlur = 20 * pulse;
        ctx.shadowColor = '#ff2a55';

        // Bomb body
        const grad = ctx.createRadialGradient(-5, -5, 5, 0, 0, this.radius);
        grad.addColorStop(0, '#333');
        grad.addColorStop(0.7, '#111');
        grad.addColorStop(1, '#000');

        ctx.beginPath();
        ctx.arc(0, 0, this.radius, 0, Math.PI * 2);
        ctx.fillStyle = grad;
        ctx.fill();

        // Metallic rim
        ctx.lineWidth = 3;
        ctx.strokeStyle = `rgba(255,255,255,${0.3 + pulse * 0.3})`;
        ctx.stroke();

        // Danger X
        ctx.shadowBlur = 10;
        ctx.beginPath();
        ctx.moveTo(-12, -12); ctx.lineTo(12, 12);
        ctx.moveTo(12, -12); ctx.lineTo(-12, 12);
        ctx.strokeStyle = '#ff2a55';
        ctx.lineWidth = 4;
        ctx.lineCap = 'round';
        ctx.stroke();

        // Fuse
        ctx.shadowBlur = 5;
        ctx.shadowColor = '#ff6600';
        ctx.beginPath();
        ctx.moveTo(0, -this.radius);
        ctx.quadraticCurveTo(10, -this.radius - 10, 5, -this.radius - 15);
        ctx.strokeStyle = '#8B4513';
        ctx.lineWidth = 4;
        ctx.stroke();

        // Spark on fuse
        const sparkPulse = (Math.sin(this.pulseTime * 8) + 1) / 2;
        ctx.beginPath();
        ctx.arc(5, -this.radius - 15, 3 + sparkPulse * 2, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255, ${150 + sparkPulse * 105}, 0, ${sparkPulse})`;
        ctx.fill();

        ctx.shadowBlur = 0;
    }

    private drawHeart(ctx: CanvasRenderingContext2D) {
        const pulse = Math.sin(this.pulseTime * 4) * 0.15 + 1;
        const size = this.radius * 0.8 * pulse;

        // Golden glow
        ctx.shadowBlur = 25;
        ctx.shadowColor = CONFIG.colors.heartGlow;

        // Heart shape
        ctx.beginPath();
        ctx.moveTo(0, size * 0.3);
        ctx.bezierCurveTo(-size, -size * 0.3, -size, -size, 0, -size * 0.5);
        ctx.bezierCurveTo(size, -size, size, -size * 0.3, 0, size * 0.3);

        // Gradient fill
        const grad = ctx.createRadialGradient(-5, -5, 0, 0, 0, size);
        grad.addColorStop(0, '#ffb6c1');
        grad.addColorStop(0.5, CONFIG.colors.heart);
        grad.addColorStop(1, '#ff1493');
        ctx.fillStyle = grad;
        ctx.fill();

        // Shine
        ctx.beginPath();
        ctx.ellipse(-size * 0.3, -size * 0.4, size * 0.15, size * 0.25, -Math.PI / 4, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(255,255,255,0.5)';
        ctx.fill();

        // + symbol
        ctx.shadowBlur = 0;
        ctx.fillStyle = '#fff';
        ctx.font = `bold ${size * 0.5}px Arial`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('+', 0, 0);

        ctx.shadowBlur = 0;
    }

    private drawFruitBody(ctx: CanvasRenderingContext2D) {
        const grad = ctx.createRadialGradient(-8, -8, 5, 0, 0, this.radius);

        switch (this.type) {
            case 'apple':
                grad.addColorStop(0, '#ff6b6b');
                grad.addColorStop(1, '#c0392b');
                break;
            case 'orange':
                grad.addColorStop(0, '#ffbe76');
                grad.addColorStop(1, '#e67e22');
                break;
            case 'watermelon':
                grad.addColorStop(0, '#58b819');
                grad.addColorStop(1, '#218c13');
                break;
            case 'kiwi':
                grad.addColorStop(0, '#a5d649');
                grad.addColorStop(1, '#637a31');
                break;
            case 'lemon':
                grad.addColorStop(0, '#fffacd');
                grad.addColorStop(1, '#f1c40f');
                break;
        }

        // Main body
        ctx.beginPath();
        ctx.arc(0, 0, this.radius, 0, Math.PI * 2);
        ctx.fillStyle = grad;
        ctx.fill();

        // Glossy highlight
        ctx.beginPath();
        ctx.ellipse(-10, -10, 8, 12, Math.PI / 4, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(255,255,255,0.35)';
        ctx.fill();

        // Secondary highlight
        ctx.beginPath();
        ctx.ellipse(8, 8, 4, 6, Math.PI / 4, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(255,255,255,0.15)';
        ctx.fill();

        // Stem
        ctx.beginPath();
        ctx.moveTo(0, -this.radius + 2);
        ctx.quadraticCurveTo(6, -this.radius - 10, 10, -this.radius - 2);
        ctx.strokeStyle = '#5D4037';
        ctx.lineWidth = 4;
        ctx.lineCap = 'round';
        ctx.stroke();

        // Inner stem line
        ctx.strokeStyle = '#3E2723';
        ctx.lineWidth = 2;
        ctx.stroke();

        // Leaf (for apple, watermelon)
        if (['apple', 'watermelon'].includes(this.type)) {
            ctx.fillStyle = '#4caf50';
            ctx.beginPath();
            ctx.ellipse(12, -this.radius + 2, 10, 5, Math.PI / 4, 0, Math.PI * 2);
            ctx.fill();

            // Leaf vein
            ctx.beginPath();
            ctx.moveTo(7, -this.radius + 4);
            ctx.lineTo(17, -this.radius);
            ctx.strokeStyle = '#2E7D32';
            ctx.lineWidth = 1;
            ctx.stroke();
        }

        // Double fruit indicator
        if (this.isDoubleFruit) {
            ctx.beginPath();
            ctx.arc(this.radius * 0.7, this.radius * 0.7, 8, 0, Math.PI * 2);
            ctx.fillStyle = '#FFD700';
            ctx.fill();
            ctx.fillStyle = '#000';
            ctx.font = 'bold 10px Arial';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText('2', this.radius * 0.7, this.radius * 0.7);
        }
    }
}

// ============ DOUBLE FRUIT SPAWNER ============
export function spawnDoubleFruit(fieldWidth: number, fieldHeight: number): Fruit[] {
    const fruits: Fruit[] = [];
    const baseX = fieldWidth * CONFIG.marginPercent + Math.random() * (fieldWidth * (1 - 2 * CONFIG.marginPercent));

    // First fruit
    const fruit1 = new Fruit(fieldWidth, fieldHeight);
    fruit1.x = baseX - 40;
    fruit1.isDoubleFruit = true;

    // Second fruit (close by, similar trajectory)
    const fruit2 = new Fruit(fieldWidth, fieldHeight, fruit1.type === 'bomb' || fruit1.type === 'heart' ? undefined : fruit1.type);
    fruit2.x = baseX + 40;
    fruit2.vy = fruit1.vy + (Math.random() - 0.5) * 2; // Slightly different velocity
    fruit2.isDoubleFruit = true;

    fruits.push(fruit1, fruit2);
    return fruits;
}
