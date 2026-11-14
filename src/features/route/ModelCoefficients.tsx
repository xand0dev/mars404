// #79, SPEC §7.6: коефіцієнти моделі — коротке попередження й таблиця з джерелами в «Details».
import { useState } from 'react';
import type { ModelCoefficients as Coefficients, ModelParams } from '../../contracts';
import { DataTable, EvidenceBadge, StatusNote, type DataTableColumn } from '../../ui';

type CoefficientKey = keyof Coefficients;

/** Назва людською мовою, одиниця й перетворення значення для показу. */
const COEFFICIENTS: { key: CoefficientKey; label: string; unit: string; scale?: number }[] = [
  { key: 'speedMps', label: 'Walking speed', unit: 'm/s' },
  { key: 'uphillFactor', label: 'Uphill penalty', unit: '×' },
  { key: 'downhillFactor', label: 'Downhill factor', unit: '×' },
  { key: 'o2GPerS', label: 'O₂ use', unit: 'g/s' },
  { key: 'energyWhPerM', label: 'Energy use', unit: 'Wh/m' },
  { key: 'doseUSvPerS', label: 'Dose rate', unit: 'µSv/s' },
  { key: 'maxSlopeDeg', label: 'Max walkable slope', unit: '°' },
  { key: 'hazardWeight', label: 'Hazard weight', unit: '×' },
  { key: 'reserveFraction', label: 'Reserve', unit: '%', scale: 100 },
  { key: 'emergencyO2G', label: 'Emergency O₂ reserve', unit: 'g' },
];

const COLUMNS: DataTableColumn[] = [
  { key: 'parameter', label: 'Parameter' },
  { key: 'value', label: 'Value', align: 'end' },
  { key: 'status', label: 'Status' },
  { key: 'source', label: 'Source' },
];

/** Без зайвих нулів: 0.031 → «0.031», 1 → «1», 0.2 × 100 → «20». */
const formatValue = (value: number | null, unit: string, scale = 1) =>
  value === null || !Number.isFinite(value) ? 'no data' : `${Number((value * scale).toPrecision(4))} ${unit}`;

export function ModelCoefficientsNote({ model }: { model: ModelParams }) {
  const [open, setOpen] = useState(false);
  const sources = Object.values(model.evidence);
  const unverified = sources.filter((source) => source.status !== 'verified').length;

  const rows = COEFFICIENTS.map(({ key, label, unit, scale }) => {
    const source = model.evidence[key];
    return {
      id: key,
      cells: {
        parameter: label,
        value: formatValue(model[key], unit, scale),
        status: <EvidenceBadge status={source.status} />,
        source: source.url ? (
          <a href={source.url} target="_blank" rel="noreferrer">{source.title}</a>
        ) : (
          source.note || source.title
        ),
      },
    };
  });

  return (
    <>
      {unverified > 0 && (
        <StatusNote level="warn">
          {unverified} of {sources.length} model coefficients have no verified source. Model, not certified navigation.
        </StatusNote>
      )}
      {/* Як Disclosure з src/ui, але таблиця рендериться лише розгорнутою: бейджі «MOCK» не дублюють бейдж панелі. */}
      <details className="ui-disclosure" open={open} onToggle={(event) => setOpen(event.currentTarget.open)}>
        <summary>Details: model coefficients</summary>
        {open && (
          <div className="ui-disclosure__body">
            <DataTable caption="Model coefficients and sources" columns={COLUMNS} rows={rows} />
          </div>
        )}
      </details>
    </>
  );
}
