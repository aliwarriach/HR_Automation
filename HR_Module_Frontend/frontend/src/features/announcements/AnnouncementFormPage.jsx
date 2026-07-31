import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import Layout from "../../components/Layout";
import Icon from "../../components/Icon";
import Button from "../../components/Button";
import Input from "../../components/Input";
import AudiencePicker from "./AudiencePicker";
import { useAnnouncementDetail } from "../../hooks/useAnnouncementDetail";
import { createAnnouncement, updateAnnouncement } from "../../services/announcementsService";
import { ROUTES, announcementDetailPath } from "../../constants/routes";
import { toDatetimeLocalValue, fromDatetimeLocalValue } from "../../utils/announcementTime";

const FIELD_SETTERS_KEY = {
  title: "title",
  content: "content",
  target_roles: "targetRoles",
  publish_at: "publishAt",
  expires_at: "expiresAt",
};

export default function AnnouncementFormPage() {
  const { id } = useParams();
  const isEdit = Boolean(id);

  const { announcement, loading: loadingDetail, notFound } = useAnnouncementDetail(isEdit ? id : null);

  if (isEdit && loadingDetail) {
    return (
      <Layout title="Edit Announcement">
        <p className="text-on-surface-variant">Loading announcement…</p>
      </Layout>
    );
  }

  if (isEdit && notFound) {
    return (
      <Layout title="Edit Announcement">
        <p className="text-error">Announcement not found.</p>
      </Layout>
    );
  }

  return <AnnouncementForm key={id ?? "new"} isEdit={isEdit} id={id} announcement={announcement} />;
}

