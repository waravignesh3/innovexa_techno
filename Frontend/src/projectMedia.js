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
  const candidateValues = [
    project?.name,
    project?.repositoryName,
    project?.repositoryFullName?.split("/").pop(),
  ].filter(Boolean);
  const candidates = candidateValues.flatMap((value) => [
    normalizeProjectMediaName(value),
    compactProjectMediaName(value),
  ]);
  const candidateTokens = [...new Set(candidateValues.flatMap((value) => tokenizeProjectMediaName(value)))];

  const videoMatch = projectVideoEntries.find(
    ({ normalized, compact, tokens }) => {
      if (candidates.includes(normalized) || candidates.includes(compact)) {
        return true;
      }

      if (candidates.some((candidate) => normalized.includes(candidate) || candidate.includes(normalized))) {
        return true;
      }

      const sharedTokens = tokens.filter((token) => candidateTokens.includes(token)).length;
      return sharedTokens >= Math.min(2, tokens.length, candidateTokens.length);
    }
  );

  return videoMatch?.source || null;
};
