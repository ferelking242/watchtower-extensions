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
// The tag grid walks the live /tags/<letter> index, so it paginates A..Z and
// each entry carries a real /search link.
assert.equal(tags.list.length, 2);
assert.equal(tags.list[0].name, "Teen");
assert.equal(tags.list[0].link, "https://www.xnxx.com/search/teen");
assert.ok(tags.hasNextPage, "the alphabet continues past A");

// A dead tag index must not blank the section: the built-in category set is
// the fallback.
clientError = new Error("connection reset");
const fallbackTags = await provider.getCustomList("tags", 1);
clientError = null;
assert.ok(fallbackTags.list.length > 0);
assert.equal(fallbackTags.hasNextPage, false);
assert.ok(
  fallbackTags.list.every((tag) =>
    tag.link.startsWith("https://www.xnxx.com/search/")
  ),
);

// The live index markup is `<ul id="tags"><li><a href="/search/x">x</a>
// <strong>1,234</strong></li>...`. Parsing it must not depend on the QuickJS
// DOM bridge: a letter page carries ~2000 rows, and walking them through the
// bridge overran the 15 s runtime budget and blanked the whole home.
const liveShapeFixture =
  `<input id="filter-tags-input" />` +
  `<ul id="tags">` +
  `<li><a href="/search/a-escondidas">a escondidas</a><strong>241,372</strong></li>` +
  `<li><a href="/search/a2m">a2m</a><strong>939</strong></li>` +
  `<li><a href="/search/abuela">abuela</a><strong>5,641</strong></li>` +
  `</ul>`;
const liveShapeTags = provider._parseTags(liveShapeFixture);
assert.equal(liveShapeTags.length, 3, "all three live rows parse");
assert.equal(liveShapeTags[0].name, "a escondidas");
assert.equal(
  liveShapeTags[0].link,
  "https://www.xnxx.com/search/a-escondidas",
);
assert.equal(liveShapeTags[0].collectionId, "search_a-escondidas");
assert.equal(liveShapeTags[0].description, "241,372 videos");
assert.equal(liveShapeTags[2].description, "5,641 videos");

// A malformed/absent DOM must not stop the regex path from reading the rows.
const domIndependent = provider._parseTagsRegex(
  `<ul id="tags"><li><a href="/search/zzz">zzz</a></li></ul>`,
);
assert.equal(domIndependent.length, 1);
assert.equal(domIndependent[0].name, "zzz");
assert.equal(domIndependent[0].description, "Browse videos");

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

// ── Pagination: logical page -> XNXX's zero-based path suffix ───────────────
// The site's page 1 is the bare route, page 2 is `/1`. Passing the app's page
// number straight through skipped a page on every request.
assert.equal(provider._pagePath(1), "");
assert.equal(provider._pagePath(2), "/1");
assert.equal(provider._pagePath(5), "/4");
assert.equal(provider._hitsPath(1), "/hits");
assert.equal(provider._hitsPath(3), "/hits/2");
assert.equal(provider._pagePathFromOne(1), "");
assert.equal(provider._pagePathFromOne(2), "/1");

// ── Search/filter routing: refinements are PATH segments, not query params ──
// The legacy `?top`/`?order=` parameters were ignored server-side (identical
// result sets), which is what made the sort filter look broken.
const periodLengthQuality = [
  { state: 0 }, // popular mode: Most hits
  { state: 1 }, // search sort: Most viewed
  { state: 0 }, // category: none
  { state: 1 }, // period: year
  { state: 2 }, // length: 10min+
  { state: 2 }, // quality: fullhd
  { state: 1 }, // viewed: hide
];
assert.equal(
  provider._searchPath("big tits", periodLengthQuality, 1, "hits"),
  "/search/hits/year/10min+/fullhd/hide_viewed_video/big+tits",
);
assert.equal(
  provider._searchPath("teen", [], 3, ""),
  "/search/teen/2",
);
assert.equal(
  provider._searchPath("teen", [], 2, "random"),
  "/search/random/teen/1",
);
assert.ok(
  !provider._searchPath("teen", periodLengthQuality, 1, "").includes("?"),
  "no query parameters are emitted",
);
// `big tits` must survive encoding as `big+tits` (the site's own separator).
assert.ok(provider._searchPath("big tits", [], 1, "").includes("big+tits"));

