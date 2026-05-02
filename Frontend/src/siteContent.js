import { defaultProjects, fetchPublicGitHubProjects, normalizeProjects } from "./projectData.js";
import { API_BASE_URL, API_ENDPOINTS } from "./config.js";

// ─── Cache keys ───────────────────────────────────────────────────────────────
const SITE_CONTENT_CACHE_KEY = "innovex_site_content_cache";
const SITE_CONTENT_CACHE_TS_KEY = "innovex_site_content_cache_ts";
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes — fresh enough, fast enough

// ─── Project visual helpers (unchanged) ───────────────────────────────────────
const projectVisualPresets = [
  {
    key: "weather",
    match: ["weather", "climate", "forecast", "rain", "temperature"],
    title: "Weather Intelligence",
    colors: ["#38bdf8", "#2563eb", "#22d3ee"],
    icon: "weather",
  },
  {
    key: "commerce",
    match: ["commerce", "shop", "store", "cart", "payment", "retail"],
    title: "Checkout Experience",
    colors: ["#00e5ff", "#3b82f6", "#8b5cf6"],
    icon: "cart",
  },
  {
    key: "mobile",
    match: ["mobile", "app", "android", "ios", "native"],
    title: "Mobile Interface",
    colors: ["#22d3ee", "#2563eb", "#4f46e5"],
    icon: "phone",
  },
  {
    key: "analytics",
    match: ["analytics", "dashboard", "report", "insight", "data"],
    title: "Insight Dashboard",
    colors: ["#0ea5e9", "#14b8a6", "#22c55e"],
    icon: "chart",
  },
  {
    key: "api",
    match: ["api", "service", "microservice", "backend", "server"],
    title: "Service Mesh",
    colors: ["#38bdf8", "#818cf8", "#f59e0b"],
    icon: "node",
  },
  {
    key: "crm",
    match: ["crm", "customer", "sales", "lead", "client"],
    title: "Relationship Flow",
    colors: ["#f97316", "#f43f5e", "#8b5cf6"],
    icon: "people",
  },
  {
    key: "devops",
    match: ["devops", "pipeline", "deploy", "cloud", "ci", "cd", "docker"],
    title: "Deployment Pipeline",
    colors: ["#22c55e", "#06b6d4", "#2563eb"],
    icon: "cloud",
  },
  {
    key: "web",
    match: ["web", "site", "portfolio", "landing", "ui", "frontend"],
    title: "Web Experience",
    colors: ["#22d3ee", "#6366f1", "#f472b6"],
    icon: "browser",
  },
];

const projectNameStopWords = new Set([
  "app",
  "application",
  "project",
  "platform",
  "system",
  "dashboard",
  "web",
  "website",
]);

const escapeSvgText = (value = "") => String(value)
  .replace(/&/g, "&amp;")
  .replace(/</g, "&lt;")
  .replace(/>/g, "&gt;");

const createSeedFromProject = (project = {}, variant = 0) => {
  const base = `${project.name || "project"}-${project.language || "code"}-${variant}`;
  return [...base].reduce((sum, char, index) => sum + (char.charCodeAt(0) * (index + 1)), 0);
};

const getProjectVisualPreset = (project = {}) => {
  const haystack = `${project.name || ""} ${project.description || ""} ${project.language || ""}`.toLowerCase();
  return projectVisualPresets.find((preset) => preset.match.some((keyword) => haystack.includes(keyword))) || projectVisualPresets[0];
};

const getProjectKeyword = (project = {}) => {
  const parts = String(project.name || "")
    .split(/[^a-zA-Z0-9]+/)
    .map((part) => part.trim())
    .filter(Boolean);

  const meaningful = parts.find((part) => !projectNameStopWords.has(part.toLowerCase()));
  return meaningful || parts[0] || project.language || "Digital";
};

const getProjectVisualTitle = (project = {}, preset) => {
  const keyword = getProjectKeyword(project);
  return `${keyword} ${preset.title}`;
};

