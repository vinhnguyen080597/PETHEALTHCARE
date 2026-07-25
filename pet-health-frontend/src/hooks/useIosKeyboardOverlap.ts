import { useEffect, useState } from 'react';
import { Keyboard, Platform } from 'react-native';

/**
 * iOS keyboard height for manually lifting composers.
 * Prefer this over KeyboardAvoidingView inside Modal / pinned bottom composers.
 */
export function useIosKeyboardOverlap() {
  const [overlap, setOverlap] = useState(0);

  useEffect(() => {
    if (Platform.OS !== 'ios') return;
    const onShow = Keyboard.addListener('keyboardWillShow', (event) => {
      setOverlap(Math.max(0, event.endCoordinates.height));
    });
    const onHide = Keyboard.addListener('keyboardWillHide', () => setOverlap(0));
    return () => {
      onShow.remove();
      onHide.remove();
    };
  }, []);

  return overlap;
}
