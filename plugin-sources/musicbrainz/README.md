# MusicBrainz & ListenBrainz

Metadata provider and scrobbler for the Watchtower Music Hub.

- **Metadata** — tracks, albums, artists, playlists and search come from
  [MusicBrainz](https://musicbrainz.org).
- **Scrobbling** — plays are submitted to
  [ListenBrainz](https://listenbrainz.org), the open alternative to Last.fm.
- **Authentication** — optional. Signing in unlocks per-user shelves (stats,
  recommendations, feedback, playlists); every public endpoint works signed out.

Both services are run by the non-profit
[MetaBrainz Foundation](https://metabrainz.org). If you use them, consider
[donating](https://metabrainz.org/donate).

## Signing in

Settings → Account → Plugins → tap the login icon on this plugin. The form asks
for a ListenBrainz user token, available at
[listenbrainz.org/settings](https://listenbrainz.org/settings/), plus optional
custom MusicBrainz and ListenBrainz instance URLs.

## Behaviour when signed out or when a token is revoked

ListenBrainz answers `401` on account-scoped endpoints (`/user/*`,
`/submit-listens`, `/validate-token`, feedback and radio) when no token is sent,
and on every per-user endpoint once a stored token has been revoked. The plugin
never surfaces that status as an error:

- `401` is accepted as a normal response instead of throwing;
- account-scoped calls resolve to an empty result, so one gated shelf hides
  instead of blanking the Hub;
- public calls are retried once without the token;
- a rejected token is forgotten, so the next request does not repeat the
  failure.

## Rate limits and transient failures

MusicBrainz allows one request per second per client and answers `503` when that
budget is exceeded. Requests are spaced 1.1 s apart, and `429`/`502`/`503` are
retried with a growing, capped backoff (up to 6 attempts) before a shelf gives
up.

## Building

```sh
make archive     # compiles src/plugin.ht and writes plugin.smplug
```

Requires the `hetu` compiler on `PATH` and Python 3.
