// Панель «Add mark» (F2-AC8, SPEC §7.12): вид мітки, текст, режим кліку по карті й шлях з клавіатури.
import type { AnnotationKind } from '../../contracts';
import { MARK_KINDS, MARK_LABEL } from './lib/marks';
import { MarkGlyphIcon } from './MarkGlyph';
import { useMarkTool } from './markStore';

export interface MarkToolsProps {
  /** Поставити мітку в середину обраного відрізка (шлях з клавіатури); null — відрізок не обрано. */
  onMarkSegment: (() => void) | null;
}

export function MarkTools({ onMarkSegment }: MarkToolsProps) {
  const { adding, kind, text, message, setAdding, setKind, setText } = useMarkTool();
  return (
    <div className="terrain-marks" role="group" aria-label="Crew map marks">
      <button type="button" aria-pressed={adding} onClick={() => setAdding(!adding)}>
        {adding ? 'Adding marks: click the map' : 'Add mark'}
      </button>
      <label className="terrain-marks__field">
        <span>Kind</span>
        <select id="mark-kind" value={kind} onChange={(e) => setKind(e.target.value as AnnotationKind)}>
          {MARK_KINDS.map((k) => (
            <option key={k} value={k}>
              {MARK_LABEL[k]}
            </option>
          ))}
        </select>
      </label>
      <MarkGlyphIcon kind={kind} />
      <label className="terrain-marks__field">
        <span>Note</span>
        <input id="mark-text" type="text" value={text} maxLength={80} placeholder="soft sand trap" onChange={(e) => setText(e.target.value)} />
      </label>
      <button type="button" onClick={() => onMarkSegment?.()} disabled={!onMarkSegment} title={onMarkSegment ? undefined : 'Select a route segment first'}>
        Mark selected segment
      </button>
      <span className="terrain-marks__msg" role="status">
        {message}
      </span>
    </div>
  );
}
