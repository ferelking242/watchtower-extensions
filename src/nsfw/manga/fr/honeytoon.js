const watchtowerSources = [{
    "name": "Honeytoon",
    "langs": ["fr"],
    "ids": { "fr": 512047336 },
    "baseUrl": "https://honeytoon.com",
    "apiUrl": "https://honeytoon.com",
    "iconUrl": "https://raw.githubusercontent.com/ferelking242/watchtower-extensions/main/assets/icons/manga-2000000159.svg",
    "typeSource": "single",
    "itemType": 0,
    "isManga": true,
    "isNsfw": true,
    "version": "0.1.0",
    "login": true,
    "forYou": true,
    "pkgPath": "nsfw/manga/fr/honeytoon.js",
    "editableBaseUrl": true,
    "hasCloudflare": false,
    "requiresAccount": false,
    "hasDRM": false,
    "paywall": "freemium",
    "notes": "Webtoons adultes FR — Honeytoon (épisodes gratuits lisibles, le reste via compte)"
}];
const BASE_URL = "https://honeytoon.com";
const PIC = "https://pic.honeytoon.com/";
class DefaultExtension extends MProvider {
    constructor(){ super(); }
    get baseUrl(){ return new SharedPreferences().get("base_url") || BASE_URL; }

    getSourcePreferences() {
        return [{
            key: "base_url",
            editTextPreference: {
                title: "URL du site",
                summary: "Adresse du site Honeytoon. Modifiez-la uniquement si le domaine a changé (migration ou miroir).",
                value: BASE_URL,
                dialogTitle: "URL du site",
                dialogMessage: "URL actuelle : " + BASE_URL
            }
        }];
    }
    _hdrs(ref){ return {"User-Agent":"Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36","Accept-Language":"fr-FR,fr;q=0.9","Cookie":"eighteen=1","Referer":ref||this.baseUrl+"/fr"}; }
    _dec(s){ return String(s||"").replace(/&amp;/g,"&").replace(/&quot;/g,'"').replace(/&#0?39;/g,"'").replace(/&eacute;/g,"é").replace(/&egrave;/g,"è").replace(/&agrave;/g,"à").replace(/&#39;/g,"'").replace(/&nbsp;/g," ").replace(/<[^>]+>/g,"").replace(/\s+/g," ").trim(); }
    _abs(u){ if(!u) return ""; if(/^https?:\/\//.test(u)) return u; return this.baseUrl + (u.charAt(0)==="/" ? u : "/"+u); }
    // Cartes d'une section du classement (data-card-sort="popular" | "newest")
    _cards(html,sortKey){
        const list=[],seen={};
        const anchor='data-card-sort="'+sortKey+'"';
        const s=html.indexOf(anchor);
        if(s<0) return list;
        let scope=html.slice(s);
        const nx=scope.indexOf("data-card-sort=",10);
        if(nx>0) scope=scope.slice(0,nx);
        const re=/<div class="preview-card[^"]*"[^>]*>([\s\S]*?)<\/a>/g;
        let m;
        while((m=re.exec(scope))!==null){
            const inner=m[1];
            const hm=inner.match(/<a[^>]+href="(\/fr\/comic\/[^"]+)"/);
            const im=inner.match(/<img[^>]+src="([^"]+)"/);
            if(!hm||!im) continue;
            const link=this._abs(hm[1]);
            if(seen[link]) continue;
            seen[link]=1;
            const am=inner.match(/<img[^>]+alt="([^"]*)"/);
            const name=this._dec((am?am[1]:"").replace(/\s*-\s*couvreur?$/i,"").replace(/\s*-\s*couverture$/i,""))||link.split("/").pop();
            list.push({name,imageUrl:im[1].startsWith("http")?im[1]:PIC+im[1].replace(/^\//,""),link});
        }
        return list;
    }
    async getPopular(page){
        const r=await new Client().get(this.baseUrl+"/fr/ranking",this._hdrs());
        return {list:this._cards(r.body||"","popular"),hasNextPage:false};
    }
    async getLatestUpdates(page){
        const r=await new Client().get(this.baseUrl+"/fr/ranking",this._hdrs());
        return {list:this._cards(r.body||"","newest"),hasNextPage:false};
    }
    async search(query,page){
        const p=page||1;
        const body=new URLSearchParams();
        body.append("query",query||"");
        body.append("page",String(p));
        body.append("sort","popular");
        const r=await new Client().post(this.baseUrl+"/fr/api/search/v2/result-page",body,this._hdrs(this.baseUrl+"/fr/search"));
        let data={};
        try{ data=JSON.parse(r.body||"{}"); }catch(_){}
        const list=[];
        const push=(arr)=>{ for(const it of (arr||[])){
            if(!it) continue;
            const link=it.link?this._abs(it.link):(it.slug?this.baseUrl+"/fr/comic/"+it.slug:"");
            if(!link) continue;
            list.push({name:it.title||it.slug, imageUrl:it.image?(it.image.startsWith("http")?it.image:PIC+it.image.replace(/^\//,"")):"", link});
        } };
        push(data.comics); push(data.manga);
        const total=(data.comics_total||0)+(data.manga_total||0);
        const per=data.per_page||20;
        return {list,hasNextPage:p*per<total};
    }
    async getDetail(url){
        const r=await new Client().get(url,this._hdrs(url));const html=r.body||"";
        const nm=html.match(/<h1[^>]+class="comic-book__title[^"]*"[^>]*>([\s\S]*?)<\/h1>/)||html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/);
        const name=this._dec(nm?nm[1]:"");
        const im=html.match(/<meta[^>]+property="og:image"[^>]+content="([^"]+)"/i);
        let description="";
        const dm=html.match(/<div[^>]+class="comic-book__desc[^"]*"[^>]*>([\s\S]*?)<\/div>/);
        if(dm) description=this._dec(dm[1].replace(/<strong>[\s\S]*?<\/strong>/,""));
        if(!description){const mm=html.match(/<meta[^>]+name="description"[^>]+content="([^"]*)"/i);if(mm)description=this._dec(mm[1]);}
        const genre=[],gseen={};
        const gre=/<a[^>]+href="(?:\/fr\/genres\/[^"]+|\/fr\/search\?q=[^"]+&amp;st=tag)"[^>]*>([^<]+)<\/a>/g;
        let g;
        while((g=gre.exec(html))!==null){
            const t=this._dec(g[1]).replace(/^#/,"");
            if(t&&!gseen[t]){gseen[t]=1;genre.push(t);}
        }
        // Épisodes : seuls les liens réels sont lisibles (les verrouillés pointent vers javascript:)
        const start=html.indexOf("comic-list-items");
        const scope=start>=0?html.slice(start):html;
        const chapters=[],seen={};
        const cre=/<a([^>]*class="comic-list__item[^"]*"[^>]*)>([\s\S]*?)<\/a>/g;
        let c;
        while((c=cre.exec(scope))!==null){
            const hm=c[1].match(/href="(\/fr\/comic\/[^"]+)"/);
            if(!hm) continue;
            const cu=this._abs(hm[1]);
            if(seen[cu]) continue;
            const tm=c[2].match(/<h2 class="comic-list__title-desc">([\s\S]*?)<\/h2>/);
            const cn=this._dec(tm?tm[1]:"");
            if(!cn) continue;
            seen[cu]=1;
            chapters.push({name:cn,url:cu});
        }
        return {name,imageUrl:im?im[1]:"",description,author:"",artist:"",genre,status:5,chapters};
    }
    async getPageList(url){
        const r=await new Client().get(url,this._hdrs(url));
        const html=r.body||"";
        const pages=[],seen={};
        const re=/<img[^>]+(?:data-src|src)="(https?:\/\/[^"]*\/uploads\/comics-single\/[^"]+)"/g;
        let m;
        while((m=re.exec(html))!==null){
            if(seen[m[1]]) continue;
            if(!/\.(?:jpe?g|png|webp|gif|avif)(?:[?#]|$)/i.test(m[1])) continue;
            seen[m[1]]=1;
            pages.push({url:m[1],headers:{"User-Agent":this._hdrs()["User-Agent"],"Referer":url}});
        }
        return pages;
    }
    getFilterList(){ return []; }
    getForYou(page){ return this.getPopular(page); }
    getComments(url,page){ return Promise.resolve([]); }
}
