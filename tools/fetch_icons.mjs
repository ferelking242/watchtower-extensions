// Replace placeholder SVG icons with the real site logos/favicons.
// Usage: node tools/fetch_icons.mjs [--only <indexName>] [--limit N] [--concurrency N]
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import https from "node:https";
import http from "node:http";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const ICON_BASE =
  "https://raw.githubusercontent.com/ferelking242/watchtower-extensions/main/";
const KEI_INDEX =
  "https://raw.githubusercontent.com/keiyoushi/extensions/repo/index.json";
const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36";
const TIMEOUT_MS = 12000;

const args = process.argv.slice(2);
const arg = (name, def) => {
  const i = args.indexOf(name);
  return i === -1 ? def : args[i + 1];
};
const ONLY = arg("--only", null);
const LIMIT = parseInt(arg("--limit", "0"), 10) || 0;
const CONC = parseInt(arg("--concurrency", "12"), 10);
const VERBOSE = args.includes("--verbose");

// Payload lengths served with HTTP 200 by favicon proxies when they have no icon.
const GENERIC_LENGTHS = new Set([70, 726, 1478]);

// Built-in integrations carry no baseUrl in the index; map them to their site.
const KNOWN_HOSTS = {
  spotify: "open.spotify.com",
  "apple music": "music.apple.com",
  deezer: "www.deezer.com",
  "youtube music": "music.youtube.com",
  musicbrainz: "musicbrainz.org",
};

function hostOf(url) {
  try {
    return new URL(url).host;
  } catch {
    return null;
  }
}

// Some sources sit behind hosts whose TLS is unreachable from CI (self-signed or
// filtered). Use a permissive request so a logo can still be recovered.
function request(url, { redirects = 5 } = {}) {
  return new Promise((resolve) => {
    const go = (u, n) => {
      let parsed;
      try {
        parsed = new URL(u);
      } catch {
        return resolve({ err: "bad url" });
      }
      if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
        return resolve({ err: "bad protocol" });
      }
      const mod = parsed.protocol === "http:" ? http : https;
      let req;
      try {
        req = mod.get(
          u,
          {
            headers: { "User-Agent": UA, Accept: "*/*" },
            rejectUnauthorized: false,
            timeout: TIMEOUT_MS,
          },
          (res) => {
            const loc = res.headers.location;
            if ([301, 302, 303, 307, 308].includes(res.statusCode) && loc && n > 0) {
              res.resume();
              return go(new URL(loc, u).href, n - 1);
            }
            const chunks = [];
            res.on("data", (c) => chunks.push(c));
            res.on("end", () =>
              resolve({
                status: res.statusCode,
                ct: res.headers["content-type"] || "",
                buf: Buffer.concat(chunks),
                url: u,
              }),
            );
          },
        );
      } catch (e) {
        return resolve({ err: e.message });
      }
      req.on("error", (e) => resolve({ err: e.message }));
      req.on("timeout", () => {
        req.destroy();
        resolve({ err: "timeout" });
      });
    };
    go(url, redirects);
  });
}

function sniffExt(buf, ct) {
  if (!buf || !buf.length) return null;
  if (buf.length >= 4) {
    if (buf[0] === 0x89 && buf[1] === 0x50) return "png";
    if (buf[0] === 0xff && buf[1] === 0xd8) return "jpg";
    if (buf.slice(0, 3).toString("latin1") === "GIF") return "gif";
    if (buf.slice(0, 4).toString("latin1") === "RIFF") return "webp";
    if (buf[0] === 0x00 && buf[1] === 0x00) return "ico";
  }
  const head = buf.slice(0, 400).toString("utf8").trim().toLowerCase();
  if (head.includes("<svg")) return "svg";
  // A page body is never an icon, even when the server mislabels its type.
  if (head.startsWith("<") || head.startsWith("<!doctype")) return null;
  const c = (ct || "").toLowerCase();
  for (const k of ["png", "jpeg", "jpg", "svg", "webp", "icon", "ico", "gif"]) {
    if (c.includes(k)) return k === "jpeg" ? "jpg" : k;
  }
  return null;
}

