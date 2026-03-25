export default function StatusBadge({ status }) {
  const configs = {
    Active: { bg: "#dcfce7", text: "#15803d", dot: "#16a34a" },
    Inactive: { bg: "#fee2e2", text: "#dc2626", dot: "#dc2626" },
    Flagged: { bg: "#fef9c3", text: "#a16207", dot: "#d97706" },
    Pending: { bg: "#e0f2fe", text: "#0369a1", dot: "#0284c7" },
    Unknown: { bg: "#fef3c7", text: "#92400e", dot: "#d97706" },
    HIGH: { bg: "#fee2e2", text: "#dc2626", dot: "#dc2626" },
    MEDIUM: { bg: "#fef9c3", text: "#a16207", dot: "#d97706" },
    LOW: { bg: "#dcfce7", text: "#15803d", dot: "#16a34a" },
    "In Progress": { bg: "#e0f2fe", text: "#0369a1", dot: "#0284c7" },
    Resolved: { bg: "#dcfce7", text: "#15803d", dot: "#16a34a" },
    Escalated: { bg: "#fce7f3", text: "#9d174d", dot: "#db2777" },
  };
  const cfg = configs[status] || { bg: "#f1f5f9", text: "#64748b", dot: "#94a3b8" };

  return (
    <span
      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold"
      style={{ backgroundColor: cfg.bg, color: cfg.text }}
    >
      <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: cfg.dot }}></span>
      {status}
    </span>
  );
}
