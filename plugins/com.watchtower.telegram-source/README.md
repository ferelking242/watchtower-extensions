# Watchtower Telegram Source Plugin

Plugin pour **Watchtower** qui utilise un canal Telegram comme source de manga, comics, novels et documents (CBR/CBZ/ZIP/PDF/EPUB).

## Comment ça marche

```
Canal Telegram
├── Photo du canal       → cover de la source dans Watchtower
├── Description          → metadata / description de la source
└── Fichiers postés      → chapitres / volumes à lire
    ├── Message 1        → ChapitreX.cbr
    ├── Message 2        → ChapitreY.cbz
    └── ...
```

Le script Python (`script.py`) tourne nativement sur Android via `libpython3.11.so`. Watchtower l'appelle via des arguments CLI et reçoit du JSON sur **stdout**. Les logs/erreurs vont sur **stderr**.

---

## Architecture du plugin APK

```
com.watchtower.telegram-source_1.0.0.apk
├── AndroidManifest.xml
├── lib/
│   ├── arm64-v8a/
│   │   └── libpython3.11.so
│   └── x86_64/
│       └── libpython3.11.so
├── assets/
│   ├── script.py
│   ├── manifest.json
│   ├── requirements.txt
│   └── site-packages/          ← pyrogram + tgcrypto pré-bundlés
└── res/xml/
    └── network_security_config.xml
```

---

## Commandes CLI

### 1. Authentification (première utilisation)

```bash
python3 script.py \
  --auth \
  --api_id YOUR_API_ID \
  --api_hash YOUR_API_HASH \
  --phone +242XXXXXXXXX
```

**Retour JSON :**
```json
{
  "status": "ok",
  "data": {
    "session_string": "XXXXXXX...",
    "message": "Session générée avec succès."
  }
}
```

> La `session_string` doit être stockée dans Flutter Secure Storage. Elle est passée à toutes les autres commandes via `--session`.

---

### 2. Metadata du canal

```bash
python3 script.py \
  --api_id ID --api_hash HASH \
  --session "SESSION_STRING" \
  --channel @moncanal \
  --action metadata
```

**Retour JSON :**
```json
{
  "status": "ok",
  "data": {
    "id": -1001234567890,
    "title": "Manga FR Canal",
    "description": "Les meilleurs mangas en français",
    "username": "@moncanal",
    "subscribers": 15000,
    "cover_b64": "base64...",
    "is_verified": false,
    "type": "ChatType.CHANNEL"
  }
}
```

---

### 3. Lister les fichiers du canal

```bash
python3 script.py \
  --api_id ID --api_hash HASH \
  --session "SESSION_STRING" \
  --channel @moncanal \
  --action list \
  --offset 0 \
  --limit 20
```

**Retour JSON :**
```json
{
  "status": "ok",
  "data": {
    "items": [
      {
        "msg_id": 42,
        "title": "One Piece Chapitre 1100",
        "filename": "OP_1100.cbr",
        "size": 15728640,
        "date": "2024-01-15T10:30:00",
        "cover_thumb_b64": "base64...",
        "mime_type": "application/x-cbr",
        "ext": ".cbr",
        "caption": "One Piece 1100 FR"
      }
    ],
    "offset": 0,
    "limit": 20,
    "count": 20,
    "has_more": true
  }
}
```

**Formats supportés :** `.cbr` `.cbz` `.zip` `.pdf` `.epub` `.rar` `.7z`

---

### 4. Streamer un fichier (lecture directe)

```bash
python3 script.py \
  --api_id ID --api_hash HASH \
  --session "SESSION_STRING" \
  --channel @moncanal \
  --action stream \
  --msg_id 42 \
  --chunk_size 65536
```

- **stdout** → bytes bruts du fichier (chunk par chunk)
- **stderr** → JSON de progression : `{"type":"progress","progress":45,"speed_human":"2.3 MB/s"}`
- Envoyer `SIGTERM` pour annuler le stream proprement

---

### 5. Recherche dans le canal

```bash
python3 script.py \
  --api_id ID --api_hash HASH \
  --session "SESSION_STRING" \
  --channel @moncanal \
  --action search \
  --query "one piece" \
  --limit 10
```

---

### 6. Thumbnail / Cover d'un fichier

```bash
python3 script.py \
  --api_id ID --api_hash HASH \
  --session "SESSION_STRING" \
  --channel @moncanal \
  --action thumbnail \
  --msg_id 42
```

Utilise le thumbnail natif Telegram s'il existe, sinon extrait la première image de l'archive CBR/CBZ.

---

## Obtenir api_id et api_hash

1. Aller sur [my.telegram.org](https://my.telegram.org)
2. Se connecter avec ton numéro Telegram
3. Aller dans **API development tools**
4. Créer une app → récupérer `api_id` et `api_hash`

---

## Build

```bash
# Vérification syntaxe
make test

# Build APK
make build

# Nettoyage
make clean
```

---

## Dépendances Python

```
pyrogram==2.0.106
tgcrypto==1.2.5
```

`tgcrypto` est une extension C optionnelle qui accélère la crypto MTProto jusqu'à 10x. Elle est recommandée mais pas obligatoire.

---

## Gestion des erreurs

| Erreur | Cause | Solution |
|--------|-------|----------|
| `Session expirée` | `session_string` invalide ou révoquée | Re-authentifier avec `--auth` |
| `FloodWait` | Trop de requêtes Telegram | Le script attend automatiquement |
| `Document introuvable` | `msg_id` invalide | Vérifier l'ID du message |
| `Pyrogram non disponible` | `libpython.so` manquant | Réinstaller le plugin |

---

## Sécurité

- La `session_string` ne doit **jamais** être écrite sur disque — stockée exclusivement dans Flutter Secure Storage
- Les `api_id` / `api_hash` sont traités comme secrets dans `userConfig`
- Connexion Telegram via MTProto over TLS uniquement (pas de cleartext)

---

## Licence

MIT — Watchtower Team
