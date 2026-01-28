/**
 * iOS 风格弹性滚动效果
 * 当滚动到顶部或底部边界后继续滚动，产生橡皮筋回弹效果
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

            this.init();
        }

        init() {
            this.element.style.overscrollBehavior = 'none';
            this.element.addEventListener('wheel', this.onWheel.bind(this), { passive: false });
        }

        isAtTop() {
            return this.element.scrollTop <= 0;
        }

        isAtBottom() {
            return this.element.scrollTop >= this.element.scrollHeight - this.element.clientHeight - 1;
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
                    return;
                }

                this.applyTransform();
                this.animationFrame = requestAnimationFrame(animate);
            };

            this.animationFrame = requestAnimationFrame(animate);
        }

        destroy() {
            if (this.animationFrame) cancelAnimationFrame(this.animationFrame);
            if (this.bounceTimeout) clearTimeout(this.bounceTimeout);
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
