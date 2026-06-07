import { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Send, StopCircle, Plus, Trash2, MessageSquare, Zap, ChevronDown, Bot, User } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import AppLayout from '../components/layout/AppLayout';
import { chatAPI } from '../services/api';
import { useStreamingChat } from '../hooks/useStreamingChat';

const PROMPTS = [
  'Research the latest advances in multi-agent AI systems',
  'Explain RAG architecture — chunking, embeddings, retrieval',
  'Compare transformer self-attention vs linear attention',
  'What is LangGraph and how does it enable reflection loops?',
];

function TypingDots({ label }: { label?: string }) {
  return (
    <div style={{ display:'flex', alignItems:'center', gap:12, padding:'12px 16px' }}>
      <div style={{ width:32,height:32,borderRadius:'50%',background:'#1e1e1e',border:'1px solid rgba(255,255,255,0.1)',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0 }}>
        <Bot size={15} style={{ color:'#707070' }} />
      </div>
      <div style={{ background:'#1e1e1e', border:'1px solid rgba(255,255,255,0.08)', borderRadius:'4px 14px 14px 14px', padding:'10px 16px', display:'flex', alignItems:'center', gap:10 }}>
        <div style={{ display:'flex', gap:4 }}>
          {[0,1,2].map(i => (
            <motion.div key={i} style={{ width:5,height:5,borderRadius:'50%',background:'#606060' }}
              animate={{ y:[0,-5,0] }} transition={{ duration:0.8, delay:i*0.15, repeat:Infinity }} />
          ))}
        </div>
        {label && <span style={{ fontSize:12, color:'#606060' }}>{label}</span>}
      </div>
    </div>
  );
}

function AgentStepBadge({ name, status }: { name:string; status:'idle'|'running'|'done' }) {
  const colors = {
    idle:    { bg:'transparent', color:'#505050', border:'rgba(255,255,255,0.07)' },
    running: { bg:'rgba(59,130,246,0.1)', color:'#60a5fa', border:'rgba(59,130,246,0.3)' },
    done:    { bg:'rgba(34,197,94,0.08)', color:'#4ade80', border:'rgba(34,197,94,0.2)' },
  };
  const c = colors[status];
  return (
    <div style={{ display:'inline-flex', alignItems:'center', gap:5, padding:'3px 9px', borderRadius:20, background:c.bg, border:`1px solid ${c.border}`, fontSize:10, color:c.color, fontWeight:500 }}>
      <div style={{ width:5,height:5,borderRadius:'50%',background:c.color, ...(status==='running'?{animation:'pulse 1s infinite'}:{}) }} />
      {name}
    </div>
  );
}

