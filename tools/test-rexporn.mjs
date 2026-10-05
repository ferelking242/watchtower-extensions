#!/usr/bin/env node
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { fileURLToPath } from "node:url";
import { Document } from "./html_document.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const extensionSource = fs.readFileSync(
  path.join(root, "src/nsfw/watch/en/rexporn.js"),
  "utf8",
);
const layout = JSON.parse(fs.readFileSync(path.join(root, "ui-layouts/rexporn.json"), "utf8"));

const requests = [];
const logs = [];
class TestClient {
  async get(url) {
    requests.push(url);
    const slug = new URL(url).pathname.split("/").filter(Boolean)[0];
    return {
      statusCode: 200,
      body: `
        <div class="pitem">
          <a href="/watch/${slug}-sample.html">
            <img src="/placeholder.jpg" data-src="https://images.example/${slug}.jpg" />
          </a>
          <div class="ftitle">${slug} sample</div>
        </div>`,
    };
  }
}

const context = {
  MProvider: class {},
  Document,
  Client: TestClient,
  extLog: (level, message) => logs.push({ level, message }),
};
vm.runInNewContext(
  `${extensionSource}\nglobalThis.RexPornForTest = DefaultExtension;`,
  context,
);

const provider = new context.RexPornForTest();
const expectedCategories = context.RexPornForTest.CATEGORIES
  .filter(([, slug]) => !!slug);
assert.equal(layout.home.sections[0].component, "spotlight");
assert.equal(
  layout.home.sections.find((section) => section.id === "tags").cardStyle,
  "thumbnail",
);

const [tags, categories] = await Promise.all([
  provider.getCustomList("tags", 1),
  provider.getCustomList("categories", 1),
]);

assert.equal(tags.list.length, expectedCategories.length);
assert.equal(categories.list.length, expectedCategories.length);
assert.equal(requests.length, expectedCategories.length, "category previews are fetched once and shared");
assert.ok(tags.list.every((item) => item.imageUrl.startsWith("https://images.example/")));
assert.equal(new Set(tags.list.map((item) => item.imageUrl)).size, expectedCategories.length);
assert.equal(tags.list[0].link, "https://www.rexporn.st/anal");
assert.equal(tags.list[0].metadata.collectionType, "tags");

const parsed = provider._parseList(
  `<div class="pitem">
    <a href="/watch/preview-test"><img src="/placeholder.jpg" data-src="https://images.example/preview.jpg"></a>
    <div class="ftitle">Preview test</div>
  </div>`,
  "https://www.rexporn.st/anal",
  1,
  "category",
);
assert.equal(parsed.list[0].imageUrl, "https://images.example/preview.jpg");

console.log("RexPorn regression checks passed (spotlight, tag thumbnails, shared cache, lazy images).");
