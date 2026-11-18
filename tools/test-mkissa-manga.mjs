#!/usr/bin/env node
/**
 * Regression checks for the MKissa manga source.
 *
 * MKissa serves the AllAnime GraphQL schema from api.mkissa.net. The bug being
 * locked down: a GET with the query in the URL is answered `403
 * cf-mitigated: challenge`, so the client must POST the JSON body; covers come
 * back as relative `mcovers/…` paths that only exist as WebP on the
 * youtube-anime CDN (a legacy `.jpg` suffix 404s); and the detail must return
 * both `name` and `imageUrl` so the item does not render as a bare watch row.
 */
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const extensionSource = fs.readFileSync(
  path.join(root, "src/manga/en/mkissa.js"),
  "utf8",
);

const API = "https://api.mkissa.net/api";
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
    `${extensionSource}\nglobalThis.MKissaForTest = DefaultExtension;`,
    context,
  );
  return { provider: new context.MKissaForTest(), calls, timers };
}

const ok = (data) => ({ statusCode: 200, body: JSON.stringify({ data }) });

// ── 1. The source manifest advertises a manga item, not a watch one ────────────
{
  const manifest = JSON.parse(
    extensionSource.match(/const watchtowerSources = (\[[\s\S]*?\]);/)[1],
  );
  assert.equal(manifest.length, 1);
  assert.equal(manifest[0].name, "MKissa");
  assert.equal(manifest[0].itemType, 0, "itemType 0 is manga");
  assert.equal(manifest[0].isManga, true);
  assert.equal(manifest[0].pkgPath, "manga/src/en/mkissa.js");
  assert.equal(manifest[0].apiUrl, API);
}

// ── 2. Requests are POSTs to the API with the CF-friendly headers ─────────────
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
  assert.match(String(calls[0].body.query), /queryPopular/);
  assert.equal(calls[0].body.variables.type, "manga");
  assert.equal(page.list.length, 26);
  assert.equal(page.list[0].name, "Title 0");
  assert.equal(page.list[0].link, "/manga/id0/romaji-0");
}

// ── 3. Covers resolve on the CDN; a legacy suffix is rewritten to WebP ────────
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
            _id: "jpg",
            name: "Legacy",
            englishName: "Legacy",
            thumbnail: "mcovers/m_tbs/jpg/002.jpg",
          },
          {
            _id: "abs",
            name: "Absolute",
            englishName: "Absolute",
            thumbnail: "https://s4.anilist.co/file/anilistcdn/media/manga/cover/large/bx1.jpg",
          },
        ],
      },
    }),
  );
  const page = await provider.search("series", 1, []);

  assert.equal(page.list[0].imageUrl, `${IMAGE_HEAD}/mcovers/m_tbs/abc/001.webp`);
  assert.equal(
    page.list[1].imageUrl,
    `${IMAGE_HEAD}/mcovers/m_tbs/jpg/002.webp`,
    "a legacy .jpg cover must be rewritten to the WebP the CDN actually stores",
  );
  assert.equal(
    page.list[2].imageUrl,
    "https://s4.anilist.co/file/anilistcdn/media/manga/cover/large/bx1.jpg",
    "an absolute cover URL is kept as-is",
  );
}

// ── 4. Detail returns both a name and an imageUrl (never a bare watch row) ────
{
  const { provider } = loadExtension(
    ok({
      manga: {
        name: "The Doomsday Ruthless Man",
        englishName: "The Doomsday Ruthless Man",
        thumbnail: "mcovers/m_tbs/vfEkX8rQgWnfkJ9YK/002.jpg",
        description: "desc",
        genres: ["Action"],
        status: "releasing",
        score: 8.2,
        availableChaptersDetail: { sub: ["2", "1"], raw: [] },
      },
    }),
  );
  const detail = await provider.getDetail("/manga/vfEkX8rQgWnfkJ9YK/doomsday");

  assert.equal(detail.name, "The Doomsday Ruthless Man");
  assert.equal(
    detail.imageUrl,
    `${IMAGE_HEAD}/mcovers/m_tbs/vfEkX8rQgWnfkJ9YK/002.webp`,
  );
  assert.equal(detail.chapters.length, 2);
  assert.equal(detail.chapters[0].name, "Chapter 1");
}

