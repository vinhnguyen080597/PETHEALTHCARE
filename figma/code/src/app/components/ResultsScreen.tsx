import { ArrowLeft, AlertTriangle, CheckCircle2, AlertCircle } from 'lucide-react';
import { Pet, DiagnosisResult } from '../App';

type ResultsScreenProps = {
  result: DiagnosisResult;
  pet: Pet;
  imageUrl: string;
  onBack: () => void;
};

export function ResultsScreen({ result, pet, imageUrl, onBack }: ResultsScreenProps) {
  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'Low':
        return 'text-green-600 bg-green-50 border-green-200';
      case 'Medium':
        return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      case 'High':
        return 'text-red-600 bg-red-50 border-red-200';
      default:
        return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'Low':
        return <CheckCircle2 className="size-6" />;
      case 'Medium':
        return <AlertCircle className="size-6" />;
      case 'High':
        return <AlertTriangle className="size-6" />;
      default:
        return <AlertCircle className="size-6" />;
    }
  };

  return (
    <div className="h-full flex flex-col bg-gray-50">
      <div className="bg-white px-4 py-4 flex items-center gap-4 border-b border-gray-200">
        <button onClick={onBack} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
          <ArrowLeft className="size-6" />
        </button>
        <div>
          <h2 className="text-lg">Analysis Results</h2>
          <p className="text-sm text-gray-600">{pet.name}</p>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        <div className="p-6 space-y-6">
          <div className="bg-white rounded-xl overflow-hidden shadow-sm border border-gray-200">
            <img src={imageUrl} alt="Analysis" className="w-full h-48 object-cover" />
          </div>

          <div className={`p-4 rounded-xl border-2 ${getSeverityColor(result.severity)}`}>
            <div className="flex items-center gap-3 mb-2">
              {getSeverityIcon(result.severity)}
              <div>
                <h3 className="text-lg">{result.diagnosis}</h3>
                <p className="text-sm opacity-75">Severity: {result.severity}</p>
              </div>
            </div>
            <div className="mt-3">
              <div className="text-sm opacity-75 mb-1">Confidence Score</div>
              <div className="flex items-center gap-3">
                <div className="flex-1 h-2 bg-white/50 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-current"
                    style={{ width: `${result.confidence}%` }}
                  />
                </div>
                <span>{result.confidence}%</span>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-200">
            <h4 className="mb-3">Identified Symptoms</h4>
            <ul className="space-y-2">
              {result.symptoms.map((symptom, index) => (
                <li key={index} className="flex items-start gap-2">
                  <span className="size-1.5 bg-blue-600 rounded-full mt-2 flex-shrink-0" />
                  <span className="text-sm text-gray-700">{symptom}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-200">
            <h4 className="mb-3">Recommended Treatment</h4>
            <p className="text-sm text-gray-700 leading-relaxed">{result.treatment}</p>
          </div>

          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
            <div className="flex items-start gap-3">
              <AlertTriangle className="size-5 text-amber-600 flex-shrink-0 mt-0.5" />
              <div>
                <h4 className="text-sm text-amber-900 mb-1">Important Disclaimer</h4>
                <p className="text-xs text-amber-800 leading-relaxed">{result.disclaimer}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="p-6 bg-white border-t border-gray-200">
        <button
          onClick={onBack}
          className="w-full px-6 py-4 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors"
        >
          Back to Home
        </button>
      </div>
    </div>
  );
}
