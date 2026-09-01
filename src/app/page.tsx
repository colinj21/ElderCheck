import { LinkButton } from "@/components/ui";

export default function LandingPage() {
  return (
    <div className="flex min-h-full flex-col">
      <header className="flex items-center justify-between px-6 py-5 sm:px-10">
        <span className="font-display text-xl tracking-tight">ElderCheck</span>
        <nav className="flex items-center gap-3">
          <LinkButton href="/login" variant="ghost">
            Log in
          </LinkButton>
          <LinkButton href="/signup" variant="primary">
            Get started
          </LinkButton>
        </nav>
      </header>

      <main className="flex-1">
        <section className="mx-auto max-w-3xl px-6 pt-10 pb-16 text-center sm:pt-16 sm:pb-24">
          <p className="mb-4 text-[13px] font-medium uppercase tracking-[0.2em] text-moss-dark">
            For families caring from a distance
          </p>
          <h1 className="font-display text-4xl leading-tight text-ink sm:text-5xl">
            Peace of mind, every day.
          </h1>
          <p className="mx-auto mt-5 max-w-xl text-[17px] leading-relaxed text-ink-soft">
            ElderCheck brings caregivers and family onto one simple, private page: a short
            daily check-in, a clear history, and a gentle nudge the moment something
            needs attention.
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <LinkButton href="/signup" variant="primary">
              Create a family account
            </LinkButton>
            <LinkButton href="/login" variant="secondary">
              I already have an account
            </LinkButton>
          </div>
        </section>

        <section className="border-y border-line bg-paper-dim/50">
          <div className="mx-auto grid max-w-4xl gap-8 px-6 py-14 sm:grid-cols-3">
            <Feature
              eyebrow="Every morning"
              title="A two-minute check-in"
              body="Caregivers answer a short, focused set of questions about wellbeing, meals, medication, and mood — right from their phone."
            />
            <Feature
              eyebrow="One shared view"
              title="A history you can trust"
              body="Every visit, note, and check-in lands in one timeline the whole family can see — no more piecing things together over text."
            />
            <Feature
              eyebrow="When it matters"
              title="Alerts, not noise"
              body="If something looks off, it shows up on the family dashboard right away, with context — not a flood of routine updates."
            />
          </div>
        </section>

        <section className="mx-auto max-w-2xl px-6 py-14 text-center">
          <h2 className="font-display text-2xl text-ink">Built around three roles</h2>
          <p className="mx-auto mt-3 max-w-lg text-[15px] text-ink-soft">
            A family admin sets everything up and invites people in. Family members stay
            in the loop. Caregivers see only what they need to do their job well.
          </p>
        </section>
      </main>

      <footer className="border-t border-line px-6 py-8 text-center text-[13px] text-ink-soft">
        <p>
          ElderCheck is not an emergency response or medical monitoring service. If you
          believe someone is experiencing a medical emergency, call 911 or your local
          emergency service.
        </p>
        <p className="mt-3">
          <a href="/legal" className="underline underline-offset-2">
            Privacy &amp; terms
          </a>
        </p>
      </footer>
    </div>
  );
}

function Feature({ eyebrow, title, body }: { eyebrow: string; title: string; body: string }) {
  return (
    <div className="text-left">
      <p className="text-[12px] font-medium uppercase tracking-[0.15em] text-moss-dark">
        {eyebrow}
      </p>
      <h3 className="mt-2 font-display text-lg text-ink">{title}</h3>
      <p className="mt-1.5 text-[14px] leading-relaxed text-ink-soft">{body}</p>
    </div>
  );
}
