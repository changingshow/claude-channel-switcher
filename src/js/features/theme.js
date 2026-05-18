/**
 * 主题管理功能模块
 * 负责深色/浅色主题的切换和应用
 */
class ThemeManager {
    /**
     * 应用主题
     * @param {string} themeName - 主题名称 ('dark' | 'light')
     */
    applyTheme(themeName) {
        document.body.classList.toggle('light-theme', themeName === 'light');

        // 设置 color-scheme
        document.documentElement.style.colorScheme = themeName;

        // 更新 theme-color meta 标签
        let metaTheme = document.querySelector('meta[name="theme-color"]');
        if (!metaTheme) {
            metaTheme = document.createElement('meta');
            metaTheme.name = 'theme-color';
            document.head.appendChild(metaTheme);
        }
        metaTheme.content = themeName === 'light' ? '#dcdce0' : '#28282b';

        // 更新主题切换开关状态
        this.updateToggleState(themeName);
    }

    /**
     * 更新主题切换开关状态
     * @param {string} themeName - 当前主题名称
     */
    updateToggleState(themeName) {
        const checkbox = document.getElementById('theme-checkbox');
        if (checkbox) {
            checkbox.checked = themeName === 'light';
        }
    }

    /**
     * 切换主题
     */
    toggle() {
        const isLight = document.body.classList.contains('light-theme');
        const newTheme = isLight ? 'dark' : 'light';
        this.applyTheme(newTheme);
        localStorage.setItem('theme', newTheme);
        return newTheme;
    }
}

// 创建全局实例
const theme = new ThemeManager();

