import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useNavigate } from "react-router-dom";
import "./App.css";
import { getProjectDemoLink, normalizeProject } from "./siteContent.js";
import { getProjectVideoSource } from "./projectMedia.js";

function Projects({ siteContent }) {
  const navigate = useNavigate();
  const gridRef = useRef(null);
  const videoRefs = useRef(new Map());
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("All");
  const [sortBy, setSortBy] = useState("progress");
  const [selectedProject, setSelectedProject] = useState(null);
  const [showSkeleton, setShowSkeleton] = useState(true);
  const projects = useMemo(
    () => (siteContent.projects || []).map((project, index) => normalizeProject(project, index)),
    [siteContent.projects]
  );

  useEffect(() => {
    const timerId = window.setTimeout(() => setShowSkeleton(false), 450);
    return () => window.clearTimeout(timerId);
  }, []);

  const stopProjectVideo = (videoElement) => {
    if (!videoElement) {
      return;
    }

    videoElement.pause();
  };

  const playProjectVideo = (videoElement) => {
    if (!videoElement) {
      return;
    }

    if (videoElement.readyState >= 2 && videoElement.currentTime < 0.01) {
      videoElement.currentTime = 0.01;
    }

    const playback = videoElement.play();

    if (playback && typeof playback.catch === "function") {
      playback.catch(() => {});
    }
  };

  const stopAllProjectVideos = () => {
    videoRefs.current.forEach((videoElement) => stopProjectVideo(videoElement));
  };

  const filtered = useMemo(() => {
    return projects.filter((project) => {
      const haystack = `${project.name} ${project.description} ${project.language} ${project.owner}`.toLowerCase();
      const matchSearch = haystack.includes(search.toLowerCase());
      const matchFilter = filter === "All" || project.status === filter;
      return matchSearch && matchFilter;
    });
  }, [projects, search, filter]);

  const sortedProjects = useMemo(() => {
    const items = [...filtered];

    if (sortBy === "name") {
      return items.sort((a, b) => a.name.localeCompare(b.name));
    }

    if (sortBy === "status") {
      return items.sort((a, b) => {
        if (a.status === b.status) {
          return b.progress - a.progress;
        }

        return a.status === "In Progress" ? -1 : 1;
      });
    }

    return items.sort((a, b) => {
      if (b.progress !== a.progress) {
        return b.progress - a.progress;
      }

      return a.name.localeCompare(b.name);
    });
  }, [filtered, sortBy]);

  useEffect(() => {
    const cards = gridRef.current?.querySelectorAll(".project-card") || [];
    if (!cards.length) {
      return undefined;
    }

    const rootElement = document.querySelector(".content-area");
    const revealIfVisible = (card) => {
      const rect = card.getBoundingClientRect();

      if (rootElement) {
        const rootRect = rootElement.getBoundingClientRect();
        const intersectsRoot =
          rect.bottom >= rootRect.top &&
          rect.top <= rootRect.bottom &&
          rect.right >= rootRect.left &&
          rect.left <= rootRect.right;

        if (intersectsRoot) {
          card.classList.add("project-card-visible");
        }

        return;
      }

      const intersectsViewport =
        rect.bottom >= 0 &&
        rect.top <= window.innerHeight &&
        rect.right >= 0 &&
        rect.left <= window.innerWidth;

      if (intersectsViewport) {
        card.classList.add("project-card-visible");
      }
    };

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("project-card-visible");
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.16, root: rootElement || null, rootMargin: "0px 0px -8% 0px" }
    );

    cards.forEach((card) => {
      revealIfVisible(card);
      observer.observe(card);
    });

    const frameId = window.requestAnimationFrame(() => {
      cards.forEach((card) => revealIfVisible(card));
    });

    return () => {
      window.cancelAnimationFrame(frameId);
      observer.disconnect();
    };
  }, [sortedProjects]);

  useEffect(() => stopAllProjectVideos, []);

  useEffect(() => {
    stopAllProjectVideos();
  }, [sortedProjects]);

  const githubOwners = Array.isArray(siteContent.githubOwners) ? siteContent.githubOwners : [];
  const topProject = sortedProjects[0] || null;
  const openProjectPreview = (project) => {
    if (!project) {
      return;
    }

    setSelectedProject(project);
  };
  const buildProjectTags = (project) => [
    project.language && project.language !== "Not specified" ? project.language : null,
    project.status,
    project.private ? "Private" : "Public",
  ].filter(Boolean);

  return (
    <section className="section-content projects-section">
      <div className="projects-header">
        <h2>Your Projects</h2>
        <div className="projects-source-strip">
          <span className="projects-source-pill projects-source-live">Imported from connected GitHub profiles</span>
          {githubOwners.length > 0 && <span className="projects-source-links">@{githubOwners.join(" @")}</span>}
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
          {sortedProjects.length} project{sortedProjects.length !== 1 ? "s" : ""} found
        </p>
        {topProject && (
          <div className="projects-spotlight-pill">
            <i className="bx bx-trending-up"></i>
            <span>Spotlight: {topProject.name} at {topProject.progress}%</span>
          </div>
        )}
      </div>

      {showSkeleton && projects.length === 0 ? (
        <div className="projects-grid projects-grid-skeleton" aria-hidden="true">
          {[0, 1, 2].map((item) => (
            <div className="project-card project-card-skeleton" key={item}>
              <div className="project-skeleton-media"></div>
              <div className="project-skeleton-line project-skeleton-title"></div>
              <div className="project-skeleton-line"></div>
              <div className="project-skeleton-line project-skeleton-short"></div>
            </div>
          ))}
        </div>
      ) : sortedProjects.length > 0 ? (
        <div className="projects-grid" ref={gridRef}>
          {sortedProjects.map((project, index) => (
            (() => {
              const cardVideo = getProjectVideoSource(project);

              return (
                <div
                  key={project.id}
                  className="project-card"
                  style={{ animationDelay: `${index * 0.07}s` }}
                  role="button"
                  tabIndex={0}
                  onClick={() => openProjectPreview(project)}
                  onMouseEnter={() => playProjectVideo(videoRefs.current.get(project.id))}
                  onMouseLeave={() => stopProjectVideo(videoRefs.current.get(project.id))}
                  onFocus={() => playProjectVideo(videoRefs.current.get(project.id))}
                  onBlur={() => stopProjectVideo(videoRefs.current.get(project.id))}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" || event.key === " ") {
                      event.preventDefault();
                      openProjectPreview(project);
                    }
                  }}
                >
                  <div className="project-screenshot-frame">
                    {cardVideo ? (
                      <video
                        ref={(element) => {
                          if (element) {
                            videoRefs.current.set(project.id, element);
                            return;
                          }

                          videoRefs.current.delete(project.id);
                        }}
                        src={cardVideo}
                        className="project-screenshot-video"
                        preload="metadata"
                        muted
                        playsInline
                        loop
                        disablePictureInPicture
                        onLoadedMetadata={(event) => {
                          const videoElement = event.currentTarget;
                          videoElement.pause();
                          if (videoElement.readyState >= 2) {
                            videoElement.currentTime = 0.01;
                          }
                        }}
                      />
                    ) : (
                      <div className="project-video-empty" aria-hidden="true">
                        <i className="bx bx-video-off"></i>
                      </div>
                    )}
                  </div>

                  <div className="project-header">
                    <h3 className="project-name">{project.name}</h3>
                    <span className={`project-status ${project.status.toLowerCase().replace(" ", "-")}`}>
                      {project.status === "In Progress"
                        ? <><i className="bx bx-loader-alt spin-icon"></i> In Progress</>
                        : <><i className="bx bx-check-circle"></i> Completed</>}
                    </span>
                  </div>

                  <p className="project-description">{project.description}</p>

                  <div className="project-tags" aria-label={`${project.name} tags`}>
                    {buildProjectTags(project).map((tag) => (
                      <span className="project-tag" key={tag}>{tag}</span>
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
                  </div>

                  <div className="project-progress">
                    <div className="progress-bar">
                      <div className="progress-fill" style={{ width: `${project.progress}%` }}></div>
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
                          navigate(`/dashboard/project/${project.id}`, { state: { project } });
                        }}
                      >
                        View <i className="bx bx-right-arrow-alt"></i>
                      </button>
                    </div>
                  </div>
                </div>
              );
            })()
          ))}
        </div>
      ) : (
        <div className="projects-empty">
          <i className="bx bx-search-alt empty-icon"></i>
          <h3>No projects found</h3>
          <p>Try adjusting your search or filter</p>
        </div>
      )}

      {selectedProject && createPortal(
        <div className="project-modal-overlay" role="presentation" onClick={() => setSelectedProject(null)}>
          <article
            className="project-modal project-modal-modern"
            role="dialog"
            aria-modal="true"
            aria-labelledby="project-modal-title"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="project-modal-header">
              <div>
                <span className={`project-status ${selectedProject.status.toLowerCase().replace(" ", "-")}`}>
                  {selectedProject.status}
                </span>
                <h3 id="project-modal-title">{selectedProject.name}</h3>
              </div>
              <button className="project-modal-close" type="button" onClick={() => setSelectedProject(null)} aria-label="Close project details">
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
                />
              ) : (
                <div className="project-video-empty project-modal-video-empty" aria-hidden="true">
                  <i className="bx bx-video-off"></i>
                </div>
              )}
            </div>

            <p className="project-modal-description">{selectedProject.description}</p>

            <div className="project-tags project-modal-tags">
              {buildProjectTags(selectedProject).map((tag) => (
                <span className="project-tag" key={tag}>{tag}</span>
              ))}
            </div>

            <div className="project-modal-actions">
              {Boolean(selectedProject.demoUrl) && getProjectDemoLink(selectedProject) && (
                <a className="btn-view btn-demo" href={getProjectDemoLink(selectedProject)} target="_blank" rel="noreferrer">
                  Live Demo <i className="bx bx-link-external"></i>
                </a>
              )}
              <button
                className="btn-view"
                type="button"
                onClick={() => navigate(`/dashboard/project/${selectedProject.id}`, { state: { project: selectedProject } })}
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
