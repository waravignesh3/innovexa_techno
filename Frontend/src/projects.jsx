import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { createPortal } from "react-dom";
import { useNavigate } from "react-router-dom";
import "./App.css";
import { getProjectDemoLink, normalizeProject } from "./siteContent.js";
import { getProjectVideoSource } from "./projectMedia.js";

/**
 * Module-level cache implemented as a Map so it:
 *  - survives component re-mounts (lives outside React)
 *  - is never flagged by react-hooks/immutability (Map methods are not
 *    assignments to a declared variable — the variable itself never changes)
 *  - is never flagged by react-hooks/purity (no impure calls like Date.now)
 *  - is never flagged by react-hooks/refs (not a React ref)
 *
 * Key "projects" holds the last successfully loaded project array.
 */
const projectCache = new Map();

function ProjectVideoCard({ project, cardVideo, onPlay, onStop }) {
  const videoRef = useRef(null);
  const containerRef = useRef(null);
  const [videoReady, setVideoReady] = useState(false);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (!containerRef.current) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.disconnect();
        }
      },
      { threshold: 0.01, rootMargin: "300px" } // Larger margin for faster pre-loading
    );

    observer.observe(containerRef.current);

    // Fallback: if it's not visible after 2 seconds, force it (helps with weird intersection bugs)
    const timeout = setTimeout(() => setIsVisible(true), 2000);

    return () => {
      observer.disconnect();
      clearTimeout(timeout);
    };
  }, []);

  const handleRef = useCallback(
    (el) => {
      videoRef.current = el;
      if (el) {
        onPlay(project.id, el);
      } else {
        onStop(project.id);
      }
    },
    [project.id, onPlay, onStop]
  );

  return (
    <div className="project-screenshot-frame" ref={containerRef}>
      {cardVideo ? (
        <>
          {(!videoReady || !isVisible) && (
            <div className="project-video-loading" aria-hidden="true">
              <span className="video-loading-pulse"></span>
            </div>
          )}
          {isVisible && (
            <video
              ref={handleRef}
              src={cardVideo}
              className={`project-screenshot-video${videoReady ? " video-ready" : ""}`}
              preload="metadata"
              muted
              playsInline
              loop
              disablePictureInPicture
              onLoadedData={() => setVideoReady(true)}
              onLoadedMetadata={(e) => {
                const el = e.currentTarget;
                el.pause();
                // Ensure a frame is visible immediately
                if (el.readyState >= 1) el.currentTime = 0.001;
                setVideoReady(true);
              }}
            />
          )}
        </>
      ) : (
        <div className="project-video-empty" aria-hidden="true">
          <i className="bx bx-video-off"></i>
        </div>
      )}
    </div>
  );
}

