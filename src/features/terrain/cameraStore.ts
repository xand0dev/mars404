// Локальний стан камери F2. Не частина useMission: CameraModes і MapView — сусіди в src/app.
import { create } from 'zustand';
import type { CameraMode } from './lib/camera';

interface CameraState {
  mode: CameraMode;
  /** false — показано 2D-план Б (камери не діють) */
  view3D: boolean;
  setMode(mode: CameraMode): void;
  setView3D(on: boolean): void;
}

export const useCameraMode = create<CameraState>()((set) => ({
  mode: 'orbit',
  view3D: true,
  setMode: (mode) => set({ mode }),
  setView3D: (view3D) => set({ view3D }),
}));
