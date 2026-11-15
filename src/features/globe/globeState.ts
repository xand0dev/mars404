// Локальний стан F1: спільний для SitePanel і GlobeScene (вони в різних гілках дерева App).
// Не є спільним store — інші фічі сюди не дивляться; обмін з ними лише через useMission.
import { create } from 'zustand';
import type { SiteId } from '../../contracts';

export type TextureState =
  | { status: 'loading' }
  | { status: 'ok'; credit: string }
  | { status: 'missing' };

interface GlobeUi {
  /** Не-Gale точка, чию картку показано */
  previewId: string | null;
  /** Іде анімація переходу до району (F1-AC3) */
  flying: boolean;
  /** Куди летимо / що відкриваємо в кінці переходу */
  flyTo: SiteId;
  /** GlobeScene змонтовано в полотні (є WebGL) — лише тоді анімуємо */
  sceneReady: boolean;
  texture: TextureState;
  preview(id: string | null): void;
  setFlying(flying: boolean, to?: SiteId): void;
  setSceneReady(ready: boolean): void;
  setTexture(t: TextureState): void;
  /** Скидає UI вибору (картку, перехід); стан сцени й текстури лишається */
  resetUi(): void;
}

const initialUi = () => ({ previewId: null, flying: false, flyTo: 'gale' as SiteId });

export const useGlobe = create<GlobeUi>()((set) => ({
  ...initialUi(),
  sceneReady: false,
  texture: { status: 'loading' },
  preview: (previewId) => set({ previewId }),
  setFlying: (flying, to) => set(to ? { flying, flyTo: to } : { flying }),
  setSceneReady: (sceneReady) => set({ sceneReady }),
  setTexture: (texture) => set({ texture }),
  resetUi: () => set(initialUi()),
}));

/** Повне скидання (тести). */
export function resetGlobe(): void {
  useGlobe.setState({ ...initialUi(), sceneReady: false, texture: { status: 'loading' } });
}
