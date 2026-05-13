// ─────────────────────────────────────────────────────────────────────────────
// FrenchStream DEMO — Extension de test sans réseau
// Retourne des données fictives codées en dur pour tester le Watch Detail UI.
// Fonctionne sur toutes les plateformes (web inclus) car aucune requête réseau.
// ─────────────────────────────────────────────────────────────────────────────

const watchtowerSources = [{
    "name": "FrenchStream Démo",
    "langs": ["fr"],
    "ids": { "fr": 999000001 },
    "baseUrl": "https://demo.watchtower.local",
    "apiUrl": "https://demo.watchtower.local",
    "iconUrl": "https://raw.githubusercontent.com/ferelking242/Watchtower-extensions/main/extensions/watch/icon/fr.frenchstream.png",
    "typeSource": "single",
    "itemType": 1,
    "version": "1.0.0",
    "pkgPath": "watch/fr/frenchstream_demo.js",
    "editableBaseUrl": false,
    "customUserAgent": ""
}];

// ─── Catalogue de films fictifs ───────────────────────────────────────────────
const DEMO_MOVIES = [
    {
        name: "Brick Mansions",
        link: "https://demo.watchtower.local/brick-mansions",
        imageUrl: "https://image.tmdb.org/t/p/w500/3MRe2kVH0sLYBnmOIy8yS0KRNdI.jpg",
        description: "Un détective infiltre un quartier fortifié de Détroit pour retrouver une bombe nucléaire volée. Action pure avec Paul Walker.",
        genres: ["Action", "Thriller"],
        author: "2014",
        duration: "1h30",
        videoUrl: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4"
    },
    {
        name: "Intouchables",
        link: "https://demo.watchtower.local/intouchables",
        imageUrl: "https://image.tmdb.org/t/p/w500/6v5X4uKdR3b0cEGjAlJMJbAQkiY.jpg",
        description: "Un riche aristocrate paralysé engage un jeune banlieusard comme auxiliaire de vie. Une amitié improbable naît entre les deux hommes.",
        genres: ["Comédie dramatique", "Drame"],
        author: "2011",
        duration: "1h52",
        videoUrl: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4"
    },
    {
        name: "Lucy",
        link: "https://demo.watchtower.local/lucy",
        imageUrl: "https://image.tmdb.org/t/p/w500/nV0m4NKLE4PGAZ3Fz2jG5FJGZ2B.jpg",
        description: "Une femme développe des capacités cérébrales surhumaines après avoir été forcée à transporter une drogue de synthèse.",
        genres: ["Sci-Fi", "Action"],
        author: "2014",
        duration: "1h29",
        videoUrl: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4"
    },
    {
        name: "Taken",
        link: "https://demo.watchtower.local/taken",
        imageUrl: "https://image.tmdb.org/t/p/w500/51jYuXXJShkz0D7SkApn9gFMixP.jpg",
        description: "Un ex-agent de la CIA part à la rescousse de sa fille kidnappée par des trafiquants d'êtres humains à Paris.",
        genres: ["Action", "Thriller"],
        author: "2008",
        duration: "1h30",
        videoUrl: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4"
    },
    {
        name: "Le Fabuleux Destin d'Amélie Poulain",
        link: "https://demo.watchtower.local/amelie",
        imageUrl: "https://image.tmdb.org/t/p/w500/3HHCWqz04j5oNvmD7HEFnXPG7pq.jpg",
        description: "Une serveuse parisienne décide de changer la vie des gens qui l'entourent. Un film poétique signé Jean-Pierre Jeunet.",
        genres: ["Comédie", "Romance"],
        author: "2001",
        duration: "2h02",
        videoUrl: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerFun.mp4"
    },
    {
        name: "Les Misérables",
        link: "https://demo.watchtower.local/les-miserables",
        imageUrl: "https://image.tmdb.org/t/p/w500/aGHPjFDLp4HFSoMmXNJpMjdIxXE.jpg",
        description: "Une journée à Montfermeil suffit pour comprendre comment les tensions sociales peuvent exploser entre policiers, banlieusards et jeunes.",
        genres: ["Drame", "Policier"],
        author: "2019",
        duration: "1h44",
        videoUrl: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerJoyrides.mp4"
    }
];

