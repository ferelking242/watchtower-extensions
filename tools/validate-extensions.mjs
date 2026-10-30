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
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { sourceLoginFlag } from "./source_manifest.mjs";
import { validateTags } from "./catalog_taxonomy.mjs";

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

// ── 2a. Login controls are an explicit source-manifest opt-in ────────────────
console.log("▶ source login support flags");
let sourceEntries = 0;
for (const rel of jsonFiles.filter(
  (file) => file.startsWith("index/") && file !== "index/plugins.json",
)) {
  const entries = JSON.parse(fs.readFileSync(path.join(ROOT, rel), "utf8"));
  if (!Array.isArray(entries)) {
    problems.push(`LOGIN: ${rel} must contain a source array`);
    continue;
  }
  for (const entry of entries) {
    sourceEntries++;
    if (typeof entry.login !== "boolean") {
      problems.push(`LOGIN: ${rel} / ${entry.name || entry.id} must declare a boolean login flag`);
      continue;
    }
    const expected = sourceLoginFlag(
      ROOT,
      entry.sourceCodeUrl,
      entry.name,
    );
    if (entry.login !== expected) {
      problems.push(
        `LOGIN: ${rel} / ${entry.name || entry.id} declares ${entry.login}, but its source manifest expects ${expected}`,
      );
    }
  }
}
console.log(`   ${sourceEntries} source entries checked`);

