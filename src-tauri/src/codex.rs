use crate::{open_terminal, ApiResponse};
use reqwest::Url;
use serde::{Deserialize, Serialize};
use std::fs;
use std::path::{Path, PathBuf};
use std::time::{SystemTime, UNIX_EPOCH};
use toml::{Table as TomlTable, Value as TomlValue};

const CODEX_STORE_VERSION: u32 = 1;
const CODEX_STORE_FILE_NAME: &str = "channels.json";

#[derive(Debug, Serialize, Deserialize, Clone, PartialEq, Eq)]
pub(crate) struct CodexChannel {
    name: String,
    baseurl: String,
    apikey: String,
    model: String,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
struct CodexChannelStore {
    #[serde(default = "codex_store_version")]
    version: u32,
    #[serde(default)]
    channels: Vec<CodexChannel>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub(crate) struct CodexActiveInfo {
    api_key: String,
    base_url: String,
    model: String,
    model_provider: String,
}

fn find_target_provider_name(root: &TomlTable) -> Option<String> {
    let providers = root.get("model_providers").and_then(TomlValue::as_table);

    if let Some(provider_name) = root
        .get("model_provider")
        .and_then(TomlValue::as_str)
        .map(str::trim)
        .filter(|name| !name.is_empty())
    {
        if providers
            .map(|table| table.contains_key(provider_name))
            .unwrap_or(false)
        {
            return Some(provider_name.to_string());
        }
    }

    if let Some(table) = providers {
        if table.contains_key("OpenAI") {
            return Some("OpenAI".to_string());
        }

        if table.len() == 1 {
            return table.keys().next().cloned();
        }
    }

    None
}

fn codex_store_version() -> u32 {
    CODEX_STORE_VERSION
}

fn default_codex_store() -> CodexChannelStore {
    CodexChannelStore {
        version: CODEX_STORE_VERSION,
        channels: vec![],
    }
}

fn codex_store_path(dir: &Path) -> PathBuf {
    dir.join(CODEX_STORE_FILE_NAME)
}

fn normalize_loaded_channel(channel: CodexChannel) -> CodexChannel {
    CodexChannel {
        name: channel.name.trim().to_string(),
        baseurl: normalize_codex_baseurl(&channel.baseurl)
            .unwrap_or_else(|_| channel.baseurl.trim().to_string()),
        apikey: channel.apikey.trim().to_string(),
        model: channel.model.trim().to_string(),
    }
}

fn normalize_codex_channel(channel: CodexChannel) -> Result<CodexChannel, String> {
    Ok(CodexChannel {
        name: channel.name.trim().to_string(),
        baseurl: normalize_codex_baseurl(&channel.baseurl)?,
        apikey: channel.apikey.trim().to_string(),
        model: channel.model.trim().to_string(),
    })
}

fn is_valid_codex_name(name: &str) -> bool {
    !name.is_empty()
        && name.len() <= 18
        && name
            .chars()
            .all(|ch| ch.is_ascii_alphanumeric() || ch == '-' || ch == '_')
}

fn normalize_codex_baseurl(baseurl: &str) -> Result<String, String> {
    let trimmed = baseurl.trim();
    let mut url = Url::parse(trimmed)
        .map_err(|_| "Base URL 格式无效，请输入 http:// 或 https:// 地址".to_string())?;

    if !matches!(url.scheme(), "http" | "https") {
        return Err("Base URL 格式无效，请输入 http:// 或 https:// 地址".to_string());
    }

    url.set_fragment(None);

    let trimmed_path = url.path().trim_end_matches('/').to_string();
    if trimmed_path.is_empty() {
        url.set_path("/");
    } else {
        url.set_path(&trimmed_path);
    }

    let mut normalized = url.to_string();
    if url.query().is_none() && url.path() == "/" && normalized.ends_with('/') {
        normalized.pop();
    }

    Ok(normalized)
}

fn validate_codex_channel(
    channel: &CodexChannel,
    existing: &[CodexChannel],
    edit_index: Option<usize>,
) -> Result<(), String> {
    if !is_valid_codex_name(&channel.name) {
        return Err("渠道名称仅支持英文字母、数字、-、_，最多18位".to_string());
    }
    if channel.baseurl.is_empty() {
        return Err("请输入 Base URL".to_string());
    }
    if channel.apikey.is_empty() {
        return Err("请输入 API Key".to_string());
    }
    if channel.model.is_empty() {
        return Err("请输入模型名称".to_string());
    }

    let duplicate_exists = existing
        .iter()
        .enumerate()
        .any(|(idx, current)| Some(idx) != edit_index && current.name == channel.name);

    if duplicate_exists {
        return Err("渠道名称已存在".to_string());
    }

    Ok(())
}

fn load_codex_store(dir: &Path) -> Result<CodexChannelStore, String> {
    let store_path = codex_store_path(dir);
    if store_path.exists() {
        let content = fs::read_to_string(&store_path)
            .map_err(|e| format!("读取 Codex 存储文件失败: {}", e))?;
        let mut store: CodexChannelStore = serde_json::from_str(&content)
            .map_err(|e| format!("解析 Codex 存储文件失败: {}", e))?;

        if store.version != CODEX_STORE_VERSION {
            return Err(format!("不支持的 Codex 存储版本: {}", store.version));
        }

        store.channels = store
            .channels
            .into_iter()
            .map(normalize_loaded_channel)
            .collect();
        return Ok(store);
    }

    Ok(default_codex_store())
}

fn save_codex_store(dir: &Path, store: &CodexChannelStore) -> Result<(), String> {
    if !dir.exists() {
        fs::create_dir_all(dir).map_err(|e| format!("创建 Codex 目录失败: {}", e))?;
    }

    let serialized =
        serde_json::to_string_pretty(store).map_err(|e| format!("序列化 Codex 存储失败: {}", e))?;
    write_text_file(&codex_store_path(dir), &serialized)?;
    Ok(())
}

fn temp_path_for(target: &Path, suffix: &str) -> Result<PathBuf, String> {
    let parent = target
        .parent()
        .ok_or_else(|| format!("无法获取文件父目录: {}", target.display()))?;
    let file_name = target
        .file_name()
        .and_then(|name| name.to_str())
        .ok_or_else(|| format!("无法获取文件名: {}", target.display()))?;
    let stamp = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap_or_default()
        .as_nanos();

    Ok(parent
        .join(format!(
            ".{}.{}.{}.tmp",
            file_name,
            std::process::id(),
            stamp
        ))
        .with_extension(suffix))
}

fn write_text_file(target: &Path, content: &str) -> Result<(), String> {
    let parent = target
        .parent()
        .ok_or_else(|| format!("无法获取文件父目录: {}", target.display()))?;
    fs::create_dir_all(parent)
        .map_err(|e| format!("创建文件目录失败 {}: {}", parent.display(), e))?;

    let temp_path = temp_path_for(target, "tmp")?;
    fs::write(&temp_path, content)
        .map_err(|e| format!("写入临时文件失败 {}: {}", temp_path.display(), e))?;

    if target.exists() {
        let backup_path = temp_path_for(target, "bak")?;
        fs::rename(target, &backup_path).map_err(|e| {
            let _ = fs::remove_file(&temp_path);
            format!("备份原文件失败 {}: {}", target.display(), e)
        })?;

        if let Err(e) = fs::rename(&temp_path, target) {
            let _ = fs::rename(&backup_path, target);
            let _ = fs::remove_file(&temp_path);
            return Err(format!("替换文件失败 {}: {}", target.display(), e));
        }

        let _ = fs::remove_file(&backup_path);
    } else if let Err(e) = fs::rename(&temp_path, target) {
        let _ = fs::remove_file(&temp_path);
        return Err(format!("写入文件失败 {}: {}", target.display(), e));
    }

    Ok(())
}

fn snapshot_text_file(path: &Path) -> Result<Option<String>, String> {
    if !path.exists() {
        return Ok(None);
    }

    fs::read_to_string(path)
        .map(Some)
        .map_err(|e| format!("读取文件失败 {}: {}", path.display(), e))
}

fn restore_text_snapshot(path: &Path, snapshot: &Option<String>) -> Result<(), String> {
    match snapshot {
        Some(content) => write_text_file(path, content),
        None => {
            if !path.exists() {
                return Ok(());
            }

            if path.is_dir() {
                fs::remove_dir_all(path)
                    .map_err(|e| format!("删除目录失败 {}: {}", path.display(), e))?;
            } else {
                fs::remove_file(path)
                    .map_err(|e| format!("删除文件失败 {}: {}", path.display(), e))?;
            }
            Ok(())
        }
    }
}

fn read_codex_active_info_from_toml(content: &str) -> Result<CodexActiveInfo, String> {
    let root: TomlTable =
        toml::from_str(content).map_err(|e| format!("解析 config.toml 失败: {}", e))?;

    let target_provider_name = find_target_provider_name(&root);
    let raw_base_url = target_provider_name
        .as_ref()
        .and_then(|provider_name| {
            root.get("model_providers")
                .and_then(TomlValue::as_table)
                .and_then(|providers| providers.get(provider_name))
                .and_then(TomlValue::as_table)
                .and_then(|provider| provider.get("base_url"))
                .and_then(TomlValue::as_str)
        })
        .unwrap_or("");

    Ok(CodexActiveInfo {
        api_key: String::new(),
        base_url: normalize_codex_baseurl(raw_base_url)
            .unwrap_or_else(|_| raw_base_url.trim().to_string()),
        model: root
            .get("model")
            .and_then(TomlValue::as_str)
            .unwrap_or("")
            .trim()
            .to_string(),
        model_provider: root
            .get("model_provider")
            .and_then(TomlValue::as_str)
            .unwrap_or("")
            .trim()
            .to_string(),
    })
}

fn update_codex_config_toml(existing: &str, channel: &CodexChannel) -> Result<String, String> {
    let mut root: TomlTable =
        toml::from_str(existing).map_err(|e| format!("解析 config.toml 失败: {}", e))?;
    let target_provider_name = find_target_provider_name(&root)
        .ok_or_else(|| "未找到可更新的 model_providers 配置".to_string())?;

    root.insert(
        "model".to_string(),
        TomlValue::String(channel.model.clone()),
    );

    let providers = root
        .get_mut("model_providers")
        .and_then(TomlValue::as_table_mut)
        .ok_or_else(|| "model_providers 必须是表".to_string())?;
    let provider = providers
        .get_mut(&target_provider_name)
        .and_then(TomlValue::as_table_mut)
        .ok_or_else(|| format!("model_providers.{} 必须是表", target_provider_name))?;
    provider.insert(
        "base_url".to_string(),
        TomlValue::String(channel.baseurl.clone()),
    );

    toml::to_string_pretty(&root).map_err(|e| format!("序列化 config.toml 失败: {}", e))
}

fn update_auth_json(existing: Option<&str>, api_key: &str) -> Result<String, String> {
    let mut auth_json: serde_json::Value = match existing {
        Some(content) => serde_json::from_str(content).unwrap_or_else(|_| serde_json::json!({})),
        None => serde_json::json!({}),
    };

    if !auth_json.is_object() {
        auth_json = serde_json::json!({});
    }

    if let Some(obj) = auth_json.as_object_mut() {
        obj.insert("OPENAI_API_KEY".to_string(), serde_json::json!(api_key));
    }

    serde_json::to_string_pretty(&auth_json).map_err(|e| format!("序列化 auth.json 失败: {}", e))
}

fn find_codex_channel<'a>(channels: &'a [CodexChannel], name: &str) -> Option<&'a CodexChannel> {
    channels.iter().find(|channel| channel.name == name)
}

