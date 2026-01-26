// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use std::collections::HashMap;
use std::fs;
use std::path::Path;
use std::io::Write;
use serde::{Deserialize, Serialize};

#[derive(Debug, Serialize, Deserialize, Clone)]
struct BalanceApi {
    #[serde(skip_serializing_if = "Option::is_none")]
    url: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    method: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    field: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
struct ChannelConfig {
    env: HashMap<String, String>,
    permissions: Permissions,
    #[serde(skip_serializing_if = "Option::is_none")]
    model: Option<String>,
    #[serde(rename = "alwaysThinkingEnabled")]
    always_thinking_enabled: bool,
    #[serde(skip_serializing_if = "Option::is_none")]
    mtime: Option<i64>,
    #[serde(rename = "balanceApi", skip_serializing_if = "Option::is_none")]
    balance_api: Option<BalanceApi>,
}

#[derive(Debug, Serialize, Deserialize)]
struct Permissions {
    allow: Vec<String>,
    deny: Vec<String>,
}

#[derive(Debug, Serialize)]
struct ApiResponse<T> {
    success: bool,
    #[serde(skip_serializing_if = "Option::is_none")]
    error: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    channels: Option<HashMap<String, ChannelConfig>>,
    #[serde(skip_serializing_if = "Option::is_none")]
    config: Option<ChannelConfig>,
    #[serde(skip_serializing_if = "Option::is_none")]
    data: Option<T>,
}

// 辅助函数：创建成功响应
impl ApiResponse<()> {
    fn success() -> ApiResponse<()> {
        ApiResponse {
            success: true,
            error: None,
            channels: None,
            config: None,
            data: None,
        }
    }

    fn success_with_channels(channels: HashMap<String, ChannelConfig>) -> ApiResponse<()> {
        ApiResponse {
            success: true,
            error: None,
            channels: Some(channels),
            config: None,
            data: None,
        }
    }

    fn success_with_config(config: ChannelConfig) -> ApiResponse<()> {
        ApiResponse {
            success: true,
            error: None,
            channels: None,
            config: Some(config),
            data: None,
        }
    }

