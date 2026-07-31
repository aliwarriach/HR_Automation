import { useCallback, useEffect, useState } from "react";
import { getAnnouncements } from "../services/announcementsService";

export function useAnnouncementList(status, search) {
  const [announcements, setAnnouncements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [reloadIndex, setReloadIndex] = useState(0);

  useEffect(() => {
    let cancelled = false;

    async function fetchList() {
      setLoading(true);
      const response = await getAnnouncements({
        ...(status ? { status } : {}),
        ...(search ? { search } : {}),
      });
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
  }, [status, search, reloadIndex]);

  const refetch = useCallback(() => setReloadIndex((i) => i + 1), []);

  return { announcements, loading, error, refetch };
}
