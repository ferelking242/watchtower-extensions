# YouTube Downloader

Plugin Watchtower pour télécharger des vidéos et audio YouTube en haute qualité.

## Fonctionnalités
- Vidéo jusqu'en 4K (2160p)
- Extraction audio MP3 / M4A
- Téléchargement de playlists
- Intégration des sous-titres
- Miniatures automatiques

## Méthodes UI disponibles
| Méthode | Fichier | Description |
|---------|---------|-------------|
| `json` | `ui/schema.json` | Interface native Flutter (recommandé) |
| `html` | `ui/index.html` | Interface WebView HTML |
| `eval` | `scripts/main.js` | Logique JS via ZeusDL |

## Format du package
Ce plugin est distribué en `.flare` — un ZIP Watchtower propriétaire.

## Prérequis
- ZeusDL >= 1.0.0 (obligatoire)
- FFmpeg >= 5.0.0 (optionnel, pour les qualités > 1080p)
