import { useState, ReactNode } from 'react';
import AppSidebar from './AppSidebar';

export default function AppLayout({ children }: { children: ReactNode }) {
  const [collapsed, setCollapsed] = useState(false);
  return (
    <div className="flex h-screen overflow-hidden" style={{ background: '#0d0d0d' }}>
      <AppSidebar collapsed={collapsed} onToggle={() => setCollapsed(p => !p)} />
      <main className="flex-1 overflow-hidden">{children}</main>
    </div>
  );
}
