'use client';

import React, { useState, useEffect } from 'react';
import { useScoringStore } from '../../store/useScoringStore';
import {
  Menu, Sun, Moon, Trophy, Zap, Activity,
  LogOut, KeyRound, X, LayoutDashboard
} from 'lucide-react';
import Link from 'next/link';
import { useAppSession } from '../../app/SessionContext';

interface HeaderAndDrawerProps {
  title?: string;
  activePath?: string;
}

export const HeaderAndDrawer: React.FC<HeaderAndDrawerProps> = ({
  title = "Centre",
  activePath = "/"
}) => {
  const { currentUser, syncSessionUser } = useScoringStore();
  const session = useAppSession();

  useEffect(() => {
    if (session?.user) {
      syncSessionUser(
        session.user.email as string,
        session.user.name as string,
        (session.user as any).image as string
      );
    }
  }, [session]);

  const [theme, setTheme] = useState<'dark' | 'light'>('dark');
  const [drawerOpen, setDrawerOpen] = useState(false);

  useEffect(() => {
    const savedTheme = localStorage.getItem('theme') as 'dark' | 'light' | null;
    const initialTheme = savedTheme || 'dark';
    setTheme(initialTheme);
    if (initialTheme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, []);

  const toggleTheme = () => {
    const nextTheme = theme === 'dark' ? 'light' : 'dark';
    setTheme(nextTheme);
    localStorage.setItem('theme', nextTheme);

    if (nextTheme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  };


  const navItems = [
    { path: '/', label: 'Dashboard', icon: LayoutDashboard },
    { path: '/scorer', label: 'Scorer', icon: Zap },
    { path: '/tournaments', label: 'Tournaments', icon: Trophy },
    { path: '/analytics', label: 'Analytics', icon: Activity },
  ];

  return (
    <>
      <header className="px-4 md:px-6 py-3 glass-card border-b border-white/5 flex items-center justify-between sticky top-0 z-40">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setDrawerOpen(true)}
            className="p-2 rounded-lg bg-foreground/5 hover:bg-foreground/10 text-foreground transition"
            aria-label="Open Navigation Drawer"
          >
            <Menu className="w-5 h-5" />
          </button>

          <Link href="/" className="font-display font-bold text-lg tracking-tight text-foreground">
            cricX
          </Link>

          <span className="hidden sm:block h-4 w-px bg-foreground/10" />

          <span className="hidden sm:block text-xs text-muted-foreground">
            {title}
          </span>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={toggleTheme}
            className="p-2 rounded-lg bg-foreground/5 hover:bg-foreground/10 text-foreground transition"
            title={theme === 'dark' ? "Light mode" : "Dark mode"}
          >
            {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </button>

          {currentUser ? (
            <div className="flex items-center gap-2 bg-foreground/5 border border-foreground/10 px-2.5 py-1 rounded-lg text-xs transition-colors">
              <span className="font-medium text-foreground">{currentUser.name.split(' ')[0]}</span>
              <a
                href="/api/auth/signout"
                className="text-slate-400 hover:text-foreground"
                title="Sign out"
              >
                <LogOut className="w-3.5 h-3.5" />
              </a>
            </div>
          ) : (
            <a
              href="/api/auth/signin/google"
              className="px-3 py-1.5 rounded-lg bg-foreground text-background font-medium text-xs hover:opacity-90 transition flex items-center gap-1.5"
            >
              <KeyRound className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Login</span>
            </a>
          )}
        </div>
      </header>

      {drawerOpen && (
        <div className="fixed inset-0 z-50 flex">
          <div
            onClick={() => setDrawerOpen(false)}
            className="fixed inset-0 bg-black/40 backdrop-blur-sm transition-opacity"
          />

          <div className="relative w-64 max-w-xs bg-background border-r border-border flex flex-col justify-between p-5 z-10 shadow-2xl">
            <div className="space-y-6">
              <div className="flex items-center justify-between pb-4 border-b border-white/5">
                <span className="font-display font-bold text-lg tracking-tight text-foreground">
                  cricX
                </span>
                <button
                  onClick={() => setDrawerOpen(false)}
                  className="p-1 rounded-md bg-foreground/5 text-muted-foreground hover:text-foreground transition"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <nav className="space-y-1">
                {navItems.map((item) => (
                  <Link
                    key={item.path}
                    href={item.path}
                    onClick={() => setDrawerOpen(false)}
                    className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition ${activePath === item.path ? 'bg-foreground/10 text-foreground' : 'text-muted-foreground hover:bg-foreground/5 hover:text-foreground'}`}
                  >
                    <item.icon className="w-4 h-4 shrink-0" />
                    <span>{item.label}</span>
                  </Link>
                ))}
              </nav>
            </div>

            <div className="pt-4 border-t border-white/5 space-y-3">
              {currentUser ? (
                <div className="text-xs text-muted-foreground">
                  <span className="font-medium text-foreground block">{currentUser.name}</span>
                  <span className="uppercase tracking-wide">{currentUser.role}</span>
                </div>
              ) : (
                <a
                  href="/api/auth/signin/google"
                  className="block w-full text-center py-2 rounded-lg bg-foreground text-background font-medium text-xs hover:opacity-90 transition"
                >
                  Login
                </a>
              )}
            </div>
          </div>
        </div>
      )}


    </>
  );
};
