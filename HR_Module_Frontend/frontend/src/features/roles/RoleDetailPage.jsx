import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { AnimatePresence } from "framer-motion";
import Layout from "../../components/Layout";
import Icon from "../../components/Icon";
import Button from "../../components/Button";
import Badge from "../../components/Badge";
import ConfirmDialog from "../../components/ConfirmDialog";
import PermissionsSummary from "./PermissionsSummary";
import { useRoleDetail } from "../../hooks/useRoleDetail";
import { deleteRole } from "../../services/rolesService";
import { useAuthStore } from "../../store/authStore";
import { ROUTES, roleEditPath } from "../../constants/routes";
import { MODULES, ACTIONS, PROTECTED_ROLE_NAMES } from "../../constants/permissions";
import { hasPermission } from "../../utils/permissions";
import { formatDateTime } from "../../utils/formatDate";

export default function RoleDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();

  const { role, loading, error, notFound } = useRoleDetail(id);
  const permissions = useAuthStore((s) => s.permissions);
  const canEdit = hasPermission(permissions, MODULES.ROLES, ACTIONS.UPDATE);
  const canDelete = hasPermission(permissions, MODULES.ROLES, ACTIONS.DELETE);

  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState(null);

  const goBackToList = () => navigate(ROUTES.ROLES_LIST);

  const protectedRole = PROTECTED_ROLE_NAMES.includes(role?.name);

  const handleDelete = async () => {
    setDeleting(true);
    setDeleteError(null);
    const response = await deleteRole(id);
    setDeleting(false);

    if (response.ok) {
      goBackToList();
      return;
    }
    setDeleteError(response.data?.detail || "Unable to delete role.");
  };

  return (
    <Layout title="Role Detail">
      <div className="max-w-[720px] mx-auto flex flex-col gap-lg">
        <button
          type="button"
          onClick={goBackToList}
          className="flex items-center gap-2 text-on-surface-variant hover:text-primary transition-colors font-semibold self-start"
        >
          <Icon name="arrow_back" className="text-[20px]" />
          <span>Back to Roles</span>
        </button>

        {loading && <p className="text-on-surface-variant">Loading role…</p>}

        {!loading && notFound && (
          <div className="border border-outline-variant rounded-lg bg-surface p-xl flex flex-col items-center text-center gap-md">
            <Icon name="security" className="text-on-surface-variant text-[40px]" />
            <p className="text-on-surface-variant font-body-md">Role not found.</p>
            <Button variant="secondary" onClick={goBackToList}>
              Back to Roles
            </Button>
          </div>
        )}

        {!loading && !notFound && error && <p className="text-error">{error}</p>}

        {!loading && !notFound && !error && role && (
          <div className="bg-surface border border-outline-variant rounded-lg p-xl flex flex-col gap-lg">
            <div className="flex flex-col md:flex-row md:items-start justify-between gap-md">
              <div className="min-w-0">
                <div className="flex items-center gap-sm mb-xs flex-wrap">
                  <h1 className="font-h1 text-h1 text-on-surface">{role.name}</h1>
                  {protectedRole && <Badge variant="neutral">Protected</Badge>}
                </div>
                <p className="font-body-md text-body-md text-on-surface-variant">
                  {role.description || "No description"}
                </p>
              </div>
              {(canEdit || canDelete) && (
                <div className="flex flex-col items-end gap-xs shrink-0">
                  <div className="flex gap-sm">
                    {canEdit && (
                      <Button
                        variant="secondary"
                        icon="edit"
                        disabled={protectedRole}
                        onClick={() => navigate(roleEditPath(id))}
                      >
                        Edit
                      </Button>
                    )}
                    {canDelete && (
                      <Button
                        variant="danger"
                        icon="delete"
                        disabled={protectedRole}
                        onClick={() => setDeleteOpen(true)}
                      >
                        Delete
                      </Button>
                    )}
                  </div>
                  {protectedRole && (
                    <p className="font-body-sm text-body-sm text-on-surface-variant">
                      Protected role — cannot be modified.
                    </p>
                  )}
                </div>
              )}
            </div>

            <div>
              <p className="font-label-mono text-label-mono text-on-surface-variant uppercase tracking-wider mb-sm">
                Permissions
              </p>
              <PermissionsSummary permissions={role.permissions} />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-lg pt-lg border-t border-outline-variant">
              <div>
                <p className="font-label-mono text-label-mono text-on-surface-variant uppercase tracking-wider mb-1">
                  Created
                </p>
                <p className="font-body-md text-body-md text-on-surface">{formatDateTime(role.created_at)}</p>
              </div>
              <div>
                <p className="font-label-mono text-label-mono text-on-surface-variant uppercase tracking-wider mb-1">
                  Last Updated
                </p>
                <p className="font-body-md text-body-md text-on-surface">
                  {role.updated_at ? formatDateTime(role.updated_at) : "—"}
                </p>
              </div>
            </div>
          </div>
        )}
      </div>

      <AnimatePresence>
        {deleteOpen && (
          <ConfirmDialog
            title="Delete Role?"
            icon="delete_forever"
            confirmVariant="danger"
            confirmLabel="Delete"
            loading={deleting}
            message={
              <>
                Delete <strong className="text-on-surface">{role?.name}</strong>? This is a permanent deletion — this
                cannot be undone.
                {deleteError && <span className="block mt-sm text-error">{deleteError}</span>}
              </>
            }
            onConfirm={handleDelete}
            onCancel={() => {
              setDeleteOpen(false);
              setDeleteError(null);
            }}
          />
        )}
      </AnimatePresence>
    </Layout>
  );
}
