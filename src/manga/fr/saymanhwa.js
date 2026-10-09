const watchtowerSources = [{
    "name": "SayManhwa",
    "langs": ["fr"],
    "ids": { "fr": 348092715 },
    "baseUrl": "https://saymanhwa.com",
    "apiUrl": "https://saymanhwa.com",
    "iconUrl": "https://raw.githubusercontent.com/ferelking242/watchtower-extensions/main/assets/icons/manga-2000000158.svg",
    "typeSource": "single",
    "itemType": 0,
    "isManga": true,
    "version": "0.1.0",
    "login": true,
    "forYou": true,
    "pkgPath": "manga/fr/saymanhwa.js",
    "editableBaseUrl": true,
    "hasCloudflare": false,
    "requiresAccount": false,
    "hasDRM": false,
    "paywall": "free",
    "notes": "Webtoons manhwa FR — SayManhwa"
}];
const BASE_URL = "https://saymanhwa.com";
class DefaultExtension extends MProvider {
    constructor(){ super(); }
    get baseUrl(){ return new SharedPreferences().get("base_url") || BASE_URL; }

    getSourcePreferences() {
        return [{
            key: "base_url",
            editTextPreference: {
                title: "URL du site",
                summary: "Adresse du site SayManhwa. Modifiez-la uniquement si le domaine a changé (migration ou miroir).",
                value: BASE_URL,
                dialogTitle: "URL du site",
                dialogMessage: "URL actuelle : " + BASE_URL
            }
        }];
    }
    _hdrs(ref){ return {"User-Agent":"Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36","Accept-Language":"fr-FR,fr;q=0.9","Referer":ref||this.baseUrl+"/"}; }
    _dec(s){ return String(s||"").replace(/&amp;/g,"&").replace(/&quot;/g,'"').replace(/&#0?39;/g,"'").replace(/&eacute;/g,"é").replace(/&egrave;/g,"è").replace(/&agrave;/g,"à").replace(/&ccedil;/g,"ç").replace(/&nbsp;/g," ").replace(/<[^>]+>/g,"").replace(/\s+/g," ").trim(); }
    _abs(u){ if(!u) return ""; if(/^https?:\/\//.test(u)) return u; return this.baseUrl + (u.charAt(0)==="/" ? u : "/"+u); }
    _statusCode(t){
        const s = String(t||"").toLowerCase();
        if(s.includes("en cours")||s.includes("ongoing")) return 0;
        if(s.includes("termin")||s.includes("complet")||s.includes("finished")) return 1;
        if(s.includes("pause")||s.includes("hiatus")) return 2;
        if(s.includes("abandon")||s.includes("cancel")) return 3;
        return 5;
    }
    _list(html){
        const list=[],seen={};
        const re=/<article class="series-card[\s\S]*?<a class="series-card-cover" href="([^"]+)"[\s\S]*?<img src="([^"]+)"[\s\S]*?<h2><a[^>]*>([\s\S]*?)<\/a><\/h2>/g;
        let m;
        while((m=re.exec(html))!==null){
            const link=this._abs(m[1]);
            if(seen[link]) continue;
            seen[link]=1;
            list.push({name:this._dec(m[3]),imageUrl:this._abs(m[2]),link:link});
        }
        return list;
    }
    async _page(path){
        const r=await new Client().get(this.baseUrl+path,this._hdrs());
        const html=r.body||"";
        return {list:this._list(html),hasNextPage:/rel="next"/.test(html)};
    }
    async getPopular(page){ return this._page("/fr/popular?page="+(page||1)); }
    async getLatestUpdates(page){ return this._page("/fr/latest?page="+(page||1)); }
    async search(query,page){
        const p=page||1;
        const path="/fr/series?q="+encodeURIComponent(query||"")+(p>1?"&page="+p:"");
        const r=await new Client().get(this.baseUrl+path,this._hdrs());
        const html=r.body||"";
        // l'ancrage réel de pagination inclut q ; <link rel=next> de l'en-tête l'ignore
        const hasNext=p>0&&new RegExp('href="/fr/series\\?q=[^\"]*&amp;page='+(p+1)+'"').test(html);
        return {list:this._list(html),hasNextPage:hasNext};
    }
    async getDetail(url){
        const r=await new Client().get(url,this._hdrs(url));const html=r.body||"";
        const nm=html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/);
        const name=nm?this._dec(nm[1]):"";
        const im=html.match(/<meta[^>]+property="og:image"[^>]+content="([^"]+)"/i);
        const dm=html.match(/<meta[^>]+name="description"[^>]+content="([^"]*)"/i);
        const am=html.match(/<span>Auteur<\/span><strong[^>]*>([\s\S]*?)<\/strong>/);
        const author=am?this._dec(am[1]):"";
        const gm=html.match(/<div class="series-v72-genres">([\s\S]*?)<\/div>/);
        const genre=[];
        if(gm){ const gre=/<a[^>]*>([\s\S]*?)<\/a>/g;let g;while((g=gre.exec(gm[1]))!==null){const t=this._dec(g[1]);if(t)genre.push(t);} }
        const sm=html.match(/<span>Statut<\/span><strong[^>]*>([\s\S]*?)<\/strong>/);
        const status=this._statusCode(sm?this._dec(sm[1]):"");
        // Chapitres de la même version linguistique que la page (ex. /fr/series/<slug>/chapter-N)
        const path=url.replace(/^https?:\/\/[^/]+/,"").replace(/\/+$/,"");
        const esc=path.replace(/[.*+?^${}()|[\]\\]/g,"\\$&");
        const chapters=[],seen={};
        const cre=new RegExp('<a[^>]+href="([^"]*'+esc+'\\/chapter-[^"]*)"[^>]*>([\\s\\S]*?)<\\/a>','g');
        let c;
        while((c=cre.exec(html))!==null){
            const cu=this._abs(c[1]);
            if(seen[cu]) continue;
            seen[cu]=1;
            const tm=c[2].match(/series-chapter-number-text[^>]*>([^<]+)</);
            const cn=tm?this._dec(tm[1]):this._dec(c[2]);
            const dm2=c[2].match(/<time[^>]+datetime="([^"]+)"/);
            const ch={name:cn||cu.split("/").pop(),url:cu};
            if(dm2){const ts=Date.parse(dm2[1]);if(!isNaN(ts))ch.dateUpload=ts;}
            chapters.push(ch);
        }
        chapters.reverse(); // ordre ascendant pour la lecture
        return {name,imageUrl:im?im[1]:"",description:dm?this._dec(dm[1]):"",author,artist:author,genre,status,chapters};
    }
    async getPageList(url){
        const ua=this._hdrs()["User-Agent"];
        const r=await new Client().get(url,{"User-Agent":ua,"Accept-Language":"fr-FR,fr;q=0.9"});
        const html=r.body||"";
        // les pages sont servies par divers CDN (img.saymanhwa.com, img03.manhwabuddy.com…)
        let scope=html;
        const s=html.indexOf("data-reader-pages");
        if(s>=0){
            scope=html.slice(s);
            let end=-1;
            for(const mk of ["say-real-ad-wrap",'data-reader-ad-slot="bottom"',"chapter-navigation","reader-footer"]){
                const i=scope.indexOf(mk);
                if(i>=0&&(end<0||i<end))end=i;
            }
            if(end>0)scope=scope.slice(0,end);
        }
        const pages=[],seen={};
        const re=/<img[^>]+(?:data-src|src)="(https?:\/\/[^\"]+)"/g;
        let m;
        const collect=(text)=>{
            re.lastIndex=0;
            while((m=re.exec(text))!==null){
                const u=m[1];
                if(seen[u]) continue;
                if(/logo|icon|banner|avatar|advert|spacer|blank|emoji|flag/i.test(u)) continue;
                if(!/\.(?:jpe?g|png|webp|gif|avif)(?:[?#]|$)/i.test(u)) continue;
                seen[u]=1;
                pages.push({url:u,headers:{"User-Agent":ua}});
            }
        };
        collect(scope);
        if(pages.length===0)collect(html);
        return pages;
    }
    getFilterList(){ return []; }
    getForYou(page){ return this.getPopular(page); }
    getComments(url,page){ return Promise.resolve([]); }
}
