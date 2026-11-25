// Miraculous.TO — parsing and media checks.
// Fixture tests run offline; live tests hit the site (SKIP_LIVE=1 to skip).
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const sourcePath = path.join(root, "src/watch/multi/miraculous_to.js");

const INDEX_HTML = `<!DOCTYPE html><html><body>
<div id="owl-featured-posts" class="owl-carousel">
  <a href="/fr/saison-6/episode-26-nemesis.html" class="mto-card-link" data-epcode="626" data-lang="fr" data-expected-seconds="1320" aria-label="Nemesis">
    <article class="entry mto-episode-card"><div class="entry__img-holder card__img-holder mto-episode-media">
    <img src="/global_data/img/626_2026-08-08_04-39-43.webp" class="entry__img mto-episode-image" alt="Nemesis" />
    <span class="mto-card-play" aria-hidden="true"><span></span></span></div>
    <div class="entry__body card__body mto-episode-body"><div class="entry__header">
    <span class="mto-episode-meta">Saison 6 · Episode 26</span>
    <h2 class="entry__title mto-episode-title">Nemesis</h2></div></div></article></a>
</div>
<div class="tabs__content-pane" id="tab-7">
  <a href="/fr/saison-7/episode-1-rediffuzion-le-bon-moment-partie-1.html" class="mto-card-link" data-epcode="701" data-lang="fr" data-mto-season="7" data-mto-episode-number="1" data-mto-cc="1" data-mto-new="1">
    <article class="episode entry card mto-episode-card"><div class="entry__img-holder card__img-holder mto-episode-media">
    <img data-src="/global_data/img/701.webp" src="data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///ywAAAAAAQABAAACAUwAOw==" class="entry__img lazyload mto-episode-image" alt="Rediffuzion" />
    </div><div class="entry__body card__body mto-episode-body"><div class="entry__header">
    <span class="mto-episode-meta">Saison 7 · Episode 1</span>
    <h2 class="entry__title mto-episode-title">Rediffuzion (Le Bon Moment - Partie 1)</h2></div></div></article></a>
  <a href="/fr/saison-7/episode-2-le-bon-moment-partie-2.html" class="mto-card-link" data-epcode="702" data-lang="fr" data-mto-season="7" data-mto-episode-number="2" data-mto-cc="0" data-mto-new="0">
    <article class="episode entry card mto-episode-card"><div class="entry__img-holder card__img-holder mto-episode-media">
    <img data-src="/global_data/img/702.webp" src="data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///ywAAAAAAQABAAACAUwAOw==" class="entry__img lazyload mto-episode-image" alt="Le Bon Moment" />
    </div><div class="entry__body card__body mto-episode-body"><div class="entry__header">
    <span class="mto-episode-meta">Saison 7 · Episode 2</span>
    <h2 class="entry__title mto-episode-title">Le Bon Moment (Partie 2)</h2></div></div></article></a>
</div>
<div class="tabs__content-pane" id="tab-specials">
  <a href="/fr/films-speciaux/1-new-york-les-heros-unis.html" class="mto-card-link" data-epcode="1" data-lang="fr" data-mto-season="0">
    <article class="entry mto-episode-card"><div class="entry__img-holder card__img-holder mto-episode-media">
    <img data-src="/global_data/img/sp1.webp" src="data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///ywAAAAAAQABAAACAUwAOw==" class="entry__img lazyload mto-episode-image" alt="New York" />
    </div><div class="entry__body card__body mto-episode-body"><div class="entry__header">
    <span class="mto-episode-meta">Film spécial</span>
    <h2 class="entry__title mto-episode-title">New York, les héros unis</h2></div></div></article></a>
</div>
</body></html>`;

const EPISODE_HTML = `<!DOCTYPE html><html><head>
<title>Regarder Miraculous Ladybug Rediffuzion Saison 7 Episode 1</title>
<meta property="og:image" content="https://miraculous.to/global_data/img/701.webp" />
</head><body>
<h1 class="mto-watch-title">Rediffuzion (Le Bon Moment - Partie 1)</h1>
<span id="mto-watch-episode-meta">Saison 7 · Episode 1</span>
<video id="video-work" data-has-selectable-captions="true">
  <source src="https://miraculous.to/secret/m3u8.php?ep=701&amp;lang=fr&amp;token=et1.abc.def&amp;tab_id=TAB123" type="application/x-mpegURL">
  <track kind="subtitles" src="/global_data/subtitles/upload/ep701_fr_d37.vtt" srclang="fr" label="Français" default>
  <track kind="subtitles" src="/global_data/subtitles/upload/ep701_en_aa1.vtt" srclang="en" label="English">
</video>
<ul class="comment-list">
  <li class="comment-item" data-comment-id="37457"><div class="comment-body"><div class="comment-text">
    <div class="comment-avatar avatar-5">A</div><div class="comment-header"><div class="comment-content">
    <h6 class="comment-author">Ariana</h6><div class="comment-metadata"><a id="comment-date-a" style="color:#666;font-size:12px;">2026-11-22 12:41</a></div>
    </div></div><p style="margin:0 0 10px 52px;">oh vaya es Asombroso</p>
    <div class="comment-actions" style="margin:10px 0 0 52px;"><a href="#" class="reply-btn">Répondre</a></div>
  </div></div></li>
</ul>
</body></html>`;

