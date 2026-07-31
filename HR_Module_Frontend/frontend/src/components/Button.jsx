import { motion } from "framer-motion";
import Icon from "./Icon";
import { TRANSITION } from "../constants/motion";

const VARIANT_CLASSES = {
  primary: "bg-primary text-on-primary hover:bg-primary-hover",
  secondary: "bg-surface text-on-surface hairline-border hover:bg-surface-container-low",
  ghost: "bg-transparent text-on-surface-variant hover:text-primary",
  danger: "bg-error text-on-error hover:brightness-110",
};

export default function Button({
  children,
  variant = "primary",
  icon,
  type = "button",
  disabled = false,
  loading = false,
  loadingText = "Please wait…",
  className = "",
  ...props
}) {
  const interactive = !disabled && !loading;

  return (
    <motion.button
      type={type}
      disabled={disabled || loading}
      whileHover={interactive ? { scale: 1.02 } : undefined}
      whileTap={interactive ? { scale: 0.97 } : undefined}
      transition={TRANSITION}
      className={`rounded py-sm px-md font-body-md text-body-md font-semibold flex items-center justify-center gap-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${VARIANT_CLASSES[variant]} ${className}`}
      {...props}
    >
      {icon && !loading && <Icon name={icon} className="text-[18px]" />}
      {loading ? loadingText : children}
    </motion.button>
  );
}
