import { useState } from "react";
import { api } from "@/lib/api";
import { ChevronDown, ChevronRight, Play, CheckCircle, XCircle, Loader2, Info } from "lucide-react";

const ELIGIBILITY_FIELDS = [
  { key: "patient_first_name", label: "Patient First Name" },
  { key: "patient_last_name", label: "Patient Last Name" },
  { key: "patient_dob", label: "Date of Birth" },
  { key: "insurance_id", label: "Insurance ID / Member ID" },
  { key: "group_number", label: "Group Number" },
  { key: "submit", label: "Submit Button" },
];

const PRIOR_AUTH_FIELDS = [
  { key: "patient_first_name", label: "Patient First Name" },
  { key: "patient_last_name", label: "Patient Last Name" },
  { key: "patient_dob", label: "Date of Birth" },
  { key: "insurance_id", label: "Insurance ID" },
  { key: "cpt_code", label: "CPT/Procedure Code" },
  { key: "diagnosis_code_1", label: "Diagnosis Code 1" },
  { key: "physician_npi", label: "Ordering Physician NPI" },
  { key: "facility_npi", label: "Facility NPI" },
  { key: "medical_necessity", label: "Medical Necessity / Clinical Notes" },
  { key: "submit", label: "Submit Button" },
];

const inputCls =
  "w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none font-mono";

function parseMap(jsonStr) {
  try {
    return JSON.parse(jsonStr || "{}");
  } catch {
    return {};
  }
}

