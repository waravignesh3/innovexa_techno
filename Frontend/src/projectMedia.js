const projectVideos = import.meta.glob("./sources/*.{mp4,webm,ogg,mov,m4v}", { eager: true, import: "default" });

const normalizeProjectMediaName = (value = "") => String(value)
  .toLowerCase()
  .replace(/\.[^.]+$/, "")
  .replace(/[^a-z0-9]+/g, "-")
  .replace(/^-+|-+$/g, "");

const compactProjectMediaName = (value = "") => normalizeProjectMediaName(value).replace(/-/g, "");
const tokenizeProjectMediaName = (value = "") => normalizeProjectMediaName(value).split("-").filter(Boolean);

const projectVideoEntries = Object.entries(projectVideos).map(([filePath, source]) => {
  const fileName = filePath.split("/").pop() || "";

  return {
    source,
    normalized: normalizeProjectMediaName(fileName),
    compact: compactProjectMediaName(fileName),
    tokens: tokenizeProjectMediaName(fileName),
  };
});

export const getProjectVideoSource = (project) => {
  // If the project already has a video URL (e.g. from MongoDB/Backend), use it directly
  if (project?.videoUrl) {
    return project.videoUrl;
  }

  const projectName = project?.name || "";
  const normalizedProjectName = normalizeProjectMediaName(projectName);
  const compactProjectName = compactProjectMediaName(projectName);

  const videoMatch = projectVideoEntries.find(
    ({ normalized, compact }) => 
      normalized === normalizedProjectName || compact === compactProjectName
  );

  return videoMatch?.source || null;
};
