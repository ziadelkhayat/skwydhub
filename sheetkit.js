// Every pop-up in the back office as an iOS sheet (Cancel · Title · Save in the top bar) and every form as grouped rows with the name on the left,
// as the design kit says. The original buttons stay where they are (their handlers are untouched); the top-bar buttons just press them.
(function () {
  const isCancel = b => /^(cancel|close)$/i.test(b.textContent.trim()) || b.hasAttribute("data-close") || b.hasAttribute("data-ccclose") || b.hasAttribute("data-cclose");
  function sheet(m) {
    if (m.dataset.sk || m.id === "crudBox" && m.classList.contains("v3sheet")) return;
    const h = m.querySelector(":scope > header"), f = m.querySelector(":scope > footer"); if (!h) return;
    const pri = f && f.querySelector(".btn.pri:not([hidden])"), can = (f && [...f.querySelectorAll("button")].find(isCancel)) || h.querySelector("[data-close], .x, [data-ccclose], [data-cclose]");
    if (!pri && !can) return;
    m.dataset.sk = "1"; m.classList.add("sk");
    const L = document.createElement("button"); L.type = "button"; L.className = "sktb"; L.textContent = "Cancel"; L.onclick = () => can && can.click();
    const R = document.createElement("button"); R.type = "button"; R.className = "sktb skb"; R.textContent = pri ? pri.textContent.trim() || "Save" : "";
    if (pri) R.onclick = () => { if (!pri.disabled) pri.click(); }; else R.style.visibility = "hidden";
    h.insertBefore(L, h.firstChild); h.appendChild(R);
    if (pri) { const sync = () => { R.disabled = pri.disabled || pri.hidden; R.classList.toggle("skdim", pri.getAttribute("aria-disabled") === "true"); R.textContent = pri.textContent.trim() || "Save"; }; sync(); new MutationObserver(sync).observe(pri, { attributes: true, childList: true, subtree: true }); }
    // a pop-up that is re-used (same element, new contents) is set up again next time it opens
    new MutationObserver(() => { if (!m.closest(".scrim.show")) { m.querySelectorAll(":scope > header > .sktb").forEach(x => x.remove()); delete m.dataset.sk; m.classList.remove("sk"); m.querySelectorAll(".skhid").forEach(x => x.classList.remove("skhid")); f && f.classList.remove("skgone"); } }).observe(m.closest(".scrim") || m, { attributes: true, attributeFilter: ["class"] });
    // the footer goes away when it held only Cancel and Save; anything else (Delete, Reset…) stays at the bottom
    if (f) f.querySelectorAll("button").forEach(b => { if (/^(delete|remove|void|deactivate)/i.test(b.textContent.trim())) b.classList.add("skdel"); });
    if (f) { const rest = [...f.querySelectorAll("button, a.btn")].filter(b => b !== pri && !isCancel(b) && !b.hidden && getComputedStyle(b).display !== "none"); if (!rest.length) f.classList.add("skgone"); else { if (pri) pri.classList.add("skhid"); f.querySelectorAll("button").forEach(b => { if (isCancel(b)) b.classList.add("skhid"); }); } }
  }
  const scan = () => document.querySelectorAll(".scrim.show .modal, .scrim.show form.modal, dialog[open] .modal").forEach(sheet);
  new MutationObserver(scan).observe(document.documentElement, { subtree: true, childList: true, attributes: true, attributeFilter: ["class", "open"] });
  document.addEventListener("DOMContentLoaded", scan);
})();
