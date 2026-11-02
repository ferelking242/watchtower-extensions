#!/usr/bin/env node
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { fileURLToPath } from "node:url";
import { Document } from "./html_document.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const extensionSource = fs.readFileSync(
  path.join(root, "src/nsfw/watch/en/pornhub.js"),
  "utf8",
);

const attempts = [];
const fixture = `
  <ul>
    <li class="pcVideoListItem">
      <a href="/view_video.php?viewkey=fixture" title="Example clip">
        <img data-image="https://img.example/cover.jpg" alt="Example clip">
      </a>
    </li>
  </ul>`;

class TestClient {
  constructor(options) {
    this.options = JSON.parse(JSON.stringify(options || {}));
  }

  async get(url) {
    attempts.push({ url, options: this.options });
    if (this.options.browserFetchOnError === true) {
      return { statusCode: 200, body: fixture };
    }
    throw new Error("HTTP transport failed before receiving a response");
  }
}

const context = {
  MProvider: class {},
  Document,
  Client: TestClient,
  SharedPreferences: class {},
  extLog: () => {},
  URL,
};

vm.runInNewContext(
  `${extensionSource}\nglobalThis.PornHubForTest = DefaultExtension;`,
  context,
);

const provider = new context.PornHubForTest();
const result = await provider.getPopular(1);

assert.equal(attempts.length, 3, "the final direct transport opts into browser fallback");
assert.equal(attempts[2].options.browserFetchOnError, true);
assert.equal(result.list.length, 1);
assert.equal(result.list[0].name, "Example clip");
assert.equal(result.list[0].imageUrl, "https://img.example/cover.jpg");
assert.equal(result.list[0].link, "https://www.pornhub.com/view_video.php?viewkey=fixture");

console.log("PornHub browser-fallback opt-in and cover parsing passed.");
