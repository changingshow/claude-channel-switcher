/**
 * 设置管理功能模块
 */
class SettingsManager {
    init() {
        this.setupPathSettings();
        this.setupCodexPathSettings();
        this.setupTerminalDirSettings();
        this.setupThemeSettings();
        this.setupLanguageSettings();
    }

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

    setupCodexPathSettings() {
        const pathInput = document.getElementById('codex-path-input');
        const browseBtn = document.getElementById('browse-codex-path-btn');

        if (pathInput) {
            pathInput.value = state.codexConfigPath;
        }

        if (browseBtn) {
            browseBtn.addEventListener('click', () => this.handleBrowseCodexPath(pathInput));
        }
    }

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

    setupThemeSettings() {
        const themeButtons = document.querySelectorAll('.theme-btn');
        DOMUtils.updateButtonGroup('.theme-btn', 'theme', state.theme);

        themeButtons.forEach(btn => {
            btn.addEventListener('click', () => this.handleThemeChange(btn.dataset.theme));
        });
    }

    setupLanguageSettings() {
        const languageButtons = document.querySelectorAll('.language-btn');
        DOMUtils.updateButtonGroup('.language-btn', 'language', state.language);

        languageButtons.forEach(btn => {
            btn.addEventListener('click', () => this.handleLanguageChange(btn.dataset.language));
        });
    }

    async handleBrowseFolder(inputElement, stateKey, successMessage, onSuccess) {
        try {
            const currentPath = state[stateKey];
            const result = await api.openDialog({
                directory: true,
                multiple: false,
                defaultPath: currentPath
            });

            if (result) {
                state.save(stateKey, result);

                if (inputElement) {
                    inputElement.value = result;
                }

                if (onSuccess) {
                    await onSuccess();
                }

                toast.show(i18n.t(successMessage));
            }
        } catch (error) {
            ErrorHandler.handle(error, `Browse ${stateKey}`);
        }
    }

    async handleBrowsePath(pathInput) {
        await this.handleBrowseFolder(
            pathInput,
            'configPath',
            'messages.pathUpdated',
            () => channels.loadChannels()
        );
    }

    async handleBrowseCodexPath(pathInput) {
        await this.handleBrowseFolder(
            pathInput,
            'codexConfigPath',
            'messages.codexPathUpdated',
            () => {
                if (typeof codex !== 'undefined') {
                    codex.render();
                }
            }
        );
    }

    async handleBrowseTerminalDir(terminalDirInput) {
        await this.handleBrowseFolder(
            terminalDirInput,
            'terminalDir',
            'messages.terminalDirUpdated',
            null
        );
    }

    handleThemeChange(selectedTheme) {
        state.save('theme', selectedTheme);
        theme.applyTheme(selectedTheme);
        DOMUtils.updateButtonGroup('.theme-btn', 'theme', state.theme);
        const themeName = selectedTheme === 'dark' ? i18n.t('settings.theme.dark') : i18n.t('settings.theme.light');
        toast.show(i18n.t('messages.themeChanged', { theme: themeName }));
    }

    handleLanguageChange(selectedLanguage) {
        state.save('language', selectedLanguage);
        i18n.setLanguage(state.language);
        DOMUtils.updateButtonGroup('.language-btn', 'language', state.language);

        if (typeof updateUILanguage === 'function') {
            updateUILanguage();
        } else {
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
            if (typeof codex !== 'undefined' && codex.updateLanguage) {
                codex.updateLanguage();
            }
            if (typeof modal !== 'undefined' && modal.updateLanguage) {
                modal.updateLanguage();
            }
        }

        const langName = selectedLanguage === 'zh-CN' ? '简体中文' : 'English';
        toast.show(i18n.t('messages.languageChanged', { language: langName }));
    }

