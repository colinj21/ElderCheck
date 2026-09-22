import { createClient } from "@/lib/supabase/server";
import { requireUserContext } from "@/lib/session";
import { Card, EmptyState } from "@/components/ui";
import { MarkAllReadButton } from "./mark-all-read-button";
import { LocalTime } from "@/components/local-time";
import type { AppNotification } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function NotificationsPage() {
  await requireUserContext();
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: notifications } = await supabase
    .from("notifications")
    .select("*")
    .eq("profile_id", user!.id)
    .order("created_at", { ascending: false })
    .limit(50);

  const hasUnread = (notifications ?? []).some((n) => !n.read_at);

  return (
    <div className="mx-auto max-w-lg space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl text-ink">Notifications</h1>
          <p className="mt-1 text-[14px] text-ink-soft">Updates from your household.</p>
        </div>
        {hasUnread && <MarkAllReadButton />}
      </div>

      {!notifications || notifications.length === 0 ? (
        <EmptyState
          title="Nothing here yet"
          body="You'll see check-ins, concerns, and other updates from your household here."
        />
      ) : (
        <div className="space-y-2">
          {(notifications as AppNotification[]).map((n) => (
            <Card key={n.id} className={n.read_at ? "opacity-70" : undefined}>
              <div className="flex items-start gap-3">
                {!n.read_at && <span className="mt-1.5 h-2 w-2 flex-shrink-0 rounded-full bg-moss" />}
                <div className={n.read_at ? "" : "flex-1"}>
                  <p className="text-[14px] text-ink">{n.title}</p>
                  {n.body && <p className="mt-1 text-[13px] text-ink-soft">{n.body}</p>}
                  <p className="mt-1 text-[12px] text-ink-soft">
                    <LocalTime iso={n.created_at} format="datetime" />
                  </p>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
