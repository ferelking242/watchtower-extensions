// Miraculum Music — parsing and playback checks against miraculous.now.
// Fixture tests run offline; live tests hit the site (SKIP_LIVE=1 to skip).
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const sourcePath = path.join(root, "src/music/multi/miraculum.js");

const CATALOGUE = {
  series_S7_intro: {
    album: "Season 7 Opening", author: "Miraculous Corp.", year: "2026", language: "en",
    availability: "all",
    songs: [
      { name: "Arabic", src: "ar.m4a", time: "" },
      { name: "English", src: "en.m4a", time: "" },
    ],
  },
  series_608_bises_a_toi: {
    album: "Bises à toi (Vampigami)", author: "miraculousNOW", year: "2025", language: "en",
    availability: "all",
    songs: [{ name: "Bises à toi", src: "bises_a_toi_en.m4a", time: "" }],
  },
  movie: {
    album: "Ladybug & Cat Noir, The Movie (Multilanguage)", author: "Jeremy Zag", year: "2023",
    multilanguage: true, languages: ["de", "en", "fr", "it"],
    availability: "all",
    songs: [
      { name: { de: "Der Glaube an Mich", en: "If I Believed in Me", fr: "Si" }, src: "if_i_believed_in_me/lang.flac", time: "" },
    ],
  },
};

const CARDS = [
  { key: "series_S7_intro", title: "Season 7 Opening", author: "Miraculous Corp.", year: "2026" },
  { key: "series_608_bises_a_toi", title: "Bises à toi (Vampigami)", author: "miraculousNOW", year: "2025" },
  { key: "movie", title: "Ladybug & Cat Noir, The Movie (Multilanguage)", author: "Jeremy Zag", year: "2023" },
];

const CDN = "https://AHHHHHH.b-cdn.net/eps/miraculum/songs";

const SONGS_HTML = `<!DOCTYPE html><html><body>
${CARDS.map((card) => `<a class="song-item " href="songs?album=${card.key}" data-album-key="${card.key}" data-no-spa>
  <img src="${CDN}/${card.key}/cover.webp" alt="" class="album_card_bg">
  <div class="album_card_cover"><img src="${CDN}/${card.key}/cover.webp" alt="Album Art" class="album_card_img"></div>
  <div class="album_card_info">
    <div class="album_card_title">${card.title}</div>
    <div class="album_card_meta"><span class="album_card_author">${card.author}</span>
    <span class="album_card_year">${card.year}</span></div>
  </div>
</a>`).join("\n")}
<script>var allSongs = ${JSON.stringify(CATALOGUE)};</script>
</body></html>`;

function loadExtension(handler, prefs = {}) {
  const calls = [];
  class Client {
    async get(url, headers = {}) {
      calls.push({ method: "GET", url, headers });
      return handler(url, headers);
    }
    async head(url, headers = {}) {
      calls.push({ method: "HEAD", url, headers });
      return handler(url, headers, "HEAD");
    }
  }
  // Le vrai runtime n'expose PAS getPreference sur MProvider.
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
  return { extension: new sandbox.Extension(), calls, prefs, sources: sandbox.sources };
}

function offlineHandler(url, headers, method) {
  if (url.endsWith("/en/songs")) return { statusCode: 200, body: SONGS_HTML };
  if (method === "HEAD") {
    // `en.flac` is advertised by the site but missing: the extension must fall
    // back to another announced language.
    return { statusCode: url.endsWith("/en.flac") ? 404 : 200, body: "" };
  }
  return { statusCode: 404, body: "" };
}

let failures = 0;
async function check(name, fn) {
  try {
    await fn();
    console.log(`  ✓ ${name}`);
  } catch (err) {
    failures += 1;
    console.error(`  ✗ ${name}\n    ${err.message}`);
  }
}

console.log("miraculum — catalogue (offline fixtures)");
{
  const { extension, sources } = loadExtension(offlineHandler);

  await check("the manifest points at the live domain", async () => {
    assert.equal(sources[0].baseUrl, "https://miraculous.now");
    assert.equal(sources[0].version, "3.0.0");
  });

  await check("popular lists every album of the catalogue", async () => {
    const res = await extension.getPopular(1);
    assert.equal(res.list.length, 3);
    for (const item of res.list) {
      assert.ok(item.imageUrl.startsWith(CDN));
      assert.match(item.link, /\/en\/songs\?album=/);
    }
  });

  await check("season 7 albums are exposed", async () => {
    const res = await extension.getPopular(1);
    const season7 = res.list.filter((item) => /Season 7/.test(item.name));
    assert.equal(season7.length, 1);
    assert.match(season7[0].description, /^2 titres/);
  });

  await check("cards provide titles, authors and years", async () => {
    const res = await extension.getPopular(1);
    assert.equal(res.list[0].name, "Season 7 Opening — Miraculous Corp. (2026)");
  });

  await check("search ignores accents", async () => {
    const res = await extension.search("bises a toi", 1);
    assert.equal(res.list.length, 1);
    assert.match(res.list[0].name, /Bises à toi/);
  });

  await check("search looks into track titles", async () => {
    const res = await extension.search("vampigami", 1);
    assert.equal(res.list.length, 1);
  });

  await check("the collection filter narrows the results", async () => {
    const all = await extension.search("a", 1);
    const series = await extension.search("a", 1, [{ name: "Collection", value: "series" }]);
    assert.equal(series.list.length, 2);
    assert.ok(series.list.length < all.list.length);
  });

  await check("custom lists are served per collection", async () => {
    const movies = await extension.getCustomList("movies", 1);
    assert.equal(movies.list.length, 1);
    assert.match(movies.list[0].name, /The Movie/);
  });
}

