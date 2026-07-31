import { useCallback, useEffect, useState } from "react";
import { getAnnouncement } from "../services/announcementsService";

export function useAnnouncementDetail(id) {
  const [announcement, setAnnouncement] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [notFound, setNotFound] = useState(false);
  const [reloadIndex, setReloadIndex] = useState(0);

  useEffect(() => {
    let cancelled = false;

    async function fetchDetail() {
      if (!id) {
        setLoading(false);
        return;
      }

      setLoading(true);
      setNotFound(false);

      const response = await getAnnouncement(id);
      if (cancelled) return;

      if (response.status === 404) {
        setNotFound(true);
        setLoading(false);
        return;
      }

      if (!response.ok) {
        setError(response.data?.detail || "Unable to load announcement.");
        setLoading(false);
        return;
      }

      setAnnouncement(response.data);
      setError(null);
      setLoading(false);
    }

    fetchDetail();

    return () => {
      cancelled = true;
    };
  }, [id, reloadIndex]);

  const refetch = useCallback(() => setReloadIndex((i) => i + 1), []);

  return { announcement, loading, error, notFound, refetch };
}
