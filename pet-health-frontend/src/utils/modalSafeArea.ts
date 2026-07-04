import { Platform, StatusBar } from 'react-native';

export function modalTopInset(insetsTop: number) {
  if (insetsTop > 0) return insetsTop;
  if (Platform.OS === 'ios') return 47;
  return StatusBar.currentHeight ?? 24;
}

export function modalBottomInset(insetsBottom: number, minimum = 8) {
  return Math.max(insetsBottom, minimum);
}
