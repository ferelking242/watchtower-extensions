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
  <nav class="pagination"><a rel="next" href="/home?p=1">Next</a></nav>
  <div class="suggestions">
    <a href="/video/raped">Raped</a>
    <a href="/video/bitch">Bitch</a>
  </div>
`;
const detailHtml = `
  <html><head>
    <meta property="og:title" content="Generic NoodleMagazine title">
    <meta property="og:image" content="/poster.jpg">
    <meta property="og:video" content="https://nmcorp.video/player/example?m=test">
  </head><body>
    <h1>Specific video title</h1>
    <video poster="/player-poster.jpg"></video>
  </body></html>
`;
const playerHtml = `
  <script>
    window.playlist = {
      "sources": [
        {"file":"https://cdn2.pvvstream.pro/video_720p.mp4?secure=test","label":"720","type":"mp4"},
        {"file":"https://cdn2.pvvstream.pro/video_480p.mp4?secure=test","label":"480","type":"mp4"}
      ]
    };
  </script>
`;
let challengeMode = false;
const requests = [];
const requestHeaders = [];

class TestClient {
  async get(url, headers) {
    requests.push(url);
    requestHeaders.push(headers);
    if (challengeMode) {
      return {
        statusCode: 403,
        body: "<html><title>Just a moment...</title>Cloudflare verification</html>",
      };
    }
    return {
      statusCode: 200,
      body: url.includes("/player/")
        ? playerHtml
        : url.includes("/watch/")
          ? detailHtml
          : listingHtml,
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
  "https://noodlemagazine.com/home?range=recent&p=1",
);

await provider.search("tina nanami and 712", 1);
assert.equal(
  requests.at(-1),
  "https://noodlemagazine.com/video/tina+nanami+and+712",
);

for (const [listId, expectedPath] of [
  ["popular", "/home?p=1"],
  ["latest", "/home?range=recent&p=1"],
  ["watching_now", "/now?p=1"],
  ["trending", "/popular/trending?p=1"],
  ["explore", "/home?range=explore&p=1"],
  ["recent", "/home?range=recent&p=1"],
  ["raped", "/video/raped?p=1"],
  ["bitch", "/video/bitch?p=1"],
  ["range:day", "/home?range=day&p=1"],
  ["range:week", "/home?range=week&p=1"],
  ["range:month", "/home?range=month&p=1"],
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
assert.equal(periods.list[0].imageUrl, "https://noodlemagazine.com/thumb/one.jpg");

const trends = await provider.getCustomList("recent_trends", 1);
assert.deepEqual(trends.list.map((item) => item.name), ["Raped", "Bitch"]);
assert.equal(trends.list[0].collectionId, "search_query:raped");
await provider.getCustomList(trends.list[1].collectionId, 1);
assert.equal(
  requests.at(-1),
  "https://noodlemagazine.com/video/bitch",
);

const detail = await provider.getDetail("https://noodlemagazine.com/watch/example");
assert.equal(detail.name, "Specific video title");
assert.equal(detail.imageUrl, "https://noodlemagazine.com/poster.jpg");

const requestCountBeforePlayer = requests.length;
const videos = await provider.getVideoList("https://noodlemagazine.com/watch/example");
assert.equal(requests.length, requestCountBeforePlayer + 1);
assert.equal(requests.at(-1), "https://nmcorp.video/player/example?m=test");
assert.equal(requestHeaders.at(-1).Referer, "https://noodlemagazine.com/watch/example");
assert.equal(videos.length, 2);
assert.equal(videos[0].quality, "720p");
assert.equal(
  videos[0].url,
  "https://cdn2.pvvstream.pro/video_720p.mp4?secure=test",
);

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
  "raped",
  "bitch",
  "time_periods",
  "recent_trends",
  "quick_searches",
]);

console.log(
  "NoodleMagazine checks passed (routes, pagination, covers, categories, detail, streams, challenge reporting, layout).",
);
