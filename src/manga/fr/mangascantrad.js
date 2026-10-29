const watchtowerSources = [{
      "name": "Manga Scantrad",
      "langs": ["fr"],
      "ids": { "fr": 858292035 },
      "baseUrl": "https://manga-scantrad.io",
      "apiUrl": "https://manga-scantrad.io",
      "iconUrl": "https://manga-scantrad.io/favicon.ico",
      "typeSource": "single",
      "itemType": 0,
      "isManga": true,
      "version": "0.2.0",
      "login": false,
      "forYou": true,
      "pkgPath": "manga/fr/mangascantrad.js",
      "editableBaseUrl": true,
      "hasCloudflare": true,
      "requiresAccount": false,
      "hasDRM": false,
      "paywall": "free",
      "notes": "Scans manga FR — Madara/WordPress"
  }];
  const BASE_URL = "https://manga-scantrad.io";
  // Genres actually exposed by the site's /manga-genre/ taxonomy.
  const GENRES = [
      ["Action", "action"], ["Arts Martiaux", "arts-martiaux"], ["Drame", "drame"],
      ["Fantaisie", "fantaisie"], ["Fantastique", "fantastique"], ["Isekai", "isekai"],
      ["Josei", "josei"], ["Psychologique", "psychologique"], ["Romance", "romance"],
      ["Seinen", "seinen"], ["Shojo", "shojo"], ["Shonen", "shonen"],
  ];
  class DefaultExtension extends MProvider {
      constructor(){super();}
      get baseUrl() { return new SharedPreferences().get("base_url") || BASE_URL; }

      getSourcePreferences() {
        return [{
            key: "base_url",
            editTextPreference: {
                title: "URL du site",
                summary: "Adresse du site Manga Scantrad. Modifiez-la uniquement si le domaine a changé (migration ou miroir).",
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
      // Browse / genre / search pages all render Madara cards as
      // `div.page-item-detail`, each holding a `div.post-title a` and a cover.
      _parseCards(html){
          const list=[],seen={};
          const re=/<div[^>]+class="[^"]*page-item-detail[^"]*"[\s\S]{0,2000}?<\/div>\s*<\/div>/gi;
          const cardRe=/<div[^>]+class="[^"]*page-item-detail[^"]*"/gi;let m;
          const parts=html.split(cardRe);
          for(let i=1;i<parts.length;i++){
              const chunk=parts[i];
              const href=(chunk.match(/href="([^"]+)"/i)||[])[1]||"";
              const url=this._abs(href);
              if(!/\/manga\//.test(url)||url in seen||url.length<25)continue;
              const imgTag=(chunk.match(/<img\b[^>]*>/i)||[])[0]||"";
              const imageUrl=this._cover(imgTag);
              if(!imageUrl)continue;
              const titleTag=(chunk.match(/class="post-title"[^>]*>[\s\S]{0,120}?<a[^>]*>([\s\S]{1,120}?)<\/a>/i)||[])[1]||"";
              const name=this._dec(titleTag)||this._dec((imgTag.match(/(?:alt|title)="([^"]{2,120})"/i)||[])[1]||"");
              seen[url]=1;
              list.push({link:url,imageUrl,name});
          }
          return list;
      }
      // Search results use a different card: `div.c-tabs-item__content`.
      _parseSearch(html){
          const list=[],seen={};
          const cardRe=/<div[^>]+class="[^"]*c-tabs-item__content[^"]*"/gi;
          const parts=html.split(cardRe);
          for(let i=1;i<parts.length;i++){
              const chunk=parts[i];
              const href=(chunk.match(/href="([^"]+)"/i)||[])[1]||"";
              const url=this._abs(href);
              if(!/\/manga\//.test(url)||url in seen||url.length<25)continue;
              const imgTag=(chunk.match(/<img\b[^>]*>/i)||[])[0]||"";
              const imageUrl=this._cover(imgTag);
              const titleTag=(chunk.match(/class="post-title"[^>]*>[\s\S]{0,120}?<a[^>]*>([\s\S]{1,120}?)<\/a>/i)||[])[1]||"";
              const name=this._dec(titleTag)||this._dec((imgTag.match(/(?:alt|title)="([^"]{2,120})"/i)||[])[1]||"");
              if(!name)continue;
              seen[url]=1;
              list.push({link:url,imageUrl,name});
          }
          return list;
      }
      _browseUrl(page,order){const seg=page>1?`/page/${page}`:"";return `${this.baseUrl}/manga${seg}?m_orderby=${order}`;}
      _hasNext(html){return /<a[^>]+class="[^"]*next page-numbers/i.test(html)||/aria-label=['"]Next['"]/i.test(html);}
      async getPopular(page){const r=await new Client().get(this._browseUrl(page,"views"),this._hdrs());return{list:this._parseCards(r.body),hasNextPage:this._hasNext(r.body)||page<20};}
      async getLatestUpdates(page){const r=await new Client().get(this._browseUrl(page,"latest"),this._hdrs());return{list:this._parseCards(r.body),hasNextPage:this._hasNext(r.body)||page<10};}
      async search(query,page,filters){
          let sortBy="latest",status="";const genres=[];
          if(filters&&filters.length){for(let i=0;i<filters.length;i++){const f=filters[i];if(!f)continue;
              if(f.type_name==="SelectFilter"&&f.name==="Trier par"){const v=Array.from(f.values||[]);sortBy=(v[f.state]||{}).value||"latest";}
              else if(f.type_name==="SelectFilter"&&f.name==="Statut"){const v=Array.from(f.values||[]);status=(v[f.state]||{}).value||"";}
              else if(f.type_name==="GroupFilter"&&f.name==="Genre"){const it=Array.from(f.state||[]);for(let j=0;j<it.length;j++){if(it[j]&&it[j].state===true)genres.push(it[j].value);}}
          }}
          const q=String(query||"").trim();
          // The site serves keyword search and genre browsing on separate
          // routes; a genre pick wins so the "chips" filter stays useful even
          // with an empty query.
          let url;
          if(genres.length){url=`${this.baseUrl}/manga-genre/${genres[0]}/`+(page>1?`page/${page}`:"");url+=`?m_orderby=${sortBy}`;}
          else{url=`${this.baseUrl}/?s=${encodeURIComponent(q)}&post_type=wp-manga`;if(page>1)url+=`&paged=${page}`;}
          const r=await new Client().get(url,this._hdrs());
          let list=this._parseSearch(r.body);
          if(list.length===0)list=this._parseCards(r.body);
          return{list,hasNextPage:this._hasNext(r.body)};
      }
      getFilterList(){return[
          {type_name:"SelectFilter",name:"Trier par",state:0,values:[["Derniers ajouts","latest"],["Popularité","views"],["Tendance","trending"],["Note","rating"],["A–Z","alphabet"],["Nouveautés","new-manga"]].map((x)=>({type_name:"SelectOption",name:x[0],value:x[1]}))},
          {type_name:"SelectFilter",name:"Statut",state:0,values:[["Tous",""],["En cours","ongoing"],["Terminé","end"],["En pause","hiatus"]].map((x)=>({type_name:"SelectOption",name:x[0],value:x[1]}))},
          {type_name:"GroupFilter",name:"Genre",state:GENRES.map((x)=>({type_name:"CheckBox",name:x[0],value:x[1],state:false}))},
      ];}
      // Home shelves ask for a list id: either a genre (`category_<slug>`), a
      // sort (`popular`, `latest`…) or the site's own genre slug.
      async getCustomList(listId,page){
          const id=String(listId||"");
          // The spotlight section is a single hero card; returning the whole
          // shelf here would start a burst of image requests on the home screen.
          if(id==="spotlight"){
              const r=await new Client().get(this._browseUrl(1,"latest"),this._hdrs());
              return{list:this._parseCards(r.body).slice(0,1),hasNextPage:false};
          }
          const cat=id.startsWith("category_")?id.slice(9):(/^[a-z0-9-]+$/.test(id)&&GENRES.some((g)=>g[1]===id)?id:"");
          if(cat){
              const seg=page>1?`page/${page}`:"";
              const r=await new Client().get(`${this.baseUrl}/manga-genre/${cat}/${seg}?m_orderby=views`,this._hdrs());
              return{list:this._parseCards(r.body),hasNextPage:this._hasNext(r.body)||page<10};
          }
          const orderMap={popular:"views",trending:"trending",latest:"latest",top_rated:"rating",new:"new-manga",completed:"latest"};
          const r=await new Client().get(this._browseUrl(page||1,orderMap[id]||"latest"),this._hdrs());
          return{list:this._parseCards(r.body),hasNextPage:this._hasNext(r.body)||page<20};
      }
      getForYou(page){return this.getPopular(page);}
      async getDetail(url){
          const r=await new Client().get(url,this._hdrs(url));const html=r.body;
          const ogt=(html.match(/<meta[^>]+property="og:title"[^>]+content="([^"]+)"/i)||[])[1];
          const h1=(html.match(/<h1[^>]*>([\s\S]{1,200}?)<\/h1>/i)||[])[1];
          const name=this._dec(ogt||h1||"").replace(/\s*[-–|]\s*Manga\s*Scantrad\s*$/i,"").trim();
          const imgM=html.match(/<meta[^>]+property="og:image"[^>]+content="([^"]+)"/i);
          const descM=html.match(/class="summary__content[^"]*"[^>]*>([\s\S]*?)<\/div>/i)||html.match(/<meta[^>]+name="description"[^>]+content="([^"]+)"/i);
          const chapters=[],seen={};
          // The chapter list is rendered lazily: the detail HTML only holds an
          // empty `#manga-chapters-holder`, filled from `ajax/chapters/`.
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
      getComments(url,page){return Promise.resolve([]);}
  }
