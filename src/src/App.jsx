import { useState, useEffect, useRef, useMemo } from "react";
import { AreaChart, Area, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine, Cell } from "recharts";

const GLOBAL_CSS = `
@import url('https://fonts.googleapis.com/css2?family=Orbitron:wght@400;500;600;700;900&family=Share+Tech+Mono&display=swap');
*{box-sizing:border-box;margin:0;padding:0}
html,body,#root{background:#02090f;color:#c5e8ff;font-family:'Share Tech Mono',monospace;min-height:100vh}
::-webkit-scrollbar{width:3px;height:3px}
::-webkit-scrollbar-track{background:#02090f}
::-webkit-scrollbar-thumb{background:rgba(0,170,255,0.35);border-radius:2px}
select option{background:#060f1a}
input[type=date]::-webkit-calendar-picker-indicator{filter:invert(0.5) sepia(1) saturate(3) hue-rotate(190deg);cursor:pointer}
input[type=file]{display:none}
@keyframes fadeUp{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}
@keyframes pulse{0%,100%{opacity:1}50%{opacity:0.35}}
@keyframes glow{0%,100%{box-shadow:0 0 8px rgba(0,170,255,0.15)}50%{box-shadow:0 0 18px rgba(0,170,255,0.3)}}
@keyframes spin{to{transform:rotate(360deg)}}
.fade-in{animation:fadeUp .28s ease forwards}
.blink{animation:pulse 1.6s ease infinite}
.glow-border{animation:glow 3s ease infinite}
.spin{animation:spin .8s linear infinite}
`;

// ─── CONSTANTS ───────────────────────────────────────────────────────────────
const STRATEGIES  = ['Trend Follow','Breakout','Reversal','Scalp','Swing','Mean Reversion','News/Event','Gap Play','VWAP Reclaim','Other'];
const SYMBOLS     = ['NAS100','SPX500'];
const SESSIONS    = ['NY Open','NY Afternoon','London Open','LN/NY Overlap','Asia'];
const TIMEFRAMES  = ['1m','5m','15m','30m','1H','4H','Daily'];
const EMOTIONS    = ['😎 Confiant','😐 Neutre','😰 FOMO','😡 Revanche','😟 Hésitant','🤯 Surconfiant'];
const DAYS_FR     = ['Dim','Lun','Mar','Mer','Jeu','Ven','Sam'];

const DEMO_TRADES = [
  {id:1, date:'2026-04-02',symbol:'NAS100',direction:'Long', result:'+2.4',rValue:2.4, strategy:'Breakout',      session:'NY Open',      timeframe:'15m', emotion:'😎 Confiant',   notes:'Cassure HOD pré-market, volume fort à l\'open NY',status:'Closed'},
  {id:2, date:'2026-04-04',symbol:'SPX500',direction:'Short',result:'+1.8',rValue:1.8, strategy:'Reversal',      session:'LN/NY Overlap', timeframe:'1H',  emotion:'😎 Confiant',   notes:'Double top H1 + RSI divergence bearish, FOMC hawkish',status:'Closed'},
  {id:3, date:'2026-04-08',symbol:'NAS100',direction:'Long', result:'-1',  rValue:-1,  strategy:'VWAP Reclaim',  session:'NY Open',      timeframe:'5m',  emotion:'😰 FOMO',       notes:'Reclaim VWAP raté, stop claqué sous le niveau',status:'Closed'},
  {id:4, date:'2026-04-11',symbol:'NAS100',direction:'Short',result:'+1.6',rValue:1.6, strategy:'Reversal',      session:'NY Afternoon', timeframe:'1H',  emotion:'😐 Neutre',      notes:'Rejet résistance daily + CPI chaud',status:'Closed'},
  {id:5, date:'2026-04-16',symbol:'SPX500',direction:'Long', result:'+2.1',rValue:2.1, strategy:'Trend Follow',  session:'LN/NY Overlap', timeframe:'4H',  emotion:'😎 Confiant',   notes:'Support EMA 50 daily tenu, FOMC dovish pivot',status:'Closed'},
  {id:6, date:'2026-04-22',symbol:'NAS100',direction:'Long', result:'+3.2',rValue:3.2, strategy:'Breakout',      session:'NY Open',      timeframe:'15m', emotion:'😎 Confiant',   notes:'ATH breakout sur volume, momentum IA (NVDA beat)',status:'Closed'},
  {id:7, date:'2026-04-25',symbol:'SPX500',direction:'Long', result:'-1',  rValue:-1,  strategy:'Scalp',         session:'NY Open',      timeframe:'5m',  emotion:'😰 FOMO',       notes:'Scalp NY open raté, stop trop serré',status:'Closed'},
  {id:8, date:'2026-04-29',symbol:'NAS100',direction:'Short',result:'+2.6',rValue:2.6, strategy:'Swing',         session:'London Open',  timeframe:'4H',  emotion:'😎 Confiant',   notes:'Swing short : divergence hebdo, OB D1',status:'Closed'},
  {id:9, date:'2026-05-06',symbol:'SPX500',direction:'Long', result:'+1.9',rValue:1.9, strategy:'Gap Play',      session:'NY Open',      timeframe:'15m', emotion:'😐 Neutre',      notes:'Gap fill haussier post-NFP',status:'Closed'},
  {id:10,date:'2026-05-12',symbol:'NAS100',direction:'Long', result:'+1.7',rValue:1.7, strategy:'VWAP Reclaim',  session:'NY Open',      timeframe:'5m',  emotion:'😎 Confiant',   notes:'Reclaim VWAP NY + bull flag 15m',status:'Closed'},
  {id:11,date:'2026-05-19',symbol:'SPX500',direction:'Short',result:'-1',  rValue:-1,  strategy:'Mean Reversion',session:'NY Afternoon', timeframe:'1H',  emotion:'😡 Revanche',   notes:'Extension +3σ BB daily, fade le spike macro',status:'Closed'},
  {id:12,date:'2026-05-26',symbol:'NAS100',direction:'Long', result:'',    rValue:null,strategy:'Swing',         session:'NY Open',      timeframe:'4H',  emotion:'😎 Confiant',   notes:'Holding : structure haussière intacte, target +3R',status:'Open'},
  {id:13,date:'2026-05-27',symbol:'SPX500',direction:'Long', result:'',    rValue:null,strategy:'Trend Follow',  session:'LN/NY Overlap', timeframe:'1H',  emotion:'😐 Neutre',      notes:'Breakout zone 5400, stop sous EMA 8h',status:'Open'},
];

// ─── HELPERS ─────────────────────────────────────────────────────────────────
const parseR = s => { if(!s&&s!==0) return null; const v=parseFloat(String(s).replace('R','')); return isNaN(v)?null:v; };
const fmtR   = v => v===null||v===undefined ? '—' : (v>=0?'+':'')+Number(v).toFixed(1)+'R';
const today  = () => new Date().toISOString().split('T')[0];
const curYM  = () => new Date().toISOString().slice(0,7);
const getDOW = dateStr => new Date(dateStr+'T12:00:00').getDay();

const EMPTY = {date:today(),symbol:'NAS100',direction:'Long',status:'Closed',result:'',strategy:'Breakout',session:'NY Open',timeframe:'15m',emotion:'😐 Neutre',notes:'',retro:''};

const toBase64 = file => new Promise((res,rej)=>{ const r=new FileReader(); r.onload=()=>res(r.result); r.onerror=rej; r.readAsDataURL(file); });

// ─── IMAGE RESIZE ─────────────────────────────────────────────────────────────
async function resizeImage(dataUrl, maxPx=1200) {
  return new Promise(res => {
    const img = new Image();
    img.onload = () => {
      const scale = Math.min(1, maxPx/Math.max(img.width,img.height));
      const w=Math.round(img.width*scale), h=Math.round(img.height*scale);
      const c=document.createElement('canvas'); c.width=w; c.height=h;
      c.getContext('2d').drawImage(img,0,0,w,h);
      res(c.toDataURL('image/jpeg',0.85));
    };
    img.onerror = ()=>res(dataUrl);
    img.src = dataUrl;
  });
}

// ─── AI ANALYSIS ─────────────────────────────────────────────────────────────
async function analyzeChart(dataUrl, trade) {
  const resized = await resizeImage(dataUrl);
  const b64 = resized.split(',')[1];
  const prompt = `Tu es un mentor de trading expert sur les indices US (NAS100 / SPX500).

Données du trade :
- Instrument : ${trade.symbol} | Direction : ${trade.direction}
- Résultat : ${trade.result||'ouvert'} (${trade.rValue!==null?fmtR(trade.rValue):'en cours'})
- Stratégie : ${trade.strategy} | Session : ${trade.session||'—'} | Timeframe : ${trade.timeframe||'—'}
- État émotionnel : ${trade.emotion||'—'}
- Notes : "${trade.notes||'aucune'}"
- Relecture à froid (24h après) : "${trade.retro||'non remplie'}"

Analyse le screenshot en 5 points directs avec bullet "•" :
1. **Setup visible** : pattern, structure, contexte marché
2. **Qualité d'exécution** : timing, confluences présentes ou manquantes
3. **Gestion du trade** : stop, tenue de position
4. **Points positifs** : ce qui a bien été fait
5. **À améliorer** : erreur principale ou optimisation clé

Mentor exigeant, 130 mots max, français.`;

  const res = await fetch("https://api.anthropic.com/v1/messages",{
    method:"POST",
    headers:{"Content-Type":"application/json","anthropic-version":"2023-06-01"},
    body:JSON.stringify({model:"claude-sonnet-4-20250514",max_tokens:1000,messages:[{role:"user",content:[
      {type:"image",source:{type:"base64",media_type:"image/jpeg",data:b64}},
      {type:"text",text:prompt}
    ]}]})
  });
  if(!res.ok){const e=await res.json().catch(()=>({}));throw new Error(e?.error?.message||`HTTP ${res.status}`);}
  const data=await res.json();
  if(data.type==='error') throw new Error(data.error?.message||'Erreur API');
  return data.content?.find(b=>b.type==='text')?.text||"Aucune réponse.";
}

