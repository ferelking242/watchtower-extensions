// ─────────────────────────────────────────────────────────────────────────────
// Telegram Source Plugin — ui/main.dart
// Interprété par FlareEvalRenderer. WPlugin est injecté par le runtime.
// Palette : exactement l'UI Telegram (Dark Mode)
// ─────────────────────────────────────────────────────────────────────────────

// ── Palette Telegram Dark ─────────────────────────────────────────────────────
const Color _bg       = Color(0xFF17212B);   // fond principal
const Color _bg2      = Color(0xFF232E3C);   // cards / surfaces
const Color _bg3      = Color(0xFF0E1621);   // fond secondaire / app bar
const Color _blue     = Color(0xFF2AABEE);   // bleu Telegram
const Color _blueD    = Color(0xFF1A96DA);   // bleu foncé (pressed)
const Color _text     = Color(0xFFFFFFFF);
const Color _hint     = Color(0xFF7F8EA3);
const Color _divider  = Color(0xFF0E1621);
const Color _error    = Color(0xFFFF5252);
const Color _success  = Color(0xFF4CAF50);
const Color _grey     = Color(0xFF526070);

// ── Entry point ───────────────────────────────────────────────────────────────
class TelegramSourcePlugin extends WPlugin {
  @override
  Widget buildWidget(BuildContext context) => const _TelegramSourceRoot();
}

// ── Root : vérifie si session existe ─────────────────────────────────────────
class _TelegramSourceRoot extends StatefulWidget {
  const _TelegramSourceRoot();
  @override
  State<_TelegramSourceRoot> createState() => _TelegramSourceRootState();
}

class _TelegramSourceRootState extends State<_TelegramSourceRoot> {
  bool _loading = true;
  bool _hasSession = false;

  @override
  void initState() {
    super.initState();
    _checkSession();
  }

  Future<void> _checkSession() async {
    final session = await WPlugin.getPreference('tg_session_string');
    setState(() {
      _hasSession = session != null && session.isNotEmpty;
      _loading = false;
    });
  }

  @override
  Widget build(BuildContext context) {
    if (_loading) {
      return const Scaffold(
        backgroundColor: _bg,
        body: Center(child: CircularProgressIndicator(color: _blue)),
      );
    }
    if (!_hasSession) {
      return _LoginFlow(onLoginSuccess: () => setState(() => _hasSession = true));
    }
    return const _MainScreen();
  }
}

// ═════════════════════════════════════════════════════════════════════════════
// FLUX DE CONNEXION
// ═════════════════════════════════════════════════════════════════════════════

class _LoginFlow extends StatefulWidget {
  final VoidCallback onLoginSuccess;
  const _LoginFlow({required this.onLoginSuccess});
  @override
  State<_LoginFlow> createState() => _LoginFlowState();
}

class _LoginFlowState extends State<_LoginFlow> {
  // 0 = ApiKeys, 1 = Phone, 2 = OTP, 3 = 2FA (si nécessaire)
  int _step = 0;
  String _apiId          = '';
  String _apiHash        = '';
  String _phone          = '';
  String _phoneCodeHash  = '';

  void _onApiKeysDone(String apiId, String apiHash) {
    setState(() {
      _apiId   = apiId;
      _apiHash = apiHash;
      _step    = 1;
    });
  }

  void _onPhoneDone(String phone, String phoneCodeHash) {
    setState(() {
      _phone         = phone;
      _phoneCodeHash = phoneCodeHash;
      _step          = 2;
    });
  }

  void _onOTPSuccess(String sessionString) async {
    await WPlugin.setPreference('tg_session_string', sessionString);
    await WPlugin.setPreference('tg_api_id',   _apiId);
    await WPlugin.setPreference('tg_api_hash',  _apiHash);
    await WPlugin.setPreference('tg_phone',     _phone);
    widget.onLoginSuccess();
  }

