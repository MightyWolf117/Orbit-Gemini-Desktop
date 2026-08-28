#![cfg_attr(
    all(not(debug_assertions), target_os = "windows"),
    windows_subsystem = "windows"
)]

use serde::{Deserialize, Serialize};
use std::fs;
use std::path::PathBuf;
use tauri::AppHandle;
use tauri::api::process::Command;

#[derive(Serialize, Deserialize, Clone, Default)]
struct PathConfig {
    base_path: Option<String>,
}

#[derive(Serialize, Deserialize, Clone, Default)]
struct BgConfig {
    path: Option<String>,
    blur: u8,
    opacity: u8,
}

#[derive(Serialize, Deserialize, Clone, Default)]
struct WslConfig {
    enabled: bool,
}

#[derive(Serialize, Deserialize)]
struct Config {
    openai_api_key: String,
    gemini_api_key: String,
    anthropic_api_key: String,
    ai_model: String,
    temperature: String,
}

#[derive(Serialize, Deserialize)]
struct ChatMessage {
    id: i64,
    sender: String,
    sender_name: Option<String>,
    text: String,
    timestamp: i64,
}

#[derive(Serialize, Deserialize, Clone, Default)]
struct IconConfig {
    user_icon_path: Option<String>,
    user_icon_pos_x: i32,
    user_icon_pos_y: i32,
    ai_icon_path: Option<String>,
    ai_icon_pos_x: i32,
    ai_icon_pos_y: i32,
    icon_color: Option<String>,
    google_api_key: Option<String>,
}

#[derive(Serialize, Deserialize, Clone, Default)]
struct ApiConfig {
    google_api_key: Option<String>,
    enable_system_integration: Option<bool>,
}

fn get_default_app_data_dir(app_handle: &AppHandle) -> Result<PathBuf, String> {
    tauri::api::path::app_local_data_dir(&app_handle.config())
        .ok_or_else(|| "No se pudo obtener el directorio de datos de la app".into())
}

fn get_app_data_dir(app_handle: &AppHandle) -> Result<PathBuf, String> {
    let mut config_path = get_default_app_data_dir(app_handle)?;
    config_path.push("config");
    config_path.push("path_settings.json");

    if config_path.exists() {
        if let Ok(content) = fs::read_to_string(&config_path) {
            if let Ok(config) = serde_json::from_str::<PathConfig>(&content) {
                if let Some(path_str) = config.base_path {
                    if !path_str.trim().is_empty() {
                        return Ok(PathBuf::from(path_str));
                    }
                }
            }
        }
    }
    
    get_default_app_data_dir(app_handle)
}

#[tauri::command]
fn save_path_config(app_handle: AppHandle, config: PathConfig) -> Result<(), String> {
    let mut config_path = get_default_app_data_dir(&app_handle)?;
    config_path.push("config");
    fs::create_dir_all(&config_path).map_err(|e| e.to_string())?;

    config_path.push("path_settings.json");
    let config_json = serde_json::to_string_pretty(&config).map_err(|e| e.to_string())?;
    fs::write(config_path, config_json).map_err(|e| e.to_string())?;

    Ok(())
}

#[tauri::command]
fn load_path_config(app_handle: AppHandle) -> Result<PathConfig, String> {
    let mut config_path = get_default_app_data_dir(&app_handle)?;
    config_path.push("config");
    config_path.push("path_settings.json");

    if config_path.exists() {
        if let Ok(content) = fs::read_to_string(&config_path) {
            if let Ok(config) = serde_json::from_str::<PathConfig>(&content) {
                return Ok(config);
            }
        }
    }
    
    Ok(PathConfig { base_path: None })
}

#[tauri::command]
fn get_current_base_path(app_handle: AppHandle) -> Result<String, String> {
    let dir = get_app_data_dir(&app_handle)?;
    Ok(dir.to_string_lossy().to_string())
}

#[tauri::command]
fn save_wsl_config(app_handle: AppHandle, config: WslConfig) -> Result<(), String> {
    let mut config_path = get_app_data_dir(&app_handle)?;
    config_path.push("config");
    fs::create_dir_all(&config_path).map_err(|e| e.to_string())?;

    config_path.push("wsl_settings.json");
    let config_json = serde_json::to_string_pretty(&config).map_err(|e| e.to_string())?;
    fs::write(config_path, config_json).map_err(|e| e.to_string())?;

    Ok(())
}

