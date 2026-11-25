import { SelectNative } from "@/components/tremor/SelectNative";
// Sign in (TailAdmin sign-in page): account number + phone number + a code on WhatsApp; email and password stays as a fallback for the owner.
import { SkwydLogo } from "@/components/shared/skwyd-logo";
import { Button } from "@/components/ui/button";
import { Field, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { sb } from "@/lib/supabase";
import { ls } from "@/lib/util";
import ThemeToggler from "../ui/ThemeToggler";
import { useState, type FormEvent } from "react";
import { SEL } from "../ui/kit";

const CCS = ["+961", "+971", "+966", "+974", "+965", "+973", "+968", "+962", "+20", "+90", "+33", "+44", "+1"];

export default function SignInPage({ message }: { message: string }) {
  const [acct, setAcct] = useState(ls.get("skwyd_acct", ""));
  const [cc, setCc] = useState(ls.get("skwyd_ph_cc", "+961"));
  const [num, setNum] = useState(ls.get("skwyd_ph_n", ""));
  const [code, setCode] = useState(""), [sentTo, setSentTo] = useState(""), [pw, setPw] = useState(false);
  const [email, setEmail] = useState(""), [pass, setPass] = useState("");
  const [err, setErr] = useState(message), [note, setNote] = useState(""), [busy, setBusy] = useState(false);
  const phone = cc + num.replace(/\D/g, "").replace(/^0+/, "");

  async function checkAccount() {   // the business's account number (given by Skwyd) must match the login's business
    const a = acct.replace(/\s+/g, "");
    try { const { data: co } = await sb.from("settings").select("data").eq("id", "company").maybeSingle();
      const want = String((co as any)?.data?.accountNo || "").replace(/\s+/g, "");
      if (want && want !== a && !(await sb.rpc("slick_is_platform_admin")).data) { await sb.auth.signOut(); setErr("Wrong account number."); return; } } catch { /* the database rules check it too */ }
    ls.set("skwyd_acct", a);
  }
  async function submit(e?: FormEvent) {
    e?.preventDefault(); setErr(""); setNote("");
    if (!acct.trim()) return setErr("Enter your account number.");
    setBusy(true);
    try {
      if (pw) { const { error } = await sb.auth.signInWithPassword({ email: email.trim(), password: pass });
        if (error) return setErr(error.message === "Invalid login credentials" ? "Wrong email or password." : error.message); await checkAccount(); return; }
      if (phone.replace(/\D/g, "").length < 8) return setErr("Enter your phone number.");
      if (sentTo !== phone) { const { error } = await sb.auth.signInWithOtp({ phone, options: { channel: "whatsapp", shouldCreateUser: false } });
        if (error) return setErr(/not found|signups not allowed|user/i.test(error.message) ? "This number has no login. Ask the owner to add your phone number on your employee page." : /provider|unsupported|disabled/i.test(error.message) ? "Sign in by phone isn't set up yet. Use email and password." : /rate|seconds/i.test(error.message) ? "Wait a minute, then try again." : error.message);
        setSentTo(phone); ls.set("skwyd_ph_cc", cc); ls.set("skwyd_ph_n", num); setNote("We sent a code on WhatsApp."); return; }
      if (code.replace(/\D/g, "").length < 6) return setErr("Enter the 6-digit code.");
      const { error } = await sb.auth.verifyOtp({ phone, token: code.replace(/\D/g, ""), type: "sms" });
      if (error) return setErr(/expired|invalid/i.test(error.message) ? "Wrong or expired code." : error.message);
      await checkAccount();
    } finally { setBusy(false); }
  }

  return (
    // Tremor login block: centred, logo, title, form
    <div className="flex min-h-dvh items-center justify-center bg-white px-4 py-10 lg:px-6 dark:bg-gray-950">
      <div className="relative sm:mx-auto sm:w-full sm:max-w-sm">
            <div className="mb-6"><SkwydLogo /></div>
            <div className="mb-6">
              <h1 className="text-lg font-semibold text-gray-900 dark:text-gray-50">Sign in to Skwyd Hub</h1>
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-500">Sign in to the back office with your account number.</p>
            </div>
            <form onSubmit={submit} className="space-y-5" noValidate>
              <Field><FieldLabel className="mb-1.5 block">Account Number <span className="text-red-500">*</span></FieldLabel>
                <Input className="h-9" inputMode="numeric" autoComplete="organization" value={acct} onChange={e => setAcct(e.target.value)} /></Field>
              {pw ? <>
                <Field><FieldLabel className="mb-1.5 block">Email <span className="text-red-500">*</span></FieldLabel>
                  <Input className="h-9" type="email" autoComplete="username" placeholder="info@gmail.com" value={email} onChange={e => setEmail(e.target.value)} /></Field>
                <Field><FieldLabel className="mb-1.5 block">Password <span className="text-red-500">*</span></FieldLabel>
                  <Input className="h-9" type="password" autoComplete="current-password" placeholder="Enter your password" value={pass} onChange={e => setPass(e.target.value)} /></Field>
              </> : <>
                <Field><FieldLabel className="mb-1.5 block">Phone Number <span className="text-red-500">*</span></FieldLabel>
                  <div className="flex gap-3">
                    <SelectNative aria-label="Country code" value={cc} onChange={e => { setCc(e.target.value); setSentTo(""); }} className={SEL + " w-28"}>{CCS.map(c => <option key={c}>{c}</option>)}</SelectNative>
                    <Input className="h-9 flex-1" type="tel" inputMode="tel" autoComplete="tel-national" placeholder="70 123 456" value={num} onChange={e => { setNum(e.target.value); setSentTo(""); }} />
                  </div></Field>
                {sentTo && <Field><FieldLabel className="mb-1.5 block">Code Sent On WhatsApp <span className="text-red-500">*</span></FieldLabel>
                  <Input className="h-9 text-center tracking-[.3em]" inputMode="numeric" autoComplete="one-time-code" maxLength={6} placeholder="6 digits" autoFocus value={code}
                    onChange={e => { setCode(e.target.value); if (e.target.value.replace(/\D/g, "").length === 6) setTimeout(() => submit(), 0); }} /></Field>}
              </>}
              {(err || note) && <p className={err ? "text-sm text-red-500" : "text-sm text-green-600"}>{err || note}</p>}
              <Button className="w-full" type="submit" disabled={busy}>{busy ? "…" : pw || sentTo ? "Sign In" : "Send Code On WhatsApp"}</Button>
            </form>
            <Button type="button" variant="link" className="mt-6 justify-start" onClick={() => { setPw(!pw); setErr(""); setNote(""); }}>
              {pw ? "Sign in with your phone number instead" : "Sign in with email and password instead"}</Button>
      </div>
      <div className="fixed right-6 bottom-6 z-50 hidden sm:block"><ThemeToggler /></div>
    </div>
  );
}
