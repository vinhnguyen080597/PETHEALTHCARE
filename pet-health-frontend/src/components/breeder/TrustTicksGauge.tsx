import { useEffect, useState } from 'react';
import { AccessibilityInfo, Text, View } from 'react-native';
import Svg, { Line, Text as SvgText } from 'react-native-svg';
import { transparencyTickColor } from '../../utils/breederTransparencyScore';

type TrustTicksGaugeProps = {
  score: number;
  caption: string;
  size?: number;
  /** Override tick coloring (defaults to transparency score bands). */
  tickColor?: (tickIndex: number, score: number) => string;
  /** Duration of the sweep that fills ticks up to the score, in ms. */
  sweepMs?: number;
};

const TICK_STEP_MS = 12;

/**
 * 100 radial ticks gauge — matches web TrustTicksGauge.
 * On mount, active ticks light up in a clockwise sweep from tick 1 to the score.
 */
export function TrustTicksGauge({
  score,
  caption,
  size = 168,
  tickColor = transparencyTickColor,
  sweepMs = 900,
}: TrustTicksGaugeProps) {
  const s = Math.max(0, Math.min(100, Math.round(score)));
  const [litThrough, setLitThrough] = useState(0);
  const cx = size / 2;
  const cy = size / 2;
  const outerR = size * 0.42;
  const innerR = size * 0.32;
  const labelR = size * 0.47;
  const strokeWidth = Math.max(1.2, size * 0.008);

  useEffect(() => {
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | null = null;
    let frame = 0;

    AccessibilityInfo.isReduceMotionEnabled().then((reduceMotion) => {
      if (cancelled) return;
      if (reduceMotion || s <= 0) {
        setLitThrough(s);
        return;
      }
      setLitThrough(0);
      const stepMs = Math.max(TICK_STEP_MS, Math.floor(sweepMs / s));
      const tick = () => {
        frame += 1;
        const next = Math.min(s, frame);
        setLitThrough(next);
        if (next < s) {
          timer = setTimeout(tick, stepMs);
        }
      };
      timer = setTimeout(tick, stepMs);
    });

    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
    };
  }, [s, sweepMs]);

  const ticks = Array.from({ length: 100 }, (_, i) => {
    const tick = i + 1;
    const angleDeg = (tick / 100) * 360 - 90;
    const rad = (angleDeg * Math.PI) / 180;
    const activeScore = tick <= litThrough ? s : 0;
    return (
      <Line
        key={tick}
        x1={cx + Math.cos(rad) * innerR}
        y1={cy + Math.sin(rad) * innerR}
        x2={cx + Math.cos(rad) * outerR}
        y2={cy + Math.sin(rad) * outerR}
        stroke={tickColor(tick, activeScore)}
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
