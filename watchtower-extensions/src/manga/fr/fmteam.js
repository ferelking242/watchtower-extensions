const watchtowerSources = [{
        "name": "FMTeam",
        "langs": ["fr"],
        "ids": { "fr": 906401253 },
        "baseUrl": "https://fmteam.fr",
        "apiUrl": "https://fmteam.fr",
        "iconUrl": "https://fmteam.fr/favicon.ico",
        "typeSource": "single",
        "itemType": 2,
        "isManga": true,
        "version": "0.1.0",
        "pkgPath": "manga/fr/fmteam.js",
        "editableBaseUrl": true,
        "hasCloudflare": false,
        "requiresAccount": false,
        "hasDRM": false,
        "paywall": "free",
        "notes": "Scans manga FR — PizzaReader (API JSON)"
    }];
    const BASE_URL = "https://fmteam.fr";
    class DefaultExtension extends MProvider {
        constructor(){super();}
        get baseUrl(){const p=this.source.prefs?.find(x=>x.key==="base_url");return(p&&p.value)?p.value.replace(/\/$/,""):BASE_URL;}
        _hdrs(ref){return{"User-Agent":"Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/124 Safari/537.36","Referer":ref||this.baseUrl+"/","Accept":"application/json"};}
        _map(c){return{link:this.baseUrl+"/comics/"+c.slug,imageUrl:c.thumbnail||c.thumbnail_small||"",name:c.title||""};}
        async getPopular(page){const r=await new Client().get(this.baseUrl+"/api/comics?page="+page+"&order=views",this._hdrs());let list=[];try{list=(JSON.parse(r.body).comics||[]).map(c=>this._map(c));}catch(_){}return{list,hasNextPage:list.length>0};}
        async getLatestUpdates(page){const r=await new Client().get(this.baseUrl+"/api/comics?page="+page+"&order=updated_at",this._hdrs());let list=[];try{list=(JSON.parse(r.body).comics||[]).map(c=>this._map(c));}catch(_){}return{list,hasNextPage:list.length>0};}
        async search(query,page,f){const r=await new Client().get(this.baseUrl+"/api/comics?page="+page+"&search="+encodeURIComponent(query),this._hdrs());let list=[];try{list=(JSON.parse(r.body).comics||[]).map(c=>this._map(c));}catch(_){}return{list,hasNextPage:false};}
        async getDetail(url){
            const slug=url.split("/comics/")[1]||url.split("/").pop();
            const r=await new Client().get(this.baseUrl+"/api/comics/"+slug,this._hdrs(url));
            let comic={};try{comic=JSON.parse(r.body).comic||{};}catch(_){}
            const chapters=(comic.chapters||[]).map(ch=>({name:ch.full_title||ch.full_chapter||("Chapitre "+ch.chapter),url:this.baseUrl+ch.url}));
            return{name:comic.title||"",imageUrl:comic.thumbnail||"",description:(comic.description||"").replace(/<[^>]+>/g,""),chapters:chapters.length>0?chapters:[{name:"Lire",url}]};
        }
        async getPageList(url){
            const path=url.replace(this.baseUrl,"");
            const r=await new Client().get(this.baseUrl+"/api/read"+path.replace("/read",""),this._hdrs(url));
            let data={};try{data=JSON.parse(r.body);}catch(_){}
            const pages=(data.chapter&&data.chapter.pages)||[];
            return pages.map(u=>({url:u,headers:this._hdrs(url)}));
        }
        getForYou(page){return this.getPopular(page);}
        getComments(url,page){return Promise.resolve([]);}
    }