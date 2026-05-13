use crate::models::{Column, Task};
use crate::store;
use tauri::AppHandle;
use uuid::Uuid;

#[tauri::command]
pub async fn get_tasks(app: AppHandle) -> Result<Vec<Task>, String> {
    let kanban = store::load_kanban(&app)?;
    Ok(kanban.tasks)
}

#[tauri::command]
pub async fn create_task(app: AppHandle, task: serde_json::Value) -> Result<Task, String> {
    let mut kanban = store::load_kanban(&app)?;
    let mut new_task: Task = serde_json::from_value(task).map_err(|e| e.to_string())?;
    new_task.id = Uuid::new_v4().to_string();
    let now = store::iso_now();
    new_task.created_at = now.clone();
    new_task.updated_at = now;
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
    if let Some(task) = kanban.tasks.iter_mut().find(|t| t.id == id) {
        task.column = column;
        task.order = order;
        task.updated_at = store::iso_now();
    }
    store::save_kanban(&app, &kanban)
}
