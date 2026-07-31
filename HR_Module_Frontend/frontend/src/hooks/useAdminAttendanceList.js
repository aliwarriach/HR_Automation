import { useEffect, useState } from "react";
import { getAdminAttendanceList } from "../services/attendanceAdminService";

export function useAdminAttendanceList(date, status, department, search) {
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;

    async function fetchList() {
      setLoading(true);
      const response = await getAdminAttendanceList({
        ...(date ? { date } : {}),
        ...(status ? { status } : {}),
        ...(department ? { department } : {}),
        ...(search ? { search } : {}),
      });
      if (cancelled) return;

      if (response.ok) {
        setEmployees(response.data);
        setError(null);
      } else {
        setError(response.data?.detail || "Unable to load attendance list.");
      }
      setLoading(false);
    }

    fetchList();

    return () => {
      cancelled = true;
    };
  }, [date, status, department, search]);

  return { employees, loading, error };
}
