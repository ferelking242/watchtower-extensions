# Plugins

This directory contains the **Watchtower Plugin Registry** — community-built plugins that extend the app's functionality.

## Structure

```
plugins/
├── README.md            ← This file
├── index.json           ← Plugin registry (fetched by the marketplace)
├── schema.json          ← Manifest JSON schema
├── _templates/          ← Starter templates for new plugins
│   ├── basic-js/        ← Minimal JavaScript + Built-in UI
│   ├── webview/         ← WebView HTML UI template
│   └── tiktok-downloader/ ← Full example with ZeusDL binary dep
└── com.example.plugin/  ← Published plugin (reverse-domain id)
    ├── manifest.json
    ├── logic/
    │   └── main.js
    ├── ui/
    │   └── index.html
    └── assets/
        └── icon.png
```

## Adding your plugin

1. Fork this repository
2. Create a folder: `plugins/com.yourname.plugin-id/`
3. Add `manifest.json`, `logic/main.js`, and optional UI files
4. Add an entry to `plugins/index.json`
5. Submit a Pull Request — CI validates your manifest automatically

## Docs

- [Plugin Developer Guide](https://ferelking242.github.io/watchtower-site/docs/plugins/getting-started)
- [Permissions Reference](https://ferelking242.github.io/watchtower-site/docs/plugins/permissions)
- [Binary Dependencies](https://ferelking242.github.io/watchtower-site/docs/plugins/requirements)
- [Migrate from Mihon](https://ferelking242.github.io/watchtower-site/docs/plugins/migrate)
