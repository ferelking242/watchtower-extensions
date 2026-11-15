#!/usr/bin/env node
/**
 * Regression checks for the AllManga GraphQL client.
 *
 * The bug being locked down: Cloudflare answers a GET with the query in the URL
 * with `403 cf-mitigated: challenge`, so the extension must POST the JSON body
 * and read `data` back. Covers and reader pages come back as relative CDN paths
 * (`mcovers/…`, `images133/…`), which must be prefixed with the youtube-anime
 * head, and a chapter with no picture must surface as an error rather than a
 * silent empty gallery.
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
const IMAGE_HEAD = "https://aln.youtube-anime.com";

function loadExtension(response) {
  const calls = [];
  const context = {
    MProvider: class {},
    SharedPreferences: class {
      get() {
        return null;
      }
    },
    Client: class {
      async post(url, headers, body) {
        calls.push({ url, headers, body });
        return typeof response === "function" ? response(url, body) : response;
      }
    },
  };
  vm.runInNewContext(
    `${extensionSource}\nglobalThis.AllMangaForTest = DefaultExtension;`,
    context,
  );
  return { provider: new context.AllMangaForTest(), calls };
}

const ok = (data) => ({ statusCode: 200, body: JSON.stringify({ data }) });

// ── 1. Every request is a POST with the JSON body and the CF-friendly headers ──
{
  const { provider, calls } = loadExtension(
    ok({
      queryPopular: {
        recommendations: Array.from({ length: 26 }, (_, i) => ({
          anyCard: {
            _id: `id${i}`,
            name: `Romaji ${i}`,
            englishName: `Title ${i}`,
            thumbnail: `mcovers/m_tbs/id${i}/001.webp`,
          },
        })),
      },
    }),
  );
  const page = await provider.getPopular(1);

  assert.equal(calls.length, 1, "one POST per page");
  assert.equal(calls[0].url, API);
  assert.equal(calls[0].headers["from-app"], "true");
  assert.equal(calls[0].headers["Content-Type"], "application/json");
  assert.match(String(calls[0].body.query), /queryPopular/);
  assert.equal(calls[0].body.variables.type, "manga");
  assert.equal(calls[0].body.variables.size, 26);
  assert.equal(calls[0].body.variables.dateRange, 1);
  assert.equal(calls[0].body.variables.page, 1);

  assert.equal(page.list.length, 26);
  assert.equal(page.list[0].name, "Title 0");
  assert.equal(page.list[0].link, "/manga/id0/romaji-0");
  assert.equal(page.hasNextPage, true);
}

// ── 2. Relative CDN covers are prefixed with the youtube-anime head ────────────
{
  const { provider } = loadExtension(
    ok({
      mangas: {
        edges: [
          {
            _id: "abc",
            name: "Series",
            englishName: "Series",
            thumbnail: "mcovers/m_tbs/abc/001.webp",
          },
          {
            _id: "abs",
            name: "Absolute",
            englishName: "Absolute",
            thumbnail: "https://cdn.example/already.jpg",
          },
          {
            _id: "jpg",
            name: "Legacy suffix",
            englishName: "Legacy suffix",
            thumbnail: "mcovers/m_tbs/jpg/001.jpg",
          },
        ],
      },
    }),
  );
  const page = await provider.search("series", 1, []);

  assert.equal(page.list[0].imageUrl, `${IMAGE_HEAD}/mcovers/m_tbs/abc/001.webp`);
  assert.equal(
    page.list[1].imageUrl,
    "https://cdn.example/already.jpg",
    "an absolute URL must not be prefixed",
  );
  assert.equal(
    page.list[2].imageUrl,
    `${IMAGE_HEAD}/mcovers/m_tbs/jpg/001.webp`,
    "the CDN only stores WebP, so a legacy .jpg suffix must be rewritten",
  );
}

// ── 3. A GraphQL error is surfaced, not parsed as a list ───────────────────────
{
  const { provider } = loadExtension({
    statusCode: 200,
    body: JSON.stringify({ errors: [{ message: "Cannot query field" }] }),
  });
  await assert.rejects(
    () => provider.getPopular(1),
    (error) => {
      assert.match(error.message, /\[AllManga\] GraphQL error/);
      assert.match(error.message, /Cannot query field/);
      return true;
    },
  );
}

// ── 4. A non-JSON body (Cloudflare interstitial) is reported clearly ───────────
{
  const { provider } = loadExtension({
    statusCode: 200,
    body: "<html><h1>Just a moment…</h1></html>",
  });
  await assert.rejects(
    () => provider.getPopular(1),
    (error) => {
      assert.match(error.message, /invalid JSON/);
      return true;
    },
  );
}

// ── 5. The detail query reads availableChaptersDetail as an untyped Object ─────
{
  const { provider, calls } = loadExtension(
    ok({
      manga: {
        name: "Series",
        englishName: "Series",
        thumbnail: "mcovers/m_tbs/series/001.webp",
        description: "desc",
        genres: ["Action"],
        status: "finished",
        score: 8.5,
        availableChaptersDetail: { sub: ["2", "1"], raw: [] },
      },
    }),
  );
  const detail = await provider.getDetail("/manga/series-id/series");

  assert.equal(detail.name, "Series");
  assert.equal(detail.imageUrl, `${IMAGE_HEAD}/mcovers/m_tbs/series/001.webp`);
  assert.equal(detail.status, 1);
  assert.equal(
    detail.chapters.map((c) => c.name).join(","),
    "Chapter 1,Chapter 2",
    "chapters are sorted numerically",
  );
  assert.equal(
    JSON.stringify(JSON.parse(detail.chapters[0].url)),
    JSON.stringify({ mangaId: "series-id", chapterString: "1", chapType: "sub" }),
  );
  assert.doesNotMatch(
    String(calls[0].body.query),
    /availableChaptersDetail\s*\{/,
    "availableChaptersDetail must be selected whole (it is an untyped Object)",
  );
}

// ── 6. Reader pages are absolute CDN URLs; an empty chapter is an error ────────
{
  const { provider } = loadExtension(
    ok({
      chaptersForRead: {
        edges: [
          {
            pictureUrlHead: null,
            pictureUrls: [
              { url: "images133/abc/1/sub_1/1.webp" },
              { url: "images133/abc/1/sub_1/2.webp" },
            ],
          },
        ],
      },
    }),
  );
  const pages = await provider.getPageList(
    JSON.stringify({ mangaId: "abc", chapterString: "1", chapType: "sub" }),
  );
  assert.equal(
    pages.join(","),
    [
      `${IMAGE_HEAD}/images133/abc/1/sub_1/1.webp`,
      `${IMAGE_HEAD}/images133/abc/1/sub_1/2.webp`,
    ].join(","),
  );

  const empty = loadExtension(ok({ chaptersForRead: { edges: [] } }));
  await assert.rejects(
    () =>
      empty.provider.getPageList(
        JSON.stringify({ mangaId: "abc", chapterString: "1" }),
      ),
    (error) => {
      assert.match(error.message, /did not contain page images/);
      return true;
    },
  );
}

console.log(
  "AllManga checks passed (POST client, CDN covers, GraphQL errors, detail and reader).",
);
