import { useEffect, useState } from "react";
import { getResume } from "../services/resumesService";

export function useResume(id) {
  const [resume, setResume] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function fetchResume() {
      setLoading(true);
      const response = await getResume(id);
      if (cancelled) return;

      if (response.ok) {
        setResume(response.data);
        setError(null);
        setNotFound(false);
      } else if (response.status === 404) {
        setNotFound(true);
      } else {
        setError(response.data?.detail || "Unable to load resume.");
      }
      setLoading(false);
    }

    fetchResume();

    return () => {
      cancelled = true;
    };
  }, [id]);

  return { resume, loading, error, notFound };
}
