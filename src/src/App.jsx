import { useState, useEffect, useRef, useMemo } from "react";
import { AreaChart, Area, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine, Cell } from "recharts";

const CSS = `
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
@keyframes fillBar{from{width:0}to{width:var(--w)}}
.fade-in{animation:fadeUp .28s ease forwards}
.blink{animation:pulse 1.6s ease infinite}
.glow-border{animation:glow 3s ease infinite}
.spin{animation:spin .8s linear infinite}
`;

const STRATEGIES = ['Red Pile FX','Trend Follow','Breakout','Reversal','Scalp','Swing','Mean Reversion','News/Event','Gap Play','VWAP Reclaim','Other'];
const SYMBOLS    = ['NAS100','SPX500'];
const SESSIONS   = ['NY Open','NY Afternoon','London Open','LN/NY Overlap','Asia'];
const TIMEFRAMES = ['1m','5m','15m','30m','1H','4H','Daily'];
const EMOTIONS   = ['😎 Confiant','😐 Neutre','😰 FOMO','😡 Revanche','😟 Hésitant','🤯 Surconfiant'];
const DAYS_FR    = ['Dim','Lun','Mar','Mer','Jeu','Ven','Sam'];
const MONTHS_FR  = ['Janvier','Février','Mars','Avril','Mai','Juin','Juillet','Août','Septembre','Octobre','Novembre','Décembre'];

const DEMO_TRADES = [
  {id:1,  date:'2026-04-02',symbol:'NAS100',direction:'Long', result:'+2.4',rValue:2.4, strategy:'Breakout',      session:'NY Open',       timeframe:'15m',emotion:'😎 Confiant', notes:"Cassure HOD pré-market",                   retro:'', status:'Closed',hasImage:false},
  {id:2,  date:'2026-04-04',symbol:'SPX500',direction:'Short',result:'+1.8',rValue:1.8, strategy:'Reversal',      session:'LN/NY Overlap',  timeframe:'1H', emotion:'😎 Confiant', notes:'Double top H1 + divergence RSI',            retro:'', status:'Closed',hasImage:false},
  {id:3,  date:'2026-04-08',symbol:'NAS100',direction:'Long', result:'-1',  rValue:-1,  strategy:'VWAP Reclaim',  session:'NY Open',       timeframe:'5m', emotion:'😰 FOMO',     notes:'Reclaim VWAP raté',                         retro:'Aurais dû attendre le retest', status:'Closed',hasImage:false},
  {id:4,  date:'2026-04-11',symbol:'NAS100',direction:'Short',result:'+1.6',rValue:1.6, strategy:'Reversal',      session:'NY Afternoon',  timeframe:'1H', emotion:'😐 Neutre',   notes:'Rejet résistance daily + CPI chaud',        retro:'', status:'Closed',hasImage:false},
  {id:5,  date:'2026-04-16',symbol:'SPX500',direction:'Long', result:'+2.1',rValue:2.1, strategy:'Trend Follow',  session:'LN/NY Overlap',  timeframe:'4H', emotion:'😎 Confiant', notes:'Support EMA 50 daily tenu',                 retro:'', status:'Closed',hasImage:false},
  {id:6,  date:'2026-04-22',symbol:'NAS100',direction:'Long', result:'+3.2',rValue:3.2, strategy:'Breakout',      session:'NY Open',       timeframe:'15m',emotion:'😎 Confiant', notes:'ATH breakout sur volume',                   retro:'', status:'Closed',hasImage:false},
  {id:7,  date:'2026-04-25',symbol:'SPX500',direction:'Long', result:'-1',  rValue:-1,  strategy:'Scalp',         session:'NY Open',       timeframe:'5m', emotion:'😰 FOMO',     notes:'Scalp raté, stop trop serré',               retro:'', status:'Closed',hasImage:false},
  {id:8,  date:'2026-04-29',symbol:'NAS100',direction:'Short',result:'+2.6',rValue:2.6, strategy:'Swing',         session:'London Open',   timeframe:'4H', emotion:'😎 Confiant', notes:'Swing short : divergence hebdo',            retro:'', status:'Closed',hasImage:false},
  {id:9,  date:'2026-05-06',symbol:'SPX500',direction:'Long', result:'+1.9',rValue:1.9, strategy:'Gap Play',      session:'NY Open',       timeframe:'15m',emotion:'😐 Neutre',   notes:'Gap fill haussier post-NFP',                retro:'', status:'Closed',hasImage:false},
  {id:10, date:'2026-05-12',symbol:'NAS100',direction:'Long', result:'+1.7',rValue:1.7, strategy:'VWAP Reclaim',  session:'NY Open',       timeframe:'5m', emotion:'😎 Confiant', notes:'Reclaim VWAP NY + bull flag 15m',           retro:'', status:'Closed',hasImage:false},
  {id:11, date:'2026-05-19',symbol:'SPX500',direction:'Short',result:'-1',  rValue:-1,  strategy:'Mean Reversion',session:'NY Afternoon',  timeframe:'1H', emotion:'😡 Revanche', notes:'Extension +3σ BB, fade le spike macro',      retro:'', status:'Closed',hasImage:false},
  {id:12, date:'2026-06-02',symbol:'NAS100',direction:'Long', result:'+2.0',rValue:2.0, strategy:'Breakout',      session:'NY Open',       timeframe:'15m',emotion:'😎 Confiant', notes:'Breakout propre NY open',                   retro:'', status:'Closed',hasImage:false},
  {id:13, date:'2026-06-02',symbol:'SPX500',direction:'Long', result:'+0.8',rValue:0.8, strategy:'Scalp',         session:'LN/NY Overlap',  timeframe:'5m', emotion:'😐 Neutre',   notes:'Scalp propre overlap',                      retro:'', status:'Closed',hasImage:false},
  {id:14, date:'2026-05-26',symbol:'NAS100',direction:'Long', result:'',    rValue:null,strategy:'Swing',         session:'NY Open',       timeframe:'4H', emotion:'😎 Confiant', notes:'Holding : target +3R',                      retro:'', status:'Open', hasImage:false},
];

const DEFAULT_OBJ = {targetR:10, dailyDDR:-2, totalDDR:-8};

const parseR  = s => { if(!s&&s!==0) return null; const v=parseFloat(String(s).replace('R','')); return isNaN(v)?null:v; };
const fmtR    = v => v===null||v===undefined?'—':(v>=0?'+':'')+Number(v).toFixed(1)+'R';
const fmtPct  = v => (v>=0?'+':'')+v.toFixed(1)+'%';
const today   = () => new Date().toISOString().split('T')[0];
const curYM   = () => new Date().toISOString().slice(0,7);
const getDOW  = d => new Date(d+'T12:00:00').getDay();
const daysInMonth = ym => { const [y,m]=ym.split('-').map(Number); return new Date(y,m,0).getDate(); };
const firstDOW    = ym => { const [y,m]=ym.split('-').map(Number); return new Date(y,m-1,1).getDay(); };

const EMPTY = {date:today(),symbol:'NAS100',direction:'Long',status:'Closed',result:'',strategy:'Breakout',session:'NY Open',timeframe:'15m',emotion:'😐 Neutre',notes:'',retro:''};
const toBase64 = file => new Promise((res,rej)=>{ const r=new FileReader(); r.onload=()=>res(r.result); r.onerror=rej; r.readAsDataURL(file); });

async function resizeImage(dataUrl,maxPx=1200){
  return new Promise(res=>{
    const img=new Image();
    img.onload=()=>{ const s=Math.min(1,maxPx/Math.max(img.width,img.height)); const w=Math.round(img.width*s),h=Math.round(img.height*s); const c=document.createElement('canvas'); c.width=w; c.height=h; c.getContext('2d').drawImage(img,0,0,w,h); res(c.toDataURL('image/jpeg',0.85)); };
    img.onerror=()=>res(dataUrl); img.src=dataUrl;
  });
}

async function analyzeChart(dataUrl,trade,apiKey){
  const resized=await resizeImage(dataUrl); const b64=resized.split(',')[1];
  const prompt=`Tu es un mentor de trading expert sur les indices US (NAS100/SPX500).
Trade: ${trade.symbol} ${trade.direction} | Résultat: ${trade.result||'ouvert'} (${trade.rValue!==null?fmtR(trade.rValue):'en cours'})
Stratégie: ${trade.strategy} | Session: ${trade.session||'—'} | TF: ${trade.timeframe||'—'}
Émotion: ${trade.emotion||'—'} | Notes: "${trade.notes||'aucune'}"
Relecture: "${trade.retro||'non remplie'}"
Analyse en 5 bullets "•": Setup visible / Qualité exécution / Gestion du trade / Points positifs / À améliorer. Mentor exigeant, 130 mots max, français.`;
  const headers={"Content-Type":"application/json","anthropic-version":"2023-06-01","anthropic-dangerous-direct-browser-access":"true"};
  if(apiKey) headers["x-api-key"]=apiKey;
  const res=await fetch("https://api.anthropic.com/v1/messages",{method:"POST",headers,body:JSON.stringify({model:"claude-opus-4-5",max_tokens:1000,messages:[{role:"user",content:[{type:"image",source:{type:"base64",media_type:"image/jpeg",data:b64}},{type:"text",text:prompt}]}]})});
  if(!res.ok){const e=await res.json().catch(()=>({}));throw new Error(e?.error?.message||`HTTP ${res.status}`);}
  const data=await res.json();
  if(data.type==='error') throw new Error(data.error?.message||'Erreur API');
  return data.content?.find(b=>b.type==='text')?.text||"Aucune réponse.";
}

// ── UI ATOMS ──────────────────────────────────────────────────────────────────
const CyTooltip=({active,payload,label})=>{
  if(!active||!payload?.length) return null;
  const v=payload[0]?.value;
  return <div style={{background:'#060f1a',border:'1px solid rgba(0,170,255,0.3)',padding:'8px 12px',borderRadius:2,fontFamily:'Share Tech Mono,monospace',fontSize:11}}><div style={{color:'#3a6b8a',marginBottom:4}}>{label}</div><div style={{color:v>=0?'#00ffa3':'#ff2255'}}>{typeof v==='number'?fmtR(v):v}</div></div>;
};

const FF=({label,value,onChange,type='text',placeholder=''})=>(
  <div>
    <div style={{fontFamily:'Orbitron,sans-serif',fontSize:8,letterSpacing:2,color:'#3a6b8a',textTransform:'uppercase',marginBottom:5}}>{label}</div>
    <input type={type} value={value} onChange={e=>onChange(e.target.value)} placeholder={placeholder}
      style={{width:'100%',background:'#081625',border:'1px solid rgba(0,170,255,0.13)',color:'#c5e8ff',fontFamily:'Share Tech Mono,monospace',fontSize:12,padding:'8px 10px',borderRadius:2,outline:'none',transition:'border-color .2s'}}
      onFocus={e=>e.target.style.borderColor='rgba(0,170,255,0.45)'} onBlur={e=>e.target.style.borderColor='rgba(0,170,255,0.13)'}/>
  </div>
);

const SelectF=({label,value,onChange,options})=>(
  <div>
    <div style={{fontFamily:'Orbitron,sans-serif',fontSize:8,letterSpacing:2,color:'#3a6b8a',textTransform:'uppercase',marginBottom:5}}>{label}</div>
    <select value={value} onChange={e=>onChange(e.target.value)} style={{width:'100%',background:'#081625',border:'1px solid rgba(0,170,255,0.13)',color:'#c5e8ff',fontFamily:'Share Tech Mono,monospace',fontSize:12,padding:'8px 10px',borderRadius:2,outline:'none'}}>
      {options.map(o=><option key={o}>{o}</option>)}
    </select>
  </div>
);

const StatCard=({label,value,sub,color,icon})=>(
  <div style={{background:'#060f1a',border:'1px solid rgba(0,170,255,0.09)',borderRadius:3,padding:'14px 16px',position:'relative',overflow:'hidden',transition:'border-color .2s'}}
    onMouseEnter={e=>e.currentTarget.style.borderColor='rgba(0,170,255,0.22)'} onMouseLeave={e=>e.currentTarget.style.borderColor='rgba(0,170,255,0.09)'}>
    <div style={{position:'absolute',top:0,left:0,right:0,height:1,background:'linear-gradient(90deg,transparent,rgba(0,170,255,0.35),transparent)'}}/>
    <div style={{fontFamily:'Orbitron,sans-serif',fontSize:8,letterSpacing:2.5,color:'#3a6b8a',textTransform:'uppercase',marginBottom:9}}>{icon} {label}</div>
    <div style={{fontFamily:'Orbitron,sans-serif',fontSize:18,fontWeight:700,color,letterSpacing:.5,lineHeight:1}}>{value}</div>
    {sub&&<div style={{fontSize:9,color:'#2a4f68',marginTop:5}}>{sub}</div>}
  </div>
);

const Badge=({children,color,bg,border})=>(
  <span style={{background:bg,color,fontFamily:'Orbitron,sans-serif',fontSize:8,letterSpacing:1,padding:'2px 7px',borderRadius:2,border:`1px solid ${border}`,whiteSpace:'nowrap'}}>{children}</span>
);

