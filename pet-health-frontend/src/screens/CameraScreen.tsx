import { Ionicons } from '@expo/vector-icons';
import { Image, Pressable, Text, View } from 'react-native';

type CameraScreenProps = {
  petName: string;
  imageUri: string | null;
  onBack: () => void;
  onPickImage: () => void;
  onAnalyze: () => void;
};

export function CameraScreen({ petName, imageUri, onBack, onPickImage, onAnalyze }: CameraScreenProps) {
  return (
    <View className="flex-1 bg-slate-900 px-4 py-6">
      <Pressable className="mb-4 self-start rounded-lg bg-white/20 px-3 py-2" onPress={onBack}>
        <Text className="text-white">Back</Text>
      </Pressable>
      <Text className="mb-2 text-lg font-semibold text-white">Analyze {petName}</Text>
      <Text className="mb-4 text-slate-300">Capture or upload a photo</Text>
      {imageUri ? (
        <Image source={{ uri: imageUri }} className="h-72 w-full rounded-xl" resizeMode="cover" />
      ) : (
        <View className="h-72 w-full items-center justify-center rounded-xl bg-slate-800">
          <Ionicons name="camera-outline" size={60} color="#94a3b8" />
        </View>
      )}
      <Pressable className="mt-4 rounded-xl bg-brand-600 py-3" onPress={onPickImage}>
        <Text className="text-center font-semibold text-white">{imageUri ? 'Retake Image' : 'Upload from Gallery'}</Text>
      </Pressable>
      {imageUri ? (
        <Pressable className="mt-3 rounded-xl bg-white/20 py-3" onPress={onAnalyze}>
          <Text className="text-center font-semibold text-white">Analyze Image</Text>
        </Pressable>
      ) : null}
    </View>
  );
}
