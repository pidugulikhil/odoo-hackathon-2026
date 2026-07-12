/**
 * StatusBadge — renders colored badges for all entity statuses
 */
export default function StatusBadge({ status, showDot = true }) {
  if (!status) return null;
  const normalized = status.toLowerCase().replace(/ /g, '_');
  const label = status.replace(/_/g, ' ');

  return (
    <span className={`badge badge-${normalized}`}>
      {showDot && <span className="badge-dot" />}
      {label}
    </span>
  );
}
