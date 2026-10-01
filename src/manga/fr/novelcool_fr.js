const watchtowerSources = [{
    "name": "NovelCool",
    "langs": ["fr"],
    "ids": { "fr": 604183927 },
    "baseUrl": "https://fr.novelcool.com",
    "apiUrl": "https://fr.novelcool.com",
    "iconUrl": "https://raw.githubusercontent.com/ferelking242/watchtower-extensions/main/assets/icons/manga-2000000160.svg",
    "typeSource": "single",
    "itemType": 2,
    "isManga": true,
    "version": "0.1.0",
    "pkgPath": "manga/fr/novelcool_fr.js",
    "editableBaseUrl": true,
    "hasCloudflare": false,
    "requiresAccount": false,
    "hasDRM": false,
    "paywall": "free",
    "notes": "Mangas FR — NovelCool (manga uniquement, romans exclus)"
}];
const BASE_URL = "https://fr.novelcool.com";
class DefaultExtension extends MProvider {
    constructor(){ super(); }
    get baseUrl(){ return new SharedPreferences().get("base_url") || BASE_URL; }

    getSourcePreferences() {
        return [{
            key: "base_url",
            editTextPreference: {
                title: "URL du site",
                summary: "Adresse du site NovelCool (FR). Modifiez-la uniquement si le domaine a changé (migration ou miroir).",
                value: BASE_URL,
                dialogTitle: "URL du site",
                dialogMessage: "URL actuelle : " + BASE_URL
            }
        }];
    }
    _hdrs(ref){ return {"User-Agent":"Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36","Accept-Language":"fr-FR,fr;q=0.9","Referer":ref||this.baseUrl+"/"}; }
    _dec(s){ return String(s||"").replace(/&amp;/g,"&").replace(/&quot;/g,'"').replace(/&#0?39;/g,"'").replace(/&nbsp;/g," ").replace(/<[^>]+>/g,"").replace(/\\'/g,"'").replace(/\s+/g," ").trim(); }
    _abs(u){ if(!u) return ""; if(/^https?:\/\//.test(u)) return u; return this.baseUrl + (u.charAt(0)==="/" ? u : "/"+u); }
    _parseList(html){
        const list=[],seen={};
        const re=/<div class="book-pic" title="([^"]*)">\s*<a[^>]+href="([^"]+)"[^>]*>[\s\S]*?(?:lazy_url|cover_url|data-src)="([^"]+)"[\s\S]*?book-type book-type-(\w+)"/g;
        let m;
        while((m=re.exec(html))!==null){
            if(m[4]==="novel") continue; // romans textuels exclus
            const link=this._abs(m[2]);
            if(seen[link]) continue;
            seen[link]=1;
            list.push({name:this._dec(m[1]),imageUrl:m[3],link});
        }
        return list;
    }
    async getPopular(page){
        const r=await new Client().get(this.baseUrl+"/category/new_list.html",this._hdrs());
        return {list:this._parseList(r.body||""),hasNextPage:false};
    }
    async getLatestUpdates(page){
        const r=await new Client().get(this.baseUrl+"/category/latest.html",this._hdrs());
        return {list:this._parseList(r.body||""),hasNextPage:false};
    }
    async search(query,page){
        const p=page||1;
        const path="/search?name="+encodeURIComponent(query||"")+(p>1?"&page="+p:"");
        const r=await new Client().get(this.baseUrl+path,this._hdrs());
        const html=r.body||"";
        const hasNext=new RegExp("page="+(p+1)+"(?:\\.html)?").test(html);
        return {list:this._parseList(html),hasNextPage:hasNext};
    }
    async getDetail(url){
        const r=await new Client().get(url,this._hdrs(url));const html=r.body||"";
        const nm=html.match(/<h1[^>]+class="bookinfo-title[^"]*"[^>]*>([\s\S]*?)<\/h1>/)||html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/);
        const name=this._dec(nm?nm[1]:"");
        const im=html.match(/class="bookinfo-pic-img"\s+src="([^"]+)"/);
        let description="";
        const dm=html.match(/<span[^>]+itemprop="description"[^>]*>([\s\S]*?)<\/span>/);
        if(dm) description=this._dec(dm[1]);
        if(!description){const mm=html.match(/<meta[^>]+name="description"[^>]+content="([^"]*)"/i);if(mm)description=this._dec(mm[1]);}
        const am=html.match(/<span[^>]+itemprop="creator"[^>]*>([^<]*)<\/span>/);
        const author=am?this._dec(am[1]):"";
        const genre=[],gseen={};
        const gre=/<a[^>]+href="\/category\/([^"]+)\.html"[^>]*>[\s\S]*?itemprop="keywords">([^<]*)<\/span>/g;
        let g;
        while((g=gre.exec(html))!==null){
            if(g[1]==="completed"||g[1]==="ongoing") continue;
            const t=this._dec(g[2]||g[1]);
            if(t&&!gseen[t]){gseen[t]=1;genre.push(t);}
        }
        let status=5;
        const sm=html.match(/Status:[^<]*<\/span>\s*<a[^>]*>([^<]+)<\/a>/);
        if(sm){
            const s=this._dec(sm[1]).toLowerCase();
            if(s.includes("complet")||s.includes("finish")) status=1;
            else if(s.includes("ongoing")||s.includes("cours")) status=0;
        }
        const chapters=[],seen={};
        const cre=/<a[^>]+href="(https?:\/\/[^"]+\/chapter\/[^"]+)"[^>]*title="([^"]+)"[^>]*>/g;
        let c;
        while((c=cre.exec(html))!==null){
            const cu=c[1];
            if(seen[cu]) continue;
            seen[cu]=1;
            chapters.push({name:this._dec(c[2]),url:cu});
        }
        chapters.reverse(); // la liste est du plus récent au plus ancien
        return {name,imageUrl:im?im[1]:"",description,author,artist:author,genre,status,chapters};
    }
    async getPageList(url){
        const ua=this._hdrs()["User-Agent"];
        const r=await new Client().get(url,this._hdrs(url));
        const html=r.body||"||";
        const imgRe=/<img[^>]+class="mangaread-manga-pic[^"]*"[^>]+src="([^"]+)"/g;
        const extract=(t)=>{const out=[];let m;imgRe.lastIndex=0;while((m=imgRe.exec(t))!==null){if(!/logo|default\//i.test(m[1]))out.push(m[1]);}return out;};
        const baseImgs=extract(html);
        // total de pages image : le sélecteur de pagination affiche "n/total"
        let total=0;
        const pairs=html.match(/>?(\d+)\/(\d+)</g)||[];
        for(const p of pairs){const n=parseInt((p.match(/(\d+)\/(\d+)/)||[])[2]||"0",10);if(n>total)total=n;}
        // tronc commun des URLs de page : .../<id>-1.html → .../<id>
        const stm=html.match(/value="(https?:\/\/[^"]+?)-1\.html"/);
        const stem=stm?stm[1]:url.replace(/\.html$/,"").replace(/\/+$/,"");
        if(!total||total<2) return baseImgs.map(u=>({url:u,headers:{"User-Agent":ua,"Referer":url}}));
        // NovelCool accepte "Load images: 10" : ...-10-<groupe>.html regroupe 10 images par requête
        // (index de groupe croissant, pas offset : groupe 1 = pages 1-10, groupe 2 = pages 11-20...)
        const groups=Math.min(Math.ceil(total/10),30);
        const results=await Promise.all(Array.from({length:groups},(_,i)=>i+1).map(async (g)=>{
            try{
                const res=await new Client().get(stem+"-10-"+g+".html",this._hdrs(url));
                return extract(res.body||"");
            }catch(_){ return []; }
        }));
        const pages=[];
        const seen={};
        for(const arr of results){ for(const u of arr){ if(!seen[u]){seen[u]=1;pages.push(u);} } }
        if(pages.length===0) for(const u of baseImgs){ if(!seen[u]){seen[u]=1;pages.push(u);} }
        return pages.map(u=>({url:u,headers:{"User-Agent":ua,"Referer":url}}));
    }
    getFilterList(){ return []; }
    getForYou(page){ return this.getPopular(page); }
    getComments(url,page){ return Promise.resolve([]); }
}
