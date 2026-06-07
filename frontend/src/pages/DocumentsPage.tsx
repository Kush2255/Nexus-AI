import { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useDropzone } from 'react-dropzone';
import { FileText, Trash2, Eye, X, Search, Upload, Database, Loader, CheckCircle, AlertCircle, RefreshCw } from 'lucide-react';
import AppLayout from '../components/layout/AppLayout';
import { useDocuments } from '../hooks/useDocuments';
import { documentsAPI } from '../services/api';

function DropZone({ onUpload, uploading, progress }: any) {
  const onDrop = useCallback((files: File[]) => files.forEach(onUpload), [onUpload]);
  const { getRootProps, getInputProps, isDragActive } = useDropzone({ onDrop, accept:{'application/pdf':['.pdf'],'text/plain':['.txt'],'text/markdown':['.md']}, disabled:uploading, maxFiles:5, maxSize:50*1024*1024 });
  return (
    <div {...getRootProps()} className={`upload-zone ${isDragActive?'dragging':''}`}
      style={{ padding:'48px 32px', textAlign:'center', position:'relative' }}>
      <input {...getInputProps()} />
      <div style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:16 }}>
        <motion.div animate={isDragActive?{scale:1.1,rotate:5}:{scale:1,rotate:0}}
          style={{ width:56,height:56,background:'#1e1e1e',border:'1px solid rgba(255,255,255,0.12)',borderRadius:16,display:'flex',alignItems:'center',justifyContent:'center' }}>
          <Upload size={22} style={{ color:'#707070' }} />
        </motion.div>
        {uploading ? (
          <div style={{ width:260 }}>
            <div style={{ display:'flex', alignItems:'center', gap:8, color:'#d0d0d0', fontSize:13, marginBottom:12, justifyContent:'center' }}>
              <Loader size={14} style={{ animation:'spin-slow 1.5s linear infinite' }} /> Processing & embedding…
            </div>
            <div style={{ background:'#1a1a1a', borderRadius:4, height:4, overflow:'hidden' }}>
              <motion.div initial={{ width:0 }} animate={{ width:`${progress}%` }} style={{ height:'100%', background:'#f0f0f0', borderRadius:4 }} />
            </div>
            <p style={{ fontSize:11, color:'#606060', marginTop:8, textAlign:'center' }}>{progress}% — storing in vector DB</p>
          </div>
        ) : isDragActive ? (
          <p style={{ color:'#d0d0d0', fontSize:14 }}>Release to upload</p>
        ) : (
          <div>
            <p style={{ color:'#c0c0c0', fontSize:14, marginBottom:6 }}>
              Drop files here, or <span style={{ color:'#60a5fa', textDecoration:'underline' }}>click to browse</span>
            </p>
            <p style={{ color:'#606060', fontSize:12 }}>PDF · TXT · MD &nbsp;·&nbsp; max 50 MB</p>
            <p style={{ color:'#505050', fontSize:11, marginTop:4 }}>Auto-chunked → MiniLM-L6 embeddings → FAISS</p>
          </div>
        )}
      </div>
    </div>
  );
}

