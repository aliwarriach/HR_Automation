const VARIANT_CLASSES = {
  success: "bg-status-success-bg text-status-success-text",
  warning: "bg-status-warning-bg text-status-warning-text",
  info: "bg-status-info-bg text-status-info-text",
  danger: "bg-status-danger-bg text-status-danger-text",
  neutral: "bg-status-neutral-bg text-status-neutral-text",
  primary: "bg-primary/15 text-primary",
};

export default function Badge({ children, variant = "neutral", className = "" }) {
  return (
    <span
      className={`ledger-tag inline-flex items-center font-label-mono text-label-mono uppercase font-bold ${VARIANT_CLASSES[variant]} ${className}`}
    >
      {children}
    </span>
  );
}
