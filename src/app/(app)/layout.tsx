import { requireUserContext } from "@/lib/session";
import { createClient } from "@/lib/supabase/server";
import { AppNav } from "@/components/app-nav";

export default async function AppAreaLayout({ children }: { children: React.ReactNode }) {
  const ctx = await requireUserContext();
  const isCaregiver = ctx.households.length === 0 && ctx.caregiverRecipientIds.length > 0;
  const isAdmin = ctx.households.some((h) => h.role === "admin");

  const supabase = await createClient();
  const { count: unreadCount } = await supabase
    .from("notifications")
    .select("id", { count: "exact", head: true })
    .eq("profile_id", ctx.userId)
    .is("read_at", null);

  return (
    <div className="flex min-h-full flex-col">
      <AppNav isCaregiver={isCaregiver} isAdmin={isAdmin} unreadCount={unreadCount ?? 0} />
      <main className="mx-auto w-full max-w-5xl flex-1 px-6 py-8">{children}</main>
    </div>
  );
}
