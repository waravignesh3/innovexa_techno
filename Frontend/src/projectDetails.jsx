import { useMemo } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import "./App.css";
import { getProjectDemoLink, hasDedicatedProjectDemo, normalizeProject } from "./siteContent.js";
import { getProjectVideoSource } from "./projectMedia.js";

function ProjectDetails({ darkMode, toggleTheme, reduceMotion, orientation, siteContent, isLoading }) {
  const navigate = useNavigate();
  const location = useLocation();
  const { id } = useParams();

  const project = useMemo(() => {
    const fromState = location.state?.project;
    if (fromState) {
      return normalizeProject(fromState);
    }

    const match = (siteContent.projects || []).find((item) => String(item.id) === String(id)) || null;
    return match ? normalizeProject(match) : null;
  }, [id, location.state, siteContent.projects]);

  const healthSummary = useMemo(() => {
    if (!project) {
      return { passed: 0, total: 0, score: 0 };
    }

    const checks = Array.isArray(project.checks) ? project.checks : [];
    const passed = checks.filter((check) => check.passed).length;
    const total = checks.length;
    const score = total ? Math.round((passed / total) * 100) : 0;
    return { passed, total, score };
  }, [project]);

  const updatedLabel = useMemo(() => {
    if (!project?.updatedAt) {
      return "Not available";
    }

    const date = new Date(project.updatedAt);
    if (Number.isNaN(date.getTime())) {
      return "Not available";
    }

    return date.toLocaleString();
  }, [project]);

  const lastPushLabel = useMemo(() => {
    if (!project?.pushedAt) {
      return "Not available";
    }
    const date = new Date(project.pushedAt);
    return Number.isNaN(date.getTime()) ? "Not available" : date.toLocaleString();
  }, [project]);

  const demoLink = useMemo(() => (project?.demoUrl ? getProjectDemoLink(project) : ""), [project]);
  const projectVideo = useMemo(() => getProjectVideoSource(project), [project]);

  if (isLoading && !project) {
    return (
      <div className={`${darkMode ? "dark-dashboard" : "light-dashboard"} app-shell page-shell orientation-${orientation} ${reduceMotion ? "motion-reduced" : ""}`}>
        <div className="project-details-page project-details-page-clean" aria-hidden="true">
          <header className="project-details-topbar">
            <div className="ui-skeleton ui-skeleton-button skeleton-back-button"></div>
            <div className="ui-skeleton ui-skeleton-pill"></div>
          </header>

          <section className="project-details-card project-details-card-clean skeleton-card">
            <div className="project-details-layout">
              <div className="project-details-media">
                <div className="project-details-screenshot-frame project-details-screenshot-frame-clean project-details-screenshot-single project-details-video-empty"></div>
                <div className="project-details-mini-stats">
                  <div className="project-mini-stat skeleton-card">
                    <div className="ui-skeleton ui-skeleton-text skeleton-row-label"></div>
                    <div className="ui-skeleton ui-skeleton-text skeleton-card-value"></div>
                  </div>
                  <div className="project-mini-stat skeleton-card">
                    <div className="ui-skeleton ui-skeleton-text skeleton-row-label"></div>
                    <div className="ui-skeleton ui-skeleton-text skeleton-card-value"></div>
                  </div>
                </div>
              </div>

              <div className="project-details-main">
                <div className="ui-skeleton ui-skeleton-text skeleton-chip-line"></div>
                <div className="ui-skeleton ui-skeleton-title skeleton-panel-title"></div>
                <div className="ui-skeleton ui-skeleton-text skeleton-panel-copy"></div>
                <div className="ui-skeleton ui-skeleton-text skeleton-panel-copy skeleton-panel-copy-short"></div>
                <div className="ui-skeleton ui-skeleton-bar"></div>
              </div>
            </div>
          </section>
        </div>
      </div>
    );
  }

  if (!project) {
    return (
      <div className={`${darkMode ? "dark-dashboard" : "light-dashboard"} app-shell page-shell orientation-${orientation} ${reduceMotion ? "motion-reduced" : ""}`}>
        <div className="project-details-page">
          <div className="project-details-card">
            <h2>Project not found</h2>
            <p>This project is not available anymore.</p>
            <button className="project-back-btn" onClick={() => navigate("/dashboard", { state: { section: "projects" } })}>
              Back to Dashboard
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`${darkMode ? "dark-dashboard" : "light-dashboard"} app-shell page-shell orientation-${orientation} ${reduceMotion ? "motion-reduced" : ""}`}>
      <div className="project-details-page project-details-page-clean">
        <header className="project-details-topbar">
          <button className="project-back-btn" onClick={() => navigate("/dashboard", { state: { section: "projects" } })}>
            <i className="bx bx-left-arrow-alt"></i>
            Back to Projects
          </button>

          <div className="project-details-topbar-actions">
            <span className={`project-visibility-pill ${project.private ? "private" : "public"}`}>
              <i className={`bx ${project.private ? "bx-lock-alt" : "bx-globe"}`}></i>
              {project.private ? "Private Showcase" : "Public Repository"}
            </span>
            <button className="theme-toggle-btn" onClick={toggleTheme}>
              {darkMode ? <i className="bx bx-sun"></i> : <i className="bx bx-moon"></i>}
            </button>
          </div>
        </header>

        <section className="project-details-card project-details-card-clean">
          <div className={`project-details-layout ${projectVideo ? "project-details-layout-has-video" : ""}`}>
            <div className="project-details-media">
              <div className={`project-details-screenshot-frame project-details-screenshot-frame-clean project-details-screenshot-single ${projectVideo ? "project-details-screenshot-frame-video" : ""}`}>
                {projectVideo ? (
                  <video
                    key={project.id}
                    src={projectVideo}
                    className="project-details-screenshot-video"
                    autoPlay
                    muted
                    loop
                    playsInline
                  />
                ) : (
                  <div className="project-video-empty project-details-video-empty" aria-hidden="true">
                    <i className="bx bx-video-off"></i>
                  </div>
                )}
              </div>

              <div className="project-details-mini-stats">
                <div className="project-mini-stat">
                  <span className="project-meta-label">Progress</span>
                  <strong>{project.progress}%</strong>
                </div>
                <div className="project-mini-stat">
                  <span className="project-meta-label">Health</span>
                  <strong>{healthSummary.score}%</strong>
                </div>
              </div>
            </div>

            <div className="project-details-main">
              <div className="project-details-headline">
                <span className="project-details-eyebrow">Project Overview</span>
                <h1>{project.name}</h1>
                <span className={`project-status ${project.status.toLowerCase().replace(" ", "-")}`}>
                  {project.status === "In Progress"
                    ? <><i className="bx bx-loader-alt spin-icon"></i> In Progress</>
                    : <><i className="bx bx-check-circle"></i> Completed</>}
                </span>
              </div>

              <p className="project-details-description project-details-description-clean">{project.description}</p>

              <div className="project-details-progress project-details-progress-clean">
                <div className="progress-bar">
                  <div className="progress-fill" style={{ width: `${project.progress}%` }}></div>
                </div>
                <span className="progress-text">{project.progress}%</span>
              </div>

              <div className="project-info-board">
                <div className="project-info-row">
                  <span className="project-meta-label">Demo Preview</span>
                  <strong>{hasDedicatedProjectDemo(project) ? "Configured live demo" : (project.private ? "Private repository preview" : "GitHub repository preview")}</strong>
                </div>
                <div className="project-info-row">
                  <span className="project-meta-label">Repository Name</span>
                  <strong>{project.repositoryFullName || `${project.owner}/${project.repositoryName || project.name}`}</strong>
                </div>
                <div className="project-info-row">
                  <span className="project-meta-label">Repository Owner</span>
                  <strong>{project.owner}</strong>
                </div>
                <div className="project-info-row">
                  <span className="project-meta-label">Primary Language</span>
                  <strong>{project.language}</strong>
                </div>
                <div className="project-info-row">
                  <span className="project-meta-label">Default Branch</span>
                  <strong>{project.defaultBranch || "Not available"}</strong>
                </div>
                <div className="project-info-row">
                  <span className="project-meta-label">Last Push</span>
                  <strong>{lastPushLabel}</strong>
                </div>
                <div className="project-info-row">
                  <span className="project-meta-label">Last Updated</span>
                  <strong>{updatedLabel}</strong>
                </div>
                <div className="project-info-row">
                  <span className="project-meta-label">Visibility</span>
                  <strong>{project.private ? "Private repository" : (project.visibility || "Public repository")}</strong>
                </div>
              </div>

              <div className="project-details-callouts">
                <article className="project-callout-card">
                  <span className="project-meta-label">Repository Checks</span>
                  <h3>{healthSummary.passed} of {healthSummary.total} passed</h3>
                  <p>Health signals are generated from repository status, branch availability, documentation, and archive state.</p>
                </article>

                <article className="project-callout-card">
                  <span className="project-meta-label">Realtime Signals</span>
                  <h3>{project.private ? "Private repo synced" : "Live showcase synced"}</h3>
                  <p>Project information and repository checks are refreshed from connected GitHub imports, including private repositories.</p>
                </article>
              </div>

              <div className="project-details-actions">
                {demoLink && (
                  <a
                    className="btn-view btn-demo"
                    href={demoLink}
                    target="_blank"
                    rel="noreferrer"
                  >
                    Open Live Demo <i className="bx bx-link-external"></i>
                  </a>
                )}
              </div>
            </div>
          </div>

          {Array.isArray(project.checks) && project.checks.length > 0 && (
            <section className="project-checks project-checks-clean">
              <div className="project-section-head">
                <div>
                  <span className="project-meta-label">Repository Health</span>
                  <h3>Repository Checks</h3>
                </div>
                <span className="analytics-chip">{healthSummary.score}% passing</span>
              </div>

              <div className="project-check-list">
                {project.checks.map((check) => (
                  <div className={`project-check-item ${check.passed ? "pass" : "fail"}`} key={check.label}>
                    <i className={`bx ${check.passed ? "bx-check-circle" : "bx-x-circle"}`}></i>
                    <div>
                      <strong>{check.label}</strong>
                      <span>{check.passed ? "Verified" : "Attention needed"}</span>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}
        </section>
      </div>
    </div>
  );
}

export default ProjectDetails;