  @override
  Widget build(BuildContext context) {
    switch (_step) {
      case 0:
        return _ApiKeysScreen(onDone: _onApiKeysDone);
      case 1:
        return _PhoneScreen(
          onBack: () => setState(() => _step = 0),
          onDone: _onPhoneDone,
          apiId: _apiId,
          apiHash: _apiHash,
        );
      case 2:
        return _OTPScreen(
          phone: _phone,
          phoneCodeHash: _phoneCodeHash,
          apiId: _apiId,
          apiHash: _apiHash,
          onBack: () => setState(() => _step = 1),
          onSuccess: _onOTPSuccess,
        );
      default:
        return _ApiKeysScreen(onDone: _onApiKeysDone);
    }
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// ÉCRAN 0 — API ID + API HASH
// ─────────────────────────────────────────────────────────────────────────────
class _ApiKeysScreen extends StatefulWidget {
  final void Function(String apiId, String apiHash) onDone;
  const _ApiKeysScreen({required this.onDone});
  @override
  State<_ApiKeysScreen> createState() => _ApiKeysScreenState();
}

class _ApiKeysScreenState extends State<_ApiKeysScreen> {
  final _idCtrl   = TextEditingController();
  final _hashCtrl = TextEditingController();
  bool _loading = false;
  String? _error;
  bool _showHash = false;

  void _next() {
    final id   = _idCtrl.text.trim();
    final hash = _hashCtrl.text.trim();
    if (id.isEmpty || hash.isEmpty) {
      setState(() => _error = 'Fill in both fields');
      return;
    }
    if (int.tryParse(id) == null) {
      setState(() => _error = 'API ID must be a number');
      return;
    }
    widget.onDone(id, hash);
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: _bg,
      body: SafeArea(
        child: SingleChildScrollView(
          padding: const EdgeInsets.symmetric(horizontal: 28),
          child: Column(crossAxisAlignment: CrossAxisAlignment.center, children: [
            const SizedBox(height: 60),

            // ── Logo Telegram ──────────────────────────────────────────────
            Container(
              width: 100,
              height: 100,
              decoration: BoxDecoration(
                color: _blue,
                shape: BoxShape.circle,
              ),
              child: const Icon(Icons.send_rounded, color: Colors.white, size: 50),
            ),
            const SizedBox(height: 32),

            const Text('Telegram Source',
              style: TextStyle(color: _text, fontSize: 24, fontWeight: FontWeight.bold)),
            const SizedBox(height: 10),
            const Text(
              'Enter your API credentials from my.telegram.org',
              textAlign: TextAlign.center,
              style: TextStyle(color: _hint, fontSize: 15, height: 1.4),
            ),
            const SizedBox(height: 8),
            GestureDetector(
              onTap: () => WPlugin.openUrl('https://my.telegram.org/apps'),
              child: const Text('my.telegram.org →',
                style: TextStyle(color: _blue, fontSize: 13, decoration: TextDecoration.underline)),
            ),
            const SizedBox(height: 40),

            // ── API ID ─────────────────────────────────────────────────────
            _TgInputField(
              controller: _idCtrl,
              label: 'API ID',
              hint: '1234567',
              keyboardType: TextInputType.number,
            ),
            const SizedBox(height: 14),

            // ── API Hash ──────────────────────────────────────────────────
            _TgInputField(
              controller: _hashCtrl,
              label: 'API Hash',
              hint: 'a1b2c3d4e5f6...',
              obscureText: !_showHash,
              suffix: IconButton(
                icon: Icon(_showHash ? Icons.visibility_off : Icons.visibility,
                    color: _hint, size: 20),
                onPressed: () => setState(() => _showHash = !_showHash),
              ),
            ),
            const SizedBox(height: 6),

            if (_error != null)
              Padding(
                padding: const EdgeInsets.only(top: 8),
                child: Text(_error!, style: const TextStyle(color: _error, fontSize: 13)),
              ),
            const SizedBox(height: 32),

            // ── Bouton NEXT ───────────────────────────────────────────────
            _TgButton(label: 'Continue', loading: _loading, onTap: _next),
            const SizedBox(height: 40),
          ]),
        ),
      ),
    );
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// ÉCRAN 1 — NUMÉRO DE TÉLÉPHONE (exact Telegram)
// ─────────────────────────────────────────────────────────────────────────────
class _PhoneScreen extends StatefulWidget {
  final VoidCallback onBack;
  final void Function(String phone, String phoneCodeHash) onDone;
  final String apiId;
  final String apiHash;
  const _PhoneScreen({required this.onBack, required this.onDone,
    required this.apiId, required this.apiHash});
  @override
  State<_PhoneScreen> createState() => _PhoneScreenState();
}

class _PhoneScreenState extends State<_PhoneScreen> {
  final _ctrl = TextEditingController();
  bool _loading = false;
  String? _error;
  String _countryCode = '+1';

  final List<Map<String, String>> _countries = [
    {'flag': '🇺🇸', 'name': 'United States', 'code': '+1'},
    {'flag': '🇬🇧', 'name': 'United Kingdom', 'code': '+44'},
    {'flag': '🇫🇷', 'name': 'France', 'code': '+33'},
    {'flag': '🇨🇬', 'name': 'Congo', 'code': '+242'},
    {'flag': '🇨🇩', 'name': 'Congo DRC', 'code': '+243'},
    {'flag': '🇨🇦', 'name': 'Canada', 'code': '+1'},
    {'flag': '🇩🇪', 'name': 'Germany', 'code': '+49'},
    {'flag': '🇧🇪', 'name': 'Belgium', 'code': '+32'},
    {'flag': '🇨🇭', 'name': 'Switzerland', 'code': '+41'},
    {'flag': '🇧🇷', 'name': 'Brazil', 'code': '+55'},
    {'flag': '🇦🇺', 'name': 'Australia', 'code': '+61'},
    {'flag': '🇯🇵', 'name': 'Japan', 'code': '+81'},
    {'flag': '🇷🇺', 'name': 'Russia', 'code': '+7'},
    {'flag': '🇮🇳', 'name': 'India', 'code': '+91'},
    {'flag': '🇨🇳', 'name': 'China', 'code': '+86'},
    {'flag': '🇲🇦', 'name': 'Morocco', 'code': '+212'},
    {'flag': '🇸🇳', 'name': 'Senegal', 'code': '+221'},
    {'flag': '🇮🇻', 'name': "Côte d'Ivoire", 'code': '+225'},
    {'flag': '🇨🇲', 'name': 'Cameroon', 'code': '+237'},
    {'flag': '🇬🇦', 'name': 'Gabon', 'code': '+241'},
  ];

  Future<void> _sendCode() async {
    final number = _ctrl.text.trim();
    if (number.isEmpty) {
      setState(() => _error = 'Enter your phone number');
      return;
    }
    setState(() { _loading = true; _error = null; });

    try {
      final fullPhone = '$_countryCode$number';
      final result = await WPlugin.invoke('auth_send_code', {
        'api_id':   widget.apiId,
        'api_hash': widget.apiHash,
        'phone':    fullPhone,
      });

      if (result['status'] == 'ok') {
        final hash = result['data']?['phone_code_hash']?.toString() ?? '';
        widget.onDone(fullPhone, hash);
      } else {
        setState(() => _error = result['error']?.toString() ?? 'Failed to send code');
      }
    } catch (e) {
      setState(() => _error = e.toString());
    } finally {
      setState(() => _loading = false);
    }
  }

  void _showCountryPicker() {
    showModalBottomSheet(
      context: context,
      backgroundColor: _bg2,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(16))),
      builder: (ctx) => SizedBox(
        height: 420,
        child: Column(children: [
          Container(
            margin: const EdgeInsets.symmetric(vertical: 10),
            width: 40, height: 4,
            decoration: BoxDecoration(color: _grey, borderRadius: BorderRadius.circular(2)),
          ),
          Padding(
            padding: const EdgeInsets.fromLTRB(16, 0, 16, 10),
            child: Text('Select Country',
              style: const TextStyle(color: _text, fontSize: 18, fontWeight: FontWeight.bold)),
          ),
          Expanded(
            child: ListView.builder(
              itemCount: _countries.length,
              itemBuilder: (_, i) {
                final c = _countries[i];
                return InkWell(
                  onTap: () {
                    setState(() => _countryCode = c['code']!);
                    Navigator.pop(ctx);
                  },
                  child: Padding(
                    padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 14),
                    child: Row(children: [
                      Text(c['flag']!, style: const TextStyle(fontSize: 22)),
                      const SizedBox(width: 14),
                      Expanded(child: Text(c['name']!,
                        style: const TextStyle(color: _text, fontSize: 15))),
                      Text(c['code']!,
                        style: const TextStyle(color: _hint, fontSize: 14)),
                    ]),
                  ),
                );
              },
            ),
          ),
        ]),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: _bg,
      appBar: AppBar(
        backgroundColor: _bg3,
        elevation: 0,
        leading: IconButton(
          icon: const Icon(Icons.arrow_back, color: _blue),
          onPressed: widget.onBack,
        ),
        title: const Text('Your Phone', style: TextStyle(color: _text, fontSize: 17)),
        centerTitle: true,
      ),
      body: SafeArea(
        child: SingleChildScrollView(
          padding: const EdgeInsets.symmetric(horizontal: 28),
          child: Column(crossAxisAlignment: CrossAxisAlignment.center, children: [
            const SizedBox(height: 40),

            // ── Icône téléphone animée ─────────────────────────────────────
            Container(
              width: 80,
              height: 80,
              decoration: BoxDecoration(
                color: _blue.withOpacity(0.15),
                shape: BoxShape.circle,
              ),
              child: const Icon(Icons.phone_android_rounded, color: _blue, size: 40),
            ),
            const SizedBox(height: 24),

            const Text('Your Phone',
              style: TextStyle(color: _text, fontSize: 22, fontWeight: FontWeight.bold)),
            const SizedBox(height: 10),
            const Text(
              'Please confirm your country code and\nenter your phone number.',
              textAlign: TextAlign.center,
              style: TextStyle(color: _hint, fontSize: 14, height: 1.5),
            ),
            const SizedBox(height: 36),

            // ── Sélecteur pays ─────────────────────────────────────────────
            GestureDetector(
              onTap: _showCountryPicker,
              child: Container(
                padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 16),
                decoration: BoxDecoration(
                  color: _bg2,
                  borderRadius: BorderRadius.circular(10),
                ),
                child: Row(children: [
                  const Text('Country', style: TextStyle(color: _hint, fontSize: 15)),
                  const Spacer(),
                  Text(_countryCode, style: const TextStyle(color: _text, fontSize: 15)),
                  const SizedBox(width: 8),
                  const Icon(Icons.chevron_right, color: _hint, size: 20),
                ]),
              ),
            ),
            const SizedBox(height: 2),

            // ── Champ téléphone ────────────────────────────────────────────
            Container(
              decoration: BoxDecoration(
                color: _bg2,
                borderRadius: BorderRadius.circular(10),
              ),
              child: Row(children: [
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 16),
                  child: Text(_countryCode,
                    style: const TextStyle(color: _blue, fontSize: 17, fontWeight: FontWeight.w500)),
                ),
                Container(width: 1, height: 24, color: _grey),
                Expanded(
                  child: TextField(
                    controller: _ctrl,
                    keyboardType: TextInputType.phone,
                    style: const TextStyle(color: _text, fontSize: 17),
                    decoration: const InputDecoration(
                      border: InputBorder.none,
                      contentPadding: EdgeInsets.symmetric(horizontal: 16, vertical: 16),
                      hintText: 'Phone number',
                      hintStyle: TextStyle(color: _hint, fontSize: 17),
                    ),
                    autofocus: true,
                  ),
                ),
              ]),
            ),

            if (_error != null)
              Padding(
                padding: const EdgeInsets.only(top: 12),
                child: Text(_error!,
                  style: const TextStyle(color: _error, fontSize: 13),
                  textAlign: TextAlign.center),
              ),
            const SizedBox(height: 36),

            _TgButton(label: 'Next', loading: _loading, onTap: _sendCode),
            const SizedBox(height: 32),

            // ── Info ──────────────────────────────────────────────────────
            Container(
              padding: const EdgeInsets.all(14),
              decoration: BoxDecoration(
                color: _blue.withOpacity(0.08),
                borderRadius: BorderRadius.circular(10),
                border: Border.all(color: _blue.withOpacity(0.2)),
              ),
              child: const Row(crossAxisAlignment: CrossAxisAlignment.start, children: [
                Icon(Icons.info_outline_rounded, color: _blue, size: 18),
                SizedBox(width: 10),
                Expanded(child: Text(
                  'We will send a confirmation code to your Telegram app.',
                  style: TextStyle(color: _hint, fontSize: 13, height: 1.4),
                )),
              ]),
            ),
            const SizedBox(height: 32),
          ]),
        ),
      ),
    );
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// ÉCRAN 2 — CODE OTP (exact Telegram)
// ─────────────────────────────────────────────────────────────────────────────
class _OTPScreen extends StatefulWidget {
  final String phone;
  final String phoneCodeHash;
  final String apiId;
  final String apiHash;
  final VoidCallback onBack;
  final void Function(String sessionString) onSuccess;
  const _OTPScreen({required this.phone, required this.phoneCodeHash,
    required this.apiId, required this.apiHash,
    required this.onBack, required this.onSuccess});
  @override
  State<_OTPScreen> createState() => _OTPScreenState();
}