// ─── UI ATOMS ─────────────────────────────────────────────────────────────────
const CyTooltip = ({active,payload,label}) => {
  if(!active||!payload?.length) return null;
  const v=payload[0]?.value;
  return <div style={{background:'#060f1a',border:'1px solid rgba(0,170,255,0.3)',padding:'8px 12px',borderRadius:2,fontFamily:'Share Tech Mono,monospace',fontSize:11}}><div style={{color:'#3a6b8a',marginBottom:4}}>{label}</div><div style={{color:v>=0?'#00ffa3':'#ff2255'}}>{typeof v==='number'?fmtR(v):v}</div></div>;
};

const FF = ({label,value,onChange,type='text',placeholder=''}) => (
  <div>
    <div style={{fontFamily:'Orbitron,sans-serif',fontSize:8,letterSpacing:2,color:'#3a6b8a',textTransform:'uppercase',marginBottom:5}}>{label}</div>
    <input type={type} value={value} onChange={e=>onChange(e.target.value)} placeholder={placeholder}
      style={{width:'100%',background:'#081625',border:'1px solid rgba(0,170,255,0.13)',color:'#c5e8ff',fontFamily:'Share Tech Mono,monospace',fontSize:12,padding:'8px 10px',borderRadius:2,outline:'none',transition:'border-color .2s'}}
      onFocus={e=>e.target.style.borderColor='rgba(0,170,255,0.45)'}
      onBlur={e=>e.target.style.borderColor='rgba(0,170,255,0.13)'}/>
  </div>
);

const SelectF = ({label,value,onChange,options}) => (
  <div>
    <div style={{fontFamily:'Orbitron,sans-serif',fontSize:8,letterSpacing:2,color:'#3a6b8a',textTransform:'uppercase',marginBottom:5}}>{label}</div>
    <select value={value} onChange={e=>onChange(e.target.value)} style={{width:'100%',background:'#081625',border:'1px solid rgba(0,170,255,0.13)',color:'#c5e8ff',fontFamily:'Share Tech Mono,monospace',fontSize:12,padding:'8px 10px',borderRadius:2,outline:'none'}}>
      {options.map(o=><option key={o}>{o}</option>)}
    </select>
  </div>
);

const StatCard = ({label,value,sub,color,icon}) => (
  <div style={{background:'#060f1a',border:'1px solid rgba(0,170,255,0.09)',borderRadius:3,padding:'14px 16px',position:'relative',overflow:'hidden',transition:'border-color .2s'}}
    onMouseEnter={e=>e.currentTarget.style.borderColor='rgba(0,170,255,0.22)'}
    onMouseLeave={e=>e.currentTarget.style.borderColor='rgba(0,170,255,0.09)'}>
    <div style={{position:'absolute',top:0,left:0,right:0,height:1,background:'linear-gradient(90deg,transparent,rgba(0,170,255,0.35),transparent)'}}/>
    <div style={{position:'absolute',top:0,right:0,width:40,height:40,background:`radial-gradient(circle at 100% 0%,${color}12 0%,transparent 70%)`}}/>
    <div style={{fontFamily:'Orbitron,sans-serif',fontSize:8,letterSpacing:2.5,color:'#3a6b8a',textTransform:'uppercase',marginBottom:9}}>{icon} {label}</div>
    <div style={{fontFamily:'Orbitron,sans-serif',fontSize:18,fontWeight:700,color,letterSpacing:.5,lineHeight:1}}>{value}</div>
    {sub&&<div style={{fontSize:9,color:'#2a4f68',marginTop:5}}>{sub}</div>}
  </div>
);

const Badge = ({children,color,bg,border}) => (
  <span style={{background:bg,color,fontFamily:'Orbitron,sans-serif',fontSize:8,letterSpacing:1,padding:'2px 7px',borderRadius:2,border:`1px solid ${border}`,whiteSpace:'nowrap'}}>{children}</span>
);

const ToggleBtn = ({label,active,activeColor,activeBg,activeBorder,onClick}) => (
  <button onClick={onClick} style={{flex:1,padding:'7px 0',border:`1px solid ${active?activeBorder:'rgba(0,170,255,0.12)'}`,background:active?activeBg:'transparent',color:active?activeColor:'#3a6b8a',fontFamily:'Orbitron,sans-serif',fontSize:9,letterSpacing:1,cursor:'pointer',borderRadius:2,textTransform:'uppercase',transition:'all .15s'}}>{label}</button>
);

const SectionTitle = ({children}) => (
  <div style={{fontFamily:'Orbitron,sans-serif',fontSize:9,letterSpacing:2.5,color:'#3a6b8a',marginBottom:14,textTransform:'uppercase'}}>{children}</div>
);

const Card = ({children}) => (
  <div style={{background:'#060f1a',border:'1px solid rgba(0,170,255,0.09)',borderRadius:3,padding:16}}>{children}</div>
);

