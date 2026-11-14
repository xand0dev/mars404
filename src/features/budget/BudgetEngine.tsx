// F5 headless: рахує budget і reach (SPEC §7.4) і публікує в store. Єдине джерело чисел повернення.
import { useEffect, useMemo } from 'react';
import { applyAnnotations } from '../../contracts/planning';
import { assessReach, buildReachTrees } from '../../core';
import { useMission } from '../../store/useMission';

export function BudgetEngine() {
  const rawGrid = useMission((s) => s.grid);
  const annotations = useMission((s) => s.annotations);
  const model = useMission((s) => s.model);
  const limits = useMission((s) => s.limits);
  const plan = useMission((s) => s.plan);
  const elapsedS = useMission((s) => s.time);
  const base = useMission((s) => s.base);
  const position = useMission((s) => s.position);
  const targets = useMission((s) => s.targets);
  const selectedTargetIds = useMission((s) => s.selectedTargetIds);
  const noData = useMission((s) => s.region?.noData);

  // Ореол і Abort map — на сітці з мітками екіпажу (SPEC §7.12, F5-AC6), та сама, що в маршруті F4.
  const grid = useMemo(() => applyAnnotations(rawGrid, annotations), [rawGrid, annotations]);

  // Дерева — найдорожча частина; не перебудовуємо їх на зміну лімітів, часу чи плану.
  const trees = useMemo(() => buildReachTrees(grid, model, position, base, noData), [grid, model, position, base, noData]);

  useEffect(() => {
    const { budget, reach } = assessReach({ grid, model, limits, elapsedS, position, base, plan, targets, selectedTargetIds, noData }, trees);
    const { setBudget, setReach } = useMission.getState();
    setBudget(budget);
    setReach(reach);
  }, [trees, grid, model, limits, elapsedS, position, base, plan, targets, selectedTargetIds, noData]);

  return null;
}
