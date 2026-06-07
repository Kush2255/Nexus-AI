import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Save, Check, Info, Cpu, Database, Brain } from 'lucide-react';
import AppLayout from '../components/layout/AppLayout';
import { useApp } from '../context/AppContext';

function Row({ label, desc, children }: { label:string; desc?:string; children:React.ReactNode }) {
  return (
    <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', gap:24, padding:'14px 0', borderBottom:'1px solid rgba(255,255,255,0.05)' }}>
      <div style={{ flex:1 }}>
        <p style={{ fontSize:13, color:'#d0d0d0', fontWeight:500 }}>{label}</p>
        {desc && <p style={{ fontSize:12, color:'#606060', marginTop:3, maxWidth:360, lineHeight:1.6 }}>{desc}</p>}
      </div>
      <div style={{ flexShrink:0 }}>{children}</div>
    </div>
  );
}

function Toggle({ value, onChange }: { value:boolean; onChange:(v:boolean)=>void }) {
  return (
    <button onClick={() => onChange(!value)} style={{ position:'relative', width:44, height:24, borderRadius:12, background:value?'#f0f0f0':'#2a2a2a', border:`1px solid ${value?'rgba(255,255,255,0.3)':'rgba(255,255,255,0.1)'}`, cursor:'pointer', transition:'all 0.2s', flexShrink:0 }}>
      <motion.div animate={{ x: value ? 20 : 2 }} transition={{ type:'spring', stiffness:500, damping:30 }}
        style={{ position:'absolute', top:3, width:16, height:16, borderRadius:'50%', background: value?'#0d0d0d':'#606060' }} />
    </button>
  );
}

function Stepper({ value, onChange, min=1, max=10 }: any) {
  return (
    <div style={{ display:'flex', alignItems:'center', gap:10 }}>
      <button onClick={() => onChange(Math.max(min,value-1))} className="btn-icon" style={{ width:30, height:30 }}>−</button>
      <span style={{ fontSize:14, fontFamily:'var(--font-mono)', color:'#d0d0d0', fontWeight:600, width:20, textAlign:'center' }}>{value}</span>
      <button onClick={() => onChange(Math.min(max,value+1))} className="btn-icon" style={{ width:30, height:30 }}>+</button>
    </div>
  );
}

function Select({ value, onChange, options }: { value:string; onChange:(v:string)=>void; options:{value:string;label:string}[] }) {
  return (
    <select value={value} onChange={e=>onChange(e.target.value)}
      style={{ padding:'7px 12px', borderRadius:9, fontSize:13, fontFamily:'var(--font-body)', minWidth:140, cursor:'pointer' }}>
      {options.map(o => <option key={o.value} value={o.value} style={{ background:'#1a1a1a' }}>{o.label}</option>)}
    </select>
  );
}

function SectionCard({ icon: Icon, title, children }: any) {
  return (
    <motion.div initial={{ opacity:0, y:12 }} animate={{ opacity:1, y:0 }} className="glass-card" style={{ padding:'6px 20px', marginBottom:14 }}>
      <div style={{ display:'flex', alignItems:'center', gap:10, paddingTop:18, paddingBottom:14, borderBottom:'1px solid rgba(255,255,255,0.05)', marginBottom:4 }}>
        <Icon size={15} style={{ color:'#707070' }} />
        <span className="section-label">{title}</span>
      </div>
      {children}
    </motion.div>
  );
}