function MessageBubble({ msg }: { msg:any }) {
  const isUser = msg.role === 'user';
  const [showTrace, setShowTrace] = useState(false);
  const ad = msg.agent_data || {};

  return (
    <motion.div initial={{ opacity:0, y:10 }} animate={{ opacity:1, y:0 }} transition={{ duration:0.35 }}
      style={{ display:'flex', alignItems:'flex-start', gap:12, padding:'8px 16px', flexDirection: isUser?'row-reverse':'row' }}>
      <div style={{ width:32,height:32,borderRadius:'50%',background:'#1e1e1e',border:'1px solid rgba(255,255,255,0.1)',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0,marginTop:2 }}>
        {isUser ? <User size={14} style={{ color:'#909090' }} /> : <Bot size={14} style={{ color:'#909090' }} />}
      </div>
      <div style={{ display:'flex', flexDirection:'column', gap:6, maxWidth:'78%', alignItems: isUser?'flex-end':'flex-start' }}>
        <div className={isUser ? 'bubble-user' : 'bubble-assistant'}>
          {isUser ? (
            <p style={{ margin:0 }}>{msg.content}</p>
          ) : (
            <div className="markdown">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>{msg.content}</ReactMarkdown>
            </div>
          )}
        </div>
        <div style={{ display:'flex', alignItems:'center', gap:8, flexWrap:'wrap' }}>
          <span style={{ fontSize:11, color:'#505050' }}>
            {msg.created_at ? formatDistanceToNow(new Date(msg.created_at), { addSuffix:true }) : 'just now'}
          </span>
          {!isUser && ad.quality_score > 0 && (
            <>
              <span style={{ color:'#404040' }}>·</span>
              <button onClick={() => setShowTrace(p=>!p)}
                style={{ fontSize:11, color:'#606060', background:'none', border:'none', cursor:'pointer', display:'flex', alignItems:'center', gap:4 }}
                onMouseEnter={e=>(e.currentTarget.style.color='#b0b0b0')}
                onMouseLeave={e=>(e.currentTarget.style.color='#606060')}>
                Q:{ad.quality_score}/10 · {ad.reflection_count||0} loops · {ad.hallucination_risk||'—'} risk
                <ChevronDown size={11} style={{ transform: showTrace?'rotate(180deg)':'none', transition:'transform 0.2s' }} />
              </button>
            </>
          )}
        </div>
        <AnimatePresence>
          {showTrace && ad.agent_logs?.length > 0 && (
            <motion.div initial={{ height:0, opacity:0 }} animate={{ height:'auto', opacity:1 }} exit={{ height:0, opacity:0 }}
              style={{ overflow:'hidden', width:'100%' }}>
              <div style={{ background:'#1a1a1a', border:'1px solid rgba(255,255,255,0.08)', borderRadius:10, padding:12 }}>
                <div style={{ fontSize:10, color:'#505050', letterSpacing:'0.1em', textTransform:'uppercase', marginBottom:8 }}>Agent Trace</div>
                {ad.agent_logs.map((log:any, i:number) => (
                  <div key={i} style={{ display:'flex', gap:8, fontSize:12, marginBottom:5 }}>
                    <span style={{ color:'#909090', fontWeight:500, minWidth:100 }}>{log.agent}</span>
                    <span style={{ color:'#505050' }}>→</span>
                    <span style={{ color:'#707070', flex:1 }}>{log.message}</span>
                  </div>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}

function StreamBubble({ text }: { text:string }) {
  return (
    <div style={{ display:'flex', alignItems:'flex-start', gap:12, padding:'8px 16px' }}>
      <div style={{ width:32,height:32,borderRadius:'50%',background:'#1e1e1e',border:'1px solid rgba(255,255,255,0.1)',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0,marginTop:2 }}>
        <Bot size={14} style={{ color:'#909090' }} />
      </div>
      <div className="bubble-assistant" style={{ maxWidth:'78%' }}>
        <div className="markdown">
          <ReactMarkdown remarkPlugins={[remarkGfm]}>{text}</ReactMarkdown>
        </div>
        <span style={{ display:'inline-block', width:2, height:14, background:'#909090', marginLeft:2, verticalAlign:'middle', animation:'blink 1s ease infinite' }} />
      </div>
    </div>
  );
}

export default function ChatPage() {
  const [messages,     setMessages]     = useState<any[]>([]);
  const [sessions,     setSessions]     = useState<any[]>([]);
  const [activeSession,setActive]       = useState<string|null>(null);
  const [input,        setInput]        = useState('');
  const [isLoading,    setIsLoading]    = useState(false);
  const [agentEvents,  setAgentEvents]  = useState<any[]>([]);
  const [useStream,    setUseStream]    = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef    = useRef<HTMLTextAreaElement>(null);
  const { streaming, streamedText, agentEvents:sseEvents, sendStreamMessage, abort } = useStreamingChat();
  const busy = isLoading || streaming;

  useEffect(() => { chatAPI.getSessions().then(r=>setSessions(r.data)).catch(()=>{}); }, []);
  useEffect(() => { if (activeSession) chatAPI.getSessionMessages(activeSession).then(r=>setMessages(r.data)).catch(()=>{}); }, [activeSession]);
  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior:'smooth' }); }, [messages, streaming, streamedText]);

  const handleSend = async (text = input) => {
    const q = text.trim();
    if (!q || busy) return;
    setInput('');
    if (textareaRef.current) textareaRef.current.style.height = 'auto';
    const userMsg = { id:Date.now().toString(), role:'user', content:q, created_at:new Date().toISOString() };
    setMessages(p=>[...p, userMsg]);
    setAgentEvents([]);
    if (useStream) {
      await sendStreamMessage(q, activeSession||'', (data:any) => {
        if (!activeSession) setActive(data.session_id);
        setMessages(p=>[...p,{ id:data.message_id||Date.now().toString(), role:'assistant', content:data.response, agent_data:data.agent_data, created_at:new Date().toISOString() }]);
        setAgentEvents(data.agent_data?.agent_logs||[]);
        chatAPI.getSessions().then(r=>setSessions(r.data)).catch(()=>{});
      });
    } else {
      setIsLoading(true);
      try {
        const res = await chatAPI.sendMessage(q, activeSession||'');
        const d = res.data;
        if (!activeSession) setActive(d.session_id);
        setMessages(p=>[...p,{ id:d.message_id, role:'assistant', content:d.response, agent_data:d.agent_data, created_at:d.created_at }]);
        setAgentEvents(d.agent_data?.agent_logs||[]);
        chatAPI.getSessions().then(r=>setSessions(r.data)).catch(()=>{});
      } catch(e:any) {
        setMessages(p=>[...p,{ id:Date.now().toString(), role:'assistant', content:`**Error:** ${e.response?.data?.detail||e.message}`, created_at:new Date().toISOString() }]);
      } finally { setIsLoading(false); }
    }
  };

  const lastEvent = sseEvents[sseEvents.length-1];

  return (
    <AppLayout>
      <div style={{ display:'flex', height:'100%' }}>
        {/* Sessions sidebar */}
        <div style={{ width:240, flexShrink:0, background:'#0f0f0f', borderRight:'1px solid rgba(255,255,255,0.06)', display:'flex', flexDirection:'column' }}>
          <div style={{ padding:12, borderBottom:'1px solid rgba(255,255,255,0.06)' }}>
            <button className="btn-secondary" onClick={() => { setActive(null); setMessages([]); }}
              style={{ width:'100%', display:'flex', alignItems:'center', gap:8, justifyContent:'center', padding:'9px 14px' }}>
              <Plus size={13} /> New Session
            </button>
          </div>
          <div style={{ flex:1, overflowY:'auto', padding:'8px 8px' }}>
            <div className="section-label" style={{ padding:'4px 8px', marginBottom:6 }}>History</div>
            {sessions.length===0 ? (
              <p style={{ color:'#505050', fontSize:12, textAlign:'center', padding:'24px 12px' }}>No sessions yet</p>
            ) : sessions.map(s => (
              <div key={s.id} onClick={() => setActive(s.id)}
                style={{ display:'flex', alignItems:'center', gap:8, padding:'9px 10px', borderRadius:8, cursor:'pointer', marginBottom:2, background: activeSession===s.id?'#1e1e1e':'transparent', border: activeSession===s.id?'1px solid rgba(255,255,255,0.1)':'1px solid transparent' }}
                onMouseEnter={e => { if(activeSession!==s.id) e.currentTarget.style.background='#161616'; }}
                onMouseLeave={e => { if(activeSession!==s.id) e.currentTarget.style.background='transparent'; }}>
                <MessageSquare size={12} style={{ color:'#606060', flexShrink:0 }} />
                <span style={{ fontSize:12, color: activeSession===s.id?'#e0e0e0':'#909090', flex:1, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{s.title}</span>
                <button onClick={e=>{e.stopPropagation();chatAPI.deleteSession(s.id);setSessions(p=>p.filter(x=>x.id!==s.id));if(activeSession===s.id){setActive(null);setMessages([]);}}}
                  style={{ background:'none',border:'none',color:'#404040',cursor:'pointer',padding:2,opacity:0,flexShrink:0 }}
                  onMouseEnter={e=>(e.currentTarget.style.opacity='1')} onMouseLeave={e=>(e.currentTarget.style.opacity='0')}>
                  <Trash2 size={11} />
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Main chat */}
        <div style={{ flex:1, display:'flex', flexDirection:'column', minWidth:0 }}>
          {/* Header */}
          <div style={{ display:'flex', alignItems:'center', gap:12, padding:'12px 20px', borderBottom:'1px solid rgba(255,255,255,0.06)' }}>
            <div style={{ width:8,height:8,borderRadius:'50%',background:'#22c55e',animation:'pulse 2s infinite' }} />
            <div>
              <div style={{ fontSize:12, fontWeight:600, color:'#d0d0d0', letterSpacing:'0.08em' }}>RESEARCH CHAT</div>
              <div style={{ fontSize:11, color:'#505050' }}>Plan → Retrieve → Research → Critique → Report</div>
            </div>
            <div style={{ marginLeft:'auto', display:'flex', alignItems:'center', gap:8 }}>
              <button onClick={() => setUseStream(p=>!p)}
                style={{ display:'flex', alignItems:'center', gap:5, padding:'5px 10px', borderRadius:20, background: useStream?'rgba(59,130,246,0.1)':'transparent', border:`1px solid ${useStream?'rgba(59,130,246,0.25)':'rgba(255,255,255,0.1)'}`, color: useStream?'#60a5fa':'#606060', fontSize:11, cursor:'pointer', fontWeight:500 }}>
                <Zap size={11} /> {useStream?'Streaming':'Batch'}
              </button>
            </div>
          </div>

          {/* Messages */}
          <div style={{ flex:1, overflowY:'auto', paddingTop:8 }}>
            {messages.length===0 && !streaming ? (
              <div style={{ display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', height:'100%', padding:'32px 24px', textAlign:'center' }}>
                <div style={{ fontSize:40, marginBottom:20, color:'#252525' }}>◈</div>
                <h2 style={{ fontFamily:'var(--font-display)', fontSize:22, color:'#d0d0d0', marginBottom:10, fontWeight:400 }}>Begin Research</h2>
                <p style={{ color:'#606060', fontSize:13, maxWidth:380, lineHeight:1.7, marginBottom:28 }}>
                  Five agents will collaborate — planning, retrieving, analyzing, critiquing, and reporting on your query.
                </p>
                <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8, width:'100%', maxWidth:520 }}>
                  {PROMPTS.map(p => (
                    <button key={p} onClick={() => handleSend(p)}
                      style={{ textAlign:'left', padding:'12px 14px', background:'#1a1a1a', border:'1px solid rgba(255,255,255,0.08)', borderRadius:10, fontSize:12, color:'#909090', cursor:'pointer', lineHeight:1.5 }}
                      onMouseEnter={e=>{e.currentTarget.style.background='#1e1e1e';e.currentTarget.style.color='#d0d0d0';e.currentTarget.style.borderColor='rgba(255,255,255,0.15)';}}
                      onMouseLeave={e=>{e.currentTarget.style.background='#1a1a1a';e.currentTarget.style.color='#909090';e.currentTarget.style.borderColor='rgba(255,255,255,0.08)';}}>
                      {p}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <div>
                {messages.map(msg => <MessageBubble key={msg.id} msg={msg} />)}
                {streaming && streamedText ? <StreamBubble text={streamedText} /> : busy && <TypingDots label={lastEvent?.message} />}
                {streaming && !streamedText && <TypingDots label={lastEvent?.message||'Agents working…'} />}
                <div ref={messagesEndRef} />
              </div>
            )}
          </div>

          {/* Agent steps */}
          <AnimatePresence>
            {busy && sseEvents.length>0 && (
              <motion.div initial={{ opacity:0, height:0 }} animate={{ opacity:1, height:'auto' }} exit={{ opacity:0, height:0 }}
                style={{ padding:'8px 16px', borderTop:'1px solid rgba(255,255,255,0.05)', display:'flex', gap:6, flexWrap:'wrap' }}>
                {['Planner','RAG','Researcher','Critic','Reporter'].map(name => {
                  const done = agentEvents.some((l:any)=>l.agent?.includes(name));
                  const running = !done && sseEvents.some(e=>e.message?.toLowerCase().includes(name.toLowerCase()));
                  return <AgentStepBadge key={name} name={name} status={done?'done':running?'running':'idle'} />;
                })}
              </motion.div>
            )}
          </AnimatePresence>

          {/* Input */}
          <div style={{ padding:16, borderTop:'1px solid rgba(255,255,255,0.06)' }}>
            <div className="glass-input" style={{ display:'flex', alignItems:'flex-end', gap:10, padding:'10px 14px' }}>
              <textarea ref={textareaRef} value={input}
                onChange={e=>{setInput(e.target.value);e.target.style.height='auto';e.target.style.height=Math.min(e.target.scrollHeight,140)+'px';}}
                onKeyDown={e=>{if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();handleSend();}}}
                placeholder="Ask a research question…" rows={1} disabled={busy}
                style={{ flex:1, background:'transparent', border:'none', color:'#d0d0d0', fontSize:14, resize:'none', outline:'none', lineHeight:1.5, fontFamily:'var(--font-body)' }} />
              {busy ? (
                <button onClick={abort}
                  style={{ width:36,height:36,borderRadius:9,background:'rgba(239,68,68,0.1)',border:'1px solid rgba(239,68,68,0.25)',display:'flex',alignItems:'center',justifyContent:'center',color:'#ef4444',cursor:'pointer',flexShrink:0 }}>
                  <StopCircle size={15} />
                </button>
              ) : (
                <button onClick={() => handleSend()} disabled={!input.trim()}
                  style={{ width:36,height:36,borderRadius:9,background:input.trim()?'#f0f0f0':'#1e1e1e',border:`1px solid ${input.trim()?'transparent':'rgba(255,255,255,0.08)'}`,display:'flex',alignItems:'center',justifyContent:'center',color:input.trim()?'#0d0d0d':'#505050',cursor:input.trim()?'pointer':'default',flexShrink:0,transition:'all 0.15s' }}>
                  <Send size={14} />
                </button>
              )}
            </div>
            <p style={{ textAlign:'center', fontSize:11, color:'#404040', marginTop:8 }}>Enter to send · Shift+Enter for newline</p>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
