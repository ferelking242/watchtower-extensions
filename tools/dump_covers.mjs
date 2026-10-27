// Dump every item's imageUrl for an extension's browse/search routes.
// Usage: node tools/dump_covers.mjs <file.js> [query]
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import * as cheerio from "cheerio";

class Element {
  constructor(root, node) { this._ = root; this.n = node; }
  select(sel) { const f = this._(this.n).find(sel).toArray(); return new Selection(f.map(n => new Element(this._, n))); }
  selectFirst(sel) { const f = this._(this.n).find(sel).first(); return f.length ? new Element(this._, f.get(0)) : null; }
  attr(n) { const v = this._(this.n).attr(n); return v ?? ""; }
  get text() { return this._(this.n).text() ?? ""; }
  get html() { return this._(this.n).html() ?? ""; }
  get innerHtml() { return this._(this.n).html() ?? ""; }
  get outerHtml() { return this._(this.n).toString(); }
  get getSrc() { return this.attr("src") || this.attr("data-src") || this.attr("data-lazy-src"); }
  get getHref() { return this.attr("href") || this.attr("data-href"); }
  get length() { return this._(this.n).length; }
  toArray() { return this._(this.n).toArray().map(n => new Element(this._, n)); }
}
class Selection extends Array {
  constructor(items) { if (typeof items === "number") { super(items); } else { super(...(items || [])); } }
  first() { return this[0] ?? null; }
  get text() { return this.map(e => e.text ?? "").join(" "); }
  toArray() { return Array.from(this); }
}
class Document {
  constructor(html) { this._ = cheerio.load(html || ""); }
  select(s) { const f = this._(s).toArray(); return new Selection(f.map(n => new Element(this._, n))); }
  selectFirst(s) { const f = this._(s).first(); return f.length ? new Element(this._, f.get(0)) : null; }
  attr() { return ""; }
  get text() { return this._.root().text(); }
  get html() { return this._.root().html() ?? ""; }
  get outerHtml() { return this._.root().toString(); }
}
class Client {
  async _req(m, u, h) {
    const c = new AbortController(); const t = setTimeout(() => c.abort(), 20000);
    try {
      const hh = {}; if (h) { const s = h.headers ? h.headers : h; for (const [k, v] of Object.entries(s)) if (v != null) hh[k] = v; }
      const r = await fetch(u, { method: m, headers: hh, redirect: "follow", signal: c.signal });
      const b = await r.text(); const hd = {}; r.headers.forEach((v, k) => { hd[k] = v; });
      return { statusCode: r.status, body: b, headers: hd, url: r.url };
    } finally { clearTimeout(t); }
  }
  async get(u, h) { return this._req("GET", u, h); }
  async post(u, b, h) {
    let bb = b; const hh = { ...(h || {}) };
    if (bb && typeof bb === "object" && !(bb instanceof URLSearchParams) && !Buffer.isBuffer(bb)) {
      bb = JSON.stringify(bb); if (!hh["Content-Type"]) hh["Content-Type"] = "application/json";
    }
    return this._req("POST", u, hh);
  }
}
class SharedPreferences { constructor() { this.map = {}; } get(k) { return this.map[k] ?? null; } set(k, v) { this.map[k] = v; } contains(k) { return k in this.map; } }
class MProvider { constructor() { this.source = null; } get supportsLatest() { return false; } getHeaders() { return {}; } }

const file = process.argv[2];
const query = process.argv[3] || "demon";
const code = fs.readFileSync(file, "utf8");
const sandbox = {
  Client, MProvider, Document, SharedPreferences, extLog: () => {}, console,
  setTimeout, clearTimeout, setInterval, clearInterval, fetch, URL, URLSearchParams,
  TextEncoder, TextDecoder, Buffer,
  atob: (s) => Buffer.from(s, "base64").toString("utf8"),
  btoa: (s) => Buffer.from(s, "utf8").toString("base64"),
};
vm.createContext(sandbox);
vm.runInContext(
  code + `\n;this.__e={sources:typeof watchtowerSources!=="undefined"?watchtowerSources:null,DefaultExtension:typeof DefaultExtension!=="undefined"?DefaultExtension:null};`,
  sandbox, { filename: path.basename(file), timeout: 10000 },
);
const src = sandbox.__e.sources[0];
const ext = new sandbox.__e.DefaultExtension();
ext.source = { ...src, prefs: [] };

// Verify the URLs the extension emits, not just that they are non-empty. A
// non-empty `imageUrl` says nothing about whether the app can load it: the
// cover can sit on a mirror that answers 404/429/503, which is exactly how
// placeholder-only home and search shipped while this harness reported 20/20.
async function probe(url) {
  const attempt = async (method) => {
    const c = new AbortController(); const t = setTimeout(() => c.abort(), 20000);
    try {
      const r = await fetch(url, { method, redirect: "follow", signal: c.signal });
      return { status: r.status, type: r.headers.get("content-type") || "" };
    } catch (e) { return { status: "ERR", type: String(e).slice(0, 40) }; }
    finally { clearTimeout(t); }
  };
  const head = await attempt("HEAD");
  if (head.status === 200) return head;
  return attempt("GET");
}

async function dump(label, r) {
  const list = r?.list ?? [];
  let empty = 0; const noUrl = [];
  const urls = [];
  for (const it of list) {
    const u = (it.imageUrl || "").trim();
    if (u) urls.push({ name: it.name || "", url: u });
    else { empty++; noUrl.push(it.name); }
  }
  console.log(`\n${label}: ${urls.length}/${list.length} avec cover`);
  if (noUrl.length) console.log("  SANS cover:", noUrl.join(" | "));

  if (process.env.SKIP_FETCH) {
    for (const { name, url } of urls.slice(0, 4)) console.log(`  · ${name.slice(0, 40)} → ${url.slice(0, 90)}`);
    return;
  }

  const byHost = {};
  const broken = [];
  for (const { name, url } of urls) {
    const host = (url.match(/^https?:\/\/([^/]+)/) || [])[1] || "?";
    const { status, type } = await probe(url);
    byHost[host] = byHost[host] || { 200: 0, ko: [] };
    if (status === 200) byHost[host][200]++;
    else byHost[host].ko.push(`${status}`);
    if (status !== 200) broken.push({ name, url, status });
  }
  const served = urls.length - broken.length;
  console.log(`  téléchargées: ${served}/${urls.length} → 200`);
  for (const [host, s] of Object.entries(byHost)) {
    console.log(`    ${host}: ${s[200]} ok${s.ko.length ? `, ${s.ko.length} KO [${[...new Set(s.ko)].join(",")}]` : ""}`);
  }
  for (const b of broken.slice(0, 8)) console.log(`  KO ${b.status} ${b.name.slice(0, 30)} → ${b.url.slice(0, 80)}`);
  if (broken.length) process.exitCode = 1;
}

const sections = process.env.SECTIONS
  ? process.env.SECTIONS.split(",")
  : ["spotlight", "popular", "latest", "trending", "top_rated", "new", "category_romance", "category_action", "completed"];

if (process.env.CUSTOM) {
  for (const id of sections) {
    try { dump(`getCustomList('${id}',1)`, await ext.getCustomList(id, 1)); }
    catch (e) { console.log(`\ngetCustomList('${id}'): ERR ${e.message}`); }
  }
} else {
  dump("getPopular(1)", await ext.getPopular(1));
  dump("getLatestUpdates(1)", await ext.getLatestUpdates(1));
  dump(`search('${query}',1)`, await ext.search(query, 1, []));
}

