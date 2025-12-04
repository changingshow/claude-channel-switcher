const { ipcRenderer } = require('electron');
const path = require('path');
const os = require('os');
const i18n = require('./i18n');

const DEFAULT_CONFIG_PATH = path.join(os.homedir(), '.claude');
const TOAST_DURATION = 3000;
const REFRESH_ANIMATION_DURATION = 300;

const state = {
    configPath: localStorage.getItem('configPath') || DEFAULT_CONFIG_PATH,
    terminal: localStorage.getItem('terminal') || 'wt',
    terminalDir: localStorage.getItem('terminalDir') || os.homedir(),
    theme: localStorage.getItem('theme') || 'dark',
    language: localStorage.getItem('language') || 'zh-CN',
    channels: {},
    activeChannelName: null,
    editingChannel: null,
    // Droid 相关状态
    droidChannels: [],
    currentDroidApiKey: '',
    editingDroidChannel: null
};

const elements = {};

document.addEventListener('DOMContentLoaded', () => {
    initializeApp();
});

function initializeApp() {
    cacheElements();
    i18n.setLanguage(state.language);
    applyTheme(state.theme);
    updateUILanguage();
    setupNavigation();
    setupModal();
    setupDroidModal();
    setupConfirmDialog();
    setupSettings();
    loadChannels();
    loadDroidChannels();
}

function cacheElements() {
    elements.modal = document.getElementById('channel-modal');
    elements.modalTitle = document.getElementById('modal-title');
    elements.channelNameInput = document.getElementById('channel-name-input');
    elements.channelTokenInput = document.getElementById('channel-token-input');
    elements.channelUrlInput = document.getElementById('channel-url-input');
    elements.channelModelInput = document.getElementById('channel-model-input');
    elements.channelsList = document.getElementById('channels-list');
    elements.channelCount = document.querySelector('.channel-count');
    elements.toast = document.getElementById('toast');
    // Droid 相关元素
    elements.droidModal = document.getElementById('droid-modal');
    elements.droidModalTitle = document.getElementById('droid-modal-title');
    elements.droidNameInput = document.getElementById('droid-name-input');
    elements.droidApiKeyInput = document.getElementById('droid-apikey-input');
    elements.droidList = document.getElementById('droid-list');
    elements.droidCount = document.querySelector('.droid-channel-count');
    // 确认对话框
    elements.confirmDialog = document.getElementById('confirm-dialog');
    elements.confirmTitle = document.getElementById('confirm-dialog-title');
    elements.confirmMessage = document.getElementById('confirm-dialog-message');
    elements.confirmCancelBtn = document.getElementById('confirm-dialog-cancel');
    elements.confirmConfirmBtn = document.getElementById('confirm-dialog-confirm');
}

function setupNavigation() {
    const navItems = document.querySelectorAll('.nav-item');
    navItems.forEach(item => {
        item.addEventListener('click', () => {
            const page = item.dataset.page;
            switchPage(page);

            navItems.forEach(nav => nav.classList.remove('active'));
            item.classList.add('active');
        });
    });
}

function switchPage(pageName) {
    const pages = document.querySelectorAll('.page');
    pages.forEach(page => page.classList.remove('active'));
    document.getElementById(`${pageName}-page`).classList.add('active');
    
    // 切换到 droid 页面时刷新渠道列表
    if (pageName === 'droid') {
        loadDroidChannels();
    }
}

function setupModal() {
    const addBtn = document.getElementById('add-channel-btn');
    const refreshBtn = document.getElementById('refresh-channel-btn');
    const closeBtn = document.getElementById('modal-close-btn');
    const cancelBtn = document.getElementById('modal-cancel-btn');
    const saveBtn = document.getElementById('modal-save-btn');

    addBtn.addEventListener('click', openNewChannelModal);
    refreshBtn.addEventListener('click', handleRefreshChannels);
    closeBtn.addEventListener('click', closeModal);
    cancelBtn.addEventListener('click', closeModal);
    saveBtn.addEventListener('click', handleSaveChannel);
}

