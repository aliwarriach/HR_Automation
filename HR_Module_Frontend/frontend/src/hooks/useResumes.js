import { useCallback, useEffect, useState } from "react";
import { getResumes, refreshResumes } from "../services/resumesService";

export function useResumes() {
  const [resumes, setResumes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [reloadIndex, setReloadIndex] = useState(0);

  useEffect(() => {
    let cancelled = false;

    async function fetchResumes() {
      setLoading(true);
      const response = await getResumes();
      if (cancelled) return;

      if (response.ok) {
        setResumes(response.data);
        setError(null);
      } else {
        setError(response.data?.detail || "Unable to load resumes.");
      }
      setLoading(false);
    }

    fetchResumes();

    return () => {
      cancelled = true;
    };
  }, [reloadIndex]);

  const refetch = useCallback(() => setReloadIndex((i) => i + 1), []);

  const refresh = useCallback(async () => {
    setRefreshing(true);
    const response = await refreshResumes();

    if (response.ok) {
      setResumes((prev) => [...response.data, ...prev]);
      setError(null);
    } else {
      setError(response.data?.detail || "Unable to refresh resumes.");
    }
    setRefreshing(false);
  }, []);

  return { resumes, loading, refreshing, error, refetch, refresh };
}
