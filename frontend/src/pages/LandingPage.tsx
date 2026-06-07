import { useState } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, ChevronDown, Zap, Shield, FileSearch, Brain } from 'lucide-react';
import { useCinematicVideo } from '../hooks/useCinematicVideo';
import { useMouse, useReveal } from '../hooks/useMotion';
import WorkflowDiagram from '../components/agents/WorkflowDiagram';

const HERO_VIDEO     = 'https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260405_074625_a81f018a-956b-43fb-9aee-4d1508e30e6a.mp4';
const FEATURED_VIDEO = 'https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260402_054547_9875cfc5-155a-4229-8ec8-b7ba7125cbf8.mp4';
const INNOV_VIDEO    = 'https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260307_083826_e938b29f-a43a-41ec-a153-3d4730578ab8.mp4';
const SVC_VID_1      = 'https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260314_131748_f2ca2a28-fed7-44c8-b9a9-bd9acdd5ec31.mp4';
const SVC_VID_2      = 'https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260324_151826_c7218672-6e92-402c-9e45-f1e0f454bdc4.mp4';

const textIn = {
  hidden: { opacity:0, y:24, filter:'blur(6px)' },
  show: (i:number) => ({ opacity:1, y:0, filter:'blur(0px)', transition:{ delay:i*0.1+0.4, duration:0.8, ease:[0.16,1,0.3,1] } }),
};
const fadeUp = {
  hidden: { opacity:0, y:36 },
  show: { opacity:1, y:0, transition:{ duration:0.7, ease:[0.16,1,0.3,1] } },
};

// Floating Navbar
function Navbar() {
  const navigate = useNavigate();
  return (
    <motion.header initial={{ y:-20, opacity:0 }} animate={{ y:0, opacity:1 }} transition={{ duration:0.7, delay:0.2 }}
      style={{ position:'fixed', top:0, left:0, right:0, zIndex:50, display:'flex', justifyContent:'center', padding:'16px 16px 0' }}>
      <nav style={{ display:'flex', alignItems:'center', gap:4, padding:'8px 12px', background:'rgba(255,255,255,0.05)', backdropFilter:'blur(20px)', WebkitBackdropFilter:'blur(20px)', borderRadius:999, border:'1px solid rgba(255,255,255,0.1)', maxWidth:700, width:'100%' }}>
        <div style={{ display:'flex', alignItems:'center', gap:8, paddingRight:12, cursor:'pointer' }} onClick={()=>navigate('/')}>
          <div style={{ width:24, height:24, borderRadius:'50%', background:'#f0f0f0', display:'flex', alignItems:'center', justifyContent:'center' }}>
            <span style={{ fontSize:11, fontWeight:700, color:'#0d0d0d', fontFamily:'var(--font-display)' }}>N</span>
          </div>
          <span style={{ fontSize:13, color:'rgba(255,255,255,0.9)', fontFamily:'var(--font-display)', fontWeight:400, letterSpacing:'0.06em' }}>NEXUS AI</span>
        </div>
        <div style={{ width:1, height:16, background:'rgba(255,255,255,0.1)', margin:'0 4px' }} />
        <div style={{ flex:1, display:'flex', alignItems:'center', justifyContent:'center', gap:2 }}>
          {['Features','Workflow','About'].map(l => (
            <a key={l} href={`#${l.toLowerCase()}`} style={{ padding:'6px 12px', borderRadius:999, fontSize:12, color:'rgba(255,255,255,0.55)', fontFamily:'var(--font-body)', textDecoration:'none', fontWeight:500, transition:'color 0.2s' }}
              onMouseEnter={e=>(e.currentTarget.style.color='rgba(255,255,255,0.9)')}
              onMouseLeave={e=>(e.currentTarget.style.color='rgba(255,255,255,0.55)')}>
              {l}
            </a>
          ))}
        </div>
        <div style={{ display:'flex', gap:6 }}>
          <motion.button whileHover={{ scale:1.02 }} whileTap={{ scale:0.97 }}
            onClick={() => navigate('/dashboard')}
            style={{ padding:'7px 16px', borderRadius:999, background:'rgba(255,255,255,0.85)', color:'#0d0d0d', fontSize:12, fontWeight:600, border:'none', cursor:'pointer', display:'flex', alignItems:'center', gap:5, fontFamily:'var(--font-body)' }}>
            Dashboard <ArrowRight size={12} />
          </motion.button>
        </div>
      </nav>
    </motion.header>
  );
}

