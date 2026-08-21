import { useEffect, useRef } from 'react';
import { Platform, Text, TextInput, View } from 'react-native';
import { BRAND } from '../theme/brand';
import { OTP_PIN_LENGTH, applyOtpDigitAt, otpDigitsArray } from '../utils/otpPin';

type OtpPinInputProps = {
  value: string;
  onChange: (value: string) => void;
  hasError?: boolean;
  length?: number;
  testID?: string;
};

export function OtpPinInput({
  value,
  onChange,
  hasError = false,
  length = OTP_PIN_LENGTH,
  testID = 'signup-otp-input',
}: OtpPinInputProps) {
  const inputsRef = useRef<Array<TextInput | null>>([]);
  const digits = otpDigitsArray(value, length);
  const mid = Math.ceil(length / 2);

  useEffect(() => {
    inputsRef.current = inputsRef.current.slice(0, length);
  }, [length]);

  function focusIndex(index: number) {
    const next = Math.max(0, Math.min(index, length - 1));
    inputsRef.current[next]?.focus();
  }

  function handleChange(index: number, raw: string) {
    const next = applyOtpDigitAt(value, index, raw, length);
    onChange(next);
    if (raw.replace(/\D/g, '').length > 1) {
      focusIndex(Math.min(Math.max(next.length - 1, 0), length - 1));
      return;
    }
    if (raw.replace(/\D/g, '').length === 1 && index < length - 1) {
      focusIndex(index + 1);
    }
  }

  function handleKeyPress(index: number, key: string) {
    if (key !== 'Backspace') return;
    if (digits[index]) return;
    if (index > 0) {
      const next = applyOtpDigitAt(value, index - 1, '', length);
      onChange(next);
      focusIndex(index - 1);
    }
  }

  function renderCell(index: number) {
    const filled = Boolean(digits[index]);
    const borderColor = hasError ? '#f87171' : filled ? BRAND.primary : BRAND.inputBorder;
    return (
      <TextInput
        key={`otp-cell-${index}`}
        ref={(node) => {
          inputsRef.current[index] = node;
        }}
        testID={index === 0 ? testID : `${testID}-cell-${index}`}
        accessibilityLabel={`OTP digit ${index + 1}`}
        className="h-11 min-w-0 flex-1 rounded-xl bg-white text-center text-base font-bold text-slate-900"
        style={{ borderWidth: 1.5, borderColor, maxWidth: 40 }}
        keyboardType="number-pad"
        textContentType={index === 0 ? 'oneTimeCode' : 'none'}
        autoComplete={index === 0 && Platform.OS === 'android' ? 'sms-otp' : 'off'}
        maxLength={length}
        value={digits[index]}
        onChangeText={(text) => handleChange(index, text)}
        onKeyPress={({ nativeEvent }) => handleKeyPress(index, nativeEvent.key)}
        onFocus={() => {
          const firstEmpty = digits.findIndex((digit) => !digit);
          if (firstEmpty >= 0 && firstEmpty < index) focusIndex(firstEmpty);
        }}
      />
    );
  }

  return (
    <View testID={`${testID}-row`} className="w-full flex-row items-center justify-center gap-1.5 px-1">
      <View className="min-w-0 flex-1 flex-row gap-1">
        {Array.from({ length: mid }, (_, i) => renderCell(i))}
      </View>
      <Text className="px-0.5 text-base font-bold text-slate-300">-</Text>
      <View className="min-w-0 flex-1 flex-row gap-1">
        {Array.from({ length: length - mid }, (_, i) => renderCell(mid + i))}
      </View>
    </View>
  );
}
