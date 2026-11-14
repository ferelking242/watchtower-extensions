import 'dart:convert';

import 'package:desktop_webview_window/desktop_webview_window.dart';
import 'package:example/form.dart';
import 'package:example/localstorage.dart';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_markdown_plus/flutter_markdown_plus.dart';
import 'package:get_it/get_it.dart';
import 'package:hetu_script/hetu_script.dart';
import 'package:hetu_spotube_plugin/hetu_spotube_plugin.dart';
import 'package:hetu_std/hetu_std.dart';
import 'package:shared_preferences/shared_preferences.dart';

final getIt = GetIt.instance;

void prettyPrint(dynamic message) {
  if (message case Map() || Iterable()) {
    debugPrint(const JsonEncoder.withIndent('  ').convert(message));
  } else if (message is String) {
    debugPrint(message);
  } else {
    debugPrint(message.toString());
  }
}

void main(List<String> args) async {
  WidgetsFlutterBinding.ensureInitialized();

  if (runWebViewTitleBarWidget(args)) {
    return;
  }

  final hetu = Hetu();
  getIt.registerSingleton<Hetu>(hetu);
  getIt.registerSingleton<SharedPreferences>(
    await SharedPreferences.getInstance(),
  );

  hetu.init();
  HetuStdLoader.loadBindings(hetu);

  await HetuStdLoader.loadBytecodeFlutter(hetu);
  await HetuSpotubePluginLoader.loadBytecodeFlutter(hetu);
  final byteCode = await rootBundle.load("assets/bytecode/plugin.out");
  await hetu.loadBytecode(
    bytes: byteCode.buffer.asUint8List(),
    moduleName: "plugin",
  );

  runApp(const MainApp());
}

class MainApp extends StatelessWidget {
  const MainApp({super.key});

  @override
  Widget build(BuildContext context) {
    return const MaterialApp(home: Scaffold(body: MyHome()));
  }
}

class MyHome extends StatefulWidget {
  const MyHome({super.key});

  @override
  State<MyHome> createState() => _MyHomeState();
}