console.log("miraculum — album detail (offline fixtures)");
{
  const { extension } = loadExtension(offlineHandler);

  await check("detail returns one chapter per track", async () => {
    const detail = await extension.getDetail("https://miraculous.now/en/songs?album=series_S7_intro");
    assert.equal(detail.name, "Season 7 Opening");
    assert.equal(detail.chapters.length, 2);
    assert.equal(detail.chapters[0].url, `${CDN}/series_S7_intro/ar.m4a`);
  });

  await check("audio paths are URL-encoded", async () => {
    const detail = await extension.getDetail("https://miraculous.now/en/songs?album=series_608_bises_a_toi");
    assert.equal(detail.chapters[0].url, `${CDN}/series_608_bises_a_toi/bises_a_toi_en.m4a`);
  });

  await check("a missing album degrades without throwing", async () => {
    const detail = await extension.getDetail("https://miraculous.now/en/songs?album=inconnu");
    assert.equal(detail.chapters.length, 0);
    assert.match(detail.description, /introuvable/);
  });

  await check("getVideoList returns the audio stream", async () => {
    const list = await extension.getVideoList(`${CDN}/series_S7_intro/en.m4a`);
    assert.equal(list.length, 1);
    assert.equal(list[0].quality, "Audio");
    assert.equal(list[0].originalUrl, list[0].url);
  });
}

console.log("miraculum — multilingual albums (offline fixtures)");
{
  const { extension } = loadExtension(offlineHandler, { mirkm_lang: "en" });

  await check("lang.* placeholders use a language that exists", async () => {
    const detail = await extension.getDetail("https://miraculous.now/en/songs?album=movie");
    assert.equal(detail.chapters.length, 1);
    assert.match(detail.chapters[0].url, /\/movie\/if_i_believed_in_me\/fr\.flac$/);
  });

  await check("track titles follow the selected language", async () => {
    const detail = await extension.getDetail("https://miraculous.now/en/songs?album=movie");
    assert.equal(detail.chapters[0].name, "If I Believed in Me");
  });

  await check("the chosen language is reported in the description", async () => {
    const detail = await extension.getDetail("https://miraculous.now/en/songs?album=movie");
    assert.match(detail.description, /Français · 4 langues/);
  });
}

if (process.env.SKIP_LIVE === "1") {
  console.log("\nlive checks skipped (SKIP_LIVE=1)");
} else {
  console.log("miraculum — live site");
  const liveClient = {
    async get(url, headers = {}) {
      const res = await fetch(url, { headers, redirect: "follow" });
      return { statusCode: res.status, body: await res.text() };
    },
    async head(url, headers = {}) {
      const res = await fetch(url, { method: "HEAD", headers, redirect: "follow" });
      return { statusCode: res.status, body: "" };
    },
  };
  const { extension } = loadExtension((url, headers, method) => {
    if (method === "HEAD") return liveClient.head(url, headers);
    return liveClient.get(url, headers);
  });

  await check("the catalogue loads from the site", async () => {
    const res = await extension.getPopular(1);
    assert.ok(res.list.length >= 10, `only ${res.list.length} albums`);
  });

  await check("season 7 albums exist", async () => {
    const res = await extension.getPopular(1);
    assert.ok(res.list.some((item) => /Season 7/.test(item.name)));
  });

  await check("a season 7 track is playable", async () => {
    const res = await extension.getPopular(1);
    const season7 = res.list.find((item) => /Season 7/.test(item.name));
    const detail = await extension.getDetail(season7.link);
    assert.ok(detail.chapters.length > 0);
    const videos = await extension.getVideoList(detail.chapters[0].url);
    assert.equal(videos[0].quality, "Audio");
    const head = await liveClient.head(videos[0].url);
    assert.equal(head.statusCode, 200);
  });

  await check("search finds an album by title", async () => {
    const res = await extension.search("movie", 1);
    assert.ok(res.list.length > 0);
  });
}

if (failures > 0) {
  console.error(`\n${failures} check(s) failed`);
  process.exit(1);
}
console.log("\nAll miraculum checks passed");
