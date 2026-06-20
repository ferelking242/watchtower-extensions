import 'package:mangayomi/bridge_lib.dart';
  import 'dart:convert';

  class MMRCMS extends MProvider {
    MMRCMS({required this.source});

    MSource source;
    static final Set<String> latestTitles = <String>{};
    final Client client = Client();

    MManga mangaFromElement(MElement element) {
      final anchor = element.selectFirst(".media-heading a, .manga-heading a");
      final link = anchor?.getHref ?? "";

      return MManga()
        ..name = anchor?.text ?? ""
        ..imageUrl = guessCover(link, url: element.selectFirst("img")?.getSrc)
        ..link = link;
    }

    @override
    Future<MPages> getPopular(int page) async {
      final res = (await client.get(
        Uri.parse("${getBaseUrl()}/filterList?page=$page&sortBy=views&asc=false"),
      )).body;
      final document = parseHtml(res);
      final mangaList = <MManga>[];
      for (final el in document.select("div.chapter-container, div.media")) {
        final manga = mangaFromElement(el);
        if (manga.link == null || manga.link!.isEmpty) continue;
        mangaList.add(manga);
      }
      return MPages(mangaList, true);
    }

    @override
    Future<MPages> getLatestUpdates(int page) async {
      if (page == 1) latestTitles.clear();

      final res = (await client.get(
        Uri.parse("${getBaseUrl()}/latest-release?page=$page"),
      )).body;

      final document = parseHtml(res);
      final mangaList = <MManga>[];

      for (var el in document.select("div.mangalist div.manga-item")) {
        final manga = mangaFromElement(el);
        final link = manga.link ?? "";

        if (link.isNotEmpty && latestTitles.add(link)) {
          mangaList.add(manga);
        }
      }

      return MPages(mangaList, true);
    }

    @override
    Future<MPages> search(String query, int page, FilterList filterList) async {
      String url = getBaseUrl();
      List<MManga> mangaList = [];

      if (query.isNotEmpty) {
        url = "$url/search?query=${Uri.encodeComponent(query)}";
        final res = (await client.get(Uri.parse(url))).body;
        try {
          final jsonData = json.decode(res);
          final jsonList = jsonData["suggestions"] as List? ?? [];

          for (var da in jsonList) {
            final String value = da["value"]?.toString() ?? "";
            final String data = da["data"]?.toString() ?? "";
            if (data.isEmpty) continue;
            final mangaSubString = getMangaSubString();
            final path = mangaSubString.isEmpty ? data : '$mangaSubString/$data';

            mangaList.add(
              MManga(
                name: value,
                link: '${getBaseUrl()}/$path',
                imageUrl: guessCover('/$path'),
              ),
            );
          }
        } catch (e) {}
      }

      return MPages(mangaList, false);
    }

    @override
    Future<MManga> getDetail(String url) async {
      final res = (await client.get(Uri.parse(url))).body;
      final document = parseHtml(res);
      final manga = MManga();

      manga.name = document
          .selectFirst(".panel-heading, .listmanga-header, .widget-title")
          ?.text ?? "";

      manga.imageUrl = guessCover(
        url,
        url: document.selectFirst(".row img.img-responsive")?.getSrc,
      );

      manga.description = extractDescription(document);

      for (var element in document.select('.panel-body h3, .row .dl-horizontal dt')) {
        final label = _getOwnText(element).toLowerCase().replaceAll(RegExp(r' :$'), '');
        final valueElement = element.selectFirst('div.text') ?? element.nextElementSibling;
        if (valueElement == null) continue;
        _assignMangaInfo(manga, label, valueElement);
      }

      List<MChapter> chaptersList = [];
      for (var ch in document.select("ul.chapters > li:not(.btn)")) {
        final chapter = chapterFromElement(ch, manga.name ?? "");
        if ((chapter.url ?? "").isNotEmpty) {
          chaptersList.add(chapter);
        }
      }
      manga.chapters = chaptersList;

      return manga;
    }

    MChapter chapterFromElement(MElement element, String mangaTitle) {
      final chapter = MChapter();

      final titleWrapper = element.selectFirst(".chapter-title-rtl");
      final anchor = titleWrapper?.selectFirst("a");

      if (anchor != null) {
        chapter.url = anchor.getHref ?? "";
        chapter.name = cleanChapterName(titleWrapper?.text ?? "", mangaTitle);

        final dateElement = element.selectFirst(".date-chapter-title-rtl");

        if (dateElement != null && (dateElement.text ?? "").isNotEmpty) {
          chapter.dateUpload = parseDates(
            [dateElement.text ?? ""],
            source.dateFormat,
            source.dateFormatLocale,
          )[0];
        } else {
          chapter.dateUpload = DateTime.now().millisecondsSinceEpoch.toString();
        }
      }

      return chapter;
    }

    @override
    Future<List<String>> getPageList(String url) async {
      final response = await client.get(Uri.parse(url));
      final document = parseHtml(response.body);

      List<String> pagesUrl = [];
      for (var img in document.select('#all img.img-responsive')) {
        final src = img.attr('data-src') ?? img.attr('src') ?? "";
        if (src.isEmpty) continue;
        if (src.startsWith('//')) {
          pagesUrl.add('https:$src');
        } else if (src.startsWith('http')) {
          pagesUrl.add(src);
        } else {
          pagesUrl.add('${getBaseUrl()}/$src');
        }
      }

      return pagesUrl;
    }

    @override
    List<dynamic> getFilterList() {
      return [];
    }

    @override
    List<dynamic> getSourcePreferences() {
      return [
        EditTextPreference(
          key: "domain_url",
          title: getTitleByLang(source.lang),
          summary: "",
          value: source.baseUrl,
          dialogTitle: "URL",
          dialogMessage: "",
        ),
      ];
    }

    String getBaseUrl() {
      final baseUrl = getPreferenceValue(source.id, "domain_url")?.trim();

      if (baseUrl == null || baseUrl.isEmpty) {
        return source.baseUrl ?? "";
      }

      return baseUrl.endsWith("/")
          ? baseUrl.substring(0, baseUrl.length - 1)
          : baseUrl;
    }

    String getTitleByLang(String? lang) {
      const titles = {
        'fr': 'Modifier l URL',
        'en': 'Edit URL',
        'es': 'Editar URL',
        'de': 'URL bearbeiten',
        'ru': 'Редактировать URL',
        'pt': 'Editar URL',
        'it': 'Modifica URL',
      };
      return titles[lang?.toLowerCase()] ?? titles['en']!;
    }

    String getMangaSubString() {
      const sourceTypeMap = {'Scan VF': "", "Read Comics Online": "comic"};
      return sourceTypeMap[source.name] ?? "manga";
    }

    String ll(String url) {
      return url.contains("?") ? "&" : "?";
    }

    String guessCover(String mangaUrl, {String? url}) {
      final base = getBaseUrl();
      if (url == null || url.isEmpty || url.endsWith("no-image.png")) {
        final slug = substringAfterLast(mangaUrl, '/');
        return "$base/uploads/manga/$slug/cover/cover_250x350.jpg";
      } else if (url.startsWith(base)) {
        return url;
      } else if (url.startsWith('http')) {
        return url;
      } else {
        return "$base$url";
      }
    }

    String extractDescription(MDocument document) {
      final container = document.selectFirst(".row .well");
      if (container == null) return "";

      String text = container.text ?? "";

      for (var h5 in container.select("h5")) {
        final t = h5.text ?? "";
        if (t.isNotEmpty) text = text.replaceAll(t, "");
      }

      return text.replaceAll(RegExp(r'\n{3,}'), '\n\n').trim();
    }

    String _getOwnText(MElement element) {
      final text = element.text ?? "";
      final childrenText = element.children.map((e) => e.text ?? "").join();
      return text.replaceFirst(childrenText, '').trim();
    }

    void _assignMangaInfo(MManga manga, String label, MElement valueElement) {
      if (_detailAuthor.contains(label)) {
        manga.author = valueElement.text ?? "";
      } else if (_detailArtist.contains(label)) {
        manga.artist = valueElement.text ?? "";
      } else if (_detailGenre.contains(label)) {
        manga.genre = valueElement.select("a").map((e) => e.text ?? "").where((t) => t.isNotEmpty).toList();
      } else if (_detailStatus.contains(label)) {
        manga.status = parseStatus(valueElement.text ?? "", statusList);
      }
    }

    String cleanChapterName(String name, String mangaTitle) {
      try {
        final chapterString = "Chapter";
        final initialName = name.replaceFirst(mangaTitle, chapterString);
        final parts = initialName.split(':');
        if (parts.isEmpty) return name;
        final firstPart = parts[0].trim();
        if (parts.length == 1) return firstPart;
        final secondPart = parts.sublist(1).join(':').trim();
        return firstPart == secondPart ? firstPart : "$firstPart: $secondPart";
      } catch (e) {
        return name;
      }
    }

    static const _detailAuthor = {
      'author(s)', 'autor(es)', 'auteur(s)', '著作', 'yazar(lar)',
      'mangaka(lar)', 'pengarang/penulis', 'pengarang', 'penulis',
      'autor', 'المؤلف', 'перевод', 'autor/autorzy',
    };

    static const _detailArtist = {
      'artist(s)', 'artiste(s)', 'sanatçi(lar)', 'artista(s)',
      'artist(s)/ilustrator', 'الرسام', 'seniman', 'rysownik/rysownicy', 'artista',
    };

    static const _detailGenre = {
      'categories', 'categorías', 'catégories', 'ジャンル', 'kategoriler',
      'categorias', 'kategorie', 'التصنيفات', 'жанр', 'kategori', 'tagi', 'género',
    };

    static const _detailStatus = {
      'status', 'statut', 'estado', '状態', 'durum', 'الحالة', 'статус',
    };

    static const statusList = [
      {
        'ongoing': 0,
        'مستمرة': 0,
        'en cours': 0,
        'em lançamento': 0,
        'ativo': 0,
        'em andamento': 0,
        'activo': 0,
        'complete': 1,
        'مكتملة': 1,
        'complet': 1,
        'completo': 1,
        'concluído': 1,
        'finalizado': 1,
        'dropped': 3,
      },
    ];
  }

  MMRCMS main(MSource source) {
    return MMRCMS(source: source);
  }
  