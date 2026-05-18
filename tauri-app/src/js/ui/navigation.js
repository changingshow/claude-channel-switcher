/**
 * 导航管理
 */
class NavigationManager {
    constructor() {
        this.defaultPage = 'channels';
    }

    /**
     * 初始化导航
     */
    init() {
        const navItems = document.querySelectorAll('.nav-item');
        navItems.forEach(item => {
            item.addEventListener('click', () => {
                const page = item.dataset.page;
                this.switchPage(page);
            });
        });

        this.restoreLastPage();
    }

    /**
     * 切换页面
     * @param {string} pageName - 页面名称
     * @param {object} options - 切换选项
     * @returns {string} 实际切换到的页面名称
     */
    switchPage(pageName, options = {}) {
        const { persist = true, refresh = true } = options;
        const targetPageName = this.resolvePage(pageName);
        const pages = document.querySelectorAll('.page');
        pages.forEach(page => page.classList.remove('active'));
        const targetPage = document.getElementById(`${targetPageName}-page`);
        if (targetPage) {
            targetPage.classList.add('active');
            // 重置滚动位置到顶部（滚动容器是 .main-content）
            const mainContent = document.querySelector('.main-content');
            if (mainContent) {
                mainContent.scrollTop = 0;
            }
        }

        this.updateActiveNavItem(targetPageName);

        if (persist) {
            this.persistActivePage(targetPageName);
        }

        if (!refresh) {
            return targetPageName;
        }

        if (targetPageName === 'channels' && typeof channels !== 'undefined') {
            const located = this.locateActiveCardForPage(targetPageName, { behavior: 'auto' });
            if (!located && !channels.channelsLoaded) {
                Promise.resolve(channels.loadChannels()).then(() => {
                    this.locateActiveCardForPage(targetPageName, { behavior: 'auto' });
                });
            }
        }

        // 切换到 droid 页面时刷新渠道列表
        if (targetPageName === 'droid' && typeof droid !== 'undefined') {
            droid.loadChannels();
        }

        if (targetPageName === 'codex' && typeof codex !== 'undefined') {
            Promise.resolve(codex.render()).then(() => {
                this.locateActiveCardForPage(targetPageName, { behavior: 'auto' });
            });
        }

        // 切换到 statusline 页面时刷新文件列表
        if (targetPageName === 'statusline' && typeof statusline !== 'undefined') {
            statusline.loadFiles();
        }

        return targetPageName;
    }

    /**
     * 恢复上次打开的页面
     */
    restoreLastPage() {
        state.activePage = this.switchPage(state.activePage, { persist: false, refresh: false });
    }

    /**
     * 解析页面名称，避免已删除或非法页面破坏初始化
     * @param {string} pageName - 页面名称
     * @returns {string} 可用页面名称
     */
    resolvePage(pageName) {
        if (this.isPageAvailable(pageName)) {
            return pageName;
        }
        return this.defaultPage;
    }

    /**
     * 判断页面和导航项是否存在
     * @param {string} pageName - 页面名称
     * @returns {boolean} 页面是否可用
     */
    isPageAvailable(pageName) {
        return !!pageName
            && !!document.getElementById(`${pageName}-page`)
            && !!this.findNavItem(pageName);
    }

    /**
     * 查找导航项
     * @param {string} pageName - 页面名称
     * @returns {HTMLElement|null} 导航项
     */
    findNavItem(pageName) {
        const navItems = document.querySelectorAll('.nav-item');
        return Array.from(navItems).find(item => item.dataset.page === pageName) || null;
    }

    /**
     * 更新导航选中态
     * @param {string} pageName - 页面名称
     */
    updateActiveNavItem(pageName) {
        const navItems = document.querySelectorAll('.nav-item');
        navItems.forEach(item => {
            const isActive = item.dataset.page === pageName;
            item.classList.toggle('active', isActive);
            if (isActive) {
                item.setAttribute('aria-current', 'page');
            } else {
                item.removeAttribute('aria-current');
            }
        });
    }

    /**
     * 保存当前页面
     * @param {string} pageName - 页面名称
     */
    persistActivePage(pageName) {
        state.save('activePage', pageName);

        if (typeof api !== 'undefined' && api.initialized) {
            api.saveLastActivePage(pageName).catch(error => {
                console.error('Failed to save last active page:', error);
            });
        }
    }

    /**
     * 定位指定页面中的激活渠道卡片
     * @param {string} pageName - 页面名称
     * @param {object} options - 定位选项
     * @returns {boolean} 是否找到并定位
     */
    locateActiveCardForPage(pageName, options = {}) {
        if (!this.isCurrentPage(pageName)) {
            return false;
        }

        const locateOptions = { showToast: false, ...options };

        if (pageName === 'channels' && typeof channels !== 'undefined') {
            return channels.locateActiveChannel(locateOptions);
        }

        if (pageName === 'codex' && typeof codex !== 'undefined') {
            return codex.locateActiveChannel(locateOptions);
        }

        return false;
    }

    /**
     * 判断指定页面当前是否处于激活状态
     * @param {string} pageName - 页面名称
     * @returns {boolean} 是否为当前页面
     */
    isCurrentPage(pageName) {
        return !!document.getElementById(`${pageName}-page`)?.classList.contains('active');
    }

    /**
     * 更新导航语言
     */
    updateLanguage() {
        const logoText = document.querySelector('.logo-text');
        if (logoText) {
            // 处理标题，将第一个空格替换为换行
            const title = i18n.t('app.title');
            // 英文：Claude Channel Switcher -> Claude<br>Channel Switcher
            // 中文：Claude 渠道切换器 -> Claude<br>渠道切换器
            logoText.innerHTML = title.replace(' ', '<br>');
        }

        const version = document.querySelector('.version');
        if (version) {
            version.textContent = state.appVersion || '';
        }

        const navItems = document.querySelectorAll('.nav-item');
        navItems.forEach(item => {
            const page = item.dataset.page;
            const textSpan = item.querySelector('.nav-text');
            if (textSpan) {
                textSpan.textContent = i18n.t(`nav.${page}`);
            }
            let ariaKey = 'settingsPage';
            if (page === 'channels') {
                ariaKey = 'channelManagement';
            } else if (page === 'codex') {
                ariaKey = 'codexPage';
            } else if (page === 'droid') {
                ariaKey = 'droidPage';
            } else if (page === 'statusline') {
                ariaKey = 'statuslinePage';
            }
            item.setAttribute('aria-label', i18n.t(`aria.${ariaKey}`));
        });
    }
}

// 创建全局实例
const navigation = new NavigationManager();

