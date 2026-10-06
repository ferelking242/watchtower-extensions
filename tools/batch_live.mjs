// Batch live diagnostic over index/<type>.json entries.
// For each index entry it maps to the local source file and runs
// popular + latest (and detail+videos if --deep) with short timeouts,
// then writes a JSON report.
// Usage:
//   node tools/batch_live.mjs [--type watch] [--filter NSFW|SFW] [--deep]
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import * as cheerio from "cheerio";

const ROOT = process.cwd();
const TIMEOUT_MS = Number(process.env.TIMEOUT_MS || 10000);
const deep = process.argv.includes("--deep");
const type = process.argv.includes("--type") ? process.argv[process.argv.indexOf("--type") + 1] : "watch";
const filter = process.argv.includes("--filter") ? process.argv[process.argv.indexOf("--filter") + 1] : null;

// ---- sandbox (mirrors tools/live_test.mjs) ----------------------------------
class Element {
  constructor($el) { this._ = $el; }
  select(sel) { return new Selection(this._.find(sel).toArray().map((el) => new Element(this._.constructor(el)))); }
  selectFirst(sel) { const found = this._.find(sel).first(); return found.length ? new Element(found) : null; }
  attr(name) { return this._.attr(name) ?? ""; }
  get text() { return this._.text() ?? ""; }
  html() { return this._.html() ?? ""; }
  outerHtml() { return this._.toString(); }
  get length() { return this._.length; }
  toArray() { return this._.toArray().map((el) => new Element(this._.constructor(el))); }
}
class Selection {
  constructor(items) { this.items = items; }
  get length() { return this.items.length; }
  [Symbol.iterator]() { return this.items[Symbol.iterator](); }
  toArray() { return this.items; }
  map(fn) { return this.items.map(fn); }
  first() { return this.items[0] ?? null; }
}
class Document {
  constructor(html) { this._ = cheerio.load(html || ""); }
  select(sel) { return new Selection(this._(sel).toArray().map((el) => new Element(this._(el)))); }
  selectFirst(sel) { const found = this._(sel).first(); return found.length ? new Element(found) : null; }
  attr() { return ""; }
  text() { return this._.root().text(); }
}
class Client {
  async _req(method, url, headers, body) {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
    try {
      const h = {};
      if (headers) { const src = headers.headers ? headers.headers : headers; for (const [k, v] of Object.entries(src)) if (v != null) h[k] = v; }
      const res = await fetch(url, { method, headers: h, body: body ?? undefined, redirect: "follow", signal: ctrl.signal });
      const text = await res.text();
      const hdrs = {};
      res.headers.forEach((v, k) => { hdrs[k] = v; });
      return { statusCode: res.status, body: text, headers: hdrs, url: res.url };
    } finally { clearTimeout(t); }
  }
  async get(url, h) { return this._req("GET", url, h); }
  async post(url, b, h) {
    let body = b; const hd = { ...(h || {}) };
    if (body && typeof body === "object" && !(body instanceof URLSearchParams) && !Buffer.isBuffer(body)) { body = JSON.stringify(body); if (!hd["Content-Type"]) hd["Content-Type"] = "application/json"; }
    return this._req("POST", url, hd, body);
  }
  async head(url, h) { return this._req("HEAD", url, h); }
}
class SharedPreferences { constructor() { this.map = {}; } get(k) { return this.map[k] ?? null; } set(k, v) { this.map[k] = v; } contains(k) { return k in this.map; } }
class MProvider {
  constructor() { this.source = null; }
  get supportsLatest() { return false; }
  async getPopular(p) { throw new Error("not implemented"); }
  async getLatestUpdates(p) { throw new Error("not implemented"); }
  async search(q, p, f) { throw new Error("not implemented"); }
  async getDetail(u) { throw new Error("not implemented"); }
  async getVideoList(u) { return []; }
  getFilterList() { return []; }
  getSourcePreferences() { return []; }
}

function loadExtension(filePath) {
  const code = fs.readFileSync(filePath, "utf8");
  const sandbox = {
    Client, MProvider, Document, SharedPreferences,
    extLog: () => {},
    console, setTimeout, clearTimeout, setInterval, clearInterval,
    fetch, URL, URLSearchParams, TextEncoder, TextDecoder, Buffer,
    atob: (s) => Buffer.from(s, "base64").toString("utf8"),
    btoa: (s) => Buffer.from(s, "utf8").toString("base64"),
    watchtowerSources: undefined, mangayomiSources: undefined, DefaultExtension: undefined,
  };
  vm.createContext(sandbox);
  const wrapped = code + `\n;this.__exports = {
    sources: typeof watchtowerSources !== 'undefined' ? watchtowerSources
      : (typeof mangayomiSources !== 'undefined' ? mangayomiSources : null),
    DefaultExtension: typeof DefaultExtension !== 'undefined' ? DefaultExtension : null,
  };`;
  vm.runInContext(wrapped, sandbox, { filename: path.basename(filePath), timeout: 8000 });
  return sandbox.__exports;
}
async function withTimeout(p, ms, label) {
  let to;
  const t = new Promise((_, rej) => { to = setTimeout(() => rej(new Error(`${label} timeout ${ms}ms`)), ms); });
  try { return await Promise.race([p, t]); } finally { clearTimeout(to); }
}

