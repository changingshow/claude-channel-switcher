/**
 * 确认对话框管理
 */
class ConfirmDialog {
    constructor() {
        this.dialog = null;
        this.titleEl = null;
        this.messageEl = null;
        this.cancelBtn = null;
        this.confirmBtn = null;
        this.resolvePromise = null;
    }

    init() {
        this.dialog = document.getElementById('confirm-dialog');
        this.titleEl = document.getElementById('confirm-dialog-title');
        this.messageEl = document.getElementById('confirm-dialog-message');
        this.cancelBtn = document.getElementById('confirm-dialog-cancel');
        this.confirmBtn = document.getElementById('confirm-dialog-confirm');

        this.cancelBtn.addEventListener('click', () => this.close(false));
        this.confirmBtn.addEventListener('click', () => this.close(true));

        this.dialog.addEventListener('click', (e) => {
            if (e.target === this.dialog) {
                this.close(false);
            }
        });

        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.dialog.classList.contains('active')) {
                this.close(false);
            }
        });
    }

    /**
     * 显示确认对话框
     * @param {Object} options - 配置选项
     * @param {string} options.title - 标题
     * @param {string} options.message - 消息内容
     * @param {string} options.confirmText - 确认按钮文字
     * @param {string} options.cancelText - 取消按钮文字
     * @returns {Promise<boolean>} 用户选择结果
     */
    show(options = {}) {
        const {
            title = i18n.t('confirm.deleteTitle'),
            message = i18n.t('confirm.deleteMessage'),
            confirmText = i18n.t('confirm.delete'),
            cancelText = i18n.t('confirm.cancel')
        } = options;

        this.titleEl.textContent = title;
        this.messageEl.textContent = message;
        this.confirmBtn.textContent = confirmText;
        this.cancelBtn.textContent = cancelText;

        this.dialog.classList.add('active');
        this.confirmBtn.focus();

        return new Promise((resolve) => {
            this.resolvePromise = resolve;
        });
    }

    close(result) {
        this.dialog.classList.remove('active');
        if (this.resolvePromise) {
            this.resolvePromise(result);
            this.resolvePromise = null;
        }
    }

    updateLanguage() {
        this.cancelBtn.textContent = i18n.t('confirm.cancel');
        this.confirmBtn.textContent = i18n.t('confirm.delete');
    }
}

const confirmDialog = new ConfirmDialog();
