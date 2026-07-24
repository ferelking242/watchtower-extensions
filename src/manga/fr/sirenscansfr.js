const watchtowerSources = [{
        "name": "Siren Scans FR",
        "langs": ["fr"],
        "ids": { "fr": 622095668 },
        "baseUrl": "https://sirenscans.fr",
        "apiUrl": "https://sirenscans.fr",
        "iconUrl": "https://sirenscans.fr/favicon.ico",
        "typeSource": "single",
        "itemType": 2,
        "isManga": true,
        "version": "0.1.0",
        "pkgPath": "manga/fr/sirenscansfr.js",
        "editableBaseUrl": true,
        "hasCloudflare": true,
        "requiresAccount": false,
        "hasDRM": false,
        "paywall": "free",
        "notes": "Scans manga FR — Keyoapp"
    }];
    const BASE_URL = "https://sirenscans.fr";
    class DefaultExtension extends MProvider {
        constructor(){super();}
        get baseUrl(){const p=this.source.prefs?.find(x=>x.key==="base_url");return(p&&p.value)?p.value.replace(/\/$/,""):BASE_URL;}
        _hdrs(ref){return{"User-Agent":"Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/124 Safari/537.36","Referer":ref||this.baseUrl+"/","Accept":"application/json"};}
        _map(c){return{link:this.baseUrl+"/series/"+(c.slug||c.id),imageUrl:c.cover||c.thumbnail||"",name:c.title||c.name||""};}
        async getPopular(page){const r=await new Client().get(this.baseUrl+"/api/query?page="+page+"&perPage=18&sort=popularity",this._hdrs());let list=[];try{const j=JSON.parse(r.body);list=(j.data||j.series||[]).map(c=>this._map(c));}catch(_){}return{list,hasNextPage:list.length>0};}
        async getLatestUpdates(page){const r=await new Client().get(this.baseUrl+"/api/query?page="+page+"&perPage=18&sort=latest",this._hdrs());let list=[];try{const j=JSON.parse(r.body);list=(j.data||j.series||[]).map(c=>this._map(c));}catch(_){}return{list,hasNextPage:list.length>0};}
        async search(query,page,f){const r=await new Client().get(this.baseUrl+"/api/query?page="+page+"&perPage=18&search="+encodeURIComponent(query),this._hdrs());let list=[];try{const j=JSON.parse(r.body);list=(j.data||j.series||[]).map(c=>this._map(c));}catch(_){}return{list,hasNextPage:false};}
        async getDetail(url){
            const slug=url.split("/series/")[1]||url.split("/").pop();
            const r=await new Client().get(this.baseUrl+"/api/series/"+slug,this._hdrs(url));
            let s={};try{s=JSON.parse(r.body).data||JSON.parse(r.body)||{};}catch(_){}
            const chapters=(s.chapters||[]).map(ch=>({name:ch.title||("Chapitre "+ch.number),url:this.baseUrl+"/series/"+slug+"/"+(ch.slug||ch.number)}));
            return{name:s.title||s.name||"",imageUrl:s.cover||s.thumbnail||"",description:s.description||s.synopsis||"",chapters:chapters.length>0?chapters:[{name:"Lire",url}]};
        }
        async getPageList(url){
            const parts=url.split("/series/")[1].split("/");const slug=parts[0],chap=parts[1];
            const r=await new Client().get(this.baseUrl+"/api/series/"+slug+"/"+chap,this._hdrs(url));
            let data={};try{data=JSON.parse(r.body);}catch(_){}
            const pages=data.pages||data.images||(data.data&&data.data.pages)||[];
            return pages.map(p=>({url:typeof p==="string"?p:(p.url||p.src||""),headers:this._hdrs(url)}));
        }
        getForYou(page){return this.getPopular(page);}
        getComments(url,page){return Promise.resolve([]);}
    }