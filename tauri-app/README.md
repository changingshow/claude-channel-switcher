# Claude 渠道切换器

Claude 渠道切换器的 Tauri 版本，用于管理 Claude、Codex 和 Droid 的 API 渠道配置，并快速切换当前使用的渠道。

## 功能

- Claude API 渠道管理和快速切换
- Codex 渠道管理
- Droid API Key 管理
- Claude StatusLine 可视化配置
- 渠道余额查询配置
- 深色/浅色主题
- 中文/英文界面
- 本地配置存储

## 环境要求

- Node.js 18+
- Rust 1.70+
- Windows 10/11 WebView2 运行时

## 开发

```bash
npm install
npm run dev
```

## 构建

```bash
npm run build
```

Windows 安装包会生成在 `src-tauri/target/release/bundle/` 目录下。

## 常用命令

```bash
npm run tauri
npm run dev
npm run build
```

## 项目结构

```text
tauri-app/
├── src/                 # 前端代码
│   ├── index.html
│   ├── app.js
│   ├── i18n.js
│   ├── styles.css
│   ├── assets/
│   └── js/
├── src-tauri/           # Tauri/Rust 后端
│   ├── src/
│   ├── capabilities/
│   ├── icons/
│   ├── Cargo.toml
│   └── tauri.conf.json
├── package.json
└── package-lock.json
```

## 配置说明

- Tauri 前端目录：`src/`
- Tauri 配置文件：`src-tauri/tauri.conf.json`
- Rust 后端入口：`src-tauri/src/main.rs`
- 应用窗口使用自定义标题栏，Tauri 配置中关闭了系统装饰栏

## 许可证

MIT License
