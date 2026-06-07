import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';

const AGENTS = [
  { id:'planner',    label:'Planner',    sub:'Goal decomposition',    icon:'◈', x:50, y:10 },
  { id:'rag',        label:'Retriever',  sub:'Semantic search',       icon:'◉', x:22, y:34 },
  { id:'researcher', label:'Researcher', sub:'Synthesis',             icon:'◎', x:78, y:34 },
  { id:'critic',     label:'Critic',     sub:'Reflection & scoring',  icon:'◌', x:50, y:58 },
  { id:'reporter',   label:'Reporter',   sub:'Report generation',     icon:'◍', x:50, y:82 },
];

const EDGES = [
  [0,1],[0,2],[1,3],[2,3],[3,4],
  // refine loop
  [3,0],
];

interface Props { activeAgents?: string[]; completedAgents?: string[]; isRunning?: boolean; }

export default function WorkflowDiagram({ activeAgents=[], completedAgents=[], isRunning=false }: Props) {
  const [step, setStep] = useState(0);
  useEffect(() => {
    if (!isRunning) return;
    const t = setInterval(() => setStep(s => (s+1)%AGENTS.length), 800);
    return () => clearInterval(t);
  }, [isRunning]);

  const getState = (id: string, idx: number) => {
    if (completedAgents.includes(id)) return 'done';
    if (activeAgents.includes(id) || (isRunning && step===idx)) return 'running';
    return 'idle';
  };

  return (
    <div style={{ width:'100%', maxWidth:420, position:'relative' }}>
      <svg viewBox="0 0 100 95" style={{ position:'absolute', inset:0, width:'100%', height:'100%', pointerEvents:'none' }}>
        {EDGES.map(([fi,ti], ei) => {
          const f = AGENTS[fi], t = AGENTS[ti];
          const isLoop = fi===3 && ti===0;
          const active = completedAgents.length>0||isRunning;
          const d = isLoop
            ? `M ${f.x+4} ${f.y+4} C ${f.x+22} ${f.y-5}, ${t.x+22} ${t.y+5}, ${t.x+4} ${t.y+4}`
            : `M ${f.x+4} ${f.y+4} L ${t.x+4} ${t.y+4}`;
          return (
            <path key={ei} d={d} fill="none"
              stroke={active ? 'rgba(255,255,255,0.25)' : 'rgba(255,255,255,0.07)'}
              strokeWidth="0.6"
              strokeDasharray={isLoop ? '1.5,2' : undefined}
            />
          );
        })}
      </svg>
      <div style={{ paddingBottom:'92%', position:'relative' }}>
        {AGENTS.map((a, i) => {
          const state = getState(a.id, i);
          return (
            <motion.div key={a.id}
              style={{ position:'absolute', left:`${a.x}%`, top:`${a.y}%`, transform:'translate(-50%,-50%)', zIndex:2 }}
              initial={{ opacity:0, scale:0.85 }}
              animate={{ opacity:1, scale:1 }}
              transition={{ delay: i*0.08+0.2 }}
            >
              <motion.div
                animate={state==='running' ? { boxShadow:['0 0 0 0 rgba(59,130,246,0)','0 0 0 8px rgba(59,130,246,0.08)','0 0 0 0 rgba(59,130,246,0)'] } : {}}
                transition={{ repeat:Infinity, duration:1.8 }}
                className="agent-node"
                style={{
                  ...( state==='running' ? { borderColor:'rgba(59,130,246,0.5)', background:'#1a1a1a' } : {}),
                  ...( state==='done'    ? { borderColor:'rgba(34,197,94,0.3)',  opacity:0.7 } : {}),
                  ...( state==='idle'    ? { opacity:0.45 } : {}),
                  padding:'10px 12px', display:'flex', flexDirection:'column', alignItems:'center', gap:4, width:88
                }}
              >
                <div style={{ fontSize:18, color: state==='running'?'#f0f0f0': state==='done'?'#4ade80':'#505050' }}>
                  {a.icon}
                </div>
                <div style={{ textAlign:'center' }}>
                  <div style={{ fontSize:10, fontWeight:600, color: state==='running'?'#f0f0f0': state==='done'?'#b0b0b0':'#505050', letterSpacing:'0.04em' }}>
                    {a.label}
                  </div>
                  <div style={{ fontSize:8.5, color:'#505050', marginTop:2 }}>{a.sub}</div>
                </div>
                <div style={{
                  width:6, height:6, borderRadius:'50%',
                  background: state==='running'?'#3b82f6': state==='done'?'#22c55e':'#303030',
                  ...(state==='running' ? { animation:'pulse 1s infinite' } : {})
                }} />
              </motion.div>
            </motion.div>
          );
        })}
      </div>
      {isRunning && (
        <div style={{ position:'absolute', right:-4, top:'40%', fontSize:9, color:'#505050', writingMode:'vertical-rl' as const }}>
          ↺ refine loop
        </div>
      )}
    </div>
  );
}
