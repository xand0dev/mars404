// F3: headless. Коли відкрито район — вантажить public/data/<site> і викликає setRegionData (SPEC §5.2, §6.0).
import { useEffect } from 'react';
import type { SiteId } from '../../contracts';
import { useMission } from '../../store/useMission';
import { useDataStatus } from './dataStatus';
import { httpGetFor } from './httpGet';
import { loadRegion, type GetFile } from './loadRegion';

/** `get` — один джерело файлів для будь-якого району (тести); інакше HTTP з public/data/<site>. */
export function DataLoader({ get, getFor = httpGetFor }: { get?: GetFile; getFor?: (site: SiteId) => GetFile }) {
  const site = useMission((s) => s.site);

  useEffect(() => {
    if (site === null) return;
    const status = useDataStatus.getState();
    if (status.phase === 'real' && useMission.getState().region?.id === site) return;
    let alive = true;
    useDataStatus.setState({ phase: 'loading', reason: undefined, issues: [], warnings: [] });
    loadRegion(get ?? getFor(site)).then(
      (r) => {
        if (!alive || useMission.getState().site !== site) return;
        if (r.kind === 'real' && r.region.id !== site) {
          useDataStatus.setState({ phase: 'mock', reason: `region.json id "${r.region.id}" ≠ site "${site}"`, issues: r.issues, warnings: r.warnings });
          return;
        }
        if (r.kind === 'real') {
          useMission.getState().setRegionData({ region: r.region, grid: r.grid, targets: r.targets, photos: r.photos });
          useDataStatus.setState({ phase: 'real', issues: r.issues, warnings: r.warnings });
        } else {
          useDataStatus.setState({ phase: 'mock', reason: r.reason, issues: r.issues, warnings: r.warnings });
        }
        for (const w of r.warnings) console.warn(`[F3] ${w}`);
      },
      (e: unknown) => {
        if (alive) useDataStatus.setState({ phase: 'mock', reason: e instanceof Error ? e.message : String(e), issues: [], warnings: [] });
      },
    );
    return () => {
      alive = false;
      if (useDataStatus.getState().phase === 'loading') useDataStatus.setState({ phase: 'idle' });
    };
  }, [site, get, getFor]);

  return null;
}
