import { useEffect, useRef, type CSSProperties } from 'react';
import { useMission } from '../../store/useMission';
import { TargetCard } from './TargetCard';
import { targetReachState } from './targetReachState';
import './targetMapPreview.css';

export interface TargetPreviewAnchor { x: number; y: number }

export interface TargetMapPreviewProps {
  targetId: string | null;
  anchor?: TargetPreviewAnchor | null;
  onClose: () => void;
}

/** #180: компактний preview біля маркера, без auto-add. */
export function TargetMapPreview({ targetId, anchor = null, onClose }: TargetMapPreviewProps) {
  const targets = useMission((s) => s.targets);
  const selected = useMission((s) => s.selectedTargetIds);
  const grid = useMission((s) => s.grid);
  const reach = useMission((s) => s.reach);
  const toggleTarget = useMission((s) => s.toggleTarget);
  const popupRef = useRef<HTMLElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const target = targets.find((candidate) => candidate.id === targetId) ?? null;

  useEffect(() => {
    if (!target) return;
    closeRef.current?.focus();
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    const closeOutside = (event: PointerEvent) => {
      if (!popupRef.current?.contains(event.target as Node)) onClose();
    };
    window.addEventListener('keydown', closeOnEscape);
    document.addEventListener('pointerdown', closeOutside);
    return () => {
      window.removeEventListener('keydown', closeOnEscape);
      document.removeEventListener('pointerdown', closeOutside);
    };
  }, [target, onClose]);

  if (!target) return null;
  const reachState = targetReachState(target, grid, reach);
  const isSelected = selected.includes(target.id);
  const style = anchor ? ({ '--target-preview-x': `${anchor.x}px`, '--target-preview-y': `${anchor.y}px` } as CSSProperties) : undefined;

  return (
    <aside ref={popupRef} className="target-map-preview" data-anchored={Boolean(anchor)} data-layout="compact" role="dialog" aria-modal="false" aria-labelledby="target-map-preview-title" style={style}>
      <button ref={closeRef} type="button" className="target-map-preview__close" aria-label="Close target preview" onClick={onClose}>×</button>
      <TargetCard key={target.id} variant="preview" headingId="target-map-preview-title" eyebrow={target.locationAccuracy} target={target} selected={isSelected} onToggle={toggleTarget} reachState={reachState} reachWarning={undefined} reachNote={undefined} />
    </aside>
  );
}
