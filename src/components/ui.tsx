import { type ButtonHTMLAttributes, type InputHTMLAttributes, type TextareaHTMLAttributes } from "react";
import Link from "next/link";

export function Button({
  className = "",
  variant = "primary",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: "primary" | "secondary" | "ghost" | "danger" }) {
  const base =
    "inline-flex items-center justify-center gap-2 rounded-full px-5 py-3 text-[15px] font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed min-h-[48px]";
  const variants: Record<string, string> = {
    primary: "bg-moss text-paper hover:bg-moss-dark",
    secondary: "bg-transparent text-ink border border-line hover:bg-paper-dim",
    ghost: "bg-transparent text-ink-soft hover:text-ink",
    danger: "bg-brick text-paper hover:opacity-90",
  };
  return <button className={`${base} ${variants[variant]} ${className}`} {...props} />;
}

export function LinkButton({
  href,
  className = "",
  variant = "primary",
  children,
}: {
  href: string;
  className?: string;
  variant?: "primary" | "secondary" | "ghost";
  children: React.ReactNode;
}) {
  const base =
    "inline-flex items-center justify-center gap-2 rounded-full px-5 py-3 text-[15px] font-medium transition-colors min-h-[48px]";
  const variants: Record<string, string> = {
    primary: "bg-moss text-paper hover:bg-moss-dark",
    secondary: "bg-transparent text-ink border border-line hover:bg-paper-dim",
    ghost: "bg-transparent text-ink-soft hover:text-ink",
  };
  return (
    <Link href={href} className={`${base} ${variants[variant]} ${className}`}>
      {children}
    </Link>
  );
}

export function Field({
  label,
  hint,
  error,
  children,
}: {
  label: string;
  hint?: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-[14px] font-medium text-ink">{label}</span>
      {children}
      {hint && !error && <span className="mt-1 block text-[13px] text-ink-soft">{hint}</span>}
      {error && <span role="alert" className="mt-1 block text-[13px] text-brick">{error}</span>}
    </label>
  );
}

export function Input(props: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className={`w-full rounded-xl border border-line bg-white px-4 py-3 text-[16px] text-ink placeholder:text-ink-soft/60 focus:border-moss ${props.className ?? ""}`}
    />
  );
}

export function Textarea(props: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      {...props}
      className={`w-full rounded-xl border border-line bg-white px-4 py-3 text-[16px] text-ink placeholder:text-ink-soft/60 focus:border-moss ${props.className ?? ""}`}
    />
  );
}

export function Card({ className = "", children }: { className?: string; children: React.ReactNode }) {
  return (
    <div className={`rounded-2xl border border-line bg-white p-6 ${className}`}>{children}</div>
  );
}

const statusStyles: Record<string, string> = {
  normal: "bg-moss-light text-moss-dark",
  attention: "bg-amber-light text-amber",
  urgent: "bg-brick-light text-brick",
};

const statusLabels: Record<string, string> = {
  normal: "All normal",
  attention: "Needs attention",
  urgent: "Urgent",
};

export function StatusBadge({ status }: { status: "normal" | "attention" | "urgent" }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[13px] font-medium ${statusStyles[status]}`}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-current" />
      {statusLabels[status]}
    </span>
  );
}

export function EmptyState({
  title,
  body,
  action,
}: {
  title: string;
  body: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-dashed border-line bg-paper-dim/40 p-8 text-center">
      <p className="font-display text-lg text-ink">{title}</p>
      <p className="mx-auto mt-1.5 max-w-sm text-[14px] text-ink-soft">{body}</p>
      {action && <div className="mt-4 flex justify-center">{action}</div>}
    </div>
  );
}

export function Banner({ variant = "info", children }: { variant?: "info" | "error" | "success"; children: React.ReactNode }) {
  const styles: Record<string, string> = {
    info: "bg-paper-dim text-ink-soft",
    error: "bg-brick-light text-brick",
    success: "bg-moss-light text-moss-dark",
  };
  return (
    <div role={variant === "error" ? "alert" : undefined} className={`rounded-xl px-4 py-3 text-[14px] ${styles[variant]}`}>
      {children}
    </div>
  );
}