#[tauri::command]
fn load_wsl_config(app_handle: AppHandle) -> Result<WslConfig, String> {
    let mut config_path = get_app_data_dir(&app_handle)?;
    config_path.push("config");
    config_path.push("wsl_settings.json");

    if config_path.exists() {
        if let Ok(content) = fs::read_to_string(&config_path) {
            if let Ok(config) = serde_json::from_str::<WslConfig>(&content) {
                return Ok(config);
            }
        }
    }
    
    Ok(WslConfig { enabled: false })
}

#[tauri::command]
fn save_api_config(app_handle: AppHandle, config: ApiConfig) -> Result<(), String> {
    let mut config_path = get_app_data_dir(&app_handle)?;
    config_path.push("config");
    fs::create_dir_all(&config_path).map_err(|e| e.to_string())?;

    config_path.push("api_settings.json");
    let config_json = serde_json::to_string_pretty(&config).map_err(|e| e.to_string())?;
    fs::write(config_path, config_json).map_err(|e| e.to_string())?;

    Ok(())
}

#[tauri::command]
fn load_api_config(app_handle: AppHandle) -> Result<ApiConfig, String> {
    let mut config_path = get_app_data_dir(&app_handle)?;
    config_path.push("config");
    config_path.push("api_settings.json");

    if config_path.exists() {
        if let Ok(content) = fs::read_to_string(&config_path) {
            if let Ok(config) = serde_json::from_str::<ApiConfig>(&content) {
                return Ok(config);
            }
        }
    }
    
    Ok(ApiConfig { google_api_key: None, enable_system_integration: Some(false) })
}

#[tauri::command]
fn save_bg_config(app_handle: AppHandle, config: BgConfig) -> Result<(), String> {
    let mut config_path = get_app_data_dir(&app_handle)?;
    config_path.push("config");
    fs::create_dir_all(&config_path).map_err(|e| e.to_string())?;

    config_path.push("background_settings.json");
    let config_json = serde_json::to_string_pretty(&config).map_err(|e| e.to_string())?;
    fs::write(config_path, config_json).map_err(|e| e.to_string())?;

    Ok(())
}

#[tauri::command]
fn load_bg_config(app_handle: AppHandle) -> Result<BgConfig, String> {
    let mut config_path = get_app_data_dir(&app_handle)?;
    config_path.push("config");
    config_path.push("background_settings.json");

    if config_path.exists() {
        let content = fs::read_to_string(config_path).map_err(|e| e.to_string())?;
        let config: BgConfig = serde_json::from_str(&content).map_err(|e| e.to_string())?;
        Ok(config)
    } else {
        Ok(BgConfig {
            path: None,
            blur: 0,
            opacity: 100,
        })
    }
}

#[tauri::command]
fn save_background_image(
    app_handle: AppHandle,
    image_bytes: Vec<u8>,
    extension: String,
) -> Result<String, String> {
    if image_bytes.len() > 50 * 1024 * 1024 {
        return Err("La imagen excede el límite de 50MB".into());
    }

    let mut bg_dir = get_app_data_dir(&app_handle)?;
    bg_dir.push("assets");
    bg_dir.push("backgrounds");

    fs::create_dir_all(&bg_dir).map_err(|e| e.to_string())?;

    let filename = format!("current_bg.{}", extension);
    bg_dir.push(&filename);

    fs::write(&bg_dir, image_bytes).map_err(|e| e.to_string())?;
    Ok(bg_dir.to_string_lossy().to_string())
}

#[tauri::command]
fn save_icon_config(app_handle: AppHandle, config: IconConfig) -> Result<(), String> {
    let mut config_path = get_app_data_dir(&app_handle)?;
    config_path.push("config");
    fs::create_dir_all(&config_path).map_err(|e| e.to_string())?;

    config_path.push("icon_settings.json");
    let config_json = serde_json::to_string_pretty(&config).map_err(|e| e.to_string())?;
    fs::write(config_path, config_json).map_err(|e| e.to_string())?;

    Ok(())
}

