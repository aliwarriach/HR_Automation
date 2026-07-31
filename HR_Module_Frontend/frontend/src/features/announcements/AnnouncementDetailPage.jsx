import { useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { AnimatePresence } from "framer-motion";
import Layout from "../../components/Layout";
import Icon from "../../components/Icon";
import Button from "../../components/Button";
import Badge from "../../components/Badge";
import ConfirmDialog from "../../components/ConfirmDialog";
import AudienceChips from "./AudienceChips";
import { useAnnouncementDetail } from "../../hooks/useAnnouncementDetail";
import { deleteAnnouncement } from "../../services/announcementsService";
import { useAuthStore } from "../../store/authStore";
import { ROUTES, announcementEditPath } from "../../constants/routes";
import { ANNOUNCEMENT_STATUS_LABEL, ANNOUNCEMENT_STATUS_VARIANT } from "../../constants/announcements";
import { MODULES, ACTIONS } from "../../constants/permissions";
import { hasPermission } from "../../utils/permissions";
import { formatAnnouncementDateTime } from "../../utils/announcementTime";
import { formatEmployeeId } from "../../utils/formatText";

export default function AnnouncementDetailPage() {
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const permissions = useAuthStore((s) => s.permissions);
  const canEdit = hasPermission(permissions, MODULES.ANNOUNCEMENTS, ACTIONS.UPDATE);
  const canDelete = hasPermission(permissions, MODULES.ANNOUNCEMENTS, ACTIONS.DELETE);

  const { announcement, loading, error, notFound } = useAnnouncementDetail(id);

  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState(null);

  const goBackToList = () => {
    navigate({ pathname: ROUTES.ANNOUNCEMENTS, search: searchParams.toString() });
  };

  const handleDelete = async () => {
    setDeleting(true);
    setDeleteError(null);
    const response = await deleteAnnouncement(id);
    setDeleting(false);

    if (response.ok) {
      goBackToList();
      return;
    }
    setDeleteError(response.data?.detail || "Unable to delete announcement.");
  };

  return (
    <Layout title="Announcement Detail">
      <div className="max-w-[720px] mx-auto flex flex-col gap-lg">
        <button
          type="button"
          onClick={goBackToList}
          className="flex items-center gap-2 text-on-surface-variant hover:text-primary transition-colors font-semibold self-start"
        >
          <Icon name="arrow_back" className="text-[20px]" />
          <span>Back to Announcements</span>
        </button>

        {loading && <p className="text-on-surface-variant">Loading announcement…</p>}
        {!loading && notFound && <p className="text-error">Announcement not found.</p>}
        {!loading && !notFound && error && <p className="text-error">{error}</p>}

        {!loading && !notFound && !error && announcement && (
          <div className="bg-surface border border-outline-variant rounded-lg p-xl flex flex-col gap-lg">
            <div className="flex flex-col md:flex-row md:items-start justify-between gap-md">
              <div className="min-w-0">
                <div className="flex items-center gap-sm mb-xs flex-wrap">
                  <Badge variant={ANNOUNCEMENT_STATUS_VARIANT[announcement.status]}>
                    {ANNOUNCEMENT_STATUS_LABEL[announcement.status]}
                  </Badge>
                </div>
                <h1 className="font-h1 text-h1 text-on-surface">{announcement.title}</h1>
              </div>
              <div className="flex gap-sm shrink-0">
                {canEdit && (
                  <Button variant="secondary" icon="edit" onClick={() => navigate(announcementEditPath(id))}>
                    Edit
                  </Button>
                )}
                {canDelete && (
                  <Button variant="danger" icon="delete" onClick={() => setDeleteOpen(true)}>
                    Delete
                  </Button>
                )}
              </div>
            </div>

            <p className="font-body-md text-body-md text-on-surface whitespace-pre-wrap leading-relaxed">
              {announcement.content}
            </p>

            <div>
              <p className="font-label-mono text-label-mono text-on-surface-variant uppercase tracking-wider mb-sm">
                Audience
              </p>
              <AudienceChips roles={announcement.target_roles} />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-lg pt-lg border-t border-outline-variant">
              <DetailField label="Created By" value={formatEmployeeId(announcement.created_by)} />
              <DetailField label="Created At" value={formatAnnouncementDateTime(announcement.created_at)} />
              <DetailField label="Publish At" value={formatAnnouncementDateTime(announcement.publish_at)} />
              <DetailField
                label="Expires At"
                value={announcement.expires_at ? formatAnnouncementDateTime(announcement.expires_at) : "No expiry"}
              />
            </div>
          </div>
        )}
      </div>

      <AnimatePresence>
        {deleteOpen && (
          <ConfirmDialog
            title="Delete Announcement?"
            icon="delete_forever"
            confirmVariant="danger"
            confirmLabel="Delete"
            loading={deleting}
            message={
              <>
                Delete <strong className="text-on-surface">{announcement?.title}</strong>? This is a permanent
                deletion — this cannot be undone.
                {deleteError && <span className="block mt-sm text-error">{deleteError}</span>}
              </>
            }
            onConfirm={handleDelete}
            onCancel={() => setDeleteOpen(false)}
          />
        )}
      </AnimatePresence>
    </Layout>
  );
}

function DetailField({ label, value }) {
  return (
    <div>
      <p className="font-label-mono text-label-mono text-on-surface-variant uppercase tracking-wider mb-1">{label}</p>
      <p className="font-body-md text-body-md text-on-surface">{value}</p>
    </div>
  );
}
