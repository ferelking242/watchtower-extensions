const watchtowerSources = [{
        "name": "Scan Reader",
        "langs": ["fr"],
        "ids": { "fr": 418445197 },
        "baseUrl": "https://scanreader.net",
        "apiUrl": "https://scanreader.net",
        "iconUrl": "https://scanreader.net/favicon.ico",
        "typeSource": "single",
        "itemType": 2,
        "isManga": true,
        "version": "0.1.0",
        "pkgPath": "manga/fr/scanreader.js",
        "editableBaseUrl": true,
        "hasCloudflare": false,
        "requiresAccount": false,
        "hasDRM": false,
        "paywall": "free",
        "notes": "Scans manga FR — ScanReaderTheme"
    }];
    const BASE_URL = "https://scanreader.net";
    class DefaultExtension extends MProvider {
        constructor(){super();}
        get baseUrl() { return new SharedPreferences().get("base_url") || BASE_URL; }

        getSourcePreferences() {
            return [{
                key: "base_url",
                editTextPreference: {
                    title: "URL du site",
                    summary: "Adresse du site Scan Reader. Modifiez-la uniquement si le domaine a changé (migration ou miroir).",
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
            const re=/<a[^>]+href="([^"]+\/mangas\/[^"]+)"[^>]*>[\s\S]{0,400}?<img[^>]+(?:src|data-src)="([^"]+)"[^>]*(?:alt|title)="([^"]{2,120})"/gi;let m;
            while((m=re.exec(html))!==null){const url=m[1].startsWith("http")?m[1]:this.baseUrl+m[1];if(url in seen)continue;seen[url]=1;list.push({link:url,imageUrl:m[2],name:this._dec(m[3])});}
            if(list.length===0){const re2=/href="([^"]+\/mangas\/[^"\/]+)\/?"/gi;let m2;const s2={};
                while((m2=re2.exec(html))!==null){const url=m2[1].startsWith("http")?m2[1]:this.baseUrl+m2[1];if(url in s2)continue;s2[url]=1;const slug=url.split("/mangas/")[1].replace(/\/$/,"");list.push({link:url,imageUrl:"",name:this._dec(slug.replace(/-/g," "))});}}
            return list;
        }
        async getPopular(page){const r=await new Client().get(this.baseUrl+"/bibliotheque?page="+page,this._hdrs());return{list:this._parse(r.body),hasNextPage:page<20};}
        async getLatestUpdates(page){const r=await new Client().get(this.baseUrl+"/dernieres-sorties?page="+page,this._hdrs());return{list:this._parse(r.body),hasNextPage:page<20};}
        async search(query,page,f){const r=await new Client().get(this.baseUrl+"/bibliotheque?q="+encodeURIComponent(query)+"&page="+page,this._hdrs());return{list:this._parse(r.body),hasNextPage:false};}
        async getDetail(url){
            const r=await new Client().get(url,this._hdrs(url));const html=r.body;
            const nameM=html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i);
            const imgM=html.match(/<meta[^>]+property="og:image"[^>]+content="([^"]+)"/i);
            const descM=html.match(/<meta[^>]+name="description"[^>]+content="([^"]+)"/i);
            const chapters=[],seen={};
            const chRe=/<a[^>]+href="([^"]+\/chapitre[^"]*)"[^>]*>([\s\S]{1,150}?)<\/a>/gi;let m;
            while((m=chRe.exec(html))!==null){const cu=m[1].startsWith("http")?m[1]:this.baseUrl+m[1];if(cu in seen)continue;seen[cu]=1;chapters.push({name:this._dec(m[2]),url:cu});}
            return{name:nameM?this._dec(nameM[1]):"",imageUrl:imgM?imgM[1]:"",description:descM?this._dec(descM[1]):"",chapters:chapters.length>0?chapters:[{name:"Lire",url}]};
        }
        async getPageList(url){
            const r=await new Client().get(url,this._hdrs(url));const html=r.body;
            const pages=[],seen=new Set();
            const jsArr=html.match(/var\s+pages\s*=\s*(\[[^\]]+\])/i)||html.match(/"images"\s*:\s*(\[[^\]]+\])/i);
            if(jsArr){try{const arr=JSON.parse(jsArr[1].replace(/'/g,'"'));for(const item of arr){const u=typeof item==="string"?item:(item.url||item.src||"");if(u&&!seen.has(u)){seen.add(u);pages.push({url:u,headers:this._hdrs(url)});}}}catch(_){}}
            if(pages.length===0){const imgRe=/<img[^>]+(?:data-src|src)="([^"]+\.(?:jpg|jpeg|png|webp)[^"]{0,80})"/gi;let m;
                while((m=imgRe.exec(html))!==null){const u=m[1].startsWith("http")?m[1]:this.baseUrl+m[1];if(!seen.has(u)&&!u.includes("logo")&&!u.includes("avatar")){seen.add(u);pages.push({url:u,headers:this._hdrs(url)});}}}
            return pages;
        }
        getForYou(page){return this.getPopular(page);}
        getComments(url,page){return Promise.resolve([]);}
    }