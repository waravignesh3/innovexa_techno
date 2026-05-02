import { useEffect, useMemo, useState } from "react";
import "./App.css";
import { defaultSiteContent, normalizeSiteContent } from "./siteContent.js";
import { API_BASE_URL, API_ENDPOINTS } from "./config.js";

const ADMIN_TOKEN_KEY = "innovex_admin_token";

const arrayFromText = (value) => value.split("\n").map((item) => item.trim()).filter(Boolean);

const getErrorMessage = (error, fallback) => {
  if (error instanceof TypeError) {
    return `Cannot reach the admin server on ${API_BASE_URL}. Start the backend server and try again.`;
  }

  return error.message || fallback;
};

function AdminPanel({ darkMode, toggleTheme, siteContent, onSiteContentSaved }) {
  const [token, setToken] = useState(() => sessionStorage.getItem(ADMIN_TOKEN_KEY) || "");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [overview, setOverview] = useState(null);
  const [jsonDraft, setJsonDraft] = useState("");
  const [syncProfile, setSyncProfile] = useState(() => (siteContent?.githubProfiles?.length
    ? siteContent.githubProfiles.join("\n")
    : "https://github.com/waravignesh3\nhttps://github.com/Madhan457"));
  const [syncMessage, setSyncMessage] = useState("");
  const [form, setForm] = useState(() => normalizeSiteContent(siteContent || defaultSiteContent));

  const statCards = useMemo(() => ([
    { label: "Imported Projects", value: overview?.summary?.totalProjects ?? form.stats.totalProjects, icon: "bx-briefcase-alt-2" },
    { label: "Completed", value: overview?.summary?.completedProjects ?? form.stats.completedProjects, icon: "bx-check-circle" },
    { label: "Projects Live", value: overview?.summary?.liveProjects ?? form.stats.liveProjects, icon: "bx-loader-alt" },
    { label: "Total Views", value: overview?.analytics?.totalViews ?? 0, icon: "bx-show-alt" },
    { label: "Unique Visitors", value: overview?.analytics?.uniqueVisitors ?? 0, icon: "bx-user-pin" },
    { label: "Active Visitors", value: overview?.analytics?.activeVisitors ?? 0, icon: "bx-pulse" },
  ]), [form.stats, overview]);

  useEffect(() => {
    const normalized = normalizeSiteContent(siteContent || defaultSiteContent);
    setForm(normalized);
    setSyncProfile(normalized.githubProfiles?.length
      ? normalized.githubProfiles.join("\n")
      : "https://github.com/waravignesh3\nhttps://github.com/Madhan457");
  }, [siteContent]);

  useEffect(() => {
    const { home, about, contact, services } = form;
    setJsonDraft(JSON.stringify({ home, about, contact, services }, null, 2));
  }, [form]);

  useEffect(() => {
    if (!token) {
      return;
    }

    const loadDashboard = async () => {
      try {
        setLoading(true);
        const response = await fetch(`${API_BASE_URL}${API_ENDPOINTS.adminDashboard}`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        const data = await response.json().catch(() => ({}));
        if (!response.ok) {
          throw new Error(data.message || "Admin session expired");
        }

        const normalized = normalizeSiteContent(data.siteContent);
        setOverview(data.overview);
        setForm(normalized);
        setSyncProfile(normalized.githubProfiles?.length
          ? normalized.githubProfiles.join("\n")
          : "https://github.com/waravignesh3\nhttps://github.com/Madhan457");
        onSiteContentSaved(normalized);
        setError("");
      } catch (loadError) {
        sessionStorage.removeItem(ADMIN_TOKEN_KEY);
        setToken("");
        setError(getErrorMessage(loadError, "Unable to load the admin dashboard"));
      } finally {
        setLoading(false);
      }
    };

    loadDashboard();
  }, [onSiteContentSaved, token]);

  const handleLogin = async (event) => {
    event.preventDefault();
    setError("");

    try {
      setLoading(true);
      const response = await fetch(`${API_BASE_URL}${API_ENDPOINTS.adminLogin}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ password }),
      });

      const data = await response.json().catch(() => ({}));
      if (!response.ok || !data.success) {
        throw new Error(data.message || "Incorrect password");
      }

      sessionStorage.setItem(ADMIN_TOKEN_KEY, data.token);
      setToken(data.token);
      setPassword("");
    } catch (loginError) {
      setError(getErrorMessage(loginError, "Unable to log in"));
    } finally {
      setLoading(false);
    }
  };

  const updateNestedField = (section, field, value) => {
    setForm((current) => ({
      ...current,
      [section]: {
        ...current[section],
        [field]: value,
      },
    }));
  };

  const applyJsonDraft = () => {
    try {
      const parsed = JSON.parse(jsonDraft);
      setForm((current) => normalizeSiteContent({ ...current, ...parsed }));
      setError("");
    } catch {
      setError("JSON editor contains invalid JSON");
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      setError("");
      const payload = {
        home: form.home,
        about: form.about,
        contact: form.contact,
        services: form.services,
      };

      const response = await fetch(`${API_BASE_URL}${API_ENDPOINTS.adminSiteContent}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      const data = await response.json().catch(() => ({}));
      if (!response.ok || !data.success) {
        throw new Error(data.message || "Unable to save changes");
      }

      const savedContent = normalizeSiteContent(data.siteContent);
      setForm(savedContent);
      onSiteContentSaved(savedContent);
      window.dispatchEvent(new Event("innovex-site-updated"));
    } catch (saveError) {
      setError(getErrorMessage(saveError, "Unable to save changes"));
    } finally {
      setSaving(false);
    }
  };

  const handleGithubSync = async () => {
    try {
      setSyncing(true);
      setError("");
      setSyncMessage("");

      const response = await fetch(`${API_BASE_URL}${API_ENDPOINTS.adminGithubSync}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          owners: syncProfile.split("\n").map((value) => value.trim()).filter(Boolean),
        }),
      });

      const data = await response.json().catch(() => ({}));
      if (!response.ok || !data.success) {
        throw new Error(data.message || "Unable to sync GitHub repositories");
      }

      const normalized = normalizeSiteContent(data.siteContent);
      setOverview(data.overview || null);
      setForm(normalized);
      setSyncProfile(normalized.githubProfiles?.length ? normalized.githubProfiles.join("\n") : syncProfile);
      setSyncMessage(data.message || "GitHub repositories synced successfully.");
      onSiteContentSaved(normalized);
      window.dispatchEvent(new Event("innovex-site-updated"));
    } catch (syncError) {
      setError(getErrorMessage(syncError, "Unable to sync GitHub repositories"));
    } finally {
      setSyncing(false);
    }
  };

  if (!token) {
    return (
      <div className={`${darkMode ? "dark-dashboard" : "light-dashboard"} app-shell page-shell`}>
        <div className="admin-panel-page">
          <div className="admin-login-card">
            <div className="admin-login-head">
              <span className="section-chip">Hidden Admin Panel</span>
              <h1>Admin access</h1>
              <p>Enter the admin password to edit website content and sync repository data from your GitHub profile.</p>
            </div>

            <form className="admin-login-form" onSubmit={handleLogin}>
              <label>
                Password
                <input
                  type="password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  placeholder="Enter admin password"
                />
              </label>
              {error && <p className="admin-form-error">{error}</p>}
              <div className="admin-login-actions">
                <button className="settings-action-btn" type="submit" disabled={loading}>
                  {loading ? "Checking..." : "Unlock Admin Panel"}
                </button>
                <button className="theme-toggle-btn" type="button" onClick={toggleTheme}>
                  {darkMode ? <i className="bx bx-sun"></i> : <i className="bx bx-moon"></i>}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`${darkMode ? "dark-dashboard" : "light-dashboard"} app-shell page-shell`}>
      <div className="admin-panel-page">
        <div className="admin-panel-layout">
          <header className="admin-panel-header">
            <div className="admin-panel-copy">
              <span className="section-chip">Site Control Center</span>
              <h1>Admin dashboard</h1>
              <p>Website copy is editable here. Projects, project details, screenshots, and counts are restored from the imported GitHub repositories.</p>
            </div>
            <div className="admin-header-actions">
              <button className="theme-toggle-btn" type="button" onClick={toggleTheme}>
                {darkMode ? <i className="bx bx-sun"></i> : <i className="bx bx-moon"></i>}
              </button>
              <button
                className="settings-action-btn settings-action-btn-danger"
                type="button"
                onClick={() => {
                  sessionStorage.removeItem(ADMIN_TOKEN_KEY);
                  setToken("");
                }}
              >
                Logout
              </button>
            </div>
          </header>

          {loading && <p className="admin-panel-note">Loading admin data...</p>}
          {error && <p className="admin-form-error">{error}</p>}

          <section className="admin-stats-grid">
            {statCards.map((card) => (
              <article className="admin-stat-card" key={card.label}>
                <div className="stat-icon-bx">
                  <i className={`bx ${card.icon}`}></i>
                </div>
                <div className="stat-content">
                  <h3>{card.label}</h3>
                  <p className="stat-number">{card.value}</p>
                </div>
              </article>
            ))}
          </section>

          <section className="admin-editor-card">
            <div className="admin-section-head">
              <div>
                <h2>GitHub project sync</h2>
                <p className="admin-panel-note">
                  Sync all repositories from a GitHub profile into MongoDB and publish them in the Projects section.
                </p>
              </div>
              <button className="settings-action-btn" type="button" onClick={handleGithubSync} disabled={syncing}>
                {syncing ? "Syncing..." : "Sync Repositories"}
              </button>
            </div>
            <div className="admin-form-grid">
              <label className="admin-form-wide">
                GitHub profile URLs
                <textarea
                  value={syncProfile}
                  onChange={(event) => setSyncProfile(event.target.value)}
                  placeholder={"https://github.com/waravignesh3\nhttps://github.com/Madhan457"}
                />
              </label>
            </div>
            <p className="admin-panel-note">
              Active profiles: {form.githubProfiles?.length ? form.githubProfiles.join(", ") : "Not configured"}
            </p>
            <p className="admin-panel-note">
              Last sync: {form.lastGithubSyncAt ? new Date(form.lastGithubSyncAt).toLocaleString() : "Not synced yet"}
            </p>
            {form.githubSyncNotice && <p className="admin-panel-note">{form.githubSyncNotice}</p>}
            {syncMessage && <p className="admin-panel-note">{syncMessage}</p>}
          </section>

          <section className="admin-editor-grid">
            <article className="admin-editor-card">
              <h2>Home section</h2>
              <div className="admin-form-grid">
                <label>
                  Brand Name
                  <input value={form.home.brandName} onChange={(event) => updateNestedField("home", "brandName", event.target.value)} />
                </label>
                <label>
                  Tagline
                  <input value={form.home.tagline} onChange={(event) => updateNestedField("home", "tagline", event.target.value)} />
                </label>
                <label className="admin-form-wide">
                  Description
                  <textarea value={form.home.description} onChange={(event) => updateNestedField("home", "description", event.target.value)} />
                </label>
                <label>
                  Status Pills
                  <textarea value={form.home.statusPills.join("\n")} onChange={(event) => updateNestedField("home", "statusPills", arrayFromText(event.target.value))} />
                </label>
                <label>
                  Feature Pills
                  <textarea value={form.home.features.join("\n")} onChange={(event) => updateNestedField("home", "features", arrayFromText(event.target.value))} />
                </label>
              </div>
            </article>

          <article className="admin-editor-card">
            <h2>About Us section</h2>
            <div className="admin-form-grid">
              <label>
                Eyebrow
                <input value={form.about.eyebrow} onChange={(event) => updateNestedField("about", "eyebrow", event.target.value)} />
              </label>
              <label>
                Headline
                <input value={form.about.headline} onChange={(event) => updateNestedField("about", "headline", event.target.value)} />
              </label>
              <label className="admin-form-wide">
                Description
                <textarea value={form.about.description} onChange={(event) => updateNestedField("about", "description", event.target.value)} />
              </label>
              <label>
                Focus Title
                <input value={form.about.focusTitle} onChange={(event) => updateNestedField("about", "focusTitle", event.target.value)} />
              </label>
              <label>
                Focus Text
                <textarea value={form.about.focusText} onChange={(event) => updateNestedField("about", "focusText", event.target.value)} />
              </label>
              <label>
                Process Title
                <input value={form.about.processTitle} onChange={(event) => updateNestedField("about", "processTitle", event.target.value)} />
              </label>
              <label>
                Process Text
                <textarea value={form.about.processText} onChange={(event) => updateNestedField("about", "processText", event.target.value)} />
              </label>
              <label>
                Banner Title
                <input value={form.about.bannerTitle} onChange={(event) => updateNestedField("about", "bannerTitle", event.target.value)} />
              </label>
              <label>
                Banner Text
                <textarea value={form.about.bannerText} onChange={(event) => updateNestedField("about", "bannerText", event.target.value)} />
              </label>
            </div>
          </article>

          <article className="admin-editor-card">
            <h2>Contact Us section</h2>
            <div className="admin-form-grid">
              <label>
                Email
                <input value={form.contact.email} onChange={(event) => updateNestedField("contact", "email", event.target.value)} />
              </label>
              <label>
                Brand Motto
                <input value={form.contact.brandMotto} onChange={(event) => updateNestedField("contact", "brandMotto", event.target.value)} />
              </label>
              <label>
                Phone Numbers
                <textarea value={form.contact.phones.join("\n")} onChange={(event) => updateNestedField("contact", "phones", arrayFromText(event.target.value))} />
              </label>
              <label>
                Founders
                <textarea value={form.contact.founders.join("\n")} onChange={(event) => updateNestedField("contact", "founders", arrayFromText(event.target.value))} />
              </label>
              <label className="admin-form-wide">
                Address
                <textarea value={form.contact.address.join("\n")} onChange={(event) => updateNestedField("contact", "address", arrayFromText(event.target.value))} />
              </label>
            </div>
          </article>

          <article className="admin-editor-card">
            <h2>Services</h2>
            <label className="admin-form-wide">
              One service per line
              <textarea value={form.services.join("\n")} onChange={(event) => setForm((current) => ({ ...current, services: arrayFromText(event.target.value) }))} />
            </label>
          </article>
        </section>

        <section className="admin-editor-card">
          <div className="admin-section-head">
            <h2>Advanced JSON editor</h2>
            <button className="settings-action-btn settings-action-btn-secondary" type="button" onClick={applyJsonDraft}>
              Apply JSON
            </button>
          </div>
          <label className="admin-form-wide">
            Editable website data
            <textarea className="admin-json-editor" value={jsonDraft} onChange={(event) => setJsonDraft(event.target.value)} />
          </label>
        </section>

        <div className="admin-save-row">
          <button className="settings-action-btn" type="button" onClick={handleSave} disabled={saving}>
            {saving ? "Saving..." : "Save Website Changes"}
          </button>
        </div>
        </div>
      </div>
    </div>
  );
}

export default AdminPanel;