// Hero
function HeroSection() {
  const videoRef = useCinematicVideo({ fadeInDuration:2000, fadeOutStart:2, fadeOutDuration:1200 });
  const [email, setEmail] = useState('');
  const navigate = useNavigate();
  return (
    <section style={{ position:'relative', minHeight:'100vh', overflow:'hidden', display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center' }}>
      <video ref={videoRef} src={HERO_VIDEO} muted autoPlay playsInline preload="auto"
        style={{ position:'absolute', inset:0, width:'100%', height:'100%', objectFit:'cover', objectPosition:'center', opacity:0, zIndex:0 }} />
      {/* Overlays */}
      <div style={{ position:'absolute', inset:0, zIndex:1, background:'radial-gradient(ellipse 80% 60% at 50% 50%, rgba(0,0,0,0.3) 0%, rgba(0,0,0,0.72) 65%, rgba(0,0,0,0.95) 100%)' }} />
      <div style={{ position:'absolute', bottom:0, left:0, right:0, height:200, zIndex:1, background:'linear-gradient(to top,#0d0d0d,transparent)' }} />

      {/* Content */}
      <div style={{ position:'relative', zIndex:2, display:'flex', flexDirection:'column', alignItems:'center', textAlign:'center', padding:'80px 24px 40px', maxWidth:780, margin:'0 auto' }}>
        <motion.div custom={0} variants={textIn} initial="hidden" animate="show"
          style={{ display:'inline-flex', alignItems:'center', gap:8, marginBottom:28, padding:'6px 16px', borderRadius:999, background:'rgba(255,255,255,0.07)', border:'1px solid rgba(255,255,255,0.12)' }}>
          <div style={{ width:6, height:6, borderRadius:'50%', background:'#4ade80', animation:'pulse 2s infinite' }} />
          <span style={{ fontSize:11, color:'rgba(255,255,255,0.7)', fontWeight:500, letterSpacing:'0.12em', textTransform:'uppercase' }}>Multi-Agent Intelligence</span>
        </motion.div>

        <motion.h1 custom={1} variants={textIn} initial="hidden" animate="show"
          style={{ fontFamily:'var(--font-display)', fontSize:'clamp(3.5rem,10vw,8rem)', lineHeight:0.92, letterSpacing:'-0.02em', color:'rgba(255,255,255,0.92)', marginBottom:16 }}>
          NEXUS AI
        </motion.h1>

        <motion.p custom={2} variants={textIn} initial="hidden" animate="show"
          style={{ fontFamily:'var(--font-display)', fontSize:'clamp(1.3rem,3vw,2.2rem)', fontStyle:'italic', color:'rgba(255,255,255,0.45)', marginBottom:12 }}>
          Research Beyond Conversation
        </motion.p>

        <motion.p custom={3} variants={textIn} initial="hidden" animate="show"
          style={{ fontSize:12, color:'rgba(255,255,255,0.35)', letterSpacing:'0.22em', textTransform:'uppercase', fontWeight:500, marginBottom:40 }}>
          Multi-Agent Autonomous Intelligence
        </motion.p>

        <motion.div custom={4} variants={textIn} initial="hidden" animate="show"
          style={{ display:'flex', flexDirection:'column', gap:12, alignItems:'center', width:'100%', maxWidth:400 }}>
          <div style={{ display:'flex', gap:10, width:'100%' }}>
            <div style={{ flex:1, background:'rgba(255,255,255,0.06)', border:'1px solid rgba(255,255,255,0.12)', borderRadius:999, overflow:'hidden', display:'flex', alignItems:'center', padding:'0 16px' }}>
              <input type="email" value={email} onChange={e=>setEmail(e.target.value)} placeholder="your@email.com"
                style={{ flex:1, background:'transparent', border:'none', outline:'none', color:'rgba(255,255,255,0.85)', fontSize:13, padding:'11px 0', fontFamily:'var(--font-body)' }} />
            </div>
            <motion.button whileHover={{ scale:1.02 }} whileTap={{ scale:0.97 }}
              onClick={()=>navigate('/dashboard')}
              style={{ padding:'11px 20px', borderRadius:999, background:'rgba(255,255,255,0.88)', color:'#0d0d0d', fontSize:13, fontWeight:600, border:'none', cursor:'pointer', display:'flex', alignItems:'center', gap:6, whiteSpace:'nowrap', fontFamily:'var(--font-body)' }}>
              Get Access <ArrowRight size={13}/>
            </motion.button>
          </div>
          <motion.button whileHover={{ scale:1.01 }} onClick={()=>navigate('/dashboard')}
            style={{ padding:'11px 28px', borderRadius:999, background:'transparent', border:'1px solid rgba(255,255,255,0.2)', color:'rgba(255,255,255,0.7)', fontSize:13, fontWeight:500, cursor:'pointer', width:'100%', fontFamily:'var(--font-body)' }}>
            → Launch Dashboard
          </motion.button>
        </motion.div>

        <motion.div custom={5} variants={textIn} initial="hidden" animate="show"
          style={{ display:'flex', gap:36, marginTop:52, textAlign:'center' }}>
          {[['5','Agents'],['RAG','Retrieval'],['∞','Reflection'],['GPT','Multi-LLM']].map(([v,l])=>(
            <div key={l}>
              <div style={{ fontFamily:'var(--font-display)', fontSize:24, color:'rgba(255,255,255,0.85)' }}>{v}</div>
              <div style={{ fontSize:10, color:'rgba(255,255,255,0.3)', textTransform:'uppercase', letterSpacing:'0.14em', marginTop:4 }}>{l}</div>
            </div>
          ))}
        </motion.div>
      </div>

      <motion.div initial={{ opacity:0 }} animate={{ opacity:1 }} transition={{ delay:2.2 }}
        style={{ position:'absolute', bottom:32, left:'50%', transform:'translateX(-50%)', zIndex:2, display:'flex', flexDirection:'column', alignItems:'center', gap:6 }}>
        <motion.div animate={{ y:[0,7,0] }} transition={{ repeat:Infinity, duration:2 }}>
          <ChevronDown size={18} style={{ color:'rgba(255,255,255,0.3)' }} />
        </motion.div>
      </motion.div>
    </section>
  );
}

// Features
function FeaturesSection() {
  const { ref, visible } = useReveal(0.15);
  const features = [
    { icon:<Brain size={20}/>, title:'Multi-Agent Collaboration', desc:'Five specialized agents work in sequence — each handling a distinct phase of your research pipeline.' },
    { icon:<Zap size={20}/>, title:'Reflection & Self-Critique', desc:'The Critic Agent iteratively refines outputs through multi-step reasoning loops with quality scoring.' },
    { icon:<FileSearch size={20}/>, title:'RAG Pipeline', desc:'Upload documents → MiniLM-L6 embeddings → FAISS → semantic retrieval → grounded responses.' },
    { icon:<Shield size={20}/>, title:'LangGraph Orchestration', desc:'State-machine workflow with conditional routing, reflection loops, and persistent state.' },
  ];
  return (
    <section id="features" style={{ padding:'80px 24px', maxWidth:1100, margin:'0 auto' }} ref={ref as any}>
      <motion.div variants={fadeUp} initial="hidden" animate={visible?'show':'hidden'} style={{ textAlign:'center', marginBottom:60 }}>
        <p style={{ fontSize:11, color:'#606060', letterSpacing:'0.25em', textTransform:'uppercase', marginBottom:16 }}>Capabilities</p>
        <h2 style={{ fontFamily:'var(--font-display)', fontSize:'clamp(2rem,5vw,3.5rem)', color:'#e0e0e0', marginBottom:16 }}>
          Production-Grade AI Architecture
        </h2>
        <p style={{ color:'#808080', fontSize:14, maxWidth:520, margin:'0 auto', lineHeight:1.7 }}>
          Built with LangGraph, LangChain, FAISS, and sentence-transformers — every component is modular and production-ready.
        </p>
      </motion.div>
      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(260px,1fr))', gap:16 }}>
        {features.map((f,i)=>(
          <motion.div key={f.title} variants={fadeUp} initial="hidden" animate={visible?'show':'hidden'} transition={{ delay:i*0.1 }}
            className="glass-card" style={{ padding:24 }}>
            <div style={{ width:40,height:40,background:'#1e1e1e',border:'1px solid rgba(255,255,255,0.1)',borderRadius:12,display:'flex',alignItems:'center',justifyContent:'center',color:'#909090',marginBottom:16 }}>{f.icon}</div>
            <h3 style={{ fontSize:14,fontWeight:600,color:'#e0e0e0',marginBottom:8 }}>{f.title}</h3>
            <p style={{ fontSize:13,color:'#707070',lineHeight:1.7 }}>{f.desc}</p>
          </motion.div>
        ))}
      </div>
    </section>
  );
}

// Workflow
function WorkflowSection() {
  const { ref, visible } = useReveal(0.15);
  return (
    <section id="workflow" style={{ padding:'80px 24px', background:'#0a0a0a' }} ref={ref as any}>
      <div style={{ maxWidth:1100, margin:'0 auto' }}>
        <motion.div variants={fadeUp} initial="hidden" animate={visible?'show':'hidden'} style={{ textAlign:'center', marginBottom:60 }}>
          <p style={{ fontSize:11, color:'#606060', letterSpacing:'0.25em', textTransform:'uppercase', marginBottom:16 }}>LangGraph</p>
          <h2 style={{ fontFamily:'var(--font-display)', fontSize:'clamp(2rem,5vw,3.5rem)', color:'#e0e0e0', marginBottom:16 }}>
            Agent Execution Graph
          </h2>
        </motion.div>
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:48, alignItems:'center' }}>
          <motion.div variants={fadeUp} initial="hidden" animate={visible?'show':'hidden'} style={{ display:'flex', justifyContent:'center' }}>
            <WorkflowDiagram />
          </motion.div>
          <motion.div variants={fadeUp} initial="hidden" animate={visible?'show':'hidden'} transition={{ delay:0.2 }} style={{ display:'flex', flexDirection:'column', gap:18 }}>
            {[
              { icon:'◈', title:'Planner Agent',    desc:'Decomposes your goal into structured tasks with search queries and execution plan.' },
              { icon:'◉', title:'RAG Retrieval',    desc:'Semantic search over your documents using sentence-transformers and FAISS.' },
              { icon:'◎', title:'Research Agent',   desc:'Deep LLM synthesis combining retrieved context with web search.' },
              { icon:'◌', title:'Critic Agent',     desc:'Scores quality 0–10, detects hallucinations, loops until threshold met.' },
              { icon:'◍', title:'Report Generator', desc:'Structured Markdown and PDF reports with citations.' },
            ].map(({ icon, title, desc }) => (
              <div key={title} style={{ display:'flex', gap:14 }}>
                <div style={{ width:32,height:32,background:'#1a1a1a',border:'1px solid rgba(255,255,255,0.08)',borderRadius:10,display:'flex',alignItems:'center',justifyContent:'center',color:'#707070',fontSize:14,flexShrink:0 }}>{icon}</div>
                <div>
                  <h4 style={{ fontSize:13,fontWeight:600,color:'#d0d0d0',marginBottom:3 }}>{title}</h4>
                  <p style={{ fontSize:12,color:'#606060',lineHeight:1.6 }}>{desc}</p>
                </div>
              </div>
            ))}
          </motion.div>
        </div>
      </div>
    </section>
  );
}

