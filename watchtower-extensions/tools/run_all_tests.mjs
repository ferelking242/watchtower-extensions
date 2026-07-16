#!/usr/bin/env node
/**
 * Watchtower Extension Full Test Runner
 * Usage:
 *   node tools/run_all_tests.mjs              # test all extensions
 *   node tools/run_all_tests.mjs --type watch  # only watch/anime
 *   node tools/run_all_tests.mjs --type manga  # only manga
 *   node tools/run_all_tests.mjs --type novel  # only novel
 *   node tools/run_all_tests.mjs --file watch/multi/autoembed.js
 *   node tools/run_all_tests.mjs --concurrency 5
 *
 * Output: tools/report.json  (open tools/report.html to view)
 */

import fs   from "node:fs";
import path from "node:path";
import vm   from "node:vm";
import { fileURLToPath } from "node:url";
import { Worker, isMainThread, parentPort, workerData } from "node:worker_threads";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT      = path.resolve(__dirname, "..");
const TIMEOUT   = 20000;

// ── Shared stubs ───────────────────────────────────────────────
class Client {
  async _fetch(method, url, headers, body) {
    const ctrl = new AbortController();
    const t    = setTimeout(() => ctrl.abort(), TIMEOUT);
    try {
      const res  = await fetch(url, { method, headers: headers || {}, body: body ?? undefined, redirect: "follow", signal: ctrl.signal });
      const text = await res.text();
      const hdrs = {};
      res.headers.forEach((v, k) => { hdrs[k] = v; });
      return { statusCode: res.status, body: text, headers: hdrs, url: res.url };
    } finally { clearTimeout(t); }
  }
  async get(url, h)       { return this._fetch("GET",  url, h); }
  async post(url, body, h){ let b=body,hd={...(h||{})};if(b&&typeof b==="object"&&!(b instanceof URLSearchParams)){b=JSON.stringify(b);if(!hd["Content-Type"]&&!hd["content-type"])hd["Content-Type"]="application/json";}return this._fetch("POST",url,hd,b); }
  async head(url, h)      { return this._fetch("HEAD", url, h); }
}
class MProvider { constructor() { this.source = null; } }
class SharedPreferences {
  constructor(){ this._d = {}; }
  get(k){ return this._d[k] ?? null; }
  set(k,v){ this._d[k]=v; }
}

// Minimal HTML/Document stub so extensions that use Document() don't crash
class Document {
  constructor(html){ this._html = html ?? ""; }
  select(sel)       { return []; }
  selectFirst(sel)  { return null; }
  attr(a)           { return ""; }
  text()            { return ""; }
  outerHtml()       { return ""; }
}

// ── Load & run one extension ────────────────────────────────────
function loadExtension(filePath) {
  const code    = fs.readFileSync(filePath, "utf8");
  const sandbox = {
    MProvider, Client, SharedPreferences, Document,
    console, setTimeout, clearTimeout, setInterval, clearInterval,
    URL, URLSearchParams, TextDecoder, TextEncoder, fetch, Buffer,
    atob: (s) => Buffer.from(s, "base64").toString("utf8"),
    btoa: (s) => Buffer.from(s, "utf8").toString("base64"),
    watchtowerSources: undefined,
    mangayomiSources:  undefined,
    DefaultExtension:  undefined,
  };
  vm.createContext(sandbox);
  const wrapped = code + `\n;this.__exports={
    sources: typeof watchtowerSources!=="undefined"?watchtowerSources:(typeof mangayomiSources!=="undefined"?mangayomiSources:null),
    DefaultExtension: typeof DefaultExtension!=="undefined"?DefaultExtension:null
  };`;
  vm.runInContext(wrapped, sandbox, { filename: path.basename(filePath), timeout: 8000 });
  return sandbox.__exports;
}

function snip(s, n=160) {
  if (s==null) return "null";
  const str = typeof s==="string" ? s : JSON.stringify(s);
  return str.length>n ? str.slice(0,n)+"…" : str;
}

