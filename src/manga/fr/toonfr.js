const watchtowerSources = [{
      "name": "ToonFR",
      "langs": ["fr"],
      "ids": { "fr": 236538479 },
      "baseUrl": "https://toonfr.com",
      "apiUrl": "https://toonfr.com",
      "iconUrl": "https://toonfr.com/favicon.ico",
      "typeSource": "single",
      "itemType": 2,
      "isManga": true,
      "version": "0.1.0",
      "pkgPath": "manga/fr/toonfr.js",
      "editableBaseUrl": true,
      "hasCloudflare": true,
      "requiresAccount": false,
      "hasDRM": false,
      "paywall": "free",
      "notes": "Scans manga FR — Madara/WordPress"
  }];
  const BASE_URL = "https://toonfr.com";
  class DefaultExtension extends MProvider {
      constructor(){super();}
      get baseUrl() { return new SharedPreferences().get("base_url") || BASE_URL; }

      getSourcePreferences() {
        return [{
            key: "base_url",
            editTextPreference: {
                title: "URL du site",
                summary: "Adresse du site ToonFR. Modifiez-la uniquement si le domaine a changé (migration ou miroir).",
                value: BASE_URL,
                dialogTitle: "URL du site",
                dialogMessage: "URL actuelle : " + BASE_URL
            }
        }];
      }
      _hdrs(ref){return{"User-Agent":"Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/124 Safari/537.36","Referer":ref||this.baseUrl+"/","Accept-Language":"fr-FR,fr;q=0.9"};}
      _dec(s){return String(s||"").replace(/&amp;/g,"&").replace(/&quot;/g,'"').replace(/&#039;/g,"'").replace(/&eacute;/g,"é").replace(/&agrave;/g,"à").replace(/&ccedil;/g,"ç").replace(/<[^>]+>/g,"").replace(/\s+/g," ").trim();}
      _parse(html){
          const list=[],seen={};
          const re=/<a[^>]+href="([^"]+)"[^>]*>[\s\S]{0,300}?<img[^>]+(?:src|data-src)="([^"]+)"[^>]*(?:alt|title)="([^"]{2,120})"/gi;let m;
          while((m=re.exec(html))!==null){const url=m[1].startsWith("http")?m[1]:this.baseUrl+(m[1].startsWith("/")?m[1]:"/"+m[1]);if(url in seen||url===this.baseUrl||url.endsWith("/")||url.length<25)continue;seen[url]=1;list.push({link:url,imageUrl:m[2],name:this._dec(m[3].trim())});}
          return list;
      }
      async getPopular(page){const r=await new Client().get(this.baseUrl+"/manga/?m_orderby=views&page="+page,this._hdrs());return{list:this._parse(r.body),hasNextPage:page<30};}
      async getLatestUpdates(page){const r=await new Client().get(this.baseUrl+"/manga/?m_orderby=latest&page="+page,this._hdrs());return{list:this._parse(r.body),hasNextPage:page<10};}
      async search(query,page,f){const r=await new Client().get(this.baseUrl+"/?s="+encodeURIComponent(query)+"&post_type=wp-manga",this._hdrs());return{list:this._parse(r.body),hasNextPage:false};}
      async getDetail(url){
          const r=await new Client().get(url,this._hdrs(url));const html=r.body;
          const nameM=html.match(/<h1[^>]*class="[^"]*(?:post-title|title)[^"]*"[^>]*>([\s\S]*?)<\/h1>/i)||html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/);
          const name=nameM?this._dec(nameM[1]):"";
          const imgM=html.match(/<meta[^>]+property="og:image"[^>]+content="([^"]+)"/i);
          const descM=html.match(/class="summary__content[^"]*"[^>]*>([\s\S]*?)<\/div>/i)||html.match(/<meta[^>]+name="description"[^>]+content="([^"]+)"/i);
          const chapters=[],seen={};
          const chRe=/<a[^>]+href="([^"]+(?:chapitre|chapter|chap|ch-|scan)[^"]*)"[^>]*>([\s\S]{1,150}?)<\/a>/gi;let m;
          while((m=chRe.exec(html))!==null){const cu=m[1].startsWith("http")?m[1]:this.baseUrl+m[1];if(cu in seen||cu===url)continue;seen[cu]=1;chapters.push({name:this._dec(m[2]),url:cu});}
          if(chapters.length===0){const idM=html.match(/manga_id['"]\s*:\s*['"]?(\d+)/i)||html.match(/data-id="(\d+)"/);
              if(idM){try{const aj=await new Client().post(this.baseUrl+"/wp-admin/admin-ajax.php",this._hdrs(url),"action=manga_get_chapters&manga="+idM[1]);
                  const aRe=/<a[^>]+href="([^"]+)"[^>]*>([\s\S]{1,150}?)<\/a>/gi;let am;
                  while((am=aRe.exec(aj.body))!==null){const cu=am[1].startsWith("http")?am[1]:this.baseUrl+am[1];if(cu in seen||cu===url)continue;seen[cu]=1;chapters.push({name:this._dec(am[2]),url:cu});}
              }catch(_){}}
          }
          return{name,imageUrl:imgM?imgM[1]:"",description:descM?this._dec(descM[1]):"",chapters:chapters.length>0?chapters:[{name:name||"Lire",url}]};
      }
      async getPageList(url){
          const r=await new Client().get(url,this._hdrs(url));const html=r.body;
          const pages=[],seen=new Set();
          const jsArr=html.match(/chapter_preloaded_images\s*=\s*(\[[^\]]+\])/i)||html.match(/var\s+pages\s*=\s*(\[[^\]]+\])/i);
          if(jsArr){try{const arr=JSON.parse(jsArr[1].replace(/'/g,'"'));for(const item of arr){const u=typeof item==="string"?item:(item.url||item.src||"");if(u&&!seen.has(u)){seen.add(u);pages.push({url:u,headers:this._hdrs(url)});}}}catch(_){}}
          if(pages.length===0){const imgRe=/<img[^>]+(?:data-src|src)="([^"]+\.(?:jpg|jpeg|png|webp)[^"]{0,80})"/gi;let m;
              while((m=imgRe.exec(html))!==null){const u=m[1].startsWith("http")?m[1]:this.baseUrl+m[1];if(!seen.has(u)&&!u.includes("logo")&&!u.includes("banner")&&!u.includes("avatar")){seen.add(u);pages.push({url:u,headers:this._hdrs(url)});}}}
          return pages;
      }
      getForYou(page){return this.getPopular(page);}
      getComments(url,page){return Promise.resolve([]);}
  }