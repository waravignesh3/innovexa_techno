import express from "express";
import cors from "cors";
import mongoose from "mongoose";
import crypto from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import dotenv from "dotenv";
import User from "./models/user.js";
import GithubSyncSettings from "./models/githubSyncSettings.js";
import ProjectMeta from "./models/projectMeta.js";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const siteContentPath = path.join(__dirname, "data", "siteContent.json");

const app = express();
const port = Number(process.env.PORT) || 3000;
const adminPassword = process.env.ADMIN_PANEL_PASSWORD || "innovex@admin";
const adminSessions = new Map();
const viewerWindowMs = 15 * 60 * 1000;
const defaultGithubOwners = ["waravignesh3", "madhan457"];
let githubOwners = [...defaultGithubOwners];
const pinnedRepositorySeeds = [
  {
    owner: "waravignesh3",
    name: "Whether-Web-App",
    description: "A responsive weather web application that provides real-time weather updates.",
    language: "JavaScript",
    visibility: "public",
  },
  {
    owner: "waravignesh3",
    name: "dynamic-login-page",
    description: "A modern and responsive login page built using HTML and CSS.",
    language: "CSS",
    visibility: "public",
  },
];
const githubApiBase = "https://api.github.com";
const githubRefreshIntervalMs = 60000;
const excludedRepoNames = new Set(["innovexa-techno", "innovexa techno", "git"]);

const calculateRating = (repo) => {
  const stars = repo.stargazers_count || 0;
  const forks = repo.forks_count || 0;
  const description = repo.description ? 1 : 0;
  const hasDemo = repo.homepage ? 1 : 0;
  
  // Basic rating logic: 0 to 5 stars
  let rating = 1; // Base rating
  if (stars > 5) rating += 1;
  if (forks > 2) rating += 1;
  if (description) rating += 1;
  if (hasDemo) rating += 1;
  
  return Math.min(5, rating);
};

const githubAccessToken = process.env.GITHUB_ACCESS_TOKEN || process.env.GITHUB_TOKEN || "";
const githubSyncSettingsKey = "primary";

app.use(express.json({ limit: "2mb" }));
app.use(express.urlencoded({ extended: true }));
app.use(cors());

const defaultSiteContent = {
  home: {
    brandName: "Innovexa Techno",
    tagline: "Transforming Ideas into Reality",
    description: "Fast, Reliable, and Innovative Solutions for Your Business",
    statusPills: ["Live Workspace", "Responsive Layout", "Smooth Motion"],
    features: ["Fast", "Secure", "Scalable"],
  },
  about: {
    eyebrow: "About Innovexa Techno",
    headline: "Innovate. Integrate. Elevate.",
    description:
      "Innovexa Techno builds practical digital solutions for businesses that want clean execution, dependable engineering, and a sharper visual presence.",
    focusTitle: "Software that moves ideas into action",
    focusText:
      "We turn concepts into polished products across web, mobile, presentations, data workflows, and delivery automation.",
    processTitle: "Clarity, speed, and ownership",
    processText:
      "Every project is approached with transparent progress, responsive collaboration, and a strong finish from first build to final handoff.",
    bannerTitle: "We take care of your web as ours.",
    bannerText: "You can discuss your idea with us. We'll help you shape and launch it.",
  },
  contact: {
    email: "innovexa.techno@gmail.com",
    phones: ["9865514692", "9994449892"],
    founders: ["Vigneshwara", "Madhan Sankar"],
    address: ["Innovexa Techno", "Tamil Nadu, India"],
    brandMotto: "INNOVATE | INTEGRATE | ELEVATE",
  },
  services: [
    "Mobile App Development",
    "Web Development",
    "Database Design & Management",
    "API Handling",
    "Embedded System Solutions",
    "Responsive Layout",
    "Fast Performance",
    "Poster Design",
    "PPT Design",
    "Video Editing",
  ],
};

const activityTemplates = [
  "GitHub portfolio import refreshed for the live website.",
  "Admin workspace settings were synced for the website content.",
  "Project showcase details were restored from connected repositories.",
  "Realtime KPI snapshot published to the dashboard.",
  "Viewer activity pulse refreshed for the control center.",
];

