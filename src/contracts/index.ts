// Єдиний публічний контракт MARS::404 (docs/SPEC.md §6).
// Змінюється лише окремим PR з міткою `contract`. Одиниці: м, °, с, г, Wh, µSv.

/** Локальні метри: x — схід, y — північ. */
export type XY = readonly [xM: number, yM: number];
export type Evidence = 'verified' | 'assumption' | 'mock' | 'pending';

export interface Source {
  id: string;
  title: string;
  url?: string;
  productId?: string;
  status: Evidence;
  note: string;
  credit?: string;
  /** ISO-дата доступу */
  accessedAt?: string;
}

export type LayerKind = 'terrain' | 'optical' | 'thermal' | 'slope' | 'mission';

export interface Layer {
  id: string;
  name: string;
  kind: LayerKind;
  url: string;
  sourceIds: string[];
  status: Evidence;
  units: string;
  nativeResolutionM: number | null;
  gridResolutionM: number;
  /** Як отримано: resample, derived… */
  method: string;
  legend: { value: number; label: string; color: string }[];
}

export interface RegionGrid {
  width: number;
  height: number;
  metersPerPixel: number;
  /** Північно-західний зовнішній кут сітки. */
  originM: XY;
  rowOrder: 'north-to-south';
  boundsLonLat: readonly [west: number, south: number, east: number, north: number];
  /** 'Mars 2000 geographic (Trek bboxSR 104905)' */
  crs: string;
}

export interface Region {
  schemaVersion: 1;
  id: 'gale';
  name: string;
  status: Evidence;
  grid: RegionGrid;
  /** Шляхи відносно папки регіону; резолвити через dataUrl(). Растри row-major, little-endian. */
  files: {
    elevation: string;
    slope: string;
    walkable: string;
    hazard: string;
    texture: string;
    targets: string;
    traverse?: string;
  };
  /** Сирий sentinel у elevation.f32 */
  noData: number;
  base: XY;
  model: ModelParams;
  limits: Resources;
  layers: Layer[];
  sources: Source[];
}

export interface TargetPhoto {
  url: string;
  alt: string;
  sourceUrl?: string;
  credit: string;
  sol?: number;
  status: Evidence;
}

export interface Target {
  id: string;
  name: string;
  coordinates: XY;
  lonLat: readonly [lon: number, lat: number];
  why: string;
  sourceIds: string[];
  status: Evidence;
  locationAccuracy: 'verified' | 'approximate' | 'mock';
  photo: TargetPhoto | null;
}

/** targets.geojson (F6): geometry.coordinates = [lon, lat]; coordinates/lonLat заповнює DataLoader. */
export interface TargetFeature {
  type: 'Feature';
  id: string;
  geometry: { type: 'Point'; coordinates: [lon: number, lat: number] };
  properties: Omit<Target, 'coordinates' | 'lonLat'>;
}
export interface TargetsGeoJSON {
  type: 'FeatureCollection';
  features: TargetFeature[];
}

/** traverse.geojson (F3): лінія [lon, lat, elev]. */
export interface TraverseGeoJSON {
  type: 'FeatureCollection';
  features: { type: 'Feature'; geometry: { type: 'LineString'; coordinates: [number, number, number][] }; properties: Record<string, unknown> }[];
}

/** Залишки або ліміти ресурсів. */
export interface Resources {
  time: number;
  o2: number;
  energy: number;
  /** null = невідомо */
  dose: number | null;
}
export type ResourceKey = keyof Resources;

export interface ModelCoefficients {
  speedMps: number;
  uphillFactor: number;
  downhillFactor: number;
  o2GPerS: number;
  energyWhPerM: number;
  doseUSvPerS: number | null;
  maxSlopeDeg: number;
  hazardWeight: number;
  /** [0, 1) */
  reserveFraction: number;
}
export interface ModelParams extends ModelCoefficients {
  evidence: Record<keyof ModelCoefficients, Source>;
}

export interface PlanningGrid {
  width: number;
  height: number;
  metersPerPixel: number;
  originM: XY;
  /** NoData → NaN */
  elevationsM: Float32Array;
  slopesDeg: Float32Array;
  /** 1 = прохідна */
  walkable: Uint8Array;
  /** [0, 1], модельний індекс */
  hazard: Float32Array;
}

export interface Segment {
  from: XY;
  to: XY;
  dist: number;
  /** градуси, + = підйом */
  slope: number;
  time: number;
  o2: number;
  energy: number;
  dose: number | null;
}

/** pointIndex: 0 = старт, 1…n = цілі, n+1 = база. */
export type RouteFailure =
  | { code: 'invalid-params' }
  | { code: 'out-of-grid' | 'blocked-point' | 'disconnected'; pointIndex: number }
  | { code: 'no-path-leg'; legIndex: number };

export interface RoutePlan {
  status: 'ok' | 'pending' | 'no-path' | 'invalid';
  path: XY[];
  segments: Segment[];
  /** Індекс першого відрізка кожної ноги */
  legs: number[];
  /** Витрати плану */
  totals: Resources & { dist: number };
  reason?: RouteFailure;
  warnings: string[];
  requestId: number;
}

export interface ReachabilityResult {
  status: 'estimated' | 'incomplete' | 'invalid';
  /** 1 = туди й назад у межах бюджету з резервом */
  mask: Uint8Array;
  /** SPEC §7.4; null — не оцінено */
  returnInS: number | null;
  deficits: ResourceKey[];
  swap: { dropId: string; addId: string } | null;
  warnings: string[];
}

export type SiteId = 'gale';

export interface MissionData {
  site: SiteId | null;
  layers: Record<string, boolean>;
  targets: Target[];
  selectedTargetIds: string[];
  selectedSegment: number | null;
  region: Region | null;
  /** До завантаження — mockGrid */
  grid: PlanningGrid;
  model: ModelParams;
  limits: Resources;
  waypoints: XY[];
  plan: RoutePlan | null;
  budget: Resources;
  reach: ReachabilityResult | null;
  /** Минуло, с */
  time: number;
  base: XY | null;
  position: XY | null;
}

export interface MissionActions {
  setSite(site: SiteId | null): void;
  toggleLayer(id: string): void;
  setRegionData(d: { region: Region; grid: PlanningGrid; targets: Target[] }): void;
  toggleTarget(id: string): void;
  replaceTarget(dropId: string, addId: string): void;
  setWaypoints(points: XY[]): void;
  setPlan(plan: RoutePlan | null): void;
  setSelectedSegment(i: number | null): void;
  setBudget(b: Resources): void;
  setReach(r: ReachabilityResult | null): void;
  setLimits(l: Resources): void;
  setTime(elapsedS: number): void;
  setPosition(p: XY): void;
}

export type MissionState = MissionData & MissionActions;

/** Візуальне перебільшення висоти в 3D (SPEC §7.1). */
export const VERTICAL_EXAGGERATION = 3;
/** Метрів в 1° на екваторі Марса (R = 3396.19 км). */
export const METERS_PER_DEG = (Math.PI * 3_396_190) / 180;
