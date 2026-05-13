use crate::models::{Column, Priority, Task};
use crate::store;
use serde::Deserialize;
use tauri::AppHandle;
use uuid::Uuid;

#[tauri::command]
pub async fn get_tasks(app: AppHandle) -> Result<Vec<Task>, String> {
    let kanban = store::load_kanban(&app)?;
    Ok(kanban.tasks)
}

/// `create_task` に渡される `NewTask` 形のペイロード。
/// フロント側の `NewTask = Omit<Task, 'id' | 'createdAt' | 'updatedAt'>` と完全に一致させる。
#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
struct NewTaskPayload {
    #[serde(default)]
    repo_id: Option<String>,
    title: String,
    #[serde(default)]
    description: Option<String>,
    column: Column,
    #[serde(default)]
    order: i32,
    priority: Priority,
    #[serde(default)]
    labels: Vec<String>,
    #[serde(default)]
    due_date: Option<String>,
    #[serde(default)]
    commit_sha: Option<String>,
    #[serde(default)]
    pr_url: Option<String>,
}

#[tauri::command]
pub async fn create_task(app: AppHandle, task: serde_json::Value) -> Result<Task, String> {
    let payload: NewTaskPayload = serde_json::from_value(task)
        .map_err(|e| format!("invalid task payload: {}", e))?;
    if payload.title.trim().is_empty() {
        return Err("title is required".to_string());
    }

    let mut kanban = store::load_kanban(&app)?;
    let now = store::iso_now();
    // order が 0（未指定）の場合は同じ column の末尾に積む
    let resolved_order = if payload.order == 0 {
        kanban
            .tasks
            .iter()
            .filter(|t| t.column == payload.column)
            .map(|t| t.order)
            .max()
            .map(|m| m + 1)
            .unwrap_or(1)
    } else {
        payload.order
    };

    let new_task = Task {
        id: Uuid::new_v4().to_string(),
        repo_id: payload.repo_id,
        title: payload.title.trim().to_string(),
        description: payload.description,
        column: payload.column,
        order: resolved_order,
        priority: payload.priority,
        labels: payload.labels,
        due_date: payload.due_date,
        commit_sha: payload.commit_sha,
        pr_url: payload.pr_url,
        created_at: now.clone(),
        updated_at: now,
    };

    kanban.tasks.push(new_task.clone());
    store::save_kanban(&app, &kanban)?;
    Ok(new_task)
}

#[tauri::command]
pub async fn update_task(
    app: AppHandle,
    id: String,
    patch: serde_json::Value,
) -> Result<Task, String> {
    let mut kanban = store::load_kanban(&app)?;
    let task = kanban
        .tasks
        .iter_mut()
        .find(|t| t.id == id)
        .ok_or("task not found")?;

    // patchを既存タスクにマージ
    let mut task_value = serde_json::to_value(&*task).map_err(|e| e.to_string())?;
    if let (serde_json::Value::Object(ref mut base), serde_json::Value::Object(patch_map)) =
        (&mut task_value, patch)
    {
        for (k, v) in patch_map {
            base.insert(k, v);
        }
    }
    *task = serde_json::from_value(task_value).map_err(|e| e.to_string())?;
    task.updated_at = store::iso_now();
    let updated = task.clone();
    store::save_kanban(&app, &kanban)?;
    Ok(updated)
}

#[tauri::command]
pub async fn delete_task(app: AppHandle, id: String) -> Result<(), String> {
    let mut kanban = store::load_kanban(&app)?;
    kanban.tasks.retain(|t| t.id != id);
    store::save_kanban(&app, &kanban)
}

#[tauri::command]
pub async fn move_task(
    app: AppHandle,
    id: String,
    column: Column,
    order: i32,
) -> Result<(), String> {
    let mut kanban = store::load_kanban(&app)?;
    let task = kanban
        .tasks
        .iter_mut()
        .find(|t| t.id == id)
        .ok_or_else(|| format!("task not found: {}", id))?;
    task.column = column;
    task.order = order;
    task.updated_at = store::iso_now();
    store::save_kanban(&app, &kanban)
}
