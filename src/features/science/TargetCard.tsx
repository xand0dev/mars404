import { useState } from 'react';
import type { Target } from '../../contracts';

interface TargetCardProps {
  target: Target;
  selected: boolean;
  onToggle: (id: string) => void;
  reachWarning: string | undefined;
}

export function TargetCard({ target, selected, onToggle, reachWarning }: TargetCardProps) {
  const [photoFailed, setPhotoFailed] = useState(false);
  const { photo } = target;

  return (
    <article aria-label={target.name}>
      <h3>{target.name}</h3>
      <p>{target.why}</p>
      {photo && !photoFailed ? <img src={photo.url} alt={photo.alt} onError={() => setPhotoFailed(true)} /> : null}
      {photo && photoFailed ? (
        <div role="img" aria-label={photo.alt}>
          {photo.alt}
        </div>
      ) : null}
      {photo ? (
        <div>
          <p>View from rover stop · {photo.credit}</p>
          {photo.sol === undefined ? null : <p>Sol {photo.sol}</p>}
          {photo.sourceUrl ? (
            <a href={photo.sourceUrl} target="_blank" rel="noreferrer">
              Photo source
            </a>
          ) : null}
        </div>
      ) : (
        <p>No photo available.</p>
      )}
      {reachWarning ? <p role="alert">⚠ {reachWarning}</p> : null}
      <button type="button" aria-pressed={selected} onClick={() => onToggle(target.id)}>
        {selected ? 'Remove' : 'Add to route'}
      </button>
    </article>
  );
}
