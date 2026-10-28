#!/usr/bin/env node
/**
 * test_catalog_taxonomy.mjs — unit tests for the marketplace vocabulary and the
 * tag generator's derivation rules.
 *
 * Zero-dependency: a tiny assert helper keeps this runnable in CI without
 * pulling a test framework into a repository whose tooling is plain Node.
 *
 * Run: node tools/test_catalog_taxonomy.mjs
 */
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import {
  ALL_TAGS,
  CONTENT_TAGS,
  contentTagForLabel,
  GENRE_LABEL_TO_TAG,
  isKnownTag,
  ITEM_TYPE_TO_CONTENT,
  languageTagFor,
  mediumFor,
  normalizeTag,
  orderTags,
  validateTags,
} from "./catalog_taxonomy.mjs";

const ROOT = path.resolve(import.meta.dirname, "..");
let checks = 0;

function test(name, fn) {
  checks++;
  try {
    fn();
    console.log(`  ✓ ${name}`);
  } catch (error) {
    console.error(`  ✗ ${name}`);
    console.error(`    ${error.message}`);
    process.exitCode = 1;
  }
}

console.log("catalog_taxonomy");

test("the vocabulary has no duplicate tags", () => {
  assert.equal(new Set(ALL_TAGS).size, ALL_TAGS.length);
});

test("every content tag is known and canonical", () => {
  for (const tag of CONTENT_TAGS) {
    assert.ok(isKnownTag(tag), `${tag} should be known`);
    assert.equal(normalizeTag(tag), tag, `${tag} should be canonical`);
  }
});

test("unknown tags are rejected", () => {
  assert.equal(isKnownTag("not-a-real-tag"), false);
  assert.ok(validateTags(["definitely-not-a-tag"]).length > 0);
});

test("duplicate tags are rejected", () => {
  const problems = validateTags(["watch", "watch"]);
  assert.ok(problems.some((p) => p.includes("duplicate")));
});

test("non-canonical casing is rejected", () => {
  const problems = validateTags(["Watch"]);
  assert.ok(problems.some((p) => p.includes("not canonical")));
});

test("an absent tags field is tolerated", () => {
  assert.deepEqual(validateTags(undefined), []);
});

test("a non-array tags field is reported", () => {
  assert.ok(validateTags("watch").length > 0);
});

test("each itemType maps to a content tag", () => {
  assert.equal(ITEM_TYPE_TO_CONTENT[0], "read");
  assert.equal(ITEM_TYPE_TO_CONTENT[1], "watch");
  assert.equal(ITEM_TYPE_TO_CONTENT[2], "read");
  assert.equal(ITEM_TYPE_TO_CONTENT[3], "music");
  assert.equal(ITEM_TYPE_TO_CONTENT[4], "game");
});

test("itemType validation requires its own content tag", () => {
  const problems = validateTags(["french"], { itemType: 1 });
  assert.ok(
    problems.some((p) => p.includes('must carry the "watch" content tag')),
    problems.join("; "),
  );
});

test("a watch catalogue cannot carry reading tags", () => {
  const problems = validateTags(["watch", "manga"], { itemType: 1 });
  assert.ok(problems.some((p) => p.includes("reading tags")));
});

test("a reading catalogue cannot carry watch-only tags", () => {
  const problems = validateTags(["read", "animation"], { itemType: 0 });
  assert.ok(problems.some((p) => p.includes("watch-only tags")));
});

test("a coherent entry validates cleanly", () => {
  assert.deepEqual(
    validateTags(["read", "manga", "action", "french"], { itemType: 0 }),
    [],
  );
});

test("'Cartoon' means comics on a reading site", () => {
  assert.equal(contentTagForLabel("Cartoon", 0), "comics");
  assert.equal(contentTagForLabel("Cartoon", 2), "comics");
});

test("'Cartoon' means animation on a streaming site", () => {
  assert.equal(contentTagForLabel("Cartoon", 1), "animation");
});

