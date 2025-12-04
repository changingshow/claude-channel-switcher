/**
 * Droid 渠道管理功能模块
 * 负责 Droid 渠道的 CRUD 操作、列表渲染和状态管理
 */
class DroidManager {
    constructor() {
        this.droidList = null;
        this.droidCount = null;
        this.droidChannels = [];
        this.currentApiKey = '';  // 当前环境变量中的 FACTORY_API_KEY
        this.editingDroidChannel = null;
        this.modal = null;
        this.nameInput = null;
        this.apiKeyInput = null;
    }

    /**
     * 初始化 Droid 管理
     */
    init() {
        this.droidList = document.getElementById('droid-list');
        this.droidCount = document.querySelector('.droid-channel-count');
        this.modal = document.getElementById('droid-modal');
        this.nameInput = document.getElementById('droid-name-input');
        this.apiKeyInput = document.getElementById('droid-apikey-input');

        this.setupEventListeners();
    }

    /**
     * 设置事件监听
     */
    setupEventListeners() {
        const addBtn = document.getElementById('add-droid-btn');
        const refreshBtn = document.getElementById('refresh-droid-btn');
        const closeBtn = document.getElementById('droid-modal-close-btn');
        const cancelBtn = document.getElementById('droid-modal-cancel-btn');
        const saveBtn = document.getElementById('droid-modal-save-btn');

        if (addBtn) {
            addBtn.addEventListener('click', () => this.openNewModal());
        }

        if (refreshBtn) {
            const debouncedRefresh = debounce(() => this.refreshChannels(), 300);
            refreshBtn.addEventListener('click', debouncedRefresh);
        }

        if (closeBtn) {
            closeBtn.addEventListener('click', () => this.closeModal());
        }

        if (cancelBtn) {
            cancelBtn.addEventListener('click', () => this.closeModal());
        }

        if (saveBtn) {
            saveBtn.addEventListener('click', () => this.saveChannel());
        }
    }

    /**
     * 加载 Droid 渠道列表
     */
    async loadChannels() {
        try {
            // 获取当前环境变量中的 FACTORY_API_KEY
            const envResult = await api.getCurrentFactoryApiKey();
            if (envResult.success) {
                this.currentApiKey = envResult.data || '';
            } else {
                this.currentApiKey = '';
            }

            const result = await api.getDroidChannels(state.configPath);

            if (!result.success) {
                ErrorHandler.handle(result.error, '加载 Droid 渠道失败');
                this.droidChannels = [];
                this.renderChannels();
                return;
            }

            this.droidChannels = result.data || [];
            this.renderChannels();
        } catch (error) {
            ErrorHandler.handle(error, 'Load Droid channels');
            this.droidChannels = [];
            this.renderChannels();
        }
    }

    /**
     * 渲染 Droid 渠道列表
     */
    renderChannels() {
        if (!this.droidList || !this.droidCount) return;

        const count = this.droidChannels.length;
        this.droidCount.textContent = `${count} ${i18n.t('droid.count')}`;

        if (count === 0) {
            this.droidList.innerHTML = `
                <div class="empty-state">
                    <div class="empty-icon">${i18n.t('droid.empty.icon')}</div>
                    <div class="empty-text">${i18n.t('droid.empty.text')}</div>
                    <div class="empty-hint">${i18n.t('droid.empty.hint')}</div>
                </div>
            `;
            return;
        }

        const fragment = document.createDocumentFragment();
        this.droidChannels.forEach((channel) => {
            // 根据 api_key 与当前环境变量对比判断激活状态
            const isActive = this.currentApiKey && channel.api_key === this.currentApiKey;
            const card = this.createChannelCard(channel, isActive);
            fragment.appendChild(card);
        });

        this.droidList.innerHTML = '';
        this.droidList.appendChild(fragment);
    }

