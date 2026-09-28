import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { requireUserContext } from "@/lib/session";

function csvEscape(value: string): string {
  if (/[",\n]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

export async function GET() {
  const ctx = await requireUserContext();
  const supabase = await createClient();

  let householdRecipientIds: string[] = [];
  if (ctx.households.length > 0) {
    const { data } = await supabase
      .from("care_recipients")
      .select("id")
      .in(
        "household_id",
        ctx.households.map((h) => h.id)
      );
    householdRecipientIds = (data ?? []).map((r) => r.id as string);
  }

  const visibleRecipientIds = Array.from(
    new Set([...ctx.caregiverRecipientIds, ...householdRecipientIds])
  );

  if (visibleRecipientIds.length === 0) {
    return new NextResponse("date,recipient,caregiver,hours,notes\n", {
      headers: { "Content-Type": "text/csv; charset=utf-8" },
    });
  }

  const { data: entries } = await supabase
    .from("caregiver_hours")
    .select(
      "work_date, hours, notes, care_recipients:care_recipient_id(full_name, preferred_name), profiles:caregiver_id(full_name)"
    )
    .in("care_recipient_id", visibleRecipientIds)
    .order("work_date", { ascending: false })
    .limit(2000);

  const rows = (entries ?? []).map((e) => {
    const recipient = Array.isArray(e.care_recipients) ? e.care_recipients[0] : e.care_recipients;
    const caregiver = Array.isArray(e.profiles) ? e.profiles[0] : e.profiles;
    const recipientName = recipient?.preferred_name || recipient?.full_name || "";
    const caregiverName = caregiver?.full_name || "";
    return [
      e.work_date,
      csvEscape(recipientName),
      csvEscape(caregiverName),
      Number(e.hours).toFixed(2),
      csvEscape(e.notes ?? ""),
    ].join(",");
  });

  const csv = ["date,recipient,caregiver,hours,notes", ...rows].join("\n") + "\n";

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="eldercheck-hours-${new Date().toISOString().slice(0, 10)}.csv"`,
    },
  });
}
