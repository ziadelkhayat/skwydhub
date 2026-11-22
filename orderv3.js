// Web ordering on phones, drawn like the approved design file: the cover with the order type and Sign In on it, the store card,
// "Deliver to" under it, the iOS search, category pills, items in one white card with the photo on the right, and the View Basket bar.
// Same page, same buttons (data-otype, data-acct, data-loc, data-qa-p …): only placement and look change. No new motion.
(function () {
  const de = document.documentElement, on = () => innerWidth <= 760;
  const P = 'html.ov3 :is(body,#_a#_b#_c#_d#_e#_f) ';
  const T = "var(--acc,#1F3A93)", L2 = "#6C6C70", SEP = "#E3E3E8";
  const css = `
html.ov3 body{background:#F2F2F7!important;font-family:-apple-system,BlinkMacSystemFont,"SF Pro Text",Inter,system-ui,sans-serif!important}
${P}.hero{position:relative!important;margin:0!important;padding:0 0 4px!important;background:none!important}
${P}.hero .cover{height:170px!important;min-height:170px!important;border-radius:0!important;margin:0!important}
${P}.v3tb{position:absolute;left:16px;right:16px;top:calc(12px + env(safe-area-inset-top));z-index:5;display:flex;justify-content:space-between;align-items:center;gap:8px}
${P}.v3tb .tbmode{display:contents!important}
${P}.v3tb .otype,${P}.v3tb .acbtn{height:38px!important;padding:0 16px!important;border-radius:999px!important;border:0!important;background:rgba(255,255,255,.85)!important;-webkit-backdrop-filter:saturate(180%) blur(20px);backdrop-filter:saturate(180%) blur(20px);color:${T}!important;font-size:15px!important;font-weight:600!important;box-shadow:none!important;display:inline-flex!important;align-items:center!important;gap:6px!important;margin:0!important;text-transform:none!important;letter-spacing:0!important}
${P}.v3tb .otype i{display:none!important}
${P}.v3tb .otype svg,${P}.v3tb .otype .oi svg{width:18px!important;height:18px!important;stroke:currentColor!important}
${P}.v3tb .acbtn .av{width:24px;height:24px;border-radius:50%;font-size:11px}
${P}.hero .hcard{margin:-44px 16px 0!important;position:relative!important;z-index:2;border-radius:16px!important;background:#fff!important;box-shadow:0 2px 12px rgba(0,0,0,.06)!important;padding:14px 16px!important;border:0!important}
${P}.hero .hin{display:flex!important;align-items:center!important;gap:12px!important;padding:0!important}
${P}.hero .logo{width:56px!important;height:56px!important;min-width:56px!important;border-radius:50%!important;font-size:22px!important;box-shadow:none!important;border:0!important;margin:0!important}
${P}.hero h1#brand{font-size:22px!important;line-height:28px!important;font-weight:700!important;letter-spacing:-.3px!important;margin:0!important}
${P}.hero #sub{display:none!important}
${P}.hero .chips{display:flex!important;flex-wrap:wrap!important;gap:0!important;margin:2px 0 0!important;padding:0!important}
${P}.hero .chips .chip{background:none!important;border:0!important;box-shadow:none!important;padding:0!important;height:auto!important;font-size:15px!important;font-weight:400!important;color:${L2}!important;display:inline-flex!important;align-items:center!important;gap:0!important}
${P}.hero .chips .chip + .chip::before{content:"·";margin:0 5px;color:${L2}}
${P}.hero .chips .chip svg,${P}.hero .chips .chip i{display:none!important}
${P}.hero .chips a.chip{color:${T}!important}
${P}#locbar{margin:12px 16px 0!important;padding:0!important;background:none!important;border:0!important;box-shadow:none!important;position:static!important}
${P}#locbar .dlvtop{width:100%!important;display:flex!important;align-items:center!important;gap:12px!important;padding:10px 16px!important;min-height:56px!important;border-radius:12px!important;background:#fff!important;border:0!important;box-shadow:none!important;text-align:left!important;margin:0!important}
${P}#locbar .dlvtop .di{background:none!important;width:22px!important;height:22px!important;min-width:22px!important;color:${T}!important;box-shadow:none!important}
${P}#locbar .dlvtop .di svg{stroke:${T}!important;width:22px!important;height:22px!important}
${P}#locbar .dlvtop b{font-size:15px!important;font-weight:600!important;color:#000!important;text-transform:none!important}
${P}#locbar .dlvtop small{font-size:13px!important;color:${L2}!important;text-transform:none!important}
${P}#locbar .dchev{color:#C4C4C7!important;font-style:normal;font-size:22px}
${P}#topbar{display:none!important}
${P}.hero .hin{background:none!important;box-shadow:none!important;border:0!important;width:auto!important;max-width:none!important;margin:0!important;border-radius:0!important}
${P}.hero .hmeta{padding:0!important;background:none!important}
${P}.hero .chips .chip{text-transform:none!important;letter-spacing:0!important}
${P}.tools .srch{background:rgba(118,118,128,.12)!important;padding:0 10px!important;border:0!important;box-shadow:none!important;height:36px!important;border-radius:10px!important;gap:6px!important}
${P}.tools .srch svg{color:${L2}!important;width:17px!important;height:17px!important}
${P}#catBar,${P}.tools .crow{-webkit-mask:none!important;mask:none!important}
${P}#catBar::before,${P}#catBar::after,${P}.tools .crow::before,${P}.tools .crow::after{display:none!important}
${P}main#main,${P}.shell{padding-left:0!important;padding-right:0!important;margin-left:0!important;margin-right:0!important;max-width:none!important}
${P}#bar{position:fixed!important;width:auto!important;max-width:none!important;transform:none!important;z-index:40}
${P}#bar #cartBtn > span:nth-child(2){display:block!important}

${P}.tools{background:#F2F2F7!important;padding:12px 16px 8px!important;margin:0!important;box-shadow:none!important;border:0!important}
${P}.tools .srch{margin:0 0 10px!important}
${P}.tools .srch input{height:34px!important;border-radius:0!important;border:0!important;background:transparent!important;box-shadow:none!important;font-size:17px!important;padding:0!important;margin:0!important}
${P}.tools .srch input::placeholder{text-transform:none!important;color:${L2}!important}
${P}.tools .vtog{display:none!important}
${P}.tools .cprog{display:none!important}
${P}#catBar{gap:8px!important;padding:0!important}
${P}#catBar button{height:40px!important;padding:0 16px!important;border-radius:999px!important;border:0!important;background:#fff!important;color:#000!important;font-size:15px!important;font-weight:600!important;box-shadow:none!important}
${P}#catBar button.on{background:${T}!important;color:#fff!important}
${P}#menuBox .cat{padding:0 16px!important;margin:6px 0 18px!important}
${P}#menuBox .ch{font-size:22px!important;font-weight:700!important;letter-spacing:-.3px!important;margin:8px 0 8px!important;border:0!important;padding:0!important}
${P}#menuBox .ch small{display:none!important}
${P}#menuBox .items{display:block!important;background:#fff!important;border-radius:12px!important;overflow:hidden!important;margin:0!important;padding:0!important;box-shadow:none!important}
${P}#menuBox .item{display:grid!important;grid-template-columns:minmax(0,1fr) 92px!important;gap:12px!important;align-items:center!important;padding:12px 16px!important;margin:0!important;border:0!important;border-radius:0!important;box-shadow:none!important;background:#fff!important;position:relative!important;min-height:0!important}
${P}#menuBox .item + .item::before{content:"";position:absolute;left:16px;right:0;top:0;height:1px;background:${SEP}}
${P}#menuBox .item .tx{grid-column:1!important;grid-row:1!important;display:flex!important;flex-direction:column!important;padding:0!important;min-width:0!important}
${P}#menuBox .item .tx b{font-size:17px!important;font-weight:600!important;order:0}
${P}#menuBox .item .tx small{order:1;font-size:13px!important;color:${L2}!important;line-height:18px!important;display:-webkit-box!important;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;margin:2px 0 0!important}
${P}#menuBox .item .tx .pr{order:2;margin:6px 0 0!important;font-size:15px!important;font-weight:600!important;color:${T}!important}
${P}#menuBox .item .tx .pr2{font-size:12px!important;color:${L2}!important;font-weight:400!important;margin-left:4px!important}
${P}#menuBox .item .ph{grid-column:2!important;grid-row:1!important;display:block!important;width:92px!important;height:92px!important;border-radius:12px!important;overflow:hidden!important;margin:0!important;background:linear-gradient(135deg,#FFE3C2,#F5B97A)!important;border:0!important}
${P}#menuBox .item .ph img{width:100%!important;height:100%!important;object-fit:cover!important}
${P}#menuBox .item .qa{position:absolute!important;right:10px!important;bottom:6px!important;left:auto!important;top:auto!important;margin:0!important;z-index:2}
${P}#menuBox .item .qa:not(.qa2) button{width:32px!important;height:32px!important;border-radius:50%!important;background:#fff!important;border:0!important;box-shadow:0 2px 8px rgba(0,0,0,.18)!important;color:#D70015!important;display:grid!important;place-items:center!important;padding:0!important}
${P}#menuBox .item .qa:not(.qa2) button svg{width:18px!important;height:18px!important;stroke:currentColor!important}
${P}#menuBox .item .qa.qa2{background:#fff!important;border-radius:999px!important;box-shadow:0 2px 8px rgba(0,0,0,.18)!important;border:0!important;padding:2px!important}
${P}#bar{left:16px!important;right:16px!important;bottom:calc(16px + env(safe-area-inset-bottom))!important;padding:0!important;background:none!important;box-shadow:none!important}
${P}#bar #cartBtn{height:56px!important;border-radius:999px!important;background:${T}!important;color:#fff!important;padding:0 8px 0 20px!important;display:flex!important;align-items:center!important;gap:10px!important;font-size:17px!important;font-weight:600!important;box-shadow:0 8px 24px rgba(0,0,0,.2)!important;border:0!important;width:100%!important}
${P}#bar #cartBtn > span:nth-child(2){order:1;flex:1;text-align:left;text-transform:none!important}
${P}#bar #cartBtn .t{order:2;font-weight:600!important;display:flex;flex-direction:column;align-items:flex-end;line-height:1.1}
${P}#bar #cartBtn .t .t2{font-size:11px;opacity:.8;font-weight:500}
${P}#bar #cartBtn .n{order:3;width:40px!important;height:40px!important;min-width:40px!important;border-radius:50%!important;background:rgba(255,255,255,.22)!important;color:#fff!important;display:grid!important;place-items:center!important;font-size:15px!important;margin:0!important}
${P}.ft{padding-bottom:110px!important}
/* basket and details sheet: iOS navigation bar, grouped rows */
${P}#sheet{background:#F2F2F7!important;padding:0 16px calc(16px + env(safe-area-inset-bottom))!important;border-radius:14px 14px 0 0!important}
${P}#sheet > h3{position:relative!important;display:flex!important;justify-content:center!important;align-items:center!important;min-height:56px!important;margin:0 -16px 8px!important;padding:0 16px!important;font-size:17px!important;font-weight:600!important;text-transform:none!important;letter-spacing:0!important;background:none!important;border:0!important}
${P}#sheet > h3 > span{display:contents!important}
${P}#sheet > h3 .x[data-close]{position:absolute!important;left:16px!important;top:50%!important;transform:translateY(-50%)!important;width:auto!important;height:auto!important;background:none!important;border:0!important;box-shadow:none!important;font-size:0!important;color:${T}!important;padding:0!important;min-width:0!important}
${P}#sheet > h3 .x[data-close]::after{content:"Close";font-size:17px;font-weight:400;color:${T}}
${P}#sheet > h3 .x[data-close] svg{display:none!important}
${P}#sheet > h3 .x[data-coback]{position:absolute!important;left:16px!important;top:50%!important;transform:translateY(-50%)!important;width:auto!important;height:auto!important;background:none!important;border:0!important;box-shadow:none!important;font-size:0!important;color:${T}!important;padding:0!important;min-width:0!important;z-index:2}
${P}#sheet > h3 .x[data-coback]::after{content:"‹ Basket";font-size:17px;font-weight:400;color:${T}}
${P}#sheet > h3:has(.x[data-coback]) .x[data-close]{display:none!important}
${P}#sheet .costep{display:none!important}
${P}#sheet .lsw{background:#fff!important;margin:0!important;border-radius:0!important;position:relative}
${P}#sheet .lsw:first-of-type{border-radius:12px 12px 0 0!important;overflow:hidden}
${P}#sheet .lsw:has(+ .tot),${P}#sheet .lsw:has(+ :not(.lsw)){border-radius:0 0 12px 12px!important;overflow:hidden}
${P}#sheet .lsw:first-of-type:has(+ :not(.lsw)){border-radius:12px!important}
${P}#sheet .lsw + .lsw::before{content:"";position:absolute;left:16px;right:0;top:0;height:1px;background:${SEP};z-index:2}
${P}#sheet .line{display:flex!important;align-items:center!important;gap:10px!important;padding:12px 16px!important;background:#fff!important;border:0!important;box-shadow:none!important;border-radius:0!important;margin:0!important}
${P}#sheet .line .q{display:none!important}
${P}#sheet .line .nm{flex:1!important;min-width:0!important;font-size:17px!important;font-weight:400!important}
${P}#sheet .line .nm .v3pr{display:block!important;margin-top:4px;font-size:15px;font-weight:600;color:${T}}
${P}#sheet .line .nm .v3pr small{font-size:12px;color:${L2};font-weight:400;margin-left:4px}
${P}#sheet .line .rt .rtp{display:none!important}
${P}#sheet .line .lq{display:flex!important;align-items:center!important;gap:4px!important;height:36px!important;padding:0 4px!important;border-radius:999px!important;background:rgba(118,118,128,.12)!important;border:0!important;box-shadow:none!important}
${P}#sheet .line .lq button{width:30px!important;height:30px!important;border-radius:50%!important;border:0!important;background:none!important;color:#000!important;display:grid!important;place-items:center!important;padding:0!important}
${P}#sheet .line .lq button[data-cq$=":1"]{color:#D70015!important}
${P}#sheet .line .lq button svg{width:16px!important;height:16px!important;stroke:currentColor!important}
${P}#sheet .line .lq b{min-width:18px;text-align:center;font-size:17px}
${P}#sheet .tot{background:#fff!important;border-radius:12px!important;margin:16px 0 0!important;padding:0!important;border:0!important;box-shadow:none!important;overflow:hidden}
${P}#sheet .tot > div{display:flex!important;justify-content:space-between!important;align-items:center!important;min-height:44px!important;padding:0 16px!important;font-size:17px!important;margin:0!important;border:0!important;position:relative}
${P}#sheet .tot > div + div::before{content:"";position:absolute;left:16px;right:0;top:0;height:1px;background:${SEP}}
${P}#sheet .tot > div > span:last-child{color:${L2}}
${P}#sheet .tot > .g{font-weight:600!important;font-size:17px!important}
${P}#sheet .tot > .g > span:last-child{color:#000!important}
${P}#sheet .tot > .pdisc > span:last-child{color:#248A3D!important}
${P}#sheet > .ghost[data-nav="order"]{background:none!important;border:0!important;box-shadow:none!important;color:${T}!important;font-size:17px!important;font-weight:400!important;margin-top:16px!important;height:44px!important}
${P}#sheet > .ghost[data-nav="order"] svg{display:none!important}
${P}#sheet .primary{height:52px!important;border-radius:999px!important;background:${T}!important;color:#fff!important;font-size:17px!important;font-weight:600!important;border:0!important;box-shadow:none!important;text-transform:none!important;display:flex!important;align-items:center!important;justify-content:center!important;gap:6px!important;margin-top:12px!important}
${P}#sheet .primary .b2{font-size:12px!important;opacity:.8}
${P}#sheet .cosum{display:none!important}
${P}#sheet form#co{display:block!important}
${P}#sheet form#co > .sec{padding:16px 16px 7px!important;margin:0!important;font-size:13px!important;font-weight:400!important;color:${L2}!important;text-transform:uppercase!important;letter-spacing:.2px!important;border:0!important;background:none!important}
${P}#sheet form#co > .f{display:flex!important;align-items:center!important;gap:10px!important;min-height:44px!important;padding:0 16px!important;margin:0!important;background:#fff!important;border:0!important;border-radius:0!important;position:relative}
${P}#sheet form#co > .f + .f::before,${P}#sheet form#co > .f2 + .f::before,${P}#sheet form#co > .f + .f2::before{content:"";position:absolute;left:16px;right:0;top:0;height:1px;background:${SEP}}
${P}#sheet form#co > :is(.f,.f2):is(.sec + *, :first-child){border-top-left-radius:12px!important;border-top-right-radius:12px!important}
${P}#sheet form#co > :is(.f,.f2):has(+ :not(.f):not(.f2)){border-bottom-left-radius:12px!important;border-bottom-right-radius:12px!important}
${P}#sheet form#co > .f > label{flex:none!important;font-size:17px!important;font-weight:400!important;color:#000!important;margin:0!important;text-transform:none!important;letter-spacing:0!important;white-space:nowrap}
${P}#sheet form#co > .f > :is(input,textarea,select,div){flex:1!important;min-width:0!important;border:0!important;background:transparent!important;box-shadow:none!important;text-align:right!important;font-size:17px!important;color:${L2}!important;padding:0!important;height:44px!important;margin:0!important;outline:0!important}
${P}#sheet form#co > .f > textarea{height:auto!important;padding:12px 0!important;resize:none}
${P}#sheet form#co > .f > div{display:flex!important;justify-content:flex-end!important;gap:6px!important}
${P}#sheet form#co > .f > div > :is(input,select){border:0!important;background:transparent!important;box-shadow:none!important;text-align:right!important;font-size:17px!important;color:${L2}!important;height:44px!important;padding:0!important}
${P}#sheet form#co input::placeholder,${P}#sheet form#co textarea::placeholder{color:#C4C4C7!important;text-transform:none!important}
${P}#sheet form#co > .f2{display:block!important;background:#fff!important;margin:0!important;padding:0!important;position:relative}
${P}#sheet form#co > .f2 > .f{display:flex!important;align-items:center!important;gap:10px!important;min-height:44px!important;padding:0 16px!important;margin:0!important;border:0!important;background:none!important;position:relative}
${P}#sheet form#co > .f2 > .f + .f::before{content:"";position:absolute;left:16px;right:0;top:0;height:1px;background:${SEP}}
${P}#sheet form#co > .f2 > .f > label{flex:none!important;font-size:17px!important;color:#000!important;margin:0!important;white-space:nowrap}
${P}#sheet form#co > .f2 > .f > :is(input,select){flex:1!important;min-width:0!important;border:0!important;background:transparent!important;box-shadow:none!important;text-align:right!important;font-size:17px!important;color:${L2}!important;height:44px!important;padding:0!important}
${P}#sheet form#co > .opts{display:block!important;background:#fff!important;border-radius:12px!important;overflow:hidden!important;margin:0!important;padding:0!important;border:0!important}
${P}#sheet form#co > .opts > .opt{display:flex!important;align-items:center!important;gap:12px!important;min-height:44px!important;padding:0 16px!important;margin:0!important;border:0!important;border-radius:0!important;background:#fff!important;box-shadow:none!important;position:relative;font-size:17px!important}
${P}#sheet form#co > .opts > .opt + .opt::before{content:"";position:absolute;left:58px;right:0;top:0;height:1px;background:${SEP}}
${P}#sheet form#co > .opts > .opt > input{position:absolute!important;opacity:0!important;pointer-events:none}
${P}#sheet form#co > .opts > .opt > svg{width:30px!important;height:30px!important;padding:5px!important;border-radius:8px!important;background:#248A3D!important;stroke:#fff!important;color:#fff!important;box-sizing:border-box;flex:none}
${P}#sheet form#co > .opts > .opt + .opt > svg{background:#0A66D8!important}
${P}#sheet form#co > .opts > .opt > span{flex:1!important;font-weight:400!important}
${P}#sheet form#co > .opts > .opt:has(input:checked)::after{content:"";width:16px;height:9px;border-left:2.4px solid ${T};border-bottom:2.4px solid ${T};transform:rotate(-45deg) translateY(-3px);margin-right:4px}
${P}#sheet form#co > .opts > .opt:has(input:disabled){opacity:.45}
${P}#sheet form#co .err{margin:10px 16px 0!important}
${P}#sheet form#co #place{margin-top:20px!important}


${P}#sheet > h3 .x{background-image:none!important}
${P}#sheet > h3 .x::before{display:none!important}
${P}#sheet > h3 .x[data-coback]{font-size:17px!important;font-weight:400!important;color:${T}!important}
${P}#sheet > h3 .x[data-coback]::after{content:none!important}
${P}#sheet > h3 .x[data-coback] svg{display:none!important}
${P}#sheet .line .nm :is(ul,ol){list-style:none!important;padding:0!important;margin:2px 0 0!important;display:block!important;font-size:13px!important;color:${L2}!important}
${P}#sheet .line .nm li{display:inline!important;font-size:13px!important;color:${L2}!important;padding:0!important;margin:0!important}
${P}#sheet .line .nm li::before{display:none!important}
${P}#sheet .line .nm li + li::before{content:" · "!important;display:inline!important;position:static!important;background:none!important;width:auto!important;height:auto!important}
${P}#sheet .tot > div{border-top:0!important;border-bottom:0!important;min-height:44px!important;height:44px!important;padding-top:0!important;padding-bottom:0!important}
${P}#sheet form#co .f > div *{border:0!important;background-color:transparent!important;box-shadow:none!important}
${P}#sheet form#co > .f2 > .f > label{font-weight:400!important;text-transform:none!important;letter-spacing:0!important}
${P}#sheet form#co .opt small{text-transform:none!important;font-size:13px!important;color:${L2}!important;display:block}


/* order tracking */
${P}#trk{background:#F2F2F7!important}
${P}#trk .trkh{min-height:52px!important;background:rgba(249,249,249,.94)!important;border-bottom:1px solid ${SEP}!important;-webkit-backdrop-filter:saturate(180%) blur(20px);backdrop-filter:saturate(180%) blur(20px)}
${P}#trk .trkh b{font-size:17px!important;font-weight:600!important}
${P}#trk .trkb{padding:16px!important}
${P}#trk .trkhero{background:none!important;border:0!important;box-shadow:none!important;text-align:center!important;padding:8px 0 18px!important}
${P}#trk .trkhero .trki{display:none!important}
${P}#trk .trkhero .trkno{order:-1;display:block!important;background:none!important;border:0!important;font-weight:400!important;color:${L2}!important;font-size:15px!important;padding:0!important;margin:0 0 4px!important}
${P}#trk .trkhero{display:flex!important;flex-direction:column!important;align-items:center!important}
${P}#trk .trkhero h2{font-size:34px!important;font-weight:700!important;letter-spacing:-.8px!important;margin:0!important;line-height:41px!important}
${P}#trk .trkhero p{font-size:17px!important;color:${L2}!important;margin:2px 0 0!important}
${P}#trk .trks{list-style:none!important;background:#fff!important;border-radius:16px!important;padding:8px 16px!important;margin:0 0 16px!important;border:0!important;box-shadow:none!important}
${P}#trk .trks li{display:flex!important;align-items:center!important;gap:12px!important;min-height:50px!important;position:relative!important;padding:0!important;margin:0!important;border:0!important;background:none!important}
${P}#trk .trks li .dt{width:24px!important;height:24px!important;min-width:24px!important;border-radius:50%!important;background:#E5E5EA!important;border:0!important;display:grid!important;place-items:center!important;position:relative;z-index:1}
${P}#trk .trks li.done .dt{background:${T}!important}
${P}#trk .trks li .dt svg{width:14px!important;height:14px!important;stroke:#fff!important}
${P}#trk .trks li + li::before{content:"";position:absolute;left:11px;top:-13px;width:2px;height:26px;background:#E5E5EA}
${P}#trk .trks li.done + li.done::before{background:${T}}
${P}#trk .trks li b{font-size:17px!important;font-weight:400!important;color:#000!important}
${P}#trk .trks li:not(.done) b{color:${L2}!important}
${P}#trk .trks li small{display:block;font-size:13px!important;color:${L2}!important}
${P}#trk .trkc{background:#fff!important;border-radius:12px!important;border:0!important;box-shadow:none!important;padding:0!important;overflow:hidden;margin:0 0 16px!important}
${P}#trk .trkr{padding:12px 16px!important;border-bottom:1px solid ${SEP}!important}
${P}#trk .trkr > span{width:30px!important;height:30px!important;border-radius:8px!important;background:#C93400!important;color:#fff!important;display:grid!important;place-items:center!important}
${P}#trk .trkr > span svg{stroke:#fff!important;width:18px!important;height:18px!important}
${P}#trk .trkcall{width:36px!important;height:36px!important;border-radius:50%!important;background:rgba(52,199,89,.15)!important;color:#248A3D!important;display:grid!important;place-items:center!important}
${P}#trk .trkcall svg{stroke:#248A3D!important}
${P}#trk .trkits > div,${P}#trk .trktot{padding:10px 16px!important;font-size:15px!important;border:0!important}
${P}#trk .trktot{border-top:1px solid ${SEP}!important;font-size:17px!important}
${P}#trk .ghost{text-transform:none!important;background:none!important;border:0!important;color:${T}!important;font-size:17px!important;box-shadow:none!important}
${P}#trk .trknot{background:#fff!important;border-radius:12px!important;border:0!important;box-shadow:none!important;margin:0 0 16px!important}

${P}#sheet .coaddrs{background:#fff!important;border-radius:12px!important;overflow:hidden;margin:0 0 12px!important;padding:0!important;display:block!important}
${P}#sheet .coaddrs .coad{display:flex!important;align-items:center!important;gap:12px!important;width:100%!important;min-height:56px!important;padding:8px 16px!important;border:0!important;border-radius:0!important;background:#fff!important;box-shadow:none!important;text-align:left!important;margin:0!important;border-top:1px solid ${SEP}!important}
${P}#sheet .coaddrs .coad:first-child{border-top:0!important}

/* item page */
${P}#ipg .pg{background:#F2F2F7!important;padding:0 0 120px!important}
${P}#ipg .ipnoimg,${P}#ipg .ipimg{display:block!important;height:260px!important;width:100%!important;margin:0!important;border-radius:0!important;background:linear-gradient(135deg,#FFE3C2,#F5B97A)!important;overflow:hidden}
${P}#ipg .ipimg img{width:100%!important;height:100%!important;object-fit:cover!important}
${P}#ipg :is(.ipx,.ipshare,.ipfav){width:40px!important;height:40px!important;border-radius:50%!important;background:rgba(255,255,255,.92)!important;border:0!important;box-shadow:none!important;color:#000!important;top:calc(12px + env(safe-area-inset-top))!important}
${P}#ipg :is(.ipx,.ipshare,.ipfav) svg{stroke:#000!important;color:#000!important;width:18px!important;height:18px!important}
${P}#ipg .ipfav.on svg{fill:#D70015!important;stroke:#D70015!important}
${P}#ipg .iphd{padding:16px 16px 6px!important;background:none!important}
${P}#ipg .iphd h2{font-size:28px!important;font-weight:700!important;letter-spacing:-.5px!important;margin:0 0 4px!important;text-transform:none!important}
${P}#ipg .iphd p{font-size:15px!important;color:${L2}!important;margin:0 0 4px!important;line-height:20px!important}
${P}#ipg .ipp{font-size:15px!important;font-weight:600!important;color:${T}!important}
${P}#ipg .ipp .pr2{font-size:13px!important;color:${L2}!important;font-weight:400!important;margin-left:4px}
${P}#ipg .ipgg{background:none!important;border:0!important;box-shadow:none!important;padding:0!important;margin:16px 16px 0!important;border-radius:0!important}
${P}#ipg .ipgg > .ght{display:flex!important;justify-content:space-between!important;align-items:flex-end!important;padding:0 16px 7px!important;background:none!important;border:0!important}
${P}#ipg .ipgg > .ght b{font-size:13px!important;font-weight:400!important;color:${L2}!important;text-transform:uppercase!important;letter-spacing:.2px!important}
${P}#ipg .ipgg > .ght small{display:none!important}
${P}#ipg .ipgg > .ght .rq{font-size:13px!important;color:#D70015!important;background:none!important;padding:0!important;font-weight:400!important;text-transform:uppercase}
${P}#ipg .ipgg > .ght .rq.ok{color:#248A3D!important}
${P}#ipg .ipgg > .opt2{display:flex!important;align-items:center!important;gap:12px!important;width:100%!important;min-height:44px!important;padding:0 16px!important;margin:0!important;background:#fff!important;border:0!important;border-radius:0!important;box-shadow:none!important;font-size:17px!important;color:#000!important;text-align:left!important;position:relative}
${P}#ipg .ipgg > .ght + .opt2{border-top-left-radius:12px!important;border-top-right-radius:12px!important}
${P}#ipg .ipgg > .opt2:last-child{border-bottom-left-radius:12px!important;border-bottom-right-radius:12px!important}
${P}#ipg .ipgg > .opt2 + .opt2::before{content:"";position:absolute;left:52px;right:0;top:0;height:1px;background:${SEP}}
${P}#ipg .opt2 > span:nth-child(2){flex:1}
${P}#ipg .opt2 .op{color:${L2}!important;font-size:17px!important}
${P}#ipg .ipgg .opt2.opt2 .ck.ck:not(.rd){order:9!important}
${P}#ipg .opt2 .ck{width:22px!important;height:22px!important;min-width:22px!important;border-radius:6px!important;border:1.5px solid #C7C7CC!important;background:#fff!important;display:grid!important;place-items:center!important;order:5}
${P}#ipg .opt2 .ck.rd{border-radius:50%!important;order:0}
${P}#ipg .opt2 .ck svg{display:none!important}
${P}#ipg .opt2.on .ck{border-color:${T}!important;background:${T}!important}
${P}#ipg .opt2.on .ck:not(.rd) svg{display:block!important;stroke:#fff!important;width:14px!important;height:14px!important}
${P}#ipg .opt2.on .ck.rd{background:#fff!important;border:7px solid ${T}!important}
${P}#ipg .opt2:has(.ck:not(.rd)) + .opt2::before,${P}#ipg .ipgg:not(:has(.rd)) > .opt2 + .opt2::before{left:16px}
${P}#ipg .ipnote{margin-top:16px!important}
${P}#ipg .ipnote > summary.ght{background:#fff!important;border-radius:12px!important;min-height:44px!important;padding:0 16px!important;align-items:center!important;list-style:none}
${P}#ipg .ipgg.ipnote > summary.ght b{font-size:17px!important;color:#000!important;text-transform:none!important;font-weight:400!important;letter-spacing:0!important}
${P}#ipg .ipnote > summary::after{content:"Optional  ›";color:${L2};font-size:17px;white-space:pre}
${P}#ipg .ipnote > summary .ipchev{display:none!important}
${P}#ipg .ipnote[open] > summary{border-bottom-left-radius:0!important;border-bottom-right-radius:0!important}
${P}#ipg .ipnote textarea{width:100%!important;border:0!important;border-top:1px solid ${SEP}!important;border-radius:0 0 12px 12px!important;background:#fff!important;padding:10px 16px!important;font-size:17px!important;box-shadow:none!important;margin:0!important;box-sizing:border-box}
${P}#ipg .ipft.ipft{flex-direction:row!important;flex-wrap:nowrap!important;display:flex!important;align-items:center!important;gap:12px!important;padding:12px 16px calc(14px + env(safe-area-inset-bottom))!important;background:rgba(249,249,249,.94)!important;border-top:1px solid ${SEP}!important;-webkit-backdrop-filter:saturate(180%) blur(20px);backdrop-filter:saturate(180%) blur(20px)}
${P}#ipg .ipft .ipq.ipq{margin:0!important;order:0!important;display:flex!important;align-items:center!important;gap:6px!important;height:52px!important;padding:0 6px!important;border-radius:999px!important;background:#fff!important;border:0!important;box-shadow:none!important;flex:none!important;width:auto!important}
${P}#ipg .ipq button{width:40px!important;height:40px!important;border-radius:50%!important;background:rgba(118,118,128,.12)!important;border:0!important;color:#000!important;display:grid!important;place-items:center!important;padding:0!important}
${P}#ipg .ipq button[data-iq="1"]{background:none!important;color:#D70015!important}
${P}#ipg .ipq button svg{stroke:currentColor!important;width:18px!important;height:18px!important}
${P}#ipg .ipq b{min-width:22px;text-align:center;font-size:17px!important}
${P}#ipg .ipft .primary{flex:1!important;height:52px!important;border-radius:999px!important;background:${T}!important;color:#fff!important;font-size:17px!important;font-weight:600!important;display:flex!important;align-items:center!important;justify-content:center!important;gap:6px!important;padding:0 16px!important;border:0!important;box-shadow:none!important;text-transform:none!important}
${P}#ipg .ipft .primary small{font-size:17px!important;font-weight:600!important;opacity:1!important;margin:0!important;position:static!important}
${P}#ipg .ipft .primary small::before{content:"· "}

`;
  let st = null;
  function moveTop() {
    if (!de.classList.contains("ov3")) return;
    const hero = document.getElementById("hero"), lb = document.getElementById("locbar"); if (!hero || !lb) return;
    if (hero.nextElementSibling !== lb && !lb.dataset.v3moved) { hero.after(lb); lb.dataset.v3moved = 1; }   // "Deliver to" under the store card, like the file
    let tb = hero.querySelector(".v3tb"); if (!tb) { tb = document.createElement("div"); tb.className = "v3tb"; hero.prepend(tb); }
    const m = lb.querySelector(":scope > .tbmode"); if (m) { tb.innerHTML = ""; tb.appendChild(m); }
    const a = tb.querySelector("[data-acct]"); if (a && /log in/i.test(a.textContent)) a.textContent = "Sign In";
    const q = document.getElementById("q"); if (q && q.placeholder !== "Search the menu") q.placeholder = "Search the menu";
    const ct = document.querySelector("#bar #cartBtn > span:nth-child(2)"); if (ct && ct.textContent !== "View Basket") ct.textContent = "View Basket";
  }
  // item page: "Add · $7.50", like the file (Update item / Remove keep their words)
  function itemTxt() { const b = document.querySelector("#ipg .ipft .primary[data-iadd]"); if (!b) return; const t = b.firstChild; if (t && t.nodeType === 3 && /^Add \d+ to basket$/i.test(t.data.trim())) t.data = "Add"; }
  new MutationObserver(() => { if (de.classList.contains("ov3")) itemTxt(); }).observe(document.body, { childList: true });
  document.addEventListener("click", () => setTimeout(() => { if (de.classList.contains("ov3")) itemTxt(); }, 0), true);
  // the details sheet reads like the file: "Checkout", labels without the "*" (the fields stay required)
  function sheetTxt() { const sh = document.getElementById("sheet"); if (!sh || !de.classList.contains("ov3")) return;
    const bk = sh.querySelector(":scope > h3 .x[data-coback]"); if (bk && !bk.dataset.v3) { bk.dataset.v3 = 1; bk.textContent = "‹ Basket"; }
    const h = sh.querySelector(":scope > h3 > span"); if (h && sh.querySelector("form#co")) h.childNodes.forEach(n => { if (n.nodeType === 3 && /Your details/i.test(n.data)) n.data = "Checkout"; });
    const h0 = sh.querySelector(":scope > h3"); if (h0) h0.childNodes.forEach(n => { if (n.nodeType === 3 && /^Your basket$/i.test(n.data.trim())) n.data = "Your Basket"; });
    sh.querySelectorAll("form#co label").forEach(l => l.childNodes.forEach(n => { if (n.nodeType === 3 && / \*$/.test(n.data)) n.data = n.data.replace(/ \*$/, ""); })); }
  { const sh = document.getElementById("sheet"); if (sh) new MutationObserver(() => { clearTimeout(sheetTxt.t); sheetTxt.t = setTimeout(sheetTxt, 0); }).observe(sh, { childList: true }); }
  function apply() {
    const w = on(); de.classList.toggle("ov3", w);
    if (w && !st) { st = document.createElement("style"); st.id = "ov3css"; st.textContent = css; document.head.appendChild(st); }
    if (st) st.disabled = !w;
    if (w) moveTop();
  }
  apply(); addEventListener("resize", apply);
  const lb = document.getElementById("locbar"); if (lb) new MutationObserver(() => { clearTimeout(moveTop.t); moveTop.t = setTimeout(moveTop, 0); }).observe(lb, { childList: true });
  const bar = document.getElementById("bar"); if (bar) new MutationObserver(() => moveTop()).observe(bar, { childList: true, subtree: true, characterData: true });
})();
