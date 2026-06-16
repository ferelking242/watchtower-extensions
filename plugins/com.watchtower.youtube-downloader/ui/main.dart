// YouTube Downloader — méthode eval
// Interprété par d4rt à l'intérieur de Watchtower.
// Ce fichier définit l'UI native Flutter du plugin.
// Il hérite de WPlugin (bridge injecté par le runner Watchtower).
//
// Accès disponibles via bridges d4rt :
//   - WatchtowerContext  : userConfig, pluginId, basePath
//   - WatchtowerZeusDL  : start(), cancel(), getInfo()
//   - WatchtowerLog     : info(), warn(), error(), success(), progress()
//   - WatchtowerNotif   : show()
//   - WatchtowerStorage : read(), write()

class YouTubeDownloaderPlugin extends WPlugin {
  // ── État ────────────────────────────────────────────────────────────────────
  String _url = '';
  String _quality = '1080p';
  String _format = 'mp4';
  bool _embedSubs = false;
  bool _playlistMode = false;
  bool _running = false;
  final List<String> _logs = [];
  double _progress = 0;
  String _speed = '';
  String _eta = '';

  final List<String> _qualities = ['4K', '1080p', '720p', '480p', '360p', 'audio'];
  final List<String> _formats = ['mp4', 'mp3', 'm4a', 'webm'];

  // ── Entry point appelé par le runner ────────────────────────────────────────
  @override
  Widget buildWidget(BuildContext context) {
    return _YouTubeDownloaderScreen(plugin: this);
  }

  // ── Actions ─────────────────────────────────────────────────────────────────
  Future<void> download() async {
    if (_running) return;
    if (_url.isEmpty) {
      _addLog('⚠ Entrez un lien YouTube valide');
      return;
    }
    if (!_isValidUrl(_url)) {
      _addLog('❌ URL invalide — doit être youtube.com ou youtu.be');
      return;
    }

    _running = true;
    _logs.clear();
    _progress = 0;
    _addLog('▶ Démarrage du téléchargement…');
    _addLog('  Qualité : $_quality  •  Format : $_format');

    final outputDir = WatchtowerContext.userConfig['saveFolder'] ?? '\$DOWNLOADS/YouTube';

    final args = [
      '--url', _url,
      '--output', outputDir,
      '--format', _format,
      '--quality', _quality,
    ];
    if (_embedSubs) args.addAll(['--embed-subs']);
    if (WatchtowerContext.userConfig['downloadThumbnail'] == true) {
      args.add('--write-thumbnail');
    }

    try {
      final result = await WatchtowerZeusDL.start(
        command: 'zeusdl',
        args: args,
        onProgress: (percent, speed, eta, size) {
          _progress = percent / 100.0;
          _speed = speed;
          _eta = eta;
          _addLog('  $_speed  •  ETA $_eta');
        },
        onLog: (line) => _addLog(line),
      );

      if (result.success) {
        _addLog('✅ Téléchargé : ${result.fileName}');
        _addLog('📁 ${result.filePath}');
        WatchtowerNotif.show(
          title: 'YouTube — Téléchargement terminé',
          body: result.fileName,
        );
      } else {
        _addLog('❌ Échec : ${result.error}');
      }
    } catch (e) {
      _addLog('❌ Erreur : $e');
    } finally {
      _running = false;
    }
  }

  Future<void> fetchInfo() async {
    if (_url.isEmpty) return;
    _addLog('🔍 Récupération des informations…');
    try {
      final info = await WatchtowerZeusDL.getInfo(_url);
      _addLog('📹 ${info['title']}');
      _addLog('👤 ${info['channel']}  •  ⏱ ${info['duration']}');
      if (info['isPlaylist'] == true) {
        _addLog('📋 Playlist : ${info['playlistCount']} vidéos');
      }
    } catch (e) {
      _addLog('❌ Impossible de récupérer les infos : $e');
    }
  }

  // ── Helpers ─────────────────────────────────────────────────────────────────
  void _addLog(String line) {
    _logs.add(line);
  }

  bool _isValidUrl(String url) {
    return url.contains('youtube.com') || url.contains('youtu.be');
  }
}

// ── Widget screen ─────────────────────────────────────────────────────────────

class _YouTubeDownloaderScreen extends StatefulWidget {
  final YouTubeDownloaderPlugin plugin;
  const _YouTubeDownloaderScreen({required this.plugin});

  @override
  State<_YouTubeDownloaderScreen> createState() =>
      _YouTubeDownloaderScreenState();
}

class _YouTubeDownloaderScreenState extends State<_YouTubeDownloaderScreen> {
  late final TextEditingController _urlCtrl;
  static const _bg    = Color(0xFF0F0F0F);
  static const _card  = Color(0xFF1A1A1A);
  static const _border = Color(0xFF2A2A2A);
  static const _red   = Color(0xFFFF0000);
  static const _grey  = Color(0xFF888888);

  YouTubeDownloaderPlugin get p => widget.plugin;

  @override
  void initState() {
    super.initState();
    _urlCtrl = TextEditingController();
  }

