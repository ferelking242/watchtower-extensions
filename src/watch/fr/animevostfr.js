const watchtowerSources = [{
      "name": "AnimeVostFR",
      "langs": ["fr"],
      "ids": { "fr": 847392015 },
      "baseUrl": "https://animevostfr.tv",
      "apiUrl": "https://animevostfr.tv",
      "iconUrl": "https://animevostfr.tv/favicon.ico",
      "typeSource": "single",
      "itemType": 2,
      "version": "0.2.2",
      "pkgPath": "watch/fr/animevostfr.js",
      "editableBaseUrl": true,
      "hasCloudflare": false,
      "videoQualities": ["AUTO", "VOSTFR", "VF"],
      "subCategories": ["anime"],
      "requiresAccount": false,
      "hasDRM": false,
      "paywall": "free"
  }];
  const BASE_URL = "https://animevostfr.tv";
  class DefaultExtension extends MProvider {
      constructor(){super();}
      get baseUrl() { return new SharedPreferences().get("base_url") || BASE_URL; }
      _hdrs(ref){return{"User-Agent":"Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36","Referer":ref||this.baseUrl+"/","Accept-Language":"fr-FR,fr;q=0.9"};}
      _decode(s){return String(s||"").replace(/&amp;/g,"&").replace(/&quot;/g,'"').replace(/&#039;/g,"'");}
      _parse(html){
          const list=[],seen={};
          const re=/<a[^>]+href="([^"]+)"[^>]*>[\s\S]{0,400}?<img[^>]+(?:src|data-src)="([^"]+)"[^>]+(?:alt|title)="([^"]{2,100})"/gi;
          let m;
          while((m=re.exec(html))!==null){
              const url=m[1].startsWith("http")?m[1]:this.baseUrl+(m[1].startsWith("/")?m[1]:"/"+m[1]);
              if(url in seen||url===this.baseUrl||url.length<20)continue;seen[url]=1;
              list.push({link:url,imageUrl:m[2],name:this._decode(m[3].trim())});
          }
          return list;
      }
      async getPopular(page){const r=await new Client().get(this.baseUrl+"/anime-vostfr/page/"+page+"/",this._hdrs());return{list:this._parse(r.body),hasNextPage:page<20};}
      async getLatestUpdates(page){const r=await new Client().get(this.baseUrl+"/",this._hdrs());return{list:this._parse(r.body),hasNextPage:false};}
      async search(query,page,f){const r=await new Client().get(this.baseUrl+"/?s="+encodeURIComponent(query),this._hdrs());return{list:this._parse(r.body),hasNextPage:false};}
      async getDetail(url){
          const r=await new Client().get(url,this._hdrs(url));const html=r.body;
          const nameM=html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/);const name=nameM?nameM[1].replace(/<[^>]+>/g,"").trim():"";
          const imgM=html.match(/<meta[^>]+property="og:image"[^>]+content="([^"]+)"/i);
          const descM=html.match(/<meta[^>]+name="description"[^>]+content="([^"]+)"/i);
          const eps=[],eSeen={};
          const eRe=/<a[^>]+href="([^"]+(?:episode|ep-|vostfr|vf)[^"]*)"[^>]*>([\s\S]{1,80}?)<\/a>/gi;let em;
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
  
    getSourcePreferences() {
        return [
            {
                key: "base_url",
                editTextPreference: {
                    title: "URL du site",
                    summary: "Adresse du site. Changez si le domaine est migré.",
                    value: "https://animevostfr.tv",
                    dialogTitle: "URL du site",
                    dialogMessage: "URL actuelle : https://animevostfr.tv"
                }
            },
            {
                key: "default_quality",
                listPreference: {
                    title: "Qualité vidéo par défaut",
                    summary: "La qualité sélectionnée est prioritaire. Si indisponible, la plus proche est choisie automatiquement.",
                    valueIndex: 0,
                    entries: ["Auto (recommandé)","1080p — Full HD","720p — HD","480p — SD","360p — Faible"],
                    entryValues: ["AUTO","1080","720","480","360"]
                }
            },
            {
                key: "quality_fallback",
                listPreference: {
                    title: "Si la qualité n'est pas disponible",
                    summary: "Choisir la qualité la plus proche si celle demandée n'existe pas",
                    valueIndex: 1,
                    entries: ["Prendre la qualité supérieure", "Prendre la qualité inférieure (recommandé)"],
                    entryValues: ["higher", "lower"]
                }
            },
            {
                key: "sub_or_dub",
                listPreference: {
                    title: "Préférence audio",
                    summary: "Choisir entre version sous-titrée (Sub) ou doublée (Dub)",
                    valueIndex: 0,
                    entries: ["Sous-titré (Sub) — recommandé", "Doublé (Dub)", "Les deux (Sub puis Dub)"],
                    entryValues: ["sub", "dub", "both"]
                }
            }
        ];
    }
}