import { Users, AlertTriangle, Briefcase, Clock } from "lucide-react";

const DUMMY_TEAM = [
  { name: "Dana Kim", email: "dana@staffingly.com", openCases: 18, dueToday: 4, initials: "DK" },
  { name: "Drew Okafor", email: "drew@staffingly.com", openCases: 31, dueToday: 7, initials: "DO" },
  { name: "Sam Torres", email: "sam@staffingly.com", openCases: 12, dueToday: 2, initials: "ST" },
  {
    name: "Priya Mehta",
    email: "priya@staffingly.com",
    openCases: 37,
    dueToday: 9,
    initials: "PM",
  },
];

export default function TeamOverview() {
  return (
    <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
      <div className="flex items-center gap-2 px-5 py-4 border-b border-slate-100">
        <Users className="w-4 h-4 text-slate-400" />
        <h3 className="font-bold text-slate-800">Team Overview</h3>
        <span className="ml-auto text-xs text-slate-400">{DUMMY_TEAM.length} specialists</span>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 p-4">
        {DUMMY_TEAM.map((s, i) => {
          const flagged = s.openCases > 30;
          return (
            <div
              key={i}
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
