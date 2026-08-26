import { Text, View } from 'react-native';
import Svg, { Line, Text as SvgText } from 'react-native-svg';
import { transparencyTickColor } from '../../utils/breederTransparencyScore';

type TrustTicksGaugeProps = {
  score: number;
  caption: string;
  size?: number;
};

/**
 * 100 radial ticks gauge — matches web TrustTicksGauge.
 * Active ticks (≤ score) use band colors; inactive ticks are light gray.
 */
export function TrustTicksGauge({ score, caption, size = 168 }: TrustTicksGaugeProps) {
  const s = Math.max(0, Math.min(100, Math.round(score)));
  const cx = size / 2;
  const cy = size / 2;
  const outerR = size * 0.42;
  const innerR = size * 0.32;
  const labelR = size * 0.47;
  const strokeWidth = Math.max(1.2, size * 0.008);

  const ticks = Array.from({ length: 100 }, (_, i) => {
    const tick = i + 1;
    const angleDeg = (tick / 100) * 360 - 90;
    const rad = (angleDeg * Math.PI) / 180;
    return (
      <Line
        key={tick}
        x1={cx + Math.cos(rad) * innerR}
        y1={cy + Math.sin(rad) * innerR}
        x2={cx + Math.cos(rad) * outerR}
        y2={cy + Math.sin(rad) * outerR}
        stroke={transparencyTickColor(tick, s)}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
      />
    );
  });

  const markers = [0, 20, 40, 60, 80].map((m) => {
    const angleDeg = (m / 100) * 360 - 90;
    const rad = (angleDeg * Math.PI) / 180;
    return (
      <SvgText
        key={m}
        x={cx + Math.cos(rad) * labelR}
        y={cy + Math.sin(rad) * labelR}
        fill="#94A3B8"
        fontSize={size * 0.045}
        fontWeight="500"
        textAnchor="middle"
        alignmentBaseline="middle"
      >
        {m}
      </SvgText>
    );
  });

  return (
    <View
      accessibilityRole="image"
      accessibilityLabel={`${s}/100`}
      style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}
    >
      <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        {ticks}
        {markers}
      </Svg>
      <View
        pointerEvents="none"
        style={{
          position: 'absolute',
          top: 0,
          right: 0,
          bottom: 0,
          left: 0,
          alignItems: 'center',
          justifyContent: 'center',
          paddingHorizontal: size * 0.12,
        }}
      >
        <Text style={{ fontSize: size * 0.2, fontWeight: '800', color: '#0F172A', lineHeight: size * 0.22 }}>
          {s}
        </Text>
        <Text
          style={{
            marginTop: 4,
            fontSize: Math.max(9, size * 0.055),
            fontWeight: '700',
            color: '#64748B',
            textTransform: 'uppercase',
            textAlign: 'center',
            letterSpacing: 0.3,
            lineHeight: Math.max(11, size * 0.07),
          }}
          numberOfLines={2}
        >
          {caption}
        </Text>
      </View>
    </View>
  );
}