fn apply_switch_updates(
    config_path: &Path,
    updated_config: &str,
    auth_path: &Path,
    updated_auth: &str,
) -> Result<(), String> {
    apply_switch_updates_with_writer(
        config_path,
        updated_config,
        auth_path,
        updated_auth,
        write_text_file,
    )
}

fn apply_switch_updates_with_writer<F>(
    config_path: &Path,
    updated_config: &str,
    auth_path: &Path,
    updated_auth: &str,
    mut writer: F,
) -> Result<(), String>
where
    F: FnMut(&Path, &str) -> Result<(), String>,
{
    let config_snapshot = snapshot_text_file(config_path)?;
    let auth_snapshot = snapshot_text_file(auth_path)?;

    writer(config_path, updated_config)?;

    if let Err(write_auth_error) = writer(auth_path, updated_auth) {
        let rollback_config = restore_text_snapshot(config_path, &config_snapshot);
        let rollback_auth = restore_text_snapshot(auth_path, &auth_snapshot);

        let mut message = format!("写入 auth.json 失败: {}", write_auth_error);
        if let Err(e) = rollback_config {
            message.push_str(&format!("；回滚 config.toml 失败: {}", e));
        }
        if let Err(e) = rollback_auth {
            message.push_str(&format!("；回滚 auth.json 失败: {}", e));
        }

        return Err(message);
    }

    Ok(())
}

