#!/usr/bin/env node
// Offline contract test for the MissAV extension.
//
// The live site sits behind Cloudflare, so these checks run against markup
// captured from missav.ws: one listing page (12-card grid), one detail page
// (metadata block) and the real P.A.C.K.E.R packed player script. They guard
// the two regressions this source had: a listing parser that read the wrong
// anchors, and a getVideoList that only grepped a literal `.m3u8` and always
// returned 0 videos.
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { fileURLToPath } from "node:url";
import { Document } from "./html_document.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const extensionSource = fs.readFileSync(
  path.join(root, "src/nsfw/watch/ja/missav.js"),
  "utf8",
);

let response = { statusCode: 200, body: "" };
let requestedUrl = "";
class TestClient {
  async get(url) {
    requestedUrl = url;
    return response;
  }
}

const context = {
  MProvider: class {},
  Document,
  Client: TestClient,
  SharedPreferences: class {},
  extLog: () => {},
  URL,
};
vm.runInNewContext(
  `${extensionSource}\nglobalThis.MissAvForTest = DefaultExtension;`,
  context,
);
const provider = new context.MissAvForTest();

// Arrays come from the vm realm, so compare their contents, not prototypes.
assert.equal(provider.getSourcePreferences().length, 0);
assert.equal(provider.getFilterList().length, 0);

// ── Listing cards ───────────────────────────────────────────────────────────
const listingFixture = `
<div class="grid grid-cols-2">
  <div><div class="thumbnail group">
    <div class="relative aspect-w-16 aspect-h-9">
      <a href="https://missav.ws/en/pondo-102426_001" alt="pondo-102426_001">
        <video data-src="https://fourhoi.com/pondo-102426_001/preview.mp4"></video>
        <img class="w-full" data-src="https://fourhoi.com/pondo-102426_001/cover-t.jpg" src="https://fourhoi.com/pondo-102426_001/cover-t.jpg" alt="Big-breasted nurse">
      </a>
      <a href="https://missav.ws/en/pondo-102426_001" alt="pondo-102426_001">
        <span class="absolute bottom-1 right-1 rounded-lg px-2 py-1 text-xs">1:01:25</span>
      </a>
    </div>
    <div class="my-2 text-sm text-nord4 truncate">
      <a class="text-secondary group-hover:text-primary" href="https://missav.ws/en/pondo-102426_001" alt="pondo-102426_001">PONDO-102426_001 Big-breasted nurse</a>
    </div>
  </div></div>
  <div><div class="thumbnail group">
    <div class="relative aspect-w-16 aspect-h-9">
      <a href="/dm597/en/fc2-ppv-4997309" alt="fc2-ppv-4997309">
        <img data-src="https://fourhoi.com/fc2-ppv-4997309/cover-t.jpg" alt="New release Nanami">
      </a>
      <a href="/dm597/en/fc2-ppv-4997309"><span class="absolute bottom-1 right-1">2:17:37</span></a>
    </div>
    <div class="my-2 text-sm text-nord4 truncate">
      <a class="text-secondary group-hover:text-primary" href="/dm597/en/fc2-ppv-4997309" alt="fc2-ppv-4997309">FC2-PPV-4997309 New release Nanami</a>
    </div>
  </div></div>
</div>
<a href="https://missav.ws/en/new?page=2" rel="next">Next</a>`;

const parsed = provider._parseList(listingFixture, 1);
assert.equal(parsed.list.length, 2, "one card per video, not one per anchor");
assert.equal(parsed.list[0].name, "PONDO-102426_001 Big-breasted nurse");
assert.equal(parsed.list[0].link, "https://missav.ws/en/pondo-102426_001");
assert.equal(parsed.list[0].imageUrl, "https://fourhoi.com/pondo-102426_001/cover-t.jpg");
assert.equal(parsed.list[0].description, "1:01:25");
assert.equal(parsed.list[1].link, "https://missav.ws/en/fc2-ppv-4997309");
assert.equal(parsed.list[1].description, "2:17:37");
assert.equal(parsed.hasNextPage, true);
assert.equal(provider._parseList("<html></html>", 1).list.length, 0);
assert.equal(provider._parseList("<html></html>", 1).hasNextPage, false);

