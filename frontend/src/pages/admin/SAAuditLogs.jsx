import { useMemo, useState } from "react";
import { useAuthUserQuery, useEntityListQuery } from "@/lib/query";
import StaffinglyLayout from "@/components/staffingly/StaffinglyLayout";
import AppSelect from "@/components/ui/app-select";
import { Search, Download, Lock, Loader2 } from "lucide-react";

const ACTION_COLORS = {
  UPDATE: "bg-amber-50 text-amber-700 border-amber-200",
  EXPORT: "bg-blue-50 text-blue-700 border-blue-200",
  CREATE: "bg-emerald-50 text-emerald-700 border-emerald-200",
  APPROVE: "bg-teal-50 text-teal-700 border-teal-200",
  FAILED_LOGIN: "bg-rose-50 text-rose-700 border-rose-200",
  LOGIN_LOCKED: "bg-rose-50 text-rose-700 border-rose-200",
  DELETE: "bg-pink-50 text-pink-700 border-pink-200",
};

function sanitizeText(value) {
  if (value === null || value === undefined) return "";

  const normalized =
    typeof value === "string"
      ? value
      : typeof value === "object"
        ? JSON.stringify(value)
        : String(value);

  return normalized
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F-\u009F]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function normalizeRecordId(value) {
  const sanitized = sanitizeText(value);

  if (!sanitized) return "";

  if (sanitized.startsWith("{") || sanitized.startsWith("[")) {
    try {
      const parsed = JSON.parse(sanitized);
      if (parsed && typeof parsed === "object") {
        return sanitizeText(parsed.id || parsed.recordId || parsed.entityId || sanitized);
      }
    } catch {
      return sanitized;
    }
  }

  return sanitized;
}

function parseLog(log) {
  let metadata = {};
  try {
    metadata = log.metadata ? JSON.parse(log.metadata) : {};
  } catch {
    metadata = {};
  }

  return {
    id: log.id,
    actor: log.userEmail || "System",
    role: metadata.role || "Unknown",
    actionType: log.action || "UNKNOWN",
    module: metadata.module || log.entityType || "General",
    recordId: normalizeRecordId(log.entityId),
    oldValue: sanitizeText(metadata.oldValue || ""),
    newValue: sanitizeText(metadata.newValue || ""),
    ipAddress: sanitizeText(metadata.ipAddress || "—") || "—",
    timestamp: log.createdAt ? new Date(log.createdAt) : null,
  };
}

function formatTimestamp(value) {
  return value ? value.toLocaleString() : "—";
}

