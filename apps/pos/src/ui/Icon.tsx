// Line icons (the same drawings as the current POS), drawn with react-native-svg.
import Svg, { Circle, G, Path, Rect } from "react-native-svg";

const P: Record<string, (c: string) => React.ReactNode> = {
  search: () => <><Circle cx={11} cy={11} r={7} /><Path d="m20 20-3.5-3.5" /></>,
  table: () => <><Rect x={3} y={7} width={18} height={5} rx={1.5} /><Path d="M6 12v7M18 12v7M9 7V4h6v3" /></>,
  user: () => <><Circle cx={12} cy={8} r={4} /><Path d="M4 21a8 8 0 0 1 16 0" /></>,
  filter: () => <Path d="M3 5h18l-7 8v6l-4 2v-8z" />,
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
  dayend: () => <><Circle cx={12} cy={12} r={4} /><Path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" /></>,
  chart: () => <Path d="M4 20V10M10 20V4M16 20v-7M22 20H2" />,
  device: () => <><Rect x={4} y={3} width={16} height={12} rx={2} /><Path d="M9 21h6M12 15v6" /></>,
  sound: () => <><Path d="M4 9v6h4l5 4V5L8 9z" /><Path d="M17 9a4 4 0 0 1 0 6M19.5 6.5a8 8 0 0 1 0 11" /></>,
  mute: () => <><Path d="M4 9v6h4l5 4V5L8 9z" /><Path d="m17 9 5 6M22 9l-5 6" /></>,
  sync: () => <Path d="M20 11a8 8 0 0 0-14.3-4.3L4 9M4 4v5h5M4 13a8 8 0 0 0 14.3 4.3L20 15M20 20v-5h-5" />,
  logout: () => <Path d="M15 4h3a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-3M10 17l-5-5 5-5M5 12h11" />,
  phone: () => <Path d="M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2" />,
  store: () => <><Path d="M3 9l1.5-5h15L21 9M4 9v11h16V9" /><Path d="M3 9a3 3 0 0 0 6 0 3 3 0 0 0 6 0 3 3 0 0 0 6 0M9 20v-6h6v6" /></>,
  bag: () => <Path d="M6 8h12l-1 12H7L6 8Zm3 0a3 3 0 0 1 6 0" />,
  headset: () => <><Path d="M4 14v-2a8 8 0 0 1 16 0v2" /><Rect x={3} y={14} width={4} height={6} rx={1.5} /><Rect x={17} y={14} width={4} height={6} rx={1.5} /><Path d="M19 20a3 3 0 0 1-3 2h-3" /></>,
  ret: () => <Path d="M9 14 4 9l5-5M4 9h10a6 6 0 0 1 0 12h-3" />,
  cal: () => <><Rect x={3} y={5} width={18} height={16} rx={2} /><Path d="M3 10h18M8 3v4M16 3v4" /></>,
  check: () => <Path d="M5 12l5 5L20 7" />,
  bell: () => <><Path d="M6 16V11a6 6 0 0 1 12 0v5l2 2H4z" /><Path d="M10 20a2 2 0 0 0 4 0" /></>,
  chef: () => <Path d="M6 14a4 4 0 1 1 2-7.5A4 4 0 0 1 16 6.5 4 4 0 1 1 18 14v6H6zM6 17h12" />,
  pause: () => <Path d="M9 5v14M15 5v14" />,
  pct: () => <><Path d="M19 5 5 19" /><Circle cx={7} cy={7} r={2.5} /><Circle cx={17} cy={17} r={2.5} /></>,
  dollar: () => <Path d="M12 3v18M17 7H9.5a3 3 0 0 0 0 6h5a3 3 0 0 1 0 6H7" />,
  bowl: () => <><Path d="M3 11h18a9 9 0 0 1-18 0Z" /><Path d="M12 4v4M9 6l1 2M15 6l-1 2" /></>,
};
export function Icon({ name, size = 22, color = "#6B7280", sw = 1.8 }: { name: keyof typeof P | string; size?: number; color?: string; sw?: number }) {
  const draw = P[name] || P.bowl;
  return <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round">{draw(color)}</Svg>;
}

