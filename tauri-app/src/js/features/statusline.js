/**
 * StatusLine 配置功能模块
 * 负责状态栏样式的可视化编辑和 PS1 文件管理
 */

// 预设项目模板
const ITEM_TEMPLATES = {
    model: {
        id: 'model',
        type: 'model',
        enabled: true,
        emoji: '🤖',
        label: 'Model',
        showLabel: false,
        color: 81,
        template: '$($data.model.display_name)',
        description: '显示当前使用的 Claude 模型名称'
    },
    context: {
        id: 'context',
        type: 'context',
        enabled: true,
        emoji: '⏳',
        label: 'Ctx',
        showLabel: false,
        color: 221,
        dynamicColor: true,
        colorRanges: [
            { threshold: 50, color: 114 },
            { threshold: 80, color: 221 },
            { threshold: 100, color: 210 }
        ],
        template: '$pct% ($usedK/$(K $maxTk))',
        description: '上下文窗口使用情况，颜色随使用率变化'
    },
    tokens: {
        id: 'tokens',
        type: 'tokens',
        enabled: true,
        emoji: '🧮',
        label: 'Token',
        showLabel: false,
        color: 153,
        template: '$(K($inTk+$outTk)) (I:$(K $inTk) O:$(K $outTk))',
        description: '显示输入和输出的 Token 统计'
    },
    cache: {
        id: 'cache',
        type: 'cache',
        enabled: true,
        emoji: '🎭',
        label: 'Cache',
        showLabel: false,
        color: 183,
        template: 'R$(K $cacheR) W$(K $cacheW)',
        description: '缓存读取和写入的 Token 数量'
    },
    cost: {
        id: 'cost',
        type: 'cost',
        enabled: true,
        emoji: '💰',
        label: 'Cost',
        showLabel: false,
        color: 222,
        template: '`$$cost',
        description: '本次会话的累计费用（美元）'
    },
    dir: {
        id: 'dir',
        type: 'dir',
        enabled: true,
        emoji: '📁',
        label: 'Dir',
        showLabel: false,
        color: 147,
        template: '$currentDir',
        description: '当前工作目录路径（自动缩写）'
    },
    time: {
        id: 'time',
        type: 'time',
        enabled: true,
        emoji: '🕐',
        label: 'Time',
        showLabel: false,
        color: 117,
        template: '$currentTime',
        description: '当前时间（HH:mm 格式）'
    }
};

// 默认配置
const DEFAULT_CONFIG = {
    separator: {
        style: 'pipe',
        custom: '|',
        color: 252,
        showStart: false,
        showEnd: false
    },
    items: [
        { ...ITEM_TEMPLATES.model },
        { ...ITEM_TEMPLATES.context },
        { ...ITEM_TEMPLATES.tokens },
        { ...ITEM_TEMPLATES.cache },
        { ...ITEM_TEMPLATES.cost },
        { ...ITEM_TEMPLATES.dir },
        { ...ITEM_TEMPLATES.time }
    ]
};

// 分隔符样式映射
const SEPARATOR_STYLES = {
    pipe: '|',
    dot: '•',
    dash: '—',
    arrow: '→',
    space: ' '
};

class StatuslineManager {
    constructor() {
        this.config = JSON.parse(JSON.stringify(DEFAULT_CONFIG));
        this.currentFile = null;
        this.files = [];
        this.draggedItem = null;
        this.isNewFile = false;
        this.initialized = false;
        // 存储事件监听器引用，便于清理
        this._eventListeners = [];
    }

    /**
     * 添加事件监听器（自动跟踪以便清理）
     */
    _addEventListener(target, event, handler, options) {
        target.addEventListener(event, handler, options);
        this._eventListeners.push({ target, event, handler, options });
    }

    /**
     * 销毁实例，清理所有事件监听器
     */
    destroy() {
        // 清理所有注册的事件监听器
        this._eventListeners.forEach(({ target, event, handler, options }) => {
            target.removeEventListener(event, handler, options);
        });
        this._eventListeners = [];

        // 清理拖拽相关的事件（以防万一）
        if (this.boundMouseMove) {
            document.removeEventListener('mousemove', this.boundMouseMove);
        }
        if (this.boundMouseUp) {
            document.removeEventListener('mouseup', this.boundMouseUp);
        }

        this.initialized = false;
    }

    /**
     * 初始化（由 app.js 在 API 初始化后调用）
     */
    init() {
        if (this.initialized) return;
        this.initialized = true;
        this.initEvents();
        this.loadFiles();
    }

    /**
     * 动态获取 DOM 元素（使用 getter 避免初始化时元素不存在的问题）
     */
    get filesList() {
        return document.getElementById('statusline-files');
    }

    get itemsList() {
        return document.getElementById('statusline-items');
    }

    get currentFileName() {
        return document.getElementById('current-file-name');
    }

    /**
     * 初始化事件监听
     */
    initEvents() {
        // 点击页面其他地方关闭下拉面板
        const handleDocumentClick = (e) => {
            if (!e.target.closest('.item-emoji-picker')) {
                this.closeAllDropdowns();
            }
        };
        this._addEventListener(document, 'click', handleDocumentClick);

        // 刷新文件列表按钮
        const refreshBtn = document.getElementById('refresh-files-btn');
        if (refreshBtn) {
            const handleRefresh = () => this.loadFiles();
            this._addEventListener(refreshBtn, 'click', handleRefresh);
        }

        // 创建新文件按钮
        const createBtn = document.getElementById('create-new-btn');
        if (createBtn) {
            const handleCreate = () => this.createNewFile();
            this._addEventListener(createBtn, 'click', handleCreate);
        }

        // 保存当前按钮
        const saveBtn = document.getElementById('save-current-btn');
        if (saveBtn) {
            const handleSave = () => this.saveCurrentFile();
            this._addEventListener(saveBtn, 'click', handleSave);
        }


        // 分隔符文本输入 - 实时更新
        const handleSeparatorInput = (e) => {
            if (e.target.matches('#separator-input')) {
                const value = e.target.value || '|';
                this.config.separator.custom = value;
                this.config.separator.style = 'custom';
                this.updatePreview();
            }
        };
        this._addEventListener(document, 'input', handleSeparatorInput);

        // 分隔符颜色 - 颜色选择器
        const handleColorPickerChange = (e) => {
            if (e.target.matches('#separator-color-picker')) {
                const hex = e.target.value;
                const hexInput = document.getElementById('separator-color-hex');
                const sepInput = document.getElementById('separator-input');
                if (hexInput) hexInput.value = hex;
                if (sepInput) sepInput.style.color = hex;
                this.config.separator.color = this.hexToAnsi(hex);
                this.updatePreview();
            }
        };
        this._addEventListener(document, 'input', handleColorPickerChange);
        this._addEventListener(document, 'change', handleColorPickerChange);

        // 分隔符颜色 - 十六进制输入
        const handleHexInput = (e) => {
            if (e.target.matches('#separator-color-hex')) {
                const hex = e.target.value.trim();
                if (/^#[0-9A-Fa-f]{6}$/.test(hex)) {
                    const colorPicker = document.getElementById('separator-color-picker');
                    const sepInput = document.getElementById('separator-input');
                    if (colorPicker) colorPicker.value = hex;
                    if (sepInput) sepInput.style.color = hex;
                    this.config.separator.color = this.hexToAnsi(hex);
                    this.updatePreview();
                } else if (/^#[0-9A-Fa-f]{3}$/.test(hex)) {
                    const expanded = '#' + hex[1] + hex[1] + hex[2] + hex[2] + hex[3] + hex[3];
                    const colorPicker = document.getElementById('separator-color-picker');
                    const sepInput = document.getElementById('separator-input');
                    if (colorPicker) colorPicker.value = expanded;
                    if (sepInput) sepInput.style.color = expanded;
                    this.config.separator.color = this.hexToAnsi(expanded);
                    this.updatePreview();
                }
            }
        };
        this._addEventListener(document, 'input', handleHexInput);
        this._addEventListener(document, 'blur', handleHexInput, true);

        // 开头/结尾分隔符勾选
        const handleSeparatorCheckbox = (e) => {
            if (e.target.matches('#separator-start')) {
                this.config.separator.showStart = e.target.checked;
                this.updatePreview();
            }
            if (e.target.matches('#separator-end')) {
                this.config.separator.showEnd = e.target.checked;
                this.updatePreview();
            }
        };
        this._addEventListener(document, 'change', handleSeparatorCheckbox);

        // 预览背景色 - 从 localStorage 加载
        this.loadPreviewBgColor();

        // 预览背景色
        const handlePreviewBgChange = (e) => {
            if (e.target.matches('#preview-bg-picker')) {
                const hex = e.target.value;
                this.setPreviewBgColor(hex);
            }
        };
        this._addEventListener(document, 'input', handlePreviewBgChange);
        this._addEventListener(document, 'change', handlePreviewBgChange);

        // 预览背景色 - 十六进制输入
        const handlePreviewBgHex = (e) => {
            if (e.target.matches('#preview-bg-hex')) {
                const hex = e.target.value.trim();
                if (/^#[0-9A-Fa-f]{6}$/.test(hex)) {
                    this.setPreviewBgColor(hex);
                } else if (/^#[0-9A-Fa-f]{3}$/.test(hex)) {
                    const expanded = '#' + hex[1] + hex[1] + hex[2] + hex[2] + hex[3] + hex[3];
                    this.setPreviewBgColor(expanded);
                }
            }
        };
        this._addEventListener(document, 'input', handlePreviewBgHex);
        this._addEventListener(document, 'blur', handlePreviewBgHex, true);
    }

