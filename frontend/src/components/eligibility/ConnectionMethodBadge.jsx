import { Wifi, Globe, Database, Monitor } from "lucide-react";

const METHOD_CONFIG = {
  availity: {
    label: "Availity API",
    icon: Wifi,
    bg: "#f0fdf4",
    text: "#15803d",
    border: "#bbf7d0",
  },
  payer_api: {
    label: "Direct Payer API",
    icon: Globe,
    bg: "#eff6ff",
    text: "#1d4ed8",
    border: "#bfdbfe",
  },
  emr: {
    label: "EMR Integration",
    icon: Database,
    bg: "#f5f3ff",
    text: "#6d28d9",
    border: "#ddd6fe",
  },
  puppeteer: {
    label: "Portal Automation",
    icon: Monitor,
    bg: "#fffbeb",
    text: "#b45309",
    border: "#fde68a",
  },
};

export default function ConnectionMethodBadge({ method, responseTimeMs }) {
  const key = method?.toLowerCase().includes("availity")
    ? "availity"
    : method?.toLowerCase().includes("emr")
      ? "emr"
      : method?.toLowerCase().includes("puppeteer") || method?.toLowerCase().includes("portal")
        ? "puppeteer"
        : method?.toLowerCase().includes("payer")
          ? "payer_api"
          : "availity";

  const cfg = METHOD_CONFIG[key];
  const Icon = cfg.icon;

  return (
    <div className="flex items-center gap-3 flex-wrap">
      <div
        className="flex items-center gap-2 px-3 py-1.5 rounded-xl border text-xs font-bold"
        style={{ backgroundColor: cfg.bg, color: cfg.text, borderColor: cfg.border }}
      >
        <Icon className="w-3.5 h-3.5" />
        {cfg.label}
      </div>
      {responseTimeMs && (
        <span className="text-xs text-slate-500 font-mono">{responseTimeMs}ms</span>
      )}
    </div>
  );
}