const MASTER = `#EXTM3U
#EXT-X-VERSION:4
#EXT-X-MEDIA:TYPE=AUDIO,GROUP-ID="audio",NAME="English",LANGUAGE="en",DEFAULT=NO,AUTOSELECT=NO,URI="https://ep-distribution.miraculous.to/episodes/video3/audio_NEW/en/701/audio/media_0.m3u8"
#EXT-X-MEDIA:TYPE=AUDIO,GROUP-ID="audio",NAME="Français",LANGUAGE="fr",DEFAULT=YES,AUTOSELECT=YES,URI="https://ep-distribution.miraculous.to/episodes/video3/audio_NEW/fr/701/audio/media_0.m3u8"
#EXT-X-MEDIA:TYPE=AUDIO,GROUP-ID="audio",NAME="Español",LANGUAGE="es",DEFAULT=NO,AUTOSELECT=NO,URI="https://ep-distribution.miraculous.to/episodes/video3/audio_NEW/es/701/audio/media_0.m3u8"
#EXT-X-STREAM-INF:BANDWIDTH=7500000,RESOLUTION=1920x1080,CODECS="avc1.4d4028,mp4a.40.2",AUDIO="audio"
https://ep-distribution.miraculous.to/episodes/video3/video_NEW/701/video/media_0.m3u8
`;

