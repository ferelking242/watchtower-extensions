#!/usr/bin/env node
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const extensionSource = fs.readFileSync(
  path.join(root, "src/manga/en/harimanga.js"),
  "utf8",
);

const context = {
  MProvider: class {},
  SharedPreferences: class {
    get() {
      return null;
    }
  },
};
vm.runInNewContext(
  `${extensionSource}\nglobalThis.HarimangaForTest = DefaultExtension;`,
  context,
);
const provider = new context.HarimangaForTest();

// Mirrors selected for the same path must be stable across calls and source hosts.
const pathA = "/thumb/a-good-cover.webp";
const stableA = provider._coverUrl(`https://cdn2.zinmanga1.com//${pathA}`);
assert.equal(stableA, provider._coverUrl(`https://img-r2.2xstorage.com${pathA}`));
assert.equal(stableA, provider._coverUrl(`https://img-r1.2xstorage.com${pathA}`));
assert.equal(new URL(stableA).pathname, pathA);

// The path-based sharding distributes a normal catalogue rather than forcing
// every cover onto one CDN host.
const hosts = new Set();
for (let i = 0; i < 40; i++) {
  const result = provider._coverUrl(`https://img-r2.2xstorage.com/thumb/cover-${i}.webp`);
  hosts.add(new URL(result).host);
}
assert.deepEqual(
  [...hosts].sort(),
  ["cdn.zinmanga1.com", "img-r1.2xstorage.com"],
);

// These real paths have verified copies on cdn2/cdn3 and must avoid the
// app-blocked r1/cdn mirrors for the most popular covers.
for (const path of [
  "/thumb/tales-of-demons-and-gods.webp",
  "/thumb/solo-leveling.webp",
  "/thumb/the-beginning-after-the-end.webp",
  "/thumb/one-piece.webp",
  "/thumb/kimetsu-no-yaiba.webp",
]) {
  const expectedHosts = ["cdn2.zinmanga1.com", "cdn3.zinmanga1.com"];
  const first = provider._coverUrl(`https://img-r1.2xstorage.com${path}`);
  assert.ok(expectedHosts.includes(new URL(first).host));
  assert.equal(first, provider._coverUrl(`https://cdn.zinmanga1.com${path}`));
}

// These paths are only present on the first Zinmanga mirror and must not be
// sharded to another host.
for (const special of [
  "/thumb/gotham-by-daylight.webp",
  "/thumb/i-married-the-dragoni-killed.webp",
  "/thumb/title-unlocked-this-life-i-dominate-the-game.webp",
]) {
  assert.equal(
    new URL(provider._coverUrl(`https://img-r1.2xstorage.com${special}`)).host,
    "cdn.zinmanga1.com",
  );
}

const layout = JSON.parse(
  fs.readFileSync(path.join(root, "ui-layouts/harimanga.json"), "utf8"),
);
assert.deepEqual(
  layout.home.sections.map((section) => section.id),
  [
    "spotlight",
    "popular",
    "latest",
    "trending",
    "top_rated",
    "new",
    "category_romance",
    "category_action",
    "completed",
  ],
  "all nine Harimanga home shelves must remain available",
);

console.log("Harimanga cover mirror regression checks passed.");
