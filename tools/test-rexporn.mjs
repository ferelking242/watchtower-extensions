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
const posts = [];
// Transport-fallback fixtures. When `blockDirect` is set the primary host
// answers with the localised block stub; when `blockMirror` is also set the
// alternate domain does too, forcing the Worker proxy to serve the page.
let blockDirect = false;
let blockMirror = false;
const realListing = (slug) => `
  <div class="pitem">
    <a href="/watch/${slug}-sample.html">
      <img src="/placeholder.jpg" data-src="https://images.example/${slug}.jpg" />
    </a>
    <div class="ftitle">${slug} sample</div>
  </div>
  <div class="pageslinks">
    <a href="https://www.rexporn.st" class="pagelink" rel="nofollow"><span>&laquo; Prev</span></a>
    <a href="https://www.rexporn.st/page-3.html" class="pagelink" rel="nofollow"><span>Next &raquo;</span></a>
  </div>`;
const blockStub = `<html><body>Please visit https://www.rexporn.sex</body></html>`;
class TestClient {
  async get(url) {
    requests.push(url);
    const parsed = new URL(url);
    const host = parsed.origin;
    const pathname = parsed.pathname;
    if (host === "https://www.rexporn.st" && blockDirect && pathname.startsWith("/page-")) {
      return { statusCode: 200, body: blockStub };
    }
    if (host === "https://www.rexporn.sex") {
      if (blockMirror) return { statusCode: 200, body: blockStub };
      if (pathname.startsWith("/page-")) return { statusCode: 200, body: realListing("mirror") };
    }
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
    // The live site degrades the page for non-browser clients: HTTP 200 with
    // "Video is not available" and no `data-q`. The player payload then only
    // exists in a real WebView session.
    if (pathname === "/watch/webview-only-test") {
      return {
        statusCode: 200,
        body: `<div class="viewmov" data-id="12960">
          <h2>Video is not available</h2></div>`,
      };
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
        </div>
        <div class="pageslinks">
          <a href="https://www.rexporn.st" class="pagelink" rel="nofollow"><span>&laquo; Prev</span></a>
          <a href="https://www.rexporn.st/page-3.html" class="pagelink" rel="nofollow"><span>Next &raquo;</span></a>
        </div>`,
    };
  }

  // The Worker proxy contract: POST the target URL, receive
  // `{statusCode, headers, body}`. It always reaches the real (unblocked) site.
  async post(url, headers, body) {
    posts.push({ url, body });
    const target = body && body.url ? body.url : "";
    const pathname = target ? new URL(target).pathname : "";
    if (pathname.startsWith("/page-")) {
      return { statusCode: 200, body: JSON.stringify({ statusCode: 200, body: realListing("proxy") }) };
    }
    return { statusCode: 200, body: JSON.stringify({ statusCode: 200, body: `<div class="pitem"><a href="/watch/proxy-sample.html"><img src="https://images.example/proxy.jpg"/></a><div class="ftitle">proxy sample</div></div>` }) };
  }
}

const webviewCalls = [];
// The WebView bridge is only present on platforms that can render the page.
// It returns the live player element's outerHTML, exactly like the real
// `evaluateJavascriptViaWebview` handler does.
const evaluateJavascriptViaWebview = async (url, headers, scripts) => {
  webviewCalls.push({ url, headers, scripts });
  if (!url.includes("webview-only-test")) return "";
  return `<div id="sync" data-s="serv-1" data-n="cdn-webview" data-id="12960"
    data-q="720p;x;720p;x;1699999999;tok720,1080p;x;1080p;x;1699999999;tok1080"></div>`;
};

const context = {
  MProvider: class {},
  Document,
  Client: TestClient,
  extLog: (level, message) => logs.push({ level, message }),
  evaluateJavascriptViaWebview,
  URL,
  URLSearchParams,
};

// History goes through the runtime's async localStorage helpers (the same ones
// the app exposes). Wire them up before loading the extension so the write and
// the read are both exercised instead of silently no-op'ing.
const localStore = {};
context.getLocalStorage = async (origin, key) => localStore[key] ?? null;
context.setLocalStorage = async (origin, key, value) => {
  localStore[key] = value;
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

// The live site withholds `data-q` from HTTP clients and only ships it in a
// real browser session. The extension must fall back to the WebView bridge and
// build the sources from the player element it returns.
const webviewSources = await provider.getVideoList(
  "https://www.rexporn.st/watch/webview-only-test",
);
assert.equal(webviewSources.length, 2, "WebView fallback yields sources when HTTP has none");
assert.ok(
  webviewSources.every((s) => s.url.startsWith("https://cdn-webview.vstor.top/whpvid/")),
  "WebView sources use the data-n host",
);
assert.ok(
  webviewCalls.some((c) => c.url.includes("webview-only-test")),
  "the WebView bridge is invoked for a page with no HTTP payload",
);
assert.ok(
  !webviewCalls.some((c) => c.url.includes("player-sync-test")),
  "a page that already carries the payload never opens a WebView",
);

// ── Pagination, sort, search, ROT13, transports ──────────────────────────────
// The site paginates the home listing as /page-N.html; `?sort=new&page=N` was
// silently ignored and returned page 1 forever.
assert.equal(
  provider._sortedUrl(0, 1),
  "https://www.rexporn.st/",
  "home page 1 is the bare host",
);
assert.equal(
  provider._sortedUrl(0, 2),
  "https://www.rexporn.st/page-2.html",
  "home page 2 uses the /page-N.html route, not a query string",
);
assert.equal(
  provider._sortedUrl(4, 3),
  "https://www.rexporn.st/most-popular/page-3.html",
  "sorted listings keep the path + /page-N.html shape",
);

// Search keeps the sort as a path segment on the search route.
assert.equal(
  provider._searchUrl("big tits", 1, 0),
  "https://www.rexporn.st/videos/search/?query=big%20tits",
);
assert.equal(
  provider._searchUrl("teen", 2, 1),
  "https://www.rexporn.st/videos/search/top-rated/?query=teen&page=2",
);

// A listing with a "Next" anchor reports more pages; one without does not.
const nextDoc = new Document(
  `<div class="pageslinks"><a class="pagelink" href="https://www.rexporn.st/page-3.html"><span>Next &raquo;</span></a></div>`,
);
const lastDoc = new Document(
  `<div class="pageslinks"><a class="pagelink" href="https://www.rexporn.st"><span>&laquo; Prev</span></a></div>`,
);
assert.equal(provider._hasNextPage(nextDoc), true, "a Next link means more pages");
assert.equal(provider._hasNextPage(lastDoc), false, "a Prev-only block is the last page");

const pagedList = provider._parseList(
  `<div class="pitem"><a href="/watch/paged.html"><img src="https://images.example/a.jpg"/></a><div class="ftitle">Paged</div></div>
   <div class="pageslinks"><a class="pagelink" href="https://www.rexporn.st/page-2.html"><span>Next &raquo;</span></a></div>`,
  "https://www.rexporn.st/",
  1,
  "popular",
);
assert.equal(pagedList.hasNextPage, true, "parseList propagates the Next signal");

// Pornstar names arrive ROT13-encoded in `.vname.rtt` nodes.
assert.equal(provider._rot13("Nnyvlnu Ybir"), "Aaliyah Love", "ROT13 decodes pornstar names");
assert.equal(provider._rot13("Nqevnan Purpuvx"), "Adriana Chechik");

const encodedCollection = provider._parseCollectionList(
  `<div class="pornstar"><a href="/pornstar/Aaxliyah-Loxve"><img src="https://images.example/p.jpg"/><div class="vname rtt">Nnyvlnu Ybir</div><div class="vidcount">11 videos</div></a></div>`,
  ".pornstar",
  1,
  "pornstars",
);
assert.equal(encodedCollection.list[0].name, "Aaliyah Love", "collection cards decode ROT13 names");

// A plain-text name (no `.rtt`) must not be mangled.
const plainCollection = provider._parseCollectionList(
  `<div class="studio"><a href="/channel/demo"><img src="https://images.example/s.jpg"/><div class="name">Demo Studio</div></a></div>`,
  ".studio",
  1,
  "studios",
);
assert.equal(plainCollection.list[0].name, "Demo Studio", "unencoded names pass through untouched");

// Transport fallback: with the primary host blocked, the mirror serves the page.
blockDirect = true;
const viaMirror = await provider.getPopular(2);
assert.equal(viaMirror.list[0].name, "mirror sample", "the alternate domain serves the blocked page");
assert.ok(
  requests.some((u) => u.startsWith("https://www.rexporn.sex/page-2.html")),
  "the mirror host is tried when the primary is blocked",
);

// With both direct hosts blocked, the Worker proxy is the last resort.
blockMirror = true;
const viaProxy = await provider.getPopular(2);
assert.equal(viaProxy.list[0].name, "proxy sample", "the proxy serves the page when every direct host is blocked");
assert.ok(posts.length > 0, "the proxy receives a POST when direct transports fail");
blockDirect = false;
blockMirror = false;

// ── History ──────────────────────────────────────────────────────────────────
// Opening a video is what records an entry, and the write must not depend on
// the player payload being extractable: the live site withholds `data-q` from
// HTTP clients, so gating the write on `videos.length` left "Historique" empty
// for every page the user had actually opened.
// The source-extraction checks above already opened four pages, so start from
// a clean store and force the static cache to reload from it.
delete localStore[context.RexPornForTest.HISTORY_KEY];
context.RexPornForTest._historyCache = undefined;
// `_saveHistoryItem` is deliberately fire-and-forget (the storage write must
// never delay the video URL), so let the pending promise chain drain before
// reading the rail back.
const flush = () => new Promise((resolve) => setTimeout(resolve, 0));
const historyPage = "https://www.rexporn.st/watch/history-test";
await provider.getVideoList(historyPage);
await flush();
await flush();
const historyRail = await provider.getCustomList("history", 1);
assert.equal(historyRail.list.length, 1, "opening a page records exactly one entry");
assert.equal(historyRail.list[0].link, historyPage);
assert.ok(
  historyRail.list[0].name && historyRail.list[0].name.length > 0,
  "the entry carries a usable label",
);
assert.ok(
  historyRail.list[0].description.startsWith("Vu le"),
  `the entry is stamped with a watch date, got "${historyRail.list[0].description}"`,
);

// Re-opening the same page updates its timestamp instead of duplicating it.
await provider.getVideoList(historyPage);
await flush();
const deduped = await provider.getCustomList("history", 1);
assert.equal(deduped.list.length, 1, "re-opening a page does not duplicate the entry");

// The fallback label comes from the URL slug when the page carries no title.
const untitled = await provider.getVideoList(
  "https://www.rexporn.st/watch/my-drunken-stepmother",
);
assert.ok(
  untitled.length === 0,
  "a page without a player payload still yields no sources",
);
const withSlug = await provider.getCustomList("history", 1);
assert.equal(
  withSlug.list[0].name,
  "My Drunken Stepmother",
  "a page with no og:title falls back to the de-slugified URL",
);

console.log(
  "RexPorn regression checks passed (category routing, pornstar/studio profiles, episodes, thumbnails, pagination, sort, ROT13, history, transports).",
);
