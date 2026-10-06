// Live test harness — loads extension JS in a VM sandbox mimicking the
// Watchtower runtime (Cheerio-backed Document) and runs real HTTP steps.
// Usage: node tools/live_test.mjs <file.js> [<file.js>...]
// Optional env: STEP=popular,latest,detail,videos  (default: popular,detail,videos)
//               TIMEOUT_MS (default 20000 per HTTP call)
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import * as cheerio from "cheerio";

const TIMEOUT_MS = Number(process.env.TIMEOUT_MS || 20000);

// ---- Cheerio-backed Document/Element mimicking the app API -------------------
class Element {
  constructor(root, node) { this._ = root; this.n = node; }
  select(sel) { const found = this._(this.n).find(sel).toArray(); return new Selection(found.map((n) => new Element(this._, n))); }
  selectFirst(sel) { const f = this._(this.n).find(sel).first(); return f.length ? new Element(this._, f.get(0)) : null; }
  attr(name) { const v = this._(this.n).attr(name); return v ?? ""; }
  get text() { return this._(this.n).text() ?? ""; }
  get html() { return this._(this.n).html() ?? ""; }
  get innerHtml() { return this._(this.n).html() ?? ""; }
  get outerHtml() { return this._(this.n).toString(); }
  get getSrc() { return this.attr("src") || this.attr("data-src") || this.attr("data-lazy-src"); }
  get getHref() { return this.attr("href") || this.attr("data-href"); }
  get length() { return this._(this.n).length; }
  toArray() { return this._(this.n).toArray().map((n) => new Element(this._, n)); }
}

class Selection extends Array {
  constructor(items) {
    if (typeof items === "number") { super(items); }           // Array species ops pass a length
    else { super(...(items || [])); }
  }
  first() { return this[0] ?? null; }
  get text() { return this.map((e) => (e.text ?? "")).join(" "); }
  toArray() { return Array.from(this); }
}

class Document {
  constructor(html) { this._ = cheerio.load(html || ""); }
  select(sel) { const found = this._(sel).toArray(); return new Selection(found.map((n) => new Element(this._, n))); }
  selectFirst(sel) { const found = this._(sel).first(); return found.length ? new Element(this._, found.get(0)) : null; }
  attr(a) { return ""; }
  get text() { return this._.root().text(); }
  get html() { return this._.root().html() ?? ""; }
  get outerHtml() { return this._.root().toString(); }
}

// ---- HTTP Client (same contract as server.js) --------------------------------
class Client {
  async _req(method, url, headers) {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
    try {
      const h = {};
      if (headers) {
        // Accept both {headers:{...}} and flat {...}
        const src = headers.headers ? headers.headers : headers;
        for (const [k, v] of Object.entries(src)) if (v != null) h[k] = v;
      }
      const res = await fetch(url, { method, headers: h, redirect: "follow", signal: ctrl.signal });
      const text = await res.text();
      if (process.env.DEBUG) console.error(`[fetch] ${method} ${url.slice(0, 90)} -> ${res.status} len=${text.length}`);
      const hdrs = {};
      res.headers.forEach((v, k) => { hdrs[k] = v; });
      return { statusCode: res.status, body: text, headers: hdrs, url: res.url };
    } finally { clearTimeout(t); }
  }
  async get(url, headers) { return this._req("GET", url, headers); }
  async post(url, body, headers) {
    let b = body; const h = { ...(headers || {}) };
    if (b && typeof b === "object" && !(b instanceof URLSearchParams) && !Buffer.isBuffer(b)) {
      b = JSON.stringify(b);
      if (!h["Content-Type"]) h["Content-Type"] = "application/json";
    }
    return this._req("POST", url, h);
  }
  async head(url, headers) { return this._req("HEAD", url, headers); }
}

class SharedPreferences {
  constructor() { this.map = {}; }
  get(k) { return this.map[k] ?? null; }
  set(k, v) { this.map[k] = v; }
  contains(k) { return k in this.map; }
}

class MProvider {
  constructor() { this.source = null; }
  get supportsLatest() { return false; }
  getHeaders(url) { return {}; }
  async getPopular(page) { throw new Error("getPopular not implemented"); }
  async getLatestUpdates(page) { throw new Error("getLatestUpdates not implemented"); }
  async search(query, page, filters) { throw new Error("search not implemented"); }
  async getDetail(url) { throw new Error("getDetail not implemented"); }
  async getPageList(url) { return []; }
  async getVideoList(url) { throw new Error("getVideoList not implemented"); }
  getFilterList() { return []; }
  getSourcePreferences() { return []; }
}

