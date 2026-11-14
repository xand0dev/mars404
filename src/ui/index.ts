// Спільні UI-компоненти (власник F7). Пропи лише розширюються, не ламаються.
export { Panel, MockBadge } from './Panel';
export type { PanelProps } from './Panel';
export { OwnerBadge } from './OwnerBadge';
export type { OwnerBadgeProps } from './OwnerBadge';
export { StatusNote } from './StatusNote';
export type { StatusNoteProps } from './StatusNote';
export { STATUS_ICON } from './statusLevel';
export type { StatusLevel } from './statusLevel';
export { Gauge } from './Gauge';
export type { GaugeProps } from './Gauge';
export { formatMinutes, formatAmount, DASH } from './format';
export { EvaSign, EvaSignShape, EvaLegend } from './EvaSign';
export type { EvaSignProps, EvaSignShapeProps, EvaLegendProps } from './EvaSign';
export { EVA_SIGN_KINDS, EVA_LEGEND_ITEMS, evaSignLabel } from './evaSignLabels';
export type { EvaSignKind, EvaTargetState, EvaHazardLevel } from './evaSignLabels';
