import { fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act } from 'react';
import { resetMission, useMission } from '../../store/useMission';
import { Panel } from '../../ui';
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
      status={<section aria-label="Route">route</section>}
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

  it('план і стан — у закритому «More panels», який можна розгорнути', () => {
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

// T23–T24: права колонка — панелі, що згортаються; відкрита та, що потрібна для наступного кроку.
describe('права колонка: панелі згортаються, відкрита панель кроку', () => {
  const panels = () =>
    render(
      <Shell
        hud={<p>hud</p>}
        map={<p>map</p>}
        side={
          <>
            <Panel title="Location" featureId="F1" owner="Іван">loc</Panel>
            <Panel title="Layers" featureId="F3" owner="Максим">layers</Panel>
            <Panel title="Science targets" featureId="F6" owner="Настя">targets</Panel>
          </>
        }
        status={<Panel title="Resources" featureId="F5" owner="Влад">res</Panel>}
      />,
    );
  const expanded = (name: string) => screen.getByRole('button', { name }).getAttribute('aria-expanded');

  it('без сайту відкриті Location і Resources, решта згорнута; кроки демо в шапці', () => {
    panels();
    expect(expanded('Location')).toBe('true');
    expect(expanded('Resources')).toBe('true');
    expect(expanded('Layers')).toBe('false');
    expect(expanded('Science targets')).toBe('false');
    expect(within(screen.getByRole('list', { name: 'Demo steps' })).getByText('Location').closest('li')).toHaveAttribute('aria-current', 'step');
  });

  it('обрали сайт → відкрита Science targets; клік по заголовку перемикає панель', () => {
    panels();
    act(() => useMission.setState({ site: 'gale' }));
    expect(expanded('Location')).toBe('false');
    expect(expanded('Science targets')).toBe('true');
    fireEvent.click(screen.getByRole('button', { name: 'Layers' }));
    expect(expanded('Layers')).toBe('true');
  });
});

// UX: перший візит — підказка «How it works» з 4 кроками; «Got it» ховає її назавжди, кнопка в шапці відкриває знову.
describe('підказка першого візиту', () => {
  const dialog = () => screen.queryByRole('dialog', { name: 'Plan a walk on Mount Sharp in 4 steps' });

  it('перший візит → підказка з 4 кроками, поточний — Location', () => {
    page();
    expect(dialog()).toBeInTheDocument();
    const steps = within(dialog() as HTMLElement).getAllByRole('listitem');
    expect(steps).toHaveLength(4);
    expect(steps[0]).toHaveAttribute('aria-current', 'step');
  });

  it('«Got it» ховає й запам\'ятовує; після перезавантаження підказки немає; «How it works» відкриває знову', () => {
    const { unmount } = page();
    fireEvent.click(screen.getByRole('button', { name: 'Got it' }));
    expect(dialog()).toBeNull();
    expect(localStorage.getItem('mars404.onboarded')).toBe('1');
    unmount();
    page();
    expect(dialog()).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'How it works' }));
    expect(dialog()).toBeInTheDocument();
  });

  it('Escape закриває підказку', () => {
    page();
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(dialog()).toBeNull();
  });
});
