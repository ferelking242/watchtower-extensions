const watchtowerSources = [{
        "name": "Soft Epsilon Scan",
        "langs": ["fr"],
        "ids": { "fr": 148280965 },
        "baseUrl": "https://epsilonsoft.to",
        "apiUrl": "https://epsilonsoft.to",
        "iconUrl": "https://epsilonsoft.to/favicon.ico",
        "typeSource": "single",
        "itemType": 2,
        "isManga": true,
        "isNsfw": true,
        "version": "0.1.0",
        "pkgPath": "manga/fr/softepsilonscan.js",
        "editableBaseUrl": true,
        "hasCloudflare": true,
        "requiresAccount": false,
        "hasDRM": false,
        "paywall": "free",
        "notes": "Scans manga FR (adulte) — Pam theme"
    }];
    const BASE_URL = "https://epsilonsoft.to";
    class DefaultExtension extends MProvider {
        constructor(){super();}
        get baseUrl(){const p=this.source.prefs?.find(x=>x.key==="base_url");return(p&&p.value)?p.value.replace(/\/$/,""):BASE_URL;}
        _hdrs(ref){return{"User-Agent":"Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/124 Safari/537.36","Referer":ref||this.baseUrl+"/"};}
        _dec(s){return String(s||"").replace(/&amp;/g,"&").replace(/&quot;/g,'"').replace(/&#039;/g,"'").replace(/<[^>]+>/g,"").replace(/\s+/g," ").trim();}
        _parse(html){
            const list=[],seen={};
            const re=/<a[^>]+href="([^"]+\/(?:manga|series)\/[^"]+)"[^>]*>[\s\S]{0,400}?<img[^>]+(?:src|data-src)="([^"]+)"[^>]*(?:alt|title)="([^"]{2,120})"/gi;let m;
            while((m=re.exec(html))!==null){const url=m[1].startsWith("http")?m[1]:this.baseUrl+m[1];if(url in seen)continue;seen[url]=1;list.push({link:url,imageUrl:m[2],name:this._dec(m[3])});}
            return list;
        }
        async getPopular(page){const r=await new Client().get(this.baseUrl+"/filterList?page="+page+"&sortBy=views&asc=false",this._hdrs());return{list:this._parse(r.body),hasNextPage:page<20};}
        async getLatestUpdates(page){const r=await new Client().get(this.baseUrl+"/lastest?page="+page,this._hdrs());return{list:this._parse(r.body),hasNextPage:page<20};}
        async search(query,page,f){const r=await new Client().get(this.baseUrl+"/filterList?page="+page+"&name="+encodeURIComponent(query),this._hdrs());return{list:this._parse(r.body),hasNextPage:false};}
        async getDetail(url){
            const r=await new Client().get(url,this._hdrs(url));const html=r.body;
            const nameM=html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i)||html.match(/<h2[^>]*class="[^"]*title[^"]*"[^>]*>([\s\S]*?)<\/h2>/i);
            const imgM=html.match(/<meta[^>]+property="og:image"[^>]+content="([^"]+)"/i);
            const descM=html.match(/<meta[^>]+name="description"[^>]+content="([^"]+)"/i);
            const chapters=[],seen={};
            const chRe=/<a[^>]+href="([^"]+\/(?:chapitre|chapter|read)[^"]*)"[^>]*>([\s\S]{1,150}?)<\/a>/gi;let m;
            while((m=chRe.exec(html))!==null){const cu=m[1].startsWith("http")?m[1]:this.baseUrl+m[1];if(cu in seen||cu===url)continue;seen[cu]=1;chapters.push({name:this._dec(m[2]),url:cu});}
            return{name:nameM?this._dec(nameM[1]):"",imageUrl:imgM?imgM[1]:"",description:descM?this._dec(descM[1]):"",chapters:chapters.length>0?chapters:[{name:"Lire",url}]};
        }
        async getPageList(url){
            const r=await new Client().get(url,this._hdrs(url));const html=r.body;
            const pages=[],seen=new Set();
            const jsArr=html.match(/chapImages\s*=\s*"([^"]+)"/i);
            if(jsArr){const arr=jsArr[1].split(",");for(const u of arr){if(u&&!seen.has(u)){seen.add(u);pages.push({url:u,headers:this._hdrs(url)});}}}
            if(pages.length===0){const imgRe=/<img[^>]+(?:data-src|src)="([^"]+\.(?:jpg|jpeg|png|webp)[^"]{0,80})"/gi;let m;
                while((m=imgRe.exec(html))!==null){const u=m[1].startsWith("http")?m[1]:this.baseUrl+m[1];if(!seen.has(u)&&!u.includes("logo")){seen.add(u);pages.push({url:u,headers:this._hdrs(url)});}}}
            return pages;
        }
        getForYou(page){return this.getPopular(page);}
        getComments(url,page){return Promise.resolve([]);}
    }