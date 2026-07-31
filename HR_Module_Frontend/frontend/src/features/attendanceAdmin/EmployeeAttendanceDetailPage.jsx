import { Fragment, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import Layout from "../../components/Layout";
import Icon from "../../components/Icon";
import Badge from "../../components/Badge";
import { useEmployeeAttendanceDetail } from "../../hooks/useEmployeeAttendanceDetail";
import { ROUTES } from "../../constants/routes";
import { ATTENDANCE_STATUS_LABEL, ATTENDANCE_STATUS_VARIANT, getBreakTypeLabel } from "../../constants/attendance";
import { formatClockTime, formatHoursShort, formatSignedHours } from "../../utils/attendanceTime";
import { getInitials } from "../../utils/formatText";

const now = new Date();

function formatDayLabel(dateStr) {
  const [y, m, d] = dateStr.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
}

export default function EmployeeAttendanceDetailPage() {
  const { employeeId } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [expandedDates, setExpandedDates] = useState(new Set());

  const { detail, loading, error, notFound } = useEmployeeAttendanceDetail(employeeId, year, month);

  const goBackToList = () => {
    navigate({ pathname: ROUTES.ATTENDANCE_ADMIN_LIST, search: searchParams.toString() });
  };

  const shiftMonth = (delta) => {
    let nextMonth = month + delta;
    let nextYear = year;
    if (nextMonth > 12) {
      nextMonth = 1;
      nextYear += 1;
    } else if (nextMonth < 1) {
      nextMonth = 12;
      nextYear -= 1;
    }
    setMonth(nextMonth);
    setYear(nextYear);
  };

  const toggleExpanded = (date) => {
    setExpandedDates((prev) => {
      const next = new Set(prev);
      if (next.has(date)) next.delete(date);
      else next.add(date);
      return next;
    });
  };

  const monthLabel = new Date(year, month - 1).toLocaleDateString("en-US", { month: "long", year: "numeric" });

  return (
    <Layout title="Employee Attendance">
      <div className="flex flex-col gap-lg">
        <button
          type="button"
          onClick={goBackToList}
          className="flex items-center gap-2 text-on-surface-variant hover:text-primary transition-colors font-semibold self-start"
        >
          <Icon name="arrow_back" className="text-[20px]" />
          <span>Back to Employee List</span>
        </button>

        {loading && <p className="text-on-surface-variant">Loading employee attendance…</p>}
        {!loading && notFound && <p className="text-error">Employee not found.</p>}
        {!loading && !notFound && error && <p className="text-error">{error}</p>}

        {!loading && !notFound && !error && detail && (
          <>
            <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-lg">
              <div className="flex gap-lg items-center">
                <div className="w-20 h-20 bg-primary-container flex items-center justify-center rounded-lg border border-outline-variant shrink-0">
                  <span className="font-h1 text-h1 text-on-primary-container">{getInitials(detail.employee.name)}</span>
                </div>
                <div>
                  <h2 className="font-h1 text-h1 text-on-surface mb-1">{detail.employee.name}</h2>
                  <div className="flex flex-wrap items-center gap-md text-on-surface-variant">
                    <span className="flex items-center gap-1 font-body-sm">
                      <Icon name="mail" className="text-[16px]" /> {detail.employee.email}
                    </span>
                    {detail.employee.designation && (
                      <>
                        <span className="w-1 h-1 bg-outline rounded-full" />
                        <span className="flex items-center gap-1 font-body-sm font-semibold text-on-surface">
                          <Icon name="badge" className="text-[16px]" /> {detail.employee.designation}
                        </span>
                      </>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-md bg-surface border border-outline-variant p-sm rounded-lg">
                <button
                  type="button"
                  onClick={() => shiftMonth(-1)}
                  aria-label="Previous month"
                  className="p-1 hover:bg-surface-container-low rounded transition-colors"
                >
                  <Icon name="chevron_left" className="text-[20px]" />
                </button>
                <div className="flex items-center gap-2 px-md">
                  <Icon name="calendar_month" className="text-primary" />
                  <span className="font-body-md font-bold text-on-surface">{monthLabel}</span>
                </div>
                <button
                  type="button"
                  onClick={() => shiftMonth(1)}
                  aria-label="Next month"
                  className="p-1 hover:bg-surface-container-low rounded transition-colors"
                >
                  <Icon name="chevron_right" className="text-[20px]" />
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-lg">
              <SummaryStat label="Expected Hours" value={`${detail.monthly_summary.expected_hours}`} suffix="HRS" />
              <SummaryStat label="Completed Hours" value={`${detail.monthly_summary.completed_hours}`} suffix="HRS" />
              <VarianceStat value={detail.monthly_summary.pending_or_extra_hours} recordCount={detail.history.length} />
            </div>

            <div className="bg-surface border border-outline-variant rounded-lg overflow-hidden">
              <div className="px-lg py-md border-b border-outline-variant bg-surface-container-low">
                <h3 className="font-h2 text-h2 text-on-surface">Attendance Logs</h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-surface-container-low/60">
                      <th className="px-lg py-3 font-label-mono text-label-mono text-on-surface-variant uppercase w-12">
                        #
                      </th>
                      <th className="px-lg py-3 font-label-mono text-label-mono text-on-surface-variant uppercase">
                        Date
                      </th>
                      <th className="px-lg py-3 font-label-mono text-label-mono text-on-surface-variant uppercase text-center">
                        Status
                      </th>
                      <th className="px-lg py-3 font-label-mono text-label-mono text-on-surface-variant uppercase">
                        Check-In
                      </th>
                      <th className="px-lg py-3 font-label-mono text-label-mono text-on-surface-variant uppercase">
                        Check-Out
                      </th>
                      <th className="px-lg py-3 font-label-mono text-label-mono text-on-surface-variant uppercase">
                        Total Hours
                      </th>
                      <th className="px-lg py-3 font-label-mono text-label-mono text-on-surface-variant uppercase text-right">
                        Details
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-outline-variant font-body-sm text-body-sm">
                    {detail.history.length === 0 && (
                      <tr>
                        <td className="px-lg py-lg text-on-surface-variant" colSpan={7}>
                          No attendance records for {monthLabel}.
                        </td>
                      </tr>
                    )}

                    {detail.history.map((day, index) => {
                      const hasBreaks = day.breaks && day.breaks.length > 0;
                      const expanded = expandedDates.has(day.date);
                      return (
                        <Fragment key={day.date}>
                          <tr className="hover:bg-surface-container-low/60 transition-colors">
                            <td className="px-lg py-4 font-data-mono text-on-surface-variant">
                              {String(index + 1).padStart(2, "0")}
                            </td>
                            <td className="px-lg py-4 font-bold text-on-surface">{formatDayLabel(day.date)}</td>
                            <td className="px-lg py-4 text-center">
                              <Badge variant={ATTENDANCE_STATUS_VARIANT[day.status]}>
                                {ATTENDANCE_STATUS_LABEL[day.status]}
                              </Badge>
                            </td>
                            <td className="px-lg py-4 font-data-mono text-on-surface">
                              {formatClockTime(day.check_in_time)}
                            </td>
                            <td className="px-lg py-4 font-data-mono text-on-surface">
                              {formatClockTime(day.check_out_time)}
                            </td>
                            <td className="px-lg py-4 font-bold text-on-surface">
                              {formatHoursShort(day.total_working_hours)}
                            </td>
                            <td className="px-lg py-4 text-right">
                              <button
                                type="button"
                                disabled={!hasBreaks}
                                onClick={() => toggleExpanded(day.date)}
                                className="p-1 hover:bg-surface-container-high rounded transition-all disabled:opacity-20 disabled:cursor-not-allowed"
                                aria-label="Toggle break breakdown"
                              >
                                <Icon name={expanded ? "keyboard_arrow_up" : "keyboard_arrow_down"} />
                              </button>
                            </td>
                          </tr>
                          {expanded && hasBreaks && (
                            <tr className="bg-surface-container-low/40">
                              <td className="px-lg py-md" colSpan={7}>
                                <p className="font-label-mono text-label-mono text-on-surface-variant uppercase border-b border-outline-variant pb-1 mb-sm">
                                  Break History
                                </p>
                                <div className="flex flex-col gap-xs">
                                  {day.breaks.map((brk, i) => (
                                    <div key={i} className="flex justify-between items-center text-[12px] max-w-sm">
                                      <span>{getBreakTypeLabel(brk.break_type)}</span>
                                      <span className="font-data-mono text-on-surface-variant">
                                        {formatClockTime(brk.start_time)} –{" "}
                                        {brk.end_time ? formatClockTime(brk.end_time) : "ongoing"}
                                      </span>
                                    </div>
                                  ))}
                                </div>
                              </td>
                            </tr>
                          )}
                        </Fragment>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}
      </div>
    </Layout>
  );
}

function SummaryStat({ label, value, suffix }) {
  return (
    <div className="bg-surface border border-outline-variant rounded-lg p-lg">
      <p className="font-label-mono text-label-mono text-on-surface-variant mb-2 uppercase">{label}</p>
      <div className="flex items-baseline gap-2">
        <span className="font-h1 text-[32px] text-on-surface">{value}</span>
        <span className="text-on-surface-variant font-body-sm">{suffix}</span>
      </div>
    </div>
  );
}

function VarianceStat({ value, recordCount }) {
  const positive = value > 0;
  const negative = value < 0;

  return (
    <div className="bg-surface border border-outline-variant rounded-lg p-lg">
      <p className="font-label-mono text-label-mono text-on-surface-variant mb-2 uppercase">Net Variance</p>
      <div className="flex items-center gap-3">
        <span className="font-h1 text-[32px] text-on-surface">{formatSignedHours(value)}</span>
        {(positive || negative) && (
          <div
            className={`flex items-center gap-1 px-2 py-1 rounded-sm ${
              positive ? "bg-status-success-bg text-status-success-text" : "bg-status-warning-bg text-status-warning-text"
            }`}
          >
            <Icon name={positive ? "arrow_upward" : "arrow_downward"} className="text-[16px] font-bold" />
            <span className="text-[11px] font-bold">{positive ? "EXTRA" : "PENDING"}</span>
          </div>
        )}
      </div>
      <p className="text-[11px] text-on-surface-variant mt-4 font-body-sm">
        Calculated from {recordCount} recorded day{recordCount === 1 ? "" : "s"}.
      </p>
    </div>
  );
}
