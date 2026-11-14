import type { RoutePlan } from '../../contracts';
import { formatDistance, formatDose, formatEnergy, formatO2, formatSeconds, formatSlope } from './format';

export interface SegmentTableProps {
  plan: RoutePlan;
  selectedSegment: number | null;
  onSelect: (segment: number) => void;
}

/** Нога відрізка: останній початок ноги ≤ i. */
const legOf = (legs: number[], segment: number) => legs.reduce((leg, start, k) => (start <= segment ? k : leg), 0);

export function SegmentTable({ plan, selectedSegment, onSelect }: SegmentTableProps) {
  const selected = selectedSegment === null ? undefined : plan.segments[selectedSegment];

  return (
    <>
      {selected && (
        <p className="route-details" data-testid="segment-details" role="status">
          Segment {selectedSegment! + 1} (leg {legOf(plan.legs, selectedSegment!) + 1}): {formatDistance(selected.dist)} · slope {formatSlope(selected.slope)} ·{' '}
          {formatSeconds(selected.time)} · {formatO2(selected.o2)} · {formatEnergy(selected.energy)} · dose {formatDose(selected.dose)}
        </p>
      )}
      <div className="route-table">
        <table>
          <caption>Route segments</caption>
          <thead>
            <tr>
              <th scope="col">#</th>
              <th scope="col">Dist, m</th>
              <th scope="col">Slope, °</th>
              <th scope="col">Time, s</th>
              <th scope="col">O₂, g</th>
              <th scope="col">Energy, Wh</th>
              <th scope="col">Dose, µSv</th>
            </tr>
          </thead>
          <tbody>
            {plan.segments.map((s, k) => (
              <tr key={k} aria-selected={k === selectedSegment}>
                <td>
                  <button type="button" aria-label={`Select segment ${k + 1}`} aria-pressed={k === selectedSegment} onClick={() => onSelect(k)}>
                    {k + 1}
                  </button>
                </td>
                <td>{s.dist.toFixed(1)}</td>
                <td>{formatSlope(s.slope)}</td>
                <td>{s.time.toFixed(1)}</td>
                <td>{s.o2.toFixed(2)}</td>
                <td>{s.energy.toFixed(2)}</td>
                <td>{s.dose === null ? 'no data' : s.dose.toFixed(2)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