    /**
     * 加载预览背景色
     */
    loadPreviewBgColor() {
        const savedColor = localStorage.getItem('statusline-preview-bg') || '#1e1e1e';
        this.setPreviewBgColor(savedColor, false);
    }

    /**
     * 设置预览背景色
     */
    setPreviewBgColor(hex, save = true) {
        const colorPicker = document.getElementById('preview-bg-picker');
        const hexInput = document.getElementById('preview-bg-hex');
        const preview = document.getElementById('terminal-preview');

        if (colorPicker) colorPicker.value = hex;
        if (hexInput) hexInput.value = hex;
        if (preview) preview.style.background = hex;

        if (save) {
            localStorage.setItem('statusline-preview-bg', hex);
        }
    }

    /**
     * 加载文件列表
     */
    async loadFiles() {
        try {
            const result = await api.getStatuslineFiles();
            if (result.success) {
                this.files = result.data || [];
                this.renderFilesList();

                // 如果有当前选中的文件，保持选中状态
                if (this.currentFile) {
                    this.selectFile(this.currentFile);
                } else if (this.files.length > 0) {
                    this.selectFile(this.files[0]);
                } else {
                    this.createNewFile();
                }
            }
        } catch (error) {
            ErrorHandler.handle(error, 'Load files');
        }
    }

    /**
     * 渲染文件列表
     */
    renderFilesList() {
        if (!this.filesList) return;

        if (this.files.length === 0) {
            this.filesList.innerHTML = `
                <div class="files-empty">
                    <div class="empty-icon">📭</div>
                    <div class="empty-text">${i18n.t('statusline.files.empty')}</div>
                    <div class="empty-hint">${i18n.t('statusline.files.emptyHint')}</div>
                </div>
            `;
            return;
        }

        this.filesList.innerHTML = '';

        this.files.forEach(file => {
            const fileEl = this.createFileElement(file);
            this.filesList.appendChild(fileEl);
        });
    }

    /**
     * 创建文件元素
     */
    createFileElement(file) {
        const div = document.createElement('div');
        div.className = `file-item${this.currentFile?.file_name === file.file_name ? ' active' : ''}`;
        div.dataset.fileName = file.file_name;

        // 转义文件名防止 XSS
        const safeName = this.escapeHtml(file.name);
        const safeFileName = this.escapeHtml(file.file_name);

        div.innerHTML = `
            <div class="file-icon">📄</div>
            <div class="file-info">
                <div class="file-name">${safeName}</div>
                <div class="file-meta">${this.formatDate(file.modified)}</div>
            </div>
            <div class="file-actions">
                <button class="btn-icon btn-apply" data-file="${safeFileName}" title="${i18n.t('statusline.files.apply')}">☑️</button>
                <button class="btn-icon btn-delete" data-file="${safeFileName}" title="${i18n.t('statusline.files.delete')}">🗑️</button>
            </div>
        `;

        // 点击选中文件
        div.addEventListener('click', (e) => {
            if (!e.target.closest('.file-actions')) {
                this.selectFile(file);
            }
        });

        // 应用按钮
        div.querySelector('.btn-apply')?.addEventListener('click', (e) => {
            e.stopPropagation();
            this.applyToFileSettings(file);
        });

        // 删除按钮
        div.querySelector('.btn-delete')?.addEventListener('click', (e) => {
            e.stopPropagation();
            this.deleteFile(file);
        });

        return div;
    }

    /**
     * 格式化日期
     */
    formatDate(timestamp) {
        const date = new Date(timestamp * 1000);
        const now = new Date();
        const diff = now - date;
        const days = Math.floor(diff / (1000 * 60 * 60 * 24));

        if (days === 0) {
            const hours = Math.floor(diff / (1000 * 60 * 60));
            if (hours === 0) {
                const minutes = Math.floor(diff / (1000 * 60));
                return minutes <= 1 ? i18n.t('statusline.files.justNow') : `${minutes}${i18n.t('statusline.files.minutesAgo')}`;
            }
            return `${hours}${i18n.t('statusline.files.hoursAgo')}`;
        } else if (days === 1) {
            return i18n.t('statusline.files.yesterday');
        } else if (days < 7) {
            return `${days}${i18n.t('statusline.files.daysAgo')}`;
        } else {
            return date.toLocaleDateString();
        }
    }

    /**
     * 选中文件
     */
    async selectFile(file) {
        this.currentFile = file;
        this.isNewFile = false;

        // 更新选中状态
        this.filesList.querySelectorAll('.file-item').forEach(el => {
            el.classList.toggle('active', el.dataset.fileName === file.file_name);
        });

        // 更新当前文件名显示
        if (this.currentFileName) {
            this.currentFileName.textContent = file.name;
        }

        // 加载文件内容并回显设置
        try {
            const result = await api.readStatuslineFile(file.file_name);
            if (result.success && result.data) {
                this.parseConfigFromPS1(result.data);
                this.renderItems();
                this.renderSeparator();
                this.updatePreview();
            }
        } catch (error) {
            ErrorHandler.handle(error, 'Load file');
        }
    }

