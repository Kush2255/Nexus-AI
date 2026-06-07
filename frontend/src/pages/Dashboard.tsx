import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { MessageSquare, FileText, BarChart2, Zap, ArrowRight, Clock } from 'lucide-react';
import AppLayout from '../components/layout/AppLayout';
import WorkflowDiagram from '../components/agents/WorkflowDiagram';
import { chatAPI, analyticsAPI } from '../services/api';
import { useAnalytics } from '../hooks/useAnalytics';

function Sparkline({ values = [] }: { values: number[] }) {
  if (values.length < 2) return null;
  const max = Math.max(...values, 1), min = Math.min(...values);
  const r = max - min || 1;
  const W = 110, H = 36;
  const pts = values.map((v,i) => `${(i/(values.length-1))*W},${H-((v-min)/r)*(H-4)-2}`);
  const last = pts[pts.length-1].split(',');
  return (
    <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} style={{ opacity:0.8 }}>
      <polyline points={pts.join(' ')} fill="none" stroke="rgba(255,255,255,0.35)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
      <circle cx={last[0]} cy={last[1]} r="3" fill="rgba(255,255,255,0.6)" />
    </svg>
  );
}

function StatCard({ icon: Icon, label, value, sub, spark, delay=0 }: any) {
  return (
    <motion.div initial={{ opacity:0, y:16 }} animate={{ opacity:1, y:0 }} transition={{ delay }} className="stat-card">
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start' }}>
        <div className="stat-icon"><Icon size={16} /></div>
        <Sparkline values={spark || []} />
      </div>
      <div>
        <div className="stat-value">{value ?? '—'}</div>
        <div className="stat-label" style={{ marginTop:4 }}>{label}</div>
        {sub && <div className="stat-sub">{sub}</div>}
      </div>
    </motion.div>
  );
}

