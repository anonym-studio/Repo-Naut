pub mod command_path;
pub mod commands;
pub mod models;
pub mod store;
pub mod watcher;

use std::sync::Arc;
use tauri::Manager;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    command_path::ensure_gui_path();
    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_dialog::init())
        .setup(|app| {
            app.manage(Arc::new(watcher::WatcherState::new()));
            let handle = app.handle().clone();

            if let Ok(settings) = store::load_settings(&handle) {
                if !settings.active_workspace_id.is_empty() {
                    if let Some(active) = settings
                        .workspaces
                        .iter()
                        .find(|w| w.id == settings.active_workspace_id)
                    {
                        let _ = watcher::start_watching(
                            &handle,
                            active.id.clone(),
                            active.path.clone(),
                        );
                    }
                }
            }
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            // Workspace
            commands::workspace::scan_workspace,
            commands::workspace::add_workspace,
            commands::workspace::remove_workspace,
            commands::workspace::set_active_workspace,
            commands::workspace::set_repo_order,
            // Repository & Git
            commands::git::get_repo_detail,
            commands::git::update_repo_meta,
            commands::git::git_pull,
            commands::git::git_fetch,
            commands::git::git_checkout,
            commands::git::read_readme,
            commands::git::get_commit_activity,
            // Archive
            commands::archive::archive_repo,
            commands::archive::restore_repo,
            // Kanban
            commands::kanban::get_tasks,
            commands::kanban::create_task,
            commands::kanban::update_task,
            commands::kanban::delete_task,
            commands::kanban::move_task,
            // GitHub
            commands::github::get_github_stats,
            commands::github::validate_pat,
            commands::github::validate_stored_pat,
            commands::github::save_pat,
            commands::github::delete_pat,
            commands::github::has_pat,
            // gh CLI
            commands::repo_create::check_gh_auth,
            commands::repo_create::create_repo,
            // Settings & external
            commands::settings::get_settings,
            commands::settings::update_settings,
            commands::settings::open_in_editor,
            commands::settings::add_editor,
            commands::settings::remove_editor,
            commands::settings::set_default_editor,
            commands::settings::open_in_terminal,
            commands::settings::open_url,
            // Custom scripts
            commands::scripts::list_scripts,
            commands::scripts::add_script,
            commands::scripts::remove_script,
            commands::scripts::update_script,
            commands::scripts::run_script,
            // Backup / restore
            commands::backup::export_data,
            commands::backup::preview_backup,
            commands::backup::import_data,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
