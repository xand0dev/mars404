// F7-AC6 (SPEC §7.8): рядок точки неповернення в HUD. Нічого не рахує — показує reach.abort від F5.
import type { AbortPlan, ModelParams } from '../../contracts';
import { formatAmount, formatMinutes } from '../../ui';

export interface AbortLine {
  /** ponr — є точка неповернення; clear — повернення можливе з усього маршруту */
  kind: 'ponr' | 'clear';
  text: string;
  emergency: string;
  /** аварійний запас без перевіреного джерела → на екрані «assumption» (§7.6) */
  assumption: boolean;
}

export function abortLine(abort: AbortPlan | null, model: Pick<ModelParams, 'evidence'>): AbortLine | null {
  if (!abort) return null;
  const assumption = model.evidence.emergencyO2G?.status !== 'verified';
  const emergency = `Emergency O₂ reserve ${formatAmount(abort.emergencyO2G, 'g')}`;
  if (abort.pointOfNoReturnS === null) return { kind: 'clear', text: 'Return possible along the whole route', emergency, assumption };
  return { kind: 'ponr', text: `Point of no return in ${formatMinutes(abort.pointOfNoReturnS)} min`, emergency, assumption };
}
