// Sign in (TailAdmin sign-in page): account number + phone number + a code on WhatsApp; email and password stays as a fallback for the owner.
import GridShape from "@/components/shared/grid-shape";
import { SkwydLogo } from "@/components/shared/skwyd-logo";
import { Button } from "@/components/ui/button";
import { Field, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { sb } from "@/lib/supabase";
import { ls } from "@/lib/util";
import ThemeToggler from "../ui/ThemeToggler";
import { useState, type FormEvent } from "react";

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
    <div className="relative z-1 bg-white p-6 sm:p-0 dark:bg-gray-900">
      <div className="relative flex min-h-screen w-full flex-col justify-center sm:p-0 lg:flex-row dark:bg-gray-900">
        <div className="flex w-full flex-1 flex-col lg:w-1/2">
          <div className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center">
            <div className="mb-8 lg:hidden"><SkwydLogo /></div>
            <div className="mb-5 sm:mb-8">
              <h1 className="sm:text-3xl mb-2 text-2xl font-semibold text-gray-900 dark:text-gray-50">Sign In</h1>
              <p className="text-sm text-gray-500 dark:text-gray-400">Sign in to the back office with your account number.</p>
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
                    <select aria-label="Country code" value={cc} onChange={e => { setCc(e.target.value); setSentTo(""); }} className="h-9 w-28 rounded-lg border border-gray-300 bg-transparent px-3 text-sm text-gray-800 shadow-xs focus:border-brand-300 focus:ring-3 focus:ring-brand-500/10 focus:outline-hidden dark:border-gray-700 dark:bg-gray-900 dark:text-gray-50">{CCS.map(c => <option key={c}>{c}</option>)}</select>
                    <Input className="h-9 flex-1" type="tel" inputMode="tel" autoComplete="tel-national" placeholder="70 123 456" value={num} onChange={e => { setNum(e.target.value); setSentTo(""); }} />
                  </div></Field>
                {sentTo && <Field><FieldLabel className="mb-1.5 block">Code Sent On WhatsApp <span className="text-red-500">*</span></FieldLabel>
                  <Input className="h-9 text-center tracking-[.3em]" inputMode="numeric" autoComplete="one-time-code" maxLength={6} placeholder="6 digits" autoFocus value={code}
                    onChange={e => { setCode(e.target.value); if (e.target.value.replace(/\D/g, "").length === 6) setTimeout(() => submit(), 0); }} /></Field>}
              </>}
              {(err || note) && <p className={err ? "text-sm text-red-500" : "text-sm text-green-600"}>{err || note}</p>}
              <Button className="w-full" size="lg" type="submit" disabled={busy}>{busy ? "…" : pw || sentTo ? "Sign In" : "Send Code On WhatsApp"}</Button>
            </form>
            <button type="button" className="mt-5 text-start text-sm text-brand-500 hover:text-brand-600 dark:text-brand-400" onClick={() => { setPw(!pw); setErr(""); setNote(""); }}>
              {pw ? "Sign in with your phone number instead" : "Sign in with email and password instead"}</button>
          </div>
        </div>
        <div className="relative hidden h-full min-h-screen w-full items-center justify-center bg-brand-950 lg:grid lg:w-1/2 dark:bg-white/5">
          <div className="z-1 flex h-full items-center justify-center">
            <GridShape />
            <div className="flex max-w-xs flex-col items-center [--sk-ink:#fff]">
              <span className="mb-4 block [&_*]:[--sk-ink:#fff]"><SkwydLogo markClass="h-14 w-12" wordClass="h-16 w-auto" /></span>
              <p className="text-center text-gray-400 dark:text-white/60">Every store, order and shift in one place.</p>
            </div>
          </div>
        </div>
        <div className="fixed inset-e-6 bottom-6 z-50 hidden sm:block"><ThemeToggler /></div>
      </div>
    </div>
  );
}
