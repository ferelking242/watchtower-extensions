// MLP France — parsing and media checks.
// Fixture tests run offline; live tests hit the site (SKIP_LIVE=1 to skip).
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const sourcePath = path.join(root, "src/watch/fr/mlpfrance.js");

const SEASON_HTML = `<!DOCTYPE HTML><html><head>
<title>MLP France - Saison 1 de My Little Pony: Friendship is Magic</title></head><body>
<div class="page"><img src="../source/bansaison1.png" width="960" />
<ul class="flex">
  <li class="list3"><img src="../source/miniep001.png"/>
    <br><b>Episode 1</b><br>Friendship is Magic, part 1<br>
    <a href="saison1/vo.php?ep=01" class="link">VOSTFR</a> &nbsp;
    <a href="saison1/vf.php?ep=01" class="link">VF</a></li>
  <li class="list3"><img src="../source/miniep002.png"/>
    <br><b>Episode 2</b><br>Friendship is Magic, part 2<br>
    <a href="saison1/vo.php?ep=02" class="link">VOSTFR</a> &nbsp;
    <a href="saison1/vf.php?ep=02" class="link">VF</a></li>
</ul></div></body></html>`;

const PONY_LIFE_HTML = `<!DOCTYPE HTML><html><head>
<title>MLP France - My Little Pony Pony Life</title></head><body>
<span class="large"><b>SAISON 1</b></span>
<ul class="flex">
  <li class="list3"><img src="../source/minipl01.png"/> <br><b>Episode 01</b><br>Princess Probz<br>
    <a href="ponylife/vo.php?ep=01" class="link">VOSTFR</a> &nbsp;
    <a href="ponylife/vf.php?ep=01" class="link">VF</a></li>
</ul>
<span class="large"><b>SAISON 2</b></span>
<ul class="flex">
  <li class="list3"><img src="../source/minipl02.png"/> <br><b>Episode 01</b><br>Too Hot To Handle<br>
    <a href="ponylife/vo.php?ep=41" class="link">VOSTFR</a> &nbsp;
    <a href="ponylife/vf.php?ep=41" class="link">VF</a></li>
</ul></body></html>`;

const FILM_HTML = `<!DOCTYPE HTML><html><head>
<title>MLP France - Equestria Girls</title></head><body>
<ul class="flex">
  <li class="list4"></li>
  <li class="list4"><a href="eqg/eqg.php?ep=EN"><img src="../source/english.png" height="100" /></a>
    <p><b><a href="eqg/eqg.php?ep=EN" class="link">ENGLISH</a></b></p></li>
  <li class="list4"><a href="eqg/eqg.php?ep=FR"><img src="../source/french.png" height="100" /></a>
    <p><b><a href="eqg/eqg.php?ep=FR" class="link">FRANÇAIS</a></b></p></li>
  <li class="list4"><a href="dl.php" class="link">PAGE DE TÉLÉCHARGEMENTS</a></li>
  <li class="list1"><a href="http://www.amazon.fr/dp/B00H4I6118/" class="link">AMAZON</a></li>
  <li class="list1"><a href="MLPMovieST-2018-01-05.zip" class="link">Télécharger</a></li>
</ul></body></html>`;

const VF_PLAYER = `<!DOCTYPE HTML><html><body>
<div id="makamour"></div>
<script>
var player = new NPlayer(document.querySelector('#makamour'), {
  'mp4': {
    '720p': 'https://mlpfr.ponies.fr/rarity/VF01-1_720p.mp4',
    '480p': 'https://mlpfr.ponies.fr/rarity/VF01-1_480p.mp4',
    '360p': 'https://mlpfr.ponies.fr/rarity/VF01-1_360p.mp4'
  },
  'webm': { '720p': 'https://mlpfr.ponies.fr/rarity/VF01-1_720p.webm' },
  'defaultQuality': '480p'
});
</script>
<div class="switch"><p><a href="vo.php?ep=01" class="link">PASSER EN ANGLAIS</a></p>
<p><a href="vf.php?ep=02" class="link">ÉPISODE SUIVANT →</a></p></div>
</body></html>`;

