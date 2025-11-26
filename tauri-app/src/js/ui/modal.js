/**
 * 模态框管理
 */
class ModalManager {
    constructor() {
        this.modal = null;
        this.modalTitle = null;
        this.channelNameInput = null;
        this.channelTokenInput = null;
        this.channelUrlInput = null;
        this.init();
    }

    /**
     * 初始化模态框元素
     */
    init() {
        this.modal = document.getElementById('channel-modal');
        this.modalTitle = document.getElementById('modal-title');
        this.channelNameInput = document.getElementById('channel-name-input');
        this.channelTokenInput = document.getElementById('channel-token-input');
        this.channelUrlInput = document.getElementById('channel-url-input');
        this.channelModelInput = document.getElementById('channel-model-input');
    }

    /**
     * 打开新建渠道模态框
     */
    openNew() {
        if (!this.modal) return;

        state.editingChannel = null;
        this.modalTitle.textContent = i18n.t('modal.titleNew');
        this.channelNameInput.value = '';
        this.channelTokenInput.value = '';
        this.channelUrlInput.value = '';
        this.channelModelInput.value = '';
        this.modal.classList.add('active');
    }

    /**
     * 打开编辑渠道模态框
     * @param {string} name - 渠道名称
     */
    openEdit(name) {
        if (!this.modal) return;

        const config = state.channels[name];
        if (!config) return;

        state.editingChannel = name;
        this.modalTitle.textContent = i18n.t('modal.titleEdit');
        this.channelNameInput.value = name;
        this.channelTokenInput.value = config.env?.ANTHROPIC_AUTH_TOKEN || '';
        this.channelUrlInput.value = config.env?.ANTHROPIC_BASE_URL || '';
        this.channelModelInput.value = config.model || '';
        this.modal.classList.add('active');
    }

    /**
     * 关闭模态框
     */
    close() {
        if (this.modal) {
            this.modal.classList.remove('active');
        }
    }

    /**
     * 获取表单数据
     * @returns {{name: string, token: string, url: string}} 表单数据
     */
    getFormData() {
        return {
            name: this.channelNameInput.value.trim(),
            token: this.channelTokenInput.value.trim(),
            url: this.channelUrlInput.value.trim(),
            model: this.channelModelInput.value.trim()
        };
    }

    /**
     * 更新模态框语言
     */
    updateLanguage() {
        if (!this.channelNameInput) return;
        
        this.channelNameInput.placeholder = i18n.t('modal.fields.namePlaceholder');
        this.channelTokenInput.placeholder = i18n.t('modal.fields.tokenPlaceholder');
        this.channelUrlInput.placeholder = i18n.t('modal.fields.urlPlaceholder');

        const labels = document.querySelectorAll('.modal-body .form-label');
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
}

// 创建全局实例
const modal = new ModalManager();

