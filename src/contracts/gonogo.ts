// GO / NO-GO перед виходом і під час нього (SPEC §7.10). Чиста функція: читає стан store, нічого не пише.
// Рахує лише вердикт з уже порахованих F4/F5 результатів; власних чисел маршруту чи бюджету не вводить.
import type { MissionData, ResourceKey } from './index';
import { validateGrid, xyToCell } from './planning';

export type StationId = 'RTE' | 'LSS' | 'RTN' | 'SCI' | 'ABT' | 'DAT' | 'RAD' | 'MDL' | 'EQP';
export type Call = 'go' | 'caution' | 'nogo' | 'hold';

export type Fix =
  | { kind: 'choose-site' }
  | { kind: 'select-targets' }
  | { kind: 'build-route' }
  | { kind: 'replace-target'; dropId: string; addId: string }
  | { kind: 'remove-target'; targetId: string }
  | { kind: 'return-now' }
  | { kind: 'open-checklist' };

export interface StationCall {
  id: StationId;
  call: Call;
  /** Коротко англійською для HUD (інтерфейс англійською, SPEC §7.7). */
  reason: string;
  fix?: Fix;
}

export interface GoNoGo {
  verdict: Call;
  /** Вихід уже триває (time > 0): NO-GO означає «повертайтеся зараз». */
  during: boolean;
  stations: StationCall[];
}

/** Поріг застереження для «Return in»: менше 15 хв запасу — CAUTION. Припущення (SPEC §7.10). */
export const RETURN_CAUTION_S = 15 * 60;

export const STATION_ORDER: readonly StationId[] = ['RTE', 'LSS', 'RTN', 'SCI', 'ABT', 'DAT', 'RAD', 'MDL', 'EQP'];

export type GoNoGoInput = Pick<
  MissionData,
  'site' | 'targets' | 'selectedTargetIds' | 'grid' | 'region' | 'model' | 'limits' | 'plan' | 'reach' | 'time' | 'checklist'
>;

const RES_NAME: Record<ResourceKey, string> = { time: 'time', o2: 'O₂', energy: 'energy', dose: 'dose' };
const minutes = (s: number) => Math.floor(s / 60);

