import { useState } from "react";
import Icon from "./Icon";

export default function Field({ label, value, mono = false, muted = false, copyable = false }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(value);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <div>
      <p className="font-label-mono text-label-mono text-on-surface-variant uppercase tracking-wider mb-1">
        {label}
      </p>
      <div className="flex items-center gap-sm">
        <p
          className={`${muted ? "text-on-surface-variant" : "text-on-surface"} ${
            mono ? "font-data-mono text-data-mono" : "font-body-md text-body-md"
          }`}
        >
          {value}
        </p>
        {copyable && (
          <button
            type="button"
            onClick={handleCopy}
            aria-label={`Copy ${label}`}
            className="text-on-surface-variant hover:text-primary transition-colors"
          >
            <Icon name={copied ? "check" : "content_copy"} className="text-[16px]" />
          </button>
        )}
      </div>
    </div>
  );
}
