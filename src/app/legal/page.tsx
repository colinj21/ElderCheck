export default function LegalPage() {
  return (
    <div className="mx-auto max-w-2xl px-6 py-14">
      <h1 className="font-display text-2xl text-ink">Privacy &amp; terms</h1>

      <div className="mt-6 rounded-xl bg-brick-light p-4 text-[14px] text-brick">
        ElderCheck is not an emergency response or medical monitoring service. If you
        believe someone is experiencing a medical emergency, call 911 or your local
        emergency service.
      </div>

      <div className="mt-8 space-y-6 text-[15px] leading-relaxed text-ink-soft">
        <section>
          <h2 className="font-display text-lg text-ink">What ElderCheck is</h2>
          <p className="mt-2">
            ElderCheck helps families coordinate caregiving through daily check-ins,
            notes, and a shared history. It is a communication tool, not a medical
            device, diagnostic service, or emergency monitoring system. ElderCheck does
            not evaluate, diagnose, or treat any medical condition, and no content
            generated in the product should be treated as medical advice.
          </p>
        </section>

        <section>
          <h2 className="font-display text-lg text-ink">Data we collect</h2>
          <p className="mt-2">
            We collect only what's needed to run the product: account information,
            household and care-recipient details you provide, check-in responses,
            notes, and basic usage data required for security (like login timestamps).
            We do not use advertising trackers or session-recording tools on
            authenticated pages.
          </p>
        </section>

        <section>
          <h2 className="font-display text-lg text-ink">Who can see what</h2>
          <p className="mt-2">
            Care information is scoped to your household. Caregivers can see only the
            care recipients they've been assigned to. Family members have read access
            to information the family admin shares, but cannot change billing, delete
            the account, or remove the family admin.
          </p>
        </section>

        <section>
          <h2 className="font-display text-lg text-ink">Compliance</h2>
          <p className="mt-2">
            ElderCheck is not currently represented as HIPAA compliant. If your use case
            requires HIPAA-covered handling of protected health information, please
            contact us before relying on ElderCheck for that purpose.
          </p>
        </section>

        <section>
          <h2 className="font-display text-lg text-ink">Deleting your data</h2>
          <p className="mt-2">
            Family admins can permanently delete their account and associated household
            data from Account settings at any time.
          </p>
        </section>
      </div>
    </div>
  );
}
