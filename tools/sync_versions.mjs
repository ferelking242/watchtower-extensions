#!/usr/bin/env node
/**
 * sync_versions.mjs — Syncs index JSON entry versions with JS manifests.
 *
 * The app detects extension updates by comparing the installed source version
 * with the version in the index JSON (index/<type>.json). When an extension's
 * JS manifest version is bumped (src/.../<file>.js → watchtowerSources[].version),
 * the matching index entry must be bumped too, otherwise the app never offers
 * the update and the new code/settings never reach installed sources.
 *
 * Usage:
 *   node tools/sync_versions.mjs            # sync all index/*.json
 *   node tools/sync_versions.mjs --dry-run  # print what would change, write nothing
 *
 * The tool only bumps versions upward to the JS manifest value and edits
 * in-place (scoped string replacement), preserving the exact formatting of
 * every other field.
 */
import fs from "node:fs";
import path from "node:path";

const ROOT = path.resolve(import.meta.dirname, "..");
const DRY_RUN = process.argv.includes("--dry-run");
const INDEX_TYPES = ["watch", "manga", "novel", "game", "music", "subtitles"];

// ── 1. Collect JS manifest versions, keyed by file name ─────────────────────
const jsVersions = new Map(); // filename -> version
const unparsed = [];

function walk(dir) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p);
    else if (e.name.endsWith(".js")) {
      const code = fs.readFileSync(p, "utf8");
      // Grab the manifest array block (single- or multi-entry) and use the
      // FIRST entry's version as the canonical file version.
      const m = code.match(/(?:const|var|let) (?:watchtowerSources|mangayomiSources)\s*=\s*\[([\s\S]*?)\];/);
      if (!m) { unparsed.push(e.name); continue; }
      const vm = m[1].match(/"version"\s*:\s*"([^"]+)"/);
      if (!vm) { unparsed.push(e.name); continue; }
      jsVersions.set(e.name, vm[1]);
    }
  }
}
walk(path.join(ROOT, "src"));

// ── 2. For each index, apply scoped version bumps ───────────────────────────
let totalChanged = 0;
for (const type of INDEX_TYPES) {
  const file = path.join(ROOT, "index", `${type}.json`);
  if (!fs.existsSync(file)) { console.warn(`skip: ${file} missing`); continue; }
  const raw = fs.readFileSync(file, "utf8");
  const entries = JSON.parse(raw);
  let changed = 0;
  let out = raw; // mutated in place so multiple entries in one file all apply

  for (const entry of entries) {
    const fname = (entry.sourceCodeUrl || "").split("/").pop();
    const jsVer = jsVersions.get(fname);
    if (!jsVer) continue; // no local JS manifest for this entry (or unparsed)
    const idxVer = entry.version;
    if (idxVer === jsVer) continue; // already in sync
    if (idxVer && compareVersions(idxVer, jsVer) > 0) {
      console.warn(`skip downgrade: ${entry.name} index=${idxVer} js=${jsVer}`);
      continue;
    }

    // Scoped replacement within this entry's span only (anchors are re-found
    // in the mutated string because earlier replacements shift offsets).
    const idStr = `"id": ${entry.id},`;
    const start = out.indexOf(idStr);
    if (start === -1) { console.warn(`⚠ ${type}/${entry.name}: entry id anchor not found, skipped`); continue; }
    const nextId = out.indexOf(`"id": `, start + idStr.length);
    const end = nextId === -1 ? out.length : nextId;
    const slice = out.slice(start, end);
    const oldVerStr = `"version": "${idxVer}"`;
    const newVerStr = `"version": "${jsVer}"`;
    if (!slice.includes(oldVerStr)) {
      console.warn(`⚠ ${type}/${entry.name}: version string not found in entry span, skipped`);
      continue;
    }
    const newSlice = slice.replace(oldVerStr, newVerStr);
    out = out.slice(0, start) + newSlice + out.slice(end);
    if (DRY_RUN) console.log(`  ${type}/${entry.name}: ${idxVer || "?"} → ${jsVer}`);
    changed++;
  }

  if (changed > 0) {
    if (DRY_RUN) {
      console.log(`${type}.json: ${changed} version(s) would change`);
    } else {
      fs.writeFileSync(file, out);
      console.log(`${type}.json: ${changed} version(s) synced`);
    }
  }

  totalChanged += changed;
}

if (unparsed.length) {
  console.warn(`\n${unparsed.length} JS file(s) had no parseable manifest version:`);
  console.warn("  " + unparsed.join(", "));
}
console.log(`\n${DRY_RUN ? "[dry-run] " : ""}total: ${totalChanged} version(s)`);

function compareVersions(a, b) {
  const pa = String(a || "0").split(".").map(Number);
  const pb = String(b || "0").split(".").map(Number);
  for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
    const va = pa[i] || 0, vb = pb[i] || 0;
    if (va !== vb) return va < vb ? -1 : 1;
  }
  return 0;
}