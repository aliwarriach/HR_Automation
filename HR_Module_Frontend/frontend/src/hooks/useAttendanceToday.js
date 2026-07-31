import { useCallback, useEffect, useState } from "react";
import {
  getTodayAttendance,
  checkIn as checkInApi,
  checkOut as checkOutApi,
  startBreak as startBreakApi,
  endBreak as endBreakApi,
  markLeave as markLeaveApi,
} from "../services/attendanceService";

export function useAttendanceToday() {
  const [today, setToday] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [reloadIndex, setReloadIndex] = useState(0);

  useEffect(() => {
    let cancelled = false;

    async function fetchToday() {
      setLoading(true);
      const response = await getTodayAttendance();
      if (cancelled) return;

      if (response.ok) {
        setToday(response.data);
        setError(null);
      } else {
        setError(response.data?.detail || "Unable to load attendance.");
      }
      setLoading(false);
    }

    fetchToday();

    return () => {
      cancelled = true;
    };
  }, [reloadIndex]);

  const refetch = useCallback(() => setReloadIndex((i) => i + 1), []);

  // The server is the single source of truth for `status` — every mutation re-fetches
  // /today instead of trusting the mutation's own response body.
  const runAction = useCallback(async (apiCall) => {
    const response = await apiCall();
    if (response.ok) {
      setReloadIndex((i) => i + 1);
    }
    return response;
  }, []);

  const checkIn = useCallback((workMode) => runAction(() => checkInApi({ work_mode: workMode })), [runAction]);
  const checkOut = useCallback(() => runAction(checkOutApi), [runAction]);
  const startBreak = useCallback(
    (breakType) => runAction(() => startBreakApi({ break_type: breakType })),
    [runAction]
  );
  const endBreak = useCallback(() => runAction(endBreakApi), [runAction]);
  const markLeave = useCallback(() => runAction(markLeaveApi), [runAction]);

  return { today, loading, error, refetch, checkIn, checkOut, startBreak, endBreak, markLeave };
}
