// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use std::collections::HashMap;
use std::fs;
use std::path::Path;
use serde::{Deserialize, Serialize};

#[derive(Debug, Serialize, Deserialize)]
struct ChannelConfig {
    env: HashMap<String, String>,
    permissions: Permissions,
    #[serde(rename = "alwaysThinkingEnabled")]
    always_thinking_enabled: bool,
    #[serde(skip_serializing_if = "Option::is_none")]
    mtime: Option<i64>,
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
    old_name: String,
) -> ApiResponse<()> {
    let mut env = HashMap::new();
    env.insert("ANTHROPIC_AUTH_TOKEN".to_string(), token);
    env.insert("CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC".to_string(), "1".to_string());
    
    if !url.is_empty() {
        env.insert("ANTHROPIC_BASE_URL".to_string(), url);
    }

    let config = ChannelConfig {
        env,
        permissions: Permissions {
            allow: vec![],
            deny: vec![],
        },
        always_thinking_enabled: true,
        mtime: None,
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
                Command::new("cmd")
                    .args(&[
                        "/C",
                        "start",
                        "wt",
                        "-d",
                        &terminal_dir,
                        "pwsh",
                        "-NoExit",
                        "-Command",
                        "claude"
                    ])
                    .creation_flags(CREATE_NO_WINDOW)
                    .spawn()
            },
            "powershell" | "pwsh" => {
                let escaped_dir = terminal_dir.replace("'", "''");
                Command::new("cmd")
                    .args(&[
                        "/C",
                        "start",
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
            window_is_maximized
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
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
