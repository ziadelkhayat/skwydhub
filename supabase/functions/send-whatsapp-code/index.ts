// Skwyd Hub · Send SMS hook → WhatsApp (Meta Cloud API)
// Supabase Auth calls this for every login code. It sends the code with an approved WhatsApp
// "authentication" template from your Meta business number.
// Secrets (Supabase → Edge Functions → Secrets), never in code:
//   SEND_SMS_HOOK_SECRET  the "v1,whsec_…" secret shown when you turn on the Send SMS hook
//   META_WA_TOKEN         permanent access token of the Meta system user
//   META_WA_PHONE_ID      Phone number ID of the WhatsApp sender (WhatsApp → API Setup)
//   META_WA_TEMPLATE      template name, default "login_code"
//   META_WA_LANG          template language code, default "en_US"
import { Webhook } from "https://esm.sh/standardwebhooks@1.0.0";

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
const fail = (status: number, message: string) => json({ error: { http_code: status, message } }, status);

Deno.serve(async (req) => {
  if (req.method !== "POST") return fail(405, "Method not allowed");
  const secret = (Deno.env.get("SEND_SMS_HOOK_SECRET") || "").replace("v1,whsec_", "");
  const token = Deno.env.get("META_WA_TOKEN"), phoneId = Deno.env.get("META_WA_PHONE_ID");
  const template = Deno.env.get("META_WA_TEMPLATE") || "login_code", lang = Deno.env.get("META_WA_LANG") || "en_US";
  if (!secret || !token || !phoneId) return fail(500, "WhatsApp sending is not set up yet (missing secrets).");

  const payload = await req.text();
  let user: { phone?: string }, sms: { otp?: string };
  try { ({ user, sms } = new Webhook(secret).verify(payload, Object.fromEntries(req.headers)) as any); }
  catch (_) { return fail(401, "Invalid signature"); }

  const to = String(user?.phone || "").replace(/\D/g, ""), otp = String(sms?.otp || "");
  if (!to || !otp) return fail(400, "Missing phone or code");

  const body = {
    messaging_product: "whatsapp", to, type: "template",
    template: { name: template, language: { code: lang }, components: [
      { type: "body", parameters: [{ type: "text", text: otp }] },
      { type: "button", sub_type: "url", index: "0", parameters: [{ type: "text", text: otp }] },   // the "Copy code" button
    ] },
  };
  const r = await fetch(`https://graph.facebook.com/v21.0/${phoneId}/messages`, { method: "POST", headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" }, body: JSON.stringify(body) });
  if (!r.ok) {
    const e = await r.json().catch(() => ({}));
    console.error("whatsapp send failed", r.status, JSON.stringify(e));
    return fail(502, `WhatsApp couldn't send the code: ${e?.error?.message || r.status}`);
  }
  return json({});
});