// ── 5. The reader keeps the API's page extension and carries CDN headers ─────
{
  const { provider } = loadExtension(
    ok({
      chaptersForRead: {
        edges: [
          {
            pictureUrlHead: null,
            // A `.png` page must NOT be rewritten to `.webp`: the CDN serves
            // reader pages in exactly the extension the API reports.
            pictureUrls: [
              { url: "images125/abc/0/sub_1/1.png" },
              { url: "images125/abc/0/sub_1/2.webp" },
            ],
          },
        ],
      },
    }),
  );
  const pages = await provider.getPageList(
    JSON.stringify({ mangaId: "abc", chapterString: "0", chapType: "sub" }),
  );
  assert.equal(pages.length, 2);
  // Reader pages are requested from `ytimgf` directly: `aln` only 301s them to
  // `ytimgf`, and the app's Rust client rewrites `Referer` to the redirecting
  // `aln` URL on that 301, which the CDN answers with 403 (the download bug).
  assert.equal(pages[0].url, `${READER_HEAD}/images125/abc/0/sub_1/1.png`);
  assert.equal(pages[1].url, `${READER_HEAD}/images125/abc/0/sub_1/2.webp`);
  assert.equal(
    pages[0].headers.Referer,
    "https://mkissa.to/",
    "reader pages must carry the CDN Referer or the hotlink CDN answers 403",
  );
  assert.equal(
    pages[0].headers["User-Agent"],
    undefined,
    "the UA must be left to the app's cleared browser session, not pinned here",
  );
}

// ── 6. Mirror edges of one chapter are not concatenated ───────────────────────
{
  const { provider } = loadExtension(
    ok({
      chaptersForRead: {
        edges: [
          {
            pictureUrlHead: null,
            pictureUrls: [
              { url: "images133/abc/1/sub/1.png" },
              { url: "images133/abc/1/sub/2.png" },
            ],
          },
          {
            // Second mirror of the SAME chapter (dead `file/imghub` host).
            pictureUrlHead: null,
            pictureUrls: [
              { url: "file/imghub/abc/1/1.jpg" },
              { url: "file/imghub/abc/1/2.jpg" },
            ],
          },
        ],
      },
    }),
  );
  const pages = await provider.getPageList(
    JSON.stringify({ mangaId: "abc", chapterString: "1", chapType: "sub" }),
  );
  assert.equal(pages.length, 2, "only the first usable mirror is returned");
  assert.equal(pages[0].url, `${READER_HEAD}/images133/abc/1/sub/1.png`);
}

// ── 7. Reader pages use the ytimgf head, never the aln head ───────────────────
{
  // `aln` 301s every reader page to `ytimgf`; the app's Rust client then rewrites
  // `Referer` to the `aln` URL on the redirect, which the CDN answers with 403.
  // The download worker only has that client, so it must never receive an `aln`
  // reader URL. A non-`aln` `pictureUrlHead` is still respected.
  const { provider } = loadExtension(
    ok({
      chaptersForRead: {
        edges: [
          {
            pictureUrlHead: "https://aln.youtube-anime.com",
            pictureUrls: [{ url: "images133/abc/9/sub/1.jpg" }],
          },
        ],
      },
    }),
  );
  const pages = await provider.getPageList(
    JSON.stringify({ mangaId: "abc", chapterString: "9", chapType: "sub" }),
  );
  assert.equal(pages[0].url, `${READER_HEAD}/images133/abc/9/sub/1.jpg`);

  const custom = loadExtension(
    ok({
      chaptersForRead: {
        edges: [
          {
            pictureUrlHead: "https://cdn.example.com",
            pictureUrls: [{ url: "images133/abc/9/sub/1.jpg" }],
          },
        ],
      },
    }),
  );
  const customPages = await custom.provider.getPageList(
    JSON.stringify({ mangaId: "abc", chapterString: "9", chapType: "sub" }),
  );
  assert.equal(
    customPages[0].url,
    "https://cdn.example.com/images133/abc/9/sub/1.jpg",
    "a non-aln pictureUrlHead must be kept",
  );
}

