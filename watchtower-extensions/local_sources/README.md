# Local Sources

Local sources let you develop, test and sideload Watchtower extensions **without publishing** to the public repository.

## What is a local source?

A local source is a `.js` extension file loaded directly from your device or local network into Watchtower — no GitHub PR needed. Useful for:
- Personal/private sources you don't want to share
- Development & testing before publishing
- Sources for sites only accessible on your local network
- Forks of existing extensions with custom patches

## Folder structure

```
local_sources/
├── README.md            ← This file
├── _template/           ← Starter template — copy and rename
│   ├── manifest.json
│   └── index.js
├── my-private-source/   ← Your source
│   ├── manifest.json
│   └── index.js
└── ...
```

## Creating a local source

1. Copy the `_template/` folder and rename it
2. Edit `manifest.json` with your source's info
3. Write your logic in `index.js`
4. In Watchtower → Settings → Extensions → Add local source → pick your `index.js`

## Loading in Watchtower

**Via URL** (development server):
```
http://192.168.x.x:5000/local_sources/my-source/index.js
```

**Via file** (Android):
Copy to `/sdcard/Watchtower/local_sources/my-source.js` and import from Watchtower settings.

## Security

Local sources run in the same JS sandbox as regular extensions. They **cannot** access the network beyond declared domains, the filesystem, or system APIs unless granted explicitly in `manifest.json`.
