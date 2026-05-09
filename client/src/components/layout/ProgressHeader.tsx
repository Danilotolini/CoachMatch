interface ProgressHeaderProps {
  currentStep: number
  totalSteps: number
  title?: string
}

export function ProgressHeader({
  currentStep,
  totalSteps,
  title = 'CoachMatch Pro',
}: ProgressHeaderProps) {
  const progress = Math.round((currentStep / totalSteps) * 100)

  return (
    <div className="sticky top-0 z-50 glass-header px-6">
      <div className="flex items-center justify-between py-3 max-w-2xl mx-auto">
        <span className="font-headline text-xs font-semibold text-on-surface-variant uppercase tracking-widest">
          {title}
        </span>
        <span className="font-body text-xs text-on-surface-variant">
          Etapa <span className="text-primary font-bold">{currentStep}</span> de {totalSteps}
        </span>
      </div>
      <div className="max-w-2xl mx-auto h-0.5 bg-surface-container-highest rounded-full overflow-hidden">
        <div
          className="h-full bg-linear-to-r from-primary to-primary-dim rounded-full transition-all duration-700"
          style={{ width: `${String(progress)}%` }}
        />
      </div>
    </div>
  )
}
