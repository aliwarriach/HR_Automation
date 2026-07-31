import { useState } from "react";
import { motion } from "framer-motion";
import Icon from "../../components/Icon";
import Button from "../../components/Button";
import { overlayFade, fadeScale } from "../../constants/motion";
import { BREAK_TYPE_OPTIONS } from "../../constants/attendance";

export default function StartBreakModal({ busy, error, onClose, onConfirm }) {
  const [breakType, setBreakType] = useState(null);

  return (
    <motion.div
      variants={overlayFade}
      initial="hidden"
      animate="visible"
      exit="exit"
      className="fixed inset-0 bg-inverse-surface/40 flex items-center justify-center z-[100] p-md"
    >
      <motion.div
        variants={fadeScale}
        className="bg-surface-container-lowest rounded-lg hairline-border shadow-card dark:shadow-none w-full max-w-[480px] p-xl"
      >
        <div className="flex justify-between items-start mb-lg">
          <div>
            <h2 className="font-h2 text-h2 text-primary">Start Break</h2>
            <p className="text-on-surface-variant text-body-sm mt-1">
              Select your break type to pause current activity tracking.
            </p>
          </div>
          <button aria-label="Close" onClick={onClose} className="text-on-surface-variant hover:text-primary">
            <Icon name="close" />
          </button>
        </div>

        <div className="grid grid-cols-3 gap-md mb-xl">
          {BREAK_TYPE_OPTIONS.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => setBreakType(option.value)}
              className={`flex flex-col items-center justify-center p-lg border rounded transition-all active:scale-95 ${
                breakType === option.value ? "border-primary bg-primary/5" : "border-outline-variant hover:border-primary"
              }`}
            >
              <Icon name={option.icon} className="text-primary text-[28px] mb-sm" />
              <span className="font-body-sm font-semibold text-on-surface">{option.label}</span>
            </button>
          ))}
        </div>

        {error && <p className="font-body-sm text-body-sm text-error mb-md">{error}</p>}

        <div className="flex gap-sm">
          <Button variant="secondary" className="flex-1" onClick={onClose}>
            Cancel
          </Button>
          <Button
            className="flex-[2]"
            disabled={!breakType}
            loading={busy}
            loadingText="Starting…"
            onClick={() => onConfirm(breakType)}
          >
            Start Break
          </Button>
        </div>
      </motion.div>
    </motion.div>
  );
}
