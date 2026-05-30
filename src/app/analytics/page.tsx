'use client';

import React, { useState } from 'react';
import { useScoringStore } from '../../store/useScoringStore';
import {
  Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip
} from 'recharts';
import { HeaderAndDrawer } from '../../components/shared/HeaderAndDrawer';

export default function AnalyticsStudio() {
  const { players, teams } = useScoringStore();
  const [selectedPlayer1Id, setSelectedPlayer1Id] = useState(players[0]?.id || '');
  const [selectedPlayer2Id, setSelectedPlayer2Id] = useState(players[1]?.id || '');
  const [mounted, setMounted] = useState(false);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  const p1 = players.find(p => p.id === selectedPlayer1Id);
  const p2 = players.find(p => p.id === selectedPlayer2Id);

  const t1 = teams.find(t => t.id === p1?.teamId);
  const t2 = teams.find(t => t.id === p2?.teamId);

  const getRadarData = (player: typeof p1) => {
    if (!player) return [];
    let power = 75, timing = 80, rotation = 70, economy = 50, wickets = 40;

    if (player.name.includes('Tendulkar')) { power = 95; timing = 99; rotation = 92; economy = 60; wickets = 65; }
    else if (player.name.includes('Kohli')) { power = 92; timing = 96; rotation = 98; economy = 30; wickets = 20; }
    else if (player.name.includes('Dhoni')) { power = 96; timing = 88; rotation = 94; economy = 45; wickets = 35; }
    else if (player.name.includes('Bumrah')) { power = 30; timing = 40; rotation = 35; economy = 98; wickets = 99; }
    else if (player.name.includes('Sharma')) { power = 98; timing = 92; rotation = 85; economy = 40; wickets = 45; }
    else if (player.name.includes('Yadav')) { power = 97; timing = 95; rotation = 80; economy = 35; wickets = 30; }
    else if (player.name.includes('Jadeja')) { power = 85; timing = 87; rotation = 90; economy = 92; wickets = 88; }

    return [
      { subject: 'Power', A: power, fullMark: 100 },
      { subject: 'Timing', A: timing, fullMark: 100 },
      { subject: 'Rotation', A: rotation, fullMark: 100 },
      { subject: 'Economy', A: economy, fullMark: 100 },
      { subject: 'Wickets', A: wickets, fullMark: 100 },
    ];
  };

  const getComparisonBarData = () => {
    const p1Radar = getRadarData(p1);
    const p2Radar = getRadarData(p2);
    return p1Radar.map((item, idx) => ({
      attribute: item.subject,
      [p1?.name || 'P1']: item.A,
      [p2?.name || 'P2']: p2Radar[idx]?.A || 0
    }));
  };

  const getAiSummary = (player: typeof p1) => {
    if (!player) return 'Select a player.';
    if (player.name.includes('Tendulkar')) return 'Supreme timing and elite strike-rotation. High efficiency against leg-spin. Best utilized as powerplay anchor.';
    if (player.name.includes('Bumrah')) return 'Elite defensive pace asset. Unmatched economy. Extreme efficiency in death overs. Hold overs for pressure moments.';
    if (player.name.includes('Kohli')) return 'Master-class chase efficiency. Unparalleled strike rotation. Maintains high run-rate without high-risk boundaries.';
    if (player.name.includes('Dhoni')) return 'Peak finisher. Excels under high RRR in death overs. Elite glove-work and defensive bowling control.';
    return `${player.name} shows promising metrics across ${player.battingStyle}. Consistent under pressure. Recommend flexible middle-order entry.`;
  };

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col font-sans pb-12">
      <HeaderAndDrawer title="Analytics" activePath="/analytics" />

      <main className="max-w-6xl w-full mx-auto p-4 md:p-6 space-y-6 flex-1">
        {/* Player selectors */}
        <div className="flex flex-col md:flex-row items-center gap-4">
          <div className="flex items-center gap-3 w-full md:w-auto">
            <span className="text-xs text-muted-foreground">P1:</span>
            <select
              value={selectedPlayer1Id}
              onChange={(e) => setSelectedPlayer1Id(e.target.value)}
              className="bg-background border border-white/10 rounded-lg px-3 py-1.5 text-xs font-medium flex-1 md:w-48"
            >
              {players.map(p => (
                <option key={p.id} value={p.id}>{p.name} ({teams.find(t => t.id === p.teamId)?.shortName})</option>
              ))}
            </select>
          </div>
          <span className="text-muted-foreground text-xs font-medium">vs</span>
          <div className="flex items-center gap-3 w-full md:w-auto">
            <span className="text-xs text-muted-foreground">P2:</span>
            <select
              value={selectedPlayer2Id}
              onChange={(e) => setSelectedPlayer2Id(e.target.value)}
              className="bg-background border border-white/10 rounded-lg px-3 py-1.5 text-xs font-medium flex-1 md:w-48"
            >
              {players.map(p => (
                <option key={p.id} value={p.id}>{p.name} ({teams.find(t => t.id === p.teamId)?.shortName})</option>
              ))}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Charts */}
          <div className="lg:col-span-7 space-y-4">
            <div className="rounded-xl glass-card p-5 space-y-3">
              <h3 className="text-xs text-muted-foreground uppercase tracking-wider font-medium">Radar</h3>
              <div className="h-72 max-w-md mx-auto w-full">
                {mounted ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <RadarChart cx="50%" cy="50%" outerRadius="75%" data={getRadarData(p1)}>
                      <PolarGrid stroke="rgba(255,255,255,0.05)" />
                      <PolarAngleAxis dataKey="subject" stroke="#64748b" fontSize={10} />
                      <PolarRadiusAxis angle={30} domain={[0, 100]} stroke="rgba(255,255,255,0.1)" fontSize={8} />
                      <Radar name={p1?.name || 'P1'} dataKey="A" stroke="#0ea5e9" fill="#0ea5e9" fillOpacity={0.2} />
                      <Tooltip contentStyle={{ background: '#0f172a', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px' }} />
                    </RadarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="text-xs text-muted-foreground">Loading...</div>
                )}
              </div>
            </div>

            <div className="rounded-xl glass-card p-5 space-y-3">
              <h3 className="text-xs text-muted-foreground uppercase tracking-wider font-medium">Comparison</h3>
              <div className="h-56">
                {mounted ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={getComparisonBarData()}>
                      <XAxis dataKey="attribute" stroke="#64748b" fontSize={10} />
                      <YAxis stroke="#64748b" fontSize={10} />
                      <Tooltip contentStyle={{ background: '#0f172a', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px' }} />
                      <Bar dataKey={p1?.name || 'P1'} fill="#0ea5e9" radius={[2, 2, 0, 0]} />
                      <Bar dataKey={p2?.name || 'P2'} fill="#10b981" radius={[2, 2, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="text-xs text-muted-foreground">Loading...</div>
                )}
              </div>
            </div>
          </div>

          {/* Player info */}
          <div className="lg:col-span-5 space-y-4">
            <div className="p-4 rounded-xl glass-card">
              <div className="flex items-center gap-3 mb-2">
                <span className="text-xs font-medium bg-foreground/5 px-2 py-0.5 rounded">{t1?.shortName}</span>
                <span className="font-medium text-sm">{p1?.name}</span>
              </div>
              <div className="text-xs text-muted-foreground space-y-0.5">
                <span className="block">Batting: {p1?.battingStyle}</span>
                <span className="block">Bowling: {p1?.bowlingStyle}</span>
              </div>
            </div>

            <div className="p-4 rounded-xl glass-card">
              <div className="flex items-center gap-3 mb-2">
                <span className="text-xs font-medium bg-foreground/5 px-2 py-0.5 rounded">{t2?.shortName}</span>
                <span className="font-medium text-sm">{p2?.name}</span>
              </div>
              <div className="text-xs text-muted-foreground space-y-0.5">
                <span className="block">Batting: {p2?.battingStyle}</span>
                <span className="block">Bowling: {p2?.bowlingStyle}</span>
              </div>
            </div>

            <div className="p-5 rounded-xl glass-card space-y-3">
              <h3 className="text-xs text-emerald-400 uppercase tracking-wider font-medium">AI Insights</h3>
              <div className="space-y-3">
                <div>
                  <span className="text-[10px] text-muted-foreground uppercase tracking-wider font-medium">{p1?.name}</span>
                  <p className="text-xs text-foreground/80 leading-relaxed mt-0.5">{getAiSummary(p1)}</p>
                </div>
                <div>
                  <span className="text-[10px] text-muted-foreground uppercase tracking-wider font-medium">{p2?.name}</span>
                  <p className="text-xs text-foreground/80 leading-relaxed mt-0.5">{getAiSummary(p2)}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
