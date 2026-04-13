# Contributing to Watchtower Extensions

Thank you for your interest in contributing! Here's how to add a new source extension to Watchtower.

## Prerequisites

- Java 11 or higher
- Android Studio or IntelliJ IDEA with Kotlin plugin
- Android SDK (API 29+)
- Git

## Project Structure

```
src/
  <lang>/           # Language code (en, fr, ja, etc.)
    <sourcename>/   # Extension module
      src/
        <Package>/  # Kotlin source files
      AndroidManifest.xml
      build.gradle
      res/
        mipmap-*/   # Extension icon
```

## Adding a New Source

### 1. Fork the repository

```bash
git clone https://github.com/ferelking242/watchtower-extensions.git
cd watchtower-extensions
```

### 2. Create the extension module

Follow the existing structure under `src/<lang>/<sourcename>/`.

### 3. Implement the source

Implement the required interfaces:
- `AnimeHttpSource` for anime streaming sources
- `HttpSource` for manga/reading sources

### 4. Test your extension

```bash
./gradlew :src:en:mysource:assembleDebug
```

Install the generated APK on a device running Watchtower.

### 5. Submit a Pull Request

- Ensure your source works correctly
- Include an appropriate icon (108x108px)
- Write a clear PR description

## Code Style

- Follow Kotlin coding conventions
- Use consistent naming with existing extensions
- Document complex logic

## Questions?

Open an issue or join our community if you have questions.
