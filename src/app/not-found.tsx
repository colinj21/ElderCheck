import { LinkButton } from "@/components/ui";

export default function NotFound() {
  return (
    <div className="flex min-h-[70vh] flex-col items-center justify-center px-6 text-center">
      <p className="text-[13px] font-medium uppercase tracking-[0.2em] text-moss-dark">404</p>
      <h1 className="mt-3 font-display text-2xl text-ink">We couldn't find that page</h1>
      <p className="mt-2 max-w-sm text-[15px] text-ink-soft">
        The link might be old, or the page may have moved.
      </p>
      <div className="mt-6">
        <LinkButton href="/dashboard">Go to dashboard</LinkButton>
      </div>
    </div>
  );
}