    fn error(error: String) -> ApiResponse<()> {
        ApiResponse {
            success: false,
            error: Some(error),
            channels: None,
            config: None,
            data: None,
        }
    }
}

#[tauri::command]
async fn get_channels(config_path: String) -> ApiResponse<()> {
    match read_channels(&config_path) {
        Ok(channels) => ApiResponse::success_with_channels(channels),
        Err(e) => ApiResponse::error(e.to_string()),
    }
}

#[tauri::command]
async fn get_active_channel(config_path: String) -> ApiResponse<()> {
    let settings_path = Path::new(&config_path).join("settings.json");
    
    match fs::read_to_string(&settings_path) {
        Ok(content) => {
            match serde_json::from_str::<ChannelConfig>(&content) {
                Ok(config) => ApiResponse::success_with_config(config),
                Err(e) => ApiResponse::error(e.to_string()),
            }
        },
        Err(e) => ApiResponse::error(e.to_string()),
    }
}

#[tauri::command]
async fn save_channel(
    config_path: String,
    channel_name: String,
    token: String,
    url: String,
    model: String,
    old_name: String,
    balance_url: String,
    balance_method: String,
    balance_field: String,
) -> ApiResponse<()> {
    let mut env = HashMap::new();
    env.insert("ANTHROPIC_AUTH_TOKEN".to_string(), token);
    env.insert("CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC".to_string(), "1".to_string());

    if !url.is_empty() {
        env.insert("ANTHROPIC_BASE_URL".to_string(), url);
    }

    let balance_api = if !balance_url.is_empty() {
        Some(BalanceApi {
            url: Some(balance_url),
            method: if balance_method.is_empty() { Some("POST".to_string()) } else { Some(balance_method) },
            field: if balance_field.is_empty() { None } else { Some(balance_field) },
        })
    } else {
        None
    };

    let config = ChannelConfig {
        env,
        permissions: Permissions {
            allow: vec![],
            deny: vec![],
        },
        model: if model.is_empty() { None } else { Some(model) },
        always_thinking_enabled: true,
        mtime: None,
        balance_api,
    };

    if !old_name.is_empty() && old_name != channel_name {
        let old_file_path = Path::new(&config_path).join(format!("settings-{}.json", old_name));
        let _ = fs::remove_file(old_file_path);
    }

    let file_path = Path::new(&config_path).join(format!("settings-{}.json", channel_name));
    
    match serde_json::to_string_pretty(&config) {
        Ok(json_content) => {
            match fs::write(&file_path, json_content) {
                Ok(_) => ApiResponse::success(),
                Err(e) => ApiResponse::error(e.to_string()),
            }
        },
        Err(e) => ApiResponse::error(e.to_string()),
    }
}

#[tauri::command]
async fn delete_channel(config_path: String, channel_name: String) -> ApiResponse<()> {
    let source_path = Path::new(&config_path).join(format!("settings-{}.json", channel_name));
    let target_path = Path::new(&config_path).join(format!("settings-{}.json.del", channel_name));
    
    match fs::rename(&source_path, &target_path) {
        Ok(_) => ApiResponse::success(),
        Err(e) => ApiResponse::error(e.to_string()),
    }
}

#[tauri::command]
async fn switch_channel(config_path: String, channel_name: String) -> ApiResponse<()> {
    let source_path = Path::new(&config_path).join(format!("settings-{}.json", channel_name));
    let target_path = Path::new(&config_path).join("settings.json");
    
    // 读取源渠道配置
    let source_content = match fs::read_to_string(&source_path) {
        Ok(content) => content,
        Err(e) => return ApiResponse::error(e.to_string()),
    };
    
    let source_json: serde_json::Value = match serde_json::from_str(&source_content) {
        Ok(v) => v,
        Err(e) => return ApiResponse::error(e.to_string()),
    };
    
    // 读取目标 settings.json（如果存在）
    let mut target_json: serde_json::Value = if target_path.exists() {
        match fs::read_to_string(&target_path) {
            Ok(content) => match serde_json::from_str(&content) {
                Ok(v) => v,
                Err(_) => serde_json::json!({}),
            },
            Err(_) => serde_json::json!({}),
        }
    } else {
        serde_json::json!({})
    };
    
    // 只覆写 env 和 balanceApi 字段，保留 settings.json 中的其他配置
    if let Some(target_obj) = target_json.as_object_mut() {
        // 覆写 env
        if let Some(env) = source_json.get("env") {
            target_obj.insert("env".to_string(), env.clone());
        }
        
        // 覆写 balanceApi（如果源文件有则覆写，没有则移除）
        if let Some(balance_api) = source_json.get("balanceApi") {
            target_obj.insert("balanceApi".to_string(), balance_api.clone());
        } else {
            target_obj.remove("balanceApi");
        }
        
        // 确保必需字段存在（防止 get_active_channel 解析失败）
        if !target_obj.contains_key("permissions") {
            target_obj.insert("permissions".to_string(), serde_json::json!({
                "allow": [],
                "deny": []
            }));
        }
        if !target_obj.contains_key("alwaysThinkingEnabled") {
            target_obj.insert("alwaysThinkingEnabled".to_string(), serde_json::json!(true));
        }
    }
    
    // 写入合并后的配置
    let merged_content = match serde_json::to_string_pretty(&target_json) {
        Ok(json) => json,
        Err(e) => return ApiResponse::error(e.to_string()),
    };
    
    match fs::write(&target_path, merged_content) {
        Ok(_) => ApiResponse::success(),
        Err(e) => ApiResponse::error(e.to_string()),
    }
}

#[tauri::command(rename_all = "camelCase")]
async fn launch_claude(terminal_dir: String) -> ApiResponse<()> {
    open_terminal("claude", &terminal_dir)
}

#[tauri::command(rename_all = "camelCase")]
async fn launch_droid(terminal_dir: String) -> ApiResponse<()> {
    open_terminal("droid", &terminal_dir)
}

// ==================== 终端启动模块 ====================

#[cfg(target_os = "windows")]
const CREATE_NO_WINDOW: u32 = 0x08000000;

#[cfg(target_os = "windows")]
fn command_exists(cmd: &str) -> bool {
    use std::process::Command;
    use std::os::windows::process::CommandExt;
    Command::new("where")
        .arg(cmd)
        .creation_flags(CREATE_NO_WINDOW)
        .output()
        .map(|o| o.status.success())
        .unwrap_or(false)
}

fn open_terminal(command: &str, dir: &str) -> ApiResponse<()> {
    #[cfg(target_os = "windows")]
    {
        use std::process::Command;

        // 检查工作目录是否存在，不存在则回退到用户主目录
        let work_dir = if Path::new(dir).exists() {
            dir.to_string()
        } else {
            std::env::var("USERPROFILE").unwrap_or_else(|_| "C:\\".to_string())
        };

        // 检查是否有 pwsh (PowerShell 7)，没有则使用 powershell
        let shell = if command_exists("pwsh") { "pwsh" } else { "powershell" };

        // 优先尝试 Windows Terminal，失败则回退到直接启动 PowerShell
        if let Some(result) = try_launch_with_wt(&work_dir, shell, command) {
            return result;
        }

        // 回退方案：直接启动 PowerShell 窗口
        let result = Command::new(shell)
            .args(["-NoExit", "-Command", &format!("cd '{}'; {}", work_dir, command)])
            .spawn()
            .map(|_| ());

        match result {
            Ok(_) => ApiResponse::success(),
            Err(e) => ApiResponse::error(format!("启动终端失败: {}", e)),
        }
    }

    #[cfg(not(target_os = "windows"))]
    {
        ApiResponse::error("仅支持 Windows".to_string())
    }
}

#[cfg(target_os = "windows")]
fn try_launch_with_wt(dir: &str, shell: &str, command: &str) -> Option<ApiResponse<()>> {
    use std::process::Command;
    use std::os::windows::process::CommandExt;

    // 处理路径：移除末尾的反斜杠，防止与后续的引号组合成转义字符 (例如 "D:\" -> "D:")
    let clean_dir = dir.trim_end_matches('\\');

    // 使用 PowerShell Start-Process 启动 wt（Win10/Win11 兼容性最好）
    // 注意：这里需要仔细处理引号转义
    let ps_command = format!(
        "Start-Process -FilePath wt -ArgumentList '-d \"{}\" {} -NoExit -Command {}' -Wait -PassThru",
        clean_dir, shell, command
    );

    if let Ok(output) = Command::new("powershell")
        .args(["-NoProfile", "-Command", &ps_command])
        .creation_flags(CREATE_NO_WINDOW)
        .output()
    {
        // 检查 PowerShell 命令本身的执行状态
        if output.status.success() {
             return Some(ApiResponse::success());
        }
    }

    None
}

fn read_channels(config_path: &str) -> Result<HashMap<String, ChannelConfig>, Box<dyn std::error::Error>> {
    let path = Path::new(config_path);
    
    if !path.exists() {
        return Ok(HashMap::new());
    }
    
    let entries = fs::read_dir(path)?;
    let mut channels = HashMap::new();
    
    for entry in entries {
        let entry = entry?;
        let file_name = entry.file_name();
        let file_name_str = file_name.to_string_lossy();
        
        if file_name_str.starts_with("settings-") && file_name_str.ends_with(".json") {
            let channel_name = file_name_str
                .strip_prefix("settings-")
                .and_then(|s| s.strip_suffix(".json"))
                .unwrap_or("")
                .to_string();
            
            if let Ok(content) = fs::read_to_string(entry.path()) {
                if let Ok(mut config) = serde_json::from_str::<ChannelConfig>(&content) {
                    if let Ok(metadata) = entry.metadata() {
                        if let Ok(modified) = metadata.modified() {
                            if let Ok(duration) = modified.duration_since(std::time::UNIX_EPOCH) {
                                config.mtime = Some(duration.as_millis() as i64);
                            }
                        }
                    }
                    channels.insert(channel_name, config);
                }
            }
        }
    }
    
    Ok(channels)
}

// ==================== Droid 渠道管理 ====================

#[derive(Debug, Serialize, Deserialize, Clone)]
struct DroidChannel {
    name: String,
    api_key: String,
}

#[tauri::command]
fn get_current_factory_api_key() -> ApiResponse<String> {
    // 优先从当前进程的环境变量获取
    if let Ok(key) = std::env::var("FACTORY_API_KEY") {
        if !key.is_empty() {
            return ApiResponse {
                success: true,
                error: None,
                channels: None,
                config: None,
                data: Some(key),
            };
        }
    }
    
    // 如果进程环境变量为空，尝试从注册表读取用户环境变量
    #[cfg(target_os = "windows")]
    {
        use std::process::Command;
        use std::os::windows::process::CommandExt;
        const CREATE_NO_WINDOW: u32 = 0x08000000;
        
        if let Ok(output) = Command::new("powershell")
            .args(&["-Command", "[Environment]::GetEnvironmentVariable('FACTORY_API_KEY', 'User')"])
            .creation_flags(CREATE_NO_WINDOW)
            .output()
        {
            if output.status.success() {
                let key = String::from_utf8_lossy(&output.stdout).trim().to_string();
                if !key.is_empty() {
                    // 同步到当前进程的环境变量
                    std::env::set_var("FACTORY_API_KEY", &key);
                    return ApiResponse {
                        success: true,
                        error: None,
                        channels: None,
                        config: None,
                        data: Some(key),
                    };
                }
            }
        }
    }
    
    ApiResponse {
        success: true,
        error: None,
        channels: None,
        config: None,
        data: Some(String::new()),
    }
}

#[tauri::command]
async fn get_droid_channels(config_path: String) -> ApiResponse<Vec<DroidChannel>> {
    let key_file_path = Path::new(&config_path).join("key.txt");
    
    if !key_file_path.exists() {
        return ApiResponse {
            success: true,
            error: None,
            channels: None,
            config: None,
            data: Some(vec![]),
        };
    }
    
    match fs::read_to_string(&key_file_path) {
        Ok(content) => {
            let channels: Vec<DroidChannel> = content
                .lines()
                .filter(|line| !line.trim().is_empty())
                .filter_map(|line| {
                    // 移除可能存在的 [active] 标记
                    let line_clean = line.trim().trim_end_matches("[active]").trim();
                    let parts: Vec<&str> = line_clean.splitn(2, ' ').collect();
                    if parts.len() == 2 {
                        Some(DroidChannel {
                            name: parts[0].trim().to_string(),
                            api_key: parts[1].trim().to_string(),
                        })
                    } else {
                        None
                    }
                })
                .collect();
            
            ApiResponse {
                success: true,
                error: None,
                channels: None,
                config: None,
                data: Some(channels),
            }
        },
        Err(e) => ApiResponse {
            success: false,
            error: Some(e.to_string()),
            channels: None,
            config: None,
            data: None,
        },
    }
}

#[tauri::command]
async fn switch_droid_channel(api_key: String) -> ApiResponse<()> {
    // 设置当前进程的环境变量（子进程会继承）
    std::env::set_var("FACTORY_API_KEY", &api_key);

    // 设置用户级别环境变量（写入注册表，新终端可用）
    #[cfg(target_os = "windows")]
    {
        use std::process::Command;
        use std::os::windows::process::CommandExt;
        const CREATE_NO_WINDOW: u32 = 0x08000000;
        
        let ps_command = format!(
            "[Environment]::SetEnvironmentVariable('FACTORY_API_KEY', '{}', 'User')",
            api_key.replace("'", "''")
        );
        
        if let Err(e) = Command::new("powershell")
            .args(&["-Command", &ps_command])
            .creation_flags(CREATE_NO_WINDOW)
            .output()
        {
            return ApiResponse::error(format!("设置环境变量失败: {}", e));
        }
    }

    ApiResponse::success()
}

#[tauri::command]
async fn save_droid_channel(
    config_path: String,
    name: String,
    api_key: String,
    old_name: String,
) -> ApiResponse<()> {
    let key_file_path = Path::new(&config_path).join("key.txt");
    
    let mut channels: Vec<DroidChannel> = if key_file_path.exists() {
        match fs::read_to_string(&key_file_path) {
            Ok(content) => content
                .lines()
                .filter(|line| !line.trim().is_empty())
                .filter_map(|line| {
                    let line_clean = line.trim().trim_end_matches("[active]").trim();
                    let parts: Vec<&str> = line_clean.splitn(2, ' ').collect();
                    if parts.len() == 2 {
                        Some(DroidChannel {
                            name: parts[0].trim().to_string(),
                            api_key: parts[1].trim().to_string(),
                        })
                    } else {
                        None
                    }
                })
                .collect(),
            Err(_) => vec![],
        }
    } else {
        vec![]
    };
    
    if !old_name.is_empty() {
        // 编辑模式：在原位置更新
        if let Some(pos) = channels.iter().position(|c| c.name == old_name) {
            // 检查新名称是否与其他渠道重复
            if old_name != name && channels.iter().any(|c| c.name == name) {
                return ApiResponse::error("渠道名称已存在".to_string());
            }
            channels[pos] = DroidChannel { name, api_key };
        } else {
            return ApiResponse::error("渠道不存在".to_string());
        }
    } else {
        // 新增模式：检查名称是否已存在
        if channels.iter().any(|c| c.name == name) {
            return ApiResponse::error("渠道名称已存在".to_string());
        }
        // 在顶部插入新渠道
        channels.insert(0, DroidChannel { name, api_key });
    }
    
    // 写回文件
    let content: String = channels
        .iter()
        .map(|c| format!("{} {}", c.name, c.api_key))
        .collect::<Vec<_>>()
        .join("\n");
    
    match fs::write(&key_file_path, content) {
        Ok(_) => ApiResponse::success(),
        Err(e) => ApiResponse::error(e.to_string()),
    }
}

#[tauri::command]
async fn delete_droid_channel(config_path: String, name: String) -> ApiResponse<()> {
    let key_file_path = Path::new(&config_path).join("key.txt");
    
    if !key_file_path.exists() {
        return ApiResponse::error("配置文件不存在".to_string());
    }
    
    match fs::read_to_string(&key_file_path) {
        Ok(content) => {
            let channels: Vec<String> = content
                .lines()
                .filter(|line| !line.trim().is_empty())
                .filter(|line| {
                    let parts: Vec<&str> = line.splitn(2, ' ').collect();
                    parts.len() != 2 || parts[0].trim() != name
                })
                .map(|s| s.to_string())
                .collect();
            
            let new_content = channels.join("\n");
            
            match fs::write(&key_file_path, new_content) {
                Ok(_) => ApiResponse::success(),
                Err(e) => ApiResponse::error(e.to_string()),
            }
        },
        Err(e) => ApiResponse::error(e.to_string()),
    }
}

fn main() {
    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_dialog::init())
        .invoke_handler(tauri::generate_handler![
            get_channels,
            get_active_channel,
            save_channel,
            delete_channel,
            switch_channel,
            launch_claude,
            get_home_dir,
            window_minimize,
            window_maximize,
            window_unmaximize,
            window_close,
            window_is_maximized,
            query_balance,
            // Droid 渠道管理
            get_droid_channels,
            get_current_factory_api_key,
            switch_droid_channel,
            save_droid_channel,
            delete_droid_channel,
            launch_droid,
            // StatusLine 管理
            get_statusline_files,
            read_statusline_file,
            save_statusline_file,
            delete_statusline_file,
            apply_statusline_to_settings
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

#[tauri::command]
async fn query_balance(url: String, method: String, token: String) -> ApiResponse<String> {
    let final_url = url.replace("{key}", &token);
    let client = reqwest::Client::new();

    let request = match method.to_uppercase().as_str() {
        "GET" => client.get(&final_url),
        _ => client.post(&final_url),
    };

    match request.send().await {
        Ok(resp) => match resp.text().await {
            Ok(text) => ApiResponse {
                success: true,
                error: None,
                channels: None,
                config: None,
                data: Some(text),
            },
            Err(e) => ApiResponse {
                success: false,
                error: Some(format!("读取响应失败: {}", e)),
                channels: None,
                config: None,
                data: None,
            },
        },
        Err(e) => ApiResponse {
            success: false,
            error: Some(format!("请求失败: {}", e)),
            channels: None,
            config: None,
            data: None,
        },
    }
}

#[tauri::command]
fn get_home_dir() -> Result<String, String> {
    match std::env::var("USERPROFILE").or_else(|_| std::env::var("HOME")) {
        Ok(home) => Ok(home),
        Err(_) => Err("Failed to get home directory".to_string()),
    }
}

#[tauri::command]
async fn window_minimize(window: tauri::Window) -> Result<(), String> {
    window.minimize().map_err(|e| e.to_string())
}

#[tauri::command]
async fn window_maximize(window: tauri::Window) -> Result<(), String> {
    window.maximize().map_err(|e| e.to_string())
}

#[tauri::command]
async fn window_unmaximize(window: tauri::Window) -> Result<(), String> {
    window.unmaximize().map_err(|e| e.to_string())
}

#[tauri::command]
async fn window_close(window: tauri::Window) -> Result<(), String> {
    window.close().map_err(|e| e.to_string())
}

#[tauri::command]
async fn window_is_maximized(window: tauri::Window) -> Result<bool, String> {
    window.is_maximized().map_err(|e| e.to_string())
}

// ==================== StatusLine 管理 ====================

#[derive(Debug, Serialize, Deserialize)]
struct StatuslineFile {
    name: String,
    file_name: String,
    path: String,
    modified: i64,
}

#[tauri::command]
async fn get_statusline_files() -> ApiResponse<Vec<StatuslineFile>> {
    let home_dir = match std::env::var("USERPROFILE").or_else(|_| std::env::var("HOME")) {
        Ok(home) => home,
        Err(_) => {
            return ApiResponse {
                success: true,
                error: None,
                channels: None,
                config: None,
                data: Some(vec![]),
            };
        }
    };

    let statusline_dir = Path::new(&home_dir).join(".claude").join("statusline");

    if !statusline_dir.exists() {
        if let Err(e) = fs::create_dir_all(&statusline_dir) {
            return ApiResponse {
                success: false,
                error: Some(format!("Failed to create statusline directory: {}", e)),
                channels: None,
                config: None,
                data: Some(vec![]),
            };
        }
        return ApiResponse {
            success: true,
            error: None,
            channels: None,
            config: None,
            data: Some(vec![]),
        };
    }

    let mut files = Vec::new();

    let entries = match fs::read_dir(&statusline_dir) {
        Ok(e) => e,
        Err(_) => {
            return ApiResponse {
                success: true,
                error: None,
                channels: None,
                config: None,
                data: Some(vec![]),
            };
        }
    };

    for entry in entries.flatten() {
        let path = entry.path();
        if path.extension().and_then(|s| s.to_str()) != Some("ps1") {
            continue;
        }

        let file_name = path.file_name()
            .and_then(|s| s.to_str())
            .unwrap_or("")
            .to_string();

        // 提取显示名：先尝试移除 statusline_ 前缀和 .ps1 后缀
        // 如果不匹配，只移除 .ps1 后缀
        let name = file_name
            .strip_prefix("statusline_")
            .and_then(|s| s.strip_suffix(".ps1"))
            .or_else(|| file_name.strip_suffix(".ps1"))
            .unwrap_or(&file_name)
            .to_string();

        let modified = entry.metadata()
            .and_then(|m| m.modified())
            .ok()
            .and_then(|t| t.duration_since(std::time::UNIX_EPOCH).ok())
            .map(|d| d.as_secs() as i64)
            .unwrap_or(0);

        files.push(StatuslineFile {
            name,
            file_name,
            path: path.to_string_lossy().to_string(),
            modified,
        });
    }

    files.sort_by(|a, b| b.modified.cmp(&a.modified));

    ApiResponse {
        success: true,
        error: None,
        channels: None,
        config: None,
        data: Some(files),
    }
}

#[tauri::command]
async fn read_statusline_file(file_name: String) -> ApiResponse<String> {
    let home_dir = match std::env::var("USERPROFILE").or_else(|_| std::env::var("HOME")) {
        Ok(home) => home,
        Err(_) => {
            return ApiResponse {
                success: false,
                error: Some("Failed to get home directory".to_string()),
                channels: None,
                config: None,
                data: None,
            };
        }
    };

    let file_path = Path::new(&home_dir)
        .join(".claude")
        .join("statusline")
        .join(&file_name);

    if !file_path.exists() {
        return ApiResponse {
            success: false,
            error: Some("File not found".to_string()),
            channels: None,
            config: None,
            data: None,
        };
    }

    match fs::read_to_string(&file_path) {
        Ok(content) => ApiResponse {
            success: true,
            error: None,
            channels: None,
            config: None,
            data: Some(content),
        },
        Err(e) => ApiResponse {
            success: false,
            error: Some(format!("Failed to read file: {}", e)),
            channels: None,
            config: None,
            data: None,
        },
    }
}

#[tauri::command]
async fn save_statusline_file(file_name: String, content: String) -> ApiResponse<()> {
    let home_dir = match std::env::var("USERPROFILE").or_else(|_| std::env::var("HOME")) {
        Ok(home) => home,
        Err(_) => {
            return ApiResponse {
                success: false,
                error: Some("Failed to get home directory".to_string()),
                channels: None,
                config: None,
                data: None,
            };
        }
    };

    let statusline_dir = Path::new(&home_dir).join(".claude").join("statusline");

    if !statusline_dir.exists() {
        if let Err(e) = fs::create_dir_all(&statusline_dir) {
            return ApiResponse {
                success: false,
                error: Some(format!("Failed to create statusline directory: {}", e)),
                channels: None,
                config: None,
                data: None,
            };
        }
    }

    let file_path = statusline_dir.join(&file_name);

    // 使用 UTF-8 BOM 编码写入文件
    // UTF-8 BOM 是 0xEF, 0xBB, 0xBF
    let mut file = match fs::File::create(&file_path) {
        Ok(f) => f,
        Err(e) => {
            return ApiResponse {
                success: false,
                error: Some(format!("Failed to create file: {}", e)),
                channels: None,
                config: None,
                data: None,
            };
        }
    };

    // 写入 UTF-8 BOM
    if let Err(e) = file.write_all(&[0xEF, 0xBB, 0xBF]) {
        return ApiResponse {
            success: false,
            error: Some(format!("Failed to write BOM: {}", e)),
            channels: None,
            config: None,
            data: None,
        };
    }

    // 写入内容
    match file.write_all(content.as_bytes()) {
        Ok(_) => ApiResponse::success(),
        Err(e) => ApiResponse {
            success: false,
            error: Some(format!("Failed to write content: {}", e)),
            channels: None,
            config: None,
            data: None,
        },
    }
}

#[tauri::command]
async fn delete_statusline_file(file_name: String) -> ApiResponse<()> {
    let home_dir = match std::env::var("USERPROFILE").or_else(|_| std::env::var("HOME")) {
        Ok(home) => home,
        Err(_) => {
            return ApiResponse {
                success: false,
                error: Some("Failed to get home directory".to_string()),
                channels: None,
                config: None,
                data: None,
            };
        }
    };

    let file_path = Path::new(&home_dir)
        .join(".claude")
        .join("statusline")
        .join(&file_name);

    if file_path.exists() {
        match fs::remove_file(&file_path) {
            Ok(_) => ApiResponse::success(),
            Err(e) => ApiResponse {
                success: false,
                error: Some(format!("Failed to delete file: {}", e)),
                channels: None,
                config: None,
                data: None,
            },
        }
    } else {
        ApiResponse::success()
    }
}

#[tauri::command]
async fn apply_statusline_to_settings(file_name: String) -> ApiResponse<()> {
    let home_dir = match std::env::var("USERPROFILE").or_else(|_| std::env::var("HOME")) {
        Ok(home) => home,
        Err(_) => {
            return ApiResponse {
                success: false,
                error: Some("Failed to get home directory".to_string()),
                channels: None,
                config: None,
                data: None,
            };
        }
    };

    let claude_dir = Path::new(&home_dir).join(".claude");
    let settings_path = claude_dir.join("settings.json");

    let ps1_full_path = claude_dir.join("statusline").join(&file_name);
    // 路径不需要双重转义，serde_json 会自动处理
    let ps1_path_str = ps1_full_path.to_string_lossy().to_string();
    let command = format!("powershell -NoProfile -ExecutionPolicy Bypass -File {}", ps1_path_str);

    let mut settings_json: serde_json::Value = if settings_path.exists() {
        match fs::read_to_string(&settings_path) {
            Ok(content) => {
                match serde_json::from_str(&content) {
                    Ok(v) => v,
                    Err(_) => serde_json::json!({})
                }
            }
            Err(_) => serde_json::json!({})
        }
    } else {
        serde_json::json!({})
    };

    if let Some(obj) = settings_json.as_object_mut() {
        // 使用正确的对象格式
        obj.insert("statusLine".to_string(), serde_json::json!({
            "type": "command",
            "command": command
        }));
    }

    let updated_content = match serde_json::to_string_pretty(&settings_json) {
        Ok(json) => json,
        Err(e) => {
            return ApiResponse {
                success: false,
                error: Some(format!("Failed to serialize settings: {}", e)),
                channels: None,
                config: None,
                data: None,
            };
        }
    };

    match fs::write(&settings_path, updated_content) {
        Ok(_) => ApiResponse::success(),
        Err(e) => ApiResponse {
            success: false,
            error: Some(format!("Failed to write settings.json: {}", e)),
            channels: None,
            config: None,
            data: None,
        },
    }
}
