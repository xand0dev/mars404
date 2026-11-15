// Вибір точки (F1): спільна дія для кнопок SitePanel і маркерів GlobeScene.
// Таймер переходу живе в SitePanel (useEffect на flying) — тут лише стан.
import { useMission } from '../../store/useMission';
import { useGlobe } from './globeState';
import { prefersReducedMotion } from './motion';
import type { SiteId } from '../../contracts';
import { GALE_ID, canOpenSite, siteById } from './sites';

/** Відкрити район одразу (кінець переходу, Skip, reduced motion, без WebGL). Без аргументу — куди летимо. */
export function openSite(id: SiteId = useGlobe.getState().flyTo): void {
  useGlobe.getState().setFlying(false);
  useMission.getState().setSite(id);
}

export const openGale = (): void => openSite(GALE_ID);

export function chooseSite(id: string): void {
  const site = siteById(id);
  if (!site) return;
  const g = useGlobe.getState();
  // «Coming soon» (пакета ще немає) — не обирається взагалі.
  if (site.comingSoon) return;
  if (canOpenSite(site)) {
    g.preview(null);
    if (g.flying || !g.sceneReady || prefersReducedMotion()) openSite(site.id);
    else g.setFlying(true, site.id);
  } else {
    g.setFlying(false);
    g.preview(site.id);
  }
}
