import { useState } from 'react';
import type { Target } from '../../contracts';
import { EvaSign, StatusNote } from '../../ui';
import type { TargetReachState } from './targetReachState';

interface TargetCardProps {
  target: Target;
  selected: boolean;
  onToggle: (id: string) => void;
  reachWarning: string | undefined;
  reachNote: string | undefined;
  variant?: 'full' | 'preview';
  headingId?: string;
  eyebrow?: string;
  reachState?: TargetReachState;
}

export function TargetCard({ target, selected, onToggle, reachWarning, reachNote, variant = 'full', headingId, eyebrow, reachState }: TargetCardProps) {
  const [photoFailed, setPhotoFailed] = useState(false);
  const { photo } = target;

  if (variant === 'preview') {
    const reachLabel = reachState === 'inside' ? 'Within reach' : reachState === 'outside' ? 'Outside current reach' : 'Reach not assessed';
    return (
      <article className="target-card--preview" aria-label={target.name}>
        {photo && !photoFailed ? <img className="target-map-preview__photo" src={photo.url} alt={photo.alt} onError={() => setPhotoFailed(true)} /> : <div className="target-map-preview__photo-fallback" role={photo ? 'img' : undefined} aria-label={photo?.alt}>{photo ? 'Photo unavailable' : 'No photo available'}</div>}
        <div className="target-map-preview__body">
          <header className="target-map-preview__header">
            {eyebrow ? <p className="target-map-preview__accuracy">{eyebrow}</p> : null}
            <h3 id={headingId}>{target.name}</h3>
          </header>
          <p className="target-map-preview__why">{target.why}</p>
          {photo && <p className="target-map-preview__credit">{photo.sourceUrl ? <a href={photo.sourceUrl} target="_blank" rel="noreferrer">{photo.credit}</a> : photo.credit}</p>}
          <p className={`target-map-preview__reach target-map-preview__reach--${reachState ?? 'not-assessed'}`}>{reachLabel}</p>
          <button className="target-map-preview__action" type="button" aria-pressed={selected} onClick={() => onToggle(target.id)}>
            {selected ? 'Remove from route' : 'Add to route'}
          </button>
        </div>
      </article>
    );
  }

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