class _OTPScreenState extends State<_OTPScreen> {
  final List<TextEditingController> _ctrls = List.generate(5, (_) => TextEditingController());
  final List<FocusNode> _nodes = List.generate(5, (_) => FocusNode());
  bool _loading = false;
  String? _error;
  int _resendCountdown = 60;

  @override
  void initState() {
    super.initState();
    _startCountdown();
    _nodes[0].requestFocus();
  }

  void _startCountdown() async {
    while (_resendCountdown > 0 && mounted) {
      await Future.delayed(const Duration(seconds: 1));
      if (mounted) setState(() => _resendCountdown--);
    }
  }

  String get _code => _ctrls.map((c) => c.text).join();

  void _onDigitChanged(int idx, String value) {
    if (value.length > 1) {
      // Paste handling
      final digits = value.replaceAll(RegExp(r'\D'), '');
      for (int i = 0; i < digits.length && (idx + i) < 5; i++) {
        _ctrls[idx + i].text = digits[i];
      }
      final next = (idx + digits.length).clamp(0, 4);
      _nodes[next].requestFocus();
    } else if (value.isNotEmpty && idx < 4) {
      _nodes[idx + 1].requestFocus();
    }
    if (_code.length == 5) _verify();
  }

  void _onKeyBackspace(int idx) {
    if (_ctrls[idx].text.isEmpty && idx > 0) {
      _ctrls[idx - 1].clear();
      _nodes[idx - 1].requestFocus();
    }
  }

  Future<void> _verify() async {
    final code = _code;
    if (code.length < 5) return;
    setState(() { _loading = true; _error = null; });
    try {
      final result = await WPlugin.invoke('auth_verify_code', {
        'api_id':          widget.apiId,
        'api_hash':        widget.apiHash,
        'phone':           widget.phone,
        'phone_code_hash': widget.phoneCodeHash,
        'code':            code,
      });

      if (result['status'] == 'ok') {
        final session = result['data']?['session_string'] ?? '';
        widget.onSuccess(session);
      } else {
        setState(() => _error = result['error']?.toString() ?? 'Invalid code');
        for (final c in _ctrls) c.clear();
        _nodes[0].requestFocus();
      }
    } catch (e) {
      setState(() => _error = e.toString());
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: _bg,
      appBar: AppBar(
        backgroundColor: _bg3,
        elevation: 0,
        leading: IconButton(
          icon: const Icon(Icons.arrow_back, color: _blue),
          onPressed: widget.onBack,
        ),
        title: const Text('Enter Code', style: TextStyle(color: _text, fontSize: 17)),
        centerTitle: true,
      ),
      body: SafeArea(
        child: SingleChildScrollView(
          padding: const EdgeInsets.symmetric(horizontal: 28),
          child: Column(crossAxisAlignment: CrossAxisAlignment.center, children: [
            const SizedBox(height: 40),

            Container(
              width: 80,
              height: 80,
              decoration: BoxDecoration(
                color: _blue.withOpacity(0.15),
                shape: BoxShape.circle,
              ),
              child: const Icon(Icons.message_rounded, color: _blue, size: 40),
            ),
            const SizedBox(height: 24),

            const Text('Enter Code',
              style: TextStyle(color: _text, fontSize: 22, fontWeight: FontWeight.bold)),
            const SizedBox(height: 10),
            Text(
              'We\'ve sent the code to\n${widget.phone}',
              textAlign: TextAlign.center,
              style: const TextStyle(color: _hint, fontSize: 14, height: 1.5),
            ),
            const SizedBox(height: 40),

            // ── 5 cases OTP ────────────────────────────────────────────────
            Row(
              mainAxisAlignment: MainAxisAlignment.center,
              children: List.generate(5, (i) => Container(
                width: 48,
                height: 60,
                margin: const EdgeInsets.symmetric(horizontal: 5),
                decoration: BoxDecoration(
                  color: _bg2,
                  borderRadius: BorderRadius.circular(12),
                  border: Border.all(
                    color: _nodes[i].hasFocus ? _blue : Colors.transparent,
                    width: 2,
                  ),
                ),
                child: RawKeyboardListener(
                  focusNode: FocusNode(),
                  onKey: (event) {
                    if (event.logicalKey.keyLabel == 'Backspace') {
                      _onKeyBackspace(i);
                    }
                  },
                  child: TextField(
                    controller: _ctrls[i],
                    focusNode: _nodes[i],
                    keyboardType: TextInputType.number,
                    textAlign: TextAlign.center,
                    maxLength: 1,
                    style: const TextStyle(
                      color: _blue, fontSize: 26, fontWeight: FontWeight.bold),
                    decoration: const InputDecoration(
                      border: InputBorder.none,
                      counterText: '',
                    ),
                    onChanged: (v) => _onDigitChanged(i, v),
                  ),
                ),
              )),
            ),

            if (_loading)
              const Padding(
                padding: EdgeInsets.only(top: 20),
                child: CircularProgressIndicator(color: _blue, strokeWidth: 2),
              ),

            if (_error != null)
              Padding(
                padding: const EdgeInsets.only(top: 16),
                child: Text(_error!,
                  style: const TextStyle(color: _error, fontSize: 13),
                  textAlign: TextAlign.center),
              ),

            const SizedBox(height: 32),

            // ── Renvoyer le code ──────────────────────────────────────────
            if (_resendCountdown > 0)
              Text(
                'Resend code in $_resendCountdown s',
                style: const TextStyle(color: _hint, fontSize: 14),
              )
            else
              GestureDetector(
                onTap: () {
                  setState(() => _resendCountdown = 60);
                  _startCountdown();
                  WPlugin.invoke('auth_send_code', {
                    'api_id': widget.apiId,
                    'api_hash': widget.apiHash,
                    'phone': widget.phone,
                  });
                },
                child: const Text('Resend Code',
                  style: TextStyle(color: _blue, fontSize: 14, fontWeight: FontWeight.w600)),
              ),
            const SizedBox(height: 40),
          ]),
        ),
      ),
    );
  }
}

