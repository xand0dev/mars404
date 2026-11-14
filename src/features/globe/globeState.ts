// Локальний стан F1: спільний для SitePanel і GlobeScene (вони в різних гілках дерева App).
// Не є спільним store — інші фічі сюди не дивляться; обмін з ними лише через useMission.
import { create } from 'zustand';

export type TextureState =
  | { status: 'loading' }
  | { status: 'ok'; credit: string }
  | { status: 'missing' };

interface GlobeUi {
  /** Не-Gale точка, чию картку показано */
  previewId: string | null;
  /** Іде анімація переходу до Gale (F1-AC3) */
  flying: boolean;
  /** GlobeScene змонтовано в полотні (є WebGL) — лише тоді анімуємо */
  sceneReady: boolean;
  texture: TextureState;
  preview(id: string | null): void;
  setFlying(flying: boolean): void;
  setSceneReady(ready: boolean): void;
  setTexture(t: TextureState): void;
  /** Скидає UI вибору (картку, перехід); стан сцени й текстури лишається */
  resetUi(): void;
}

const initialUi = () => ({ previewId: null, flying: false });

export const useGlobe = create<GlobeUi>()((set) => ({
  ...initialUi(),
  sceneReady: false,
  texture: { status: 'loading' },
  preview: (previewId) => set({ previewId }),
  setFlying: (flying) => set({ flying }),
  setSceneReady: (sceneReady) => set({ sceneReady }),
  setTexture: (texture) => set({ texture }),
  resetUi: () => set(initialUi()),
}));

/** Повне скидання (тести). */
export function resetGlobe(): void {
  useGlobe.setState({ ...initialUi(), sceneReady: false, texture: { status: 'loading' } });
}
