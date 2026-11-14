import type { XY } from '../../contracts';

export interface WaypointOrderProps {
  waypoints: XY[];
  names: string[];
  onReorder: (waypoints: XY[]) => void;
}

/** Порядок цілей; стрілки міняють сусідів місцями. */
export function WaypointOrder({ waypoints, names, onReorder }: WaypointOrderProps) {
  const move = (from: number, to: number) => {
    const next = [...waypoints];
    [next[from], next[to]] = [next[to]!, next[from]!];
    onReorder(next);
  };

  return (
    <ol className="route-order" aria-label="Target order">
      {names.map((name, k) => (
        <li key={`${k}-${name}`}>
          <span>{name}</span>
          <span className="route-order__actions">
            <button type="button" aria-label={`Move ${name} up`} disabled={k === 0} onClick={() => move(k, k - 1)}>↑</button>
            <button type="button" aria-label={`Move ${name} down`} disabled={k === names.length - 1} onClick={() => move(k, k + 1)}>↓</button>
          </span>
        </li>
      ))}
    </ol>
  );
}
