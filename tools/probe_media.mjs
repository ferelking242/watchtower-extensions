// Media probe — fetches a page and reports where playable media lives.
// Usage: node tools/probe_media.mjs <url> [referer]
// Env: SAVE=1 writes body to /tmp/probe_out.html for offline grepping.
import * as cheerio from "cheerio";

const url = process.argv[2];
if (!url) { console.error("usage: node tools/probe_media.mjs <url> [referer]"); process.exit(2); }
const referer = process.argv[3] || url;

const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36";
const ctrl = new AbortController();
const t = setTimeout(() => ctrl.abort(), 20000);
const headers = { "User-Agent": UA, "Referer": referer, "Accept-Language": "en-US,en;q=0.9", "Accept": "*/*" };
try {
  const res = await fetch(url, { headers, redirect: "follow", signal: ctrl.signal });
  const body = await res.text();
  console.log(`URL: ${url}\nSTATUS: ${res.status} final: ${res.url} LEN: ${body.length}`);
  console.log("TITLE:", (body.match(/<title[^>]*>([^<]{0,90})/i) || [])[1]?.trim() || "");
  if (process.env.SAVE) { const fs = await import("node:fs"); fs.writeFileSync("/tmp/probe_out.html", body); }

  const count = (re) => (body.match(re) || []).length;
  console.log(`\nm3u8=${count(/m3u8/gi)}  mp4=${count(/\.mp4["'\s?\\]/gi)}  iframe=${count(/<iframe/gi)}  video-tag=${count(/<video/gi)}  dash=${count(/\.mpd/gi)}`);

  const jsonBlob = body.match(/window\.__[A-Z_]+__\s*=\s*(\{.+?\});?\s*<\/script>/s) ||
                   body.match(/<script[^>]*id="__NEXT_DATA__"[^>]*>(\{.*?\})<\/script>/s) ||
                   body.match(/<script[^>]*id="__NUXT_DATA__"[^>]*>([\s\S]*?)<\/script>/s);
  if (jsonBlob) console.log("\nEMBEDDED JSON BLOB (first 300):", JSON.stringify(jsonBlob[1]).slice(0, 300));

  const hls = [...new Set([...body.matchAll(/https?:\\?\/\\?\/[^"'\s\\]+?\.m3u8[^"'\s\\]*/gi)].map(m => m[0].replace(/\\\//g, "/").replace(/\\u002F/g, "/")))].slice(0, 5);
  if (hls.length) console.log("\nHLS:", hls);
  const mp4 = [...new Set([...body.matchAll(/https?:\\?\/\\?\/[^"'\s\\]+?\.mp4[^"'\s\\]*/gi)].map(m => m[0].replace(/\\\//g, "/")))].slice(0, 5);
  if (mp4.length) console.log("MP4:", mp4);

  const $ = cheerio.load(body);
  const iframes = [];
  $("iframe, embed, object").each((_, el) => { const s = $(el).attr("src"); if (s) iframes.push(s); });
  if (iframes.length) console.log("IFRAMES:", iframes.slice(0, 5));

  // look for common player JSON markers
  for (const key of ["videoUrl", "video_url", "sources", "playlist", "master", "videoFile", "hlsUrl", "manifest", "data-src", "data-url", "stream"]) {
    const hits = [...new Set([...body.matchAll(new RegExp(`["']${key}["']\\s*[:=]\\s*["']([^"']{6,160})`, "g"))].map(m => m[1]))].slice(0, 4);
    if (hits.length) console.log(`${key}:`, hits);
  }
} catch (e) {
  console.log(`ERR: ${e.message}`);
} finally {
  clearTimeout(t);
}
