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
import { Document } from "./html_document.mjs";

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

// ── Load & run one extension ────────────────────────────────────
function loadExtension(filePath) {
  const code    = fs.readFileSync(filePath, "utf8");
  const sandbox = {
    MProvider, Client, SharedPreferences, Document,
    extLog: () => {},
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

function mediaUrl(url) {
  try {
    const parsed = new URL(String(url));
    return `${parsed.origin}${parsed.pathname}`;
  } catch {
    return String(url || "").split("?")[0];
  }
}

async function probeMedia(video, pageUrl) {
  const url = String(video?.url || "").trim();
  if (!url) return { ok: false, error: "video URL is empty" };
  const headers = { ...(video?.headers || {}) };
  headers.Range = "bytes=0-2047";
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 15000);
  try {
    const response = await fetch(url, {
      headers,
      redirect: "follow",
      signal: controller.signal,
    });
    const contentType = response.headers.get("content-type") || "";
    const body = await response.text();
    const isHls = /\.m3u8(?:[?#]|$)/i.test(url) || /mpegurl/i.test(contentType);
    const validBody = isHls
      ? body.includes("#EXTM3U")
      : response.status === 200 || response.status === 206
        ? /video|octet-stream|mp4/i.test(contentType) || /\.(mp4|webm)(?:[?#]|$)/i.test(url)
        : false;
    return {
      ok: response.status >= 200 && response.status < 300 && validBody,
      status: response.status,
      kind: isHls ? "hls" : "media",
      contentType,
      url: mediaUrl(response.url || url),
      error: response.status >= 200 && response.status < 300 && validBody ? undefined : "response is not a readable media stream",
    };
  } catch (error) {
    return { ok: false, url: mediaUrl(url), error: error.message };
  } finally {
    clearTimeout(timer);
  }
}

function uniqueKeys(items) {
  return new Set((Array.isArray(items) ? items : [])
    .map((item) => String(item?.url || item?.link || "").trim())
    .filter(Boolean));
}

function overlapRatio(first, second) {
  const a = uniqueKeys(first);
  const b = uniqueKeys(second);
  if (!a.size || !b.size) return 0;
  let overlap = 0;
  for (const key of a) if (b.has(key)) overlap += 1;
  return overlap / Math.min(a.size, b.size);
}

function itemUrl(item) {
  return item?.url || item?.link || null;
}

async function runExtension(relPath, options = {}) {
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
  if (options.strict && (!popular?.list?.length || !popular.list.every((item) => item?.url || item?.link))) {
    result.ok = false;
    result.errors.push("getPopular: empty result or missing item URL");
  }

  if (options.deep && popular?.hasNextPage) {
    const pageTwo = await step("getPopularPage2", () => ext.getPopular(2));
    const ratio = overlapRatio(popular.list, pageTwo?.list);
    result.steps.pagination = {
      ok: !!pageTwo?.list?.length && ratio < 0.8,
      page1Count: popular.list?.length || 0,
      page2Count: pageTwo?.list?.length || 0,
      overlapRatio: Number(ratio.toFixed(3)),
    };
    if (!result.steps.pagination.ok) {
      result.ok = false;
      result.errors.push(
        `pagination: page 2 is empty or repeats page 1 (${Math.round(ratio * 100)}% overlap)`,
      );
    }
  }

  // 2. getLatest
  const latest = await step("getLatest", () => ext.getLatestUpdates(1));
  if (options.strict && (!latest?.list?.length || !latest.list.every((item) => item?.url || item?.link))) {
    result.ok = false;
    result.errors.push("getLatest: empty result or missing item URL");
  }
  if (options.deep && latest?.hasNextPage) {
    const latestPageTwo = await step("getLatestPage2", () => ext.getLatestUpdates(2));
    const ratio = overlapRatio(latest.list, latestPageTwo?.list);
    result.steps.latestPagination = {
      ok: !!latestPageTwo?.list?.length && ratio < 0.8,
      page1Count: latest.list?.length || 0,
      page2Count: latestPageTwo?.list?.length || 0,
      overlapRatio: Number(ratio.toFixed(3)),
    };
    if (!result.steps.latestPagination.ok) {
      result.ok = false;
      result.errors.push(`latest pagination: page 2 is empty or repeats page 1 (${Math.round(ratio * 100)}% overlap)`);
    }
  }

  // 3. search (short query to avoid blank results)
  const search = await step("search", () => ext.search("a", 1, []));
  if (options.strict && (!search?.list?.length || !search.list.every((item) => item?.url || item?.link))) {
    result.ok = false;
    result.errors.push("search: empty result or missing item URL");
  }
  if (options.deep && search?.hasNextPage) {
    const searchPageTwo = await step("searchPage2", () => ext.search("a", 2, []));
    const ratio = overlapRatio(search.list, searchPageTwo?.list);
    result.steps.searchPagination = {
      ok: !!searchPageTwo?.list?.length && ratio < 0.8,
      page1Count: search.list?.length || 0,
      page2Count: searchPageTwo?.list?.length || 0,
      overlapRatio: Number(ratio.toFixed(3)),
    };
    if (!result.steps.searchPagination.ok) {
      result.ok = false;
      result.errors.push(`search pagination: page 2 is empty or repeats page 1 (${Math.round(ratio * 100)}% overlap)`);
    }
  }

  // 4. getDetail on first popular result
  const firstItem = popular?.list?.[0];
  const firstItemUrl = itemUrl(firstItem);
  if (firstItemUrl) {
    const detail = await step("getDetail", () => ext.getDetail(firstItemUrl));

    // 5. cover check
    const cover = detail?.imageUrl || firstItem?.imageUrl;
    result.steps.cover = { ok: !!cover, info: cover ? snip(cover) : null };
    if (options.strict && !cover) {
      result.ok = false;
      result.errors.push("getDetail: no cover image returned");
    }

    // 6. read (getPageList for manga, getVideoList for watch/novel)
    const isManga = result.itemType === 0 || src.isManga === true;
    const epUrl   = detail?.chapters?.[0]?.url ?? detail?.episodes?.[0]?.url ?? null;
    if (epUrl) {
      if (isManga) {
        const pages = await step("getPageList",  () => ext.getPageList(epUrl));
        if (options.strict && (!Array.isArray(pages) || !pages.length)) {
          result.ok = false;
          result.errors.push("getPageList: no readable pages returned");
        }
      } else {
        const videos = await step("getVideoList", () => ext.getVideoList(epUrl));
        if (options.strict && (!Array.isArray(videos) || !videos.length)) {
          result.ok = false;
          result.errors.push("getVideoList: no playable stream returned");
        }
        if (options.deep && Array.isArray(videos) && videos.length) {
          const probes = [];
          for (const video of videos.slice(0, 3)) probes.push(await probeMedia(video, epUrl));
          result.steps.videoProbe = {
            ok: probes.some((probe) => probe.ok),
            tested: probes.length,
            passed: probes.filter((probe) => probe.ok).length,
            probes,
          };
          if (!result.steps.videoProbe.ok) {
            result.ok = false;
            result.errors.push("videoProbe: no returned stream accepted a readable media response");
          }
        }
      }
    } else {
      const readKey = isManga ? "getPageList" : "getVideoList";
      result.steps[readKey] = { ok: false, error: "no chapter/episode URL found in detail" };
      result.errors.push(`${readKey}: no chapter/episode URL found in detail`);
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
      sample: first ? { name: snip(first.name,60), url: snip(itemUrl(first)), imageUrl: snip(first.imageUrl,100) } : null };
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
  const dirs  = typeFilter
    ? [typeFilter.startsWith("src/") ? typeFilter : `src/${typeFilter}`]
    : ["src"];
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
  const selectedFiles = [];
  let concurrency  = 8;
  let outputFile   = path.join(__dirname, "report.json");

  for (let i=0; i<args.length; i++) {
    if (args[i]==="--type"        && args[i+1]) { typeFilter  = args[++i]; }
    if (args[i]==="--file"        && args[i+1]) { selectedFiles.push(args[++i]); }
    if (args[i]==="--files"       && args[i+1]) {
      selectedFiles.push(...args[++i].split(",").map((file) => file.trim()).filter(Boolean));
    }
    if (args[i]==="--concurrency" && args[i+1]) { concurrency = parseInt(args[++i])||8; }
    if (args[i]==="--out"         && args[i+1]) { outputFile  = args[++i]; }
  }
  const deep = args.includes("--deep");
  const strict = args.includes("--strict") || deep;

  const files = selectedFiles.length ? selectedFiles : collectFiles(typeFilter);
  process.stderr.write(`\n🔍 Watchtower Extension Tester\n`);
  process.stderr.write(`   Extensions : ${files.length}\n`);
  process.stderr.write(`   Concurrency: ${concurrency}\n`);
  process.stderr.write(`   Output     : ${outputFile}\n\n`);

  const start  = Date.now();
  const tasks  = files.map(f => () => runExtension(f, { deep, strict }));
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
