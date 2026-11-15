import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Annotation, AnnotationsFile, Region } from '../../contracts';
import { resetMission, useMission } from '../../store/useMission';
import { NotesPanel } from './NotesPanel';
import { STORAGE_KEY } from './storage';

const st = () => useMission.getState();
const old: Annotation = { id: 'old-1', kind: 'impassable', coordinates: [5, 5], radiusM: 20, text: 'soft sand trap', createdAt: '2026-11-13T09:30:00.000Z', origin: 'this-eva' };

beforeEach(() => {
  localStorage.clear();
  resetMission();
  st().setAnnotations([]);
});
afterEach(() => vi.restoreAllMocks());

const openGale = () => st().setSite('gale');

async function addMark(user: ReturnType<typeof userEvent.setup>, kind: string, text: string) {
  await user.selectOptions(screen.getByLabelText('Mark type'), kind);
  await user.clear(screen.getByLabelText('Mark text'));
  await user.type(screen.getByLabelText('Mark text'), text);
  await user.click(screen.getByRole('button', { name: 'Add mark' }));
}

const list = () => screen.getByRole('list', { name: 'Crew marks' });

describe('F1-AC6 · Given Gale не відкрито', () => {
  it('Then панель лише підказує відкрити Gale, форми немає', () => {
    render(<NotesPanel />);
    expect(screen.getByText(/Open Gale/)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Add mark' })).toBeNull();
  });
});

describe('F1-AC6 · додати й видалити', () => {
  it('Given Gale; When додано мітку; Then addAnnotation у позиції екіпажу, список показує вид, текст, час і origin', async () => {
    const user = userEvent.setup();
    openGale();
    render(<NotesPanel />);
    await addMark(user, 'hazard', 'loose boulders');
    const a = st().annotations[0]!;
    expect(a).toMatchObject({ kind: 'hazard', text: 'loose boulders', radiusM: 20, origin: 'this-eva' });
    expect(a.coordinates).toEqual(st().position ?? st().base);
    expect(Number.isNaN(Date.parse(a.createdAt))).toBe(false);
    const item = within(list()).getByRole('listitem');
    expect(item).toHaveTextContent('Hazard');
    expect(item).toHaveTextContent('loose boulders');
    expect(item).toHaveTextContent(a.createdAt.slice(11, 16));
    expect(item).toHaveTextContent('this EVA');
    expect(screen.getByText(/20 m radius — assumption/)).toBeInTheDocument();
  });

  it('When натиснуто Remove; Then removeAnnotation і рядок зник', async () => {
    const user = userEvent.setup();
    openGale();
    st().setAnnotations([old]);
    render(<NotesPanel />);
    await user.click(within(list()).getByRole('button', { name: /Remove/ }));
    expect(st().annotations).toEqual([]);
    expect(screen.getByText(/No marks yet/)).toBeInTheDocument();
  });

  it('порожній текст — кнопка Add mark недоступна', () => {
    openGale();
    render(<NotesPanel />);
    expect(screen.getByRole('button', { name: 'Add mark' })).toBeDisabled();
  });
});

describe('F1-AC6 · переживають перезавантаження', () => {
  it('Given мітку додано; When панель змонтовано заново з порожнім store; Then мітку відновлено з localStorage', async () => {
    const user = userEvent.setup();
    openGale();
    const { unmount } = render(<NotesPanel />);
    await addMark(user, 'note', 'good panorama spot');
    expect(localStorage.getItem(STORAGE_KEY)).toContain('good panorama spot');
    unmount();
    st().setAnnotations([]); // «перезавантаження»: store порожній
    render(<NotesPanel />);
    await waitFor(() => expect(st().annotations.map((m) => m.text)).toEqual(['good panorama spot']));
    expect(within(list()).getByRole('listitem')).toHaveTextContent('this EVA');
  });

  it('Given localStorage кидає; Then додавання працює без збереження', async () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('blocked');
    });
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('blocked');
    });
    const user = userEvent.setup();
    openGale();
    render(<NotesPanel />);
    await addMark(user, 'plan', 'sample next EVA');
    expect(st().annotations).toHaveLength(1);
  });
});

describe('F1-AC6 · експорт', () => {
  it('When Export marks; Then завантажується AnnotationsFile JSON', async () => {
    let blob: Blob | undefined;
    const create = vi.fn((b: Blob) => {
      blob = b;
      return 'blob:marks';
    });
    Object.assign(URL, { createObjectURL: create, revokeObjectURL: vi.fn() });
    const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (this: HTMLAnchorElement) {
      expect(this.download).toMatch(/^mars404-marks-gale-.*\.json$/);
      expect(this.href).toBe('blob:marks');
    });
    const user = userEvent.setup();
    openGale();
    st().setAnnotations([old]);
    render(<NotesPanel />);
    await user.click(screen.getByRole('button', { name: 'Export marks' }));
    expect(click).toHaveBeenCalledOnce();
    const file = JSON.parse(await blob!.text()) as AnnotationsFile;
    expect(file).toMatchObject({ schemaVersion: 1, site: 'gale', annotations: [old] });
    expect(Number.isNaN(Date.parse(file.exportedAt))).toBe(false);
  });

  it('без міток Export недоступний', () => {
    openGale();
    render(<NotesPanel />);
    expect(screen.getByRole('button', { name: 'Export marks' })).toBeDisabled();
  });
});

describe('F1-AC6 · імпорт', () => {
  const fileOf = (text: string) => new File([text], 'marks.json', { type: 'application/json' });

  it('When імпортовано валідний файл; Then мітки додано з origin = imported, поточні лишились', async () => {
    const user = userEvent.setup();
    openGale();
    st().setAnnotations([old]);
    render(<NotesPanel />);
    const prev: Annotation = { ...old, id: 'prev-1', kind: 'note', text: 'from EVA 1' };
    const json = JSON.stringify({ schemaVersion: 1, site: 'gale', exportedAt: '2026-11-13T18:00:00.000Z', annotations: [prev] });
    await user.upload(screen.getByLabelText('Import marks'), fileOf(json));
    await waitFor(() => expect(st().annotations.map((m) => [m.id, m.origin])).toEqual([['old-1', 'this-eva'], ['prev-1', 'imported']]));
    expect(within(list()).getAllByRole('listitem')[1]).toHaveTextContent('imported');
    expect(screen.queryByRole('alert')).toBeNull();
  });

  it('When імпортовано невалідний файл; Then помилка, мітки не змінено', async () => {
    const user = userEvent.setup();
    openGale();
    st().setAnnotations([old]);
    render(<NotesPanel />);
    const before = st().annotations;
    await user.upload(screen.getByLabelText('Import marks'), fileOf('{"schemaVersion":1,"site":"gale","annotations":[{"id":"x"}]}'));
    expect(await screen.findByRole('alert')).toHaveTextContent(/Import failed/);
    expect(st().annotations).toBe(before);
  });
});

describe('#105 · overview', () => {
  it('Given відкрито overview-район; Then форми міток немає, лише підказка', () => {
    st().setSite('olympus-mons');
    useMission.setState({ region: { kind: 'overview' } as Region });
    render(<NotesPanel />);
    expect(screen.getByText(/Overview — terrain only/)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Export marks/ })).not.toBeInTheDocument();
  });
});
