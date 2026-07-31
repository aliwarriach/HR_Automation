import { useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { AnimatePresence } from "framer-motion";
import Layout from "../../components/Layout";
import Icon from "../../components/Icon";
import Button from "../../components/Button";
import Input from "../../components/Input";
import Badge from "../../components/Badge";
import FilterAttendancePanel from "./FilterAttendancePanel";
import { useAdminAttendanceList } from "../../hooks/useAdminAttendanceList";
import { useWorkingHours } from "../../hooks/useWorkingHours";
import { attendanceAdminDetailPath } from "../../constants/routes";
import { ATTENDANCE_STATUS_LABEL, ATTENDANCE_STATUS_VARIANT } from "../../constants/attendance";
import { formatClockTime, formatHoursShort, getPendingLabel, todayDateString } from "../../utils/attendanceTime";
import { getInitials } from "../../utils/formatText";

export default function AdminAttendanceListPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const [filterOpen, setFilterOpen] = useState(false);

  const date = searchParams.get("date") || todayDateString();
  const status = searchParams.get("status") || "";
  const department = searchParams.get("department") || "";
  const search = searchParams.get("search") || "";

  const { employees, loading, error } = useAdminAttendanceList(date, status, department, search);
  const { config } = useWorkingHours();
  const standardHours = config?.hours_per_day;

  const activeFilterCount = (status ? 1 : 0) + (department ? 1 : 0);

  const updateParam = (key, value) => {
    const next = new URLSearchParams(searchParams);
    if (value) next.set(key, value);
    else next.delete(key);
    setSearchParams(next, { replace: true });
  };

  const applyFilters = ({ status: nextStatus, department: nextDepartment }) => {
    const next = new URLSearchParams(searchParams);
    if (nextStatus) next.set("status", nextStatus);
    else next.delete("status");
    if (nextDepartment) next.set("department", nextDepartment);
    else next.delete("department");
    setSearchParams(next);
    setFilterOpen(false);
  };

  const goToEmployee = (employeeId) => {
    navigate({ pathname: attendanceAdminDetailPath(employeeId), search: searchParams.toString() });
  };

  return (
    <Layout title="Employee Attendance">
      <div className="flex flex-col gap-lg">
        <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-md">
          <div>
            <h1 className="font-h1 text-h1 text-on-surface">Attendance Tracking</h1>
            <p className="text-on-surface-variant font-body-md">
              Daily activity and timekeeping for the enterprise workforce.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-sm">
            <Input
              placeholder="Search by name..."
              value={search}
              onChange={(e) => updateParam("search", e.target.value)}
            />
            <Input type="date" value={date} onChange={(e) => updateParam("date", e.target.value)} />
            <Button variant="secondary" icon="filter_list" onClick={() => setFilterOpen(true)}>
              Filter{activeFilterCount > 0 ? ` (${activeFilterCount})` : ""}
            </Button>
          </div>
        </div>

        {activeFilterCount > 0 && (
          <div className="flex items-center flex-wrap gap-sm">
            <span className="font-label-mono text-label-mono text-on-surface-variant uppercase mr-2">
              Active Filters:
            </span>
            {status && (
              <FilterChip
                label={`STATUS: ${ATTENDANCE_STATUS_LABEL[status].toUpperCase()}`}
                onRemove={() => updateParam("status", "")}
              />
            )}
            {department && (
              <FilterChip label={`DEPARTMENT: ${department.toUpperCase()}`} onRemove={() => updateParam("department", "")} />
            )}
            <button
              type="button"
              className="text-body-sm text-primary font-semibold hover:underline ml-2"
              onClick={() => applyFilters({ status: "", department: "" })}
            >
              Clear all
            </button>
          </div>
        )}

        <div className="border border-outline-variant rounded-lg bg-surface shadow-card dark:shadow-none overflow-hidden">
          <div className="overflow-x-auto w-full">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-outline-variant bg-surface-container-low">
                  <th className="py-sm px-md font-label-mono text-label-mono text-on-surface-variant uppercase tracking-wider">
                    Name
                  </th>
                  <th className="py-sm px-md font-label-mono text-label-mono text-on-surface-variant uppercase tracking-wider">
                    Status
                  </th>
                  <th className="py-sm px-md font-label-mono text-label-mono text-on-surface-variant uppercase tracking-wider text-center">
                    Work Mode
                  </th>
                  <th className="py-sm px-md font-label-mono text-label-mono text-on-surface-variant uppercase tracking-wider">
                    Check-in
                  </th>
                  <th className="py-sm px-md font-label-mono text-label-mono text-on-surface-variant uppercase tracking-wider">
                    Check-out
                  </th>
                  <th className="py-sm px-md font-label-mono text-label-mono text-on-surface-variant uppercase tracking-wider text-right">
                    Hours
                  </th>
                  <th className="py-sm px-md font-label-mono text-label-mono text-on-surface-variant uppercase tracking-wider text-right">
                    Pending/Overtime
                  </th>
                  <th className="py-sm px-md w-10" />
                </tr>
              </thead>
              <tbody className="font-body-sm text-body-sm text-on-surface">
                {loading && (
                  <tr>
                    <td className="py-lg px-md text-on-surface-variant" colSpan={8}>
                      Loading attendance…
                    </td>
                  </tr>
                )}

                {!loading && error && (
                  <tr>
                    <td className="py-lg px-md text-error" colSpan={8}>
                      {error}
                    </td>
                  </tr>
                )}

                {!loading && !error && employees.length === 0 && (
                  <tr>
                    <td className="py-lg px-md text-on-surface-variant" colSpan={8}>
                      No employees found.
                    </td>
                  </tr>
                )}

                {!loading &&
                  !error &&
                  employees.map((employee) => {
                    const inactive = employee.status === "absent" || employee.status === "on_leave";
                    const pendingLabel = standardHours
                      ? getPendingLabel(employee.total_working_hours, employee.pending_hours, standardHours)
                      : null;

                    return (
                      <tr
                        key={employee.employee_id}
                        onClick={() => goToEmployee(employee.employee_id)}
                        className="border-b border-outline-variant last:border-b-0 hover:bg-surface-container-low transition-colors cursor-pointer"
                      >
                        <td className="py-md px-md">
                          <div className="flex items-center gap-md">
                            <div className="w-9 h-9 shrink-0 rounded-full bg-surface-container-highest text-primary flex items-center justify-center font-bold text-xs">
                              {getInitials(employee.name)}
                            </div>
                            <p className="font-semibold text-on-surface">{employee.name}</p>
                          </div>
                        </td>
                        <td className="py-md px-md">
                          <Badge variant={ATTENDANCE_STATUS_VARIANT[employee.status]}>
                            {ATTENDANCE_STATUS_LABEL[employee.status]}
                          </Badge>
                        </td>
                        <td className="py-md px-md text-center">
                          {inactive ? (
                            <span className="text-on-surface-variant">—</span>
                          ) : (
                            <Icon
                              name={employee.work_mode === "wfh" ? "home_work" : "business"}
                              className="text-on-surface-variant text-[18px]"
                            />
                          )}
                        </td>
                        <td className="py-md px-md font-data-mono text-on-surface-variant">
                          {inactive ? "—" : formatClockTime(employee.check_in_time)}
                        </td>
                        <td className="py-md px-md font-data-mono text-on-surface-variant">
                          {inactive ? "—" : formatClockTime(employee.check_out_time)}
                        </td>
                        <td className="py-md px-md font-data-mono text-right text-on-surface">
                          {inactive ? "—" : formatHoursShort(employee.total_working_hours)}
                        </td>
                        <td className="py-md px-md font-data-mono text-right text-on-surface-variant">
                          {inactive ? "—" : pendingLabel ?? "—"}
                        </td>
                        <td className="py-md px-md text-right">
                          <Icon name="chevron_right" className="text-on-surface-variant" />
                        </td>
                      </tr>
                    );
                  })}
              </tbody>
            </table>
          </div>

          <div className="border-t border-outline-variant bg-surface-container-low px-md py-sm">
            <span className="font-body-sm text-body-sm text-on-surface-variant">
              {loading ? "Loading…" : `Showing ${employees.length} employee${employees.length === 1 ? "" : "s"}`}
            </span>
          </div>
        </div>
      </div>

      <AnimatePresence>
        {filterOpen && (
          <FilterAttendancePanel
            initialStatus={status}
            initialDepartment={department}
            onApply={applyFilters}
            onClose={() => setFilterOpen(false)}
          />
        )}
      </AnimatePresence>
    </Layout>
  );
}

function FilterChip({ label, onRemove }) {
  return (
    <div className="flex items-center gap-xs bg-secondary-container px-3 py-1 rounded-full border border-outline-variant">
      <span className="font-label-mono text-label-mono text-on-secondary-container">{label}</span>
      <button type="button" onClick={onRemove} className="text-on-secondary-container hover:text-primary">
        <Icon name="close" className="text-[14px]" />
      </button>
    </div>
  );
}
