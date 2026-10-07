import fs from "node:fs";
import path from "node:path";

const cache = new Map();

function topLevelObjects(source) {
  const result = [];
  let depth = 0;
  let start = -1;
  let inString = false;
  let escaped = false;

  for (let i = 0; i < source.length; i++) {
    const char = source[i];
    if (inString) {
      if (escaped) escaped = false;
      else if (char === "\\") escaped = true;
      else if (char === '"') inString = false;
      continue;
    }
    if (char === '"') {
      inString = true;
    } else if (char === "{") {
      if (depth++ === 0) start = i;
    } else if (char === "}" && --depth === 0 && start >= 0) {
      result.push(source.slice(start, i + 1));
      start = -1;
    }
  }
  return result;
}

export function sourceManifestEntries(sourceFile) {
  if (cache.has(sourceFile)) return cache.get(sourceFile);
  let code;
  try {
    code = fs.readFileSync(sourceFile, "utf8");
  } catch {
    cache.set(sourceFile, []);
    return [];
  }
  const manifest = code.match(
    /(?:const|var|let)\s+(?:watchtowerSources|mangayomiSources)\s*=\s*\[([\s\S]*?)\];/,
  );
  if (!manifest) {
    cache.set(sourceFile, []);
    return [];
  }
  const entries = topLevelObjects(manifest[1]).map((object) => {
    const name = object.match(/["']name["']\s*:\s*["']([^"']+)["']/)?.[1];
    const login = object.match(/["']?login["']?\s*:\s*(true|false)\b/)?.[1];
    return {
      name,
      login: login === "true",
      hasLoginFlag: login !== undefined,
    };
  });
  cache.set(sourceFile, entries);
  return entries;
}

export function sourceLoginFlag(root, sourceCodeUrl, sourceName) {
  const relativePath = String(sourceCodeUrl || "").match(
    /(?:^|\/)src\/([^?#]+)/,
  )?.[1];
  if (!relativePath) return false;
  const sourceFile = path.join(root, "src", decodeURIComponent(relativePath));
  const entries = sourceManifestEntries(sourceFile);
  const normalizedName = String(sourceName || "").trim().toLowerCase();
  const matching = entries.find(
    (entry) => entry.name?.trim().toLowerCase() === normalizedName,
  );
  if (matching) return matching.login;
  if (entries.length === 1) return entries[0].login;
  return false;
}
