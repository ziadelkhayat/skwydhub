// The skwyd logo (same artwork as the portal): the squid, "skwyd", the lime line and a label under it (pos, team, driver…).
import { View } from "react-native";
import Svg, { G, Path, Rect, Text as SvgText } from "react-native-svg";

const WORD = "M14.22 53.04Q11.52 53.04 8.91 52.32Q6.3 51.6 4.05 50.37Q1.8 49.14 0.24 47.52L5.94 41.7Q7.38 43.2 9.39 44.04Q11.4 44.88 13.68 44.88Q15.0 44.88 15.69 44.52Q16.38 44.16 16.38 43.5Q16.38 42.54 15.39 42.03Q14.4 41.52 12.81 41.13Q11.22 40.74 9.48 40.17Q7.74 39.6 6.12 38.64Q4.5 37.68 3.51 35.94Q2.52 34.2 2.52 31.5Q2.52 28.68 4.05 26.55Q5.58 24.42 8.34 23.19Q11.1 21.96 14.82 21.96Q18.6 21.96 22.02 23.25Q25.44 24.54 27.54 27.12L21.78 32.94Q20.34 31.32 18.6 30.69Q16.86 30.06 15.42 30.06Q14.04 30.06 13.44 30.45Q12.84 30.84 12.84 31.5Q12.84 32.28 13.83 32.76Q14.82 33.24 16.41 33.63Q18.0 34.02 19.71 34.62Q21.42 35.22 23.01 36.27Q24.6 37.32 25.59 39.06Q26.58 40.8 26.58 43.56Q26.58 47.94 23.22 50.49Q19.86 53.04 14.22 53.04Z M47.76 52.2 39.36 38.22V52.2H28.92V8.46H39.36V35.58L47.7 22.86H59.16L49.26 36.6L59.76 52.2Z M66.72 52.2 57.42 22.86H67.5L71.64 38.94L76.56 22.86H85.86L90.78 38.94L94.98 22.86H105.06L95.76 52.2H86.34L81.24 35.64L76.02 52.2Z M107.7 64.62 114.06 50.7 102.9 22.86H114.06L119.1 39.72L124.14 22.86H135.3L123.24 52.26L118.2 64.62Z M148.56 52.8Q144.3 52.8 141.06 50.82Q137.82 48.84 135.99 45.39Q134.16 41.94 134.16 37.56Q134.16 33.12 135.99 29.64Q137.82 26.16 141.03 24.21Q144.24 22.26 148.56 22.26Q151.32 22.26 153.72 23.22Q154.74 23.64 155.58 24.24V8.46H166.02V52.2H155.76V50.52Q154.8 51.18 153.72 51.66Q151.32 52.8 148.56 52.8ZM150.42 43.5Q152.16 43.5 153.42 42.75Q154.68 42.0 155.43 40.65Q156.18 39.3 156.18 37.5Q156.18 35.76 155.46 34.44Q154.74 33.12 153.45 32.34Q152.16 31.56 150.48 31.56Q148.8 31.56 147.51 32.34Q146.22 33.12 145.47 34.47Q144.72 35.82 144.72 37.5Q144.72 39.24 145.44 40.59Q146.16 41.94 147.48 42.72Q148.8 43.5 150.42 43.5Z";

export function SkwydLogo({ label, ink = "#24409A", scale = 1 }: { label: string; ink?: string; scale?: number }) {
  const h = 34 * scale;
  return (
    <View style={{ alignItems: "center", gap: 4 * scale }} accessibilityRole="image" accessibilityLabel={"skwyd " + label}>
      <Svg width={40 * scale} height={52 * scale} viewBox="19 10 82 108"><G transform="translate(0 3)">
      <Path d="M60 10C82 10 94 32 94 54C94 70 82 78 60 78C38 78 26 70 26 54C26 32 38 10 60 10Z" fill="none" stroke={ink} strokeWidth={5.5} strokeLinejoin="round" />
      <Path d="M38 74C34 92 22 94 24 104C26 110 34 106 30 101M50 78C50 94 44 104 48 110M60 78V108C60 112 66 112 64 107M70 78C70 94 76 104 72 110M82 74C86 92 98 94 96 104C94 110 86 106 90 101" fill="none" stroke={ink} strokeWidth={5.5} strokeLinecap="round" strokeLinejoin="round" />
      <Path d="M48 50h0M72 50h0" fill="none" stroke={ink} strokeWidth={8.8} strokeLinecap="round" />
      </G></Svg>
      <Svg width={h * 169 / 95} height={h} viewBox="0 7 169 95">
        <Path d={WORD} fill={ink} />
        <Rect x={43.96} y={70} width={81.16} height={4} fill="#9CC70F" />
        <SvgText x={84.54} y={96} textAnchor="middle" fontSize={24} fontWeight="600" letterSpacing={1.3} fill={ink}>{label}</SvgText>
      </Svg>
    </View>
  );
}
