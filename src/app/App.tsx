// Композиція (F0). Ліворуч — підготовка виходу (у порядку кроків демо), у центрі — карта, праворуч — стан місії.
import { BudgetEngine, BudgetPanel } from '../features/budget';
import { DataLoader, LayersPanel } from '../features/data';
import { GlobeScene, SitePanel } from '../features/globe';
import { Hud, Shell } from '../features/hud';
import { NotesPanel } from '../features/notes';
import { ChecklistPanel } from '../features/prep';
import { RoutePanel } from '../features/route';
import { TargetsPanel } from '../features/science';
import { CameraModes, MapView, NavPanel } from '../features/terrain';
import { regionKind } from '../contracts/planning';
import { useMission } from '../store/useMission';

export function App() {
  // Overview-район (Olympus Mons, Valles Marineris): лише рельєф і шари — панелі планування EVA ховаємо.
  const overview = useMission((s) => s.site !== null && s.region?.id === s.site && regionKind(s.region) === 'overview');
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
            {!overview && (
              <>
                <TargetsPanel />
                <RoutePanel />
                <NavPanel />
              </>
            )}
          </>
        }
        status={
          overview ? undefined : (
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
