import { motion } from "framer-motion";
import { pagePresence } from "../constants/motion";

export default function PageTransition({ children }) {
  return (
    <motion.div
      initial={pagePresence.initial}
      animate={pagePresence.animate}
      exit={pagePresence.exit}
      transition={pagePresence.transition}
    >
      {children}
    </motion.div>
  );
}
