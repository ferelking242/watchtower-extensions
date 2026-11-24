# 1.1.0

### Bug Fixes

- fix: never surface `401` from ListenBrainz in the Music Hub. Account-scoped
  endpoints answer `401` when signed out and on every per-user endpoint once a
  token has been revoked; those calls now resolve to an empty result, public
  calls are retried without the token, and a rejected token is forgotten so the
  Hub falls back to the public shelves instead of failing on every request.
- fix: treat `401` as an expected status instead of a transport error, so the
  plugin no longer throws `DioException [bad response]`.
- fix: retry `429`/`502`/`503` with a capped backoff and space MusicBrainz calls
  1.1 s apart, staying inside the service's one-request-per-second budget.

### Features

- feat: ability icons in settings are icon-only with tooltips, so the plugin row
  stays one line in every language.
- feat: publisher is now `Watchtower`.

# 0.1.1 (2025-09-15)

### Bug Fixes

- fix: sort playlist by latest date and add support text
- fix: no artists in user stats causing nullObject exception in recommendations.ht (#7)
