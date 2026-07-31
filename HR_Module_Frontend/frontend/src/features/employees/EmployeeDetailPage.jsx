import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import Layout from "../../components/Layout";
import Button from "../../components/Button";
import Icon from "../../components/Icon";
import Badge from "../../components/Badge";
import Field from "../../components/Field";
import ConfirmDialog from "../../components/ConfirmDialog";
import Toast from "../../components/Toast";
import EditEmployeeModal from "./EditEmployeeModal";
import { useEmployeeDetail } from "../../hooks/useEmployeeDetail";
import { deleteEmployee } from "../../services/employeesService";
import { useAuthStore } from "../../store/authStore";
import { ROUTES } from "../../constants/routes";
import { MODULES, ACTIONS } from "../../constants/permissions";
import { hasPermission } from "../../utils/permissions";
import {
  EMPLOYEE_ROLE_VARIANT,
  EMPLOYMENT_TYPE_VARIANT,
  getEmployeeRoleLabel,
  getEmploymentTypeLabel,
} from "../../constants/employee";
import { formatDate, formatDateTime } from "../../utils/formatDate";
import { formatSalary } from "../../utils/formatCurrency";
import { formatEmployeeId, getInitials } from "../../utils/formatText";
import { fadeInUp } from "../../constants/motion";

