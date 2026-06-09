/**
 * TikTok Downloader — Watchtower Plugin v1.0.0
 * Depends on: zeusdl (required), ffmpeg (optional)
 */
class TikTokDownloaderPlugin {
  constructor(api) {
    this.api = api
    this.VERSION = '1.0.0'
  }

  async onInstall() {
    await this.api.notification.send(
      'TikTok Downloader installed',
      'Open the plugin to start downloading videos.'
    )
  }

  async onLoad() {
    const quality = (await this.api.storage.get('defaultQuality')) || '720p'
    const folder  = (await this.api.storage.get('saveFolder'))     || '$DOWNLOADS/TikTok'
    console.log('[TikTokDL] Ready — quality:' + quality + ' folder:' + folder)
  }

  async execute(action, payload) {
    switch (action) {
      case 'getConfig':     return await this.getConfig()
      case 'saveConfig':    return await this.saveConfig(payload)
      case 'getVideoInfo':  return await this.getVideoInfo(payload)
      case 'download':      return await this.download(payload)
      case 'getHistory':    return await this.getHistory()
      case 'clearHistory':  return await this.clearHistory()
      case 'checkBinaries': return await this.checkBinaries()
      default: throw new Error('Unknown action: ' + action)
    }
  }

  async getConfig() {
    return {
      defaultQuality:  (await this.api.storage.get('defaultQuality'))  || '720p',
      saveFolder:      (await this.api.storage.get('saveFolder'))       || '$DOWNLOADS/TikTok',
      removeWatermark: (await this.api.storage.get('removeWatermark'))  !== false,
      audioOnly:       (await this.api.storage.get('audioOnly'))        === true,
      autoRename:      (await this.api.storage.get('autoRename'))       !== false,
    }
  }

  async saveConfig(payload) {
    for (const [key, value] of Object.entries(payload)) {
      await this.api.storage.set(key, value)
    }
    return { ok: true }
  }

  async checkBinaries() {
    const zeusdl = await this.api.system?.binaryExists?.('zeusdl').catch(() => false) || false
    const ffmpeg  = await this.api.system?.binaryExists?.('ffmpeg').catch(() => false)  || false
    return { zeusdl, ffmpeg }
  }

  async getVideoInfo(payload) {
    if (!payload.url || !payload.url.includes('tiktok.com')) throw new Error('Invalid TikTok URL')
    const cached = await this.api.cache.get('info:' + payload.url)
    if (cached) return cached

    const result = await this.api.system.runCommand('zeusdl', [
      '--url', payload.url, '--info-only', '--json'
    ])
    const info = JSON.parse(result.stdout)
    const formatted = {
      id:          info.id,
      url:         payload.url,
      title:       info.description || 'TikTok Video',
      author:      (info.author && (info.author.nickname || info.author.uniqueId)) || 'Unknown',
      avatar:      (info.author && info.author.avatarThumb) || '',
      thumbnail:   (info.video && (info.video.cover || info.video.dynamicCover)) || '',
      duration:    (info.video && info.video.duration) || 0,
      likes:       (info.stats && info.stats.diggCount) || 0,
      isSlideshow: info.imagePost != null,
      formats:     info.video ? ['mp4', 'mp3'] : ['mp3'],
      qualities:   info.video ? ['1080p', '720p', '480p', '360p', 'audio only'] : ['audio only'],
    }
    await this.api.cache.set('info:' + payload.url, formatted, 300)
    return formatted
  }

  async download(payload) {
    const { url, quality, format, removeWatermark } = payload
    if (!url || !url.includes('tiktok.com')) throw new Error('Invalid TikTok URL')

    const actualQuality  = quality || '720p'
    const actualFormat   = format  || 'mp4'
    const noWatermark    = removeWatermark !== false

    let info = { author: 'unknown', title: 'video', thumbnail: '' }
    try { info = await this.getVideoInfo({ url }) } catch (_) {}

    const folder     = (await this.api.storage.get('saveFolder')) || '$DOWNLOADS/TikTok'
    const autoRename = (await this.api.storage.get('autoRename')) !== false
    const safeTitle  = (info.title || 'video').replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 50)
    const safeAuthor = (info.author || 'unknown').replace(/[^a-zA-Z0-9_-]/g, '_')
    const filename   = autoRename
      ? safeAuthor + '_' + safeTitle + '_' + Date.now() + '.' + actualFormat
      : 'tiktok_' + Date.now() + '.' + actualFormat
    const outputPath = folder + '/' + filename

    const args = ['--url', url, '--output', outputPath,
                  '--format', actualFormat,
                  '--quality', actualQuality === 'audio only' ? 'audio' : actualQuality]
    if (noWatermark && actualFormat !== 'mp3') args.push('--no-watermark')

    const result = await this.api.system.runCommand('zeusdl', args)
    if (result.exitCode !== 0) throw new Error('ZeusDL failed: ' + (result.stderr || 'Unknown error'))

    await this.api.downloads.add(outputPath, filename)

    const history = (await this.api.storage.get('downloadHistory')) || []
    history.unshift({
      url, filename, outputPath,
      quality: actualQuality,
      format: actualFormat,
      title: info.title,
      author: info.author,
      thumbnail: info.thumbnail,
      downloadedAt: new Date().toISOString(),
    })
    await this.api.storage.set('downloadHistory', history.slice(0, 100))
    await this.api.notification.send('Download complete', (info.title || 'Video') + ' saved to ' + folder)
    return { ok: true, filename, outputPath }
  }

  async getHistory() {
    return { history: (await this.api.storage.get('downloadHistory')) || [] }
  }

  async clearHistory() {
    await this.api.storage.set('downloadHistory', [])
    return { ok: true }
  }
}

// CommonJS + ESM dual export for CI sandbox compatibility
if (typeof module !== 'undefined') {
  module.exports = TikTokDownloaderPlugin
  module.exports.default = TikTokDownloaderPlugin
}
