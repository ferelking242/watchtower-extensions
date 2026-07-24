const watchtowerSources = [{
      "name": "Mangas Scans",
      "langs": ["fr"],
      "ids": { "fr": 712026872 },
      "baseUrl": "https://mangas-scans.com",
      "apiUrl": "https://mangas-scans.com",
      "iconUrl": "https://mangas-scans.com/favicon.ico",
      "typeSource": "single",
      "itemType": 2,
      "isManga": true,
      "version": "0.1.0",
      "pkgPath": "manga/fr/mangasscans.js",
      "editableBaseUrl": true,
      "hasCloudflare": true,
      "requiresAccount": false,
      "hasDRM": false,
      "paywall": "free",
      "notes": "Scans manga FR — MangaThemesia/WordPress"
  }];
  const BASE_URL = "https://mangas-scans.com";
  class DefaultExtension extends MProvider {
      constructor(){super();}
      get baseUrl(){const p=this.source.prefs?.find(x=>x.key==="base_url");return(p&&p.value)?p.value.replace(/\/$/,""):BASE_URL;}
      _hdrs(ref){return{"User-Agent":"Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/124 Safari/537.36","Referer":ref||this.baseUrl+"/","Accept-Language":"fr-FR,fr;q=0.9"};}
      _dec(s){return String(s||"").replace(/&amp;/g,"&").replace(/&quot;/g,'"').replace(/&#039;/g,"'").replace(/&eacute;/g,"é").replace(/&agrave;/g,"à").replace(/&ccedil;/g,"ç").replace(/<[^>]+>/g,"").replace(/\s+/g," ").trim();}
      _parse(html){
          const list=[],seen={};
          const re=/<a[^>]+href="([^"]+)"[^>]+title="([^"]{2,150})"[^>]*>[\s\S]{0,400}?(?:src|data-src)="([^"]+\.(?:jpg|jpeg|png|webp)[^"]*)"/gi;let m;
          while((m=re.exec(html))!==null){
              const url=m[1].startsWith("http")?m[1]:this.baseUrl+(m[1].startsWith("/")?m[1]:"/"+m[1]);
              if(url in seen||url===this.baseUrl||url.endsWith("/manga/")||url.length<25)continue;
              seen[url]=1;list.push({link:url,imageUrl:m[3],name:this._dec(m[2].trim())});
          }
          return list;
      }
      async getPopular(page){const r=await new Client().get(this.baseUrl+"/manga/?page="+page+"&order=popular",this._hdrs());return{list:this._parse(r.body),hasNextPage:page<30};}
      async getLatestUpdates(page){const r=await new Client().get(this.baseUrl+"/manga/?page="+page+"&order=update",this._hdrs());return{list:this._parse(r.body),hasNextPage:page<10};}
      async search(query,page,f){const r=await new Client().get(this.baseUrl+"/?s="+encodeURIComponent(query)+"&post_type=wp-manga",this._hdrs());return{list:this._parse(r.body),hasNextPage:false};}
      async getDetail(url){
          const r=await new Client().get(url,this._hdrs(url));const html=r.body;
          const nameM=html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/);
          const name=nameM?this._dec(nameM[1]):"";
          const imgM=html.match(/<meta[^>]+property="og:image"[^>]+content="([^"]+)"/i);
          const descM=html.match(/<meta[^>]+name="description"[^>]+content="([^"]+)"/i)||html.match(/entry-content[^"]*"[^>]*>([\s\S]*?)<\/div>/i);
          const chapters=[],seen={};
          const chRe=/<a[^>]+href="([^"]+chapter[^"]*)"[^>]*>([\s\S]{1,150}?)<\/a>/gi;let m;
          while((m=chRe.exec(html))!==null){const cu=m[1].startsWith("http")?m[1]:this.baseUrl+m[1];if(cu in seen||cu===url)continue;seen[cu]=1;chapters.push({name:this._dec(m[2])||cu.split("/").filter(Boolean).pop(),url:cu});}
          return{name,imageUrl:imgM?imgM[1]:"",description:descM?this._dec(descM[1]):"",chapters:chapters.length>0?chapters:[{name:name||"Lire",url}]};
      }
      async getPageList(url){
          const r=await new Client().get(url,this._hdrs(url));const html=r.body;
          const pages=[],seen=new Set();
          const readerM=html.match(/id="readerarea"[^>]*>([\s\S]*?)<\/div>\s*<div[^>]+id="chapter/i)||html.match(/id="readerarea"[^>]*>([\s\S]{0,50000})/i);
          const scope=readerM?readerM[1]:html;
          const imgRe=/<img[^>]+(?:data-src|src)="([^"]+\.(?:jpg|jpeg|png|webp)[^"]{0,100})"/gi;let m;
          while((m=imgRe.exec(scope))!==null){const u=m[1].startsWith("http")?m[1]:this.baseUrl+m[1];if(!seen.has(u)&&!u.includes("logo")&&!u.includes("banner")&&!u.includes("avatar")&&!u.includes("icon")){seen.add(u);pages.push({url:u,headers:this._hdrs(url)});}}
          if(pages.length===0){const jsArr=html.match(/\[(?:"https?:[^"]+\.(?:jpg|jpeg|png|webp)"\s*,?\s*)+\]/i);
              if(jsArr){try{const arr=JSON.parse(jsArr[0]);for(const u of arr){if(!seen.has(u)){seen.add(u);pages.push({url:u,headers:this._hdrs(url)});}}}catch(_){}}}
          return pages;
      }
      getForYou(page){return this.getPopular(page);}
      getComments(url,page){return Promise.resolve([]);}
  }