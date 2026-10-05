import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

function loadExtension(handler, preferences = {}) {
  const calls = [];

  class Client {
    async get(url, headers = {}) {
      calls.push({ method: "GET", url, headers });
      return handler(url, headers);
    }

    async post(url, options = {}) {
      calls.push({ method: "POST", url, headers: options.headers || {} });
      return handler(url, options.headers || {});
    }
  }

  class MProvider {
    constructor() {
      this.source = null;
    }
  }

  class SharedPreferences {
    get(key) {
      return preferences[key] ?? null;
    }
  }

  const sandbox = {
    Client,
    MProvider,
    SharedPreferences,
    console,
    setTimeout,
    clearTimeout,
    URL,
    URLSearchParams,
    TextEncoder,
    TextDecoder,
    Buffer,
  };
  vm.createContext(sandbox);
  const sourcePath = path.join(root, "src/watch/fr/frenchstream.js");
  const sourceCode = fs.readFileSync(sourcePath, "utf8");
  vm.runInContext(sourceCode + "\n;this.Extension = DefaultExtension;", sandbox, {
    filename: sourcePath,
    timeout: 10000,
  });

  return { extension: new sandbox.Extension(), calls };
}

function response(url, body, statusCode = 200) {
  return { url, body, statusCode, headers: {} };
}

async function testCatalogLayout() {
  const catalog = JSON.parse(fs.readFileSync(path.join(root, "index/watch.json"), "utf8"));
  const source = catalog.find((item) => item.id === 1900000067);
  const layoutPath = path.join(root, source.uiLayout);
  const layout = JSON.parse(fs.readFileSync(layoutPath, "utf8"));
  const sectionIds = layout.home.sections.map((section) => section.id);
  const extensionCode = fs.readFileSync(
    path.join(root, "src/watch/fr/frenchstream.js"),
    "utf8",
  );

  assert.equal(source.uiLayout, "ui-layouts/frenchstream.json");
  assert.equal(source.uiLayoutVersion, "1.0.0");
  assert.equal(source.version, "1.0.1");
  assert.ok(sectionIds.length > 2, "French-Stream layout should define more than two sections");
  assert.equal(new Set(sectionIds).size, sectionIds.length, "layout section IDs should be unique");
  for (const id of sectionIds) {
    assert.ok(extensionCode.includes(`case "${id}":`), `missing custom-list handler for ${id}`);
  }
}

async function testFilmApiResolvesPlayableMedia() {
  const pageUrl = "https://french-stream.net/index.php?newsid=12345";
  const playerUrl = "https://vidzy.example/embed/film";
  const streamUrl = "https://cdn.example/master.m3u8";
  const { extension, calls } = loadExtension(async (url) => {
    if (url === pageUrl) {
      return response(url, '<div id="film-data" data-newsid="12345"></div>');
    }
    if (url.includes("/engine/ajax/film_api.php?id=12345")) {
      return response(url, JSON.stringify({ players: { vidzy: { default: playerUrl } } }));
    }
    if (url === playerUrl) {
      return response(
        url,
        `var playerData = {"sources":[{"file":"${streamUrl}","label":"1080p"}]};`,
      );
    }
    throw new Error(`Unexpected test request: ${url}`);
  });

  const videos = await extension.getVideoList(pageUrl);
  assert.equal(videos.length, 1);
  assert.equal(videos[0].url, streamUrl);
  assert.equal(videos[0].originalUrl, streamUrl);
  assert.equal(videos[0].quality, "1080p");
  assert.ok(calls.some((call) => call.url.includes("/engine/ajax/film_api.php?id=12345")));
  assert.ok(calls.some((call) => call.url === playerUrl));
}

async function testDirectMediaAndEmptyResults() {
  const pageUrl = "https://french-stream.net/index.php?newsid=67890";
  const directUrl = "https://cdn.example/video.mp4?signature=test";
  const direct = loadExtension(async (url) => {
    if (url === pageUrl) {
      return response(url, `<script>var file = "${directUrl}";</script>`);
    }
    throw new Error(`A direct media URL should not trigger another request: ${url}`);
  });

  const directVideos = await direct.extension.getVideoList(pageUrl);
  assert.equal(directVideos.length, 1);
  assert.equal(directVideos[0].url, directUrl);
  assert.equal(directVideos[0].originalUrl, directUrl);

  const empty = loadExtension(async (url) => {
    if (url === pageUrl) return response(url, '<div id="film-data"></div>');
    if (url.includes("/engine/ajax/film_api.php?id=67890")) {
      return response(url, JSON.stringify({ players: {} }));
    }
    throw new Error(`Unexpected test request: ${url}`);
  });
  const emptyVideos = await empty.extension.getVideoList(pageUrl);
  assert.deepEqual(Array.from(emptyVideos), []);
}

await testCatalogLayout();
await testFilmApiResolvesPlayableMedia();
await testDirectMediaAndEmptyResults();
console.log("French-Stream tests passed (layout metadata, film API resolution, video contract).");
