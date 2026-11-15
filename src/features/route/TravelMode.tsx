// Пішки чи на ровері (specs/F4/rover.md): перемикач для панелі й пульта та примітка про батарею ровера й walkback.
import type { RoutePlan } from '../../contracts';
import { ROVER, roverEnergyWh, type TravelMode } from '../../core';
import { StatusNote } from '../../ui';

const MODES: { mode: TravelMode; label: string }[] = [
  { mode: 'walk', label: 'On foot' },
  { mode: 'rover', label: 'Rover' },
];

export function TravelModeToggle({ mode, onChange, className }: { mode: TravelMode; onChange: (mode: TravelMode) => void; className: string }) {
  return (
    <div className={className} role="group" aria-label="Travel mode">
      {MODES.map((m) => (
        <button key={m.mode} type="button" aria-pressed={mode === m.mode} onClick={() => onChange(m.mode)}>
          {m.label}
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
