import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Home } from 'lucide-react';

export default function NotFoundPage() {
  const navigate = useNavigate();
  return (
    <div style={{ minHeight:'100vh', background:'#0d0d0d', display:'flex', alignItems:'center', justifyContent:'center', padding:24 }}>
      <motion.div initial={{ opacity:0, y:24 }} animate={{ opacity:1, y:0 }} transition={{ duration:0.6 }}
        style={{ textAlign:'center', maxWidth:440 }}>
        <div style={{ fontFamily:'var(--font-display)', fontSize:'clamp(5rem,18vw,11rem)', lineHeight:1, color:'#202020', marginBottom:24, userSelect:'none' }}>404</div>
        <h1 style={{ fontFamily:'var(--font-display)', fontSize:22, color:'#d0d0d0', fontWeight:400, marginBottom:10 }}>Page not found</h1>
        <p style={{ color:'#606060', fontSize:13, lineHeight:1.7, marginBottom:28 }}>
          The agent couldn't locate this route in the pipeline graph.
        </p>
        <div style={{ display:'flex', alignItems:'center', justifyContent:'center', gap:12 }}>
          <button className="btn-secondary" onClick={() => navigate(-1)} style={{ display:'flex', alignItems:'center', gap:8 }}>
            <ArrowLeft size={14}/> Go back
          </button>
          <button className="btn-primary" onClick={() => navigate('/')} style={{ display:'flex', alignItems:'center', gap:8 }}>
            <Home size={14}/> Home
          </button>
        </div>
      </motion.div>
    </div>
  );
}
