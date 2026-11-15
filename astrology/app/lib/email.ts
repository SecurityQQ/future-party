import "server-only";

// Email through Resend's HTTP API (no SDK). Set RESEND_API_KEY, and EMAIL_FROM to an address on a
// domain verified in Resend, e.g. "The Future 2050 <travelers@example.com>". Resend's test sender,
// onboarding@resend.dev, only delivers to the Resend account's own address.
const FROM = () => process.env.EMAIL_FROM || "The Future 2050 <onboarding@resend.dev>";

export function emailReady(): boolean {
  return !!process.env.RESEND_API_KEY;
}

// Without a Resend key, preview and local builds hand the login code back to the page so the flow
// can be tested. Production never does: there the login says email is not switched on yet.
export function devEcho(): boolean {
  return !emailReady() && process.env.VERCEL_ENV !== "production";
}

export async function sendEmail(m: { to: string; subject: string; html: string; text: string }) {
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({ from: FROM(), to: [m.to], subject: m.subject, html: m.html, text: m.text }),
    cache: "no-store",
  });
  if (!res.ok) {
    const j: any = await res.json().catch(() => ({}));
    throw new Error(`resend ${res.status}: ${j?.message ?? "send failed"}`);
  }
}

const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]!);

function frame(body: string): string {
  return `<!doctype html><html><body style="margin:0;background:#03050c;color:#dce7ff;font-family:-apple-system,Segoe UI,Roboto,sans-serif">
<div style="max-width:480px;margin:0 auto;padding:28px 20px">
<div style="font-weight:700;letter-spacing:.14em;color:#e2b566;font-size:14px">THE FUTURE 2050</div>
<div style="font-size:11px;letter-spacing:.2em;color:#8395b8;margin-bottom:24px">ARRIVAL STATION</div>
${body}
<p style="color:#4d5d7e;font-size:12px;margin-top:32px">You get this because you joined The Future 2050.</p>
</div></body></html>`;
}

export function loginEmail(o: { name: string; code: string; link: string }) {
  const first = o.name.split(" ")[0];
  return {
    subject: `${o.code} is your code for The Future 2050`,
    text: `Hi ${first},\n\nYour login code is ${o.code}. It works for 15 minutes.\n\nOr open this link on the phone you want to use:\n${o.link}\n\nIf you did not ask for it, ignore this email.`,
    html: frame(`<p style="font-size:16px">Hi ${esc(first)}, here is your code to get back to your Kin:</p>
<div style="font-family:Menlo,monospace;font-size:36px;letter-spacing:.3em;color:#84ffb5;background:#040912;border:1px solid #2a3a58;padding:16px;text-align:center;margin:18px 0">${esc(o.code)}</div>
<p style="font-size:14px;color:#8395b8">It works for 15 minutes. Or open the link on the phone you want to use:</p>
<p><a href="${esc(o.link)}" style="display:inline-block;background:#e0ac52;color:#1e1405;text-decoration:none;font-weight:700;letter-spacing:.1em;padding:12px 18px">LOG IN</a></p>
<p style="font-size:13px;color:#8395b8">If you did not ask for this code, ignore this email.</p>`),
  };
}

export function welcomeEmail(o: { name: string; loginUrl: string; cardUrl: string }) {
  const first = o.name.split(" ")[0];
  return {
    subject: "Welcome to the Arrival Station",
    text: `Welcome, traveler ${first}.\n\nYour Kin: ${o.cardUrl}\n\nNew phone or browser? Open ${o.loginUrl}, enter this email, and we send you a code to get straight back in.`,
    html: frame(`<p style="font-size:16px">Welcome, traveler ${esc(first)}. The oracles have bound your card.</p>
<p><a href="${esc(o.cardUrl)}" style="display:inline-block;background:#e0ac52;color:#1e1405;text-decoration:none;font-weight:700;letter-spacing:.1em;padding:12px 18px">SEE YOUR CREATURE</a></p>
<p style="font-size:14px;color:#8395b8">New phone or browser? Open <a href="${esc(o.loginUrl)}" style="color:#5df4ff">${esc(o.loginUrl.replace(/^https?:\/\//, ""))}</a>, enter this email, and we send you a code to get straight back in.</p>`),
  };
}