// ── Catalogue entry points + section routing ───────────────────────────────
response = { statusCode: 200, body: listingFixture };

await provider.getPopular(1);
assert.equal(requestedUrl, "https://missav.ws/en/new?sort=views");
await provider.getPopular(3);
assert.equal(requestedUrl, "https://missav.ws/en/new?sort=views&page=3");
await provider.getLatestUpdates(1);
assert.equal(requestedUrl, "https://missav.ws/en/new");
await provider.getLatestUpdates(2);
assert.equal(requestedUrl, "https://missav.ws/en/new?page=2");

const sections = {
  today_hot: "/today-hot",
  weekly_hot: "/weekly-hot",
  monthly_hot: "/monthly-hot",
  new_release: "/release",
  uncensored: "/uncensored-leak",
  english_sub: "/english-subtitle",
  fc2: "/fc2",
  tokyo_hot: "/tokyohot",
  heyzo: "/heyzo",
  siro: "/siro",
  vr: "/genres/VR",
  big_breasts: "/genres/Big%20Breasts",
  creampie: "/genres/Creampie",
  catalogue: "/new",
};
for (const [id, suffix] of Object.entries(sections)) {
  const page = await provider.getCustomList(id, 2);
  assert.equal(page.list.length, 2, `section ${id} parses the grid`);
  assert.equal(
    requestedUrl,
    `https://missav.ws/en${suffix}${suffix.includes("?") ? "&" : "?"}page=2`,
    `section ${id} paginates`,
  );
}
await assert.rejects(
  provider.getCustomList("does_not_exist", 1),
  /unknown home section/,
);

await provider.search("big breasts", 2);
assert.equal(requestedUrl, "https://missav.ws/en/search/big%20breasts?page=2");
assert.equal((await provider.search("   ", 1)).list.length, 0);

// ── Detail page metadata ────────────────────────────────────────────────────
const detailFixture = `
<html><head>
  <meta property="og:title" content="FC2-PPV-4997309 New release Nanami" />
  <meta property="og:image" content="https://fourhoi.com/fc2-ppv-4997309/cover-n.jpg" />
  <meta property="og:url" content="https://missav.ws/en/fc2-ppv-4997309" />
  <meta property="og:video:release_date" content="2026-10-23" />
  <meta property="og:video:duration" content="8257" />
</head><body>
  <h1 class="text-base">FC2-PPV-4997309 New release Nanami</h1>
  <div class="space-y-2">
    <div class="text-secondary"><span>Genre:</span>
      <a href="https://missav.ws/dm156/en/genres/Big%20Breasts" class="text-nord13 font-medium">Big Breasts</a>,
      <a href="https://missav.ws/dm133/en/genres/Creampie" class="text-nord13 font-medium">Creampie</a>
    </div>
    <div class="text-secondary"><span>Maker:</span>
      <a href="https://missav.ws/dm445059/en/makers/Fc2" class="text-nord13 font-medium">Fc2</a>
    </div>
    <div class="text-secondary"><span>Actress:</span>
      <a href="https://missav.ws/en/actresses/nanami" class="text-nord13 font-medium">Nanami</a>
    </div>
  </div>
</body></html>`;
response = { statusCode: 200, body: detailFixture };

const detail = await provider.getDetail("https://missav.ws/en/fc2-ppv-4997309");
assert.equal(detail.name, "FC2-PPV-4997309 New release Nanami");
assert.equal(detail.imageUrl, "https://fourhoi.com/fc2-ppv-4997309/cover-n.jpg");
assert.equal(
  detail.genre.map((entry) => entry.name).join(" | "),
  "Big Breasts | Creampie",
);
assert.equal(detail.episodes.length, 1);
assert.equal(detail.episodes[0].url, "https://missav.ws/en/fc2-ppv-4997309");
assert.equal(detail.episodes[0].duration, "2:17:37");
assert.match(detail.description, /Code: FC2-PPV-4997309/);
assert.match(detail.description, /Release date: 2026-10-23/);
assert.match(detail.description, /Maker: Fc2/);
assert.match(detail.description, /Actress: Nanami/);
assert.equal(detail.author, "Fc2");