#[tauri::command]
fn load_icon_config(app_handle: AppHandle) -> Result<IconConfig, String> {
    let mut config_path = get_app_data_dir(&app_handle)?;
    config_path.push("config");
    config_path.push("icon_settings.json");

    if config_path.exists() {
        let content = fs::read_to_string(config_path).map_err(|e| e.to_string())?;
        let config: IconConfig = serde_json::from_str(&content).map_err(|e| e.to_string())?;
        Ok(config)
    } else {
        Ok(IconConfig {
            user_icon_path: None,
            user_icon_pos_x: 50,
            user_icon_pos_y: 50,
            ai_icon_path: None,
            ai_icon_pos_x: 50,
            ai_icon_pos_y: 50,
            icon_color: None,
            google_api_key: None,
        })
    }
}

#[tauri::command]
fn save_icon_image(
    app_handle: AppHandle,
    image_bytes: Vec<u8>,
    extension: String,
    icon_type: String, // "user" o "ai"
) -> Result<String, String> {
    // 5 MB check para iconos
    if image_bytes.len() > 5 * 1024 * 1024 {
        return Err("La imagen del ícono excede el límite de 5MB".into());
    }

    let mut icon_dir = get_app_data_dir(&app_handle)?;
    icon_dir.push("assets");
    icon_dir.push("icons");

    fs::create_dir_all(&icon_dir).map_err(|e| e.to_string())?;

    let filename = format!("{}_icon.{}", icon_type, extension);
    icon_dir.push(&filename);

    fs::write(&icon_dir, image_bytes).map_err(|e| e.to_string())?;
    Ok(icon_dir.to_string_lossy().to_string())
}

#[tauri::command]
fn save_personality_image(
    app_handle: AppHandle,
    image_bytes: Vec<u8>,
    filename: String,
) -> Result<String, String> {
    if image_bytes.len() > 5 * 1024 * 1024 {
        return Err("La imagen excede el límite de 5MB".into());
    }

    let mut dir = get_app_data_dir(&app_handle)?;
    dir.push("assets");
    dir.push("personalities");

    fs::create_dir_all(&dir).map_err(|e| e.to_string())?;
    dir.push(&filename);

    fs::write(&dir, image_bytes).map_err(|e| e.to_string())?;
    Ok(filename)
}

#[tauri::command]
fn get_personality_image_path(
    app_handle: AppHandle,
    filename: String,
) -> Result<String, String> {
    let mut dir = get_app_data_dir(&app_handle)?;
    dir.push("assets");
    dir.push("personalities");
    dir.push(&filename);
    
    Ok(dir.to_string_lossy().to_string())
}

#[tauri::command]
fn save_chat_message(
    app_handle: AppHandle,
    chat_code: i64,
    message_order: i32,
    message: ChatMessage,
) -> Result<(), String> {
    let mut dir = get_app_data_dir(&app_handle)?;
    dir.push("assets");
    dir.push("chats");
    dir.push(chat_code.to_string());

    fs::create_dir_all(&dir).map_err(|e| e.to_string())?;

    let filename = format!("{}.json", message_order);
    dir.push(&filename);

    let json_data = serde_json::to_string(&message).map_err(|e| e.to_string())?;
    fs::write(&dir, json_data).map_err(|e| e.to_string())?;

    Ok(())
}

#[tauri::command]
fn get_chat_messages(
    app_handle: AppHandle,
    chat_code: i64,
) -> Result<Vec<ChatMessage>, String> {
    let mut dir = get_app_data_dir(&app_handle)?;
    dir.push("assets");
    dir.push("chats");
    dir.push(chat_code.to_string());

    let mut messages = Vec::new();

    if dir.exists() && dir.is_dir() {
        let entries = fs::read_dir(&dir).map_err(|e| e.to_string())?;
        
        let mut files: Vec<(i32, std::path::PathBuf)> = Vec::new();

        for entry in entries {
            if let Ok(entry) = entry {
                let path = entry.path();
                if path.extension().and_then(|e| e.to_str()) == Some("json") {
                    if let Some(stem) = path.file_stem().and_then(|s| s.to_str()) {
                        if let Ok(order) = stem.parse::<i32>() {
                            files.push((order, path));
                        }
                    }
                }
            }
        }

        files.sort_by_key(|k| k.0);

        for (_, path) in files {
            if let Ok(content) = fs::read_to_string(&path) {
                if let Ok(msg) = serde_json::from_str::<ChatMessage>(&content) {
                    messages.push(msg);
                }
            }
        }
    }

    Ok(messages)
}

