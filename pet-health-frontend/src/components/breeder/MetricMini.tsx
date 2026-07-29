import { Text, View } from 'react-native';

type MetricMiniProps = {
  label: string;
  value: string;
};

export function MetricMini({ label, value }: MetricMiniProps) {
  return (
    <View style={{ flex: 1, minWidth: 0 }}>
      <Text
        style={{
          fontSize: 10,
          color: '#94A3B8',
          fontWeight: '500',
          textTransform: 'uppercase',
          letterSpacing: 0.4,
          marginBottom: 2,
        }}
        numberOfLines={1}
      >
        {label}
      </Text>
      <Text style={{ fontSize: 13, color: '#0F172A', fontWeight: '700' }} numberOfLines={1}>
        {value}
      </Text>
    </View>
  );
}
