/**
 * Toast 提示消息管理
 */
const TOAST_DURATION = 3000;

class ToastManager {
    constructor() {
        this.toastElement = null;
        this.init();
    }

    /**
     * 初始化 Toast 元素
     */
    init() {
        this.toastElement = document.getElementById('toast');
        if (!this.toastElement) {
            console.warn('Toast element not found');
        }
    }

    /**
     * 显示提示消息
     * @param {string} message - 消息内容
     * @param {number} duration - 显示时长（毫秒）
     */
    show(message, duration = TOAST_DURATION) {
        if (!this.toastElement) {
            console.warn('Toast element not initialized');
            return;
        }
        
        this.toastElement.textContent = message;
        this.toastElement.classList.add('show');

        setTimeout(() => {
            this.toastElement.classList.remove('show');
        }, duration);
    }

    /**
     * 隐藏提示消息
     */
    hide() {
        if (this.toastElement) {
            this.toastElement.classList.remove('show');
        }
    }
}

// 创建全局实例
const toast = new ToastManager();

/**
 * 全局 showToast 函数（兼容旧代码）
 * @param {string} message - 消息内容
 */
function showToast(message) {
    toast.show(message);
}

