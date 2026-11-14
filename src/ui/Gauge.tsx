import { formatAmount } from './format';
import { STATUS_ICON } from './statusLevel';

export interface GaugeProps {
  label: string;
  /** null або нескінченне → «no data» */
  value: number | null;
  max: number;
  unit: string;
  /** Резерв у тих самих одиницях (reserveFraction × limits_k, SPEC §7.4). Позначка на шкалі й текст. */
  reserve?: number | null;
  /** Планова витрата — лише текст «plan …». */
  need?: number | null;
  /**
   * Дефіцит ресурсу. Gauge його НЕ рахує: передає F5 з `reach.deficits` (одне джерело чисел, SPEC §5.2).
   * Без role="alert": дефіцит озвучує статус панелі.
   */
  deficit?: boolean;
}

const known = (v: number | null | undefined): v is number => v != null && Number.isFinite(v);
const clamp = (v: number, max: number) => Math.min(Math.max(v, 0), max);

export function Gauge({ label, value, max, unit, reserve, need, deficit = false }: GaugeProps) {
  const deficitNote = deficit && (
    <p className="ui-note ui-note--deficit">
      <span aria-hidden="true">{STATUS_ICON.deficit}</span>
      <span>Deficit: {label} — below reserve for the plan</span>
    </p>
  );

  if (!known(value)) {
    return (
      <div className={`ui-gauge ui-gauge--unknown${deficit ? ' ui-gauge--deficit' : ''}`}>
        <span>
          <span aria-hidden="true">{STATUS_ICON.warn}</span> {label}: no data
        </span>
        {deficitNote}
      </div>
    );
  }

  const hasMax = known(max) && max > 0;
  const extra = [known(reserve) && `reserve ${formatAmount(reserve, unit)}`, known(need) && `plan ${formatAmount(need, unit)}`].filter(Boolean);

  return (
    <div className={`ui-gauge${deficit ? ' ui-gauge--deficit' : ''}`}>
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
      {deficitNote}
    </div>
  );
}
