import { motion, useScroll, useTransform } from 'framer-motion';
import { useNavigate, NavLink } from 'react-router-dom';

const NAV_LINKS = [
  { label: 'Features',  href: '#features'   },
  { label: 'Workflow',  href: '#workflow'    },
  { label: 'Analytics', href: '#analytics'  },
  { label: 'Reports',   href: '#reports'    },
  { label: 'About',     href: '#about'      },
];

export default function Navbar() {
  const navigate = useNavigate();
  const { scrollY } = useScroll();
  const opacity = useTransform(scrollY, [0, 60], [0, 1]);
  const blur    = useTransform(scrollY, [0, 60], [0, 1]);

  return (
    <motion.header
      initial={{ y: -20, opacity: 0 }}
      animate={{ y: 0,   opacity: 1 }}
      transition={{ duration: 0.8, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
      className="fixed top-0 left-0 right-0 z-50 flex justify-center pt-5 px-4"
    >
      <motion.nav
        className="liquid-glass rounded-full flex items-center gap-1 px-3 py-2"
        style={{ maxWidth: 720, width: '100%' }}
      >
        {/* Logo */}
        <div
          className="flex items-center gap-2.5 pr-4 cursor-none"
          onClick={() => navigate('/')}
        >
          <div className="w-6 h-6 rounded-full bg-white/90 flex items-center justify-center">
            <span className="text-black text-[10px] font-bold tracking-tight">N</span>
          </div>
          <span className="text-white/90 text-sm font-medium tracking-wide">NEXUS AI</span>
        </div>

        {/* Divider */}
        <div className="w-px h-4 bg-white/[0.12] mx-1" />

        {/* Center links */}
        <div className="flex-1 flex items-center justify-center gap-1">
          {NAV_LINKS.map(link => (
            <a
              key={link.label}
              href={link.href}
              className="px-3 py-1.5 rounded-full text-white/50 hover:text-white/90 text-[13px] font-medium transition-colors duration-200 cursor-none"
            >
              {link.label}
            </a>
          ))}
        </div>

        {/* Right actions */}
        <div className="flex items-center gap-1 pl-2">
          <button className="px-3 py-1.5 rounded-full text-white/50 hover:text-white/80 text-[13px] font-medium transition-colors cursor-none">
            Sign In
          </button>
          <motion.button
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            onClick={() => navigate('/dashboard')}
            className="liquid-glass px-4 py-1.5 rounded-full text-white text-[13px] font-medium cursor-none"
          >
            Dashboard →
          </motion.button>
        </div>
      </motion.nav>
    </motion.header>
  );
}
