import { useEntityListQuery } from "@/lib/query";
import { Users, AlertTriangle, Briefcase, Clock } from "lucide-react";

function isToday(value) {
  const date = new Date(value);
  return !Number.isNaN(date.getTime()) && date.toDateString() === new Date().toDateString();
}

function getInitials(name) {
  return `${name || ""}`
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part.charAt(0))
    .join("")
    .toUpperCase();
}

export default function TeamOverview() {
  const { data: cases = [] } = useEntityListQuery("PriorAuthCase", { page: 1, limit: 100 }, null);

  const team = Object.values(
    cases.reduce((acc, current) => {
      const specialistId = current.assignedSpecialist?.id || "unassigned";
      const specialistName = current.assignedSpecialist?.name || "Unassigned";
      const specialistEmail = current.assignedSpecialist?.email || "unassigned@staffingly.com";
      const isClosed = ["APPROVED", "DENIED", "CLOSED"].includes(current.status);
      const needsAttention =
        current.urgency === "URGENT" ||
        current.status === "SUBMITTED" ||
        current.status === "PENDING_DOCUMENTS" ||
        isToday(current.createdAt);

      if (!acc[specialistId]) {
        acc[specialistId] = {
          name: specialistName,
          email: specialistEmail,
          openCases: 0,
          dueToday: 0,
          initials: getInitials(specialistName),
        };
      }

      if (!isClosed) {
        acc[specialistId].openCases += 1;
      }

      if (!isClosed && needsAttention) {
        acc[specialistId].dueToday += 1;
      }

      return acc;
    }, {})
  )
    .filter((member) => member.name !== "Unassigned")
    .sort((a, b) => b.openCases - a.openCases);

  return (
    <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
      <div className="flex items-center gap-2 px-5 py-4 border-b border-slate-100">
        <Users className="w-4 h-4 text-slate-400" />
        <h3 className="font-bold text-slate-800">Team Overview</h3>
        <span className="ml-auto text-xs text-slate-400">{team.length} specialists</span>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 p-4">
        {team.map((s) => {
          const flagged = s.openCases > 30;
          return (
            <div
              key={s.email}
              className={`rounded-2xl border p-4 ${flagged ? "border-amber-200 bg-amber-50" : "border-slate-100 bg-slate-50"}`}
            >
              <div className="flex items-center gap-3 mb-3">
                <div
                  className="w-9 h-9 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
                  style={{ backgroundColor: "#293682" }}
                >
                  {s.initials}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-slate-800 truncate">{s.name}</p>
                  {flagged && (
                    <span className="flex items-center gap-1 text-[10px] text-amber-600 font-semibold">
                      <AlertTriangle className="w-3 h-3" /> High load
                    </span>
                  )}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2 text-center">
                <div className="bg-white rounded-xl py-2 border border-slate-100">
                  <p className="text-lg font-bold text-slate-800">{s.openCases}</p>
                  <p className="text-[10px] text-slate-400 flex items-center justify-center gap-0.5">
                    <Briefcase className="w-2.5 h-2.5" /> Open
                  </p>
                </div>
                <div
                  className={`rounded-xl py-2 border ${s.dueToday > 5 ? "bg-amber-50 border-amber-200" : "bg-white border-slate-100"}`}
                >
                  <p
                    className={`text-lg font-bold ${s.dueToday > 5 ? "text-amber-600" : "text-slate-800"}`}
                  >
                    {s.dueToday}
                  </p>
                  <p className="text-[10px] text-slate-400 flex items-center justify-center gap-0.5">
                    <Clock className="w-2.5 h-2.5" /> Due today
                  </p>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
