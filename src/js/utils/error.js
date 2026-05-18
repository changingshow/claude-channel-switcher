/**
 * 错误处理工具类
 * 提供统一的错误处理和格式化功能
 */
class ErrorHandler {
    /**
     * 处理错误并返回格式化的错误消息
     * @param {Error|string|object} error - 错误对象
     * @param {string} context - 错误上下文（可选）
     * @returns {string} 格式化的错误消息
     */
    static handle(error, context = '') {
        const errorMessage = this.formatError(error);
        if (context) {
            console.error(`[${context}]`, errorMessage);
        } else {
            console.error(errorMessage);
        }
        return errorMessage;
    }

    /**
     * 格式化错误对象为字符串
     * @param {Error|string|object} error - 错误对象
     * @returns {string} 格式化的错误消息
     */
    static formatError(error) {
        if (error instanceof Error) {
            return error.message;
        }
        if (typeof error === 'string') {
            return error;
        }
        if (error?.error) {
            return error.error;
        }
        return '未知错误';
    }

    /**
     * 显示错误提示（需要 toast 模块已加载）
     * @param {Error|string|object} error - 错误对象
     * @param {string} context - 错误上下文
     */
    static showError(error, context = '') {
        const message = this.formatError(error);
        if (typeof showToast === 'function') {
            showToast(context ? `${context}: ${message}` : message);
        } else {
            console.error('showToast is not available');
        }
    }
}

