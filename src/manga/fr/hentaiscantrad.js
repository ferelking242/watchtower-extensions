const watchtowerSources = [{
      "name": "Hentai Scantrad",
      "langs": ["fr"],
      "ids": { "fr": 152816508 },
      "baseUrl": "https://hentai-scantrad.org",
      "apiUrl": "https://hentai-scantrad.org",
      "iconUrl": "https://hentai-scantrad.org/favicon.ico",
      "typeSource": "single",
      "itemType": 0,
      "isManga": true,
      "version": "0.2.1",
      "login": false,
      "forYou": true,
      "pkgPath": "manga/fr/hentaiscantrad.js",
      "editableBaseUrl": true,
      "hasCloudflare": true,
      "requiresAccount": false,
      "hasDRM": false,
      "paywall": "free",
      "notes": "Scans manga FR — Madara/WordPress (NSFW)"
  }];
  const BASE_URL = "https://hentai-scantrad.org";
  class DefaultExtension extends MProvider {
      constructor(){super();}
      get baseUrl() { return new SharedPreferences().get("base_url") || BASE_URL; }

      getSourcePreferences() {
        return [{
            key: "base_url",
            editTextPreference: {
                title: "URL du site",
                summary: "Adresse du site Hentai Scantrad. Modifiez-la uniquement si le domaine a changé (migration ou miroir).",
                value: BASE_URL,
                dialogTitle: "URL du site",
                dialogMessage: "URL actuelle : " + BASE_URL
            }
        }];
      }
      _hdrs(ref){return{"User-Agent":"Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/124 Safari/537.36","Referer":ref||this.baseUrl+"/","Accept-Language":"fr-FR,fr;q=0.9"};}
      _dec(s){return String(s||"").replace(/&amp;/g,"&").replace(/&quot;/g,'"').replace(/&#039;/g,"'").replace(/&rsquo;/g,"'").replace(/&eacute;/g,"é").replace(/&agrave;/g,"à").replace(/&ccedil;/g,"ç").replace(/&nbsp;/g," ").replace(/<[^>]+>/g,"").replace(/\s+/g," ").trim();}
      _abs(u){u=String(u||"").trim();if(!u)return "";if(/^https?:\/\//i.test(u))return u;if(u.startsWith("//"))return "https:"+u;return this.baseUrl+(u.startsWith("/")?u:"/"+u);}
      // Madara cards keep the real cover in `data-src`; `src` only holds the
      // `dflazy.jpg` placeholder. Prefer data-src and never emit a placeholder.
      _cover(attrs){
          const bad=/(?:dflazy|placeholder|spacer|blank|transparent|pixel)/i;
          const pick=(re)=>{const m=attrs.match(re);return m?m[1].trim():"";};
          const ds=pick(/\bdata-src="([^"]+)"/i); if(ds&&!bad.test(ds))return this._abs(ds);
          const s=pick(/\bsrc="([^"]+)"/i); if(s&&!bad.test(s))return this._abs(s);
          const ss=pick(/\bdata-srcset="([^"]+)"/i)||pick(/\bsrcset="([^"]+)"/i);
          if(ss){for(const p of ss.split(",").map((x)=>x.trim().split(/\s+/)[0]).filter(Boolean)){if(!bad.test(p))return this._abs(p);}}
          return "";
      }
      _parse(html){
          const list=[],seen={};
          const re=/<a[^>]+href="([^"]+)"[^>]*>[\s\S]{0,400}?<img\b([^>]*)>/gi;let m;
          while((m=re.exec(html))!==null){
              const url=this._abs(m[1]);
              // Manga pages end with "/", so a trailing-slash test would drop
              // every result; scope on the "/manga/" path segment instead.
              if(!/\/manga\//.test(url)||url in seen||url.length<25)continue;
              const imageUrl=this._cover(m[2]);
              if(!imageUrl)continue;
              seen[url]=1;
              list.push({link:url,imageUrl,name:this._dec((m[2].match(/(?:alt|title)="([^"]{2,120})"/i)||[])[1]||"")});
          }
          return list;
      }
      async getPopular(page){const r=await new Client().get(this.baseUrl+"/manga/?m_orderby=views&page="+page,this._hdrs());return{list:this._parse(r.body),hasNextPage:page<30};}
      async getLatestUpdates(page){const r=await new Client().get(this.baseUrl+"/manga/?m_orderby=latest&page="+page,this._hdrs());return{list:this._parse(r.body),hasNextPage:page<10};}
      async search(query,page,f){const r=await new Client().get(this.baseUrl+"/?s="+encodeURIComponent(query)+"&post_type=wp-manga",this._hdrs());return{list:this._parse(r.body),hasNextPage:false};}
      async getDetail(url){
          const r=await new Client().get(url,this._hdrs(url));const html=r.body;
          const ogt=(html.match(/<meta[^>]+property="og:title"[^>]+content="([^"]+)"/i)||[])[1];
          const h1=(html.match(/<h1[^>]*>([\s\S]{1,200}?)<\/h1>/i)||[])[1];
          const name=this._dec(ogt||h1||"").replace(/\s*[-–|]\s*(?:Hentai|Manga)[- ]?Scantrad\s*$/i,"").trim();
          const imgM=html.match(/<meta[^>]+property="og:image"[^>]+content="([^"]+)"/i);
          const descM=html.match(/class="summary__content[^"]*"[^>]*>([\s\S]*?)<\/div>/i)||html.match(/<meta[^>]+name="description"[^>]+content="([^"]+)"/i);
          const chapters=[],seen={};
          // Madara renders the chapter list lazily: the detail HTML only holds
          // an empty `#manga-chapters-holder`, filled from `ajax/chapters/`.
          try{
              const aj=await new Client().post(url.replace(/\/+$/,"")+"/ajax/chapters/",this._hdrs(url),"");
              const aRe=/<a[^>]+href="([^"]+)"[^>]*>([\s\S]{1,150}?)<\/a>/gi;let am;
              while((am=aRe.exec(aj.body))!==null){const cu=this._abs(am[1]);if(!/\/chapitre-|\/chapter-/.test(cu)||cu in seen||cu===url)continue;seen[cu]=1;chapters.push({name:this._dec(am[2]),url:cu});}
          }catch(_){}
          if(chapters.length===0){const chRe=/<a[^>]+href="([^"]+(?:chapitre|chapter|chap)[^"]*)"[^>]*>([\s\S]{1,150}?)<\/a>/gi;let m;
              while((m=chRe.exec(html))!==null){const cu=this._abs(m[1]);if(cu in seen||cu===url)continue;seen[cu]=1;chapters.push({name:this._dec(m[2]),url:cu});}}
          return{name,imageUrl:imgM?imgM[1].trim():"",description:descM?this._dec(descM[1]):"",chapters:chapters.length>0?chapters:[{name:name||"Lire",url}]};
      }
      async getPageList(url){
          const r=await new Client().get(url,this._hdrs(url));const html=r.body;
          const pages=[],seen=new Set();
          const tagRe=/<img[^>]+wp-manga-chapter-img[^>]*>/gi;let m;
          while((m=tagRe.exec(html))!==null){const ds=(m[0].match(/data-src="([^"]*)"/i)||[])[1];const u=ds?ds.replace(/\s+/g,"").trim():"";if(u&&!seen.has(u)){seen.add(u);pages.push({url:u,headers:this._hdrs(url)});}}
          if(pages.length===0){const imgRe=/<img[^>]+(?:data-src|src)="([^"]+\.(?:jpg|jpeg|png|webp)[^"]*)"/gi;
              while((m=imgRe.exec(html))!==null){const u=m[1].trim();if(!seen.has(u)&&!/(?:logo|banner|avatar|gravatar|dflazy)/i.test(u)){seen.add(u);pages.push({url:u,headers:this._hdrs(url)});}}}
          return pages;
      }
      getForYou(page){return this.getPopular(page);}
      // The home layout asks for shelves by id ("hero", "featured", "updates"…).
      // Madara only exposes two real feeds, so route every id to one of them
      // instead of throwing "getCustomList not implemented".
      getCustomList(id,page){
          const s=String(id||"").toLowerCase();
          if(/latest|update|recent|nouveau|new|sortie/.test(s))return this.getLatestUpdates(page||1);
          return this.getPopular(page||1);
      }
      getComments(url,page){return Promise.resolve([]);}
  }
