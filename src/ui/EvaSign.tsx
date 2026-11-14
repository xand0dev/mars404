// EVA-символіка (F7, SPEC §7.11). Знаки однакові в HUD, 2D-плані, підписах 3D і списках.
// Форма — тип, заливка / контур / пунктир — стан, колір (з токенів, класи eva-sign--*) лише доповнює.
import {
  EVA_LEGEND_ITEMS,
  evaSignLabel,
  type EvaHazardLevel,
  type EvaSignKind,
  type EvaTargetState,
} from './evaSignLabels';

export interface EvaSignBaseProps {
  kind: EvaSignKind;
  /** Для target. */
  state?: EvaTargetState;
  /** Для hazard. */
  level?: EvaHazardLevel;
  /** Для astronaut: напрямок руху, ° від півночі за годинниковою стрілкою. */
  heading?: number;
  /** Власна доступна назва (наприклад, з іменем цілі). Порожній рядок — декоративний знак поруч із текстом (aria-hidden). */
  label?: string;
}

export interface EvaSignProps extends EvaSignBaseProps {
  /** Розмір у px (ширина = висота). */
  size?: number;
  className?: string;
}

export interface EvaSignShapeProps extends EvaSignBaseProps {
  /** Центр знака в координатах батьківського <svg>. */
  x: number;
  y: number;
  /** Розмір у одиницях батьківського <svg>. */
  size?: number;
}

const VIEW = 24; // viewBox -12…12
const STROKE = 2;
const DIAMOND = '0,-10 10,0 0,10 -10,0';

/** Геометрія знака в системі -12…12; однакова для <EvaSign> і <EvaSignShape>. */
function Glyph({ kind, state = 'unselected', level = 'high', heading = 0 }: EvaSignBaseProps) {
  const solid = { fill: 'currentColor', stroke: 'currentColor', strokeWidth: STROKE };
  const outline = { fill: 'none', stroke: 'currentColor', strokeWidth: STROKE };
  const mark = (ch: string) => (
    <text x="0" y="0.5" textAnchor="middle" dominantBaseline="central" fontSize="13" fontWeight="700" className="eva-sign__mark">
      {ch}
    </text>
  );
  switch (kind) {
    case 'base':
      return <rect data-shape="square" x="-8" y="-8" width="16" height="16" {...solid} />;
    case 'target':
      if (state === 'selected') return <circle data-shape="circle" r="8" {...solid} />;
      if (state === 'outside')
        return (
          <>
            <circle data-shape="circle" r="9" {...outline} strokeDasharray="3 2.5" />
            {mark('!')}
          </>
        );
      return <circle data-shape="circle" r="8" {...outline} />;
    case 'hazard':
      return <polygon data-shape="triangle" points="0,-9 9.5,7.5 -9.5,7.5" {...(level === 'high' ? solid : outline)} strokeLinejoin="round" />;
    case 'nodata':
      return (
        <>
          <polygon data-shape="diamond" points={DIAMOND} {...outline} strokeLinejoin="round" />
          {mark('?')}
        </>
      );
    case 'ponr':
      return (
        <>
          <polygon data-shape="diamond" points={DIAMOND} {...solid} strokeLinejoin="round" />
          {mark('!')}
        </>
      );
    case 'astronaut':
      return <path data-shape="chevron" d="M0,-9 L7.5,8 L0,3.5 L-7.5,8 Z" {...solid} strokeLinejoin="round" transform={`rotate(${heading})`} />;
    case 'photo':
      return (
        <>
          <rect data-shape="frame" x="-8.5" y="-7" width="17" height="14" rx="1.5" {...outline} />
          <circle r="2.5" fill="currentColor" />
        </>
      );
  }
}

const classFor = (p: EvaSignBaseProps) =>
  `eva-sign eva-sign--${p.kind}${p.kind === 'target' ? ` eva-sign--${p.state ?? 'unselected'}` : ''}${p.kind === 'hazard' ? ` eva-sign--${p.level ?? 'high'}` : ''}`;

/** Окремий знак: HUD, списки, легенди. */
export function EvaSign({ size = 20, className, label, ...p }: EvaSignProps) {
  const name = label ?? evaSignLabel(p.kind, p.state, p.level);
  return (
    <svg
      className={`${classFor(p)}${className ? ` ${className}` : ''}`}
      width={size}
      height={size}
      viewBox={`${-VIEW / 2} ${-VIEW / 2} ${VIEW} ${VIEW}`}
      {...(name ? { role: 'img', 'aria-label': name } : { 'aria-hidden': true })}
      focusable="false"
    >
      <Glyph {...p} />
    </svg>
  );
}

/** Той самий знак як <g> усередині чужого <svg> (2D-план F2). */
export function EvaSignShape({ x, y, size = VIEW, label, ...p }: EvaSignShapeProps) {
  const name = label ?? evaSignLabel(p.kind, p.state, p.level);
  return (
    <g className={classFor(p)} transform={`translate(${x} ${y}) scale(${size / VIEW})`} role="img" aria-label={name}>
      <Glyph {...p} />
    </g>
  );
}

export interface EvaLegendProps {
  /** Які типи показати; без пропа — усі типи й стани. */
  kinds?: readonly EvaSignKind[];
  size?: number;
}

/** Легенда знаків — однакова для HUD, легенди карти (F2) і списку цілей (F6). */
export function EvaLegend({ kinds, size = 18 }: EvaLegendProps) {
  const items = kinds ? EVA_LEGEND_ITEMS.filter((i) => kinds.includes(i.kind)) : EVA_LEGEND_ITEMS;
  return (
    <ul className="eva-legend" aria-label="Map legend">
      {items.map((i) => {
        const name = evaSignLabel(i.kind, i.state, i.level);
        return (
          <li key={name}>
            <EvaSign {...i} size={size} label="" />
            <span>{name}</span>
          </li>
        );
      })}
    </ul>
  );
}
