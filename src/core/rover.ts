// Марсохід у маршруті (specs/F4/rover.md §1–2). Числа — Apollo LRV на Місяці, для Марса це assumption.
import type { ModelParams, RoutePlan, Source } from '../contracts';

export type TravelMode = 'walk' | 'rover';

export const ROVER = {
  /** Середня швидкість LRV, Apollo 15: 9.2 км/год. */
  speedMps: 2.5,
  /** O₂ екіпажу під час їзди: 550 BTU/год (Jones). */
  o2GPerSRiding: 0.011,
  /** Передпольотний прогноз LRV 3.67 Ah/км × 36 В (обережніше за фактичні 1.87 Ah/км). */
  energyWhPerM: 0.132,
  /** 2 батареї × 36 В × 121 Ah. */
  batteryWh: 8712,
  maxSlopeDeg: 25,
} as const;

const LRV_NOTE = 'Apollo LRV on the Moon; Mars gravity, dust and terrain differ — assumption for Mars.';

const source = (id: string, title: string, url: string, note: string): Source => ({ id, title, url, status: 'assumption', note: `${note} ${LRV_NOTE}` });

const ROVER_EVIDENCE = {
  speedMps: source('rover-lrv-speed', 'Apollo 15 Mission Report, ch. 8.2: average LRV speed 9.2 km/h', 'https://web.archive.org/web/20190721173435/https://www.hq.nasa.gov/alsj/a15/a15mr-8.htm', '9.2 km/h ≈ 2.5 m/s.'),
  o2GPerS: source('rover-riding-o2', 'Jones, LA-UR-89-3858: 550 BTU/hr while riding', 'https://www.osti.gov/servlets/purl/7168757', '0.16 lb O₂/h per 1000 BTU/h × 550 BTU/h ≈ 0.011 g/s.'),
  energyWhPerM: source('rover-suit-energy-riding', 'Suit battery is not spent per metre while riding', 'https://nssdc.gsfc.nasa.gov/planetary/lunar/apollo_lrv.html', 'Rover battery is counted separately (8.7 kWh, 0.132 Wh/m).'),
  maxSlopeDeg: source('rover-lrv-slope', 'NASA SP-4214 ch. 13-3: LRV climbs and descends 25° slopes', 'https://www.nasa.gov/wp-content/uploads/static/history/SP-4214/ch13-3.html', 'Design limit 25°.'),
} satisfies Partial<ModelParams['evidence']>;

/** Модель для відрізків, які екіпаж їде; повернення пішки рахує вихідна модель (walkback). */
export function riderModel(model: ModelParams): ModelParams {
  return {
    ...model,
    speedMps: ROVER.speedMps,
    o2GPerS: ROVER.o2GPerSRiding,
    energyWhPerM: 0,
    maxSlopeDeg: Math.min(model.maxSlopeDeg, ROVER.maxSlopeDeg),
    evidence: { ...model.evidence, ...ROVER_EVIDENCE },
  };
}

export const modelFor = (mode: TravelMode, model: ModelParams): ModelParams => (mode === 'rover' ? riderModel(model) : model);

/** Витрата батареї ровера на маршрут; без чинного плану — null. */
export function roverEnergyWh(plan: RoutePlan | null): number | null {
  return plan?.status === 'ok' ? plan.totals.dist * ROVER.energyWhPerM : null;
}