function openNewChannelModal() {
    state.editingChannel = null;
    elements.modalTitle.textContent = i18n.t('modal.titleNew');
    elements.channelNameInput.value = '';
    elements.channelTokenInput.value = '';
    elements.channelUrlInput.value = '';
    elements.channelModelInput.value = '';
    elements.modal.classList.add('active');
}

function closeModal() {
    elements.modal.classList.remove('active');
}

async function handleRefreshChannels() {
    const refreshBtn = document.getElementById('refresh-channel-btn');

    setElementState(refreshBtn, true);
    setElementState(elements.channelsList, true);

    await loadChannels();

    setTimeout(() => {
        setElementState(elements.channelsList, false);
        setElementState(refreshBtn, false);
        showToast(i18n.t('messages.channelsRefreshed'), 'success');
    }, REFRESH_ANIMATION_DURATION);
}

function setElementState(element, isLoading) {
    if (element.tagName === 'BUTTON') {
        element.disabled = isLoading;
        element.style.opacity = isLoading ? '0.5' : '1';
        element.style.cursor = isLoading ? 'not-allowed' : 'pointer';
    } else {
        element.style.opacity = isLoading ? '0.5' : '1';
        element.style.filter = isLoading ? 'blur(2px)' : 'none';
    }
}

async function handleSaveChannel() {
    const name = elements.channelNameInput.value.trim();
    const token = elements.channelTokenInput.value.trim();
    const url = elements.channelUrlInput.value.trim();
    const model = elements.channelModelInput.value.trim();

    // 验证渠道名称
    if (!name) {
        showToast(i18n.t('messages.errorNameRequired'), 'error');
        return;
    }

    // 检查渠道名称是否重复（编辑时排除当前渠道）
    if (state.channels[name] && state.editingChannel !== name) {
        showToast(i18n.t('messages.errorNameDuplicate'), 'error');
        return;
    }

    // 验证 API Token
    if (!token) {
        showToast(i18n.t('messages.errorTokenRequired'), 'error');
        return;
    }

    // 验证 Base URL
    if (!url) {
        showToast(i18n.t('messages.errorUrlRequired'), 'error');
        return;
    }

    try {
        const urlObj = new URL(url);
        if (urlObj.protocol !== 'http:' && urlObj.protocol !== 'https:') {
            showToast(i18n.t('messages.errorUrlInvalid'), 'error');
            return;
        }
    } catch {
        showToast(i18n.t('messages.errorUrlInvalid'), 'error');
        return;
    }

    const result = await ipcRenderer.invoke('save-channel', state.configPath, name, {
        token,
        url,
        model,
        oldName: state.editingChannel
    });

    if (result.success) {
        const isEditingActiveChannel = state.editingChannel && state.editingChannel === state.activeChannelName;

        if (isEditingActiveChannel) {
            state.activeChannelName = null;
        }

        showToast(state.editingChannel ? i18n.t('messages.channelUpdated') : i18n.t('messages.channelCreated'), 'success');
        closeModal();
        loadChannels(isEditingActiveChannel);
    } else {
        showToast(i18n.t('messages.errorSave', { error: result.error }), 'error');
    }
}

function setupSettings() {
    const pathInput = document.getElementById('config-path-input');
    const browseBtn = document.getElementById('browse-path-btn');
    const terminalDirInput = document.getElementById('terminal-dir-input');
    const browseTerminalDirBtn = document.getElementById('browse-terminal-dir-btn');
    const terminalButtons = document.querySelectorAll('.terminal-btn');
    const themeButtons = document.querySelectorAll('.theme-btn');
    const languageButtons = document.querySelectorAll('.language-btn');

    pathInput.value = state.configPath;
    terminalDirInput.value = state.terminalDir;

    updateTerminalButtons();
    updateThemeButtons();
    updateLanguageButtons();
    checkTerminalAvailability();

    browseBtn.addEventListener('click', () => handleBrowsePath(pathInput));
    browseTerminalDirBtn.addEventListener('click', () => handleBrowseTerminalDir(terminalDirInput));

    terminalButtons.forEach(btn => {
        btn.addEventListener('click', () => handleTerminalChange(btn.dataset.terminal));
    });

    themeButtons.forEach(btn => {
        btn.addEventListener('click', () => handleThemeChange(btn.dataset.theme));
    });

    languageButtons.forEach(btn => {
        btn.addEventListener('click', () => handleLanguageChange(btn.dataset.language));
    });
}

