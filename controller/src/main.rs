use axum::{
    body::Bytes,
    extract::State,
    http::StatusCode,
    routing::{get, post},
    Json, Router,
};
use serde::{Deserialize, Serialize};
use socket2::{Domain, Protocol, Socket, Type};
use std::net::SocketAddr;
use std::path::{Path, PathBuf};
use tower_http::services::ServeDir;

const PORT: u16 = 80;

/// Repo-root `.passphrase` switches the editor to **`models_vault/`** (plaintext only on disk).
/// Keep **`*.enc`** in sync with **`scripts/vault-crypto.sh encrypt-from models_vault`** (e.g. via **`.githooks/pre-commit`**).
/// After clone use **`vault-decode-all.sh`** first.
fn vault_active(root: &Path) -> bool {
    root.join(".passphrase").is_file()
}

fn models_demo_dir(root: &Path) -> PathBuf {
    root.join("models_demo")
}

fn vault_dir(root: &Path) -> PathBuf {
    root.join("models_vault")
}

fn active_models_dir(root: &Path) -> PathBuf {
    if vault_active(root) {
        vault_dir(root)
    } else {
        models_demo_dir(root)
    }
}

fn active_models_path_label(root: &Path) -> String {
    let p = active_models_dir(root);
    p.strip_prefix(root)
        .map(|x| x.display().to_string())
        .unwrap_or_else(|_| p.display().to_string())
}

/// If the process starts from a subdirectory (for example `controller/`), walk up parents until we
/// find `models_demo/` so `.passphrase`, `models_vault/`, and static paths match the real repo root.
fn resolve_repo_root(initial: PathBuf) -> PathBuf {
    let start = match initial.canonicalize() {
        Ok(p) => p,
        Err(e) => {
            eprintln!("invalid root path: {e}");
            std::process::exit(1);
        }
    };
    let mut path = start.clone();
    for _ in 0..16 {
        if path.join("models_demo").is_dir() {
            if path != start {
                eprintln!(
                    "note: using repo root {} (working directory was {})",
                    path.display(),
                    start.display()
                );
            }
            return path;
        }
        if path.join("scripts").join("vault-crypto.sh").is_file() {
            if path != start {
                eprintln!(
                    "note: using repo root {} (working directory was {})",
                    path.display(),
                    start.display()
                );
            }
            return path;
        }
        if !path.pop() {
            break;
        }
    }
    eprintln!(
        "warning: no models_demo/ found above {}; editor static files and API paths may be wrong",
        start.display()
    );
    start
}

