class YouTubeDownloaderPlugin {
  constructor(api) {
    this.api = api
  }

  async onInstall() { console.log('[YTDl] Installed!') }
  async onLoad()    { console.log('[YTDl] Ready') }

  async execute(action, payload) {
    switch (action) {
      case 'download': return await this.download(payload)
      case 'getInfo':  return await this.getInfo(payload)
      default: throw new Error(`Unknown action: ${action}`)
    }
  }

  async getInfo(payload) {
    const { url } = payload
    if (!url) throw new Error('URL required')
    // Use a public yt-dlp API or your own backend
    const res = await this.api.http.get(
      `https://api.cobalt.tools/api/json`,
      { 'Content-Type': 'application/json', 'Accept': 'application/json' }
    )
    return { title: 'Video title', url, formats: ['mp4', 'mp3', 'webm'] }
  }

  async download(payload) {
    const { url, format = 'mp4', quality = '720p' } = payload
    if (!url) throw new Error('URL required')
    // Trigger Watchtower download manager
    const filename = `youtube_${Date.now()}.${format}`
    await this.api.downloads.add(url, filename)
    return { ok: true, filename }
  }
}

export default YouTubeDownloaderPlugin
