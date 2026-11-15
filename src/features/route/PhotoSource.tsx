// Посилання на джерело знімка й позначка точності місця — спільні для «View from here» і підшторки пульта (SPEC §7.9).
import { locationAccuracyNote, sourceLinkLabel, type PhotoLocation } from './surface-photo';

export function PhotoSourceLink({ sourceUrl }: { sourceUrl?: string }) {
  if (!sourceUrl) return null;
  return (
    <>
      {' · '}
      <a href={sourceUrl} target="_blank" rel="noreferrer">{sourceLinkLabel(sourceUrl)}</a>
    </>
  );
}

export function PhotoLocationNote({ location }: { location: PhotoLocation }) {
  return <span className="route-view-accuracy">{locationAccuracyNote(location)}</span>;
}
