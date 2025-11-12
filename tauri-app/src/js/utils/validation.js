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
        if (!token.startsWith('sk-ant-')) {
            return { valid: false, error: 'API Token 格式不正确，应以 sk-ant- 开头' };
        }
        return { valid: true };
    },

    /**
     * 验证 URL（可选）
     * @param {string} url - URL 地址
     * @returns {{valid: boolean, error?: string}} 验证结果
     */
    validateUrl(url) {
        if (!url || !url.trim()) {
            return { valid: true }; // URL 是可选的
        }
        try {
            new URL(url);
            return { valid: true };
        } catch {
            return { valid: false, error: 'URL 格式不正确' };
        }
    }
};