// A sort axis XNXX rejects (500) is dropped so the listing still renders.
const originalGet = TestClient.prototype.get;
TestClient.prototype.get = async function (url) {
  if (String(url).includes("/search/hits/")) {
    return { statusCode: 500, body: "Internal Error" };
  }
  return { statusCode: 200, body: fixture };
};
const retried = await provider.search("teen", 1, periodLengthQuality);
TestClient.prototype.get = originalGet;
assert.equal(retried.list.length, 2, "listing survives a rejected sort axis");
assert.ok(
  logs.some(({ message }) => message.includes("retrying: ")),
);

// ── Covers: `mozaique_listing` is a 3x3 MOSAIC, not a single picture ────────
// XNXX's 1056x594 `mozaique_listing` stitches nine frames of the video into a
// grid, so using it as a card cover showed a different picture in every cell.
// Cards keep the 600x337 single-frame `_t`; the detail hero may use the
// 2080x1170 single-frame `mozaique_full`.
assert.equal(
  provider._coverImage("https://cdn.example/abc/0/xn_10_t.jpg"),
  "https://cdn.example/abc/0/xn_10_t.jpg",
);
assert.equal(
  provider._coverImage("https://cdn.example/abc/0/mozaique_listing.jpg"),
  "https://cdn.example/abc/0/xn_10_t.jpg",
);
assert.equal(
  provider._coverImage("https://cdn.example/abc/0/mozaique_full.jpg"),
  "https://cdn.example/abc/0/xn_10_t.jpg",
);
assert.equal(
  provider._fullImage("https://cdn.example/abc/0/xn_10_t.jpg"),
  "https://cdn.example/abc/0/mozaique_full.jpg",
);
assert.equal(
  provider._fullImage("https://cdn.example/abc/0/mozaique_listing.jpg"),
  "https://cdn.example/abc/0/mozaique_full.jpg",
);
// Non-XNXX artwork is never rewritten.
assert.equal(
  provider._coverImage("https://cdn.example/uploader/avatar.png"),
  "https://cdn.example/uploader/avatar.png",
);
assert.equal(provider._coverImage(""), "");
assert.equal(provider._fullImage(""), "");

// The /hits card keeps thumb + preview inside its `data-video` JSON, not on
// the <img>, so a DOM parse that ignores it loses the artwork entirely.
const hitsFixture = `
  <div id="video-thumb-abc123" class="thumb-block video"
    data-video='{"id":"abc123","sfwThumbUrl":"https://cdn.example/abc/0/xn_1_t.jpg","mozaiqueListing":"https://cdn.example/abc/0/mozaique_listing.jpg","previewVideo":"https://cdn.example/abc/0/preview.mp4"}'>
    <div class="thumb"><a class="thumb-link" href="/video-abc123/a_video">
      <img src="https://assets.example/blank.gif" data-src="https://cdn.example/abc/0/xn_1_t.jpg" />
    </a></div>
    <div class="thumb-under"><p><a href="/video-abc123/a_video" title="A video">A video</a></p>
      <p class="metadata"><span class="right">1.2M</span> 12min</p></div>
  </div>`;
const hitsParsed = provider._parseVideoList(hitsFixture, 1, "hits");
assert.equal(hitsParsed.list.length, 1);
assert.equal(
  hitsParsed.list[0].imageUrl,
  "https://cdn.example/abc/0/xn_1_t.jpg",
);
assert.equal(hitsParsed.list[0].previewUrl, "https://cdn.example/abc/0/preview.mp4");
assert.equal(hitsParsed.list[0].description, "Duration: 12min");

