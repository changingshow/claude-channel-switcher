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
        }
    }

    /**
     * 更新导航语言
     */
    updateLanguage() {
        document.querySelector('.logo-text').innerHTML = i18n.t('app.title').replace(' ', '<br>');
        document.querySelector('.version').textContent = i18n.t('app.version');

        const navItems = document.querySelectorAll('.nav-item');
        navItems.forEach(item => {
            const page = item.dataset.page;
            const textSpan = item.querySelector('.nav-text');
            if (textSpan) {
                textSpan.textContent = i18n.t(`nav.${page}`);
            }
            item.setAttribute('aria-label', i18n.t(`aria.${page}Page`));
        });
    }
}

// 创建全局实例
const navigation = new NavigationManager();

