/**
 * 渠道管理功能模块
 * 负责渠道的 CRUD 操作、列表渲染和状态管理
 */
const REFRESH_ANIMATION_DURATION = 300;

class ChannelManager {
    constructor() {
        this.channelsList = null;
        this.channelCount = null;
        this.init();
    }

    /**
     * 初始化渠道管理
     */
    init() {
        this.channelsList = document.getElementById('channels-list');
        this.channelCount = document.querySelector('.channel-count');
    }

    /**
     * 加载渠道列表
     */
    async loadChannels() {
        try {
            const result = await api.getChannels(state.configPath);

            if (!result.success) {
                ErrorHandler.handle(result.error, '加载渠道失败');
                state.channels = {};
                this.renderChannels();
                return;
            }

            state.channels = result.channels || {};
            await this.updateActiveChannel();
            this.renderChannels();
        } catch (error) {
            ErrorHandler.handle(error, 'Load channels');
            state.channels = {};
            this.renderChannels();
        }
    }

    /**
     * 更新当前激活的渠道
     */
    async updateActiveChannel() {
        try {
            const activeResult = await api.getActiveChannel(state.configPath);
            if (!activeResult.success) {
                state.activeChannelName = null;
                return;
            }

            const activeConfig = activeResult.config;
            const activeToken = activeConfig.env?.ANTHROPIC_AUTH_TOKEN;
            const activeUrl = activeConfig.env?.ANTHROPIC_BASE_URL || '';

            state.activeChannelName = this.findChannelByCredentials(activeToken, activeUrl);
        } catch (error) {
            ErrorHandler.handle(error, 'Update active channel');
            state.activeChannelName = null;
        }
    }

    /**
     * 根据凭证查找渠道名称
     * @param {string} token - API Token
     * @param {string} url - Base URL
     * @returns {string|null} 渠道名称
     */
    findChannelByCredentials(token, url) {
        for (const [name, config] of Object.entries(state.channels)) {
            const channelToken = config.env?.ANTHROPIC_AUTH_TOKEN;
            const channelUrl = config.env?.ANTHROPIC_BASE_URL || '';
            if (channelToken === token && channelUrl === url) {
                return name;
            }
        }
        return null;
    }

    /**
     * 渲染渠道列表
     */
    renderChannels() {
        if (!this.channelsList || !this.channelCount) return;

        const count = Object.keys(state.channels).length;
        this.channelCount.textContent = `${count} ${i18n.t('channels.count')}`;

        if (count === 0) {
            this.channelsList.innerHTML = `
                <div class="empty-state">
                    <div class="empty-icon">${i18n.t('channels.empty.icon')}</div>
                    <div class="empty-text">${i18n.t('channels.empty.text')}</div>
                    <div class="empty-hint">${i18n.t('channels.empty.hint')}</div>
                </div>
            `;
            return;
        }

        const sortedChannels = Object.entries(state.channels).sort((a, b) => {
            return (b[1].mtime || 0) - (a[1].mtime || 0);
        });

        const fragment = document.createDocumentFragment();
        sortedChannels.forEach(([name]) => {
            const isActive = name === state.activeChannelName;
            const card = this.createChannelCard(name, isActive);
            fragment.appendChild(card);
        });

        this.channelsList.innerHTML = '';
        this.channelsList.appendChild(fragment);
    }

    /**
     * 创建渠道卡片
     * @param {string} name - 渠道名称
     * @param {boolean} isActive - 是否激活
     * @returns {HTMLElement} 渠道卡片元素
     */
    createChannelCard(name, isActive) {
        const card = document.createElement('div');
        card.className = `channel-card${isActive ? ' active' : ''}`;

        const statusText = isActive ? i18n.t('channels.status.active') : i18n.t('channels.status.inactive');
        const statusIndicator = `<span class="status-indicator ${isActive ? 'active' : ''}"></span> ${statusText}`;

        card.innerHTML = `
            <div class="channel-header">
                <div class="channel-icon">📡</div>
                <div class="channel-info">
                    <div class="channel-name">${DOMUtils.escapeHtml(name)}</div>
                    <div class="channel-status">${statusIndicator}</div>
                </div>
            </div>
            <div class="channel-actions">
                ${isActive ? `<button class="btn btn-success btn-small launch-btn">🚀 ${i18n.t('channels.actions.launch')}</button>` : ''}
                <button class="btn btn-primary btn-small switch-btn" ${isActive ? 'disabled' : ''}>⚡ ${i18n.t('channels.actions.switch')}</button>
                <button class="btn btn-secondary btn-small edit-btn">✏️ ${i18n.t('channels.actions.edit')}</button>
                <button class="btn btn-danger btn-small delete-btn">🗑️ ${i18n.t('channels.actions.delete')}</button>
            </div>
        `;

        this.attachCardEventListeners(card, name, isActive);
        return card;
    }

