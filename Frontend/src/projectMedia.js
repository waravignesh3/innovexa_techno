const projectVideos = import.meta.glob("./sources/*.{mp4,webm,ogg,mov,m4v}", { eager: true, import: "default" });

const normalizeProjectMediaName = (value = "") => String(value)
  .toLowerCase()
  .replace(/\.[^.]+$/, "")
  .replace(/[^a-z0-9]+/g, "-")
  .replace(/^-+|-+$/g, "");

const compactProjectMediaName = (value = "") => normalizeProjectMediaName(value).replace(/-/g, "");

const projectVideoEntries = Object.entries(projectVideos).map(([filePath, source]) => {
  const fileName = filePath.split("/").pop() || "";

  return {
    source,
    normalized: normalizeProjectMediaName(fileName),
    compact: compactProjectMediaName(fileName),
  };
});

export const getProjectVideoSource = (project) => {
  const candidates = [
    project?.name,
    project?.repositoryName,
    project?.repositoryFullName?.split("/").pop(),
  ]
    .filter(Boolean)
    .flatMap((value) => [normalizeProjectMediaName(value), compactProjectMediaName(value)]);

  const videoMatch = projectVideoEntries.find(
    ({ normalized, compact }) => candidates.includes(normalized) || candidates.includes(compact)
  );

  return videoMatch?.source || null;
};