#[tauri::command]
fn delete_local_chat(
    app_handle: AppHandle,
    chat_code: i64,
) -> Result<(), String> {
    let mut dir = get_app_data_dir(&app_handle)?;
    dir.push("assets");
    dir.push("chats");
    dir.push(chat_code.to_string());

    if dir.exists() {
        fs::remove_dir_all(&dir).map_err(|e| e.to_string())?;
    }
    
    Ok(())
}

#[tauri::command]
fn export_text_file(
    app_handle: AppHandle,
    filename: String,
    content: String,
) -> Result<String, String> {
    let mut dir = get_app_data_dir(&app_handle)?;
    dir.push("assets");
    dir.push("files");
    
    fs::create_dir_all(&dir).map_err(|e| e.to_string())?;
    
    dir.push(&filename);
    fs::write(&dir, content).map_err(|e| e.to_string())?;
    
    let mut parent = dir.clone();
    parent.pop();
    Ok(parent.to_string_lossy().to_string())
}

#[tauri::command]
fn open_folder(path: String) -> Result<(), String> {
    #[cfg(target_os = "windows")]
    std::process::Command::new("explorer").arg(&path).spawn().map_err(|e| e.to_string())?;
    
    #[cfg(target_os = "macos")]
    std::process::Command::new("open").arg(&path).spawn().map_err(|e| e.to_string())?;
    
    #[cfg(target_os = "linux")]
    std::process::Command::new("xdg-open").arg(&path).spawn().map_err(|e| e.to_string())?;
    
    Ok(())
}

#[tauri::command]
fn execute_wsl_code(app_handle: AppHandle, code: String, lang: String) -> Result<String, String> {
    let (ext, cmd) = match lang.to_lowercase().as_str() {
        "python" | "py" => ("py", "python3"),
        "javascript" | "js" | "node" => ("js", "node"),
        "bash" | "sh" | "shell" => ("sh", "bash"),
        _ => return Err("Idioma no soportado para ejecución automática en WSL".into()),
    };

    let mut temp_dir = get_app_data_dir(&app_handle)?;
    temp_dir.push("assets");
    temp_dir.push("files");
    fs::create_dir_all(&temp_dir).map_err(|e| e.to_string())?;

    let filename = format!("temp_exec_{}.{}", chrono::Utc::now().timestamp_millis(), ext);
    let mut temp_file = temp_dir.clone();
    temp_file.push(&filename);

    fs::write(&temp_file, code).map_err(|e| e.to_string())?;

    let output = std::process::Command::new("wsl")
        .arg(cmd)
        .arg(&filename)
        .current_dir(&temp_dir)
        .output()
        .map_err(|e| format!("Error al ejecutar WSL: {}", e))?;

    let stdout = String::from_utf8_lossy(&output.stdout).to_string();
    let stderr = String::from_utf8_lossy(&output.stderr).to_string();

    let mut full_output = String::new();
    if !stdout.is_empty() {
        full_output.push_str(&stdout);
    }
    if !stderr.is_empty() {
        if !full_output.is_empty() {
            full_output.push_str("\n--- Errores ---\n");
        }
        full_output.push_str(&stderr);
    }
    
    if full_output.is_empty() {
        full_output = "Ejecución finalizada sin salida.".to_string();
    }

    Ok(full_output)
}
#[derive(Serialize)]
struct WslStatus {
    installed: bool,
    has_distro: bool,
    default_distro: Option<String>,
}

