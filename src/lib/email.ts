import "server-only";

/**
 * Provider-neutral webhook. Point EMAIL_WEBHOOK_URL at an automation or mail
 * service that accepts {to, subject, text}. No provider credentials reach the browser.
 */
export async function sendEmail(to: string, subject: string, text: string, attachments: Array<{ filename: string; contentBase64: string; contentType: string }> = [], html?: string): Promise<boolean> {
  const url = process.env.EMAIL_WEBHOOK_URL;
  if (!url) return false;
  const response = await fetch(url, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      ...(process.env.EMAIL_WEBHOOK_SECRET ? { authorization: `Bearer ${process.env.EMAIL_WEBHOOK_SECRET}` } : {}),
    },
    body: JSON.stringify({ to, subject, text, html, attachments }),
  });
  return response.ok;
}
