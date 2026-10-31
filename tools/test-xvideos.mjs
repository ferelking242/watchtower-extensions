#!/usr/bin/env node
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { fileURLToPath } from "node:url";
import { Document } from "./html_document.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const extensionSource = fs.readFileSync(
  path.join(root, "src/nsfw/watch/en/xvideos.js"),
  "utf8",
);

let response = { statusCode: 200, body: "" };
let clientError = null;
let lastUrl = "";
// Upper bound a single borrowing section may spend before it must return (the
// extension's own COVER_BUDGET_MS is 2000; this leaves scheduling headroom).
const DefaultBudgetCeiling = 4000;
// Optional per-route bodies. The language/category indexes borrow their covers
// from a second request, so a single static `response` cannot serve both.
let routes = null;
const logs = [];
class TestClient {
  async get(url) {
    lastUrl = url;
    if (clientError) throw clientError;
    if (routes) {
      for (const [pattern, body] of routes) {
        if (pattern.test(url)) return { statusCode: 200, body };
      }
    }
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
  `${extensionSource}\nglobalThis.XVideosForTest = DefaultExtension;`,
  context,
);

const provider = new context.XVideosForTest();
assert.equal(provider.getSourcePreferences().length, 0);

// ── Listing cards ──────────────────────────────────────────────────────────
const listingFixture = `
  <div id="video_oioaavk9981" class="thumb-block">
    <div class="thumb-inside"><div class="thumb">
      <a href="/video.oioaavk9981/starbucks_drive_thrus">
        <img src="blank.gif" data-src="https://thumb.example/e1/0/xv_15_t.jpg" />
      </a>
    </div></div>
    <div class="thumb-under">
      <p class="title"><a href="/video.oioaavk9981/starbucks_drive_thrus" title="Starbucks &amp; Cream">Starbucks &amp; Cream</a></p>
      <span class="duration">12 min</span>
    </div>
  </div>
  <div id="video-thumb_second" class="thumb-block">
    <div class="thumb-inside"><div class="thumb">
      <a href="/prof-video-click/pornstar/violet-myers/ifhoued97b8/no_control"><img data-src="https://thumb.example/e2/0/xv_5_t.jpg" /></a>
    </div></div>
    <div class="thumb-under">
      <p class="title"><a href="/prof-video-click/pornstar/violet-myers/ifhoued97b8/no_control" title="No Control">No Control</a></p>
      <span class="duration">15 min</span>
    </div>
  </div>`;

const listing = provider._parseVideoCards(listingFixture);
assert.equal(listing.length, 2);
assert.equal(listing[0].name, "Starbucks & Cream");
assert.equal(listing[0].link, "https://www.xvideos.com/video.oioaavk9981/starbucks_drive_thrus");
assert.equal(listing[0].imageUrl, "https://thumb.example/e1/0/xv_15_t.jpg");
assert.equal(listing[0].description, "Duration: 12 min");
// prof-video-click links must be rewritten to the canonical video route.
assert.equal(
  listing[1].link,
  "https://www.xvideos.com/video.ifhoued97b8/no_control",
);

// ── Profile directory cards ────────────────────────────────────────────────
const profileFixture = `
  <div id="profile_tugpass" class="thumb-block thumb-block-profile title-in-thumb">
    <div class="thumb-inside"><div class="thumb">
      <a href="/tugpass"><picture><img src="https://thumb.example/p1/0/xv_16_t.jpg" /></picture>
      <span class="profile-name"> Petite 18 </span></a>
    </div></div>
    <div class="thumb-under"><p class="profile-counts"><span> 118 videos </span></p></div>
  </div>
  <div id="profile_industryinvaders" class="thumb-block thumb-block-profile title-in-thumb">
    <div class="thumb-inside"><div class="thumb">
      <a href="/industryinvaders"><img src="https://thumb.example/p2/0/xv_2_t.jpg" />
      <span class="profile-name"> Industry Invaders </span></a>
    </div></div>
    <div class="thumb-under"><p class="profile-counts"><span> 42 videos </span></p></div>
  </div>`;

const profiles = provider._parseProfileCards(profileFixture, "channels");
assert.equal(profiles.length, 2);
assert.equal(profiles[0].name, "Petite 18");
assert.equal(profiles[0].link, "https://www.xvideos.com/channels/tugpass");
assert.equal(profiles[0].description, "118 videos");
assert.equal(profiles[0].imageUrl, "https://thumb.example/p1/0/xv_16_t.jpg");

// ── Tag index ──────────────────────────────────────────────────────────────
const tagFixture = `
  <ul class="tags-list" id="tags">
    <li><a href="/tags/0-pussy"><b>0-pussy </b><span class="navbadge default">222,047</span></a></li>
    <li><a href="/tags/18yearsold"><b>18yearsold </b><span class="navbadge default">10,716</span></a></li>
  </ul>`;
const tags = provider._parseTags(tagFixture);
assert.equal(tags.length, 2);
assert.equal(tags[0].name, "0-pussy");
assert.equal(tags[0].collectionId, "tag_0-pussy");
assert.equal(tags[0].description, "222,047 videos");

// ── Categories ─────────────────────────────────────────────────────────────
const categoryFixture = `
  <ul id="main-cats-sub-list">
    <li><a href="/c/Anal-12">Anal</a></li>
    <li><a href="/c/Big_Tits-23">Big Tits</a></li>
  </ul>`;
const categories = provider._parseCategories(categoryFixture);
assert.equal(categories.length, 2);
assert.equal(categories[1].name, "Big Tits");
assert.equal(categories[1].collectionId, "category_Big_Tits-23");

// ── Languages ──────────────────────────────────────────────────────────────
const languageFixture = `
  <ul class="lang-index-cards">
    <li class="lang-index-item current"><a class="lang-index-link" href="/lang/francais" title="Porn in French"><span class="lang-index-flag flag-small flag-fr"></span><span class="lang-index-names"><span class="lang-index-name">Porno en Fran\u00E7ais</span></span><span class="lang-index-count">6 535</span></a></li>
    <li class="lang-index-item"><a class="lang-index-link" href="/lang/english" title="Porn in English"><span class="lang-index-flag flag-small flag-gb"></span><span class="lang-index-names"><span class="lang-index-name">Porn in English</span></span><span class="lang-index-count">12 004</span></a></li>
  </ul>`;
const languages = provider._parseLanguages(languageFixture);
assert.equal(languages.length, 2);
assert.equal(languages[0].collectionId, "language_francais");
assert.equal(languages[0].name, "\u{1F1EB}\u{1F1F7} Porno en Fran\u00E7ais");
assert.equal(languages[0].description, "6 535 videos");
assert.equal(languages[1].link, "https://www.xvideos.com/lang/english");

// ── Cover borrowing ────────────────────────────────────────────────────────
// The tag index has no artwork, so a tag's cover is the first thumbnail of its
// own listing. Only the cards the page renders are fetched, and one failure
// must leave the rest of the grid untouched.
const coverListing = `
  <div id="video_aaa" class="thumb-block">
    <div class="thumb-inside"><div class="thumb">
      <a href="/video.aaa/first"><img src="blank.gif" data-src="https://thumb.example/c1/0/xv_5_t.jpg" /></a>
    </div></div>
    <div class="thumb-under"><p class="title"><a href="/video.aaa/first">First</a></p></div>
  </div>`;
const coverTags = [
  { name: "0-pussy", imageUrl: "", collectionId: "tag_0-pussy" },
  { name: "milf", imageUrl: "", collectionId: "tag_milf" },
  { name: "with-cover", imageUrl: "https://thumb.example/already.jpg", collectionId: "tag_with-cover" },
];
const served = [];
response = { statusCode: 200, body: coverListing };
const originalGet = provider._get.bind(provider);
provider._get = async (route) => {
  served.push(route);
  if (route === "/tags/milf") return "<html>empty</html>";
  return originalGet(route);
};
await provider._borrowCovers(coverTags, "tag_", (slug) => `/tags/${slug}`, 2);
provider._get = originalGet;
assert.equal(coverTags[0].imageUrl, "https://thumb.example/c1/0/xv_5_t.jpg");
assert.equal(coverTags[1].imageUrl, "");
assert.equal(coverTags[2].imageUrl, "https://thumb.example/already.jpg");
assert.deepEqual(served, ["/tags/0-pussy", "/tags/milf"]);

// ── Custom lists wire the parsers to the right routes ──────────────────────
response = { statusCode: 200, body: profileFixture };
const pornstars = await provider.getCustomList("pornstars", 1);
assert.equal(pornstars.list.length, 2);
assert.match(lastUrl, /\/pornstars-index$/);

const studios = await provider.getCustomList("studios", 2);
assert.equal(studios.list.length, 2);
assert.match(lastUrl, /\/channels-index\/1$/);

response = { statusCode: 200, body: tagFixture };
assert.equal((await provider.getCustomList("tags", 1)).list.length, 2);

response = { statusCode: 200, body: categoryFixture };
assert.equal((await provider.getCustomList("categories", 1)).list.length, 2);

// The member directory reuses the profile card shape and keeps its own link
// prefix, so `/profiles/<slug>` stays navigable as a person page.
response = { statusCode: 200, body: profileFixture };
const profilesList = await provider.getCustomList("profiles", 1);
assert.equal(profilesList.list.length, 2);
assert.match(lastUrl, /\/profileslist$/);

response = { statusCode: 200, body: languageFixture };
// The language feeds borrow their cover from `/lang/<code>`, which is a normal
// video grid; serve the listing fixture for those and the index otherwise.
routes = [[/\/lang\/[a-z]+$/, listingFixture]];
const languagesList = await provider.getCustomList("languages", 1);
routes = null;
assert.equal(languagesList.list.length, 2);
assert.equal(languagesList.list[0].collectionId, "language_francais");
// The `/lang` index carries no artwork, so every card borrows the first
// thumbnail of its own listing instead of rendering a bare gradient tile.
assert.equal(
  languagesList.list[0].imageUrl,
  "https://thumb.example/e1/0/xv_15_t.jpg",
);
assert.equal(
  languagesList.list[1].imageUrl,
  "https://thumb.example/e1/0/xv_15_t.jpg",
);

// `language_<code>` is a plain video listing, exactly like a category.
response = { statusCode: 200, body: listingFixture };
const frenchFeed = await provider.getCustomList("language_francais", 1);
assert.equal(frenchFeed.list.length, 2);
assert.match(lastUrl, /\/lang\/francais$/);

// A profile page with no videos returns an empty page rather than a crash.
response = { statusCode: 200, body: '{"nb_videos":0,"videos":[]}' };
const emptyProfile = await provider.getCustomList(
  "profile_" + provider._toHex("/profiles/karen_chavez3"),
  1,
);
assert.equal(emptyProfile.list.length, 0);
assert.equal(emptyProfile.hasNextPage, false);

// ── Profile listing JSON (array and object shapes) ─────────────────────────
const profileJson = JSON.stringify({
  nb_videos: 100,
  nb_per_page: 36,
  current_page: 0,
  videos: [
    { eid: "ifhoued97b8", tf: "No Control &amp; Creampie", u: "/prof-video-click/pornstar/violet-myers/ifhoued97b8/no_control", i: "https://thumb.example/v1.jpg", d: "15 min" },
  ],
});
response = { statusCode: 200, body: profileJson };
const profilePage = await provider.getCustomList("profile_" + provider._toHex("/pornstars/violet-myers"), 1);
assert.equal(profilePage.list.length, 1);
assert.equal(profilePage.list[0].name, "No Control & Creampie");
assert.equal(profilePage.list[0].link, "https://www.xvideos.com/video.ifhoued97b8/no_control");
assert.equal(profilePage.hasNextPage, true);
assert.match(lastUrl, /\/pornstars\/violet-myers\/videos\/best\/0$/);

// ── Detail: entities decoded, tags read, profile detection ─────────────────
const detailFixture = `
  <meta property="og:title" content="INKA SEX - Mega Tetona Colombiana es orde&ntilde;ada&period;" />
  <meta property="og:image" content="https://thumb.example/d1/0/xv_30_t.jpg" />
  <meta property="og:duration" content="662" />
  <script>var f = {"video_tags":["latina","busty","colombia"]};</script>`;
response = { statusCode: 200, body: detailFixture };
const detail = await provider.getDetail("https://www.xvideos.com/video.oumiola3a1f/inka_sex");
assert.equal(detail.name, "INKA SEX - Mega Tetona Colombiana es orde\u00F1ada.");
assert.equal(detail.imageUrl, "https://thumb.example/d1/0/xv_30_t.jpg");
assert.equal(detail.description, "11 min");
assert.equal(JSON.stringify(detail.genre.map((g) => g.name)), JSON.stringify(["latina", "busty", "colombia"]));
assert.equal(detail.episodes.length, 1);

// ── Recommendations: the embedded `video_related` array drives "Pour vous" ─
const relatedFixture = `
  <meta property="og:title" content="Some video" />
  <script>var video_related = [
    {"t":"Related One","u":"/video.aaa111/related_one","i":"https://thumb.example/r1/xv_30_t.jpg","d":"11 min","n":"2,6M","r":"100%"},
    {"t":"Related Two","u":"/video.bbb222/related_two","i":"https://thumb.example/r2/xv_30_t.jpg"},
    {"t":"Related One","u":"/video.aaa111/related_one","i":"https://thumb.example/r1/xv_30_t.jpg"}
  ];</script>`;
response = { statusCode: 200, body: relatedFixture };
const related = await provider.getRecommendations(
  "https://www.xvideos.com/video.oumiola3a1f/some_video",
);
// The duplicate entry is dropped, so the two distinct siblings remain.
assert.equal(related.length, 2);
assert.equal(related[0].name, "Related One");
assert.equal(related[0].link, "https://www.xvideos.com/video.aaa111/related_one");
assert.equal(related[0].imageUrl, "https://thumb.example/r1/xv_30_t.jpg");
assert.match(related[0].description, /11 min/);

// With no `video_related` literal, the page's first tag drives the fallback.
response = { statusCode: 200, body: detailFixture };
const fallbackRelated = await provider.getRecommendations(
  "https://www.xvideos.com/video.oumiola3a1f/inka_sex",
);
assert.ok(Array.isArray(fallbackRelated));

// ── Playback: RPC sources deduped, identical MP4 labelled once ─────────────
const playerPage = `<script>
  setEncodedIdVideo('oumiola3a1f');
  setIdCdnHLS('21');
</script>`;
const playerRpc = JSON.stringify({
  hls: "https://hls.example/master.m3u8",
  mp4_high: "https://mp4.example/3/mp4_sd.mp4",
  mp4_low: "https://mp4.example/3/mp4_sd.mp4",
});
let calls = 0;
class PlayerClient {
  async get() {
    calls += 1;
    return calls === 1
      ? { statusCode: 200, body: playerPage }
      : { statusCode: 200, body: playerRpc };
  }
}
const playerContext = {
  MProvider: class {},
  Document,
  Client: PlayerClient,
  SharedPreferences: class {},
  extLog: () => {},
  URL,
};
vm.runInNewContext(
  `${extensionSource}\nglobalThis.XVideosForTest = DefaultExtension;`,
  playerContext,
);
const playerProvider = new playerContext.XVideosForTest();
const sources = await playerProvider.getVideoList("https://www.xvideos.com/video.oumiola3a1f/inka_sex");
assert.equal(sources.length, 2);
assert.equal(sources[0].quality, "Auto (HLS)");
// The duplicate mp4_sd URL must not appear twice under two different labels.
assert.equal(sources[1].quality, "MP4 SD");
assert.equal(sources[1].url, "https://mp4.example/3/mp4_sd.mp4");
assert.ok(sources[0].headers && sources[0].headers.Referer);

// ── Error propagation: an HTTP failure must surface, not render empty ──────
clientError = null;
const failingContext = {
  MProvider: class {},
  Document,
  Client: class { async get() { return { statusCode: 404, body: "not found" }; } },
  SharedPreferences: class {},
  extLog: () => {},
  URL,
};
vm.runInNewContext(
  `${extensionSource}\nglobalThis.XVideosForTest = DefaultExtension;`,
  failingContext,
);
const failingProvider = new failingContext.XVideosForTest();
await assert.rejects(() => failingProvider.getCustomList("pornstars", 1), /HTTP 404/);

// ── Blocked-page detection ─────────────────────────────────────────────────
// A Cloudflare interstitial is a few KB and carries no listing markup, so the
// old "small page that mentions xvideos" heuristic let it through and every
// search came back with zero cards. It must be classified as a stub at any
// size, while a healthy page that merely links the Bot Fight Mode script (or
// embeds a Turnstile widget) must NOT be.
const stubCases = [
  ["tiny please-visit stub",
    "<html><body>Please visit https://www.xvideos.com</body></html>", true],
  ["Cloudflare 'Just a moment' (large)",
    "<!doctype html><html><head><title>Just a moment...</title></head><body>"
    + "checking your browser<div id='cf-chl'></div>"
    + "<div>x</div>".repeat(600) + "</body></html>", true],
  ["Cloudflare block page (large)",
    "<html><head><title>Attention Required! | Cloudflare</title></head><body>"
    + "You have been blocked" + "<p>y</p>".repeat(400) + "</body></html>", true],
  ["healthy page with challenge-platform script",
    "<html><script src='/cdn-cgi/challenge-platform/x.js'></script>"
    + "<div id='video-abc' class='thumb-block'><img src='x.jpg'></div></html>", false],
  ["real search grid",
    "<html><div id='video-thumb-1' class='thumb-block video'>"
    + "<a href='/video.abc/title'><img data-src='t.jpg'></a></div></html>", false],
];
for (const [label, body, expected] of stubCases) {
  assert.equal(provider._isStubBody(body), expected, `stub classification: ${label}`);
}

// ── Per-transport timeouts ─────────────────────────────────────────────────
// The app client defaults to a 60 s request timeout, longer than the 40 s
// execution budget for `search`: one blackholed host consumed the whole budget
// before a mirror was tried. Every request must therefore carry an explicit,
// shorter budget.
const clientOptions = [];
const slowContext = {
  MProvider: class {},
  Document,
  Client: class {
    constructor(options) { clientOptions.push(options); }
    async get(url) {
      if (String(url).includes("www.xvideos.com")) {
        // Blackholed canonical host: the mirror answers, the canonical one hangs.
        return { statusCode: 0, body: "" };
      }
      return { statusCode: 200, body: listingFixture };
    }
    async post() { return { statusCode: 200, body: "{}" }; }
  },
  SharedPreferences: class {},
  extLog: () => {},
  URL,
};
vm.runInNewContext(
  `${extensionSource}\nglobalThis.XVideosForTest = DefaultExtension;`,
  slowContext,
);
const slowProvider = new slowContext.XVideosForTest();
await slowProvider.search("inkasex", 1, []);
assert.ok(clientOptions.length > 0, "search issued an HTTP request");
for (const options of clientOptions) {
  assert.equal(options.timeout, 10, "each request carries a 10 s budget");
  assert.equal(options.connectTimeout, 5, "each request carries a 5 s connect budget");
}

// ── Cover budget: one heavy section must not starve the rest ───────────────
// The host runtime is single-threaded, so every borrowed cover costs a real
// round trip *inside* one getCustomList call. Without a ceiling the 38-category
// index spent ~18 s there and the user's search (same queue) was killed at
// 40 s. Each borrowing section must stay inside COVER_BUDGET_MS.
{
  const slow = { statusCode: 200, body: listingFixture };
  const slowRoutes = [
    [/^https?:\/\/[^/]+\/$/, categoryFixture],
    [/\/lang$/, languageFixture],
    [/\/tags$/, tagFixture],
    [/\/c\//, slow],
    [/\/tags\//, slow],
    [/\/lang\//, slow],
  ];
  let slowCalls = 0;
  const budgetContext = {
    MProvider: class {},
    Document,
    Client: class {
      async get(url) {
        slowCalls++;
        // 120 ms per borrowed cover: enough that an uncapped 38-item index
        // would blow the budget, small enough to keep the test quick.
        await new Promise((r) => setTimeout(r, 120));
        for (const [pattern, body] of slowRoutes) {
          if (pattern.test(url)) return { statusCode: 200, body };
        }
        return slow;
      }
    },
    SharedPreferences: class {
      get() { return null; }
      getString(_k, d) { return d; }
      setString() {}
    },
    extLog: () => {},
    URL,
  };
  vm.runInNewContext(
    `${extensionSource}\nglobalThis.XVideosForTest = DefaultExtension;`,
    budgetContext,
  );
  const budgetProvider = new budgetContext.XVideosForTest();
  const started = Date.now();
  const result = await budgetProvider.getCustomList("categories", 1);
  const elapsed = Date.now() - started;
  assert.ok(
    elapsed < DefaultBudgetCeiling,
    `categories stayed inside its cover budget (took ${elapsed} ms)`,
  );
  assert.ok(result.list.length > 0, "categories still returned its cards");
}

// ── Cover cache: a borrowed cover is paid once ─────────────────────────────
// Covers are stored through SharedPreferences so the expensive lookups are not
// repeated on every home load.
{
  const store = new Map();
  let coverCalls = 0;
  const cacheContext = {
    MProvider: class {},
    Document,
    Client: class {
      async get(url) {
        if (/\/c\//.test(url)) {
          coverCalls++;
          return { statusCode: 200, body: listingFixture };
        }
        if (/^https?:\/\/[^/]+\/$/.test(url)) {
          return { statusCode: 200, body: categoryFixture };
        }
        return { statusCode: 200, body: "" };
      }
    },
    SharedPreferences: class {
      get(k) { return store.has(k) ? store.get(k) : null; }
      getString(k, d) { return store.has(k) ? store.get(k) : d; }
      setString(k, v) { store.set(k, String(v)); }
    },
    extLog: () => {},
    URL,
  };
  vm.runInNewContext(
    `${extensionSource}\nglobalThis.XVideosForTest = DefaultExtension;`,
    cacheContext,
  );
  const cacheProvider = new cacheContext.XVideosForTest();
  const first = await cacheProvider.getCustomList("categories", 1);
  assert.ok(first.list.every((c) => c.imageUrl), "cold load filled the covers");
  assert.ok(coverCalls > 0, "cold load borrowed covers over the network");

  const callsAfterCold = coverCalls;
  // A fresh instance, same persisted store: the covers must come from the cache.
  const warmContext = { ...cacheContext };
  vm.runInNewContext(
    `${extensionSource}\nglobalThis.XVideosForTest = DefaultExtension;`,
    warmContext,
  );
  const warmProvider = new warmContext.XVideosForTest();
  const second = await warmProvider.getCustomList("categories", 1);
  assert.equal(
    coverCalls,
    callsAfterCold,
    "warm load issued no cover request (served from cache)",
  );
  assert.ok(second.list.every((c) => c.imageUrl), "warm load still has covers");
}

console.log("test-xvideos: all assertions passed");
