// Пульт EVA, половина F4: крок по відрізках і «Build route» біля нижнього краю планшета; у шторці — коротко про маршрут; підшторка — знімок відрізка.
import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import type { AbortPlan, RoutePlan, Segment, TargetPhoto } from '../../contracts';
import { STATUS_ICON, formatMinutes } from '../../ui';
import { formatRisks } from './segment-risk';
import type { PhotoLocation } from './surface-photo';
import { legSummaries } from './traverse-legs';

export interface DockPhoto {
  photo: Pick<TargetPhoto, 'url' | 'alt' | 'credit' | 'sol' | 'sourceUrl'>;
  distanceM: number;
  location: PhotoLocation;
  camera?: string;
}

interface RouteDockProps {
  plan: RoutePlan | null;
  selectedSegment: number | null;
  onSelect: (segment: number) => void;
  onBuild: () => void;
  canBuild: boolean;
  /** Причини ризику по відрізках (SPEC §7.14), ті самі, що в таблиці. */
  risks: string[][];
  labels: readonly string[];
  abort: AbortPlan | null;
  /** Найближчий знімок ≤ 300 м до відрізка (SPEC §7.9); null — немає. */
  photoFor: (segment: Segment) => DockPhoto | null;
}

/** Крок «Play» — як навігатор: маршрут у 110 відрізків проходить приблизно за 30 с. */
const PLAY_STEP_MS = 250;

const LOCATION_TEXT: Record<PhotoLocation, string> = { 'rover-stop': 'rover stop', approximate: 'approximate location', target: 'science target' };
const cameraName = (camera?: string) => (camera === undefined ? 'Surface photo' : camera.startsWith('NAV') ? 'Navcam' : camera);

