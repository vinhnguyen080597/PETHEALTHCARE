import { Pressable, ScrollView, Text, TextInput, View } from 'react-native';

type AddPetScreenProps = {
  petName: string;
  petSpecies: string;
  petBreed: string;
  petAge: string;
  onChangeName: (value: string) => void;
  onChangeSpecies: (value: string) => void;
  onChangeBreed: (value: string) => void;
  onChangeAge: (value: string) => void;
  onSave: () => void;
};

export function AddPetScreen({
  petName,
  petSpecies,
  petBreed,
  petAge,
  onChangeName,
  onChangeSpecies,
  onChangeBreed,
  onChangeAge,
  onSave,
}: AddPetScreenProps) {
  return (
    <ScrollView className="flex-1 px-4 pt-4">
      <Text className="mb-3 text-lg font-semibold">Add New Pet</Text>
      <TextInput
        className="mb-3 rounded-xl border border-slate-300 bg-white px-4 py-3"
        placeholder="Name"
        value={petName}
        onChangeText={onChangeName}
      />
      <TextInput
        className="mb-3 rounded-xl border border-slate-300 bg-white px-4 py-3"
        placeholder="Species (cat/dog/bird)"
        value={petSpecies}
        onChangeText={onChangeSpecies}
      />
      <TextInput
        className="mb-3 rounded-xl border border-slate-300 bg-white px-4 py-3"
        placeholder="Breed"
        value={petBreed}
        onChangeText={onChangeBreed}
      />
      <TextInput
        className="mb-4 rounded-xl border border-slate-300 bg-white px-4 py-3"
        placeholder="Age"
        keyboardType="numeric"
        value={petAge}
        onChangeText={onChangeAge}
      />
      <Pressable className="rounded-xl bg-brand-600 py-3" onPress={onSave}>
        <Text className="text-center font-semibold text-white">Save Pet</Text>
      </Pressable>
    </ScrollView>
  );
}