export function evaluateGoNoGo(s: GoNoGoInput): GoNoGo {
  const during = Number.isFinite(s.time) && s.time > 0;
  const hold = (id: StationId, reason: string, fix?: Fix): StationCall => ({ id, call: 'hold', reason, ...(fix ? { fix } : {}) });

  if (s.site === null) {
    return { verdict: 'hold', during, stations: STATION_ORDER.map((id) => hold(id, 'No site selected', { kind: 'choose-site' })) };
  }

  const selected = s.targets.filter((t) => s.selectedTargetIds.includes(t.id));
  const plan = s.plan;
  const reach = s.reach;
  const stations: StationCall[] = [];

  // RTE — маршрут (F4)
  if (selected.length === 0) stations.push(hold('RTE', 'No targets selected', { kind: 'select-targets' }));
  else if (!plan) stations.push(hold('RTE', 'Route not built', { kind: 'build-route' }));
  else if (plan.status === 'pending') stations.push(hold('RTE', 'Calculating route…'));
  else if (plan.status === 'ok') stations.push({ id: 'RTE', call: 'go', reason: 'Route avoids blocked and NoData cells' });
  else stations.push({ id: 'RTE', call: 'nogo', reason: `No route: ${plan.reason?.code ?? plan.status}`, fix: { kind: 'build-route' } });

  const planOk = plan?.status === 'ok';
  const waitReason = planOk ? 'Waiting for return estimate' : 'Waiting for route';

  // LSS — ресурси (F5)
  if (!planOk || !reach) stations.push(hold('LSS', waitReason));
  else if (reach.deficits.length > 0) {
    const fix: Fix | undefined = reach.swap
      ? { kind: 'replace-target', ...reach.swap }
      : selected.length > 0
        ? { kind: 'remove-target', targetId: selected[selected.length - 1]!.id }
        : undefined;
    stations.push({ id: 'LSS', call: 'nogo', reason: `Deficit: ${reach.deficits.map((k) => RES_NAME[k]).join(', ')}`, ...(fix ? { fix } : {}) });
  } else stations.push({ id: 'LSS', call: 'go', reason: 'All known resources within budget and reserve' });

  // RTN — повернення з резервом (F5, §7.4)
  if (!planOk || !reach) stations.push(hold('RTN', waitReason));
  else if (reach.returnInS === null || !Number.isFinite(reach.returnInS)) stations.push(hold('RTN', 'Return not assessed'));
  else if (reach.returnInS < 0) stations.push({ id: 'RTN', call: 'nogo', reason: 'Reserve already used', fix: { kind: 'return-now' } });
  else if (reach.returnInS < RETURN_CAUTION_S) stations.push({ id: 'RTN', call: 'caution', reason: `Return in ${minutes(reach.returnInS)} min — under 15 min margin` });
  else stations.push({ id: 'RTN', call: 'go', reason: `Return in ${minutes(reach.returnInS)} min` });

  // SCI — обрані цілі в ореолі (F5 mask + F6)
  if (!planOk || !reach) stations.push(hold('SCI', waitReason));
  else if (reach.mask.length !== s.grid.width * s.grid.height) stations.push(hold('SCI', 'Reach mask does not match grid'));
  else {
    const outside = selected.filter((t) => {
      const cell = xyToCell(s.grid, t.coordinates);
      return !cell || reach.mask[cell.index] !== 1;
    });
    if (outside.length === 0) stations.push({ id: 'SCI', call: 'go', reason: `All ${selected.length} targets inside reachable area` });
    else {
      const drop = outside[outside.length - 1]!;
      const fix: Fix = reach.swap && outside.some((t) => t.id === reach.swap!.dropId)
        ? { kind: 'replace-target', ...reach.swap }
        : { kind: 'remove-target', targetId: drop.id };
      stations.push({ id: 'SCI', call: 'nogo', reason: `${outside.map((t) => t.name).join(', ')} outside reachable area`, fix });
    }
  }

  // ABT — Abort map (F5, §7.8)
  if (!planOk || !reach) stations.push(hold('ABT', waitReason));
  else if (!reach.abort) stations.push({ id: 'ABT', call: 'caution', reason: 'Abort map not assessed' });
  else if (reach.abort.pointOfNoReturnS === null) stations.push({ id: 'ABT', call: 'go', reason: 'Return possible along the whole route' });
  else if (reach.abort.pointOfNoReturnS <= 0) stations.push({ id: 'ABT', call: 'nogo', reason: 'No return from the first segment', fix: { kind: 'build-route' } });
  else stations.push({ id: 'ABT', call: 'caution', reason: `Point of no return in ${minutes(reach.abort.pointOfNoReturnS)} min` });

  // DAT — дані рельєфу (F3)
  const gridErrors = validateGrid(s.grid);
  if (gridErrors.length > 0) stations.push({ id: 'DAT', call: 'nogo', reason: `Invalid grid: ${gridErrors[0]}` });
  else if (!s.region) stations.push({ id: 'DAT', call: 'caution', reason: 'Terrain is MOCK' });
  else if (s.region.status !== 'verified') stations.push({ id: 'DAT', call: 'caution', reason: `Terrain status: ${s.region.status}` });
  else stations.push({ id: 'DAT', call: 'go', reason: 'Gale terrain verified' });

  // RAD — радіація
  if (s.model.doseUSvPerS === null || s.limits.dose === null) stations.push({ id: 'RAD', call: 'caution', reason: 'Dose: no data — estimate incomplete' });
  else stations.push({ id: 'RAD', call: 'go', reason: 'Dose rate and limit known' });

  // MDL — коректність моделі (F5)
  if (!planOk || !reach) stations.push(hold('MDL', waitReason));
  else if (reach.status === 'invalid') stations.push({ id: 'MDL', call: 'nogo', reason: 'Model parameters invalid' });
  else if (reach.status === 'incomplete') stations.push({ id: 'MDL', call: 'caution', reason: 'Model incomplete: unknown inputs' });
  else stations.push({ id: 'MDL', call: 'go', reason: 'Model estimate complete' });

  // EQP — чекліст спорядження (F6, §7.13)
  const left = s.checklist.filter((c) => !c.done).length;
  if (s.checklist.length === 0) stations.push({ id: 'EQP', call: 'caution', reason: 'Equipment checklist not prepared', fix: { kind: 'open-checklist' } });
  else if (left > 0) stations.push({ id: 'EQP', call: 'caution', reason: `${left} checklist item${left === 1 ? '' : 's'} not checked`, fix: { kind: 'open-checklist' } });
  else stations.push({ id: 'EQP', call: 'go', reason: `All ${s.checklist.length} checklist items checked` });

  return { verdict: verdictOf(stations), during, stations };
}

/** Найгірший виклик визначає вердикт: HOLD > NO-GO > CAUTION > GO. */
export function verdictOf(stations: StationCall[]): Call {
  if (stations.some((x) => x.call === 'hold')) return 'hold';
  if (stations.some((x) => x.call === 'nogo')) return 'nogo';
  if (stations.some((x) => x.call === 'caution')) return 'caution';
  return 'go';
}
