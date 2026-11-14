import { dataUrl } from '../../../contracts/planning';

/** Файл регіону (region.files.*, layers[].url) → URL через BASE_URL. */
export function regionFileUrl(regionId: string, path: string): string {
  if (/^(https?:|data:|blob:)/.test(path)) return path;
  const clean = path.replace(/^\.?\/+/, '');
  return dataUrl(clean.startsWith(`${regionId}/`) ? clean : `${regionId}/${clean}`);
}
