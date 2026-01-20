use serde::{Deserialize, Serialize};
use std::process::Stdio;
use std::collections::HashMap;
use tauri::Emitter;
use tauri::Manager;
use tokio::io::{AsyncBufReadExt, BufReader};
use tokio::process::Command;
use std::path::PathBuf;

#[derive(Clone, Serialize, Deserialize)]
pub struct ClaudeResponse {
    pub content: String,
    pub is_complete: bool,
    #[serde(default)]
    pub thinking: Option<String>,
    #[serde(default)]
    pub tokens_used: Option<u64>,
}

#[derive(Clone, Serialize, Deserialize)]
pub struct IntegrationConfig {
    pub id: String,
    pub name: String,
    #[serde(rename = "type")]
    pub integration_type: String,
    pub server_command: Option<String>,
    pub server_args: Option<Vec<String>>,
    pub env_variable: Option<String>,
    pub api_key: Option<String>,
}

#[derive(Serialize)]
struct McpServerConfig {
    command: String,
    args: Vec<String>,
}

#[derive(Serialize)]
struct McpConfig {
    #[serde(rename = "mcpServers")]
    mcp_servers: HashMap<String, McpServerConfig>,
}

fn get_data_path(app: &tauri::AppHandle) -> Result<PathBuf, String> {
    let app_data = app.path().app_data_dir().map_err(|e| e.to_string())?;
    Ok(app_data.join("data.json"))
}

#[derive(Clone, Serialize, Deserialize)]
pub struct DirEntry {
    pub name: String,
    pub path: String,
    pub is_dir: bool,
}

#[tauri::command]
async fn list_directory(path: String) -> Result<Vec<DirEntry>, String> {
    let mut entries = Vec::new();
    let mut read_dir = tokio::fs::read_dir(&path).await.map_err(|e| e.to_string())?;

    while let Some(entry) = read_dir.next_entry().await.map_err(|e| e.to_string())? {
        let name = entry.file_name().to_string_lossy().to_string();
        // Skip hidden files
        if name.starts_with('.') {
            continue;
        }
        let metadata = entry.metadata().await.map_err(|e| e.to_string())?;
        entries.push(DirEntry {
            name,
            path: entry.path().to_string_lossy().to_string(),
            is_dir: metadata.is_dir(),
        });
    }

    // Sort: directories first, then alphabetically
    entries.sort_by(|a, b| {
        match (a.is_dir, b.is_dir) {
            (true, false) => std::cmp::Ordering::Less,
            (false, true) => std::cmp::Ordering::Greater,
            _ => a.name.to_lowercase().cmp(&b.name.to_lowercase()),
        }
    });

    Ok(entries)
}

#[tauri::command]
async fn get_home_dir() -> Result<String, String> {
    dirs::home_dir()
        .map(|p| p.to_string_lossy().to_string())
        .ok_or_else(|| "Could not find home directory".to_string())
}

