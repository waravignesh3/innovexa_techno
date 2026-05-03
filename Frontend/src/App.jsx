import { lazy, Suspense, useCallback, useEffect, useMemo, useState } from 'react'
import { Routes, useNavigate, Route, useLocation } from 'react-router-dom'
import './App.css'
import logo from './assets/Innovex_Logo.jpeg'
import AdminPanel from './adminPanel.jsx'
import { defaultSiteContent, fetchSiteContent, fetchSiteContentWithCache, normalizeSiteContent, summarizeProjects } from './siteContent.js'
import { PROJECT_SYNC_INTERVAL_MS } from './projectData.js'
import { API_BASE_URL, API_ENDPOINTS } from './config.js'

const Dashboard = lazy(() => import('./dashboard.jsx'))
const ProjectDetails = lazy(() => import('./projectDetails.jsx'))

const LAST_ROUTE_KEY = "innovex_last_route";
const VIEWER_KEY = "innovex_viewer_id";

function RouteFallback() {
  return <div className="route-fallback" aria-hidden="true" />
}

function AppChrome({ message }) {
  const location = useLocation();
  const [sectionRevealVersion, setSectionRevealVersion] = useState(0);
  const [scrollProgress, setScrollProgress] = useState(0);
  const [showBackToTop, setShowBackToTop] = useState(false);

  useEffect(() => {
    const syncScrollState = () => {
      const scrollTarget = document.querySelector(".content-area") || document.documentElement;
      const scrollTop = scrollTarget === document.documentElement
        ? window.scrollY || document.documentElement.scrollTop
        : scrollTarget.scrollTop;
      const scrollHeight = scrollTarget === document.documentElement
        ? document.documentElement.scrollHeight - window.innerHeight
        : scrollTarget.scrollHeight - scrollTarget.clientHeight;
      const progress = scrollHeight > 0 ? Math.min((scrollTop / scrollHeight) * 100, 100) : 0;

      setScrollProgress(progress);
      setShowBackToTop(scrollTop > 360);
    };

    const contentArea = document.querySelector(".content-area");
    syncScrollState();
    window.addEventListener("scroll", syncScrollState, { passive: true });
    contentArea?.addEventListener("scroll", syncScrollState, { passive: true });
    window.addEventListener("resize", syncScrollState);

    return () => {
      window.removeEventListener("scroll", syncScrollState);
      contentArea?.removeEventListener("scroll", syncScrollState);
      window.removeEventListener("resize", syncScrollState);
    };
  }, [location.pathname]);

  useEffect(() => {
    const handleSectionChange = () => {
      setSectionRevealVersion((prev) => prev + 1);
    };

    window.addEventListener("innovex-dashboard-section-change", handleSectionChange);
    return () => window.removeEventListener("innovex-dashboard-section-change", handleSectionChange);
  }, []);

  useEffect(() => {
    const revealTargets = document.querySelectorAll(
      ".section-content, .welcome-card, .stat-card, .analytics-card, .spotlight-card, .service-tile, .contact-card, .project-card"
    );

    if (!revealTargets.length) {
      return undefined;
    }

    const rootElement = document.querySelector(".content-area");

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-revealed");
            if (entry.target.classList.contains("project-card")) {
              entry.target.classList.add("project-card-visible");
            }
            observer.unobserve(entry.target);
          }
        });
      },
      {
        threshold: 0.05,
        root: rootElement || null,
        rootMargin: "0px 0px 50px 0px", // Load slightly before it enters viewport
      }
    );

    revealTargets.forEach((target) => {
      if (!target.classList.contains("is-revealed")) {
        observer.observe(target);
      }
    });

    return () => observer.disconnect();
  }, [location.pathname, sectionRevealVersion]);

  const scrollToTop = () => {
    const scrollTarget = document.querySelector(".content-area");
    if (scrollTarget) {
      scrollTarget.scrollTo({ top: 0, behavior: "auto" });
      return;
    }

    window.scrollTo({ top: 0, behavior: "auto" });
  };

  return (
    <>
      <div className="scroll-progress" aria-hidden="true">
        <span style={{ transform: `scaleX(${scrollProgress / 100})` }}></span>
      </div>
      <button
        className={`back-to-top ${showBackToTop ? "visible" : ""}`}
        type="button"
        onClick={scrollToTop}
        aria-label="Back to top"
      >
        <i className="bx bx-up-arrow-alt"></i>
      </button>
      <div className={`app-toast ${message ? "visible" : ""}`} role="status" aria-live="polite">
        <i className="bx bx-check-circle"></i>
        <span>{message}</span>
      </div>
    </>
  );
}