// ── 8. A manga source must not expose a video method ──────────────────────────
{
  const { provider } = loadExtension(ok({}));
  assert.equal(
    typeof provider.getVideoList,
    "undefined",
    "a manga source must not implement getVideoList",
  );
  assert.equal(typeof provider.getPageList, "function");
}

// ── 9. Every home rail id resolves to its own feed ────────────────────────────
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

  // spotlight is the hero slice of the weekly ranking.
  const spotlight = await provider.getCustomList("spotlight", 1);
  assert.equal(spotlight.list.length, 8, "the spotlight is the first 8 of popular");
  assert.equal(spotlight.hasNextPage, false);

  // popular is the weekly ranking query.
  const popular = await provider.getCustomList("popular", 1);
  assert.equal(popular.list.length, 26);
  assert.equal(calls.at(-1).body.variables.type, "manga");

  // top_rated / trending switch the sortBy of the ranking query.
  const top = await provider.getCustomList("top_rated", 1);
  assert.equal(top.list[0].name, "Ranked 0");
  assert.equal(calls.at(-1).body.variables.search.sortBy, "Top");
  assert.equal(calls.at(-1).body.variables.search.sortDirection, "DSC");

  const trending = await provider.getCustomList("trending", 1);
  assert.equal(trending.list.length, 26);
  assert.equal(calls.at(-1).body.variables.search.sortBy, "Trending");

  // category_<genre> filters the ranking query by genre, case/hyphen-insensitively.
  const romance = await provider.getCustomList("category_romance", 1);
  assert.equal(romance.list.length, 26);
  assert.deepEqual(
    [...calls.at(-1).body.variables.search.genres],
    ["Romance"],
  );

  const slice = await provider.getCustomList("category_slice-of-life", 1);
  assert.deepEqual(
    [...calls.at(-1).body.variables.search.genres],
    ["Slice of Life"],
    "a hyphenated lowercase section id maps to the API's canonical genre",
  );
  assert.equal(slice.list.length, 26);

  // new is the site's new-series rail.
  const fresh = await provider.getCustomList("new", 1);
  assert.equal(fresh.list[0].name, "New One");
  assert.match(String(calls.at(-1).body.query), /formatHome/);

  // An unknown id falls back to the latest updates (the plain search query).
  const fallback = await provider.getCustomList("something-else", 1);
  assert.equal(fallback.list.length, 26);
  assert.equal(calls.at(-1).body.variables.search.query, "");
  assert.equal(calls.at(-1).body.variables.search.sortBy, undefined);
}

// ── 10. A rail is memoised, and a throttled call is retried ────────────────────
{
  let popularCalls = 0;
  const { provider, calls, timers } = loadExtension((url, body) => {
    const q = String(body.query);
    if (q.includes("queryPopular")) {
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

  // The same rail id is served from the cache: one network call for two reads.
  await provider.getCustomList("popular", 1);
  await provider.getCustomList("popular", 1);
  assert.equal(popularCalls, 1, "a memoised rail is not re-requested");

  // A throttled response is retried after the delay the API advertises, then the
  // successful payload is returned.
  let attempt = 0;
  const throttled = loadExtension(() => {
    attempt += 1;
    if (attempt === 1) {
      return {
        statusCode: 200,
        body: JSON.stringify({
          errors: [{ message: "Too many requests, please try again in 8 seconds." }],
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
    throttled.timers.some((ms) => ms >= 8000),
    "the retry waits at least the advertised delay",
  );
}

console.log(
  "MKissa manga checks passed (manifest, POST client, WebP covers, detail, reader, rails).",
);
