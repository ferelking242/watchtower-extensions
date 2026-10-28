#!/usr/bin/env node
/**
 * generate_tags.mjs — Writes the marketplace `tags` field on every index entry.
 *
 * Tags are derived from evidence that already exists in the repository:
 *
 *   contentTypes  the catalogue the entry lives in (`itemType`) plus the
 *                 content-type labels the extension really declares in its
 *                 `getFilterList()` ("Manhwa", "Webtoon", "Light Novel"…).
 *                 A domain or a brand name is never enough.
 *   genres        the genre labels the extension really exposes as filters.
 *   languages     `lang` plus `langs`, mapped through the canonical language
 *                 table. A French-looking name does not make a source French.
 *   featured      the existing `forYou` opt-in. Nothing else.
 *   addedAt       the date the entry first appeared in git history, when the
 *                 clone has the history. Omitted otherwise, never guessed.
 *
 * `popular` and `trending` are deliberately never written: the catalogue has no
 * real popularity signal, and inventing one would make the Marketplace claim
 * something it cannot back.
 *
 * Usage:
 *   node tools/generate_tags.mjs            # write index/*.json
 *   node tools/generate_tags.mjs --dry-run  # report only
 *   node tools/generate_tags.mjs --check    # fail when tags are out of date
 */
import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import {
  contentTagForLabel,
  GENRE_LABEL_TO_TAG,
  ITEM_TYPE_TO_CONTENT,
  languageTagFor,
  orderTags,
  validateTags,
} from "./catalog_taxonomy.mjs";

const ROOT = path.resolve(import.meta.dirname, "..");
const DRY_RUN = process.argv.includes("--dry-run");
const CHECK_ONLY = process.argv.includes("--check");
const INDEX_TYPES = ["watch", "manga", "novel", "music", "game", "subtitles"];

// ── Evidence extraction ─────────────────────────────────────────────────────

/**
 * Returns the body of `getFilterList()` only.
 *
 * The scan stops at the next top-level method so a genre table is never
 * confused with an unrelated string constant further down the file.
 */
