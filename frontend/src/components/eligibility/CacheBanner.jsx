import { Clock, RefreshCw } from "lucide-react";

export default function CacheBanner({ hoursAgo, onRunFresh }) {
  return (
    <div
      className="rounded-2xl px-5 py-4 border-2 border-amber-300 flex items-center gap-4"
      style={{ backgroundColor: "#fffbeb" }}
    >
      <Clock className="w-5 h-5 text-amber-600 flex-shrink-0" />
      <div className="flex-1">
        <p className="font-bold text-amber-800">
          Cached Result — from {hoursAgo} hour{hoursAgo !== 1 ? "s" : ""} ago
        </p>
        <p className="text-xs text-amber-600 mt-0.5">
          This result was retrieved from cache. Cached results save API credits and return
          instantly.
        </p>
      </div>
      <button
        onClick={onRunFresh}
        className="flex items-center gap-2 px-4 py-2 rounded-xl text-white text-sm font-bold flex-shrink-0"
        style={{ backgroundColor: "#b45309" }}
      >
        <RefreshCw className="w-3.5 h-3.5" /> Run Fresh Check
      </button>
    </div>
  );
}
