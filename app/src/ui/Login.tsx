// Sign in: account number + phone number + a code on WhatsApp. Email and password stays as a fallback for the owner.
import { useState, type FormEvent } from "react";
import { sb } from "../lib/supabase";
import { ls } from "../lib/util";
import { Mark } from "./Icons";

const CCS = ["+961", "+971", "+966", "+974", "+965", "+973", "+968", "+962", "+20", "+90", "+33", "+44", "+1"];

export function Login({ message }: { message: string }) {
  const [acct, setAcct] = useState(ls.get("skwyd_acct", ""));
  const [cc, setCc] = useState(ls.get("skwyd_ph_cc", "+961"));
  const [num, setNum] = useState(ls.get("skwyd_ph_n", ""));
  const [code, setCode] = useState("");
  const [sentTo, setSentTo] = useState("");
  const [pw, setPw] = useState(false);
  const [email, setEmail] = useState("");
  const [pass, setPass] = useState("");
  const [err, setErr] = useState(message);
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const phone = cc + num.replace(/\D/g, "").replace(/^0+/, "");

  // the business's account number (given by SKWYD) must match the login's business
  async function checkAccount(): Promise<boolean> {
    const a = acct.replace(/\s+/g, "");
    try {
      const { data: co } = await sb.from("settings").select("data").eq("id", "company").maybeSingle();
      const want = String((co as any)?.data?.accountNo || "").replace(/\s+/g, "");
      if (want && want !== a && !(await sb.rpc("slick_is_platform_admin")).data) { await sb.auth.signOut(); setErr("Wrong account number."); return false; }
    } catch { /* checked again by the database rules */ }
    ls.set("skwyd_acct", a); return true;
  }

  async function submit(e?: FormEvent) {
    e?.preventDefault(); setErr(""); setNote("");
    if (!acct.trim()) return setErr("Enter your account number.");
    setBusy(true);
    try {
      if (pw) {
        const { error } = await sb.auth.signInWithPassword({ email: email.trim(), password: pass });
        if (error) return setErr(error.message === "Invalid login credentials" ? "Wrong email or password." : error.message);
        await checkAccount(); return;
      }
      if (phone.replace(/\D/g, "").length < 8) return setErr("Enter your phone number.");
      if (sentTo !== phone) {
        const { error } = await sb.auth.signInWithOtp({ phone, options: { channel: "whatsapp", shouldCreateUser: false } });
        if (error) return setErr(/not found|signups not allowed|user/i.test(error.message) ? "This number has no login. Ask the owner to add your phone number on your employee page." : /provider|unsupported|disabled/i.test(error.message) ? "Sign in by phone isn't set up yet. Use email and password." : /rate|seconds/i.test(error.message) ? "Wait a minute, then try again." : error.message);
        setSentTo(phone); ls.set("skwyd_ph_cc", cc); ls.set("skwyd_ph_n", num); setNote("We sent a code on WhatsApp."); return;
      }
      if (code.replace(/\D/g, "").length < 6) return setErr("Enter the 6-digit code.");
      const { error } = await sb.auth.verifyOtp({ phone, token: code.replace(/\D/g, ""), type: "sms" });
      if (error) return setErr(/expired|invalid/i.test(error.message) ? "Wrong or expired code." : error.message);
      await checkAccount();
    } finally { setBusy(false); }
  }

  return (
    <div className="gate">
      <form className="gcard" onSubmit={submit} autoComplete="on">
        <div className="gbrand"><Mark size={52} /><b>SKWYD</b><small>HUB</small></div>
        <label htmlFor="acct">Account Number <i>*</i></label>
        <input id="acct" inputMode="numeric" autoComplete="organization" value={acct} onChange={e => setAcct(e.target.value)} />
        {pw ? <>
          <label htmlFor="em">Email <i>*</i></label><input id="em" type="email" autoComplete="username" value={email} onChange={e => setEmail(e.target.value)} />
          <label htmlFor="pw">Password <i>*</i></label><input id="pw" type="password" autoComplete="current-password" value={pass} onChange={e => setPass(e.target.value)} />
        </> : <>
          <label htmlFor="ph">Phone Number <i>*</i></label>
          <div className="row"><select value={cc} onChange={e => { setCc(e.target.value); setSentTo(""); }} aria-label="Country code">{CCS.map(c => <option key={c}>{c}</option>)}</select>
            <input id="ph" type="tel" inputMode="tel" autoComplete="tel-national" placeholder="70 123 456" value={num} onChange={e => { setNum(e.target.value); setSentTo(""); }} /></div>
          {sentTo && <><label htmlFor="code">Code Sent On WhatsApp <i>*</i></label>
            <input id="code" className="otp" inputMode="numeric" autoComplete="one-time-code" maxLength={6} placeholder="6 digits" autoFocus value={code}
              onChange={e => { setCode(e.target.value); if (e.target.value.replace(/\D/g, "").length === 6) setTimeout(() => submit(), 0); }} /></>}
        </>}
        <button className="btn pri wide" disabled={busy}>{busy ? "…" : pw || sentTo ? "Sign In" : "Send Code On WhatsApp"}</button>
        <div className={note && !err ? "gnote" : "gerr"}>{err || note}</div>
        <button type="button" className="lnk" onClick={() => { setPw(!pw); setErr(""); setNote(""); }}>{pw ? "Sign in with your phone number instead" : "Sign in with email and password instead"}</button>
      </form>
    </div>
  );
}
