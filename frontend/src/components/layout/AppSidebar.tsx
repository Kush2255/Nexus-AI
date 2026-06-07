import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { NavLink, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, MessageSquare, FileText,
  BarChart2, Settings, ChevronLeft, Home, FileOutput, Cpu
} from 'lucide-react';
import BackendStatus from '../ui/BackendStatus';

const NAV = [
  { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard'  },
  { to: '/chat',      icon: MessageSquare,   label: 'Research'   },
  { to: '/documents', icon: FileText,        label: 'Documents'  },
  { to: '/reports',   icon: FileOutput,      label: 'Reports'    },
  { to: '/analytics', icon: BarChart2,       label: 'Analytics'  },
  { to: '/settings',  icon: Settings,        label: 'Settings'   },
];

export default function AppSidebar({ collapsed, onToggle }: { collapsed: boolean; onToggle: () => void }) {
  const navigate = useNavigate();
  return (
    <motion.aside
      animate={{ width: collapsed ? 60 : 220 }}
      transition={{ type: 'spring', stiffness: 300, damping: 30 }}
      className="h-screen sidebar flex flex-col flex-shrink-0 overflow-hidden z-20"
    >
      {/* Logo */}
      <div className="flex items-center gap-3 px-4 py-5" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
        <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
          style={{ background: '#f0f0f0' }}>
          <Cpu size={15} style={{ color: '#0d0d0d' }} />
        </div>
        <AnimatePresence>
          {!collapsed && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <div style={{ fontFamily: 'var(--font-display)', fontSize: 15, color: '#f0f0f0', fontWeight: 400 }}>
                NEXUS AI
              </div>
              <div style={{ fontSize: 10, color: '#505050', marginTop: 1 }}>Research Assistant</div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Nav */}
      <nav className="flex-1 py-3 px-2 space-y-0.5" style={{ overflowY: 'auto' }}>
        {!collapsed && (
          <div className="section-label px-3 mb-2 py-1">Navigation</div>
        )}
        {NAV.map(({ to, icon: Icon, label }) => (
          <NavLink key={to} to={to}>
            {({ isActive }) => (
              <div className={`nav-item ${isActive ? 'active' : ''} relative group`}>
                <Icon size={16} style={{ flexShrink: 0, color: isActive ? '#f0f0f0' : '#606060' }} />
                <AnimatePresence>
                  {!collapsed && (
                    <motion.span initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                      style={{ fontSize: 13, color: isActive ? '#f0f0f0' : '#909090' }}>
                      {label}
                    </motion.span>
                  )}
                </AnimatePresence>
                {collapsed && (
                  <div style={{
                    position: 'absolute', left: '100%', marginLeft: 10, top: '50%', transform: 'translateY(-50%)',
                    background: '#1e1e1e', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 8,
                    padding: '5px 10px', fontSize: 12, color: '#f0f0f0', whiteSpace: 'nowrap',
                    opacity: 0, pointerEvents: 'none', zIndex: 50,
                  }} className="group-hover:opacity-100 transition-opacity">
                    {label}
                  </div>
                )}
              </div>
            )}
          </NavLink>
        ))}
      </nav>

      {/* Bottom */}
      <div className="p-2" style={{ borderTop: '1px solid rgba(255,255,255,0.06)', }}>
        {!collapsed && (
          <div className="px-3 py-2"><BackendStatus /></div>
        )}
        <button onClick={() => navigate('/')} className="nav-item w-full" style={{ marginBottom: 2 }}>
          <Home size={15} style={{ flexShrink: 0, color: '#505050' }} />
          {!collapsed && <span style={{ fontSize: 12, color: '#606060' }}>Home</span>}
        </button>
        <button onClick={onToggle} className="w-full flex items-center justify-center py-2 rounded-lg"
          style={{ color: '#404040' }}
          onMouseEnter={e => (e.currentTarget.style.background = '#1a1a1a')}
          onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
          <motion.div animate={{ rotate: collapsed ? 180 : 0 }} transition={{ duration: 0.2 }}>
            <ChevronLeft size={14} />
          </motion.div>
        </button>
      </div>
    </motion.aside>
  );
}
