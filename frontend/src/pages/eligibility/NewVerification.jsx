import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/lib/utils/page";
import { useAuthUserQuery } from "@/lib/query";
import StaffinglyLayout from "@/components/staffingly/StaffinglyLayout";
import ManualEntryTab from "@/components/insuverif/ManualEntryTab";
import UploadTab from "@/components/insuverif/UploadTab";
import EmrTab from "@/components/insuverif/EmrTab.jsx";
import BulkVerifyTab from "@/components/insuverif/BulkVerifyTab";
import { ClipboardCheck, FileUp, Layers3, MonitorSmartphone } from "lucide-react";

const WORKFLOWS = [
  {
    id: "manual",
    label: "Manual",
    description: "Fastest for a single check.",
    icon: ClipboardCheck,
  },
  {
    id: "upload",
    label: "Upload Card",
    description: "Extract details from an insurance card.",
    icon: FileUp,
  },
  {
    id: "bulk",
    label: "Bulk",
    description: "Run multiple verifications.",
    icon: Layers3,
  },
  {
    id: "emr",
    label: "EMR",
    description: "Pull from a connected chart.",
    icon: MonitorSmartphone,
  },
];

function getInitialWorkflow(params) {
  if (params.get("source") === "patients") {
    return "manual";
  }

  return "manual";
}

function WorkflowOption({ workflow, active, onSelect }) {
  const Icon = workflow.icon;

  return (
    <button
      type="button"
      onClick={() => onSelect(workflow.id)}
      className={`flex min-w-[150px] flex-1 items-start gap-3 rounded-2xl border px-4 py-3 text-left transition-colors ${
        active ? "border-[#293682] bg-[#eef1ff]" : "border-slate-200 bg-white hover:bg-slate-50"
      }`}
    >
      <div
        className={`mt-0.5 flex h-9 w-9 items-center justify-center rounded-xl ${
          active ? "bg-[#293682] text-white" : "bg-slate-100 text-slate-500"
        }`}
      >
        <Icon className="h-4 w-4" />
      </div>
      <div>
        <p className="text-sm font-semibold text-slate-900">{workflow.label}</p>
        <p className="mt-1 text-xs text-slate-500">{workflow.description}</p>
      </div>
    </button>
  );
}

export default function NewVerification() {
  const { data: user } = useAuthUserQuery();
  const navigate = useNavigate();
  const params = useMemo(() => new URLSearchParams(window.location.search), []);
  const [activeWorkflow, setActiveWorkflow] = useState(() => getInitialWorkflow(params));

  const prefill = useMemo(() => {
    const patientName = params.get("patient_name") || "";
    const firstName = params.get("first_name") || patientName.split(" ")[0] || "";
    const lastName = params.get("last_name") || patientName.split(" ").slice(1).join(" ") || "";

    return {
      patient_id: params.get("patientId") || "",
      first_name: firstName,
      last_name: lastName,
      dob: params.get("dob") || "",
      phone: params.get("phone") || "",
      email: params.get("email") || "",
      payer: params.get("payer") || "",
      member_id: params.get("member_id") || "",
      group_number: params.get("group_number") || "",
      plan_name: params.get("plan_name") || "",
      plan_type: params.get("plan_type") || "",
      subscriber_name: params.get("subscriber_name") || "",
      subscriber_dob: params.get("subscriber_dob") || "",
      subscriber_relationship: params.get("subscriber_relationship") || "Self",
    };
  }, [params]);

  const hasPrefill = Boolean(
    prefill.first_name ||
    prefill.last_name ||
    prefill.payer ||
    prefill.member_id ||
    prefill.plan_name
  );

  const selectedWorkflow =
    WORKFLOWS.find((workflow) => workflow.id === activeWorkflow) || WORKFLOWS[0];

  const handleRunVerification = (formData) => {
    const verificationParams = new URLSearchParams({
      patient: formData.patient_name || `${formData.first_name} ${formData.last_name}`.trim(),
      payer: formData.payer || "",
      member_id: formData.member_id || "",
      service_type: formData.service_type || "",
      provider_npi: formData.provider_npi || "",
      dob: formData.dob || "",
      service_date: formData.service_date || "",
      payer_id: formData.payer_id || "",
    });

    navigate(createPageUrl(`Processing?${verificationParams.toString()}`));
  };

  return (
    <StaffinglyLayout
      user={user}
      currentPage="new-verification"
      title="New Eligibility Verification"
      breadcrumbs={["Eligibility", "New Check"]}
    >
      <div className="space-y-5">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <h1 className="text-2xl font-bold text-slate-900">Run eligibility verification</h1>
              <p className="mt-2 text-sm text-slate-500">
                Choose a verification method and continue.
              </p>
            </div>

            {hasPrefill ? (
              <div className="rounded-2xl bg-slate-50 px-4 py-3 text-sm text-slate-600">
                Prefilled from patient record
              </div>
            ) : null}
          </div>

          <div className="mt-5 flex flex-col gap-3 lg:flex-row">
            {WORKFLOWS.map((workflow) => (
              <WorkflowOption
                key={workflow.id}
                workflow={workflow}
                active={activeWorkflow === workflow.id}
                onSelect={setActiveWorkflow}
              />
            ))}
          </div>
        </div>

        {activeWorkflow === "manual" ? (
          <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="mb-5 border-b border-slate-100 pb-4">
              <h2 className="text-lg font-bold text-slate-900">{selectedWorkflow.label}</h2>
              <p className="mt-1 text-sm text-slate-500">
                Enter or confirm the details below, then run the check.
              </p>
            </div>
            <ManualEntryTab onSubmit={handleRunVerification} prefill={prefill} />
          </div>
        ) : null}

        {activeWorkflow === "upload" ? (
          <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="mb-5 border-b border-slate-100 pb-4">
              <h2 className="text-lg font-bold text-slate-900">{selectedWorkflow.label}</h2>
              <p className="mt-1 text-sm text-slate-500">
                Upload the card, review the extracted data, and continue.
              </p>
            </div>
            <UploadTab onSubmit={handleRunVerification} />
          </div>
        ) : null}

        {activeWorkflow === "bulk" ? (
          <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="mb-5 border-b border-slate-100 pb-4">
              <h2 className="text-lg font-bold text-slate-900">{selectedWorkflow.label}</h2>
              <p className="mt-1 text-sm text-slate-500">
                Add multiple records manually or upload a CSV.
              </p>
            </div>
            <BulkVerifyTab />
          </div>
        ) : null}

        {activeWorkflow === "emr" ? (
          <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="mb-5 border-b border-slate-100 pb-4">
              <h2 className="text-lg font-bold text-slate-900">{selectedWorkflow.label}</h2>
              <p className="mt-1 text-sm text-slate-500">
                Search a connected system and complete any missing details.
              </p>
            </div>
            <EmrTab onSubmit={handleRunVerification} />
          </div>
        ) : null}
      </div>
    </StaffinglyLayout>
  );
}
