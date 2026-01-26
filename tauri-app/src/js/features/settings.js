/**
 * 设置管理功能模块
 * 负责应用设置的管理，包括路径、主题、语言等配置
 */
class SettingsManager {
    /**
     * 初始化设置
     */
    init() {
        this.setupPathSettings();
        this.setupTerminalDirSettings();
        this.setupThemeSettings();
        this.setupLanguageSettings();
    }

    /**
     * 设置配置文件路径
     */
    setupPathSettings() {
        const pathInput = document.getElementById('config-path-input');
        const browseBtn = document.getElementById('browse-path-btn');

        if (pathInput) {
            pathInput.value = state.configPath;
        }

        if (browseBtn) {
            browseBtn.addEventListener('click', () => this.handleBrowsePath(pathInput));
        }
    }

    /**
     * 设置终端工作目录
     */
    setupTerminalDirSettings() {
        const terminalDirInput = document.getElementById('terminal-dir-input');
        const browseTerminalDirBtn = document.getElementById('browse-terminal-dir-btn');

        if (terminalDirInput) {
            terminalDirInput.value = state.terminalDir;
        }

        if (browseTerminalDirBtn) {
            browseTerminalDirBtn.addEventListener('click', () => this.handleBrowseTerminalDir(terminalDirInput));
        }
    }

    /**
     * 设置主题配置
     */
    setupThemeSettings() {
        const themeButtons = document.querySelectorAll('.theme-btn');
        DOMUtils.updateButtonGroup('.theme-btn', 'theme', state.theme);

        themeButtons.forEach(btn => {
            btn.addEventListener('click', () => this.handleThemeChange(btn.dataset.theme));
        });
    }

    /**
     * 设置语言配置
     */
    setupLanguageSettings() {
        const languageButtons = document.querySelectorAll('.language-btn');
        DOMUtils.updateButtonGroup('.language-btn', 'language', state.language);

        languageButtons.forEach(btn => {
            btn.addEventListener('click', () => this.handleLanguageChange(btn.dataset.language));
        });
    }

    /**
     * 浏览文件夹（通用）
     * @param {HTMLElement} inputElement - 输入框元素
     * @param {string} stateKey - 状态键名
     * @param {string} storageKey - 存储键名
     * @param {string} successMessage - 成功消息键
     * @param {Function} onSuccess - 成功回调
     */
    async handleBrowseFolder(inputElement, stateKey, storageKey, successMessage, onSuccess) {
        try {
            const currentPath = state[stateKey];
            const result = await api.openDialog({
                directory: true,
                multiple: false,
                defaultPath: currentPath
            });

            if (result) {
                state.save(stateKey, result);
                inputElement.value = result;
                if (onSuccess) await onSuccess();
                toast.show(i18n.t(successMessage));
            }
        } catch (error) {
            ErrorHandler.handle(error, `Browse ${stateKey}`);
        }
    }

    /**
     * 浏览配置文件路径
     * @param {HTMLElement} pathInput - 路径输入框
     */
    async handleBrowsePath(pathInput) {
        await this.handleBrowseFolder(
            pathInput,
            'configPath',
            'configPath',
            'messages.pathUpdated',
            () => channels.loadChannels()
        );
    }

    /**
     * 浏览终端工作目录
     * @param {HTMLElement} terminalDirInput - 工作目录输入框
     */
    async handleBrowseTerminalDir(terminalDirInput) {
        await this.handleBrowseFolder(
            terminalDirInput,
            'terminalDir',
            'terminalDir',
            'messages.terminalDirUpdated',
            null
        );
    }

    /**
     * 处理主题变更
     * @param {string} selectedTheme - 选中的主题
     */
    handleThemeChange(selectedTheme) {
        state.save('theme', selectedTheme);
        theme.applyTheme(selectedTheme);
        DOMUtils.updateButtonGroup('.theme-btn', 'theme', state.theme);
        const themeName = selectedTheme === 'dark' ? i18n.t('settings.theme.dark') : i18n.t('settings.theme.light');
        toast.show(i18n.t('messages.themeChanged', { theme: themeName }));
    }

