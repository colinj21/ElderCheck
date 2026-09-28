import "server-only";
import webpush from "web-push";
import { createAdminClient } from "@/lib/supabase/admin";

let configured = false;
function ensureConfigured() {
  if (configured) return true;
  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  const subject = process.env.VAPID_SUBJECT;
  if (!publicKey || !privateKey || !subject) return false;
  webpush.setVapidDetails(subject, publicKey, privateKey);
  configured = true;
  return true;
}

export function isPushConfigured(): boolean {
  return ensureConfigured();
}

type PushPayload = {
  title: string;
  body: string;
  url?: string;
};

/**
 * Sends a web push notification to every subscribed device for the given
 * profiles. Best-effort: a failed send for one device is logged and
 * skipped rather than throwing, and a subscription the push service says
 * is gone (410/404) is deleted so we stop retrying it.
 */
export async function sendPushToProfiles(profileIds: string[], payload: PushPayload) {
  if (profileIds.length === 0) return;
  if (!ensureConfigured()) {
    console.warn("[push] VAPID keys not configured -- skipped push send");
    return;
  }

  const admin = createAdminClient();
  const uniqueIds = Array.from(new Set(profileIds));
  const { data: subscriptions } = await admin
    .from("push_subscriptions")
    .select("id, endpoint, p256dh, auth")
    .in("profile_id", uniqueIds);

  if (!subscriptions || subscriptions.length === 0) return;

  const body = JSON.stringify(payload);

  await Promise.all(
    subscriptions.map(async (sub) => {
      try {
        await webpush.sendNotification(
          {
            endpoint: sub.endpoint,
            keys: { p256dh: sub.p256dh, auth: sub.auth },
          },
          body
        );
      } catch (err) {
        const statusCode = (err as { statusCode?: number }).statusCode;
        if (statusCode === 404 || statusCode === 410) {
          await admin.from("push_subscriptions").delete().eq("id", sub.id);
        } else {
          console.error("[push] Failed to send push:", err);
        }
      }
    })
  );
}
