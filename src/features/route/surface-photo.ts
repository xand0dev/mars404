// «View from here» (SPEC §7.9): найближчий справжній знімок до середини обраного відрізка.
import type { Segment, SurfacePhoto, Target, TargetPhoto, XY } from '../../contracts';

/** Поріг показу знімка — assumption (SPEC §7.9). */
export const VIEW_RADIUS_M = 300;

/** Звідки знято кадр: зупинка ровера (photos), приблизне місце або координати цілі (запасний варіант). */
export type PhotoLocation = 'rover-stop' | 'approximate' | 'target';

export interface PhotoCandidate {
  photo: Pick<TargetPhoto, 'url' | 'alt' | 'credit' | 'sol' | 'sourceUrl'>;
  coordinates: XY;
  location: PhotoLocation;
  /** Камера з raw images API ('NAV_LEFT_B'); у фото цілей немає. */
  camera?: string;
  /** Назва цілі — лише для location = 'target'. */
  name?: string;
}

export interface NearestPhoto {
  candidate: PhotoCandidate;
  distanceM: number;
}

export function segmentMidpoint(segment: Segment): XY {
  return [(segment.from[0] + segment.to[0]) / 2, (segment.from[1] + segment.to[1]) / 2];
}

export function photoCandidatesFromTargets(targets: Target[]): PhotoCandidate[] {
  return targets.flatMap((target) => (target.photo ? [{ photo: target.photo, coordinates: target.coordinates, location: 'target' as const, name: target.name }] : []));
}

/** Кандидати — photos; немає жодного — фото цілей (SPEC §7.9). */
export function photoCandidates(photos: SurfacePhoto[], targets: Target[]): PhotoCandidate[] {
  if (photos.length === 0) return photoCandidatesFromTargets(targets);
  return photos.map((photo) => ({ photo, coordinates: photo.coordinates, location: photo.locationAccuracy, camera: photo.camera }));
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
