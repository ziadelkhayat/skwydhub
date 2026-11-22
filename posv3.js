// Skwyd POS, iOS design over the register as it works today: the same buttons in the same places, the same flow
// (categories as tiles with Back, the Orders list, Save and Pay), only drawn like iOS. No motion.
(function () {
  const de = document.documentElement;
  const want = () => innerWidth >= 1000 && innerWidth > innerHeight;
  const SV = d => `<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${d}</svg>`;
  const P = 'html.posv3 :is(body,#_a#_b#_c#_d#_e#_f) ';
  const T = "#0066D6", L2 = "#6C6C70", SEP = "#E3E3E8";
  const css = `
html.posv3 body{font-family:-apple-system,BlinkMacSystemFont,"SF Pro Text",Inter,system-ui,sans-serif!important}
${P}.main{background:#F2F2F7!important}
${P}.rside{background:#F2F2F7!important}
${P}#abar .abtn.abtn.abtn,${P}#bnav > button{border-radius:14px!important;border:0!important;background:#fff!important;color:#000!important;box-shadow:none!important;font-weight:600!important;transition:none!important;animation:none!important;-webkit-tap-highlight-color:transparent}
${P}#abar .abtn.abtn.abtn > span:not(.rti):not(.badge),${P}#bnav > button > span:not(.rti):not(.badge){color:#000!important;font-weight:600!important;text-transform:none!important;letter-spacing:0!important}
${P}#abar .abtn.abtn.abtn .rti,${P}#bnav > button .rti{background:transparent!important;box-shadow:none!important}
${P}#abar#abar#abar .abtn.abtn.abtn svg,${P}#abar#abar#abar .abtn.abtn.abtn svg *,${P}#bnav#bnav#bnav > button svg,${P}#bnav#bnav#bnav > button svg *{stroke:${T}!important;color:${T}!important;stroke-width:2!important}
${P}#abar .abtn.abtn.abtn.off{opacity:.35!important}
${P}:is(#abar .abtn,#bnav > button,#grid > button,#acts > button,#lines .line):active{opacity:.55!important;transform:none!important}
${P}.msrch{height:44px!important;border-radius:10px!important;background:rgba(118,118,128,.12)!important;border:0!important;box-shadow:none!important}
${P}.msrch input{background:transparent!important;border:0!important;box-shadow:none!important;font-size:17px!important}
${P}.msrch input::placeholder{text-transform:none!important;color:${L2}!important}
${P}.msrch svg{stroke:${L2}!important;fill:none!important}
${P}#grid > :is(.prod,.ctile,.csub){border-radius:16px!important;border:0!important;background-color:#fff!important;box-shadow:0 1px 2px rgba(0,0,0,.05)!important;transition:none!important}
${P}#grid > .cbtile{border-radius:16px!important;border:0!important;background:rgba(118,118,128,.12)!important;color:${T}!important;box-shadow:none!important}
${P}#grid > .cbtile svg{stroke:${T}!important}
${P}#grid > button:active{background-color:#E5E5EA!important}
${P}aside.cart{background:#fff!important;box-shadow:none!important}
${P}.main.main.main,${P}.main.main.main.sqfit{grid-template-columns:calc(100% - var(--rw, 66%)) var(--rw, 66%)!important}
@media (max-width:1180px){ ${P}.main.main.main,${P}.main.main.main.sqfit{grid-template-columns:340px minmax(0,1fr)!important} }
${P}.main > aside.cart{order:0!important;grid-column:1!important;grid-row:1!important;border-left:0!important;border-right:1px solid ${SEP}!important}
${P}.main > .rside{order:1!important;grid-column:2!important;grid-row:1!important;padding-right:12px!important;padding-left:12px!important;box-sizing:border-box!important}
${P}#extra .ctx{margin:10px 12px!important;padding:12px 14px!important}
${P}#extra .ctx .ci{background:rgba(10,102,216,.12)!important;color:${T}!important;border-radius:10px!important;box-shadow:none!important}
${P}#extra .ctx .ci svg{stroke:${T}!important}
${P}#extra .netst{border-radius:999px!important;background:rgba(52,199,89,.15)!important;color:#248A3D!important;border:0!important;font-weight:600!important}
${P}#extra .netst.off{background:rgba(255,149,0,.15)!important;color:#C93400!important}
${P}#lines .line{padding-left:16px!important;padding-right:16px!important}
${P}#lines .line .each{color:${L2}!important}
${P}#acts{padding:12px 16px 16px!important;background:#fff!important;border-top:0!important}

${P}.chead{background:rgba(249,249,249,.94)!important;border-bottom:1px solid ${SEP}!important;-webkit-backdrop-filter:saturate(180%) blur(20px);backdrop-filter:saturate(180%) blur(20px)}
${P}.chead .pill,${P}.chead .sync,${P}.chead .lockb{height:26px!important;border-radius:999px!important;border:0!important;box-shadow:none!important;font-size:12px!important;font-weight:600!important;padding:0 10px!important;display:inline-flex!important;align-items:center!important;gap:4px!important}
${P}.chead .pill{background:rgba(52,199,89,.15)!important;color:#248A3D!important}
${P}.chead .pill.off{background:rgba(255,149,0,.15)!important;color:#C93400!important}
${P}.chead .lockb{background:rgba(118,118,128,.12)!important;color:#000!important}
${P}#extra .ctx{border-radius:12px!important;box-shadow:none!important;border:0!important;background:#F2F2F7!important}
${P}#extra [data-ctx],${P}#extra .ctxb button{border-radius:999px!important;border:0!important;box-shadow:none!important;background:rgba(118,118,128,.12)!important;color:${T}!important;font-weight:600!important;text-transform:none!important}
${P}#lines .line{border:0!important;border-radius:0!important;box-shadow:none!important;background:#fff!important;position:relative!important}
${P}#lines .line::after{content:"";position:absolute;left:16px;right:0;bottom:0;height:1px;background:${SEP}}
${P}#lines .line .n{font-size:17px!important}
${P}#lines .line .p{font-size:17px!important;font-variant-numeric:tabular-nums}
${P}#lines .lqty{background:rgba(118,118,128,.12)!important;border-radius:9px!important;border:0!important;box-shadow:none!important;padding:2px!important;gap:0!important}
${P}#lines .lqty > button{background:transparent!important;border:0!important;box-shadow:none!important;color:#000!important;border-radius:7px!important}
${P}#lines .lqty > button.qdel{color:#D70015!important}
${P}#totals{border-top:1px solid ${SEP}!important;font-variant-numeric:tabular-nums}
${P}#totals .g{font-size:20px!important;font-weight:700!important}
${P}#acts > button{height:60px!important;border-radius:16px!important;border:0!important;box-shadow:none!important;font-size:17px!important;font-weight:600!important;text-transform:none!important;letter-spacing:0!important;transition:none!important}
${P}#acts > button:not(.pay):not(.decl){background:rgba(118,118,128,.12)!important;color:#000!important}
${P}#acts > button.pay{background:#248A3D!important;color:#fff!important;font-size:20px!important;font-weight:700!important}
${P}#acts > button.decl{background:rgba(215,0,21,.1)!important;color:#D70015!important}
${P}#acts > button:disabled{opacity:.45!important}
${P}#morePop{border-radius:14px!important;box-shadow:0 10px 40px rgba(0,0,0,.18)!important;padding:6px 0!important;background:#fff!important;border:0!important}
${P}#morePop .mitem{min-height:44px!important;padding:0 16px!important;font-size:17px!important;font-weight:400!important;color:#000!important;border-radius:0!important;border:0!important;border-top:1px solid ${SEP}!important;background:#fff!important;display:flex!important;align-items:center!important;gap:12px!important}
${P}#morePop .mitem:first-child{border-top:0!important}
${P}#morePop .mitem svg{width:22px!important;height:22px!important;stroke:${T}!important;fill:none!important;flex:none}
${P}#morePop .mitem#exitBtn,${P}#morePop .mitem#exitBtn svg{color:#D70015!important;stroke:#D70015!important}
${P}#morePop .mitem:active{background:#E5E5EA!important}
${P}#modal .ohdr{display:flex!important;align-items:center!important;gap:10px!important;min-height:56px!important;padding:6px 16px!important;background:rgba(249,249,249,.94)!important;border-bottom:1px solid ${SEP}!important;-webkit-backdrop-filter:saturate(180%) blur(20px);backdrop-filter:saturate(180%) blur(20px)}
${P}#modal .ohdr > b{font-size:22px!important;font-weight:700!important;letter-spacing:-.3px!important;color:#000!important}
${P}#modal .ohdr .hbtn[data-close]{background:none!important;border:0!important;box-shadow:none!important;color:${T}!important;font-size:17px!important;font-weight:400!important;padding:0 6px 0 0!important;min-width:0!important;height:44px!important;display:inline-flex!important;align-items:center!important;gap:2px!important}
${P}#modal .ohdr .hbtn:not([data-close]){height:40px!important;padding:0 18px!important;border-radius:999px!important;border:0!important;box-shadow:none!important;background:#0A66D8!important;color:#fff!important;font-size:15px!important;font-weight:600!important}
${P}#modal .ohdr .hbtn.ghost,${P}#modal .ohdr button:not([data-close]):not(.hbtn),${P}#modal .ohdr :is(.ovfbtn,.ovrange){height:40px!important;padding:0 18px!important;border-radius:999px!important;border:0!important;box-shadow:none!important;background:rgba(118,118,128,.12)!important;color:${T}!important;font-size:15px!important;font-weight:600!important}
${P}#modal .ohdr .ovsrch{height:36px!important;border-radius:10px!important;background:rgba(118,118,128,.12)!important;border:0!important;box-shadow:none!important}
${P}#modal .ohdr .ovsrch input{background:transparent!important;border:0!important;box-shadow:none!important;font-size:17px!important}
${P}#modal .otabs2{background:rgba(118,118,128,.12)!important;border-radius:9px!important;padding:2px!important;gap:2px!important;border:0!important;box-shadow:none!important}
${P}#modal .otabs2 button{border-radius:7px!important;border:0!important;box-shadow:none!important;font-size:13px!important;font-weight:500!important;color:#000!important;background:transparent!important;height:32px!important}
${P}#modal .otabs2 button.on{background:#fff!important;font-weight:600!important;box-shadow:0 3px 8px rgba(0,0,0,.12)!important}
${P}#modal .olist2{border-radius:12px!important;overflow:hidden!important;border:0!important;box-shadow:none!important;background:#fff!important}
${P}#modal .olist2 .lrow{border-radius:0!important;border:0!important;border-bottom:1px solid ${SEP}!important;box-shadow:none!important;background:#fff!important}
${P}#modal .olist2 .lrow.lhead{background:#F7F7FA!important;color:${L2}!important}
${P}#modal :is(.ocard,.ocol .ochead){border-radius:14px!important;border:0!important;box-shadow:none!important}
${P}#modal .mh{background:rgba(249,249,249,.94)!important;border-bottom:1px solid ${SEP}!important}
${P}#modal .mh h2{font-size:17px!important;font-weight:600!important;color:#000!important}
${P}#modal .mf .btn{height:50px!important;border-radius:14px!important;font-size:17px!important;font-weight:600!important;box-shadow:none!important;text-transform:none!important}
${P}#modal.paym2{border-radius:20px!important;overflow:hidden!important;background:#F2F2F7!important}
${P}#modal.paym2 .payl{background:#F2F2F7!important}
${P}#modal.paym2 .payr{background:#fff!important}
${P}#modal.paym2 .dlbl{font-size:15px!important;color:${L2}!important;font-weight:400!important;text-transform:none!important;letter-spacing:0!important}
${P}#modal.paym2 .damt{font-size:44px!important;font-weight:700!important;letter-spacing:-1px!important;color:#000!important}
${P}#modal.paym2 .paym button{border-radius:16px!important;border:0!important;background:#fff!important;font-weight:600!important;color:#000!important;box-shadow:none!important}
${P}#modal.paym2 .paym button.on{box-shadow:inset 0 0 0 3px #0A66D8!important;color:${T}!important}
${P}#modal.paym2 .tender,${P}#modal.paym2 .tbox{border-radius:14px!important;background:#F2F2F7!important;border:0!important;box-shadow:none!important}
${P}#modal.paym2 .tbox .tender{background:transparent!important}
${P}#modal.paym2 .quick button{border-radius:999px!important;border:0!important;background:rgba(118,118,128,.12)!important;color:${T}!important;font-weight:600!important;box-shadow:none!important}
${P}#modal.paym2 .kpad button{border-radius:14px!important;border:0!important;background:rgba(118,118,128,.12)!important;color:#000!important;box-shadow:none!important;font-weight:500!important}
${P}#modal.paym2 .kpad button:active{background:#D1D1D6!important}
${P}#modal.paym2 #confirmPay{border-radius:16px!important;background:#248A3D!important;color:#fff!important;font-weight:700!important;box-shadow:none!important}
${P}#modal.paym2 .paycx{border-radius:16px!important;background:rgba(118,118,128,.12)!important;color:${T}!important;box-shadow:none!important}
${P}#modal.dlg2 .mh{position:relative!important;display:flex!important;justify-content:center!important;align-items:center!important;min-height:52px!important;padding:0 16px!important;border-bottom:1px solid rgba(60,60,67,.18)!important;background:rgba(249,249,249,.94)!important}
${P}#modal.dlg2 .mh h2{position:absolute!important;left:50%!important;transform:translateX(-50%)!important;font-size:17px!important;font-weight:600!important;margin:0!important;color:#000!important}
${P}#modal .v3nb{position:absolute;inset:0 16px;display:flex;justify-content:space-between;align-items:center;pointer-events:none}
${P}#modal .v3nb button{pointer-events:auto;border:0!important;background:none!important;color:${T}!important;font-size:17px!important;font-weight:400!important;padding:0!important;min-height:44px;box-shadow:none!important}
${P}#modal .v3nb button.b{font-weight:600!important}
${P}#modal .v3hid{display:none!important}
${P}#modal.dlg2 .npad button{border:0!important;border-radius:14px!important;background:rgba(118,118,128,.12)!important;color:#000!important;box-shadow:none!important;font-weight:500!important}
${P}#modal.dlg2 .npad button:active{background:#D1D1D6!important}
${P}#modal.dlg2 .dz2 button{border:0!important;border-radius:9px!important;background:rgba(118,118,128,.12)!important;color:#000!important;box-shadow:none!important}
${P}#modal.dlg2 .dz2 button.on{background:${T}!important;color:#fff!important}
${P}#modal.dlg2 .dz2 input{font-size:22px!important;font-weight:600!important;text-align:right!important;border:0!important;border-radius:10px!important;background:rgba(118,118,128,.12)!important}
${P}#modal.paym2 .v3pcx{display:block;align-self:flex-start;text-align:left;margin-right:auto;border:0;background:none;color:${T};font:inherit;font-size:17px;padding:0 0 10px;cursor:pointer;min-height:44px}
${P}#modal.paym2 .payact{display:flex!important}${P}#modal.paym2 .payact #confirmPay{flex:1 1 auto!important;width:100%!important}
`;
  let done = false;
  function setup() { if (done) return; done = true; const st = document.createElement("style"); st.id = "posv3css"; st.textContent = css; document.head.appendChild(st); }
  // the full screens' Back reads "‹ Register", like an iOS back button (it does the same thing)
  const backs = () => document.querySelectorAll("#modal .ohdr .hbtn[data-close]").forEach(b => { if (!b.dataset.v3b) { b.dataset.v3b = 1; b.innerHTML = SV('<path d="M15 5l-7 7 7 7"/>') + "Register"; } });

  // pop-ups (Discount, Charges, Tags, Notes, printers) as iOS sheets: Cancel · Title · Save in the top bar, no motion
  const sheets = () => { const m = document.getElementById("modal"); if (!m) return;
    if (m.classList.contains("dlg2") && !m.querySelector(".v3nb")) { const mh = m.querySelector(".mh"), mf = m.querySelector(".mf"); if (!mh) return;
      const can = (mf && [...mf.querySelectorAll("button")].find(b => /^(cancel|close)$/i.test(b.textContent.trim()))) || mh.querySelector("[data-close]"), pri = mf && mf.querySelector(".btn.pri");
      const nb = document.createElement("div"); nb.className = "v3nb";
      const L = document.createElement("button"); L.type = "button"; L.textContent = "Cancel"; L.onclick = () => can && can.click();
      const R = document.createElement("button"); R.type = "button"; R.className = "b"; R.textContent = pri ? pri.textContent.trim() : ""; if (pri) R.onclick = () => pri.click(); else R.style.visibility = "hidden";
      nb.append(L, R); mh.appendChild(nb); mh.querySelectorAll(".x").forEach(x => x.classList.add("v3hid"));
      if (mf) { const rest = [...mf.querySelectorAll("button")].filter(b => b !== pri && b !== can); if (!rest.length) mf.classList.add("v3hid"); else { pri && pri.classList.add("v3hid"); can && can.classList.add("v3hid"); } } }
    // payment: Cancel at the top left, as in the design file; Complete Sale takes the whole bottom
    if (m.classList.contains("paym2") && !m.querySelector(".v3pcx")) { const cx = m.querySelector(".paycx"), l = m.querySelector(".payl"); if (cx && l) { const b = document.createElement("button"); b.type = "button"; b.className = "v3pcx"; b.textContent = "Cancel"; b.onclick = () => cx.click(); l.insertBefore(b, l.firstChild); cx.classList.add("v3hid"); } } };
  function apply() { const w = want(); de.classList.toggle("posv3", w); if (w) setup(); const st = document.getElementById("posv3css"); if (st) st.disabled = !w; }
  apply();
  addEventListener("resize", apply);
  const mo = document.getElementById("modal"); if (mo) new MutationObserver(() => { if (de.classList.contains("posv3")) { backs(); sheets(); } }).observe(mo, { childList: true, subtree: true });
})();
