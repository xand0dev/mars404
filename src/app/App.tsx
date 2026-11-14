// Композиція (F0). Ліворуч — підготовка виходу (у порядку кроків демо), у центрі — карта, праворуч — стан місії.
import { BudgetEngine, BudgetPanel } from '../features/budget';
import { DataLoader, LayersPanel } from '../features/data';
import { GlobeScene, SitePanel } from '../features/globe';
import { Hud, Shell } from '../features/hud';
import { NotesPanel } from '../features/notes';
import { ChecklistPanel } from '../features/prep';
import { RoutePanel } from '../features/route';
import { TargetsPanel } from '../features/science';
import { CameraModes, MapView } from '../features/terrain';

export function App() {
  return (
    <>
      <DataLoader />
      <BudgetEngine />
      <Shell
        hud={<Hud />}
        map={
          <>
            <MapView globe={<GlobeScene />} />
            <CameraModes />
          </>
        }
        side={
          <>
            <SitePanel />
            <LayersPanel />
            <TargetsPanel />
            <RoutePanel />
          </>
        }
        status={
          <>
            <BudgetPanel />
            <ChecklistPanel />
            <NotesPanel />
          </>
        }
      />
    </>
  );
}
