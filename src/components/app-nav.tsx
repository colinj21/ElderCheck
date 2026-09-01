"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export function AppNav({
  isCaregiver,
  isAdmin,
  unreadCount = 0,
}: {
  isCaregiver: boolean;
  isAdmin: boolean;
  unreadCount?: number;
}) {
  const pathname = usePathname();
  const router = useRouter();

  const links = isCaregiver
    ? [{ href: "/dashboard", label: "Your check-ins" }]
    : [
        { href: "/dashboard", label: "Dashboard" },
        { href: "/history", label: "History" },
        ...(isAdmin ? [{ href: "/invite", label: "Invite" }] : []),
        { href: "/settings", label: "Settings" },
      ];

  async function logout() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <header className="border-b border-line bg-paper/95 backdrop-blur">
      <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
        <Link href="/dashboard" className="font-display text-lg tracking-tight text-ink">
          ElderCheck
        </Link>
        <nav className="flex items-center gap-1">
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={`rounded-full px-3.5 py-2 text-[14px] font-medium transition-colors ${
                pathname === link.href
                  ? "bg-moss-light text-moss-dark"
                  : "text-ink-soft hover:text-ink"
              }`}
            >
              {link.label}
            </Link>
          ))}
          <Link
            href="/notifications"
            aria-label="Notifications"
            className={`relative rounded-full px-3.5 py-2 text-[14px] font-medium transition-colors ${
              pathname === "/notifications"
                ? "bg-moss-light text-moss-dark"
                : "text-ink-soft hover:text-ink"
            }`}
          >
            Alerts
            {unreadCount > 0 && (
              <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-brick px-1 text-[10px] font-semibold text-paper">
                {unreadCount > 9 ? "9+" : unreadCount}
              </span>
            )}
          </Link>
          <button
            onClick={logout}
            className="ml-2 rounded-full px-3.5 py-2 text-[14px] font-medium text-ink-soft hover:text-ink"
          >
            Log out
          </button>
        </nav>
      </div>
    </header>
  );
}
