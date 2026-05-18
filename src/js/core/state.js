/**
 * 默认前端菜单配置。
 * settings 必须始终存在，其余菜单至少保留一个可见项。
 */
const DEFAULT_MENU_SETTINGS = [
    { page: 'channels', visible: true },
    { page: 'statusline', visible: true },
    { page: 'codex', visible: true },
    { page: 'droid', visible: true },
    { page: 'settings', visible: true }
];

const REQUIRED_MENU_PAGE = 'settings';

/**
 * 应用状态管理类
 * 管理全局应用状态和本地存储
 */
class AppState {
    constructor() {
        this.configPath = '';
        this.codexConfigPath = '';
        this.terminalDir = '';
        this.appVersion = '';
        this.theme = localStorage.getItem('theme') || 'dark';
        this.language = localStorage.getItem('language') || 'zh-CN';
        this.activePage = 'channels';
        this.menuSettings = this.getDefaultMenuSettings();
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
        if (key === 'menuSettings') {
            const normalizedMenuSettings = this.normalizeMenuSettings(value);
            this[key] = normalizedMenuSettings;
            return;
        }

        this[key] = value;
        if (['theme', 'language', 'configPath', 'codexConfigPath', 'terminalDir'].includes(key)) {
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
     * 获取默认菜单设置副本
     * @returns {Array<{page: string, visible: boolean}>} 菜单设置
     */
    getDefaultMenuSettings() {
        return DEFAULT_MENU_SETTINGS.map(item => ({ ...item }));
    }

    /**
     * 规范化菜单配置，保证设置菜单存在且至少保留一个非设置菜单
     * @param {string|Array<{page: string, visible: boolean}>} value - 原始菜单设置
     * @returns {Array<{page: string, visible: boolean}>} 规范化后的菜单设置
     */
    normalizeMenuSettings(value) {
        let source = value;

        if (typeof source === 'string') {
            try {
                source = JSON.parse(source);
            } catch (error) {
                source = null;
            }
        }

        if (!Array.isArray(source)) {
            source = this.getDefaultMenuSettings();
        }

        const defaultPages = DEFAULT_MENU_SETTINGS.map(item => item.page);
        const knownPages = new Set(defaultPages);
        const normalized = [];
        const usedPages = new Set();

        source.forEach(item => {
            const page = typeof item === 'string' ? item : item?.page;
            if (!knownPages.has(page) || usedPages.has(page)) {
                return;
            }

            normalized.push({
                page,
                visible: page === REQUIRED_MENU_PAGE || item?.visible !== false
            });
            usedPages.add(page);
        });

        DEFAULT_MENU_SETTINGS.forEach(item => {
            if (!usedPages.has(item.page)) {
                normalized.push({ ...item });
            }
        });

        const settingsItem = normalized.find(item => item.page === REQUIRED_MENU_PAGE);
        if (settingsItem) {
            settingsItem.visible = true;
        } else {
            normalized.push({ page: REQUIRED_MENU_PAGE, visible: true });
        }

        const hasVisibleNonSettings = normalized.some(item => item.page !== REQUIRED_MENU_PAGE && item.visible);
        if (!hasVisibleNonSettings) {
            const firstOptionalMenu = normalized.find(item => item.page !== REQUIRED_MENU_PAGE);
            if (firstOptionalMenu) {
                firstOptionalMenu.visible = true;
            }
        }

        return normalized;
    }

    /**
     * 初始化配置路径
     * @param {string} homeDirectory - 用户主目录
     */
    initConfigPath(homeDirectory) {
        const defaultConfigPath = `${homeDirectory}\\.claude`;
        const defaultCodexConfigPath = `${homeDirectory}\\.codex`;
        this.configPath = this.load('configPath', defaultConfigPath);
        this.codexConfigPath = this.load('codexConfigPath', defaultCodexConfigPath);
        this.terminalDir = this.load('terminalDir', homeDirectory);
    }
}

// 创建全局状态实例
const state = new AppState();

