import { Link } from "react-router-dom";
import { createPageUrl } from "@/lib/utils/page";
import { Search, ClipboardList } from "lucide-react";

export default function WorkflowCards({ eligibilityCount = 0, priorAuthCount = 0 }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      {/* Eligibility */}
      <Link to={createPageUrl("new-verification")}>
        <div
          className="rounded-2xl p-6 flex flex-col gap-4 h-full cursor-pointer hover:opacity-95 transition-opacity"
          style={{ backgroundColor: "#0a7e87" }}
        >
          <div className="w-14 h-14 rounded-2xl bg-white/15 flex items-center justify-center">
            <Search className="w-7 h-7 text-white" />
          </div>
          <div className="flex-1">
            <h3 className="text-white font-bold text-xl leading-tight">Run Eligibility Check</h3>
            <p className="text-teal-100 text-sm mt-1">
              Verify patient coverage and benefits in real time via Availity.
            </p>
          </div>
          <div>
            <div
              className="inline-flex items-center px-5 py-2.5 rounded-xl bg-white text-sm font-bold"
              style={{ color: "#0a7e87" }}
            >
              Start Eligibility →
            </div>
            <p className="text-teal-200 text-xs mt-2.5">
              {eligibilityCount > 0
                ? `${eligibilityCount} checks run today`
                : "No checks today yet"}
            </p>
          </div>
        </div>
      </Link>

      {/* Prior Auth */}
      <Link to={createPageUrl("prior-auth")}>
        <div
          className="rounded-2xl p-6 flex flex-col gap-4 h-full cursor-pointer hover:opacity-95 transition-opacity"
          style={{ backgroundColor: "#293682" }}
        >
          <div className="w-14 h-14 rounded-2xl bg-white/15 flex items-center justify-center">
            <ClipboardList className="w-7 h-7 text-white" />
          </div>
          <div className="flex-1">
            <h3 className="text-white font-bold text-xl leading-tight">
              Start Prior Authorization
            </h3>
            <p className="text-blue-200 text-sm mt-1">
              Eligibility is verified automatically as step one of this workflow.
            </p>
          </div>
          <div>
            <div
              className="inline-flex items-center px-5 py-2.5 rounded-xl bg-white text-sm font-bold"
              style={{ color: "#293682" }}
            >
              Start Prior Auth →
            </div>
            <p className="text-blue-300 text-xs mt-2.5">
              {priorAuthCount > 0
                ? `${priorAuthCount} prior auths today`
                : "No prior auths today yet"}
            </p>
          </div>
        </div>
      </Link>
    </div>
  );
}
