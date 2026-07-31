import { useCallback, useEffect, useState } from "react";
import {
  deleteShortlistEntry as deleteShortlistEntryApi,
  getShortlist,
  updateShortlistStatus as updateShortlistStatusApi,
} from "../services/shortlistService";
import { getResumes } from "../services/resumesService";

export function useShortlistList() {
  const [entries, setEntries] = useState([]);
  const [resumesById, setResumesById] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [reloadIndex, setReloadIndex] = useState(0);

  useEffect(() => {
    let cancelled = false;

    async function fetchData() {
      setLoading(true);
      const [shortlistRes, resumesRes] = await Promise.all([getShortlist(), getResumes()]);
      if (cancelled) return;

      if (shortlistRes.ok && resumesRes.ok) {
        setEntries(shortlistRes.data);
        setResumesById(Object.fromEntries(resumesRes.data.map((resume) => [resume.id, resume])));
        setError(null);
      } else {
        setError(
          shortlistRes.data?.detail || resumesRes.data?.detail || "Unable to load shortlisted candidates."
        );
      }
      setLoading(false);
    }

    fetchData();

    return () => {
      cancelled = true;
    };
  }, [reloadIndex]);

  const refetch = useCallback(() => setReloadIndex((i) => i + 1), []);

  const updateStatus = useCallback(async (id, status) => {
    const response = await updateShortlistStatusApi(id, status);
    if (response.ok) {
      setEntries((prev) => prev.map((entry) => (entry.id === id ? response.data : entry)));
    }
    return response;
  }, []);

  const removeEntry = useCallback(async (id) => {
    const response = await deleteShortlistEntryApi(id);
    if (response.ok) {
      setEntries((prev) => prev.filter((entry) => entry.id !== id));
    }
    return response;
  }, []);

  const rows = entries.map((entry) => {
    const resume = resumesById[entry.resume_id];
    return {
      ...entry,
      email: resume?.sender_email ?? null,
      ats_score: resume?.ats_score ?? null,
      ats_status: resume?.ats_status ?? null,
    };
  });

  return { rows, loading, error, refetch, updateStatus, removeEntry };
}
