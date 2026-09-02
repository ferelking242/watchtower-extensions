const watchtowerSources = [{"name":"Scantrad One Piece","lang":"fr","baseUrl":"https://scan-op.com","iconUrl":"https://scan-op.com/favicon.ico","typeSource":"single","itemType":0,"version":"1.0.0","pkgPath":"manga/src/fr/scantrad_onepiece.js","notes":"Scantrad One Piece — scanlation officieuse One Piece FR"}];
const BASE_URL = "https://scan-op.com";
class DefaultExtension extends MProvider {
    constructor() { super(); }
    getHeaders() { return {"User-Agent":"Mozilla/5.0","Referer":`${BASE_URL}/`}; }
    mangaListParse(h) { const l=[];const re=/<a[^>]+href="([^"]+)"[\s\S]*?<img[^>]+(?:src|data-src)="([^"]+)"[\s\S]*?<\/a>[\s\S]*?<h2[^>]*>([^<]+)<\/h2>/g;let m;const s={};while((m=re.exec(h))!==null){if(!s[m[1]]){s[m[1]]=1;l.push({link:m[1],imageUrl:m[2],name:m[3].trim()});}}if(l.length===0){const r2=/href="([^"]+)"[\s\S]*?src="([^"]+)"[\s\S]*?alt="([^"]*)"/g;while((m=r2.exec(h))!==null){if(!s[m[1]]&&m[3].trim()&&!m[3].toLowerCase().includes("logo")){s[m[1]]=1;l.push({link:m[1],imageUrl:m[2],name:m[3].trim()});}}}return l; }
    async getPopular(p) { const r=await new Client().get(`${BASE_URL}/`,this.getHeaders());return{list:this.mangaListParse(r.body),hasNextPage:false}; }
    async getLatestUpdates(p) { return this.getPopular(p); }
    async search(q,p) { return this.getPopular(p); }
    async getDetail(url) { const u=url.startsWith("http")?url:`${BASE_URL}${url}`;const r=await new Client().get(u,this.getHeaders());const h=r.body;const nm=h.match(/<h1[^>]*>([^<]+)<\/h1>/);const n=nm?nm[1].trim():"";const ch=[];const cr=/href="([^"]+)"[\s\S]*?chapter[\s\S]*?([\d.]+)/gi;let cm;while((cm=cr.exec(h))!==null){ch.push({name:`Chapitre ${cm[2]}`,url:cm[1]});}return{name:n,description:"",imageUrl:"",genre:["One Piece","Shounen"],status:0,chapters:ch}; }
    async getPageList(url) { const u=url.startsWith("http")?url:`${BASE_URL}${url}`;const r=await new Client().get(u,this.getHeaders());const p=[];const re=/src="([^"]+\.(?:jpg|jpeg|png|webp)[^"]*)"/gi;let m;const h=r.body;while((m=re.exec(h))!==null){if(!m[1].includes("logo")&&!m[1].includes("icon"))p.push(m[1]);}return p.map(x=>({url:x,headers:this.getHeaders()})); }
    getFilterList() { return []; } getSourcePreferences() { return []; }
}