#[tauri::command]
async fn save_data(app: tauri::AppHandle, data: String) -> Result<(), String> {
    let path = get_data_path(&app)?;

    // Ensure directory exists
    if let Some(parent) = path.parent() {
        tokio::fs::create_dir_all(parent).await.map_err(|e| e.to_string())?;
    }

    tokio::fs::write(&path, data).await.map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
async fn load_data(app: tauri::AppHandle) -> Result<Option<String>, String> {
    let path = get_data_path(&app)?;

    if !path.exists() {
        return Ok(None);
    }

    let data = tokio::fs::read_to_string(&path).await.map_err(|e| e.to_string())?;
    Ok(Some(data))
}

#[tauri::command]
fn greet(name: &str) -> String {
    format!("Hello, {}! You've been greeted from Rust!", name)
}

#[tauri::command]
async fn send_to_claude(
    app: tauri::AppHandle,
    conversation_id: String,
    message: String,
    system_prompt: Option<String>,
    working_directory: Option<String>,
    integrations: Option<Vec<IntegrationConfig>>,
    continue_conversation: Option<bool>,
) -> Result<String, String> {
    let mut cmd = Command::new("claude");

    // Continue the conversation if requested
    if continue_conversation.unwrap_or(false) {
        cmd.arg("--continue");
    }

    if let Some(prompt) = system_prompt {
        cmd.arg("--system-prompt").arg(prompt);
    }

    // Set working directory
    let work_dir = working_directory.clone();
    if let Some(ref dir) = work_dir {
        cmd.current_dir(dir);
    }

    // Handle integrations
    let mut temp_mcp_config_path: Option<PathBuf> = None;
    let mut has_api_key_integrations = false;

    if let Some(ref ints) = integrations {
        // Collect MCP integrations for config file
        let mut mcp_servers: HashMap<String, McpServerConfig> = HashMap::new();

        for int in ints {
            match int.integration_type.as_str() {
                "mcp" => {
                    if let (Some(cmd_str), Some(args)) = (&int.server_command, &int.server_args) {
                        mcp_servers.insert(int.id.clone(), McpServerConfig {
                            command: cmd_str.clone(),
                            args: args.clone(),
                        });
                    }
                }
                "api-key" => {
                    // Set environment variable for API key integrations
                    if let (Some(env_var), Some(api_key)) = (&int.env_variable, &int.api_key) {
                        if !api_key.is_empty() {
                            cmd.env(env_var, api_key);
                            has_api_key_integrations = true;
                        }
                    }
                }
                _ => {}
            }
        }

        // Write MCP config to temp file
        // If we have MCP integrations, include them
        // If we only have API key integrations, pass empty config to override global MCP settings
        if !mcp_servers.is_empty() || has_api_key_integrations {
            let mcp_config = McpConfig { mcp_servers };
            let config_json = serde_json::to_string_pretty(&mcp_config)
                .map_err(|e| format!("Failed to serialize MCP config: {}", e))?;

            // Create temp file in working directory or temp dir
            let temp_dir = work_dir.as_ref()
                .map(PathBuf::from)
                .unwrap_or_else(std::env::temp_dir);

            let config_path = temp_dir.join(format!(".claude-quest-mcp-{}.json", conversation_id));
            tokio::fs::write(&config_path, &config_json).await
                .map_err(|e| format!("Failed to write MCP config: {}", e))?;

            cmd.arg("--mcp-config").arg(&config_path);
            temp_mcp_config_path = Some(config_path);
        }
    }

    // Create inline settings JSON to allow all tools
    let settings_json = r#"{"permissions":{"allow":["Bash(*)","Read(*)","Write(*)","Edit(*)","WebFetch(*)"],"deny":[]}}"#;

    cmd.arg("--print")
       .arg("--output-format").arg("stream-json")
       .arg("--verbose")
       .arg("--permission-mode").arg("bypassPermissions")
       .arg("--settings").arg(settings_json)
       .arg(&message)
       .stdout(Stdio::piped())
       .stderr(Stdio::piped());

    let mut child = cmd.spawn().map_err(|e| format!("Failed to spawn claude: {}", e))?;

    let stdout = child.stdout.take().ok_or("Failed to capture stdout")?;
    let stderr = child.stderr.take();
    let mut reader = BufReader::new(stdout).lines();

    // Spawn a task to read stderr for debugging
    let stderr_handle = if let Some(stderr) = stderr {
        Some(tokio::spawn(async move {
            let mut stderr_reader = BufReader::new(stderr).lines();
            let mut stderr_output = String::new();
            while let Ok(Some(line)) = stderr_reader.next_line().await {
                stderr_output.push_str(&line);
                stderr_output.push('\n');
            }
            stderr_output
        }))
    } else {
        None
    };

    let mut full_response = String::new();
    let mut total_tokens: u64 = 0;

    while let Some(line) = reader.next_line().await.map_err(|e| e.to_string())? {
        // Parse JSON line
        if let Ok(json) = serde_json::from_str::<serde_json::Value>(&line) {
            let msg_type = json.get("type").and_then(|t| t.as_str()).unwrap_or("");

            match msg_type {
                "assistant" => {
                    // Extract text content from assistant message
                    if let Some(message) = json.get("message") {
                        if let Some(content) = message.get("content").and_then(|c| c.as_array()) {
                            for item in content {
                                if let Some(item_type) = item.get("type").and_then(|t| t.as_str()) {
                                    match item_type {
                                        "text" => {
                                            if let Some(text) = item.get("text").and_then(|t| t.as_str()) {
                                                full_response.push_str(text);
                                                let _ = app.emit(&format!("claude-response-{}", conversation_id), ClaudeResponse {
                                                    content: text.to_string(),
                                                    is_complete: false,
                                                    thinking: None,
                                                    tokens_used: None,
                                                });
                                            }
                                        }
                                        "thinking" => {
                                            if let Some(thinking) = item.get("thinking").and_then(|t| t.as_str()) {
                                                let _ = app.emit(&format!("claude-response-{}", conversation_id), ClaudeResponse {
                                                    content: String::new(),
                                                    is_complete: false,
                                                    thinking: Some(thinking.to_string()),
                                                    tokens_used: None,
                                                });
                                            }
                                        }
                                        "tool_use" => {
                                            // Show tool usage as thinking
                                            let tool_name = item.get("name").and_then(|n| n.as_str()).unwrap_or("tool");
                                            let thinking_msg = format!("Using {}...", tool_name);
                                            let _ = app.emit(&format!("claude-response-{}", conversation_id), ClaudeResponse {
                                                content: String::new(),
                                                is_complete: false,
                                                thinking: Some(thinking_msg),
                                                tokens_used: None,
                                            });
                                        }
                                        _ => {}
                                    }
                                }
                            }
                        }
                    }
                }
                "result" => {
                    // Final result - extract the result text if we didn't get it from streaming
                    if full_response.is_empty() {
                        if let Some(result) = json.get("result").and_then(|r| r.as_str()) {
                            full_response = result.to_string();
                        }
                    }
                    // Extract token usage - try different possible locations
                    if let Some(usage) = json.get("usage") {
                        if let Some(total) = usage.get("total_tokens").and_then(|t| t.as_u64()) {
                            total_tokens = total;
                        } else {
                            // Sum input and output tokens if total not available
                            let input = usage.get("input_tokens").and_then(|t| t.as_u64()).unwrap_or(0);
                            let output = usage.get("output_tokens").and_then(|t| t.as_u64()).unwrap_or(0);
                            total_tokens = input + output;
                        }
                    }
                    // Also check total_cost_usd path for token info
                    if total_tokens == 0 {
                        if let Some(stats) = json.get("stats") {
                            let input = stats.get("input_tokens").and_then(|t| t.as_u64()).unwrap_or(0);
                            let output = stats.get("output_tokens").and_then(|t| t.as_u64()).unwrap_or(0);
                            total_tokens = input + output;
                        }
                    }
                }
                _ => {}
            }
        }
    }

    let status = child.wait().await.map_err(|e| e.to_string())?;

    // Get stderr output for debugging
    let stderr_output = if let Some(handle) = stderr_handle {
        handle.await.unwrap_or_default()
    } else {
        String::new()
    };

    // Cleanup temp MCP config file
    if let Some(path) = temp_mcp_config_path {
        let _ = tokio::fs::remove_file(path).await;
    }

    if !status.success() {
        let err_msg = if stderr_output.is_empty() {
            format!("Claude exited with status: {}", status)
        } else {
            format!("Claude exited with status: {}. Stderr: {}", status, stderr_output)
        };
        return Err(err_msg);
    }

    let _ = app.emit(&format!("claude-response-{}", conversation_id), ClaudeResponse {
        content: String::new(),
        is_complete: true,
        thinking: None,
        tokens_used: if total_tokens > 0 { Some(total_tokens) } else { None },
    });

    Ok(full_response.trim().to_string())
}

#[derive(Clone, Serialize)]
pub struct ShellOutput {
    pub stdout: String,
    pub stderr: String,
    pub exit_code: i32,
}

#[tauri::command]
async fn run_shell_command(
    command: String,
    working_directory: Option<String>,
) -> Result<ShellOutput, String> {
    let mut cmd = Command::new("sh");
    cmd.arg("-c").arg(&command);

    if let Some(dir) = working_directory {
        cmd.current_dir(dir);
    }

    cmd.stdout(Stdio::piped()).stderr(Stdio::piped());

    let output = cmd.output().await.map_err(|e| format!("Failed to execute command: {}", e))?;

    Ok(ShellOutput {
        stdout: String::from_utf8_lossy(&output.stdout).to_string(),
        stderr: String::from_utf8_lossy(&output.stderr).to_string(),
        exit_code: output.status.code().unwrap_or(-1),
    })
}

#[tauri::command]
async fn check_claude_installed() -> Result<bool, String> {
    let output = Command::new("which")
        .arg("claude")
        .output()
        .await
        .map_err(|e| e.to_string())?;

    Ok(output.status.success())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_dialog::init())
        .invoke_handler(tauri::generate_handler![
            greet,
            send_to_claude,
            check_claude_installed,
            run_shell_command,
            save_data,
            load_data,
            list_directory,
            get_home_dir
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
