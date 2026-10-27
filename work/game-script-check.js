
    const cv = document.getElementById('c'), ctx = cv.getContext('2d'), $ = id => document.getElementById(id);
    const TAU = Math.PI * 2, wrap = a => ((a + Math.PI) % TAU + TAU) % TAU - Math.PI, rnd = (a, b) => a + Math.random() * (b - a), dst = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
    const mobileMQ=matchMedia('(pointer: coarse)');
    const hasTouchInput=()=>mobileMQ.matches||navigator.maxTouchPoints>0||('ontouchstart' in window);
    const lowEndDevice=(navigator.deviceMemory&&navigator.deviceMemory<=6)||(navigator.hardwareConcurrency&&navigator.hardwareConcurrency<=6);
    let mobile=hasTouchInput();
    let gameMode='survival';
    let campaignStartLevel=1;
    let campaignUnlocked=1,campaignCompleted=false,campaignResults={};let campaignLevelTime=0,campaignLevelKills=0,campaignResultShown=false;
    let growthStacks=0,cobra={phase:0,t:0,target:null,angle:0,hit:false},cameraZoom=1;
    const MAX_ACTIVE_ENEMIES=lowEndDevice?10:(mobile?14:20);
    const MAX_ACTIVE_SHOTS=lowEndDevice?70:(mobile?100:140);
    const MAX_ACTIVE_POOLS=14;
    const FX_PART_LIMIT=lowEndDevice?32:(mobile?48:72),MAX_FLOATING_TEXT=64;
    let W,H,WORLD_W=0,WORLD_H=0,sc=1,dpr=1,bgc=null,_ps='title',_ls='',camX=0,camY=0;
    function resize() { dpr = Math.min(devicePixelRatio || 1, lowEndDevice?1:(mobile?1:1.15)); const r = cv.getBoundingClientRect(); W=r.width;H=r.height;WORLD_W=W*4.2;WORLD_H=H*4.2;cv.width = W * dpr; cv.height = H * dpr; sc = Math.max(.65, Math.min(1.15, Math.min(W, H) / 640)); buildBG() }
    addEventListener('resize', resize); mobileMQ.addEventListener?.('change',()=>{mobile=hasTouchInput();resize()}); resize();
    const ptr={x:W/2,y:H/2},joy={active:false,id:null,dx:0,dy:0},moveKeys=new Set();
    const BOSS_ARCHETYPES=[
      {name:'EL REY CARMESÍ',color:'#ff625e',glow:'#ff3d36',style:'fan',intro:'Un cazador brutal que concentra ráfagas directas'},
      {name:'LA MATRIARCA DE CENIZA',color:'#ffad62',glow:'#ff873b',style:'ring',intro:'Lanza anillos de fuego que cierran rutas de escape'},
      {name:'EL COLOSO DE HUESO',color:'#d7d5c8',glow:'#c8c0a8',style:'burst',intro:'Invoca guardianes y dispara salvas desde todas direcciones'},
      {name:'EL ABISMO VIVIENTE',color:'#ad83ff',glow:'#824cff',style:'spiral',intro:'Teje espirales de energía que cubren la arena'},
      {name:'EL SOBERANO ECLIPSADO',color:'#ff6fba',glow:'#ff3f9f',style:'mixed',intro:'Combina todas sus técnicas en una última prueba'}
    ];
    const CF = {
      basic: { hp: 72, v: 128, col: '#e8e8f2', n: 20 }, spitter: { hp: 62, v: 108, col: '#7dffa0', n: 20 }, dasher: { hp: 84, v: 120, col: '#ffd36b', n: 22 },
      armor: { hp: 285, v: 76, col: '#8fb4ff', n: 24, s: 1.15 }, split: { hp: 112, v: 124, col: '#d98bff', n: 22, s: 1.1 }, mini: { hp: 32, v: 182, col: '#d98bff', n: 12, s: .6 }, boss: { hp: 1750, v: 96, col: '#ff6a5a', n: 34, s: 2 }
    };

    class Snake {
      constructor(x, y, o, k) {
        Object.assign(this, { k, sc: (o.s || 1) * sc, n: o.n, hp: o.hp, max: o.hp, v: o.v, col: o.col, bossType:o.bossType??0,bossName:o.bossName||'',bossGlow:o.bossGlow||o.col, R: [], SP: [], P: [], A: [], ph: 0, stun: 0, burn: 0, flash: 0, cd: rnd(1, 2.5), st: 0, stT: 0, tel: 0, vx: 0, vy: 0, bc: 0, h: Math.random() * TAU, dead: false, lock: 0, boss: k === 'boss', pp: 1, ang: 0 });
        for (let i = 0; i < this.n; i++)this.R[i] = i ? 2 + 6.5 * Math.pow(1 - i / this.n, .9) + (i > 1 && i < 8 ? 1.4 * Math.sin((i - 2) / 6 * Math.PI) : 0) : 12;
        for (let i = 1; i < this.n; i++)this.SP[i] = (this.R[i] + this.R[i - 1]) * .41;
        let px = x, py = y; for (let i = 0; i < this.n; i++) { if (i) { px -= Math.cos(this.h) * this.SP[i] * this.sc; py -= Math.sin(this.h) * this.SP[i] * this.sc } this.P.push({ x: px, y: py }); this.A.push(this.h) }
        const a = Math.round(this.n * .18), b = Math.round(this.n * .45);
        this.legs = [[a, -1, 0], [a, 1, 1], [b, 1, 0], [b, -1, 1]].map(([i, s, g]) => ({ i, s, g, f: null, a: null, b: null, t: 1 }));
      }
      want(l, lead) { const a = this.A[l.i], g = a + l.s * Math.PI / 2, fw = (l.i < this.n * .3 ? 10 : -4) * this.sc + lead, p = this.P[l.i]; return { x: p.x + Math.cos(a) * fw + Math.cos(g) * 27 * this.sc, y: p.y + Math.sin(a) * fw + Math.sin(g) * 27 * this.sc } }
      move(tx, ty, spd, turn, dt) {
        const hd = this.P[0], P = this.P, df = wrap(Math.atan2(ty - hd.y, tx - hd.x) - this.h);
        this.h += Math.max(-turn * dt, Math.min(turn * dt, df)); this.ph += spd * dt * .045;
        const A0 = this.h + Math.sin(this.ph * 2) * .4 * Math.min(1, spd / 150), dc = Math.pow(.02, dt); this.vx *= dc; this.vy *= dc;
        hd.x = Math.max(20, Math.min(WORLD_W-20,hd.x+ (Math.cos(A0) * spd + this.vx) * dt)); hd.y = Math.max(20, Math.min(WORLD_H-20,hd.y+ (Math.sin(A0) * spd + this.vy) * dt));
        this.A[0] = A0;
        for (let i = 1; i < this.n; i++) { const an = Math.atan2(P[i - 1].y - P[i].y, P[i - 1].x - P[i].x), df2 = Math.max(-.3, Math.min(.3, wrap(an - this.A[i - 1]))); this.A[i] = this.A[i - 1] + df2; P[i].x = P[i - 1].x - Math.cos(this.A[i]) * this.SP[i] * this.sc; P[i].y = P[i - 1].y - Math.sin(this.A[i]) * this.SP[i] * this.sc }
        this.legs.forEach(l => {
          const w = this.want(l, spd / 60 * 5); if (!l.f) { l.f = { ...w }; l.a = { ...w }; l.b = { ...w } }
          if (l.t >= 1) { const d = Math.hypot(w.x - l.f.x, w.y - l.f.y); let busy=false; for(let j=0;j<this.legs.length;j++){const o=this.legs[j];if(o!==l&&o.g!==l.g&&o.t<1){busy=true;break}} if (d > 20 * this.sc && (!busy || d > 42 * this.sc)) { l.a = { ...l.f }; l.b = { x: w.x, y: w.y }; l.t = 0 } }
          else { l.t = Math.min(1, l.t + dt / (.13 / (1 + spd / 60 * .06))); const q = l.t * l.t * (3 - 2 * l.t); l.f.x = l.a.x + (l.b.x - l.a.x) * q; l.f.y = l.a.y + (l.b.y - l.a.y) * q }
        });
      }
      ik(l) {
        const g = this.A[l.i] + l.s * Math.PI / 2, nx = Math.cos(g), ny = Math.sin(g), s = this.sc, p = this.P[l.i], sx = p.x + nx * this.R[l.i] * s * .6, sy = p.y + ny * this.R[l.i] * s * .6, l1 = 20 * s, l2 = 23 * s;
        const fx = l.f.x - sx, fy = l.f.y - sy, d = Math.hypot(fx, fy) || 1, dm = Math.min(d, l1 + l2 - .5), ux = fx / d, uy = fy / d, aa = (l1 * l1 - l2 * l2 + dm * dm) / (2 * dm), hh = Math.sqrt(Math.max(0, l1 * l1 - aa * aa));
        let px = -uy, py = ux; if (px * nx + py * ny < 0) { px = -px; py = -py }
        return [sx, sy, sx + ux * aa + px * hh, sy + uy * aa + py * hh, sx + ux * dm, sy + uy * dm];
      }
      drawBone() {
        const s = this.sc, hd = this.P[0], devour = this.devourScale == null ? 1 : Math.max(.08,Math.min(1,this.devourScale)), devourSpin = this.devourSpin || 0; ctx.lineJoin = 'round'; ctx.lineCap = 'round';
        ctx.strokeStyle = this.flash > 0 ? '#fff' : this.col; ctx.lineWidth = 1.3 * Math.max(1, s * .8); ctx.fillStyle = '#0a0710';
        if(this.boss){const pulse=1+Math.sin(performance.now()/150)*.1;ctx.save();ctx.globalCompositeOperation='lighter';ctx.globalAlpha=.5;ctx.strokeStyle=this.bossGlow;ctx.shadowColor=this.bossGlow;ctx.shadowBlur=lowEndDevice?8:26;for(let j=0;j<5;j++){ctx.lineWidth=(3.2-j*.42)*s;ctx.beginPath();ctx.ellipse(hd.x,hd.y,(34+j*15)*s*pulse,(23+j*11)*s*pulse,0,0,TAU);ctx.stroke()}ctx.fillStyle=this.bossGlow;ctx.shadowBlur=lowEndDevice?5:18;for(let horn=-1;horn<=1;horn++){ctx.beginPath();ctx.moveTo(hd.x+(horn*10-5)*s,hd.y-14*s);ctx.lineTo(hd.x+horn*18*s,hd.y-38*s);ctx.lineTo(hd.x+(horn*10+5)*s,hd.y-14*s);ctx.closePath();ctx.fill()}for(let i=4;i<this.n-3;i+=4){const q=this.P[i],r=this.R[i]*s*2.1;ctx.globalAlpha=.17;ctx.beginPath();ctx.arc(q.x,q.y,r,0,TAU);ctx.stroke()}ctx.restore()}
        if (this.st === 1 && (this.k === 'dasher' || this.boss)) { ctx.save(); ctx.strokeStyle = 'rgba(255,60,40,.45)'; ctx.setLineDash([8, 8]); ctx.beginPath(); ctx.moveTo(hd.x, hd.y); ctx.lineTo(hd.x + Math.cos(this.lock) * 420, hd.y + Math.sin(this.lock) * 420); ctx.stroke(); ctx.restore() }
        if(devour>.94)this.legs.forEach(l => { if (!l.f) return; const q = this.ik(l); ctx.beginPath(); ctx.moveTo(q[0], q[1]); ctx.lineTo(q[2], q[3]); ctx.lineTo(q[4], q[5]); ctx.stroke(); ctx.beginPath(); ctx.arc(q[4], q[5], 1.8 * s, 0, TAU); ctx.fill(); ctx.stroke() });
        for (let i = this.n - 1; i >= 0; i--) {
          const src=this.P[i],r=this.R[i]*s*devour*(1+.1*Math.sin(devourSpin*2+i*.8)*(1-devour)),dx=src.x-hd.x,dy=src.y-hd.y,da=this.devourAngle==null?devourSpin*.12:this.devourAngle,ca=Math.cos(da),sa=Math.sin(da),along=dx*ca+dy*sa,across=-dx*sa+dy*ca,compress=.12+.88*devour,sideCompress=.38+.62*Math.sqrt(devour),px=hd.x+ca*along*compress-sa*across*sideCompress,py=hd.y+sa*along*compress+ca*across*sideCompress;ctx.beginPath();ctx.ellipse(px,py,Math.max(.3,r*(.72+.28*devour)),Math.max(.3,r*(1.15-.15*devour)),da,0,TAU);ctx.fill();ctx.stroke();
          if (this.k === 'armor' && i > 1 && i < this.n - 3) { ctx.beginPath(); ctx.arc(src.x, src.y, r * .6, this.A[i] - 1.2, this.A[i] + 1.2); ctx.lineWidth = 2.6; ctx.stroke(); ctx.lineWidth = 1.3 }
        }
        ctx.save(); ctx.translate(hd.x, hd.y); ctx.rotate(this.devourAngle==null?this.A[0]+devourSpin*.12:this.devourAngle); ctx.scale(s*devour*(1+(this.devourWobble||0)),s*devour*(1-(this.devourWobble||0)*.55));
        if (this.boss) {ctx.save();ctx.globalAlpha=.22+Math.sin(performance.now()*.006)*.08;ctx.strokeStyle=this.bossGlow;ctx.lineWidth=3*sc;ctx.shadowColor=this.bossGlow;ctx.shadowBlur=26*sc;ctx.beginPath();ctx.arc(hd.x,hd.y,(34+Math.sin(performance.now()*.004)*4)*this.sc,0,TAU);ctx.stroke();ctx.restore();[-1, 1].forEach(sd => { ctx.beginPath(); ctx.moveTo(-2, sd * 9); ctx.lineTo(-14, sd * 18); ctx.moveTo(4, sd * 10); ctx.lineTo(0, sd * 20); ctx.stroke() });}
        const tl = this.tel > 0; ctx.shadowColor = tl ? '#ff2a1a' : this.col; ctx.shadowBlur = tl ? 14 : 6; ctx.fillStyle = tl ? '#ff2a1a' : this.col;
        [-1, 1].forEach(sd => { ctx.beginPath(); ctx.arc(3.5, sd * 6.2, tl ? 3.2 : 1.8, 0, TAU); ctx.fill() });
        ctx.restore();
        if (this.hp < this.max && !this.boss) { const w = 34 * s; ctx.fillStyle = '#200'; ctx.fillRect(hd.x - w / 2, hd.y - 24 * s, w, 3); ctx.fillStyle = this.col; ctx.fillRect(hd.x - w / 2, hd.y - 24 * s, w * Math.max(0, this.hp / this.max), 3) }
      }
    }

    let pl, en = [], shots = [], parts = [], tents = [], spawnQ = [], bossDue=false, bossSpawned=false, lvl = 0, score=0,best=lsGet(),state='title', fury = 0, hp = 100, inv = 0, guard = 0, guardFlash = 0, shake = 0, wf = 0, rf = 0, dash = 0, breath = 0, pm = 0, nova = null, clearT = 0, dashHit = new Set(), pops = [], streak = 0, streakT = 0, slow = 1, overAt = 0;
    const SLOT_KEYS=['a','s','d','f'],STARTER_LOADOUT=['dash','breath','shadows','nova'];
    const SKILL_CATALOG=[
      {id:'dash',name:'Embestida',icon:'⚡',tier:'INICIAL',price:0,cooldown:.7,effect:'dash',description:'Carga hacia delante y atraviesa enemigos.'},
      {id:'breath',name:'Aliento',icon:'🔥',tier:'INICIAL',price:0,cooldown:2.8,effect:'breath',description:'Quema a los enemigos que tengas delante.'},
      {id:'shadows',name:'Sombras',icon:'👁',tier:'INICIAL',price:0,cooldown:3.8,effect:'shadows',description:'Golpea y aturde a varios enemigos cercanos.'},
      {id:'nova',name:'Nova',icon:'✦',tier:'INICIAL',price:0,cooldown:0,furyCost:100,effect:'nova',description:'Explosión expansiva y breve invulnerabilidad.'},
      {id:'soul_lance',name:'Lanza espectral',icon:'☄',tier:'COMÚN',price:450,cooldown:3.4,effect:'soul_lance',description:'Lanza energía espectral contra hasta tres enemigos cercanos y los deja aturdidos.'},
      {id:'iron_ward',name:'Égida de hierro',icon:'🛡',tier:'COMÚN',price:550,cooldown:9,effect:'iron_ward',description:'Un escudo temporal absorbe el siguiente golpe.'},
      {id:'ember_ring',name:'Anillo de brasas',icon:'🌋',tier:'ÉPICA',price:850,cooldown:7.5,effect:'ember_ring',description:'Una explosión ardiente daña y quema alrededor.'},
      {id:'void_chain',name:'Cadena abisal',icon:'⛓',tier:'RARA',price:1200,cooldown:6.8,effect:'void_chain',description:'Conecta a varios enemigos con cadenas abisales, les inflige daño y los inmoviliza.'},
      {id:'void_rift',name:'Falla del vacío',icon:'🌀',tier:'LEGENDARIA',price:1900,cooldown:13,effect:'void_rift',description:'Abre un vórtice que atrae enemigos, los daña mientras los succiona y estalla al cerrarse.'},
      {id:'cataclysm',name:'Cataclismo',icon:'☄️',tier:'LEGENDARIA',price:2100,cooldown:14,effect:'cataclysm',description:'Invoca un meteorito sobre el enemigo más cercano o el punto al que apuntas.'},
      {id:'frost_bloom',name:'Floración glacial',icon:'❄️',tier:'ÉPICA',price:900,cooldown:10,effect:'frost_bloom',description:'Congela a los enemigos cercanos y los deja vulnerables.'},
      {id:'venom_storm',name:'Tormenta tóxica',icon:'☣️',tier:'ÉPICA',price:1450,cooldown:12,effect:'venom_storm',description:'Una nube venenosa castiga a todos los enemigos alrededor.'},
      {id:'blood_siphon',name:'Pacto sanguíneo',icon:'🩸',tier:'RARA',price:1350,cooldown:15,effect:'blood_siphon',description:'Drena la fuerza de los enemigos y restaura tu vida.'},
      {id:'gravity_well',name:'Pozo gravitatorio',icon:'🪐',tier:'LEGENDARIA',price:2300,cooldown:16,effect:'gravity_well',description:'Te atrae a los enemigos cercanos, los aplasta y los deja vulnerables.'},
      {id:'meteor_swarm',name:'Lluvia de meteoros',icon:'☄️',tier:'LEGENDARIA',price:2600,cooldown:18,effect:'meteor_swarm',description:'Invoca una cadena de impactos explosivos en la arena.'},
      {id:'mirror_skin',name:'Piel de espejo',icon:'🔮',tier:'LEGENDARIA',price:2900,cooldown:22,effect:'mirror_skin',description:'Refuerza tu cuerpo, bloquea impactos y te vuelve invulnerable durante unos instantes.'},
      {id:'soul_reaper',name:'Segador de almas',icon:'💀',tier:'MÍTICA',price:3400,cooldown:20,effect:'soul_reaper',description:'Ejecuta a enemigos debilitados y causa un daño masivo a los jefes.'},
      {id:'eclipse',name:'Eclipse absoluto',icon:'🌑',tier:'MÍTICA',price:3900,cooldown:28,effect:'eclipse',description:'Libera una onda oscura global que inflige daño masivo, quema y paraliza a toda la horda.'},
      {id:'dragon_beam',name:'Rayo del dragón',icon:'🐉',tier:'ÉPICA',price:1550,cooldown:9.5,effect:'dragon_beam',description:'Concentra energía y dispara un rayo frontal que atraviesa a los enemigos, los quema y los empuja.'},
      {id:'rune_prison',name:'Prisión rúnica',icon:'🔷',tier:'ÉPICA',price:1750,cooldown:13,effect:'rune_prison',description:'Marca hasta tres enemigos cercanos con sellos rúnicos, los encierra y los inmoviliza mientras reciben daño.'}
    ];
    const skillById=id=>SKILL_CATALOG.find(x=>x.id===id)||null;
    const cd = { a: 0, s: 0, d: 0, f: 0 }, MAXCD = { a: .7, s: 2.8, d: 3.8, f: 0 };
    const U0={dA:1,dS:1,dD:1,cd:1,spd:1,def:1,fury:1,life:0,combo:1,tn:4};
    const SAVE_KEY='arena_serpientes_save_v2';
    function loadSave(){try{const x=JSON.parse(localStorage.getItem(SAVE_KEY)||'{}');return x&&x.version===2?x:{}}catch(e){return {}}}
    let saveData=loadSave();campaignUnlocked=Math.max(1,Math.min(100,Number(saveData.campaignUnlocked)||1));campaignCompleted=!!saveData.campaignCompleted;campaignResults=saveData.campaignResults&&typeof saveData.campaignResults==='object'?saveData.campaignResults:{};
    let skillFragments=Math.max(0,Number(saveData.skillFragments)||0),skillMasteries=saveData.skillMasteries&&typeof saveData.skillMasteries==='object'?saveData.skillMasteries:{};best=Math.max(best,Number(saveData.best)||0);let coins=Math.max(0,Number(saveData.coins)||0),ownedSkills=[...new Set([...STARTER_LOADOUT,...(Array.isArray(saveData.ownedSkills)?saveData.ownedSkills:[])])],skillLoadout=Array.isArray(saveData.skillLoadout)?SLOT_KEYS.map((_,i)=>{const id=saveData.skillLoadout[i];return ownedSkills.includes(id)&&skillById(id)?id:''}):[...STARTER_LOADOUT];for(let i=0;i<skillLoadout.length;i++)if(skillLoadout[i]&&skillLoadout.indexOf(skillLoadout[i])!==i)skillLoadout[i]='';let shopBonusClaimed=!!(saveData.shopBonusClaimed||saveData.secretCodeUsed);
    let stats={runs:0,kills:0,bosses:0,totalScore:0,bestLevel:1,upgrades:0,...(saveData.stats||{})};
    let sessions=Array.isArray(saveData.sessions)?saveData.sessions:[],activeSessionId=saveData.activeSessionId||null;
    // Supervivencia usa una única ranura guardada; campaña conserva sus partidas individuales.
    sessions=sessions.filter(x=>(x.mode||x.checkpoint?.mode||'survival')==='survival');
    const survivalSessions=sessions.filter(x=>(x.mode||x.checkpoint?.mode||'survival')==='survival').sort((a,b)=>(b.updatedAt||b.createdAt||0)-(a.updatedAt||a.createdAt||0));
    if(survivalSessions.length>1){const keep=survivalSessions[0];sessions=sessions.filter(x=>(x.mode||x.checkpoint?.mode||'survival')!=='survival'||x.id===keep.id);if(activeSessionId&&survivalSessions.some(x=>x.id===activeSessionId)&&activeSessionId!==keep.id)activeSessionId=keep.id;}
    if(saveData.checkpoint&&!sessions.length){activeSessionId='legacy-'+Date.now().toString(36);sessions.push({id:activeSessionId,name:'Partida guardada',createdAt:Date.now(),updatedAt:Date.now(),checkpoint:saveData.checkpoint,ended:false})}
    function runSnapshot(){return {U:{...U},maxHp,mode:gameMode,level:Math.max(1,lvl),score,hp,fury,guard,loadout:[...skillLoadout],enemies:en.map(e=>({...e,P:e.P.map(q=>({...q})),A:[...e.A],R:[...e.R],SP:[...e.SP],legs:e.legs.map(l=>({...l,f:l.f&&{...l.f},a:l.a&&{...l.a},b:l.b&&{...l.b}}))})),spawnQ:spawnQ.map(q=>({...q,pos:q.pos&&{...q.pos}})),player:pl&&({...pl,P:pl.P.map(q=>({...q})),A:[...pl.A],R:[...pl.R],SP:[...pl.SP],legs:pl.legs.map(l=>({...l,f:l.f&&{...l.f},a:l.a&&{...l.a},b:l.b&&{...l.b}}))}),cooldowns:{...cd}}}
    function persist(checkpoint=true){
       try{
         if(gameMode==='campaign'){sessions=sessions.filter(x=>(x.mode||x.checkpoint?.mode||'survival')==='survival');activeSessionId=null;saveData.checkpoint=null;checkpoint=false}
         const cp=checkpoint&&['play','pause','upg'].includes(state)&&gameMode!=='campaign'?runSnapshot():null;
         if(cp&&activeSessionId){const session=sessions.find(x=>x.id===activeSessionId);if(session){session.checkpoint=cp;session.mode=cp.mode;session.level=cp.level;session.score=cp.score;session.updatedAt=Date.now()}}
         const checkpointStoredInSession=!!(cp&&activeSessionId&&sessions.some(x=>x.id===activeSessionId&&x.checkpoint===cp));
         const buildSave=()=>({version:2,best,coins,campaignUnlocked,ownedSkills:[...ownedSkills],skillLoadout:[...skillLoadout],shopBonusClaimed,stats:{...stats},sessions:sessions.filter(x=>(x.mode||x.checkpoint?.mode||'survival')==='survival'),activeSessionId,campaignCompleted,campaignResults,skillFragments,skillMasteries,checkpoint:checkpointStoredInSession?null:cp,savedAt:Date.now()});
         saveData=buildSave();
         try{localStorage.setItem(SAVE_KEY,JSON.stringify(saveData))}
         catch(storageError){
           let saved=false;
           const ended=sessions.filter(x=>x.ended&&x.id!==activeSessionId).sort((a,b)=>(a.updatedAt||a.createdAt||0)-(b.updatedAt||b.createdAt||0));
           while(ended.length&&!saved){
             const remove=ended.shift();sessions=sessions.filter(x=>x.id!==remove.id);saveData=buildSave();
             try{localStorage.setItem(SAVE_KEY,JSON.stringify(saveData));saved=true}catch(retryError){}
           }
           if(!saved)return false;
           toast('GUARDADO OPTIMIZADO · SE LIBERÓ ESPACIO');
         }
         try{localStorage.setItem('arena_serpientes_best',String(best))}catch(secondarySaveError){}
         try{refreshHome()}catch(homeRefreshError){}
         return true
       }catch(e){return false}
     }
    function renderProfile(){const put=(id,value)=>{const el=$(id);if(el)el.textContent=String(value)};put('profileStatus','INVITADO');put('profileBest',Math.max(best,score).toLocaleString('es'));put('profileBosses',Number(stats.bosses||0).toLocaleString('es'));put('profileCoins',coins.toLocaleString('es'));put('profileFragments',skillFragments.toLocaleString('es'));const cloud=$('cloudSaveStatus');if(cloud)cloud.textContent='Sin autenticación en la nube: guardado local activo.'}
     function renderCampaign(){
      const grid=$('campaignGrid');if(!grid)return;const cleared=campaignCompleted?100:campaignUnlocked-1;
      $('campaignProgress').textContent=String(cleared).padStart(2,'0')+'/100';$('campaignNextLevel').textContent=campaignCompleted?'COMPLETA':String(campaignUnlocked).padStart(2,'0');$('campaignCleared').textContent=String(cleared).padStart(2,'0')+' / 100';
      grid.style.setProperty('display','grid','important');grid.style.setProperty('grid-template-columns','repeat(5,minmax(0,1fr))','important');grid.style.setProperty('grid-auto-flow','row','important');grid.style.setProperty('gap','8px','important');grid.style.setProperty('width','100%','important');grid.style.setProperty('align-items','stretch','important');grid.innerHTML=Array.from({length:100},(_,i)=>{const n=i+1,done=campaignCompleted||n<campaignUnlocked,open=!campaignCompleted&&n===campaignUnlocked,boss=n%5===0,result=campaignResults[n],stars=result?.stars||0;return '<button type="button" style="grid-column:auto!important;width:100%!important;min-width:0!important;max-width:none!important;aspect-ratio:1/1!important;box-sizing:border-box!important;margin:0!important" class="campaign-node '+(done?'is-done ':open?'is-open ':'is-locked ')+(boss?'is-boss':'')+'" data-campaign-level="'+n+'" '+(n>campaignUnlocked?'disabled':'')+' aria-label="Nivel '+n+(done?', completado':open?', disponible':', bloqueado')+'"><span>'+(done?'✓':boss?'♛':String(n).padStart(2,'0'))+'</span><small>'+(done?'LISTO':boss?'JEFE':open?'JUGAR':'CERRADO')+'</small>'+(result?'<em class="campaign-node-stars" aria-label="'+stars+' de 3 estrellas">'+('★'.repeat(stars))+('<i>'.repeat(3-stars))+'</em>':'')+'</button>'}).join('');
      $('campaignHint').textContent=campaignCompleted?'¡Campaña conquistada! Puedes repetir cualquiera de los 100 niveles.':campaignUnlocked===1?'Completa el nivel 1 para abrir el camino.':'Has llegado al nivel '+campaignUnlocked+'. Supera el desafío para desbloquear el siguiente.';
    }
    function campaignStarRating(level,seconds){const limit=90+level*5;return seconds<=limit?3:seconds<=limit*1.25?2:seconds<=limit*1.6?1:0}
    function formatCampaignTime(seconds){const total=Math.max(0,Math.floor(seconds)),m=Math.floor(total/60),ss=total%60;return String(m).padStart(2,'0')+':'+String(ss).padStart(2,'0')}
    function showCampaignResult(){if(campaignResultShown)return;campaignResultShown=true;const elapsed=campaignLevelTime,stars=campaignStarRating(lvl,elapsed),previous=campaignResults[lvl],firstClear=!previous;const coinReward=firstClear?(260+lvl*42+(lvl%5===0?1200:0)+stars*90):0,fragmentReward=firstClear?(2+Math.floor(lvl/4)+(lvl%5===0?5:0)+stars):0;coins+=coinReward;skillFragments+=fragmentReward;campaignResults[lvl]={stars:Math.max(stars,previous?.stars||0),time:Math.min(elapsed,previous?.time??Infinity),kills:Math.max(campaignLevelKills,previous?.kills||0),rewarded:true};if(lvl>=100){campaignCompleted=true;campaignUnlocked=100}state='campaignResult';overAt=performance.now();$('campaignResultTitle').textContent=lvl>=100?'¡CAMPAÑA CONQUISTADA!':'NIVEL '+String(lvl).padStart(2,'0')+' SUPERADO';$('campaignResultSub').textContent=stars===3?'EJECUCIÓN PERFECTA · RANGO S':stars===2?'EXCELENTE RENDIMIENTO · RANGO A':stars===1?'MISIÓN COMPLETADA · RANGO B':'MISIÓN COMPLETADA · SIGUE MEJORANDO';$('campaignResultKills').textContent=String(campaignLevelKills);$('campaignResultTime').textContent=formatCampaignTime(elapsed);const rewardBox=$('campaignReward');if(rewardBox)rewardBox.innerHTML='<b>RECOMPENSA '+(firstClear?'OBTENIDA':'YA RECLAMADA')+'</b><span>◈ '+coinReward.toLocaleString('es')+' monedas</span><span>◆ '+fragmentReward+' fragmentos de habilidad</span>';$('campaignResultStars').innerHTML=Array.from({length:3},(_,i)=>'<span class="'+(i<stars?'':'empty')+'">'+(i<stars?'★':'☆')+'</span>').join('');$('campaignNextBtn').textContent=lvl>=100?'VOLVER A LA CAMPAÑA':'SIGUIENTE NIVEL ↗';$('campaignResult').style.display='flex';persist(false);SFX.up()}
    function closeCampaignResult(toMap){$('campaignResult').style.display='none';if(toMap||lvl>=100){state='title';$('title').style.display='grid';$('over').style.display='none';$('pz').style.display='none';showHomePage('campaignPage');refreshHome();return}$('title').style.display='none';showUpgrades()}
    function refreshHome(){
      const statsNode=$('homeStats'),list=$('sessionList'),count=$('homeSessionCount');const wallet=$('homeCoins');if(wallet)wallet.textContent=coins.toLocaleString('es');
      if(statsNode)statsNode.innerHTML='<span class="home-stat"><b>'+best+'</b><small>RÉCORD</small></span><span class="home-stat"><b>'+stats.bestLevel+'</b><small>NIVEL MÁX.</small></span><span class="home-stat"><b>'+stats.kills+'</b><small>DERROTADAS</small></span><span class="home-stat"><b>'+stats.upgrades+'</b><small>MEJORAS</small></span>';
      const ordered=[...sessions].sort((a,b)=>(b.updatedAt||b.createdAt||0)-(a.updatedAt||a.createdAt||0));
      if(count)count.textContent=String(ordered.length).padStart(2,'0');
      if(list)list.innerHTML=ordered.length?ordered.map(x=>{const c=x.checkpoint;return '<article class="session-card"><div class="session-info"><b>'+x.name+'</b><small>'+(c?(x.mode==='campaign'?'CAMPAÑA ':'SUPERVIVENCIA · NIVEL ')+c.level+' · '+c.score+' PTS · GUARDADA '+new Date(x.updatedAt||x.createdAt).toLocaleString() :((x.mode==='campaign'?'CAMPAÑA COMPLETADA':'SUPERVIVENCIA')+' · NIVEL '+(x.level||1)+' · '+(x.score||0)+' PTS'))+'</small></div><div class="session-actions"><button class="session-resume" data-session-id="'+x.id+'">'+(c?'CONTINUAR':'REPETIR CAZA')+'</button><button class="session-delete" data-delete-session="'+x.id+'" aria-label="Eliminar '+x.name+'">ELIMINAR</button></div></article>'}).join(''):'<div class="sessions-empty"><span aria-hidden="true">☠</span><b>Tu historia empieza aquí</b><small>Juega tu primera partida y tus sesiones aparecerán en esta lista.</small></div>';
      const t=$('tbest');if(t)t.textContent=best?'MEJOR PUNTUACIÓN · '+best:'';
      renderLoadout();renderShop();renderMasteries();renderCampaign();renderProfile();refreshSkillButtons();refreshComboUI();
    }
    function skillForSlot(k){const i=SLOT_KEYS.indexOf(k);return i<0?null:skillById(skillLoadout[i])}
    function cooldownFor(k){const skill=skillForSlot(k);if(!skill)return MAXCD[k]||0;const mastery=Math.max(0,Math.min(5,Number(skillMasteries[skill.id])||0));return skill.cooldown*Math.pow(.96,mastery)}
    function refreshSkillButtons(){document.querySelectorAll('.k').forEach(b=>{const skill=skillForSlot(b.dataset.k),icon=b.querySelector('b'),label=b.querySelector('span'),key=b.dataset.k.toUpperCase();if(icon)icon.textContent=skill?skill.icon:'＋';if(label)label.textContent=skill?skill.name:'Vacía';b.dataset.tier=skill?skill.tier:'EMPTY';b.setAttribute('aria-label',skill?skill.name+', tecla '+key:'Espacio vacío, tecla '+key);b.title=skill?skill.name+' ('+key+')':'Espacio vacío ('+key+')';b.classList.toggle('empty',!skill)})}
    function refreshComboUI(){document.querySelectorAll('#combos [data-pair]').forEach(el=>{const pair=el.dataset.pair,a=skillForSlot(pair[0]),b=skillForSlot(pair[1]);el.textContent=pair.toUpperCase()+' · '+(a&&b?(a.name.slice(0,9)+' + '+b.name.slice(0,9)):'—');el.title=a&&b?(COMBOS[pair]+' · '+a.name+' + '+b.name):'Equipa dos habilidades para activar este combo';el.style.display=a&&b?'':'none'})}
    function renderLoadout(){
      const grid=$('loadoutGrid'),count=$('equippedCount');if(!grid)return;
      const used=skillLoadout.filter(Boolean).length;if(count)count.textContent=String(used).padStart(2,'0')+'/04';
      grid.innerHTML=SLOT_KEYS.map((key,i)=>{
        const selected=skillLoadout[i]||'',options='<option value="">— ESPACIO VACÍO —</option>'+ownedSkills.map(id=>{const skill=skillById(id);return skill?'<option value="'+skill.id+'"'+(selected===id?' selected':'')+'>'+skill.icon+' '+skill.name+' · '+skill.tier+'</option>':''}).join('');
        return '<label class="loadout-slot"><span><b>ESPACIO '+key.toUpperCase()+'</b><small>TECLA '+key.toUpperCase()+'</small></span><select data-skill-slot="'+i+'" aria-label="Habilidad del espacio '+key.toUpperCase()+'">'+options+'</select></label>'
      }).join('')+'<div class="loadout-actions"><button id="resetLoadout" type="button">RESTABLECER HABILIDADES INICIALES</button><small>'+used+' de 4 espacios ocupados</small></div>';
    }
    function renderMasteries(){
      const list=$('masteryList'),balance=$('fragmentBalance'),owned=$('ownedSkillList');
      if(balance)balance.textContent=skillFragments.toLocaleString('es');
      if(owned)owned.innerHTML='<span>DESBLOQUEADAS</span> '+ownedSkills.map(id=>{const skill=skillById(id);return skill?'<b>'+skill.icon+' '+skill.name+'</b>':''}).join('');
      if(!list)return;
      list.innerHTML=ownedSkills.map(id=>{const skill=skillById(id);if(!skill)return '';const level=Math.max(0,Math.min(5,Number(skillMasteries[id])||0)),cost=5+level*4;return '<article class="mastery-card"><div class="mastery-icon">'+skill.icon+'</div><div class="mastery-copy"><b>'+skill.name+'</b><small>MAESTRÍA '+level+'/5 · '+(level>=5?'NIVEL MÁXIMO':'RECARGA '+Math.round((1-Math.pow(.96,level))*100)+'% MÁS RÁPIDA')+'</small></div><button type="button" data-upgrade-skill="'+id+'" '+(level>=5||skillFragments<cost?'disabled':'')+'>'+(level>=5?'MÁXIMO':'MEJORAR · ◆ '+cost)+'</button></article>'}).join('')||'<p class="mastery-empty">Desbloquea habilidades para comenzar a forjarlas.</p>';
    }
    function upgradeSkill(id){
      const skill=skillById(id),level=Math.max(0,Math.min(5,Number(skillMasteries[id])||0)),cost=5+level*4;
      if(!skill||!ownedSkills.includes(id)||level>=5||skillFragments<cost){toast('NECESITAS '+cost+' FRAGMENTOS');return false}
      const before=skillFragments;skillFragments-=cost;skillMasteries[id]=level+1;
      if(!persist(false)){skillFragments=before;skillMasteries[id]=level;toast('NO SE PUDO GUARDAR LA MEJORA');return false}
      renderMasteries();refreshSkillButtons();toast(skill.name.toUpperCase()+' · MAESTRÍA '+(level+1));SFX.up();return true
    }
    function renderShop(){
      const list=$('shopList'),balance=$('shopBalance');if(balance)balance.textContent=coins.toLocaleString('es');if(!list)return;
      list.innerHTML=SKILL_CATALOG.map(skill=>{
        const owned=ownedSkills.includes(skill.id),equipped=skillLoadout.includes(skill.id),short=coins<skill.price?skill.price-coins:0;
        const label=owned?(equipped?'EQUIPADA':'ADQUIRIDA'):(short?'FALTAN '+short.toLocaleString('es')+' ◈':'DESBLOQUEAR');
        return '<article class="shop-card" data-tier="'+skill.tier+'"><div class="shop-skill-icon">'+skill.icon+'</div><div class="shop-skill-info"><div class="shop-skill-title"><b>'+skill.name+'</b><span>'+skill.tier+'</span></div><p>'+skill.description+'</p><div class="shop-skill-meta"><small>RECARGA · '+skill.cooldown.toFixed(1)+' S</small><strong class="shop-price">'+(skill.price?('◈ '+skill.price.toLocaleString('es')):'GRATUITA')+'</strong></div></div><button type="button" data-buy-skill="'+skill.id+'"'+(owned||short?' disabled':'')+'>'+label+'</button></article>'
      }).join('');
    }
    const buyingSkills=new Set();
    function buySkill(id){if(buyingSkills.has(id))return false;const skill=skillById(id);if(!skill||!Number.isSafeInteger(skill.price)||skill.price<=0||ownedSkills.includes(id))return false;if(!Number.isFinite(coins)||coins<skill.price){toast('MONEDAS INSUFICIENTES · FALTAN '+Math.max(0,skill.price-coins).toLocaleString('es')+' ◈');renderShop();return false}buyingSkills.add(id);const previousCoins=coins;try{coins-=skill.price;ownedSkills.push(id);if(!persist(false)){coins=previousCoins;ownedSkills=ownedSkills.filter(x=>x!==id);toast('NO SE PUDO GUARDAR LA COMPRA · INTÉNTALO DE NUEVO');renderShop();return false}renderShop();renderLoadout();toast(skill.name.toUpperCase()+' · COMPRA GUARDADA');SFX.up();return true}catch(err){coins=previousCoins;ownedSkills=ownedSkills.filter(x=>x!==id);toast('ERROR AL COMPRAR · NO SE DESCONTARON MONEDAS');renderShop();return false}finally{buyingSkills.delete(id)}}
    function equipSkill(slot,id){if(!Number.isInteger(slot)||slot<0||slot>=SLOT_KEYS.length)return;if(id&&!ownedSkills.includes(id)){toast('HABILIDAD AÚN NO DESBLOQUEADA');return}if(id&&skillLoadout.some((other,i)=>i!==slot&&other===id)){toast('ESA HABILIDAD YA OCUPA OTRO ESPACIO');renderLoadout();return}skillLoadout[slot]=id;refreshSkillButtons();refreshComboUI();persist(true);toast(id?'HABILIDAD EQUIPADA':'ESPACIO LIBERADO')}
    function resetLoadout(){skillLoadout=[...STARTER_LOADOUT];refreshSkillButtons();refreshComboUI();persist(true);toast('ARSENAL INICIAL RESTABLECIDO')}
    let U={...U0},maxHp=100, saveTick=0, comet = 0, poolT = 0, bh = null, pools = [], lastK = null, lastT = 0, upgCur = [];
    const cdset = (k, m = 1) => { cd[k] = cooldownFor(k) * U.cd * m };
    const mk = (k, x, y) => { const c=CF[k],boss=k==='boss',type=boss?Math.max(0,Math.floor(lvl/5)-1)%BOSS_ARCHETYPES.length:0,arch=BOSS_ARCHETYPES[type],lv=Math.max(1,lvl),scale=1+lv*.055+Math.pow(lv,1.28)*.006;return new Snake(x,y,{...c,col:boss?arch.color:c.col,bossType:type,bossName:boss?arch.name:'',bossGlow:boss?arch.glow:c.col,v:c.v*(boss?1.16:1.06+Math.min(.42,lv*.0035)),hp:c.hp*(boss?1.8:1.12)*scale*(boss?1+lv*.016+Math.pow(lv,1.08)*.002:1)},k)};
    const part = (x, y, vx, vy, l, r, col, add) => { if(parts.length>=FX_PART_LIMIT) return; parts.push({ x, y, vx, vy, l, m: l, r, col, add }); };
    function growPlayer(amount=4,scaleUp=.035){if(!pl)return;const old=pl.n,tail=pl.P[old-1],ang=pl.A[old-1]||pl.h;for(let j=0;j<amount;j++){const i=pl.n,rad=Math.max(2.5,2+6.5*Math.pow(1-i/(old+amount),.9));pl.R.push(rad);pl.SP.push((rad+pl.R[i-1])*.41);pl.P.push({x:tail.x-Math.cos(ang)*pl.SP[i]*pl.sc*(j+1),y:tail.y-Math.sin(ang)*pl.SP[i]*pl.sc*(j+1)});pl.A.push(ang);pl.n++}pl.sc=Math.min(1.75,pl.sc+scaleUp);toast('EVOLUCIÓN · SERPIENTE MÁS GRANDE')}
    const pop=(x,y,s,c,big)=>{if(pops.length>=MAX_FLOATING_TEXT)pops.shift();pops.push({x:Math.max(40,Math.min(WORLD_W-40,x+rnd(-14,14))),y,s,c,big,t:.9,m:.9})};
    const mult = () => 1 + Math.min(4, Math.floor(streak / 4));
    function banner(t, s) { const b = $('ban'); b.innerHTML = t + '<small>' + s + '</small>'; b.style.opacity = 1; clearTimeout(banner.h); banner.h = setTimeout(() => b.style.opacity = 0, 2900) }
    function compose(n){
      const a=[],add=(k,c)=>{for(let i=0;i<c;i++)a.push(k)};
      const base=Math.min(lowEndDevice?180:260,24+Math.floor(n*(lowEndDevice?2.2:2.8))+Math.floor(Math.pow(n,1.12)*.65));
      add('basic',Math.max(7,Math.ceil(base*(n<2?.88:n<3?.72:.58))));
      if(n>=2)add('spitter',Math.min(18,Math.ceil(base*.28)));
      if(n>=3)add('dasher',Math.min(16,Math.ceil(base*.24)));
      if(n>=4)add('armor',Math.min(14,Math.ceil(base*.2)));
      if(n>=6)add('split',Math.min(14,Math.ceil(base*.18)));
      let regular=a.filter(k=>k!=='boss').length;while(regular<base){a.push('basic');regular++}
      for(let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]]}return a
    }
    const LN = { 1: ['DESPERTAR', 'Ratón o joystick para moverte · habilidades en botones · combos con dos toques'], 2: ['VENENO', 'Las serpientes verdes escupen veneno'], 3: ['EMBESTIDA', 'Las amarillas cargan en línea recta'], 4: ['CORAZA', 'Las azules resisten las mordidas: usa fuego'], 5: ['EL REY SERPIENTE', 'Jefe de tres fases'], 6: ['DIVISIÓN', 'Las moradas se parten al morir'] };
    function nextLevel() {
      if(gameMode==='campaign'){campaignLevelTime=0;campaignLevelKills=0;campaignResultShown=false}
      lvl=gameMode==='campaign'?Math.min(100,lvl+1):lvl+1;stats.bestLevel=Math.max(stats.bestLevel,lvl);bossDue=lvl%5===0;bossSpawned=false;spawnQ=compose(lvl).map((k,i)=>({k,t:.35+i*.11}));
      const act=Math.floor((lvl-1)/5)+1,stage=['LLANURA CARMESÍ','CATACUMBAS DE CENIZA','PÁRAMO DE HUESO','TEMPLO ABISMAL','TRONO DEL REY'][(act-1)%5],boss=bossDue;
      if(lvl>1){hp=Math.min(maxHp,hp+Math.max(8,18-Math.floor(lvl*.08)));fury=Math.min(100,fury+Math.max(8,18-Math.floor(lvl*.06)));cd.a=cd.s=cd.d=cd.f=0}
      const arch=BOSS_ARCHETYPES[(act-1)%BOSS_ARCHETYPES.length],t=LN[lvl]||[boss?arch.name:'OLEADA '+lvl,boss?arch.intro:'Más enemigos y criaturas nuevas'];banner('ACTO '+act+' · NIVEL '+lvl+' — '+(boss?'JEFE: ':'')+stage,boss?arch.name+' · '+arch.intro:(t[1]||t[0])); once('lv', 200, () => lvl % 5 === 0 ? SFX.roar() : SFX.horn());
    }
    function spawnPos() {
      let x,y,tries=0;do{const a=rnd(0,TAU),r=Math.min(WORLD_W,WORLD_H)*rnd(.35,.48);x=Math.max(30,Math.min(WORLD_W-30,pl.P[0].x+Math.cos(a)*r));y=Math.max(30,Math.min(WORLD_H-30,pl.P[0].y+Math.sin(a)*r))}while(dst({x,y},pl.P[0])<Math.min(W,H)*.65&&++tries<10);
      return { x, y }
    }
    function spawn(k, pos) {
      const { x, y } = pos || spawnPos();
      const e = mk(k, x, y); e.h=Math.atan2(pl.P[0].y-y,pl.P[0].x-x); e.P.forEach((p, i) => { p.x = x; p.y = y }); e.A.fill(e.h); en.push(e);
      for (let i = 0; i < 14; i++)part(x, y, rnd(-160, 160), rnd(-160, 160), .6, 3, e.col, true);
    }
    function makePlayer() { pl = new Snake(WORLD_W/2,WORLD_H/2, { n: 30, hp: 1, v: 0, col: '#fff', s: 1.2 }, 'p'); pl.h = -Math.PI / 2 }
    function tryFullscreen(){if(document.fullscreenElement||matchMedia('(display-mode:fullscreen)').matches)return;const f=document.documentElement.requestFullscreen;if(f)f.call(document.documentElement).catch(()=>{})}
    function startGame(mode='survival',level=1){
      if(state!=='title')return false;
      if(mode!=='campaign'&&mode!=='survival')mode='survival';
      try{
        gameMode=mode;
        campaignStartLevel=mode==='campaign'?Math.max(1,Math.min(campaignUnlocked,Number(level)||1)):1;
        if(mode==='campaign'){activeSessionId=null;saveData.checkpoint=null}
        initAudio();
        newGame(false);
        $('title').style.display='none';
        tryFullscreen();
      }catch(error){
        state='title';
        $('title').style.display='grid';
        console.error('Error al iniciar la partida:',error);
        toast('ERROR AL INICIAR · '+(error?.message||'REINTENTA'));
      }
    }
    function continueSavedGame(id){const session=sessions.find(x=>x.id===id);if(!session)return;gameMode=session.mode||session.checkpoint?.mode||'survival';campaignStartLevel=gameMode==='campaign'?Math.max(1,Math.min(campaignUnlocked,session.checkpoint?.level||session.level||1)):1;activeSessionId=session.id;saveData.checkpoint=session.checkpoint||null;$('title').style.display='none';initAudio();try{if(session.checkpoint)newGame(true);else newGame(false,session.id);tryFullscreen()}catch(error){state='title';$('title').style.display='grid';toast('NO SE PUDO ABRIR LA PARTIDA · '+(error?.message||'REINTENTA'));console.error('Error al continuar partida:',error)}}
    function goHome(){if(state==='play'||state==='pause'||state==='upg')persist(gameMode!=='campaign');state='title';$('title').style.display='grid';$('over').style.display='none';$('pz').style.display='none';$('upg').style.display='none';refreshHome()}
    function restart() { if (state === 'over' && performance.now() - overAt > 700) { $('over').querySelector('h1').textContent='FIN DE PARTIDA';newGame(false)} }
    function togglePause(){
      if(state==='play'){persist(true);state='pause'; $('pz').style.display = 'flex'; if (AC && AC.suspend) AC.suspend() }
      else if (state === 'pause') { state = 'play'; $('pz').style.display = 'none'; if (AC && AC.resume) AC.resume() }
    }
    function newGame(resume=false,sessionId=null){
      if(!resume){growthStacks=0;cobra={phase:0,t:0,target:null,angle:0,hit:false};if(gameMode==='campaign'){campaignLevelTime=0;campaignLevelKills=0;campaignResultShown=false}}
      const cp=resume?saveData.checkpoint:null;if(resume&&cp?.mode)gameMode=cp.mode; en=[];shots=[];parts=[];tents=[];spawnQ=[];bossDue=false;bossSpawned=false;lvl=cp?cp.level:(gameMode==='campaign'?campaignStartLevel-1:0);score=cp?cp.score:0;U=cp&&cp.U?{...U0,...cp.U}:{...U0};maxHp=cp?Math.max(100,Number(cp.maxHp)||100):100;hp=cp?Math.min(maxHp,cp.hp):maxHp; comet = 0; bh = null; pools = []; fury = 0; inv = 0; dash = 0; breath = 0; nova = null; cd.a = cd.s = cd.d = cd.f = 0;guard=guardFlash=0;clearT = 0;
      rf=wf=shake=0;pops=[];streak=streakT=0;slow=1;lastK=null;fury=cp?cp.fury:0;makePlayer();if(resume&&cp&&cp.player){pl=Object.assign(new Snake(cp.player.P[0].x,cp.player.P[0].y,{n:cp.player.n,hp:cp.player.max,col:'#fff',v:0,s:1.2},'p'),cp.player);const sameBuild=!Array.isArray(cp.loadout)||SLOT_KEYS.every((key,i)=>cp.loadout[i]===skillLoadout[i]);guard=sameBuild?(cp.guard||0):0;cd.a=sameBuild?(cp.cooldowns?.a||0):0;cd.s=sameBuild?(cp.cooldowns?.s||0):0;cd.d=sameBuild?(cp.cooldowns?.d||0):0;cd.f=sameBuild?(cp.cooldowns?.f||0):0}state='play'; $('over').style.display='none';$('pz').style.display='none';$('title').style.display='none';if(!resume){saveData.checkpoint=null;if(sessionId){activeSessionId=sessionId;const existing=sessions.find(x=>x.id===sessionId);if(existing){existing.checkpoint=null;existing.ended=false;existing.updatedAt=Date.now()}}else{stats.runs++;if(gameMode==='survival'){let survivalSlot=sessions.find(x=>(x.mode||x.checkpoint?.mode||'survival')==='survival');if(survivalSlot){activeSessionId=survivalSlot.id;survivalSlot.name='Supervivencia';survivalSlot.mode='survival';survivalSlot.createdAt=survivalSlot.createdAt||Date.now();survivalSlot.updatedAt=Date.now();survivalSlot.level=1;survivalSlot.score=0;survivalSlot.checkpoint=null;survivalSlot.ended=false}else{activeSessionId='survival-'+Date.now().toString(36);sessions.unshift({id:activeSessionId,name:'Supervivencia',mode:'survival',createdAt:Date.now(),updatedAt:Date.now(),level:1,score:0,checkpoint:null,ended:false})}}}}if(resume&&cp&&Array.isArray(cp.enemies)&&Array.isArray(cp.spawnQ)){en=cp.enemies.map(raw=>Object.assign(new Snake(raw.P[0].x,raw.P[0].y,{...CF[raw.k],hp:raw.max},raw.k),raw));spawnQ=cp.spawnQ}else{if(resume&&cp)lvl=Math.max(0,cp.level-1);nextLevel()}persist(true);
    }
    function hurt(e, d, kx, ky, quiet) {
      if (e.dead) return; e.hp -= d; e.flash = .1; e.vx += kx || 0; e.vy += ky || 0; fury = Math.min(100, fury + d * .05 * U.fury);
      if (!quiet) { once('hit', 60, SFX.hit); for (let i = 0; i < 6; i++)part(e.P[0].x, e.P[0].y, rnd(-220, 220), rnd(-220, 220), rnd(.3, .6), 2, '#ff6a3a', false) }
      if (e.hp <= 0) kill(e);
    }
    function kill(e) {
      if(e.dead)return;e.dead=true;if(gameMode==='campaign')campaignLevelKills++;const coinBase=({basic:8,spitter:10,dasher:12,armor:16,split:14,mini:5,boss:180}[e.k]||8);const survivalGain=e.boss?Math.min(260,110+lvl*8):Math.min(18,4+Math.floor(lvl/8)+(coinBase>=14?2:0));const campaignGain=e.boss?450+lvl*22:Math.min(42,18+Math.floor(lvl/5)+(coinBase>=14?5:0));const coinGain=gameMode==='campaign'?campaignGain:survivalGain;coins+=coinGain;pop(e.P[0].x+12,e.P[0].y+10,'+'+coinGain+' ◈','#ffe3a0',e.boss);stats.kills++;if(e.boss)stats.bosses++;stats.totalScore+=(e.boss?1000:100)*mult();streak++; streakT = 3.2; const gain = (e.boss ? 1000 : 100) * mult(); score += gain; pop(e.P[0].x, e.P[0].y - 20, '+' + gain + (mult() > 1 ? ' ×' + mult() : ''), e.boss ? '#ffb066' : '#ffd36b', e.boss); fury = Math.min(100, fury + 10 * U.fury); hp = Math.min(maxHp, hp + U.life); SFX[e.boss ? 'boom' : 'kill'](); shake = Math.max(shake, e.boss ? 18 : 5);
      for (let i = 0; i < e.n; i += 2) { const p = e.P[i]; for (let j = 0; j < 3; j++)part(p.x, p.y, rnd(-240, 240), rnd(-240, 240), rnd(.4, .9), 2.5, e.col, true) }
      if (e.k === 'split') for (let i = 0; i < 2 && en.length < MAX_ACTIVE_ENEMIES; i++) en.push(mk('mini', e.P[0].x + rnd(-20, 20), e.P[0].y + rnd(-20, 20)));
      if (e.boss) { const bossReward=gameMode==='campaign'?Math.round(500+lvl*18):Math.round(180+lvl*12);coins+=bossReward;const fragmentReward=gameMode==='campaign'?0:2+Math.floor(lvl/10);if(fragmentReward)skillFragments+=fragmentReward;pop(e.P[0].x,e.P[0].y-54,'BONUS +'+bossReward+' ◈'+(fragmentReward?' · +'+fragmentReward+' ◆':''),'#ffe3a0',true);shots.length = 0; slow = .2; banner('EL REY HA CAÍDO', 'Recompensa de jefe obtenida · '+bossReward+' monedas') }
    }
    function hurtP(d) { if (state !== 'play') return; if(guard>0){guard=0;guardFlash=.45;inv=Math.max(inv,.35);toast('ESCUDO ROTO');SFX.hit();return} if (inv > 0) return; hp -= d * U.def; inv = .55; streak = 0; shake = Math.max(shake, 8); rf = .3; fury = Math.min(100, fury + d * .4 * U.fury); SFX.hurt(); if (hp <= 0) { hp = 0; gameOver() } }
    function gameOver(){state='over';overAt=performance.now();SFX.over();const nr=score>best&&score>0;best=Math.max(best,score);const finished=sessions.find(x=>x.id===activeSessionId);if(finished){finished.checkpoint=null;finished.ended=true;finished.level=lvl;finished.score=score;finished.updatedAt=Date.now()}activeSessionId=null;saveData.checkpoint=null;persist(false);
      $('ovp').textContent = 'Nivel ' + lvl + ' · ' + score + ' puntos · Récord ' + best + (nr ? ' · ¡NUEVO RÉCORD!' : ''); $('over').style.display = 'flex'
    }
    function shoot(h,a,v,d,owner=null){if(shots.length>=MAX_ACTIVE_SHOTS)return;once('sh',80,SFX.shoot);shots.push({x:h.x,y:h.y,vx:Math.cos(a)*v*sc,vy:Math.sin(a)*v*sc,d,l:5,owner})}

    let aiStepDt=1/60;
    const skillFx=[];
    function addSkillFx(type,x,y,angle=0){if(skillFx.length>18)skillFx.shift();const duration=type==='void_rift'?1.5:((type==='cataclysm'||type==='meteor_swarm')?0.95:0.72);skillFx.push({type,x,y,angle,t:0,d:duration});}
    function chooseTarget(e){
       const h=e.P[0];
       e.targetTimer=(e.targetTimer||0)-aiStepDt;
       if(e.targetTimer>0&&Number.isFinite(e.targetX)&&Number.isFinite(e.targetY))return {x:e.targetX,y:e.targetY};
       const ownPower=Math.max(1,e.hp||e.max||1),ownSize=e.n||1;
       const player=pl.P[0],playerDx=h.x-player.x,playerDy=h.y-player.y;
       const lead=(q,dist)=>{const t=Math.max(.08,Math.min(.52,dist/Math.max(180,e.v*sc*1.65)));return {x:q.x+Math.max(-150,Math.min(150,(q.vx||0)*t)),y:q.y+Math.max(-150,Math.min(150,(q.vy||0)*t))}};
       let best=player,bestPoint=lead(player,Math.hypot(playerDx,playerDy)),bestScore=Math.hypot(playerDx,playerDy)*.76,bestType='player';
       for(let i=0;i<en.length;i++){
         const o=en[i];if(o===e||o.dead||!o.P?.[0])continue;
         const q=o.P[0],dx=h.x-q.x,dy=h.y-q.y,d2=dx*dx+dy*dy;
         if(d2>bestScore*bestScore*3.1)continue;
         const power=Math.max(1,o.hp||o.max||1),size=o.n||1;
         let factor=1.02;
         if(o.boss)factor=e.boss?.88:2.25;
         else if(power<ownPower*.72&&size<=ownSize*1.25)factor=.62;
         else if(power>ownPower*1.35||size>ownSize*1.45)factor=1.62;
         if(o.targetType==='player'&&d2<260*sc*260*sc)factor*=.9;
         const score=Math.sqrt(d2)*factor;
         if(score<bestScore){best=o;bestPoint=lead(q,Math.sqrt(d2));bestScore=score;bestType='enemy'}
       }
       e.targetX=bestPoint.x;e.targetY=bestPoint.y;e.targetType=bestType;
       e.targetTimer=e.boss?.15:.19+rnd(0,.10);
       return {x:e.targetX,y:e.targetY}
     }
     function ai(e, dt) {
      if (e.dead) return;
      const p=pl.P[0],h=e.P[0],target=chooseTarget(e),dx=target.x-h.x,dy=target.y-h.y,d=Math.hypot(dx,dy)||1,k=e.k,sp0= e.v * sc * (e.boss && e.pp === 3 ? 1.5 : 1);
      e.flash = Math.max(0, e.flash - dt); e.bc -= dt; e.cd -= dt;
      if (e.burn > 0) { e.burn -= dt; e.hp -= 12 * dt; if (Math.random() < .3) part(h.x, h.y, rnd(-30, 30), -40, .6, 1.6, '#ff7a2a', true); if (e.hp <= 0) { kill(e); return } }
      if (e.stun > 0) { e.stun -= dt; e.move(p.x, p.y, 0, 1, dt); return }
      let tx=target.x,ty=target.y,spd=sp0*1.12,turn=5.4;
      if(d<420*sc){spd*=1.12;turn=6.2}
      if (e.boss) {
        const np = e.hp / e.max > .68 ? 1 : e.hp / e.max > .34 ? 2 : 3;
        if (np !== e.pp) { e.pp=np;const arch=BOSS_ARCHETYPES[e.bossType]||BOSS_ARCHETYPES[0];banner('FASE '+np+' · '+arch.name,np===2?'El jefe cambia su patrón de ataque':'Fase crítica · cuidado con sus embestidas');SFX.roar();shake=14;const addType=e.bossType===2?'armor':np===2?'spitter':'dasher';for(let i=0;i<1&&en.length<MAX_ACTIVE_ENEMIES;i++)en.push(mk(addType,h.x+rnd(-90,90),h.y+rnd(-90,90)))}
        e.cd2 = (e.cd2 === undefined ? 2 : e.cd2) - dt;
        if(e.cd2<=0){const aim=Math.atan2(p.y-h.y,p.x-h.x),style=(BOSS_ARCHETYPES[e.bossType]||BOSS_ARCHETYPES[0]).style,phase=e.pp;if(style==='fan'){const n=phase===1?4:phase===2?5:6;for(let j=-(n>>1);j<=n>>1;j++)shoot(h,aim+j*(phase===3?.14:.2),phase===3?350:280,phase===3?17:14,e)}else if(style==='ring'){const n=phase===1?8:phase===2?11:14;for(let j=0;j<n;j++)shoot(h,j/n*TAU+e.ang,phase===3?300:250,phase===3?15:12,e);e.ang+=.18}else if(style==='burst'){const n=phase===1?8:phase===2?11:14;for(let j=0;j<n;j++)shoot(h,j/n*TAU+e.ang,phase===3?310:255,phase===3?15:12,e);for(let j=-1;j<=1;j++)shoot(h,aim+j*.16,300,14,e);e.ang+=.13}else if(style==='spiral'){const n=phase===1?8:phase===2?11:14;for(let j=0;j<n;j++)shoot(h,j/n*TAU+e.ang,phase===3?310:255,phase===3?15:12,e);e.ang+=phase===3?.58:.36}else{const n=phase===1?6:phase===2?8:11;for(let j=0;j<n;j++)shoot(h,j/n*TAU+e.ang,phase===3?260:215,phase===3?13:10,e);for(let j=-1;j<=1;j++)shoot(h,aim+j*.18,260,phase===3?14:11,e);e.ang+=.27}e.cd2=phase===1?2.6:phase===2?2.1:1.7}
        if(e.boss&&!e.dead){e.hp=Math.min(e.max,e.hp+e.max*(e.pp===3?.004:e.pp===2?.002:.001)*dt);e.v=Math.max(e.v,CF.boss.v*(1.04+Math.min(.14,lvl*.0012)));}
        if(e.pp>=2){e.sp=(e.sp||0)-dt;if(e.sp<=0){const style=(BOSS_ARCHETYPES[e.bossType]||BOSS_ARCHETYPES[0]).style;e.ang+=style==='spiral'?.7:.31;shoot(h,e.ang,style==='spiral'?250:215,style==='spiral'?12:10,e);e.sp=style==='spiral'?.48:.58}}
      }
      if (k === 'spitter') {
        if (d < 220 * sc) { tx = h.x - dx; ty = h.y - dy } else if (d < 330 * sc) { spd *= .4; tx = h.x - dy; ty = h.y + dx }
        if (e.tel > 0) { e.tel -= dt; spd = 0; if (e.tel <= 0) { shoot(h,Math.atan2(dy,dx),300,10,e); e.cd = 2.6 } } else if (e.cd <= 0 && d < 560 * sc) e.tel = .45;
      } else if (k === 'dasher' || (e.boss && e.pp === 3)) {
        if (e.st === 0 && d < 400 * sc && e.cd <= 0) { e.st = 1; e.stT = .7 }
        if (e.st === 1) { e.tel = e.stT; spd = 0; turn = 7; e.stT -= dt; e.lock = Math.atan2(dy, dx); if (e.stT <= 0) { e.st = 2; e.stT = .5; e.tel = 0 } }
        else if (e.st === 2) { spd = sp0 * (e.boss ? 5 : 7); tx = h.x + Math.cos(e.lock) * 100; ty = h.y + Math.sin(e.lock) * 100; turn = 0; e.stT -= dt; if (e.stT <= 0) { e.st = 3; e.stT = .8 } }
        else if (e.st === 3) { spd = sp0 * .3; e.stT -= dt; if (e.stT <= 0) { e.st = 0; e.cd = rnd(1.5, 3) } }
      }
      e.move(tx, ty, spd, turn, dt);
      if (e.bc <= 0 && state === 'play') {
        const rr = e.R[0] * e.sc + 9 * pl.sc, q = e.P[0];
        let touchesPlayer=false,rr2=rr*rr;
         for(let i=0;i<10&&i<pl.P.length;i++){const z=pl.P[i],dxp=z.x-q.x,dyp=z.y-q.y;if(dxp*dxp+dyp*dyp<rr2){touchesPlayer=true;break}}
         if(touchesPlayer){hurtP(e.boss?15:e.st===2?17:10);e.bc=1;const a=Math.atan2(dy,dx);pl.vx+=Math.cos(a)*350;pl.vy+=Math.sin(a)*350;e.vx-=Math.cos(a)*200;e.vy-=Math.sin(a)*200}
         let other=null;
         for(let i=0;i<en.length;i++){const o=en[i];if(o===e||o.dead)continue;const op=o.P[0],ox=op.x-q.x,oy=op.y-q.y,limit=e.R[0]*e.sc+o.R[0]*o.sc;if(ox*ox+oy*oy<limit*limit){other=o;break}}
         if(other){const ox=other.P[0].x-q.x,oy=other.P[0].y-q.y,od=Math.hypot(ox,oy)||1;hurt(other,e.boss?16:14,ox/od*220,oy/od*220,true);e.bc=Math.max(e.bc,.65);other.bc=Math.max(other.bc,.65)}
      }
    }

    const COMBOS = { as:'COMETA INFERNAL',ad:'CADENA ESPECTRAL',af:'RUPTURA GLACIAL',ds:'INFIERNO NEGRO',fs:'PACTO DEL GUARDIÁN',df:'SINGULARIDAD' };
    const fx = n => { toast(n);SFX.combo();const h=pl.P[0],count=lowEndDevice?12:22;for(let i=0;i<count;i++){const a=i/count*TAU,v=rnd(90,230);part(h.x+Math.cos(a)*18*pl.sc,h.y+Math.sin(a)*18*pl.sc,Math.cos(a)*v,Math.sin(a)*v,rnd(.35,.7),rnd(2.5,5),i%3===0?'#fff0bd':i%2?'#b879ff':'#ff9c50',true)}pops.push({x:h.x,y:h.y-48,s:'✦ '+n,c:'#ffe1a1',big:true,t:.75,m:.75});shake=Math.max(shake,3) };
    function explode(x, y, r, dmg) {
      r*=U.area||1; dmg*=U.dA||1;
      en.forEach(e => { if (e.dead) return; const q = e.P[0], dd = Math.hypot(q.x - x, q.y - y); if (dd < r) { const a = Math.atan2(q.y - y, q.x - x); hurt(e, dmg, Math.cos(a) * 700, Math.sin(a) * 700); e.burn = 3; e.stun = Math.max(e.stun, .5) } });
      let keptShots=0;for(let i=0;i<shots.length;i++){const shot=shots[i],dx=shot.x-x,dy=shot.y-y;if(dx*dx+dy*dy>r*r)shots[keptShots++]=shot}shots.length=keptShots;
      for (let i = 0, total = lowEndDevice?18:38; i < total; i++) { const a = rnd(0, TAU), v = rnd(150, r * 2.2); part(x, y, Math.cos(a) * v, Math.sin(a) * v, rnd(.3, .7), rnd(4, 8), 'fire', true) }
      shake = Math.max(shake, 16); wf = .3; SFX.boom();
    }
    function infierno() {
      const h = pl.P[0], ts = en.filter(e => !e.dead && dst(h, e.P[0]) < 560 * sc).slice(0, 8); if (!ts.length) return false;
      ts.forEach((e, j) => { tents.push({ e, t: 0, i: 5 + j * 3, k: j }); hurt(e, 80 * U.combo * U.dD, 0, 0); e.stun = e.boss ? .6 : 2.2; e.burn = 4; const a = Math.atan2(h.y - e.P[0].y, h.x - e.P[0].x); e.vx += Math.cos(a) * 520; e.vy += Math.sin(a) * 520 });
      for (let i = 0; i < 50; i++) { const a = rnd(0, TAU); part(h.x, h.y, Math.cos(a) * rnd(200, 500), Math.sin(a) * rnd(200, 500), rnd(.4, .8), rnd(3, 6), 'fire', true) }
      breath = 0; cdset('s', 1.4); cdset('d', 1.4); shake = 14; return true;
    }
    function tryCombo(p,k){
      const keys=p.split(''),skills=keys.map(skillForSlot);if(skills.some(x=>!x)||keys.some(key=>cd[key]>0))return false;
      const h=pl.P[0],power=skills.reduce((sum,x)=>sum+(x.effect==='cataclysm'||x.effect==='eclipse'?1.35:x.effect==='nova'?1.2:1),0)/2;
      if(p==='as'){comet=.55;breath=0;dash=0;dashHit=new Set();poolT=0;keys.forEach(key=>cdset(key,1.5));}
      else if(p==='ad'){const targets=en.filter(e=>!e.dead&&dst(h,e.P[0])<680*sc*(U.area||1)).sort((a,b)=>dst(h,a.P[0])-dst(h,b.P[0])).slice(0,7);if(!targets.length)return false;targets.forEach((e,j)=>{hurt(e,105*U.dD*power,0,0,true);e.stun=Math.max(e.stun,e.boss?.55:1.2);e.burn=Math.max(e.burn,.8);tents.push({e,t:0,i:5+j*3,k:j})});keys.forEach(key=>cdset(key,1.5));}
      else if(p==='af'){explode(h.x,h.y,300*sc*(U.area||1),220*power);en.forEach(e=>{if(!e.dead&&dst(h,e.P[0])<300*sc*(U.area||1))e.stun=Math.max(e.stun,e.boss?.45:1.1)});keys.forEach(key=>cdset(key,1.5));}
      else if(p==='ds'){if(!infierno())return false;}
      else if(p==='fs'){guard=Math.max(guard,4);guardFlash=.55;inv=Math.max(inv,.45);hp=Math.min(maxHp,hp+18*power);explode(h.x,h.y,210*sc*(U.area||1),115*power);keys.forEach(key=>cdset(key,1.5));}
      else if(p==='df'){bh={x:ptr.x,y:ptr.y,t:0,d:2.2};keys.forEach(key=>cdset(key,1.5));}
      else return false;
      fx(COMBOS[p]+' · '+skills.map(x=>x.name.toUpperCase()).join(' + '));return true;
    }
    function single(k) {
      const skill=skillForSlot(k);if(!skill)return false;
      const furyCost=skill.furyCost||0;if(furyCost>0&&fury<furyCost)return false;
      if(cooldownFor(k)>0&&cd[k]>0)return false;
      const h=pl.P[0];
      switch(skill.effect){
        case 'dash': cdset(k);dash=.36;dashHit=new Set();SFX.dash();return true;
        case 'breath': cdset(k);breath=1.45;SFX.fire();return true;
        case 'shadows': {
          // Selección acotada: evita filter + sort + slice en cada activación.
          const maxTargets=lowEndDevice||mobile?2:Math.max(1,Math.min(3,Number(U.tn)||3));
          const range=520*sc*(U.area||1),range2=range*range,chosen=[];
          for(let i=0;i<en.length;i++){
            const e=en[i],q=e&&e.P&&e.P[0];
            if(!e||e.dead||!q)continue;
            const dx=q.x-h.x,dy=q.y-h.y,d2=dx*dx+dy*dy;
            if(d2>range2)continue;
            let at=chosen.length;
            if(at<maxTargets)chosen.push({e,d2});
            else{
              let far=0;for(let j=1;j<chosen.length;j++)if(chosen[j].d2>chosen[far].d2)far=j;
              if(d2<chosen[far].d2)chosen[far]={e,d2};
            }
          }
          if(!chosen.length){lastK=k;lastT=performance.now();return false}
          cdset(k);
          for(let j=0;j<chosen.length;j++){
            const e=chosen[j].e,q=e.P[0],anchorIndex=Math.min(Math.max(0,pl.P.length-1),5+j*4);
            if(pl.P[anchorIndex]&&q&&tents.length<(lowEndDevice||mobile?3:6))tents.push({e,t:0,i:anchorIndex,k:j});
            hurt(e,72*(U.dD||1),0,0);
            if(!e.dead){e.stun=Math.max(e.stun,e.boss?.35:1.1);const a=Math.atan2(h.y-q.y,h.x-q.x);e.vx+=Math.cos(a)*240;e.vy+=Math.sin(a)*240}
          }
          shake=Math.max(shake,4);SFX.tent();return true;
        }
        case 'nova': fury-=furyCost;nova={r:0,hit:new Set()};inv=1.4;shake=18;wf=.5;SFX.nova();return true;
        case 'soul_lance': {
          const targets=en.filter(e=>!e.dead&&dst(h,e.P[0])<560*sc).sort((a,b)=>dst(h,a.P[0])-dst(h,b.P[0])).slice(0,3);if(!targets.length)return false;cdset(k);
          targets.forEach((e,j)=>{hurt(e,76*U.dD*skillTierPower(k),0,0,true);e.stun=Math.max(e.stun,.45);tents.push({e,t:0,i:5+j*3,k:j+2});for(let n=0;n<5;n++)part(e.P[0].x,e.P[0].y,rnd(-90,90),rnd(-90,90),.35,2.8,'#9deaff',true)});
          SFX.shoot();shake=Math.max(shake,4);return true;
        }
        case 'iron_ward': guard=5;guardFlash=.5;cdset(k);SFX.dash();toast('ÉGIDA ACTIVADA');return true;
        case 'ember_ring': cdset(k);explode(h.x,h.y,360*sc*(U.area||1),260*skillTierPower(k));fx('ANILLO DE BRASAS');return true;
        case 'void_chain': {
          const targets=en.filter(e=>!e.dead&&dst(h,e.P[0])<720*sc*(U.area||1)).sort((a,b)=>dst(h,a.P[0])-dst(h,b.P[0])).slice(0,5);if(!targets.length)return false;cdset(k);
          targets.forEach((e,j)=>{tents.push({e,t:0,i:5+j*3,k:j});hurt(e,110*U.dD*skillTierPower(k),0,0,true);e.stun=Math.max(e.stun,e.boss ? .65 : 1.1);e.burn=Math.max(e.burn,.8)});
          SFX.tent();shake=Math.max(shake,7);return true;
        }
        case 'void_rift': {const target=en.filter(e=>!e.dead&&dst(h,e.P[0])<720*sc).sort((a,b)=>dst(h,a.P[0])-dst(h,b.P[0]))[0];cdset(k);bh={x:target?target.P[0].x:h.x,y:target?target.P[0].y:h.y,t:0,d:3,power:skillTierPower(k)};fx('FALLA DEL VACÍO');return true}
        case 'cataclysm': {const point={x:ptr.x,y:ptr.y};cdset(k);explode(point.x,point.y,470*sc*(U.area||1),430*skillTierPower(k));fx('CATACLISMO');return true}
        case 'frost_bloom': {let hit=0;en.forEach(e=>{if(!e.dead&&dst(h,e.P[0])<620*sc*(U.area||1)){hurt(e,125*U.dA*skillTierPower(k),0,0,true);e.stun=Math.max(e.stun,e.boss?1.1:3.2);hit++}});if(!hit)return false;cdset(k);for(let i=0;i<(lowEndDevice?14:30);i++)part(h.x,h.y,rnd(-250,250),rnd(-250,250),.7,3,'#8deaff',true);fx('FLORACIÓN GLACIAL');return true}
        case 'venom_storm': {let hit=0;en.forEach(e=>{if(!e.dead&&dst(h,e.P[0])<700*sc*(U.area||1)){hurt(e,165*U.dS*skillTierPower(k),0,0,true);e.burn=Math.max(e.burn,7);e.stun=Math.max(e.stun,.85);hit++}});if(!hit)return false;cdset(k);fx('TORMENTA TÓXICA');return true}
        case 'blood_siphon': {let drained=0;en.forEach(e=>{if(!e.dead&&dst(h,e.P[0])<650*sc*(U.area||1)){const before=e.hp;hurt(e,180*U.dD*skillTierPower(k),0,0,true);drained+=Math.min(before,180*U.dD*skillTierPower(k))}});if(!drained)return false;cdset(k);hp=Math.min(maxHp,hp+Math.min(85,drained*.16));fury=Math.min(100,fury+18);fx('PACTO SANGUÍNEO');return true}
        case 'gravity_well': {const targets=en.filter(e=>!e.dead&&dst(h,e.P[0])<900*sc*(U.area||1));if(!targets.length)return false;cdset(k);targets.forEach(e=>{const q=e.P[0],a=Math.atan2(h.y-q.y,h.x-q.x);e.vx+=Math.cos(a)*850;e.vy+=Math.sin(a)*850;hurt(e,180*U.dA*skillTierPower(k),0,0,true);e.stun=Math.max(e.stun,e.boss?.7:1.8)});fx('POZO GRAVITATORIO');return true}
        case 'meteor_swarm': {const targets=en.filter(e=>!e.dead).sort((a,b)=>dst(h,a.P[0])-dst(h,b.P[0])).slice(0,lowEndDevice?4:7);if(!targets.length)return false;cdset(k);targets.forEach(e=>{const q=e.P[0];explode(q.x,q.y,250*sc*(U.area||1),175*skillTierPower(k))});fx('LLUVIA DE METEOROS');return true}
        case 'mirror_skin': {cdset(k);guard=18;guardFlash=1;inv=Math.max(inv,2.4);en.forEach(e=>{if(!e.dead&&dst(h,e.P[0])<240*sc){hurt(e,110*U.dD*skillTierPower(k),0,0,true);e.stun=Math.max(e.stun,.8)}});fx('PIEL DE ESPEJO');return true}
        case 'soul_reaper': {const targets=en.filter(e=>!e.dead).sort((a,b)=>dst(h,a.P[0])-dst(h,b.P[0])).slice(0,5);if(!targets.length)return false;cdset(k);targets.forEach(e=>{const damage=e.boss?e.max*.22:(e.hp<=e.max*.35?e.hp*1.2:Math.min(e.hp*.88,900));hurt(e,damage*U.dA*(e.boss?1:skillTierPower(k)),0,0,true);e.burn=Math.max(e.burn,4)});fx('SEGADOR DE ALMAS');return true}
        case 'eclipse': {let count=0;en.forEach(e=>{if(!e.dead){hurt(e,(e.boss?e.max*.24:420)*U.dA*(e.boss?1:skillTierPower(k)),0,0,true);e.burn=Math.max(e.burn,6);e.stun=Math.max(e.stun,e.boss?1.5:2.5);count++}});if(!count)return false;cdset(k);shake=24;wf=.7;fx('ECLIPSE ABSOLUTO');return true}
        case 'dragon_beam': {
          const a=pl.A[0],range=900*sc;let hit=0;
          for(let i=0;i<en.length;i++){const e=en[i];if(!e||e.dead)continue;const q=e.P[0],dx=q.x-h.x,dy=q.y-h.y,along=dx*Math.cos(a)+dy*Math.sin(a),side=Math.abs(-dx*Math.sin(a)+dy*Math.cos(a));if(along>0&&along<range&&side<42*sc+e.R[0]*e.sc){hurt(e,175*U.dA*skillTierPower(k),Math.cos(a)*360,Math.sin(a)*360,true);e.burn=Math.max(e.burn,3.5);hit++}}
          if(!hit)return false;cdset(k);shake=Math.max(shake,8);SFX.nova();fx('RAYO DEL DRAGÓN');return true;
        }
        case 'rune_prison': {
          const chosen=[];for(let i=0;i<en.length;i++){const e=en[i];if(!e||e.dead)continue;const q=e.P[0],dx=q.x-h.x,dy=q.y-h.y,d2=dx*dx+dy*dy;if(d2>640*sc*640*sc)continue;if(chosen.length<3)chosen.push({e,d2});else{let far=0;for(let j=1;j<chosen.length;j++)if(chosen[j].d2>chosen[far].d2)far=j;if(d2<chosen[far].d2)chosen[far]={e,d2}}}
          if(!chosen.length)return false;cdset(k);for(let i=0;i<chosen.length;i++){const e=chosen[i].e;hurt(e,145*U.dD*skillTierPower(k),0,0,true);e.stun=Math.max(e.stun,e.boss?.8:2.2);e.vx*=.25;e.vy*=.25}shake=Math.max(shake,6);SFX.tent();fx('PRISIÓN RÚNICA');return true;
        }
        default:return false;
      }
    }
    function skillTierPower(k){const skill=skillForSlot(k);return skill?.tier==='RARA'?6.5:skill?.tier==='ÉPICA'?9.5:skill?.tier==='LEGENDARIA'?14:skill?.tier==='MÍTICA'?20:1}
    function atk(k) {
      if (state !== 'play') return; initAudio();
      const now = performance.now(), pair = lastK && lastK !== k ? [lastK, k].sort().join('') : '';
      if (pair && skillForSlot(lastK) && skillForSlot(k) && now - lastT < 380 && COMBOS[pair] && tryCombo(pair, k)) { lastK = null; return }
      if (single(k)) { const h=pl.P[0],skill=skillForSlot(k);addSkillFx(skill?.effect||'nova',h.x,h.y,pl.A[0]);lastK = k; lastT = now }
    }
    function fireTick(dt) {
      once('fire', 90, SFX.fire);
      const h = pl.P[0], a = pl.A[0], s = pl.sc, mx = h.x + Math.cos(a) * 16 * s, my = h.y + Math.sin(a) * 16 * s;
      for (let i = 0; i < 8; i++) { const b = a + rnd(-.28, .28), v = rnd(520, 760); part(mx, my, Math.cos(b) * v, Math.sin(b) * v, rnd(.3, .55), rnd(3, 6), 'fire', true) }
      en.forEach(e => {
        if (e.dead) return; let hit = false; for (let i = 0; i < e.n; i += 3) { const q = e.P[i]; if (Math.hypot(q.x - mx, q.y - my) < 380 * sc * (U.area||1) && Math.abs(wrap(Math.atan2(q.y - my, q.x - mx) - a)) < .32) { hit = true; break } }
        if (hit) { hurt(e, 75 * U.dS * dt, 0, 0, true); e.burn = 2.5 }
      });
      shake = Math.max(shake, 2);
    }
    let cameraReady=false;function updateCamera(dt=1/60){const desiredZoom=Math.max(.72,1-Math.max(0,pl.sc-1)*.22-Math.max(0,growthStacks-2)*.025);cameraZoom+=(desiredZoom-cameraZoom)*(1-Math.exp(-dt*2.8));const viewW=W/cameraZoom,viewH=H/cameraZoom,tx=Math.max(0,Math.min(WORLD_W-viewW,pl.P[0].x-viewW/2)),ty=Math.max(0,Math.min(WORLD_H-viewH,pl.P[0].y-viewH/2));if(!cameraReady){camX=tx;camY=ty;cameraReady=true;return}const k=1-Math.exp(-dt*13);camX+=(tx-camX)*k;camY+=(ty-camY)*k}
     function step(dt) {
      if (state === 'pause') return;
      if(state==='play'&&gameMode==='campaign')campaignLevelTime+=dt;
      shake = Math.max(0, shake - dt * 30); wf = Math.max(0, wf - dt * 1.5); rf = Math.max(0, rf - dt * 1.5); guard=Math.max(0,guard-dt);guardFlash=Math.max(0,guardFlash-dt);
      let aliveParts=0;for(let i=0;i<parts.length;i++){const p=parts[i];p.x+=p.vx*dt;p.y+=p.vy*dt;p.l-=dt;if(p.l>0)parts[aliveParts++]=p}parts.length=aliveParts;
      let aliveSkillFx=0;for(let i=0;i<skillFx.length;i++){const q=skillFx[i];q.t+=dt;if(q.t<q.d)skillFx[aliveSkillFx++]=q}skillFx.length=aliveSkillFx;
      let aliveTents=0;for(let i=0;i<tents.length;i++){const q=tents[i];q.t+=dt;if(q.t<.7)tents[aliveTents++]=q}tents.length=aliveTents;
      let alivePops=0;for(let i=0;i<pops.length;i++){const p=pops[i];p.y-=38*dt;p.t-=dt;if(p.t>0)pops[alivePops++]=p}pops.length=alivePops;
      if (parts.length > FX_PART_LIMIT) parts.splice(0, parts.length - FX_PART_LIMIT);
      emb.forEach(e => { e.y -= e.v * dt / H; if (e.y < -.03) { e.y = 1.03; e.x = Math.random() } });
      if(state==='title'){updateCamera();const h=pl.P[0],d=Math.hypot(ptr.x-h.x,ptr.y-h.y); pl.move(ptr.x, ptr.y, d < 14 ? 0 : Math.min(280 * sc, d * 5), 7, dt); return }
      if(state!=='play')return;
      if(cobra.phase){cobra.t-=dt;if(cobra.phase===2&&cobra.target&&!cobra.target.dead){const h=pl.P[0],e=cobra.target.P[0],u=Math.max(0,Math.min(1,1-cobra.t/.58)),ease=u*u*(3-2*u),side=Math.sin(u*Math.PI*3)*(1-u)*20*pl.sc,dx=Math.cos(cobra.angle),dy=Math.sin(cobra.angle),mx=h.x+dx*(62-49*ease)*pl.sc-dy*side,my=h.y+dy*(62-49*ease)*pl.sc+dx*side,pull=Math.min(1,dt*(4+ease*15));e.x+=(mx-e.x)*pull;e.y+=(my-e.y)*pull;cobra.target.devourScale=1-.88*ease;cobra.target.devourAngle=Math.atan2(h.y-e.y,h.x-e.x);cobra.target.devourSpin=(cobra.target.devourSpin||0)+dt*(3+ease*22);cobra.target.devourWobble=Math.sin(cobra.target.devourSpin*1.7)*(1-ease)*.16;}if(cobra.t<=0){if(cobra.phase===1){cobra.phase=2;cobra.t=.58;cobra.hit=false;shake=Math.max(shake,5);SFX.dash()}else if(cobra.phase===2){const target=cobra.target;if(target&&!target.dead&&dst(pl.P[0],target.P[0])<165*pl.sc+target.R[0]*target.sc){hurt(target,target.boss?Math.max(180,target.hp*.22):99999,Math.cos(cobra.angle)*700,Math.sin(cobra.angle)*700);if(target.dead){growPlayer(target.boss?7:4,target.boss?.09:.045);pop(pl.P[0].x,pl.P[0].y-35,'¡DEVORADO!','#ffb46b',true);cobra.phase=3;cobra.t=.42;cobra.swallowed=true}else{cobra.phase=3;cobra.t=.24;cobra.swallowed=false}}else{cobra.phase=3;cobra.t=.2;cobra.swallowed=false}}else{cobra.phase=0;cobra.target=null;cobra.swallowed=false}}}
      saveTick-=dt;if(saveTick<=0){saveTick=3;persist(true)}
      updateCamera();const h=pl.P[0];let moveMag=0;
      if(joy.active){moveMag=Math.min(1,Math.hypot(joy.dx,joy.dy));const a=Math.atan2(joy.dy,joy.dx);ptr.x=h.x+Math.cos(a)*Math.max(1,Math.min(W,H)*.55);ptr.y=h.y+Math.sin(a)*Math.max(1,Math.min(W,H)*.55)}
      else if(moveKeys.size){let mx=0,my=0;if(moveKeys.has('arrowleft'))mx--;if(moveKeys.has('arrowright'))mx++;if(moveKeys.has('arrowup'))my--;if(moveKeys.has('arrowdown'))my++;const m=Math.hypot(mx,my)||1;mx/=m;my/=m;moveMag=1;ptr.x=h.x+mx*Math.min(W,H)*.55;ptr.y=h.y+my*Math.min(W,H)*.55}
      else if(mobile){ptr.x=h.x;ptr.y=h.y}
      const d=Math.hypot(ptr.x-h.x,ptr.y-h.y);
      for(const k in cd) cd[k] = Math.max(0, cd[k] - dt); inv = Math.max(0, inv - dt); pm = Math.max(0, pm - dt * 3); streakT -= dt; if (streakT <= 0) streak = 0;
      let spd = moveMag ? 280 * sc * U.spd * moveMag : (d < 18 ? 0 : Math.min(280 * sc * U.spd, d * 3.2)), turn = moveMag ? 9 : 5.8;
      if(growthStacks>=3&&cobra.phase===0){let target=null,bestDist=Infinity;const head=pl.P[0],ang=pl.A[0];for(let i=0;i<en.length;i++){const e=en[i];if(e.dead||e.boss)continue;const dx=e.P[0].x-head.x,dy=e.P[0].y-head.y,dd=Math.hypot(dx,dy);if(dd<Math.min(260*sc,130*pl.sc)&&dd<bestDist&&(dx*Math.cos(ang)+dy*Math.sin(ang))/Math.max(1,dd)>.62){target=e;bestDist=dd}}if(target){cobra={phase:1,t:.34,target,angle:Math.atan2(target.P[0].y-head.y,target.P[0].x-head.x),hit:false};shake=Math.max(shake,2)}}
      if(cobra.phase===1){spd=105*sc;turn=1.2;ptr.x=pl.P[0].x-Math.cos(cobra.angle)*115*pl.sc;ptr.y=pl.P[0].y-Math.sin(cobra.angle)*115*pl.sc;pm=Math.max(pm,.25)}else if(cobra.phase===2){spd=1450*sc;turn=0;ptr.x=pl.P[0].x+Math.cos(cobra.angle)*230*pl.sc;ptr.y=pl.P[0].y+Math.sin(cobra.angle)*230*pl.sc;pm=1}
      if (dash > 0) {
        dash -= dt; spd = 1000 * sc; turn = 0; pm = Math.max(pm, .7);
        en.forEach(e => { if (!dashHit.has(e) && !e.dead && dst(h, e.P[0]) < 30 * pl.sc + e.R[0] * e.sc) { dashHit.add(e); const a = pl.A[0]; hurt(e, (e.k === 'armor' ? 12 : 42) * U.dA, Math.cos(a) * 500, Math.sin(a) * 500); shake = Math.max(shake, 5) } })
      }
      if (breath > 0) { breath -= dt; spd *= .35; turn = 3.5; pm = 1; fireTick(dt) }
      if (comet > 0) {
        comet -= dt; spd = 1300 * sc; turn = 0; pm = 1; poolT -= dt; if (poolT <= 0) { if(pools.length>=MAX_ACTIVE_POOLS)pools.shift();pools.push({ x: h.x, y: h.y, t: 2.4 }); poolT = .12 }
        for (let i = 0; i < 4; i++)part(h.x, h.y, rnd(-120, 120), rnd(-120, 120), rnd(.3, .6), rnd(4, 8), 'fire', true);
        en.forEach(e => { if (!dashHit.has(e) && !e.dead && dst(h, e.P[0]) < 34 * pl.sc + e.R[0] * e.sc) { dashHit.add(e); hurt(e, 60 * U.combo, Math.cos(pl.A[0]) * 600, Math.sin(pl.A[0]) * 600); e.burn = 3 } });
        if (comet <= 0) explode(h.x, h.y, 190 * sc, 100 * U.combo)
      }
      let alivePools=0;for(let i=0;i<pools.length;i++){const p=pools[i];p.t-=dt;if(p.t>0){pools[alivePools++]=p;for(let j=0;j<en.length;j++){const e=en[j];if(e.dead)continue;let hit=false;for(let k=0;k<e.n;k+=4){const q=e.P[k],dx=q.x-p.x,dy=q.y-p.y;if(dx*dx+dy*dy<(40*sc)*(40*sc)){hit=true;break}}if(hit){hurt(e,60*U.combo*dt,0,0,true);e.burn=Math.max(e.burn,1.5)}}}}pools.length=alivePools;
      if (bh) {
        bh.t += dt; en.forEach(e => {
          if (e.dead) return; const q = e.P[0], a = Math.atan2(bh.y - q.y, bh.x - q.x), dd = Math.hypot(bh.x - q.x, bh.y - q.y);
          if (dd < 650 * sc) { const f = (e.boss ? .35 : 1) * 1800 * dt; e.vx += Math.cos(a) * f; e.vy += Math.sin(a) * f } if (dd < 130 * sc) hurt(e, 110 * U.combo * (bh.power||1) * dt, 0, 0, true)
        });
        shots.forEach(s => { if (Math.hypot(s.x - bh.x, s.y - bh.y) < 110 * sc) s.l = 0 });
        if (bh.t >= bh.d) { explode(bh.x, bh.y, 340 * sc, 220 * U.combo * (bh.power||1)); bh = null }
      }
      pl.move(ptr.x,ptr.y,spd,turn,dt);updateCamera();
      if (nova) {
        nova.r += 1000 * (U.area||1) * dt; en.forEach(e => { if (!e.dead && !nova.hit.has(e) && dst(h, e.P[0]) < nova.r) { nova.hit.add(e); const a = Math.atan2(e.P[0].y - h.y, e.P[0].x - h.x); hurt(e, (e.boss ? 160 : 200) * U.dA, Math.cos(a) * 800, Math.sin(a) * 800); e.stun = 1 } });
        let keptNovaShots=0,novaR2=nova.r*nova.r;for(let i=0;i<shots.length;i++){const shot=shots[i],dx=shot.x-h.x,dy=shot.y-h.y;if(dx*dx+dy*dy>novaR2)shots[keptNovaShots++]=shot}shots.length=keptNovaShots;
        for (let i = 0; i < 10; i++) { const a = rnd(0, TAU); part(h.x + Math.cos(a) * nova.r, h.y + Math.sin(a) * nova.r, Math.cos(a) * 60, Math.sin(a) * 60, .5, rnd(2, 5), 'fire', true) }
        if (nova.r > Math.hypot(W, H)) nova = null
      }
      let aliveSpawn=0,budget=en.length<MAX_ACTIVE_ENEMIES?1:0;for(let i=0;i<spawnQ.length;i++){const q=spawnQ[i];q.t-=dt;if(q.t<=0&&budget>0){if(!q.pos)q.pos=spawnPos();spawn(q.k,q.pos);q.done=true;budget--}if(!q.done)spawnQ[aliveSpawn++]=q}spawnQ.length=aliveSpawn;
      aiStepDt=dt;for(let i=0,limit=en.length;i<limit;i++)ai(en[i],dt);let aliveEnemies=0;for(let i=0;i<en.length;i++)if(!en[i].dead)en[aliveEnemies++]=en[i];en.length=aliveEnemies;
      let aliveShots=0;for(let i=0;i<shots.length;i++){const s=shots[i];s.x+=s.vx*dt;s.y+=s.vy*dt;s.l-=dt;if(s.owner){let hitPlayer=false;for(let j=0;j<9&&j<pl.P.length;j++){const q=pl.P[j],dx=q.x-s.x,dy=q.y-s.y;if(dx*dx+dy*dy<(14*pl.sc)*(14*pl.sc)){hitPlayer=true;break}}if(hitPlayer){hurtP(s.d);s.l=0}else{for(let j=0;j<en.length;j++){const t=en[j];if(t!==s.owner&&!t.dead){const q=t.P[0],dx=q.x-s.x,dy=q.y-s.y,rr=t.R[0]*t.sc+5*sc;if(dx*dx+dy*dy<rr*rr){hurt(t,s.d,s.vx*.1,s.vy*.1,true);s.l=0;break}}}}}if(s.x<0||s.y<0||s.x>WORLD_W||s.y>WORLD_H)s.l=0;if(s.l>0)shots[aliveShots++]=s}shots.length=aliveShots;if(shots.length>MAX_ACTIVE_SHOTS)shots.splice(0,shots.length-MAX_ACTIVE_SHOTS);
      if (!spawnQ.length && !en.length) { clearT += dt; const bossWarmup=gameMode==='campaign'&&bossDue&&!bossSpawned?2.4:1.6; if(clearT>bossWarmup){clearT=0;if(bossDue&&!bossSpawned){bossSpawned=true;const arch=BOSS_ARCHETYPES[(Math.max(0,Math.floor(lvl/5)-1))%BOSS_ARCHETYPES.length];banner('EL GUARDIÁN HA DESPERTADO',arch.name+' · '+arch.intro);SFX.roar();spawn('boss')}else{const bonus=180+lvl*28,coinBonus=gameMode==='campaign'?0:Math.min(220,28+lvl*7),fragmentBonus=gameMode==='campaign'?0:(lvl%5===0?2:0);score+=bonus;coins+=coinBonus;if(fragmentBonus)skillFragments+=fragmentBonus;pop(pl.P[0].x,pl.P[0].y-42,'+'+bonus+' PTS · +'+coinBonus+' ◈'+(fragmentBonus?' · +'+fragmentBonus+' ◆':''),'#ffe09a',true);if(gameMode==='campaign'){campaignUnlocked=Math.max(campaignUnlocked,Math.min(100,lvl+1));showCampaignResult()}else showUpgrades()}} } else clearT = 0;
    }

    function drawDemon(t) {
      const s = pl.sc, P = pl.P, A = pl.A, n = pl.n; ctx.lineJoin = 'round'; ctx.lineCap = 'round';
      ctx.globalCompositeOperation = 'lighter';
      for (let i = 0; i < n; i += (lowEndDevice?18:10)) { const p = P[i], g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, 75 * s); g.addColorStop(0, 'rgba(170,10,20,.22)'); g.addColorStop(1, 'rgba(170,10,20,0)'); ctx.fillStyle = g; ctx.fillRect(p.x - 75 * s, p.y - 75 * s, 150 * s, 150 * s) }
      ctx.globalCompositeOperation = 'source-over';
      ctx.globalAlpha = inv > 0 && Math.floor(t / 70) % 2 ? .45 : 1;
      pl.legs.forEach(l => {
        if (!l.f) return; const q = pl.ik(l); ctx.beginPath(); ctx.moveTo(q[0], q[1]); ctx.lineTo(q[2], q[3]); ctx.lineTo(q[4], q[5]); ctx.strokeStyle = '#0a0305'; ctx.lineWidth = 8 * s; ctx.stroke(); ctx.strokeStyle = '#8a0f1a'; ctx.lineWidth = 4 * s; ctx.stroke();
        const d = Math.atan2(q[5] - q[3], q[4] - q[2]); ctx.strokeStyle = '#d9c7b0'; ctx.lineWidth = 2;[-.7, -.25, .25, .7].forEach(o => { ctx.beginPath(); ctx.moveTo(q[4], q[5]); ctx.lineTo(q[4] + Math.cos(d + o) * 12 * s, q[5] + Math.sin(d + o) * 12 * s); ctx.stroke() })
      });
      for (let i = n - 1; i >= 0; i--) {
        const p = P[i], r = pl.R[i] * s, u = i / n;
        if (i >= 2 && i < n - 3) [-1, 1].forEach(sd => { const pa = A[i] + sd * Math.PI / 2, ta = A[i] + sd * (Math.PI / 2 + .8), L = r * 1.1 + 5 * s; ctx.beginPath(); ctx.moveTo(p.x + Math.cos(pa - sd * .25) * r, p.y + Math.sin(pa - sd * .25) * r); ctx.lineTo(p.x + Math.cos(pa) * r + Math.cos(ta) * L, p.y + Math.sin(pa) * r + Math.sin(ta) * L); ctx.lineTo(p.x + Math.cos(pa + sd * .25) * r, p.y + Math.sin(pa + sd * .25) * r); ctx.fillStyle = i % 2 ? '#a89580' : '#d9c7b0'; ctx.fill() });
        ctx.beginPath(); ctx.arc(p.x, p.y, r, 0, TAU); ctx.fillStyle = 'hsl(' + (350 + u * 8) + ',75%,' + (12 - 7 * u) + '%)'; ctx.fill(); ctx.strokeStyle = 'hsla(355,85%,' + (42 - 22 * u) + '%,.95)'; ctx.lineWidth = 1.4; ctx.stroke()
      }
      ctx.save(); ctx.shadowColor = '#ff3b1f'; ctx.shadowBlur = lowEndDevice?4:12 + fury / 8; ctx.strokeStyle = 'rgba(255,' + (70 + fury / 2) + ',30,' + (.55 + .3 * Math.sin(t / 220)) + ')'; ctx.lineWidth = 2.4;
      ctx.beginPath(); for (let i = 3; i < n - 4; i++)i > 3 ? ctx.lineTo(P[i].x, P[i].y) : ctx.moveTo(P[i].x, P[i].y); ctx.stroke(); ctx.restore();
      const h = P[0];
      // Marcas de evolución: se activan gradualmente al crecer la serpiente.
      const evo=Math.min(1,Math.max(0,(n-24)/90));
      if(evo>.04){ctx.save();ctx.globalCompositeOperation='lighter';ctx.globalAlpha=.18+evo*.22;ctx.strokeStyle=fury>70?'#ffb347':'#b34cff';ctx.lineWidth=(lowEndDevice?1.2:2)*s;const step=lowEndDevice?Math.max(12,Math.floor(n/9)):Math.max(8,Math.floor(n/14));for(let i=step;i<n-5;i+=step){const q=P[i],rr=pl.R[i]*s*(1.45+evo*.25);ctx.beginPath();ctx.arc(q.x,q.y,rr,0,TAU);ctx.stroke()}ctx.restore()}
      ctx.save(); ctx.translate(h.x, h.y); ctx.rotate(A[0]); ctx.scale(s, s);
      const bitePulse=cobra.phase===2?Math.sin(Math.min(1,cobra.t/.58)*Math.PI):cobra.phase===3?Math.max(0,cobra.t/.42):0;
      const cobraOpen=cobra.phase===2?Math.min(1.9,.35+bitePulse*1.55):cobra.phase===3&&cobra.swallowed?Math.max(0,cobra.t/.42)*1.15:cobra.phase===1?.12:0;
      const recoil=cobra.phase===1?Math.sin((1-cobra.t/.34)*Math.PI)*.22:cobra.phase===2?bitePulse*.28:cobra.phase===3?Math.sin(cobra.t*31)*.07:0;
      const swallowPulse=cobra.phase===3&&cobra.swallowed?Math.sin((1-cobra.t/.42)*Math.PI*3)*.12:0;ctx.translate(-Math.max(0,recoil)*15,0);ctx.scale(1+Math.max(0,recoil)*.18+swallowPulse,1-Math.max(0,recoil)*.08-swallowPulse*.45);
      if(growthStacks>0){ctx.save();ctx.globalCompositeOperation='lighter';ctx.globalAlpha=Math.min(.72,.28+growthStacks*.09);ctx.strokeStyle='#ff8b45';ctx.lineWidth=2.5+Math.min(3,growthStacks*.45);ctx.beginPath();ctx.arc(P[0].x,P[0].y,pl.R[0]*s+9+Math.sin(t*.006)*3,0,TAU);ctx.stroke();ctx.globalAlpha*=.55;ctx.beginPath();ctx.arc(P[0].x,P[0].y,pl.R[0]*s+15+Math.cos(t*.004)*4,0,TAU);ctx.stroke();ctx.restore()}if(growthStacks>=3){ctx.save();ctx.globalAlpha=.42+Math.min(.4,growthStacks*.05);ctx.strokeStyle='#d34b35';ctx.lineWidth=3+Math.min(3,pl.sc);ctx.beginPath();ctx.moveTo(-7,-10);ctx.quadraticCurveTo(-38,-34,-48,-8);ctx.moveTo(-7,10);ctx.quadraticCurveTo(-38,34,-48,8);ctx.stroke();ctx.restore()}
      if(cobra.phase===1||cobra.phase===2){ctx.save();ctx.globalAlpha=.72;ctx.fillStyle='#64131b';ctx.strokeStyle='#e45a42';ctx.lineWidth=2.2;ctx.beginPath();ctx.moveTo(-8,-7);ctx.quadraticCurveTo(-24,-30,-42,-31);ctx.quadraticCurveTo(-37,-10,-19,0);ctx.quadraticCurveTo(-37,10,-42,31);ctx.quadraticCurveTo(-24,30,-8,7);ctx.closePath();ctx.fill();ctx.stroke();ctx.restore()}
      if(evo>.12){ctx.save();ctx.globalCompositeOperation='lighter';ctx.globalAlpha=.35+evo*.4;ctx.strokeStyle=fury>70?'#ffc15c':'#a95cff';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(-5,-7);ctx.lineTo(-15-evo*9,-18-evo*8);ctx.lineTo(-1,-10);ctx.moveTo(-5,7);ctx.lineTo(-15-evo*9,18+evo*8);ctx.lineTo(-1,10);ctx.stroke();ctx.restore()}
      [-1, 1].forEach(sd => { ctx.beginPath(); ctx.moveTo(-1, sd * 8); ctx.quadraticCurveTo(-12, sd * 24, -34, sd * 14); ctx.strokeStyle = '#14070a'; ctx.lineWidth = 7; ctx.stroke(); ctx.strokeStyle = '#d9c7b0'; ctx.lineWidth = 3.4; ctx.stroke() });
      if (pm > .05||cobraOpen>.05) { const jaw=Math.max(pm,cobraOpen);ctx.fillStyle = '#260006';ctx.beginPath();ctx.ellipse(11,0,15,Math.min(17,2+jaw*11),0,0,TAU);ctx.fill();ctx.fillStyle='#8f1820';ctx.beginPath();ctx.ellipse(13,0,10,Math.max(1,jaw*5),0,0,TAU);ctx.fill();if(cobraOpen>.18){ctx.strokeStyle='#f4b2a0';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(0,-5-jaw*5);ctx.quadraticCurveTo(10,-2,23,-5-jaw*5);ctx.stroke();ctx.fillStyle='#fff0d8';[-1,1].forEach(sd=>{ctx.beginPath();ctx.moveTo(7,sd*5);ctx.lineTo(11,sd*(5+jaw*8));ctx.lineTo(14,sd*5);ctx.fill()});ctx.strokeStyle='#ff6c70';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(17,0);ctx.lineTo(24,2);ctx.lineTo(29,-2);ctx.moveTo(24,2);ctx.lineTo(28,6);ctx.stroke()}}
      [-1, 1].forEach(sd => {
        ctx.save(); ctx.translate(2, 0); ctx.rotate(sd * pm * .5); ctx.beginPath(); ctx.moveTo(-7, 0); ctx.lineTo(-7, sd * 10.5); ctx.quadraticCurveTo(11, sd * 11, 18, 0); ctx.closePath(); ctx.fillStyle = '#22050a'; ctx.fill(); ctx.strokeStyle = '#b0242d'; ctx.lineWidth = 1.3; ctx.stroke();
        ctx.fillStyle = '#d9c7b0';[5, 9, 12, 15].forEach((k, j) => { const hh = j % 2 ? 4.5 : 7; ctx.beginPath(); ctx.moveTo(k - 1.6, 0); ctx.lineTo(k + 1.6, 0); ctx.lineTo(k, -sd * hh); ctx.fill() }); ctx.restore()
      });
      [-1, 1].forEach(sd => { ctx.save(); ctx.translate(4, sd * 6.4); ctx.rotate(-sd * .5); ctx.shadowColor = '#ff3b1f'; ctx.shadowBlur = 18; ctx.fillStyle = pm > .5 ? '#ffb066' : '#ff3b1f'; ctx.beginPath(); ctx.ellipse(0, 0, 4.2, 2.3, 0, 0, TAU); ctx.fill(); ctx.shadowBlur = 0; ctx.fillStyle = '#0a0002'; ctx.beginPath(); ctx.ellipse(0, 0, .9, 2.2, 0, 0, TAU); ctx.fill(); ctx.restore() });
      ctx.restore(); ctx.globalAlpha = 1;
    }
    function drawTents(t) {
      if(!pl||!Array.isArray(pl.P))return;
      let validTents=0;for(let i=0;i<tents.length;i++){const q=tents[i];if(q&&q.e&&Array.isArray(q.e.P)&&q.e.P[0]&&pl.P[q.i]&&Number.isFinite(q.t))tents[validTents++]=q}tents.length=validTents;
      tents.forEach(q => {
        const b=pl.P[q.i],T=q.e.P[0];
        if(!b||!T||!Number.isFinite(b.x)||!Number.isFinite(b.y)||!Number.isFinite(T.x)||!Number.isFinite(T.y))return;
        const dx=T.x-b.x,dy=T.y-b.y,L=Math.hypot(dx,dy)||1,w=Math.sin(t/90+q.k)*.3*L*Math.max(0,1-q.t/.7),cx=(b.x+T.x)/2-dy/L*w,cy=(b.y+T.y)/2+dx/L*w,fade=Math.min(1,(1-q.t/.7)*2);
        const pt=u=>[(1-u)*(1-u)*b.x+2*u*(1-u)*cx+u*u*T.x,(1-u)*(1-u)*b.y+2*u*(1-u)*cy+u*u*T.y];
        const steps=lowEndDevice||mobile?6:9;
        ctx.shadowColor='#7a2ab0';ctx.shadowBlur=lowEndDevice||mobile?0:5;
        ctx.strokeStyle='rgba(130,50,210,'+.42*fade+')';ctx.lineCap='round';
        ctx.beginPath();
        for(let j=0;j<=steps;j++){const a=pt(j/steps);if(j===0)ctx.moveTo(a[0],a[1]);else ctx.lineTo(a[0],a[1]);}
        ctx.lineWidth=7*pl.sc;ctx.stroke();
        ctx.shadowBlur=0;ctx.strokeStyle='rgba(6,0,10,'+fade+')';ctx.lineWidth=3.5*pl.sc;ctx.stroke();
      });
    }
    const RM = matchMedia('(prefers-reduced-motion: reduce)').matches;
    const emb = Array.from({ length: lowEndDevice?18:46 }, () => ({ x: Math.random(), y: Math.random(), v: rnd(8, 26), r: rnd(.8, 2.2), ph: rnd(0, TAU) }));
    const glowSpr = (() => { const c = document.createElement('canvas'); c.width = c.height = 64; const g = c.getContext('2d'), r = g.createRadialGradient(32, 32, 0, 32, 32, 32); r.addColorStop(0, 'rgba(190,255,215,1)'); r.addColorStop(.25, 'rgba(125,255,160,.55)'); r.addColorStop(1, 'rgba(125,255,160,0)'); g.fillStyle = r; g.fillRect(0, 0, 64, 64); return c })();
    function lsGet() { try { return +localStorage.getItem('arena_serpientes_best') || 0 } catch (e) { return 0 } }
    function buildBG() {
      bgc = document.createElement('canvas'); bgc.width = Math.max(1, W * dpr); bgc.height = Math.max(1, H * dpr); const g = bgc.getContext('2d'); g.scale(dpr, dpr);
      const gr = g.createRadialGradient(W / 2, H / 2, Math.min(W, H) * .15, W / 2, H / 2, Math.max(W, H) * .7); gr.addColorStop(0, '#1c070b'); gr.addColorStop(1, '#07050a'); g.fillStyle = gr; g.fillRect(0, 0, W, H);
      const R = Math.min(W, H) * .36; g.save(); g.translate(W / 2, H / 2); g.strokeStyle = 'rgba(255,59,31,.11)'; g.lineWidth = 2;
      [[1, []], [.82, [2, 10]], [.5, []]].forEach(([m, d]) => { g.setLineDash(d); g.beginPath(); g.arc(0, 0, R * m, 0, TAU); g.stroke() }); g.setLineDash([]);
      for (let i = 0; i < 24; i++) { const a = i / 24 * TAU; g.beginPath(); g.moveTo(Math.cos(a) * R * .82, Math.sin(a) * R * .82); g.lineTo(Math.cos(a) * R, Math.sin(a) * R); g.stroke() }
      g.beginPath(); for (let i = 0; i <= 7; i++) { const a = i * 3 / 7 * TAU - Math.PI / 2, x = Math.cos(a) * R * .82, y = Math.sin(a) * R * .82; i ? g.lineTo(x, y) : g.moveTo(x, y) } g.stroke(); g.restore();
      g.shadowColor = '#ff3b1f'; g.shadowBlur = 14; g.strokeStyle = 'rgba(255,59,31,.4)'; g.lineWidth = 2; g.strokeRect(10, 10, W - 20, H - 20);
    }
    function drawEmbers(t) { ctx.globalCompositeOperation = 'lighter'; ctx.fillStyle = '#ff7a3a'; emb.forEach(e => { ctx.globalAlpha = .25 + .25 * Math.sin(t / 500 + e.ph); ctx.beginPath(); ctx.arc(e.x * W + Math.sin(t / 900 + e.ph) * 14, e.y * H, e.r * sc, 0, TAU); ctx.fill() }); ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over' }
    function drawTelegraphs(t) {
      spawnQ.forEach(q => {
        if (!q.pos) return; const u = Math.max(0, Math.min(1, q.t)), c = CF[q.k].col, r = (q.k === 'boss' ? 70 : 34) * sc * (.5 + u * .9);
        ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = .25 + .55 * (1 - u); ctx.strokeStyle = c; ctx.shadowColor = c; ctx.shadowBlur = 14; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.arc(q.pos.x, q.pos.y, r, 0, TAU); ctx.stroke(); ctx.setLineDash([6, 6]); ctx.beginPath(); ctx.arc(q.pos.x, q.pos.y, r * .55, t / 200, t / 200 + TAU); ctx.stroke(); ctx.restore()
      })
    }
    function drawSkillFx(now){
      if(!skillFx.length)return;
      ctx.save();ctx.globalCompositeOperation='lighter';
      for(let i=0;i<skillFx.length;i++){
        const q=skillFx[i],u=Math.min(1,q.t/q.d),fade=1-u,r=(70+u*230)*sc;
        const palette={dash:'#b77aff',breath:'#ff762d',shadows:'#9a5cff',nova:'#ffc16b',soul_lance:'#8cecff',iron_ward:'#a9eaff',ember_ring:'#ff6a25',void_chain:'#a77bff',void_rift:'#b46aff',cataclysm:'#ff9c48',frost_bloom:'#8beaff',venom_storm:'#8bff83',blood_siphon:'#ff456f',gravity_well:'#b57aff',meteor_swarm:'#ffad58',dragon_beam:'#ffb34d',rune_prison:'#7edcff',mirror_skin:'#9deaff',soul_reaper:'#c7a2ff',eclipse:'#8d5bff'};
        const c=palette[q.type]||'#fff';ctx.globalAlpha=fade;ctx.strokeStyle=c;ctx.fillStyle=c;ctx.lineWidth=(q.type==='void_chain'?4:3)*sc;ctx.shadowColor=c;ctx.shadowBlur=lowEndDevice?0:12;
        if(q.type==='breath'||q.type==='soul_lance'||q.type==='dash'||q.type==='dragon_beam'){
          ctx.save();ctx.translate(q.x,q.y);ctx.rotate(q.angle);ctx.beginPath();ctx.moveTo(0,-12*sc);ctx.lineTo(r*2.1,-r*.42);ctx.lineTo(r*2.55,0);ctx.lineTo(r*2.1,r*.42);ctx.lineTo(0,12*sc);ctx.closePath();ctx.stroke();ctx.beginPath();ctx.moveTo(0,0);ctx.lineTo(r*2.25,0);ctx.stroke();ctx.restore();
        }else if(q.type==='void_chain'||q.type==='shadows'||q.type==='rune_prison'){
          ctx.beginPath();for(let n=0;n<5;n++){const a=now/180+n*TAU/5,rr=r*(.45+.12*Math.sin(now/90+n));const x=q.x+Math.cos(a)*rr,y=q.y+Math.sin(a)*rr;if(!n)ctx.moveTo(x,y);else ctx.lineTo(x,y)}ctx.closePath();ctx.stroke();for(let n=0;n<4;n++){const a=now/160+n*TAU/4;ctx.beginPath();ctx.moveTo(q.x,q.y);ctx.lineTo(q.x+Math.cos(a)*r,q.y+Math.sin(a)*r);ctx.stroke()}
        }else if(q.type==='cataclysm'||q.type==='meteor_swarm'){
          ctx.beginPath();ctx.arc(q.x,q.y,r*.8,0,TAU);ctx.stroke();for(let n=0;n<4;n++){const a=now/130+n*TAU/4,rr=r*(.65+u*.5);ctx.beginPath();ctx.moveTo(q.x+Math.cos(a)*rr,q.y+Math.sin(a)*rr);ctx.lineTo(q.x+Math.cos(a)*(rr+42*sc),q.y+Math.sin(a)*(rr+42*sc));ctx.stroke()}
        }else{
          const rings=q.type==='void_rift'||q.type==='gravity_well'||q.type==='rune_prison'?4:2;for(let n=0;n<rings;n++){ctx.beginPath();ctx.arc(q.x,q.y,r*(.45+n*.24),now/260+n*1.5,now/260+n*1.5+Math.PI*1.65);ctx.stroke()}
          if(q.type==='frost_bloom'){for(let n=0;n<6;n++){const a=n*TAU/6;ctx.beginPath();ctx.moveTo(q.x,q.y);ctx.lineTo(q.x+Math.cos(a)*r,q.y+Math.sin(a)*r);ctx.stroke()}}
          if(q.type==='iron_ward'||q.type==='mirror_skin'){ctx.beginPath();ctx.arc(q.x,q.y,r*.65,0,TAU);ctx.stroke();ctx.beginPath();ctx.arc(q.x,q.y,r*.8,0,TAU);ctx.stroke()}
          if(q.type==='eclipse'){ctx.fillStyle='rgba(30,5,55,.32)';ctx.beginPath();ctx.arc(q.x,q.y,r,0,TAU);ctx.fill();ctx.stroke()}
        }
      }
      ctx.restore();
    }
    function drawShots() { ctx.globalCompositeOperation = 'lighter'; shots.forEach(s => ctx.drawImage(glowSpr, s.x - 18 * sc, s.y - 18 * sc, 36 * sc, 36 * sc)); ctx.globalCompositeOperation = 'source-over'; ctx.fillStyle = '#d8ffe4'; shots.forEach(s => { ctx.beginPath(); ctx.arc(s.x, s.y, 4 * sc, 0, TAU); ctx.fill() }) }
    function drawParts() {
      for (let pass = 0; pass < 2; pass++) {
        ctx.globalCompositeOperation = pass ? 'lighter' : 'source-over';
        parts.forEach(p => {
          if (!!p.add !== !!pass) return; const u = 1 - p.l / p.m;
          if (p.col === 'fire') { ctx.globalAlpha = Math.max(0, 1 - u) * .6; ctx.fillStyle = u < .3 ? '#fff0a8' : u < .6 ? '#ff9a2a' : '#ff3010'; ctx.beginPath(); ctx.arc(p.x, p.y, p.r * (1 + u * 3) * sc, 0, TAU); ctx.fill() }
          else { ctx.globalAlpha = Math.max(0, 1 - u); ctx.fillStyle = p.col; ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, TAU); ctx.fill() }
        })
      }
      ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over'
    }
    function drawPops() {
      if (!pops.length) return; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.lineJoin = 'round';
      pops.forEach(p => { ctx.globalAlpha = Math.min(1, p.t / p.m * 2.2); ctx.font = '700 ' + (p.big ? 24 : 15) + 'px Cinzel,Georgia,serif'; ctx.lineWidth = 3; ctx.strokeStyle = 'rgba(0,0,0,.7)'; ctx.strokeText(p.s, p.x, p.y); ctx.fillStyle = p.c; ctx.fillText(p.s, p.x, p.y) });
      ctx.globalAlpha = 1; ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic'
    }
    let radarLastDraw=0;
    function drawRadar(now=performance.now()) {
      if(now-radarLastDraw<120)return;
      radarLastDraw=now;
      const r=$('radar'),g=r.getContext('2d'),w=r.width,h=r.height,pad=12,iw=w-pad*2,ih=h-pad*2;
      g.clearRect(0,0,w,h);g.save();g.beginPath();g.arc(w/2,h/2,Math.min(iw,ih)/2,0,TAU);g.clip();
      g.fillStyle='rgba(10,7,13,.92)';g.fillRect(0,0,w,h);g.strokeStyle='rgba(219,166,96,.22)';g.lineWidth=1;
      for(let n=1;n<=3;n++){g.beginPath();g.arc(w/2,h/2,Math.min(iw,ih)*n/8,0,TAU);g.stroke()}
      g.beginPath();g.moveTo(w/2,pad);g.lineTo(w/2,h-pad);g.moveTo(pad,h/2);g.lineTo(w-pad,h/2);g.stroke();
      const px=pad+Math.max(0,Math.min(1,pl.P[0].x/WORLD_W))*iw,py=pad+Math.max(0,Math.min(1,pl.P[0].y/WORLD_H))*ih;
      en.forEach(e=>{if(e.dead)return;const x=pad+Math.max(0,Math.min(1,e.P[0].x/WORLD_W))*iw,y=pad+Math.max(0,Math.min(1,e.P[0].y/WORLD_H))*ih;g.fillStyle=e.boss?'#ff594f':e.k==='spitter'?'#7dffa0':'#ffc66b';g.beginPath();g.arc(x,y,e.boss?4:2.5,0,TAU);g.fill()});
      spawnQ.forEach(q=>{if(!q.pos)return;g.fillStyle='#d98bff';g.beginPath();g.arc(pad+q.pos.x/WORLD_W*iw,pad+q.pos.y/WORLD_H*ih,2,0,TAU);g.fill()});
      g.fillStyle='#fff2c5';g.shadowColor='#ffe29a';g.shadowBlur=10;g.beginPath();g.arc(px,py,4,0,TAU);g.fill();g.restore();
      g.strokeStyle='rgba(241,194,118,.9)';g.lineWidth=2;g.beginPath();g.arc(w/2,h/2,(Math.min(iw,ih)/2)+1,0,TAU);g.stroke()
    }
    function draw(t) {
      if (state !== _ps) { _ps = state; document.body.dataset.s = state }
      const sk = RM ? shake * .25 : shake; ctx.setTransform(dpr, 0, 0, dpr, (Math.random() - .5) * sk * dpr, (Math.random() - .5) * sk * dpr); ctx.fillStyle = '#07050a'; ctx.fillRect(-30, -30, W + 60, H + 60);
      ctx.drawImage(bgc,0,0,W,H);drawEmbers(t);ctx.save();ctx.translate(W/2,H/2);ctx.scale(cameraZoom,cameraZoom);ctx.translate(-W/2-camX,-H/2-camY);
      drawTelegraphs(t);
      ctx.globalCompositeOperation = 'lighter'; pools.forEach(p => { ctx.fillStyle = 'rgba(255,110,30,' + Math.min(1, p.t) * .5 + ')'; ctx.beginPath(); ctx.arc(p.x, p.y, 30 * sc * (.8 + .2 * Math.sin(t / 80 + p.y)), 0, TAU); ctx.fill() }); ctx.globalCompositeOperation = 'source-over';
      if (bh) {
        ctx.save(); ctx.translate(bh.x, bh.y); const r = (40 + Math.sin(t / 80) * 3) * sc * (1 + bh.t * .3), g2 = ctx.createRadialGradient(0, 0, 0, 0, 0, r * 2.2); g2.addColorStop(0, 'rgba(0,0,0,1)'); g2.addColorStop(.45, 'rgba(10,0,20,.95)'); g2.addColorStop(1, 'rgba(120,40,200,0)'); ctx.fillStyle = g2; ctx.beginPath(); ctx.arc(0, 0, r * 2.2, 0, TAU); ctx.fill();
        ctx.shadowColor = '#a04bff'; ctx.shadowBlur = 18; ctx.strokeStyle = 'rgba(190,120,255,.8)'; ctx.lineWidth = 2; for (let i = 0; i < 3; i++) { ctx.beginPath(); ctx.arc(0, 0, r * (1.1 + i * .35), t / 300 + i * 2, t / 300 + i * 2 + 2.2); ctx.stroke() } ctx.restore()
      }
      drawSkillFx(t);drawTents(t);en.forEach(e=>e.drawBone());drawShots();drawDemon(t);if(mobile){const q=pl.P[0],a=joy.active?Math.atan2(joy.dy,joy.dx):pl.A[0],dist=Math.min(W,H)*.28,ax=q.x+Math.cos(a)*dist,ay=q.y+Math.sin(a)*dist,r=14*sc;ctx.save();ctx.globalAlpha=.88;ctx.strokeStyle='#f4cd78';ctx.fillStyle='#fff0bd';ctx.lineWidth=2;ctx.shadowColor='#ffb840';ctx.shadowBlur=lowEndDevice?3:8;ctx.beginPath();ctx.arc(ax,ay,r,0,TAU);ctx.stroke();ctx.beginPath();ctx.arc(ax,ay,3*sc,0,TAU);ctx.fill();ctx.beginPath();ctx.moveTo(ax-r*1.5,ay);ctx.lineTo(ax-r*.65,ay);ctx.moveTo(ax+r*.65,ay);ctx.lineTo(ax+r*1.5,ay);ctx.moveTo(ax,ay-r*1.5);ctx.lineTo(ax,ay-r*.65);ctx.moveTo(ax,ay+r*.65);ctx.lineTo(ax,ay+r*1.5);ctx.stroke();if(joy.active){ctx.globalAlpha=.22;ctx.beginPath();ctx.moveTo(q.x,q.y);ctx.lineTo(ax,ay);ctx.stroke()}ctx.restore()}
      if(dash>0||comet>0||breath>0){const h=pl.P[0],a=pl.A[0];ctx.save();ctx.translate(h.x,h.y);ctx.rotate(a);ctx.globalCompositeOperation='lighter';ctx.globalAlpha=lowEndDevice?.28:.48;ctx.strokeStyle=breath>0?'#ff9a36':'#a94cff';ctx.lineWidth=lowEndDevice?3:5;ctx.beginPath();if(breath>0){ctx.moveTo(8,-5);ctx.lineTo(150*sc,-52*sc);ctx.lineTo(190*sc,0);ctx.lineTo(150*sc,52*sc);ctx.lineTo(8,5)}else{ctx.moveTo(-12,-pl.R[0]*2);ctx.lineTo(-42*sc,-pl.R[0]*3);ctx.moveTo(-12,pl.R[0]*2);ctx.lineTo(-42*sc,pl.R[0]*3)}ctx.stroke();ctx.restore()}
      if (nova) { ctx.save(); ctx.shadowColor = '#ff7a2a'; ctx.shadowBlur = 30; ctx.strokeStyle = 'rgba(255,170,90,.85)'; ctx.lineWidth = 8; ctx.beginPath(); ctx.arc(pl.P[0].x, pl.P[0].y, nova.r, 0, TAU); ctx.stroke(); ctx.strokeStyle = 'rgba(160,75,255,.7)'; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(pl.P[0].x, pl.P[0].y, Math.max(0, nova.r - 14), 0, TAU); ctx.stroke(); ctx.restore() }
      drawParts();drawPops();ctx.restore();drawRadar(t);ctx.globalAlpha=1; ctx.globalCompositeOperation = 'source-over';
      const bs = en.find(e => e.boss); if (bs) { const w = Math.min(W * .5, 420), x = (W - w) / 2; ctx.fillStyle = '#200'; ctx.fillRect(x, 50, w, 8); ctx.fillStyle=bs.bossGlow||'#ff6a5a';ctx.fillRect(x,50,w*Math.max(0,bs.hp/bs.max),8);ctx.strokeStyle=bs.bossGlow||'#ff6a5a'; ctx.strokeRect(x, 50, w, 8); ctx.fillStyle=bs.bossGlow||'#ffb0a5';ctx.font='700 11px Cinzel,Georgia,serif';ctx.textAlign='center';ctx.fillText(bs.bossName||'JEFE DE LA ARENA',W/2,44); ctx.textAlign = 'left' }
      if (hp < maxHp * .35 && state === 'play') { const v = ctx.createRadialGradient(W / 2, H / 2, Math.min(W, H) * .3, W / 2, H / 2, Math.max(W, H) * .75); v.addColorStop(0, 'rgba(150,0,10,0)'); v.addColorStop(1, 'rgba(150,0,10,' + (.3 + .2 * Math.sin(t / 180)) + ')'); ctx.fillStyle = v; ctx.fillRect(-30, -30, W + 60, H + 60) }
      if (rf > 0) { ctx.fillStyle = 'rgba(190,0,10,' + rf * .8 + ')'; ctx.fillRect(-30, -30, W + 60, H + 60) }
      if (wf > 0) { ctx.fillStyle = 'rgba(255,200,150,' + wf * 1.2 + ')'; ctx.fillRect(-30, -30, W + 60, H + 60) }
      $('hp').style.width = (hp / maxHp * 100) + '%'; $('fu').style.width = fury + '%'; $('fub').classList.toggle('rdy', fury >= 100);
      const mm=mult(),act=Math.max(1,Math.ceil(lvl/5)),stage=['LLANURA CARMESÍ','CATACUMBAS','PÁRAMO DE HUESO','TEMPLO ABISMAL','TRONO DEL REY'][(act-1)%5],ls='ACTO '+act+' · '+stage+'<br>NIVEL '+lvl+'/100<br>'+score + ' pts · <small class="coin-readout">◈ '+coins+'</small><br><small>RÉCORD ' + Math.max(best, score) + '</small><br><small>SERPIENTES ' + (en.length + spawnQ.length) + '</small>' + (mm > 1 ? '<br><b class="st">RACHA ×' + mm + '</b>' : ''); if (ls !== _ls) { _ls = ls; $('lv').innerHTML = ls }
      KB.forEach(b => {
        const k=b.dataset.k,skill=skillForSlot(k),cost=skill?.furyCost||0,base=cooldownFor(k),v=cost?1-Math.min(1,fury/cost):(base?Math.min(1,cd[k]/(base*U.cd)):1),rd=!!skill&&(cost?fury>=cost:cd[k]<=0);
        b.style.setProperty('--c', v);
        if (rd && !b._r) { b.classList.remove('pop'); void b.offsetWidth; b.classList.add('pop'); ping(k) }
        b._r=rd;b.classList.toggle('rdy',rd);b.querySelector('small').textContent=!skill?'VACÍA':(rd?'LISTA':(cost?Math.floor(fury)+'%':cd[k].toFixed(1)))
      });
      CH.forEach(el=>{const pair=el.dataset.pair;if(!pair)return;const keys=pair.split('');el.classList.toggle('on',keys.every(key=>!!skillForSlot(key))&&keys.every(key=>cd[key]<=0))});
    }
    const setP=e=>{const r=cv.getBoundingClientRect();ptr.x=e.clientX-r.left+camX;ptr.y=e.clientY-r.top+camY};if(!mobile){addEventListener('pointermove',setP);cv.addEventListener('pointerdown',e=>{setP(e);initAudio()})}const je=$('joystick'),jk=$('joyknob');function ju(e){const r=je.getBoundingClientRect(),dx=e.clientX-r.left-r.width/2,dy=e.clientY-r.top-r.height/2,m=Math.hypot(dx,dy)||1,k=Math.min(1,m/(r.width*.36));joy.dx=dx/m*k;joy.dy=dy/m*k;jk.style.left=(50+joy.dx*36)+'%';jk.style.top=(50+joy.dy*36)+'%'}je.addEventListener('pointerdown',e=>{e.preventDefault();joy.active=true;joy.id=e.pointerId;je.setPointerCapture(e.pointerId);ju(e);initAudio()});je.addEventListener('pointermove',e=>{if(joy.active&&e.pointerId===joy.id)ju(e)});const jeEnd=e=>{if(e.pointerId===joy.id){joy.active=false;joy.dx=joy.dy=0;jk.style.left=jk.style.top='50%'}};je.addEventListener('pointerup',jeEnd);je.addEventListener('pointercancel',jeEnd);
    document.querySelectorAll('.k').forEach(b => {
      b.style.touchAction='none';
      b.addEventListener('pointerdown', e => { e.preventDefault(); e.stopPropagation(); if(e.button!==undefined&&e.button!==0)return; initAudio(); atk(b.dataset.k); });
      b.addEventListener('click',e=>{e.preventDefault();e.stopPropagation();b.blur()});
    });
    addEventListener('keydown', e => {
      const moveKey=e.key.toLowerCase();
      if(['arrowup','arrowdown','arrowleft','arrowright'].includes(moveKey)){moveKeys.add(moveKey);if(!mobile)e.preventDefault()}
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      initAudio(); const k = e.key.toLowerCase();
      if (k === 'p' || k === 'escape') { if (!e.repeat) togglePause(); return }
      if (state === 'upg' && k.length === 1 && '1234567'.includes(k)) { pickUpg(+k - 1); return }
      if (k.length === 1 && 'asdf'.includes(k) && !e.repeat) { atk(k); e.preventDefault() }
      if ((k === 'enter' || k === ' ') && !e.repeat) { if (state === 'title') startGame(); else if (state === 'over') restart() }
    });
    addEventListener('keyup',e=>moveKeys.delete(e.key.toLowerCase()));addEventListener('blur',()=>moveKeys.clear());
    $('re').addEventListener('click',restart);$('go').addEventListener('click',()=>startGame('survival'));$('campaignGo').addEventListener('click',()=>showHomePage('campaignPage'));$('campaignGrid').addEventListener('click',e=>{const b=e.target.closest('button[data-campaign-level]');if(!b||b.disabled)return;const level=Number(b.dataset.campaignLevel);if(level>campaignUnlocked)return;startGame('campaign',level)});$('loadoutGrid').addEventListener('change',e=>{const q=e.target.closest('select[data-skill-slot]');if(q)equipSkill(+q.dataset.skillSlot,q.value)});$('loadoutGrid').addEventListener('click',e=>{if(e.target.closest('#resetLoadout'))resetLoadout()});$('shopList').addEventListener('click',e=>{const b=e.target.closest('button[data-buy-skill]');if(b&&!b.disabled)buySkill(b.dataset.buySkill)});$('masteryList').addEventListener('click',e=>{const b=e.target.closest('button[data-upgrade-skill]');if(b&&!b.disabled)upgradeSkill(b.dataset.upgradeSkill)});function showHomePage(pageId){const allowed=['homeView','shopPage','skillsPage','campaignPage','profilePage'];if(!allowed.includes(pageId)){toast('SECCIÓN NO DISPONIBLE');return false}const home=$('homeView');if(home){home.style.display=pageId==='homeView'?'flex':'none';home.setAttribute('aria-hidden',String(pageId!=='homeView'))}document.querySelectorAll('#title .section-page').forEach(v=>{const active=v.id===pageId;v.style.display=active?'flex':'none';v.setAttribute('aria-hidden',String(!active))});const title=$('title');title.scrollTop=0;if(pageId==='shopPage')renderShop();if(pageId==='skillsPage')renderLoadout();if(pageId==='campaignPage')renderCampaign();if(pageId==='profilePage')renderProfile();document.querySelectorAll('.top-nav [data-page]').forEach(b=>b.classList.toggle('is-active',b.dataset.page===pageId));return true}document.addEventListener('click',e=>{const b=e.target&&e.target.closest?e.target.closest('button'):null;if(!b)return;if(b.id==='go'){e.preventDefault();e.stopImmediatePropagation();startGame('survival');return}if(b.id==='campaignGo'){e.preventDefault();e.stopImmediatePropagation();showHomePage('campaignPage');return}if(b.matches('button[data-page]')){e.preventDefault();e.stopImmediatePropagation();showHomePage(b.dataset.page)}},true);document.addEventListener('click',e=>{const b=e.target.closest&&e.target.closest('button[data-page]');if(b){e.preventDefault();showHomePage(b.dataset.page)}});$('connectGoogle').addEventListener('click',()=>alert('Para activar Google y el guardado en la nube hay que conectar un proyecto Supabase, habilitar el proveedor Google y configurar sus claves y URL de retorno. Tu progreso local se conserva mientras tanto.'));$('sessionList').addEventListener('click',e=>{const del=e.target.closest('button[data-delete-session]');if(del){const id=del.dataset.deleteSession;if(!id)return;const session=sessions.find(x=>x.id===id);if(!session)return;if(!confirm('¿Eliminar esta sesión y su progreso guardado?'))return;sessions=sessions.filter(x=>x.id!==id);if(activeSessionId===id)activeSessionId=null;persist(false);refreshHome();toast('SESIÓN ELIMINADA');return}const b=e.target.closest('button[data-session-id]');if(b&&!b.disabled)continueSavedGame(b.dataset.sessionId)});$('rs').addEventListener('click',togglePause);$('overHome').addEventListener('click',goHome);$('pauseHome').addEventListener('click',goHome);
    $('pbtn').addEventListener('pointerdown', e => { e.preventDefault(); togglePause() });
    addEventListener('blur', () => { moveKeys.clear() });
    document.addEventListener('visibilitychange', () => { if (!hasTouchInput() && !mobile && document.hidden && state === 'play') togglePause() });
    document.addEventListener('click', e => { const b = e.target.closest && e.target.closest('button'); if (b) b.blur() });
    const KB = [...document.querySelectorAll('.k')], CH = [...document.querySelectorAll('#combos span')];
    KB.forEach(b => { b._n = b.lastElementChild.textContent; b._r = true });
    const th = {}; function once(k, ms, f) { const n = performance.now(); if (n - (th[k] || 0) > ms) { th[k] = n; f() } }
    function toast(t) { const e = $('toast'); e.textContent = t; e.style.opacity = 1; clearTimeout(toast.h); toast.h = setTimeout(() => e.style.opacity = 0, 1100) }
    const UPG = [
      {id:'power',name:'☠ Núcleo devastador',desc:'Aumenta el daño de tus habilidades equipadas un 18% por elección.',apply:()=>{U.dA*=1.18;U.dS*=1.18;U.dD*=1.18}},
      {id:'area',name:'🌌 Dominio expansivo',desc:'Aumenta el radio de las habilidades de área un 16% por elección.',apply:()=>U.area=(U.area||1)*1.16},
      {id:'cool',name:'⏳ Flujo abisal',desc:'Reduce los enfriamientos un 9% por elección.',apply:()=>U.cd=Math.max(.48,U.cd*.91)},
      {id:'vital',name:'❤ Corazón colosal',desc:'+22 de vida máxima y recupera 35 al instante.',apply:()=>{maxHp+=22;hp=Math.min(maxHp,hp+35)}},
      {id:'growth',name:'🐍 Evolución titánica',desc:'Añade segmentos y aumenta el tamaño. Al conseguirla 3 veces despiertas la mordida cobra.',apply:()=>{growthStacks++;growPlayer(9,.12);if(growthStacks===3)toast('INSTINTO COBRA DESBLOQUEADO · ¡DEVORA!')}},
      {id:'speed',name:'⚡ Instinto depredador',desc:'Aumenta la velocidad de movimiento un 9% por elección.',apply:()=>U.spd=Math.min(1.65,U.spd*1.09)},
      {id:'fury',name:'🔥 Furia acumulada',desc:'Generas un 18% más de furia al dañar enemigos.',apply:()=>U.fury=Math.min(2.4,U.fury*1.18)},
      {id:'dash',name:'⚡ Ruptura de cometa',desc:'Embestida: +24% de daño y +12% de alcance.',skill:'dash',apply:()=>{U.dA*=1.24;U.area=(U.area||1)*1.12}},
      {id:'breath',name:'🔥 Corona infernal',desc:'Aliento: +25% de daño y mayor alcance.',skill:'breath',apply:()=>{U.dS*=1.25;U.area=(U.area||1)*1.1}},
      {id:'shadows',name:'🕷 Legión de sombras',desc:'Sombras: +22% de daño y un tentáculo adicional.',skill:'shadows',apply:()=>{U.dD*=1.22;U.tn=Math.min(10,U.tn+1)}},
      {id:'nova',name:'✦ Supernova eterna',desc:'Nova: +25% de daño y expansión más rápida.',skill:'nova',apply:()=>{U.dA*=1.25;U.area=(U.area||1)*1.14}}
    ];
    SKILL_CATALOG.filter(skill=>!UPG.some(upgrade=>upgrade.skill===skill.id)).forEach(skill=>UPG.push({id:'mastery_'+skill.id,name:skill.icon+' Maestría: '+skill.name,desc:'Mejora el poder de esta habilidad y acelera su recarga.',skill:skill.id,apply:()=>{U.dA*=1.12;U.dS*=1.12;U.dD*=1.12;U.cd=Math.max(.5,U.cd*.97)}}));
    function showUpgrades(){state='upg';const head=$('upg').querySelector('h2');if(head)head.textContent='ELIGE TU EVOLUCIÓN · NIVEL '+lvl;persist(true);const equipped=skillLoadout.filter(Boolean);const tailored=UPG.filter(u=>!u.skill||equipped.includes(u.skill));const pool=tailored.slice();for(let i=pool.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[pool[i],pool[j]]=[pool[j],pool[i]]}const choices=pool.slice(0,Math.min(6,pool.length));const skillChoices=pool.filter(u=>u.skill&&equipped.includes(u.skill));if(skillChoices.length&&!choices.some(u=>u.skill))choices[choices.length-1]=skillChoices[Math.floor(Math.random()*skillChoices.length)];upgCur=choices.map(u=>UPG.indexOf(u));
      $('cards').innerHTML=upgCur.map((i,n)=>'<button type="button" data-n="'+n+'"><i>MEJORA '+String(n+1).padStart(2,'0')+'</i><b>'+UPG[i].name+'</b><span>'+UPG[i].desc+'</span></button>').join('');
      $('upg').style.display='flex';SFX.up();
    }
    function pickUpg(n){if(state!=='upg'||upgCur[n]===undefined)return;UPG[upgCur[n]].apply();stats.upgrades++;$('cards').innerHTML='';$('upg').style.display='none';state='play';SFX.up();nextLevel();persist(true)}
    $('cards').addEventListener('click', e => { const b = e.target.closest('button'); if (b) pickUpg(+b.dataset.n) });$('campaignNextBtn').addEventListener('click',()=>closeCampaignResult(false));$('campaignBackBtn').addEventListener('click',()=>closeCampaignResult(true));
    // ---- sonido (sintetizado, sin archivos)
    let AC = null, master, nb, muted = false, beat = 0;
    function initAudio() {
      if (AC) { AC.state === 'suspended' && state !== 'pause' && AC.resume(); return }
      try {
        AC = new (window.AudioContext || window.webkitAudioContext)(); master = AC.createGain(); master.gain.value = muted ? 0 : .6; master.connect(AC.destination);
        nb = AC.createBuffer(1, AC.sampleRate, AC.sampleRate); const d = nb.getChannelData(0); for (let i = 0; i < d.length; i++)d[i] = Math.random() * 2 - 1;
        const g = AC.createGain(); g.gain.value = .05; const f = AC.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 160;
        [41, 41.7, 61.5].forEach(fr => { const o = AC.createOscillator(); o.type = 'sawtooth'; o.frequency.value = fr; o.connect(f); o.start() }); f.connect(g); g.connect(master);
        setInterval(() => {
          if (!AC || muted || state === 'over' || state === 'pause' || state === 'title') return; const bn = [55, 55, 65.4, 49][(beat >> 1) & 3]; tone(bn, bn * .98, .38, 'sawtooth', .05);
          if (beat % 2 === 0) tone(110, 40, .16, 'sine', .2); if (en.length && beat % 4 === 3) noise(.06, .07, 6000, 3000, 'highpass'); beat++
        }, 400);
      } catch (e) { AC = null }
    }
    function tone(f0, f1, dur, type, vol, delay = 0) {
      if (!AC) return; const t = AC.currentTime + delay, o = AC.createOscillator(), g = AC.createGain(); o.type = type; o.frequency.setValueAtTime(f0, t); o.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t + dur);
      g.gain.setValueAtTime(.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + .01); g.gain.exponentialRampToValueAtTime(.0001, t + dur); o.connect(g); g.connect(master); o.start(t); o.stop(t + dur + .02)
    }
    function noise(dur, vol, f0, f1, type = 'bandpass', delay = 0) {
      if (!AC) return; const t = AC.currentTime + delay, s = AC.createBufferSource(), f = AC.createBiquadFilter(), g = AC.createGain(); s.buffer = nb; f.type = type; f.frequency.setValueAtTime(f0, t); f.frequency.exponentialRampToValueAtTime(Math.max(30, f1), t + dur);
      g.gain.setValueAtTime(.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + .02); g.gain.exponentialRampToValueAtTime(.0001, t + dur); s.connect(f); f.connect(g); g.connect(master); s.start(t); s.stop(t + dur + .05)
    }
    const SFX = {
      dash: () => { noise(.3, .35, 1800, 300); tone(160, 60, .25, 'sawtooth', .2) }, fire: () => noise(.12, .18, 1400, 500),
      tent: () => { tone(90, 40, .5, 'sawtooth', .25); noise(.4, .2, 600, 120) }, nova: () => { tone(120, 25, 1.2, 'sine', .6); noise(1.1, .5, 1200, 80, 'lowpass') },
      hit: () => { tone(130, 50, .12, 'square', .18); noise(.08, .15, 2500, 800) }, kill: () => { noise(.3, .3, 1500, 150); tone(90, 35, .3, 'sawtooth', .2) },
      hurt: () => { tone(180, 70, .25, 'sawtooth', .35); noise(.15, .2, 500, 200) }, shoot: () => tone(520, 260, .12, 'triangle', .08),
      combo: () => { tone(110, 440, .5, 'sawtooth', .25); tone(220, 880, .5, 'square', .1); noise(.5, .3, 300, 3000) },
      boom: () => { tone(90, 25, .7, 'sine', .55); noise(.6, .4, 900, 80, 'lowpass') },
      roar: () => { tone(80, 35, 1.2, 'sawtooth', .4); noise(1, .3, 500, 100); tone(60, 30, 1.4, 'square', .15) }, horn: () => { tone(110, 110, .7, 'sawtooth', .18); tone(165, 165, .7, 'sawtooth', .1) },
      up: () => { [440, 554, 659, 880].forEach((f, i) => tone(f, f, .25, 'triangle', .12, i * .08)) }, over: () => { tone(200, 28, 1.8, 'sawtooth', .4); noise(1.5, .3, 800, 60, 'lowpass') }
    };
    function ping(k) { const f = { a: 523, s: 659, d: 440, f: 880 }[k]; tone(f, f * 1.5, .2, 'sine', .09) }
    const installButton=$('installApp');let installPrompt=null;addEventListener('beforeinstallprompt',e=>{e.preventDefault();installPrompt=e;installButton.style.display='inline-block'});installButton.addEventListener('click',async()=>{if(installPrompt){installPrompt.prompt();await installPrompt.userChoice;installPrompt=null}else toast('En el menú del navegador: “Añadir a pantalla de inicio” o “Instalar app”')});addEventListener('appinstalled',()=>{installButton.style.display='none';toast('APP INSTALADA')});if('serviceWorker' in navigator&&/^https?:$/.test(location.protocol))navigator.serviceWorker.register('./service-worker.js').catch(()=>{});installButton.style.display='inline-block';
    $('mute').addEventListener('click', () => { muted = !muted; $('mute').textContent = muted ? '🔇' : '🔊'; $('mute').setAttribute('aria-label',muted?'Activar sonido':'Silenciar sonido'); $('mute').title=muted?'Activar sonido':'Silenciar sonido'; if (master) master.gain.value = muted ? 0 : .6; initAudio() });
    let prev = performance.now();
    function showRuntimeError(error,source='JUEGO'){const message=(error&&error.message)||String(error||'Error desconocido');console.error('Demon-Snike '+source+':',error);let panel=$('runtimeError');if(!panel){panel=document.createElement('div');panel.id='runtimeError';panel.innerHTML='<b>ERROR DEL MOTOR</b><p></p><small>La partida se pausó para proteger tu progreso.</small><button type="button">VOLVER AL MENÚ</button>';document.body.appendChild(panel);panel.querySelector('button').addEventListener('click',()=>{panel.style.display='none';goHome()})}panel.querySelector('p').textContent=source+': '+message;panel.style.display='flex';state='pause'}window.addEventListener('error',e=>showRuntimeError(e.error||e.message,'JAVASCRIPT'));window.addEventListener('unhandledrejection',e=>showRuntimeError(e.reason,'PROMESA'));function loop(now) { const dt = Math.max(0, Math.min(.05, (now - prev) / 1000)); prev = now; try { slow = Math.min(1, slow + dt * .7); step(dt * slow); draw(now) } catch(error) { showRuntimeError(error,'RENDER / ACTUALIZACIÓN') } requestAnimationFrame(loop) }
    makePlayer();refreshHome();requestAnimationFrame(loop);
  