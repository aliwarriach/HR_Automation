import { useEffect, useState } from "react";
import { getAttendanceDashboard } from "../services/attendanceAdminService";

export function useAttendanceDashboard(date) {
  const [dashboard, setDashboard] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;

    async function fetchDashboard() {
      setLoading(true);
      const response = await getAttendanceDashboard(date);
      if (cancelled) return;

      if (response.ok) {
        setDashboard(response.data);
        setError(null);
      } else {
        setError(response.data?.detail || "Unable to load attendance dashboard.");
      }
      setLoading(false);
    }

    fetchDashboard();

    return () => {
      cancelled = true;
    };
  }, [date]);

  return { dashboard, loading, error };
}
