export const githubSources = [
  {
    owner: "waravignesh3",
    url: "https://github.com/waravignesh3",
  },
  {
    owner: "Madhan457",
    url: "https://github.com/Madhan457",
  },
];

export const defaultProjects = [];
export const PROJECT_SYNC_INTERVAL_MS = 60000;

const excludedRepoNames = new Set([
  "innovexa-techno",
  "innovexa techno",
  "git",
]);

export const isVisibleProject = (project = {}) => {
  const projectName = typeof project.name === "string" ? project.name.trim().toLowerCase() : "";
  if (!projectName.length) {
    return true;
  }

  const normalizedName = projectName.replace(/[_\s]+/g, "-");
  const compactName = projectName.replace(/[^a-z0-9]/g, "");
  const compactNormalizedName = normalizedName.replace(/[^a-z0-9]/g, "");

  if (
    compactName.includes("innovexatechno") ||
    compactName.includes("innovextechno") ||
    compactNormalizedName.includes("innovexatechno") ||
    compactNormalizedName.includes("innovextechno")
  ) {
    return false;
  }

  return !excludedRepoNames.has(projectName) && !excludedRepoNames.has(normalizedName);
};

export const getProjectStatusFromChecks = (project = {}) => {
  const checks = Array.isArray(project.checks) ? project.checks : [];
  if (checks.length === 0) {
    return "In Progress";
  }

  return checks.every((check) => check?.passed) ? "Completed" : "In Progress";
};

export const normalizeProject = (project = {}) => {
  const status = getProjectStatusFromChecks(project);
  const baseProgress = Number(project.progress) || 0;
  const progress = status === "Completed"
    ? 100
    : Math.max(0, Math.min(baseProgress, 99));

  return {
    ...project,
    status,
    progress,
    team: 2,
  };
};

export const normalizeProjects = (projects = []) => (
  Array.isArray(projects)
    ? projects.filter((project) => isVisibleProject(project)).map((project) => normalizeProject(project))
    : []
);

export const summarizeProjects = (projects = []) => {
  const normalizedProjects = normalizeProjects(projects);
  const totalProjects = normalizedProjects.length;
  const completedProjects = normalizedProjects.filter((project) => project.status === "Completed").length;
  const inProgressProjects = normalizedProjects.filter((project) => project.status === "In Progress").length;
  const totalTeam = normalizedProjects.reduce((sum, project) => sum + (project.team || 0), 0);
  const averageProgress = totalProjects
    ? Math.round(normalizedProjects.reduce((sum, project) => sum + (project.progress || 0), 0) / totalProjects)
    : 0;
  const completionRate = totalProjects ? Math.round((completedProjects / totalProjects) * 100) : 0;
  const repoCoverage = normalizedProjects.filter((project) => project.githubUrl).length;
  const topProject = [...normalizedProjects].sort((a, b) => (b.progress || 0) - (a.progress || 0))[0] || null;

  return {
    totalProjects,
    completedProjects,
    inProgressProjects,
    totalTeam,
    averageProgress,
    completionRate,
    repoCoverage,
    topProject,
  };
};

const daysBetween = (isoDate) => {
  const now = Date.now();
  const target = new Date(isoDate).getTime();
  return Math.max(0, Math.round((now - target) / (1000 * 60 * 60 * 24)));
};

export const mapGitHubRepoToProject = (repo, index = 0) => {
  const daysSincePush = daysBetween(repo.pushed_at || repo.updated_at);
  const freshnessScore = Math.max(0, 100 - Math.min(daysSincePush, 100));
  const popularityScore = Math.min(18, ((repo.stargazers_count || 0) * 3) + ((repo.forks_count || 0) * 2));
  const docsScore = repo.description ? 8 : 0;
  const issueScore = repo.open_issues_count === 0 ? 12 : 4;
  const progress = Math.max(28, Math.min(94, freshnessScore - 8 + popularityScore + docsScore + issueScore));

  return normalizeProject({
    id: `${repo.owner.login}-${repo.name}`,
    name: repo.name,
    repositoryName: repo.name,
    repositoryFullName: repo.full_name || `${repo.owner.login}/${repo.name}`,
    description: repo.description || `Public repository from ${repo.owner.login}.`,
    progress,
    team: 2,
    githubUrl: repo.html_url,
    owner: repo.owner.login,
    ownerAvatar: repo.owner.avatar_url || "",
    language: repo.language || "Not specified",
    visibility: repo.visibility || "public",
    private: Boolean(repo.private),
    defaultBranch: repo.default_branch || "",
    updatedAt: repo.updated_at,
    pushedAt: repo.pushed_at || repo.updated_at,
    stars: repo.stargazers_count || 0,
    forks: repo.forks_count || 0,
    screenshot: `https://opengraph.githubassets.com/1/${repo.owner.login}/${repo.name}`,
    checks: [
      { label: "Repository exists", passed: true },
      { label: "Repository has description", passed: Boolean(repo.description) },
      { label: "Default branch available", passed: Boolean(repo.default_branch) },
      { label: "Not archived", passed: !repo.archived },
    ],
    importOrder: index,
  });
};

export const fetchPublicGitHubProjects = async () => {
  const responses = await Promise.all(
    githubSources.map(async ({ owner }) => {
      const response = await fetch(`https://api.github.com/users/${owner}/repos?per_page=100&sort=updated`, {
        headers: {
          Accept: "application/vnd.github+json",
        },
      });

      if (!response.ok) {
        throw new Error(`Unable to load repositories for ${owner}.`);
      }

      return response.json();
    })
  );

  return responses
    .flat()
    .filter((repo) => !repo.fork)
    .filter((repo) => isVisibleProject({ name: repo.name }))
    .sort((a, b) => new Date(b.updated_at) - new Date(a.updated_at))
    .map((repo, index) => mapGitHubRepoToProject(repo, index));
};