const getGitHubRepoReference = (project = {}) => {
  const fullName = String(project.repositoryFullName || "").trim();
  if (/^[^/\s]+\/[^/\s]+$/.test(fullName)) {
    return fullName;
  }

  const githubUrl = String(project.githubUrl || "").trim();
  const githubMatch = githubUrl.match(/github\.com\/([^/\s]+)\/([^/\s?#]+)/i);
  if (githubMatch) {
    return `${githubMatch[1]}/${githubMatch[2].replace(/\.git$/i, "")}`;
  }

  const owner = String(project.owner || "").trim();
  const repositoryName = String(project.repositoryName || project.name || "").trim();
  if (owner && repositoryName && owner.toLowerCase() !== "innovexa") {
    return `${owner}/${repositoryName}`;
  }

  return "";
};

const buildGitHubRepoScreenshot = (project = {}) => {
  const repoReference = getGitHubRepoReference(project);
  if (!repoReference) {
    return "";
  }

  const cacheKey = createSeedFromProject(project, 0);
  return `https://opengraph.githubassets.com/${cacheKey}/${repoReference}`;
};

const getProjectImageKeywords = (project = {}) => {
  const rawTerms = [
    project.name,
    project.repositoryName,
    project.owner,
    project.language,
    getProjectKeyword(project),
  ]
    .filter(Boolean)
    .join(" ")
    .split(/[^a-zA-Z0-9]+/)
    .map((part) => part.trim().toLowerCase())
    .filter(Boolean)
    .filter((part) => !projectNameStopWords.has(part));

  const uniqueTerms = [...new Set(rawTerms)];
  return uniqueTerms.slice(0, 4);
};

const buildOnlineProjectImage = (project = {}) => {
  const seed = createSeedFromProject(project, 0);
  const keywords = getProjectImageKeywords(project);
  const path = keywords.length ? `${keywords.join(",")}/all` : "technology/all";
  return `https://loremflickr.com/1200/720/${path}?lock=${seed}`;
};

const buildIconMarkup = (icon, primary, secondary, accent) => {
  if (icon === "phone") {
    return `
      <rect x="426" y="174" width="188" height="324" rx="34" fill="rgba(8, 15, 28, 0.18)" stroke="${accent}" stroke-width="10"/>
      <rect x="448" y="208" width="144" height="226" rx="22" fill="rgba(255,255,255,0.12)"/>
      <rect x="496" y="452" width="48" height="10" rx="5" fill="${accent}" opacity="0.9"/>
    `;
  }

  if (icon === "weather") {
    return `
      <circle cx="476" cy="258" r="56" fill="rgba(255,255,255,0.12)" stroke="${accent}" stroke-width="8"/>
      <path d="M428 382 C428 336 462 308 506 308 C516 274 548 248 586 248 C632 248 670 282 678 326 C714 332 742 360 742 398 C742 442 706 476 662 476 H504 C462 476 426 442 426 400 C426 394 426 388 428 382Z" fill="rgba(255,255,255,0.11)" stroke="${accent}" stroke-width="8"/>
      <path d="M534 488 L506 540 M592 488 L564 540 M650 488 L622 540" stroke="${accent}" stroke-width="14" stroke-linecap="round"/>
    `;
  }

  if (icon === "chart") {
    return `
      <rect x="366" y="192" width="308" height="256" rx="32" fill="rgba(255,255,255,0.10)" stroke="${accent}" stroke-width="8"/>
      <polyline points="414,388 470,332 520,354 578,268 626,292" fill="none" stroke="${accent}" stroke-width="16" stroke-linecap="round" stroke-linejoin="round"/>
      <circle cx="470" cy="332" r="10" fill="${accent}"/>
      <circle cx="520" cy="354" r="10" fill="${accent}"/>
      <circle cx="578" cy="268" r="10" fill="${accent}"/>
    `;
  }

  if (icon === "node") {
    return `
      <circle cx="434" cy="260" r="42" fill="rgba(255,255,255,0.12)" stroke="${accent}" stroke-width="8"/>
      <circle cx="606" cy="250" r="42" fill="rgba(255,255,255,0.12)" stroke="${accent}" stroke-width="8"/>
      <circle cx="522" cy="392" r="50" fill="rgba(255,255,255,0.12)" stroke="${accent}" stroke-width="8"/>
      <path d="M470 274 L558 370 M570 274 L536 346" fill="none" stroke="${accent}" stroke-width="16" stroke-linecap="round"/>
    `;
  }

  if (icon === "people") {
    return `
      <circle cx="470" cy="264" r="48" fill="rgba(255,255,255,0.14)" stroke="${accent}" stroke-width="8"/>
      <circle cx="574" cy="248" r="38" fill="rgba(255,255,255,0.11)" stroke="${accent}" stroke-width="8"/>
      <path d="M398 410 C414 356 446 334 486 334 C530 334 562 360 578 410" fill="rgba(255,255,255,0.10)" stroke="${accent}" stroke-width="10" stroke-linecap="round"/>
      <path d="M530 408 C542 368 566 350 600 350 C626 350 650 364 664 396" fill="none" stroke="${accent}" stroke-width="10" stroke-linecap="round"/>
    `;
  }

  if (icon === "cloud") {
    return `
      <path d="M396 380 C396 334 430 304 474 304 C486 250 534 214 588 214 C652 214 704 260 712 324 C754 332 786 368 786 412 C786 464 744 504 692 504 H474 C420 504 376 460 376 406 C376 398 382 388 396 380Z" fill="rgba(255,255,255,0.14)" stroke="${accent}" stroke-width="10"/>
      <path d="M514 376 L562 424 L650 326" fill="none" stroke="${accent}" stroke-width="18" stroke-linecap="round" stroke-linejoin="round"/>
    `;
  }

  if (icon === "browser") {
    return `
      <rect x="334" y="192" width="432" height="272" rx="28" fill="rgba(255,255,255,0.10)" stroke="${accent}" stroke-width="8"/>
      <rect x="334" y="192" width="432" height="48" rx="28" fill="rgba(255,255,255,0.08)"/>
      <circle cx="382" cy="216" r="8" fill="${primary}"/>
      <circle cx="412" cy="216" r="8" fill="${secondary}"/>
      <circle cx="442" cy="216" r="8" fill="${accent}"/>
      <rect x="374" y="274" width="152" height="114" rx="20" fill="rgba(255,255,255,0.10)"/>
      <path d="M560 286 H690" stroke="${accent}" stroke-width="14" stroke-linecap="round"/>
      <path d="M560 330 H716" stroke="${accent}" stroke-width="14" stroke-linecap="round" opacity="0.82"/>
      <path d="M560 374 H648" stroke="${accent}" stroke-width="14" stroke-linecap="round" opacity="0.58"/>
    `;
  }

  return `
    <rect x="374" y="246" width="352" height="198" rx="34" fill="rgba(255,255,255,0.10)" stroke="${accent}" stroke-width="8"/>
    <circle cx="442" cy="344" r="42" fill="rgba(255,255,255,0.12)" stroke="${accent}" stroke-width="8"/>
    <path d="M516 308 H654" stroke="${accent}" stroke-width="16" stroke-linecap="round"/>
    <path d="M516 346 H676" stroke="${accent}" stroke-width="16" stroke-linecap="round" opacity="0.8"/>
    <path d="M516 384 H624" stroke="${accent}" stroke-width="16" stroke-linecap="round" opacity="0.55"/>
  `;
};

const buildAiProjectVisual = (project = {}, variant = 0) => {
  const preset = getProjectVisualPreset(project);
  const [primary, secondary, accent] = preset.colors;
  const seed = createSeedFromProject(project, variant);
  const shift = seed % 120;
  const status = project.status || "In Progress";
  const label = variant === 0 ? getProjectVisualTitle(project, preset) : `${getProjectKeyword(project)} Concept ${variant + 1}`;
  const projectName = escapeSvgText(project.name || "Project");
  const language = escapeSvgText(project.language || "Innovexa");
  const statusText = escapeSvgText(status);

  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="1200" height="720" viewBox="0 0 1200 720">
      <defs>
        <linearGradient id="glow-${seed}" x1="0%" x2="100%" y1="0%" y2="100%">
          <stop offset="0%" stop-color="${primary}"/>
          <stop offset="50%" stop-color="${secondary}"/>
          <stop offset="100%" stop-color="${accent}"/>
        </linearGradient>
        <filter id="blur-${seed}" x="-40%" y="-40%" width="180%" height="180%">
          <feGaussianBlur stdDeviation="42"/>
        </filter>
      </defs>
      <rect width="1200" height="720" fill="transparent"/>
      <circle cx="${220 + shift}" cy="164" r="126" fill="${primary}" opacity="0.18" filter="url(#blur-${seed})"/>
      <circle cx="${932 - shift}" cy="552" r="146" fill="${accent}" opacity="0.14" filter="url(#blur-${seed})"/>
      <circle cx="${812 - (shift / 2)}" cy="184" r="94" fill="${secondary}" opacity="0.12" filter="url(#blur-${seed})"/>
      <rect x="124" y="112" width="244" height="54" rx="27" fill="rgba(255,255,255,0.06)" stroke="rgba(255,255,255,0.10)"/>
      <text x="154" y="146" font-family="Segoe UI, Arial, sans-serif" font-size="24" font-weight="700" fill="#ffffff">${escapeSvgText(label)}</text>
      <rect x="124" y="512" width="436" height="86" rx="28" fill="rgba(5,10,20,0.28)" stroke="rgba(255,255,255,0.08)"/>
      <text x="154" y="558" font-family="Segoe UI, Arial, sans-serif" font-size="42" font-weight="700" fill="#ffffff">${projectName}</text>
      <text x="154" y="590" font-family="Segoe UI, Arial, sans-serif" font-size="24" fill="rgba(255,255,255,0.78)">${language} | ${statusText}</text>
      <g>
        ${buildIconMarkup(preset.icon, primary, secondary, accent)}
      </g>
      <rect x="780" y="134" width="250" height="148" rx="30" fill="rgba(255,255,255,0.05)" stroke="rgba(255,255,255,0.10)"/>
      <rect x="814" y="172" width="142" height="16" rx="8" fill="url(#glow-${seed})"/>
      <rect x="814" y="206" width="172" height="16" rx="8" fill="rgba(255,255,255,0.24)"/>
      <rect x="814" y="240" width="108" height="16" rx="8" fill="rgba(255,255,255,0.16)"/>
      <rect x="780" y="326" width="250" height="182" rx="30" fill="rgba(255,255,255,0.04)" stroke="rgba(255,255,255,0.10)"/>
      <path d="M824 456 L868 398 L918 422 L980 364" fill="none" stroke="url(#glow-${seed})" stroke-width="14" stroke-linecap="round" stroke-linejoin="round"/>
      <circle cx="868" cy="398" r="10" fill="${primary}"/>
      <circle cx="918" cy="422" r="10" fill="${secondary}"/>
      <circle cx="980" cy="364" r="10" fill="${accent}"/>
    </svg>
  `;

  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
};

export const defaultSiteContent = {
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
  stats: {
    totalProjects: 0,
    completedProjects: 0,
    liveProjects: 0,
  },
  projects: defaultProjects,
};

export const normalizeProject = (project = {}, index = 0) => {
  const status = project.status === "Completed" ? "Completed" : "In Progress";
  const progress = status === "Completed"
    ? 100
    : Math.max(0, Math.min(Number(project.progress) || 0, 99));
  const team = 2;

  return {
    ...project,
    id: String(project.id || `project-${index + 1}`),
    name: String(project.name || `Project ${index + 1}`),
    description: String(project.description || ""),
    status,
    progress,
    team,
    githubUrl: String(project.githubUrl || ""),
    demoUrl: String(project.demoUrl || project.homepage || ""),
    repositoryName: String(project.repositoryName || project.name || `Project ${index + 1}`),
    repositoryFullName: String(project.repositoryFullName || project.fullName || ""),
    owner: String(project.owner || "Innovexa"),
    language: String(project.language || "Not specified"),
    defaultBranch: String(project.defaultBranch || ""),
    visibility: String(project.visibility || (project.private ? "private" : "public")),
    private: Boolean(project.private),
    stars: Math.max(0, Number(project.stars) || 0),
    forks: Math.max(0, Number(project.forks) || 0),
    pushedAt: project.pushedAt || project.updatedAt || null,
    updatedAt: project.updatedAt || null,
    screenshot: String(project.screenshot || ""),
    checks: Array.isArray(project.checks) ? project.checks : [],
  };
};

export const normalizeSiteContent = (content = {}) => {
  const projects = Array.isArray(content.projects)
    ? content.projects.map((project, index) => normalizeProject(project, index))
    : normalizeProjects(defaultSiteContent.projects).map((project, index) => normalizeProject(project, index));

  const completedProjects = projects.filter((project) => project.status === "Completed").length;
  const liveProjects = projects.filter((project) => project.status !== "Completed").length;
  const totalProjects = projects.length;

  return {
    githubOwners: Array.isArray(content.githubOwners) ? content.githubOwners : [],
    githubProfiles: Array.isArray(content.githubProfiles) ? content.githubProfiles : [],
    lastGithubSyncAt: content.lastGithubSyncAt || content.lastGitHubSyncAt || null,
    privateRepoImportEnabled: Boolean(content.privateRepoImportEnabled),
    githubSyncNotice: content.githubSyncNotice || null,
    githubSyncBackoffUntil: content.githubSyncBackoffUntil || null,
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
    stats: {
      totalProjects,
      completedProjects,
      liveProjects,
    },
    projects,
  };
};

export const getProjectScreenshots = (project = {}) => {
  if (project.screenshot) {
    return [project.screenshot];
  }

  const repoScreenshot = buildGitHubRepoScreenshot(project);
  if (repoScreenshot) {
    return [repoScreenshot];
  }

  return [buildOnlineProjectImage(project)];
};

export const getProjectScreenshot = (project = {}) => getProjectScreenshots(project)[0];
export const getProjectFallbackScreenshot = (project = {}) => buildAiProjectVisual(project, 0);
export const getProjectDemoLink = (project = {}) => {
  const demoUrl = String(project.demoUrl || "").trim();
  if (demoUrl) return demoUrl;

  const githubUrl = String(project.githubUrl || "").trim();
  if (githubUrl) return githubUrl;

  return "";
};

export const hasDedicatedProjectDemo = (project = {}) => Boolean(String(project.demoUrl || "").trim());

export const summarizeProjects = (projects = [], stats = null) => {
  const normalizedProjects = Array.isArray(projects)
    ? projects.map((project, index) => normalizeProject(project, index))
    : [];

  const derivedTotalProjects = normalizedProjects.length;
  const derivedCompletedProjects = normalizedProjects.filter((project) => project.status === "Completed").length;
  const derivedLiveProjects = normalizedProjects.filter((project) => project.status !== "Completed").length;
  const hasProjectData = derivedTotalProjects > 0;

  const totalProjects = hasProjectData ? derivedTotalProjects : (stats?.totalProjects ?? 0);
  const completedProjects = hasProjectData ? derivedCompletedProjects : (stats?.completedProjects ?? 0);
  const liveProjects = hasProjectData ? derivedLiveProjects : (stats?.liveProjects ?? 0);
  const progressProjects = normalizedProjects.filter((project) => project.status !== "Completed");
  const averageProgress = progressProjects.length
    ? Math.round(progressProjects.reduce((sum, project) => sum + (project.progress || 0), 0) / progressProjects.length)
    : 0;
  const completionRate = totalProjects ? Math.round((completedProjects / totalProjects) * 100) : 0;
  const repoCoverage = normalizedProjects.filter((project) => getGitHubRepoReference(project)).length;
  const topProject = [...normalizedProjects].sort((a, b) => (b.progress || 0) - (a.progress || 0))[0] || null;

  return {
    totalProjects,
    completedProjects,
    liveProjects,
    totalTeam: normalizedProjects.length ? 2 : 0,
    averageProgress,
    completionRate,
    repoCoverage,
    topProject,
  };
};

// ─── localStorage cache helpers ───────────────────────────────────────────────
const readCachedSiteContent = () => {
  try {
    const ts = Number(localStorage.getItem(SITE_CONTENT_CACHE_TS_KEY) || "0");
    if (Date.now() - ts > CACHE_TTL_MS) return null;
    const raw = localStorage.getItem(SITE_CONTENT_CACHE_KEY);
    if (!raw) return null;
    return normalizeSiteContent(JSON.parse(raw));
  } catch {
    return null;
  }
};

const writeCachedSiteContent = (content) => {
  try {
    localStorage.setItem(SITE_CONTENT_CACHE_KEY, JSON.stringify(content));
    localStorage.setItem(SITE_CONTENT_CACHE_TS_KEY, String(Date.now()));
  } catch {
    // Storage quota — silently ignore
  }
};

/**
 * Returns cached content synchronously if fresh, then re-fetches in background.
 * Callers receive: { cached: content|null, fresh: Promise<content> }
 */
export const fetchSiteContentWithCache = () => {
  const cached = readCachedSiteContent();
  const fresh = fetchSiteContent({ forceRefresh: true });
  return { cached, fresh };
};

export const fetchSiteContent = async ({ forceRefresh = false } = {}) => {
  try {
    const query = forceRefresh ? "?refresh=true" : "";
    const url = `${API_BASE_URL}${API_ENDPOINTS.siteContent}${query}`;
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error("Unable to load site content");
    }

    const data = await response.json();
    const normalized = normalizeSiteContent(data);
    writeCachedSiteContent(data); // cache raw so normalize runs fresh each time
    return normalized;
  } catch {
    // Network unavailable — try GitHub fallback and cache it
    try {
      const importedProjects = await fetchPublicGitHubProjects();
      const content = normalizeSiteContent({
        ...defaultSiteContent,
        projects: importedProjects,
      });
      writeCachedSiteContent({ ...defaultSiteContent, projects: importedProjects });
      return content;
    } catch {
      return normalizeSiteContent(defaultSiteContent);
    }
  }
};