let editableSiteContent = structuredClone(defaultSiteContent);
let cachedGithubProjects = [];
let lastGithubSyncAt = null;
let lastGithubErrorSignature = "";
let githubBackoffUntilMs = 0;
let githubBackoffReason = "";
let analyticsState = {
  totalViews: 0,
  uniqueVisitors: 0,
  activeVisitors: 0,
  lastViewedAt: null,
  visitors: {},
};

const asNumber = (value, fallback = 0) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const buildGithubProfileUrl = (owner = "") => `https://github.com/${owner}`;

const normalizeGithubOwner = (value = "") => {
  const raw = String(value || "").trim();
  if (!raw) {
    return "";
  }

  let candidate = raw.replace(/^@/, "");

  if (/^https?:\/\//i.test(candidate)) {
    try {
      const url = new URL(candidate);
      if (!/^(www\.)?github\.com$/i.test(url.hostname)) {
        return "";
      }

      const [owner] = url.pathname.split("/").filter(Boolean);
      candidate = owner || "";
    } catch {
      return "";
    }
  }

  candidate = candidate.replace(/\.git$/i, "").trim();
  if (!/^[a-z\d](?:[a-z\d-]{0,37}[a-z\d])?$/i.test(candidate)) {
    return "";
  }

  return candidate;
};

const normalizeGithubOwners = (owners = []) => {
  const input = Array.isArray(owners) ? owners : [owners];
  return [...new Set(input.map((owner) => normalizeGithubOwner(owner)).filter(Boolean))];
};

