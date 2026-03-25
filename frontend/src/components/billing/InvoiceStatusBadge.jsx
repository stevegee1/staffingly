const STATUS_CONFIG = {
  draft: { label: "Draft", bg: "#f1f5f9", text: "#475569" },
  dispute_window: { label: "Dispute Window", bg: "#fffbeb", text: "#92400e" },
  disputed: { label: "Disputed – Under Review", bg: "#fef3c7", text: "#b45309" },
  approved: { label: "Approved", bg: "#f0fdf4", text: "#15803d" },
  paid: { label: "Paid", bg: "#f0fdf4", text: "#15803d" },
  payment_failed: { label: "Payment Failed", bg: "#fef2f2", text: "#b91c1c" },
  voided: { label: "Voided", bg: "#f8fafc", text: "#94a3b8" },
};

export default function InvoiceStatusBadge({ status }) {
  const cfg = STATUS_CONFIG[status] || STATUS_CONFIG.draft;
  return (
    <span
      className="px-2.5 py-0.5 rounded-full text-xs font-semibold"
      style={{ backgroundColor: cfg.bg, color: cfg.text }}
    >
      {cfg.label}
    </span>
  );
}
