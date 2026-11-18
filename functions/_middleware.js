// order.skwydhub.com opens online ordering, admin.skwydhub.com the Skwyd Hub admin (hub.html); portal.skwydhub.com the back office (index.html).
// Each business's ordering page has its own address: order.skwydhub.com/<brand address> (set in Web Ordering).
export async function onRequest(ctx) {
  // For now the system runs as the development copy: portal. / order. / admin. forward to dev.portal / dev.order / dev.admin,
  // same page and query, so old links and QR codes keep working. Remove this block when the live system launches.
  { const u = new URL(ctx.request.url);
    if (/^(portal|order|admin)\.skwydhub\.com$/.test(u.hostname)) { u.hostname = "dev." + u.hostname; return Response.redirect(u.toString(), 302); } }
  const url = new URL(ctx.request.url), host = url.hostname.replace(/^dev\./, "");   // dev.order / dev.admin / dev.portal work like the plain names
  const isFile = /\.[a-z0-9]+$/i.test(url.pathname);
  let page = null;
  if (host.startsWith("order.") && !isFile) page = url.pathname.startsWith("/track/") ? "/track" : "/order";   // /track/<private link>: delivery tracking & rating                // "/" and "/thewok" both open order.html, which reads the address
  else if (host.startsWith("admin.") && url.pathname === "/") page = "/hub";
  if (page && url.pathname !== page) {   // Cloudflare serves order.html at /order and hub.html at /hub; the address bar keeps the original path
    url.pathname = page;
    return ctx.env.ASSETS.fetch(new Request(url.toString(), ctx.request));
  }
  return ctx.next();
}
