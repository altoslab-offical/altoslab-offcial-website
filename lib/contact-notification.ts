import type { ContactLead } from "./types";

type NotificationResult =
  | { ok: true; skipped?: false }
  | { ok: false; skipped: true; reason: "missing-env" }
  | { ok: false; skipped?: false; reason: string };

const GMAIL_SEND_SCOPE = "https://www.googleapis.com/auth/gmail.send";

function cleanHeader(value: string) {
  return value.replace(/[\r\n]+/g, " ").trim();
}

function emailFromText(value: string) {
  return value.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i)?.[0] || "";
}

function base64EncodeUtf8(value: string) {
  const bytes = new TextEncoder().encode(value);
  let binary = "";
  const chunkSize = 0x8000;
  for (let index = 0; index < bytes.length; index += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(index, index + chunkSize));
  }
  return btoa(binary);
}

function base64UrlEncodeUtf8(value: string) {
  return base64EncodeUtf8(value).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function encodedHeader(value: string) {
  return `=?UTF-8?B?${base64EncodeUtf8(cleanHeader(value))}?=`;
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function htmlLines(value: string) {
  return escapeHtml(value).replace(/\r?\n/g, "<br />");
}

function contactNotifyTo() {
  return cleanHeader(process.env.CONTACT_NOTIFY_TO || process.env.ALTOS_REPORT_TO_EMAIL || "");
}

function contactNotifyFrom() {
  return cleanHeader(
    process.env.CONTACT_NOTIFY_FROM ||
      process.env.ALTOS_REPORT_FROM_EMAIL ||
      process.env.CONTACT_NOTIFY_TO ||
      process.env.ALTOS_REPORT_TO_EMAIL ||
      ""
  );
}

function hasGmailConfig() {
  return Boolean(process.env.GMAIL_CLIENT_ID && process.env.GMAIL_CLIENT_SECRET && process.env.GMAIL_REFRESH_TOKEN);
}

async function gmailAccessToken() {
  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: process.env.GMAIL_CLIENT_ID || "",
      client_secret: process.env.GMAIL_CLIENT_SECRET || "",
      refresh_token: process.env.GMAIL_REFRESH_TOKEN || "",
      grant_type: "refresh_token",
      scope: GMAIL_SEND_SCOPE
    })
  });

  const payload = (await response.json().catch(() => ({}))) as { access_token?: string; error?: string };
  if (!response.ok || !payload.access_token) {
    throw new Error(payload.error || `Gmail token request failed with ${response.status}`);
  }

  return payload.access_token;
}

function formatLeadTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;

  return `${new Intl.DateTimeFormat("zh-TW", {
    timeZone: "Asia/Taipei",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false
  }).format(date)} (UTC+8)`;
}

function leadEmailBody(lead: ContactLead) {
  return [
    "ALTOS LAB 官網收到新的合作需求。",
    "",
    `Lead ID: ${lead.id}`,
    `送出時間: ${formatLeadTime(lead.createdAt)}`,
    `來源: ${lead.source}`,
    "",
    `公司 / 團隊 / 姓名: ${lead.who}`,
    `聯絡方式: ${lead.contact}`,
    "",
    "需求內容:",
    lead.message,
    "",
    "請直接用上方聯絡方式回覆。"
  ].join("\n");
}