export default function EmployeeDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const role = useAuthStore((s) => s.role);
  const userId = useAuthStore((s) => s.userId);
  const permissions = useAuthStore((s) => s.permissions);
  const canEdit = hasPermission(permissions, MODULES.EMPLOYEES, ACTIONS.UPDATE);
  const canDelete = hasPermission(permissions, MODULES.EMPLOYEES, ACTIONS.DELETE);
  const { employee, loading, error, notFound, refetch } = useEmployeeDetail(id);
  const canViewPasswordSection = employee && (role === "super_admin" || String(userId) === String(employee.id));

  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [toast, setToast] = useState(null);
  const [passwordVisible, setPasswordVisible] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleCopyPassword = async () => {
    if (!employee?.password) return;
    await navigator.clipboard.writeText(employee.password);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const handleDelete = async () => {
    setDeleting(true);
    const response = await deleteEmployee(id);
    setDeleting(false);

    if (response.ok) {
      navigate(ROUTES.EMPLOYEES);
    } else {
      setToast({ message: response.data?.detail || "Unable to delete employee.", variant: "danger" });
      setDeleteOpen(false);
    }
  };

  return (
    <Layout title="Employee Detail">
      <nav className="flex items-center gap-xs text-on-surface-variant mb-lg">
        <button
          type="button"
          onClick={() => navigate(ROUTES.EMPLOYEES)}
          className="font-body-sm text-body-sm hover:text-primary transition-colors"
        >
          Employees
        </button>
        {employee && (
          <>
            <Icon name="chevron_right" className="text-[16px]" />
            <span className="font-body-sm text-body-sm text-primary font-semibold">{employee.name}</span>
          </>
        )}
      </nav>

      {loading && <p className="font-body-sm text-body-sm text-on-surface-variant">Loading employee…</p>}

      {!loading && notFound && (
        <div className="border border-outline-variant rounded-lg bg-surface shadow-card dark:shadow-none p-xl text-center">
          <p className="font-h2 text-h2 text-primary mb-sm">Employee not found</p>
          <p className="font-body-sm text-body-sm text-on-surface-variant mb-lg">
            This employee record may have been removed or the link is incorrect.
          </p>
          <Button onClick={() => navigate(ROUTES.EMPLOYEES)}>Back to Employees</Button>
        </div>
      )}

      {!loading && !notFound && error && (
        <div className="border border-outline-variant rounded-lg bg-surface shadow-card dark:shadow-none p-xl text-center">
          <p className="font-body-md text-body-md text-error">{error}</p>
        </div>
      )}

      {!loading && !notFound && !error && employee && (
        <div className="flex flex-col gap-xl max-w-5xl">
          <motion.div
            variants={fadeInUp}
            initial="hidden"
            animate="visible"
            className="border border-outline-variant rounded-lg bg-surface shadow-card dark:shadow-none p-xl flex flex-col md:flex-row md:items-start justify-between gap-lg"
          >
            <div className="flex items-center gap-lg">
              <div className="w-24 h-24 shrink-0 rounded bg-surface-container-highest text-primary flex items-center justify-center font-bold text-h1">
                {getInitials(employee.name)}
              </div>
              <div>
                <div className="flex items-center gap-sm mb-1 flex-wrap">
                  <h1 className="font-h1 text-h1 text-primary">{employee.name}</h1>
                  <Badge variant={EMPLOYMENT_TYPE_VARIANT[employee.employment_type] ?? "neutral"}>
                    {getEmploymentTypeLabel(employee.employment_type)}
                  </Badge>
                  <Badge variant={EMPLOYEE_ROLE_VARIANT[employee.role] ?? "neutral"}>
                    {getEmployeeRoleLabel(employee.role)}
                  </Badge>
                </div>
                <p className="font-h2 text-h2 text-on-surface-variant opacity-80">{employee.designation ?? "—"}</p>
                {employee.date_joined && (
                  <div className="mt-md flex items-center gap-xl text-body-sm text-on-surface-variant">
                    <span className="flex items-center gap-xs">
                      <Icon name="calendar_today" className="text-[16px]" /> Joined {formatDate(employee.date_joined)}
                    </span>
                  </div>
                )}
              </div>
            </div>
            {(canEdit || canDelete) && (
              <div className="flex gap-sm">
                {canEdit && (
                  <Button variant="secondary" icon="edit" onClick={() => setEditOpen(true)}>
                    Edit
                  </Button>
                )}
                {canDelete && (
                  <Button variant="danger" icon="delete" onClick={() => setDeleteOpen(true)}>
                    Delete
                  </Button>
                )}
              </div>
            )}
          </motion.div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-xl">
            <div className="lg:col-span-2 space-y-xl">
              <motion.div
                variants={fadeInUp}
                initial="hidden"
                animate="visible"
                transition={{ ...fadeInUp.visible.transition, delay: 0.1 }}
                className="border border-outline-variant rounded-lg bg-surface shadow-card dark:shadow-none overflow-hidden"
              >
                <div className="px-xl py-md border-b border-outline-variant bg-surface-container-low">
                  <h3 className="font-label-mono text-label-mono uppercase text-on-surface-variant">
                    Employment Details
                  </h3>
                </div>
                <div className="p-xl grid grid-cols-1 md:grid-cols-2 gap-y-lg gap-x-xl">
                  <Field label="Email Address" value={employee.email} />
                  <Field label="Phone Number" value={employee.phone ?? "—"} />
                  <Field label="Designation" value={employee.designation ?? "—"} />
                  <Field label="Date Joined" value={employee.date_joined ? formatDate(employee.date_joined) : "—"} />
                  <div className="md:col-span-2">
                    <Field label="Residential Address" value={employee.address ?? "—"} />
                  </div>
                  <Field label="Salary (Annual)" value={formatSalary(employee.salary)} />
                  <Field
                    label="Experience"
                    value={employee.experience_years != null ? `${employee.experience_years} Years` : "—"}
                  />
                </div>
              </motion.div>

              <motion.div
                variants={fadeInUp}
                initial="hidden"
                animate="visible"
                transition={{ ...fadeInUp.visible.transition, delay: 0.15 }}
                className="border border-outline-variant rounded-lg bg-surface shadow-card dark:shadow-none overflow-hidden"
              >
                <div className="px-xl py-md border-b border-outline-variant bg-surface-container-low">
                  <h3 className="font-label-mono text-label-mono uppercase text-on-surface-variant">
                    Verified Skills
                  </h3>
                </div>
                <div className="p-xl flex flex-wrap gap-sm">
                  {employee.skills?.length > 0 ? (
                    employee.skills.map((skill) => (
                      <span
                        key={skill}
                        className="px-md py-xs bg-surface-container text-on-surface font-body-sm font-semibold border border-outline-variant rounded"
                      >
                        {skill}
                      </span>
                    ))
                  ) : (
                    <p className="font-body-sm text-body-sm text-on-surface-variant">No skills recorded.</p>
                  )}
                </div>
              </motion.div>
            </div>

            <div className="space-y-xl">
              <motion.div
                variants={fadeInUp}
                initial="hidden"
                animate="visible"
                transition={{ ...fadeInUp.visible.transition, delay: 0.1 }}
                className="border border-outline-variant rounded-lg bg-surface shadow-card dark:shadow-none p-lg"
              >
                <p className="font-label-mono text-label-mono text-on-surface-variant uppercase mb-sm">
                  Record Metadata
                </p>
                <div className="space-y-md">
                  <div className="flex justify-between items-center">
                    <span className="text-body-sm text-on-surface-variant">Created At</span>
                    <span className="font-data-mono text-data-mono text-on-surface">
                      {formatDateTime(employee.created_at)}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-body-sm text-on-surface-variant">Employee ID</span>
                    <span className="font-data-mono text-data-mono text-on-surface">
                      {formatEmployeeId(employee.id)}
                    </span>
                  </div>
                </div>
              </motion.div>

              {canViewPasswordSection && (
                <motion.div
                  variants={fadeInUp}
                  initial="hidden"
                  animate="visible"
                  transition={{ ...fadeInUp.visible.transition, delay: 0.15 }}
                  className="border border-status-warning-text/40 rounded-lg bg-status-warning-bg p-lg space-y-md"
                >
                  <div className="flex items-center gap-sm text-status-warning-text">
                    <Icon name="lock" className="text-[16px]" />
                    <p className="font-label-mono text-label-mono uppercase font-bold">Login Password</p>
                  </div>
                  {employee.password ? (
                    <div className="flex items-center justify-between bg-surface border border-outline-variant rounded px-md py-sm">
                      <span className="font-data-mono text-data-mono text-on-surface tracking-widest">
                        {passwordVisible ? employee.password : "••••••••••••"}
                      </span>
                      <div className="flex items-center gap-sm">
                        <button
                          type="button"
                          onClick={() => setPasswordVisible((v) => !v)}
                          aria-label={passwordVisible ? "Hide password" : "Show password"}
                          className="p-1 hover:bg-surface-container-low transition-colors text-on-surface-variant rounded"
                        >
                          <Icon name={passwordVisible ? "visibility_off" : "visibility"} className="text-[16px]" />
                        </button>
                        <button
                          type="button"
                          onClick={handleCopyPassword}
                          aria-label="Copy password"
                          className="p-1 hover:bg-surface-container-low transition-colors text-on-surface-variant rounded"
                        >
                          <Icon name={copied ? "check" : "content_copy"} className="text-[16px]" />
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center bg-surface border border-outline-variant rounded px-md py-sm">
                      <span className="font-body-sm text-body-sm text-on-surface-variant italic">
                        Password not set
                      </span>
                    </div>
                  )}
                  <p className="text-[10px] leading-tight text-on-surface-variant italic">
                    Only visible to you as super admin, or to this employee viewing their own profile.
                  </p>
                </motion.div>
              )}
            </div>
          </div>
        </div>
      )}

      <AnimatePresence>
        {editOpen && employee && (
          <EditEmployeeModal
            employee={employee}
            onClose={() => setEditOpen(false)}
            onSaved={() => {
              setEditOpen(false);
              refetch();
              setToast({ message: "Employee updated.", variant: "success" });
            }}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {deleteOpen && employee && (
          <ConfirmDialog
            title="Delete Employee?"
            icon="delete_forever"
            confirmVariant="danger"
            message={
              <>
                Delete <strong className="text-on-surface">{employee.name}</strong>? This action is permanent and
                cannot be undone. All associated history and logs will be archived.
              </>
            }
            confirmLabel="Delete"
            loading={deleting}
            onConfirm={handleDelete}
            onCancel={() => setDeleteOpen(false)}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {toast && <Toast message={toast.message} variant={toast.variant} onDismiss={() => setToast(null)} />}
      </AnimatePresence>
    </Layout>
  );
}
