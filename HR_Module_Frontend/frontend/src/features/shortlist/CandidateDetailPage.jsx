import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import Layout from "../../components/Layout";
import Button from "../../components/Button";
import Icon from "../../components/Icon";
import Badge from "../../components/Badge";
import AtsBadge from "../../components/AtsBadge";
import Toast from "../../components/Toast";
import InterviewScheduler from "./InterviewScheduler";
import { useShortlistDetail } from "../../hooks/useShortlistDetail";
import { useAuthStore } from "../../store/authStore";
import { STATUS_VARIANT } from "../../constants/shortlistStatus";
import { ROUTES } from "../../constants/routes";
import { MODULES, ACTIONS } from "../../constants/permissions";
import { hasPermission } from "../../utils/permissions";
import { formatDateTime } from "../../utils/formatDate";
import { formatNameFromEmail, formatTitleCase } from "../../utils/formatText";
import { stripFileNameId } from "../../utils/formatFileName";
import { fadeInUp } from "../../constants/motion";

export default function CandidateDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { entry, resume, loading, error, notFound, scheduleInterview } = useShortlistDetail(id);
  const permissions = useAuthStore((s) => s.permissions);
  const canScheduleInterview = hasPermission(permissions, MODULES.CANDIDATES, ACTIONS.UPDATE);
  const [toast, setToast] = useState(null);

  const handleScheduled = () => {
    setToast({ message: `Interview scheduled and invite sent to ${resume?.sender_email ?? "candidate"}.`, variant: "success" });
  };

  const handleScheduleError = (message) => {
    setToast({ message, variant: "danger" });
  };

  return (
    <Layout title="Candidate Detail">
      <button
        type="button"
        onClick={() => navigate(ROUTES.SHORTLIST)}
        className="flex items-center gap-xs font-body-sm text-body-sm text-on-surface-variant hover:text-primary transition-colors mb-lg"
      >
        <Icon name="chevron_left" className="text-[18px]" />
        Back to Shortlist
      </button>

      {loading && <p className="font-body-sm text-body-sm text-on-surface-variant">Loading candidate…</p>}

      {!loading && notFound && (
        <div className="border border-outline-variant rounded-lg bg-surface shadow-card dark:shadow-none p-xl text-center">
          <p className="font-h2 text-h2 text-primary mb-sm">Candidate not found</p>
          <p className="font-body-sm text-body-sm text-on-surface-variant mb-lg">
            This shortlist entry may have been removed or the link is incorrect.
          </p>
          <Button onClick={() => navigate(ROUTES.SHORTLIST)}>Back to Shortlist</Button>
        </div>
      )}

      {!loading && !notFound && error && (
        <div className="border border-outline-variant rounded-lg bg-surface shadow-card dark:shadow-none p-xl text-center">
          <p className="font-body-md text-body-md text-error">{error}</p>
        </div>
      )}

      {!loading && !notFound && !error && entry && (
        <div className="flex flex-col gap-xl max-w-4xl">
          <motion.div
            variants={fadeInUp}
            initial="hidden"
            animate="visible"
            className="border border-outline-variant rounded-lg bg-surface shadow-card dark:shadow-none p-xl"
          >
            <div className="flex items-center gap-sm mb-1 flex-wrap">
              <h2 className="font-h1 text-h1 text-primary">
                {resume?.sender_email ? formatNameFromEmail(resume.sender_email) : "Unknown Candidate"}
              </h2>
              <Badge variant={STATUS_VARIANT[entry.status] ?? "neutral"}>{formatTitleCase(entry.status)}</Badge>
            </div>
            <p className="font-body-md text-body-md text-on-surface-variant">
              {entry.role ? formatTitleCase(entry.role) : "—"}
            </p>
            {resume?.sender_email && (
              <p className="font-body-sm text-body-sm text-on-surface-variant mt-1">{resume.sender_email}</p>
            )}
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-xl">
            <motion.div
              variants={fadeInUp}
              initial="hidden"
              animate="visible"
              transition={{ ...fadeInUp.visible.transition, delay: 0.1 }}
              className="border border-outline-variant rounded-lg bg-surface shadow-card dark:shadow-none p-xl"
            >
              <h3 className="font-h2 text-h2 text-primary mb-lg">Candidate Info</h3>
              <div className="grid grid-cols-1 gap-lg">
                <div>
                  <p className="font-label-mono text-label-mono text-on-surface-variant uppercase tracking-wider mb-1">
                    ATS Score
                  </p>
                  <AtsBadge atsStatus={resume?.ats_status} atsScore={entry.ats_score} className="text-body-md" />
                </div>
                <div>
                  <p className="font-label-mono text-label-mono text-on-surface-variant uppercase tracking-wider mb-1">
                    Resume File
                  </p>
                  <p className="font-data-mono text-data-mono text-on-surface">{stripFileNameId(entry.file_name)}</p>
                </div>
                <div>
                  <p className="font-label-mono text-label-mono text-on-surface-variant uppercase tracking-wider mb-1">
                    Date Shortlisted
                  </p>
                  <p className="font-data-mono text-data-mono text-on-surface-variant">
                    {formatDateTime(entry.created_at)}
                  </p>
                </div>

                {resume?.ats_status === "scored" && resume?.ats_missing_keywords?.length > 0 && (
                  <div>
                    <p className="font-label-mono text-label-mono text-on-surface-variant uppercase tracking-wider mb-1">
                      Missing Keywords
                    </p>
                    <div className="flex flex-wrap gap-xs">
                      {resume.ats_missing_keywords.map((keyword) => (
                        <span
                          key={keyword}
                          className="font-body-sm text-body-sm text-on-surface-variant bg-surface-container-low rounded px-sm py-1"
                        >
                          {keyword}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div className="mt-xl pt-xl border-t border-outline-variant">
                <h3 className="font-h2 text-h2 text-primary mb-md">Status History</h3>
                {/* TODO: replace with real status change history once a /shortlist/{id}/history endpoint exists */}
                <div className="flex items-start gap-sm">
                  <Icon name="check_circle" className="text-[18px] text-status-success-text mt-0.5" />
                  <p className="font-body-sm text-body-sm text-on-surface-variant">
                    {formatTitleCase(entry.status)} on {formatDateTime(entry.created_at)}
                  </p>
                </div>
              </div>
            </motion.div>

            {canScheduleInterview && (
              <InterviewScheduler
                resumeId={entry.resume_id}
                entry={entry}
                onSchedule={scheduleInterview}
                onScheduled={handleScheduled}
                onError={handleScheduleError}
              />
            )}
          </div>
        </div>
      )}

      <AnimatePresence>
        {toast && <Toast message={toast.message} variant={toast.variant} onDismiss={() => setToast(null)} />}
      </AnimatePresence>
    </Layout>
  );
}
