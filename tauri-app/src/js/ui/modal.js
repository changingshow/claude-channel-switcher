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
        this.channelBalanceUrlInput = null;
        this.channelBalanceMethodSelect = null;
        this.channelBalanceFieldInput = null;
        this.customSelect = null;
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
        this.channelBalanceUrlInput = document.getElementById('channel-balance-url-input');
        this.channelBalanceMethodSelect = document.getElementById('channel-balance-method');
        this.channelBalanceFieldInput = document.getElementById('channel-balance-field-input');
        this.balanceFieldLabel = document.getElementById('balance-field-label');

        // 初始化自定义下拉框
        this.initCustomSelect();

        // 监听余额查询地址变化，动态更新字段标签
        this.channelBalanceUrlInput?.addEventListener('input', () => {
            this.updateBalanceFieldLabel();
        });
    }

    /**
     * 初始化自定义下拉选择框
     */
    initCustomSelect() {
        this.customSelect = document.getElementById('channel-balance-method-select');
        if (!this.customSelect) return;

        const trigger = this.customSelect.querySelector('.custom-select-trigger');
        const options = this.customSelect.querySelectorAll('.custom-select-option');
        const hiddenInput = this.customSelect.querySelector('input[type="hidden"]');
        const valueDisplay = this.customSelect.querySelector('.custom-select-value');

        // 点击触发器切换下拉框
        trigger?.addEventListener('click', (e) => {
            e.stopPropagation();
            this.customSelect.classList.toggle('open');
        });

        // 点击选项
        options.forEach(option => {
            option.addEventListener('click', (e) => {
                e.stopPropagation();
                const value = option.dataset.value;

                // 更新选中状态
                options.forEach(opt => opt.classList.remove('selected'));
                option.classList.add('selected');

                // 更新显示值和隐藏输入框
                if (valueDisplay) valueDisplay.textContent = value;
                if (hiddenInput) hiddenInput.value = value;

                // 关闭下拉框
                this.customSelect.classList.remove('open');
            });
        });

        // 点击外部关闭下拉框
        document.addEventListener('click', () => {
            this.customSelect?.classList.remove('open');
        });
    }

    /**
     * 设置自定义下拉框的值
     */
    setCustomSelectValue(value) {
        if (!this.customSelect) return;

        const options = this.customSelect.querySelectorAll('.custom-select-option');
        const hiddenInput = this.customSelect.querySelector('input[type="hidden"]');
        const valueDisplay = this.customSelect.querySelector('.custom-select-value');

        options.forEach(option => {
            if (option.dataset.value === value) {
                option.classList.add('selected');
            } else {
                option.classList.remove('selected');
            }
        });

        if (valueDisplay) valueDisplay.textContent = value;
        if (hiddenInput) hiddenInput.value = value;
    }

    /**
     * 获取自定义下拉框的值
     */
    getCustomSelectValue() {
        if (!this.customSelect) return 'POST';
        const hiddenInput = this.customSelect.querySelector('input[type="hidden"]');
        return hiddenInput?.value || 'POST';
    }

    /**
     * 更新余额字段标签（可选/必填）
     */
    updateBalanceFieldLabel() {
        if (!this.balanceFieldLabel) return;
        const hasUrl = this.channelBalanceUrlInput.value.trim() !== '';
        const key = hasUrl ? 'modal.fields.balanceFieldRequired' : 'modal.fields.balanceField';
        this.balanceFieldLabel.textContent = i18n.t(key);
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
        this.channelBalanceUrlInput.value = '';
        this.setCustomSelectValue('POST');
        this.channelBalanceFieldInput.value = '';
        this.updateBalanceFieldLabel();
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
        this.channelBalanceUrlInput.value = config.balanceApi?.url || '';
        this.setCustomSelectValue(config.balanceApi?.method || 'POST');
        this.channelBalanceFieldInput.value = config.balanceApi?.field || '';
        this.updateBalanceFieldLabel();
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
     * @returns {{name: string, token: string, url: string, model: string, balanceUrl: string, balanceMethod: string, balanceField: string}} 表单数据
     */
    getFormData() {
        return {
            name: this.channelNameInput.value.trim(),
            token: this.channelTokenInput.value.trim(),
            url: this.channelUrlInput.value.trim(),
            model: this.channelModelInput.value.trim(),
            balanceUrl: this.channelBalanceUrlInput.value.trim(),
            balanceMethod: this.getCustomSelectValue(),
            balanceField: this.channelBalanceFieldInput.value.trim()
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