function isUsable(r) {
  return (
    r &&
    !r.err &&
    r.status === 200 &&
    r.buf &&
    r.buf.length > 200 &&
    !GENERIC_LENGTHS.has(r.buf.length) &&
    sniffExt(r.buf, r.ct) !== null
  );
}

function bestIconFromHtml(html, base) {
  const links = [...html.matchAll(/<link\b[^>]*>/gi)].map((m) => m[0]);
  let best = null;
  let bestScore = -1;
  for (const tag of links) {
    const rel = (tag.match(/rel=["']([^"']+)["']/i) || [])[1] || "";
    if (!/icon/i.test(rel)) continue;
    const href = (tag.match(/href=["']([^"']+)["']/i) || [])[1];
    if (!href) continue;
    const sizes = (tag.match(/sizes=["']([^"']+)["']/i) || [])[1] || "";
    let score = 1;
    if (/apple-touch-icon/i.test(rel)) score = 3;
    const m = sizes.match(/(\d+)x(\d+)/);
    if (m) score = Math.max(score, parseInt(m[1], 10));
    if (/\.svg/i.test(href)) score += 500;
    if (score > bestScore) {
      bestScore = score;
      try {
        best = new URL(href, base).href;
      } catch {
        best = href;
      }
    }
  }
  return best;
}