#[tauri::command]
pub(crate) async fn get_codex_channels(
    codex_config_path: String,
) -> ApiResponse<Vec<CodexChannel>> {
    let dir = Path::new(&codex_config_path);

    match load_codex_store(dir) {
        Ok(store) => ApiResponse {
            success: true,
            error: None,
            channels: None,
            config: None,
            data: Some(store.channels),
        },
        Err(e) => ApiResponse {
            success: false,
            error: Some(e),
            channels: None,
            config: None,
            data: None,
        },
    }
}

#[tauri::command]
pub(crate) async fn save_codex_channel(
    codex_config_path: String,
    name: String,
    baseurl: String,
    apikey: String,
    model: String,
    edit_index: i32,
) -> ApiResponse<()> {
    let dir = Path::new(&codex_config_path);
    let mut store = match load_codex_store(dir) {
        Ok(store) => store,
        Err(e) => return ApiResponse::error(e),
    };

    let new_channel = match normalize_codex_channel(CodexChannel {
        name,
        baseurl,
        apikey,
        model,
    }) {
        Ok(channel) => channel,
        Err(e) => return ApiResponse::error(e),
    };
    let edit_index = if edit_index >= 0 {
        Some(edit_index as usize)
    } else {
        None
    };

    if let Err(e) = validate_codex_channel(&new_channel, &store.channels, edit_index) {
        return ApiResponse::error(e);
    }

    if let Some(idx) = edit_index {
        if idx >= store.channels.len() {
            return ApiResponse::error("索引越界".to_string());
        }
        store.channels[idx] = new_channel;
    } else {
        store.channels.insert(0, new_channel);
    }

    match save_codex_store(dir, &store) {
        Ok(_) => ApiResponse::success(),
        Err(e) => ApiResponse::error(e),
    }
}

