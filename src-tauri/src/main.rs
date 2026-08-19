// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

//! Backend for ZabbLeaf's Overleaf Git integration.
//!
//! Everything git- and disk-related lives here instead of in the webview:
//! the frontend used to drive `git` through the shell allowlist and touch files
//! through the scoped `fs` API, which made failures silent and directory walks
//! non-recursive. Running it in Rust gives us real errors, recursive reads and
//! full control over the environment `git` is spawned with.
//!
//! Projects live in `~/.zabbleaf/projects/<projectId>/`.

use std::fs;
use std::path::{Path, PathBuf};
use std::process::Command;

#[cfg(windows)]
use std::os::windows::process::CommandExt;

/// Keeps a console window from flashing up for every `git` invocation.
#[cfg(windows)]
const CREATE_NO_WINDOW: u32 = 0x0800_0000;

/// Anything bigger than this is not something the editor should try to open.
const MAX_TEXT_FILE_BYTES: u64 = 4 * 1024 * 1024;

/// Extensions we consider editable text in a LaTeX project.
const TEXT_EXTENSIONS: &[&str] = &[
    "tex", "bib", "cls", "sty", "bst", "txt", "md", "markdown", "cfg", "def", "ltx", "dtx", "ins",
    "csv", "tsv", "json", "yml", "yaml", "toml", "rnw", "rmd", "clo", "lco", "ist",
];

#[derive(serde::Serialize)]
struct GitOutcome {
    success: bool,
    message: String,
    code: i32,
    stdout: String,
    stderr: String,
}

impl GitOutcome {
    fn ok(message: impl Into<String>) -> Self {
        GitOutcome {
            success: true,
            message: message.into(),
            code: 0,
            stdout: String::new(),
            stderr: String::new(),
        }
    }
}

#[derive(serde::Serialize)]
struct ProjectFile {
    name: String,
    content: String,
}

// ---------------------------------------------------------------------------
// Paths
// ---------------------------------------------------------------------------

fn home_dir() -> Result<PathBuf, String> {
    std::env::var_os("USERPROFILE")
        .or_else(|| std::env::var_os("HOME"))
        .map(PathBuf::from)
        .ok_or_else(|| "Could not determine the home directory.".to_string())
}

fn projects_root() -> Result<PathBuf, String> {
    Ok(home_dir()?.join(".zabbleaf").join("projects"))
}

/// Project ids come from user-pasted URLs, so they must never be able to escape
/// the projects root.
fn sanitize_project_id(project_id: &str) -> Result<String, String> {
    let id = project_id.trim();
    if id.is_empty() {
        return Err("Missing project id.".to_string());
    }
    if !id
        .chars()
        .all(|c| c.is_ascii_alphanumeric() || c == '-' || c == '_')
    {
        return Err(format!("Invalid project id: {}", id));
    }
    Ok(id.to_string())
}

fn project_dir(project_id: &str) -> Result<PathBuf, String> {
    Ok(projects_root()?.join(sanitize_project_id(project_id)?))
}

/// Joins a project-relative path, refusing anything that would climb out.
fn safe_join(base: &Path, rel_path: &str) -> Result<PathBuf, String> {
    let normalized = rel_path.replace('\\', "/");
    let mut out = base.to_path_buf();
    for part in normalized.split('/') {
        if part.is_empty() || part == "." {
            continue;
        }
        if part == ".." || part.contains(':') {
            return Err(format!("Invalid file path: {}", rel_path));
        }
        out.push(part);
    }
    if out == base {
        return Err(format!("Invalid file path: {}", rel_path));
    }
    Ok(out)
}

// ---------------------------------------------------------------------------
// URLs
// ---------------------------------------------------------------------------

fn percent_encode(value: &str) -> String {
    let mut out = String::with_capacity(value.len());
    for byte in value.bytes() {
        match byte {
            b'A'..=b'Z' | b'a'..=b'z' | b'0'..=b'9' | b'-' | b'.' | b'_' | b'~' => {
                out.push(byte as char)
            }
            _ => out.push_str(&format!("%{:02X}", byte)),
        }
    }
    out
}

/// Strips any `user:pass@` already present so we never stack credentials.
fn clean_url(git_url: &str) -> Result<String, String> {
    let rest = git_url
        .strip_prefix("https://")
        .ok_or_else(|| format!("Only https:// git URLs are supported (got {})", git_url))?;
    let (authority, path) = match rest.find('/') {
        Some(idx) => (&rest[..idx], &rest[idx..]),
        None => (rest, ""),
    };
    let host = match authority.rfind('@') {
        Some(idx) => &authority[idx + 1..],
        None => authority,
    };
    Ok(format!("https://{}{}", host, path))
}