// ═════════════════════════════════════════════════════════════════════════════
// MAIN SCREEN — Navigation 3 onglets
// ═════════════════════════════════════════════════════════════════════════════
class _MainScreen extends StatefulWidget {
  const _MainScreen();
  @override
  State<_MainScreen> createState() => _MainScreenState();
}

class _MainScreenState extends State<_MainScreen> {
  int _tab = 0;

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: _bg,
      body: IndexedStack(
        index: _tab,
        children: const [_ChannelsTab(), _SearchTab(), _SettingsTab()],
      ),
      bottomNavigationBar: _TgNavBar(
        current: _tab,
        onChange: (i) => setState(() => _tab = i),
      ),
    );
  }
}

// ── Bottom nav ────────────────────────────────────────────────────────────────
class _TgNavBar extends StatelessWidget {
  final int current;
  final ValueChanged<int> onChange;
  const _TgNavBar({required this.current, required this.onChange});

  @override
  Widget build(BuildContext context) {
    return Container(
      color: _bg3,
      child: SafeArea(
        top: false,
        child: SizedBox(
          height: 56,
          child: Row(
            children: [
              _NavBtn(icon: Icons.library_books_rounded, label: 'Channels', idx: 0, current: current, onTap: onChange),
              _NavBtn(icon: Icons.search_rounded, label: 'Search', idx: 1, current: current, onTap: onChange),
              _NavBtn(icon: Icons.settings_rounded, label: 'Settings', idx: 2, current: current, onTap: onChange),
            ],
          ),
        ),
      ),
    );
  }
}

class _NavBtn extends StatelessWidget {
  final IconData icon;
  final String label;
  final int idx;
  final int current;
  final ValueChanged<int> onTap;
  const _NavBtn({required this.icon, required this.label, required this.idx,
    required this.current, required this.onTap});

  @override
  Widget build(BuildContext context) {
    final selected = idx == current;
    return Expanded(
      child: GestureDetector(
        onTap: () => onTap(idx),
        behavior: HitTestBehavior.opaque,
        child: Column(mainAxisAlignment: MainAxisAlignment.center, children: [
          Icon(icon, color: selected ? _blue : _hint, size: 24),
          const SizedBox(height: 3),
          Text(label, style: TextStyle(
            color: selected ? _blue : _hint,
            fontSize: 10,
            fontWeight: selected ? FontWeight.w600 : FontWeight.w400,
          )),
        ]),
      ),
    );
  }
}

// ═════════════════════════════════════════════════════════════════════════════
// ONGLET 1 — CHANNELS (liste des canaux sauvegardés)
// ═════════════════════════════════════════════════════════════════════════════
class _ChannelsTab extends StatefulWidget {
  const _ChannelsTab();
  @override
  State<_ChannelsTab> createState() => _ChannelsTabState();
}

class _ChannelsTabState extends State<_ChannelsTab> {
  List<Map<String, dynamic>> _channels = [];
  bool _loading = false;

  @override
  void initState() {
    super.initState();
    _loadSavedChannels();
  }

  Future<void> _loadSavedChannels() async {
    final raw = await WPlugin.getPreference('tg_saved_channels');
    if (raw != null && raw.isNotEmpty) {
      try {
        final parsed = WPlugin.parseJson(raw) as List;
        setState(() => _channels = List<Map<String, dynamic>>.from(parsed));
      } catch (_) {}
    }
  }

  Future<void> _saveChannels() async {
    await WPlugin.setPreference('tg_saved_channels', WPlugin.toJson(_channels));
  }

  Future<void> _addChannel(String username) async {
    if (_channels.any((c) => c['username'] == username)) return;
    setState(() => _loading = true);
    try {
      final apiId   = await WPlugin.getPreference('tg_api_id') ?? '';
      final apiHash = await WPlugin.getPreference('tg_api_hash') ?? '';
      final session = await WPlugin.getPreference('tg_session_string') ?? '';

      final result = await WPlugin.invoke('metadata', {
        'api_id':   apiId,
        'api_hash': apiHash,
        'session':  session,
        'channel':  username,
      });

      if (result['status'] == 'ok') {
        final data = result['data'] as Map<String, dynamic>;
        data['username'] = username;
        setState(() => _channels.insert(0, data));
        await _saveChannels();
      } else {
        WPlugin.showToast(result['error']?.toString() ?? 'Channel not found');
      }
    } catch (e) {
      WPlugin.showToast('Error: $e');
    } finally {
      setState(() => _loading = false);
    }
  }

  void _removeChannel(String username) async {
    setState(() => _channels.removeWhere((c) => c['username'] == username));
    await _saveChannels();
  }

