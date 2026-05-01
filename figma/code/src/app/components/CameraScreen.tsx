import { useState, useRef } from 'react';
import { ArrowLeft, Camera, Upload, Loader2 } from 'lucide-react';
import { Pet } from '../App';

type CameraScreenProps = {
  pet: Pet;
  onCapture: (imageUrl: string) => void;
  onBack: () => void;
};

export function CameraScreen({ pet, onCapture, onBack }: CameraScreenProps) {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const imageUrl = e.target?.result as string;
        setPreviewImage(imageUrl);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleAnalyze = () => {
    if (previewImage) {
      setIsAnalyzing(true);
      onCapture(previewImage);
    }
  };

  return (
    <div className="h-full flex flex-col bg-gray-900">
      <div className="bg-black/50 px-4 py-4 flex items-center gap-4 text-white">
        <button onClick={onBack} className="p-2 hover:bg-white/10 rounded-lg transition-colors">
          <ArrowLeft className="size-6" />
        </button>
        <div>
          <h2 className="text-lg">Analyze {pet.name}</h2>
          <p className="text-sm text-gray-300">Capture or upload a photo</p>
        </div>
      </div>

      <div className="flex-1 flex items-center justify-center p-6">
        {previewImage ? (
          <div className="w-full max-w-md">
            <img src={previewImage} alt="Preview" className="w-full rounded-xl shadow-2xl" />
          </div>
        ) : (
          <div className="text-center">
            <div className="size-32 bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-6">
              <Camera className="size-16 text-gray-400" />
            </div>
            <p className="text-white mb-8">Upload a photo of your pet</p>
          </div>
        )}
      </div>

      <div className="p-6 bg-black/50 space-y-3">
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleFileSelect}
          className="hidden"
        />

        {!previewImage ? (
          <>
            <button
              onClick={() => fileInputRef.current?.click()}
              className="w-full flex items-center justify-center gap-3 px-6 py-4 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors"
            >
              <Camera className="size-5" />
              Take Photo
            </button>
            <button
              onClick={() => fileInputRef.current?.click()}
              className="w-full flex items-center justify-center gap-3 px-6 py-4 bg-white/10 text-white rounded-xl hover:bg-white/20 transition-colors"
            >
              <Upload className="size-5" />
              Upload from Gallery
            </button>
          </>
        ) : (
          <div className="space-y-3">
            <button
              onClick={handleAnalyze}
              disabled={isAnalyzing}
              className="w-full flex items-center justify-center gap-3 px-6 py-4 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isAnalyzing ? (
                <>
                  <Loader2 className="size-5 animate-spin" />
                  Analyzing...
                </>
              ) : (
                <>
                  <Camera className="size-5" />
                  Analyze Image
                </>
              )}
            </button>
            <button
              onClick={() => setPreviewImage(null)}
              disabled={isAnalyzing}
              className="w-full px-6 py-4 bg-white/10 text-white rounded-xl hover:bg-white/20 transition-colors disabled:opacity-50"
            >
              Retake Photo
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
