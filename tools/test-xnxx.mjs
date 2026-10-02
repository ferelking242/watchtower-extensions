#!/usr/bin/env node
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { fileURLToPath } from "node:url";
import { Document } from "./html_document.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const extensionSource = fs.readFileSync(
  path.join(root, "src/nsfw/watch/en/xnxx.js"),
  "utf8",
);

let response = { statusCode: 200, body: "" };
let clientError = null;
const logs = [];
class TestClient {
  async get() {
    if (clientError) throw clientError;
    return response;
  }
}

const context = {
  MProvider: class {},
  Document,
  Client: TestClient,
  SharedPreferences: class {},
  extLog: (level, message) => logs.push({ level, message }),
  URL,
};
vm.runInNewContext(
  `${extensionSource}\nglobalThis.XnxxForTest = DefaultExtension;`,
  context,
);

const provider = new context.XnxxForTest();
const fixture = `
  <div class="thumb-block video">
    <a class="thumb-link" href="/video-one/test">
      <img data-src="//img.example/one.jpg" />
    </a>
    <div class="thumb-under">
      <a title="First listing" href="/video-one/test">First listing</a>
      <span class="metadata">12 min</span>
    </div>
  </div>
  <div class="thumb-block video">
    <a class="thumb-link" href="/video-two/test">
      <img src="https://img.example/two.jpg" />
    </a>
    <div class="thumb-under">
      <a title="Second listing" href="/video-two/test">Second listing</a>
    </div>
  </div>`;

const parsed = provider._parseVideoList(fixture, 1, "hits");
assert.equal(parsed.list.length, 2);
assert.equal(parsed.list[0].name, "First listing");
assert.equal(parsed.list[0].link, "https://www.xnxx.com/video-one/test");
assert.equal(parsed.list[0].imageUrl, "//img.example/one.jpg");
assert.equal(provider._parseVideoList("<html></html>", 1, "hits").list.length, 0);
assert.ok(logs.some(({ message }) => message.includes("parsed zero video cards")));

response = { statusCode: 200, body: fixture };
const loaded = await provider._get("/hits/1");
assert.equal(provider._parseVideoList(loaded.body, 1, "hits").list.length, 2);

response = {
  statusCode: 403,
  body: "<html><title>Attention Required! | Cloudflare</title><div id='cf-chl'></div>",
};
await assert.rejects(provider._get("/hits/1"), /Cloudflare verification/);

response = { statusCode: 503, body: "Service unavailable" };
await assert.rejects(provider._get("/hits/1"), /HTTP 503/);

clientError = new Error("connection timed out");
await assert.rejects(provider._get("/hits/1"), /request failed.*timed out/);

assert.ok(logs.some(({ message }) => message.includes("blocked by Cloudflare")));
assert.ok(logs.some(({ message }) => message.includes("route=/hits/1 status=503")));

console.log("XNXX regression checks passed (listing parsing, Cloudflare, HTTP, network).");