// Featured video
function FeaturedVideoSection() {
  const { ref, visible } = useReveal(0.1);
  return (
    <section style={{ padding:'16px 24px' }} ref={ref as any}>
      <div style={{ maxWidth:1100, margin:'0 auto' }}>
        <motion.div variants={fadeUp} initial="hidden" animate={visible?'show':'hidden'}
          style={{ position:'relative', borderRadius:24, overflow:'hidden', aspectRatio:'16/9' }}>
          <video src={FEATURED_VIDEO} muted autoPlay loop playsInline
            style={{ position:'absolute', inset:0, width:'100%', height:'100%', objectFit:'cover' }} />
          <div style={{ position:'absolute', inset:0, background:'linear-gradient(to top, rgba(0,0,0,0.85) 0%, rgba(0,0,0,0.2) 50%, transparent 100%)' }} />
          <div style={{ position:'absolute', bottom:0, left:0, right:0, padding:32, display:'flex', alignItems:'flex-end', justifyContent:'space-between', gap:16, flexWrap:'wrap' }}>
            <div>
              <h3 style={{ fontFamily:'var(--font-display)', fontSize:'clamp(1.5rem,3vw,2.5rem)', color:'rgba(255,255,255,0.9)', marginBottom:8 }}>Autonomous Research</h3>
              <p style={{ color:'rgba(255,255,255,0.55)', fontSize:13, maxWidth:400 }}>From query to comprehensive report — fully automated, entirely traceable.</p>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}

// Innovation / Services
function InnovationSection() {
  const { ref, visible } = useReveal(0.15);
  return (
    <section style={{ padding:'80px 24px' }} ref={ref as any}>
      <div style={{ maxWidth:1100, margin:'0 auto', display:'grid', gridTemplateColumns:'1fr 1fr', gap:48, alignItems:'center' }}>
        <motion.div variants={fadeUp} initial="hidden" animate={visible?'show':'hidden'}>
          <p style={{ fontSize:11, color:'#606060', letterSpacing:'0.25em', textTransform:'uppercase', marginBottom:16 }}>Philosophy</p>
          <h2 style={{ fontFamily:'var(--font-display)', fontSize:'clamp(2rem,4vw,3rem)', color:'#e0e0e0', lineHeight:1.1, marginBottom:20 }}>
            Not a tool.<br/><span style={{ fontStyle:'italic', color:'#707070' }}>A collaborator.</span>
          </h2>
          <p style={{ color:'#808080', fontSize:14, lineHeight:1.8, marginBottom:24, maxWidth:420 }}>
            NEXUS AI reasons, reflects, and refines — just like a research team would. Every response is critiqued, every claim grounded, every report structured.
          </p>
          <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
            {['Self-critique loops until quality ≥ 8/10','Hallucination risk detection per response','Citations grounded in your own documents','LangGraph state machine with memory'].map(item=>(
              <div key={item} style={{ display:'flex', alignItems:'center', gap:10, fontSize:13, color:'#707070' }}>
                <div style={{ width:5,height:5,borderRadius:'50%',background:'rgba(255,255,255,0.3)',flexShrink:0 }} />
                {item}
              </div>
            ))}
          </div>
        </motion.div>
        <motion.div variants={fadeUp} initial="hidden" animate={visible?'show':'hidden'} transition={{ delay:0.15 }}
          style={{ position:'relative', borderRadius:20, overflow:'hidden', aspectRatio:'3/4' }}>
          <video src={INNOV_VIDEO} muted autoPlay loop playsInline
            style={{ position:'absolute', inset:0, width:'100%', height:'100%', objectFit:'cover' }} />
        </motion.div>
      </div>
    </section>
  );
}

// Services
function ServicesSection() {
  const { ref, visible } = useReveal(0.1);
  const services = [
    { title:'Document Intelligence', sub:'RAG & Embeddings',  video:SVC_VID_1 },
    { title:'Autonomous Research',   sub:'Multi-Agent Chain', video:SVC_VID_2 },
  ];
  return (
    <section style={{ padding:'16px 24px 80px' }} ref={ref as any}>
      <div style={{ maxWidth:1100, margin:'0 auto' }}>
        <motion.div variants={fadeUp} initial="hidden" animate={visible?'show':'hidden'} style={{ textAlign:'center', marginBottom:40 }}>
          <p style={{ fontSize:11, color:'#606060', letterSpacing:'0.25em', textTransform:'uppercase', marginBottom:12 }}>Capabilities</p>
          <h2 style={{ fontFamily:'var(--font-display)', fontSize:'clamp(2rem,5vw,3.5rem)', color:'#e0e0e0' }}>What NEXUS does</h2>
        </motion.div>
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:14 }}>
          {services.map(({title,sub,video},i)=>(
            <motion.div key={title} variants={fadeUp} initial="hidden" animate={visible?'show':'hidden'} transition={{ delay:i*0.12 }}
              style={{ position:'relative', borderRadius:20, overflow:'hidden', aspectRatio:'4/3', cursor:'pointer' }}>
              <video src={video} muted autoPlay loop playsInline
                style={{ position:'absolute', inset:0, width:'100%', height:'100%', objectFit:'cover', transition:'transform 0.5s ease' }}
                onMouseEnter={e=>(e.currentTarget.style.transform='scale(1.04)')}
                onMouseLeave={e=>(e.currentTarget.style.transform='scale(1)')} />
              <div style={{ position:'absolute', inset:0, background:'linear-gradient(to top, rgba(0,0,0,0.8) 0%, rgba(0,0,0,0.15) 60%, transparent 100%)' }} />
              <div style={{ position:'absolute', bottom:0, left:0, right:0, padding:24 }}>
                <p style={{ fontSize:11, color:'rgba(255,255,255,0.45)', letterSpacing:'0.14em', textTransform:'uppercase', marginBottom:6 }}>{sub}</p>
                <h3 style={{ fontFamily:'var(--font-display)', fontSize:'clamp(1.3rem,2.5vw,1.8rem)', color:'rgba(255,255,255,0.9)' }}>{title}</h3>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

// About
function AboutSection() {
  const { ref, visible } = useReveal(0.2);
  const navigate = useNavigate();
  return (
    <section id="about" style={{ padding:'100px 24px', background:'#0a0a0a', textAlign:'center' }} ref={ref as any}>
      <div style={{ maxWidth:760, margin:'0 auto' }}>
        <motion.div variants={fadeUp} initial="hidden" animate={visible?'show':'hidden'}>
          <p style={{ fontSize:11, color:'#505050', letterSpacing:'0.3em', textTransform:'uppercase', marginBottom:28 }}>About</p>
          <p style={{ fontFamily:'var(--font-display)', fontSize:'clamp(1.6rem,4vw,2.8rem)', color:'#d0d0d0', lineHeight:1.2, marginBottom:40 }}>
            We believe research should be <span style={{ fontStyle:'italic', color:'#707070' }}>effortless</span>. NEXUS AI turns complex questions into <span style={{ fontStyle:'italic', color:'#707070' }}>structured intelligence</span> — automatically.
          </p>
          <motion.button whileHover={{ scale:1.02 }} whileTap={{ scale:0.97 }}
            onClick={()=>navigate('/dashboard')}
            style={{ display:'inline-flex', alignItems:'center', gap:8, padding:'14px 32px', borderRadius:999, background:'rgba(255,255,255,0.9)', color:'#0d0d0d', fontSize:14, fontWeight:600, border:'none', cursor:'pointer', fontFamily:'var(--font-body)' }}>
            Launch NEXUS AI <ArrowRight size={15}/>
          </motion.button>
        </motion.div>
      </div>
    </section>
  );
}

function Footer() {
  return (
    <footer style={{ borderTop:'1px solid rgba(255,255,255,0.06)', padding:'28px 32px', display:'flex', flexDirection:'column', alignItems:'center', gap:10 }}>
      <div style={{ display:'flex', alignItems:'center', gap:8 }}>
        <div style={{ width:18,height:18,borderRadius:'50%',background:'rgba(255,255,255,0.7)',display:'flex',alignItems:'center',justifyContent:'center' }}>
          <span style={{ fontSize:8,fontWeight:700,color:'#0d0d0d',fontFamily:'var(--font-display)' }}>N</span>
        </div>
        <span style={{ fontFamily:'var(--font-display)', fontSize:13, color:'rgba(255,255,255,0.4)' }}>NEXUS AI</span>
      </div>
      <p style={{ color:'rgba(255,255,255,0.2)', fontSize:12 }}>Multi-Agent Autonomous Research Intelligence · 2026</p>
    </footer>
  );
}

export default function LandingPage() {
  return (
    <div style={{ background:'#0d0d0d', color:'#f0f0f0' }}>
      <Navbar />
      <HeroSection />
      <FeaturesSection />
      <WorkflowSection />
      <FeaturedVideoSection />
      <InnovationSection />
      <ServicesSection />
      <AboutSection />
      <Footer />
    </div>
  );
}
