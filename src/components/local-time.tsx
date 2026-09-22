"use client";

import { useEffect, useState } from "react";

const FORMATS = {
  time: { hour: "numeric", minute: "2-digit" },
  datetime: { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" },
  datetimeWithWeekday: {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit" },
} satisfies Record<string, Intl.DateTimeFormatOptions>;

/**
 * Renders a timestamp in the VISITOR'S timezone. Server components must
 * not format times themselves: the server runs in UTC on Vercel, so
 * families were seeing dose times and activity stamps seven hours off.
 * Renders nothing until mounted, then fills in the local time.
 */
export function LocalTime({
  iso,
  format = "datetime",
}: {
  iso: string;
  format?: keyof typeof FORMATS;
}) {
  const [text, setText] = useState("");
  useEffect(() => {
    setText(new Date(iso).toLocaleString(undefined, FORMATS[format]));
  }, [iso, format]);
  return <>{text}</>;
}
