/**
 * Tauri API 封装类
 * 提供统一的 API 调用接口和错误处理
 */
class TauriAPI {
    constructor() {
        this.invoke = null;
        this.openDialog = null;
        this.initialized = false;
    }

    /**
     * 初始化 Tauri API
     * @returns {boolean} 是否初始化成功
     */
    init() {
        if (window.__TAURI__?.core) {
            this.invoke = window.__TAURI__.core.invoke;
            this.openDialog = async (options) => {
                return await this.invoke('plugin:dialog|open', { options });
            };
            this.initialized = true;
            return true;
        }
        console.error('Tauri API 未初始化，请确保应用在 Tauri 环境中运行');
        return false;
    }

    /**
     * 安全的 invoke 调用，包含错误处理
     * @param {string} command - 命令名称
     * @param {object} params - 参数对象
     * @returns {Promise<any>} 调用结果
     */
    async safeInvoke(command, params = {}) {
        if (!this.initialized) {
            throw new Error('Tauri API 未初始化');
        }
        try {
            const result = await this.invoke(command, params);
            if (result && !result.success && result.error) {
                throw new Error(result.error);
            }
            return result;
        } catch (error) {
            ErrorHandler.handle(error, command);
            throw error;
        }
    }

    /**
     * 获取所有渠道配置
     * @param {string} configPath - 配置文件路径
     * @returns {Promise<ApiResponse>} 渠道列表响应
     */
    async getChannels(configPath) {
        return await this.safeInvoke('get_channels', { configPath });
    }

    /**
     * 获取当前激活的渠道
     * @param {string} configPath - 配置文件路径
     * @returns {Promise<ApiResponse>} 激活渠道响应
     */
    async getActiveChannel(configPath) {
        return await this.safeInvoke('get_active_channel', { configPath });
    }

    /**
     * 保存渠道配置
     * @param {object} params - 渠道参数 {configPath, channelName, token, url, oldName}
     * @returns {Promise<ApiResponse>} 保存结果
     */
    async saveChannel(params) {
        return await this.safeInvoke('save_channel', params);
    }

    /**
     * 删除渠道
     * @param {string} configPath - 配置文件路径
     * @param {string} channelName - 渠道名称
     * @returns {Promise<ApiResponse>} 删除结果
     */
    async deleteChannel(configPath, channelName) {
        return await this.safeInvoke('delete_channel', { configPath, channelName });
    }

    /**
     * 切换渠道
     * @param {string} configPath - 配置文件路径
     * @param {string} channelName - 渠道名称
     * @returns {Promise<ApiResponse>} 切换结果
     */
    async switchChannel(configPath, channelName) {
        return await this.safeInvoke('switch_channel', { configPath, channelName });
    }

    /**
     * 启动 Claude
     * @param {string} terminal - 终端类型
     * @param {string} terminalDir - 终端工作目录
     * @returns {Promise<ApiResponse>} 启动结果
     */
    async launchClaude(terminal, terminalDir) {
        return await this.safeInvoke('launch_claude', { terminal, terminalDir });
    }

    /**
     * 检查终端是否可用
     * @param {string} terminal - 终端类型
     * @returns {Promise<ApiResponse>} 检查结果
     */
    async checkTerminalAvailable(terminal) {
        return await this.safeInvoke('check_terminal_available', { terminal });
    }

    /**
     * 获取用户主目录
     * @returns {Promise<string>} 主目录路径
     */
    async getHomeDir() {
        return await this.safeInvoke('get_home_dir');
    }

    /**
     * 最小化窗口
     * @returns {Promise<void>}
     */
    async windowMinimize() {
        return await this.safeInvoke('window_minimize');
    }

    /**
     * 最大化窗口
     * @returns {Promise<void>}
     */
    async windowMaximize() {
        return await this.safeInvoke('window_maximize');
    }

    /**
     * 还原窗口
     * @returns {Promise<void>}
     */
    async windowUnmaximize() {
        return await this.safeInvoke('window_unmaximize');
    }

    /**
     * 关闭窗口
     * @returns {Promise<void>}
     */
    async windowClose() {
        return await this.safeInvoke('window_close');
    }

    /**
     * 检查窗口是否最大化
     * @returns {Promise<boolean>} 是否最大化
     */
    async windowIsMaximized() {
        return await this.safeInvoke('window_is_maximized');
    }

    // ==================== Droid 渠道管理 API ====================

    /**
     * 获取所有 Droid 渠道
     * @param {string} configPath - 配置文件路径
     * @returns {Promise<ApiResponse>} Droid 渠道列表
     */
    async getDroidChannels(configPath) {
        return await this.safeInvoke('get_droid_channels', { configPath });
    }

    /**
     * 获取当前 FACTORY_API_KEY 环境变量
     * @returns {Promise<ApiResponse>} 当前环境变量值
     */
    async getCurrentFactoryApiKey() {
        return await this.safeInvoke('get_current_factory_api_key');
    }

    /**
     * 切换 Droid 渠道（设置环境变量）
     * @param {string} apiKey - API Key
     * @returns {Promise<ApiResponse>} 切换结果
     */
    async switchDroidChannel(apiKey) {
        return await this.safeInvoke('switch_droid_channel', { apiKey });
    }

    /**
     * 保存 Droid 渠道
     * @param {object} params - {configPath, name, apiKey, oldName}
     * @returns {Promise<ApiResponse>} 保存结果
     */
    async saveDroidChannel(params) {
        return await this.safeInvoke('save_droid_channel', params);
    }

    /**
     * 删除 Droid 渠道
     * @param {string} configPath - 配置文件路径
     * @param {string} name - 渠道名称
     * @returns {Promise<ApiResponse>} 删除结果
     */
    async deleteDroidChannel(configPath, name) {
        return await this.safeInvoke('delete_droid_channel', { configPath, name });
    }

    /**
     * 启动 Droid
     * @param {string} terminal - 终端类型
     * @param {string} terminalDir - 终端工作目录
     * @returns {Promise<ApiResponse>} 启动结果
     */
    async launchDroid(terminal, terminalDir) {
        return await this.safeInvoke('launch_droid', { terminal, terminalDir });
    }
}

// 创建全局实例
const api = new TauriAPI();

