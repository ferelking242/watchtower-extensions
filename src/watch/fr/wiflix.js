const watchtowerSources = [{
      "name": "Wiflix",
      "langs": ["fr"],
      "ids": { "fr": 562309147 },
      "baseUrl": "https://www.wiflix.bond",
      "apiUrl": "https://www.wiflix.bond",
      "iconUrl": "https://www.wiflix.bond/favicon.ico",
      "typeSource": "single",
      "itemType": 1,
      "version": "0.1.2",
      "pkgPath": "watch/fr/wiflix.js",
      "editableBaseUrl": true,
      "hasCloudflare": true,
      "videoQualities": ["AUTO", "VF", "VOSTFR", "1080p", "720p"],
      "subCategories": ["film", "serie"],
      "requiresAccount": false,
      "hasDRM": false,
      "paywall": "free",
      "notes": "Films et séries VF/VOSTFR"
  }];
  const BASE_URL = "https://www.wiflix.bond";
  class DefaultExtension extends MProvider {
      constructor() { super(); }
      get baseUrl() { const p = this.source.prefs?.find(x=>x.key==="base_url"); return (p&&p.value)?p.value.replace(/\/$/,""):BASE_URL; }
      _hdrs(ref) { return {"User-Agent":"Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36","Referer":ref||this.baseUrl+"/","Accept-Language":"fr-FR,fr;q=0.9"}; }
      _decode(s) { return String(s||"").replace(/&amp;/g,"&").replace(/&quot;/g,'"').replace(/&#039;/g,"'").replace(/&lt;/g,"<").replace(/&gt;/g,">"); }
      _parse(html) {
          const list=[]; const seen={};
          // wiflix.bond uses: <a class="mi2-in-link" href="URL"> ... <img class="lazyload" data-src="IMG" alt="TITLE">
          const re=/<a[^>]+class="mi2-in-link"[^>]+href="([^"]+)"[^>]*>[\s\S]{0,400}?<img[^>]+data-src="([^"]+)"[^>]+alt="([^"]{2,120})"/gi;
          let m;
          while((m=re.exec(html))!==null){
              const url=m[1].startsWith("http")?m[1]:this.baseUrl+m[1];
              if(url in seen)continue;seen[url]=1;
              const imgUrl=m[2].startsWith("http")?m[2]:this.baseUrl+m[2];
              list.push({link:url,imageUrl:imgUrl,name:this._decode(m[3].trim())});
          }
          return list;
      }
      async getPopular(page) { const r=await new Client().get(this.baseUrl+"/films-streaming/page/"+page+"/",this._hdrs()); return {list:this._parse(r.body),hasNextPage:page<20}; }
      async getLatestUpdates(page) { const r=await new Client().get(this.baseUrl+"/",this._hdrs()); return {list:this._parse(r.body),hasNextPage:false}; }
      async search(query,page,f) { const r=await new Client().get(this.baseUrl+"/?s="+encodeURIComponent(query),this._hdrs()); return {list:this._parse(r.body),hasNextPage:false}; }
      async getDetail(url) {
          const r=await new Client().get(url,this._hdrs(url)); const html=r.body;
          const nameM=html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/); const name=nameM?nameM[1].replace(/<[^>]+>/g,"").trim():"";
          const imgM=html.match(/<meta[^>]+property="og:image"[^>]+content="([^"]+)"/i);
          const descM=html.match(/<meta[^>]+name="description"[^>]+content="([^"]+)"/i);
          const eps=[]; const eSeen={};
          const eRe=/<a[^>]+href="([^"]+(?:episode|saison|film|film-)[^"]*)"[^>]*>([\s\S]{1,80}?)<\/a>/gi; let em;
          while((em=eRe.exec(html))!==null){const eu=em[1].startsWith("http")?em[1]:this.baseUrl+em[1];if(eu in eSeen)continue;eSeen[eu]=1;eps.push({name:em[2].replace(/<[^>]+>/g,"").trim(),url:eu});}
          if(eps.length===0)eps.push({name,url});
          return {name,imageUrl:imgM?imgM[1]:"",description:descM?descM[1]:"",chapters:eps};
      }
      async getVideoList(url) {
          const r=await new Client().get(url,this._hdrs(url)); const html=r.body; const videos=[];
          const ifRe=/<iframe[^>]+src="([^"]+)"/gi; let m;
          while((m=ifRe.exec(html))!==null)if(!m[1].includes("javascript"))videos.push({url:m[1],quality:"AUTO",headers:this._hdrs(url)});
          const vRe=/(?:file|src)\s*:\s*["']([^"']+\.(?:m3u8|mp4)[^"']*)["']/gi;
          while((m=vRe.exec(html))!==null)videos.push({url:m[1].startsWith("http")?m[1]:this.baseUrl+m[1],quality:"AUTO",headers:this._hdrs(url)});
          if(videos.length===0)videos.push({url,quality:"AUTO",headers:this._hdrs()});
          return videos;
      }
      getForYou(page){return this.getPopular(page);}
      getComments(url,page){return Promise.resolve([]);}
  }