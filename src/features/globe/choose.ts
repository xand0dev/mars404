// Вибір точки (F1): спільна дія для кнопок SitePanel і маркерів GlobeScene.
// Таймер переходу живе в SitePanel (useEffect на flying) — тут лише стан.
import { useMission } from '../../store/useMission';
import { useGlobe } from './globeState';
import { prefersReducedMotion } from './motion';
import { GALE_ID, siteById } from './sites';

/** Відкрити район Gale одразу (кінець переходу, Skip, reduced motion, без WebGL). */
export function openGale(): void {
  useGlobe.getState().setFlying(false);
  useMission.getState().setSite(GALE_ID);
}

export function chooseSite(id: string): void {
  const site = siteById(id);
  if (!site) return;
  const g = useGlobe.getState();
  if (site.id === GALE_ID) {
    g.preview(null);
    if (g.flying || !g.sceneReady || prefersReducedMotion()) openGale();
    else g.setFlying(true);
  } else {
    g.setFlying(false);
    g.preview(site.id);
  }
}
