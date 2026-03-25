import { useState } from "react";
import { ChevronDown, ChevronRight, Plus } from "lucide-react";

const PAYERS = [
  "UnitedHealthcare",
  "Aetna",
  "Cigna",
  "Humana",
  "Blue Cross Blue Shield",
  "Medicare",
  "Medicaid",
  "Tricare",
  "Molina Healthcare",
  "Centene",
  "Oscar Health",
  "Other",
];
const PLAN_TYPES = [
  "PPO",
  "HMO",
  "EPO",
  "POS",
  "HDHP",
  "Medicare Advantage",
  "Medicaid Managed Care",
  "Unknown",
];
const SERVICE_TYPES = [
  "Primary Care Visit",
  "Specialist Visit",
  "Urgent Care",
  "Emergency Room",
  "Lab/Diagnostics",
  "Imaging/Radiology",
  "Mental Health/Behavioral",
  "Physical Therapy",
  "Chiropractic",
  "Surgery",
  "Preventive/Wellness",
  "Pharmacy",
  "Other",
];
const GENDERS = ["Male", "Female", "Non-binary", "Prefer not to say"];
const RELATIONSHIPS = ["Self", "Spouse", "Child", "Other Dependent"];

const today = new Date().toISOString().split("T")[0];

function FormInput({ label, required, children }) {
  return (
    <div>
      <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider block mb-1.5">
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      {children}
    </div>
  );
}

const inputClass =
  "w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 bg-white";
const ringStyle = { "--tw-ring-color": "#293682" };

