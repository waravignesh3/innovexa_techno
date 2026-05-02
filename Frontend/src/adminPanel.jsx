import { useEffect, useMemo, useState, useCallback, useRef } from "react";
import "./App.css";
import "./adminPanel.css";
import { defaultSiteContent, normalizeSiteContent } from "./siteContent.js";
import { API_BASE_URL, API_ENDPOINTS } from "./config.js";

const ADMIN_TOKEN_KEY = "innovex_admin_token";

const arrayFromText = (value) =>
  value
    .split("\n")
    .map((item) => item.trim())
    .filter(Boolean);

const getErrorMessage = (error, fallback) => {
  if (error instanceof TypeError) {
    return `Cannot reach the admin server on ${API_BASE_URL}. Start the backend server and try again.`;
  }
  return error.message || fallback;
};

// ── Character count badge shown inside / next to textareas & inputs ──────────
function CharCount({ value, max }) {
  const len = typeof value === "string" ? value.length : 0;
  const pct = max ? len / max : 0;
  const state =
    pct >= 1 ? "over" : pct >= 0.85 ? "warn" : "ok";
  return (
    <span className={`ap-char-count ap-char-count--${state}`}>
      {len}{max ? `/${max}` : ""}
    </span>
  );
}

// ── Labelled field wrapper with optional char-count ───────────────────────────
function Field({ label, hint, children, wide, charValue, charMax }) {
  return (
    <label className={`admin-form-label${wide ? " admin-form-wide" : ""}`}>
      <span className="ap-label-row">
        <span className="ap-label-text">{label}</span>
        {charValue !== undefined && (
          <CharCount value={charValue} max={charMax} />
        )}
      </span>
      {hint && <span className="ap-field-hint">{hint}</span>}
      {children}
    </label>
  );
}

