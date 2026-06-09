/**
 * TikTok Downloader — Watchtower Plugin
 * Depends on: zeusdl (required), ffmpeg (optional)
 *
 * This plugin uses ZeusDL to download TikTok videos without watermark.
 * It communicates with the WebView UI via the Watchtower plugin bridge.
 */
class TikTokDownloaderPlugin {
  constructor(api) {
    this.api = api
    this.VERSION = '1.0.0'
  }

  async onInstall() {
    await this.api.notification.send(
      '✅ TikTok Downloader installed',
      'Open the plugin to start downloading videos.'
    )
  }

  async onLoad() {
    const quality = await this.api.storage.get('defaultQuality') || '720p'
    const folder  = await this.api.storage.get('saveFolder')     || '$DOWNLOADS/TikTok'
    console.log(`[TikTokDL] Ready — quality:${quality} folder:${folder}`)
  }

  async execute(action, payload) {
    switch (action) {
      case 'getConfig':       return await this.getConfig()
      case 'saveConfig':      return await this.saveConfig(payload)
      case 'getVideoInfo':    return await this.getVideoInfo(payload)
      case 'download':        return await this.download(payload)
      case 'getHistory':      return await this.getHistory()
      case 'clearHistory':    return await this.clearHistory()
      case 'checkBinaries':   return await this.checkBinaries()
      default: throw new Error(`Unknown action: ${action}`)
    }
  }

  // ── Config ─────────────────────────────────────────────────────────────────

  async getConfig() {
    return {
      defaultQuality:  await this.api.storage.get('defaultQuality')  || '720p',
      saveFolder:      await this.api.storage.get('saveFolder')       || '$DOWNLOADS/TikTok',
      removeWatermark: (await this.api.storage.get('removeWatermark')) !== false,
      audioOnly:       (await this.api.storage.get('audioOnly'))      === true,
      autoRename:      (await this.api.storage.get('autoRename'))     !== false,
    }
  }

  async saveConfig(payload) {
    for (const [key, value] of Object.entries(payload)) {
      await this.api.storage.set(key, value)
    }
    return { ok: true }
  }

  // ── Binary check ───────────────────────────────────────────────────────────

  async checkBinaries() {
    const zeusdl = await this.api.system?.binaryExists('zeusdl').catch(() => false) ?? false
    const ffmpeg  = await this.api.system?.binaryExists('ffmpeg').catch(() => false)  ?? false
    return { zeusdl, ffmpeg }
  }

  // ── Video info ─────────────────────────────────────────────────────────────

  async getVideoInfo(payload) {
    const { url } = payload
    if (!url?.includes('tiktok.com')) throw new Error('Invalid TikTok URL')

    const cached = await this.api.cache.get(`info:${url}`)
    if (cached) return cached

    // ZeusDL metadata extraction
    const result = await this.api.system.runCommand('zeusdl', [
      '--url', url,
      '--info-only',
      '--json'
    ])

    const info = JSON.parse(result.stdout)
    const formatted = {
      id:          info.id,
      url,
      title:       info.description || 'TikTok Video',
      author:      info.author?.nickname || info.author?.uniqueId || 'Unknown',
      authorUrl:   `https://www.tiktok.com/@${info.author?.uniqueId || ''}`,
      avatar:      info.author?.avatarThumb || '',
      thumbnail:   info.video?.cover || info.video?.dynamicCover || '',
      duration:    info.video?.duration || 0,
      width:       info.video?.width || 0,
      height:      info.video?.height || 0,
      likes:       info.stats?.diggCount || 0,
      comments:    info.stats?.commentCount || 0,
      shares:      info.stats?.shareCount || 0,
      views:       info.stats?.playCount || 0,
      music:       { title: info.music?.title || '', author: info.music?.authorName || '' },
      isSlideshow: info.imagePost != null,
      slides:      info.imagePost?.images?.map(img => img.imageURL?.urlList?.[0]).filter(Boolean) || [],
      formats:     info.video ? ['mp4', 'mp3'] : ['mp3'],
      qualities:   info.video ? ['1080p', '720p', '480p', '360p', 'audio only'] : ['audio only'],
    }

    await this.api.cache.set(`info:${url}`, formatted, 300)
    return formatted
  }

  // ── Download ───────────────────────────────────────────────────────────────

  async download(payload) {
    const { url, quality = '720p', format = 'mp4', removeWatermark = true } = payload

    if (!url?.includes('tiktok.com')) throw new Error('Invalid TikTok URL')

    // Get video info first
    let info
    try { info = await this.getVideoInfo({ url }) }
    catch { info = { author: 'unknown', title: 'video' } }

    const autoRename = (await this.api.storage.get('autoRename')) !== false
    const folder     = await this.api.storage.get('saveFolder') || '$DOWNLOADS/TikTok'
    const safeTitle  = (info.title || 'video').replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 50)
    const safeAuthor = (info.author || 'unknown').replace(/[^a-zA-Z0-9_-]/g, '_')
    const filename   = autoRename
      ? `${safeAuthor}_${safeTitle}_${Date.now()}.${format}`
      : `tiktok_${Date.now()}.${format}`
    const outputPath = `${folder}/${filename}`

    const args = [
      '--url', url,
      '--output', outputPath,
      '--format', format,
      '--quality', quality === 'audio only' ? 'audio' : quality,
    ]
    if (removeWatermark && format !== 'mp3') args.push('--no-watermark')

    // Run ZeusDL
    const result = await this.api.system.runCommand('zeusdl', args)

    if (result.exitCode !== 0) {
      throw new Error(`ZeusDL failed: ${result.stderr || 'Unknown error'}`)
    }

    // Register in Watchtower download manager
    await this.api.downloads.add(outputPath, filename)

    // Save to history
    const history = (await this.api.storage.get('downloadHistory')) || []
    history.unshift({
      url,
      filename,
      outputPath,
      quality,
      format,
      title: info.title,
      author: info.author,
      thumbnail: info.thumbnail,
      downloadedAt: new Date().toISOString(),
    })
    await this.api.storage.set('downloadHistory', history.slice(0, 100))

    await this.api.notification.send(
      '⬇️ Download complete',
      `${info.title || 'Video'} saved to ${folder}`
    )

    return { ok: true, filename, outputPath }
  }

  // ── History ────────────────────────────────────────────────────────────────

  async getHistory() {
    const history = (await this.api.storage.get('downloadHistory')) || []
    return { history }
  }

  async clearHistory() {
    await this.api.storage.set('downloadHistory', [])
    return { ok: true }
  }
}

export default TikTokDownloaderPlugin