export default function Dashboard() {
  const navigate = useNavigate();
  const { overview, activity } = useAnalytics();
  const [sessions, setSessions] = useState<any[]>([]);

  useEffect(() => {
    chatAPI.getSessions().then(r => setSessions(r.data.slice(0,6))).catch(()=>{});
  }, []);

  const fmt = (n?: number) => n==null?'—': n>=1000?`${(n/1000).toFixed(1)}k`:String(n);

  const allActivity = [
    ...(activity?.recent_sessions||[]),
    ...(activity?.recent_documents||[]),
  ].sort((a,b) => new Date(b.timestamp).getTime()-new Date(a.timestamp).getTime()).slice(0,6);

  return (
    <AppLayout>
      <div style={{ height:'100%', overflowY:'auto' }}>
        <div style={{ padding:'28px 32px', maxWidth:1100, margin:'0 auto' }}>

          {/* Header */}
          <motion.div initial={{ opacity:0, y:-10 }} animate={{ opacity:1, y:0 }} style={{ marginBottom:32 }}>
            <div className="section-label" style={{ marginBottom:10 }}>Control Center</div>
            <div style={{ display:'flex', alignItems:'flex-end', justifyContent:'space-between', flexWrap:'wrap', gap:16 }}>
              <h1 className="page-title">
                Research<br />
                <span style={{ fontStyle:'italic', color:'#707070' }}>Dashboard</span>
              </h1>
              <div style={{ display:'flex', gap:10 }}>
                <button className="btn-primary" onClick={() => navigate('/chat')}
                  style={{ display:'flex', alignItems:'center', gap:8 }}>
                  <Zap size={14} /> New Research
                </button>
                <button className="btn-icon" onClick={() => navigate('/documents')}
                  style={{ width:38, height:38 }}>
                  <FileText size={15} />
                </button>
              </div>
            </div>
          </motion.div>

          {/* Stat cards */}
          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(220px,1fr))', gap:14, marginBottom:20 }}>
            <StatCard icon={MessageSquare} label="Research Sessions" value={fmt(overview?.total_sessions)} sub={`${overview?.sessions_last_7_days??0} this week`} spark={[1,2,1,3,2,4,overview?.sessions_last_7_days||0]} delay={0} />
            <StatCard icon={FileText}      label="Documents Indexed"  value={fmt(overview?.total_documents)} sub={`${fmt(overview?.total_chunks_indexed)} chunks`} spark={[0,1,1,2,2,3,overview?.total_documents||0]} delay={0.06} />
            <StatCard icon={Zap}           label="AI Responses"       value={fmt(overview?.ai_responses_generated)} sub="across all sessions" spark={[2,4,3,6,5,8,overview?.ai_responses_generated||0]} delay={0.12} />
            <StatCard icon={BarChart2}     label="Reports Generated"  value={fmt(overview?.total_reports)} sub="Markdown + PDF" spark={[0,0,1,1,2,1,overview?.total_reports||0]} delay={0.18} />
          </div>

          {/* Agent Pipeline */}
          <motion.div initial={{ opacity:0, y:16 }} animate={{ opacity:1, y:0 }} transition={{ delay:0.22 }}
            className="glass-card" style={{ padding:24, marginBottom:20 }}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:20 }}>
              <div>
                <div className="section-label" style={{ marginBottom:6 }}>LangGraph</div>
                <div style={{ fontSize:15, fontWeight:500, color:'#f0f0f0', fontFamily:'var(--font-display)' }}>Agent Pipeline</div>
              </div>
              <div style={{ display:'flex', alignItems:'center', gap:7, fontSize:12, color:'#505050' }}>
                <div style={{ width:7,height:7,borderRadius:'50%',background:'#22c55e',animation:'pulse 2s infinite' }} />
                All 5 agents ready
              </div>
            </div>
            <div style={{ display:'flex', justifyContent:'center' }}>
              <WorkflowDiagram />
            </div>
          </motion.div>

          {/* Lower grid */}
          <div style={{ display:'grid', gridTemplateColumns:'1fr 320px', gap:16 }}>

            {/* Recent sessions */}
            <motion.div initial={{ opacity:0, y:16 }} animate={{ opacity:1, y:0 }} transition={{ delay:0.3 }}
              className="glass-card" style={{ padding:24 }}>
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:18 }}>
                <div>
                  <div className="section-label" style={{ marginBottom:4 }}>History</div>
                  <div style={{ fontSize:14, fontWeight:500, color:'#f0f0f0', fontFamily:'var(--font-display)' }}>Recent Sessions</div>
                </div>
                <button onClick={() => navigate('/chat')} style={{ fontSize:12, color:'#3b82f6', cursor:'pointer', display:'flex', alignItems:'center', gap:4, background:'none', border:'none' }}>
                  All <ArrowRight size={12} />
                </button>
              </div>

              {sessions.length===0 ? (
                <div style={{ textAlign:'center', padding:'40px 0' }}>
                  <div style={{ fontSize:28, marginBottom:10, color:'#303030' }}>○</div>
                  <p style={{ color:'#606060', fontSize:13, marginBottom:16 }}>No sessions yet</p>
                  <button className="btn-secondary" onClick={() => navigate('/chat')}>Start Research</button>
                </div>
              ) : (
                <div>
                  {sessions.map((s,i) => (
                    <motion.div key={s.id} initial={{ opacity:0 }} animate={{ opacity:1 }} transition={{ delay:0.35+i*0.04 }}
                      onClick={() => navigate(`/chat/${s.id}`)}
                      style={{ display:'flex', alignItems:'center', gap:12, padding:'10px 10px', borderRadius:10, cursor:'pointer', marginBottom:2 }}
                      onMouseEnter={e => (e.currentTarget.style.background='#1a1a1a')}
                      onMouseLeave={e => (e.currentTarget.style.background='transparent')}>
                      <div style={{ width:32,height:32, background:'#1e1e1e', border:'1px solid rgba(255,255,255,0.08)', borderRadius:8, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                        <MessageSquare size={13} style={{ color:'#707070' }} />
                      </div>
                      <div style={{ flex:1, minWidth:0 }}>
                        <div style={{ fontSize:13, color:'#d0d0d0', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{s.title}</div>
                        <div style={{ fontSize:11, color:'#505050', marginTop:2, display:'flex', alignItems:'center', gap:4 }}>
                          <Clock size={9} />
                          {new Date(s.updated_at||s.created_at).toLocaleDateString(undefined,{month:'short',day:'numeric',year:'numeric'})}
                        </div>
                      </div>
                      <ArrowRight size={13} style={{ color:'#404040' }} />
                    </motion.div>
                  ))}
                </div>
              )}
            </motion.div>

            {/* Activity */}
            <motion.div initial={{ opacity:0, y:16 }} animate={{ opacity:1, y:0 }} transition={{ delay:0.35 }}
              className="glass-card" style={{ padding:24 }}>
              <div style={{ marginBottom:18 }}>
                <div className="section-label" style={{ marginBottom:4 }}>Feed</div>
                <div style={{ fontSize:14, fontWeight:500, color:'#f0f0f0', fontFamily:'var(--font-display)' }}>Recent Activity</div>
              </div>
              {allActivity.length===0 ? (
                <p style={{ color:'#505050', fontSize:13, textAlign:'center', padding:'30px 0' }}>No activity yet</p>
              ) : (
                allActivity.map((item:any, i:number) => (
                  <div key={`${item.type}-${item.id}`} style={{ display:'flex', alignItems:'center', gap:10, paddingBottom:10, marginBottom:10, borderBottom:'1px solid rgba(255,255,255,0.05)' }}>
                    <span style={{ fontSize:14 }}>{item.type==='session'?'💬':item.type==='document'?'📄':'📊'}</span>
                    <div style={{ flex:1, minWidth:0 }}>
                      <div style={{ fontSize:12, color:'#b0b0b0', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{item.title}</div>
                      <div style={{ fontSize:10, color:'#505050', marginTop:1, textTransform:'capitalize' }}>{item.type}</div>
                    </div>
                    <div style={{ fontSize:10, color:'#404040' }}>
                      {new Date(item.timestamp).toLocaleDateString(undefined,{month:'short',day:'numeric'})}
                    </div>
                  </div>
                ))
              )}
            </motion.div>
          </div>

          {/* System strip */}
          <motion.div initial={{ opacity:0 }} animate={{ opacity:1 }} transition={{ delay:0.45 }}
            style={{ marginTop:16, padding:'14px 20px', background:'#141414', border:'1px solid rgba(255,255,255,0.07)', borderRadius:12, display:'flex', flexWrap:'wrap', gap:28, alignItems:'center' }}>
            <div className="section-label">System</div>
            {[['5 Agents','LangGraph'],['GPT-4o-mini','LLM'],['MiniLM-L6','Embeddings'],['FAISS','Vector DB'],['SSE + WS','Streaming']].map(([val,lbl])=>(
              <div key={lbl}>
                <div style={{ fontSize:13, fontWeight:600, color:'#d0d0d0', fontFamily:'var(--font-display)' }}>{val}</div>
                <div style={{ fontSize:10, color:'#505050' }}>{lbl}</div>
              </div>
            ))}
          </motion.div>

        </div>
      </div>
    </AppLayout>
  );
}
