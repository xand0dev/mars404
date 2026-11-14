// F5: шкали ресурсів, «Return in N min», сценарій «O₂ −40%» (SPEC §7.4). Числа — лише з reach (BudgetEngine).
import type { ReachabilityResult, ResourceKey, Resources, RoutePlan, Source, Target } from '../../contracts';
import { REACH_WARNINGS, reserveOf } from '../../core';
import { mockLimits, mockLimitsEvidence } from '../../mocks';
import { useMission } from '../../store/useMission';
import { DASH, Gauge, Panel, StatusNote, formatMinutes } from '../../ui';
import './budget.css';

/** Сценарій SPEC §3: O₂ −40% від базових лімітів. */
const O2_SCENARIO_FACTOR = 0.6;

const RESOURCE_NAMES: Record<ResourceKey, string> = { time: 'time', o2: 'O₂', energy: 'energy', dose: 'dose' };

const STATUS_WARNINGS: readonly string[] = Object.values(REACH_WARNINGS);
const HEADLINE_WARNINGS: readonly string[] = [REACH_WARNINGS.buildRoute, REACH_WARNINGS.noPathBack];

const NOT_ASSESSED = `Return in ${DASH} min`;

/** Без обраного місця оцінювати нема що — «—», як у HUD (#9). */
function returnHeadline(reach: ReachabilityResult | null, siteChosen: boolean): string {
  if (!siteChosen || !reach || reach.status === 'invalid') return NOT_ASSESSED;
  if (reach.returnInS === null) {
    if (reach.warnings.includes(REACH_WARNINGS.calculating)) return 'Calculating…';
    return reach.warnings.find((w) => HEADLINE_WARNINGS.includes(w)) ?? NOT_ASSESSED;
  }
  // Дефіцит: N = 0, як у HUD (F7); причину показує статус.
  if (reach.returnInS < 0) return 'Return in 0 min';
  return `Return in ${formatMinutes(reach.returnInS)} min`;
}

function BudgetStatus({ reach }: { reach: ReachabilityResult | null }) {
  if (!reach) return <StatusNote level="pending" live="status">Assessing budget…</StatusNote>;
  if (reach.status === 'invalid') {
    const fields = reach.warnings.map((w) => w.replace(/^invalid: /, '')).join(', ');
    return <StatusNote level="danger" live="alert">Invalid model parameters: {fields}. Return not assessed.</StatusNote>;
  }
  if (reach.deficits.length > 0) {
    // Єдиний alert дефіциту — у HUD (F7-AC2), тут — status, щоб читалка не оголошувала двічі.
    const names = reach.deficits.map((key) => RESOURCE_NAMES[key]).join(', ');
    return <StatusNote level="deficit" live="status">Deficit: {names} — below reserve, change the plan or return.</StatusNote>;
  }
  if (reach.warnings.includes(REACH_WARNINGS.calculating)) return <StatusNote level="pending" live="status">Calculating route…</StatusNote>;
  if (reach.returnInS === null) return <StatusNote level="info" live="status">Return not assessed without a valid route.</StatusNote>;
  if (reach.status === 'incomplete') {
    return <StatusNote level="warn" live="status">Within model — return not fully assessed (dose: no data).</StatusNote>;
  }
  return <StatusNote level="ok" live="status">Within model (estimate, not certified).</StatusNote>;
}

/** Планова витрата лише з чинного плану; інакше шкала без «plan». */
const plannedOf = (plan: RoutePlan | null): Resources | null => (plan?.status === 'ok' ? plan.totals : null);

/** SPEC §7.6: verified — без позначки; mock — «MOCK»; решта чи без джерела — «assumption». */
function LimitEvidence({ resource, source }: { resource: ResourceKey; source: Source | undefined }) {
  if (source?.status === 'verified') return null;
  const text = !source ? 'assumption (no source)' : source.status === 'mock' ? 'MOCK' : `assumption · ${source.title}`;
  return <p className="budget-evidence" data-testid={`limit-evidence-${resource}`}>limit: {text}</p>;
}

const nameOf = (targets: Target[], id: string) => targets.find((t) => t.id === id)?.name ?? id;

export function BudgetPanel() {
  const budget = useMission((s) => s.budget);
  const limits = useMission((s) => s.limits);
  const model = useMission((s) => s.model);
  const reach = useMission((s) => s.reach);
  const region = useMission((s) => s.region);
  const targets = useMission((s) => s.targets);
  const plan = useMission((s) => s.plan);
  const site = useMission((s) => s.site);
  const setLimits = useMission((s) => s.setLimits);

  const baseline = region?.limits ?? mockLimits;
  const o2Scenario = { ...baseline, o2: baseline.o2 * O2_SCENARIO_FACTOR };
  const scenarioOn = limits.o2 === o2Scenario.o2;
  const reserve = reserveOf(limits, model);
  const planned = plannedOf(plan);
  // До завантаження району ліміти — mock-фікстура; після — джерела з region.json.
  const limitsEvidence = region ? region.limitsEvidence : mockLimitsEvidence;
  const gauge = (key: ResourceKey, label: string, unit: string, max: number) => (
    <>
      <Gauge label={label} value={budget[key]} max={max} unit={unit} reserve={reserve[key]} need={planned?.[key] ?? null}
        deficit={reach?.deficits.includes(key) ?? false} />
      <LimitEvidence resource={key} source={limitsEvidence?.[key]} />
    </>
  );
  const notes = (reach?.warnings ?? []).filter((w) => !STATUS_WARNINGS.includes(w) && !w.startsWith('invalid: '));

  return (
    <Panel title="Resources" featureId="F5" owner="Влад" mock={region === null}>
      <p className="budget-return">{returnHeadline(reach, site !== null)}</p>
      <BudgetStatus reach={reach} />
      {gauge('time', 'Time', 's', limits.time)}
      {gauge('o2', 'O₂', 'g', limits.o2)}
      {gauge('energy', 'Energy', 'Wh', limits.energy)}
      {gauge('dose', 'Dose', 'µSv', limits.dose ?? 1)}
      <p className="budget-reserve">Reserve {Math.round(model.reserveFraction * 100)}% of limits kept on every gauge (model).</p>
      <div className="budget-actions">
        <button type="button" aria-pressed={scenarioOn} onClick={() => setLimits(scenarioOn ? baseline : o2Scenario)}>O₂ −40%</button>
        <button type="button" onClick={() => setLimits(baseline)}>Reset</button>
      </div>
      {notes.map((note, k) => (
        <StatusNote key={`${k}-${note}`} level="warn" live="status">{note}</StatusNote>
      ))}
      {reach?.swap && (
        <StatusNote level="info">
          Suggested swap (model cost): {nameOf(targets, reach.swap.dropId)} → {nameOf(targets, reach.swap.addId)}
        </StatusNote>
      )}
      {region === null && <StatusNote level="info">Limits and coefficients: MOCK (SPEC §7.4 reference fixture), not mission data.</StatusNote>}
    </Panel>
  );
}
