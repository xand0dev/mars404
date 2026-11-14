import type { PlanningGrid, RoutePlan } from '../../contracts';
import { xyToCell } from '../../contracts/planning';

const WIDTH = 300;
const HEIGHT = 80;
const PADDING = 4;

export interface ElevationProfileProps {
  plan: RoutePlan;
  grid: PlanningGrid;
  selectedSegment: number | null;
  onSelect: (segment: number) => void;
}

/** Профіль висоти вздовж маршруту (справжні метри, без ×3). Клавіатурний вибір — у таблиці відрізків. */
export function ElevationProfile({ plan, grid, selectedSegment, onSelect }: ElevationProfileProps) {
  const elevations = plan.path.map((p) => {
    const cell = xyToCell(grid, p);
    return cell ? (grid.elevationsM[cell.index] ?? NaN) : NaN;
  });
  const distances = [0];
  for (const s of plan.segments) distances.push(distances.at(-1)! + s.dist);

  const total = distances.at(-1)! || 1;
  const finite = elevations.filter(Number.isFinite);
  const minH = Math.min(...finite);
  const maxH = Math.max(...finite);
  const span = maxH - minH || 1;
  const x = (k: number) => PADDING + (distances[k]! / total) * (WIDTH - 2 * PADDING);
  const y = (k: number) => HEIGHT - PADDING - ((elevations[k]! - minH) / span) * (HEIGHT - 2 * PADDING);
  const line = elevations.map((_, k) => `${x(k).toFixed(1)},${y(k).toFixed(1)}`).join(' ');

  return (
    <figure className="route-profile">
      <svg viewBox={`0 0 ${WIDTH} ${HEIGHT}`} preserveAspectRatio="none" role="img" aria-label={`Elevation profile, ${minH.toFixed(0)}–${maxH.toFixed(0)} m over ${total.toFixed(0)} m`}>
        <polyline points={line} className="route-profile__line" />
        {selectedSegment !== null && plan.segments[selectedSegment] && (
          <line x1={x(selectedSegment)} y1={y(selectedSegment)} x2={x(selectedSegment + 1)} y2={y(selectedSegment + 1)} className="route-profile__selected" />
        )}
        {plan.segments.map((_, k) => (
          <rect key={k} x={x(k)} y={0} width={Math.max(x(k + 1) - x(k), 0.5)} height={HEIGHT} className="route-profile__hit" onClick={() => onSelect(k)} />
        ))}
      </svg>
      <figcaption>
        Elevation {minH.toFixed(0)}–{maxH.toFixed(0)} m · distance {total.toFixed(0)} m · true metres (no ×3)
      </figcaption>
    </figure>
  );
}
