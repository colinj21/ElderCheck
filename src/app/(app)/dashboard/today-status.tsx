"use client";

import { useEffect, useState } from "react";

export function TodayStatusBanner({
  urgentCount,
  attentionCount,
  namesMissingCheckin,
}: {
  urgentCount: number;
  attentionCount: number;
  namesMissingCheckin: string[];
}) {
  // Whether to treat "no check-in yet" as worth flagging depends on what
  // time it is for the person looking at the screen, which the server
  // doesn't know. We compute that locally instead of guessing a timezone.
  const [pastExpectedHour, setPastExpectedHour] = useState(false);

  useEffect(() => {
    const hour = new Date().getHours();
    setPastExpectedHour(hour >= 18);
  }, []);

  const missingAndLate = pastExpectedHour ? namesMissingCheckin : [];

  let level: "green" | "yellow" | "red" = "green";
  if (urgentCount > 0) level = "red";
  else if (attentionCount > 0 || missingAndLate.length > 0) level = "yellow";

  const styles = {
    green: { bg: "bg-moss-light", text: "text-moss-dark", dot: "bg-moss-dark" },
    yellow: { bg: "bg-amber-light", text: "text-amber", dot: "bg-amber" },
    red: { bg: "bg-brick-light", text: "text-brick", dot: "bg-brick" },
  }[level];

  let message: string;
  if (level === "red") {
    message =
      urgentCount === 1
        ? "1 urgent concern needs attention"
        : `${urgentCount} urgent concerns need attention`;
  } else if (level === "yellow" && attentionCount > 0) {
    message =
      attentionCount === 1
        ? "1 concern is flagged for review"
        : `${attentionCount} concerns are flagged for review`;
  } else if (level === "yellow") {
    message =
      missingAndLate.length === 1
        ? `${missingAndLate[0]} hasn't had a check-in yet today`
        : `${missingAndLate.length} people haven't had a check-in yet today`;
  } else {
    message = "Everything looks good today";
  }

  return (
    <div className={`flex items-center gap-3 rounded-2xl px-5 py-4 ${styles.bg}`}>
      <span className={`h-3 w-3 flex-shrink-0 rounded-full ${styles.dot}`} />
      <div>
        <p className={`text-[12px] font-medium uppercase tracking-[0.12em] ${styles.text}`}>
          Today&apos;s status
        </p>
        <p className={`mt-0.5 text-[15px] font-medium ${styles.text}`}>{message}</p>
      </div>
    </div>
  );
}
