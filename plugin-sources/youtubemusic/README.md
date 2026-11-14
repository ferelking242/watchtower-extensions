# YouTube Music Metadata Plugin for Spotube

A completely standalone Spotube metadata plugin written in [Hetu Script](https://hetu.dev/) that uses the undocumented "InnerTube" API to fetch tracks, albums, artists, and playlists from YouTube Music without requiring Spotify.

## Features
- **Zero Spotify Requirement:** Uses YouTube Music purely as a metadata provider.

## Build Instructions
This plugin compiles to `.smplug` bytecode which Spotube natively understands.

To compile:
1. Ensure the Hetu compiler is installed (`dart pub global activate hetu_script_dev_tools`)
2. Run `make archive` (or manually compile `src/plugin.ht` and zip the contents).
3. Load the resulting `build/plugin.smplug` via **Settings > Developers > Install from local file** inside Spotube.

## Acknowledgements
- Powered by Hetu
- InnerTube logic adapted from `youtube_explode_dart` & `yt-dlp`
