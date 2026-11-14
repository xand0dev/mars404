// Композиція (F0). Слоти всіх фіч уже змонтовані; власники фіч цей файл не змінюють.
import { BudgetEngine, BudgetPanel } from '../features/budget';
import { DataLoader, LayersPanel } from '../features/data';
import { GlobeScene, SitePanel } from '../features/globe';
import { Hud, Shell } from '../features/hud';
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
          </>
        }
        bottom={
          <>
            <RoutePanel />
            <BudgetPanel />
          </>
        }
      />
    </>
  );
}
