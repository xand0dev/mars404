// Стан HUD (F7) — чиста функція зі store. Числа не рахує: N бере з reach (F5, SPEC §5.2, §7.4).
import type { MissionState, Resources, RouteFailure } from '../../contracts';
import { regionKind } from '../../contracts/planning';
import { formatMinutes, type StatusLevel } from '../../ui';

export type HudInput = Pick<MissionState, 'site' | 'region' | 'targets' | 'selectedTargetIds' | 'plan' | 'reach' | 'budget'>;

export type HudKind = 'overview' | 'empty' | 'no-plan' | 'pending' | 'invalid' | 'no-path' | 'deficit' | 'incomplete' | 'estimated';

export interface HudSwap {
  dropId: string;
  addId: string;
  dropName: string;
  addName: string;
}

export interface HudView {
  kind: HudKind;
  level: StatusLevel;
  live: 'status' | 'alert';
  /** N для «Return in N min» або «—» */
  minutes: string;
  message: string;
  next: string;
  mock: boolean;
  swap: HudSwap | null;
  /** Попередження F5 (reach.warnings) — лише для чинної оцінки */
  warnings: string[];
}

const RESOURCE_NAME: Record<keyof Resources, string> = { time: 'time', o2: 'O₂', energy: 'energy', dose: 'dose' };

/**
 * Попередження F5, які HUD уже передає своїм статусом (тексти — `REACH_WARNINGS` у src/core/reachability.ts;
 * F7 не імпортує src/core, тому рядки тут). Решту (ціль поза ореолом, немає шляху назад) показуємо.
 */
const STATUS_WARNINGS = new Set(['return not fully assessed: dose — no data', 'Calculating route…', 'Build route to assess return']);

const NO_TARGETS = 'Select science targets in the Targets panel.';
const GIVE_UP = 'Remove a target or return to base now';

function pointName(i: number, nTargets: number): string {
  if (i === 0) return 'The start';
  if (i === nTargets + 1) return 'The base';
  return `Target ${i}`;
}

function failureText(r: RouteFailure | undefined, nTargets: number): string {
  if (!r) return 'No path within the model.';
  switch (r.code) {
    case 'invalid-params':
      return 'Model parameters are invalid.';
    case 'out-of-grid':
      return `${pointName(r.pointIndex, nTargets)} is outside the map.`;
    case 'blocked-point':
      return `${pointName(r.pointIndex, nTargets)} is on a blocked cell.`;
    case 'disconnected':
      return `${pointName(r.pointIndex, nTargets)} is cut off by blocked terrain.`;
    case 'no-path-leg':
      return `No path for leg ${r.legIndex + 1}.`;
  }
}

export function hudState(s: HudInput): HudView {
  const mock = s.region === null || s.region.status === 'mock';
  const nTargets = s.selectedTargetIds.length;
  const view = (v: Omit<HudView, 'mock' | 'swap' | 'live' | 'minutes' | 'warnings'> & Partial<Pick<HudView, 'live' | 'minutes' | 'swap' | 'warnings'>>): HudView => ({
    live: 'status',
    minutes: '—',
    swap: null,
    warnings: [],
    mock,
    ...v,
  });

  if (s.site === null) {
    return view({ kind: 'empty', level: 'info', message: 'No site selected.', next: 'Choose “Gale / Mount Sharp” in the Location panel.' });
  }

  if (s.region?.id === s.site && regionKind(s.region) === 'overview') {
    return view({
      kind: 'overview',
      level: 'info',
      message: 'Overview — terrain only, no EVA planning here.',
      next: 'Open “Gale / Mount Sharp” or “Columbia Hills (Gusev)” to plan a walk.',
    });
  }

  const { plan, reach } = s;

  if (nTargets > 0 && plan === null) {
    return view({ kind: 'no-plan', level: 'info', message: 'Targets selected, no route yet.', next: 'Press “Build route”.' });
  }
  if (plan?.status === 'pending') {
    return view({ kind: 'pending', level: 'pending', message: 'Calculating…', next: 'Wait for the route to finish.' });
  }
  if (plan?.status === 'invalid') {
    return view({ kind: 'invalid', level: 'danger', message: `Route invalid. ${failureText(plan.reason, nTargets)}`, next: 'Check targets and model parameters.' });
  }
  if (plan?.status === 'no-path') {
    return view({ kind: 'no-path', level: 'danger', message: `No path. ${failureText(plan.reason, nTargets)}`, next: 'Remove or replace a target.' });
  }

  if (reach === null) {
    return nTargets === 0
      ? view({ kind: 'empty', level: 'info', message: 'Return not assessed yet.', next: NO_TARGETS })
      : view({ kind: 'pending', level: 'pending', message: 'Calculating…', next: 'Wait for the return estimate.' });
  }

  const returnInS = reach.returnInS;
  if (reach.status === 'invalid' || (returnInS !== null && Number.isNaN(returnInS))) {
    return view({ kind: 'invalid', level: 'danger', message: 'Return estimate invalid: model parameters are not valid.', next: 'Check the resource scenario.' });
  }

  const swap = resolveSwap(s);
  const minutes = formatMinutes(returnInS);
  const warnings = reach.warnings.filter((w) => !STATUS_WARNINGS.has(w));

  if (reach.deficits.length > 0 || (returnInS !== null && returnInS < 0)) {
    const names = reach.deficits.map((k) => RESOURCE_NAME[k]).join(', ');
    return view({
      kind: 'deficit',
      level: 'deficit',
      live: 'alert',
      minutes: returnInS !== null && returnInS < 0 ? '0' : minutes,
      message: names ? `Deficit: ${names} — plan exceeds budget minus reserve.` : 'Deficit: plan exceeds budget minus reserve.',
      next: swap ? `Replace ${swap.dropName} with ${swap.addName}` : GIVE_UP,
      swap,
      warnings,
    });
  }

  const next = nTargets === 0 ? NO_TARGETS : swap ? `Replace ${swap.dropName} with ${swap.addName}` : `Up to ${minutes} min at stops, then head back.`;
  if (reach.status === 'incomplete') {
    return view({ kind: 'incomplete', level: 'warn', minutes, message: 'Estimate incomplete: dose — no data', next, swap, warnings });
  }
  return view({ kind: 'estimated', level: 'ok', minutes, message: 'Within model', next, swap, warnings });
}

function resolveSwap(s: HudInput): HudSwap | null {
  const sw = s.reach?.swap;
  if (!sw) return null;
  const name = (id: string) => s.targets.find((t) => t.id === id)?.name;
  const dropName = name(sw.dropId);
  const addName = name(sw.addId);
  if (!dropName || !addName) return null;
  return { ...sw, dropName, addName };
}
