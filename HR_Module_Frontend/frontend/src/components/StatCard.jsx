import { motion } from "framer-motion";
import Icon from "./Icon";
import { fadeInUp } from "../constants/motion";

const STATUS_DOT_CLASSES = {
  positive: "bg-status-success-text",
  negative: "bg-status-danger-text",
  neutral: "",
};

export default function StatCard({
  label,
  value,
  sublabel,
  status = "neutral",
  icon,
  index = 0,
}) {
  return (
    <motion.div
      variants={fadeInUp}
      initial="hidden"
      animate="visible"
      transition={{ ...fadeInUp.visible.transition, delay: index * 0.05 }}
      className="relative bg-surface rounded-xl hairline-border shadow-card p-md flex flex-col justify-between h-28 hover:border-primary/60 transition-colors"
    >
      {status !== "neutral" && (
        <span
          className={`absolute top-sm right-sm w-2 h-2 rounded-full ${STATUS_DOT_CLASSES[status]}`}
          aria-label={status === "positive" ? "Healthy" : "Attention needed"}
        />
      )}
      <div className="flex items-center gap-xs min-w-0">
        {icon && (
          <span className="flex items-center justify-center w-7 h-7 shrink-0 rounded-lg bg-primary/15 text-primary">
            <Icon name={icon} className="text-[14px]" />
          </span>
        )}
        <h3 className="font-label-mono text-label-mono text-on-surface-variant font-semibold uppercase tracking-wider truncate">
          {label}
        </h3>
      </div>
      <div className="flex justify-between items-baseline gap-xs mt-auto min-w-0">
        <span className="font-data-mono text-h1 font-bold text-on-surface tracking-tight truncate">
          {value}
        </span>
        {sublabel && (
          <span className="font-body-sm text-body-sm text-outline truncate">
            {sublabel}
          </span>
        )}
      </div>
    </motion.div>
  );
}
