/**
 * 庆祝效果 - Canvas 烟花 + 彩带
 */
class CelebrationManager {
    constructor() {
        this.clickCount = 0;
        this.clickTimer = null;
        this.isPlaying = false;
        this.canvas = null;
        this.ctx = null;
        this.particles = [];
        this.animationId = null;
        this.colors = [
            '#ff6b6b', '#feca57', '#48dbfb', '#ff9ff3',
            '#54a0ff', '#5f27cd', '#00d2d3', '#ff9f43',
            '#10ac84', '#ee5a24', '#0abde3', '#f368e0',
            '#fd79a8', '#a29bfe', '#ffeaa7', '#dfe6e9'
        ];
        this.init();
    }

    init() {
        const versionEl = document.getElementById('version-easter-egg');
        if (!versionEl) return;

        versionEl.style.cursor = 'pointer';
        versionEl.addEventListener('click', () => this.handleClick());

        // 初始化 Canvas
        this.canvas = document.getElementById('fireworks-canvas');
        if (this.canvas) {
            this.ctx = this.canvas.getContext('2d');
            this.resizeCanvas();
            window.addEventListener('resize', () => this.resizeCanvas());
        }
    }

    resizeCanvas() {
        if (this.canvas) {
            this.canvas.width = window.innerWidth;
            this.canvas.height = window.innerHeight;
        }
    }

    handleClick() {
        this.clickCount++;

        if (this.clickTimer) {
            clearTimeout(this.clickTimer);
        }

        this.clickTimer = setTimeout(() => {
            this.clickCount = 0;
        }, 2000);

        if (this.clickCount >= 3 && !this.isPlaying) {
            this.clickCount = 0;
            this.startCelebration();
        }
    }

    random(min, max) {
        return Math.random() * (max - min) + min;
    }

    startCelebration() {
        this.isPlaying = true;
        this.particles = [];
        this.canLaunch = true;

        // 显示 Canvas
        if (this.canvas) {
            this.canvas.classList.add('active');
        }

        // 启动烟花
        this.launchFireworks();

        // 启动彩带
        this.launchConfetti();

        // 开始动画循环
        this.animate();

        // 5秒后停止发射新烟花
        setTimeout(() => {
            this.canLaunch = false;
        }, 5000);
    }

    stopCelebration() {
        this.isPlaying = false;
        this.canLaunch = false;
        if (this.animationId) {
            cancelAnimationFrame(this.animationId);
            this.animationId = null;
        }
        if (this.canvas) {
            this.canvas.classList.remove('active');
            this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        }
        this.particles = [];
    }

    // 创建烟花火箭
    createRocket() {
        const x = this.random(100, this.canvas.width - 100);
        const y = this.canvas.height;
        const hue = Math.floor(this.random(0, 360));
        const color = `hsl(${hue}, 100%, 60%)`;

        this.particles.push({
            x: x,
            y: y,
            color: color,
            hue: hue,
            velocity: {
                x: this.random(-1, 1),
                y: this.random(-14, -18)
            },
            alpha: 1,
            friction: 0.98,
            gravity: 0.12,
            isRocket: true,
            size: 3
        });
    }

    // 爆炸效果
    explode(x, y, hue) {
        const particleCount = 80;
        for (let i = 0; i < particleCount; i++) {
            const angle = (Math.PI * 2 / particleCount) * i;
            const speed = this.random(2, 10);
            // 稍微变化色相，产生渐变效果
            const particleHue = hue + this.random(-20, 20);

            this.particles.push({
                x: x,
                y: y,
                color: `hsl(${particleHue}, 100%, 60%)`,
                velocity: {
                    x: Math.cos(angle) * speed,
                    y: Math.sin(angle) * speed
                },
                alpha: 1,
                friction: 0.96,
                gravity: 0.15,
                isRocket: false,
                size: this.random(1.5, 3)
            });
        }
    }

    // 发射烟花
    launchFireworks() {
        // 立即发射几个
        for (let i = 0; i < 3; i++) {
            setTimeout(() => {
                if (this.canLaunch) this.createRocket();
            }, i * 200);
        }

        // 持续发射
        const launchInterval = setInterval(() => {
            if (!this.isPlaying || !this.canLaunch) {
                clearInterval(launchInterval);
                return;
            }
            if (Math.random() < 0.3) {
                this.createRocket();
            }
        }, 300);
    }