export default function SAAuditLogs() {
  const { data: user } = useAuthUserQuery({ withDefaultRole: "super_admin" });
  const [search, setSearch] = useState("");
  const [filterModule, setFilterModule] = useState("all");
  const [filterAction, setFilterAction] = useState("all");
  const { data: rawLogs = [], isLoading } = useEntityListQuery("StaffinglyAuditLog", {
    limit: 100,
  });

  const logs = useMemo(() => rawLogs.map((log) => parseLog(log)), [rawLogs]);

  const modules = useMemo(
    () => ["all", ...new Set(logs.map((log) => log.module).filter(Boolean))],
    [logs]
  );
  const actions = useMemo(
    () => ["all", ...new Set(logs.map((log) => log.actionType).filter(Boolean))],
    [logs]
  );

  const filtered = useMemo(
    () =>
      logs.filter((log) => {
        const matchSearch = [log.actor, log.module, log.actionType, log.ipAddress, log.recordId]
          .join(" ")
          .toLowerCase()
          .includes(search.toLowerCase());
        const matchModule = filterModule === "all" || log.module === filterModule;
        const matchAction = filterAction === "all" || log.actionType === filterAction;
        return matchSearch && matchModule && matchAction;
      }),
    [filterAction, filterModule, logs, search]
  );

  function handleExport() {
    const headers = ["Timestamp", "User", "Role", "Action", "Module", "Record ID", "IP Address"];
    const rows = filtered.map((log) => [
      formatTimestamp(log.timestamp),
      sanitizeText(log.actor),
      sanitizeText(log.role),
      sanitizeText(log.actionType),
      sanitizeText(log.module),
      normalizeRecordId(log.recordId) || "—",
      sanitizeText(log.ipAddress),
    ]);
    const csv = [headers, ...rows]
      .map((row) => row.map((cell) => `"${sanitizeText(cell).replace(/"/g, '""')}"`).join(","))
      .join("\r\n");

    const blob = new Blob(["\uFEFF", csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "audit-log-export.csv";
    link.click();
    URL.revokeObjectURL(url);
  }

  return (
    <StaffinglyLayout
      user={user}
      currentPage="sa-audit-logs"
      title="Audit Logs"
      breadcrumbs={["Admin", "Audit Logs"]}
    >
      <div className="sv-unified-page max-w-[1400px]">
        <div className="sv-page-panel">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div className="max-w-3xl">
              <h1 className="text-xl font-semibold text-slate-900">Audit Logs</h1>
              <p className="mt-1.5 text-sm text-slate-500">
                Review system actions, risky sign-in events, and change history from the backend
                audit feed.
              </p>
            </div>
            <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
              <div className="flex items-center gap-2 font-medium">
                <Lock className="h-4 w-4" />
                Insert-only audit trail
              </div>
              <p className="mt-1 text-amber-800">
                Entries are read-only and retained as the source of truth for admin reviews.
              </p>
            </div>
          </div>
        </div>

        <div className="sv-page-panel">
          <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
            <div className="relative w-full xl:max-w-sm">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search by user, module, action, record, or IP"
                className="sv-search-input h-10 w-full pl-10 pr-4"
              />
            </div>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center xl:ml-auto">
              <AppSelect
                value={filterModule}
                onValueChange={setFilterModule}
                options={modules.map((module) => ({
                  label: module === "all" ? "All Modules" : module,
                  value: module,
                }))}
                triggerClassName="sv-select-trigger h-9 w-[170px] focus:ring-0"
              />
              <AppSelect
                value={filterAction}
                onValueChange={setFilterAction}
                options={actions.map((action) => ({
                  label: action === "all" ? "All Actions" : action,
                  value: action,
                }))}
                triggerClassName="sv-select-trigger h-9 w-[170px] focus:ring-0"
              />
              <button
                onClick={handleExport}
                className="inline-flex h-9 items-center justify-center gap-2 rounded-xl border border-slate-200 px-3 text-xs font-medium text-slate-700 transition hover:bg-slate-50"
              >
                <Download className="h-4 w-4" />
                Export CSV
              </button>
            </div>
          </div>
        </div>

        <div className="sv-table-card">
          <div className="overflow-x-auto">
            <table className="sv-data-table min-w-full">
              <thead className="bg-slate-50">
                <tr className="border-b border-slate-200">
                  {["Timestamp", "User", "Action", "Module", "Change", "IP Address"].map(
                    (header) => (
                      <th
                        key={header}
                        className="px-5 py-3.5 text-left text-xs font-semibold uppercase tracking-[0.18em] text-slate-500"
                      >
                        {header}
                      </th>
                    )
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {isLoading ? (
                  <tr>
                    <td colSpan={6} className="px-5 py-12 text-center text-sm text-slate-400">
                      <span className="inline-flex items-center gap-2">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Loading audit logs...
                      </span>
                    </td>
                  </tr>
                ) : null}

                {!isLoading && filtered.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-5 py-12 text-center text-sm text-slate-400">
                      No audit events match the current filters.
                    </td>
                  </tr>
                ) : null}

                {!isLoading
                  ? filtered.map((log) => (
                      <tr key={log.id} className="align-top transition hover:bg-slate-50/80">
                        <td className="px-5 py-4 text-sm text-slate-500">
                          <div className="font-medium text-slate-700">
                            {formatTimestamp(log.timestamp)}
                          </div>
                          <div className="mt-1 text-[11px] text-slate-400">
                            {log.recordId || "—"}
                          </div>
                        </td>
                        <td className="px-5 py-4">
                          <div className="font-semibold text-slate-900">{log.actor}</div>
                          <div className="mt-1 text-xs text-slate-500">{log.role}</div>
                        </td>
                        <td className="px-5 py-4">
                          <span
                            className={`inline-flex rounded-full border px-2.5 py-1 text-[9px] font-semibold ${
                              ACTION_COLORS[log.actionType] ||
                              "border-slate-200 bg-slate-50 text-slate-600"
                            }`}
                          >
                            {log.actionType}
                          </span>
                        </td>
                        <td className="px-5 py-4 text-slate-600">{log.module}</td>
                        <td className="px-5 py-4">
                          {log.oldValue || log.newValue ? (
                            <div className="space-y-1 text-xs">
                              {log.oldValue ? (
                                <p className="text-rose-600">- {log.oldValue}</p>
                              ) : null}
                              {log.newValue ? (
                                <p className="text-emerald-600">+ {log.newValue}</p>
                              ) : null}
                            </div>
                          ) : (
                            <span className="text-slate-300">—</span>
                          )}
                        </td>
                        <td className="px-5 py-4 font-mono text-sm text-slate-500">
                          {log.ipAddress}
                        </td>
                      </tr>
                    ))
                  : null}
              </tbody>
            </table>
          </div>
          <div className="border-t border-slate-100 px-5 py-3 text-sm text-slate-500">
            Showing {filtered.length} of {logs.length} events
          </div>
        </div>
      </div>
    </StaffinglyLayout>
  );
}
