import { motion } from "framer-motion";
import Icon from "../../components/Icon";
import Badge from "../../components/Badge";
import Button from "../../components/Button";
import Field from "../../components/Field";
import StatCard from "../../components/StatCard";
import { useResumeSummary } from "../../hooks/useResumeSummary";
import { formatExperience, formatHeadline, formatOrDash } from "../../utils/formatResumeSummary";
import { fadeInUp } from "../../constants/motion";

function SkeletonBlock({ className = "" }) {
  return <div className={`bg-surface-container-low rounded animate-pulse ${className}`} />;
}

export default function CandidateSummaryCard({ resumeId }) {
  const { summary, status, retry } = useResumeSummary(resumeId);

  return (
    <motion.div
      variants={fadeInUp}
      initial="hidden"
      animate="visible"
      transition={{ ...fadeInUp.visible.transition, delay: 0.1 }}
      className="border border-outline-variant rounded-lg bg-surface shadow-card p-xl"
    >
      <div className="flex items-center justify-between gap-md mb-lg">
        <div className="flex items-center gap-sm">
          <span className="flex items-center justify-center w-8 h-8 shrink-0 rounded-lg bg-primary/15 text-primary">
            <Icon name="auto_awesome" className="text-[18px]" />
          </span>
          <h2 className="font-h2 text-h2 text-on-surface">Candidate Summary</h2>
        </div>
        <Badge variant="primary">AI Extracted</Badge>
      </div>

      {status === "loading" && (
        <div>
          <SkeletonBlock className="h-6 w-2/3 mb-2" />
          <SkeletonBlock className="h-4 w-1/2 mb-lg" />
          <div className="grid grid-cols-3 gap-sm mb-lg">
            <SkeletonBlock className="h-28 rounded-xl" />
            <SkeletonBlock className="h-28 rounded-xl" />
            <SkeletonBlock className="h-28 rounded-xl" />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-lg">
            <SkeletonBlock className="h-10" />
            <SkeletonBlock className="h-10" />
          </div>
        </div>
      )}

      {status === "not_found" && (
        <div className="flex flex-col items-center text-center py-lg">
          <Icon name="person_search" className="text-[32px] text-on-surface-variant mb-sm" />
          <p className="font-body-sm text-body-sm text-on-surface-variant">
            No candidate summary available for this resume
          </p>
        </div>
      )}

      {status === "error" && (
        <div className="flex flex-col items-center text-center py-lg">
          <Icon name="error" className="text-[32px] text-error mb-sm" />
          <p className="font-body-sm text-body-sm text-on-surface-variant mb-md">
            Couldn't load candidate summary. Try again.
          </p>
          <Button variant="secondary" icon="refresh" onClick={retry}>
            Retry
          </Button>
        </div>
      )}

      {status === "success" && summary && (
        <div>
          <h3 className="font-h1 text-h1 text-on-surface mb-1">{formatOrDash(summary.candidate_name)}</h3>
          <p className="font-body-sm text-body-sm text-on-surface-variant mb-lg">
            {formatHeadline(summary.headline_role, summary.headline_company)}
          </p>

          <div className="grid grid-cols-3 gap-sm mb-lg">
            <StatCard icon="work_history" label="Experience" value={formatExperience(summary.total_experience_years)} />
            <StatCard icon="grade" label="CGPA" value={summary.cgpa} />
            <StatCard icon="school" label="Education" value={summary.education_status} />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-lg">
            <Field label="University" value={formatOrDash(summary.university)} />
            <Field label="Current City" value={formatOrDash(summary.current_city)} />
          </div>
        </div>
      )}
    </motion.div>
  );
}