#[tauri::command]
fn check_wsl_installed() -> WslStatus {
    #[cfg(target_os = "windows")]
    {
        match std::process::Command::new("wsl").arg("-l").arg("-q").output() {
            Ok(output) => {
                if output.status.success() {
                    let clean_str: String = output.stdout.into_iter()
                        .filter(|&b| b != 0 && b != 0xFF && b != 0xFE && b != b'\r')
                        .map(|b| b as char)
                        .collect();
                    let default_distro = clean_str.lines().next().map(|s| s.trim().to_string()).filter(|s| !s.is_empty());
                    WslStatus {
                        installed: true,
                        has_distro: true,
                        default_distro,
                    }
                } else {
                    WslStatus {
                        installed: true,
                        has_distro: false,
                        default_distro: None,
                    }
                }
            }
            Err(_) => WslStatus {
                installed: false,
                has_distro: false,
                default_distro: None,
            },
        }
    }
    
    #[cfg(not(target_os = "windows"))]
    {
        WslStatus {
            installed: false,
            has_distro: false,
            default_distro: None,
        }
    }
}
#[tauri::command]
fn open_wsl_cmd(app_handle: AppHandle, code: String, lang: String) -> Result<(), String> {
    let (ext, cmd) = match lang.to_lowercase().as_str() {
        "python" | "py" => ("py", "python3"),
        "javascript" | "js" | "node" => ("js", "node"),
        "bash" | "sh" | "shell" => ("sh", "bash"),
        _ => return Err("Idioma no soportado para ejecución automática en WSL".into()),
    };

    let mut temp_dir = get_app_data_dir(&app_handle)?;
    temp_dir.push("assets");
    temp_dir.push("files");
    fs::create_dir_all(&temp_dir).map_err(|e| e.to_string())?;

    let filename = format!("temp_cmd_{}.{}", chrono::Utc::now().timestamp_millis(), ext);
    let mut temp_file = temp_dir.clone();
    temp_file.push(&filename);

    fs::write(&temp_file, code).map_err(|e| e.to_string())?;

    let wsl_args = format!("wsl {} {}", cmd, filename);

    #[cfg(target_os = "windows")]
    {
        std::process::Command::new("cmd")
            .args(&["/C", "start", "cmd", "/K", &wsl_args])
            .current_dir(&temp_dir)
            .spawn()
            .map_err(|e| format!("Error al abrir CMD: {}", e))?;
    }
    
    #[cfg(not(target_os = "windows"))]
    {
        return Err("Esta función solo está disponible en Windows (WSL)".into());
    }

    Ok(())
}

#[derive(Serialize, Deserialize, Clone)]
struct Personality {
    id: i64,
    created_at: String,
    nombre: String,
    descripcion_corta: String,
    instrucciones: String,
    image: Option<String>,
    enable_system_tools: Option<bool>,
}

#[derive(Serialize, Deserialize, Clone)]
struct Historial {
    id: i64,
    created_at: String,
    nombre: String,
    code: i64,
    is_group_chat: Option<bool>,
    personality_ids: Option<Vec<String>>,
    room_context: Option<String>,
    max_auto_replies: Option<i32>,
    project_id: Option<String>,
    project_context: Option<String>,
}

#[tauri::command]
fn get_personalities(app_handle: AppHandle) -> Result<Vec<Personality>, String> {
    let mut dir = get_app_data_dir(&app_handle)?;
    dir.push("assets");
    dir.push("personalities");
    fs::create_dir_all(&dir).map_err(|e| e.to_string())?;
    
    dir.push("personalities.json");
    if dir.exists() {
        let content = fs::read_to_string(dir).map_err(|e| e.to_string())?;
        if let Ok(data) = serde_json::from_str::<Vec<Personality>>(&content) {
            return Ok(data);
        }
    }
    Ok(Vec::new())
}