function filterListBody(code) {
  const start = code.indexOf("getFilterList");
  if (start < 0) return "";
  const rest = code.slice(start);
  const end = rest.search(/\n\s{4}(?:async\s+)?[a-zA-Z_$][\w$]*\s*\(/);
  return end > 0 ? rest.slice(0, end) : rest.slice(0, 8000);
}

/** String literals inside the filter list, comments stripped. */
function filterLabels(body) {
  if (!body) return [];
  const stripped = body
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/\/\/[^\n]*/g, "");
  const labels = [];
  for (const match of stripped.matchAll(/(["'])((?:\\.|(?!\1)[^\\])*)\1/g)) {
    const value = match[2].trim();
    if (value.length < 2 || value.length > 40) continue;
    if (/[/:@?#&=<>]/.test(value)) continue;
    if (!/[a-zA-ZÀ-ÿ]/.test(value)) continue;
    // Filter plumbing keys, never a content label.
    if (
      [
        "type_name",
        "name",
        "value",
        "state",
        "values",
        "getFilterList",
        "SelectFilter",
        "SelectOption",
        "CheckBox",
        "GroupFilter",
        "TriStateFilter",
        "TextFilter",
        "SortFilter",
        "HeaderFilter",
        "SeparatorFilter",
      ].includes(value)
    ) {
      continue;
    }
    labels.push(value);
  }
  return labels;
}

/** Source file a catalogue entry points at, or null. */
function sourceFileFor(entry) {
  const url = typeof entry.sourceCodeUrl === "string" ? entry.sourceCodeUrl : "";
  const relative = url.match(/@[^/]+\/(src\/[^?#\s]+)/)?.[1];
  if (!relative) return null;
  const absolute = path.join(ROOT, decodeURIComponent(relative));
  return fs.existsSync(absolute) ? absolute : null;
}

// ── addedAt ─────────────────────────────────────────────────────────────────

const addedAtCache = new Map();

/**
 * Date each entry id first appeared in `index/<type>.json`, from git history.
 *
 * The file's revisions are walked oldest-first and stop as soon as every id is
 * accounted for, so the whole catalogue costs one pass per index instead of one
 * pass per entry. A shallow clone simply yields no dates: the field is then
 * omitted rather than invented.
 */
function addedAtMap(type, ids) {
  const cached = addedAtCache.get(type);
  if (cached) return cached;
  const result = new Map();
  const wanted = new Set(ids);
  try {
    const revisions = execFileSync(
      "git",
      ["log", "--reverse", "--format=%H %cs", "--", `index/${type}.json`],
      { cwd: ROOT, encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] },
    )
      .trim()
      .split("\n")
      .filter(Boolean);
    for (const line of revisions) {
      const [sha, date] = line.split(" ");
      let entries;
      try {
        entries = JSON.parse(
          execFileSync("git", ["show", `${sha}:index/${type}.json`], {
            cwd: ROOT,
            encoding: "utf8",
            stdio: ["ignore", "pipe", "ignore"],
            maxBuffer: 64 * 1024 * 1024,
          }),
        );
      } catch {
        continue;
      }
      if (!Array.isArray(entries)) continue;
      for (const entry of entries) {
        if (!wanted.has(entry.id) || result.has(entry.id)) continue;
        if (date) result.set(entry.id, date);
      }
      if (result.size === wanted.size) break;
    }
  } catch {
    // No history available: leave the map empty.
  }
  addedAtCache.set(type, result);
  return result;
}

// ── Tag derivation ──────────────────────────────────────────────────────────

function tagsFor(entry, labels) {
  const tags = new Set();
  const itemType = Number(entry.itemType);
  const base = ITEM_TYPE_TO_CONTENT[itemType];
  if (base) tags.add(base);

  // Declared content-type labels (first-hand capability evidence). The label is
  // resolved against the entry's own medium, so "Cartoon" cannot turn a manga
  // source into an animation source.
  for (const label of labels) {
    const tag = contentTagForLabel(label, itemType);
    if (tag) tags.add(tag);
  }

  // Declared `contentSubtype`/`subCategories` are curator-declared, so they are
  // honoured too, but only through the same medium-scoped table.
  for (const declared of [
    ...(Array.isArray(entry.contentSubtype) ? entry.contentSubtype : []),
    ...(Array.isArray(entry.subCategories) ? entry.subCategories : []),
  ]) {
    const tag = contentTagForLabel(declared, itemType);
    if (tag) tags.add(tag);
  }

  // A watch catalogue that only serves movies has no anime source; the
  // catalogue itself is not a content claim, so no default genre-ish tag is
  // added. Genres come from declared filters only.
  for (const label of labels) {
    const tag = GENRE_LABEL_TO_TAG[label.trim().toLowerCase()];
    if (tag) tags.add(tag);
  }

  // Languages: `lang` plus every declared `langs` code.
  for (const code of [
    typeof entry.lang === "string" ? entry.lang : "",
    ...(Array.isArray(entry.langs) ? entry.langs : []),
  ]) {
    const tag = languageTagFor(code);
    if (tag) tags.add(tag);
  }

  // Curation. `forYou` is the repository's existing opt-in flag.
  if (entry.forYou === true) tags.add("featured");

  return orderTags([...tags]);
}

// ── Index writing ───────────────────────────────────────────────────────────

/**
 * Splits the raw index text into per-entry blocks, preserving the original bytes.
 *
 * Entries are top-level objects indented by two spaces. Rewriting the whole file
 * with `JSON.stringify` would reformat ~16 000 lines and bury a three-tag change
 * in formatting churn, so only the blocks that really change are re-rendered and
 * the rest is kept verbatim.
 */
function entrySpans(raw) {
  const spans = [];
  const lines = raw.split("\n");
  let start = -1;
  for (let i = 0; i < lines.length; i++) {
    if (start < 0 && lines[i] === "  {") {
      start = i;
      continue;
    }
    if (start >= 0 && (lines[i] === "  }," || lines[i] === "  }")) {
      spans.push({ start, end: i, trailing: lines[i].endsWith(",") ? "," : "" });
      start = -1;
    }
  }
  return spans;
}

/**
 * Renders one entry with the file's two-space block indentation.
 *
 * `trailing` restores the separator comma that the replaced block carried: the
 * closing line is consumed by the replacement, so losing it would corrupt the
 * JSON of every entry but the last.
 */
function renderEntry(entry, trailing) {
  const lines = JSON.stringify(entry, null, 2)
    .split("\n")
    .map((line) => `  ${line}`);
  lines[lines.length - 1] += trailing;
  return lines;
}

// ── Main ────────────────────────────────────────────────────────────────────

let changedFiles = 0;
let changedEntries = 0;
let tagCount = 0;
const problems = [];

for (const type of INDEX_TYPES) {
  const file = path.join(ROOT, `index/${type}.json`);
  if (!fs.existsSync(file)) continue;
  const raw = fs.readFileSync(file, "utf8");
  const entries = JSON.parse(raw);
  if (!Array.isArray(entries)) continue;

  const addedDates = addedAtMap(type, entries.map((entry) => entry.id));
  const spans = entrySpans(raw);
  const lines = raw.split("\n");
  const replacements = [];

  entries.forEach((entry, index) => {
    const sourceFile = sourceFileFor(entry);
    const labels = sourceFile
      ? filterLabels(filterListBody(fs.readFileSync(sourceFile, "utf8")))
      : [];
    const tags = tagsFor(entry, labels);
    // History is optional: a shallow clone yields no date, and an absent date
    // must never be treated as "remove the committed one".
    const addedAt = addedDates.get(entry.id);
    tagCount += tags.length;

    const tagsChanged =
      JSON.stringify(entry.tags ?? null) !== JSON.stringify(tags);
    const addedChanged =
      addedAt !== undefined && (entry.addedAt ?? undefined) !== addedAt;

    if (tagsChanged || addedChanged) {
      if (CHECK_ONLY || DRY_RUN) {
        console.log(
          `  ${type}/${entry.name}: tags ${JSON.stringify(entry.tags ?? [])} → ${JSON.stringify(tags)}`,
        );
      }
      entry.tags = tags;
      if (addedAt !== undefined) entry.addedAt = addedAt;
      const span = spans[index];
      if (span) {
        replacements.push({
          start: span.start,
          end: span.end,
          text: renderEntry(entry, span.trailing),
        });
      }
    }

    for (const problem of validateTags(entry.tags, { itemType: entry.itemType })) {
      problems.push(`${type}/${entry.name}: ${problem}`);
    }
  });

  // Applied back-to-front so the untouched line numbers above stay valid.
  replacements.sort((a, b) => b.start - a.start);
  for (const { start, end, text } of replacements) {
    lines.splice(start, end - start + 1, ...text);
  }

  if (replacements.length) {
    changedEntries += replacements.length;
    if (!CHECK_ONLY && !DRY_RUN) {
      fs.writeFileSync(file, lines.join("\n"));
      changedFiles++;
    }
  }
}

console.log(
  `\n${CHECK_ONLY ? "[check] " : DRY_RUN ? "[dry-run] " : ""}` +
    `${changedEntries} entr${changedEntries === 1 ? "y" : "ies"} updated, ` +
    `${tagCount} tags total, ${changedFiles} file(s) written`,
);

if (problems.length) {
  console.error(`\n❌ ${problems.length} tag problem(s):`);
  for (const problem of problems) console.error(`   ${problem}`);
  process.exit(1);
}

if (CHECK_ONLY && changedEntries > 0) {
  console.error("\nLes tags de l'index ne sont pas à jour — lance: node tools/generate_tags.mjs");
  process.exit(1);
}
