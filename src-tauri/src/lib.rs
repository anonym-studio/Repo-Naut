pub mod commands;
pub mod models;
pub mod store;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .invoke_handler(tauri::generate_handler![
            // Workspace
            commands::workspace::scan_workspace,
            commands::workspace::add_workspace,
            commands::workspace::remove_workspace,
            commands::workspace::set_active_workspace,
            // Repository & Git
            commands::git::get_repo_detail,
            commands::git::update_repo_meta,
            commands::git::git_pull,
            commands::git::git_fetch,
            commands::git::git_checkout,
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
            commands::github::save_pat,
            commands::github::delete_pat,
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
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
