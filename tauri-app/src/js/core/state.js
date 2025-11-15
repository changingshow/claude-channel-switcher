/**
 * 应用状态管理类
 * 管理全局应用状态和本地存储
 */
class AppState {
    constructor() {
        this.configPath = '';
        this.terminal = localStorage.getItem('terminal') || 'wt';
        this.terminalDir = '';
        this.theme = localStorage.getItem('theme') || 'dark';
        this.language = localStorage.getItem('language') || 'zh-CN';
        this.channels = {};
        this.activeChannelName = null;
        this.editingChannel = null;
    }

    /**
     * 保存状态到本地存储
     * @param {string} key - 状态键名
     * @param {any} value - 状态值
     */
    save(key, value) {
        this[key] = value;
        if (['terminal', 'theme', 'language', 'configPath', 'terminalDir'].includes(key)) {
            localStorage.setItem(key, value);
        }
    }

    /**
     * 从本地存储加载状态
     * @param {string} key - 状态键名
     * @param {any} defaultValue - 默认值
     * @returns {any} 状态值
     */
    load(key, defaultValue) {
        return localStorage.getItem(key) || defaultValue;
    }

    /**
     * 初始化配置路径
     * @param {string} homeDirectory - 用户主目录
     */
    initConfigPath(homeDirectory) {
        const defaultConfigPath = `${homeDirectory}\\.claude`;
        this.configPath = this.load('configPath', defaultConfigPath);
        this.terminalDir = this.load('terminalDir', homeDirectory);
    }
}

// 创建全局状态实例
const state = new AppState();

