#!/usr/bin/env node
/**
 * validate-extensions.mjs — CI validation for the Watchtower extensions repo.
 *
 * Zero-dependency. Checks, in order:
 *   1. Every JS file under src/ parses (node --check)
 *   2. Every index/*.json, repo.json and ui-layouts/*.json is valid JSON
 *   3. Every extension declares getSourcePreferences() (settings screen)
 *   4. index versions are in sync with the JS manifests (sync_versions.mjs --dry-run)
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

// ── 3. Every extension must declare getSourcePreferences ────────────────────
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