/**
 * My Local Source — Watchtower Extension Template
 *
 * Copy this file, rename it, edit the class below.
 * Docs: https://ferelking242.github.io/watchtower-site/docs/extensions/
 */
class MyLocalSource {
  constructor(api) {
    this.api = api
    this.BASE = 'https://example.com'
  }

  // ── Listing / Search ─────────────────────────────────────────────────────

  async getPopular({ page = 1 }) {
    const res = await this.api.http.get(`${this.BASE}/popular?page=${page}`)
    return {
      items: this.parseList(res.body),
      hasNextPage: res.body.includes('next-page'),
    }
  }

  async search({ query, page = 1 }) {
    const res = await this.api.http.get(
      `${this.BASE}/search?q=${encodeURIComponent(query)}&page=${page}`
    )
    return { items: this.parseList(res.body), hasNextPage: false }
  }

  // ── Detail & Episodes ────────────────────────────────────────────────────

  async getDetail({ url }) {
    const res = await this.api.http.get(url)
    const title   = res.body.match(/<h1[^>]*>([^<]+)<\/h1>/)?.[1]?.trim() || ''
    const cover   = res.body.match(/og:image.*?content="([^"]+)"/)?.[1] || ''
    const episodes = this.parseEpisodes(res.body)
    return { title, cover, episodes }
  }

  async getVideoSources({ url }) {
    const res = await this.api.http.get(url)
    const src = res.body.match(/file:\s*["']([^"']+\.m3u8[^"']*)/)?.[1] || ''
    if (!src) throw new Error('No stream found')
    return [{ quality: 'AUTO', url: src, type: 'm3u8' }]
  }

  // ── Helpers ──────────────────────────────────────────────────────────────

  parseList(html) {
    const items = []
    for (const m of html.matchAll(/<div class="item">([\s\S]*?)<\/div>/g)) {
      const block = m[1]
      const title = block.match(/<h3[^>]*>([^<]+)/)?.[1]?.trim() || ''
      const url   = (block.match(/href="([^"]+)"/) || [])[1] || ''
      const thumb = (block.match(/src="([^"]+)"/) || [])[1] || ''
      if (title && url)
        items.push({ title, url: url.startsWith('http') ? url : this.BASE + url, thumbnailUrl: thumb })
    }
    return items
  }

  parseEpisodes(html) {
    return [...html.matchAll(/<a[^>]*href="(\/episode\/[^"]+)"[^>]*>([^<]+)<\/a>/g)]
      .map((m, i) => ({ number: i + 1, title: m[2].trim(), url: this.BASE + m[1] }))
      .reverse()
  }
}

export default MyLocalSource
