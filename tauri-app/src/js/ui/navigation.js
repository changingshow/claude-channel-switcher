/**
 * 导航管理
 */
class NavigationManager {
    /**
     * 初始化导航
     */
    init() {
        const navItems = document.querySelectorAll('.nav-item');
        navItems.forEach(item => {
            item.addEventListener('click', () => {
                const page = item.dataset.page;
                this.switchPage(page);

                navItems.forEach(nav => nav.classList.remove('active'));
                item.classList.add('active');
            });
        });
    }

    /**
     * 切换页面
     * @param {string} pageName - 页面名称
     */
    switchPage(pageName) {
        const pages = document.querySelectorAll('.page');
        pages.forEach(page => page.classList.remove('active'));
        const targetPage = document.getElementById(`${pageName}-page`);
        if (targetPage) {
            targetPage.classList.add('active');
            // 重置滚动位置到顶部（滚动容器是 .main-content）
            const mainContent = document.querySelector('.main-content');
            if (mainContent) {
                mainContent.scrollTop = 0;
            }
        }

        // 切换到 droid 页面时刷新渠道列表
        if (pageName === 'droid' && typeof droid !== 'undefined') {
            droid.loadChannels();
        }

        // 切换到 statusline 页面时刷新文件列表
        if (pageName === 'statusline' && typeof statusline !== 'undefined') {
            statusline.loadFiles();
        }
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
            version.textContent = i18n.t('app.version');
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