function DocModal({ doc, onClose }: { doc:any; onClose:()=>void }) {
  const [details, setDetails] = useState<any>(null);
  useState(() => {
    documentsAPI.get(doc.id).then((r:any) => setDetails(r.data)).catch(()=>{});
  });
  return (
    <motion.div initial={{ opacity:0 }} animate={{ opacity:1 }} exit={{ opacity:0 }}
      onClick={onClose}
      style={{ position:'fixed',inset:0,background:'rgba(0,0,0,0.75)',backdropFilter:'blur(4px)',zIndex:50,display:'flex',alignItems:'center',justifyContent:'center',padding:24 }}>
      <motion.div initial={{ scale:0.95,y:16 }} animate={{ scale:1,y:0 }} exit={{ scale:0.95,y:16 }}
        onClick={e=>e.stopPropagation()}
        style={{ background:'#141414',border:'1px solid rgba(255,255,255,0.12)',borderRadius:20,width:'100%',maxWidth:480,maxHeight:'75vh',display:'flex',flexDirection:'column' }}>
        <div style={{ display:'flex',alignItems:'center',justifyContent:'space-between',padding:'16px 20px',borderBottom:'1px solid rgba(255,255,255,0.07)' }}>
          <div>
            <p style={{ fontSize:14,color:'#e0e0e0',fontWeight:500 }}>{doc.filename}</p>
            <p style={{ fontSize:11,color:'#505050',fontFamily:'var(--font-mono)',marginTop:2 }}>{doc.id.slice(0,20)}…</p>
          </div>
          <button onClick={onClose} style={{ width:30,height:30,background:'#1e1e1e',border:'1px solid rgba(255,255,255,0.1)',borderRadius:8,display:'flex',alignItems:'center',justifyContent:'center',color:'#909090',cursor:'pointer' }}>
            <X size={13} />
          </button>
        </div>
        <div style={{ flex:1,overflowY:'auto',padding:20 }}>
          <div style={{ display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:10,marginBottom:18 }}>
            {[['Status',doc.status,doc.status==='ready'?'#4ade80':'#fbbf24'],['Chunks',doc.chunk_count??0,'#d0d0d0'],['Size',`${((doc.file_size||0)/1024).toFixed(1)}KB`,'#d0d0d0']].map(([l,v,c])=>(
              <div key={l as string} style={{ background:'#1a1a1a',border:'1px solid rgba(255,255,255,0.08)',borderRadius:10,padding:'10px 12px',textAlign:'center' }}>
                <div style={{ fontSize:10,color:'#606060',marginBottom:4 }}>{l}</div>
                <div style={{ fontSize:13,fontWeight:600,color:c as string }}>{v}</div>
              </div>
            ))}
          </div>
          {!details && <div style={{ display:'flex',justifyContent:'center',padding:24 }}><Loader size={18} style={{ color:'#606060',animation:'spin-slow 1.5s linear infinite' }} /></div>}
          {details?.metadata?.chunks?.length>0 && (
            <div>
              <div style={{ fontSize:10,color:'#505050',letterSpacing:'0.12em',textTransform:'uppercase',marginBottom:12 }}>Chunk Preview</div>
              {details.metadata.chunks.map((c:any,i:number)=>(
                <div key={i} style={{ background:'#1a1a1a',border:'1px solid rgba(255,255,255,0.07)',borderRadius:10,padding:12,marginBottom:8 }}>
                  <div style={{ display:'flex',gap:10,marginBottom:6 }}>
                    <span style={{ fontSize:10,color:'#60a5fa',fontFamily:'var(--font-mono)' }}>chunk {c.chunk_index}</span>
                    <span style={{ fontSize:10,color:'#505050' }}>{c.char_count} chars</span>
                  </div>
                  <p style={{ fontSize:12,color:'#909090',lineHeight:1.6,margin:0 }}>{c.content_preview}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}

function DocCard({ doc, onDelete, onView }: any) {
  const [deleting, setDeleting] = useState(false);
  const fmt = (b:number) => b<1024?`${b}B`:b<1024*1024?`${(b/1024).toFixed(0)}K`:`${(b/(1024*1024)).toFixed(1)}M`;
  return (
    <motion.div layout initial={{ opacity:0,scale:0.97 }} animate={{ opacity:1,scale:1 }} exit={{ opacity:0,scale:0.97 }}
      className="glass-card" style={{ padding:18,display:'flex',flexDirection:'column',gap:14 }}>
      <div style={{ display:'flex',alignItems:'flex-start',gap:12 }}>
        <div style={{ width:38,height:38,background:'#1e1e1e',border:'1px solid rgba(255,255,255,0.1)',borderRadius:10,display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0 }}>
          <FileText size={16} style={{ color:'#707070' }} />
        </div>
        <div style={{ flex:1,minWidth:0 }}>
          <p style={{ fontSize:13,color:'#d0d0d0',fontWeight:500,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap' }}>{doc.filename}</p>
          <div style={{ display:'flex',alignItems:'center',gap:6,marginTop:4 }}>
            {doc.status==='ready' ? <CheckCircle size={11} style={{ color:'#4ade80' }} /> : doc.status==='processing' ? <Loader size={11} style={{ color:'#fbbf24',animation:'spin-slow 1.5s linear infinite' }} /> : <AlertCircle size={11} style={{ color:'#f87171' }} />}
            <span style={{ fontSize:11,color:doc.status==='ready'?'#4ade80':doc.status==='processing'?'#fbbf24':'#f87171',textTransform:'capitalize' }}>{doc.status}</span>
          </div>
        </div>
      </div>
      <div style={{ display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:8 }}>
        {[['Chunks',doc.chunk_count??0],['Size',fmt(doc.file_size??0)],['Type',(doc.file_type??'?').toUpperCase()]].map(([l,v])=>(
          <div key={l as string} style={{ background:'#191919',borderRadius:8,padding:'7px 10px',textAlign:'center' }}>
            <div style={{ fontSize:9,color:'#505050' }}>{l}</div>
            <div style={{ fontSize:12,fontFamily:'var(--font-mono)',color:'#c0c0c0',marginTop:2,fontWeight:500 }}>{v}</div>
          </div>
        ))}
      </div>
      <div style={{ display:'flex',gap:8 }}>
        <button onClick={() => onView(doc)} className="btn-secondary" style={{ flex:1,display:'flex',alignItems:'center',justifyContent:'center',gap:6,padding:'8px 12px',fontSize:12 }}>
          <Eye size={12} /> Details
        </button>
        <button onClick={async()=>{setDeleting(true);try{await onDelete(doc.id)}finally{setDeleting(false)}}} disabled={deleting}
          style={{ padding:'8px 12px',background:'rgba(239,68,68,0.08)',border:'1px solid rgba(239,68,68,0.2)',borderRadius:10,color:'#f87171',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',opacity:deleting?0.5:1 }}>
          {deleting ? <Loader size={12} style={{ animation:'spin-slow 1.5s linear infinite' }} /> : <Trash2 size={12} />}
        </button>
      </div>
    </motion.div>
  );
}

export default function DocumentsPage() {
  const { documents, loading, uploading, uploadProgress, upload, remove, refresh } = useDocuments();
  const [search, setSearch]     = useState('');
  const [selected, setSelected] = useState<any>(null);
  const [notice, setNotice]     = useState<{msg:string;ok:boolean}|null>(null);

  const notify = (msg:string, ok=true) => { setNotice({msg,ok}); setTimeout(()=>setNotice(null),4000); };

  const handleUpload = async (file:File) => {
    try { const d = await upload(file); notify(`"${file.name}" indexed — ${d.chunk_count} chunks`); }
    catch(e:any) { notify(e.response?.data?.detail||e.message, false); }
  };

  const filtered = documents.filter(d=>(d.filename||'').toLowerCase().includes(search.toLowerCase()));
  const totalChunks = documents.reduce((s:number,d:any)=>s+(d.chunk_count||0),0);

  return (
    <AppLayout>
      <div style={{ height:'100%',overflowY:'auto' }}>
        <div style={{ padding:'28px 32px',maxWidth:1000,margin:'0 auto' }}>

          <motion.div initial={{ opacity:0,y:-10 }} animate={{ opacity:1,y:0 }} style={{ marginBottom:28 }}>
            <div className="section-label" style={{ marginBottom:10 }}>Knowledge Base</div>
            <div style={{ display:'flex',alignItems:'flex-end',justifyContent:'space-between',flexWrap:'wrap',gap:16 }}>
              <h1 className="page-title">
                Documents
                {documents.length>0 && <span style={{ fontStyle:'italic',color:'#606060',marginLeft:12,fontSize:'0.65em' }}>{documents.length} files · {totalChunks} chunks</span>}
              </h1>
              <button className="btn-secondary" onClick={refresh} style={{ display:'flex',alignItems:'center',gap:8 }}>
                <RefreshCw size={13} /> Refresh
              </button>
            </div>
          </motion.div>

          <AnimatePresence>
            {notice && (
              <motion.div initial={{ opacity:0,y:-8 }} animate={{ opacity:1,y:0 }} exit={{ opacity:0,y:-8 }}
                style={{ display:'flex',alignItems:'center',justifyContent:'space-between',padding:'12px 16px',marginBottom:16,borderRadius:12,background:notice.ok?'rgba(34,197,94,0.08)':'rgba(239,68,68,0.08)',border:`1px solid ${notice.ok?'rgba(34,197,94,0.2)':'rgba(239,68,68,0.2)'}`,color:notice.ok?'#4ade80':'#f87171',fontSize:13 }}>
                {notice.msg}
                <button onClick={()=>setNotice(null)} style={{ background:'none',border:'none',color:'inherit',cursor:'pointer',opacity:0.6 }}><X size={14}/></button>
              </motion.div>
            )}
          </AnimatePresence>

          <motion.div initial={{ opacity:0,y:12 }} animate={{ opacity:1,y:0 }} transition={{ delay:0.08 }} style={{ marginBottom:20 }}>
            <DropZone onUpload={handleUpload} uploading={uploading} progress={uploadProgress} />
          </motion.div>

          {/* RAG config strip */}
          <div style={{ display:'flex',flexWrap:'wrap',alignItems:'center',gap:20,padding:'12px 18px',background:'#141414',border:'1px solid rgba(255,255,255,0.07)',borderRadius:12,marginBottom:20 }}>
            <Database size={14} style={{ color:'#505050',flexShrink:0 }} />
            {[['Chunk Size','1,000'],['Overlap','200 chars'],['Embeddings','MiniLM-L6'],['Vector DB','FAISS'],['Top-K','5']].map(([l,v])=>(
              <div key={l} style={{ display:'flex',alignItems:'center',gap:6 }}>
                <span style={{ fontSize:11,color:'#606060' }}>{l}:</span>
                <span style={{ fontSize:11,fontFamily:'var(--font-mono)',color:'#909090',fontWeight:500 }}>{v}</span>
              </div>
            ))}
          </div>

          {documents.length>0 && (
            <div style={{ display:'flex',alignItems:'center',gap:10,marginBottom:16 }}>
              <div className="glass-input" style={{ flex:1,display:'flex',alignItems:'center',gap:8,padding:'9px 12px' }}>
                <Search size={13} style={{ color:'#606060',flexShrink:0 }} />
                <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search documents…" style={{ flex:1,background:'transparent',border:'none',fontSize:13,outline:'none' }} />
                {search && <button onClick={()=>setSearch('')} style={{ background:'none',border:'none',color:'#606060',cursor:'pointer' }}><X size={12}/></button>}
              </div>
              <span style={{ fontSize:12,color:'#606060' }}>{filtered.length}/{documents.length}</span>
            </div>
          )}

          {loading && (
            <div style={{ display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(230px,1fr))',gap:14 }}>
              {[...Array(3)].map((_,i)=><div key={i} className="skeleton" style={{ height:160 }} />)}
            </div>
          )}

          {!loading && filtered.length>0 && (
            <div style={{ display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(230px,1fr))',gap:14 }}>
              <AnimatePresence>
                {filtered.map(doc=><DocCard key={doc.id} doc={doc} onDelete={remove} onView={setSelected} />)}
              </AnimatePresence>
            </div>
          )}

          {!loading && documents.length===0 && (
            <div style={{ textAlign:'center',padding:'80px 0' }}>
              <div style={{ fontSize:40,color:'#252525',marginBottom:16 }}>◌</div>
              <p style={{ color:'#808080',fontSize:16,fontFamily:'var(--font-display)',marginBottom:8 }}>Knowledge base is empty</p>
              <p style={{ color:'#505050',fontSize:13 }}>Upload PDFs or text files to enable RAG-grounded research</p>
            </div>
          )}
        </div>
      </div>
      <AnimatePresence>
        {selected && <DocModal doc={selected} onClose={()=>setSelected(null)} />}
      </AnimatePresence>
    </AppLayout>
  );
}
