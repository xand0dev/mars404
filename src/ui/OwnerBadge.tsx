export interface OwnerBadgeProps {
  featureId: string;
  owner: string;
}

/** Хто відповідає за панель. Приглушений: це довідка для команди, а не стан даних. */
export function OwnerBadge({ featureId, owner }: OwnerBadgeProps) {
  return <span className="ui-badge ui-badge--owner">{featureId} · {owner}</span>;
}
