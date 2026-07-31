import { useCallback, useEffect, useState } from "react";
import { getAttendanceHistory } from "../services/attendanceService";

export function useAttendanceHistory() {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [reloadIndex, setReloadIndex] = useState(0);

  useEffect(() => {
    let cancelled = false;

    async function fetchHistory() {
      setLoading(true);
      const response = await getAttendanceHistory();
      if (cancelled) return;

      if (response.ok) {
        setHistory(response.data);
        setError(null);
      } else {
        setError(response.data?.detail || "Unable to load attendance history.");
      }
      setLoading(false);
    }

    fetchHistory();

    return () => {
      cancelled = true;
    };
  }, [reloadIndex]);

  const refetch = useCallback(() => setReloadIndex((i) => i + 1), []);

  return { history, loading, error, refetch };
}