/// Overleaf's git bridge authenticates with `git` as the username and the
/// generated token as the password.
fn auth_url(git_url: &str, token: &str) -> Result<String, String> {
    if token.trim().is_empty() {
        return Err("Missing Overleaf git token.".to_string());
    }
    let clean = clean_url(git_url)?;
    let rest = clean.strip_prefix("https://").unwrap_or(&clean);
    Ok(format!("https://git:{}@{}", percent_encode(token.trim()), rest))
}

// ---------------------------------------------------------------------------
// git
// ---------------------------------------------------------------------------

fn redact(text: &str, secret: &str) -> String {
    let secret = secret.trim();
    if secret.is_empty() {
        return text.to_string();
    }
    text.replace(secret, "***")
        .replace(&percent_encode(secret), "***")
}

/// Runs git with credential prompting completely disabled.
///
/// This is the difference between a bad token failing in a second with a real
/// message and Git Credential Manager silently waiting for input that a webview
/// can never provide.
fn run_git(args: &[String], cwd: Option<&Path>, secret: &str) -> Result<GitOutcome, String> {
    let mut command = Command::new("git");
    command
        .arg("-c")
        .arg("credential.helper=")
        .arg("-c")
        .arg("core.askPass=")
        .arg("-c")
        .arg("http.lowSpeedLimit=1000")
        .arg("-c")
        .arg("http.lowSpeedTime=60")
        .args(args)
        .env("GIT_TERMINAL_PROMPT", "0")
        .env("GCM_INTERACTIVE", "never")
        .env_remove("GIT_ASKPASS")
        .env_remove("SSH_ASKPASS");

    if let Some(dir) = cwd {
        command.current_dir(dir);
    }

    #[cfg(windows)]
    command.creation_flags(CREATE_NO_WINDOW);

    let output = command.output().map_err(|e| {
        format!(
            "Could not run git: {}. Make sure git is installed and on your PATH.",
            e
        )
    })?;

    let stdout = redact(&String::from_utf8_lossy(&output.stdout), secret);
    let stderr = redact(&String::from_utf8_lossy(&output.stderr), secret);
    let code = output.status.code().unwrap_or(-1);

    Ok(GitOutcome {
        success: code == 0,
        message: if code == 0 {
            String::new()
        } else {
            friendly_error(&stderr, &stdout)
        },
        code,
        stdout,
        stderr,
    })
}

/// Turns git's stderr into something a user can act on.
fn friendly_error(stderr: &str, stdout: &str) -> String {
    let combined = format!("{}\n{}", stderr, stdout);
    let lower = combined.to_lowercase();

    if lower.contains("authentication failed")
        || lower.contains("could not read username")
        || lower.contains("could not read password")
        || lower.contains("invalid username or password")
    {
        return "Authentication failed. Generate a fresh Git token in Overleaf \
                (Account Settings > Git Integration) and paste it again."
            .to_string();
    }
    if lower.contains("no git access") {
        return "No Git access to this project. Check the project URL, and make sure \
                this Overleaf account can open the project."
            .to_string();
    }
    if lower.contains("repository not found") || lower.contains("404") {
        return "Project not found. Check the project URL and that this Overleaf \
                account has access to it."
            .to_string();
    }
    if lower.contains("could not resolve host") || lower.contains("failed to connect") {
        return "Cannot reach git.overleaf.com. Check your internet connection.".to_string();
    }
    if lower.contains("premium feature") || lower.contains("upgrade") {
        return "Overleaf reports that Git integration is not enabled for this account."
            .to_string();
    }
    if lower.contains("conflict") || lower.contains("could not apply") {
        return "Overleaf has changes that clash with your local edits. Resolve them in \
                Overleaf, then sync again."
            .to_string();
    }

    // Unrecognised failure: show git's own first complaint rather than the whole
    // transcript, which does not fit in a notification.
    combined
        .lines()
        .map(str::trim)
        .find(|line| line.starts_with("fatal:") || line.starts_with("error:"))
        .map(|line| line.to_string())
        .unwrap_or_else(|| {
            let detail = combined.trim();
            if detail.is_empty() {
                "git failed without any output.".to_string()
            } else {
                detail.lines().next().unwrap_or(detail).to_string()
            }
        })
}

