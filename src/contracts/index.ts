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

/**
 * Режим району (SPEC §6.0, рішення 14.11): `eva` — планування виходу (маршрут, бюджет, GO / NO-GO);
 * `overview` — лише рельєф для огляду (Olympus Mons, Valles Marineris), планування приховане.
 * Немає поля — `eva` (пакети до 15.11).
 */
export type RegionKind = 'eva' | 'overview';

/** Щільніший рельєф лише для 3D: той самий bbox, що й `grid`, інша роздільність. */
export interface RenderGrid {
  width: number;
  height: number;
}

/**
 * Рельєф довкола району (кільце контексту в 3D): квадрат з тим самим центром, більший за `grid`.
 * Координати — у тих самих локальних метрах, що й `grid` (originM — північно-західний кут, може бути від'ємним).
 */
export interface RegionContext {
  /** Файл float32 відносно папки регіону */
  file: string;
  width: number;
  height: number;
  metersPerPixel: number;
  originM: XY;
  /** Сирий sentinel у файлі; немає — той самий, що `Region.noData` */
  noData?: number;
}

export interface Region {
  schemaVersion: 1;
  id: SiteId;
  /** Немає — 'eva'. Читати через `regionKind(region)`. */
  kind?: RegionKind;
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
    /** photos.geojson (F6), SPEC §6.0 */
    photos?: string;
    /** float32 renderGrid.width × renderGrid.height — лише для 3D (без планування) */
    elevationRender?: string;
  };
  /** Розмір `files.elevationRender`; обидва поля або жодного. */
  renderGrid?: RenderGrid;
  /** Кільце рельєфу довкола району (лише 3D). */
  context?: RegionContext;
  /** Сирий sentinel у elevation.f32 */
  noData: number;
  base: XY;
  model: ModelParams;
  limits: Resources;
  /** Джерело кожного ліміту (SPEC §7.6, #20). Немає поля чи ключа — на екрані «assumption». */
  limitsEvidence?: Record<ResourceKey, Source>;
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

/** Знімок з поверхні для «View from here» (SPEC §7.9). Координати — зупинка ровера за sol, а не місце кадру. */
export interface SurfacePhoto {
  id: string;
  coordinates: XY;
  lonLat: readonly [lon: number, lat: number];
  url: string;
  alt: string;
  sourceUrl: string;
  credit: string;
  sol: number;
  /** 'NAV_LEFT_B' тощо, як дає raw images API */
  camera: string;
  locationAccuracy: 'rover-stop' | 'approximate';
  status: Evidence;
}

/** photos/photos.geojson (F6): geometry = [lon, lat] зупинки; coordinates/lonLat заповнює DataLoader. */
export interface SurfacePhotoFeature {
  type: 'Feature';
  id: string;
  geometry: { type: 'Point'; coordinates: [lon: number, lat: number] };
  properties: Omit<SurfacePhoto, 'coordinates' | 'lonLat'>;
}
export interface SurfacePhotosGeoJSON {
  type: 'FeatureCollection';
  features: SurfacePhotoFeature[];
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
  /** Аварійний запас O₂, г; на план не витрачається (SPEC §7.8). */
  emergencyO2G: number;
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
  /**
   * Сповільнення ходьби ґрунтом, множник часу ≥ 1 на клітинку (пісок повільніше за скелю).
   * З нічної яскравості THEMIS (теплова інерція), `soilFromNightDN`; немає → 1 (як раніше). Assumption.
   */
  soil?: Float32Array;
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

/** Abort map (SPEC §7.8). */
export interface AbortPlan {
  /** По одному на plan.segments[i]; returnS — час до бази з кінця відрізка, null — шляху назад немає. */
  segments: { returnS: number | null; ok: boolean }[];
  /** с від початку плану до першого відрізка з ok = false; null — повернення звідусіль. */
  pointOfNoReturnS: number | null;
  /** Який аварійний запас враховано (з model). */
  emergencyO2G: number;
}

export interface ReachabilityResult {
  status: 'estimated' | 'incomplete' | 'invalid';
  /** 1 = туди й назад у межах бюджету з резервом */
  mask: Uint8Array;
  /** SPEC §7.4; null — не оцінено */
  returnInS: number | null;
  deficits: ResourceKey[];
  swap: { dropId: string; addId: string } | null;
  /** SPEC §7.8; null — немає чинного плану. */
  abort: AbortPlan | null;
  warnings: string[];
}

/** Мітка екіпажу на «живій карті» (SPEC §7.12). */
export type AnnotationKind = 'hazard' | 'impassable' | 'note' | 'plan';
export interface Annotation {
  id: string;
  kind: AnnotationKind;
  /** Центр мітки, локальні метри. */
  coordinates: XY;
  /** Радіус дії для hazard / impassable, м; для note / plan — лише показ. */
  radiusM: number;
  text: string;
  /** ISO-час створення. */
  createdAt: string;
  /** Звідки мітка: цей вихід чи імпорт з попереднього. */
  origin: 'this-eva' | 'imported';
}
/** Файл обміну мітками між виходами (експорт / імпорт JSON). */
export interface AnnotationsFile {
  schemaVersion: 1;
  site: SiteId;
  exportedAt: string;
  annotations: Annotation[];
}

/** Пункт чекліста перед виходом (SPEC §7.13). */
export interface ChecklistItem {
  id: string;
  label: string;
  /** Чому пункт з'явився — з плану словами («route has a 27° slope»). */
  reason: string;
  done: boolean;
}

/** Райони з даними (SPEC §6.0). Папка пакета — `public/data/<SiteId>/`. */
export const SITE_IDS = ['gale', 'columbia-hills', 'olympus-mons', 'valles-marineris'] as const;
export type SiteId = (typeof SITE_IDS)[number];

/** Коротка назва району для заголовків UI. */
export const SITE_LABEL: Record<SiteId, string> = {
  gale: 'Gale',
  'columbia-hills': 'Columbia Hills',
  'olympus-mons': 'Olympus Mons',
  'valles-marineris': 'Valles Marineris',
};

export interface MissionData {
  site: SiteId | null;
  layers: Record<string, boolean>;
  targets: Target[];
  /** Знімки для «View from here»; до завантаження — []. */
  photos: SurfacePhoto[];
  /** Мітки екіпажу (§7.12); переживають зміну плану й сайту. */
  annotations: Annotation[];
  /** Чекліст перед виходом (§7.13); будує F6 з плану. */
  checklist: ChecklistItem[];
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
  setRegionData(d: { region: Region; grid: PlanningGrid; targets: Target[]; photos?: SurfacePhoto[] }): void;
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
  addAnnotation(a: Annotation): void;
  removeAnnotation(id: string): void;
  setAnnotations(list: Annotation[]): void;
  setChecklist(items: ChecklistItem[]): void;
  toggleChecklistItem(id: string): void;
}

export type MissionState = MissionData & MissionActions;

/** Візуальне перебільшення висоти в 3D (SPEC §7.1). */
export const VERTICAL_EXAGGERATION = 3;
/** Метрів в 1° на екваторі Марса (R = 3396.19 км). */
export const METERS_PER_DEG = (Math.PI * 3_396_190) / 180;
