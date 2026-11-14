// F3: headless. Коли відкрито Gale — вантажить public/data/gale і викликає setRegionData (SPEC §5.2, §6.0).
import { useEffect } from 'react';
import { useMission } from '../../store/useMission';
import { useDataStatus } from './dataStatus';
import { httpGet } from './httpGet';
import { loadRegion, type GetFile } from './loadRegion';

export function DataLoader({ get = httpGet }: { get?: GetFile }) {
  const site = useMission((s) => s.site);

  useEffect(() => {
    if (site !== 'gale') return;
    const status = useDataStatus.getState();
    if (status.phase === 'real' && useMission.getState().region?.id === 'gale') return;
    let alive = true;
    useDataStatus.setState({ phase: 'loading', reason: undefined, issues: [], warnings: [] });
    loadRegion(get).then(
      (r) => {
        if (!alive || useMission.getState().site !== 'gale') return;
        if (r.kind === 'real') {
          // photos: store прийме їх після contract-PR #26 (SPEC §6: setRegionData({ …, photos? })).
          const data = { region: r.region, grid: r.grid, targets: r.targets, photos: r.photos };
          useMission.getState().setRegionData(data);
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
  }, [site, get]);

  return null;
}
