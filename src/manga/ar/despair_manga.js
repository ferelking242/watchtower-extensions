const watchtowerSources = [{"name":"Despair Manga","lang":"ar","baseUrl":"https://despairmanga.com","iconUrl":"https://despairmanga.com/favicon.ico","typeSource":"single","itemType":0,"version":"1.0.0","pkgPath":"manga/src/ar/despair_manga.js"}];
const BASE_URL = "https://despairmanga.com";
class DefaultExtension extends MProvider {
    constructor() { super(); }
    getHeaders() { return {"User-Agent":"Mozilla/5.0","Referer":`${BASE_URL}/`}; }
    mangaListParse(h) { const l=[];const re=/href="([^"]+)"[\s\S]*?src="([^"]+)"[\s\S]*?alt="([^"]*?)"/g;let m;const s={};while((m=re.exec(h))!==null){if(!s[m[1]]&&m[3].trim()&&!m[3].toLowerCase().includes("logo")){s[m[1]]=1;l.push({link:m[1],imageUrl:m[2],name:m[3].trim()});}}return l; }
    async getPopular(p) { const r=await new Client().get(`${BASE_URL}/?page=${p}`,this.getHeaders());return{list:this.mangaListParse(r.body),hasNextPage:r.body.includes('page=')}; }
    async getLatestUpdates(p) { return this.getPopular(p); }
    async search(q,p) { if(!q)return this.getPopular(p);const r=await new Client().get(`${BASE_URL}/?s=${encodeURIComponent(q)}`,this.getHeaders());return{list:this.mangaListParse(r.body),hasNextPage:false}; }
    async getDetail(url) { const u=url.startsWith("http")?url:`${BASE_URL}${url}`;const r=await new Client().get(u,this.getHeaders());const h=r.body;const nm=h.match(/<h1[^>]*>([^<]+)<\/h1>/);const n=nm?nm[1].trim():"";const dm=h.match(/<div[^>]*class="[^"]*description[^"]*"[^>]*>([\s\S]*?)<\/div>/);const d=dm?dm[1].replace(/<[^>]+>/g,"").trim():"";const im=h.match(/<img[^>]+src="([^"]+)"[^>]*(?:cover|manga)/i);const img=im?im[1]:"";const ch=[];const cr=/href="([^"]+)"[\s\S]*?(\d+)[\s\S]*?<\/a>/g;let cm;while((cm=cr.exec(h))!==null){if(cm[1].includes("chapter"))ch.push({name:`الفصل ${cm[2]}`,url:cm[1]});}return{name:n,description:d,imageUrl:img,genre:[],status:0,chapters:ch}; }
    async getPageList(url) { const u=url.startsWith("http")?url:`${BASE_URL}${url}`;const r=await new Client().get(u,this.getHeaders());const p=[];const re=/src="([^"]+\.(?:jpg|jpeg|png|webp)[^"]*)"/gi;let m;const h=r.body;while((m=re.exec(h))!==null){if(!m[1].includes("logo")&&!m[1].includes("icon"))p.push(m[1]);}return p.map(x=>({url:x,headers:this.getHeaders()})); }
    getFilterList() { return []; } getSourcePreferences() { return []; }
}
