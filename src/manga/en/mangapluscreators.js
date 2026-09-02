const watchtowerSources = [{"name":"MANGA Plus Creators","lang":"en","baseUrl":"https://mangaplus.shueisha.co.jp","iconUrl":"https://mangaplus.shueisha.co.jp/favicon.ico","typeSource":"single","itemType":0,"version":"1.0.0","pkgPath":"manga/src/en/mangapluscreators.js","notes":"MANGA Plus Creators — webtoons originaux Shueisha"}];
const BASE_URL = "https://mangaplus.shueisha.co.jp";
class DefaultExtension extends MProvider {
    constructor() { super(); }
    getHeaders() { return {"User-Agent":"Mozilla/5.0","Referer":`${BASE_URL}/`}; }
    mangaListParse(h) { const l=[];const re=/<a[^>]+href="([^"]+)"[\s\S]*?<img[^>]+(?:src|data-src)="([^"]+)"[\s\S]*?<\/a>[\s\S]*?<h2[^>]*>([^<]+)<\/h2>/g;let m;const s={};while((m=re.exec(h))!==null){if(!s[m[1]]){s[m[1]]=1;l.push({link:m[1],imageUrl:m[2],name:m[3].trim()});}}if(l.length===0){const r2=/href="([^"]+)"[\s\S]*?src="([^"]+)"[\s\S]*?alt="([^"]*)"/g;while((m=r2.exec(h))!==null){if(!s[m[1]]&&m[3].trim()&&!m[3].toLowerCase().includes("logo")){s[m[1]]=1;l.push({link:m[1],imageUrl:m[2],name:m[3].trim()});}}}return l; }
    async getPopular(p) { const r=await new Client().get(`${BASE_URL}/creators`,this.getHeaders());return{list:this.mangaListParse(r.body),hasNextPage:false}; }
    async getLatestUpdates(p) { return this.getPopular(p); }
    async search(q,p) { return this.getPopular(p); }
    async getDetail(url) { const u=url.startsWith("http")?url:`${BASE_URL}${url}`;const r=await new Client().get(u,this.getHeaders());const h=r.body;const nm=h.match(/<h1[^>]*>([^<]+)<\/h1>/);const n=nm?nm[1].trim():"";const dm=h.match(/<meta[^>]+name="description"[^>]+content="([^"]+)"/);const d=dm?dm[1]:"";return{name:n,description:d,imageUrl:"",genre:[],status:0,chapters:[]}; }
    async getPageList(url) { return []; }
    getFilterList() { return []; } getSourcePreferences() { return []; }
}