fn current_branch(dir: &Path) -> String {
    run_git(
        &["rev-parse".to_string(), "--abbrev-ref".to_string(), "HEAD".to_string()],
        Some(dir),
        "",
    )
    .ok()
    .filter(|out| out.success)
    .map(|out| out.stdout.trim().to_string())
    .filter(|branch| !branch.is_empty() && branch != "HEAD")
    .unwrap_or_else(|| "master".to_string())
}

// ---------------------------------------------------------------------------
// Commands
// ---------------------------------------------------------------------------

#[tauri::command]
fn zl_git_available() -> Result<String, String> {
    let out = run_git(&["--version".to_string()], None, "")?;
    if out.success {
        Ok(out.stdout.trim().to_string())
    } else {
        Err("git is not available on this system.".to_string())
    }
}

#[tauri::command]
fn zl_projects_root() -> Result<String, String> {
    let root = projects_root()?;
    fs::create_dir_all(&root)
        .map_err(|e| format!("Cannot create {}: {}", root.display(), e))?;
    Ok(root.to_string_lossy().to_string())
}

/// True only for a directory that actually holds a git repository, so a leftover
/// empty folder from a failed clone never looks like a downloaded project.
#[tauri::command]
fn zl_project_exists(project_id: String) -> Result<bool, String> {
    Ok(project_dir(&project_id)?.join(".git").is_dir())
}

#[tauri::command]
fn zl_clone_project(
    project_id: String,
    git_url: String,
    token: String,
) -> Result<GitOutcome, String> {
    let root = projects_root()?;
    fs::create_dir_all(&root).map_err(|e| format!("Cannot create {}: {}", root.display(), e))?;

    let dir = project_dir(&project_id)?;

    if dir.join(".git").is_dir() {
        return Ok(GitOutcome::ok("Project is already downloaded."));
    }
    // A partially written directory would make `git clone` bail out with
    // "destination path already exists".
    if dir.exists() {
        fs::remove_dir_all(&dir)
            .map_err(|e| format!("Cannot clear {}: {}", dir.display(), e))?;
    }

    let clean = clean_url(&git_url)?;
    let authenticated = auth_url(&git_url, &token)?;

    // Full clone, not shallow: Overleaf rejects pushes from shallow clones and
    // these projects are small.
    let outcome = run_git(
        &[
            "clone".to_string(),
            authenticated,
            dir.to_string_lossy().to_string(),
        ],
        Some(&root),
        &token,
    )?;

    if outcome.success {
        // Don't leave the token sitting in .git/config.
        let _ = run_git(
            &[
                "remote".to_string(),
                "set-url".to_string(),
                "origin".to_string(),
                clean,
            ],
            Some(&dir),
            &token,
        );
        return Ok(GitOutcome::ok("Project downloaded from Overleaf."));
    }

    // Leave nothing behind that would confuse the next attempt.
    if dir.exists() && !dir.join(".git").is_dir() {
        let _ = fs::remove_dir_all(&dir);
    }
    Ok(outcome)
}