  void _showAddSheet() {
    final ctrl = TextEditingController();
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: _bg2,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(16))),
      builder: (ctx) => Padding(
        padding: EdgeInsets.fromLTRB(20, 16, 20,
          MediaQuery.of(ctx).viewInsets.bottom + 24),
        child: Column(mainAxisSize: MainAxisSize.min, children: [
          Container(
            width: 40, height: 4,
            decoration: BoxDecoration(color: _grey, borderRadius: BorderRadius.circular(2)),
          ),
          const SizedBox(height: 20),
          const Text('Add Channel', style: TextStyle(color: _text, fontSize: 18, fontWeight: FontWeight.bold)),
          const SizedBox(height: 16),
          _TgInputField(
            controller: ctrl,
            label: 'Channel username',
            hint: '@channel or t.me/channel',
            autofocus: true,
          ),
          const SizedBox(height: 20),
          _TgButton(
            label: 'Add',
            loading: false,
            onTap: () {
              final val = ctrl.text.trim();
              if (val.isNotEmpty) {
                Navigator.pop(ctx);
                _addChannel(val.startsWith('@') ? val : '@$val');
              }
            },
          ),
        ]),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: _bg,
      appBar: AppBar(
        backgroundColor: _bg3,
        elevation: 0,
        title: Row(children: [
          Container(
            width: 32, height: 32,
            decoration: const BoxDecoration(color: _blue, shape: BoxShape.circle),
            child: const Icon(Icons.send_rounded, color: Colors.white, size: 18),
          ),
          const SizedBox(width: 10),
          const Text('Telegram Source', style: TextStyle(color: _text, fontSize: 17, fontWeight: FontWeight.w600)),
        ]),
        actions: [
          if (_loading)
            const Padding(
              padding: EdgeInsets.only(right: 16),
              child: Center(child: SizedBox(width: 20, height: 20,
                child: CircularProgressIndicator(color: _blue, strokeWidth: 2))),
            )
          else
            IconButton(
              icon: const Icon(Icons.add, color: _blue),
              onPressed: _showAddSheet,
            ),
        ],
      ),
      body: _channels.isEmpty
          ? _EmptyChannels(onAdd: _showAddSheet)
          : ListView.builder(
              itemCount: _channels.length,
              itemBuilder: (ctx, i) => _ChannelTile(
                channel: _channels[i],
                onTap: () => Navigator.push(ctx, MaterialPageRoute(
                  builder: (_) => _ChannelDetailScreen(channel: _channels[i]))),
                onRemove: () => _removeChannel(_channels[i]['username'] ?? ''),
              ),
            ),
    );
  }
}

class _EmptyChannels extends StatelessWidget {
  final VoidCallback onAdd;
  const _EmptyChannels({required this.onAdd});
  @override
  Widget build(BuildContext context) {
    return Center(
      child: Column(mainAxisAlignment: MainAxisAlignment.center, children: [
        Container(
          width: 80, height: 80,
          decoration: BoxDecoration(color: _bg2, shape: BoxShape.circle),
          child: const Icon(Icons.telegram, color: _blue, size: 44),
        ),
        const SizedBox(height: 20),
        const Text('No channels yet',
          style: TextStyle(color: _text, fontSize: 18, fontWeight: FontWeight.w600)),
        const SizedBox(height: 8),
        const Text('Add a Telegram channel to start reading',
          style: TextStyle(color: _hint, fontSize: 14)),
        const SizedBox(height: 28),
        ElevatedButton.icon(
          style: ElevatedButton.styleFrom(
            backgroundColor: _blue,
            foregroundColor: Colors.white,
            padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 14),
            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
          ),
          icon: const Icon(Icons.add),
          label: const Text('Add Channel', style: TextStyle(fontSize: 15, fontWeight: FontWeight.w600)),
          onPressed: onAdd,
        ),
      ]),
    );
  }
}

class _ChannelTile extends StatelessWidget {
  final Map<String, dynamic> channel;
  final VoidCallback onTap;
  final VoidCallback onRemove;
  const _ChannelTile({required this.channel, required this.onTap, required this.onRemove});

  @override
  Widget build(BuildContext context) {
    return InkWell(
      onTap: onTap,
      onLongPress: () => showDialog(
        context: context,
        builder: (_) => AlertDialog(
          backgroundColor: _bg2,
          title: const Text('Remove channel', style: TextStyle(color: _text)),
          content: Text('Remove "${channel['title'] ?? channel['username']}"?',
            style: const TextStyle(color: _hint)),
          actions: [
            TextButton(onPressed: () => Navigator.pop(context),
              child: const Text('Cancel', style: TextStyle(color: _hint))),
            TextButton(
              onPressed: () { Navigator.pop(context); onRemove(); },
              child: const Text('Remove', style: TextStyle(color: _error)),
            ),
          ],
        ),
      ),
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
        decoration: const BoxDecoration(
          border: Border(bottom: BorderSide(color: _divider, width: 0.5))),
        child: Row(children: [
          // Avatar
          _ChannelAvatar(channel: channel, size: 52),
          const SizedBox(width: 14),
          // Info
          Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
            Text(channel['title']?.toString() ?? channel['username']?.toString() ?? '',
              style: const TextStyle(color: _text, fontSize: 15, fontWeight: FontWeight.w600),
              maxLines: 1, overflow: TextOverflow.ellipsis),
            const SizedBox(height: 3),
            Text(channel['username']?.toString() ?? '',
              style: const TextStyle(color: _hint, fontSize: 13),
              maxLines: 1, overflow: TextOverflow.ellipsis),
          ])),
          // Subscriber count
          if (channel['subscribers'] != null)
            Text('${_formatCount(channel['subscribers'])}',
              style: const TextStyle(color: _hint, fontSize: 12)),
          const SizedBox(width: 6),
          const Icon(Icons.chevron_right, color: _grey, size: 20),
        ]),
      ),
    );
  }

  String _formatCount(dynamic count) {
    final n = int.tryParse(count.toString()) ?? 0;
    if (n >= 1000000) return '${(n / 1000000).toStringAsFixed(1)}M';
    if (n >= 1000) return '${(n / 1000).toStringAsFixed(1)}K';
    return n.toString();
  }
}

class _ChannelAvatar extends StatelessWidget {
  final Map<String, dynamic> channel;
  final double size;
  const _ChannelAvatar({required this.channel, required this.size});

  @override
  Widget build(BuildContext context) {
    final b64 = channel['cover_b64']?.toString();
    if (b64 != null && b64.isNotEmpty) {
      return ClipRRect(
        borderRadius: BorderRadius.circular(size / 2),
        child: Image.memory(
          WPlugin.base64Decode(b64),
          width: size, height: size, fit: BoxFit.cover,
          errorBuilder: (_, __, ___) => _defaultAvatar(),
        ),
      );
    }
    return _defaultAvatar();
  }

  Widget _defaultAvatar() {
    final title = channel['title']?.toString() ?? '?';
    final letter = title.isNotEmpty ? title[0].toUpperCase() : '?';
    return Container(
      width: size, height: size,
      decoration: BoxDecoration(
        gradient: const LinearGradient(
          colors: [Color(0xFF2AABEE), Color(0xFF007AFF)],
          begin: Alignment.topLeft, end: Alignment.bottomRight,
        ),
        shape: BoxShape.circle,
      ),
      child: Center(child: Text(letter, style: TextStyle(
        color: Colors.white, fontSize: size * 0.4, fontWeight: FontWeight.bold))),
    );
  }
}

