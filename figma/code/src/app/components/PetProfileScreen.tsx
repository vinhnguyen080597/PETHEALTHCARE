import { useState } from 'react';
import { ArrowLeft } from 'lucide-react';
import { Pet } from '../App';

type PetProfileScreenProps = {
  pet: Pet | null;
  onSave: (pet: Omit<Pet, 'id'>) => void;
  onBack: () => void;
};

export function PetProfileScreen({ pet, onSave, onBack }: PetProfileScreenProps) {
  const [name, setName] = useState(pet?.name || '');
  const [type, setType] = useState(pet?.type || 'Dog');
  const [breed, setBreed] = useState(pet?.breed || '');
  const [age, setAge] = useState(pet?.age || 1);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({ name, type, breed, age });
  };

  const isEditing = pet !== null;

  return (
    <div className="h-full flex flex-col bg-gray-50">
      <div className="bg-white px-4 py-4 flex items-center gap-4 border-b border-gray-200">
        <button onClick={onBack} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
          <ArrowLeft className="size-6" />
        </button>
        <h2 className="text-lg">{isEditing ? 'Pet Profile' : 'Add New Pet'}</h2>
      </div>

      <div className="flex-1 overflow-y-auto p-6">
        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label htmlFor="name" className="block text-sm mb-2">
              Pet Name
            </label>
            <input
              id="name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-4 py-3 bg-white border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-600"
              placeholder="Enter pet name"
              required
            />
          </div>

          <div>
            <label htmlFor="type" className="block text-sm mb-2">
              Pet Type
            </label>
            <select
              id="type"
              value={type}
              onChange={(e) => setType(e.target.value)}
              className="w-full px-4 py-3 bg-white border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-600"
            >
              <option value="Dog">Dog</option>
              <option value="Cat">Cat</option>
              <option value="Bird">Bird</option>
              <option value="Hamster">Hamster</option>
              <option value="Chicken">Chicken</option>
              <option value="Rabbit">Rabbit</option>
              <option value="Other">Other</option>
            </select>
          </div>

          <div>
            <label htmlFor="breed" className="block text-sm mb-2">
              Breed
            </label>
            <input
              id="breed"
              type="text"
              value={breed}
              onChange={(e) => setBreed(e.target.value)}
              className="w-full px-4 py-3 bg-white border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-600"
              placeholder="Enter breed"
              required
            />
          </div>

          <div>
            <label htmlFor="age" className="block text-sm mb-2">
              Age (years)
            </label>
            <input
              id="age"
              type="number"
              min="0"
              max="50"
              value={age}
              onChange={(e) => setAge(parseInt(e.target.value))}
              className="w-full px-4 py-3 bg-white border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-600"
              required
            />
          </div>

          <button
            type="submit"
            className="w-full px-6 py-4 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors"
          >
            {isEditing ? 'Save Changes' : 'Add Pet'}
          </button>
        </form>
      </div>
    </div>
  );
}
