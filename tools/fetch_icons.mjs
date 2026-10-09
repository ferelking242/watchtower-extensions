// Replace placeholder SVG icons with the real site logos/favicons.
// Usage: node tools/fetch_icons.mjs [--only <indexName>] [--limit N] [--concurrency N]
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const ICON_DIR = path.join(ROOT, "assets", "icons");
const ICON_BASE =
  "https://raw.githubusercontent.com/ferelking242/watchtower-extensions/main/";
const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36";

const args = process.argv.slice(2);
const arg = (name, def) => {
  const i = args.indexOf(name);
  return i === -1 ? def : args[i + 1];
};
const ONLY = arg("--only", null);
const LIMIT = parseInt(arg("--limit", "0"), 10) || 0;
const CONC = parseInt(arg("--concurrency", "12"), 10);

const TIMEOUT_MS = 12000;

function hostOf(url) {
  try {
    return new URL(url).host;
  } catch {
    return null;
  }
}

async function fetchBuf(url, { asText = false } = {}) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(url, {
      redirect: "follow",
      signal: ctrl.signal,
      headers: { "User-Agent": UA, Accept: "*/*" },
    });
    if (!res.ok) return null;
    if (asText) {
      const ct = res.headers.get("content-type") || "";
      if (!/text\/html|application\/xhtml|text\/plain/i.test(ct)) return null;
      return await res.text();
    }
    const ct = res.headers.get("content-type") || "";
    if (/text\/html/i.test(ct)) return null;
    const ab = await res.arrayBuffer();
    return { buf: Buffer.from(ab), ct };
  } catch {
    return null;
  } finally {
    clearTimeout(t);
  }
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
    if (/svg/i.test(href)) score += 500;
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

function sniffExt(buf, ct) {
  if (buf.length >= 4) {
    if (buf[0] === 0x89 && buf[1] === 0x50) return "png";
    if (buf[0] === 0xff && buf[1] === 0xd8) return "jpg";
    if (buf.slice(0, 3).toString("latin1") === "GIF") return "gif";
    if (buf.slice(0, 4).toString("latin1") === "RIFF" && buf.slice(8, 12).toString("latin1") === "WEBP") return "webp";
    if (buf[0] === 0x00 && buf[1] === 0x00 && buf[2] === 0x01) return "ico";
  }
  const head = buf.slice(0, 200).toString("utf8").trim().toLowerCase();
  if (head.startsWith("<svg") || head.includes("<svg")) return "svg";
  const c = (ct || "").toLowerCase();
  if (c.includes("png")) return "png";
  if (c.includes("jpeg") || c.includes("jpg")) return "jpg";
  if (c.includes("svg")) return "svg";
  if (c.includes("webp")) return "webp";
  if (c.includes("icon") || c.includes("ico")) return "ico";
  if (c.includes("gif")) return "gif";
  return "png";
}

async function finalOrigin(baseUrl) {
  // Follow redirects to find the site's real origin (many hosts move domains).
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(baseUrl, {
      redirect: "follow",
      signal: ctrl.signal,
      headers: { "User-Agent": UA, Accept: "text/html,*/*" },
    });
    return new URL(res.url).origin;
  } catch {
    try {
      return new URL(baseUrl).origin;
    } catch {
      return null;
    }
  } finally {
    clearTimeout(t);
  }
}

async function resolveIcon(baseUrl) {
  const host = hostOf(baseUrl);
  if (!host) return null;
  const origin = await finalOrigin(baseUrl);

  // 1. Parse the homepage for the declared icon
  const html = await fetchBuf(baseUrl, { asText: true });
  if (html) {
    const candidate = bestIconFromHtml(html, baseUrl);
    if (candidate) {
      const got = await fetchBuf(candidate);
      if (got && got.buf.length > 0) return { ...got, from: candidate };
    }
  }
  // 2. /favicon.ico served by the site itself
  for (const base of [origin, new URL(baseUrl).origin]) {
    if (!base) continue;
    for (const u of [`${base}/favicon.ico`, `${base}/favicon.png`]) {
      const got = await fetchBuf(u);
      if (got && got.buf.length > 0) return { ...got, from: u };
    }
  }
  return null;
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
    if (!assetPath.endsWith(".svg")) continue; // only SVG replacements
    targets.push({ type, file: f, entry: e, assetRel, assetPath });
  }
}
if (LIMIT) targets = targets.slice(0, LIMIT);

console.log(`Replacing ${targets.length} SVG icons (concurrency ${CONC})...`);

let done = 0;
let ok = 0;
let failed = 0;
const changesByFile = {};

async function worker(item) {
  const { type, entry, assetRel, assetPath } = item;
  const base = entry.baseUrl || entry.apiUrl || "";
  const got = await resolveIcon(base);
  done++;
  if (!got) {
    failed++;
    if (done % 25 === 0) console.log(`  ${done}/${targets.length} ok=${ok} failed=${failed}`);
    return;
  }
  const ext = sniffExt(got.buf, got.ct);
  const newRel = `assets/icons/${type}-${entry.id}.${ext}`;
  const newPath = path.join(ROOT, newRel);
  fs.writeFileSync(newPath, got.buf);
  if (newPath !== assetPath && fs.existsSync(assetPath)) fs.unlinkSync(assetPath);
  entry.iconUrl = ICON_BASE + newRel;
  (changesByFile[item.file] ||= []).push({ id: entry.id, name: entry.name, rel: newRel, from: got.from });
  ok++;
  if (done % 25 === 0) console.log(`  ${done}/${targets.length} ok=${ok} failed=${failed}`);
}

const queue = [...targets];
await Promise.all(
  Array.from({ length: CONC }, async () => {
    while (queue.length) await worker(queue.shift());
  }),
);

// Persist index changes
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
