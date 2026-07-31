import { useState } from "react";
import { motion } from "framer-motion";
import Icon from "../../components/Icon";
import Button from "../../components/Button";
import { overlayFade, fadeScale } from "../../constants/motion";
import { WORK_MODE_OPTIONS } from "../../constants/attendance";
import { useAuthStore } from "../../store/authStore";
import { MODULES, ACTIONS } from "../../constants/permissions";
import { hasPermission } from "../../utils/permissions";

const WORK_MODE_ACTION = {
  onsite: ACTIONS.CHECK_IN_ONSITE,
  wfh: ACTIONS.CHECK_IN_WFH,
};

export default function CheckInModal({ busy, error, onClose, onConfirm }) {
  const permissions = useAuthStore((s) => s.permissions);
  const allowedModes = WORK_MODE_OPTIONS.filter((option) =>
    hasPermission(permissions, MODULES.ATTENDANCE, WORK_MODE_ACTION[option.value])
  );
  const [workMode, setWorkMode] = useState(allowedModes[0]?.value ?? WORK_MODE_OPTIONS[0].value);

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
        className="bg-surface-container-lowest rounded-lg hairline-border shadow-card dark:shadow-none w-full max-w-[480px] overflow-hidden"
      >
        <div className="flex items-center justify-between px-lg py-md border-b border-outline-variant">
          <h2 className="font-h2 text-h2 text-primary">Check In</h2>
          <button aria-label="Close" onClick={onClose} className="text-on-surface-variant hover:text-primary">
            <Icon name="close" />
          </button>
        </div>

        <div className="p-lg">
          <p className="text-on-surface-variant mb-lg font-body-sm">
            Confirm your work location for today&apos;s session.
          </p>

          <div className="flex p-1 bg-surface-container-low rounded border border-outline-variant mb-xl">
            {allowedModes.map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => setWorkMode(option.value)}
                className={`flex-1 flex items-center justify-center gap-sm py-md rounded transition-all duration-200 font-semibold ${
                  workMode === option.value
                    ? "bg-surface shadow-sm border border-outline-variant text-primary"
                    : "text-on-surface-variant hover:text-primary"
                }`}
              >
                <Icon name={option.icon} className="text-[20px]" />
                <span>{option.label}</span>
              </button>
            ))}
          </div>

          {error && <p className="font-body-sm text-body-sm text-error mb-md">{error}</p>}

          <div className="flex flex-col gap-sm">
            <Button icon="arrow_forward" loading={busy} loadingText="Checking in…" onClick={() => onConfirm(workMode)}>
              Confirm Check-In
            </Button>
            <Button variant="ghost" onClick={onClose}>
              Cancel
            </Button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}
