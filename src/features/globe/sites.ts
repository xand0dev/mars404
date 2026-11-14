// Точки глобуса (F1). Координати — IAU Gazetteer of Planetary Nomenclature, контрольна мережа MDIM 2.1
// (ту ж мережу має Viking MDIM 2.1 — кандидат текстури), planetocentric, +East, 0–360.
// Звірено зі сторінками Feature/<id> 2026-11-14. Описи — без чисел, лише загальновідомі факти місій.
import type { MissionState, Source } from '../../contracts';

export const GALE_ID = 'gale' satisfies NonNullable<MissionState['site']>;

export interface Site {
  id: string;
  name: string;
  latDeg: number;
  /** Planetocentric, +East, 0–360 */
  lonEastDeg: number;
  /** true — для точки є модель району (лише Gale) */
  modelled: boolean;
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
    modelled: true,
    summary: 'Curiosity rover field site: layered sediments of Mount Sharp (Aeolis Mons). Modelled EVA region.',
    source: gazetteer(2071, 'Gale'),
  },
  {
    id: 'jezero',
    name: 'Jezero',
    latDeg: 18.41,
    lonEastDeg: 77.69,
    modelled: false,
    summary: 'Perseverance rover site: crater with an ancient river delta.',
    source: gazetteer(14300, 'Jezero'),
  },
  {
    id: 'meridiani',
    name: 'Meridiani Planum',
    latDeg: 0.2,
    lonEastDeg: 357.5,
    modelled: false,
    summary: 'Opportunity rover site: plains with hematite-bearing deposits.',
    source: gazetteer(3854, 'Meridiani Planum'),
  },
  {
    id: 'olympus',
    name: 'Olympus Mons',
    latDeg: 18.4,
    lonEastDeg: 226,
    modelled: false,
    summary: 'Shield volcano, the tallest on Mars.',
    source: gazetteer(4453, 'Olympus Mons'),
  },
  {
    id: 'valles',
    name: 'Valles Marineris',
    latDeg: -13.74,
    lonEastDeg: 300.8,
    modelled: false,
    summary: 'Canyon system stretching along the equator.',
    source: gazetteer(6288, 'Valles Marineris'),
  },
];

export function siteById(id: string): Site | undefined {
  return SITES.find((s) => s.id === id);
}