export default function AutomationFieldMapEditor({ rule, onSave }) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    automation_enabled: rule.automation_enabled || false,
    automation_login_url: rule.automation_login_url || "",
    automation_username_selector: rule.automation_username_selector || "",
    automation_password_selector: rule.automation_password_selector || "",
    automation_login_button_selector: rule.automation_login_button_selector || "",
    automation_eligibility_nav_url: rule.automation_eligibility_nav_url || "",
    automation_prior_auth_nav_url: rule.automation_prior_auth_nav_url || "",
    automation_submit_button_selector: rule.automation_submit_button_selector || "",
    automation_confirmation_selector: rule.automation_confirmation_selector || "",
  });
  const [eligMap, setEligMap] = useState(parseMap(rule.automation_eligibility_field_map_json));
  const [paMap, setPaMap] = useState(parseMap(rule.automation_prior_auth_field_map_json));
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState(null);

  const handleSave = async () => {
    setSaving(true);
    await onSave({
      ...form,
      automation_eligibility_field_map_json: JSON.stringify(eligMap),
      automation_prior_auth_field_map_json: JSON.stringify(paMap),
    });
    setSaving(false);
  };

  const handleTestRun = async () => {
    setTesting(true);
    setTestResult(null);
    const res = await api.functions.invoke("triggerAutomationJob", {
      job_type: "eligibility_fallback",
      payer_name: rule.payer_name,
      urgency: "Routine",
      payload: { dry_run: true, payer_rule_id: rule.id },
    });
    setTestResult(res.data);
    setTesting(false);
  };

  const testStatus = rule.automation_test_status;

  return (
    <div className="mt-3 border border-slate-200 rounded-2xl overflow-hidden">
      <button
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between px-4 py-3 bg-slate-50 hover:bg-slate-100 transition-colors"
      >
        <div className="flex items-center gap-2">
          <span className="text-sm font-bold text-slate-700">🤖 Browser Automation Config</span>
          {testStatus === "passed" && (
            <span className="flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full">
              <CheckCircle className="w-3 h-3" />
              Last test passed
            </span>
          )}
          {testStatus === "failed" && (
            <span className="flex items-center gap-1 text-[10px] font-bold text-red-600 bg-red-50 px-2 py-0.5 rounded-full">
              <XCircle className="w-3 h-3" />
              Last test failed
            </span>
          )}
          {!testStatus || testStatus === "untested" ? (
            <span className="text-[10px] text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">
              Not tested
            </span>
          ) : null}
        </div>
        {open ? (
          <ChevronDown className="w-4 h-4 text-slate-400" />
        ) : (
          <ChevronRight className="w-4 h-4 text-slate-400" />
        )}
      </button>

      {open && (
        <div className="p-5 space-y-5">
          <div className="flex items-center gap-3">
            <input
              type="checkbox"
              id="auto_enabled"
              checked={form.automation_enabled}
              onChange={(e) => setForm((f) => ({ ...f, automation_enabled: e.target.checked }))}
              className="w-4 h-4"
            />
            <label htmlFor="auto_enabled" className="text-sm font-semibold text-slate-700">
              Enable browser automation for this payer
            </label>
          </div>

          <div className="flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3">
            <Info className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
            <p className="text-xs text-amber-700">
              Selectors are CSS selectors or XPath. Credentials are stored in Google Secret Manager
              using the payer name as the key — never entered here.
            </p>
          </div>

          {/* Login Config */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Login Configuration
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {[
                { key: "automation_login_url", label: "Login Page URL" },
                { key: "automation_username_selector", label: "Username Field Selector" },
                { key: "automation_password_selector", label: "Password Field Selector" },
                { key: "automation_login_button_selector", label: "Login Button Selector" },
              ].map((f) => (
                <div key={f.key}>
                  <label className="block text-[11px] font-semibold text-slate-500 mb-1">
                    {f.label}
                  </label>
                  <input
                    value={form[f.key]}
                    onChange={(e) => setForm((ff) => ({ ...ff, [f.key]: e.target.value }))}
                    className={inputCls}
                    placeholder={f.key.includes("url") ? "https://…" : "#selector or //xpath"}
                  />
                </div>
              ))}
            </div>
          </div>

          {/* Eligibility Field Map */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Eligibility Form — Field Selectors
            </h4>
            <div>
              <label className="block text-[11px] font-semibold text-slate-500 mb-1">
                Eligibility Section Nav URL
              </label>
              <input
                value={form.automation_eligibility_nav_url}
                onChange={(e) =>
                  setForm((f) => ({ ...f, automation_eligibility_nav_url: e.target.value }))
                }
                className={inputCls}
                placeholder="https://portal.payer.com/eligibility"
              />
            </div>
            <div className="space-y-2">
              {ELIGIBILITY_FIELDS.map((f) => (
                <div key={f.key} className="flex items-center gap-3">
                  <span className="text-xs text-slate-600 w-44 flex-shrink-0">{f.label}</span>
                  <input
                    value={eligMap[f.key] || ""}
                    onChange={(e) => setEligMap((m) => ({ ...m, [f.key]: e.target.value }))}
                    className={inputCls}
                    placeholder="#css-selector or //xpath"
                  />
                </div>
              ))}
            </div>
          </div>

          {/* Prior Auth Field Map */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Prior Auth Form — Field Selectors
            </h4>
            <div>
              <label className="block text-[11px] font-semibold text-slate-500 mb-1">
                Prior Auth Section Nav URL
              </label>
              <input
                value={form.automation_prior_auth_nav_url}
                onChange={(e) =>
                  setForm((f) => ({ ...f, automation_prior_auth_nav_url: e.target.value }))
                }
                className={inputCls}
                placeholder="https://portal.payer.com/priorauth/new"
              />
            </div>
            <div className="space-y-2">
              {PRIOR_AUTH_FIELDS.map((f) => (
                <div key={f.key} className="flex items-center gap-3">
                  <span className="text-xs text-slate-600 w-44 flex-shrink-0">{f.label}</span>
                  <input
                    value={paMap[f.key] || ""}
                    onChange={(e) => setPaMap((m) => ({ ...m, [f.key]: e.target.value }))}
                    className={inputCls}
                    placeholder="#css-selector or //xpath"
                  />
                </div>
              ))}
            </div>
            <div className="grid sm:grid-cols-2 gap-3">
              {[
                { key: "automation_submit_button_selector", label: "Submit Button Selector" },
                { key: "automation_confirmation_selector", label: "Confirmation # Selector" },
              ].map((f) => (
                <div key={f.key}>
                  <label className="block text-[11px] font-semibold text-slate-500 mb-1">
                    {f.label}
                  </label>
                  <input
                    value={form[f.key]}
                    onChange={(e) => setForm((ff) => ({ ...ff, [f.key]: e.target.value }))}
                    className={inputCls}
                    placeholder="#selector"
                  />
                </div>
              ))}
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-3 flex-wrap pt-2 border-t border-slate-100">
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-white font-bold text-sm disabled:opacity-50"
              style={{ backgroundColor: "#293682" }}
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
              {saving ? "Saving…" : "Save Field Map"}
            </button>
            <button
              onClick={handleTestRun}
              disabled={testing || !form.automation_login_url}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-sm border-2 border-amber-400 text-amber-700 hover:bg-amber-50 disabled:opacity-50"
            >
              {testing ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Play className="w-4 h-4" />
              )}
              {testing ? "Running dry run…" : "Test Automation (Dry Run)"}
            </button>
          </div>

          {testResult && (
            <div
              className={`rounded-xl px-4 py-3 text-sm ${testResult.status === "queued" ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-700"}`}
            >
              <strong>
                {testResult.status === "queued" ? "✓ Dry run job queued" : "✗ Could not queue"}
              </strong>
              {testResult.job_id && (
                <span className="ml-2 font-mono text-xs">{testResult.job_id}</span>
              )}
              {testResult.note && <p className="text-xs mt-1 opacity-70">{testResult.note}</p>}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