const ToggleBtn=({label,active,activeColor,activeBg,activeBorder,onClick})=>(
  <button onClick={onClick} style={{flex:1,padding:'7px 0',border:`1px solid ${active?activeBorder:'rgba(0,170,255,0.12)'}`,background:active?activeBg:'transparent',color:active?activeColor:'#3a6b8a',fontFamily:'Orbitron,sans-serif',fontSize:9,letterSpacing:1,cursor:'pointer',borderRadius:2,textTransform:'uppercase',transition:'all .15s'}}>{label}</button>
);

const SectionTitle=({children,action})=>(
  <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:14}}>
    <div style={{fontFamily:'Orbitron,sans-serif',fontSize:9,letterSpacing:2.5,color:'#3a6b8a',textTransform:'uppercase'}}>{children}</div>
    {action}
  </div>
);

const Card=({children,style})=>(
  <div style={Object.assign({background:'#060f1a',border:'1px solid rgba(0,170,255,0.09)',borderRadius:3,padding:16},style||{})}>{children}</div>
);

const ProgressBar=({label,current,target,color,sublabel})=>{
  const pct = target!==0 ? Math.min(100,Math.abs(current/target)*100) : 0;
  const barColor = pct>80?'#ff2255':pct>50?'#ffc800':color;

  return (
    <div style={{marginBottom:14}}>
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:6}}>
        <div style={{fontFamily:'Orbitron,sans-serif',fontSize:8,letterSpacing:1.5,color:'#3a6b8a',textTransform:'uppercase'}}>{label}</div>
        <div style={{fontFamily:'Orbitron,sans-serif',fontSize:10,fontWeight:700,color:barColor}}>{sublabel}</div>
      </div>
      <div style={{background:'rgba(0,170,255,0.06)',borderRadius:2,height:6,overflow:'hidden'}}>
        <div style={{width:pct+'%',height:'100%',background:barColor,borderRadius:2,transition:'width .4s ease'}}/>
      </div>
      <div style={{fontSize:8,color:'#2a4f68',marginTop:3,textAlign:'right'}}>{pct.toFixed(0)}% utilisé</div>
    </div>
  );
};


// ── TRADE CARD (gallery view) — standalone component ──────────────────────────
function TradeCard({t, onOpen, onLoadImg}) {
  const [img, setImg] = useState(null);
  const rVal = t.rValue;
  const isOpen = t.status === 'Open';
  const dotColor = isOpen ? '#ffc800' : rVal === 0 ? '#00aaff' : rVal > 0 ? '#00ffa3' : '#ff2255';
  useEffect(()=>{
    if(t.hasImage && onLoadImg) onLoadImg(t.id,0).then(v=>{ if(v) setImg(v); });
  },[t.id, t.hasImage]);
  return (
    <div onClick={()=>onOpen(t)}
      style={{cursor:'pointer',borderRadius:4,overflow:'hidden',background:'#060f1a',border:'1px solid rgba(0,170,255,0.1)',position:'relative',transition:'transform .18s, box-shadow .18s'}}
      onMouseEnter={e=>{e.currentTarget.style.transform='scale(1.03)';e.currentTarget.style.boxShadow='0 0 22px rgba(0,170,255,0.14)';e.currentTarget.style.borderColor='rgba(0,170,255,0.3)';}}
      onMouseLeave={e=>{e.currentTarget.style.transform='scale(1)';e.currentTarget.style.boxShadow='none';e.currentTarget.style.borderColor='rgba(0,170,255,0.1)';}}>
      {/* Image — 16:9 */}
      <div style={{paddingTop:'62%',position:'relative',background:'#02090f',overflow:'hidden'}}>
        {img ? (
          <img src={img} alt="" style={{position:'absolute',top:0,left:0,width:'100%',height:'100%',objectFit:'cover'}}/>
        ) : (
          <div style={{position:'absolute',inset:0,display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',gap:6}}>
            <div style={{fontSize:26,opacity:.25}}>📷</div>
            <div style={{fontFamily:'Orbitron,sans-serif',fontSize:7,letterSpacing:2,color:'rgba(58,107,138,0.4)',textTransform:'uppercase'}}>PAS DE SCREENSHOT</div>
          </div>
        )}
        <div style={{position:'absolute',top:0,left:0,right:0,height:3,background:dotColor,opacity:.85}}/>
      </div>
      {/* Info bar */}
      <div style={{padding:'9px 11px',background:'#060f1a',borderTop:'1px solid rgba(0,170,255,0.07)'}}>
        <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:5}}>
          <div style={{display:'flex',alignItems:'center',gap:6}}>
            <div style={{width:7,height:7,borderRadius:'50%',background:dotColor,boxShadow:'0 0 6px '+dotColor,flexShrink:0}}/>
            <span style={{fontFamily:'Orbitron,sans-serif',fontSize:9,fontWeight:700,letterSpacing:.5,color:t.symbol==='NAS100'?'#00aaff':'#ffc800'}}>{t.symbol}</span>
          </div>
          <span style={{fontFamily:'Orbitron,sans-serif',fontSize:11,fontWeight:700,color:isOpen?'#ffc800':rVal>0?'#00ffa3':'#ff2255'}}>
            {isOpen?'◉ LIVE':fmtR(rVal)}
          </span>
        </div>
        <div style={{display:'flex',alignItems:'center',justifyContent:'space-between'}}>
          <span style={{fontSize:9,color:'#3a6b8a',fontFamily:'Share Tech Mono,monospace'}}>{t.date}</span>
          <span style={{fontFamily:'Orbitron,sans-serif',fontSize:8,letterSpacing:.5,color:t.direction==='Long'?'#00ffa3':'#ff2255'}}>{t.direction==='Long'?'▲':'▼'} {t.direction}</span>
        </div>
      </div>
    </div>
  );
}