// ─── MAIN ──────────────────────────────────────────────────────────────────────
export default function TradingJournal() {
  const [trades,    setTrades]    = useState([]);
  const [loaded,    setLoaded]    = useState(false);
  const [showForm,  setShowForm]  = useState(false);
  const [editId,    setEditId]    = useState(null);
  const [form,      setForm]      = useState(EMPTY);
  const [formImage, setFormImage] = useState(null);
  const [tab,       setTab]       = useState('dashboard');
  const [filter,    setFilter]    = useState('');
  const [symFilter, setSymFilter] = useState('ALL');
  const [sort,      setSort]      = useState({field:'date',dir:'desc'});
  const [confirm,   setConfirm]   = useState(null);
  const [detail,    setDetail]    = useState(null);
  const [detailImg, setDetailImg] = useState(null);
  const [aiText,    setAiText]    = useState('');
  const [aiLoading, setAiLoading] = useState(false);
  const fileRef = useRef();

  // ── Storage ───────────────────────────────────────────────────────────────
  useEffect(()=>{
    (async()=>{
      try { const r=await window.storage.get('nexus-trades-v3'); setTrades(r?.value?JSON.parse(r.value):DEMO_TRADES); }
      catch { setTrades(DEMO_TRADES); }
      setLoaded(true);
    })();
  },[]);

  const ok = () => typeof window!=='undefined'&&window.storage;
  const persist = async next => {
    setTrades(next);
    if(ok()) try{ await window.storage.set('nexus-trades-v3',JSON.stringify(next)); }catch(e){ console.warn(e); }
  };
  const saveImg   = async(id,url)=>{ if(ok()) try{ await window.storage.set(`ni-${id}`,url); }catch{} };
  const loadImg   = async id=>{ if(!ok()) return null; try{ const r=await window.storage.get(`ni-${id}`); return r?.value||null; }catch{ return null; } };
  const deleteImg = async id=>{ if(ok()) try{ await window.storage.delete(`ni-${id}`); }catch{} };

  // ── Form ──────────────────────────────────────────────────────────────────
  const openAdd  = ()=>{ setEditId(null); setForm(Object.assign({},EMPTY,{date:today()})); setFormImage(null); setShowForm(true); };
  const openEdit = async t=>{ setEditId(t.id); setForm({date:t.date,symbol:t.symbol,direction:t.direction,status:t.status,result:t.result||'',strategy:t.strategy,session:t.session||'NY Open',timeframe:t.timeframe||'15m',emotion:t.emotion||'😐 Neutre',notes:t.notes||'',retro:t.retro||''}); setFormImage(await loadImg(t.id)); setShowForm(true); };
  const setF = (k,v) => setForm(f=>Object.assign({},f,{[k]:v}));
  const handleImg = async e=>{ const f=e.target.files?.[0]; if(!f) return; setFormImage(await toBase64(f)); e.target.value=''; };

  const submitForm = async()=>{
    if(!form.date||!form.symbol) return;
    const id=editId||Date.now();
    const trade={id,date:form.date,symbol:form.symbol,direction:form.direction,status:form.status,result:form.result.trim(),rValue:parseR(form.result),strategy:form.strategy,session:form.session,timeframe:form.timeframe,emotion:form.emotion,notes:form.notes,retro:form.retro||'',hasImage:!!formImage};
    const next=editId?trades.map(t=>t.id===editId?trade:t):[...trades,trade];
    setTrades(next); setShowForm(false);
    if(ok()) try{ await window.storage.set('nexus-trades-v3',JSON.stringify(next)); }catch(e){ console.warn(e); }
    if(formImage) await saveImg(id,formImage); else if(editId) await deleteImg(id);
  };

  const doDelete = async id=>{
    const next=trades.filter(t=>t.id!==id); setTrades(next); setConfirm(null);
    if(ok()) try{ await window.storage.set('nexus-trades-v3',JSON.stringify(next)); }catch{}
    await deleteImg(id);
  };

  const openDetail = async t=>{ setDetail(t); setAiText(''); setAiLoading(false); setDetailImg(await loadImg(t.id)); };

  const runAnalysis = async()=>{
    if(!detailImg||!detail) return;
    setAiLoading(true); setAiText('');
    try { setAiText(await analyzeChart(detailImg,detail)); }
    catch(e){ setAiText(`⚠ Erreur : ${e.message}`); }
    setAiLoading(false);
  };

  // ── Stats ─────────────────────────────────────────────────────────────────
  const stats = useMemo(()=>{
    const closed = trades.filter(t=>t.status==='Closed'&&t.rValue!==null);
    const rVals  = closed.map(t=>t.rValue);
    const wins   = rVals.filter(v=>v>0), losses=rVals.filter(v=>v<0);
    const totalR = rVals.reduce((a,b)=>a+b,0);
    const winRate= closed.length?(wins.length/closed.length)*100:0;
    const avgR   = rVals.length?totalR/rVals.length:0;
    const gw=wins.reduce((a,b)=>a+b,0), gl=Math.abs(losses.reduce((a,b)=>a+b,0));
    const pf=gl>0?gw/gl:wins.length>0?99:0;
    const ym=curYM();
    const monthR=closed.filter(t=>t.date.startsWith(ym)).reduce((a,t)=>a+t.rValue,0);

    // R Curve
    const sorted=[...closed].sort((a,b)=>a.date.localeCompare(b.date));
    let cum=0;
    const curve=sorted.map(t=>{ cum=parseFloat((cum+t.rValue).toFixed(2)); return{label:t.date.slice(5),cumR:cum,sym:t.symbol}; });

    // By symbol
    const bySym={};
    closed.forEach(t=>{ bySym[t.symbol]=(bySym[t.symbol]||0)+t.rValue; });
    const symbolBars=Object.entries(bySym).map(([s,v])=>({symbol:s,r:parseFloat(v.toFixed(2))}));

    // Daily R
    const byDay={};
    closed.forEach(t=>{ byDay[t.date]=(byDay[t.date]||0)+t.rValue; });
    const dailyBars=Object.entries(byDay).sort((a,b)=>a[0].localeCompare(b[0])).map(([d,v])=>({day:d.slice(5),r:parseFloat(v.toFixed(2))}));

    // By strategy
    const byStrat={};
    closed.forEach(t=>{ if(!byStrat[t.strategy]) byStrat[t.strategy]={r:0,count:0,wins:0}; byStrat[t.strategy].r+=t.rValue; byStrat[t.strategy].count++; if(t.rValue>0) byStrat[t.strategy].wins++; });

    // ── NEW: Win rate by session ──
    const bySession={};
    closed.forEach(t=>{
      const s=t.session||'Unknown';
      if(!bySession[s]) bySession[s]={r:0,count:0,wins:0};
      bySession[s].r+=t.rValue; bySession[s].count++;
      if(t.rValue>0) bySession[s].wins++;
    });
    const sessionBars=Object.entries(bySession).map(([s,v])=>({session:s,winRate:v.count?parseFloat(((v.wins/v.count)*100).toFixed(1)):0,r:parseFloat(v.r.toFixed(2)),count:v.count}));

    // ── NEW: R Distribution by month ──
    const buckets=[
      {label:'< -2R',min:-Infinity,max:-2},
      {label:'-2R→-1R',min:-2,max:-1},
      {label:'-1R→0',min:-1,max:0},
      {label:'0→+1R',min:0,max:1},
      {label:'+1R→+2R',min:1,max:2},
      {label:'+2R→+3R',min:2,max:3},
      {label:'> +3R',min:3,max:Infinity},
    ];
    const ymTrades=closed.filter(t=>t.date.startsWith(ym));
    const distData=buckets.map(b=>({
      label:b.label,
      count:ymTrades.filter(t=>t.rValue>b.min&&t.rValue<=b.max).length,
      pos:b.min>=0,
    }));

    // ── NEW: Streak tracker ──
    const sortedAll=[...closed].sort((a,b)=>a.date.localeCompare(b.date));
    let curStreak=0,maxWin=0,maxLoss=0,tmpW=0,tmpL=0;
    sortedAll.forEach(t=>{
      if(t.rValue>0){ tmpW++; tmpL=0; if(tmpW>maxWin) maxWin=tmpW; }
      else{ tmpL++; tmpW=0; if(tmpL>maxLoss) maxLoss=tmpL; }
    });
    // current streak (from end)
    let i=sortedAll.length-1; curStreak=0;
    if(i>=0){
      const lastWin=sortedAll[i].rValue>0;
      while(i>=0&&(sortedAll[i].rValue>0)===lastWin){ curStreak++; i--; }
      if(!lastWin) curStreak=-curStreak;
    }

    // ── NEW: Heatmap day x session ──
    const heatmap={};
    DAYS_FR.forEach((d,di)=>{ heatmap[di]={}; SESSIONS.forEach(s=>{ heatmap[di][s]={r:0,count:0}; }); });
    closed.forEach(t=>{
      const dow=getDOW(t.date), ses=t.session||'NY Open';
      if(heatmap[dow]&&heatmap[dow][ses]!==undefined){ heatmap[dow][ses].r+=t.rValue; heatmap[dow][ses].count++; }
    });

    // ── NEW: By emotion ──
    const byEmotion={};
    closed.forEach(t=>{
      const e=t.emotion||'Unknown';
      if(!byEmotion[e]) byEmotion[e]={r:0,count:0,wins:0};
      byEmotion[e].r+=t.rValue; byEmotion[e].count++;
      if(t.rValue>0) byEmotion[e].wins++;
    });

    return{totalR,monthR,winRate,avgR,pf:isFinite(pf)?pf:99,totalTrades:trades.length,closedTrades:closed.length,openTrades:trades.filter(t=>t.status==='Open').length,wins:wins.length,losses:losses.length,curve,symbolBars,dailyBars,byStrat,sessionBars,distData,curStreak,maxWin,maxLoss,heatmap,byEmotion};
  },[trades]);

  // ── Filter / sort ─────────────────────────────────────────────────────────
  const filtered=useMemo(()=>{
    let list=[...trades];
    if(filter) list=list.filter(t=>t.strategy.toLowerCase().includes(filter.toLowerCase())||(t.notes||'').toLowerCase().includes(filter.toLowerCase())||(t.session||'').toLowerCase().includes(filter.toLowerCase()));
    if(symFilter!=='ALL') list=list.filter(t=>t.symbol===symFilter);
    list.sort((a,b)=>{ let av=sort.field==='r'?(a.rValue??-Infinity):a[sort.field]??'', bv=sort.field==='r'?(b.rValue??-Infinity):b[sort.field]??''; if(typeof av==='string') return sort.dir==='asc'?av.localeCompare(bv):bv.localeCompare(av); return sort.dir==='asc'?av-bv:bv-av; });
    return list;
  },[trades,filter,symFilter,sort]);

  const toggleSort=f=>setSort(s=>({field:f,dir:s.field===f&&s.dir==='desc'?'asc':'desc'}));

  if(!loaded) return <div style={{background:'#02090f',height:'100vh',display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',gap:16}}><div style={{fontFamily:'Orbitron,sans-serif',fontSize:12,letterSpacing:4,color:'#00aaff'}}>NEXUS TRADE</div><div style={{fontFamily:'Orbitron,sans-serif',fontSize:9,letterSpacing:3,color:'#3a6b8a'}}>LOADING...</div></div>;

  const tc=stats.totalR>=0?'#00ffa3':'#ff2255', mc=stats.monthR>=0?'#00ffa3':'#ff2255';
  const sc=stats.curStreak>0?'#00ffa3':stats.curStreak<0?'#ff2255':'#3a6b8a';
  const TABS=['dashboard','journal','analytics'];

  // heatmap color helper
  const heatColor=(r,count)=>{ if(!count) return 'rgba(0,170,255,0.03)'; if(r>0) return `rgba(0,255,163,${Math.min(0.6,0.1+r*0.12)})`; return `rgba(255,34,85,${Math.min(0.55,0.1+Math.abs(r)*0.12)})`; };

  // Table cols
  const baseCols=[{k:'date',l:'Date'},{k:'symbol',l:'Symbol'},{k:'direction',l:'Dir'},{k:'session',l:'Session'},{k:'timeframe',l:'TF'},{k:'r',l:'R'},{k:'emotion',l:'Émotion'},{k:'status',l:'Status'},{k:'_img',l:'📷'},{k:'_a',l:''}];
  const fullCols=[{k:'date',l:'Date'},{k:'symbol',l:'Symbol'},{k:'direction',l:'Dir'},{k:'session',l:'Session'},{k:'timeframe',l:'TF'},{k:'r',l:'R'},{k:'strategy',l:'Stratégie'},{k:'emotion',l:'Émotion'},{k:'notes',l:'Notes'},{k:'status',l:'Status'},{k:'_img',l:'📷'},{k:'_a',l:''}];

  const TH=({col})=>(
    <th onClick={col.k!=='_a'&&col.k!=='_img'?()=>toggleSort(col.k):undefined}
      style={{fontFamily:'Orbitron,sans-serif',fontSize:8,letterSpacing:2,color:'#3a6b8a',textTransform:'uppercase',padding:'9px 10px',textAlign:'left',borderBottom:'1px solid rgba(0,170,255,0.09)',cursor:col.k!=='_a'&&col.k!=='_img'?'pointer':'default',whiteSpace:'nowrap',userSelect:'none'}}>
      {col.l}{sort.field===col.k&&<span style={{marginLeft:4,color:'#00aaff'}}>{sort.dir==='asc'?'▲':'▼'}</span>}
    </th>
  );

  const renderRow=(t,cols)=>{
    const rVal=t.rValue, isOpen=t.status==='Open';
    return(
      <tr key={t.id} onClick={()=>openDetail(t)} style={{transition:'background .15s',cursor:'pointer'}}
        onMouseEnter={e=>e.currentTarget.style.background='rgba(0,170,255,0.05)'}
        onMouseLeave={e=>e.currentTarget.style.background='transparent'}>
        {cols.map(c=>{
          const td=(content)=><td key={c.k} style={{padding:'9px 10px',borderBottom:'1px solid rgba(0,170,255,0.04)',whiteSpace:'nowrap'}}>{content}</td>;
          if(c.k==='date')      return td(<span style={{fontSize:11,color:'#3a6b8a'}}>{t.date}</span>);
          if(c.k==='symbol')    return td(<span style={{fontFamily:'Orbitron,sans-serif',fontSize:11,fontWeight:600,letterSpacing:1,color:t.symbol==='NAS100'?'#00aaff':'#ffc800'}}>{t.symbol}</span>);
          if(c.k==='direction') return td(<Badge color={t.direction==='Long'?'#00ffa3':'#ff2255'} bg={t.direction==='Long'?'rgba(0,255,163,0.08)':'rgba(255,34,85,0.08)'} border={t.direction==='Long'?'rgba(0,255,163,0.2)':'rgba(255,34,85,0.2)'}>{t.direction==='Long'?'▲':'▼'} {t.direction}</Badge>);
          if(c.k==='session')   return td(<span style={{fontSize:9,color:'#3a6b8a'}}>{t.session||'—'}</span>);
          if(c.k==='timeframe') return td(<span style={{fontFamily:'Orbitron,sans-serif',fontSize:9,color:'rgba(0,170,255,0.7)'}}>{t.timeframe||'—'}</span>);
          if(c.k==='r')         return td(isOpen?<Badge color='#ffc800' bg='rgba(255,200,0,0.08)' border='rgba(255,200,0,0.2)'>◉ EN COURS</Badge>:<span style={{fontFamily:'Orbitron,sans-serif',fontSize:12,fontWeight:700,color:rVal>=0?'#00ffa3':'#ff2255'}}>{fmtR(rVal)}</span>);
          if(c.k==='strategy')  return td(<span style={{fontSize:9,color:'#3a6b8a'}}>{t.strategy}</span>);
          if(c.k==='emotion')   return td(<span style={{fontSize:11}}>{t.emotion||'—'}</span>);
          if(c.k==='notes')     return td(<span style={{fontSize:10,color:'#2a4f68',maxWidth:180,overflow:'hidden',textOverflow:'ellipsis',display:'block'}}>{t.notes||'—'}</span>);
          if(c.k==='status')    return td(isOpen?<Badge color='#ffc800' bg='rgba(255,200,0,0.08)' border='rgba(255,200,0,0.2)'>◉ LIVE</Badge>:<Badge color='#3a6b8a' bg='rgba(58,107,138,0.1)' border='rgba(58,107,138,0.2)'>✓ DONE</Badge>);
          if(c.k==='_img')      return td(<button onClick={e=>{e.stopPropagation();openDetail(t);}} style={{background:t.hasImage?'rgba(0,170,255,0.1)':'transparent',border:`1px solid ${t.hasImage?'rgba(0,170,255,0.35)':'rgba(0,170,255,0.1)'}`,color:t.hasImage?'#00aaff':'#3a6b8a',borderRadius:2,cursor:'pointer',padding:'3px 8px',fontSize:11,transition:'all .15s'}}>{t.hasImage?'📷':'⊕'}</button>);
          if(c.k==='_a')        return td(<div style={{display:'flex',gap:5}}><button onClick={e=>{e.stopPropagation();openEdit(t);}} style={{background:'transparent',border:'none',color:'#3a6b8a',cursor:'pointer',fontSize:14,transition:'color .15s'}} onMouseEnter={e=>e.target.style.color='#00aaff'} onMouseLeave={e=>e.target.style.color='#3a6b8a'}>✎</button><button onClick={e=>{e.stopPropagation();setConfirm(t.id);}} style={{background:'transparent',border:'none',color:'rgba(255,34,85,0.35)',cursor:'pointer',fontSize:14,transition:'color .15s'}} onMouseEnter={e=>e.target.style.color='#ff2255'} onMouseLeave={e=>e.target.style.color='rgba(255,34,85,0.35)'}>✕</button></div>);
          return null;
        })}
      </tr>
    );
  };


  return (
    <div style={{minHeight:'100vh',background:'#02090f',backgroundImage:'radial-gradient(ellipse at 12% 0%,rgba(0,80,200,0.07) 0%,transparent 50%),radial-gradient(ellipse at 88% 100%,rgba(0,40,160,0.05) 0%,transparent 50%),linear-gradient(rgba(0,170,255,0.016) 1px,transparent 1px),linear-gradient(90deg,rgba(0,170,255,0.016) 1px,transparent 1px)',backgroundSize:'auto,auto,48px 48px,48px 48px',fontFamily:'Share Tech Mono,monospace',color:'#c5e8ff',padding:'16px',paddingBottom:48}}>
      <style>{GLOBAL_CSS}</style>

      {/* ── HEADER ──────────────────────────────────────────────────────── */}
      <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:20,flexWrap:'wrap',gap:12}}>
        <div style={{display:'flex',alignItems:'center',gap:16,flexWrap:'wrap'}}>
          <div>
            <div style={{fontFamily:'Orbitron,sans-serif',fontWeight:900,fontSize:17,letterSpacing:4,color:'#00aaff',lineHeight:1}}>NEXUS<span style={{color:'#c5e8ff',fontWeight:400}}> TRADE</span></div>
            <div style={{fontFamily:'Orbitron,sans-serif',fontSize:7,letterSpacing:5,color:'#3a6b8a',marginTop:2}}>JOURNAL · R-BASED · v4.0</div>
          </div>
          <div style={{width:1,height:30,background:'rgba(0,170,255,0.15)'}}/>
          <div style={{display:'flex',gap:0}}>
            {TABS.map(t=><button key={t} onClick={()=>setTab(t)} style={{fontFamily:'Orbitron,sans-serif',fontSize:9,letterSpacing:2,textTransform:'uppercase',padding:'7px 14px',background:'transparent',border:'none',cursor:'pointer',borderBottom:`2px solid ${tab===t?'#00aaff':'transparent'}`,color:tab===t?'#00aaff':'#3a6b8a',transition:'all .2s'}}>{t}</button>)}
          </div>
        </div>
        <div style={{display:'flex',alignItems:'center',gap:12}}>
          <div style={{fontSize:9,fontFamily:'Orbitron,sans-serif',letterSpacing:1,color:'#3a6b8a'}}><span className="blink" style={{color:'#00ffa3',marginRight:5}}>◉</span>{stats.openTrades} LIVE</div>
          <div style={{width:1,height:24,background:'rgba(0,170,255,0.12)'}}/>
          <div style={{fontFamily:'Orbitron,sans-serif',fontSize:9,color:tc}}>{fmtR(stats.totalR)} TOTAL</div>
          <button onClick={openAdd} className="glow-border" onMouseEnter={e=>e.currentTarget.style.background='rgba(0,170,255,0.12)'} onMouseLeave={e=>e.currentTarget.style.background='transparent'} style={{background:'transparent',border:'1px solid #00aaff',color:'#00aaff',fontFamily:'Orbitron,sans-serif',fontSize:10,letterSpacing:2,padding:'8px 18px',cursor:'pointer',textTransform:'uppercase',borderRadius:2,transition:'background .2s'}}>＋ ADD TRADE</button>
        </div>
      </div>

      {/* ── STATS ROW ────────────────────────────────────────────────────── */}
      <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(140px,1fr))',gap:10,marginBottom:18}}>
        <StatCard label="R Total"      value={fmtR(stats.totalR)}        sub={`${stats.closedTrades} trades fermés`} color={tc}    icon="◈"/>
        <StatCard label="R ce mois"    value={fmtR(stats.monthR)}        sub={new Date().toLocaleString('fr',{month:'long'})} color={mc} icon="◈"/>
        <StatCard label="Win Rate"     value={`${stats.winRate.toFixed(1)}%`} sub={`${stats.wins}W · ${stats.losses}L`}     color='#00aaff' icon="◈"/>
        <StatCard label="Avg R"        value={fmtR(stats.avgR)}          sub="Moyenne par trade"   color={stats.avgR>=0?'#00ffa3':'#ff2255'} icon="◈"/>
        <StatCard label="Profit Factor" value={stats.pf===99?'∞':stats.pf.toFixed(2)} sub="W R / L R"         color='#00aaff' icon="◈"/>
        <StatCard label="Streak"
          value={stats.curStreak===0?'—':`${stats.curStreak>0?'+':''}${stats.curStreak}`}
          sub={`Max W:${stats.maxWin} · Max L:${stats.maxLoss}`} color={sc} icon="◈"/>
      </div>

      {/* ══ DASHBOARD ════════════════════════════════════════════════════ */}
      {tab==='dashboard'&&(
        <div className="fade-in">
          <div style={{display:'grid',gridTemplateColumns:'3fr 2fr',gap:12,marginBottom:14}}>
            <Card>
              <SectionTitle>◈ COURBE R CUMULATIF</SectionTitle>
              {stats.curve.length>0?(
                <ResponsiveContainer width="100%" height={170}>
                  <AreaChart data={stats.curve} margin={{top:4,right:4,bottom:0,left:0}}>
                    <defs><linearGradient id="rg" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor={tc} stopOpacity={0.25}/><stop offset="95%" stopColor={tc} stopOpacity={0}/></linearGradient></defs>
                    <XAxis dataKey="label" tick={{fill:'#3a6b8a',fontSize:9,fontFamily:'Share Tech Mono'}} axisLine={false} tickLine={false} interval="preserveStartEnd"/>
                    <YAxis tick={{fill:'#3a6b8a',fontSize:9,fontFamily:'Share Tech Mono'}} axisLine={false} tickLine={false} tickFormatter={v=>`${v>=0?'+':''}${v.toFixed(0)}R`} width={44}/>
                    <Tooltip content={<CyTooltip/>}/>
                    <ReferenceLine y={0} stroke="rgba(255,255,255,0.06)" strokeDasharray="4 4"/>
                    <Area type="monotone" dataKey="cumR" stroke={tc} strokeWidth={2} fill="url(#rg)" dot={false} activeDot={{r:3,fill:tc}}/>
                  </AreaChart>
                </ResponsiveContainer>
              ):<div style={{height:170,display:'flex',alignItems:'center',justifyContent:'center',color:'#3a6b8a',fontSize:11,fontFamily:'Orbitron,sans-serif',letterSpacing:2}}>AUCUNE DONNÉE</div>}
            </Card>
            <Card>
              <SectionTitle>◈ R PAR INSTRUMENT</SectionTitle>
              {stats.symbolBars.length>0?(
                <ResponsiveContainer width="100%" height={170}>
                  <BarChart data={stats.symbolBars} layout="vertical" margin={{top:4,right:12,bottom:0,left:0}}>
                    <XAxis type="number" tick={{fill:'#3a6b8a',fontSize:9,fontFamily:'Share Tech Mono'}} axisLine={false} tickLine={false} tickFormatter={v=>`${v>=0?'+':''}${v.toFixed(0)}R`}/>
                    <YAxis type="category" dataKey="symbol" tick={{fill:'#c5e8ff',fontSize:10,fontFamily:'Orbitron,sans-serif'}} axisLine={false} tickLine={false} width={62}/>
                    <Tooltip content={<CyTooltip/>}/>
                    <ReferenceLine x={0} stroke="rgba(255,255,255,0.06)"/>
                    <Bar dataKey="r" radius={[0,2,2,0]} maxBarSize={28}>{stats.symbolBars.map((e,i)=><Cell key={i} fill={e.symbol==='NAS100'?'#00aaff':'#ffc800'} fillOpacity={0.75}/>)}</Bar>
                  </BarChart>
                </ResponsiveContainer>
              ):<div style={{height:170,display:'flex',alignItems:'center',justifyContent:'center',color:'#3a6b8a',fontSize:11}}>AUCUNE DONNÉE</div>}
            </Card>
          </div>
          {/* Recent trades */}
          <Card>
            <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:14}}>
              <SectionTitle>◈ TRADES RÉCENTS</SectionTitle>
              {trades.length>5&&<button onClick={()=>setTab('journal')} style={{background:'transparent',border:'none',color:'#3a6b8a',fontSize:10,cursor:'pointer',transition:'color .2s',fontFamily:'Share Tech Mono,monospace'}} onMouseEnter={e=>e.target.style.color='#00aaff'} onMouseLeave={e=>e.target.style.color='#3a6b8a'}>→ Voir les {trades.length} trades</button>}
            </div>
            <div style={{overflowX:'auto'}}>
              <table style={{width:'100%',borderCollapse:'collapse'}}>
                <thead><tr>{baseCols.map(c=><TH key={c.k} col={c}/>)}</tr></thead>
                <tbody>{filtered.slice(0,7).map(t=>renderRow(t,baseCols))}</tbody>
              </table>
            </div>
          </Card>
        </div>
      )}

      {/* ══ JOURNAL ═════════════════════════════════════════════════════ */}
      {tab==='journal'&&(
        <div className="fade-in">
          <Card>
            <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:14,flexWrap:'wrap',gap:8}}>
              <SectionTitle>◈ TRADE LOG — {filtered.length} / {trades.length}</SectionTitle>
              <div style={{display:'flex',gap:8,flexWrap:'wrap',alignItems:'center'}}>
                <div style={{display:'flex',gap:5}}>
                  {['ALL','NAS100','SPX500'].map(s=><button key={s} onClick={()=>setSymFilter(s)} style={{fontFamily:'Orbitron,sans-serif',fontSize:8,letterSpacing:1.5,padding:'6px 12px',border:`1px solid ${symFilter===s?'rgba(0,170,255,0.45)':'rgba(0,170,255,0.1)'}`,background:symFilter===s?'rgba(0,170,255,0.1)':'transparent',color:symFilter===s?'#00aaff':'#3a6b8a',cursor:'pointer',borderRadius:2,textTransform:'uppercase',transition:'all .15s'}}>{s}</button>)}
                </div>
                <input placeholder="Filtrer stratégie / session / notes…" value={filter} onChange={e=>setFilter(e.target.value)} style={{background:'#081625',border:'1px solid rgba(0,170,255,0.13)',color:'#c5e8ff',fontFamily:'Share Tech Mono,monospace',fontSize:11,padding:'6px 10px',borderRadius:2,outline:'none',width:230}}/>
              </div>
            </div>
            <div style={{overflowX:'auto'}}>
              <table style={{width:'100%',borderCollapse:'collapse',minWidth:950}}>
                <thead><tr>{fullCols.map(c=><TH key={c.k} col={c}/>)}</tr></thead>
                <tbody>
                  {filtered.length===0&&<tr><td colSpan={fullCols.length} style={{padding:24,textAlign:'center',color:'#3a6b8a',fontSize:11,fontFamily:'Orbitron,sans-serif',letterSpacing:2}}>AUCUN TRADE</td></tr>}
                  {filtered.map(t=>renderRow(t,fullCols))}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      )}

      {/* ══ ANALYTICS ═══════════════════════════════════════════════════ */}
      {tab==='analytics'&&(
        <div className="fade-in" style={{display:'flex',flexDirection:'column',gap:12}}>

          {/* Row 1: Session win rate + R Distribution */}
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12}}>
            <Card>
              <SectionTitle>◈ WIN RATE PAR SESSION</SectionTitle>
              {stats.sessionBars.length>0?(
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={stats.sessionBars} margin={{top:4,right:4,bottom:24,left:0}}>
                    <XAxis dataKey="session" tick={{fill:'#3a6b8a',fontSize:9,fontFamily:'Share Tech Mono'}} axisLine={false} tickLine={false} angle={-25} textAnchor="end" interval={0}/>
                    <YAxis tick={{fill:'#3a6b8a',fontSize:9,fontFamily:'Share Tech Mono'}} axisLine={false} tickLine={false} tickFormatter={v=>`${v}%`} width={38} domain={[0,100]}/>
                    <Tooltip formatter={(v,n,p)=>[`${v}% (${p.payload.count} trades)`,'']} contentStyle={{background:'#060f1a',border:'1px solid rgba(0,170,255,0.3)',fontFamily:'Share Tech Mono,monospace',fontSize:11}}/>
                    <ReferenceLine y={50} stroke="rgba(255,255,255,0.07)" strokeDasharray="4 4"/>
                    <Bar dataKey="winRate" radius={[2,2,0,0]} maxBarSize={36}>{stats.sessionBars.map((e,i)=><Cell key={i} fill={e.winRate>=50?'#00ffa3':'#ff2255'} fillOpacity={0.75}/>)}</Bar>
                  </BarChart>
                </ResponsiveContainer>
              ):<div style={{height:200,display:'flex',alignItems:'center',justifyContent:'center',color:'#3a6b8a',fontSize:11}}>AUCUNE DONNÉE</div>}
            </Card>
            <Card>
              <SectionTitle>◈ DISTRIBUTION R — CE MOIS</SectionTitle>
              {stats.distData.some(d=>d.count>0)?(
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={stats.distData} margin={{top:4,right:4,bottom:4,left:0}}>
                    <XAxis dataKey="label" tick={{fill:'#3a6b8a',fontSize:9,fontFamily:'Share Tech Mono'}} axisLine={false} tickLine={false}/>
                    <YAxis tick={{fill:'#3a6b8a',fontSize:9,fontFamily:'Share Tech Mono'}} axisLine={false} tickLine={false} allowDecimals={false} width={28}/>
                    <Tooltip formatter={v=>[`${v} trade${v>1?'s':''}`,'']} contentStyle={{background:'#060f1a',border:'1px solid rgba(0,170,255,0.3)',fontFamily:'Share Tech Mono,monospace',fontSize:11}}/>
                    <Bar dataKey="count" radius={[2,2,0,0]} maxBarSize={38}>{stats.distData.map((e,i)=><Cell key={i} fill={e.pos?'#00ffa3':'#ff2255'} fillOpacity={0.75}/>)}</Bar>
                  </BarChart>
                </ResponsiveContainer>
              ):<div style={{height:200,display:'flex',alignItems:'center',justifyContent:'center',color:'#3a6b8a',fontSize:11}}>AUCUNE DONNÉE CE MOIS</div>}
            </Card>
          </div>

          {/* Row 2: Heatmap day x session */}
          <Card>
            <SectionTitle>◈ HEATMAP — JOUR × SESSION (avg R)</SectionTitle>
            <div style={{overflowX:'auto'}}>
              <table style={{borderCollapse:'separate',borderSpacing:4,width:'100%'}}>
                <thead>
                  <tr>
                    <th style={{fontFamily:'Orbitron,sans-serif',fontSize:8,color:'#3a6b8a',padding:'4px 8px',textAlign:'left'}}></th>
                    {SESSIONS.map(s=><th key={s} style={{fontFamily:'Orbitron,sans-serif',fontSize:8,letterSpacing:1,color:'#3a6b8a',padding:'4px 6px',textAlign:'center',whiteSpace:'nowrap'}}>{s}</th>)}
                  </tr>
                </thead>
                <tbody>
                  {[1,2,3,4,5].map(dow=>(
                    <tr key={dow}>
                      <td style={{fontFamily:'Orbitron,sans-serif',fontSize:9,color:'#3a6b8a',padding:'3px 8px',letterSpacing:1}}>{DAYS_FR[dow]}</td>
                      {SESSIONS.map(ses=>{
                        const cell=stats.heatmap[dow]?.[ses]||{r:0,count:0};
                        const avg=cell.count?cell.r/cell.count:null;
                        return(
                          <td key={ses} style={{background:heatColor(cell.r,cell.count),borderRadius:3,padding:'8px 12px',textAlign:'center',minWidth:80,border:'1px solid rgba(0,170,255,0.05)',transition:'background .2s'}}>
                            {cell.count>0?(
                              <>
                                <div style={{fontFamily:'Orbitron,sans-serif',fontSize:11,fontWeight:700,color:avg>=0?'#00ffa3':'#ff2255'}}>{fmtR(avg)}</div>
                                <div style={{fontSize:8,color:'#3a6b8a',marginTop:2}}>{cell.count} trade{cell.count>1?'s':''}</div>
                              </>
                            ):<div style={{fontSize:9,color:'rgba(58,107,138,0.3)'}}>—</div>}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>

          {/* Row 3: Streak + Emotions + Strategy */}
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:12}}>
            {/* Streak tracker */}
            <Card>
              <SectionTitle>◈ STREAK TRACKER</SectionTitle>
              <div style={{display:'flex',flexDirection:'column',gap:10}}>
                <div style={{background:'#081625',border:'1px solid rgba(0,170,255,0.07)',borderRadius:3,padding:'14px 16px',textAlign:'center'}}>
                  <div style={{fontFamily:'Orbitron,sans-serif',fontSize:8,letterSpacing:2,color:'#3a6b8a',marginBottom:6}}>STREAK ACTUEL</div>
                  <div style={{fontFamily:'Orbitron,sans-serif',fontSize:28,fontWeight:900,color:sc,lineHeight:1}}>
                    {stats.curStreak===0?'—':`${stats.curStreak>0?'+':''}${stats.curStreak}`}
                  </div>
                  <div style={{fontSize:9,color:'#2a4f68',marginTop:5}}>{stats.curStreak>0?'trades gagnants de suite':stats.curStreak<0?'trades perdants de suite':'aucun trade'}</div>
                </div>
                {[{l:'🏆 Max Win Streak',v:stats.maxWin,c:'#00ffa3'},{l:'💀 Max Loss Streak',v:stats.maxLoss,c:'#ff2255'}].map((m,i)=>(
                  <div key={i} style={{background:'#081625',border:'1px solid rgba(0,170,255,0.07)',borderRadius:3,padding:'10px 14px',display:'flex',justifyContent:'space-between',alignItems:'center'}}>
                    <div style={{fontSize:10,color:'#3a6b8a'}}>{m.l}</div>
                    <div style={{fontFamily:'Orbitron,sans-serif',fontSize:16,fontWeight:700,color:m.c}}>{m.v}</div>
                  </div>
                ))}
              </div>
            </Card>

            {/* Emotions */}
            <Card>
              <SectionTitle>◈ R PAR ÉTAT ÉMOTIONNEL</SectionTitle>
              <div style={{display:'flex',flexDirection:'column',gap:6}}>
                {Object.entries(stats.byEmotion).sort((a,b)=>b[1].r-a[1].r).map(([e,v])=>{
                  const wr=v.count?((v.wins/v.count)*100).toFixed(0):0;
                  return(
                    <div key={e} style={{background:'#081625',border:'1px solid rgba(0,170,255,0.06)',borderRadius:3,padding:'8px 12px'}}>
                      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:4}}>
                        <span style={{fontSize:11}}>{e}</span>
                        <span style={{fontFamily:'Orbitron,sans-serif',fontSize:12,fontWeight:700,color:v.r>=0?'#00ffa3':'#ff2255'}}>{fmtR(v.r)}</span>
                      </div>
                      <div style={{display:'flex',justifyContent:'space-between'}}>
                        <span style={{fontSize:9,color:'#3a6b8a'}}>{v.count} trades</span>
                        <span style={{fontSize:9,color:wr>=50?'#00ffa3':'#ff2255'}}>{wr}% win</span>
                      </div>
                    </div>
                  );
                })}
                {Object.keys(stats.byEmotion).length===0&&<div style={{textAlign:'center',color:'#3a6b8a',fontSize:11,padding:20}}>AUCUNE DONNÉE</div>}
              </div>
            </Card>

            {/* Strategy */}
            <Card>
              <SectionTitle>◈ R PAR STRATÉGIE</SectionTitle>
              <div style={{display:'flex',flexDirection:'column',gap:6}}>
                {Object.entries(stats.byStrat).sort((a,b)=>b[1].r-a[1].r).map(([s,v])=>{
                  const wr=v.count?((v.wins/v.count)*100).toFixed(0):0;
                  return(
                    <div key={s} style={{background:'#081625',border:'1px solid rgba(0,170,255,0.06)',borderRadius:3,padding:'8px 12px'}}>
                      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:4}}>
                        <span style={{fontSize:9,color:'#3a6b8a',textTransform:'uppercase',fontFamily:'Orbitron,sans-serif',letterSpacing:1}}>{s}</span>
                        <span style={{fontFamily:'Orbitron,sans-serif',fontSize:12,fontWeight:700,color:v.r>=0?'#00ffa3':'#ff2255'}}>{fmtR(v.r)}</span>
                      </div>
                      <div style={{display:'flex',justifyContent:'space-between'}}>
                        <span style={{fontSize:9,color:'#3a6b8a'}}>{v.count} trades</span>
                        <span style={{fontSize:9,color:wr>=50?'#00ffa3':'#ff2255'}}>{wr}% win</span>
                      </div>
                    </div>
                  );
                })}
                {Object.keys(stats.byStrat).length===0&&<div style={{textAlign:'center',color:'#3a6b8a',fontSize:11,padding:20}}>AUCUNE DONNÉE</div>}
              </div>
            </Card>
          </div>
        </div>
      )}

      {/* ══ DETAIL / AI ═════════════════════════════════════════════════ */}
      {detail&&(
        <div style={{position:'fixed',inset:0,background:'rgba(2,9,15,0.92)',backdropFilter:'blur(8px)',zIndex:100,display:'flex',alignItems:'center',justifyContent:'center',padding:16}} onClick={()=>{setDetail(null);setDetailImg(null);setAiText('');}}>
          <div className="fade-in" onClick={e=>e.stopPropagation()}
            style={{background:'#060f1a',border:'1px solid rgba(0,170,255,0.25)',borderRadius:4,width:800,maxWidth:'100%',maxHeight:'90vh',overflowY:'auto',boxShadow:'0 0 80px rgba(0,170,255,0.07)'}}>
            {/* Header */}
            <div style={{position:'sticky',top:0,zIndex:10,background:'#060f1a',borderBottom:'1px solid rgba(0,170,255,0.1)',padding:'14px 20px',display:'flex',alignItems:'center',justifyContent:'space-between',flexWrap:'wrap',gap:8}}>
              <div style={{display:'flex',alignItems:'center',gap:10,flexWrap:'wrap'}}>
                <span style={{fontFamily:'Orbitron,sans-serif',fontSize:11,fontWeight:700,letterSpacing:2,color:detail.symbol==='NAS100'?'#00aaff':'#ffc800'}}>{detail.symbol}</span>
                <Badge color={detail.direction==='Long'?'#00ffa3':'#ff2255'} bg={detail.direction==='Long'?'rgba(0,255,163,0.08)':'rgba(255,34,85,0.08)'} border={detail.direction==='Long'?'rgba(0,255,163,0.2)':'rgba(255,34,85,0.2)'}>{detail.direction==='Long'?'▲':'▼'} {detail.direction}</Badge>
                {detail.rValue!==null&&<span style={{fontFamily:'Orbitron,sans-serif',fontSize:13,fontWeight:700,color:detail.rValue>=0?'#00ffa3':'#ff2255'}}>{fmtR(detail.rValue)}</span>}
                <span style={{fontSize:9,color:'#3a6b8a'}}>{detail.date}</span>
                {detail.session&&<Badge color='rgba(0,170,255,0.7)' bg='rgba(0,170,255,0.06)' border='rgba(0,170,255,0.15)'>{detail.session}</Badge>}
                {detail.timeframe&&<Badge color='rgba(0,170,255,0.6)' bg='rgba(0,170,255,0.05)' border='rgba(0,170,255,0.12)'>{detail.timeframe}</Badge>}
                {detail.emotion&&<span style={{fontSize:12}}>{detail.emotion}</span>}
              </div>
              <button onClick={()=>{setDetail(null);setDetailImg(null);setAiText('');}} style={{background:'transparent',border:'none',color:'#3a6b8a',fontSize:20,cursor:'pointer',transition:'color .15s'}} onMouseEnter={e=>e.target.style.color='#ff2255'} onMouseLeave={e=>e.target.style.color='#3a6b8a'}>✕</button>
            </div>
            <div style={{padding:20,display:'grid',gridTemplateColumns:detailImg?'1fr 1fr':'1fr',gap:16}}>
              {/* Screenshot */}
              <div>
                <div style={{fontFamily:'Orbitron,sans-serif',fontSize:8,letterSpacing:2.5,color:'#3a6b8a',textTransform:'uppercase',marginBottom:10}}>◈ SCREENSHOT</div>
                {detailImg?(
                  <div style={{position:'relative',borderRadius:3,overflow:'hidden',border:'1px solid rgba(0,170,255,0.15)'}}>
                    <img src={detailImg} alt="trade" style={{width:'100%',display:'block',borderRadius:2}}/>
                    <button onClick={()=>{openEdit(detail);setDetail(null);setDetailImg(null);setAiText('');}} style={{position:'absolute',bottom:8,right:8,background:'rgba(6,15,26,0.88)',border:'1px solid rgba(0,170,255,0.3)',color:'#3a6b8a',fontFamily:'Orbitron,sans-serif',fontSize:8,letterSpacing:1,padding:'4px 10px',cursor:'pointer',borderRadius:2,transition:'color .15s'}} onMouseEnter={e=>e.currentTarget.style.color='#00aaff'} onMouseLeave={e=>e.currentTarget.style.color='#3a6b8a'}>CHANGER</button>
                  </div>
                ):(
                  <div onClick={()=>{openEdit(detail);setDetail(null);setDetailImg(null);setAiText('');}} style={{border:'1px dashed rgba(0,170,255,0.2)',borderRadius:3,padding:40,textAlign:'center',cursor:'pointer',transition:'all .2s',background:'rgba(0,170,255,0.02)'}} onMouseEnter={e=>{e.currentTarget.style.borderColor='rgba(0,170,255,0.45)';e.currentTarget.style.background='rgba(0,170,255,0.05)';}} onMouseLeave={e=>{e.currentTarget.style.borderColor='rgba(0,170,255,0.2)';e.currentTarget.style.background='rgba(0,170,255,0.02)';}}>
                    <div style={{fontSize:28,marginBottom:10}}>📷</div>
                    <div style={{fontFamily:'Orbitron,sans-serif',fontSize:9,letterSpacing:2,color:'#3a6b8a',textTransform:'uppercase'}}>Ajouter un screenshot</div>
                    <div style={{fontSize:10,color:'#2a4f68',marginTop:6}}>Clique pour modifier le trade</div>
                  </div>
                )}
              </div>
              {/* Info + AI */}
              <div style={{display:'flex',flexDirection:'column',gap:12}}>
                <div style={{background:'#081625',border:'1px solid rgba(0,170,255,0.08)',borderRadius:3,padding:14}}>
                  <div style={{fontFamily:'Orbitron,sans-serif',fontSize:8,letterSpacing:2.5,color:'#3a6b8a',textTransform:'uppercase',marginBottom:10}}>◈ DÉTAILS</div>
                  <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8}}>
                    {[{l:'Résultat',v:detail.result||'—'},{l:'Stratégie',v:detail.strategy},{l:'Session',v:detail.session||'—'},{l:'Timeframe',v:detail.timeframe||'—'},{l:'État',v:detail.emotion||'—'},{l:'Status',v:detail.status}].map((r,i)=>(
                      <div key={i}><div style={{fontSize:8,letterSpacing:1,color:'#2a4f68',textTransform:'uppercase',marginBottom:2,fontFamily:'Orbitron,sans-serif'}}>{r.l}</div><div style={{fontSize:11,color:'#c5e8ff'}}>{r.v}</div></div>
                    ))}
                  </div>
                  {detail.notes&&<div style={{marginTop:10,paddingTop:10,borderTop:'1px solid rgba(0,170,255,0.07)',fontSize:10,color:'#3a6b8a',lineHeight:1.7}}><span style={{fontFamily:'Orbitron,sans-serif',fontSize:7,letterSpacing:2,color:'#2a4f68'}}>NOTES · </span>{detail.notes}</div>}
                  {detail.retro&&(
                    <div style={{marginTop:10,paddingTop:10,borderTop:'1px solid rgba(255,200,0,0.12)',background:'rgba(255,200,0,0.04)',borderRadius:2,padding:'10px 12px'}}>
                      <div style={{fontFamily:'Orbitron,sans-serif',fontSize:7,letterSpacing:2,color:'#ffc800',marginBottom:5}}>💡 QU'AURAIS-JE DÛ FAIRE ?</div>
                      <div style={{fontSize:10,color:'#c5e8ff',lineHeight:1.75}}>{detail.retro}</div>
                    </div>
                  )}
                </div>
                {/* AI Panel */}
                <div style={{background:'#081625',border:'1px solid rgba(0,170,255,0.08)',borderRadius:3,padding:14,flex:1}}>
                  <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:10}}>
                    <div style={{fontFamily:'Orbitron,sans-serif',fontSize:8,letterSpacing:2.5,color:'#3a6b8a',textTransform:'uppercase'}}>◈ ANALYSE IA</div>
                    {detailImg&&!aiLoading&&(
                      <button onClick={runAnalysis} style={{background:'rgba(0,170,255,0.08)',border:'1px solid rgba(0,170,255,0.35)',color:'#00aaff',fontFamily:'Orbitron,sans-serif',fontSize:8,letterSpacing:1.5,padding:'5px 12px',cursor:'pointer',borderRadius:2,textTransform:'uppercase',transition:'all .2s'}}
                        onMouseEnter={e=>{e.currentTarget.style.background='rgba(0,170,255,0.18)';e.currentTarget.style.boxShadow='0 0 14px rgba(0,170,255,0.15)';}}
                        onMouseLeave={e=>{e.currentTarget.style.background='rgba(0,170,255,0.08)';e.currentTarget.style.boxShadow='none';}}>
                        {aiText?'↺ RELANCER':'⚡ ANALYSER'}
                      </button>
                    )}
                  </div>
                  {!detailImg&&!aiText&&<div style={{fontSize:10,color:'#2a4f68',lineHeight:1.7}}>Ajoute un screenshot pour obtenir un feedback IA. L'analyse prend en compte la session, le timeframe et ton état émotionnel.</div>}
                  {detailImg&&!aiLoading&&!aiText&&<div style={{textAlign:'center',padding:'20px 0',fontSize:10,color:'#2a4f68'}}>Clique sur ⚡ ANALYSER pour le feedback mentor IA</div>}
                  {aiLoading&&<div style={{textAlign:'center',padding:'24px 0',display:'flex',flexDirection:'column',alignItems:'center',gap:10}}><div style={{width:20,height:20,border:'2px solid rgba(0,170,255,0.2)',borderTopColor:'#00aaff',borderRadius:'50%'}} className="spin"/><div style={{fontFamily:'Orbitron,sans-serif',fontSize:8,letterSpacing:2,color:'#3a6b8a'}}>ANALYSE EN COURS...</div></div>}
                  {aiText&&!aiLoading&&(
                    <div style={{fontSize:11,color:'#c5e8ff',lineHeight:1.9,whiteSpace:'pre-wrap'}}>
                      {aiText.split('\n').map((line,i)=>{
                        const fmt=line.replace(/\*\*(.*?)\*\*/g,'<strong style="color:#00aaff;font-family:Orbitron,sans-serif;font-size:9px;letter-spacing:1.5px;text-transform:uppercase">$1</strong>');
                        return <div key={i} dangerouslySetInnerHTML={{__html:fmt}} style={{color:line.startsWith('•')||line.startsWith('-')?'#a0c8e0':'#8ab5cc',marginBottom:4}}/>;
                      })}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ══ ADD / EDIT FORM ══════════════════════════════════════════════ */}
      {showForm&&(
        <div style={{position:'fixed',inset:0,background:'rgba(2,9,15,0.9)',backdropFilter:'blur(6px)',zIndex:110,display:'flex',alignItems:'center',justifyContent:'center',padding:16}}>
          <div className="fade-in" style={{background:'#060f1a',border:'1px solid rgba(0,170,255,0.3)',borderRadius:4,padding:24,width:560,maxWidth:'100%',maxHeight:'90vh',overflowY:'auto',boxShadow:'0 0 60px rgba(0,170,255,0.06)',position:'relative'}}>
            <div style={{position:'absolute',top:0,left:0,right:0,height:1,background:'linear-gradient(90deg,transparent,rgba(0,170,255,0.5),transparent)',borderRadius:'4px 4px 0 0'}}/>
            <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:20}}>
              <div style={{fontFamily:'Orbitron,sans-serif',fontSize:14,fontWeight:700,letterSpacing:2,color:'#00aaff'}}>{editId?'◈ MODIFIER':'◈ NOUVEAU TRADE'}</div>
              <button onClick={()=>setShowForm(false)} style={{background:'transparent',border:'none',color:'#3a6b8a',fontSize:20,cursor:'pointer',transition:'color .15s'}} onMouseEnter={e=>e.target.style.color='#ff2255'} onMouseLeave={e=>e.target.style.color='#3a6b8a'}>✕</button>
            </div>

            {/* Row 1: Direction + Instrument + Status */}
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:10,marginBottom:14}}>
              <div>
                <div style={{fontFamily:'Orbitron,sans-serif',fontSize:8,letterSpacing:2,color:'#3a6b8a',textTransform:'uppercase',marginBottom:6}}>DIRECTION</div>
                <div style={{display:'flex',gap:6}}>
                  <ToggleBtn label="▲ Long"  active={form.direction==='Long'}  activeColor='#00ffa3' activeBg='rgba(0,255,163,0.09)' activeBorder='rgba(0,255,163,0.45)' onClick={()=>setF('direction','Long')}/>
                  <ToggleBtn label="▼ Short" active={form.direction==='Short'} activeColor='#ff2255' activeBg='rgba(255,34,85,0.09)'  activeBorder='rgba(255,34,85,0.45)'  onClick={()=>setF('direction','Short')}/>
                </div>
              </div>
              <div>
                <div style={{fontFamily:'Orbitron,sans-serif',fontSize:8,letterSpacing:2,color:'#3a6b8a',textTransform:'uppercase',marginBottom:6}}>INSTRUMENT</div>
                <div style={{display:'flex',gap:6}}>
                  <ToggleBtn label="NAS100" active={form.symbol==='NAS100'} activeColor='#00aaff' activeBg='rgba(0,170,255,0.1)'  activeBorder='rgba(0,170,255,0.5)'  onClick={()=>setF('symbol','NAS100')}/>
                  <ToggleBtn label="SPX500" active={form.symbol==='SPX500'} activeColor='#ffc800' activeBg='rgba(255,200,0,0.08)' activeBorder='rgba(255,200,0,0.5)'  onClick={()=>setF('symbol','SPX500')}/>
                </div>
              </div>
              <div>
                <div style={{fontFamily:'Orbitron,sans-serif',fontSize:8,letterSpacing:2,color:'#3a6b8a',textTransform:'uppercase',marginBottom:6}}>STATUS</div>
                <div style={{display:'flex',gap:6}}>
                  <ToggleBtn label="Closed" active={form.status==='Closed'} activeColor='#00aaff' activeBg='rgba(0,170,255,0.1)'  activeBorder='rgba(0,170,255,0.4)' onClick={()=>setF('status','Closed')}/>
                  <ToggleBtn label="Open"   active={form.status==='Open'}   activeColor='#ffc800' activeBg='rgba(255,200,0,0.08)' activeBorder='rgba(255,200,0,0.4)' onClick={()=>setF('status','Open')}/>
                </div>
              </div>
            </div>

            {/* Row 2: Date + Résultat R */}
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12,marginBottom:12}}>
              <FF label="DATE" value={form.date} onChange={v=>setF('date',v)} type="date"/>
              <div>
                <div style={{fontFamily:'Orbitron,sans-serif',fontSize:8,letterSpacing:2,color:'#3a6b8a',textTransform:'uppercase',marginBottom:5}}>RÉSULTAT (R)</div>
                <input value={form.result} onChange={e=>setF('result',e.target.value)} placeholder="+3  /  -1  /  +0.5  /  +2.3R"
                  style={{width:'100%',background:'#081625',border:`1px solid ${form.result&&parseR(form.result)!==null?(parseR(form.result)>=0?'rgba(0,255,163,0.3)':'rgba(255,34,85,0.3)'):'rgba(0,170,255,0.13)'}`,color:form.result&&parseR(form.result)!==null?(parseR(form.result)>=0?'#00ffa3':'#ff2255'):'#c5e8ff',fontFamily:'Orbitron,sans-serif',fontSize:16,fontWeight:700,padding:'8px 10px',borderRadius:2,outline:'none',letterSpacing:1,transition:'all .2s'}}/>
                {form.result&&parseR(form.result)!==null&&<div style={{fontFamily:'Orbitron,sans-serif',fontSize:9,marginTop:4,color:parseR(form.result)>=0?'#00ffa3':'#ff2255',letterSpacing:1}}>{fmtR(parseR(form.result))}</div>}
              </div>
            </div>

            {/* Row 3: Session + Timeframe */}
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12,marginBottom:12}}>
              <SelectF label="SESSION" value={form.session} onChange={v=>setF('session',v)} options={SESSIONS}/>
              <SelectF label="TIMEFRAME" value={form.timeframe} onChange={v=>setF('timeframe',v)} options={TIMEFRAMES}/>
            </div>

            {/* Row 4: Stratégie + Émotion */}
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12,marginBottom:12}}>
              <SelectF label="STRATÉGIE" value={form.strategy} onChange={v=>setF('strategy',v)} options={STRATEGIES}/>
              <div>
                <div style={{fontFamily:'Orbitron,sans-serif',fontSize:8,letterSpacing:2,color:'#3a6b8a',textTransform:'uppercase',marginBottom:5}}>ÉTAT ÉMOTIONNEL</div>
                <div style={{display:'flex',flexWrap:'wrap',gap:5}}>
                  {EMOTIONS.map(e=>(
                    <button key={e} onClick={()=>setF('emotion',e)} style={{padding:'5px 10px',border:`1px solid ${form.emotion===e?'rgba(0,170,255,0.45)':'rgba(0,170,255,0.1)'}`,background:form.emotion===e?'rgba(0,170,255,0.12)':'transparent',color:form.emotion===e?'#c5e8ff':'#3a6b8a',fontSize:11,cursor:'pointer',borderRadius:2,transition:'all .15s',whiteSpace:'nowrap'}}>{e}</button>
                  ))}
                </div>
              </div>
            </div>

            {/* Notes */}
            <div style={{marginBottom:12}}>
              <div style={{fontFamily:'Orbitron,sans-serif',fontSize:8,letterSpacing:2,color:'#3a6b8a',textTransform:'uppercase',marginBottom:5}}>NOTES</div>
              <textarea value={form.notes} onChange={e=>setF('notes',e.target.value)} rows={2} placeholder="Setup, contexte macro, confluences…"
                style={{width:'100%',background:'#081625',border:'1px solid rgba(0,170,255,0.13)',color:'#c5e8ff',fontFamily:'Share Tech Mono,monospace',fontSize:12,padding:'8px 10px',borderRadius:2,outline:'none',resize:'vertical'}}/>
            </div>

            {/* Rétro */}
            <div style={{marginBottom:14}}>
              <div style={{fontFamily:'Orbitron,sans-serif',fontSize:8,letterSpacing:2,color:'#ffc800',textTransform:'uppercase',marginBottom:5}}>💡 QU'AURAIS-JE DÛ FAIRE ?</div>
              <div style={{fontSize:9,color:'#2a4f68',marginBottom:6,fontFamily:'Share Tech Mono,monospace'}}>Relecture à froid — remplis ça 24h après le trade.</div>
              <textarea value={form.retro} onChange={e=>setF('retro',e.target.value)} rows={3}
                placeholder="Ex: Aurais dû attendre la confirmation de la bougie suivante. Entry trop anticipée, pas de patience sur le retest…"
                style={{width:'100%',background:'rgba(255,200,0,0.04)',border:'1px solid rgba(255,200,0,0.18)',color:'#c5e8ff',fontFamily:'Share Tech Mono,monospace',fontSize:12,padding:'8px 10px',borderRadius:2,outline:'none',resize:'vertical',transition:'border-color .2s'}}
                onFocus={e=>e.target.style.borderColor='rgba(255,200,0,0.45)'}
                onBlur={e=>e.target.style.borderColor='rgba(255,200,0,0.18)'}/>
            </div>

            {/* Screenshot */}
            <div style={{marginBottom:16}}>
              <div style={{fontFamily:'Orbitron,sans-serif',fontSize:8,letterSpacing:2,color:'#3a6b8a',textTransform:'uppercase',marginBottom:8}}>◈ SCREENSHOT</div>
              <input ref={fileRef} type="file" accept="image/*" onChange={handleImg}/>
              {formImage?(
                <div style={{position:'relative',border:'1px solid rgba(0,170,255,0.2)',borderRadius:3,overflow:'hidden'}}>
                  <img src={formImage} alt="preview" style={{width:'100%',maxHeight:160,objectFit:'contain',background:'#02090f',display:'block'}}/>
                  <div style={{position:'absolute',top:8,right:8,display:'flex',gap:6}}>
                    <button onClick={()=>fileRef.current.click()} style={{background:'rgba(6,15,26,0.9)',border:'1px solid #00aaff',color:'#00aaff',fontFamily:'Orbitron,sans-serif',fontSize:8,letterSpacing:1,padding:'4px 10px',cursor:'pointer',borderRadius:2}}>CHANGER</button>
                    <button onClick={()=>setFormImage(null)} style={{background:'rgba(6,15,26,0.9)',border:'1px solid #ff2255',color:'#ff2255',fontFamily:'Orbitron,sans-serif',fontSize:8,letterSpacing:1,padding:'4px 10px',cursor:'pointer',borderRadius:2}}>✕</button>
                  </div>
                </div>
              ):(
                <div onClick={()=>fileRef.current.click()} style={{border:'1px dashed rgba(0,170,255,0.18)',borderRadius:3,padding:'18px 0',textAlign:'center',cursor:'pointer',transition:'all .2s',background:'rgba(0,170,255,0.02)'}}
                  onMouseEnter={e=>{e.currentTarget.style.borderColor='rgba(0,170,255,0.4)';e.currentTarget.style.background='rgba(0,170,255,0.05)';}}
                  onMouseLeave={e=>{e.currentTarget.style.borderColor='rgba(0,170,255,0.18)';e.currentTarget.style.background='rgba(0,170,255,0.02)';}}>
                  <div style={{fontSize:20,marginBottom:5}}>📷</div>
                  <div style={{fontFamily:'Orbitron,sans-serif',fontSize:8,letterSpacing:2,color:'#3a6b8a'}}>AJOUTER UN SCREENSHOT</div>
                  <div style={{fontSize:9,color:'#2a4f68',marginTop:3}}>PNG, JPG — l'IA l'analysera avec session + émotion</div>
                </div>
              )}
            </div>

            <div style={{display:'flex',gap:8,justifyContent:'flex-end'}}>
              <button onClick={()=>setShowForm(false)} style={{background:'transparent',border:'1px solid rgba(0,170,255,0.15)',color:'#3a6b8a',fontFamily:'Share Tech Mono,monospace',fontSize:11,padding:'8px 18px',cursor:'pointer',borderRadius:2,transition:'all .15s'}} onMouseEnter={e=>{e.currentTarget.style.borderColor='rgba(0,170,255,0.35)';e.currentTarget.style.color='#c5e8ff';}} onMouseLeave={e=>{e.currentTarget.style.borderColor='rgba(0,170,255,0.15)';e.currentTarget.style.color='#3a6b8a';}}>ANNULER</button>
              <button onClick={submitForm} style={{background:'rgba(0,170,255,0.1)',border:'1px solid #00aaff',color:'#00aaff',fontFamily:'Orbitron,sans-serif',fontSize:10,letterSpacing:2,padding:'8px 26px',cursor:'pointer',borderRadius:2,textTransform:'uppercase',transition:'all .2s'}} onMouseEnter={e=>{e.currentTarget.style.background='rgba(0,170,255,0.2)';e.currentTarget.style.boxShadow='0 0 20px rgba(0,170,255,0.15)';}} onMouseLeave={e=>{e.currentTarget.style.background='rgba(0,170,255,0.1)';e.currentTarget.style.boxShadow='none';}}>{editId?'METTRE À JOUR':'SAUVEGARDER'}</button>
            </div>
          </div>
        </div>
      )}

      {/* DELETE CONFIRM */}
      {confirm&&(
        <div style={{position:'fixed',inset:0,background:'rgba(2,9,15,0.92)',backdropFilter:'blur(6px)',zIndex:200,display:'flex',alignItems:'center',justifyContent:'center'}}>
          <div className="fade-in" style={{background:'#060f1a',border:'1px solid rgba(255,34,85,0.3)',borderRadius:4,padding:28,width:310,textAlign:'center'}}>
            <div style={{fontFamily:'Orbitron,sans-serif',fontSize:13,letterSpacing:2,color:'#ff2255',marginBottom:8}}>⚠ SUPPRIMER</div>
            <div style={{fontSize:11,color:'#3a6b8a',marginBottom:20}}>Cette action est irréversible.</div>
            <div style={{display:'flex',gap:8,justifyContent:'center'}}>
              <button onClick={()=>setConfirm(null)} style={{background:'transparent',border:'1px solid rgba(0,170,255,0.2)',color:'#3a6b8a',fontFamily:'Share Tech Mono,monospace',fontSize:11,padding:'7px 18px',cursor:'pointer',borderRadius:2}}>ANNULER</button>
              <button onClick={()=>doDelete(confirm)} style={{background:'rgba(255,34,85,0.1)',border:'1px solid #ff2255',color:'#ff2255',fontFamily:'Orbitron,sans-serif',fontSize:10,letterSpacing:1,padding:'7px 18px',cursor:'pointer',borderRadius:2}}>SUPPRIMER</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
