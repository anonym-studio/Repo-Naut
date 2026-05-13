// Tauri v2では lib.rs にエントリポイントを記述し、main.rs から呼び出す
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

fn main() {
    repohub_lib::run()
}
