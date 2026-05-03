import { useEffect, useMemo, useState } from "react";
import { useLocation } from "react-router-dom";
import "./App.css";
import { logout } from "./auth/googleauth.js";
import Projects from "./projects.jsx";
import logo from "./assets/Innovex_Logo.jpeg";
import { summarizeProjects } from "./siteContent.js";
import { API_BASE_URL, API_ENDPOINTS } from "./config.js";

const serviceIcons = [
  "bx-mobile-alt",
  "bx-globe",
  "bx-data",
  "bx-cloud",
  "bx-chip",
  "bx-devices",
  "bx-tachometer",
  "bx-bar-chart-alt-2",
  "bx-slideshow",
  "bx-movie-play",
];

function Dashboard({ darkMode, toggleTheme, reduceMotion, toggleMotion, siteContent, isLoading }) {
  const location = useLocation();
  const [activeSection, setActiveSection] = useState(() => {
    return location.state?.section || localStorage.getItem("innovex_dashboard_section") || "home";
  });
  const [loading, setLoading] = useState(false);
  const [liveFeed, setLiveFeed] = useState(null);
  const [emailModalOpen, setEmailModalOpen] = useState(false);
  const [emailMessage, setEmailMessage] = useState("");
  const [emailError, setEmailError] = useState("");

  useEffect(() => {
    localStorage.setItem("innovex_dashboard_section", activeSection);
    window.dispatchEvent(new Event("innovex-dashboard-section-change"));

    // Reset scroll position to top when section changes
    const contentArea = document.querySelector(".content-area");
    if (contentArea) {
      contentArea.scrollTo({ top: 0, behavior: "auto" });
    }
  }, [activeSection]);

  useEffect(() => {
    if (location.state?.section) {
      setActiveSection(location.state.section);
    }
  }, [location.state]);

  useEffect(() => {
    let mounted = true;

    const loadOverview = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}${API_ENDPOINTS.realtimeOverview}`);
        if (!response.ok) {
          throw new Error("Unable to load realtime overview.");
        }

        const data = await response.json();
        if (mounted) {
          setLiveFeed(data);
        }
      } catch {
        // Keep local UI stable when backend metrics are unavailable.
      }
    };

    loadOverview();
    const intervalId = window.setInterval(loadOverview, 15000);

    return () => {
      mounted = false;
      window.clearInterval(intervalId);
    };
  }, []);

  const metrics = useMemo(
    () => summarizeProjects(siteContent.projects, siteContent.stats),
    [siteContent]
  );

  const displayMetrics = useMemo(() => ({
    totalProjects: metrics.totalProjects,
    completedProjects: metrics.completedProjects,
    liveProjects: metrics.liveProjects,
    totalTeam: 2,
    averageProgress: metrics.averageProgress,
    completionRate: metrics.completionRate,
    releaseWindow: liveFeed?.summary?.releaseWindow ?? "--:--",
    topProject: metrics.topProject,
  }), [metrics, liveFeed]);

  const activityFeed = useMemo(() => liveFeed?.activity ?? [
    {
      id: "fallback-portfolio",
      title: "Project portfolio refreshed",
      meta: `${displayMetrics.totalProjects} tracked workstreams`,
    },
    {
      id: "fallback-live",
      title: "Live projects updated",
      meta: `${displayMetrics.liveProjects} active deliveries`,
    },
    {
      id: "fallback-completion",
      title: "Completion trend updated",
      meta: `${displayMetrics.completionRate}% of projects completed`,
    },
  ], [liveFeed, displayMetrics]);

  const sectionMeta = {
    home: {
      title: "Home",
      eyebrow: "Workspace overview",
      accent: "aurora",
    },
    dashboard: {
      title: "Dashboard",
      eyebrow: "Performance pulse",
      accent: "ocean",
    },
    projects: {
      title: "Projects",
      eyebrow: "Execution board",
      accent: "sunset",
    },
    about: {
      title: "About Us",
      eyebrow: "Who we are",
      accent: "violet",
    },
    contact: {
      title: "Contact Us",
      eyebrow: "How to reach us",
      accent: "violet",
    },
  };

  const currentSection = sectionMeta[activeSection] || sectionMeta.home;

  const handleLogout = async () => {
    try {
      setLoading(true);
      await logout();
      window.location.href = "/";
    } catch (err) {
      console.error("Logout failed:", err);
      setLoading(false);
    }
  };

  const openEmailModal = () => {
    setEmailError("");
    setEmailModalOpen(true);
  };

  const closeEmailModal = () => {
    setEmailModalOpen(false);
    setEmailMessage("");
    setEmailError("");
  };

  const handleSendEmail = () => {
    const trimmedMessage = emailMessage.trim();

    if (!trimmedMessage) {
      setEmailError("Please write a message before sending.");
      return;
    }

    const gmailComposeUrl = `https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(siteContent.contact.email)}&su=${encodeURIComponent("New message from Innovexa Techno website")}&body=${encodeURIComponent(trimmedMessage)}`;
    window.open(gmailComposeUrl, "_blank", "noopener,noreferrer");
    closeEmailModal();
  };

  const renderSkeletonSection = () => {
    if (activeSection === "projects") {
      return (
        <section className="section-content dashboard-skeleton-section" aria-hidden="true">
          <div className="dashboard-skeleton-head">
            <div className="ui-skeleton ui-skeleton-text skeleton-chip-line"></div>
            <div className="ui-skeleton ui-skeleton-title skeleton-panel-title"></div>
          </div>
          <div className="projects-grid projects-grid-skeleton">
            {[0, 1, 2].map((item) => (
              <div className="project-card project-card-skeleton" key={item}>
                <div className="project-skeleton-media"></div>
                <div className="project-skeleton-line project-skeleton-title"></div>
                <div className="project-skeleton-line"></div>
                <div className="project-skeleton-line project-skeleton-short"></div>
              </div>
            ))}
          </div>
        </section>
      );
    }

    if (activeSection === "contact") {
      return (
        <section className="section-content dashboard-skeleton-section" aria-hidden="true">
          <div className="dashboard-skeleton-head">
            <div className="ui-skeleton ui-skeleton-text skeleton-chip-line"></div>
            <div className="ui-skeleton ui-skeleton-title skeleton-panel-title"></div>
          </div>
          <div className="contact-card skeleton-card">
            <div className="dashboard-skeleton-stack">
              {[0, 1, 2, 3].map((item) => (
                <div className="dashboard-skeleton-row" key={item}>
                  <div className="ui-skeleton ui-skeleton-icon"></div>
                  <div className="dashboard-skeleton-copy">
                    <div className="ui-skeleton ui-skeleton-text skeleton-row-label"></div>
                    <div className="ui-skeleton ui-skeleton-text skeleton-row-value"></div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      );
    }

    return (
      <section className="section-content dashboard-skeleton-section" aria-hidden="true">
        <div className="welcome-card skeleton-card">
          <div className="ui-skeleton ui-skeleton-title skeleton-panel-title"></div>
          <div className="ui-skeleton ui-skeleton-text skeleton-panel-copy"></div>
          <div className="ui-skeleton ui-skeleton-text skeleton-panel-copy skeleton-panel-copy-short"></div>
        </div>

        <div className="stats-grid">
          {[0, 1, 2, 3].map((item) => (
            <div className="stat-card skeleton-card" key={item}>
              <div className="ui-skeleton ui-skeleton-icon"></div>
              <div className="stat-content skeleton-stat-copy">
                <div className="ui-skeleton ui-skeleton-text skeleton-card-label"></div>
                <div className="ui-skeleton ui-skeleton-text skeleton-card-value"></div>
              </div>
            </div>
          ))}
        </div>

        <div className="analytics-grid">
          {[0, 1].map((item) => (
            <div className="analytics-card skeleton-card" key={item}>
              <div className="ui-skeleton ui-skeleton-text skeleton-chip-line"></div>
              <div className="ui-skeleton ui-skeleton-title skeleton-analytics-title"></div>
              <div className="ui-skeleton ui-skeleton-text skeleton-panel-copy"></div>
              <div className="ui-skeleton ui-skeleton-text skeleton-panel-copy skeleton-panel-copy-short"></div>
            </div>
          ))}
        </div>
      </section>
    );
  };

  return (
    <div
      className={`${darkMode ? "dark-dashboard" : "light-dashboard"} app-shell ${reduceMotion ? "motion-reduced" : ""}`}
      data-accent={currentSection.accent}
    >
      <div className="dashboard-container">
          <aside className="sidebar">
            <div className="sidebar-header">
              <div className="sidebar-brand">
                <img src={logo} alt="Innovexa Techno logo" className="sidebar-brand-logo" />
                <h2 className="sidebar-logo">
                  <span className="sidebar-logo-ix">Innovexa</span>
                  <span className="sidebar-logo-techno"> Techno</span>
                </h2>
              </div>
            </div>

          <nav className="sidebar-nav">
            <button className={`nav-item ${activeSection === "home" ? "active" : ""}`} onClick={() => setActiveSection("home")}>
              <i className="bx bx-home-heart nav-icon-bx"></i>
              <span className="nav-text">Home</span>
              {activeSection === "home" && <span className="nav-indicator"></span>}
            </button>

            <button className={`nav-item ${activeSection === "dashboard" ? "active" : ""}`} onClick={() => setActiveSection("dashboard")}>
              <i className="bx bxs-dashboard nav-icon-bx"></i>
              <span className="nav-text">Dashboard</span>
              {activeSection === "dashboard" && <span className="nav-indicator"></span>}
            </button>

            <button className={`nav-item ${activeSection === "projects" ? "active" : ""}`} onClick={() => setActiveSection("projects")}>
              <i className="bx bxs-folder nav-icon-bx"></i>
              <span className="nav-text">Projects</span>
              {activeSection === "projects" && <span className="nav-indicator"></span>}
            </button>

            <button className={`nav-item ${activeSection === "about" ? "active" : ""}`} onClick={() => setActiveSection("about")}>
              <i className="bx bx-buildings nav-icon-bx"></i>
              <span className="nav-text">About Us</span>
              {activeSection === "about" && <span className="nav-indicator"></span>}
            </button>

            <button className={`nav-item ${activeSection === "contact" ? "active" : ""}`} onClick={() => setActiveSection("contact")}>
              <i className="bx bx-envelope nav-icon-bx"></i>
              <span className="nav-text">Contact Us</span>
              {activeSection === "contact" && <span className="nav-indicator"></span>}
            </button>
          </nav>

          <div className="sidebar-footer">
            <button className="btn-logout" onClick={handleLogout} disabled={loading}>
              <i className="bx bx-log-out"></i>
              {loading ? "Logging out..." : "Logout"}
            </button>
          </div>
        </aside>

        <main className="dashboard-content">
          <header className="dashboard-header">
            <div className="header-left">
              <span className="page-eyebrow">{currentSection.eyebrow}</span>
              <h1 className="page-title">{currentSection.title}</h1>
            </div>
            <div className="header-right">
              <button className="theme-toggle-btn" onClick={toggleTheme}>
                {darkMode ? <i className="bx bx-sun"></i> : <i className="bx bx-moon"></i>}
              </button>
            </div>
          </header>

          <div className="content-area">
            {isLoading ? (
              renderSkeletonSection()
            ) : (
            <div className="section-transition" key={activeSection}>
              {activeSection === "home" && (
                <section className="section-content home-dashboard-section">
                  <div className="welcome-card welcome-card-hero">
                    <span className="section-chip">Innovexa command center</span>
                    <h2>{siteContent.home.tagline}</h2>
                    <p>{siteContent.home.description}</p>
                    <div className="hero-action-row">
                      <button className="settings-action-btn" onClick={() => setActiveSection("dashboard")}>
                        Open Dashboard
                      </button>
                      <button className="settings-action-btn settings-action-btn-secondary" onClick={() => setActiveSection("projects")}>
                        Our Projects
                      </button>
                    </div>
                  </div>

                  <div className="stats-grid">
                    <div className="stat-card">
                      <div className="stat-icon-bx">
                        <i className="bx bx-briefcase-alt-2"></i>
                      </div>
                      <div className="stat-content">
                        <h3>Projects Live</h3>
                        <p className="stat-number">{displayMetrics.completedProjects}</p>
                      </div>
                    </div>

                    <div className="stat-card">
                      <div className="stat-icon-bx">
                        <i className="bx bx-trending-up"></i>
                      </div>
                      <div className="stat-content">
                        <h3>Average Progress</h3>
                        <p className="stat-number">{displayMetrics.averageProgress}%</p>
                      </div>
                    </div>

                    <div className="stat-card">
                      <div className="stat-icon-bx">
                        <i className="bx bx-palette"></i>
                      </div>
                      <div className="stat-content">
                        <h3>Theme Mode</h3>
                        <p className="stat-number stat-number-sm">{darkMode ? "Dark" : "Light"}</p>
                      </div>
                    </div>

                    <div className="stat-card">
                      <div className="stat-icon-bx">
                        <i className="bx bx-run"></i>
                      </div>
                      <div className="stat-content">
                        <h3>Motion Profile</h3>
                        <p className="stat-number stat-number-sm">{reduceMotion ? "Reduced" : "Dynamic"}</p>
                      </div>
                    </div>
                  </div>

                  <div className="analytics-grid">
                    <div className="analytics-card">
                      <span className="settings-label">Quick controls</span>
                      <br />
                      <br />
                      <h3>Personalize this workspace</h3>
                      <p>Switch theme and motion settings anytime while the admin panel handles your site content changes.</p>
                      <div className="settings-actions-stack">
                        <button className="settings-action-btn" onClick={toggleTheme}>
                          {darkMode ? "Use Light Theme" : "Use Dark Theme"}
                        </button>
                        <button className="settings-action-btn settings-action-btn-secondary" onClick={toggleMotion}>
                          {reduceMotion ? "Enable Full Motion" : "Reduce Motion"}
                        </button>
                      </div>
                    </div>

                    <div className="analytics-card">
                      <span className="settings-label">Spotlight</span>
                      <br />
                      <br />
                      <h3>{displayMetrics.topProject ? displayMetrics.topProject.name : "No showcase project yet"}</h3>
                      <p>
                        {displayMetrics.topProject
                          ? `${displayMetrics.topProject.progress}% complete with ${displayMetrics.topProject.team} teammates driving delivery forward.`
                          : "Add or edit a project in the hidden admin panel to feature it here."}
                      </p>
                    </div>
                  </div>
                </section>
              )}

              {activeSection === "dashboard" && (
                <section className="section-content dashboard-section">
                  <div className="welcome-card">
                    <h2>{siteContent.home.brandName}</h2>
                    <p>{siteContent.home.description}</p>
                  </div>

                    <div className="dashboard-spotlight-grid">
                      <div className="spotlight-card spotlight-card-primary">
                        <span className="spotlight-label">Top Delivery Track</span>
                        <h3>{displayMetrics.topProject ? displayMetrics.topProject.name : "No active project yet"}</h3>
                      <p>
                        {displayMetrics.topProject
                          ? `${displayMetrics.topProject.progress}% complete with ${displayMetrics.topProject.team} team members contributing.`
                          : "Create a project to start tracking delivery momentum."}
                        </p>
                      </div>
                    </div>

                    <div className="about-motive-block">
                      <div className="about-motive-head">
                        <span className="section-chip">Partnership values</span>
                        <h2>Motive, Vision &amp; Mission</h2>
                        <p>{siteContent.about.description}</p>
                      </div>

                      <div className="about-motive-grid">
                        <article className="about-motive-card">
                          <div className="about-motive-icon" aria-hidden="true">
                            <i className="bx bxs-bolt-circle"></i>
                          </div>
                          <span className="about-motive-label">Motive</span>
                          <h3>{siteContent.about.focusTitle}</h3>
                          <p>{siteContent.about.focusText}</p>
                        </article>

                        <article className="about-motive-card">
                          <div className="about-motive-icon" aria-hidden="true">
                            <i className="bx bx-show-alt"></i>
                          </div>
                          <span className="about-motive-label">Vision</span>
                          <h3>{siteContent.about.headline}</h3>
                          <p>{siteContent.about.bannerText}</p>
                        </article>

                        <article className="about-motive-card">
                          <div className="about-motive-icon" aria-hidden="true">
                            <i className="bx bx-target-lock"></i>
                          </div>
                          <span className="about-motive-label">Mission</span>
                          <h3>{siteContent.about.processTitle}</h3>
                          <p>{siteContent.about.processText}</p>
                        </article>
                      </div>
                    </div>

                    <div className="stats-grid">
                      <div className="stat-card">
                        <div className="stat-icon-bx">
                          <i className="bx bx-bar-chart-alt-2"></i>
                      </div>
                      <div className="stat-content">
                        <h3>Total Projects</h3>
                        <p className="stat-number">{displayMetrics.totalProjects}</p>
                      </div>
                    </div>

                    <div className="stat-card">
                      <div className="stat-icon-bx">
                        <i className="bx bx-check-circle"></i>
                      </div>
                      <div className="stat-content">
                        <h3>Completed</h3>
                        <p className="stat-number">{displayMetrics.completedProjects}</p>
                      </div>
                    </div>

                    <div className="stat-card">
                      <div className="stat-icon-bx">
                        <i className="bx bx-loader-alt"></i>
                      </div>
                      <div className="stat-content">
                        <h3>Projects In Progress</h3>
                        <p className="stat-number">{displayMetrics.liveProjects}</p>
                      </div>
                    </div>

                    <div className="stat-card">
                      <div className="stat-icon-bx">
                        <i className="bx bxs-group"></i>
                      </div>
                      <div className="stat-content">
                        <h3>Team Members</h3>
                        <p className="stat-number">{displayMetrics.totalTeam}</p>
                      </div>
                    </div>
                  </div>

                  <div className="recent-activity">
                    <div className="recent-activity-head">
                      <h3>Recent Activity</h3>
                      <span className="analytics-chip">Next release {displayMetrics.releaseWindow}</span>
                    </div>
                    <div className="activity-list">
                      {activityFeed.map((item, index) => (
                        <div className="activity-item" key={item.id}>
                          <span className="activity-icon-bx">
                            <i className={index === 0 ? "bx bxs-rocket" : index === 1 ? "bx bxs-user-plus" : "bx bxs-bolt-circle"}></i>
                          </span>
                          <div className="activity-details">
                            <p className="activity-title">{item.title}</p>
                            <p className="activity-time">{item.meta}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </section>
              )}

              {activeSection === "projects" && <Projects siteContent={siteContent} />}

              {activeSection === "about" && (
                <section className="section-content company-section">
                  <div className="company-hero-card">
                    <div className="company-hero-copy">
                      <span className="section-chip">{siteContent.about.eyebrow}</span>
                      <h2>{siteContent.about.headline}</h2>
                      <p>{siteContent.about.description}</p>
                    </div>
                    <div className="company-logo-panel">
                      <img src={logo} alt="Innovexa Techno logo" className="company-logo-image" />
                    </div>
                  </div>

                    <div className="analytics-grid">
                      <div className="analytics-card">
                        <span className="settings-label">Our focus</span>
                        <h3>{siteContent.about.focusTitle}</h3>
                        <p>{siteContent.about.focusText}</p>
                    </div>
                    <div className="analytics-card">
                      <span className="settings-label">How we work</span>
                      <h3>{siteContent.about.processTitle}</h3>
                        <p>{siteContent.about.processText}</p>
                      </div>
                    </div>

                    <div className="services-section-head">
                      <span className="section-chip">What we do</span>
                      <h2>Solutions shaped around your idea</h2>
                    <p>From engineering to creative support, we take care of your product like it is our own.</p>
                  </div>

                  <div className="services-grid">
                    {siteContent.services.map((service, index) => (
                      <article className="service-tile" key={service}>
                        <div className="service-icon-wrap">
                          <i className={`bx ${serviceIcons[index % serviceIcons.length]}`}></i>
                        </div>
                        <h3>{service}</h3>
                      </article>
                    ))}
                  </div>

                  <div className="service-banner">
                    <div className="service-banner-icon">
                      <i className="bx bx-link-alt"></i>
                    </div>
                    <div>
                      <h3>{siteContent.about.bannerTitle}</h3>
                      <p>{siteContent.about.bannerText}</p>
                    </div>
                  </div>
                </section>
              )}

              {activeSection === "contact" && (
                <section className="section-content contact-section">
                  <div className="contact-section-head">
                    <span className="section-chip">Contact Us</span>
                    <h2>Let&apos;s build something together</h2>
                    <p>{siteContent.about.bannerText}</p>
                  </div>

                  <div className="contact-card">
                    <div className="contact-list">
                      <div className="contact-row">
                        <div className="contact-icon-wrap">
                          <i className="bx bx-envelope"></i>
                        </div>
                        <div className="contact-copy">
                          <span className="contact-label">Email</span>
                          <p>{siteContent.contact.email}</p>
                          <button className="contact-email-btn" type="button" onClick={openEmailModal}>
                            Write Message
                          </button>
                        </div>
                      </div>

                      <div className="contact-row">
                        <div className="contact-icon-wrap">
                          <i className="bx bx-phone-call"></i>
                        </div>
                        <div className="contact-copy">
                          <span className="contact-label">Phone Number</span>
                          {siteContent.contact.phones.map((line) => (
                            <p key={line}>{line}</p>
                          ))}
                        </div>
                      </div>

                      <div className="contact-row">
                        <div className="contact-icon-wrap">
                          <i className="bx bx-group"></i>
                        </div>
                        <div className="contact-copy">
                          <span className="contact-label">Founder</span>
                          {siteContent.contact.founders.map((line) => (
                            <p key={line}>{line}</p>
                          ))}
                        </div>
                      </div>

                      <div className="contact-row">
                        <div className="contact-icon-wrap">
                          <i className="bx bx-map"></i>
                        </div>
                        <div className="contact-copy">
                          <span className="contact-label">Address</span>
                          {siteContent.contact.address.map((line) => (
                            <p key={line}>{line}</p>
                          ))}
                        </div>
                      </div>
                    </div>

                    <div className="contact-brand-block">
                      <img src={logo} alt="Innovexa Techno logo" className="contact-logo" />
                      <div className="contact-brand-copy">
                        <h2>{siteContent.home.brandName.toUpperCase()}</h2>
                        <span>{siteContent.contact.brandMotto}</span>
                      </div>
                    </div>
                  </div>
                </section>
                )}
              </div>
            )}
          </div>
        </main>
      </div>

      {emailModalOpen && (
        <div className="contact-modal-overlay" role="presentation" onClick={closeEmailModal}>
          <div
            className="contact-email-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="contact-email-title"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="contact-email-head">
              <div>
                <span className="section-chip">Email Innovexa</span>
                <h3 id="contact-email-title">Send a message</h3>
              </div>
              <button className="contact-email-close" type="button" onClick={closeEmailModal} aria-label="Close email popup">
                <i className="bx bx-x"></i>
              </button>
            </div>

            <label className="contact-email-label" htmlFor="contact-email-message">
              Message
            </label>
            <textarea
              id="contact-email-message"
              className="contact-email-textarea"
              value={emailMessage}
              onChange={(event) => {
                setEmailMessage(event.target.value);
                if (emailError) {
                  setEmailError("");
                }
              }}
              placeholder="Write your message here..."
            />

            {emailError && <p className="contact-email-error">{emailError}</p>}

            <div className="contact-email-actions">
              <button className="settings-action-btn settings-action-btn-secondary" type="button" onClick={closeEmailModal}>
                Cancel
              </button>
              <button className="settings-action-btn" type="button" onClick={handleSendEmail}>
                Send to Gmail
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Dashboard;
