import type { ChecklistItem, RoutePlan, SurfacePhoto, Target } from '../../contracts';

const LONG_ROUTE_S = 20 * 60;
const STEEP_SLOPE_DEG = 20;

interface ChecklistInput {
  plan: RoutePlan | null;
  targets: readonly Target[];
  selectedTargetIds: readonly string[];
  photos: readonly SurfacePhoto[];
  previous: readonly ChecklistItem[];
}

export function buildChecklist({ plan, targets, selectedTargetIds, photos, previous }: ChecklistInput): ChecklistItem[] {
  if (plan?.status !== 'ok') return [];
  const done = new Map(previous.map((item) => [item.id, item.done]));
  const item = (id: string, label: string, reason: string): ChecklistItem => ({ id, label, reason, done: done.get(id) ?? false });
  const items: ChecklistItem[] = [];

  if (plan.totals.time > LONG_ROUTE_S) {
    items.push(item('spare-o2', 'Spare O₂ cartridge', `Route duration ${Math.ceil(plan.totals.time / 60)} min exceeds 20 min (assumption).`));
  }

  const maxSlope = Math.max(0, ...plan.segments.map((segment) => Math.abs(segment.slope)));
  if (maxSlope >= STEEP_SLOPE_DEG) {
    items.push(item('tether', 'Tether / rope', `Route includes slope ${Math.round(maxSlope)}° ≥ 20° (assumption).`));
  }

  if (selectedTargetIds.length > 0) {
    items.push(item('sample-bags', `Sample bags ×${selectedTargetIds.length}`, `${selectedTargetIds.length} science targets selected.`));
  }

  const selected = targets.filter((target) => selectedTargetIds.includes(target.id));
  if (photos.length > 0 || selected.some((target) => target.photo !== null)) {
    items.push(item('camera', 'Camera', 'Selected target or surface photo includes a camera view.'));
  }

  items.push(
    item('tablet-battery', 'Tablet battery ≥ 80 %', 'Required before every EVA (§7.13).'),
    item('suit-sensors', 'Suit sensors self-test', 'Required before every EVA (§7.13).'),
    item('radio-check', 'Radio check with base', 'Required before every EVA (§7.13).'),
  );

  return items;
}
