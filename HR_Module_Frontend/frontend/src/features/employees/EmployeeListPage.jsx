import { useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import Layout from "../../components/Layout";
import Button from "../../components/Button";
import Input from "../../components/Input";
import Badge from "../../components/Badge";
import ConfirmDialog from "../../components/ConfirmDialog";
import Toast from "../../components/Toast";
import AddEmployeeModal from "./AddEmployeeModal";
import EditEmployeeModal from "./EditEmployeeModal";
import { useEmployeeList } from "../../hooks/useEmployeeList";
import { useAuthStore } from "../../store/authStore";
import { employeeDetailPath } from "../../constants/routes";
import { MODULES, ACTIONS } from "../../constants/permissions";
import { hasPermission } from "../../utils/permissions";
import {
  EMPLOYEE_ROLE_OPTIONS,
  EMPLOYEE_ROLE_VARIANT,
  EMPLOYMENT_TYPE_OPTIONS,
  EMPLOYMENT_TYPE_VARIANT,
  getEmployeeRoleLabel,
  getEmploymentTypeLabel,
} from "../../constants/employee";
import { formatEmployeeId, getInitials } from "../../utils/formatText";
import { staggerContainer, listItem } from "../../constants/motion";
import { useNavigate } from "react-router-dom";

const PAGE_SIZE = 25;

export default function EmployeeListPage() {
  const { employees, loading, error, refetch, removeEmployee } = useEmployeeList();
  const permissions = useAuthStore((s) => s.permissions);
  const navigate = useNavigate();
  const canCreate = hasPermission(permissions, MODULES.EMPLOYEES, ACTIONS.CREATE);
  const canEdit = hasPermission(permissions, MODULES.EMPLOYEES, ACTIONS.UPDATE);
  const canDelete = hasPermission(permissions, MODULES.EMPLOYEES, ACTIONS.DELETE);

  const [search, setSearch] = useState("");
  const [filterOpen, setFilterOpen] = useState(false);
  const [roleFilters, setRoleFilters] = useState([]);
  const [typeFilters, setTypeFilters] = useState([]);
  const [designationFilter, setDesignationFilter] = useState("");
  const [page, setPage] = useState(1);

  const [addOpen, setAddOpen] = useState(false);
  const [editTarget, setEditTarget] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [toast, setToast] = useState(null);

  const toggleFilter = (list, setList, value) => {
    setList(list.includes(value) ? list.filter((v) => v !== value) : [...list, value]);
    setPage(1);
  };

  const clearFilters = () => {
    setRoleFilters([]);
    setTypeFilters([]);
    setDesignationFilter("");
    setPage(1);
  };

  const activeFilterCount = roleFilters.length + typeFilters.length + (designationFilter.trim() ? 1 : 0);

  const filteredEmployees = useMemo(() => {
    const query = search.trim().toLowerCase();
    const designationQuery = designationFilter.trim().toLowerCase();

    return employees.filter((employee) => {
      if (query && !employee.name?.toLowerCase().includes(query)) return false;
      if (roleFilters.length > 0 && !roleFilters.includes(employee.role)) return false;
      if (typeFilters.length > 0 && !typeFilters.includes(employee.employment_type)) return false;
      if (designationQuery && !employee.designation?.toLowerCase().includes(designationQuery)) return false;
      return true;
    });
  }, [employees, search, roleFilters, typeFilters, designationFilter]);

  const totalPages = Math.max(1, Math.ceil(filteredEmployees.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const pageStart = (currentPage - 1) * PAGE_SIZE;
  const pagedEmployees = filteredEmployees.slice(pageStart, pageStart + PAGE_SIZE);

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    const response = await removeEmployee(deleteTarget.id);
    setDeleting(false);

    if (response.ok) {
      setToast({ message: `${deleteTarget.name} was deleted.`, variant: "success" });
      setDeleteTarget(null);
    } else {
      setToast({ message: response.data?.detail || "Unable to delete employee.", variant: "danger" });
    }
  };

  return (
    <Layout title="Employees">
      <div className="flex flex-col gap-lg mb-xl">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-md">
          <div className="flex gap-sm">
            {canCreate && (
              <Button icon="person_add" onClick={() => setAddOpen(true)}>
                Add Employee
              </Button>
            )}
            <div className="relative">
              <Button
                variant="secondary"
                icon="filter_list"
                onClick={() => setFilterOpen((open) => !open)}
              >
                Filter{activeFilterCount > 0 ? ` (${activeFilterCount})` : ""}
              </Button>

              <AnimatePresence>
                {filterOpen && (
                  <motion.div
                    variants={listItem}
                    initial="hidden"
                    animate="visible"
                    exit="hidden"
                    className="absolute left-0 top-full mt-sm w-72 bg-surface border border-outline-variant rounded-lg shadow-card dark:shadow-none p-md z-30 flex flex-col gap-md"
                  >
                    <div>
                      <p className="font-label-mono text-label-mono text-on-surface-variant uppercase tracking-wider mb-sm">
                        Role
                      </p>
                      <div className="flex flex-col gap-xs">
                        {EMPLOYEE_ROLE_OPTIONS.map((option) => (
                          <label key={option.value} className="flex items-center gap-sm font-body-sm text-body-sm">
                            <input
                              type="checkbox"
                              checked={roleFilters.includes(option.value)}
                              onChange={() => toggleFilter(roleFilters, setRoleFilters, option.value)}
                            />
                            {option.label}
                          </label>
                        ))}
                      </div>
                    </div>
                    <div>
                      <p className="font-label-mono text-label-mono text-on-surface-variant uppercase tracking-wider mb-sm">
                        Employment Type
                      </p>
                      <div className="flex flex-col gap-xs">
                        {EMPLOYMENT_TYPE_OPTIONS.map((option) => (
                          <label key={option.value} className="flex items-center gap-sm font-body-sm text-body-sm">
                            <input
                              type="checkbox"
                              checked={typeFilters.includes(option.value)}
                              onChange={() => toggleFilter(typeFilters, setTypeFilters, option.value)}
                            />
                            {option.label}
                          </label>
                        ))}
                      </div>
                    </div>
                    <Input
                      id="designation-filter"
                      label="Designation contains"
                      placeholder="e.g. Engineer"
                      value={designationFilter}
                      onChange={(e) => {
                        setDesignationFilter(e.target.value);
                        setPage(1);
                      }}
                    />
                    <Button variant="ghost" onClick={clearFilters} className="self-start px-0">
                      Clear filters
                    </Button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
          <div className="font-label-mono text-label-mono text-on-surface-variant uppercase">
            Total: <span className="text-primary font-bold">{employees.length}</span> Employees
          </div>
        </div>

        <div className="w-full max-w-2xl">
          <Input
            placeholder="Search by name..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
          />
        </div>
      </div>

      <div className="border border-outline-variant rounded-lg bg-surface shadow-card dark:shadow-none overflow-hidden">
        <div className="overflow-x-auto w-full">
          <table className="w-full text-left border-collapse table-fixed">
            <colgroup>
              <col className="w-[30%]" />
              <col className="w-[16%]" />
              <col className="hidden sm:table-column sm:w-[16%]" />
              <col className="w-[24%]" />
              <col className="w-[14%]" />
            </colgroup>
            <thead>
              <tr className="border-b border-outline-variant bg-surface-container-low">
                <th className="py-sm px-md font-label-mono text-label-mono text-on-surface-variant uppercase tracking-wider">
                  Name
                </th>
                <th className="py-sm px-md font-label-mono text-label-mono text-on-surface-variant uppercase tracking-wider text-center">
                  Role
                </th>
                <th className="py-sm px-md font-label-mono text-label-mono text-on-surface-variant uppercase tracking-wider text-center hidden sm:table-cell">
                  Employment
                </th>
                <th className="py-sm px-md font-label-mono text-label-mono text-on-surface-variant uppercase tracking-wider">
                  Designation
                </th>
                <th className="py-sm px-md font-label-mono text-label-mono text-on-surface-variant uppercase tracking-wider text-right">
                  Actions
                </th>
              </tr>
            </thead>
            <motion.tbody
              variants={staggerContainer}
              initial="hidden"
              animate="visible"
              className="font-body-sm text-body-sm text-on-surface"
            >
              {loading && (
                <tr>
                  <td className="py-lg px-md text-on-surface-variant" colSpan={5}>
                    Loading employees…
                  </td>
                </tr>
              )}

              {!loading && error && (
                <tr>
                  <td className="py-lg px-md text-error" colSpan={5}>
                    {error}
                  </td>
                </tr>
              )}

              {!loading && !error && pagedEmployees.length === 0 && (
                <tr>
                  <td className="py-lg px-md text-on-surface-variant" colSpan={5}>
                    No employees found.
                  </td>
                </tr>
              )}

              {!loading &&
                !error &&
                pagedEmployees.map((employee) => (
                  <motion.tr
                    key={employee.id}
                    variants={listItem}
                    onClick={() => navigate(employeeDetailPath(employee.id))}
                    className="border-b border-outline-variant last:border-b-0 hover:bg-surface-container-low transition-colors cursor-pointer"
                  >
                    <td className="py-md px-md">
                      <div className="flex items-center gap-md">
                        <div className="w-10 h-10 shrink-0 rounded bg-surface-container-highest text-primary flex items-center justify-center font-bold text-body-sm">
                          {getInitials(employee.name)}
                        </div>
                        <div className="min-w-0">
                          <p className="font-semibold text-primary truncate">{employee.name}</p>
                          <p className="text-[11px] text-on-surface-variant font-data-mono">
                            {formatEmployeeId(employee.id)}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="py-md px-md text-center">
                      <Badge variant={EMPLOYEE_ROLE_VARIANT[employee.role] ?? "neutral"}>
                        {getEmployeeRoleLabel(employee.role)}
                      </Badge>
                    </td>
                    <td className="py-md px-md text-center hidden sm:table-cell">
                      <Badge variant={EMPLOYMENT_TYPE_VARIANT[employee.employment_type] ?? "neutral"}>
                        {getEmploymentTypeLabel(employee.employment_type)}
                      </Badge>
                    </td>
                    <td className="py-md px-md truncate text-on-surface-variant">{employee.designation ?? "—"}</td>
                    <td className="py-md px-md text-right">
                      <div className="flex items-center justify-end gap-xs">
                        <Button
                          variant="ghost"
                          icon="visibility"
                          aria-label="View employee"
                          onClick={(e) => {
                            e.stopPropagation();
                            navigate(employeeDetailPath(employee.id));
                          }}
                        />
                        {canEdit && (
                          <Button
                            variant="ghost"
                            icon="edit"
                            aria-label="Edit employee"
                            onClick={(e) => {
                              e.stopPropagation();
                              setEditTarget(employee);
                            }}
                          />
                        )}
                        {canDelete && (
                          <Button
                            variant="ghost"
                            icon="delete"
                            aria-label="Delete employee"
                            onClick={(e) => {
                              e.stopPropagation();
                              setDeleteTarget(employee);
                            }}
                          />
                        )}
                      </div>
                    </td>
                  </motion.tr>
                ))}
            </motion.tbody>
          </table>
        </div>

        <div className="border-t border-outline-variant bg-surface-container-low px-md py-sm flex items-center justify-between flex-wrap gap-sm">
          <span className="font-body-sm text-body-sm text-on-surface-variant">
            {loading
              ? "Loading…"
              : `Showing ${filteredEmployees.length === 0 ? 0 : pageStart + 1}-${Math.min(
                  pageStart + PAGE_SIZE,
                  filteredEmployees.length
                )} of ${filteredEmployees.length}`}
          </span>
          {totalPages > 1 && (
            <div className="flex items-center gap-xs">
              <Button
                variant="secondary"
                icon="chevron_left"
                aria-label="Previous page"
                disabled={currentPage === 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
              />
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((n) => (
                <Button
                  key={n}
                  variant={n === currentPage ? "primary" : "secondary"}
                  onClick={() => setPage(n)}
                >
                  {n}
                </Button>
              ))}
              <Button
                variant="secondary"
                icon="chevron_right"
                aria-label="Next page"
                disabled={currentPage === totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              />
            </div>
          )}
        </div>
      </div>

      <AnimatePresence>
        {addOpen && (
          <AddEmployeeModal
            onClose={() => setAddOpen(false)}
            onCreated={() => {
              setAddOpen(false);
              refetch();
              setToast({ message: "Employee created and invited by email.", variant: "success" });
            }}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {editTarget && (
          <EditEmployeeModal
            employee={editTarget}
            onClose={() => setEditTarget(null)}
            onSaved={() => {
              setEditTarget(null);
              refetch();
              setToast({ message: "Employee updated.", variant: "success" });
            }}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {deleteTarget && (
          <ConfirmDialog
            title="Delete Employee?"
            icon="delete_forever"
            confirmVariant="danger"
            message={
              <>
                Delete <strong className="text-on-surface">{deleteTarget.name}</strong>? This action is permanent
                and cannot be undone. All associated history and logs will be archived.
              </>
            }
            confirmLabel="Delete"
            loading={deleting}
            onConfirm={handleDelete}
            onCancel={() => setDeleteTarget(null)}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {toast && <Toast message={toast.message} variant={toast.variant} onDismiss={() => setToast(null)} />}
      </AnimatePresence>
    </Layout>
  );
}