function Home({ darkMode, toggleTheme, reduceMotion, orientation, siteContent, isLoading }) {
  const navigate = useNavigate();
  const metrics = useMemo(
    () => summarizeProjects(siteContent.projects, siteContent.stats),
    [siteContent]
  );
  const lastSyncLabel = useMemo(() => {
    if (!siteContent.lastGithubSyncAt) {
      return `Auto refresh every ${Math.round(PROJECT_SYNC_INTERVAL_MS / 1000)} sec`;
    }

    const date = new Date(siteContent.lastGithubSyncAt);
    if (Number.isNaN(date.getTime())) {
      return `Auto refresh every ${Math.round(PROJECT_SYNC_INTERVAL_MS / 1000)} sec`;
    }

    return `Last sync ${date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`;
  }, [siteContent.lastGithubSyncAt]);

  if (isLoading) {
    return (
      <div className={`${darkMode ? 'dark' : 'light'} app-shell landing-shell orientation-${orientation} ${reduceMotion ? 'motion-reduced' : ''}`}>
        <div className="home">
          <button className='them' onClick={() => toggleTheme()} aria-label={darkMode ? "Switch to light mode" : "Switch to dark mode"}>
            {darkMode ? <i className='bx bx-sun'></i> : <i className='bx bx-moon'></i>}
          </button>

          <div className="orb orb-1"></div>
          <div className="orb orb-2"></div>
          <div className="orb orb-3"></div>

          <div className="home-content skeleton-shell" aria-hidden="true">
            <div className="logo-wrapper skeleton-logo-wrapper">
              <div className="ui-skeleton ui-skeleton-circle skeleton-logo-core"></div>
            </div>

            <div className="ui-skeleton ui-skeleton-title skeleton-home-title"></div>
            <div className="ui-skeleton ui-skeleton-text skeleton-home-subtitle"></div>
            <div className="ui-skeleton ui-skeleton-text skeleton-home-copy"></div>
            <div className="ui-skeleton ui-skeleton-text skeleton-home-copy skeleton-home-copy-short"></div>

            <div className="skeleton-pill-row">
              <div className="ui-skeleton ui-skeleton-pill"></div>
              <div className="ui-skeleton ui-skeleton-pill"></div>
              <div className="ui-skeleton ui-skeleton-pill"></div>
            </div>

            <div className="ui-skeleton ui-skeleton-button skeleton-home-button"></div>

            <div className="hero-insights skeleton-hero-insights">
              {[0, 1, 2, 3].map((item) => (
                <div className="hero-insight-card skeleton-card" key={item}>
                  <div className="ui-skeleton ui-skeleton-text skeleton-card-label"></div>
                  <div className="ui-skeleton ui-skeleton-text skeleton-card-value"></div>
                </div>
              ))}
            </div>

            <div className="skeleton-pill-row">
              <div className="ui-skeleton ui-skeleton-pill ui-skeleton-pill-wide"></div>
              <div className="ui-skeleton ui-skeleton-pill"></div>
            </div>

            <div className="features skeleton-features">
              {[0, 1, 2].map((item) => (
                <div className="feature-item skeleton-feature-item" key={item}>
                  <div className="ui-skeleton ui-skeleton-icon"></div>
                  <div className="ui-skeleton ui-skeleton-text skeleton-feature-text"></div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`${darkMode ? 'dark' : 'light'} app-shell landing-shell orientation-${orientation} ${reduceMotion ? 'motion-reduced' : ''}`}>
      <div className="home">
        <button className='them' onClick={() => toggleTheme()} aria-label={darkMode ? "Switch to light mode" : "Switch to dark mode"}>
          {darkMode ? <i className='bx bx-sun'></i> : <i className='bx bx-moon'></i>}
        </button>

        <div className="orb orb-1"></div>
        <div className="orb orb-2"></div>
        <div className="orb orb-3"></div>

        <div className="home-content">
          <div className="logo-wrapper">
            <span className="logo-orbit logo-orbit-primary" aria-hidden="true"></span>
            <span className="logo-orbit logo-orbit-secondary" aria-hidden="true"></span>
            <span className="logo-core-glow" aria-hidden="true"></span>
            <img className="innovexlogo" src={logo} alt="Innovexa Techno logo" loading="eager" decoding="async" />
            <div className="logo-ring"></div>
          </div>

          <h1 className="home-title">
            <span className="title-innovexa">{siteContent.home.brandName.split(" ")[0] || "Innovexa"}</span>
            <span className="title-techno"> {siteContent.home.brandName.split(" ").slice(1).join(" ") || "Techno"}</span>
          </h1>
          <p className="home-subtitle">{siteContent.home.tagline}</p>

          <p className="home-description">
            {siteContent.home.description}
          </p>

          <div className="home-status-strip">
            {siteContent.home.statusPills.map((pill, index) => (
              <div className={`status-pill ${index === 0 ? "status-pill-live" : ""}`} key={pill}>
                {index === 0 && <span className="status-dot"></span>}
                {pill}
              </div>
            ))}
          </div>

          <button
            className="btn-cta"
            onClick={() => navigate("/dashboard", { state: { section: "home" } })}
          >
            <span className="btn-text">Get Started</span>
            <i className='bx bx-right-arrow-alt btn-arrow-icon'></i>
          </button>

          <div className="hero-insights">
            <div className="hero-insight-card">
              <span className="hero-insight-label">Projects Live</span>
              <strong>{metrics.completedProjects} completed builds</strong>
            </div>
            <div className="hero-insight-card">
              <span className="hero-insight-label">In Progress</span>
              <strong>{metrics.liveProjects} active projects</strong>
            </div>
            <div className="hero-insight-card">
              <span className="hero-insight-label">Average Progress</span>
              <strong>{metrics.averageProgress}% live completion</strong>
            </div>
            <div className="hero-insight-card">
              <span className="hero-insight-label">Repo Coverage</span>
              <strong>{metrics.repoCoverage}/{metrics.totalProjects} linked repos</strong>
            </div>
          </div>

          <div className="home-realtime-strip">
            <div className="home-realtime-pill">
              <i className='bx bx-refresh'></i>
              <span>{lastSyncLabel}</span>
            </div>
            <div className="home-realtime-pill">
              <i className='bx bx-layout'></i>
              <span>{orientation === "portrait" ? "Portrait ready" : "Landscape ready"}</span>
            </div>
          </div>

          <div className="features">
            {siteContent.home.features.map((feature, index) => (
              <div className="feature-item" key={feature}>
                <i className={`bx ${index === 0 ? "bxs-bolt" : index === 1 ? "bxs-shield-alt-2" : "bxs-rocket"} feature-icon`}></i>
                <span className="feature-text">{feature}</span>
              </div>
            ))}
          </div>
        </div>

        <section id="motive-section" className="section-content motive-section" aria-labelledby="motive-section-title">
          <div className="motive-section-backdrop" aria-hidden="true">
            <span className="motive-backdrop-orb motive-backdrop-orb-a"></span>
            <span className="motive-backdrop-orb motive-backdrop-orb-b"></span>
          </div>

          <div className="motive-section-head">
            <span className="motive-section-eyebrow">Our Foundation</span>
            <h2 id="motive-section-title">Our Motive, Vision &amp; Mission</h2>
            <p>
              We build with clarity, care, and momentum so every digital product feels useful today
              and ready for what comes next.
            </p>
          </div>

          <div className="motive-grid">
            <article className="motive-card motive-card-motive">
              <div className="motive-card-icon" aria-hidden="true">🔥</div>
              <span className="motive-card-kicker">Motive</span>
              <h3>{siteContent.about.focusTitle}</h3>
              <p>{siteContent.about.focusText}</p>
            </article>

            <article className="motive-card motive-card-vision">
              <div className="motive-card-icon" aria-hidden="true">👁️</div>
              <span className="motive-card-kicker">Vision</span>
              <h3>{siteContent.about.headline}</h3>
              <p>{siteContent.about.description}</p>
            </article>

            <article className="motive-card motive-card-mission">
              <div className="motive-card-icon" aria-hidden="true">🎯</div>
              <span className="motive-card-kicker">Mission</span>
              <h3>{siteContent.about.processTitle}</h3>
              <p>{siteContent.about.processText}</p>
            </article>
          </div>
        </section>
      </div>
    </div>
  )
}

function App() {
  const location = useLocation();
  const navigate = useNavigate();
  const [darkMode, setDarkMode] = useState(() => {
    const saved = localStorage.getItem("darkMode");
    return saved === "true" ? true : false;
  });
  const [reduceMotion, setReduceMotion] = useState(() => {
    const saved = localStorage.getItem("innovex_reduce_motion");
    return saved === "true";
  });
  const [orientation, setOrientation] = useState(() =>
    window.innerWidth >= window.innerHeight ? "landscape" : "portrait"
  );

  // ─── Instant cache-first loading ─────────────────────────────────────────
  // On mount: read localStorage cache immediately so UI never starts blank.
  // Then fetch fresh data in background and update.
  const [siteContent, setSiteContent] = useState(() => {
    const { cached } = fetchSiteContentWithCache();
    return cached || normalizeSiteContent(defaultSiteContent);
  });
  // isLoading = true only when we have NO cached data AND are still fetching
  const [siteLoading, setSiteLoading] = useState(() => {
    const { cached } = fetchSiteContentWithCache();
    return cached === null; // false when cache exists
  });
  const [siteContentReady, setSiteContentReady] = useState(() => {
    const { cached } = fetchSiteContentWithCache();
    return cached !== null;
  });
  const [toastMessage, setToastMessage] = useState("");

  const handleSiteContentSaved = useCallback((content) => {
    setSiteContent(normalizeSiteContent(content));
    window.dispatchEvent(new Event("innovex-site-updated"));
  }, []);

  useEffect(() => {
    window.dispatchEvent(new Event("innovex-dashboard-section-change"));
  }, [location.pathname]);

  const toggleTheme = () => {
    setDarkMode(prev => {
      const next = !prev;
      localStorage.setItem("darkMode", next);
      setToastMessage(`${next ? "Dark" : "Light"} mode enabled`);
      return next;
    });
  };

  const toggleMotion = () => {
    setReduceMotion((prev) => {
      localStorage.setItem("innovex_reduce_motion", (!prev).toString());
      setToastMessage(!prev ? "Motion reduced" : "Motion enabled");
      return !prev;
    });
  };

  useEffect(() => {
    if (!toastMessage) {
      return undefined;
    }

    const timerId = window.setTimeout(() => setToastMessage(""), 2200);
    return () => window.clearTimeout(timerId);
  }, [toastMessage]);

  // ─── Background fetch + periodic refresh ─────────────────────────────────
  useEffect(() => {
    let mounted = true;

    const loadSite = async ({ forceRefresh = false } = {}) => {
      // Only set loading spinner when we have no content at all
      if (mounted && !siteContentReady) {
        setSiteLoading(true);
      }

      try {
        const content = await fetchSiteContent({ forceRefresh });
        if (mounted) {
          setSiteContent(content);
          setSiteLoading(false);
          setSiteContentReady(true);
        }
      } catch {
        if (mounted) {
          setSiteContent(normalizeSiteContent(defaultSiteContent));
          setSiteLoading(false);
          setSiteContentReady(true);
        }
      }
    };

    // Always fetch fresh — but silently (no loading spinner if cache exists)
    loadSite({ forceRefresh: false });

    const intervalId = window.setInterval(() => {
      loadSite({ forceRefresh: true });
    }, PROJECT_SYNC_INTERVAL_MS);

    const handleSiteUpdated = () => {
      loadSite({ forceRefresh: true });
    };
    window.addEventListener("innovex-site-updated", handleSiteUpdated);

    return () => {
      mounted = false;
      window.clearInterval(intervalId);
      window.removeEventListener("innovex-site-updated", handleSiteUpdated);
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const syncOrientation = () => {
      setOrientation(window.innerWidth >= window.innerHeight ? "landscape" : "portrait");
    };

    document.documentElement.dataset.theme = darkMode ? "dark" : "light";
    document.documentElement.style.colorScheme = darkMode ? "dark" : "light";

    syncOrientation();
    window.addEventListener("resize", syncOrientation);
    window.addEventListener("orientationchange", syncOrientation);

    return () => {
      window.removeEventListener("resize", syncOrientation);
      window.removeEventListener("orientationchange", syncOrientation);
    };
  }, [darkMode]);

  useEffect(() => {
    const currentRoute = `${location.pathname}${location.search}${location.hash}`;
    localStorage.setItem(LAST_ROUTE_KEY, currentRoute);
  }, [location]);

  useEffect(() => {
    const navigationEntry = performance.getEntriesByType("navigation")[0];
    const lastRoute = localStorage.getItem(LAST_ROUTE_KEY);

    if (
      navigationEntry?.type === "reload" &&
      location.pathname === "/" &&
      lastRoute &&
      lastRoute !== "/"
    ) {
      navigate(lastRoute, { replace: true });
    }
  }, [location.pathname, navigate]);

  useEffect(() => {
    const viewerId = localStorage.getItem(VIEWER_KEY) || crypto.randomUUID();
    localStorage.setItem(VIEWER_KEY, viewerId);

    if (location.pathname === "/admin_panel" || location.pathname === "/admin-panel") {
      return;
    }

    fetch(`${API_BASE_URL}${API_ENDPOINTS.analyticsView}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        viewerId,
        path: location.pathname,
      }),
    }).catch(() => {});
  }, [location.pathname]);

  return (
    <>
    <AppChrome message={toastMessage} />
    <Suspense fallback={<RouteFallback />}>
      <Routes>
        <Route
          path="/"
          element={
            <Home
              darkMode={darkMode}
              toggleTheme={toggleTheme}
              reduceMotion={reduceMotion}
              orientation={orientation}
              siteContent={siteContent}
              isLoading={siteLoading}
            />
          }
        />
        <Route
          path="/dashboard"
          element={
            <Dashboard
              darkMode={darkMode}
              toggleTheme={toggleTheme}
              reduceMotion={reduceMotion}
              toggleMotion={toggleMotion}
              siteContent={siteContent}
              isLoading={siteLoading}
            />
          }
        />
        <Route
          path="/dashboard/project/:id"
          element={
            <ProjectDetails
              darkMode={darkMode}
              toggleTheme={toggleTheme}
              reduceMotion={reduceMotion}
              orientation={orientation}
              siteContent={siteContent}
              isLoading={siteLoading}
              contentReady={siteContentReady}
            />
          }
        />
        <Route
          path="/admin_panel"
          element={
            <AdminPanel
              darkMode={darkMode}
              toggleTheme={toggleTheme}
              siteContent={siteContent}
              onSiteContentSaved={handleSiteContentSaved}
            />
          }
        />
        <Route
          path="/admin-panel"
          element={
            <AdminPanel
              darkMode={darkMode}
              toggleTheme={toggleTheme}
              siteContent={siteContent}
              onSiteContentSaved={handleSiteContentSaved}
            />
          }
        />
      </Routes>
    </Suspense>
    </>
  )
}

export default App