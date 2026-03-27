/**
 * 渠道管理功能模块
 * 负责渠道的 CRUD 操作、列表渲染和状态管理
 */
const REFRESH_ANIMATION_DURATION = 300;
const CHANNEL_SWITCHING_MIN_DURATION = 300;

class ChannelManager {
    constructor() {
        this.channelsList = null;
        this.channelCount = null;
        this.switchingChannelName = null;
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
     * @param {boolean} skipActiveUpdate - 是否跳过激活状态更新
     */
    async loadChannels(skipActiveUpdate = false) {
        try {
            const result = await api.getChannels(state.configPath);

            if (!result.success) {
                ErrorHandler.handle(result.error, '加载渠道失败');
                state.channels = {};
                this.renderChannels();
                return;
            }

            state.channels = result.channels || {};
            if (!skipActiveUpdate) {
                await this.updateActiveChannel();
            }
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
            return (b[1].ctime || 0) - (a[1].ctime || 0);
        });

        const fragment = document.createDocumentFragment();
        const isAnySwitching = !!this.switchingChannelName;
        sortedChannels.forEach(([name]) => {
            const isActive = name === state.activeChannelName;
            const isSwitching = name === this.switchingChannelName;
            const card = this.createChannelCard(name, isActive, isSwitching, isAnySwitching);
            fragment.appendChild(card);
        });

        this.channelsList.innerHTML = '';
        this.channelsList.appendChild(fragment);
    }

    /**
     * 创建渠道卡片
     * @param {string} name - 渠道名称
     * @param {boolean} isActive - 是否激活
     * @param {boolean} isSwitching - 是否切换中
     * @param {boolean} isAnySwitching - 是否有任一卡片在切换中
     * @returns {HTMLElement} 渠道卡片元素
     */
    createChannelCard(name, isActive, isSwitching, isAnySwitching) {
        const card = document.createElement('div');
        card.className = `channel-card${isActive ? ' active' : ''}${isSwitching ? ' switching' : ''}`;
        card.setAttribute('aria-busy', isSwitching ? 'true' : 'false');

        const config = state.channels[name];
        const hasBalanceApi = config?.balanceApi?.url;

        let statusClass = '';
        let statusText = i18n.t('channels.status.inactive');
        if (isSwitching) {
            statusClass = 'switching';
            statusText = i18n.t('channels.status.switching');
        } else if (isActive) {
            statusClass = 'active';
            statusText = i18n.t('channels.status.active');
        }
        const statusIndicator = `<span class="status-indicator ${statusClass}"></span> ${statusText}`;
        const switchLabel = isSwitching
            ? `⏳ ${i18n.t('channels.actions.switching')}`
            : `⚡ ${i18n.t('channels.actions.switch')}`;
        const actionsDisabled = isAnySwitching ? 'disabled' : '';
        const switchingBadgeClass = hasBalanceApi
            ? 'channel-switching-badge channel-switching-badge-offset'
            : 'channel-switching-badge';
        const switchingBadge = isSwitching
            ? `<div class="${switchingBadgeClass}"><span class="channel-switching-spinner" aria-hidden="true"></span><span>${i18n.t('channels.actions.switching')}</span></div>`
            : '';

        const balanceHtml = hasBalanceApi ? `
            <div class="channel-balance" data-channel="${DOMUtils.escapeHtml(name)}" title="${i18n.t('channels.balance.clickToQuery')}">
                <span class="balance-icon">💰</span>
                <span class="balance-value hint">${i18n.t('channels.balance.clickToQuery')}</span>
            </div>
        ` : '';

        card.innerHTML = `
            ${switchingBadge}
            ${balanceHtml}
            <div class="channel-header">
                <div class="channel-icon">📡</div>
                <div class="channel-info">
                    <div class="channel-name">${DOMUtils.escapeHtml(name)}</div>
                    <div class="channel-status">${statusIndicator}</div>
                </div>
            </div>
            <div class="channel-actions">
                ${isActive ? `<button class="btn btn-success btn-small launch-btn">🚀 ${i18n.t('channels.actions.launch')}</button>` : ''}
                <button class="btn btn-primary btn-small switch-btn" ${isAnySwitching ? 'disabled' : ''}>${switchLabel}</button>
                <button class="btn btn-edit btn-small edit-btn" ${actionsDisabled}>✏️ ${i18n.t('channels.actions.edit')}</button>
                <button class="btn btn-danger btn-small delete-btn" ${actionsDisabled}>🗑️ ${i18n.t('channels.actions.delete')}</button>
            </div>
        `;

        this.attachCardEventListeners(card, name, isActive, isSwitching, isAnySwitching);
        return card;
    }

