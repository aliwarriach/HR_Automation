import { useState } from "react";
import { useNavigate } from "react-router-dom";
import Layout from "../../components/Layout";
import Icon from "../../components/Icon";
import Button from "../../components/Button";
import Badge from "../../components/Badge";
import Input from "../../components/Input";
import WorkingHoursConfigForm from "./WorkingHoursConfigForm";
import { useAttendanceDashboard } from "../../hooks/useAttendanceDashboard";
import { useWorkingHours } from "../../hooks/useWorkingHours";
import { useAuthStore } from "../../store/authStore";
import { ROUTES } from "../../constants/routes";
import { MODULES, ACTIONS } from "../../constants/permissions";
import { hasPermission } from "../../utils/permissions";
import { formatDate } from "../../utils/formatDate";
import { todayDateString } from "../../utils/attendanceTime";

export default function AttendanceDashboardPage() {
  const [date, setDate] = useState(todayDateString());
  const navigate = useNavigate();
  const permissions = useAuthStore((s) => s.permissions);
  const canEditWorkingHours = hasPermission(permissions, MODULES.WORKING_HOURS, ACTIONS.UPDATE);

  const { dashboard, loading, error } = useAttendanceDashboard(date);
  const { config, loading: configLoading, error: configError, save } = useWorkingHours();

  const tiles = dashboard
    ? [
        { label: "Total Employees", value: dashboard.total_employees, icon: "group" },
        { label: "Present", value: dashboard.present, icon: "task_alt" },
        { label: "Checked In", value: dashboard.checked_in, icon: "login" },
        { label: "Checked Out", value: dashboard.checked_out, icon: "logout" },
        { label: "On Leave", value: dashboard.on_leave, icon: "event_busy" },
      ]
    : [];

  return (
    <Layout title="Attendance Dashboard">
      <div className="flex flex-col gap-lg">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-md">
          <div>
            <h1 className="font-h1 text-h1 text-on-surface">Attendance Dashboard</h1>
            <p className="text-on-surface-variant font-body-md">Workforce presence and working-hours configuration.</p>
          </div>
          <div className="flex items-center gap-sm">
            <Input id="dashboard-date" as="input" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
            <Button variant="secondary" icon="group" onClick={() => navigate(ROUTES.ATTENDANCE_ADMIN_LIST)}>
              View Employees
            </Button>
          </div>
        </div>

        {error && <p className="text-error">{error}</p>}

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-lg">
          {loading &&
            Array.from({ length: 5 }, (_, i) => (
              <div key={i} className="bg-surface border border-outline-variant rounded-xl p-lg h-[104px] animate-pulse" />
            ))}

          {!loading &&
            tiles.map((tile) => (
              <div key={tile.label} className="bg-surface border border-outline-variant rounded-xl p-lg flex flex-col gap-sm">
                <div className="flex items-center justify-between">
                  <p className="font-label-mono text-label-mono text-on-surface-variant uppercase">{tile.label}</p>
                  <Icon name={tile.icon} className="text-on-surface-variant text-[18px]" />
                </div>
                <h3 className="text-[32px] font-bold text-on-surface leading-tight">{tile.value}</h3>
              </div>
            ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-lg items-start">
          <div className="lg:col-span-4 flex flex-col gap-lg">
            {configLoading && (
              <div className="bg-surface border border-outline-variant rounded-xl p-lg h-[220px] animate-pulse" />
            )}

            {!configLoading && configError && <p className="text-error">{configError}</p>}

            {!configLoading && config && (
              <>
                <section className="bg-surface border border-outline-variant rounded-xl p-lg relative overflow-hidden">
                  <div className="flex justify-between items-start mb-lg">
                    <h3 className="font-h2 text-h2 text-on-surface">Active Configuration</h3>
                    <Badge variant={config.is_active ? "success" : "neutral"}>
                      {config.is_active ? "Operational" : "Inactive"}
                    </Badge>
                  </div>
                  <div className="space-y-lg">
                    <div className="flex flex-col gap-xs">
                      <span className="font-label-mono text-label-mono text-on-surface-variant uppercase tracking-wider">
                        Start Time
                      </span>
                      <div className="flex items-center gap-sm">
                        <Icon name="login" className="text-primary" />
                        <span className="font-h2 text-[20px] text-on-surface">{config.start_time.slice(0, 5)}</span>
                      </div>
                    </div>
                    <div className="flex flex-col gap-xs">
                      <span className="font-label-mono text-label-mono text-on-surface-variant uppercase tracking-wider">
                        End Time
                      </span>
                      <div className="flex items-center gap-sm">
                        <Icon name="logout" className="text-primary" />
                        <span className="font-h2 text-[20px] text-on-surface">{config.end_time.slice(0, 5)}</span>
                      </div>
                    </div>
                    <div className="pt-lg border-t border-outline-variant grid grid-cols-2 gap-md">
                      <div className="flex flex-col gap-xs">
                        <span className="font-label-mono text-on-surface-variant uppercase tracking-wider text-[10px]">
                          Computed
                        </span>
                        <span className="font-data-mono font-bold text-on-surface">{config.hours_per_day}h / day</span>
                      </div>
                      <div className="flex flex-col gap-xs">
                        <span className="font-label-mono text-on-surface-variant uppercase tracking-wider text-[10px]">
                          Active Since
                        </span>
                        <span className="font-data-mono font-bold text-on-surface">{formatDate(`${config.created_at}Z`)}</span>
                      </div>
                    </div>
                  </div>
                </section>

                <div className="bg-surface-container-low border border-outline-variant p-md flex gap-md rounded-xl">
                  <Icon name="info" className="text-on-surface-variant shrink-0" />
                  <p className="text-body-sm text-on-surface-variant leading-relaxed">
                    This is a global setting — it applies to every employee. Saving immediately changes expected-hours
                    math for all future check-outs and monthly summaries.
                  </p>
                </div>
              </>
            )}
          </div>

          <div className="lg:col-span-8">
            {!configLoading && config && canEditWorkingHours && <WorkingHoursConfigForm config={config} onSave={save} />}
          </div>
        </div>
      </div>
    </Layout>
  );
}