// ─── Série de test ────────────────────────────────────────────────────────────
const DEMO_SERIES = {
    name: "Lupin (Série)",
    link: "https://demo.watchtower.local/lupin-series",
    imageUrl: "https://image.tmdb.org/t/p/w500/sgQJKEbCUL5kq9NqzAoAOVGkAnC.jpg",
    description: "Assane Diop est passionné par les aventures d'Arsène Lupin depuis l'enfance. Il va mettre à profit ses talents de gentleman cambrioleur pour venger l'honneur de son père.",
    genres: ["Policier", "Thriller", "Aventure"],
    author: "2021",
    episodes: [
        { name: "Épisode 1 – L'Aiguille Creuse", duration: "51min" },
        { name: "Épisode 2 – Comment cambrioler le Louvre", duration: "48min" },
        { name: "Épisode 3 – Qui est Assane Diop ?", duration: "50min" },
        { name: "Épisode 4 – Un homme sans passé", duration: "52min" },
        { name: "Épisode 5 – La vérité sur Pellegrini", duration: "55min" }
    ]
};

class DefaultExtension extends MProvider {
    constructor() { super(); this.client = new Client(); }

    // ─── Popular ─────────────────────────────────────────────────────────────

    async getPopular(page) {
        if (page > 1) return { list: [], hasNextPage: false };
        const list = [...DEMO_MOVIES.map(m => ({
            name: m.name,
            link: m.link,
            imageUrl: m.imageUrl
        })), {
            name: DEMO_SERIES.name,
            link: DEMO_SERIES.link,
            imageUrl: DEMO_SERIES.imageUrl
        }];
        return { list, hasNextPage: false };
    }

    // ─── Latest ──────────────────────────────────────────────────────────────

    async getLatestUpdates(page) {
        return this.getPopular(page);
    }

    // ─── Search ──────────────────────────────────────────────────────────────

    async search(query, page, filterList) {
        if (page > 1) return { list: [], hasNextPage: false };
        const q = (query || "").toLowerCase();
        const all = [...DEMO_MOVIES, DEMO_SERIES];
        const list = all
            .filter(m => !q || m.name.toLowerCase().includes(q))
            .map(m => ({ name: m.name, link: m.link, imageUrl: m.imageUrl }));
        return { list, hasNextPage: false };
    }

    // ─── Detail ──────────────────────────────────────────────────────────────

    async getDetail(url) {
        // Series
        if (url === DEMO_SERIES.link) {
            const chapters = DEMO_SERIES.episodes.map((ep, i) => ({
                name: ep.name,
                url: `${DEMO_SERIES.link}/ep${i + 1}`,
                dateUpload: "",
                duration: ep.duration
            }));
            return {
                name: DEMO_SERIES.name,
                description: DEMO_SERIES.description,
                imageUrl: DEMO_SERIES.imageUrl,
                genres: DEMO_SERIES.genres,
                status: 1,
                author: DEMO_SERIES.author,
                chapters
            };
        }

        // Movies
        const movie = DEMO_MOVIES.find(m => m.link === url);
        if (movie) {
            return {
                name: movie.name,
                description: movie.description,
                imageUrl: movie.imageUrl,
                genres: movie.genres,
                status: 4, // completed
                author: movie.author,
                chapters: [{
                    name: movie.name,
                    url: `${movie.link}/watch`,
                    dateUpload: "",
                    duration: movie.duration
                }]
            };
        }

        return {
            name: "Démo",
            description: "Contenu de démonstration",
            imageUrl: "",
            genres: [],
            status: 0,
            chapters: [{ name: "Regarder", url: `${url}/watch`, dateUpload: "" }]
        };
    }

    // ─── Video List ───────────────────────────────────────────────────────────
    // Returns Google sample MP4s (CDN, no CORS issues) for preview testing.

    async getVideoList(url) {
        // Find which movie/episode this URL belongs to
        const movie = DEMO_MOVIES.find(m => url.startsWith(m.link));
        const videoUrl = movie
            ? movie.videoUrl
            : "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4";

        return [
            { url: videoUrl, quality: "720p", originalUrl: videoUrl },
            { url: videoUrl, quality: "480p", originalUrl: videoUrl }
        ];
    }
}
