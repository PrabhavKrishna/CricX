import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase-server";
import { UsersIcon, TrophyIcon, ZapIcon, GlobeIcon } from "@/components/ui/icons";

export default async function LandingPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (user) {
    redirect("/dashboard");
  }

  return (
    <div className="min-h-screen bg-[#0F1117]">
      {/* Nav */}
      <nav className="flex items-center justify-between px-8 py-6 border-b border-[#2D3748]">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#10B981] flex items-center justify-center">
            <span className="text-xl">🏏</span>
          </div>
          <span className="text-xl font-bold text-[#F1F5F9]">CricX</span>
        </div>
        <div className="flex items-center gap-4">
          <Link href="/auth/login" className="px-5 py-2 text-sm text-[#94A3B8] hover:text-[#F1F5F9] transition-colors">
            Sign In
          </Link>
          <Link href="/auth/signup" className="btn btn-primary text-sm">
            Get Started
          </Link>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative px-8 py-24 max-w-6xl mx-auto text-center">
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-20 left-1/4 w-96 h-96 bg-[#10B981]/5 rounded-full blur-3xl" />
          <div className="absolute bottom-20 right-1/4 w-96 h-96 bg-[#8B5CF6]/5 rounded-full blur-3xl" />
        </div>

        <div className="relative z-10">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-[#10B981]/10 border border-[#10B981]/20 rounded-full mb-6">
            <span className="text-[#10B981] text-sm font-semibold">⚡ Now in public beta</span>
          </div>

          <h1 className="text-5xl md:text-7xl font-bold text-[#F1F5F9] mb-6 leading-tight">
            Score Your Way.<br />
            <span className="text-[#10B981]">Play Your Rules.</span>
          </h1>

          <p className="text-xl text-[#64748B] max-w-2xl mx-auto mb-10">
            The first cricket scoring platform where YOU define the rules. Powerplay bonuses,
            six multipliers, hat-trick rewards — if you can dream it, CricX enforces it.
          </p>

          <div className="flex items-center justify-center gap-4">
            <Link href="/auth/signup" className="btn btn-primary text-base px-8 py-4">
              Start Scoring Free
            </Link>
            <Link href="/discover" className="btn btn-secondary text-base px-8 py-4">
              See Live Matches
            </Link>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="px-8 py-24 max-w-6xl mx-auto">
        <div className="text-center mb-16">
          <h2 className="text-3xl font-bold text-[#F1F5F9] mb-4">Everything a modern scorer needs</h2>
          <p className="text-[#64748B]">From neighborhood games to tournament finals</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[
            {
              icon: <ZapIcon className="w-6 h-6" />,
              color: "text-[#10B981]",
              bg: "bg-[#10B981]/10",
              title: "Custom Rules Engine",
              desc: "Build any rule you can imagine. Conditional bonuses, penalties, celebrations — all visual, no code.",
            },
            {
              icon: <UsersIcon className="w-6 h-6" />,
              color: "text-[#8B5CF6]",
              bg: "bg-[#8B5CF6]/10",
              title: "Team & Player Management",
              desc: "Build rosters, track stats across matches, discover teams in your community.",
            },
            {
              icon: <TrophyIcon className="w-6 h-6" />,
              color: "text-[#F59E0B]",
              bg: "bg-[#F59E0B]/10",
              title: "Full Scorecard + NRR",
              desc: "Live scoring with fall of wickets, partnerships, bowling figures, NRR calculator, and DLS support.",
            },
            {
              icon: (
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                </svg>
              ),
              color: "text-[#10B981]",
              bg: "bg-[#10B981]/10",
              title: "Live Shareable Scorecards",
              desc: "Anyone with the link can follow the match live. Broadcast-quality scorecards, no account needed.",
            },
            {
              icon: <GlobeIcon className="w-6 h-6" />,
              color: "text-[#8B5CF6]",
              bg: "bg-[#8B5CF6]/10",
              title: "Community Discovery",
              desc: "Browse public matches, clone rules from other games, follow your favorite teams.",
            },
            {
              icon: (
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                </svg>
              ),
              color: "text-[#F59E0B]",
              bg: "bg-[#F59E0B]/10",
              title: "Exciting Animations",
              desc: "Six celebrations, wicket flashes, rule-trigger highlights. Make scoring as fun as playing.",
            },
          ].map((feature, i) => (
            <div key={i} className="card p-6 hover:border-[#3D4758] transition-all">
              <div className={`w-12 h-12 rounded-xl ${feature.bg} ${feature.color} flex items-center justify-center mb-4`}>
                {feature.icon}
              </div>
              <h3 className="text-lg font-semibold text-[#F1F5F9] mb-2">{feature.title}</h3>
              <p className="text-sm text-[#64748B] leading-relaxed">{feature.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Rule example */}
      <section className="px-8 py-24 max-w-6xl mx-auto">
        <div className="bg-[#1A1D27] border border-[#2D3748] rounded-2xl p-8 relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-r from-[#8B5CF6]/5 to-transparent" />
          <div className="relative z-10">
            <div className="text-xs font-semibold text-[#8B5CF6] uppercase tracking-wide mb-3">Example Rule</div>
            <h3 className="text-2xl font-bold text-[#F1F5F9] mb-4">&quot;When Player X hits a Six, the team gets only 3 runs&quot;</h3>
            <p className="text-[#64748B] mb-6 max-w-2xl">
              With CricX&apos;s rule builder, creating this is as simple as: select the condition (batsman = Player X, runs = 6), choose the action (set runs to 3). The rule engine handles everything automatically during live scoring.
            </p>
            <div className="flex items-center gap-3">
              <span className="badge badge-accent">Player X</span>
              <span className="text-[#64748B]">+</span>
              <span className="badge badge-secondary">Six Hit</span>
              <span className="text-[#64748B]">→</span>
              <span className="badge badge-primary">3 Runs Awarded</span>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="px-8 py-24 max-w-4xl mx-auto text-center">
        <h2 className="text-4xl font-bold text-[#F1F5F9] mb-4">Ready to revolutionize your cricket games?</h2>
        <p className="text-lg text-[#64748B] mb-8">Join thousands of teams scoring with custom rules</p>
        <Link href="/auth/signup" className="btn btn-primary text-lg px-10 py-4">
          Create Free Account
        </Link>
      </section>

      {/* Footer */}
      <footer className="border-t border-[#2D3748] px-8 py-8 text-center text-sm text-[#64748B]">
        <p>© 2026 CricX. Built for cricket lovers everywhere. 🏏</p>
      </footer>
    </div>
  );
}