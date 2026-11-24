import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const sourcePath = path.join(root, "src/watch/multi/miraculous_now.js");

const CF_522 = `<!DOCTYPE html>
<html class="no-js" lang="en-US"><head><title>miraculous.now | 522: Connection timed out</title></head>
<body><div id="cf-error-details"><h1>Connection timed out</h1>
<p>The initial connection between Cloudflare's network and the origin web server timed out.</p></div></body></html>`;

function seasonPage(season, count) {
  const cards = [];
  for (let i = 1; i <= count; i++) {
    const code = `${season}0${i}`;
    cards.push(
      `<a href="watch?s=${season}&amp;e=${code}" class="episode_card_link">` +
        `<img class="episode_card_bg" src="/res/episodes/season_${season}/${code}.webp">` +
        `<div class="episode_title">Épisode ${i}</div>` +
        `<span class="episode_subtitle">${i}/26</span>` +
        `<span class="episode_duration">22 min</span>` +
        `<span class="episode_rating" data-rating="4.8"></span>` +
        `</a>`
    );
  }
  return `<!DOCTYPE html><html><body>${cards.join("\n")}</body></html>`;
}

function loadExtension(handler, prefs = new Map()) {
  const calls = [];
  class Client {
    async get(url, headers = {}) {
      calls.push({ method: "GET", url });
      return handler(url, headers);
    }
    async post(url, headers = {}, body = "") {
      calls.push({ method: "POST", url });
      return handler(url, headers, body);
    }
  }
  class MProvider { constructor() { this.source = null; } }
  class SharedPreferences {
    getString(key, fallback = "") {
      return prefs.has(key) ? prefs.get(key) : fallback;
    }
    setString(key, value) { prefs.set(key, value); }
    get() { return null; }
  }

  const sandbox = {
    Client, MProvider, SharedPreferences, console, setTimeout, clearTimeout,
    URL, URLSearchParams, TextEncoder, TextDecoder, Buffer, JSON, Date, Math,
    String, Number, Array, Object, RegExp, decodeURIComponent, encodeURIComponent,
    parseInt, isNaN, Promise,
  };
  sandbox.globalThis = sandbox;
  vm.createContext(sandbox);
  vm.runInContext(fs.readFileSync(sourcePath, "utf8") + "\n;this.Extension = DefaultExtension;", sandbox, {
    filename: sourcePath,
    timeout: 10000,
  });
  return { extension: new sandbox.Extension(), calls, prefs };
}

const episodeUrl = "https://miraculous.now/fr/watch?s=7&e=701";
let failures = 0;
async function check(name, fn) {
  try {
    await fn();
    console.log(`  ✓ ${name}`);
  } catch (e) {
    failures++;
    console.log(`  ✗ ${name}\n      ${e.message}`);
  }
}

console.log("miraculous.now — origin down (Cloudflare 522)");
{
  const { extension, calls } = loadExtension(() => ({ statusCode: 522, body: CF_522 }));

  await check("getLatestUpdates returns empty fast and probes once", async () => {
    const started = Date.now();
    const res = await extension.getLatestUpdates(1);
    const elapsed = Date.now() - started;
    assert.equal(JSON.stringify(res.list), "[]", "expected an empty list");
    assert.equal(res.hasNextPage, false);
    assert.equal(calls.length, 1, `expected 1 HTTP call, saw ${calls.length}`);
    assert.ok(elapsed < 1500, `took ${elapsed}ms`);
  });

  await check("queued custom lists fail instantly without touching the network", async () => {
    const before = calls.length;
    const started = Date.now();
    const results = await Promise.all([
      extension.getCustomList("season_7", 1),
      extension.getCustomList("season_6", 1),
      extension.getCustomList("season_1", 1),
      extension.getCustomList("specials", 1),
    ]);
    const elapsed = Date.now() - started;
    for (const res of results) assert.equal(JSON.stringify(res.list), "[]", "expected an empty list");
    assert.equal(calls.length, before, "the breaker must not issue requests");
    assert.ok(elapsed < 300, `took ${elapsed}ms`);
  });

  await check("search returns empty without a request", async () => {
    const before = calls.length;
    const res = await extension.search("ladybug", 1);
    assert.equal(JSON.stringify(res.list), "[]", "expected an empty list");
    assert.equal(calls.length, before);
  });

  await check("getDetail still yields the episode it was opened with", async () => {
    const res = await extension.getDetail(episodeUrl);
    assert.equal(res.chapters.length, 1);
    assert.equal(res.chapters[0].url, episodeUrl);
  });

  await check("getVideoList falls back to the web player", async () => {
    const list = await extension.getVideoList(episodeUrl);
    assert.ok(Array.isArray(list) && list.length >= 1);
    assert.equal(list[list.length - 1].quality, "WebView");
  });

  await check("getComments returns an empty list", async () => {
    assert.equal(JSON.stringify(await extension.getComments(episodeUrl)), "[]");
  });

  await check("getPopular never touches the network", async () => {
    const before = calls.length;
    const res = await extension.getPopular(1);
    assert.equal(res.list.length, 12);
    assert.equal(calls.length, before);
  });
}

console.log("miraculous.now — origin healthy");
{
  const { extension, calls, prefs } = loadExtension((url) => {
    if (url.includes("/episodes?s=7")) return { statusCode: 200, body: seasonPage(7, 6) };
    if (url.includes("/episodes?s=")) return { statusCode: 200, body: seasonPage(1, 4) };
    return { statusCode: 404, body: "not found" };
  });

  await check("getLatestUpdates reads one page and returns the newest episodes", async () => {
    const started = Date.now();
    const res = await extension.getLatestUpdates(1);
    const elapsed = Date.now() - started;
    assert.equal(res.list.length, 6);
    assert.match(res.list[0].name, /Ép\. 6/);
    assert.equal(calls.length, 1);
    assert.ok(elapsed < 1000, `took ${elapsed}ms`);
  });

  await check("a season rail reuses the cached page", async () => {
    const before = calls.length;
    const res = await extension.getCustomList("season_7", 1);
    assert.equal(res.list.length, 6);
    assert.equal(calls.length, before, "season page should come from the cache");
  });

  await check("every rail is stored for the next outage", async () => {
    const stored = JSON.parse(prefs.get("miraculous.rail.latest"));
    assert.equal(stored.list.length, 6);
    assert.equal(JSON.parse(prefs.get("miraculous.rail.season_7")).list.length, 6);
  });

  console.log("miraculous.now — origin down after a healthy read");
  const outage = loadExtension(() => ({ statusCode: 522, body: CF_522 }), prefs);

  await check("the stored catalogue is served instead of an empty home", async () => {
    const started = Date.now();
    const latest = await outage.extension.getLatestUpdates(1);
    const season = await outage.extension.getCustomList("season_7", 1);
    const elapsed = Date.now() - started;
    assert.equal(latest.list.length, 6, "latest rail should come from the store");
    assert.equal(season.list.length, 6, "season rail should come from the store");
    assert.equal(outage.calls.length, 1, "only the first probe may hit the network");
    assert.ok(elapsed < 1500, `took ${elapsed}ms`);
  });
}

if (failures) {
  console.log(`\n${failures} check(s) failed`);
  process.exit(1);
}
console.log("\nAll miraculous checks passed");
