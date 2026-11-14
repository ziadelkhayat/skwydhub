// order.skwydhub.com opens the online ordering page; portal.skwydhub.com opens the back office (index.html).
export async function onRequest(ctx) {
  const url = new URL(ctx.request.url);
  if (url.hostname.startsWith("order.") && url.pathname === "/") {
    url.pathname = "/order";            // Cloudflare serves order.html at /order
    return ctx.env.ASSETS.fetch(new Request(url.toString(), ctx.request));
  }
  return ctx.next();
}
