#!/usr/bin/env node
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { fileURLToPath } from "node:url";
import { Document } from "./html_document.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const extensionSource = fs.readFileSync(
  path.join(root, "src/nsfw/watch/en/xnxx.js"),
  "utf8",
);

let response = { statusCode: 200, body: "" };
let clientError = null;
const logs = [];
class TestClient {
  async get() {
    if (clientError) throw clientError;
    return response;
  }
}

const context = {
  MProvider: class {},
  Document,
  Client: TestClient,
  SharedPreferences: class {},
  extLog: (level, message) => logs.push({ level, message }),
  URL,
};
vm.runInNewContext(
  `${extensionSource}\nglobalThis.XnxxForTest = DefaultExtension;`,
  context,
);

const provider = new context.XnxxForTest();
assert.equal(provider.getSourcePreferences().length, 0);
const fixture = `
  <div class="thumb-block">
    <div class="thumb-container" data-pvv="//preview.example/one.mp4"></div>
    <a class="thumb-link" href="/video-one/test">
      <img data-src="//img.example/one.jpg" />
    </a>
    <div class="thumb-under">
      <a title="First listing" href="/video-one/test">First listing</a>
      <span class="metadata">12 min</span>
    </div>
  </div>
  <div class="thumb-block with-uploader">
    <a class="thumb-link" href="/video-two/test">
      <img src="https://img.example/two.jpg" />
    </a>
    <div class="thumb-under">
      <a title="Second listing" href="/video-two/test">Second listing</a>
    </div>
  </div>
  <div class="thumb-block thumb-cat">
    <a href="/pornstar/example-star">Example Star</a>
  </div>`;

const parsed = provider._parseVideoList(fixture, 1, "hits");
assert.equal(parsed.list.length, 2);
assert.equal(parsed.list[0].name, "First listing");
assert.equal(parsed.list[0].link, "https://www.xnxx.com/video-one/test");
assert.equal(parsed.list[0].imageUrl, "//img.example/one.jpg");
assert.equal(parsed.list[0].previewUrl, "https://preview.example/one.mp4");
response = { statusCode: 200, body: fixture };
assert.equal((await provider.getCustomList("hits", 1)).list.length, 2);
assert.equal((await provider.getPopular(1)).list.length, 2);
assert.equal((await provider.getLatestUpdates(1)).list.length, 2);
assert.equal(provider._parseVideoList("<html></html>", 1, "hits").list.length, 0);
assert.ok(logs.some(({ message }) => message.includes("parsed zero video cards")));

const tagsFixture = `
  <div id="tags">
    <ul>
      <li><a href="/search/teen">Teen</a><strong>120</strong></li>
      <li><a href="/search/amateur">Amateur</a><strong>80</strong></li>
    </ul>
  </div>`;
response = { statusCode: 200, body: tagsFixture };
const tags = await provider.getCustomList("tags", 1);
assert.equal(tags.list.length, 2);
assert.equal(tags.list[0].collectionId, "search_teen");

const pornstarFixture = `
  <div class="thumb-block thumb-cat">
    <a href="/pornstar/example-star" title="Example Star">Example Star</a>
    <span class="uploader">1200</span>
    <img src="https://img.example/star.jpg" />
  </div>`;
response = { statusCode: 200, body: pornstarFixture };
const pornstars = await provider.getCustomList("pornstars", 1);
assert.equal(pornstars.list.length, 1);
assert.equal(pornstars.list[0].name, "Example Star");

response = { statusCode: 200, body: fixture };
const loaded = await provider._get("/hits/1");
assert.equal(provider._parseVideoList(loaded.body, 1, "hits").list.length, 2);

response = {
  statusCode: 403,
  body: "<html><title>Attention Required! | Cloudflare</title><div id='cf-chl'></div>",
};
await assert.rejects(provider._get("/hits/1"), /Cloudflare verification/);

response = { statusCode: 503, body: "Service unavailable" };
await assert.rejects(provider._get("/hits/1"), /HTTP 503/);

clientError = new Error("connection timed out");
await assert.rejects(provider._get("/hits/1"), /request failed.*timed out/);

assert.ok(logs.some(({ message }) => message.includes("blocked by Cloudflare")));
assert.ok(logs.some(({ message }) => message.includes("route=/hits/1 status=503")));

// ── Recommendations: related videos are a JS literal on the detail page ──────
clientError = null;
const detailFixture = `
<html><head><meta property="og:title" content="A video" /></head><body>
<script>var video_related=[{"u":"/video-one/related_a","t":"Related A","i":"https://img.example/a.jpg","d":"5min","r":"100%","n":"2M"},
{"u":"/video-two/related_b","t":"Related B","i":"https://img.example/b.jpg","d":"8min"},
{"u":"/video-one/related_a","t":"Duplicate","i":"https://img.example/a.jpg"}];</script>
<script>var conf={"dyn":{"id_video":41983693}};</script>
</body></html>`;
response = { statusCode: 200, body: detailFixture };
const recs = await provider.getRecommendations("https://www.xnxx.com/video-ozutped/a_video");
assert.equal(recs.length, 2, "duplicates are dropped");
assert.equal(recs[0].name, "Related A");
assert.equal(recs[0].link, "https://www.xnxx.com/video-one/related_a");
assert.equal(recs[0].imageUrl, "https://img.example/a.jpg");
assert.ok(recs[0].description.includes("5min"));
assert.equal((await provider.getRecommendations("")).length, 0, "empty url yields no items");
assert.equal(
  (await provider.getRecommendations(JSON.stringify({ url: "https://www.xnxx.com/video-ozutped/a_video" }))).length,
  2,
  "JSON payload {url} is accepted",
);

// ── Comments: the thread endpoint returns posts.posts{id->{message,...}} ────
const commentsFixture = JSON.stringify({
  result: true,
  code: 0,
  posts: {
    ids: ["c2", "c1"],
    children: { c1: 0, c2: 3 },
    posts: {
      c1: { id: "c1", name: "Alice &amp; Co", message: "Great video &mdash; watch as&iacute;", time_diff: "2 years ago", votes: { nb: 3598 } },
      c2: { id: "c2", name: "Bob", message: "Nice", time_diff: "1 year ago", votes: { nb: 12 } },
    },
  },
});
response = { statusCode: 200, body: detailFixture };
let commentCalls = 0;
const savedGet = TestClient.prototype.get;
TestClient.prototype.get = async function (url) {
  const call = await savedGet.call(this, url);
  if (String(url).includes("/threads/video-comments/get-posts/")) {
    commentCalls++;
    assert.ok(String(url).includes("/top/41983693/"), "uses the numeric id_video");
    return { statusCode: 200, body: commentsFixture };
  }
  return call;
};
const comments = await provider.getComments("https://www.xnxx.com/video-ozutped/a_video");
TestClient.prototype.get = savedGet;
assert.equal(commentCalls, 1);
assert.equal(comments.length, 2);
assert.equal(comments[0].author, "Bob", "order follows posts.ids");
assert.equal(comments[0].content, "Nice");
assert.equal(comments[0].replyCount, 3);
assert.equal(comments[1].author, "Alice & Co");
assert.equal(comments[1].content, "Great video — watch así");
assert.equal(comments[1].date, "2 years ago");
assert.equal(comments[1].score, 3598);
assert.equal(comments[1].replyCount, 0);

console.log("XNXX regression checks passed (listing parsing, Cloudflare, HTTP, network, recommendations, comments).");
