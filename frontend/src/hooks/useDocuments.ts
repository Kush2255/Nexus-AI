import { useState, useEffect, useCallback } from 'react';
import { documentsAPI } from '../services/api';

export function useDocuments() {
  const [documents,       setDocuments]       = useState<any[]>([]);
  const [loading,         setLoading]         = useState(true);
  const [uploading,       setUploading]       = useState(false);
  const [uploadProgress,  setUploadProgress]  = useState(0);
  const [error,           setError]           = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await documentsAPI.list();
      setDocuments(res.data);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const upload = useCallback(async (file: File) => {
    setUploading(true);
    setUploadProgress(5);
    try {
      const res = await documentsAPI.upload(file, (e: any) => {
        setUploadProgress(Math.round((e.loaded / e.total) * 90));
      });
      setUploadProgress(100);
      await load();
      return res.data;
    } catch (e: any) {
      setError(e.response?.data?.detail || e.message);
      throw e;
    } finally {
      setUploading(false);
      setUploadProgress(0);
    }
  }, [load]);

  const remove = useCallback(async (id: string) => {
    await documentsAPI.delete(id);
    setDocuments(p => p.filter(d => d.id !== id));
  }, []);

  return { documents, loading, uploading, uploadProgress, error, upload, remove, refresh: load };
}
