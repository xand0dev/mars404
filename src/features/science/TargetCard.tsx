// F6 заглушка (F0).
import type { Target } from '../../contracts';

export function TargetCard({ target }: { target: Target }) {
  return (
    <article aria-label={target.name}>
      <h3>{target.name}</h3>
      <p>{target.why}</p>
    </article>
  );
}