function leadEmailHtml(lead: ContactLead) {
  const replyTo = emailFromText(lead.contact);
  const contactHtml = replyTo
    ? `<a href="mailto:${escapeHtml(replyTo)}" style="color:#101010;text-decoration:underline;">${escapeHtml(lead.contact)}</a>`
    : escapeHtml(lead.contact);

  return `<!doctype html>
<html>
  <body style="margin:0;background:#f3f4f1;color:#101010;font-family:Arial,'Noto Sans TC','Microsoft JhengHei',sans-serif;">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f3f4f1;padding:24px 0;">
      <tr>
        <td align="center" style="padding:0 16px;">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:640px;background:#ffffff;border:1px solid #e3e3de;border-radius:14px;overflow:hidden;">
            <tr>
              <td style="background:#050505;padding:24px 26px;">
                <div style="color:#c8ff00;font-size:12px;font-weight:800;letter-spacing:0.24em;text-transform:uppercase;">ALTOS LAB</div>
                <h1 style="margin:12px 0 0;color:#ffffff;font-size:24px;line-height:1.25;font-weight:800;">新的合作需求</h1>
                <p style="margin:10px 0 0;color:#a8a8a8;font-size:14px;line-height:1.6;">官網 contact form 收到一筆新的詢問。</p>
              </td>
            </tr>
            <tr>
              <td style="padding:24px 26px 8px;">
                <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                  <tr>
                    <td style="padding:0 0 14px;">
                      <div style="color:#777;font-size:12px;font-weight:700;letter-spacing:0.12em;text-transform:uppercase;">Company / Team / Name</div>
                      <div style="margin-top:6px;color:#101010;font-size:22px;line-height:1.35;font-weight:800;">${escapeHtml(lead.who)}</div>
                    </td>
                  </tr>
                  <tr>
                    <td style="padding:16px 0;border-top:1px solid #eeeeea;">
                      <div style="color:#777;font-size:12px;font-weight:700;letter-spacing:0.12em;text-transform:uppercase;">Contact</div>
                      <div style="margin-top:6px;color:#101010;font-size:16px;line-height:1.6;font-weight:700;">${contactHtml}</div>
                    </td>
                  </tr>
                  <tr>
                    <td style="padding:16px 0;border-top:1px solid #eeeeea;">
                      <div style="color:#777;font-size:12px;font-weight:700;letter-spacing:0.12em;text-transform:uppercase;">Request</div>
                      <div style="margin-top:8px;background:#f6f6f2;border-left:4px solid #c8ff00;padding:16px 18px;color:#1c1c1c;font-size:16px;line-height:1.75;">${htmlLines(lead.message)}</div>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
            <tr>
              <td style="padding:8px 26px 24px;">
                <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#fafaf7;border:1px solid #eeeeea;border-radius:10px;">
                  <tr>
                    <td style="padding:14px 16px;color:#777;font-size:12px;line-height:1.7;">
                      <strong style="color:#101010;">Lead ID</strong> ${escapeHtml(lead.id)}<br />
                      <strong style="color:#101010;">送出時間</strong> ${escapeHtml(formatLeadTime(lead.createdAt))}<br />
                      <strong style="color:#101010;">來源</strong> ${escapeHtml(lead.source)}
                    </td>
                  </tr>
                </table>
                <p style="margin:18px 0 0;color:#777;font-size:13px;line-height:1.6;">可直接回覆這封信；若對方留下 Email，Reply-To 已自動設為對方信箱。</p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}

function leadMimeMessage(lead: ContactLead) {
  const to = contactNotifyTo();
  const from = contactNotifyFrom();
  const replyTo = emailFromText(lead.contact);
  const subject = `ALTOS LAB 新合作需求｜${lead.who}`;
  const boundary = `altos-contact-${lead.id.replace(/[^a-z0-9_-]/gi, "") || Date.now()}`;
  const headers = [
    `From: ${from}`,
    `To: ${to}`,
    replyTo ? `Reply-To: ${replyTo}` : "",
    `Subject: ${encodedHeader(subject)}`,
    "MIME-Version: 1.0",
    `Content-Type: multipart/alternative; boundary="${boundary}"`
  ].filter(Boolean);

  return [
    headers.join("\r\n"),
    "",
    `--${boundary}`,
    "Content-Type: text/plain; charset=UTF-8",
    "Content-Transfer-Encoding: 8bit",
    "",
    leadEmailBody(lead),
    `--${boundary}`,
    "Content-Type: text/html; charset=UTF-8",
    "Content-Transfer-Encoding: 8bit",
    "",
    leadEmailHtml(lead),
    `--${boundary}--`
  ].join("\r\n");
}

export async function sendContactLeadNotification(lead: ContactLead): Promise<NotificationResult> {
  if (!hasGmailConfig() || !contactNotifyTo() || !contactNotifyFrom()) {
    return { ok: false, skipped: true, reason: "missing-env" };
  }

  try {
    const token = await gmailAccessToken();
    const response = await fetch("https://gmail.googleapis.com/gmail/v1/users/me/messages/send", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ raw: base64UrlEncodeUtf8(leadMimeMessage(lead)) })
    });

    if (!response.ok) {
      const payload = (await response.json().catch(() => ({}))) as { error?: { message?: string } };
      return { ok: false, reason: payload.error?.message || `Gmail send failed with ${response.status}` };
    }

    return { ok: true };
  } catch (error) {
    return { ok: false, reason: error instanceof Error ? error.message : "Gmail send failed" };
  }
}
