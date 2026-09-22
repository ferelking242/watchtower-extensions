#!/usr/bin/env node
/**
 * validate-extensions.mjs — CI validation for the Watchtower extensions repo.
 *
 * Zero-dependency. Checks, in order:
 *   1. Every JS file under src/ parses (node --check)
 *   2. Every index/*.json, repo.json and ui-layouts/*.json is valid JSON
 *   3. Every extension declares getSourcePreferences() (settings screen)
 *   4. index versions are in sync with the JS manifests (sync_versions.mjs --dry-run)
 *   5. Every marketplace extension points to a repository-hosted icon asset
 *
 * Exit code is non-zero when anything fails, so GitHub Actions can gate
 * pushes/PRs on it. Run locally with:  node tools/validate-extensions.mjs
 */
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const ROOT = path.resolve(import.meta.dirname, "..");
const problems = [];
let filesChecked = 0;

function walkJs(dir) {
  const out = [];
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) out.push(...walkJs(p));
    else if (e.name.endsWith(".js")) out.push(p);
  }
  return out;
}

// ── 1. Syntax-check every extension ─────────────────────────────────────────
console.log("▶ node --check on src/**/*.js");
for (const file of walkJs(path.join(ROOT, "src"))) {
  filesChecked++;
  try {
    execFileSync(process.execPath, ["--check", file], { stdio: "pipe" });
  } catch (e) {
    problems.push(`SYNTAX: ${path.relative(ROOT, file)} — ${String(e.stderr || e.message).trim().split("\n")[0]}`);
  }
}
console.log(`   ${filesChecked} file(s) parsed OK`);

// ── 2. Validate JSON files ──────────────────────────────────────────────────
console.log("▶ JSON validity (index/*.json, repo.json, ui-layouts/*.json)");
const jsonFiles = [];
for (const f of fs.readdirSync(path.join(ROOT, "index"))) {
  if (f.endsWith(".json")) jsonFiles.push(path.join("index", f));
}
for (const f of ["repo.json"]) jsonFiles.push(f);
const layoutsDir = path.join(ROOT, "ui-layouts");
if (fs.existsSync(layoutsDir)) {
  for (const f of fs.readdirSync(layoutsDir)) {
    if (f.endsWith(".json")) jsonFiles.push(path.join("ui-layouts", f));
  }
}
for (const rel of jsonFiles) {
  try {
    JSON.parse(fs.readFileSync(path.join(ROOT, rel), "utf8"));
  } catch (e) {
    problems.push(`JSON: ${rel} — ${e.message}`);
  }
}
console.log(`   ${jsonFiles.length} JSON file(s) valid`);

// ── 2a. Validate the declarative UI contract ─────────────────────────────────
console.log("▶ UI layout structure");
const supportedLayoutComponents = new Set([
  "banner", "spotlight", "categoryPills", "carousel", "historyRow",
  "posterRow", "continueWatching", "quizCard", "newsTicker", "liveNow", "grid",
  "ranked", "compactRow", "creatorRow", "masonry", "studioExplorer",
]);
for (const rel of jsonFiles.filter((file) => file.startsWith("ui-layouts/"))) {
  const layout = JSON.parse(fs.readFileSync(path.join(ROOT, rel), "utf8"));
  if (!Number.isInteger(layout.schemaVersion) || layout.schemaVersion < 1) {
    problems.push(`LAYOUT: ${rel} must declare an integer schemaVersion`);
  }
  const sections = layout.home?.sections;
  if (sections !== undefined && !Array.isArray(sections)) {
    problems.push(`LAYOUT: ${rel} home.sections must be an array`);
  }
  if (!Array.isArray(sections)) continue;
  const ids = new Set();
  for (const section of sections) {
    if (!section || typeof section !== "object") {
      problems.push(`LAYOUT: ${rel} contains a non-object section`);
      continue;
    }
    if (!section.id || typeof section.id !== "string") {
      problems.push(`LAYOUT: ${rel} contains a section without a string id`);
    } else if (ids.has(section.id)) {
      problems.push(`LAYOUT: ${rel} repeats section id ${section.id}`);
    } else {
      ids.add(section.id);
    }
    if (!supportedLayoutComponents.has(section.component)) {
      problems.push(`LAYOUT: ${rel} uses unsupported component ${section.component || "(missing)"}`);
    }
    if (section.seeAll !== undefined && typeof section.seeAll !== "boolean") {
      problems.push(`LAYOUT: ${rel} section ${section.id || "(missing)"} seeAll must be boolean`);
    }
  }
}
console.log("   layout structure is valid");