function AnnouncementForm({ isEdit, id, announcement }) {
  const navigate = useNavigate();

  const [title, setTitle] = useState(announcement?.title ?? "");
  const [content, setContent] = useState(announcement?.content ?? "");
  const [targetRoles, setTargetRoles] = useState(announcement?.target_roles ?? []);
  const [publishMode, setPublishMode] = useState(isEdit ? "schedule" : "immediate");
  const [publishAtLocal, setPublishAtLocal] = useState(
    announcement ? toDatetimeLocalValue(announcement.publish_at) : ""
  );
  const [hasExpiry, setHasExpiry] = useState(Boolean(announcement?.expires_at));
  const [expiresAtLocal, setExpiresAtLocal] = useState(
    announcement?.expires_at ? toDatetimeLocalValue(announcement.expires_at) : ""
  );

  const [touched, setTouched] = useState({});
  const markTouched = (field) => setTouched((prev) => ({ ...prev, [field]: true }));

  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);

  const applyServerErrors = (response) => {
    const data = response.data;
    if (response.status === 400) {
      setErrors({ expiresAt: data?.detail || "expires_at must be after publish_at" });
      return;
    }
    if (response.status === 422 && Array.isArray(data?.detail)) {
      const next = {};
      data.detail.forEach((err) => {
        const rawField = err.loc?.[err.loc.length - 1];
        const key = FIELD_SETTERS_KEY[rawField];
        if (key) next[key] = err.msg;
        else next.general = err.msg;
      });
      setErrors(next);
      return;
    }
    setErrors({ general: data?.detail || "Unable to save announcement." });
  };

  const validateClientSide = () => {
    const next = {};
    if (!title.trim()) next.title = "Title is required.";
    if (!content.trim()) next.content = "Content is required.";
    if (targetRoles.length === 0) next.targetRoles = "Select at least one audience.";
    if (publishMode === "schedule" && !publishAtLocal) next.publishAt = "Pick a publish date and time.";
    if (hasExpiry && !expiresAtLocal) next.expiresAt = "Pick an expiry date and time, or turn off expiry.";
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!validateClientSide()) return;

    setSubmitting(true);

    let response;
    if (isEdit) {
      const payload = {};
      if (touched.title) payload.title = title.trim();
      if (touched.content) payload.content = content.trim();
      if (touched.targetRoles) payload.target_roles = targetRoles;
      if (touched.publishAt) {
        payload.publish_at = publishMode === "immediate" ? new Date().toISOString() : fromDatetimeLocalValue(publishAtLocal);
      }
      if (touched.expiresAt) {
        payload.expires_at = hasExpiry ? fromDatetimeLocalValue(expiresAtLocal) : null;
      }
      response = await updateAnnouncement(id, payload);
    } else {
      const payload = {
        title: title.trim(),
        content: content.trim(),
        target_roles: targetRoles,
        ...(publishMode === "schedule" ? { publish_at: fromDatetimeLocalValue(publishAtLocal) } : {}),
        ...(hasExpiry ? { expires_at: fromDatetimeLocalValue(expiresAtLocal) } : {}),
      };
      response = await createAnnouncement(payload);
    }

    setSubmitting(false);

    if (response.ok) {
      navigate(announcementDetailPath(response.data.id));
      return;
    }
    applyServerErrors(response);
  };

  const primaryLabel = isEdit ? "Save Changes" : publishMode === "immediate" ? "Publish Now" : "Schedule";

  return (
    <Layout title={isEdit ? "Edit Announcement" : "Create Announcement"}>
      <div className="max-w-[720px] mx-auto flex flex-col gap-lg">
        <div>
          <h1 className="font-h1 text-h1 text-on-surface">{isEdit ? "Edit Announcement" : "Create Announcement"}</h1>
          <p className="text-on-surface-variant font-body-md">
            {isEdit ? "Update the details of this announcement." : "Publish a notice to the organization."}
          </p>
        </div>

        <form className="flex flex-col gap-lg" onSubmit={handleSubmit}>
          <Input
            id="announcement-title"
            label="Title"
            placeholder="e.g. Office closed for public holiday"
            value={title}
            error={errors.title}
            onChange={(e) => {
              setTitle(e.target.value);
              markTouched("title");
            }}
          />

          <Input
            id="announcement-content"
            label="Content"
            as="textarea"
            rows={6}
            placeholder="Write the full announcement..."
            value={content}
            error={errors.content}
            onChange={(e) => {
              setContent(e.target.value);
              markTouched("content");
            }}
          />

          <AudiencePicker
            value={targetRoles}
            error={errors.targetRoles}
            onChange={(next) => {
              setTargetRoles(next);
              markTouched("targetRoles");
            }}
          />

          <div className="flex flex-col gap-sm">
            <span className="font-body-sm text-body-sm text-on-surface-variant font-medium">Publish</span>
            <div className="flex gap-sm">
              <Button
                type="button"
                variant={publishMode === "immediate" ? "primary" : "secondary"}
                onClick={() => {
                  setPublishMode("immediate");
                  markTouched("publishAt");
                }}
              >
                Publish Immediately
              </Button>
              <Button
                type="button"
                variant={publishMode === "schedule" ? "primary" : "secondary"}
                onClick={() => {
                  setPublishMode("schedule");
                  markTouched("publishAt");
                }}
              >
                Schedule for Later
              </Button>
            </div>
            {publishMode === "schedule" && (
              <Input
                id="announcement-publish-at"
                type="datetime-local"
                value={publishAtLocal}
                error={errors.publishAt}
                onChange={(e) => {
                  setPublishAtLocal(e.target.value);
                  markTouched("publishAt");
                }}
              />
            )}
            {isEdit && publishMode === "immediate" && (
              <p className="font-body-sm text-body-sm text-on-surface-variant flex items-center gap-1">
                <Icon name="info" className="text-[16px]" /> Saving will publish this announcement right now.
              </p>
            )}
          </div>

          <div className="flex flex-col gap-sm">
            <span className="font-body-sm text-body-sm text-on-surface-variant font-medium">Expiry</span>
            <div className="flex gap-sm">
              <Button
                type="button"
                variant={!hasExpiry ? "primary" : "secondary"}
                onClick={() => {
                  setHasExpiry(false);
                  markTouched("expiresAt");
                }}
              >
                No Expiry
              </Button>
              <Button
                type="button"
                variant={hasExpiry ? "primary" : "secondary"}
                onClick={() => {
                  setHasExpiry(true);
                  markTouched("expiresAt");
                }}
              >
                Set Expiry Date
              </Button>
            </div>
            {hasExpiry && (
              <Input
                id="announcement-expires-at"
                type="datetime-local"
                value={expiresAtLocal}
                error={errors.expiresAt}
                onChange={(e) => {
                  setExpiresAtLocal(e.target.value);
                  markTouched("expiresAt");
                }}
              />
            )}
          </div>

          {errors.general && <p className="font-body-sm text-body-sm text-error">{errors.general}</p>}

          <div className="flex justify-end gap-sm">
            <Button
              type="button"
              variant="secondary"
              onClick={() => navigate(isEdit ? announcementDetailPath(id) : ROUTES.ANNOUNCEMENTS)}
            >
              Cancel
            </Button>
            <Button type="submit" loading={submitting} loadingText="Saving…">
              {primaryLabel}
            </Button>
          </div>
        </form>
      </div>
    </Layout>
  );
}
