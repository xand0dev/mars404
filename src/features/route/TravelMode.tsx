// Пішки чи на ровері (specs/F4/rover.md): перемикач для панелі й пульта та примітка про батарею ровера й walkback.
import type { RoutePlan } from '../../contracts';
import { ROVER, roverEnergyWh, type TravelMode, type TravelOption } from '../../core';

import { formatAmount, formatMinutes, StatusNote } from '../../ui';

const MODES: { mode: TravelMode; label: string }[] = [
  { mode: 'walk', label: 'On foot' },
  { mode: 'rover', label: 'Rover' },
];

/** Підсумок варіанта під назвою: час і O₂ маршруту, «Return in» як у HUD або дефіцит, батарея ровера. */
function OptionSummary({ option }: { option: TravelOption }) {
  const { totals, returnInS, deficits, roverWh } = option;
  return (
    <span className="route-mode__summary">
      <span>{formatMinutes(totals.time)} min · {formatAmount(totals.o2, 'g O₂')}</span>
      {deficits.length > 0 ? (
        <span className="route-mode__deficit">Deficit: {deficits.map((d) => DEFICIT_NAMES[d]).join(', ')}</span>
      ) : (
        <span>Return in {formatMinutes(returnInS)} min</span>
      )}
      {roverWh !== null && <span>Battery {Math.round(roverWh)} Wh</span>}
    </span>
  );
}

const DEFICIT_NAMES: Record<string, string> = { time: 'time', o2: 'O₂', energy: 'energy', dose: 'dose' };

export function TravelModeToggle({ mode, onChange, className, options = null }: {
  mode: TravelMode;
  onChange: (mode: TravelMode) => void;
  className: string;
  /** Обидва варіанти для порівняння (лише в панелі, коли є маршрут) */
  options?: Record<TravelMode, TravelOption> | null;
}) {
  return (
    <div className={className} role="group" aria-label="Travel mode">
      {MODES.map((m) => (
        <button key={m.mode} type="button" aria-pressed={mode === m.mode} onClick={() => onChange(m.mode)}>
          <span className="route-mode__label">{m.label}</span>
          {options && <OptionSummary option={options[m.mode]} />}
        </button>
      ))}
    </div>
  );
}

export function RoverNote({ plan }: { plan: RoutePlan | null }) {
  const usedWh = roverEnergyWh(plan);
  const overBattery = usedWh !== null && usedWh > ROVER.batteryWh;
  return (
    <>
      <StatusNote level="info">
        Rover: {ROVER.speedMps} m/s, crew O₂ {ROVER.o2GPerSRiding} g/s while riding; slope and soil penalties as for walking. If the rover fails, return is checked on foot from every point (walkback).
        {usedWh !== null && !overBattery && <> Rover battery: {Math.round(usedWh)} Wh of {ROVER.batteryWh} Wh.</>} Apollo LRV data — assumption for Mars.
      </StatusNote>
      {overBattery && (
        <StatusNote level="danger" live="alert">
          Route exceeds the rover battery: {Math.round(usedWh)} Wh of {ROVER.batteryWh} Wh. Shorten the route or go on foot.
        </StatusNote>
      )}
    </>
  );
}
