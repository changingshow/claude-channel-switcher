/**
 * iOS 风格弹性滚动效果
 * 当滚动到顶部或底部边界后继续滚动，产生橡皮筋回弹效果 + 边缘发光
 */
(function () {
    'use strict';

    class ElasticScroll {
        constructor(element) {
            this.element = element;
            this.maxStretch = 80;
            this.stretchRate = 0.4;
            this.springStiffness = 0.12;
            this.dampingFactor = 0.75;
            this.currentStretch = 0;
            this.velocity = 0;
            this.animationFrame = null;
            this.bounceTimeout = null;
            this.glowElement = null;

            this.init();
        }

        init() {
            this.element.style.overscrollBehavior = 'none';
            this.createGlowElement();
            this.element.addEventListener('wheel', this.onWheel.bind(this), { passive: false });
        }

        createGlowElement() {
            this.glowElement = document.createElement('div');
            this.glowElement.className = 'elastic-glow';
            this.glowElement.style.cssText = `
                position: fixed;
                left: 220px;
                right: 0;
                height: 100px;
                pointer-events: none;
                opacity: 0;
                transition: opacity 0.15s ease;
                z-index: 100;
            `;
            document.body.appendChild(this.glowElement);
        }

        isAtTop() {
            return this.element.scrollTop <= 0;
        }

        isAtBottom() {
            return this.element.scrollTop >= this.element.scrollHeight - this.element.clientHeight - 1;
        }

        updateGlow() {
            if (!this.glowElement) return;

            const intensity = Math.min(Math.abs(this.currentStretch) / this.maxStretch, 1);

            if (intensity > 0.05) {
                const isTop = this.currentStretch > 0;
                this.glowElement.style.top = isTop ? '40px' : 'auto';
                this.glowElement.style.bottom = isTop ? 'auto' : '0';
                // 主题色蓝色渐变发光
                this.glowElement.style.background = isTop
                    ? 'radial-gradient(ellipse 90% 100% at 50% 0%, rgba(10, 132, 255, 0.5), transparent 70%)'
                    : 'radial-gradient(ellipse 90% 100% at 50% 100%, rgba(10, 132, 255, 0.5), transparent 70%)';
                this.glowElement.style.opacity = intensity * 0.8;
            } else {
                this.glowElement.style.opacity = '0';
            }
        }

        onWheel(e) {
            const atTop = this.isAtTop();
            const atBottom = this.isAtBottom();
            const scrollingUp = e.deltaY < 0;
            const scrollingDown = e.deltaY > 0;

            if ((atTop && scrollingUp) || (atBottom && scrollingDown)) {
                e.preventDefault();

                if (this.animationFrame) {
                    cancelAnimationFrame(this.animationFrame);
                    this.animationFrame = null;
                }

                const delta = e.deltaY * this.stretchRate;
                const resistance = 1 - Math.abs(this.currentStretch) / this.maxStretch;
                this.currentStretch -= delta * Math.max(resistance, 0.1);
                this.currentStretch = Math.max(-this.maxStretch, Math.min(this.maxStretch, this.currentStretch));

                this.applyTransform();
                this.updateGlow();

                clearTimeout(this.bounceTimeout);
                this.bounceTimeout = setTimeout(() => this.startSpringAnimation(), 100);
            } else if (Math.abs(this.currentStretch) > 0.5) {
                this.startSpringAnimation();
            }
        }

        applyTransform() {
            this.element.style.transform = `translate3d(0, ${this.currentStretch}px, 0)`;
        }

        startSpringAnimation() {
            if (this.animationFrame) {
                cancelAnimationFrame(this.animationFrame);
            }

            const animate = () => {
                this.velocity += -this.springStiffness * this.currentStretch;
                this.velocity *= this.dampingFactor;
                this.currentStretch += this.velocity;

                if (Math.abs(this.currentStretch) < 0.5 && Math.abs(this.velocity) < 0.1) {
                    this.currentStretch = 0;
                    this.velocity = 0;
                    this.element.style.transform = '';
                    this.animationFrame = null;
                    this.updateGlow();
                    return;
                }

                this.applyTransform();
                this.updateGlow();
                this.animationFrame = requestAnimationFrame(animate);
            };

            this.animationFrame = requestAnimationFrame(animate);
        }

        destroy() {
            if (this.animationFrame) cancelAnimationFrame(this.animationFrame);
            if (this.bounceTimeout) clearTimeout(this.bounceTimeout);
            if (this.glowElement) this.glowElement.remove();
            this.element.style.transform = '';
            this.element.style.overscrollBehavior = '';
        }
    }

    function init() {
        const el = document.querySelector('.main-content');
        if (el) window.elasticScrollInstance = new ElasticScroll(el);
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
