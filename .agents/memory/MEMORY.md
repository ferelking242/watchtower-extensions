- [Signed player media validation](player-media-validation.md) — XNXX/XVideos use signed player RPC URLs; PornHub CDN streams can expire with HTTP 410.
- [NSFW live validation](nsfw-live-validation.md) — verify current routes; dead domains need replacement URLs, and XNXX history/suggestions are browser-local.
- [Hetu compiler pitfalls](hetu-compiler-pitfalls.md) — the pinned Hetu compiler miscompiles `continue` in `for`-in and call expressions in the `for`-in header, silently emptying lists; test plugins live, not just compile.
- [Pin and layout rules](pin-and-layout-rules.md) — `pin-sources.yml` auto-commits on push (rebase before pushing); every `ui-layouts/*.json` must open with `spotlight`; MKissa/AllManga 403 was a stale pin, not an app bug.
## Log-driven extension fixes (2026-11-24)

- `miraculous.now` episode pages advertise `window.INTERNAL_URL =
  https://internal.miraculous.now/...` as the HLS host. Some devices cannot
  resolve that name (private DNS filters), so media_kit logged ~2 000
  `tcp: Failed to resolve hostname` a day and playback stalled. It is the same
  Cloudflare origin as the public site: re-root the advertised URL on `MN_BASE`
  and keep its path.
- `getRecommendations()` in XNXX/XVideos must not throw when the detail page
  answers with a rate-limit/challenge page — return `[]` so only the related
  rail is empty instead of failing the whole detail view.
- Device failures for MKissa / Harimanga / 1PornTV were transient (all three
  pass `run_all_tests.mjs --deep` against unchanged sources); check the harness
  before touching an extension.