async function checkTerminalAvailability() {
    const wtButton = document.querySelector('.terminal-btn[data-terminal="wt"]');
    if (!wtButton) return;

    const result = await ipcRenderer.invoke('check-terminal-available', 'wt');
    if (result.success && !result.available) {
        wtButton.style.opacity = '0.5';
        wtButton.title = '未安装 Windows Terminal';
    }
}

async function handleBrowsePath(pathInput) {
    const result = await ipcRenderer.invoke('select-directory');
    if (result.success) {
        state.configPath = result.path;
        pathInput.value = state.configPath;
        localStorage.setItem('configPath', state.configPath);
        loadChannels();
        showToast(i18n.t('messages.pathUpdated'), 'success');
    }
}

async function handleBrowseTerminalDir(terminalDirInput) {
    const result = await ipcRenderer.invoke('select-directory');
    if (result.success) {
        state.terminalDir = result.path;
        terminalDirInput.value = state.terminalDir;
        localStorage.setItem('terminalDir', state.terminalDir);
        showToast(i18n.t('messages.terminalDirUpdated'), 'success');
    }
}

function handleTerminalChange(selectedTerminal) {
    state.terminal = selectedTerminal;
    localStorage.setItem('terminal', state.terminal);
    updateTerminalButtons();
    const terminalName = i18n.t(`settings.terminal.presets.${selectedTerminal}`);
    showToast(i18n.t('messages.terminalSet', { terminal: terminalName }), 'success');
}

function handleThemeChange(selectedTheme) {
    state.theme = selectedTheme;
    localStorage.setItem('theme', state.theme);
    applyTheme(state.theme);
    updateThemeButtons();
    const themeName = state.theme === 'dark' ? i18n.t('settings.theme.dark') : i18n.t('settings.theme.light');
    showToast(i18n.t('messages.themeChanged', { theme: themeName }), 'success');
}

async function loadChannels(skipActiveUpdate = false) {
    const result = await ipcRenderer.invoke('get-channels', state.configPath);

    if (!result.success) {
        console.error('加载渠道失败:', result.error);
        state.channels = {};
        renderChannels();
        return;
    }

    state.channels = result.channels;
    if (!skipActiveUpdate) {
        await updateActiveChannel();
    }
    renderChannels();
}

async function updateActiveChannel() {
    const activeResult = await ipcRenderer.invoke('get-active-channel', state.configPath);
    if (!activeResult.success) {
        state.activeChannelName = null;
        return;
    }

    const activeConfig = activeResult.config;
    const activeToken = activeConfig.env?.ANTHROPIC_AUTH_TOKEN;
    const activeUrl = activeConfig.env?.ANTHROPIC_BASE_URL || '';

    state.activeChannelName = findChannelByCredentials(activeToken, activeUrl);
}

function findChannelByCredentials(token, url) {
    for (const [name, config] of Object.entries(state.channels)) {
        const channelToken = config.env?.ANTHROPIC_AUTH_TOKEN;
        const channelUrl = config.env?.ANTHROPIC_BASE_URL || '';
        if (channelToken === token && channelUrl === url) {
            return name;
        }
    }
    return null;
}

