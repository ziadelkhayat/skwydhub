// Line icons (the same drawings as the current POS), drawn with react-native-svg.
import Svg, { Circle, Path, Rect } from "react-native-svg";

const P: Record<string, (c: string) => React.ReactNode> = {
  search: () => <><Circle cx={11} cy={11} r={7} /><Path d="m20 20-3.5-3.5" /></>,
  table: () => <><Rect x={3} y={7} width={18} height={5} rx={1.5} /><Path d="M6 12v7M18 12v7M9 7V4h6v3" /></>,
  user: () => <><Circle cx={12} cy={8} r={4} /><Path d="M4 21a8 8 0 0 1 16 0" /></>,
  tag: () => <><Path d="M20 12 12 20l-8-8V4h8z" /><Circle cx={8} cy={8} r={1.5} /></>,
  note: () => <><Path d="M6 3h9l4 4v14H6z" /><Path d="M9 11h7M9 15h7" /></>,
  void: () => <><Circle cx={12} cy={12} r={8} /><Path d="m7 17 10-10" /></>,
  print: () => <><Path d="M7 9V3h10v6" /><Rect x={4} y={9} width={16} height={8} rx={2} /><Path d="M7 14h10v7H7z" /></>,
  grid: () => <><Rect x={4} y={4} width={6} height={6} rx={1.5} /><Rect x={14} y={4} width={6} height={6} rx={1.5} /><Rect x={4} y={14} width={6} height={6} rx={1.5} /><Rect x={14} y={14} width={6} height={6} rx={1.5} /></>,
  list: () => <><Path d="M8 6h12M8 12h12M8 18h12" /><Circle cx={4} cy={6} r={1} /><Circle cx={4} cy={12} r={1} /><Circle cx={4} cy={18} r={1} /></>,
  scooter: () => <><Circle cx={6} cy={17} r={3} /><Circle cx={18} cy={17} r={3} /><Path d="M9 17h6l2-7h3M14 6h3l1 4M4 13h6l2 4" /></>,
  till: () => <><Rect x={2} y={6} width={20} height={12} rx={2} /><Circle cx={12} cy={12} r={3} /><Path d="M6 10v4M18 10v4" /></>,
  clock: () => <><Circle cx={12} cy={12} r={9} /><Path d="M12 7v5l3 2" /></>,
  more: () => <><Circle cx={5} cy={12} r={1.5} /><Circle cx={12} cy={12} r={1.5} /><Circle cx={19} cy={12} r={1.5} /></>,
  back: () => <Path d="M15 18 9 12l6-6" />,
  x: () => <Path d="M6 6l12 12M18 6 6 18" />,
  minus: () => <Path d="M5 12h14" />,
  plus: () => <Path d="M12 5v14M5 12h14" />,
  trash: () => <Path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13M10 11v6M14 11v6" />,
  del: () => <><Path d="M21 5H8l-6 7 6 7h13z" /><Path d="m11 9 6 6M17 9l-6 6" /></>,
  bowl: () => <><Path d="M3 11h18a9 9 0 0 1-18 0Z" /><Path d="M12 4v4M9 6l1 2M15 6l-1 2" /></>,
};
export function Icon({ name, size = 22, color = "#667085", sw = 1.8 }: { name: keyof typeof P | string; size?: number; color?: string; sw?: number }) {
  const draw = P[name] || P.bowl;
  return <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round">{draw(color)}</Svg>;
}
