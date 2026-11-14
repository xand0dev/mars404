// «Crew map notes» — жива карта (SPEC §7.12, F1-AC6): список міток, збереження в браузері, експорт / імпорт JSON.
import { useEffect, useId, useState, type ChangeEvent, type FormEvent } from 'react';
import type { Annotation, AnnotationKind } from '../../contracts';
import { useMission } from '../../store/useMission';
import { Panel, StatusNote } from '../../ui';
import { ANNOTATION_KINDS, mergeImported, parseAnnotationsFile, toAnnotationsFile } from './annotationsFile';
import { loadStoredAnnotations, saveStoredAnnotations } from './storage';
import './notes.css';

/** Радіус мітки з панелі за замовчуванням, м — assumption (SPEC §7.12). */
export const DEFAULT_RADIUS_M = 20;

const KIND_LABEL: Record<AnnotationKind, string> = { impassable: 'Blocked', hazard: 'Hazard', note: 'Note', plan: 'Plan' };
const KIND_ICON: Record<AnnotationKind, string> = { impassable: '⛔', hazard: '⚠', note: '⚑', plan: '☐' };
const ORIGIN_LABEL: Record<Annotation['origin'], string> = { 'this-eva': 'this EVA', imported: 'imported' };

let seq = 0;
const newId = () => (globalThis.crypto?.randomUUID?.() ?? `m-${Date.now().toString(36)}-${(seq++).toString(36)}`);

/** Час UTC «YYYY-MM-DD HH:MM UTC»; невалідний — як є. */
function formatTime(iso: string): string {
  const t = Date.parse(iso);
  return Number.isNaN(t) ? iso : `${new Date(t).toISOString().slice(0, 16).replace('T', ' ')} UTC`;
}

/** Відновлення після перезавантаження і запис кожної зміни в localStorage. */
function usePersistAnnotations() {
  useEffect(() => {
    const { annotations, setAnnotations } = useMission.getState();
    if (annotations.length === 0) {
      const stored = loadStoredAnnotations();
      if (stored.length > 0) setAnnotations(stored);
    }
    return useMission.subscribe((s, prev) => {
      if (s.annotations !== prev.annotations) saveStoredAnnotations(s.annotations);
    });
  }, []);
}

export function NotesPanel() {
  usePersistAnnotations();
  const site = useMission((s) => s.site);
  return (
    <Panel title="Crew map notes" featureId="F1" owner="Іван" id="notes">
      {site === 'gale' ? <NotesBody /> : <p className="ui-stub">Open Gale / Mount Sharp to add and share crew marks.</p>}
    </Panel>
  );
}

function NotesBody() {
  const annotations = useMission((s) => s.annotations);
  const at = useMission((s) => s.position ?? s.base);
  const addAnnotation = useMission((s) => s.addAnnotation);
  const removeAnnotation = useMission((s) => s.removeAnnotation);
  const setAnnotations = useMission((s) => s.setAnnotations);
  const [kind, setKind] = useState<AnnotationKind>('hazard');
  const [text, setText] = useState('');
  const [importMsg, setImportMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const uid = useId();

  const canAdd = text.trim() !== '' && at !== null;

  const add = (e: FormEvent) => {
    e.preventDefault();
    if (!canAdd || !at) return;
    addAnnotation({ id: newId(), kind, coordinates: [at[0], at[1]], radiusM: DEFAULT_RADIUS_M, text: text.trim(), createdAt: new Date().toISOString(), origin: 'this-eva' });
    setText('');
  };

  const exportMarks = () => {
    const file = toAnnotationsFile('gale', annotations);
    const url = URL.createObjectURL(new Blob([JSON.stringify(file, null, 2)], { type: 'application/json' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = `mars404-marks-gale-${file.exportedAt.replace(/[:.]/g, '-')}.json`;
    document.body.append(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 0);
  };

  const importMarks = async (e: ChangeEvent<HTMLInputElement>) => {
    const input = e.currentTarget;
    const f = input.files?.[0];
    if (!f) return;
    const res = parseAnnotationsFile(await f.text());
    input.value = '';
    if (!res.ok) {
      setImportMsg({ ok: false, text: `Import failed: ${res.error}. Marks unchanged.` });
      return;
    }
    setAnnotations(mergeImported(useMission.getState().annotations, res.annotations));
    setImportMsg({ ok: true, text: `Imported ${res.annotations.length} mark(s).` });
  };

  return (
    <div className="notes">
      <form className="notes__form" onSubmit={add}>
        <label htmlFor={`${uid}-kind`}>Mark type</label>
        <select id={`${uid}-kind`} value={kind} onChange={(e) => setKind(e.target.value as AnnotationKind)}>
          {ANNOTATION_KINDS.map((k) => (
            <option key={k} value={k}>
              {KIND_LABEL[k]}
            </option>
          ))}
        </select>
        <label htmlFor={`${uid}-text`}>Mark text</label>
        <input id={`${uid}-text`} type="text" value={text} maxLength={200} onChange={(e) => setText(e.target.value)} placeholder="e.g. loose sand, sink-in" />
        <button type="submit" disabled={!canAdd}>
          Add mark
        </button>
      </form>
      <p className="notes__hint">
        Placed at the crew position, {DEFAULT_RADIUS_M} m radius — assumption. Marks are crew observations, not NASA data. Blocked and hazard marks rebuild the route.
      </p>

      {annotations.length === 0 ? (
        <p className="ui-stub">No marks yet.</p>
      ) : (
        <ul className="notes__list" aria-label="Crew marks">
          {annotations.map((a) => (
            <li key={a.id} className={`notes__item notes__item--${a.kind}`}>
              <span className="notes__kind">
                <span aria-hidden="true">{KIND_ICON[a.kind]}</span> {KIND_LABEL[a.kind]}
              </span>
              <span className="notes__text">{a.text || '—'}</span>
              <span className="notes__meta">
                <time dateTime={a.createdAt}>{formatTime(a.createdAt)}</time> · <span className="notes__origin">origin: {ORIGIN_LABEL[a.origin]}</span>
              </span>
              <button type="button" onClick={() => removeAnnotation(a.id)} aria-label={`Remove ${KIND_LABEL[a.kind]} mark: ${a.text}`}>
                Remove
              </button>
            </li>
          ))}
        </ul>
      )}

      <div className="notes__io">
        <button type="button" onClick={exportMarks} disabled={annotations.length === 0}>
          Export marks
        </button>
        <label className="notes__import">
          Import marks
          <input type="file" accept="application/json,.json" onChange={importMarks} />
        </label>
      </div>
      {importMsg &&
        (importMsg.ok ? (
          <StatusNote level="ok" live="status">
            {importMsg.text}
          </StatusNote>
        ) : (
          <StatusNote level="danger" live="alert">
            {importMsg.text}
          </StatusNote>
        ))}
    </div>
  );
}
