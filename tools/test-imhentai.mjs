#!/usr/bin/env node
/**
 * Regression checks for the IMHentai listing parser.
 *
 * The bug being locked down: IMHentai answers a challenged request with a 200
 * interstitial served in the page language (French here). The extension used an
 * English-only marker list, so the interstitial was parsed as a listing, matched
 * zero `div.thumb` cards, and the app showed a silent empty screen. The parser
 * must now (a) recognise localised interstitials and (b) refuse to report a
 * 200 page with no gallery card as a legitimately empty listing.
 */
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { fileURLToPath } from "node:url";
import { Document } from "./html_document.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const extensionSource = fs.readFileSync(
  path.join(root, "src/nsfw/manga/en/imhentai.js"),
  "utf8",
);

const card = (i) => `
  <div class="thumb">
    <a href="/gallery/${1000 + i}/doujin-${i}/">
      <div class="inner_thumb">
        <img class="lazy" data-src="//cdn.example/${i}.jpg" alt="Cover ${i}" />
      </div>
    </a>
    <div class="caption"><a href="/gallery/${1000 + i}/doujin-${i}/">Doujin ${i}</a></div>
  </div>`;

const listingHtml = `
  <div class="galleries_info"></div>
  ${Array.from({ length: 20 }, (_, i) => card(i + 1)).join("\n")}
  <div class="pagination"><a href="?key=&amp;pp=1&amp;page=2">2</a></div>
`;

// Cloudflare serves the interstitial in the visitor's language.
const frenchInterstitial = `
  <html><head><title>Un instant…</title></head>
  <body><h1>Vérification de sécurité en cours</h1>
  <p>Vérification de sécurité en cours. Cette vérification permet de confirmer
  que vous êtes une personne et vous donne accès au site.</p>
  <script src="/cdn-cgi/challenge-platform/h/b/orchestrate/chl_page/v1"></script>
  </body></html>
`;

const shellHtml = `<html><body><div class="galleries_info"></div></body></html>`;

function loadExtension(response) {
  const requests = [];
  const context = {
    MProvider: class {},
    Document,
    Client: class {
      async get(url) {
        requests.push(url);
        return typeof response === "function" ? response(url) : response;
      }
    },
  };
  vm.runInNewContext(
    `${extensionSource}\nglobalThis.IMHentaiForTest = DefaultExtension;`,
    context,
  );
  return { provider: new context.IMHentaiForTest(), requests };
}

// ── 1. A localised interstitial is reported, not parsed as an empty listing ──
{
  const { provider } = loadExtension({ statusCode: 200, body: frenchInterstitial });
  await assert.rejects(
    () => provider.getPopular(1),
    (error) => {
      assert.match(error.message, /Cloudflare challenge detected/i);
      return true;
    },
    "a French Cloudflare interstitial must be reported as a challenge",
  );
}

// ── 2. A 200 shell with no card is never a legitimate empty listing ──────────
{
  const { provider } = loadExtension({ statusCode: 200, body: shellHtml });
  await assert.rejects(
    () => provider.getPopular(1),
    (error) => {
      assert.match(error.message, /no gallery card/i);
      assert.match(error.message, /HTTP 200/i);
      return true;
    },
    "an empty 200 page must surface the real cause instead of an empty screen",
  );
}

// ── 3. A real listing still parses, with absolute links and pagination ───────
{
  const { provider, requests } = loadExtension({ statusCode: 200, body: listingHtml });
  const page = await provider.getPopular(1);

  assert.deepEqual(requests, ["https://imhentai.xxx/search/?key=&pp=1&page=1"]);
  assert.equal(page.list.length, 20);
  assert.equal(page.list[0].name, "Doujin 1");
  assert.equal(page.list[0].link, "https://imhentai.xxx/gallery/1001/doujin-1/");
  assert.equal(page.list[0].imageUrl, "https://cdn.example/1.jpg");
  assert.ok(page.list.every((item) => item.link.startsWith("https://imhentai.xxx/")));
  assert.equal(page.hasNextPage, true);
}

// ── 4. An HTTP error is reported before the body is parsed ───────────────────
{
  const { provider } = loadExtension({ statusCode: 403, body: "" });
  await assert.rejects(
    () => provider.getPopular(1),
    (error) => {
      assert.match(error.message, /Cloudflare challenge detected/i);
      assert.match(error.message, /HTTP 403/);
      return true;
    },
    "a 403 must be reported as a challenge, not parsed",
  );
}

console.log(
  "IMHentai parser checks passed (localised interstitials, empty 200 page, listing parse, HTTP errors).",
);
