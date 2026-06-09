# AniList Sync — Watchtower Plugin Template

Syncs your Watchtower watch history to AniList.

## Setup

1. Get your AniList API token from [anilist.co/settings/developer](https://anilist.co/settings/developer)
2. Open the plugin settings → paste your token → tap **Save & Connect**
3. Enable **Auto-sync** to sync automatically when you update watch progress

## How to use this template

1. Open [Watchtower Studio](https://ferelking242.github.io/watchtower-site/codespace/)
2. Import this template
3. Modify the AniList GraphQL queries to fit your use case
4. Publish

## Permissions

- `network` — calls the AniList GraphQL API
- `storage.read/write` — saves your API token locally
- `notifications` — confirms each sync
