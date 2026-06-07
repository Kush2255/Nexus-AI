import { useApp } from '../../context/AppContext';

export default function BackendStatus() {
  const { backendOnline, systemStatus } = useApp();
  if (backendOnline === null)
    return <div style={{ fontSize: 11, color: '#505050', display:'flex', alignItems:'center', gap:6 }}>
      <div style={{ width:6,height:6,borderRadius:'50%',border:'1px solid #505050' }} />Connecting…
    </div>;
  return (
    <div style={{ fontSize: 11, color: backendOnline ? '#4ade80' : '#f87171', display:'flex', alignItems:'center', gap:6 }}>
      <div style={{ width:6,height:6,borderRadius:'50%',background: backendOnline ? '#4ade80' : '#f87171', animation:'pulse 2s infinite' }} />
      {backendOnline ? (systemStatus?.llm_provider ?? 'Online') : 'Offline'}
    </div>
  );
}
