import { useCallback, useEffect, useState } from "react";
import { getEmployee } from "../services/employeesService";

export function useEmployeeDetail(id) {
  const [employee, setEmployee] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [notFound, setNotFound] = useState(false);
  const [reloadIndex, setReloadIndex] = useState(0);

  useEffect(() => {
    let cancelled = false;

    async function fetchDetail() {
      setLoading(true);
      setNotFound(false);
      setError(null);
      setEmployee(null);

      const response = await getEmployee(id);
      if (cancelled) return;

      if (response.status === 404) {
        setNotFound(true);
        setLoading(false);
        return;
      }

      if (!response.ok) {
        setError(response.data?.detail || "Unable to load employee.");
        setLoading(false);
        return;
      }

      setEmployee(response.data);
      setLoading(false);
    }

    fetchDetail();

    return () => {
      cancelled = true;
    };
  }, [id, reloadIndex]);

  const refetch = useCallback(() => setReloadIndex((i) => i + 1), []);

  return { employee, loading, error, notFound, refetch };
}
