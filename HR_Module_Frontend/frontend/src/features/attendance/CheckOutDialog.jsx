import { useEffect, useState } from "react";
import ConfirmDialog from "../../components/ConfirmDialog";
import { formatElapsed } from "../../utils/attendanceTime";

export default function CheckOutDialog({ busy, error, checkInTime, onCancel, onConfirm }) {
  const [, setTick] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => setTick((t) => t + 1), 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <ConfirmDialog
      title="Check out now?"
      icon="logout"
      confirmLabel="Confirm Check-Out"
      loading={busy}
      onConfirm={onConfirm}
      onCancel={onCancel}
      message={
        <>
          <p className="mb-md">You are about to end your session for today.</p>
          {checkInTime && (
            <div className="bg-surface-container-low border border-outline-variant rounded p-md mb-md">
              <p className="font-label-mono text-label-mono text-on-surface-variant uppercase mb-1">Time so far</p>
              <p className="font-data-mono text-h1 text-on-surface">{formatElapsed(checkInTime)}</p>
            </div>
          )}
          {error && <p className="font-body-sm text-body-sm text-error">{error}</p>}
        </>
      }
    />
  );
}