// JAV pages tag the video through og:video:tag; the navigation links to
// /genres/VR and must not end up in the tags.
response = {
  statusCode: 200,
  body: `<html><head>
    <meta property="og:title" content="AARM-327" />
    <meta property="og:video:tag" content="Creampie" />
    <meta property="og:video:tag" content="Big breasts" />
  </head><body><a href="https://missav.ws/en/genres/VR">VR</a></body></html>`,
};
const tagged = await provider.getDetail("https://missav.ws/en/aarm-327");
assert.equal(
  tagged.genre.map((entry) => entry.name).join(" | "),
  "Creampie | Big breasts",
);

// ── Playback: the P.A.C.K.E.R payload carried by every detail page ──────────
const VIDEO_UUID = "5a62dec7-80fc-42da-8157-45f256fd3038";
const packedPlayer = `<script>
eval(function(p,a,c,k,e,d){e=function(c){return c.toString(36)};if(!''.replace(/^/,String)){while(c--){d[c.toString(a)]=k[c]||c.toString(a)}k=[function(e){return d[e]}];e=function(){return'\\\\w+'};c=1};while(c--){if(k[c]){p=p.replace(new RegExp('\\\\b'+e(c)+'\\\\b','g'),k[c])}}return p}('e=\\'8://7.6/5-4-3-2-1/d.0\\';c=\\'8://7.6/5-4-3-2-1/a/9.0\\';b=\\'8://7.6/5-4-3-2-1/a/9.0\\';',15,15,'m3u8|45f256fd3038|8157|42da|80fc|5a62dec7|com|surrit|https|video|720p|source1280|source842|playlist|source'.split('|'),0,{}))
</script>
<img src="https://surrit.com/${VIDEO_UUID}/seek/_0.jpg">`;

response = { statusCode: 200, body: packedPlayer };
const videos = await provider.getVideoList("https://missav.ws/en/fc2-ppv-4997309");
assert.equal(videos.length, 1, "one adaptive entry, not the raw packed blobs");
assert.equal(videos[0].url, `https://surrit.com/${VIDEO_UUID}/playlist.m3u8`);
assert.equal(videos[0].quality, "Auto");
assert.equal(videos[0].originalUrl, videos[0].url);
assert.ok(videos[0].headers["User-Agent"].includes("Chrome"));
assert.equal(videos[0].headers.Referer, "https://missav.ws/");

// The UUID fallback covers pages whose packed block changed shape.
response = {
  statusCode: 200,
  body: `<img src="https://surrit.com/${VIDEO_UUID}/seek/_0.jpg">`,
};
assert.equal(
  (await provider.getVideoList("https://missav.ws/en/fc2-ppv-4997309"))[0].url,
  `https://surrit.com/${VIDEO_UUID}/playlist.m3u8`,
);

// Variant-only pages are labelled from their own path, never invented.
response = {
  statusCode: 200,
  body: `<script>const src = "https:\\/\\/surrit.com\\/${VIDEO_UUID}\\/720p\\/video.m3u8";</script>`,
};
const variants = await provider.getVideoList("https://missav.ws/en/aarm-327");
assert.equal(variants.length, 1);
assert.equal(variants[0].quality, "720p");
assert.equal(variants[0].url, `https://surrit.com/${VIDEO_UUID}/720p/video.m3u8`);

response = { statusCode: 200, body: `<video><source src="https://cdn.example/v.mp4"></video>` };
const mp4 = await provider.getVideoList("https://missav.ws/en/aarm-327");
assert.equal(mp4[0].url, "https://cdn.example/v.mp4");
assert.equal(mp4[0].quality, "MP4");

response = { statusCode: 200, body: "<html><body>no player</body></html>" };
assert.equal((await provider.getVideoList("https://missav.ws/en/aarm-327")).length, 0);

// ── Failure paths keep the failing URL as the last token ───────────────────
response = {
  statusCode: 403,
  body: "<html><title>Just a moment...</title></html>",
};
await assert.rejects(
  provider.getVideoList("https://missav.ws/en/aarm-327"),
  /https:\/\/missav\.ws\/en\/aarm-327$/,
);
response = { statusCode: 503, body: "Service unavailable" };
await assert.rejects(provider.getLatestUpdates(1), /HTTP 503/);

console.log("✅ missav: listing, sections, detail and HLS extraction OK");
