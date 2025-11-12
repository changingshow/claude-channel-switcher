/**
 * 标题栏管理
 */
class TitlebarManager {
    /**
     * 初始化标题栏控制
     */
    init() {
        if (!api.initialized) {
            console.warn('Tauri API not available');
            return;
        }

        this.setupMinimizeButton();
        this.setupMaximizeButton();
        this.setupCloseButton();
    }

    /**
     * 设置最小化按钮
     */
    setupMinimizeButton() {
        const minimizeBtn = document.getElementById('titlebar-minimize');
        if (minimizeBtn) {
            minimizeBtn.addEventListener('click', async () => {
                try {
                    await api.windowMinimize();
                } catch (error) {
                    ErrorHandler.handle(error, 'window_minimize');
                }
            });
        }
    }

    /**
     * 设置最大化/还原按钮
     */
    setupMaximizeButton() {
        const maximizeBtn = document.getElementById('titlebar-maximize');
        if (maximizeBtn) {
            // 检查初始最大化状态
            api.windowIsMaximized().then(isMaximized => {
                // 最大化状态通过 CSS 类来控制，如果需要可以添加
            }).catch(() => {});

            maximizeBtn.addEventListener('click', async () => {
                try {
                    const isMaximized = await api.windowIsMaximized();
                    if (isMaximized) {
                        await api.windowUnmaximize();
                    } else {
                        await api.windowMaximize();
                    }
                } catch (error) {
                    ErrorHandler.handle(error, 'window_maximize');
                }
            });
        }
    }

    /**
     * 设置关闭按钮
     */
    setupCloseButton() {
        const closeBtn = document.getElementById('titlebar-close');
        if (closeBtn) {
            closeBtn.addEventListener('click', async () => {
                try {
                    await api.windowClose();
                } catch (error) {
                    ErrorHandler.handle(error, 'window_close');
                }
            });
        }
    }
}

// 创建全局实例
const titlebar = new TitlebarManager();

