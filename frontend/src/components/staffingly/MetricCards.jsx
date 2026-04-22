import {
  Search,
  ClipboardList,
  Send,
  CheckCircle,
  XCircle,
  TrendingUp,
  TrendingDown,
} from "lucide-react";

const DEFAULT_METRICS = [
  {
    label: "Eligibility Today",
    value: 0,
    trend: 0,
    icon: Search,
    color: "#0a7e87",
    bg: "#f0fdfa",
  },
  {
    label: "Prior Auths In Progress",
    value: 0,
    trend: 0,
    icon: ClipboardList,
    color: "#293682",
    bg: "#eef3ff",
  },
  { label: "Submitted Today", value: 0, trend: 0, icon: Send, color: "#f6b037", bg: "#fffbeb" },
  {
    label: "Approved This Month",
    value: 0,
    trend: 0,
    icon: CheckCircle,
    color: "#15803d",
    bg: "#f0fdf4",
  },
  {
    label: "Denied This Month",
    value: 0,
    trend: 0,
    icon: XCircle,
    color: "#dc2626",
    bg: "#fef2f2",
  },
];

export default function MetricCards({ metrics = DEFAULT_METRICS }) {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
      {metrics.map((m, i) => {
        const isUp = m.trend >= 0;
        return (
          <div
            key={i}
            className="bg-white rounded-2xl border border-slate-100 p-4 flex flex-col gap-2 shadow-sm"
          >
            <div className="flex items-center justify-between">
              <div
                className="w-9 h-9 rounded-xl flex items-center justify-center"
                style={{ backgroundColor: m.bg }}
              >
                <m.icon className="w-4.5 h-4.5" style={{ color: m.color }} />
              </div>
              <span
                className={`flex items-center gap-0.5 text-[11px] font-bold ${isUp ? "text-emerald-600" : "text-red-500"}`}
              >
                {isUp ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                {isUp ? "+" : ""}
                {m.trend}
              </span>
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-800">{m.value}</p>
              <p className="text-[11px] text-slate-500 leading-tight mt-0.5">{m.label}</p>
            </div>
          </div>
        );
      })}
    </div>
  );
}
