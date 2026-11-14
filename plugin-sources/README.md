# Music plugin sources

Hetu sources for every music plugin shipped by the catalogue. The compiled
artifacts live in `../plugins/*.smplug`; this tree is what produces them.

These sources were consolidated here from the per-plugin repositories
(`ferelking242/spotube-plugin-*`), which are no longer maintained separately.
Each `plugin.json` therefore points its `repository` field at this catalogue.

## Layout

| Directory | Artifact | Kind |
|---|---|---|
| `spotify/` | `plugins/spotify.smplug` | metadata + audio |
| `deezer/` | `plugins/deezer.smplug` | metadata + audio |
| `applemusic/` | `plugins/applemusic.smplug` | metadata |
| `youtubemusic/` | `plugins/youtubemusic.smplug` | metadata |
| `flac/` | `plugins/flac.smplug` | audio source |
| `musicbrainz/` | `plugins/musicbrainz.smplug` | metadata + scrobbling |
| `youtube-audio/` | `plugins/youtubeaudio.smplug` | audio source |
| `jiosaavn-audio/` | `plugins/jiosaavn.smplug` | audio source |
| `dab-music/` | `plugins/dabmusic.smplug` | audio source + authentication |

## Building

The compiler version is pinned: `hetu_script_dev_tools 0.1.0+2` produces the
only bytecode format the `hetu_script 0.4.2` runtime bundled in Watchtower can
load. A newer compiler emits bytecode that fails with `LOAD_FAIL`.

```bash
dart pub global activate hetu_script_dev_tools 0.1.0+2
cd plugin-sources/spotify
hetu compile src/plugin.ht build/plugin.out
```

Dependencies (`dependencies/hetu_otp_util`, `dependencies/hetu_spotify_gql_client`,
`deps/hetu_des`) are vendored as plain files — see `DEPENDENCIES.md`. Every
directory under `plugin-sources/` compiles with the pinned compiler; the
`plugin.json#entryPoint` of each one resolves inside the emitted bytecode.

`plugin.json#entryPoint` must name a class the bytecode actually exports, or
the app throws `invalidPluginByteCode` on install. `tools/plugins/build_all.sh`
in the Watchtower repo checks this and packages the `.smplug`.
