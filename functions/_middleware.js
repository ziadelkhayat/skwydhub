// order.skwydhub.com opens online ordering (/track/<link>: delivery tracking), dev.pos.skwydhub.com the POS web app (pos.html from the tremor-all build), admin.skwydhub.com the Skwyd Hub admin (React, ta/src/skwyd/admin), portal.skwydhub.com the back office (React).
// Each business's ordering page has its own address: order.skwydhub.com/<brand address> (set in Web Ordering).
export async function onRequest(ctx) {
  const url = new URL(ctx.request.url), host = url.hostname.replace(/^dev\./, "");   // dev.order / dev.admin / dev.portal work like the plain names
  const isFile = /\.[a-z0-9]+$/i.test(url.pathname);
  const isDevPos = url.hostname === "dev.pos.skwydhub.com";   // test copy of the POS in a browser; the real POS is the Android app
  let page = null;
  if (host.startsWith("order.") && !isFile) page = url.pathname.startsWith("/track/") ? "/track" : "/order";   // /track/<private link>: delivery tracking & rating                // "/" and "/thewok" both open order.html, which reads the address
  // admin.skwydhub.com: the React admin (the site's index.html opens it on this address)
  // dev.pos: the POS web app (Tremor, 16:10 tablet layout) from the tremor-all build; /pos-app/ still opens the older React Native web copy
  else if (isDevPos && !url.pathname.startsWith("/pos-app")) {
    const src = new URL(url.pathname === "/" ? "/pos.html" : url.pathname, "https://tremor-all.skwydhub.pages.dev");
    src.search = url.search;
    const r = await fetch(new Request(src.toString(), ctx.request));
    return new Response(r.body, r);
  }
  if (page && url.pathname !== page) {   // Cloudflare serves order.html at /order and hub.html at /hub; the address bar keeps the original path
    url.pathname = page;
    return ctx.env.ASSETS.fetch(new Request(url.toString(), ctx.request));
  }
  return ctx.next();
}
