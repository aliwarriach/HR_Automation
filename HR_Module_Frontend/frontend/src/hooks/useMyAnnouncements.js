import { useCallback, useEffect, useState } from "react";
import { getMyAnnouncements } from "../services/employeeAnnouncementsService";

export function useMyAnnouncements() {
  const [announcements, setAnnouncements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [reloadIndex, setReloadIndex] = useState(0);

  useEffect(() => {
    let cancelled = false;

    async function fetchList() {
      setLoading(true);
      const response = await getMyAnnouncements();
      if (cancelled) return;

      if (response.ok) {
        setAnnouncements(response.data);
        setError(null);
      } else {
        setError(response.data?.detail || "Unable to load announcements.");
      }
      setLoading(false);
    }

    fetchList();

    return () => {
      cancelled = true;
    };
  }, [reloadIndex]);

  const refetch = useCallback(() => setReloadIndex((i) => i + 1), []);

  return { announcements, loading, error, refetch };
}
