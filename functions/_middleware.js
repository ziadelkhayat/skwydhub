// order.skwydhub.com opens online ordering, admin.skwydhub.com the Skwyd Hub admin (hub.html); portal.skwydhub.com the back office (index.html).
export async function onRequest(ctx) {
  const url = new URL(ctx.request.url);
  const page = url.pathname === "/" && (url.hostname.startsWith("order.") ? "/order" : url.hostname.startsWith("admin.") ? "/hub" : null);
  if (page) {                            // Cloudflare serves order.html at /order and hub.html at /hub
    url.pathname = page;
    return ctx.env.ASSETS.fetch(new Request(url.toString(), ctx.request));
  }
  return ctx.next();
}