test("'Movies' is not a reading content label", () => {
  assert.equal(contentTagForLabel("Movies", 0), null);
  assert.equal(contentTagForLabel("Movies", 2), null);
  assert.equal(contentTagForLabel("Movies", 1), "movies");
});

test("content labels are case-insensitive and trimmed", () => {
  assert.equal(contentTagForLabel("  webtoon ", 0), "webtoon");
  assert.equal(contentTagForLabel("Light Novel", 0), "novel");
});

test("mediumFor distinguishes watch from read", () => {
  assert.equal(mediumFor(1), "watch");
  assert.equal(mediumFor(0), "read");
  assert.equal(mediumFor(2), "read");
  assert.equal(mediumFor(3), "music");
});

test("language codes map to canonical language tags", () => {
  assert.equal(languageTagFor("fr"), "french");
  assert.equal(languageTagFor("pt-br"), "portuguese");
  assert.equal(languageTagFor("all"), "multilingual");
  assert.equal(languageTagFor("multi"), "multilingual");
});

test("an unmapped language code yields null", () => {
  assert.equal(languageTagFor("xx"), null);
  assert.equal(languageTagFor(""), null);
});

test("orderTags follows the vocabulary order, not the input order", () => {
  assert.deepEqual(orderTags(["french", "action", "manga", "read"]), [
    "read",
    "manga",
    "action",
    "french",
  ]);
});

test("orderTags de-duplicates", () => {
  assert.deepEqual(orderTags(["watch", "watch", "english"]), [
    "watch",
    "english",
  ]);
});

test("genre labels map case-insensitively", () => {
  assert.equal(GENRE_LABEL_TO_TAG["action"], "action");
  assert.equal(GENRE_LABEL_TO_TAG["sci-fi"], "science-fiction");
  assert.equal(GENRE_LABEL_TO_TAG["science-fiction"], "science-fiction");
  assert.equal(GENRE_LABEL_TO_TAG["drame"], "drama");
});

console.log("\ncatalog_taxonomy_against_catalogue");

const INDEX_TYPES = ["watch", "manga", "novel", "music", "game", "subtitles"];
const catalogues = INDEX_TYPES.map((type) => ({
  type,
  file: path.join(ROOT, "index", `${type}.json`),
})).filter(({ file }) => fs.existsSync(file));

test("every catalogue entry carries a valid tag list", () => {
  for (const { type, file } of catalogues) {
    const entries = JSON.parse(fs.readFileSync(file, "utf8"));
    for (const entry of entries) {
      const problems = validateTags(entry.tags, { itemType: entry.itemType });
      assert.deepEqual(
        problems,
        [],
        `${type}/${entry.name}: ${problems.join("; ")}`,
      );
    }
  }
});

test("no entry claims an invented popularity signal", () => {
  for (const { type, file } of catalogues) {
    const entries = JSON.parse(fs.readFileSync(file, "utf8"));
    for (const entry of entries) {
      for (const tag of entry.tags ?? []) {
        assert.ok(
          tag !== "popular" && tag !== "trending",
          `${type}/${entry.name} claims ${tag}`,
        );
      }
    }
  }
});

test("the 'featured' tag only comes from the forYou opt-in", () => {
  for (const { type, file } of catalogues) {
    const entries = JSON.parse(fs.readFileSync(file, "utf8"));
    for (const entry of entries) {
      if ((entry.tags ?? []).includes("featured")) {
        assert.equal(
          entry.forYou,
          true,
          `${type}/${entry.name} is featured without forYou`,
        );
      }
    }
  }
});

test("addedAt, when present, is an ISO date", () => {
  for (const { type, file } of catalogues) {
    const entries = JSON.parse(fs.readFileSync(file, "utf8"));
    for (const entry of entries) {
      if (entry.addedAt === undefined) continue;
      assert.match(
        String(entry.addedAt),
        /^\d{4}-\d{2}-\d{2}$/,
        `${type}/${entry.name} has a malformed addedAt`,
      );
    }
  }
});

console.log(
  `\n${checks} check(s) — ${process.exitCode ? "❌ failures above" : "✅ all passed"}`,
);
