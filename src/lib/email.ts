import "server-only";
import { Resend } from "resend";

const resendClient = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;

// Resend's shared sandbox sender. Works out of the box, but until a
// domain is verified with Resend (EMAIL_FROM env var set to an address
// on that domain), Resend will only actually deliver to the email
// address the Resend account itself was created with -- everything
// else is silently accepted but not delivered. Once a domain is
// verified, set EMAIL_FROM and delivery to any recipient starts working
// with no code changes.
const FROM_EMAIL = process.env.EMAIL_FROM || "ElderCheck <onboarding@resend.dev>";

export function isEmailConfigured(): boolean {
  return resendClient !== null;
}

type SendEmailInput = {
  to: string;
  subject: string;
  html: string;
  text: string;
};

/**
 * Best-effort email send. Never throws -- a failed or unconfigured send
 * is logged and returned as { sent: false } so callers can proceed
 * without blocking the underlying action (an invitation or alert still
 * gets created even if the email couldn't go out).
 */
export async function sendEmail({
  to,
  subject,
  html,
  text,
}: SendEmailInput): Promise<{ sent: boolean; error?: string }> {
  if (!resendClient) {
    console.warn(`[email] RESEND_API_KEY not set -- skipped email to ${to}: ${subject}`);
    return { sent: false, error: "not_configured" };
  }

  try {
    const { error } = await resendClient.emails.send({
      from: FROM_EMAIL,
      to,
      subject,
      html,
      text,
    });
    if (error) {
      console.error(`[email] Resend rejected email to ${to}:`, error);
      return { sent: false, error: error.message };
    }
    return { sent: true };
  } catch (err) {
    console.error(`[email] Failed to send email to ${to}:`, err);
    return { sent: false, error: err instanceof Error ? err.message : "unknown_error" };
  }
}

function emailShell(title: string, bodyHtml: string): string {
  return `<!doctype html>
<html>
  <body style="margin:0;padding:0;background-color:#f5f3ee;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f5f3ee;padding:32px 0;">
      <tr>
        <td align="center">
          <table role="presentation" width="480" cellpadding="0" cellspacing="0" style="background-color:#ffffff;border-radius:12px;overflow:hidden;">
            <tr>
              <td style="padding:28px 32px 8px 32px;">
                <div style="font-size:18px;font-weight:600;color:#2f3a2e;">ElderCheck</div>
              </td>
            </tr>
            <tr>
              <td style="padding:8px 32px 28px 32px;color:#2f3a2e;font-size:15px;line-height:1.6;">
                <h1 style="font-size:20px;margin:0 0 16px 0;color:#2f3a2e;">${title}</h1>
                ${bodyHtml}
              </td>
            </tr>
            <tr>
              <td style="padding:16px 32px;border-top:1px solid #ece8de;color:#8a8578;font-size:12px;line-height:1.5;">
                ElderCheck is not an emergency response or medical monitoring service. If you believe someone is experiencing a medical emergency, call 911 or your local emergency service.
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}

export function invitationEmail({
  inviterName,
  householdLabel,
  role,
  inviteUrl,
  expiresAt,
}: {
  inviterName: string;
  householdLabel: string;
  role: string;
  inviteUrl: string;
  expiresAt: string;
}) {
  const roleLabel = role === "caregiver" ? "a caregiver" : "a family member";
  const expiryDate = new Date(expiresAt).toLocaleDateString(undefined, {
    month: "long",
    day: "numeric",
  });
  const html = emailShell(
    "You've been invited to ElderCheck",
    `<p style="margin:0 0 20px 0;">${inviterName} invited you to join ${householdLabel} on ElderCheck as ${roleLabel}.</p>
     <p style="margin:0 0 24px 0;">
       <a href="${inviteUrl}" style="display:inline-block;background-color:#4a6741;color:#ffffff;text-decoration:none;padding:12px 24px;border-radius:8px;font-weight:600;">Accept invitation</a>
     </p>
     <p style="margin:0;color:#6b6658;font-size:13px;">This link expires on ${expiryDate}. If you weren't expecting this, you can safely ignore this email.</p>`
  );
  const text = `${inviterName} invited you to join ${householdLabel} on ElderCheck as ${roleLabel}.\n\nAccept your invitation: ${inviteUrl}\n\nThis link expires on ${expiryDate}. If you weren't expecting this, you can safely ignore this email.`;
  return { subject: `${inviterName} invited you to ElderCheck`, html, text };
}

export function concernAlertEmail({
  caregiverName,
  recipientName,
  severity,
  summary,
  dashboardUrl,
}: {
  caregiverName: string;
  recipientName: string;
  severity: "urgent" | "attention";
  summary: string;
  dashboardUrl: string;
}) {
  const heading =
    severity === "urgent"
      ? `Urgent: a concern was flagged for ${recipientName}`
      : `${caregiverName} flagged something to review for ${recipientName}`;
  const html = emailShell(
    heading,
    `<p style="margin:0 0 16px 0;"><strong>Reported by:</strong> ${caregiverName}</p>
     <p style="margin:0 0 20px 0;background-color:#f5f3ee;border-radius:8px;padding:12px 16px;">${summary}</p>
     <p style="margin:0 0 24px 0;">
       <a href="${dashboardUrl}" style="display:inline-block;background-color:#4a6741;color:#ffffff;text-decoration:none;padding:12px 24px;border-radius:8px;font-weight:600;">View in ElderCheck</a>
     </p>`
  );
  const text = `${heading}\n\nReported by: ${caregiverName}\n\n${summary}\n\nView in ElderCheck: ${dashboardUrl}`;
  return { subject: heading, html, text };
}