#[tauri::command]
fn save_personality(app_handle: AppHandle, personality: Personality) -> Result<Personality, String> {
    let mut dir = get_app_data_dir(&app_handle)?;
    dir.push("assets");
    dir.push("personalities");
    fs::create_dir_all(&dir).map_err(|e| e.to_string())?;
    
    dir.push("personalities.json");
    let mut personalities = Vec::new();
    if dir.exists() {
        let content = fs::read_to_string(&dir).map_err(|e| e.to_string())?;
        if let Ok(data) = serde_json::from_str::<Vec<Personality>>(&content) {
            personalities = data;
        }
    }

    let mut new_pers = personality.clone();
    if new_pers.id == 0 {
        let max_id = personalities.iter().map(|p| p.id).max().unwrap_or(0);
        new_pers.id = max_id + 1;
        new_pers.created_at = chrono::Utc::now().to_rfc3339();
        personalities.push(new_pers.clone());
    } else {
        if let Some(p) = personalities.iter_mut().find(|p| p.id == new_pers.id) {
            p.nombre = new_pers.nombre.clone();
            p.descripcion_corta = new_pers.descripcion_corta.clone();
            p.instrucciones = new_pers.instrucciones.clone();
            p.image = new_pers.image.clone();
            p.enable_system_tools = new_pers.enable_system_tools;
            new_pers = p.clone();
        } else {
            return Err("Personality not found".into());
        }
    }

    let json_data = serde_json::to_string_pretty(&personalities).map_err(|e| e.to_string())?;
    fs::write(&dir, json_data).map_err(|e| e.to_string())?;
    Ok(new_pers)
}

#[tauri::command]
fn delete_personality(app_handle: AppHandle, id: i64) -> Result<(), String> {
    let mut dir = get_app_data_dir(&app_handle)?;
    dir.push("assets");
    dir.push("personalities");
    fs::create_dir_all(&dir).map_err(|e| e.to_string())?;
    
    dir.push("personalities.json");
    if dir.exists() {
        let content = fs::read_to_string(&dir).map_err(|e| e.to_string())?;
        if let Ok(mut data) = serde_json::from_str::<Vec<Personality>>(&content) {
            data.retain(|p| p.id != id);
            let json_data = serde_json::to_string_pretty(&data).map_err(|e| e.to_string())?;
            fs::write(&dir, json_data).map_err(|e| e.to_string())?;
        }
    }
    Ok(())
}

#[tauri::command]
fn get_historials(app_handle: AppHandle) -> Result<Vec<Historial>, String> {
    let mut dir = get_app_data_dir(&app_handle)?;
    dir.push("assets");
    dir.push("chats");
    fs::create_dir_all(&dir).map_err(|e| e.to_string())?;
    
    dir.push("historial.json");
    if dir.exists() {
        let content = fs::read_to_string(dir).map_err(|e| e.to_string())?;
        if let Ok(data) = serde_json::from_str::<Vec<Historial>>(&content) {
            return Ok(data);
        }
    }
    Ok(Vec::new())
}

#[tauri::command]
fn save_historial(app_handle: AppHandle, historial: Historial) -> Result<Historial, String> {
    let mut dir = get_app_data_dir(&app_handle)?;
    dir.push("assets");
    dir.push("chats");
    fs::create_dir_all(&dir).map_err(|e| e.to_string())?;
    
    dir.push("historial.json");
    let mut historials = Vec::new();
    if dir.exists() {
        let content = fs::read_to_string(&dir).map_err(|e| e.to_string())?;
        if let Ok(data) = serde_json::from_str::<Vec<Historial>>(&content) {
            historials = data;
        }
    }

    let mut new_hist = historial.clone();
    if new_hist.id == 0 {
        let max_id = historials.iter().map(|p| p.id).max().unwrap_or(0);
        new_hist.id = max_id + 1;
        new_hist.created_at = chrono::Utc::now().to_rfc3339();
        historials.push(new_hist.clone());
    } else {
        if let Some(p) = historials.iter_mut().find(|p| p.id == new_hist.id) {
            p.nombre = new_hist.nombre.clone();
            p.code = new_hist.code;
            p.is_group_chat = new_hist.is_group_chat.clone();
            p.personality_ids = new_hist.personality_ids.clone();
            p.room_context = new_hist.room_context.clone();
            p.max_auto_replies = new_hist.max_auto_replies;
            p.project_id = new_hist.project_id.clone();
            p.project_context = new_hist.project_context.clone();
            new_hist = p.clone();
        } else {
            return Err("Historial not found".into());
        }
    }

    historials.sort_by(|a, b| b.id.cmp(&a.id));

    let json_data = serde_json::to_string_pretty(&historials).map_err(|e| e.to_string())?;
    fs::write(&dir, json_data).map_err(|e| e.to_string())?;
    Ok(new_hist)
}

