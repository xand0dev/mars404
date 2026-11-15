// EVA-символіка (F7, SPEC §7.11): типи знаків і їхні назви. Форма — тип, заливка / контур / пунктир — стан.
export const EVA_SIGN_KINDS = ['base', 'target', 'hazard', 'nodata', 'astronaut', 'ponr', 'photo'] as const;
export type EvaSignKind = (typeof EVA_SIGN_KINDS)[number];

/** Стан наукової цілі: обрана — заливка, необрана — контур, поза ореолом — пунктир і «!». */
export type EvaTargetState = 'selected' | 'unselected' | 'outside';
/** Рівень небезпеки: high — заливка, low — контур (текст поруч дає деталі). */
export type EvaHazardLevel = 'high' | 'low';

const TARGET_LABEL: Record<EvaTargetState, string> = {
  selected: 'Science target, selected',
  unselected: 'Science target, not selected',
  outside: 'Science target, outside reachable area',
};
const HAZARD_LABEL: Record<EvaHazardLevel, string> = { high: 'Hazard, high', low: 'Hazard, low' };
const LABEL: Record<Exclude<EvaSignKind, 'target' | 'hazard'>, string> = {
  base: 'Base',
  nodata: 'No data',
  astronaut: 'Astronaut',
  ponr: 'Point of no return',
  photo: 'Navcam photo',
};

/** Доступна назва знака (інтерфейс англійською, SPEC §7.7). */
export function evaSignLabel(kind: EvaSignKind, state: EvaTargetState = 'unselected', level: EvaHazardLevel = 'high'): string {
  if (kind === 'target') return TARGET_LABEL[state];
  if (kind === 'hazard') return HAZARD_LABEL[level];
  return LABEL[kind];
}

/** Повний набір для легенди: кожен тип і кожен стан. */
export const EVA_LEGEND_ITEMS: readonly { kind: EvaSignKind; state?: EvaTargetState; level?: EvaHazardLevel }[] = [
  { kind: 'base' },
  { kind: 'target', state: 'selected' },
  { kind: 'target', state: 'unselected' },
  { kind: 'target', state: 'outside' },
  { kind: 'hazard', level: 'high' },
  { kind: 'hazard', level: 'low' },
  { kind: 'nodata' },
  { kind: 'astronaut' },
  { kind: 'ponr' },
  { kind: 'photo' },
];