// ═════════════════════════════════════════════════════════════════════════════
// CHANNEL DETAIL — liste des fichiers
// ═════════════════════════════════════════════════════════════════════════════
class _ChannelDetailScreen extends StatefulWidget {
  final Map<String, dynamic> channel;
  const _ChannelDetailScreen({required this.channel});
  @override
  State<_ChannelDetailScreen> createState() => _ChannelDetailScreenState();
}

class _ChannelDetailScreenState extends State<_ChannelDetailScreen> {
  List<Map<String, dynamic>> _files = [];
  bool _loading = false;
  bool _hasMore = true;
  int _offset = 0;
  static const _limit = 20;
  final _scrollCtrl = ScrollController();

  @override
  void initState() {
    super.initState();
    _loadFiles();
    _scrollCtrl.addListener(() {
      if (_scrollCtrl.position.pixels >= _scrollCtrl.position.maxScrollExtent - 100) {
        if (_hasMore && !_loading) _loadFiles();
      }
    });
  }

  Future<void> _loadFiles() async {
    setState(() => _loading = true);
    try {
      final apiId   = await WPlugin.getPreference('tg_api_id') ?? '';
      final apiHash = await WPlugin.getPreference('tg_api_hash') ?? '';
      final session = await WPlugin.getPreference('tg_session_string') ?? '';

      final result = await WPlugin.invoke('list', {
        'api_id':   apiId,
        'api_hash': apiHash,
        'session':  session,
        'channel':  widget.channel['username'],
        'offset':   _offset,
        'limit':    _limit,
      });

      if (result['status'] == 'ok') {
        final data = result['data'] as Map<String, dynamic>;
        final items = (data['items'] as List).cast<Map<String, dynamic>>();
        setState(() {
          _files.addAll(items);
          _hasMore = data['has_more'] == true;
          _offset += items.length;
        });
      }
    } catch (e) {
      WPlugin.showToast('Load error: $e');
    } finally {
      setState(() => _loading = false);
    }
  }

  void _openFile(Map<String, dynamic> file) async {
    final apiId   = await WPlugin.getPreference('tg_api_id') ?? '';
    final apiHash = await WPlugin.getPreference('tg_api_hash') ?? '';
    final session = await WPlugin.getPreference('tg_session_string') ?? '';

    WPlugin.openReader({
      'source':   'telegram',
      'channel':  widget.channel['username'],
      'msg_id':   file['msg_id'],
      'title':    file['title'],
      'filename': file['filename'],
      'size':     file['size'],
      'api_id':   apiId,
      'api_hash': apiHash,
      'session':  session,
    });
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: _bg,
      body: CustomScrollView(
        controller: _scrollCtrl,
        slivers: [
          // ── App bar avec cover du canal ─────────────────────────────────
          SliverAppBar(
            backgroundColor: _bg3,
            expandedHeight: 160,
            pinned: true,
            leading: IconButton(
              icon: const Icon(Icons.arrow_back, color: _blue),
              onPressed: () => Navigator.pop(context),
            ),
            flexibleSpace: FlexibleSpaceBar(
              title: Text(
                widget.channel['title']?.toString() ?? '',
                style: const TextStyle(color: _text, fontSize: 15, fontWeight: FontWeight.w600),
              ),
              background: _ChannelBanner(channel: widget.channel),
            ),
          ),

          // ── Liste des fichiers ─────────────────────────────────────────
          SliverList(
            delegate: SliverChildBuilderDelegate(
              (ctx, i) {
                if (i == _files.length) {
                  return _loading
                      ? const Padding(
                          padding: EdgeInsets.all(20),
                          child: Center(child: CircularProgressIndicator(color: _blue, strokeWidth: 2)),
                        )
                      : const SizedBox.shrink();
                }
                return _FileTile(file: _files[i], onTap: () => _openFile(_files[i]));
              },
              childCount: _files.length + 1,
            ),
          ),
        ],
      ),
    );
  }
}

class _ChannelBanner extends StatelessWidget {
  final Map<String, dynamic> channel;
  const _ChannelBanner({required this.channel});
  @override
  Widget build(BuildContext context) {
    final b64 = channel['cover_b64']?.toString();
    return Stack(fit: StackFit.expand, children: [
      if (b64 != null && b64.isNotEmpty)
        Image.memory(WPlugin.base64Decode(b64), fit: BoxFit.cover,
          errorBuilder: (_, __, ___) => Container(color: _bg3))
      else
        Container(
          decoration: const BoxDecoration(
            gradient: LinearGradient(
              colors: [Color(0xFF232E3C), Color(0xFF0E1621)],
              begin: Alignment.topCenter, end: Alignment.bottomCenter,
            ),
          ),
        ),
      Container(
        decoration: BoxDecoration(
          gradient: LinearGradient(
            begin: Alignment.topCenter, end: Alignment.bottomCenter,
            colors: [Colors.transparent, Colors.black.withOpacity(0.7)],
          ),
        ),
      ),
    ]);
  }
}

class _FileTile extends StatelessWidget {
  final Map<String, dynamic> file;
  final VoidCallback onTap;
  const _FileTile({required this.file, required this.onTap});

  @override
  Widget build(BuildContext context) {
    final ext = (file['ext'] as String? ?? '').toUpperCase().replaceFirst('.', '');
    final size = _formatSize(file['size'] ?? 0);
    final date = _formatDate(file['date']?.toString());
    final b64  = file['cover_thumb_b64']?.toString();

    return InkWell(
      onTap: onTap,
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
        decoration: const BoxDecoration(
          border: Border(bottom: BorderSide(color: _divider, width: 0.5))),
        child: Row(children: [
          // Thumbnail
          ClipRRect(
            borderRadius: BorderRadius.circular(8),
            child: SizedBox(
              width: 52, height: 70,
              child: b64 != null && b64.isNotEmpty
                  ? Image.memory(WPlugin.base64Decode(b64), fit: BoxFit.cover,
                      errorBuilder: (_, __, ___) => _extBadge(ext))
                  : _extBadge(ext),
            ),
          ),
          const SizedBox(width: 14),
          // Info
          Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
            Text(file['title']?.toString() ?? file['filename']?.toString() ?? '',
              style: const TextStyle(color: _text, fontSize: 14, fontWeight: FontWeight.w600),
              maxLines: 2, overflow: TextOverflow.ellipsis),
            const SizedBox(height: 4),
            Row(children: [
              _ExtChip(ext: ext),
              const SizedBox(width: 6),
              Text(size, style: const TextStyle(color: _hint, fontSize: 12)),
            ]),
            const SizedBox(height: 3),
            Text(date, style: const TextStyle(color: _grey, fontSize: 11)),
          ])),
          const Icon(Icons.play_circle_outline_rounded, color: _blue, size: 28),
        ]),
      ),
    );
  }

  Widget _extBadge(String ext) {
    Color color;
    switch (ext.toLowerCase()) {
      case 'cbr': case 'cbz': color = const Color(0xFF9C27B0); break;
      case 'pdf': color = const Color(0xFFE53935); break;
      case 'epub': color = const Color(0xFF43A047); break;
      default: color = _grey;
    }
    return Container(
      color: color.withOpacity(0.15),
      child: Center(child: Text(ext.isEmpty ? '?' : ext,
        style: TextStyle(color: color, fontSize: 13, fontWeight: FontWeight.bold))),
    );
  }

  String _formatSize(dynamic bytes) {
    final n = int.tryParse(bytes.toString()) ?? 0;
    if (n >= 1024 * 1024) return '${(n / 1024 / 1024).toStringAsFixed(1)} MB';
    if (n >= 1024) return '${(n / 1024).toStringAsFixed(1)} KB';
    return '$n B';
  }

  String _formatDate(String? iso) {
    if (iso == null || iso.isEmpty) return '';
    try {
      final dt = DateTime.parse(iso);
      return '${dt.day}/${dt.month}/${dt.year}';
    } catch (_) { return iso; }
  }
}

