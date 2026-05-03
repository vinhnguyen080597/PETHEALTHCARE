import { Ionicons } from '@expo/vector-icons';
import { Alert, KeyboardAvoidingView, Platform, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

type LoginScreenProps = {
  healthMessage: string;
  email: string;
  password: string;
  isSignUp: boolean;
  onChangeEmail: (value: string) => void;
  onChangePassword: (value: string) => void;
  onToggleSignUp: () => void;
  onSubmit: () => void;
  onGoogleSignIn: () => void;
  onAppleSignIn: () => void;
  appleSignInAvailable: boolean;
  googleSignInReady: boolean;
};

/** Mirrors `figma/code/src/app/components/LoginScreen.tsx` layout for React Native + NativeWind. */
export function LoginScreen({
  healthMessage,
  email,
  password,
  isSignUp,
  onChangeEmail,
  onChangePassword,
  onToggleSignUp,
  onSubmit,
  onGoogleSignIn,
  onAppleSignIn,
  appleSignInAvailable,
  googleSignInReady,
}: LoginScreenProps) {
  const healthLooksBad = /unreachable|offline|failed|error|503|401|network/i.test(healthMessage);

  return (
    <SafeAreaView className="flex-1 bg-blue-600" edges={['top', 'bottom', 'left', 'right']}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} className="flex-1">
        <ScrollView
          className="flex-1"
          contentContainerStyle={{ flexGrow: 1, paddingHorizontal: 24, paddingVertical: 40 }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View className="flex-1 items-center justify-center pb-6">
            <View className="mb-6 h-24 w-24 items-center justify-center rounded-full bg-white shadow-lg">
              <Ionicons name="medkit-outline" size={48} color="#2563eb" />
            </View>
            <Text className="mb-2 text-center text-3xl font-semibold text-white">Catties Health Care</Text>
            <Text className="mb-10 max-w-sm text-center text-base text-blue-100">
              {"Your pet's health assistant powered by Catties"}
            </Text>

            <View className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl">
              <Text className="mb-6 text-center text-xl font-semibold text-slate-900">
                {isSignUp ? 'Create Account' : 'Welcome Back'}
              </Text>

              <View className="mb-4">
                <Text className="mb-2 text-sm text-slate-700">Email</Text>
                <TextInput
                  className="rounded-xl border border-gray-300 bg-white px-4 py-3 text-base text-slate-900"
                  placeholder="your@email.com"
                  placeholderTextColor="#9ca3af"
                  autoCapitalize="none"
                  keyboardType="email-address"
                  value={email}
                  onChangeText={onChangeEmail}
                />
              </View>

              <View className="mb-6">
                <Text className="mb-2 text-sm text-slate-700">Password</Text>
                <TextInput
                  className="rounded-xl border border-gray-300 bg-white px-4 py-3 text-base text-slate-900"
                  placeholder="••••••••"
                  placeholderTextColor="#9ca3af"
                  secureTextEntry
                  value={password}
                  onChangeText={onChangePassword}
                />
              </View>

              <Pressable className="mb-6 w-full rounded-xl bg-blue-600 py-3 active:bg-blue-700" onPress={onSubmit}>
                <Text className="text-center text-base font-semibold text-white">{isSignUp ? 'Sign Up' : 'Sign In'}</Text>
              </Pressable>

              <View className="mb-6 flex-row items-center">
                <View className="h-px flex-1 bg-gray-300" />
                <Text className="bg-white px-4 text-sm text-gray-500">Or continue with</Text>
                <View className="h-px flex-1 bg-gray-300" />
              </View>

              <View className="gap-3">
                <Pressable
                  className={`flex-row items-center justify-center gap-3 rounded-xl border border-gray-300 bg-white py-3 active:bg-gray-50 ${!googleSignInReady ? 'opacity-50' : ''}`}
                  disabled={!googleSignInReady}
                  onPress={onGoogleSignIn}
                >
                  <Ionicons name="logo-google" size={20} color="#4285F4" />
                  <Text className="text-base font-medium text-slate-800">Google</Text>
                </Pressable>
                {appleSignInAvailable ? (
                  <Pressable
                    className="flex-row items-center justify-center gap-3 rounded-xl bg-black py-3 active:bg-gray-900"
                    onPress={onAppleSignIn}
                  >
                    <Ionicons name="logo-apple" size={20} color="#ffffff" />
                    <Text className="text-base font-medium text-white">Apple</Text>
                  </Pressable>
                ) : null}
              </View>

              <Pressable className="mt-6" onPress={onToggleSignUp}>
                <Text className="text-center text-sm text-blue-600">
                  {isSignUp ? 'Already have an account? Sign in' : "Don't have an account? Sign up"}
                </Text>
              </Pressable>
            </View>
          </View>

          <Text className={`px-2 text-center text-xs ${healthLooksBad ? 'text-red-200' : 'text-blue-100'}`}>{healthMessage}</Text>
          <Text className="mt-3 px-4 pb-4 text-center text-xs text-blue-100">
            By continuing, you agree to our Terms of Service and Privacy Policy
          </Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
