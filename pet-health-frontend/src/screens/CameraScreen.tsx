import { Ionicons } from '@expo/vector-icons';
import { Image, Pressable, Text, View } from 'react-native';

type CameraScreenProps = {
  petName: string;
  imageUri: string | null;
  onBack: () => void;
  onPickImage: () => void;
  onAnalyze: () => void;
};

/** Matches `figma/code/src/app/components/CameraScreen.tsx` (dark chrome + preview). */
export function CameraScreen({ petName, imageUri, onBack, onPickImage, onAnalyze }: CameraScreenProps) {
  return (
    <View className="flex-1 bg-gray-900">
      <View className="flex-row items-center gap-3 border-b border-white/10 bg-black/50 px-4 py-4">
        <Pressable className="rounded-lg p-2 active:bg-white/10" onPress={onBack}>
          <Ionicons name="arrow-back" size={24} color="#ffffff" />
        </Pressable>
        <View className="flex-1">
          <Text className="text-lg font-semibold text-white">Analyze {petName}</Text>
          <Text className="text-sm text-gray-300">Capture or upload a photo</Text>
        </View>
      </View>

      <View className="flex-1 items-center justify-center p-6">
        {imageUri ? (
          <Image source={{ uri: imageUri }} className="max-h-96 w-full max-w-md rounded-xl" resizeMode="contain" />
        ) : (
          <View className="items-center">
            <View className="mb-6 h-32 w-32 items-center justify-center rounded-full bg-gray-800">
              <Ionicons name="camera-outline" size={56} color="#9ca3af" />
            </View>
            <Text className="text-center text-base text-white">Upload a photo of your pet</Text>
          </View>
        )}
      </View>

      <View className="gap-3 bg-black/50 p-6">
        <Pressable
          className="flex-row items-center justify-center gap-2 rounded-xl bg-blue-600 py-4 active:bg-blue-700"
          onPress={onPickImage}
        >
          <Ionicons name="images-outline" size={20} color="#ffffff" />
          <Text className="text-center text-base font-semibold text-white">
            {imageUri ? 'Choose another photo' : 'Upload from Gallery'}
          </Text>
        </Pressable>
        {imageUri ? (
          <Pressable
            className="flex-row items-center justify-center gap-2 rounded-xl border border-white/30 py-4 active:bg-white/10"
            onPress={onAnalyze}
          >
            <Ionicons name="sparkles-outline" size={20} color="#ffffff" />
            <Text className="text-center text-base font-semibold text-white">Analyze Image</Text>
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}
