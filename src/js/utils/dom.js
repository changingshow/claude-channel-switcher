/**
 * DOM 工具函数
 */
const DOMUtils = {
    /**
     * 转义 HTML 特殊字符
     * @param {string} text - 要转义的文本
     * @returns {string} 转义后的文本
     */
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    },

    /**
     * 设置元素加载状态
     * @param {HTMLElement} element - 目标元素
     * @param {boolean} isLoading - 是否处于加载状态
     */
    setElementState(element, isLoading) {
        if (!element) return;
        
        if (element.tagName === 'BUTTON') {
            element.disabled = isLoading;
            element.style.opacity = isLoading ? '0.5' : '1';
            element.style.cursor = isLoading ? 'not-allowed' : 'pointer';
        } else {
            element.style.opacity = isLoading ? '0.5' : '1';
            element.style.filter = isLoading ? 'blur(2px)' : 'none';
        }
    },

    /**
     * 更新按钮组状态
     * @param {string} selector - 按钮选择器
     * @param {string} dataAttribute - 数据属性名
     * @param {string} stateValue - 状态值
     */
    updateButtonGroup(selector, dataAttribute, stateValue) {
        const buttons = document.querySelectorAll(selector);
        buttons.forEach(btn => {
            const isActive = btn.dataset[dataAttribute] === stateValue;
            btn.style.borderColor = isActive ? 'var(--accent-primary)' : '';
            btn.style.color = isActive ? 'var(--accent-primary)' : '';
        });
    }
};