    /**
     * 创建 Droid 渠道卡片
     */
    createChannelCard(channel, isActive) {
        const card = document.createElement('div');
        card.className = `channel-card${isActive ? ' active' : ''}`;

        const statusText = isActive ? i18n.t('droid.status.active') : i18n.t('droid.status.inactive');
        const statusIndicator = `<span class="status-indicator ${isActive ? 'active' : ''}"></span> ${statusText}`;

        card.innerHTML = `
            <div class="channel-header">
                <div class="channel-icon">🤖</div>
                <div class="channel-info">
                    <div class="channel-name">${DOMUtils.escapeHtml(channel.name)}</div>
                    <div class="channel-status">${statusIndicator}</div>
                </div>
            </div>
            <div class="channel-actions">
                ${isActive ? `<button class="btn btn-success btn-small launch-btn">🚀 ${i18n.t('droid.actions.launch')}</button>` : ''}
                <button class="btn btn-primary btn-small switch-btn" ${isActive ? 'disabled' : ''}>⚡ ${i18n.t('droid.actions.switch')}</button>
                <button class="btn btn-secondary btn-small edit-btn">✏️ ${i18n.t('droid.actions.edit')}</button>
                <button class="btn btn-danger btn-small delete-btn">🗑️ ${i18n.t('droid.actions.delete')}</button>
            </div>
        `;

        this.attachCardEventListeners(card, channel, isActive);
        return card;
    }

    /**
     * 为渠道卡片附加事件监听器
     */
    attachCardEventListeners(card, channel, isActive) {
        if (isActive) {
            const launchBtn = card.querySelector('.launch-btn');
            launchBtn?.addEventListener('click', () => this.launchDroid(channel));
        }

        const editBtn = card.querySelector('.edit-btn');
        editBtn?.addEventListener('click', () => this.openEditModal(channel));

        const switchBtn = card.querySelector('.switch-btn');
        if (!isActive) {
            switchBtn?.addEventListener('click', () => this.switchChannel(channel));
        }

        const deleteBtn = card.querySelector('.delete-btn');
        deleteBtn?.addEventListener('click', () => this.deleteChannel(channel));
    }

    /**
     * 打开新建模态框
     */
    openNewModal() {
        this.editingDroidChannel = null;
        const titleEl = document.getElementById('droid-modal-title');
        if (titleEl) {
            titleEl.textContent = i18n.t('droid.modal.titleNew');
        }
        this.nameInput.value = '';
        this.apiKeyInput.value = '';
        this.modal.classList.add('active');
    }

    /**
     * 打开编辑模态框
     */
    openEditModal(channel) {
        this.editingDroidChannel = channel.name;
        const titleEl = document.getElementById('droid-modal-title');
        if (titleEl) {
            titleEl.textContent = i18n.t('droid.modal.titleEdit');
        }
        this.nameInput.value = channel.name;
        this.apiKeyInput.value = channel.api_key;
        this.modal.classList.add('active');
    }

    /**
     * 关闭模态框
     */
    closeModal() {
        this.modal.classList.remove('active');
        this.editingDroidChannel = null;
    }

    /**
     * 保存渠道
     */
    async saveChannel() {
        const name = this.nameInput.value.trim();
        const apiKey = this.apiKeyInput.value.trim();

        if (!name) {
            toast.show(i18n.t('droid.messages.errorNameRequired'));
            return;
        }

        if (!apiKey) {
            toast.show(i18n.t('droid.messages.errorApiKeyRequired'));
            return;
        }

        // 检查名称重复（编辑时排除当前渠道）
        const isDuplicate = this.droidChannels.some(
            c => c.name === name && this.editingDroidChannel !== name
        );
        if (isDuplicate) {
            toast.show(i18n.t('droid.messages.errorNameDuplicate'));
            return;
        }

        try {
            const result = await api.saveDroidChannel({
                configPath: state.configPath,
                name: name,
                apiKey: apiKey,
                oldName: this.editingDroidChannel || ''
            });

            if (result.success) {
                toast.show(this.editingDroidChannel 
                    ? i18n.t('droid.messages.channelUpdated') 
                    : i18n.t('droid.messages.channelCreated'));
                this.closeModal();
                await this.loadChannels();
            } else {
                ErrorHandler.showError(result.error, '保存失败');
            }
        } catch (error) {
            ErrorHandler.showError(error, '保存失败');
        }
    }

