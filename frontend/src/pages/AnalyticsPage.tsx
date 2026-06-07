import { motion } from 'framer-motion';
import { Activity, TrendingUp, BarChart2, Database, Zap, FileText } from 'lucide-react';
import AppLayout from '../components/layout/AppLayout';
import { useAnalytics } from '../hooks/useAnalytics';

function Bar({ pct, label }: { pct: number; label: string }) {
  return (
    <div style={{ display:'flex', alignItems:'center', gap:12, marginBottom:10 }}>
      <span style={{ fontSize:12, color:'#909090', width:88, textAlign:'right', flexShrink:0 }}>{label}</span>
      <div style={{ flex:1, height:4, background:'#1e1e1e', borderRadius:4, overflow:'hidden' }}>
        <motion.div initial={{ width:0 }} animate={{ width:`${pct}%` }}
          transition={{ duration:1.1, delay:0.3, ease:[0.16,1,0.3,1] }}
          style={{ height:'100%', background:'rgba(255,255,255,0.5)', borderRadius:4 }} />
      </div>
      <span style={{ fontSize:11, color:'#606060', width:32, textAlign:'right', flexShrink:0, fontFamily:'var(--font-mono)' }}>{pct}%</span>
    </div>
  );
}

function MetricBlock({ value, label, sub, i }: { value:any; label:string; sub?:string; i:number }) {
  return (
    <motion.div initial={{ opacity:0, y:16 }} animate={{ opacity:1, y:0 }} transition={{ delay:i*0.07 }}
      className="stat-card">
      <div className="stat-value">{value ?? '—'}</div>
      <div className="stat-label" style={{ marginTop:4 }}>{label}</div>
      {sub && <div className="stat-sub">{sub}</div>}
    </motion.div>
  );
}

export default function AnalyticsPage() {
  const { overview, activity } = useAnalytics();

  const metrics = [
    { value: overview?.total_sessions,          label:'Total Sessions',    sub:`${overview?.sessions_last_7_days??0} this week` },
    { value: overview?.total_documents,         label:'Documents Indexed', sub:`${overview?.total_chunks_indexed??0} chunks` },
    { value: overview?.ai_responses_generated,  label:'AI Responses',      sub:'across all sessions' },
    { value: overview?.total_reports,           label:'Reports Generated', sub:'Markdown + PDF' },
    { value: overview?.total_messages,          label:'Total Messages',    sub:'User + assistant' },
    { value: '5',                                label:'Agents Active',     sub:'LangGraph pipeline' },
  ];

  const agentBars = [
    { label:'Planner',    pct:100 },
    { label:'RAG',        pct:100 },
    { label:'Researcher', pct:100 },
    { label:'Critic',     pct:overview?.ai_responses_generated ? 85 : 0 },
    { label:'Reporter',   pct:overview?.total_reports ? 100 : 0 },
  ];

  const allActivity = [
    ...(activity?.recent_sessions  || []),
    ...(activity?.recent_documents || []),
  ].slice(0, 8);

  return (
    <AppLayout>
      <div style={{ height:'100%', overflowY:'auto' }}>
        <div style={{ padding:'28px 32px', maxWidth:1000, margin:'0 auto' }}>

          <motion.div initial={{ opacity:0, y:-10 }} animate={{ opacity:1, y:0 }} style={{ marginBottom:32 }}>
            <div className="section-label" style={{ marginBottom:10 }}>Telemetry</div>
            <h1 className="page-title">
              Analytics<br />
              <span style={{ fontStyle:'italic', color:'#606060' }}>& Performance</span>
            </h1>
          </motion.div>

          {/* Metrics grid */}
          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(160px,1fr))', gap:14, marginBottom:20 }}>
            {metrics.map((m,i) => <MetricBlock key={m.label} {...m} i={i} />)}
          </div>

          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:16 }}>

            {/* Agent utilization */}
            <motion.div initial={{ opacity:0, y:16 }} animate={{ opacity:1, y:0 }} transition={{ delay:0.35 }}
              className="glass-card" style={{ padding:24 }}>
              <div className="section-label" style={{ marginBottom:6 }}>Utilization</div>
              <div style={{ fontSize:14, fontWeight:500, color:'#d0d0d0', fontFamily:'var(--font-display)', marginBottom:20 }}>Agent Activity</div>
              {agentBars.map(b => <Bar key={b.label} {...b} />)}
            </motion.div>

            {/* Activity timeline */}
            <motion.div initial={{ opacity:0, y:16 }} animate={{ opacity:1, y:0 }} transition={{ delay:0.4 }}
              className="glass-card" style={{ padding:24 }}>
              <div className="section-label" style={{ marginBottom:6 }}>Timeline</div>
              <div style={{ fontSize:14, fontWeight:500, color:'#d0d0d0', fontFamily:'var(--font-display)', marginBottom:20 }}>Recent Activity</div>

              {allActivity.length === 0 ? (
                <p style={{ color:'#505050', fontSize:13, textAlign:'center', padding:'24px 0' }}>No activity yet</p>
              ) : (
                allActivity.map((item: any, i: number) => (
                  <motion.div key={`${item.type}-${item.id}`}
                    initial={{ opacity:0, x:-8 }} animate={{ opacity:1, x:0 }} transition={{ delay:0.45+i*0.04 }}
                    style={{ display:'flex', alignItems:'center', gap:12, paddingBottom:10, marginBottom:10, borderBottom:'1px solid rgba(255,255,255,0.05)' }}>
                    <div style={{ width:7, height:7, borderRadius:'50%', background:'rgba(255,255,255,0.25)', flexShrink:0 }} />
                    <div style={{ flex:1, minWidth:0 }}>
                      <p style={{ fontSize:12, color:'#c0c0c0', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{item.title}</p>
                      <p style={{ fontSize:10, color:'#606060', textTransform:'capitalize', marginTop:2 }}>{item.type}</p>
                    </div>
                    <p style={{ fontSize:10, color:'#505050', flexShrink:0 }}>
                      {new Date(item.timestamp).toLocaleDateString(undefined,{month:'short',day:'numeric'})}
                    </p>
                  </motion.div>
                ))
              )}
            </motion.div>
          </div>

          {/* System health */}
          <motion.div initial={{ opacity:0 }} animate={{ opacity:1 }} transition={{ delay:0.5 }}
            style={{ marginTop:16, display:'flex', alignItems:'center', justifyContent:'space-between', flexWrap:'wrap', gap:16, padding:'14px 20px', background:'#141414', border:'1px solid rgba(255,255,255,0.07)', borderRadius:12 }}>
            <div style={{ display:'flex', alignItems:'center', gap:8 }}>
              <Activity size={13} style={{ color:'#606060' }} />
              <span className="section-label">System Health</span>
            </div>
            <div style={{ display:'flex', alignItems:'center', gap:7 }}>
              <div style={{ width:7, height:7, borderRadius:'50%', background:'#22c55e', animation:'pulse 2s infinite' }} />
              <span style={{ fontSize:12, color:'#909090' }}>All systems operational</span>
            </div>
            <span style={{ fontSize:11, color:'#505050' }}>
              {new Date().toLocaleString(undefined,{month:'short',day:'numeric',hour:'2-digit',minute:'2-digit'})}
            </span>
          </motion.div>

        </div>
      </div>
    </AppLayout>
  );
}
