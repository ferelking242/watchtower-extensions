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
    const pathname = new URL(url).pathname;
    if (pathname === "/channels") {
      return {
        statusCode: 200,
        body: `
          <div class="studio">
            <a href="/channels/demo-studio">
              <img src="https://images.example/studio.jpg" />
            </a>
            <div class="name">Demo Studio</div>
          </div>`,
      };
    }
    if (pathname === "/pornstars") {
      return {
        statusCode: 200,
        body: `
          <div class="pornstar">
            <a href="/pornstars/demo-performer">
              <img src="https://images.example/performer.jpg" />
            </a>
            <div class="name">Demo Performer</div>
          </div>`,
      };
    }
    // Player markup fixtures. The site renamed the element that carries the
    // quality list from `#player` to `#sync`; both must resolve to sources.
    if (pathname === "/watch/player-sync-test") {
      return {
        statusCode: 200,
        body: `
          <div class="viewmov" data-id="12960">
            <div class="psync">
              <div id="sync" data-s="serv-1" data-n="cdn-1" data-id="12960"
                   data-q="720p;x;720p;x;1699999999;tok720,1080p;x;1080p;x;1699999999;tok1080"></div>
            </div>
          </div>`,
      };
    }
    if (pathname === "/watch/player-legacy-test") {
      return {
        statusCode: 200,
        body: `
          <div id="player" data-q="720p;x;720p;x;1699999999;tok720"
               data-n="cdn-legacy" data-id="12960"></div>`,
      };
    }
    if (pathname === "/watch/no-player-test") {
      return { statusCode: 200, body: `<div class="viewmov" data-id="1"></div>` };
    }
    const slug = pathname.split("/").filter(Boolean)[0];
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
assert.equal(tags.list[0].collectionId, "category_anal");

const studios = await provider.getCustomList("studios", 1);
assert.equal(studios.list.length, 1, "studio listings contain profiles, not videos");
assert.equal(studios.list[0].link, "https://www.rexporn.st/channels/demo-studio");
const studio = await provider.getDetail(studios.list[0].link);
assert.equal(studio.episodes.length, 1);
assert.equal(studio.episodes[0].url, "https://www.rexporn.st/watch/channels-sample.html");
assert.equal(studio.episodes[0].thumbnailUrl, "https://images.example/channels.jpg");

const performers = await provider.getCustomList("pornstars", 1);
assert.equal(performers.list.length, 1, "performer listings contain profiles");
assert.equal(
  performers.list[0].link,
  "https://www.rexporn.st/pornstars/demo-performer",
);
const performer = await provider.getDetail(performers.list[0].link);
assert.equal(performer.episodes.length, 1);
assert.equal(
  performer.episodes[0].url,
  "https://www.rexporn.st/watch/pornstars-sample.html",
);

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

// Player markup: the quality list moved from `#player` to `#sync`. Reading a
// hard-coded id returned 0 videos after the rename, which broke both playback
// and download, so pin the attribute-anchored behaviour for both shapes.
const syncSources = await provider.getVideoList(
  "https://www.rexporn.st/watch/player-sync-test",
);
assert.equal(syncSources.length, 2, "current #sync player markup yields sources");
assert.ok(
  syncSources.every((s) => s.url.startsWith("https://cdn-1.vstor.top/whpvid/")),
  "sources use the data-n host and whpvid path",
);
assert.ok(
  syncSources.some((s) => s.url.endsWith("/12960.mp4")),
  "720p source has no quality suffix",
);
assert.ok(
  syncSources.some((s) => s.url.endsWith("/12960_1080p.mp4")),
  "1080p source carries the quality suffix",
);

const legacySources = await provider.getVideoList(
  "https://www.rexporn.st/watch/player-legacy-test",
);
assert.equal(legacySources.length, 1, "legacy #player markup still yields sources");
assert.ok(legacySources[0].url.includes("cdn-legacy.vstor.top"));

const missingSources = await provider.getVideoList(
  "https://www.rexporn.st/watch/no-player-test",
);
assert.equal(missingSources.length, 0, "a page without a player payload yields no sources");

console.log(
  "RexPorn regression checks passed (category routing, pornstar/studio profiles, episodes, thumbnails).",
);
