import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import api from '../services/api';

interface Settings {
  streamingEnabled:    boolean;
  maxReflectionLoops:  number;
  showAgentLogs:       boolean;
  theme:               string;
}

interface AppContextValue {
  systemStatus:   any;
  settings:       Settings;
  updateSetting:  (k: string, v: any) => void;
  backendOnline:  boolean | null;
  checkBackend:   () => void;
}

const AppContext = createContext<AppContextValue | null>(null);

const DEFAULT_SETTINGS: Settings = {
  streamingEnabled:   true,
  maxReflectionLoops: 3,
  showAgentLogs:      true,
  theme:              'dark',
};

export function AppProvider({ children }: { children: ReactNode }) {
  const [systemStatus, setSystemStatus] = useState<any>(null);
  const [backendOnline, setOnline]      = useState<boolean | null>(null);
  const [settings, setSettings]         = useState<Settings>(DEFAULT_SETTINGS);

  const checkBackend = async () => {
    try {
      const res = await api.get('/status', { timeout: 5000 });
      setSystemStatus(res.data);
      setOnline(true);
    } catch {
      setOnline(false);
    }
  };

  useEffect(() => {
    checkBackend();
    const t = setInterval(checkBackend, 30_000);
    return () => clearInterval(t);
  }, []);

  const updateSetting = (k: string, v: any) =>
    setSettings(p => ({ ...p, [k]: v }));

  return (
    <AppContext.Provider value={{ systemStatus, settings, updateSetting, backendOnline, checkBackend }}>
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used within AppProvider');
  return ctx;
}
