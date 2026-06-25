interface OnboardingStep {
  key: string;
  label: string;
  description: string;
  done: boolean;
}

interface OnboardingChecklistProps {
  completedCount: number;
  totalCount: number;
  steps: OnboardingStep[];
  tenantName: string;
  onDismiss: () => void;
}

export function OnboardingChecklist({ completedCount, totalCount, steps, tenantName, onDismiss }: OnboardingChecklistProps) {
  const pct = Math.round((completedCount / totalCount) * 100);

  return (
    <div className="max-w-2xl mx-auto">
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
        {/* Header */}
        <div className="bg-gradient-to-r from-[#1B2541] to-[#2A3A5C] px-6 py-5">
          <div className="flex items-start justify-between">
            <div>
              <h2 className="text-white font-semibold text-lg">Configuração do {tenantName}</h2>
              <p className="text-blue-200 text-sm mt-0.5">{completedCount} de {totalCount} etapas concluídas</p>
            </div>
            <button
              onClick={onDismiss}
              className="text-blue-300 hover:text-white text-xs transition-colors mt-0.5"
            >
              Ver leads →
            </button>
          </div>
          {/* Progress bar */}
          <div className="mt-4 h-1.5 bg-white/20 rounded-full overflow-hidden">
            <div
              className="h-full bg-[#D4A847] rounded-full transition-all duration-500"
              style={{ width: `${pct}%` }}
            />
          </div>
        </div>

        {/* Steps */}
        <div className="divide-y divide-gray-100">
          {steps.map((step) => (
            <div key={step.key} className={`flex items-start gap-4 px-6 py-4 ${step.done ? 'opacity-60' : ''}`}>
              <div className={`mt-0.5 w-5 h-5 rounded-full flex-shrink-0 flex items-center justify-center text-xs font-bold ${step.done ? 'bg-green-100 text-green-600' : 'bg-gray-100 text-gray-400'}`}>
                {step.done ? '✓' : '○'}
              </div>
              <div>
                <p className={`text-sm font-medium ${step.done ? 'line-through text-gray-400' : 'text-gray-800'}`}>
                  {step.label}
                </p>
                {!step.done && (
                  <p className="text-xs text-gray-500 mt-0.5">{step.description}</p>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-gray-50 border-t border-gray-100">
          <p className="text-xs text-gray-400">
            Configure os itens acima no painel Super Admin ou entre em contato com a Unlocked.
          </p>
        </div>
      </div>
    </div>
  );
}