    /**
     * 从 PS1 内容解析配置
     */
    parseConfigFromPS1(ps1Content) {
        // 重置为默认配置
        this.config = JSON.parse(JSON.stringify(DEFAULT_CONFIG));

        // 从 CONFIG 注释中解析
        const configStart = ps1Content.indexOf('# CONFIG:');
        if (configStart === -1) return;

        // 找到这一行的结束位置
        let configEnd = ps1Content.indexOf('\n', configStart);
        if (configEnd === -1) configEnd = ps1Content.length;

        // 提取 CONFIG JSON
        const configLine = ps1Content.substring(configStart + 9, configEnd).trim();

        try {
            const c = JSON.parse(configLine);

            // 回显分隔线
            if (c.sep) {
                this.config.separator.custom = c.sep;
                this.config.separator.style = 'custom';
            }
            if (c.sepColor !== undefined) {
                this.config.separator.color = c.sepColor;
            }
            this.config.separator.showStart = c.sepStart === 1;
            this.config.separator.showEnd = c.sepEnd === 1;

            // 回显项目: [type, emoji, label, showLabel, enabled, color]
            if (c.items && Array.isArray(c.items)) {
                const orderedItems = [];
                c.items.forEach(arr => {
                    const [type, emoji, label, showLabel, enabled, color] = arr;
                    const item = this.config.items.find(i => i.type === type);
                    if (item) {
                        item.emoji = emoji;
                        item.label = label;
                        item.showLabel = showLabel === 1;
                        item.enabled = enabled === 1;
                        item.color = color;
                        orderedItems.push(item);
                    }
                });
                // 添加未保存的默认项
                this.config.items.forEach(item => {
                    if (!orderedItems.includes(item)) {
                        orderedItems.push(item);
                    }
                });
                this.config.items = orderedItems;
            }
        } catch (e) {
            console.error('[Statusline] 解析失败:', e);
        }
    }

    /**
     * 创建新文件
     */
    createNewFile() {
        this.currentFile = null;
        this.isNewFile = true;

        // 重置为默认配置
        this.config = JSON.parse(JSON.stringify(DEFAULT_CONFIG));

        // 更新文件名显示
        if (this.currentFileName) {
            this.currentFileName.textContent = i18n.t('statusline.files.newFile');
        }

        // 取消文件列表选中状态
        this.filesList.querySelectorAll('.file-item').forEach(el => {
            el.classList.remove('active');
        });

        this.renderItems();
        this.renderSeparator();
        this.updatePreview();
    }

    /**
     * 保存当前文件
     */
    async saveCurrentFile() {
        if (this.isNewFile) {
            // 新文件：弹出对话框输入文件名
            this.showSaveNameDialog();
        } else if (this.currentFile) {
            // 现有文件：询问覆盖或另存
            this.showOverwriteOrSaveAsDialog();
        }
    }

    /**
     * 显示覆盖或另存对话框
     */
    showOverwriteOrSaveAsDialog() {
        // 转义文件名防止 XSS
        const safeName = this.escapeHtml(this.currentFile.name);
        const modalHtml = `
            <div class="modal active" id="save-choice-modal" role="dialog">
                <div class="modal-content" style="max-width: 400px;">
                    <header class="modal-header">
                        <h3 class="modal-title">${i18n.t('statusline.files.saveDialogTitle')}</h3>
                        <button class="modal-close" id="save-choice-modal-close">✕</button>
                    </header>
                    <div class="modal-body">
                        <p style="margin-bottom: 16px;">
                            ${i18n.t('statusline.files.saveChoiceMessage', { name: safeName })}
                        </p>
                        <div style="display: flex; flex-direction: column; gap: 12px;">
                            <button type="button" class="btn btn-primary" id="save-overwrite-btn" style="width: 100%;">
                                📝 ${i18n.t('statusline.files.overwrite')}
                            </button>
                            <button type="button" class="btn btn-secondary" id="save-as-btn" style="width: 100%;">
                                💾 ${i18n.t('statusline.files.saveAs')}
                            </button>
                        </div>
                    </div>
                    <footer class="modal-footer">
                        <button type="button" class="btn btn-secondary" id="save-choice-cancel">${i18n.t('modal.buttons.cancel')}</button>
                    </footer>
                </div>
            </div>
        `;

        document.body.insertAdjacentHTML('beforeend', modalHtml);

        const modal = document.getElementById('save-choice-modal');
        const closeBtn = modal.querySelector('#save-choice-modal-close');
        const overwriteBtn = modal.querySelector('#save-overwrite-btn');
        const saveAsBtn = modal.querySelector('#save-as-btn');
        const cancelBtn = modal.querySelector('#save-choice-cancel');

        closeBtn?.addEventListener('click', () => modal.remove());

        // 覆盖保存
        overwriteBtn?.addEventListener('click', async () => {
            await this.writeToFile(this.currentFile.file_name);
            modal.remove();
        });

        // 另存为
        saveAsBtn?.addEventListener('click', () => {
            modal.remove();
            this.showSaveNameDialog();
        });

        // 取消
        cancelBtn?.addEventListener('click', () => modal.remove());

        // ESC 关闭
        const escHandler = (e) => {
            if (e.key === 'Escape') {
                modal.remove();
                document.removeEventListener('keydown', escHandler);
            }
        };
        document.addEventListener('keydown', escHandler);
    }

