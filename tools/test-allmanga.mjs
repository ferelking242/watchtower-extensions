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
const READER_HEAD = "https://ytimgf.youtube-anime.com";

function loadExtension(response) {
  const calls = [];
  const timers = [];
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
    // The extension retries a throttled call after a delay; the test records the
    // delay and resolves immediately so it never waits in real time.
    setTimeout: (fn, ms) => {
      timers.push(ms);
      fn();
    },
  };
  vm.runInNewContext(
    `${extensionSource}\nglobalThis.AllMangaForTest = DefaultExtension;`,
    context,
  );
  return { provider: new context.AllMangaForTest(), calls, timers };
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
    pages.map((page) => page.url).join(","),
    [
      `${READER_HEAD}/images133/abc/1/sub_1/1.webp`,
      `${READER_HEAD}/images133/abc/1/sub_1/2.webp`,
    ].join(","),
  );
  assert.equal(
    pages[0].headers.Referer,
    "https://allmanga.to/",
    "reader pages must carry the CDN Referer or the hotlink CDN answers 403",
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

// ── 7. Every home rail id resolves to its own feed ────────────────────────────
{
  const { provider, calls } = loadExtension((url, body) => {
    const q = String(body.query);
    if (q.includes("queryPopular")) {
      return ok({
        queryPopular: {
          recommendations: Array.from({ length: 26 }, (_, i) => ({
            anyCard: {
              _id: `p${i}`,
              name: `Popular ${i}`,
              englishName: `Popular ${i}`,
              thumbnail: `mcovers/m_tbs/p${i}/001.webp`,
            },
          })),
        },
      });
    }
    if (q.includes("formatHome")) {
      return ok({
        formatHome: {
          newSeries: [
            { _id: "n1", name: "New One", englishName: "New One", thumbnail: "mcovers/n/1.webp" },
          ],
        },
      });
    }
    return ok({
      mangas: {
        edges: Array.from({ length: 26 }, (_, i) => ({
          _id: `r${i}`,
          name: `Ranked ${i}`,
          englishName: `Ranked ${i}`,
          thumbnail: `mcovers/m_tbs/r${i}/001.webp`,
        })),
      },
    });
  });

  const spotlight = await provider.getCustomList("spotlight", 1);
  assert.equal(spotlight.list.length, 8, "the spotlight is the first 8 of popular");
  assert.equal(spotlight.hasNextPage, false);

  const popular = await provider.getCustomList("popular", 1);
  assert.equal(popular.list.length, 26);
  assert.equal(calls.at(-1).body.variables.type, "manga");

  const top = await provider.getCustomList("top_rated", 1);
  assert.equal(top.list[0].name, "Ranked 0");
  assert.equal(calls.at(-1).body.variables.search.sortBy, "Top");
  assert.equal(calls.at(-1).body.variables.search.sortDirection, "DSC");

  const trending = await provider.getCustomList("trending", 1);
  assert.equal(trending.list.length, 26);
  assert.equal(calls.at(-1).body.variables.search.sortBy, "Trending");

  const romance = await provider.getCustomList("category_romance", 1);
  assert.equal(romance.list.length, 26);
  assert.deepEqual([...calls.at(-1).body.variables.search.genres], ["Romance"]);

  await provider.getCustomList("category_slice-of-life", 1);
  assert.deepEqual(
    [...calls.at(-1).body.variables.search.genres],
    ["Slice of Life"],
    "a hyphenated lowercase section id maps to the API's canonical genre",
  );

  const fresh = await provider.getCustomList("new", 1);
  assert.equal(fresh.list[0].name, "New One");
  assert.match(String(calls.at(-1).body.query), /formatHome/);

  const fallback = await provider.getCustomList("something-else", 1);
  assert.equal(fallback.list.length, 26);
  assert.equal(calls.at(-1).body.variables.search.sortBy, undefined);
}

// ── 8. A rail is memoised, and a throttled call is retried ────────────────────
{
  let popularCalls = 0;
  const { provider } = loadExtension((url, body) => {
    if (String(body.query).includes("queryPopular")) {
      popularCalls += 1;
      return ok({
        queryPopular: {
          recommendations: Array.from({ length: 26 }, (_, i) => ({
            anyCard: {
              _id: `p${i}`,
              name: `Popular ${i}`,
              englishName: `Popular ${i}`,
              thumbnail: `mcovers/m_tbs/p${i}/001.webp`,
            },
          })),
        },
      });
    }
    return ok({ mangas: { edges: [] } });
  });

  await provider.getCustomList("popular", 1);
  await provider.getCustomList("popular", 1);
  assert.equal(popularCalls, 1, "a memoised rail is not re-requested");

  let attempt = 0;
  const throttled = loadExtension(() => {
    attempt += 1;
    if (attempt === 1) {
      return {
        statusCode: 200,
        body: JSON.stringify({
          errors: [{ message: "Too many requests, please try again in 10 seconds." }],
        }),
      };
    }
    return ok({
      mangas: {
        edges: [
          { _id: "x", name: "Recovered", englishName: "Recovered", thumbnail: "mcovers/x.webp" },
        ],
      },
    });
  });
  const page = await throttled.provider.getCustomList("category_action", 1);
  assert.equal(page.list[0].name, "Recovered", "the retried call returns the payload");
  assert.equal(throttled.calls.length, 2, "one throttled call, then one retry");
  assert.ok(
    throttled.timers.some((ms) => ms >= 10000),
    "the retry waits at least the advertised delay",
  );
}

console.log(
  "AllManga checks passed (POST client, CDN covers, GraphQL errors, detail, reader, rails).",
);