function ogImageFromHtml(html, base) {
  const m =
    html.match(/<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i) ||
    html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:image["']/i);
  if (!m) return null;
  try {
    return new URL(m[1], base).href;
  } catch {
    return m[1];
  }
}

// Real launcher logos published by keiyoushi (Tachiyomi/Mihon extension repo).
async function loadKeiyoushi() {
  const cache = path.join(os.tmpdir(), "watchtower-keiyoushi-index.json");
  let raw;
  if (fs.existsSync(cache)) {
    raw = fs.readFileSync(cache, "utf8");
  } else {
    const got = await request(KEI_INDEX);
    if (!got || got.err || got.status !== 200) return { byHost: new Map(), byName: new Map() };
    raw = got.buf.toString("utf8");
    fs.writeFileSync(cache, raw);
  }
  let list;
  try {
    list = JSON.parse(raw).extensionList.extensions;
  } catch {
    return { byHost: new Map(), byName: new Map() };
  }
  const norm = (s) => (s || "").toLowerCase().replace(/[^a-z0-9]/g, "");
  const byHost = new Map();
  const byName = new Map();
  for (const e of list) {
    const icon = e.resources && e.resources.iconUrl;
    if (!icon) continue;
    byName.set(norm(e.name), icon);
    for (const s of e.sources || []) {
      byName.set(norm(s.name), icon);
      const h = s.homeUrl;
      if (!h) continue;
      try {
        byHost.set(new URL(h).host.replace(/^www\./, "").toLowerCase(), icon);
      } catch {
        /* ignore malformed homeUrl */
      }
    }
  }
  return { byHost, byName };
}

async function resolveIcon(baseUrl, name, kei) {
  const host = hostOf(baseUrl) || KNOWN_HOSTS[(name || "").toLowerCase()] || null;
  if (!host) return null;
  let origin;
  try {
    origin = new URL(baseUrl).origin;
  } catch {
    origin = `https://${host}`;
  }

  const candidates = [];
  const home = await request(baseUrl || origin);
  if (
    home &&
    !home.err &&
    home.buf &&
    home.buf.slice(0, 600).toString("utf8").toLowerCase().includes("<html")
  ) {
    const html = home.buf.toString("utf8");
    if (home.url) {
      try {
        origin = new URL(home.url).origin;
      } catch {
        /* keep original origin */
      }
    }
    const declared = bestIconFromHtml(html, baseUrl || origin);
    if (declared) candidates.push(declared);
    const og = ogImageFromHtml(html, baseUrl || origin);
    if (og) candidates.push(og);
  }
  candidates.push(
    `${origin}/favicon.ico`,
    `${origin}/favicon.png`,
    `${origin}/apple-touch-icon.png`,
    // Real logos from keiyoushi, matched by host then by extension name.
    kei.byHost.get(host.replace(/^www\./, "").toLowerCase()),
    kei.byName.get((name || "").toLowerCase().replace(/[^a-z0-9]/g, "")),
    // Favicon aggregators cover hosts whose own TLS is unreachable from CI.
    `https://favicon.yandex.com/favicon/${host}?size=120`,
    `https://favicon.yandex.net/favicon/${host}?size=120`,
    `https://t2.gstatic.com/faviconV2?client=SOCIAL&type=FAVICON&fallback_opts=TYPE,SIZE,URL&url=https://${host}&size=128`,
  );
  if (origin.startsWith("https://")) {
    const plain = origin.replace(/^https:/, "http:");
    candidates.push(`${plain}/favicon.ico`, `${plain}/apple-touch-icon.png`);
  }

  for (const url of candidates) {
    if (!url) continue;
    const got = await request(url);
    if (isAcceptable(got)) return { ...got, from: url };
    if (VERBOSE && got && !got.err) {
      console.log(`    - ${host}: reject ${got.status} len=${got.buf?.length} ${url.slice(0, 70)}`);
    }
  }
  // Last resort: the Wayback Machine's archived icon for dead/filtered hosts.
  const wb = await resolveWayback(host);
  if (wb) return wb;
  return null;
}

// isUsable plus shape/placeholder guards, so a banner or the repo's own
// placeholder SVG can never overwrite a real logo.
function isAcceptable(got) {
  if (!isUsable(got)) return false;
  const ext = sniffExt(got.buf, got.ct);
  if (ext === "svg" && isPlaceholderSvgBuffer(got.buf)) return false;
  return hasSquareIcon(got.buf, ext);
}

// Archived icons for dead or CI-filtered hosts. The CDX API surfaces every
// snapshot whose URL looks like a favicon, which the /available endpoint misses.
async function resolveWayback(host) {
  const bare = host.replace(/^www\./, "");
  for (const h of [bare, `www.${bare}`]) {
    const url =
      `http://web.archive.org/cdx/search/cdx?url=${encodeURIComponent(h)}/*` +
      `&output=json&filter=statuscode:200&filter=mimetype:image/.*` +
      `&filter=original:.*favicon.*&collapse=urlkey&limit=50`;
    const r = await request(url);
    if (!r || r.err || r.status !== 200) continue;
    let rows;
    try {
      rows = JSON.parse(r.buf.toString("utf8"));
    } catch {
      continue;
    }
    if (!Array.isArray(rows) || rows.length < 2) {
      if (VERBOSE) console.log(`    ~ wayback ${h}: cdx rows=${Array.isArray(rows) ? rows.length - 1 : "?"}`);
      continue;
    }
    const hdr = rows[0];
    const snaps = rows
      .slice(1)
      .map((row) => Object.fromEntries(hdr.map((k, i) => [k, row[i]])))
      .sort((a, b) => (b.length || 0) - (a.length || 0))
      .slice(0, 4);
    for (const s of snaps) {
      const wurl = `http://web.archive.org/web/${s.timestamp}id_/${s.original}`;
      const got = await request(wurl);
      if (isUsable(got)) return { ...got, from: `wayback:${s.original}` };
      if (VERBOSE) console.log(`    ~ wayback ${s.original}: ${got.err || got.status} len=${got.buf?.length}`);
    }
  }
  return null;
}

// Square-enough raster icon: reject banners, hero images and thumbnails that
// some CDX snapshots return when no dedicated favicon was archived.
function iconDims(buf, ext) {
  try {
    if (ext === "png" && buf.slice(0, 8).toString("hex") === "89504e470d0a1a0a") {
      return [buf.readUInt32BE(16), buf.readUInt32BE(20)];
    }
    if (ext === "ico") {
      const n = buf.readUInt16LE(4);
      if (n >= 1) return [buf[6] || 256, buf[7] || 256];
    }
    if (ext === "gif" && buf.slice(0, 3).toString("latin1") === "GIF") {
      return [buf.readUInt16LE(6), buf.readUInt16LE(8)];
    }
  } catch {
    return null;
  }
  return null;
}

function hasSquareIcon(buf, ext) {
  const d = iconDims(buf, ext);
  if (!d) return true; // jpg/webp/svg: shape checked elsewhere
  const [w, h] = d;
  return w >= 32 && h >= 32 && w <= 512 && h <= 512 && Math.max(w, h) / Math.min(w, h) <= 1.35;
}

function isPlaceholderSvgBuffer(buf) {
  const t = buf.toString("utf8").slice(0, 1200);
  return t.includes("linearGradient") && t.includes("aria-label=");
}

function isPlaceholderSvg(p) {
  try {
    const t = fs.readFileSync(p, "utf8").slice(0, 1200);
    return (
      t.includes("aria-label=") &&
      t.includes('linearGradient id="g"') &&
      t.includes('width="512" height="512"')
    );
  } catch {
    return false;
  }
}

const indexFiles = fs
  .readdirSync(path.join(ROOT, "index"))
  .filter((f) => f.endsWith(".json") && f !== "plugins.json")
  .filter((f) => !ONLY || f === `${ONLY}.json`);

let targets = [];
for (const f of indexFiles) {
  const type = f.replace(/\.json$/, "");
  const entries = JSON.parse(fs.readFileSync(path.join(ROOT, "index", f), "utf8"));
  if (!Array.isArray(entries)) continue;
  for (const e of entries) {
    const iconUrl = typeof e.iconUrl === "string" ? e.iconUrl : "";
    if (!iconUrl.startsWith(ICON_BASE + "assets/icons/")) continue;
    const assetRel = iconUrl.slice(ICON_BASE.length);
    const assetPath = path.join(ROOT, assetRel);
    if (!assetPath.endsWith(".svg") || !isPlaceholderSvg(assetPath)) continue;
    targets.push({ type, file: f, entry: e, assetRel, assetPath });
  }
}
if (LIMIT) targets = targets.slice(0, LIMIT);

const kei = await loadKeiyoushi();
console.log(
  `Replacing ${targets.length} SVG icons (concurrency ${CONC}, keiyoushi hosts=${kei.byHost.size})...`,
);

let done = 0;
let ok = 0;
let failed = 0;
const changesByFile = {};

async function worker(item) {
  const { type, entry, assetRel, assetPath } = item;
  let got = null;
  try {
    const base = entry.baseUrl || entry.apiUrl || "";
    got = await resolveIcon(base, entry.name, kei);
  } catch (e) {
    if (VERBOSE) console.log(`  ! ${entry.name} [${entry.id}]: ${e.message}`);
  }
  done++;
  if (!got) {
    failed++;
    if (done % 25 === 0) console.log(`  ${done}/${targets.length} ok=${ok} failed=${failed}`);
    return;
  }
  const ext = sniffExt(got.buf, got.ct);
  const newRel = `assets/icons/${type}-${entry.id}.${ext}`;
  fs.writeFileSync(path.join(ROOT, newRel), got.buf);
  if (newRel !== assetRel && fs.existsSync(assetPath)) fs.unlinkSync(assetPath);
  entry.iconUrl = ICON_BASE + newRel;
  (changesByFile[item.file] ||= []).push({ id: entry.id, name: entry.name, rel: newRel, from: got.from });
  ok++;
  if (VERBOSE) console.log(`  + ${entry.name} [${entry.id}] -> ${newRel} (from ${got.from})`);
  if (done % 25 === 0) console.log(`  ${done}/${targets.length} ok=${ok} failed=${failed}`);
}

const queue = [...targets];
await Promise.all(
  Array.from({ length: CONC }, async () => {
    while (queue.length) await worker(queue.shift());
  }),
);

for (const f of Object.keys(changesByFile)) {
  const p = path.join(ROOT, "index", f);
  const entries = JSON.parse(fs.readFileSync(p, "utf8"));
  const byId = new Map(changesByFile[f].map((c) => [c.id, c.rel]));
  for (const e of entries) {
    if (byId.has(e.id)) e.iconUrl = ICON_BASE + byId.get(e.id);
  }
  fs.writeFileSync(p, JSON.stringify(entries, null, 2) + "\n");
}

console.log(`\nDone. replaced=${ok} failed=${failed} total=${targets.length}`);
for (const f of Object.keys(changesByFile)) {
  console.log(`  ${f}: ${changesByFile[f].length} icon(s)`);
}
