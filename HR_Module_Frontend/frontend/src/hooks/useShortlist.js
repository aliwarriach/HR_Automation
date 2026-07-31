import { useCallback, useEffect, useState } from "react";
import { createShortlistEntry, getShortlist } from "../services/shortlistService";

export function useShortlist(resumeId) {
  const [shortlisted, setShortlisted] = useState(false);
  const [checking, setChecking] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState(null);

  useEffect(() => {
    let cancelled = false;

    async function checkShortlist() {
      setChecking(true);
      const response = await getShortlist();
      if (cancelled) return;

      if (response.ok) {
        const entries = Array.isArray(response.data) ? response.data : [];
        setShortlisted(entries.some((entry) => entry.resume_id === Number(resumeId)));
      }
      setChecking(false);
    }

    checkShortlist();

    return () => {
      cancelled = true;
    };
  }, [resumeId]);

  const shortlist = useCallback(async () => {
    setSubmitting(true);
    setMessage(null);
    const response = await createShortlistEntry(Number(resumeId));
    setSubmitting(false);

    if (response.ok) {
      setShortlisted(true);
      return;
    }

    if (response.status === 400) {
      setShortlisted(true);
      setMessage(response.data?.detail || "Resume already shortlisted.");
      return;
    }

    setMessage(response.data?.detail || "Unable to shortlist resume.");
  }, [resumeId]);

  return { shortlisted, checking, submitting, message, shortlist };
}
