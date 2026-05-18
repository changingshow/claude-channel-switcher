/**
 * 设置管理功能模块
 */
class SettingsManager {
    constructor() {
        this.menuSettingsPersistTask = Promise.resolve();
    }

    init() {
        this.setupPathSettings();
        this.setupCodexPathSettings();
        this.setupTerminalDirSettings();
        this.setupThemeSettings();
        this.setupLanguageSettings();
        this.setupMenuSettings();
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

    setupMenuSettings() {
        const menuList = document.getElementById('menu-settings-list');
        if (!menuList) return;

        this.renderMenuSettings();

        menuList.addEventListener('change', event => {
            const toggle = event.target.closest('.menu-visible-toggle');
            if (!toggle) return;

            this.handleMenuVisibilityChange(toggle.dataset.page, toggle.checked);
        });

        menuList.addEventListener('click', event => {
            const button = event.target.closest('.menu-move-btn');
            if (!button) return;

            this.handleMenuMove(button.dataset.page, Number(button.dataset.direction));
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

    handleMenuVisibilityChange(page, visible) {
        if (page === 'settings') {
            this.renderMenuSettings();
            return;
        }

        const nextMenuSettings = state.menuSettings.map(item => ({
            ...item,
            visible: item.page === page ? visible : item.visible
        }));

        const visibleOptionalCount = nextMenuSettings.filter(item => item.page !== 'settings' && item.visible).length;
        if (visibleOptionalCount < 1) {
            toast.show(i18n.t('settings.menu.minimumWarning'));
            this.renderMenuSettings();
            return;
        }

        this.saveMenuSettings(nextMenuSettings);
    }

    handleMenuMove(page, direction) {
        const nextMenuSettings = state.menuSettings.map(item => ({ ...item }));
        const currentIndex = nextMenuSettings.findIndex(item => item.page === page);
        const targetIndex = currentIndex + direction;

        if (currentIndex < 0 || targetIndex < 0 || targetIndex >= nextMenuSettings.length) {
            return;
        }

        [nextMenuSettings[currentIndex], nextMenuSettings[targetIndex]] = [
            nextMenuSettings[targetIndex],
            nextMenuSettings[currentIndex]
        ];

        this.saveMenuSettings(nextMenuSettings);
    }

    saveMenuSettings(menuSettings) {
        state.save('menuSettings', menuSettings);

        if (typeof navigation !== 'undefined') {
            navigation.applyMenuSettings();
        }

        this.renderMenuSettings();
        this.persistMenuSettings();
        toast.show(i18n.t('settings.menu.updated'));
    }

    persistMenuSettings() {
        if (typeof api === 'undefined' || !api.initialized) {
            return;
        }

        const menuSettings = state.menuSettings.map(item => ({ ...item }));
        this.menuSettingsPersistTask = this.menuSettingsPersistTask
            .catch(() => undefined)
            .then(() => api.saveMenuSettings(menuSettings))
            .catch(error => {
                console.error('Failed to save menu settings:', error);
                toast.show(i18n.t('settings.menu.persistFailed'));
            });
    }

    async waitForMenuSettingsPersist() {
        await this.menuSettingsPersistTask.catch(() => undefined);
    }

    renderMenuSettings() {
        const menuList = document.getElementById('menu-settings-list');
        if (!menuList || typeof navigation === 'undefined') return;

        const menuItems = navigation.getConfigurableMenuItems();
        menuList.innerHTML = menuItems.map((item, index) => {
            const label = DOMUtils.escapeHtml(item.label);
            const icon = DOMUtils.escapeHtml(item.icon);
            const visibilityLabel = DOMUtils.escapeHtml(i18n.t('settings.menu.visibilityLabel', { menu: item.label }));
            const moveUpLabel = DOMUtils.escapeHtml(i18n.t('settings.menu.moveUp', { menu: item.label }));
            const moveDownLabel = DOMUtils.escapeHtml(i18n.t('settings.menu.moveDown', { menu: item.label }));
            const requiredBadge = item.required
                ? `<span class="menu-required-badge">${DOMUtils.escapeHtml(i18n.t('settings.menu.required'))}</span>`
                : '';
            const checked = item.visible ? 'checked' : '';
            const locked = item.required ? 'disabled' : '';
            const moveUpDisabled = index === 0 ? 'disabled' : '';
            const moveDownDisabled = index === menuItems.length - 1 ? 'disabled' : '';

            return `
                <div class="menu-setting-row${item.required ? ' required' : ''}" data-page="${item.page}">
                    <div class="menu-setting-main">
                        <span class="menu-setting-icon" aria-hidden="true">${icon}</span>
                        <span class="menu-setting-name">${label}</span>
                        ${requiredBadge}
                    </div>
                    <label class="menu-visible-control" aria-label="${visibilityLabel}">
                        <input type="checkbox" class="menu-visible-toggle" data-page="${item.page}" ${checked} ${locked}>
                        <span>${DOMUtils.escapeHtml(i18n.t('settings.menu.visible'))}</span>
                    </label>
                    <div class="menu-order-actions">
                        <button type="button" class="btn-icon menu-move-btn" data-page="${item.page}" data-direction="-1"
                            aria-label="${moveUpLabel}" title="${moveUpLabel}" ${moveUpDisabled}>↑</button>
                        <button type="button" class="btn-icon menu-move-btn" data-page="${item.page}" data-direction="1"
                            aria-label="${moveDownLabel}" title="${moveDownLabel}" ${moveDownDisabled}>↓</button>
                    </div>
                </div>
            `;
        }).join('');
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
        this.updateMenuCard();
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

    updateMenuCard() {
        const card = document.getElementById('setting-menu');
        if (!card) return;

        const title = card.querySelector('.setting-title');
        const description = card.querySelector('.setting-description');
        const hint = card.querySelector('.menu-settings-hint');

        if (title) title.textContent = i18n.t('settings.menu.title');
        if (description) description.textContent = i18n.t('settings.menu.description');
        if (hint) hint.textContent = i18n.t('settings.menu.hint');

        this.renderMenuSettings();
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
