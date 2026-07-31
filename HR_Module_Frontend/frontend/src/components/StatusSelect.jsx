import { STATUS_OPTIONS, STATUS_VARIANT } from "../constants/shortlistStatus";
import { formatTitleCase } from "../utils/formatText";

const VARIANT_TEXT_CLASSES = {
  success: "text-status-success-text",
  warning: "text-status-warning-text",
  info: "text-status-info-text",
  danger: "text-status-danger-text",
  neutral: "text-on-surface-variant",
  primary: "text-primary",
};

export default function StatusSelect({ value, onChange, disabled = false, className = "" }) {
  const variant = STATUS_VARIANT[value] ?? "neutral";

  return (
    <select
      value={value}
      disabled={disabled}
      onChange={(e) => onChange(e.target.value)}
      aria-label="Candidate status"
      className={`font-label-mono text-label-mono uppercase font-bold tracking-wider bg-transparent border-none outline-none cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed ${VARIANT_TEXT_CLASSES[variant]} ${className}`}
    >
      {STATUS_OPTIONS.map((option) => (
        <option key={option} value={option} className="text-on-surface bg-surface normal-case">
          {formatTitleCase(option)}
        </option>
      ))}
    </select>
  );
}