// `_pageHasNext` reads the site's own signals: a "Next" anchor, or /hits'
// zero-based `data-page` markers.
const nextPageHtml = '<ul class="pagination"><a class="no-page next" href="/search/teen/1">Next</a></ul>';
assert.equal(
  provider._pageHasNext(new Document(nextPageHtml), 1, hitsParsed.list, nextPageHtml),
  true,
);
const lastPageHtml = '<ul class="pagination"><a href="/search/teen/222" class="last-page">223</a></ul>';
assert.equal(
  provider._pageHasNext(new Document(lastPageHtml), 223, [], lastPageHtml),
  false,
);
const hitsPagerHtml = '<div class="pagination"><a class="current" data-page="0">1</a><a data-page="277">278</a></div>';
assert.equal(provider._pageHasNext(new Document(hitsPagerHtml), 1, [], hitsPagerHtml), true);
assert.equal(provider._pageHasNext(new Document(hitsPagerHtml), 278, [], hitsPagerHtml), false);

// ── Pornstars: `thumb-channel-premium` is a verified badge, not a paywall ────
// Every one of the 80 cards on /pornstars carries it; treating it as premium
// emptied the whole section.
const premiumStar = `
  <div class="thumb-block thumb-cat thumb-channel-premium">
    <div class="thumb"><a href="/pornstar/alex_adams69"><img src="https://cdn.example/abc/0/xn_10_t.jpg" /></a></div>
    <p class="title"><a href="/pornstar/alex_adams69">Alex Adams</a></p>
    <div class="uploader"><span class="free-plate">1,956</span></div>
  </div>`;
const stars = provider._parsePornstars(premiumStar, 1);
assert.equal(stars.list.length, 1, "a verified channel is not filtered out");
assert.equal(stars.list[0].name, "Alex Adams");
assert.equal(stars.list[0].link, "https://www.xnxx.com/pornstar/alex_adams69");
assert.equal(
  stars.list[0].imageUrl,
  "https://cdn.example/abc/0/xn_10_t.jpg",
);

// ── History: the local rail must warm its cache before reading ───────────────
// Persistence goes through the runtime's async localStorage helpers, not
// SharedPreferences (whose setString writes to Isar and was silently dropped
// from the extension worker).
const localStore = {};
context.getLocalStorage = async (origin, key) => localStore[key];
context.setLocalStorage = async (origin, key, value) => {
  localStore[key] = value;
};
const historyProvider = new context.XnxxForTest();
TestClient.prototype.get = async function () {
  return { statusCode: 200, body: fixture };
};
const emptyHistory = await historyProvider.getCustomList("history", 1);
assert.equal(emptyHistory.list.length, 2, "remote /history still fills the rail");
await historyProvider._saveHistoryItem({
  name: "Saved video",
  link: "https://www.xnxx.com/video-saved/saved",
  imageUrl: "https://cdn.example/saved.jpg",
  watchedAt: Date.now(),
});
const localHistory = await historyProvider.getCustomList("history", 1);
TestClient.prototype.get = originalGet;
assert.equal(localHistory.list[0].name, "Saved video", "local entry ranks first");
assert.ok(
  localHistory.list[0].description.startsWith("Vu le"),
  `local entry is stamped with a watch date, got "${localHistory.list[0].description}"`,
);

// A fresh instance reads the persisted history back from localStorage: this is
// what made "Historique" survive a restart. Clearing the static cache forces
// the reload instead of reusing the in-memory copy.
context.XnxxForTest._historyCache = undefined;
const reloaded = new context.XnxxForTest();
TestClient.prototype.get = async function () {
  return { statusCode: 503, body: "Service unavailable" };
};
const reloadedHistory = await reloaded.getCustomList("history", 1);
TestClient.prototype.get = originalGet;
assert.equal(reloadedHistory.list[0].name, "Saved video");
assert.equal(
  reloadedHistory.list[0].link,
  "https://www.xnxx.com/video-saved/saved",
);

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

// A response without the related literal must still fill the tab: the page's
// own keyword tags drive a listing request instead of showing nothing.
const noRelatedFixture = `
<html><body>
<div class="metadata-row video-tags">
  <a class="is-keyword" href="/search/latina">latina</a>
  <a class="is-keyword" href="/search/teen">teen</a>
</div>
</body></html>`;
const listingGet = TestClient.prototype.get;
TestClient.prototype.get = async function (url) {
  if (String(url).includes("/search/")) {
    return { statusCode: 200, body: fixture };
  }
  return { statusCode: 200, body: noRelatedFixture };
};
const fallbackRecs = await provider.getRecommendations(
  "https://www.xnxx.com/video-ozutped/a_video",
);
TestClient.prototype.get = listingGet;
assert.equal(fallbackRecs.length, 2, "tag fallback fills the tab");
assert.equal(fallbackRecs[0].name, "First listing");
assert.ok(logs.some(({ message }) => message.includes("tag fallback")));

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

