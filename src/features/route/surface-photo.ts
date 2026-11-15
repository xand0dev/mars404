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

export const PHOTO_LOCATION_TEXT: Record<PhotoLocation, string> = {
  'rover-stop': 'rover stop',
  approximate: 'approximate location',
  target: 'science target',
};

const LOCATION_ACCURACY_NOTE: Record<PhotoLocation, string> = {
  'rover-stop': 'Location: rover stop, not the exact camera spot.',
  approximate: 'Location: approximate rover site — assumption.',
  target: 'Location: science target coordinates — assumption.',
};

export const locationAccuracyNote = (location: PhotoLocation): string => LOCATION_ACCURACY_NOTE[location];

/** Камера як у джерелі: NAV_LEFT_B (raw images API) і NAVCAM_LEFT (PDS) — «Navcam». */
export const photoCameraName = (camera?: string): string => (camera === undefined ? 'Surface photo' : camera.startsWith('NAV') ? 'Navcam' : camera);

/** «NASA source» лише для https-посилань на nasa.gov і його піддомени. */
export function sourceLinkLabel(url: string): string {
  try {
    const { protocol, hostname } = new URL(url);
    return protocol === 'https:' && (hostname === 'nasa.gov' || hostname.endsWith('.nasa.gov')) ? 'NASA source' : 'Source';
  } catch {
    return 'Source';
  }
}
