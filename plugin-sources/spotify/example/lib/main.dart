import 'dart:io';

import 'package:desktop_webview_window/desktop_webview_window.dart';
import 'package:example/localstorage.dart';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:get_it/get_it.dart';
import 'package:hetu_script/hetu_script.dart';
import 'package:hetu_spotube_plugin/hetu_spotube_plugin.dart';
import 'package:hetu_std/hetu_std.dart';
import 'package:shared_preferences/shared_preferences.dart';

final getIt = GetIt.instance;

class MyHttpOverrides extends HttpOverrides {
  @override
  HttpClient createHttpClient(SecurityContext? context) {
    return super.createHttpClient(context)
      ..badCertificateCallback =
          (X509Certificate cert, String host, int port) => true;
  }
}

void main(List<String> args) async {
  WidgetsFlutterBinding.ensureInitialized();

  if (runWebViewTitleBarWidget(args)) {
    return;
  }

  HttpOverrides.global = MyHttpOverrides();

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
      onShowForm: (title, fields) async {
        return [];
      },
    );

    hetu.eval(r"""
    import "module:plugin" as plugin;

    var SpotifyMetadataProviderPlugin = plugin.SpotifyMetadataProviderPlugin;
    var metadata = SpotifyMetadataProviderPlugin()
    """);
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: ListView(
        children: [
          Wrap(
            children: [
              ElevatedButton(
                onPressed: () async {
                  await getIt<Hetu>().eval("metadata.auth.authenticate()");
                },
                child: Text("Login"),
              ),
              ElevatedButton(
                onPressed: () async {
                  await getIt<Hetu>().eval("metadata.core.checkUpdate({version: '1.0.0'}.toJson())");
                },
                child: Text("Check Update"),
              ),
              ElevatedButton(
                onPressed: () async {
                  final result = await getIt<Hetu>().eval("metadata.core.support");
                  debugPrint(result.toString());
                },
                child: Text("Support"),
              ),
            ],
          ),
          Text("User"),
          Wrap(
            children: [
              ElevatedButton(
                onPressed: () async {
                  final result = await getIt<Hetu>().eval("metadata.user.me()");
                  debugPrint(result.toString());
                },
                child: Text("Get Me"),
              ),
              ElevatedButton(
                onPressed: () async {
                  final result = await getIt<Hetu>().eval(
                    "metadata.user.savedTracks()",
                  );
                  debugPrint(result.toString());
                },
                child: Text("Get User Saved Tracks"),
              ),
              ElevatedButton(
                onPressed: () async {
                  final result = await getIt<Hetu>().eval(
                    "metadata.user.savedPlaylists()",
                  );
                  debugPrint(result.toString());
                },
                child: Text("Get User Saved Playlists"),
              ),
              ElevatedButton(
                onPressed: () async {
                  final result = await getIt<Hetu>().eval(
                    "metadata.user.savedAlbums()",
                  );
                  debugPrint(result.toString());
                },
                child: Text("Get User Saved Albums"),
              ),
              ElevatedButton(
                onPressed: () async {
                  final result = await getIt<Hetu>().eval(
                    "metadata.user.savedArtists()",
                  );
                  debugPrint(result.toString());
                },
                child: Text("Get User Saved Artists"),
              ),
              ElevatedButton(
                onPressed: () async {
                  final result = await getIt<Hetu>().eval(
                    "metadata.user.isSavedTracks(['11dFghVXANMlKmJXsNCbNl'])",
                  );
                  debugPrint(result.toString());
                },
                child: Text("Is track saved?"),
              ),
              ElevatedButton(
                onPressed: () async {
                  final result = await getIt<Hetu>().eval(
                    "metadata.user.isSavedPlaylist('3cEYpjA9oz9GiPac4AsH4n')",
                  );
                  debugPrint(result.toString());
                },
                child: Text("Is playlist saved?"),
              ),
              ElevatedButton(
                onPressed: () async {
                  final result = await getIt<Hetu>().eval(
                    "metadata.user.isSavedAlbums(['4aawyAB9vmqN3uQ7FjRGTy'])",
                  );
                  debugPrint(result.toString());
                },
                child: Text("Is album saved?"),
              ),
              ElevatedButton(
                onPressed: () async {
                  final result = await getIt<Hetu>().eval(
                    "metadata.user.isSavedArtists(['0TnOYISbd1XYRBk9myaseg'])",
                  );
                  debugPrint(result.toString());
                },
                child: Text("Is artist saved?"),
              ),
            ],
          ),
          Text("Tracks"),
          Wrap(
            children: [
              ElevatedButton(
                onPressed: () async {
                  final result = await getIt<Hetu>().eval(
                    "metadata.track.getTrack('11dFghVXANMlKmJXsNCbNl')",
                  );
                  debugPrint(result.toString());
                },
                child: Text("Get Track"),
              ),
              ElevatedButton(
                onPressed: () async {
                  final result = await getIt<Hetu>().eval(
                    "metadata.track.radio('11dFghVXANMlKmJXsNCbNl')",
                  );
                  debugPrint(result.toString());
                },
                child: Text("Track Radio"),
              ),
              ElevatedButton(
                onPressed: () async {
                  final result = await getIt<Hetu>().eval(
                    "metadata.track.save(['11dFghVXANMlKmJXsNCbNl'])",
                  );
                  debugPrint(result.toString());
                },
                child: Text("Save Track"),
              ),
              ElevatedButton(
                onPressed: () async {
                  final result = await getIt<Hetu>().eval(
                    "metadata.track.unsave(['11dFghVXANMlKmJXsNCbNl'])",
                  );
                  debugPrint(result.toString());
                },
                child: Text("Unsave Track"),
              ),
            ],
          ),
          Text("Playlists"),
          Wrap(
            children: [
              ElevatedButton(
                onPressed: () async {
                  final result = await getIt<Hetu>().eval(
                    "metadata.playlist.getPlaylist('3cEYpjA9oz9GiPac4AsH4n')",
                  );
                  debugPrint(result.toString());
                },
                child: Text("Get Playlist"),
              ),
              ElevatedButton(
                onPressed: () async {
                  final result = await getIt<Hetu>().eval(
                    "metadata.playlist.tracks('3cEYpjA9oz9GiPac4AsH4n')",
                  );
                  debugPrint(result.toString());
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
                  debugPrint(result.toString());
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
                  debugPrint(result.toString());
                },
                child: Text("Update Playlist"),
              ),
              ElevatedButton(
                onPressed: () async {
                  // Create playlist must be called first
                  final result = await getIt<Hetu>().eval(
                    'metadata.playlist.unsave(myPlaylist["id"])',
                  );
                  debugPrint(result.toString());
                },
                child: Text("Delete Playlist"),
              ),
              ElevatedButton(
                onPressed: () async {
                  final result = await getIt<Hetu>().eval(
                    'metadata.playlist.save("37i9dQZF1E4oJSdHZrVjxD")',
                  );
                  debugPrint(result.toString());
                },
                child: Text("Save Playlist"),
              ),
              ElevatedButton(
                onPressed: () async {
                  final result = await getIt<Hetu>().eval(
                    'metadata.playlist.unsave("37i9dQZF1E4oJSdHZrVjxD")',
                  );
                  debugPrint(result.toString());
                },
                child: Text("Unsave Playlist"),
              ),
              ElevatedButton(
                onPressed: () async {
                  // Create playlist must be called first
                  final result = await getIt<Hetu>().eval(
                    'metadata.playlist.addTracks(myPlaylist["id"], trackIds: ["5zCnGtCl5Ac5zlFHXaZmhy"])',
                  );
                  debugPrint(result.toString());
                },
                child: Text("Add Tracks"),
              ),
              ElevatedButton(
                onPressed: () async {
                  // Create playlist must be called first
                  final result = await getIt<Hetu>().eval(
                    'metadata.playlist.removeTracks(myPlaylist["id"], trackIds: ["5zCnGtCl5Ac5zlFHXaZmhy"])',
                  );
                  debugPrint(result.toString());
                },
                child: Text("Remove Tracks"),
              ),
            ],
          ),
          Text("Albums"),
          Wrap(
            children: [
              ElevatedButton(
                onPressed: () async {
                  final result = await getIt<Hetu>().eval(
                    "metadata.album.getAlbum('4aawyAB9vmqN3uQ7FjRGTy')",
                  );
                  debugPrint(result.toString());
                },
                child: Text("Get Album"),
              ),
              ElevatedButton(
                onPressed: () async {
                  final result = await getIt<Hetu>().eval(
                    "metadata.album.tracks('4aawyAB9vmqN3uQ7FjRGTy')",
                  );
                  debugPrint(result.toString());
                },
                child: Text("Get Album Tracks"),
              ),
              ElevatedButton(
                onPressed: () async {
                  final result = await getIt<Hetu>().eval(
                    "metadata.album.releases()",
                  );
                  debugPrint(result.toString());
                },
                child: Text("Releases"),
              ),
              ElevatedButton(
                onPressed: () async {
                  final result = await getIt<Hetu>().eval(
                    'metadata.album.save(["4aawyAB9vmqN3uQ7FjRGTy"])',
                  );
                  debugPrint(result.toString());
                },
                child: Text("Save Album"),
              ),
              ElevatedButton(
                onPressed: () async {
                  final result = await getIt<Hetu>().eval(
                    'metadata.album.unsave(["4aawyAB9vmqN3uQ7FjRGTy"])',
                  );
                  debugPrint(result.toString());
                },
                child: Text("Unsave Album"),
              ),
            ],
          ),
          Text("Artists"),
          Wrap(
            children: [
              ElevatedButton(
                onPressed: () async {
                  final result = await getIt<Hetu>().eval(
                    "metadata.artist.getArtist('0TnOYISbd1XYRBk9myaseg')",
                  );
                  debugPrint(result.toString());
                },
                child: Text("Get Artist"),
              ),
              ElevatedButton(
                onPressed: () async {
                  final result = await getIt<Hetu>().eval(
                    "metadata.artist.topTracks('0TnOYISbd1XYRBk9myaseg')",
                  );
                  debugPrint(result.toString());
                },
                child: Text("Artist Top Tracks"),
              ),
              ElevatedButton(
                onPressed: () async {
                  final result = await getIt<Hetu>().eval(
                    "metadata.artist.related('0TnOYISbd1XYRBk9myaseg')",
                  );
                  debugPrint(result.toString());
                },
                child: Text("Related artists"),
              ),
              ElevatedButton(
                onPressed: () async {
                  final result = await getIt<Hetu>().eval(
                    "metadata.artist.albums('0TnOYISbd1XYRBk9myaseg')",
                  );
                  debugPrint(result.toString());
                },
                child: Text("Artist albums"),
              ),
              ElevatedButton(
                onPressed: () async {
                  final result = await getIt<Hetu>().eval(
                    "metadata.artist.save(['0TnOYISbd1XYRBk9myaseg'])",
                  );
                  debugPrint(result.toString());
                },
                child: Text("Save Artist"),
              ),
              ElevatedButton(
                onPressed: () async {
                  final result = await getIt<Hetu>().eval(
                    "metadata.artist.unsave(['0TnOYISbd1XYRBk9myaseg'])",
                  );
                  debugPrint(result.toString());
                },
                child: Text("Unsave Artists"),
              ),
            ],
          ),
          Text("Search"),
          Wrap(
            children: [
              ElevatedButton(
                onPressed: () async {
                  final result = await getIt<Hetu>().eval(
                    "metadata.search.all('Twenty One Pilots')",
                  );
                  debugPrint(result.toString());
                },
                child: Text("Search Twenty One Pilots"),
              ),
              ElevatedButton(
                onPressed: () async {
                  final result = await getIt<Hetu>().eval(
                    "metadata.search.tracks('Twenty One Pilots')",
                  );
                  debugPrint(result.toString());
                },
                child: Text("Only Tracks"),
              ),
              ElevatedButton(
                onPressed: () async {
                  final result = await getIt<Hetu>().eval(
                    "metadata.search.albums('Twenty One Pilots')",
                  );
                  debugPrint(result.toString());
                },
                child: Text("Only albums"),
              ),
              ElevatedButton(
                onPressed: () async {
                  final result = await getIt<Hetu>().eval(
                    "metadata.search.artists('Twenty One Pilots')",
                  );
                  debugPrint(result.toString());
                },
                child: Text("Only artists"),
              ),
              ElevatedButton(
                onPressed: () async {
                  final result = await getIt<Hetu>().eval(
                    "metadata.search.playlists('Twenty One Pilots')",
                  );
                  debugPrint(result.toString());
                },
                child: Text("Only playlists"),
              ),
            ],
          ),
          Text("Browse"),
          Wrap(
            children: [
              ElevatedButton(
                onPressed: () async {
                  final result = await getIt<Hetu>().eval(
                    "metadata.browse.sections()",
                  );
                  debugPrint(result.toString());
                },
                child: Text("Browse sections"),
              ),
              ElevatedButton(
                onPressed: () async {
                  final result = await getIt<Hetu>().eval(
                    "metadata.browse.sectionItems('0JQ5DAnM3wGh0gz1MXnu3B')",
                  );
                  debugPrint(result.toString());
                },
                child: Text("Popular singles and albums"),
              ),
              ElevatedButton(
                onPressed: () async {
                  final result = await getIt<Hetu>().eval(
                    "metadata.browse.sectionItems('0JQ5DAuChZYPe9iDhh2mJz')",
                  );
                  debugPrint(result.toString());
                },
                child: Text("Today in Music"),
              ),
              ElevatedButton(
                onPressed: () async {
                  final result = await getIt<Hetu>().eval(
                    "metadata.browse.sectionItems('0JQ5DAnM3wGh0gz1MXnu3C')",
                  );
                  debugPrint(result.toString());
                },
                child: Text("Popular Artists"),
              ),
            ],
          ),
        ],
      ),
    );
  }
}
