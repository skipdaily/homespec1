import { motion } from "framer-motion";
import { memo } from "react";

const MascotSVG = () => (
  <svg width="120" height="120" viewBox="0 0 120 120" fill="none" xmlns="http://www.w3.org/2000/svg">
    {/* Simple house shape with a smiling face */}
    <motion.path
      d="M60 20L20 50V100H100V50L60 20Z"
      fill="#94a3b8"
      stroke="#64748b"
      strokeWidth="4"
      initial={{ pathLength: 0 }}
      animate={{ pathLength: 1 }}
      transition={{ duration: 2, repeat: Infinity }}
    />
    {/* Eyes */}
    <motion.circle
      cx="45"
      cy="65"
      r="5"
      fill="#1e293b"
      animate={{
        scale: [1, 1.2, 1],
      }}
      transition={{ duration: 2, repeat: Infinity }}
    />
    <motion.circle
      cx="75"
      cy="65"
      r="5"
      fill="#1e293b"
      animate={{
        scale: [1, 1.2, 1],
      }}
      transition={{ duration: 2, repeat: Infinity }}
    />
    {/* Smile */}
    <motion.path
      d="M45 80C45 80 52 90 75 80"
      stroke="#1e293b"
      strokeWidth="3"
      strokeLinecap="round"
      initial={{ pathLength: 0 }}
      animate={{ pathLength: 1 }}
      transition={{ duration: 1 }}
    />
  </svg>
);

interface MascotProps {
  position?: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
}

export const Mascot = memo(({ position = 'bottom-right' }: MascotProps) => {
  const positionClasses = {
    'top-left': 'top-4 left-4',
    'top-right': 'top-4 right-4',
    'bottom-left': 'bottom-4 left-4',
    'bottom-right': 'bottom-4 right-4',
  };

  return (
    <motion.div
      className={`fixed ${positionClasses[position]} z-50`}
      initial={{ scale: 0 }}
      animate={{ scale: 1 }}
      transition={{ type: "spring", stiffness: 260, damping: 20 }}
      whileHover={{ scale: 1.1 }}
      whileTap={{ scale: 0.9 }}
    >
      <MascotSVG />
    </motion.div>
  );
});

Mascot.displayName = "Mascot";
