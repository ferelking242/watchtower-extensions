#!/usr/bin/env node
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { fileURLToPath } from "node:url";
import { Document } from "./html_document.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const source = fs.readFileSync(
  path.join(root, "src/nsfw/watch/en/noodlemagazine.js"),
  "utf8",
);
const layout = JSON.parse(
  fs.readFileSync(path.join(root, "ui-layouts/noodlemagazine.json"), "utf8"),
);

const listingHtml = `
  <h1>Popular videos</h1>
  <div class="video">
    <a href="/watch/one">
      <img alt="At a house party, a student has a private party" data-src="/thumb/one.jpg">
    </a>
  </div>
  <div class="video">
    <a href="https://noodlemagazine.com/watch/two" title="Second title">
      <img src="//cdn.example.test/thumb/two.jpg">
    </a>
  </div>
  <nav class="pagination"><a rel="next" href="/home?page=2">Next</a></nav>
`;
const detailHtml = `
  <html><head>
    <meta property="og:title" content="Generic NoodleMagazine title">
    <meta property="og:image" content="/poster.jpg">
  </head><body>
    <h1>Specific video title</h1>
    <video poster="/player-poster.jpg"></video>
  </body></html>
`;
let challengeMode = false;
const requests = [];

class TestClient {
  async get(url) {
    requests.push(url);
    if (challengeMode) {
      return {
        statusCode: 403,
        body: "<html><title>Just a moment...</title>Cloudflare verification</html>",
      };
    }
    return {
      statusCode: 200,
      body: url.includes("/watch/") ? detailHtml : listingHtml,
    };
  }
}

const context = { MProvider: class {}, Client: TestClient, Document, URL };
vm.runInNewContext(
  `${source}\nglobalThis.NoodleMagazineForTest = DefaultExtension;`,
  context,
);
const provider = new context.NoodleMagazineForTest();

const popular = await provider.getPopular(1);
assert.equal(requests.at(-1), "https://noodlemagazine.com/home");
assert.equal(popular.list.length, 2);
assert.equal(popular.list[0].name, "At a house party, a student has a private party");
assert.equal(popular.list[0].link, "https://noodlemagazine.com/watch/one");
assert.equal(popular.list[0].imageUrl, "https://noodlemagazine.com/thumb/one.jpg");
assert.equal(popular.list[1].name, "Second title");
assert.equal(popular.hasNextPage, true);

await provider.getLatestUpdates(2);
assert.equal(
  requests.at(-1),
  "https://noodlemagazine.com/home?range=recent&page=2",
);

await provider.search("tina nanami and 712", 1);
assert.equal(
  requests.at(-1),
  "https://noodlemagazine.com/video/tina+nanami+and+712",
);

for (const [listId, expectedPath] of [
  ["popular", "/home?page=2"],
  ["latest", "/home?range=recent&page=2"],
  ["watching_now", "/now?page=2"],
  ["trending", "/popular/trending?page=2"],
  ["explore", "/home?range=explore&page=2"],
  ["recent", "/home?range=recent&page=2"],
  ["range:day", "/home?range=day&page=2"],
  ["range:week", "/home?range=week&page=2"],
  ["range:month", "/home?range=month&page=2"],
]) {
  await provider.getCustomList(listId, 2);
  assert.equal(requests.at(-1), "https://noodlemagazine.com" + expectedPath);
}

const shortcuts = await provider.getCustomList("quick_searches", 1);
assert.equal(shortcuts.list.length, 20);
assert.equal(shortcuts.list[0].name, "Hiding the towels");
assert.equal(shortcuts.list[0].collectionId, "search_query:hiding%20the%20towels");
assert.equal(shortcuts.list.at(-1).name, "Desi maids ffm");
await provider.getCustomList(shortcuts.list[3].collectionId, 1);
assert.equal(
  requests.at(-1),
  "https://noodlemagazine.com/video/tina+nanami+and+712",
);

const periods = await provider.getCustomList("time_periods", 1);
assert.equal(periods.list.length, 3);
assert.equal(periods.list[0].collectionId, "range:day");

const detail = await provider.getDetail("https://noodlemagazine.com/watch/example");
assert.equal(detail.name, "Specific video title");
assert.equal(detail.imageUrl, "https://noodlemagazine.com/poster.jpg");

const requestCountBeforePlayer = requests.length;
const videos = await provider.getVideoList("https://noodlemagazine.com/watch/example");
assert.equal(requests.length, requestCountBeforePlayer);
assert.equal(videos.length, 1);
assert.equal(videos[0].type, "webview");
assert.equal(videos[0].kind, "webview");
assert.equal(videos[0].url, "https://noodlemagazine.com/watch/example");

challengeMode = true;
await assert.rejects(
  () => provider.search("milf", 1),
  /Cloudflare challenge/,
);
challengeMode = false;

const sectionIds = layout.home.sections.map((section) => section.id);
assert.deepEqual(sectionIds, [
  "popular",
  "watching_now",
  "trending",
  "explore",
  "latest",
  "time_periods",
  "quick_searches",
]);

console.log(
  "NoodleMagazine checks passed (routes, cards, shortcuts, detail, Web player, challenge reporting, layout).",
);