#[tauri::command]
pub(crate) async fn delete_codex_channel(
    codex_config_path: String,
    delete_index: usize,
) -> ApiResponse<()> {
    let dir = Path::new(&codex_config_path);
    let mut store = match load_codex_store(dir) {
        Ok(store) => store,
        Err(e) => return ApiResponse::error(e),
    };

    if delete_index >= store.channels.len() {
        return ApiResponse::error("索引越界".to_string());
    }

    store.channels.remove(delete_index);

    match save_codex_store(dir, &store) {
        Ok(_) => ApiResponse::success(),
        Err(e) => ApiResponse::error(e),
    }
}

#[tauri::command]
pub(crate) fn get_current_codex_env(codex_config_path: String) -> ApiResponse<CodexActiveInfo> {
    let dir = Path::new(&codex_config_path);
    let mut info = CodexActiveInfo {
        api_key: String::new(),
        base_url: String::new(),
        model: String::new(),
        model_provider: String::new(),
    };

    let config_path = dir.join("config.toml");
    if config_path.exists() {
        if let Ok(content) = fs::read_to_string(&config_path) {
            if let Ok(parsed_info) = read_codex_active_info_from_toml(&content) {
                info = parsed_info;
            }
        }
    }

    let auth_path = dir.join("auth.json");
    if auth_path.exists() {
        if let Ok(content) = fs::read_to_string(&auth_path) {
            if let Ok(json) = serde_json::from_str::<serde_json::Value>(&content) {
                if let Some(key) = json.get("OPENAI_API_KEY").and_then(|v| v.as_str()) {
                    info.api_key = key.trim().to_string();
                }
            }
        }
    }

    ApiResponse {
        success: true,
        error: None,
        channels: None,
        config: None,
        data: Some(info),
    }
}

#[tauri::command]
pub(crate) async fn switch_codex_channel(
    codex_config_path: String,
    channel_name: String,
) -> ApiResponse<()> {
    let dir = Path::new(&codex_config_path);
    let config_path = dir.join("config.toml");
    let auth_path = dir.join("auth.json");

    if !config_path.exists() || !auth_path.exists() {
        return ApiResponse::error("未找到配置文件，请检查Codex路径配置".to_string());
    }

    let store = match load_codex_store(dir) {
        Ok(store) => store,
        Err(e) => return ApiResponse::error(e),
    };

    let Some(channel) = find_codex_channel(&store.channels, channel_name.trim()).cloned() else {
        return ApiResponse::error("未找到指定的 Codex 渠道".to_string());
    };

    let existing_config = match fs::read_to_string(&config_path) {
        Ok(content) => content,
        Err(e) => return ApiResponse::error(format!("读取 config.toml 失败: {}", e)),
    };
    let updated_config = match update_codex_config_toml(&existing_config, &channel) {
        Ok(content) => content,
        Err(e) => return ApiResponse::error(e),
    };

    let existing_auth = match snapshot_text_file(&auth_path) {
        Ok(content) => content,
        Err(e) => return ApiResponse::error(e),
    };
    let updated_auth = match update_auth_json(existing_auth.as_deref(), &channel.apikey) {
        Ok(content) => content,
        Err(e) => return ApiResponse::error(e),
    };

    match apply_switch_updates(&config_path, &updated_config, &auth_path, &updated_auth) {
        Ok(_) => ApiResponse::success(),
        Err(e) => ApiResponse::error(e),
    }
}

