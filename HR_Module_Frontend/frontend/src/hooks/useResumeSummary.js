import { useCallback, useEffect, useState } from "react";
import { getResumeDetail } from "../services/resumesService";

export function useResumeSummary(id) {
  const [summary, setSummary] = useState(null);
  const [status, setStatus] = useState("loading");
  const [retryToken, setRetryToken] = useState(0);

  useEffect(() => {
    let cancelled = false;

    async function fetchSummary() {
      setStatus("loading");
      const response = await getResumeDetail(id);
      if (cancelled) return;

      if (response.ok) {
        setSummary(response.data);
        setStatus("success");
      } else if (response.status === 404) {
        setStatus("not_found");
      } else {
        setStatus("error");
      }
    }

    fetchSummary();

    return () => {
      cancelled = true;
    };
  }, [id, retryToken]);

  const retry = useCallback(() => setRetryToken((token) => token + 1), []);

  return { summary, status, retry };
}
