// F3: файл регіону по HTTP через BASE_URL (працює на GitHub Pages і офлайн).
import type { SiteId } from '../../contracts';
import { siteDataUrl } from '../../contracts/planning';
import { FileMissingError, type GetFile } from './loadRegion';

/** 404 → FileMissingError, інший не-OK статус → Error.
 * Vite dev і SPA-fallback віддають index.html (200) замість 404 — для не-HTML файлу це теж «файла немає». */
export const httpGetFor = (site: SiteId): GetFile => async (path) => {
  const res = await fetch(siteDataUrl(site, path));
  const html = (res.headers.get('content-type') ?? '').includes('text/html') && !/\.html?$/i.test(path);
  if (res.status === 404 || (res.ok && html)) throw new FileMissingError(path);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.arrayBuffer();
};

/** Пакет Gale (сумісність). */
export const httpGet: GetFile = httpGetFor('gale');
