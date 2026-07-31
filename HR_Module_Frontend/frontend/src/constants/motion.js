export const EASE = [0.4, 0, 0.2, 1];

export const TRANSITION = { duration: 0.25, ease: EASE };

export const fadeInUp = {
  hidden: { opacity: 0, y: 8 },
  visible: { opacity: 1, y: 0, transition: TRANSITION },
};

export const fadeScale = {
  hidden: { opacity: 0, scale: 0.96 },
  visible: { opacity: 1, scale: 1, transition: TRANSITION },
  exit: { opacity: 0, scale: 0.96, transition: { duration: 0.15, ease: EASE } },
};

export const overlayFade = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: TRANSITION },
  exit: { opacity: 0, transition: { duration: 0.15, ease: EASE } },
};

export const toastSlide = {
  hidden: { opacity: 0, y: 12, scale: 0.98 },
  visible: { opacity: 1, y: 0, scale: 1, transition: TRANSITION },
  exit: { opacity: 0, y: 12, scale: 0.98, transition: { duration: 0.15, ease: EASE } },
};

export const staggerContainer = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.04 } },
};

export const listItem = {
  hidden: { opacity: 0, y: 6 },
  visible: { opacity: 1, y: 0, transition: TRANSITION },
};

export const slideInRight = {
  hidden: { opacity: 0, x: 32 },
  visible: { opacity: 1, x: 0, transition: TRANSITION },
  exit: { opacity: 0, x: 32, transition: { duration: 0.15, ease: EASE } },
};

export const pagePresence = {
  initial: { opacity: 0, y: 8 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -8 },
  transition: TRANSITION,
};
