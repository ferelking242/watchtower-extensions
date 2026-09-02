const watchtowerSources = [{"name":"KissKH Drama","lang":"multi","langs":["en","id","th","vi"],"ids":{"en":1900000501},"baseUrl":"https://kisskh.co","iconUrl":"https://kisskh.co/favicon.ico","typeSource":"single","itemType":1,"version": "1.1.0","pkgPath":"anime/src/multi/kisskh_drama.js","notes":"KissKH — dramas asiatiques (KDrama, CDrama, Thai)"}];
const BASE_URL = "https://kisskh.co";
class DefaultExtension extends MProvider {
    constructor() { super(); }
    getHeaders() { return {"User-Agent":"Mozilla/5.0","Referer":`${BASE_URL}/`}; }
    parseList(h) { const l=[];const re=/<a[^>]+href="([^"]+)"[\s\S]*?<img[^>]+(?:src|data-src)="([^"]+)"[\s\S]*?<\/a>[\s\S]*?<h2[^>]*>([^<]+)<\/h2>/g;let m;const s={};while((m=re.exec(h))!==null){if(!s[m[1]]){s[m[1]]=1;l.push({link:m[1],imageUrl:m[2],name:m[3].trim()});}}if(l.length===0){const r2=/href="([^"]+)"[\s\S]*?src="([^"]+)"[\s\S]*?alt="([^"]*)"/g;while((m=r2.exec(h))!==null){if(!s[m[1]]&&m[3].trim()&&!m[3].toLowerCase().includes("logo")){s[m[1]]=1;l.push({link:m[1],imageUrl:m[2],name:m[3].trim()});}}}return l; }
    async getPopular(p) { const r=await new Client().get(`${BASE_URL}/DramaList/List?page=${p}&type=0&sub=0&country=0&status=0&order=2`,this.getHeaders());return{list:this.parseList(r.body),hasNextPage:r.body.includes('page=')}; }
    async getLatestUpdates(p) { const r=await new Client().get(`${BASE_URL}/DramaList/List?page=${p}&type=0&sub=0&country=0&status=0&order=1`,this.getHeaders());return{list:this.parseList(r.body),hasNextPage:r.body.includes('page=')}; }
    async search(q,p) { if(!q)return this.getPopular(p);const r=await new Client().get(`${BASE_URL}/DramaList/Search?q=${encodeURIComponent(q)}&page=${p}`,this.getHeaders());return{list:this.parseList(r.body),hasNextPage:false}; }
    async getDetail(url) { const u=url.startsWith("http")?url:`${BASE_URL}${url}`;const r=await new Client().get(u,this.getHeaders());const h=r.body;const nm=h.match(/<h1[^>]*>([^<]+)<\/h1>/);const n=nm?nm[1].trim():"";const dm=h.match(/<div[^>]*class="[^"]*description[^"]*"[^>]*>([\s\S]*?)<\/div>/);const d=dm?dm[1].replace(/<[^>]+>/g,"").trim():"";const im=h.match(/<img[^>]+src="([^"]+)"[^>]*(?:poster|cover)/i);const img=im?im[1]:"";const ep=[];const er=/href="([^"]*episode[^"]*)"[^>]*>([^<]+)<\/a>/g;let em;while((em=er.exec(h))!==null){ep.push({name:em[2].trim(),url:em[1]});}return{name:n,description:d,imageUrl:img,genres:["Drama","Asian"],status:0,chapters:ep}; }
    async getVideoList(url) { const u=url.startsWith("http")?url:`${BASE_URL}${url}`;const r=await new Client().get(u,this.getHeaders());const h=r.body;const v=[];const re=/(?:data-src|src)="(https?:\/\/[^"]+(?:embed|player|stream|m3u8)[^"]*)"/g;let m;while((m=re.exec(h))!==null){v.push({url:m[1],quality:"Auto",originalUrl:m[1]});}return v; }
    getFilterList() { return []; }

    getSourcePreferences() {
        return [
            {
                key: "base_url",
                editTextPreference: {
                    title: "URL du site",
                    summary: "Adresse du site. Changez si le domaine est migré.",
                    value: BASE_URL,
                    dialogTitle: "URL du site",
                    dialogMessage: "URL actuelle : " + BASE_URL
                }
            },
            {
                key: "default_quality",
                listPreference: {
                    title: "Qualité vidéo par défaut",
                    summary: "La qualité sélectionnée est prioritaire. Si indisponible, la plus proche est choisie automatiquement.",
                    valueIndex: 0,
                    entries: ["Auto (recommandé)", "1080p — Full HD", "720p — HD", "480p — SD", "360p — Faible"],
                    entryValues: ["AUTO", "1080", "720", "480", "360"]
                }
            },
            {
                key: "quality_fallback",
                listPreference: {
                    title: "Si la qualité n'est pas disponible",
                    summary: "Choisir la qualité la plus proche si celle demandée n'existe pas",
                    valueIndex: 1,
                    entries: ["Prendre la qualité supérieure", "Prendre la qualité inférieure (recommandé)"],
                    entryValues: ["higher", "lower"]
                }
            },
            {
                key: "sub_or_dub",
                listPreference: {
                    title: "Préférence audio",
                    summary: "Choisir entre version sous-titrée (Sub) ou doublée (Dub) quand les deux sont disponibles",
                    valueIndex: 0,
                    entries: ["Sous-titré (Sub) — recommandé", "Doublé (Dub)", "Les deux (Sub puis Dub)"],
                    entryValues: ["sub", "dub", "both"]
                }
            },
            {
                key: "server_preference",
                listPreference: {
                    title: "Serveur prioritaire",
                    summary: "Le serveur choisi est chargé en premier. Les autres serveurs sont utilisés en fallback si celui-ci échoue.",
                    valueIndex: 0,
                    entries: ["Auto (tous les serveurs)", "VidStreaming", "MegaCloud", "Meownstream", "StreamTape"],
                    entryValues: ["auto", "vidstreaming", "megacloud", "meownstream", "streamtape"]
                }
            }
        ];
    }
}
