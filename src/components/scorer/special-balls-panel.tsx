"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useState } from "react";
import type { SpecialBallEvent } from "@/types";

interface SpecialBallsPanelProps {
  specialBalls: SpecialBallEvent[];
  isOpen?: boolean;
}

export function SpecialBallsPanel({ specialBalls, isOpen = true }: SpecialBallsPanelProps) {
  const [expanded, setExpanded] = useState(true);

  if (!isOpen) return null;

  return (
    <div className="flex flex-col gap-2">
      <div
        className="flex items-center justify-between cursor-pointer select-none"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-[#8B5CF6] animate-pulse" />
          <span className="text-xs font-semibold text-[#8B5CF6] uppercase tracking-wide">
            Special Balls
          </span>
        </div>
        <div className="flex items-center gap-2">
          {specialBalls.length > 0 && (
            <span className="text-xs bg-[#8B5CF6]/20 text-[#8B5CF6] px-2 py-0.5 rounded-full font-bold">
              {specialBalls.length}
            </span>
          )}
          <svg
            className={`w-4 h-4 text-[#64748B] transition-transform ${expanded ? "rotate-180" : ""}`}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </div>

      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="flex flex-col gap-2 overflow-hidden"
          >
            {specialBalls.length === 0 ? (
              <div className="text-xs text-[#64748B] py-4 text-center border border-dashed border-[#2D3748] rounded-lg">
                No special balls yet
              </div>
            ) : (
              <AnimatePresence>
                {specialBalls.slice().reverse().map((ball) => (
                  <motion.div
                    key={ball.id}
                    initial={{ x: 50, opacity: 0 }}
                    animate={{ x: 0, opacity: 1 }}
                    exit={{ x: -20, opacity: 0 }}
                    transition={{ type: "spring", stiffness: 400, damping: 25 }}
                    className="special-ball-card"
                  >
                    <div className="flex flex-col gap-1 flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] text-[#64748B]">
                          {ball.over_number}.{ball.ball_number}
                        </span>
                        <span className="rule-name">{ball.rule_name}</span>
                      </div>
                      <div className="text-sm font-semibold text-[#F1F5F9] truncate">
                        {ball.description}
                      </div>
                      {ball.action_type === "bonus_runs" && (
                        <span className="text-xs font-bold text-[#10B981]">
                          +{ball.runs} runs awarded
                        </span>
                      )}
                    </div>
                    <div className="flex items-center">
                      <svg
                        className="w-4 h-4 text-[#8B5CF6]"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M13 10V3L4 14h7v7l9-11h-7z"
                        />
                      </svg>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}