// ---- Loader -------------------------------------------------------------------
function loadExtension(filePath) {
  const code = fs.readFileSync(filePath, "utf8");
  const sandbox = {
    Client, MProvider, Document, SharedPreferences,
    extLog: (...a) => { if (process.env.VERBOSE) console.error(...a); },
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
  vm.runInContext(wrapped, sandbox, { filename: path.basename(filePath), timeout: 10000 });
  return sandbox.__exports;
}

async function withTimeout(promise, ms, label) {
  let to;
  const t = new Promise((_, rej) => { to = setTimeout(() => rej(new Error(`${label} timeout ${ms}ms`)), ms); });
  try { return await Promise.race([promise, t]); } finally { clearTimeout(to); }
}

const LIST_STEP = process.env.STEP ? process.env.STEP.split(",") : ["popular", "latest", "detail", "videos"];

async function runOne(filePath) {
  const name = path.basename(filePath);
  let exp;
  try { exp = loadExtension(filePath); }
  catch (e) { return { file: name, loadError: e.message }; }
  if (!exp.sources || !exp.DefaultExtension) return { file: name, loadError: "missing sources/DefaultExtension" };
  const src = exp.sources[0];
  const ext = new exp.DefaultExtension();
  ext.source = { ...src, prefs: [] };
  const out = { file: name, name: src.name, baseUrl: src.baseUrl, steps: {} };

  async function step(label, fn) {
    const t0 = Date.now();
    try {
      const r = await withTimeout(Promise.resolve().then(fn), TIMEOUT_MS + 3000, label);
      out.steps[label] = { ok: true, ms: Date.now() - t0, result: summarize(label, r) };
      return r;
    } catch (e) {
      out.steps[label] = { ok: false, ms: Date.now() - t0, error: String(e.message).slice(0, 300) };
      if (process.env.VERBOSE && e.stack) console.error("STACK", label, String(e.stack).split("\n").slice(0, 5).join("\n"));
      return null;
    }
  }

  let popular = null, detailUrl = null;
  if (LIST_STEP.includes("popular")) {
    popular = await step("popular", () => ext.getPopular(1));
    const first = popular?.list?.[0];
    detailUrl = first ? (first.url || first.link) : null;
  }
  if (LIST_STEP.includes("latest")) await step("latest", () => ext.getLatestUpdates(1));
  if (LIST_STEP.includes("detail") && detailUrl) {
    const detail = await step("detail", () => ext.getDetail(detailUrl));
    const ep = detail?.episodes?.[0] || detail?.chapters?.[0] || null;
    const epUrl = ep ? (ep.url || ep.link) : null;
    if (epUrl && LIST_STEP.includes("videos")) {
      await step("videos", () => ext.getVideoList(epUrl));
    } else if (!epUrl && LIST_STEP.includes("videos")) {
      out.steps.videos = { ok: false, error: "no episode url from detail", result: null };
    }
  } else if (LIST_STEP.includes("detail")) {
    out.steps.detail = { ok: false, error: "no popular item", result: null };
  }
  return out;
}

function summarize(label, r) {
  if (!r) return null;
  if (label === "popular" || label === "latest") {
    return { count: r.list?.length ?? 0, hasNext: !!r.hasNextPage,
      sample: r.list?.[0] ? { name: r.list[0].name, url: r.list[0].url, img: (r.list[0].imageUrl || "").slice(0, 100) } : null };
  }
  if (label === "detail") {
    return { name: (r.name || "").slice(0, 60), episodes: r.episodes?.length ?? 0,
      ep0: r.episodes?.[0] ? { name: r.episodes[0].name, url: r.episodes[0].url } : null, img: (r.imageUrl || "").slice(0, 100) };
  }
  if (label === "videos") {
    const arr = Array.isArray(r) ? r : [];
    return { count: arr.length, sample: arr[0] ? { quality: arr[0].quality, url: String(arr[0].url || arr[0].originalUrl || "").slice(0, 140) } : null };
  }
  return r;
}

async function main() {
  const files = process.argv.slice(2);
  if (!files.length) { console.error("usage: node tools/live_test.mjs <file.js> ..."); process.exit(2); }
  for (const f of files) {
    const r = await runOne(f);
    console.log("\n" + "=".repeat(100));
    console.log(`# ${r.name || r.file}  (${r.baseUrl || ""})`);
    if (r.loadError) { console.log(`  LOAD ERROR: ${r.loadError}`); continue; }
    for (const [k, v] of Object.entries(r.steps)) {
      const icon = v.ok ? "✅" : "❌";
      console.log(`  ${icon} ${k.padEnd(8)} ${v.ms}ms  ${v.ok ? JSON.stringify(v.result) : "ERR: " + v.error}`);
    }
  }
}
main().catch((e) => { console.error(e); process.exit(1); });
