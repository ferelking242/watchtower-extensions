#!/usr/bin/env node
/**
 * pin_sources.mjs — Repointe `sourceCodeUrl` vers un commit figé.
 *
 * Pourquoi : l'app télécharge le code de chaque extension depuis
 * `cdn.jsdelivr.net/gh/<repo>@main/src/...`. jsDelivr sert une branche `@main`
 * avec `s-maxage=43200` (12 h) et `max-age=604800` (7 j), ET IGNORE la query
 * string : le `?_=<timestamp>` que l'app ajoute pour forcer un cache-miss
 * renvoie l'objet en cache, pas le nouveau fichier. Résultat : l'app voit
 * « mise à jour disponible » dans l'index (raw.githubusercontent, frais) puis
 * retélécharge l'ANCIEN code pendant des heures.
 *
 * Une URL figée sur un SHA (`@<sha>`) est immutable côté jsDelivr : un nouveau
 * commit donne une nouvelle URL, donc toujours le bon octet, sans purge ni
 * délai de propagation.
 *
 * Par défaut, seules les entrées dont le fichier source a changé dans le
 * dernier commit sont réécrites, pour ne pas remuer les ~1000 entrées de
 * l'index à chaque push. Une révision encore mutable est toujours reprise.
 *
 * Usage:
 *   node tools/pin_sources.mjs                # fige les fichiers changés (git)
 *   node tools/pin_sources.mjs --all          # fige toutes les entrées
 *   node tools/pin_sources.mjs --dry-run      # n'écrit rien
 *   node tools/pin_sources.mjs --sha=<sha>    # fige sur un commit précis
 *   node tools/pin_sources.mjs --check        # échoue si une révision est mutable
 *
 * Sortie : exit 0 = rien à faire, exit 10 = des fichiers ont été modifiés.
 */
import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";

const ROOT = path.resolve(import.meta.dirname, "..");
const DRY_RUN = process.argv.includes("--dry-run");
const CHECK_ONLY = process.argv.includes("--check");
const PIN_ALL = process.argv.includes("--all");
const INDEX_TYPES = ["watch", "manga", "novel", "game", "music", "subtitles"];

function git(args) {
  return execFileSync("git", args, { cwd: ROOT, encoding: "utf8" }).trim();
}

function resolveSha() {
  const fromArg = process.argv.find((a) => a.startsWith("--sha="));
  if (fromArg) return fromArg.slice("--sha=".length).trim();
  const fromEnv = (process.env.PIN_SHA || process.env.GITHUB_SHA || "").trim();
  if (fromEnv) return fromEnv;
  try {
    return git(["rev-parse", "HEAD"]);
  } catch {
    return "";
  }
}

// Fichiers source modifiés par le dernier commit. `null` signifie « on ne sait
// pas » (historique absent, premier commit) : on fige alors tout, ce qui est
// toujours sûr — au pire on remplace une URL figée par une autre, équivalente.
function changedSourceFiles() {
  if (PIN_ALL) return null;
  try {
    const files = git(["diff", "--name-only", "HEAD~1", "HEAD"])
      .split("\n")
      .map((line) => line.trim())
      .filter((line) => line.startsWith("src/") && line.endsWith(".js"));
    return new Set(files);
  } catch {
    return null;
  }
}

// Versions déclarées par l'index au commit précédent, par type. Sert à
// rattraper le cas où seule la version d'une entrée d'index est modifiée (sans
// toucher `src/`) : sans ce garde-fou, l'index annoncerait une nouvelle version
// en pointant encore sur l'ancien code — exactement le blocage constaté.
function previousVersions(type) {
  try {
    const raw = git(["show", `HEAD~1:index/${type}.json`]);
    const map = new Map();
    for (const entry of JSON.parse(raw)) {
      map.set(entry.id ?? entry.name, entry.version);
    }
    return map;
  } catch {
    return null;
  }
}

const sha = resolveSha();
if (!/^[0-9a-f]{7,40}$/i.test(sha)) {
  console.error(`pin_sources: commit invalide (« ${sha} »)`);
  process.exit(1);
}

// Le slug du dépôt est lu dans les URL déjà présentes : le script reste correct
// si le dépôt est forké ou renommé, sans constante à maintenir.
function detectRepo() {
  for (const type of INDEX_TYPES) {
    const file = path.join(ROOT, "index", `${type}.json`);
    if (!fs.existsSync(file)) continue;
    const m = fs
      .readFileSync(file, "utf8")
      .match(/cdn\.jsdelivr\.net\/gh\/([\w.-]+\/[\w.-]+)@/);
    if (m) return m[1];
  }
  return "";
}

