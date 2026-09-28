"use client";

import { Button } from "@/components/ui";

export function PrintButton() {
  return (
    <Button onClick={() => window.print()} className="px-4 py-2 min-h-0 text-[13px]">
      Print / Save as PDF
    </Button>
  );
}
