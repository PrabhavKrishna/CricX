"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { HomeIcon, CricketBallIcon, UsersIcon, ZapIcon, GlobeIcon, SettingsIcon, LogOutIcon } from "@/components/ui/icons";
import { useAuth } from "@/components/providers";

const navItems = [
  { href: "/dashboard", icon: HomeIcon, label: "Dashboard" },
  { href: "/matches", icon: CricketBallIcon, label: "Matches" },
  { href: "/teams", icon: UsersIcon, label: "Teams" },
  { href: "/create/rule", icon: ZapIcon, label: "My Rules" },
  { href: "/discover", icon: GlobeIcon, label: "Discover" },
];

export default function DashboardNav() {
  const pathname = usePathname();
  const router = useRouter();
  const { signOut } = useAuth();

  const handleSignOut = async () => {
    await signOut();
    router.push("/");
  };

  return (
    <aside className="w-64 bg-[#1A1D27] border-r border-[#2D3748] flex flex-col h-screen sticky top-0">
      {/* Logo */}
      <div className="flex items-center gap-3 px-6 py-5 border-b border-[#2D3748]">
        <div className="w-10 h-10 rounded-xl bg-[#10B981] flex items-center justify-center">
          <span className="text-xl">🏏</span>
        </div>
        <span className="text-xl font-bold text-[#F1F5F9]">CricX</span>
      </div>

      {/* Nav items */}
      <nav className="flex-1 px-4 py-6 space-y-1">
        {navItems.map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(item.href + "/");
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`nav-item ${isActive ? "active" : ""}`}
            >
              <item.icon className="w-5 h-5" />
              {item.label}
            </Link>
          );
        })}
      </nav>

      {/* Bottom section */}
      <div className="px-4 py-6 border-t border-[#2D3748] space-y-1">
        <Link href="/settings" className="nav-item">
          <SettingsIcon className="w-5 h-5" />
          Settings
        </Link>
        <button onClick={handleSignOut} className="nav-item w-full text-left text-[#EF4444]/70 hover:text-[#EF4444]">
          <LogOutIcon className="w-5 h-5" />
          Sign Out
        </button>
      </div>
    </aside>
  );
}