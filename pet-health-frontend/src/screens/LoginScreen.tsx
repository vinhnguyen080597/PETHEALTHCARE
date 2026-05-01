import { Ionicons } from '@expo/vector-icons';
import { Pressable, Text, TextInput, View } from 'react-native';

type LoginScreenProps = {
  healthMessage: string;
  email: string;
  password: string;
  isSignUp: boolean;
  onChangeEmail: (value: string) => void;
  onChangePassword: (value: string) => void;
  onToggleSignUp: () => void;
  onSubmit: () => void;
};

export function LoginScreen({
  healthMessage,
  email,
  password,
  isSignUp,
  onChangeEmail,
  onChangePassword,
  onToggleSignUp,
  onSubmit,
}: LoginScreenProps) {
  return (
    <View className="flex-1 bg-blue-700 px-6 py-10">
      <View className="flex-1 items-center justify-center">
        <View className="mb-6 h-24 w-24 items-center justify-center rounded-full bg-white">
          <Ionicons name="medkit-outline" size={44} color="#2563eb" />
        </View>
        <Text className="text-3xl font-semibold text-white">Catties Health Care</Text>
        <Text className="mt-2 text-center text-blue-100">{healthMessage}</Text>
        <View className="mt-8 w-full rounded-2xl bg-white p-5">
          <Text className="mb-4 text-center text-xl font-semibold">{isSignUp ? 'Create Account' : 'Welcome Back'}</Text>
          <TextInput
            className="mb-3 rounded-xl border border-slate-300 px-4 py-3"
            placeholder="Email"
            autoCapitalize="none"
            keyboardType="email-address"
            value={email}
            onChangeText={onChangeEmail}
          />
          <TextInput
            className="mb-4 rounded-xl border border-slate-300 px-4 py-3"
            placeholder="Password"
            secureTextEntry
            value={password}
            onChangeText={onChangePassword}
          />
          <Pressable className="rounded-xl bg-brand-600 py-3" onPress={onSubmit}>
            <Text className="text-center font-semibold text-white">{isSignUp ? 'Sign Up' : 'Sign In'}</Text>
          </Pressable>
          <Pressable className="mt-4" onPress={onToggleSignUp}>
            <Text className="text-center text-blue-700">
              {isSignUp ? 'Already have an account? Sign in' : "Don't have an account? Sign up"}
            </Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
}
