// Локальний стан F3 (не shared store): фаза завантаження й помилки окремих шарів (F3-AC4).
import { create } from 'zustand';
import type { LayerIssue } from './loadRegion';

export interface DataStatus {
  /** idle — район не відкрито; real — сітка в store; mock — у store лишився mock */
  phase: 'idle' | 'loading' | 'real' | 'mock';
  reason?: string;
  issues: LayerIssue[];
  warnings: string[];
}

const initial = (): DataStatus => ({ phase: 'idle', issues: [], warnings: [] });

export const useDataStatus = create<DataStatus>()(() => initial());

export function resetDataStatus(): void {
  useDataStatus.setState(initial(), true);
}
