const watchtowerSources = [{
        "name": "Scan-VF",
        "langs": ["fr"],
        "ids": { "fr": 645787255 },
        "baseUrl": "https://www.scan-vf.net",
        "apiUrl": "https://www.scan-vf.net",
        "iconUrl": "https://www.scan-vf.net/favicon.ico",
        "typeSource": "single",
        "itemType": 2,
        "isManga": true,
        "version": "0.1.0",
        "pkgPath": "manga/fr/scanvf.js",
        "editableBaseUrl": true,
        "hasCloudflare": false,
        "requiresAccount": false,
        "hasDRM": false,
        "paywall": "free",
        "notes": "Scans manga FR — MMRCMS"
    }];
    const BASE_URL = "https://www.scan-vf.net";
    class DefaultExtension extends MProvider {
        constructor(){super();}
        get baseUrl() { return new SharedPreferences().get("base_url") || BASE_URL; }

        getSourcePreferences() {
            return [{
                key: "base_url",
                editTextPreference: {
                    title: "URL du site",
                    summary: "Adresse du site Scan-VF. Modifiez-la uniquement si le domaine a changé (migration ou miroir).",
                    value: BASE_URL,
                    dialogTitle: "URL du site",
                    dialogMessage: "URL actuelle : " + BASE_URL
                }
            }];
        }
        _hdrs(ref){return{"User-Agent":"Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/124 Safari/537.36","Referer":ref||this.baseUrl+"/"};}
        _dec(s){return String(s||"").replace(/&amp;/g,"&").replace(/&quot;/g,'"').replace(/&#039;/g,"'").replace(/<[^>]+>/g,"").replace(/\s+/g," ").trim();}
        _parse(html){
            const list=[],seen={};
            const re=/<a[^>]+href="([^"]+\/manga\/[^"]+)"[^>]*>[\s\S]{0,400}?<img[^>]+(?:src|data-src)="([^"]+)"[^>]*(?:alt|title)="([^"]{2,120})"/gi;let m;
            while((m=re.exec(html))!==null){const url=m[1].startsWith("http")?m[1]:this.baseUrl+m[1];if(url in seen)continue;seen[url]=1;list.push({link:url,imageUrl:m[2],name:this._dec(m[3])});}
            return list;
        }
        async getPopular(page){const r=await new Client().get(this.baseUrl+"/manga-list?page="+page+"&sortBy=views&asc=false",this._hdrs());return{list:this._parse(r.body),hasNextPage:page<20};}
        async getLatestUpdates(page){const r=await new Client().get(this.baseUrl+"/latest-release?page="+page,this._hdrs());return{list:this._parse(r.body),hasNextPage:page<20};}
        async search(query,page,f){const r=await new Client().get(this.baseUrl+"/search?query="+encodeURIComponent(query),this._hdrs());
            let list=[];try{const j=JSON.parse(r.body);const arr=j.suggestions||[];list=arr.map(s=>({link:this.baseUrl+"/manga/"+s.data,imageUrl:"",name:this._dec(s.value)}));}catch(_){list=this._parse(r.body);}
            return{list,hasNextPage:false};}
        async getDetail(url){
            const r=await new Client().get(url,this._hdrs(url));const html=r.body;
            const nameM=html.match(/<h2[^>]*class="[^"]*widget-title[^"]*"[^>]*>([\s\S]*?)<\/h2>/i)||html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i);
            const imgM=html.match(/<img[^>]+class="[^"]*img-responsive[^"]*"[^>]+src="([^"]+)"/i)||html.match(/<meta[^>]+property="og:image"[^>]+content="([^"]+)"/i);
            const descM=html.match(/<div[^>]+class="[^"]*(?:well|manga-desc)[^"]*"[^>]*>([\s\S]*?)<\/div>/i);
            const chapters=[],seen={};
            const chRe=/<a[^>]+href="([^"]+\/(?:manga|chapter)\/[^"]+)"[^>]*>([\s\S]{1,150}?)<\/a>/gi;let m;
            while((m=chRe.exec(html))!==null){const cu=m[1].startsWith("http")?m[1]:this.baseUrl+m[1];if(cu in seen||cu===url)continue;seen[cu]=1;chapters.push({name:this._dec(m[2]),url:cu});}
            return{name:nameM?this._dec(nameM[1]):"",imageUrl:imgM?imgM[1]:"",description:descM?this._dec(descM[1]):"",chapters:chapters.length>0?chapters:[{name:"Lire",url}]};
        }
        async getPageList(url){
            const r=await new Client().get(url,this._hdrs(url));const html=r.body;
            const pages=[],seen=new Set();
            const imgRe=/<img[^>]+class="[^"]*(?:chapter-img|img-responsive)[^"]*"[^>]+(?:data-src|src)="([^"]+)"/gi;let m;
            while((m=imgRe.exec(html))!==null){const u=m[1].startsWith("http")?m[1]:this.baseUrl+m[1];if(!seen.has(u)){seen.add(u);pages.push({url:u,headers:this._hdrs(url)});}}
            if(pages.length===0){const imgRe2=/<img[^>]+(?:data-src|src)="([^"]+\.(?:jpg|jpeg|png|webp)[^"]{0,80})"/gi;let m2;
                while((m2=imgRe2.exec(html))!==null){const u=m2[1].startsWith("http")?m2[1]:this.baseUrl+m2[1];if(!seen.has(u)&&!u.includes("logo")){seen.add(u);pages.push({url:u,headers:this._hdrs(url)});}}}
            return pages;
        }
        getForYou(page){return this.getPopular(page);}
        getComments(url,page){return Promise.resolve([]);}
    }