// Локальний стан камери F2. Не частина useMission: CameraModes і MapView — сусіди в src/app.
import { create } from 'zustand';
import type { CameraMode } from './lib/camera';

interface CameraState {
  mode: CameraMode;
  /** false — показано 2D-план Б (камери не діють) */
  view3D: boolean;
  /** true — користувач сам обрав 2D-карту (кнопка «2D» поруч із камерами) */
  plan2D: boolean;
  setMode(mode: CameraMode): void;
  setView3D(on: boolean): void;
  setPlan2D(on: boolean): void;
}

export const useCameraMode = create<CameraState>()((set) => ({
  mode: 'orbit',
  view3D: true,
  plan2D: false,
  setMode: (mode) => set({ mode, plan2D: false }),
  setView3D: (view3D) => set({ view3D }),
  setPlan2D: (plan2D) => set({ plan2D }),
}));
