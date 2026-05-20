"use client";

import { motion, AnimatePresence } from "framer-motion";
import type { Ball } from "@/types";

interface BallByBallFeedProps {
  balls: Ball[];
  maxVisible?: number;
}

export function BallByBallFeed({ balls, maxVisible = 12 }: BallByBallFeedProps) {
  const visibleBalls = balls.slice(-maxVisible).reverse();

  return (
    <div>
      <div className="text-xs font-semibold text-[#64748B] uppercase tracking-wide mb-2">
        Recent Balls
      </div>
      <div className="space-y-1 max-h-64 overflow-y-auto">
        <AnimatePresence>
          {visibleBalls.map((ball, index) => {
            const isRule = ball.custom_rule_triggered_id;
            const isWicket = !!ball.dismissal_type;
            const isFour = ball.runs === 4;
            const isSix = ball.runs === 6;
            const isWide = ball.extras_type === "wide";
            const isNoball = ball.extras_type === "no_ball";

            let content = "";
            let bgClass = "bg-transparent";
            let textClass = "text-[#94A3B8]";

            if (isWicket) {
              content = `W — ${ball.dismissal_type}`;
              textClass = "text-[#EF4444] font-semibold";
            } else if (isRule) {
              content = `${ball.runs} — ${ball.special_ball_description}`;
              textClass = "text-[#8B5CF6]";
              bgClass = "bg-[#8B5CF6]/5";
            } else if (isSix) {
              content = "SIX!";
              textClass = "text-[#F59E0B] font-bold";
            } else if (isFour) {
              content = "FOUR!";
              textClass = "text-[#10B981] font-bold";
            } else if (isWide) {
              content = `Wide +${ball.runs}`;
              textClass = "text-[#8B5CF6]";
            } else if (isNoball) {
              content = `No Ball +${ball.runs}`;
              textClass = "text-[#8B5CF6]";
            } else if (ball.runs > 0) {
              content = `${ball.runs} run${ball.runs > 1 ? "s" : ""}`;
              textClass = "text-[#F1F5F9]";
            } else {
              content = "Dot ball";
              textClass = "text-[#64748B]";
            }

            return (
              <motion.div
                key={ball.id}
                initial={{ x: 20, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                transition={{ duration: 0.2, delay: index * 0.03 }}
                className={`flex items-center justify-between py-2 px-3 rounded-lg ${bgClass} ${index === 0 ? "bg-[#232738]" : ""}`}
              >
                <div className="flex items-center gap-3">
                  <span className="text-xs font-mono text-[#64748B] w-10">
                    {ball.over_number}.{ball.ball_number}
                  </span>
                  <span className={`text-sm ${textClass}`}>
                    {content}
                  </span>
                </div>
                {isRule && (
                  <span className="text-[10px] bg-[#8B5CF6]/20 text-[#8B5CF6] px-2 py-0.5 rounded font-semibold">
                    RULE
                  </span>
                )}
                {isSix && (
                  <span className="text-[#F59E0B]">🔥</span>
                )}
                {isFour && (
                  <span className="text-[#10B981]">💥</span>
                )}
              </motion.div>
            );
          })}
        </AnimatePresence>

        {balls.length === 0 && (
          <div className="text-center py-8 text-[#64748B] text-sm">
            No balls recorded yet. Start scoring!
          </div>
        )}
      </div>
    </div>
  );
}