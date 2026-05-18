/**
 * 🎆 庆祝彩蛋 - 烟花 + 彩带效果
 * 点击版本号 3 次触发
 */
class CelebrationManager {
    // 配置常量
    static CONFIG = {
        CLICK_COUNT: 3,
        CLICK_TIMEOUT: 2000,
        GRAVITY: 0.08,
        ROCKET_HEIGHT: [0.2, 0.4],     // 爆炸高度范围（从顶部算）
        CONFETTI_COUNT: 200,
        CONFETTI_STOP_THRESHOLD: 0.9,  // 彩带到达此位置时停止发射
    };

    // 粒子类型配置
    static PARTICLE_TYPES = {
        willow: { friction: 0.985, gravity: 2.5, trail: 6 },
        chrysanthemum: { friction: 0.99, gravity: 1.5, trail: 8 },
        star: { friction: 0.98, gravity: 1.8, trail: 5 },
        circle: { friction: 0.985, gravity: 1.6, trail: 6 },
    };

    // 烟花配色
    static PALETTES = [
        ['#ff6b6b', '#ee5a52', '#ff8787', '#ffa8a8'],
        ['#ffd43b', '#fab005', '#ffe066', '#fff3bf'],
        ['#69db7c', '#40c057', '#8ce99a', '#b2f2bb'],
        ['#74c0fc', '#339af0', '#a5d8ff', '#d0ebff'],
        ['#b197fc', '#845ef7', '#d0bfff', '#e5dbff'],
        ['#ffc9c9', '#ff8787', '#ffdeeb', '#f783ac'],
        ['#63e6be', '#20c997', '#96f2d7', '#c3fae8'],
        ['#ffa94d', '#fd7e14', '#ffc078', '#ffe8cc'],
    ];

    // 彩带配色（高饱和度）
    static CONFETTI_COLORS = [
        '#FF1744', '#F50057', '#D500F9', '#651FFF',
        '#2979FF', '#00B0FF', '#00E5FF', '#1DE9B6',
        '#00E676', '#76FF03', '#FFEA00', '#FFC400',
        '#FF9100', '#FF3D00',
    ];

    constructor() {
        this.clickCount = 0;
        this.clickTimer = null;
        this.isPlaying = false;
        this.canLaunch = false;
        this.animationId = null;
        this.canvas = null;
        this.ctx = null;
        this.rockets = [];
        this.particles = [];
        this.confetti = [];
        this.wind = 0;
        this.windDelta = 0;
        this.init();
    }

    init() {
        const el = document.getElementById('version-easter-egg');
        if (!el) return;
        el.style.cursor = 'pointer';
        el.addEventListener('click', () => this.onClick());

        this.canvas = document.getElementById('fireworks-canvas');
        if (this.canvas) {
            this.ctx = this.canvas.getContext('2d');
            this.resize();
            window.addEventListener('resize', () => this.resize());
        }
    }

    resize() {
        if (this.canvas) {
            this.canvas.width = window.innerWidth;
            this.canvas.height = window.innerHeight;
        }
    }

    onClick() {
        const { CLICK_COUNT, CLICK_TIMEOUT } = CelebrationManager.CONFIG;
        clearTimeout(this.clickTimer);
        this.clickTimer = setTimeout(() => this.clickCount = 0, CLICK_TIMEOUT);
        if (++this.clickCount >= CLICK_COUNT && !this.isPlaying) {
            this.clickCount = 0;
            this.start();
        }
    }

    // 工具方法
    rand = (min, max) => Math.random() * (max - min) + min;
    randInt = (min, max) => Math.floor(this.rand(min, max + 1));
    pick = arr => arr[this.randInt(0, arr.length - 1)];
    hexToRgba = (hex, a) => {
        const n = parseInt(hex.slice(1), 16);
        return `rgba(${n >> 16},${(n >> 8) & 255},${n & 255},${a})`;
    };

    // ========== 烟花 ==========
    createRocket() {
        const { w, h } = { w: this.canvas.width, h: this.canvas.height };
        const [minH, maxH] = CelebrationManager.CONFIG.ROCKET_HEIGHT;
        const targetY = h * this.rand(minH, maxH);
        const palette = this.pick(CelebrationManager.PALETTES);

        this.rockets.push({
            x: this.rand(w * 0.15, w * 0.85),
            y: h,
            vx: this.rand(-0.3, 0.3),
            vy: -Math.sqrt(2 * CelebrationManager.CONFIG.GRAVITY * 1.5 * (h - targetY)) * this.rand(0.9, 1.1),
            palette,
            color: palette[0],
            trail: [],
        });
    }