// ── 2b. Reject the pre-2026 NSFW source layout ───────────────────────────────
console.log("▶ canonical NSFW source layout");
const legacyNsfwDirs = ["src/watch/nsfw", "src/manga/nsfw"];
for (const relDir of legacyNsfwDirs) {
  if (fs.existsSync(path.join(ROOT, relDir))) {
    problems.push(`LEGACY: ${relDir} still exists — move sources to src/nsfw/<type>/<lang>/`);
  }
}
for (const rel of jsonFiles.filter((file) => file.startsWith("index/"))) {
  const raw = fs.readFileSync(path.join(ROOT, rel), "utf8");
  if (raw.includes("src/watch/nsfw/") || raw.includes("src/manga/nsfw/")) {
    problems.push(`LEGACY: ${rel} still references the old NSFW source path`);
  }
  let entries;
  try {
    entries = JSON.parse(raw);
  } catch {
    entries = [];
  }
  if (Array.isArray(entries)) {
    for (const entry of entries) {
      const sourceUrl = typeof entry.sourceCodeUrl === "string" ? entry.sourceCodeUrl : "";
      const marker = "/watchtower-extensions@main/";
      const markerIndex = sourceUrl.indexOf(marker);
      if (markerIndex === -1) continue;
      const relativeSource = sourceUrl.slice(markerIndex + marker.length).split(/[?#]/)[0];
      if (
        relativeSource.startsWith("src/") &&
        !fs.existsSync(path.join(ROOT, relativeSource))
      ) {
        problems.push(
          `SOURCE: ${rel} / ${entry.name || entry.id} points to missing ${relativeSource}`,
        );
      }
    }
  }
}
for (const file of walkJs(path.join(ROOT, "src"))) {
  const raw = fs.readFileSync(file, "utf8");
  if (raw.includes("watch/nsfw/") || raw.includes("manga/nsfw/")) {
    problems.push(`LEGACY: ${path.relative(ROOT, file)} still references the old NSFW path`);
  }
}
console.log("   no legacy NSFW paths found");

// ── 5. Every marketplace entry must have a local, cacheable icon ─────────────
console.log("▶ marketplace icon coverage");
const iconBaseUrl =
  "https://raw.githubusercontent.com/ferelking242/watchtower-extensions/main/";
let iconEntries = 0;
let missingIcons = 0;
for (const rel of jsonFiles.filter((file) => file.startsWith("index/"))) {
  if (rel === "index/plugins.json") continue;
  const data = JSON.parse(fs.readFileSync(path.join(ROOT, rel), "utf8"));
  if (!Array.isArray(data)) continue;
  for (const entry of data) {
    iconEntries++;
    const iconUrl = typeof entry.iconUrl === "string" ? entry.iconUrl : "";
    if (!iconUrl.startsWith(iconBaseUrl + "assets/icons/")) {
      missingIcons++;
      problems.push(
        `ICON: ${rel} / ${entry.name || entry.id} must use a repository-hosted asset`,
      );
      continue;
    }
    const assetPath = iconUrl.split(iconBaseUrl)[1].split(/[?#]/)[0];
    if (!fs.existsSync(path.join(ROOT, assetPath))) {
      missingIcons++;
      problems.push(`ICON: ${rel} / ${entry.name || entry.id} asset is missing`);
    }
  }
}
console.log(`   ${iconEntries - missingIcons}/${iconEntries} entries have local icons`);

// ── 4. Every extension must declare getSourcePreferences ────────────────────
console.log("▶ getSourcePreferences() presence");
const jsFiles = walkJs(path.join(ROOT, "src"));
let noPrefs = 0;
for (const file of jsFiles) {
  const code = fs.readFileSync(file, "utf8");
  if (!code.includes("getSourcePreferences")) {
    noPrefs++;
    problems.push(`PREFS: ${path.relative(ROOT, file)} has no getSourcePreferences()`);
  }
}
console.log(`   ${jsFiles.length - noPrefs}/${jsFiles.length} extensions declare settings`);

// ── 4. Index versions in sync with JS manifests ─────────────────────────────
console.log("▶ index version sync (sync_versions.mjs --dry-run)");
try {
  const out = execFileSync(process.execPath, ["tools/sync_versions.mjs", "--dry-run"], {
    cwd: ROOT,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  });
  const wouldChange = out.match(/\d+ version\(s\) would change/g) || [];
  const total = wouldChange.reduce((n, s) => n + parseInt(s, 10), 0);
  if (total > 0) {
    problems.push(`VERSION SYNC: ${total} index version(s) out of sync — run: node tools/sync_versions.mjs`);
  } else {
    console.log("   all index versions in sync");
  }
} catch (e) {
  problems.push(`VERSION SYNC: ${String(e.stderr || e.message).trim().split("\n")[0]}`);
}

// ── Summary ─────────────────────────────────────────────────────────────────
if (problems.length) {
  console.error(`\n❌ ${problems.length} problem(s):`);
  for (const p of problems) console.error("   " + p);
  process.exit(1);
}
console.log("\n✅ All extension checks passed.");