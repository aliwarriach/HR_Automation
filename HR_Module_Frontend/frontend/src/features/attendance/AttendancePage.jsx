import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { AnimatePresence } from "framer-motion";
import Layout from "../../components/Layout";
import Button from "../../components/Button";
import Badge from "../../components/Badge";
import Icon from "../../components/Icon";
import Toast from "../../components/Toast";
import CheckInModal from "./CheckInModal";
import StartBreakModal from "./StartBreakModal";
import CheckOutDialog from "./CheckOutDialog";
import MarkLeaveDialog from "./MarkLeaveDialog";
import { useAttendanceToday } from "../../hooks/useAttendanceToday";
import { useAuthStore } from "../../store/authStore";
import { ROUTES } from "../../constants/routes";
import { MODULES, ACTIONS } from "../../constants/permissions";
import { hasPermission } from "../../utils/permissions";
import {
  ATTENDANCE_STATUS_LABEL,
  ATTENDANCE_STATUS_VARIANT,
  getWorkModeLabel,
  getBreakTypeLabel,
  getBreakTypeIcon,
} from "../../constants/attendance";
import { formatClockTime, formatElapsed, formatHoursShort, getPendingLabel } from "../../utils/attendanceTime";

export default function AttendancePage() {
  const { today, loading, error, checkIn, checkOut, startBreak, endBreak, markLeave } = useAttendanceToday();
  const navigate = useNavigate();
  const permissions = useAuthStore((s) => s.permissions);
  const canCheckIn =
    hasPermission(permissions, MODULES.ATTENDANCE, ACTIONS.CHECK_IN_ONSITE) ||
    hasPermission(permissions, MODULES.ATTENDANCE, ACTIONS.CHECK_IN_WFH);
  const canMarkLeave = hasPermission(permissions, MODULES.ATTENDANCE, ACTIONS.MARK_LEAVE);
  const canStartBreak = hasPermission(permissions, MODULES.ATTENDANCE, ACTIONS.START_BREAK);
  const canCheckOut = hasPermission(permissions, MODULES.ATTENDANCE, ACTIONS.CHECK_OUT);
  const canEndBreak = hasPermission(permissions, MODULES.ATTENDANCE, ACTIONS.END_BREAK);

  const [checkInOpen, setCheckInOpen] = useState(false);
  const [startBreakOpen, setStartBreakOpen] = useState(false);
  const [checkOutOpen, setCheckOutOpen] = useState(false);
  const [leaveOpen, setLeaveOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState(null);
  const [toast, setToast] = useState(null);
  const [, setTick] = useState(0);

  const status = today?.status ?? "not_checked_in";

  useEffect(() => {
    if (status !== "checked_in" && status !== "on_break") return;
    const interval = setInterval(() => setTick((t) => t + 1), 1000);
    return () => clearInterval(interval);
  }, [status]);

  const runAndClose = async (action, args, closeModal, successMessage) => {
    setBusy(true);
    setActionError(null);
    const response = args !== undefined ? await action(args) : await action();
    setBusy(false);

    if (response.ok) {
      closeModal();
      setToast({ message: successMessage, variant: "success" });
    } else {
      setActionError(response.data?.detail || "Something went wrong.");
    }
  };

  const handleCheckIn = (workMode) => runAndClose(checkIn, workMode, () => setCheckInOpen(false), "Checked in.");
  const handleCheckOut = () => runAndClose(checkOut, undefined, () => setCheckOutOpen(false), "Checked out.");
  const handleStartBreak = (breakType) =>
    runAndClose(startBreak, breakType, () => setStartBreakOpen(false), "Break started.");
  const handleMarkLeave = () => runAndClose(markLeave, undefined, () => setLeaveOpen(false), "Marked as leave.");

  const handleEndBreak = async () => {
    setBusy(true);
    const response = await endBreak();
    setBusy(false);
    if (response.ok) {
      setToast({ message: "Break ended.", variant: "success" });
    } else {
      setToast({ message: response.data?.detail || "Unable to end break.", variant: "danger" });
    }
  };

  const pendingLabel = getPendingLabel(today?.total_working_hours, today?.pending_hours);

  return (
    <Layout title="Attendance">
      {loading ? (
        <p className="text-on-surface-variant">Loading attendance…</p>
      ) : error ? (
        <p className="text-error">{error}</p>
      ) : (
        <div className="flex flex-col gap-lg">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-md">
            <div>
              <p className="font-label-mono text-label-mono text-on-surface-variant uppercase mb-1">
                {new Date().toLocaleDateString("en-US", {
                  weekday: "long",
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                })}
              </p>
              <div className="flex items-center gap-md">
                <h1 className="font-h1 text-h1 text-on-surface">Daily Overview</h1>
                <Badge variant={ATTENDANCE_STATUS_VARIANT[status]}>{ATTENDANCE_STATUS_LABEL[status]}</Badge>
              </div>
            </div>

            <div className="flex items-center gap-sm">
              {status === "not_checked_in" && (
                <>
                  {canCheckIn && (
                    <Button icon="login" onClick={() => setCheckInOpen(true)}>
                      Check In
                    </Button>
                  )}
                  {canMarkLeave && (
                    <Button variant="secondary" icon="event_busy" onClick={() => setLeaveOpen(true)}>
                      Mark Leave
                    </Button>
                  )}
                </>
              )}
              {status === "checked_in" && (
                <>
                  {canStartBreak && (
                    <Button icon="pause" onClick={() => setStartBreakOpen(true)}>
                      Start Break
                    </Button>
                  )}
                  {canCheckOut && (
                    <Button variant="secondary" icon="logout" onClick={() => setCheckOutOpen(true)}>
                      Check Out
                    </Button>
                  )}
                </>
              )}
              {status === "on_break" && canEndBreak && (
                <Button icon="play_arrow" loading={busy} loadingText="Ending…" onClick={handleEndBreak}>
                  End Break
                </Button>
              )}
              <Button variant="ghost" icon="history" onClick={() => navigate(ROUTES.ATTENDANCE_HISTORY)}>
                History
              </Button>
            </div>
          </div>

          {status === "on_break" && today.active_break && (
            <div className="bg-surface border border-outline-variant rounded-xl p-xl relative overflow-hidden">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-xl">
                <div className="flex items-start gap-lg">
                  <div className="w-16 h-16 rounded-xl bg-primary-container flex items-center justify-center shrink-0">
                    <Icon
                      name={getBreakTypeIcon(today.active_break.break_type)}
                      className="text-[32px] text-on-primary-container"
                    />
                  </div>
                  <div>
                    <h3 className="font-h2 text-h2 text-on-surface mb-1">
                      {getBreakTypeLabel(today.active_break.break_type)} Break
                    </h3>
                    <p className="text-body-sm text-on-surface-variant">
                      Started at {formatClockTime(today.active_break.start_time)}
                    </p>
                    <div className="mt-lg">
                      <p className="font-label-mono text-label-mono text-on-surface-variant uppercase mb-1">
                        Elapsed Time
                      </p>
                      <div className="font-data-mono text-[40px] leading-none font-bold text-primary">
                        {formatElapsed(today.active_break.start_time)}
                      </div>
                    </div>
                  </div>
                </div>
                <div className="relative group min-w-[160px]">
                  <Button variant="secondary" icon="logout" disabled className="w-full">
                    Check Out
                  </Button>
                  <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-xs px-md py-xs bg-inverse-surface text-inverse-on-surface text-[10px] font-bold rounded whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                    End your break first
                  </div>
                </div>
              </div>
            </div>
          )}

          {(status === "checked_in" || status === "on_break") && (
            <div className="bg-surface border border-outline-variant rounded-xl p-lg">
              <h3 className="font-label-mono text-label-mono text-on-surface-variant uppercase tracking-widest mb-lg">
                Session Information
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-xl">
                <SessionStat icon="home_work" label="Work Mode" value={getWorkModeLabel(today.work_mode)} />
                <SessionStat icon="login" label="Check-in" value={formatClockTime(today.check_in_time)} mono />
                <SessionStat icon="timer" label="Time Elapsed" value={formatElapsed(today.check_in_time)} mono />
              </div>
            </div>
          )}

          {status === "checked_out" && (
            <div className="bg-surface border border-outline-variant rounded-xl p-lg">
              <h3 className="font-label-mono text-label-mono text-on-surface-variant uppercase tracking-widest mb-lg">
                Session Summary
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-xl">
                <SessionStat icon="home_work" label="Work Mode" value={getWorkModeLabel(today.work_mode)} />
                <SessionStat icon="login" label="Check-in" value={formatClockTime(today.check_in_time)} mono />
                <SessionStat icon="logout" label="Check-out" value={formatClockTime(today.check_out_time)} mono />
              </div>
              <div className="mt-xl pt-lg border-t border-outline-variant flex flex-wrap items-center gap-xl">
                <div>
                  <p className="text-[10px] font-label-mono text-on-surface-variant uppercase mb-1">Total Hours</p>
                  <p className="font-data-mono text-[24px] text-on-surface">
                    {formatHoursShort(today.total_working_hours)}
                  </p>
                </div>
                {pendingLabel && (
                  <div>
                    <p className="text-[10px] font-label-mono text-on-surface-variant uppercase mb-1">Status</p>
                    <p className="font-body-md font-semibold text-primary">{pendingLabel}</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {status === "on_leave" && (
            <div className="bg-surface border border-outline-variant rounded-xl p-xl flex items-center gap-lg">
              <div className="w-14 h-14 rounded-full bg-primary-container flex items-center justify-center shrink-0">
                <Icon name="event_busy" className="text-[28px] text-on-primary-container" />
              </div>
              <div>
                <h3 className="font-h2 text-h2 text-on-surface mb-1">You&apos;re on leave today</h3>
                <p className="text-body-sm text-on-surface-variant">No check-in actions are available for today.</p>
              </div>
            </div>
          )}
        </div>
      )}

      <AnimatePresence>
        {checkInOpen && (
          <CheckInModal
            busy={busy}
            error={actionError}
            onClose={() => {
              setCheckInOpen(false);
              setActionError(null);
            }}
            onConfirm={handleCheckIn}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {startBreakOpen && (
          <StartBreakModal
            busy={busy}
            error={actionError}
            onClose={() => {
              setStartBreakOpen(false);
              setActionError(null);
            }}
            onConfirm={handleStartBreak}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {checkOutOpen && (
          <CheckOutDialog
            busy={busy}
            error={actionError}
            checkInTime={today?.check_in_time}
            onCancel={() => {
              setCheckOutOpen(false);
              setActionError(null);
            }}
            onConfirm={handleCheckOut}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {leaveOpen && (
          <MarkLeaveDialog
            busy={busy}
            error={actionError}
            onCancel={() => {
              setLeaveOpen(false);
              setActionError(null);
            }}
            onConfirm={handleMarkLeave}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {toast && <Toast message={toast.message} variant={toast.variant} onDismiss={() => setToast(null)} />}
      </AnimatePresence>
    </Layout>
  );
}

function SessionStat({ icon, label, value, mono = false }) {
  return (
    <div className="flex flex-col">
      <p className="font-body-sm text-on-surface-variant mb-2">{label}</p>
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded bg-surface-container flex items-center justify-center border border-outline-variant shrink-0">
          <Icon name={icon} className="text-primary" />
        </div>
        <p className={`text-on-surface ${mono ? "font-data-mono text-h2" : "font-h2 text-h2"}`}>{value}</p>
      </div>
    </div>
  );
}
