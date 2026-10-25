// Live tracing harness: runs the real French-Stream extension against the real site.
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";

const root = path.resolve(import.meta.dirname ?? ".", "..");

const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36";

class Client {
  async get(url, headers = {}) {
    const t0 = Date.now();
    try {
      const res = await fetch(url, { headers: { ...headers, "User-Agent": headers["User-Agent"] || UA }, redirect: "follow" });
      const body = await res.text();
      console.log(`  GET ${res.status} (${Date.now() - t0}ms) ${url.slice(0, 110)}  [${body.length}b]`);
      return { url, body, statusCode: res.status, headers: {} };
    } catch (e) {
      console.log(`  GET FAIL (${Date.now() - t0}ms) ${url.slice(0, 110)} :: ${e.message}`);
      throw e;
    }
  }
  async post(url, options = {}) {
    const t0 = Date.now();
    const res = await fetch(url, { method: "POST", headers: { ...(options.headers || {}), "User-Agent": UA }, body: options.body, redirect: "follow" });
    const body = await res.text();
    console.log(`  POST ${res.status} (${Date.now() - t0}ms) ${url.slice(0, 110)}`);
    return { url, body, statusCode: res.status, headers: {} };
  }
}

class MProvider { constructor() { this.source = null; } }
class SharedPreferences {
  get(key) { return null; }
}

const sandbox = { Client, MProvider, SharedPreferences, console, setTimeout, clearTimeout, URL, URLSearchParams, TextEncoder, TextDecoder, Buffer };
vm.createContext(sandbox);
const sourcePath = path.join(root, "src/watch/fr/frenchstream.js");
const code = fs.readFileSync(sourcePath, "utf8");
vm.runInContext(code + "\n;this.Extension = DefaultExtension;", sandbox, { filename: sourcePath, timeout: 60000 });

const ext = new sandbox.Extension();

const NEWS = "15138617";
const pageUrl = `https://french-stream.net/index.php?newsid=${NEWS}`;

console.log("== getDetail");
const detail = await ext.getDetail(pageUrl);
console.log("detail:", detail.name, "| chapters:", detail.chapters?.length);
const epUrl = detail.chapters?.find(c => /Épisode 1/.test(c.name || ""))?.url;
console.log("ep1 url:", epUrl);
if (!epUrl) process.exit(0);

console.log("== getVideoList");
const t0 = Date.now();
const videos = await ext.getVideoList(epUrl);
console.log(`videos: ${videos.length} in ${Date.now() - t0}ms`);
for (const v of videos.slice(0, 3)) console.log("  →", v.quality, v.url.slice(0, 130));
