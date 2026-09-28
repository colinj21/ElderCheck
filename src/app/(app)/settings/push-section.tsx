"use client";

import { useEffect, useState } from "react";
import { Banner, Button, Card } from "@/components/ui";

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  return Uint8Array.from([...rawData].map((c) => c.charCodeAt(0)));
}

type Support = "checking" | "unsupported" | "supported";

export function PushSection() {
  const [support, setSupport] = useState<Support>("checking");
  const [subscribed, setSubscribed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function check() {
      if (
        typeof window === "undefined" ||
        !("serviceWorker" in navigator) ||
        !("PushManager" in window) ||
        !process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
      ) {
        setSupport("unsupported");
        return;
      }
      setSupport("supported");
      try {
        const reg = await navigator.serviceWorker.getRegistration();
        const existing = await reg?.pushManager.getSubscription();
        setSubscribed(Boolean(existing));
      } catch {
        setSubscribed(false);
      }
    }
    check();
  }, []);

  async function enable() {
    setError(null);
    setLoading(true);
    try {
      if (Notification.permission === "denied") {
        setError("Notifications are blocked for this site in your browser settings.");
        setLoading(false);
        return;
      }
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        setError("You'll need to allow notifications to turn this on.");
        setLoading(false);
        return;
      }

      const reg = await navigator.serviceWorker.register("/sw.js");
      await navigator.serviceWorker.ready;
      const subscription = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!) as BufferSource,
      });

      const json = subscription.toJSON();
      await fetch("/api/push/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ endpoint: json.endpoint, keys: json.keys }),
      });

      setSubscribed(true);
    } catch {
      setError("Couldn't turn on push notifications on this device.");
    }
    setLoading(false);
  }

  async function disable() {
    setLoading(true);
    try {
      const reg = await navigator.serviceWorker.getRegistration();
      const existing = await reg?.pushManager.getSubscription();
      if (existing) {
        await fetch("/api/push/unsubscribe", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ endpoint: existing.endpoint }),
        });
        await existing.unsubscribe();
      }
      setSubscribed(false);
    } catch {
      setError("Couldn't turn off push notifications on this device.");
    }
    setLoading(false);
  }

  if (support === "checking") return null;

  return (
    <Card>
      <h2 className="font-display text-lg text-ink">Push notifications</h2>
      {support === "unsupported" ? (
        <p className="mt-1 text-[13px] text-ink-soft">
          This browser doesn't support push notifications. On an iPhone, add ElderCheck to your
          home screen first (from Settings, add it there too), then this option should appear.
        </p>
      ) : (
        <>
          <p className="mt-1 text-[13px] text-ink-soft">
            Get an alert on this device for urgent concerns and missed check-ins, even if the app
            isn't open.
          </p>
          {error && (
            <div className="mt-3">
              <Banner variant="error">{error}</Banner>
            </div>
          )}
          <Button className="mt-4" onClick={subscribed ? disable : enable} disabled={loading}>
            {loading
              ? "Working…"
              : subscribed
                ? "Turn off on this device"
                : "Turn on for this device"}
          </Button>
        </>
      )}
    </Card>
  );
}
