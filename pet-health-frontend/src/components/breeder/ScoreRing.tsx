import { Text, View } from 'react-native';
import Svg, { Circle } from 'react-native-svg';

type ScoreRingProps = {
  score: number;
  size?: number;
  color?: string;
  trackColor?: string;
  textColor?: string;
};

export function ScoreRing({
  score,
  size = 72,
  color = '#fff',
  trackColor = 'rgba(255,255,255,0.2)',
  textColor = '#fff',
}: ScoreRingProps) {
  const r = size / 2 - 7;
  const circ = 2 * Math.PI * r;
  const clamped = Math.max(0, Math.min(100, score));
  const dash = (clamped / 100) * circ;

  return (
    <View style={{ width: size, height: size, flexShrink: 0 }}>
      <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <Circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={trackColor} strokeWidth={6} />
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={color}
          strokeWidth={6}
          strokeDasharray={`${dash} ${circ}`}
          strokeLinecap="round"
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      </Svg>
      <View
        style={{
          position: 'absolute',
          top: 0,
          right: 0,
          bottom: 0,
          left: 0,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Text style={{ fontSize: size * 0.28, fontWeight: '800', color: textColor, lineHeight: size * 0.3 }}>
          {Math.round(clamped)}
        </Text>
        <Text style={{ fontSize: size * 0.14, color: textColor, opacity: 0.65 }}>/100</Text>
      </View>
    </View>
  );
}
