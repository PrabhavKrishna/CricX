"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { PlusIcon, XIcon, UserIcon } from "@/components/ui/icons";

interface PlayerInput {
  name: string;
  batting_style: 'RHB' | 'LHB';
  bowling_style: string;
}

export function BulkPlayerManager({ onSave }: { onSave: (players: PlayerInput[]) => void }) {
  const [players, setPlayers] = useState<PlayerInput[]>([
    { name: "", batting_style: "RHB", bowling_style: "" }
  ]);

  const addPlayerRow = () => {
    setPlayers([...players, { name: "", batting_style: "RHB", bowling_style: "" }]);
  };

  const removePlayerRow = (index: number) => {
    setPlayers(players.filter((_, i) => i !== index));
  };

  const updatePlayer = (index: number, field: keyof PlayerInput, value: string) => {
    const newPlayers = [...players];
    newPlayers[index] = { ...newPlayers[index], [field]: value };
    setPlayers(newPlayers);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-xl font-bold text-text text-glow-primary">Team Roster</h3>
          <p className="text-sm text-text-muted">Add your squad members below</p>
        </div>
        <button 
          type="button" 
          onClick={addPlayerRow}
          className="btn btn-secondary flex items-center gap-2 border-primary/30 hover:border-primary"
        >
          <PlusIcon className="w-4 h-4" />
          Add Player
        </button>
      </div>

      <div className="space-y-3">
        <AnimatePresence initial={false}>
          {players.map((player, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, x: -20, scale: 0.95 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, x: 20, scale: 0.95 }}
              className="card p-4 flex items-center gap-4 bg-surface/40 hover:bg-surface/60 transition-colors"
            >
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary border border-primary/20">
                <UserIcon className="w-5 h-5" />
              </div>

              <div className="flex-1 grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="text-[10px] uppercase font-bold text-text-muted mb-1 block">Player Name</label>
                  <input
                    type="text"
                    value={player.name}
                    onChange={(e) => updatePlayer(index, "name", e.target.value)}
                    placeholder="Full Name"
                    className="input input-marvelous py-2 text-sm"
                  />
                </div>

                <div>
                  <label className="text-[10px] uppercase font-bold text-text-muted mb-1 block">Batting</label>
                  <select
                    value={player.batting_style}
                    onChange={(e) => updatePlayer(index, "batting_style", e.target.value as 'RHB' | 'LHB')}
                    className="input input-marvelous py-2 text-sm appearance-none"
                  >
                    <option value="RHB">Right Handed</option>
                    <option value="LHB">Left Handed</option>
                  </select>
                </div>

                <div>
                  <label className="text-[10px] uppercase font-bold text-text-muted mb-1 block">Bowling</label>
                  <input
                    type="text"
                    value={player.bowling_style}
                    onChange={(e) => updatePlayer(index, "bowling_style", e.target.value)}
                    placeholder="e.g. Right arm fast"
                    className="input input-marvelous py-2 text-sm"
                  />
                </div>
              </div>

              {players.length > 1 && (
                <button
                  type="button"
                  onClick={() => removePlayerRow(index)}
                  className="w-10 h-10 rounded-xl flex items-center justify-center text-danger/60 hover:text-danger hover:bg-danger/10 transition-all"
                >
                  <XIcon className="w-5 h-5" />
                </button>
              )}
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      <div className="pt-4">
        <button
          type="button"
          onClick={() => onSave(players.filter(p => p.name.trim() !== ""))}
          className="btn btn-primary w-full py-4 shadow-lg shadow-primary/20"
        >
          Save Complete Roster
        </button>
      </div>
    </div>
  );
}
