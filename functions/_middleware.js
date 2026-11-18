// order.skwydhub.com opens online ordering, dev.pos.skwydhub.com a test copy of the POS (pos.html), admin.skwydhub.com the Skwyd Hub admin (hub.html); portal.skwydhub.com the back office (index.html).
// Each business's ordering page has its own address: order.skwydhub.com/<brand address> (set in Web Ordering).
export async function onRequest(ctx) {
  const url = new URL(ctx.request.url), host = url.hostname.replace(/^dev\./, "");   // dev.order / dev.admin / dev.portal work like the plain names
  const isFile = /\.[a-z0-9]+$/i.test(url.pathname);
  const isDevPos = url.hostname === "dev.pos.skwydhub.com";   // test copy of the POS in a browser; the real POS is the Android app
  if(/^\/pos(\.html)?$/.test(url.pathname) && !isDevPos) return new Response("Not found", { status: 404 });
  let page = null;
  if (host.startsWith("order.") && !isFile) page = url.pathname.startsWith("/track/") ? "/track" : "/order";   // /track/<private link>: delivery tracking & rating                // "/" and "/thewok" both open order.html, which reads the address
  else if (host.startsWith("admin.") && url.pathname === "/") page = "/hub";
  else if (isDevPos && url.pathname === "/") page = "/pos";
  if (page && url.pathname !== page) {   // Cloudflare serves order.html at /order and hub.html at /hub; the address bar keeps the original path
    url.pathname = page;
    return ctx.env.ASSETS.fetch(new Request(url.toString(), ctx.request));
  }
  return ctx.next();
}
