// Графове ядро маршруту й досяжності (SPEC §7.3–7.4): ребра, вартість, A*, дерева.
// Власник — F4/F5 (Влад). Імпортують лише src/features/route і src/features/budget.
export { findPath } from './astar';
export { buildCostTree, type CostTree } from './cost-tree';
export { createWalkGraph, edgeBetween, forEachEdge, type Edge, type EdgeDirection, type WalkGraph } from './edge';
export { validateModel } from './model';
export { emptyPlan, planRoute, type RouteRequest } from './plan-route';
export { availableOf, budgetStatus, computeBudget, estimateReturn, fitsWithin, reserveOf, validateBudgetInputs } from './budget';
export { assessReach, buildReachTrees, REACH_WARNINGS, type ReachInput, type ReachTrees } from './reachability';
