import Link from "next/link";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-full flex-col">
      <header className="px-6 py-5 sm:px-10">
        <Link href="/" className="font-display text-xl tracking-tight text-ink">
          ElderCheck
        </Link>
      </header>
      <main className="flex flex-1 items-start justify-center px-6 pb-16 pt-4 sm:pt-10">
        <div className="w-full max-w-sm">{children}</div>
      </main>
    </div>
  );
}
