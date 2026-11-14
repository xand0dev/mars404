import { formatAmount } from './format';
import { gaugeLevel } from './gaugeLevel';
import { STATUS_ICON } from './statusLevel';

export interface GaugeProps {
  label: string;
  /** null або нескінченне → «no data» */
  value: number | null;
  max: number;
  unit: string;
  /** Резерв у тих самих одиницях (reserveFraction × limits_k, SPEC §7.4). Позначка на шкалі. */
  reserve?: number | null;
  /** Планова витрата. Дефіцит, якщо need > value − reserve. */
  need?: number | null;
}

const known = (v: number | null | undefined): v is number => v != null && Number.isFinite(v);
const clamp = (v: number, max: number) => Math.min(Math.max(v, 0), max);

export function Gauge({ label, value, max, unit, reserve, need }: GaugeProps) {
  if (!known(value)) {
    return (
      <div className="ui-gauge ui-gauge--unknown">
        <span>
          <span aria-hidden="true">{STATUS_ICON.warn}</span> {label}: no data
        </span>
      </div>
    );
  }

  const level = gaugeLevel(value, reserve, need);
  const hasMax = known(max) && max > 0;
  const extra = [known(reserve) && `reserve ${formatAmount(reserve, unit)}`, known(need) && `plan ${formatAmount(need, unit)}`].filter(Boolean);

  return (
    <div className={`ui-gauge ui-gauge--${level}`}>
      <span>
        {label}: {formatAmount(value, unit)}
        {extra.length > 0 && <span className="ui-gauge__extra"> · {extra.join(' · ')}</span>}
      </span>
      {hasMax && (
        <div className="ui-gauge__track">
          <meter min={0} max={max} value={clamp(value, max)} low={known(reserve) ? clamp(reserve, max) : undefined} aria-label={label} />
          {known(reserve) && (
            <span className="ui-gauge__reserve" aria-hidden="true" style={{ left: `${(clamp(reserve, max) / max) * 100}%` }} />
          )}
        </div>
      )}
      {level === 'deficit' && (
        <p className="ui-note ui-note--deficit" role="alert">
          <span aria-hidden="true">{STATUS_ICON.deficit}</span>
          <span>Deficit: {label} — below reserve for the plan</span>
        </p>
      )}
    </div>
  );
}
