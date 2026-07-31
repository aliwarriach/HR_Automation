import { useCallback, useEffect, useState } from "react";
import { getWorkingHours, updateWorkingHours } from "../services/attendanceAdminService";

export function useWorkingHours() {
  const [config, setConfig] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;

    async function fetchConfig() {
      setLoading(true);
      const response = await getWorkingHours();
      if (cancelled) return;

      if (response.ok) {
        setConfig(response.data);
        setError(null);
      } else {
        setError(response.data?.detail || "Unable to load working hours.");
      }
      setLoading(false);
    }

    fetchConfig();

    return () => {
      cancelled = true;
    };
  }, []);

  const save = useCallback(async (payload) => {
    const response = await updateWorkingHours(payload);
    if (response.ok) {
      setConfig(response.data);
    }
    return response;
  }, []);

  return { config, loading, error, save };
}
