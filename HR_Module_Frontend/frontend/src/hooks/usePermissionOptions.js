import { useEffect, useState } from "react";
import { getPermissionOptions } from "../services/rolesService";

// { [moduleName]: allowedActions[] } — the live taxonomy the Role Create/Edit
// permissions builder is strictly locked to.
export function usePermissionOptions() {
  const [options, setOptions] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;

    async function fetchOptions() {
      setLoading(true);
      const response = await getPermissionOptions();
      if (cancelled) return;

      if (response.ok) {
        setOptions(response.data);
        setError(null);
      } else {
        setError(response.data?.detail || "Unable to load permission options.");
      }
      setLoading(false);
    }

    fetchOptions();

    return () => {
      cancelled = true;
    };
  }, []);

  return { options, loading, error };
}
