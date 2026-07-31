import { useCallback, useEffect, useState } from "react";
import { getRole } from "../services/rolesService";

export function useRoleDetail(id) {
  const [role, setRole] = useState(null);
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

      const response = await getRole(id);
      if (cancelled) return;

      if (response.status === 404) {
        setNotFound(true);
        setLoading(false);
        return;
      }

      if (!response.ok) {
        setError(response.data?.detail || "Unable to load role.");
        setLoading(false);
        return;
      }

      setRole(response.data);
      setError(null);
      setLoading(false);
    }

    fetchDetail();

    return () => {
      cancelled = true;
    };
  }, [id, reloadIndex]);

  const refetch = useCallback(() => setReloadIndex((i) => i + 1), []);

  return { role, loading, error, notFound, refetch };
}
