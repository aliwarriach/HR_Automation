import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import Button from "../../components/Button";
import Input from "../../components/Input";
import ConfirmDialog from "../../components/ConfirmDialog";
import { getResumeDetail } from "../../services/resumesService";
import { formatInterviewSlot } from "../../utils/formatDate";
import { INTERVIEW_TIMEZONE_LABEL } from "../../constants/interview";
import { fadeInUp } from "../../constants/motion";

function todayISODate() {
  return new Date().toISOString().split("T")[0];
}

export default function InterviewScheduler({ resumeId, entry, onSchedule, onScheduled, onError }) {
  const isScheduled = entry?.status === "interview" && Boolean(entry?.interview_date && entry?.interview_time);

  const [date, setDate] = useState(entry?.interview_date ?? "");
  const [time, setTime] = useState(entry?.interview_time?.slice(0, 5) ?? "");
  const [scheduling, setScheduling] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [candidateName, setCandidateName] = useState(null);

  useEffect(() => {
    if (!resumeId) return undefined;
    let cancelled = false;

    getResumeDetail(resumeId).then((response) => {
      if (!cancelled && response.ok) {
        setCandidateName(response.data?.candidate_name ?? null);
      }
    });

    return () => {
      cancelled = true;
    };
  }, [resumeId]);

  const canSubmit = Boolean(date && time);

  const submit = async () => {
    setConfirmOpen(false);
    setScheduling(true);
    const response = await onSchedule({
      interviewDate: date,
      interviewTime: time,
      candidateName,
    });
    setScheduling(false);

    if (response.ok) {
      onScheduled?.();
    } else {
      onError?.(response.data?.detail || "Failed to schedule interview. Please try again.");
    }
  };

  return (
    <motion.div
      variants={fadeInUp}
      initial="hidden"
      animate="visible"
      transition={{ ...fadeInUp.visible.transition, delay: 0.15 }}
      className="border border-outline-variant rounded-lg bg-surface shadow-card dark:shadow-none p-xl"
    >
      <h3 className="font-h2 text-h2 text-primary mb-lg">Schedule Interview</h3>

      {isScheduled && (
        <div className="flex items-start justify-between gap-md mb-lg p-md rounded bg-surface-container-low">
          <div>
            <p className="font-body-sm text-body-sm text-on-surface-variant">Scheduled for</p>
            <p className="font-body-md text-body-md text-on-surface font-medium">
              {formatInterviewSlot(entry.interview_date, entry.interview_time)}
            </p>
          </div>
          {entry.google_event_link && (
            <a
              href={entry.google_event_link}
              target="_blank"
              rel="noopener noreferrer"
              className="font-body-sm text-body-sm text-primary hover:underline whitespace-nowrap"
            >
              View calendar event
            </a>
          )}
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-md mb-sm">
        <Input
          id="interview-date"
          label="Date"
          type="date"
          min={todayISODate()}
          value={date}
          onChange={(e) => setDate(e.target.value)}
        />
        <Input id="interview-time" label="Time" type="time" value={time} onChange={(e) => setTime(e.target.value)} />
      </div>

      <p className="font-body-sm text-body-sm text-on-surface-variant mb-lg">
        Times are in {INTERVIEW_TIMEZONE_LABEL}.
      </p>

      <Button
        icon="event"
        disabled={!canSubmit}
        loading={scheduling}
        loadingText="Scheduling…"
        onClick={() => (isScheduled ? setConfirmOpen(true) : submit())}
      >
        {isScheduled ? "Reschedule Interview" : "Schedule Interview"}
      </Button>

      {confirmOpen && (
        <ConfirmDialog
          title="Reschedule Interview"
          message="This will create a new calendar invite and send another email to the candidate. Continue?"
          confirmLabel="Reschedule"
          onConfirm={submit}
          onCancel={() => setConfirmOpen(false)}
        />
      )}
    </motion.div>
  );
}
