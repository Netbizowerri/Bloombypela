/**
 * Contact-form notification email.
 *
 * Sends through Resend's REST API using global `fetch` so the same helper works
 * in a Cloud Function (secret injected into the environment by
 * `defineSecret`) and in a Vercel serverless route (`RESEND_API_KEY`).
 */

const RESEND_ENDPOINT = 'https://api.resend.com/emails';

export interface ContactNotification {
  name: string;
  email: string;
  phone: string | null;
  subject: string;
  message: string;
  messageId: string;
  receivedAtIso: string;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export function contactNotificationEmail(message: ContactNotification): {
  html: string;
  text: string;
  subject: string;
} {
  const subject = `New contact message: ${message.subject}`;
  const html = `<!doctype html>
<html lang="en">
  <body style="margin:0;padding:24px;background:#faf1de;font-family:Arial,Helvetica,sans-serif;color:#1c1917;">
    <div style="max-width:600px;margin:0 auto;background:#ffffff;border-radius:12px;padding:24px;">
      <h1 style="margin:0 0 16px;font-family:Georgia,serif;font-size:20px;color:#7e2b44;">
        New contact message
      </h1>
      <p style="margin:0 0 16px;font-size:14px;line-height:1.6;">
        <strong>From:</strong> ${escapeHtml(message.name)} &lt;${escapeHtml(message.email)}&gt;<br />
        ${message.phone ? `<strong>Phone:</strong> ${escapeHtml(message.phone)}<br />` : ''}
        <strong>Subject:</strong> ${escapeHtml(message.subject)}<br />
        <strong>Received:</strong> ${escapeHtml(message.receivedAtIso)}<br />
        <strong>Message id:</strong> ${escapeHtml(message.messageId)}
      </p>
      <div style="margin:0;padding:16px;background:#f5f5f4;border-radius:8px;font-size:14px;line-height:1.6;white-space:pre-wrap;">${escapeHtml(
        message.message,
      )}</div>
      <p style="margin:16px 0 0;font-size:13px;line-height:1.6;color:#6b7280;">
        Reply directly to this email to answer the customer. The message is also stored in the
        <code>contactMessages</code> collection in Firestore.
      </p>
    </div>
  </body>
</html>`;

  const text = [
    'New contact message',
    '',
    `From: ${message.name} <${message.email}>`,
    message.phone ? `Phone: ${message.phone}` : '',
    `Subject: ${message.subject}`,
    `Received: ${message.receivedAtIso}`,
    `Message id: ${message.messageId}`,
    '',
    message.message,
    '',
    'Reply directly to this email to answer the customer.',
  ]
    .filter((line) => line !== '')
    .join('\n');

  return { html, text, subject };
}

/**
 * Sends the notification. Throws on a non-2xx response so the caller can decide
 * whether a failed notification should fail the whole request.
 */
export async function sendContactNotification(
  apiKey: string,
  fromEmail: string,
  toEmail: string,
  message: ContactNotification,
): Promise<void> {
  const { html, text, subject } = contactNotificationEmail(message);

  const response = await fetch(RESEND_ENDPOINT, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: `Bloom by Pela <${fromEmail}>`,
      to: [toEmail],
      reply_to: message.email,
      subject,
      html,
      text,
    }),
  });

  if (!response.ok) {
    const detail = await response.text().catch(() => '');
    throw new Error(`Resend rejected the contact email (${response.status}): ${detail.slice(0, 200)}`);
  }
}
