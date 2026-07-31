import { useEffect, useState } from "react";
import { getEmployeeAttendanceDetail } from "../services/attendanceAdminService";

export function useEmployeeAttendanceDetail(employeeId, year, month) {
  const [detail, setDetail] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function fetchDetail() {
      setLoading(true);
      setNotFound(false);
      setDetail(null);

      const response = await getEmployeeAttendanceDetail(employeeId, { year, month });
      if (cancelled) return;

      if (response.status === 404) {
        setNotFound(true);
        setLoading(false);
        return;
      }

      if (!response.ok) {
        setError(response.data?.detail || "Unable to load employee attendance.");
        setLoading(false);
        return;
      }

      setDetail(response.data);
      setError(null);
      setLoading(false);
    }

    fetchDetail();

    return () => {
      cancelled = true;
    };
  }, [employeeId, year, month]);

  return { detail, loading, error, notFound };
}