#[tauri::command(rename_all = "camelCase")]
pub(crate) async fn launch_codex(terminal_dir: String) -> ApiResponse<()> {
    open_terminal("codex", &terminal_dir)
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::sync::atomic::{AtomicU64, Ordering};

    static NEXT_TEST_ID: AtomicU64 = AtomicU64::new(1);

    fn create_temp_dir(label: &str) -> PathBuf {
        let dir = std::env::temp_dir().join(format!(
            "claude-channel-switcher-codex-{}-{}",
            label,
            NEXT_TEST_ID.fetch_add(1, Ordering::Relaxed)
        ));
        let _ = fs::remove_dir_all(&dir);
        fs::create_dir_all(&dir).expect("failed to create temp dir");
        dir
    }

    #[test]
    fn normalizes_codex_baseurl() {
        assert_eq!(
            normalize_codex_baseurl("https://API.Example.com/").unwrap(),
            "https://api.example.com"
        );
        assert_eq!(
            normalize_codex_baseurl("https://api.example.com/v1/").unwrap(),
            "https://api.example.com/v1"
        );
    }

    #[test]
    fn returns_empty_store_when_json_missing() {
        let dir = create_temp_dir("empty");
        let store = load_codex_store(&dir).unwrap();
        assert_eq!(store.version, CODEX_STORE_VERSION);
        assert!(store.channels.is_empty());
    }

    #[test]
    fn saves_versioned_json_store() {
        let dir = create_temp_dir("save");
        let store = CodexChannelStore {
            version: CODEX_STORE_VERSION,
            channels: vec![CodexChannel {
                name: "main".to_string(),
                baseurl: "https://api.example.com".to_string(),
                apikey: "key-1".to_string(),
                model: "o3".to_string(),
            }],
        };

        save_codex_store(&dir, &store).unwrap();

        let content = fs::read_to_string(codex_store_path(&dir)).unwrap();
        let saved: CodexChannelStore = serde_json::from_str(&content).unwrap();
        assert_eq!(saved.version, CODEX_STORE_VERSION);
        assert_eq!(saved.channels, store.channels);
    }

    #[test]
    fn updates_codex_config_with_structured_toml() {
        let existing = r#"model = "old-model"
base_url = "https://root.example.com"
model_provider = "OpenAI"

[model_providers.OpenAI]
name = "OpenAI"
base_url = "https://old.example.com"
wire_api = "responses"
"#;

        let channel = CodexChannel {
            name: "main".to_string(),
            baseurl: "https://api.example.com".to_string(),
            apikey: "key-1".to_string(),
            model: "o3".to_string(),
        };

        let updated = update_codex_config_toml(existing, &channel).unwrap();
        let root: TomlTable = toml::from_str(&updated).unwrap();
        assert_eq!(root.get("model").and_then(TomlValue::as_str), Some("o3"));
        assert_eq!(
            root.get("base_url").and_then(TomlValue::as_str),
            Some("https://root.example.com")
        );
        assert_eq!(
            root.get("model_provider").and_then(TomlValue::as_str),
            Some("OpenAI")
        );
        let providers = root
            .get("model_providers")
            .and_then(TomlValue::as_table)
            .unwrap();
        assert_eq!(
            providers["OpenAI"]
                .as_table()
                .unwrap()
                .get("wire_api")
                .and_then(TomlValue::as_str),
            Some("responses")
        );
        assert_eq!(
            providers["OpenAI"]
                .as_table()
                .unwrap()
                .get("base_url")
                .and_then(TomlValue::as_str),
            Some("https://api.example.com")
        );
        assert!(providers.get("main").is_none());
    }

    #[test]
    fn validates_duplicate_codex_channel_names() {
        let existing = vec![CodexChannel {
            name: "main".to_string(),
            baseurl: "https://api.example.com".to_string(),
            apikey: "key-1".to_string(),
            model: "o3".to_string(),
        }];

        let duplicate = CodexChannel {
            name: "main".to_string(),
            baseurl: "https://api.other.com".to_string(),
            apikey: "key-2".to_string(),
            model: "o4-mini".to_string(),
        };

        assert_eq!(
            validate_codex_channel(&duplicate, &existing, None).unwrap_err(),
            "渠道名称已存在"
        );
        assert!(validate_codex_channel(&duplicate, &existing, Some(0)).is_ok());
    }

    #[test]
    fn validates_codex_baseurl_format() {
        let invalid = normalize_codex_channel(CodexChannel {
            name: "main".to_string(),
            baseurl: "not-a-url".to_string(),
            apikey: "key-1".to_string(),
            model: "o3".to_string(),
        });

        assert_eq!(
            invalid.unwrap_err(),
            "Base URL 格式无效，请输入 http:// 或 https:// 地址"
        );
    }

    #[test]
    fn rolls_back_config_when_auth_write_fails() {
        let dir = create_temp_dir("rollback");
        let config_path = dir.join("config.toml");
        let auth_path = dir.join("auth.json");
        let old_config = "model = \"old\"\n";
        let old_auth = "{\n  \"OPENAI_API_KEY\": \"old\"\n}";

        fs::write(&config_path, old_config).unwrap();
        fs::write(&auth_path, old_auth).unwrap();

        let result = apply_switch_updates_with_writer(
            &config_path,
            "model = \"new\"\n",
            &auth_path,
            "{\n  \"OPENAI_API_KEY\": \"new\"\n}",
            |path, content| {
                if path == auth_path {
                    return Err("forced auth write failure".to_string());
                }
                fs::write(path, content).map_err(|e| e.to_string())
            },
        );

        assert!(result.is_err());
        assert!(result.unwrap_err().contains("forced auth write failure"));
        assert_eq!(fs::read_to_string(&config_path).unwrap(), old_config);
        assert_eq!(fs::read_to_string(&auth_path).unwrap(), old_auth);
    }

    #[test]
    fn switches_codex_channel_by_name_using_filesystem_state() {
        let dir = create_temp_dir("switch");
        let store = CodexChannelStore {
            version: CODEX_STORE_VERSION,
            channels: vec![CodexChannel {
                name: "main".to_string(),
                baseurl: "https://api.example.com/".to_string(),
                apikey: "key-1".to_string(),
                model: "o3".to_string(),
            }],
        };
        save_codex_store(&dir, &store).unwrap();
        fs::write(
            dir.join("config.toml"),
            r#"model = "old"
base_url = "https://root.example.com"
model_provider = "OpenAI"

[model_providers.OpenAI]
name = "OpenAI"
base_url = "https://old.example.com"
wire_api = "responses"
"#,
        )
        .unwrap();
        fs::write(
            dir.join("auth.json"),
            "{\n  \"OPENAI_API_KEY\": \"old-key\",\n  \"keep\": true\n}",
        )
        .unwrap();

        let result = tokio::runtime::Runtime::new()
            .unwrap()
            .block_on(switch_codex_channel(
                dir.to_string_lossy().to_string(),
                "main".to_string(),
            ));

        assert!(result.success);

        let updated_config = fs::read_to_string(dir.join("config.toml")).unwrap();
        let root: TomlTable = toml::from_str(&updated_config).unwrap();
        assert_eq!(root.get("model").and_then(TomlValue::as_str), Some("o3"));
        assert_eq!(
            root.get("base_url").and_then(TomlValue::as_str),
            Some("https://root.example.com")
        );
        assert_eq!(
            root.get("model_provider").and_then(TomlValue::as_str),
            Some("OpenAI")
        );
        assert_eq!(
            root["model_providers"]["OpenAI"]["wire_api"].as_str(),
            Some("responses")
        );
        assert_eq!(
            root["model_providers"]["OpenAI"]["base_url"].as_str(),
            Some("https://api.example.com")
        );
        assert!(root["model_providers"]
            .as_table()
            .unwrap()
            .get("main")
            .is_none());

        let updated_auth: serde_json::Value =
            serde_json::from_str(&fs::read_to_string(dir.join("auth.json")).unwrap()).unwrap();
        assert_eq!(updated_auth["OPENAI_API_KEY"].as_str(), Some("key-1"));
        assert_eq!(updated_auth["keep"].as_bool(), Some(true));
    }
}
