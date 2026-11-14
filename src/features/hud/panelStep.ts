// T24: яка панель правої колонки відкрита за замовчуванням — та, що потрібна для наступного кроку демо (SPEC §3).
// Лише читає store; назви — заголовки панелей у правій колонці (App.tsx).
import type { MissionState } from '../../contracts';

export type PanelStep = 'site' | 'targets' | 'checklist';

export const STEP_PANEL: Record<PanelStep, string> = {
  site: 'Location',
  targets: 'Science targets',
  checklist: 'Pre-EVA checklist',
};

export function panelStep(s: Pick<MissionState, 'site' | 'plan'>): PanelStep {
  if (s.site === null) return 'site';
  if (s.plan?.status !== 'ok') return 'targets';
  return 'checklist';
}

/** Ручний вибір живе, доки не зміниться крок; потім знову відкрита панель кроку. */
export interface PanelOverrides {
  step: PanelStep;
  open: Record<string, boolean>;
}

export function isPanelOpen(step: PanelStep, ov: PanelOverrides, title: string): boolean {
  const manual = ov.step === step ? ov.open[title] : undefined;
  return manual ?? title === STEP_PANEL[step];
}

export function togglePanel(step: PanelStep, ov: PanelOverrides, title: string): PanelOverrides {
  const open = ov.step === step ? ov.open : {};
  return { step, open: { ...open, [title]: !isPanelOpen(step, ov, title) } };
}