    updateRockets() {
        const { GRAVITY } = CelebrationManager.CONFIG;
        for (let i = this.rockets.length - 1; i >= 0; i--) {
            const r = this.rockets[i];
            r.trail.push({ x: r.x, y: r.y, a: 1 });
            if (r.trail.length > 12) r.trail.shift();
            r.trail.forEach(t => t.a *= 0.85);

            r.x += r.vx + this.wind * 0.3;
            r.y += r.vy;
            r.vy += GRAVITY * 1.5;
            r.vx *= 0.99;

            if (r.vy >= -2) {
                this.explode(r.x, r.y, r.palette);
                this.rockets.splice(i, 1);
            }
        }
    }

    drawRockets() {
        for (const r of this.rockets) {
            for (let i = 0; i < r.trail.length; i++) {
                const t = r.trail[i];
                if (t.a < 0.01) continue;
                this.ctx.beginPath();
                this.ctx.arc(t.x, t.y, 3 * i / r.trail.length, 0, Math.PI * 2);
                this.ctx.fillStyle = this.hexToRgba(r.color, t.a * 0.8);
                this.ctx.fill();
            }
            this.ctx.beginPath();
            this.ctx.arc(r.x, r.y, 4, 0, Math.PI * 2);
            this.ctx.fillStyle = r.color;
            this.ctx.shadowBlur = 20;
            this.ctx.shadowColor = r.color;
            this.ctx.fill();
            this.ctx.shadowBlur = 0;
        }
    }

    explode(x, y, palette) {
        const types = ['circle', 'chrysanthemum', 'willow', 'star', 'double'];
        const type = this.pick(types);
        const n = this.randInt(80, 120);

        if (type === 'star') {
            const pts = this.randInt(5, 8);
            for (let i = 0; i < pts; i++) {
                const base = (Math.PI * 2 / pts) * i;
                for (let j = 0; j < 15; j++) {
                    this.addParticle(x, y, base + this.rand(-0.15, 0.15), this.rand(3, 7), palette, 'star');
                }
            }
        } else if (type === 'double') {
            for (let i = 0; i < n / 2; i++) {
                this.addParticle(x, y, (Math.PI * 4 / n) * i, this.rand(2, 4), palette, 'circle');
                this.addParticle(x, y, (Math.PI * 4 / n) * i + Math.PI / n, this.rand(4, 6), palette, 'circle');
            }
        } else {
            const speeds = { circle: [2.5, 6], chrysanthemum: [4, 8], willow: [2, 5] };
            const [min, max] = speeds[type];
            for (let i = 0; i < n; i++) {
                const angle = (Math.PI * 2 / n) * i + (type === 'chrysanthemum' ? this.rand(-0.1, 0.1) : 0);
                this.addParticle(x, y, angle, this.rand(min, max), palette, type);
            }
        }
    }

    addParticle(x, y, angle, speed, palette, type) {
        const cfg = CelebrationManager.PARTICLE_TYPES[type] || CelebrationManager.PARTICLE_TYPES.circle;
        this.particles.push({
            x, y,
            vx: Math.cos(angle) * speed,
            vy: Math.sin(angle) * speed,
            color: this.pick(palette),
            size: this.rand(1.5, 3),
            life: 1,
            decay: this.rand(0.008, 0.014),
            friction: cfg.friction,
            gravity: cfg.gravity,
            trailLen: cfg.trail,
            trail: [],
            twinkle: Math.random() > 0.7,
        });
    }

    updateParticles() {
        const { GRAVITY } = CelebrationManager.CONFIG;
        for (let i = this.particles.length - 1; i >= 0; i--) {
            const p = this.particles[i];
            p.trail.push({ x: p.x, y: p.y, a: p.life });
            if (p.trail.length > p.trailLen) p.trail.shift();

            p.x += p.vx + this.wind;
            p.y += p.vy;
            p.vx *= p.friction;
            p.vy *= p.friction;
            p.vy += GRAVITY * p.gravity;
            p.life -= p.decay;

            if (p.life <= 0) this.particles.splice(i, 1);
        }
    }

    drawParticles() {
        const now = Date.now();
        for (const p of this.particles) {
            // 拖尾
            for (let i = 0; i < p.trail.length; i++) {
                const t = p.trail[i];
                const a = (i / p.trail.length) * t.a * 0.4;
                if (a < 0.01) continue;
                this.ctx.beginPath();
                this.ctx.arc(t.x, t.y, p.size * (0.4 + 0.6 * i / p.trail.length), 0, Math.PI * 2);
                this.ctx.fillStyle = this.hexToRgba(p.color, a);
                this.ctx.fill();
            }
            // 粒子
            let a = p.life;
            if (p.twinkle) a *= 0.5 + Math.sin(now * 0.02 + p.x) * 0.5;
            this.ctx.beginPath();
            this.ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
            this.ctx.fillStyle = this.hexToRgba(p.color, a);
            this.ctx.shadowBlur = 8;
            this.ctx.shadowColor = p.color;
            this.ctx.fill();
            this.ctx.shadowBlur = 0;
        }
    }