#[tauri::command]
fn zl_sync_project(
    project_id: String,
    git_url: String,
    token: String,
    email: String,
    message: String,
) -> Result<GitOutcome, String> {
    let dir = project_dir(&project_id)?;
    if !dir.join(".git").is_dir() {
        return Err("This project has not been downloaded yet.".to_string());
    }

    let clean = clean_url(&git_url)?;
    let authenticated = auth_url(&git_url, &token)?;
    let branch = current_branch(&dir);

    let restore_remote = |token: &str| {
        let _ = run_git(
            &[
                "remote".to_string(),
                "set-url".to_string(),
                "origin".to_string(),
                clean.clone(),
            ],
            Some(&dir),
            token,
        );
    };

    let set_remote = run_git(
        &[
            "remote".to_string(),
            "set-url".to_string(),
            "origin".to_string(),
            authenticated,
        ],
        Some(&dir),
        &token,
    )?;
    if !set_remote.success {
        return Ok(set_remote);
    }

    let _ = run_git(&["add".to_string(), "-A".to_string()], Some(&dir), &token)?;

    let status = run_git(
        &["status".to_string(), "--porcelain".to_string()],
        Some(&dir),
        &token,
    )?;
    if !status.stdout.trim().is_empty() {
        let author = if email.trim().is_empty() {
            "zabbleaf@localhost".to_string()
        } else {
            email.trim().to_string()
        };
        let name = author.split('@').next().unwrap_or("ZabbLeaf").to_string();
        let commit_message = if message.trim().is_empty() {
            "ZabbLeaf offline sync".to_string()
        } else {
            message.trim().to_string()
        };

        let commit = run_git(
            &[
                "-c".to_string(),
                format!("user.name={}", name),
                "-c".to_string(),
                format!("user.email={}", author),
                "commit".to_string(),
                "-m".to_string(),
                commit_message,
            ],
            Some(&dir),
            &token,
        )?;
        if !commit.success {
            restore_remote(&token);
            return Ok(commit);
        }
    }

    let pull = run_git(
        &[
            "pull".to_string(),
            "--rebase".to_string(),
            "origin".to_string(),
            branch.clone(),
        ],
        Some(&dir),
        &token,
    )?;
    if !pull.success {
        // Never leave the repo mid-rebase.
        let _ = run_git(
            &["rebase".to_string(), "--abort".to_string()],
            Some(&dir),
            &token,
        );
        restore_remote(&token);
        return Ok(pull);
    }

    let push = run_git(
        &["push".to_string(), "origin".to_string(), branch],
        Some(&dir),
        &token,
    )?;
    restore_remote(&token);

    if push.success {
        Ok(GitOutcome::ok("Synced with Overleaf."))
    } else {
        Ok(push)
    }
}

#[tauri::command]
fn zl_read_project_files(project_id: String) -> Result<Vec<ProjectFile>, String> {
    let dir = project_dir(&project_id)?;
    let mut files: Vec<ProjectFile> = Vec::new();
    if !dir.is_dir() {
        return Ok(files);
    }

    collect_files(&dir, &dir, &mut files)?;
    files.sort_by(|a, b| sort_rank(&a.name).cmp(&sort_rank(&b.name)).then(a.name.cmp(&b.name)));
    Ok(files)
}

/// `main.tex` first, then the rest of the LaTeX sources, then everything else.
fn sort_rank(name: &str) -> u8 {
    let lower = name.to_lowercase();
    if lower == "main.tex" {
        0
    } else if lower.ends_with(".tex") {
        1
    } else {
        2
    }
}

fn is_text_file(path: &Path) -> bool {
    path.extension()
        .map(|ext| {
            let ext = ext.to_string_lossy().to_lowercase();
            TEXT_EXTENSIONS.iter().any(|known| *known == ext)
        })
        .unwrap_or(false)
}

fn collect_files(root: &Path, dir: &Path, out: &mut Vec<ProjectFile>) -> Result<(), String> {
    let entries =
        fs::read_dir(dir).map_err(|e| format!("Cannot read {}: {}", dir.display(), e))?;

    for entry in entries {
        let entry = entry.map_err(|e| format!("Cannot read {}: {}", dir.display(), e))?;
        let file_name = entry.file_name().to_string_lossy().to_string();
        // Skips .git and other dotfiles.
        if file_name.starts_with('.') {
            continue;
        }

        let path = entry.path();
        let file_type = entry
            .file_type()
            .map_err(|e| format!("Cannot stat {}: {}", path.display(), e))?;

        if file_type.is_dir() {
            collect_files(root, &path, out)?;
        } else if file_type.is_file() && is_text_file(&path) {
            if entry.metadata().map(|m| m.len()).unwrap_or(0) > MAX_TEXT_FILE_BYTES {
                continue;
            }
            let bytes = fs::read(&path)
                .map_err(|e| format!("Cannot read {}: {}", path.display(), e))?;
            let relative = path
                .strip_prefix(root)
                .unwrap_or(&path)
                .to_string_lossy()
                .replace('\\', "/");
            out.push(ProjectFile {
                name: relative,
                content: String::from_utf8_lossy(&bytes).to_string(),
            });
        }
    }
    Ok(())
}

#[tauri::command]
fn zl_write_project_file(
    project_id: String,
    rel_path: String,
    content: String,
) -> Result<(), String> {
    let dir = project_dir(&project_id)?;
    fs::create_dir_all(&dir).map_err(|e| format!("Cannot create {}: {}", dir.display(), e))?;

    let target = safe_join(&dir, &rel_path)?;
    if let Some(parent) = target.parent() {
        fs::create_dir_all(parent)
            .map_err(|e| format!("Cannot create {}: {}", parent.display(), e))?;
    }
    fs::write(&target, content).map_err(|e| format!("Cannot write {}: {}", target.display(), e))
}

