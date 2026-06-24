import { X } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/react-app/components/ui/dialog';

interface Criterion {
  name: string;
  met: boolean;
}

interface CriteriaModalProps {
  isOpen: boolean;
  onClose: () => void;
  visaType: string;
  criteria: Criterion[];
  met: number;
  total: number;
}

const visaLabels: Record<string, string> = {
  eb2niw: 'EB-2 NIW',
  eb1a: 'EB-1A',
  l1a: 'L-1A',
  o1a: 'O-1A',
};

export function CriteriaModal({ isOpen, onClose, visaType, criteria, met, total }: CriteriaModalProps) {
  const visaLabel = visaLabels[visaType] || visaType.toUpperCase();

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold text-[#1B2541] flex items-center justify-between">
            <span>{visaLabel} - Detalhamento dos Critérios</span>
            <button
              onClick={onClose}
              className="rounded-full p-1 hover:bg-gray-100 transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          </DialogTitle>
        </DialogHeader>

        <div className="mt-4">
          <div className="mb-6 p-4 bg-[#F0EDE8] rounded-lg">
            <div className="text-center">
              <span className="text-4xl font-bold text-[#1B2541]">{met}</span>
              <span className="text-2xl text-gray-400 mx-2">/</span>
              <span className="text-2xl text-gray-600">{total}</span>
              <p className="text-sm text-gray-600 mt-2">critérios atingidos</p>
            </div>
          </div>

          <div className="space-y-3">
            {criteria.map((criterion, index) => (
              <div
                key={index}
                className={`p-4 rounded-lg border-2 transition-all ${
                  criterion.met
                    ? 'bg-green-50 border-green-200'
                    : 'bg-gray-50 border-gray-200'
                }`}
              >
                <div className="flex items-start gap-3">
                  <div className="flex-shrink-0 mt-0.5">
                    {criterion.met ? (
                      <div className="w-6 h-6 rounded-full bg-green-500 flex items-center justify-center">
                        <svg
                          className="w-4 h-4 text-white"
                          fill="none"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth="2"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path d="M5 13l4 4L19 7"></path>
                        </svg>
                      </div>
                    ) : (
                      <div className="w-6 h-6 rounded-full bg-gray-300 flex items-center justify-center">
                        <svg
                          className="w-4 h-4 text-white"
                          fill="none"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth="2"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path d="M6 18L18 6M6 6l12 12"></path>
                        </svg>
                      </div>
                    )}
                  </div>
                  <div className="flex-1">
                    <p
                      className={`font-medium ${
                        criterion.met ? 'text-green-900' : 'text-gray-700'
                      }`}
                    >
                      {criterion.name}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-6 pt-6 border-t border-gray-200">
            <p className="text-sm text-gray-600 italic">
              Esta análise é baseada nas respostas fornecidas pelo lead no questionário.
              Use estas informações para preparar uma abordagem personalizada.
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
