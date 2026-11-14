// «View from here» (SPEC §7.9): найближчий справжній знімок до середини обраного відрізка.
import type { Segment, Target, TargetPhoto, XY } from '../../contracts';

/** Поріг показу знімка — assumption (SPEC §7.9). */
export const VIEW_RADIUS_M = 300;

// TODO(#26): додати кандидати з `photos` (SurfacePhoto, location 'rover-stop') з пріоритетом над фото цілей.
export interface PhotoCandidate {
  photo: TargetPhoto;
  coordinates: XY;
  /** Де стояла камера: 'target' — координати цілі, а не точка кадру. */
  location: 'target';
  targetId: string;
  name: string;
}

export interface NearestPhoto {
  candidate: PhotoCandidate;
  distanceM: number;
}

export function segmentMidpoint(segment: Segment): XY {
  return [(segment.from[0] + segment.to[0]) / 2, (segment.from[1] + segment.to[1]) / 2];
}

export function photoCandidatesFromTargets(targets: Target[]): PhotoCandidate[] {
  return targets.flatMap((target) =>
    target.photo ? [{ photo: target.photo, coordinates: target.coordinates, location: 'target' as const, targetId: target.id, name: target.name }] : [],
  );
}

/** null — немає кандидата ближче VIEW_RADIUS_M (рівність — так). */
export function findNearestPhoto(segment: Segment, candidates: PhotoCandidate[]): NearestPhoto | null {
  const [midX, midY] = segmentMidpoint(segment);
  let nearest: NearestPhoto | null = null;

  for (const candidate of candidates) {
    const distanceM = Math.hypot(candidate.coordinates[0] - midX, candidate.coordinates[1] - midY);
    if (distanceM <= VIEW_RADIUS_M && (!nearest || distanceM < nearest.distanceM)) nearest = { candidate, distanceM };
  }
  return nearest;
}
