/**
 * Codex 渠道管理功能模块
 * 负责 Codex 渠道的 CRUD 操作、列表渲染和状态管理
 * 渠道数据存储在 codexConfigPath/url2key.txt 中，多个渠道用 ========= 分隔
 * 通过 OPENAI_API_KEY / OPENAI_BASE_URL 环境变量判断激活状态和执行切换
 */
class CodexManager {
    constructor() {
        this.codexList = null;
        this.codexCount = null;
        this.codexChannels = [];
        this.currentApiKey = '';
        this.currentBaseUrl = '';
        this.editingIndex = -1;
        this.modal = null;
        this.nameInput = null;
        this.baseurlInput = null;
        this.apikeyInput = null;
        this.modelInput = null;
    }

    init() {
        this.codexList = document.getElementById('codex-list');
        this.codexCount = document.querySelector('.codex-channel-count');
        this.modal = document.getElementById('codex-modal');
        this.nameInput = document.getElementById('codex-name-input');
        this.baseurlInput = document.getElementById('codex-baseurl-input');
        this.apikeyInput = document.getElementById('codex-apikey-input');
        this.modelInput = document.getElementById('codex-model-input');

        this.setupEventListeners();
    }

    setupEventListeners() {
        const addBtn = document.getElementById('add-codex-btn');
        const refreshBtn = document.getElementById('refresh-codex-btn');
        const closeBtn = document.getElementById('codex-modal-close-btn');
        const cancelBtn = document.getElementById('codex-modal-cancel-btn');
        const saveBtn = document.getElementById('codex-modal-save-btn');

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

    async loadChannels() {
        try {
            const envResult = await api.getCurrentCodexEnv(state.codexConfigPath);
            if (envResult.success && envResult.data) {
                this.currentApiKey = envResult.data.api_key || '';
                this.currentBaseUrl = envResult.data.base_url || '';
            } else {
                this.currentApiKey = '';
                this.currentBaseUrl = '';
            }

            const result = await api.getCodexChannels(state.codexConfigPath);

            if (!result.success) {
                ErrorHandler.handle(result.error, '加载 Codex 渠道失败');
                this.codexChannels = [];
                this.renderChannels();
                return;
            }

            this.codexChannels = result.data || [];
            this.renderChannels();
        } catch (error) {
            ErrorHandler.handle(error, 'Load Codex channels');
            this.codexChannels = [];
            this.renderChannels();
        }
    }

    render() {
        this.loadChannels();
    }

    isChannelActive(channel) {
        return this.currentApiKey
            && channel.apikey === this.currentApiKey
            && channel.baseurl === this.currentBaseUrl;
    }

    renderChannels() {
        if (!this.codexList || !this.codexCount) return;

        const count = this.codexChannels.length;
        this.codexCount.textContent = `${count} ${i18n.t('codex.count')}`;

        if (count === 0) {
            this.codexList.innerHTML = `
                <div class="empty-state">
                    <div class="empty-icon">${i18n.t('codex.empty.icon')}</div>
                    <div class="empty-text">${i18n.t('codex.empty.text')}</div>
                    <div class="empty-hint">${i18n.t('codex.empty.hint')}</div>
                </div>
            `;
            return;
        }

        const fragment = document.createDocumentFragment();
        this.codexChannels.forEach((channel, index) => {
            const isActive = this.isChannelActive(channel);
            const card = this.createChannelCard(channel, index, isActive);
            fragment.appendChild(card);
        });

        this.codexList.innerHTML = '';
        this.codexList.appendChild(fragment);
    }

    createChannelCard(channel, index, isActive) {
        const card = document.createElement('div');
        card.className = `channel-card${isActive ? ' active' : ''}`;

        const displayName = channel.name || '-';
        const displayModel = channel.model || '-';

        const statusText = isActive ? i18n.t('codex.status.active') : i18n.t('codex.status.inactive');
        const statusIndicator = `<span class="status-indicator ${isActive ? 'active' : ''}"></span> ${statusText}`;

        card.innerHTML = `
            <div class="channel-header">
                <div class="channel-icon">📘</div>
                <div class="channel-info">
                    <div class="channel-name">${DOMUtils.escapeHtml(displayName)}</div>
                    <div class="channel-url">${DOMUtils.escapeHtml(displayModel)}</div>
                    <div class="channel-status">${statusIndicator}</div>
                </div>
            </div>
            <div class="channel-actions">
                ${isActive ? `<button class="btn btn-success btn-small launch-btn">🚀 ${i18n.t('codex.actions.launch')}</button>` : ''}
                <button class="btn btn-primary btn-small switch-btn" ${isActive ? 'disabled' : ''}>⚡ ${i18n.t('codex.actions.switch')}</button>
                <button class="btn btn-edit btn-small edit-btn">✏️ ${i18n.t('codex.actions.edit')}</button>
                <button class="btn btn-danger btn-small delete-btn">🗑️ ${i18n.t('codex.actions.delete')}</button>
            </div>
        `;

        this.attachCardEventListeners(card, channel, index, isActive);
        return card;
    }

    attachCardEventListeners(card, channel, index, isActive) {
        if (isActive) {
            const launchBtn = card.querySelector('.launch-btn');
            launchBtn?.addEventListener('click', () => this.launchCodex());
        }

        const switchBtn = card.querySelector('.switch-btn');
        if (!isActive) {
            switchBtn?.addEventListener('click', () => this.switchChannel(channel));
        }

        const editBtn = card.querySelector('.edit-btn');
        editBtn?.addEventListener('click', () => this.openEditModal(channel, index));

        const deleteBtn = card.querySelector('.delete-btn');
        deleteBtn?.addEventListener('click', () => this.deleteChannel(index));
    }

    async switchChannel(channel) {
        this.currentApiKey = channel.apikey;
        this.currentBaseUrl = channel.baseurl;
        this.renderChannels();

        try {
            const result = await api.switchCodexChannel({
                codexConfigPath: state.codexConfigPath,
                name: channel.name || '',
                apiKey: channel.apikey,
                baseUrl: channel.baseurl,
                model: channel.model || ''
            });

            if (result.success) {
                toast.show(i18n.t('codex.messages.channelSwitched'));
            } else {
                this.currentApiKey = '';
                this.currentBaseUrl = '';
                this.renderChannels();
                ErrorHandler.showError(result.error, '切换失败');
            }
        } catch (error) {
            this.currentApiKey = '';
            this.currentBaseUrl = '';
            this.renderChannels();
            ErrorHandler.showError(error, '切换失败');
        }
    }

    async launchCodex() {
        try {
            const result = await api.launchCodex(state.terminalDir);

            if (result.success) {
                toast.show(i18n.t('codex.messages.channelLaunched'));
            } else {
                ErrorHandler.showError(result.error, '启动失败');
            }
        } catch (error) {
            ErrorHandler.showError(error, '启动失败');
        }
    }

    openNewModal() {
        this.editingIndex = -1;
        const titleEl = document.getElementById('codex-modal-title');
        if (titleEl) {
            titleEl.textContent = i18n.t('codex.modal.titleNew');
        }
        this.nameInput.value = '';
        this.baseurlInput.value = '';
        this.apikeyInput.value = '';
        this.modelInput.value = '';
        this.modal.classList.add('active');
    }

    openEditModal(channel, index) {
        this.editingIndex = index;
        const titleEl = document.getElementById('codex-modal-title');
        if (titleEl) {
            titleEl.textContent = i18n.t('codex.modal.titleEdit');
        }
        this.nameInput.value = channel.name || '';
        this.baseurlInput.value = channel.baseurl || '';
        this.apikeyInput.value = channel.apikey || '';
        this.modelInput.value = channel.model || '';
        this.modal.classList.add('active');
    }

    closeModal() {
        this.modal.classList.remove('active');
        this.editingIndex = -1;
    }

    async saveChannel() {
        const name = this.nameInput.value.trim();
        const baseurl = this.baseurlInput.value.trim();
        const apikey = this.apikeyInput.value.trim();
        const model = this.modelInput.value.trim();

        if (!name) {
            toast.show(i18n.t('codex.messages.errorNameRequired'));
            return;
        }

        if (!/^[A-Za-z0-9\-_]{1,18}$/.test(name)) {
            toast.show(i18n.t('codex.messages.errorNameInvalid'));
            return;
        }

        if (!baseurl) {
            toast.show(i18n.t('codex.messages.errorBaseurlRequired'));
            return;
        }

        if (!apikey) {
            toast.show(i18n.t('codex.messages.errorApikeyRequired'));
            return;
        }

        if (!model) {
            toast.show(i18n.t('codex.messages.errorModelRequired'));
            return;
        }

        try {
            const result = await api.saveCodexChannel({
                codexConfigPath: state.codexConfigPath,
                name: name,
                baseurl: baseurl,
                apikey: apikey,
                model: model,
                editIndex: this.editingIndex
            });

            if (result.success) {
                toast.show(this.editingIndex >= 0
                    ? i18n.t('codex.messages.channelUpdated')
                    : i18n.t('codex.messages.channelCreated'));
                this.closeModal();
                await this.loadChannels();
            } else {
                ErrorHandler.showError(result.error, '保存失败');
            }
        } catch (error) {
            ErrorHandler.showError(error, '保存失败');
        }
    }

    async deleteChannel(index) {
        const confirmed = await confirmDialog.show({
            title: i18n.t('confirm.deleteTitle'),
            message: i18n.t('codex.messages.confirmDelete'),
            confirmText: i18n.t('confirm.delete'),
            cancelText: i18n.t('confirm.cancel')
        });

        if (!confirmed) return;

        try {
            const result = await api.deleteCodexChannel(state.codexConfigPath, index);

            if (result.success) {
                toast.show(i18n.t('codex.messages.channelDeleted'));
                await this.loadChannels();
            } else {
                ErrorHandler.showError(result.error, '删除失败');
            }
        } catch (error) {
            ErrorHandler.showError(error, '删除失败');
        }
    }

    async refreshChannels() {
        const refreshBtn = document.getElementById('refresh-codex-btn');

        DOMUtils.setElementState(refreshBtn, true);
        DOMUtils.setElementState(this.codexList, true);

        await this.loadChannels();

        setTimeout(() => {
            DOMUtils.setElementState(this.codexList, false);
            DOMUtils.setElementState(refreshBtn, false);
            toast.show(i18n.t('codex.messages.channelsRefreshed'));
        }, 300);
    }

    updateLanguage() {
        const pageTitle = document.querySelector('#codex-page .page-title');
        if (pageTitle) {
            pageTitle.textContent = i18n.t('codex.title');
        }

        const refreshBtn = document.getElementById('refresh-codex-btn');
        if (refreshBtn) {
            refreshBtn.querySelector('span:last-child').textContent = i18n.t('codex.refresh');
            refreshBtn.setAttribute('aria-label', i18n.t('aria.refreshCodex'));
        }

        const addBtn = document.getElementById('add-codex-btn');
        if (addBtn) {
            addBtn.querySelector('span:last-child').textContent = i18n.t('codex.add');
            addBtn.setAttribute('aria-label', i18n.t('aria.addCodex'));
        }

        const modalTitle = document.getElementById('codex-modal-title');
        if (modalTitle && this.editingIndex < 0) {
            modalTitle.textContent = i18n.t('codex.modal.titleNew');
        }

        const labels = this.modal?.querySelectorAll('.form-label');
        if (labels && labels.length >= 4) {
            labels[0].textContent = i18n.t('codex.modal.fields.name');
            labels[1].textContent = i18n.t('codex.modal.fields.baseurl');
            labels[2].textContent = i18n.t('codex.modal.fields.apikey');
            labels[3].textContent = i18n.t('codex.modal.fields.model');
        }

        if (this.nameInput) {
            this.nameInput.placeholder = i18n.t('codex.modal.fields.namePlaceholder');
        }
        if (this.baseurlInput) {
            this.baseurlInput.placeholder = i18n.t('codex.modal.fields.baseurlPlaceholder');
        }
        if (this.apikeyInput) {
            this.apikeyInput.placeholder = i18n.t('codex.modal.fields.apikeyPlaceholder');
        }
        if (this.modelInput) {
            this.modelInput.placeholder = i18n.t('codex.modal.fields.modelPlaceholder');
        }

        const cancelBtn = document.getElementById('codex-modal-cancel-btn');
        if (cancelBtn) {
            cancelBtn.textContent = i18n.t('codex.modal.buttons.cancel');
        }

        const saveBtn = document.getElementById('codex-modal-save-btn');
        if (saveBtn) {
            saveBtn.textContent = i18n.t('codex.modal.buttons.save');
        }

        this.renderChannels();
    }
}

const codex = new CodexManager();
