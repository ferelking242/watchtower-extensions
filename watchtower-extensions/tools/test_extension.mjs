// Watchtower extension test harness.
// Loads a .js extension, stubs MProvider/Client, and runs popular/latest/detail/video/pageList.
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";

const TIMEOUT_MS = 25000;

class Client {
  constructor() {}
  async _fetch(method, url, headers, body) {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
    try {
      const res = await fetch(url, {
        method,
        headers: headers || {},
        body: body ?? undefined,
        redirect: "follow",
        signal: ctrl.signal,
      });
      const text = await res.text();
      const hdrs = {};
      res.headers.forEach((v, k) => { hdrs[k] = v; });
      return { statusCode: res.status, body: text, headers: hdrs, url: res.url };
    } finally {
      clearTimeout(t);
    }
  }
  async get(url, headers) { return this._fetch("GET", url, headers); }
  async post(url, body, headers) {
    let b = body;
    let h = { ...(headers || {}) };
    if (b && typeof b === "object" && !(b instanceof URLSearchParams) && !Buffer.isBuffer(b)) {
      b = JSON.stringify(b);
      if (!h["Content-Type"] && !h["content-type"]) h["Content-Type"] = "application/json";
    }
    return this._fetch("POST", url, h, b);
  }
  async head(url, headers) { return this._fetch("HEAD", url, headers); }
}

class MProvider {
  constructor() { this.source = null; }
}

function loadExtension(filePath) {
  const code = fs.readFileSync(filePath, "utf8");
  const sandbox = {
    MProvider, Client,
    console, setTimeout, clearTimeout, setInterval, clearInterval,
    URL, URLSearchParams, TextDecoder, TextEncoder, fetch, Buffer,
    watchtowerSources: undefined,
    mangayomiSources: undefined,
    DefaultExtension: undefined,
  };
  vm.createContext(sandbox);
  const wrapped = code + `\n;this.__exports = {
    watchtowerSources: typeof watchtowerSources!=='undefined'?watchtowerSources:(typeof mangayomiSources!=='undefined'?mangayomiSources:null),
    DefaultExtension: typeof DefaultExtension!=='undefined'?DefaultExtension:null
  };`;
  vm.runInContext(wrapped, sandbox, { filename: path.basename(filePath), timeout: 10000 });
  return sandbox.__exports;
}

function snippet(s, n=200) {
  if (s == null) return String(s);
  const str = typeof s === "string" ? s : JSON.stringify(s);
  return str.length > n ? str.slice(0, n) + "…" : str;
}

async function withTimeout(promise, ms, label) {
  let to;
  const t = new Promise((_, rej) => { to = setTimeout(() => rej(new Error(`${label} timeout ${ms}ms`)), ms); });
  try { return await Promise.race([promise, t]); }
  finally { clearTimeout(to); }
}

async function runOne(filePath, opts = {}) {
  const result = { file: filePath, name: null, steps: {}, ok: true, errors: [] };
  let exp;
  try { exp = loadExtension(filePath); }
  catch (e) { result.ok = false; result.errors.push(`load: ${e.message}`); return result; }

  if (!exp.watchtowerSources || !exp.DefaultExtension) {
    result.ok = false; result.errors.push("missing watchtowerSources or DefaultExtension"); return result;
  }
  const src = exp.watchtowerSources[0];
  result.name = src.name;
  result.baseUrl = src.baseUrl;
  result.itemType = src.itemType ?? 1;
  result.iconUrl = src.iconUrl ?? "";
  result.lang = src.lang ?? "?";

  const ext = new exp.DefaultExtension();
  ext.source = { ...src, prefs: [] };

  async function step(name, fn) {
    const t0 = Date.now();
    try {
      const out = await withTimeout(Promise.resolve().then(fn), TIMEOUT_MS + 5000, name);
      result.steps[name] = { ok: true, ms: Date.now() - t0, info: summarize(name, out) };
      return out;
    } catch (e) {
      result.ok = false;
      result.steps[name] = { ok: false, ms: Date.now() - t0, error: e.message };
      result.errors.push(`${name}: ${e.message}`);
      return null;
    }
  }

  const popular = await step("getPopular", () => ext.getPopular(1));
  await step("getLatest", () => ext.getLatestUpdates(1));
  await step("search", () => ext.search(opts.query || "a", 1, []));

  let detailUrl = popular?.list?.[0]?.url ?? null;
  let detail = null;
  if (detailUrl) {
    detail = await step("getDetail", () => ext.getDetail(detailUrl));
    const hasCover = !!(detail?.imageUrl || popular?.list?.[0]?.imageUrl);
    result.steps.cover = { ok: hasCover, info: hasCover ? popular?.list?.[0]?.imageUrl : null };
    let epUrl = detail?.chapters?.[0]?.url ?? null;
    if (epUrl) {
      const isManga = src.itemType === 0 || src.isManga;
      if (isManga) {
        await step("getPageList", () => ext.getPageList(epUrl));
      } else {
        await step("getVideoList", () => ext.getVideoList(epUrl));
      }
    } else {
      const key = src.isManga ? "getPageList" : "getVideoList";
      result.steps[key] = { ok: false, error: "no episode/chapter url" };
    }
  } else {
    result.steps.getDetail = { ok: false, error: "no popular item to test" };
    result.steps.cover = { ok: false, error: "no popular item" };
  }
  return result;
}

function summarize(step, out) {
  if (!out) return null;
  if (["getPopular","search","getLatest","getLatestUpdates"].includes(step)) {
    return { count: out.list?.length ?? 0, hasNext: !!out.hasNextPage, sample: out.list?.[0] ? { name: out.list[0].name, url: out.list[0].url, imageUrl: out.list[0].imageUrl } : null };
  }
  if (step === "getDetail") {
    return { name: snippet(out.name,80), chapters: out.chapters?.length ?? 0, imageUrl: out.imageUrl, sample: out.chapters?.[0] ? { name: out.chapters[0].name, url: out.chapters[0].url } : null };
  }
  if (step === "getVideoList") {
    return { count: Array.isArray(out) ? out.length : 0, sample: Array.isArray(out) && out[0] ? { quality: out[0].quality, url: snippet(out[0].url,120) } : null };
  }
  if (step === "getPageList") {
    return { count: Array.isArray(out) ? out.length : 0, sample: Array.isArray(out) && out[0] ? { url: snippet(out[0].url ?? out[0],120) } : null };
  }
  return out;
}

async function main() {
  const args = process.argv.slice(2);
  if (args.length === 0) { console.error("usage: node test_extension.mjs <file.js> [<file.js>...]"); process.exit(2); }
  const out = [];
  for (const f of args) {
    process.stderr.write(`>> ${f}\n`);
    const r = await runOne(f);
    out.push(r);
    process.stderr.write(`   ${r.ok ? "✅ OK" : "❌ FAIL"} (${r.errors.length} err)\n`);
  }
  console.log(JSON.stringify(out, null, 2));
}
main().catch(e => { console.error(e); process.exit(1); });
