import { useMemo, useState } from "react";
import Layout from "../../components/Layout";
import Badge from "../../components/Badge";
import Button from "../../components/Button";
import { useAttendanceHistory } from "../../hooks/useAttendanceHistory";
import { ATTENDANCE_STATUS_LABEL, ATTENDANCE_STATUS_VARIANT, getWorkModeLabel } from "../../constants/attendance";
import { formatClockTime, formatHoursShort, getPendingLabel } from "../../utils/attendanceTime";

const PAGE_SIZE = 20;

export default function AttendanceHistoryPage() {
  const { history, loading, error } = useAttendanceHistory();
  const [page, setPage] = useState(1);

  const summary = useMemo(() => {
    const presentDays = history.filter((record) => record.status !== "on_leave").length;
    const leavesTaken = history.filter((record) => record.status === "on_leave").length;
    const hoursRecords = history.filter((record) => typeof record.total_working_hours === "number");
    const avgHours = hoursRecords.length
      ? hoursRecords.reduce((sum, record) => sum + record.total_working_hours, 0) / hoursRecords.length
      : null;
    return { presentDays, leavesTaken, avgHours };
  }, [history]);

  const totalPages = Math.max(1, Math.ceil(history.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const pageStart = (currentPage - 1) * PAGE_SIZE;
  const pagedHistory = history.slice(pageStart, pageStart + PAGE_SIZE);

  return (
    <Layout title="Attendance History">
      <div className="flex flex-col gap-lg">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-lg">
          <SummaryCard label="Present Days" value={loading ? "—" : String(summary.presentDays)} />
          <SummaryCard
            label="Avg. Daily Hours"
            value={loading || summary.avgHours === null ? "—" : formatHoursShort(summary.avgHours)}
          />
          <SummaryCard label="Leaves Taken" value={loading ? "—" : String(summary.leavesTaken)} />
        </div>

        <div className="border border-outline-variant rounded-lg bg-surface shadow-card dark:shadow-none overflow-hidden">
          <div className="overflow-x-auto w-full">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-outline-variant bg-surface-container-low">
                  <th className="py-sm px-md font-label-mono text-label-mono text-on-surface-variant uppercase tracking-wider">
                    Date
                  </th>
                  <th className="py-sm px-md font-label-mono text-label-mono text-on-surface-variant uppercase tracking-wider">
                    Status
                  </th>
                  <th className="py-sm px-md font-label-mono text-label-mono text-on-surface-variant uppercase tracking-wider">
                    Work Mode
                  </th>
                  <th className="py-sm px-md font-label-mono text-label-mono text-on-surface-variant uppercase tracking-wider">
                    Check-in
                  </th>
                  <th className="py-sm px-md font-label-mono text-label-mono text-on-surface-variant uppercase tracking-wider">
                    Check-out
                  </th>
                  <th className="py-sm px-md font-label-mono text-label-mono text-on-surface-variant uppercase tracking-wider">
                    Total Hours
                  </th>
                  <th className="py-sm px-md font-label-mono text-label-mono text-on-surface-variant uppercase tracking-wider">
                    Pending/Overtime
                  </th>
                </tr>
              </thead>
              <tbody className="font-body-sm text-body-sm text-on-surface">
                {loading && (
                  <tr>
                    <td className="py-lg px-md text-on-surface-variant" colSpan={7}>
                      Loading attendance history…
                    </td>
                  </tr>
                )}

                {!loading && error && (
                  <tr>
                    <td className="py-lg px-md text-error" colSpan={7}>
                      {error}
                    </td>
                  </tr>
                )}

                {!loading && !error && history.length === 0 && (
                  <tr>
                    <td className="py-lg px-md text-on-surface-variant" colSpan={7}>
                      No attendance records yet.
                    </td>
                  </tr>
                )}

                {!loading &&
                  !error &&
                  pagedHistory.map((record) => {
                    const onLeave = record.status === "on_leave";
                    const pendingLabel = getPendingLabel(record.total_working_hours, record.pending_hours);
                    return (
                      <tr key={record.id} className="border-b border-outline-variant last:border-b-0">
                        <td className="py-md px-md font-data-mono text-on-surface">{record.date}</td>
                        <td className="py-md px-md">
                          <Badge variant={ATTENDANCE_STATUS_VARIANT[record.status]}>
                            {ATTENDANCE_STATUS_LABEL[record.status]}
                          </Badge>
                        </td>
                        <td className="py-md px-md text-on-surface-variant">
                          {onLeave ? "—" : getWorkModeLabel(record.work_mode)}
                        </td>
                        <td className="py-md px-md font-data-mono text-on-surface-variant">
                          {onLeave ? "—" : formatClockTime(record.check_in_time)}
                        </td>
                        <td className="py-md px-md font-data-mono text-on-surface-variant">
                          {onLeave ? "—" : formatClockTime(record.check_out_time)}
                        </td>
                        <td className="py-md px-md font-semibold text-on-surface">
                          {onLeave ? "—" : formatHoursShort(record.total_working_hours)}
                        </td>
                        <td className="py-md px-md text-on-surface-variant">
                          {onLeave ? "—" : pendingLabel ?? "—"}
                        </td>
                      </tr>
                    );
                  })}
              </tbody>
            </table>
          </div>

          {totalPages > 1 && (
            <div className="border-t border-outline-variant bg-surface-container-low px-md py-sm flex items-center justify-between flex-wrap gap-sm">
              <span className="font-body-sm text-body-sm text-on-surface-variant">
                Showing {pageStart + 1}-{Math.min(pageStart + PAGE_SIZE, history.length)} of {history.length}
              </span>
              <div className="flex items-center gap-xs">
                <Button
                  variant="secondary"
                  icon="chevron_left"
                  aria-label="Previous page"
                  disabled={currentPage === 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                />
                <Button
                  variant="secondary"
                  icon="chevron_right"
                  aria-label="Next page"
                  disabled={currentPage === totalPages}
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                />
              </div>
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}

function SummaryCard({ label, value }) {
  return (
    <div className="bg-surface border border-outline-variant rounded-lg p-lg flex flex-col shadow-card dark:shadow-none">
      <span className="font-label-mono text-label-mono text-on-surface-variant uppercase mb-1">{label}</span>
      <span className="font-h1 text-h1 text-on-surface">{value}</span>
    </div>
  );
}
