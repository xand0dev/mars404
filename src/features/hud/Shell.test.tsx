import { fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { resetMission } from '../../store/useMission';
import { GLOVE_KEY } from './glove';
import { Hud } from './Hud';
import { Shell } from './Shell';

// F7-AC9 (SPEC §7.14): режим рукавиць. Стан — лише localStorage; store не змінюється.
const page = () =>
  render(
    <Shell
      hud={<Hud />}
      map={<section aria-label="Gale terrain">map</section>}
      side={<section aria-label="Layers">layers</section>}
      bottom={<section aria-label="Route">route</section>}
    />,
  );
const toggle = () => screen.getByRole('button', { name: 'Glove mode' });

beforeEach(() => {
  resetMission();
  localStorage.clear();
});
afterEach(() => vi.restoreAllMocks());

describe('F7-AC9 · перемикач Glove mode', () => {
  it('за замовчуванням вимкнено, панелі розгорнуті', () => {
    const { container } = page();
    expect(toggle()).toHaveAttribute('aria-pressed', 'false');
    expect(container.querySelector('.shell')).not.toHaveClass('shell--glove');
    expect(screen.getByRole('region', { name: 'Layers' })).toBeVisible();
    expect(screen.queryByText('More panels')).toBeNull();
  });

  it('клік вмикає режим і пише стан у localStorage', () => {
    const { container } = page();
    fireEvent.click(toggle());
    expect(toggle()).toHaveAttribute('aria-pressed', 'true');
    expect(container.querySelector('.shell')).toHaveClass('shell--glove');
    expect(localStorage.getItem(GLOVE_KEY)).toBe('1');
    fireEvent.click(toggle());
    expect(toggle()).toHaveAttribute('aria-pressed', 'false');
    expect(localStorage.getItem(GLOVE_KEY)).toBe('0');
  });

  it('стан переживає перезавантаження', () => {
    localStorage.setItem(GLOVE_KEY, '1');
    const { container } = page();
    expect(toggle()).toHaveAttribute('aria-pressed', 'true');
    expect(container.querySelector('.shell')).toHaveClass('shell--glove');
  });

  it('недоступне сховище не ламає сторінку: режим вимкнено, перемикач працює', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('blocked');
    });
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('blocked');
    });
    page();
    expect(toggle()).toHaveAttribute('aria-pressed', 'false');
    fireEvent.click(toggle());
    expect(toggle()).toHaveAttribute('aria-pressed', 'true');
  });
});

describe('F7-AC9 · у режимі другорядне згорнуто, головне — зверху', () => {
  beforeEach(() => localStorage.setItem(GLOVE_KEY, '1'));

  it('side і bottom — у закритому «More panels», який можна розгорнути', () => {
    page();
    const more = screen.getByText('More panels').closest('details') as HTMLDetailsElement;
    expect(more.open).toBe(false);
    expect(within(more).getByRole('region', { name: 'Layers', hidden: true })).toBeInTheDocument();
    expect(within(more).getByRole('region', { name: 'Route', hidden: true })).toBeInTheDocument();
    fireEvent.click(screen.getByText('More panels'));
    expect(more.open).toBe(true);
  });

  it('рельєф лишається розгорнутим', () => {
    page();
    const map = screen.getByRole('region', { name: 'Gale terrain' });
    expect(map.closest('details')).toBeNull();
  });

  it('у HUD список станцій GO / NO-GO згорнуто, вердикт видно', () => {
    page();
    const list = screen.getByRole('list', { name: 'Station calls', hidden: true });
    expect((list.closest('details') as HTMLDetailsElement).open).toBe(false);
    expect(screen.getByTestId('gonogo-verdict')).toBeVisible();
  });

  it('«Return in» і вердикт ідуть у DOM раніше за панелі', () => {
    const { container } = page();
    const hero = container.querySelector('.hud__return') as Element;
    const verdict = screen.getByTestId('gonogo-verdict');
    const more = screen.getByText('More panels');
    expect(hero.compareDocumentPosition(more) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(verdict.compareDocumentPosition(more) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });
});
