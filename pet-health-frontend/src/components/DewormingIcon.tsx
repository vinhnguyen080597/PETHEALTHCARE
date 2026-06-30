import Svg, { Circle, Path } from 'react-native-svg';

type DewormingIconProps = {
  size?: number;
  color?: string;
};

/** Segmented roundworm silhouette — common on pet dewormer packaging. */
export function DewormingIcon({ size = 20, color = '#1E6FE8' }: DewormingIconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M4.5 15.8C6.8 10.2 11.2 8.2 15.4 9.8C18.6 11.2 20.2 14.1 18.8 17.2"
        stroke={color}
        strokeWidth={2.2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Path d="M8.6 13.4L8.2 15.6" stroke={color} strokeWidth={1.6} strokeLinecap="round" />
      <Path d="M11.8 12.3L11.4 14.5" stroke={color} strokeWidth={1.6} strokeLinecap="round" />
      <Path d="M15.1 12.1L14.7 14.3" stroke={color} strokeWidth={1.6} strokeLinecap="round" />
      <Circle cx={19.1} cy={10.4} r={1.3} fill={color} />
      <Circle cx={20.1} cy={10.1} r={0.35} fill="#ffffff" />
    </Svg>
  );
}