    /**
     * 切换渠道
     */
    async switchChannel(channel) {
        try {
            const result = await api.switchDroidChannel(channel.api_key);

            if (result.success) {
                this.currentApiKey = channel.api_key;
                toast.show(i18n.t('droid.messages.channelSwitched', { name: channel.name }));
                this.renderChannels();
            } else {
                ErrorHandler.showError(result.error, '切换失败');
            }
        } catch (error) {
            ErrorHandler.showError(error, '切换失败');
        }
    }

    /**
     * 删除渠道
     */
    async deleteChannel(channel) {
        const confirmed = await confirmDialog.show({
            title: i18n.t('confirm.deleteTitle'),
            message: i18n.t('droid.messages.confirmDelete', { name: channel.name }),
            confirmText: i18n.t('confirm.delete'),
            cancelText: i18n.t('confirm.cancel')
        });
        
        if (!confirmed) {
            return;
        }

        try {
            const result = await api.deleteDroidChannel(state.configPath, channel.name);

            if (result.success) {
                toast.show(i18n.t('droid.messages.channelDeleted', { name: channel.name }));
                await this.loadChannels();
            } else {
                ErrorHandler.showError(result.error, '删除失败');
            }
        } catch (error) {
            ErrorHandler.showError(error, '删除失败');
        }
    }

    /**
     * 启动 Droid
     */
    async launchDroid(channel) {
        try {
            const result = await api.launchDroid(state.terminal, state.terminalDir);

            if (result.success) {
                toast.show(i18n.t('droid.messages.channelLaunched', { 
                    name: channel.name, 
                    terminal: state.terminal 
                }));
            } else {
                ErrorHandler.showError(result.error, '启动失败');
            }
        } catch (error) {
            ErrorHandler.showError(error, '启动失败');
        }
    }

    /**
     * 刷新渠道列表
     */
    async refreshChannels() {
        const refreshBtn = document.getElementById('refresh-droid-btn');

        DOMUtils.setElementState(refreshBtn, true);
        DOMUtils.setElementState(this.droidList, true);

        await this.loadChannels();

        setTimeout(() => {
            DOMUtils.setElementState(this.droidList, false);
            DOMUtils.setElementState(refreshBtn, false);
            toast.show(i18n.t('droid.messages.channelsRefreshed'));
        }, 300);
    }

    /**
     * 更新页面语言
     */
    updateLanguage() {
        const pageTitle = document.querySelector('#droid-page .page-title');
        if (pageTitle) {
            pageTitle.textContent = i18n.t('droid.title');
        }

        const refreshBtn = document.getElementById('refresh-droid-btn');
        if (refreshBtn) {
            refreshBtn.querySelector('span:last-child').textContent = i18n.t('droid.refresh');
            refreshBtn.setAttribute('aria-label', i18n.t('aria.refreshDroid'));
        }

        const addBtn = document.getElementById('add-droid-btn');
        if (addBtn) {
            addBtn.querySelector('span:last-child').textContent = i18n.t('droid.add');
            addBtn.setAttribute('aria-label', i18n.t('aria.addDroid'));
        }

        // 更新模态框语言
        const modalTitle = document.getElementById('droid-modal-title');
        if (modalTitle && !this.editingDroidChannel) {
            modalTitle.textContent = i18n.t('droid.modal.titleNew');
        }

        const labels = this.modal?.querySelectorAll('.form-label');
        if (labels && labels.length >= 2) {
            labels[0].textContent = i18n.t('droid.modal.fields.name');
            labels[1].textContent = i18n.t('droid.modal.fields.apiKey');
        }

        if (this.nameInput) {
            this.nameInput.placeholder = i18n.t('droid.modal.fields.namePlaceholder');
        }
        if (this.apiKeyInput) {
            this.apiKeyInput.placeholder = i18n.t('droid.modal.fields.apiKeyPlaceholder');
        }

        const cancelBtn = document.getElementById('droid-modal-cancel-btn');
        if (cancelBtn) {
            cancelBtn.textContent = i18n.t('droid.modal.buttons.cancel');
        }

        const saveBtn = document.getElementById('droid-modal-save-btn');
        if (saveBtn) {
            saveBtn.textContent = i18n.t('droid.modal.buttons.save');
        }

        this.renderChannels();
    }
}

// 创建全局实例
const droid = new DroidManager();