// ── 2a. Validate the declarative UI contract ─────────────────────────────────
console.log("▶ UI layout structure");
// Mirror the home-context ids and aliases from
// watchtower/lib/models/layout_component_registry.dart. The registry appends
// one home-context definition per gallery card (`LayoutComponentRegistry.all`),
// so a gallery card id is a valid section renderer too — that is how a layout
// asks for a specific presentation, e.g. `landscape` with
// `params.layout: "grid"` for a two-row grid of half-height landscape cards.
const supportedLayoutComponents = new Set([
  "spotlight", "carousel", "banner", "hero", "ranked", "newHot", "new_hot",
  "rankedWide", "showcase", "creatorRow", "landscapeStacked", "backdropWide",
  "studioExplorer", "universeExplorer", "collectionTimeline", "grid",
  "catalogue", "discoverGrid", "category", "categoryPills", "doubleFeature",
  "editorialSplit", "masonry", "feed", "collectionCards", "playlistCarousel",
  "compactRow", "compact", "historyRow", "metadataPoster", "statusPoster",
  // Gallery card ids accepted as section renderers (home context).
  "animated-discovery", "app-genre-tile", "badge-strip", "carousel-card",
  "censored-badge", "collection", "collection-rail", "compact-episode",
  "continue-watching", "continue-watching-item", "discovery", "episode",
  "episode-carousel", "episode-list", "episode-list-item", "episode-preview",
  "episode-progress", "episode-thumbnail", "expandable-movie",
  "expanded-movie", "featured", "featured-discovery", "featured-episode",
  "featured-movie-rail", "genre-grid-section", "home-airecommender",
  "home-genre-tile", "home-hero-banner", "home-language-grid",
  "home-mini-player", "home-my-list", "home-popular-rail", "home-read-rail",
  "home-spotlight-rail", "hover-movie", "interactive-movie", "landscape",
  "landscape-discovery", "landscape-genre-row", "landscape-playlist",
  "landscape-rail", "landscape-showcase", "language-badge", "latest-episode",
  "manga-banner", "manga-card", "manga-category-ranking", "manga-chapter",
  "manga-chapter-badge", "manga-chapter-group", "manga-chapter-list",
  "manga-chapter-navigation", "manga-chapter-next", "manga-chapter-progress",
  "manga-chapter-range", "manga-chapter-release", "manga-chapter-search",
  "manga-chapter-timeline", "manga-chapter-volume",
  "manga-character-relations", "manga-collection-showcase",
  "manga-collection-tracker", "manga-demographics", "manga-double-page",
  "manga-edition-language", "manga-featured", "manga-followers",
  "manga-format", "manga-franchise-universes", "manga-frequency",
  "manga-genre", "manga-genres", "manga-global-stats", "manga-item-stats",
  "manga-language-news", "manga-languages", "manga-latest-release",
  "manga-latest-update", "manga-linked-series", "manga-list-tile",
  "manga-new-chapter", "manga-page", "manga-page-preview",
  "manga-page-progress", "manga-page-strip", "manga-popularity",
  "manga-publishers", "manga-quick-access", "manga-ranking", "manga-reader",
  "manga-reader-chapter-list", "manga-reader-floating",
  "manga-reader-history", "manga-reader-settings", "manga-reading-direction",
  "manga-reading-mode", "manga-reading-progress", "manga-relation-list",
  "manga-relation-type", "manga-release-timeline", "manga-reports",
  "manga-resume", "manga-same-universe", "manga-scan-group",
  "manga-serialization", "manga-special-edition", "manga-spotlight",
  "manga-stats-grid", "manga-status", "manga-tags", "manga-themes",
  "manga-top3", "manga-trending-list", "manga-universe-chronology",
  "manga-universe-map", "manga-universe-showcase", "manga-universe-timeline",
  "manga-upcoming-volume", "manga-update-row", "manga-volume",
  "manga-volume-list", "manga-volume-preview", "manga-vote",
  "media-banner-rail", "media-details-modal", "media-grid", "media-hero",
  "media-landscape", "media-preview", "media-progress", "media-quick-view",
  "media-ranked", "movie-detail", "movie-details", "movie-details-modal",
  "movie-preview", "movie-quick-view", "next-episode", "next-episode-hero",
  "now-playing", "numbered", "popular", "poster", "poster-card-compact",
  "poster-rail", "progress-media", "progress-media-card-chip",
  "progress-media-card-percent", "ranked-card", "ranked-discovery",
  "ranked-media", "ranked-rail", "recently-watched", "recommendation",
  "resume-watching", "saga-discovery", "season", "season-banner",
  "season-detail", "season-episode", "season-selector", "series-banner",
  "series-episode", "series-episode-list", "series-grid", "similar-media",
  "spotlight-card", "spotlight-discovery", "subtitle-badge", "tag",
  "three-column-swipe", "tmdb-featured-stack", "tmdb-hero-carousel",
  "top-movies", "top-rated", "trending", "up-next", "up-next-compact",
  "watch-again", "watch-progress", "watch-providers-rail",
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
    // Optional presentation hint for the page a "see all" tile opens. The app
    // reads it generically, so any extension may use it; only the known page
    // kinds are accepted here.
    if (section.seeAllPage !== undefined) {
      const known = new Set(["tags"]);
      if (!known.has(section.seeAllPage)) {
        problems.push(
          `LAYOUT: ${rel} section ${section.id || "(missing)"} uses unknown seeAllPage ${section.seeAllPage}`,
        );
      }
    }
  }
}
console.log("   layout structure is valid");

