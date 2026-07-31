import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import Layout from "../../components/Layout";
import Button from "../../components/Button";
import Badge from "../../components/Badge";
import ConfirmDialog from "../../components/ConfirmDialog";
import Toast from "../../components/Toast";
import { useRoleList } from "../../hooks/useRoleList";
import { useAuthStore } from "../../store/authStore";
import { ROUTES, roleDetailPath, roleEditPath } from "../../constants/routes";
import { MODULES, ACTIONS, PROTECTED_ROLE_NAMES } from "../../constants/permissions";
import { hasPermission } from "../../utils/permissions";
import { formatDate } from "../../utils/formatDate";
import { staggerContainer, listItem } from "../../constants/motion";

export default function RolesListPage() {
  const navigate = useNavigate();
  const { roles, loading, error, removeRole } = useRoleList();
  const permissions = useAuthStore((s) => s.permissions);
  const canCreate = hasPermission(permissions, MODULES.ROLES, ACTIONS.CREATE);
  const canEdit = hasPermission(permissions, MODULES.ROLES, ACTIONS.UPDATE);
  const canDelete = hasPermission(permissions, MODULES.ROLES, ACTIONS.DELETE);

  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState(null);
  const [toast, setToast] = useState(null);

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    setDeleteError(null);
    const response = await removeRole(deleteTarget.id);
    setDeleting(false);

    if (response.ok) {
      setToast({ message: `${deleteTarget.name} was deleted.`, variant: "success" });
      setDeleteTarget(null);
    } else {
      setDeleteError(response.data?.detail || "Unable to delete role.");
    }
  };

  return (
    <Layout title="Roles & Permissions">
      <div className="flex flex-col gap-lg">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-md">
          <div>
            <h1 className="font-h1 text-h1 text-on-surface">Roles & Permissions</h1>
            <p className="text-on-surface-variant font-body-md">Define custom roles and what each can do.</p>
          </div>
          {canCreate && (
            <Button icon="add" onClick={() => navigate(ROUTES.ROLE_NEW)}>
              Create Role
            </Button>
          )}
        </div>

        <div className="border border-outline-variant rounded-lg bg-surface shadow-card dark:shadow-none overflow-hidden">
          <div className="overflow-x-auto w-full">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-outline-variant bg-surface-container-low">
                  <th className="py-sm px-md font-label-mono text-label-mono text-on-surface-variant uppercase tracking-wider">
                    Name
                  </th>
                  <th className="py-sm px-md font-label-mono text-label-mono text-on-surface-variant uppercase tracking-wider">
                    Description
                  </th>
                  <th className="py-sm px-md font-label-mono text-label-mono text-on-surface-variant uppercase tracking-wider">
                    Created
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
                    <td className="py-lg px-md text-on-surface-variant" colSpan={4}>
                      Loading roles…
                    </td>
                  </tr>
                )}

                {!loading && error && (
                  <tr>
                    <td className="py-lg px-md text-error" colSpan={4}>
                      {error}
                    </td>
                  </tr>
                )}

                {!loading && !error && roles.length === 0 && (
                  <tr>
                    <td className="py-lg px-md text-on-surface-variant" colSpan={4}>
                      No roles yet. Create your first custom role to get started.
                    </td>
                  </tr>
                )}

                {!loading &&
                  !error &&
                  roles.map((role) => {
                    const protectedRole = PROTECTED_ROLE_NAMES.includes(role.name);
                    return (
                      <motion.tr
                        key={role.id}
                        variants={listItem}
                        onClick={() => navigate(roleDetailPath(role.id))}
                        className="border-b border-outline-variant last:border-b-0 hover:bg-surface-container-low transition-colors cursor-pointer"
                      >
                        <td className="py-md px-md">
                          <div className="flex items-center gap-sm">
                            <span className="font-semibold text-primary">{role.name}</span>
                            {protectedRole && <Badge variant="neutral">Protected</Badge>}
                          </div>
                        </td>
                        <td className="py-md px-md text-on-surface-variant">{role.description || "—"}</td>
                        <td className="py-md px-md font-data-mono text-on-surface-variant">
                          {formatDate(role.created_at)}
                        </td>
                        <td className="py-md px-md text-right">
                          <div className="flex items-center justify-end gap-xs">
                            <Button
                              variant="ghost"
                              icon="visibility"
                              aria-label="View role"
                              onClick={(e) => {
                                e.stopPropagation();
                                navigate(roleDetailPath(role.id));
                              }}
                            />
                            {canEdit && (
                              <Button
                                variant="ghost"
                                icon="edit"
                                aria-label="Edit role"
                                disabled={protectedRole}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  navigate(roleEditPath(role.id));
                                }}
                              />
                            )}
                            {canDelete && (
                              <Button
                                variant="ghost"
                                icon="delete"
                                aria-label="Delete role"
                                disabled={protectedRole}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setDeleteTarget(role);
                                }}
                              />
                            )}
                          </div>
                        </td>
                      </motion.tr>
                    );
                  })}
              </motion.tbody>
            </table>
          </div>
        </div>
      </div>

      <AnimatePresence>
        {deleteTarget && (
          <ConfirmDialog
            title="Delete Role?"
            icon="delete_forever"
            confirmVariant="danger"
            confirmLabel="Delete"
            loading={deleting}
            message={
              <>
                Delete <strong className="text-on-surface">{deleteTarget.name}</strong>? This is a permanent
                deletion — this cannot be undone.
                {deleteError && <span className="block mt-sm text-error">{deleteError}</span>}
              </>
            }
            onConfirm={handleDelete}
            onCancel={() => {
              setDeleteTarget(null);
              setDeleteError(null);
            }}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {toast && <Toast message={toast.message} variant={toast.variant} onDismiss={() => setToast(null)} />}
      </AnimatePresence>
    </Layout>
  );
}
