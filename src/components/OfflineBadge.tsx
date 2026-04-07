interface OfflineBadgeProps {
  enabled?: boolean;
}

export default function OfflineBadge({ enabled = false }: OfflineBadgeProps) {
  return (
    <span className={`inline-flex rounded-full px-2 py-1 text-xs font-semibold ${enabled ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-200 text-slate-600'}`}>
      {enabled ? 'Offline Ready' : 'Online Only'}
    </span>
  );
}