export default function ManualEntryTab({ onSubmit, prefill = {} }) {
  const [form, setForm] = useState({
    first_name: prefill.first_name || "",
    last_name: prefill.last_name || "",
    dob: prefill.dob || "",
    gender: prefill.gender || "",
    phone: prefill.phone || "",
    email: prefill.email || "",
    payer: prefill.payer || "",
    member_id: prefill.member_id || "",
    group_number: prefill.group_number || "",
    plan_name: prefill.plan_name || "",
    plan_type: prefill.plan_type || "",
    subscriber_name: prefill.subscriber_name || "",
    subscriber_dob: prefill.subscriber_dob || "",
    subscriber_relationship: prefill.subscriber_relationship || "Self",
    provider_npi: "",
    service_date: today,
    service_type: "",
    cpt_code: "",
    facility_name: "",
    notes: "",
  });
  const [showSecondary, setShowSecondary] = useState(false);

  const update = (k, v) => setForm((p) => ({ ...p, [k]: v }));

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit({ ...form, patient_name: `${form.first_name} ${form.last_name}` });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Patient Info */}
      <Section title="Patient Information">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <FormInput label="First Name" required>
            <input
              className={inputClass}
              style={ringStyle}
              value={form.first_name}
              onChange={(e) => update("first_name", e.target.value)}
              required
            />
          </FormInput>
          <FormInput label="Last Name" required>
            <input
              className={inputClass}
              style={ringStyle}
              value={form.last_name}
              onChange={(e) => update("last_name", e.target.value)}
              required
            />
          </FormInput>
          <FormInput label="Date of Birth" required>
            <input
              type="date"
              className={inputClass}
              style={ringStyle}
              value={form.dob}
              onChange={(e) => update("dob", e.target.value)}
              required
            />
          </FormInput>
          <FormInput label="Gender">
            <select
              className={inputClass}
              style={ringStyle}
              value={form.gender}
              onChange={(e) => update("gender", e.target.value)}
            >
              <option value="">Select...</option>
              {GENDERS.map((g) => (
                <option key={g}>{g}</option>
              ))}
            </select>
          </FormInput>
          <FormInput label="Phone">
            <input
              type="tel"
              className={inputClass}
              style={ringStyle}
              value={form.phone}
              onChange={(e) => update("phone", e.target.value)}
              placeholder="(555) 000-0000"
            />
          </FormInput>
          <FormInput label="Email">
            <input
              type="email"
              className={inputClass}
              style={ringStyle}
              value={form.email}
              onChange={(e) => update("email", e.target.value)}
              placeholder="patient@email.com"
            />
          </FormInput>
        </div>
      </Section>

      {/* Insurance */}
      <Section title="Insurance Information">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <FormInput label="Insurance Payer" required>
            <select
              className={inputClass}
              style={ringStyle}
              value={form.payer}
              onChange={(e) => update("payer", e.target.value)}
              required
            >
              <option value="">Select payer...</option>
              {PAYERS.map((p) => (
                <option key={p}>{p}</option>
              ))}
            </select>
          </FormInput>
          <FormInput label="Member ID" required>
            <input
              className={inputClass}
              style={ringStyle}
              value={form.member_id}
              onChange={(e) => update("member_id", e.target.value)}
              required
              placeholder="e.g. UHC-884720193"
            />
          </FormInput>
          <FormInput label="Group Number">
            <input
              className={inputClass}
              style={ringStyle}
              value={form.group_number}
              onChange={(e) => update("group_number", e.target.value)}
              placeholder="GRP-XXXXX"
            />
          </FormInput>
          <FormInput label="Plan Name">
            <input
              className={inputClass}
              style={ringStyle}
              value={form.plan_name}
              onChange={(e) => update("plan_name", e.target.value)}
            />
          </FormInput>
          <FormInput label="Plan Type">
            <select
              className={inputClass}
              style={ringStyle}
              value={form.plan_type}
              onChange={(e) => update("plan_type", e.target.value)}
            >
              <option value="">Select type...</option>
              {PLAN_TYPES.map((t) => (
                <option key={t}>{t}</option>
              ))}
            </select>
          </FormInput>
          <FormInput label="Subscriber Name">
            <input
              className={inputClass}
              style={ringStyle}
              value={form.subscriber_name}
              onChange={(e) => update("subscriber_name", e.target.value)}
              placeholder="If different from patient"
            />
          </FormInput>
          <FormInput label="Subscriber DOB">
            <input
              type="date"
              className={inputClass}
              style={ringStyle}
              value={form.subscriber_dob}
              onChange={(e) => update("subscriber_dob", e.target.value)}
            />
          </FormInput>
          <FormInput label="Subscriber Relationship">
            <select
              className={inputClass}
              style={ringStyle}
              value={form.subscriber_relationship}
              onChange={(e) => update("subscriber_relationship", e.target.value)}
            >
              {RELATIONSHIPS.map((r) => (
                <option key={r}>{r}</option>
              ))}
            </select>
          </FormInput>
        </div>
      </Section>

      {/* Secondary Insurance */}
      <div className="border border-dashed border-slate-300 rounded-xl overflow-hidden">
        <button
          type="button"
          onClick={() => setShowSecondary((p) => !p)}
          className="w-full flex items-center justify-between px-4 py-3 text-sm font-semibold text-slate-600 hover:bg-slate-50 transition-colors"
        >
          <span className="flex items-center gap-2">
            <Plus className="w-4 h-4" /> Add Secondary Insurance
          </span>
          {showSecondary ? (
            <ChevronDown className="w-4 h-4" />
          ) : (
            <ChevronRight className="w-4 h-4" />
          )}
        </button>
        {showSecondary && (
          <div className="p-4 border-t border-dashed border-slate-200 bg-slate-50/50 grid grid-cols-1 sm:grid-cols-2 gap-4">
            {[
              "Secondary Payer",
              "Secondary Member ID",
              "Secondary Group #",
              "Secondary Plan Name",
            ].map((label) => (
              <FormInput key={label} label={label}>
                <input className={inputClass} style={ringStyle} />
              </FormInput>
            ))}
          </div>
        )}
      </div>

      {/* Visit Info */}
      <Section title="Visit Information">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <FormInput label="Provider NPI" required>
            <input
              className={inputClass}
              style={ringStyle}
              value={form.provider_npi}
              onChange={(e) => update("provider_npi", e.target.value)}
              required
              placeholder="10-digit NPI"
            />
          </FormInput>
          <FormInput label="Service Date">
            <input
              type="date"
              className={inputClass}
              style={ringStyle}
              value={form.service_date}
              onChange={(e) => update("service_date", e.target.value)}
            />
          </FormInput>
          <FormInput label="Service Type">
            <select
              className={inputClass}
              style={ringStyle}
              value={form.service_type}
              onChange={(e) => update("service_type", e.target.value)}
            >
              <option value="">Select type...</option>
              {SERVICE_TYPES.map((s) => (
                <option key={s}>{s}</option>
              ))}
            </select>
          </FormInput>
          <FormInput label="CPT Code">
            <input
              className={inputClass}
              style={ringStyle}
              value={form.cpt_code}
              onChange={(e) => update("cpt_code", e.target.value)}
              placeholder="Optional"
            />
          </FormInput>
          <FormInput label="Facility Name">
            <input
              className={inputClass}
              style={ringStyle}
              value={form.facility_name}
              onChange={(e) => update("facility_name", e.target.value)}
              placeholder="Optional"
            />
          </FormInput>
          <FormInput label="Notes">
            <textarea
              className={inputClass}
              style={ringStyle}
              value={form.notes}
              onChange={(e) => update("notes", e.target.value)}
              rows={2}
              placeholder="Any additional notes..."
            />
          </FormInput>
        </div>
      </Section>

      <button
        type="submit"
        className="w-full py-4 rounded-xl text-white font-bold text-base"
        style={{ backgroundColor: "#293682" }}
      >
        Run Eligibility Check →
      </button>
    </form>
  );
}

function Section({ title, children }) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 p-5">
      <h3 className="font-bold text-slate-700 text-sm mb-4 pb-3 border-b border-slate-100">
        {title}
      </h3>
      {children}
    </div>
  );
}