// ── getVideoList: the media RPC path, including its helpers ──────────────────
// Regression guard: `_mp4Quality` is a class method and must be called through
// `this`. Calling it bare threw "ReferenceError: _mp4Quality is not defined",
// which failed the whole getVideoList — every video appeared unplayable.
const playerFixture = `
<html><head><meta property="og:title" content="A video" /></head><body>
<script>
html5player.setEncodedIdVideo('ENC123');
html5player.setIdCdnHLS('21');
</script>
<div id="video-player-bg"></div>
</body></html>`;
const rpcFixture = JSON.stringify({
  hls: "https://hls.example/master.m3u8",
  mp4_high: "https://mp4.example/video_360p.mp4",
  mp4_low: "https://mp4.example/video_240p.mp4",
});
TestClient.prototype.get = async function (url) {
  if (String(url).includes("/html5player/getvideo/")) {
    return { statusCode: 200, body: rpcFixture };
  }
  return { statusCode: 200, body: playerFixture };
};
const sources = await provider.getVideoList("https://www.xnxx.com/video-ozutped/a_video");
TestClient.prototype.get = savedGet;
const byQuality = Object.fromEntries(sources.map((v) => [v.quality, v.url]));
assert.equal(byQuality["Auto"], "https://hls.example/master.m3u8");
// The RPC's slot names lie: mp4_high holds a 360p file, so the label must come
// from the filename rather than the slot.
assert.equal(byQuality["360p"], "https://mp4.example/video_360p.mp4");
assert.equal(byQuality["240p"], "https://mp4.example/video_240p.mp4");

// ── Profile pages: videos come from the JSON listing endpoint ────────────────
// Regression guard: a pornstar/porn-maker/channel page ships an empty video
// grid (100 placeholder shells, no cards) and fills it from
// `/{profile}/videos/best/{page0based}`. Parsing the HTML therefore always
// produced zero episodes and the person page looked broken.
const profileHtml = `
<html><head><title>Alex Adams</title></head><body>
<h2 id="profile-info-title"><strong><span class="profile-username">Alex Adams</span></strong></h2>
<script>window.xv.conf={"data":{"user":{"profile_picture":"https:\\/\\/profile-cdn77.xnxx-cdn.com\\/abc\\/2\\/pp_big.jpg"}}};</script>
<div id="psvideos"><div class="mozaique"><div class="thumb-block"><div class="thumb-inside"></div></div></div></div>
</body></html>`;

const profileListing = JSON.stringify({
  nb_videos: 1321,
  nb_per_page: 50,
  current_page: 0,
  videos: [
    {
      id: 1,
      eid: "tylzxd8",
      u: "/prof-video-click/pornstar/alex_adams69/iffetddf38d/blonde_teen_step_sister_babysits",
      i: "https://thumb-cdn77.xnxx-cdn.com/96d496ff/0/xn_4_t.jpg",
      ipu: "https://thumb-cdn77.xnxx-cdn.com/96d496ff/0/preview.mp4",
      tf: "Blonde Teen Step Sister Babysits",
      d: "18min"
    }
  ]
});
const profilePaths = [];
TestClient.prototype.get = async function (url) {
  profilePaths.push(String(url));
  if (String(url).endsWith("/videos/best/0")) {
    return { statusCode: 200, body: profileListing };
  }
  return { statusCode: 200, body: profileHtml };
};
const profileDetail = await provider.getDetail("https://www.xnxx.com/pornstar/alex_adams69");
TestClient.prototype.get = savedGet;
assert.equal(profileDetail.name, "Alex Adams");
// The portrait is not an `og:image` here; it comes from the page config.
assert.equal(
  profileDetail.imageUrl,
  "https://profile-cdn77.xnxx-cdn.com/abc/2/pp_big.jpg"
);
assert.equal(profileDetail.episodes.length, 1);
assert.equal(
  profileDetail.episodes[0].url,
  "https://www.xnxx.com/video-tylzxd8/blonde_teen_step_sister_babysits"
);
assert.equal(profileDetail.episodes[0].duration, "18min");
assert.ok(
  profilePaths.some((url) => url.endsWith("/pornstar/alex_adams69/videos/best/0")),
  "the profile listing endpoint must be requested"
);

