import { useState, useEffect } from 'react';
import { analyticsAPI } from '../services/api';

export function useAnalytics() {
  const [overview, setOverview] = useState<any>(null);
  const [activity, setActivity] = useState<any>(null);
  const [loading,  setLoading]  = useState(true);

  useEffect(() => {
    Promise.allSettled([analyticsAPI.getOverview(), analyticsAPI.getActivity()])
      .then(([ov, act]) => {
        if (ov.status  === 'fulfilled') setOverview(ov.value.data);
        if (act.status === 'fulfilled') setActivity(act.value.data);
      })
      .finally(() => setLoading(false));
  }, []);

  return { overview, activity, loading };
}
