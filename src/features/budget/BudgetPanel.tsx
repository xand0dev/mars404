// F5: шкали ресурсів, «Return in N min», сценарій «O₂ −40%» (SPEC §7.4). Числа — лише з reach (BudgetEngine).
import type { ReachabilityResult, ResourceKey, Resources, Target } from '../../contracts';
import { REACH_WARNINGS, reserveOf } from '../../core';
import { mockLimits } from '../../mocks';
import { useMission } from '../../store/useMission';
import { Gauge, Panel, StatusNote } from '../../ui';
import './budget.css';

/** Сценарій SPEC §3: O₂ −40% від базових лімітів. */
const O2_SCENARIO_FACTOR = 0.6;

const RESOURCE_NAMES: Record<ResourceKey, string> = { time: 'time', o2: 'O₂', energy: 'energy', dose: 'dose' };

const STATUS_WARNINGS: readonly string[] = Object.values(REACH_WARNINGS);
const HEADLINE_WARNINGS: readonly string[] = [REACH_WARNINGS.buildRoute, REACH_WARNINGS.noPathBack];

function returnHeadline(reach: ReachabilityResult | null): string {
  if (!reach || reach.status === 'invalid') return 'Return in — min';
  if (reach.returnInS === null) {
    if (reach.warnings.includes(REACH_WARNINGS.calculating)) return 'Calculating…';
    return reach.warnings.find((w) => HEADLINE_WARNINGS.includes(w)) ?? 'Return in — min';
  }
  if (reach.returnInS < 0) return 'Return now';
  return `Return in ${Math.floor(reach.returnInS / 60)} min`;
}

function BudgetStatus({ reach }: { reach: ReachabilityResult | null }) {
  if (!reach) return <StatusNote level="info" live="status">Assessing budget…</StatusNote>;
  if (reach.status === 'invalid') {
    const fields = reach.warnings.map((w) => w.replace(/^invalid: /, '')).join(', ');
    return <StatusNote level="danger" live="alert">Invalid model parameters: {fields}. Return not assessed.</StatusNote>;
  }
  if (reach.deficits.length > 0) {
    // Єдиний alert дефіциту — у HUD (F7-AC2), тут — status, щоб читалка не оголошувала двічі.
    const names = reach.deficits.map((key) => RESOURCE_NAMES[key]).join(', ');
    return <StatusNote level="danger" live="status">Deficit: {names} — below reserve, change the plan or return.</StatusNote>;
  }
  if (reach.returnInS === null) return <StatusNote level="info" live="status">Return not assessed without a valid route.</StatusNote>;
  if (reach.status === 'incomplete') {
    return <StatusNote level="warn" live="status">Within model — return not fully assessed (dose: no data).</StatusNote>;
  }
  return <StatusNote level="ok" live="status">Within model (estimate, not certified).</StatusNote>;
}

const formatReserve = (r: Resources) =>
  `${Math.round(r.time)} s · ${Math.round(r.o2)} g O₂ · ${Math.round(r.energy)} Wh · dose ${r.dose === null ? 'no data' : `${Math.round(r.dose)} µSv`}`;

const nameOf = (targets: Target[], id: string) => targets.find((t) => t.id === id)?.name ?? id;

export function BudgetPanel() {
  const budget = useMission((s) => s.budget);
  const limits = useMission((s) => s.limits);
  const model = useMission((s) => s.model);
  const reach = useMission((s) => s.reach);
  const region = useMission((s) => s.region);
  const targets = useMission((s) => s.targets);
  const setLimits = useMission((s) => s.setLimits);

  const baseline = region?.limits ?? mockLimits;
  const o2Scenario = { ...baseline, o2: baseline.o2 * O2_SCENARIO_FACTOR };
  const scenarioOn = limits.o2 === o2Scenario.o2;
  const notes = (reach?.warnings ?? []).filter((w) => !STATUS_WARNINGS.includes(w) && !w.startsWith('invalid: '));

  return (
    <Panel title="Resources" featureId="F5" owner="Влад" mock={region === null}>
      <p className="budget-return">{returnHeadline(reach)}</p>
      <BudgetStatus reach={reach} />
      <Gauge label="Time" value={budget.time} max={limits.time} unit="s" />
      <Gauge label="O₂" value={budget.o2} max={limits.o2} unit="g" />
      <Gauge label="Energy" value={budget.energy} max={limits.energy} unit="Wh" />
      <Gauge label="Dose" value={budget.dose} max={limits.dose ?? 1} unit="µSv" />
      <p className="budget-reserve">Reserve {Math.round(model.reserveFraction * 100)}% kept: {formatReserve(reserveOf(limits, model))}</p>
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