    /**
     * 显示保存文件名对话框
     */
    showSaveNameDialog() {
        const modalHtml = `
            <div class="modal active" id="save-name-modal" role="dialog">
                <div class="modal-content" style="max-width: 400px;">
                    <header class="modal-header">
                        <h3 class="modal-title">${i18n.t('statusline.files.saveDialogTitle')}</h3>
                        <button class="modal-close" id="save-name-modal-close">✕</button>
                    </header>
                    <form id="save-name-form" class="modal-body">
                        <div class="form-group">
                            <label class="form-label">${i18n.t('statusline.files.nameLabel')}</label>
                            <input type="text" name="file_name" class="form-input" placeholder="${i18n.t('statusline.files.namePlaceholder')}" required autofocus>
                            <small style="color: var(--text-muted); font-size: 11px; margin-top: 4px; display: block;">
                                ${i18n.t('statusline.files.nameHint')}
                            </small>
                        </div>
                    </form>
                    <footer class="modal-footer">
                        <button type="button" class="btn btn-secondary" id="save-name-cancel">${i18n.t('modal.buttons.cancel')}</button>
                        <button type="button" class="btn btn-primary" id="save-name-confirm">${i18n.t('modal.buttons.save')}</button>
                    </footer>
                </div>
            </div>
        `;

        document.body.insertAdjacentHTML('beforeend', modalHtml);

        const modal = document.getElementById('save-name-modal');
        const closeBtn = modal.querySelector('#save-name-modal-close');
        const form = modal.querySelector('#save-name-form');
        const input = form.querySelector('input[name="file_name"]');
        const cancelBtn = modal.querySelector('#save-name-cancel');
        const confirmBtn = modal.querySelector('#save-name-confirm');

        closeBtn?.addEventListener('click', () => modal.remove());

        const doSave = async () => {
            const name = input.value.trim();
            if (!name) {
                toast.show(i18n.t('statusline.files.nameRequired'));
                return;
            }

            // 验证文件名
            if (!/^[a-zA-Z0-9_\u4e00-\u9fa5-]+$/.test(name)) {
                toast.show(i18n.t('statusline.files.nameInvalid'));
                return;
            }

            const fileName = `statusline_${name}.ps1`;

            // 检查是否存在同名文件
            const existingFile = this.files.find(f => f.file_name === fileName);
            if (existingFile) {
                toast.show(i18n.t('statusline.files.nameExists') || `文件 "${name}" 已存在，请使用其他名称`);
                input.focus();
                input.select();
                return;
            }

            await this.writeToFile(fileName);
            modal.remove();
        };

        cancelBtn?.addEventListener('click', () => modal.remove());
        confirmBtn?.addEventListener('click', doSave);
        input?.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                doSave();
            }
        });

        const escHandler = (e) => {
            if (e.key === 'Escape') {
                modal.remove();
                document.removeEventListener('keydown', escHandler);
            }
        };
        document.addEventListener('keydown', escHandler);

        input?.focus();
    }

    /**
     * 写入文件
     */
    async writeToFile(fileName) {
        const ps1Content = this.generatePS1();

        try {
            const result = await api.saveStatuslineFile(fileName, ps1Content);
            if (result.success) {
                toast.show(i18n.t('statusline.messages.fileSaved', { name: fileName.replace('statusline_', '').replace('.ps1', '') }));
                this.currentFile = {
                    file_name: fileName,
                    name: fileName.replace('statusline_', '').replace('.ps1', ''),
                    modified: Math.floor(Date.now() / 1000)
                };
                this.isNewFile = false;
                if (this.currentFileName) {
                    this.currentFileName.textContent = this.currentFile.name;
                }
                await this.loadFiles();
            } else {
                ErrorHandler.showError(result.error, 'Save failed');
            }
        } catch (error) {
            ErrorHandler.handle(error, 'Save file');
        }
    }

    /**
     * 删除文件
     */
    async deleteFile(file) {
        const confirmed = await confirmDialog.show({
            title: i18n.t('statusline.files.confirmDeleteTitle'),
            message: i18n.t('statusline.files.confirmDeleteMessage', { name: file.name }),
            confirmText: i18n.t('confirm.delete'),
            cancelText: i18n.t('confirm.cancel')
        });

        if (!confirmed) return;

        try {
            const result = await api.deleteStatuslineFile(file.file_name);
            if (result.success) {
                toast.show(i18n.t('statusline.messages.fileDeleted', { name: file.name }));

                if (this.currentFile?.file_name === file.file_name) {
                    this.createNewFile();
                }

                await this.loadFiles();
            } else {
                ErrorHandler.showError(result.error, 'Delete failed');
            }
        } catch (error) {
            ErrorHandler.handle(error, 'Delete file');
        }
    }

    /**
     * 应用到 settings.json
     */
    async applyToFileSettings(file) {
        try {
            const result = await api.applyStatuslineToSettings(file.file_name);
            if (result.success) {
                toast.show(i18n.t('statusline.messages.applied', { name: file.name }));
            } else {
                ErrorHandler.showError(result.error, 'Apply failed');
            }
        } catch (error) {
            ErrorHandler.handle(error, 'Apply to settings');
        }
    }

    /**
     * 重置当前配置
     */
    resetCurrentConfig() {
        this.config = JSON.parse(JSON.stringify(DEFAULT_CONFIG));
        this.renderItems();
        this.renderSeparator();
        this.updatePreview();
        toast.show(i18n.t('statusline.messages.reset'));
    }

    /**
     * 渲染项目列表
     */
    renderItems() {
        if (!this.itemsList) return;

        this.itemsList.innerHTML = '';

        this.config.items.forEach((item, index) => {
            const itemEl = this.createItemElement(item, index);
            this.itemsList.appendChild(itemEl);
        });
    }

    /**
     * HTML 转义
     */
    escapeHtml(str) {
        const div = document.createElement('div');
        div.textContent = str;
        return div.innerHTML;
    }

    /**
     * 创建项目元素
     */
    createItemElement(item, index) {
        const div = document.createElement('div');
        div.className = 'statusline-item';
        div.dataset.index = index;

        const enabledClass = item.enabled ? 'enabled' : 'disabled';
        // 确保 color 是数字类型，并转换为有效的十六进制颜色
        const colorValue = typeof item.color === 'number' ? item.color : parseInt(item.color) || 81;
        const hexColor = this.ansiToHex(colorValue) || '#5fd7ff';
        const description = item.description || ITEM_TEMPLATES[item.type]?.description || '';
        // 转义 label 防止 XSS
        const safeLabel = this.escapeHtml(item.label || '');

        // 生成分类 emoji 选择器 HTML
        const emojiCategoriesHtml = this.generateEmojiCategoriesHtml();

        div.innerHTML = `
            <div class="item-row">
                <div class="item-drag-zone" title="拖动排序">
                    <span class="drag-icon">⋮⋮</span>
                </div>
                <div class="item-main">
                    <div class="item-emoji-picker" title="点击选择图标">
                        <span class="current-emoji">${item.emoji}</span>
                        <div class="emoji-dropdown">
                            ${emojiCategoriesHtml}
                        </div>
                    </div>
                    <input type="text" class="item-label-input" value="${safeLabel}" style="color: ${hexColor}" title="点击编辑名称">
                </div>
                <div class="item-controls">
                    <label class="item-show-label-checkbox" title="显示名称">
                        <input type="checkbox" class="show-label-input" ${item.showLabel ? 'checked' : ''}>
                        <span>名称</span>
                    </label>
                    <input type="color" class="item-color-input" value="${hexColor}" title="选择颜色">
                    <button type="button" class="item-toggle-btn ${enabledClass}" title="${item.enabled ? '点击禁用' : '点击启用'}">
                        ${item.enabled ? '✓' : '○'}
                    </button>
                    <div class="item-info-btn" title="${description}">
                        <span>ℹ️</span>
                        <div class="item-tooltip">${description}</div>
                    </div>
                </div>
            </div>
        `;

        // 使用纯 JS 拖拽（不依赖 HTML5 drag API）
        const dragZone = div.querySelector('.item-drag-zone');

        dragZone.addEventListener('mousedown', (e) => {
            e.preventDefault();
            this.startDrag(div, index, e);
        });

        // 图标选择器点击事件
        const emojiPicker = div.querySelector('.item-emoji-picker');
        const emojiDropdown = div.querySelector('.emoji-dropdown');
        emojiPicker?.addEventListener('click', (e) => {
            if (e.target.closest('.emoji-option')) return;
            e.stopPropagation();
            this.closeAllDropdowns();
            emojiDropdown.classList.toggle('show');
        });

        // Emoji 选项点击
        div.querySelectorAll('.emoji-option').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const newEmoji = btn.dataset.emoji;
                item.emoji = newEmoji;
                emojiPicker.querySelector('.current-emoji').textContent = newEmoji;
                emojiDropdown.classList.remove('show');
                this.updatePreview();
            });
        });

        // 名称编辑
        const labelInput = div.querySelector('.item-label-input');
        const showLabelInput = div.querySelector('.show-label-input');

        // 确保颜色正确应用（直接设置 style 属性，避免 inline style 被覆盖）
        if (labelInput) {
            labelInput.style.color = hexColor;
        }

        labelInput?.addEventListener('input', (e) => {
            item.label = e.target.value;
            this.updatePreview();
        });
        labelInput?.addEventListener('blur', (e) => {
            if (!e.target.value.trim()) {
                e.target.value = ITEM_TEMPLATES[item.type]?.label || 'Item';
                item.label = e.target.value;
                this.updatePreview();
            }
        });

        // 颜色选择器事件
        const colorInput = div.querySelector('.item-color-input');
        const updateColor = (hex) => {
            item.color = this.hexToAnsi(hex);
            labelInput.style.color = hex;
            this.updatePreview();
        };
        colorInput?.addEventListener('input', (e) => updateColor(e.target.value));
        colorInput?.addEventListener('change', (e) => updateColor(e.target.value));

        // 切换启用状态
        const toggleBtn = div.querySelector('.item-toggle-btn');
        toggleBtn?.addEventListener('click', () => {
            item.enabled = !item.enabled;
            // 只更新按钮状态，不重新渲染整个列表
            toggleBtn.classList.toggle('enabled', item.enabled);
            toggleBtn.classList.toggle('disabled', !item.enabled);
            toggleBtn.textContent = item.enabled ? '✓' : '○';
            toggleBtn.title = item.enabled ? '点击禁用' : '点击启用';
            this.updatePreview();
        });

        // 切换显示名称（名称为空时自动填入默认值）
        showLabelInput?.addEventListener('change', (e) => {
            if (e.target.checked && !item.label.trim()) {
                // 名称为空时，自动填入默认名称
                const defaultLabel = ITEM_TEMPLATES[item.type]?.label || 'Item';
                item.label = defaultLabel;
                if (labelInput) {
                    labelInput.value = defaultLabel;
                }
            }
            item.showLabel = e.target.checked;
            this.updatePreview();
        });

        return div;
    }

    /**
     * 生成分类 emoji 选择器 HTML
     */
    generateEmojiCategoriesHtml() {
        const categories = this.getEmojiCategories();
        let html = '<div class="emoji-categories">';

        for (const [categoryName, emojis] of Object.entries(categories)) {
            html += `
                <div class="emoji-category">
                    <div class="emoji-category-title">${categoryName}</div>
                    <div class="emoji-category-grid">
                        ${emojis.map(e => `<button type="button" class="emoji-option" data-emoji="${e}">${e}</button>`).join('')}
                    </div>
                </div>
            `;
        }

        html += '</div>';
        return html;
    }

    /**
     * 关闭所有下拉面板
     */
    closeAllDropdowns() {
        document.querySelectorAll('.emoji-dropdown.show').forEach(el => {
            el.classList.remove('show');
        });
    }

    /**
     * 渲染分隔线配置
     */
    renderSeparator() {
        // 确保 color 是数字类型
        const colorValue = typeof this.config.separator.color === 'number'
            ? this.config.separator.color
            : parseInt(this.config.separator.color) || 252;
        const hexColor = this.ansiToHex(colorValue);

        // 获取分隔符文本
        const sepText = this.config.separator.style === 'custom'
            ? this.config.separator.custom
            : (SEPARATOR_STYLES[this.config.separator.style] || '|');

        // 更新分隔符输入框（文本和颜色）
        const sepInput = document.getElementById('separator-input');
        if (sepInput) {
            sepInput.value = sepText;
            sepInput.style.color = hexColor;
        }

        // 更新颜色输入框
        const colorPicker = document.getElementById('separator-color-picker');
        const hexInput = document.getElementById('separator-color-hex');
        if (colorPicker) colorPicker.value = hexColor;
        if (hexInput) hexInput.value = hexColor;

        // 更新开头/结尾勾选框
        const startCheckbox = document.getElementById('separator-start');
        const endCheckbox = document.getElementById('separator-end');
        if (startCheckbox) startCheckbox.checked = this.config.separator.showStart || false;
        if (endCheckbox) endCheckbox.checked = this.config.separator.showEnd || false;
    }

    /**
     * 更新预览
     */
    updatePreview() {
        // 动态获取元素，确保 DOM 已加载
        const previewElement = document.getElementById('preview-statusline');
        if (!previewElement) return;

        const previewHtml = this.generatePreviewHtml();
        previewElement.innerHTML = previewHtml;
    }

    /**
     * 生成预览 HTML
     */
    generatePreviewHtml() {
        const enabledItems = this.config.items.filter(item => item.enabled);
        if (enabledItems.length === 0) {
            return `<span class="preview-empty">${i18n.t('statusline.preview.noItems')}</span>`;
        }

        const parts = [];
        const sepColor = this.ansiToHex(this.config.separator.color) || '#d0d0d0';
        // 优先使用自定义分隔符
        const separator = this.config.separator.style === 'custom'
            ? this.config.separator.custom
            : (SEPARATOR_STYLES[this.config.separator.style] || this.config.separator.custom || '|');

        // 开头分隔符
        if (this.config.separator.showStart) {
            parts.push(`<span class="preview-separator" style="color: ${sepColor}">${separator}</span>`);
        }

        enabledItems.forEach((item, index) => {
            const itemColor = this.ansiToHex(item.color) || '#5fd7ff';
            const displayText = this.getPreviewText(item);
            parts.push(`<span class="preview-item" style="color: ${itemColor}">${item.emoji} ${displayText}</span>`);

            if (index < enabledItems.length - 1) {
                parts.push(`<span class="preview-separator" style="color: ${sepColor}">${separator}</span>`);
            }
        });

        // 结尾分隔符
        if (this.config.separator.showEnd) {
            parts.push(`<span class="preview-separator" style="color: ${sepColor}">${separator}</span>`);
        }

        return parts.join('');
    }

    /**
     * 根据项目类型生成预览文本
     */
    getPreviewText(item) {
        // 获取实际的终端工作目录，如果没有则使用默认值
        const realDir = (typeof state !== 'undefined' && state.terminalDir)
            ? state.terminalDir
            : 'C:\\Users\\Default';

        // 模拟数据用于预览
        const mockData = {
            model: 'Opus 4.5',
            pct: 45.2,
            usedK: '90.4k',
            maxK: '200k',
            inTk: 85000,
            outTk: 12000,
            cacheR: 45000,
            cacheW: 8500,
            cost: 0.0523,
            currentDir: this.shortenPath(realDir)
        };

        // 根据类型生成值部分
        let value;
        switch (item.type) {
            case 'model':
                value = mockData.model;
                break;
            case 'context':
                value = `${mockData.pct}% (${mockData.usedK}/${mockData.maxK})`;
                break;
            case 'tokens':
                value = `${this.formatK(mockData.inTk + mockData.outTk)} (I:${this.formatK(mockData.inTk)} O:${this.formatK(mockData.outTk)})`;
                break;
            case 'cache':
                value = `R${this.formatK(mockData.cacheR)} W${this.formatK(mockData.cacheW)}`;
                break;
            case 'cost':
                value = `$${mockData.cost.toFixed(4)}`;
                break;
            case 'dir':
                value = mockData.currentDir;
                break;
            case 'time':
                const now = new Date();
                value = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
                break;
            default:
                value = '';
        }

        // 组合名称和值（根据 showLabel 设置）
        if (value) {
            return item.showLabel ? `${item.label}:${value}` : value;
        }
        return item.showLabel ? item.label : '';
    }

    /**
     * 缩短路径显示 (中间目录用首字母~缩写)
     */
    shortenPath(fullPath) {
        const pathParts = fullPath.split('\\');
        if (pathParts.length <= 3) {
            return fullPath;
        }
        const first = pathParts[0];
        const second = pathParts[1];
        const middle = pathParts.slice(2, -1).map(p => `${p[0]}~`);
        const last = pathParts[pathParts.length - 1];
        return [first, second, ...middle, last].join('\\');
    }

    /**
     * 格式化数字为 K 格式
     */
    formatK(n) {
        if (n >= 1000) {
            return (n / 1000).toFixed(1) + 'k';
        }
        return String(n);
    }

    /**
     * 开始拖拽（纯 JS 实现，使用 transform 优化性能）
     */
    startDrag(element, index, e) {
        this.draggedItem = index;
        this.draggedElement = element;
        this.closeAllDropdowns();

        // 记录初始位置
        const rect = element.getBoundingClientRect();
        this.dragStartX = rect.left;
        this.dragStartY = rect.top;
        this.dragOffsetX = e.clientX - rect.left;
        this.dragOffsetY = e.clientY - rect.top;
        this.lastMouseX = e.clientX;
        this.lastMouseY = e.clientY;

        // 创建拖拽占位符
        this.placeholder = document.createElement('div');
        this.placeholder.className = 'statusline-item-placeholder';
        this.placeholder.style.height = rect.height + 'px';

        // 添加拖拽状态类
        element.classList.add('dragging');

        // 设置元素为绝对定位
        element.style.position = 'fixed';
        element.style.width = rect.width + 'px';
        element.style.left = rect.left + 'px';
        element.style.top = rect.top + 'px';
        element.style.zIndex = '1000';
        element.style.pointerEvents = 'none';

        // 在原位置插入占位符
        element.parentNode.insertBefore(this.placeholder, element);

        // 绑定事件
        this.boundMouseMove = this.onDragMove.bind(this);
        this.boundMouseUp = this.onDragEnd.bind(this);
        document.addEventListener('mousemove', this.boundMouseMove);
        document.addEventListener('mouseup', this.boundMouseUp);
    }

    /**
     * 拖拽移动（即时响应）
     */
    onDragMove(e) {
        if (!this.draggedElement) return;

        this.lastMouseY = e.clientY;

        // 直接更新位置，不使用节流
        const y = e.clientY - this.dragOffsetY - this.dragStartY;
        this.draggedElement.style.transform = `translateY(${y}px)`;
        this.updatePlaceholderPosition();
    }

    /**
     * 更新占位符位置
     */
    updatePlaceholderPosition() {
        if (!this.draggedElement || !this.placeholder) return;

        const mouseY = this.lastMouseY;
        const items = this.itemsList.querySelectorAll('.statusline-item:not(.dragging)');

        let insertBefore = null;

        for (const item of items) {
            const rect = item.getBoundingClientRect();
            const midY = rect.top + rect.height / 2;

            if (mouseY < midY) {
                insertBefore = item;
                break;
            }
        }

        // 移动占位符
        if (insertBefore) {
            if (this.placeholder.nextSibling !== insertBefore) {
                this.itemsList.insertBefore(this.placeholder, insertBefore);
            }
        } else {
            // 放到最后
            const lastItem = items[items.length - 1];
            if (lastItem && this.placeholder.previousSibling !== lastItem) {
                this.itemsList.appendChild(this.placeholder);
            }
        }
    }

    /**
     * 结束拖拽
     */
    onDragEnd(e) {
        if (!this.draggedElement) return;

        try {
            // 取消未执行的动画帧
            if (this.rafId) {
                cancelAnimationFrame(this.rafId);
                this.rafId = null;
            }

            // 计算目标索引
            const allChildren = Array.from(this.itemsList.children);
            const placeholderIndex = allChildren.indexOf(this.placeholder);
            let targetIndex = 0;
            for (let i = 0; i < placeholderIndex; i++) {
                if (allChildren[i].classList.contains('statusline-item') && !allChildren[i].classList.contains('dragging')) {
                    targetIndex++;
                }
            }

            const fromIndex = this.draggedItem;

            // 恢复元素样式
            this.draggedElement.style.position = '';
            this.draggedElement.style.width = '';
            this.draggedElement.style.left = '';
            this.draggedElement.style.top = '';
            this.draggedElement.style.zIndex = '';
            this.draggedElement.style.transform = '';
            this.draggedElement.style.pointerEvents = '';
            this.draggedElement.classList.remove('dragging');

            // 移除占位符
            if (this.placeholder && this.placeholder.parentNode) {
                this.placeholder.parentNode.removeChild(this.placeholder);
            }

            // 执行移动
            if (fromIndex !== targetIndex) {
                this.moveItem(fromIndex, targetIndex);
            } else {
                this.renderItems();
            }
        } finally {
            // 确保事件监听器始终被移除（即使发生异常）
            if (this.boundMouseMove) {
                document.removeEventListener('mousemove', this.boundMouseMove);
            }
            if (this.boundMouseUp) {
                document.removeEventListener('mouseup', this.boundMouseUp);
            }

            // 清理状态
            this.draggedItem = null;
            this.draggedElement = null;
            this.placeholder = null;
            this.boundMouseMove = null;
            this.boundMouseUp = null;
        }
    }

    /**
     * 移动项目
     */
    moveItem(fromIndex, toIndex) {
        const item = this.config.items.splice(fromIndex, 1)[0];
        this.config.items.splice(toIndex, 0, item);
        this.renderItems();
        this.updatePreview();
    }

    /**
     * 获取分类 emoji 数据
     */
    getEmojiCategories() {
        return {
            '常用': ['🤖', '⏳', '🧮', '🎭', '💰', '📁', '📊', '🔧', '⚙️', '📝'],
            '状态': ['✅', '❌', '⚠️', '💡', '🔥', '⚡', '✨', '🎯', '📌', '🔔'],
            '数据': ['📈', '📉', '📊', '💹', '🔢', '🧮', '💾', '💿', '🗄️', '📦'],
            '时间': ['⏰', '⏱️', '⏳', '🕐', '📅', '📆', '🗓️', '⌛', '🔄', '🔁'],
            '文件': ['📁', '📂', '📄', '📃', '📑', '🗂️', '🗃️', '📋', '📎', '🔗'],
            '工具': ['🔧', '🔨', '⚙️', '🛠️', '🔩', '⛏️', '🔬', '🔭', '💻', '🖥️'],
            '符号': ['💎', '🌟', '⭐', '🔶', '🔷', '🔸', '🔹', '▶️', '◀️', '🔘'],
            '表情': ['😀', '🎉', '👍', '👎', '💪', '🙌', '👀', '🧠', '💭', '💬']
        };
    }

    /**
     * 生成 PS1 脚本
     */
    generatePS1() {
        const lines = [];

        // 只保存用户可修改的设置
        const userConfig = {
            // 分隔线：文本、颜色、开头、结尾
            sep: this.config.separator.custom || '|',
            sepColor: this.config.separator.color,
            sepStart: this.config.separator.showStart ? 1 : 0,
            sepEnd: this.config.separator.showEnd ? 1 : 0,
            // 项目：图标、名称、勾选状态、禁用状态、字体颜色
            items: this.config.items.map(item => ([
                item.type,
                item.emoji,
                item.label,
                item.showLabel ? 1 : 0,
                item.enabled ? 1 : 0,
                item.color
            ]))
        };
        lines.push(`# CONFIG:${JSON.stringify(userConfig)}`);
        lines.push('');

        // 头部 - 完全匹配参考格式
        lines.push('# ============================================================');
        lines.push('# Claude Code 自定义状态栏脚本 (Windows PowerShell)');
        lines.push('# ============================================================');
        lines.push('#');
        lines.push('# 功能: 在 Claude Code CLI 底部显示美化的状态信息');
        lines.push('#');
        lines.push('# 安装方法:');
        lines.push('#   将此文件保存到: ~/.claude/statusline.ps1');
        lines.push('#   在 ~/.claude/settings.json 中添加:');
        lines.push('#      { "statusLine": "powershell -File ~/.claude/statusline.ps1" }');
        lines.push('#   重启 Claude Code 即可生效');
        lines.push('#');
        lines.push('# ============================================================');
        lines.push('');
        lines.push('[Console]::OutputEncoding = [System.Text.Encoding]::UTF8');
        lines.push('$esc = [char]27');
        lines.push('$reset = "$esc[0m"');
        lines.push('');

        // 数据读取
        lines.push('# 读取 Claude Code 传入的 JSON 数据');
        lines.push('$data = [Console]::In.ReadToEnd() | ConvertFrom-Json');
        lines.push('');

        // 目录处理 - 完全匹配参考格式
        lines.push('# 目录显示: D:\\first\\A~\\B~\\last (中间目录用首字母~缩写)');
        lines.push('$fullPath = if ($data.cwd) { $data.cwd } else { (Get-Location).Path }');
        lines.push('$pathParts = $fullPath -split \'\\\\\'');
        lines.push('$currentDir = if ($pathParts.Length -le 3) { $fullPath } else {');
        lines.push('    $first = $pathParts[0]');
        lines.push('    $second = $pathParts[1]');
        lines.push('    $middle = $pathParts[2..($pathParts.Length-2)] | ForEach-Object { "$($_[0])~" }');
        lines.push('    $last = $pathParts[-1]');
        lines.push('    (@($first, $second) + $middle + $last) -join \'\\\'');
        lines.push('}');
        lines.push('');

        // 数据提取
        lines.push('# 提取数值');
        lines.push('$pct = [math]::Round($data.context_window.used_percentage, 1)');
        lines.push('$inTk = $data.context_window.total_input_tokens');
        lines.push('$outTk = $data.context_window.total_output_tokens');
        lines.push('$maxTk = if ($data.context_window.max_tokens) { $data.context_window.max_tokens } else { 200000 }');
        lines.push('$cacheR = if ($data.context_window.current_usage.cache_read_input_tokens) { $data.context_window.current_usage.cache_read_input_tokens } else { 0 }');
        lines.push('$cacheW = if ($data.context_window.current_usage.cache_creation_input_tokens) { $data.context_window.current_usage.cache_creation_input_tokens } else { 0 }');
        lines.push('$cost = if ($data.cost.total_cost_usd) { [math]::Round($data.cost.total_cost_usd, 4) } else { 0 }');
        lines.push('');

        lines.push('# 格式化数字 (1000+ 显示为 k)');
        lines.push('function K($n) { if ($n -ge 1000) { "$([math]::Round($n/1000.0,1))k" } else { "$n" } }');
        lines.push('$usedK = K ([math]::Round($maxTk * $pct / 100))');
        lines.push('');

        lines.push('# 当前时间 (HH:mm 格式)');
        lines.push('$currentTime = (Get-Date).ToString("HH:mm")');
        lines.push('');

        // 颜色定义
        lines.push('# 颜色定义 (256色)');
        lines.push(this.generateColorCode());
        lines.push('');

        // 图标定义
        lines.push('# 图标 (Unicode Emoji)');
        lines.push(this.generateIconCode());
        lines.push('');

        // 分隔符和输出
        lines.push('');
        lines.push(this.generateSeparatorAndOutput());
        lines.push('');
        lines.push('Write-Output $output');
        lines.push('');

        return lines.join('\r\n');
    }

    /**
     * 生成颜色代码
     */
    generateColorCode() {
        const lines = [];
        const usedColors = new Set();
        usedColors.add(this.config.separator.color);

        this.config.items.forEach(item => {
            if (item.enabled) {
                usedColors.add(item.color);
            }
        });

        // 完全匹配参考格式的颜色名称和注释对齐
        const colorNames = {
            81: { var: '$cModel', comment: '# 青色 - 模型', align: '   ' },
            153: { var: '$cNum', comment: '# 淡蓝 - 数字', align: '  ' },
            222: { var: '$cCost', comment: '# 金色 - 费用', align: '  ' },
            183: { var: '$cCache', comment: '# 淡紫 - 缓存', align: ' ' },
            147: { var: '$cDir', comment: '# 紫色 - 目录', align: '   ' },
            117: { var: '$cTime', comment: '# 青绿 - 时间', align: '  ' },
            114: { var: '$cGreen', comment: '# 绿色', align: '' },
            210: { var: '$cRed', comment: '# 红色', align: '' },
            221: { var: '$cYellow', comment: '# 黄色', align: '' },
            252: { var: '$cSep', comment: '# 灰白 - 分隔符', align: ' ' }
        };

        const definedVars = {};
        usedColors.forEach(color => {
            const info = colorNames[color] || { var: `$c${color}`, comment: '', align: '   ' };
            definedVars[color] = info.var;
            // 格式: $cModel = "$esc[38;5;81m"   # 青色 - 模型
            lines.push(`${info.var} = "$esc[38;5;${color}m"${info.align} ${info.comment}`);
        });

        // 添加动态颜色（如果需要） - 完全匹配参考格式
        const hasDynamicContext = this.config.items.some(item =>
            item.enabled && item.dynamicColor && item.colorRanges
        );
        if (hasDynamicContext) {
            lines.push('# 上下文颜色: 绿(<50%) / 黄(50-80%) / 红(>80%)');
            lines.push('$cPct = if ($pct -gt 80) { "$esc[38;5;210m" } elseif ($pct -gt 50) { "$esc[38;5;221m" } else { "$esc[38;5;114m" }');
        }

        this.colorVarMap = definedVars;
        return lines.join('\r\n');
    }

    /**
     * 生成图标代码
     */
    generateIconCode() {
        const lines = [];
        const usedEmojis = new Set();

        // 收集所有启用的项目的 emoji
        this.config.items.forEach(item => {
            if (item.enabled) {
                usedEmojis.add({ emoji: item.emoji, id: item.id });
            }
        });

        // 完全匹配参考格式的图标变量名和注释对齐
        const emojiInfo = {
            '🤖': { var: '$iModel', code: '0x1F916', comment: '# 🤖', align: '   ' },
            '⏳': { var: '$iCtx', code: '0x23F3', comment: '# ⏳', align: '   ' },
            '🧮': { var: '$iTotal', code: '0x1F9EE', comment: '# 🧮', align: '  ' },
            '🎭': { var: '$iCache', code: '0x1F3AD', comment: '# 🎭', align: '  ' },
            '💰': { var: '$iCost', code: '0x1F4B0', comment: '# 💰', align: '   ' },
            '📁': { var: '$iDir', code: '0x1F4C1', comment: '# 📁', align: '   ' },
            '🕐': { var: '$iTime', code: '0x1F550', comment: '# 🕐', align: '   ' }
        };

        this.iconVarMap = {};
        usedEmojis.forEach(({ emoji, id }) => {
            const info = emojiInfo[emoji] || {
                var: `$i${id}`,
                code: '0x' + emoji.codePointAt(0).toString(16).toUpperCase(),
                comment: '',
                align: '   '
            };
            this.iconVarMap[emoji] = info.var;
            // 格式: $iModel = [char]::ConvertFromUtf32(0x1F916)  # 🤖
            lines.push(`${info.var} = [char]::ConvertFromUtf32(${info.code})${info.align} ${info.comment}`);
        });

        return lines.join('\r\n');
    }

    /**
     * 生成分隔符和输出代码
     */
    generateSeparatorAndOutput() {
        const lines = [];

        // 组装输出注释 - 完全匹配参考格式
        lines.push('# 组装输出');

        // 分隔符定义 - 完全匹配参考格式
        const sepChar = SEPARATOR_STYLES[this.config.separator.style] || this.config.separator.custom;
        const sepColorVar = this.colorVarMap[this.config.separator.color] || '$cSep';
        lines.push(`$sep = "${sepColorVar}${sepChar}$reset"`);

        // 组装输出部分
        lines.push('');
        lines.push('$output = @(');

        const enabledItems = this.config.items.filter(item => item.enabled);

        if (enabledItems.length === 0) {
            lines.push('    ""');
        } else {
            enabledItems.forEach((item, index) => {
                let colorVar;
                let iconVar;

                if (item.dynamicColor && item.colorRanges) {
                    colorVar = '$cPct';
                } else {
                    colorVar = this.colorVarMap[item.color] || '$cModel';
                }

                iconVar = this.iconVarMap[item.emoji] || '"?"';

                // 根据 showLabel 决定是否包含项目名称
                const content = item.showLabel
                    ? `${item.label}:${item.template}`
                    : item.template;
                lines.push(`    "${colorVar}${iconVar} ${content}$reset"`);
            });
        }

        lines.push(') -join " $sep "');

        // 处理开头和结尾分隔符
        if (this.config.separator.showStart && this.config.separator.showEnd) {
            lines.push('$output = "$sep $output $sep"');
        } else if (this.config.separator.showStart) {
            lines.push('$output = "$sep $output"');
        } else if (this.config.separator.showEnd) {
            lines.push('$output = "$output $sep"');
        }

        return lines.join('\r\n');
    }

    /**
     * ANSI 256 色转十六进制
     */
    ansiToHex(ansiColor) {
        // 处理 undefined 或非数字
        if (ansiColor === undefined || ansiColor === null || isNaN(ansiColor)) {
            return '#d0d0d0';
        }
        ansiColor = Number(ansiColor);

        // 0-15: 标准色和高亮色
        const standardColors = [
            '#000000', '#800000', '#008000', '#808000', '#000080', '#800080', '#008080', '#c0c0c0',
            '#808080', '#ff0000', '#00ff00', '#ffff00', '#0000ff', '#ff00ff', '#00ffff', '#ffffff'
        ];
        if (ansiColor < 16) {
            return standardColors[ansiColor] || '#d0d0d0';
        }

        // 16-231: 6x6x6 颜色立方体
        if (ansiColor >= 16 && ansiColor <= 231) {
            const n = ansiColor - 16;
            const levels = [0, 95, 135, 175, 215, 255];
            const r = levels[Math.floor(n / 36) % 6];
            const g = levels[Math.floor(n / 6) % 6];
            const b = levels[n % 6];
            return '#' + [r, g, b].map(x => x.toString(16).padStart(2, '0')).join('');
        }

        // 232-255: 灰度
        if (ansiColor >= 232 && ansiColor <= 255) {
            const gray = 8 + (ansiColor - 232) * 10;
            const hex = gray.toString(16).padStart(2, '0');
            return '#' + hex + hex + hex;
        }

        return '#d0d0d0';
    }

    /**
     * 十六进制转 ANSI 256 色
     * 通过计算颜色距离找到最接近的 ANSI 颜色
     */
    hexToAnsi(hex) {
        // 解析十六进制颜色
        const normalizedHex = hex.toLowerCase();
        const r = parseInt(normalizedHex.slice(1, 3), 16);
        const g = parseInt(normalizedHex.slice(3, 5), 16);
        const b = parseInt(normalizedHex.slice(5, 7), 16);

        // ANSI 256 色中的颜色立方体 (16-231)
        // 每个通道有 6 个级别: 0, 95, 135, 175, 215, 255
        const levels = [0, 95, 135, 175, 215, 255];

        // 找到最接近的颜色立方体索引
        const findClosest = (value) => {
            let minDist = Infinity;
            let idx = 0;
            for (let i = 0; i < levels.length; i++) {
                const dist = Math.abs(value - levels[i]);
                if (dist < minDist) {
                    minDist = dist;
                    idx = i;
                }
            }
            return idx;
        };

        const ri = findClosest(r);
        const gi = findClosest(g);
        const bi = findClosest(b);

        // 计算 ANSI 颜色码 (16-231 的颜色立方体)
        const cubeColor = 16 + 36 * ri + 6 * gi + bi;

        // 也检查灰度色 (232-255)
        // 灰度色从 8 到 238，步长 10
        const gray = (r + g + b) / 3;
        let grayColor = 232 + Math.round((gray - 8) / 10);
        grayColor = Math.max(232, Math.min(255, grayColor));

        // 计算两种方案的颜色距离，选择更接近的
        const cubeR = levels[ri];
        const cubeG = levels[gi];
        const cubeB = levels[bi];
        const cubeDist = Math.sqrt(
            Math.pow(r - cubeR, 2) +
            Math.pow(g - cubeG, 2) +
            Math.pow(b - cubeB, 2)
        );

        const grayLevel = 8 + (grayColor - 232) * 10;
        const grayDist = Math.sqrt(
            Math.pow(r - grayLevel, 2) +
            Math.pow(g - grayLevel, 2) +
            Math.pow(b - grayLevel, 2)
        );

        return grayDist < cubeDist ? grayColor : cubeColor;
    }

    /**
     * 更新当前编辑状态显示
     */
    updateCurrentFileNameDisplay() {
        if (this.currentFileName) {
            if (this.isNewFile || !this.currentFile) {
                this.currentFileName.textContent = i18n.t('statusline.files.newFile');
            } else {
                this.currentFileName.textContent = this.currentFile.name;
            }
        }
    }

    /**
     * 更新页面语言
     */
    updateLanguage() {
        const itemsTitle = document.querySelector('.items-section h4');
        if (itemsTitle) {
            itemsTitle.textContent = i18n.t('statusline.items.title');
        }

        const separatorTitle = document.querySelector('.separator-section h4');
        if (separatorTitle) {
            separatorTitle.textContent = i18n.t('statusline.separator.title');
        }

        const previewTitle = document.querySelector('.preview-section h4');
        if (previewTitle) {
            previewTitle.textContent = i18n.t('statusline.preview.title');
        }

        const createNewBtn = document.getElementById('create-new-btn');
        const createNewBtnText = createNewBtn?.querySelector('span:last-child');
        if (createNewBtnText) {
            createNewBtnText.textContent = i18n.t('statusline.files.create');
        }

        const saveBtn = document.getElementById('save-current-btn');
        const saveBtnText = saveBtn?.querySelector('span:last-child');
        if (saveBtnText) {
            saveBtnText.textContent = i18n.t('statusline.actions.save');
        }

        const filesTitle = document.querySelector('.files-header h3');
        if (filesTitle) {
            filesTitle.textContent = i18n.t('statusline.files.title');
        }

        const refreshBtn = document.getElementById('refresh-files-btn');
        const refreshBtnText = refreshBtn?.querySelector('span:last-child');
        if (refreshBtnText) {
            refreshBtnText.textContent = i18n.t('statusline.files.refresh');
        }

        const terminalTitle = document.querySelector('.terminal-title');
        if (terminalTitle) {
            terminalTitle.textContent = i18n.t('statusline.preview.terminalTitle');
        }

        // 更新当前编辑状态显示
        this.updateCurrentFileNameDisplay();

        const labels = document.querySelectorAll('.separator-config .form-label');
        if (labels.length >= 3) {
            labels[0].textContent = i18n.t('statusline.separator.style');
            labels[1].textContent = i18n.t('statusline.separator.custom');
            labels[2].textContent = i18n.t('statusline.separator.color');
        }
    }
}

// 创建全局实例
const statusline = new StatuslineManager();
