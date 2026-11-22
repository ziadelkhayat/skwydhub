// Skwyd POS register, laid out like the approved design file on a landscape tablet (no motion):
// search + Discount / Charges / Tags / Note on top, category pills, 4 items a row, Functions · Orders · Tables · Pickup & Delivery · Hold · Print at the bottom,
// and the order on the right with In-Store / Pickup / Delivery on top and Send + Pay at the bottom.
// The app's own buttons keep doing the work: the new ones just click them.
(function () {
  const de = document.documentElement;
  const want = () => innerWidth >= 1000 && innerWidth > innerHeight;
  const SV = d => `<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${d}</svg>`;
  const I = { hold: '<path d="M9 5v14M15 5v14"/>', print: '<path d="M7 9V3h10v6"/><rect x="3" y="9" width="18" height="8" rx="2"/><path d="M7 14h10v7H7z"/>', more: '<circle cx="5" cy="12" r="1.3"/><circle cx="12" cy="12" r="1.3"/><circle cx="19" cy="12" r="1.3"/>', people: '<circle cx="9" cy="8" r="3.2"/><path d="M3.5 19a5.5 5.5 0 0 1 11 0"/><path d="M16 5.5a3 3 0 0 1 0 5.8M17.5 19a5 5 0 0 0-2.2-4.1"/>' };
  const css = `
html.posv3 body{font-family:-apple-system,BlinkMacSystemFont,"SF Pro Text",Inter,system-ui,sans-serif!important}
html.posv3 :is(body,#_a#_b#_c#_d#_e#_f) .main.main,html.posv3 :is(body,#_a#_b#_c#_d#_e#_f) .main.main.sqfit{grid-template-columns:minmax(0,1fr) 420px!important;background:#F2F2F7!important;gap:0!important;padding:0!important}
html.posv3 :is(body,#_a#_b#_c#_d#_e#_f) aside.cart{width:420px!important;min-width:420px!important;max-width:420px!important;flex:none!important;background:#fff!important;border-left:1px solid #E3E3E8!important;border-right:0!important;border-radius:0!important;box-shadow:none!important;margin:0!important;display:flex!important;flex-direction:column!important}
html.posv3 :is(body,#_a#_b#_c#_d#_e#_f) .rside{flex:1!important;min-width:0!important;padding:16px!important;display:flex!important;flex-direction:column!important;gap:14px!important;box-sizing:border-box!important;background:#F2F2F7!important}
html.posv3 :is(body,#_a#_b#_c#_d#_e#_f) #abar{display:flex!important;gap:10px!important;align-items:center!important;margin:0!important;padding:0!important;background:none!important;border:0!important;box-shadow:none!important;order:0;flex-wrap:nowrap!important;overflow:visible!important}
html.posv3 :is(body,#_a#_b#_c#_d#_e#_f) #abar > .abtn:is([data-a=print],[data-a=kitchen],[data-a=void],[data-a=hold],[data-a=retrieve]){display:none!important}
html.posv3 :is(body,#_a#_b#_c#_d#_e#_f) #abar > .abtn{flex:0 0 118px!important;width:118px!important;height:56px!important;min-height:56px!important;border-radius:14px!important;border:0!important;background:#fff!important;color:#000!important;font-size:13px!important;font-weight:600!important;display:flex!important;flex-direction:column!important;align-items:center!important;justify-content:center!important;gap:3px!important;padding:0!important;box-shadow:none!important}
html.posv3 :is(body,#_a#_b#_c#_d#_e#_f) #abar > .abtn .rti{width:20px!important;height:20px!important;background:none!important;color:#000!important;padding:0!important;margin:0!important;box-shadow:none!important}
html.posv3 :is(body,#_a#_b#_c#_d#_e#_f) #abar > .abtn .rti svg{width:20px!important;height:20px!important;stroke:#000!important;color:#000!important}
html.posv3 :is(body,#_a#_b#_c#_d#_e#_f) #abar > .msrch{flex:1 1 auto!important;min-width:0!important;height:44px!important;margin:0!important;border-radius:10px!important;background:rgba(118,118,128,.12)!important;border:0!important;box-shadow:none!important;display:flex!important;align-items:center!important;gap:6px!important;padding:0 10px!important;order:-1}
html.posv3 :is(body,#_a#_b#_c#_d#_e#_f) #abar > .msrch svg{width:17px!important;height:17px!important;stroke:#6C6C70!important;fill:none!important;flex:none}
html.posv3 :is(body,#_a#_b#_c#_d#_e#_f) #abar > .msrch input{flex:1!important;min-width:0!important;border:0!important;background:transparent!important;font:inherit!important;font-size:17px!important;height:42px!important;padding:0!important;box-shadow:none!important;outline:0!important}
html.posv3 :is(body,#_a#_b#_c#_d#_e#_f) .rside > .menu{flex:1!important;min-height:0!important;overflow:auto!important;padding:0!important;background:none!important;display:flex!important;flex-direction:column!important;gap:14px!important}
html.posv3 :is(body,#_a#_b#_c#_d#_e#_f) #mcats{display:flex!important;gap:8px!important;overflow-x:auto!important;flex:none!important;padding:0!important;margin:0!important;scrollbar-width:none}
html.posv3 :is(body,#_a#_b#_c#_d#_e#_f) #mcats .v3pill{height:44px!important;padding:0 18px!important;border-radius:999px!important;border:0!important;font:inherit!important;font-size:16px!important;font-weight:600!important;background:#fff!important;color:#000!important;white-space:nowrap!important;flex:none!important;box-shadow:none!important;display:flex!important;align-items:center!important}
html.posv3 :is(body,#_a#_b#_c#_d#_e#_f) #mcats .v3pill.on{background:#1C1C1E!important;color:#fff!important}
html.posv3 :is(body,#_a#_b#_c#_d#_e#_f) #grid#grid#grid#grid{display:grid!important;grid-template-columns:repeat(4,minmax(0,1fr))!important;grid-template-rows:none!important;grid-auto-rows:118px!important;gap:12px!important;padding:0!important;align-content:start!important;justify-content:stretch!important;flex:1 1 auto!important;overflow-y:auto!important}
html.posv3 :is(body,#_a#_b#_c#_d#_e#_f) #grid#grid .prod,html.posv3 :is(body,#_a#_b#_c#_d#_e#_f) #grid .ctile,html.posv3 :is(body,#_a#_b#_c#_d#_e#_f) #grid .cbtile{height:118px!important;min-height:118px!important;border-radius:16px!important;border:0!important;background-color:#fff!important;box-shadow:0 1px 2px rgba(0,0,0,.05)!important}
html.posv3 :is(body,#_a#_b#_c#_d#_e#_f) #bnav{display:flex!important;gap:10px!important;margin:0!important;padding:0!important;background:none!important;border:0!important;box-shadow:none!important;position:static!important;flex:none!important}
html.posv3 :is(body,#_a#_b#_c#_d#_e#_f) #bnav > button{flex:1!important;height:56px!important;min-height:56px!important;border-radius:14px!important;border:0!important;background:#fff!important;color:#000!important;font-size:13px!important;font-weight:600!important;display:flex!important;flex-direction:column!important;align-items:center!important;justify-content:center!important;gap:3px!important;padding:0!important;box-shadow:none!important;position:relative}
html.posv3 :is(body,#_a#_b#_c#_d#_e#_f) #bnav > button[data-nav=new]{display:none!important}
html.posv3 :is(body,#_a#_b#_c#_d#_e#_f) #bnav > button .rti{width:20px!important;height:20px!important;background:none!important;padding:0!important;margin:0!important;box-shadow:none!important}
html.posv3 :is(body,#_a#_b#_c#_d#_e#_f) #bnav > button svg{width:20px!important;height:20px!important;stroke:#000!important;color:#000!important}
html.posv3 :is(body,#_a#_b#_c#_d#_e#_f) #bnav > button > span:not(.rti):not(.badge){font-size:13px!important;font-weight:600!important;color:#000!important}
html.posv3 :is(body,#_a#_b#_c#_d#_e#_f) #bnav .badge{position:absolute!important;top:4px!important;right:8px!important}
html.posv3 :is(body,#_a#_b#_c#_d#_e#_f) .chead{display:flex!important;align-items:center!important;gap:10px!important;padding:14px 16px!important;border-bottom:1px solid #E3E3E8!important;background:#fff!important;min-height:0!important;flex-wrap:nowrap!important}
html.posv3 :is(body,#_a#_b#_c#_d#_e#_f) .chead > :not(.v3seg):not(.v3tbl):not(.v3cm){display:none!important}
html.posv3 :is(body,#_a#_b#_c#_d#_e#_f) .chead > .v3tbl{margin-left:auto}
html.posv3 :is(body,#_a#_b#_c#_d#_e#_f) .chead > .v3tbl[hidden] + .v3cm,html.posv3 :is(body,#_a#_b#_c#_d#_e#_f) .chead > .v3tbl[hidden]{margin-left:auto}
html.posv3 :is(body,#_a#_b#_c#_d#_e#_f) .v3seg{width:250px;display:flex;gap:2px;padding:2px;border-radius:9px;background:rgba(118,118,128,.12);flex:none}
html.posv3 :is(body,#_a#_b#_c#_d#_e#_f) .v3seg button{flex:1;height:28px;border:0;border-radius:7px;font:inherit;font-size:13px;font-weight:500;color:#000;background:transparent;cursor:pointer;padding:0}
html.posv3 :is(body,#_a#_b#_c#_d#_e#_f) .v3seg button.on{background:#fff;font-weight:600;box-shadow:0 3px 8px rgba(0,0,0,.12)}
html.posv3 :is(body,#_a#_b#_c#_d#_e#_f) .v3tbl{display:inline-flex;align-items:center;height:22px;padding:0 8px;border-radius:999px;background:rgba(118,118,128,.12);color:#000;font-size:12px;font-weight:600;white-space:nowrap}
html.posv3 :is(body,#_a#_b#_c#_d#_e#_f) .v3cm{position:relative;margin-left:4px}
html.posv3 :is(body,#_a#_b#_c#_d#_e#_f) .v3cm > button{width:34px;height:34px;border-radius:999px;border:0;background:rgba(118,118,128,.12);display:grid;place-items:center;cursor:pointer;color:#000;padding:0}
html.posv3 :is(body,#_a#_b#_c#_d#_e#_f) .v3cm .v3dot{position:absolute;top:0;right:0;width:9px;height:9px;border-radius:50%;background:#34C759;border:2px solid #fff}
html.posv3 :is(body,#_a#_b#_c#_d#_e#_f) .v3cm .v3dot.off{background:#FF9500}
html.posv3 :is(body,#_a#_b#_c#_d#_e#_f) .v3cmenu{position:absolute;right:0;top:40px;z-index:80;min-width:230px;background:#fff;border-radius:14px;box-shadow:0 10px 40px rgba(0,0,0,.18);padding:6px 0;display:flex;flex-direction:column}
html.posv3 :is(body,#_a#_b#_c#_d#_e#_f) .v3cmenu[hidden]{display:none}
html.posv3 :is(body,#_a#_b#_c#_d#_e#_f) .v3cmenu > *{display:flex;align-items:center;justify-content:space-between;gap:10px;padding:11px 16px;font-size:16px;border:0;background:none;font:inherit;text-align:left;color:#000;cursor:pointer}
html.posv3 :is(body,#_a#_b#_c#_d#_e#_f) .v3cmenu > span{cursor:default;color:#6C6C70;font-size:14px}
html.posv3 :is(body,#_a#_b#_c#_d#_e#_f) #extra .ctx{padding:12px 16px!important;border-bottom:1px solid #E3E3E8!important;border-radius:0!important;background:#fff!important;box-shadow:none!important;margin:0!important}
html.posv3 :is(body,#_a#_b#_c#_d#_e#_f) #lines .line{display:flex!important;align-items:flex-start!important;gap:10px!important;padding:10px 16px!important;border-bottom:1px solid #E3E3E8!important;border-radius:0!important;margin:0!important;background:#fff!important;box-shadow:none!important}
html.posv3 :is(body,#_a#_b#_c#_d#_e#_f) #lines .line > .n{flex:1!important;min-width:0!important;font-size:17px!important}
html.posv3 :is(body,#_a#_b#_c#_d#_e#_f) #lines .line .lqty{order:-1!important;flex:none!important;display:block!important;margin:0!important}
html.posv3 :is(body,#_a#_b#_c#_d#_e#_f) #lines .line .lqty > button{display:none!important}
html.posv3 :is(body,#_a#_b#_c#_d#_e#_f) #lines .line .lqty > :not(button){display:grid!important;place-items:center!important;width:28px!important;height:28px!important;border-radius:8px!important;background:rgba(118,118,128,.12)!important;font-weight:700!important;font-size:15px!important;min-width:0!important;padding:0!important}
html.posv3 :is(body,#_a#_b#_c#_d#_e#_f) :is(#lines,#extra){padding:0!important;margin:0!important}
html.posv3 :is(body,#_a#_b#_c#_d#_e#_f) #totals{padding:12px 16px!important;border-top:1px solid #E3E3E8!important;font-size:15px!important}
html.posv3 :is(body,#_a#_b#_c#_d#_e#_f) #totals .g{font-size:20px!important;font-weight:700!important}
html.posv3 :is(body,#_a#_b#_c#_d#_e#_f) #acts{display:flex!important;gap:10px!important;padding:0 16px 16px!important;border:0!important;background:#fff!important}
html.posv3 :is(body,#_a#_b#_c#_d#_e#_f) #acts > button{height:60px!important;border-radius:16px!important;border:0!important;font:inherit!important;font-size:17px!important;font-weight:600!important;box-shadow:none!important}
html.posv3 :is(body,#_a#_b#_c#_d#_e#_f) #acts > button[data-act=send]{flex:0 0 120px!important;width:120px!important;background:rgba(118,118,128,.12)!important;color:#000!important}
html.posv3 :is(body,#_a#_b#_c#_d#_e#_f) #acts > button{text-transform:none!important;letter-spacing:0!important}
html.posv3 :is(body,#_a#_b#_c#_d#_e#_f) #acts > button:not(.pay):not([data-act=send]){flex:1!important;background:rgba(118,118,128,.12)!important;color:#000!important}
html.posv3 :is(body,#_a#_b#_c#_d#_e#_f) #acts > button.pay{flex:1!important;background:#248A3D!important;color:#fff!important;font-size:20px!important;font-weight:700!important}
html.posv3 :is(body,#_a#_b#_c#_d#_e#_f) #acts > button.pay:disabled{opacity:.45!important}
html.posv3 :is(body,#_a#_b#_c#_d#_e#_f) #morePop .mitem.v3x{color:#000}
html.posv3 :is(body,#_a#_b#_c#_d#_e#_f) #modal.paym2{width:1000px!important;max-width:1000px!important;height:660px!important;max-height:660px!important;border-radius:20px!important;padding:0!important;overflow:hidden!important;background:#F2F2F7!important}
html.posv3 :is(body,#_a#_b#_c#_d#_e#_f) #modal.paym2 .payx{display:grid!important;grid-template-columns:1fr 1fr!important;height:100%!important;gap:0!important}
html.posv3 :is(body,#_a#_b#_c#_d#_e#_f) #modal.paym2 .payl{position:relative!important;padding:22px!important;display:flex!important;flex-direction:column!important;gap:16px!important;background:#F2F2F7!important}
html.posv3 :is(body,#_a#_b#_c#_d#_e#_f) #modal.paym2 .payr{background:#fff!important;padding:22px!important;display:flex!important;flex-direction:column!important;gap:12px!important}
html.posv3 :is(body,#_a#_b#_c#_d#_e#_f) #modal.paym2 .v3ptop{display:flex;justify-content:space-between;align-items:center;min-height:40px}
html.posv3 :is(body,#_a#_b#_c#_d#_e#_f) #modal.paym2 .v3ptop .paycx{background:none!important;border:0!important;color:#0066D6!important;font-size:17px!important;font-weight:400!important;padding:0!important;height:auto!important;min-height:0!important;box-shadow:none!important;display:inline!important;width:auto!important}
html.posv3 :is(body,#_a#_b#_c#_d#_e#_f) #modal.paym2 .v3ptop .splb{height:40px!important;padding:0 18px!important;border-radius:999px!important;border:0!important;background:rgba(118,118,128,.12)!important;color:#0066D6!important;font-size:15px!important;font-weight:600!important;box-shadow:none!important}
html.posv3 :is(body,#_a#_b#_c#_d#_e#_f) #modal.paym2 .ptop{display:block!important;padding:0!important;margin:0!important}
html.posv3 :is(body,#_a#_b#_c#_d#_e#_f) #modal.paym2 .ptop .splbs{display:none!important}
html.posv3 :is(body,#_a#_b#_c#_d#_e#_f) #modal.paym2 .dlbl{font-size:15px!important;color:#6C6C70!important;font-weight:400!important;text-transform:none!important;letter-spacing:0!important}
html.posv3 :is(body,#_a#_b#_c#_d#_e#_f) #modal.paym2 .damt{font-size:44px!important;font-weight:700!important;letter-spacing:-1px!important;line-height:52px!important;color:#000!important}
html.posv3 :is(body,#_a#_b#_c#_d#_e#_f) #modal.paym2 .d2{font-size:17px!important;color:#6C6C70!important}
html.posv3 :is(body,#_a#_b#_c#_d#_e#_f) #modal.paym2 .paym{display:grid!important;grid-template-columns:repeat(3,minmax(0,1fr))!important;gap:10px!important;margin:0!important}
html.posv3 :is(body,#_a#_b#_c#_d#_e#_f) #modal.paym2 .paym button{height:86px!important;border-radius:16px!important;border:0!important;background:#fff!important;font-size:17px!important;font-weight:600!important;color:#000!important;display:flex!important;flex-direction:column!important;align-items:center!important;justify-content:center!important;gap:6px!important;box-shadow:none!important}
html.posv3 :is(body,#_a#_b#_c#_d#_e#_f) #modal.paym2 .paym button.on{border:3px solid #0A66D8!important;color:#0066D6!important}
html.posv3 :is(body,#_a#_b#_c#_d#_e#_f) #modal.paym2 .paym button svg{width:26px!important;height:26px!important}
html.posv3 :is(body,#_a#_b#_c#_d#_e#_f) #modal.paym2 .v3recv{background:#fff;border-radius:12px;overflow:hidden}
html.posv3 :is(body,#_a#_b#_c#_d#_e#_f) #modal.paym2 .v3recv > div{display:flex;justify-content:space-between;align-items:center;min-height:44px;padding:0 16px;font-size:17px;border-top:1px solid #E3E3E8}
html.posv3 :is(body,#_a#_b#_c#_d#_e#_f) #modal.paym2 .v3recv > div:first-child{border-top:0}
html.posv3 :is(body,#_a#_b#_c#_d#_e#_f) #modal.paym2 .v3recv span:last-child{color:#6C6C70}
html.posv3 :is(body,#_a#_b#_c#_d#_e#_f) #modal.paym2 .v3recv .v3c span{font-weight:600;color:#000}
html.posv3 :is(body,#_a#_b#_c#_d#_e#_f) #modal.paym2 .v3recv .v3c span:last-child{color:#248A3D}
html.posv3 :is(body,#_a#_b#_c#_d#_e#_f) #modal.paym2 .tender,html.posv3 :is(body,#_a#_b#_c#_d#_e#_f) #modal.paym2 .tbox{height:64px!important;border-radius:14px!important;background:#F2F2F7!important;border:0!important;font-size:32px!important;font-weight:600!important;text-align:right!important;padding:0 18px!important;box-shadow:none!important}
html.posv3 :is(body,#_a#_b#_c#_d#_e#_f) #modal.paym2 .tbox .tender{background:transparent!important;padding:0!important;height:62px!important}
html.posv3 :is(body,#_a#_b#_c#_d#_e#_f) #modal.paym2 .quick{display:flex!important;gap:8px!important;flex-wrap:wrap!important}
html.posv3 :is(body,#_a#_b#_c#_d#_e#_f) #modal.paym2 .quick button{height:40px!important;padding:0 18px!important;border-radius:999px!important;border:0!important;background:rgba(118,118,128,.12)!important;color:#0066D6!important;font-size:15px!important;font-weight:600!important;box-shadow:none!important;flex:none!important;width:auto!important}
html.posv3 :is(body,#_a#_b#_c#_d#_e#_f) #modal.paym2 .kpad{grid-auto-rows:62px!important;align-content:start!important;flex:none!important;display:grid!important;grid-template-columns:repeat(3,minmax(0,1fr))!important;gap:10px!important}
html.posv3 :is(body,#_a#_b#_c#_d#_e#_f) #modal.paym2 .kpad button{height:62px!important;border-radius:14px!important;border:0!important;background:rgba(118,118,128,.12)!important;font-size:24px!important;font-weight:500!important;color:#000!important;box-shadow:none!important}
html.posv3 :is(body,#_a#_b#_c#_d#_e#_f) #modal.paym2 .payr .change{display:none!important}
html.posv3 :is(body,#_a#_b#_c#_d#_e#_f) #modal.paym2 .payact{margin-top:auto!important;display:flex!important;gap:0!important;padding:0!important}
html.posv3 :is(body,#_a#_b#_c#_d#_e#_f) #modal.paym2 .payact #confirmPay{flex:1!important;height:62px!important;border-radius:16px!important;border:0!important;background:#248A3D!important;color:#fff!important;font-size:20px!important;font-weight:700!important;display:flex!important;align-items:center!important;justify-content:center!important;gap:8px!important;box-shadow:none!important}
html.posv3 :is(body,#_a#_b#_c#_d#_e#_f) #modal.paym2 .payact #confirmPay:disabled{opacity:.45!important}

html.posv3 :is(body,#_a#_b#_c#_d#_e#_f) #abar#abar#abar .abtn.abtn.abtn svg,html.posv3 :is(body,#_a#_b#_c#_d#_e#_f) #abar#abar#abar .abtn.abtn.abtn svg *,html.posv3 :is(body,#_a#_b#_c#_d#_e#_f) #bnav#bnav#bnav > button svg,html.posv3 :is(body,#_a#_b#_c#_d#_e#_f) #bnav#bnav#bnav > button svg *{stroke:#000!important;color:#000!important;width:20px!important;height:20px!important;stroke-width:2!important}
html.posv3 :is(body,#_a#_b#_c#_d#_e#_f) #app .main.main.main.sqfit,html.posv3 :is(body,#_a#_b#_c#_d#_e#_f) #app .main.main.main{grid-template-columns:minmax(0,1fr) 420px!important}
html.posv3 :is(body,#_a#_b#_c#_d#_e#_f) .chead > .v3tbl[hidden]{display:none!important}
html.posv3 :is(#abar .abtn,#bnav > button) .rti{--c:#000!important}
html.posv3 :is(body,#_a#_b#_c#_d#_e#_f) #extra .ctx > .ci,html.posv3 :is(body,#_a#_b#_c#_d#_e#_f) #extra .netst,html.posv3 :is(body,#_a#_b#_c#_d#_e#_f) #extra .ctx b.v3hide{display:none!important}
html.posv3 :is(body,#_a#_b#_c#_d#_e#_f) #extra .ctx{display:flex!important;align-items:center!important;gap:10px!important;min-height:0!important}
html.posv3 :is(body,#_a#_b#_c#_d#_e#_f) #extra .ctx .ctxb{margin:0!important;padding:0!important;display:flex!important;gap:8px!important;justify-content:flex-start!important}
html.posv3 :is(body,#_a#_b#_c#_d#_e#_f) #extra .ctx [data-ctx]{background:none!important;border:0!important;box-shadow:none!important;color:#0066D6!important;font-size:17px!important;font-weight:400!important;padding:0!important;height:auto!important;min-height:0!important;display:inline-flex!important;align-items:center!important;gap:10px!important}
html.posv3 :is(body,#_a#_b#_c#_d#_e#_f) #extra .ctx [data-ctx]::before{content:"";width:20px;height:20px;background:currentColor;-webkit-mask:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='black' stroke-width='2' stroke-linecap='round'%3E%3Ccircle cx='9' cy='8' r='3.2'/%3E%3Cpath d='M3.5 19a5.5 5.5 0 0 1 11 0'/%3E%3Cpath d='M16 5.5a3 3 0 0 1 0 5.8M17.5 19a5 5 0 0 0-2.2-4.1'/%3E%3C/svg%3E") center/contain no-repeat;mask:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='black' stroke-width='2' stroke-linecap='round'%3E%3Ccircle cx='9' cy='8' r='3.2'/%3E%3Cpath d='M3.5 19a5.5 5.5 0 0 1 11 0'/%3E%3Cpath d='M16 5.5a3 3 0 0 1 0 5.8M17.5 19a5 5 0 0 0-2.2-4.1'/%3E%3C/svg%3E") center/contain no-repeat}
html.posv3 :is(body,#_a#_b#_c#_d#_e#_f) #extra .ctx > .sp{display:none!important}
`;
  let done = false;
  function setup() {
    if (done || !document.getElementById("abar")) return;
    done = true;
    const st = document.createElement("style"); st.id = "posv3css"; st.textContent = css; document.head.appendChild(st);
    const abar = document.getElementById("abar"), srch = document.querySelector(".rside .menu .msrch");
    if (srch) abar.prepend(srch);
    const bnav = document.getElementById("bnav");
    const prox = (a, label, icon) => { const b = document.createElement("button"); b.type = "button"; b.className = "v3prox"; b.dataset.v3a = a; b.innerHTML = `<span class="rti">${SV(I[icon])}</span><span>${label}</span>`; return b; };
    bnav.append(prox("hold", "Hold", "hold"), prox("print", "Print", "print"));
    const pop = document.getElementById("morePop");
    const mi = (a, label) => { const b = document.createElement("button"); b.className = "mitem v3x"; b.dataset.v3a = a; b.innerHTML = `<span>${label}</span>`; return b; };
    pop.prepend(mi("new", "New Order"), mi("kitchen", "Send to Kitchen"), mi("retrieve", "Held Orders"), mi("void", "Void"));
    // order type on top of the order, like the file; the till, connection and cashier go under •••
    const head = document.querySelector("aside.cart .chead");
    head.insertAdjacentHTML("beforeend", `<div class="v3seg" role="group" aria-label="Order type"><button type="button" data-v3t="dinein">In-Store</button><button type="button" data-v3t="takeaway">Pickup</button><button type="button" data-v3t="delivery">Delivery</button></div><span style="flex:1"></span><span class="v3tbl" hidden></span><span class="v3cm"><button type="button" aria-label="Till and cashier" data-v3cm>${SV(I.more)}</button><span class="v3dot"></span><span class="v3cmenu" hidden></span></span>`);
    sync();
    try { renderMenu(); } catch (_) {}
  }
  function sync() {
    if (!done) return;
    const A = window.POSAPI, stt = A ? A.state() : {}, t = stt.otype || "dinein";
    document.querySelectorAll(".v3seg [data-v3t]").forEach(b => b.classList.toggle("on", b.dataset.v3t === t || (b.dataset.v3t === "dinein" && !["takeaway", "delivery"].includes(t))));
    const tb = document.querySelector(".chead .v3tbl"); if (tb) { const n = stt.tbl && t === "dinein" ? stt.tbl : ""; tb.hidden = !n; tb.textContent = n; }
    const dot = document.querySelector(".chead .v3dot"), sp = document.getElementById("syncPill"); if (dot && sp) dot.classList.toggle("off", !/online/i.test(sp.textContent || ""));
    document.querySelectorAll('#extra .ctx b').forEach(b => b.classList.toggle("v3hide", /^(Dine-in|In-Store)$/i.test(b.textContent.trim())));
    const send = document.querySelector('#acts [data-act=send]'); if (send && send.textContent.trim() === "Save") send.textContent = "Send";
    const pd = document.querySelector('#bnav [data-nav=board] > span:not(.rti):not(.badge)'); if (pd && pd.textContent !== "Pickup & Delivery") pd.textContent = "Pickup & Delivery";
    const hb = document.getElementById("holdBadge"), r = document.querySelector('#morePop [data-v3a=retrieve] span'); if (r && hb) r.textContent = "Held Orders" + (+hb.textContent ? " (" + hb.textContent + ")" : "");
  }
  function menu() {
    const m = document.querySelector(".chead .v3cmenu"); if (!m) return;
    const txt = id => ((document.getElementById(id) || {}).textContent || "").trim();
    m.innerHTML = `<span>${txt("shiftPill") || "Till"}</span><span>${txt("syncPill") || ""}</span>${txt("cashierName") ? `<button type="button" data-v3lock>Log Out ${txt("cashierName")}</button>` : ""}`;
  }
  document.addEventListener("click", ev => {
    if (!done) return;
    const a = ev.target.closest("[data-v3a]"); if (a) { ev.preventDefault(); ev.stopPropagation(); const k = a.dataset.v3a; try { hideMore(); } catch (_) {}
      if (k === "new") document.querySelector('#bnav [data-nav=new]')?.click(); else document.querySelector(`#abar [data-a="${k}"]`)?.click(); return; }
    const ty = ev.target.closest("[data-v3t]"); if (ty) { ev.preventDefault(); const k = ty.dataset.v3t;
      if (k === "dinein") { const cur = window.POSAPI ? POSAPI.state().otype : "dinein"; if (cur !== "dinein") document.querySelector('#bnav [data-nav=new]')?.click(); }
      else document.querySelector('#bnav [data-nav=board]')?.click();   // pickup and delivery orders start on the Pickup & Delivery screen
      return; }
    const cm = ev.target.closest("[data-v3cm]"); if (cm) { ev.preventDefault(); ev.stopPropagation(); const m = cm.parentElement.querySelector(".v3cmenu"); menu(); m.hidden = !m.hidden; return; }
    if (ev.target.closest("[data-v3lock]")) { ev.preventDefault(); document.getElementById("lockBtn")?.click(); }
    document.querySelectorAll(".chead .v3cmenu").forEach(m => m.hidden = true);
  }, true);
  function wrapPay() {   // payment window like the file: Cancel and Split Check on top, Received / Change under the methods
    if (typeof openPay === "function" && !openPay._v3) { const op = openPay; openPay = function () { const r = op.apply(this, arguments); try { payV3(); } catch (_) {} return r; }; openPay._v3 = 1; }
    if (typeof updChange === "function" && !updChange._v3) { const uc = updChange; updChange = function () { const r = uc.apply(this, arguments); try { recv(); } catch (_) {} return r; }; updChange._v3 = 1; }
  }
  function payV3() {
    if (!de.classList.contains("posv3")) return; const m = document.querySelector("#modal.paym2"); if (!m) return;
    const l = m.querySelector(".payl"); if (!l || l.querySelector(".v3ptop")) return;
    const top = document.createElement("div"); top.className = "v3ptop"; const cx = m.querySelector(".payact .paycx"); if (cx) top.appendChild(cx);
    const sp = m.querySelector(".ptop .splbs"); if (sp) { const w = document.createElement("span"); [...sp.children].forEach(b => w.appendChild(b)); top.appendChild(w); }
    l.prepend(top);
    const dl = m.querySelector(".dlbl"); if (dl && dl.textContent.trim() === "Amount due") dl.textContent = "Amount Due";
    const g = document.createElement("div"); g.className = "v3recv"; g.innerHTML = `<div><span>Received</span><span id="v3rv"></span></div><div class="v3c"><span id="v3chL">Change</span><span id="v3ch"></span></div><div id="v3ch2r"><span id="v3ch2L">Change in LBP</span><span id="v3ch2"></span></div>`;
    (m.querySelector(".paym") || l.lastElementChild).after(g); recv();
  }
  function recv() {   // read from the app's own (hidden) change line, so the numbers are the app's
    const g = document.querySelector("#modal.paym2 .v3recv"); if (!g) return;
    const cb = document.getElementById("cashBox"), cash = cb && cb.style.display !== "none"; g.style.display = cash ? "" : "none"; if (!cash) return;
    const t1 = document.getElementById("tender"), t2 = document.getElementById("tender2"), cur = (document.getElementById("tcurLbl") || {}).textContent || "";
    const sym = ((document.querySelector("#modal.paym2 .damt") || {}).textContent || "").replace(/[\d.,\s-]+$/, "").trim() || cur || "USD";
    const v1 = t1 ? (+t1.value || 0) : 0, v2 = t2 && !t2.hidden && t2.value ? t2.value : "";
    document.getElementById("v3rv").textContent = sym + " " + v1.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + (v2 ? " + " + v2 : "");
    const L = (document.getElementById("chgL") || {}).textContent || "Change", short = /Remaining/.test(L);
    document.getElementById("v3chL").textContent = L;
    const ch = document.getElementById("v3ch"); ch.textContent = (document.getElementById("chg") || {}).textContent || ""; ch.style.color = short ? "#D70015" : "";
    const c2 = (document.getElementById("chg2") || {}).textContent || "", r2 = document.getElementById("v3ch2r"); r2.style.display = c2 ? "" : "none";
    if (c2) { const v = c2.replace(/^=\s*/, ""), code = v.split(" ")[0]; document.getElementById("v3ch2L").textContent = L + " in " + code; document.getElementById("v3ch2").textContent = v; }
  }
  // ---------- Orders: the list on the left, the picked order on the right (the file's POS · Orders)
  const OV3 = { tab: "open", sel: null };
  const esc = v => String(v ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const STC = { pending: "#C93400", active: "#0A66D8", closed: "#248A3D", void: "#D70015", returned: "#D70015", refund: "#D70015", declined: "#D70015" };
  function ordersV3() {
    const A = window.POSAPI; if (!A) return; const S = A.S(), now = Date.now();
    const ahead = o => o.scheduledAt && new Date(o.scheduledAt) > now;
    const all = A.boardOrders("all"), list = OV3.tab === "open" ? all.filter(o => ["active", "pending"].includes(o.status) && !ahead(o)) : OV3.tab === "ahead" ? all.filter(o => ["active", "pending"].includes(o.status) && ahead(o)) : all.filter(o => !["active", "pending"].includes(o.status));
    if (!list.some(o => o.id === OV3.sel)) OV3.sel = list[0]?.id || null;
    const who = o => o.type === "dinein" || o.type === "fast" ? (o.table ? A.tblLbl ? A.tblLbl(o.table) : "Table " + o.table : A.typLbl(o.type)) : [A.typLbl(o.type), (o.customerName || "").split(" ")[0]].filter(Boolean).join(" · ");
    const lbl = o => o.status === "active" && o.dispatchedAt ? "On the road" : o.status === "closed" ? "Paid" : A.stLbl(o);
    const col = o => o.status === "active" && o.dispatchedAt ? "#0071A4" : STC[o.status] || "#6C6C70";
    const chip = o => `<span style="display:inline-flex;align-items:center;height:22px;padding:0 8px;border-radius:999px;background:${col(o)}1A;color:${col(o)};font-size:12px;font-weight:600">${esc(lbl(o))}</span>`;
    const ref = o => o.ref || A.ordRef(o);
    const rows = list.map(o => `<a href="#" data-v3ord="${esc(o.id)}" style="display:flex;gap:12px;align-items:center;padding:12px 16px;text-decoration:none;color:#000;background:${o.id === OV3.sel ? "rgba(10,102,216,.1)" : "transparent"};border-bottom:1px solid #E3E3E8"><div style="flex:1;min-width:0"><div style="font-size:17px;font-weight:600">${esc(ref(o))}</div><div style="font-size:15px;color:#6C6C70;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${esc(who(o))}</div></div><div style="text-align:right"><div style="font-size:17px">${esc(A.usd(o.total))}</div>${chip(o)}</div></a>`).join("") || `<div style="padding:40px 16px;text-align:center;color:#6C6C70;font-size:15px">No orders here</div>`;
    const seg = `<div role="group" style="display:flex;gap:2px;padding:2px;border-radius:9px;background:rgba(118,118,128,.12)">${[["open", "Open"], ["ahead", "Ahead"], ["closed", "Closed"]].map(([k, t]) => `<button type="button" data-v3otab="${k}" style="flex:1;height:28px;border:0;border-radius:7px;font:inherit;font-size:13px;font-weight:${OV3.tab === k ? 600 : 500};color:#000;cursor:pointer;background:${OV3.tab === k ? "#fff" : "transparent"};box-shadow:${OV3.tab === k ? "0 3px 8px rgba(0,0,0,.12)" : "none"}">${t}</button>`).join("")}</div>`;
    const o = list.find(x => x.id === OV3.sel);
    const R = (l, v, o2 = {}) => `<div style="display:flex;align-items:center;gap:10px;min-height:${o2.sub ? 58 : 44}px;padding:0 16px;border-top:1px solid #E3E3E8"><span style="flex:1;min-width:0;padding:8px 0"><span style="display:block;font-size:17px;font-weight:${o2.b ? 600 : 400}">${esc(l)}</span>${o2.sub ? `<span style="display:block;font-size:13px;color:#6C6C70">${esc(o2.sub)}</span>` : ""}</span><span style="font-size:17px;color:${o2.c || "#6C6C70"};white-space:nowrap">${esc(v)}</span></div>`;
    const grp = rs => `<div style="background:#fff;border-radius:12px;overflow:hidden">${rs.join("").replace('border-top:1px solid #E3E3E8', 'border-top:0')}</div>`;
    let det = `<div style="height:70%;display:grid;place-items:center;color:#6C6C70;font-size:17px">Choose an order</div>`;
    if (o) {
      const tm = v => v ? new Date(v).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" }).toLowerCase() : "—";
      const items = (o.items || []).map(i => R(`${i.qty} × ${i.name}`, A.usd((+i.price || 0) * (+i.qty || 1)), { sub: (Array.isArray(i.mods) ? i.mods.map(m => m.name).join(" · ") : i.mods) || "" }));
      if (+o.deliveryFee) items.push(R("Delivery", A.usd(+o.deliveryFee)));
      if (+o.discount) items.push(R("Discount", "− " + A.usd(+o.discount), { c: "#248A3D" }));
      items.push(R("Total", A.usd(+o.total || 0), { b: 1, c: "#000" }));
      const mins = o.createdAt ? Math.max(0, Math.round((now - new Date(o.createdAt)) / 60000)) : 0;
      const info = [R("Placed", tm(o.createdAt)), R("Kitchen", o.status === "active" ? (o.dispatchedAt ? "On the road" : "Preparing · " + mins + " min") : lbl(o), { c: o.status === "active" ? "#0066D6" : null }), R("Payment", o.payment?.method ? o.payment.method : o.status === "closed" ? "Paid" : o.type === "delivery" ? "Cash on delivery" : "Not paid yet")];
      const open = A.isOpenOrd(o), canDrv = o.status === "active" && o.type === "delivery" && !o.dispatchedAt;
      const P = (t, ic, k, pri) => `<button type="button" data-v3oact="${k}" style="height:48px;padding:0 18px;border-radius:999px;border:0;background:${pri ? "#0A66D8" : "rgba(118,118,128,.12)"};color:${pri ? "#fff" : "#0066D6"};font:inherit;font-size:16px;font-weight:600;display:inline-flex;align-items:center;gap:7px;cursor:pointer">${SV(ic)}${t}</button>`;
      const ICN = { print: I.print, edit: '<path d="M4 20h4L19 9l-4-4L4 16z"/>', truck: '<path d="M3 6h11v10H3zM14 10h4l3 3v3h-7"/><circle cx="7" cy="18" r="1.8"/><circle cx="17" cy="18" r="1.8"/>' };
      det = `<div style="display:flex;justify-content:space-between;align-items:center;gap:10px"><div style="min-width:0"><div style="font-size:28px;font-weight:700">${esc(ref(o))}</div><div style="font-size:15px;color:#6C6C70">${esc([A.typLbl(o.type), o.customerName, o.phone ? A.telFmt(o.phone) : "", o.table && o.type === "dinein" ? (A.tblLbl ? A.tblLbl(o.table) : "Table " + o.table) : ""].filter(Boolean).join(" · "))}</div></div><div style="display:flex;gap:10px;flex:none">${P("Print", ICN.print, "print")}${open ? P("Edit", ICN.edit, "edit") : P("Open", ICN.edit, "edit")}${canDrv ? P(o.driverName ? o.driverName : "Assign Driver", ICN.truck, "driver", 1) : ""}</div></div>
<div style="margin-top:16px">${grp(items)}</div><div style="margin-top:18px">${grp(info)}</div>
${open ? `<div style="position:absolute;left:20px;right:20px;bottom:16px;display:flex;gap:10px"><button type="button" data-v3oact="void" style="flex:1;height:60px;border-radius:16px;border:0;background:rgba(215,0,21,.1);color:#D70015;font:inherit;font-size:17px;font-weight:600;cursor:pointer">Void</button>${o.status === "active" && !(o.type === "delivery" && !o.dispatchedAt) ? `<button type="button" data-v3oact="pay" style="flex:2;height:60px;border-radius:16px;border:0;background:#248A3D;color:#fff;font:inherit;font-size:20px;font-weight:700;cursor:pointer">Pay ${esc(A.usd(+o.total || 0))}</button>` : ""}</div>` : ""}`;
    }
    A.modal("incoming", `<div class="v3ords" style="position:absolute;inset:0;display:flex;background:#F2F2F7;font-family:-apple-system,BlinkMacSystemFont,'SF Pro Text',Inter,system-ui,sans-serif;line-height:normal;text-align:left">
<div style="width:440px;flex:none;background:#fff;border-right:1px solid #E3E3E8;overflow:auto">
<div style="display:flex;align-items:center;justify-content:space-between;padding:14px 16px"><button type="button" data-close style="border:0;background:none;color:#0066D6;font:inherit;font-size:17px;display:inline-flex;align-items:center;gap:4px;cursor:pointer;padding:0">${SV('<path d="M15 5l-7 7 7 7"/>')}Register</button><span style="display:flex;gap:8px"><button type="button" data-v3oold aria-label="All orders and filters" title="All orders and filters" style="width:40px;height:40px;border-radius:999px;border:0;background:rgba(118,118,128,.12);display:grid;place-items:center;cursor:pointer;color:#000;padding:0">${SV('<circle cx="10.5" cy="10.5" r="6.5"/><path d="M20 20l-4.8-4.8"/>')}</button></span></div>
<div style="padding:0 16px 8px;font-size:34px;font-weight:700;letter-spacing:-.8px">Orders</div><div style="padding:0 16px 12px">${seg}</div>${rows}</div>
<div style="flex:1;min-width:0;position:relative;padding:16px 20px;box-sizing:border-box;overflow:auto">${det}</div></div>`, true);
    const m = document.getElementById("modal"); m.classList.add("full"); document.getElementById("scrim")?.classList.add("fullscr"); try { A.withNav(); } catch (_) {}
  }
  window.POSV3_ORDERS = ordersV3;
  document.addEventListener("click", ev => {
    const A = window.POSAPI; if (!A || !de.classList.contains("posv3")) return;
    const r = ev.target.closest("[data-v3ord]"); if (r) { ev.preventDefault(); ev.stopPropagation(); OV3.sel = r.dataset.v3ord; return ordersV3(); }
    const t = ev.target.closest("[data-v3otab]"); if (t) { ev.preventDefault(); ev.stopPropagation(); OV3.tab = t.dataset.v3otab; OV3.sel = null; return ordersV3(); }
    if (ev.target.closest("[data-v3oold]")) { ev.preventDefault(); ev.stopPropagation(); A.OV.v3old = true; document.querySelector('#bnav [data-nav=orders]')?.click(); A.OV.v3old = false; return; }   // the full list with search and filters
    const a = ev.target.closest("[data-v3oact]"); if (a) { ev.preventDefault(); ev.stopPropagation(); const k = a.dataset.v3oact, id = OV3.sel; if (!id) return;
      A.loadOrder(id);   // the order opens in the register (after the cashier agrees to clear a cart in progress), then its own button does the job
      if (k === "edit") return;
      let n = 0; const go = () => { if (A.state().eid !== id) { if (++n < 100) setTimeout(go, 100); return; }
        if (k === "print") document.querySelector('#abar [data-a="print"]')?.click();
        else if (k === "void") document.querySelector('#abar [data-a="void"]')?.click();
        else if (k === "driver") document.querySelector('#acts [data-act="driver"]')?.click();
        else if (k === "pay") document.querySelector('#acts [data-act="pay"]')?.click(); };
      setTimeout(go, 50); }
  }, true);
  function apply() {
    const w = want(); de.classList.toggle("posv3", w);
    if (w) setup();
    if (done) { const st = document.getElementById("posv3css"); if (st) st.disabled = !w; }
  }
  // keep the header in step with the order
  const wrap = () => { if (typeof renderCart === "function" && !renderCart._v3) { const rc = renderCart; renderCart = function () { const r = rc.apply(this, arguments); try { sync(); } catch (_) {} return r; }; renderCart._v3 = 1; } };
  apply(); window.__posv3sync = () => { try { sync(); } catch (_) {} };
  const mo = document.getElementById("modal"); if (mo) new MutationObserver(() => { if (mo.classList.contains("paym2") && !mo.querySelector(".v3ptop")) payV3(); }).observe(mo, { childList: true, attributes: true, attributeFilter: ["class"] });
  document.addEventListener("click", ev => { if (ev.target.closest("#modal.paym2")) setTimeout(() => { try { recv(); } catch (_) {} }, 0); });
  new MutationObserver(() => { clearTimeout(sync.t); sync.t = setTimeout(() => { if (de.classList.contains("posv3")) sync(); }, 30); }).observe(document.getElementById("extra") || document.body, { childList: true, subtree: true, characterData: true });
  addEventListener("resize", () => { const was = de.classList.contains("posv3"); apply(); if (was !== de.classList.contains("posv3")) try { renderMenu(); } catch (_) {} });
  setInterval(() => { if (de.classList.contains("posv3")) sync(); }, 1500);
})();