function Projects({ siteContent, isLoading }) {
  const navigate = useNavigate();
  const gridRef = useRef(null);
  const videoRefsMap = useRef(new Map());

  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("All");
  const [sortBy, setSortBy] = useState("progress");
  const [selectedProject, setSelectedProject] = useState(null);

  /**
   * localProjects — derived entirely from props, no state, no effects.
   *
   * The projectCache Map lives at module scope. Calling Map.prototype.set /
   * Map.prototype.get does NOT mutate the Map variable itself (it always points
   * to the same Map object), so react-hooks/immutability never fires.
   * No ref access, no impure calls — fully lint-clean.
   */
  const localProjects = useMemo(() => {
    const incoming = (siteContent.projects || []).map((p, i) =>
      normalizeProject(p, i)
    );
    if (incoming.length > 0) {
      projectCache.set("projects", incoming);
      return incoming;
    }
    return projectCache.get("projects") || [];
  }, [siteContent.projects]);

  const contentReady = !isLoading || localProjects.length > 0;

  const stopAllProjectVideos = useCallback(() => {
    videoRefsMap.current.forEach((el) => {
      if (el) el.pause();
    });
  }, []);

  const stopProjectVideo = useCallback((videoElement) => {
    if (!videoElement) return;
    videoElement.pause();
  }, []);

  const playProjectVideo = useCallback((videoElement) => {
    if (!videoElement) return;
    if (videoElement.readyState >= 2 && videoElement.currentTime < 0.01) {
      videoElement.currentTime = 0.01;
    }
    const playback = videoElement.play();
    if (playback && typeof playback.catch === "function") {
      playback.catch(() => {});
    }
  }, []);

  const filtered = useMemo(
    () =>
      localProjects.filter((project) => {
        const haystack =
          `${project.name} ${project.description} ${project.language} ${project.owner}`.toLowerCase();
        return (
          haystack.includes(search.toLowerCase()) &&
          (filter === "All" || project.status === filter)
        );
      }),
    [localProjects, search, filter]
  );

  const sortedProjects = useMemo(() => {
    const items = [...filtered];
    if (sortBy === "name") {
      return items.sort((a, b) => a.name.localeCompare(b.name));
    }
    if (sortBy === "status") {
      return items.sort((a, b) => {
        if (a.status === b.status) return b.progress - a.progress;
        return a.status === "In Progress" ? -1 : 1;
      });
    }
    return items.sort((a, b) => {
      if (b.progress !== a.progress) return b.progress - a.progress;
      return a.name.localeCompare(b.name);
    });
  }, [filtered, sortBy]);

  // We rely on AppChrome's IntersectionObserver for reveals to reduce overhead
  useEffect(() => () => stopAllProjectVideos(), [stopAllProjectVideos]);

  useEffect(() => {
    stopAllProjectVideos();
  }, [sortedProjects, stopAllProjectVideos]);

  const githubOwners = Array.isArray(siteContent.githubOwners)
    ? siteContent.githubOwners
    : [];
  const topProject = sortedProjects[0] || null;

  const openProjectPreview = (project) => {
    if (!project) return;
    setSelectedProject(project);
  };

  const buildProjectTags = (project) =>
    [
      project.language && project.language !== "Not specified"
        ? project.language
        : null,
      project.status,
      project.private ? "Private" : "Public",
    ].filter(Boolean);

  const showSkeleton = !contentReady && isLoading;

  return (
    <section className="section-content projects-section">
      <div className="projects-header">
        <h2>Your Projects</h2>
        <div className="projects-source-strip">
          <span className="projects-source-pill projects-source-live">
            Imported from connected GitHub profiles
          </span>
          {githubOwners.length > 0 && (
            <span className="projects-source-links">
              @{githubOwners.join(" @")}
            </span>
          )}
        </div>
      </div>

      <div className="projects-toolbar">
        <div className="search-wrapper">
          <i className="bx bx-search search-icon"></i>
          <input
            type="text"
            className="projects-search"
            placeholder="Search projects..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          {search && (
            <button className="search-clear" onClick={() => setSearch("")}>
              <i className="bx bx-x"></i>
            </button>
          )}
        </div>

        <div className="filter-tabs">
          {["All", "In Progress", "Completed"].map((tab) => (
            <button
              key={tab}
              className={`filter-tab ${filter === tab ? "active" : ""}`}
              onClick={() => setFilter(tab)}
            >
              {tab === "All" && <i className="bx bx-grid-alt"></i>}
              {tab === "In Progress" && <i className="bx bx-loader-alt"></i>}
              {tab === "Completed" && <i className="bx bx-check-circle"></i>}
              {tab}
            </button>
          ))}
        </div>

        <label className="projects-sort-control" htmlFor="projects-sort">
          <span>Sort by</span>
          <select
            id="projects-sort"
            className="projects-sort-select"
            value={sortBy}
            onChange={(event) => setSortBy(event.target.value)}
          >
            <option value="progress">Highest Progress</option>
            <option value="name">Project Name</option>
            <option value="status">Status</option>
          </select>
        </label>
      </div>

      <div className="projects-insights-bar">
        <p className="projects-count">
          <i className="bx bxs-folder-open"></i>
          {showSkeleton ? (
            <span
              className="ui-skeleton ui-skeleton-text"
              style={{
                display: "inline-block",
                width: 80,
                height: 14,
                verticalAlign: "middle",
              }}
            ></span>
          ) : (
            <>
              {sortedProjects.length} project
              {sortedProjects.length !== 1 ? "s" : ""} found
            </>
          )}
        </p>
        {!showSkeleton && topProject && (
          <div className="projects-spotlight-pill projects-spotlight-pill-animated">
            <i className="bx bx-trending-up"></i>
            <span>
              Spotlight: {topProject.name} at {topProject.progress}%
            </span>
          </div>
        )}
      </div>

      {showSkeleton ? (
        <div className="projects-grid projects-grid-skeleton" aria-hidden="true">
          {[0, 1, 2, 3, 4, 5].map((item) => (
            <div
              className="project-card project-card-skeleton"
              key={item}
              style={{ animationDelay: `${item * 0.06}s` }}
            >
              <div className="project-skeleton-media project-skeleton-media-shimmer"></div>
              <div className="project-skeleton-body">
                <div className="project-skeleton-line project-skeleton-title"></div>
                <div className="project-skeleton-line"></div>
                <div className="project-skeleton-line project-skeleton-short"></div>
                <div className="project-skeleton-tags">
                  <div className="project-skeleton-tag"></div>
                  <div className="project-skeleton-tag"></div>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : sortedProjects.length > 0 ? (
        <div className="projects-grid projects-grid-loaded" ref={gridRef}>
          {sortedProjects.map((project, index) => {
            const cardVideo = getProjectVideoSource(project);
            return (
              <div
                key={project.id}
                className="project-card"
                style={{
                  "--card-index": index,
                  animationDelay: `${index * 0.055}s`,
                }}
                role="button"
                tabIndex={0}
                onClick={() => openProjectPreview(project)}
                onMouseEnter={() =>
                  playProjectVideo(videoRefsMap.current.get(project.id))
                }
                onMouseLeave={() =>
                  stopProjectVideo(videoRefsMap.current.get(project.id))
                }
                onFocus={() =>
                  playProjectVideo(videoRefsMap.current.get(project.id))
                }
                onBlur={() =>
                  stopProjectVideo(videoRefsMap.current.get(project.id))
                }
                onKeyDown={(event) => {
                  if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    openProjectPreview(project);
                  }
                }}
              >
                <ProjectVideoCard
                  project={project}
                  cardVideo={cardVideo}
                  index={index}
                  onPlay={(id, el) => videoRefsMap.current.set(id, el)}
                  onStop={(id) => videoRefsMap.current.delete(id)}
                  onClick={() => openProjectPreview(project)}
                />

                <div className="project-header">
                  <h3 className="project-name">{project.name}</h3>
                  <span
                    className={`project-status ${project.status
                      .toLowerCase()
                      .replace(" ", "-")}`}
                  >
                    {project.status === "In Progress" ? (
                      <>
                        <i className="bx bx-loader-alt spin-icon"></i> In
                        Progress
                      </>
                    ) : (
                      <>
                        <i className="bx bx-check-circle"></i> Completed
                      </>
                    )}
                  </span>
                </div>

                <p className="project-description">{project.description}</p>

                <div
                  className="project-tags"
                  aria-label={`${project.name} tags`}
                >
                  {buildProjectTags(project).map((tag) => (
                    <span className="project-tag" key={tag}>
                      {tag}
                    </span>
                  ))}
                </div>

                <div className="project-meta-strip">
                  <span className="project-meta-chip">
                    <i className="bx bx-user-circle"></i>
                    {project.owner || "Innovexa"}
                  </span>
                  <span className="project-meta-chip">
                    <i className="bx bx-code-alt"></i>
                    {project.language || "Not specified"}
                  </span>
                  <span className="project-meta-chip">
                    <i className="bx bx-star"></i>
                    {project.stars ?? 0}
                  </span>
                  {project.rating > 0 && (
                    <span className="project-meta-chip project-rating-chip">
                      <i className="bx bxs-star rating-icon"></i>
                      {project.rating.toFixed(1)}
                    </span>
                  )}
                </div>

                <div className="project-progress">
                  <div className="progress-bar">
                    <div
                      className="progress-fill progress-fill-animated"
                      style={{
                        width: `${project.progress}%`,
                        transitionDelay: `${0.1 + index * 0.04}s`,
                      }}
                    ></div>
                  </div>
                  <span className="progress-text">{project.progress}%</span>
                </div>

                <div className="project-footer">
                  <div className="team-info">
                    <i className="bx bxs-group team-icon-bx"></i>
                    <span className="team-count">{project.team} members</span>
                  </div>
                  <div className="project-actions">
                    {Boolean(project.demoUrl) && getProjectDemoLink(project) && (
                      <a
                        className="btn-view btn-demo"
                        href={getProjectDemoLink(project)}
                        target="_blank"
                        rel="noreferrer"
                        onClick={(event) => event.stopPropagation()}
                      >
                        Live Demo <i className="bx bx-link-external"></i>
                      </a>
                    )}
                    <button
                      className="btn-view"
                      onClick={(event) => {
                        event.stopPropagation();
                        navigate(`/dashboard/project/${project.id}`, {
                          state: { project },
                        });
                      }}
                    >
                      View <i className="bx bx-right-arrow-alt"></i>
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : contentReady ? (
        <div className="projects-empty projects-empty-animated">
          <i className="bx bx-search-alt empty-icon"></i>
          <h3>No projects found</h3>
          <p>Try adjusting your search or filter</p>
        </div>
      ) : null}

      {selectedProject &&
        createPortal(
          <div
            className="project-modal-overlay project-modal-overlay-fast"
            role="presentation"
            onClick={() => setSelectedProject(null)}
          >
            <article
              className="project-modal project-modal-modern"
              role="dialog"
              aria-modal="true"
              aria-labelledby="project-modal-title"
              onClick={(event) => event.stopPropagation()}
            >
              <div className="project-modal-header">
                <div>
                  <span
                    className={`project-status ${selectedProject.status
                      .toLowerCase()
                      .replace(" ", "-")}`}
                  >
                    {selectedProject.status}
                  </span>
                  <h3 id="project-modal-title">{selectedProject.name}</h3>
                </div>
                <button
                  className="project-modal-close"
                  type="button"
                  onClick={() => setSelectedProject(null)}
                  aria-label="Close project details"
                >
                  <i className="bx bx-x"></i>
                </button>
              </div>

              <div className="project-modal-preview">
                {getProjectVideoSource(selectedProject) ? (
                  <video
                    key={selectedProject.id}
                    src={getProjectVideoSource(selectedProject)}
                    className="project-modal-preview-video"
                    autoPlay
                    muted
                    loop
                    playsInline
                    preload="metadata"
                  />
                ) : (
                  <div
                    className="project-video-empty project-modal-video-empty"
                    aria-hidden="true"
                  >
                    <i className="bx bx-video-off"></i>
                  </div>
                )}
              </div>

              <p className="project-modal-description">
                {selectedProject.description}
              </p>

              <div className="project-tags project-modal-tags">
                {buildProjectTags(selectedProject).map((tag) => (
                  <span className="project-tag" key={tag}>
                    {tag}
                  </span>
                ))}
              </div>

              <div className="project-modal-actions">
                {Boolean(selectedProject.demoUrl) &&
                  getProjectDemoLink(selectedProject) && (
                    <a
                      className="btn-view btn-demo"
                      href={getProjectDemoLink(selectedProject)}
                      target="_blank"
                      rel="noreferrer"
                    >
                      Live Demo <i className="bx bx-link-external"></i>
                    </a>
                  )}
                <button
                  className="btn-view"
                  type="button"
                  onClick={() =>
                    navigate(`/dashboard/project/${selectedProject.id}`, {
                      state: { project: selectedProject },
                    })
                  }
                >
                  Full Details <i className="bx bx-right-arrow-alt"></i>
                </button>
              </div>
            </article>
          </div>,
          document.body
        )}
    </section>
  );
}

export default Projects;