// A profile URL that already carries a listing route must be reused, and the
// page number stays zero-based so page 2 is `/videos/best/1`.
assert.equal(
  provider._profileListPath("/pornstar/alex_adams69/videos/best/1", 3),
  "/pornstar/alex_adams69/videos/best/2"
);
assert.equal(
  provider._profileListPath("/porn-maker/alex_adams", 1),
  "/porn-maker/alex_adams/videos/best/0"
);

// `profile_<hex path>` is the paged list id the app uses for the person page.
const profileListId = `profile_${[..."/pornstar/alex_adams69"]
  .map((char) => char.codePointAt(0).toString(16).padStart(4, "0"))
  .join("")}`;
TestClient.prototype.get = async function () {
  return { statusCode: 200, body: profileListing };
};
const profilePage = await provider.getCustomList(profileListId, 1);
TestClient.prototype.get = savedGet;
assert.equal(profilePage.list.length, 1);
assert.equal(profilePage.hasNextPage, true);
assert.equal(profilePage.list[0].name, "Blonde Teen Step Sister Babysits");
// A malformed id must fail closed rather than fetch an arbitrary route.
const rejected = await provider.getCustomList("profile_zzzz", 1);
assert.equal(rejected.list.length, 0);
assert.equal(rejected.hasNextPage, false);

// `videos` is a sparse object on some sort orders, not an array.
const sparseListing = JSON.stringify({
  nb_videos: 3,
  nb_per_page: 50,
  current_page: 0,
  videos: { "0": { eid: "aaa", tf: "First", d: "5min" } }
});
assert.equal(provider._parseVideoListJson(sparseListing, 1).list.length, 1);
// Non-JSON bodies (an HTML error page) must not be mistaken for a listing.
assert.equal(provider._parseVideoListJson("<html></html>", 1), null);

// ── Regression: alphanumeric video ids in the regex fallback ────────────────
// Live ids are `/video-17pt1bb8/...`; a `\d+` matcher found none, so the
// safety net that rescues a failed DOM parse returned zero items and the app
// showed "Aucun résultat" on a page full of videos.
const alnumFixture = `
  <div class="thumb-block">
    <a href="/video-17pt1bb8/at_the_club"><img data-mzl="https://img.example/a.jpg" /></a>
    <div class="thumb-under"><a title="At the Club" href="/video-17pt1bb8/at_the_club">At the Club</a></div>
  </div>
  <div class="thumb-block">
    <a href="/video-hbwy3c6/hot_step_mom"><img data-mzl="https://img.example/b.jpg" /></a>
    <div class="thumb-under"><a title="Hot Step Mom" href="/video-hbwy3c6/hot_step_mom">Hot Step Mom</a></div>
  </div>`;
const recoveredAlnum = provider._parseVideoCardsRegex(alnumFixture);
assert.equal(recoveredAlnum.length, 2, "regex fallback must accept alphanumeric ids");
assert.equal(recoveredAlnum[0].link, "https://www.xnxx.com/video-17pt1bb8/at_the_club");
assert.equal(recoveredAlnum[1].name, "Hot Step Mom");

// A page whose cards resolve but expose no `/video-` anchor (the app logged
// `thumbBlocks=33 videoLinks=0`) must still recover through the fallback.
const shellsFixture = `
  <div class="thumb-block"><div class="thumb-inside"></div></div>
  <div class="thumb-block"><div class="thumb-inside"></div></div>
  <a href="/video-1ckwbrf4/me_and_bro"><img data-mzl="https://img.example/c.jpg" /></a>
  <a title="Me and Bro" href="/video-1ckwbrf4/me_and_bro">Me and Bro</a>`;