// ── Stat card with animated number ───────────────────────────────────────────
function StatCard({ label, value, icon, index }) {
  const [displayed, setDisplayed] = useState(0);
  const prevRef = useRef(0);

  useEffect(() => {
    const target = Number(value) || 0;
    const from = prevRef.current;
    prevRef.current = target;
    if (from === target) return;
    const duration = 600;
    const start = performance.now();
    const tick = (now) => {
      const p = Math.min((now - start) / duration, 1);
      const ease = 1 - Math.pow(1 - p, 3);
      setDisplayed(Math.round(from + (target - from) * ease));
      if (p < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }, [value]);

  return (
    <article
      className="admin-stat-card ap-stat-card"
      style={{ animationDelay: `${index * 60}ms` }}
    >
      <div className="ap-stat-icon">
        <i className={`bx ${icon}`} />
      </div>
      <div className="ap-stat-body">
        <p className="ap-stat-value">{displayed.toLocaleString()}</p>
        <p className="ap-stat-label">{label}</p>
      </div>
    </article>
  );
}

// ── Section card wrapper ──────────────────────────────────────────────────────
function EditorCard({ title, subtitle, action, children, className = "" }) {
  return (
    <section className={`admin-editor-card ap-editor-card ${className}`}>
      {(title || action) && (
        <div className="admin-section-head ap-section-head">
          <div className="ap-section-title-block">
            {title && <h2 className="ap-card-title">{title}</h2>}
            {subtitle && <p className="ap-card-subtitle">{subtitle}</p>}
          </div>
          {action}
        </div>
      )}
      {children}
    </section>
  );
}

// ── Sidebar nav items ─────────────────────────────────────────────────────────
const NAV_ITEMS = [
  { id: "stats",   label: "Overview",    icon: "bx-bar-chart-alt-2" },
  { id: "github",  label: "GitHub Sync", icon: "bx-git-branch" },
  { id: "home",    label: "Home",        icon: "bx-home-alt" },
  { id: "about",   label: "About Us",    icon: "bx-user-circle" },
  { id: "contact", label: "Contact",     icon: "bx-envelope" },
  { id: "services","label": "Services",  icon: "bx-briefcase" },
  { id: "json",    label: "JSON Editor", icon: "bx-code-curly" },
];

// ── Main component ────────────────────────────────────────────────────────────
function AdminPanel({ darkMode, toggleTheme, siteContent, onSiteContentSaved }) {
  const [token, setToken] = useState(
    () => sessionStorage.getItem(ADMIN_TOKEN_KEY) || ""
  );
  const [password, setPassword]     = useState("");
  const [error, setError]           = useState("");
  const [saving, setSaving]         = useState(false);
  const [syncing, setSyncing]       = useState(false);
  const [loading, setLoading]       = useState(false);
  const [overview, setOverview]     = useState(null);
  const [jsonDraft, setJsonDraft]   = useState("");
  const [jsonError, setJsonError]   = useState("");
  const [activeSection, setActiveSection] = useState("stats");
  const [saveSuccess, setSaveSuccess]     = useState(false);
  const [syncMessage, setSyncMessage]     = useState("");

  const [syncProfile, setSyncProfile] = useState(() =>
    siteContent?.githubProfiles?.length
      ? siteContent.githubProfiles.join("\n")
      : "https://github.com/waravignesh3\nhttps://github.com/Madhan457"
  );

  const [form, setForm] = useState(() =>
    normalizeSiteContent(siteContent || defaultSiteContent)
  );

  const statCards = useMemo(
    () => [
      { label: "Imported Projects",  value: overview?.summary?.totalProjects    ?? form.stats.totalProjects,    icon: "bx-briefcase-alt-2" },
      { label: "Completed",          value: overview?.summary?.completedProjects ?? form.stats.completedProjects, icon: "bx-check-circle"    },
      { label: "Projects Live",      value: overview?.summary?.liveProjects      ?? form.stats.liveProjects,      icon: "bx-loader-alt"      },
      { label: "Total Views",        value: overview?.analytics?.totalViews      ?? 0,                            icon: "bx-show-alt"        },
      { label: "Unique Visitors",    value: overview?.analytics?.uniqueVisitors  ?? 0,                            icon: "bx-user-pin"        },
      { label: "Active Visitors",    value: overview?.analytics?.activeVisitors  ?? 0,                            icon: "bx-pulse"           },
    ],
    [form.stats, overview]
  );

  // ── Sync form when siteContent prop changes ────────────────────────────────
  useEffect(() => {
    const normalized = normalizeSiteContent(siteContent || defaultSiteContent);
    setForm(normalized);
    setSyncProfile(
      normalized.githubProfiles?.length
        ? normalized.githubProfiles.join("\n")
        : "https://github.com/waravignesh3\nhttps://github.com/Madhan457"
    );
  }, [siteContent]);

  // ── Keep JSON draft in sync with form ─────────────────────────────────────
  useEffect(() => {
    const { home, about, contact, services } = form;
    setJsonDraft(JSON.stringify({ home, about, contact, services }, null, 2));
    setJsonError("");
  }, [form]);

  // ── Load dashboard on auth ─────────────────────────────────────────────────
  useEffect(() => {
    if (!token) return;
    const load = async () => {
      try {
        setLoading(true);
        const res = await fetch(`${API_BASE_URL}${API_ENDPOINTS.adminDashboard}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data.message || "Admin session expired");
        const normalized = normalizeSiteContent(data.siteContent);
        setOverview(data.overview);
        setForm(normalized);
        setSyncProfile(
          normalized.githubProfiles?.length
            ? normalized.githubProfiles.join("\n")
            : "https://github.com/waravignesh3\nhttps://github.com/Madhan457"
        );
        onSiteContentSaved(normalized);
        setError("");
      } catch (e) {
        sessionStorage.removeItem(ADMIN_TOKEN_KEY);
        setToken("");
        setError(getErrorMessage(e, "Unable to load the admin dashboard"));
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [onSiteContentSaved, token]);

  // ── Handlers ──────────────────────────────────────────────────────────────
  const handleLogin = async (event) => {
    event.preventDefault();
    setError("");
    try {
      setLoading(true);
      const res = await fetch(`${API_BASE_URL}${API_ENDPOINTS.adminLogin}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.success) throw new Error(data.message || "Incorrect password");
      sessionStorage.setItem(ADMIN_TOKEN_KEY, data.token);
      setToken(data.token);
      setPassword("");
    } catch (e) {
      setError(getErrorMessage(e, "Unable to log in"));
    } finally {
      setLoading(false);
    }
  };

  const updateNestedField = useCallback((section, field, value) => {
    setForm((cur) => ({ ...cur, [section]: { ...cur[section], [field]: value } }));
  }, []);

  const applyJsonDraft = () => {
    try {
      const parsed = JSON.parse(jsonDraft);
      setForm((cur) => normalizeSiteContent({ ...cur, ...parsed }));
      setJsonError("");
      setError("");
    } catch {
      setJsonError("Invalid JSON — fix syntax errors before applying.");
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      setError("");
      const payload = {
        home: form.home, about: form.about,
        contact: form.contact, services: form.services,
      };
      const res = await fetch(`${API_BASE_URL}${API_ENDPOINTS.adminSiteContent}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.success) throw new Error(data.message || "Unable to save changes");
      const saved = normalizeSiteContent(data.siteContent);
      setForm(saved);
      onSiteContentSaved(saved);
      window.dispatchEvent(new Event("innovex-site-updated"));
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 2800);
    } catch (e) {
      setError(getErrorMessage(e, "Unable to save changes"));
    } finally {
      setSaving(false);
    }
  };

  const handleGithubSync = async () => {
    try {
      setSyncing(true);
      setError("");
      setSyncMessage("");
      const res = await fetch(`${API_BASE_URL}${API_ENDPOINTS.adminGithubSync}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          owners: syncProfile.split("\n").map((v) => v.trim()).filter(Boolean),
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.success)
        throw new Error(data.message || "Unable to sync GitHub repositories");
      const normalized = normalizeSiteContent(data.siteContent);
      setOverview(data.overview || null);
      setForm(normalized);
      setSyncProfile(
        normalized.githubProfiles?.length ? normalized.githubProfiles.join("\n") : syncProfile
      );
      setSyncMessage(data.message || "GitHub repositories synced successfully.");
      onSiteContentSaved(normalized);
      window.dispatchEvent(new Event("innovex-site-updated"));
    } catch (e) {
      setError(getErrorMessage(e, "Unable to sync GitHub repositories"));
    } finally {
      setSyncing(false);
    }
  };

  const logout = () => {
    sessionStorage.removeItem(ADMIN_TOKEN_KEY);
    setToken("");
  };

  // ── Login screen ──────────────────────────────────────────────────────────
  if (!token) {
    return (
      <div className={`${darkMode ? "dark-dashboard" : "light-dashboard"} app-shell page-shell`}>
        <div className="ap-login-page">
          {/* Ambient orbs */}
          <div className="ap-orb ap-orb--a" />
          <div className="ap-orb ap-orb--b" />

          <div className="admin-login-card ap-login-card">
            <div className="ap-login-brand">
              <span className="section-chip">Hidden Admin Panel</span>
              <h1 className="ap-login-title">Admin access</h1>
              <p className="ap-login-sub">
                Enter the admin password to edit website content and sync
                repository data from your GitHub profile.
              </p>
            </div>

            <form className="admin-login-form ap-login-form" onSubmit={handleLogin}>
              <Field label="Password">
                <div className="ap-input-wrap">
                  <i className="bx bx-lock-alt ap-input-icon" />
                  <input
                    className="ap-input ap-input--icon"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter admin password"
                    autoFocus
                  />
                </div>
              </Field>

              {error && (
                <p className="admin-form-error ap-form-error">
                  <i className="bx bx-error-circle" /> {error}
                </p>
              )}

              <div className="admin-login-actions ap-login-actions">
                <button
                  className="settings-action-btn ap-btn-primary"
                  type="submit"
                  disabled={loading || !password}
                >
                  {loading ? (
                    <><i className="bx bx-loader-alt bx-spin" /> Checking…</>
                  ) : (
                    <><i className="bx bx-log-in" /> Unlock Admin Panel</>
                  )}
                </button>
                <button
                  className="theme-toggle-btn"
                  type="button"
                  onClick={toggleTheme}
                  aria-label="Toggle theme"
                >
                  {darkMode ? <i className="bx bx-sun" /> : <i className="bx bx-moon" />}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    );
  }

  // ── Main dashboard ─────────────────────────────────────────────────────────
  const sectionVisible = (id) => activeSection === id;

  return (
    <div className={`${darkMode ? "dark-dashboard" : "light-dashboard"} app-shell page-shell`}>
      <div className="ap-dashboard-shell">

        {/* ── Sidebar ──────────────────────────────────────────────────────── */}
        <aside className="ap-sidebar">
          <div className="ap-sidebar-header">
            <span className="section-chip ap-sidebar-chip">Admin</span>
            <p className="ap-sidebar-tagline">Site Control Center</p>
          </div>

          <nav className="ap-nav">
            {NAV_ITEMS.map((item) => (
              <button
                key={item.id}
                className={`ap-nav-item${activeSection === item.id ? " ap-nav-item--active" : ""}`}
                onClick={() => setActiveSection(item.id)}
                type="button"
              >
                <i className={`bx ${item.icon} ap-nav-icon`} />
                <span>{item.label}</span>
                {activeSection === item.id && <span className="ap-nav-pip" />}
              </button>
            ))}
          </nav>

          <div className="ap-sidebar-footer">
            <button className="theme-toggle-btn ap-theme-btn" type="button" onClick={toggleTheme}>
              {darkMode ? <i className="bx bx-sun" /> : <i className="bx bx-moon" />}
            </button>
            <button
              className="settings-action-btn settings-action-btn-danger ap-logout-btn"
              type="button"
              onClick={logout}
            >
              <i className="bx bx-log-out" /> Logout
            </button>
          </div>
        </aside>

        {/* ── Main content ─────────────────────────────────────────────────── */}
        <main className="ap-main">
          {/* Top bar */}
          <header className="ap-topbar">
            <div>
              <h1 className="ap-topbar-title">Admin Dashboard</h1>
              <p className="ap-topbar-sub">
                Website copy is editable here. Projects, counts &amp; screenshots are
                restored from imported GitHub repositories.
              </p>
            </div>
            <div className="ap-topbar-actions">
              {loading && (
                <span className="ap-loading-badge">
                  <i className="bx bx-loader-alt bx-spin" /> Loading…
                </span>
              )}
              {error && (
                <p className="admin-form-error ap-form-error ap-topbar-error">
                  <i className="bx bx-error-circle" /> {error}
                </p>
              )}
            </div>
          </header>

          {/* ── Overview ───────────────────────────────────────────────────── */}
          {sectionVisible("stats") && (
            <div className="ap-section ap-section-enter">
              <div className="ap-section-label">Overview</div>
              <div className="admin-stats-grid ap-stats-grid">
                {statCards.map((card, i) => (
                  <StatCard key={card.label} {...card} index={i} />
                ))}
              </div>
            </div>
          )}

          {/* ── GitHub sync ────────────────────────────────────────────────── */}
          {sectionVisible("github") && (
            <div className="ap-section ap-section-enter">
              <div className="ap-section-label">GitHub Sync</div>
              <EditorCard
                title="GitHub project sync"
                subtitle="Sync all repositories from a GitHub profile into MongoDB and publish them in the Projects section."
                action={
                  <button
                    className="settings-action-btn ap-btn-primary"
                    type="button"
                    onClick={handleGithubSync}
                    disabled={syncing}
                  >
                    {syncing ? (
                      <><i className="bx bx-loader-alt bx-spin" /> Syncing…</>
                    ) : (
                      <><i className="bx bx-refresh" /> Sync Repositories</>
                    )}
                  </button>
                }
              >
                <div className="admin-form-grid">
                  <Field label="GitHub profile URLs" hint="One URL per line" wide charValue={syncProfile}>
                    <textarea
                      className="ap-textarea"
                      value={syncProfile}
                      onChange={(e) => setSyncProfile(e.target.value)}
                      placeholder={"https://github.com/waravignesh3\nhttps://github.com/Madhan457"}
                    />
                  </Field>
                </div>

                <div className="ap-meta-row">
                  <span className="ap-meta-item">
                    <i className="bx bx-link" />
                    Active:{" "}
                    {form.githubProfiles?.length
                      ? form.githubProfiles.join(", ")
                      : "Not configured"}
                  </span>
                  <span className="ap-meta-item">
                    <i className="bx bx-time-five" />
                    Last sync:{" "}
                    {form.lastGithubSyncAt
                      ? new Date(form.lastGithubSyncAt).toLocaleString()
                      : "Not synced yet"}
                  </span>
                </div>

                {(form.githubSyncNotice || syncMessage) && (
                  <p className="ap-sync-notice">
                    <i className="bx bx-info-circle" />
                    {form.githubSyncNotice || syncMessage}
                  </p>
                )}
              </EditorCard>
            </div>
          )}

          {/* ── Home section ───────────────────────────────────────────────── */}
          {sectionVisible("home") && (
            <div className="ap-section ap-section-enter">
              <div className="ap-section-label">Home Section</div>
              <EditorCard title="Home section">
                <div className="admin-form-grid">
                  <Field label="Brand Name" charValue={form.home.brandName} charMax={60}>
                    <input
                      className="ap-input"
                      value={form.home.brandName}
                      onChange={(e) => updateNestedField("home", "brandName", e.target.value)}
                      placeholder="Your brand name"
                    />
                  </Field>
                  <Field label="Tagline" charValue={form.home.tagline} charMax={100}>
                    <input
                      className="ap-input"
                      value={form.home.tagline}
                      onChange={(e) => updateNestedField("home", "tagline", e.target.value)}
                      placeholder="A short, punchy tagline"
                    />
                  </Field>
                  <Field label="Description" wide charValue={form.home.description} charMax={300}>
                    <textarea
                      className="ap-textarea"
                      value={form.home.description}
                      onChange={(e) => updateNestedField("home", "description", e.target.value)}
                      placeholder="Hero section description…"
                    />
                  </Field>
                  <Field label="Status Pills" hint="One pill per line" charValue={form.home.statusPills.join("\n")}>
                    <textarea
                      className="ap-textarea ap-textarea--short"
                      value={form.home.statusPills.join("\n")}
                      onChange={(e) => updateNestedField("home", "statusPills", arrayFromText(e.target.value))}
                      placeholder="Available for work&#10;Open source"
                    />
                  </Field>
                  <Field label="Feature Pills" hint="One pill per line" charValue={form.home.features.join("\n")}>
                    <textarea
                      className="ap-textarea ap-textarea--short"
                      value={form.home.features.join("\n")}
                      onChange={(e) => updateNestedField("home", "features", arrayFromText(e.target.value))}
                      placeholder="React&#10;Node.js"
                    />
                  </Field>
                </div>
              </EditorCard>
            </div>
          )}

          {/* ── About section ──────────────────────────────────────────────── */}
          {sectionVisible("about") && (
            <div className="ap-section ap-section-enter">
              <div className="ap-section-label">About Section</div>
              <EditorCard title="About Us section">
                <div className="admin-form-grid">
                  <Field label="Eyebrow" charValue={form.about.eyebrow} charMax={50}>
                    <input className="ap-input" value={form.about.eyebrow} onChange={(e) => updateNestedField("about", "eyebrow", e.target.value)} placeholder="e.g. WHO WE ARE" />
                  </Field>
                  <Field label="Headline" charValue={form.about.headline} charMax={120}>
                    <input className="ap-input" value={form.about.headline} onChange={(e) => updateNestedField("about", "headline", e.target.value)} placeholder="Section headline" />
                  </Field>
                  <Field label="Description" wide charValue={form.about.description} charMax={400}>
                    <textarea className="ap-textarea" value={form.about.description} onChange={(e) => updateNestedField("about", "description", e.target.value)} placeholder="About section body copy…" />
                  </Field>
                  <Field label="Focus Title" charValue={form.about.focusTitle} charMax={80}>
                    <input className="ap-input" value={form.about.focusTitle} onChange={(e) => updateNestedField("about", "focusTitle", e.target.value)} />
                  </Field>
                  <Field label="Focus Text" charValue={form.about.focusText} charMax={300}>
                    <textarea className="ap-textarea ap-textarea--short" value={form.about.focusText} onChange={(e) => updateNestedField("about", "focusText", e.target.value)} />
                  </Field>
                  <Field label="Process Title" charValue={form.about.processTitle} charMax={80}>
                    <input className="ap-input" value={form.about.processTitle} onChange={(e) => updateNestedField("about", "processTitle", e.target.value)} />
                  </Field>
                  <Field label="Process Text" charValue={form.about.processText} charMax={300}>
                    <textarea className="ap-textarea ap-textarea--short" value={form.about.processText} onChange={(e) => updateNestedField("about", "processText", e.target.value)} />
                  </Field>
                  <Field label="Banner Title" charValue={form.about.bannerTitle} charMax={80}>
                    <input className="ap-input" value={form.about.bannerTitle} onChange={(e) => updateNestedField("about", "bannerTitle", e.target.value)} />
                  </Field>
                  <Field label="Banner Text" charValue={form.about.bannerText} charMax={300}>
                    <textarea className="ap-textarea ap-textarea--short" value={form.about.bannerText} onChange={(e) => updateNestedField("about", "bannerText", e.target.value)} />
                  </Field>
                </div>
              </EditorCard>
            </div>
          )}

          {/* ── Contact section ────────────────────────────────────────────── */}
          {sectionVisible("contact") && (
            <div className="ap-section ap-section-enter">
              <div className="ap-section-label">Contact Section</div>
              <EditorCard title="Contact Us section">
                <div className="admin-form-grid">
                  <Field label="Email" charValue={form.contact.email}>
                    <div className="ap-input-wrap">
                      <i className="bx bx-envelope ap-input-icon" />
                      <input className="ap-input ap-input--icon" value={form.contact.email} onChange={(e) => updateNestedField("contact", "email", e.target.value)} type="email" placeholder="hello@example.com" />
                    </div>
                  </Field>
                  <Field label="Brand Motto" charValue={form.contact.brandMotto} charMax={100}>
                    <input className="ap-input" value={form.contact.brandMotto} onChange={(e) => updateNestedField("contact", "brandMotto", e.target.value)} />
                  </Field>
                  <Field label="Phone Numbers" hint="One per line" charValue={form.contact.phones.join("\n")}>
                    <textarea className="ap-textarea ap-textarea--short" value={form.contact.phones.join("\n")} onChange={(e) => updateNestedField("contact", "phones", arrayFromText(e.target.value))} />
                  </Field>
                  <Field label="Founders" hint="One per line" charValue={form.contact.founders.join("\n")}>
                    <textarea className="ap-textarea ap-textarea--short" value={form.contact.founders.join("\n")} onChange={(e) => updateNestedField("contact", "founders", arrayFromText(e.target.value))} />
                  </Field>
                  <Field label="Address" hint="One line per address row" wide charValue={form.contact.address.join("\n")}>
                    <textarea className="ap-textarea" value={form.contact.address.join("\n")} onChange={(e) => updateNestedField("contact", "address", arrayFromText(e.target.value))} />
                  </Field>
                </div>
              </EditorCard>
            </div>
          )}

          {/* ── Services ───────────────────────────────────────────────────── */}
          {sectionVisible("services") && (
            <div className="ap-section ap-section-enter">
              <div className="ap-section-label">Services</div>
              <EditorCard title="Services">
                <Field label="Services list" hint="One service per line" wide charValue={form.services.join("\n")}>
                  <textarea
                    className="ap-textarea"
                    value={form.services.join("\n")}
                    onChange={(e) =>
                      setForm((cur) => ({ ...cur, services: arrayFromText(e.target.value) }))
                    }
                    placeholder="Web development&#10;Mobile apps&#10;API integrations"
                  />
                </Field>
                {form.services.length > 0 && (
                  <div className="ap-tags-preview">
                    {form.services.map((s) => (
                      <span key={s} className="ap-tag-chip">{s}</span>
                    ))}
                  </div>
                )}
              </EditorCard>
            </div>
          )}

          {/* ── JSON editor ────────────────────────────────────────────────── */}
          {sectionVisible("json") && (
            <div className="ap-section ap-section-enter">
              <div className="ap-section-label">Advanced</div>
              <EditorCard
                title="Advanced JSON editor"
                subtitle="Directly edit the raw website data object. Apply only when the JSON is valid."
                action={
                  <button
                    className="settings-action-btn settings-action-btn-secondary ap-btn-secondary"
                    type="button"
                    onClick={applyJsonDraft}
                  >
                    <i className="bx bx-check" /> Apply JSON
                  </button>
                }
              >
                {jsonError && (
                  <p className="admin-form-error ap-form-error" style={{ marginBottom: 12 }}>
                    <i className="bx bx-error-circle" /> {jsonError}
                  </p>
                )}
                <Field label="Editable website data" wide>
                  <textarea
                    className="admin-json-editor ap-json-editor"
                    value={jsonDraft}
                    onChange={(e) => {
                      setJsonDraft(e.target.value);
                      try { JSON.parse(e.target.value); setJsonError(""); }
                      catch { setJsonError("JSON syntax error — fix before applying."); }
                    }}
                    spellCheck={false}
                  />
                </Field>
              </EditorCard>
            </div>
          )}

          {/* ── Save row (always visible) ───────────────────────────────────── */}
          <div className="admin-save-row ap-save-row">
            {saveSuccess && (
              <span className="ap-save-success">
                <i className="bx bx-check-circle" /> Changes saved!
              </span>
            )}
            <button
              className={`settings-action-btn ap-btn-primary ap-save-btn${saving ? " ap-save-btn--saving" : ""}`}
              type="button"
              onClick={handleSave}
              disabled={saving}
            >
              {saving ? (
                <><i className="bx bx-loader-alt bx-spin" /> Saving…</>
              ) : (
                <><i className="bx bx-save" /> Save Website Changes</>
              )}
            </button>
          </div>
        </main>
      </div>
    </div>
  );
}

export default AdminPanel;