// Duo-line icons (the chosen modern look): the main shape in one colour, the key detail in the accent colour (lime).
const D: Record<string, [React.ReactNode, React.ReactNode]> = {
  print: [<><Path d="M7 9V3.5h10V9" /><Rect x={3} y={9} width={18} height={8.5} rx={3} /></>, <Path d="M7.5 14h9v6.5h-9z" />],
  chef: [<Path d="M6.5 15a4.3 4.3 0 1 1 2.1-8 4.4 4.4 0 0 1 6.8 0 4.3 4.3 0 1 1 2.1 8v5.5h-11z" />, <Path d="M7 17.5h10" />],
  pause: [<Circle cx={12} cy={12} r={9.5} />, <Path d="M10 9v6M14 9v6" />],
  ret: [<Path d="M3 13h5l1.8 2.5h4.4L16 13h5v5a3 3 0 0 1-3 3H6a3 3 0 0 1-3-3z" />, <Path d="M12 3v8.5M8.5 8l3.5 3.5L15.5 8" />],
  pct: [<Path d="M12 2.2l2.5 2.1 3.3-.3.9 3.2 2.9 1.6-1.2 3.2 1.2 3.2-2.9 1.6-.9 3.2-3.3-.3L12 21.8l-2.5-2.1-3.3.3-.9-3.2-2.9-1.6 1.2-3.2L2.4 8.8l2.9-1.6.9-3.2 3.3.3z" />, <><Path d="M9 15l6-6" /><Circle cx={9.5} cy={9.5} r={0.6} /><Circle cx={14.5} cy={14.5} r={0.6} /></>],
  dollar: [<Circle cx={12} cy={12} r={9.5} />, <Path d="M14.8 9.3c-.4-.9-1.5-1.5-2.8-1.5-1.6 0-2.8.8-2.8 2 0 2.8 5.6 1.4 5.6 4.3 0 1.2-1.2 2.1-2.8 2.1-1.4 0-2.5-.6-2.9-1.6M12 6v1.8M12 16.2V18" />],
  note: [<Rect x={4} y={2.5} width={16} height={19} rx={4} />, <Path d="M8.5 8.5h7M8.5 12h7M8.5 15.5h4" />],
  tag: [<Path d="M3 4.8A1.8 1.8 0 0 1 4.8 3h7a1.8 1.8 0 0 1 1.3.5l7.6 7.6a1.8 1.8 0 0 1 0 2.6l-6.9 6.9a1.8 1.8 0 0 1-2.6 0l-7.6-7.6A1.8 1.8 0 0 1 3 11.7z" />, <Circle cx={8.3} cy={8.3} r={1.6} />],
  void: [<Circle cx={12} cy={12} r={9.5} />, <Path d="M8 8l8 8M16 8l-8 8" />],
  grid: [<><Rect x={3.5} y={3.5} width={7} height={7} rx={2.5} /><Rect x={13.5} y={13.5} width={7} height={7} rx={2.5} /></>, <><Rect x={13.5} y={3.5} width={7} height={7} rx={2.5} /><Rect x={3.5} y={13.5} width={7} height={7} rx={2.5} /></>],
  list: [<><Rect x={4.5} y={4} width={15} height={17.5} rx={3.5} /><Path d="M9 2.5h6v3H9z" /></>, <Path d="M8.5 11h7M8.5 15h4.5" />],
  table: [<Path d="M5 10v10M19 10v10M8 4.5h8" />, <Rect x={2.5} y={7} width={19} height={3.5} rx={1.7} />],
  scooter: [<Path d="M3.5 14.5c0-2.6 2-4.5 4.5-4.5h5l2.2-4.5H18M13 10l3.5 4.5" />, <><Circle cx={6.5} cy={17.5} r={2.8} /><Circle cx={17.5} cy={17.5} r={2.8} /></>],
  plus: [<Rect x={3} y={3} width={18} height={18} rx={6} />, <Path d="M12 8v8M8 12h8" />],
};
export const LIME = "#A3E635";
export const NAVY = "#1E3A8A";
export function DuoIcon({ name, size = 24, color = NAVY, accent = LIME, sw = 1.9 }: { name: string; size?: number; color?: string; accent?: string; sw?: number }) {
  const d = D[name];
  if (!d) return <Icon name={name} size={size} color={color} sw={sw} />;
  return <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" strokeLinecap="round" strokeLinejoin="round">
    <G stroke={color} strokeWidth={sw}>{d[0]}</G><G stroke={accent} strokeWidth={sw + 0.3}>{d[1]}</G></Svg>;
}
