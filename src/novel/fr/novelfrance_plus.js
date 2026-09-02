const watchtowerSources = [{"name":"Novel France+","lang":"fr","baseUrl":"https://novelfrance.org","iconUrl":"https://novelfrance.org/favicon.ico","typeSource":"single","itemType":2,"version": "1.1.0","pkgPath":"novel/src/fr/novelfrance_plus.js","notes":"Novel France+ — light novel traduction FR"}];
const BASE_URL = "https://novelfrance.org";
class DefaultExtension extends MProvider {
    constructor() { super(); }
    getHeaders() { return {"User-Agent":"Mozilla/5.0","Referer":`${BASE_URL}/`}; }
    novelListParse(h) { const l=[];const re=/<a[^>]+href="([^"]+)"[\s\S]*?<img[^>]+(?:src|data-src)="([^"]+)"[\s\S]*?<\/a>[\s\S]*?<h2[^>]*>([^<]+)<\/h2>/g;let m;const s={};while((m=re.exec(h))!==null){if(!s[m[1]]){s[m[1]]=1;l.push({link:m[1],imageUrl:m[2],name:m[3].trim()});}}if(l.length===0){const r2=/href="([^"]+)"[\s\S]*?src="([^"]+)"[\s\S]*?alt="([^"]*)"/g;while((m=r2.exec(h))!==null){if(!s[m[1]]&&m[3].trim()&&!m[3].toLowerCase().includes("logo")){s[m[1]]=1;l.push({link:m[1],imageUrl:m[2],name:m[3].trim()});}}}return l; }
    async getPopular(p) { const r=await new Client().get(`${BASE_URL}/?page=${p}`,this.getHeaders());return{list:this.novelListParse(r.body),hasNextPage:r.body.includes('page=')}; }
    async getLatestUpdates(p) { return this.getPopular(p); }
    async search(q,p) { if(!q)return this.getPopular(p);const r=await new Client().get(`${BASE_URL}/?s=${encodeURIComponent(q)}`,this.getHeaders());return{list:this.novelListParse(r.body),hasNextPage:false}; }
    async getDetail(url) { const u=url.startsWith("http")?url:`${BASE_URL}${url}`;const r=await new Client().get(u,this.getHeaders());const h=r.body;const nm=h.match(/<h1[^>]*>([^<]+)<\/h1>/);const n=nm?nm[1].trim():"";const dm=h.match(/<div[^>]*class="[^"]*description[^"]*"[^>]*>([\s\S]*?)<\/div>/);const d=dm?dm[1].replace(/<[^>]+>/g,"").trim():"";const im=h.match(/<img[^>]+src="([^"]+)"[^>]*(?:cover|manga)/i);const img=im?im[1]:"";const ch=[];const cr=/href="([^"]+)"[\s\S]*?(\d+)[\s\S]*?<\/a>/g;let cm;while((cm=cr.exec(h))!==null){if(cm[1].includes("chapter"))ch.push({name:`Chapitre ${cm[2]}`,url:cm[1]});}return{name:n,description:d,imageUrl:img,genre:[],status:0,chapters:ch}; }
    async getHtmlContent(name,url) { const u=url.startsWith("http")?url:`${BASE_URL}${url}`;const r=await new Client().get(u,this.getHeaders());const doc=new Document(r.body);return doc.selectFirst("#content, .entry-content")?.outerHtml||""; }
    async cleanHtmlContent(html) { return html; }
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
                key: "chapter_order",
                listPreference: {
                    title: "Ordre des chapitres",
                    summary: "Afficher les chapitres du plus récent au plus ancien, ou l'inverse",
                    valueIndex: 0,
                    entries: ["Plus récents d'abord (recommandé)", "Plus anciens d'abord"],
                    entryValues: ["newest", "oldest"]
                }
            },
            {
                key: "image_quality",
                listPreference: {
                    title: "Qualité des images",
                    summary: "Qualité d'affichage des pages de manga. La haute qualité consomme plus de données.",
                    valueIndex: 0,
                    entries: ["Haute qualité (recommandé)", "Qualité moyenne", "Faible qualité (économie de données)"],
                    entryValues: ["high", "medium", "low"]
                }
            }
        ];
    }
}