#[tauri::command]
fn zl_delete_project(project_id: String) -> Result<(), String> {
    let dir = project_dir(&project_id)?;
    if dir.exists() {
        fs::remove_dir_all(&dir)
            .map_err(|e| format!("Cannot delete {}: {}", dir.display(), e))?;
    }
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn project_ids_cannot_escape_the_projects_root() {
        assert!(sanitize_project_id("../../windows").is_err());
        assert!(sanitize_project_id("a/b").is_err());
        assert!(sanitize_project_id("").is_err());
        assert_eq!(
            sanitize_project_id(" 6a6a84fe7cba2c6cd0ff9f3e ").unwrap(),
            "6a6a84fe7cba2c6cd0ff9f3e"
        );
        assert_eq!(sanitize_project_id("local-1234").unwrap(), "local-1234");
    }

    #[test]
    fn relative_paths_cannot_escape_the_project_dir() {
        let base = Path::new("/projects/abc");
        assert!(safe_join(base, "../secrets.txt").is_err());
        assert!(safe_join(base, "sections/../../secrets.txt").is_err());
        assert!(safe_join(base, "C:/Windows/system.ini").is_err());
        assert_eq!(
            safe_join(base, "sections/intro.tex").unwrap(),
            base.join("sections").join("intro.tex")
        );
    }

    #[test]
    fn credentials_are_injected_and_stripped() {
        let url = "https://git.overleaf.com/6a6a84fe7cba2c6cd0ff9f3e";
        let authed = auth_url(url, "olp_secret").unwrap();
        assert_eq!(
            authed,
            "https://git:olp_secret@git.overleaf.com/6a6a84fe7cba2c6cd0ff9f3e"
        );
        // Feeding an already-authenticated URL back in must not stack credentials.
        assert_eq!(clean_url(&authed).unwrap(), url);
        assert!(auth_url(url, "  ").is_err());
    }

    #[test]
    fn tokens_with_url_specials_are_encoded() {
        let authed = auth_url("https://git.overleaf.com/abc", "p@ss/word").unwrap();
        assert_eq!(authed, "https://git:p%40ss%2Fword@git.overleaf.com/abc");
    }

    #[test]
    fn tokens_never_leak_into_reported_output() {
        let raw = "fatal: could not read from https://git:olp_secret@git.overleaf.com/abc";
        assert!(!redact(raw, "olp_secret").contains("olp_secret"));
        assert!(!redact("token p%40ss", "p@ss").contains("p%40ss"));
    }

    #[test]
    fn auth_failures_get_an_actionable_message() {
        let msg = friendly_error("remote: Authentication failed for 'x'", "");
        assert!(msg.contains("Generate a fresh Git token"));
        assert!(friendly_error("remote: Repository not found", "").contains("Project not found"));
        assert!(friendly_error("fatal: remote error: no git access", "").contains("No Git access"));
    }

    #[test]
    fn unrecognised_failures_are_reduced_to_one_line() {
        let noisy = "Cloning into 'C:\\projects\\abc'...\n\
                     remote: some long explanation\n\
                     remote: spanning several lines\n\
                     fatal: the remote end hung up unexpectedly\n\
                     remote: contact support";
        assert_eq!(
            friendly_error(noisy, ""),
            "fatal: the remote end hung up unexpectedly"
        );
    }

    #[test]
    fn main_tex_sorts_first() {
        let mut names = vec!["zzz.txt", "appendix.tex", "main.tex", "refs.bib"];
        names.sort_by(|a, b| sort_rank(a).cmp(&sort_rank(b)).then(a.cmp(b)));
        assert_eq!(names, vec!["main.tex", "appendix.tex", "refs.bib", "zzz.txt"]);
    }

    #[test]
    fn only_text_sources_are_offered_to_the_editor() {
        assert!(is_text_file(Path::new("main.tex")));
        assert!(is_text_file(Path::new("refs.BIB")));
        assert!(!is_text_file(Path::new("figure.png")));
        assert!(!is_text_file(Path::new("Makefile")));
    }
}

fn main() {
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![
            zl_git_available,
            zl_projects_root,
            zl_project_exists,
            zl_clone_project,
            zl_sync_project,
            zl_read_project_files,
            zl_write_project_file,
            zl_delete_project
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
