# Pin workflow, layout rule and the MKissa CDN 403

## `pin-sources.yml` auto-commits on push to `main`
Pushing to `main` triggers the workflow that re-pins `sourceCodeUrl` to a
commit and commits it itself. So a local commit made before that bot commit
becomes a **non-fast-forward** on push: `git fetch` + `git rebase origin/main`
first, or the push is rejected. The workflow only re-pins the files touched by
the pushed commit, so unrelated pins stay put.

## Every `ui-layouts/*.json` MUST open with `spotlight`
The app renders ONE hero everywhere (`MediaHeroCarousel`, registry id
`spotlight`). A home starting on `banner` / `ranked` / `categoryPills` / a
bespoke hero looks different per extension. `carousel` is the spotlight alias
and is accepted. Enforced by `tools/validate-extensions.mjs`; documented in
`AGENTS.md`. `manga-spotlight` / `manga-banner` / `manga-resume` in the app are
the source-specific mocks and are now `selectable: false` (compat only).

## MKissa / AllManga reader-page 403 = stale pin, not an app bug
`aln.youtube-anime.com` 301s reader pages to `ytimgf.youtube-anime.com`. The
app's Rust download client rewrites `Referer` to the redirecting (`aln`) URL on
a 301, and `ytimgf` answers **403** to any `aln` Referer (and to no Referer).
Measured 2026-11-17: `ytimgf` + `Referer: https://mkissa.to/` → 200.
Fix (v0.2.3, commit `cf3f910`): request the reader page from `ytimgf` directly,
so the extension's own `Referer` reaches the CDN intact. The trap was that the
index advertised `version: 0.2.3` while `sourceCodeUrl` still pinned an OLD
commit carrying the v0.2.2 `aln` code — the app downloaded the broken revision.
Always move the pin with the version, and verify the CDN actually serves the
fix: `curl -s https://cdn.jsdelivr.net/gh/ferelking242/watchtower-extensions@<sha>/src/manga/en/mkissa.js`.
