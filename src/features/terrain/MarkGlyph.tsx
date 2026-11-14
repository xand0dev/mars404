// Знаки міток екіпажу (SPEC §7.11): непрохідно — трикутник з хрестом, небезпечно — трикутник,
// нотатка — прапорець-контур, план — прапорець із заливкою. Колір лише доповнює форму.
import type { Annotation, AnnotationKind } from '../../contracts';
import { MARK_COLOR, MARK_LABEL, markLabel } from './lib/marks';

function Glyph({ kind }: { kind: AnnotationKind }) {
  const c = MARK_COLOR[kind];
  switch (kind) {
    case 'impassable':
      return (
        <>
          <polygon points="0,-9 9.5,7.5 -9.5,7.5" fill={c} stroke={c} strokeWidth={2} strokeLinejoin="round" />
          <path d="M-3.5,-1 L3.5,5.5 M3.5,-1 L-3.5,5.5" stroke="#14100e" strokeWidth={2.2} strokeLinecap="round" />
        </>
      );
    case 'hazard':
      return <polygon points="0,-9 9.5,7.5 -9.5,7.5" fill="none" stroke={c} strokeWidth={2.2} strokeLinejoin="round" />;
    case 'note':
    case 'plan':
      return (
        <>
          <path d="M-6,10 L-6,-10" stroke={c} strokeWidth={2.2} strokeLinecap="round" />
          <path d="M-6,-10 L8,-5 L-6,0 Z" fill={kind === 'plan' ? c : 'none'} stroke={c} strokeWidth={2} strokeLinejoin="round" />
        </>
      );
  }
}

/** Знак у власному <svg> (панель, легенда). */
export function MarkGlyphIcon({ kind, size = 20, label }: { kind: AnnotationKind; size?: number; label?: string }) {
  const name = label ?? `${MARK_LABEL[kind]} mark`;
  return (
    <svg width={size} height={size} viewBox="-12 -12 24 24" {...(name ? { role: 'img', 'aria-label': name } : { 'aria-hidden': true })} focusable="false" style={{ flex: 'none', overflow: 'visible' }}>
      <Glyph kind={kind} />
    </svg>
  );
}

/** Мітка на 2D-плані: зона радіусу пунктиром і знак у центрі. */
export function MarkShape({ mark, x, y, rUnits, size }: { mark: Annotation; x: number; y: number; rUnits: number; size: number }) {
  const c = MARK_COLOR[mark.kind];
  return (
    <g data-kind="mark" data-mark-kind={mark.kind} role="img" aria-label={markLabel(mark)}>
      {rUnits > 0 && <circle cx={x} cy={y} r={rUnits} fill={mark.kind === 'impassable' ? c : 'none'} fillOpacity={0.18} stroke={c} strokeWidth={size * 0.06} strokeDasharray={`${size * 0.25} ${size * 0.18}`} />}
      <g transform={`translate(${x} ${y}) scale(${size / 24})`}>
        <Glyph kind={mark.kind} />
      </g>
    </g>
  );
}