class _ExtChip extends StatelessWidget {
  final String ext;
  const _ExtChip({required this.ext});
  @override
  Widget build(BuildContext context) {
    Color color;
    switch (ext.toLowerCase()) {
      case 'cbr': case 'cbz': color = const Color(0xFF9C27B0); break;
      case 'pdf': color = const Color(0xFFE53935); break;
      case 'epub': color = const Color(0xFF43A047); break;
      default: color = _grey;
    }
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
      decoration: BoxDecoration(
        color: color.withOpacity(0.15),
        borderRadius: BorderRadius.circular(4),
      ),
      child: Text(ext, style: TextStyle(color: color, fontSize: 11, fontWeight: FontWeight.bold)),
    );
  }
}

// ═════════════════════════════════════════════════════════════════════════════
// ONGLET 2 — SEARCH GLOBAL
// ═════════════════════════════════════════════════════════════════════════════
class _SearchTab extends StatefulWidget {
  const _SearchTab();
  @override
  State<_SearchTab> createState() => _SearchTabState();
}

class _SearchTabState extends State<_SearchTab> {
  final _ctrl = TextEditingController();
  List<Map<String, dynamic>> _results = [];
  bool _loading = false;
  String? _selectedChannel;
  List<String> _savedChannels = [];

  @override
  void initState() {
    super.initState();
    _loadChannels();
  }

  Future<void> _loadChannels() async {
    final raw = await WPlugin.getPreference('tg_saved_channels');
    if (raw != null && raw.isNotEmpty) {
      try {
        final parsed = WPlugin.parseJson(raw) as List;
        setState(() => _savedChannels = parsed.map((c) => c['username']?.toString() ?? '').where((s) => s.isNotEmpty).toList());
        if (_savedChannels.isNotEmpty) _selectedChannel = _savedChannels.first;
      } catch (_) {}
    }
  }

  Future<void> _search() async {
    final q = _ctrl.text.trim();
    if (q.isEmpty || _selectedChannel == null) return;
    setState(() { _loading = true; _results = []; });
    try {
      final apiId   = await WPlugin.getPreference('tg_api_id') ?? '';
      final apiHash = await WPlugin.getPreference('tg_api_hash') ?? '';
      final session = await WPlugin.getPreference('tg_session_string') ?? '';

      final result = await WPlugin.invoke('search', {
        'api_id':   apiId,
        'api_hash': apiHash,
        'session':  session,
        'channel':  _selectedChannel,
        'query':    q,
        'limit':    30,
      });

      if (result['status'] == 'ok') {
        final items = (result['data']['results'] as List).cast<Map<String, dynamic>>();
        setState(() => _results = items);
      }
    } catch (e) {
      WPlugin.showToast('Search error: $e');
    } finally {
      setState(() => _loading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: _bg,
      appBar: AppBar(
        backgroundColor: _bg3,
        elevation: 0,
        title: const Text('Search', style: TextStyle(color: _text, fontSize: 17, fontWeight: FontWeight.w600)),
      ),
      body: Column(children: [
        // ── Channel selector ───────────────────────────────────────────────
        if (_savedChannels.isNotEmpty)
          Container(
            height: 44,
            color: _bg3,
            padding: const EdgeInsets.symmetric(horizontal: 16),
            child: SingleChildScrollView(
              scrollDirection: Axis.horizontal,
              child: Row(
                children: _savedChannels.map((ch) => GestureDetector(
                  onTap: () => setState(() => _selectedChannel = ch),
                  child: Container(
                    margin: const EdgeInsets.only(right: 8),
                    padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                    decoration: BoxDecoration(
                      color: _selectedChannel == ch ? _blue : _bg2,
                      borderRadius: BorderRadius.circular(20),
                    ),
                    child: Text(ch, style: TextStyle(
                      color: _selectedChannel == ch ? Colors.white : _hint,
                      fontSize: 13, fontWeight: FontWeight.w500)),
                  ),
                )).toList(),
              ),
            ),
          ),

        // ── Search bar ─────────────────────────────────────────────────────
        Padding(
          padding: const EdgeInsets.all(12),
          child: Row(children: [
            Expanded(
              child: Container(
                decoration: BoxDecoration(color: _bg2, borderRadius: BorderRadius.circular(12)),
                child: TextField(
                  controller: _ctrl,
                  style: const TextStyle(color: _text, fontSize: 15),
                  decoration: const InputDecoration(
                    border: InputBorder.none,
                    contentPadding: EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                    prefixIcon: Icon(Icons.search, color: _hint, size: 22),
                    hintText: 'Search in channel...',
                    hintStyle: TextStyle(color: _hint),
                  ),
                  onSubmitted: (_) => _search(),
                ),
              ),
            ),
            const SizedBox(width: 8),
            _TgButton(label: 'Go', loading: _loading, onTap: _search, compact: true),
          ]),
        ),

        // ── Results ────────────────────────────────────────────────────────
        Expanded(
          child: _results.isEmpty
              ? Center(child: Text(
                  _savedChannels.isEmpty ? 'Add a channel first' : 'Search in your channels',
                  style: const TextStyle(color: _hint, fontSize: 15)))
              : ListView.builder(
                  itemCount: _results.length,
                  itemBuilder: (ctx, i) => _FileTile(
                    file: _results[i],
                    onTap: () => WPlugin.openReader({
                      'source':   'telegram',
                      'channel':  _selectedChannel,
                      'msg_id':   _results[i]['msg_id'],
                      'title':    _results[i]['title'],
                      'filename': _results[i]['filename'],
                    }),
                  ),
                ),
        ),
      ]),
    );
  }
}

// ═════════════════════════════════════════════════════════════════════════════
// ONGLET 3 — SETTINGS
// ═════════════════════════════════════════════════════════════════════════════
class _SettingsTab extends StatelessWidget {
  const _SettingsTab();

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: _bg,
      appBar: AppBar(
        backgroundColor: _bg3,
        elevation: 0,
        title: const Text('Settings', style: TextStyle(color: _text, fontSize: 17, fontWeight: FontWeight.w600)),
      ),
      body: ListView(children: [
        const SizedBox(height: 20),

        // ── Section account ────────────────────────────────────────────────
        _SectionHeader('Account'),
        _SettingItem(
          icon: Icons.person_outline_rounded,
          color: _blue,
          label: 'Phone number',
          trailing: FutureBuilder(
            future: WPlugin.getPreference('tg_phone'),
            builder: (_, snap) => Text(snap.data?.toString() ?? '—',
              style: const TextStyle(color: _hint, fontSize: 14)),
          ),
        ),
        _SettingItem(
          icon: Icons.vpn_key_outlined,
          color: const Color(0xFF9C27B0),
          label: 'Session status',
          trailing: FutureBuilder(
            future: WPlugin.getPreference('tg_session_string'),
            builder: (_, snap) => Row(mainAxisSize: MainAxisSize.min, children: [
              Container(width: 8, height: 8,
                decoration: BoxDecoration(
                  color: (snap.data?.isNotEmpty == true) ? _success : _error,
                  shape: BoxShape.circle)),
              const SizedBox(width: 6),
              Text((snap.data?.isNotEmpty == true) ? 'Active' : 'No session',
                style: const TextStyle(color: _hint, fontSize: 14)),
            ]),
          ),
        ),
        _SettingItem(
          icon: Icons.logout_rounded,
          color: _error,
          label: 'Sign out',
          textColor: _error,
          onTap: () => showDialog(
            context: context,
            builder: (_) => AlertDialog(
              backgroundColor: _bg2,
              title: const Text('Sign out', style: TextStyle(color: _text)),
              content: const Text('This will remove your session. You\'ll need to sign in again.',
                style: TextStyle(color: _hint)),
              actions: [
                TextButton(onPressed: () => Navigator.pop(context),
                  child: const Text('Cancel', style: TextStyle(color: _hint))),
                TextButton(
                  onPressed: () async {
                    await WPlugin.setPreference('tg_session_string', '');
                    await WPlugin.setPreference('tg_saved_channels', '');
                    Navigator.pop(context);
                    WPlugin.restartPlugin();
                  },
                  child: const Text('Sign out', style: TextStyle(color: _error)),
                ),
              ],
            ),
          ),
        ),

        const SizedBox(height: 20),

        // ── Section preferences ────────────────────────────────────────────
        _SectionHeader('Preferences'),
        _SettingItem(
          icon: Icons.speed_rounded,
          color: const Color(0xFF43A047),
          label: 'Chunk size',
          trailing: const Text('64 KB', style: TextStyle(color: _hint, fontSize: 14)),
        ),
        _SettingItem(
          icon: Icons.timer_outlined,
          color: const Color(0xFFFF9800),
          label: 'Timeout',
          trailing: const Text('30s', style: TextStyle(color: _hint, fontSize: 14)),
        ),

        const SizedBox(height: 20),

        // ── Section about ──────────────────────────────────────────────────
        _SectionHeader('About'),
        _SettingItem(
          icon: Icons.info_outline_rounded,
          color: _blue,
          label: 'Version',
          trailing: const Text('1.0.0', style: TextStyle(color: _hint, fontSize: 14)),
        ),
        _SettingItem(
          icon: Icons.code_rounded,
          color: _grey,
          label: 'Repository',
          onTap: () => WPlugin.openUrl('https://github.com/ferelking242/watchtower-telegram-plugin'),
        ),

        const SizedBox(height: 40),
      ]),
    );
  }
}