export function RouteDock({ plan, selectedSegment, onSelect, onBuild, canBuild, risks, labels, abort, photoFor }: RouteDockProps) {
  const [photoOpen, setPhotoOpen] = useState(false);
  const [playing, setPlaying] = useState(false);
  const ready = plan?.status === 'ok' && plan.segments.length > 0;
  const last = ready ? plan.segments.length - 1 : -1;
  const current = ready && selectedSegment !== null ? plan.segments[selectedSegment] : undefined;
  const photo = current ? photoFor(current) : null;

  // Накопичено від старту до кінця кожного відрізка — «де я на маршруті», як у навігаторі.
  const totals = useMemo(() => {
    const sums: { time: number; o2: number }[] = [];
    for (const segment of plan?.segments ?? []) {
      const prev = sums[sums.length - 1] ?? { time: 0, o2: 0 };
      sums.push({ time: prev.time + segment.time, o2: prev.o2 + segment.o2 });
    }
    return sums;
  }, [plan]);
  const abortOk = abort && plan && abort.segments.length === plan.segments.length ? abort.segments : null;

  // Play: крок за кроком до кінця маршруту; карта (F2) підсвічує обраний відрізок.
  const isPlaying = playing && ready;
  const position = useRef({ selectedSegment, last, onSelect });
  useEffect(() => {
    position.current = { selectedSegment, last, onSelect };
  });
  useEffect(() => {
    if (!isPlaying) return;
    const timer = setInterval(() => {
      const { selectedSegment: at, last: end, onSelect: select } = position.current;
      const next = at === null ? 0 : at + 1;
      if (next > end) {
        setPlaying(false);
        return;
      }
      select(next);
      // Не чекаємо ререндеру: наступний тік має знати, де ми вже є.
      position.current.selectedSegment = next;
      if (next === end) setPlaying(false);
    }, PLAY_STEP_MS);
    return () => clearInterval(timer);
  }, [isPlaying]);
  const step = (to: number) => {
    setPlaying(false);
    onSelect(to);
  };

  const prevButton = (
    <button type="button" aria-label="Previous segment" disabled={!ready || selectedSegment === null || selectedSegment <= 0}
      onClick={() => step((selectedSegment ?? 1) - 1)}>
      ◀
    </button>
  );
  const nextButton = (
    <button type="button" aria-label="Next segment" disabled={!ready || selectedSegment === last}
      onClick={() => step(selectedSegment === null ? 0 : selectedSegment + 1)}>
      ▶
    </button>
  );
  const stepper = (
    <>
      {prevButton}
      {nextButton}
    </>
  );

  // Портал у <body>: position: fixed не ламається від overflow / transform батьківських панелей.
  return createPortal(
    <>
      {photoOpen && current && (
        <section className="eva-photo" role="dialog" aria-label={`Photo from segment ${selectedSegment! + 1}`}>
          {photo ? (
            <figure>
              <img src={photo.photo.url} alt={photo.photo.alt} />
              <figcaption>
                {cameraName(photo.camera)}
                {photo.photo.sol === undefined ? '' : `, sol ${photo.photo.sol}`}, ~{Math.round(photo.distanceM)} m from this segment ({LOCATION_TEXT[photo.location]}) · {photo.photo.credit}
                {photo.photo.sourceUrl && (
                  <>
                    {' · '}
                    <a href={photo.photo.sourceUrl} target="_blank" rel="noreferrer">Source</a>
                  </>
                )}
              </figcaption>
            </figure>
          ) : (
            <p className="eva-photo__empty">No surface photo within 300 m of this segment.</p>
          )}
          <div className="eva-photo__nav">
            {stepper}
            <button type="button" className="eva-photo__close" onClick={() => setPhotoOpen(false)}>Close photo</button>
          </div>
        </section>
      )}
      <section className="eva-dock eva-dock--route" aria-label="Route controls">
        <section className="eva-dock__details" aria-label="Route details">
          {ready ? (
            <>
              <NoReturnLine plan={plan} abort={abort} />
              <ul className="eva-legs">
                {legSummaries(plan, labels, abort).map((leg, k) => (
                  <li key={`${k}-${leg.from}`}>
                    <span>{leg.from} → {leg.to}</span>
                    <span className="eva-legs__num">{Math.round(leg.dist)} m · {Math.round(leg.time / 60)} min</span>
                    <span className={leg.noReturn > 0 ? 'traverse-word traverse-word--danger' : 'traverse-word traverse-word--ok'}>
                      <span aria-hidden="true">{leg.noReturn > 0 ? STATUS_ICON.deficit : STATUS_ICON.ok} </span>
                      {leg.noReturn > 0 ? `${leg.noReturn} no return` : 'OK'}
                    </span>
                  </li>
                ))}
              </ul>
              {current && (
                <div className="eva-seg">
                  <p>
                    <strong>Segment {selectedSegment! + 1}</strong> · {Math.round(current.dist)} m · {current.slope >= 0 ? '+' : '−'}{Math.abs(current.slope).toFixed(0)}° · {Math.round(current.time)} s · {current.o2.toFixed(2)} g O₂
                    <br />
                    {formatRisks(risks[selectedSegment!] ?? [])}
                  </p>
                  {photo ? (
                    <button type="button" className="eva-seg__thumb" aria-label={`Open photo from segment ${selectedSegment! + 1}`} onClick={() => setPhotoOpen(true)}>
                      <img src={photo.photo.url} alt="" />
                    </button>
                  ) : (
                    <span className="eva-seg__nophoto">no photo within 300 m</span>
                  )}
                </div>
              )}
            </>
          ) : (
            <p>Build a route to see legs and the point of no return.</p>
          )}
        </section>
        <div className="eva-dock__controls">
          <div className="eva-dock__step">
            {prevButton}
            {/* Play — словом, а не третьою стрілкою: у рукавиці ◀ ▶ ⏵ не розрізнити. */}
            <button type="button" className="eva-dock__play" aria-label={isPlaying ? 'Pause route' : 'Play route'} aria-pressed={isPlaying}
              disabled={!ready || (!isPlaying && selectedSegment === last)} onClick={() => setPlaying(!isPlaying)}>
              {isPlaying ? 'Pause' : 'Play'}
            </button>
            {nextButton}
            <div className="eva-dock__readout" aria-live="polite">
              {!canBuild && !ready && <span>Choose targets to plan a route</span>}
              {canBuild && !ready && <span>{plan?.status === 'pending' ? 'Calculating route…' : 'Route not built yet'}</span>}
              {ready && (
                <>
                  <p className="eva-dock__where">
                    <strong>{current ? `Segment ${selectedSegment! + 1} of ${plan.segments.length}` : `${plan.segments.length} segments`}</strong>
                    {current && abortOk && (
                      <span className={abortOk[selectedSegment!]!.ok ? 'traverse-word traverse-word--ok' : 'traverse-word traverse-word--danger'}>
                        {abortOk[selectedSegment!]!.ok ? 'return OK' : 'no return from here'}
                      </span>
                    )}
                  </p>
                  <input type="range" className="eva-dock__scrub" aria-label="Position on route" min={1} max={plan.segments.length}
                    value={(selectedSegment ?? -1) + 1 || 1} onChange={(event) => step(Number(event.target.value) - 1)} />
                  <span>
                    {current
                      ? `${Math.floor(totals[selectedSegment!]!.time / 60)} min in · ${totals[selectedSegment!]!.o2.toFixed(1)} g O₂ used · ${formatRisks(risks[selectedSegment!] ?? [])} · ${photo ? `photo ${Math.round(photo.distanceM)} m` : 'no photo within 300 m'}`
                      : 'Drag along the route or press play'}
                  </span>
                </>
              )}
            </div>
          </div>
          {/* Та сама дія, що в панелі: на екрані завжди одна «Build route» — кнопку панелі ховає CSS, коли видно пульт. */}
          <button type="button" className="ui-btn--primary eva-dock__build" disabled={!canBuild} onClick={onBuild}>
            Build route
          </button>
        </div>
      </section>
    </>,
    document.body,
  );
}

/** Точка неповернення одним рядком (SPEC §7.8) — те саме reach.abort, що в HUD. */
function NoReturnLine({ plan, abort }: { plan: RoutePlan; abort: AbortPlan | null }) {
  if (!abort || abort.segments.length !== plan.segments.length) return null;
  if (abort.pointOfNoReturnS === null) {
    return <p className="eva-pnr eva-pnr--ok"><span aria-hidden="true">{STATUS_ICON.ok} </span>Return possible all the way</p>;
  }
  const first = abort.segments.findIndex((s) => !s.ok);
  return (
    <p className="eva-pnr eva-pnr--danger">
      <span aria-hidden="true">{STATUS_ICON.deficit} </span>
      <strong>No return after {formatMinutes(abort.pointOfNoReturnS)} min</strong> · from segment {first + 1}
    </p>
  );
}