// ── 2a-bis. Les sourceCodeUrl doivent viser un commit figé ──────────────────
// Avertissement, pas erreur : le workflow `pin-sources.yml` répare l'index
// automatiquement juste après le push. On le signale quand même, car une URL
// sur `@main` signifie que l'app servira du code périmé jusqu'à ce que le
// figage soit committé.
console.log("▶ source URLs pinned to a commit");
{
  let mutable = 0;
  for (const rel of jsonFiles.filter((file) => file.startsWith("index/"))) {
    const raw = fs.readFileSync(path.join(ROOT, rel), "utf8");
    const matches = raw.match(
      /cdn\.jsdelivr\.net\/gh\/[\w.-]+\/[\w.-]+@(?![\da-f]{7,40}\/)([^/"]+)\//gi,
    );
    mutable += matches ? matches.length : 0;
  }
  if (mutable > 0) {
    console.warn(
      `   ⚠ ${mutable} source URL(s) on a mutable revision — run: npm run pin (or wait for pin-sources.yml)`,
    );
  } else {
    console.log("   all source URLs pinned to a commit");
  }
}

// ── 2b. Marketplace taxonomy: tags must exist, be canonical and coherent ─────
// A tag is what the Marketplace shelves are built from, so a typo or an
// invented category must fail here rather than silently produce an empty
// shelf in the app.
console.log("▶ marketplace tags");
{
  let tagged = 0;
  let tagTotal = 0;
  for (const rel of jsonFiles.filter((file) => file.startsWith("index/"))) {
    if (rel === "index/plugins.json") continue;
    const entries = JSON.parse(fs.readFileSync(path.join(ROOT, rel), "utf8"));
    if (!Array.isArray(entries)) continue;
    for (const entry of entries) {
      if (!Array.isArray(entry.tags) || entry.tags.length === 0) {
        problems.push(
          `TAGS: ${rel} / ${entry.name || entry.id} has no tags — run: node tools/generate_tags.mjs`,
        );
        continue;
      }
      tagged++;
      tagTotal += entry.tags.length;
      for (const problem of validateTags(entry.tags, {
        itemType: entry.itemType,
      })) {
        problems.push(`TAGS: ${rel} / ${entry.name || entry.id}: ${problem}`);
      }
      if (
        entry.addedAt !== undefined &&
        !/^\d{4}-\d{2}-\d{2}$/.test(String(entry.addedAt))
      ) {
        problems.push(
          `TAGS: ${rel} / ${entry.name || entry.id} addedAt must be YYYY-MM-DD`,
        );
      }
    }
  }
  console.log(`   ${tagged} entries tagged (${tagTotal} tags)`);

  // `popular`/`trending` claim a popularity signal the catalogue does not have.
  for (const rel of jsonFiles.filter((file) => file.startsWith("index/"))) {
    const raw = fs.readFileSync(path.join(ROOT, rel), "utf8");
    if (/"tags"\s*:\s*\[[^\]]*"(?:popular|trending)"/.test(raw)) {
      problems.push(
        `TAGS: ${rel} claims "popular"/"trending" — the catalogue has no popularity signal`,
      );
    }
  }

  // The generated tags must match what generate_tags.mjs would write.
  try {
    execFileSync(process.execPath, ["tools/generate_tags.mjs", "--check"], {
      cwd: ROOT,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
    });
    console.log("   tags are in sync with the catalogue");
  } catch (e) {
    problems.push(
      `TAGS SYNC: ${String(e.stdout || e.stderr || e.message).trim().split("\n").slice(-3).join(" ")}`,
    );
  }
}

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
      // La révision est un SHA figé (ou une branche) : on ne peut pas la
      // chercher en dur, sinon la vérification « fichier source présent »
      // serait silencieusement ignorée dès que les URL sont figées.
      const marker = sourceUrl.match(
        /cdn\.jsdelivr\.net\/gh\/[^@]+@[^/]+\//,
      )?.[0];
      if (!marker) continue;
      const markerIndex = sourceUrl.indexOf(marker);
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

// ── 5b. Plugin icons must be distinct ───────────────────────────────────────
// Every music plugin used to ship the same `assets/logo.png` copied from the
// Spotify repository, so Deezer, Apple Music and YouTube Music all displayed
// the Spotify mark. Identical bytes across two plugins means one of them is
// wrong, which is only visible once the icons are compared by content.
console.log("▶ plugin icon distinctness");
{
  const pluginIndex = path.join(ROOT, "index", "plugins.json");
  if (fs.existsSync(pluginIndex)) {
    const doc = JSON.parse(fs.readFileSync(pluginIndex, "utf8"));
    const plugins = Array.isArray(doc.plugins) ? doc.plugins : [];
    const byHash = new Map();
    const iconBase = "assets/plugins/";
    for (const plugin of plugins) {
      const icon = typeof plugin.icon === "string" ? plugin.icon : "";
      if (!icon) {
        problems.push(
          `PLUGIN ICON: ${plugin.id} has no icon — every plugin needs its own logo`,
        );
        continue;
      }
      if (!icon.includes("/" + iconBase)) continue;
      const rel = icon.slice(icon.indexOf(iconBase));
      const file = path.join(ROOT, rel);
      if (!fs.existsSync(file)) {
        problems.push(`PLUGIN ICON: ${plugin.id} asset is missing: ${rel}`);
        continue;
      }
      const hash = crypto
        .createHash("md5")
        .update(fs.readFileSync(file))
        .digest("hex");
      const previous = byHash.get(hash);
      if (previous) {
        problems.push(
          `PLUGIN ICON: ${plugin.id} and ${previous} ship the same image — ` +
            `each plugin needs its own branded logo`,
        );
      } else {
        byHash.set(hash, plugin.id);
      }
    }
    console.log(`   ${byHash.size} distinct plugin logo(s) across ${plugins.length} plugin(s)`);
  }
}

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

// ── 3b. Index itemType must match the catalogue the entry lives in ──────────
// The app maps index itemType through ItemType.values (Source.itemType),
// so a miscoded entry installs into the wrong catalogue tab.
console.log("▶ index itemType matches catalogue");
const catalogueItemType = {
  "index/watch.json": 1,   // ItemType.anime
  "index/manga.json": 0,   // ItemType.manga
  "index/novel.json": 2,   // ItemType.novel
  "index/music.json": 3,   // ItemType.music
  "index/game.json": 4,    // ItemType.game
};
for (const rel of jsonFiles.filter((file) => catalogueItemType[file] !== undefined)) {
  const expected = catalogueItemType[rel];
  const entries = JSON.parse(fs.readFileSync(path.join(ROOT, rel), "utf8"));
  if (!Array.isArray(entries)) continue;
  for (const entry of entries) {
    if (entry.itemType !== expected) {
      problems.push(
        `ITEMTYPE: ${rel} / ${entry.name || entry.id} declares ${entry.itemType}, expected ${expected} for this catalogue`,
      );
    }
  }
}
console.log("   itemType values match their catalogue");

// ── 3c. Index entries must stay uniquely addressable ────────────────────────
// The app keys its catalogue by `id`, so a repeated id would make two distinct
// sources indistinguishable. A repeated display *name* is legal — `SpankBang`
// ships both `spankbang.js` and `spankbang_new.js`, `AnimeSongLyrics` has an
// old and a rewritten source — but it is worth surfacing so the maintainers can
// confirm the pair is intentional rather than a copy-paste accident.
console.log("▶ index id uniqueness");
const idsSeen = new Map();
const namesSeen = new Map();
let duplicateNames = 0;
for (const rel of jsonFiles.filter((file) => catalogueItemType[file] !== undefined)) {
  const entries = JSON.parse(fs.readFileSync(path.join(ROOT, rel), "utf8"));
  if (!Array.isArray(entries)) continue;
  for (const entry of entries) {
    const id = entry.id;
    if (idsSeen.has(id)) {
      problems.push(
        `DUPLICATE ID: ${id} appears in both ${idsSeen.get(id)} and ${rel} (${entry.name || "?"})`,
      );
    } else {
      idsSeen.set(id, rel);
    }
    const key = `${rel}|${String(entry.name || "").trim().toLowerCase()}`;
    if (namesSeen.has(key)) duplicateNames++;
    namesSeen.set(key, entry.id);
  }
}
if (duplicateNames > 0) {
  console.log(
    `   ⚠ ${duplicateNames} display name(s) used by more than one entry in the same catalogue`,
  );
} else {
  console.log("   every entry id is unique");
}

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