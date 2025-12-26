/**
 * 主应用入口
 * 整合所有模块并初始化应用
 * 
 * 模块加载顺序：
 * 1. 工具模块 (utils)
 * 2. 核心模块 (core)
 * 3. UI 模块 (ui)
 * 4. 功能模块 (features)
 * 5. 主入口 (app.js)
 */

// 应用初始化
document.addEventListener('DOMContentLoaded', async () => {
    // 确保 Tauri API 已初始化
    if (!api.init()) {
        console.error('Tauri API 未初始化，请确保应用在 Tauri 环境中运行');
        return;
    }
    await initializeApp();
});

/**
 * 初始化应用
 */
async function initializeApp() {
    // 从后端获取用户主目录
    let homeDirectory = 'C:\\Users\\Default';
    try {
        homeDirectory = await api.getHomeDir();
    } catch (e) {
        console.error('Failed to get home directory:', e);
    }
    
    // 初始化状态
    state.initConfigPath(homeDirectory);

    // 初始化 UI
    i18n.setLanguage(state.language);
    theme.applyTheme(state.theme);
    
    // 设置事件监听
    setupEventListeners();
    
    // 初始化各个模块
    navigation.init();
    titlebar.init();
    confirmDialog.init();
    settings.init();
    droid.init();
    
    // 更新 UI 语言
    updateUILanguage();
    
    // 加载渠道列表
    await channels.loadChannels();
    await droid.loadChannels();
}

/**
 * 设置事件监听器
 */
function setupEventListeners() {
    // 模态框相关
    const addBtn = document.getElementById('add-channel-btn');
    const refreshBtn = document.getElementById('refresh-channel-btn');
    const closeBtn = document.getElementById('modal-close-btn');
    const cancelBtn = document.getElementById('modal-cancel-btn');
    const saveBtn = document.getElementById('modal-save-btn');

    if (addBtn) {
        addBtn.addEventListener('click', () => modal.openNew());
    }
    
    if (refreshBtn) {
        // 使用防抖处理刷新操作
        const debouncedRefresh = debounce(() => channels.refreshChannels(), 300);
        refreshBtn.addEventListener('click', debouncedRefresh);
    }
    
    if (closeBtn) {
        closeBtn.addEventListener('click', () => modal.close());
    }
    
    if (cancelBtn) {
        cancelBtn.addEventListener('click', () => modal.close());
    }
    
    if (saveBtn) {
        saveBtn.addEventListener('click', () => channels.saveChannel());
    }

    // 主题切换开关
    const themeCheckbox = document.getElementById('theme-checkbox');
    if (themeCheckbox) {
        themeCheckbox.addEventListener('change', () => {
            const newTheme = theme.toggle();
            state.theme = newTheme;
        });
    }
}

/**
 * 更新 UI 语言
 * 全局函数，可在任何地方调用
 */
function updateUILanguage() {
    document.title = i18n.t('app.title');
    
    // 更新 meta description
    const metaDescription = document.querySelector('meta[name="description"]');
    if (metaDescription) {
        metaDescription.setAttribute('content', i18n.t('app.description'));
    }

    titlebar.updateLanguage();
    navigation.updateLanguage();
    channels.updateLanguage();
    droid.updateLanguage();
    settings.updateLanguage();
    modal.updateLanguage();
    confirmDialog.updateLanguage();
}

// 将函数暴露到全局作用域，以便其他模块可以调用
window.updateUILanguage = updateUILanguage;