    /**
     * 为渠道卡片附加事件监听器
     * @param {HTMLElement} card - 卡片元素
     * @param {string} name - 渠道名称
     * @param {boolean} isActive - 是否激活
     */
    attachCardEventListeners(card, name, isActive) {
        if (isActive) {
            const launchBtn = card.querySelector('.launch-btn');
            launchBtn?.addEventListener('click', () => this.launchClaude(name));
        }

        const editBtn = card.querySelector('.edit-btn');
        editBtn?.addEventListener('click', () => this.editChannel(name));

        const switchBtn = card.querySelector('.switch-btn');
        if (!isActive) {
            switchBtn?.addEventListener('click', () => this.switchChannel(name));
        }

        const deleteBtn = card.querySelector('.delete-btn');
        deleteBtn?.addEventListener('click', () => this.deleteChannel(name));
    }

    /**
     * 编辑渠道
     * @param {string} name - 渠道名称
     */
    editChannel(name) {
        modal.openEdit(name);
    }

    /**
     * 切换渠道
     * @param {string} name - 渠道名称
     */
    async switchChannel(name) {
        try {
            const result = await api.switchChannel(state.configPath, name);

            if (result.success) {
                toast.show(i18n.t('messages.channelSwitched', { name }));
                await this.loadChannels();
            } else {
                ErrorHandler.showError(result.error, '切换失败');
            }
        } catch (error) {
            ErrorHandler.showError(error, '切换失败');
        }
    }

    /**
     * 删除渠道
     * @param {string} name - 渠道名称
     */
    async deleteChannel(name) {
        if (!confirm(i18n.t('messages.confirmDelete', { name }))) {
            return;
        }

        try {
            const result = await api.deleteChannel(state.configPath, name);

            if (result.success) {
                toast.show(i18n.t('messages.channelDeleted', { name }));
                await this.loadChannels();
            } else {
                ErrorHandler.showError(result.error, '删除失败');
            }
        } catch (error) {
            ErrorHandler.showError(error, '删除失败');
        }
    }

    /**
     * 启动 Claude
     * @param {string} name - 渠道名称
     */
    async launchClaude(name) {
        try {
            const result = await api.launchClaude(state.terminal, state.terminalDir);

            if (result.success) {
                toast.show(i18n.t('messages.channelLaunched', { name, terminal: state.terminal }));
            } else {
                ErrorHandler.showError(result.error, '启动失败');
            }
        } catch (error) {
            ErrorHandler.showError(error, '启动失败');
        }
    }

    /**
     * 保存渠道（新建或更新）
     */
    async saveChannel() {
        const formData = modal.getFormData();
        const { name, token, url } = formData;

        // 验证渠道名称
        const nameValidation = Validation.validateChannelName(name);
        if (!nameValidation.valid) {
            toast.show(i18n.t(nameValidation.error));
            return;
        }

        // 检查渠道名称是否重复（编辑时排除当前渠道）
        const trimmedName = name.trim();
        if (state.channels[trimmedName] && state.editingChannel !== trimmedName) {
            toast.show(i18n.t('messages.errorNameDuplicate'));
            return;
        }

        // 验证 API Token
        const tokenValidation = Validation.validateToken(token);
        if (!tokenValidation.valid) {
            toast.show(i18n.t(tokenValidation.error));
            return;
        }

        // 验证 Base URL
        const urlValidation = Validation.validateUrl(url);
        if (!urlValidation.valid) {
            toast.show(i18n.t(urlValidation.error));
            return;
        }

        try {
            const result = await api.saveChannel({
                configPath: state.configPath,
                channelName: name,
                token: token,
                url: url || '',
                oldName: state.editingChannel || ''
            });

            if (result.success) {
                toast.show(state.editingChannel ? i18n.t('messages.channelUpdated') : i18n.t('messages.channelCreated'));
                modal.close();
                await this.loadChannels();
            } else {
                ErrorHandler.showError(result.error, '保存失败');
            }
        } catch (error) {
            ErrorHandler.showError(error, '保存失败');
        }
    }

    /**
     * 刷新渠道列表（带防抖）
     */
    async refreshChannels() {
        const refreshBtn = document.getElementById('refresh-channel-btn');

        DOMUtils.setElementState(refreshBtn, true);
        DOMUtils.setElementState(this.channelsList, true);

        await this.loadChannels();

        setTimeout(() => {
            DOMUtils.setElementState(this.channelsList, false);
            DOMUtils.setElementState(refreshBtn, false);
            toast.show(i18n.t('messages.channelsRefreshed'));
        }, REFRESH_ANIMATION_DURATION);
    }

    /**
     * 更新渠道页面语言
     */
    updateLanguage() {
        const pageTitle = document.querySelector('#channels-page .page-title');
        if (pageTitle) {
            pageTitle.textContent = i18n.t('channels.title');
        }

        const refreshBtn = document.getElementById('refresh-channel-btn');
        if (refreshBtn) {
            refreshBtn.querySelector('span:last-child').textContent = i18n.t('channels.refresh');
            refreshBtn.setAttribute('aria-label', i18n.t('aria.refreshChannels'));
        }

        const addBtn = document.getElementById('add-channel-btn');
        if (addBtn) {
            addBtn.querySelector('span:last-child').textContent = i18n.t('channels.add');
            addBtn.setAttribute('aria-label', i18n.t('aria.addChannel'));
        }

        this.renderChannels();
    }
}

// 创建全局实例
const channels = new ChannelManager();

