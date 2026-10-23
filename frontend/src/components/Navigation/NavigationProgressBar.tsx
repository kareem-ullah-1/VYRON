"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useNavigationProgress } from "./useNavigationProgress";

export default function NavigationProgressBar() {
  const { state, progress } = useNavigationProgress();

  return (
    <AnimatePresence>
      {state !== "idle" && (
        <motion.div
          className="fixed top-0 left-0 right-0 z-[9999] h-[3px]"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0, transition: { duration: 0.3, delay: 0.1 } }}
        >
          <motion.div
            className="h-full bg-primary-600"
            initial={{ width: "0%" }}
            animate={{ width: `${progress}%` }}
            transition={{
              width: {
                duration: state === "completing" ? 0.2 : 0.4,
                ease: state === "completing" ? "easeOut" : "easeInOut",
              },
            }}
          >
            <div className="absolute right-0 top-0 h-full w-20 bg-gradient-to-r from-transparent to-primary-400/50 blur-sm" />
            <div className="absolute right-0 top-0 h-full w-3 bg-primary-400 rounded-full shadow-lg shadow-primary-500/50" />
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
