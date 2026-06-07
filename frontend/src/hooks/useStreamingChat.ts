import { useState, useRef, useCallback } from 'react';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000/api';

export function useStreamingChat() {
  const [streaming,    setStreaming]    = useState(false);
  const [streamedText, setStreamedText] = useState('');
  const [agentEvents,  setAgentEvents]  = useState<any[]>([]);
  const [error,        setError]        = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const sendStreamMessage = useCallback(async (
    message: string,
    sessionId: string,
    onComplete: (data: any) => void
  ) => {
    setStreaming(true);
    setStreamedText('');
    setAgentEvents([]);
    setError(null);

    const ctrl = new AbortController();
    abortRef.current = ctrl;

    try {
      const res = await fetch(`${API_BASE}/stream/stream`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ message, session_id: sessionId }),
        signal:  ctrl.signal,
      });

      if (!res.ok) throw new Error(`HTTP ${res.status}`);

      const reader  = res.body!.getReader();
      const decoder = new TextDecoder();
      let   buffer  = '';
      let   full    = '';
      let   finalData: any = null;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;
          const raw = line.slice(6).trim();
          if (raw === '[DONE]') break;

          try {
            const ev = JSON.parse(raw);
            switch (ev.type) {
              case 'token':
                full += ev.token || '';
                setStreamedText(full);
                break;
              case 'agent_start':
              case 'agent_complete':
              case 'agent_active':
              case 'agent_log':
                setAgentEvents(p => [...p, ev]);
                break;
              case 'complete':
                finalData = ev;
                break;
              case 'error':
                setError(ev.message);
                break;
            }
          } catch {}
        }
      }

      if (finalData) {
        onComplete({
          response:    full,
          session_id:  finalData.session_id || sessionId,
          message_id:  finalData.message_id,
          agent_data: {
            quality_score:      finalData.quality_score    || 0,
            reflection_count:   finalData.reflection_count || 0,
            retrieved_chunks:   finalData.retrieved_chunks || 0,
            agent_logs:         finalData.agent_logs       || [],
            hallucination_risk: finalData.hallucination_risk || 'unknown',
            report:             finalData.report,
          },
        });
      }
    } catch (e: any) {
      if (e.name !== 'AbortError') setError(e.message);
    } finally {
      setStreaming(false);
    }
  }, []);

  const abort = useCallback(() => {
    abortRef.current?.abort();
    setStreaming(false);
  }, []);

  return { streaming, streamedText, agentEvents, error, sendStreamMessage, abort };
}
