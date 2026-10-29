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

// The extension must not rewrite the cover host. The site already picks a
// working mirror per cover; sharding a path onto another mirror produced a 404
// for ~half the catalogue (cdn.zinmanga1.com only carries a slice of it).
const emitted = [
  "https://img-r1.2xstorage.com/thumb/alexandrite-knight.webp",
  "https://cdn.zinmanga1.com/thumb/gotham-by-daylight.webp",
  "https://img-r2.2xstorage.com/thumb/some-cover.webp",
  "https://cdn2.zinmanga1.com/thumb/one-piece.webp",
];
for (const url of emitted) {
  assert.equal(
    provider.resolveUrl(url),
    url,
    `the site-emitted cover URL must be returned unchanged: ${url}`,
  );
}

// No cover-host sharding helper may come back: the emitted host is the only
// host known to serve that path.
assert.equal(
  provider._coverUrl,
  undefined,
  "_coverUrl sharding was removed; a cover must keep the host the site emitted",
);

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