    // 彩带效果
    launchConfetti() {
        const container = document.createElement('div');
        container.className = 'celebration-container';
        document.body.appendChild(container);

        const confettiCount = 150;

        for (let i = 0; i < confettiCount; i++) {
            setTimeout(() => {
                if (!this.isPlaying) return;

                const confetti = document.createElement('div');
                confetti.className = 'confetti';

                const color = this.colors[Math.floor(Math.random() * this.colors.length)];
                const width = 8 + Math.random() * 8;
                const height = 15 + Math.random() * 15;

                confetti.style.width = width + 'px';
                confetti.style.height = height + 'px';
                confetti.style.background = color;
                confetti.style.left = Math.random() * window.innerWidth + 'px';
                confetti.style.top = '-30px';
                confetti.style.borderRadius = Math.random() > 0.5 ? '2px' : '50%';

                container.appendChild(confetti);

                const duration = 3000 + Math.random() * 2000;
                const horizontalDrift = (Math.random() - 0.5) * 200;
                const rotations = 2 + Math.random() * 4;

                confetti.animate([
                    {
                        transform: `translateX(0) translateY(0) rotate(0deg)`,
                        opacity: 1
                    },
                    {
                        transform: `translateX(${horizontalDrift * 0.3}px) translateY(${window.innerHeight * 0.3}px) rotate(${rotations * 120}deg)`,
                        opacity: 1,
                        offset: 0.3
                    },
                    {
                        transform: `translateX(${horizontalDrift * 0.7}px) translateY(${window.innerHeight * 0.7}px) rotate(${rotations * 280}deg)`,
                        opacity: 0.8,
                        offset: 0.7
                    },
                    {
                        transform: `translateX(${horizontalDrift}px) translateY(${window.innerHeight + 50}px) rotate(${rotations * 360}deg)`,
                        opacity: 0
                    }
                ], {
                    duration: duration,
                    easing: 'cubic-bezier(0.25, 0.1, 0.25, 1)',
                    fill: 'forwards'
                });

                setTimeout(() => confetti.remove(), duration);
            }, Math.random() * 2000);
        }

        // 清理容器
        setTimeout(() => container.remove(), 6000);
    }

    // 动画循环
    animate() {
        if (!this.isPlaying) return;

        // 清除画布保持透明
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

        // 更新和绘制粒子
        for (let i = this.particles.length - 1; i >= 0; i--) {
            const p = this.particles[i];

            // 更新位置（先更新再绘制）
            p.velocity.x *= p.friction;
            p.velocity.y *= p.friction;

            if (!p.isRocket) {
                p.velocity.y += p.gravity;
                p.alpha -= 0.012;
            }

            p.x += p.velocity.x;
            p.y += p.velocity.y;

            // 移除消失的粒子（alpha 阈值提高，避免闪现）
            if (p.alpha <= 0.05) {
                this.particles.splice(i, 1);
                continue;
            }

            // 火箭到达顶点时爆炸
            if (p.isRocket && p.velocity.y >= -1) {
                this.particles.splice(i, 1);
                this.explode(p.x, p.y, p.hue);
                continue;
            }

            // 保存历史位置用于拖尾
            if (!p.trail) p.trail = [];
            p.trail.push({ x: p.x, y: p.y });
            if (p.trail.length > 6) p.trail.shift();

            // 绘制拖尾
            for (let j = 0; j < p.trail.length; j++) {
                const t = p.trail[j];
                const trailAlpha = (j / p.trail.length) * p.alpha * 0.4;
                if (trailAlpha < 0.02) continue;
                this.ctx.save();
                this.ctx.globalAlpha = trailAlpha;
                this.ctx.beginPath();
                this.ctx.arc(t.x, t.y, p.size * (0.3 + 0.7 * j / p.trail.length), 0, Math.PI * 2);
                this.ctx.fillStyle = p.color;
                this.ctx.fill();
                this.ctx.restore();
            }

            // 绘制粒子
            this.ctx.save();
            this.ctx.globalAlpha = p.alpha;
            this.ctx.beginPath();
            this.ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
            this.ctx.fillStyle = p.color;
            this.ctx.shadowBlur = p.isRocket ? 15 : 10;
            this.ctx.shadowColor = p.color;
            this.ctx.fill();
            this.ctx.restore();
        }

        // 如果停止发射且没有粒子了，结束动画
        if (!this.canLaunch && this.particles.length === 0) {
            this.stopCelebration();
            return;
        }

        this.animationId = requestAnimationFrame(() => this.animate());
    }
}

// 创建全局实例
const celebration = new CelebrationManager();
