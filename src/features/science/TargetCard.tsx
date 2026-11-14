import { useState } from 'react';
import type { Target } from '../../contracts';
import { EvaSign, StatusNote } from '../../ui';

interface TargetCardProps {
  target: Target;
  selected: boolean;
  onToggle: (id: string) => void;
  reachWarning: string | undefined;
  reachNote: string | undefined;
}

export function TargetCard({ target, selected, onToggle, reachWarning, reachNote }: TargetCardProps) {
  const [photoFailed, setPhotoFailed] = useState(false);
  const { photo } = target;

  return (
    <article aria-label={target.name}>
      <h3>{target.name}</h3>
      <p>{target.why}</p>
      {photo && !photoFailed ? (
        <img src={photo.url} alt={photo.alt} style={{ display: 'block', width: '100%', height: 'auto' }} onError={() => setPhotoFailed(true)} />
      ) : null}
      {photo && photoFailed ? (
        <div role="img" aria-label={photo.alt}>
          {photo.alt}
        </div>
      ) : null}
      {photo ? (
        <div>
          <p>
            <EvaSign kind="photo" label="" /> View from rover stop · {photo.credit}
          </p>
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
      {reachWarning ? <StatusNote level="deficit" live="alert">{reachWarning}</StatusNote> : null}
      {reachNote ? <StatusNote level="info" live="status">{reachNote}</StatusNote> : null}
      <button type="button" aria-pressed={selected} onClick={() => onToggle(target.id)}>
        {selected ? 'Remove' : 'Add to route'}
      </button>
    </article>
  );
}
