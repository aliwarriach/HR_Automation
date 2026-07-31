import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import Layout from "../../components/Layout";
import Button from "../../components/Button";
import Input from "../../components/Input";
import AtsBadge from "../../components/AtsBadge";
import StatusSelect from "../../components/StatusSelect";
import Badge from "../../components/Badge";
import ConfirmDialog from "../../components/ConfirmDialog";
import { useShortlistList } from "../../hooks/useShortlistList";
import { useAuthStore } from "../../store/authStore";
import { candidateDetailPath } from "../../constants/routes";
import { MODULES, ACTIONS } from "../../constants/permissions";
import { hasPermission } from "../../utils/permissions";
import { STATUS_VARIANT } from "../../constants/shortlistStatus";
import { formatDateTime } from "../../utils/formatDate";
import { formatNameFromEmail, formatTitleCase } from "../../utils/formatText";
import { staggerContainer, listItem } from "../../constants/motion";

export default function ShortlistedCandidatesPage() {
  const { rows, loading, error, updateStatus, removeEntry } = useShortlistList();
  const navigate = useNavigate();
  const permissions = useAuthStore((s) => s.permissions);
  const canUpdate = hasPermission(permissions, MODULES.CANDIDATES, ACTIONS.UPDATE);
  const canDelete = hasPermission(permissions, MODULES.CANDIDATES, ACTIONS.DELETE);
  const [search, setSearch] = useState("");
  const [pendingStatusId, setPendingStatusId] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const filteredRows = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return rows;
    return rows.filter((row) =>
      [row.email, row.role, row.status].some((field) => field?.toLowerCase().includes(query))
    );
  }, [rows, search]);

  const handleStatusChange = async (id, status) => {
    setPendingStatusId(id);
    await updateStatus(id, status);
    setPendingStatusId(null);
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    await removeEntry(deleteTarget.id);
    setDeleting(false);
    setDeleteTarget(null);
  };

  return (
    <Layout title="Shortlisted Candidates">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-xl gap-md">
        <div>
          <h2 className="font-h1 text-h1 text-primary">Shortlisted Candidates</h2>
          <p className="font-body-sm text-body-sm text-on-surface-variant mt-1">
            Candidates shortlisted from resume screening.
          </p>
        </div>
        <div className="w-full sm:w-64">
          <Input
            placeholder="Search by email, role, or status"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      <div className="border border-outline-variant rounded-lg bg-surface shadow-card dark:shadow-none overflow-hidden">
        <div className="overflow-x-auto w-full">
          <table className="w-full text-left border-collapse table-fixed">
            <colgroup>
              <col className="w-[26%]" />
              <col className="hidden md:table-column md:w-[16%]" />
              <col className="hidden sm:table-column sm:w-[12%]" />
              <col className="w-[16%]" />
              <col className="hidden md:table-column md:w-[16%]" />
              <col className="w-[14%]" />
            </colgroup>
            <thead>
              <tr className="border-b border-outline-variant bg-surface-container-low">
                <th className="py-sm px-md font-label-mono text-label-mono text-on-surface-variant uppercase tracking-wider">
                  Candidate
                </th>
                <th className="py-sm px-md font-label-mono text-label-mono text-on-surface-variant uppercase tracking-wider hidden md:table-cell">
                  Role
                </th>
                <th className="py-sm px-md font-label-mono text-label-mono text-on-surface-variant uppercase tracking-wider hidden sm:table-cell">
                  ATS Score
                </th>
                <th className="py-sm px-md font-label-mono text-label-mono text-on-surface-variant uppercase tracking-wider">
                  Status
                </th>
                <th className="py-sm px-md font-label-mono text-label-mono text-on-surface-variant uppercase tracking-wider hidden md:table-cell">
                  Date Shortlisted
                </th>
                <th className="py-sm px-md font-label-mono text-label-mono text-on-surface-variant uppercase tracking-wider" />
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
                  <td className="py-lg px-md text-on-surface-variant" colSpan={6}>
                    Loading shortlisted candidates…
                  </td>
                </tr>
              )}

              {!loading && error && (
                <tr>
                  <td className="py-lg px-md text-error" colSpan={6}>
                    {error}
                  </td>
                </tr>
              )}

              {!loading && !error && filteredRows.length === 0 && (
                <tr>
                  <td className="py-lg px-md text-on-surface-variant" colSpan={6}>
                    No shortlisted candidates found.
                  </td>
                </tr>
              )}

              {!loading &&
                !error &&
                filteredRows.map((row) => (
                  <motion.tr
                    key={row.id}
                    variants={listItem}
                    onClick={() => navigate(candidateDetailPath(row.id))}
                    className="border-b border-outline-variant last:border-b-0 hover:bg-surface-container-low transition-colors cursor-pointer"
                  >
                    <td className="py-md px-md truncate">
                      <span className="block truncate font-bold text-primary hover:underline">
                        {row.email ? formatNameFromEmail(row.email) : "Unknown Candidate"}
                      </span>
                      <div className="text-on-surface-variant mt-1 truncate">{row.email ?? "—"}</div>
                    </td>
                    <td className="py-md px-md hidden md:table-cell text-on-surface-variant truncate">
                      {row.role ? formatTitleCase(row.role) : "—"}
                    </td>
                    <td className="py-md px-md hidden sm:table-cell">
                      <AtsBadge atsStatus={row.ats_status} atsScore={row.ats_score} />
                    </td>
                    <td className="py-md px-md truncate" onClick={(e) => e.stopPropagation()}>
                      {canUpdate ? (
                        <StatusSelect
                          value={row.status}
                          disabled={pendingStatusId === row.id}
                          onChange={(status) => handleStatusChange(row.id, status)}
                        />
                      ) : (
                        <Badge variant={STATUS_VARIANT[row.status] ?? "neutral"}>{formatTitleCase(row.status)}</Badge>
                      )}
                    </td>
                    <td className="py-md px-md font-data-mono text-data-mono hidden md:table-cell text-on-surface-variant truncate">
                      {formatDateTime(row.created_at)}
                    </td>
                    <td className="py-md px-md text-right">
                      <div className="flex items-center justify-end gap-xs">
                        <Button
                          variant="ghost"
                          icon="visibility"
                          aria-label="View candidate"
                          onClick={(e) => {
                            e.stopPropagation();
                            navigate(candidateDetailPath(row.id));
                          }}
                        />
                        {canDelete && (
                          <Button
                            variant="ghost"
                            icon="delete"
                            aria-label="Delete"
                            onClick={(e) => {
                              e.stopPropagation();
                              setDeleteTarget(row);
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

        <div className="border-t border-outline-variant bg-surface-container-low px-md py-sm">
          <span className="font-body-sm text-body-sm text-on-surface-variant">
            {loading ? "Loading…" : `Showing ${filteredRows.length} of ${rows.length} items`}
          </span>
        </div>
      </div>

      <AnimatePresence>
        {deleteTarget && (
          <ConfirmDialog
            title="Delete Shortlisted Candidate"
            message={`Remove ${deleteTarget.email ?? "this candidate"} from the shortlist? This cannot be undone.`}
            confirmLabel="Delete"
            loading={deleting}
            onConfirm={handleDelete}
            onCancel={() => setDeleteTarget(null)}
          />
        )}
      </AnimatePresence>
    </Layout>
  );
}
