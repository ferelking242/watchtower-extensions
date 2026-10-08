#!/usr/bin/env node
/**
 * Regression checks for the AllManga GraphQL request wrapper.
 *
 * The bug being locked down: Cloudflare can answer with a localised interstitial
 * (French) or cut the connection outright. The extension only matched English
 * markers, and a cut connection surfaced as `statusCode: 0`, which the app
 * rendered as a bare “HTTP 0” with no URL to open in the bypass WebView.
 */
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const extensionSource = fs.readFileSync(
  path.join(root, "src/manga/en/allmanga.js"),
  "utf8",
);

const API = "https://api.allanime.day/api";

function loadExtension(response) {
  const requests = [];
  const context = {
    MProvider: class {},
    SharedPreferences: class {
      get() {
        return null;
      }
    },
    Client: class {
      async get(url, headers) {
        requests.push({ url, headers });
        return typeof response === "function" ? response(url) : response;
      }
    },
  };
  vm.runInNewContext(
    `${extensionSource}\nglobalThis.AllMangaForTest = DefaultExtension;`,
    context,
  );
  return { provider: new context.AllMangaForTest(), requests };
}

// ── 1. A cut connection (statusCode 0) names the anti-bot and the exact URL ──
{
  const { provider } = loadExtension({ statusCode: 0, body: "" });
  await assert.rejects(
    () => provider.getPopular(1),
    (error) => {
      assert.match(error.message, /Cloudflare blocked the API request/i);
      assert.match(error.message, /connection closed before any response/i);
      assert.match(error.message, /\(HTTP 0\)/);
      assert.ok(
        error.message.includes(`${API}?variables=`),
        "the error must carry the exact failing API URL",
      );
      return true;
    },
    "a cut connection must be reported as a Cloudflare block with the URL",
  );
}

// ── 2. A localised interstitial is detected, not parsed as JSON ──────────────
{
  const { provider } = loadExtension({
    statusCode: 200,
    body: "<html><h1>Vérification de sécurité en cours</h1></html>",
  });
  await assert.rejects(
    () => provider.getPopular(1),
    (error) => {
      assert.match(error.message, /Cloudflare challenge blocked/i);
      return true;
    },
    "a French Cloudflare interstitial must be reported as a challenge",
  );
}

// ── 3. A real HTTP error keeps its status and URL ────────────────────────────
{
  const { provider } = loadExtension({ statusCode: 503, body: "upstream down" });
  await assert.rejects(
    () => provider.getPopular(1),
    (error) => {
      assert.match(error.message, /API returned HTTP 503/);
      assert.ok(error.message.includes(`${API}?variables=`));
      return true;
    },
  );
}

// ── 4. A valid payload still parses into the expected list ───────────────────
{
  const payload = {
    data: {
      queryPopular: {
        recommendations: Array.from({ length: 26 }, (_, i) => ({
          anyCard: {
            _id: `id${i}`,
            name: `Romaji ${i}`,
            englishName: `Title ${i}`,
            thumbnail: `https://cdn.example/${i}.jpg`,
          },
        })),
      },
    },
  };
  const { provider } = loadExtension({ statusCode: 200, body: JSON.stringify(payload) });
  const page = await provider.getPopular(1);

  assert.equal(page.list.length, 26);
  assert.equal(page.list[0].name, "Title 0");
  assert.equal(page.list[0].link, "/manga/id0/romaji-0");
  assert.equal(page.hasNextPage, true);
}

console.log(
  "AllManga request checks passed (cut connection, localised interstitial, HTTP error, payload parse).",
);
