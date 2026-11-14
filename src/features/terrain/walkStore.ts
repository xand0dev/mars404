// Демо-прогулянка астронавта маршрутом (локальний стан F2, у useMission не пише).
import { create } from 'zustand';
import { Vector3 } from 'three';
import { WALK_SPEEDS } from './lib/walk';

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
  speed: WALK_SPEEDS[2],
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
};