async function raceTimeout(p, ms, label) {
  let h;
  const t = new Promise((_,rej)=>{ h=setTimeout(()=>rej(new Error(`${label} timed out after ${ms}ms`)),ms); });
  try { return await Promise.race([p,t]); } finally { clearTimeout(h); }
}

async function runExtension(relPath) {
  const filePath = path.join(ROOT, relPath);
  const result   = { file: relPath, name: null, lang: "?", itemType: 1, baseUrl: "", iconUrl: "", steps: {}, ok: true, errors: [], testedAt: Date.now() };

  let exp;
  try { exp = loadExtension(filePath); }
  catch(e) { result.ok=false; result.errors.push("load: "+e.message); return result; }

  if (!exp.sources || !exp.DefaultExtension) {
    result.ok=false; result.errors.push("missing watchtowerSources or DefaultExtension"); return result;
  }

  const src = exp.sources[0];
  result.name     = src.name     ?? path.basename(relPath,".js");
  result.lang     = src.lang     ?? "?";
  result.baseUrl  = src.baseUrl  ?? "";
  result.iconUrl  = src.iconUrl  ?? "";
  result.itemType = src.itemType ?? 1;
  result.version  = src.version  ?? "?";
  result.isNsfw   = !!(src.isNsfw);

  const ext   = new exp.DefaultExtension();
  ext.source  = { ...src, prefs: [] };

  async function step(name, fn) {
    const t0 = Date.now();
    try {
      const out = await raceTimeout(Promise.resolve().then(fn), TIMEOUT+3000, name);
      result.steps[name] = { ok: true, ms: Date.now()-t0, info: summarize(name, out) };
      return out;
    } catch(e) {
      result.ok = false;
      result.steps[name] = { ok: false, ms: Date.now()-t0, error: e.message };
      result.errors.push(`${name}: ${e.message}`);
      return null;
    }
  }

  // 1. getPopular
  const popular = await step("getPopular", () => ext.getPopular(1));

  // 2. getLatest
  await step("getLatest", () => ext.getLatestUpdates(1));

  // 3. search (short query to avoid blank results)
  await step("search", () => ext.search("a", 1, []));

  // 4. getDetail on first popular result
  const firstItem = popular?.list?.[0];
  if (firstItem?.url) {
    const detail = await step("getDetail", () => ext.getDetail(firstItem.url));

    // 5. cover check
    const cover = detail?.imageUrl || firstItem?.imageUrl;
    result.steps.cover = { ok: !!cover, info: cover ? snip(cover) : null };

    // 6. read (getPageList for manga, getVideoList for watch/novel)
    const isManga = result.itemType === 0 || src.isManga === true;
    const epUrl   = detail?.chapters?.[0]?.url ?? null;
    if (epUrl) {
      if (isManga) {
        await step("getPageList",  () => ext.getPageList(epUrl));
      } else {
        await step("getVideoList", () => ext.getVideoList(epUrl));
      }
    } else {
      const readKey = isManga ? "getPageList" : "getVideoList";
      result.steps[readKey] = { ok: false, error: "no chapter/episode URL found in detail" };
      result.ok = false;
    }
  } else {
    result.steps.getDetail  = { ok: false, error: "no popular item returned" };
    result.steps.cover      = { ok: false, error: "no popular item" };
    result.steps.getVideoList = result.steps.getPageList = { ok: false, error: "skipped" };
    result.ok = false;
  }

  return result;
}

