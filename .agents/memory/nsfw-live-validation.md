---
name: NSFW live validation
description: Durable constraints learned while validating third-party NSFW extension sources against live sites.
---

Live validation must use the current external site's routes and markup rather than assuming the legacy adapter paths still exist. A 404 domain or route is not safely repairable without a replacement URL from the user.

**Why:** Several sources returned valid HTTP responses from changed pages, while others were permanently unreachable or returned 404. One API also returned empty chapter feeds unless the source's content-rating filter was included on the feed request.

**How to apply:** Preserve exact request URLs and statuses in reports. For parser repairs, first inspect a current catalog/detail/player response, then rerun the complete filtered deep validation. Keep 404/domain failures separate from parser failures.