"use client";

import { motion } from "framer-motion";
import { useEffect, useState, type ReactNode } from "react";

/**
 * Subtle fade-and-rise reveal as the element scrolls into view.
 * Keeps animations premium and understated.
 */
export function Reveal({
  children,
  delay = 0,
  className,
}: {
  children: ReactNode;
  delay?: number;
  className?: string;
}) {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setReady(true);
  }, []);

  return (
    <motion.div
      className={className}
      initial={ready ? { opacity: 0, y: 24 } : false}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-80px" }}
      transition={{ duration: 0.6, delay, ease: [0.22, 1, 0.36, 1] }}
    >
      {children}
    </motion.div>
  );
}