// ── MAIN ──────────────────────────────────────────────────────────────────────
export default function TradingJournal(){
  const [trades,    setTrades]    = useState([]);
  const [loaded,    setLoaded]    = useState(false);
  const [showForm,  setShowForm]  = useState(false);
  const [editId,    setEditId]    = useState(null);
  const [form,      setForm]      = useState(EMPTY);
  const [formImages, setFormImages] = useState([]);   // array of base64
  const [tab,       setTab]       = useState('dashboard');
  const [filter,    setFilter]    = useState('');
  const [stratFilter, setStratFilter] = useState('ALL');
  const [symFilter, setSymFilter] = useState('ALL');
  const [sort,      setSort]      = useState({field:'date',dir:'desc'});
  const [confirm,   setConfirm]   = useState(null);
  const [detail,    setDetail]    = useState(null);
  const [detailImgs, setDetailImgs] = useState([]);   // array of base64
  const [activeImg,  setActiveImg]  = useState(0);
  const [aiText,    setAiText]    = useState('');
  const [aiLoading, setAiLoading] = useState(false);
  const [obj,       setObj]       = useState(DEFAULT_OBJ);
  const [showObj,   setShowObj]   = useState(false);
  const [objForm,   setObjForm]   = useState(DEFAULT_OBJ);
  const [apiKey,    setApiKey]    = useState('');
  const [calYM,     setCalYM]     = useState(curYM());
  const [calDay,    setCalDay]    = useState(null);
  const [gridView,  setGridView]  = useState(true);
  const fileRef = useRef();

  // ── localStorage data layer ──────────────────────────────────────────────
  useEffect(()=>{
    try{ const o=localStorage.getItem('nexus-obj'); if(o) setObj(JSON.parse(o)); }catch{}
    try{ const k=localStorage.getItem('nexus-apikey'); if(k) setApiKey(k); }catch{}
    try{
      const saved=localStorage.getItem('nexus-trades-v3');
      setTrades(saved!==null?JSON.parse(saved):DEMO_TRADES);
    }catch{ setTrades([]); }
    setLoaded(true);
  },[]);

  const persist = next=>{
    setTrades(next);
    try{ localStorage.setItem('nexus-trades-v3',JSON.stringify(next)); }catch(e){ console.warn(e); }
  };

  const saveImg   = (id,b64,idx=0)=>{ try{ localStorage.setItem('ni-'+id+'-'+idx,b64); }catch{} };
  const loadImg   = async(id,idx=0)=>{ try{ return localStorage.getItem('ni-'+id+'-'+idx)||null; }catch{ return null; } };
  const deleteImg = async(id,count=5)=>{ try{ Array.from({length:count},(_,i)=>localStorage.removeItem('ni-'+id+'-'+i)); }catch{} };

  // ── Objectives ───────────────────────────────────────────────────────────
  const saveObj=()=>{ setObj(objForm); try{ localStorage.setItem('nexus-obj',JSON.stringify(objForm)); }catch{} setShowObj(false); };

  // ── Form ──────────────────────────────────────────────────────────────────
  const openAdd =()=>{ setEditId(null); setForm(Object.assign({},EMPTY,{date:today()})); setFormImages([]); setShowForm(true); };
  const openEdit=async t=>{
    setEditId(t.id);
    setForm({date:t.date,symbol:t.symbol,direction:t.direction,status:t.status,result:t.result||'',strategy:t.strategy,session:t.session||'NY Open',timeframe:t.timeframe||'15m',emotion:t.emotion||'😐 Neutre',notes:t.notes||'',retro:t.retro||''});
    const count=t.imageCount||0;
    if(count>0){
      const imgs=await Promise.all(Array.from({length:count},(_,i)=>loadImg(t.id,i)));
      setFormImages(imgs.filter(Boolean));
    } else { setFormImages([]); }
    setShowForm(true);
  };
  const setF=(k,v)=>setForm(f=>Object.assign({},f,{[k]:v}));
  const handleImg=async e=>{
    const files=[...e.target.files];
    if(!files.length) return;
    const b64s=await Promise.all(files.map(toBase64));
    setFormImages(prev=>[...prev,...b64s].slice(0,5));  // max 5 screenshots
    e.target.value='';
  };

  const submitForm=async()=>{
    if(!form.date||!form.symbol) return;
    const id=editId||Date.now();
    const trade={id,date:form.date,symbol:form.symbol,direction:form.direction,status:form.status,result:form.result.trim(),rValue:parseR(form.result),strategy:form.strategy,session:form.session,timeframe:form.timeframe,emotion:form.emotion,notes:form.notes,retro:form.retro||'',hasImage:formImages.length>0,imageCount:formImages.length};
    const next=editId?trades.map(t=>t.id===editId?trade:t):[...trades,trade];
    persist(next); setShowForm(false);
    await deleteImg(id,10);
    await Promise.all(formImages.map((img,i)=>saveImg(id,img,i)));
  };

  const doDelete=async id=>{ const next=trades.filter(t=>t.id!==id); persist(next); setConfirm(null); deleteImg(id); };
  const openDetail=async t=>{
    setDetail(t); setAiText(''); setAiLoading(false); setActiveImg(0);
    const count=t.imageCount||0;
    if(count>0){
      const imgs=await Promise.all(Array.from({length:count},(_,i)=>loadImg(t.id,i)));
      setDetailImgs(imgs.filter(Boolean));
    } else {
      // backward compat: try loading old single image
      const old=await loadImg(t.id,0);
      setDetailImgs(old?[old]:[]);
    }
  };
  const runAnalysis=async()=>{
    if(!detailImgs.length||!detail) return;
    if(!apiKey){ setAiText('⚠ Clé API manquante — ajoute ta clé Anthropic dans ⚙ Objectifs'); return; }
    setAiLoading(true); setAiText('');
    try{ setAiText(await analyzeChart(detailImgs[0],detail,apiKey)); }
    catch(e){ setAiText('⚠ Erreur: '+e.message); }
    setAiLoading(false);
  };

  // ── Stats ─────────────────────────────────────────────────────────────────
  const stats=useMemo(()=>{
    const closed=trades.filter(t=>t.status==='Closed'&&t.rValue!==null);
    const rVals=closed.map(t=>t.rValue);
    const wins=rVals.filter(v=>v>0), losses=rVals.filter(v=>v<0), bes=rVals.filter(v=>v===0);
    const totalR=rVals.reduce((a,b)=>a+b,0);
    const winLossTotal=wins.length+losses.length;
    const winRate=winLossTotal>0?(wins.length/winLossTotal)*100:0;
    const avgR=rVals.length?totalR/rVals.length:0;
    const gw=wins.reduce((a,b)=>a+b,0), gl=Math.abs(losses.reduce((a,b)=>a+b,0));
    const pf=gl>0?gw/gl:wins.length>0?99:0;
    const ym=curYM();
    const monthR=closed.filter(t=>t.date.startsWith(ym)).reduce((a,t)=>a+t.rValue,0);
    const td=today();
    const todayR=closed.filter(t=>t.date===td).reduce((a,t)=>a+t.rValue,0);
    const todayTrades=trades.filter(t=>t.date===td);

    // Equity curve
    const sortedC=[...closed].sort((a,b)=>a.date.localeCompare(b.date));
    let cum=0; const curve=sortedC.map(t=>{ cum=parseFloat((cum+t.rValue).toFixed(2)); return{label:t.date.slice(5),cumR:cum}; });

    // Min cumulative R (for total drawdown)
    let runMin=0; curve.forEach(p=>{ if(p.cumR<runMin) runMin=p.cumR; });

    // By symbol
    const bySym={}; closed.forEach(t=>{ bySym[t.symbol]=(bySym[t.symbol]||0)+t.rValue; });
    const symbolBars=Object.entries(bySym).map(([s,v])=>({symbol:s,r:parseFloat(v.toFixed(2))}));

    // By strategy
    const byStrat={}; closed.forEach(t=>{ if(!byStrat[t.strategy]) byStrat[t.strategy]={r:0,count:0,wins:0}; byStrat[t.strategy].r+=t.rValue; byStrat[t.strategy].count++; if(t.rValue>0) byStrat[t.strategy].wins++; });

    // By session
    const bySess={}; closed.forEach(t=>{ const s=t.session||'Unknown'; if(!bySess[s]) bySess[s]={r:0,count:0,wins:0,losses:0}; bySess[s].r+=t.rValue; bySess[s].count++; if(t.rValue>0) bySess[s].wins++; if(t.rValue<0) bySess[s].losses++; });
    const sessionBars=Object.entries(bySess).map(([s,v])=>{ const wl=v.wins+v.losses; return{session:s,winRate:wl>0?parseFloat(((v.wins/wl)*100).toFixed(1)):0,r:parseFloat(v.r.toFixed(2)),count:v.count}; });

    // Distribution
    const buckets=[{label:'<-2R',min:-Infinity,max:-2},{label:'-2→-1',min:-2,max:-1},{label:'-1→0',min:-1,max:0},{label:'0→+1',min:0,max:1},{label:'+1→+2',min:1,max:2},{label:'+2→+3',min:2,max:3},{label:'>+3R',min:3,max:Infinity}];
    const ymT=closed.filter(t=>t.date.startsWith(ym));
    const distData=buckets.map(b=>({label:b.label,count:ymT.filter(t=>t.rValue>b.min&&t.rValue<=b.max).length,pos:b.min>=0}));

    // Streak
    // Streak — BE exclus, uniquement Wins et Losses
    const sortedAll=[...closed].filter(t=>t.rValue!==0).sort((a,b)=>a.date.localeCompare(b.date));
    let curStreak=0,maxWin=0,maxLoss=0,tmpW=0,tmpL=0;
    sortedAll.forEach(t=>{ if(t.rValue>0){tmpW++;tmpL=0;if(tmpW>maxWin)maxWin=tmpW;}else{tmpL++;tmpW=0;if(tmpL>maxLoss)maxLoss=tmpL;} });
    let i=sortedAll.length-1;
    if(i>=0){ const lw=sortedAll[i].rValue>0; while(i>=0&&(sortedAll[i].rValue>0)===lw){curStreak++;i--;} if(!lw)curStreak=-curStreak; }

    // Heatmap
    const heatmap={}; DAYS_FR.forEach((_,di)=>{ heatmap[di]={}; SESSIONS.forEach(s=>{ heatmap[di][s]={r:0,count:0}; }); });
    closed.forEach(t=>{ const dow=getDOW(t.date),ses=t.session||'NY Open'; if(heatmap[dow]&&heatmap[dow][ses]!==undefined){heatmap[dow][ses].r+=t.rValue;heatmap[dow][ses].count++;} });

    // By emotion
    const byEmotion={}; closed.forEach(t=>{ const e=t.emotion||'Unknown'; if(!byEmotion[e])byEmotion[e]={r:0,count:0,wins:0}; byEmotion[e].r+=t.rValue;byEmotion[e].count++;if(t.rValue>0)byEmotion[e].wins++; });

    // Sharpe & EV
    const mean=avgR; const stdDev=rVals.length>1?Math.sqrt(rVals.reduce((a,v)=>a+Math.pow(v-mean,2),0)/rVals.length):0;
    const sharpe=stdDev>0?mean/stdDev:0;
    const avgWinR=wins.length?gw/wins.length:0; const avgLossR=losses.length?gl/losses.length:0;
    const ev=((winRate/100)*avgWinR)-((1-winRate/100)*avgLossR);

    // Calendar data - by date
    const byDate={}; closed.forEach(t=>{ byDate[t.date]=(byDate[t.date]||0)+t.rValue; });

    return{totalR,monthR,todayR,winRate,avgR,pf:isFinite(pf)?pf:99,totalTrades:trades.length,closedTrades:closed.length,openTrades:trades.filter(t=>t.status==='Open').length,wins:wins.length,losses:losses.length,bes:bes.length,curve,symbolBars,byStrat,sessionBars,distData,curStreak,maxWin,maxLoss,heatmap,byEmotion,sharpe,ev,minCumR:runMin,byDate,todayTrades};
  },[trades]);

  // ── Filter / sort ─────────────────────────────────────────────────────────
  const filtered=useMemo(()=>{
    let list=[...trades];
    if(filter)list=list.filter(t=>t.strategy.toLowerCase().includes(filter.toLowerCase())||(t.notes||'').toLowerCase().includes(filter.toLowerCase())||(t.session||'').toLowerCase().includes(filter.toLowerCase()));
    if(stratFilter!=='ALL')list=list.filter(t=>t.strategy===stratFilter);
    if(symFilter!=='ALL')list=list.filter(t=>t.symbol===symFilter);
    list.sort((a,b)=>{ const av=sort.field==='r'?(a.rValue??-Infinity):a[sort.field]??''; const bv=sort.field==='r'?(b.rValue??-Infinity):b[sort.field]??''; if(typeof av==='string')return sort.dir==='asc'?av.localeCompare(bv):bv.localeCompare(av); return sort.dir==='asc'?av-bv:bv-av; });
    return list;
  },[trades,filter,symFilter,stratFilter,sort]);

  const toggleSort=f=>setSort(s=>({field:f,dir:s.field===f&&s.dir==='desc'?'asc':'desc'}));

  if(!loaded)return <div style={{background:'#02090f',height:'100vh',display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',gap:16}}><div style={{fontFamily:'Orbitron,sans-serif',fontSize:12,letterSpacing:4,color:'#00aaff'}}>NEXUS TRADE</div><div style={{fontFamily:'Orbitron,sans-serif',fontSize:9,letterSpacing:3,color:'#3a6b8a'}}>LOADING...</div></div>;

  const tc=stats.totalR>=0?'#00ffa3':'#ff2255';
  const mc=stats.monthR>=0?'#00ffa3':'#ff2255';
  const sc=stats.curStreak>0?'#00ffa3':stats.curStreak<0?'#ff2255':'#3a6b8a';
  const TABS=['dashboard','journal','calendrier','analytics'];
  const heatColor=(r,count)=>{ if(!count)return 'rgba(0,170,255,0.03)'; if(r>0)return `rgba(0,255,163,${Math.min(0.65,0.12+r*0.14)})`; return `rgba(255,34,85,${Math.min(0.6,0.12+Math.abs(r)*0.14)})`; };

  // Calendar helpers
  const calYear=parseInt(calYM.split('-')[0]),calMonth=parseInt(calYM.split('-')[1]);
  const calDays=daysInMonth(calYM), calFirst=firstDOW(calYM);
  const prevCalYM=()=>{ const d=new Date(calYear,calMonth-2,1); setCalYM(d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')); setCalDay(null); };
  const nextCalYM=()=>{ const d=new Date(calYear,calMonth,  1); setCalYM(d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')); setCalDay(null); };

  // Table columns
  const baseCols=[{k:'date',l:'Date'},{k:'symbol',l:'Sym'},{k:'direction',l:'Dir'},{k:'session',l:'Session'},{k:'timeframe',l:'TF'},{k:'r',l:'R'},{k:'emotion',l:'Émotion'},{k:'status',l:'Statut'},{k:'_img',l:'📷'},{k:'_a',l:''}];
  const fullCols=[{k:'date',l:'Date'},{k:'symbol',l:'Symbol'},{k:'direction',l:'Dir'},{k:'session',l:'Session'},{k:'timeframe',l:'TF'},{k:'r',l:'R'},{k:'strategy',l:'Stratégie'},{k:'emotion',l:'Émotion'},{k:'notes',l:'Notes'},{k:'status',l:'Statut'},{k:'_img',l:'📷'},{k:'_a',l:''}];

  const TH=({col})=>(
    <th onClick={col.k!=='_a'&&col.k!=='_img'?()=>toggleSort(col.k):undefined}
      style={{fontFamily:'Orbitron,sans-serif',fontSize:8,letterSpacing:2,color:'#3a6b8a',textTransform:'uppercase',padding:'9px 10px',textAlign:'left',borderBottom:'1px solid rgba(0,170,255,0.09)',cursor:col.k!=='_a'&&col.k!=='_img'?'pointer':'default',whiteSpace:'nowrap',userSelect:'none'}}>
      {col.l}{sort.field===col.k&&<span style={{marginLeft:4,color:'#00aaff'}}>{sort.dir==='asc'?'▲':'▼'}</span>}
    </th>
  );

  const renderRow=(t,cols)=>{
    const rVal=t.rValue,isOpen=t.status==='Open';
    return(
      <tr key={t.id} onClick={()=>openDetail(t)} style={{transition:'background .15s',cursor:'pointer'}} onMouseEnter={e=>e.currentTarget.style.background='rgba(0,170,255,0.05)'} onMouseLeave={e=>e.currentTarget.style.background='transparent'}>
        {cols.map(c=>{
          const td=content=><td key={c.k} style={{padding:'9px 10px',borderBottom:'1px solid rgba(0,170,255,0.04)',whiteSpace:'nowrap'}}>{content}</td>;
          if(c.k==='date')     return td(<span style={{fontSize:11,color:'#3a6b8a'}}>{t.date}</span>);
          if(c.k==='symbol')   return td(<span style={{fontFamily:'Orbitron,sans-serif',fontSize:11,fontWeight:600,letterSpacing:1,color:t.symbol==='NAS100'?'#00aaff':'#ffc800'}}>{t.symbol}</span>);
          if(c.k==='direction')return td(<Badge color={t.direction==='Long'?'#00ffa3':'#ff2255'} bg={t.direction==='Long'?'rgba(0,255,163,0.08)':'rgba(255,34,85,0.08)'} border={t.direction==='Long'?'rgba(0,255,163,0.2)':'rgba(255,34,85,0.2)'}>{t.direction==='Long'?'▲':'▼'} {t.direction}</Badge>);
          if(c.k==='session')  return td(<span style={{fontSize:9,color:'#3a6b8a'}}>{t.session||'—'}</span>);
          if(c.k==='timeframe')return td(<span style={{fontFamily:'Orbitron,sans-serif',fontSize:9,color:'rgba(0,170,255,0.7)'}}>{t.timeframe||'—'}</span>);
          if(c.k==='r')        return td(isOpen?<Badge color='#ffc800' bg='rgba(255,200,0,0.08)' border='rgba(255,200,0,0.2)'>◉ EN COURS</Badge>:<span style={{fontFamily:'Orbitron,sans-serif',fontSize:12,fontWeight:700,color:rVal>=0?'#00ffa3':'#ff2255'}}>{fmtR(rVal)}</span>);
          if(c.k==='strategy') return td(<span style={{fontSize:9,color:'#3a6b8a'}}>{t.strategy}</span>);
          if(c.k==='emotion')  return td(<span style={{fontSize:11}}>{t.emotion||'—'}</span>);
          if(c.k==='notes')    return td(<span style={{fontSize:10,color:'#2a4f68',maxWidth:180,overflow:'hidden',textOverflow:'ellipsis',display:'block'}}>{t.notes||'—'}</span>);
          if(c.k==='status')   return td(isOpen?<Badge color='#ffc800' bg='rgba(255,200,0,0.08)' border='rgba(255,200,0,0.2)'>◉ LIVE</Badge>:<Badge color='#3a6b8a' bg='rgba(58,107,138,0.1)' border='rgba(58,107,138,0.2)'>✓ DONE</Badge>);
          if(c.k==='_img')     return td(<button onClick={e=>{e.stopPropagation();openDetail(t);}} style={{background:t.hasImage?'rgba(0,170,255,0.1)':'transparent',border:'1px solid '+(t.hasImage?'rgba(0,170,255,0.35)':'rgba(0,170,255,0.1)'),color:t.hasImage?'#00aaff':'#3a6b8a',borderRadius:2,cursor:'pointer',padding:'3px 8px',fontSize:11}}>{t.hasImage?'📷':'⊕'}</button>);
          if(c.k==='_a')       return td(<div style={{display:'flex',gap:5}}><button onClick={e=>{e.stopPropagation();openEdit(t);}} style={{background:'transparent',border:'none',color:'#3a6b8a',cursor:'pointer',fontSize:14}} onMouseEnter={e=>e.target.style.color='#00aaff'} onMouseLeave={e=>e.target.style.color='#3a6b8a'}>✎</button><button onClick={e=>{e.stopPropagation();setConfirm(t.id);}} style={{background:'transparent',border:'none',color:'rgba(255,34,85,0.35)',cursor:'pointer',fontSize:14}} onMouseEnter={e=>e.target.style.color='#ff2255'} onMouseLeave={e=>e.target.style.color='rgba(255,34,85,0.35)'}>✕</button></div>);
          return null;
        })}
      </tr>
    );
  };

  return(
    <div style={{minHeight:'100vh',background:'#02090f',backgroundImage:'radial-gradient(ellipse at 12% 0%,rgba(0,80,200,0.07) 0%,transparent 50%),radial-gradient(ellipse at 88% 100%,rgba(0,40,160,0.05) 0%,transparent 50%),linear-gradient(rgba(0,170,255,0.016) 1px,transparent 1px),linear-gradient(90deg,rgba(0,170,255,0.016) 1px,transparent 1px)',backgroundSize:'auto,auto,48px 48px,48px 48px',fontFamily:'Share Tech Mono,monospace',color:'#c5e8ff',padding:'16px',paddingBottom:48}}>
      <style>{CSS}</style>

      {/* HEADER */}
      <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:20,flexWrap:'wrap',gap:12}}>
        <div style={{display:'flex',alignItems:'center',gap:16,flexWrap:'wrap'}}>
          <div>
            <div style={{fontFamily:'Orbitron,sans-serif',fontWeight:900,fontSize:17,letterSpacing:4,color:'#00aaff',lineHeight:1}}>NEXUS<span style={{color:'#c5e8ff',fontWeight:400}}> TRADE</span></div>
            <div style={{fontFamily:'Orbitron,sans-serif',fontSize:7,letterSpacing:5,color:'#3a6b8a',marginTop:2}}>JOURNAL · R-BASED · v5.0</div>
          </div>
          <div style={{width:1,height:30,background:'rgba(0,170,255,0.15)'}}/>
          <div style={{display:'flex',gap:0}}>
            {TABS.map(t=><button key={t} onClick={()=>setTab(t)} style={{fontFamily:'Orbitron,sans-serif',fontSize:9,letterSpacing:2,textTransform:'uppercase',padding:'7px 14px',background:'transparent',border:'none',cursor:'pointer',borderBottom:'2px solid '+(tab===t?'#00aaff':'transparent'),color:tab===t?'#00aaff':'#3a6b8a',transition:'all .2s'}}>{t}</button>)}
          </div>
        </div>
        <div style={{display:'flex',alignItems:'center',gap:12}}>
          <div style={{fontSize:9,fontFamily:'Orbitron,sans-serif',letterSpacing:1,color:'#3a6b8a'}}><span className="blink" style={{color:'#00ffa3',marginRight:5}}>◉</span>{stats.openTrades} LIVE</div>
          <div style={{width:1,height:24,background:'rgba(0,170,255,0.12)'}}/>
          <div style={{fontFamily:'Orbitron,sans-serif',fontSize:9,color:tc}}>{fmtR(stats.totalR)}</div>
          <button onClick={openAdd} className="glow-border" onMouseEnter={e=>e.currentTarget.style.background='rgba(0,170,255,0.12)'} onMouseLeave={e=>e.currentTarget.style.background='transparent'} style={{background:'transparent',border:'1px solid #00aaff',color:'#00aaff',fontFamily:'Orbitron,sans-serif',fontSize:10,letterSpacing:2,padding:'8px 18px',cursor:'pointer',textTransform:'uppercase',borderRadius:2,transition:'background .2s'}}>＋ ADD TRADE</button>
        </div>
      </div>

      {/* ══ DASHBOARD ══════════════════════════════════════════════════════ */}
      {tab==='dashboard'&&(
        <div className="fade-in">

          {/* HERO METRICS — FTMO style 4 cards */}
          <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:10,marginBottom:14}}>
            {[
              {l:'R TOTAL',     v:fmtR(stats.totalR),    sub:stats.closedTrades+' trades fermés',  c:tc},
              {l:'CE MOIS',     v:fmtR(stats.monthR),    sub:MONTHS_FR[new Date().getMonth()],     c:mc},
              {l:"AUJOURD'HUI", v:fmtR(stats.todayR),    sub:stats.todayTrades.length+' trade(s)', c:stats.todayR>=0?'#00ffa3':'#ff2255'},
              {l:'WIN RATE',    v:stats.winRate.toFixed(1)+'%', sub:stats.wins+'W · '+stats.losses+'L · '+stats.bes+'BE', c:'#00aaff'},
            ].map((m,i)=>(
              <div key={i} style={{background:'#060f1a',border:'1px solid rgba(0,170,255,0.09)',borderRadius:3,padding:'16px 18px',position:'relative',overflow:'hidden',transition:'border-color .2s'}}
                onMouseEnter={e=>e.currentTarget.style.borderColor='rgba(0,170,255,0.22)'}
                onMouseLeave={e=>e.currentTarget.style.borderColor='rgba(0,170,255,0.09)'}>
                <div style={{position:'absolute',top:0,left:0,right:0,height:1,background:'linear-gradient(90deg,transparent,rgba(0,170,255,0.3),transparent)'}}/>
                <div style={{fontFamily:'Orbitron,sans-serif',fontSize:8,letterSpacing:2.5,color:'#3a6b8a',textTransform:'uppercase',marginBottom:10}}>{m.l}</div>
                <div style={{fontFamily:'Orbitron,sans-serif',fontSize:22,fontWeight:700,color:m.c,letterSpacing:.5,lineHeight:1}}>{m.v}</div>
                <div style={{fontSize:9,color:'#2a4f68',marginTop:5}}>{m.sub}</div>
              </div>
            ))}
          </div>

          {/* EQUITY CURVE — full width, FTMO style avec lignes de référence */}
          <div style={{background:'#060f1a',border:'1px solid rgba(0,170,255,0.09)',borderRadius:3,padding:16,marginBottom:14}}>
            <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:14}}>
              <div style={{fontFamily:'Orbitron,sans-serif',fontSize:9,letterSpacing:2.5,color:'#3a6b8a',textTransform:'uppercase'}}>◈ COURBE R CUMULATIF</div>
              <div style={{display:'flex',gap:16,fontSize:9,fontFamily:'Share Tech Mono,monospace'}}>
                <span style={{color:'rgba(0,255,163,0.6)'}}>— Target: {fmtR(obj.targetR)}</span>
                <span style={{color:'rgba(255,34,85,0.6)'}}>— DD Max: {fmtR(obj.totalDDR)}</span>
                <span style={{color:'rgba(255,200,0,0.6)'}}>— DD Jour: {fmtR(obj.dailyDDR)}</span>
              </div>
            </div>
            {stats.curve.length>0?(
              <ResponsiveContainer width="100%" height={240}>
                <AreaChart data={stats.curve} margin={{top:8,right:8,bottom:0,left:0}}>
                  <defs>
                    <linearGradient id="rg" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%"  stopColor={tc} stopOpacity={0.22}/>
                      <stop offset="95%" stopColor={tc} stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="label" tick={{fill:'#3a6b8a',fontSize:9,fontFamily:'Share Tech Mono'}} axisLine={false} tickLine={false} interval="preserveStartEnd"/>
                  <YAxis tick={{fill:'#3a6b8a',fontSize:9,fontFamily:'Share Tech Mono'}} axisLine={false} tickLine={false} tickFormatter={v=>(v>=0?'+':'')+v.toFixed(0)+'R'} width={48}/>
                  <Tooltip content={<CyTooltip/>}/>
                  <ReferenceLine y={0}             stroke="rgba(255,255,255,0.06)" strokeDasharray="4 4"/>
                  <ReferenceLine y={obj.targetR}   stroke="rgba(0,255,163,0.3)"   strokeDasharray="6 3" label={{value:'Target',fill:'rgba(0,255,163,0.5)',fontSize:8,fontFamily:'Orbitron,sans-serif'}}/>
                  <ReferenceLine y={obj.totalDDR}  stroke="rgba(255,34,85,0.3)"   strokeDasharray="6 3" label={{value:'DD Max',fill:'rgba(255,34,85,0.5)',fontSize:8,fontFamily:'Orbitron,sans-serif'}}/>
                  <ReferenceLine y={obj.dailyDDR}  stroke="rgba(255,200,0,0.2)"   strokeDasharray="3 3"/>
                  <Area type="monotone" dataKey="cumR" stroke={tc} strokeWidth={2.5} fill="url(#rg)" dot={false} activeDot={{r:4,fill:tc,stroke:'#060f1a',strokeWidth:2}}/>
                </AreaChart>
              </ResponsiveContainer>
            ):<div style={{height:240,display:'flex',alignItems:'center',justifyContent:'center',color:'#3a6b8a',fontSize:11,fontFamily:'Orbitron,sans-serif',letterSpacing:2}}>AUCUNE DONNÉE — AJOUTE TES PREMIERS TRADES</div>}
          </div>

          {/* ROW 2: Objectives + Advanced stats — FTMO Statistiques style */}
          <div style={{display:'grid',gridTemplateColumns:'1fr 2fr',gap:12,marginBottom:14}}>

            {/* Objectives panel */}
            <div style={{background:'#060f1a',border:'1px solid rgba(0,170,255,0.09)',borderRadius:3,padding:16}}>
              <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:14}}>
                <div style={{fontFamily:'Orbitron,sans-serif',fontSize:9,letterSpacing:2.5,color:'#3a6b8a',textTransform:'uppercase'}}>◈ OBJECTIFS</div>
                <button onClick={()=>{setObjForm(obj);setShowObj(true);}} style={{background:'transparent',border:'1px solid rgba(0,170,255,0.2)',color:'#3a6b8a',fontFamily:'Orbitron,sans-serif',fontSize:7,letterSpacing:1,padding:'3px 8px',cursor:'pointer',borderRadius:2,transition:'all .15s'}} onMouseEnter={e=>{e.currentTarget.style.color='#00aaff';e.currentTarget.style.borderColor='rgba(0,170,255,0.4)';}} onMouseLeave={e=>{e.currentTarget.style.color='#3a6b8a';e.currentTarget.style.borderColor='rgba(0,170,255,0.2)';}}>⚙ ÉDITER</button>
              </div>
              <ProgressBar label="🎯 Objectif mensuel" current={stats.monthR} target={obj.targetR} color='#00ffa3' sublabel={fmtR(stats.monthR)+' / '+fmtR(obj.targetR)}/>
              <ProgressBar label="⚠ DD journalier"    current={Math.min(0,stats.todayR)} target={obj.dailyDDR} color='#ffc800' sublabel={fmtR(Math.min(0,stats.todayR))+' / '+fmtR(obj.dailyDDR)}/>
              <ProgressBar label="🛑 DD total max"     current={Math.min(0,stats.minCumR)} target={obj.totalDDR} color='#ff2255' sublabel={fmtR(Math.min(0,stats.minCumR))+' / '+fmtR(obj.totalDDR)}/>
              <div style={{paddingTop:12,borderTop:'1px solid rgba(0,170,255,0.07)',display:'flex',justifyContent:'space-between',alignItems:'center'}}>
                <div style={{fontSize:9,color:'#3a6b8a',fontFamily:'Orbitron,sans-serif',letterSpacing:1}}>STREAK</div>
                <div style={{fontFamily:'Orbitron,sans-serif',fontSize:18,fontWeight:900,color:sc}}>{stats.curStreak===0?'—':(stats.curStreak>0?'+':'')+stats.curStreak}</div>
              </div>
            </div>

            {/* FTMO-style statistics grid */}
            <div style={{background:'#060f1a',border:'1px solid rgba(0,170,255,0.09)',borderRadius:3,padding:16}}>
              <div style={{fontFamily:'Orbitron,sans-serif',fontSize:9,letterSpacing:2.5,color:'#3a6b8a',textTransform:'uppercase',marginBottom:14}}>◈ STATISTIQUES</div>
              <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:8}}>
                {[
                  {l:'Profit moyen',  v:fmtR(stats.ev>0?stats.ev:0),        c:'#00ffa3'},
                  {l:'Perte moyenne', v:fmtR(stats.ev<0?stats.ev:-(stats.avgR<0?Math.abs(stats.avgR):0)), c:'#ff2255'},
                  {l:'Taux réussite', v:stats.winRate.toFixed(1)+'%',         c:stats.winRate>=50?'#00ffa3':'#ff2255'},
                  {l:'Nb de trades',  v:stats.totalTrades,                   c:'#c5e8ff'},
                  {l:'Break Even',    v:stats.bes+' trade'+(stats.bes>1?'s':''), c:'#00aaff'},
                  {l:'Sharpe Ratio',  v:stats.sharpe.toFixed(2),              c:stats.sharpe>0?'#00ffa3':'#ff2255'},
                  {l:'Valeur attendue',v:fmtR(stats.ev),                     c:stats.ev>=0?'#00ffa3':'#ff2255'},
                  {l:'Facteur profit',v:stats.pf===99?'∞':stats.pf.toFixed(2),c:stats.pf>=1?'#00ffa3':'#ff2255'},
                  {l:'Avg R',        v:fmtR(stats.avgR),                     c:stats.avgR>=0?'#00ffa3':'#ff2255'},
                  {l:'Positions live',v:stats.openTrades,                    c:'#ffc800'},
                ].map((m,i)=>(
                  <div key={i} style={{background:'#081625',border:'1px solid rgba(0,170,255,0.06)',borderRadius:2,padding:'10px 12px'}}>
                    <div style={{fontFamily:'Orbitron,sans-serif',fontSize:7,letterSpacing:1.5,color:'#2a4f68',textTransform:'uppercase',marginBottom:5}}>{m.l}</div>
                    <div style={{fontFamily:'Orbitron,sans-serif',fontSize:14,fontWeight:700,color:m.c}}>{m.v}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Recent trades */}
          <div style={{background:'#060f1a',border:'1px solid rgba(0,170,255,0.09)',borderRadius:3,padding:16}}>
            <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:14}}>
              <div style={{fontFamily:'Orbitron,sans-serif',fontSize:9,letterSpacing:2.5,color:'#3a6b8a',textTransform:'uppercase'}}>◈ TRADES RÉCENTS</div>
              {trades.length>5&&<button onClick={()=>setTab('journal')} style={{background:'transparent',border:'none',color:'#3a6b8a',fontSize:10,cursor:'pointer',fontFamily:'Share Tech Mono,monospace',transition:'color .2s'}} onMouseEnter={e=>e.target.style.color='#00aaff'} onMouseLeave={e=>e.target.style.color='#3a6b8a'}>→ Voir les {trades.length} trades</button>}
            </div>
            <div style={{overflowX:'auto'}}>
              <table style={{width:'100%',borderCollapse:'collapse'}}>
                <thead><tr>{baseCols.map(c=><TH key={c.k} col={c}/>)}</tr></thead>
                <tbody>{filtered.slice(0,6).map(t=>renderRow(t,baseCols))}</tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ══ JOURNAL ════════════════════════════════════════════════════════ */}
      {tab==='journal'&&(
        <div className="fade-in">
          <div style={{background:'#060f1a',border:'1px solid rgba(0,170,255,0.09)',borderRadius:3,padding:16}}>
            {/* Toolbar */}
            <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:16,flexWrap:'wrap',gap:8}}>
              <div style={{fontFamily:'Orbitron,sans-serif',fontSize:9,letterSpacing:2.5,color:'#3a6b8a',textTransform:'uppercase'}}>◈ TRADE LOG — {filtered.length} / {trades.length}</div>
              <div style={{display:'flex',gap:8,flexWrap:'wrap',alignItems:'center'}}>
                <div style={{display:'flex',gap:5}}>
                  {['ALL','NAS100','SPX500'].map(s=>(
                    <button key={s} onClick={()=>setSymFilter(s)} style={{fontFamily:'Orbitron,sans-serif',fontSize:8,letterSpacing:1.5,padding:'5px 11px',border:'1px solid '+(symFilter===s?'rgba(0,170,255,0.45)':'rgba(0,170,255,0.1)'),background:symFilter===s?'rgba(0,170,255,0.1)':'transparent',color:symFilter===s?'#00aaff':'#3a6b8a',cursor:'pointer',borderRadius:2,textTransform:'uppercase',transition:'all .15s'}}>{s}</button>
                  ))}
                </div>
                <input placeholder="Rechercher: stratégie, session, notes…" value={filter} onChange={e=>setFilter(e.target.value)}
                  style={{background:'#081625',border:'1px solid rgba(0,170,255,0.13)',color:'#c5e8ff',fontFamily:'Share Tech Mono,monospace',fontSize:11,padding:'5px 9px',borderRadius:2,outline:'none',width:200}}/>
                {/* View toggle */}
                <div style={{display:'flex',gap:3,background:'#081625',border:'1px solid rgba(0,170,255,0.12)',borderRadius:3,padding:3}}>
                  <button onClick={()=>setGridView(true)} title="Galerie"
                    style={{background:gridView?'rgba(0,170,255,0.15)':'transparent',border:'1px solid '+(gridView?'rgba(0,170,255,0.4)':'transparent'),color:gridView?'#00aaff':'#3a6b8a',cursor:'pointer',borderRadius:2,padding:'4px 10px',fontSize:14,lineHeight:1,transition:'all .15s'}}>⊞</button>
                  <button onClick={()=>setGridView(false)} title="Liste"
                    style={{background:!gridView?'rgba(0,170,255,0.15)':'transparent',border:'1px solid '+(!gridView?'rgba(0,170,255,0.4)':'transparent'),color:!gridView?'#00aaff':'#3a6b8a',cursor:'pointer',borderRadius:2,padding:'4px 10px',fontSize:14,lineHeight:1,transition:'all .15s'}}>☰</button>
                </div>
              </div>
            </div>

            {/* Strategy chips — filtre + edge en un coup d'œil */}
            {Object.keys(stats.byStrat).length>0&&(
              <div style={{display:'flex',gap:6,flexWrap:'wrap',marginBottom:16,paddingBottom:14,borderBottom:'1px solid rgba(0,170,255,0.07)'}}>
                <button onClick={()=>setStratFilter('ALL')}
                  style={{fontFamily:'Orbitron,sans-serif',fontSize:8,letterSpacing:1,padding:'6px 12px',border:'1px solid '+(stratFilter==='ALL'?'rgba(0,170,255,0.45)':'rgba(0,170,255,0.1)'),background:stratFilter==='ALL'?'rgba(0,170,255,0.1)':'transparent',color:stratFilter==='ALL'?'#00aaff':'#3a6b8a',cursor:'pointer',borderRadius:3,textTransform:'uppercase',transition:'all .15s'}}>
                  TOUTES
                </button>
                {Object.entries(stats.byStrat).sort((a,b)=>b[1].r-a[1].r).map(([s,v])=>{
                  const active=stratFilter===s;
                  const pos=v.r>=0;
                  return(
                    <button key={s} onClick={()=>setStratFilter(active?'ALL':s)}
                      style={{display:'flex',alignItems:'center',gap:6,fontFamily:'Orbitron,sans-serif',fontSize:8,letterSpacing:1,padding:'6px 12px',border:'1px solid '+(active?(pos?'rgba(0,255,163,0.5)':'rgba(255,34,85,0.5)'):'rgba(0,170,255,0.1)'),background:active?(pos?'rgba(0,255,163,0.1)':'rgba(255,34,85,0.1)'):'transparent',color:active?(pos?'#00ffa3':'#ff2255'):'#3a6b8a',cursor:'pointer',borderRadius:3,textTransform:'uppercase',transition:'all .15s'}}>
                      <span>{s}</span>
                      <span style={{color:pos?'#00ffa3':'#ff2255',fontWeight:700}}>{fmtR(v.r)}</span>
                      <span style={{color:'#2a4f68',fontWeight:400}}>· {v.count}</span>
                    </button>
                  );
                })}
              </div>
            )}

            {filtered.length===0&&(
              <div style={{padding:'40px 0',textAlign:'center',color:'#3a6b8a',fontFamily:'Orbitron,sans-serif',fontSize:11,letterSpacing:2}}>AUCUN TRADE</div>
            )}

            {/* ── GRID VIEW ── */}
            {gridView&&filtered.length>0&&(
              <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(190px,1fr))',gap:10}}>
                {filtered.map(t=><TradeCard key={t.id} t={t} onOpen={openDetail} onLoadImg={loadImg}/>)}
              </div>
            )}

            {/* ── LIST VIEW ── */}
            {!gridView&&filtered.length>0&&(
              <div style={{overflowX:'auto'}}>
                <table style={{width:'100%',borderCollapse:'collapse',minWidth:950}}>
                  <thead><tr>{fullCols.map(c=><TH key={c.k} col={c}/>)}</tr></thead>
                  <tbody>{filtered.map(t=>renderRow(t,fullCols))}</tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ══ CALENDRIER ═════════════════════════════════════════════════════ */}
      {tab==='calendrier'&&(
        <div className="fade-in" style={{display:'flex',flexDirection:'column',gap:12}}>
          <Card>
            {/* Month nav */}
            <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:18}}>
              <button onClick={prevCalYM} style={{background:'transparent',border:'1px solid rgba(0,170,255,0.2)',color:'#3a6b8a',fontFamily:'Orbitron,sans-serif',fontSize:10,padding:'6px 12px',cursor:'pointer',borderRadius:2,transition:'all .15s'}} onMouseEnter={e=>{e.currentTarget.style.color='#00aaff';e.currentTarget.style.borderColor='rgba(0,170,255,0.4)';}} onMouseLeave={e=>{e.currentTarget.style.color='#3a6b8a';e.currentTarget.style.borderColor='rgba(0,170,255,0.2)';}}>◀</button>
              <div>
                <div style={{fontFamily:'Orbitron,sans-serif',fontSize:14,fontWeight:700,letterSpacing:3,color:'#c5e8ff',textAlign:'center'}}>{MONTHS_FR[calMonth-1].toUpperCase()} {calYear}</div>
                <div style={{fontFamily:'Orbitron,sans-serif',fontSize:8,letterSpacing:2,color:'#3a6b8a',textAlign:'center',marginTop:3}}>
                  {(()=>{ const mTrades=Object.entries(stats.byDate).filter(([d])=>d.startsWith(calYM)); const mR=mTrades.reduce((a,[,v])=>a+v,0); return mTrades.length+' jours · '+fmtR(mR); })()}
                </div>
              </div>
              <button onClick={nextCalYM} style={{background:'transparent',border:'1px solid rgba(0,170,255,0.2)',color:'#3a6b8a',fontFamily:'Orbitron,sans-serif',fontSize:10,padding:'6px 12px',cursor:'pointer',borderRadius:2,transition:'all .15s'}} onMouseEnter={e=>{e.currentTarget.style.color='#00aaff';e.currentTarget.style.borderColor='rgba(0,170,255,0.4)';}} onMouseLeave={e=>{e.currentTarget.style.color='#3a6b8a';e.currentTarget.style.borderColor='rgba(0,170,255,0.2)';}}>▶</button>
            </div>

            {/* Day headers */}
            <div style={{display:'grid',gridTemplateColumns:'repeat(7,1fr)',gap:4,marginBottom:4}}>
              {DAYS_FR.map(d=><div key={d} style={{fontFamily:'Orbitron,sans-serif',fontSize:8,letterSpacing:1,color:'#3a6b8a',textAlign:'center',padding:'4px 0'}}>{d.toUpperCase()}</div>)}
            </div>

            {/* Calendar grid */}
            <div style={{display:'grid',gridTemplateColumns:'repeat(7,1fr)',gap:4}}>
              {Array.from({length:calFirst}).map((_,i)=><div key={'e'+i}/>)}
              {Array.from({length:calDays}).map((_,i)=>{
                const day=i+1;
                const dateStr=calYM+'-'+String(day).padStart(2,'0');
                const r=stats.byDate[dateStr];
                const dayTrades=trades.filter(t=>t.date===dateStr);
                const isToday=dateStr===today();
                const isSelected=dateStr===calDay;
                let bg='rgba(0,170,255,0.03)',border='rgba(0,170,255,0.07)';
                if(r!==undefined){ bg=r>=0?`rgba(0,255,163,${Math.min(0.22,0.06+Math.abs(r)*0.055)})`:`rgba(255,34,85,${Math.min(0.22,0.06+Math.abs(r)*0.055)})`; border=r>=0?'rgba(0,255,163,0.25)':'rgba(255,34,85,0.25)'; }
                if(isToday){ border='rgba(0,170,255,0.5)'; }
                if(isSelected){ border='#00aaff'; }
                return(
                  <div key={day} onClick={()=>setCalDay(isSelected?null:dateStr)}
                    style={{background:bg,border:'1px solid '+border,borderRadius:3,padding:'8px 4px',textAlign:'center',cursor:dayTrades.length>0||true?'pointer':'default',transition:'all .2s',minHeight:62}}
                    onMouseEnter={e=>{if(!isSelected)e.currentTarget.style.borderColor='rgba(0,170,255,0.35)';}}
                    onMouseLeave={e=>{if(!isSelected)e.currentTarget.style.borderColor=border;}}>
                    <div style={{fontFamily:'Orbitron,sans-serif',fontSize:9,fontWeight:isToday?700:400,color:isToday?'#00aaff':'#3a6b8a',marginBottom:4}}>{day}</div>
                    {r!==undefined&&<div style={{fontFamily:'Orbitron,sans-serif',fontSize:10,fontWeight:700,color:r>=0?'#00ffa3':'#ff2255'}}>{fmtR(r)}</div>}
                    {dayTrades.length>0&&<div style={{fontSize:8,color:'#2a4f68',marginTop:2}}>{dayTrades.length} trade{dayTrades.length>1?'s':''}</div>}
                  </div>
                );
              })}
            </div>
          </Card>

          {/* Selected day detail */}
          {calDay&&(()=>{
            const dayTrades=trades.filter(t=>t.date===calDay);
            const dayR=stats.byDate[calDay]||0;
            return(
              <Card>
                <SectionTitle>◈ {calDay} — {fmtR(dayR)} ({dayTrades.length} trade{dayTrades.length>1?'s':''})</SectionTitle>
                {dayTrades.length===0?(
                  <div style={{color:'#3a6b8a',fontSize:11,textAlign:'center',padding:16}}>Aucun trade ce jour</div>
                ):(
                  <div style={{overflowX:'auto'}}>
                    <table style={{width:'100%',borderCollapse:'collapse'}}>
                      <thead><tr>{baseCols.map(c=><TH key={c.k} col={c}/>)}</tr></thead>
                      <tbody>{dayTrades.map(t=>renderRow(t,baseCols))}</tbody>
                    </table>
                  </div>
                )}
              </Card>
            );
          })()}
        </div>
      )}

      {/* ══ ANALYTICS ══════════════════════════════════════════════════════ */}
      {tab==='analytics'&&(
        <div className="fade-in" style={{display:'flex',flexDirection:'column',gap:12}}>
          {/* Row 1 */}
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12}}>
            <Card>
              <SectionTitle>◈ WIN RATE PAR SESSION</SectionTitle>
              {stats.sessionBars.length>0?(
                <ResponsiveContainer width="100%" height={210}>
                  <BarChart data={stats.sessionBars} margin={{top:4,right:4,bottom:28,left:0}}>
                    <XAxis dataKey="session" tick={{fill:'#3a6b8a',fontSize:9,fontFamily:'Share Tech Mono'}} axisLine={false} tickLine={false} angle={-25} textAnchor="end" interval={0}/>
                    <YAxis tick={{fill:'#3a6b8a',fontSize:9,fontFamily:'Share Tech Mono'}} axisLine={false} tickLine={false} tickFormatter={v=>v+'%'} width={38} domain={[0,100]}/>
                    <Tooltip formatter={(v,n,p)=>[v+'% ('+p.payload.count+' trades)','']} contentStyle={{background:'#060f1a',border:'1px solid rgba(0,170,255,0.3)',fontFamily:'Share Tech Mono,monospace',fontSize:11}}/>
                    <ReferenceLine y={50} stroke="rgba(255,255,255,0.07)" strokeDasharray="4 4"/>
                    <Bar dataKey="winRate" radius={[2,2,0,0]} maxBarSize={42}>{stats.sessionBars.map((e,i)=><Cell key={i} fill={e.winRate>=50?'#00ffa3':'#ff2255'} fillOpacity={0.75}/>)}</Bar>
                  </BarChart>
                </ResponsiveContainer>
              ):<div style={{height:210,display:'flex',alignItems:'center',justifyContent:'center',color:'#3a6b8a',fontSize:11}}>AUCUNE DONNÉE</div>}
            </Card>
            <Card>
              <SectionTitle>◈ DISTRIBUTION R — CE MOIS</SectionTitle>
              {stats.distData.some(d=>d.count>0)?(
                <ResponsiveContainer width="100%" height={210}>
                  <BarChart data={stats.distData} margin={{top:4,right:4,bottom:4,left:0}}>
                    <XAxis dataKey="label" tick={{fill:'#3a6b8a',fontSize:9,fontFamily:'Share Tech Mono'}} axisLine={false} tickLine={false}/>
                    <YAxis tick={{fill:'#3a6b8a',fontSize:9,fontFamily:'Share Tech Mono'}} axisLine={false} tickLine={false} allowDecimals={false} width={28}/>
                    <Tooltip formatter={v=>[v+' trade'+(v>1?'s':''),'']} contentStyle={{background:'#060f1a',border:'1px solid rgba(0,170,255,0.3)',fontFamily:'Share Tech Mono,monospace',fontSize:11}}/>
                    <Bar dataKey="count" radius={[2,2,0,0]} maxBarSize={46}>{stats.distData.map((e,i)=><Cell key={i} fill={e.pos?'#00ffa3':'#ff2255'} fillOpacity={0.75}/>)}</Bar>
                  </BarChart>
                </ResponsiveContainer>
              ):<div style={{height:210,display:'flex',alignItems:'center',justifyContent:'center',color:'#3a6b8a',fontSize:11}}>AUCUNE DONNÉE CE MOIS</div>}
            </Card>
          </div>

          {/* HEATMAP — full width, grande */}
          <Card>
            <SectionTitle>◈ HEATMAP — JOUR × SESSION · AVG R</SectionTitle>
            <div style={{overflowX:'auto'}}>
              <table style={{borderCollapse:'separate',borderSpacing:5,width:'100%'}}>
                <thead>
                  <tr>
                    <th style={{fontFamily:'Orbitron,sans-serif',fontSize:9,color:'#3a6b8a',padding:'6px 12px',textAlign:'left',minWidth:50}}></th>
                    {SESSIONS.map(s=><th key={s} style={{fontFamily:'Orbitron,sans-serif',fontSize:8,letterSpacing:1.5,color:'#3a6b8a',padding:'6px 8px',textAlign:'center',whiteSpace:'nowrap',minWidth:100}}>{s}</th>)}
                  </tr>
                </thead>
                <tbody>
                  {[1,2,3,4,5].map(dow=>(
                    <tr key={dow}>
                      <td style={{fontFamily:'Orbitron,sans-serif',fontSize:10,color:'#3a6b8a',padding:'4px 12px',letterSpacing:2,fontWeight:600}}>{DAYS_FR[dow].toUpperCase()}</td>
                      {SESSIONS.map(ses=>{
                        const cell=stats.heatmap[dow]?.[ses]||{r:0,count:0};
                        const avg=cell.count?cell.r/cell.count:null;
                        return(
                          <td key={ses} style={{background:heatColor(cell.r,cell.count),borderRadius:4,padding:'18px 10px',textAlign:'center',border:'1px solid rgba(0,170,255,0.06)',transition:'background .2s'}}>
                            {cell.count>0?(
                              <>
                                <div style={{fontFamily:'Orbitron,sans-serif',fontSize:15,fontWeight:700,color:avg>=0?'#00ffa3':'#ff2255',marginBottom:4}}>{fmtR(avg)}</div>
                                <div style={{fontSize:9,color:'#3a6b8a'}}>{cell.count} trade{cell.count>1?'s':''}</div>
                              </>
                            ):<div style={{fontSize:12,color:'rgba(58,107,138,0.2)'}}>—</div>}
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
            <Card>
              <SectionTitle>◈ STREAK TRACKER</SectionTitle>
              <div style={{display:'flex',flexDirection:'column',gap:10}}>
                <div style={{background:'#081625',border:'1px solid rgba(0,170,255,0.07)',borderRadius:3,padding:'14px 16px',textAlign:'center'}}>
                  <div style={{fontFamily:'Orbitron,sans-serif',fontSize:8,letterSpacing:2,color:'#3a6b8a',marginBottom:6}}>STREAK ACTUEL</div>
                  <div style={{fontFamily:'Orbitron,sans-serif',fontSize:30,fontWeight:900,color:sc,lineHeight:1}}>{stats.curStreak===0?'—':(stats.curStreak>0?'+':'')+stats.curStreak}</div>
                  <div style={{fontSize:9,color:'#2a4f68',marginTop:5}}>{stats.curStreak>0?'wins de suite':stats.curStreak<0?'losses de suite':'aucun trade'}</div>
                </div>
                {[{l:'🏆 Max Win',v:stats.maxWin,c:'#00ffa3'},{l:'💀 Max Loss',v:stats.maxLoss,c:'#ff2255'}].map((m,i)=>(
                  <div key={i} style={{background:'#081625',border:'1px solid rgba(0,170,255,0.07)',borderRadius:3,padding:'10px 14px',display:'flex',justifyContent:'space-between',alignItems:'center'}}>
                    <div style={{fontSize:10,color:'#3a6b8a'}}>{m.l}</div>
                    <div style={{fontFamily:'Orbitron,sans-serif',fontSize:16,fontWeight:700,color:m.c}}>{m.v}</div>
                  </div>
                ))}
              </div>
            </Card>
            <Card>
              <SectionTitle>◈ R PAR ÉMOTION</SectionTitle>
              <div style={{display:'flex',flexDirection:'column',gap:6}}>
                {Object.entries(stats.byEmotion).sort((a,b)=>b[1].r-a[1].r).map(([e,v])=>{
                  const wr=v.count?((v.wins/v.count)*100).toFixed(0):0;
                  return(
                    <div key={e} style={{background:'#081625',border:'1px solid rgba(0,170,255,0.06)',borderRadius:3,padding:'8px 12px'}}>
                      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:3}}><span style={{fontSize:11}}>{e}</span><span style={{fontFamily:'Orbitron,sans-serif',fontSize:12,fontWeight:700,color:v.r>=0?'#00ffa3':'#ff2255'}}>{fmtR(v.r)}</span></div>
                      <div style={{display:'flex',justifyContent:'space-between'}}><span style={{fontSize:9,color:'#3a6b8a'}}>{v.count} trades</span><span style={{fontSize:9,color:wr>=50?'#00ffa3':'#ff2255'}}>{wr}% win</span></div>
                    </div>
                  );
                })}
                {Object.keys(stats.byEmotion).length===0&&<div style={{textAlign:'center',color:'#3a6b8a',fontSize:11,padding:20}}>AUCUNE DONNÉE</div>}
              </div>
            </Card>
            <Card>
              <SectionTitle>◈ R PAR STRATÉGIE</SectionTitle>
              <div style={{display:'flex',flexDirection:'column',gap:6}}>
                {Object.entries(stats.byStrat).sort((a,b)=>b[1].r-a[1].r).map(([s,v])=>{
                  const wr=v.count?((v.wins/v.count)*100).toFixed(0):0;
                  return(
                    <div key={s} style={{background:'#081625',border:'1px solid rgba(0,170,255,0.06)',borderRadius:3,padding:'8px 12px'}}>
                      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:3}}><span style={{fontSize:9,color:'#3a6b8a',fontFamily:'Orbitron,sans-serif',letterSpacing:1}}>{s}</span><span style={{fontFamily:'Orbitron,sans-serif',fontSize:12,fontWeight:700,color:v.r>=0?'#00ffa3':'#ff2255'}}>{fmtR(v.r)}</span></div>
                      <div style={{display:'flex',justifyContent:'space-between'}}><span style={{fontSize:9,color:'#3a6b8a'}}>{v.count} trades</span><span style={{fontSize:9,color:wr>=50?'#00ffa3':'#ff2255'}}>{wr}% win</span></div>
                    </div>
                  );
                })}
                {Object.keys(stats.byStrat).length===0&&<div style={{textAlign:'center',color:'#3a6b8a',fontSize:11,padding:20}}>AUCUNE DONNÉE</div>}
              </div>
            </Card>
          </div>
        </div>
      )}

      {/* ══ OBJECTIVES MODAL ═══════════════════════════════════════════════ */}
      {showObj&&(
        <div style={{position:'fixed',inset:0,background:'rgba(2,9,15,0.9)',backdropFilter:'blur(6px)',zIndex:150,display:'flex',alignItems:'center',justifyContent:'center',padding:16}}>
          <div className="fade-in" style={{background:'#060f1a',border:'1px solid rgba(0,170,255,0.3)',borderRadius:4,padding:24,width:380,boxShadow:'0 0 60px rgba(0,170,255,0.06)'}}>
            <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:20}}>
              <div style={{fontFamily:'Orbitron,sans-serif',fontSize:12,fontWeight:700,letterSpacing:2,color:'#00aaff'}}>◈ OBJECTIFS</div>
              <button onClick={()=>setShowObj(false)} style={{background:'transparent',border:'none',color:'#3a6b8a',fontSize:20,cursor:'pointer'}} onMouseEnter={e=>e.target.style.color='#ff2255'} onMouseLeave={e=>e.target.style.color='#3a6b8a'}>✕</button>
            </div>
            <div style={{display:'flex',flexDirection:'column',gap:14}}>
              <div>
                <div style={{fontFamily:'Orbitron,sans-serif',fontSize:8,letterSpacing:2,color:'#00ffa3',textTransform:'uppercase',marginBottom:5}}>🎯 OBJECTIF MENSUEL (+R)</div>
                <input type="number" step="0.5" value={objForm.targetR} onChange={e=>setObjForm(f=>Object.assign({},f,{targetR:parseFloat(e.target.value)||0}))} style={{width:'100%',background:'#081625',border:'1px solid rgba(0,255,163,0.25)',color:'#00ffa3',fontFamily:'Orbitron,sans-serif',fontSize:16,fontWeight:700,padding:'8px 12px',borderRadius:2,outline:'none'}}/>
                <div style={{fontSize:9,color:'#2a4f68',marginTop:4}}>Ex: 10 = objectif de +10R ce mois</div>
              </div>
              <div>
                <div style={{fontFamily:'Orbitron,sans-serif',fontSize:8,letterSpacing:2,color:'#ffc800',textTransform:'uppercase',marginBottom:5}}>⚠ DD JOURNALIER MAX (-R)</div>
                <input type="number" step="0.5" value={objForm.dailyDDR} onChange={e=>setObjForm(f=>Object.assign({},f,{dailyDDR:parseFloat(e.target.value)||0}))} style={{width:'100%',background:'#081625',border:'1px solid rgba(255,200,0,0.25)',color:'#ffc800',fontFamily:'Orbitron,sans-serif',fontSize:16,fontWeight:700,padding:'8px 12px',borderRadius:2,outline:'none'}}/>
                <div style={{fontSize:9,color:'#2a4f68',marginTop:4}}>Ex: -2 = max -2R par jour</div>
              </div>
              <div>
                <div style={{fontFamily:'Orbitron,sans-serif',fontSize:8,letterSpacing:2,color:'#ff2255',textTransform:'uppercase',marginBottom:5}}>🛑 DRAWDOWN TOTAL MAX (-R)</div>
                <input type="number" step="0.5" value={objForm.totalDDR} onChange={e=>setObjForm(f=>Object.assign({},f,{totalDDR:parseFloat(e.target.value)||0}))} style={{width:'100%',background:'#081625',border:'1px solid rgba(255,34,85,0.25)',color:'#ff2255',fontFamily:'Orbitron,sans-serif',fontSize:16,fontWeight:700,padding:'8px 12px',borderRadius:2,outline:'none'}}/>
                <div style={{fontSize:9,color:'#2a4f68',marginTop:4}}>Ex: -8 = max -8R sur le compte</div>
              </div>
            </div>

            {/* API Key section */}
            <div style={{marginTop:16,paddingTop:16,borderTop:'1px solid rgba(0,170,255,0.08)'}}>
              <div style={{fontFamily:'Orbitron,sans-serif',fontSize:8,letterSpacing:2,color:'#00aaff',textTransform:'uppercase',marginBottom:6}}>⚡ CLÉ API ANTHROPIC (pour l'analyse IA)</div>
              <div style={{fontSize:9,color:'#2a4f68',marginBottom:8,fontFamily:'Share Tech Mono,monospace',lineHeight:1.6}}>
                Va sur <span style={{color:'#00aaff'}}>console.anthropic.com</span> → API Keys → créer une clé.<br/>
                Elle est stockée uniquement sur ton appareil (localStorage).
              </div>
              <input
                type="password"
                value={apiKey}
                onChange={e=>setApiKey(e.target.value)}
                placeholder="sk-ant-api03-..."
                style={{width:'100%',background:'#081625',border:'1px solid rgba(0,170,255,0.2)',color:'#c5e8ff',fontFamily:'Share Tech Mono,monospace',fontSize:12,padding:'8px 12px',borderRadius:2,outline:'none'}}/>
              {apiKey&&<div style={{fontSize:9,color:'#00ffa3',marginTop:4,fontFamily:'Share Tech Mono,monospace'}}>✓ Clé configurée — {apiKey.slice(0,12)}...</div>}
            </div>

            <div style={{display:'flex',gap:8,marginTop:20,justifyContent:'flex-end'}}>
              <button onClick={()=>setShowObj(false)} style={{background:'transparent',border:'1px solid rgba(0,170,255,0.15)',color:'#3a6b8a',fontFamily:'Share Tech Mono,monospace',fontSize:11,padding:'8px 16px',cursor:'pointer',borderRadius:2}}>ANNULER</button>
              <button onClick={()=>{ setObj(objForm); setShowObj(false); try{ localStorage.setItem('nexus-obj',JSON.stringify(objForm)); localStorage.setItem('nexus-apikey',apiKey); }catch{} }} style={{background:'rgba(0,170,255,0.1)',border:'1px solid #00aaff',color:'#00aaff',fontFamily:'Orbitron,sans-serif',fontSize:10,letterSpacing:2,padding:'8px 22px',cursor:'pointer',borderRadius:2,textTransform:'uppercase'}}>SAUVEGARDER</button>
            </div>
          </div>
        </div>
      )}

      {/* ══ DETAIL / AI ════════════════════════════════════════════════════ */}
      {detail&&(
        <div style={{position:'fixed',inset:0,background:'rgba(2,9,15,0.92)',backdropFilter:'blur(8px)',zIndex:100,display:'flex',alignItems:'center',justifyContent:'center',padding:16}} onClick={()=>{setDetail(null);setDetailImgs([]);setAiText('');setActiveImg(0);}}>
          <div className="fade-in" onClick={e=>e.stopPropagation()} style={{background:'#060f1a',border:'1px solid rgba(0,170,255,0.25)',borderRadius:4,width:800,maxWidth:'100%',maxHeight:'90vh',overflowY:'auto',boxShadow:'0 0 80px rgba(0,170,255,0.07)'}}>
            <div style={{position:'sticky',top:0,zIndex:10,background:'#060f1a',borderBottom:'1px solid rgba(0,170,255,0.1)',padding:'14px 20px',display:'flex',alignItems:'center',justifyContent:'space-between',flexWrap:'wrap',gap:8}}>
              <div style={{display:'flex',alignItems:'center',gap:10,flexWrap:'wrap'}}>
                <span style={{fontFamily:'Orbitron,sans-serif',fontSize:11,fontWeight:700,letterSpacing:2,color:detail.symbol==='NAS100'?'#00aaff':'#ffc800'}}>{detail.symbol}</span>
                <Badge color={detail.direction==='Long'?'#00ffa3':'#ff2255'} bg={detail.direction==='Long'?'rgba(0,255,163,0.08)':'rgba(255,34,85,0.08)'} border={detail.direction==='Long'?'rgba(0,255,163,0.2)':'rgba(255,34,85,0.2)'}>{detail.direction==='Long'?'▲':'▼'} {detail.direction}</Badge>
                {detail.rValue!==null&&<span style={{fontFamily:'Orbitron,sans-serif',fontSize:13,fontWeight:700,color:detail.rValue>=0?'#00ffa3':'#ff2255'}}>{fmtR(detail.rValue)}</span>}
                <span style={{fontSize:9,color:'#3a6b8a'}}>{detail.date}</span>
                {detail.session&&<Badge color='rgba(0,170,255,0.7)' bg='rgba(0,170,255,0.06)' border='rgba(0,170,255,0.15)'>{detail.session}</Badge>}
                {detail.timeframe&&<Badge color='rgba(0,170,255,0.6)' bg='rgba(0,170,255,0.05)' border='rgba(0,170,255,0.12)'>{detail.timeframe}</Badge>}
                {detailImgs.length>0?(
                  <div>
                    <div style={{position:'relative',borderRadius:3,overflow:'hidden',border:'1px solid rgba(0,170,255,0.15)',marginBottom:8}}>
                      <img src={detailImgs[activeImg]} alt="trade" style={{width:'100%',display:'block',borderRadius:2,maxHeight:300,objectFit:'contain',background:'#02090f'}}/>
                      {detailImgs.length>1&&activeImg>0&&<button onClick={()=>setActiveImg(i=>i-1)} style={{position:'absolute',left:8,top:'50%',transform:'translateY(-50%)',background:'rgba(2,9,15,0.82)',border:'1px solid rgba(0,170,255,0.35)',color:'#00aaff',width:28,height:28,borderRadius:'50%',cursor:'pointer',fontSize:16,display:'flex',alignItems:'center',justifyContent:'center'}}>‹</button>}
                      {detailImgs.length>1&&activeImg<detailImgs.length-1&&<button onClick={()=>setActiveImg(i=>i+1)} style={{position:'absolute',right:8,top:'50%',transform:'translateY(-50%)',background:'rgba(2,9,15,0.82)',border:'1px solid rgba(0,170,255,0.35)',color:'#00aaff',width:28,height:28,borderRadius:'50%',cursor:'pointer',fontSize:16,display:'flex',alignItems:'center',justifyContent:'center'}}>›</button>}
                      <div style={{position:'absolute',top:7,left:7,background:'rgba(2,9,15,0.82)',border:'1px solid rgba(0,170,255,0.3)',color:'#00aaff',fontFamily:'Orbitron,sans-serif',fontSize:8,letterSpacing:1,padding:'3px 8px',borderRadius:2}}>
                        {['MAIN','HTF','LTF','ENTRY','EXTRA'][activeImg]||('#'+(activeImg+1))}{detailImgs.length>1?' '+String(activeImg+1)+'/'+String(detailImgs.length):''}
                      </div>
                      <button onClick={()=>{openEdit(detail);setDetail(null);setDetailImgs([]);setAiText('');}} style={{position:'absolute',bottom:7,right:7,background:'rgba(6,15,26,0.88)',border:'1px solid rgba(0,170,255,0.3)',color:'#3a6b8a',fontFamily:'Orbitron,sans-serif',fontSize:8,letterSpacing:1,padding:'4px 10px',cursor:'pointer',borderRadius:2}} onMouseEnter={e=>e.currentTarget.style.color='#00aaff'} onMouseLeave={e=>e.currentTarget.style.color='#3a6b8a'}>MODIFIER</button>
                    </div>
                    {detailImgs.length>1&&(
                      <div style={{display:'flex',gap:6,overflowX:'auto',paddingBottom:4}}>
                        {detailImgs.map((img,i)=>(
                          <div key={i} onClick={()=>setActiveImg(i)} style={{flexShrink:0,width:56,height:36,borderRadius:2,overflow:'hidden',cursor:'pointer',border:'1px solid '+(i===activeImg?'#00aaff':'rgba(0,170,255,0.12)'),opacity:i===activeImg?1:0.5,transition:'all .15s'}}>
                            <img src={img} style={{width:'100%',height:'100%',objectFit:'cover'}}/>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ):(
                  <div onClick={()=>{openEdit(detail);setDetail(null);setDetailImgs([]);setAiText('');}} style={{border:'1px dashed rgba(0,170,255,0.2)',borderRadius:3,padding:40,textAlign:'center',cursor:'pointer',transition:'all .2s',background:'rgba(0,170,255,0.02)'}} onMouseEnter={e=>{e.currentTarget.style.borderColor='rgba(0,170,255,0.45)';e.currentTarget.style.background='rgba(0,170,255,0.05)';}} onMouseLeave={e=>{e.currentTarget.style.borderColor='rgba(0,170,255,0.2)';e.currentTarget.style.background='rgba(0,170,255,0.02)';}}>
                    <div style={{fontSize:28,marginBottom:10}}>📷</div>
                    <div style={{fontFamily:'Orbitron,sans-serif',fontSize:9,letterSpacing:2,color:'#3a6b8a',textTransform:'uppercase'}}>Ajouter des screenshots</div>
                    <div style={{fontSize:10,color:'#2a4f68',marginTop:6}}>HTF · LTF · Entrée · jusqu'à 5 images</div>
                  </div>
                )}
              </div>
              <div style={{display:'flex',flexDirection:'column',gap:12}}>
                <div style={{background:'#081625',border:'1px solid rgba(0,170,255,0.08)',borderRadius:3,padding:14}}>
                  <div style={{fontFamily:'Orbitron,sans-serif',fontSize:8,letterSpacing:2.5,color:'#3a6b8a',textTransform:'uppercase',marginBottom:10}}>◈ DÉTAILS</div>
                  <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8}}>
                    {[{l:'Résultat',v:detail.result||'—'},{l:'Stratégie',v:detail.strategy},{l:'Session',v:detail.session||'—'},{l:'Timeframe',v:detail.timeframe||'—'},{l:'État',v:detail.emotion||'—'},{l:'Status',v:detail.status}].map((r,i)=>(
                      <div key={i}><div style={{fontSize:8,letterSpacing:1,color:'#2a4f68',textTransform:'uppercase',marginBottom:2,fontFamily:'Orbitron,sans-serif'}}>{r.l}</div><div style={{fontSize:11,color:'#c5e8ff'}}>{r.v}</div></div>
                    ))}
                  </div>
                  {detail.notes&&<div style={{marginTop:10,paddingTop:10,borderTop:'1px solid rgba(0,170,255,0.07)',fontSize:10,color:'#3a6b8a',lineHeight:1.7}}><span style={{fontFamily:'Orbitron,sans-serif',fontSize:7,letterSpacing:2,color:'#2a4f68'}}>NOTES · </span>{detail.notes}</div>}
                  {detail.retro&&<div style={{marginTop:10,paddingTop:10,borderTop:'1px solid rgba(255,200,0,0.12)',background:'rgba(255,200,0,0.04)',borderRadius:2,padding:'10px 12px'}}><div style={{fontFamily:'Orbitron,sans-serif',fontSize:7,letterSpacing:2,color:'#ffc800',marginBottom:5}}>💡 QU'AURAIS-JE DÛ FAIRE ?</div><div style={{fontSize:10,color:'#c5e8ff',lineHeight:1.75}}>{detail.retro}</div></div>}
                </div>
                <div style={{background:'#081625',border:'1px solid rgba(0,170,255,0.08)',borderRadius:3,padding:14,flex:1}}>
                  <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:10}}>
                    <div style={{fontFamily:'Orbitron,sans-serif',fontSize:8,letterSpacing:2.5,color:'#3a6b8a',textTransform:'uppercase'}}>◈ ANALYSE IA</div>
                    {detailImgs.length>0&&!aiLoading&&<button onClick={runAnalysis} style={{background:'rgba(0,170,255,0.08)',border:'1px solid rgba(0,170,255,0.35)',color:'#00aaff',fontFamily:'Orbitron,sans-serif',fontSize:8,letterSpacing:1.5,padding:'5px 12px',cursor:'pointer',borderRadius:2,textTransform:'uppercase',transition:'all .2s'}} onMouseEnter={e=>{e.currentTarget.style.background='rgba(0,170,255,0.18)';}} onMouseLeave={e=>{e.currentTarget.style.background='rgba(0,170,255,0.08)';}}>
                      {aiText?'↺ RELANCER':'⚡ ANALYSER'}
                    </button>}
                  </div>
                  {detailImgs.length===0&&!aiText&&<div style={{fontSize:10,color:'#2a4f68',lineHeight:1.7}}>Ajoute des screenshots pour le feedback IA mentor.</div>}
                  {detailImgs.length>0&&!aiLoading&&!aiText&&<div style={{textAlign:'center',padding:'20px 0',fontSize:10,color:'#2a4f68'}}>Clique ⚡ ANALYSER pour le feedback mentor IA</div>}
                  {aiLoading&&<div style={{textAlign:'center',padding:'24px 0',display:'flex',flexDirection:'column',alignItems:'center',gap:10}}><div style={{width:20,height:20,border:'2px solid rgba(0,170,255,0.2)',borderTopColor:'#00aaff',borderRadius:'50%'}} className="spin"/><div style={{fontFamily:'Orbitron,sans-serif',fontSize:8,letterSpacing:2,color:'#3a6b8a'}}>ANALYSE EN COURS...</div></div>}
                  {aiText&&!aiLoading&&<div style={{fontSize:11,color:'#c5e8ff',lineHeight:1.9,whiteSpace:'pre-wrap'}}>{aiText.split('\n').map((line,i)=>{ const fmt=line.replace(/\*\*(.*?)\*\*/g,'<strong style="color:#00aaff;font-family:Orbitron,sans-serif;font-size:9px;letter-spacing:1.5px;text-transform:uppercase">$1</strong>'); return <div key={i} dangerouslySetInnerHTML={{__html:fmt}} style={{color:line.startsWith('•')||line.startsWith('-')?'#a0c8e0':'#8ab5cc',marginBottom:4}}/>; })}</div>}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ══ ADD/EDIT FORM ══════════════════════════════════════════════════ */}
      {showForm&&(
        <div style={{position:'fixed',inset:0,background:'rgba(2,9,15,0.9)',backdropFilter:'blur(6px)',zIndex:110,display:'flex',alignItems:'center',justifyContent:'center',padding:16}}>
          <div className="fade-in" style={{background:'#060f1a',border:'1px solid rgba(0,170,255,0.3)',borderRadius:4,padding:24,width:560,maxWidth:'100%',maxHeight:'90vh',overflowY:'auto',boxShadow:'0 0 60px rgba(0,170,255,0.06)',position:'relative'}}>
            <div style={{position:'absolute',top:0,left:0,right:0,height:1,background:'linear-gradient(90deg,transparent,rgba(0,170,255,0.5),transparent)',borderRadius:'4px 4px 0 0'}}/>
            <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:20}}>
              <div style={{fontFamily:'Orbitron,sans-serif',fontSize:14,fontWeight:700,letterSpacing:2,color:'#00aaff'}}>{editId?'◈ MODIFIER':'◈ NOUVEAU TRADE'}</div>
              <button onClick={()=>setShowForm(false)} style={{background:'transparent',border:'none',color:'#3a6b8a',fontSize:20,cursor:'pointer'}} onMouseEnter={e=>e.target.style.color='#ff2255'} onMouseLeave={e=>e.target.style.color='#3a6b8a'}>✕</button>
            </div>
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
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12,marginBottom:12}}>
              <FF label="DATE" value={form.date} onChange={v=>setF('date',v)} type="date"/>
              <div>
                <div style={{fontFamily:'Orbitron,sans-serif',fontSize:8,letterSpacing:2,color:'#3a6b8a',textTransform:'uppercase',marginBottom:5}}>RÉSULTAT (R)</div>
                <div style={{display:'flex',gap:6,alignItems:'stretch'}}>
                  <input value={form.result} onChange={e=>setF('result',e.target.value)} placeholder="+3 / -1 / +2.3R"
                    style={{flex:1,background:'#081625',border:'1px solid '+(form.result&&parseR(form.result)!==null?(parseR(form.result)>0?'rgba(0,255,163,0.3)':parseR(form.result)<0?'rgba(255,34,85,0.3)':'rgba(0,170,255,0.35)'):'rgba(0,170,255,0.13)'),color:form.result&&parseR(form.result)!==null?(parseR(form.result)>0?'#00ffa3':parseR(form.result)<0?'#ff2255':'#00aaff'):'#c5e8ff',fontFamily:'Orbitron,sans-serif',fontSize:16,fontWeight:700,padding:'8px 10px',borderRadius:2,outline:'none',letterSpacing:1,transition:'all .2s'}}/>
                  <button onClick={()=>setF('result','0')}
                    style={{background:form.result==='0'?'rgba(0,170,255,0.18)':'rgba(0,170,255,0.05)',border:'1px solid '+(form.result==='0'?'#00aaff':'rgba(0,170,255,0.2)'),color:form.result==='0'?'#00aaff':'#3a6b8a',fontFamily:'Orbitron,sans-serif',fontSize:9,letterSpacing:1,padding:'0 12px',cursor:'pointer',borderRadius:2,transition:'all .15s',whiteSpace:'nowrap'}}>
                    ◈ BE
                  </button>
                </div>
                {form.result!==''&&parseR(form.result)!==null&&(
                  <div style={{fontFamily:'Orbitron,sans-serif',fontSize:9,marginTop:5,letterSpacing:1,color:parseR(form.result)>0?'#00ffa3':parseR(form.result)<0?'#ff2255':'#00aaff'}}>
                    {parseR(form.result)===0?'◈ BREAK EVEN — ne compte pas dans la Win Rate':fmtR(parseR(form.result))}
                  </div>
                )}
              </div>
            </div>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12,marginBottom:12}}>
              <SelectF label="SESSION"   value={form.session}   onChange={v=>setF('session',v)}   options={SESSIONS}/>
              <SelectF label="TIMEFRAME" value={form.timeframe} onChange={v=>setF('timeframe',v)} options={TIMEFRAMES}/>
            </div>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12,marginBottom:12}}>
              <SelectF label="STRATÉGIE" value={form.strategy} onChange={v=>setF('strategy',v)} options={STRATEGIES}/>
              <div>
                <div style={{fontFamily:'Orbitron,sans-serif',fontSize:8,letterSpacing:2,color:'#3a6b8a',textTransform:'uppercase',marginBottom:5}}>ÉTAT ÉMOTIONNEL</div>
                <div style={{display:'flex',flexWrap:'wrap',gap:5}}>
                  {EMOTIONS.map(e=><button key={e} onClick={()=>setF('emotion',e)} style={{padding:'5px 10px',border:'1px solid '+(form.emotion===e?'rgba(0,170,255,0.45)':'rgba(0,170,255,0.1)'),background:form.emotion===e?'rgba(0,170,255,0.12)':'transparent',color:form.emotion===e?'#c5e8ff':'#3a6b8a',fontSize:11,cursor:'pointer',borderRadius:2,transition:'all .15s',whiteSpace:'nowrap'}}>{e}</button>)}
                </div>
              </div>
            </div>
            <div style={{marginBottom:12}}>
              <div style={{fontFamily:'Orbitron,sans-serif',fontSize:8,letterSpacing:2,color:'#3a6b8a',textTransform:'uppercase',marginBottom:5}}>NOTES</div>
              <textarea value={form.notes} onChange={e=>setF('notes',e.target.value)} rows={2} placeholder="Setup, contexte macro, confluences…" style={{width:'100%',background:'#081625',border:'1px solid rgba(0,170,255,0.13)',color:'#c5e8ff',fontFamily:'Share Tech Mono,monospace',fontSize:12,padding:'8px 10px',borderRadius:2,outline:'none',resize:'vertical'}}/>
            </div>
            <div style={{marginBottom:14}}>
              <div style={{fontFamily:'Orbitron,sans-serif',fontSize:8,letterSpacing:2,color:'#ffc800',textTransform:'uppercase',marginBottom:5}}>💡 QU'AURAIS-JE DÛ FAIRE ?</div>
              <div style={{fontSize:9,color:'#2a4f68',marginBottom:6}}>Relecture à froid — remplis 24h après.</div>
              <textarea value={form.retro} onChange={e=>setF('retro',e.target.value)} rows={2} placeholder="Aurais dû attendre la confirmation…" style={{width:'100%',background:'rgba(255,200,0,0.04)',border:'1px solid rgba(255,200,0,0.18)',color:'#c5e8ff',fontFamily:'Share Tech Mono,monospace',fontSize:12,padding:'8px 10px',borderRadius:2,outline:'none',resize:'vertical'}} onFocus={e=>e.target.style.borderColor='rgba(255,200,0,0.45)'} onBlur={e=>e.target.style.borderColor='rgba(255,200,0,0.18)'}/>
            </div>
            {/* ── Multi-Screenshots ── */}
            <div style={{marginBottom:16}}>
              <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:8}}>
                <div style={{fontFamily:'Orbitron,sans-serif',fontSize:8,letterSpacing:2,color:'#3a6b8a',textTransform:'uppercase'}}>◈ SCREENSHOTS ({formImages.length}/5)</div>
                {formImages.length<5&&<button onClick={()=>fileRef.current.click()} style={{background:'rgba(0,170,255,0.08)',border:'1px solid rgba(0,170,255,0.3)',color:'#00aaff',fontFamily:'Orbitron,sans-serif',fontSize:8,letterSpacing:1,padding:'4px 12px',cursor:'pointer',borderRadius:2}}>+ AJOUTER</button>}
              </div>
              <input ref={fileRef} type="file" accept="image/*" multiple onChange={handleImg}/>
              {formImages.length>0?(
                <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(130px,1fr))',gap:8}}>
                  {formImages.map((img,i)=>(
                    <div key={i} style={{position:'relative',borderRadius:3,overflow:'hidden',border:'1px solid rgba(0,170,255,0.15)',background:'#02090f'}}>
                      <div style={{paddingTop:'62%',position:'relative'}}>
                        <img src={img} alt={'screen '+(i+1)} style={{position:'absolute',inset:0,width:'100%',height:'100%',objectFit:'cover'}}/>
                        <div style={{position:'absolute',top:0,left:0,right:0,height:2,background:'#00aaff',opacity:.6}}/>
                        <div style={{position:'absolute',bottom:3,left:5,fontFamily:'Orbitron,sans-serif',fontSize:7,color:'rgba(0,170,255,0.8)',letterSpacing:1,background:'rgba(2,9,15,0.7)',padding:'1px 4px',borderRadius:1}}>
                          {['MAIN','HTF','LTF','ENTRY','EXTRA'][i]||('#'+(i+1))}
                        </div>
                        <button onClick={()=>setFormImages(prev=>prev.filter((_,j)=>j!==i))}
                          style={{position:'absolute',top:4,right:4,background:'rgba(2,9,15,0.85)',border:'1px solid #ff2255',color:'#ff2255',width:18,height:18,borderRadius:'50%',cursor:'pointer',fontSize:10,display:'flex',alignItems:'center',justifyContent:'center',padding:0,lineHeight:1}}>✕</button>
                      </div>
                    </div>
                  ))}
                  {formImages.length<5&&(
                    <div onClick={()=>fileRef.current.click()} style={{border:'1px dashed rgba(0,170,255,0.18)',borderRadius:3,display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',gap:4,cursor:'pointer',paddingTop:'62%',position:'relative',transition:'all .2s',background:'rgba(0,170,255,0.02)'}}
                      onMouseEnter={e=>{e.currentTarget.style.borderColor='rgba(0,170,255,0.4)';e.currentTarget.style.background='rgba(0,170,255,0.05)';}}
                      onMouseLeave={e=>{e.currentTarget.style.borderColor='rgba(0,170,255,0.18)';e.currentTarget.style.background='rgba(0,170,255,0.02)';}}>
                      <div style={{position:'absolute',inset:0,display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',gap:4}}>
                        <div style={{fontSize:18}}>📷</div>
                        <div style={{fontFamily:'Orbitron,sans-serif',fontSize:7,letterSpacing:1,color:'#3a6b8a'}}>AJOUTER</div>
                      </div>
                    </div>
                  )}
                </div>
              ):(
                <div onClick={()=>fileRef.current.click()} style={{border:'1px dashed rgba(0,170,255,0.18)',borderRadius:3,padding:'22px 0',textAlign:'center',cursor:'pointer',transition:'all .2s',background:'rgba(0,170,255,0.02)'}}
                  onMouseEnter={e=>{e.currentTarget.style.borderColor='rgba(0,170,255,0.4)';e.currentTarget.style.background='rgba(0,170,255,0.05)';}}
                  onMouseLeave={e=>{e.currentTarget.style.borderColor='rgba(0,170,255,0.18)';e.currentTarget.style.background='rgba(0,170,255,0.02)';}}>
                  <div style={{fontSize:24,marginBottom:6}}>📷</div>
                  <div style={{fontFamily:'Orbitron,sans-serif',fontSize:8,letterSpacing:2,color:'#3a6b8a'}}>AJOUTER DES SCREENSHOTS</div>
                  <div style={{fontSize:9,color:'#2a4f68',marginTop:4}}>Jusqu'à 5 — HTF · LTF · Entrée · etc.</div>
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

      {/* ══ DELETE ═════════════════════════════════════════════════════════ */}
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
