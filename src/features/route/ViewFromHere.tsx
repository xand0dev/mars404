// F4-AC6: справжній знімок поверхні біля обраного відрізка (SPEC §7.9).
import { useState } from 'react';
import type { Segment, Target, TargetPhoto } from '../../contracts';
import { StatusNote } from '../../ui';
import { findNearestPhoto, photoCandidatesFromTargets, VIEW_RADIUS_M } from './surface-photo';

interface ViewFromHereProps {
  segment: Segment;
  segmentIndex: number;
  targets: Target[];
}

export function ViewFromHere({ segment, segmentIndex, targets }: ViewFromHereProps) {
  const nearest = findNearestPhoto(segment, photoCandidatesFromTargets(targets));

  return (
    <section className="route-view" aria-labelledby="route-view-title">
      <h3 id="route-view-title">View from here</h3>
      {nearest ? (
        <figure>
          <PhotoImage key={nearest.candidate.photo.url} photo={nearest.candidate.photo} />
          <figcaption>
            Surface photo{nearest.candidate.photo.sol === undefined ? '' : `, sol ${nearest.candidate.photo.sol}`}, taken ~{Math.round(nearest.distanceM)} m from
            segment {segmentIndex + 1} (science target {nearest.candidate.name}) · {nearest.candidate.photo.credit}
            {nearest.candidate.photo.sourceUrl && (
              <>
                {' · '}
                <a href={nearest.candidate.photo.sourceUrl} target="_blank" rel="noreferrer">Source</a>
              </>
            )}
          </figcaption>
        </figure>
      ) : (
        <StatusNote level="info">No surface photo within {VIEW_RADIUS_M} m</StatusNote>
      )}
      <p className="route-view-note">{VIEW_RADIUS_M} m radius — assumption. The photo shows the view from the target location, not from the route.</p>
    </section>
  );
}

function PhotoImage({ photo }: { photo: TargetPhoto }) {
  const [failed, setFailed] = useState(false);

  if (failed) {
    return (
      <div className="route-view-placeholder" role="img" aria-label={photo.alt}>
        Photo unavailable: {photo.alt}
      </div>
    );
  }
  return <img src={photo.url} alt={photo.alt} loading="lazy" onError={() => setFailed(true)} />;
}
