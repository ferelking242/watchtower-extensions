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
    `${extensionSource}\nglobalThis.MKissaForTest = DefaultExtension;`,
    context,
  );
  return { provider: new context.MKissaForTest(), calls };
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

console.log(
  "MKissa manga checks passed (manifest, POST client, WebP covers, detail, reader).",
);