#[tauri::command]
fn delete_historial(app_handle: AppHandle, id: i64) -> Result<(), String> {
    let mut dir = get_app_data_dir(&app_handle)?;
    dir.push("assets");
    dir.push("chats");
    fs::create_dir_all(&dir).map_err(|e| e.to_string())?;
    
    dir.push("historial.json");
    if dir.exists() {
        let content = fs::read_to_string(&dir).map_err(|e| e.to_string())?;
        if let Ok(mut data) = serde_json::from_str::<Vec<Historial>>(&content) {
            data.retain(|h| h.id != id);
            let json_data = serde_json::to_string_pretty(&data).map_err(|e| e.to_string())?;
            fs::write(&dir, json_data).map_err(|e| e.to_string())?;
        }
    }
    Ok(())
}

#[derive(Serialize, Deserialize, Clone)]
struct DiskInfo {
    name: String,
    total_space: u64,
    available_space: u64,
    file_system: String,
    mount_point: String,
}

#[tauri::command]
fn get_disk_usage() -> Vec<DiskInfo> {
    use sysinfo::Disks;
    let disks = Disks::new_with_refreshed_list();
    let mut result = Vec::new();
    for disk in disks.list() {
        result.push(DiskInfo {
            name: disk.name().to_string_lossy().into_owned(),
            total_space: disk.total_space(),
            available_space: disk.available_space(),
            file_system: disk.file_system().to_string_lossy().into_owned(),
            mount_point: disk.mount_point().to_string_lossy().into_owned(),
        });
    }
    result
}

#[tauri::command]
fn get_large_apps() -> Result<String, String> {
    let output = std::process::Command::new("powershell")
        .args(&[
            "-NoProfile",
            "-Command",
            "Get-ItemProperty HKLM:\\Software\\Microsoft\\Windows\\CurrentVersion\\Uninstall\\*, HKLM:\\Software\\Wow6432Node\\Microsoft\\Windows\\CurrentVersion\\Uninstall\\* | Select-Object DisplayName, EstimatedSize | Where-Object { $_.EstimatedSize -gt 0 -and $_.DisplayName -ne $null } | Sort-Object EstimatedSize -Descending | Select-Object -First 20 | ConvertTo-Json"
        ])
        .output()
        .map_err(|e| e.to_string())?;

    String::from_utf8(output.stdout).map_err(|e| e.to_string())
}

fn main() {
    tauri::Builder::default()
        .setup(|app| {
            #[cfg(not(debug_assertions))]
            {
                match Command::new_sidecar("orbit-api") {
                    Ok(cmd) => {
                        match cmd.spawn() {
                            Ok((mut rx, mut _child)) => {
                                tauri::async_runtime::spawn(async move {
                                    while let Some(event) = rx.recv().await {
                                        println!("API: {:?}", event);
                                    }
                                });
                            }
                            Err(e) => println!("Failed to spawn sidecar: {}", e),
                        }
                    }
                    Err(e) => println!("Failed to find sidecar: {}", e),
                }
            }

            let data_dir = tauri::api::path::app_local_data_dir(&app.config());
            if let Some(mut path) = data_dir {
                path.push("config");
                let _ = fs::create_dir_all(&path);

                path.pop();
                path.push("assets");
                path.push("backgrounds");
                let _ = fs::create_dir_all(&path);

                path.pop();
                path.push("icons");
                let _ = fs::create_dir_all(&path);

                path.pop();
                path.push("personalities");
                let _ = fs::create_dir_all(&path);

                path.pop();
                path.push("chats");
                let _ = fs::create_dir_all(&path);

                path.pop();
                path.push("files");
                let _ = fs::create_dir_all(&path);
            }
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            save_bg_config,
            load_bg_config,
            save_background_image,
            save_icon_config,
            load_icon_config,
            save_api_config,
            load_api_config,
            save_icon_image,
            save_personality_image,
            get_personality_image_path,
            save_chat_message,
            get_chat_messages,
            delete_local_chat,
            save_path_config,
            load_path_config,
            get_current_base_path,
            export_text_file,
            open_folder,
            get_personalities,
            save_personality,
            delete_personality,
            get_historials,
            save_historial,
            delete_historial,
            save_wsl_config,
            load_wsl_config,
            execute_wsl_code,
            open_wsl_cmd,
            check_wsl_installed,
            get_disk_usage,
            get_large_apps
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
