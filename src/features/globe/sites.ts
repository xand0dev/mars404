// Точки глобуса (F1). Координати — IAU Gazetteer of Planetary Nomenclature, контрольна мережа MDIM 2.1
// (ту ж мережу має Viking MDIM 2.1 — кандидат текстури), planetocentric, +East, 0–360.
// Звірено зі сторінками Feature/<id> 2026-11-14. Описи — без чисел, лише загальновідомі факти місій.
import type { MissionState, SiteId, Source } from '../../contracts';
import { isSiteId } from '../../contracts/planning';

export const GALE_ID = 'gale' satisfies NonNullable<MissionState['site']>;
export const COLUMBIA_HILLS_ID = 'columbia-hills' satisfies SiteId;

export type SiteMode = 'eva' | 'overview' | 'card';

export interface Site {
  id: string;
  name: string;
  latDeg: number;
  /** Planetocentric, +East, 0–360 */
  lonEastDeg: number;
  /**
   * Режим точки (#105): `eva` — район з плануванням маршруту, `overview` — лише рельєф,
   * `card` — без пакета даних, лише картка. Для eva / overview id — SiteId (public/data/<id>).
   */
  mode: SiteMode;
  /** Пакета даних ще немає в main → «coming soon», точку не можна обрати */
  comingSoon?: boolean;
  /** Короткий опис для картки (англійською, UI) */
  summary: string;
  source: Source;
}

const ACCESSED = '2026-11-14';

function gazetteer(featureId: number, name: string): Source {
  return {
    id: `iau-gazetteer-${featureId}`,
    title: `IAU Gazetteer of Planetary Nomenclature — ${name}`,
    url: `https://planetarynames.wr.usgs.gov/Feature/${featureId}`,
    status: 'verified',
    note: 'Center latitude/longitude, control network MDIM 2.1, planetocentric +East 0–360',
    credit: 'IAU WGPSN / USGS Astrogeology',
    accessedAt: ACCESSED,
  };
}

export const SITES: readonly Site[] = [
  {
    id: GALE_ID,
    name: 'Gale / Mount Sharp',
    latDeg: -5.44,
    lonEastDeg: 137.7,
    mode: 'eva',
    summary: 'Curiosity rover field site: layered sediments of Mount Sharp (Aeolis Mons).',
    source: gazetteer(2071, 'Gale'),
  },
  {
    id: COLUMBIA_HILLS_ID,
    name: 'Columbia Hills (Gusev)',
    latDeg: -14.59911,
    lonEastDeg: 175.527995,
    mode: 'eva',
    summary: 'Spirit rover field site: Husband Hill and Home Plate in Gusev crater.',
    source: {
      id: 'trek-spirit-waypoints',
      title: 'Spirit waypoints (Mars Trek) — midpoint of Husband Hill and Home Plate',
      url: 'https://trek.nasa.gov/mars/trekarcgis/rest/services/spirit_waypoints/MapServer/0',
      status: 'verified',
      note: 'Same centre as public/data/columbia-hills/region.json (base-assumption source); planetocentric +East',
      credit: 'NASA/JPL-Caltech, Mars Trek',
      accessedAt: ACCESSED,
    },
  },
  {
    id: 'jezero',
    name: 'Jezero',
    latDeg: 18.41,
    lonEastDeg: 77.69,
    mode: 'card',
    summary: 'Perseverance rover site: crater with an ancient river delta.',
    source: gazetteer(14300, 'Jezero'),
  },
  {
    id: 'meridiani',
    name: 'Meridiani Planum',
    latDeg: 0.2,
    lonEastDeg: 357.5,
    mode: 'card',
    summary: 'Opportunity rover site: plains with hematite-bearing deposits.',
    source: gazetteer(3854, 'Meridiani Planum'),
  },
  {
    id: 'olympus-mons',
    name: 'Olympus Mons',
    latDeg: 18.4,
    lonEastDeg: 226,
    mode: 'overview',
    summary: 'Shield volcano, the tallest on Mars.',
    source: gazetteer(4453, 'Olympus Mons'),
  },
  {
    id: 'valles-marineris',
    name: 'Valles Marineris',
    latDeg: -13.74,
    lonEastDeg: 300.8,
    mode: 'overview',
    summary: 'Canyon system stretching along the equator.',
    source: gazetteer(6288, 'Valles Marineris'),
  },
];

export function siteById(id: string): Site | undefined {
  return SITES.find((s) => s.id === id);
}

/** Точку можна відкрити (eva / overview, пакет є) — її id можна ставити в store як SiteId. */
export function canOpenSite(site: Site | undefined): site is Site & { id: SiteId } {
  return !!site && site.mode !== 'card' && !site.comingSoon && isSiteId(site.id);
}

/** Що каже картка словами (§7.7: не лише колір / форма). */
export function modeLabel(site: Site): string {
  if (site.comingSoon) return 'Coming soon — data package not ready';
  if (site.mode === 'eva') return 'EVA site — plan a route';
  if (site.mode === 'overview') return 'Overview — terrain only, no EVA planning';
  return 'Card only — no terrain data';
}

/**
 * Значок режиму для кнопок — та сама форма, що й маркер на глобусі (§7.7: форма, не лише колір):
 * eva ◆ (октаедр), overview ▲ (тетраедр), card ● (сфера), coming soon ○.
 */
export const MODE_GLYPH = { eva: '◆', overview: '▲', card: '●', soon: '○' } as const;
