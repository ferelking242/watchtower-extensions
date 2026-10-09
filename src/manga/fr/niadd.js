const watchtowerSources = [{
    "name": "Niadd",
    "langs": ["fr"],
    "ids": { "fr": 738192640 },
    "baseUrl": "https://fr.niadd.com",
    "apiUrl": "https://fr.niadd.com",
    "iconUrl": "https://raw.githubusercontent.com/ferelking242/watchtower-extensions/main/assets/icons/manga-2000000161.svg",
    "typeSource": "single",
    "itemType": 0,
    "isManga": true,
    "version": "0.1.0",
    "login": true,
    "forYou": true,
    "pkgPath": "manga/fr/niadd.js",
    "editableBaseUrl": true,
    "hasCloudflare": false,
    "requiresAccount": false,
    "hasDRM": false,
    "paywall": "free",
    "notes": "Mangas FR — Niadd (lecture par blocs de 10 pages)"
}];
const BASE_URL = "https://fr.niadd.com";
class DefaultExtension extends MProvider {
    constructor(){ super(); }
    get baseUrl(){ return new SharedPreferences().get("base_url") || BASE_URL; }

    getSourcePreferences() {
        return [{
            key: "base_url",
            editTextPreference: {
                title: "URL du site",
                summary: "Adresse du site Niadd (FR). Modifiez-la uniquement si le domaine a changé (migration ou miroir).",
                value: BASE_URL,
                dialogTitle: "URL du site",
                dialogMessage: "URL actuelle : " + BASE_URL
            }
        },
            {
                key: "images_per_page",
                listPreference: {
                    title: "Images par requête",
                    summary: "Nombre d'images chargées par requête pendant la lecture (10 = recommandé). Les tailles plus petites consomment plus de requêtes.",
                    valueIndex: 2,
                    entries: ["3", "6", "10"],
                    entryValues: ["3", "6", "10"]
                }
            }
        ];
    }
    // Pas de Referer : les pages de lecture répondent 302 quand un Referer est envoyé
    _hdrs(){ return {"User-Agent":"Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36","Accept-Language":"fr-FR,fr;q=0.9"}; }
    _dec(s){ return String(s||"").replace(/&amp;/g,"&").replace(/&quot;/g,'"').replace(/&#0?39;/g,"'").replace(/&#x27;/gi,"'").replace(/&lt;/g,"<").replace(/&gt;/g,">").replace(/&nbsp;/g," ").replace(/<[^>]+>/g,"").replace(/\s+/g," ").trim(); }
    _abs(u){ if(!u) return ""; if(/^https?:\/\//.test(u)) return u; return this.baseUrl + (u.charAt(0)==="/" ? u : "/"+u); }
    _parseList(html){
        const list=[],seen={};
        const re=/<a[^>]+title="([^"]+)"[^>]+href="((?:https?:\/\/[^"]+)?\/manga\/[^"]+\.html)"[\s\S]{0,500}?<img[^>]+src="([^"]+)"/g;
        let m;
        while((m=re.exec(html))!==null){
            const link=this._abs(m[2]);
            if(seen[link]) continue;
            seen[link]=1;
            list.push({name:this._dec(m[1]),imageUrl:this._abs(m[3]),link});
        }
        if(list.length===0){
            const re2=/href="((?:https?:\/\/[^"]+)?\/manga\/[^"]+\.html)"[\s\S]{0,700}?<div class="manga-name">([^<]+)<\/div>/g;
            while((m=re2.exec(html))!==null){
                const link=this._abs(m[1]);
                if(seen[link]) continue;
                seen[link]=1;
                list.push({name:this._dec(m[2]),imageUrl:"",link});
            }
        }
        return list;
    }
    async getPopular(page){
        const r=await new Client().get(this.baseUrl+"/list/Hot-Manga.html",this._hdrs());
        return {list:this._parseList(r.body||""),hasNextPage:false};
    }
    async getLatestUpdates(page){
        const r=await new Client().get(this.baseUrl+"/list/New-Update/",this._hdrs());
        return {list:this._parseList(r.body||""),hasNextPage:false};
    }
    async search(query,page){
        const r=await new Client().get(this.baseUrl+"/search/?name="+encodeURIComponent(query||""),this._hdrs());
        return {list:this._parseList(r.body||""),hasNextPage:false};
    }
    async getDetail(url){
        const r=await new Client().get(url,this._hdrs());const html=r.body||"";
        const nm=html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/);
        const name=this._dec(nm?nm[1]:"");
        const im=html.match(/<meta[^>]+property="og:image"[^>]+content="([^"]+)"/i);
        let description="";
        const dm=html.match(/Synopsis<\/div>\s*<section class="detail-section detail-synopsis">([\s\S]*?)<\/section>/);
        if(dm) description=this._dec(dm[1]);
        const author=[],aseen={};
        const acell=html.match(/<div class="bookside-general-cell"[^>]*itemprop="author"[\s\S]*?<\/div>/);
        if(acell){
            const are=/<span[^>]+itemprop="name"[^>]*>([^<]+)<\/span>/g;let a;
            while((a=are.exec(acell[0]))!==null){const t=this._dec(a[1]);if(t&&!aseen[t]){aseen[t]=1;author.push(t);}}
        }
        const genre=[],gseen={};
        const gre=/<span[^>]+itemprop="genre"[^>]*>([^<]+)<\/span>/g;let g;
        while((g=gre.exec(html))!==null){const t=this._dec(g[1]).replace(/^[\s,;:+-]+/,"");if(t&&!gseen[t]){gseen[t]=1;genre.push(t);}}
        // la liste des chapitres vit sur une page dédiée : /manga/<slug>.html → /manga/<slug>/chapters.html
        const chapters=[],seen={};
        const chUrls=[/\.html$/.test(url)?url.replace(/\.html$/,"/chapters.html"):url];
        for(const cu of chUrls){
            let chHtml="";
            try{ const cr=await new Client().get(cu,this._hdrs()); chHtml=cr.body||""; }catch(_){ continue; }
            const s=chHtml.indexOf("chapter-list");
            const scope=s>=0?chHtml.slice(s):chHtml;
            const cre=/<a[^>]+href="(\/chapter\/[^"]+)"[^>]+title="([^"]+)"/g;
            let c;
            while((c=cre.exec(scope))!==null){
                const link=this._abs(c[1]);
                if(seen[link]) continue;
                seen[link]=1;
                chapters.push({name:this._dec(c[2]),url:link});
            }
            if(chapters.length>0) break;
        }
        return {name,imageUrl:im?im[1]:"",description,author:author.join(", "),artist:"",genre,status:5,chapters};
    }
    _imgPerPage(){ const v=parseInt(new SharedPreferences().get("images_per_page"),10); return (v===3||v===6||v===10)?v:10; }
    async getPageList(url){
        const ua=this._hdrs()["User-Agent"];
        const r=await new Client().get(url,this._hdrs());
        const html=r.body||"";
        const imgRe=/<img[^>]+id="manga_picid_\d+"[^>]+src="([^"]+)"/g;
        const extract=(t)=>{const out=[];let m;imgRe.lastIndex=0;while((m=imgRe.exec(t))!==null){out.push(m[1]);}return out;};
        const baseImgs=extract(html);
        // total de pages image : sélecteur "n/total"
        let total=0;
        const pairs=html.match(/>?(\d+)\/(\d+)</g)||[];
        for(const p of pairs){const n=parseInt((p.match(/(\d+)\/(\d+)/)||[])[2]||"0",10);if(n>total)total=n;}
        // tronc : le sélecteur sl-page référence .../<id>-1.html
        const pi=html.indexOf('class="sl-page"');
        const scope=pi>=0?html.slice(pi):html;
        const stm=scope.match(/value="([^"]*?)-1\.html"/);
        let stem="";
        if(stm){
            stem=stm[1];
            if(!/^https?:\/\//.test(stem)) stem=this.baseUrl+(stem.charAt(0)==="/"?stem:"/"+stem);
        } else {
            stem=url.replace(/\.html$/,"").replace(/\/+$/,"");
        }
        if(!total||total<2) return baseImgs.map(u=>({url:u,headers:{"User-Agent":ua}}));
        // "Charger les images" : ...-<taille>-<groupe>.html (groupe 1 = pages 1-N, groupe 2 = pages N+1-2N...)
        const size=this._imgPerPage();
        const groups=Math.min(Math.ceil(total/size),30);
        const results=await Promise.all(Array.from({length:groups},(_,i)=>i+1).map(async (g)=>{
            try{
                const res=await new Client().get(stem+"-"+size+"-"+g+".html",this._hdrs());
                return extract(res.body||"");
            }catch(_){ return []; }
        }));
        const pages=[];
        const seen={};
        for(const arr of results){ for(const u of arr){ if(!seen[u]){seen[u]=1;pages.push(u);} } }
        if(pages.length===0) for(const u of baseImgs){ if(!seen[u]){seen[u]=1;pages.push(u);} }
        return pages.map(u=>({url:u,headers:{"User-Agent":ua}}));
    }
    getFilterList(){ return []; }
    getForYou(page){ return this.getPopular(page); }
    getComments(url,page){ return Promise.resolve([]); }
}