class _SectionHeader extends StatelessWidget {
  final String title;
  const _SectionHeader(this.title);
  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.fromLTRB(16, 8, 16, 6),
      child: Text(title.toUpperCase(),
        style: const TextStyle(color: _hint, fontSize: 11, fontWeight: FontWeight.w600, letterSpacing: 0.8)),
    );
  }
}

class _SettingItem extends StatelessWidget {
  final IconData icon;
  final Color color;
  final String label;
  final Widget? trailing;
  final Color? textColor;
  final VoidCallback? onTap;
  const _SettingItem({required this.icon, required this.color, required this.label,
    this.trailing, this.textColor, this.onTap});

  @override
  Widget build(BuildContext context) {
    return InkWell(
      onTap: onTap,
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
        decoration: const BoxDecoration(
          border: Border(bottom: BorderSide(color: _divider, width: 0.5))),
        child: Row(children: [
          Container(
            width: 32, height: 32,
            decoration: BoxDecoration(color: color, borderRadius: BorderRadius.circular(8)),
            child: Icon(icon, color: Colors.white, size: 18),
          ),
          const SizedBox(width: 14),
          Expanded(child: Text(label, style: TextStyle(
            color: textColor ?? _text, fontSize: 15))),
          if (trailing != null) trailing!
          else if (onTap != null) const Icon(Icons.chevron_right, color: _grey, size: 20),
        ]),
      ),
    );
  }
}

// ═════════════════════════════════════════════════════════════════════════════
// COMPOSANTS RÉUTILISABLES
// ═════════════════════════════════════════════════════════════════════════════

class _TgInputField extends StatelessWidget {
  final TextEditingController controller;
  final String label;
  final String hint;
  final bool obscureText;
  final TextInputType? keyboardType;
  final Widget? suffix;
  final bool autofocus;
  const _TgInputField({required this.controller, required this.label, required this.hint,
    this.obscureText = false, this.keyboardType, this.suffix, this.autofocus = false});

  @override
  Widget build(BuildContext context) {
    return Container(
      decoration: BoxDecoration(
        color: _bg2,
        borderRadius: BorderRadius.circular(10),
      ),
      child: TextField(
        controller: controller,
        obscureText: obscureText,
        keyboardType: keyboardType,
        autofocus: autofocus,
        style: const TextStyle(color: _text, fontSize: 16),
        decoration: InputDecoration(
          border: InputBorder.none,
          contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 16),
          labelText: label,
          labelStyle: const TextStyle(color: _hint, fontSize: 14),
          hintText: hint,
          hintStyle: const TextStyle(color: _grey, fontSize: 15),
          suffixIcon: suffix,
        ),
      ),
    );
  }
}

class _TgButton extends StatelessWidget {
  final String label;
  final bool loading;
  final VoidCallback onTap;
  final bool compact;
  const _TgButton({required this.label, required this.loading,
    required this.onTap, this.compact = false});

  @override
  Widget build(BuildContext context) {
    return SizedBox(
      width: compact ? null : double.infinity,
      child: ElevatedButton(
        style: ElevatedButton.styleFrom(
          backgroundColor: _blue,
          foregroundColor: Colors.white,
          padding: compact
              ? const EdgeInsets.symmetric(horizontal: 16, vertical: 12)
              : const EdgeInsets.symmetric(vertical: 16),
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
          elevation: 0,
        ),
        onPressed: loading ? null : onTap,
        child: loading
            ? const SizedBox(width: 20, height: 20,
                child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2))
            : Text(label, style: const TextStyle(fontSize: 16, fontWeight: FontWeight.w600)),
      ),
    );
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Entry point retourné au runtime
// ─────────────────────────────────────────────────────────────────────────────
TelegramSourcePlugin()
