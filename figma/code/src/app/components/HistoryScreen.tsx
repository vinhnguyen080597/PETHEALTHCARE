import { ArrowLeft, Calendar, AlertTriangle, CheckCircle2, AlertCircle } from 'lucide-react';
import { DiagnosisResult, Pet } from '../App';

export type HistoryEntry = {
  id: string;
  petId: string;
  petName: string;
  imageUrl: string;
  result: DiagnosisResult;
  timestamp: Date;
};

type HistoryScreenProps = {
  history: HistoryEntry[];
  pets: Pet[];
  onBack: () => void;
  onSelectEntry: (entry: HistoryEntry) => void;
};

export function HistoryScreen({ history, onBack, onSelectEntry }: HistoryScreenProps) {
  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'Low':
        return 'text-green-600 bg-green-50';
      case 'Medium':
        return 'text-yellow-600 bg-yellow-50';
      case 'High':
        return 'text-red-600 bg-red-50';
      default:
        return 'text-gray-600 bg-gray-50';
    }
  };

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'Low':
        return <CheckCircle2 className="size-4" />;
      case 'Medium':
        return <AlertCircle className="size-4" />;
      case 'High':
        return <AlertTriangle className="size-4" />;
      default:
        return <AlertCircle className="size-4" />;
    }
  };

  const formatDate = (date: Date) => {
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (days === 0) {
      const hours = Math.floor(diff / (1000 * 60 * 60));
      if (hours === 0) {
        const minutes = Math.floor(diff / (1000 * 60));
        return `${minutes} minutes ago`;
      }
      return `${hours} hours ago`;
    }
    if (days === 1) return 'Yesterday';
    if (days < 7) return `${days} days ago`;

    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined
    });
  };

  return (
    <div className="h-full flex flex-col bg-gray-50">
      <div className="bg-white px-4 py-4 flex items-center gap-4 border-b border-gray-200">
        <button onClick={onBack} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
          <ArrowLeft className="size-6" />
        </button>
        <div>
          <h2 className="text-lg">Diagnostic History</h2>
          <p className="text-sm text-gray-600">All previous scans</p>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-6">
        {history.length === 0 ? (
          <div className="text-center py-12">
            <div className="size-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Calendar className="size-10 text-gray-400" />
            </div>
            <p className="text-gray-600 mb-2">No diagnostic history yet</p>
            <p className="text-sm text-gray-500">
              Start scanning your pets to track their health over time
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {history.map((entry) => (
              <button
                key={entry.id}
                onClick={() => onSelectEntry(entry)}
                className="w-full bg-white rounded-xl shadow-sm border border-gray-200 p-4 hover:shadow-md transition-shadow text-left"
              >
                <div className="flex gap-4">
                  <img
                    src={entry.imageUrl}
                    alt="Scan"
                    className="size-20 rounded-lg object-cover flex-shrink-0"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="text-sm">{entry.petName}</h3>
                      <span className="text-xs text-gray-500">
                        {formatDate(entry.timestamp)}
                      </span>
                    </div>
                    <p className="text-sm text-gray-700 mb-2 line-clamp-1">
                      {entry.result.diagnosis}
                    </p>
                    <div className="flex items-center gap-2">
                      <span
                        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs ${getSeverityColor(
                          entry.result.severity
                        )}`}
                      >
                        {getSeverityIcon(entry.result.severity)}
                        {entry.result.severity}
                      </span>
                      <span className="text-xs text-gray-500">
                        {entry.result.confidence}% confidence
                      </span>
                    </div>
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
