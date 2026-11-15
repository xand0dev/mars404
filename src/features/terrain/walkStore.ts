// Демо-прогулянка астронавта маршрутом (локальний стан F2, у useMission не пише).
import { create } from 'zustand';
import { Vector3 } from 'three';
import type { XY } from '../../contracts';
import { DEFAULT_WALK_SPEED } from './lib/walk';

interface WalkStore {
  playing: boolean;
  /** Модельний час від старту, с */
  t: number;
  /** Модельних секунд за реальну */
  speed: number;
  /** Чи показано астронавта (після першого Play) */
  active: boolean;
  play(): void;
  pause(): void;
  restart(): void;
  stop(): void;
  seek(t: number): void;
  setSpeed(v: number): void;
}

export const useWalk = create<WalkStore>()((set) => ({
  playing: false,
  t: 0,
  speed: DEFAULT_WALK_SPEED,
  active: false,
  play: () => set({ playing: true, active: true }),
  pause: () => set({ playing: false }),
  restart: () => set({ t: 0, playing: true, active: true }),
  stop: () => set({ playing: false, t: 0, active: false }),
  seek: (t) => set({ t: Math.max(0, t), active: true }),
  setSpeed: (speed) => set({ speed }),
}));

/** Поза астронавта для камери Follow (оновлюється щокадру, без ре-рендерів). */
export const walkPose = {
  position: new Vector3(),
  heading: 0,
  ready: false,
  /** Висота ґрунту (локальні метри) — камера Follow не провалюється в рельєф */
  groundAt: null as ((xy: XY) => number | null) | null,
  /** Темп вище за біг — прискорене відтворення (ноги не встигають) */
  fastForward: false,
  /** Маршрутом їде марсохід — камера Follow відходить далі й вище, щоб він не закривав вид */
  rover: false,
};
