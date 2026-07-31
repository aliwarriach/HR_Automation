import { useCallback, useEffect, useState } from "react";
import { getShortlistEntry } from "../services/shortlistService";
import { getResume } from "../services/resumesService";
import { scheduleInterview as scheduleInterviewApi } from "../services/interviewService";

export function useShortlistDetail(id) {
  const [entry, setEntry] = useState(null);
  const [resume, setResume] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function fetchDetail() {
      setLoading(true);
      setNotFound(false);
      setError(null);

      const shortlistRes = await getShortlistEntry(id);
      if (cancelled) return;

      if (shortlistRes.status === 404) {
        setNotFound(true);
        setLoading(false);
        return;
      }

      if (!shortlistRes.ok) {
        setError(shortlistRes.data?.detail || "Unable to load candidate.");
        setLoading(false);
        return;
      }

      setEntry(shortlistRes.data);

      const resumeRes = await getResume(shortlistRes.data.resume_id);
      if (cancelled) return;

      if (resumeRes.ok) {
        setResume(resumeRes.data);
      }
      setLoading(false);
    }

    fetchDetail();

    return () => {
      cancelled = true;
    };
  }, [id]);

  const scheduleInterview = useCallback(
    async (payload) => {
      const response = await scheduleInterviewApi(id, payload);
      if (response.ok) {
        setEntry(response.data);
      }
      return response;
    },
    [id]
  );

  return { entry, resume, loading, error, notFound, scheduleInterview };
}