const shellParsed = provider._parseVideoList(shellsFixture, 1, "search");
assert.equal(shellParsed.list.length, 1, "cards without anchors must fall back to raw HTML");
assert.equal(shellParsed.list[0].link, "https://www.xnxx.com/video-1ckwbrf4/me_and_bro");

// ── Regression: a card whose anchor wraps a huge <img> ──────────────────────
// The live card renders its anchor around a ~15-attribute <img> (≈900 chars of
// markup). The old extractor only accepted anchors that closed within 600
// characters, so a page whose markup ran longer than the harness's copy (the
// app logged 36 shells and 0 links) yielded nothing and search showed "Aucun
// résultat". Card discovery must not depend on anchor length.
const longAnchorFixture = `
  <div class="thumb-block" data-eid="1gsa3edd">
    <a href="/video-1gsa3edd/naked_massage" title="Naked Massage"><img ${'data-x="y" '.repeat(120)} data-src="https://img.example/long.jpg" />Naked Massage</a>
  </div>`;
const longAnchorParsed = provider._parseVideoCardsRegex(longAnchorFixture);
assert.equal(longAnchorParsed.length, 1, "a >600-char anchor must still yield its card");
assert.equal(longAnchorParsed[0].link, "https://www.xnxx.com/video-1gsa3edd/naked_massage");
assert.equal(longAnchorParsed[0].name, "Naked Massage");

// A shell with NO anchor at all (the app logged `thumbBlocks=36 videoLinks=0`):
// the id lives on the wrapper, and the link is rebuilt from it — XNXX 301s
// `/video-<id>` to the canonical page, so the card stays playable.
const noAnchorFixture = `
  <div id="video_1gsa3edd" data-id="88659482" data-eid="1gsa3edd" class="thumb-block with-uploader">
    <div class="thumb-inside"><div class="thumb"><img data-mzl="https://img.example/nb.jpg" data-pvv="https://img.example/nb.mp4" /></div></div>
    <div class="thumb-under"><p><a title="Rebuilt Link">Rebuilt Link</a></p><p class="metadata">19min</p></div>
  </div>`;
const noAnchorParsed = provider._parseVideoCardsRegex(noAnchorFixture);
assert.equal(noAnchorParsed.length, 1, "an anchor-less card must be rebuilt from its id");
assert.equal(noAnchorParsed[0].link, "https://www.xnxx.com/video-1gsa3edd");
assert.equal(noAnchorParsed[0].name, "Rebuilt Link");
assert.equal(noAnchorParsed[0].imageUrl, "https://img.example/nb.jpg");

// `data-video='{"id":"…"}'` shells (the /hits markup) carry the id in JSON,
// and JSON-escaped slashes (`https:\/\/…`) appear when a page is embedded.
const jsonShellFixture = `
  <div id="video-thumb-hbwy3c6" class="thumb-block video"
       data-video='{"id":"hbwy3c6","mozaiqueListing":"https:\\/\\/img.example\\/json.jpg"}'>
    <a href="\\/video-hbwy3c6\\/hot_step_mom">Hot Step Mom</a>
  </div>`;
const jsonShellParsed = provider._parseVideoCardsRegex(jsonShellFixture);
assert.equal(jsonShellParsed.length, 1, "a JSON data-video shell must be discovered");
assert.equal(jsonShellParsed[0].link, "https://www.xnxx.com/video-hbwy3c6/hot_step_mom");
assert.equal(jsonShellParsed[0].name, "Hot Step Mom");

// ── Regression: profile covers live inside `document.write` scripts ─────────
// A spec-compliant HTML parser (the app's) sees script bodies as raw text, so
// every /pornstars card rendered with an empty cover.
const scriptCoverFixture = `
  <div class="thumb-block thumb-cat thumb-channel-premium" id="profile_alex_adams69">
    <div class="thumb-inside">
      <div class="thumb"><a href="/pornstar/alex_adams69"></a></div>
      <p class="title"><a href="/pornstar/alex_adams69">Alex Adams</a></p>
    </div>
    <div class="uploader"><a href="/pornstar/alex_adams69"><span>1,958</span></a></div>
    <script>document.write(xv.thumbs.replaceThumbUrl('<picture><img src="https://thumb.example/alex.jpg" id="pic_alex_adams69" /></picture>'));</script>
  </div>`;
