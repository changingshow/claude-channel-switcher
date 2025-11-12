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
        
        // 自定义标题栏颜色会通过 CSS 变量自动更新，无需额外处理
    }
}

// 创建全局实例
const theme = new ThemeManager();

