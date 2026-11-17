import { OLD_PORTAL } from "../lib/util";
import { titleOf } from "../nav";
import { Icon } from "./Icons";

// sections not rebuilt yet open in the current portal
export function NotMoved({ route }: { route: string }) {
  return <div className="card notyet">
    <h1>{titleOf(route) || "Page"}</h1>
    <p>This section hasn't moved to the new portal yet. It works as usual in the current portal.</p>
    <a className="btn pri" href={OLD_PORTAL + "#" + route} target="_blank" rel="noopener"><Icon n="ext" size={18} /> Open In The Current Portal</a>
  </div>;
}