function localPathFor(entry) {
  const su = entry.sourceCodeUrl || "";
  const m = su.match(/src\/([^?#]+\.js)/);
  if (m) { const p = path.join(ROOT, "src", m[1]); if (fs.existsSync(p)) return p; }
  const base = (entry.pkgPath || entry.name || "").toLowerCase().replace(/[^a-z0-9]+/g, "_");
  const dir = entry.isNsfw ? `nsfw/${entry.lang || "en"}` : (entry.lang || "en");
  const cand = path.join(ROOT, "src", "watch", dir, `${base}.js`);
  return fs.existsSync(cand) ? cand : null;
}

async function runOne(entry) {
  const lp = localPathFor(entry);
  const out = { name: entry.name, baseUrl: entry.baseUrl, isNsfw: !!entry.isNsfw, file: lp ? path.relative(ROOT, lp) : null, steps: {} };
  if (!lp) { out.loadError = "no local file"; return out; }
  let exp;
  try { exp = loadExtension(lp); } catch (e) { out.loadError = e.message; return out; }
  if (!exp.sources || !exp.DefaultExtension) { out.loadError = "missing sources/DefaultExtension"; return out; }
  const src = exp.sources[0];
  let ext;
  try {
    ext = new exp.DefaultExtension();
    ext.source = { ...src, prefs: [] };
  } catch (e) { out.loadError = "construct: " + e.message; return out; }
  async function step(label, fn) {
    const t0 = Date.now();
    try {
      const r = await withTimeout(Promise.resolve().then(fn), TIMEOUT_MS + 3000, label);
      out.steps[label] = summarize(label, r);
      return r;
    } catch (e) { out.steps[label] = { error: String(e.message).slice(0, 220) }; return null; }
  }
  let detailUrl = null;
  const popular = await step("popular", () => ext.getPopular(1));
  const first = popular && popular.list && popular.list[0];
  detailUrl = first ? (first.url || first.link || null) : null;
  await step("latest", () => ext.getLatestUpdates(1));
  if (deep && detailUrl) {
    const detail = await step("detail", () => ext.getDetail(detailUrl));
    const ep = detail && (detail.episodes || detail.chapters) && (detail.episodes || detail.chapters)[0];
    const epUrl = ep ? (ep.url || ep.link) : null;
    if (epUrl) await step("videos", () => ext.getVideoList(epUrl));
    else out.steps.detail = { ...(out.steps.detail || {}), noEpisode: true };
  }
  return out;
}
function summarize(label, r) {
  if (!r) return null;
  if (label === "popular" || label === "latest") {
    const l = (r.list || []).map((x) => ({ n: x.name, u: x.url || x.link })).slice(0, 2);
    return { count: r.list ? r.list.length : 0, hasNext: !!r.hasNextPage, sample: l };
  }
  if (label === "detail") return { name: r.name, episodes: (r.episodes || []).length };
  if (label === "videos") return { count: Array.isArray(r) ? r.length : 0 };
  return r;
}

const ok = (r) => !r.loadError && r.steps.popular && !r.steps.popular.error && r.steps.popular.count > 0 && r.steps.latest && !r.steps.latest.error;
const main = async () => {
  const idx = JSON.parse(fs.readFileSync(path.join(ROOT, "index", `${type}.json`), "utf8"));
  const limit = Number(process.env.LIMIT || 0);
  let entries = idx.filter((e) => (filter ? (filter === "NSFW" ? e.isNsfw : !e.isNsfw) : true));
  if (limit) entries = entries.slice(0, limit);
  process.stderr.write(`diag ${type}: ${entries.length} entries\n`);
  const concurrency = 6;
  const results = [];
  let i = 0;
  const worker = async () => {
    while (i < entries.length) {
      const e = entries[i++];
      const r = await runOne(e);
      results.push(r);
      process.stderr.write(`${ok(r) ? "OK " : "FAIL"} ${String(results.length).padStart(4)}/${entries.length} ${e.name}\n`);
    }
  };
  await Promise.all(Array.from({ length: concurrency }, worker));
  const outFile = path.join(ROOT, "tools", `live_report_${filter ? filter.toLowerCase() : "all"}.json`);
  fs.writeFileSync(outFile, JSON.stringify({ type, filter, results }, null, 1));
  const failed = results.filter((r) => !ok(r));
  process.stderr.write(`\n✅ ${results.length - failed.length} OK  ❌ ${failed.length} FAIL\nreport: ${outFile}\n`);
};
main().catch((e) => { console.error(e); process.exit(1); });
