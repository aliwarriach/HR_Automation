import { useEffect } from "react";
import { motion } from "framer-motion";
import Icon from "./Icon";
import { toastSlide } from "../constants/motion";

const VARIANT_CLASSES = {
  success: "bg-status-success-bg text-status-success-text",
  danger: "bg-status-danger-bg text-status-danger-text",
};

const VARIANT_ICON = {
  success: "check_circle",
  danger: "error",
};

export default function Toast({ message, variant = "success", onDismiss, duration = 4000 }) {
  useEffect(() => {
    const timer = setTimeout(onDismiss, duration);
    return () => clearTimeout(timer);
  }, [onDismiss, duration]);

  return (
    <motion.div
      role="status"
      variants={toastSlide}
      initial="hidden"
      animate="visible"
      exit="exit"
      className={`fixed bottom-xl right-xl z-[100] flex items-center gap-sm rounded-lg hairline-border shadow-card px-md py-sm font-body-sm text-body-sm ${VARIANT_CLASSES[variant]}`}
    >
      <Icon name={VARIANT_ICON[variant]} className="text-[18px]" />
      {message}
    </motion.div>
  );
}
