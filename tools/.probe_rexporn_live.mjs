import fs from "node:fs";
import vm from "node:vm";
import * as cheerio from "cheerio";
class Element {
  constructor(root, node) { this._ = root; this.n = node; }
  select(sel) { return new Selection(this._(this.n).find(sel).toArray().map((n) => new Element(this._, n))); }
  selectFirst(sel) { const f = this._(this.n).find(sel).first(); return f.length ? new Element(this._, f.get(0)) : null; }
  attr(name) { const v = this._(this.n).attr(name); return v ?? ""; }
  get text() { return this._(this.n).text() ?? ""; }
  get html() { return this._(this.n).html() ?? ""; }
  get getSrc() { return this.attr("src") || this.attr("data-src"); }
  get getHref() { return this.attr("href"); }
  get length() { return this._(this.n).length; }
  toArray() { return this._(this.n).toArray().map((n) => new Element(this._, n)); }
}
class Selection extends Array {
  constructor(items) { if (typeof items === "number") super(items); else super(...(items || [])); }
  first() { return this[0] ?? null; }
  get text() { return this.map((e) => e.text ?? "").join(" "); }
  toArray() { return Array.from(this); }
}
class Document {
  constructor(html) { this._ = cheerio.load(html || ""); }
  select(sel) { return new Selection(this._(sel).toArray().map((n) => new Element(this._, n))); }
  selectFirst(sel) { const f = this._(sel).first(); return f.length ? new Element(this._, f.get(0)) : null; }
  attr() { return ""; }
  get text() { return this._.root().text(); }
  get html() { return this._.root().html() ?? ""; }
}
class Client {
  async _req(method, url, headers) {
    const h = {};
    if (headers) { const src = headers.headers ? headers.headers : headers; for (const [k, v] of Object.entries(src)) if (v != null) h[k] = v; }
    const r = await fetch(url, { method, headers: h, redirect: "follow" });
    return { statusCode: r.status, body: await r.text(), url: r.url };
  }
  async get(url, headers) { return this._req("GET", url, headers); }
  async post(url, headers, body) {
    const h = { "Content-Type": "application/json", ...(headers && headers.headers ? headers.headers : headers) };
    const r = await fetch(url, { method: "POST", headers: h, body: JSON.stringify(body) });
    return { statusCode: r.status, body: await r.text(), url: r.url };
  }
}
class SharedPreferences { get() { return null; } set() {} contains() { return false; } }
class MProvider { get supportsLatest() { return false; } getHeaders() { return {}; } getSourcePreferences() { return []; } }
const code = fs.readFileSync("/workspace/watchtower-extensions/src/nsfw/watch/en/rexporn.js", "utf8");
const sandbox = { Client, MProvider, Document, SharedPreferences, extLog: () => {}, console, setTimeout, clearTimeout, setInterval, clearInterval, fetch, URL, URLSearchParams, TextEncoder, TextDecoder, Buffer };
vm.createContext(sandbox);
vm.runInContext(code + "\n;this.__E = DefaultExtension;", sandbox, { timeout: 10000 });
const ext = new sandbox.__E();
ext.source = { name: "RexPorn", baseUrl: "https://www.rexporn.st", prefs: [] };
const show = (label, r) => console.log(label, "count=" + (r && r.list ? r.list.length : "ERR"), "hasNext=" + (r && r.hasNextPage), "sample=" + (r && r.list && r.list[0] ? JSON.stringify(r.list[0].name).slice(0, 60) : ""));
console.log("== filters ==");
console.log(JSON.stringify(ext.getFilterList()));
console.log("\n== search ==");
for (const q of ["teen", "big tits", "shower"]) {
  try { show(`search(${q})`, await ext.search(q, 1, [])); } catch (e) { console.log(`search(${q}) ERR`, e.message); }
}
console.log("\n== pagination ==");
try { const p1 = await ext.getPopular(1), p2 = await ext.getPopular(2); show("popular p1", p1); show("popular p2", p2); console.log("p1!=p2:", p1.list[0]?.link !== p2.list[0]?.link); } catch (e) { console.log("popular ERR", e.message); }
try { show("latest p2", await ext.getLatestUpdates(2)); } catch (e) { console.log("latest ERR", e.message); }
console.log("\n== collections ==");
for (const id of ["pornstars", "studios", "categories", "category_teen"]) {
  try { show(id, await ext.getCustomList(id, 1)); } catch (e) { console.log(id, "ERR", e.message); }
}
console.log("\n== sort filter ==");
try { show("popular sort=1", await ext.getPopular(1)); } catch (e) { console.log("ERR", e.message); }
