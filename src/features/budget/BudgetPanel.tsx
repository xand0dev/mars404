// F5 «Life support»: «Return in N min» зі статусом словом, що обмежує, шкали ресурсів, «What if» (SPEC §7.4). Числа — з reach (BudgetEngine).
import type { ReachabilityResult, ResourceKey, Resources, RoutePlan, Source, Target } from '../../contracts';
import { estimateReturn, REACH_WARNINGS, reserveOf } from '../../core';
import { mockLimits, mockLimitsEvidence } from '../../mocks';
import { useMission } from '../../store/useMission';
import { DASH, Disclosure, Gauge, Panel, StatusNote, formatMinutes } from '../../ui';
import { LifeDock, type ResourceRow } from './LifeDock';
import './budget.css';

/** Сценарій SPEC §3: O₂ −40% від базових лімітів. */
const O2_SCENARIO_FACTOR = 0.6;

const RESOURCE_NAMES: Record<ResourceKey, string> = { time: 'time', o2: 'O₂', energy: 'energy', dose: 'dose' };

const STATUS_WARNINGS: readonly string[] = Object.values(REACH_WARNINGS);
const HEADLINE_WARNINGS: readonly string[] = [REACH_WARNINGS.buildRoute, REACH_WARNINGS.noPathBack];

const NOT_ASSESSED = `Return in ${DASH} min`;

/** Поріг CAUTION для «Return in» у GO / NO-GO (SPEC §7.10). */
const LOW_MARGIN_S = 15 * 60;

type LifeTone = 'ok' | 'warn' | 'danger' | 'info';

/** Одне слово для екіпажу: чи в межах моделі, мало запасу, повертатися, не оцінено. */
function lifeStatus(reach: ReachabilityResult | null, siteChosen: boolean): { word: string; tone: LifeTone } {
  if (siteChosen && !reach) return { word: 'ASSESSING', tone: 'info' };
  if (!siteChosen || !reach || reach.status === 'invalid' || (reach.returnInS === null && reach.deficits.length === 0)) return { word: 'NOT ASSESSED', tone: 'info' };
  if (reach.deficits.length > 0 || reach.returnInS! < 0) return { word: 'RETURN NOW', tone: 'danger' };
  if (reach.returnInS! < LOW_MARGIN_S) return { word: 'LOW MARGIN', tone: 'warn' };
  return { word: 'WITHIN MODEL', tone: 'ok' };
}

/** Стан окремого ресурсу словом; колір лише доповнює (SPEC §7.7). */
function resourceStatus(key: ResourceKey, value: number | null, reach: ReachabilityResult | null): { word: string; tone: LifeTone } {
  if (reach?.deficits.includes(key)) return { word: 'DEFICIT', tone: 'danger' };
  if (value === null || !Number.isFinite(value)) return { word: 'NO DATA', tone: 'warn' };
  return { word: 'OK', tone: 'ok' };
}

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

/** Одиниці для людей у шторці: час — хвилини, решта — як на шкалах. */
const DOCK_UNITS: Record<ResourceKey, { label: string; format: (value: number) => string }> = {
  time: { label: 'Time', format: (s) => `${Math.floor(s / 60)} min` },
  o2: { label: 'O₂', format: (g) => `${Math.round(g)} g` },
  energy: { label: 'Energy', format: (wh) => `${Math.round(wh)} Wh` },
  dose: { label: 'Dose', format: (usv) => `${Math.round(usv)} µSv` },
};

/** Рядки шторки: є зараз, візьме маршрут, лишиться після нього; смуга — частки ліміту. */
function resourceRows(budget: Resources, limits: Resources, reserve: Resources, planned: Resources | null, reach: ReachabilityResult | null): ResourceRow[] {
  return (['o2', 'time', 'energy', 'dose'] as const).map((key) => {
    const { label, format } = DOCK_UNITS[key];
    const now = budget[key];
    const limit = limits[key];
    const route = planned?.[key] ?? null;
    const known = now !== null && Number.isFinite(now);
    const ratio = (value: number) => (limit && limit > 0 ? Math.min(1, Math.max(0, value / limit)) : 0);
    return {
      key,
      label,
      now: known ? format(now) : null,
      route: known && route !== null ? format(route) : null,
      after: known && route !== null ? format(now - route) : null,
      status: resourceStatus(key, now, reach),
      bar: known && limit ? { now: ratio(now), route: ratio(route ?? 0), reserve: ratio(reserve[key] ?? 0) } : null,
    };
  });
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
  const gauge = (key: ResourceKey, label: string, unit: string, max: number) => {
    const state = resourceStatus(key, budget[key], reach);
    return (
      <div className="life-resource" data-resource={key}>
        <div className="life-resource__row">
          <Gauge label={label} value={budget[key]} max={max} unit={unit} reserve={key === 'dose' ? null : reserve[key]} need={planned?.[key] ?? null}
            deficit={reach?.deficits.includes(key) ?? false} />
          <span className={`life-word life-word--${state.tone}`} data-testid={`resource-status-${key}`}>{state.word}</span>
        </div>
      </div>
    );
  };
  const status = lifeStatus(reach, site !== null);
  // Що закінчиться першим — лише для чинного плану, тим самим правилом, що й «Return in».
  const limitedBy = planned && reach && reach.status !== 'invalid' ? estimateReturn({ budget, reserve, model, planned }).limitedBy : null;
  const notes = (reach?.warnings ?? []).filter((w) => !STATUS_WARNINGS.includes(w) && !w.startsWith('invalid: '));

  return (
    <Panel title="Resources" featureId="F5" owner="Влад" mock={region === null}>
      <div className={`life-hero life-hero--${status.tone}`}>
        <p className="life-label">Life support</p>
        <p className="budget-return">{returnHeadline(reach, site !== null)}</p>
        <p className={`life-word life-word--${status.tone} life-hero__status`} data-testid="life-support-status">{status.word}</p>
        {limitedBy && <p className="life-limited">limited by: {RESOURCE_NAMES[limitedBy]}</p>}
      </div>
      <BudgetStatus reach={reach} />
      {gauge('time', 'Time', 's', limits.time)}
      {gauge('o2', 'O₂', 'g', limits.o2)}
      {gauge('energy', 'Energy', 'Wh', limits.energy)}
      {gauge('dose', 'Dose', 'µSv', limits.dose ?? 1)}
      <Disclosure summary="Sources of limits">
        {(['time', 'o2', 'energy', 'dose'] as const).map((key) => (
          <LimitEvidence key={key} resource={key} source={limitsEvidence?.[key]} />
        ))}
        <p className="budget-reserve">Reserve {Math.round(model.reserveFraction * 100)}% of limits kept on every gauge (model).</p>
      </Disclosure>
      <div className="budget-actions" role="group" aria-label="What if">
        <span className="life-label">What if:</span>
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
      {site !== null && (
        <LifeDock headline={returnHeadline(reach, true)} status={status} limitedBy={limitedBy ? { key: limitedBy, label: RESOURCE_NAMES[limitedBy] } : null}
          scenarioOn={scenarioOn} onScenario={() => setLimits(scenarioOn ? baseline : o2Scenario)} onReset={() => setLimits(baseline)}
          rows={resourceRows(budget, limits, reserve, planned, reach)} emergencyO2G={model.emergencyO2G} />
      )}
    </Panel>
  );
}