    updateLanguage() {
        const pageTitle = document.querySelector('#settings-page .page-title');
        if (pageTitle) {
            pageTitle.textContent = i18n.t('settings.title');
        }

        this.updatePathCard();
        this.updateCodexPathCard();
        this.updateTerminalDirCard();
        this.updateThemeCard();
        this.updateLanguageCard();
        this.updateAboutCard();
    }

    updatePathCard() {
        const card = document.getElementById('setting-claude-path');
        if (!card) return;

        const title = card.querySelector('.setting-title');
        const description = card.querySelector('.setting-description');
        const input = card.querySelector('#config-path-input');
        const browseBtn = card.querySelector('#browse-path-btn');

        if (title) title.textContent = i18n.t('settings.path.title');
        if (description) description.textContent = i18n.t('settings.path.description');
        if (input) input.value = state.configPath;
        if (browseBtn) {
            browseBtn.textContent = i18n.t('settings.path.browse');
            browseBtn.setAttribute('aria-label', i18n.t('aria.browseFolder'));
        }
    }

    updateCodexPathCard() {
        const card = document.getElementById('setting-codex-path');
        if (!card) return;

        const title = card.querySelector('.setting-title');
        const description = card.querySelector('.setting-description');
        const input = card.querySelector('#codex-path-input');
        const browseBtn = card.querySelector('#browse-codex-path-btn');

        if (title) title.textContent = i18n.t('settings.codexPath.title');
        if (description) description.textContent = i18n.t('settings.codexPath.description');
        if (input) input.value = state.codexConfigPath;
        if (browseBtn) {
            browseBtn.textContent = i18n.t('settings.codexPath.browse');
            browseBtn.setAttribute('aria-label', i18n.t('aria.browseFolder'));
        }
    }

    updateTerminalDirCard() {
        const card = document.getElementById('setting-terminal-dir');
        if (!card) return;

        const title = card.querySelector('.setting-title');
        const description = card.querySelector('.setting-description');
        const input = card.querySelector('#terminal-dir-input');
        const browseBtn = card.querySelector('#browse-terminal-dir-btn');

        if (title) title.textContent = i18n.t('settings.terminalDir.title');
        if (description) description.textContent = i18n.t('settings.terminalDir.description');
        if (input) input.value = state.terminalDir;
        if (browseBtn) {
            browseBtn.textContent = i18n.t('settings.terminalDir.browse');
            browseBtn.setAttribute('aria-label', i18n.t('aria.browseFolder'));
        }
    }

    updateThemeCard() {
        const card = document.getElementById('setting-theme');
        if (!card) return;

        const title = card.querySelector('.setting-title');
        const description = card.querySelector('.setting-description');
        const themeButtons = card.querySelectorAll('.theme-btn');

        if (title) title.textContent = i18n.t('settings.theme.title');
        if (description) description.textContent = i18n.t('settings.theme.description');

        themeButtons.forEach(btn => {
            const theme = btn.dataset.theme;
            btn.innerHTML = `<span aria-hidden="true">${theme === 'dark' ? '🌙' : '☀️'}</span> ${i18n.t(`settings.theme.${theme}`)}`;
        });
    }

    updateLanguageCard() {
        const card = document.getElementById('setting-language');
        if (!card) return;

        const title = card.querySelector('.setting-title');
        const description = card.querySelector('.setting-description');
        const langButtons = card.querySelectorAll('.language-btn');

        if (title) title.textContent = i18n.t('settings.language.title');
        if (description) description.textContent = i18n.t('settings.language.description');

        langButtons.forEach(btn => {
            const lang = btn.dataset.language;
            const langKey = lang === 'zh-CN' ? 'zhCN' : 'enUS';
            btn.textContent = `${lang === 'zh-CN' ? '🇨🇳' : '🇺🇸'} ${i18n.t(`settings.language.${langKey}`)}`;
        });
    }

    updateAboutCard() {
        const card = document.getElementById('setting-about');
        if (!card) return;

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
}

const settings = new SettingsManager();
