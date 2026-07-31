import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { motion } from "framer-motion";
import Layout from "../../components/Layout";
import Button from "../../components/Button";
import Icon from "../../components/Icon";
import AtsBadge from "../../components/AtsBadge";
import Field from "../../components/Field";
import CandidateSummaryCard from "./CandidateSummaryCard";
import { useResume } from "../../hooks/useResume";
import { useShortlist } from "../../hooks/useShortlist";
import { downloadResume } from "../../services/resumesService";
import { useAuthStore } from "../../store/authStore";
import { ROUTES } from "../../constants/routes";
import { MODULES, ACTIONS } from "../../constants/permissions";
import { hasPermission } from "../../utils/permissions";
import { formatDateTime } from "../../utils/formatDate";
import { stripFileNameId } from "../../utils/formatFileName";
import { fadeInUp } from "../../constants/motion";

export default function ResumeDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { resume, loading, error, notFound } = useResume(id);
  const { shortlisted, submitting, message, shortlist } = useShortlist(id);
  const permissions = useAuthStore((s) => s.permissions);
  const canShortlist = hasPermission(permissions, MODULES.CANDIDATES, ACTIONS.CREATE);
  const [downloading, setDownloading] = useState(false);
  const [downloadError, setDownloadError] = useState(null);

  const handleDownload = async () => {
    setDownloading(true);
    setDownloadError(null);
    const response = await downloadResume(id);
    setDownloading(false);

    if (!response.ok) {
      setDownloadError("Unable to download resume.");
      return;
    }

    const url = URL.createObjectURL(response.data);
    const link = document.createElement("a");
    link.href = url;
    link.download = stripFileNameId(resume?.file_name) || "resume.pdf";
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  };

  return (
    <Layout title="Resume Detail">
      <button
        type="button"
        onClick={() => navigate(ROUTES.RESUMES)}
            className="flex items-center gap-xs font-body-sm text-body-sm text-on-surface-variant hover:text-primary transition-colors mb-lg"
          >
            <Icon name="chevron_left" className="text-[18px]" />
            Back to Resumes
          </button>

          {loading && <p className="font-body-sm text-body-sm text-on-surface-variant">Loading resume…</p>}

          {!loading && notFound && (
            <div className="border border-outline-variant rounded-lg bg-surface shadow-card dark:shadow-none p-xl text-center">
              <p className="font-h2 text-h2 text-primary mb-sm">Resume not found</p>
              <p className="font-body-sm text-body-sm text-on-surface-variant mb-lg">
                This resume may have been removed or the link is incorrect.
              </p>
              <Button onClick={() => navigate(ROUTES.RESUMES)}>Back to Resumes</Button>
            </div>
          )}

          {!loading && !notFound && error && (
            <div className="border border-outline-variant rounded-lg bg-surface shadow-card dark:shadow-none p-xl text-center">
              <p className="font-body-md text-body-md text-error">{error}</p>
            </div>
          )}

          {!loading && !notFound && !error && resume && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-lg items-start max-w-5xl">
            <motion.div
              variants={fadeInUp}
              initial="hidden"
              animate="visible"
              className="border border-outline-variant rounded-lg bg-surface shadow-card dark:shadow-none p-xl"
            >
              <h2 className="font-h1 text-h1 text-primary mb-xl">Resume from {resume.sender_email}</h2>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-lg mb-xl">
                <Field label="From" value={resume.sender_email} copyable />
                <Field label="Received" value={formatDateTime(resume.received_at)} mono />
                <Field label="Subject" value={resume.subject} />
                <Field label="File Name" value={stripFileNameId(resume.file_name)} mono />
                <Field label="Added" value={formatDateTime(resume.created_at)} mono />
                <Field
                  label="ATS Score"
                  value={<AtsBadge atsStatus={resume.ats_status} atsScore={resume.ats_score} />}
                />
              </div>

              {resume.ats_status === "scored" && resume.ats_missing_keywords?.length > 0 && (
                <div className="mb-xl">
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

              {downloadError && (
                <p className="font-body-sm text-body-sm text-error mb-md">{downloadError}</p>
              )}

              {message && (
                <p className="font-body-sm text-body-sm text-on-surface-variant mb-md">{message}</p>
              )}

              <div className="flex flex-wrap gap-sm">
                <Button icon="download" loading={downloading} onClick={handleDownload}>
                  Download Resume
                </Button>
                {canShortlist && (
                  <Button
                    variant="secondary"
                    icon={shortlisted ? "check" : "star"}
                    loading={submitting}
                    disabled={shortlisted}
                    onClick={shortlist}
                  >
                    {shortlisted ? "Shortlisted" : "Shortlist"}
                  </Button>
                )}
              </div>
            </motion.div>

              <CandidateSummaryCard resumeId={id} />
            </div>
          )}
    </Layout>
  );
}
