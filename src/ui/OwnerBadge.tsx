export interface OwnerBadgeProps {
  featureId: string;
  owner: string;
}

export function OwnerBadge({ featureId, owner }: OwnerBadgeProps) {
  return <span className="ui-badge">{featureId} · {owner}</span>;
}
