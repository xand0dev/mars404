// T24: які панелі відкриті за замовчуванням — ті, що потрібні для наступного кроку демо (SPEC §3).
// Лише читає store; назви — заголовки панелей у колонках Shell (App.tsx).
import type { MissionState } from '../../contracts';

export type PanelStep = 'site' | 'targets' | 'route' | 'checklist';

/** Кроки демо для шапки: що робить людина зараз. */
export const STEPS: { id: PanelStep; label: string }[] = [
  { id: 'site', label: 'Location' },
  { id: 'targets', label: 'Targets' },
  { id: 'route', label: 'Route' },
  { id: 'checklist', label: 'Checklist' },
];

/** Resources — стан ресурсів, відкритий завжди; решта — за кроком. */
export const STEP_PANELS: Record<PanelStep, string[]> = {
  site: ['Location', 'Resources'],
  targets: ['Science targets', 'Resources'],
  route: ['Science targets', 'Route', 'Resources'],
  checklist: ['Route', 'Resources', 'Pre-EVA checklist'],
};

/** Сумісність: головна панель кроку. */
export const STEP_PANEL: Record<PanelStep, string> = {
  site: 'Location',
  targets: 'Science targets',
  route: 'Route',
  checklist: 'Pre-EVA checklist',
};

export function panelStep(s: Pick<MissionState, 'site' | 'plan' | 'selectedTargetIds'>): PanelStep {
  if (s.site === null) return 'site';
  if (s.selectedTargetIds.length === 0) return 'targets';
  if (s.plan?.status !== 'ok') return 'route';
  return 'checklist';
}

/** Ручний вибір живе, доки не зміниться крок; потім знову відкриті панелі кроку. */
export interface PanelOverrides {
  step: PanelStep;
  open: Record<string, boolean>;
}

export function isPanelOpen(step: PanelStep, ov: PanelOverrides, title: string): boolean {
  const manual = ov.step === step ? ov.open[title] : undefined;
  return manual ?? STEP_PANELS[step].includes(title);
}

export function togglePanel(step: PanelStep, ov: PanelOverrides, title: string): PanelOverrides {
  const open = ov.step === step ? ov.open : {};
  return { step, open: { ...open, [title]: !isPanelOpen(step, ov, title) } };
}
