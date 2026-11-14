// Панель «Add mark» (F2-AC8, SPEC §7.12): вид мітки, текст, режим кліку по карті й шлях з клавіатури.
import type { AnnotationKind } from '../../contracts';
import { MARK_HINT, MARK_KINDS, MARK_LABEL } from './lib/marks';
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
      {/* Вид мітки — кнопки зі знаком і назвою, під ними — що мітка робить з маршрутом. */}
      <div className="terrain-marks__kinds" role="group" aria-label="Mark kind">
        {MARK_KINDS.map((k: AnnotationKind) => (
          <button key={k} type="button" className={`terrain-marks__kind terrain-marks__kind--${k}`} aria-pressed={kind === k} onClick={() => setKind(k)}>
            <MarkGlyphIcon kind={k} size={16} label="" />
            {MARK_LABEL[k]}
          </button>
        ))}
      </div>
      <p className="terrain-marks__hint">{MARK_HINT[kind]}</p>
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
