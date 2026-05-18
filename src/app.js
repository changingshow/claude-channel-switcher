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

let appRevealed = false;

// 应用初始化
document.addEventListener('DOMContentLoaded', async () => {
    // 确保 Tauri API 已初始化
    if (!api.init()) {
        console.error('Tauri API 未初始化，请确保应用在 Tauri 环境中运行');
        revealApp();
        return;
    }
    try {
        await initializeApp();
    } finally {
        revealApp();
    }
});

/**
 * 显示应用主界面
 */
function revealApp() {
    if (appRevealed) {
        return;
    }
    document.documentElement.classList.remove('app-initializing');
    appRevealed = true;
}

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
    try {
        const lastActivePage = await api.getLastActivePage();
        if (lastActivePage) {
            state.save('activePage', lastActivePage);
        }
    } catch (e) {
        console.error('Failed to get last active page:', e);
    }

    // 读取运行时应用版本，避免在前端重复维护一份静态版本号
    try {
        const appVersion = await api.getAppVersion();
        state.appVersion = appVersion ? `v${appVersion}` : '';
    } catch (e) {
        console.error('Failed to get app version:', e);
        state.appVersion = '';
    }

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
    codex.init();
    droid.init();
    statusline.init();

    const loadedPages = await loadInitialPageData();

    // 更新 UI 语言
    updateUILanguage();
    navigation.locateActiveCardForPage(state.activePage, { behavior: 'auto' });
    revealApp();

    await loadRemainingChannelData(loadedPages);
}

/**
 * 先加载当前菜单的数据，避免首屏出现空列表再刷新
 * @returns {Promise<Set<string>>} 已加载页面集合
 */
async function loadInitialPageData() {
    const loadedPages = new Set();

    if (state.activePage === 'channels') {
        await channels.loadChannels();
        loadedPages.add('channels');
    } else if (state.activePage === 'codex') {
        await codex.loadChannels();
        loadedPages.add('codex');
    } else if (state.activePage === 'droid') {
        await droid.loadChannels();
        loadedPages.add('droid');
    }

    return loadedPages;
}

/**
 * 首屏显示后加载其余渠道数据
 * @param {Set<string>} loadedPages - 已加载页面集合
 */
async function loadRemainingChannelData(loadedPages) {
    const loadTasks = [];

    if (!loadedPages.has('channels')) {
        loadTasks.push(channels.loadChannels());
    }
    if (!loadedPages.has('codex')) {
        loadTasks.push(codex.loadChannels());
    }
    if (!loadedPages.has('droid')) {
        loadTasks.push(droid.loadChannels());
    }

    await Promise.all(loadTasks);
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

    // 定位到激活渠道按钮
    const locateBtn = document.getElementById('locate-active-btn');
    if (locateBtn) {
        locateBtn.addEventListener('click', () => channels.locateActiveChannel());
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
    codex.updateLanguage();
    droid.updateLanguage();
    statusline.updateLanguage();
    settings.updateLanguage();
    modal.updateLanguage();
    confirmDialog.updateLanguage();
}

// 将函数暴露到全局作用域，以便其他模块可以调用
window.updateUILanguage = updateUILanguage;
