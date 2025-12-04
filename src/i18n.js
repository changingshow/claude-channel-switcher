const translations = {
    'zh-CN': {
        app: {
            title: 'Claude 渠道切换器',
            version: 'v3.0.0'
        },
        nav: {
            channels: '渠道管理',
            droid: 'Droid 渠道',
            settings: '设置'
        },
        channels: {
            title: '渠道管理',
            count: '个渠道',
            refresh: '刷新',
            add: '新建渠道',
            empty: {
                icon: '📭',
                text: '暂无渠道配置',
                hint: '点击右上角「➕ 新建渠道」开始添加'
            },
            status: {
                active: '当前激活',
                inactive: '待激活'
            },
            actions: {
                launch: '启动',
                switch: '切换',
                edit: '编辑',
                delete: '删除'
            }
        },
        modal: {
            titleNew: '新建渠道',
            titleEdit: '编辑渠道',
            close: '关闭对话框',
            fields: {
                name: '渠道名称',
                namePlaceholder: '例如：官方、代理1、备用渠道',
                token: 'API Token',
                tokenPlaceholder: 'sk-ant-xxxxx...',
                url: 'Base URL',
                urlPlaceholder: 'https://api.anthropic.com'
            },
            buttons: {
                cancel: '取消',
                save: '保存'
            }
        },
        settings: {
            title: '设置',
            language: {
                title: '语言设置',
                description: '选择应用的显示语言',
                zhCN: '简体中文',
                enUS: 'English'
            },
            theme: {
                title: '主题设置',
                description: '选择应用的外观主题',
                dark: '深色主题',
                light: '浅色主题'
            },
            path: {
                title: '配置文件路径',
                description: '设置 Claude 配置文件的存储位置',
                browse: '浏览',
                label: '配置文件路径'
            },
            terminal: {
                title: '终端设置',
                description: '选择启动 Claude 时使用的终端',
                placeholder: '例如：powershell, pwsh, cmd',
                save: '保存',
                label: '终端命令',
                presets: {
                    wt: 'Windows Terminal',
                    powershell: 'PowerShell',
                    pwsh: 'PowerShell Core',
                    cmd: 'CMD'
                }
            },
            terminalDir: {
                title: '终端工作目录',
                description: '设置终端启动时的默认目录',
                browse: '浏览',
                label: '工作目录路径'
            },
            about: {
                title: '关于',
                text: 'Claude 渠道切换器 v3.0.0\n\n基于 Electron 开发\n采用现代 Web 技术\n流畅的动画和交互体验',
                githubLink: '🔗 GitHub 主页'
            }
        },
        messages: {
            channelCreated: '渠道已创建',
            channelUpdated: '渠道已更新',
            channelDeleted: '渠道 {name} 已删除',
            channelSwitched: '已切换到渠道：{name}',
            channelLaunched: '已在新窗口中启动 Claude\n当前渠道：{name}\n终端：{terminal}',
            channelsRefreshed: '渠道列表已刷新',
            pathUpdated: '配置路径已更新',
            terminalSaved: '终端设置已保存',
            terminalSet: '终端已设置为：{terminal}',
            terminalDirUpdated: '终端工作目录已更新',
            themeChanged: '已切换到{theme}主题',
            languageChanged: '语言已切换为{language}',
            errorSave: '保存失败: {error}',
            errorSwitch: '切换失败: {error}',
            errorDelete: '删除失败: {error}',
            errorLaunch: '启动失败: {error}',
            errorNameRequired: '请输入渠道名称',
            errorTokenRequired: '请输入 API Token',
            errorTerminalRequired: '请输入终端命令',
            errorUrlRequired: 'Base URL 不能为空',
            errorUrlInvalid: 'Base URL 必须是 http 或 https 标准链接',
            errorNameDuplicate: '渠道名称已存在，请使用其他名称',
            confirmDelete: '确定要删除渠道「{name}」吗？'
        },
        aria: {
            refreshChannels: '刷新渠道列表',
            addChannel: '新建渠道',
            browseFolder: '浏览文件夹',
            saveTerminal: '保存终端设置',
            closeDialog: '关闭对话框',
            channelManagement: '渠道管理',
            settingsPage: '设置',
            droidPage: 'Droid 渠道管理',
            mainNav: '主导航',
            themeSelection: '主题选择',
            languageSelection: '语言选择',
            terminalPresets: '终端预设'
        },
        droid: {
            title: 'Droid 渠道管理',
            count: '个渠道',
            refresh: '刷新',
            add: '新建渠道',
            empty: {
                icon: '🤖',
                text: '暂无 Droid 渠道配置',
                hint: '点击右上角「➕ 新建渠道」开始添加'
            },
            status: {
                active: '当前激活',
                inactive: '待激活'
            },
            actions: {
                launch: '启动',
                switch: '切换',
                edit: '编辑',
                delete: '删除'
            },
            modal: {
                titleNew: '新建 Droid 渠道',
                titleEdit: '编辑 Droid 渠道',
                fields: {
                    name: '渠道名称',
                    namePlaceholder: '例如：渠道1、主渠道',
                    apiKey: 'API Key',
                    apiKeyPlaceholder: 'fx-xxxxx...'
                },
                buttons: {
                    cancel: '取消',
                    save: '保存'
                }
            },
            messages: {
                channelCreated: 'Droid 渠道已创建',
                channelUpdated: 'Droid 渠道已更新',
                channelDeleted: 'Droid 渠道 {name} 已删除',
                channelSwitched: '已切换到 Droid 渠道：{name}',
                channelLaunched: '已在新窗口中启动 Droid\n当前渠道：{name}\n终端：{terminal}',
                channelsRefreshed: 'Droid 渠道列表已刷新',
                errorNameRequired: '请输入渠道名称',
                errorApiKeyRequired: '请输入 API Key',
                errorNameDuplicate: '渠道名称已存在',
                confirmDelete: '确定要删除 Droid 渠道「{name}」吗？'
            }
        },
        confirm: {
            deleteTitle: '确认删除',
            deleteMessage: '此操作无法撤销，确定要删除吗？',
            delete: '删除',
            cancel: '取消'
        }
    },
    'en-US': {
        app: {
            title: 'Claude Channel Switcher',
            version: 'v3.0.0'
        },
        nav: {
            channels: 'Channels',
            droid: 'Droid',
            settings: 'Settings'
        },
        channels: {
            title: 'Channel Management',
            count: 'channels',
            refresh: 'Refresh',
            add: 'Add Channel',
            empty: {
                icon: '📭',
                text: 'No channels configured',
                hint: 'Click "➕ Add Channel" in the top right to get started'
            },
            status: {
                active: 'Active',
                inactive: 'Inactive'
            },
            actions: {
                launch: 'Launch',
                switch: 'Switch',
                edit: 'Edit',
                delete: 'Delete'
            }
        },
        modal: {
            titleNew: 'Add Channel',
            titleEdit: 'Edit Channel',
            close: 'Close dialog',
            fields: {
                name: 'Channel Name',
                namePlaceholder: 'e.g., Official, Proxy1, Backup',
                token: 'API Token',
                tokenPlaceholder: 'sk-ant-xxxxx...',
                url: 'Base URL',
                urlPlaceholder: 'https://api.anthropic.com'
            },
            buttons: {
                cancel: 'Cancel',
                save: 'Save'
            }
        },
        settings: {
            title: 'Settings',
            language: {
                title: 'Language',
                description: 'Choose the display language',
                zhCN: '简体中文',
                enUS: 'English'
            },
            theme: {
                title: 'Theme',
                description: 'Choose the appearance theme',
                dark: 'Dark Theme',
                light: 'Light Theme'
            },
            path: {
                title: 'Config Path',
                description: 'Set the Claude configuration file location',
                browse: 'Browse',
                label: 'Configuration path'
            },
            terminal: {
                title: 'Terminal',
                description: 'Choose the terminal to launch Claude',
                placeholder: 'e.g., powershell, pwsh, cmd',
                save: 'Save',
                label: 'Terminal command',
                presets: {
                    wt: 'Windows Terminal',
                    powershell: 'PowerShell',
                    pwsh: 'PowerShell Core',
                    cmd: 'CMD'
                }
            },
            terminalDir: {
                title: 'Terminal Working Directory',
                description: 'Set the default directory when terminal starts',
                browse: 'Browse',
                label: 'Working directory path'
            },
            about: {
                title: 'About',
                text: 'Claude Channel Switcher v3.0.0\n\nBuilt with Electron\nModern Web Technologies\nSmooth Animations & Interactions',
                githubLink: '🔗 GitHub Homepage'
            }
        },
        messages: {
            channelCreated: 'Channel created',
            channelUpdated: 'Channel updated',
            channelDeleted: 'Channel {name} deleted',
            channelSwitched: 'Switched to channel: {name}',
            channelLaunched: 'Claude launched in new window\nChannel: {name}\nTerminal: {terminal}',
            channelsRefreshed: 'Channels refreshed',
            pathUpdated: 'Config path updated',
            terminalSaved: 'Terminal settings saved',
            terminalSet: 'Terminal set to: {terminal}',
            terminalDirUpdated: 'Terminal working directory updated',
            themeChanged: 'Switched to {theme} theme',
            languageChanged: 'Language changed to {language}',
            errorSave: 'Save failed: {error}',
            errorSwitch: 'Switch failed: {error}',
            errorDelete: 'Delete failed: {error}',
            errorLaunch: 'Launch failed: {error}',
            errorNameRequired: 'Please enter channel name',
            errorTokenRequired: 'Please enter API Token',
            errorTerminalRequired: 'Please enter terminal command',
            errorUrlRequired: 'Base URL cannot be empty',
            errorUrlInvalid: 'Base URL must be a standard http or https link',
            errorNameDuplicate: 'Channel name already exists, please use another name',
            confirmDelete: 'Are you sure you want to delete channel "{name}"?'
        },
        aria: {
            refreshChannels: 'Refresh channel list',
            addChannel: 'Add new channel',
            browseFolder: 'Browse folder',
            saveTerminal: 'Save terminal settings',
            closeDialog: 'Close dialog',
            channelManagement: 'Channel management',
            settingsPage: 'Settings',
            droidPage: 'Droid Channel Management',
            mainNav: 'Main navigation',
            themeSelection: 'Theme selection',
            languageSelection: 'Language selection',
            terminalPresets: 'Terminal presets'
        },
        droid: {
            title: 'Droid Channel Management',
            count: 'channels',
            refresh: 'Refresh',
            add: 'Add Channel',
            empty: {
                icon: '🤖',
                text: 'No Droid channels configured',
                hint: 'Click "➕ Add Channel" in the top right to get started'
            },
            status: {
                active: 'Active',
                inactive: 'Inactive'
            },
            actions: {
                launch: 'Launch',
                switch: 'Switch',
                edit: 'Edit',
                delete: 'Delete'
            },
            modal: {
                titleNew: 'Add Droid Channel',
                titleEdit: 'Edit Droid Channel',
                fields: {
                    name: 'Channel Name',
                    namePlaceholder: 'e.g., Channel1, Main',
                    apiKey: 'API Key',
                    apiKeyPlaceholder: 'fx-xxxxx...'
                },
                buttons: {
                    cancel: 'Cancel',
                    save: 'Save'
                }
            },
            messages: {
                channelCreated: 'Droid channel created',
                channelUpdated: 'Droid channel updated',
                channelDeleted: 'Droid channel {name} deleted',
                channelSwitched: 'Switched to Droid channel: {name}',
                channelLaunched: 'Droid launched in new window\nChannel: {name}\nTerminal: {terminal}',
                channelsRefreshed: 'Droid channels refreshed',
                errorNameRequired: 'Please enter channel name',
                errorApiKeyRequired: 'Please enter API Key',
                errorNameDuplicate: 'Channel name already exists',
                confirmDelete: 'Are you sure you want to delete Droid channel "{name}"?'
            }
        },
        confirm: {
            deleteTitle: 'Confirm Delete',
            deleteMessage: 'This action cannot be undone. Are you sure?',
            delete: 'Delete',
            cancel: 'Cancel'
        }
    }
};

class I18n {
    constructor() {
        this.currentLang = localStorage.getItem('language') || 'zh-CN';
        this.translations = translations;
    }

    setLanguage(lang) {
        if (this.translations[lang]) {
            this.currentLang = lang;
            localStorage.setItem('language', lang);
            document.documentElement.lang = lang;
            return true;
        }
        return false;
    }

    t(key, params = {}) {
        const keys = key.split('.');
        let value = this.translations[this.currentLang];

        for (const k of keys) {
            if (value && typeof value === 'object') {
                value = value[k];
            } else {
                return key;
            }
        }

        if (typeof value === 'string') {
            return this.interpolate(value, params);
        }

        return key;
    }

    interpolate(text, params) {
        return text.replace(/\{(\w+)\}/g, (match, key) => {
            return params[key] !== undefined ? params[key] : match;
        });
    }

    getCurrentLanguage() {
        return this.currentLang;
    }

    getAvailableLanguages() {
        return Object.keys(this.translations);
    }
}

const i18n = new I18n();

if (typeof module !== 'undefined' && module.exports) {
    module.exports = i18n;
}