const VO_PLAYER = `<!DOCTYPE HTML><html><body>
<script>
var player = new NPlayer(document.querySelector('#makamour'), {
  'mp4': {
    '720p': 'https://mlpfr.ponies.fr/rarity/VO01-1_720p.mp4',
    '480p': 'https://mlpfr.ponies.fr/rarity/VO01-1_480p.mp4'
  }
});
</script>
<div class="switch"><p><a href="vf.php?ep=01" class="link">PASSER EN FRANÇAIS</a></p></div>
</body></html>`;

function loadExtension(handler, prefs = {}) {
  const calls = [];
  class Client {
    constructor(options) { this.options = options; }
    async get(url, headers = {}) {
      calls.push({ url, headers });
      return handler(url, headers);
    }
  }
  // Le runtime applicatif ne fournit que `SharedPreferences` : y ajouter un
  // `getPreference` masquerait le plantage qui cassait toutes les fiches.
  class MProvider {}
  class SharedPreferences {
    get(key) { return key in prefs ? String(prefs[key]) : ""; }
    getString(key, fallback) { return key in prefs ? String(prefs[key]) : fallback; }
    setString() { return true; }
  }
  const sandbox = {
    Client, MProvider, SharedPreferences, console, setTimeout, clearTimeout, Promise,
    JSON, Date, Math, String, Number, Array, Object, RegExp, Error,
    parseInt, parseFloat, isNaN, decodeURIComponent, encodeURIComponent,
  };
  sandbox.globalThis = sandbox;
  vm.createContext(sandbox);
  vm.runInContext(
    fs.readFileSync(sourcePath, "utf8") +
      "\n;this.Extension = DefaultExtension; this.sources = watchtowerSources;",
    sandbox,
    { filename: sourcePath, timeout: 10000 }
  );
  return { extension: new sandbox.Extension(), calls, sources: sandbox.sources };
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

console.log("mlpfrance — manifest");
{
  const { sources } = loadExtension(() => ({ statusCode: 200, body: "" }));
  await check("manifest is complete", async () => {
    const s = sources[0];
    assert.equal(s.name, "MLP France");
    assert.equal(s.baseUrl, "https://mlp-france.com");
    assert.equal(s.pkgPath, "watch/fr/mlpfrance.js");
    assert.equal(s.lang, "fr");
    assert.equal(s.login, false);
    assert.equal(s.hasDub, true);
    assert.match(s.iconUrl, /assets\/icons\/watch-841627593\.png$/);
    assert.ok(s.version);
  });
}

console.log("mlpfrance — catalogue (offline fixtures)");
{
  const { extension } = loadExtension((url) => {
    if (url.endsWith("/episodes/saison1.php")) return { statusCode: 200, body: SEASON_HTML };
    if (url.endsWith("/episodes/ponylife.php")) return { statusCode: 200, body: PONY_LIFE_HTML };
    if (url.endsWith("/films/eqg.php")) return { statusCode: 200, body: FILM_HTML };
    if (url.endsWith("/episodes/saison1/vf.php?ep=01")) return { statusCode: 200, body: VF_PLAYER };
    if (url.endsWith("/episodes/saison1/vo.php?ep=01")) return { statusCode: 200, body: VO_PLAYER };
    if (url.endsWith("/episodes/saison1/vf.php?ep=02")) {
      return { statusCode: 200, body: VF_PLAYER.replace(/VF01-1/g, "VF02-1") };
    }
    return { statusCode: 404, body: "" };
  });

  await check("every rail the layout asks for is populated", async () => {
    for (const id of ["films", "fim", "g5", "eqg", "ova", "retro", "star", "luz", "lps", "cartoons", "all", "seasons", "latest"]) {
      const res = await extension.getCustomList(id, 1);
      assert.ok(res.list.length > 0, `rail ${id} is empty`);
      if (res.list.length < 24) {
        assert.equal(res.hasNextPage, false, `rail ${id} claims a next page`);
      }
    }
  });

  await check("seasons grid holds S1–S9 without Pony Life", async () => {
    const res = await extension.getCustomList("seasons", 1);
    assert.equal(res.list.length, 9);
    assert.match(res.list[0].name, /Saison 1/);
    assert.match(res.list[8].name, /Saison 9/);
  });

  await check("cards carry a composed 16:9 cover and an absolute link", async () => {
    const res = await extension.getCustomList("films", 1);
    assert.equal(
      res.list[0].imageUrl,
      "https://raw.githubusercontent.com/ferelking242/watchtower-extensions/main/assets/covers/mlpfrance/mlpnewgen.jpg"
    );
    assert.equal(res.list[0].link, "https://mlp-france.com/mlpg5/mlpnewgen.php");
    const all = await extension.getCustomList("all", 1);
    for (const item of all.list) {
      assert.match(item.imageUrl, /assets\/covers\/mlpfrance\/[a-z0-9]+\.jpg$/, `bad cover for ${item.name}`);
    }
  });

  await check("the cartoons are split into one rail per show", async () => {
    const names = async (id) => (await extension.getCustomList(id, 1)).list.map((i) => i.name);
    const star = await names("star");
    const luz = await names("luz");
    const lps = await names("lps");
    const cartoons = await names("cartoons");
    assert.equal(star.length, 4);
    assert.equal(luz.length, 4);
    assert.equal(lps.length, 4);
    assert.equal(cartoons.length, 12);
    assert.ok(star.every((n) => /^Star VS/.test(n)));
    assert.ok(luz.every((n) => /^Luz à Osville/.test(n)));
    assert.ok(lps.every((n) => /^Littlest Pet Shop/.test(n)));
  });

  await check("recommendations come from the same collection", async () => {
    const res = await extension.getRecommendations("https://mlp-france.com/episodes/saison4.php");
    assert.equal(res.length, 12);
    assert.ok(!res.some((i) => i.link.endsWith("/episodes/saison4.php")), "recommended itself");
    assert.ok(res.slice(0, 9).every((i) => /Saison|Pony Life/.test(i.name)), "same collection first");
  });

  await check("search matches names, keywords and ignores accents", async () => {
    const byName = await extension.search("saison 7", 1, null);
    assert.ok(byName.list.some((i) => /Saison 7/.test(i.name)), "no season 7");
    const byKeyword = await extension.search("osville", 1, null);
    assert.equal(byKeyword.list.length, 4, `saw ${byKeyword.list.length}`);
    const byGroup = await extension.search("retro", 1, [{ name: "Collection", value: "retro" }]);
    assert.ok(byGroup.list.length === 3, `saw ${byGroup.list.length}`);
  });

  await check("an empty query returns nothing instead of the whole catalogue", async () => {
    const res = await extension.search("   ", 1, null);
    assert.equal(res.list.length, 0);
  });

  await check("season detail lists one chapter per episode", async () => {
    const res = await extension.getDetail("https://mlp-france.com/episodes/saison1.php");
    assert.equal(res.name, "MLP FiM — Saison 1");
    assert.equal(res.chapters.length, 2);
    assert.equal(res.chapters[0].name, "Episode 1 — Friendship is Magic, part 1");
    assert.match(res.chapters[0].url, /saison1\/vf\.php\?ep=01$/);
    assert.match(res.chapters[0].thumbnailUrl, /miniep001\.png$/);
    assert.equal(res.chapters[0].description, "VOSTFR · VF");
  });

  await check("the reading language comes from SharedPreferences", async () => {
    const vf = await extension.getDetail("https://mlp-france.com/episodes/saison1.php");
    assert.match(vf.chapters[0].url, /saison1\/vf\.php\?ep=01$/);
  });

  await check("multi-season pages prefix the season", async () => {
    const res = await extension.getDetail("https://mlp-france.com/episodes/ponylife.php");
    assert.equal(res.chapters.length, 2);
    assert.match(res.chapters[0].name, /^S1 · Episode 01 — Princess Probz/);
    assert.match(res.chapters[1].name, /^S2 · Episode 01 — Too Hot To Handle/);
  });

  await check("film detail exposes one chapter per language and drops shops", async () => {
    const res = await extension.getDetail("https://mlp-france.com/films/eqg.php");
    assert.equal(res.chapters.length, 2, `saw ${res.chapters.length}`);
    assert.equal(res.chapters[0].name, "EqG — Equestria Girls (2013) — FRANÇAIS");
    assert.equal(res.chapters[1].name, "EqG — Equestria Girls (2013) — ENGLISH");
    assert.ok(res.chapters.every((c) => /eqg\.php\?ep=/.test(c.url)));
    assert.ok(res.chapters.every((c) => /covers\/mlpfrance\/eqgfilm\.jpg$/.test(c.thumbnailUrl)));
  });

  await check("a page that never answers yields an explicit empty detail", async () => {
    const res = await extension.getDetail("https://mlp-france.com/episodes/saison2.php");
    assert.equal(res.chapters.length, 0);
    assert.match(res.description, /n'a pas répondu/);
  });

  await check("player lists VF and VOSTFR renditions", async () => {
    const res = await extension.getVideoList("https://mlp-france.com/episodes/saison1/vf.php?ep=01");
    const labels = res.map((v) => v.quality);
    assert.equal(labels.join(" | "), [
      "VF · 720p", "VF · 480p", "VF · 360p",
      "VOSTFR · 720p", "VOSTFR · 480p",
    ].join(" | "));
    assert.equal(res[0].url, "https://mlpfr.ponies.fr/rarity/VF01-1_720p.mp4");
    assert.equal(res[0].originalUrl, res[0].url);
    assert.equal(res[0].headers.Referer, "https://mlp-france.com/episodes/saison1/vf.php?ep=01");
    assert.ok(res.every((v) => !/VF02-1/.test(v.url)), "next-episode page leaked into the list");
  });

  await check("a dead player page falls back to the web view", async () => {
    const res = await extension.getVideoList("https://mlp-france.com/episodes/saison3/vf.php?ep=99");
    assert.equal(res.length, 1);
    assert.equal(res[0].quality, "WebView");
  });
}

console.log("mlpfrance — preferences");
{
  const { extension } = loadExtension(
    (url) => {
      if (url.endsWith("/episodes/saison1.php")) return { statusCode: 200, body: SEASON_HTML };
      if (url.endsWith("/episodes/saison1/vf.php?ep=01")) return { statusCode: 200, body: VF_PLAYER };
      return { statusCode: 404, body: "" };
    },
    { mlp_lang: "vo" }
  );

  await check("the VOSTFR preference opens the vo.php page", async () => {
    const res = await extension.getDetail("https://mlp-france.com/episodes/saison1.php");
    assert.match(res.chapters[0].url, /saison1\/vo\.php\?ep=01$/);
    assert.equal(res.chapters[0].description, "VOSTFR · VF");
  });

  await check("a missing preference falls back to VF", async () => {
    const { extension: plain } = loadExtension((url) => {
      if (url.endsWith("/episodes/saison1.php")) return { statusCode: 200, body: SEASON_HTML };
      return { statusCode: 404, body: "" };
    });
    const res = await plain.getDetail("https://mlp-france.com/episodes/saison1.php");
    assert.match(res.chapters[0].url, /saison1\/vf\.php\?ep=01$/);
  });

  await check("a runtime without SharedPreferences still opens a detail", async () => {
    const calls = [];
    class Client {
      async get(url) {
        calls.push(url);
        if (url.endsWith("/episodes/saison1.php")) return { statusCode: 200, body: SEASON_HTML };
        return { statusCode: 404, body: "" };
      }
    }
    const bare = { Client, MProvider: class {}, console, setTimeout, Promise, JSON, Date, Math, String, Number, Array, Object, RegExp, Error, parseInt, isNaN };
    bare.globalThis = bare;
    vm.createContext(bare);
    vm.runInContext(fs.readFileSync(sourcePath, "utf8") + "\n;this.Extension = DefaultExtension;", bare, { filename: sourcePath });
    const res = await new bare.Extension().getDetail("https://mlp-france.com/episodes/saison1.php");
    assert.equal(res.chapters.length, 2);
    assert.match(res.chapters[0].url, /saison1\/vf\.php\?ep=01$/);
  });
}

if (process.env.SKIP_LIVE === "1") {
  console.log("\nlive checks skipped (SKIP_LIVE=1)");
} else {
  console.log("mlpfrance — live site");
  const liveClient = {
    async get(url, headers = {}) {
      const res = await fetch(url, { headers, redirect: "follow" });
      return { statusCode: res.status, body: await res.text() };
    },
  };
  const { extension } = loadExtension((url, headers) => liveClient.get(url, headers));
  let reachable = true;

  await check("home page answers", async () => {
    const res = await liveClient.get("https://mlp-france.com/accueil.php");
    if (res.statusCode >= 400) {
      reachable = false;
      throw new Error(`HTTP ${res.statusCode}`);
    }
    assert.ok(res.body.includes("MLP France"));
  });

  if (reachable) {
    await check("season 1 exposes its 26 episodes", async () => {
      const res = await extension.getDetail("https://mlp-france.com/episodes/saison1.php");
      assert.equal(res.chapters.length, 26, `saw ${res.chapters.length}`);
      assert.match(res.chapters[0].name, /Episode 1/);
    });

    await check("season 9 is reachable too", async () => {
      const res = await extension.getDetail("https://mlp-france.com/episodes/saison9.php");
      assert.ok(res.chapters.length >= 20, `saw ${res.chapters.length}`);
    });

    await check("film page lists its language tracks", async () => {
      const res = await extension.getDetail("https://mlp-france.com/films/mlp2017.php");
      const labels = res.chapters.map((c) => c.name.split("—").pop().trim());
      assert.ok(labels.includes("ENGLISH"), `saw ${labels.join(", ")}`);
      assert.ok(labels.some((l) => /FRAN/.test(l)), `saw ${labels.join(", ")}`);
    });

    await check("episode plays in VF and VOSTFR", async () => {
      const res = await extension.getVideoList("https://mlp-france.com/episodes/saison1/vf.php?ep=01");
      const labels = res.map((v) => v.quality);
      assert.ok(labels.some((l) => l.startsWith("VF")), `saw ${labels.join(", ")}`);
      assert.ok(labels.some((l) => l.startsWith("VOSTFR")), `saw ${labels.join(", ")}`);
      const mp4 = res.find((v) => /\.mp4$/.test(v.url));
      assert.ok(mp4, "no mp4");
      const head = await fetch(mp4.url, { method: "HEAD", headers: { "User-Agent": "Mozilla/5.0" } });
      assert.ok(head.status < 400, `mp4 HEAD ${head.status}`);
    });

    await check("retro G2 episode plays its single track", async () => {
      const detail = await extension.getDetail("https://mlp-france.com/retro/g2.php");
      assert.ok(detail.chapters.length > 0, "no chapters");
      const res = await extension.getVideoList(detail.chapters[0].url);
      assert.ok(res.some((v) => /\.(mp4|webm)$/.test(v.url)), JSON.stringify(res.map((v) => v.quality)));
    });
  }
}

if (failures) {
  console.log(`\n${failures} check(s) failed`);
  process.exit(1);
}
console.log("\nAll mlpfrance checks passed");