const isVisibleProject = (project = {}) => {
  const projectName = typeof project.name === "string" ? project.name.trim().toLowerCase() : "";
  if (!projectName.length) {
    return true;
  }

  // Explicitly ignore innovexa-techno as requested
  if (projectName === "innovexa-techno" || projectName === "innovexa_techno") {
    return false;
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

const getProjectStatusFromChecks = (project = {}) => {
  const checks = Array.isArray(project.checks) ? project.checks : [];
  if (checks.length === 0) {
    return "In Progress";
  }

  return checks.every((check) => check?.passed) ? "Completed" : "In Progress";
};

const normalizeProject = (project = {}) => {
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

const normalizeEditableContent = (content = {}) => ({
  home: {
    ...defaultSiteContent.home,
    ...(content.home || {}),
    statusPills: Array.isArray(content.home?.statusPills) ? content.home.statusPills.filter(Boolean) : defaultSiteContent.home.statusPills,
    features: Array.isArray(content.home?.features) ? content.home.features.filter(Boolean) : defaultSiteContent.home.features,
  },
  about: {
    ...defaultSiteContent.about,
    ...(content.about || {}),
  },
  contact: {
    ...defaultSiteContent.contact,
    ...(content.contact || {}),
    phones: Array.isArray(content.contact?.phones) ? content.contact.phones.filter(Boolean) : defaultSiteContent.contact.phones,
    founders: Array.isArray(content.contact?.founders) ? content.contact.founders.filter(Boolean) : defaultSiteContent.contact.founders,
    address: Array.isArray(content.contact?.address) ? content.contact.address.filter(Boolean) : defaultSiteContent.contact.address,
  },
  services: Array.isArray(content.services) && content.services.length
    ? content.services.filter(Boolean)
    : defaultSiteContent.services,
});

const daysBetween = (isoDate) => {
  const now = Date.now();
  const target = new Date(isoDate).getTime();
  return Math.max(0, Math.round((now - target) / (1000 * 60 * 60 * 24)));
};

const mapRepositoryToProject = (repo, index) => {
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
    demoUrl: "", // Avoid live demo as requested
    screenshot: `https://opengraph.githubassets.com/1/${repo.owner.login}/${repo.name}`,
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
    rating: calculateRating(repo),
    screenshot: repo.private ? "" : `https://opengraph.githubassets.com/1/${repo.owner.login}/${repo.name}`,
    checks: [
      { label: "Repository exists", passed: true },
      { label: "Repository has description", passed: Boolean(repo.description) },
      { label: "Default branch available", passed: Boolean(repo.default_branch) },
      { label: "Not archived", passed: !repo.archived },
    ],
    importOrder: index,
  });
};

const loadGithubOwnerSettings = async () => {
  const settings = await GithubSyncSettings.findOne({ key: githubSyncSettingsKey }).lean();
  const storedOwners = normalizeGithubOwners(settings?.owners || []);
  githubOwners = storedOwners.length ? storedOwners : [...defaultGithubOwners];
};

const saveGithubOwnerSettings = async (owners = []) => {
  const normalizedOwners = normalizeGithubOwners(owners);
  const finalOwners = normalizedOwners.length ? normalizedOwners : [...defaultGithubOwners];

  await GithubSyncSettings.findOneAndUpdate(
    { key: githubSyncSettingsKey },
    { $set: { key: githubSyncSettingsKey, owners: finalOwners } },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );

  githubOwners = finalOwners;
  return finalOwners;
};

const buildGithubHeaders = ({ includeAuth = true } = {}) => {
  const headers = {
    Accept: "application/vnd.github+json",
    "User-Agent": "Innovex-Techno-Dashboard",
  };

  if (includeAuth && githubAccessToken) {
    headers.Authorization = `Bearer ${githubAccessToken}`;
  }

  return headers;
};

const readGithubError = async (response, fallbackMessage) => {
  let detail = "";

  try {
    const payload = await response.json();
    if (payload && typeof payload.message === "string") {
      detail = payload.message;
    }
  } catch {
    try {
      detail = (await response.text()).trim();
    } catch {
      detail = "";
    }
  }

  const statusLabel = `${response.status} ${response.statusText}`.trim();
  return detail ? `${fallbackMessage} (${statusLabel}): ${detail}` : `${fallbackMessage} (${statusLabel})`;
};

const getRateLimitResetMs = (response) => {
  const resetHeader = response.headers.get("x-ratelimit-reset");
  const remainingHeader = response.headers.get("x-ratelimit-remaining");
  if (!resetHeader || remainingHeader !== "0") {
    return 0;
  }

  const resetSeconds = Number(resetHeader);
  if (!Number.isFinite(resetSeconds) || resetSeconds <= 0) {
    return 0;
  }

  return resetSeconds * 1000;
};

const createRateLimitError = (message, resetMs = 0) => {
  const error = new Error(message);
  error.isRateLimitError = true;
  error.rateLimitResetMs = resetMs;
  return error;
};

const isRateLimitMessage = (message = "") => /rate limit exceeded/i.test(String(message));

const fetchGithubCollection = async (path, headers) => {
  let page = 1;
  const allItems = [];

  while (true) {
    const separator = path.includes("?") ? "&" : "?";
    const response = await fetch(`${githubApiBase}${path}${separator}per_page=100&page=${page}&sort=updated`, {
      headers,
    });

    if (!response.ok) {
      const message = await readGithubError(response, "Unable to load GitHub repositories");
      const resetMs = getRateLimitResetMs(response);
      if ((response.status === 403 && resetMs > Date.now()) || isRateLimitMessage(message)) {
        throw createRateLimitError(message, resetMs);
      }
      throw new Error(message);
    }

    const payload = await response.json();
    const items = Array.isArray(payload) ? payload : [];
    allItems.push(...items);

    if (items.length < 100) {
      break;
    }

    page += 1;
  }

  return allItems;
};

const logGithubSyncFailure = (message) => {
  if (lastGithubErrorSignature !== message) {
    console.warn("GitHub sync warning:", message);
    lastGithubErrorSignature = message;
  }
};

const fetchAuthenticatedGithubProjects = async () => {
  const repos = await fetchGithubCollection(
    "/user/repos?visibility=all&affiliation=owner,collaborator,organization_member",
    buildGithubHeaders()
  );
  return repos
    .filter((repo) => !repo.fork)
    .sort((a, b) => new Date(b.updated_at) - new Date(a.updated_at))
    .map((repo, index) => mapRepositoryToProject(repo, index));
};

const fetchGithubProjects = async () => {
  let allRepos = [];
  let authenticatedRepos = [];

  if (githubAccessToken) {
    try {
      authenticatedRepos = await fetchGithubCollection(
        "/user/repos?visibility=all&affiliation=owner,collaborator,organization_member",
        buildGithubHeaders()
      );
    } catch (error) {
      logGithubSyncFailure(`Authenticated GitHub fetch failed, falling back to public repos: ${error.message}`);
    }
  }

  const responses = await Promise.allSettled(
    githubOwners.map(async (owner) => {
      return fetchGithubCollection(
        `/users/${owner}/repos`,
        buildGithubHeaders({ includeAuth: false })
      );
    })
  );

  let hitRateLimit = false;

  responses.forEach((result, index) => {
    if (result.status === "fulfilled" && Array.isArray(result.value)) {
      allRepos = allRepos.concat(result.value);
    } else if (result.status === "rejected") {
      const reason = result.reason;
      if (reason?.isRateLimitError || isRateLimitMessage(reason?.message)) {
        hitRateLimit = true;
      } else {
        logGithubSyncFailure(`Failed to fetch repositories for ${githubOwners[index]}: ${reason?.message}`);
      }
    }
  });

  if (hitRateLimit) {
    const fallbackBackoffMs = Date.now() + (15 * 60 * 1000);
    throw createRateLimitError("GitHub API rate limit exceeded for public repository fetch.", fallbackBackoffMs);
  }

  const mergedRepos = [...authenticatedRepos, ...allRepos];
  const dedupedByRepoId = new Map();
  mergedRepos.forEach((repo) => {
    const key = String(repo?.id || repo?.full_name || "");
    if (!key) {
      return;
    }
    dedupedByRepoId.set(key, repo);
  });

  return [...dedupedByRepoId.values()]
    .filter((repo) => !repo.fork)
    .sort((a, b) => new Date(b.updated_at) - new Date(a.updated_at))
    .map((repo, index) => mapRepositoryToProject(repo, index));
};

const toPersistedProjectMetadata = (project = {}) => ({
  repoId: String(project.id || ""),
  name: String(project.name || ""),
  repositoryName: String(project.repositoryName || project.name || ""),
  repositoryFullName: String(project.repositoryFullName || ""),
  description: String(project.description || ""),
  owner: String(project.owner || ""),
  ownerAvatar: String(project.ownerAvatar || ""),
  language: String(project.language || "Not specified"),
  githubUrl: String(project.githubUrl || ""),
  demoUrl: String(project.demoUrl || project.homepage || ""),
  screenshot: String(project.screenshot || ""),
  videoUrl: String(project.videoUrl || ""),
  visibility: String(project.visibility || (project.private ? "private" : "public")),
  private: Boolean(project.private),
  defaultBranch: String(project.defaultBranch || ""),
  updatedAt: String(project.updatedAt || ""),
  pushedAt: String(project.pushedAt || project.updatedAt || ""),
  stars: asNumber(project.stars, 0),
  forks: asNumber(project.forks, 0),
  rating: asNumber(project.rating, 0),
  wasOncePublic: project.visibility === "public" || project.wasOncePublic === true,
  progress: Math.max(0, Math.min(100, asNumber(project.progress, 0))),
  team: 2,
  importOrder: Math.max(0, asNumber(project.importOrder, 0)),
  checks: Array.isArray(project.checks)
    ? project.checks.map((check) => ({
      label: String(check?.label || ""),
      passed: Boolean(check?.passed),
    }))
    : [],
  lastSyncedAt: new Date(),
});

const persistGithubProjects = async (projects = [], owners = githubOwners) => {
  const scopedOwners = normalizeGithubOwners(owners);
  const operations = (Array.isArray(projects) ? projects : [])
    .map((project) => toPersistedProjectMetadata(project))
    .filter((project) => project.repoId)
    .map((project) => ({
      updateOne: {
        filter: { repoId: project.repoId },
        update: { $set: project },
        upsert: true,
      },
    }));

  if (operations.length > 0) {
    await ProjectMeta.bulkWrite(operations, { ordered: false });
  }

  // NOTE: We no longer delete projects that are missing from the GitHub sync.
  // This ensures that even if a repository is made private or deleted on GitHub,
  // it remains in our MongoDB database and continues to show on the website.
};

const loadProjectsFromDatabase = async (owners = githubOwners) => {
  const scopedOwners = normalizeGithubOwners(owners);
  const query = scopedOwners.length > 0 ? { owner: { $in: scopedOwners } } : {};
  const docs = await ProjectMeta.find(query)
    .sort({ importOrder: 1, updatedAt: -1 })
    .lean();

  return docs.map((doc) => normalizeProject({
    id: doc.repoId,
    name: doc.name,
    repositoryName: doc.repositoryName,
    repositoryFullName: doc.repositoryFullName,
    description: doc.description,
    owner: doc.owner,
    ownerAvatar: doc.ownerAvatar,
    language: doc.language,
    githubUrl: doc.githubUrl,
    demoUrl: doc.demoUrl,
    screenshot: doc.screenshot,
    videoUrl: doc.videoUrl,
    visibility: doc.visibility,
    private: doc.private,
    defaultBranch: doc.defaultBranch,
    updatedAt: doc.updatedAt,
    pushedAt: doc.pushedAt,
    stars: doc.stars,
    forks: doc.forks,
    rating: doc.rating || 0,
    progress: doc.progress,
    team: doc.team,
    checks: Array.isArray(doc.checks) ? doc.checks : [],
    importOrder: doc.importOrder,
    wasOncePublic: doc.wasOncePublic,
  }));
};

const mergeProjectsWithPersisted = (liveProjects = [], persistedProjects = []) => {
  const persistedById = new Map();
  persistedProjects.forEach((project) => {
    const key = String(project.id || "");
    if (key) {
      persistedById.set(key, normalizeProject(project));
    }
  });

  const merged = liveProjects.map((project) => {
    const key = String(project.id || "");
    const persistedProject = persistedById.get(key);
    return normalizeProject({
      ...(persistedProject || {}),
      ...project,
      screenshot: project.screenshot || persistedProject?.screenshot || "",
      demoUrl: project.demoUrl || persistedProject?.demoUrl || "",
      videoUrl: project.videoUrl || persistedProject?.videoUrl || "",
      rating: project.rating || persistedProject?.rating || 0,
      wasOncePublic: project.wasOncePublic || persistedProject?.wasOncePublic || false,
    });
  });

  // Add projects that are in database but NOT in live fetch (e.g. private/deleted)
  const liveRepoIds = new Set(liveProjects.map(p => String(p.id)));
  persistedProjects.forEach(persisted => {
    if (!liveRepoIds.has(String(persisted.id))) {
      merged.push(normalizeProject(persisted));
    }
  });

  return merged.sort((a, b) => {
    const aTime = new Date(a.updatedAt || 0).getTime();
    const bTime = new Date(b.updatedAt || 0).getTime();
    return bTime - aTime;
  });
};

const buildPinnedProjectFallback = (seed = {}) => {
  const owner = String(seed.owner || "").trim();
  const name = String(seed.name || "").trim();
  if (!owner || !name) {
    return null;
  }

  return normalizeProject({
    id: `${owner}-${name}`,
    name,
    repositoryName: name,
    repositoryFullName: `${owner}/${name}`,
    description: seed.description || `Repository metadata tracked for ${owner}/${name}.`,
    progress: 42,
    team: 2,
    githubUrl: `https://github.com/${owner}/${name}`,
    owner,
    ownerAvatar: "",
    language: seed.language || "Not specified",
    visibility: seed.visibility || "public",
    private: seed.visibility === "private",
    defaultBranch: "main",
    updatedAt: new Date(0).toISOString(),
    pushedAt: new Date(0).toISOString(),
    stars: 0,
    forks: 0,
    screenshot: `https://opengraph.githubassets.com/1/${owner}/${name}`,
    checks: [
      { label: "Repository seeded", passed: true },
      { label: "Metadata available", passed: true },
      { label: "Default branch available", passed: true },
      { label: "Not archived", passed: true },
    ],
    importOrder: Number.MAX_SAFE_INTEGER,
  });
};

const ensurePinnedRepositoriesPresent = (projects = []) => {
  const byFullName = new Map(
    projects.map((project) => [String(project.repositoryFullName || "").toLowerCase(), project])
  );

  const merged = [...projects];
  pinnedRepositorySeeds.forEach((seed) => {
    const fullName = `${seed.owner}/${seed.name}`.toLowerCase();
    if (byFullName.has(fullName)) {
      return;
    }
    const fallbackProject = buildPinnedProjectFallback(seed);
    if (fallbackProject) {
      merged.push(fallbackProject);
    }
  });

  return merged;
};

const refreshGithubProjects = async () => {
  try {
    const nowMs = Date.now();
    if (nowMs < githubBackoffUntilMs) {
      const persistedProjects = await loadProjectsFromDatabase();
      if (persistedProjects.length > 0) {
        cachedGithubProjects = persistedProjects;
      }
      return;
    }

    const persistedProjects = await loadProjectsFromDatabase();
    const importedProjects = await fetchGithubProjects();
    if (importedProjects.length > 0) {
      const mergedProjects = ensurePinnedRepositoriesPresent(
        mergeProjectsWithPersisted(importedProjects, persistedProjects)
      );
      cachedGithubProjects = mergedProjects;
      await persistGithubProjects(mergedProjects, githubOwners);
      lastGithubSyncAt = new Date().toISOString();
      lastGithubErrorSignature = "";
      githubBackoffUntilMs = 0;
      githubBackoffReason = "";
      return;
    }

    if (persistedProjects.length > 0) {
      cachedGithubProjects = ensurePinnedRepositoriesPresent(persistedProjects);
      if (!lastGithubSyncAt) {
        lastGithubSyncAt = new Date().toISOString();
      }
    }
  } catch (error) {
    if (error?.isRateLimitError && Number.isFinite(error.rateLimitResetMs)) {
      githubBackoffUntilMs = Math.max(githubBackoffUntilMs, error.rateLimitResetMs);
      const minutesLeft = Math.max(1, Math.ceil((githubBackoffUntilMs - Date.now()) / 60000));
      githubBackoffReason = `GitHub API rate limit hit. Using MongoDB metadata cache for about ${minutesLeft} minute(s).`;
    } else {
      logGithubSyncFailure(`GitHub sync failed: ${error.message}`);
    }

    try {
      const persistedProjects = await loadProjectsFromDatabase();
      if (persistedProjects.length > 0) {
        cachedGithubProjects = ensurePinnedRepositoriesPresent(persistedProjects);
      } else {
        cachedGithubProjects = ensurePinnedRepositoriesPresent([]);
      }
    } catch (dbError) {
      logGithubSyncFailure(`Project metadata fallback failed: ${dbError.message}`);
    }
  }
};

const getProjects = () => cachedGithubProjects
  .filter((project) => isVisibleProject(project))
  .map((project) => normalizeProject(project));

const getSiteContentResponse = () => {
  const projects = getProjects();

  return {
    ...editableSiteContent,
    stats: {
      totalProjects: projects.length,
      completedProjects: projects.filter((project) => project.status === "Completed").length,
      liveProjects: projects.filter((project) => project.status !== "Completed").length,
    },
    projects,
    githubOwners,
    githubProfiles: githubOwners.map((owner) => buildGithubProfileUrl(owner)),
    lastGithubSyncAt,
    privateRepoImportEnabled: Boolean(githubAccessToken),
    githubSyncBackoffUntil: githubBackoffUntilMs ? new Date(githubBackoffUntilMs).toISOString() : null,
    githubSyncNotice: githubBackoffReason || null,
  };
};

const hydrateAnalytics = () => {
  const now = Date.now();
  const activeVisitors = Object.values(analyticsState.visitors || {}).filter(
    (lastSeenAt) => now - lastSeenAt <= viewerWindowMs
  ).length;

  analyticsState = {
    ...analyticsState,
    uniqueVisitors: Object.keys(analyticsState.visitors || {}).length,
    activeVisitors,
  };
};

const readSiteContent = async () => {
  try {
    const raw = await fs.readFile(siteContentPath, "utf8");
    const parsed = JSON.parse(raw);
    editableSiteContent = normalizeEditableContent(parsed);
  } catch {
    await fs.mkdir(path.dirname(siteContentPath), { recursive: true });
    editableSiteContent = normalizeEditableContent(defaultSiteContent);
    await fs.writeFile(siteContentPath, JSON.stringify(editableSiteContent, null, 2));
  }
};

const writeSiteContent = async (content) => {
  editableSiteContent = normalizeEditableContent(content);
  await fs.writeFile(siteContentPath, JSON.stringify(editableSiteContent, null, 2));
  return getSiteContentResponse();
};

const buildRealtimeOverview = () => {
  hydrateAnalytics();

  const projects = getProjects();
  const totalProjects = projects.length;
  const completedProjects = projects.filter((project) => project.status === "Completed").length;
  const liveProjects = projects.filter((project) => project.status !== "Completed").length;
  const now = new Date();
  const releaseWindow = `${String((now.getHours() + 1) % 24).padStart(2, "0")}:${String((now.getMinutes() + 12) % 60).padStart(2, "0")}`;
  const latestActivity = activityTemplates[(now.getSeconds() + now.getMinutes()) % activityTemplates.length];

  return {
    timestamp: now.toISOString(),
    summary: {
      totalProjects,
      completedProjects,
      liveProjects,
      totalViews: analyticsState.totalViews,
      uniqueVisitors: analyticsState.uniqueVisitors,
      activeVisitors: analyticsState.activeVisitors,
      releaseWindow,
      syncedOwners: githubOwners.length,
      privateRepoImportEnabled: Boolean(githubAccessToken),
    },
    activity: [
      {
        id: "portfolio-sync",
        title: latestActivity,
        meta: `${totalProjects} imported GitHub projects`,
      },
      {
        id: "live-projects",
        title: "Live project count updated",
        meta: `${liveProjects} active builds visible on the website`,
      },
      {
        id: "viewer-pulse",
        title: "Viewer pulse refreshed",
        meta: `${analyticsState.activeVisitors} active viewers right now`,
      },
    ],
    projects,
    analytics: {
      totalViews: analyticsState.totalViews,
      uniqueVisitors: analyticsState.uniqueVisitors,
      activeVisitors: analyticsState.activeVisitors,
      lastViewedAt: analyticsState.lastViewedAt,
    },
    syncedOwners: githubOwners,
    lastGithubSyncAt,
  };
};

const createAdminToken = () => {
  const token = crypto.randomUUID();
  adminSessions.set(token, Date.now());
  return token;
};

const getBearerToken = (req) => {
  const value = req.headers.authorization || "";
  if (!value.startsWith("Bearer ")) {
    return "";
  }

  return value.slice("Bearer ".length);
};

const requireAdmin = (req, res, next) => {
  const token = getBearerToken(req);

  if (!token || !adminSessions.has(token)) {
    res.status(401).json({ success: false, message: "Unauthorized" });
    return;
  }

  adminSessions.set(token, Date.now());
  next();
};

app.get("/", (req, res) => {
  res.send("server is running");
});

app.get("/api/site-content", async (req, res) => {
  const forceRefresh = req.query.refresh === "true";

  if (forceRefresh || !lastGithubSyncAt) {
    await refreshGithubProjects();
  }

  res.json(getSiteContentResponse());
});

app.get("/api/realtime/overview", async (req, res) => {
  if (!lastGithubSyncAt) {
    await refreshGithubProjects();
  }

  res.json(buildRealtimeOverview());
});

app.post("/api/analytics/view", (req, res) => {
  const viewerId = String(req.body?.viewerId || "").trim();

  if (!viewerId) {
    res.status(400).json({ success: false, message: "viewerId is required" });
    return;
  }

  analyticsState.totalViews += 1;
  analyticsState.lastViewedAt = new Date().toISOString();
  analyticsState.visitors[viewerId] = Date.now();
  hydrateAnalytics();

  res.json({
    success: true,
    analytics: {
      totalViews: analyticsState.totalViews,
      uniqueVisitors: analyticsState.uniqueVisitors,
      activeVisitors: analyticsState.activeVisitors,
      lastViewedAt: analyticsState.lastViewedAt,
    },
  });
});

app.post("/api/admin/login", (req, res) => {
  const password = String(req.body?.password || "");

  if (password !== adminPassword) {
    res.status(401).json({ success: false, message: "Incorrect password" });
    return;
  }

  res.json({
    success: true,
    token: createAdminToken(),
    message: "Admin access granted",
  });
});

app.get("/api/admin/dashboard", requireAdmin, async (req, res) => {
  if (!lastGithubSyncAt) {
    await refreshGithubProjects();
  }

  res.json({
    success: true,
    siteContent: getSiteContentResponse(),
    overview: buildRealtimeOverview(),
  });
});

app.post("/api/admin/github/sync", requireAdmin, async (req, res) => {
  const requestedOwners = normalizeGithubOwners([
    req.body?.profileUrl,
    req.body?.owner,
    ...(Array.isArray(req.body?.owners) ? req.body.owners : []),
  ]);

  if (
    (req.body?.profileUrl || req.body?.owner || Array.isArray(req.body?.owners))
    && requestedOwners.length === 0
  ) {
    res.status(400).json({
      success: false,
      message: "Provide a valid GitHub profile URL or owner name.",
    });
    return;
  }

  try {
    if (requestedOwners.length > 0) {
      await saveGithubOwnerSettings(requestedOwners);
    }

    await refreshGithubProjects();

    res.json({
      success: true,
      message: `Synced ${getProjects().length} repositories from ${githubOwners.map((owner) => `@${owner}`).join(", ")}.`,
      owners: githubOwners,
      siteContent: getSiteContentResponse(),
      overview: buildRealtimeOverview(),
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error?.message || "Unable to sync GitHub repositories right now.",
    });
  }
});

app.put("/api/admin/site-content", requireAdmin, async (req, res) => {
  try {
    const savedContent = await writeSiteContent(req.body || {});
    res.json({ success: true, siteContent: savedContent });
  } catch {
    res.status(500).json({ success: false, message: "Unable to save changes" });
  }
});

app.get("/api/github/projects", async (req, res) => {
  const forceRefresh = req.query.refresh === "true";

  if (forceRefresh || !lastGithubSyncAt) {
    await refreshGithubProjects();
  }

  res.json({
    owners: githubOwners,
    lastGithubSyncAt,
    projects: getProjects(),
  });
});

app.post("/login", async (req, res) => {
  const { username, password } = req.body;
  const foundUser = await User.findOne({ username, password });

  if (foundUser) {
    res.json({ success: true, message: "Login successful" });
    return;
  }

  res.json({ success: false, message: "Invalid credentials" });
});

app.post("/signin", async (req, res) => {
  const { username, password } = req.body;

  try {
    const newUser = new User({ username, password });
    await newUser.save();
    res.json({ success: true, message: "User registered successfully" });
  } catch (err) {
    if (err.code === 11000) {
      res.json({ success: false, message: "Username already exists" });
      return;
    }

    res.json({ success: false, message: "Error registering user" });
  }
});

const mongoUri = process.env.MONGO_URI || "mongodb://localhost:27017/userdata";
const maskedUri = mongoUri.replace(/\/\/.*:.*@/, "//***:***@");

if (!process.env.MONGO_URI && process.env.NODE_ENV === "production") {
  console.error("ERROR: MONGO_URI environment variable is not set. Cannot proceed in production.");
  process.exit(1);
}

console.log(`Attempting to connect to MongoDB: ${maskedUri}`);

mongoose
  .connect(mongoUri)
  .then(() => {
    console.log("✓ Connected to MongoDB");
  })
  .catch((err) => {
    console.error("✗ MongoDB Connection Error Details:");
    console.error(`  Message: ${err.message}`);
    console.error(`  Code: ${err.code}`);
    console.error(`  CodeName: ${err.codeName}`);
    
    if (err.message.includes("authentication failed")) {
      console.error("\n[HELP] Authentication failed. Please check:");
      console.error("1. The password in your MONGO_URI is correct.");
      console.error("2. The username 'waravignesh3_db_user' exists in Atlas Database Access.");
      console.error("3. The user has 'readWriteAnyDatabase' or 'atlasAdmin' permissions.");
      console.error("4. Your current IP (or Render's IP) is whitelisted in Atlas Network Access.\n");
    }

    if (process.env.NODE_ENV === "production") {
      console.error("FATAL: Cannot continue without database connection in production.");
      process.exit(1);
    }
  });

await readSiteContent();
await loadGithubOwnerSettings();
await refreshGithubProjects();

setInterval(refreshGithubProjects, githubRefreshIntervalMs);

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
  console.log("Admin panel password source:", process.env.ADMIN_PANEL_PASSWORD ? "environment variable" : "default password");
});