    /**
     * 处理语言变更
     * @param {string} selectedLanguage - 选中的语言
     */
    handleLanguageChange(selectedLanguage) {
        state.save('language', selectedLanguage);
        i18n.setLanguage(state.language);
        DOMUtils.updateButtonGroup('.language-btn', 'language', state.language);

        // 更新所有 UI 组件的语言
        if (typeof updateUILanguage === 'function') {
            updateUILanguage();
        } else {
            // 如果全局函数不可用，手动更新所有模块
            this.updateLanguage();
            if (typeof titlebar !== 'undefined' && titlebar.updateLanguage) {
                titlebar.updateLanguage();
            }
            if (typeof navigation !== 'undefined' && navigation.updateLanguage) {
                navigation.updateLanguage();
            }
            if (typeof channels !== 'undefined' && channels.updateLanguage) {
                channels.updateLanguage();
            }
            if (typeof modal !== 'undefined' && modal.updateLanguage) {
                modal.updateLanguage();
            }
        }

        const langName = selectedLanguage === 'zh-CN' ? '简体中文' : 'English';
        toast.show(i18n.t('messages.languageChanged', { language: langName }));
    }

    /**
     * 更新设置页面语言
     */
    updateLanguage() {
        const pageTitle = document.querySelector('#settings-page .page-title');
        if (pageTitle) {
            pageTitle.textContent = i18n.t('settings.title');
        }

        const settingCards = document.querySelectorAll('.setting-card');
        settingCards.forEach((card, index) => {
            const title = card.querySelector('.setting-title');
            const description = card.querySelector('.setting-description');

            if (index === 0) {
                if (title) title.textContent = i18n.t('settings.path.title');
                if (description) description.textContent = i18n.t('settings.path.description');

                const browseBtn = card.querySelector('#browse-path-btn');
                if (browseBtn) {
                    browseBtn.textContent = i18n.t('settings.path.browse');
                    browseBtn.setAttribute('aria-label', i18n.t('aria.browseFolder'));
                }
            } else if (index === 1) {
                if (title) title.textContent = i18n.t('settings.terminalDir.title');
                if (description) description.textContent = i18n.t('settings.terminalDir.description');

                const browseBtn = card.querySelector('#browse-terminal-dir-btn');
                if (browseBtn) {
                    browseBtn.textContent = i18n.t('settings.terminalDir.browse');
                    browseBtn.setAttribute('aria-label', i18n.t('aria.browseFolder'));
                }
            } else if (index === 2) {
                if (title) title.textContent = i18n.t('settings.theme.title');
                if (description) description.textContent = i18n.t('settings.theme.description');

                const themeButtons = card.querySelectorAll('.theme-btn');
                themeButtons.forEach(btn => {
                    const theme = btn.dataset.theme;
                    btn.innerHTML = `<span aria-hidden="true">${theme === 'dark' ? '🌙' : '☀️'}</span> ${i18n.t(`settings.theme.${theme}`)}`;
                });
            } else if (index === 3) {
                if (title) title.textContent = i18n.t('settings.language.title');
                if (description) description.textContent = i18n.t('settings.language.description');

                const langButtons = card.querySelectorAll('.language-btn');
                langButtons.forEach(btn => {
                    const lang = btn.dataset.language;
                    const langKey = lang === 'zh-CN' ? 'zhCN' : 'enUS';
                    btn.textContent = `${lang === 'zh-CN' ? '🌏' : '🌍'} ${i18n.t(`settings.language.${langKey}`)}`;
                });
            } else if (index === 4) {
                // 关于区域
                const aboutTitle = card.querySelector('.about-title');
                const aboutDescription = card.querySelector('.about-description');
                const aboutTechText = card.querySelector('.about-tech-text');
                const feedbackLink = card.querySelector('.about-links .about-link-btn:last-child .link-text');
                const aboutCopyright = card.querySelector('.about-copyright');

                if (aboutTitle) aboutTitle.textContent = i18n.t('settings.about.title');
                if (aboutDescription) aboutDescription.textContent = i18n.t('settings.about.description');
                if (aboutTechText) aboutTechText.textContent = i18n.t('settings.about.techStack');
                if (feedbackLink) feedbackLink.textContent = i18n.t('settings.about.feedback');
                if (aboutCopyright) aboutCopyright.textContent = i18n.t('settings.about.copyright');
            }
        });
    }
}

// 创建全局实例
const settings = new SettingsManager();