  @override
  void dispose() {
    _urlCtrl.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: _bg,
      appBar: AppBar(
        backgroundColor: _bg,
        elevation: 0,
        scrolledUnderElevation: 0,
        surfaceTintColor: Colors.transparent,
        leading: IconButton(
          icon: const Icon(Icons.arrow_back_ios_new_rounded, color: Colors.white, size: 20),
          onPressed: () => Navigator.of(context).maybePop(),
        ),
        title: Row(children: [
          Container(
            width: 28, height: 28,
            decoration: BoxDecoration(color: _red, borderRadius: BorderRadius.circular(6)),
            child: const Icon(Icons.play_arrow_rounded, color: Colors.white, size: 18),
          ),
          const SizedBox(width: 10),
          const Text('YouTube Downloader',
            style: TextStyle(fontSize: 17, fontWeight: FontWeight.w700, color: Colors.white)),
        ]),
      ),
      body: ListView(
        padding: const EdgeInsets.fromLTRB(16, 8, 16, 40),
        children: [
          _buildUrlField(),
          const SizedBox(height: 16),
          _buildQualityPicker(),
          const SizedBox(height: 16),
          if (p._quality != 'audio') ...[_buildFormatPicker(), const SizedBox(height: 16)],
          _buildToggles(),
          const SizedBox(height: 20),
          _buildButtons(),
          if (p._logs.isNotEmpty) ...[const SizedBox(height: 16), _buildOutput()],
        ],
      ),
    );
  }

  // ── URL Field ──────────────────────────────────────────────────────────────
  Widget _buildUrlField() {
    return Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
      const _Label(text: 'Lien YouTube', required: true),
      const SizedBox(height: 6),
      Container(
        decoration: BoxDecoration(
          color: _card, border: Border.all(color: _border),
          borderRadius: BorderRadius.circular(12),
        ),
        child: Row(children: [
          Expanded(
            child: TextField(
              controller: _urlCtrl,
              style: const TextStyle(color: Colors.white, fontSize: 14),
              keyboardType: TextInputType.url,
              onChanged: (v) => setState(() => p._url = v.trim()),
              decoration: const InputDecoration(
                hintText: 'https://youtube.com/watch?v=...',
                hintStyle: TextStyle(color: _grey, fontSize: 13),
                border: InputBorder.none,
                contentPadding: EdgeInsets.symmetric(horizontal: 14, vertical: 13),
              ),
            ),
          ),
          if (_urlCtrl.text.isNotEmpty)
            IconButton(
              onPressed: () { _urlCtrl.clear(); setState(() => p._url = ''); },
              icon: const Icon(Icons.close_rounded, color: _grey, size: 18),
              padding: EdgeInsets.zero,
              constraints: const BoxConstraints(minWidth: 40, minHeight: 40),
            ),
          IconButton(
            onPressed: () async {
              final data = await Clipboard.getData('text/plain');
              if (data?.text != null) {
                _urlCtrl.text = data!.text!;
                setState(() => p._url = data.text!.trim());
              }
            },
            icon: const Icon(Icons.content_paste_rounded, color: _grey, size: 18),
            tooltip: 'Coller',
            padding: EdgeInsets.zero,
            constraints: const BoxConstraints(minWidth: 40, minHeight: 40),
          ),
          const SizedBox(width: 4),
        ]),
      ),
    ]);
  }

  // ── Quality picker ─────────────────────────────────────────────────────────
  Widget _buildQualityPicker() {
    return Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
      const _Label(text: 'Qualité'),
      const SizedBox(height: 8),
      Wrap(spacing: 8, runSpacing: 8, children: p._qualities.map((q) {
        final sel = q == p._quality;
        return GestureDetector(
          onTap: () => setState(() => p._quality = q),
          child: AnimatedContainer(
            duration: const Duration(milliseconds: 150),
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 9),
            decoration: BoxDecoration(
              color: sel ? _red : _card,
              borderRadius: BorderRadius.circular(20),
              border: Border.all(color: sel ? _red : _border),
            ),
            child: Text(
              q == 'audio' ? '🎵 Audio' : q,
              style: TextStyle(
                color: sel ? Colors.white : _grey,
                fontSize: 13, fontWeight: sel ? FontWeight.w700 : FontWeight.w400,
              ),
            ),
          ),
        );
      }).toList()),
    ]);
  }

  // ── Format picker ──────────────────────────────────────────────────────────
  Widget _buildFormatPicker() {
    return Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
      const _Label(text: 'Format'),
      const SizedBox(height: 8),
      Wrap(spacing: 8, runSpacing: 8, children: p._formats.map((f) {
        final sel = f == p._format;
        return GestureDetector(
          onTap: () => setState(() => p._format = f),
          child: AnimatedContainer(
            duration: const Duration(milliseconds: 150),
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 9),
            decoration: BoxDecoration(
              color: sel ? _red.withOpacity(0.15) : _card,
              borderRadius: BorderRadius.circular(20),
              border: Border.all(color: sel ? _red : _border),
            ),
            child: Text(f.toUpperCase(),
              style: TextStyle(
                color: sel ? _red : _grey,
                fontSize: 13, fontWeight: sel ? FontWeight.w700 : FontWeight.w400,
              )),
          ),
        );
      }).toList()),
    ]);
  }

  // ── Toggles ────────────────────────────────────────────────────────────────
  Widget _buildToggles() {
    return Column(children: [
      _buildToggleRow('Sous-titres', 'Intégrer les sous-titres dans le fichier',
          p._embedSubs, (v) => setState(() => p._embedSubs = v)),
      const SizedBox(height: 8),
      _buildToggleRow('Mode playlist', 'Télécharge toute la playlist automatiquement',
          p._playlistMode, (v) => setState(() => p._playlistMode = v)),
    ]);
  }

  Widget _buildToggleRow(String label, String desc, bool value, ValueChanged<bool> onChanged) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
      decoration: BoxDecoration(
        color: _card, border: Border.all(color: _border),
        borderRadius: BorderRadius.circular(12),
      ),
      child: Row(children: [
        Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          Text(label, style: const TextStyle(color: Colors.white, fontSize: 14, fontWeight: FontWeight.w500)),
          const SizedBox(height: 2),
          Text(desc, style: const TextStyle(color: _grey, fontSize: 12)),
        ])),
        Switch(value: value, onChanged: onChanged,
          activeColor: _red, activeTrackColor: _red.withOpacity(0.3),
          inactiveTrackColor: _border, inactiveThumbColor: _grey),
      ]),
    );
  }

  // ── Buttons ────────────────────────────────────────────────────────────────
  Widget _buildButtons() {
    return Column(children: [
      SizedBox(
        width: double.infinity,
        child: FilledButton.icon(
          onPressed: p._running ? null : () => setState(() { p.download(); }),
          style: FilledButton.styleFrom(
            backgroundColor: _red,
            disabledBackgroundColor: _red.withOpacity(0.4),
            padding: const EdgeInsets.symmetric(vertical: 14),
            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
          ),
          icon: p._running
              ? const SizedBox(width: 18, height: 18,
                  child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2))
              : const Icon(Icons.download_rounded, color: Colors.white),
          label: Text(p._running ? 'Téléchargement…' : 'Télécharger',
            style: const TextStyle(color: Colors.white, fontWeight: FontWeight.w700, fontSize: 15)),
        ),
      ),
      const SizedBox(height: 10),
      SizedBox(
        width: double.infinity,
        child: OutlinedButton.icon(
          onPressed: p._running ? null : () => setState(() { p.fetchInfo(); }),
          style: OutlinedButton.styleFrom(
            side: const BorderSide(color: _border),
            padding: const EdgeInsets.symmetric(vertical: 14),
            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
          ),
          icon: const Icon(Icons.info_outline_rounded, color: _grey, size: 18),
          label: const Text('Infos vidéo',
            style: TextStyle(color: _grey, fontWeight: FontWeight.w500, fontSize: 14)),
        ),
      ),
    ]);
  }

  // ── Output / logs ──────────────────────────────────────────────────────────
  Widget _buildOutput() {
    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: _card, border: Border.all(color: _border),
        borderRadius: BorderRadius.circular(12),
      ),
      child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        const Text('PROGRESSION',
          style: TextStyle(color: _grey, fontSize: 11, fontWeight: FontWeight.w600, letterSpacing: 0.5)),
        const SizedBox(height: 10),
        if (p._progress > 0) ...[
          ClipRRect(
            borderRadius: BorderRadius.circular(4),
            child: LinearProgressIndicator(
              value: p._progress,
              backgroundColor: _border,
              color: _red,
              minHeight: 4,
            ),
          ),
          const SizedBox(height: 6),
          Row(mainAxisAlignment: MainAxisAlignment.spaceBetween, children: [
            Text('${(p._progress * 100).toStringAsFixed(0)}%',
              style: const TextStyle(color: _grey, fontSize: 11)),
            Text(p._speed, style: const TextStyle(color: _grey, fontSize: 11)),
            Text('ETA ${p._eta}', style: const TextStyle(color: _grey, fontSize: 11)),
          ]),
          const SizedBox(height: 10),
        ],
        ...p._logs.reversed.take(8).toList().reversed.map((line) => Padding(
          padding: const EdgeInsets.only(bottom: 2),
          child: Text(line,
            style: TextStyle(
              color: line.startsWith('✅') ? Colors.green
                   : line.startsWith('❌') ? Colors.red
                   : line.startsWith('⚠') ? Colors.orange
                   : const Color(0xFFAAAAAA),
              fontSize: 12,
              fontFamily: 'monospace',
            )),
        )),
      ]),
    );
  }
}

// ── Helpers ───────────────────────────────────────────────────────────────────
class _Label extends StatelessWidget {
  final String text;
  final bool required;
  const _Label({required this.text, this.required = false});

  @override
  Widget build(BuildContext context) {
    return Row(children: [
      Text(text.toUpperCase(),
        style: const TextStyle(
          color: Color(0xFF888888), fontSize: 11,
          fontWeight: FontWeight.w600, letterSpacing: 0.5,
        )),
      if (required) const Text(' *', style: TextStyle(color: Color(0xFFFF0000), fontSize: 11)),
    ]);
  }
}