function renderChannels() {
    const count = Object.keys(state.channels).length;
    elements.channelCount.textContent = `${count} ${i18n.t('channels.count')}`;

    if (count === 0) {
        elements.channelsList.innerHTML = `
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
        const card = createChannelCard(name, isActive);
        fragment.appendChild(card);
    });

    elements.channelsList.innerHTML = '';
    elements.channelsList.appendChild(fragment);
}

function createChannelCard(name, isActive) {
    const card = document.createElement('div');
    card.className = `channel-card${isActive ? ' active' : ''}`;

    const statusText = isActive ? i18n.t('channels.status.active') : i18n.t('channels.status.inactive');
    const statusIndicator = `<span class="status-indicator ${isActive ? 'active' : ''}"></span> ${statusText}`;

    card.innerHTML = `
        <div class="channel-header">
            <div class="channel-icon">📡</div>
            <div class="channel-info">
                <div class="channel-name">${escapeHtml(name)}</div>
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

    attachCardEventListeners(card, name, isActive);
    return card;
}

function attachCardEventListeners(card, name, isActive) {
    if (isActive) {
        const launchBtn = card.querySelector('.launch-btn');
        launchBtn?.addEventListener('click', () => launchClaude(name));
    }

    const editBtn = card.querySelector('.edit-btn');
    editBtn?.addEventListener('click', () => editChannel(name));

    const switchBtn = card.querySelector('.switch-btn');
    if (!isActive) {
        switchBtn?.addEventListener('click', () => switchChannel(name));
    }

    const deleteBtn = card.querySelector('.delete-btn');
    deleteBtn?.addEventListener('click', () => deleteChannel(name));
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function editChannel(name) {
    const config = state.channels[name];
    state.editingChannel = name;

    elements.modalTitle.textContent = i18n.t('modal.titleEdit');
    elements.channelNameInput.value = name;
    elements.channelTokenInput.value = config.env?.ANTHROPIC_AUTH_TOKEN || '';
    elements.channelUrlInput.value = config.env?.ANTHROPIC_BASE_URL || '';
    elements.channelModelInput.value = config.model || '';

    elements.modal.classList.add('active');
}

async function switchChannel(name) {
    const result = await ipcRenderer.invoke('switch-channel', state.configPath, name);

    if (result.success) {
        showToast(i18n.t('messages.channelSwitched', { name }), 'success');
        loadChannels();
    } else {
        showToast(i18n.t('messages.errorSwitch', { error: result.error }), 'error');
    }
}

async function deleteChannel(name) {
    const confirmed = await showConfirmDialog({
        title: i18n.t('confirm.deleteTitle'),
        message: i18n.t('messages.confirmDelete', { name }),
        confirmText: i18n.t('confirm.delete'),
        cancelText: i18n.t('confirm.cancel')
    });
    
    if (!confirmed) {
        return;
    }

    const result = await ipcRenderer.invoke('delete-channel', state.configPath, name);

    if (result.success) {
        showToast(i18n.t('messages.channelDeleted', { name }), 'success');
        loadChannels();
    } else {
        showToast(i18n.t('messages.errorDelete', { error: result.error }), 'error');
    }
}

async function launchClaude(name) {
    const result = await ipcRenderer.invoke('launch-claude', state.terminal, state.terminalDir);

    if (result.success) {
        showToast(i18n.t('messages.channelLaunched', { name, terminal: state.terminal }), 'success');
    } else {
        showToast(i18n.t('messages.errorLaunch', { error: result.error }), 'error');
    }
}

// ==================== Droid 渠道管理 ====================

function setupDroidModal() {
    const addBtn = document.getElementById('add-droid-btn');
    const refreshBtn = document.getElementById('refresh-droid-btn');
    const closeBtn = document.getElementById('droid-modal-close-btn');
    const cancelBtn = document.getElementById('droid-modal-cancel-btn');
    const saveBtn = document.getElementById('droid-modal-save-btn');

    addBtn?.addEventListener('click', openNewDroidModal);
    refreshBtn?.addEventListener('click', handleRefreshDroidChannels);
    closeBtn?.addEventListener('click', closeDroidModal);
    cancelBtn?.addEventListener('click', closeDroidModal);
    saveBtn?.addEventListener('click', handleSaveDroidChannel);
}

function openNewDroidModal() {
    state.editingDroidChannel = null;
    elements.droidModalTitle.textContent = i18n.t('droid.modal.titleNew');
    elements.droidNameInput.value = '';
    elements.droidApiKeyInput.value = '';
    elements.droidModal.classList.add('active');
}

function openEditDroidModal(channel) {
    state.editingDroidChannel = channel.name;
    elements.droidModalTitle.textContent = i18n.t('droid.modal.titleEdit');
    elements.droidNameInput.value = channel.name;
    elements.droidApiKeyInput.value = channel.api_key;
    elements.droidModal.classList.add('active');
}

function closeDroidModal() {
    elements.droidModal.classList.remove('active');
    state.editingDroidChannel = null;
}

async function handleRefreshDroidChannels() {
    const refreshBtn = document.getElementById('refresh-droid-btn');

    setElementState(refreshBtn, true);
    setElementState(elements.droidList, true);

    await loadDroidChannels();

    setTimeout(() => {
        setElementState(elements.droidList, false);
        setElementState(refreshBtn, false);
        showToast(i18n.t('droid.messages.channelsRefreshed'), 'success');
    }, REFRESH_ANIMATION_DURATION);
}

async function loadDroidChannels() {
    // 获取当前环境变量
    const envResult = await ipcRenderer.invoke('get-current-factory-api-key');
    state.currentDroidApiKey = envResult.success ? (envResult.data || '') : '';

    const result = await ipcRenderer.invoke('get-droid-channels', state.configPath);

    if (!result.success) {
        console.error('加载 Droid 渠道失败:', result.error);
        state.droidChannels = [];
        renderDroidChannels();
        return;
    }

    state.droidChannels = result.data || [];
    renderDroidChannels();
}

function renderDroidChannels() {
    if (!elements.droidList || !elements.droidCount) return;

    const count = state.droidChannels.length;
    elements.droidCount.textContent = `${count} ${i18n.t('droid.count')}`;

    if (count === 0) {
        elements.droidList.innerHTML = `
            <div class="empty-state">
                <div class="empty-icon">${i18n.t('droid.empty.icon')}</div>
                <div class="empty-text">${i18n.t('droid.empty.text')}</div>
                <div class="empty-hint">${i18n.t('droid.empty.hint')}</div>
            </div>
        `;
        return;
    }

    const fragment = document.createDocumentFragment();
    state.droidChannels.forEach((channel) => {
        const isActive = state.currentDroidApiKey && channel.api_key === state.currentDroidApiKey;
        const card = createDroidChannelCard(channel, isActive);
        fragment.appendChild(card);
    });

    elements.droidList.innerHTML = '';
    elements.droidList.appendChild(fragment);
}

function createDroidChannelCard(channel, isActive) {
    const card = document.createElement('div');
    card.className = `channel-card${isActive ? ' active' : ''}`;

    const statusText = isActive ? i18n.t('droid.status.active') : i18n.t('droid.status.inactive');
    const statusIndicator = `<span class="status-indicator ${isActive ? 'active' : ''}"></span> ${statusText}`;

    card.innerHTML = `
        <div class="channel-header">
            <div class="channel-icon">🤖</div>
            <div class="channel-info">
                <div class="channel-name">${escapeHtml(channel.name)}</div>
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

    attachDroidCardEventListeners(card, channel, isActive);
    return card;
}

function attachDroidCardEventListeners(card, channel, isActive) {
    if (isActive) {
        const launchBtn = card.querySelector('.launch-btn');
        launchBtn?.addEventListener('click', () => launchDroid(channel));
    }

    const editBtn = card.querySelector('.edit-btn');
    editBtn?.addEventListener('click', () => openEditDroidModal(channel));

    const switchBtn = card.querySelector('.switch-btn');
    if (!isActive) {
        switchBtn?.addEventListener('click', () => switchDroidChannel(channel));
    }

    const deleteBtn = card.querySelector('.delete-btn');
    deleteBtn?.addEventListener('click', () => deleteDroidChannel(channel));
}

async function handleSaveDroidChannel() {
    const name = elements.droidNameInput.value.trim();
    const apiKey = elements.droidApiKeyInput.value.trim();

    if (!name) {
        showToast(i18n.t('droid.messages.errorNameRequired'), 'error');
        return;
    }

    if (!apiKey) {
        showToast(i18n.t('droid.messages.errorApiKeyRequired'), 'error');
        return;
    }

    // 检查名称重复
    const isDuplicate = state.droidChannels.some(
        c => c.name === name && state.editingDroidChannel !== name
    );
    if (isDuplicate) {
        showToast(i18n.t('droid.messages.errorNameDuplicate'), 'error');
        return;
    }

    const result = await ipcRenderer.invoke(
        'save-droid-channel',
        state.configPath,
        name,
        apiKey,
        state.editingDroidChannel || ''
    );

    if (result.success) {
        showToast(state.editingDroidChannel 
            ? i18n.t('droid.messages.channelUpdated') 
            : i18n.t('droid.messages.channelCreated'), 'success');
        closeDroidModal();
        await loadDroidChannels();
    } else {
        showToast(i18n.t('messages.errorSave', { error: result.error }), 'error');
    }
}

async function switchDroidChannel(channel) {
    const result = await ipcRenderer.invoke('switch-droid-channel', channel.api_key);

    if (result.success) {
        state.currentDroidApiKey = channel.api_key;
        showToast(i18n.t('droid.messages.channelSwitched', { name: channel.name }), 'success');
        renderDroidChannels();
    } else {
        showToast(i18n.t('messages.errorSwitch', { error: result.error }), 'error');
    }
}

async function deleteDroidChannel(channel) {
    const confirmed = await showConfirmDialog({
        title: i18n.t('confirm.deleteTitle'),
        message: i18n.t('droid.messages.confirmDelete', { name: channel.name }),
        confirmText: i18n.t('confirm.delete'),
        cancelText: i18n.t('confirm.cancel')
    });
    
    if (!confirmed) {
        return;
    }

    const result = await ipcRenderer.invoke('delete-droid-channel', state.configPath, channel.name);

    if (result.success) {
        showToast(i18n.t('droid.messages.channelDeleted', { name: channel.name }), 'success');
        await loadDroidChannels();
    } else {
        showToast(i18n.t('messages.errorDelete', { error: result.error }), 'error');
    }
}

async function launchDroid(channel) {
    const result = await ipcRenderer.invoke('launch-droid', state.terminal, state.terminalDir);

    if (result.success) {
        showToast(i18n.t('droid.messages.channelLaunched', { name: channel.name, terminal: state.terminal }), 'success');
    } else {
        showToast(i18n.t('messages.errorLaunch', { error: result.error }), 'error');
    }
}

// ==================== 确认对话框 ====================

let confirmResolve = null;

function setupConfirmDialog() {
    elements.confirmCancelBtn?.addEventListener('click', () => closeConfirmDialog(false));
    elements.confirmConfirmBtn?.addEventListener('click', () => closeConfirmDialog(true));
    
    elements.confirmDialog?.addEventListener('click', (e) => {
        if (e.target === elements.confirmDialog) {
            closeConfirmDialog(false);
        }
    });
    
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && elements.confirmDialog?.classList.contains('active')) {
            closeConfirmDialog(false);
        }
    });
}

function showConfirmDialog(options = {}) {
    const {
        title = i18n.t('confirm.deleteTitle'),
        message = i18n.t('confirm.deleteMessage'),
        confirmText = i18n.t('confirm.delete'),
        cancelText = i18n.t('confirm.cancel')
    } = options;

    elements.confirmTitle.textContent = title;
    elements.confirmMessage.textContent = message;
    elements.confirmConfirmBtn.textContent = confirmText;
    elements.confirmCancelBtn.textContent = cancelText;

    elements.confirmDialog.classList.add('active');
    elements.confirmConfirmBtn.focus();

    return new Promise((resolve) => {
        confirmResolve = resolve;
    });
}

function closeConfirmDialog(result) {
    elements.confirmDialog.classList.remove('active');
    if (confirmResolve) {
        confirmResolve(result);
        confirmResolve = null;
    }
}

function showToast(message, type = 'info') {
    elements.toast.textContent = message;
    elements.toast.classList.add('show');

    setTimeout(() => {
        elements.toast.classList.remove('show');
    }, TOAST_DURATION);
}

async function applyTheme(themeName) {
    document.body.classList.toggle('light-theme', themeName === 'light');
    await ipcRenderer.invoke('set-titlebar-theme', themeName);
}

function updateTerminalButtons() {
    const terminalButtons = document.querySelectorAll('.terminal-btn');
    terminalButtons.forEach(btn => {
        const isActive = btn.dataset.terminal === state.terminal;
        btn.style.borderColor = isActive ? 'var(--accent-primary)' : '';
        btn.style.color = isActive ? 'var(--accent-primary)' : '';
    });
}

function updateThemeButtons() {
    const themeButtons = document.querySelectorAll('.theme-btn');
    themeButtons.forEach(btn => {
        const isActive = btn.dataset.theme === state.theme;
        btn.style.borderColor = isActive ? 'var(--accent-primary)' : '';
        btn.style.color = isActive ? 'var(--accent-primary)' : '';
    });
}

function updateLanguageButtons() {
    const languageButtons = document.querySelectorAll('.language-btn');
    languageButtons.forEach(btn => {
        const isActive = btn.dataset.language === state.language;
        btn.style.borderColor = isActive ? 'var(--accent-primary)' : '';
        btn.style.color = isActive ? 'var(--accent-primary)' : '';
    });
}

function handleLanguageChange(selectedLanguage) {
    state.language = selectedLanguage;
    localStorage.setItem('language', state.language);
    i18n.setLanguage(state.language);
    updateLanguageButtons();
    updateUILanguage();

    const langName = selectedLanguage === 'zh-CN' ? '简体中文' : 'English';
    showToast(i18n.t('messages.languageChanged', { language: langName }), 'success');
}

function updateUILanguage() {
    document.title = i18n.t('app.title');

    updateNavigationLanguage();
    updateChannelsPageLanguage();
    updateDroidPageLanguage();
    updateSettingsPageLanguage();
    updateModalLanguage();
    updateDroidModalLanguage();

    renderChannels();
    renderDroidChannels();
}

function updateNavigationLanguage() {
    document.querySelector('.logo-text').innerHTML = i18n.t('app.title').replace(' ', '<br>');
    document.querySelector('.version').textContent = i18n.t('app.version');

    const navItems = document.querySelectorAll('.nav-item');
    navItems.forEach(item => {
        const page = item.dataset.page;
        const textSpan = item.querySelector('.nav-text');
        if (textSpan) {
            textSpan.textContent = i18n.t(`nav.${page}`);
        }
        item.setAttribute('aria-label', i18n.t(`aria.${page}Page`));
    });
}

function updateChannelsPageLanguage() {
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
}

function updateSettingsPageLanguage() {
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
            if (title) title.textContent = i18n.t('settings.terminal.title');
            if (description) description.textContent = i18n.t('settings.terminal.description');

            const terminalButtons = card.querySelectorAll('.terminal-btn');
            terminalButtons.forEach(btn => {
                const terminal = btn.dataset.terminal;
                const icon = terminal === 'powershell' ? '💻' : (terminal === 'pwsh' ? '⚡' : '📟');
                btn.innerHTML = `<span aria-hidden="true">${icon}</span> ${i18n.t(`settings.terminal.presets.${terminal}`)}`;
            });
        } else if (index === 2) {
            if (title) title.textContent = i18n.t('settings.terminalDir.title');
            if (description) description.textContent = i18n.t('settings.terminalDir.description');

            const browseBtn = card.querySelector('#browse-terminal-dir-btn');
            if (browseBtn) {
                browseBtn.textContent = i18n.t('settings.terminalDir.browse');
                browseBtn.setAttribute('aria-label', i18n.t('aria.browseFolder'));
            }
        } else if (index === 3) {
            if (title) title.textContent = i18n.t('settings.theme.title');
            if (description) description.textContent = i18n.t('settings.theme.description');

            const themeButtons = card.querySelectorAll('.theme-btn');
            themeButtons.forEach(btn => {
                const theme = btn.dataset.theme;
                btn.innerHTML = `<span aria-hidden="true">${theme === 'dark' ? '🌙' : '☀️'}</span> ${i18n.t(`settings.theme.${theme}`)}`;
            });
        } else if (index === 4) {
            if (title) title.textContent = i18n.t('settings.language.title');
            if (description) description.textContent = i18n.t('settings.language.description');

            const langButtons = card.querySelectorAll('.language-btn');
            langButtons.forEach(btn => {
                const lang = btn.dataset.language;
                const langKey = lang === 'zh-CN' ? 'zhCN' : 'enUS';
                btn.textContent = `${lang === 'zh-CN' ? '🌏' : '🌍'} ${i18n.t(`settings.language.${langKey}`)}`;
            });
        } else if (index === 5) {
            if (title) title.textContent = i18n.t('settings.about.title');

            const aboutText = card.querySelector('.about-text');
            if (aboutText) {
                const githubLink = aboutText.querySelector('.github-link');
                const githubLinkHtml = githubLink ? githubLink.outerHTML : '';
                aboutText.innerHTML = i18n.t('settings.about.text').replace(/\n/g, '<br>') + '<br><br>' + 
                    (githubLinkHtml || `<a href="https://github.com/changingshow/claude-channel-switcher" target="_blank" rel="noopener noreferrer" class="github-link"><span aria-hidden="true">🔗</span> ${i18n.t('settings.about.githubLink')}</a>`);
            }
        }
    });
}

function updateModalLanguage() {
    elements.channelNameInput.placeholder = i18n.t('modal.fields.namePlaceholder');
    elements.channelTokenInput.placeholder = i18n.t('modal.fields.tokenPlaceholder');
    elements.channelUrlInput.placeholder = i18n.t('modal.fields.urlPlaceholder');

    const labels = document.querySelectorAll('#channel-modal .modal-body .form-label');
    if (labels[0]) labels[0].textContent = i18n.t('modal.fields.name');
    if (labels[1]) labels[1].textContent = i18n.t('modal.fields.token');
    if (labels[2]) labels[2].textContent = i18n.t('modal.fields.url');

    const closeBtn = document.getElementById('modal-close-btn');
    if (closeBtn) {
        closeBtn.setAttribute('aria-label', i18n.t('aria.closeDialog'));
    }

    const cancelBtn = document.getElementById('modal-cancel-btn');
    if (cancelBtn) {
        cancelBtn.textContent = i18n.t('modal.buttons.cancel');
    }

    const saveBtn = document.getElementById('modal-save-btn');
    if (saveBtn) {
        saveBtn.textContent = i18n.t('modal.buttons.save');
    }
}

function updateDroidPageLanguage() {
    const pageTitle = document.querySelector('#droid-page .page-title');
    if (pageTitle) {
        pageTitle.textContent = i18n.t('droid.title');
    }

    const refreshBtn = document.getElementById('refresh-droid-btn');
    if (refreshBtn) {
        refreshBtn.querySelector('span:last-child').textContent = i18n.t('droid.refresh');
    }

    const addBtn = document.getElementById('add-droid-btn');
    if (addBtn) {
        addBtn.querySelector('span:last-child').textContent = i18n.t('droid.add');
    }
}

function updateDroidModalLanguage() {
    if (!elements.droidNameInput || !elements.droidApiKeyInput) return;

    elements.droidNameInput.placeholder = i18n.t('droid.modal.fields.namePlaceholder');
    elements.droidApiKeyInput.placeholder = i18n.t('droid.modal.fields.apiKeyPlaceholder');

    const labels = document.querySelectorAll('#droid-modal .modal-body .form-label');
    if (labels[0]) labels[0].textContent = i18n.t('droid.modal.fields.name');
    if (labels[1]) labels[1].textContent = i18n.t('droid.modal.fields.apiKey');

    const cancelBtn = document.getElementById('droid-modal-cancel-btn');
    if (cancelBtn) {
        cancelBtn.textContent = i18n.t('droid.modal.buttons.cancel');
    }

    const saveBtn = document.getElementById('droid-modal-save-btn');
    if (saveBtn) {
        saveBtn.textContent = i18n.t('droid.modal.buttons.save');
    }
}
