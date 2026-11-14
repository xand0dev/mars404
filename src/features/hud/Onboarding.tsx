// Підказка першого візиту: що це за інструмент і 4 кроки демо. Не модальна — не блокує карту й панелі.
import { useEffect } from 'react';
import { STEPS, type PanelStep } from './panelStep';

const HOW: Record<PanelStep, string> = {
  site: 'Choose “Gale / Mount Sharp” in Location (left).',
  targets: 'Add science targets in Science targets (left), e.g. Brantôme and Mont Mercou.',
  route: 'Press “Build route” (bottom of the left column).',
  checklist: 'Check GO / NO-GO on the right, tick the Pre-EVA checklist, then start the EVA.',
};

export interface OnboardingProps {
  step: PanelStep;
  onClose: () => void;
}

export function Onboarding({ step, onClose }: OnboardingProps) {
  const current = STEPS.findIndex((s) => s.id === step);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <section className="onboarding" role="dialog" aria-modal="false" aria-labelledby="onboarding-title">
      <p className="onboarding__eyebrow">How it works</p>
      <h2 id="onboarding-title" className="onboarding__title">
        Plan a walk on Mount Sharp in 4 steps
      </h2>
      <ol className="onboarding__steps">
        {STEPS.map((s, i) => (
          <li key={s.id} className={i < current ? 'is-done' : i === current ? 'is-current' : undefined} aria-current={i === current ? 'step' : undefined}>
            <span className="onboarding__n" aria-hidden="true">
              {i < current ? '✔' : i + 1}
            </span>
            <span>
              <strong>{s.label}.</strong> {HOW[s.id]}
            </span>
          </li>
        ))}
      </ol>
      <p className="onboarding__note">
        The big red number (top right) is how many minutes you can keep going before you must turn back. The highlighted button is your next action.
      </p>
      <button type="button" className="ui-btn--primary onboarding__close" onClick={onClose}>
        Got it
      </button>
    </section>
  );
}
