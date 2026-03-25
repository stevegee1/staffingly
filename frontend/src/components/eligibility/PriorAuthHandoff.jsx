import { Link } from "react-router-dom";
import { createPageUrl } from "@/lib/utils/page";
import { ClipboardList, CheckCircle, ArrowRight, X } from "lucide-react";

export default function PriorAuthHandoff({ priorAuthRequired, patientData, onClose }) {
  const paParams = patientData
    ? new URLSearchParams({
        patient: patientData.patient || "",
        payer: patientData.payer || "",
        member_id: patientData.member_id || "",
        plan_name: patientData.plan_name || "",
        plan_type: patientData.plan_type || "",
        prefilled: "true",
      }).toString()
    : "";

  if (priorAuthRequired) {
    return (
      <div
        className="rounded-2xl p-6 border-2 border-amber-300 flex flex-col sm:flex-row items-start sm:items-center gap-5"
        style={{ backgroundColor: "#fffbeb" }}
      >
        <div
          className="w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0"
          style={{ backgroundColor: "#f6b037" }}
        >
          <ClipboardList className="w-6 h-6 text-white" />
        </div>
        <div className="flex-1">
          <p className="font-bold text-amber-900 text-lg">Prior Authorization Required</p>
          <p className="text-amber-700 text-sm mt-0.5">
            This procedure requires prior authorization from the payer. Eligibility data will be
            pre-populated into the PA case.
          </p>
        </div>
        <Link to={createPageUrl(`PriorAuth?${paParams}`)}>
          <button
            className="flex items-center gap-2 px-6 py-3 rounded-xl text-white font-bold text-sm flex-shrink-0"
            style={{ backgroundColor: "#f6b037", color: "#002082" }}
          >
            <ClipboardList className="w-4 h-4" />
            Start Prior Auth
            <ArrowRight className="w-4 h-4" />
          </button>
        </Link>
      </div>
    );
  }

  return (
    <div
      className="rounded-2xl p-6 border-2 border-teal-300 flex flex-col sm:flex-row items-start sm:items-center gap-5"
      style={{ backgroundColor: "#f0fdfa" }}
    >
      <div
        className="w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0"
        style={{ backgroundColor: "#0a7e87" }}
      >
        <CheckCircle className="w-6 h-6 text-white" />
      </div>
      <div className="flex-1">
        <p className="font-bold text-teal-900 text-lg">No Prior Authorization Required</p>
        <p className="text-teal-700 text-sm mt-0.5">
          This service does not require prior authorization. You may close this case — it will be
          logged as complete.
        </p>
      </div>
      <button
        onClick={onClose}
        className="flex items-center gap-2 px-6 py-3 rounded-xl text-white font-bold text-sm flex-shrink-0"
        style={{ backgroundColor: "#0a7e87" }}
      >
        <X className="w-4 h-4" />
        Close Case
      </button>
    </div>
  );
}
