const watchtowerSources = [{
        "name": "Rimu Scans",
        "langs": ["fr"],
        "ids": { "fr": 786758357 },
        "baseUrl": "https://rimuscan.fr",
        "apiUrl": "https://rimuscan.fr",
        "iconUrl": "https://rimuscan.fr/favicon.ico",
        "typeSource": "single",
        "itemType": 2,
        "isManga": true,
        "version": "0.1.0",
        "pkgPath": "manga/fr/rimuscans.js",
        "editableBaseUrl": true,
        "hasCloudflare": false,
        "requiresAccount": false,
        "hasDRM": false,
        "paywall": "free",
        "notes": "Scans manga FR (bespoke) — Rimu Scans"
    }];
    const BASE_URL = "https://rimuscan.fr";
    class DefaultExtension extends MProvider {
        constructor(){super();}
        get baseUrl() { return new SharedPreferences().get("base_url") || BASE_URL; }

        getSourcePreferences() {
            return [{
                key: "base_url",
                editTextPreference: {
                    title: "URL du site",
                    summary: "Adresse du site Rimu Scans. Modifiez-la uniquement si le domaine a changé (migration ou miroir).",
                    value: BASE_URL,
                    dialogTitle: "URL du site",
                    dialogMessage: "URL actuelle : " + BASE_URL
                }
            }];
        }
        _hdrs(ref){return{"User-Agent":"Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/124 Safari/537.36","Referer":ref||this.baseUrl+"/","Accept":"application/json"};}
        _map(s){return{link:this.baseUrl+"/series/"+s.slug,imageUrl:s.cover_url?(s.cover_url.startsWith("http")?s.cover_url:this.baseUrl+s.cover_url):"",name:s.title||""};}
        async getPopular(page){const r=await new Client().get(this.baseUrl+"/api/series?page="+page+"&sort=views",this._hdrs());let list=[];try{list=(JSON.parse(r.body).series||[]).map(s=>this._map(s));}catch(_){}return{list,hasNextPage:list.length>0};}
        async getLatestUpdates(page){const r=await new Client().get(this.baseUrl+"/api/series?page="+page+"&sort=latest",this._hdrs());let list=[];try{list=(JSON.parse(r.body).series||[]).map(s=>this._map(s));}catch(_){}return{list,hasNextPage:list.length>0};}
        async search(query,page,f){const r=await new Client().get(this.baseUrl+"/api/series?page="+page+"&search="+encodeURIComponent(query),this._hdrs());let list=[];try{list=(JSON.parse(r.body).series||[]).map(s=>this._map(s));}catch(_){}return{list,hasNextPage:false};}
        async getDetail(url){
            const r=await new Client().get(url,this._hdrs(url));const html=r.body;
            const nameM=html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i);
            const imgM=html.match(/<meta[^>]+property="og:image"[^>]+content="([^"]+)"/i);
            const descM=html.match(/<meta[^>]+name="description"[^>]+content="([^"]+)"/i);
            const chapters=[],seen={};
            const chRe=/<a[^>]+href="([^"]+\/(?:chapter|chapitre)[^"]*)"[^>]*>([\s\S]{1,150}?)<\/a>/gi;let m;
            while((m=chRe.exec(html))!==null){const cu=m[1].startsWith("http")?m[1]:this.baseUrl+m[1];if(cu in seen||cu===url)continue;seen[cu]=1;chapters.push({name:this._dec(m[2]),url:cu});}
            return{name:nameM?this._dec(nameM[1]):"",imageUrl:imgM?imgM[1]:"",description:descM?this._dec(descM[1]):"",chapters:chapters.length>0?chapters:[{name:"Lire",url}]};
        }
        _dec(s){return String(s||"").replace(/&amp;/g,"&").replace(/&quot;/g,'"').replace(/&#039;/g,"'").replace(/<[^>]+>/g,"").replace(/\s+/g," ").trim();}
        async getPageList(url){
            const r=await new Client().get(url,this._hdrs(url));const html=r.body;
            const pages=[],seen=new Set();
            const imgRe=/<img[^>]+(?:data-src|src)="([^"]+\.(?:jpg|jpeg|png|webp)[^"]{0,80})"/gi;let m;
            while((m=imgRe.exec(html))!==null){const u=m[1].startsWith("http")?m[1]:this.baseUrl+m[1];if(!seen.has(u)&&!u.includes("logo")){seen.add(u);pages.push({url:u,headers:this._hdrs(url)});}}
            return pages;
        }
        getForYou(page){return this.getPopular(page);}
        getComments(url,page){return Promise.resolve([]);}
    }