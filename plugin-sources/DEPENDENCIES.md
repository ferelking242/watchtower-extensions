# Vendored plugin dependencies

The Hetu plugins import helper libraries that used to live in git submodules of
the per-plugin repositories. Those repositories are gone, and an empty submodule
directory means the plugin can no longer be compiled or rebuilt. The pinned
revisions are therefore vendored here as ordinary files.

| Path | Upstream | Pinned commit |
|---|---|---|
| `spotify/dependencies/hetu_otp_util` | https://github.com/hetu-community/hetu_otp_util | `7790606751828758769596e809ba6cbb756f9b9a` |
| `spotify/dependencies/hetu_spotify_gql_client` | https://github.com/sonic-liberation/hetu_spotify_gql_client | `32f3a26808cb5a991723b22d220820dd9ebfa6ce` |
| `deezer/dependencies/hetu_otp_util` | https://github.com/hetu-community/hetu_otp_util | `7790606751828758769596e809ba6cbb756f9b9a` |
| `deezer/dependencies/hetu_spotify_gql_client` | https://github.com/sonic-liberation/hetu_spotify_gql_client | `32f3a26808cb5a991723b22d220820dd9ebfa6ce` |
| `jiosaavn-audio/deps/hetu_des` | https://github.com/hetu-community/hetu_des | `ce1153e7c0e733058edf6a67aad9995fefcf96de` |

Only the `lib/assets/hetu/*.ht` sources are needed by the compiler; the Dart
package scaffolding around them is not. Do not add a `.gitmodules` for these
paths — they are plain tracked files so a clone is buildable without network
access or submodule initialisation.