function summarize(step, out) {
  if (!out) return null;
  if (["getPopular","getLatest","getLatestUpdates","search"].includes(step)) {
    const first = out.list?.[0];
    return { count: out.list?.length ?? 0, hasNext: !!out.hasNextPage,
      sample: first ? { name: snip(first.name,60), url: snip(first.url), imageUrl: snip(first.imageUrl,100) } : null };
  }
  if (step==="getDetail") {
    return { name: snip(out.name,80), chapters: out.chapters?.length??0, imageUrl: snip(out.imageUrl,100),
      sample: out.chapters?.[0] ? { name: snip(out.chapters[0].name,60), url: snip(out.chapters[0].url) } : null };
  }
  if (step==="getVideoList") {
    return { count: Array.isArray(out)?out.length:0,
      sample: out?.[0] ? { quality: out[0].quality, url: snip(out[0].url) } : null };
  }
  if (step==="getPageList") {
    return { count: Array.isArray(out)?out.length:0,
      sample: out?.[0] ? { url: snip(out[0]?.url ?? out[0]) } : null };
  }
  return null;
}

// ── Collect JS files by type ────────────────────────────────────
function collectFiles(typeFilter) {
  const files = [];
  const dirs  = typeFilter ? [typeFilter] : ["watch","manga","novel","anime","src"];
  for (const d of dirs) {
    const abs = path.join(ROOT, d);
    if (!fs.existsSync(abs)) continue;
    (function walk(dir) {
      for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        const full = path.join(dir, entry.name);
        if (entry.isDirectory()) { walk(full); continue; }
        if (entry.name.endsWith(".js") && !entry.name.endsWith(".min.js") && entry.name !== "server.js")
          files.push(path.relative(ROOT, full));
      }
    })(abs);
  }
  return files;
}

// ── Concurrency pool ────────────────────────────────────────────
async function pool(tasks, concurrency, onDone) {
  const results = [];
  let idx = 0;
  async function run() {
    while (idx < tasks.length) {
      const i = idx++;
      const r = await tasks[i]();
      results[i] = r;
      onDone(r, i, tasks.length);
    }
  }
  await Promise.all(Array.from({ length: concurrency }, run));
  return results;
}

// ── Main ────────────────────────────────────────────────────────
async function main() {
  const args = process.argv.slice(2);
  let typeFilter   = null;
  let singleFile   = null;
  let concurrency  = 8;
  let outputFile   = path.join(__dirname, "report.json");

  for (let i=0; i<args.length; i++) {
    if (args[i]==="--type"        && args[i+1]) { typeFilter  = args[++i]; }
    if (args[i]==="--file"        && args[i+1]) { singleFile  = args[++i]; }
    if (args[i]==="--concurrency" && args[i+1]) { concurrency = parseInt(args[++i])||8; }
    if (args[i]==="--out"         && args[i+1]) { outputFile  = args[++i]; }
  }

  const files = singleFile ? [singleFile] : collectFiles(typeFilter);
  process.stderr.write(`\n🔍 Watchtower Extension Tester\n`);
  process.stderr.write(`   Extensions : ${files.length}\n`);
  process.stderr.write(`   Concurrency: ${concurrency}\n`);
  process.stderr.write(`   Output     : ${outputFile}\n\n`);

  const start  = Date.now();
  const tasks  = files.map(f => () => runExtension(f));
  let   passed = 0, failed = 0;

  const results = await pool(tasks, concurrency, (r, i, total) => {
    const icon  = r.ok ? "✅" : "❌";
    const pct   = Math.round((i+1)/total*100);
    process.stderr.write(`  [${String(i+1).padStart(3)}/${total}] ${icon} ${String(pct).padStart(3)}% | ${r.name ?? r.file}\n`);
    if (r.ok) passed++; else failed++;
  });

  const elapsed = ((Date.now()-start)/1000).toFixed(1);
  process.stderr.write(`\n✅ Passed: ${passed}  ❌ Failed: ${failed}  ⏱ ${elapsed}s\n`);

  const report = {
    generatedAt: new Date().toISOString(),
    elapsed: parseFloat(elapsed),
    total: files.length,
    passed, failed,
    results
  };

  fs.writeFileSync(outputFile, JSON.stringify(report, null, 2));
  process.stderr.write(`\n📄 Report saved → ${outputFile}\n`);
  process.stderr.write(`   Open tools/report.html in a browser to view.\n\n`);
}

main().catch(e => { console.error(e); process.exit(1); });
