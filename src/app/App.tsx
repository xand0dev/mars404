// Композиція (F0). Ліворуч — підготовка виходу (у порядку кроків демо), у центрі — карта, праворуч — стан місії.
import { useState } from 'react';
import { BudgetEngine, BudgetPanel } from '../features/budget';
import { DataLoader, LayersPanel } from '../features/data';
import { GlobeScene, SitePanel } from '../features/globe';
import { Hud, Shell } from '../features/hud';
import { NotesPanel } from '../features/notes';
import { ChecklistPanel } from '../features/prep';
import { RoutePanel } from '../features/route';
import { TargetMapPreview, TargetsPanel, type TargetPreviewAnchor } from '../features/science';
import { CameraModes, MapView, NavPanel } from '../features/terrain';
import { regionKind } from '../contracts/planning';
import { useMission } from '../store/useMission';
import './app.css';

export function App() {
  const site = useMission((s) => s.site);
  const [preview, setPreview] = useState<{ site: typeof site; targetId: string; anchor: TargetPreviewAnchor | null } | null>(null);
  const previewTargetId = preview?.site === site ? preview.targetId : null;
  const previewAnchor = preview?.site === site ? preview.anchor : null;
  const openTargetPreview = (targetId: string, point?: TargetPreviewAnchor) => {
    if (!point) return setPreview({ site, targetId, anchor: null });
    const cardWidth = 350;
    const gap = 16;
    const x = point.x + cardWidth + gap < window.innerWidth ? point.x + gap : point.x - cardWidth - gap;
    const y = Math.max(8, Math.min(point.y - 98, window.innerHeight - 220));
    setPreview({ site, targetId, anchor: { x, y } });
  };
  // Overview-район (Olympus Mons, Valles Marineris): лише рельєф і шари — панелі планування EVA ховаємо.
  const overview = useMission((s) => s.site !== null && s.region?.id === s.site && regionKind(s.region) === 'overview');
  // Глобус (район не обрано): лише карта й вибір місця — панелі планування, HUD і стан ще порожні.
  const globe = useMission((s) => s.site === null);
  return (
    <>
      <DataLoader />
      <BudgetEngine />
      <Shell
        hud={globe ? null : <Hud />}
        map={
          <>
            <MapView globe={<GlobeScene />} previewTargetId={previewTargetId} onTargetPreview={openTargetPreview} />
            <TargetMapPreview targetId={previewTargetId} anchor={previewAnchor} onClose={() => setPreview(null)} />
            {!globe && <CameraModes />}
          </>
        }
        side={
          <>
            <SitePanel />
            {!globe && <LayersPanel />}
            {!globe && !overview && (
              <>
                <TargetsPanel />
                <RoutePanel />
                <NavPanel />
              </>
            )}
          </>
        }
        status={
          globe || overview ? undefined : (
            <>
              <BudgetPanel />
              <ChecklistPanel />
              <NotesPanel />
            </>
          )
        }
      />
    </>
  );
}
