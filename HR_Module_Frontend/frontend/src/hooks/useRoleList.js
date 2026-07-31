import { useCallback, useEffect, useState } from "react";
import { deleteRole, getRoles } from "../services/rolesService";

export function useRoleList() {
  const [roles, setRoles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [reloadIndex, setReloadIndex] = useState(0);

  useEffect(() => {
    let cancelled = false;

    async function fetchRoles() {
      setLoading(true);
      const response = await getRoles();
      if (cancelled) return;

      if (response.ok) {
        setRoles(response.data);
        setError(null);
      } else {
        setError(response.data?.detail || "Unable to load roles.");
      }
      setLoading(false);
    }

    fetchRoles();

    return () => {
      cancelled = true;
    };
  }, [reloadIndex]);

  const refetch = useCallback(() => setReloadIndex((i) => i + 1), []);

  const removeRole = useCallback(async (id) => {
    const response = await deleteRole(id);
    if (response.ok) {
      setRoles((prev) => prev.filter((role) => role.id !== id));
    }
    return response;
  }, []);

  return { roles, loading, error, refetch, removeRole };
}
