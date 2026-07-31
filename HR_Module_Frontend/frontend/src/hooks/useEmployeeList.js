import { useCallback, useEffect, useState } from "react";
import { deleteEmployee, getEmployees } from "../services/employeesService";

export function useEmployeeList() {
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [reloadIndex, setReloadIndex] = useState(0);

  useEffect(() => {
    let cancelled = false;

    async function fetchEmployees() {
      setLoading(true);
      const response = await getEmployees();
      if (cancelled) return;

      if (response.ok) {
        setEmployees(response.data);
        setError(null);
      } else {
        setError(response.data?.detail || "Unable to load employees.");
      }
      setLoading(false);
    }

    fetchEmployees();

    return () => {
      cancelled = true;
    };
  }, [reloadIndex]);

  const refetch = useCallback(() => setReloadIndex((i) => i + 1), []);

  const removeEmployee = useCallback(async (id) => {
    const response = await deleteEmployee(id);
    if (response.ok) {
      setEmployees((prev) => prev.filter((employee) => employee.id !== id));
    }
    return response;
  }, []);

  return { employees, loading, error, refetch, removeEmployee };
}