const repo = detectRepo();
if (!repo) {
  console.error("pin_sources: impossible de détecter le dépôt dans index/*.json");
  process.exit(1);
}

const escapedRepo = repo.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const entryUrl = new RegExp(
  `cdn\\.jsdelivr\\.net/gh/${escapedRepo}@([^/]+)/(src/[^"\\s]*)`,
);
const isPinned = (revision) => /^[0-9a-f]{7,40}$/i.test(revision);

const changed = changedSourceFiles();
const pinEverything = changed === null;

let totalPinned = 0;
let problems = 0;

for (const type of INDEX_TYPES) {
  const file = path.join(ROOT, "index", `${type}.json`);
  if (!fs.existsSync(file)) continue;

  let raw;
  let entries;
  try {
    raw = fs.readFileSync(file, "utf8");
    entries = JSON.parse(raw);
  } catch (error) {
    console.error(`pin_sources: ${type}.json illisible — ${error.message}`);
    problems++;
    continue;
  }
  if (!Array.isArray(entries)) continue;

  const replacements = [];
  const before = pinEverything ? null : previousVersions(type);
  for (const entry of entries) {
    const url = typeof entry.sourceCodeUrl === "string" ? entry.sourceCodeUrl : "";
    const match = url.match(entryUrl);
    if (!match) continue;
    const [, revision, relativeSource] = match;

    // `--check` vérifie l'invariant qui compte : la révision doit être un
    // commit figé. Un SHA plus ancien que HEAD est normal — seuls les fichiers
    // modifiés sont refigés — donc ce n'est pas un problème.
    if (CHECK_ONLY) {
      if (!isPinned(revision)) {
        console.error(
          `✗ ${type}.json / ${entry.name || entry.id} : révision mutable « ${revision} »`,
        );
        problems++;
      }
      continue;
    }

    if (isPinned(revision)) {
      // Déjà figé et le fichier n'a pas bougé : rien à faire.
      if (revision === sha) continue;
      if (!pinEverything && !changed.has(relativeSource)) {
        // Sauf si la version annoncée par l'index a changé sans que `src/` ne
        // soit touché : il faut alors refiger pour ne pas figer une nouvelle
        // version sur l'ancien code.
        const key = entry.id ?? entry.name;
        const bumped = before?.get(key) !== undefined && before.get(key) !== entry.version;
        if (!bumped) continue;
      }
    }

    replacements.push({
      from: url,
      to: url.replace(`@${revision}/`, `@${sha}/`),
    });
  }

  if (replacements.length === 0) {
    // En mode `--check`, l'absence de réécriture ne veut pas dire « tout va
    // bien » (des révisions mutables ont pu être signalées plus haut) : on
    // n'affiche donc pas de ✓ trompeur.
    if (!CHECK_ONLY) console.log(`✓ ${type}.json : rien à figer`);
    continue;
  }

  if (CHECK_ONLY) {
    console.error(`✗ ${type}.json : ${replacements.length} entrée(s) encore mutable(s)`);
    problems++;
    continue;
  }

  if (DRY_RUN) {
    console.log(
      `~ ${type}.json : ${replacements.length} entrée(s) à figer sur ${sha.slice(0, 7)} (dry-run)`,
    );
    totalPinned += replacements.length;
    continue;
  }

  // Réécriture chirurgicale : seules les URL concernées changent, le reste de
  // l'index (formaté ligne à ligne) est laissé intact.
  let out = raw;
  for (const { from, to } of replacements) out = out.split(from).join(to);
  fs.writeFileSync(file, out);
  console.log(`✓ ${type}.json : ${replacements.length} entrée(s) figée(s) sur ${sha.slice(0, 7)}`);
  totalPinned += replacements.length;
}

if (CHECK_ONLY) {
  if (problems > 0) {
    console.error(
      "\nDes URL pointent sur une révision mutable : l'app servirait du code périmé.",
    );
    process.exit(1);
  }
  console.log("\nToutes les URL sont figées sur un commit.");
  process.exit(0);
}

// Un index illisible est signalé plus haut : sans ce garde-fou, le script
// sortirait en 0 (« rien à figer ») et la CI laisserait passer un index cassé.
if (problems > 0) {
  console.error(`\n${problems} index illisible(s) — rien n'a pu être figé.`);
  process.exit(1);
}

if (totalPinned === 0) {
  console.log("\nRien à figer.");
  process.exit(0);
}

console.log(`\n${totalPinned} URL figée(s) sur @${sha.slice(0, 7)}`);
process.exit(DRY_RUN ? 0 : 10);
