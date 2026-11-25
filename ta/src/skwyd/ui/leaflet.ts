// Leaflet, loaded from unpkg on first use (same version and tiles as the current portal), so no package is added
let p: Promise<any> | null = null;
export function loadLeaflet(): Promise<any> {
  if ((window as any).L) return Promise.resolve((window as any).L);
  return p ||= new Promise((res, rej) => {
    const css = document.createElement("link"); css.rel = "stylesheet"; css.href = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"; document.head.appendChild(css);
    const s = document.createElement("script"); s.src = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"; s.onload = () => res((window as any).L); s.onerror = () => { p = null; rej(new Error("Map couldn't load. Check the internet connection.")); };
    document.head.appendChild(s);
  });
}
export const LB: [number, number] = [33.89, 35.52];
export const ZCOL = ["#3b82f6", "#1f8a4c", "#c2410c", "#2c5fb8", "#b91c5c", "#0f766e", "#a16207", "#7a5af8"];
export function baseMap(L: any, el: HTMLElement) {
  const m = L.map(el).setView(LB, 11);
  L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", { maxZoom: 19, attribution: "© OpenStreetMap" }).addTo(m);
  return m;
}
