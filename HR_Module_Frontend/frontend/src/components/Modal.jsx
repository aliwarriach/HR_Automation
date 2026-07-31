import { motion } from "framer-motion";
import Icon from "./Icon";
import { overlayFade, fadeScale } from "../constants/motion";

export default function Modal({ title, onClose, children }) {
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
        <div className="flex items-center justify-between mb-lg">
          <h2 className="font-h2 text-h2 text-primary">{title}</h2>
          <button aria-label="Close" onClick={onClose} className="text-on-surface-variant hover:text-primary">
            <Icon name="close" />
          </button>
        </div>
        {children}
      </motion.div>
    </motion.div>
  );
}
