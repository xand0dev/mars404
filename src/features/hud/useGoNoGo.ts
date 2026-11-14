// F7: вердикт GO / NO-GO зі store. Рахує src/contracts/gonogo.ts (SPEC §7.10); тут лише підписка.
import { useMemo } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { evaluateGoNoGo, type GoNoGo } from '../../contracts/gonogo';
import { useMission } from '../../store/useMission';

export function useGoNoGo(): GoNoGo {
  const s = useMission(
    useShallow((m) => ({
      site: m.site,
      targets: m.targets,
      selectedTargetIds: m.selectedTargetIds,
      grid: m.grid,
      region: m.region,
      model: m.model,
      limits: m.limits,
      plan: m.plan,
      reach: m.reach,
      time: m.time,
    })),
  );
  return useMemo(() => evaluateGoNoGo(s), [s]);
}
