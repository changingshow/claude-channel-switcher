const translations = {
    'zh-CN': {
        app: {
            title: 'Claude 渠道切换器',
            version: 'v3.9.9',
            description: 'Claude API 渠道管理和切换工具'
        },
        nav: {
            channels: 'Claude 渠道',
            statusline: 'Claude 状态栏',
            codex: 'Codex 渠道',
            droid: 'Droid 渠道',
            settings: '设置'
        },
        channels: {
            title: 'Claude 渠道管理',
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
            },
            balance: {
                clickToQuery: '点击查询余额',
                loading: '查询中...',
                error: '查询失败',
                noToken: '无 Token',
                noField: '未设置字段'
            }
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
                    apiKeyPlaceholder: 'fx-xxxxxx...'
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
                channelLaunched: '已在新窗口中启动 Droid\n当前渠道：{name}',
                channelsRefreshed: 'Droid 渠道列表已刷新',
                errorNameRequired: '请输入渠道名称',
                errorApiKeyRequired: '请输入 API Key',
                errorNameDuplicate: '渠道名称已存在，请使用其他名称',
                confirmDelete: '确定要删除 Droid 渠道「{name}」吗？'
            }
        },
        codex: {
            title: 'Codex 渠道',
            count: '个渠道',
            refresh: '刷新',
            add: '新建',
            empty: {
                icon: '📘',
                text: '暂无 Codex 渠道',
                hint: '点击右上角「新建」按钮添加渠道'
            },
            status: {
                active: '已激活',
                inactive: '待激活',
                switching: '切换中'
            },
            actions: {
                launch: '启动',
                switch: '切换',
                switching: '切换中',
                edit: '编辑',
                delete: '删除'
            },
            modal: {
                titleNew: '新建 Codex 渠道',
                titleEdit: '编辑 Codex 渠道',
                fields: {
                    name: '渠道名称',
                    namePlaceholder: '仅英文字母、数字、-、_',
                    baseurl: 'Base URL',
                    baseurlPlaceholder: 'https://api.example.com',
                    apikey: 'API Key',
                    apikeyPlaceholder: 'sk-xxxxxx...',
                    model: '模型名称',
                    modelPlaceholder: '例如：o3-mini'
                },
                buttons: {
                    cancel: '取消',
                    save: '保存'
                }
            },
            messages: {
                channelCreated: 'Codex 渠道已创建',
                channelUpdated: 'Codex 渠道已更新',
                channelDeleted: 'Codex 渠道已删除',
                channelSwitched: '已切换到 Codex 渠道',
                channelLaunched: '已在新窗口中启动 Codex',
                channelsRefreshed: 'Codex 渠道列表已刷新',
                errorNameRequired: '请输入渠道名称',
                errorNameInvalid: '渠道名称仅支持英文字母、数字、-、_，最多18位',
                errorNameDuplicate: '渠道名称已存在，请使用其他名称',
                errorBaseurlRequired: '请输入 Base URL',
                errorBaseurlInvalid: 'Base URL 格式无效，请输入 http:// 或 https:// 地址',
                errorApikeyRequired: '请输入 API Key',
                errorModelRequired: '请输入模型名称',
                confirmDelete: '确定要删除该 Codex 渠道吗？'
            }
        },
        statusline: {
            items: {
                title: '显示项目'
            },
            separator: {
                title: '分隔线',
                style: '样式',
                custom: '自定义分隔符',
                color: '分隔符颜色'
            },
            preview: {
                title: '实时预览',
                terminalTitle: 'PowerShell - Claude Code',
                noItems: '暂无启用的项目'
            },
            actions: {
                save: '保存',
                reset: '重置为默认'
            },
            files: {
                title: '样式文件',
                create: '新建样式',
                refresh: '刷新',
                newFile: '新建样式',
                empty: '暂无样式文件',
                emptyHint: '点击左下角「新建样式」创建第一个样式',
                apply: '应用此样式',
                delete: '删除',
                saveDialogTitle: '保存样式',
                nameLabel: '样式名称',
                namePlaceholder: '例如：简约、彩色、专业',
                nameHint: '文件将保存为 statusline_名称.ps1',
                nameRequired: '请输入样式名称',
                nameInvalid: '名称只能包含字母、数字、下划线和中文',
                nameExists: '该名称已存在，请使用其他名称',
                confirmDeleteTitle: '确认删除',
                confirmDeleteMessage: '确定要删除样式「{name}」吗？',
                saveChoiceMessage: '要保存对样式「{name}」的修改吗？',
                overwrite: '覆盖保存',
                saveAs: '另存为',
                justNow: '刚刚',
                minutesAgo: '分钟前',
                hoursAgo: '小时前',
                yesterday: '昨天',
                daysAgo: '天前'
            },
            messages: {
                fileSaved: '样式「{name}」已保存',
                fileDeleted: '样式「{name}」已删除',
                applied: '已应用样式「{name}」',
                reset: '配置已重置为默认'
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
                urlPlaceholder: 'https://api.anthropic.com',
                balanceField: '余额字段（可选）',
                balanceFieldRequired: '余额字段（必填）'
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
            codexPath: {
                title: 'Codex 配置文件路径',
                description: '设置 Codex 配置文件的存储位置',
                browse: '浏览',
                label: 'Codex 配置文件路径'
            },
            terminal: {
                title: '终端程序',
                description: '选择启动 Claude 时使用的终端'
            },
            terminalDir: {
                title: '终端工作目录',
                description: '设置终端启动时的默认目录',
                browse: '浏览',
                label: '工作目录路径'
            },
            about: {
                title: '关于',
                appName: 'Claude 渠道切换器',
                description: '更轻量、更安全、更快速的 Claude API 渠道管理工具',
                techStack: '基于 Tauri 框架，采用 Rust + Web 技术构建',
                feedback: '反馈建议',
                copyright: '© 2025 Claude Channel Switcher',
                githubLink: 'GitHub'
            }
        },
        messages: {
            channelCreated: '渠道已创建',
            channelUpdated: '渠道已更新',
            channelDeleted: '渠道 {name} 已删除',
            channelSwitched: '已切换到渠道：{name}',
            channelLaunched: '已在新窗口中启动 Claude\n当前渠道：{name}',
            channelsRefreshed: '渠道列表已刷新',
            pathUpdated: '配置路径已更新',
            codexPathUpdated: 'Codex 配置路径已更新',
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
            errorBalanceFieldRequired: '填写了余额查询地址时，余额字段为必填项',
            confirmDelete: '确定要删除渠道「{name}」吗？'
        },
        aria: {
            refreshChannels: '刷新渠道列表',
            addChannel: '新建渠道',
            refreshDroid: '刷新 Droid 渠道列表',
            addDroid: '新建 Droid 渠道',
            refreshCodex: '刷新 Codex 渠道列表',
            addCodex: '新建 Codex 渠道',
            codexPage: 'Codex 渠道',
            droidPage: 'Droid 渠道管理',
            statuslinePage: 'Claude 状态栏配置页面',
            browseFolder: '浏览文件夹',
            closeDialog: '关闭对话框',
            channelManagement: '渠道管理',
            settingsPage: '设置',
            mainNav: '主导航',
            themeSelection: '主题选择',
            languageSelection: '语言选择',
            minimize: '最小化',
            maximize: '最大化',
            close: '关闭'
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
            version: 'v3.0.0',
            description: 'Claude API channel management and switching tool'
        },
        nav: {
            channels: 'Channels',
            statusline: 'Claude StatusLine',
            codex: 'Codex',
            droid: 'Droid Channels',
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
                inactive: 'Inactive',
                switching: 'Switching'
            },
            actions: {
                launch: 'Launch',
                switch: 'Switch',
                switching: 'Switching',
                edit: 'Edit',
                delete: 'Delete'
            },
            balance: {
                clickToQuery: 'Click to query balance',
                loading: 'Loading...',
                error: 'Query failed',
                noToken: 'No Token',
                noField: 'Field not set'
            }
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
                    apiKeyPlaceholder: 'fx-xxxxxx...'
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
                channelLaunched: 'Droid launched in new window\nChannel: {name}',
                channelsRefreshed: 'Droid channels refreshed',
                errorNameRequired: 'Please enter channel name',
                errorApiKeyRequired: 'Please enter API Key',
                errorNameDuplicate: 'Channel name already exists, please use another name',
                confirmDelete: 'Are you sure you want to delete Droid channel "{name}"?'
            }
        },
        codex: {
            title: 'Codex Channels',
            count: 'channels',
            refresh: 'Refresh',
            add: 'New',
            empty: {
                icon: '📘',
                text: 'No Codex Channels',
                hint: 'Click "New" button to add a channel'
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
                titleNew: 'New Codex Channel',
                titleEdit: 'Edit Codex Channel',
                fields: {
                    name: 'Channel Name',
                    namePlaceholder: 'Letters, digits, - and _ only',
                    baseurl: 'Base URL',
                    baseurlPlaceholder: 'https://api.example.com',
                    apikey: 'API Key',
                    apikeyPlaceholder: 'sk-xxxxxx...',
                    model: 'Model Name',
                    modelPlaceholder: 'e.g. o3-mini'
                },
                buttons: {
                    cancel: 'Cancel',
                    save: 'Save'
                }
            },
            messages: {
                channelCreated: 'Codex channel created',
                channelUpdated: 'Codex channel updated',
                channelDeleted: 'Codex channel deleted',
                channelSwitched: 'Switched to Codex channel',
                channelLaunched: 'Codex launched in new window',
                channelsRefreshed: 'Codex channel list refreshed',
                errorNameRequired: 'Channel name is required',
                errorNameInvalid: 'Only letters, digits, - and _ allowed, max 18 chars',
                errorNameDuplicate: 'Channel name already exists, please use another name',
                errorBaseurlRequired: 'Base URL is required',
                errorBaseurlInvalid: 'Base URL must be a valid http:// or https:// URL',
                errorApikeyRequired: 'API Key is required',
                errorModelRequired: 'Model name is required',
                confirmDelete: 'Are you sure you want to delete this Codex channel?'
            }
        },
        statusline: {
            items: {
                title: 'Display Items'
            },
            separator: {
                title: 'Separator',
                style: 'Style',
                custom: 'Custom Separator',
                color: 'Separator Color'
            },
            preview: {
                title: 'Live Preview',
                terminalTitle: 'PowerShell - Claude Code',
                noItems: 'No enabled items'
            },
            actions: {
                save: 'Save',
                reset: 'Reset to Default'
            },
            files: {
                title: 'Style Files',
                create: 'New Style',
                refresh: 'Refresh',
                newFile: 'New Style',
                empty: 'No style files yet',
                emptyHint: 'Click "New Style" at the bottom left to create your first style',
                apply: 'Apply this style',
                delete: 'Delete',
                saveDialogTitle: 'Save Style',
                nameLabel: 'Style Name',
                namePlaceholder: 'e.g., simple, colorful, professional',
                nameHint: 'File will be saved as statusline_name.ps1',
                nameRequired: 'Please enter a style name',
                nameInvalid: 'Name can only contain letters, numbers, underscores and Chinese characters',
                nameExists: 'This name already exists, please use a different name',
                confirmDeleteTitle: 'Confirm Delete',
                confirmDeleteMessage: 'Are you sure you want to delete style "{name}"?',
                saveChoiceMessage: 'Save changes to style "{name}"?',
                overwrite: 'Overwrite',
                saveAs: 'Save As',
                justNow: 'Just now',
                minutesAgo: 'm ago',
                hoursAgo: 'h ago',
                yesterday: 'Yesterday',
                daysAgo: 'd ago'
            },
            messages: {
                fileSaved: 'Style "{name}" saved',
                fileDeleted: 'Style "{name}" deleted',
                applied: 'Style "{name}" applied',
                reset: 'Configuration reset to default'
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
                urlPlaceholder: 'https://api.anthropic.com',
                balanceField: 'Balance Field (Optional)',
                balanceFieldRequired: 'Balance Field (Required)'
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
            codexPath: {
                title: 'Codex Config Path',
                description: 'Set the Codex configuration file location',
                browse: 'Browse',
                label: 'Codex configuration path'
            },
            terminal: {
                title: 'Terminal Program',
                description: 'Choose the terminal to launch Claude'
            },
            terminalDir: {
                title: 'Terminal Working Directory',
                description: 'Set the default directory when terminal starts',
                browse: 'Browse',
                label: 'Working directory path'
            },
            about: {
                title: 'About',
                appName: 'Claude Channel Switcher',
                description: 'Lighter, Safer, Faster Claude API Channel Manager',
                techStack: 'Built with Tauri framework, using Rust + Web technologies',
                feedback: 'Feedback',
                copyright: '© 2025 Claude Channel Switcher',
                githubLink: 'GitHub'
            }
        },
        messages: {
            channelCreated: 'Channel created',
            channelUpdated: 'Channel updated',
            channelDeleted: 'Channel {name} deleted',
            channelSwitched: 'Switched to channel: {name}',
            channelLaunched: 'Claude launched in new window\nChannel: {name}',
            channelsRefreshed: 'Channels refreshed',
            pathUpdated: 'Config path updated',
            codexPathUpdated: 'Codex configuration path updated',
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
            errorBalanceFieldRequired: 'Balance field is required when balance URL is provided',
            confirmDelete: 'Are you sure you want to delete channel "{name}"?'
        },
        aria: {
            refreshChannels: 'Refresh channel list',
            addChannel: 'Add new channel',
            refreshDroid: 'Refresh Droid channel list',
            addDroid: 'Add new Droid channel',
            refreshCodex: 'Refresh Codex channel list',
            addCodex: 'Add new Codex channel',
            codexPage: 'Codex Channels',
            droidPage: 'Droid Channel Management',
            statuslinePage: 'Claude StatusLine Configuration Page',
            browseFolder: 'Browse folder',
            closeDialog: 'Close dialog',
            channelManagement: 'Channel management',
            settingsPage: 'Settings',
            mainNav: 'Main navigation',
            themeSelection: 'Theme selection',
            languageSelection: 'Language selection',
            minimize: 'Minimize',
            maximize: 'Maximize',
            close: 'Close'
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