    /**
     * 为渠道卡片附加事件监听器
     * @param {HTMLElement} card - 卡片元素
     * @param {string} name - 渠道名称
     * @param {boolean} isActive - 是否激活
     * @param {boolean} isSwitching - 是否切换中
     * @param {boolean} isAnySwitching - 是否有任一卡片在切换中
     */
    attachCardEventListeners(card, name, isActive, isSwitching, isAnySwitching) {
        if (isActive) {
            const launchBtn = card.querySelector('.launch-btn');
            if (!isAnySwitching) {
                launchBtn?.addEventListener('click', () => this.launchClaude(name));
            }
        }

        const editBtn = card.querySelector('.edit-btn');
        if (!isAnySwitching) {
            editBtn?.addEventListener('click', () => this.editChannel(name));
        }

        const switchBtn = card.querySelector('.switch-btn');
        if (!isSwitching && !isAnySwitching) {
            if (isActive) {
                switchBtn?.addEventListener('click', () => this.notifyAlreadyActive(name));
            } else {
                switchBtn?.addEventListener('click', () => this.switchChannel(name));
            }
        }

        const deleteBtn = card.querySelector('.delete-btn');
        if (!isAnySwitching) {
            deleteBtn?.addEventListener('click', () => this.deleteChannel(name));
        }

        const balanceEl = card.querySelector('.channel-balance');
        if (!isAnySwitching) {
            balanceEl?.addEventListener('click', (e) => {
                e.stopPropagation();
                this.queryBalance(name, balanceEl);
            });
        }
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
        if (this.switchingChannelName) {
            return;
        }

        const switchStartedAt = Date.now();
        this.switchingChannelName = name;
        this.renderChannels();

        try {
            const result = await api.switchChannel(state.configPath, name);
            await this.ensureSwitchingVisible(switchStartedAt);

            if (result.success) {
                this.switchingChannelName = null;
                toast.show(i18n.t('messages.channelSwitched', { name }));
                await this.loadChannels();
            } else {
                this.switchingChannelName = null;
                this.renderChannels();
                ErrorHandler.showError(result.error, '切换失败');
            }
        } catch (error) {
            await this.ensureSwitchingVisible(switchStartedAt);
            this.switchingChannelName = null;
            this.renderChannels();
            ErrorHandler.showError(error, '切换失败');
        }
    }

    async ensureSwitchingVisible(startedAt) {
        const elapsed = Date.now() - startedAt;
        if (elapsed >= CHANNEL_SWITCHING_MIN_DURATION) {
            return;
        }

        await new Promise(resolve => {
            setTimeout(resolve, CHANNEL_SWITCHING_MIN_DURATION - elapsed);
        });
    }

    notifyAlreadyActive(name) {
        toast.show(i18n.t('messages.channelAlreadyActive', { name }));
    }

