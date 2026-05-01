import { Camera, Plus, Stethoscope, User } from 'lucide-react';
import { Pet } from '../App';

type HomeScreenProps = {
  pets: Pet[];
  onSelectPet: (pet: Pet) => void;
  onStartAnalysis: (pet: Pet) => void;
  onAddPet: () => void;
  onViewProfile: (pet: Pet) => void;
};

export function HomeScreen({ pets, onStartAnalysis, onAddPet, onViewProfile }: HomeScreenProps) {
  return (
    <div className="h-full flex flex-col">
      <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-6 py-8 text-white">
        <div className="flex items-center gap-3 mb-2">
          <Stethoscope className="size-8" />
          <h1 className="text-2xl">Catties Health Care</h1>
        </div>
        <p className="text-blue-100">Your pet's health assistant powered by Catties</p>
      </div>

      <div className="flex-1 overflow-y-auto px-6 py-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg">My Pets</h2>
          <button
            onClick={onAddPet}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Plus className="size-4" />
            Add Pet
          </button>
        </div>

        <div className="space-y-4">
          {pets.map((pet) => (
            <div
              key={pet.id}
              className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm hover:shadow-md transition-shadow"
            >
              <div className="flex items-start gap-4">
                <div className="size-16 bg-gradient-to-br from-blue-400 to-blue-600 rounded-full flex items-center justify-center text-white flex-shrink-0">
                  {pet.imageUrl ? (
                    <img src={pet.imageUrl} alt={pet.name} className="size-full rounded-full object-cover" />
                  ) : (
                    <User className="size-8" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-lg mb-1">{pet.name}</h3>
                  <p className="text-sm text-gray-600">
                    {pet.breed} • {pet.age} {pet.age === 1 ? 'year' : 'years'} old
                  </p>
                  <div className="flex gap-2 mt-3">
                    <button
                      onClick={() => onStartAnalysis(pet)}
                      className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm"
                    >
                      <Camera className="size-4" />
                      Scan Health
                    </button>
                    <button
                      onClick={() => onViewProfile(pet)}
                      className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors text-sm"
                    >
                      View Profile
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {pets.length === 0 && (
          <div className="text-center py-12">
            <div className="size-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <User className="size-10 text-gray-400" />
            </div>
            <p className="text-gray-600 mb-4">No pets added yet</p>
            <button
              onClick={onAddPet}
              className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors mx-auto"
            >
              <Plus className="size-5" />
              Add Your First Pet
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
