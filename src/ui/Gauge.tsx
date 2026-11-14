export interface GaugeProps {
  label: string;
  /** null або нескінченне → «no data» */
  value: number | null;
  max: number;
  unit: string;
}

export function Gauge({ label, value, max, unit }: GaugeProps) {
  const known = value !== null && Number.isFinite(value);
  return (
    <div className="ui-gauge">
      <span>
        {label}: {known ? `${Math.round(value)} ${unit}` : 'no data'}
      </span>
      {known && <meter min={0} max={max} value={Math.min(Math.max(value, 0), max)} aria-label={label} />}
    </div>
  );
}
