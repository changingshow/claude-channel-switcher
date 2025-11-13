/**
 * 验证工具函数
 */
const Validation = {
    /**
     * 验证渠道名称
     * @param {string} name - 渠道名称
     * @returns {{valid: boolean, error?: string}} 验证结果
     */
    validateChannelName(name) {
        if (!name || !name.trim()) {
            return { valid: false, error: 'messages.errorNameRequired' };
        }
        if (name.length > 50) {
            return { valid: false, error: '渠道名称不能超过 50 个字符' };
        }
        return { valid: true };
    },

    /**
     * 验证 API Token
     * @param {string} token - API Token
     * @returns {{valid: boolean, error?: string}} 验证结果
     */
    validateToken(token) {
        if (!token || !token.trim()) {
            return { valid: false, error: 'messages.errorTokenRequired' };
        }
        return { valid: true };
    },

    /**
     * 验证 URL（必填，必须是 http 或 https）
     * @param {string} url - URL 地址
     * @returns {{valid: boolean, error?: string}} 验证结果
     */
    validateUrl(url) {
        if (!url || !url.trim()) {
            return { valid: false, error: 'messages.errorUrlRequired' };
        }
        try {
            const urlObj = new URL(url);
            if (urlObj.protocol !== 'http:' && urlObj.protocol !== 'https:') {
                return { valid: false, error: 'messages.errorUrlInvalid' };
            }
            return { valid: true };
        } catch {
            return { valid: false, error: 'messages.errorUrlInvalid' };
        }
    }
};

