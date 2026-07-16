import 'package:mangayomi/bridge_lib.dart';
  import 'dart:convert';

  class Madara extends MProvider {
    Madara({required this.source});

    MSource source;

    final Client client = Client();

    MPages mangaFromElements(List<MElement> elements) {
      List<MManga> mangaList = [];

      for (final el in elements) {
        final postTitle = el.selectFirst(
          "div.post-title a:not(:has(span.manga-title-badges))",
        );
        if (postTitle == null) continue;
        final image = extractImageUrl(el.selectFirst("img"));

        MManga manga = MManga();
        manga.name = postTitle.text ?? "";
        manga.imageUrl = image ?? "";
        manga.link = postTitle.getHref ?? "";
        if (manga.name.isEmpty || manga.link.isEmpty) continue;
        mangaList.add(manga);
      }

      return MPages(mangaList, true);
    }

    @override
    Future<MPages> getPopular(int page) async {
      final res = (await client.get(
        Uri.parse(
          "${getBaseUrl()}/${getMangaSubString()}/page/$page/?m_orderby=views",
        ),
      )).body;
      final document = parseHtml(res);
      return mangaFromElements(
        document.select("div.page-item-detail, div.manga__item"),
      );
    }

    @override
    Future<MPages> getLatestUpdates(int page) async {
      final res = (await client.get(
        Uri.parse(
          "${getBaseUrl()}/${getMangaSubString()}/page/$page/?m_orderby=latest",
        ),
      )).body;
      final document = parseHtml(res);
      return mangaFromElements(
        document.select("div.page-item-detail, div.manga__item"),
      );
    }

    @override
    Future<MPages> search(String query, int page, FilterList filterList) async {
      final filters = filterList.filters;

      String url = "${getBaseUrl()}/?s=$query&post_type=wp-manga";

      for (var filter in filters) {
        if (filter.type == "AuthorFilter") {
          if (filter.state.isNotEmpty) {
            url += "${ll(url)}author=${Uri.encodeComponent(filter.state)}";
          }
        } else if (filter.type == "ArtistFilter") {
          if (filter.state.isNotEmpty) {
            url += "${ll(url)}artist=${Uri.encodeComponent(filter.state)}";
          }
        } else if (filter.type == "YearFilter") {
          if (filter.state.isNotEmpty) {
            url += "${ll(url)}release=${Uri.encodeComponent(filter.state)}";
          }
        } else if (filter.type == "StatusFilter") {
          List<String> status = (filter.state as List)
              .where((item) => item.state == true)
              .map((item) => item.value.toString())
              .toList();
          if (status.isNotEmpty) {
            url += "${ll(url)}status[]=${status.join('&status[]=')}";
          }
        } else if (filter.type == "OrderByFilter") {
          if (filter.state != 0) {
            final order = filter.values[filter.state].value;
            url += "${ll(url)}m_orderby=$order";
          }
        } else if (filter.type == "AdultContentFilter") {
          final ctn = filter.values[filter.state].value;
          if (ctn.isNotEmpty) {
            url += "${ll(url)}adult=$ctn";
          }
        } else if (filter.type == "GenreListFilter") {
          final genres = (filter.state as List).where((e) => e.state == true).toList();
          if (genres.isNotEmpty) {
            for (var genre in genres) {
              url += "${ll(url)}genre[]=${genre.value},";
            }
          }
        }
      }

      final res = (await client.get(Uri.parse(url))).body;
      final document = parseHtml(res);
      return mangaFromElements(document.select("div.c-tabs-item__content"));
    }

    List<MChapter> getChapters(MDocument chapDoc) {
      List<MChapter> chapters = [];
      final chapterEls = chapDoc.select("li.wp-manga-chapter");
      for (MElement element in chapterEls) {
        final ch = element.selectFirst("a");
        if (ch == null) continue;
        final chUrl = ch.attr("href") ?? "";
        if (chUrl.isEmpty) continue;
        final cleanUrl = chUrl.contains("?style=paged")
            ? chUrl.replaceAll("?style=paged", "")
            : chUrl;
        var chapter = MChapter();
        chapter.url = cleanUrl;
        chapter.name = ch.text ?? "";
        if (source.dateFormat.isNotEmpty) {
          var chd = element.selectFirst("span.chapter-release-date");
          if (chd != null && (chd.text ?? "").isNotEmpty) {
            var dates = parseDates(
              [chd.text ?? ""],
              source.dateFormat,
              source.dateFormatLocale,
            );
            chapter.dateUpload = dates[0];
          } else {
            chapter.dateUpload = DateTime.now().millisecondsSinceEpoch.toString();
          }
        }
        chapters.add(chapter);
      }
      return chapters;
    }

    @override
    Future<MManga> getDetail(String url) async {
      final statusList = [
        {
          "OnGoing": 0,
          "Продолжается": 0,
          "Updating": 0,
          "Em Lançamento": 0,
          "Em lançamento": 0,
          "Em andamento": 0,
          "Em Andamento": 0,
          "En cours": 0,
          "En Cours": 0,
          "En cours de publication": 0,
          "Ativo": 0,
          "Lançando": 0,
          "Đang Tiến Hành": 0,
          "Devam Ediyor": 0,
          "In Corso": 0,
          "In Arrivo": 0,
          "مستمرة": 0,
          "مستمر": 0,
          "En Curso": 0,
          "En curso": 0,
          "Curso": 0,
          "Emision": 0,
          "En marcha": 0,
          "Publicandose": 0,
          "Publicándose": 0,
          "En emision": 0,
          "连载中": 0,
          "Completed": 1,
          "Completo": 1,
          "Completado": 1,
          "Concluído": 1,
          "Concluido": 1,
          "Finalizado": 1,
          "Achevé": 1,
          "Terminé": 1,
          "Complété": 1,
          "Hoàn Thành": 1,
          "Tamamlandı": 1,
          "Завершено": 1,
          "مكتملة": 1,
          "مكتمل": 1,
          "已完结": 1,
          "On Hold": 2,
          "Pausado": 2,
          "En espera": 2,
          "Durduruldu": 2,
          "Beklemede": 2,
          "متوقف": 2,
          "En Pause": 2,
          "Заморожено": 2,
          "En attente": 2,
          "Canceled": 3,
          "Cancelado": 3,
          "İptal Edildi": 3,
          "Đã hủy": 3,
          "ملغي": 3,
          "Abandonné": 3,
          "Заброшено": 3,
          "Annulé": 3,
        },
      ];
      MManga manga = MManga();
      final res = (await client.get(Uri.parse(url))).body;
      final document = parseHtml(res);
      manga.author = document.selectFirst("div.author-content > a")?.text ?? "";

      final descriptionElements = document.select(
        "div.description-summary div.summary__content, div.summary_content div.post-content_item > h5 + div, div.summary_content div.manga-excerpt, .manga-summary, div.c-page__content div.modal-contenido",
      );
      if (descriptionElements.isNotEmpty) {
        final allText = descriptionElements.map((e) => e.text ?? "").where((t) => t.trim().isNotEmpty).join("\n\n");
        manga.description = allText.trim();
      }

      final imageElement = document.selectFirst("div.summary_image img");
      manga.imageUrl = extractImageUrl(imageElement) ?? "";

      final mangaId =
          document
              .selectFirst("div[id^=manga-chapters-holder]")
              ?.attr("data-id") ?? "";

      final status =
          document
              .selectFirst(
                ".summary-content > .tags-content, div.summary-content, div.summary-heading:contains(Status) + div",
              )
              ?.text ?? "";
      manga.status = parseStatus(status, statusList);

      final genreEls = document.select("div.genres-content a");
      manga.genre = genreEls.map((e) => e.text ?? "").where((t) => t.isNotEmpty).toList();

      final baseUrl = "${getBaseUrl()}/";
      final reqHeaders = {"Referer": baseUrl, "X-Requested-With": "XMLHttpRequest"};

      String chapRes = "";
      final oldXhr = await client.post(
        Uri.parse("${baseUrl}wp-admin/admin-ajax.php"),
        headers: reqHeaders,
        body: {"action": "manga_get_chapters", "manga": mangaId},
      );
      if (oldXhr.statusCode == 400 || (oldXhr.body ?? "").isEmpty) {
        chapRes = (await client.post(
          Uri.parse("${url}ajax/chapters"),
          headers: reqHeaders,
        )).body ?? "";
      } else {
        chapRes = oldXhr.body ?? "";
      }

      MDocument chapDoc = parseHtml(chapRes);
      manga.chapters = getChapters(chapDoc);
      if (manga.chapters.isEmpty) {
        chapRes = (await client.post(
          Uri.parse("${url}ajax/chapters"),
          headers: reqHeaders,
        )).body ?? "";
        chapDoc = parseHtml(chapRes);
        manga.chapters = getChapters(chapDoc);
      }

      return manga;
    }

    @override
    Future<List<String>> getPageList(String url) async {
      final res = (await client.get(Uri.parse(url)));
      final document = parseHtml(res.body);

      final elements = document.select(
        "div.page-break img, li.blocks-gallery-item img, .reading-content .text-left:not(:has(.blocks-gallery-item)) img",
      );
      List<String> images = elements
          .map((e) => (extractImageUrl(e) ?? "").trim())
          .where((s) => s.isNotEmpty)
          .toList();

      if (images.length == 1) {
        images = buildPageUrls(images, document);
      }

      return images;
    }

    List<String> buildPageUrls(List<String> imgs, MDocument document) {
      final pagerElement = document.selectFirst("#single-pager");
      if (pagerElement == null || imgs.isEmpty) return imgs;

      List<String> pageUrls = [];
      final pagesNumber = pagerElement.select("option").length;
      final imgUrl = imgs.first;
      for (var i = 0; i < pagesNumber; i++) {
        final val = i + 1;
        if (i.toString().length == 1) {
          pageUrls.add(imgUrl.replaceAll("01", '0$val'));
        } else {
          pageUrls.add(imgUrl.replaceAll("01", val.toString()));
        }
      }
      return pageUrls.isNotEmpty ? pageUrls : imgs;
    }

    @override
    List<dynamic> getFilterList() {
      return [
        TextFilter("AuthorFilter", "Author"),
        TextFilter("ArtistFilter", "Artist"),
        TextFilter("YearFilter", "Year of Released"),
        GroupFilter("StatusFilter", "Status", [
          CheckBoxFilter("Completed", "end"),
          CheckBoxFilter("Ongoing", "on-going"),
          CheckBoxFilter("Canceled", "canceled"),
          CheckBoxFilter("On Hold", "on-hold"),
        ]),
        SelectFilter("OrderByFilter", "Order By", 0, [
          SelectFilterOption("Relevance", ""),
          SelectFilterOption("Latest", "latest"),
          SelectFilterOption("A-Z", "alphabet"),
          SelectFilterOption("Rating", "rating"),
          SelectFilterOption("Trending", "trending"),
          SelectFilterOption("Most Views", "views"),
          SelectFilterOption("New", "new-manga"),
        ]),
        SelectFilter("AdultContentFilter", "Adult Content", 0, [
          SelectFilterOption("All", ""),
          SelectFilterOption("None", "0"),
          SelectFilterOption("Only", "1"),
        ]),
      ];
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

    String ll(String url) {
      return url.contains("?") ? "&" : "?";
    }

    String extractImageUrl(MElement? imageElement) {
      if (imageElement == null) return "";
      return imageElement.attr("data-src") ??
          imageElement.attr("data-lazy-src") ??
          imageElement.getSrc ??
          "";
    }

    String getMangaSubString() {
      const sourceTypeMap = {
        "Olaoe": "works",
        "Mangax Core": "works",
        "Azora": "series",
        "Manga Crab": "series",
        "KlikManga": "series",
        "Hwago": "komik",
      };
      return sourceTypeMap[source.name] ?? "manga";
    }
  }

  Madara main(MSource source) {
    return Madara(source: source);
  }
  