class AniListSyncPlugin {
  constructor(api) {
    this.api = api
    this.baseUrl = 'https://graphql.anilist.co'
  }

  async onInstall() {
    console.log('[AniListSync] Installed!')
  }

  async onLoad() {
    const token = await this.api.storage.get('anilist_token')
    if (!token) console.warn('[AniListSync] Not authenticated — open settings to connect')
  }

  async execute(action, payload) {
    switch (action) {
      case 'save_config': return await this.saveConfig(payload)
      case 'sync':        return await this.sync(payload)
      case 'get_status':  return await this.getStatus()
      default: throw new Error(`Unknown action: ${action}`)
    }
  }

  async saveConfig(payload) {
    if (payload.token) await this.api.storage.set('anilist_token', payload.token)
    await this.api.storage.set('auto_sync', payload.auto_sync ?? true)
    return { ok: true }
  }

  async getStatus() {
    const token = await this.api.storage.get('anilist_token')
    if (!token) return { authenticated: false }
    const user = await this.queryAniList('{ Viewer { id name } }', {}, token)
    return { authenticated: true, username: user?.Viewer?.name }
  }

  async sync(payload) {
    const token = await this.api.storage.get('anilist_token')
    if (!token) throw new Error('Not authenticated — configure your AniList token in settings')

    const { mediaId, status, progress, score } = payload
    const mutation = `
      mutation ($mediaId: Int, $status: MediaListStatus, $progress: Int, $score: Float) {
        SaveMediaListEntry(mediaId: $mediaId, status: $status, progress: $progress, score: $score) {
          id status progress score
        }
      }
    `
    const result = await this.queryAniList(mutation, { mediaId, status, progress, score }, token)
    await this.api.notification.send('AniList synced', `Updated ${payload.title || 'entry'} on AniList`)
    return result
  }

  async queryAniList(query, variables, token) {
    const res = await this.api.http.post(
      this.baseUrl,
      { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json', 'Accept': 'application/json' },
      JSON.stringify({ query, variables })
    )
    if (res.statusCode !== 200) throw new Error(`AniList API error: ${res.statusCode}`)
    const data = JSON.parse(res.body)
    if (data.errors) throw new Error(data.errors[0]?.message || 'AniList error')
    return data.data
  }
}

export default AniListSyncPlugin