    // ========== 彩带 ==========
    createConfetti() {
        const { CONFETTI_COUNT } = CelebrationManager.CONFIG;
        const colors = CelebrationManager.CONFETTI_COLORS;
        const w = this.canvas.width;

        for (let i = 0; i < CONFETTI_COUNT; i++) {
            setTimeout(() => {
                if (!this.isPlaying) return;
                this.confetti.push({
                    x: this.rand(0, w),
                    y: this.rand(-60, -10),
                    vx: this.rand(-1.5, 1.5),
                    vy: this.rand(2, 4),
                    w: this.rand(10, 18),
                    h: this.rand(18, 30),
                    color: this.pick(colors),
                    rot: this.rand(0, Math.PI * 2),
                    rotV: this.rand(-0.15, 0.15),
                    osc: this.rand(0, Math.PI * 2),
                    oscV: this.rand(0.03, 0.08),
                    oscD: this.rand(1, 3),
                });
            }, i * 12);
        }
    }

    updateConfetti() {
        const h = this.canvas.height;
        for (let i = this.confetti.length - 1; i >= 0; i--) {
            const c = this.confetti[i];
            c.osc += c.oscV;
            c.x += c.vx + Math.sin(c.osc) * c.oscD + this.wind * 0.5;
            c.y += c.vy;
            c.rot += c.rotV;
            c.vy = Math.min(c.vy + 0.02, 6);
            if (c.y > h + 30) this.confetti.splice(i, 1);
        }
    }

    drawConfetti() {
        for (const c of this.confetti) {
            this.ctx.save();
            this.ctx.translate(c.x, c.y);
            this.ctx.rotate(c.rot);
            this.ctx.scale(Math.cos(c.osc * 2), 1);
            this.ctx.beginPath();
            this.ctx.roundRect(-c.w / 2, -c.h / 2, c.w, c.h, 2);
            this.ctx.fillStyle = c.color;
            this.ctx.fill();
            this.ctx.fillStyle = 'rgba(255,255,255,0.3)';
            this.ctx.fillRect(-c.w / 2, -c.h / 2, c.w * 0.3, c.h);
            this.ctx.restore();
        }
    }

    // ========== 主控制 ==========
    start() {
        this.isPlaying = true;
        this.canLaunch = true;
        this.rockets = [];
        this.particles = [];
        this.confetti = [];
        this.wind = 0;
        this.windDelta = 0;

        this.canvas?.classList.add('active');
        this.launchFireworks();
        this.createConfetti();
        this.animate();
    }

    launchFireworks() {
        for (let i = 0; i < 4; i++) {
            setTimeout(() => this.canLaunch && this.createRocket(), i * 150);
        }
        const id = setInterval(() => {
            if (!this.isPlaying || !this.canLaunch) return clearInterval(id);
            if (Math.random() < 0.4) this.createRocket();
        }, 250);
    }

    animate() {
        if (!this.isPlaying) return;

        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

        // 风力
        this.windDelta += this.rand(-0.01, 0.01);
        this.windDelta *= 0.98;
        this.wind = Math.max(-0.5, Math.min(0.5, this.wind + this.windDelta));

        this.updateRockets();
        this.updateParticles();
        this.updateConfetti();

        // 彩带到底部时停止发射
        if (this.canLaunch && this.confetti.length > 0) {
            const lowest = Math.max(...this.confetti.map(c => c.y));
            if (lowest > this.canvas.height * CelebrationManager.CONFIG.CONFETTI_STOP_THRESHOLD) {
                this.canLaunch = false;
            }
        }

        this.drawConfetti();
        this.drawRockets();
        this.drawParticles();

        // 结束检测
        if (!this.canLaunch && !this.rockets.length && !this.particles.length && !this.confetti.length) {
            return this.stop();
        }

        this.animationId = requestAnimationFrame(() => this.animate());
    }

    stop() {
        this.isPlaying = false;
        this.canLaunch = false;
        cancelAnimationFrame(this.animationId);
        this.animationId = null;
        this.canvas?.classList.remove('active');
        this.ctx?.clearRect(0, 0, this.canvas.width, this.canvas.height);
        this.rockets = [];
        this.particles = [];
        this.confetti = [];
    }
}

// 初始化
const celebration = new CelebrationManager();
