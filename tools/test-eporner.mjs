#!/usr/bin/env node
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { fileURLToPath } from "node:url";
import { Document } from "./html_document.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const extensionSource = fs.readFileSync(
  path.join(root, "src/nsfw/watch/en/eporner.js"),
  "utf8",
);

const requests = [];
const html = `
  <div class="mb">
    <a href="/video-anchor-title/" title="Explicit anchor title">
      <img alt="Image alt must lose to the anchor title"
           data-src="//images.example/anchor.jpg" />
    </a>
    <span class="duration">10:05</span>
  </div>
  <div class="mb">
    <a href="/video-alt-title/">
      <img alt="Accessible image title" src="/images/alt.jpg" />
    </a>
    <strong>Legacy title must lose to image alt</strong>
  </div>
  <div class="mb">
    <a href="/video-trimmed-title/" title=" ">
      <img alt="Trimmed fallback title" src="/images/trimmed.jpg" />
    </a>
  </div>
  <div class="mb">
    <a href="//www.eporner.com/video-strong-title/">
      <img src="https://images.example/strong.jpg" alt="" />
    </a>
    <strong>Strong fallback title</strong>
  </div>
  <a class="next" href="/2/recent/">Next</a>
`;

class TestClient {
  async get(url) {
    requests.push(url);
    return { statusCode: 200, body: html };
  }
}

const context = {
  MProvider: class {},
  Client: TestClient,
  Document,
  URL,
};
vm.runInNewContext(
  `${extensionSource}\nglobalThis.EpornerForTest = DefaultExtension;`,
  context,
);

const provider = new context.EpornerForTest();
const firstPage = await provider.getLatestUpdates(1);
const secondPage = await provider.getLatestUpdates(2);

assert.deepEqual(requests, [
  "https://www.eporner.com/recent/",
  "https://www.eporner.com/2/recent/",
]);
assert.equal(firstPage.list.length, 4);
assert.equal(firstPage.list[0].name, "Explicit anchor title");
assert.equal(firstPage.list[1].name, "Accessible image title");
assert.equal(firstPage.list[2].name, "Trimmed fallback title");
assert.equal(firstPage.list[3].name, "Strong fallback title");
assert.equal(firstPage.list[0].imageUrl, "https://images.example/anchor.jpg");
assert.equal(firstPage.list[1].imageUrl, "https://www.eporner.com/images/alt.jpg");
assert.deepEqual(
  Array.from(firstPage.list, (item) => item.link),
  [
    "https://www.eporner.com/video-anchor-title/",
    "https://www.eporner.com/video-alt-title/",
    "https://www.eporner.com/video-trimmed-title/",
    "https://www.eporner.com/video-strong-title/",
  ],
);
assert.ok(firstPage.list.every((item) => {
  const link = new URL(item.link);
  return link.protocol === "https:" && !!link.hostname;
}));
assert.equal(firstPage.hasNextPage, true);
assert.equal(secondPage.list.length, 4);

console.log("Eporner parser checks passed (latest routes, title fallbacks, and absolute URLs).");