const scriptPornstars = provider._parsePornstars(scriptCoverFixture, 1);
assert.equal(scriptPornstars.list.length, 1);
assert.equal(scriptPornstars.list[0].name, "Alex Adams");
assert.equal(
  scriptPornstars.list[0].imageUrl,
  "https://thumb.example/alex.jpg",
  "the cover must be recovered from the document.write payload",
);
assert.equal(scriptPornstars.list[0].description, "1,958 free videos");

// The harness must model the raw-text rule, otherwise this class of bug is
// invisible: markup inside <script> is text, never a node.
const rawTextDoc = new Document(
  `<div class="card"><script>document.write('<img src="https://x/y.jpg" />')</script></div>`,
);
assert.equal(
  rawTextDoc.getElementsByTagName("img").length,
  0,
  "harness must treat <script> bodies as raw text like a real parser",
);

// ── Tag covers ───────────────────────────────────────────────────────────────
// A tag row carries no artwork, so the cover is borrowed from the tag's first
// video. That fetch is expensive (one page per tag), which is why the result is
// stored: without the store, a 60-tag page re-fetched every cover on every open
// and the "see all" grid showed art on the first few tags only.
{
  const routed = [];
  const store = new Map();
  class RoutingClient {
    async get(url) {
      routed.push(url);
      const slug = decodeURIComponent(url).split("/search/")[1] || "unknown";
      return {
        statusCode: 200,
        body: `<div class="thumb-block" data-eid="aa11">
                 <img data-src="//img.example/${slug}.jpg" />
                 <a title="${slug}" href="/video-aa11/${slug}">${slug}</a>
               </div>`,
      };
    }
  }
  const ctx = {
    MProvider: class {},
    Document,
    Client: RoutingClient,
    SharedPreferences: class {},
    extLog: () => {},
    URL,
    getLocalStorage: async (base, key) => store.get(`${base}:${key}`) ?? null,
    setLocalStorage: async (base, key, value) => { store.set(`${base}:${key}`, value); },
  };
  vm.runInNewContext(
    `${extensionSource}\nglobalThis.XnxxForTest = DefaultExtension;`,
    ctx,
  );
  const p = new ctx.XnxxForTest();

  const tag = (name, slug) => ({
    name,
    link: `https://www.xnxx.com/search/${slug}`,
    imageUrl: "",
    collectionId: `search_${slug}`,
  });
  const tags = [tag("Anal", "anal"), tag("Asian", "asian"), tag("BBW", "bbw")];

  const first = await p._enrichTagCovers(tags, 60, 4);
  assert.ok(
    first.every((t) => t.imageUrl.startsWith("https://img.example/")),
    "every tag on the page gets a cover, not just the first few",
  );
  assert.equal(routed.length, 3, "each unknown tag costs exactly one fetch");
  assert.equal(store.get("https://www.xnxx.com:xnxx_tag_covers") !== undefined, true,
    "covers are persisted for the next visit");

  // Second page: same tags, nothing cached in the instance — must come from the
  // store, so no new request is made.
  const again = [tag("Anal", "anal"), tag("Asian", "asian"), tag("BBW", "bbw")];
  await p._enrichTagCovers(again, 60, 4);
  assert.equal(routed.length, 3, "a known tag is never fetched twice");
  assert.equal(again[0].imageUrl, "https://img.example/anal.jpg");

  // A new tag is the only thing that should hit the network.
  const mixed = [tag("Anal", "anal"), tag("Cum", "cum")];
  await p._enrichTagCovers(mixed, 60, 4);
  assert.equal(routed.length, 4, "only the unknown tag is fetched");
  assert.equal(mixed[1].imageUrl, "https://img.example/cum.jpg");

  assert.equal(p._tagSlug({ collectionId: "search_big_tits" }), "big_tits");
  assert.equal(
    p._tagSlug({ link: "https://www.xnxx.com/search/big+ass/2" }),
    "big+ass",
    "link slugs stop at the first path separator and keep their encoding",
  );
}

console.log("XNXX regression checks passed (listing parsing, Cloudflare, HTTP, network, recommendations, comments, getVideoList, profile listing).");
