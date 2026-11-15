// Skwyd Hub subscription invoice: opens a printable page (Print / Save as PDF). Used by the admin and the back office.
(function () {
  const esc = v => String(v ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const dmy = s => { if (!s) return "—"; const d = new Date(s); return String(d.getDate()).padStart(2, "0") + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + d.getFullYear(); };
  const money = (n, c) => (c || "USD") + " " + (+n || 0).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const nl = s => esc(s).replace(/\n/g, "<br>");
  const LOGO = `<svg width="34" height="38" viewBox="0 0 30 34" aria-hidden="true"><path d="M15 2c6.6 0 11 4.6 11 10.6 0 3.2-1.2 5.6-3 7.4l1.6 9.2c.2 1-.9 1.6-1.6.9l-3.4-3.6-1.6 5.6c-.3 1-1.7 1-2 0L15 25.6l-1 6.5c-.3 1-1.7 1-2 0l-1.6-5.6-3.4 3.6c-.7.7-1.8.1-1.6-.9L7 20C5.2 18.2 4 15.8 4 12.6 4 6.6 8.4 2 15 2z" fill="#c6f432"/><circle cx="11.2" cy="12.4" r="1.9" fill="#172554"/><circle cx="18.8" cy="12.4" r="1.9" fill="#172554"/></svg>`;
  function html(inv, bill, to) {
    const g = (a, b) => inv[a] ?? inv[b];
    const cur = inv.currency || "USD", st = inv.status || "open";
    const overdue = st === "open" && g("due_at", "dueAt") && new Date(g("due_at", "dueAt")) < new Date();
    const unit = l => l.unit === "device" ? "per POS device" : l.unit === "warehouse" ? "per warehouse" : l.unit === "branch" ? "per branch" : l.unit === "once" ? "one-off" : "per business";
    const stamp = st === "paid" ? `<div class="stamp paid">Paid</div>` : st === "void" ? `<div class="stamp void">Void</div>` : overdue ? `<div class="stamp due">Overdue</div>` : "";
    return `<!DOCTYPE html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Invoice ${esc(inv.number)}</title>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
<style>
*{box-sizing:border-box}body{margin:0;background:#eef0f5;font-family:Inter,system-ui,sans-serif;color:#1c1b22;font-size:13.5px;line-height:1.5}
.bar{position:sticky;top:0;display:flex;justify-content:center;gap:10px;padding:12px;background:#eef0f5}
.bar button{font:inherit;font-weight:600;border:0;border-radius:10px;padding:10px 20px;cursor:pointer;background:#1e3a8a;color:#fff}.bar button.s{background:#fff;color:#1e3a8a;border:1px solid #c7d2fe}
.page{width:210mm;min-height:297mm;margin:0 auto 30px;background:#fff;padding:18mm 16mm;position:relative;box-shadow:0 6px 30px rgba(20,20,60,.08)}
.hd{display:flex;justify-content:space-between;gap:20px;align-items:flex-start}
.brand{display:flex;align-items:center;gap:10px}.brand b{font-size:20px;letter-spacing:-.01em;color:#172554}
.from{color:#5b5a66;font-size:12.5px;margin-top:8px}
.ttl{text-align:right}.ttl h1{margin:0;font-size:26px;letter-spacing:.02em;color:#172554}.ttl div{color:#5b5a66}
.meta{display:grid;grid-template-columns:1.3fr 1fr;gap:20px;margin:26px 0 22px;padding:16px;border:1px solid #e7e6ec;border-radius:12px}
.meta h4{margin:0 0 6px;font-size:11px;text-transform:uppercase;letter-spacing:.06em;color:#8d8c98;font-weight:600}
.kv{display:grid;grid-template-columns:auto 1fr;gap:3px 14px}.kv span{color:#5b5a66}.kv b{font-weight:500;text-align:right}
table{width:100%;border-collapse:collapse}th{font-size:11px;text-transform:uppercase;letter-spacing:.06em;color:#8d8c98;font-weight:600;text-align:left;padding:8px 6px;border-bottom:1.5px solid #172554}
td{padding:10px 6px;border-bottom:1px solid #eeedf2;vertical-align:top}.num{text-align:right;font-variant-numeric:tabular-nums;white-space:nowrap}
td small{display:block;color:#8d8c98;font-size:11.5px}
.tot{margin-left:auto;width:300px;margin-top:14px}.tot div{display:flex;justify-content:space-between;padding:5px 6px}.tot .g{border-top:1.5px solid #172554;margin-top:4px;padding-top:10px;font-size:16px;font-weight:700;color:#172554}
.box{margin-top:22px;padding:14px 16px;border-radius:12px;background:#f6f7fb;font-size:12.5px}.box h4{margin:0 0 4px;font-size:12px;color:#172554}
.ft{position:absolute;left:16mm;right:16mm;bottom:12mm;color:#8d8c98;font-size:11.5px;text-align:center;border-top:1px solid #eeedf2;padding-top:10px}
.stamp{position:absolute;top:60mm;right:18mm;transform:rotate(-12deg);font-size:30px;font-weight:700;letter-spacing:.1em;text-transform:uppercase;border:3px solid;border-radius:10px;padding:4px 16px;opacity:.75}
.stamp.paid{color:#1f7a3d}.stamp.void{color:#8d8c98}.stamp.due{color:#b42318}
@media print{body{background:#fff}.bar{display:none}.page{margin:0;box-shadow:none;width:auto;min-height:auto;padding:0}.ft{position:static;margin-top:30px}@page{size:A4;margin:14mm}}
@media (max-width:820px){.page{width:auto;min-height:0;padding:20px;margin:0 8px 20px}.meta{grid-template-columns:1fr}.ft{position:static;margin-top:24px}.stamp{top:120px;font-size:22px}}
</style></head><body>
<div class="bar"><button onclick="print()">Print or Save as PDF</button><button class="s" onclick="close()">Close</button></div>
<div class="page">${stamp}
  <div class="hd"><div><div class="brand">${LOGO}<b>${esc(bill.billingName || "skwyd hub")}</b></div>
    <div class="from">${bill.billingAddress ? nl(bill.billingAddress) + "<br>" : ""}${bill.billingTaxNo ? "Tax No. " + esc(bill.billingTaxNo) + "<br>" : ""}${[bill.supportEmail, bill.supportPhone].filter(Boolean).map(esc).join(" · ")}</div></div>
    <div class="ttl"><h1>INVOICE</h1><div>${esc(inv.number)}</div></div></div>
  <div class="meta">
    <div><h4>Billed To</h4><div style="font-weight:600;font-size:15px">${esc(to.name || "—")}</div>
      <div style="color:#5b5a66">Account ${esc(to.accountNo || "—")}${to.country ? " · " + esc(to.country) : ""}</div>
      <div style="color:#5b5a66">${[to.email, to.phone].filter(Boolean).map(esc).join(" · ")}</div></div>
    <div class="kv"><span>Issued</span><b>${dmy(g("created_at", "createdAt"))}</b><span>Due</span><b>${dmy(g("due_at", "dueAt"))}</b>
      <span>Period</span><b>${dmy(g("period_start", "periodStart"))} – ${dmy(g("period_end", "periodEnd"))}</b>
      <span>Billing</span><b>${(inv.cycle || "monthly") === "yearly" ? "Yearly" : "Monthly"}</b>
      ${st === "paid" ? `<span>Paid</span><b>${dmy(g("paid_at", "paidAt"))}${inv.method ? " · " + esc(inv.method) : ""}</b>` : ""}</div>
  </div>
  <table><thead><tr><th>Description</th><th class="num">Quantity</th><th class="num">Price</th><th class="num">Amount</th></tr></thead><tbody>
  ${(inv.lines || []).map(l => `<tr><td>${esc(l.name)}<small>${unit(l)}</small></td><td class="num">${(+l.qty || 0).toLocaleString("en-US")}</td><td class="num">${money(l.price, cur)}</td><td class="num">${money(l.amount, cur)}</td></tr>`).join("")}
  </tbody></table>
  <div class="tot"><div><span>Subtotal</span><span>${money(inv.subtotal, cur)}</span></div>
    ${+inv.discount ? `<div><span>Discount</span><span>−${money(inv.discount, cur)}</span></div>` : ""}
    <div class="g"><span>Total</span><span>${money(inv.total, cur)}</span></div>
    ${st === "paid" ? `<div style="color:#1f7a3d"><span>Amount Due</span><span>${money(0, cur)}</span></div>` : ""}</div>
  ${inv.notes ? `<div class="box"><h4>Notes</h4>${nl(inv.notes)}</div>` : ""}
  ${st === "open" && bill.paymentInstructions ? `<div class="box"><h4>How To Pay</h4>${nl(bill.paymentInstructions)}<div style="margin-top:6px;color:#5b5a66">Please mention invoice ${esc(inv.number)} and account ${esc(to.accountNo || "")}.</div></div>` : ""}
  <div class="ft">${bill.invoiceFooter ? nl(bill.invoiceFooter) : "Thank you for running your business on skwyd hub."}</div>
</div></body></html>`;
  }
  window.skwydInvoice = function (inv, bill, to) {
    const w = window.open("", "_blank");
    if (!w) { alert("Allow pop-ups for this site to open the invoice."); return; }
    w.document.open(); w.document.write(html(inv, bill || {}, to || {})); w.document.close();
  };
})();
