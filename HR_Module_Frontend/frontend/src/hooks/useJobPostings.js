import { useCallback, useEffect, useState } from "react";
import { getJobPostings } from "../services/jobPostingsService";

export function useJobPostings() {
  const [jobPostings, setJobPostings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [reloadIndex, setReloadIndex] = useState(0);

  useEffect(() => {
    let cancelled = false;

    async function fetchJobPostings() {
      setLoading(true);
      const response = await getJobPostings();
      if (cancelled) return;

      if (response.ok) {
        setJobPostings(response.data);
        setError(null);
      } else {
        setError(response.data?.detail || "Unable to load job postings.");
      }
      setLoading(false);
    }

    fetchJobPostings();

    return () => {
      cancelled = true;
    };
  }, [reloadIndex]);

  const refetch = useCallback(() => setReloadIndex((i) => i + 1), []);

  return { jobPostings, loading, error, refetch };
}
