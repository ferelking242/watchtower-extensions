const watchtowerSources = [{
      "name": "Cpasbien",
      "langs": ["fr"],
      "ids": { "fr": 159382047 },
      "baseUrl": "https://cpasbien.gl",
      "apiUrl": "https://cpasbien.gl",
      "iconUrl": "https://cpasbien.gl/favicon.ico",
      "typeSource": "single",
      "itemType": 1,
      "version": "0.1.3",
      "pkgPath": "watch/fr/cpasbien.js",
      "editableBaseUrl": true,
      "hasCloudflare": false,
      "videoQualities": ["AUTO","VF","VOSTFR"],
      "subCategories": ["film","serie"],
      "requiresAccount": false,
      "hasDRM": false,
      "paywall": "free",
      "notes": "Cpasbien — domaine cpasbien.gl hors ligne."
  }];
  const BASE_URL = "https://cpasbien.gl";
  class DefaultExtension extends MProvider {
      constructor(){super();}
      get baseUrl(){const p=this.source.prefs?.find(x=>x.key==="base_url");return(p&&p.value)?p.value.replace(/\/$/,""):BASE_URL;}
      _hdrs(ref){return{"User-Agent":"Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36","Referer":ref||this.baseUrl+"/","Accept-Language":"fr-FR,fr;q=0.9"};}
      _decode(s){return String(s||"").replace(/&amp;/g,"&").replace(/&quot;/g,'"').replace(/&#039;/g,"'");}
      _parse(html){
          const list=[],seen={};
          const re=/<a[^>]+href="([^"]+)"[^>]*>[\s\S]{0,400}?<img[^>]+(?:src|data-src)="([^"]+)"[^>]+(?:alt|title)="([^"]{2,120})"/gi;
          let m;
          while((m=re.exec(html))!==null){
              const url=m[1].startsWith("http")?m[1]:this.baseUrl+(m[1].startsWith("/")?m[1]:"/"+m[1]);
              if(url in seen||url===this.baseUrl||url.endsWith("/")||url.length<25)continue;
              seen[url]=1;list.push({link:url,imageUrl:m[2],name:this._decode(m[3].trim())});
          }
          return list;
      }
      async getPopular(page){const r=await new Client().get(this.baseUrl+"/films-bluray-1080p/page/{page}/".replace("{page}",page),this._hdrs());return{list:this._parse(r.body),hasNextPage:page<20};}
      async getLatestUpdates(page){const r=await new Client().get(this.baseUrl+"/",this._hdrs());return{list:this._parse(r.body),hasNextPage:false};}
      async search(query,page,f){const r=await new Client().get(this.baseUrl+"/search-torrent/"+encodeURIComponent(query),this._hdrs());return{list:this._parse(r.body),hasNextPage:false};}
      async getDetail(url){
          const r=await new Client().get(url,this._hdrs(url));const html=r.body;
          const nameM=html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/);const name=nameM?nameM[1].replace(/<[^>]+>/g,"").trim():"";
          const imgM=html.match(/<meta[^>]+property="og:image"[^>]+content="([^"]+)"/i);
          const descM=html.match(/<meta[^>]+name="description"[^>]+content="([^"]+)"/i);
          const eps=[],eSeen={};
          const eRe=/<a[^>]+href="([^"]+(?:episode|saison|ep-|s[0-9]e[0-9])[^"]*)"[^>]*>([\s\S]{1,80}?)<\/a>/gi;let em;
          while((em=eRe.exec(html))!==null){const eu=em[1].startsWith("http")?em[1]:this.baseUrl+em[1];if(eu in eSeen)continue;eSeen[eu]=1;eps.push({name:em[2].replace(/<[^>]+>/g,"").trim(),url:eu});}
          if(eps.length===0)eps.push({name,url});
          return{name,imageUrl:imgM?imgM[1]:"",description:descM?descM[1]:"",chapters:eps};
      }
      async getVideoList(url){
          const r=await new Client().get(url,this._hdrs(url));const html=r.body;const videos=[];
          const ifRe=/<iframe[^>]+src="([^"]+)"/gi;let m;
          while((m=ifRe.exec(html))!==null)if(!m[1].includes("javascript"))videos.push({url:m[1],quality:"AUTO",headers:this._hdrs(url)});
          const vRe=/["'](?:file|src)["']\s*:\s*["']([^"']+\.(?:m3u8|mp4)[^"']*)["']/gi;
          while((m=vRe.exec(html))!==null)videos.push({url:m[1].startsWith("http")?m[1]:this.baseUrl+m[1],quality:"AUTO",headers:this._hdrs(url)});
          if(videos.length===0)videos.push({url,quality:"AUTO",headers:this._hdrs()});
          return videos;
      }
      getForYou(page){return this.getPopular(page);}
      getComments(url,page){return Promise.resolve([]);}
  }