class _MyHomeState extends State<MyHome> {
  @override
  void initState() {
    super.initState();
    final hetu = getIt<Hetu>();
    BuildContext? pageContext;
    HetuSpotubePluginLoader.loadBindings(
      hetu,
      localStorageImpl: SharedPreferencesLocalStorage(
        getIt<SharedPreferences>(),
      ),
      onNavigatorPush: (route) {
        Navigator.push(
          context,
          MaterialPageRoute(
            builder: (context) {
              pageContext = context;
              return Scaffold(
                appBar: AppBar(title: const Text('WebView')),
                body: route,
              );
            },
          ),
        );
      },
      onNavigatorPop: () {
        if (pageContext == null) {
          return;
        }
        Navigator.pop(pageContext!);
      },
      onShowForm: (title, fields) {
        return Navigator.push(
          context,
          MaterialPageRoute(
            builder: (context) {
              return FormPage(title: title, fields: fields);
            },
          ),
        );
      },
    );

    hetu.eval(r"""
    import "module:plugin" as plugin;

    var BrainzMetadataProviderPlugin = plugin.BrainzMetadataProviderPlugin;
    var metadata = BrainzMetadataProviderPlugin()
    """);
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: SingleChildScrollView(
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          spacing: 12,
          children: [
            Row(
              spacing: 12,
              children: [
                ElevatedButton(
                  onPressed: () async {
                    try {
                      await getIt<Hetu>().eval("metadata.auth.authenticate()");
                    } catch (e, stackTrace) {
                      prettyPrint("Error during authentication: $e");
                      debugPrintStack(stackTrace: stackTrace);
                    }
                  },
                  child: Text("Login"),
                ),
                ElevatedButton(
                  onPressed: () async {
                    try {
                      await getIt<Hetu>().eval(
                        "metadata.core.checkUpdate({version: '1.0.0'}.toJson())",
                      );
                    } catch (e, stackTrace) {
                      prettyPrint("Error during checking update: $e");
                      debugPrintStack(stackTrace: stackTrace);
                    }
                  },
                  child: Text("Check update!"),
                ),
                ElevatedButton(
                  onPressed: () async {
                    try {
                      final support = await getIt<Hetu>().eval(
                        "metadata.core.support",
                      );
                      prettyPrint(support);

                      if (!context.mounted) return;
                      showDialog(
                        context: context,
                        builder: (context) {
                          return AlertDialog(
                            content: MarkdownBody(data: support.toString()),
                            actions: [
                              TextButton(
                                onPressed: () => Navigator.pop(context),
                                child: Text("Close"),
                              ),
                            ],
                          );
                        },
                      );
                    } catch (e, stackTrace) {
                      prettyPrint("Error during checking support: $e");
                      debugPrintStack(stackTrace: stackTrace);
                    }
                  },
                  child: Text("Support!"),
                ),
                ElevatedButton(
                  onPressed: () async {
                    try {
                      final support = await getIt<Hetu>().eval("""
                        metadata.core.scrobble({
                          id: "5842a3fd-f00c-4ce7-98f8-7f5b044ab0bb",
                          title: "My House Is Not a Home",
                          artists: [
                            {
                              id: "d8e07579-ff5a-41f2-b7a7-c71880b8287a",
                              name: "d4vd"
                            }
                          ],
                          album: {
                            id: "74a2be07-04fc-4713-98d0-a97158cca4bb",
                            name: "My House Is Not a Home"
                          },
                          timestamp: ${DateTime.now().millisecondsSinceEpoch ~/ 1000},
                          duration_ms: 239000,
                          isrc: "USUM72401159"
                        }.toJson())
                        """);
                      prettyPrint(support);
                    } catch (e, stackTrace) {
                      prettyPrint("Error during checking support: $e");
                      debugPrintStack(stackTrace: stackTrace);
                    }
                  },
                  child: Text("Scrobble!"),
                ),
              ],
            ),
            Text("User"),
            Wrap(
              spacing: 12,
              runSpacing: 12,
              children: [
                ElevatedButton(
                  onPressed: () async {
                    final result = await getIt<Hetu>().eval(
                      "metadata.user.me()",
                    );
                    prettyPrint(result);
                  },
                  child: Text("Get Me"),
                ),
                ElevatedButton(
                  onPressed: () async {
                    final result = await getIt<Hetu>().eval(
                      "metadata.user.savedTracks()",
                    );
                    prettyPrint(result);
                  },
                  child: Text("Get User Saved Tracks"),
                ),
                ElevatedButton(
                  onPressed: () async {
                    final result = await getIt<Hetu>().eval(
                      "metadata.user.savedPlaylists()",
                    );
                    prettyPrint(result);
                  },
                  child: Text("Get User Saved Playlists"),
                ),
                ElevatedButton(
                  onPressed: () async {
                    final result = await getIt<Hetu>().eval(
                      "metadata.user.savedAlbums()",
                    );
                    prettyPrint(result);
                  },
                  child: Text("Get User Saved Albums"),
                ),
                ElevatedButton(
                  onPressed: () async {
                    final result = await getIt<Hetu>().eval(
                      "metadata.user.savedArtists()",
                    );
                    prettyPrint(result);
                  },
                  child: Text("Get User Saved Artists"),
                ),
                ElevatedButton(
                  onPressed: () async {
                    final result = await getIt<Hetu>().eval("""
                      metadata.user.isSavedTracks([
                        'd2555d82-571d-406c-8e96-21562753cebc',
                        'a16e6dab-38d7-4ec6-b751-c1ebb5e62c22'
                      ])
                      """);
                    prettyPrint(result);
                  },
                  child: Text("Is track saved?"),
                ),
                ElevatedButton(
                  onPressed: () async {
                    final result = await getIt<Hetu>().eval(
                      "metadata.user.isSavedPlaylist('dc2ad3e2-af4d-492f-a814-8179df4cee70')",
                    );
                    prettyPrint(result);
                  },
                  child: Text("Is playlist saved?"),
                ),
                ElevatedButton(
                  onPressed: () async {
                    final result = await getIt<Hetu>().eval(
                      "metadata.user.isSavedAlbums(['dbecf03e-18ab-4d35-8371-a30c1dc356ba'])",
                    );
                    prettyPrint(result);
                  },
                  child: Text("Is album saved?"),
                ),
                ElevatedButton(
                  onPressed: () async {
                    final result = await getIt<Hetu>().eval(
                      "metadata.user.isSavedArtists(['80609a00-b394-4a49-975b-2db6b543fa97'])",
                    );
                    prettyPrint(result);
                  },
                  child: Text("Is artist saved?"),
                ),
              ],
            ),
            Text("Tracks"),
            Row(
              spacing: 12,
              children: [
                ElevatedButton(
                  onPressed: () async {
                    final result = await getIt<Hetu>().eval(
                      "metadata.track.getTrack('3f69c2a8-648e-48ee-b34a-4243485aa74c')",
                    );
                    prettyPrint(result);
                  },
                  child: Text("Get Track"),
                ),
                ElevatedButton(
                  onPressed: () async {
                    final result = await getIt<Hetu>().eval(
                      "metadata.track.save(['3f69c2a8-648e-48ee-b34a-4243485aa74c'])",
                    );
                    prettyPrint(result);
                  },
                  child: Text("Save Track"),
                ),
                ElevatedButton(
                  onPressed: () async {
                    final result = await getIt<Hetu>().eval(
                      "metadata.track.unsave(['3f69c2a8-648e-48ee-b34a-4243485aa74c'])",
                    );
                    prettyPrint(result);
                  },
                  child: Text("Unsave Track"),
                ),
                ElevatedButton(
                  onPressed: () async {
                    final result = await getIt<Hetu>().eval(
                      "metadata.track.radio('3f69c2a8-648e-48ee-b34a-4243485aa74c')",
                    );
                    prettyPrint(result);
                  },
                  child: Text("Generate Radio"),
                ),
              ],
            ),
            Text("Playlists"),
            Wrap(
              spacing: 12,
              runSpacing: 12,
              children: [
                ElevatedButton(
                  onPressed: () async {
                    final result = await getIt<Hetu>().eval(
                      "metadata.playlist.getPlaylist('dc2ad3e2-af4d-492f-a814-8179df4cee70')",
                    );
                    prettyPrint(result);
                  },
                  child: Text("Get Playlist"),
                ),
                ElevatedButton(
                  onPressed: () async {
                    final result = await getIt<Hetu>().eval(
                      "metadata.playlist.tracks('dc2ad3e2-af4d-492f-a814-8179df4cee70')",
                    );
                    prettyPrint(result);
                  },
                  child: Text("Get Playlist Tracks"),
                ),
                ElevatedButton(
                  onPressed: () async {
                    final result = await getIt<Hetu>().eval("""
                      var myPlaylist
                      metadata.user.me().then((me) {
                        return metadata.playlist.create(
                          me["id"],
                          name: "Hetu Playlist",
                          description: "This is a playlist created by Hetu"
                        ).then((playlist){
                          myPlaylist = playlist
                          return playlist
                        })
                      })
                      """);
                    prettyPrint(result);
                  },
                  child: Text("Create Playlist"),
                ),
                ElevatedButton(
                  onPressed: () async {
                    // Create playlist must be called first
                    final result = await getIt<Hetu>().eval("""
                      metadata.playlist.update(
                        myPlaylist["id"],
                        name: "Hetu Update Playlist",
                        description: "This playlist is updated by Hetu"
                      ).then((data)=> metadata.playlist.getPlaylist(myPlaylist["id"]))
                      """);
                    prettyPrint(result);
                  },
                  child: Text("Update Playlist"),
                ),
                ElevatedButton(
                  onPressed: () async {
                    // Create playlist must be called first
                    final result = await getIt<Hetu>().eval(
                      'metadata.playlist.deletePlaylist(myPlaylist["id"])',
                    );
                    prettyPrint(result);
                  },
                  child: Text("Delete Playlist"),
                ),
                ElevatedButton(
                  onPressed: () async {
                    final result = await getIt<Hetu>().eval(
                      'metadata.playlist.save("37i9dQZF1E4oJSdHZrVjxD")',
                    );
                    prettyPrint(result);
                  },
                  child: Text("Save Playlist"),
                ),
                ElevatedButton(
                  onPressed: () async {
                    final result = await getIt<Hetu>().eval(
                      'metadata.playlist.unsave("37i9dQZF1E4oJSdHZrVjxD")',
                    );
                    prettyPrint(result);
                  },
                  child: Text("Unsave Playlist"),
                ),
                ElevatedButton(
                  onPressed: () async {
                    // Create playlist must be called first
                    final result = await getIt<Hetu>().eval(
                      'metadata.playlist.addTracks(myPlaylist["id"], trackIds: ["a817f622-2f84-428a-86e0-c50378d886bc"])',
                    );
                    prettyPrint(result);
                  },
                  child: Text("Add Tracks"),
                ),
                ElevatedButton(
                  onPressed: () async {
                    // Create playlist must be called first
                    final result = await getIt<Hetu>().eval(
                      'metadata.playlist.removeTracks(myPlaylist["id"], trackIds: ["a817f622-2f84-428a-86e0-c50378d886bc"])',
                    );
                    prettyPrint(result);
                  },
                  child: Text("Remove Tracks"),
                ),
              ],
            ),
            Text("Albums"),
            Row(
              spacing: 12,
              children: [
                ElevatedButton(
                  onPressed: () async {
                    final result = await getIt<Hetu>().eval(
                      "metadata.album.getAlbum('0f9d5103-dd09-4fcd-8fe1-223612668f09')",
                    );
                    prettyPrint(result);
                  },
                  child: Text("Get Album"),
                ),
                ElevatedButton(
                  onPressed: () async {
                    final result = await getIt<Hetu>().eval(
                      "metadata.album.tracks('0f9d5103-dd09-4fcd-8fe1-223612668f09')",
                    );
                    prettyPrint(result);
                  },
                  child: Text("Get Album Tracks"),
                ),
                ElevatedButton(
                  onPressed: () async {
                    final result = await getIt<Hetu>().eval(
                      "metadata.album.releases()",
                    );
                    prettyPrint(result);
                  },
                  child: Text("Releases"),
                ),
                ElevatedButton(
                  onPressed: () async {
                    final result = await getIt<Hetu>().eval(
                      'metadata.album.save(["b45ace46-81cd-4832-93a4-62baaefe6893"])',
                    );
                    prettyPrint(result);
                  },
                  child: Text("Save Album"),
                ),
                ElevatedButton(
                  onPressed: () async {
                    final result = await getIt<Hetu>().eval(
                      'metadata.album.unsave(["b45ace46-81cd-4832-93a4-62baaefe6893"])',
                    );
                    prettyPrint(result);
                  },
                  child: Text("Unsave Album"),
                ),
              ],
            ),
            Text("Artists"),
            Row(
              spacing: 12,
              children: [
                ElevatedButton(
                  onPressed: () async {
                    final result = await getIt<Hetu>().eval(
                      "metadata.artist.getArtist('a6c6897a-7415-4f8d-b5a5-3a5e05f3be67')",
                    );
                    prettyPrint(result);
                  },
                  child: Text("Get Artist"),
                ),
                ElevatedButton(
                  onPressed: () async {
                    final result = await getIt<Hetu>().eval(
                      "metadata.artist.topTracks('a6c6897a-7415-4f8d-b5a5-3a5e05f3be67')",
                    );
                    prettyPrint(result);
                  },
                  child: Text("Artist Top Tracks"),
                ),
                ElevatedButton(
                  onPressed: () async {
                    final result = await getIt<Hetu>().eval(
                      "metadata.artist.related('a6c6897a-7415-4f8d-b5a5-3a5e05f3be67')",
                    );
                    prettyPrint(result);
                  },
                  child: Text("Related Artists"),
                ),
                ElevatedButton(
                  onPressed: () async {
                    final result = await getIt<Hetu>().eval(
                      "metadata.artist.albums('a6c6897a-7415-4f8d-b5a5-3a5e05f3be67')",
                    );
                    prettyPrint(result);
                  },
                  child: Text("Artist albums"),
                ),
                ElevatedButton(
                  onPressed: () async {
                    final result = await getIt<Hetu>().eval(
                      "metadata.artist.save(['c75b226d-d643-41dc-a2b7-00c0ff8c8e7b'])",
                    );
                    prettyPrint(result);
                  },
                  child: Text("Save Artist"),
                ),
                ElevatedButton(
                  onPressed: () async {
                    final result = await getIt<Hetu>().eval(
                      "metadata.artist.unsave(['c75b226d-d643-41dc-a2b7-00c0ff8c8e7b'])",
                    );
                    prettyPrint(result);
                  },
                  child: Text("Unsave Artists"),
                ),
              ],
            ),
            Text("Search"),
            TextField(
              decoration: InputDecoration(
                labelText: "Search Query",
                hintText: "Enter search query",
              ),
              onSubmitted: (query) async {
                final result = await getIt<Hetu>().eval(
                  "metadata.search.all('$query')",
                );
                prettyPrint(result);
              },
            ),
            Row(
              spacing: 12,
              children: [
                ElevatedButton(
                  onPressed: () async {
                    final result = await getIt<Hetu>().eval(
                      "metadata.search.all('Twenty One Pilots')",
                    );
                    prettyPrint(result);
                  },
                  child: Text("Search Twenty One Pilots"),
                ),
                ElevatedButton(
                  onPressed: () async {
                    final result = await getIt<Hetu>().eval(
                      "metadata.search.tracks('Twenty One Pilots')",
                    );
                    prettyPrint(result);
                  },
                  child: Text("Only Tracks"),
                ),
                ElevatedButton(
                  onPressed: () async {
                    final result = await getIt<Hetu>().eval(
                      "metadata.search.albums('Twenty One Pilots')",
                    );
                    prettyPrint(result);
                  },
                  child: Text("Only albums"),
                ),
                ElevatedButton(
                  onPressed: () async {
                    final result = await getIt<Hetu>().eval(
                      "metadata.search.artists('Twenty One Pilots')",
                    );
                    prettyPrint(result);
                  },
                  child: Text("Only artists"),
                ),
                ElevatedButton(
                  onPressed: () async {
                    final result = await getIt<Hetu>().eval(
                      "metadata.search.playlists('Twenty One Pilots')",
                    );
                    prettyPrint(result);
                  },
                  child: Text("Only playlists"),
                ),
              ],
            ),
            Text("Browse"),
            Row(
              spacing: 12,
              children: [
                ElevatedButton(
                  onPressed: () async {
                    final result = await getIt<Hetu>().eval(
                      "metadata.browse.sections()",
                    );
                    prettyPrint(result);
                  },
                  child: Text("Browse sections"),
                ),
                ElevatedButton(
                  onPressed: () async {
                    final result = await getIt<Hetu>().eval(
                      "metadata.browse.sectionItems('0JQ5DAnM3wGh0gz1MXnu3B')",
                    );
                    prettyPrint(result);
                  },
                  child: Text("Popular singles and albums"),
                ),
                ElevatedButton(
                  onPressed: () async {
                    final result = await getIt<Hetu>().eval(
                      "metadata.browse.sectionItems('0JQ5DAuChZYPe9iDhh2mJz')",
                    );
                    prettyPrint(result);
                  },
                  child: Text("Today in Music"),
                ),
                ElevatedButton(
                  onPressed: () async {
                    final result = await getIt<Hetu>().eval(
                      "metadata.browse.sectionItems('0JQ5DAnM3wGh0gz1MXnu3C')",
                    );
                    prettyPrint(result);
                  },
                  child: Text("Popular Artists"),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }
}