export default function SettingsPage() {
  const { settings, updateSetting, systemStatus } = useApp();
  const [local, setLocal]   = useState({ ...settings });
  const [saved, setSaved]   = useState(false);

  useEffect(() => { setLocal({ ...settings }); }, [settings]);

  const set = (k:string, v:any) => setLocal(p=>({...p,[k]:v}));
  const save = () => {
    Object.entries(local).forEach(([k,v]) => updateSetting(k,v));
    setSaved(true); setTimeout(()=>setSaved(false), 2500);
  };

  return (
    <AppLayout>
      <div style={{ height:'100%', overflowY:'auto' }}>
        <div style={{ padding:'28px 32px', maxWidth:720, margin:'0 auto' }}>

          <motion.div initial={{ opacity:0, y:-10 }} animate={{ opacity:1, y:0 }} style={{ marginBottom:32 }}>
            <div className="section-label" style={{ marginBottom:10 }}>Configuration</div>
            <h1 className="page-title">Settings</h1>
          </motion.div>

          {/* System info */}
          {systemStatus && (
            <motion.div initial={{ opacity:0, y:12 }} animate={{ opacity:1, y:0 }}
              style={{ padding:'16px 20px', background:'rgba(59,130,246,0.05)', border:'1px solid rgba(59,130,246,0.15)', borderRadius:14, marginBottom:20 }}>
              <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:14 }}>
                <Info size={14} style={{ color:'#60a5fa' }} />
                <span style={{ fontSize:12, color:'#60a5fa', fontWeight:600, letterSpacing:'0.06em', textTransform:'uppercase' }}>Current System</span>
              </div>
              <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:14 }}>
                {[
                  ['LLM Provider',  systemStatus.llm_provider     || '—'],
                  ['Vector DB',     systemStatus.vector_db         || '—'],
                  ['Embeddings',    'MiniLM-L6-v2'],
                  ['Chunk Size',    systemStatus.chunk_size        || '—'],
                  ['Top-K',         systemStatus.top_k_retrieval   || '—'],
                  ['Max Loops',     systemStatus.max_reflection_loops || '—'],
                ].map(([k,v])=>(
                  <div key={k}>
                    <div style={{ fontSize:11, color:'#606060' }}>{k}</div>
                    <div style={{ fontSize:13, fontFamily:'var(--font-mono)', color:'#c0c0c0', fontWeight:500, marginTop:2 }}>{v}</div>
                  </div>
                ))}
              </div>
              <p style={{ fontSize:11, color:'#505050', marginTop:14 }}>
                LLM provider and vector DB are configured via <code style={{ background:'#1e1e1e', padding:'2px 6px', borderRadius:4, color:'#909090', fontSize:11 }}>backend/.env</code>
              </p>
            </motion.div>
          )}

          {/* AI Settings */}
          <SectionCard icon={Brain} title="AI Behaviour">
            <Row label="Streaming Responses" desc="Stream tokens in real time via Server-Sent Events">
              <Toggle value={local.streamingEnabled} onChange={v=>set('streamingEnabled',v)} />
            </Row>
            <Row label="Max Reflection Loops" desc="How many times the Critic Agent may refine a response (1–5)">
              <Stepper value={local.maxReflectionLoops} onChange={(v:number)=>set('maxReflectionLoops',v)} min={1} max={5} />
            </Row>
            <Row label="Show Agent Logs" desc="Display execution trace under each assistant message">
              <Toggle value={local.showAgentLogs} onChange={v=>set('showAgentLogs',v)} />
            </Row>
          </SectionCard>

          {/* Interface */}
          <SectionCard icon={Cpu} title="Interface">
            <Row label="Sidebar Default State" desc="Start with sidebar expanded or collapsed">
              <Select value={local.theme||'dark'} onChange={v=>set('theme',v)} options={[{value:'dark',label:'Dark (default)'},{value:'darker',label:'High Contrast'}]} />
            </Row>
          </SectionCard>

          {/* Save */}
          <div style={{ display:'flex', justifyContent:'flex-end', marginTop:8 }}>
            <button onClick={save}
              style={{ display:'flex', alignItems:'center', gap:8, padding:'10px 22px', borderRadius:12, background:saved?'rgba(34,197,94,0.12)':'#f0f0f0', color:saved?'#4ade80':'#0d0d0d', fontSize:13, fontWeight:600, cursor:'pointer', border:`1px solid ${saved?'rgba(34,197,94,0.25)':'transparent'}`, transition:'all 0.2s' }}>
              {saved ? <><Check size={15}/> Saved!</> : <><Save size={15}/> Save Settings</>}
            </button>
          </div>

        </div>
      </div>
    </AppLayout>
  );
}
