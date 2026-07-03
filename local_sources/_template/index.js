/**
 * My Local Source — Watchtower Extension Template
 *
 * Copy this file, rename it, edit the class below.
 * Docs: https://ferelking242.github.io/watchtower-site/docs/extensions/
 *
 * Quick-start:
 *   1. Change MyLocalSource to your source name.
 *   2. Set this.BASE to your site URL.
 *   3. Implement getPopular, search, getDetail, getVideoSources.
 *   4. (Optional) Declare home sections via getCustomLists().
 *   5. (Optional) Expose user settings via getSourcePreferences().
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * CONVENTION — Remote JS Extensions (class DefaultExtension extends MProvider)
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * getFilterList() — exact type_name values the app recognises:
 *
 *   SelectFilter  + SelectOption  →  dropdown (single value)
 *   GroupFilter   + CheckBox      →  collapsible list of checkboxes
 *   SortFilter    + SortOption    →  sortable list with asc/desc
 *   TextFilter                    →  free-text input
 *   CheckBoxFilter                →  single standalone checkbox
 *   TriStateFilter                →  tristate: off / include / exclude
 *   HeaderFilter                  →  label only (no user input)
 *   SeparatorFilter               →  visual divider
 *
 *   Example skeleton:
 *
 *   getFilterList() {
 *     return [
 *       {
 *         type_name: "SelectFilter", name: "Sort By", state: 0,
 *         values: [
 *           { type_name: "SelectOption", name: "Popular", value: "views" },
 *           { type_name: "SelectOption", name: "Latest",  value: "latest" },
 *         ],
 *       },
 *       {
 *         type_name: "SelectFilter", name: "Status", state: 0,
 *         values: [
 *           { type_name: "SelectOption", name: "All",       value: "" },
 *           { type_name: "SelectOption", name: "Ongoing",   value: "ongoing" },
 *           { type_name: "SelectOption", name: "Completed", value: "end" },
 *         ],
 *       },
 *       {
 *         type_name: "GroupFilter", name: "Genre",
 *         state: [
 *           { type_name: "CheckBox", name: "Action",  value: "action",  state: false },
 *           { type_name: "CheckBox", name: "Romance", value: "romance", state: false },
 *         ],
 *       },
 *     ];
 *   }
 *
 *   Reading filters in search(query, page, filters):
 *
 *   for (const f of (filters || [])) {
 *     if (f.type_name === "SelectFilter" && f.name === "Sort By") {
 *       const val = Array.from(f.values)[f.state]?.value || "latest";
 *     }
 *     if (f.type_name === "GroupFilter" && f.name === "Genre") {
 *       const genres = Array.from(f.state).filter(x => x.state === true).map(x => x.value);
 *     }
 *   }
 *
 * getCustomLists() — home section layout contract:
 *
 *   { id, name, layout?, color?, icon?, seeAll? }
 *
 *   layout  → "spotlight" | "ranked" | "compact" | "carousel" | "grid"
 *   color   → "#RRGGBB" hex string
 *   icon    → one of: fiber_new, trending_up, animation, theaters, star, bolt,
 *             movie, live_tv, history, category, new_releases, local_movies,
 *             tv, sports, music_note, home, fire, filter, update
 *   seeAll  → false | "latest" | "popular" | true (paginated via getCustomList)
 *
 * getCustomList(listId, page) — always return { list, hasNextPage }
 *   • never throw — return { list: [], hasNextPage: false } on error
 *   • if extension has no filter for a section, skip gracefully (no crash)
 *
 * Robustness rules:
 *   • Never throw from getFilterList() — return [] if unsupported
 *   • search() must always return { list, hasNextPage } even with empty filters
 *   • Handle null/undefined filterList: wrap reads in (filters || [])
 *   • Use Array.from() when iterating f.values / f.state (QuickJS compat)
 * ═══════════════════════════════════════════════════════════════════════════
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
    const title    = res.body.match(/<h1[^>]*>([^<]+)<\/h1>/)?.[1]?.trim() || ''
    const cover    = res.body.match(/og:image.*?content="([^"]+)"/)?.[1] || ''
    const episodes = this.parseEpisodes(res.body)
    return { title, cover, episodes }
  }

  async getVideoSources({ url }) {
    const res = await this.api.http.get(url)
    const src = res.body.match(/file:\s*["']([^"']+\.m3u8[^"']*)/)?.[1] || ''
    if (!src) throw new Error('No stream found')
    return [{ quality: 'AUTO', url: src, type: 'm3u8' }]
  }

  // ── Filters ──────────────────────────────────────────────────────────────
  // Return an array of filter descriptors shown in the Filter tab.
  // Each entry has a type: "select" | "text" | "checkbox" | "group".
  getFilterList() {
    return [
      // Example: a genre dropdown
      {
        type: 'select',
        name: 'Genre',
        values: [
          { name: 'All',     value: '' },
          { name: 'Action',  value: 'action' },
          { name: 'Comedy',  value: 'comedy' },
          { name: 'Drama',   value: 'drama' },
        ],
      },
      // Example: an order dropdown
      {
        type: 'select',
        name: 'Sort by',
        values: [
          { name: 'Newest',  value: 'date' },
          { name: 'Popular', value: 'views' },
          { name: 'Rating',  value: 'rating' },
        ],
      },
    ]
  }

  // ── Home sections (declarative contract) ─────────────────────────────────
  // Declare custom home-screen sections.  The app reads these fields:
  //
  //   id      (required) — passed to getCustomList(id, page)
  //   name    (required) — section header label
  //   layout  (optional) — "spotlight" | "ranked" | "compact" | "carousel" | "grid"
  //                         Falls back to index-based default when omitted.
  //   color   (optional) — CSS hex string for accent bar & icon tint ("#FF0000")
  //   icon    (optional) — one of the registered icon keys (see list below)
  //   seeAll  (optional) — false        → no "Voir tout" button
  //                        "latest"     → jumps to Latest tab
  //                        "popular"    → jumps to Popular tab
  //                        true         → opens a paginated page via getCustomList
  //
  // Registered icon keys:
  //   fiber_new, trending_up, animation, theaters, star, bolt,
  //   movie, live_tv, history, category, new_releases, local_movies,
  //   tv, sports, music_note
  //
  // Old format { id, name } still works — the app applies index-based defaults.
  getCustomLists() {
    return [
      {
        id:     'latest',
        name:   'Derniers ajouts',
        layout: 'spotlight',   // tall portrait cards, horizontal scroll
        color:  '#00BCD4',
        icon:   'fiber_new',
        seeAll: 'latest',      // "Voir tout" → Latest tab
      },
      {
        id:     'top10',
        name:   'Top 10',
        layout: 'ranked',      // cards with large rank numbers
        color:  '#FFB300',
        icon:   'trending_up',
        seeAll: false,         // no "Voir tout"
      },
      {
        id:     'category-action',
        name:   'Action',
        layout: 'compact',     // landscape thumbnails + title
        color:  '#F44336',
        icon:   'bolt',
        seeAll: true,          // paginated page via getCustomList
      },
    ]
  }

  // Called by the app to populate each section.
  async getCustomList(listId, page) {
    if (listId === 'latest') {
      const res = await this.api.http.get(`${this.BASE}/latest?page=${page}`)
      return { list: this.parseList(res.body), hasNextPage: page < 5 }
    }
    if (listId === 'top10') {
      const res = await this.api.http.get(`${this.BASE}/top`)
      return { list: this.parseList(res.body).slice(0, 10), hasNextPage: false }
    }
    // Generic: treat listId as a category slug
    const res = await this.api.http.get(`${this.BASE}/category/${listId}?page=${page}`)
    return { list: this.parseList(res.body), hasNextPage: page < 10 }
  }

  // ── User preferences ─────────────────────────────────────────────────────
  // Return an array of preference descriptors shown in the extension settings.
  // Supported types: editTextPreference | listPreference | multiSelectListPreference
  //                  switchPreferenceCompat | checkBoxPreference
  getSourcePreferences() {
    return [
      // Example: a dropdown to choose preferred video quality
      {
        key: 'preferred_quality',
        listPreference: {
          title:      'Qualité préférée',
          summary:    'AUTO',
          valueIndex: 0,
          entries:    ['AUTO', '1080p', '720p', '480p', '360p'],
          entryValues:['AUTO', '1080p', '720p', '480p', '360p'],
        },
      },
      // Example: a text field for a custom API token
      {
        key: 'api_token',
        editTextPreference: {
          title:         'Token API',
          summary:       'Laissez vide si non requis',
          value:         '',
          dialogTitle:   'Token API',
          dialogMessage: 'Entrez votre token personnel (disponible dans vos paramètres de compte)',
        },
      },
      // Example: a toggle switch
      {
        key: 'enable_subtitles',
        switchPreferenceCompat: {
          title:   'Activer les sous-titres',
          summary: 'Charge les sous-titres disponibles automatiquement',
          value:   true,
        },
      },
      // Example: a multi-select list (e.g. preferred audio languages)
      {
        key: 'audio_langs',
        multiSelectListPreference: {
          title:       'Langues audio',
          summary:     'Sélectionnez les langues à prioriser',
          values:      ['fr'],
          entries:     ['Français', 'English', '日本語', 'Español'],
          entryValues: ['fr',       'en',      'ja',    'es'],
        },
      },
    ]
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