#[derive(Debug, Clone, Serialize, Deserialize)]
struct SkillItem {
    name: String,
    #[serde(default = "default_true")]
    enabled: bool,
    #[serde(default)]
    bold: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
struct SkillCategory {
    category: String,
    rating: u32,
    items: Vec<SkillItem>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
struct LanguageRow {
    name: String,
    level: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
struct ProfileLink {
    url: String,
    label: String,
    /// Font Awesome Brands row in PDF: `linkedin`, `github`, or empty for text-only link.
    #[serde(default)]
    icon: String,
}

/// One reference person / note block in the sidebar.
#[derive(Debug, Clone, Serialize, Deserialize, Default)]
struct ReferenceCard {
    #[serde(default)]
    name: String,
    #[serde(default)]
    phone: String,
    /// Profile URL (`link` kept as YAML alias for older files).
    #[serde(default, alias = "link")]
    url: String,
    /// Shown in the PDF like SoMe labels; if empty, a shortened URL is used.
    #[serde(default)]
    label: String,
    #[serde(default)]
    text: String,
}

/// `references` in YAML: global toggle for phone + URL lines only; `name` and `text` always follow their own rules.
#[derive(Debug, Clone, Serialize, Deserialize)]
struct ReferencesSection {
    #[serde(default = "default_true", rename = "show_contact_info", alias = "show_contact")]
    show_contact_info: bool,
    #[serde(default)]
    entries: Vec<ReferenceCard>,
}

impl Default for ReferencesSection {
    fn default() -> Self {
        Self {
            show_contact_info: true,
            entries: vec![],
        }
    }
}

fn references_section_from_json_value(v: serde_json::Value) -> ReferencesSection {
    match v {
        serde_json::Value::Null => ReferencesSection::default(),
        serde_json::Value::String(s) => ReferencesSection {
            show_contact_info: true,
            entries: vec![ReferenceCard {
                text: s,
                ..Default::default()
            }],
        },
        serde_json::Value::Object(mut m) => {
            let show_contact_info = m
                .remove("show_contact_info")
                .or_else(|| m.remove("show_contact"))
                .and_then(|x| x.as_bool())
                .unwrap_or(true);
            if let Some(serde_json::Value::Array(arr)) = m.remove("entries") {
                let entries: Vec<ReferenceCard> = arr
                    .into_iter()
                    .filter_map(|x| serde_json::from_value(x).ok())
                    .collect();
                return ReferencesSection {
                    show_contact_info,
                    entries,
                };
            }
            if m.is_empty() {
                return ReferencesSection {
                    show_contact_info,
                    entries: vec![],
                };
            }
            let card: ReferenceCard =
                serde_json::from_value(serde_json::Value::Object(m)).unwrap_or_default();
            let empty = card.name.is_empty()
                && card.phone.is_empty()
                && card.url.is_empty()
                && card.label.is_empty()
                && card.text.is_empty();
            ReferencesSection {
                show_contact_info,
                entries: if empty { vec![] } else { vec![card] },
            }
        }
        _ => ReferencesSection::default(),
    }
}

fn deserialize_references_compat<'de, D>(deserializer: D) -> Result<ReferencesSection, D::Error>
where
    D: serde::Deserializer<'de>,
{
    let v = serde_json::Value::deserialize(deserializer).map_err(serde::de::Error::custom)?;
    Ok(references_section_from_json_value(v))
}

#[derive(Debug, Clone, Serialize, Deserialize)]
struct SidebarData {
    #[serde(default)]
    use_photo: bool,
    #[serde(default = "default_true")]
    show_skill_ratings: bool,
    #[serde(
        default,
        rename = "some_profiles",
        alias = "profiles",
        alias = "some-profiles"
    )]
    profiles: Vec<ProfileLink>,
    #[serde(default)]
    languages: Vec<LanguageRow>,
    /// One line per certification (sidebar).
    #[serde(default)]
    certifications: Vec<String>,
    skills: Vec<SkillCategory>,
    /// One line per award (sidebar).
    #[serde(default)]
    awards: Vec<String>,
    #[serde(default)]
    #[serde(deserialize_with = "deserialize_references_compat")]
    references: ReferencesSection,
}

impl Default for SidebarData {
    fn default() -> Self {
        Self {
            use_photo: false,
            show_skill_ratings: true,
            profiles: vec![],
            languages: vec![],
            certifications: vec![],
            skills: vec![],
            awards: vec![],
            references: ReferencesSection::default(),
        }
    }
}

fn default_true() -> bool {
    true
}

#[derive(Deserialize)]
struct CompileBody {
    #[serde(default)]
    source: String,
    #[serde(default)]
    header: String,
    sidebar: SidebarData,
}

#[tokio::main]
async fn main() {
    let root = resolve_repo_root(
        std::env::args()
            .nth(1)
            .map(PathBuf::from)
            .or_else(|| std::env::current_dir().ok())
            .unwrap_or_else(|| PathBuf::from(".")),
    );

    if vault_active(&root) {
        println!(
            "Vault layout: editor uses plaintext in {}",
            active_models_path_label(&root)
        );
    } else {
        println!(
            "Demo sources: {} (add repo-root `.passphrase` to use models_vault/)",
            active_models_path_label(&root)
        );
    }

    let host = std::env::var("HOST").unwrap_or_else(|_| "0.0.0.0".into());

    let static_files = ServeDir::new(root.clone()).append_index_html_on_directories(true);

    let app = Router::new()
        .route("/api/resumify-config", get(resumify_config_handler))
        .route("/api/sidebar-data", get(sidebar_data_handler))
        .route(
            "/api/profile-photo",
            post(upload_profile_photo).delete(delete_profile_photo),
        )
        .route("/api/compile", post(compile_handler))
        .fallback_service(static_files)
        .with_state(root.clone());

    let addr = format!("{host}:{PORT}");
    let listener = match bind_with_reuse(&host, PORT).await {
        Ok(l) => l,
        Err(e) => {
            eprintln!("Failed to bind http://{addr}/ : {e}");
            eprintln!("See what holds port {PORT}:  ss -tlnp 'sport = :http'");
            eprintln!("(On some systems also check IPv6:  ss -tlnp | grep ':80[[:space:]]')");
            std::process::exit(1);
        }
    };

    let base_url = "http://localhost".to_string();

    println!("Serving {} — listening on http://{addr}/", root.display());
    println!("Open in browser: {base_url}/  (forward port {PORT} in a dev container)");
    println!("Index:  {base_url}/");
    println!("Editor: {base_url}/editor.html");

    axum::serve(listener, app)
        .await
        .expect("server error");
}

async fn bind_with_reuse(host: &str, port: u16) -> std::io::Result<tokio::net::TcpListener> {
    let sock_addr: SocketAddr = format!("{host}:{port}")
        .parse()
        .map_err(|_| std::io::Error::new(std::io::ErrorKind::InvalidInput, "invalid HOST:PORT"))?;

    let domain = match sock_addr {
        SocketAddr::V4(_) => Domain::IPV4,
        SocketAddr::V6(_) => Domain::IPV6,
    };

    let sock = Socket::new(domain, Type::STREAM, Some(Protocol::TCP))?;
    sock.set_reuse_address(true)?;
    sock.bind(&sock_addr.into())?;
    sock.listen(128)?;

    let std_listener: std::net::TcpListener = sock.into();
    std_listener.set_nonblocking(true)?;
    tokio::net::TcpListener::from_std(std_listener)
}

const PROFILE_PHOTO_MAX_BYTES: usize = 8 * 1024 * 1024;

async fn resumify_config_handler(State(root): State<PathBuf>) -> Json<serde_json::Value> {
    let models_path = if vault_active(&root) {
        "models_vault"
    } else {
        "models_demo"
    };
    Json(serde_json::json!({
        "models_path": models_path,
    }))
}

async fn upload_profile_photo(State(root): State<PathBuf>, body: Bytes) -> StatusCode {
    if body.is_empty() || body.len() > PROFILE_PHOTO_MAX_BYTES {
        return StatusCode::BAD_REQUEST;
    }
    let is_png = body.len() >= 8
        && body[0] == 0x89
        && body[1] == 0x50
        && body[2] == 0x4e
        && body[3] == 0x47;
    if !is_png {
        return StatusCode::UNSUPPORTED_MEDIA_TYPE;
    }

    let dir = active_models_dir(&root);
    if tokio::fs::create_dir_all(&dir).await.is_err() {
        return StatusCode::INTERNAL_SERVER_ERROR;
    }
    let path = dir.join("profile.png");
    if tokio::fs::write(&path, &body).await.is_err() {
        return StatusCode::INTERNAL_SERVER_ERROR;
    }
    StatusCode::NO_CONTENT
}

async fn delete_profile_photo(State(root): State<PathBuf>) -> StatusCode {
    let path = active_models_dir(&root).join("profile.png");
    match tokio::fs::remove_file(&path).await {
        Ok(()) => StatusCode::NO_CONTENT,
        Err(e) if e.kind() == std::io::ErrorKind::NotFound => StatusCode::NO_CONTENT,
        Err(_) => StatusCode::INTERNAL_SERVER_ERROR,
    }
}

async fn sidebar_data_handler(State(root): State<PathBuf>) -> Json<SidebarData> {
    let path = active_models_dir(&root).join("resume-sidebar.yaml");
    let data = match tokio::fs::read_to_string(&path).await {
        Ok(s) => serde_yaml::from_str::<SidebarData>(&s).unwrap_or_default(),
        Err(_) => SidebarData::default(),
    };
    Json(data)
}

async fn compile_handler(
    State(root): State<PathBuf>,
    Json(body): Json<CompileBody>,
) -> Json<serde_json::Value> {
    let work_dir = active_models_dir(&root);
    if let Err(e) = tokio::fs::create_dir_all(&work_dir).await {
        return Json(serde_json::json!({
            "ok": false,
            "error": e.to_string(),
        }));
    }

    let content_path = work_dir.join("resume-content.typ");
    let header_typ_path = work_dir.join("resume-header.typ");
    let yaml_path = work_dir.join("resume-sidebar.yaml");

    if let Err(e) = tokio::fs::write(&content_path, &body.source).await {
        return Json(serde_json::json!({
            "ok": false,
            "error": e.to_string(),
        }));
    }

    if let Err(e) = tokio::fs::write(&header_typ_path, &body.header).await {
        return Json(serde_json::json!({
            "ok": false,
            "error": e.to_string(),
        }));
    }

    let profile_png = work_dir.join("profile.png");
    let mut sidebar = body.sidebar;
    sidebar.use_photo = sidebar.use_photo && profile_png.is_file();

    let yaml_str = match serde_yaml::to_string(&sidebar) {
        Ok(s) => s,
        Err(e) => {
            return Json(serde_json::json!({
                "ok": false,
                "error": format!("sidebar YAML: {e}"),
            }));
        }
    };

    if let Err(e) = tokio::fs::write(&yaml_path, yaml_str).await {
        return Json(serde_json::json!({
            "ok": false,
            "error": e.to_string(),
        }));
    }

    let resume_src = work_dir.join("resume.typ");
    let pdf_out = root.join("resume.pdf");
    let output = tokio::process::Command::new("typst")
        .arg("compile")
        .arg(&resume_src)
        .arg(&pdf_out)
        .current_dir(&work_dir)
        .output()
        .await;

    let result = match output {
        Ok(o) if o.status.success() => Json(serde_json::json!({ "ok": true })),
        Ok(o) => {
            let stderr = String::from_utf8_lossy(&o.stderr);
            let stdout = String::from_utf8_lossy(&o.stdout);
            let msg = if !stderr.trim().is_empty() {
                stderr.into_owned()
            } else {
                stdout.into_owned()
            };
            let msg = if msg.trim().is_empty() {
                "typst compile failed".into()
            } else {
                msg.trim().to_string()
            };
            Json(serde_json::json!({
                "ok": false,
                "error": msg,
            }))
        }
        Err(e) => Json(serde_json::json!({
            "ok": false,
            "error": format!("failed to run typst (is it on PATH?): {e}"),
        })),
    };

    result
}
