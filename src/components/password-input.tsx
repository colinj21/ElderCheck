"use client";

import { useState, type InputHTMLAttributes } from "react";
import { Input } from "@/components/ui";

/**
 * Password field with a show/hide toggle. Typing a password on a phone
 * without being able to check it is a common cause of failed signups.
 */
export function PasswordInput(props: InputHTMLAttributes<HTMLInputElement>) {
  const [show, setShow] = useState(false);
  return (
    <div className="relative">
      <Input {...props} type={show ? "text" : "password"} className="pr-20" />
      <button
        type="button"
        onClick={() => setShow((s) => !s)}
        aria-label={show ? "Hide password" : "Show password"}
        className="absolute right-2 top-1/2 min-h-[44px] -translate-y-1/2 px-3 text-[13px] font-medium text-ink-soft hover:text-ink"
      >
        {show ? "Hide" : "Show"}
      </button>
    </div>
  );
}
