<p align="center">
  <img src=".github/readme-images/app-icon.png" width="100" alt="Watchtower"/>
</p>

<h1 align="center">Watchtower Extensions</h1>
<h3 align="center">Powering Watch. Read. Everything.</h3>

<div align="center">

![CI](https://github.com/ferelking242/watchtower-extensions/workflows/CI/badge.svg?event=push)

</div>

## About

This repository contains the extension catalogues for [Watchtower](https://github.com/ferelking242/watchtower) — browse and install extensions directly from within the app to unlock hundreds of anime, manga, manhwa, and media sources.

## Usage

Extensions can be installed directly from the Watchtower app:

1. Open **Watchtower**
2. Go to **Settings → Browse → Extensions**
3. Browse and install the sources you want

You can also download APK files directly from the [`repo` branch](https://github.com/ferelking242/watchtower-extensions/tree/repo/apk).

## Available Sources

Watchtower Extensions supports a wide range of sources including:

- 🎌 Anime streaming sites
- 📚 Manga, manhwa & manhua readers  
- 🌐 Multi-language content
- 📺 NSFW sources (18+ flagged separately)

## Contributing a New Source

Want to add a source? Here's how:

### Prerequisites

- Java 11+
- Android Studio or IntelliJ IDEA
- Android SDK

### Steps

1. Fork this repository
2. Create a new module following existing extension patterns
3. Test your extension thoroughly
4. Submit a pull request with a clear description

See [CONTRIBUTING.md](CONTRIBUTING.md) for detailed instructions.

## Requesting a Source

Open an issue with the label `source request`. Note: requests are community-driven, so timelines vary.

## Building

```bash
# Build all extensions
./gradlew assembleDebug

# Build a specific extension
./gradlew :src:en:myextension:assembleDebug
```

## License

```
Copyright 2015 Javier Tomás

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
```

---

<p align="center"><i>Watchtower Extensions — Watch. Read. Everything.</i></p>
