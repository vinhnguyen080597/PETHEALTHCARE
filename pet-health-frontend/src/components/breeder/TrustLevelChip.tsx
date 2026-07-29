import { Text, View } from 'react-native';
import { levelColor } from '../../utils/breederTrustLevel';

type TrustLevelChipProps = {
  level: string;
  label: string;
  invert?: boolean;
};

export function TrustLevelChip({ level, label, invert = false }: TrustLevelChipProps) {
  const colors = levelColor(level);
  if (invert) {
    return (
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: 4,
          backgroundColor: 'rgba(255,255,255,0.18)',
          borderRadius: 999,
          paddingHorizontal: 10,
          paddingVertical: 3,
        }}
      >
        <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: '#fff', opacity: 0.7 }} />
        <Text style={{ fontSize: 11, fontWeight: '600', color: '#fff' }}>{label}</Text>
      </View>
    );
  }
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        backgroundColor: colors.bg,
        borderRadius: 999,
        paddingHorizontal: 10,
        paddingVertical: 3,
      }}
    >
      <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: colors.dot }} />
      <Text style={{ fontSize: 11, fontWeight: '600', color: colors.text }}>{label}</Text>
    </View>
  );
}
