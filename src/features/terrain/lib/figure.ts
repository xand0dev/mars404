// Хто йде маршрутом у прогулянці: пішки — астронавт, на ровері — марсохід (режим з панелі Route, store.travelMode).
import type { TravelMode } from '../../../core';

export interface FigureSpec {
  kind: 'astronaut' | 'rover';
  /** Реальний розмір моделі вздовж осі: зріст астронавта або ширина колісної бази Curiosity (~2,7 м, NASA). */
  size: { axis: 'x' | 'y'; meters: number };
  /** Чи є кліпи ходи (Idle / Walk / Run) */
  animated: boolean;
}

const ASTRONAUT: FigureSpec = { kind: 'astronaut', size: { axis: 'y', meters: 1.85 }, animated: true };
const ROVER: FigureSpec = { kind: 'rover', size: { axis: 'x', meters: 2.7 }, animated: false };

export const figureFor = (mode: TravelMode): FigureSpec => (mode === 'rover' ? ROVER : ASTRONAUT);
