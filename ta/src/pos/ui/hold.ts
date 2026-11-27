// press and hold on the web: a pointer timer (no animation). Returns handlers for an element; onTap fires when it wasn't held.
import { useRef } from "react";
export function useHold() {
  const t = useRef<any>(0), held = useRef(false), start = useRef({ x: 0, y: 0 });
  return (onTap: () => void, onHold?: () => void, ms = 450) => ({
    onPointerDown: (e: React.PointerEvent) => { held.current = false; start.current = { x: e.clientX, y: e.clientY }; clearTimeout(t.current); if (onHold) t.current = setTimeout(() => { held.current = true; onHold(); }, ms); },
    onPointerMove: (e: React.PointerEvent) => { if (Math.abs(e.clientX - start.current.x) + Math.abs(e.clientY - start.current.y) > 12) clearTimeout(t.current); },
    onPointerUp: () => clearTimeout(t.current), onPointerLeave: () => clearTimeout(t.current), onPointerCancel: () => clearTimeout(t.current),
    onContextMenu: (e: React.MouseEvent) => { if (onHold) e.preventDefault(); },
    onClick: () => { if (held.current) { held.current = false; return; } onTap(); },
  });
}
