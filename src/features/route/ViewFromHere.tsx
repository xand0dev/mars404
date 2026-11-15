// F4-AC6: справжній знімок поверхні біля обраного відрізка (SPEC §7.9).
import { useState } from 'react';
import type { Segment, SurfacePhoto, Target } from '../../contracts';
import { StatusNote } from '../../ui';
import { findNearestPhoto, photoCandidates, VIEW_RADIUS_M, type PhotoCandidate } from './surface-photo';

interface ViewFromHereProps {
  segment: Segment;
  segmentIndex: number;
  photos: SurfacePhoto[];
  targets: Target[];
}

const LOCATION_TEXT: Record<PhotoCandidate['location'], string> = {
  'rover-stop': 'rover stop',
  approximate: 'approximate location',
  target: 'science target',
};

/** 'NAV_LEFT_B' → «Navcam»; інші камери — як дає API; у фото цілей камери немає. */
const cameraName = (camera?: string) => (camera === undefined ? 'Surface photo' : camera.startsWith('NAV') ? 'Navcam' : camera);

export function ViewFromHere({ segment, segmentIndex, photos, targets }: ViewFromHereProps) {
  const nearest = findNearestPhoto(segment, photoCandidates(photos, targets));

  return (
    <section className="route-view" aria-labelledby="route-view-title">
      <h3 id="route-view-title">View from here</h3>
      {nearest ? <PhotoFigure candidate={nearest.candidate} distanceM={nearest.distanceM} segmentIndex={segmentIndex} /> : <StatusNote level="info">No surface photo within {VIEW_RADIUS_M} m</StatusNote>}
      <p className="route-view-note">
        {VIEW_RADIUS_M} m radius — assumption.
        {nearest && ` The photo shows the view from the ${LOCATION_TEXT[nearest.candidate.location]}, not from the route.`}
      </p>
    </section>
  );
}

function PhotoFigure({ candidate, distanceM, segmentIndex }: { candidate: PhotoCandidate; distanceM: number; segmentIndex: number }) {
  const { photo, location, name } = candidate;
  const place = location === 'target' && name ? `${LOCATION_TEXT.target} ${name}` : LOCATION_TEXT[location];

  return (
    <figure>
      <PhotoImage key={photo.url} url={photo.url} alt={photo.alt} />
      <figcaption>
        {cameraName(candidate.camera)}
        {photo.sol === undefined ? '' : `, sol ${photo.sol}`}, taken ~{Math.round(distanceM)} m from segment {segmentIndex + 1} ({place}) · {photo.credit}
        {photo.sourceUrl && (
          <>
            {' · '}
            <a href={photo.sourceUrl} target="_blank" rel="noreferrer">Source</a>
          </>
        )}
      </figcaption>
    </figure>
  );
}

function PhotoImage({ url, alt }: { url: string; alt: string }) {
  const [failed, setFailed] = useState(false);

  if (failed) {
    return (
      <div className="route-view-placeholder" role="img" aria-label={alt}>
        Photo unavailable: {alt}
      </div>
    );
  }
  return <img src={url} alt={alt} loading="lazy" onError={() => setFailed(true)} />;
}
