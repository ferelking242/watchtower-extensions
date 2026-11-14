# Hetu plugin compiler pitfalls (hetu_script_dev_tools 0.1.0+2)

The pinned Hetu compiler (`0.1.0+2`, the only version whose bytecode the
Watchtower `hetu_script 0.4.2` runtime can load) **miscompiles** several
constructs. The plugin still compiles to valid bytecode, so a compile check
passes while the plugin silently returns empty lists at runtime. Always test
against the live API, not just the compiler.

## Confirmed defects

1. `continue` inside a `for`-`in` loop does not skip the current iteration; it
   terminates the whole loop. Any `if (x == "") continue` guard therefore makes
   the enclosing list empty. Rewrite as a positive `if (x != "") { ... }` block.
2. A call expression directly in the `for`-`in` header
   (`for (var x in parser.findAll(res, "..."))`) makes the loop body iterate
   **zero** times. Bind the expression to a local first, then loop over the
   local.
3. Inline `.add(converter.track(item))` inside a nested `if` can yield 0 rows;
   assigning to a local first works. Prefer the local-then-add pattern.

These are the reason the `youtubemusic` plugin returned empty search/browse/
album/playlist/radio results while passing every static check.

## Radio / queue

`next` with only a `videoId` returns a 1-item queue. YouTube Music's real
radio is the autoplay playlist `RDAMVM<videoId>`; pass it as `playlistId` to
`next` to get the full queue.

## Verify

- Build: `./plugin-sources/build_all.sh <dir>` (e.g. `youtubemusic`).
- Live: `cd watchtower && flutter test test/music_youtubemusic_plugin_live_test.dart --dart-define=RUN_LIVE_PLUGIN_TESTS=true`
  (skipped by default; resolves the artifact from the app bundle or `../wtx/plugins`).
- Static: `test/music_plugin_entrypoint_test.dart` checks every bundled
  `plugin.json#entryPoint` names a class the bytecode actually exports.
