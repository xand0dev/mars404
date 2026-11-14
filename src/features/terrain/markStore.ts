// Локальний стан режиму «Add mark» (F2-AC8). Не частина useMission: у store іде лише готова мітка (addAnnotation).
import { create } from 'zustand';
import type { AnnotationKind } from '../../contracts';

interface MarkState {
  adding: boolean;
  kind: AnnotationKind;
  text: string;
  /** Останнє повідомлення для live region («Mark added», «Outside the grid»). */
  message: string;
  setAdding(on: boolean): void;
  setKind(kind: AnnotationKind): void;
  setText(text: string): void;
  setMessage(message: string): void;
}

export const useMarkTool = create<MarkState>()((set) => ({
  adding: false,
  kind: 'impassable',
  text: '',
  message: '',
  setAdding: (adding) => set({ adding, message: '' }),
  setKind: (kind) => set({ kind }),
  setText: (text) => set({ text }),
  setMessage: (message) => set({ message }),
}));
