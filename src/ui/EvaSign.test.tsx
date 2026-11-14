import { render, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { EvaLegend, EvaSign, EvaSignShape } from './EvaSign';
import { EVA_SIGN_KINDS, evaSignLabel, type EvaSignKind } from './evaSignLabels';

// F7-AC8 (SPEC §7.11): форма — тип, заливка / контур / пунктир — стан, колір лише доповнює.
const ALL: { kind: EvaSignKind; state?: 'selected' | 'unselected' | 'outside'; level?: 'high' | 'low' }[] = [
  { kind: 'base' },
  { kind: 'target', state: 'selected' },
  { kind: 'target', state: 'unselected' },
  { kind: 'target', state: 'outside' },
  { kind: 'hazard', level: 'high' },
  { kind: 'hazard', level: 'low' },
  { kind: 'nodata' },
  { kind: 'astronaut' },
  { kind: 'ponr' },
  { kind: 'photo' },
];

const shapeOf = (svg: Element) => svg.querySelector('[data-shape]') as SVGElement;

describe('F7-AC8 · EvaSign — знак для кожного типу й стану', () => {
  it('є всі 7 типів §7.11', () => {
    expect([...EVA_SIGN_KINDS].sort()).toEqual(['astronaut', 'base', 'hazard', 'nodata', 'photo', 'ponr', 'target']);
  });

  it('кожен тип і стан має role="img" і власний aria-label', () => {
    const labels = new Set<string>();
    for (const p of ALL) {
      const { unmount } = render(<EvaSign {...p} />);
      const img = screen.getByRole('img');
      const label = img.getAttribute('aria-label') ?? '';
      expect(label.length).toBeGreaterThan(0);
      expect(label).toBe(evaSignLabel(p.kind, p.state, p.level));
      labels.add(label);
      unmount();
    }
    expect(labels.size).toBe(ALL.length);
  });

  it('тип задає форму: квадрат, коло, трикутник, ромб, шеврон, рамка', () => {
    const shape = (p: (typeof ALL)[number]) => {
      const { container, unmount } = render(<EvaSign {...p} />);
      const s = shapeOf(container);
      const r = { tag: s.tagName.toLowerCase(), shape: s.getAttribute('data-shape') };
      unmount();
      return r;
    };
    expect(shape({ kind: 'base' })).toEqual({ tag: 'rect', shape: 'square' });
    expect(shape({ kind: 'target', state: 'selected' })).toEqual({ tag: 'circle', shape: 'circle' });
    expect(shape({ kind: 'hazard', level: 'high' })).toEqual({ tag: 'polygon', shape: 'triangle' });
    expect(shape({ kind: 'nodata' })).toEqual({ tag: 'polygon', shape: 'diamond' });
    expect(shape({ kind: 'ponr' })).toEqual({ tag: 'polygon', shape: 'diamond' });
    expect(shape({ kind: 'astronaut' })).toEqual({ tag: 'path', shape: 'chevron' });
    expect(shape({ kind: 'photo' })).toEqual({ tag: 'rect', shape: 'frame' });
  });

  it('стан цілі видно без кольору: заливка / контур / пунктир і «!»', () => {
    const { container: a } = render(<EvaSign kind="target" state="selected" />);
    const { container: b } = render(<EvaSign kind="target" state="unselected" />);
    const { container: c } = render(<EvaSign kind="target" state="outside" />);
    expect(shapeOf(a).getAttribute('fill')).toBe('currentColor');
    expect(shapeOf(b).getAttribute('fill')).toBe('none');
    expect(shapeOf(c).getAttribute('fill')).toBe('none');
    expect(shapeOf(c).getAttribute('stroke-dasharray')).toBeTruthy();
    expect(c.querySelector('text')?.textContent).toBe('!');
    expect(a.querySelector('text')).toBeNull();
  });

  it('рівень небезпеки — заливка або контур', () => {
    const { container: hi } = render(<EvaSign kind="hazard" level="high" />);
    const { container: lo } = render(<EvaSign kind="hazard" level="low" />);
    expect(shapeOf(hi).getAttribute('fill')).toBe('currentColor');
    expect(shapeOf(lo).getAttribute('fill')).toBe('none');
  });

  it('NoData — ромб із «?», точка неповернення — ромб із «!»; різні знаки, хоч форма та сама', () => {
    const { container: nd } = render(<EvaSign kind="nodata" />);
    const { container: pn } = render(<EvaSign kind="ponr" />);
    expect(nd.querySelector('text')?.textContent).toBe('?');
    expect(pn.querySelector('text')?.textContent).toBe('!');
  });

  it('шеврон астронавта повертається за напрямком руху (heading, ° від півночі)', () => {
    const { container } = render(<EvaSign kind="astronaut" heading={90} />);
    expect(shapeOf(container).getAttribute('transform')).toBe('rotate(90)');
  });

  it('розмір і власна назва — додаткові пропи', () => {
    render(<EvaSign kind="target" state="selected" size={32} label="Target Bonanza King, selected" />);
    const img = screen.getByRole('img', { name: 'Target Bonanza King, selected' });
    expect(img).toHaveAttribute('width', '32');
    expect(img).toHaveAttribute('height', '32');
  });

  it('класи для кольору з токенів: колір лише доповнює форму', () => {
    const { container } = render(<EvaSign kind="ponr" />);
    expect(container.querySelector('svg')).toHaveClass('eva-sign', 'eva-sign--ponr');
  });
});

describe('F7-AC8 · EvaSignShape — той самий знак усередині чужого <svg> (2D-план F2)', () => {
  it('рендерить <g> з позицією, масштабом і aria-label', () => {
    render(
      <svg>
        <EvaSignShape kind="base" x={100} y={50} size={12} />
      </svg>,
    );
    const g = screen.getByRole('img', { name: evaSignLabel('base') });
    expect(g.tagName.toLowerCase()).toBe('g');
    expect(g.getAttribute('transform')).toBe('translate(100 50) scale(0.5)');
    expect(g.querySelector('[data-shape="square"]')).not.toBeNull();
  });

  it('геометрія така сама, як в окремого знака', () => {
    const { container: a } = render(<EvaSign kind="target" state="outside" />);
    const { container: b } = render(
      <svg>
        <EvaSignShape kind="target" state="outside" x={0} y={0} />
      </svg>,
    );
    expect(shapeOf(b).outerHTML).toBe(shapeOf(a).outerHTML);
  });
});

describe('F7-AC8 · EvaLegend — однакова легенда для HUD, карти й списку цілей', () => {
  it('показує кожен знак і його назву текстом', () => {
    render(<EvaLegend />);
    const list = screen.getByRole('list', { name: 'Map legend' });
    const items = within(list).getAllByRole('listitem');
    expect(items).toHaveLength(ALL.length);
    for (const p of ALL) expect(within(list).getByText(evaSignLabel(p.kind, p.state, p.level))).toBeInTheDocument();
  });

  it('можна показати лише потрібні знаки', () => {
    render(<EvaLegend kinds={['base', 'ponr']} />);
    expect(screen.getAllByRole('listitem')).toHaveLength(2);
  });
});