    /**
     * 删除渠道
     * @param {string} name - 渠道名称
     */
    async deleteChannel(name) {
        const confirmed = await confirmDialog.show({
            title: i18n.t('confirm.deleteTitle'),
            message: i18n.t('messages.confirmDelete', { name }),
            confirmText: i18n.t('confirm.delete'),
            cancelText: i18n.t('confirm.cancel')
        });
        
        if (!confirmed) {
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
            const result = await api.launchClaude(state.terminalDir);

            if (result.success) {
                toast.show(i18n.t('messages.channelLaunched', { name }));
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
        const { name, token, url, model, balanceUrl, balanceMethod, balanceField } = formData;

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

        // 验证自定义模型名称（可选）
        const modelValidation = Validation.validateModel(model);
        if (!modelValidation.valid) {
            toast.show(i18n.t(modelValidation.error));
            return;
        }

        // 验证余额查询：如果填了 URL 则字段必填
        if (balanceUrl && !balanceField) {
            toast.show(i18n.t('messages.errorBalanceFieldRequired'));
            return;
        }

        try {
            const result = await api.saveChannel({
                configPath: state.configPath,
                channelName: name,
                token: token,
                url: url || '',
                model: model || '',
                oldName: state.editingChannel || '',
                balanceUrl: balanceUrl || '',
                balanceMethod: balanceMethod || 'POST',
                balanceField: balanceField || ''
            });

            if (result.success) {
                const isEditingActiveChannel = state.editingChannel && state.editingChannel === state.activeChannelName;

                if (isEditingActiveChannel) {
                    state.activeChannelName = null;
                }

                toast.show(state.editingChannel ? i18n.t('messages.channelUpdated') : i18n.t('messages.channelCreated'));
                modal.close();
                await this.loadChannels(isEditingActiveChannel);
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

    /**
     * 查询渠道余额
     * @param {string} name - 渠道名称
     * @param {HTMLElement} balanceEl - 余额显示元素
     */
    async queryBalance(name, balanceEl) {
        const config = state.channels[name];
        const balanceApi = config?.balanceApi;
        if (!balanceApi?.url) return;

        const balanceValue = balanceEl.querySelector('.balance-value');
        const token = config.env?.ANTHROPIC_AUTH_TOKEN;

        if (!token) {
            balanceValue.textContent = i18n.t('channels.balance.noToken');
            return;
        }

        balanceValue.textContent = i18n.t('channels.balance.loading');

        try {
            const result = await api.queryBalance(balanceApi.url, balanceApi.method || 'POST', token);
            balanceValue.classList.remove('hint');

            if (result.success && result.data) {
                // 如果配置了字段路径，则提取字段值；否则显示原始响应
                if (balanceApi.field) {
                    balanceValue.textContent = this.extractBalanceValue(result.data, balanceApi.field);
                } else {
                    balanceValue.textContent = result.data;
                }
            } else {
                balanceValue.textContent = i18n.t('channels.balance.error');
            }
        } catch (error) {
            balanceValue.textContent = i18n.t('channels.balance.error');
            balanceValue.classList.remove('hint');
        }
    }

    /**
     * 从响应数据中提取余额值
     * @param {string} data - 响应数据
     * @param {string} field - 字段路径
     * @returns {string} 余额值或错误提示
     */
    extractBalanceValue(data, field) {
        const errorText = i18n.t('channels.balance.error');

        let json;
        try {
            json = JSON.parse(data);
        } catch {
            const match = data.match(/\{[\s\S]*\}/);
            if (!match) return errorText;
            try {
                json = JSON.parse(match[0]);
            } catch {
                return errorText;
            }
        }

        const value = this.findField(json, field);
        return value !== undefined ? String(value) : errorText;
    }

    /**
     * 递归查找指定字段
     * @param {any} obj - 对象
     * @param {string} field - 字段路径
     * @param {number} depth - 递归深度
     * @returns {any} 找到的值
     */
    findField(obj, field, depth = 0) {
        if (depth > 10 || !obj || typeof obj !== 'object') return undefined;

        const keys = field.split('.');
        let val = obj;
        for (const k of keys) {
            if (val && typeof val === 'object' && k in val) {
                val = val[k];
            } else {
                val = undefined;
                break;
            }
        }
        if (val !== undefined) return val;

        const entries = Array.isArray(obj) ? obj : Object.values(obj);
        for (const item of entries) {
            if (item && typeof item === 'object') {
                const result = this.findField(item, field, depth + 1);
                if (result !== undefined) return result;
            }
        }
        return undefined;
    }
}

// 创建全局实例
const channels = new ChannelManager();

