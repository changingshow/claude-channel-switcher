/**
 * Codex 渠道管理功能模块
 * 负责 Codex 渠道的 CRUD 操作、列表渲染和状态管理
 * 渠道数据存储在 codexConfigPath/channels.json 中
 * 通过 auth.json 中的 OPENAI_API_KEY 判断激活状态和执行切换
 */
const CODEX_SWITCHING_MIN_DURATION = 300;

class CodexManager {
    constructor() {
        this.codexList = null;
        this.codexCount = null;
        this.codexChannels = [];
        this.currentApiKey = '';
        this.switchingChannelName = null;
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
            } else {
                this.currentApiKey = '';
            }

            const result = await api.getCodexChannels(state.codexConfigPath);

            if (!result.success) {
                ErrorHandler.handle(result.error, '加载 Codex 渠道失败');
                this.codexChannels = [];
                this.renderChannels();
                return;
            }

            this.codexChannels = (result.data || []).map(channel => ({
                ...channel,
                baseurl: this.normalizeBaseUrl(channel.baseurl || '')
            }));
            this.renderChannels();
        } catch (error) {
            ErrorHandler.handle(error, 'Load Codex channels');
            this.currentApiKey = '';
            this.codexChannels = [];
            this.renderChannels();
        }
    }

    render() {
        return this.loadChannels();
    }

    normalizeBaseUrl(baseurl) {
        const raw = String(baseurl || '').trim();
        if (!raw) {
            return '';
        }

        try {
            const url = new URL(raw);
            if (url.protocol !== 'http:' && url.protocol !== 'https:') {
                return raw;
            }

            url.hash = '';
            const trimmedPath = url.pathname.replace(/\/+$/, '');
            url.pathname = trimmedPath || '/';

            let normalized = url.toString();
            if (!url.search && url.pathname === '/' && normalized.endsWith('/')) {
                normalized = normalized.slice(0, -1);
            }
            return normalized;
        } catch {
            return raw;
        }
    }

    isChannelActive(channel) {
        return !!this.currentApiKey && channel.apikey === this.currentApiKey;
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
        const isAnySwitching = !!this.switchingChannelName;
        this.codexChannels.forEach((channel, index) => {
            const isActive = this.isChannelActive(channel);
            const isSwitching = channel.name === this.switchingChannelName;
            const card = this.createChannelCard(channel, index, isActive, isSwitching, isAnySwitching);
            fragment.appendChild(card);
        });

        this.codexList.innerHTML = '';
        this.codexList.appendChild(fragment);
    }

    createChannelCard(channel, index, isActive, isSwitching, isAnySwitching) {
        const card = document.createElement('div');
        card.className = `channel-card${isActive ? ' active' : ''}${isSwitching ? ' switching' : ''}`;
        card.setAttribute('aria-busy', isSwitching ? 'true' : 'false');

        const displayName = channel.name || '-';
        const displayModel = channel.model || '-';

        let statusClass = '';
        let statusText = i18n.t('codex.status.inactive');
        if (isSwitching) {
            statusClass = 'switching';
            statusText = i18n.t('codex.status.switching');
        } else if (isActive) {
            statusClass = 'active';
            statusText = i18n.t('codex.status.active');
        }
        const statusIndicator = `<span class="status-indicator ${statusClass}"></span> ${statusText}`;
        const switchLabel = isSwitching
            ? `⏳ ${i18n.t('codex.actions.switching')}`
            : `⚡ ${i18n.t('codex.actions.switch')}`;
        const actionsDisabled = isAnySwitching ? 'disabled' : '';
        const switchingBadge = isSwitching
            ? `<div class="channel-switching-badge"><span class="channel-switching-spinner" aria-hidden="true"></span><span>${i18n.t('codex.actions.switching')}</span></div>`
            : '';

        card.innerHTML = `
            ${switchingBadge}
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
                <button class="btn btn-primary btn-small switch-btn" ${isActive || isAnySwitching ? 'disabled' : ''}>${switchLabel}</button>
                <button class="btn btn-edit btn-small edit-btn" ${actionsDisabled}>✏️ ${i18n.t('codex.actions.edit')}</button>
                <button class="btn btn-danger btn-small delete-btn" ${actionsDisabled}>🗑️ ${i18n.t('codex.actions.delete')}</button>
            </div>
        `;

        this.attachCardEventListeners(card, channel, index, isActive, isSwitching, isAnySwitching);
        return card;
    }

    attachCardEventListeners(card, channel, index, isActive, isSwitching, isAnySwitching) {
        if (isActive) {
            const launchBtn = card.querySelector('.launch-btn');
            if (!isAnySwitching) {
                launchBtn?.addEventListener('click', () => this.launchCodex());
            }
        }

        const switchBtn = card.querySelector('.switch-btn');
        if (!isActive && !isSwitching && !isAnySwitching) {
            switchBtn?.addEventListener('click', () => this.switchChannel(channel));
        }

        const editBtn = card.querySelector('.edit-btn');
        if (!isAnySwitching) {
            editBtn?.addEventListener('click', () => this.openEditModal(channel, index));
        }

        const deleteBtn = card.querySelector('.delete-btn');
        if (!isAnySwitching) {
            deleteBtn?.addEventListener('click', () => this.deleteChannel(index));
        }
    }

    async switchChannel(channel) {
        if (this.switchingChannelName) {
            return;
        }

        const switchStartedAt = Date.now();
        this.switchingChannelName = channel.name || '';
        this.renderChannels();

        try {
            const result = await api.switchCodexChannel(state.codexConfigPath, channel.name || '');
            await this.ensureSwitchingVisible(switchStartedAt);

            if (result.success) {
                this.switchingChannelName = null;
                toast.show(i18n.t('codex.messages.channelSwitched'));
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
        if (elapsed >= CODEX_SWITCHING_MIN_DURATION) {
            return;
        }

        await new Promise(resolve => {
            setTimeout(resolve, CODEX_SWITCHING_MIN_DURATION - elapsed);
        });
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

        const duplicateName = this.codexChannels.some((channel, index) =>
            channel.name === name && index !== this.editingIndex
        );
        if (duplicateName) {
            toast.show(i18n.t('codex.messages.errorNameDuplicate'));
            return;
        }

        if (!baseurl) {
            toast.show(i18n.t('codex.messages.errorBaseurlRequired'));
            return;
        }

        let normalizedBaseUrl = '';
        try {
            const parsedUrl = new URL(baseurl);
            if (parsedUrl.protocol !== 'http:' && parsedUrl.protocol !== 'https:') {
                throw new Error('invalid protocol');
            }
            normalizedBaseUrl = this.normalizeBaseUrl(baseurl);
        } catch {
            toast.show(i18n.t('codex.messages.errorBaseurlInvalid'));
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
                baseurl: normalizedBaseUrl,
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
