// Skwyd Hub theme: Light, Dark or Same As Device, remembered on this browser. Load it early in <head> so there's no white flash.
(function () {
  const KEY = "skwyd_theme", mq = matchMedia("(prefers-color-scheme: dark)");
  const get = () => { try { return localStorage.getItem(KEY) || "light"; } catch (e) { return "light"; } };
  const apply = (fade) => {
    const m = get(), dark = m === "dark" || (m === "auto" && mq.matches), root = document.documentElement;
    if (fade) { root.classList.add("theme-fade"); clearTimeout(apply.t); apply.t = setTimeout(() => root.classList.remove("theme-fade"), 450); }
    if (dark) root.setAttribute("data-theme", "dark"); else root.removeAttribute("data-theme");
    document.querySelectorAll(".thsw [data-th]").forEach(b => { b.classList.toggle("on", b.dataset.th === m); b.setAttribute("aria-pressed", b.dataset.th === m); });
  };
  apply(false);
  mq.addEventListener?.("change", () => get() === "auto" && apply(true));
  window.SkwydTheme = { get, set(m) { try { localStorage.setItem(KEY, m); } catch (e) {} apply(true); } };

  const ICON = {
    light: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/></svg>',
    dark: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 14.5A8 8 0 1 1 9.5 4a6.5 6.5 0 0 0 10.5 10.5z"/></svg>',
    auto: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="12" rx="2"/><path d="M8 20h8M12 16v4"/></svg>'
  };
  const html = () => `<div class="thsw" role="group" aria-label="Theme"><span>Theme</span>${[["light", "Light"], ["dark", "Dark"], ["auto", "Same As Device"]].map(([k, t]) => `<button type="button" data-th="${k}" title="${t}" aria-label="${t}">${ICON[k]}</button>`).join("")}</div>`;
  // the switch goes into the account menu (back office) or the top bar (admin)
  function mount() {
    const menu = document.getElementById("acctMenu"), so = document.getElementById("amSignOut");
    if (menu && so && !menu.querySelector(".thsw")) so.insertAdjacentHTML("beforebegin", html());
    const top = document.querySelector(".main > .top"); const out = document.getElementById("out");
    if (out && top && !top.querySelector(".thsw")) out.insertAdjacentHTML("beforebegin", html().replace('class="thsw"', 'class="thsw thtop"'));
    apply(false);
  }
  document.addEventListener("click", e => { const b = e.target.closest?.(".thsw [data-th]"); if (!b) return; e.preventDefault(); e.stopPropagation(); window.SkwydTheme.set(b.dataset.th); }, true);
  const start = () => { mount(); new MutationObserver(() => { if (!document.querySelector(".thsw")) mount(); else if (document.getElementById("out") && !document.querySelector(".thtop")) mount(); }).observe(document.body, { childList: true, subtree: true }); };
  if (document.body) start(); else document.addEventListener("DOMContentLoaded", start);
})();
