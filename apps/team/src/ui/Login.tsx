// Sign in with the phone number the manager saved on the employee: a 6-digit code comes on WhatsApp (team.html loginView / codeView).
import { useEffect, useState } from "react";
import { Pressable, TextInput, View } from "react-native";
import { LS, sb } from "../lib/sb";
import { useTeam } from "../lib/team";
import { C, F, R } from "../lib/theme";
import { Btn, T } from "./kit";

const CCS: [string, string][] = [["+961", "Lebanon"], ["+971", "UAE"], ["+966", "Saudi Arabia"], ["+974", "Qatar"], ["+965", "Kuwait"], ["+973", "Bahrain"], ["+968", "Oman"], ["+962", "Jordan"], ["+20", "Egypt"], ["+90", "Turkey"], ["+33", "France"], ["+44", "UK"], ["+1", "USA / Canada"]];
const inp = { height: 50, borderWidth: 1, borderColor: C.field, borderRadius: R.sm, paddingHorizontal: 14, fontFamily: F.r, fontSize: 17, color: C.ink, backgroundColor: "#fff" } as const;

export function Login() {
  const { boot, note } = useTeam();
  const [cc, setCc] = useState("+961"), [n, setN] = useState(""), [phone, setPhone] = useState(""), [code, setCode] = useState(""), [err, setErr] = useState(note), [busy, setBusy] = useState(false), [ccOpen, setCcOpen] = useState(false), [wait, setWait] = useState(0);
  useEffect(() => { LS.get("skwyd_team_phone", { cc: "+961", n: "" }).then(v => { setCc(v.cc); setN(v.n); }); }, []);
  useEffect(() => { if (wait <= 0) return; const t = setTimeout(() => setWait(w => w - 1), 1000); return () => clearTimeout(t); }, [wait]);
  const send = async () => {
    const num = n.replace(/\D/g, "").replace(/^0+/, ""); if (num.length < 6) return setErr("Enter your phone number.");
    setBusy(true); setErr(""); const ph = cc + num; LS.set("skwyd_team_phone", { cc, n: num });
    const { error } = await sb.auth.signInWithOtp({ phone: ph, options: { shouldCreateUser: false } }); setBusy(false);
    if (error) return setErr(/not found|signups not allowed|user/i.test(error.message) ? "This number has no app login. Ask your manager to turn it on." : /provider|unsupported|disabled/i.test(error.message) ? "Sign-in by phone isn't set up yet. Ask your manager." : /rate|seconds/i.test(error.message) ? "Wait a minute, then try again." : error.message);
    setPhone(ph); setCode(""); setWait(30);
  };
  const verify = async (k = code) => {
    if (k.replace(/\D/g, "").length < 6) return setErr("Enter the 6-digit code.");
    setBusy(true); setErr(""); const { error } = await sb.auth.verifyOtp({ phone, token: k.replace(/\D/g, ""), type: "sms" }); setBusy(false);
    if (error) return setErr(/expired|invalid/i.test(error.message) ? "Wrong or expired code." : error.message);
    boot();
  };
  return (
    <View style={{ flex: 1, backgroundColor: C.bg, justifyContent: "center", padding: 24 }}>
      <View style={{ alignItems: "center", marginBottom: 28, gap: 10 }}>
        <View style={{ width: 64, height: 64, borderRadius: 16, backgroundColor: C.brand, alignItems: "center", justifyContent: "center" }}><T w="b" size={28} color="#fff">S</T></View>
        <T w="s" size={22}>SKWYD Team</T>
      </View>
      {!phone ? <View style={{ gap: 12 }}>
        <T size={14} color={C.ink2}>Phone Number *</T>
        <View style={{ flexDirection: "row", gap: 8 }}>
          <Pressable accessibilityLabel="Country code" onPress={() => setCcOpen(v => !v)} style={[inp, { justifyContent: "center", width: 96 }]}><T size={17}>{cc}</T></Pressable>
          <TextInput value={n} onChangeText={setN} keyboardType="phone-pad" placeholder="70 123 456" placeholderTextColor={C.mut2} accessibilityLabel="Phone number" style={[inp, { flex: 1 }]} onSubmitEditing={send} />
        </View>
        {ccOpen ? <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6 }}>{CCS.map(([c, nm]) => <Btn key={c} kind={c === cc ? "soft" : "outline"} height={36} label={`${c} ${nm}`} textStyle={{ fontSize: 13 }} onPress={() => { setCc(c); setCcOpen(false); }} />)}</View> : null}
        <T size={14} color={C.bad} style={{ minHeight: 20 }}>{err}</T>
        <Btn kind="primary" height={52} label={busy ? "Sending…" : "Send Code On WhatsApp"} disabled={busy} onPress={send} />
        <T size={13} color={C.mut} style={{ textAlign: "center", marginTop: 10 }}>Use the phone number your manager saved for you.</T>
      </View> : <View style={{ gap: 12 }}>
        <T color={C.ink2} style={{ textAlign: "center" }}>We sent a code on WhatsApp to{"\n"}<T w="s">{phone}</T></T>
        <TextInput value={code} onChangeText={v => { setCode(v); if (v.replace(/\D/g, "").length === 6) verify(v); }} keyboardType="number-pad" maxLength={6} placeholder="6 digits" placeholderTextColor={C.mut2} accessibilityLabel="Code" autoComplete="one-time-code" textContentType="oneTimeCode"
          style={[inp, { textAlign: "center", letterSpacing: 8, fontSize: 24, fontFamily: F.b }]} />
        <T size={14} color={C.bad} style={{ minHeight: 20 }}>{err}</T>
        <Btn kind="primary" height={52} label={busy ? "Signing in…" : "Sign In"} disabled={busy} onPress={() => verify()} />
        <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
          <Btn kind="ghost" label="Change Number" onPress={() => { setPhone(""); setErr(""); }} />
          <Btn kind="ghost" label={wait > 0 ? `Send Again (${wait})` : "Send Again"} disabled={wait > 0 || busy} onPress={send} />
        </View>
      </View>}
    </View>
  );
}