function loadExtension(handler, prefs = {}) {
  const calls = [];
  const clientOptions = [];
  class Client {
    constructor(options) { clientOptions.push(options); }
    async get(url, headers = {}) {
      calls.push({ method: "GET", url, headers });
      return handler(url, headers);
    }
    async post(url, headers = {}, body = "") {
      calls.push({ method: "POST", url, headers, body });
      return handler(url, headers, body);
    }
  }
  // Le vrai runtime n'expose PAS getPreference sur MProvider : le stub ne doit
  // pas en fournir, sinon une extension qui l'appelle passe les tests puis
  // plante dans l'app.
  class MProvider {
    constructor() { this.source = null; }
  }
  class SharedPreferences {
    getString(key, fallback = "") { return key in prefs ? prefs[key] : fallback; }
    setString(key, value) { prefs[key] = value; }
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
  vm.runInContext(
    fs.readFileSync(sourcePath, "utf8") +
      "\n;this.Extension = DefaultExtension; this.sources = watchtowerSources;",
    sandbox,
    { filename: sourcePath, timeout: 10000 }
  );
  const ext = new sandbox.Extension();
  return { extension: ext, calls, prefs, clientOptions, sources: sandbox.sources };
}

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

console.log("miraculous.to — manifest");
{
  const { sources } = loadExtension(() => ({ statusCode: 200, body: "" }));
  await check("manifest is complete", async () => {
    const s = sources[0];
    assert.equal(s.name, "Miraculous.TO");
    assert.equal(s.baseUrl, "https://miraculous.to");
    assert.equal(s.pkgPath, "watch/multi/miraculous_to.js");
    assert.equal(s.hasSubtitles, true);
    assert.equal(s.hasDub, true);
    assert.ok(s.version);
  });
}

console.log("miraculous.to — parsing (offline fixtures)");
{
  const { extension } = loadExtension((url) => {
    if (url.includes("/episodes")) return { statusCode: 200, body: INDEX_HTML };
    if (url.endsWith(".html")) return { statusCode: 200, body: EPISODE_HTML };
    if (url.includes("media_0.m3u8")) return { statusCode: 200, body: MASTER };
    return { statusCode: 404, body: "" };
  });

  await check("season 7 keeps its own episodes", async () => {
    const res = await extension.getCustomList("season_7", 1);
    assert.equal(res.list.length, 2, `saw ${res.list.length}`);
    assert.match(res.list[0].name, /S7 · E1 — Rediffuzion/);
    assert.equal(res.list[0].imageUrl, "https://miraculous.to/global_data/img/701.webp");
    assert.equal(res.list[1].imageUrl, "https://miraculous.to/global_data/img/702.webp");
  });

  await check("featured cards without a season attribute still get one", async () => {
    const res = await extension.getPopular(1);
    const nemesis = res.list.find((c) => /Nemesis/.test(c.name));
    assert.ok(nemesis, "Nemesis card missing");
    assert.match(nemesis.name, /S6 · E26/);
  });

  await check("specials rail only holds films spéciaux", async () => {
    const res = await extension.getCustomList("specials", 1);
    assert.equal(res.list.length, 1);
    assert.match(res.list[0].link, /films-speciaux/);
  });

  await check("seasons rail lists S1–S7 plus specials", async () => {
    const res = await extension.getCustomList("seasons", 1);
    assert.equal(res.list.length, 8);
    assert.match(res.list[7].name, /Films spéciaux/);
    assert.match(res.list[7].link, /episodes\?s=specials/);
  });

  await check("season detail returns its chapters", async () => {
    const res = await extension.getDetail("https://miraculous.to/fr/episodes?s=7");
    assert.equal(res.chapters.length, 2);
    assert.match(res.chapters[0].name, /E1/);
    assert.match(res.chapters[0].url, /saison-7\/episode-1/);
  });

  await check("episode detail exposes the episode itself", async () => {
    const res = await extension.getDetail("https://miraculous.to/fr/saison-7/episode-1-x.html");
    assert.equal(res.chapters.length, 1);
    assert.match(res.name, /Rediffuzion/);
    assert.match(res.imageUrl, /701\.webp/);
  });
}

console.log("miraculous.to — media (offline fixtures)");
{
  const { extension } = loadExtension((url, headers) => {
    if (url.includes("/episodes")) return { statusCode: 200, body: INDEX_HTML };
    if (url.endsWith(".html")) {
      return {
        statusCode: 200,
        body: EPISODE_HTML,
        headers: { "set-cookie": "PHPSESSID=s3ss10n; path=/; domain=.miraculous.to" },
      };
    }
    if (url.includes("secret/m3u8.php")) return { statusCode: 200, body: MASTER };
    if (url.includes("media_0.m3u8")) return { statusCode: 200, body: MASTER };
    return { statusCode: 404, body: "" };
  });
  const episodeUrl = "https://miraculous.to/fr/saison-7/episode-1-x.html";

  await check("one entry per audio language, named with the quality", async () => {
    const list = await extension.getVideoList(episodeUrl);
    const hls = list.filter((v) => v.quality !== "WebView");
    assert.equal(hls.length, 3, `saw ${hls.length} entries`);
    assert.match(hls[0].quality, /^1080p · Français$/);
    assert.match(hls[0].url, /lang=fr/);
    assert.match(hls[1].url, /lang=(en|es)/);
  });

  await check("subtitles are exposed on every entry", async () => {
    const list = await extension.getVideoList(episodeUrl);
    const fr = list.find((v) => /Français/.test(v.quality));
    assert.ok(fr.subtitles.length >= 2, "expected 2 tracks");
    assert.equal(fr.subtitles[0].label, "Français");
    assert.equal(fr.subtitles[0].file, "https://miraculous.to/global_data/subtitles/upload/ep701_fr_d37.vtt");
  });

  await check("the signed playlist carries the session cookie and a referer", async () => {
    const list = await extension.getVideoList(episodeUrl);
    const fr = list.find((v) => /Français/.test(v.quality));
    assert.equal(fr.headers.Cookie, "PHPSESSID=s3ss10n");
    assert.equal(fr.headers.Referer, episodeUrl);
    assert.ok(fr.audios.length === 3, "audio renditions must be listed");
  });

  await check("an unpublished episode falls back to the web player", async () => {
    const { extension: ext2 } = loadExtension((url) => {
      if (url.includes("m3u8.php")) {
        return {
          statusCode: 200,
          body: "<html><body><h1>Bientôt</h1></body></html>",
          headers: { "set-cookie": "PHPSESSID=x; path=/" },
        };
      }
      return { statusCode: 404, body: "" };
    });
    const list = await ext2.getVideoList("https://miraculous.to/fr/saison-7/episode-9-x.html");
    assert.equal(list.length, 1);
    assert.equal(list[0].quality, "WebView");
  });

  await check("comments are parsed from the page", async () => {
    const { extension: ext3 } = loadExtension(() => ({ statusCode: 200, body: EPISODE_HTML }));
    const list = await ext3.getComments(episodeUrl);
    assert.equal(list.length, 1);
    assert.equal(list[0].author, "Ariana");
    assert.match(list[0].content, /Asombroso/);
    assert.equal(list[0].date, "2026-11-22 12:41");
  });
}

console.log("miraculous.to — search fallback");
{
  const { extension } = loadExtension((url) => {
    if (url.includes("/episodes")) return { statusCode: 200, body: INDEX_HTML };
    if (url.includes("/search/")) return { statusCode: 401, body: '{"error":{"code":"search_session_required"}}' };
    return { statusCode: 404, body: "" };
  });

  await check("a blocked search API falls back to the cached index", async () => {
    const res = await extension.search("nemesis", 1);
    assert.equal(res.list.length, 1);
    assert.match(res.list[0].name, /Nemesis/);
  });

  await check("season filter narrows the local results", async () => {
    const res = await extension.search("le bon moment", 1, [{ name: "Saison", value: "7" }]);
    assert.equal(res.list.length, 2);
    for (const item of res.list) assert.match(item.name, /^S7/);
  });

  await check("a \"saison 7\" query returns the season's episodes", async () => {
    const res = await extension.search("saison 7", 1);
    assert.ok(res.list.length > 0);
    for (const item of res.list) assert.match(item.name, /^S7/);
  });
}

if (process.env.SKIP_LIVE === "1") {
  console.log("\nlive checks skipped (SKIP_LIVE=1)");
} else {
  console.log("miraculous.to — live site");
  const liveClient = {
    async get(url, headers = {}) {
      const res = await fetch(url, { headers, redirect: "follow" });
      const hdrs = {};
      res.headers.forEach((v, k) => { hdrs[k] = v; });
      if (typeof res.headers.getSetCookie === "function") {
        const jar = res.headers.getSetCookie();
        if (jar.length) hdrs["set-cookie"] = jar.join(", ");
      }
      return { statusCode: res.status, body: await res.text(), headers: hdrs };
    },
    async post(url, headers = {}, body = "") {
      const res = await fetch(url, { method: "POST", headers, body: body || undefined });
      return { statusCode: res.status, body: await res.text() };
    },
  };

  const { extension } = loadExtension((url, headers) => liveClient.get(url, headers));
  let reachable = true;
  const episodeUrl = "https://miraculous.to/fr/saison-7/episode-1-rediffuzion-le-bon-moment-partie-1.html";

  await check("site is reachable", async () => {
    const res = await liveClient.get("https://miraculous.to/fr/episodes");
    if (res.statusCode >= 400) { reachable = false; throw new Error(`HTTP ${res.statusCode}`); }
    assert.ok(res.body.length > 100000, `index is only ${res.body.length} bytes`);
  });

  if (reachable) {
    await check("popular returns real episodes", async () => {
      const res = await extension.getPopular(1);
      assert.ok(res.list.length >= 10, `saw ${res.list.length}`);
      assert.match(res.list[0].name, /^S\d/);
    });

    await check("season 7 has episodes", async () => {
      const res = await extension.getCustomList("season_7", 1);
      assert.ok(res.list.length >= 5, `saw ${res.list.length}`);
    });

    await check("video list exposes audio languages and subtitles", async () => {
      const list = await extension.getVideoList(episodeUrl);
      const hls = list.filter((v) => v.quality !== "WebView");
      assert.ok(hls.length >= 3, `saw ${hls.length} entries`);
      assert.ok(hls[0].subtitles.length >= 5, `saw ${hls[0].subtitles.length} subtitles`);
      assert.match(hls[0].headers.Cookie || "", /^PHPSESSID=/);
      assert.match(hls[0].quality, /1080p/);
    });

    await check("the signed playlist answers 200 with that cookie", async () => {
      const list = await extension.getVideoList(episodeUrl);
      const first = list.find((v) => v.quality !== "WebView");
      const res = await liveClient.get(first.url, first.headers);
      assert.equal(res.statusCode, 200);
      assert.match(res.body, /#EXTM3U/);
      assert.match(res.body, /EXT-X-MEDIA:TYPE=AUDIO/);
    });

    await check("search finds an episode through the API", async () => {
      const res = await extension.search("nemesis", 1);
      assert.ok(res.list.length >= 1, "expected a result");
      assert.match(res.list[0].link, /nemesis/);
    });

    await check("comments are exposed", async () => {
      const list = await extension.getComments(episodeUrl);
      assert.ok(Array.isArray(list));
    });
  }
}

console.log(
  failures === 0
    ? "\nAll miraculous.to checks passed"
    : `\n${failures} miraculous.to check(s) failed`
);
process.exit(failures === 0 ? 0 : 1);
