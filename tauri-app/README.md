# Claude 渠道切换器 - Tauri 版

<div align="center">

![Version](https://img.shields.io/badge/version-3.0.0-blue.svg)
![License](https://img.shields.io/badge/license-MIT-green.svg)
![Tauri](https://img.shields.io/badge/Tauri-2.0-FFC131?logo=tauri&logoColor=white)

基于 Tauri v2 框架开发的 Claude API 渠道管理工具，用于快速切换和管理多个 Claude API 配置。

[功能特性](#-核心功能) • [快速开始](#-快速开始) • [使用指南](#-使用指南) • [开发文档](#-开发文档)

</div>

---

## 📋 目录

- [核心功能](#-核心功能)
- [快速开始](#-快速开始)
- [使用指南](#-使用指南)
- [技术架构](#-技术架构)
- [项目结构](#-项目结构)
- [开发文档](#-开发文档)
- [构建与发布](#-构建与发布)
- [常见问题](#-常见问题)
- [性能对比](#-性能对比)
- [贡献指南](#-贡献指南)

## ✨ 核心功能

### 🎯 渠道管理
- **创建渠道**：支持自定义渠道名称、API Token 和 Base URL
- **编辑渠道**：随时修改渠道配置信息
- **删除渠道**：安全删除不需要的渠道（标记删除）
- **快速切换**：一键切换不同渠道配置
- **状态显示**：清晰显示当前激活的渠道

### ⚙️ 配置管理
- **配置文件路径**：自定义 Claude 配置文件存储位置
- **终端设置**：支持 PowerShell、PowerShell Core、CMD
- **工作目录**：设置终端启动时的默认目录
- **主题切换**：深色/浅色主题，自动跟随系统
- **多语言**：支持简体中文和英文界面

### 🎨 用户体验
- **自定义标题栏**：完全控制标题栏样式和主题
- **流畅动画**：现代化的过渡动画效果
- **响应式设计**：适配不同窗口尺寸
- **无障碍支持**：完整的 ARIA 标签和键盘导航

## 🚀 快速开始

### 前置要求

| 工具 | 版本要求 | 说明 |
|------|---------|------|
| **Rust** | 1.70+ | [下载安装](https://www.rust-lang.org/tools/install) |
| **Node.js** | 18+ | [下载安装](https://nodejs.org/) (仅开发时需要) |
| **WebView2** | - | Windows 10/11 通常已预装 |

### 安装步骤

```bash
# 1. 克隆项目（如果从仓库获取）
git clone <repository-url>
cd electron-app/tauri-app

# 2. 安装依赖
npm install

# 3. 启动开发模式
npm run dev
```

**首次启动说明：**
- 首次编译 Rust 代码需要 5-10 分钟下载依赖
- 后续启动会快很多（通常 < 30 秒）
- 开发模式下会自动打开开发者工具

### 生产构建

```bash
# 构建安装包
npm run build
```

构建完成后，安装包位于：
- **Windows**: `src-tauri/target/release/bundle/nsis/Claude渠道切换器_3.0.0_x64-setup.exe`
- **macOS**: `src-tauri/target/release/bundle/dmg/` (如果配置了 macOS 构建)
- **Linux**: `src-tauri/target/release/bundle/appimage/` (如果配置了 Linux 构建)

## 📖 使用指南

### 1. 首次配置

1. **设置配置文件路径**
   - 打开应用，进入「设置」页面
   - 点击「配置文件路径」旁的「浏览」按钮
   - 选择 Claude 配置文件的存储目录（默认：`~/.claude`）

2. **配置终端**
   - 在「终端设置」中选择你常用的终端类型
   - 设置「终端工作目录」（终端启动时的默认目录）

### 2. 创建渠道

1. 在「渠道管理」页面点击「➕ 新建渠道」
2. 填写渠道信息：
   - **渠道名称**：自定义名称（如：官方、代理1、备用渠道）
   - **API Token**：Claude API 令牌（格式：`sk-ant-xxxxx...`）
   - **Base URL**：API 地址（可选，默认使用官方地址）
3. 点击「保存」

### 3. 切换渠道

1. 在渠道列表中找到目标渠道
2. 点击渠道卡片上的「⚡ 切换」按钮
3. 切换成功后，该渠道会显示「当前激活」状态

### 4. 启动 Claude

1. 确保已切换到目标渠道（显示「当前激活」）
2. 点击渠道卡片上的「🚀 启动」按钮
3. 会在新的终端窗口中启动 Claude

### 5. 编辑/删除渠道

- **编辑**：点击渠道卡片上的「✏️ 编辑」按钮
- **删除**：点击「🗑️ 删除」按钮，确认后删除（文件会重命名为 `.del` 后缀）

## 🏗️ 技术架构

### 前端技术栈

| 技术 | 用途 | 说明 |
|------|------|------|
| **HTML5** | 结构 | 语义化标签，完整的 ARIA 支持 |
| **CSS3** | 样式 | CSS 变量、现代布局、流畅动画 |
| **JavaScript** | 逻辑 | 原生 ES6+，无框架依赖 |
| **Tauri API** | 通信 | 通过 `window.__TAURI__` 全局 API |

### 后端技术栈

| 技术 | 用途 | 说明 |
|------|------|------|
| **Rust** | 核心 | 系统编程，内存安全 |
| **Tauri v2** | 框架 | 跨平台桌面应用框架 |
| **serde** | 序列化 | JSON 配置解析 |
| **Tauri Plugins** | 扩展 | Shell、Dialog 插件 |

### 数据存储

- **配置文件**：JSON 格式，存储在用户指定的目录
- **本地设置**：使用 `localStorage` 存储用户偏好（主题、语言等）
- **文件命名**：
  - 渠道配置：`settings-{渠道名}.json`
  - 激活配置：`settings.json`
  - 已删除：`settings-{渠道名}.json.del`

## 📂 项目结构

```
tauri-app/
├── src/                          # 前端源代码
│   ├── index.html                # 主界面 HTML
│   ├── app.js                    # 前端业务逻辑（737 行）
│   ├── i18n.js                   # 国际化模块（307 行）
│   ├── styles.css                # 样式表（809 行）
│   └── assets/                   # 静态资源
│
├── src-tauri/                    # Rust 后端
│   ├── src/
│   │   └── main.rs               # 主程序（324 行）
│   ├── capabilities/             # 权限配置
│   │   └── default.json          # 默认权限
│   ├── gen/                      # 自动生成的类型定义
│   ├── icons/                    # 应用图标
│   ├── Cargo.toml                # Rust 依赖配置
│   └── tauri.conf.json           # Tauri 配置文件
│
├── package.json                  # Node.js 项目配置
├── package-lock.json             # 依赖锁定文件
└── README.md                     # 项目文档
```

### 代码统计

- **前端代码**：约 1,853 行（HTML + JS + CSS）
- **后端代码**：约 324 行（Rust）
- **配置文件**：约 100 行
- **总计**：约 2,277 行

## 🔧 开发文档

### API 接口

#### 前端调用后端

所有前端到后端的通信都通过 `invoke()` 函数：

```javascript
// 调用示例
const result = await invoke('command_name', { param1: value1 });
```

#### 可用命令列表

| 命令 | 参数 | 返回值 | 说明 |
|------|------|--------|------|
| `get_channels` | `{ configPath: string }` | `ApiResponse` | 获取所有渠道配置 |
| `get_active_channel` | `{ configPath: string }` | `ApiResponse` | 获取当前激活的渠道 |
| `save_channel` | `{ configPath, channelName, token, url, oldName }` | `ApiResponse` | 保存/更新渠道 |
| `delete_channel` | `{ configPath, channelName }` | `ApiResponse` | 删除渠道 |
| `switch_channel` | `{ configPath, channelName }` | `ApiResponse` | 切换渠道 |
| `launch_claude` | `{ terminal, terminalDir }` | `ApiResponse` | 启动 Claude |
| `get_home_dir` | - | `string` | 获取用户主目录 |
| `window_minimize` | - | `void` | 最小化窗口 |
| `window_maximize` | - | `void` | 最大化窗口 |
| `window_unmaximize` | - | `void` | 还原窗口 |
| `window_close` | - | `void` | 关闭窗口 |
| `window_is_maximized` | - | `boolean` | 检查窗口是否最大化 |

#### 响应格式

```typescript
interface ApiResponse {
    success: boolean;
    error?: string;
    channels?: HashMap<string, ChannelConfig>;
    config?: ChannelConfig;
    data?: any;
}
```

### 添加新功能

#### 1. 添加后端命令

在 `src-tauri/src/main.rs` 中：

```rust
#[tauri::command]
async fn my_new_command(param: String) -> ApiResponse<()> {
    // 实现逻辑
    ApiResponse::success()
}

// 在 main() 中注册
.invoke_handler(tauri::generate_handler![
    // ... 其他命令
    my_new_command
])
```

#### 2. 添加前端调用

在 `src/app.js` 中：

```javascript
async function myNewFunction() {
    try {
        const result = await invoke('my_new_command', {
            param: 'value'
        });
        if (result.success) {
            showToast('操作成功');
        }
    } catch (error) {
        showToast(`错误: ${error}`);
    }
}
```

#### 3. 添加权限（如需要）

在 `src-tauri/capabilities/default.json` 中添加：

```json
{
  "permissions": [
    // ... 现有权限
    "core:window:allow-my-permission"
  ]
}
```

### 调试技巧

#### 开发模式

```bash
npm run dev
```

- 自动打开开发者工具
- 支持热重载（修改前端代码后刷新页面）
- Rust 代码修改后需要重新编译

#### 前端调试

1. 打开开发者工具（`Ctrl+Shift+I`）
2. 在 Console 中查看日志
3. 使用 `console.log()` 输出调试信息

#### 后端调试

1. 在 Rust 代码中使用 `println!()` 或 `eprintln!()`
2. 输出会显示在启动应用的终端中
3. 使用 Rust 调试器（如 VS Code 的 Rust Analyzer）

### 代码规范

#### JavaScript

- 使用 ES6+ 语法
- 函数使用 `async/await` 处理异步
- 使用 `const` 和 `let`，避免 `var`
- 函数命名使用驼峰式（camelCase）

#### Rust

- 遵循 Rust 官方代码风格
- 使用 `Result<T, E>` 处理错误
- 函数命名使用蛇形命名（snake_case）
- 添加适当的错误处理

#### CSS

- 使用 CSS 变量定义主题颜色
- 类名使用短横线命名（kebab-case）
- 保持选择器简洁，避免过深嵌套

## 📦 构建与发布

### 开发构建

```bash
npm run dev
```

### 生产构建

```bash
npm run build
```

### 构建配置

主要配置在 `src-tauri/tauri.conf.json`：

- **窗口配置**：大小、最小尺寸、标题等
- **打包配置**：图标、安装包类型（NSIS/MSI）
- **安全配置**：CSP 策略、权限控制

### 发布流程

1. 更新版本号（`package.json` 和 `tauri.conf.json`）
2. 运行 `npm run build`
3. 测试生成的安装包
4. 创建发布标签（如使用 Git）
5. 上传安装包到发布平台

## ❓ 常见问题

### Q: 首次启动很慢？

**A:** 首次编译 Rust 代码需要下载大量依赖，这是正常现象。后续启动会快很多。

### Q: 渠道切换后没有生效？

**A:** 确保：
1. 配置文件路径正确
2. 有写入权限
3. 检查 `settings.json` 文件是否更新

### Q: 启动 Claude 失败？

**A:** 检查：
1. 终端类型是否正确
2. 工作目录路径是否存在
3. 系统 PATH 中是否有 `claude` 命令

### Q: 标题栏颜色不跟随主题？

**A:** 自定义标题栏的颜色通过 CSS 变量自动更新，确保：
1. 主题切换时调用了 `applyTheme()`
2. CSS 变量正确定义
3. 浏览器缓存已清除

### Q: 如何重置所有设置？

**A:** 清除浏览器 `localStorage`：
1. 打开开发者工具
2. 进入 Application/Storage 标签
3. 清除 Local Storage

## 📊 性能对比

### 与 Electron 版本对比

| 指标 | Tauri 版 | Electron 版 | 优势 |
|------|---------|------------|------|
| **安装包大小** | ~5MB | ~150MB | **97% 减小** |
| **内存占用** | ~30-50MB | ~150-200MB | **70% 减少** |
| **启动时间** | < 1秒 | 2-3秒 | **2-3倍更快** |
| **CPU 占用** | 低 | 中等 | 更省电 |
| **安全性** | 高（Rust） | 一般 | 内存安全 |

### 性能优化

- ✅ 原生代码执行（Rust）
- ✅ 最小化 WebView 开销
- ✅ 无 Node.js 运行时
- ✅ 优化的资源加载

## 🤝 贡献指南

### 如何贡献

1. **Fork 项目**
2. **创建功能分支** (`git checkout -b feature/AmazingFeature`)
3. **提交更改** (`git commit -m 'Add some AmazingFeature'`)
4. **推送到分支** (`git push origin feature/AmazingFeature`)
5. **开启 Pull Request**

### 代码提交规范

- `feat`: 新功能
- `fix`: 修复 bug
- `docs`: 文档更新
- `style`: 代码格式调整
- `refactor`: 代码重构
- `perf`: 性能优化
- `test`: 测试相关

### 报告问题

在提交 Issue 时，请包含：
- 操作系统和版本
- 应用版本
- 复现步骤
- 预期行为 vs 实际行为
- 错误日志（如有）

## 📄 许可证

MIT License

## 🙏 致谢

- [Tauri](https://tauri.app/) - 跨平台桌面应用框架
- [Rust](https://www.rust-lang.org/) - 系统编程语言
- [Claude](https://www.anthropic.com/) - AI 助手

## 📮 联系方式

- **作者**: changingshow
- **项目**: claude-channel-switcher
- **版本**: v3.0.0

---

<div align="center">

**⭐ 如果这个项目对你有帮助，请给个 Star！**

Made with ❤️ using Tauri

</div>
