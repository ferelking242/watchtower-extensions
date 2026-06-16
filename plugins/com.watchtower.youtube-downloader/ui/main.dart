// ──────────────────────────────────────────────────────────────────────────────
  // YTDLnis Plugin — ui/main.dart
  // Interprété par d4rt via FlareEvalRenderer. Le stub WPlugin + WatchtowerZeusDL
  // est injecté avant ce code par le runtime.
  // ──────────────────────────────────────────────────────────────────────────────

  // ── Palette YTDLnis ────────────────────────────────────────────────────────────
  const Color _bg    = Color(0xFF1C1C1E);
  const Color _card  = Color(0xFF252526);
  const Color _red   = Color(0xFFE53935);
  const Color _blue  = Color(0xFF1565C0);
  const Color _grey  = Color(0xFF9E9E9E);
  const Color _greyD = Color(0xFF3A3A3A);

  // ── Faux modèles (rempli par ZeusDL en prod) ───────────────────────────────────
  class _VideoResult {
    final String title;
    final String channel;
    final String duration;
    final String thumbUrl;
    const _VideoResult({required this.title, required this.channel, required this.duration, required this.thumbUrl});
  }

  class _DownloadItem {
    final String title;
    final String channel;
    final String duration;
    final String date;
    final String thumbUrl;
    final String type; // 'video' | 'audio'
    const _DownloadItem({required this.title, required this.channel, required this.duration, required this.date, required this.thumbUrl, required this.type});
  }

  const List<_VideoResult> _demoResults = [
    _VideoResult(
      title: 'Life Is Strange™ Episode 2: Out of Time | Full Walkthrough (No commentary) [HD]',
      channel: 'Xenonz',
      duration: '2:16:55',
      thumbUrl: '',
    ),
  ];

  const List<_DownloadItem> _demoDownloads = [
    _DownloadItem(
      title: 'How to use Samsung Dex in a monitor',
      channel: 'Intehill',
      duration: '0:20',
      date: '27 avr. 2026, 12:00',
      thumbUrl: '',
      type: 'video',
    ),
  ];

  // ── Plugin entry point ─────────────────────────────────────────────────────────
  class YTDownloaderPlugin extends WPlugin {
    @override
    Widget buildWidget(BuildContext context) => const _YTDLRoot();
  }

  // ── Root widget — gère la navigation 3 onglets ─────────────────────────────────
  class _YTDLRoot extends StatefulWidget {
    const _YTDLRoot();
    @override
    State<_YTDLRoot> createState() => _YTDLRootState();
  }

  class _YTDLRootState extends State<_YTDLRoot> {
    int _tab = 0;

    @override
    Widget build(BuildContext context) {
      return Scaffold(
        backgroundColor: _bg,
        body: SafeArea(
          bottom: false,
          child: IndexedStack(
            index: _tab,
            children: const [_HomeTab(), _DownloadsTab(), _MoreTab()],
          ),
        ),
        bottomNavigationBar: _YTDLNavBar(
          current: _tab,
          badge: 2,
          onChange: (i) => setState(() => _tab = i),
        ),
      );
    }
  }

  // ════════════════════════════════════════════════════════════════════════════════
  // BOTTOM NAV BAR
  // ════════════════════════════════════════════════════════════════════════════════
  class _YTDLNavBar extends StatelessWidget {
    final int current;
    final int badge;
    final ValueChanged<int> onChange;
    const _YTDLNavBar({required this.current, required this.badge, required this.onChange});

    @override
    Widget build(BuildContext context) {
      return Container(
        color: _bg,
        padding: EdgeInsets.only(bottom: MediaQuery.of(context).padding.bottom, top: 4),
        child: Row(
          mainAxisAlignment: MainAxisAlignment.spaceAround,
          children: [
            _NavItem(icon: Icons.home_rounded, label: 'Accueil', selected: current == 0, onTap: () => onChange(0)),
            _NavItemBadge(icon: Icons.download_rounded, label: 'Téléchargements', selected: current == 1, badge: badge, onTap: () => onChange(1)),
            _NavItem(icon: Icons.more_horiz_rounded, label: 'Plus', selected: current == 2, onTap: () => onChange(2)),
          ],
        ),
      );
    }
  }

  class _NavItem extends StatelessWidget {
    final IconData icon;
    final String label;
    final bool selected;
    final VoidCallback onTap;
    const _NavItem({required this.icon, required this.label, required this.selected, required this.onTap});

    @override
    Widget build(BuildContext context) {
      return GestureDetector(
        onTap: onTap,
        child: Column(mainAxisSize: MainAxisSize.min, children: [
          AnimatedContainer(
            duration: const Duration(milliseconds: 200),
            padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 8),
            decoration: BoxDecoration(
              color: selected ? _greyD : Colors.transparent,
              borderRadius: BorderRadius.circular(24),
            ),
            child: Icon(icon, color: Colors.white, size: 24),
          ),
          const SizedBox(height: 2),
          Text(label, style: TextStyle(
            color: selected ? Colors.white : _grey,
            fontSize: 11,
            fontWeight: selected ? FontWeight.w600 : FontWeight.w400,
          )),
        ]),
      );
    }
  }

  class _NavItemBadge extends StatelessWidget {
    final IconData icon;
    final String label;
    final bool selected;
    final int badge;
    final VoidCallback onTap;
    const _NavItemBadge({required this.icon, required this.label, required this.selected, required this.badge, required this.onTap});

    @override
    Widget build(BuildContext context) {
      return GestureDetector(
        onTap: onTap,
        child: Column(mainAxisSize: MainAxisSize.min, children: [
          AnimatedContainer(
            duration: const Duration(milliseconds: 200),
            padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 8),
            decoration: BoxDecoration(
              color: selected ? _greyD : Colors.transparent,
              borderRadius: BorderRadius.circular(24),
            ),
            child: Stack(clipBehavior: Clip.none, children: [
              Icon(icon, color: Colors.white, size: 24),
              if (badge > 0)
                Positioned(
                  top: -6,
                  right: -8,
                  child: Container(
                    width: 17,
                    height: 17,
                    decoration: const BoxDecoration(color: Color(0xFFE53935), shape: BoxShape.circle),
                    child: Center(child: Text(badge.toString(), style: const TextStyle(color: Colors.white, fontSize: 10, fontWeight: FontWeight.bold))),
                  ),
                ),
            ]),
          ),
          const SizedBox(height: 2),
          Text(label, style: TextStyle(
            color: selected ? Colors.white : _grey,
            fontSize: 11,
            fontWeight: selected ? FontWeight.w600 : FontWeight.w400,
          )),
        ]),
      );
    }
  }

  // ════════════════════════════════════════════════════════════════════════════════
  // ONGLET 1 — ACCUEIL
  // ════════════════════════════════════════════════════════════════════════════════
  class _HomeTab extends StatefulWidget {
    const _HomeTab();
    @override
    State<_HomeTab> createState() => _HomeTabState();
  }

  class _HomeTabState extends State<_HomeTab> {
    final _ctrl = TextEditingController();
    List<_VideoResult> _results = List.from(_demoResults);

    @override
    Widget build(BuildContext context) {
      return Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        // ── Titre "YTDLnis" ────────────────────────────────────────────────────
        Padding(
          padding: const EdgeInsets.fromLTRB(16, 20, 16, 0),
          child: RichText(text: const TextSpan(children: [
            TextSpan(text: 'YTDL', style: TextStyle(color: _red, fontSize: 22, fontWeight: FontWeight.bold)),
            TextSpan(text: 'nis', style: TextStyle(color: Colors.white, fontSize: 22, fontWeight: FontWeight.bold)),
          ])),
        ),
        const SizedBox(height: 12),

        // ── Barre de recherche ─────────────────────────────────────────────────
        Padding(
          padding: const EdgeInsets.symmetric(horizontal: 12),
          child: Container(
            height: 52,
            decoration: BoxDecoration(
              color: _card,
              borderRadius: BorderRadius.circular(28),
            ),
            child: Row(children: [
              const SizedBox(width: 14),
              const Icon(Icons.search, color: _grey, size: 22),
              const SizedBox(width: 10),
              Expanded(
                child: TextField(
                  controller: _ctrl,
                  style: const TextStyle(color: Colors.white, fontSize: 15),
                  decoration: const InputDecoration(
                    border: InputBorder.none,
                    hintText: 'Rechercher ou insérer une URL',
                    hintStyle: TextStyle(color: _grey, fontSize: 15),
                    isDense: true,
                  ),
                  onSubmitted: (v) => _onSearch(v),
                ),
              ),
              IconButton(
                icon: const Icon(Icons.more_vert, color: _grey, size: 22),
                onPressed: () {},
              ),
            ]),
          ),
        ),
        const SizedBox(height: 16),

        // ── Liste des résultats ────────────────────────────────────────────────
        Expanded(
          child: ListView.builder(
            padding: const EdgeInsets.symmetric(horizontal: 12),
            itemCount: _results.length,
            itemBuilder: (ctx, i) => _VideoCard(result: _results[i]),
          ),
        ),
      ]);
    }

    void _onSearch(String url) async {
      if (url.trim().isEmpty) return;
      // En prod, appelle WatchtowerZeusDL.getInfo(url)
      WatchtowerLog.info('Recherche : $url');
      final info = await WatchtowerZeusDL.getInfo(url);
      if (info.isNotEmpty) {
        setState(() {
          _results = [
            _VideoResult(
              title: info['title']?.toString() ?? 'Vidéo sans titre',
              channel: info['uploader']?.toString() ?? 'Inconnu',
              duration: info['duration_string']?.toString() ?? '',
              thumbUrl: info['thumbnail']?.toString() ?? '',
            ),
          ];
        });
      }
    }
  }

  // ── Carte vidéo ───────────────────────────────────────────────────────────────
  class _VideoCard extends StatelessWidget {
    final _VideoResult result;
    const _VideoCard({required this.result});

    @override
    Widget build(BuildContext context) {
      return Container(
        margin: const EdgeInsets.only(bottom: 12),
        decoration: BoxDecoration(
          borderRadius: BorderRadius.circular(12),
          color: _card,
        ),
        clipBehavior: Clip.antiAlias,
        child: Stack(children: [
          // Thumbnail
          AspectRatio(
            aspectRatio: 16 / 9,
            child: result.thumbUrl.isNotEmpty
                ? Image.network(result.thumbUrl, fit: BoxFit.cover, errorBuilder: (c, e, s) => _thumbPlaceholder())
                : _thumbPlaceholder(),
          ),

          // Gradient overlay en bas
          Positioned.fill(child: DecoratedBox(
            decoration: BoxDecoration(
              gradient: LinearGradient(
                begin: Alignment.topCenter,
                end: Alignment.bottomCenter,
                colors: [Colors.transparent, Colors.black.withOpacity(0.75)],
                stops: const [0.45, 1.0],
              ),
            ),
          )),

          // Titre + channel en haut à gauche
          Positioned(
            top: 10, left: 10, right: 100,
            child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
              Text(result.title,
                maxLines: 2,
                overflow: TextOverflow.ellipsis,
                style: const TextStyle(color: Colors.white, fontSize: 13, fontWeight: FontWeight.w700,
                  shadows: [Shadow(blurRadius: 4, color: Colors.black)]),
              ),
              const SizedBox(height: 2),
              Text(result.channel,
                style: const TextStyle(color: Color(0xFFCCCCCC), fontSize: 11,
                  shadows: [Shadow(blurRadius: 3, color: Colors.black)]),
              ),
            ]),
          ),

          // Durée en bas à gauche
          Positioned(
            bottom: 10, left: 10,
            child: Container(
              padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 3),
              decoration: BoxDecoration(color: Colors.black54, borderRadius: BorderRadius.circular(4)),
              child: Text(result.duration, style: const TextStyle(color: Colors.white, fontSize: 12, fontWeight: FontWeight.w600)),
            ),
          ),

          // Boutons audio + vidéo en bas à droite
          Positioned(
            bottom: 8, right: 8,
            child: Row(children: [
              _ActionButton(icon: Icons.music_note_rounded, onTap: () => _download(context, 'audio')),
              const SizedBox(width: 6),
              _ActionButton(icon: Icons.videocam_rounded, onTap: () => _download(context, 'video')),
            ]),
          ),
        ]),
      );
    }

    Widget _thumbPlaceholder() {
      return Container(
        color: const Color(0xFF2C2C2E),
        child: const Center(child: Icon(Icons.play_circle_outline_rounded, color: _grey, size: 48)),
      );
    }

    void _download(BuildContext context, String type) async {
      WatchtowerLog.info('Téléchargement $type : ${result.title}');
      final args = type == 'audio'
          ? ['-x', '--audio-format', 'mp3', result.thumbUrl]
          : ['-f', 'bestvideo+bestaudio', result.thumbUrl];
      await WatchtowerZeusDL.start(command: 'yt-dlp', args: args);
    }
  }

  class _ActionButton extends StatelessWidget {
    final IconData icon;
    final VoidCallback onTap;
    const _ActionButton({required this.icon, required this.onTap});

    @override
    Widget build(BuildContext context) {
      return GestureDetector(
        onTap: onTap,
        child: Container(
          width: 42,
          height: 42,
          decoration: BoxDecoration(
            color: Colors.black.withOpacity(0.60),
            borderRadius: BorderRadius.circular(10),
          ),
          child: Icon(icon, color: Colors.white, size: 22),
        ),
      );
    }
  }

  // ════════════════════════════════════════════════════════════════════════════════
  // ONGLET 2 — TÉLÉCHARGEMENTS
  // ════════════════════════════════════════════════════════════════════════════════
  class _DownloadsTab extends StatefulWidget {
    const _DownloadsTab();
    @override
    State<_DownloadsTab> createState() => _DownloadsTabState();
  }

  class _DownloadsTabState extends State<_DownloadsTab> {
    String _filter = 'all';
    bool _sortAsc = true;

    @override
    Widget build(BuildContext context) {
      return Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        // AppBar custom
        Padding(
          padding: const EdgeInsets.fromLTRB(16, 14, 8, 0),
          child: Row(children: [
            const Expanded(child: Text('Téléchargements',
              style: TextStyle(color: Colors.white, fontSize: 20, fontWeight: FontWeight.bold))),
            IconButton(icon: const Icon(Icons.search, color: Colors.white, size: 22), onPressed: () {}),
            IconButton(icon: const Icon(Icons.filter_list_rounded, color: Colors.white, size: 22), onPressed: () {}),
            IconButton(icon: const Icon(Icons.sync_rounded, color: Colors.white, size: 22), onPressed: () {}),
            IconButton(icon: const Icon(Icons.more_vert, color: Colors.white, size: 22), onPressed: () {}),
          ]),
        ),
        const SizedBox(height: 10),

        // Filtres chips
        SingleChildScrollView(
          scrollDirection: Axis.horizontal,
          padding: const EdgeInsets.symmetric(horizontal: 12),
          child: Row(children: [
            _FilterChip(
              label: _sortAsc ? '↑ Date ajoutée' : '↓ Date ajoutée',
              selected: true,
              onTap: () => setState(() => _sortAsc = !_sortAsc),
            ),
            const SizedBox(width: 8),
            _FilterChip(label: 'Audio', selected: _filter == 'audio', onTap: () => setState(() => _filter = _filter == 'audio' ? 'all' : 'audio')),
            const SizedBox(width: 8),
            _FilterChip(label: 'Vidéo', selected: _filter == 'video', onTap: () => setState(() => _filter = _filter == 'video' ? 'all' : 'video')),
            const SizedBox(width: 8),
            _FilterChip(label: 'Commande', selected: _filter == 'cmd', onTap: () => setState(() => _filter = _filter == 'cmd' ? 'all' : 'cmd')),
          ]),
        ),
        const SizedBox(height: 12),

        // Liste
        Expanded(
          child: ListView.builder(
            padding: const EdgeInsets.symmetric(horizontal: 12),
            itemCount: _demoDownloads.length,
            itemBuilder: (ctx, i) => _DownloadCard(item: _demoDownloads[i]),
          ),
        ),
      ]);
    }
  }

  class _FilterChip extends StatelessWidget {
    final String label;
    final bool selected;
    final VoidCallback onTap;
    const _FilterChip({required this.label, required this.selected, required this.onTap});

    @override
    Widget build(BuildContext context) {
      return GestureDetector(
        onTap: onTap,
        child: AnimatedContainer(
          duration: const Duration(milliseconds: 150),
          padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
          decoration: BoxDecoration(
            color: selected ? Colors.white.withOpacity(0.12) : Colors.transparent,
            borderRadius: BorderRadius.circular(20),
            border: Border.all(color: Colors.white.withOpacity(0.3)),
          ),
          child: Text(label, style: TextStyle(
            color: Colors.white,
            fontSize: 13,
            fontWeight: selected ? FontWeight.w600 : FontWeight.w400,
          )),
        ),
      );
    }
  }

  class _DownloadCard extends StatelessWidget {
    final _DownloadItem item;
    const _DownloadCard({required this.item});

    @override
    Widget build(BuildContext context) {
      return Container(
        margin: const EdgeInsets.only(bottom: 12),
        decoration: BoxDecoration(
          borderRadius: BorderRadius.circular(12),
          color: _card,
        ),
        clipBehavior: Clip.antiAlias,
        child: Stack(children: [
          // Thumbnail pleine largeur
          AspectRatio(
            aspectRatio: 16 / 9,
            child: item.thumbUrl.isNotEmpty
                ? Image.network(item.thumbUrl, fit: BoxFit.cover, errorBuilder: (c, e, s) => _dlThumbPlaceholder())
                : _dlThumbPlaceholder(),
          ),

          // Gradient
          Positioned.fill(child: DecoratedBox(
            decoration: BoxDecoration(
              gradient: LinearGradient(
                begin: Alignment.topCenter,
                end: Alignment.bottomCenter,
                colors: [Colors.black.withOpacity(0.45), Colors.black.withOpacity(0.75)],
              ),
            ),
          )),

          // Titre + channel
          Positioned(
            top: 10, left: 10, right: 80,
            child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
              Text(item.title,
                maxLines: 2,
                overflow: TextOverflow.ellipsis,
                style: const TextStyle(color: Colors.white, fontSize: 13, fontWeight: FontWeight.w700,
                  shadows: [Shadow(blurRadius: 4, color: Colors.black)]),
              ),
              const SizedBox(height: 2),
              Text(item.channel, style: const TextStyle(color: Color(0xFFCCCCCC), fontSize: 11)),
            ]),
          ),

          // Badge bleu (play) en haut à droite
          Positioned(
            top: 10, right: 10,
            child: Container(
              width: 52,
              height: 52,
              decoration: BoxDecoration(
                color: _blue,
                borderRadius: BorderRadius.circular(12),
              ),
              child: const Icon(Icons.play_arrow_rounded, color: Colors.white, size: 30),
            ),
          ),

          // Durée en bas à gauche
          Positioned(
            bottom: 10, left: 10,
            child: Container(
              padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 3),
              decoration: BoxDecoration(color: Colors.black54, borderRadius: BorderRadius.circular(4)),
              child: Text(item.duration, style: const TextStyle(color: Colors.white, fontSize: 12, fontWeight: FontWeight.w600)),
            ),
          ),

          // Date en bas à droite
          Positioned(
            bottom: 10, right: 10,
            child: Text(item.date, style: const TextStyle(color: Color(0xFFBBBBBB), fontSize: 11)),
          ),
        ]),
      );
    }

    Widget _dlThumbPlaceholder() {
      return Container(
        color: const Color(0xFF2C2C2E),
        child: const Center(child: Icon(Icons.video_library_rounded, color: _grey, size: 40)),
      );
    }
  }

  // ════════════════════════════════════════════════════════════════════════════════
  // ONGLET 3 — PLUS
  // ════════════════════════════════════════════════════════════════════════════════
  class _MoreTab extends StatelessWidget {
    const _MoreTab();

    @override
    Widget build(BuildContext context) {
      return SingleChildScrollView(
        child: Column(children: [
          const SizedBox(height: 40),

          // Icône app — cadenas rouge avec flèche de téléchargement
          Container(
            width: 90,
            height: 90,
            decoration: BoxDecoration(
              color: _red,
              borderRadius: BorderRadius.circular(22),
            ),
            child: const Icon(Icons.lock_open_rounded, color: Colors.white, size: 50),
          ),
          const SizedBox(height: 40),

          // Éléments menu
          _MenuItem(icon: Icons.terminal_rounded,        label: 'Terminal'),
          _MenuItem(icon: Icons.article_outlined,         label: 'Journaux'),
          _MenuItem(icon: Icons.chevron_right_rounded,    label: 'Modèles de commandes'),
          _MenuItem(icon: Icons.download_for_offline_outlined, label: 'Gestionnaire de téléchargements'),
          _MenuItem(icon: Icons.cookie_outlined,          label: 'Cookies'),
          _MenuItem(icon: Icons.calendar_today_outlined,  label: 'Observer les sources'),
          _MenuItem(icon: Icons.power_settings_new_rounded, label: "Quitter l'application", destructive: true),

          // Séparateur
          const Divider(color: Color(0xFF2C2C2E), thickness: 1, indent: 20, endIndent: 20),

          _MenuItem(icon: Icons.settings_outlined, label: 'Paramètres'),
          const SizedBox(height: 16),
        ]),
      );
    }
  }

  class _MenuItem extends StatelessWidget {
    final IconData icon;
    final String label;
    final bool destructive;
    const _MenuItem({required this.icon, required this.label, this.destructive = false});

    @override
    Widget build(BuildContext context) {
      return InkWell(
        onTap: () {},
        child: Padding(
          padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 16),
          child: Row(children: [
            Icon(icon, color: destructive ? _red : Colors.white, size: 22),
            const SizedBox(width: 18),
            Text(label, style: TextStyle(
              color: destructive ? _red : Colors.white,
              fontSize: 15,
              fontWeight: FontWeight.w500,
            )),
          ]),
        ),
      );
    }
  }

  // ── Retourner l'instance du plugin ─────────────────────────────────────────────
  YTDownloaderPlugin()