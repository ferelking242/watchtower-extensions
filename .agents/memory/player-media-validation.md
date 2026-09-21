---
name: Signed player media validation
description: Live behavior of the adult video providers' current player media endpoints and expiry characteristics.
---

XNXX and XVideos now obtain playable HLS/MP4 URLs from the page's signed player metadata through their `/html5player/getvideo/{encodedId}/{cdnId}` endpoint rather than embedding final URLs directly. PornHub media definitions can include CDN URLs that later return HTTP 410 even when catalog and extraction are working.

**Why:** Provider pages and CDNs change independently of extension code, so a live media check must distinguish parser failures from expired external URLs without hiding the result.

**How to apply:** Keep the live report's media probe visible; use current player RPC extraction for XNXX/XVideos and treat PornHub 410 responses as an external availability signal unless a fresh page consistently reproduces the failure.