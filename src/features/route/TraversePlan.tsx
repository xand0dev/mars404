// «Traverse plan»: точка неповернення одним реченням і ноги маршруту людською мовою замість сотень відрізків.
import type { AbortPlan, RoutePlan } from '../../contracts';
import { ItemRow, STATUS_ICON, formatMinutes } from '../../ui';
import { legSummaries } from './traverse-legs';

interface TraversePlanProps {
  plan: RoutePlan;
  labels: readonly string[];
  abort: AbortPlan | null;
}

export function TraversePlan({ plan, labels, abort }: TraversePlanProps) {
  const legs = legSummaries(plan, labels, abort);

  return (
    <div className="traverse">
      <PointOfNoReturn plan={plan} abort={abort} />
      <ul className="ui-list" aria-label="Route legs">
        {legs.map((leg, k) => (
          <ItemRow
            key={`${k}-${leg.from}-${leg.to}`}
            title={`${k + 1} · ${leg.from} → ${leg.to}`}
            meta={`${Math.round(leg.dist)} m · ${Math.round(leg.time / 60)} min · ${leg.o2.toFixed(1)} g O₂`}
            actions={
              leg.noReturn > 0 ? (
                <span className="traverse-word traverse-word--danger">
                  <span aria-hidden="true">{STATUS_ICON.deficit} </span>
                  {leg.noReturn} no return
                </span>
              ) : (
                <span className="traverse-word traverse-word--ok">
                  <span aria-hidden="true">{STATUS_ICON.ok} </span>OK
                </span>
              )
            }
          />
        ))}
      </ul>
    </div>
  );
}

/** Головне для екіпажу: з якого моменту назад уже не дійти (SPEC §7.8); те саме reach.abort, що й у HUD і на карті. */
function PointOfNoReturn({ plan, abort }: { plan: RoutePlan; abort: AbortPlan | null }) {
  if (!abort || abort.segments.length !== plan.segments.length) return null;

  if (abort.pointOfNoReturnS === null) {
    return (
      <p className="traverse-pnr traverse-pnr--ok">
        <span aria-hidden="true">{STATUS_ICON.ok} </span>
        Return possible from every segment with the emergency O₂ ({Math.round(abort.emergencyO2G)} g) — model estimate.
      </p>
    );
  }

  const firstNoReturn = abort.segments.findIndex((s) => !s.ok);
  return (
    <div className="traverse-pnr traverse-pnr--danger">
      <p className="traverse-pnr__title">
        <span aria-hidden="true">{STATUS_ICON.deficit} </span>
        <strong>Point of no return in {formatMinutes(abort.pointOfNoReturnS)} min</strong>
      </p>
      <p className="traverse-pnr__text">
        From segment {firstNoReturn + 1} of {plan.segments.length} the crew cannot reach base with the emergency O₂ ({Math.round(abort.emergencyO2G)} g) — model estimate.
      </p>
    </div>
  );
}
