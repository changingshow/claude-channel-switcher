// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use std::collections::HashMap;
use std::fs;
use std::path::Path;
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
    
    match fs::copy(&source_path, &target_path) {
        Ok(_) => ApiResponse::success(),
        Err(e) => ApiResponse::error(e.to_string()),
    }
}

#[tauri::command]
async fn launch_claude(terminal: String, terminal_dir: String) -> ApiResponse<()> {
    use std::process::Command;

    #[cfg(target_os = "windows")]
    use std::os::windows::process::CommandExt;

    if terminal == "wt" {
        if !check_windows_terminal_installed() {
            return ApiResponse::error(
                "Windows Terminal 未安装。请从 Microsoft Store 安装 Windows Terminal，或选择其他终端。".to_string()
            );
        }
    }

    let result = if cfg!(target_os = "windows") {
        #[cfg(target_os = "windows")]
        const CREATE_NO_WINDOW: u32 = 0x08000000;

        match terminal.as_str() {
            "wt" => {
                Command::new("wt")
                    .arg("-d")
                    .arg(&terminal_dir)
                    .arg("pwsh")
                    .arg("-NoExit")
                    .arg("-Command")
                    .arg("claude")
                    .creation_flags(CREATE_NO_WINDOW)
                    .spawn()
            },
            "powershell" | "pwsh" => {
                let escaped_dir = terminal_dir.replace("'", "''");
                Command::new("cmd")
                    .args(&[
                        "/C",
                        "start",
                        "\"\"",
                        &terminal,
                        "-NoExit",
                        "-Command",
                        &format!("Set-Location '{}'; claude", escaped_dir)
                    ])
                    .creation_flags(CREATE_NO_WINDOW)
                    .spawn()
            },
            "cmd" => {
                Command::new("cmd")
                    .args(&[
                        "/C",
                        "start",
                        "\"\"",
                        "cmd",
                        "/k",
                        &format!("cd /d \"{}\" && claude", terminal_dir)
                    ])
                    .creation_flags(CREATE_NO_WINDOW)
                    .spawn()
            },
            _ => {
                let escaped_dir = terminal_dir.replace("'", "''");
                Command::new("cmd")
                    .args(&[
                        "/C",
                        "start",
                        "\"\"",
                        &terminal,
                        "-NoExit",
                        "-Command",
                        &format!("Set-Location '{}'; claude", escaped_dir)
                    ])
                    .creation_flags(CREATE_NO_WINDOW)
                    .spawn()
            }
        }
    } else {
        Command::new(&terminal)
            .arg("-c")
            .arg(&format!("cd '{}' && claude", terminal_dir))
            .spawn()
    };

    match result {
        Ok(_) => ApiResponse::success(),
        Err(e) => ApiResponse::error(e.to_string()),
    }
}

fn check_windows_terminal_installed() -> bool {
    if cfg!(target_os = "windows") {
        use std::process::Command;

        #[cfg(target_os = "windows")]
        use std::os::windows::process::CommandExt;

        #[cfg(target_os = "windows")]
        const CREATE_NO_WINDOW: u32 = 0x08000000;

        if let Ok(output) = Command::new("where")
            .arg("wt")
            .creation_flags(CREATE_NO_WINDOW)
            .output() {
            return output.status.success() && !output.stdout.is_empty();
        }
    }
    false
}

#[tauri::command]
async fn check_terminal_available(terminal: String) -> ApiResponse<bool> {
    let available = match terminal.as_str() {
        "wt" => check_windows_terminal_installed(),
        _ => true,
    };

    ApiResponse {
        success: true,
        error: None,
        channels: None,
        config: None,
        data: Some(available),
    }
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

#[tauri::command]
async fn launch_droid(terminal: String, terminal_dir: String) -> ApiResponse<()> {
    use std::process::Command;

    #[cfg(target_os = "windows")]
    use std::os::windows::process::CommandExt;

    if terminal == "wt" {
        if !check_windows_terminal_installed() {
            return ApiResponse::error(
                "Windows Terminal 未安装。请从 Microsoft Store 安装 Windows Terminal，或选择其他终端。".to_string()
            );
        }
    }

    let result = if cfg!(target_os = "windows") {
        #[cfg(target_os = "windows")]
        const CREATE_NO_WINDOW: u32 = 0x08000000;

        let escaped_dir = terminal_dir.replace("'", "''");

        match terminal.as_str() {
            "wt" => {
                Command::new("wt")
                    .arg("-d")
                    .arg(&terminal_dir)
                    .arg("pwsh")
                    .arg("-NoExit")
                    .arg("-Command")
                    .arg("droid")
                    .creation_flags(CREATE_NO_WINDOW)
                    .spawn()
            },
            "powershell" | "pwsh" => {
                Command::new(&terminal)
                    .current_dir(&terminal_dir)
                    .arg("-NoExit")
                    .arg("-Command")
                    .arg(format!("Set-Location '{}'; droid", escaped_dir))
                    .spawn()
            },
            "cmd" => {
                Command::new("cmd")
                    .current_dir(&terminal_dir)
                    .arg("/k")
                    .arg("droid")
                    .spawn()
            },
            _ => {
                Command::new(&terminal)
                    .current_dir(&terminal_dir)
                    .arg("-NoExit")
                    .arg("-Command")
                    .arg(format!("Set-Location '{}'; droid", escaped_dir))
                    .spawn()
            }
        }
    } else {
        Command::new(&terminal)
            .arg("-c")
            .arg(&format!("cd '{}' && droid", terminal_dir))
            .spawn()
    };

    match result {
        Ok(_) => ApiResponse::success(),
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
            check_terminal_available,
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
            launch_droid
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

#[tauri::command]
async fn query_balance(url: String, method: String, token: String) -> ApiResponse<String> {
    let final_url = url.replace("{apikey}", &token);
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
