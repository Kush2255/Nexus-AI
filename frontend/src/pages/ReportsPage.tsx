import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { FileText, Download, Eye, X, Loader, Search, RefreshCw } from 'lucide-react';
import AppLayout from '../components/layout/AppLayout';
import { reportsAPI, exportAPI } from '../services/api';

const triggerDl = (blob:Blob,name:string) => { const u=URL.createObjectURL(blob);const a=document.createElement('a');a.href=u;a.download=name;a.click();URL.revokeObjectURL(u); };

function ReportModal({ report, onClose }: { report:any; onClose:()=>void }) {
  const [dl, setDl] = useState<string|null>(null);
  const download = async (fmt:string) => {
    setDl(fmt);
    try { const r=await exportAPI.exportReport(report.id,fmt); triggerDl(r.data,`report-${report.id.slice(0,8)}.${fmt==='pdf'?'pdf':'md'}`); }
    catch(e){ console.error(e); } finally { setDl(null); }
  };
  return (
    <motion.div initial={{ opacity:0 }} animate={{ opacity:1 }} exit={{ opacity:0 }}
      onClick={onClose}
      style={{ position:'fixed',inset:0,background:'rgba(0,0,0,0.78)',backdropFilter:'blur(4px)',zIndex:50,display:'flex',alignItems:'center',justifyContent:'center',padding:24 }}>
      <motion.div initial={{ scale:0.95,y:16 }} animate={{ scale:1,y:0 }} exit={{ scale:0.95,y:16 }}
        onClick={e=>e.stopPropagation()}
        style={{ background:'#141414',border:'1px solid rgba(255,255,255,0.12)',borderRadius:20,width:'100%',maxWidth:680,maxHeight:'82vh',display:'flex',flexDirection:'column' }}>
        <div style={{ display:'flex',alignItems:'center',justifyContent:'space-between',padding:'16px 20px',borderBottom:'1px solid rgba(255,255,255,0.07)' }}>
          <p style={{ fontSize:14,color:'#e0e0e0',fontWeight:500,flex:1,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap',paddingRight:16,fontFamily:'var(--font-display)' }}>{report.title}</p>
          <div style={{ display:'flex',alignItems:'center',gap:8,flexShrink:0 }}>
            {[{fmt:'markdown',ext:'.md'},{fmt:'pdf',ext:'.pdf'}].map(({fmt,ext})=>(
              <button key={fmt} onClick={()=>download(fmt)} disabled={!!dl}
                style={{ display:'flex',alignItems:'center',gap:5,padding:'6px 12px',background:'#1e1e1e',border:'1px solid rgba(255,255,255,0.12)',borderRadius:8,color:'#b0b0b0',fontSize:12,cursor:'pointer',opacity:dl?0.5:1 }}>
                {dl===fmt?<Loader size={11} style={{ animation:'spin-slow 1.5s linear infinite' }}/>:<Download size={11}/>} {ext}
              </button>
            ))}
            <button onClick={onClose} style={{ width:30,height:30,background:'#1e1e1e',border:'1px solid rgba(255,255,255,0.1)',borderRadius:8,display:'flex',alignItems:'center',justifyContent:'center',color:'#909090',cursor:'pointer' }}>
              <X size={13}/>
            </button>
          </div>
        </div>
        <div style={{ flex:1,overflowY:'auto',padding:'20px 28px' }}>
          <div className="markdown"><ReactMarkdown remarkPlugins={[remarkGfm]}>{report.content||'# No content'}</ReactMarkdown></div>
        </div>
      </motion.div>
    </motion.div>
  );
}

function ReportCard({ report, i, onPreview }: { report:any; i:number; onPreview:(r:any)=>void }) {
  const [dl, setDl] = useState<string|null>(null);
  const download = async (e:React.MouseEvent,fmt:string) => {
    e.stopPropagation(); setDl(fmt);
    try { const r=await exportAPI.exportReport(report.id,fmt); triggerDl(r.data,`report-${report.id.slice(0,8)}.${fmt==='pdf'?'pdf':'md'}`); }
    catch(err){ console.error(err); } finally { setDl(null); }
  };
  const preview = report.content?.replace(/[#*`\[\]]/g,'').slice(0,130);
  return (
    <motion.div initial={{ opacity:0,y:14 }} animate={{ opacity:1,y:0 }} transition={{ delay:i*0.06 }}
      className="glass-card" onClick={()=>onPreview(report)}
      style={{ padding:20,display:'flex',flexDirection:'column',gap:14,cursor:'pointer' }}>
      <div style={{ display:'flex',alignItems:'flex-start',gap:12 }}>
        <div style={{ width:38,height:38,background:'#1e1e1e',border:'1px solid rgba(255,255,255,0.1)',borderRadius:10,display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0 }}>
          <FileText size={16} style={{ color:'#707070' }} />
        </div>
        <div style={{ flex:1,minWidth:0 }}>
          <p style={{ fontSize:13,color:'#d0d0d0',fontWeight:500,lineHeight:1.4,display:'-webkit-box',WebkitLineClamp:2,WebkitBoxOrient:'vertical',overflow:'hidden',fontFamily:'var(--font-display)' }}>{report.title}</p>
          <p style={{ fontSize:11,color:'#505050',marginTop:4 }}>
            {new Date(report.created_at).toLocaleDateString(undefined,{month:'short',day:'numeric',year:'numeric',hour:'2-digit',minute:'2-digit'})}
          </p>
        </div>
      </div>
      {preview && <p style={{ fontSize:12,color:'#707070',lineHeight:1.6,display:'-webkit-box',WebkitLineClamp:2,WebkitBoxOrient:'vertical',overflow:'hidden' }}>{preview}…</p>}
      <div style={{ display:'flex',gap:8,paddingTop:4,borderTop:'1px solid rgba(255,255,255,0.05)' }}>
        <button onClick={e=>{e.stopPropagation();onPreview(report);}} className="btn-secondary"
          style={{ flex:1,display:'flex',alignItems:'center',justifyContent:'center',gap:6,padding:'8px 12px',fontSize:12 }}>
          <Eye size={12}/> Preview
        </button>
        {[{fmt:'markdown',ext:'.md'},{fmt:'pdf',ext:'.pdf'}].map(({fmt,ext})=>(
          <button key={fmt} onClick={e=>download(e,fmt)} disabled={!!dl}
            style={{ display:'flex',alignItems:'center',gap:5,padding:'8px 12px',background:'#1a1a1a',border:'1px solid rgba(255,255,255,0.1)',borderRadius:10,color:'#909090',fontSize:12,cursor:'pointer',opacity:dl?0.5:1 }}>
            {dl===fmt?<Loader size={11} style={{ animation:'spin-slow 1.5s linear infinite' }}/>:<Download size={11}/>} {ext}
          </button>
        ))}
      </div>
    </motion.div>
  );
}

export default function ReportsPage() {
  const [reports,  setReports]  = useState<any[]>([]);
  const [loading,  setLoading]  = useState(true);
  const [search,   setSearch]   = useState('');
  const [selected, setSelected] = useState<any>(null);
  const load = () => { setLoading(true); reportsAPI.list().then((r:any)=>setReports(r.data)).catch(()=>{}).finally(()=>setLoading(false)); };
  useEffect(()=>{ load(); }, []);
  const filtered = reports.filter(r=>(r.title||'').toLowerCase().includes(search.toLowerCase()));
  return (
    <AppLayout>
      <div style={{ height:'100%',overflowY:'auto' }}>
        <div style={{ padding:'28px 32px',maxWidth:1000,margin:'0 auto' }}>
          <motion.div initial={{ opacity:0,y:-10 }} animate={{ opacity:1,y:0 }} style={{ marginBottom:28 }}>
            <div className="section-label" style={{ marginBottom:10 }}>Exports</div>
            <div style={{ display:'flex',alignItems:'flex-end',justifyContent:'space-between',flexWrap:'wrap',gap:16 }}>
              <h1 className="page-title">
                Reports
                {reports.length>0 && <span style={{ fontStyle:'italic',color:'#606060',marginLeft:12,fontSize:'0.65em' }}>{reports.length} generated</span>}
              </h1>
              <button className="btn-secondary" onClick={load} style={{ display:'flex',alignItems:'center',gap:8 }}>
                <RefreshCw size={13}/> Refresh
              </button>
            </div>
          </motion.div>

          {reports.length>0 && (
            <div style={{ display:'flex',alignItems:'center',gap:8,marginBottom:20 }}>
              <div className="glass-input" style={{ flex:1,display:'flex',alignItems:'center',gap:8,padding:'9px 12px' }}>
                <Search size={13} style={{ color:'#606060' }}/>
                <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search reports…" style={{ flex:1,background:'transparent',border:'none',fontSize:13,outline:'none' }}/>
                {search && <button onClick={()=>setSearch('')} style={{ background:'none',border:'none',color:'#606060',cursor:'pointer' }}><X size={12}/></button>}
              </div>
            </div>
          )}

          {loading && <div style={{ display:'flex',justifyContent:'center',padding:'80px 0' }}><Loader size={22} style={{ color:'#606060',animation:'spin-slow 1.5s linear infinite' }}/></div>}

          {!loading && filtered.length>0 && (
            <div style={{ display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(280px,1fr))',gap:14 }}>
              {filtered.map((r,i)=><ReportCard key={r.id} report={r} i={i} onPreview={setSelected}/>)}
            </div>
          )}

          {!loading && reports.length===0 && (
            <div style={{ textAlign:'center',padding:'80px 0' }}>
              <div style={{ fontSize:40,color:'#252525',marginBottom:16 }}>◌</div>
              <p style={{ color:'#808080',fontSize:16,fontFamily:'var(--font-display)',marginBottom:8 }}>No reports yet</p>
              <p style={{ color:'#505050',fontSize:13 }}>Reports are generated automatically after each research session</p>
            </div>
          )}
        </div>
      </div>
      <AnimatePresence>{selected && <ReportModal report={selected} onClose={()=>setSelected(null)}/>}</AnimatePresence>
    </AppLayout>
  );
}
