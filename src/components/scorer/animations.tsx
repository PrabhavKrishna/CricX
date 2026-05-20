"use client";

import { useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";

interface AnimationOverlayProps {
  type: "four" | "six" | "wicket" | "normal";
  onComplete?: () => void;
}

export function AnimationOverlay({ type, onComplete }: AnimationOverlayProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const timer = setTimeout(() => {
      onComplete?.();
    }, type === "wicket" ? 500 : type === "six" ? 600 : 400);
    return () => clearTimeout(timer);
  }, [type, onComplete]);

  const particles =
    type === "six"
      ? Array.from({ length: 12 }, (_, i) => ({
          angle: (i * 30) * (Math.PI / 180),
          tx: Math.cos(i * 30) * 150,
          ty: Math.sin(i * 30) * 150,
        }))
      : [];

  return (
    <div
      ref={containerRef}
      className="particle-container"
      style={{ top: "30%", left: "50%", transform: "translate(-50%, -50%)" }}
    >
      {/* Screen flash */}
      <AnimatePresence>
        {type === "six" && (
          <motion.div
            key="flash"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="screen-flash-amber"
          />
        )}
        {type === "wicket" && (
          <motion.div
            key="wicket-flash"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="screen-flash-red"
          />
        )}
      </AnimatePresence>

      {/* "FOUR!" or "SIX!" badge */}
      <AnimatePresence>
        {(type === "four" || type === "six") && (
          <motion.div
            key="badge"
            initial={{ y: -60, opacity: 0, scale: 0.5 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: 20, opacity: 0, scale: 0.8 }}
            transition={{
              type: "spring",
              stiffness: 300,
              damping: 20,
              duration: type === "six" ? 0.4 : 0.3,
            }}
            className={`absolute left-1/2 top-0 text-4xl font-bold ${
              type === "four" ? "text-[#10B981]" : "text-[#F59E0B]"
            }`}
            style={{
              textShadow: `0 0 30px ${type === "four" ? "rgba(16,185,129,0.5)" : "rgba(245,158,11,0.5)"}`,
              transform: "translateX(-50%)",
            }}
          >
            {type === "four" ? "FOUR!" : "SIX!"}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Wicket badge */}
      <AnimatePresence>
        {type === "wicket" && (
          <motion.div
            key="wicket-badge"
            initial={{ x: 100, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: -50, opacity: 0 }}
            transition={{ type: "spring", stiffness: 400, damping: 25 }}
            className="absolute left-1/2 top-0 text-3xl font-bold text-[#EF4444]"
            style={{
              textShadow: "0 0 20px rgba(239,68,68,0.5)",
              transform: "translateX(-50%)",
            }}
          >
            OUT!
          </motion.div>
        )}
      </AnimatePresence>

      {/* Particles for six */}
      {type === "six" &&
        particles.map((p, i) => (
          <motion.div
            key={i}
            className="particle"
            style={{
              left: "50%",
              top: "50%",
              background: i % 2 === 0 ? "#F59E0B" : "#10B981",
              ["--tx" as string]: `${p.tx}px`,
              ["--ty" as string]: `${p.ty}px`,
            }}
            initial={{ x: 0, y: 0, opacity: 1, scale: 1 }}
            animate={{
              x: p.tx,
              y: p.ty,
              opacity: 0,
              scale: 0,
            }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.8, delay: i * 0.02 }}
          />
        ))}
    </div>
  );
}

interface ScoreAnimateProps {
  children: React.ReactNode;
  type: "four" | "six" | "wicket" | "normal";
  className?: string;
}

export function ScoreAnimate({ children, type, className = "" }: ScoreAnimateProps) {
  const variants = {
    // TypeScript inference works better when we explicitly cast the variants
    // as const after definition (below). This ensures the `ease` field is typed
    // correctly for Framer Motion.
    // (The cast is performed when exporting `variants` below.)


    normal: { scale: [1, 1, 1], transition: { duration: 0 } as const },
    four: {
      scale: [1, 1.15, 1],
      transition: { duration: 0.25 } as const,
    },
    six: {
      scale: [1, 1.2, 1],
      transition: { duration: 0.3 } as const,
    },
    wicket: {
      scale: [1, 0.95, 1],
      transition: { duration: 0.2 } as const,
    },
  };

  return (
    <motion.div
      animate={variants[type]}
      className={className}
    >
      {children}
    </motion.div>
  );
}